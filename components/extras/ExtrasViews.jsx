'use client';

import React from 'react';
import { Check, Lock, Trophy } from 'lucide-react';
import { C, CANDY, goldRim, innerGlow, goldTitle } from '../redesign/tokens';
import { Card, SectionTitle, TitleNote, Progress, GreenBtn, Badge, RewardIcon } from '../redesign/RedesignShell';
import { EarnPrize, useResetText } from '../redesign/EarnView';
import { sportsTerms } from '@/lib/missions/sports.mjs';
import { amountText } from '@/lib/rewardText.mjs';

// UI for the 2026-10-19 extras (state + handlers: components/extras/useExtras.js).

const title = (size) => ({ fontFamily: CANDY.display, fontSize: size, lineHeight: 1.1, color: C.text, textTransform: 'uppercase' });
const fmt = (n) => Number(n || 0).toLocaleString('en-US');
const kickoffText = (iso) => {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '';
  return d.toLocaleString('en-GB', { weekday: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Lusaka' });
};

// ---------------------------------------------------------------------------
// Bet-slip missions
// ---------------------------------------------------------------------------
export function SportsMissions({ sports }) {
  const reset = useResetText();
  if (!sports) return null;
  return (
    <section style={{ marginTop: 26 }} aria-labelledby="sports-missions-title">
      <SectionTitle id="sports-missions-title" right={<TitleNote>{reset}</TitleNote>}>Sports missions</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {sports.states.map((s) => {
          const m = s.mission;
          const pct = s.claimed ? 100 : Math.min(100, Math.round((s.progress / m.target) * 100));
          const ready = sports.loggedIn && s.claimable;
          return (
            <Card key={m.id} style={{ padding: '12px 14px', opacity: s.claimed ? 0.7 : 1, ...(ready ? { borderColor: CANDY.gold } : null) }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0, display: 'grid', gap: 6 }}>
                  <span style={title(17)}>{m.name}{m.kind === 'weekend' && <span style={{ marginLeft: 8 }}><Badge bg="#b48cf2" color="#130f1f">Weekend</Badge></span>}</span>
                  <span style={{ fontFamily: CANDY.display, fontSize: 17, lineHeight: 1.15, color: '#fff' }}>{sportsTerms(m)}</span>
                  <EarnPrize r={m.reward} size={24} fontSize={20} />
                  <Progress value={pct} height={12} color={s.claimed || s.reached ? C.green : undefined} />
                  <span style={{ fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,.75)' }}>
                    {s.claimed ? m.target : s.progress} / {m.target} bets{m.xp ? <span style={{ color: CANDY.gold }}> · +{amountText(m.xp, 'xp')}</span> : null}
                    {m.kind === 'weekend' && !s.open ? <span style={{ color: C.muted }}> · opens Saturday</span> : null}
                  </span>
                </div>
                <div style={{ flex: 'none', minWidth: 64, display: 'grid', placeItems: 'center' }}>
                  {s.claimed ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 800, color: C.green }}><Check size={14} /> Claimed</span>
                    : ready ? <GreenBtn onClick={(e) => sports.onClaim(m.id, e.currentTarget)}>Claim</GreenBtn>
                    : null}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
      <div style={{ fontSize: 11.5, color: C.muted, marginTop: 8 }}>Settled real-money sports bets on bwanabet.com at total odds 1.5 or more. Updates every few minutes.</div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Match-day predictions
// ---------------------------------------------------------------------------
const PICK_LABEL = { home: '1', draw: 'X', away: '2' };

function PickBtn({ label, sub, active, disabled, onClick }) {
  return (
    <button type="button" disabled={disabled} onClick={onClick} aria-pressed={active}
      style={{ all: 'unset', boxSizing: 'border-box', cursor: disabled ? 'default' : 'pointer', flex: 1, minWidth: 0, minHeight: 48, padding: '6px 4px', borderRadius: 12, textAlign: 'center',
        background: active ? `linear-gradient(180deg, ${CANDY.green.light}, ${CANDY.green.fill})` : C.track, border: `2px solid ${active ? CANDY.green.dark : CANDY.violet.dark}`, opacity: disabled && !active ? 0.55 : 1 }}>
      <div style={{ fontFamily: CANDY.display, fontSize: 17, color: '#fff' }}>{label}</div>
      <div style={{ fontSize: 10.5, fontWeight: 800, color: 'rgba(255,255,255,.75)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{sub}</div>
    </button>
  );
}

export function Predictions({ predictions: p, compact = false, onSeeAll }) {
  if (!p) return null;
  const open = (p.matches || []).filter(m => m.open);
  const list = compact ? open.slice(0, 2) : open.slice(0, 8);
  const toClaim = (p.mine || []).filter(m => m.claimable);
  const results = compact ? toClaim : (p.mine || []).slice(0, 8);
  const left = Math.max(0, (p.today?.max || 5) - (p.today?.picks || 0));
  return (
    <section aria-labelledby={compact ? 'pred-title-home' : 'pred-title'} style={compact ? null : { marginTop: 26 }}>
      <SectionTitle id={compact ? 'pred-title-home' : 'pred-title'} right={p.loggedIn ? <TitleNote>{left} of {p.today?.max || 5} picks left today</TitleNote> : null}>Match predictions</SectionTitle>
      <Card style={{ padding: 14, display: 'grid', gap: 12 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.sub }}>Free to play. Pick the winner of a real match: right = <b style={{ color: CANDY.gold }}>{fmt(p.coins)} coins</b>.</div>
        {p.status === 'idle' && <div style={{ fontSize: 13, color: C.muted }}>Loading matches…</div>}
        {p.status !== 'idle' && !list.length && <div style={{ fontSize: 13, color: C.muted }}>No matches open right now. Check back on match day.</div>}
        {list.map(m => (
          <div key={m.id} style={{ display: 'grid', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 11.5, fontWeight: 800, color: C.muted }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.league}</span><span style={{ flex: 'none' }}>{kickoffText(m.time)}</span>
            </div>
            <div style={{ ...title(15), textTransform: 'none' }}>{m.home} <span style={{ color: C.muted }}>v</span> {m.away}</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {['home', 'draw', 'away'].map(k => (
                <PickBtn key={k} label={PICK_LABEL[k]} sub={k === 'home' ? m.home : k === 'away' ? m.away : 'Draw'}
                  active={m.myPick === k} disabled={!!m.myPick || p.busyId === m.id || (p.loggedIn && left === 0)}
                  onClick={() => p.onPick(m.id, k)} />
              ))}
            </div>
          </div>
        ))}
        {results.length > 0 && (
          <div style={{ display: 'grid', gap: 8, borderTop: `1px solid ${CANDY.violet.dark}`, paddingTop: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: CANDY.gold, textTransform: 'uppercase' }}>Your predictions</div>
            {results.map(r => (
              <div key={r.eventId} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 700, color: C.text }}>
                  {r.home} v {r.away} <span style={{ color: C.muted }}>· you: {PICK_LABEL[r.pick]}{r.score ? ` · ${r.score}` : ''}</span>
                </div>
                {r.claimable ? <GreenBtn onClick={(e) => p.onClaim(r.eventId, e.currentTarget)}>Claim</GreenBtn>
                  : <span style={{ flex: 'none', fontSize: 12, fontWeight: 900, color: r.status === 'won' ? C.green : r.status === 'lost' ? C.muted : CANDY.gold }}>
                      {r.status === 'won' ? 'Won ✓' : r.status === 'lost' ? 'Missed' : 'Waiting'}
                    </span>}
              </div>
            ))}
          </div>
        )}
        {compact && onSeeAll && <button type="button" onClick={onSeeAll} style={{ all: 'unset', cursor: 'pointer', textAlign: 'center', fontSize: 13, fontWeight: 900, color: CANDY.gold, minHeight: 36 }}>All matches ›</button>}
      </Card>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Weekly leaderboard
// ---------------------------------------------------------------------------
export function Leaderboard({ board: b }) {
  const [sel, setSel] = React.useState(null);
  if (!b) return null;
  const bands = b.bands || [];
  const mine = b.me?.band || null;
  const show = bands.find(x => x.id === (sel || mine)) || bands[0];
  const lw = b.lastWeek;
  return (
    <section style={{ marginTop: 26 }} aria-labelledby="board-title">
      <SectionTitle id="board-title" right={<TitleNote>This week · Mon–Sun</TitleNote>}>League table</SectionTitle>
      {lw && (
        <Card style={{ padding: 14, marginBottom: 10, borderColor: CANDY.gold, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Trophy size={30} color={CANDY.gold} style={{ flex: 'none' }} />
          <div style={{ flex: 1, fontSize: 14, fontWeight: 800, color: C.text }}>Last week you finished <b style={{ color: CANDY.gold }}>#{lw.rank}</b> · {fmt(lw.coins)} coins</div>
          {lw.claimed ? <span style={{ fontSize: 12, fontWeight: 800, color: C.green }}><Check size={14} /> Claimed</span>
            : b.loggedIn ? <GreenBtn onClick={(e) => b.onClaim(e.currentTarget)}>Claim</GreenBtn> : null}
        </Card>
      )}
      <Card style={{ padding: 14, display: 'grid', gap: 10 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: C.sub }}>
          You play against players at your level. XP from real bets this week counts. Top 3 win <b style={{ color: CANDY.gold }}>{(b.prizes || []).slice(0, 3).map(fmt).join(' / ')}</b> coins, 4th–10th {fmt(b.prizes?.[3])}.
        </div>
        {b.status === 'idle' && <div style={{ fontSize: 13, color: C.muted }}>Loading the table…</div>}
        {b.status === 'unavailable' && <div style={{ fontSize: 13, color: C.muted }}>The table is not available right now.</div>}
        {bands.length > 0 && (
          <div role="tablist" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {bands.map(x => (
              <button key={x.id} type="button" role="tab" aria-selected={show?.id === x.id} onClick={() => setSel(x.id)}
                style={{ all: 'unset', cursor: 'pointer', padding: '6px 10px', borderRadius: 999, fontSize: 12, fontWeight: 900, color: show?.id === x.id ? '#130f1f' : C.text, background: show?.id === x.id ? CANDY.gold : C.track }}>
                {x.name}{x.id === mine ? ' · you' : ''}
              </button>
            ))}
          </div>
        )}
        {show && (show.top.length ? (
          <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 4 }}>
            {show.top.map(r => (
              <li key={r.rank} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 10, background: r.me ? 'rgba(255,210,31,.16)' : C.track }}>
                <span style={{ width: 26, fontFamily: CANDY.display, fontSize: 16, color: r.rank <= 3 ? CANDY.gold : C.text }}>{r.rank}</span>
                <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, fontWeight: 800, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.label}{r.me ? ' (you)' : ''}</span>
                <span style={{ fontSize: 13, fontWeight: 900, color: CANDY.gold, fontVariantNumeric: 'tabular-nums' }}>{fmt(r.xp)} XP</span>
              </li>
            ))}
          </ol>
        ) : <div style={{ fontSize: 13, color: C.muted }}>No one has scored in this league yet this week. Be first!</div>)}
        {b.me && show?.id === b.me.band && !show.top.some(r => r.me) && (
          <div style={{ fontSize: 13, fontWeight: 800, color: C.text }}>You: <b style={{ color: CANDY.gold }}>#{b.me.rank}</b> · {fmt(b.me.xp)} XP</div>
        )}
      </Card>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Souvenir album
// ---------------------------------------------------------------------------
const SET_ORDER = ['zambia', 'abroad', 'rivals', 'worldcup', 'quests'];

export function Album({ album }) {
  const [open, setOpen] = React.useState(null);
  if (!album) return null;
  return (
    <section style={{ marginTop: 26 }} aria-labelledby="album-title">
      <SectionTitle id="album-title" right={<TitleNote>{album.have} / {album.total} cards</TitleNote>}>Souvenir album</SectionTitle>
      <div style={{ display: 'grid', gap: 10 }}>
        {SET_ORDER.map(id => album.sets.find(s => s.id === id)).filter(Boolean).map(s => (
          <Card key={s.id} style={{ padding: 12 }}>
            <button type="button" onClick={() => setOpen(open === s.id ? null : s.id)} aria-expanded={open === s.id}
              style={{ all: 'unset', boxSizing: 'border-box', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
              <span style={{ flex: 1, minWidth: 0, display: 'grid', gap: 4 }}>
                <span style={title(16)}>{s.name}</span>
                <span style={{ fontSize: 12, color: C.muted, fontWeight: 700 }}>{s.note} · set bonus {fmt(s.bonus)} coins</span>
                <Progress value={(s.have / Math.max(1, s.total)) * 100} height={9} color={s.complete ? C.green : undefined} />
              </span>
              <span style={{ flex: 'none', fontFamily: CANDY.display, fontSize: 15, color: C.text }}>{s.have}/{s.total}</span>
            </button>
            {s.claimable && <div style={{ marginTop: 10 }}><GreenBtn full onClick={(e) => album.onClaimSet(s.id, e.currentTarget)}>Claim {fmt(s.bonus)} coins</GreenBtn></div>}
            {s.claimed && <div style={{ marginTop: 8, fontSize: 12, fontWeight: 800, color: C.green }}><Check size={13} /> Set bonus claimed</div>}
            {open === s.id && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(84px, 1fr))', gap: 8, marginTop: 12 }}>
                {album.cards.filter(c => c.set === s.id).map(c => (
                  <div key={c.id} style={{ borderRadius: 12, overflow: 'hidden', background: c.earned ? C.panelHi : C.track, border: `2px solid ${c.earned ? CANDY.gold : CANDY.violet.dark}`, textAlign: 'center' }}>
                    <div style={{ aspectRatio: '1 / 1', display: 'grid', placeItems: 'center', background: c.earned ? 'rgba(0,0,0,.2)' : 'transparent' }}>
                      {c.earned && c.image ? <img src={c.image} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                        : c.earned ? <RewardIcon kind="coins" size={30} /> : <Lock size={22} color={C.muted} />}
                    </div>
                    <div style={{ padding: '5px 4px 6px', fontSize: 10.5, fontWeight: 800, lineHeight: 1.2, color: c.earned ? C.text : C.muted }}>
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</div>
                      <div style={{ color: C.muted, fontWeight: 700 }}>{c.sub}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Comeback pop-up
// ---------------------------------------------------------------------------
export function ComebackModal({ comeback }) {
  if (!comeback) return null;
  return (
    <div role="dialog" aria-modal="true" aria-label="Welcome back" onClick={comeback.onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 310, background: 'rgba(8,4,20,.78)', display: 'grid', placeItems: 'center', padding: 20, fontFamily: CANDY.body, color: '#fff' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...goldRim, width: '100%', maxWidth: 380, padding: 6, borderRadius: 26 }}>
        <div style={{ borderRadius: 20, background: innerGlow, padding: '24px 18px 18px', textAlign: 'center', display: 'grid', gap: 12 }}>
          <h2 style={{ ...goldTitle(30), textAlign: 'center', margin: 0 }}>Welcome back!</h2>
          <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.4 }}>The coach has missed you. You were away {comeback.daysAway} days, so here is a bonus to get back on the pitch.</div>
          <div style={{ display: 'flex', justifyContent: 'center' }}><EarnPrize r={{ kwacha: comeback.coins }} size={34} fontSize={30} /></div>
          <GreenBtn full onClick={(e) => comeback.onClaim(e.currentTarget)}>Claim</GreenBtn>
          <button type="button" onClick={comeback.onClose} style={{ all: 'unset', cursor: 'pointer', fontSize: 13, fontWeight: 800, color: C.sub, minHeight: 36 }}>Later</button>
        </div>
      </div>
    </div>
  );
}
