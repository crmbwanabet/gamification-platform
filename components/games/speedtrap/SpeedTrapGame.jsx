'use client';

import React, { useState, useRef, useEffect } from 'react';
import TutorialModal from '../../modals/TutorialModal';
import CandyScreen from '../candy/CandyScreen';
import CandyButton from '../candy/CandyButton';
import WinCelebration from '../candy/WinCelebration';
import { CANDY, COIN_ICON, outlineShadow, textStroke } from '../candy/tokens';
import { formatNumber } from '@/lib/economy/currency.mjs';
import {
  STAKES, DEFAULT_STAKE, MAX_MULT, MIN_CASHOUT, clampRtp, drawCrash, payoutFor, shownAt, endTime, timeFor,
  settleOnClose, cashOutAt, fmtMult, kmhFor, needleFor, histChip,
} from '@/lib/speedtrap/index.mjs';
import RoadScene, { SCENE_CSS, useRoadViewBox } from './Scene';

// ============================================================================
// SPEED TRAP — a crash game, stake-only, the SAME maths as Chicken Catch 2
// (lib/chicken2/crash.mjs via lib/speedtrap/index.mjs; design Speed.dc.html,
// owner-approved 2026-10-27).
// Pick a stake (1/5/10/20), tap DRIVE. The stake is charged right then
// (onSpend) and the stop point C is drawn (P(C ≥ x) = RTP / x, RTP from remote
// config games.speedtrap.rtp, clamped 97–99%; never the previous round's C).
// The minibus speeds up along the Great East Road, the multiplier climbs
// e^(K·t) from ×1.00 and the speed gauge follows. CASH OUT banks stake × the
// shown multiplier, rounded UP to whole coins: the bus drives off and
// WinCelebration plays. If the counter would pass C the police stop the bus:
// CAUGHT! At ×5,000 the round collects by itself (MAX WIN).
// Settlement is exactly once: roundRef.done flips before onRound; a CASH OUT
// tap is checked against the clock (cashOutAt: never after the stop), and
// closing mid-drive settles via settleOnClose (a cash-out at that moment; ×1.00
// = stake back unless C = 1.00; already stopped = loss). DRIVE is locked while
// driving. The last 7 stop points (localStorage speedtrap:history) sit at the top.
// ============================================================================

const LAST_KEY = 'speedtrap:last';
const HIST_KEY = 'speedtrap:history';
const HIST_N = 7;
const PANEL_MS = 1500;        // after a cash-out: the bus drives off, then the win panel
const GOLD_BTN = { '--cb-fill': '#FFD21F', '--cb-light': '#FFF0A0', '--cb-dark': '#E0A300' };

function readLast() {
  try {
    const v = JSON.parse(window.localStorage.getItem(LAST_KEY) || 'null');
    return STAKES.includes(v?.stake) ? v.stake : DEFAULT_STAKE;
  } catch (e) { return DEFAULT_STAKE; }
}
function saveLast(stake) {
  try { window.localStorage.setItem(LAST_KEY, JSON.stringify({ stake })); } catch (e) { /* private mode */ }
}
function readHist() {
  try {
    const v = JSON.parse(window.localStorage.getItem(HIST_KEY) || '[]');
    return Array.isArray(v) ? v.filter(x => typeof x === 'number' && x >= 1 && x <= MAX_MULT).slice(0, HIST_N) : [];
  } catch (e) { return []; }
}
function saveHist(h) {
  try { window.localStorage.setItem(HIST_KEY, JSON.stringify(h)); } catch (e) { /* private mode */ }
}
function affordable(stake, balance) {
  if (stake <= balance) return stake;
  const fit = STAKES.filter(s => s <= balance);
  return fit.length ? fit[fit.length - 1] : stake;
}

const Coin = ({ size = 18 }) => (
  <img src={COIN_ICON} alt="" width={size} height={size}
    style={{ width: size, height: size, display: 'inline-block', verticalAlign: 'middle', flex: 'none', filter: 'drop-shadow(0 2px 0 rgba(0,0,0,.35))' }} />
);
// "[coin] 5 coins" — the K coin icon + the amount in words, never a "K" label.
const Coins = ({ n, size = 18, gap = 5 }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap, whiteSpace: 'nowrap' }}>
    <Coin size={size} />{formatNumber(n)} {n === 1 ? 'coin' : 'coins'}
  </span>
);

const TITLE = <span style={{ display: 'block', fontSize: 32, lineHeight: 1, margin: '6px 0 4px' }}>SPEED TRAP</span>;
const BIG_SHADOW = `${textStroke(3.5, CANDY.outline)}, 0 6px 0 ${CANDY.outline}`;
const MULT_COLOR = { idle: CANDY.gold, run: CANDY.gold, cashed: '#7BE34F', fell: '#F5716B' };
const CSS = SCENE_CSS + `
  .st-chip { font-family: ${CANDY.display}; cursor: pointer; border-radius: 999px; transition: transform .08s; -webkit-tap-highlight-color: transparent; touch-action: manipulation; }
  .st-chip:active:not(:disabled) { transform: scale(.94) }
  .st-chip:disabled { cursor: not-allowed; opacity: .4 }
  .st-chip:focus-visible { outline: 3px solid ${CANDY.gold}; outline-offset: 2px }
`;

export default function SpeedTrapGame({ onClose, closing, balance = 0, rtp, onSpend, onRound }) {
  const [stake, setStake] = useState(() => affordable(readLast(), balance));
  const [phase, setPhase] = useState('idle');   // 'idle' | 'run' | 'cashed' | 'fell'
  const [result, setResult] = useState(null);   // { mult, crash, payout, max }
  const [canCash, setCanCash] = useState(false);
  const [busCls, setBusCls] = useState('');     // '' | 'st-brake' | 'st-off' | 'st-in'
  const [showTutorial, setShowTutorial] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [cel, setCel] = useState(null);         // win celebration { payout, added }
  const [hist, setHist] = useState(readHist);   // the last stop points, newest first
  const histRef = useRef(hist);
  const pillRef = useRef(null);

  const sceneRef = useRef(null);
  const viewBox = useRoadViewBox(sceneRef);
  const refs = { far: useRef(null), near: useRef(null), curb: useRef(null), dash: useRef(null), lines: useRef(null) };
  const multRef = useRef(null), needleRef = useRef(null), kmhRef = useRef(null), payRef = useRef(null);
  const rafRef = useRef(0);
  const timers = useRef([]);
  const runningRef = useRef(false);   // DRIVE lock: from the tap until the round has settled
  const roundRef = useRef(null);      // { stake, crash, t0, tc, done, logged, dist, last, cashAt }
  const onRoundRef = useRef(onRound);
  onRoundRef.current = onRound;
  const reducedRef = useRef(false);
  reducedRef.current = reduced;

  const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.current.push(t); return t; };
  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  const stopAnim = () => { cancelAnimationFrame(rafRef.current); rafRef.current = 0; };

  useEffect(() => {
    try { setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { /* old browser */ }
  }, []);

  useEffect(() => {
    if (phase !== 'run') setStake(s => affordable(s, balance));
  }, [balance, phase]);

  // Exactly once: done flips before onRound. Refs only (unmount-safe).
  function settle(win, mult) {
    const r = roundRef.current;
    if (!r || r.done) return 0;
    r.done = true;
    const payout = win ? payoutFor(r.stake, mult) : 0;
    onRoundRef.current?.({ stake: r.stake, win, payout });
    return payout;
  }
  function logRound(r) {
    if (!r || r.logged) return;
    r.logged = true;
    const h = [r.crash, ...histRef.current].slice(0, HIST_N);
    histRef.current = h;
    saveHist(h);
    setHist(h);
  }
  // Close mid-drive: settle as a cash-out at this moment (see settleOnClose).
  useEffect(() => () => {
    stopAnim(); clearTimers();
    const r = roundRef.current;
    if (r && !r.done) { const s = settleOnClose((performance.now() - r.t0) / 1000, r.crash); settle(s.win, s.mult); }
    if (r && r.done) logRound(r);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // The gauge + the number + the CASH OUT amount, written straight to the DOM per frame.
  function paintMeter(m, parked) {
    if (multRef.current) multRef.current.textContent = fmtMult(m);
    if (needleRef.current) needleRef.current.setAttribute('transform', `rotate(${needleFor(m, parked).toFixed(2)} 95 92)`);
    if (kmhRef.current) kmhRef.current.textContent = `${kmhFor(m, parked)} km/h`;
  }
  function paintRoad(dist) {
    const set = (ref, attr, v) => { if (ref.current) ref.current.setAttribute(attr, v); };
    set(refs.far, 'transform', `translate(${(-((dist * 0.35) % 390)).toFixed(1)} 0)`);
    set(refs.near, 'transform', `translate(${(-((dist * 1.4) % 390)).toFixed(1)} 0)`);
    const road = -((dist * 3) % 120);
    set(refs.curb, 'patternTransform', `translate(${road.toFixed(1)} 0)`);
    set(refs.dash, 'patternTransform', `translate(${road.toFixed(1)} 0)`);
  }
  function showLines(on) { if (refs.lines.current) refs.lines.current.style.display = on ? '' : 'none'; }

  function loop() {
    const r = roundRef.current;
    const step = (now) => {
      if (roundRef.current !== r || r.done) { rafRef.current = 0; return; }
      const t = (now - r.t0) / 1000;
      if (r.cashAt != null && t >= r.cashAt) { cashOut(MAX_MULT, true); rafRef.current = 0; return; }
      if (t >= r.tc) { fall(); rafRef.current = 0; return; }
      const m = shownAt(t, r.crash);
      paintMeter(m, false);
      if (payRef.current) payRef.current.textContent = formatNumber(payoutFor(r.stake, m));
      if (!reducedRef.current) {
        const dt = Math.min(0.1, Math.max(0, (now - (r.last ?? now)) / 1000));
        r.dist += (3 + 4 * Math.log2(m + 1)) * (dt / 0.06);
        paintRoad(r.dist);
        showLines(m >= 1.5);
      }
      r.last = now;
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
  }

  function cashOut(mult, max = false) {
    const r = roundRef.current;
    if (!r || r.done) return;
    const payout = settle(true, mult);
    runningRef.current = false;
    stopAnim();
    clearTimers();
    setCanCash(false);
    showLines(false);
    paintMeter(mult, false);
    setPhase('cashed');
    setBusCls('st-off');
    setResult({ mult, crash: r.crash, payout, max: max || mult >= MAX_MULT });
    logRound(r);
    setCel({ payout, added: 0 });
  }
  function fall() {
    const r = roundRef.current;
    if (!r || r.done) return;
    settle(false, 0);
    runningRef.current = false;
    stopAnim();
    clearTimers();
    setCanCash(false);
    showLines(false);
    paintMeter(r.crash, false);
    setPhase('fell');
    setBusCls('st-brake');
    setResult({ crash: r.crash, stake: r.stake });
    logRound(r);
  }

  // Back to the start screen (after a win, or a new stake after CAUGHT).
  function regroup() {
    clearTimers();
    stopAnim();
    if (roundRef.current?.done) logRound(roundRef.current);
    const wasOff = phase === 'cashed' || busCls === 'st-off';
    setPhase('idle');
    setResult(null);
    setBusCls(wasOff && !reducedRef.current ? 'st-in' : '');
    paintMeter(1, true);
  }

  const broke = balance < STAKES[0];
  const running = phase === 'run';
  const canRun = !running && !cel && stake <= balance;
  const shownBalance = cel ? Math.max(0, balance - cel.payout + cel.added) : balance;

  const drive = () => {
    if (runningRef.current || cel || stake > balance) return;
    runningRef.current = true;
    // never the same stop point twice in a row (this session's last round, else the saved history)
    const crash = drawCrash(stake, clampRtp(rtp), undefined, roundRef.current?.crash ?? histRef.current[0] ?? null);
    onSpend?.(stake);
    clearTimers();
    stopAnim();
    if (roundRef.current?.done) logRound(roundRef.current);
    const max = crash >= MAX_MULT;
    const r = {
      stake, crash, t0: performance.now(), tc: max ? Infinity : endTime(crash), done: false, logged: false,
      dist: roundRef.current?.dist ?? 0, last: null, cashAt: max ? timeFor(MAX_MULT) : null,
    };
    roundRef.current = r;
    setPhase('run');
    setResult(null);
    setBusCls('');
    setCanCash(false);
    paintMeter(1, false);
    if (payRef.current) payRef.current.textContent = formatNumber(stake);
    // Timers back the frame loop up (it stops in background tabs).
    if (crash >= MIN_CASHOUT) later(() => { if (!r.done) setCanCash(true); }, timeFor(MIN_CASHOUT) * 1000);
    if (max) later(() => cashOut(MAX_MULT, true), r.cashAt * 1000);
    else later(() => fall(), r.tc * 1000);
    loop();
  };

  const tapCash = () => {
    const r = roundRef.current;
    if (!r || r.done || !running) return;
    const res = cashOutAt(r.stake, (performance.now() - r.t0) / 1000, r.crash);
    if (res.state === 'caught') { fall(); return; }   // too late, the police already stopped the bus
    if (res.state === 'won') cashOut(res.mult);
  };

  const chooseStake = (s) => {
    if (running || cel || s > balance) return;
    setStake(s); saveLast(s);
    if (phase !== 'idle') regroup();
  };

  const over = phase === 'fell';
  let hint;
  if (running) hint = <>You bet <Coins n={stake} size={16} gap={3} /> · Top win <Coins n={payoutFor(stake, MAX_MULT)} size={16} gap={3} /></>;
  else if (broke && !cel) hint = <span style={{ color: '#FF8A80' }}>Not enough coins</span>;
  else if (over) hint = 'Play again with the same coins.';
  else hint = 'The faster the bus goes, the more you win. Take your coins before the police stop the bus.';

  return (
    <CandyScreen title={TITLE} balance={shownBalance} pillRef={pillRef} closing={closing} onClose={onClose} onHelp={() => setShowTutorial(true)}
      overlay={showTutorial && <TutorialModal tutorialKey="speedtrap" onClose={() => setShowTutorial(false)} />}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <section ref={sceneRef} aria-label="Great East Road" style={{
        position: 'relative', flex: 1, minHeight: 0, margin: '7px 0 8px', borderRadius: 18, overflow: 'hidden', background: '#2B0F5E',
        boxShadow: '0 0 0 2px rgba(255,210,31,.7), 0 0 0 4px rgba(42,10,79,.9), 0 6px 18px rgba(0,0,0,.45)',
      }}>
        <RoadScene viewBox={viewBox} refs={refs} busCls={busCls} bob={running} moving={running || phase === 'cashed'} cop={phase === 'fell'} />
        <div aria-hidden style={{ position: 'absolute', inset: 0, borderRadius: 18, pointerEvents: 'none', boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,.12), inset 0 0 22px rgba(10,0,30,.45)' }} />

        {/* the last stop points, newest first */}
        <div aria-label={`Last stops: ${hist.length ? hist.map(fmtMult).join(', ') : 'none yet'}`} role="img"
          style={{ position: 'absolute', left: 8, right: 8, top: 7, display: 'flex', gap: 5, justifyContent: 'center', overflow: 'hidden', pointerEvents: 'none', fontFamily: CANDY.body }}>
          {hist.map((c, i) => (
            <span key={`${hist.length - i}-${c}`} aria-hidden className={i === 0 ? 'st-pop' : undefined}
              style={{ flex: 'none', padding: '2px 7px', borderRadius: 999, fontWeight: 900, fontSize: 11.5, fontVariantNumeric: 'tabular-nums', ...histChip(c) }}>{fmtMult(c)}</span>
          ))}
        </div>

        {/* the multiplier + the speed gauge, side by side (the card is only ~600 px tall) */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, pointerEvents: 'none' }}>
          <span ref={multRef} role="status" aria-live="off"
            style={{ fontFamily: CANDY.display, fontSize: 46, lineHeight: 1, color: MULT_COLOR[phase], textShadow: BIG_SHADOW, fontVariantNumeric: 'tabular-nums', minWidth: 128, textAlign: 'right' }}>×1.00</span>
          <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 'none' }}>
            <svg width="92" height="50" viewBox="0 0 190 104" aria-hidden style={{ overflow: 'visible' }}>
              <path d="M18 92A77 77 0 0 1 172 92" stroke="#2A0A4F" strokeWidth="16" fill="none" strokeLinecap="round" />
              <path d="M18 92A77 77 0 0 1 120 19" stroke="#43C21A" strokeWidth="9" fill="none" strokeLinecap="round" />
              <path d="M120 19A77 77 0 0 1 152 40" stroke="#FFD21F" strokeWidth="9" fill="none" />
              <path d="M152 40A77 77 0 0 1 172 92" stroke="#E3261E" strokeWidth="9" fill="none" strokeLinecap="round" />
              <g ref={needleRef} transform="rotate(-90 95 92)">
                <path d="M95 92L95 30" stroke="#2A0A4F" strokeWidth="9" strokeLinecap="round" />
                <path d="M95 92L95 30" stroke="#FFFFFF" strokeWidth="4.5" strokeLinecap="round" />
              </g>
              <circle cx="95" cy="92" r="10" fill="#FFD21F" stroke="#2A0A4F" strokeWidth="3.5" />
            </svg>
            <span ref={kmhRef} style={{ marginTop: 2, padding: '1px 9px', borderRadius: 999, background: 'rgba(0,0,0,.45)', fontFamily: CANDY.body, fontWeight: 900, fontSize: 12, whiteSpace: 'nowrap' }}>0 km/h</span>
          </span>
        </div>

        {/* CAUGHT! */}
        {phase === 'fell' && result && (
          <div className="st-pop" role="status" style={{
            position: 'absolute', left: 18, right: 18, top: '30%', padding: '14px 14px', borderRadius: 22, background: '#E3261E',
            border: '4px solid #F5716B', boxShadow: '0 8px 0 #991510', textAlign: 'center',
          }}>
            <div style={{ fontFamily: CANDY.display, fontSize: 32, lineHeight: 1, textShadow: '0 4px 0 #991510' }}>CAUGHT!</div>
            <p style={{ margin: '8px 0 0', fontWeight: 800, fontSize: 15, lineHeight: 1.35 }}>
              Caught at {fmtMult(result.crash)}. You lost <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, verticalAlign: 'bottom' }}><Coin size={17} />{formatNumber(result.stake)}</span> {result.stake === 1 ? 'coin' : 'coins'}.
            </p>
          </div>
        )}

        {/* after a cash-out: where you stopped and where the police were waiting */}
        {phase === 'cashed' && result && (
          <div className="st-pop" role="status" style={{
            position: 'absolute', left: 24, right: 24, top: '42%', padding: '8px 12px', borderRadius: 16, textAlign: 'center',
            background: 'rgba(43,15,94,.88)', border: `3px solid ${CANDY.gold}`, fontWeight: 900,
          }}>
            <div style={{ fontSize: 13, letterSpacing: '.12em', color: CANDY.gold }}>{result.max ? 'MAX WIN!' : `YOU STOPPED AT ${fmtMult(result.mult)}`}</div>
            {!result.max && <div style={{ marginTop: 3, fontSize: 13, fontWeight: 800, color: 'rgba(255,255,255,.85)' }}>The police were waiting at {fmtMult(result.crash)}</div>}
          </div>
        )}
      </section>

      {/* controls */}
      <div style={{ flex: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div aria-live="polite" style={{ minHeight: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', columnGap: 4, textAlign: 'center', fontWeight: 800, fontSize: 13, lineHeight: 1.3, color: 'rgba(255,255,255,.78)' }}>
          {hint}
        </div>

        {running ? (
          <CandyButton key="cash" color="green" big disabled={!canCash} onClick={tapCash}
            style={{ width: '100%', minHeight: 112, gap: 4, borderRadius: 18, ...(canCash ? { ...GOLD_BTN, color: CANDY.outline, textShadow: 'none' } : null) }}>
            <span style={{ fontSize: 22, letterSpacing: 1 }}>CASH OUT</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 34 }}>
              <Coin size={32} /><span ref={payRef}>{formatNumber(stake)}</span> <span style={{ fontSize: 24 }}>coins</span>
            </span>
          </CandyButton>
        ) : (
          <>
            <div role="group" aria-label="Your coins" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 9 }}>
              {STAKES.map(s => {
                const on = s === stake;
                return (
                  <button key={s} type="button" className="st-chip" aria-pressed={on} disabled={s > balance || !!cel} onClick={() => chooseStake(s)}
                    aria-label={`${s} ${s === 1 ? 'coin' : 'coins'}`}
                    style={{ height: 46, fontSize: 21, color: on ? CANDY.outline : '#fff', background: on ? CANDY.gold : '#54496B',
                      border: `3px solid ${on ? '#FFF0A0' : '#6A5F82'}`, boxShadow: `0 4px 0 ${on ? '#E0A300' : '#2F2742'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                    <Coin size={18} />{s}
                  </button>
                );
              })}
            </div>
            <CandyButton key="drive" color="green" disabled={!canRun} onClick={drive}
              style={{ width: '100%', minHeight: 58, borderRadius: 18, fontSize: 25, flexDirection: 'row', gap: 8 }}>
              <span style={{ textShadow: canRun ? `${textStroke(2, CANDY.outline)}, 0 3px 0 ${CANDY.outline}` : 'none' }}>{over ? 'PLAY AGAIN' : 'DRIVE'} ·</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, textShadow: canRun ? outlineShadow(2, CANDY.outline, 2) : 'none' }}>
                <Coin size={24} />{formatNumber(stake)} {stake === 1 ? 'COIN' : 'COINS'}
              </span>
            </CandyButton>
          </>
        )}
      </div>

      {cel && (
        <WinCelebration payout={cel.payout} reduced={reduced} delay={reduced ? 250 : PANEL_MS} pillRef={pillRef}
          onTick={(added) => setCel(c => c && { ...c, added })} onDone={() => { setCel(null); regroup(); }} />
      )}
    </CandyScreen>
  );
}
