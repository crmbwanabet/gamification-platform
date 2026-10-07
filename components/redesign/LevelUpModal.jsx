'use client';

import React from 'react';
import { C } from './tokens';
import { GreenBtn, CurrencyAmounts } from './RedesignShell';
import { cleanReward } from '@/lib/economy/currency.mjs';

// Celebratory level-up modal. Driven by a `levelUp` object:
//   { level, name, icon, reward: { kwacha, emeralds, rubies, diamonds } }
export default function LevelUpModal({ levelUp, onClose }) {
  if (!levelUp) return null;
  const r = cleanReward(levelUp.reward);
  const hasReward = Object.keys(r).length > 0;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(6,8,14,.78)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(380px, 100%)', textAlign: 'center', borderRadius: 18, padding: '28px 22px', background: `linear-gradient(180deg, ${C.panelHi}, ${C.panelLo})`, border: '1px solid rgba(255,255,255,.09)', boxShadow: '0 24px 70px rgba(0,0,0,.6)' }}>
        <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: '.22em', color: C.green }}>LEVEL UP!</div>
        <div style={{ fontSize: 64, margin: '10px 0 2px', lineHeight: 1 }}>{levelUp.icon}</div>
        <div style={{ fontSize: 24, fontWeight: 900, color: C.text }}>{levelUp.name}</div>
        <div style={{ fontSize: 12, color: C.sub, marginBottom: 18 }}>You reached level {levelUp.level}</div>
        {hasReward ? (
          <div style={{ background: C.track, borderRadius: 12, padding: '12px 14px', marginBottom: 18 }}>
            <div style={{ fontSize: 10.5, color: C.muted, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.08em' }}>Rewards</div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <CurrencyAmounts r={r} size={19} fontSize={16} gap={16} style={{ justifyContent: 'center' }} />
            </div>
          </div>
        ) : null}
        <GreenBtn full onClick={onClose}>Continue</GreenBtn>
      </div>
    </div>
  );
}
