'use client';

import React from 'react';
import { X, ChevronDown, Gift, Gamepad2, Star } from 'lucide-react';
import { C, CANDY, COIN_ICON, goldRim } from './tokens';
import CandyButton from '../games/candy/CandyButton';
import { INTRO_COLLAPSE_STAGE } from '@/lib/vuma/stages.mjs';

// "BONUS PANEL" intro at the top of every tab (2026-10-16).
// Below stage 6: a full panel each time the widget opens, closed by its X or
// GOT IT (for this open only; the flag lives in GamificationPlatform's state,
// never saved). From stage 6: a slim "BONUS PANEL" header that expands to the
// same text.

const LINES = [
  { icon: <Gift size={20} strokeWidth={2.6} />, text: <>Log in every day to earn <b>coins</b> and <b>XP points</b>!</> },
  { icon: <img src={COIN_ICON} alt="" width={22} height={22} style={{ display: 'block' }} />, text: <>Convert <b>COINS</b> to <b>CASH</b> or <b>PRIZES</b>!</> },
  { icon: <Gamepad2 size={20} strokeWidth={2.6} />, text: <>Play free bonus mini-games and earn more coins!</> },
  { icon: <Star size={20} strokeWidth={2.6} />, text: <>Get <b>XP POINTS</b> with every real bet to <b>LEVEL UP</b> – get even bigger <b>BONUSES</b> and exclusive <b>VIP STATUS</b>!</> },
];

const CSS = `
  .bi-card { position: relative; max-width: 1240px; margin: 0 auto 18px; box-sizing: border-box; }
  .bi-inner { border-radius: 18px; background: linear-gradient(180deg, ${C.panelHi}, ${C.panelLo}); box-shadow: inset 0 0 0 1.5px rgba(255,210,31,.55); padding: 14px 16px 16px; }
  .bi-title { margin: 0; font-family: ${CANDY.display}; font-weight: 400; font-size: 24px; letter-spacing: .6px; color: ${CANDY.gold}; text-shadow: 0 3px 0 ${CANDY.outline}; }
  .bi-list { list-style: none; margin: 10px 0 14px; padding: 0; display: grid; gap: 9px; }
  .bi-list li { display: flex; align-items: center; gap: 10px; font-size: 15px; line-height: 1.35; color: ${C.text}; }
  .bi-list b { color: ${CANDY.gold}; font-weight: 900; }
  .bi-ic { width: 34px; height: 34px; flex: none; border-radius: 10px; display: grid; place-items: center; color: ${CANDY.gold}; background: ${C.track}; }
  .bi-x, .bi-head { all: unset; box-sizing: border-box; cursor: pointer; -webkit-tap-highlight-color: transparent; }
  .bi-x { position: absolute; top: 4px; right: 4px; width: 44px; height: 44px; display: grid; place-items: center; }
  .bi-x span { width: 30px; height: 30px; border-radius: 50%; display: grid; place-items: center; color: #fff; background: linear-gradient(180deg, ${CANDY.red.light}, ${CANDY.red.fill}); border: 2px solid ${CANDY.outline}; box-shadow: 0 3px 0 ${CANDY.red.dark}; }
  .bi-head { width: 100%; min-height: 48px; padding: 0 16px; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .bi-head .bi-title { font-size: 20px; }
  .bi-chev { color: ${CANDY.gold}; transition: transform .2s ease-out; }
  .bi-chev--open { transform: rotate(180deg); }
  .bi-x:focus-visible, .bi-head:focus-visible { outline: 3px solid ${CANDY.gold}; outline-offset: 3px; border-radius: 14px; }
  @media (min-width: 861px) { .bi-list { grid-template-columns: 1fr 1fr; column-gap: 18px; } }
  @media (prefers-reduced-motion: reduce) { .bi-chev { transition: none; } }
`;

export default function BonusIntro({ stage = 1, dismissed = false, onDismiss, open = false, onToggle }) {
  const collapsible = stage >= INTRO_COLLAPSE_STAGE;
  if (!collapsible && dismissed) return null;
  const list = (
    <ul className="bi-list">
      {LINES.map((l, i) => <li key={i}><span className="bi-ic" aria-hidden>{l.icon}</span><span>{l.text}</span></li>)}
    </ul>
  );
  return (
    <section className="bi-card" aria-label="Bonus panel" data-bonus-intro style={{ ...goldRim, padding: 6, borderRadius: 22 }}>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      {collapsible ? (
        <div className="bi-inner" style={{ padding: 0 }}>
          <button type="button" className="bi-head" aria-expanded={open} aria-controls="bi-body" onClick={onToggle}>
            <h2 className="bi-title">BONUS PANEL</h2>
            <ChevronDown size={26} strokeWidth={3} className={`bi-chev${open ? ' bi-chev--open' : ''}`} aria-hidden />
          </button>
          {open && <div id="bi-body" style={{ padding: '0 16px 4px' }}>{list}</div>}
        </div>
      ) : (
        <div className="bi-inner">
          <h2 className="bi-title" style={{ paddingRight: 40 }}>BONUS PANEL</h2>
          <button type="button" className="bi-x" aria-label="Close the bonus panel" onClick={onDismiss}>
            <span><X size={16} strokeWidth={3.25} /></span>
          </button>
          {list}
          <CandyButton color="green" onClick={onDismiss} style={{ width: '100%', maxWidth: 320, fontSize: 21, minHeight: 50, borderRadius: 14 }}>GOT IT</CandyButton>
        </div>
      )}
    </section>
  );
}
