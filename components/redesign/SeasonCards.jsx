'use client';

import React from 'react';
import { C, CANDY, COIN_ICON, goldRim, dotRow, goldTitle, innerGlow, VIOLET_BASE } from './tokens';
import { Card, GreenBtn, Progress, Badge, SectionTitle, TitleNote, CurrencyAmounts } from './RedesignShell';
import { VUMA_STAGES, getStage } from '@/lib/vuma/stages.mjs';
import { opponentArt, vumaArt } from '@/lib/season/league.mjs';
import { WORLD_CUP_OPEN } from '@/lib/season/config.mjs';
import { RefreshCw, Lock, Trophy, Check } from 'lucide-react';
import { HERO_DEFAULT, heroText } from '@/lib/profile/name.mjs';

// Season UI (2026-10-09, candy design A): the current match card, league
// record, World Cup path, the side hustle and the result-moment modal. The
// hero is the PLAYER's name (season.heroName, "Vuma" when unnamed).
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
  const box = { flex: count > 1 ? '0 1 45%' : '0 1 30%', minWidth: 0, height: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: side === 'left' ? 'flex-end' : 'flex-start' };
  return (
    <div className={`vs-box vs-box-${side}`} style={box}>
      {src && !failed
        ? <img className="vs-img" src={src} alt={alt} onError={() => setFailed(true)} style={{ height: '100%', width: 'auto', maxWidth: '100%', objectFit: 'contain', objectPosition: `${side === 'left' ? 'right' : 'left'} bottom`, display: 'block', filter: 'drop-shadow(0 6px 10px rgba(0,0,0,.6))' }} />
        : <div data-vs-fallback style={{ width: '100%', height: '88%' }}><Silhouettes count={count} tint={side === 'left' ? '#2a1458' : '#160626'} /></div>}
    </div>
  );
}

// Phones: a taller picture, figures sized by height (they may spill into the
// art's transparent side margins), a slimmer VS and a name strip under the
// players' feet. Desktop keeps the inline layout.
const VS_CSS = `
@media (max-width:600px){
.vs-pic{height:calc(var(--vs-h) * 1.3) !important}
.vs-row{inset:6px 0 22px !important;gap:0 !important}
.vs-box{justify-content:center !important;overflow:visible}
.vs-box-left{flex:0 0 30% !important}
.vs-box-right{flex:1 1 0 !important}
.vs-img{max-width:none !important}
.vs-mid{width:34px !important;font-size:26px !important}
.vs-name{bottom:4px !important;font-size:11px !important}
}`;

/**
 * VERSUS picture: Vuma (left, in his current kit) vs a squad of opponents
 * (right) on a dark stadium glow with a big VS. Art: public/vuma/vs/
 * vuma-NN.png | vuma-zambia.png and opp-<slug>.png; silhouettes if missing.
 */
export function VersusPicture({ home, away, vumaSrc, oppSrc, h = 170, hero = HERO_DEFAULT, bare = false }) {
  // `bare` = no stadium backdrop: the players stand straight on the Home card's pitch.
  const backdrop = bare
    ? { background: 'radial-gradient(55% 22% at 50% 100%, rgba(0,0,0,.42), transparent 72%)' }
    : {
      background: [
        'radial-gradient(60% 45% at 50% -8%, rgba(255,255,255,.38), transparent 70%)',
        'radial-gradient(30% 30% at 12% 0%, rgba(255,240,200,.35), transparent 70%)',
        'radial-gradient(30% 30% at 88% 0%, rgba(255,240,200,.35), transparent 70%)',
        'radial-gradient(70% 40% at 50% 112%, rgba(67,194,26,.55), transparent 70%)',
        'linear-gradient(180deg, #0b0322 0%, #1d0846 60%, #12052c 100%)',
      ].join(', '),
      border: `2px solid ${CANDY.violet.dark}`, boxShadow: 'inset 0 -14px 24px rgba(0,0,0,.45)',
    };
  return (
    <div data-versus className="vs-pic" style={{ '--vs-h': `${h}px`, position: 'relative', height: h, borderRadius: 16, overflow: 'hidden', isolation: 'isolate', ...backdrop }}>
      <style dangerouslySetInnerHTML={{ __html: VS_CSS }} />
      {!bare && <span aria-hidden style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '22%', background: 'linear-gradient(180deg, transparent, rgba(0,0,0,.55))', zIndex: 2 }} />}
      <div className="vs-row" style={{ position: 'absolute', inset: '8px 6px 0', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 4, zIndex: 1 }}>
        <VsArt src={vumaSrc} alt={`${hero || HERO_DEFAULT} for ${home}`} side="left" count={1} />
        <span className="vs-mid" style={{ flex: 'none', width: 48, textAlign: 'center', alignSelf: 'center', transform: 'rotate(-6deg)', ...goldTitle(30), fontSize: 30, letterSpacing: 1 }}>VS</span>
        <VsArt src={oppSrc} alt={`${away} players`} side="right" count={3} />
      </div>
      <span className="vs-name" style={{ position: 'absolute', left: 8, bottom: 6, zIndex: 3, maxWidth: '46%', fontSize: 11.5, fontWeight: 900, textShadow: '0 2px 4px #000', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{home}</span>
      <span className="vs-name" style={{ position: 'absolute', right: 8, bottom: 6, zIndex: 3, maxWidth: '46%', fontSize: 11.5, fontWeight: 900, textShadow: '0 2px 4px #000', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{away}</span>
    </div>
  );
}

/** Big centred countdown: "2d 05:14:32" / "05:14:32" (under 24h). */
export function countdownText(ms) {
  const secs = Math.max(0, Math.ceil(ms / 1000));
  const d = Math.floor(secs / 86400);
  const p = (n) => String(n).padStart(2, '0');
  const hms = `${p(Math.floor((secs % 86400) / 3600))}:${p(Math.floor((secs % 3600) / 60))}:${p(secs % 60)}`;
  return d > 0 ? `${d}d ${hms}` : hms;
}

/** Ticks once a second from a fresh msLeft. */
function useLiveMs(msLeft) {
  const [ms, setMs] = React.useState(msLeft);
  React.useEffect(() => {
    const end = Date.now() + (Number(msLeft) || 0);
    setMs(msLeft);
    const t = setInterval(() => setMs(Math.max(0, end - Date.now())), 1000);
    return () => clearInterval(t);
  }, [msLeft]);
  return ms;
}

// Slow red glow pulse for the countdown + lose line (static glow when reduced motion).
const SEASON_CSS = `
@keyframes sc-glow{0%,100%{text-shadow:0 3px 0 #2a0a0a,0 0 8px rgba(255,77,66,.45);box-shadow:0 0 6px rgba(255,77,66,.25)}50%{text-shadow:0 3px 0 #2a0a0a,0 0 22px rgba(255,77,66,.95);box-shadow:0 0 16px rgba(255,77,66,.65)}}
.sc-pulse{animation:sc-glow 2.4s ease-in-out infinite}
@media (prefers-reduced-motion:reduce){.sc-pulse{animation:none;text-shadow:0 3px 0 #2a0a0a,0 0 14px rgba(255,77,66,.7);box-shadow:0 0 10px rgba(255,77,66,.4)}}
`;

const STATUS_CHIP = {
  won: { label: 'Won', bg: C.green, color: '#fff' },
  lost: { label: 'Lost', bg: C.red, color: '#fff' },
  live: { label: 'Live', bg: CANDY.gold },
  upcoming: { label: 'Next', bg: 'rgba(255,255,255,.18)', color: '#fff' },
  out: { label: 'Out', bg: 'rgba(255,255,255,.12)', color: 'rgba(255,255,255,.6)' },
  locked: { label: 'Locked', bg: 'rgba(255,255,255,.12)', color: 'rgba(255,255,255,.6)' },
};
const Chip = ({ status }) => { const s = STATUS_CHIP[status] || STATUS_CHIP.upcoming; return <Badge bg={s.bg} color={s.color}>{s.label}</Badge>; };

// The ONE World Cup switch lives in lib/season/config.mjs (client + server
// read it; open since 2026-10-27). Re-exported for GamificationPlatform / useExtras.
export { WORLD_CUP_OPEN };

/** The match to show now: a live World Cup round first (once the World Cup is open), else this week's league match. */
export function currentMatch(season) {
  if (!season) return null;
  const wc = season.worldCup;
  const prizeK = `K${fmt(season.cfg?.worldCup?.prizeKwacha ?? 10000)}`;
  if (WORLD_CUP_OPEN && wc && wc.unlocked && wc.current) {
    const r = wc.current;
    const lose = r.round === 'final' ? `MISS IT AND YOU LOSE THE ${prizeK}`
      : r.round === 'group' ? `MISS IT AND YOU LOSE: ${fmt(r.reward)} COINS + 3 POINTS`
      : 'MISS IT AND ZAMBIA IS OUT';
    const reward = r.round === 'final' ? { cash: prizeK, sub: 'Real money for the World Cup winners' }
      : r.round === 'group' ? { coins: r.reward, points: 3 }
      : { coins: r.reward, sub: 'and a place in the next round' };
    return { kind: 'wc', id: r.id, title: `World Cup · ${r.label}`, home: 'Zambia', away: r.opponent, vumaSrc: vumaArt('zambia'), oppSrc: opponentArt(r.opponent),
      xp: r.xp, target: r.target, gap: r.gap, status: r.status, msLeft: r.msLeft, lose, final: r.round === 'final', reward };
  }
  const L = season.league;
  if (L && L.unlocked && L.current) {
    const m = L.current;
    const stage = Math.max(getStage(season.xp).stage, season.cfg?.league?.unlockStage || 12);
    const tierBonus = season.cfg?.league?.bonus?.[m.tier] || 0;
    return { kind: 'league', id: m.id, title: `${m.tierName} · Week ${m.n}`, home: VUMA_STAGES[stage - 1].club || m.home, away: m.opponent,
      vumaSrc: vumaArt(stage), oppSrc: opponentArt(m.opponent),
      xp: m.xp, target: m.target, gap: m.gap, status: m.status, msLeft: m.msLeft, claimable: m.claimable, bonus: m.bonus,
      lose: tierBonus ? `MISS IT AND YOU LOSE: ${fmt(tierBonus)} COINS + 3 POINTS` : null,
      reward: { coins: tierBonus, points: season.cfg?.league?.pointsPerWin ?? 3 } };
  }
  return null;
}

/**
 * Current match card. Before the league unlocks it shows the road to the
 * first pro club (stage 12). `compact` = the Home version. An open FRIENDLY offer
 * or a live friendly (season.friendlies) takes the slot on Home and leads the
 * Missions season section.
 */
export function MatchCard({ season, compact = false, onClaimLeague, onNavigate }) {
  if (!season) return null;
  const friendlies = Array.isArray(season.friendlies) ? season.friendlies : [];
  const link = compact && onNavigate
    ? <button type="button" className="ov-link" onClick={() => onNavigate('missions')}>Season, league and World Cup ›</button>
    : null;
  if (friendlies.length) {
    return (
      <>
        {friendlies.map(f => <FriendlySlot key={f.key} f={f} season={season} compact={compact} />)}
        {compact ? link : <RegularMatchCard season={season} onClaimLeague={onClaimLeague} />}
      </>
    );
  }
  return <RegularMatchCard season={season} compact={compact} onClaimLeague={onClaimLeague} link={link} />;
}

function RegularMatchCard({ season, compact = false, onClaimLeague, link = null }) {
  const m = currentMatch(season);
  const note = feedNote(season.status);
  if (!m) {
    // Locked until the first club (league unlockStage, 8): greyed out on the
    // village mud pitch, no link into the season (2026-10-16).
    const first = VUMA_STAGES[(season.cfg?.league?.unlockStage || 12) - 1];
    const pct = Math.min(100, (season.xp / first.xp) * 100);
    const lockedPlate = (
      <div className="pitch-plate is-dim" style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left' }}>
        <span style={{ width: 44, height: 44, borderRadius: 12, display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,.08)', flex: 'none' }}><Lock size={22} /></span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: CANDY.display, fontSize: 18, lineHeight: 1.15, textTransform: 'uppercase' }}>Matches open at level {first.stage}</div>
          <div style={{ fontSize: 12, color: C.sub }}>{fmt(first.xp - season.xp)} XP to go</div>
        </div>
      </div>
    );
    return (
      <PitchCard mud locked footer={note ? <Note text={note} /> : null}>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}><Chip status="locked" /></div>
        <PitchCentre>{lockedPlate}</PitchCentre>
        <PitchProgress pct={pct} left={`${fmt(season.xp)} / ${fmt(first.xp)} XP`} />
      </PitchCard>
    );
  }
  return <MatchBody m={{ ...m, hero: season.heroName }} compact={compact} note={note} onClaimLeague={onClaimLeague} link={link} />;
}

// ---- HOME match card: the match on a football pitch (2026-10-14) ----
// Mowed stripes + touchlines + penalty boxes behind everything; the halfway line
// and centre circle run through the REWARD plate in the middle; the XP progress
// bar sits on the bottom goal line. Text sits on dark plates (scrims) so it
// reads on the grass. The Missions tab keeps the full card (FullMatchBody).
const PITCH_LINE = 'rgba(255,255,255,.55)';
const PITCH_CSS = `
.pitch{position:relative;isolation:isolate;padding:14px 14px 16px;background:
 radial-gradient(130% 90% at 50% 50%, transparent 58%, rgba(26,8,56,.6) 100%),
 linear-gradient(180deg, rgba(26,8,56,.72) 0%, rgba(26,8,56,0) 22%, rgba(26,8,56,0) 74%, rgba(10,4,26,.7) 100%),
 radial-gradient(70% 40% at 50% 46%, rgba(255,255,255,.10), transparent 72%),
 repeating-linear-gradient(180deg, #1c6b2e 0 30px, #22803a 30px 60px)}
.pitch-lines{position:absolute;inset:8px;border:2px solid ${PITCH_LINE};border-radius:8px;pointer-events:none;z-index:0}
.pitch-lines::before,.pitch-lines::after{content:'';position:absolute;left:22%;right:22%;height:44px;border:2px solid ${PITCH_LINE}}
.pitch-lines::before{top:-2px;border-top:0;border-radius:0 0 6px 6px}
.pitch-lines::after{bottom:-2px;border-bottom:0;border-radius:6px 6px 0 0}
.pitch-body{position:relative;z-index:1}
.pitch-kicker{font-size:11px;font-weight:900;text-transform:uppercase;letter-spacing:.06em;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-shadow:0 1px 3px rgba(0,0,0,.8)}
.pitch-mid{position:relative;isolation:isolate;margin:6px -14px 0;padding:16px 14px;display:flex;flex-direction:column;align-items:center}
.pitch-mid::before{content:'';position:absolute;left:8px;right:8px;top:50%;height:2px;margin-top:-1px;background:${PITCH_LINE};z-index:-1}
.pitch-mid::after{content:'';position:absolute;left:50%;top:50%;width:136px;height:136px;transform:translate(-50%,-50%);border:2px solid ${PITCH_LINE};border-radius:50%;z-index:-1}
.pitch-plate{background:rgba(20,6,44,.9);border:2px solid ${CANDY.gold};border-radius:16px;padding:12px 16px 10px;text-align:center;box-shadow:0 0 0 1.5px ${CANDY.goldDeep},0 6px 18px rgba(0,0,0,.45),0 0 22px rgba(255,210,31,.25);max-width:100%;box-sizing:border-box}
.pitch-plate.is-dim{background:#1d1530;border-color:rgba(255,255,255,.28);box-shadow:0 6px 18px rgba(0,0,0,.45)}
.pitch-tab{display:inline-block;margin:-24px 0 6px;padding:3px 12px;border-radius:999px;background:${CANDY.gold};color:${CANDY.outline};font-size:11px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;box-shadow:0 2px 0 ${CANDY.goldDeep}}
.pitch-plate.is-dim .pitch-tab{background:#5b4f72;color:#fff;box-shadow:none}
.pitch-row{display:flex;align-items:center;justify-content:center;flex-wrap:wrap;column-gap:8px;row-gap:2px}
.pitch-unit{font-family:${CANDY.body};font-size:14px;font-weight:900;color:#fff;text-transform:lowercase}
.pitch-plus{font-family:${CANDY.display};font-size:22px;color:rgba(255,255,255,.7)}
.pitch-sub{font-size:12px;font-weight:800;color:${C.sub};margin-top:4px}
.pitch-board{margin-top:12px;text-align:center;background:rgba(14,4,32,.84);border:1.5px solid rgba(255,255,255,.14);border-radius:14px;padding:9px 10px 8px}
.pitch-mono{font-family:var(--font-mono),'JetBrains Mono',ui-monospace,monospace;font-variant-numeric:tabular-nums}
.pitch-bar{margin-top:12px;padding:9px 10px 10px;border-radius:14px;background:rgba(14,4,32,.78);border:1.5px solid rgba(255,255,255,.12)}
.pitch-foot{padding:2px 14px 10px;background:${C.panelLo}}
@media (min-width:861px){.pitch-mid::after{width:148px;height:148px}}
.pitch.is-mud{background:
 radial-gradient(130% 90% at 50% 50%, transparent 55%, rgba(40,18,6,.7) 100%),
 radial-gradient(18% 10% at 22% 30%, rgba(60,30,10,.45), transparent 70%),
 radial-gradient(14% 9% at 74% 66%, rgba(60,30,10,.4), transparent 70%),
 radial-gradient(22% 12% at 60% 20%, rgba(230,190,130,.22), transparent 70%),
 radial-gradient(20% 12% at 30% 78%, rgba(230,190,130,.18), transparent 70%),
 linear-gradient(180deg, #8a5a2e 0%, #a0703c 45%, #7b4d25 100%)}
/* village pitch = plain mud, no markings (2026-10-18) */
.pitch.is-mud .pitch-lines,.pitch.is-mud .pitch-mid::before,.pitch.is-mud .pitch-mid::after{display:none}
.pitch.is-locked .pitch-body{filter:grayscale(1);opacity:.78}
`;

function PitchCard({ children, footer = null, gold = false, mud = false, locked = false }) {
  return (
    <Card style={{ padding: 0, overflow: 'hidden', ...(gold ? { borderColor: CANDY.gold } : null) }}>
      <style dangerouslySetInnerHTML={{ __html: SEASON_CSS + PITCH_CSS }} />
      <div className={`pitch${mud ? ' is-mud' : ''}${locked ? ' is-locked' : ''}`} data-pitch aria-disabled={locked || undefined}>
        <span className="pitch-lines" aria-hidden />
        <div className="pitch-body">{children}</div>
      </div>
      {footer && <div className="pitch-foot">{footer}</div>}
    </Card>
  );
}

/** Centre of the pitch: halfway line + centre circle behind whatever sits there. */
function PitchCentre({ children }) {
  return <div className="pitch-mid">{children}</div>;
}

/** The XP bar on the bottom goal line. */
function PitchProgress({ pct, left, right = null, color }) {
  return (
    <div className="pitch-bar" data-pitch-progress>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, marginBottom: 7, fontSize: 12.5, fontWeight: 800 }}>
        <span className="pitch-mono">{left}</span>
        {right}
      </div>
      <Progress value={pct} height={14} color={color} />
    </div>
  );
}

/** What the match pays ({ coins, points, cash, text, sub }) as the big centred plate. */
function RewardPlate({ reward, label, dim = false, children }) {
  const r = reward || {};
  const big = { ...goldTitle(30), fontSize: 30, lineHeight: 1 };
  const parts = [];
  if (r.cash) parts.push(<span key="cash" style={{ ...big, fontSize: 34 }}>{r.cash}</span>);
  if (r.coins > 0) parts.push(
    <span key="coins" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <img src={COIN_ICON} alt="" width={30} height={30} style={{ width: 30, height: 30, flex: 'none' }} />
      <span style={big}>+{fmt(r.coins)}</span><span className="pitch-unit">coins</span>
    </span>);
  if (r.points > 0) parts.push(
    <span key="points" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
      <Trophy size={22} color={CANDY.gold} style={{ flex: 'none', filter: 'drop-shadow(0 2px 0 rgba(0,0,0,.5))' }} />
      <span style={big}>+{fmt(r.points)}</span><span className="pitch-unit">{r.points === 1 ? 'point' : 'points'}</span>
    </span>);
  if (r.text) parts.push(<span key="text" style={{ ...goldTitle(20), fontSize: 20, lineHeight: 1.1 }}>{r.text}</span>);
  return (
    <div data-match-reward className={`pitch-plate${dim ? ' is-dim' : ''}`}>
      <span className="pitch-tab">{label}</span>
      {parts.length > 0 && (
        <div className="pitch-row" style={dim ? { filter: 'grayscale(.7)' } : null}>
          {parts.reduce((acc, p, i) => (i ? [...acc, <span key={`plus${i}`} className="pitch-plus" aria-hidden>+</span>, p] : [p]), [])}
        </div>
      )}
      {r.sub && <div className="pitch-sub">{r.sub}</div>}
      {children}
    </div>
  );
}

/** Home version of the match card (league, World Cup or a live friendly). */
function PitchMatch({ m, note = null, onClaimLeague, link = null }) {
  const liveMs = useLiveMs(m.msLeft);
  const pct = Math.min(100, (m.xp / m.target) * 100);
  const won = m.status === 'won';
  const lost = m.status === 'lost';
  const friendly = m.kind === 'friendly';
  const label = won ? 'You won' : lost ? 'Missed' : friendly ? 'Win it back' : 'Win';
  return (
    <PitchCard gold={won || friendly} footer={(note || link) ? <><Note text={note} />{link}</> : null}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 6 }}>
        <span className="pitch-kicker" style={{ color: m.kind === 'league' ? '#fff' : CANDY.gold }}>{m.title}</span>
        {friendly ? <Badge bg={CANDY.gold}>Friendly</Badge> : <Chip status={m.status} />}
      </div>
      <VersusPicture bare home={m.home} away={m.away} vumaSrc={m.vumaSrc} oppSrc={m.oppSrc} hero={m.hero} h={130} />
      <PitchCentre>
        <RewardPlate reward={m.reward} label={label} dim={lost}>
          {m.kind === 'league' && m.claimable && (
            <GreenBtn full onClick={(e) => onClaimLeague && onClaimLeague(m.id, e.currentTarget)} style={{ marginTop: 10 }}>Collect +{fmt(m.bonus)} coins</GreenBtn>
          )}
        </RewardPlate>
      </PitchCentre>
      <div className="pitch-board">
        {won ? (
          <div style={{ ...goldTitle(28), color: C.green, textAlign: 'center' }}>Won!</div>
        ) : lost ? (
          <div style={{ ...goldTitle(28), color: C.red, textAlign: 'center' }}>Lost</div>
        ) : (
          <>
            <div style={{ fontSize: 10.5, fontWeight: 900, color: '#ff8a80', textTransform: 'uppercase', letterSpacing: '.14em', marginBottom: 4 }}>Full-time in</div>
            <div data-countdown className="sc-pulse pitch-mono" style={{ display: 'inline-block', borderRadius: 8, fontWeight: 800, fontSize: 30, lineHeight: 1, color: '#FF4D42', whiteSpace: 'nowrap' }}>{countdownText(liveMs)}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.sub, marginTop: 6 }}>Reach {fmt(m.target)} XP before full-time to win</div>
          </>
        )}
      </div>
      {!won && !lost && m.lose && (
        <div data-lose-line className="sc-pulse" style={{ marginTop: 10, padding: '8px 10px', borderRadius: 12, background: 'rgba(90,6,6,.88)', border: '1.5px solid #FF4D42', fontSize: 12.5, fontWeight: 900, color: '#FF4D42', textAlign: 'center', letterSpacing: '.03em' }}>{m.lose}</div>
      )}
      <PitchProgress pct={pct} color={won ? C.green : undefined} left={`${fmt(m.xp)} / ${fmt(m.target)} XP`}
        right={won
          ? <span style={{ color: C.green }}>Match won!</span>
          : <span data-live-gap style={{ color: CANDY.gold, textAlign: 'right' }}>{fmt(m.gap)} XP to go</span>} />
    </PitchCard>
  );
}

/** The match card itself (league, World Cup or a live friendly). `compact` = the Home pitch card. */
function MatchBody({ m, compact = false, note = null, onClaimLeague, link = null }) {
  if (compact) return <PitchMatch m={m} note={note} onClaimLeague={onClaimLeague} link={link} />;
  return <FullMatchBody m={m} note={note} onClaimLeague={onClaimLeague} link={link} />;
}

/** Missions-tab match card (unchanged design). */
function FullMatchBody({ m, compact = false, note = null, onClaimLeague, link = null }) {
  const liveMs = useLiveMs(m.msLeft);
  const pct = Math.min(100, (m.xp / m.target) * 100);
  const won = m.status === 'won';
  const finished = won || m.status === 'lost';
  return (
    <Card style={{ padding: compact ? 14 : 16, ...(won || m.kind === 'friendly' ? { borderColor: CANDY.gold } : null) }}>
      <style dangerouslySetInnerHTML={{ __html: SEASON_CSS }} />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
        <span style={{ fontSize: 11, fontWeight: 900, color: m.kind === 'league' ? C.muted : CANDY.gold, textTransform: 'uppercase', letterSpacing: '.06em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</span>
        {m.kind === 'friendly' ? <Badge bg={CANDY.gold}>Friendly</Badge> : <Chip status={m.status} />}
      </div>
      <VersusPicture home={m.home} away={m.away} vumaSrc={m.vumaSrc} oppSrc={m.oppSrc} hero={m.hero} h={compact ? 150 : 180} />
      {/* the countdown sits in the centre, big */}
      <div style={{ textAlign: 'center', margin: '12px 0 8px' }}>
        {won ? (
          <div style={{ ...goldTitle(compact ? 30 : 36), color: C.green, textAlign: 'center' }}>Won!</div>
        ) : m.status === 'lost' ? (
          <div style={{ ...goldTitle(compact ? 30 : 36), color: C.red, textAlign: 'center' }}>Lost</div>
        ) : (
          <>
            <div style={{ fontSize: 11, fontWeight: 900, color: '#ff8a80', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 4 }}>Full-time in</div>
            <div data-countdown className="sc-pulse" style={{ display: 'inline-block', borderRadius: 10, fontFamily: CANDY.display, fontWeight: 900, fontSize: compact ? 34 : 44, lineHeight: 1, color: '#FF4D42', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{countdownText(liveMs)}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.sub, marginTop: 6 }}>Reach {fmt(m.target)} XP before full-time to win{m.winBack ? `: ${m.winBack}` : ''}</div>
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
      {!finished && m.lose && (
        <div data-lose-line className="sc-pulse" style={{ marginTop: 10, padding: '8px 10px', borderRadius: 12, background: 'rgba(120,10,10,.55)', border: '1.5px solid #FF4D42', fontSize: 12.5, fontWeight: 900, color: '#FF4D42', textAlign: 'center', letterSpacing: '.03em' }}>{m.lose}</div>
      )}
      {m.kind === 'league' && m.claimable && (
        <GreenBtn full onClick={(e) => onClaimLeague && onClaimLeague(m.id, e.currentTarget)} style={{ marginTop: 10 }}>Collect +{fmt(m.bonus)} coins</GreenBtn>
      )}
      <Note text={note} />
      {link}
    </Card>
  );
}

// ---- FRIENDLY MATCH: the second chance after a loss (lib/season/friendly.mjs) ----

/** What winning the friendly gives back: "+150 coins + 3 points" / "Zambia back in the World Cup". */
export function friendlyWinBack(f) {
  if (!f) return '';
  if (f.kind === 'league') return `+${fmt(f.winBonus)} coins + ${f.winPoints ?? 3} points`;
  if (f.round === 'knockout') return 'Zambia back in the World Cup';
  return `+${fmt(f.winBonus)} coins`;
}
/** The same as structured plate data for the Home pitch card. */
function friendlyReward(f) {
  if (!f) return null;
  if (f.kind === 'league') return { coins: f.winBonus, points: f.winPoints ?? 3 };
  if (f.round === 'knockout') return { text: 'Zambia back in the World Cup' };
  return { coins: f.winBonus };
}
const friendlyArt = (f) => ({ vumaSrc: f.kind === 'wc' ? vumaArt('zambia') : vumaArt(f.homeStage || 6), oppSrc: opponentArt(f.opponent) });

function FriendlySlot({ f, season, compact }) {
  if (f.status === 'offer') return <FriendlyOfferCard f={f} season={season} compact={compact} />;
  const m = {
    kind: 'friendly', id: f.key, title: `Friendly · ${f.title || ''}`, home: f.home || season?.heroName || HERO_DEFAULT, hero: season?.heroName, away: f.opponent, ...friendlyArt(f),
    xp: f.xp, target: f.target, gap: f.gap, status: f.status === 'won' ? 'won' : f.status === 'lost' ? 'lost' : 'live', msLeft: f.msLeft,
    lose: 'MISS IT AND THE LOSS STANDS', winBack: friendlyWinBack(f), reward: friendlyReward(f),
  };
  return <MatchBody m={m} compact={compact} />;
}

/**
 * The offer: opponent squad art, target, what you win back, cost, its own
 * countdown, accept (two taps: Play -> Confirm) and "No thanks". Actions come
 * from season.onAcceptFriendly / season.onDeclineFriendly; season.coins is the
 * balance for the "not enough coins" state.
 */
export function FriendlyOfferCard({ f, season, compact = false, inModal = false, onDone }) {
  const liveMs = useLiveMs(f ? f.msLeft : 0);
  const [confirm, setConfirm] = React.useState(false);
  if (!f) return null;
  const coins = Number(season?.coins) || 0;
  const short = coins < f.cost;
  const hours = season?.cfg?.friendly?.windowHours ?? 24;
  const expired = liveMs <= 0;
  const small = compact || inModal;
  const onAccept = (el) => {
    const ok = season?.onAcceptFriendly ? season.onAcceptFriendly(f.key, el) : false;
    if (ok) { setConfirm(false); if (onDone) onDone(); }
  };
  const offerChip = (
    <span data-offer-countdown className="sc-pulse" style={{ display: 'inline-block', padding: '6px 12px', borderRadius: 999, background: 'rgba(120,10,10,.55)', border: '1.5px solid #FF4D42', color: '#FF4D42', fontWeight: 900, fontSize: 12.5, letterSpacing: '.05em', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
      {expired ? 'OFFER ENDED' : `OFFER ENDS IN ${countdownText(liveMs)}`}
    </span>
  );
  const actions = (
    <>
      {short ? (
        <>
          <GreenBtn full disabled size={18} style={{ minHeight: 50 }}>Play for {fmt(f.cost)} coins</GreenBtn>
          <div data-friendly-short style={{ fontSize: 12.5, fontWeight: 800, color: '#ff8a80', textAlign: 'center', marginTop: 6 }}>Not enough coins: you have {fmt(coins)}, you need {fmt(f.cost)}</div>
        </>
      ) : confirm ? (
        <div data-friendly-confirm style={{ background: C.track, border: `2px solid ${CANDY.gold}`, borderRadius: 14, padding: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 800, textAlign: 'center', marginBottom: 8, lineHeight: 1.35 }}>Pay {fmt(f.cost)} coins to play {f.opponent}? If you miss the target the loss stands. No refund.</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <GreenBtn color="violet" size={16} onClick={() => setConfirm(false)} style={{ flex: 1, padding: '0 10px' }}>Cancel</GreenBtn>
            <GreenBtn size={16} disabled={expired} onClick={(e) => onAccept(e.currentTarget)} style={{ flex: 1.4, padding: '0 10px' }}>Confirm</GreenBtn>
          </div>
        </div>
      ) : (
        <GreenBtn full size={18} disabled={expired} onClick={() => setConfirm(true)} style={{ minHeight: 50 }}>Play for {fmt(f.cost)} coins</GreenBtn>
      )}
      <button type="button" data-friendly-decline onClick={() => { if (season?.onDeclineFriendly) season.onDeclineFriendly(f.key); if (onDone) onDone(); }}
        style={{ all: 'unset', boxSizing: 'border-box', cursor: 'pointer', display: 'block', width: '100%', minHeight: 40, lineHeight: '40px', textAlign: 'center', fontSize: 13, fontWeight: 800, color: C.sub, textDecoration: 'underline' }}>No thanks</button>
    </>
  );
  if (compact && !inModal) {
    // Home: the offer on the pitch, what you win back in the centre circle.
    return (
      <PitchCard gold>
        <div data-friendly-offer style={{ textAlign: 'center', textShadow: '0 1px 3px rgba(0,0,0,.8)' }}>
          <div style={{ fontSize: 10.5, fontWeight: 900, color: 'rgba(255,255,255,.75)', textTransform: 'uppercase', letterSpacing: '.08em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Lost to {f.lostTo} · {f.title}</div>
          <div style={{ ...goldTitle(22), textAlign: 'center', marginTop: 3, lineHeight: 1.05 }}>Friendly match</div>
        </div>
        <VersusPicture bare home={f.home || season?.heroName || HERO_DEFAULT} hero={season?.heroName} away={f.opponent} {...friendlyArt(f)} h={120} />
        <PitchCentre>
          <div data-friendly-winback style={{ maxWidth: '100%' }}><RewardPlate reward={friendlyReward(f)} label="Win it back" /></div>
        </PitchCentre>
        <div className="pitch-board">
          <div style={{ fontSize: 10.5, fontWeight: 900, color: C.muted, textTransform: 'uppercase', letterSpacing: '.1em' }}>Your target</div>
          <div data-friendly-target style={{ fontFamily: CANDY.display, fontSize: 17, lineHeight: 1.2, margin: '2px 0 8px' }}>Reach {fmt(f.target)} XP in {hours}h</div>
          {offerChip}
        </div>
        <div className="pitch-bar">{actions}</div>
      </PitchCard>
    );
  }
  const inner = (
    <>
      <style dangerouslySetInnerHTML={{ __html: SEASON_CSS }} />
      <div data-friendly-offer style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 10.5, fontWeight: 900, color: C.muted, textTransform: 'uppercase', letterSpacing: '.08em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Lost to {f.lostTo} · {f.title}</div>
        <div style={{ ...goldTitle(small ? 22 : 26), textAlign: 'center', marginTop: 3, lineHeight: 1.05 }}>Friendly match</div>
        <div style={{ fontFamily: CANDY.display, fontSize: small ? 13.5 : 15, color: '#fff', letterSpacing: '.05em', textTransform: 'uppercase', marginTop: 2 }}>Win your chance back</div>
      </div>
      <div style={{ margin: '10px 0' }}>
        <VersusPicture home={f.home || season?.heroName || HERO_DEFAULT} hero={season?.heroName} away={f.opponent} {...friendlyArt(f)} h={inModal ? 120 : compact ? 140 : 165} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 8 }}>
        <div style={{ background: C.panel2, border: `1.5px solid ${CANDY.violet.dark}`, borderRadius: 12, padding: '8px 10px' }}>
          <div style={{ fontSize: 10, fontWeight: 900, color: C.muted, textTransform: 'uppercase', letterSpacing: '.06em' }}>Your target</div>
          <div data-friendly-target style={{ fontFamily: CANDY.display, fontSize: 15.5, lineHeight: 1.2 }}>Reach {fmt(f.target)} XP in {hours}h</div>
        </div>
        <div style={{ background: 'rgba(67,194,26,.12)', border: `1.5px solid ${C.green}`, borderRadius: 12, padding: '8px 10px' }}>
          <div style={{ fontSize: 10, fontWeight: 900, color: C.muted, textTransform: 'uppercase', letterSpacing: '.06em' }}>Win it back</div>
          <div data-friendly-winback style={{ fontFamily: CANDY.display, fontSize: 15.5, lineHeight: 1.2, color: '#9BF06F' }}>{friendlyWinBack(f)}</div>
        </div>
      </div>
      <div style={{ textAlign: 'center', margin: '12px 0 10px' }}>{offerChip}</div>
      {actions}
    </>
  );
  if (inModal) return <div>{inner}</div>;
  return <Card style={{ padding: compact ? 14 : 16, borderColor: CANDY.gold }}>{inner}</Card>;
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
        <div style={{ fontFamily: CANDY.display, textTransform: 'uppercase', fontSize: 17 }}>League record</div>
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

/** World Cup path: locked teaser before stage 22, then the 8 matches. */
export function WorldCupPath({ worldCup, cfg, prize, onClaim, onClaimPrize, prizeBusy = false }) {
  if (!worldCup) return null;
  const unlockStage = VUMA_STAGES[(cfg?.worldCup?.unlockStage || 22) - 1];
  const prizeK = `K${fmt(cfg?.worldCup?.prizeKwacha ?? 10000)}`;
  if (!worldCup.unlocked) {
    return (
      <Card style={{ padding: 14, position: 'relative', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 46, height: 46, flex: 'none', borderRadius: 12, display: 'grid', placeItems: 'center', background: C.track }}><Lock size={20} color={CANDY.gold} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: CANDY.display, textTransform: 'uppercase', fontSize: 18, lineHeight: 1.15 }}>World Cup with Zambia</div>
            <div data-wc-teaser style={{ fontSize: 12.5, color: C.sub, fontWeight: 700 }}>Reach level {unlockStage.stage} to play for Zambia</div>
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
        <div style={{ fontFamily: CANDY.display, textTransform: 'uppercase', fontSize: 17 }}>Zambia at the World Cup</div>
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
                  <span style={{ display: 'block', fontFamily: CANDY.display, textTransform: 'uppercase', fontSize: 15.5, lineHeight: 1.2 }}>Zambia vs {r.opponent}</span>
                </span>
                {r.claimable
                  ? <GreenBtn size={14} onClick={(e) => onClaim && onClaim(r.id, e.currentTarget)} style={{ minHeight: 40, padding: '0 12px', marginBottom: 4 }}>+{fmt(r.bonus)}</GreenBtn>
                  : r.friendly && r.friendly.status === 'live' ? <Badge bg={CANDY.gold}>Friendly</Badge> : <Chip status={r.status} />}
              </div>
              {(r.status === 'live' || r.status === 'won' || r.status === 'lost') && (
                <div style={{ marginTop: 6 }}>
                  <Progress value={pct} height={8} color={r.status === 'won' ? C.green : r.status === 'lost' ? C.red : undefined} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 800, marginTop: 4, color: C.sub }}>
                    <span>{fmt(r.xp)} / {fmt(r.target)} XP</span>
                    {r.status === 'live' && <span style={{ color: CANDY.gold }}>{fmt(r.gap)} XP to go, {leftText(r.msLeft)}</span>}
                    {r.friendly && r.friendly.status === 'live' && <span style={{ color: CANDY.gold, textAlign: 'right' }}>Friendly: {fmt(r.friendly.xp)} / {fmt(r.friendly.target)} XP</span>}
                    {r.status === 'won' && r.viaFriendly && !(r.claimed && r.bonus > 0) && <span style={{ color: C.green }}>Won back in the friendly</span>}
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
// The quest picture fills its box (img cover; an emoji tile when the file is missing).
function QuestPicture({ hustle, hero, dim = false }) {
  const [failed, setFailed] = React.useState(false);
  React.useEffect(() => setFailed(false), [hustle.image]);
  const look = dim ? { filter: 'grayscale(.85) brightness(.55)' } : null;
  if (!failed) {
    return <img src={hustle.image} alt={heroText(hustle.level.name, hero)} onError={() => setFailed(true)}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', display: 'block', ...look }} />;
  }
  return (
    <div data-hustle-fallback style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: `radial-gradient(circle at 50% 35%, ${CANDY.glow}, ${C.track} 75%)`, ...look }}>
      <span style={{ fontSize: 56, filter: 'drop-shadow(0 4px 0 rgba(0,0,0,.35))' }}>{HUSTLE_EMOJI[hustle.level.level - 1] || '🧽'}</span>
    </div>
  );
}

/**
 * The hero's side quest (redesign 2026-10-29, owner: a proper card the height
 * of the match card, not a thin bar): SIDE QUEST title, the quest picture
 * (public/vuma/quest-NN.jpg, the hero doing the trade), the trade name, coins a
 * day, the stock bar to the next trade ([data-hustle-target]: overflow XP stars
 * fly there) and Collect. Locked (below level 2) = the first trade's picture
 * dimmed under an "Opens at level 2" lock plate. The card fills its grid cell
 * (height 100%), so on desktop it matches the match card beside it.
 * `hero` = the player's name (level names say "Vuma" in config; swapped at render).
 */
// Phones: a 2:1 picture. Desktop Home (beside the match card): the picture
// only fills the space left, so the card never grows taller than the match card.
const HQ_CSS = `
  .hq-pic { aspect-ratio: 16 / 8; min-height: 150px; }
  @media (min-width: 861px) { .ov-season .hq-pic { aspect-ratio: auto; min-height: 96px; } .ov-season .hq-hint { display: none; } }
`;
export function HustleCard({ hustle, onCollect, busy = false, hero = HERO_DEFAULT }) {
  if (!hustle) return null;
  const locked = !hustle.unlocked;
  const L = hustle.level;
  const next = hustle.next;
  const stockPct = next ? Math.max(0, Math.min(100, ((hustle.stock - L.stock) / (next.stock - L.stock)) * 100)) : 100;
  return (
    <Card style={{ padding: 0, overflow: 'hidden', height: '100%', boxSizing: 'border-box' }}>
      <div data-hustle-card={locked ? 'locked' : 'open'} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '12px 14px 10px' }}>
          <h3 style={goldTitle(21)}>Side quest</h3>
          {locked
            ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 900, letterSpacing: '.06em', color: C.muted, textTransform: 'uppercase' }}><Lock size={12} aria-hidden /> Locked</span>
            : <Badge bg={CANDY.gold}>Level {L.level}</Badge>}
        </div>
        <style dangerouslySetInnerHTML={{ __html: HQ_CSS }} />
        <div className="hq-pic" style={{ position: 'relative', flex: '1 1 auto', overflow: 'hidden', background: C.track }}>
          <QuestPicture hustle={hustle} hero={hero} dim={locked} />
          {locked && (
            <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', padding: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', background: '#1d1530', border: '2px solid rgba(255,255,255,.28)', borderRadius: 16, padding: '12px 16px', boxShadow: '0 6px 18px rgba(0,0,0,.45)', maxWidth: '100%', boxSizing: 'border-box' }}>
                <span style={{ width: 44, height: 44, borderRadius: 12, display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,.08)', flex: 'none' }}><Lock size={22} aria-hidden /></span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: CANDY.display, fontSize: 18, lineHeight: 1.15, textTransform: 'uppercase' }}>Opens at level 2</div>
                  <div style={{ fontSize: 12, color: C.sub }}>Claim your daily reward to get there</div>
                </div>
              </div>
            </div>
          )}
          {/* Collect sits on the picture, so an open quest is no taller than a locked one */}
          {!locked && (
            <div style={{ position: 'absolute', left: 12, right: 12, bottom: 10 }}>
              {hustle.ready > 0
                ? <GreenBtn full size={16} disabled={busy} onClick={(e) => onCollect && onCollect(e.currentTarget)}>Collect {fmt(hustle.ready)} coins</GreenBtn>
                : <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '8px 12px', borderRadius: 12, background: 'rgba(20,6,44,.85)', fontSize: 12.5, fontWeight: 800, color: C.green }}><Check size={14} /> Collected today, back tomorrow</div>}
            </div>
          )}
        </div>
        <div style={{ padding: '12px 14px 14px', display: 'grid', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 10.5, fontWeight: 900, color: C.muted, textTransform: 'uppercase', letterSpacing: '.06em' }}>{locked ? 'First trade' : 'Your trade'}</div>
              <div style={{ fontFamily: CANDY.display, textTransform: 'uppercase', fontSize: 19, lineHeight: 1.15 }}>{heroText(L.name, hero)}</div>
            </div>
            <div style={{ flex: 'none', textAlign: 'right' }}>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: CANDY.display, fontSize: 20, lineHeight: 1, color: CANDY.gold }}>
                <img src={COIN_ICON} alt="" width={20} height={20} />{fmt(L.pay)}
              </div>
              <div style={{ fontSize: 11, fontWeight: 800, color: C.sub }}>coins a day</div>
            </div>
          </div>
          {next ? (
            <div data-hustle-target>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 11, fontWeight: 800, color: C.sub, marginBottom: 4 }}>
                <span style={{ minWidth: 0 }}>Next: {heroText(next.name, hero)}</span><span style={{ flex: 'none', fontVariantNumeric: 'tabular-nums' }}>{fmt(hustle.toNext)} XP to go</span>
              </div>
              <Progress value={stockPct} height={10} color="linear-gradient(180deg, #7BE34F, #43C21A)" />
              <div className="hq-hint" style={{ fontSize: 10.5, color: C.muted, marginTop: 4 }}>XP over the daily and weekly limits stocks the side quest.</div>
            </div>
          ) : (
            <div data-hustle-target style={{ fontSize: 12, fontWeight: 900, color: CANDY.gold }}>Top trade reached</div>
          )}
          {!locked && hustle.closedDays > 0 && hustle.ready > 0 && (
            <div style={{ fontSize: 11.5, color: '#ffb199', fontWeight: 700 }}>{hustle.closedDays > 7 ? 'The shop was closed while you were away.' : `The shop was closed for ${hustle.closedDays} ${hustle.closedDays === 1 ? 'day' : 'days'}.`} Pay keeps for 2 days, so collect daily.</div>
          )}
        </div>
      </div>
    </Card>
  );
}

/**
 * A mission section that is not open yet (owner 2026-10-22): greyed out with a
 * lock, only its name showing. The World Cup was locked this way until
 * 2026-10-27 (WORLD_CUP_OPEN); the England Premier League mission is coming.
 */
export function LockedMission({ title }) {
  return (
    <Card data-locked-mission style={{ padding: 16, filter: 'grayscale(1)', opacity: 0.55 }} aria-label={`${title}, locked`}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ width: 46, height: 46, flex: 'none', borderRadius: 12, display: 'grid', placeItems: 'center', background: C.track }}><Lock size={20} color={C.muted} aria-hidden /></span>
        <div style={{ flex: 1, minWidth: 0, fontFamily: CANDY.display, textTransform: 'uppercase', fontSize: 19, lineHeight: 1.15, color: C.sub }}>{title}</div>
      </div>
    </Card>
  );
}

/** Missions tab section: match card, league record, the World Cup path (teaser / 8 rounds + prize claim; a locked card while WORLD_CUP_OPEN is false) + the locked Premier League mission. */
export function SeasonSection({ season, onClaimLeague, onClaimWc, onClaimPrize, prizeBusy }) {
  if (!season) return null;
  const L = season.league;
  return (
    <section aria-labelledby="season-title" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 12 }}>
      <SectionTitle id="season-title" right={L?.unlocked ? <TitleNote>{L.record.points} pts</TitleNote> : null}>Season</SectionTitle>
      <MatchCard season={season} onClaimLeague={onClaimLeague} />
      <LeagueRecord league={L} onClaim={onClaimLeague} />
      {WORLD_CUP_OPEN
        ? <WorldCupPath worldCup={season.worldCup} cfg={season.cfg} prize={season.prize} onClaim={onClaimWc} onClaimPrize={onClaimPrize} prizeBusy={prizeBusy} />
        : <LockedMission title="FIFA World Cup Mission" />}
      <LockedMission title="England Premier League Mission" />
    </section>
  );
}

const RESULT_COPY = {
  win: { title: 'You won!', line: (e) => `${e.home} beat ${e.away}` },
  loss: { title: 'Match lost', line: (e) => `${e.away} were too strong this time` },
  knockedOut: { title: 'Knocked out', line: (e) => `${e.away} knock Zambia out. The league goes on!` },
  champion: { title: 'Champions!', line: () => 'Zambia win the World Cup!' },
  friendlyWon: { title: 'Chance won back!', line: (e) => e.matchKind === 'wc' && e.round === 'knockout'
    ? `Zambia are back in the World Cup!${e.next ? ` Next: ${e.next}` : ''}`
    : `The loss to ${e.lostTo} now counts as a win` },
  friendlyLost: { title: 'The loss stands', line: (e) => `${e.away} held on. The loss to ${e.lostTo} stands.` },
};

/**
 * Result moment (LevelUpModal style). event = { kind: 'win'|'loss'|'knockedOut'|'champion',
 * home, away, xp, target, bonus, claimable, matchKind: 'league'|'wc', matchId }.
 */
export function SeasonResultModal({ event, onClose, onClaim, onClaimPrize, prizeK = 'K10,000', prizeStatus = null, offer = null, season = null }) {
  if (!event) return null;
  const copy = RESULT_COPY[event.kind] || RESULT_COPY.win;
  const good = event.kind === 'win' || event.kind === 'champion' || event.kind === 'friendlyWon';
  const isFriendly = event.kind === 'friendlyWon' || event.kind === 'friendlyLost';
  // a loss with an open FRIENDLY offer shows the offer instead of "Continue"
  const showOffer = !!(offer && offer.status === 'offer' && (event.kind === 'loss' || event.kind === 'knockedOut'));
  return (
    <div onClick={onClose} role="dialog" aria-modal="true" aria-label={copy.title} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(8,4,20,.78)', backdropFilter: 'blur(4px)', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', placeItems: 'center', padding: 20, fontFamily: CANDY.body, color: '#fff', overflowY: 'auto' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...goldRim, boxShadow: `${goldRim.boxShadow}, 0 24px 70px rgba(0,0,0,.6)`, position: 'relative', width: 'min(380px, 100%)', boxSizing: 'border-box', padding: 9, borderRadius: 26, margin: 'auto 0' }}>
        <span aria-hidden style={{ ...dotRow(false), top: 0.5, left: 22, right: 22, height: 8 }} />
        <span aria-hidden style={{ ...dotRow(false), bottom: 0.5, left: 22, right: 22, height: 8 }} />
        <div style={{ borderRadius: 18, background: innerGlow, padding: '22px 18px 12px', textAlign: 'center' }}>
          <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: '.08em', textTransform: 'uppercase', color: C.muted }}>{isFriendly ? 'Friendly match' : event.matchKind === 'wc' ? `World Cup · ${event.label || ''}` : 'League match'}</div>
          <h2 data-result-title style={{ ...goldTitle(32), textAlign: 'center', marginTop: 4, ...(good ? null : { color: '#fff' }) }}>{copy.title}</h2>
          <div style={{ margin: showOffer ? '10px 0 8px' : '14px 0 10px' }}>
            <VersusPicture home={event.home} away={event.away} hero={season?.heroName} h={showOffer ? 100 : 150}
              vumaSrc={event.matchKind === 'wc' ? vumaArt('zambia') : vumaArt(event.homeStage || 6)} oppSrc={opponentArt(event.away)} />
          </div>
          <div style={{ fontFamily: CANDY.display, fontSize: 19, lineHeight: 1.2 }}>{copy.line(event)}</div>
          {event.kind !== 'champion' && <div style={{ fontSize: 12.5, color: C.sub, margin: showOffer ? '4px 0 12px' : '4px 0 14px' }}>{fmt(event.xp)} / {fmt(event.target)} XP</div>}
          {showOffer && (
            <div style={{ borderTop: `2px dashed ${CANDY.violet.dark}`, paddingTop: 12, marginBottom: 4 }}>
              <FriendlyOfferCard f={offer} season={season} inModal onDone={onClose} />
            </div>
          )}
          {event.kind === 'champion' && <div style={{ fontSize: 13.5, color: CANDY.gold, fontWeight: 900, margin: '6px 0 14px' }}>{prizeK} real-money prize</div>}
          {event.claimable && event.bonus > 0 && (
            <div style={{ background: C.track, border: `2px solid ${CANDY.violet.dark}`, borderRadius: 14, padding: '10px 14px', marginBottom: 14 }}>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.08em' }}>Win bonus</div>
              <CurrencyAmounts r={{ kwacha: event.bonus }} size={22} fontSize={18} style={{ justifyContent: 'center' }} />
            </div>
          )}
          {showOffer ? null : event.kind === 'champion' && !prizeStatus
            ? <GreenBtn full size={22} onClick={onClaimPrize} style={{ minHeight: 56, borderRadius: 18 }}><Trophy size={20} /> Claim {prizeK}</GreenBtn>
            : event.claimable && event.bonus > 0
              ? <GreenBtn full size={22} onClick={(e) => onClaim && onClaim(e.currentTarget)} style={{ minHeight: 56, borderRadius: 18 }}>Collect</GreenBtn>
              : <GreenBtn full size={22} color={good ? 'green' : 'violet'} onClick={onClose} style={{ minHeight: 56, borderRadius: 18 }}>Continue</GreenBtn>}
        </div>
      </div>
    </div>
  );
}
