'use client';

import React, { useState, useRef, useEffect } from 'react';
import TutorialModal from '../../modals/TutorialModal';
import CandyScreen from '../candy/CandyScreen';
import CandyButton from '../candy/CandyButton';
import CandyChip from '../candy/CandyChip';
import WinCelebration from '../candy/WinCelebration';
import { CANDY, outlineShadow, textStroke } from '../candy/tokens';
import { SymbolDefs } from './Symbols';
import Ticket, { TICKET_CSS, BURST_MS, SLIDE_MS } from './Ticket';
import { resolveCard, payoutFor, STAKES, TOP_MULT, DEFAULT_STAKE } from '@/lib/scratch/odds.mjs';

// ============================================================================
// SCRATCH CARD — stake-only (spec: docs/superpowers/specs/2026-10-07-scratch-card-design.md).
// Pick a stake (1/10/25/50), tap BUY CARD: the stake is charged via onSpend and
// the whole card is decided right then (resolveCard, crypto RNG). A LUCKY
// SCRATCH ticket slides in with 3 foil panels; tap each (or REVEAL ALL) — no
// rubbing, no skill. Three matching symbols pay that symbol's multiplier.
// onRound fires when the LAST panel's foil has burst, so nothing spoils the
// reveal. Exactly-once: the resolved round waits in pendingRef; fireRound()
// nulls it before calling onRound, and unmount (close mid-card) flushes it.
// Double-charge guard: lockRef holds from BUY until the round is reported, and
// the big button is REVEAL ALL (armed only after the slide-in) while a card is
// open, so BUY CARD can't be pressed again until the card is finished.
// Win: the 3 panels glow, then the WinCelebration panel covers the game. The
// platform has ALREADY credited the payout via onRound; while the panel is up
// the pill shows the pre-win balance (balance - payout + coins collected).
// NOTE: STAKES are mirrored by stakeRange '1–50' in lib/data/platform.js and
// the tutorial prize lines in lib/data/tutorials.js — change all three together.
// ============================================================================

const LAST_KEY = 'scratch:last';
const CHIP_COLORS = { 1: 'violet', 10: 'blue', 25: 'red', 50: 'green' };
const MIN_STAKE = STAKES[0];
const STAGGER_MS = 260;      // REVEAL ALL: gap between panels
const REDUCED_REVEAL_MS = 160;
const CEL_DELAY_MS = 1100;   // let the glowing match land before the panel
const COVERED = ['covered', 'covered', 'covered'];

function readLast() {
  try {
    const v = JSON.parse(window.localStorage.getItem(LAST_KEY) || 'null');
    return STAKES.includes(v?.stake) ? v.stake : DEFAULT_STAKE;
  } catch (e) { return DEFAULT_STAKE; }
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

const TITLE = (
  <span style={{ display: 'block', lineHeight: .9, margin: '2px 0 2px' }}>
    <span style={{ display: 'block', fontSize: 27 }}>SCRATCH</span>
    <span style={{ display: 'block', fontSize: 34, marginTop: 1 }}>CARD</span>
  </span>
);

export default function ScratchGame({ onClose, closing, balance = 0, rtp, onSpend, onRound }) {
  const [init] = useState(readLast);
  const [stake, setStake] = useState(() => affordable(init, balance));
  const [phase, setPhase] = useState('idle');     // 'idle' | 'card' | 'done'
  const [card, setCard] = useState(null);         // resolveCard() result
  const [states, setStates] = useState(COVERED);  // per panel: covered | bursting | open
  const [round, setRound] = useState(0);
  const [prev, setPrev] = useState(null);         // outgoing ticket { key, panels, states, winSymbol }
  const [armed, setArmed] = useState(false);      // REVEAL ALL + panels live after the slide-in
  const [showTutorial, setShowTutorial] = useState(false);
  const [reduced, setReduced] = useState(false);
  const [cel, setCel] = useState(null);           // win celebration { payout, added }
  const pillRef = useRef(null);

  const lockRef = useRef(false);
  const pendingRef = useRef(null);
  const cardRef = useRef(null);
  const statesRef = useRef(COVERED);
  const timers = useRef([]);
  const onRoundRef = useRef(onRound);
  onRoundRef.current = onRound;

  const later = (fn, ms) => { const t = setTimeout(fn, ms); timers.current.push(t); return t; };

  useEffect(() => {
    try { setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { /* old browser */ }
  }, []);

  // After a loss the selected stake may no longer be affordable — step down
  useEffect(() => {
    if (phase !== 'card') setStake(s => affordable(s, balance));
  }, [balance, phase]);

  // Refs only, so the unmount cleanup below never sees a stale closure.
  function fireRound() {
    const r = pendingRef.current;
    pendingRef.current = null;
    if (r) onRoundRef.current?.(r);
  }
  useEffect(() => () => {
    timers.current.forEach(clearTimeout);
    fireRound();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setPanel = (i, v) => {
    const next = statesRef.current.slice();
    next[i] = v;
    statesRef.current = next;
    setStates(next);
  };

  const finish = () => {
    const c = cardRef.current;
    lockRef.current = false;
    setPhase('done');
    if (c?.win && pendingRef.current) setCel({ payout: c.payout, added: 0 });
    fireRound();
  };

  const reveal = (i) => {
    if (!lockRef.current || statesRef.current[i] !== 'covered') return;
    setPanel(i, 'bursting');
    later(() => {
      setPanel(i, 'open');
      if (statesRef.current.every(s => s === 'open')) finish();
    }, reduced ? REDUCED_REVEAL_MS : BURST_MS);
  };

  const revealAll = () => {
    if (!lockRef.current || !armed) return;
    let k = 0;
    statesRef.current.forEach((s, i) => {
      if (s !== 'covered') return;
      if (k === 0 || reduced) reveal(i);
      else later(() => reveal(i), k * STAGGER_MS);
      k += 1;
    });
  };

  const broke = balance < MIN_STAKE;
  const canBuy = phase !== 'card' && !cel && stake <= balance;
  const shownBalance = cel ? Math.max(0, balance - cel.payout + cel.added) : balance;
  const allOpen = states.every(s => s === 'open');
  const winSymbol = card?.win && allOpen ? card.symbol : null;

  const chooseStake = (s) => {
    if (lockRef.current || s > balance) return;
    setStake(s); saveLast(s);
    if (phase === 'done') setPhase('idle');
  };

  const buy = () => {
    if (lockRef.current || cel || phase === 'card' || stake > balance) return;
    lockRef.current = true;
    const out = resolveCard(stake, undefined, rtp);
    onSpend?.(stake);
    pendingRef.current = { stake, win: out.win, payout: out.payout };
    cardRef.current = out;
    if (!reduced) {
      setPrev({ key: `p${round}`, panels: card?.panels ?? null, states: statesRef.current, winSymbol });
      later(() => setPrev(null), 400);
    }
    statesRef.current = COVERED;
    setStates(COVERED);
    setCard(out);
    setPhase('card');
    setRound(n => n + 1);
    setArmed(reduced);
    if (!reduced) later(() => setArmed(true), SLIDE_MS);
    saveLast(stake);
  };

  const left = states.filter(s => s === 'covered').length;
  // Near-miss tension: two uncovered panels match and one is still covered
  const shownIds = card ? card.panels.filter((_, i) => states[i] !== 'covered') : [];
  const teaseIndex = phase === 'card' && left === 1 && shownIds[0] === shownIds[1] ? states.indexOf('covered') : -1;
  let line;
  if (teaseIndex >= 0) line = <span style={{ color: CANDY.gold, fontSize: 19, textShadow: `0 2px 0 ${CANDY.outline}` }}>One more…!</span>;
  else if (phase === 'card') line = <span style={{ color: CANDY.sub, fontSize: 17 }}>{left === 3 ? 'Tap the panels!' : left ? `${left} to go…` : 'Revealing…'}</span>;
  else if (phase === 'done' && card?.win) line = <span key="win" className="anim-scale-in" style={{ fontSize: 28, color: CANDY.gold, letterSpacing: 2, textShadow: `${outlineShadow(2, CANDY.outline, 3)}, 0 0 18px rgba(255,210,31,.8)` }}>WIN</span>;
  else if (phase === 'done') line = <span key="lose" className="anim-scale-in" style={{ fontSize: 26, color: '#fff', letterSpacing: 2, textShadow: outlineShadow(2, CANDY.outline, 3) }}>LOSE</span>;
  else if (broke) line = <span style={{ fontSize: 17, color: '#FF8A80' }}>Not enough coins</span>;
  else line = <span style={{ fontSize: 17, color: CANDY.sub }}>Match 3 symbols to win!</span>;

  const inCard = phase === 'card';
  const canRevealAll = inCard && armed && left > 0;
  const btnOn = inCard ? canRevealAll : canBuy;
  const big = (on) => ({ fontSize: 34, textShadow: on ? `${textStroke(2.5, CANDY.outline)}, 0 4px 0 ${CANDY.outline}` : 'none' });

  return (
    <CandyScreen title={TITLE} balance={shownBalance} pillRef={pillRef} closing={closing} onClose={onClose} onHelp={() => setShowTutorial(true)}
      overlay={showTutorial && <TutorialModal tutorialKey="scratch" onClose={() => setShowTutorial(false)} />}>
      <style>{TICKET_CSS}</style>
      <SymbolDefs />

      <div className="sc-stage">
        {prev && (
          <Ticket key={prev.key} className="sc-out" panels={prev.panels} states={prev.states} winSymbol={prev.winSymbol}
            live={false} reduced={reduced} holo={false} onReveal={() => {}} />
        )}
        <Ticket key={round} className={round && !reduced ? 'sc-in' : ''} panels={card?.panels ?? null} states={states}
          live={inCard && armed} winSymbol={winSymbol} teaseIndex={teaseIndex} reduced={reduced} onReveal={reveal} />
      </div>

      {/* result line — fixed, compact height so nothing below shifts */}
      <div aria-live="polite" style={{ flex: 'none', height: 30, position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: CANDY.display, letterSpacing: .5, whiteSpace: 'nowrap' }}>
        {line}
      </div>

      <div style={{ flex: 'none' }}>
        <div role="group" aria-label="Stake" style={{ display: 'flex', gap: 7, marginBottom: 2 }}>
          {STAKES.map(s => (
            <CandyChip key={s} color={CHIP_COLORS[s]} disabled={s > balance} dim={inCard}
              selected={stake === s} onClick={() => chooseStake(s)}>
              {s}
            </CandyChip>
          ))}
        </div>

        <CandyButton color={inCard ? 'blue' : 'green'} big disabled={!btnOn} onClick={inCard ? revealAll : buy}
          style={{ width: '100%', minHeight: 66, gap: 2, marginBottom: 6, borderRadius: 18 }}>
          {inCard
            ? <span style={big(btnOn)}>REVEAL ALL</span>
            : (
              <>
                <span style={big(btnOn)}>BUY CARD</span>
                <span style={{ fontSize: 14, color: btnOn ? CANDY.gold : 'inherit', textShadow: btnOn ? `${textStroke(1.5, CANDY.outline)}, 0 2px 0 ${CANDY.outline}` : 'none', letterSpacing: 1 }}>
                  ✦ WIN UP TO {payoutFor(stake, TOP_MULT)} ✦
                </span>
              </>
            )}
        </CandyButton>
      </div>

      {cel && (
        <WinCelebration payout={cel.payout} reduced={reduced} delay={CEL_DELAY_MS} pillRef={pillRef}
          onTick={(added) => setCel(c => c && { ...c, added })} onDone={() => setCel(null)} />
      )}
    </CandyScreen>
  );
}
