'use client';

import React from 'react';
import { Check, Lock, Trophy } from 'lucide-react';
import { C, CANDY, goldRim, innerGlow, goldTitle } from '../redesign/tokens';
import { Card, SectionTitle, TitleNote, Progress, GreenBtn, Badge, RewardIcon } from '../redesign/RedesignShell';
import { EarnPrize } from '../redesign/EarnView';
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

// ---------------------------------------------------------------------------
// Weekly predictions (redesign 2026-10-22, owner picked "match tickets" +
// "prize board"; canvas AcHrXJ4PiFjHhckkWQzqKT): a gold prize card with a
// 5-step progress strip, the open matches as white tickets with 1 / X / 2
// buttons (no odds since 2026-10-23), and a "MY 5 PICKS" board with each pick's
// result. Phones stack them; a wide section (container >= 820 px, desktop)
// puts the tickets left and the prize board right. A tap IS the pick (saved
// at once, POST /api/predictions); 5 picks a Lusaka week, all 5 right = the
// coins, once per week (POST /api/predictions/claim { week }).
// ---------------------------------------------------------------------------
const PICK_LABEL = { home: '1', draw: 'X', away: '2' };
const PICK_WORD = { home: 'HOME', draw: 'DRAW', away: 'AWAY' };
const INK = '#2A0A4F';
const pickName = (r) => (r.pick === 'home' ? r.home : r.pick === 'away' ? r.away : 'Draw');

const STEP = {
  won: { bg: CANDY.green.fill, mark: '✓', tag: 'RIGHT', tagBg: CANDY.green.fill, row: 'rgba(67,194,26,.14)', border: CANDY.green.fill },
  lost: { bg: CANDY.red.fill, mark: '✗', tag: 'MISSED', tagBg: CANDY.red.fill, row: 'rgba(227,38,30,.12)', border: CANDY.red.fill },
  pending: { bg: CANDY.gold, mark: '•', tag: 'WAITING', tagBg: 'rgba(255,255,255,.16)', row: 'rgba(255,210,31,.08)', border: 'rgba(255,210,31,.55)' },
};
const weekLabel = (w) => {
  const d = new Date(`${w}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
};

function slipLine(slip, size, coins) {
  const n = slip.picks?.length || 0;
  if (slip.status === 'lost') return 'One pick missed. A new slip starts on Monday.';
  if (slip.status === 'won') return slip.claimed ? `${size} out of ${size}! ${fmt(coins)} coins collected.` : `${size} out of ${size}! Collect your ${fmt(coins)} coins.`;
  if (slip.status === 'pending') return `All ${size} picked · ${slip.right} right so far.`;
  return n ? `${n} of ${size} picked · pick ${size - n} more` : `Pick ${size} matches to play`;
}

const PRED_CSS = `
  .pr-wrap { container-type: inline-size; }
  .pr-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 14px; }
  .pr-tix { display: grid; gap: 10px; min-width: 0; align-content: start; }
  .pr-side { display: grid; gap: 12px; align-content: start; min-width: 0; }
  .pr-teams { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); align-items: center; gap: 8px; }
  .pr-team { font-weight: 900; font-size: 14px; line-height: 1.15; overflow-wrap: anywhere; }
  .pr-btn { all: unset; box-sizing: border-box; cursor: pointer; min-height: 46px; border-radius: 10px; text-align: center; display: grid; place-items: center; padding: 4px 2px; font-weight: 900; font-size: 13px; line-height: 1.1; }
  .pr-btn[disabled] { cursor: default; }
  .pr-btn:focus-visible { outline: 3px solid ${CANDY.gold}; outline-offset: 2px; }
  @container (min-width: 820px) {
    .pr-grid { grid-template-columns: minmax(0, 1fr) 340px; gap: 22px; }
    .pr-side { grid-column: 2; grid-row: 1; position: sticky; top: 8px; }
    .pr-tix { grid-column: 1; grid-row: 1; }
    .pr-ticket { grid-template-columns: 150px minmax(0, 1fr) 300px !important; align-items: center; column-gap: 16px; }
    .pr-meta { flex-direction: column; justify-content: center !important; gap: 2px !important; }
    .pr-league { white-space: normal !important; line-height: 1.2; }
    .pr-time { font-family: ${CANDY.display}; font-size: 16px; letter-spacing: 0; }
    .pr-team { font-size: 16px; }
  }
`;

function PrizeCard({ p, cur, size, compact }) {
  const picks = cur.picks || [];
  return (
    <div data-pred-prize style={{ borderRadius: 20, padding: compact ? '12px 14px' : '16px 14px', textAlign: 'center', background: 'linear-gradient(180deg, #FFE27A 0%, #E0A300 100%)', boxShadow: '0 5px 0 #8A5A00', color: INK, display: 'grid', gap: 2 }}>
      <div style={{ fontSize: 11.5, fontWeight: 900, letterSpacing: '.12em' }}>THIS WEEK&apos;S PRIZE</div>
      <div style={{ fontFamily: CANDY.display, fontSize: compact ? 38 : 50, lineHeight: 1 }}>{fmt(p.coins)}</div>
      <div style={{ fontFamily: CANDY.display, fontSize: 17 }}>COINS FOR {size} OUT OF {size}</div>
      {p.loggedIn && (
        <>
          <div style={{ marginTop: 8, display: 'grid', gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`, gap: 5 }} aria-label={`${picks.length} of ${size} picked`}>
            {Array.from({ length: size }, (_, i) => {
              const r = picks[i];
              const st = r ? STEP[r.status] || STEP.pending : null;
              return <span key={i} style={{ height: 9, borderRadius: 5, background: st ? (r.status === 'pending' ? INK : st.bg) : 'rgba(42,10,79,.22)' }} />;
            })}
          </div>
          <div style={{ marginTop: 6, fontSize: 13, fontWeight: 900 }}>{slipLine(cur, size, p.coins)}</div>
          {cur.claimable && <div style={{ marginTop: 8 }}><GreenBtn full onClick={(e) => p.onClaim(cur.week, e.currentTarget)}>Collect {fmt(p.coins)} coins</GreenBtn></div>}
        </>
      )}
      {!p.loggedIn && <div style={{ marginTop: 6, fontSize: 13, fontWeight: 800 }}>Free to play · worth K2 in the Coin Shop</div>}
    </div>
  );
}

function Ticket({ m, p, locked }) {
  // no odds on the tickets (owner 2026-10-23): they made picking the favourite too easy
  const opts = ['home', 'draw', 'away'];
  return (
    <div className="pr-ticket" data-pred-ticket style={{ display: 'grid', gap: 8, background: '#fff', color: INK, borderRadius: 14, padding: '10px 12px 12px', boxShadow: '0 4px 0 #120530' }}>
      <div className="pr-meta" style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 11, fontWeight: 900, letterSpacing: '.05em', color: '#7A6A9A' }}>
        <span className="pr-league" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textTransform: 'uppercase' }}>{m.league}</span>
        <span className="pr-time" style={{ flex: 'none', color: CANDY.violet.fill, textTransform: 'uppercase' }}>{kickoffText(m.time)}</span>
      </div>
      <div className="pr-teams">
        <div className="pr-team">{m.home}</div>
        <div style={{ fontFamily: CANDY.display, fontSize: 14, color: CANDY.violet.fill }}>VS</div>
        <div className="pr-team" style={{ textAlign: 'right' }}>{m.away}</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 6 }}>
        {opts.map((k) => {
          const on = m.myPick === k;
          const dis = !!m.myPick || locked || p.busyId === m.id;
          return (
            <button key={k} type="button" className="pr-btn" disabled={dis} aria-pressed={on}
              aria-label={k === 'draw' ? 'Draw' : (k === 'home' ? m.home : m.away) + ' win'}
              onClick={() => p.onPick(m.id, k)}
              style={{ background: on ? CANDY.green.fill : '#F3EEFC', color: on ? '#fff' : INK, border: `2px solid ${on ? CANDY.green.dark : '#E2D8F5'}`, opacity: dis && !on ? 0.55 : 1 }}>
              <span>{PICK_LABEL[k]} · {PICK_WORD[k]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PicksBoard({ cur, size }) {
  const picks = cur.picks || [];
  return (
    <div data-pred-board style={{ borderRadius: 16, padding: 12, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)', display: 'grid', gap: 7 }}>
      <div style={{ fontFamily: CANDY.display, fontSize: 18, color: CANDY.gold }}>MY {size} PICKS</div>
      {Array.from({ length: size }, (_, i) => {
        const r = picks[i];
        if (!r) {
          return (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '28px minmax(0, 1fr)', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 12, background: 'rgba(255,255,255,.04)', border: '1px dashed rgba(255,255,255,.18)' }}>
              <span style={{ width: 26, height: 26, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,.14)', color: '#fff', fontFamily: CANDY.display, fontSize: 13 }}>{i + 1}</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: C.muted }}>Not picked yet</span>
            </div>
          );
        }
        const st = STEP[r.status] || STEP.pending;
        return (
          <div key={r.eventId} style={{ display: 'grid', gridTemplateColumns: '28px minmax(0, 1fr) auto', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 12, background: st.row, border: `2px solid ${st.border}` }}>
            <span style={{ width: 26, height: 26, borderRadius: '50%', display: 'grid', placeItems: 'center', background: st.bg, color: r.status === 'pending' ? INK : '#fff', fontFamily: CANDY.display, fontSize: 14 }}>{st.mark}</span>
            <span style={{ minWidth: 0, display: 'grid' }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: C.sub, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.home} v {r.away}</span>
              <span style={{ fontSize: 14, fontWeight: 900, color: '#fff' }}>{pickName(r)}{r.score ? <span style={{ color: C.sub, fontWeight: 800 }}> · {r.score}</span> : null}</span>
            </span>
            <span style={{ fontSize: 11, fontWeight: 900, padding: '3px 8px', borderRadius: 999, background: st.tagBg, color: '#fff', whiteSpace: 'nowrap' }}>{r.status === 'pending' ? (kickoffText(r.kickoff) || st.tag) : st.tag}</span>
          </div>
        );
      })}
    </div>
  );
}

export function Predictions({ predictions: p, compact = false, onSeeAll }) {
  if (!p) return null;
  const size = p.week?.max || 5;
  const slips = p.slips || [];
  const cur = slips[0] || { picks: [], status: 'open', right: 0 };
  const earlier = slips.slice(1).filter(x => x.claimable);
  const left = Math.max(0, size - (p.week?.picks || 0));
  const open = (p.matches || []).filter(m => m.open).sort((a, b) => String(a.time).localeCompare(String(b.time)));
  const canPick = !p.loggedIn || (left > 0 && cur.status !== 'lost');
  const list = !canPick ? [] : compact ? open.filter(m => !m.myPick).slice(0, 2) : open.slice(0, 10);
  const titleId = compact ? 'pred-title-home' : 'pred-title';
  return (
    <section aria-labelledby={titleId} className="pr-wrap" style={compact ? null : { marginTop: 26 }}>
      <style>{PRED_CSS}</style>
      <SectionTitle id={titleId} right={p.loggedIn ? <TitleNote>{size - left} of {size} picked this week</TitleNote> : null}>Weekly predictions</SectionTitle>
      <div className="pr-grid">
        <div className="pr-side">
          <PrizeCard p={p} cur={cur} size={size} compact={compact} />
          {earlier.map(x => (
            <div key={x.week} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, borderRadius: 12, border: `2px solid ${CANDY.gold}` }}>
              <Trophy size={22} color={CANDY.gold} style={{ flex: 'none' }} />
              <div style={{ flex: 1, fontSize: 13, fontWeight: 800, color: C.text }}>Week of {weekLabel(x.week)}: {size} out of {size}! {fmt(p.coins)} coins</div>
              <GreenBtn onClick={(e) => p.onClaim(x.week, e.currentTarget)}>Collect</GreenBtn>
            </div>
          ))}
          {!compact && p.loggedIn && <PicksBoard cur={cur} size={size} />}
        </div>
        <div className="pr-tix">
          {canPick && !compact && <div style={{ fontSize: 13, fontWeight: 700, color: C.sub }}>Pick the winner of {size} matches. Free to play. Picks lock 5 minutes before kick-off.</div>}
          {canPick && p.status === 'idle' && <div style={{ fontSize: 13, color: C.muted }}>Loading matches…</div>}
          {canPick && p.status !== 'idle' && !list.length && <div style={{ fontSize: 13, color: C.muted }}>No matches open right now. Check back on match day.</div>}
          {list.map(m => <Ticket key={m.id} m={m} p={p} locked={p.loggedIn && left === 0} />)}
          {!canPick && !compact && cur.status !== 'lost' && <div style={{ fontSize: 13, fontWeight: 700, color: C.sub }}>Your {size} picks are in. Results show on the board as the matches finish.</div>}
          {compact && onSeeAll && <button type="button" onClick={onSeeAll} style={{ all: 'unset', cursor: 'pointer', textAlign: 'center', fontSize: 13, fontWeight: 900, color: CANDY.gold, minHeight: 40 }}>{canPick ? 'All matches ›' : 'My picks ›'}</button>}
        </div>
      </div>
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

// ---------------------------------------------------------------------------
// Daily gem cashback pop-up (owner 2026-10-23): 5% of each day's (UTC day) net
// loss, paid in gems; one pop-up lists every window not collected yet.
// ---------------------------------------------------------------------------
const kw = (n) => `K${Number(n).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
const windowLabel = (day) => {
  const d = new Date(`${day}T12:00:00Z`);
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
};
export function CashbackModal({ cashback }) {
  if (!cashback) return null;
  const total = { emeralds: 0, rubies: 0, diamonds: 0 };
  for (const a of cashback.awards) for (const k of Object.keys(total)) total[k] += a[k] || 0;
  const gems = Object.keys(total).filter(k => total[k]);
  return (
    <div role="dialog" aria-modal="true" aria-label="Your cashback" onClick={cashback.onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 310, background: 'rgba(8,4,20,.78)', display: 'grid', placeItems: 'center', padding: 20, fontFamily: CANDY.body, color: '#fff' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...goldRim, width: '100%', maxWidth: 380, padding: 6, borderRadius: 26 }}>
        <div style={{ borderRadius: 20, background: innerGlow, padding: '24px 18px 18px', textAlign: 'center', display: 'grid', gap: 12 }}>
          <h2 style={{ ...goldTitle(30), textAlign: 'center', margin: 0 }}>Your cashback</h2>
          <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.4 }}>5% back on what you lost on bwanabet, paid in gems every morning at 06:00.</div>
          <div style={{ display: 'grid', gap: 6 }}>
            {cashback.awards.map(a => (
              <div key={a.window} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 13, fontWeight: 800, background: 'rgba(255,255,255,.07)', borderRadius: 10, padding: '7px 10px' }}>
                <span style={{ color: C.sub }}>{windowLabel(a.window)}</span>
                <span>Lost {kw(a.loss)} · <span style={{ color: CANDY.gold }}>{kw(a.cashbackKwacha)} back</span></span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '6px 14px', fontFamily: CANDY.display, fontSize: 28, lineHeight: 1, textTransform: 'uppercase' }}>
            {gems.map(k => (
              <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: CANDY.gold }}>
                <RewardIcon kind={k} size={34} />{amountText(total[k], k)}
              </span>
            ))}
          </div>
          <GreenBtn full onClick={(e) => cashback.onCollect(e.currentTarget)}>Collect</GreenBtn>
          <button type="button" onClick={cashback.onClose} style={{ all: 'unset', cursor: 'pointer', fontSize: 13, fontWeight: 800, color: C.sub, minHeight: 36 }}>Later</button>
        </div>
      </div>
    </div>
  );
}
