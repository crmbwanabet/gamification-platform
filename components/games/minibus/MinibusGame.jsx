'use client';

import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import TutorialModal from '../../modals/TutorialModal';
import CandyScreen from '../candy/CandyScreen';
import CandyButton from '../candy/CandyButton';
import CandyChip from '../candy/CandyChip';
import WinCelebration from '../candy/WinCelebration';
import { CANDY, outlineShadow, textStroke } from '../candy/tokens';
import { resolvePick, payoutFor, STAKES, DEFAULT_STAKE } from '@/lib/pick6/engine.mjs';
import { PASSENGERS, PASSENGER_IDS } from '@/lib/minibus/passengers.mjs';
import { VB_W, VB_H } from './kit';
import { StreetDefs, StreetBack, StreetFront, Cast, Effects, StreetOverlay, STREET_CSS } from './Street';
import { makeRig, render, setSelected, setMoving, setGone, wave, stopWave, LAND_S, END_S, PANEL_S, STILL_T } from './motion';

// ============================================================================
// LUCKY MINIBUS — stake-only (spec: docs/superpowers/specs/2026-10-07-lucky-minibus-design.md).
// Pick a stake (1/10/25/50) and one of 6 passengers at the bus stop (1.2x … 4x),
// tap BOARD. Your call boy races the rival call boys to the passenger: win and
// he grabs the luggage and the passenger hops into your blue minibus; lose and
// the rival takes them off in the white one.
// Win chance per passenger = rtp × stake / payout (lib/pick6, crypto RNG), decided on the
// device at BOARD; the stake is charged right then via onSpend, and the result
// is reported when the race lands (onRound) so nothing spoils the scramble.
// Exactly-once: the resolved round waits in pendingRef; fireRound() nulls it
// before calling onRound, and unmount (close mid-scramble) flushes it.
// Double-charge guard: busyRef locks BOARD from the tap until the landing.
// Win: the WinCelebration panel (YOU WON / count-up / COLLECT) pops in over the
// win frame. The platform has ALREADY credited the payout via onRound; while
// the panel is up the pill shows the pre-win balance (balance - payout + coins
// collected so far) and COLLECT walks it up.
// Animation: motion.js renders the mock's frame function into the SVG (rAF over
// t per round; one still frame for reduced motion).
// NOTE: STAKES are mirrored by stakeRange '1–50' in lib/data/platform.js and
// the tutorial prize lines in lib/data/tutorials.js — change all three together.
// ============================================================================

const LAST_KEY = 'minibus:last';
const CHIP_COLORS = { 1: 'violet', 10: 'blue', 25: 'red', 50: 'green' };
const MIN_STAKE = STAKES[0];
const REGROUP_MS = 240;         // actors fade out / in around a reset
const LOSE_RESET_MS = 2000;     // after a loss the stop resets on its own
const REDUCED_LAND_MS = 250;
const REDUCED_RESET_MS = 1900;

function readLast() {
  try {
    const v = JSON.parse(window.localStorage.getItem(LAST_KEY) || 'null');
    return {
      stake: STAKES.includes(v?.stake) ? v.stake : DEFAULT_STAKE,
      pick: PASSENGER_IDS.includes(v?.passenger) ? PASSENGER_IDS.indexOf(v.passenger) : null,
    };
  } catch (e) { return { stake: DEFAULT_STAKE, pick: null }; }
}
function saveLast(stake, pick) {
  try { window.localStorage.setItem(LAST_KEY, JSON.stringify({ stake, passenger: pick == null ? null : PASSENGER_IDS[pick] })); } catch (e) { /* private mode */ }
}
// Remembered stake above the balance → highest affordable tier (else keep it; all disabled)
function affordable(stake, balance) {
  if (stake <= balance) return stake;
  const fit = STAKES.filter(s => s <= balance);
  return fit.length ? fit[fit.length - 1] : stake;
}

// Fit the viewBox to the scene box: widen (more street) or heighten (more sky).
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
    <span style={{ display: 'block', fontSize: 27 }}>LUCKY</span>
    <span style={{ display: 'block', fontSize: 34, marginTop: 1 }}>MINIBUS</span>
  </span>
);

export default function MinibusGame({ onClose, closing, balance = 0, rtp, onSpend, onRound }) {
  const [init] = useState(readLast);
  const [stake, setStake] = useState(() => affordable(init.stake, balance));
  const [pick, setPick] = useState(init.pick);  // passenger index or null
  const [phase, setPhase] = useState('idle');   // 'idle' | 'run' | 'result'
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
  const busyRef = useRef(false);
  const pendingRef = useRef(null);
  const pickRef = useRef(pick);
  pickRef.current = pick;
  const phaseRef = useRef(phase);
  phaseRef.current = phase;
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;
  const onRoundRef = useRef(onRound);
  onRoundRef.current = onRound;

  const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.current.push(t); return t; };
  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };
  const stopAnim = () => { cancelAnimationFrame(rafRef.current); rafRef.current = 0; };

  useEffect(() => {
    try { setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { /* old browser */ }
  }, []);
  useLayoutEffect(() => { svgRef.current?.classList.toggle('mb-rm', reduced); }, [reduced]);

  // Rig the scene once and show the idle stop before the first paint.
  useLayoutEffect(() => {
    const R = makeRig(svgRef.current);
    rigRef.current = R;
    render(R, 0, pickRef.current);
    setSelected(R, pickRef.current);
    return () => stopWave(R);
  }, []);

  useLayoutEffect(() => { if (rigRef.current) setSelected(rigRef.current, pick); }, [pick]);
  useLayoutEffect(() => { if (phase === 'idle' && rigRef.current) render(rigRef.current, 0, pick); }, [phase, pick]);

  // After a loss the selected stake may no longer be affordable — step down
  useEffect(() => {
    if (phase !== 'run') setStake(s => affordable(s, balance));
  }, [balance, phase]);

  // Refs only, so the unmount cleanup below never sees a stale closure.
  function fireRound() {
    const r = pendingRef.current;
    pendingRef.current = null;
    if (r) onRoundRef.current?.(r);
  }
  useEffect(() => () => { stopAnim(); clearTimers(); fireRound(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const waveAt = (i) => { if (rigRef.current) wave(rigRef.current, i, { reduced: reducedRef.current, isIdle: () => phaseRef.current === 'idle' && !busyRef.current }); };

  // Back to the idle stop: actors fade out, everyone resets, fade back in.
  function regroup(then) {
    clearTimers();
    stopAnim();
    const R = rigRef.current;
    const reset = () => { if (R) setMoving(R, false); setPhase('idle'); setWon(false); then?.(); };
    if (reduced || !R) { if (R) render(R, 0, pickRef.current); reset(); return; }
    setGone(R, true);
    later(() => { render(R, 0, pickRef.current); setGone(R, false); reset(); }, REGROUP_MS);
  }

  function startRound(round, delay) {
    const R = rigRef.current;
    const kind = round.win ? 'win' : 'lose';
    const land = () => {
      busyRef.current = false;
      setPhase('result');
      setWon(round.win);
      if (round.win) setCel({ payout: round.payout, added: 0 });
      fireRound();
      if (!round.win) later(() => regroup(), reduced ? REDUCED_RESET_MS : LOSE_RESET_MS);
    };
    if (reduced) {
      setMoving(R, true, round.pick);
      render(R, STILL_T[kind], round.pick, round.win, round.payout, { still: true });
      later(land, REDUCED_LAND_MS);
      return;
    }
    const go = () => {
      setGone(R, false);
      setMoving(R, true, round.pick);
      const t0 = performance.now(), end = END_S[kind];
      const step = (now) => {
        const t = (now - t0) / 1000;
        render(R, Math.min(t, end), round.pick, round.win, round.payout);
        rafRef.current = t < end ? requestAnimationFrame(step) : 0;
      };
      render(R, 0.001, round.pick, round.win, round.payout);
      rafRef.current = requestAnimationFrame(step);
      later(land, LAND_S[kind] * 1000);
    };
    if (delay) { setGone(R, true); later(() => { render(R, 0, round.pick); go(); }, delay); } else go();
  }

  const broke = balance < MIN_STAKE;
  const passenger = pick != null ? PASSENGERS[pick] : null;
  const canBoard = !!passenger && stake <= balance && phase !== 'run' && !cel;
  const shownBalance = cel ? Math.max(0, balance - cel.payout + cel.added) : balance;

  const chooseStake = (s) => {
    if (busyRef.current || cel || s > balance) return;
    setStake(s); saveLast(s, pick);
    if (phase === 'result') regroup();
  };
  const choosePassenger = (i) => {
    if (busyRef.current || cel) return;
    setPick(i); saveLast(stake, i);
    if (phase === 'result') regroup(() => waveAt(i));
    else waveAt(i);
  };

  const board = () => {
    if (busyRef.current || cel || !passenger || stake > balance) return;
    busyRef.current = true;
    const out = resolvePick(stake, passenger.mult, undefined, rtp);
    onSpend?.(stake);
    pendingRef.current = { stake, win: out.win, payout: out.payout };
    const fromResult = phase === 'result';
    clearTimers();
    stopAnim();
    if (rigRef.current) stopWave(rigRef.current);
    setPhase('run');
    startRound({ pick, win: out.win, payout: payoutFor(stake, passenger.mult) }, fromResult && !reduced ? REGROUP_MS : 0);
  };

  // Passenger taps / keys arrive on the scene's static markup (event delegation).
  const passengerAt = (e) => { const g = e.target.closest?.('.mb-pa'); return g ? Number(g.getAttribute('data-i')) : null; };
  const onSceneClick = (e) => { const i = passengerAt(e); if (i != null) choosePassenger(i); };
  const onSceneKey = (e) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const i = passengerAt(e); if (i == null) return;
    e.preventDefault(); choosePassenger(i);
  };

  let line;
  if (phase === 'run') line = <span style={{ color: CANDY.sub, fontSize: 17 }}>Call them in!</span>;
  else if (phase === 'result' && won) line = <span key="win" className="anim-scale-in" style={{ fontSize: 28, color: CANDY.gold, letterSpacing: 2, textShadow: `${outlineShadow(2, CANDY.outline, 3)}, 0 0 18px rgba(255,210,31,.8)` }}>WIN</span>;
  else if (phase === 'result') line = <span key="lose" className="anim-scale-in" style={{ fontSize: 26, color: '#fff', letterSpacing: 2, textShadow: outlineShadow(2, CANDY.outline, 3) }}>LOSE</span>;
  else if (broke) line = <span style={{ fontSize: 17, color: '#FF8A80' }}>Not enough coins</span>;
  else if (!passenger) line = <span style={{ fontSize: 17, color: CANDY.sub }}>Pick a passenger</span>;
  else line = <span style={{ fontSize: 17, color: CANDY.sub }}>{passenger.name} · {passenger.mult}x</span>;

  const caption = passenger ? `✦ WIN ${payoutFor(stake, passenger.mult)} ✦` : '✦ PICK A PASSENGER ✦';

  return (
    <CandyScreen title={TITLE} balance={shownBalance} pillRef={pillRef} closing={closing} onClose={onClose} onHelp={() => setShowTutorial(true)}
      overlay={showTutorial && <TutorialModal tutorialKey="minibus" onClose={() => setShowTutorial(false)} />}>
      <style>{STREET_CSS}</style>

      {/* the bus stop — fills the height that is left */}
      <div ref={sceneRef} style={{
        position: 'relative', flex: 1, minHeight: 0, margin: '7px 0 3px', borderRadius: 18, overflow: 'hidden', background: '#2a0a4f',
        boxShadow: '0 0 0 2px rgba(255,210,31,.7), 0 0 0 4px rgba(42,10,79,.9), 0 6px 18px rgba(0,0,0,.45)',
      }}>
        <svg ref={svgRef} className="mb-svg" viewBox={viewBox} preserveAspectRatio="xMidYMid meet" role="group" aria-label="Pick a passenger to call into your minibus"
          onClick={onSceneClick} onKeyDown={onSceneKey}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}>
          <StreetDefs />
          <StreetBack />
          <StreetFront />
          <Cast />
          <Effects />
          <StreetOverlay />
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

        <CandyButton color="green" big disabled={!canBoard} onClick={board} style={{ width: '100%', minHeight: 66, gap: 2, marginBottom: 6, borderRadius: 18 }}>
          <span style={{ fontSize: 34, textShadow: canBoard ? `${textStroke(2.5, CANDY.outline)}, 0 4px 0 ${CANDY.outline}` : 'none' }}>BOARD</span>
          <span style={{ fontSize: 14, color: canBoard ? CANDY.gold : 'inherit', textShadow: canBoard ? `${textStroke(1.5, CANDY.outline)}, 0 2px 0 ${CANDY.outline}` : 'none', letterSpacing: 1 }}>{caption}</span>
        </CandyButton>
      </div>

      {cel && (
        <WinCelebration payout={cel.payout} reduced={reduced} delay={Math.round((PANEL_S - LAND_S.win) * 1000)} pillRef={pillRef}
          onTick={(added) => setCel(c => c && { ...c, added })} onDone={() => { setCel(null); regroup(); }} />
      )}
    </CandyScreen>
  );
}
