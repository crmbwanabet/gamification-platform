'use client';

import React from 'react';
import { X, ChevronDown, Gift, Gamepad2 } from 'lucide-react';
import XpStar from './XpStar';
import { C, CANDY, COIN_ICON, goldRim, GOLD_TITLE_SHADOW } from './tokens';
import CandyButton from '../games/candy/CandyButton';
import { INTRO_COLLAPSE_STAGE } from '@/lib/vuma/stages.mjs';

// Top of every tab (2026-10-16, second pass):
// - BonusCenterTitle: "BWANABET BONUS CENTER", the site's name, huge, always shown.
// - BonusIntro: the "HOW IT WORKS" panel, separate from the title. It never
//   disappears: below stage 8 it opens expanded each time the widget opens and
//   its X / GOT IT shrink it to a "HOW IT WORKS" header (for this open only;
//   the flag lives in GamificationPlatform's state, never saved). From stage 8
//   it starts as that header. The header always expands again.

const LINES = [
  { icon: <Gift size={20} strokeWidth={2.6} />, text: <>Log in every day to earn <b>coins</b> and <b>XP points</b>!</> },
  { icon: <img src={COIN_ICON} alt="" width={22} height={22} style={{ display: 'block' }} />, text: <>Convert <b>COINS</b> to <b>CASH</b> or <b>PRIZES</b>!</> },
  { icon: <Gamepad2 size={20} strokeWidth={2.6} />, text: <>Play free bonus mini-games and earn more coins!</> },
  { icon: <XpStar size={26} />, text: <>Get <b>XP POINTS</b> with every real bet to <b>LEVEL UP</b> – get even bigger <b>BONUSES</b> and exclusive <b>VIP STATUS</b>!</> },
];

const CSS = `
  .bc-title { max-width: 1240px; margin: 2px auto 14px; text-align: center; font-family: ${CANDY.display}; font-weight: 400; line-height: .95; letter-spacing: .5px; color: ${CANDY.gold}; text-shadow: ${GOLD_TITLE_SHADOW}; font-size: clamp(34px, 9.5vw, 92px); text-transform: uppercase; }
  .bc-title span { display: block; font-size: .5em; letter-spacing: .12em; color: #FEF200; }
  .bi-card { position: relative; max-width: 1240px; margin: 0 auto 18px; box-sizing: border-box; }
  .bi-inner { border-radius: 18px; background: linear-gradient(180deg, ${C.panelHi}, ${C.panelLo}); box-shadow: inset 0 0 0 1.5px rgba(255,210,31,.55); }
  .bi-title { margin: 0; font-family: ${CANDY.display}; font-weight: 400; font-size: 22px; letter-spacing: .6px; color: ${CANDY.gold}; text-shadow: 0 3px 0 ${CANDY.outline}; text-transform: uppercase; }
  .bi-body { padding: 0 16px 16px; }
  .bi-list { list-style: none; margin: 0 0 14px; padding: 0; display: grid; gap: 9px; }
  .bi-list li { display: flex; align-items: center; gap: 10px; font-size: 15px; line-height: 1.35; color: ${C.text}; }
  .bi-list b { color: ${CANDY.gold}; font-weight: 900; }
  .bi-ic { width: 34px; height: 34px; flex: none; border-radius: 10px; display: grid; place-items: center; color: ${CANDY.gold}; background: ${C.track}; }
  .bi-x, .bi-head { all: unset; box-sizing: border-box; cursor: pointer; -webkit-tap-highlight-color: transparent; }
  .bi-x { position: absolute; top: 4px; right: 4px; width: 44px; height: 44px; display: grid; place-items: center; }
  .bi-x span { width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; color: #fff; background: linear-gradient(180deg, ${CANDY.red.light}, ${CANDY.red.fill}); border: 2px solid ${CANDY.outline}; box-shadow: 0 3px 0 ${CANDY.red.dark}; }
  .bi-head { width: 100%; min-height: 48px; padding: 0 16px; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .bi-head--open { padding-right: 56px; }
  .bi-chev { color: ${CANDY.gold}; transition: transform .2s ease-out; }
  .bi-chev--open { transform: rotate(180deg); }
  .bi-x:focus-visible, .bi-head:focus-visible { outline: 3px solid ${CANDY.gold}; outline-offset: 3px; border-radius: 14px; }
  @media (min-width: 861px) { .bi-list { grid-template-columns: 1fr 1fr; column-gap: 18px; } }
  @media (prefers-reduced-motion: reduce) { .bi-chev { transition: none; } }
`;

/** "BWANABET BONUS CENTER": the site's name across the top of every tab. */
export function BonusCenterTitle() {
  return (
    <h1 className="bc-title">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <span>BwanaBet</span>Bonus Center
    </h1>
  );
}

/** "HOW IT WORKS". `open` = null until the player toggles it this open (then
 *  the default applies: expanded below stage 8, the header from stage 8). */
export default function BonusIntro({ stage = 1, open = null, onToggle }) {
  const isOpen = open ?? stage < INTRO_COLLAPSE_STAGE;
  const toggle = () => onToggle && onToggle(!isOpen);
  const close = () => onToggle && onToggle(false);
  return (
    <section className="bi-card" aria-label="How it works" data-bonus-intro style={{ ...goldRim, padding: 6, borderRadius: 22 }}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="bi-inner">
        <button type="button" className={`bi-head${isOpen ? ' bi-head--open' : ''}`} aria-expanded={isOpen} aria-controls="bi-body" onClick={toggle}>
          <h2 className="bi-title">How it works</h2>
          {!isOpen && <ChevronDown size={26} strokeWidth={3} className="bi-chev" aria-hidden />}
        </button>
        {isOpen && (
          <>
            <button type="button" className="bi-x" aria-label="Minimise how it works" onClick={close}>
              <span><X size={16} strokeWidth={3.25} /></span>
            </button>
            <div id="bi-body" className="bi-body">
              <ul className="bi-list">
                {LINES.map((l, i) => <li key={i}><span className="bi-ic" aria-hidden>{l.icon}</span><span>{l.text}</span></li>)}
              </ul>
              <CandyButton color="green" onClick={close} style={{ width: '100%', maxWidth: 320, fontSize: 21, minHeight: 50, borderRadius: 14 }}>GOT IT</CandyButton>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
