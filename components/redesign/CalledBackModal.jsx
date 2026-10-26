'use client';

import React from 'react';
import { RoundAvatar } from './AvatarPicture';
import { C, CANDY, goldRim, dotRow, goldTitle, innerGlow } from './tokens';
import { GreenBtn } from './RedesignShell';

// "Called back to the village" (owner 2026-10-24, lib/xp/levelReset.mjs):
// shown ONCE to every player who had left the village when all players went
// back to level 1. Styled as an incoming call from Ambuya, in the level-up
// modal's candy look. Copy = the owner's message (grandmother = "Ambuya").
export const CALLED_BACK_LINES = [
  'You have received a call from your Ambuya. Your family calls you back to the village.',
  'Your father is sick and the fields must be planted.',
  'You pack your boots and take the bus back to the village.',
  'Family always comes first.',
  'Football will wait, but not for long.',
  'The village has its own league and challenges, and every match you win there is a step back towards the city. You keep all your XP and coins.',
];

function PhoneIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25c1.1.37 2.3.57 3.6.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.3.2 2.5.57 3.6a1 1 0 0 1-.25 1z" />
    </svg>
  );
}

export default function CalledBackModal({ open, onClose, avatar, hero = 'Player' }) {
  if (!open) return null;
  return (
    <div role="dialog" aria-modal="true" aria-label="Incoming call from Ambuya" style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(8,4,20,.82)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', padding: 20, fontFamily: CANDY.body, color: '#fff', overflowY: 'auto' }}>
      <div style={{ ...goldRim, boxShadow: `${goldRim.boxShadow}, 0 24px 70px rgba(0,0,0,.6)`, position: 'relative', width: 'min(400px, 100%)', boxSizing: 'border-box', padding: 9, borderRadius: 26 }}>
        <span aria-hidden style={{ ...dotRow(false), top: 0.5, left: 22, right: 22, height: 8 }} />
        <span aria-hidden style={{ ...dotRow(false), bottom: 0.5, left: 22, right: 22, height: 8 }} />
        <div style={{ borderRadius: 18, background: innerGlow, padding: '20px 18px 12px', textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 14px', borderRadius: 999, background: C.green, color: '#fff', fontWeight: 900, fontSize: 13, letterSpacing: '.08em', textTransform: 'uppercase', boxShadow: '0 3px 0 rgba(0,0,0,.35)' }}>
            <span className="cb-ring" style={{ display: 'inline-flex' }}><PhoneIcon size={16} /></span> Incoming call
          </div>
          <h2 style={{ ...goldTitle(30), textAlign: 'center', margin: '12px 0 0' }}>Ambuya</h2>
          {avatar && (
            <span style={{ display: 'block', width: 96, height: 96, margin: '12px auto 14px', borderRadius: '50%', padding: 4, boxSizing: 'border-box', background: 'linear-gradient(180deg, #FFE27A, #E0A300)', boxShadow: '0 4px 0 #8a5a00, 0 10px 24px rgba(0,0,0,.45)' }}>
              <RoundAvatar stage={1} avatar={avatar} alt={`${hero} in the village`} size={88} />
            </span>
          )}
          <div data-called-back style={{ textAlign: 'left', fontSize: 14.5, lineHeight: 1.45, background: C.track, border: `2px solid ${CANDY.violet.dark}`, borderRadius: 14, padding: '12px 14px', marginBottom: 16 }}>
            {CALLED_BACK_LINES.map((l, i) => (
              <p key={i} style={{ margin: i ? '8px 0 0' : 0, fontWeight: l === 'Family always comes first.' ? 900 : 600, color: l === 'Family always comes first.' ? CANDY.gold : '#fff' }}>{l}</p>
            ))}
          </div>
          <GreenBtn full size={22} onClick={onClose} style={{ minHeight: 56, borderRadius: 18 }}>Back to the village</GreenBtn>
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: `@keyframes cbRing{0%,60%,100%{transform:rotate(0)}10%,30%,50%{transform:rotate(-14deg)}20%,40%{transform:rotate(14deg)}}.cb-ring{animation:cbRing 1.6s ease-in-out infinite}@media (prefers-reduced-motion: reduce){.cb-ring{animation:none}}` }} />
    </div>
  );
}
