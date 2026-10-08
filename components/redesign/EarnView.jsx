'use client';

import React from 'react';
import { C } from './tokens';
import RedesignShell, { GreenBtn, SectionTitle, Card, Thumb, Badge, Progress, RewardIcon, CurrencyAmounts } from './RedesignShell';
import { IMAGES } from '@/lib/data/images';
import { amountText } from '@/lib/rewardText.mjs';
import { CASINO_MISSIONS } from '@/lib/data/missions';
import { casinoMissionStates } from '@/lib/missions/casino.mjs';
import { xpSourceLines } from '@/lib/xp/sources.mjs';
import { XP_LEVELS, LEVEL_REWARDS, getLevel } from '@/lib/data/platform';
import { Check, Lock, LogIn, RefreshCw } from 'lucide-react';
import { getStage, getNextStage, stageProgress, STAGE_COUNT } from '@/lib/vuma/stages.mjs';

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
function useResetText() {
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
    .ev-cols { display: grid; grid-template-columns: 1.25fr 1fr; gap: 18px; align-items: start; }
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

function MilestoneRow({ icon, title, sub, reward, reached, current }) {
  return (
    <Card style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, border: current ? `1.5px solid ${C.green}` : '1px solid rgba(255,255,255,0.07)' }}>
      <div style={{ width: 38, height: 38, flex: 'none', borderRadius: 10, overflow: 'hidden', background: C.track, display: 'grid', placeItems: 'center', fontSize: 20 }}>{icon}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 800, color: C.text }}>{title}</div>
        {sub && <div style={{ fontSize: 11, color: C.muted }}>{sub}</div>}
      </div>
      <RewardChips r={reward} />
      <div style={{ width: 26, flex: 'none', display: 'grid', placeItems: 'center' }}>
        {reached ? <Check size={18} color={C.green} /> : <Lock size={15} color={C.muted} />}
      </div>
    </Card>
  );
}

export const XP_COLOR = '#b9a5e8';

function XpChip({ xp, fontSize = 12 }) {
  return <span style={{ fontSize, fontWeight: 800, color: XP_COLOR, whiteSpace: 'nowrap' }}>⚡ {amountText(xp, 'xp')}</span>;
}

// "How to earn XP" — the lines come from lib/xp/sources.mjs, so retuning a
// number there updates this list too.
function XpSources() {
  return (
    <Card style={{ padding: '11px 14px', marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 7 }}>How to earn XP</div>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 5 }}>
        {xpSourceLines().map(l => (
          <li key={l.id} style={{ display: 'flex', alignItems: 'baseline', gap: 6, fontSize: 12, lineHeight: 1.35 }}>
            <span style={{ color: XP_COLOR, flex: 'none' }}>⚡</span>
            <span><b style={{ color: C.text, fontWeight: 800 }}>{l.title}</b><span style={{ color: C.sub }}> — {l.text}</span></span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

// Stage milestones: Vuma Katongo's story stages (levels = stages since
// 2026-10-08). The streak bonuses that used to sit above them were removed
// 2026-10-07 — parked/components/GamificationPlatform.removed-wiring.jsx.
function RewardsSection({ xp = 0, levelRewards = null }) {
  const curLevel = getLevel(xp).level;
  const lvlRewards = levelRewards || LEVEL_REWARDS;
  return (
    <section>
      <SectionTitle>Stage Milestones</SectionTitle>
      <div className="ev-xp-sources"><XpSources /></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {XP_LEVELS.filter(l => lvlRewards[l.level]).map(l => (
          <MilestoneRow key={l.level}
            icon={<img src={l.avatar} alt="" width={38} height={38} loading="lazy" style={{ width: 38, height: 38, objectFit: 'cover', display: 'block', filter: curLevel >= l.level ? 'none' : 'grayscale(.6) brightness(.8)' }} />}
            title={l.name} sub={`Stage ${l.level} · ${l.club ? l.place + ' · ' : ''}${l.xp.toLocaleString()} XP`}
            reward={lvlRewards[l.level]} reached={curLevel >= l.level} current={curLevel + 1 === l.level} />
        ))}
      </div>
    </section>
  );
}

// Today's single counter that drives all four missions.
function RoundsSummary({ status, rounds, nextIn = null }) {
  const note = trackingNote(status);
  const showCount = status !== 'anon';
  return (
    <Card style={{ padding: '12px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
      <div style={{ width: 44, height: 44, flex: 'none', borderRadius: 12, background: C.track, display: 'grid', placeItems: 'center' }}>
        {status === 'anon' ? <LogIn size={20} color={C.gold} /> : <span style={{ fontSize: 22 }}>🎰</span>}
      </div>
      <div style={{ flex: 1, minWidth: 0, lineHeight: 1.3 }}>
        {showCount && (
          <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>
            <span style={{ fontVariantNumeric: 'tabular-nums', color: C.teal }}>{rounds}</span> casino {rounds === 1 ? 'round' : 'rounds'} today
          </div>
        )}
        {note ? (
          <div style={{ fontSize: status === 'anon' ? 13.5 : 11.5, fontWeight: status === 'anon' ? 800 : 500, color: status === 'anon' ? C.text : C.sub, display: 'flex', alignItems: 'center', gap: 5 }}>
            {status !== 'anon' && <RefreshCw size={11} color={C.muted} style={{ flex: 'none' }} />}
            <span>{note.text}</span>
          </div>
        ) : (
          <div style={{ fontSize: 11.5, color: C.muted }}>Progress updates every few minutes</div>
        )}
      </div>
      {showCount && nextIn != null && (
        <div style={{ flex: 'none', fontSize: 11.5, fontWeight: 600, color: C.muted, textAlign: 'right' }}>
          Next prize in <b style={{ color: C.text, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{nextIn}</b>
        </div>
      )}
    </Card>
  );
}

function MissionRow({ s, i = 0, loggedIn, onOpen, onClaim }) {
  const m = s.mission;
  const d = MISSION_DIFF[m.difficulty] || MISSION_DIFF.easy;
  const pct = s.claimed ? 100 : Math.min(100, Math.round((s.progress / m.target) * 100));
  const ready = loggedIn && s.claimable;
  return (
    <Card className="card-enter" style={{ animationDelay: `${i * 40}ms`, opacity: s.claimed ? 0.65 : 1, border: ready ? `1.5px solid ${C.gold}` : '1px solid rgba(255,255,255,0.07)', boxShadow: ready ? '0 0 0 3px rgba(230,173,74,.18), 0 0 18px rgba(230,173,74,.25), 0 5px 16px rgba(0,0,0,0.3)' : undefined }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 12px' }}>
        <button onClick={() => onOpen && onOpen(m)} aria-label={`${m.name} details`} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 11, flex: 1, minWidth: 0 }}>
          <div style={{ width: 46, flex: 'none' }}>
            <Thumb src={IMAGES[m.image]} alt="" h={46} radius={10} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, minWidth: 0 }}>
              <span style={{ fontSize: 14, fontWeight: 800, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</span>
              <Badge bg={d.c} color="#130f1f">{d.label}</Badge>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', columnGap: 10, rowGap: 4 }}>
              <CurrencyAmounts r={m.reward} size={14} fontSize={12} gap={8} />
              {m.xp ? <XpChip xp={m.xp} /> : null}
            </div>
            <div style={{ marginTop: 7 }}>
              <Progress value={pct} color={s.claimed || s.reached ? C.green : C.teal} height={6} />
            </div>
          </div>
        </button>
        <div style={{ flex: 'none', minWidth: 64, display: 'grid', placeItems: 'center' }}>
          {s.claimed ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 800, color: C.green, whiteSpace: 'nowrap' }}><Check size={14} /> Claimed</span>
          ) : ready ? (
            <GreenBtn onClick={(e) => onClaim && onClaim(m, e.currentTarget)}>Claim</GreenBtn>
          ) : (
            <span style={{ fontSize: 12, fontWeight: 700, color: C.muted, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{s.progress} / {m.target}</span>
          )}
        </div>
      </div>
    </Card>
  );
}

// Desktop-only right column: Vuma's current scene, XP to the next stage,
// the next three stage rewards and how to earn XP.
function VumaRoad({ xp = 0, levelRewards = null }) {
  const cur = getStage(xp);
  const next = getNextStage(xp);
  const rewards = levelRewards || LEVEL_REWARDS;
  const upcoming = XP_LEVELS.filter(l => l.level > cur.stage).slice(0, 3);
  const x = Math.max(0, Math.floor(Number(xp) || 0));
  return (
    <div className="ev-vuma">
      <SectionTitle right={<span style={{ fontSize: 11.5, fontWeight: 700, color: C.muted }}>Stage {cur.stage} of {STAGE_COUNT}</span>}>Vuma's road</SectionTitle>
      <Card style={{ overflow: 'hidden' }}>
        <img src={cur.hero} alt={`Vuma at ${cur.name}`} style={{ width: '100%', display: 'block', aspectRatio: '10 / 9', objectFit: 'cover' }} />
        <div style={{ padding: '16px 18px 18px', display: 'grid', gap: 12, marginTop: -62, position: 'relative', background: `linear-gradient(180deg, transparent, ${C.panelLo} 62px)` }}>
          <div style={{ fontFamily: "var(--font-display, 'Bricolage Grotesque', system-ui, sans-serif)", fontWeight: 800, fontSize: 22, color: C.text, textShadow: '0 2px 8px #000' }}>{cur.name}</div>
          {next ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, flexWrap: 'wrap' }}>
                <span style={{ background: 'rgba(0,0,0,.25)', padding: '2px 9px', borderRadius: 999, color: C.text, fontVariantNumeric: 'tabular-nums' }}>{x.toLocaleString()} / {next.xp.toLocaleString()} XP</span>
                <span style={{ color: C.muted, fontWeight: 600 }}>{(next.xp - x).toLocaleString()} XP to {next.name}</span>
              </div>
              <Progress value={stageProgress(x)} color={C.green} height={7} />
            </>
          ) : (
            <div style={{ fontSize: 13, fontWeight: 800, color: C.green }}>Final stage reached</div>
          )}
          {upcoming.length > 0 && (
            <div style={{ display: 'grid', gap: 8 }}>
              {upcoming.map(l => (
                <div key={l.level} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(0,0,0,.22)', borderRadius: 10, padding: '7px 10px', fontSize: 12.5, fontWeight: 700, color: C.text }}>
                  <img src={l.avatar} alt="" width={30} height={30} loading="lazy" style={{ width: 30, height: 30, borderRadius: 8, objectFit: 'cover', filter: 'grayscale(.6)' }} />
                  <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.name}</span>
                  {rewards[l.level] && <CurrencyAmounts r={rewards[l.level]} size={14} fontSize={12} gap={8} />}
                </div>
              ))}
            </div>
          )}
          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 5 }}>
            {xpSourceLines().map(l => (
              <li key={l.id} style={{ fontSize: 12, lineHeight: 1.35, color: C.muted }}>
                <b style={{ color: C.text, fontWeight: 800 }}>{l.title}</b> — {l.text}
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
 * Four DAILY casino missions driven by ONE counter — casino rounds played on
 * bwanabet.com today (CRM feed, Lusaka day) — then the stage milestones.
 * The daily reward lives on Home.
 */
export default function EarnView({ wallet = null, points = '0', missionsCount = 0, badges = 0, xp = 0, onNavigate, onOpenProfile, onOpenMission, onClaimMission, userId = null, navBadges = {}, missions = null, missionStates = null, casinoStatus = 'anon', loggedIn = false, levelRewards = null, focusRewards = 0 }) {
  const states = missionStates || casinoMissionStates(missions || CASINO_MISSIONS, { rounds: 0, today: null });
  const rounds = states[0]?.rounds || 0;
  const resetLabel = useResetText();
  const gaps = states.filter(s => !s.claimed && !s.reached).map(s => s.mission.target - rounds).filter(n => n > 0);
  const nextIn = gaps.length ? Math.min(...gaps) : null;
  React.useEffect(() => {
    if (!focusRewards) return;
    const el = typeof document !== 'undefined' && document.getElementById('missions-rewards');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [focusRewards]);
  return (
    <RedesignShell wallet={wallet} points={points} missionsCount={missionsCount} badges={badges} xp={xp} userId={userId} navBadges={navBadges} activeTab="missions" onNavigate={onNavigate} onOpenProfile={onOpenProfile}>
      {/* Quests parked — see parked/components/redesign/EarnView.QuestCard.parked.jsx */}
      <style>{EV_CSS}</style>
      <div className="ev-cols">
        <section style={{ maxWidth: 720, minWidth: 0 }}>
          <SectionTitle right={<span style={{ fontSize: 11.5, fontWeight: 700, color: C.muted }}>{resetLabel}</span>}>Daily Missions</SectionTitle>
          <RoundsSummary status={casinoStatus} rounds={rounds} nextIn={nextIn} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {states.map((s, i) => (
              <MissionRow key={s.mission.id} i={i} s={s} loggedIn={loggedIn} onOpen={onOpenMission} onClaim={onClaimMission} />
            ))}
          </div>
        </section>
        <VumaRoad xp={xp} levelRewards={levelRewards} />
      </div>
      <div id="missions-rewards" style={{ marginTop: 26, scrollMarginTop: 12, maxWidth: 720 }}>
        <RewardsSection xp={xp} levelRewards={levelRewards} />
      </div>
    </RedesignShell>
  );
}
