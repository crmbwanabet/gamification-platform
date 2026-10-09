'use client';

import React from 'react';
import { Gamepad2, Target, Trophy, Flame, Users } from 'lucide-react';
import { C, CANDY, goldRim, dotRow, goldTitle } from './tokens';
import { Progress, RewardIcon, CURRENCY_COLOR, CloseX } from './RedesignShell';
import { formatNumber } from '@/lib/economy/currency.mjs';
import { XP_LEVELS } from '@/lib/data/platform';
import { textStroke } from '../games/candy/tokens';

const tile = { background: `linear-gradient(180deg, ${C.panelHi}, ${C.panelLo})`, border: `2px solid ${CANDY.violet.dark}`, borderRadius: 14 };

/**
 * Player stats popup in the candy look: gold-rimmed frame with marquee dots,
 * Vuma's current stage scene on top, then the stage bar, balances and stats.
 * Rendered as a fixed overlay (in the shared gameOverlays), opened from the
 * header's Vuma button.
 */
export default function ProfileModal({ open, onClose, level, nextLevel, xpPct = 0, vip, user }) {
  if (!open) return null;
  const u = user || {};
  const money = [
    { icon: <RewardIcon kind="coins" size={26} />, label: 'Coins', value: formatNumber(u.kwacha || 0), color: C.gold },
    { icon: <RewardIcon kind="emeralds" size={24} />, label: 'Emeralds', value: formatNumber(u.emeralds || 0), color: CURRENCY_COLOR.emeralds },
    { icon: <RewardIcon kind="rubies" size={24} />, label: 'Rubies', value: formatNumber(u.rubies || 0), color: CURRENCY_COLOR.rubies },
    { icon: <RewardIcon kind="diamonds" size={24} />, label: 'Diamonds', value: formatNumber(u.diamonds || 0), color: CURRENCY_COLOR.diamonds },
  ];
  const stats = [
    { icon: <Gamepad2 size={16} />, label: 'Games played', value: u.gamesPlayed || 0 },
    { icon: <Target size={16} />, label: 'Missions done', value: (u.missionsComplete || []).length },
    { icon: <Trophy size={16} />, label: 'Wins', value: u.wins || 0 },
    { icon: <Flame size={16} />, label: 'Day streak', value: u.streak || 0 },
    { icon: <Users size={16} />, label: 'Referrals', value: u.referrals || 0 },
    // Predictions stat row parked with the predictions feature — see git history
  ];
  return (
    <div onClick={onClose} role="dialog" aria-modal="true" aria-label="Your profile" className="rs-pm-backdrop" style={{ position: 'fixed', inset: 0, zIndex: 120, display: 'grid', placeItems: 'center', padding: 16, background: 'rgba(8,4,20,.74)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', fontFamily: CANDY.body, color: '#fff', animation: 'rs-pm-fade .16s ease-out' }}>
      <style>{`
        @keyframes rs-pm-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes rs-pm-pop { from { opacity: 0; transform: translateY(10px) scale(.97) } to { opacity: 1; transform: none } }
        @media (max-width: 420px) { .rs-pm-stats { grid-template-columns: 1fr !important; } }
        /* phones: keep the card clear of the widget's fixed red X (top-right) */
        @media (max-width: 600px) { .rs-pm-backdrop { padding-top: 64px !important; } .rs-pm-card { max-height: calc(100dvh - 80px) !important; } }
        @media (prefers-reduced-motion: reduce) { .rs-pm-card { animation: none !important; } }
      `}</style>
      <div onClick={(e) => e.stopPropagation()} className="rs-pm-card" style={{ ...goldRim, boxShadow: `${goldRim.boxShadow}, 0 24px 60px rgba(0,0,0,.6)`, position: 'relative', width: '100%', maxWidth: 460, maxHeight: '92vh', boxSizing: 'border-box', padding: 9, borderRadius: 26, display: 'flex', animation: 'rs-pm-pop .2s cubic-bezier(.2,.8,.3,1)' }}>
        <span aria-hidden style={{ ...dotRow(false), top: 0.5, left: 22, right: 22, height: 8 }} />
        <span aria-hidden style={{ ...dotRow(false), bottom: 0.5, left: 22, right: 22, height: 8 }} />
        <div style={{ position: 'relative', flex: 1, minHeight: 0, overflowY: 'auto', borderRadius: 18, background: `radial-gradient(110% 60% at 50% 30%, ${CANDY.glow}, ${CANDY.bgTop} 60%, ${CANDY.bgBottom})`, boxShadow: 'inset 0 0 0 1.5px rgba(255,210,31,.55)' }}>
          <CloseX onClick={onClose} style={{ position: 'absolute', top: 6, right: 6, zIndex: 2 }} />

          {/* Top: the current Vuma stage's full scene, name + chips on a bottom fade. */}
          <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '18px 18px 0 0' }}>
            {level?.hero
              ? <img src={level.hero} alt={`Vuma at stage ${level.level}: ${level.name}`} width={600} height={540} style={{ width: '100%', aspectRatio: '10 / 9', height: 'auto', objectFit: 'cover', display: 'block' }} />
              : <div style={{ width: '100%', aspectRatio: '10 / 9' }} />}
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '60px 18px 12px', textAlign: 'center', background: `linear-gradient(180deg, rgba(43,15,94,0) 0%, rgba(43,15,94,.8) 55%, ${CANDY.bgTop} 100%)` }}>
              <div style={{ fontFamily: CANDY.display, fontSize: 28, lineHeight: 1.05, color: '#fff', marginBottom: 8, textShadow: `${textStroke(2.5, CANDY.outline)}, 0 4px 0 ${CANDY.outline}` }}>Vuma Katongo</div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, fontWeight: 900, color: CANDY.outline, background: CANDY.gold, padding: '3px 11px', borderRadius: 999 }}>STAGE {level?.level}</span>
                <span style={{ fontSize: 12, fontWeight: 900, color: '#fff', background: 'rgba(20,4,48,.8)', border: `1.5px solid ${CANDY.violet.fill}`, padding: '2px 11px', borderRadius: 999 }}>{level?.name}</span>
                {vip?.name && <span style={{ fontSize: 12, fontWeight: 900, color: CANDY.outline, background: CANDY.gold, padding: '3px 11px', borderRadius: 999 }}>{vip.name} VIP</span>}
              </div>
            </div>
          </div>

          <div style={{ padding: '14px 18px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: C.sub, marginBottom: 7 }}>
              <span>Stage {level?.level} of {XP_LEVELS.length}</span>
              <span>{nextLevel ? `Next: ${nextLevel.name}` : 'Final stage'}</span>
            </div>
            <Progress value={xpPct} height={14} />
          </div>

          <div style={{ padding: '0 18px 16px', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
            {money.map((m) => (
              <div key={m.label} style={{ ...tile, padding: '10px 4px', textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 5 }}>{m.icon}</div>
                <div style={{ fontFamily: CANDY.display, fontSize: 18, color: m.color }}>{m.value}</div>
                <div style={{ fontSize: 10.5, color: C.muted }}>{m.label}</div>
              </div>
            ))}
          </div>

          <div style={{ padding: '0 18px 20px' }}>
            <h3 style={{ ...goldTitle(20), marginBottom: 12 }}>Player stats</h3>
            <div className="rs-pm-stats" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {stats.map((s) => (
                <div key={s.label} style={{ ...tile, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px' }}>
                  <span style={{ width: 32, height: 32, flex: 'none', borderRadius: 10, background: C.track, display: 'grid', placeItems: 'center', color: CANDY.gold }}>{s.icon}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: CANDY.display, fontSize: 18, color: C.text, lineHeight: 1 }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
