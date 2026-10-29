'use client';

import React from 'react';
import { C, CANDY } from './tokens';
import RedesignShell, { Badge, Progress, SectionTitle, TitleNote, Card, CurrencyAmounts } from './RedesignShell';
import DailyReward from './DailyReward';
import GamesGrid from './GamesGrid';
import HomeStore from './HomeStore';
import { MatchCard, HustleCard } from './SeasonCards';
import { EarnPrize, MissionTerms } from './EarnView';
import { amountText } from '@/lib/rewardText.mjs';
import { XpAmount } from './XpStar';
import { MISSIONS } from '@/lib/data/missions';
import { missionStates as buildMissionStates, missionBoard, progressUnit, missionTerms } from '@/lib/missions/ladder.mjs';
import { STORE_ITEMS, MINIGAMES, getLevel } from '@/lib/data/platform';
import { splitCatalog, storeLockReason } from '@/lib/store/catalog.mjs';
import { WheelCard } from '../extras/useWheel';
import { Predictions } from '../extras/ExtrasViews';

// Home layout (design "A · Full candy"; missions moved to the top 2026-10-18,
// when the daily reward became a popup on open; daily reward and Coin Shop
// swapped 2026-10-20; 2026-10-29 owner order): phones stack missions → daily
// reward → bonus games → weekly predictions → football match + side quest →
// Coin Shop; desktop (≥861px) opens with missions (400px) left + the daily
// reward right, then the Coin Shop on the left beside the games grid (2 bigger
// tiles per row; 3 when there is no store and the games span the width), then
// weekly predictions full width, then the football match and the side quest
// side by side (the side quest card stretches to the match card's height).
// Below level 10 the Coin Shop is greyed with a lock plate.
const OV_CSS = `
  .ov-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: 26px; grid-template-areas: "missions" "daily" "games" "predict" "season" "store"; }
  .ov-daily { grid-area: daily; } .ov-store { grid-area: store; } .ov-season { grid-area: season; display: grid; gap: 12px; } .ov-games { grid-area: games; } .ov-missions { grid-area: missions; display: grid; gap: 12px; } .ov-predict { grid-area: predict; }
  .ov-match { display: grid; gap: 12px; min-width: 0; align-content: start; }
  .ov-grid > * { min-width: 0; align-self: start; }
  .ov-grid--nostore { grid-template-areas: "missions" "daily" "games" "predict" "season"; }
  @media (min-width: 861px) {
    .ov-grid { grid-template-columns: 400px minmax(0, 1fr); column-gap: 28px; row-gap: 24px;
      grid-template-areas: "missions daily" "store games" "predict predict" "season season"; }
    .ov-grid--nostore { grid-template-areas: "missions daily" "games games" "predict predict" "season season"; }
    .ov-grid--nostore .rs-games { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .ov-season { grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr); column-gap: 24px; align-items: stretch; }
    .ov-season > :first-child { grid-column: 1 / -1; }
  }
  /* "See all missions": a full button, not a text link (owner 2026-10-22: make it bigger) */
  .ov-link { all: unset; box-sizing: border-box; cursor: pointer; display: flex; align-items: center; justify-content: center; min-height: 56px; margin-top: 10px; width: 100%;
    font-family: ${CANDY.display}; font-size: 21px; letter-spacing: .02em; text-transform: uppercase; color: ${CANDY.gold}; border-radius: 16px;
    background: linear-gradient(180deg, ${CANDY.violet.fill}, ${CANDY.violet.dark}); border: 2px solid #4A0F78; box-shadow: 0 5px 0 #4A0F78;
    text-shadow: 0 2px 0 ${CANDY.outline}; transition: transform .08s ease; }
  .ov-link:active { transform: translateY(3px); box-shadow: 0 2px 0 #4A0F78; }
  .ov-link:focus-visible, .ov-mission:focus-visible { outline: 3px solid ${CANDY.gold}; outline-offset: 3px; }
  .ov-mission { all: unset; box-sizing: border-box; cursor: pointer; display: flex; flex-direction: column; gap: 10px; width: 100%; padding: 14px; }
`;

// The teaser shows the most relevant current mission (missionBoard: the next
// mission of each ladder, ready-to-claim first, then in progress).
const pickTopMission = (states) => missionBoard(states).current[0] || null;

function MissionTeaser({ s, onOpen }) {
  const m = s.mission;
  const done = s.claimed;
  const pct = done ? 100 : Math.min(100, Math.round((s.progress / m.target) * 100));
  const unit = progressUnit(m);
  return (
    <Card style={{ overflow: 'hidden' }}>
      <button type="button" className="ov-mission" onClick={() => onOpen && onOpen(m)} aria-label={`BwanaBet missions: ${missionTerms(m)}, ${done ? m.target : s.progress} of ${m.target} ${unit}`}>
        {/* the card's own title (2026-10-21: replaces the mission name and the section header above it) */}
        <span data-mission-title style={{ alignSelf: 'center', textAlign: 'center', fontFamily: CANDY.display, fontSize: 21, lineHeight: 1.1, color: CANDY.gold, textTransform: 'uppercase', textShadow: '0 2px 0 #2A0A4F' }}>BwanaBet missions</span>
        {/* what to do first, then what it pays (owner 2026-10-22) */}
        <span style={{ fontFamily: CANDY.display, fontSize: 21, lineHeight: 1.15, letterSpacing: '.01em', color: '#fff', textAlign: 'center', textWrap: 'balance' }}><MissionTerms m={m} /></span>
        <span style={{ padding: '4px 0' }}><EarnPrize r={m.reward} size={36} fontSize={32} /></span>
        {(done || s.claimable) && (
          <span>{done ? <Badge bg={C.green} color="#fff">Collected</Badge> : <Badge bg={CANDY.gold}>Ready to claim</Badge>}</span>
        )}
        <Progress value={pct} height={16} color={done ? C.green : undefined} />
        <span style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, fontWeight: 800, color: 'rgba(255,255,255,.78)' }}>
          <span>{(done ? m.target : s.progress).toLocaleString('en-US')} / {m.target.toLocaleString('en-US')} {unit}</span>
          {m.xp ? <XpAmount size={18}>+{amountText(m.xp, 'xp')}</XpAmount> : null}
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
export default function Overview({ wallet = null, xp = 1200, activeTab = 'home', onNavigate, onOpenProfile, onOpenMission, missionStates = null, loggedIn = false, canClaimDaily = loggedIn, dailyDay = 1, dailyClaimed = false, onClaimDaily, userId = null, displayName = null, onEditName, navBadges = {}, games = null, storeItems = null, missions = null, dailyRewards = null, gamePlays = null, onPlay, focusGames = 0, isWidget = false, story = null, onStoryOpen, onStoryClose, onStoryGo, storyPrize = null, intro = null, season = null, onCollectHustle, onClaimLeague, onBuy, busyId = null, extras = null, wheel = null } = {}) {
  const go = (t) => onNavigate && onNavigate(t);
  const states = missionStates || buildMissionStates(missions || MISSIONS, {}, []);
  const top = pickTopMission(states);
  // Store may be empty until the admin dashboard populates it
  const items = storeItems || STORE_ITEMS;
  const gameList = games || MINIGAMES;
  // Gem redemptions are ignored (as in the Store tab), so they don't count
  const catalog = splitCatalog(items);
  const hasStore = catalog.coinPacks.length + catalog.items.length + catalog.prizes.length > 0;
  React.useEffect(() => {
    if (!focusGames) return;
    const el = typeof document !== 'undefined' && document.getElementById('home-games');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [focusGames]);
  return (
    <RedesignShell wallet={wallet} xp={xp} userId={userId} displayName={displayName} onEditName={onEditName} navBadges={navBadges} activeTab={activeTab} onNavigate={onNavigate} onOpenProfile={onOpenProfile}
      isWidget={isWidget} story={story} onStoryOpen={onStoryOpen} onStoryClose={onStoryClose} onStoryGo={onStoryGo} storyPrize={storyPrize} intro={intro}>
      <style dangerouslySetInnerHTML={{ __html: OV_CSS }} />
      <div className={`ov-grid${hasStore ? '' : ' ov-grid--nostore'}`} style={{ maxWidth: 1240, margin: '0 auto' }}>
        {/* DOM order = phone order (missions, daily, games, predictions, football, store) */}
        {(top || wheel) && (
          <section className="ov-missions" aria-label="BwanaBet missions">
            {wheel && <WheelCard onOpen={wheel.onOpen} />}
            {top && <>
            <MissionTeaser s={top} onOpen={onOpenMission} />
            <button type="button" className="ov-link" onClick={() => go('missions')}>See all missions ›</button>
            </>}
          </section>
        )}

        <div className="ov-daily">
          <DailyReward dailyDay={dailyDay} dailyClaimed={dailyClaimed} onClaim={onClaimDaily} rewards={dailyRewards} loggedIn={canClaimDaily} />
        </div>

        <div className="ov-games">
          <GamesGrid gamePlays={gamePlays} onPlay={onPlay} games={gameList} />
        </div>

        {extras && (
          <div className="ov-predict">
            <Predictions predictions={extras.predictions} compact onSeeAll={() => go('missions')} />
          </div>
        )}

        {season && (
          <section className="ov-season" aria-labelledby="ov-season-title">
            <SectionTitle id="ov-season-title" right={season.league?.unlocked ? <TitleNote>W {season.league.record.won} · L {season.league.record.lost}</TitleNote> : null}>Football match</SectionTitle>
            <div className="ov-match">
              <MatchCard season={season} compact onClaimLeague={onClaimLeague} onNavigate={onNavigate} />
            </div>
            <div className="ov-hustle" style={{ minWidth: 0 }}>
              <HustleCard hustle={season.hustle} hero={season.heroName} onCollect={onCollectHustle} />
            </div>
          </section>
        )}

        {hasStore && (
          <HomeStore className="ov-store" storeItems={items} wallet={wallet} onBuy={onBuy} busyId={busyId} onSeeAll={() => go('store')} locked={storeLockReason(getLevel(xp).level, wallet?.store)} xp={xp} uid={userId} />
        )}
      </div>
    </RedesignShell>
  );
}
