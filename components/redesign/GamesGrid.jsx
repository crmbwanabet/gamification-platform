'use client';

import React from 'react';
import { C } from './tokens';
import { SectionTitle, Card, Thumb, Badge, RewardIcon } from './RedesignShell';
import { IMAGES } from '@/lib/data/images';
import { MINIGAMES } from '@/lib/data/platform';

function GameCard({ g, free, onPlay, i = 0 }) {
  // Out of free plays ≠ locked: the card stays playable as a PAID extra play
  // (playGame charges the cost or shows the not-enough-coins toast).
  const out = !g.stakeOnly && free <= 0;
  return (
    <Card className="card-enter" style={{ overflow: 'hidden', cursor: 'pointer', opacity: out ? 0.88 : 1, animationDelay: `${i * 45}ms` }}>
      <div onClick={() => onPlay && onPlay(g.id)} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ position: 'relative' }}>
          <Thumb src={IMAGES[g.image]} alt={g.name} h={82} radius={0} />
          {g.isNew && <span style={{ position: 'absolute', top: 6, left: 6, zIndex: 2 }}><Badge bg={C.red} color="#fff">New</Badge></span>}
          <span style={{ position: 'absolute', top: 6, right: 6, zIndex: 2, fontSize: 9.5, fontWeight: 800, padding: '2px 6px', borderRadius: 5, background: g.stakeOnly ? 'rgba(230,173,74,.92)' : free > 0 ? 'rgba(79,169,139,.92)' : 'rgba(0,0,0,.55)', color: g.stakeOnly ? '#2b1e04' : free > 0 ? '#08210f' : C.sub }}>
            {g.stakeOnly ? 'STAKES' : free > 0 ? `${free} FREE` : '0'}
          </span>
        </div>
        <div style={{ padding: '9px 10px', display: 'flex', flexDirection: 'column', gap: 7, flex: 1 }}>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: C.text, lineHeight: 1.2 }}>{g.name}</div>
          <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 800, padding: '5px 13px', borderRadius: 7, background: out ? C.gold : C.green, color: '#08210f' }}>{out ? 'Paid play' : 'Play'}</span>
            <span style={{ fontSize: 10.5, color: C.muted, display: 'inline-flex', alignItems: 'center', gap: 3 }}>{g.stakeOnly ? <><RewardIcon kind="coins" size={13} />{g.stakeRange ?? '5–50'}</> : free > 0 ? 'Free' : <><RewardIcon kind="coins" size={13} />{g.cost}</>}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

/**
 * The games grid (Njuka + the candy games). Lives on Home since the Play tab
 * was folded into it (2026-10); `id="home-games"` is the scroll target for
 * legacy "Go to Games" CTAs.
 */
export default function GamesGrid({ gamePlays, onPlay, games, title = 'Games' }) {
  return (
    <section id="home-games" style={{ scrollMarginTop: 12 }}>
      <SectionTitle>{title}</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
        {(games || MINIGAMES).map((g, i) => <GameCard key={g.id} i={i} g={g} free={gamePlays?.[g.id] ?? 0} onPlay={onPlay} />)}
      </div>
    </section>
  );
}
