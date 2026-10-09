'use client';

import React from 'react';
import { C, CANDY, goldRim, dotRow, goldTitle, innerGlow } from './tokens';
import { GreenBtn, CurrencyAmounts } from './RedesignShell';
import { cleanReward } from '@/lib/economy/currency.mjs';
import { XP_LEVELS } from '@/lib/data/platform';

// Celebratory stage-up modal (levels = Vuma Katongo story stages), in the
// candy look: gold-rimmed panel with marquee dots, Vuma in a gold ring.
// Driven by a `levelUp` object: { level, name, place, avatar, icon, reward: { kwacha, emeralds, rubies, diamonds } }
export default function LevelUpModal({ levelUp, onClose }) {
  if (!levelUp) return null;
  const r = cleanReward(levelUp.reward);
  const hasReward = Object.keys(r).length > 0;
  return (
    <div onClick={onClose} role="dialog" aria-modal="true" aria-label={`New stage: ${levelUp.name}`} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(8,4,20,.78)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', padding: 20, fontFamily: CANDY.body, color: '#fff' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...goldRim, boxShadow: `${goldRim.boxShadow}, 0 24px 70px rgba(0,0,0,.6)`, position: 'relative', width: 'min(380px, 100%)', boxSizing: 'border-box', padding: 9, borderRadius: 26 }}>
        <span aria-hidden style={{ ...dotRow(false), top: 0.5, left: 22, right: 22, height: 8 }} />
        <span aria-hidden style={{ ...dotRow(false), bottom: 0.5, left: 22, right: 22, height: 8 }} />
        <div style={{ borderRadius: 18, background: innerGlow, padding: '22px 18px 12px', textAlign: 'center' }}>
          <h2 style={{ ...goldTitle(30), textAlign: 'center' }}>New stage!</h2>
          {levelUp.avatar
            ? <span style={{ display: 'block', width: 112, height: 112, margin: '14px auto 10px', borderRadius: '50%', padding: 4, boxSizing: 'border-box', background: 'linear-gradient(180deg, #FFE27A, #E0A300)', boxShadow: '0 4px 0 #8a5a00, 0 10px 24px rgba(0,0,0,.45)' }}>
                <img src={levelUp.avatar} alt={`Vuma at ${levelUp.name}`} width={104} height={104} style={{ display: 'block', width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
              </span>
            : <div style={{ fontSize: 64, margin: '10px 0 2px', lineHeight: 1 }}>{levelUp.icon}</div>}
          <div style={{ fontFamily: CANDY.display, fontSize: 26, lineHeight: 1.1 }}>{levelUp.name}</div>
          {levelUp.place && <div style={{ fontSize: 13.5, marginTop: 4 }}>Vuma moves to {levelUp.place}</div>}
          <div style={{ fontSize: 12, color: C.sub, margin: '2px 0 16px' }}>Stage {levelUp.level} of {XP_LEVELS.length}</div>
          {hasReward ? (
            <div style={{ background: C.track, border: `2px solid ${CANDY.violet.dark}`, borderRadius: 14, padding: '10px 14px', marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.08em' }}>Rewards</div>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <CurrencyAmounts r={r} size={22} fontSize={18} gap={16} style={{ justifyContent: 'center' }} />
              </div>
            </div>
          ) : null}
          <GreenBtn full size={24} onClick={onClose} style={{ minHeight: 56, borderRadius: 18 }}>Continue</GreenBtn>
        </div>
      </div>
    </div>
  );
}
