'use client';

import React from 'react';
import { X } from 'lucide-react';
import { CANDY, textStroke } from './tokens';
import { CANDY_BTN_CSS } from './CandyButton';

// Full-bleed candy game screen: violet radial background, header with the coin
// balance (left) plus help `?` and the standard red X (right), gold outlined
// title, then the game column filling the rest — sized for 360×640, no scroll.
// Reuses the anim-* keyframes injected by GamificationPlatform. Header buttons
// are 56px hit areas around a ~42px visual (tap targets stay >= 56px).

const hit = { width: 56, height: 56, border: 'none', background: 'transparent', padding: 0, display: 'grid', placeItems: 'center', cursor: 'pointer', flex: 'none', WebkitTapHighlightColor: 'transparent' };
const iconFace = { width: 42, height: 42, borderRadius: 12, display: 'grid', placeItems: 'center', color: '#fff' };
// Same red family as gameKit's closeBtn / the widget X, so "exit" always reads the same
const closeFace = { ...iconFace, background: 'linear-gradient(180deg, #f0684f, #d43a22)', border: '1px solid rgba(255,255,255,.25)', boxShadow: '0 3px 10px rgba(212,58,34,.35)' };
const helpFace = { ...iconFace, background: 'rgba(255,255,255,.12)', border: '2px solid rgba(255,255,255,.22)', fontFamily: CANDY.display, fontSize: 24 };

// Title: gold fill, thick round dark-purple outline, then a solid stacked
// drop (deeper purple) for chunky 3D depth — all text-shadow, no text-stroke.
const DEPTH = '#16042F';
const TITLE_SHADOW = [
  textStroke(4.5, CANDY.outline),
  ...[2, 4, 6, 8].flatMap(d => [`-4px ${4 + d}px 0 ${DEPTH}`, `0 ${4.5 + d}px 0 ${DEPTH}`, `4px ${4 + d}px 0 ${DEPTH}`]),
  '0 14px 14px rgba(0,0,0,.45)',
].join(', ');

export default function CandyScreen({ title, balance, onClose, onHelp, closing, children }) {
  return (
    <div className={closing ? 'anim-backdrop-close' : 'anim-fade-in'}
      style={{
        position: 'fixed', inset: 0, zIndex: 70, height: '100dvh', overflow: 'hidden',
        background: `radial-gradient(ellipse 90% 60% at 50% 32%, ${CANDY.glow} 0%, ${CANDY.bgTop} 45%, ${CANDY.bgBottom} 100%)`,
        color: CANDY.text, fontFamily: CANDY.body,
        paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)',
        paddingLeft: 'env(safe-area-inset-left)', paddingRight: 'env(safe-area-inset-right)',
      }}>
      <style>{CANDY_BTN_CSS}</style>
      <div style={{ height: '100%', maxWidth: 460, margin: '0 auto', display: 'flex', flexDirection: 'column', padding: '4px 14px 12px', boxSizing: 'border-box' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 'none' }}>
          <div aria-label={`Balance ${balance} coins`}
            style={{ display: 'flex', alignItems: 'center', gap: 6, height: 40, padding: '0 16px 0 5px', borderRadius: 999, background: 'rgba(16,3,38,.62)', border: `2.5px solid ${CANDY.gold}`, boxShadow: '0 3px 0 rgba(0,0,0,.3), inset 0 0 10px rgba(255,210,31,.18)' }}>
            <img src="/ui/reward/coins.png" alt="" width={26} height={26} style={{ display: 'block' }} />
            <span style={{ fontFamily: CANDY.display, fontSize: 21, color: '#fff', letterSpacing: .5, fontVariantNumeric: 'tabular-nums', textShadow: '0 2px 0 rgba(0,0,0,.4)' }}>{Number(balance || 0).toLocaleString()}</span>
          </div>
          <span style={{ flex: 1 }} />
          {onHelp && <button type="button" onClick={onHelp} title="How to play" aria-label="How to play" style={hit}><span style={helpFace}>?</span></button>}
          <button type="button" onClick={onClose} title="Close" aria-label="Close" style={hit}><span style={closeFace}><X size={22} strokeWidth={3} /></span></button>
        </div>
        <h2 style={{ margin: '-2px 0 12px', flex: 'none', textAlign: 'center', fontFamily: CANDY.display, fontWeight: 400, fontSize: 'min(19vw, 78px)', lineHeight: 1, color: CANDY.gold, letterSpacing: 1.5, whiteSpace: 'nowrap', textShadow: TITLE_SHADOW }}>
          {title}
        </h2>
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
