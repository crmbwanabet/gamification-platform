'use client';

import React, { useState, useRef, useEffect } from 'react';
import TutorialModal from '../../modals/TutorialModal';
import CandyScreen from '../candy/CandyScreen';
import CandyButton from '../candy/CandyButton';
import CandyChip from '../candy/CandyChip';
import WinCelebration from '../candy/WinCelebration';
import { CANDY, COIN_ICON, outlineShadow, textStroke } from '../candy/tokens';
import { formatNumber } from '@/lib/economy/currency.mjs';
import {
  STAKES, DEFAULT_STAKE, STOPS, STOP_NAMES, RIDERS, clampRtp, multText, payoutFor, resolveStop,
} from '@/lib/conductor/engine.mjs';
import Rider from './Rider';
import { Backdrop, Bus, Speech, BUS_CSS } from './BusStop';

// ============================================================================
// BUS CONDUCTOR 2 — a 5-stop pyramid game, stake-only (design: Conductor.dc.html
// + Rider.dc.html, owner-approved). You are the conductor. Pick a stake
// (1/10/25/50) and tap START: the stake is charged right then (onSpend). At
// each stop (Chilenje, Kabwata, Kamwala, Matero, Town) 6 passengers wait and k
// of them (k = the stop number) have no money. Call one: a payer moves the bus
// up a stop and you may CASH OUT or go to the NEXT STOP; a no-money passenger
// loses the stake. Paying at Town (the bus is full) pays out by itself.
// Maths in lib/conductor/engine.mjs: multiplier after k stops = RTP / chance of
// getting that far (×1.18 … ×63.50 at 98%), paid rounded UP to whole coins;
// RTP from remote config games.conductor.rtp (clamped 97–99%, default 98%).
// Who has no money is drawn by crypto.getRandomValues at the moment of the
// call; the others are revealed after.
// Settlement is exactly once per round (roundRef.settled flips before onRound):
// a no-money call settles the loss at the tap, the Town payer or CASH OUT
// settles the win. Closing mid-round settles as a cash-out of the stops already
// cleared; closing before the first call gives the stake back.
// NOTE: STAKES are mirrored by stakeRange '1–50' in lib/data/platform.js and
// the tutorial lines in lib/data/tutorials.js — change all three together.
// ============================================================================

const LAST_KEY = 'conductor:last';
const CHIP_COLORS = { 1: 'violet', 10: 'blue', 25: 'red', 50: 'green' };
const MIN_STAKE = STAKES[0];
const REVEAL_OTHERS_MS = 380;  // the called passenger first, then everyone else
const RESULT_MS = 900;         // after the call: the result controls / panel
const GOLD_BTN = { '--cb-fill': '#FFD21F', '--cb-light': '#FFF0A0', '--cb-dark': '#E0A300' };
const VIEW = { x: 0, y: 84, w: 390, h: 336 };   // the crop of the design's 390×560 scene
const RIDER_Y = 290;
const riderX = (i) => 6 + i * 63;

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
// who stands where: a different crowd at every stop (design: (i·3 + stop·2) mod 7)
const lookAt = (i, stopIdx) => (i * 3 + stopIdx * 2) % 7;

const TITLE = (
  <span style={{ display: 'block', lineHeight: .9, margin: '2px 0 2px' }}>
    <span style={{ display: 'block', fontSize: 26 }}>BUS</span>
    <span style={{ display: 'block', fontSize: 25, marginTop: 1 }}>CONDUCTOR 2</span>
  </span>
);

const CSS = BUS_CSS + `
  .bc-rider { cursor: pointer; outline: none; -webkit-tap-highlight-color: transparent; }
  .bc-rider[aria-disabled="true"] { cursor: default; }
  .bc-rider:focus-visible .bc-ring { stroke: ${CANDY.gold}; stroke-width: 3; }
  .bc-bob { animation: bcBob 1.4s ease-in-out infinite; }
  @keyframes bcBob { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-4px) } }
  .bc-tag { animation: bcTag .35s cubic-bezier(.2,1.6,.4,1) both; transform-box: fill-box; transform-origin: 50% 100%; }
  @keyframes bcTag { from { transform: scale(.5); opacity: 0 } to { transform: scale(1); opacity: 1 } }
  @keyframes bcPanel { from { transform: translateX(-50%) scale(.6); opacity: 0 } to { transform: translateX(-50%) scale(1); opacity: 1 } }
  .bc-panel { animation: bcPanel .35s cubic-bezier(.2,1.6,.4,1) both; }
  @media (prefers-reduced-motion: reduce) { .bc-bob, .bc-tag, .bc-panel { animation: none; } }
`;

function Coin({ size = 18 }) {
  return <img src={COIN_ICON} alt="" width={size} height={size} style={{ display: 'inline-block', verticalAlign: '-3px', filter: 'drop-shadow(0 1.5px 0 rgba(0,0,0,.35))' }} />;
}

export default function ConductorGame({ onClose, closing, balance = 0, rtp, onSpend, onRound }) {
  const rtpC = clampRtp(rtp);
  const [stake, setStake] = useState(() => affordable(readLast(), balance));
  const [phase, setPhase] = useState('idle');   // 'idle' | 'pick' | 'reveal' | 'paid' | 'lost' | 'won'
  const [stop, setStop] = useState(1);          // the stop being played (1..5)
  const [done, setDone] = useState(0);          // stops cleared this round
  const [pick, setPick] = useState(-1);
  const [broke, setBroke] = useState([]);
  const [revealAll, setRevealAll] = useState(false);
  const [lostStake, setLostStake] = useState(0);
  const [full, setFull] = useState(false);      // the bus reached Town
  const [cel, setCel] = useState(null);         // win celebration { payout, added }
  const [showTutorial, setShowTutorial] = useState(false);
  const [reduced, setReduced] = useState(false);
  const pillRef = useRef(null);

  const timers = useRef([]);
  const busyRef = useRef(false);     // a call is being revealed
  const roundRef = useRef(null);     // { stake, done, settled }
  const onRoundRef = useRef(onRound);
  onRoundRef.current = onRound;
  const rtpRef = useRef(rtpC);
  rtpRef.current = rtpC;

  const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.current.push(t); return t; };
  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = []; };

  useEffect(() => {
    try { setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { /* old browser */ }
  }, []);

  const inRound = phase === 'pick' || phase === 'reveal' || phase === 'paid';
  useEffect(() => {
    if (!inRound && !cel) setStake(s => affordable(s, balance));
  }, [balance, inRound, cel]);

  // Exactly once: settled flips before onRound. Refs only (unmount-safe).
  function settle(win, payout) {
    const r = roundRef.current;
    if (!r || r.settled) return 0;
    r.settled = true;
    onRoundRef.current?.({ stake: r.stake, win, payout: win ? payout : 0 });
    return win ? payout : 0;
  }
  // Close mid-round: cash out the stops already cleared; before the first call, the stake back.
  useEffect(() => () => {
    clearTimers();
    const r = roundRef.current;
    if (r && !r.settled) settle(true, r.done > 0 ? payoutFor(r.stake, r.done, rtpRef.current) : r.stake);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function resetScene() {
    clearTimers();
    busyRef.current = false;
    setStop(1); setDone(0); setPick(-1); setBroke([]); setRevealAll(false); setFull(false);
  }

  const broken = balance < MIN_STAKE;
  const canStart = !inRound && !cel && stake <= balance;

  const start = () => {
    if (!canStart || busyRef.current) return;
    onSpend?.(stake);
    roundRef.current = { stake, done: 0, settled: false };
    resetScene();
    setPhase('pick');
  };

  const call = (i) => {
    const r = roundRef.current;
    if (phase !== 'pick' || busyRef.current || !r || r.settled) return;
    busyRef.current = true;
    const res = resolveStop(stop, i);
    setPick(i);
    setBroke(res.broke);
    setRevealAll(false);
    setPhase('reveal');
    later(() => setRevealAll(true), reduced ? 0 : REVEAL_OTHERS_MS);
    if (!res.pays) {
      settle(false, 0);
      setLostStake(r.stake);
      later(() => { busyRef.current = false; setPhase('lost'); }, RESULT_MS);
      return;
    }
    r.done = stop;
    if (stop >= STOPS) {
      const payout = settle(true, payoutFor(r.stake, STOPS, rtpC));
      later(() => {
        busyRef.current = false;
        setDone(STOPS); setFull(true); setPhase('won');
        setCel({ payout, added: 0 });
      }, RESULT_MS);
      return;
    }
    later(() => { busyRef.current = false; setDone(stop); setPhase('paid'); }, RESULT_MS);
  };

  const cashOut = () => {
    const r = roundRef.current;
    if (phase !== 'paid' || !r || r.settled || r.done < 1) return;
    const payout = settle(true, payoutFor(r.stake, r.done, rtpC));
    setPhase('won');
    setCel({ payout, added: 0 });
  };

  const nextStop = () => {
    if (phase !== 'paid') return;
    setStop(done + 1); setPick(-1); setBroke([]); setRevealAll(false);
    setPhase('pick');
  };

  const chooseStake = (s) => {
    if (inRound || cel || s > balance) return;
    setStake(s); saveLast(s);
    if (phase !== 'idle') { resetScene(); setPhase('idle'); }
  };

  const celebrationDone = () => {
    setCel(null);
    resetScene();
    setPhase('idle');
  };

  // ---------- what the scene shows
  const shownStates = phase === 'reveal' || phase === 'paid' || phase === 'lost' || phase === 'won';
  const riderState = (i) => {
    if (phase === 'pick') return 'hidden';
    if (!shownStates || pick < 0) return 'idle';
    const isBroke = broke.includes(i);
    if (i === pick) return isBroke ? 'nopay' : 'pay';
    if (!revealAll) return 'idle';
    return isBroke ? 'nopayer' : 'payer';
  };
  const payers = RIDERS - stop;
  let speech;
  if (phase === 'idle') speech = ['Town! Town!', 'Who is going to town?'];
  else if (phase === 'pick') speech = ['Who has money?', `I need ${payers} of you!`];
  else if (phase === 'reveal') speech = ['Let me see...'];
  else if (phase === 'lost') speech = ['Ah! No money?', 'Get off!'];
  else if (phase === 'won') speech = full ? ['The bus is full!', 'Off to town!'] : ['Good choice!', 'Off to town!'];
  else speech = ['Thank you!', 'Next stop!'];

  const stopIdx = stop - 1;
  const ladder = STOP_NAMES.map((name, i) => {
    const k = i + 1;
    const cur = k === stop && (phase === 'pick' || phase === 'reveal');
    const past = k <= done;
    return { k, name, cur, past };
  });

  const shownBalance = cel ? Math.max(0, balance - cel.payout + cel.added) : balance;
  const cashPay = done >= 1 ? payoutFor(roundRef.current?.stake ?? stake, done, rtpC) : 0;
  const roundStake = roundRef.current?.stake ?? stake;
  const nextStopPay = payoutFor(roundStake, Math.min(STOPS, done + 1), rtpC);

  // ---------- the line under the scene
  const small = { fontFamily: CANDY.body, fontWeight: 800, fontSize: 13.5, lineHeight: 1.25, color: CANDY.sub, textAlign: 'center', whiteSpace: 'normal' };
  let line;
  if (phase === 'pick' || phase === 'reveal') {
    line = <span style={{ fontSize: 26, color: CANDY.gold, letterSpacing: 1, textShadow: outlineShadow(2, CANDY.outline, 3) }}>TAP A PASSENGER</span>;
  } else if (phase === 'paid') {
    line = <span style={small}>They paid! Take your coins, or go to the next stop for more.</span>;
  } else if (phase === 'won') {
    line = <span key="win" className="anim-scale-in" style={{ fontSize: 26, color: CANDY.gold, letterSpacing: 2, textShadow: `${outlineShadow(2, CANDY.outline, 3)}, 0 0 18px rgba(255,210,31,.8)` }}>{full ? 'THE BUS IS FULL!' : 'WIN'}</span>;
  } else if (phase === 'lost') {
    line = <span style={small}>Play again with the same coins.</span>;
  } else if (broken) {
    line = <span style={{ fontSize: 17, color: '#FF8A80' }}>Not enough coins</span>;
  } else {
    line = <span style={small}>You are the conductor. At each stop, call one passenger. If they can pay, you win more.</span>;
  }

  const strong = { textShadow: `${textStroke(2.5, CANDY.outline)}, 0 4px 0 ${CANDY.outline}` };

  return (
    <CandyScreen title={TITLE} balance={shownBalance} pillRef={pillRef} closing={closing} onClose={onClose} onHelp={() => setShowTutorial(true)}
      overlay={showTutorial && <TutorialModal tutorialKey="conductor" onClose={() => setShowTutorial(false)} />}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* the five stops and what each pays */}
      <div role="list" aria-label="Stops" style={{ flex: 'none', display: 'flex', gap: 4, margin: '6px 0 0' }}>
        {ladder.map(l => (
          <div key={l.k} role="listitem" aria-current={l.cur ? 'step' : undefined}
            aria-label={`Stop ${l.k}, ${l.name}: ${multText(l.k, rtpC)}`}
            style={{
              flex: 1, minWidth: 0, padding: '2px 0 3px', borderRadius: 9, textAlign: 'center',
              background: l.cur ? CANDY.gold : l.past ? '#43C21A' : 'rgba(26,8,56,.8)',
              color: l.cur ? CANDY.outline : '#fff',
              border: `2px solid ${l.cur ? '#FFF0A0' : l.past ? '#7BE34F' : 'rgba(255,255,255,.2)'}`,
              transition: 'background .2s, border-color .2s',
            }}>
            <div style={{ fontFamily: CANDY.body, fontWeight: 900, fontSize: 'clamp(8px, 2.4vw, 9.5px)', letterSpacing: 0, opacity: .85, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.name}</div>
            <div style={{ fontFamily: CANDY.display, fontSize: 14, lineHeight: 1.05, fontVariantNumeric: 'tabular-nums' }}>{multText(l.k, rtpC)}</div>
          </div>
        ))}
      </div>

      {/* the bus stop */}
      <div style={{
        position: 'relative', flex: 1, minHeight: 0, margin: '6px 0 3px', borderRadius: 18, overflow: 'hidden', background: '#C9C2B2',
        boxShadow: '0 0 0 2px rgba(255,210,31,.7), 0 0 0 4px rgba(42,10,79,.9), 0 6px 18px rgba(0,0,0,.45)',
      }}>
        <svg viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`} preserveAspectRatio="xMidYMid meet" role="group" aria-label="The bus stop"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', overflow: 'visible' }}>
          <Backdrop />
          <Bus seated={done} wave={!reduced} />
          <Speech lines={speech} />
          {Array.from({ length: RIDERS }, (_, i) => {
            const st = riderState(i);
            const can = phase === 'pick';
            const mine = i === pick && shownStates;
            const ring = mine ? (broke.includes(i) ? 'rgba(227,38,30,.32)' : 'rgba(67,194,26,.32)') : 'transparent';
            return (
              <g key={`${stop}-${i}`} className="bc-rider" transform={`translate(${riderX(i)} ${RIDER_Y})`}
                role="button" tabIndex={can ? 0 : -1} aria-disabled={!can}
                aria-label={`Passenger ${i + 1}${st === 'pay' ? ': paid' : st === 'nopay' || st === 'nopayer' ? ': no money' : st === 'payer' ? ': had money' : ''}`}
                onClick={() => can && call(i)}
                onKeyDown={(e) => { if (can && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); call(i); } }}>
                <rect className="bc-ring" x="-3" y="-30" width="62" height="146" rx="12" fill={ring} stroke="transparent" />
                <g className={can && !reduced ? 'bc-bob' : undefined} style={can && !reduced ? { animationDelay: `${i * -0.23}s` } : undefined}>
                  <Rider who={lookAt(i, stopIdx)} state={st} />
                </g>
              </g>
            );
          })}
        </svg>
        <div aria-hidden style={{ position: 'absolute', inset: 0, borderRadius: 18, pointerEvents: 'none', boxShadow: 'inset 0 0 0 1.5px rgba(255,255,255,.12), inset 0 0 22px rgba(10,0,30,.45)' }} />

        {phase === 'lost' && (
          <div className="bc-panel" role="status" style={{
            position: 'absolute', left: '50%', top: '7%', width: 'min(88%, 310px)', boxSizing: 'border-box', padding: '10px 14px 12px', transformOrigin: '50% 0',
            borderRadius: 22, background: '#E3261E', border: '4px solid #F5716B', boxShadow: '0 8px 0 #991510', textAlign: 'center', transform: 'translateX(-50%)',
          }}>
            <div style={{ fontFamily: CANDY.display, fontSize: 28, lineHeight: 1, textShadow: '0 4px 0 #991510' }}>NO MONEY!</div>
            <p style={{ margin: '6px 0 0', fontWeight: 800, fontSize: 14, lineHeight: 1.25 }}>This passenger could not pay. You lost {formatNumber(lostStake)} {lostStake === 1 ? 'coin' : 'coins'}.</p>
          </div>
        )}
      </div>

      <div aria-live="polite" style={{ flex: 'none', minHeight: 36, padding: '0 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: CANDY.display, letterSpacing: .5, textAlign: 'center' }}>
        {line}
      </div>

      <div style={{ flex: 'none', height: 140, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
        {(phase === 'pick' || phase === 'reveal') && (
          <div style={{ flex: 1, marginBottom: 6, borderRadius: 18, background: 'rgba(16,3,38,.55)', border: '2px solid rgba(255,255,255,.12)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, textAlign: 'center', padding: '0 10px' }}>
            <div style={{ fontFamily: CANDY.display, fontSize: 13, letterSpacing: 1, color: CANDY.sub }}>STOP {stop} OF {STOPS} · {STOP_NAMES[stopIdx]}</div>
            <div style={{ fontWeight: 800, fontSize: 15, color: 'rgba(255,255,255,.88)' }}>
              {payers === 1 ? 'Only 1 of these 6 has money.' : `${payers} of these 6 have money. ${stop} ${stop === 1 ? 'has' : 'have'} none.`}
            </div>
            <div style={{ fontWeight: 900, fontSize: 15 }}>
              Call the right one and win <Coin size={17} /> <span style={{ color: CANDY.gold }}>{formatNumber(payoutFor(roundStake, stop, rtpC))} coins</span> ({multText(stop, rtpC)})
            </div>
          </div>
        )}

        {phase === 'paid' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
            <CandyButton color="green" onClick={cashOut} style={{ ...GOLD_BTN, minHeight: 112, borderRadius: 18, gap: 4, color: CANDY.outline, textShadow: 'none' }}>
              <span style={{ fontSize: 22, letterSpacing: .5 }}>CASH OUT</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 28 }}><Coin size={24} />{formatNumber(cashPay)}</span>
            </CandyButton>
            <CandyButton color="green" onClick={nextStop} style={{ minHeight: 112, borderRadius: 18, gap: 6 }}>
              <span style={{ fontSize: 23, ...strong }}>NEXT STOP</span>
              <span style={{ fontFamily: CANDY.body, fontWeight: 900, fontSize: 15, display: 'flex', alignItems: 'center', gap: 4 }}>win <Coin size={16} /> {formatNumber(nextStopPay)}</span>
            </CandyButton>
          </div>
        )}

        {(phase === 'idle' || phase === 'lost' || phase === 'won') && (
          <>
            <div role="group" aria-label="Stake" style={{ display: 'flex', gap: 7, marginBottom: 2 }}>
              {STAKES.map(s => (
                <CandyChip key={s} color={CHIP_COLORS[s]} disabled={s > balance} selected={stake === s} onClick={() => chooseStake(s)}>
                  {formatNumber(s)}
                </CandyChip>
              ))}
            </div>
            <CandyButton color="green" big disabled={!canStart} onClick={start} style={{ width: '100%', minHeight: 66, gap: 3, marginBottom: 6, borderRadius: 18 }}>
              <span style={{ fontSize: phase === 'lost' ? 24 : 28, whiteSpace: 'nowrap', ...(canStart ? strong : { textShadow: 'none' }) }}>
                {phase === 'lost' ? 'PLAY AGAIN' : 'START'} · {formatNumber(stake)} {stake === 1 ? 'COIN' : 'COINS'}
              </span>
              <span style={{ fontSize: 13, letterSpacing: 1, color: canStart ? CANDY.gold : 'inherit', textShadow: canStart ? `${textStroke(1.5, CANDY.outline)}, 0 2px 0 ${CANDY.outline}` : 'none' }}>
                ✦ FULL BUS PAYS {formatNumber(payoutFor(stake, STOPS, rtpC))} ✦
              </span>
            </CandyButton>
          </>
        )}
      </div>

      {cel && (
        <WinCelebration payout={cel.payout} reduced={reduced} delay={reduced ? 250 : (full ? 500 : 250)} pillRef={pillRef}
          onTick={(added) => setCel(c => c && { ...c, added })} onDone={celebrationDone} />
      )}
    </CandyScreen>
  );
}
