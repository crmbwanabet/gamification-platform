'use client';

import React, { useState, useRef, useEffect, useLayoutEffect, useMemo } from 'react';
import TutorialModal from '../../modals/TutorialModal';
import CandyScreen from '../candy/CandyScreen';
import CandyButton from '../candy/CandyButton';
import CandyChip from '../candy/CandyChip';
import WinCelebration from '../candy/WinCelebration';
import { CANDY, outlineShadow, textStroke } from '../candy/tokens';
import { resolvePick, payoutFor, STAKES } from '@/lib/pick6/engine.mjs';
import { SPOTS, SPOT_IDS } from '@/lib/penalty/spots.mjs';
import { SceneDefs, Stadium, GoalNet, GoalFrame, SCENE_CSS } from './Scene';
import Keeper, { KEEPER_CSS } from './Keeper';
import Ball, { BallShadow, BallGhosts } from './Ball';
import { Pocket, Pow, Confetti, Sparks } from './Effects';
import Spots, { SpotDefs, SPOTS_CSS } from './Spots';
import { END, LAND_S, SETTLE_S, frameAt, frameCss, idleCss, roundCss } from './motion';

// ============================================================================
// PENALTY CRASH — stake-only (spec: docs/superpowers/specs/2026-10-01-penalty-crash-design.md).
// Pick a stake (10/20/30/50) and one of 6 spots on the goal (1.2x … 4x), tap
// KICK. Win chance per spot = 0.95 / mult (lib/pick6, crypto RNG), decided on
// the device at KICK; the stake is charged right then via onSpend, and the win
// is reported when the ball lands via onRound so nothing spoils the reveal.
// Exactly-once: the resolved round waits in pendingRef; fireRound() nulls it
// before calling onRound, and unmount (close mid-kick) flushes it.
// Double-charge guard: flyingRef locks KICK from the tap until the ball lands.
// Win: the WinCelebration panel (YOU WON / count-up / COLLECT) covers the game
// once the result lands. The platform has ALREADY credited the payout via
// onRound; while the panel is up the pill shows the pre-win balance
// (balance - payout + coins collected so far) and COLLECT walks it up.
// (No in-scene "+payout" float — the panel is the star.)
// Animation: motion.js turns the frame function into CSS @keyframes per round.
// NOTE: STAKES are mirrored by stakeRange '10–50' in lib/data/platform.js and
// the tutorial prize lines in lib/data/tutorials.js — change all three together.
// ============================================================================

const LAST_KEY = 'penalty:last';
const CHIP_COLORS = { 10: 'violet', 20: 'blue', 30: 'red', 50: 'green' };
const MIN_STAKE = STAKES[0];
const REDUCED_LAND_MS = 250;
const REDUCED_SETTLE_MS = 900;
const VB_W = 300, VB_H = 306;

function readLast() {
  try {
    const v = JSON.parse(window.localStorage.getItem(LAST_KEY) || 'null');
    return {
      stake: STAKES.includes(v?.stake) ? v.stake : MIN_STAKE,
      spot: SPOT_IDS.includes(v?.spot) ? v.spot : null,
    };
  } catch (e) { return { stake: MIN_STAKE, spot: null }; }
}
function saveLast(stake, spot) {
  try { window.localStorage.setItem(LAST_KEY, JSON.stringify({ stake, spot })); } catch (e) { /* private mode */ }
}
// Remembered stake above the balance → highest affordable tier (else keep it; all disabled)
function affordable(stake, balance) {
  if (stake <= balance) return stake;
  const fit = STAKES.filter(s => s <= balance);
  return fit.length ? fit[fit.length - 1] : stake;
}

// Fit the viewBox to the scene box: widen (more stands) or heighten (more roof)
// — never crop the play area.
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
    <span style={{ display: 'block', fontSize: 27 }}>PENALTY </span>
    <span style={{ display: 'block', fontSize: 34, marginTop: 1 }}>CRASH</span>
  </span>
);
const STATIC_CSS = SCENE_CSS + KEEPER_CSS + SPOTS_CSS;

export default function PenaltyGame({ onClose, closing, balance = 0, onSpend, onRound }) {
  const [init] = useState(readLast);
  const [stake, setStake] = useState(() => affordable(init.stake, balance));
  const [spot, setSpot] = useState(init.spot);
  const [phase, setPhase] = useState('idle');   // 'idle' | 'kicking' | 'result'
  const [outcome, setOutcome] = useState(null); // { spot (index), win, payout }
  const [round, setRound] = useState(0);
  const [settled, setSettled] = useState(false); // spots back after a round
  const [showTutorial, setShowTutorial] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [cel, setCel] = useState(null);         // win celebration { payout, added }
  const pillRef = useRef(null);

  const sceneRef = useRef(null);
  const viewBox = useFitViewBox(sceneRef);
  const flyingRef = useRef(false);
  const pendingRef = useRef(null);
  const onRoundRef = useRef(onRound);
  onRoundRef.current = onRound;

  useEffect(() => {
    try { setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { /* old browser */ }
  }, []);

  // After a loss the selected stake may no longer be affordable — step down
  useEffect(() => {
    if (phase !== 'kicking') setStake(s => affordable(s, balance));
  }, [balance, phase]);

  // Refs only, so the unmount cleanup below never sees a stale closure.
  function fireRound() {
    const r = pendingRef.current;
    pendingRef.current = null;
    if (r) onRoundRef.current?.(r);
  }
  useEffect(() => () => fireRound(), []); // eslint-disable-line react-hooks/exhaustive-deps

  // Ball lands → result line + onRound; later the spots fade back in.
  useEffect(() => {
    if (phase !== 'kicking') return undefined;
    const land = setTimeout(() => {
      flyingRef.current = false;
      setPhase('result');
      const r = pendingRef.current;
      if (r?.win) setCel({ payout: r.payout, added: 0 });
      fireRound();
    }, reduced ? REDUCED_LAND_MS : LAND_S * 1000);
    return () => clearTimeout(land);
  }, [phase, round, reduced]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!round) return undefined;
    setSettled(false);
    const t = setTimeout(() => setSettled(true), reduced ? REDUCED_SETTLE_MS : SETTLE_S * 1000);
    return () => clearTimeout(t);
  }, [round, reduced]);

  const broke = balance < MIN_STAKE;
  const sel = SPOTS.find(s => s.id === spot) || null;
  const canKick = !!sel && stake <= balance && phase !== 'kicking' && !cel;
  const shownBalance = cel ? Math.max(0, balance - cel.payout + cel.added) : balance;

  const chooseStake = (s) => { if (flyingRef.current || s > balance) return; setStake(s); saveLast(s, spot); };
  const chooseSpot = (id) => {
    if (flyingRef.current) return;
    setSpot(id); saveLast(stake, id);
    setPhase('idle'); setOutcome(null);
  };

  const kick = () => {
    if (flyingRef.current || cel || !sel || stake > balance) return;
    flyingRef.current = true;
    const out = resolvePick(stake, sel.mult);
    onSpend?.(stake);
    pendingRef.current = { stake, win: out.win, payout: out.payout };
    setOutcome({ spot: SPOTS.indexOf(sel), win: out.win, payout: out.payout });
    setRound(n => n + 1);
    setPhase('kicking');
  };

  // Scene state as CSS: idle frame, a round's keyframes, or the reduced-motion end frame.
  const sceneCss = useMemo(() => {
    if (phase === 'idle' || !outcome) return idleCss();
    if (reduced) return frameCss(frameAt(1.25, outcome.spot, outcome.win, { noConfetti: true, spotsBack: settled ? .9 : 0 }));
    return frameCss(frameAt(END, outcome.spot, outcome.win)) + roundCss(outcome.spot, outcome.win, round % 2 ? 'pka' : 'pkb');
  }, [phase, outcome, reduced, settled, round]);

  const won = phase === 'result' && outcome?.win;
  let line;
  if (phase === 'kicking') line = <span style={{ color: CANDY.sub, fontSize: 17 }}>Shooting…</span>;
  else if (won) line = <span key="win" className="anim-scale-in" style={{ fontSize: 28, color: CANDY.gold, letterSpacing: 2, textShadow: `${outlineShadow(2, CANDY.outline, 3)}, 0 0 18px rgba(255,210,31,.8)` }}>WIN</span>;
  else if (phase === 'result') line = <span key="lose" className="anim-scale-in" style={{ fontSize: 26, color: '#fff', letterSpacing: 2, textShadow: outlineShadow(2, CANDY.outline, 3) }}>LOSE</span>;
  else if (broke) line = <span style={{ fontSize: 17, color: '#FF8A80' }}>Not enough coins</span>;
  else if (!sel) line = <span style={{ fontSize: 17, color: CANDY.sub }}>Pick a spot</span>;
  else line = <span style={{ fontSize: 17, color: CANDY.sub }}>{sel.label} · {sel.mult}x</span>;

  const caption = sel ? `✦ WIN ${payoutFor(stake, sel.mult)} ✦` : '✦ PICK A SPOT ✦';
  const spotsLocked = phase === 'kicking' || (phase === 'result' && !settled);

  return (
    <CandyScreen title={TITLE} balance={shownBalance} pillRef={pillRef} closing={closing} onClose={onClose} onHelp={() => setShowTutorial(true)}
      overlay={showTutorial && <TutorialModal tutorialKey="penalty" onClose={() => setShowTutorial(false)} />}>
      <style>{STATIC_CSS}</style>
      <style>{sceneCss}</style>

      {/* the pitch — fills the height that is left */}
      <div ref={sceneRef} style={{
        position: 'relative', flex: 1, minHeight: 0, margin: '7px 0 3px', borderRadius: 18, overflow: 'hidden', background: '#1a0838',
        boxShadow: '0 0 0 2px rgba(255,210,31,.7), 0 0 0 4px rgba(42,10,79,.9), 0 6px 18px rgba(0,0,0,.45)',
      }}>
        <svg className="pk-svg" viewBox={viewBox} preserveAspectRatio="xMidYMid meet" role="group" aria-label="Pick a spot on the goal"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}>
          <SceneDefs />
          <SpotDefs />
          <Stadium />
          <GoalNet />
          <Pocket />
          <GoalFrame />
          <Keeper bob={phase === 'idle' && !reduced} />
          <BallShadow />
          <Spots selected={spot} onPick={chooseSpot} disabled={spotsLocked} />
          {/* effects above the spots never take taps (opacity 0 still hit-tests) */}
          <g style={{ pointerEvents: 'none' }}>
            <BallGhosts />
            <Pow />
            <Ball />
            <Confetti />
            <Sparks />
          </g>
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

        <CandyButton color="green" big disabled={!canKick} onClick={kick} style={{ width: '100%', minHeight: 66, gap: 2, marginBottom: 6, borderRadius: 18 }}>
          <span style={{ fontSize: 34, textShadow: canKick ? `${textStroke(2.5, CANDY.outline)}, 0 4px 0 ${CANDY.outline}` : 'none' }}>KICK</span>
          <span style={{ fontSize: 14, color: canKick ? CANDY.gold : 'inherit', textShadow: canKick ? `${textStroke(1.5, CANDY.outline)}, 0 2px 0 ${CANDY.outline}` : 'none', letterSpacing: 1 }}>{caption}</span>
        </CandyButton>
      </div>

      {cel && (
        <WinCelebration payout={cel.payout} reduced={reduced} delay={650} pillRef={pillRef}
          onTick={(added) => setCel(c => c && { ...c, added })} onDone={() => setCel(null)} />
      )}
    </CandyScreen>
  );
}
