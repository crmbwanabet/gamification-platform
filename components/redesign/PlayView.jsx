'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { C } from './tokens';
import RedesignShell, { SectionTitle, Card, Thumb, Badge, RewardIcon } from './RedesignShell';
import DailyTriviaChallenge from '@/components/ui/DailyTriviaChallenge';
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

const PRED_OPTS = [{ key: 'home', label: '1', sub: 'Home' }, { key: 'draw', label: 'X', sub: 'Draw' }, { key: 'away', label: '2', sub: 'Away' }];
const oddsFor = (m, k) => (k === 'home' ? m.h : k === 'draw' ? m.d : m.a);
const pickLabel = (m, c) => (c === 'home' ? `${m.home} win` : c === 'away' ? `${m.away} win` : 'Draw');

function Predictions({ predictions, onPredict }) {
  return (
    <section>
      <style>{`.rs-odds{transition:background .15s,border-color .15s,transform .1s}.rs-odds:hover{background:#2c303b !important;border-color:rgba(79,169,139,.6) !important}.rs-odds:active{transform:scale(.95)}`}</style>
      <SectionTitle>Match Predictions</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {MATCHES.slice(0, 6).map((m) => {
          const pred = predictions?.find((p) => p.id === m.id);
          return (
            <Card key={m.id} style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 150 }}>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 3 }}>{m.flag} {m.league} · {m.time}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{m.home} <span style={{ color: C.muted }}>vs</span> {m.away}</div>
              </div>
              {pred ? (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderRadius: 10, background: 'rgba(79,169,139,.14)', border: `1px solid ${C.green}` }}>
                  <Check size={16} color={C.green} strokeWidth={3} />
                  <span style={{ fontSize: 12.5, fontWeight: 800, color: C.text }}>{pickLabel(m, pred.choice)}</span>
                  <span style={{ fontSize: 11.5, color: C.green, fontWeight: 700 }}>@ {oddsFor(m, pred.choice)}</span>
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 6 }}>
                  {PRED_OPTS.map((o) => (
                    <button key={o.key} className="rs-odds" onClick={(e) => onPredict && onPredict(m, o.key, e.currentTarget)}
                      style={{ minWidth: 54, textAlign: 'center', background: C.track, border: '1px solid rgba(255,255,255,.06)', borderRadius: 8, padding: '7px 8px', cursor: 'pointer' }}>
                      <div style={{ fontSize: 9, color: C.muted, fontWeight: 700 }}>{o.sub}</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{oddsFor(m, o.key)}</div>
                    </button>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </section>
  );
}

function Daily({ user, onDailyAnswer, onNavigate }) {
  return (
    <section>
      <SectionTitle>Daily Challenge</SectionTitle>
      <DailyTriviaChallenge user={user} onAnswer={onDailyAnswer} onNavigate={onNavigate} />
    </section>
  );
}

export default function PlayView({ tab = 'play.minigames', points = '0', missionsCount = 0, badges = 0, xp = 0, gamePlays, onNavigate, onOpenProfile, onPlay, predictions, onPredict, user, onDailyAnswer }) {
  return (
    <RedesignShell points={points} missionsCount={missionsCount} badges={badges} xp={xp} activeTab="play" onNavigate={onNavigate} onOpenProfile={onOpenProfile}>
      <SubNav tab={tab} onNavigate={onNavigate} />
      {tab === 'play.predictions' && <Predictions predictions={predictions} onPredict={onPredict} />}
      {tab === 'play.daily' && <Daily user={user} onDailyAnswer={onDailyAnswer} onNavigate={onNavigate} />}
      {(tab === 'play' || tab === 'play.minigames' || (!tab.startsWith('play.predictions') && !tab.startsWith('play.daily'))) && <GamesGrid gamePlays={gamePlays} onPlay={onPlay} />}
    </RedesignShell>
  );
}
