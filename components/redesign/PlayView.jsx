'use client';

import React from 'react';
import { C } from './tokens';
import RedesignShell, { SectionTitle, Card, Thumb, Badge, RewardIcon } from './RedesignShell';
import { IMAGES } from '@/lib/data/images';
import { MINIGAMES } from '@/lib/data/platform';

const SUBS = [
  { key: 'play.minigames', label: 'Games' },
  // Predictions + Daily (trivia) PARKED — components live in
  // parked/components/redesign/PlayView.parked.jsx; re-add entries here to restore
];

function SubNav({ tab, onNavigate }) {
  if (SUBS.length < 2) return null;
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
      {SUBS.map((s) => {
        const active = tab === s.key;
        return (
          <button key={s.key} onClick={() => onNavigate && onNavigate(s.key)} style={{
            padding: '8px 18px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 800,
            background: active ? C.green : C.panel2, color: active ? '#08210f' : C.sub,
          }}>{s.label}</button>
        );
      })}
    </div>
  );
}

function GameCard({ g, free, onPlay, i = 0 }) {
  const out = !g.stakeOnly && free <= 0;
  return (
    <Card className="card-enter" style={{ overflow: 'hidden', cursor: out ? 'default' : 'pointer', opacity: out ? 0.72 : 1, animationDelay: `${i * 45}ms` }}>
      <div onClick={() => !out && onPlay && onPlay(g.id)} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
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
            <span style={{ fontSize: 11, fontWeight: 800, padding: '5px 13px', borderRadius: 7, background: out ? C.track : C.green, color: out ? C.muted : '#08210f' }}>{out ? 'No plays' : 'Play'}</span>
            <span style={{ fontSize: 10.5, color: C.muted, display: 'inline-flex', alignItems: 'center', gap: 3 }}>{g.stakeOnly ? <><RewardIcon kind="coins" size={13} />5–50</> : free > 0 ? 'Free' : <><RewardIcon kind="coins" size={13} />{g.cost}</>}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

function GamesGrid({ gamePlays, onPlay, games }) {
  return (
    <section>
      <SectionTitle>Minigames</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
        {(games || MINIGAMES).map((g, i) => <GameCard key={g.id} i={i} g={g} free={gamePlays?.[g.id] ?? 0} onPlay={onPlay} />)}
      </div>
    </section>
  );
}

export default function PlayView({ tab = 'play.minigames', points = '0', missionsCount = 0, badges = 0, xp = 0, gamePlays, onNavigate, onOpenProfile, onPlay, userId = null, navBadges = {}, games = null }) {
  return (
    <RedesignShell points={points} missionsCount={missionsCount} badges={badges} xp={xp} userId={userId} navBadges={navBadges} activeTab="play" onNavigate={onNavigate} onOpenProfile={onOpenProfile}>
      <SubNav tab={tab} onNavigate={onNavigate} />
      {/* Predictions + Daily (trivia) parked — see parked/components/redesign/PlayView.parked.jsx */}
      <GamesGrid gamePlays={gamePlays} onPlay={onPlay} games={games} />
    </RedesignShell>
  );
}
