'use client';

import React from 'react';
import { C, CANDY, goldRim, dotRow, goldTitle, innerGlow, VIOLET_BASE } from './tokens';
import { Card, GreenBtn, Progress, Badge, SectionTitle, TitleNote, CurrencyAmounts } from './RedesignShell';
import { VUMA_STAGES, getStage } from '@/lib/vuma/stages.mjs';
import { opponentArt, vumaArt } from '@/lib/season/league.mjs';
import { RefreshCw, Lock, Trophy, Check } from 'lucide-react';

// Season UI (2026-10-09, candy design A): the current match card, league
// record, World Cup path, Vuma's side hustle and the result-moment modal.
// Everything is prop-driven from the `season` view GamificationPlatform
// builds with lib/season/* (xp, hustle, league, worldcup).

const fmt = (n) => Math.max(0, Math.round(Number(n) || 0)).toLocaleString('en-US');

/** "2d 4h left" / "14h left" / "35m left". */
export function leftText(ms) {
  const mins = Math.max(0, Math.ceil(ms / 60000));
  if (mins >= 48 * 60) return `${Math.floor(mins / 1440)}d ${Math.floor((mins % 1440) / 60)}h left`;
  if (mins >= 60) return `${Math.floor(mins / 60)}h left`;
  return `${mins}m left`;
}
const shortDay = (d) => (d ? new Date(`${d}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' }) : '');

export const FEED_NOTE = 'Play on bwanabet.com — your matches update every few minutes';

/** What to say about the CRM feed (null = nothing). */
export function feedNote(status) {
  if (status === 'anon') return 'Log in on bwanabet.com to play your season';
  if (status === 'loading') return 'Loading your season…';
  if (status === 'nodata' || status === 'unavailable') return FEED_NOTE;
  return null;
}

function Note({ text }) {
  if (!text) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: C.sub, marginTop: 8 }}>
      <RefreshCw size={11} color={C.muted} style={{ flex: 'none' }} /><span>{text}</span>
    </div>
  );
}

// Fallback when a versus PNG is missing: a squad of dark silhouettes.
function Silhouettes({ count = 1, tint = '#000' }) {
  return (
    <svg viewBox={`0 0 ${count === 1 ? 100 : 220} 200`} preserveAspectRatio="xMidYMax meet" style={{ width: '100%', height: '100%', display: 'block' }} aria-hidden>
      {Array.from({ length: count }, (_, i) => {
        const x = count === 1 ? 50 : [110, 55, 165][i];
        const sc = count === 1 ? 1 : i === 0 ? 1 : 0.86;
        return (
          <g key={i} transform={`translate(${x} 200) scale(${sc}) translate(-50 -200)`} fill={tint} opacity={i === 0 ? 0.92 : 0.75}>
            <circle cx="50" cy="38" r="20" />
            <path d="M18 200 L22 120 Q22 70 50 66 Q78 70 78 120 L82 200 Z" />
            <path d="M22 80 L4 140 L14 144 L32 96 Z M78 80 L96 140 L86 144 L68 96 Z" />
          </g>
        );
      })}
    </svg>
  );
}

function VsArt({ src, alt, side, count }) {
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => setFailed(false), [src]);
  const box = { position: 'absolute', bottom: 0, top: 6, [side]: 0, width: count > 1 ? '48%' : '40%', display: 'flex', alignItems: 'flex-end', justifyContent: side === 'left' ? 'flex-start' : 'flex-end' };
  return (
    <div style={box}>
      {src && !failed
        ? <img src={src} alt={alt} onError={() => setFailed(true)} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', objectPosition: `${side} bottom`, display: 'block', filter: 'drop-shadow(0 6px 10px rgba(0,0,0,.6))', transform: side === 'right' ? 'none' : undefined }} />
        : <div data-vs-fallback style={{ width: '100%', height: '88%' }}><Silhouettes count={count} tint={side === 'left' ? '#2a1458' : '#160626'} /></div>}
    </div>
  );
}

/**
 * VERSUS picture: Vuma (left, in his current kit) vs a squad of opponents
 * (right) on a dark stadium glow with a big VS. Art: public/vuma/vs/
 * vuma-NN.png | vuma-zambia.png and opp-<slug>.png; silhouettes if missing.
 */
export function VersusPicture({ home, away, vumaSrc, oppSrc, h = 170 }) {
  return (
    <div data-versus style={{ position: 'relative', height: h, borderRadius: 16, overflow: 'hidden', isolation: 'isolate',
      background: [
        'radial-gradient(60% 45% at 50% -8%, rgba(255,255,255,.38), transparent 70%)',
        'radial-gradient(30% 30% at 12% 0%, rgba(255,240,200,.35), transparent 70%)',
        'radial-gradient(30% 30% at 88% 0%, rgba(255,240,200,.35), transparent 70%)',
        'radial-gradient(70% 40% at 50% 112%, rgba(67,194,26,.55), transparent 70%)',
        'linear-gradient(180deg, #0b0322 0%, #1d0846 60%, #12052c 100%)',
      ].join(', '),
      border: `2px solid ${CANDY.violet.dark}`, boxShadow: 'inset 0 -14px 24px rgba(0,0,0,.45)' }}>
      <span aria-hidden style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '22%', background: 'linear-gradient(180deg, transparent, rgba(0,0,0,.55))', zIndex: 2 }} />
      <VsArt src={vumaSrc} alt={`Vuma for ${home}`} side="left" count={1} />
      <VsArt src={oppSrc} alt={`${away} players`} side="right" count={3} />
      <span style={{ position: 'absolute', left: '50%', top: '42%', transform: 'translate(-50%, -50%) rotate(-6deg)', zIndex: 3, ...goldTitle(Math.round(h * 0.3)), fontSize: Math.round(h * 0.3), letterSpacing: 1 }}>VS</span>
      <span style={{ position: 'absolute', left: 8, bottom: 6, zIndex: 3, maxWidth: '46%', fontSize: 11.5, fontWeight: 900, textShadow: '0 2px 4px #000', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{home}</span>
      <span style={{ position: 'absolute', right: 8, bottom: 6, zIndex: 3, maxWidth: '46%', fontSize: 11.5, fontWeight: 900, textShadow: '0 2px 4px #000', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{away}</span>
    </div>
  );
}

/** Big centred countdown: "2d 4h" / "14h 20m" / "35m". */
export function countdownText(ms) {
  const mins = Math.max(0, Math.ceil(ms / 60000));
  if (mins >= 1440) return `${Math.floor(mins / 1440)}d ${Math.floor((mins % 1440) / 60)}h`;
  if (mins >= 60) return `${Math.floor(mins / 60)}h ${mins % 60}m`;
  return `${mins}m`;
}

const STATUS_CHIP = {
  won: { label: 'Won', bg: C.green, color: '#fff' },
  lost: { label: 'Lost', bg: C.red, color: '#fff' },
  live: { label: 'Live', bg: CANDY.gold },
  upcoming: { label: 'Next', bg: 'rgba(255,255,255,.18)', color: '#fff' },
  out: { label: 'Out', bg: 'rgba(255,255,255,.12)', color: 'rgba(255,255,255,.6)' },
  locked: { label: 'Locked', bg: 'rgba(255,255,255,.12)', color: 'rgba(255,255,255,.6)' },
};
const Chip = ({ status }) => { const s = STATUS_CHIP[status] || STATUS_CHIP.upcoming; return <Badge bg={s.bg} color={s.color}>{s.label}</Badge>; };

/** The match to show now: a live World Cup round first, else this week's league match. */
export function currentMatch(season) {
  if (!season) return null;
  const wc = season.worldCup;
  const prizeK = `K${fmt(season.cfg?.worldCup?.prizeKwacha ?? 10000)}`;
  if (wc && wc.unlocked && wc.current) {
    const r = wc.current;
    const lose = r.round === 'final' ? `Miss it and you lose the ${prizeK}`
      : r.round === 'group' ? `Miss it and you lose: ${fmt(r.reward)} coins bonus`
      : 'Miss it and Zambia is OUT of the World Cup';
    return { kind: 'wc', id: r.id, title: `World Cup · ${r.label}`, home: 'Zambia', away: r.opponent, vumaSrc: vumaArt('zambia'), oppSrc: opponentArt(r.opponent),
      xp: r.xp, target: r.target, gap: r.gap, status: r.status, msLeft: r.msLeft, lose, final: r.round === 'final' };
  }
  const L = season.league;
  if (L && L.unlocked && L.current) {
    const m = L.current;
    const stage = Math.max(getStage(season.xp).stage, season.cfg?.league?.unlockStage || 6);
    const tierBonus = season.cfg?.league?.bonus?.[m.tier] || 0;
    return { kind: 'league', id: m.id, title: `${m.tierName} · Week ${m.n}`, home: VUMA_STAGES[stage - 1].club || m.home, away: m.opponent,
      vumaSrc: vumaArt(stage), oppSrc: opponentArt(m.opponent),
      xp: m.xp, target: m.target, gap: m.gap, status: m.status, msLeft: m.msLeft, claimable: m.claimable, bonus: m.bonus,
      lose: tierBonus ? `Miss it and you lose: ${fmt(tierBonus)} coins bonus` : null };
  }
  return null;
}

/**
 * Current match card. Before the league unlocks it shows the road to the
 * first club (stage 6). `compact` = the Home version.
 */
export function MatchCard({ season, compact = false, onClaimLeague, onNavigate }) {
  if (!season) return null;
  const m = currentMatch(season);
  const note = feedNote(season.status);
  if (!m) {
    const first = VUMA_STAGES[(season.cfg?.league?.unlockStage || 6) - 1];
    const pct = Math.min(100, (season.xp / first.xp) * 100);
    return (
      <Card style={{ padding: compact ? 14 : 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src={first.avatar} alt="" width={48} height={48} style={{ width: 48, height: 48, borderRadius: 12, objectFit: 'cover', filter: 'grayscale(.5)', flex: 'none' }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 900, color: C.muted, textTransform: 'uppercase', letterSpacing: '.06em' }}>League matches</div>
            <div style={{ fontFamily: CANDY.display, fontSize: 18, lineHeight: 1.15 }}>First club: {first.club}</div>
            <div style={{ fontSize: 12, color: C.sub }}>Stage {first.stage} · {fmt(first.xp - season.xp)} XP to go</div>
          </div>
        </div>
        <div style={{ marginTop: 10 }}><Progress value={pct} height={12} /></div>
        <Note text={note} />
      </Card>
    );
  }
  const pct = Math.min(100, (m.xp / m.target) * 100);
  const won = m.status === 'won';
  return (
    <Card style={{ padding: compact ? 14 : 16, ...(won ? { borderColor: CANDY.gold } : null) }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 900, color: m.kind === 'wc' ? CANDY.gold : C.muted, textTransform: 'uppercase', letterSpacing: '.06em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</span>
        <Chip status={m.status} />
      </div>
      <VersusPicture home={m.home} away={m.away} vumaSrc={m.vumaSrc} oppSrc={m.oppSrc} h={compact ? 150 : 180} />
      {/* the countdown sits in the centre, big */}
      <div style={{ textAlign: 'center', margin: '12px 0 8px' }}>
        {won ? (
          <div style={{ ...goldTitle(compact ? 30 : 36), color: C.green, textAlign: 'center' }}>Won!</div>
        ) : (
          <>
            <div data-countdown style={{ fontFamily: CANDY.display, fontSize: compact ? 36 : 44, lineHeight: 1, color: '#fff', fontVariantNumeric: 'tabular-nums', textShadow: `0 3px 0 ${CANDY.outline}, 0 0 18px rgba(255,210,31,.35)` }}>{countdownText(m.msLeft)}</div>
            <div style={{ fontSize: 11, fontWeight: 900, color: C.muted, textTransform: 'uppercase', letterSpacing: '.1em', marginTop: 3 }}>left to win</div>
          </>
        )}
      </div>
      <Progress value={pct} height={14} color={won ? C.green : undefined} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginTop: 7, fontSize: 12.5, fontWeight: 800 }}>
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(m.xp)} / {fmt(m.target)} XP</span>
        {won
          ? <span style={{ color: C.green }}>Match won!</span>
          : <span data-live-gap style={{ color: CANDY.gold, textAlign: 'right' }}>{fmt(m.gap)} XP to go</span>}
      </div>
      {!won && m.lose && (
        <div data-lose-line style={{ marginTop: 10, padding: '8px 10px', borderRadius: 12, background: 'rgba(227,38,30,.14)', border: '1.5px solid rgba(245,113,107,.55)', fontSize: 12.5, fontWeight: 900, color: '#ffb3ad', textAlign: 'center' }}>{m.lose}</div>
      )}
      {m.kind === 'league' && m.claimable && (
        <GreenBtn full onClick={(e) => onClaimLeague && onClaimLeague(m.id, e.currentTarget)} style={{ marginTop: 10 }}>Collect +{fmt(m.bonus)} coins</GreenBtn>
      )}
      <Note text={note} />
      {compact && onNavigate && (
        <button type="button" className="ov-link" onClick={() => onNavigate('missions')}>Season, league and World Cup ›</button>
      )}
    </Card>
  );
}

/** League record + recent results + unclaimed win bonuses. */
export function LeagueRecord({ league, onClaim }) {
  if (!league || !league.unlocked) return null;
  const r = league.record;
  const recent = league.matches.slice(-6);
  const unclaimed = league.matches.filter(m => m.claimable);
  return (
    <Card style={{ padding: '12px 14px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ fontFamily: CANDY.display, fontSize: 17 }}>League record</div>
        <div data-league-record style={{ display: 'flex', gap: 10, fontSize: 13, fontWeight: 900, fontVariantNumeric: 'tabular-nums' }}>
          <span style={{ color: C.green }}>W {r.won}</span><span style={{ color: '#ff8a80' }}>L {r.lost}</span><span style={{ color: CANDY.gold }}>{r.points} pts</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
        {recent.map(m => (
          <span key={m.id} title={`${m.opponent}: ${fmt(m.xp)} / ${fmt(m.target)} XP`} style={{ minWidth: 30, height: 30, padding: '0 6px', boxSizing: 'border-box', borderRadius: 9, display: 'grid', placeItems: 'center', fontFamily: CANDY.display, fontSize: 14,
            background: m.status === 'won' ? C.green : m.status === 'lost' ? C.red : C.track, color: m.status === 'live' ? CANDY.gold : '#fff', border: m.status === 'live' ? `2px solid ${CANDY.gold}` : '2px solid rgba(255,255,255,.18)' }}>
            {m.status === 'won' ? 'W' : m.status === 'lost' ? 'L' : '•'}
          </span>
        ))}
      </div>
      {unclaimed.length > 3 && (
        <GreenBtn full size={15} onClick={(e) => { const el = e.currentTarget; unclaimed.forEach(m => onClaim && onClaim(m.id, el)); }} style={{ marginTop: 10 }}>
          Collect all {unclaimed.length} win bonuses (+{fmt(unclaimed.reduce((t, m) => t + m.bonus, 0))})
        </GreenBtn>
      )}
      {unclaimed.slice(-3).map(m => (
        <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10, background: C.panel2, border: `1.5px solid ${CANDY.violet.dark}`, borderRadius: 12, padding: '6px 6px 6px 10px' }}>
          <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 800 }}>Beat {m.opponent}</span>
          <CurrencyAmounts r={{ kwacha: m.bonus }} size={14} fontSize={12} />
          <GreenBtn size={14} onClick={(e) => onClaim && onClaim(m.id, e.currentTarget)} style={{ minHeight: 40, padding: '0 12px', marginBottom: 4 }}>Collect</GreenBtn>
        </div>
      ))}
    </Card>
  );
}

/** World Cup path: locked teaser before stage 16, then the 8 matches. */
export function WorldCupPath({ worldCup, cfg, prize, onClaim, onClaimPrize, prizeBusy = false }) {
  if (!worldCup) return null;
  const unlockStage = VUMA_STAGES[(cfg?.worldCup?.unlockStage || 16) - 1];
  const prizeK = `K${fmt(cfg?.worldCup?.prizeKwacha ?? 10000)}`;
  if (!worldCup.unlocked) {
    return (
      <Card style={{ padding: 14, position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 46, height: 46, flex: 'none', borderRadius: 12, display: 'grid', placeItems: 'center', background: C.track }}><Lock size={20} color={CANDY.gold} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: CANDY.display, fontSize: 18, lineHeight: 1.15 }}>World Cup with Zambia</div>
            <div data-wc-teaser style={{ fontSize: 12.5, color: C.sub, fontWeight: 700 }}>Reach {unlockStage.name} to play for Zambia</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 5, marginTop: 12, flexWrap: 'wrap' }}>
          {worldCup.rounds.map(r => (
            <span key={r.id} style={{ fontSize: 11, fontWeight: 800, padding: '4px 8px', borderRadius: 999, background: C.track, color: C.muted, border: '1.5px solid rgba(255,255,255,.1)' }}>{r.opponent}</span>
          ))}
        </div>
        <div style={{ fontSize: 11.5, color: CANDY.gold, fontWeight: 800, marginTop: 10 }}>Win the Final: {prizeK} real money</div>
      </Card>
    );
  }
  const status = prize?.status;
  return (
    <Card style={{ padding: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, margin: '2px 4px 10px' }}>
        <div style={{ fontFamily: CANDY.display, fontSize: 17 }}>Zambia at the World Cup</div>
        {worldCup.champion ? <Badge bg={CANDY.gold}>Champions</Badge> : worldCup.eliminated ? <Badge bg={C.red} color="#fff">Knocked out</Badge> : null}
      </div>
      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 7 }}>
        {worldCup.rounds.map(r => {
          const pct = Math.min(100, (r.xp / r.target) * 100);
          const isFinal = r.round === 'final';
          return (
            <li key={r.id} data-wc-round={r.id} style={{ background: r.status === 'live' ? 'rgba(255,210,31,.08)' : C.panel2, border: `1.5px solid ${r.status === 'live' ? CANDY.gold : CANDY.violet.dark}`, borderRadius: 12, padding: '8px 10px', opacity: r.status === 'out' ? 0.55 : 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ display: 'block', fontSize: 10.5, fontWeight: 900, color: C.muted, textTransform: 'uppercase', letterSpacing: '.05em' }}>{r.label} · {shortDay(r.start)}–{shortDay(r.end)}</span>
                  <span style={{ display: 'block', fontFamily: CANDY.display, fontSize: 15.5, lineHeight: 1.2 }}>Zambia vs {r.opponent}</span>
                </span>
                {r.claimable
                  ? <GreenBtn size={14} onClick={(e) => onClaim && onClaim(r.id, e.currentTarget)} style={{ minHeight: 40, padding: '0 12px', marginBottom: 4 }}>+{fmt(r.bonus)}</GreenBtn>
                  : <Chip status={r.status} />}
              </div>
              {(r.status === 'live' || r.status === 'won' || r.status === 'lost') && (
                <div style={{ marginTop: 6 }}>
                  <Progress value={pct} height={8} color={r.status === 'won' ? C.green : r.status === 'lost' ? C.red : undefined} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 800, marginTop: 4, color: C.sub }}>
                    <span>{fmt(r.xp)} / {fmt(r.target)} XP</span>
                    {r.status === 'live' && <span style={{ color: CANDY.gold }}>{fmt(r.gap)} XP to go, {leftText(r.msLeft)}</span>}
                    {r.status === 'won' && r.claimed && r.bonus > 0 && <span style={{ color: C.green, display: 'inline-flex', alignItems: 'center', gap: 3 }}><Check size={12} /> {fmt(r.bonus)} collected</span>}
                  </div>
                </div>
              )}
              {isFinal && r.status === 'won' && (
                <div style={{ marginTop: 8 }}>
                  {status === 'credited'
                    ? <div style={{ fontSize: 13, fontWeight: 900, color: C.green }}>{prizeK} credited to your bwanabet account</div>
                    : status === 'pending' || status === 'claimed'
                      ? <div data-prize-claimed style={{ fontSize: 13, fontWeight: 900, color: CANDY.gold }}>Prize claimed — being verified</div>
                      : status === 'rejected'
                        ? <div style={{ fontSize: 12.5, fontWeight: 800, color: '#ff8a80' }}>Our team could not confirm this prize. Contact support.</div>
                        : <GreenBtn full disabled={prizeBusy} onClick={() => onClaimPrize && onClaimPrize()}><Trophy size={18} /> Claim your {prizeK}</GreenBtn>}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </Card>
  );
}

const HUSTLE_EMOJI = ['🧽', '🏪', '🚿', '🚐', '🛒'];
function HustleArt({ hustle, h = 120 }) {
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => setFailed(false), [hustle.image]);
  if (!failed) {
    return <img src={hustle.image} alt={hustle.level.name} onError={() => setFailed(true)} style={{ width: '100%', height: h, objectFit: 'cover', display: 'block', borderRadius: 14 }} />;
  }
  return (
    <div data-hustle-fallback style={{ height: h, borderRadius: 14, display: 'grid', placeItems: 'center', position: 'relative', overflow: 'hidden',
      background: `radial-gradient(circle at 50% 35%, ${CANDY.glow}, ${C.track} 75%)`, border: `2px solid ${CANDY.violet.dark}` }}>
      <span style={{ fontSize: h * 0.42, filter: 'drop-shadow(0 4px 0 rgba(0,0,0,.35))' }}>{HUSTLE_EMOJI[hustle.level.level - 1] || '🧽'}</span>
      <span style={{ position: 'absolute', bottom: 6, left: 0, right: 0, textAlign: 'center', fontSize: 10.5, fontWeight: 900, letterSpacing: '.08em', color: C.muted, textTransform: 'uppercase' }}>Level {hustle.level.level}</span>
    </div>
  );
}

/** Vuma's side hustle: image, level, coins ready, Collect. */
export function HustleCard({ hustle, onCollect, busy = false }) {
  if (!hustle) return null;
  if (!hustle.unlocked) {
    return (
      <Card style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 30 }}>🧽</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: CANDY.display, fontSize: 17 }}>Vuma&apos;s side hustle</div>
          <div style={{ fontSize: 12, color: C.sub }}>Opens at stage 2. Claim your daily reward to get there.</div>
        </div>
      </Card>
    );
  }
  const L = hustle.level;
  const next = hustle.next;
  const stockPct = next ? Math.min(100, ((hustle.stock - L.stock) / (next.stock - L.stock)) * 100) : 100;
  return (
    <Card style={{ padding: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '112px minmax(0,1fr)', gap: 12, alignItems: 'center' }}>
        <HustleArt hustle={hustle} h={104} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 10.5, fontWeight: 900, color: C.muted, textTransform: 'uppercase', letterSpacing: '.06em' }}>Side hustle · Level {L.level}</div>
          <div style={{ fontFamily: CANDY.display, fontSize: 17, lineHeight: 1.15 }}>{L.name}</div>
          <div style={{ fontSize: 12, color: C.sub, marginTop: 2 }}>Pays {fmt(L.pay)} coins a day</div>
          <div style={{ marginTop: 8 }}>
            {hustle.ready > 0
              ? <GreenBtn full size={16} disabled={busy} onClick={(e) => onCollect && onCollect(e.currentTarget)}>Collect {fmt(hustle.ready)}</GreenBtn>
              : <div style={{ fontSize: 12.5, fontWeight: 800, color: C.green, display: 'flex', alignItems: 'center', gap: 4 }}><Check size={14} /> Collected today, back tomorrow</div>}
          </div>
        </div>
      </div>
      {hustle.closedDays > 0 && hustle.ready > 0 && (
        <div style={{ fontSize: 11.5, color: '#ffb199', marginTop: 8, fontWeight: 700 }}>{hustle.closedDays > 7 ? 'The shop was closed while you were away.' : `The shop was closed for ${hustle.closedDays} ${hustle.closedDays === 1 ? 'day' : 'days'}.`} Pay keeps for 2 days, so collect daily.</div>
      )}
      {next && (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 800, color: C.sub, marginBottom: 4 }}>
            <span>Next: {next.name}</span><span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(hustle.toNext)} XP stock to go</span>
          </div>
          <Progress value={stockPct} height={8} color="linear-gradient(180deg, #7BE34F, #43C21A)" />
          <div style={{ fontSize: 10.5, color: C.muted, marginTop: 4 }}>XP over the daily and weekly limits stocks the hustle.</div>
        </div>
      )}
    </Card>
  );
}

/** Missions tab section: match card, league record, World Cup path. */
export function SeasonSection({ season, onClaimLeague, onClaimWc, onClaimPrize, prizeBusy }) {
  if (!season) return null;
  const L = season.league;
  return (
    <section aria-labelledby="season-title" style={{ display: 'grid', gap: 12 }}>
      <SectionTitle id="season-title" right={L?.unlocked ? <TitleNote>{L.record.points} pts</TitleNote> : null}>Season</SectionTitle>
      <MatchCard season={season} onClaimLeague={onClaimLeague} />
      <LeagueRecord league={L} onClaim={onClaimLeague} />
      <WorldCupPath worldCup={season.worldCup} cfg={season.cfg} prize={season.prize} onClaim={onClaimWc} onClaimPrize={onClaimPrize} prizeBusy={prizeBusy} />
    </section>
  );
}

const RESULT_COPY = {
  win: { title: 'You won!', line: (e) => `${e.home} beat ${e.away}` },
  loss: { title: 'Match lost', line: (e) => `${e.away} were too strong this time` },
  knockedOut: { title: 'Knocked out', line: (e) => `${e.away} knock Zambia out. The league goes on!` },
  champion: { title: 'Champions!', line: () => 'Zambia win the World Cup!' },
};

/**
 * Result moment (LevelUpModal style). event = { kind: 'win'|'loss'|'knockedOut'|'champion',
 * home, away, xp, target, bonus, claimable, matchKind: 'league'|'wc', matchId }.
 */
export function SeasonResultModal({ event, onClose, onClaim, onClaimPrize, prizeK = 'K10,000', prizeStatus = null }) {
  if (!event) return null;
  const copy = RESULT_COPY[event.kind] || RESULT_COPY.win;
  const good = event.kind === 'win' || event.kind === 'champion';
  return (
    <div onClick={onClose} role="dialog" aria-modal="true" aria-label={copy.title} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(8,4,20,.78)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', padding: 20, fontFamily: CANDY.body, color: '#fff' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...goldRim, boxShadow: `${goldRim.boxShadow}, 0 24px 70px rgba(0,0,0,.6)`, position: 'relative', width: 'min(380px, 100%)', boxSizing: 'border-box', padding: 9, borderRadius: 26 }}>
        <span aria-hidden style={{ ...dotRow(false), top: 0.5, left: 22, right: 22, height: 8 }} />
        <span aria-hidden style={{ ...dotRow(false), bottom: 0.5, left: 22, right: 22, height: 8 }} />
        <div style={{ borderRadius: 18, background: innerGlow, padding: '22px 18px 12px', textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase', color: C.muted }}>{event.matchKind === 'wc' ? `World Cup · ${event.label || ''}` : 'League match'}</div>
          <h2 style={{ ...goldTitle(32), textAlign: 'center', marginTop: 4, ...(good ? null : { color: '#fff' }) }}>{copy.title}</h2>
          <div style={{ margin: '14px 0 10px' }}>
            <VersusPicture home={event.home} away={event.away} h={150}
              vumaSrc={event.matchKind === 'wc' ? vumaArt('zambia') : vumaArt(event.homeStage || 6)} oppSrc={opponentArt(event.away)} />
          </div>
          <div style={{ fontFamily: CANDY.display, fontSize: 19, lineHeight: 1.2 }}>{copy.line(event)}</div>
          {event.kind !== 'champion' && <div style={{ fontSize: 12.5, color: C.sub, margin: '4px 0 14px' }}>{fmt(event.xp)} / {fmt(event.target)} XP</div>}
          {event.kind === 'champion' && <div style={{ fontSize: 13.5, color: CANDY.gold, fontWeight: 900, margin: '6px 0 14px' }}>{prizeK} real-money prize</div>}
          {event.claimable && event.bonus > 0 && (
            <div style={{ background: C.track, border: `2px solid ${CANDY.violet.dark}`, borderRadius: 14, padding: '10px 14px', marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.08em' }}>Win bonus</div>
              <CurrencyAmounts r={{ kwacha: event.bonus }} size={22} fontSize={18} style={{ justifyContent: 'center' }} />
            </div>
          )}
          {event.kind === 'champion' && !prizeStatus
            ? <GreenBtn full size={22} onClick={onClaimPrize} style={{ minHeight: 56, borderRadius: 18 }}><Trophy size={20} /> Claim {prizeK}</GreenBtn>
            : event.claimable && event.bonus > 0
              ? <GreenBtn full size={22} onClick={(e) => onClaim && onClaim(e.currentTarget)} style={{ minHeight: 56, borderRadius: 18 }}>Collect</GreenBtn>
              : <GreenBtn full size={22} color={good ? 'green' : 'violet'} onClick={onClose} style={{ minHeight: 56, borderRadius: 18 }}>Continue</GreenBtn>}
        </div>
      </div>
    </div>
  );
}
