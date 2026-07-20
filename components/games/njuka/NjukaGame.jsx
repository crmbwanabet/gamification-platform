'use client'

import React, { useState, useRef, useEffect } from 'react';
import { C } from '@/components/redesign/tokens';
import { RewardIcon } from '@/components/redesign/RedesignShell';
import TutorialModal from '../../modals/TutorialModal';
import { GameShell, GameBtn, OptionBtn } from '../gameKit';
import { GAME_ECONOMY } from '@/lib/data/platform';
import {
  label, isWin, handRanks, createRound, drawCard, discardCard, advanceTurn,
  claimants, swapPair, validSwapPair, applySwap,
} from '@/lib/njuka/engine.mjs';
import { createSeen, observe, botDecide, BOT_CLAIM_DELAY, BOT_CLAIM_MISS } from '@/lib/njuka/bot.mjs';
import { Zap, PartyPopper, GraduationCap, BookOpen } from 'lucide-react';
import { NjukaCard } from './Card';
import NjukaTutorial from './Tutorial';
import NjukaRules from './Rules';
import { flyChip, prefersReducedMotion, DEAL_STAGGER } from './anim';

// ============================================================================
// NJUKA BOSS — Zambian draw-and-discard, rebuilt native (spec:
// docs/superpowers/specs/2026-07-17-njuka-boss-integration-design.md).
// You + 1–3 FAIR bots (table size is player-chosen). Each seat's knowledge
// lives in seenRef and is fed EXCLUSIVELY from its own cards + public
// discards (seatSees / everyoneElseSees are the entire fairness boundary).
// Pure-stake economy: no free plays; every round deducts the stake via
// onSpend and a win pays stake + min(stake×opponents, MAX_WIN) via onWin.
// NOTE: STAKES is mirrored by the '5–50' footer in PlayView.jsx and the
// tutorial prize lines in lib/data/tutorials.js — change all three together.
//
// Presentation: ONE continuous scene — the photoreal table (njuka-table.jpg)
// is always the backdrop. The menu (stake + table size) floats over it
// BLURRED; taking a seat animates the blur away and the round deals. The
// player's hand, actions and hint all sit ON the table. Cards: tap OR drag
// onto the discard pile. No flashing anywhere — steady glows only.
// ============================================================================

const STAKES = [5, 10, 25, 50];
const SEAT_CHOICES = [2, 3, 4];  // total players at the table (you + 1–3 bots)
const TURN_MS = 15000;  // player's whole turn (draw + discard)
const CLAIM_MS = 5000;  // claim window after an eligible discard
const NEXT_MS = 6000;   // auto-deal countdown between rounds
const BOT_NAMES = ['Mwape', 'Bwalya', 'Chanda', 'Mutale', 'Phiri', 'Banda', 'Tembo', 'Zulu', 'Daka', 'Sakala', 'Mumba', 'Nkhata'];
// Chair anchor points baked into the table artwork, per table size.
const SEAT_LAYOUTS = {
  2: [{ left: '50%', top: '10%' }],
  3: [{ left: '27%', top: '14%' }, { left: '70%', top: '13%' }],
  4: [{ left: '27%', top: '14%' }, { left: '50%', top: '9%' }, { left: '70%', top: '13%' }],
};
const SEAT_HUES = ['#8e6fd8', '#3f9a7b', '#c96f4a'];
const GOLD_EDGE = 'rgba(230,173,74,.45)';

export default function NjukaGame({ onClose, closing, onWin, onSpend, onRefund, balance = 0 }) {
  const [screen, setScreen] = useState('stake');   // 'stake' | 'table'
  const [stake, setStakeState] = useState(10);
  const [seats, setSeatsState] = useState(4);
  const [showTutorial, setShowTutorial] = useState(false);
  const [, force] = useState(0);
  const [hint, setHint] = useState('');
  const [timerFrac, setTimerFrac] = useState(1);
  const [claimable, setClaimable] = useState(false);
  const [swapSel, setSwapSel] = useState(null);    // null | [picked indices]
  const [banner, setBanner] = useState(null);      // { title, sub, cards, kind }
  const [nextIn, setNextIn] = useState(null);
  const [sessionNet, setSessionNet] = useState(0);
  const [drawAnimKey, setDrawAnimKey] = useState(null); // flips the freshly drawn 4th card
  const [reduceMotion] = useState(() => prefersReducedMotion());

  const roundRef = useRef(null);   // engine round state (mutable)
  const seenRef = useRef([]);      // per-seat fair knowledge — see header comment
  const botsRef = useRef([]);      // bot names, fixed for the session
  const timersRef = useRef([]);
  const turnTimerRef = useRef(null);
  const claimFireRef = useRef(null);
  const stakeRef = useRef(10);
  const seatsRef = useRef(4);
  const balanceRef = useRef(balance);
  const playerActedRef = useRef(false);
  const roundIdRef = useRef(0);          // animation key: bumps per deal
  const lastDiscarderRef = useRef(null); // seat whose card just hit the pile
  const dragRef = useRef(null);          // in-flight hand-card drag
  balanceRef.current = balance;

  const rerender = () => force(n => n + 1);
  const setStake = (v) => { stakeRef.current = v; setStakeState(v); };
  const setSeats = (v) => { seatsRef.current = v; setSeatsState(v); };
  const later = (fn, ms) => { const t = setTimeout(fn, ms); timersRef.current.push(t); return t; };
  const stopTurnTimer = () => { if (turnTimerRef.current) { clearInterval(turnTimerRef.current); turnTimerRef.current = null; } };
  const clearTimers = () => { timersRef.current.forEach(clearTimeout); timersRef.current = []; stopTurnTimer(); };
  useEffect(() => clearTimers, []);

  const botName = (seat) => botsRef.current[seat - 1] || 'Bot';
  const seatDomId = (seat) => (seat === 0 ? 'njk-hand' : `njk-seat-${seat}`);
  const winFor = (st, nSeats) => Math.min(st * (nSeats - 1), GAME_ECONOMY.MAX_WIN);

  // ---- knowledge upkeep: THE fairness boundary ----
  // A draw is private (only the drawer sees it); a discard is public (all
  // OTHER seats see it — the discarder already counted the card when it
  // entered their hand). A claimed card needs no extra observe: it was
  // already public, and the round ends with the claim.
  const seatSees = (seat, rank) => observe(seenRef.current[seat], rank);
  const everyoneElseSees = (exceptSeat, rank) => seenRef.current.forEach((sn, i) => { if (i !== exceptSeat) observe(sn, rank); });

  // ---- round lifecycle ----
  // Menu → game: the scene un-blurs (CSS transition on screen state) and the
  // deal starts once the table is sharp.
  const enterGame = () => {
    setScreen('table');
    later(() => startRound(stakeRef.current), reduceMotion ? 0 : 550);
  };

  const startRound = (st = stakeRef.current) => {
    clearTimers(); setBanner(null); setSwapSel(null); setClaimable(false); setNextIn(null); setTimerFrac(1);
    claimFireRef.current = null;
    playerActedRef.current = false;
    setDrawAnimKey(null);
    if (balanceRef.current < st) {
      roundRef.current = null; setScreen('stake');
      setHint('Not enough coins for that stake — visit Earn to top up');
      rerender(); return;
    }
    onSpend(st);
    if (!botsRef.current.length) botsRef.current = [...BOT_NAMES].sort(() => Math.random() - 0.5).slice(0, 3);
    const S = createRound(seatsRef.current);
    S.stake = st;
    roundRef.current = S;
    roundIdRef.current += 1;
    lastDiscarderRef.current = null;
    // deal: each seat learns ONLY its own three cards
    seenRef.current = S.hands.map(h => createSeen(handRanks(h)));
    setScreen('table'); setHint(''); rerender();
    // chips: every seat antes into the pot (pure presentation)
    later(() => { for (let s = 0; s < S.hands.length; s++) flyChip(seatDomId(s), 'njk-pot', { delay: s * 80 }); }, 150);
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
    const S = roundRef.current;
    if (!S || S.winner || S.turn !== 0 || (S.phase !== 'draw' && S.phase !== 'swapdraw')) return;
    playerActedRef.current = true;
    const wasSwap = S.phase === 'swapdraw';
    const card = drawCard(S);
    if (!card) { voidRound(); return; }
    seatSees(0, card.r);
    setDrawAnimKey(`${roundIdRef.current}-${S.deck.length}`);
    if (wasSwap) {
      stopTurnTimer();
      setHint(`Drew ${label(card.r)} — turn passes`);
      rerender(); later(endTurn, 600); return;
    }
    if (isWin(handRanks(S.hands[0]))) setHint('NJUKA! Declare your win!');
    else setHint('Tap a card to discard — or drag it onto the pile' + (swapPair(handRanks(S.hands[0])) ? '. You can also swap a pair' : ''));
    rerender();
  };

  const declareWin = () => {
    const S = roundRef.current;
    if (!S || S.winner || S.turn !== 0 || S.phase !== 'discard' || !isWin(handRanks(S.hands[0]))) return;
    playerActedRef.current = true;
    finishWin(0, 'formed the hand', S.hands[0].slice());
  };

  const playerDiscard = (idx) => {
    const S = roundRef.current;
    if (!S || S.winner || S.turn !== 0 || S.phase !== 'discard' || swapSel) return;
    playerActedRef.current = true;
    stopTurnTimer();
    const card = discardCard(S, idx);
    everyoneElseSees(0, card.r);
    lastDiscarderRef.current = 0;
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
    const S = roundRef.current;
    if (!S || S.winner || S.turn !== 0 || S.phase !== 'discard') return;
    if (!swapSel || swapSel.length !== 2) return;
    const [i, j] = swapSel;
    if (!validSwapPair(handRanks(S.hands[0]), i, j)) return;
    playerActedRef.current = true;
    applySwap(S, i, j);
    S.discard.slice(-2).forEach(card => everyoneElseSees(0, card.r));
    lastDiscarderRef.current = 0;
    setSwapSel(null);
    setHint('Now tap the deck to draw your replacement');
    rerender();
  };

  // ---- drag-to-discard (tap still works; drag is the alternative) ----
  const onCardPointerDown = (e, idx) => {
    const S = roundRef.current;
    if (!S || S.winner || S.turn !== 0 || S.phase !== 'discard' || swapSel) return;
    const el = e.currentTarget;
    dragRef.current = { el, idx, x0: e.clientX, y0: e.clientY, moved: false };
    try { el.setPointerCapture(e.pointerId); } catch (_) {}
  };
  const onCardPointerMove = (e) => {
    const d = dragRef.current; if (!d || d.el !== e.currentTarget) return;
    const dx = e.clientX - d.x0, dy = e.clientY - d.y0;
    if (!d.moved && Math.abs(dx) + Math.abs(dy) > 8) { d.moved = true; d.el.dataset.dragged = '1'; }
    if (d.moved) {
      d.el.style.transform = `translate(${dx}px, ${dy}px) rotate(${dx * 0.04}deg)`;
      d.el.style.zIndex = 60;
      // steady highlight on the pile while hovering over it
      const pile = document.getElementById('njk-discard');
      if (pile) {
        const p = pile.getBoundingClientRect();
        const over = e.clientX > p.left - 24 && e.clientX < p.right + 24 && e.clientY > p.top - 24 && e.clientY < p.bottom + 24;
        pile.style.filter = over ? 'brightness(1.35)' : '';
      }
    }
  };
  const onCardPointerUp = (e) => {
    const d = dragRef.current; dragRef.current = null;
    if (!d || d.el !== e.currentTarget) return;
    const pile = document.getElementById('njk-discard');
    if (pile) pile.style.filter = '';
    d.el.style.zIndex = '';
    if (!d.moved) { d.el.style.transform = ''; return; } // plain tap — onClick handles it
    const p = pile?.getBoundingClientRect();
    const over = p && e.clientX > p.left - 28 && e.clientX < p.right + 28 && e.clientY > p.top - 28 && e.clientY < p.bottom + 28;
    d.el.style.transform = '';
    later(() => { if (d.el) delete d.el.dataset.dragged; }, 80);
    if (over) playerDiscard(d.idx);
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
    lastDiscarderRef.current = 0;
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
      lastDiscarderRef.current = seat;
      const d2 = drawCard(S);
      if (!d2) { voidRound(); return; }
      seatSees(seat, d2.r);
      rerender(); later(endTurn, 500); return;
    }
    const disc = discardCard(S, dec.index);
    everyoneElseSees(seat, disc.r);
    lastDiscarderRef.current = seat;
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
    // pot flies to the winner (pure presentation)
    for (let i = 0; i < S.hands.length; i++) flyChip('njk-pot', seatDomId(seat), { delay: i * 70 });
    if (seat === 0) {
      const profit = winFor(S.stake, S.hands.length);
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
    if (!playerActedRef.current) { setNextIn(null); return; } // idle guard: no auto-deal for absent players
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
    clearTimers(); roundRef.current = null; claimFireRef.current = null;
    setBanner(null); setNextIn(null); setScreen('stake'); setHint('');
  };

  // ---- render ----
  const S = roundRef.current;
  const inMenu = screen === 'stake';
  const myTurn = S && !S.winner && S.turn === 0;
  const canDraw = myTurn && (S.phase === 'draw' || S.phase === 'swapdraw');
  const canDiscard = myTurn && S.phase === 'discard' && !swapSel;
  const myRanks = S && S.hands[0] ? handRanks(S.hands[0]) : [];
  const haveWin = myTurn && S.phase === 'discard' && isWin(myRanks);
  const canOfferSwap = canDiscard && !haveWin && !!swapPair(myRanks);
  const swapValid = !!swapSel && swapSel.length === 2 && validSwapPair(myRanks, swapSel[0], swapSel[1]);
  const topDiscard = S && S.discard.length ? S.discard[S.discard.length - 1] : null;
  const roundId = roundIdRef.current;
  const tableSeats = S ? S.hands.length : seats;

  const seatEl = (seat) => {
    const pos = SEAT_LAYOUTS[tableSeats]?.[seat - 1];
    if (!pos) return null;
    const isTurn = S && !S.winner && S.turn === seat;
    const revealed = S && S.winner && S.winner.seat === seat;
    const hand = (S && S.hands[seat]) || [];
    const hue = SEAT_HUES[seat - 1];
    return (
      <div key={seat} id={`njk-seat-${seat}`} style={{
        position: 'absolute', ...pos, transform: 'translate(-50%, -50%)', textAlign: 'center',
        opacity: S && !S.winner && !isTurn ? 0.8 : 1, filter: S && !S.winner && !isTurn ? 'saturate(.78)' : 'none',
        transition: 'opacity .3s, filter .3s',
      }}>
        <div style={{
          display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          background: 'rgba(10,8,22,.45)', borderRadius: 12, padding: '6px 10px 8px', minWidth: 92,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{
              width: 26, height: 26, borderRadius: '50%', display: 'grid', placeItems: 'center',
              background: hue, color: '#fff', fontSize: 13, fontWeight: 800,
              boxShadow: isTurn ? `0 0 0 2px ${C.gold}, 0 0 16px ${C.gold}` : '0 0 0 2px rgba(255,255,255,.15)',
              transition: 'box-shadow .25s', flex: 'none',
            }}>{botName(seat)[0]}</div>
            <div style={{ fontSize: 11.5, fontWeight: 800, color: C.text, textShadow: '0 1px 3px rgba(0,0,0,.8)' }}>
              {botName(seat)} <span style={{ fontSize: 8.5, fontWeight: 600, color: 'rgba(255,255,255,.55)' }}>bot</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {hand.map((card, i) => (
              <NjukaCard key={`${seat}-${i}`} card={card} w={28} hidden={!revealed}
                flyFrom="njk-deck"
                flyKey={hand.length === 4 && i === 3 ? `${roundId}-d${S ? S.deck.length : 0}` : `${roundId}`}
                flyDelay={hand.length === 4 && i === 3 ? 0 : (i * tableSeats + seat) * DEAL_STAGGER} />
            ))}
          </div>
        </div>
      </div>
    );
  };

  // ---- shared setup controls: identical on the first menu and between rounds ----
  const pillCaption = (text) => (
    <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,.55)', textTransform: 'uppercase', letterSpacing: 1 }}>{text}</div>
  );
  const setupControls = (
    <>
      {pillCaption('Stake')}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
        {STAKES.map(s => (
          <OptionBtn key={s} selected={stake === s} disabled={balanceRef.current < s} onClick={() => setStake(s)} style={{ padding: '7px 12px', fontSize: 12.5 }}>{s}</OptionBtn>
        ))}
      </div>
      {pillCaption('Players')}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
        {SEAT_CHOICES.map(n => (
          <OptionBtn key={n} selected={seats === n} onClick={() => setSeats(n)} style={{ padding: '7px 12px', fontSize: 12.5 }}>
            {n} <span style={{ fontSize: 9.5, fontWeight: 600, opacity: 0.7 }}>({n - 1} bot{n > 2 ? 's' : ''})</span>
          </OptionBtn>
        ))}
      </div>
      <div style={{ fontSize: 12.5, color: C.sub }}>
        Pot <b style={{ color: C.gold }}>{stake * seats}</b> · win <b style={{ color: C.green }}>+{winFor(stake, seats)}</b> coins
      </div>
    </>
  );

  // The first menu is styled exactly like the between-rounds screen: the same
  // dark overlay over the table, same pills, same buttons.
  const menuOverlay = (
    <div style={{ position: 'absolute', inset: 0, zIndex: 6, background: 'rgba(10,8,20,.55)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, textAlign: 'center', padding: 16 }}>
      <div style={{ fontSize: 22, fontWeight: 800, color: C.gold, fontFamily: "var(--font-display, 'Bricolage Grotesque', sans-serif)" }}>Take your seat</div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 5, alignItems: 'center', fontSize: 12.5, color: C.sub }}>
        Balance <b style={{ color: C.gold, display: 'inline-flex', alignItems: 'center', gap: 3 }}><RewardIcon kind="coins" size={13} />{balance}</b>
      </div>
      {setupControls}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginTop: 2 }}>
        <GameBtn full={false} disabled={balance < stake} onClick={enterGame}>Deal me in — stake {stake}</GameBtn>
        <div style={{ display: 'flex', gap: 8 }}>
          <GameBtn full={false} variant="ghost" onClick={() => setScreen('tutorial')} style={{ padding: '10px 16px', fontSize: 13 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><GraduationCap size={15} /> Start tutorial</span>
          </GameBtn>
          <GameBtn full={false} variant="ghost" onClick={() => setScreen('rules')} style={{ padding: '10px 16px', fontSize: 13 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><BookOpen size={15} /> Rules</span>
          </GameBtn>
        </div>
      </div>
      {hint && <div style={{ fontSize: 12, color: C.gold }}>{hint}</div>}
      <div style={{ fontSize: 10.5, color: 'rgba(255,255,255,.5)', lineHeight: 1.5, maxWidth: 340 }}>
        Triple + follower (7·7·7·8) or pair + run (5·5·7·8) wins. No free plays — every round is staked.
        The bots play fair: they see only their own cards and the discards.
      </div>
    </div>
  );

  // ---- everything lives ON the one table scene ----
  return (
    <GameShell title="🃏 Njuka Boss" onClose={onClose} closing={closing} onHelp={() => setShowTutorial(true)} maxWidth={680} fullBleed>
      <style>{`
        .njk-root { position: relative; display: flex; flex-direction: column; }
        .njk-scene { position: relative; height: 560px; flex: none; border-radius: 18px; overflow: hidden; border: 1px solid rgba(255,255,255,.09); }
        .njk-bg { position: absolute; inset: 0; background: #1e1a36 url(/images/njuka-table.jpg) center top / cover no-repeat; transition: filter .7s ease; }
        .njk-hand > div { touch-action: none; }
        @media (max-width: 640px) {
          .njk-root { flex: 1 1 auto; min-height: 0; }
          .njk-scene { flex: 1 1 auto; height: auto; min-height: 340px; }
          .njk-hand > div { width: 68px !important; height: 99px !important; }
        }
      `}</style>

      <div className="njk-root">
        {screen === 'table' && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11.5, color: C.sub, marginBottom: 6, flex: 'none' }}>
            <span>Stake <b style={{ color: C.text }}>{S ? S.stake : stake}</b></span>
            <span style={{ color: sessionNet >= 0 ? C.green : C.red, fontWeight: 800 }}>{sessionNet >= 0 ? '+' : ''}{sessionNet} session</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}><RewardIcon kind="coins" size={12} /><b style={{ color: C.text }}>{balance}</b></span>
          </div>
        )}

        <div className="njk-scene">
          {/* the table — blurred while choosing, sharp in play and in the tutorial */}
          <div className="njk-bg" style={{ filter: inMenu ? 'blur(9px) brightness(.55) saturate(.9)' : 'none' }} />

          {screen === 'tutorial' ? (
            <NjukaTutorial onExit={() => setScreen('stake')} />
          ) : screen === 'rules' ? (
            <NjukaRules onBack={() => setScreen('stake')} />
          ) : inMenu ? menuOverlay : (
            <>
              {Array.from({ length: tableSeats - 1 }, (_, k) => seatEl(k + 1))}

              {/* pot — the fixed focal anchor at table center */}
              <div id="njk-pot" style={{ position: 'absolute', left: '50%', top: '40%', transform: 'translate(-50%, -50%)', textAlign: 'center', zIndex: 2 }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(10,8,22,.6)', borderRadius: 999, padding: '4px 12px', border: `1px solid ${GOLD_EDGE}` }}>
                  <span style={{ width: 12, height: 12, borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%, #f5d878, #e6ad4a 55%, #a97a24)', display: 'inline-block' }} />
                  <b style={{ fontSize: 13, color: C.gold }}>{(S ? S.stake : stake) * tableSeats}</b>
                </div>
              </div>

              {/* deck + discard on the felt */}
              <div style={{ position: 'absolute', left: '50%', top: '54%', transform: 'translate(-50%, -50%)', display: 'flex', gap: 22, alignItems: 'flex-end', zIndex: 2 }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 9, letterSpacing: 1, color: 'rgba(255,255,255,.75)', textTransform: 'uppercase', marginBottom: 3, textShadow: '0 1px 3px rgba(0,0,0,.8)' }}>Deck · {S ? S.deck.length : 0}</div>
                  <div id="njk-deck">
                    <NjukaCard hidden w={46} tappable={canDraw} glow={canDraw ? C.gold : null} onClick={canDraw ? playerDraw : undefined} />
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 9, letterSpacing: 1, color: 'rgba(255,255,255,.75)', textTransform: 'uppercase', marginBottom: 3, textShadow: '0 1px 3px rgba(0,0,0,.8)' }}>Discard</div>
                  <div id="njk-discard">
                    {topDiscard ? (
                      <NjukaCard card={topDiscard} w={46}
                        outline={claimable ? C.red : null}
                        glow={claimable ? C.red : null}
                        flyFrom={lastDiscarderRef.current != null ? seatDomId(lastDiscarderRef.current) : null}
                        flyKey={S ? S.discard.length : null}
                        onClick={claimable ? () => claimFireRef.current && claimFireRef.current() : undefined} />
                    ) : (
                      <div style={{ width: 46, height: 67, borderRadius: 6, border: '1.5px dashed rgba(255,255,255,.28)', background: 'rgba(0,0,0,.22)' }} />
                    )}
                  </div>
                </div>
              </div>

              {/* your side of the table: hint+timer, hand, actions — all ON the scene */}
              <div style={{ position: 'absolute', left: 0, right: 0, bottom: 8, zIndex: 3, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, pointerEvents: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 26 }}>
                  {myTurn && (
                    <div style={{ width: 24, height: 24, borderRadius: '50%', flex: 'none', display: 'grid', placeItems: 'center', background: `conic-gradient(${timerFrac < 0.25 ? C.red : C.gold} ${timerFrac * 360}deg, rgba(0,0,0,.45) 0deg)` }}>
                      <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'rgba(12,10,24,.9)' }} />
                    </div>
                  )}
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: '#fff', textShadow: '0 1px 4px rgba(0,0,0,.9)', textAlign: 'center' }}>{hint}</div>
                </div>

                <div id="njk-hand" className="njk-hand" style={{ display: 'flex', gap: 10, justifyContent: 'center', alignItems: 'flex-end', pointerEvents: 'auto' }}>
                  {((S && S.hands[0]) || []).map((card, i) => (
                    <NjukaCard key={`${card.r}${card.s}`} card={card} w={62}
                      tappable={canDiscard || !!swapSel}
                      picked={!!swapSel && swapSel.includes(i)}
                      flyFrom="njk-deck"
                      flyKey={S && S.hands[0].length >= 3 && i < 3 && S.discard.length === 0 && S.deck.length === 52 - tableSeats * 3 ? `${roundId}` : null}
                      flyDelay={i * tableSeats * DEAL_STAGGER}
                      flipKey={i === 3 ? drawAnimKey : null}
                      onPointerDown={(e) => onCardPointerDown(e, i)}
                      onPointerMove={onCardPointerMove}
                      onPointerUp={onCardPointerUp}
                      onClick={(e) => {
                        if (e.currentTarget.dataset.dragged) return;
                        if (swapSel) toggleSwapCard(i); else if (canDiscard) playerDiscard(i);
                      }} />
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', minHeight: 40, flexWrap: 'wrap', pointerEvents: 'auto' }}>
                  {claimable && <GameBtn full={false} variant="danger" onClick={() => claimFireRef.current && claimFireRef.current()} style={{ boxShadow: `0 0 18px ${C.red}` }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Zap size={15} /> TAP TO WIN</span></GameBtn>}
                  {haveWin && !swapSel && <GameBtn full={false} onClick={declareWin} style={{ boxShadow: '0 0 18px rgba(79,169,139,.8)' }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><PartyPopper size={15} /> Declare NJUKA</span></GameBtn>}
                  {canOfferSwap && <GameBtn full={false} variant="ghost" onClick={() => { setSwapSel([]); setHint('Pick 2 cards forming a pair or run to throw'); }}>Swap a pair</GameBtn>}
                  {swapSel && <GameBtn full={false} disabled={!swapValid} onClick={confirmSwap}>Throw &amp; draw</GameBtn>}
                  {swapSel && <GameBtn full={false} variant="ghost" onClick={() => { setSwapSel(null); setHint('Tap a card to discard'); }}>Cancel</GameBtn>}
                </div>
              </div>

              {banner && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(10,8,20,.86)', zIndex: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, textAlign: 'center', padding: 16 }}>
                  <div style={{ fontSize: 22, fontWeight: 800, color: banner.kind === 'win' ? C.gold : C.text, fontFamily: "var(--font-display, 'Bricolage Grotesque', sans-serif)" }}>{banner.title}</div>
                  {banner.cards.length > 0 && (
                    <div style={{ display: 'flex', gap: 7 }}>
                      {banner.cards.map((card, i) => (
                        <NjukaCard key={i} card={card} w={44} flipKey={`banner-${i}`} />
                      ))}
                    </div>
                  )}
                  <div style={{ fontSize: 12.5, color: C.sub }}>{banner.sub}</div>
                  {nextIn != null && <div style={{ fontSize: 12, color: C.muted }}>Next round in {nextIn}s — stake {stake}</div>}
                  {setupControls}
                  <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                    <GameBtn full={false} onClick={() => startRound()}>Deal now</GameBtn>
                    <GameBtn full={false} variant="ghost" onClick={leaveTable}>Leave table</GameBtn>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showTutorial && <TutorialModal tutorialKey="njuka" onClose={() => setShowTutorial(false)} />}
    </GameShell>
  );
}
