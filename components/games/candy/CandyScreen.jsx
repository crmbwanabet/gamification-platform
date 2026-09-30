'use client';

import React from 'react';
import { X } from 'lucide-react';
import { CANDY, textStroke } from './tokens';
import { CANDY_BTN_CSS } from './CandyButton';

// Candy game pop-up: the same pattern as gameKit's GameShell (dimmed, blurred
// backdrop — click it to close — and a centred card with the anim-* open/close
// classes injected by GamificationPlatform), in the candy look: gold rim, a dark
// frame band with gold marquee dots (like the Spin & Win wheel), and a deep
// violet panel. Header row inside the card: `?` left, chunky gold title centred,
// red X right; the balance pill sits under the title.
// The card has a fixed height (fits 360×640 with margins, no scroll); children
// fill the column below the header. `overlay` (e.g. the tutorial) renders
// OUTSIDE the backdrop: the card keeps a transform from its open animation,
// which would otherwise trap position:fixed children, and a click inside the
// overlay would bubble to the backdrop and close the game.

const hit = { width: 48, height: 48, border: 'none', background: 'transparent', padding: 0, display: 'grid', placeItems: 'center', cursor: 'pointer', flex: 'none', WebkitTapHighlightColor: 'transparent' };
const iconFace = { width: 36, height: 36, borderRadius: '50%', display: 'grid', placeItems: 'center', color: '#fff' };
// Same red family as gameKit's closeBtn / the widget X, so "exit" always reads the same
const closeFace = { ...iconFace, background: 'linear-gradient(180deg, #f0684f, #d43a22)', border: '2px solid rgba(255,255,255,.3)', boxShadow: '0 3px 0 #8f1d0e, 0 4px 10px rgba(212,58,34,.35)' };
const helpFace = { ...iconFace, background: 'rgba(255,255,255,.12)', border: '2px solid rgba(255,210,31,.55)', fontFamily: CANDY.display, fontSize: 20, color: CANDY.gold };

// Title: gold fill, round dark-purple outline, then a solid stacked drop for
// chunky 3D depth — all text-shadow, no text-stroke.
const DEPTH = '#16042F';
const TITLE_SHADOW = [
  textStroke(3, CANDY.outline),
  ...[2, 4].flatMap(d => [`-3px ${3 + d}px 0 ${DEPTH}`, `0 ${3 + d}px 0 ${DEPTH}`, `3px ${3 + d}px 0 ${DEPTH}`]),
  '0 8px 10px rgba(0,0,0,.4)',
].join(', ');

const FRAME = 9; // dark band between the gold rim and the violet panel
const dotRow = (vertical) => ({
  position: 'absolute', pointerEvents: 'none',
  backgroundImage: `radial-gradient(circle, #FFE27A 0 1.6px, rgba(255,210,31,.35) 2.2px, transparent 3px)`,
  backgroundSize: vertical ? '8px 16px' : '16px 8px',
  backgroundRepeat: vertical ? 'repeat-y' : 'repeat-x',
  backgroundPosition: 'center',
});

function MarqueeDots() {
  const edge = (FRAME - 8) / 2;
  return (
    <>
      <span aria-hidden style={{ ...dotRow(false), top: edge, left: 22, right: 22, height: 8 }} />
      <span aria-hidden style={{ ...dotRow(false), bottom: edge, left: 22, right: 22, height: 8 }} />
      <span aria-hidden style={{ ...dotRow(true), left: edge, top: 22, bottom: 22, width: 8 }} />
      <span aria-hidden style={{ ...dotRow(true), right: edge, top: 22, bottom: 22, width: 8 }} />
    </>
  );
}

export default function CandyScreen({ title, balance, onClose, onHelp, closing, overlay, children }) {
  return (
    <>
      <div onClick={onClose} className={closing ? 'anim-backdrop-close' : 'anim-fade-in'}
        style={{
          position: 'fixed', inset: 0, zIndex: 70, display: 'grid', placeItems: 'center', padding: '14px 16px',
          background: 'rgba(8,10,16,.74)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
          color: CANDY.text, fontFamily: CANDY.body,
        }}>
        <style>{CANDY_BTN_CSS}</style>
        <div onClick={(e) => e.stopPropagation()} className={closing ? 'anim-modal-close' : 'anim-scale-in'}
          style={{
            position: 'relative', width: '100%', maxWidth: 400, height: 'min(600px, calc(100dvh - 40px))',
            boxSizing: 'border-box', padding: FRAME, borderRadius: 26,
            background: 'linear-gradient(180deg, #24094A, #140430)',
            border: `2.5px solid ${CANDY.gold}`,
            boxShadow: `0 0 0 1.5px ${CANDY.goldDeep}, 0 0 22px rgba(255,210,31,.28), 0 24px 60px rgba(0,0,0,.6)`,
          }}>
          <MarqueeDots />
          <div style={{
            height: '100%', boxSizing: 'border-box', overflow: 'hidden', borderRadius: 18,
            display: 'flex', flexDirection: 'column', padding: '4px 10px 10px',
            background: `radial-gradient(ellipse 110% 70% at 50% 42%, ${CANDY.glow} 0%, ${CANDY.bgTop} 50%, ${CANDY.bgBottom} 100%)`,
            boxShadow: `inset 0 0 0 1.5px rgba(255,210,31,.55), inset 0 0 18px rgba(0,0,0,.45)`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', flex: 'none' }}>
              {onHelp
                ? <button type="button" onClick={onHelp} title="How to play" aria-label="How to play" style={hit}><span style={helpFace}>?</span></button>
                : <span style={{ width: 48, flex: 'none' }} />}
              <h2 style={{ flex: 1, minWidth: 0, margin: '0 0 4px', textAlign: 'center', fontFamily: CANDY.display, fontWeight: 400, fontSize: 38, lineHeight: 1, color: CANDY.gold, letterSpacing: 1, whiteSpace: 'nowrap', textShadow: TITLE_SHADOW }}>
                {title}
              </h2>
              <button type="button" onClick={onClose} title="Close" aria-label="Close" style={hit}><span style={closeFace}><X size={20} strokeWidth={3.25} /></span></button>
            </div>
            <div aria-label={`Balance ${balance} coins`}
              style={{ alignSelf: 'center', flex: 'none', display: 'flex', alignItems: 'center', gap: 5, height: 26, margin: '2px 0 0', padding: '0 12px 0 4px', borderRadius: 999, background: 'rgba(16,3,38,.62)', border: `2px solid ${CANDY.gold}`, boxShadow: 'inset 0 0 8px rgba(255,210,31,.18)' }}>
              <img src="/ui/reward/coins.png" alt="" width={18} height={18} style={{ display: 'block' }} />
              <span style={{ fontFamily: CANDY.display, fontSize: 16, color: '#fff', letterSpacing: .5, fontVariantNumeric: 'tabular-nums', textShadow: '0 1.5px 0 rgba(0,0,0,.4)' }}>{Number(balance || 0).toLocaleString()}</span>
            </div>
            <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              {children}
            </div>
          </div>
        </div>
      </div>
      {overlay}
    </>
  );
}
