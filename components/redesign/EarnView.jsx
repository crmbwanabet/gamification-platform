'use client';

import React from 'react';
import { C } from './tokens';
import RedesignShell, { GreenBtn, SectionTitle, Card, Thumb, Badge, Progress, RewardIcon } from './RedesignShell';
import { IMAGES } from '@/lib/data/images';
import { amountText } from '@/lib/rewardText.mjs';
import { CASINO_MISSIONS } from '@/lib/data/missions';
import { casinoMissionStates } from '@/lib/missions/casino.mjs';
import { XP_LEVELS, LEVEL_REWARDS, getLevel } from '@/lib/data/platform';
import { Check, Lock, LogIn, RefreshCw } from 'lucide-react';

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
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12, fontSize: 13, fontWeight: 800 }}>
      {r.kwacha ? <span style={{ color: C.gold, display: 'inline-flex', alignItems: 'center', gap: 4 }}><RewardIcon kind="coins" size={15} />{amountText(r.kwacha, 'coins')}</span> : null}
      {r.gems ? <span style={{ color: C.teal, display: 'inline-flex', alignItems: 'center', gap: 4 }}><RewardIcon kind="gem" size={14} />{amountText(r.gems, 'gems')}</span> : null}
      {r.diamonds ? <span style={{ color: '#7db8ff', display: 'inline-flex', alignItems: 'center', gap: 4 }}><RewardIcon kind="diamond" size={14} />{amountText(r.diamonds, 'diamonds')}</span> : null}
    </span>
  );
}

function MilestoneRow({ icon, title, sub, reward, reached, current }) {
  return (
    <Card style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12, border: current ? `1.5px solid ${C.green}` : '1px solid rgba(255,255,255,0.07)' }}>
      <div style={{ width: 38, height: 38, flex: 'none', borderRadius: 10, background: C.track, display: 'grid', placeItems: 'center', fontSize: 20 }}>{icon}</div>
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

// Level milestones (the streak bonuses that used to sit above them were
// removed 2026-10-07 — parked/components/GamificationPlatform.removed-wiring.jsx).
function RewardsSection({ xp = 0, levelRewards = null }) {
  const curLevel = getLevel(xp).level;
  const lvlRewards = levelRewards || LEVEL_REWARDS;
  return (
    <section>
      <SectionTitle>Level Milestones</SectionTitle>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {XP_LEVELS.filter(l => lvlRewards[l.level]).map(l => (
          <MilestoneRow key={l.level} icon={l.icon} title={l.name} sub={`Reach level ${l.level} · ${l.xp.toLocaleString()} XP`}
            reward={lvlRewards[l.level]} reached={curLevel >= l.level} current={curLevel + 1 === l.level} />
        ))}
      </div>
    </section>
  );
}

// Today's single counter that drives all four missions.
function RoundsSummary({ status, rounds }) {
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
    </Card>
  );
}

function MissionRow({ s, i = 0, loggedIn, onOpen, onClaim }) {
  const m = s.mission;
  const d = MISSION_DIFF[m.difficulty] || MISSION_DIFF.easy;
  const pct = s.claimed ? 100 : Math.min(100, Math.round((s.progress / m.target) * 100));
  const ready = loggedIn && s.claimable;
  return (
    <Card className="card-enter" style={{ animationDelay: `${i * 40}ms`, border: ready ? `1.5px solid ${C.green}` : '1px solid rgba(255,255,255,0.07)', boxShadow: ready ? '0 0 0 3px rgba(79,169,139,.16), 0 5px 16px rgba(0,0,0,0.3)' : undefined }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '11px 12px' }}>
        <button onClick={() => onOpen && onOpen(m)} aria-label={`${m.name} details`} style={{ all: 'unset', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 11, flex: 1, minWidth: 0 }}>
          <div style={{ width: 52, flex: 'none', position: 'relative' }}>
            <Thumb src={IMAGES[m.image]} alt="" h={52} radius={10} />
            {s.claimed && (
              <div style={{ position: 'absolute', inset: 0, borderRadius: 10, background: 'rgba(10,12,18,.5)', display: 'grid', placeItems: 'center' }}>
                <Check size={24} color={C.green} strokeWidth={3} />
              </div>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: C.text, marginBottom: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 800, color: C.gold }}>
                <RewardIcon kind="coins" size={14} />{amountText(m.reward.kwacha, 'coins')}
              </span>
              <Badge bg={d.c} color="#130f1f">{d.label}</Badge>
            </div>
            <Progress value={pct} color={s.claimed ? C.green : s.reached ? C.green : C.teal} height={6} />
            <div style={{ marginTop: 4, fontSize: 11, color: C.muted, fontVariantNumeric: 'tabular-nums' }}>
              {s.claimed ? 'Claimed today' : `${s.progress} / ${m.target} rounds`}
            </div>
          </div>
        </button>
        <div style={{ flex: 'none', width: 70, display: 'grid', placeItems: 'center' }}>
          {s.claimed ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11.5, fontWeight: 800, color: C.green }}><Check size={14} /> Done</span>
          ) : ready ? (
            <GreenBtn onClick={(e) => onClaim && onClaim(m, e.currentTarget)}>Claim</GreenBtn>
          ) : (
            <Lock size={16} color={C.muted} />
          )}
        </div>
      </div>
    </Card>
  );
}

/**
 * The Missions tab (internal component name kept from the old Earn tab).
 * Four DAILY casino missions driven by ONE counter — casino rounds played on
 * bwanabet.com today (CRM feed, Lusaka day) — then the level milestones.
 * The daily reward lives on Home.
 */
export default function EarnView({ points = '0', missionsCount = 0, badges = 0, xp = 0, onNavigate, onOpenProfile, onOpenMission, onClaimMission, userId = null, navBadges = {}, missions = null, missionStates = null, casinoStatus = 'anon', loggedIn = false, levelRewards = null, focusRewards = 0 }) {
  const states = missionStates || casinoMissionStates(missions || CASINO_MISSIONS, { rounds: 0, today: null });
  const rounds = states[0]?.rounds || 0;
  React.useEffect(() => {
    if (!focusRewards) return;
    const el = typeof document !== 'undefined' && document.getElementById('missions-rewards');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [focusRewards]);
  return (
    <RedesignShell points={points} missionsCount={missionsCount} badges={badges} xp={xp} userId={userId} navBadges={navBadges} activeTab="missions" onNavigate={onNavigate} onOpenProfile={onOpenProfile}>
      {/* Quests parked — see parked/components/redesign/EarnView.QuestCard.parked.jsx */}
      <section style={{ maxWidth: 720 }}>
        <SectionTitle right={<span style={{ fontSize: 11.5, fontWeight: 700, color: C.muted }}>Resets at midnight</span>}>Daily Missions</SectionTitle>
        <RoundsSummary status={casinoStatus} rounds={rounds} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {states.map((s, i) => (
            <MissionRow key={s.mission.id} i={i} s={s} loggedIn={loggedIn} onOpen={onOpenMission} onClaim={onClaimMission} />
          ))}
        </div>
      </section>
      <div id="missions-rewards" style={{ marginTop: 26, scrollMarginTop: 12, maxWidth: 720 }}>
        <RewardsSection xp={xp} levelRewards={levelRewards} />
      </div>
    </RedesignShell>
  );
}
