'use client';

import React from 'react';
import { C, CANDY, VIOLET_BASE } from './tokens';
import { SectionTitle, TitleNote, Badge, RewardIcon } from './RedesignShell';
import { IMAGES } from '@/lib/data/images';
import { MINIGAMES } from '@/lib/data/platform';

const GG_CSS = `
  .rs-games { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
  .rs-game { all: unset; box-sizing: border-box; cursor: pointer; display: flex; flex-direction: column; overflow: hidden; color: #fff;
    border: 2.5px solid ${CANDY.gold}; border-radius: 18px; background: ${C.track};
    box-shadow: 0 5px 0 ${VIOLET_BASE}, 0 10px 18px rgba(0,0,0,.35); transition: transform .12s ease-out, box-shadow .12s ease-out;
    -webkit-tap-highlight-color: transparent; }
  .rs-game:hover { transform: translateY(-2px); }
  .rs-game:active { transform: translateY(4px); box-shadow: 0 1px 0 ${VIOLET_BASE}, 0 4px 10px rgba(0,0,0,.35); }
  .rs-game:focus-visible { outline: 3px solid ${CANDY.gold}; outline-offset: 3px; }
  .rs-game-img { height: 92px; }
  .rs-game-name { font-size: 15px; }
  @media (min-width: 861px) {
    .rs-games { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 20px; }
    .rs-game { border-radius: 20px; box-shadow: 0 6px 0 ${VIOLET_BASE}, 0 12px 22px rgba(0,0,0,.35); }
    .rs-game-img { height: 170px; }
    .rs-game-name { font-size: 18px; }
  }
  @media (prefers-reduced-motion: reduce) { .rs-game { transition: none; } .rs-game:hover { transform: none; } }
`;

function GameCard({ g, free, onPlay }) {
  // Out of free plays ≠ locked: the card stays playable as a PAID extra play
  // (playGame charges the cost or shows the not-enough-coins toast).
  const out = !g.stakeOnly && free <= 0;
  const note = g.stakeOnly ? (g.stakeRange ?? '1–50') : free > 0 ? `${free} free` : g.cost;
  return (
    <button type="button" className="rs-game" onClick={() => onPlay && onPlay(g.id)}
      aria-label={`Play ${g.name}${g.stakeOnly ? `, stakes ${g.stakeRange ?? '1–50'} coins` : out ? `, paid play ${g.cost} coins` : ''}`}>
      <span className="rs-thumb rs-game-img" style={{ position: 'relative', display: 'block', overflow: 'hidden' }}>
        <img src={IMAGES[g.image]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        {g.isNew && <span style={{ position: 'absolute', top: 6, left: 6 }}><Badge bg={CANDY.red.fill} color="#fff">New</Badge></span>}
      </span>
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, padding: '8px 10px 9px', background: `linear-gradient(180deg, ${C.panelHi}, ${C.panelLo})` }}>
        <span className="rs-game-name" style={{ fontFamily: CANDY.display, lineHeight: 1.1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, flex: 'none', fontSize: 11, fontWeight: 900, color: CANDY.gold }}>
          {(g.stakeOnly || out) && <RewardIcon kind="coins" size={13} />}{note}
        </span>
      </span>
    </button>
  );
}

/**
 * The games grid (Njuka + the candy games), headed "Bonus games". Lives on
 * Home since the Play tab was folded into it (2026-10); `id="home-games"` is
 * the scroll target for legacy "Go to Games" CTAs.
 */
export default function GamesGrid({ gamePlays, onPlay, games, title = 'Bonus games' }) {
  const list = games || MINIGAMES;
  return (
    <section id="home-games" aria-labelledby="home-games-title" style={{ scrollMarginTop: 12 }}>
      <style dangerouslySetInnerHTML={{ __html: GG_CSS }} />
      <SectionTitle id="home-games-title" right={<TitleNote>{list.length} to play</TitleNote>}>{title}</SectionTitle>
      <div className="rs-games">
        {list.map((g) => <GameCard key={g.id} g={g} free={gamePlays?.[g.id] ?? 0} onPlay={onPlay} />)}
      </div>
    </section>
  );
}
