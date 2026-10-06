'use client';

import React from 'react';
import { C } from './tokens';
import RedesignShell, { Badge, Progress, GreenBtn, SectionTitle, Card, Thumb, RewardIcon } from './RedesignShell';
import DailyReward from './DailyReward';
import GamesGrid from './GamesGrid';
import { IMAGES } from '@/lib/data/images';
import { amountText } from '@/lib/rewardText.mjs';
import { getDailyMissions, PERMANENT_MISSIONS } from '@/lib/data/missions';
import { STORE_ITEMS, MINIGAMES } from '@/lib/data/platform';

// Pick 3 missions that best reflect the player's current progress:
// in-progress first, then not-started, then completed.
function pickLatestMissions(allMissions, missionProgress, missionsComplete) {
  const rank = (x) => (x.done ? 2 : x.progress > 0 ? 0 : 1);
  return allMissions
    .map((m) => ({ m, progress: (missionProgress && missionProgress[m.id]) || 0, done: !!(missionsComplete && missionsComplete.includes(m.id)) }))
    .sort((a, b) => rank(a) - rank(b))
    .slice(0, 3);
}

function MissionCard({ m, progress = 0, done = false, onOpen, i = 0 }) {
  const pct = done ? 100 : Math.min(100, Math.round((progress / m.target) * 100));
  const state = done ? 'done' : progress > 0 ? 'progress' : 'new';
  return (
    <Card className="card-enter" style={{ position: 'relative', overflow: 'hidden', border: state === 'progress' ? `1.5px solid ${C.teal}` : '1px solid rgba(255,255,255,0.07)', animationDelay: `${i * 60}ms` }}>
      <button onClick={() => onOpen && onOpen(m)} style={{ all: 'unset', display: 'block', width: '100%', boxSizing: 'border-box', padding: 12, cursor: onOpen ? 'pointer' : 'default' }}>
        {state === 'new' && <div style={{ position: 'absolute', top: 12, left: -30, transform: 'rotate(-45deg)', background: C.green, color: '#08210f', fontSize: 10, fontWeight: 900, padding: '3px 34px', letterSpacing: '.05em', zIndex: 2 }}>NEW!</div>}
        <div style={{ fontSize: 13.5, fontWeight: 800, color: C.text, marginBottom: 10, minHeight: 34 }}>{m.name}</div>
        <Thumb src={IMAGES[m.image]} alt={m.name} h={78} />
        <div style={{ marginTop: 10 }}>
          {state === 'done' && <Badge bg={C.green}>Mission is completed</Badge>}
          {state === 'progress' && <Badge bg={C.teal} color="#06231f">In progress</Badge>}
          {state === 'new' && <div style={{ fontSize: 11, color: C.sub }}><span style={{ color: C.muted }}>Reward:</span> <b style={{ color: C.text }}>{amountText(m.reward.kwacha, 'coins')}</b></div>}
          <div style={{ marginTop: 8 }}>
            <Progress value={pct} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10.5, color: C.muted }}>
              <span>{done ? m.target : progress}/{m.target}</span>
              <span>{pct}%</span>
            </div>
          </div>
        </div>
      </button>
    </Card>
  );
}

/**
 * Home: daily reward first, then every game (the old Play tab), then a short
 * missions teaser and the featured store item. `focusGames` is a nonce — when
 * it changes the view scrolls to the games (legacy "Go to Games" CTAs).
 */
export default function Overview({ points = '2,344', missionsCount = 0, badges = 12, xp = 1200, activeTab = 'home', onNavigate, onOpenProfile, missionProgress, missionsComplete, onOpenMission, dailyDay = 1, dailyClaimed = false, onClaimDaily, userId = null, navBadges = {}, games = null, storeItems = null, missions = null, dailyRewards = null, gamePlays = null, onPlay, focusGames = 0 } = {}) {
  const go = (t) => onNavigate && onNavigate(t);
  const allMissions = missions || [...getDailyMissions(), ...PERMANENT_MISSIONS];
  const latest = pickLatestMissions(allMissions, missionProgress, missionsComplete);
  // Store may be empty until the admin dashboard populates it
  const items = storeItems || STORE_ITEMS;
  const gameList = games || MINIGAMES;
  const featuredItem = items.find(i => i.featured) || items[0] || null;
  React.useEffect(() => {
    if (!focusGames) return;
    const el = typeof document !== 'undefined' && document.getElementById('home-games');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [focusGames]);
  return (
    <RedesignShell points={points} missionsCount={missionsCount} badges={badges} xp={xp} userId={userId} navBadges={navBadges} activeTab={activeTab} onNavigate={onNavigate} onOpenProfile={onOpenProfile}>
      <div style={{ maxWidth: 1240, margin: '0 auto', width: '100%' }}>
        <div style={{ marginBottom: 22 }}>
          <DailyReward dailyDay={dailyDay} dailyClaimed={dailyClaimed} onClaim={onClaimDaily} rewards={dailyRewards} />
        </div>

        <div style={{ marginBottom: 26 }}>
          <GamesGrid gamePlays={gamePlays} onPlay={onPlay} games={gameList} />
        </div>

        <div className="rs-ov-grid" style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: 26, alignContent: 'start' }}>
          <section>
            <SectionTitle right={<button onClick={() => go('missions')} style={{ all: 'unset', cursor: 'pointer', fontSize: 12, fontWeight: 700, color: C.sub }}>View all ›</button>}>Latest Missions</SectionTitle>
            <div className="rs-ov-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
              {latest.map(({ m, progress, done }, i) => <MissionCard key={m.id} i={i} m={m} progress={progress} done={done} onOpen={onOpenMission} />)}
            </div>
          </section>

          {featuredItem && (
            <section>
              <SectionTitle>Featured Reward</SectionTitle>
              <Card style={{ padding: 14, display: 'flex', gap: 14, alignItems: 'center' }}>
                <div style={{ width: 120, flex: 'none' }}><Thumb src={featuredItem.imageUrl || IMAGES[featuredItem.image]} alt={featuredItem.name} h={96} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 4 }}>{featuredItem.name}</div>
                  {featuredItem.desc && <div style={{ fontSize: 12, color: C.sub, marginBottom: 10 }}>{featuredItem.desc}</div>}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, marginTop: featuredItem.desc ? 0 : 10 }}>
                    <GreenBtn onClick={() => go('store')}>Buy Now</GreenBtn>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 14, fontWeight: 800, color: C.gold }}><RewardIcon kind="coins" size={17} /> {featuredItem.price.kwacha}</span>
                  </div>
                </div>
              </Card>
            </section>
          )}
        </div>
      </div>
    </RedesignShell>
  );
}
