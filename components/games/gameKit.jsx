'use client';

import React from 'react';
import { HelpCircle, X } from 'lucide-react';
import { C } from '@/components/redesign/tokens';

// Shared v2 look for all game modals: slate glass card, sea-green primary,
// gold accents. Reuses the anim-* keyframes injected by GamificationPlatform.

const iconBtn = { border: 'none', background: 'rgba(255,255,255,.08)', color: C.sub, cursor: 'pointer', width: 34, height: 34, borderRadius: 10, display: 'grid', placeItems: 'center', flex: 'none' };
// Red close — same family as the widget-mode red X so "exit" always reads the same
const closeBtn = { ...iconBtn, background: 'linear-gradient(180deg, #f0684f, #d43a22)', color: '#fff', border: '1px solid rgba(255,255,255,.25)', boxShadow: '0 3px 10px rgba(212,58,34,.35)' };

export function GameShell({ title, onClose, closing, onHelp, children, maxWidth = 440 }) {
  return (
    <div onClick={onClose} className={closing ? 'anim-backdrop-close' : 'anim-fade-in'}
      style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'grid', placeItems: 'center', padding: 16, background: 'rgba(8,10,16,.74)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', fontFamily: "var(--font-body, 'Onest', system-ui, sans-serif)" }}>
      <div onClick={(e) => e.stopPropagation()} className={closing ? 'anim-modal-close' : 'anim-scale-in'}
        style={{ width: '100%', maxWidth, maxHeight: '92vh', overflowY: 'auto', borderRadius: 20, background: `linear-gradient(180deg, ${C.panelHi}, ${C.panelLo})`, border: '1px solid rgba(255,255,255,.09)', boxShadow: '0 24px 60px rgba(0,0,0,.55)', color: C.text, position: 'relative', padding: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, gap: 8 }}>
          {onHelp ? <button type="button" onClick={onHelp} title="How to play" style={iconBtn}><HelpCircle size={18} /></button> : <span style={{ width: 34 }} />}
          <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: C.text, fontFamily: "var(--font-display, 'Bricolage Grotesque', sans-serif)", textAlign: 'center', flex: 1 }}>{title}</h2>
          <button type="button" onClick={onClose} title="Close" style={closeBtn}><X size={18} strokeWidth={2.75} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function GameBtn({ children, onClick, disabled, variant = 'primary', full = true, style }) {
  const bg = disabled ? C.track : variant === 'primary' ? 'linear-gradient(180deg,#57b795,#3f9a7b)' : variant === 'danger' ? 'linear-gradient(180deg,#e5735f,#cf4a34)' : C.panel2;
  const color = disabled ? C.muted : variant === 'primary' ? '#08210f' : variant === 'danger' ? '#fff' : C.text;
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      style={{ width: full ? '100%' : 'auto', border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', padding: '13px 22px', borderRadius: 12, fontSize: 15, fontWeight: 800, background: bg, color, boxShadow: (!disabled && variant === 'primary') ? '0 6px 18px rgba(79,169,139,.4)' : 'none', transition: 'transform .12s, filter .15s', ...style }}
      onMouseDown={(e) => { if (!disabled) e.currentTarget.style.transform = 'scale(.97)'; }}
      onMouseUp={(e) => { e.currentTarget.style.transform = ''; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = ''; }}>
      {children}
    </button>
  );
}

export function OptionBtn({ children, onClick, disabled, selected, style }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      style={{ border: selected ? `2px solid ${C.green}` : '1px solid rgba(255,255,255,.08)', background: selected ? 'rgba(79,169,139,.18)' : C.track, color: C.text, cursor: disabled ? 'default' : 'pointer', borderRadius: 11, padding: '11px 8px', fontSize: 15, fontWeight: 800, transition: 'transform .12s, background .15s, border-color .15s', transform: selected ? 'scale(1.05)' : 'none', ...style }}>
      {children}
    </button>
  );
}

// Standard result screen: big emoji, headline, optional detail, primary "again".
export function GameResult({ emoji, emojiWon, headline, headlineColor, detail, onAgain, againLabel = 'Play Again' }) {
  return (
    <div style={{ textAlign: 'center' }} className="anim-scale-in">
      <div style={{ fontSize: 60, marginBottom: 12, animation: emojiWon ? 'symbolPop 0.5s ease both, float 2s ease-in-out 0.5s infinite' : 'symbolPop 0.4s ease both' }}>{emoji}</div>
      {detail}
      <p style={{ fontSize: 22, fontWeight: 800, margin: '4px 0 20px', color: headlineColor || C.text }}>{headline}</p>
      <GameBtn onClick={onAgain} full={false} style={{ padding: '12px 30px' }}>{againLabel}</GameBtn>
    </div>
  );
}

export const C_ = C;
