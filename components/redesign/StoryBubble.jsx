'use client';

import React from 'react';
import { X } from 'lucide-react';
import { CANDY } from './tokens';
import CandyButton from '../games/candy/CandyButton';

// "My story" comic speech bubbles anchored under Vuma's header avatar.
// mode 'hint' = the small "My story" bubble (tap to open); 'open' = the big
// bubble with Vuma's intro. When and how long they show is decided by
// GamificationPlatform (once per widget open, hidden while a modal is open).

const STORY = "I'm Vuma Katongo. I grew up kicking a plastic ball in the village — no boots, just a big dream. One day I want to wear the Zambia shirt and play for the biggest clubs in the world. Every time you play, you help me train and move up. The more you play, the more you unlock: new places, new clubs, bigger rewards. Let's make it to the top together!";

const CREAM = '#FFF8E7';
const INK = CANDY.outline;

export const STORY_CSS = `
  @keyframes rs-sb-pop { 0% { opacity: 0; transform: translateY(-6px) scale(.6); } 70% { opacity: 1; transform: translateY(0) scale(1.06); } 100% { transform: none; } }
  @keyframes rs-sb-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
  @keyframes rs-sb-fade { from { opacity: 0 } to { opacity: 1 } }
  .rs-sb-hint { animation: rs-sb-pop .38s cubic-bezier(.2,.9,.3,1.3) both, rs-sb-bob 2.2s ease-in-out .5s infinite; transform-origin: 22px 0; }
  .rs-sb-big { animation: rs-sb-pop .3s cubic-bezier(.2,.9,.3,1.2) both; transform-origin: 30px 0; }
  .rs-sb-scrim { animation: rs-sb-fade .2s ease-out both; }
  .rs-sb-hint:focus-visible, .rs-sb-x:focus-visible { outline: 3px solid ${CANDY.gold}; outline-offset: 3px; }
  @media (prefers-reduced-motion: reduce) { .rs-sb-hint, .rs-sb-big, .rs-sb-scrim { animation: none !important; } }
`;

// Bubble tail: a cream square turned 45deg with the outline on its two outer edges.
const tail = (left) => ({
  position: 'absolute', top: -10, left, width: 16, height: 16, background: CREAM,
  borderTop: `3px solid ${INK}`, borderLeft: `3px solid ${INK}`, transform: 'rotate(45deg)', borderTopLeftRadius: 4,
});

export default function StoryBubble({ mode, onOpen, onClose }) {
  const closeRef = React.useRef(null);
  React.useEffect(() => {
    if (mode !== 'open') return undefined;
    if (closeRef.current) closeRef.current.focus();
    const onKey = (e) => { if (e.key === 'Escape' && onClose) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, onClose]);

  if (mode === 'hint') {
    return (
      <button type="button" onClick={onOpen} className="rs-sb-hint" aria-label="My story: read Vuma Katongo's story"
        style={{
          position: 'absolute', top: 'calc(100% + 10px)', left: 0, zIndex: 3,
          minHeight: 44, padding: '0 16px', borderRadius: 16, cursor: 'pointer',
          background: CREAM, border: `3px solid ${INK}`, boxShadow: `0 4px 0 ${INK}, 0 10px 18px rgba(0,0,0,.35)`,
          fontFamily: CANDY.display, fontSize: 17, letterSpacing: 0.4, color: INK, whiteSpace: 'nowrap',
          WebkitTapHighlightColor: 'transparent',
        }}>
        <span aria-hidden="true" style={tail(18)} />
        <span style={{ position: 'relative' }}>My story</span>
      </button>
    );
  }
  if (mode !== 'open') return null;
  return (
    <>
      <div className="rs-sb-scrim" onClick={onClose} aria-hidden="true"
        style={{ position: 'fixed', inset: 0, zIndex: 1, background: 'rgba(10,3,24,.55)' }} />
      <div role="dialog" aria-modal="true" aria-labelledby="rs-story-title" className="rs-sb-big"
        style={{
          position: 'absolute', top: 'calc(100% + 12px)', left: 0, zIndex: 3,
          width: 'min(360px, calc(100vw - 28px))', boxSizing: 'border-box', padding: '16px 16px 10px',
          borderRadius: 22, background: CREAM, border: `3px solid ${INK}`,
          boxShadow: `0 6px 0 ${INK}, 0 18px 36px rgba(0,0,0,.5)`, color: INK, textAlign: 'left',
        }}>
        <span aria-hidden="true" style={tail(20)} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <h2 id="rs-story-title" style={{ flex: 1, margin: '4px 0 0', fontFamily: CANDY.display, fontWeight: 400, fontSize: 24, lineHeight: 1.05, color: INK, letterSpacing: 0.4 }}>Vuma Katongo</h2>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close Vuma's story" className="rs-sb-x"
            style={{ width: 44, height: 44, margin: '-8px -8px 0 0', flex: 'none', border: 'none', background: 'transparent', padding: 0, display: 'grid', placeItems: 'center', cursor: 'pointer', borderRadius: '50%' }}>
            <span style={{ width: 32, height: 32, borderRadius: '50%', display: 'grid', placeItems: 'center', color: '#fff', background: `linear-gradient(180deg, ${CANDY.red.light}, ${CANDY.red.fill})`, border: `2px solid ${INK}`, boxShadow: `0 3px 0 ${CANDY.red.dark}` }}>
              <X size={17} strokeWidth={3.25} />
            </span>
          </button>
        </div>
        <p style={{ position: 'relative', margin: '8px 0 14px', fontFamily: CANDY.body, fontSize: 15, lineHeight: 1.5, color: '#3B2559' }}>{STORY}</p>
        <CandyButton color="green" onClick={onClose} style={{ width: '100%', fontSize: 22, minHeight: 52 }}>Let&apos;s go!</CandyButton>
      </div>
    </>
  );
}
