'use client'

import React, { useState, useRef, useEffect } from 'react';
import { C } from '@/components/redesign/tokens';
import { RewardIcon } from '@/components/redesign/RedesignShell';
import TutorialModal from '../modals/TutorialModal';
import { GameShell, GameBtn, OptionBtn } from './gameKit';
import { GAME_ECONOMY } from '@/lib/data/platform';
import {
  label, isWin, handRanks, createRound, drawCard, discardCard, advanceTurn,
  claimants, swapPair, validSwapPair, applySwap,
} from '@/lib/njuka/engine.mjs';
import { createSeen, observe, botDecide, BOT_CLAIM_DELAY, BOT_CLAIM_MISS } from '@/lib/njuka/bot.mjs';

// ============================================================================
// NJUKA BOSS — Zambian draw-and-discard, rebuilt native (spec:
// docs/superpowers/specs/2026-07-17-njuka-boss-integration-design.md).
// 4 seats: you + 3 FAIR bots. Each seat's knowledge lives in seenRef and is
// fed EXCLUSIVELY from its own cards + public discards (see seatSees /
// everyoneElseSees — those two helpers are the entire fairness boundary).
// Pure-stake economy: no free plays; every round deducts the stake via
// onSpend and a win pays stake + min(3×stake, MAX_WIN) via onWin.
// NOTE: STAKES is mirrored by the '5–50' footer in PlayView.jsx and the
// tutorial prize lines in lib/data/tutorials.js — change all three together.
// ============================================================================

const STAKES = [5, 10, 25, 50];
const TURN_MS = 15000;  // player's whole turn (draw + discard)
const CLAIM_MS = 5000;  // claim window after an eligible discard
const NEXT_MS = 6000;   // auto-deal countdown between rounds
const BOT_NAMES = ['Mwape', 'Bwalya', 'Chanda', 'Mutale', 'Phiri', 'Banda', 'Tembo', 'Zulu', 'Daka', 'Sakala', 'Mumba', 'Nkhata'];
const SEAT_POS = [null, { left: '16%', top: '26%' }, { left: '50%', top: '14%' }, { left: '84%', top: '26%' }];

function CardFace({ card, w = 54, hidden, tappable, picked, pulse, outline, onClick }) {
  const red = card && (card.s === '♥' || card.s === '♦');
  return (
    <div onClick={onClick} style={{
      width: w, height: Math.round(w * 1.45), borderRadius: Math.max(5, Math.round(w * 0.12)),
      background: hidden ? 'repeating-linear-gradient(45deg, #453263, #453263 5px, #33254a 5px, #33254a 10px)' : '#faf7ef',
      color: red ? '#c0202f' : '#191922',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none',
      fontSize: Math.round(w * 0.4), fontWeight: 800,
      boxShadow: '0 3px 8px rgba(0,0,0,.4)', userSelect: 'none',
      cursor: (tappable || onClick) ? 'pointer' : 'default',
      outline: picked ? '3px solid #4da6ff' : outline ? `3px solid ${outline}` : tappable ? `2px solid ${C.gold}` : 'none',
      transform: picked ? 'translateY(-8px)' : 'none',
      transition: 'transform .12s',
      border: hidden ? '1px solid rgba(0,0,0,.35)' : '1px solid rgba(0,0,0,.15)',
      animation: pulse ? 'njukaPulse .7s infinite' : 'none',
    }}>
      {!hidden && card ? `${label(card.r)}${card.s}` : ''}
    </div>
  );
}

export default function NjukaGame({ onClose, closing, onWin, onSpend, onRefund, balance = 0 }) {
  const [screen, setScreen] = useState('stake');   // 'stake' | 'table'
  const [stake, setStakeState] = useState(10);
  const [showTutorial, setShowTutorial] = useState(false);
  const [, force] = useState(0);
  const [hint, setHint] = useState('');
  const [timerFrac, setTimerFrac] = useState(1);
  const [claimable, setClaimable] = useState(false);
  const [swapSel, setSwapSel] = useState(null);    // null | [picked indices]
  const [banner, setBanner] = useState(null);      // { title, sub, cards, kind }
  const [nextIn, setNextIn] = useState(null);
  const [sessionNet, setSessionNet] = useState(0);
  const [reduceMotion] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

  const roundRef = useRef(null);   // engine round state (mutable)
  const seenRef = useRef([]);      // per-seat fair knowledge — see header comment
  const botsRef = useRef([]);      // 3 bot names, fixed for the session
  const timersRef = useRef([]);
  const turnTimerRef = useRef(null);
  const claimFireRef = useRef(null);
  const playerActedRef = useRef(false);
  const stakeRef = useRef(10);
  const balanceRef = useRef(balance);
  balanceRef.current = balance;

  const rerender = () => force(n => n + 1);
  const setStake = (v) => { stakeRef.current = v; setStakeState(v); };
  const later = (fn, ms) => { const t = setTimeout(fn, ms); timersRef.current.push(t); return t; };
  const stopTurnTimer = () => { if (turnTimerRef.current) { clearInterval(turnTimerRef.current); turnTimerRef.current = null; } };
  const clearTimers = () => { timersRef.current.forEach(clearTimeout); timersRef.current = []; stopTurnTimer(); };
  useEffect(() => clearTimers, []);

  const botName = (seat) => botsRef.current[seat - 1] || 'Bot';

  // ---- knowledge upkeep: THE fairness boundary ----
  // A draw is private (only the drawer sees it); a discard is public (all
  // OTHER seats see it — the discarder already counted the card when it
  // entered their hand). A claimed card needs no extra observe: it was
  // already public, and the round ends with the claim.
  const seatSees = (seat, rank) => observe(seenRef.current[seat], rank);
  const everyoneElseSees = (exceptSeat, rank) => seenRef.current.forEach((sn, i) => { if (i !== exceptSeat) observe(sn, rank); });

  // ---- round lifecycle ----
  const startRound = (st = stakeRef.current) => {
    clearTimers(); setBanner(null); setSwapSel(null); setClaimable(false); setNextIn(null); setTimerFrac(1);
    playerActedRef.current = false;
    claimFireRef.current = null;
    if (balanceRef.current < st) {
      roundRef.current = null; setScreen('stake');
      setHint('Not enough coins for that stake — visit Earn to top up');
      rerender(); return;
    }
    onSpend(st);
    if (!botsRef.current.length) botsRef.current = [...BOT_NAMES].sort(() => Math.random() - 0.5).slice(0, 3);
    const S = createRound(4);
    S.stake = st;
    roundRef.current = S;
    // deal: each seat learns ONLY its own three cards
    seenRef.current = S.hands.map(h => createSeen(handRanks(h)));
    setScreen('table'); setHint(''); rerender();
    beginTurn();
  };

  const beginTurn = () => {
    const S = roundRef.current; if (!S || S.winner) return;
    setTimerFrac(1); rerender();
    if (S.turn === 0) {
      setHint('Your turn — tap the deck to draw');
      startTurnTimer();
    } else {
      setHint(`${botName(S.turn)} is thinking…`);
      later(() => botTurn(S.turn), 800 + Math.random() * 900);
    }
  };

  const startTurnTimer = () => {
    stopTurnTimer();
    const deadline = Date.now() + TURN_MS;
    turnTimerRef.current = setInterval(() => {
      const left = deadline - Date.now();
      setTimerFrac(Math.max(0, left / TURN_MS));
      if (left <= 0) { stopTurnTimer(); autoPlay(); }
    }, 250);
  };

  const endTurn = () => {
    const S = roundRef.current; if (!S || S.winner) return;
    advanceTurn(S);
    beginTurn();
  };

  // ---- player actions ----
  const playerDraw = () => {
    playerActedRef.current = true;
    const S = roundRef.current;
    if (!S || S.winner || S.turn !== 0 || (S.phase !== 'draw' && S.phase !== 'swapdraw')) return;
    const wasSwap = S.phase === 'swapdraw';
    const card = drawCard(S);
    if (!card) { voidRound(); return; }
    seatSees(0, card.r);
    if (wasSwap) {
      stopTurnTimer();
      setHint(`Drew ${label(card.r)} — turn passes`);
      rerender(); later(endTurn, 600); return;
    }
    if (isWin(handRanks(S.hands[0]))) setHint('NJUKA! Declare your win!');
    else setHint('Tap a card to discard' + (swapPair(handRanks(S.hands[0])) ? ' — or swap a pair' : ''));
    rerender();
  };

  const declareWin = () => {
    playerActedRef.current = true;
    const S = roundRef.current;
    if (!S || S.winner || S.turn !== 0 || S.phase !== 'discard' || !isWin(handRanks(S.hands[0]))) return;
    finishWin(0, 'formed the hand', S.hands[0].slice());
  };

  const playerDiscard = (idx) => {
    playerActedRef.current = true;
    const S = roundRef.current;
    if (!S || S.winner || S.turn !== 0 || S.phase !== 'discard' || swapSel) return;
    stopTurnTimer();
    const card = discardCard(S, idx);
    everyoneElseSees(0, card.r);
    rerender();
    afterDiscard(0, card);
  };

  const toggleSwapCard = (idx) => {
    setSwapSel(sel => {
      if (!sel) return sel;
      if (sel.includes(idx)) return sel.filter(i => i !== idx);
      return [...sel.slice(-1), idx]; // keep at most the previous pick + this one
    });
  };

  const confirmSwap = () => {
    playerActedRef.current = true;
    const S = roundRef.current;
    if (!S || S.winner || S.turn !== 0 || S.phase !== 'discard') return;
    if (!swapSel || swapSel.length !== 2) return;
    const [i, j] = swapSel;
    if (!validSwapPair(handRanks(S.hands[0]), i, j)) return;
    applySwap(S, i, j);
    S.discard.slice(-2).forEach(card => everyoneElseSees(0, card.r));
    setSwapSel(null);
    setHint('Now tap the deck to draw your replacement');
    rerender();
  };

  // ---- timeout: play a sensible turn for the player (no forfeit) ----
  const autoPlay = () => {
    const S = roundRef.current; if (!S || S.winner || S.turn !== 0) return;
    stopTurnTimer(); setSwapSel(null);
    if (S.phase === 'draw' || S.phase === 'swapdraw') {
      const wasSwap = S.phase === 'swapdraw';
      const card = drawCard(S);
      if (!card) { voidRound(); return; }
      seatSees(0, card.r);
      if (wasSwap) { rerender(); later(endTurn, 400); return; }
    }
    const ranks = handRanks(S.hands[0]);
    if (isWin(ranks)) { finishWin(0, 'formed the hand', S.hands[0].slice()); return; }
    const dec = botDecide(ranks, seenRef.current[0]); // same fair heuristic plays for you
    const card = discardCard(S, dec.index);
    everyoneElseSees(0, card.r);
    setHint('⏱ Time up — played for you');
    rerender();
    afterDiscard(0, card);
  };

  // ---- bot turn (fair: own hand + own seen only) ----
  const botTurn = (seat) => {
    const S = roundRef.current; if (!S || S.winner || S.turn !== seat) return;
    const card = drawCard(S);
    if (!card) { voidRound(); return; }
    seatSees(seat, card.r);
    rerender();
    const dec = botDecide(handRanks(S.hands[seat]), seenRef.current[seat]);
    if (dec.action === 'win') { finishWin(seat, 'drew the winner', S.hands[seat].slice()); return; }
    if (dec.action === 'swap') {
      applySwap(S, dec.indices[0], dec.indices[1]);
      S.discard.slice(-2).forEach(x => everyoneElseSees(seat, x.r));
      const d2 = drawCard(S);
      if (!d2) { voidRound(); return; }
      seatSees(seat, d2.r);
      rerender(); later(endTurn, 500); return;
    }
    const disc = discardCard(S, dec.index);
    everyoneElseSees(seat, disc.r);
    rerender();
    afterDiscard(seat, disc);
  };

  // ---- claims: the tap race ----
  const afterDiscard = (from, card) => {
    const S = roundRef.current; if (!S || S.winner) return;
    const elig = claimants(S, card, from);
    if (!elig.length) { later(endTurn, 450); return; }
    let resolved = false;
    const fire = (seat) => {
      if (resolved || roundRef.current !== S || S.winner) return;
      resolved = true;
      setClaimable(false); claimFireRef.current = null;
      S.discard.pop();
      S.hands[seat].push(card);
      finishWin(seat, `claimed the ${label(card.r)}`, S.hands[seat].slice());
    };
    // fair bots race with a human-favorable delay + miss chance
    elig.filter(s => s !== 0).forEach(s => {
      if (Math.random() > BOT_CLAIM_MISS) {
        later(() => fire(s), BOT_CLAIM_DELAY[0] + Math.random() * (BOT_CLAIM_DELAY[1] - BOT_CLAIM_DELAY[0]));
      }
    });
    if (elig.includes(0)) {
      setHint(`⚡ The ${label(card.r)} completes your hand — TAP the pile to WIN!`);
      setClaimable(true);
      claimFireRef.current = () => { playerActedRef.current = true; fire(0); };
      later(() => {
        if (!resolved) {
          resolved = true; setClaimable(false); claimFireRef.current = null;
          setHint(`Missed the claim on the ${label(card.r)}`);
          later(endTurn, 350);
        }
      }, CLAIM_MS);
    } else {
      later(() => { if (!resolved) { resolved = true; endTurn(); } }, CLAIM_MS + 200);
    }
  };

  // ---- outcomes ----
  const finishWin = (seat, how, cards) => {
    const S = roundRef.current; if (!S || S.winner) return;
    clearTimers(); setClaimable(false); claimFireRef.current = null; setSwapSel(null);
    S.winner = { seat, how, cards };
    if (seat === 0) {
      const profit = Math.min(S.stake * 3, GAME_ECONOMY.MAX_WIN);
      setSessionNet(n => n + profit);
      onWin(S.stake + profit, { net: profit, stake: S.stake });
      setBanner({ title: 'NJUKA! You win 🎉', sub: `+${profit} coins — you ${how}`, cards, kind: 'win' });
    } else {
      setSessionNet(n => n - S.stake);
      setBanner({ title: `${botName(seat)} wins`, sub: `${botName(seat)} ${how} — your ${S.stake} coin stake is gone`, cards, kind: 'lose' });
    }
    rerender();
    scheduleNext();
  };

  const voidRound = () => {
    const S = roundRef.current; if (!S || S.winner) return;
    clearTimers(); setClaimable(false); claimFireRef.current = null; setSwapSel(null);
    S.winner = { seat: -1, how: 'deck exhausted', cards: [] };
    if (onRefund) onRefund(S.stake);
    setBanner({ title: 'Round void', sub: 'The deck ran out — your stake was returned', cards: [], kind: 'void' });
    rerender();
    scheduleNext();
  };

  const scheduleNext = () => {
    if (!playerActedRef.current) { setNextIn(null); return; }
    let n = Math.round(NEXT_MS / 1000);
    setNextIn(n);
    const tick = () => {
      n -= 1;
      if (n <= 0) { startRound(); return; }
      setNextIn(n);
      later(tick, 1000);
    };
    later(tick, 1000);
  };

  const leaveTable = () => {
    clearTimers(); roundRef.current = null;
    claimFireRef.current = null;
    setBanner(null); setNextIn(null); setScreen('stake'); setHint('');
  };

  // ---- render ----
  const S = roundRef.current;
  const myTurn = S && !S.winner && S.turn === 0;
  const canDraw = myTurn && (S.phase === 'draw' || S.phase === 'swapdraw');
  const canDiscard = myTurn && S.phase === 'discard' && !swapSel;
  const myRanks = S && S.hands[0] ? handRanks(S.hands[0]) : [];
  const haveWin = myTurn && S.phase === 'discard' && isWin(myRanks);
  const canOfferSwap = canDiscard && !haveWin && !!swapPair(myRanks);
  const swapValid = !!swapSel && swapSel.length === 2 && validSwapPair(myRanks, swapSel[0], swapSel[1]);
  const topDiscard = S && S.discard.length ? S.discard[S.discard.length - 1] : null;

  const stakeScreen = (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: C.sub, marginBottom: 14 }}>
        <span>Balance</span>
        <b style={{ color: C.gold, display: 'inline-flex', alignItems: 'center', gap: 4 }}><RewardIcon kind="coins" size={14} />{balance}</b>
      </div>
      <div style={{ background: C.track, borderRadius: 14, padding: '12px 14px', fontSize: 12.5, color: C.sub, lineHeight: 1.55, marginBottom: 16 }}>
        Make a 4-card hand: <b style={{ color: C.text }}>triple + follower</b> (7·7·7·8) or <b style={{ color: C.text }}>pair + run</b> (5·5·7·8).
        Claim number cards off the pile — J/Q/K must be drawn. Winner takes the whole pot.
        Your 3 opponents are bots that play fair: they see only their own cards and the discards.
      </div>
      <div style={{ fontSize: 12, fontWeight: 800, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Your stake</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 16 }}>
        {STAKES.map(s => (
          <OptionBtn key={s} selected={stake === s} disabled={balance < s} onClick={() => setStake(s)}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><RewardIcon kind="coins" size={13} />{s}</span>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, marginTop: 2 }}>win {Math.min(s * 3, GAME_ECONOMY.MAX_WIN)}</div>
          </OptionBtn>
        ))}
      </div>
      <GameBtn onClick={() => startRound(stake)} disabled={balance < stake}>
        Take a seat — stake {stake} coins
      </GameBtn>
      {hint && <div style={{ marginTop: 10, fontSize: 12, color: C.gold, textAlign: 'center' }}>{hint}</div>}
      <div style={{ marginTop: 10, fontSize: 11, color: C.muted, textAlign: 'center' }}>No free plays — every round is staked. Leaving mid-round forfeits your stake.</div>
    </div>
  );

  const seatEl = (seat) => {
    const isTurn = S && !S.winner && S.turn === seat;
    const revealed = S && S.winner && S.winner.seat === seat;
    const hand = (S && S.hands[seat]) || [];
    return (
      <div key={seat} style={{ position: 'absolute', ...SEAT_POS[seat], transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 3,
          background: 'rgba(10,8,22,.5)', borderRadius: 10, padding: '5px 9px', minWidth: 76,
          outline: isTurn ? `2px solid ${C.gold}` : 'none',
          boxShadow: isTurn ? `0 0 12px ${C.gold}55` : 'none',
        }}>
          <div style={{ fontSize: 11.5, fontWeight: 800, color: C.text }}>
            {botName(seat)} <span style={{ fontSize: 9, fontWeight: 600, color: C.muted }}>bot</span>
          </div>
          <div style={{ display: 'flex', gap: 3 }}>
            {hand.map((card, i) => <CardFace key={i} card={card} w={17} hidden={!revealed} />)}
          </div>
        </div>
      </div>
    );
  };

  const tableScreen = (
    <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11.5, color: C.sub, marginBottom: 8 }}>
        <span>Stake <b style={{ color: C.text }}>{S ? S.stake : stake}</b> · Pot <b style={{ color: C.gold }}>{(S ? S.stake : stake) * 4}</b></span>
        <span style={{ color: sessionNet >= 0 ? C.green : C.red, fontWeight: 800 }}>{sessionNet >= 0 ? '+' : ''}{sessionNet} session</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><RewardIcon kind="coins" size={12} /><b style={{ color: C.text }}>{balance}</b></span>
      </div>

      <div style={{ position: 'relative', height: 250, borderRadius: '46% / 32%', background: 'radial-gradient(ellipse at center, #35305a 0%, #262143 70%, #1e1a36 100%)', border: '1px solid rgba(255,255,255,.09)', boxShadow: 'inset 0 0 46px rgba(0,0,0,.55)' }}>
        {[1, 2, 3].map(seatEl)}
        <div style={{ position: 'absolute', left: '50%', top: '62%', transform: 'translate(-50%, -50%)', display: 'flex', gap: 20, alignItems: 'flex-end' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 9, letterSpacing: 1, color: C.muted, textTransform: 'uppercase', marginBottom: 3 }}>Deck · {S ? S.deck.length : 0}</div>
            <CardFace hidden w={44} tappable={canDraw} pulse={canDraw && !reduceMotion} onClick={canDraw ? playerDraw : undefined} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 9, letterSpacing: 1, color: C.muted, textTransform: 'uppercase', marginBottom: 3 }}>Discard</div>
            <CardFace card={topDiscard} w={44} hidden={!topDiscard}
              outline={claimable ? C.red : null}
              pulse={claimable && !reduceMotion}
              onClick={claimable ? () => claimFireRef.current && claimFireRef.current() : undefined} />
          </div>
        </div>
      </div>

      <div style={{ height: 3, borderRadius: 2, background: C.track, margin: '10px 2px 8px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${(myTurn ? timerFrac : 0) * 100}%`, background: timerFrac < 0.25 ? C.red : C.gold, transition: 'width .25s linear' }} />
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', minHeight: 86, alignItems: 'flex-end' }}>
        {((S && S.hands[0]) || []).map((card, i) => (
          <CardFace key={i} card={card} w={56}
            tappable={canDiscard || !!swapSel}
            picked={!!swapSel && swapSel.includes(i)}
            onClick={() => { if (swapSel) toggleSwapCard(i); else if (canDiscard) playerDiscard(i); }} />
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 10, minHeight: 44, flexWrap: 'wrap' }}>
        {claimable && <GameBtn full={false} variant="danger" onClick={() => claimFireRef.current && claimFireRef.current()} style={{ animation: reduceMotion ? 'none' : 'njukaPulse .8s infinite' }}>⚡ TAP TO WIN</GameBtn>}
        {haveWin && !swapSel && <GameBtn full={false} onClick={declareWin} style={{ animation: reduceMotion ? 'none' : 'njukaPulse .8s infinite' }}>🎉 Declare NJUKA</GameBtn>}
        {canOfferSwap && <GameBtn full={false} variant="ghost" onClick={() => { setSwapSel([]); setHint('Pick 2 cards forming a pair or run to throw'); }}>Swap a pair</GameBtn>}
        {swapSel && <GameBtn full={false} disabled={!swapValid} onClick={confirmSwap}>Throw &amp; draw</GameBtn>}
        {swapSel && <GameBtn full={false} variant="ghost" onClick={() => { setSwapSel(null); setHint('Tap a card to discard'); }}>Cancel</GameBtn>}
      </div>
      <div style={{ textAlign: 'center', fontSize: 12, color: C.sub, minHeight: 17, marginTop: 6 }}>{hint}</div>

      {banner && (
        <div style={{ position: 'absolute', inset: -8, background: 'rgba(10,8,20,.88)', borderRadius: 18, zIndex: 5, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, textAlign: 'center', padding: 16 }}>
          <div style={{ fontSize: 21, fontWeight: 800, color: banner.kind === 'win' ? C.gold : C.text, fontFamily: "var(--font-display, 'Bricolage Grotesque', sans-serif)" }}>{banner.title}</div>
          {banner.cards.length > 0 && (
            <div style={{ display: 'flex', gap: 6 }}>
              {banner.cards.map((card, i) => <CardFace key={i} card={card} w={38} />)}
            </div>
          )}
          <div style={{ fontSize: 12.5, color: C.sub }}>{banner.sub}</div>
          {nextIn != null && <div style={{ fontSize: 12, color: C.muted }}>Next round in {nextIn}s — stake {stake}</div>}
          <div style={{ display: 'flex', gap: 6 }}>
            {STAKES.map(s => (
              <OptionBtn key={s} selected={stake === s} disabled={balanceRef.current < s} onClick={() => setStake(s)} style={{ padding: '7px 10px', fontSize: 12.5 }}>{s}</OptionBtn>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <GameBtn full={false} onClick={() => startRound()}>Deal now</GameBtn>
            <GameBtn full={false} variant="ghost" onClick={leaveTable}>Leave table</GameBtn>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <GameShell title="🃏 Njuka Boss" onClose={onClose} closing={closing} onHelp={() => setShowTutorial(true)} maxWidth={470}>
      <style>{`@keyframes njukaPulse { 50% { transform: scale(1.06); filter: brightness(1.15); } }`}</style>
      {screen === 'stake' ? stakeScreen : tableScreen}
      {showTutorial && <TutorialModal tutorialKey="njuka" onClose={() => setShowTutorial(false)} />}
    </GameShell>
  );
}
