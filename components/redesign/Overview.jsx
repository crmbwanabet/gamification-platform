'use client';

import React from 'react';
import { C, CANDY } from './tokens';
import RedesignShell, { Badge, Progress, GreenBtn, SectionTitle, TitleNote, Card, Thumb, CurrencyAmounts, RewardIcon } from './RedesignShell';
import DailyReward from './DailyReward';
import GamesGrid from './GamesGrid';
import { MatchCard, HustleCard } from './SeasonCards';
import { useResetText } from './EarnView';
import { IMAGES } from '@/lib/data/images';
import { amountText } from '@/lib/rewardText.mjs';
import { CASINO_MISSIONS } from '@/lib/data/missions';
import { casinoMissionStates } from '@/lib/missions/casino.mjs';
import { STORE_ITEMS, MINIGAMES } from '@/lib/data/platform';
import { GEMS } from '@/lib/economy/currency.mjs';

// Home layout (design "A · Full candy"): phones stack daily reward → bonus
// games → missions → featured; desktop (≥861px) puts the daily reward,
// missions teaser and featured item in a 380px left column and the games
// grid (3 per row) on the right.
const OV_CSS = `
  .ov-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 26px; grid-template-areas: "daily" "season" "games" "missions" "featured"; }
  .ov-daily { grid-area: daily; } .ov-season { grid-area: season; display: grid; gap: 12px; } .ov-games { grid-area: games; } .ov-missions { grid-area: missions; } .ov-featured { grid-area: featured; }
  .ov-grid > * { min-width: 0; align-self: start; }
  @media (min-width: 861px) {
    .ov-grid { grid-template-columns: 380px minmax(0, 1fr); grid-template-rows: auto auto auto 1fr; column-gap: 28px; row-gap: 24px;
      grid-template-areas: "daily games" "season games" "missions games" "featured games"; }
  }
  .ov-link { all: unset; box-sizing: border-box; cursor: pointer; display: flex; align-items: center; justify-content: center; min-height: 44px; margin-top: 8px; width: 100%;
    font-size: 13px; font-weight: 900; color: ${CANDY.gold}; border-radius: 12px; }
  .ov-link:focus-visible, .ov-mission:focus-visible { outline: 3px solid ${CANDY.gold}; outline-offset: 3px; }
  .ov-mission { all: unset; box-sizing: border-box; cursor: pointer; display: flex; flex-direction: column; gap: 10px; width: 100%; padding: 14px; }
`;

// The teaser shows the most relevant daily casino mission: ready-to-claim
// first, then in progress, then not started, then claimed.
function pickTopMission(states) {
  const rank = (x) => (x.claimable ? 0 : x.claimed ? 3 : x.progress > 0 ? 1 : 2);
  return [...states].sort((a, b) => rank(a) - rank(b))[0] || null;
}

function MissionTeaser({ s, onOpen }) {
  const m = s.mission;
  const done = s.claimed;
  const pct = done ? 100 : Math.min(100, Math.round((s.progress / m.target) * 100));
  return (
    <Card style={{ overflow: 'hidden' }}>
      <button type="button" className="ov-mission" onClick={() => onOpen && onOpen(m)} aria-label={`${m.name}: ${done ? m.target : s.progress} of ${m.target} casino rounds`}>
        <span style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: CANDY.display, fontSize: 19, lineHeight: 1.1, color: '#fff' }}>{m.name}</span>
          <CurrencyAmounts r={m.reward} size={18} fontSize={14} gap={8} />
        </span>
        {(done || s.claimable) && (
          <span>{done ? <Badge bg={C.green} color="#fff">Claimed today</Badge> : <Badge bg={CANDY.gold}>Ready to claim</Badge>}</span>
        )}
        <Progress value={pct} height={16} color={done ? C.green : undefined} />
        <span style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, fontWeight: 800, color: 'rgba(255,255,255,.78)' }}>
          <span>{done ? m.target : s.progress} / {m.target} casino rounds</span>
          {m.xp ? <span style={{ color: CANDY.gold }}>+{amountText(m.xp, 'xp')}</span> : null}
        </span>
      </button>
    </Card>
  );
}

/**
 * Home: daily reward, every game (the old Play tab, headed "Bonus games"),
 * the missions teaser and the featured store item. `focusGames` is a nonce —
 * when it changes the view scrolls to the games (legacy "Go to Games" CTAs).
 */
export default function Overview({ wallet = null, xp = 1200, activeTab = 'home', onNavigate, onOpenProfile, onOpenMission, missionStates = null, loggedIn = false, canClaimDaily = loggedIn, dailyDay = 1, dailyClaimed = false, onClaimDaily, userId = null, displayName = null, onEditName, navBadges = {}, games = null, storeItems = null, missions = null, dailyRewards = null, gamePlays = null, onPlay, focusGames = 0, isWidget = false, story = null, onStoryOpen, onStoryClose, season = null, onCollectHustle, onClaimLeague } = {}) {
  const go = (t) => onNavigate && onNavigate(t);
  const states = missionStates || casinoMissionStates(missions || CASINO_MISSIONS, { rounds: 0, today: null });
  const top = pickTopMission(states);
  const resetLabel = useResetText();
  // Store may be empty until the admin dashboard populates it
  const items = storeItems || STORE_ITEMS;
  const gameList = games || MINIGAMES;
  const featuredItem = items.find(i => i.featured) || items.find(i => !i.redeem) || items[0] || null;
  const featuredSrc = featuredItem && (featuredItem.imageUrl || IMAGES[featuredItem.image]);
  React.useEffect(() => {
    if (!focusGames) return;
    const el = typeof document !== 'undefined' && document.getElementById('home-games');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [focusGames]);
  return (
    <RedesignShell wallet={wallet} xp={xp} userId={userId} displayName={displayName} onEditName={onEditName} navBadges={navBadges} activeTab={activeTab} onNavigate={onNavigate} onOpenProfile={onOpenProfile}
      isWidget={isWidget} story={story} onStoryOpen={onStoryOpen} onStoryClose={onStoryClose}>
      <style dangerouslySetInnerHTML={{ __html: OV_CSS }} />
      <div className="ov-grid" style={{ maxWidth: 1240, margin: '0 auto' }}>
        <div className="ov-daily">
          <DailyReward dailyDay={dailyDay} dailyClaimed={dailyClaimed} onClaim={onClaimDaily} rewards={dailyRewards} loggedIn={canClaimDaily} />
        </div>

        {season && (
          <section className="ov-season" aria-labelledby="ov-season-title">
            <SectionTitle id="ov-season-title" right={season.league?.unlocked ? <TitleNote>W {season.league.record.won} · L {season.league.record.lost}</TitleNote> : null}>This week</SectionTitle>
            <MatchCard season={season} compact onClaimLeague={onClaimLeague} onNavigate={onNavigate} />
            <HustleCard hustle={season.hustle} onCollect={onCollectHustle} />
          </section>
        )}

        <div className="ov-games">
          <GamesGrid gamePlays={gamePlays} onPlay={onPlay} games={gameList} />
        </div>

        {top && (
          <section className="ov-missions" aria-labelledby="ov-missions-title">
            <SectionTitle id="ov-missions-title" right={<TitleNote>{resetLabel}</TitleNote>}>Missions</SectionTitle>
            <MissionTeaser s={top} onOpen={onOpenMission} />
            <button type="button" className="ov-link" onClick={() => go('missions')}>See all {states.length} missions ›</button>
          </section>
        )}

        {featuredItem && (
          <section className="ov-featured" aria-labelledby="ov-featured-title">
            <SectionTitle id="ov-featured-title" size={22}>Featured reward</SectionTitle>
            <Card style={{ padding: 12, display: 'flex', gap: 12, alignItems: 'center' }}>
              <div style={{ width: 96, flex: 'none' }}>
                {featuredSrc
                  ? <Thumb src={featuredSrc} alt={featuredItem.name} h={84} />
                  : <div style={{ height: 84, borderRadius: 12, display: 'grid', placeItems: 'center', background: `radial-gradient(circle at 50% 40%, ${CANDY.glow}, ${C.track})` }}><RewardIcon kind={GEMS.includes(featuredItem.redeem?.currency) ? featuredItem.redeem.currency : 'coins'} size={52} /></div>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: CANDY.display, fontSize: 17, lineHeight: 1.15, marginBottom: 4 }}>{featuredItem.name}</div>
                {featuredItem.desc && <div style={{ fontSize: 12, color: C.sub, marginBottom: 8 }}>{featuredItem.desc}</div>}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', marginTop: featuredItem.desc ? 0 : 6 }}>
                  <CurrencyAmounts r={featuredItem.price} size={17} fontSize={14} gap={8} />
                  <GreenBtn size={16} onClick={() => go('store')} style={{ marginBottom: 6 }}>{featuredItem.redeem ? 'Redeem' : 'Buy now'}</GreenBtn>
                </div>
              </div>
            </Card>
          </section>
        )}
      </div>
    </RedesignShell>
  );
}
