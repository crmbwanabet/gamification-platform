'use client';

import React from 'react';
import { C } from './tokens';
import RedesignShell, { GreenBtn, SectionTitle, Card, Thumb, Badge, Progress, RewardIcon } from './RedesignShell';
import { IMAGES } from '@/lib/data/images';
import { getDailyMissions, PERMANENT_MISSIONS } from '@/lib/data/missions';
import { XP_LEVELS, LEVEL_REWARDS, STREAK_REWARDS, getLevel } from '@/lib/data/platform';
import { Check, Lock } from 'lucide-react';

const DIFF = { easy: { label: 'Easy', c: C.green }, medium: { label: 'Medium', c: C.gold }, hard: { label: 'Hard', c: C.red } };

function RewardChips({ r }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12, fontSize: 13, fontWeight: 800 }}>
      {r.kwacha ? <span style={{ color: C.gold, display: 'inline-flex', alignItems: 'center', gap: 4 }}><RewardIcon kind="coins" size={15} />{r.kwacha}</span> : null}
      {r.gems ? <span style={{ color: C.teal, display: 'inline-flex', alignItems: 'center', gap: 4 }}><RewardIcon kind="gem" size={14} />{r.gems}</span> : null}
      {r.diamonds ? <span style={{ color: '#7db8ff', display: 'inline-flex', alignItems: 'center', gap: 4 }}><RewardIcon kind="diamond" size={14} />{r.diamonds}</span> : null}
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

function RewardsSection({ xp = 0, streak = 1, streakRewards = null, levelRewards = null }) {
  const curLevel = getLevel(xp).level;
  const lvlRewards = levelRewards || LEVEL_REWARDS;
  const strRewards = streakRewards || STREAK_REWARDS;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <section>
        <SectionTitle>Streak Bonuses</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {strRewards.map(s => (
            <MilestoneRow key={s.days} icon="🔥" title={`${s.days}-day streak`} sub={`Log in ${s.days} days in a row · you're on ${streak}`}
              reward={s} reached={streak >= s.days} current={false} />
          ))}
        </div>
      </section>
      <section>
        <SectionTitle>Level Milestones</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {XP_LEVELS.filter(l => lvlRewards[l.level]).map(l => (
            <MilestoneRow key={l.level} icon={l.icon} title={l.name} sub={`Reach level ${l.level} · ${l.xp.toLocaleString()} XP`}
              reward={lvlRewards[l.level]} reached={curLevel >= l.level} current={curLevel + 1 === l.level} />
          ))}
        </div>
      </section>
    </div>
  );
}

function MissionCard({ m, progress, done, onOpen, i = 0 }) {
  const pct = done ? 100 : Math.min(100, Math.round(((progress || 0) / m.target) * 100));
  const d = DIFF[m.difficulty] || DIFF.easy;
  return (
    <Card className="card-enter" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', cursor: 'pointer', animationDelay: `${i * 40}ms` }}>
      <button onClick={() => onOpen && onOpen(m)} style={{ all: 'unset', display: 'flex', flexDirection: 'column', cursor: 'pointer' }}>
        <div style={{ position: 'relative' }}>
          <Thumb src={IMAGES[m.image]} alt={m.name} h={78} radius={0} />
          <span style={{ position: 'absolute', top: 6, right: 6, zIndex: 2 }}><Badge bg={done ? C.green : d.c} color={done ? '#08210f' : '#08210f'}>{done ? 'Done' : d.label}</Badge></span>
        </div>
        <div style={{ padding: '10px 11px' }}>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: C.text, marginBottom: 6, lineHeight: 1.2 }}>{m.name}</div>
          <Progress value={pct} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: 12, fontWeight: 800 }}>
              <span style={{ color: C.gold, display: 'inline-flex', alignItems: 'center', gap: 4 }}><RewardIcon kind="coins" size={15} />{m.reward.kwacha}</span>
              {m.reward.gems && <span style={{ color: C.teal, display: 'inline-flex', alignItems: 'center', gap: 4 }}><RewardIcon kind="gem" size={14} />{m.reward.gems}</span>}
            </span>
            <span style={{ fontSize: 11, color: C.muted }}>{done ? m.target : (progress || 0)}/{m.target}</span>
          </div>
        </div>
      </button>
    </Card>
  );
}

/**
 * The Missions tab (internal component name kept from the old Earn tab).
 * Missions first; the streak bonuses and level milestones that used to sit
 * under the Earn › Rewards sub-tab follow below. The daily reward lives on Home.
 */
export default function EarnView({ points = '0', missionsCount = 0, badges = 0, xp = 0, streak = 1, onNavigate, onOpenProfile, missionProgress, missionsComplete, onOpenMission, userId = null, navBadges = {}, missions = null, streakRewards = null, levelRewards = null, focusRewards = 0 }) {
  const allMissions = missions || [...getDailyMissions(), ...PERMANENT_MISSIONS];
  React.useEffect(() => {
    if (!focusRewards) return;
    const el = typeof document !== 'undefined' && document.getElementById('missions-rewards');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [focusRewards]);
  return (
    <RedesignShell points={points} missionsCount={missionsCount} badges={badges} xp={xp} userId={userId} navBadges={navBadges} activeTab="missions" onNavigate={onNavigate} onOpenProfile={onOpenProfile}>
      {/* Quests parked — see parked/components/redesign/EarnView.QuestCard.parked.jsx */}
      <section>
        <SectionTitle>Missions</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))', gap: 12 }}>
          {allMissions.map((m, i) => (
            <MissionCard key={m.id} i={i} m={m} progress={missionProgress?.[m.id]} done={missionsComplete?.includes(m.id)} onOpen={onOpenMission} />
          ))}
        </div>
      </section>
      <div id="missions-rewards" style={{ marginTop: 26, scrollMarginTop: 12 }}>
        <RewardsSection xp={xp} streak={streak} streakRewards={streakRewards} levelRewards={levelRewards} />
      </div>
    </RedesignShell>
  );
}
