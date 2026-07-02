'use client';

import React from 'react';
import { Coins, Gem } from 'lucide-react';
import { C } from './tokens';
import RedesignShell, { GreenBtn, SectionTitle, Card, Thumb, Badge, Progress } from './RedesignShell';
import { IMAGES } from '@/lib/data/images';
import { getDailyMissions, PERMANENT_MISSIONS } from '@/lib/data/missions';
import { QUESTS, XP_LEVELS, LEVEL_REWARDS, STREAK_REWARDS, getLevel } from '@/lib/data/platform';
import { Diamond, Check, Lock } from 'lucide-react';
import DailyReward from './DailyReward';

const ALL_MISSIONS = [...getDailyMissions(), ...PERMANENT_MISSIONS];
const DIFF = { easy: { label: 'Easy', c: C.green }, medium: { label: 'Medium', c: C.gold }, hard: { label: 'Hard', c: C.red } };

const SUBS = [
  { key: 'earn.missions', label: 'Missions' },
  { key: 'earn.quests', label: 'Quests' },
  { key: 'earn.rewards', label: 'Rewards' },
];

function RewardChips({ r }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 12, fontSize: 13, fontWeight: 800 }}>
      {r.kwacha ? <span style={{ color: C.gold, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Coins size={14} />{r.kwacha}</span> : null}
      {r.gems ? <span style={{ color: C.teal, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Gem size={13} />{r.gems}</span> : null}
      {r.diamonds ? <span style={{ color: '#7db8ff', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Diamond size={13} />{r.diamonds}</span> : null}
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

function RewardsSection({ xp = 0, streak = 1, dailyDay, dailyClaimed, onClaimDaily }) {
  const curLevel = getLevel(xp).level;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <section>
        <SectionTitle>Daily Reward</SectionTitle>
        <DailyReward dailyDay={dailyDay} dailyClaimed={dailyClaimed} onClaim={onClaimDaily} />
      </section>
      <section>
        <SectionTitle>Level Milestones</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {XP_LEVELS.filter(l => LEVEL_REWARDS[l.level]).map(l => (
            <MilestoneRow key={l.level} icon={l.icon} title={l.name} sub={`Reach level ${l.level} · ${l.xp.toLocaleString()} XP`}
              reward={LEVEL_REWARDS[l.level]} reached={curLevel >= l.level} current={curLevel + 1 === l.level} />
          ))}
        </div>
      </section>
      <section>
        <SectionTitle>Streak Bonuses</SectionTitle>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {STREAK_REWARDS.map(s => (
            <MilestoneRow key={s.days} icon="🔥" title={`${s.days}-day streak`} sub={`Log in ${s.days} days in a row · you're on ${streak}`}
              reward={s} reached={streak >= s.days} current={false} />
          ))}
        </div>
      </section>
    </div>
  );
}

function SubNav({ tab, onNavigate }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
      {SUBS.map((s) => {
        const active = tab === s.key;
        return (
          <button key={s.key} onClick={() => onNavigate && onNavigate(s.key)} style={{ padding: '8px 18px', borderRadius: 9, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 800, background: active ? C.green : C.panel2, color: active ? '#08210f' : C.sub }}>{s.label}</button>
        );
      })}
    </div>
  );
}

function MissionCard({ m, progress, done, onOpen }) {
  const pct = done ? 100 : Math.min(100, Math.round(((progress || 0) / m.target) * 100));
  const d = DIFF[m.difficulty] || DIFF.easy;
  return (
    <Card style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', cursor: 'pointer' }}>
      <button onClick={() => onOpen && onOpen(m)} style={{ all: 'unset', display: 'flex', flexDirection: 'column', cursor: 'pointer' }}>
        <div style={{ position: 'relative' }}>
          <Thumb src={IMAGES[m.image]} alt={m.name} h={110} radius={0} />
          <span style={{ position: 'absolute', top: 8, right: 8, zIndex: 2 }}><Badge bg={done ? C.green : d.c} color={done ? '#08210f' : '#08210f'}>{done ? 'Done' : d.label}</Badge></span>
        </div>
        <div style={{ padding: 12 }}>
          <div style={{ fontSize: 13.5, fontWeight: 800, color: C.text, marginBottom: 2 }}>{m.name}</div>
          <div style={{ fontSize: 11.5, color: C.sub, marginBottom: 10, minHeight: 32 }}>{m.desc}</div>
          <Progress value={pct} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 9 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: 12, fontWeight: 800 }}>
              <span style={{ color: C.gold, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Coins size={14} />{m.reward.kwacha}</span>
              {m.reward.gems && <span style={{ color: C.teal, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Gem size={13} />{m.reward.gems}</span>}
            </span>
            <span style={{ fontSize: 11, color: C.muted }}>{done ? m.target : (progress || 0)}/{m.target}</span>
          </div>
        </div>
      </button>
    </Card>
  );
}

function QuestCard({ q, questProgress, questsComplete, onOpen }) {
  const done = questsComplete?.includes(q.id);
  const prog = questProgress?.[q.id] || {};
  const stepsDone = q.steps.filter(s => (prog[s.id] || 0) >= s.target).length;
  const pct = done ? 100 : Math.round((stepsDone / q.steps.length) * 100);
  const d = DIFF[q.difficulty] || DIFF.easy;
  return (
    <Card style={{ padding: 14, display: 'flex', gap: 14, alignItems: 'center', cursor: 'pointer' }}>
      <button onClick={() => onOpen && onOpen(q)} style={{ all: 'unset', display: 'flex', gap: 14, alignItems: 'center', cursor: 'pointer', width: '100%' }}>
        <div style={{ width: 110, flex: 'none' }}><Thumb src={IMAGES[q.image]} alt={q.name} h={84} /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{q.name}</span>
            <Badge bg={done ? C.green : d.c}>{done ? 'Done' : d.label}</Badge>
          </div>
          <div style={{ fontSize: 12, color: C.sub, marginBottom: 10 }}>{q.desc}</div>
          <Progress value={pct} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: 12, fontWeight: 800 }}>
              <span style={{ color: C.gold, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Coins size={14} />{q.reward.kwacha}</span>
              {q.reward.gems && <span style={{ color: C.teal, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Gem size={13} />{q.reward.gems}</span>}
            </span>
            <span style={{ fontSize: 11, color: C.muted }}>{stepsDone}/{q.steps.length} steps</span>
          </div>
        </div>
      </button>
    </Card>
  );
}

export default function EarnView({ tab = 'earn.missions', points = '0', missionsCount = 0, badges = 0, xp = 0, streak = 1, onNavigate, missionProgress, missionsComplete, onOpenMission, questProgress, questsComplete, onOpenQuest, dailyDay = 1, dailyClaimed = false, onClaimDaily }) {
  return (
    <RedesignShell points={points} missionsCount={missionsCount} badges={badges} xp={xp} activeTab="earn" onNavigate={onNavigate}>
      <SubNav tab={tab} onNavigate={onNavigate} />
      {tab === 'earn.rewards' && (
        <RewardsSection xp={xp} streak={streak} dailyDay={dailyDay} dailyClaimed={dailyClaimed} onClaimDaily={onClaimDaily} />
      )}
      {tab === 'earn.quests' && (
        <section>
          <SectionTitle>Quests</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {QUESTS.map(q => <QuestCard key={q.id} q={q} questProgress={questProgress} questsComplete={questsComplete} onOpen={onOpenQuest} />)}
          </div>
        </section>
      )}
      {tab !== 'earn.quests' && tab !== 'earn.rewards' && (
        <section>
          <SectionTitle>Missions</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 16 }}>
            {ALL_MISSIONS.map(m => (
              <MissionCard key={m.id} m={m} progress={missionProgress?.[m.id]} done={missionsComplete?.includes(m.id)} onOpen={onOpenMission} />
            ))}
          </div>
        </section>
      )}
    </RedesignShell>
  );
}
