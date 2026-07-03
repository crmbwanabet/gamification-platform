'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { C } from './tokens';
import RedesignShell, { SectionTitle, Card, Thumb, Badge, RewardIcon } from './RedesignShell';
import DailyTriviaChallenge from '@/components/ui/DailyTriviaChallenge';
import { IMAGES } from '@/lib/data/images';
import { MINIGAMES } from '@/lib/data/platform';

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

function GameCard({ g, free, onPlay, i = 0 }) {
  const out = free <= 0;
  return (
    <Card className="card-enter" style={{ overflow: 'hidden', cursor: out ? 'default' : 'pointer', opacity: out ? 0.72 : 1, animationDelay: `${i * 45}ms` }}>
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
        {MINIGAMES.map((g, i) => <GameCard key={g.id} i={i} g={g} free={gamePlays?.[g.id] ?? 0} onPlay={onPlay} />)}
      </div>
    </section>
  );
}

const PRED_OPTS = [{ key: 'home', label: '1', sub: 'Home' }, { key: 'draw', label: 'X', sub: 'Draw' }, { key: 'away', label: '2', sub: 'Away' }];
const oddsFor = (m, k) => (k === 'home' ? m.h : k === 'draw' ? m.d : m.a);
const pickLabel = (m, c) => (c === 'home' ? `${m.home} win` : c === 'away' ? `${m.away} win` : 'Draw');

function fmtKick(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const hh = String(d.getHours()).padStart(2, '0'), mm = String(d.getMinutes()).padStart(2, '0');
  const d0 = new Date(d); d0.setHours(0, 0, 0, 0);
  const n0 = new Date(); n0.setHours(0, 0, 0, 0);
  const days = Math.round((d0 - n0) / 86400000);
  const day = days <= 0 ? 'Today' : days === 1 ? 'Tomorrow'
    : days <= 6 ? d.toLocaleDateString(undefined, { weekday: 'short' })
    : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  return `${day} ${hh}:${mm}`;
}

function Predictions({ predictions, onPredict }) {
  const [matches, setMatches] = React.useState(null); // null = loading
  const [err, setErr] = React.useState(false);
  React.useEffect(() => {
    let alive = true;
    fetch('/api/matches')
      .then((r) => r.json())
      .then((d) => { if (!alive) return; if (Array.isArray(d.matches)) setMatches(d.matches); else setErr(true); })
      .catch(() => { if (alive) setErr(true); });
    return () => { alive = false; };
  }, []);

  const picks = (predictions || []).filter((p) => p.home && p.away).slice(-6).reverse();

  return (
    <section>
      <style>{`.rs-odds{transition:background .15s,border-color .15s,transform .1s}.rs-odds:hover{background:#2c303b !important;border-color:rgba(79,169,139,.6) !important}.rs-odds:active{transform:scale(.95)}`}</style>

      {picks.length > 0 && (
        <>
          <SectionTitle>Your Picks</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
            {picks.map((p) => {
              const st = p.status === 'won'
                ? { label: `Won +${p.payout}`, color: C.green, bg: 'rgba(79,169,139,.14)' }
                : p.status === 'lost'
                  ? { label: 'Lost', color: C.muted, bg: 'rgba(229,87,63,.12)' }
                  : { label: 'Pending', color: C.gold, bg: 'rgba(230,173,74,.12)' };
              return (
                <Card key={p.id} style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 800, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {p.home} <span style={{ color: C.muted }}>vs</span> {p.away}
                      {p.score && <span style={{ color: C.sub, fontWeight: 700 }}> · {p.score}</span>}
                    </div>
                    <div style={{ fontSize: 10.5, color: C.muted, marginTop: 2 }}>{pickLabel(p, p.choice)} @ {p.odds}</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 800, color: st.color, background: st.bg, borderRadius: 8, padding: '4px 10px', whiteSpace: 'nowrap' }}>{st.label}</span>
                </Card>
              );
            })}
          </div>
        </>
      )}

      <SectionTitle right={<span style={{ fontSize: 11, fontWeight: 700, color: C.muted }}>Live odds · bwanabet</span>}>Match Predictions</SectionTitle>

      {err && (!matches || matches.length === 0) && (
        <Card style={{ padding: 20, textAlign: 'center', color: C.sub, fontSize: 13 }}>Couldn't load matches right now — try again shortly.</Card>
      )}

      {!err && matches === null && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[0, 1, 2, 3].map((i) => <Card key={i} className="skeleton" style={{ height: 64 }} />)}
        </div>
      )}

      {matches && matches.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {matches.map((m) => {
            const pred = predictions?.find((p) => p.id === m.id);
            return (
              <Card key={m.id} style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 150 }}>
                  <div style={{ fontSize: 11, color: C.muted, marginBottom: 3 }}>⚽ {m.league} · {fmtKick(m.time)}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{m.home} <span style={{ color: C.muted }}>vs</span> {m.away}</div>
                </div>
                {pred ? (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderRadius: 10, background: 'rgba(79,169,139,.14)', border: `1px solid ${C.green}` }}>
                    <Check size={16} color={C.green} strokeWidth={3} />
                    <span style={{ fontSize: 12.5, fontWeight: 800, color: C.text }}>{pickLabel(m, pred.choice)}</span>
                    <span style={{ fontSize: 11.5, color: C.green, fontWeight: 700 }}>@ {pred.odds ?? oddsFor(m, pred.choice)}</span>
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
      )}
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
