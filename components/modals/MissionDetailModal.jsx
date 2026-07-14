'use client';

import React from 'react';
import { X, ChevronRight, Check } from 'lucide-react';
import { C } from '../redesign/tokens';
import { Badge, Progress, RewardIcon, GreenBtn } from '../redesign/RedesignShell';
import { IMAGES } from '../../lib/data/images';

const DIFF = { easy: { label: 'Easy', c: C.green }, medium: { label: 'Medium', c: C.gold }, hard: { label: 'Hard', c: C.red } };

export default function MissionDetailModal({ mission, progress, done, onClose, onNavigate, onPlayGame, closing }) {
  const d = DIFF[mission.difficulty] || DIFF.easy;
  const pct = done ? 100 : Math.min(100, Math.round(((progress || 0) / mission.target) * 100));

  const handleCta = () => {
    if (mission.gameId && onPlayGame) {
      onPlayGame(mission.gameId);
    } else if (mission.cta && onNavigate) {
      onNavigate(mission.cta);
    }
    onClose();
  };

  return (
    <div
      className={`fixed inset-0 z-[80] ${closing ? 'anim-backdrop-close' : 'anim-fade-in'}`}
      style={{ background: 'rgba(10,11,18,.78)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(3px)' }}
      onClick={onClose}
    >
      <div
        className={closing ? 'anim-modal-close' : 'anim-scale-in'}
        style={{
          width: '100%', maxWidth: 400, maxHeight: '90vh', overflowY: 'auto',
          background: `linear-gradient(180deg, ${C.panelHi}, ${C.panelLo})`,
          borderRadius: 18, border: '1px solid rgba(255,255,255,0.09)',
          boxShadow: '0 24px 60px rgba(0,0,0,.55), inset 0 1px 0 rgba(255,255,255,.07)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header image */}
        <div style={{ position: 'relative', height: 150, overflow: 'hidden', borderRadius: '18px 18px 0 0' }}>
          <img src={IMAGES[mission.image]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(180deg, rgba(0,0,0,.1), transparent 40%, ${C.panelHi})` }} />

          <span style={{ position: 'absolute', top: 12, left: 12, display: 'inline-flex', gap: 6 }}>
            <Badge bg={done ? C.green : d.c}>{done ? 'Done' : d.label}</Badge>
            {mission.hot && !done && <Badge bg={C.red} color="#fff">🔥 Hot</Badge>}
          </span>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              position: 'absolute', top: 10, right: 10, width: 32, height: 32, borderRadius: 999,
              border: '1px solid rgba(255,255,255,.14)', background: 'rgba(12,13,20,.62)',
              color: C.text, display: 'grid', placeItems: 'center', cursor: 'pointer',
            }}
          >
            <X size={16} />
          </button>

          {done && (
            <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(10,12,18,.45)' }}>
              <div className="anim-check-pop" style={{ width: 64, height: 64, borderRadius: 999, background: C.green, display: 'grid', placeItems: 'center', boxShadow: '0 0 30px rgba(79,169,139,.6)' }}>
                <Check size={34} color="#08210f" strokeWidth={3} />
              </div>
            </div>
          )}
        </div>

        <div style={{ padding: '16px 18px 18px' }}>
          {/* Title */}
          <h2 style={{ margin: '0 0 3px', fontSize: 20, fontWeight: 800, color: C.text, letterSpacing: '-.01em' }}>{mission.name}</h2>
          <p style={{ margin: '0 0 14px', fontSize: 13.5, color: C.sub }}>{mission.desc}</p>

          {/* Progress */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '.05em' }}>Progress</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: done ? C.green : C.teal, fontVariantNumeric: 'tabular-nums' }}>
                {done ? 'Complete!' : `${Math.min(progress || 0, mission.target)} / ${mission.target}`}
              </span>
            </div>
            <Progress value={pct} color={done ? C.green : C.teal} />
          </div>

          {/* Rewards */}
          <div style={{ background: C.track, borderRadius: 12, padding: '11px 14px', marginBottom: 12, border: '1px solid rgba(255,255,255,.05)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 8 }}>Rewards</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
              {mission.reward.kwacha ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 16, fontWeight: 800, color: C.gold }}>
                  <RewardIcon kind="coins" size={19} />{mission.reward.kwacha}
                </span>
              ) : null}
              {mission.reward.gems ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 16, fontWeight: 800, color: C.teal }}>
                  <RewardIcon kind="gem" size={17} />{mission.reward.gems}
                </span>
              ) : null}
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 16, fontWeight: 800, color: '#b9a5e8' }}>
                ⚡ {mission.xp} <span style={{ fontSize: 11.5, fontWeight: 700, color: C.muted }}>XP</span>
              </span>
            </div>
          </div>

          {/* Tips */}
          {mission.tips?.length > 0 && (
            <div style={{ background: C.track, borderRadius: 12, padding: '11px 14px', marginBottom: 12, border: '1px solid rgba(255,255,255,.05)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 7 }}>💡 Tips</div>
              <div style={{ display: 'grid', gap: 5 }}>
                {mission.tips.map((tip, i) => (
                  <div key={i} style={{ fontSize: 12.5, color: C.sub, display: 'flex', gap: 7 }}>
                    <span style={{ color: C.green }}>•</span>
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          {!done && (mission.gameId || mission.cta) && (
            <GreenBtn full onClick={handleCta}>
              {mission.gameId ? `Play Now` : (mission.ctaLabel || 'Go')} <ChevronRight size={16} />
            </GreenBtn>
          )}
          {done && (
            <div style={{ textAlign: 'center', padding: '8px 0 2px', color: C.green, fontWeight: 800, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <Check size={16} /> Mission Complete
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
