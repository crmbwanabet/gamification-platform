'use client';

import React from 'react';
import { X, ChevronRight } from 'lucide-react';
import { DIFFICULTY_CONFIG } from '../../lib/data/missions';
import { IMAGES } from '../../lib/data/images';

const IMG_BASE = 'https://raw.githubusercontent.com/aichatbotbwanabet/gamification-platform/main/public/images';

export default function MissionDetailModal({ mission, progress, done, onClose, onNavigate, closing }) {
  const diff = DIFFICULTY_CONFIG[mission.difficulty];

  return (
    <div className={`fixed inset-0 bg-black/90 flex items-center justify-center z-[80] p-4 ${closing ? 'anim-backdrop-close' : 'anim-fade-in'}`} onClick={onClose}>
      <div className={`bg-gradient-to-b from-[#0a1520] to-[#030810] rounded-3xl max-w-md w-full overflow-hidden border-0 shadow-2xl shadow-cyan-900/50 max-h-[90vh] overflow-y-auto ${closing ? 'anim-modal-close' : 'anim-scale-in'}`} onClick={(e) => e.stopPropagation()}>
        {/* Header Image */}
        <div className="relative h-44 overflow-hidden">
          <img src={IMAGES[mission.image]} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a1520] via-transparent to-transparent" />

          {/* Difficulty ribbon - top right corner */}
          <div className={`absolute top-0 right-6 ${diff.color} px-3 py-1.5 rounded-b-lg font-bold text-sm shadow-lg`}>
            {diff.label}
          </div>

          {/* HOT badge */}
          {mission.hot && !done && (
            <span className="absolute top-3 left-3 px-2 py-1 bg-red-500 rounded-lg text-sm font-bold shadow-lg">
              🔥 HOT
            </span>
          )}

          {/* Done overlay */}
          {done && (
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <img src={`${IMG_BASE}/green_bubble.jpg`} alt="" className="w-28 h-28 object-cover rounded-full anim-check-pop" style={{ mixBlendMode: "screen" }} />
            </div>
          )}

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 p-2 bg-black/50 hover:bg-black/70 rounded-full z-10 transition-all hover:rotate-90 duration-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {/* Title & Description */}
          <h2 className="text-2xl font-bold mb-1">{mission.name}</h2>
          <p className="text-gray-400 mb-4">{mission.desc}</p>

          {/* Progress */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-400">Progress</span>
              <span className={`text-sm font-bold ${done ? 'text-green-400' : 'text-cyan-300'}`}>
                {done ? '✅ Complete!' : `${Math.min(progress, mission.target)} / ${mission.target}`}
              </span>
            </div>
            <div className="h-3 bg-black/50 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${done ? 'bg-green-500' : 'bg-gradient-to-r from-cyan-400 to-blue-500'}`}
                style={{ width: `${Math.min(100, (progress / mission.target) * 100)}%` }}
              />
            </div>
          </div>

          {/* Rewards */}
          <div className="bg-black/60 rounded-xl p-4 border border-white/10 mb-4">
            <div className="text-sm text-gray-400 mb-2 font-semibold">Rewards</div>
            <div className="flex items-center gap-4 flex-wrap">
              {mission.reward.kwacha && (
                <div className="flex items-center gap-1.5">
                  <span className="text-lg">🪙</span>
                  <span className="text-yellow-400 font-bold text-lg">{mission.reward.kwacha}</span>
                  <span className="text-gray-500 text-sm">Coins</span>
                </div>
              )}
              {mission.reward.gems && (
                <div className="flex items-center gap-1.5">
                  <span className="text-lg">💚</span>
                  <span className="text-green-400 font-bold text-lg">{mission.reward.gems}</span>
                  <span className="text-gray-500 text-sm">Gems</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <span className="text-lg">⚡</span>
                <span className="text-cyan-400 font-bold text-lg">{mission.xp}</span>
                <span className="text-gray-500 text-sm">XP</span>
              </div>
            </div>
          </div>

          {/* Tips */}
          {mission.tips && mission.tips.length > 0 && (
            <div className="bg-black/60 rounded-xl p-4 border border-white/10 mb-4">
              <div className="text-sm text-gray-400 mb-2 font-semibold">💡 Tips</div>
              <div className="space-y-1.5">
                {mission.tips.map((tip, i) => (
                  <div key={i} className="text-sm text-gray-300 flex items-start gap-2">
                    <span className="text-cyan-400 mt-0.5">•</span>
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CTA Button */}
          {!done && mission.cta && (
            <button
              type="button"
              onClick={() => { onNavigate(mission.cta); onClose(); }}
              className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 rounded-xl font-bold text-lg transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-cyan-500/30 flex items-center justify-center gap-2"
            >
              {mission.ctaLabel || 'Go'} <ChevronRight className="w-5 h-5" />
            </button>
          )}

          {done && (
            <div className="text-center py-3 text-green-400 font-bold text-lg">
              ✅ Mission Complete!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
