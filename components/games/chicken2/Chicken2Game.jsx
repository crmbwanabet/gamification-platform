'use client';

import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import TutorialModal from '../../modals/TutorialModal';
import CandyScreen from '../candy/CandyScreen';
import CandyButton from '../candy/CandyButton';
import CandyChip from '../candy/CandyChip';
import WinCelebration from '../candy/WinCelebration';
import { CANDY, outlineShadow, textStroke } from '../candy/tokens';
import {
  STAKES, MAX_MULT, MIN_CASHOUT, clampRtp, drawCrash, payoutFor, shownAt, endTime, timeFor, settleOnClose,
} from '@/lib/chicken2/crash.mjs';
import { cid } from '../chicken/shared/rig';
import { useFitViewBox } from '../chicken/shared/fit';
import { YardDefs, YardBack, YardGround, YardOverlay, YARD_CSS } from '../chicken/shared/Yard';
import Farmer, { FARMER_CSS } from '../chicken/shared/Farmer';
import { Chicken, Shadows, CHICKEN_CSS } from '../chicken/shared/Chickens';
import { Puffs, Effects } from '../chicken/shared/Effects';
import { EggDefs, Eggs, ScatterEggs, Nest } from './Eggs';
import { makeRig2, render2, eggsCollected, setGone2, HEN, AFTER_CASH_S, AFTER_FALL_S } from './motion2';

// ============================================================================
// CHICKEN CATCH 2 — a crash game, stake-only
// (spec: docs/superpowers/specs/2026-10-07-chicken-catch-2-design.md).
// Pick a stake (5/10/20) and optionally an AUTO cash-out, tap RUN. The stake is
// charged right then (onSpend) and the crash point C is drawn from
// crypto.getRandomValues (lib/chicken2/crash.mjs; RTP from remote config
// games.chicken2.rtp, clamped, default 98%). The farmer chases the golden hen;
// the multiplier climbs e^(K·t) from 1.00× (each golden egg he runs through
// pulses it). CASH OUT banks floor(stake × shown multiplier) — he dives and
// catches her, WinCelebration plays, and a faded ghost counter runs on to where
// he would have fallen. If the counter would pass C he trips and the hen flies
// off: LOSE, "CRASHED @ C×". At 10× he catches her automatically (MAX WIN!).
// The chase (near-catch waves) is chase(t, seed) — never a function of C, so
// nothing foreshadows the crash (lib/chicken2/motion.mjs, tested). A strip of
// the last 8 crash points (localStorage chicken2:history) sits over the scene.
// Settlement is exactly once: roundRef.done flips before onRound; a cash-out
// tap is checked against the clock (never after the fall time), and closing
// mid-run settles via settleOnClose (a cash-out at that moment; 1.00× = stake
// back unless C = 1.00; already fallen = loss). RUN is locked while running.
// NOTE: STAKES are mirrored by stakeRange '5–20' in lib/data/platform.js and
// the tutorial lines in lib/data/tutorials.js — change all three together.
// ============================================================================

const LAST_KEY = 'chicken2:last';
const HIST_KEY = 'chicken2:history';
const HIST_N = 8;
const CHIP_COLORS = { 5: 'violet', 10: 'blue', 20: 'red' };
const AUTOS = [null, 1.5, 2, 3, 5];
const MIN_STAKE = STAKES[0];
const REGROUP_MS = 220;
const PANEL_MS = 1500;        // after a cash-out: the catch + the ghost run, then the panel
const GHOST_RATE = 5;         // the ghost counter runs this much faster than real time
const GOLD_BTN = { '--cb-fill': '#FFB21F', '--cb-light': '#FFD978', '--cb-dark': '#B86E00' };

function readLast() {
  try {
    const v = JSON.parse(window.localStorage.getItem(LAST_KEY) || 'null');
    return { stake: STAKES.includes(v?.stake) ? v.stake : MIN_STAKE, auto: AUTOS.includes(v?.auto) ? v.auto : null };
  } catch (e) { return { stake: MIN_STAKE, auto: null }; }
}
function saveLast(stake, auto) {
  try { window.localStorage.setItem(LAST_KEY, JSON.stringify({ stake, auto })); } catch (e) { /* private mode */ }
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
// red < 2×, gold 2–5×, green ≥ 5×
const histPill = (c) => (c < 2 ? { background: '#E3261E', color: '#fff' } : c < 5 ? { background: CANDY.gold, color: CANDY.outline } : { background: '#5ED62B', color: CANDY.outline });
function affordable(stake, balance) {
  if (stake <= balance) return stake;
  const fit = STAKES.filter(s => s <= balance);
  return fit.length ? fit[fit.length - 1] : stake;
}
const fmt = (m) => `${m.toFixed(2)}×`;

const TITLE = (
  <span style={{ display: 'block', lineHeight: .9, margin: '2px 0 2px' }}>
    <span style={{ display: 'block', fontSize: 27 }}>CHICKEN</span>
    <span style={{ display: 'block', fontSize: 34, marginTop: 1 }}>CATCH 2</span>
  </span>
);
const STATIC_CSS = YARD_CSS + FARMER_CSS + CHICKEN_CSS + `
  @keyframes c2Pulse { 0% { transform: scale(1) } 35% { transform: scale(1.18) } 100% { transform: scale(1) } }
  .c2-num.pulse { animation: c2Pulse .32s ease-out; }
  @keyframes c2Shake { 0%,100% { transform: translateX(0) } 25% { transform: translateX(-4px) } 75% { transform: translateX(4px) } }
  .c2-num.fell { animation: c2Shake .3s ease-in-out 2; }
  @keyframes c2PillIn { 0% { transform: scale(.4); opacity: 0 } 70% { transform: scale(1.12) } 100% { transform: scale(1); opacity: 1 } }
  .c2-pill.new { animation: c2PillIn .35s ease-out; }
  @media (prefers-reduced-motion: reduce) { .c2-num.pulse, .c2-num.fell, .c2-pill.new { animation: none; } }
`;
const NUM_SHADOW = `${textStroke(3, CANDY.outline)}, 0 4px 0 ${CANDY.outline}`;

export default function Chicken2Game({ onClose, closing, balance = 0, rtp, onSpend, onRound }) {
  const [init] = useState(readLast);
  const [stake, setStake] = useState(() => affordable(init.stake, balance));
  const [auto, setAuto] = useState(init.auto);
  const [phase, setPhase] = useState('idle');   // 'idle' | 'run' | 'cashed' | 'fell'
  const [result, setResult] = useState(null);   // { mult, crash, max }
  const [canCash, setCanCash] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [cel, setCel] = useState(null);         // win celebration { payout, added }
  const [hist, setHist] = useState(readHist);   // the last crash points, newest first
  const histRef = useRef(hist);
  const [histNew, setHistNew] = useState(0);    // bumps to pop the newest pill in
  const pillRef = useRef(null);

  const sceneRef = useRef(null);
  const svgRef = useRef(null);
  const viewBox = useFitViewBox(sceneRef);
  const rigRef = useRef(null);
  const rafRef = useRef(0);
  const timers = useRef([]);
  const runningRef = useRef(false);   // RUN lock: from the tap until the round has settled
  const roundRef = useRef(null);      // { stake, crash, tc, t0, seed, cashT, done, auto, eggs }
  const numRef = useRef(null), labelRef = useRef(null), ghostRef = useRef(null), payRef = useRef(null);
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

  useLayoutEffect(() => {
    const R = makeRig2(svgRef.current);
    rigRef.current = R;
    render2(R, 0, null);
  }, []);

  useEffect(() => {
    if (phase !== 'run') setStake(s => affordable(s, balance));
  }, [balance, phase]);

  // Exactly once: done flips before onRound. Refs only (unmount-safe).
  function settle(win, mult) {
    const r = roundRef.current;
    if (!r || r.done) return false;
    r.done = true;
    const payout = win ? payoutFor(r.stake, mult) : 0;
    onRoundRef.current?.({ stake: r.stake, win, payout });
    return payout;
  }
  // The round's crash point joins the history once the player has seen it
  // (the fall, or the ghost run reaching it after a cash-out) — once per round.
  function logRound(r) {
    if (!r || r.logged) return;
    r.logged = true;
    const h = [r.crash, ...histRef.current].slice(0, HIST_N);
    histRef.current = h;
    saveHist(h);
    setHist(h);
    setHistNew(n => n + 1);
  }
  // Close mid-run: settle as a cash-out at this moment (see settleOnClose).
  useEffect(() => () => {
    stopAnim(); clearTimers();
    const r = roundRef.current;
    if (r && !r.done) { const s = settleOnClose((performance.now() - r.t0) / 1000, r.crash); settle(s.win, s.mult); }
    if (r && r.done) logRound(r);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function setCounter(label, num, ghost, cls) {
    if (labelRef.current) { labelRef.current.textContent = label; if (cls !== undefined) labelRef.current.dataset.state = cls; }
    if (numRef.current) { numRef.current.textContent = num; if (cls !== undefined) numRef.current.dataset.state = cls; }
    if (ghostRef.current) ghostRef.current.textContent = ghost || '';
  }
  function pulse(name) {
    const el = numRef.current;
    if (!el) return;
    el.classList.remove('pulse', 'fell');
    void el.offsetWidth;
    el.classList.add(name);
  }

  function regroup() {
    clearTimers();
    stopAnim();
    const R = rigRef.current;
    if (roundRef.current?.done) logRound(roundRef.current);
    const reset = () => { setPhase('idle'); setResult(null); setCounter('MULTIPLIER', fmt(1), '', 'idle'); };
    if (reducedRef.current || !R) { if (R) render2(R, 0, null); reset(); return; }
    setGone2(R, true);
    later(() => { render2(R, 0, null); setGone2(R, false); reset(); }, REGROUP_MS);
  }

  // The frame loop: the scene (unless reduced motion) + the counter.
  function loop() {
    const R = rigRef.current, r = roundRef.current;
    const step = (now) => {
      const t = (now - r.t0) / 1000;
      if (t >= 0) {
        if (!r.done) {
          if (r.cashAt != null && t >= r.cashAt) { cashOut(r.cashAtMult, r.cashAt); }
          else if (t >= r.tc) { fall(); }
        }
        if (!reducedRef.current) render2(R, t, r);
        if (!r.done) {
          const m = shownAt(t, r.crash);
          setCounter(r.auto ? `AUTO AT ${r.auto}×` : 'CASH OUT IN TIME!', fmt(m));
          if (payRef.current) payRef.current.textContent = `${payoutFor(r.stake, Math.max(1, m))} coins`;
          const n = eggsCollected(r, t);
          if (n > r.eggs) { r.eggs = n; pulse('pulse'); }
        } else if (r.cashT != null && !r.max) {
          const g = reducedRef.current ? r.crash : shownAt(r.cashT + (t - r.cashT) * GHOST_RATE, r.crash);
          if (ghostRef.current) ghostRef.current.textContent = g >= r.crash ? `would crash @ ${fmt(r.crash)}` : `run on… ${fmt(g)}`;
          if (g >= r.crash) logRound(r);
        }
      }
      // after a cash-out, keep going until the ghost run has reached the crash point
      const ghostEnd = r.cashT != null && !r.max ? r.cashT + (timeFor(r.crash) - r.cashT) / GHOST_RATE + .1 : 0;
      const end = r.done ? (r.cashT != null ? Math.max(r.cashT + AFTER_CASH_S, ghostEnd) : r.tc + AFTER_FALL_S) : Infinity;
      rafRef.current = t < end ? requestAnimationFrame(step) : 0;
    };
    rafRef.current = requestAnimationFrame(step);
  }

  function cashOut(mult, tAt, max = false) {
    const r = roundRef.current;
    if (!r || r.done) return;
    const payout = settle(true, mult);
    r.cashT = tAt; r.max = max || mult >= MAX_MULT;
    runningRef.current = false;
    clearTimers();
    setCanCash(false);
    setPhase('cashed');
    setResult({ mult, crash: r.crash, max: r.max });
    setCounter(r.max ? 'MAX WIN!' : 'CASHED OUT', fmt(mult), r.max ? '' : `run on… ${fmt(mult)}`, 'cashed');
    pulse('pulse');
    if (reducedRef.current) {
      render2(rigRef.current, tAt + AFTER_CASH_S, r, { still: true });
      if (ghostRef.current && !r.max) ghostRef.current.textContent = `would crash @ ${fmt(r.crash)}`;
    }
    if (reducedRef.current || r.max) logRound(r);
    setCel({ payout, added: 0 });
  }
  function fall() {
    const r = roundRef.current;
    if (!r || r.done) return;
    settle(false, 0);
    runningRef.current = false;
    clearTimers();
    setCanCash(false);
    setPhase('fell');
    setResult({ crash: r.crash });
    setCounter('CRASHED @', fmt(r.crash), '', 'fell');
    pulse('fell');
    logRound(r);
    if (reducedRef.current) render2(rigRef.current, r.tc + AFTER_FALL_S, r, { still: true });
    later(() => regroup(), (AFTER_FALL_S + .5) * 1000);
  }

  const broke = balance < MIN_STAKE;
  const running = phase === 'run';
  const canRun = !running && !cel && stake <= balance;
  const shownBalance = cel ? Math.max(0, balance - cel.payout + cel.added) : balance;

  const run = () => {
    if (runningRef.current || cel || stake > balance) return;
    runningRef.current = true;
    const crash = drawCrash(clampRtp(rtp));
    onSpend?.(stake);
    const fromResult = phase !== 'idle';
    const delay = fromResult && !reduced ? REGROUP_MS : 0;
    clearTimers();
    stopAnim();
    if (roundRef.current?.done) logRound(roundRef.current);
    const R = rigRef.current;
    if (fromResult) { if (delay) { setGone2(R, true); later(() => { setGone2(R, false); }, delay); } }
    const max = crash >= MAX_MULT;
    const autoAt = auto && auto <= crash ? auto : (max ? MAX_MULT : null);
    const r = {
      stake, crash, auto, t0: performance.now() + delay, seed: 1 + Math.floor(Math.random() * 1e6), // the weave only — not the result
      tc: max ? Infinity : endTime(crash), cashT: null, done: false, eggs: 0,
      cashAt: autoAt != null ? timeFor(autoAt) : null, cashAtMult: autoAt,
    };
    roundRef.current = r;
    setPhase('run');
    setResult(null);
    setCanCash(false);
    setCounter(auto ? `AUTO AT ${auto}×` : 'CASH OUT IN TIME!', fmt(1), '', 'run');
    // Timers back the frame loop up (it stops in background tabs).
    if (crash >= MIN_CASHOUT) later(() => { if (!r.done) setCanCash(true); }, delay + timeFor(MIN_CASHOUT) * 1000);
    if (r.cashAt != null) later(() => cashOut(r.cashAtMult, r.cashAt), delay + r.cashAt * 1000);
    if (!max) later(() => fall(), delay + r.tc * 1000);
    if (reduced) render2(R, 1.8, { ...r, tc: Infinity }, { still: true });   // a still of the first lunge
    loop();
  };

  const tapCash = () => {
    const r = roundRef.current;
    if (!r || r.done || !running) return;
    const t = (performance.now() - r.t0) / 1000;
    if (t >= r.tc) { fall(); return; }           // too late — he's already down
    const m = shownAt(t, r.crash);
    if (m < MIN_CASHOUT) return;
    cashOut(m, t);
  };

  const chooseStake = (s) => {
    if (running || cel || s > balance) return;
    setStake(s); saveLast(s, auto);
    if (phase !== 'idle') regroup();
  };
  const cycleAuto = () => {
    if (running || cel) return;
    const a = AUTOS[(AUTOS.indexOf(auto) + 1) % AUTOS.length];
    setAuto(a); saveLast(stake, a);
    if (phase !== 'idle') regroup();
  };

  let line;
  if (phase === 'run') line = <span style={{ color: CANDY.sub, fontSize: 17 }}>{auto ? `Auto cash-out at ${auto}×` : 'Cash out before he falls!'}</span>;
  else if (phase === 'cashed') line = <span key="win" className="anim-scale-in" style={{ fontSize: 28, color: CANDY.gold, letterSpacing: 2, textShadow: `${outlineShadow(2, CANDY.outline, 3)}, 0 0 18px rgba(255,210,31,.8)` }}>{result?.max ? 'MAX WIN!' : 'WIN'}</span>;
  else if (phase === 'fell') line = <span key="lose" className="anim-scale-in" style={{ fontSize: 26, color: '#fff', letterSpacing: 2, textShadow: outlineShadow(2, CANDY.outline, 3) }}>LOSE</span>;
  else if (broke) line = <span style={{ fontSize: 17, color: '#FF8A80' }}>Not enough coins</span>;
  else line = <span style={{ fontSize: 17, color: CANDY.sub }}>Golden eggs push it up to 10×</span>;

  return (
    <CandyScreen title={TITLE} balance={shownBalance} pillRef={pillRef} closing={closing} onClose={onClose} onHelp={() => setShowTutorial(true)}
      overlay={showTutorial && <TutorialModal tutorialKey="chicken2" onClose={() => setShowTutorial(false)} />}>
      <style>{STATIC_CSS}</style>

      <div ref={sceneRef} style={{
        position: 'relative', flex: 1, minHeight: 0, margin: '7px 0 3px', borderRadius: 18, overflow: 'hidden', background: '#2a0a4f',
        boxShadow: '0 0 0 2px rgba(255,210,31,.7), 0 0 0 4px rgba(42,10,79,.9), 0 6px 18px rgba(0,0,0,.45)',
      }}>
        <svg ref={svgRef} className="ck-svg" viewBox={viewBox} preserveAspectRatio="xMidYMid meet" aria-hidden
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}>
          <defs><YardDefs /><EggDefs /></defs>
          <YardBack />
          <g id={cid('worldB')}><g className="ck-back" /></g>
          <YardGround />
          <g id={cid('world')}>
            <Shadows birds={[HEN]} />
            <Nest />
            <Puffs />
            <Eggs />
            <g className="ck-actors">
              <Farmer />
              <Chicken b={HEN} i={0} plain />
            </g>
            <ScatterEggs />
            <Effects />
          </g>
          <YardOverlay />
        </svg>
        <div aria-hidden style={{ position: 'absolute', inset: 0, borderRadius: 18, pointerEvents: 'none', boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,.12), inset 0 0 22px rgba(10,0,30,.55)' }} />

        {/* the last crash points, newest first */}
        <div aria-label={`Last crashes: ${hist.length ? hist.map(fmt).join(', ') : 'none yet'}`} role="img"
          style={{ position: 'absolute', left: 8, right: 8, top: 7, height: 20, display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden', pointerEvents: 'none',
            WebkitMaskImage: 'linear-gradient(90deg, #000 82%, transparent)', maskImage: 'linear-gradient(90deg, #000 82%, transparent)' }}>
          <span aria-hidden style={{ flex: 'none', fontFamily: CANDY.display, fontSize: 10, letterSpacing: .8, color: '#fff', opacity: .8, textShadow: outlineShadow(1, CANDY.outline, 1) }}>LAST</span>
          {hist.length === 0 && <span aria-hidden style={{ fontFamily: CANDY.display, fontSize: 11, color: '#fff', opacity: .55, textShadow: outlineShadow(1, CANDY.outline, 1) }}>—</span>}
          {hist.map((c, i) => (
            <span key={i === 0 ? `n${histNew}` : `o${hist.length - i}-${c}`} aria-hidden className={`c2-pill${i === 0 && histNew ? ' new' : ''}`}
              style={{ flex: 'none', height: 18, lineHeight: '15px', padding: '0 6px', borderRadius: 9, border: `1.5px solid ${CANDY.outline}`, fontFamily: CANDY.display, fontSize: 11.5, letterSpacing: .3,
                fontVariantNumeric: 'tabular-nums', boxShadow: '0 2px 0 rgba(42,10,79,.8)', ...histPill(c) }}>{fmt(c)}</span>
          ))}
        </div>

        {/* the multiplier counter */}
        <div role="status" aria-live="off" style={{ position: 'absolute', left: 0, right: 0, top: 31, display: 'flex', flexDirection: 'column', alignItems: 'center', pointerEvents: 'none', fontFamily: CANDY.display }}>
          <span ref={labelRef} className="c2-lbl" data-state="idle" style={{ fontSize: 12, letterSpacing: 1.2, color: '#fff', textShadow: outlineShadow(1.5, CANDY.outline, 1.5), opacity: .92 }}>MULTIPLIER</span>
          <span ref={numRef} className="c2-num" data-state="idle" style={{ display: 'block', fontSize: 44, lineHeight: 1.02, letterSpacing: 1, textShadow: NUM_SHADOW, fontVariantNumeric: 'tabular-nums' }}>1.00×</span>
          <span ref={ghostRef} style={{ fontSize: 14, color: '#fff', opacity: .55, textShadow: outlineShadow(1.5, CANDY.outline, 1.5), minHeight: 16 }} />
        </div>
        <style>{`
          .c2-num[data-state="idle"] { color: #fff; opacity: .85 }
          .c2-num[data-state="run"] { color: ${CANDY.gold} }
          .c2-num[data-state="cashed"] { color: ${CANDY.gold} }
          .c2-num[data-state="fell"] { color: #FF5A4E }
          .c2-lbl[data-state="fell"] { color: #FF8A80; font-size: 15px !important; letter-spacing: 1.5px !important; opacity: 1 !important }
        `}</style>
      </div>

      <div aria-live="polite" style={{ flex: 'none', height: 30, position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: CANDY.display, letterSpacing: .5, whiteSpace: 'nowrap' }}>
        {line}
        <span className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
          {phase === 'cashed' && result ? `Cashed out at ${fmt(result.mult)}` : phase === 'fell' && result ? `Crashed at ${fmt(result.crash)}` : ''}
        </span>
      </div>

      <div style={{ flex: 'none' }}>
        <div style={{ display: 'flex', gap: 7, marginBottom: 2 }}>
          <div role="group" aria-label="Stake" style={{ display: 'flex', gap: 7, flex: 3, minWidth: 0 }}>
            {STAKES.map(s => (
              <CandyChip key={s} color={CHIP_COLORS[s]} disabled={s > balance} selected={stake === s} onClick={() => chooseStake(s)}>
                {s}
              </CandyChip>
            ))}
          </div>
          <CandyButton color={auto ? 'green' : 'blue'} dim={!auto} onClick={cycleAuto} aria-label={`Auto cash-out: ${auto ? `${auto}x` : 'off'}`}
            style={{ flex: 1.15, minWidth: 0, padding: 0, borderRadius: 14, gap: 2 }}>
            <span style={{ fontSize: 12, letterSpacing: 1 }}>AUTO</span>
            <span style={{ fontSize: 21, textShadow: outlineShadow(2, CANDY.outline, 2) }}>{auto ? `${auto}×` : 'OFF'}</span>
          </CandyButton>
        </div>

        {running ? (
          <CandyButton key="cash" color="green" big disabled={!canCash} onClick={tapCash}
            style={{ width: '100%', minHeight: 66, gap: 2, marginBottom: 6, borderRadius: 18, ...(canCash ? GOLD_BTN : null) }}>
            <span style={{ fontSize: 30, textShadow: canCash ? `${textStroke(2.5, CANDY.outline)}, 0 4px 0 ${CANDY.outline}` : 'none' }}>CASH OUT</span>
            <span ref={payRef} style={{ fontSize: 15, color: '#fff', textShadow: canCash ? `${textStroke(1.5, CANDY.outline)}, 0 2px 0 ${CANDY.outline}` : 'none', letterSpacing: 1 }}>{stake} coins</span>
          </CandyButton>
        ) : (
          <CandyButton key="run" color="green" big disabled={!canRun} onClick={run} style={{ width: '100%', minHeight: 66, gap: 2, marginBottom: 6, borderRadius: 18 }}>
            <span style={{ fontSize: 34, textShadow: canRun ? `${textStroke(2.5, CANDY.outline)}, 0 4px 0 ${CANDY.outline}` : 'none' }}>RUN</span>
            <span style={{ fontSize: 14, color: canRun ? CANDY.gold : 'inherit', textShadow: canRun ? `${textStroke(1.5, CANDY.outline)}, 0 2px 0 ${CANDY.outline}` : 'none', letterSpacing: 1 }}>✦ WIN UP TO {payoutFor(stake, MAX_MULT)} ✦</span>
          </CandyButton>
        )}
      </div>

      {cel && (
        <WinCelebration payout={cel.payout} reduced={reduced} delay={reduced ? 250 : PANEL_MS} pillRef={pillRef}
          onTick={(added) => setCel(c => c && { ...c, added })} onDone={() => { setCel(null); regroup(); }} />
      )}
    </CandyScreen>
  );
}
