'use client';

import React from 'react';
import { C } from './tokens';
import RedesignShell, { GreenBtn, SectionTitle, Card, Thumb, Badge, RewardIcon } from './RedesignShell';
import { IMAGES } from '@/lib/data/images';
import { MINIGAMES, MATCHES } from '@/lib/data/platform';

const SUBS = [
  { key: 'play.minigames', label: 'Games' },
  { key: 'play.predictions', label: 'Predict' },
  { key: 'play.daily', label: 'Daily' },
];

function SubNav({ tab, onNavigate }) {
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

function GameCard({ g, free, onPlay }) {
  const out = free <= 0;
  return (
    <Card style={{ overflow: 'hidden', cursor: out ? 'default' : 'pointer', opacity: out ? 0.72 : 1 }}>
      <div onClick={() => !out && onPlay && onPlay(g.id)} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ position: 'relative' }}>
          <Thumb src={IMAGES[g.image]} alt={g.name} h={82} radius={0} />
          {g.isNew && <span style={{ position: 'absolute', top: 6, left: 6, zIndex: 2 }}><Badge bg={C.red} color="#fff">New</Badge></span>}
          <span style={{ position: 'absolute', top: 6, right: 6, zIndex: 2, fontSize: 9.5, fontWeight: 800, padding: '2px 6px', borderRadius: 5, background: free > 0 ? 'rgba(79,169,139,.92)' : 'rgba(0,0,0,.55)', color: free > 0 ? '#08210f' : C.sub }}>
            {free > 0 ? `${free} FREE` : '0'}
          </span>
        </div>
        <div style={{ padding: '9px 10px', display: 'flex', flexDirection: 'column', gap: 7, flex: 1 }}>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: C.text, lineHeight: 1.2 }}>{g.name}</div>
          <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 800, padding: '5px 13px', borderRadius: 7, background: out ? C.track : C.green, color: out ? C.muted : '#08210f' }}>{out ? 'No plays' : 'Play'}</span>
            <span style={{ fontSize: 10.5, color: C.muted, display: 'inline-flex', alignItems: 'center', gap: 3 }}>{free > 0 ? 'Free' : <><RewardIcon kind="coins" size={13} />{g.cost}</>}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

function GamesGrid({ gamePlays, onPlay }) {
  return (
    <section>
      <SectionTitle>Minigames</SectionTitle>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
        {MINIGAMES.map((g) => <GameCard key={g.id} g={g} free={gamePlays?.[g.id] ?? 0} onPlay={onPlay} />)}
      </div>
    </section>
  );
}

function Predictions({ onNavigate }) {
  return (
    <section>
      <SectionTitle>Match Predictions</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {MATCHES.slice(0, 6).map((m) => (
          <Card key={m.id} style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 3 }}>{m.flag} {m.league} · {m.time}</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{m.home} <span style={{ color: C.muted }}>vs</span> {m.away}</div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[['1', m.h], ['X', m.d], ['2', m.a]].map(([k, v]) => (
                <div key={k} style={{ minWidth: 46, textAlign: 'center', background: C.track, borderRadius: 8, padding: '6px 8px' }}>
                  <div style={{ fontSize: 9.5, color: C.muted }}>{k}</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: C.text }}>{v}</div>
                </div>
              ))}
            </div>
            <GreenBtn onClick={() => onNavigate && onNavigate('play.predictions')}>Bet</GreenBtn>
          </Card>
        ))}
      </div>
    </section>
  );
}

function Daily({ onNavigate }) {
  return (
    <section>
      <SectionTitle>Daily Hub</SectionTitle>
      <Card style={{ padding: 16, display: 'flex', gap: 14, alignItems: 'center' }}>
        <div style={{ width: 120, flex: 'none' }}><Thumb src={IMAGES.dailyChallenge || IMAGES.brainQuiz} alt="Daily" h={90} /></div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>Daily challenge + free spins</div>
          <div style={{ fontSize: 12, color: C.sub, marginBottom: 12 }}>Answer today's trivia and claim your free spins & coin bonus.</div>
          <GreenBtn onClick={() => onNavigate && onNavigate('play.daily')}>Open Daily Hub</GreenBtn>
        </div>
      </Card>
    </section>
  );
}

export default function PlayView({ tab = 'play.minigames', points = '0', missionsCount = 0, badges = 0, xp = 0, gamePlays, onNavigate, onOpenProfile, onPlay }) {
  return (
    <RedesignShell points={points} missionsCount={missionsCount} badges={badges} xp={xp} activeTab="play" onNavigate={onNavigate} onOpenProfile={onOpenProfile}>
      <SubNav tab={tab} onNavigate={onNavigate} />
      {tab === 'play.predictions' && <Predictions onNavigate={onNavigate} />}
      {tab === 'play.daily' && <Daily onNavigate={onNavigate} />}
      {(tab === 'play' || tab === 'play.minigames' || (!tab.startsWith('play.predictions') && !tab.startsWith('play.daily'))) && <GamesGrid gamePlays={gamePlays} onPlay={onPlay} />}
    </RedesignShell>
  );
}
