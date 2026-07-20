'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MousePointerClick, Trophy, PartyPopper } from 'lucide-react';
import { C } from '@/components/redesign/tokens';
import { GameBtn } from '../gameKit';
import { NjukaCard } from './Card';

// ============================================================================
// NJUKA TUTORIAL — an interactive guided tour on a STAGED table.
// No engine, no timers, no coins: every card is hand-picked so each concept
// can be demonstrated (draw a junk King, throw it, then claim a 9 that
// completes 7·7·8). A spotlight hole walks through every element and the
// three core actions are performed by the player for real.
// Rendered inside the NjukaGame scene in place of the live game.
// ============================================================================

const GOLD_EDGE = 'rgba(230,173,74,.45)';
const BOTS = [
  { name: 'Mwape', hue: '#8e6fd8', pos: { left: '27%', top: '14%' } },
  { name: 'Bwalya', hue: '#3f9a7b', pos: { left: '50%', top: '9%' } },
  { name: 'Zulu', hue: '#c96f4a', pos: { left: '70%', top: '13%' } },
];
const START_HAND = [{ r: 7, s: '♠' }, { r: 7, s: '♥' }, { r: 8, s: '♦' }];
const DRAWN = { r: 13, s: '♣' };  // the junk King you'll throw
const CLAIM_CARD = { r: 9, s: '♣' }; // completes 7·7 + 8·9

const STEPS = [
  { id: 'welcome', target: null, title: 'Welcome to Njuka Boss', text: 'The Zambian card classic. Build a winning 4-card hand before anyone else and take the whole pot. This tour walks you through every part of the table — nothing here costs coins.' },
  { id: 'pot', target: 'njk-pot', title: 'The pot', text: 'Every player at the table pays the stake into the pot when a round is dealt. Win the round and the entire pot is yours.' },
  { id: 'seats', target: 'njk-seat-2', title: 'Your opponents', text: 'You play against bots — always labeled, never hidden. They play 100% fair: like you, they see only their own cards and the discard pile. No peeking, ever.' },
  { id: 'hand', target: 'njk-hand', title: 'Your hand', text: 'You hold 3 cards and need a winning 4-card shape: a TRIPLE + FOLLOWER (7·7·7 + 8) or a PAIR + RUN (5·5 + 7·8). You already hold 7·7·8 — one good card away!' },
  { id: 'draw', target: 'njk-deck', title: 'The deck — try it!', text: 'On your turn, tap the glowing deck to draw a 4th card.', waitFor: 'draw', doneText: 'You drew the K♣.' },
  { id: 'discard', target: 'njk-hand', title: 'Discard — try it!', text: 'Four cards is one too many. That K♣ is useless — tap it to throw it on the pile (in a real round you can also drag it there).', waitFor: 'discard' },
  { id: 'claim', target: 'njk-discard', title: 'The claim — try it!', text: 'Mwape just threw a 9♣ — and it completes your 7·7 + 8·9! When a number card finishes your hand, the pile glows red. TAP IT before a bot beats you to it!', waitFor: 'claim' },
  { id: 'declare', target: 'njk-tut-declare', title: 'Declaring a win', text: 'When you build the winning hand from your own draw instead, this green button appears — tap it and the pot is yours. Face cards (J, Q, K) can never be claimed off the pile; you must draw those yourself.' },
  { id: 'swap', target: 'njk-tut-swap', title: 'Swap a pair', text: 'Dealt two pairs and stuck? The Swap button appears whenever your 4 cards hold two pairs or runs — throw one pair (nobody can claim those) and draw a fresh card.' },
  { id: 'timer', target: 'njk-tut-timer', title: 'The turn timer', text: 'Each of your turns lasts 15 seconds — the gold ring counts it down. If time runs out, the game simply plays a sensible move for you. You never forfeit your stake to the clock.' },
  { id: 'done', target: null, title: "You're ready!", text: 'Pick a stake and a table size, tap "Deal me in", and go claim some pots. Remember: every round is staked — there are no free plays at this table.' },
];

function useSpotRect(targetId, stepIdx) {
  const [rect, setRect] = useState(null);
  useEffect(() => {
    const compute = () => {
      if (!targetId) { setRect(null); return; }
      const scene = document.getElementById('njk-tut-scene');
      const el = document.getElementById(targetId);
      if (!scene || !el) { setRect(null); return; }
      const s = scene.getBoundingClientRect();
      const r = el.getBoundingClientRect();
      setRect({ left: r.left - s.left, top: r.top - s.top, width: r.width, height: r.height, sceneH: s.height });
    };
    // wait a tick so the step's demo elements have mounted
    const t = setTimeout(compute, 60);
    window.addEventListener('resize', compute);
    return () => { clearTimeout(t); window.removeEventListener('resize', compute); };
  }, [targetId, stepIdx]);
  return rect;
}

export default function NjukaTutorial({ onExit }) {
  const [step, setStep] = useState(0);
  const [hand, setHand] = useState(START_HAND);
  const [pileCard, setPileCard] = useState(null);
  const [celebrate, setCelebrate] = useState(false);
  const timersRef = useRef([]);
  const later = (fn, ms) => { const t = setTimeout(fn, ms); timersRef.current.push(t); };
  useEffect(() => () => timersRef.current.forEach(clearTimeout), []);

  const cur = STEPS[step];
  const rect = useSpotRect(cur.target, step);
  const waiting = !!cur.waitFor && !celebrate;

  // stage the claim card on the pile when the claim step begins
  useEffect(() => {
    if (cur.id === 'claim') setPileCard(CLAIM_CARD);
  }, [cur.id]);

  const next = () => { setCelebrate(false); setStep(s => Math.min(s + 1, STEPS.length - 1)); };
  const back = () => {
    setCelebrate(false);
    // rewind staged state to match earlier steps
    const target = Math.max(0, step - 1);
    if (target <= 4) { setHand(START_HAND); setPileCard(null); }
    else if (target === 5) { setHand([...START_HAND, DRAWN]); setPileCard(null); }
    else if (target === 6) { setHand(START_HAND); setPileCard(CLAIM_CARD); }
    setStep(target);
  };

  const tutDraw = () => {
    if (cur.id !== 'draw') return;
    setHand(h => (h.length === 3 ? [...h, DRAWN] : h));
    later(next, 700);
  };
  const tutDiscard = (i) => {
    if (cur.id !== 'discard') return;
    if (hand[i].r !== DRAWN.r) return; // only the King goes — the rest is your win
    setHand(START_HAND);
    setPileCard(DRAWN);
    later(() => { setPileCard(null); next(); }, 600);
  };
  const tutClaim = () => {
    if (cur.id !== 'claim' || celebrate) return;
    setHand([...START_HAND, CLAIM_CARD]);
    setCelebrate(true);
    later(() => { next(); setHand(START_HAND); setPileCard(null); }, 1600);
  };

  const captionOnTop = rect ? rect.top + rect.height / 2 > rect.sceneH / 2 : false;
  const glowPile = cur.id === 'claim' && !celebrate;

  return (
    <div id="njk-tut-scene" style={{ position: 'absolute', inset: 0, zIndex: 4 }}>
      {/* --- staged table (mirrors the live layout) --- */}
      {BOTS.map((b, k) => (
        <div key={b.name} id={`njk-seat-${k + 1}`} style={{ position: 'absolute', ...b.pos, transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4, background: 'rgba(10,8,22,.45)', borderRadius: 12, padding: '6px 10px 8px', minWidth: 92 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', display: 'grid', placeItems: 'center', background: b.hue, color: '#fff', fontSize: 13, fontWeight: 800, boxShadow: '0 0 0 2px rgba(255,255,255,.15)' }}>{b.name[0]}</div>
              <div style={{ fontSize: 11.5, fontWeight: 800, color: C.text, textShadow: '0 1px 3px rgba(0,0,0,.8)' }}>
                {b.name} <span style={{ fontSize: 8.5, fontWeight: 600, color: 'rgba(255,255,255,.55)' }}>bot</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {[0, 1, 2].map(i => <NjukaCard key={i} w={28} hidden />)}
            </div>
          </div>
        </div>
      ))}

      <div id="njk-pot" style={{ position: 'absolute', left: '50%', top: '40%', transform: 'translate(-50%, -50%)' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'rgba(10,8,22,.6)', borderRadius: 999, padding: '4px 12px', border: `1px solid ${GOLD_EDGE}` }}>
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%, #f5d878, #e6ad4a 55%, #a97a24)', display: 'inline-block' }} />
          <b style={{ fontSize: 13, color: C.gold }}>40</b>
        </div>
      </div>

      <div style={{ position: 'absolute', left: '50%', top: '54%', transform: 'translate(-50%, -50%)', display: 'flex', gap: 22, alignItems: 'flex-end' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 9, letterSpacing: 1, color: 'rgba(255,255,255,.75)', textTransform: 'uppercase', marginBottom: 3, textShadow: '0 1px 3px rgba(0,0,0,.8)' }}>Deck</div>
          <div id="njk-deck">
            <NjukaCard hidden w={46} tappable={cur.id === 'draw'} glow={cur.id === 'draw' ? C.gold : null} onClick={tutDraw} />
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 9, letterSpacing: 1, color: 'rgba(255,255,255,.75)', textTransform: 'uppercase', marginBottom: 3, textShadow: '0 1px 3px rgba(0,0,0,.8)' }}>Discard</div>
          <div id="njk-discard">
            {pileCard ? (
              <NjukaCard card={pileCard} w={46} outline={glowPile ? C.red : null} glow={glowPile ? C.red : null} onClick={tutClaim} />
            ) : (
              <div style={{ width: 46, height: 67, borderRadius: 6, border: '1.5px dashed rgba(255,255,255,.28)', background: 'rgba(0,0,0,.22)' }} />
            )}
          </div>
        </div>
      </div>

      {/* your side: demo timer ring + hand + demo action buttons */}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
        <div id="njk-tut-timer" style={{ width: 24, height: 24, borderRadius: '50%', display: 'grid', placeItems: 'center', background: `conic-gradient(${C.gold} 260deg, rgba(0,0,0,.45) 0deg)` }}>
          <div style={{ width: 16, height: 16, borderRadius: '50%', background: 'rgba(12,10,24,.9)' }} />
        </div>
        <div id="njk-hand" style={{ display: 'flex', gap: 10, justifyContent: 'center', alignItems: 'flex-end' }}>
          {hand.map((card, i) => (
            <NjukaCard key={`${card.r}${card.s}`} card={card} w={62}
              tappable={cur.id === 'discard' && card.r === DRAWN.r}
              glow={cur.id === 'discard' && card.r === DRAWN.r ? C.gold : celebrate ? C.gold : null}
              flipKey={card.r === DRAWN.r ? 'tut-drawn' : null}
              onClick={() => tutDiscard(i)} />
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', minHeight: 40 }}>
          {cur.id === 'declare' && <div id="njk-tut-declare"><GameBtn full={false} style={{ boxShadow: '0 0 18px rgba(79,169,139,.8)' }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><PartyPopper size={15} /> Declare NJUKA</span></GameBtn></div>}
          {cur.id === 'swap' && <div id="njk-tut-swap"><GameBtn full={false} variant="ghost">Swap a pair</GameBtn></div>}
        </div>
      </div>

      {celebrate && (
        <div style={{ position: 'absolute', left: '50%', top: '30%', transform: 'translate(-50%, -50%)', zIndex: 9, display: 'flex', alignItems: 'center', gap: 10, fontSize: 24, fontWeight: 800, color: C.gold, fontFamily: "var(--font-display, 'Bricolage Grotesque', sans-serif)", textShadow: '0 2px 14px rgba(0,0,0,.9)', whiteSpace: 'nowrap' }}>
          <Trophy size={26} /> NJUKA! You&apos;d win the pot
        </div>
      )}

      {/* --- spotlight: hole punched over the current target --- */}
      {rect ? (
        <div style={{
          position: 'absolute', left: rect.left - 8, top: rect.top - 8, width: rect.width + 16, height: rect.height + 16,
          borderRadius: 14, boxShadow: '0 0 0 4000px rgba(8,6,18,.78)', border: `2px solid ${C.gold}`,
          pointerEvents: 'none', zIndex: 7, transition: 'all .35s ease',
        }} />
      ) : (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(8,6,18,.66)', zIndex: 7, pointerEvents: 'none' }} />
      )}

      {/* --- caption card --- */}
      <div style={{
        position: 'absolute', left: 12, right: 12, zIndex: 8,
        ...(captionOnTop ? { top: 12 } : { bottom: 12 }),
        background: 'rgba(12,10,24,.92)', border: `1px solid ${GOLD_EDGE}`, borderRadius: 16,
        padding: '13px 14px 12px', textAlign: 'center', boxShadow: '0 12px 34px rgba(0,0,0,.55)',
      }}>
        <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,.45)', letterSpacing: 1, marginBottom: 4 }}>{step + 1} / {STEPS.length}</div>
        <div style={{ fontSize: 15.5, fontWeight: 800, color: C.gold, fontFamily: "var(--font-display, 'Bricolage Grotesque', sans-serif)", marginBottom: 5 }}>{cur.title}</div>
        <div style={{ fontSize: 12.5, color: C.sub, lineHeight: 1.55, marginBottom: 10 }}>{cur.text}</div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', alignItems: 'center' }}>
          <GameBtn full={false} variant="ghost" onClick={onExit} style={{ padding: '9px 14px', fontSize: 13 }}>Skip</GameBtn>
          {step > 0 && !waiting && <GameBtn full={false} variant="ghost" onClick={back} style={{ padding: '9px 14px', fontSize: 13 }}>Back</GameBtn>}
          {waiting ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 700, color: C.gold }}><MousePointerClick size={15} /> Try it on the table</span>
          ) : step < STEPS.length - 1 ? (
            <GameBtn full={false} onClick={next} style={{ padding: '9px 18px', fontSize: 13 }}>Next</GameBtn>
          ) : (
            <GameBtn full={false} onClick={onExit} style={{ padding: '9px 18px', fontSize: 13 }}>Take a seat</GameBtn>
          )}
        </div>
      </div>
    </div>
  );
}
