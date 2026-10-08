'use client';

import React from 'react';
import { C } from './tokens';
import { GreenBtn, CurrencyAmounts } from './RedesignShell';
import { cleanReward } from '@/lib/economy/currency.mjs';
import { XP_LEVELS } from '@/lib/data/platform';

// Celebratory stage-up modal (levels = Vuma Katongo story stages). Driven by a
// `levelUp` object: { level, name, place, avatar, icon, reward: { kwacha, emeralds, rubies, diamonds } }
export default function LevelUpModal({ levelUp, onClose }) {
  if (!levelUp) return null;
  const r = cleanReward(levelUp.reward);
  const hasReward = Object.keys(r).length > 0;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(6,8,14,.78)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(380px, 100%)', textAlign: 'center', borderRadius: 18, padding: '28px 22px', background: `linear-gradient(180deg, ${C.panelHi}, ${C.panelLo})`, border: '1px solid rgba(255,255,255,.09)', boxShadow: '0 24px 70px rgba(0,0,0,.6)' }}>
        <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: '.22em', color: C.green }}>NEW STAGE!</div>
        {levelUp.avatar
          ? <img src={levelUp.avatar} alt={`Vuma at ${levelUp.name}`} width={104} height={104} style={{ display: 'block', width: 104, height: 104, margin: '12px auto 8px', borderRadius: '50%', objectFit: 'cover', border: `3px solid ${C.teal}`, boxShadow: '0 8px 24px rgba(0,0,0,.45)' }} />
          : <div style={{ fontSize: 64, margin: '10px 0 2px', lineHeight: 1 }}>{levelUp.icon}</div>}
        <div style={{ fontSize: 24, fontWeight: 900, color: C.text }}>{levelUp.name}</div>
        {levelUp.place && <div style={{ fontSize: 13, color: C.text, fontWeight: 600, marginTop: 2 }}>Vuma moves to {levelUp.place}</div>}
        <div style={{ fontSize: 12, color: C.sub, marginBottom: 18 }}>Stage {levelUp.level} of {XP_LEVELS.length}</div>
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
