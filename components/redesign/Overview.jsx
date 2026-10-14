'use client';

import React from 'react';
import { C, CANDY } from './tokens';
import RedesignShell, { Badge, Progress, SectionTitle, TitleNote, Card, CurrencyAmounts } from './RedesignShell';
import DailyReward from './DailyReward';
import GamesGrid from './GamesGrid';
import HomeStore from './HomeStore';
import { MatchCard, HustleCard } from './SeasonCards';
import { useResetText } from './EarnView';
import { amountText } from '@/lib/rewardText.mjs';
import { CASINO_MISSIONS } from '@/lib/data/missions';
import { casinoMissionStates } from '@/lib/missions/casino.mjs';
import { STORE_ITEMS, MINIGAMES } from '@/lib/data/platform';
import { splitCatalog } from '@/lib/store/catalog.mjs';

// Home layout (design "A · Full candy"): phones stack daily reward → store
// → this week → bonus games → missions; desktop (≥861px) opens with ONE row,
// daily reward (380px) left + the store panel right (stretched to the daily
// card's height), then this week + missions on the left beside the games
// grid (3 per row). With an empty store the games take the top-right slot.
const OV_CSS = `
  .ov-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 26px; grid-template-areas: "daily" "store" "season" "games" "missions"; }
  .ov-daily { grid-area: daily; } .ov-store { grid-area: store; } .ov-season { grid-area: season; display: grid; gap: 12px; } .ov-games { grid-area: games; } .ov-missions { grid-area: missions; }
  .ov-grid > * { min-width: 0; align-self: start; }
  .ov-grid--nostore { grid-template-areas: "daily" "season" "games" "missions"; }
  @media (min-width: 861px) {
    .ov-grid { grid-template-columns: 380px minmax(0, 1fr); grid-template-rows: auto auto 1fr; column-gap: 28px; row-gap: 24px;
      grid-template-areas: "daily store" "season games" "missions games"; }
    .ov-grid > .ov-store { align-self: stretch; }
    .ov-grid--nostore { grid-template-rows: auto auto 1fr; grid-template-areas: "daily games" "season games" "missions games"; }
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
 * the missions teaser and a store panel (kwacha packs first) that buys
 * through the same onBuy/busyId as the Store tab. `focusGames` is a nonce —
 * when it changes the view scrolls to the games (legacy "Go to Games" CTAs).
 */
export default function Overview({ wallet = null, xp = 1200, activeTab = 'home', onNavigate, onOpenProfile, onOpenMission, missionStates = null, loggedIn = false, canClaimDaily = loggedIn, dailyDay = 1, dailyClaimed = false, onClaimDaily, userId = null, displayName = null, onEditName, navBadges = {}, games = null, storeItems = null, missions = null, dailyRewards = null, gamePlays = null, onPlay, focusGames = 0, isWidget = false, story = null, onStoryOpen, onStoryClose, season = null, onCollectHustle, onClaimLeague, onBuy, busyId = null } = {}) {
  const go = (t) => onNavigate && onNavigate(t);
  const states = missionStates || casinoMissionStates(missions || CASINO_MISSIONS, { rounds: 0, today: null });
  const top = pickTopMission(states);
  const resetLabel = useResetText();
  // Store may be empty until the admin dashboard populates it
  const items = storeItems || STORE_ITEMS;
  const gameList = games || MINIGAMES;
  // Gem redemptions are ignored (as in the Store tab), so they don't count
  const catalog = splitCatalog(items);
  const hasStore = catalog.coinPacks.length + catalog.items.length > 0;
  React.useEffect(() => {
    if (!focusGames) return;
    const el = typeof document !== 'undefined' && document.getElementById('home-games');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [focusGames]);
  return (
    <RedesignShell wallet={wallet} xp={xp} userId={userId} displayName={displayName} onEditName={onEditName} navBadges={navBadges} activeTab={activeTab} onNavigate={onNavigate} onOpenProfile={onOpenProfile}
      isWidget={isWidget} story={story} onStoryOpen={onStoryOpen} onStoryClose={onStoryClose}>
      <style dangerouslySetInnerHTML={{ __html: OV_CSS }} />
      <div className={`ov-grid${hasStore ? '' : ' ov-grid--nostore'}`} style={{ maxWidth: 1240, margin: '0 auto' }}>
        <div className="ov-daily">
          <DailyReward dailyDay={dailyDay} dailyClaimed={dailyClaimed} onClaim={onClaimDaily} rewards={dailyRewards} loggedIn={canClaimDaily} />
        </div>

        {hasStore && (
          <HomeStore className="ov-store" storeItems={items} wallet={wallet} onBuy={onBuy} busyId={busyId} onSeeAll={() => go('store')} />
        )}

        {season && (
          <section className="ov-season" aria-labelledby="ov-season-title">
            <SectionTitle id="ov-season-title" right={season.league?.unlocked ? <TitleNote>W {season.league.record.won} · L {season.league.record.lost}</TitleNote> : null}>This week</SectionTitle>
            <MatchCard season={season} compact onClaimLeague={onClaimLeague} onNavigate={onNavigate} />
            <HustleCard hustle={season.hustle} hero={season.heroName} onCollect={onCollectHustle} />
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
      </div>
    </RedesignShell>
  );
}
