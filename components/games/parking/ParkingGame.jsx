'use client';

import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import TutorialModal from '../../modals/TutorialModal';
import CandyScreen from '../candy/CandyScreen';
import CandyButton from '../candy/CandyButton';
import CandyChip from '../candy/CandyChip';
import WinCelebration from '../candy/WinCelebration';
import { CANDY, outlineShadow, textStroke } from '../candy/tokens';
import { payoutFor, STAKES, DEFAULT_STAKE } from '@/lib/pick6/engine.mjs';
import { BAYS, BAY_IDS, playBay, multLabel } from '@/lib/parking/bays.mjs';
import Car from './Car';
import { SceneDefs, Backdrop, Bay, SCENE_CSS, VB_W, VB_H, bayCentre, YOU_START, TAXI_START } from './Scene';

// ============================================================================
// STREET PARKING — stake-only, plays EXACTLY like Penalty Crash (same 6
// multipliers, same shared pick6 engine; see lib/parking/bays.mjs).
// Pick a bay (×1.2 … ×4), pick a stake (1/10/25/50), tap PARK. Win chance per
// bay = rtp × stake / half-up payout (crypto RNG), decided on the device at
// PARK; the stake is charged right then via onSpend and the round is reported
// via onRound once the cars arrive, so nothing spoils the race.
// Your red car and a rival taxi race for the spots: on a win you park and the
// taxi takes another bay (WinCelebration panel + "PARKED AT ×N" ribbon); on a
// loss the taxi takes YOUR bay, your car stops short and the panel reads
// only "YOU ARE LATE!".
// Exactly-once: the resolved round waits in pendingRef; fireRound() nulls it
// before calling onRound, and unmount (close mid-race) flushes it.
// Double-charge guard: busyRef locks PARK from the tap until the cars arrive.
// While the win panel is up the pill shows balance - payout + coins collected
// so far (the platform already credited the payout) and COLLECT walks it up.
// NOTE: STAKES come from lib/pick6 (mirrored by stakeRange '1–50' in
// lib/data/platform.js and the tutorial lines in lib/data/tutorials.js).
// ============================================================================

const LAST_KEY = 'parking:last';
const CHIP_COLORS = { 1: 'violet', 10: 'blue', 25: 'red', 50: 'green' };
const MIN_STAKE = STAKES[0];
const ARRIVE_MS = 1250;          // longest car animation (late: 1s + .18s delay)
const REDUCED_ARRIVE_MS = 300;
const HELP = 'Pick a spot. Far spots win more, but another car may get there first.';

const CAR_CSS = `
  .pkp-mv-in { animation: pkpMvIn .95s cubic-bezier(.4,0,.2,1) both; }
  .pkp-rt-in { animation: pkpRtIn .95s cubic-bezier(.4,0,.2,1) both; }
  @keyframes pkpMvIn { 0% { transform: translate(var(--dx), var(--dy)); } 55% { transform: translate(0px, var(--mid)); } 100% { transform: translate(0px, 0px); } }
  @keyframes pkpRtIn { 0% { transform: rotate(var(--rot)); } 55% { transform: rotate(var(--end)); } 100% { transform: rotate(var(--end)); } }
  .pkp-mv-late { animation: pkpMvLate 1s cubic-bezier(.4,0,.2,1) both; }
  .pkp-rt-late { animation: pkpRtLate 1s cubic-bezier(.4,0,.2,1) both; }
  @keyframes pkpMvLate { 0% { transform: translate(var(--dx), var(--dy)); } 75% { transform: translate(0px, var(--short)); } 88% { transform: translate(-3px, var(--short)); } 100% { transform: translate(0px, var(--short)); } }
  @keyframes pkpRtLate { 0% { transform: rotate(var(--rot)); } 75% { transform: rotate(var(--end)); } 88% { transform: rotate(var(--wob)); } 100% { transform: rotate(var(--end)); } }
  .pkp-pop { animation: pkpPop .35s cubic-bezier(.2,1.6,.4,1) both; }
  @keyframes pkpPop { from { transform: scale(.6); opacity: 0; } to { transform: scale(1); opacity: 1; } }
  .pkp-rib { animation: pkpPop .35s cubic-bezier(.2,1.6,.4,1) .35s both; }
  @media (prefers-reduced-motion: reduce) {
    .pkp-mv-in, .pkp-rt-in, .pkp-mv-late, .pkp-rt-late, .pkp-pop, .pkp-rib { animation: none; }
  }
`;
const STATIC_CSS = SCENE_CSS + CAR_CSS;

function readLast() {
  try {
    const v = JSON.parse(window.localStorage.getItem(LAST_KEY) || 'null');
    const i = BAY_IDS.indexOf(v?.bay);
    return { stake: STAKES.includes(v?.stake) ? v.stake : DEFAULT_STAKE, bay: i >= 0 ? i : null };
  } catch (e) { return { stake: DEFAULT_STAKE, bay: null }; }
}
function saveLast(stake, bay) {
  try { window.localStorage.setItem(LAST_KEY, JSON.stringify({ stake, bay: bay == null ? null : BAY_IDS[bay] })); } catch (e) { /* private mode */ }
}
// Remembered stake above the balance → highest affordable tier (else keep it; all disabled)
function affordable(stake, balance) {
  if (stake <= balance) return stake;
  const fit = STAKES.filter(s => s <= balance);
  return fit.length ? fit[fit.length - 1] : stake;
}

// Fit the viewBox to the scene box, centred: widen (more street) or heighten
// (more shops / pavement); never crop the car park.
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
      else { const nh = VB_W / a; setVb(`0 ${((VB_H - nh) / 2).toFixed(2)} ${VB_W} ${nh.toFixed(2)}`); }
    };
    fit();
    if (typeof ResizeObserver === 'undefined') { window.addEventListener('resize', fit); return () => window.removeEventListener('resize', fit); }
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return vb;
}

// A car on the lot. mode 'idle' = waiting in the lane; 'in' = drives into its
// bay; 'late' = heads for the bay but stops short. The car is centred on (0,0)
// so the two nested groups translate, then rotate it about its middle, like
// the design's `translate(dx,dy) rotate(r)` keyframes. The inline transforms
// are the END state, so reduced motion (animation: none) shows it at once.
function CarSprite({ kind, at, mode, from, rot, end, top, delay = 0, tag }) {
  const moving = mode !== 'idle';
  const short = top ? 92 : -92;
  const mv = {
    '--dx': `${from ? from.x - at.x : 0}px`, '--dy': `${from ? from.y - at.y : 0}px`,
    '--mid': `${top ? 44 : -44}px`, '--short': `${short}px`,
    transform: mode === 'late' ? `translate(0px, ${short}px)` : 'translate(0px, 0px)',
    animationDelay: `${delay}s`,
  };
  const rt = {
    '--rot': `${rot}deg`, '--end': `${end}deg`, '--wob': `${end - 5}deg`,
    transform: `rotate(${moving ? end : rot}deg)`, animationDelay: `${delay}s`,
  };
  return (
    <g transform={`translate(${at.x} ${at.y})`}>
      <g className={moving ? `pkp-mv-${mode}` : undefined} style={mv}>
        <g className={moving ? `pkp-rt-${mode}` : undefined} style={rt}>
          <Car kind={kind} />
        </g>
        {tag && (
          <g>
            <rect x="-15" y="-34" width="30" height="14" rx="4" fill={CANDY.gold} stroke={CANDY.outline} strokeWidth="2" />
            <text x="0" y="-23.6" textAnchor="middle" fontSize="10" fontWeight="900" fill={CANDY.outline} style={{ fontFamily: CANDY.body }}>YOU</text>
          </g>
        )}
      </g>
    </g>
  );
}

const TITLE = (
  <span style={{ display: 'block', lineHeight: .9, margin: '2px 0 2px' }}>
    <span style={{ display: 'block', fontSize: 27 }}>STREET</span>
    <span style={{ display: 'block', fontSize: 34, marginTop: 1 }}>PARKING</span>
  </span>
);

export default function ParkingGame({ onClose, closing, balance = 0, rtp, onSpend, onRound }) {
  const [init] = useState(readLast);
  const [stake, setStake] = useState(() => affordable(init.stake, balance));
  const [bay, setBay] = useState(init.bay);
  const [phase, setPhase] = useState('idle');   // 'idle' | 'driving' | 'result'
  const [outcome, setOutcome] = useState(null); // { bay, rival, win, payout }
  const [round, setRound] = useState(0);
  const [showTutorial, setShowTutorial] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [cel, setCel] = useState(null);         // win celebration { payout, added, mult }
  const pillRef = useRef(null);

  const sceneRef = useRef(null);
  const viewBox = useFitViewBox(sceneRef);
  const busyRef = useRef(false);
  const pendingRef = useRef(null);
  const onRoundRef = useRef(onRound);
  onRoundRef.current = onRound;

  useEffect(() => {
    try { setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { /* old browser */ }
  }, []);

  // After a loss the selected stake may no longer be affordable — step down
  useEffect(() => {
    if (phase !== 'driving') setStake(s => affordable(s, balance));
  }, [balance, phase]);

  // Refs only, so the unmount cleanup below never sees a stale closure.
  function fireRound() {
    const r = pendingRef.current;
    pendingRef.current = null;
    if (r) onRoundRef.current?.(r);
  }
  useEffect(() => () => fireRound(), []); // eslint-disable-line react-hooks/exhaustive-deps

  // Cars arrive → result + onRound (+ the win panel)
  useEffect(() => {
    if (phase !== 'driving') return undefined;
    const t = setTimeout(() => {
      busyRef.current = false;
      setPhase('result');
      const r = pendingRef.current;
      if (r?.win) setCel({ payout: r.payout, added: 0, mult: BAYS[outcome.bay].mult });
      fireRound();
    }, reduced ? REDUCED_ARRIVE_MS : ARRIVE_MS);
    return () => clearTimeout(t);
  }, [phase, round, reduced]); // eslint-disable-line react-hooks/exhaustive-deps

  const broke = balance < MIN_STAKE;
  const sel = bay == null ? null : BAYS[bay];
  const choosing = phase !== 'driving' && !cel;
  const canPark = !!sel && stake <= balance && choosing;
  const shownBalance = cel ? Math.max(0, balance - cel.payout + cel.added) : balance;
  const moving = phase !== 'idle' && !!outcome;
  const lost = phase === 'result' && outcome && !outcome.win;
  const won = phase === 'result' && outcome?.win;

  const reset = () => { setPhase('idle'); setOutcome(null); };
  const chooseStake = (s) => { if (busyRef.current || cel || s > balance) return; setStake(s); saveLast(s, bay); };
  const chooseBay = (i) => {
    if (busyRef.current || cel) return;
    setBay(i); saveLast(stake, i);
    if (phase === 'result') reset();
  };

  const park = () => {
    if (busyRef.current || cel || bay == null || stake > balance) return;
    busyRef.current = true;
    const out = playBay(stake, bay, undefined, rtp);
    onSpend?.(stake);
    pendingRef.current = { stake, win: out.win, payout: out.payout };
    setOutcome({ bay, rival: out.rival, win: out.win, payout: out.payout });
    setRound(n => n + 1);
    setPhase('driving');
  };

  // cars
  let cars;
  if (!moving) {
    cars = [
      <CarSprite key="taxi-idle" kind="taxi" at={TAXI_START} mode="idle" rot={-90} />,
      <CarSprite key="you-idle" kind="you" at={YOU_START} mode="idle" rot={90} tag />,
    ];
  } else {
    const late = outcome.rival === outcome.bay;
    const rTop = outcome.rival < 3, yTop = outcome.bay < 3;
    cars = [
      <CarSprite key={`taxi-${round}`} kind="taxi" at={bayCentre(outcome.rival)} from={TAXI_START} mode="in"
        rot={-90} end={rTop ? 0 : -180} top={rTop} delay={late ? 0 : 0.1} />,
      <CarSprite key={`you-${round}`} kind="you" at={bayCentre(outcome.bay)} from={YOU_START} mode={late ? 'late' : 'in'}
        rot={90} end={yTop ? 0 : 180} top={yTop} delay={late ? 0.18 : 0} tag />,
    ];
  }

  let hud;
  if (phase === 'driving') hud = 'GO GO GO!';
  else if (lost) hud = 'TAKEN!';
  else if (won) hud = 'PARKED!';
  else if (sel) hud = `SPOT ${multLabel(sel.mult)} · WIN ${payoutFor(stake, sel.mult)}`;
  else hud = 'PICK A PARKING SPOT';

  let line = HELP;
  if (lost) line = 'Play again with the same coins.';
  else if (broke && phase === 'idle') line = 'Not enough coins';

  let btnLabel;
  if (phase === 'driving') btnLabel = 'PARKING...';
  else if (phase === 'result') btnLabel = 'PLAY AGAIN';
  else if (!sel) btnLabel = 'PICK A SPOT FIRST';
  else btnLabel = `PARK · ${stake} COINS`;
  const btnOn = phase === 'result' ? !cel : canPark;
  const onBtn = phase === 'result' ? reset : park;

  return (
    <CandyScreen title={TITLE} balance={shownBalance} pillRef={pillRef} closing={closing} onClose={onClose} onHelp={() => setShowTutorial(true)}
      overlay={showTutorial && <TutorialModal tutorialKey="parking" onClose={() => setShowTutorial(false)} />}>
      <style dangerouslySetInnerHTML={{ __html: STATIC_CSS }} />

      {/* the car park — fills the height that is left */}
      <div ref={sceneRef} style={{
        position: 'relative', flex: 1, minHeight: 0, margin: '7px 0 3px', borderRadius: 18, overflow: 'hidden', background: '#4A4A54',
        boxShadow: '0 0 0 2px rgba(255,210,31,.7), 0 0 0 4px rgba(42,10,79,.9), 0 6px 18px rgba(0,0,0,.45)',
      }}>
        <svg viewBox={viewBox} preserveAspectRatio="xMidYMid meet" role="group" aria-label="The car park: pick a parking spot"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}>
          <SceneDefs />
          <Backdrop />
          {BAYS.map((b, i) => {
            const mine = bay === i;
            const taken = moving && outcome.rival === i;
            const youIn = moving && outcome.bay === i;
            let tint = 'rgba(0,0,0,0)';
            if (!moving && mine) tint = 'rgba(255,210,31,.14)';
            else if (lost && mine) tint = 'rgba(227,38,30,.28)';
            else if (won && mine) tint = 'rgba(67,194,26,.24)';
            return (
              <Bay key={b.id} index={i} selected={mine && !moving} tint={tint} showLabel={!taken && !youIn}
                win={payoutFor(stake, b.mult)} disabled={!choosing} onPick={chooseBay} />
            );
          })}
          <g style={{ pointerEvents: 'none' }}>{cars}</g>
        </svg>
        <div aria-hidden style={{ position: 'absolute', inset: 0, borderRadius: 18, pointerEvents: 'none', boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,.12), inset 0 0 22px rgba(10,0,30,.45)' }} />

        {/* HUD */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: 6, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
          <div aria-live="polite" style={{ padding: '4px 12px', borderRadius: 12, background: 'rgba(26,8,56,.86)', border: '2px solid rgba(255,255,255,.18)', fontFamily: CANDY.display, fontSize: 17, color: CANDY.gold, letterSpacing: .5, whiteSpace: 'nowrap' }}>
            {hud}
          </div>
        </div>

        {lost && (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
            <div className="pkp-pop" role="status" style={{ width: 'calc(100% - 48px)', maxWidth: 300, boxSizing: 'border-box', padding: '14px 12px', borderRadius: 22, background: CANDY.red.fill, border: `4px solid ${CANDY.red.light}`, boxShadow: `0 8px 0 ${CANDY.red.dark}`, textAlign: 'center' }}>
              <div style={{ fontFamily: CANDY.display, fontSize: 34, lineHeight: 1, color: '#fff', textShadow: `0 4px 0 ${CANDY.red.dark}` }}>YOU ARE LATE!</div>
            </div>
          </div>
        )}
      </div>

      {/* help / result line — fixed height so nothing below shifts */}
      <div style={{ flex: 'none', height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontWeight: 800, fontSize: 12.5, lineHeight: 1.2, color: line === 'Not enough coins' ? '#FF8A80' : CANDY.sub, padding: '0 6px' }}>
        {line}
      </div>

      <div style={{ flex: 'none' }}>
        <div role="group" aria-label="Coins to play" style={{ display: 'flex', gap: 7, marginBottom: 2 }}>
          {STAKES.map(s => (
            <CandyChip key={s} color={CHIP_COLORS[s]} disabled={s > balance || !choosing}
              selected={stake === s} onClick={() => chooseStake(s)}>
              {s}
            </CandyChip>
          ))}
        </div>

        <CandyButton color="green" big disabled={!btnOn} onClick={onBtn} style={{ width: '100%', minHeight: 62, marginBottom: 6, borderRadius: 18 }}>
          <span style={{ fontSize: 26, textShadow: btnOn ? `${textStroke(2.5, CANDY.outline)}, 0 4px 0 ${CANDY.outline}` : 'none' }}>{btnLabel}</span>
        </CandyButton>
      </div>

      {cel && (
        <WinCelebration payout={cel.payout} reduced={reduced} delay={350} pillRef={pillRef}
          onTick={(added) => setCel(c => c && { ...c, added })} onDone={() => { setCel(null); reset(); }} />
      )}
      {cel && (
        <div aria-hidden style={{ position: 'absolute', left: 0, right: 0, top: 18, zIndex: 6, display: 'flex', justifyContent: 'center', pointerEvents: 'none' }}>
          <div className="pkp-rib" style={{ padding: '6px 16px', borderRadius: 14, background: 'linear-gradient(180deg, #5B2BB0, #2B0F5E)', border: `3px solid ${CANDY.gold}`, boxShadow: `0 5px 0 ${CANDY.goldDeep}`, fontFamily: CANDY.display, fontSize: 22, letterSpacing: 1.5, color: CANDY.gold, textShadow: outlineShadow(2, CANDY.outline, 2) }}>
            PARKED AT {multLabel(cel.mult)}
          </div>
        </div>
      )}
    </CandyScreen>
  );
}
