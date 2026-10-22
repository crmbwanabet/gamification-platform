'use client';

import React from 'react';
import { C, CANDY } from './tokens';
import RedesignShell, { GreenBtn, SectionTitle, TitleNote, Card, Thumb, Badge, Progress, CurrencyAmounts, RewardIcon } from './RedesignShell';
import { IMAGES } from '@/lib/data/images';
import { amountText } from '@/lib/rewardText.mjs';
import XpStar, { XpAmount, XP_BLUE, XP_BAR } from './XpStar';
import { GEMS } from '@/lib/economy/currency.mjs';
import { MISSIONS } from '@/lib/data/missions';
import { missionStates as buildMissionStates, missionTerms, missionBoard, progressUnit } from '@/lib/missions/ladder.mjs';
import { xpSourceLines } from '@/lib/xp/sources.mjs';
import { heroName, heroText, playerName } from '@/lib/profile/name.mjs';
import { XP_LEVELS, LEVEL_REWARDS, getLevel } from '@/lib/data/platform';
import { Check, Lock, LogIn, RefreshCw } from 'lucide-react';
import { getStage, getNextStage, stageProgress, nextStageLabel } from '@/lib/vuma/stages.mjs';
import { SeasonSection } from './SeasonCards';
import { Predictions, Leaderboard, Album } from '../extras/ExtrasViews';

const LUSAKA_OFFSET_MS = 2 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

// Milliseconds until the next Africa/Lusaka midnight (UTC+2, no DST).
export function msToLusakaReset(now = Date.now()) {
  const local = now + LUSAKA_OFFSET_MS;
  return DAY_MS - (((local % DAY_MS) + DAY_MS) % DAY_MS);
}
export function resetText(ms) {
  const mins = Math.max(1, Math.ceil(ms / 60000));
  return `Resets in ${Math.floor(mins / 60)}h ${mins % 60}m`;
}
export function useResetText() {
  const [t, setT] = React.useState('Resets at midnight');
  React.useEffect(() => {
    const tick = () => setT(resetText(msToLusakaReset()));
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, []);
  return t;
}

// Desktop (>860px, the shell's own breakpoint): two columns, Vuma panel on the right.
const EV_CSS = `
  .ev-cols { display: block; }
  .ev-vuma { display: none; }
  @media (min-width: 861px) {
    .ev-cols { display: grid; grid-template-columns: 1.25fr 1fr; gap: 28px; align-items: start; }
    .ev-vuma { display: block; }
    .ev-xp-sources { display: none; }
  }
`;

export const MISSION_DIFF = {
  easy: { label: 'Easy', c: C.green },
  medium: { label: 'Medium', c: C.gold },
  hard: { label: 'Hard', c: C.red },
  legend: { label: 'Legend', c: '#b48cf2' },
};

// What to tell the player about round tracking (null = nothing to say).
export function trackingNote(status) {
  if (status === 'anon') return { icon: 'login', text: 'Log in on bwanabet.com to track missions' };
  if (status === 'loading') return { icon: 'sync', text: 'Loading your casino rounds…' };
  if (status === 'nodata' || status === 'unavailable') return { icon: 'sync', text: 'Play casino on bwanabet.com — progress updates every few minutes' };
  return null;
}

function RewardChips({ r }) {
  return <CurrencyAmounts r={r} />;
}


export const XP_COLOR = XP_BLUE;

function XpChip({ xp, fontSize = 13 }) {
  return <XpAmount size={18} style={{ fontSize, fontWeight: 900 }}>+{amountText(xp, 'xp')}</XpAmount>;
}

// "How to earn XP" — the lines come from lib/xp/sources.mjs, so retuning a
// number there updates this list too.
function XpSources({ cfg = null, displayName = null, userId = null }) {
  return (
    <Card style={{ padding: '11px 14px', marginBottom: 12 }}>
      <div style={{ fontFamily: CANDY.display, textTransform: 'uppercase', fontSize: 16, color: CANDY.gold, letterSpacing: '.03em', marginBottom: 7 }}>How to earn XP</div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
        {xpSourceLines(cfg || undefined).map(l => (
          <li key={l.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, fontSize: 12, lineHeight: 1.35 }}>
            <XpStar size={15} style={{ marginTop: 1 }} />
            <span><b style={{ color: C.text, fontWeight: 800 }}>{l.title}</b><span style={{ color: C.sub }}> — {heroText(l.text, displayName, userId)}</span></span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

// The full 17-stage "Stage milestones" list was removed 2026-10-18 (owner: the
// story should stay a mystery). Phones keep the "how to earn XP" box here;
// desktop shows it in the road column.
function RewardsSection({ seasonCfg = null, displayName = null, userId = null }) {
  return (
    <section className="ev-xp-sources">
      <XpSources cfg={seasonCfg} displayName={displayName} userId={userId} />
    </section>
  );
}

// The BwanaBet missions summary: how many of the one-time missions are collected.
function MissionsSummary({ status, done = 0, total = 0 }) {
  const note = trackingNote(status);
  const showCount = status !== 'anon';
  return (
    <Card style={{ padding: '12px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 44, height: 44, flex: 'none', borderRadius: 12, background: C.track, display: 'grid', placeItems: 'center' }}>
        {status === 'anon' ? <LogIn size={20} color={C.gold} /> : <span style={{ fontSize: 22 }}>🏆</span>}
      </div>
      <div style={{ flex: 1, minWidth: 0, lineHeight: 1.3 }}>
        {showCount && (
          <div style={{ fontFamily: CANDY.display, fontSize: 18, color: C.text }}>
            <span style={{ fontVariantNumeric: 'tabular-nums', color: CANDY.gold }}>{done}</span> of {total} missions collected
          </div>
        )}
        {note ? (
          <div style={{ fontSize: status === 'anon' ? 13.5 : 11.5, fontWeight: status === 'anon' ? 800 : 500, color: status === 'anon' ? C.text : C.sub, display: 'flex', alignItems: 'center', gap: 5 }}>
            {status !== 'anon' && <RefreshCw size={11} color={C.muted} style={{ flex: 'none' }} />}
            <span>{note.text}</span>
          </div>
        ) : (
          <div style={{ fontSize: 11.5, color: C.muted }}>Each mission pays once. A new mission counts from when you collected the one before.</div>
        )}
      </div>
    </Card>
  );
}

// A mission's prize as one centred line, "EARN [coin] 50 COINS" (+ any gems),
// in big display type (2026-10-18). Shared with the Home missions teaser.
/** The mission's terms with the action word (PLAY, PLACE, DEPOSIT, MAKE, CLAIM) in the platform gold (owner 2026-10-20). */
export function MissionTerms({ m }) {
  const terms = missionTerms(m);
  const verb = terms.startsWith('LOG IN ') ? 'LOG IN' : terms.split(' ')[0];
  return <><span style={{ color: CANDY.gold }}>{verb}</span> {terms.slice(verb.length + 1)}</>;
}

export function EarnPrize({ r, size = 30, fontSize = 26 }) {
  if (!r) return null;
  const rows = [['kwacha', 'coins'], ...GEMS.map(g => [g, g])].filter(([k]) => r[k]);
  if (!rows.length) return null;
  return (
    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: '4px 10px', fontFamily: CANDY.display, fontSize, lineHeight: 1, color: '#fff', textTransform: 'uppercase', textAlign: 'center' }}>
      <span>Earn</span>
      {rows.map(([k, unit]) => (
        <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: CANDY.gold }}>
          <RewardIcon kind={unit} size={size} />{amountText(r[k], unit)}
        </span>
      ))}
    </span>
  );
}

function MissionRow({ s, i = 0, loggedIn, onOpen, onClaim }) {
  const m = s.mission;
  const d = MISSION_DIFF[m.difficulty] || MISSION_DIFF.easy;
  const pct = s.claimed ? 100 : Math.min(100, Math.round((s.progress / m.target) * 100));
  const ready = loggedIn && s.claimable;
  return (
    <Card className="card-enter" style={{ animationDelay: `${i * 40}ms`, opacity: s.claimed ? 0.7 : 1, ...(ready ? { borderColor: CANDY.gold, boxShadow: `0 5px 0 ${CANDY.violet.dark}, 0 0 0 2px rgba(255,210,31,.35), 0 0 22px rgba(255,210,31,.35)` } : null) }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px' }}>
        <button onClick={() => onOpen && onOpen(m)} aria-label={`${missionTerms(m)} — details`} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 11, flex: 1, minWidth: 0 }}>
          <div style={{ width: 46, flex: 'none' }}>
            <Thumb src={IMAGES[m.image]} alt="" h={46} radius={10} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* no mission NAME (owner 2026-10-21): what to do, the prize, progress */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, minWidth: 0 }}>
              <Badge bg={d.c} color="#130f1f">{d.label}</Badge>
            </div>
            <div style={{ fontFamily: CANDY.display, fontSize: 18, lineHeight: 1.15, letterSpacing: '.01em', color: '#fff', margin: '2px 0 6px' }}><MissionTerms m={m} /></div>
            <div style={{ margin: '4px 0 2px' }}><EarnPrize r={m.reward} size={26} fontSize={22} /></div>
            {m.xp ? <div style={{ display: 'flex', justifyContent: 'center', marginTop: 4 }}><XpChip xp={m.xp} /></div> : null}
            <div style={{ marginTop: 7 }}>
              <Progress value={pct} color={s.claimed || s.reached ? C.green : undefined} height={12} />
            </div>
          </div>
        </button>
        <div style={{ flex: 'none', minWidth: 64, display: 'grid', placeItems: 'center' }}>
          {s.claimed ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 800, color: C.green, whiteSpace: 'nowrap' }}><Check size={14} /> Claimed</span>
          ) : ready ? (
            <GreenBtn onClick={(e) => onClaim && onClaim(m, e.currentTarget)}>Claim</GreenBtn>
          ) : (
            <span style={{ fontFamily: CANDY.display, fontSize: 15, color: 'rgba(255,255,255,.8)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', textAlign: 'center' }}>{s.progress.toLocaleString('en-US')} / {m.target.toLocaleString('en-US')}<br /><span style={{ fontFamily: CANDY.body, fontSize: 10.5, fontWeight: 700, color: C.muted }}>{progressUnit(m)}</span></span>
          )}
        </div>
      </div>
    </Card>
  );
}

// A collected mission as a thin bar: terms · prize · COLLECTED (2026-10-20;
// the mission name was dropped 2026-10-21).
function CollectedBar({ s }) {
  const m = s.mission;
  return (
    <div data-mission-collected={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 12px', borderRadius: 12, background: 'rgba(20,4,48,.55)', border: `1.5px solid ${CANDY.violet.fill}` }}>
      <span style={{ flex: 1, minWidth: 0, fontFamily: CANDY.display, fontSize: 13, lineHeight: 1.2, color: '#fff', textTransform: 'uppercase' }}><MissionTerms m={m} /></span>
      <span style={{ flex: 'none' }}><CurrencyAmounts r={m.reward} size={15} fontSize={12.5} gap={6} /></span>
      <span style={{ flex: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 900, color: C.green, textTransform: 'uppercase', letterSpacing: '.04em' }}><Check size={13} strokeWidth={3} /> Collected</span>
    </div>
  );
}

// Desktop-only right column: the hero's current scene (named after the
// player, "Vuma" when unnamed), XP to the next stage,
// and how to earn XP (the next-three-stages preview was removed 2026-10-18 so
// the story stays a surprise).
function VumaRoad({ xp = 0, levelRewards = null, seasonCfg = null, displayName = null, userId = null, onEditName }) {
  const hero = heroName(displayName, userId);
  const cur = getStage(xp);
  const next = getNextStage(xp);
  const rewards = levelRewards || LEVEL_REWARDS;
  const x = Math.max(0, Math.floor(Number(xp) || 0));
  return (
    <div className="ev-vuma">
      <SectionTitle right={<TitleNote>Level {cur.stage}</TitleNote>}>{hero}&apos;s road</SectionTitle>
      {!playerName({ displayName }) && onEditName && (
        <button type="button" onClick={onEditName} className="ev-name-invite"
          style={{ all: 'unset', boxSizing: 'border-box', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, width: '100%', minHeight: 44, margin: '-4px 0 12px', padding: '6px 6px 6px 12px', borderRadius: 14, background: C.track, border: `2px solid ${CANDY.violet.dark}` }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: C.text }}>Make this road yours: add your name</span>
          <span style={{ flex: 'none', padding: '8px 12px', borderRadius: 10, fontWeight: 900, fontSize: 13, color: '#fff', background: `linear-gradient(180deg, ${CANDY.green.light}, ${CANDY.green.fill})` }}>Add name ›</span>
        </button>
      )}
      <Card style={{ overflow: 'hidden' }}>
        <img src={cur.hero} alt={`${hero} at ${cur.name}`} style={{ width: '100%', display: 'block', aspectRatio: '10 / 9', objectFit: 'cover' }} />
        <div style={{ padding: '16px 18px 18px', display: 'grid', gap: 12, marginTop: -62, position: 'relative', background: `linear-gradient(180deg, transparent, ${C.panelLo} 62px)` }}>
          <div style={{ fontFamily: CANDY.display, textTransform: 'uppercase', fontSize: 24, color: C.text, textShadow: '0 2px 8px #000' }}>{cur.name}</div>
          {next ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, flexWrap: 'wrap' }}>
                <span style={{ background: 'rgba(0,0,0,.25)', padding: '2px 9px', borderRadius: 999, color: C.text, fontVariantNumeric: 'tabular-nums' }}>{x.toLocaleString()} / {next.xp.toLocaleString()} XP</span>
                <span style={{ color: C.muted, fontWeight: 600 }}>{(next.xp - x).toLocaleString()} XP to {nextStageLabel(cur, next)}</span>
              </div>
              <Progress value={stageProgress(x)} height={14} color={XP_BAR} />
            </>
          ) : (
            <div style={{ fontSize: 13, fontWeight: 900, color: CANDY.gold }}>Final level reached</div>
          )}
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 5 }}>
            {xpSourceLines(seasonCfg || undefined).map(l => (
              <li key={l.id} style={{ fontSize: 12, lineHeight: 1.35, color: C.muted }}>
                <b style={{ color: C.text, fontWeight: 800 }}>{l.title}</b> — {heroText(l.text, displayName, userId)}
              </li>
            ))}
          </ul>
        </div>
      </Card>
    </div>
  );
}

/**
 * The Missions tab (internal component name kept from the old Earn tab).
 * BWANABET MISSIONS (2026-10-20): one-time missions in four ladders (casino,
 * sports, deposits, loyalty; lib/missions/ladder.mjs) — the current mission of
 * each ladder as a card, collected ones as thin bars — then the season.
 * The daily reward lives on Home.
 */
export default function EarnView({ wallet = null, xp = 0, onNavigate, onOpenProfile, onOpenMission, onClaimMission, userId = null, displayName = null, onEditName, navBadges = {}, missions = null, missionStates = null, casinoStatus = 'anon', loggedIn = false, levelRewards = null, focusRewards = 0, isWidget = false, story = null, onStoryOpen, onStoryClose, onStoryGo, storyPrize = null, intro = null, season = null, onClaimLeague, onClaimWc, onClaimPrize, prizeBusy = false, extras = null }) {
  const states = missionStates || buildMissionStates(missions || MISSIONS, {}, []);
  const board = missionBoard(states);
  React.useEffect(() => {
    if (!focusRewards) return;
    const el = typeof document !== 'undefined' && document.getElementById('missions-rewards');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [focusRewards]);
  return (
    <RedesignShell wallet={wallet} xp={xp} userId={userId} displayName={displayName} onEditName={onEditName} navBadges={navBadges} activeTab="missions" onNavigate={onNavigate} onOpenProfile={onOpenProfile}
      isWidget={isWidget} story={story} onStoryOpen={onStoryOpen} onStoryClose={onStoryClose} onStoryGo={onStoryGo} storyPrize={storyPrize} intro={intro}>
      {/* Quests parked — see parked/components/redesign/EarnView.QuestCard.parked.jsx */}
      <style>{EV_CSS}</style>
      <div className="ev-cols">
        <section style={{ maxWidth: 720, minWidth: 0 }}>
          <SectionTitle right={<TitleNote>{board.done} / {board.total}</TitleNote>}>BwanaBet missions</SectionTitle>
          <MissionsSummary status={casinoStatus} done={board.done} total={board.total} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {board.current.map((s, i) => (
              <MissionRow key={s.mission.id} i={i} s={s} loggedIn={loggedIn} onOpen={onOpenMission} onClaim={onClaimMission} />
            ))}
          </div>
          {board.collected.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 14 }} aria-label="Collected missions">
              {board.collected.map((s) => <CollectedBar key={s.mission.id} s={s} />)}
            </div>
          )}
          {season && (
            <div id="missions-season" style={{ marginTop: 26, scrollMarginTop: 12 }}>
              <SeasonSection season={season} onClaimLeague={onClaimLeague} onClaimWc={onClaimWc} onClaimPrize={onClaimPrize} prizeBusy={prizeBusy} />
            </div>
          )}
          {extras && <>
            <Leaderboard board={extras.board} />
            <Album album={extras.album} />
          </>}
        </section>
        <VumaRoad xp={xp} levelRewards={levelRewards} seasonCfg={season?.cfg} displayName={displayName} userId={userId} onEditName={onEditName} />
      </div>
      {/* Weekly predictions span the full width (2026-10-22 redesign: tickets left, prize board right on desktop) */}
      {extras && <div id="missions-predictions" style={{ scrollMarginTop: 12 }}><Predictions predictions={extras.predictions} /></div>}
      <div id="missions-rewards" style={{ marginTop: 26, scrollMarginTop: 12, maxWidth: 720 }}>
        <RewardsSection xp={xp} levelRewards={levelRewards} seasonCfg={season?.cfg} displayName={displayName} userId={userId} />
      </div>
    </RedesignShell>
  );
}
