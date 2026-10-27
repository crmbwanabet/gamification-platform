'use client';

import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import TutorialModal from '../../modals/TutorialModal';
import CandyScreen from '../candy/CandyScreen';
import CandyButton from '../candy/CandyButton';
import CandyChip from '../candy/CandyChip';
import WinCelebration from '../candy/WinCelebration';
import { CANDY, COIN_ICON, outlineShadow, textStroke } from '../candy/tokens';
import { formatNumber } from '@/lib/economy/currency.mjs';
import {
  STAKES, DEFAULT_STAKE, MAX_FLOORS, clampRtp, multAt, payoutFor, holdChance, dropFloor,
} from '@/lib/tower/engine.mjs';
import Floor, { floorPiece, FLOOR_H } from './Floor';
import { Skyline, SiteProps, Crane, Hook, SCENE_CSS, FRAME_W } from './Scene';

// ============================================================================
// TOWER BUILD — a cash-out game, stake-only (design: canvas "Tower Build",
// Main.dc.html + Floor.dc.html). Pick a stake (1/10/25/50), tap BUILD: the
// stake is charged right then (onSpend) and the crane swings the first floor.
// DROP lowers it onto the house; each floor holds or the house falls, decided
// on the device by crypto.getRandomValues at the tap (lib/tower/engine.mjs;
// RTP from remote config games.tower.rtp, clamped 97–99%, default 98%). After
// every floor that holds: CASH OUT (stake × the floor's multiplier, rounded UP
// to whole coins) or DROP the next one. Floor 15 is the roof = the top prize,
// collected automatically. A fall loses the stake.
// Settlement is exactly once (roundRef.done flips before onRound): a fall is
// reported at the tap (the topple is only the show), a cash-out / the roof at
// the moment it happens. Closing mid-round cashes out what stands; closing
// before the first floor gives the stake back (like Chicken Catch 2's 1.00×).
// Wins use the kit's WinCelebration (the single win moment) instead of the
// design's in-scene YOU WON panel.
// NOTE: STAKES are mirrored by stakeRange '1–50' in lib/data/platform.js and
// the tutorial lines in lib/data/tutorials.js — change all three together.
// ============================================================================

const LAST_KEY = 'tower:last';
const CHIP_COLORS = { 1: 'violet', 10: 'blue', 25: 'red', 50: 'green' };
const MIN_STAKE = STAKES[0];
const HMIN = 400;          // the world is at least this tall (logical px); wider boxes widen it
const TOP_GAP = 246;       // the design's gap: the top of the house stays below the swinging floor
const LAND_MS = 450;
const FALL_MS = 1500;
const ROOF_MS = 1100;      // roof banner, then the win panel
const CASH_MS = 350;
const GOLD_BTN = { '--cb-fill': '#FFB21F', '--cb-light': '#FFD978', '--cb-dark': '#B86E00' };

const EXTRA_CSS = `
  .tw-landfall { animation: twLand .42s cubic-bezier(.5,0,.9,.6) both, twFall 1s .42s cubic-bezier(.4,0,1,1) forwards; }
  @media (prefers-reduced-motion: reduce) { .tw-landfall { animation: none; opacity: .25; } }
`;

function readLast() {
  try {
    const v = JSON.parse(window.localStorage.getItem(LAST_KEY) || 'null');
    return STAKES.includes(v?.stake) ? v.stake : DEFAULT_STAKE;
  } catch (e) { return DEFAULT_STAKE; }
}
function saveLast(stake) {
  try { window.localStorage.setItem(LAST_KEY, JSON.stringify({ stake })); } catch (e) { /* private mode */ }
}
function affordable(stake, balance) {
  if (stake <= balance) return stake;
  const fit = STAKES.filter(s => s <= balance);
  return fit.length ? fit[fit.length - 1] : stake;
}
const fmtMult = (m) => `×${m.toFixed(2)}`;

function Coins({ n, size = 16, gap = 4 }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap, verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
      <img src={COIN_ICON} alt="" width={size} height={size} style={{ display: 'block', flex: 'none', filter: 'drop-shadow(0 1.5px 0 rgba(0,0,0,.35))' }} />
      <span>{formatNumber(n)}</span>
    </span>
  );
}

// Fit the logical world (≥ 390 × HMIN) to the scene box: scale by the tighter
// side, then widen / heighten the world to fill the rest (no letterbox).
function useWorldFit(ref) {
  const [fit, setFit] = useState({ s: 0.9, W: FRAME_W, H: 440 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const run = () => {
      const w = el.clientWidth, h = el.clientHeight;
      if (!w || !h) return;
      const s = Math.min(w / FRAME_W, h / HMIN);
      setFit({ s, W: w / s, H: h / s });
    };
    run();
    if (typeof ResizeObserver === 'undefined') { window.addEventListener('resize', run); return () => window.removeEventListener('resize', run); }
    const ro = new ResizeObserver(run);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return fit;
}

const TITLE = <span style={{ fontSize: 34 }}>TOWER BUILD</span>;
const HUD_SHADOW = `${textStroke(2, CANDY.outline)}, 0 3px 0 ${CANDY.outline}`;

export default function TowerGame({ onClose, closing, balance = 0, rtp, onSpend, onRound }) {
  const [stake, setStake] = useState(() => affordable(readLast(), balance));
  const [phase, setPhase] = useState('idle');   // 'idle' | 'build' | 'fell' | 'won'
  const [floors, setFloors] = useState([]);     // [{ n, dx, dir, cls }]
  const [busy, setBusy] = useState(false);      // a floor is on its way down
  const [falling, setFalling] = useState(false);
  const [roof, setRoof] = useState(false);
  const [lost, setLost] = useState(null);       // { at, stake } for the fall panel
  const [cel, setCel] = useState(null);         // win celebration { payout, added, delay }
  const [showTutorial, setShowTutorial] = useState(false);
  const [reduced, setReduced] = useState(false);
  const pillRef = useRef(null);
  const sceneRef = useRef(null);
  const { s, W, H } = useWorldFit(sceneRef);
  const ox = (W - FRAME_W) / 2;

  const roundRef = useRef(null);    // { stake, rtp, n (floors standing), done }
  const busyRef = useRef(false);
  const timers = useRef([]);
  const onRoundRef = useRef(onRound);
  onRoundRef.current = onRound;
  const reducedRef = useRef(false);
  reducedRef.current = reduced;

  const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.current.push(t); return t; };
  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };

  useEffect(() => {
    try { setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { /* old browser */ }
  }, []);
  useEffect(() => {
    if (phase !== 'build') setStake(v => affordable(v, balance));
  }, [balance, phase]);

  // Exactly once: done flips before onRound. Refs only (unmount-safe).
  function settle(win, k) {
    const r = roundRef.current;
    if (!r || r.done) return 0;
    r.done = true;
    const payout = win ? payoutFor(r.stake, k, r.rtp) : 0;
    onRoundRef.current?.({ stake: r.stake, win, payout });
    return payout;
  }
  // Closing mid-round: cash out what stands; nothing built yet = stake back.
  useEffect(() => () => {
    clearTimers();
    const r = roundRef.current;
    if (!r || r.done) return;
    if (r.n >= 1) settle(true, r.n);
    else { r.done = true; onRoundRef.current?.({ stake: r.stake, win: true, payout: r.stake }); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const n = floors.length;
  const r = roundRef.current;
  const next = Math.min(n + 1, MAX_FLOORS);
  const roundRtp = r ? r.rtp : clampRtp(rtp);
  const broke = balance < MIN_STAKE;
  const canStart = !busy && !cel && phase !== 'build' && stake <= balance;
  const cashOff = phase !== 'build' || busy || n === 0;
  const shownBalance = cel ? Math.max(0, balance - cel.payout + cel.added) : balance;

  const start = () => {
    if (busyRef.current || cel || phase === 'build' || stake > balance) return;
    clearTimers();
    onSpend?.(stake);
    roundRef.current = { stake, rtp: clampRtp(rtp), n: 0, done: false };
    setFloors([]); setLost(null); setRoof(false); setFalling(false); setBusy(false);
    setPhase('build');
  };

  const drop = () => {
    const rr = roundRef.current;
    if (phase !== 'build' || busyRef.current || !rr || rr.done) return;
    const k = rr.n + 1;
    const holds = dropFloor(k, rr.rtp);
    // where it lands is only the show (Math.random is fine): a small wobble when
    // it holds, a big overhang when it is going to tip off
    const side = Math.random() < 0.5 ? -1 : 1;
    const dx = holds ? Math.round((Math.random() - 0.5) * 16) : side * (58 + Math.round(Math.random() * 14));
    busyRef.current = true;
    setBusy(true);
    setFloors(f => [...f.map(x => ({ ...x, cls: '' })), { n: k, dx, dir: side, cls: holds ? 'tw-land' : 'tw-landfall' }]);
    if (holds) {
      rr.n = k;
      if (k >= MAX_FLOORS) {
        const payout = settle(true, k);   // the roof: top prize, paid now
        later(() => {
          busyRef.current = false;
          setBusy(false); setRoof(true); setPhase('won');
          setCel({ payout, added: 0, delay: reducedRef.current ? 250 : ROOF_MS });
        }, reducedRef.current ? 0 : LAND_MS);
      } else {
        later(() => { busyRef.current = false; setBusy(false); }, reducedRef.current ? 0 : LAND_MS);
      }
    } else {
      settle(false, k);                   // the fall is decided now; the topple is the show
      setFalling(true);
      later(() => {
        busyRef.current = false;
        setBusy(false); setFalling(false); setPhase('fell');
        setLost({ at: k, stake: rr.stake });
      }, reducedRef.current ? 300 : FALL_MS);
    }
  };

  const cashOut = () => {
    const rr = roundRef.current;
    if (cashOff || !rr || rr.done || rr.n < 1) return;
    const payout = settle(true, rr.n);
    setPhase('won');
    setCel({ payout, added: 0, delay: reducedRef.current ? 250 : CASH_MS });
  };

  const reset = () => {
    clearTimers();
    busyRef.current = false;
    setBusy(false); setFalling(false); setRoof(false); setLost(null); setFloors([]); setPhase('idle');
  };

  const chooseStake = (v) => {
    if (phase === 'build' || busy || cel || v > balance) return;
    setStake(v); saveLast(v);
  };

  // ---- view numbers
  const shift = Math.max(0, n * FLOOR_H - (H - 44 - TOP_GAP));
  const bgShift = Math.round(shift * 0.35);
  const ladder = [];
  if (phase === 'build') {
    const hi = Math.min(MAX_FLOORS, n + 3);
    for (let k = hi; k >= Math.max(1, n); k--) {
      const cur = k === n, up = k === n + 1, past = k < n;
      ladder.push({
        k, label: k === MAX_FLOORS ? 'Roof' : `Floor ${k}`, mult: fmtMult(multAt(k, roundRtp)),
        bg: cur ? CANDY.gold : up ? 'rgba(67,194,26,.25)' : 'rgba(0,0,0,.35)',
        fg: cur ? CANDY.outline : past ? 'rgba(255,255,255,.5)' : '#FFFFFF',
        border: cur ? CANDY.goldDeep : up ? '#7BE34F' : 'rgba(255,255,255,.12)',
      });
    }
  }
  const nextPay = payoutFor(stake, next, roundRtp);
  const nextRisk = Math.round((1 - holdChance(next, roundRtp)) * 100);
  const hudTop = Math.round(62 * s + 6);
  const ladderTop = Math.round(216 * s + 4);   // below the swinging floor (its lowest corner ≈ 214)

  let hint;
  if (phase === 'build') hint = <>Next floor: win <Coins n={nextPay} size={15} gap={3} /> coins · {nextRisk}% chance it falls</>;
  else if (phase === 'fell') hint = 'Play again with the same coins.';
  else if (phase === 'won') hint = roof ? 'ROOF DONE · TOP PRIZE' : 'YOU TOOK YOUR COINS';
  else if (broke) hint = <span style={{ color: '#FF8A80' }}>Not enough coins</span>;
  else hint = 'Choose your coins. Build higher to win more. Take your coins before the house falls.';

  const mainLabel = phase === 'fell' ? 'PLAY AGAIN' : 'BUILD';

  return (
    <CandyScreen title={TITLE} balance={shownBalance} pillRef={pillRef} closing={closing} onClose={onClose} onHelp={() => setShowTutorial(true)}
      overlay={showTutorial && <TutorialModal tutorialKey="tower" onClose={() => setShowTutorial(false)} />}>
      <style dangerouslySetInnerHTML={{ __html: SCENE_CSS + EXTRA_CSS }} />

      <section ref={sceneRef} aria-label="Building site" style={{
        position: 'relative', flex: 1, minHeight: 0, margin: '7px 0 3px', borderRadius: 18, overflow: 'hidden',
        background: `linear-gradient(180deg, ${CANDY.bgTop} 0%, ${CANDY.bgBottom} 100%)`,
        boxShadow: '0 0 0 2px rgba(255,210,31,.7), 0 0 0 4px rgba(42,10,79,.9), 0 6px 18px rgba(0,0,0,.45)',
      }}>
        {/* the world, drawn in logical px and scaled to the box */}
        <div aria-hidden style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transform: `scale(${s})`, transformOrigin: '0 0' }}>
          <div style={{ position: 'absolute', left: ox + 195 - 210, bottom: -10, width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle, rgba(91,43,176,.85) 0%, rgba(91,43,176,0) 68%)' }} />
          <Skyline W={W} ox={ox} shift={bgShift} />

          {/* ground, site props and the house: they slide down as the house grows */}
          <div className="tw-move" style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 2000, transform: `translateY(${shift}px)` }}>
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 40, background: '#A8673A', borderTop: '4px solid #C98450', boxSizing: 'border-box' }} />
            <div style={{ position: 'absolute', left: ox, bottom: 0, width: FRAME_W, height: 2000 }}>
              <SiteProps />
              <div className={falling ? 'tw-wobble' : ''} style={{ position: 'absolute', left: 0, right: 0, bottom: 44, height: 700, transformOrigin: '50% 100%' }}>
                {floors.map(f => (
                  <div key={f.n} className={`tw-fl ${f.cls}`} style={{ left: 120 + f.dx, bottom: (f.n - 1) * FLOOR_H, '--dir': f.dir }}>
                    <Floor f={floorPiece(f.n, MAX_FLOORS)} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <Crane W={W} H={H} ox={ox} />
          {phase === 'build' && !busy && n < MAX_FLOORS && <Hook left={ox + 120} piece={floorPiece(next, MAX_FLOORS)} />}
        </div>

        {/* HUD, in real px so it stays readable */}
        {phase === 'build' && (
          <div style={{ position: 'absolute', left: 6, top: hudTop, padding: '6px 10px', borderRadius: 12, background: 'rgba(0,0,0,.42)', pointerEvents: 'none' }}>
            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.08em', color: 'rgba(255,255,255,.75)', whiteSpace: 'nowrap' }}>FLOOR {n} OF {MAX_FLOORS}</div>
            <div style={{ fontFamily: CANDY.display, fontSize: 26, lineHeight: 1.05, color: CANDY.gold, textShadow: HUD_SHADOW, fontVariantNumeric: 'tabular-nums' }}>
              {n ? fmtMult(multAt(n, roundRtp)) : '×0.00'}
            </div>
          </div>
        )}
        {phase === 'build' && (
          <div aria-label="Prize for each floor" style={{ position: 'absolute', right: 6, top: ladderTop, width: 92, display: 'flex', flexDirection: 'column', gap: 4, pointerEvents: 'none' }}>
            {ladder.map(l => (
              <div key={l.k} style={{ height: 24, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 6px', boxSizing: 'border-box',
                fontWeight: 900, fontSize: 10.5, background: l.bg, color: l.fg, border: `2px solid ${l.border}` }}>
                <span style={{ whiteSpace: 'nowrap' }}>{l.label}</span>
                <span style={{ fontFamily: CANDY.display, fontWeight: 400, fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{l.mult}</span>
              </div>
            ))}
          </div>
        )}

        {phase === 'fell' && lost && (
          <div className="tw-pop" role="status" style={{ position: 'absolute', left: 16, right: 16, top: hudTop, padding: '12px 12px 13px', borderRadius: 18, background: CANDY.red.fill,
            border: `4px solid ${CANDY.red.light}`, boxShadow: `0 7px 0 ${CANDY.red.dark}`, textAlign: 'center' }}>
            <div style={{ fontFamily: CANDY.display, fontSize: 28, lineHeight: 1, textShadow: `0 4px 0 ${CANDY.red.dark}` }}>THE HOUSE FELL</div>
            <p style={{ margin: '9px 0 0', fontWeight: 800, fontSize: 14, lineHeight: 1.35 }}>
              Floor {lost.at} fell down.<br />You lost <Coins n={lost.stake} size={16} gap={3} /> coins.
            </p>
          </div>
        )}
        {roof && phase === 'won' && (
          <div className="tw-pop" role="status" style={{ position: 'absolute', left: 16, right: 16, top: hudTop, padding: '9px 8px', borderRadius: 16, whiteSpace: 'nowrap',
            background: 'linear-gradient(180deg, #5B2BB0, #2B0F5E)', border: `4px solid ${CANDY.gold}`, boxShadow: `0 6px 0 ${CANDY.goldDeep}`, textAlign: 'center',
            fontFamily: CANDY.display, fontSize: 19, color: CANDY.gold, textShadow: outlineShadow(2, CANDY.outline, 2) }}>
            ROOF DONE · TOP PRIZE
          </div>
        )}
      </section>

      <div aria-live="polite" style={{ flex: 'none', minHeight: 36, padding: '0 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
        fontWeight: 800, fontSize: 13, lineHeight: 1.3, color: CANDY.sub }}>
        <span>{hint}</span>
      </div>

      <div style={{ flex: 'none' }}>
        <div role="group" aria-label="Stake" style={{ display: 'flex', gap: 7, marginBottom: 2 }}>
          {STAKES.map(v => (
            <CandyChip key={v} color={CHIP_COLORS[v]} disabled={v > balance || (phase === 'build' && v !== stake)} selected={stake === v} onClick={() => chooseStake(v)}>
              {formatNumber(v)}
            </CandyChip>
          ))}
        </div>

        {phase === 'build' ? (
          <div style={{ display: 'flex', gap: 10 }}>
            <CandyButton key="cash" color="green" disabled={cashOff} onClick={cashOut}
              style={{ flex: 1, minWidth: 0, minHeight: 66, gap: 3, marginBottom: 6, borderRadius: 18, ...(cashOff ? null : GOLD_BTN) }}>
              <span style={{ fontSize: 22, textShadow: cashOff ? 'none' : `${textStroke(2, CANDY.outline)}, 0 3px 0 ${CANDY.outline}` }}>CASH OUT</span>
              <span style={{ fontSize: 17, textShadow: cashOff ? 'none' : `${textStroke(1.5, CANDY.outline)}, 0 2px 0 ${CANDY.outline}` }}>
                <Coins n={n ? payoutFor(stake, n, roundRtp) : 0} size={17} />
              </span>
            </CandyButton>
            <CandyButton key="drop" color="green" disabled={busy} onClick={drop}
              style={{ flex: 1, minWidth: 0, minHeight: 66, marginBottom: 6, borderRadius: 18 }}>
              <span style={{ fontSize: 32, textShadow: busy ? 'none' : `${textStroke(2.5, CANDY.outline)}, 0 4px 0 ${CANDY.outline}` }}>DROP</span>
            </CandyButton>
          </div>
        ) : (
          <CandyButton key="build" color="green" big disabled={!canStart} onClick={start}
            style={{ width: '100%', minHeight: 66, gap: 3, marginBottom: 6, borderRadius: 18 }}>
            <span style={{ fontSize: 32, textShadow: canStart ? `${textStroke(2.5, CANDY.outline)}, 0 4px 0 ${CANDY.outline}` : 'none' }}>{mainLabel}</span>
            <span style={{ fontSize: 15, letterSpacing: 1, color: canStart ? CANDY.gold : 'inherit', textShadow: canStart ? `${textStroke(1.5, CANDY.outline)}, 0 2px 0 ${CANDY.outline}` : 'none' }}>
              <Coins n={stake} size={16} /> COINS
            </span>
          </CandyButton>
        )}
      </div>

      {cel && (
        <WinCelebration payout={cel.payout} reduced={reduced} delay={cel.delay} pillRef={pillRef}
          onTick={(added) => setCel(c => c && { ...c, added })} onDone={() => { setCel(null); reset(); }} />
      )}
    </CandyScreen>
  );
}
