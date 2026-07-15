'use client';

import React from 'react';
import { Gamepad2, Target, Trophy, Flame, Users, TrendingUp, X } from 'lucide-react';
import { C } from './tokens';
import { Progress, RewardIcon } from './RedesignShell';

/**
 * Player stats popup in the v2 design. Rendered as a fixed overlay (in the
 * shared gameOverlays), opened from the top-bar profile button. Replaces the
 * old `me.profile` tab navigation.
 */
export default function ProfileModal({ open, onClose, name = 'Player', level, nextLevel, xpPct = 0, vip, user }) {
  if (!open) return null;
  const u = user || {};
  const money = [
    { icon: <RewardIcon kind="coins" size={26} />, label: 'Kwacha', value: (u.kwacha || 0).toLocaleString(), color: C.gold },
    { icon: <RewardIcon kind="gem" size={24} />, label: 'Gems', value: (u.gems || 0).toLocaleString(), color: C.teal },
    { icon: <RewardIcon kind="diamond" size={24} />, label: 'Diamonds', value: (u.diamonds || 0).toLocaleString(), color: '#7db8ff' },
  ];
  const preds = u.predictions || [];
  const predWon = preds.filter((p) => p.status === 'won').length;
  const predLost = preds.filter((p) => p.status === 'lost').length;
  const predOpen = preds.length - predWon - predLost;
  const stats = [
    { icon: <Gamepad2 size={16} />, label: 'Games played', value: u.gamesPlayed || 0 },
    { icon: <Target size={16} />, label: 'Missions done', value: (u.missionsComplete || []).length },
    { icon: <Trophy size={16} />, label: 'Wins', value: u.wins || 0 },
    { icon: <Flame size={16} />, label: 'Day streak', value: u.streak || 0 },
    { icon: <Users size={16} />, label: 'Referrals', value: u.referrals || 0 },
    // Predictions hidden for now — restore this row to bring the stat back
    // { icon: <TrendingUp size={16} />, label: predOpen > 0 ? `Predictions · ${predOpen} open` : 'Predictions', value: preds.length === 0 ? 0 : `${predWon}W · ${predLost}L` },
  ];
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 120, display: 'grid', placeItems: 'center', padding: 16, background: 'rgba(8,10,16,.72)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', fontFamily: "var(--font-body, 'Onest', system-ui, sans-serif)", animation: 'rs-pm-fade .16s ease-out' }}>
      <style>{`
        @keyframes rs-pm-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes rs-pm-pop { from { opacity: 0; transform: translateY(10px) scale(.97) } to { opacity: 1; transform: none } }
        @media (max-width: 420px) { .rs-pm-stats { grid-template-columns: 1fr !important; } }
      `}</style>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 460, maxHeight: '92vh', overflowY: 'auto', borderRadius: 20, background: `linear-gradient(180deg, ${C.bgTop}, ${C.bg})`, border: '1px solid rgba(255,255,255,.09)', boxShadow: '0 24px 60px rgba(0,0,0,.55)', position: 'relative', animation: 'rs-pm-pop .2s cubic-bezier(.2,.8,.3,1)' }}>
        <button onClick={onClose} aria-label="Close" style={{ position: 'absolute', top: 12, right: 12, zIndex: 2, all: 'unset', cursor: 'pointer', width: 32, height: 32, borderRadius: 9, display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,.08)', color: C.sub }}><X size={18} /></button>

        <div style={{ padding: '26px 22px 18px', textAlign: 'center', borderBottom: `1px solid ${C.line}`, background: 'radial-gradient(120% 100% at 50% 0%, rgba(79,169,139,.16), transparent 70%)' }}>
          <div style={{ width: 84, height: 84, margin: '0 auto 12px', borderRadius: '50%', background: 'linear-gradient(135deg,#7fd7e8,#3a7d8c)', display: 'grid', placeItems: 'center', fontSize: 42, border: `3px solid ${C.teal}`, boxShadow: '0 8px 24px rgba(53,179,166,.3)' }}>🧑‍🦰</div>
          <div style={{ fontSize: 21, fontWeight: 800, color: C.text, marginBottom: 8, fontFamily: "var(--font-display, 'Bricolage Grotesque', sans-serif)" }}>{name}</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 800, color: C.text, background: C.panel2, padding: '4px 11px', borderRadius: 999 }}>{level?.icon} {level?.name}</span>
            {vip?.name && <span style={{ fontSize: 12, fontWeight: 800, color: '#08210f', background: C.gold, padding: '4px 11px', borderRadius: 999 }}>{vip.name} VIP</span>}
          </div>
        </div>

        <div style={{ padding: '16px 22px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: C.muted, marginBottom: 7, fontWeight: 600 }}>
            <span>Level {level?.level}</span>
            <span>{nextLevel ? `Next: ${nextLevel.name}` : 'Max level'}</span>
          </div>
          <Progress value={xpPct} color="linear-gradient(90deg,#4fa98b,#8b5cf6)" height={9} />
        </div>

        <div style={{ padding: '0 22px 16px', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
          {money.map((m) => (
            <div key={m.label} style={{ background: C.panel2, borderRadius: 12, padding: '12px 8px', textAlign: 'center' }}>
              <div style={{ color: m.color, display: 'flex', justifyContent: 'center', marginBottom: 5 }}>{m.icon}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>{m.value}</div>
              <div style={{ fontSize: 10.5, color: C.muted, fontWeight: 600 }}>{m.label}</div>
            </div>
          ))}
        </div>

        <div style={{ padding: '0 22px 22px' }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: C.sub, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 10 }}>Player stats</div>
          <div className="rs-pm-stats" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {stats.map((s) => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 10, background: C.panel2, borderRadius: 11, padding: '11px 13px' }}>
                <span style={{ width: 32, height: 32, flex: 'none', borderRadius: 9, background: C.track, display: 'grid', placeItems: 'center', color: C.green }}>{s.icon}</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: C.text, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: 10.5, color: C.muted, fontWeight: 600, marginTop: 2 }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
