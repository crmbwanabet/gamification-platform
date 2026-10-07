'use client';

import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import TutorialModal from '../../modals/TutorialModal';
import CandyScreen from '../candy/CandyScreen';
import CandyButton from '../candy/CandyButton';
import CandyChip from '../candy/CandyChip';
import WinCelebration from '../candy/WinCelebration';
import { CANDY, outlineShadow, textStroke } from '../candy/tokens';
import { resolvePick, payoutFor, STAKES, DEFAULT_STAKE } from '@/lib/pick6/engine.mjs';
import { BIRD_IDS } from '@/lib/chicken/birds.mjs';
import { CK, cid } from './shared/rig';
import { useFitViewBox } from './shared/fit';
import { YardDefs, YardBack, YardGround, YardOverlay, YARD_CSS } from './shared/Yard';
import Farmer, { FARMER_CSS } from './shared/Farmer';
import Chickens, { Shadows, CHICKEN_CSS } from './shared/Chickens';
import { Puffs, Effects } from './shared/Effects';
import { makeRig, render, setSelected, cluck, setGone, LAND_S, END_S, PANEL_S, STILL_T } from './motion';

// ============================================================================
// CHICKEN CATCH — stake-only (spec: docs/superpowers/specs/2026-10-06-chicken-catch-design.md).
// Pick a stake (1/10/25/50) and one of 6 birds in the yard (1.2x … 4x), tap
// CATCH. Win chance per bird = rtp × stake / payout (lib/pick6, crypto RNG), decided on
// the device at CATCH; the stake is charged right then via onSpend, and the
// result is reported when the farmer lands (onRound) so nothing spoils the
// chase. Exactly-once: the resolved round waits in pendingRef; fireRound()
// nulls it before calling onRound, and unmount (close mid-chase) flushes it.
// Double-charge guard: flyingRef locks CATCH from the tap until the landing.
// Win: the WinCelebration panel (YOU WON / count-up / COLLECT) pops in over the
// farmer's victory hold. The platform has ALREADY credited the payout via
// onRound; while the panel is up the pill shows the pre-win balance
// (balance - payout + coins collected so far) and COLLECT walks it up.
// Animation: motion.js renders the frame function into the SVG (rAF over t per
// round; one still frame for reduced motion). Picking a bird primes the farmer
// (a short rAF tween: he turns to it, locks his eyes on it, aims his hands);
// CATCH runs the side-scrolling chase (shared/camera.js parallax) and the
// result plays out where the chase ended; the next round is back in the yard.
// NOTE: STAKES are mirrored by stakeRange '1–50' in lib/data/platform.js and
// the tutorial prize lines in lib/data/tutorials.js — change all three together.
// ============================================================================

const LAST_KEY = 'chicken:last';
const CHIP_COLORS = { 1: 'violet', 10: 'blue', 25: 'red', 50: 'green' };
const MIN_STAKE = STAKES[0];
const REGROUP_MS = 220;         // actors fade out / in around a reset
const LOSE_RESET_MS = 2100;     // after a loss the yard resets on its own
const REDUCED_LAND_MS = 250;
const REDUCED_RESET_MS = 1900;
const AIM_MS = 260;             // the farmer primes on a newly picked bird

function readLast() {
  try {
    const v = JSON.parse(window.localStorage.getItem(LAST_KEY) || 'null');
    return {
      stake: STAKES.includes(v?.stake) ? v.stake : DEFAULT_STAKE,
      bird: BIRD_IDS.includes(v?.bird) ? BIRD_IDS.indexOf(v.bird) : null,
    };
  } catch (e) { return { stake: DEFAULT_STAKE, bird: null }; }
}
function saveLast(stake, bird) {
  try { window.localStorage.setItem(LAST_KEY, JSON.stringify({ stake, bird: bird == null ? null : BIRD_IDS[bird] })); } catch (e) { /* private mode */ }
}
// Remembered stake above the balance → highest affordable tier (else keep it; all disabled)
function affordable(stake, balance) {
  if (stake <= balance) return stake;
  const fit = STAKES.filter(s => s <= balance);
  return fit.length ? fit[fit.length - 1] : stake;
}

const TITLE = (
  <span style={{ display: 'block', lineHeight: .9, margin: '2px 0 2px' }}>
    <span style={{ display: 'block', fontSize: 27 }}>CHICKEN</span>
    <span style={{ display: 'block', fontSize: 34, marginTop: 1 }}>CATCH</span>
  </span>
);
const STATIC_CSS = YARD_CSS + FARMER_CSS + CHICKEN_CSS;

export default function ChickenGame({ onClose, closing, balance = 0, rtp, onSpend, onRound }) {
  const [init] = useState(readLast);
  const [stake, setStake] = useState(() => affordable(init.stake, balance));
  const [pick, setPick] = useState(init.bird);  // bird index or null
  const [phase, setPhase] = useState('idle');   // 'idle' | 'chase' | 'result'
  const [won, setWon] = useState(false);        // last round's result (for the line)
  const [showTutorial, setShowTutorial] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [cel, setCel] = useState(null);         // win celebration { payout, added }
  const pillRef = useRef(null);

  const sceneRef = useRef(null);
  const svgRef = useRef(null);
  const viewBox = useFitViewBox(sceneRef);
  const rigRef = useRef(null);
  const rafRef = useRef(0);
  const timers = useRef([]);
  const flyingRef = useRef(false);
  const pendingRef = useRef(null);
  const pickRef = useRef(pick);
  pickRef.current = pick;
  const onRoundRef = useRef(onRound);
  onRoundRef.current = onRound;

  const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.current.push(t); return t; };
  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  const stopAnim = () => { cancelAnimationFrame(rafRef.current); rafRef.current = 0; };

  useEffect(() => {
    try { setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { /* old browser */ }
  }, []);

  // Rig the scene once and show the idle yard before the first paint.
  useLayoutEffect(() => {
    const R = makeRig(svgRef.current);
    rigRef.current = R;
    render(R, 0, pickRef.current);
    setSelected(R, pickRef.current);
    return () => clearTimeout(R.cluckT);
  }, []);

  useLayoutEffect(() => { if (rigRef.current) setSelected(rigRef.current, pick); }, [pick]);
  // Idle frame; a new pick tweens the farmer from his rest stance to primed on it.
  const aimFrom = useRef(pick);
  useLayoutEffect(() => {
    const R = rigRef.current;
    if (phase !== 'idle' || !R) return undefined;
    const fresh = aimFrom.current !== pick;
    aimFrom.current = pick;
    if (!fresh || reduced || pick == null) { render(R, 0, pick); return undefined; }
    let raf = 0;
    const t0 = performance.now();
    const step = (now) => {
      const u = Math.min(1, (now - t0) / AIM_MS);
      render(R, 0, pick, false, 1, { aim: u * u * (3 - 2 * u) });
      if (u < 1) raf = requestAnimationFrame(step);
    };
    render(R, 0, pick, false, 1, { aim: 0 });
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [phase, pick, reduced]);

  // After a loss the selected stake may no longer be affordable — step down
  useEffect(() => {
    if (phase !== 'chase') setStake(s => affordable(s, balance));
  }, [balance, phase]);

  // Refs only, so the unmount cleanup below never sees a stale closure.
  function fireRound() {
    const r = pendingRef.current;
    pendingRef.current = null;
    if (r) onRoundRef.current?.(r);
  }
  useEffect(() => () => { stopAnim(); clearTimers(); fireRound(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Back to the idle yard: actors fade out, everyone resets, fade back in.
  function regroup(then) {
    clearTimers();
    stopAnim();
    const R = rigRef.current;
    const reset = () => { setPhase('idle'); setWon(false); then?.(); };
    if (reduced || !R) { reset(); return; }
    setGone(R, true);
    later(() => { render(R, 0, pickRef.current); setGone(R, false); reset(); }, REGROUP_MS);
  }

  function startRound(round, delay) {
    const R = rigRef.current;
    const seed = 2 + Math.floor(Math.random() * 1e6); // chase layout only — not the result
    const kind = round.win ? 'win' : 'lose';
    const land = () => {
      flyingRef.current = false;
      setPhase('result');
      setWon(round.win);
      if (round.win) setCel({ payout: round.payout, added: 0 });
      fireRound();
      if (!round.win) later(() => regroup(), reduced ? REDUCED_RESET_MS : LOSE_RESET_MS);
    };
    if (reduced) {
      render(R, STILL_T, round.pick, round.win, seed, { still: true });
      later(land, REDUCED_LAND_MS);
      return;
    }
    const go = () => {
      setGone(R, false);
      const t0 = performance.now(), end = END_S[kind];
      const step = (now) => {
        const t = (now - t0) / 1000;
        render(R, Math.min(t, end), round.pick, round.win, seed);
        rafRef.current = t < end ? requestAnimationFrame(step) : 0;
      };
      render(R, 0.001, round.pick, round.win, seed);
      rafRef.current = requestAnimationFrame(step);
      later(land, LAND_S[kind] * 1000);
    };
    if (delay) { setGone(R, true); later(go, delay); } else go();
  }

  const broke = balance < MIN_STAKE;
  const bird = pick != null ? CK[pick] : null;
  const canCatch = !!bird && stake <= balance && phase !== 'chase' && !cel;
  const shownBalance = cel ? Math.max(0, balance - cel.payout + cel.added) : balance;

  const chooseStake = (s) => {
    if (flyingRef.current || cel || s > balance) return;
    setStake(s); saveLast(s, pick);
    if (phase === 'result') regroup();
  };
  const chooseBird = (i) => {
    if (flyingRef.current || cel) return;
    setPick(i); saveLast(stake, i);
    if (phase === 'result') regroup(() => { if (rigRef.current) cluck(rigRef.current, i); });
    else if (rigRef.current) cluck(rigRef.current, i);
  };

  const catchIt = () => {
    if (flyingRef.current || cel || !bird || stake > balance) return;
    flyingRef.current = true;
    const out = resolvePick(stake, bird.mult, undefined, rtp);
    onSpend?.(stake);
    pendingRef.current = { stake, win: out.win, payout: out.payout };
    const fromResult = phase === 'result';
    clearTimers();
    stopAnim();
    setPhase('chase');
    startRound({ pick, win: out.win, payout: out.payout }, fromResult && !reduced ? REGROUP_MS : 0);
  };

  let line;
  if (phase === 'chase') line = <span style={{ color: CANDY.sub, fontSize: 17 }}>Catch it!</span>;
  else if (phase === 'result' && won) line = <span key="win" className="anim-scale-in" style={{ fontSize: 28, color: CANDY.gold, letterSpacing: 2, textShadow: `${outlineShadow(2, CANDY.outline, 3)}, 0 0 18px rgba(255,210,31,.8)` }}>WIN</span>;
  else if (phase === 'result') line = <span key="lose" className="anim-scale-in" style={{ fontSize: 26, color: '#fff', letterSpacing: 2, textShadow: outlineShadow(2, CANDY.outline, 3) }}>LOSE</span>;
  else if (broke) line = <span style={{ fontSize: 17, color: '#FF8A80' }}>Not enough coins</span>;
  else if (!bird) line = <span style={{ fontSize: 17, color: CANDY.sub }}>Pick a chicken</span>;
  else line = <span style={{ fontSize: 17, color: CANDY.sub }}>{bird.name} · {bird.m}x</span>;

  const caption = bird ? `✦ WIN ${payoutFor(stake, bird.mult)} ✦` : '✦ PICK A CHICKEN ✦';

  return (
    <CandyScreen title={TITLE} balance={shownBalance} pillRef={pillRef} closing={closing} onClose={onClose} onHelp={() => setShowTutorial(true)}
      overlay={showTutorial && <TutorialModal tutorialKey="chicken" onClose={() => setShowTutorial(false)} />}>
      <style>{STATIC_CSS}</style>

      {/* the yard — fills the height that is left */}
      <div ref={sceneRef} style={{
        position: 'relative', flex: 1, minHeight: 0, margin: '7px 0 3px', borderRadius: 18, overflow: 'hidden', background: '#2a0a4f',
        boxShadow: '0 0 0 2px rgba(255,210,31,.7), 0 0 0 4px rgba(42,10,79,.9), 0 6px 18px rgba(0,0,0,.45)',
      }}>
        <svg ref={svgRef} className="ck-svg" viewBox={viewBox} preserveAspectRatio="xMidYMid meet" role="group" aria-label="Pick a chicken to catch"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}>
          <defs><YardDefs /></defs>
          <YardBack />
          <g id={cid('worldB')}><g className="ck-back" /></g>
          <YardGround />
          <g id={cid('world')}>
            <Shadows />
            <Puffs />
            <g className="ck-actors">
              <Farmer />
              <Chickens selected={pick} onPick={chooseBird} />
            </g>
            <Effects />
          </g>
          <YardOverlay />
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

        <CandyButton color="green" big disabled={!canCatch} onClick={catchIt} style={{ width: '100%', minHeight: 66, gap: 2, marginBottom: 6, borderRadius: 18 }}>
          <span style={{ fontSize: 34, textShadow: canCatch ? `${textStroke(2.5, CANDY.outline)}, 0 4px 0 ${CANDY.outline}` : 'none' }}>CATCH</span>
          <span style={{ fontSize: 14, color: canCatch ? CANDY.gold : 'inherit', textShadow: canCatch ? `${textStroke(1.5, CANDY.outline)}, 0 2px 0 ${CANDY.outline}` : 'none', letterSpacing: 1 }}>{caption}</span>
        </CandyButton>
      </div>

      {cel && (
        <WinCelebration payout={cel.payout} reduced={reduced} delay={Math.round((PANEL_S - LAND_S.win) * 1000)} pillRef={pillRef}
          onTick={(added) => setCel(c => c && { ...c, added })} onDone={() => { setCel(null); regroup(); }} />
      )}
    </CandyScreen>
  );
}
