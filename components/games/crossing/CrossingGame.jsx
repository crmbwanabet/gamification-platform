'use client';

import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import TutorialModal from '../../modals/TutorialModal';
import CandyScreen from '../candy/CandyScreen';
import CandyButton from '../candy/CandyButton';
import CandyChip from '../candy/CandyChip';
import WinCelebration from '../candy/WinCelebration';
import { CANDY, COIN_ICON, outlineShadow, textStroke } from '../candy/tokens';
import { amountText } from '@/lib/rewardText.mjs';
import { formatNumber } from '@/lib/economy/currency.mjs';
import {
  STAKES, DEFAULT_STAKE, DIFFS, DEFAULT_DIFF, LANES, clampRtp, multTable, payoutFor, stepLane, carChance,
} from '@/lib/crossing/engine.mjs';
import {
  WORLD_W, WORLD_H, LANE_H, laneBottom, TRAFFIC, CROSS_CSS, Vehicle, Pavement, Median, Market, Villager,
} from './RoadArt';

// ============================================================================
// ROAD CROSSING — stake-only, cash out any time (design: Cross.dc.html,
// owner-approved 2026-10-27). Pick EASY / MEDIUM / HARD and a stake (1/10/25/50),
// tap CROSS: the stake is charged (onSpend) and the villager stands at the bus
// stop with his chicken. GO steps onto the next of 8 lanes of Great East Road;
// each lane is decided right then by crypto.getRandomValues (lib/crossing/engine.mjs,
// RTP from remote config games.crossing.rtp, clamped 97–99%). A safe lane: the
// traffic brakes, he stands on it, the multiplier grows; CASH OUT banks stake ×
// multiplier rounded UP to whole coins. A car = SMASHED!, the stake is lost.
// Reaching Kalingalinga Market (lane 8) cashes out by itself at the top multiplier.
// Settlement is exactly once (roundRef.done flips before onRound), decided the
// moment GO is tapped — the animation only shows it. Closing mid-round: a hit
// already counts as lost; on a lane he has crossed it cashes out there; before
// the first lane the stake comes back (payout = stake).
// NOTE: STAKES are mirrored by stakeRange '1–50' in lib/data/platform.js and the
// tutorial lines in lib/data/tutorials.js — change all three together.
// ============================================================================

const LAST_KEY = 'crossing:last';
const CHIP_COLORS = { 1: 'violet', 10: 'blue', 25: 'red', 50: 'green' };
const DIFF_LABEL = { easy: 'EASY', medium: 'MEDIUM', hard: 'HARD' };
const MIN_STAKE = STAKES[0];
const SAFE_MS = 380;      // hop + the car braking
const HIT_MS = 650;       // hop + the smash
const GOLD_BTN = { '--cb-fill': '#FFD21F', '--cb-light': '#FFF0A0', '--cb-dark': '#E0A300' };

function readLast() {
  try {
    const v = JSON.parse(window.localStorage.getItem(LAST_KEY) || 'null');
    return { stake: STAKES.includes(v?.stake) ? v.stake : DEFAULT_STAKE, diff: DIFFS.includes(v?.diff) ? v.diff : DEFAULT_DIFF };
  } catch (e) { return { stake: DEFAULT_STAKE, diff: DEFAULT_DIFF }; }
}
function saveLast(stake, diff) {
  try { window.localStorage.setItem(LAST_KEY, JSON.stringify({ stake, diff })); } catch (e) { /* private mode */ }
}
function affordable(stake, balance) {
  if (stake <= balance) return stake;
  const fit = STAKES.filter(s => s <= balance);
  return fit.length ? fit[fit.length - 1] : stake;
}
const xText = (m) => `×${m.toFixed(2)}`;
const riskText = (c) => {
  const pct = Math.round(c * 100);
  return pct <= 0 ? 'no car can come' : `${pct}% chance a car comes`;
};

const TITLE = (
  <span style={{ display: 'block', lineHeight: .9, margin: '2px 0 2px' }}>
    <span style={{ display: 'block', fontSize: 27 }}>ROAD</span>
    <span style={{ display: 'block', fontSize: 34, marginTop: 1 }}>CROSSING</span>
  </span>
);
const BIG_SHADOW = `${textStroke(2, CANDY.outline)}, 0 4px 0 ${CANDY.outline}`;

export default function CrossingGame({ onClose, closing, balance = 0, rtp, onSpend, onRound }) {
  const [init] = useState(readLast);
  const [stake, setStake] = useState(() => affordable(init.stake, balance));
  const [diff, setDiff] = useState(init.diff);
  const [phase, setPhase] = useState('start');  // 'start' | 'cross' | 'lost' | 'won'
  const [lane, setLane] = useState(0);           // lanes he stands past (shown)
  const [states, setStates] = useState([]);      // per lane passed: 'stopped' | 'hit'
  const [busy, setBusy] = useState(false);
  const [hop, setHop] = useState(0);
  const [cel, setCel] = useState(null);          // { payout, added }
  const [showTutorial, setShowTutorial] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [view, setView] = useState({ w: WORLD_W, h: 300 });
  const pillRef = useRef(null);
  const sceneRef = useRef(null);
  const roundRef = useRef(null);   // { stake, diff, rtp, lane, done }
  const busyRef = useRef(false);
  const timers = useRef([]);
  const onRoundRef = useRef(onRound);
  onRoundRef.current = onRound;

  const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.current.push(t); return t; };
  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };

  useEffect(() => {
    try { setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { /* old browser */ }
  }, []);

  useLayoutEffect(() => {
    const el = sceneRef.current;
    if (!el) return undefined;
    // LAYOUT size (offsetWidth/Height), never getBoundingClientRect: the candy
    // card is scaled up on desktop (and scales in on open) with a CSS transform,
    // which getBoundingClientRect includes, so the road was scaled twice
    // (owner 2026-10-29: "it looks zoomed in").
    const measure = () => { const w = el.offsetWidth, h = el.offsetHeight; if (w > 0 && h > 0) setView({ w, h }); };
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (phase === 'start') setStake(s => affordable(s, balance));
  }, [balance, phase]);

  // Exactly once: done flips before onRound. Refs only (unmount-safe).
  function settle(win, payout) {
    const r = roundRef.current;
    if (!r || r.done) return false;
    r.done = true;
    onRoundRef.current?.({ stake: r.stake, win, payout: win ? payout : 0 });
    return true;
  }
  // Closing mid-round: cash out where he stands; before lane 1 the stake comes back.
  useEffect(() => () => {
    clearTimers();
    const r = roundRef.current;
    if (r && !r.done) {
      if (r.lane >= 1) settle(true, payoutFor(r.stake, r.diff, r.lane, r.rtp));
      else settle(true, r.stake);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const r = roundRef.current;
  const playRtp = phase !== 'start' && r ? r.rtp : clampRtp(rtp);
  const playDiff = phase !== 'start' && r ? r.diff : diff;
  const playStake = phase !== 'start' && r ? r.stake : stake;
  const mults = multTable(playDiff, playRtp);
  const crossing = phase === 'cross';
  const cur = lane ? mults[lane - 1] : 0;
  const cashOff = !crossing || lane === 0 || busy;
  const safeLane = crossing && r ? r.lane : lane;   // the ref already knows a hit while the hop plays
  const cashPay = safeLane ? payoutFor(playStake, playDiff, safeLane, playRtp) : 0;
  const broke = balance < MIN_STAKE;
  const canStart = phase === 'start' && !cel && stake <= balance;
  const shownBalance = cel ? Math.max(0, balance - cel.payout + cel.added) : balance;

  const reset = () => {
    clearTimers();
    busyRef.current = false;
    setBusy(false);
    setPhase('start'); setLane(0); setStates([]); setHop(0);
  };

  const start = () => {
    if (!canStart || busyRef.current) return;
    if (roundRef.current && !roundRef.current.done) return;
    roundRef.current = { stake, diff, rtp: clampRtp(rtp), lane: 0, done: false };
    onSpend?.(stake);
    saveLast(stake, diff);
    clearTimers();
    setPhase('cross'); setLane(0); setStates([]); setHop(0);
  };

  const go = () => {
    const rr = roundRef.current;
    if (!rr || rr.done || busyRef.current || phase !== 'cross') return;
    const k = rr.lane + 1;
    const res = stepLane(rr.stake, rr.diff, k, undefined, rr.rtp);
    busyRef.current = true;
    if (res.safe) rr.lane = k;
    if (!res.safe) settle(false, 0);
    else if (res.done) settle(true, res.payout);
    setBusy(true);
    setLane(k);
    setStates(s => [...s.slice(0, k - 1), res.safe ? 'stopped' : 'hit']);
    setHop(h => h + 1);
    if (res.safe && res.done) setCel({ payout: res.payout, added: 0, market: true });
    later(() => {
      busyRef.current = false;
      setBusy(false);
      if (!res.safe) setPhase('lost');
      else if (res.done) setPhase('won');
    }, res.safe ? SAFE_MS : HIT_MS);
  };

  const cashOut = () => {
    const rr = roundRef.current;
    if (!rr || rr.done || busyRef.current || phase !== 'cross' || rr.lane < 1) return;
    const payout = payoutFor(rr.stake, rr.diff, rr.lane, rr.rtp);
    settle(true, payout);
    setPhase('won');
    setCel({ payout, added: 0, market: false });
  };

  const chooseStake = (s) => {
    if (phase !== 'start' || cel || s > balance) return;
    setStake(s); saveLast(s, diff);
  };
  const chooseDiff = (d) => {
    if (phase !== 'start' || cel) return;
    setDiff(d); saveLast(stake, d);
  };

  // ---- the road (world units, scaled to the scene width) ----
  const scale = view.w / WORLD_W;
  const vh = view.h / scale;
  const manY = lane ? laneBottom(lane) + 4 : 14;
  const shift = Math.max(0, Math.min(WORLD_H - vh, manY - Math.round(vh * 0.27)));
  const lost = phase === 'lost';

  const lanes = [];
  for (let k = 1; k <= LANES; k++) {
    const state = states[k - 1] || 'live';
    const right = k <= 4;
    const traffic = TRAFFIC[k - 1];
    const ahead = k > lane;
    const isNext = crossing && k === lane + 1;
    let cars;
    if (state === 'live') {
      cars = traffic.map((t, i) => (
        <div key={`l${i}`} className={right ? 'cr-r' : 'cr-l'} aria-hidden
          style={{ position: 'absolute', left: 0, top: 10, width: 120, height: 46, animationDuration: `${t[2]}s`, animationDelay: `${t[3]}s` }}>
          <div style={{ position: 'absolute', left: 0, top: 0, transform: `scaleX(${right ? 1 : -1})` }}>
            <Vehicle kind={t[0]} color={t[1]} />
          </div>
        </div>
      ));
    } else {
      const hit = state === 'hit';
      const t0 = traffic[0];
      cars = (
        <div key="b" className={right ? 'cr-brake' : 'cr-brakeL'} aria-hidden style={{ position: 'absolute', left: 0, top: 10, width: 120, height: 46 }}>
          <div style={{ position: 'absolute', left: right ? (hit ? 110 : 64) : (hit ? 210 : 240), top: 0, transform: `scaleX(${right ? 1 : -1})` }}>
            <Vehicle kind={t0[0]} color={t0[1]} />
          </div>
        </div>
      );
    }
    lanes.push(
      <div key={k} style={{ position: 'absolute', left: 0, right: 0, bottom: laneBottom(k), height: LANE_H, background: k % 2 ? '#3E3E48' : '#44444E', overflow: 'hidden' }}>
        <div aria-hidden style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 3, background: k === 4 || k === 8 ? 'transparent' : 'repeating-linear-gradient(90deg, #F2F2F2 0 26px, rgba(0,0,0,0) 26px 52px)' }} />
        {ahead && (
          <div style={{
            position: 'absolute', left: 160, top: 9, width: 70, height: 46, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: CANDY.display, fontSize: 19, boxSizing: 'border-box',
            background: isNext ? '#FFD21F' : 'rgba(0,0,0,.35)', color: isNext ? '#2A0A4F' : 'rgba(255,255,255,.85)',
            border: `3px solid ${isNext ? '#FFF0A0' : 'rgba(255,255,255,.25)'}`,
          }}>{xText(mults[k - 1])}</div>
        )}
        {cars}
        {state !== 'live' && (
          <div aria-hidden style={{ position: 'absolute', left: right ? 70 : 250, top: 38, width: 70, height: 12, borderRadius: 4, background: 'repeating-linear-gradient(0deg, rgba(0,0,0,.45) 0 3px, rgba(0,0,0,0) 3px 8px)' }} />
        )}
      </div>,
    );
  }

  // ---- the controls ----
  let controls;
  if (phase === 'start') {
    controls = (
      <>
        <div role="group" aria-label="Difficulty" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
          {DIFFS.map(d => {
            const on = d === diff;
            return (
              <button key={d} type="button" aria-pressed={on} onClick={() => chooseDiff(d)} disabled={!!cel}
                style={{
                  height: 44, borderRadius: 12, cursor: 'pointer', padding: 0, lineHeight: 1.1,
                  fontFamily: CANDY.body, fontWeight: 900, fontSize: 14,
                  color: on ? '#2A0A4F' : '#FFFFFF', background: on ? '#FFD21F' : '#54496B', border: `2px solid ${on ? '#FFF0A0' : '#6A5F82'}`,
                  WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation',
                }}>
                {DIFF_LABEL[d]}<br />
                <span style={{ fontSize: 11, fontWeight: 800, opacity: .8 }}>up to {xText(multTable(d, clampRtp(rtp))[LANES - 1])}</span>
              </button>
            );
          })}
        </div>
        <div role="group" aria-label="Stake" style={{ display: 'flex', gap: 8 }}>
          {STAKES.map(s => (
            <CandyChip key={s} color={CHIP_COLORS[s]} disabled={s > balance} selected={stake === s} onClick={() => chooseStake(s)}
              style={{ minHeight: 50, fontSize: 22, gap: 4 }}>
              {formatNumber(s)}
            </CandyChip>
          ))}
        </div>
        <CandyButton color="green" disabled={!canStart} onClick={start} style={{ width: '100%', minHeight: 58, borderRadius: 18, marginBottom: 6 }}>
          <span style={{ fontSize: 26, textShadow: canStart ? BIG_SHADOW : 'none' }}>
            {broke ? 'NOT ENOUGH COINS' : `CROSS · ${formatNumber(stake)} ${stake === 1 ? 'COIN' : 'COINS'}`}
          </span>
        </CandyButton>
      </>
    );
  } else if (crossing) {
    const nextK = Math.min(LANES, lane + 1);
    controls = (
      <>
        <div style={{ textAlign: 'center', fontWeight: 800, fontSize: 14, color: CANDY.sub, minHeight: 18 }}>
          Next lane: {xText(mults[nextK - 1])} · {riskText(carChance(playStake, playDiff, nextK, playRtp))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
          <CandyButton color="green" disabled={cashOff} onClick={cashOut}
            style={{ minHeight: 80, borderRadius: 18, padding: 0, gap: 4, ...(cashOff ? null : { ...GOLD_BTN, color: CANDY.outline, textShadow: 'none' }) }}>
            <span style={{ fontSize: 20 }}>CASH OUT</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 20 }}>
              {lane > 0 && <img src={COIN_ICON} alt="" width={22} height={22} style={{ display: 'block' }} />}
              {lane > 0 ? amountText(cashPay) : '—'}
            </span>
          </CandyButton>
          <CandyButton color="green" disabled={busy} onClick={go} style={{ minHeight: 80, borderRadius: 18 }}>
            <span style={{ fontSize: 34, textShadow: busy ? 'none' : BIG_SHADOW }}>GO</span>
          </CandyButton>
        </div>
      </>
    );
  } else {
    controls = (
      <>
        <div style={{ textAlign: 'center', fontWeight: 800, fontSize: 14, color: CANDY.sub }}>Play again with the same coins.</div>
        <CandyButton color="green" disabled={busy || !!cel} onClick={reset} style={{ width: '100%', minHeight: 62, borderRadius: 18, marginBottom: 6 }}>
          <span style={{ fontSize: 26, textShadow: busy || cel ? 'none' : BIG_SHADOW }}>PLAY AGAIN</span>
        </CandyButton>
      </>
    );
  }

  return (
    <CandyScreen title={TITLE} balance={shownBalance} pillRef={pillRef} closing={closing} onClose={onClose} onHelp={() => setShowTutorial(true)}
      overlay={showTutorial && <TutorialModal tutorialKey="crossing" onClose={() => setShowTutorial(false)} />}>
      <style dangerouslySetInnerHTML={{ __html: CROSS_CSS }} />

      <section ref={sceneRef} aria-label="Great East Road" style={{
        position: 'relative', flex: 1, minHeight: 0, margin: '7px 0 8px', borderRadius: 18, overflow: 'hidden', background: '#1A0838',
        boxShadow: '0 0 0 2px rgba(255,210,31,.7), 0 0 0 4px rgba(42,10,79,.9), 0 6px 18px rgba(0,0,0,.45)',
      }}>
        <div style={{ position: 'absolute', left: 0, top: 0, width: WORLD_W, height: vh, transform: `scale(${scale})`, transformOrigin: '0 0', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', left: 0, right: 0, bottom: 0, height: WORLD_H,
            transform: `translateY(${shift}px)`, transition: reduced ? 'none' : 'transform .45s cubic-bezier(.3,.8,.3,1)',
          }}>
            <Pavement />
            {lanes}
            <Median />
            <Market />
            <div style={{ position: 'absolute', left: 174, bottom: manY, width: 40, height: 61, transition: reduced ? 'none' : 'bottom .32s ease-out' }}>
              <div key={`h${hop}`} className={lost ? 'cr-fright' : hop ? 'cr-hop' : undefined}>
                <Villager />
              </div>
              {lost && (
                <div aria-hidden style={{ position: 'absolute', left: 30, top: -24, width: 26, height: 26, borderRadius: '50%', background: '#FFD21F', border: '3px solid #2A0A4F', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: CANDY.display, fontSize: 16, color: '#2A0A4F' }}>!</div>
              )}
            </div>
          </div>
        </div>
        <div aria-hidden style={{ position: 'absolute', inset: 0, borderRadius: 18, pointerEvents: 'none', boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,.12), inset 0 0 22px rgba(10,0,30,.45)' }} />

        {crossing && (
          <div style={{ position: 'absolute', left: 8, top: 8, padding: '6px 11px', borderRadius: 14, background: 'rgba(0,0,0,.45)', pointerEvents: 'none' }}>
            <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.08em', color: 'rgba(255,255,255,.75)' }}>LANE {lane} OF {LANES} · {DIFF_LABEL[playDiff]}</div>
            <div style={{ fontFamily: CANDY.display, fontSize: 28, lineHeight: 1.05, color: CANDY.gold, textShadow: outlineShadow(2, CANDY.outline, 2) }}>
              {lane ? xText(cur) : 'TAP GO'}
            </div>
          </div>
        )}

        {lost && (
          <div className="cr-pop" style={{ position: 'absolute', left: 24, right: 24, top: '16%', padding: '16px 14px', borderRadius: 22, background: '#E3261E', border: '4px solid #F5716B', boxShadow: '0 8px 0 #991510', textAlign: 'center' }}>
            <div style={{ fontFamily: CANDY.display, fontSize: 36, lineHeight: 1, color: '#fff', textShadow: '0 4px 0 #991510' }}>SMASHED!</div>
          </div>
        )}
      </section>

      <div role="status" aria-live="polite" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
        {lost ? 'Smashed! You lose the stake.' : phase === 'won' && cel ? `You won ${amountText(cel.payout)}` : crossing && lane ? `Lane ${lane} crossed, ${xText(cur)}` : ''}
      </div>

      <div style={{ flex: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {controls}
      </div>

      {cel && (
        <WinCelebration payout={cel.payout} reduced={reduced} delay={reduced ? 250 : (cel.market ? 700 : 300)} pillRef={pillRef}
          onTick={(added) => setCel(c => c && { ...c, added })} onDone={() => { setCel(null); reset(); }} />
      )}
    </CandyScreen>
  );
}
