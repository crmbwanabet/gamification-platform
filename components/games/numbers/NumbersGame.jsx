'use client';

import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { Dices, Eraser } from 'lucide-react';
import TutorialModal from '../../modals/TutorialModal';
import CandyScreen from '../candy/CandyScreen';
import CandyButton from '../candy/CandyButton';
import CandyChip from '../candy/CandyChip';
import WinCelebration from '../candy/WinCelebration';
import { CANDY, outlineShadow, textStroke } from '../candy/tokens';
import { resolveDraw, tierIndex, tierPays, STAKES, TIERS, PICKS, POOL, DEFAULT_STAKE } from '@/lib/numbers/paytable.mjs';
import Machine, { MACHINE_CSS, MACH_H, CHUTE_PATH, RAIL_Y } from './Machine';
import Grid, { GRID_CSS } from './Grid';
import LottoBall from './Ball';

// ============================================================================
// LUCKY NUMBERS — stake-only (spec: docs/superpowers/specs/2026-10-07-lucky-numbers-design.md).
// Pick exactly 6 of 1–20 (or QUICK PICK), a stake (1/5/10/20), tap DRAW. All 6
// drawn numbers are decided right then (lib/numbers, crypto RNG) and the stake
// is charged via onSpend; the machine then pops the balls out one by one
// (~4.7 s), each match lighting its tile. The round is reported after the last
// ball (onRound) so nothing spoils the draw. Exactly-once: the resolved round
// waits in pendingRef; fireRound() nulls it before calling onRound, and unmount
// (close mid-draw) flushes it. Double-charge guard: busyRef locks DRAW from the
// tap until the last ball lands.
// Win: the WinCelebration panel pops in; the platform has ALREADY credited the
// payout via onRound, so the pill shows balance - payout + collected.
// Reduced motion: no flight — the 6 balls appear in place, the result follows.
// NOTE: STAKES are mirrored by stakeRange '1–20' in lib/data/platform.js and
// the tutorial prize lines in lib/data/tutorials.js — change all three together.
// ============================================================================

const LAST_KEY = 'numbers:last';
const CHIP_COLORS = { 1: 'violet', 5: 'blue', 10: 'red', 20: 'green' };
const MIN_STAKE = STAKES[0];
const FIRST_MS = 350;     // first ball leaves the machine
const STEP_MS = 700;      // between balls
const FLY_MS = 760;       // one ball's trip: chute → tray
const LAND_AT = 0.86;     // fraction of FLY_MS when it reaches its slot
const SETTLE_MS = 220;    // after the last ball lands → result
const CEL_DELAY_MS = 650; // result → win panel
const REDUCED_MS = 250;
const STAGE_H = MACH_H + 2;
const RAIL_L = 90;
const BALL = 28;

const ORANGE = { '--cb-fill': '#FF8A1F', '--cb-light': '#FFC36B', '--cb-dark': '#B35400' };

function readLast() {
  try {
    const v = JSON.parse(window.localStorage.getItem(LAST_KEY) || 'null');
    const picks = Array.isArray(v?.picks) ? v.picks.filter(n => Number.isInteger(n) && n >= 1 && n <= POOL) : [];
    return {
      stake: STAKES.includes(v?.stake) ? v.stake : DEFAULT_STAKE,
      picks: new Set(picks).size === picks.length && picks.length <= PICKS ? picks : [],
    };
  } catch (e) { return { stake: DEFAULT_STAKE, picks: [] }; }
}
function saveLast(stake, picks) {
  try { window.localStorage.setItem(LAST_KEY, JSON.stringify({ stake, picks })); } catch (e) { /* private mode */ }
}
function affordable(stake, balance) {
  if (stake <= balance) return stake;
  const fit = STAKES.filter(s => s <= balance);
  return fit.length ? fit[fit.length - 1] : stake;
}
function quickSix() {
  const a = Array.from({ length: POOL }, (_, i) => i + 1);
  for (let i = 0; i < PICKS; i++) { const j = i + Math.floor(Math.random() * (POOL - i)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, PICKS);
}

const TITLE = (
  <span style={{ display: 'block', lineHeight: .9, margin: '2px 0 2px' }}>
    <span style={{ display: 'block', fontSize: 27 }}>LUCKY</span>
    <span style={{ display: 'block', fontSize: 34, marginTop: 1 }}>NUMBERS</span>
  </span>
);

const STAGE_CSS = `
  @keyframes lnTwinkle { 0%, 100% { opacity: .25 } 50% { opacity: .9 } }
  .ln-tw { position: absolute; width: 3px; height: 3px; border-radius: 50%; background: #FFF3B0; animation: lnTwinkle 2.4s ease-in-out infinite; pointer-events: none; }
  @keyframes lnTierPop { 0% { transform: scale(1) } 40% { transform: scale(1.14) } 100% { transform: scale(1) } }
  @media (prefers-reduced-motion: reduce) { .ln-tw { animation: none; } .ln-tier { animation: none !important; } }
`;

// Track the stage width so the tray slots (and each ball's flight) fit it.
function useWidth(ref) {
  const [w, setW] = useState(290);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const fit = () => { if (el.clientWidth) setW(el.clientWidth); };
    fit();
    if (typeof ResizeObserver === 'undefined') { window.addEventListener('resize', fit); return () => window.removeEventListener('resize', fit); }
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return w;
}

// One drawn ball: rendered at its tray slot; on mount it flies there from the
// machine (WAAPI, compositor-only transforms).
function TrayBall({ n, cx, lit, fly }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!fly || !el || !el.animate) return;
    const at = (x, y, s = 1, r = 0, sy = s) => ({ transform: `translate(${(x - cx).toFixed(1)}px, ${(y - RAIL_Y).toFixed(1)}px) rotate(${r.toFixed(0)}deg) scale(${s}, ${sy})` });
    const [p1, p2, p3, p4] = CHUTE_PATH;
    // Out of the chute it hops over the balls already in the tray (a parabola,
    // higher for longer trips), spinning, and lands upright with a squash.
    const dist = cx - p4[0];
    const h = Math.min(34, 14 + dist * 0.16);
    const R = Math.max(1, Math.round(dist / (Math.PI * BALL))) * 360;
    const hop = [];
    for (let k = 1; k <= 5; k++) {
      const t = k / 6;
      hop.push({ offset: 0.42 + (LAND_AT - 0.42) * t, ...at(p4[0] + dist * t, RAIL_Y - 4 * h * t * (1 - t), 1.06, 120 + (R - 120) * t) });
    }
    el.animate([
      { offset: 0, opacity: 0, ...at(62, 50, 0.4) },
      { offset: 0.07, opacity: 1, ...at(p1[0], p1[1], 0.55) },
      { offset: 0.2, ...at(p2[0], p2[1], 0.6, 40) },
      { offset: 0.32, ...at(p3[0], p3[1], 0.68, 90) },
      { offset: 0.42, ...at(p4[0], p4[1], 0.92, 120) },
      ...hop,
      { offset: LAND_AT, ...at(cx, RAIL_Y + 1.5, 1.12, R, 0.86) },
      { offset: 0.93, ...at(cx, RAIL_Y - 3, 0.96, R, 1.05) },
      { offset: 1, ...at(cx, RAIL_Y, 1, R) },
    ], { duration: FLY_MS, easing: 'linear', fill: 'backwards' });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <span ref={ref} style={{ position: 'absolute', left: cx - BALL / 2, top: RAIL_Y - BALL / 2, zIndex: 2, willChange: 'transform' }}>
      <LottoBall n={n} size={BALL} lit={lit} />
    </span>
  );
}

// Coins per tier at the selected stake (lib/numbers paytableFor — whole coins,
// a small table per stake so the RTP stays inside 97–99%).
function Paytable({ active, settled, left, pays }) {
  return (
    <div aria-label="Paytable" style={{ position: 'absolute', left, right: 6, top: 4 }}>
      <div style={{ textAlign: 'center', fontFamily: CANDY.display, fontSize: 10.5, letterSpacing: 1.5, color: 'rgba(255,255,255,.7)', lineHeight: 1, marginBottom: 3 }}>
        MATCHES <span style={{ color: CANDY.gold }}>→</span> WIN
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 3 }}>
        {TIERS.map((t, i) => {
          const on = i === active;
          return (
            <div key={t.label} className="ln-tier" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, height: 21, borderRadius: 11,
              background: on ? `linear-gradient(180deg, #FFE87A, ${CANDY.gold} 55%, ${CANDY.goldDeep})` : 'rgba(16,3,38,.6)',
              border: `2px solid ${on ? '#FFF6C2' : 'rgba(255,210,31,.45)'}`,
              boxShadow: on ? `0 0 0 1.5px ${CANDY.outline}, 0 0 12px rgba(255,210,31,.75)` : 'none',
              animation: on ? `lnTierPop ${settled ? 520 : 360}ms cubic-bezier(.2,.9,.3,1.4)` : 'none',
              transition: 'background .2s, border-color .2s',
            }}>
              <span style={{
                minWidth: 18, height: 18, padding: '0 3px', boxSizing: 'border-box', borderRadius: 9, display: 'grid', placeItems: 'center',
                background: '#fff', boxShadow: `0 0 0 1.5px ${CANDY.outline}`, fontFamily: CANDY.display, fontSize: 12, color: CANDY.outline, lineHeight: 1,
              }}>{t.label}</span>
              <span style={{ fontFamily: CANDY.display, fontSize: 15, lineHeight: 1, color: on ? CANDY.outline : CANDY.gold, textShadow: on ? 'none' : `0 1.5px 0 ${CANDY.outline}`, display: 'inline-flex', alignItems: 'center', gap: 3 }}>{pays[i]}<img src="/ui/reward/coins.png" alt="coins" width={13} height={13} style={{ objectFit: 'contain' }} /></span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Twinkles around the machine only (px), clear of the paytable text
const TWINKLES = [[7, 9, 0], [80, 7, .7], [6, 60, 1.3], [84, 33, .4], [8, 92, 1.8]];

export default function NumbersGame({ onClose, closing, balance = 0, rtp, onSpend, onRound }) {
  const [init] = useState(readLast);
  const [stake, setStake] = useState(() => affordable(init.stake, balance));
  const [picks, setPicks] = useState(init.picks);
  const [phase, setPhase] = useState('idle');   // 'idle' | 'draw' | 'result'
  const [drawn, setDrawn] = useState([]);       // this round's 6 numbers (draw order)
  const [launched, setLaunched] = useState(0);  // balls out of the machine
  const [landed, setLanded] = useState(0);      // balls in the tray
  const [round, setRound] = useState(0);
  const [result, setResult] = useState(null);   // { win, matches, payout }
  const [stagger, setStagger] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [cel, setCel] = useState(null);         // win celebration { payout, added }
  const pillRef = useRef(null);
  const stageRef = useRef(null);
  const machRef = useRef(null);
  const stageW = useWidth(stageRef);

  const timers = useRef([]);
  const busyRef = useRef(false);
  const pendingRef = useRef(null);
  const onRoundRef = useRef(onRound);
  onRoundRef.current = onRound;

  const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.current.push(t); return t; };
  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };

  useEffect(() => {
    try { setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { /* old browser */ }
  }, []);

  // After a loss the selected stake may no longer be affordable — step down
  useEffect(() => {
    if (phase !== 'draw') setStake(s => affordable(s, balance));
  }, [balance, phase]);

  function fireRound() {
    const r = pendingRef.current;
    pendingRef.current = null;
    if (r) onRoundRef.current?.(r);
  }
  useEffect(() => () => { clearTimers(); fireRound(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Leave the result view (any edit): clear the tray and tile marks.
  function backToIdle() {
    if (phase !== 'result') return;
    clearTimers();
    setPhase('idle'); setDrawn([]); setLaunched(0); setLanded(0); setResult(null);
  }

  const locked = phase === 'draw' || !!cel;
  const broke = balance < MIN_STAKE;
  const ready = picks.length === PICKS;
  const canDraw = ready && stake <= balance && !locked;

  const toggle = (n) => {
    if (busyRef.current || cel) return;
    backToIdle();
    setStagger(false);
    setPicks(p => {
      const next = p.includes(n) ? p.filter(x => x !== n) : (p.length < PICKS ? [...p, n] : p);
      saveLast(stake, next);
      return next;
    });
  };
  const quickPick = () => {
    if (busyRef.current || cel) return;
    backToIdle();
    const next = quickSix();
    setStagger(true); setPicks(next); saveLast(stake, next);
  };
  const clearPicks = () => {
    if (busyRef.current || cel) return;
    backToIdle();
    setPicks([]); saveLast(stake, []);
  };
  const chooseStake = (s) => {
    if (busyRef.current || cel || s > balance) return;
    backToIdle();
    setStake(s); saveLast(s, picks);
  };

  const popMachine = () => {
    const el = machRef.current;
    if (!el || !el.animate) return;
    el.animate([{ transform: 'scale(1,1)' }, { transform: 'scale(1.06,.93)' }, { transform: 'scale(.98,1.03)' }, { transform: 'scale(1,1)' }], { duration: 260, easing: 'ease-out' });
  };

  const draw = () => {
    if (busyRef.current || cel || picks.length !== PICKS || stake > balance) return;
    busyRef.current = true;
    const out = resolveDraw(stake, picks, undefined, rtp);
    onSpend?.(stake);
    pendingRef.current = { stake, win: out.win, payout: out.payout, matches: out.matches };
    clearTimers();
    setStagger(false);
    setRound(r => r + 1);
    setResult(null);
    setDrawn(out.drawn);
    setPhase('draw');
    const finish = () => {
      busyRef.current = false;
      setPhase('result');
      setResult({ win: out.win, matches: out.matches, payout: out.payout });
      fireRound();
      if (out.win) setCel({ payout: out.payout, added: 0 });
    };
    if (reduced) {
      setLaunched(PICKS); setLanded(PICKS);
      later(finish, REDUCED_MS);
      return;
    }
    setLaunched(0); setLanded(0);
    for (let i = 0; i < PICKS; i++) {
      const t = FIRST_MS + i * STEP_MS;
      later(() => { setLaunched(i + 1); popMachine(); }, t);
      later(() => setLanded(i + 1), t + Math.round(FLY_MS * LAND_AT));
    }
    later(finish, FIRST_MS + (PICKS - 1) * STEP_MS + Math.round(FLY_MS * LAND_AT) + SETTLE_MS);
  };

  // Tray geometry
  const firstX = RAIL_L + 26, lastX = stageW - 5 - 19;
  const slotX = (i) => firstX + (i * (lastX - firstX)) / (PICKS - 1);
  const landedNums = drawn.slice(0, landed);
  const pickSet = new Set(picks);
  const soFar = landedNums.filter(n => pickSet.has(n)).length;
  const pays = tierPays(stake, rtp); // coins for 2 / 3 / 4 / 5+ matches at this stake
  const activeTier = phase === 'idle' ? -1 : tierIndex(phase === 'result' && result ? result.matches : soFar);
  const shownBalance = cel ? Math.max(0, balance - cel.payout + cel.added) : balance;

  const matchWord = (k) => (k === 1 ? 'MATCH' : 'MATCHES');
  let line;
  if (phase === 'draw') {
    line = soFar === 0
      ? <span style={{ color: CANDY.sub, fontSize: 18 }}>Drawing…</span>
      : <span key={`d${soFar}`} className="anim-scale-in" style={{ fontSize: 22, color: '#fff', letterSpacing: 1, textShadow: outlineShadow(2, CANDY.outline, 2) }}>
          {soFar} {matchWord(soFar)}{activeTier >= 0 && <span style={{ color: CANDY.gold }}> · {pays[activeTier]} coins</span>}
        </span>;
  } else if (phase === 'result' && result?.win) {
    line = <span key="win" className="anim-scale-in" style={{ fontSize: 26, color: CANDY.gold, letterSpacing: 1.5, textShadow: `${outlineShadow(2, CANDY.outline, 3)}, 0 0 18px rgba(255,210,31,.8)` }}>{result.matches} {matchWord(result.matches)}</span>;
  } else if (phase === 'result' && result) {
    line = <span key="lose" className="anim-scale-in" style={{ fontSize: 26, color: '#fff', letterSpacing: 2, textShadow: outlineShadow(2, CANDY.outline, 3) }}>
      LOSE<span style={{ fontSize: 16, letterSpacing: .5, color: CANDY.sub, textShadow: 'none' }}> · {result.matches ? `${result.matches} ${matchWord(result.matches).toLowerCase()}` : 'no matches'}</span>
    </span>;
  } else if (broke) line = <span style={{ fontSize: 17, color: '#FF8A80' }}>Not enough coins</span>;
  else if (picks.length === 0) line = <span style={{ fontSize: 17, color: CANDY.sub }}>Pick 6 lucky numbers</span>;
  else if (!ready) line = <span style={{ fontSize: 17, color: CANDY.sub }}>Pick {PICKS - picks.length} more</span>;
  else line = <span style={{ fontSize: 17, color: CANDY.sub }}>Your lucky 6 are in!</span>;

  const caption = `✦ WIN UP TO ${pays[pays.length - 1]} ✦`;
  const sideBtn = { width: 64, flex: 'none', minHeight: 62, padding: 0, gap: 3, borderRadius: 16, fontSize: 13, letterSpacing: .3 };
  const sideTxt = (on) => ({ textShadow: on ? `${textStroke(1.5, CANDY.outline)}, 0 2px 0 ${CANDY.outline}` : 'none', lineHeight: .95, textAlign: 'center' });

  return (
    <CandyScreen title={TITLE} balance={shownBalance} pillRef={pillRef} closing={closing} onClose={onClose} onHelp={() => setShowTutorial(true)}
      overlay={showTutorial && <TutorialModal tutorialKey="numbers" onClose={() => setShowTutorial(false)} />}>
      <style>{MACHINE_CSS + GRID_CSS + STAGE_CSS}</style>

      {/* the draw stage: machine, tray, paytable */}
      <div ref={stageRef} style={{
        position: 'relative', flex: 'none', height: STAGE_H, margin: '6px 0 0', borderRadius: 16, overflow: 'hidden',
        background: `radial-gradient(ellipse 60% 120% at 18% 45%, #7A3FE0 0%, #4A1C9A 45%, #2A0A5E 100%)`,
        boxShadow: '0 0 0 2px rgba(255,210,31,.7), 0 0 0 4px rgba(42,10,79,.9), 0 6px 18px rgba(0,0,0,.45)',
      }}>
        {!reduced && TWINKLES.map(([x, y, d], i) => <span key={i} className="ln-tw" style={{ left: x, top: y, animationDelay: `${d}s` }} />)}
        <div aria-hidden style={{
          position: 'absolute', left: RAIL_L, right: 5, top: RAIL_Y - 18, height: 36, borderRadius: 18, boxSizing: 'border-box',
          background: 'linear-gradient(180deg, rgba(14,2,36,.85), rgba(52,16,116,.8))', border: `2.5px solid ${CANDY.outline}`,
          boxShadow: 'inset 0 2px 0 rgba(255,255,255,.16), inset 0 -3px 0 rgba(0,0,0,.3), 0 0 0 1.5px rgba(255,210,31,.5)',
        }} />
        {Array.from({ length: PICKS }, (_, i) => (
          <span key={i} aria-hidden style={{ position: 'absolute', left: slotX(i) - 12, top: RAIL_Y - 12, width: 24, height: 24, borderRadius: '50%', background: 'rgba(8,0,26,.6)', boxShadow: 'inset 0 2px 3px rgba(0,0,0,.6), 0 1px 0 rgba(255,255,255,.12)', display: 'grid', placeItems: 'center', fontFamily: CANDY.display, fontSize: 13, color: 'rgba(255,255,255,.22)' }}>?</span>
        ))}
        <Machine drawing={phase === 'draw' && !reduced} svgRef={machRef} />
        {drawn.slice(0, launched).map((n, i) => (
          <TrayBall key={`${round}-${i}`} n={n} cx={slotX(i)} fly={!reduced} lit={i < landed && pickSet.has(n)} />
        ))}
        <Paytable active={activeTier} settled={phase === 'result'} left={RAIL_L + 8} pays={pays} />
      </div>

      {/* result line — fixed height so nothing below shifts */}
      <div aria-live="polite" style={{ flex: 'none', height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: CANDY.display, letterSpacing: .5, whiteSpace: 'nowrap' }}>
        {line}
      </div>

      <Grid picks={picks} landed={landedNums} settled={phase === 'result'} locked={locked} round={round} reduced={reduced} stagger={stagger} onToggle={toggle} />

      <div style={{ flex: 1, minHeight: 6 }} />

      <div style={{ flex: 'none' }}>
        <div role="group" aria-label="Stake" style={{ display: 'flex', gap: 7, marginBottom: 2 }}>
          {STAKES.map(s => (
            <CandyChip key={s} color={CHIP_COLORS[s]} disabled={s > balance}
              selected={stake === s} onClick={() => chooseStake(s)} style={{ minHeight: 50 }}>
              {s}
            </CandyChip>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
          <CandyButton color="violet" disabled={locked || picks.length === 0} onClick={clearPicks} aria-label="Clear picks" style={sideBtn}>
            <Eraser size={20} strokeWidth={2.75} aria-hidden />
            <span style={sideTxt(!(locked || picks.length === 0))}>CLEAR</span>
          </CandyButton>
          <CandyButton color="green" big disabled={!canDraw} onClick={draw} style={{ flex: 1, minWidth: 0, minHeight: 62, gap: 2, padding: '0 4px', borderRadius: 18 }}>
            <span style={{ fontSize: 33, textShadow: canDraw ? `${textStroke(2.5, CANDY.outline)}, 0 4px 0 ${CANDY.outline}` : 'none' }}>DRAW</span>
            <span style={{ fontSize: 13, whiteSpace: 'nowrap', color: canDraw ? CANDY.gold : 'inherit', textShadow: canDraw ? `${textStroke(1.5, CANDY.outline)}, 0 2px 0 ${CANDY.outline}` : 'none', letterSpacing: .8 }}>{caption}</span>
          </CandyButton>
          <CandyButton disabled={locked} onClick={quickPick} aria-label="Quick pick" style={{ ...sideBtn, ...(locked ? null : ORANGE) }}>
            <Dices size={21} strokeWidth={2.5} aria-hidden />
            <span style={sideTxt(!locked)}>QUICK<br />PICK</span>
          </CandyButton>
        </div>
      </div>

      {cel && (
        <WinCelebration payout={cel.payout} reduced={reduced} delay={CEL_DELAY_MS} pillRef={pillRef}
          onTick={(added) => setCel(c => c && { ...c, added })} onDone={() => setCel(null)} />
      )}
    </CandyScreen>
  );
}
