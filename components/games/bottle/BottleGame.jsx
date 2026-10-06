'use client';

import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import TutorialModal from '../../modals/TutorialModal';
import CandyScreen from '../candy/CandyScreen';
import CandyButton from '../candy/CandyButton';
import CandyChip from '../candy/CandyChip';
import WinCelebration from '../candy/WinCelebration';
import { CANDY, outlineShadow, textStroke } from '../candy/tokens';
import { resolveSpin, STAKES, SEGMENTS, MAX_MULT } from '@/lib/bottle/wheel.mjs';
import { VB_W, VB_H, SEG_DEG, planSpin, angleAt, TOTAL_S } from './geom';
import { SceneDefs, SceneBack, Table, SceneFront, SCENE_CSS } from './Scene';
import Bottle, { BottleDefs, BottleShadow, Ghosts } from './Bottle';
import { makeRig, render, setResult, setStuds } from './motion';

// ============================================================================
// BOTTLE SPIN — stake-only (spec: docs/superpowers/specs/2026-10-07-bottle-spin-design.md).
// Pick a stake (10/20/30/50) and tap SPIN: a green soda bottle spins on a
// painted table (8 segments, 1.2x … 4x and three TRY AGAIN) and stops pointing
// at the result. The result is decided on the device at SPIN (resolveSpin,
// crypto RNG, weighted pay table with EV 0.95) and the stake is charged right
// then via onSpend; the round is reported when the bottle STOPS (onRound) so
// nothing spoils the spin. Exactly-once: the resolved round waits in
// pendingRef; fireRound() nulls it before calling onRound, and unmount (close
// mid-spin) flushes it. Double-charge guard: flyingRef locks SPIN from the tap
// until the bottle stops.
// Win: the WinCelebration panel (YOU WON / count-up / COLLECT) pops in after a
// beat on the glowing segment. The platform has ALREADY credited the payout
// via onRound; while the panel is up the pill shows the pre-win balance
// (balance - payout + coins collected so far) and COLLECT walks it up.
// Animation: motion.js writes the bottle's pose into the SVG every frame (rAF);
// reduced motion swaps the bottle to its final angle with a fade.
// NOTE: STAKES are mirrored by stakeRange '10–50' in lib/data/platform.js and
// the tutorial prize lines in lib/data/tutorials.js — change all three together.
// ============================================================================

const LAST_KEY = 'bottle:last';
const CHIP_COLORS = { 10: 'violet', 20: 'blue', 30: 'red', 50: 'green' };
const MIN_STAKE = STAKES[0];
const IDLE_PHI = 3 * SEG_DEG + 4;   // resting on 1.2x, near-right
const PANEL_DELAY_MS = 900;         // a beat on the glowing segment before the panel
const LOSE_RESET_MS = 2400;
const REDUCED_FADE_MS = 220;

function readLast() {
  try {
    const v = JSON.parse(window.localStorage.getItem(LAST_KEY) || 'null');
    return STAKES.includes(v?.stake) ? v.stake : MIN_STAKE;
  } catch (e) { return MIN_STAKE; }
}
function saveLast(stake) {
  try { window.localStorage.setItem(LAST_KEY, JSON.stringify({ stake })); } catch (e) { /* private mode */ }
}
// Remembered stake above the balance → highest affordable tier (else keep it; all disabled)
function affordable(stake, balance) {
  if (stake <= balance) return stake;
  const fit = STAKES.filter(s => s <= balance);
  return fit.length ? fit[fit.length - 1] : stake;
}

// Fit the viewBox to the scene box: widen (more yard) or heighten (more sky).
function useFitViewBox(ref) {
  const [vb, setVb] = useState(`0 0 ${VB_W} ${VB_H}`);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const fit = () => {
      const w = el.clientWidth, h = el.clientHeight;
      if (!w || !h) return;
      const a = w / h;
      if (a > VB_W / VB_H) { const nw = VB_H * a; setVb(`${((VB_W - nw) / 2).toFixed(2)} 0 ${nw.toFixed(2)} ${VB_H}`); }
      else { const nh = VB_W / a; setVb(`0 ${(VB_H - nh).toFixed(2)} ${VB_W} ${nh.toFixed(2)}`); }
    };
    fit();
    if (typeof ResizeObserver === 'undefined') { window.addEventListener('resize', fit); return () => window.removeEventListener('resize', fit); }
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return vb;
}

const TITLE = (
  <span style={{ display: 'block', lineHeight: .9, margin: '2px 0 2px' }}>
    <span style={{ display: 'block', fontSize: 27 }}>BOTTLE</span>
    <span style={{ display: 'block', fontSize: 34, marginTop: 1 }}>SPIN</span>
  </span>
);

export default function BottleGame({ onClose, closing, balance = 0, onSpend, onRound }) {
  const [stake, setStake] = useState(() => affordable(readLast(), balance));
  const [phase, setPhase] = useState('idle');   // 'idle' | 'spinning' | 'result'
  const [won, setWon] = useState(false);
  const [resultIdx, setResultIdx] = useState(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [cel, setCel] = useState(null);         // win celebration { payout, added }
  const pillRef = useRef(null);

  const sceneRef = useRef(null);
  const svgRef = useRef(null);
  const viewBox = useFitViewBox(sceneRef);
  const rigRef = useRef(null);
  const angleRef = useRef(IDLE_PHI);
  const rafRef = useRef(0);
  const timers = useRef([]);
  const flyingRef = useRef(false);
  const pendingRef = useRef(null);
  const onRoundRef = useRef(onRound);
  onRoundRef.current = onRound;

  const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.current.push(t); return t; };
  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  const stopAnim = () => { cancelAnimationFrame(rafRef.current); rafRef.current = 0; };

  useEffect(() => {
    try { setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { /* old browser */ }
  }, []);

  // Rig the scene once and pose the idle bottle before the first paint.
  useLayoutEffect(() => {
    const R = makeRig(svgRef.current);
    rigRef.current = R;
    render(R, angleRef.current);
  }, []);

  // After a loss the selected stake may no longer be affordable — step down
  useEffect(() => {
    if (phase !== 'spinning') setStake(s => affordable(s, balance));
  }, [balance, phase]);

  // Refs only, so the unmount cleanup below never sees a stale closure.
  function fireRound() {
    const r = pendingRef.current;
    pendingRef.current = null;
    if (r) onRoundRef.current?.(r);
  }
  useEffect(() => () => { stopAnim(); clearTimers(); fireRound(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function toIdle() {
    clearTimers();
    const R = rigRef.current;
    if (R) { setResult(R, null); setStuds(R, 'idle'); }
    setPhase('idle'); setWon(false); setResultIdx(null);
  }

  function land(out) {
    const R = rigRef.current;
    flyingRef.current = false;
    setPhase('result');
    setWon(out.win);
    setResultIdx(out.index);
    if (R) { setResult(R, out.index, out.win); setStuds(R, out.win ? 'win' : 'lose'); }
    if (out.win) setCel({ payout: out.payout, added: 0 });
    fireRound();
    if (!out.win) later(toIdle, LOSE_RESET_MS);
  }

  const broke = balance < MIN_STAKE;
  const canSpin = stake <= balance && phase !== 'spinning' && !cel;
  const shownBalance = cel ? Math.max(0, balance - cel.payout + cel.added) : balance;

  const chooseStake = (s) => {
    if (flyingRef.current || cel || s > balance) return;
    setStake(s); saveLast(s);
    if (phase === 'result') toIdle();
  };

  const spin = () => {
    if (flyingRef.current || cel || stake > balance) return;
    flyingRef.current = true;
    const out = resolveSpin(stake);
    onSpend?.(stake);
    pendingRef.current = { stake, win: out.win, payout: out.payout };
    saveLast(stake);
    clearTimers();
    stopAnim();
    const R = rigRef.current;
    setResult(R, null);
    setStuds(R, 'spin');
    setPhase('spinning');
    setResultIdx(null);

    const plan = planSpin(angleRef.current, out.index);
    if (reduced) {
      R.bottle.style.transition = `opacity ${REDUCED_FADE_MS}ms`;
      R.bottle.style.opacity = '0';
      later(() => {
        angleRef.current = plan.end;
        render(R, plan.end);
        R.bottle.style.opacity = '1';
        later(() => land(out), REDUCED_FADE_MS + 80);
      }, REDUCED_FADE_MS);
      return;
    }
    const t0 = performance.now();
    let prevT = 0, prevPhi = plan.from;
    const step = (now) => {
      const t = Math.min(TOTAL_S, (now - t0) / 1000);
      const phi = angleAt(plan, t);
      const dt = t - prevT;
      const vel = dt > 0 ? (phi - prevPhi) / dt : 0;
      prevT = t; prevPhi = phi;
      angleRef.current = phi;
      render(R, phi, vel, t);
      if (t < TOTAL_S) rafRef.current = requestAnimationFrame(step);
      else { rafRef.current = 0; angleRef.current = plan.end; render(R, plan.end); land(out); }
    };
    rafRef.current = requestAnimationFrame(step);
  };

  const seg = resultIdx != null ? SEGMENTS[resultIdx] : null;
  let line;
  if (phase === 'spinning') line = <span style={{ color: CANDY.sub, fontSize: 17 }}>Spinning…</span>;
  else if (phase === 'result' && won) line = <span key="win" className="anim-scale-in" style={{ fontSize: 28, color: CANDY.gold, letterSpacing: 2, textShadow: `${outlineShadow(2, CANDY.outline, 3)}, 0 0 18px rgba(255,210,31,.8)` }}>WIN {seg?.label}</span>;
  else if (phase === 'result') line = <span key="lose" className="anim-scale-in" style={{ fontSize: 26, color: '#fff', letterSpacing: 2, textShadow: outlineShadow(2, CANDY.outline, 3) }}>LOSE</span>;
  else if (broke) line = <span style={{ fontSize: 17, color: '#FF8A80' }}>Not enough coins</span>;
  else line = <span style={{ fontSize: 17, color: CANDY.sub }}>Bigger prizes come up less often</span>;

  return (
    <CandyScreen title={TITLE} balance={shownBalance} pillRef={pillRef} closing={closing} onClose={onClose} onHelp={() => setShowTutorial(true)}
      overlay={showTutorial && <TutorialModal tutorialKey="bottle" onClose={() => setShowTutorial(false)} />}>
      <style>{SCENE_CSS}</style>

      {/* the table — fills the height that is left */}
      <div ref={sceneRef} style={{
        position: 'relative', flex: 1, minHeight: 0, margin: '7px 0 3px', borderRadius: 18, overflow: 'hidden', background: '#2a0a4f',
        boxShadow: '0 0 0 2px rgba(255,210,31,.7), 0 0 0 4px rgba(42,10,79,.9), 0 6px 18px rgba(0,0,0,.45)',
      }}>
        <svg ref={svgRef} className="bt-svg" viewBox={viewBox} preserveAspectRatio="xMidYMid meet" role="img"
          aria-label={seg ? `The bottle points at ${seg.label}` : 'A bottle on a painted table: 1.2x, 1.5x, 2x, 3x, 4x and three TRY AGAIN'}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}>
          <defs><SceneDefs /><BottleDefs /></defs>
          <SceneBack />
          <Table />
          <BottleShadow />
          <Ghosts />
          <Bottle />
          <SceneFront />
        </svg>
        <div aria-hidden style={{ position: 'absolute', inset: 0, borderRadius: 18, pointerEvents: 'none', boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,.12), inset 0 0 22px rgba(10,0,30,.55)' }} />
      </div>

      {/* result line — fixed, compact height so nothing below shifts */}
      <div aria-live="polite" style={{ flex: 'none', height: 30, position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: CANDY.display, letterSpacing: .5, whiteSpace: 'nowrap' }}>
        {line}
      </div>

      <div style={{ flex: 'none' }}>
        <div role="group" aria-label="Stake" style={{ display: 'flex', gap: 7, marginBottom: 2 }}>
          {STAKES.map(s => (
            <CandyChip key={s} color={CHIP_COLORS[s]} disabled={s > balance}
              selected={stake === s} onClick={() => chooseStake(s)}>
              {s}
            </CandyChip>
          ))}
        </div>

        <CandyButton color="green" big disabled={!canSpin} onClick={spin} style={{ width: '100%', minHeight: 66, gap: 2, marginBottom: 6, borderRadius: 18 }}>
          <span style={{ fontSize: 34, textShadow: canSpin ? `${textStroke(2.5, CANDY.outline)}, 0 4px 0 ${CANDY.outline}` : 'none' }}>SPIN</span>
          <span style={{ fontSize: 14, color: canSpin ? CANDY.gold : 'inherit', textShadow: canSpin ? `${textStroke(1.5, CANDY.outline)}, 0 2px 0 ${CANDY.outline}` : 'none', letterSpacing: 1 }}>✦ WIN UP TO {stake * MAX_MULT} ✦</span>
        </CandyButton>
      </div>

      {cel && (
        <WinCelebration payout={cel.payout} reduced={reduced} delay={PANEL_DELAY_MS} pillRef={pillRef}
          onTick={(added) => setCel(c => c && { ...c, added })} onDone={() => { setCel(null); toIdle(); }} />
      )}
    </CandyScreen>
  );
}
