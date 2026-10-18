'use client';

import React from 'react';
import { X } from 'lucide-react';
import { CANDY } from './tokens';
import CandyButton from '../games/candy/CandyButton';

// "My story" comic speech bubbles anchored under the header avatar.
// mode 'hint' = the small "My story" bubble (tap to open); 'open' = the big
// bubble with the player's story. When and how long they show is decided by
// GamificationPlatform (once per widget open, hidden while a modal is open).
// The title is a plain "YOUR STORY:" (2026-10-18; the League level / Status
// header was dropped, those live on the profile-modal chip). Stage 1 tells
// the bottle-and-chickens opening; later stages say where the player is now.

const B = ({ children }) => <b style={{ fontWeight: 900, color: INK_TEXT }}>{children}</b>;
const INK_TEXT = '#2A1446';

function StoryBody({ level }) {
  const first = !level || level.level <= 1;
  const where = level ? `${level.club ? `${level.club}, ` : ''}${level.place}` : '';
  return (
    <>
      <p>The game of football is your passion.</p>
      <p>You dream of representing Zambia at the <B>WORLD CUP</B> and earning <B>MILLIONS</B> while crowds cheer your name.</p>
      {first ? (<>
        <p>For now, your football is an empty bottle.<br />Your pitch is the bush.<br />Your goalposts are two tied chickens.</p>
        <p>You start your journey here.</p>
      </>) : (
        <p>You have come a long way. Now you play at <B>{where}</B>.</p>
      )}
      <h3 style={H3}>To progress</h3>
      <p>Earn <B>XP points</B> from <B>EVERY</B> casino or sport bet.</p>
      <p>More XP points = <B>LEVEL UP</B>: increase your skills and equipment, and win more matches.</p>
      <p>Move to new locations and clubs. Play for famous clubs.</p>
      <h3 style={H3}>Super XP missions</h3>
      <p>Win decisive football matches by earning <B>XP POINTS</B> within the match game time.</p>
      <p><B>EARN XP POINTS ON TIME</B> = score the decisive <B>GOAL</B>. Get noticed by football scouts.</p>
    </>
  );
}

const CREAM = '#FFF8E7';
const INK = CANDY.outline;
const H3 = { margin: '12px 0 4px', fontFamily: CANDY.display, fontWeight: 400, fontSize: 18, letterSpacing: 0.4, color: CANDY.red.fill, textTransform: 'uppercase' };

export const STORY_CSS = `
  @keyframes rs-sb-pop { 0% { opacity: 0; transform: translateY(-6px) scale(.6); } 70% { opacity: 1; transform: translateY(0) scale(1.06); } 100% { transform: none; } }
  @keyframes rs-sb-bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
  @keyframes rs-sb-fade { from { opacity: 0 } to { opacity: 1 } }
  .rs-sb-hint { animation: rs-sb-pop .38s cubic-bezier(.2,.9,.3,1.3) both, rs-sb-bob 2.2s ease-in-out .5s infinite; transform-origin: 22px 0; }
  .rs-sb-big { animation: rs-sb-pop .3s cubic-bezier(.2,.9,.3,1.2) both; transform-origin: 30px 0; }
  .rs-sb-story p { margin: 0 0 8px; }
  .rs-sb-scrim { animation: rs-sb-fade .2s ease-out both; }
  .rs-sb-hint:focus-visible, .rs-sb-x:focus-visible { outline: 3px solid ${CANDY.gold}; outline-offset: 3px; }
  @media (prefers-reduced-motion: reduce) { .rs-sb-hint, .rs-sb-big, .rs-sb-scrim { animation: none !important; } }
`;

// Bubble tail: a cream square turned 45deg with the outline on its two outer edges.
const tail = (left) => ({
  position: 'absolute', top: -10, left, width: 16, height: 16, background: CREAM,
  borderTop: `3px solid ${INK}`, borderLeft: `3px solid ${INK}`, transform: 'rotate(45deg)', borderTopLeftRadius: 4,
});

export default function StoryBubble({ mode, onOpen, onClose, level = null }) {
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
      <button type="button" onClick={onOpen} className="rs-sb-hint" aria-label="My story: read your football story"
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
          maxHeight: 'calc(100dvh - 110px)', overflowY: 'auto', overscrollBehavior: 'contain',
          borderRadius: 22, background: CREAM, border: `3px solid ${INK}`,
          boxShadow: `0 6px 0 ${INK}, 0 18px 36px rgba(0,0,0,.5)`, color: INK, textAlign: 'left',
        }}>
        <span aria-hidden="true" style={tail(20)} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <div id="rs-story-title" style={{ flex: 1, margin: '2px 0 0' }}>
            <h2 style={{ margin: '0 0 4px', fontFamily: CANDY.display, textTransform: 'uppercase', fontWeight: 400, fontSize: 24, lineHeight: 1.05, color: INK, letterSpacing: 0.4 }}>Your story:</h2>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close your story" className="rs-sb-x"
            style={{ width: 44, height: 44, margin: '-8px -8px 0 0', flex: 'none', border: 'none', background: 'transparent', padding: 0, display: 'grid', placeItems: 'center', cursor: 'pointer', borderRadius: '50%' }}>
            <span style={{ width: 32, height: 32, borderRadius: '50%', display: 'grid', placeItems: 'center', color: '#fff', background: `linear-gradient(180deg, ${CANDY.red.light}, ${CANDY.red.fill})`, border: `2px solid ${INK}`, boxShadow: `0 3px 0 ${CANDY.red.dark}` }}>
              <X size={17} strokeWidth={3.25} />
            </span>
          </button>
        </div>
        <div className="rs-sb-story" style={{ position: 'relative', margin: '8px 0 14px', fontFamily: CANDY.body, fontSize: 15, lineHeight: 1.45, color: '#3B2559' }}><StoryBody level={level} /></div>
        <CandyButton color="green" onClick={onClose} style={{ width: '100%', fontSize: 22, minHeight: 52 }}>LET&apos;S GO!</CandyButton>
      </div>
    </>
  );
}
