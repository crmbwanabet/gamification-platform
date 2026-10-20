'use client';

import React from 'react';
import { CANDY, goldRim, dotRow } from './tokens';

const BU_CSS = `
  .bu-back { position: fixed; inset: 0; z-index: 410; display: grid; place-items: center; padding: 16px;
    background: rgba(8,4,20,.82); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px);
    animation: buFade .25s ease-out both; overflow-y: auto; }
  .bu-back.closing { animation: buFadeOut .4s ease-in forwards; pointer-events: none; }
  .bu-box { position: relative; width: 100%; max-width: 400px; box-sizing: border-box; padding: 9px; border-radius: 26px;
    animation: buIn .42s cubic-bezier(.22,1.3,.36,1) both; }
  .bu-back.closing .bu-box { animation: buOut .4s ease-in forwards; }
  .bu-in { position: relative; border-radius: 18px; padding: 22px 18px 18px; text-align: center; color: #fff; font-family: ${CANDY.body};
    background: radial-gradient(110% 70% at 50% 18%, ${CANDY.glow}, ${CANDY.bgTop} 62%, ${CANDY.bgBottom}); box-shadow: inset 0 0 0 1.5px rgba(255,210,31,.55); }
  .bu-gift { width: 116px; height: 116px; display: block; margin: -2px auto 6px; filter: drop-shadow(0 8px 14px rgba(0,0,0,.45)); animation: buBob 2.4s ease-in-out infinite; }
  .bu-title { margin: 0; font-family: ${CANDY.display}; font-weight: 400; font-size: 30px; line-height: 1.02; color: #FFD21F; text-transform: uppercase;
    text-shadow: 0 3px 0 #2A0A4F; }
  .bu-sub { margin: 8px 0 14px; font-size: 14px; font-weight: 800; color: #E4D8F7; }
  .bu-list { list-style: none; margin: 0 0 16px; padding: 0; display: flex; flex-direction: column; gap: 8px; text-align: left; }
  .bu-list li { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border-radius: 14px; font-weight: 900; font-size: 14.5px;
    background: rgba(20,4,48,.6); border: 2px solid ${CANDY.violet.fill}; }
  .bu-list li span { font-size: 20px; line-height: 1; flex: none; }
  .bu-go { all: unset; box-sizing: border-box; cursor: pointer; display: block; width: 100%; min-height: 54px; border-radius: 16px; text-align: center;
    font-family: ${CANDY.display}; font-size: 22px; line-height: 54px; text-transform: uppercase; color: #fff;
    background: linear-gradient(180deg, #5BE37A, #1E9E44); border: 3px solid #0f5a25; box-shadow: 0 4px 0 #0f5a25; text-shadow: 0 2px 0 #0f5a25; }
  .bu-go:active { transform: translateY(2px); box-shadow: 0 2px 0 #0f5a25; }
  .bu-go:focus-visible { outline: 3px solid #FFD21F; outline-offset: 3px; }
  @keyframes buFade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes buFadeOut { to { opacity: 0; } }
  @keyframes buIn { from { opacity: 0; transform: scale(.8) translateY(26px); } to { opacity: 1; transform: none; } }
  @keyframes buOut { to { opacity: 0; transform: scale(.92) translateY(-24px); } }
  @keyframes buBob { 0%, 100% { transform: translateY(0) rotate(-3deg); } 50% { transform: translateY(-6px) rotate(3deg); } }
  @media (prefers-reduced-motion: reduce) {
    .bu-back, .bu-box, .bu-gift, .bu-back.closing, .bu-back.closing .bu-box { animation: none !important; }
  }
`;

/**
 * "New bonuses unlocked" pop-up (2026-10-20): the first Bonus Center visit of
 * the Lusaka day, after the Wheel of Fortune result and before the daily
 * reward pop-up. `items` = [{ icon, text }] of what is waiting today; the one
 * button (or Escape) continues into the Bonus Center.
 */
export default function BonusUnlockedPopup({ open = false, closing = false, items = [], onContinue }) {
  const btnRef = React.useRef(null);
  React.useEffect(() => {
    if (!open || closing) return undefined;
    if (btnRef.current) btnRef.current.focus({ preventScroll: true });
    const onKey = (e) => { if (e.key === 'Escape' && onContinue) onContinue(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, closing, onContinue]);
  if (!open) return null;
  return (
    <div className={`bu-back${closing ? ' closing' : ''}`} role="dialog" aria-modal="true" aria-labelledby="bu-title" data-bonus-unlocked>
      <style dangerouslySetInnerHTML={{ __html: BU_CSS }} />
      <div className="bu-box" style={{ ...goldRim, boxShadow: `${goldRim.boxShadow}, 0 24px 70px rgba(0,0,0,.6)` }}>
        <span aria-hidden style={{ ...dotRow(false), top: 0.5, left: 22, right: 22, height: 8 }} />
        <span aria-hidden style={{ ...dotRow(false), bottom: 0.5, left: 22, right: 22, height: 8 }} />
        <div className="bu-in">
          <img src="/ui/reward/gift-red.png" alt="" className="bu-gift" width={116} height={116} />
          <h2 id="bu-title" className="bu-title">New bonuses unlocked!</h2>
          <p className="bu-sub">Your BwanaBet Bonus Center is ready for today</p>
          {items.length > 0 && (
            <ul className="bu-list">
              {items.map((it) => <li key={it.text}><span aria-hidden>{it.icon}</span>{it.text}</li>)}
            </ul>
          )}
          <button ref={btnRef} type="button" className="bu-go" onClick={onContinue}>See my bonuses</button>
        </div>
      </div>
    </div>
  );
}
