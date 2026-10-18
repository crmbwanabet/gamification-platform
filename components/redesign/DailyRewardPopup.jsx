'use client';

import React from 'react';
import { CANDY } from './tokens';
import DailyReward from './DailyReward';

const DP_CSS = `
  .dp-back { position: fixed; inset: 0; z-index: 400; display: grid; place-items: center; padding: 16px;
    background: rgba(8,4,20,.8); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
    animation: dpFade .25s ease-out both; overflow-y: auto; }
  .dp-box { position: relative; width: 100%; max-width: 420px; animation: dpIn .38s cubic-bezier(.22,1.3,.36,1) both; }
  .dp-back.closing { animation: dpFadeOut .45s ease-in forwards; pointer-events: none; }
  .dp-back.closing .dp-box { animation: dpOut .45s ease-in forwards; }
  .dp-x { all: unset; box-sizing: border-box; position: absolute; top: -12px; right: -8px; z-index: 5; width: 40px; height: 40px; border-radius: 50%; cursor: pointer;
    display: grid; place-items: center; font: 900 20px/1 ${CANDY.body}; color: #fff;
    background: linear-gradient(180deg, ${CANDY.red.light}, ${CANDY.red.fill}); border: 3px solid ${CANDY.red.dark}; box-shadow: 0 3px 0 ${CANDY.red.dark}; }
  .dp-x:focus-visible { outline: 3px solid ${CANDY.gold}; outline-offset: 2px; }
  @keyframes dpFade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes dpFadeOut { to { opacity: 0; } }
  @keyframes dpIn { from { opacity: 0; transform: scale(.82) translateY(24px); } to { opacity: 1; transform: none; } }
  @keyframes dpOut { to { opacity: 0; transform: scale(.9) translateY(-30px); } }
  @media (prefers-reduced-motion: reduce) {
    .dp-back, .dp-box, .dp-back.closing, .dp-back.closing .dp-box { animation-duration: .01s !important; }
  }
`;

/**
 * Daily reward popup (2026-10-18): opens by itself once per widget open while
 * today's reward is unclaimed. It holds the same DailyReward card as Home; CLAIM
 * credits it (coins fly into the header wallet) and the platform then fades the
 * popup out (`closing`). X / Escape dismiss it; the card stays on Home.
 */
export default function DailyRewardPopup({ open = false, closing = false, onClose, onClaim, dailyDay = 1, dailyClaimed = false, rewards = null, loggedIn = true }) {
  React.useEffect(() => {
    if (!open || closing) return undefined;
    const onKey = (e) => { if (e.key === 'Escape' && onClose) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, closing, onClose]);
  if (!open) return null;
  return (
    <div className={`dp-back${closing ? ' closing' : ''}`} role="dialog" aria-modal="true" aria-label="Daily reward">
      <style dangerouslySetInnerHTML={{ __html: DP_CSS }} />
      <div className="dp-box">
        <button type="button" className="dp-x" onClick={onClose} aria-label="Close daily reward">✕</button>
        <DailyReward id="daily-reward-popup" dailyDay={dailyDay} dailyClaimed={dailyClaimed} onClaim={onClaim} rewards={rewards} loggedIn={loggedIn} />
      </div>
    </div>
  );
}
