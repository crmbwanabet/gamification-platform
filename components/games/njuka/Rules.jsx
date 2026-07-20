'use client';

import React from 'react';
import { Target, Sparkles, RotateCw, Zap, Repeat2, Timer, Coins, X } from 'lucide-react';
import { C } from '@/components/redesign/tokens';
import { GameBtn } from '../gameKit';
import { NjukaCard } from './Card';
import { GAME_ECONOMY } from '@/lib/data/platform';

// Full Njuka rules, shown over the blurred table in the same overlay style as
// the menu. Winning shapes are rendered with real cards, not described.

const GOLD_EDGE = 'rgba(230,173,74,.45)';

const cardRow = (cards, gap = 5) => (
  <div style={{ display: 'flex', gap, justifyContent: 'center', margin: '6px 0 2px' }}>
    {cards.map((c, i) => (typeof c === 'string'
      ? <div key={i} style={{ alignSelf: 'center', fontSize: 15, fontWeight: 800, color: C.sub, padding: '0 2px' }}>{c}</div>
      : <NjukaCard key={i} card={c} w={34} />))}
  </div>
);

function Section({ icon: Icon, title, children }) {
  return (
    <div style={{ textAlign: 'left', marginBottom: 13 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 4 }}>
        <span style={{ width: 24, height: 24, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'rgba(230,173,74,.14)', color: C.gold }}><Icon size={14} /></span>
        <span style={{ fontSize: 13, fontWeight: 800, color: C.text }}>{title}</span>
      </div>
      <div style={{ fontSize: 12, color: C.sub, lineHeight: 1.6 }}>{children}</div>
    </div>
  );
}

export default function NjukaRules({ onBack }) {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 6, background: 'rgba(10,8,20,.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 12 }}>
      <div style={{
        width: '100%', maxWidth: 400, maxHeight: '100%', overflowY: 'auto', borderRadius: 18,
        background: 'rgba(12,10,24,.93)', border: `1px solid ${GOLD_EDGE}`, padding: '16px 16px 14px',
        boxShadow: '0 18px 50px rgba(0,0,0,.6)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ width: 30 }} />
          <div style={{ fontSize: 18, fontWeight: 800, color: C.gold, fontFamily: "var(--font-display, 'Bricolage Grotesque', sans-serif)" }}>How Njuka works</div>
          <button type="button" onClick={onBack} style={{ width: 30, height: 30, borderRadius: 9, border: 'none', background: 'rgba(255,255,255,.08)', color: C.sub, cursor: 'pointer', display: 'grid', placeItems: 'center' }}><X size={16} /></button>
        </div>

        <Section icon={Target} title="The goal">
          Be the first to hold a winning 4-card hand. The winner takes the whole pot — every player&apos;s stake.
        </Section>

        <Section icon={Sparkles} title="The two winning hands">
          <b style={{ color: C.text }}>Triple + follower</b> — three of a kind plus one connected card:
          {cardRow([{ r: 7, s: '♠' }, { r: 7, s: '♥' }, { r: 7, s: '♦' }, { r: 8, s: '♣' }])}
          <b style={{ color: C.text }}>Pair + run</b> — a pair plus two connected cards:
          {cardRow([{ r: 5, s: '♠' }, { r: 5, s: '♥' }, { r: 7, s: '♦' }, { r: 8, s: '♣' }])}
          What connects: numbers next to each other (A counts as 1, below 2 only).
          J, Q and K connect to <i>each other</i> in any order — but never to a number, so
          {cardRow([{ r: 10, s: '♠' }, '✕', { r: 11, s: '♥' }])}
          10 and J do NOT connect.
        </Section>

        <Section icon={RotateCw} title="Your turn">
          Draw a card from the deck. If your 4 cards now win — declare NJUKA and take the pot.
          Otherwise discard one card (tap it, or drag it onto the pile) and play moves on.
        </Section>

        <Section icon={Zap} title="Claims — the fastest win">
          If anyone discards a <b style={{ color: C.text }}>number card</b> that completes YOUR hand, the pile glows —
          tap it before a bot does and you win instantly. J, Q and K can never be claimed; you must draw those yourself.
          Cards thrown during a swap can&apos;t be claimed either.
        </Section>

        <Section icon={Repeat2} title="Swap a pair">
          Holding two pairs (or two runs) after drawing? You may throw one pair — nobody can claim it — and draw a
          fresh card. Your turn then ends.
        </Section>

        <Section icon={Timer} title="The clock">
          Each of your turns lasts 15 seconds. If time runs out the game plays a sensible move for you — you never
          lose your stake to the clock. And if you walk away, the table stops dealing new rounds for you.
        </Section>

        <Section icon={Coins} title="Stakes & payout">
          Every round is staked — there are no free plays. All seats pay the stake into the pot; win and you profit
          your stake × your opponents (capped at {GAME_ECONOMY.MAX_WIN} coins). Example: stake 25 at a 4-player
          table pays +75.
        </Section>

        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}>
          <GameBtn full={false} onClick={onBack} style={{ padding: '10px 22px', fontSize: 13.5 }}>Got it</GameBtn>
        </div>
      </div>
    </div>
  );
}
