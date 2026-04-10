'use client';

import React from 'react';
import { X } from 'lucide-react';
import { IMAGES } from '../../lib/data/images';

export default function QuestDetailModal({ quest, questProgress, questsComplete, onClose, onClaim, onNavigate, onPlayGame, closing }) {
  const isComplete = questsComplete.includes(quest.id);
  const allStepsDone = quest.steps.every(s => (questProgress[s.id] || 0) >= s.target);
  const canClaim = allStepsDone && !isComplete;

  const handleStepGo = (step) => {
    if (!step.go) return;
    onClose();
    if (step.go.game) {
      onNavigate('minigames');
      setTimeout(() => onPlayGame(step.go.game), 100);
    } else {
      onNavigate(step.go.tab);
    }
  };

  return (
    <div className={`fixed inset-0 bg-black/95 flex items-center justify-center z-[70] p-4 ${closing ? "anim-backdrop-close" : "anim-fade-in"}`} onClick={onClose}>
      <div className={`bg-gradient-to-b from-[#0a1828]/95 via-[#061018]/95 to-[#030810]/95 backdrop-blur-xl rounded-3xl max-w-md w-full border-0 overflow-hidden max-h-[90vh] overflow-y-auto ${closing ? "anim-modal-close" : "anim-scale-in"}`} onClick={(e) => e.stopPropagation()} style={{ scrollbarWidth: 'none' }}>

        {/* Hero Banner */}
        <div className="relative h-40 overflow-hidden">
          <img src={IMAGES[quest.image]} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#150e2e] via-[#150e2e]/60 to-transparent" />
          <div className="absolute top-4 right-4">
            <button type="button" onClick={onClose} className="w-9 h-9 flex items-center justify-center bg-black/50 hover:bg-black/70 rounded-full backdrop-blur-sm transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="absolute bottom-4 left-5 right-5">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${quest.diffColor}`}>{quest.difficulty}</span>
            <h2 className="font-black text-xl mt-1">{quest.name}</h2>
          </div>
        </div>

        <div className="px-5 pb-5">
          <p className="text-gray-400 text-sm my-4">{quest.desc}</p>

          {/* Steps with Go buttons */}
          <div className="space-y-3 mb-5">
            {quest.steps.map((step) => {
              const progress = questProgress[step.id] || 0;
              const done = progress >= step.target;
              const pct = Math.min(100, (progress / step.target) * 100);
              return (
                <div key={step.id} className={`rounded-xl border transition-all ${done ? 'bg-green-500/5 border-green-500/20' : 'bg-black/40 border-cyan-500/30'}`}>
                  <div className="flex items-center gap-3 p-3.5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg ${done ? 'bg-green-500/20' : 'bg-cyan-500/10'}`}>
                      {done ? '✅' : step.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className={`font-bold text-sm ${done ? 'text-green-400' : ''}`}>{step.desc}</span>
                        <span className={`text-xs font-bold ml-2 ${done ? 'text-green-400' : 'text-gray-500'}`}>{Math.min(progress, step.target)}/{step.target}</span>
                      </div>
                      {!done && (
                        <div className="h-1.5 bg-black/50 rounded-full overflow-hidden mt-1.5">
                          <div className="h-full rounded-full transition-all duration-500" style={{
                            width: `${pct}%`,
                            background: 'linear-gradient(90deg, #a855f7, #ec4899)'
                          }} />
                        </div>
                      )}
                    </div>
                    {/* Green Go button */}
                    {!done && step.go && (
                      <button type="button" onClick={() => handleStepGo(step)}
                        className="px-3 py-1.5 bg-green-500 hover:bg-green-600 rounded-lg text-xs font-bold flex-shrink-0 transition-all hover:scale-105 active:scale-95">
                        Go →
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Rewards */}
          <div className={`rounded-xl p-4 mb-4 border ${isComplete ? 'bg-green-500/5 border-green-500/20' : 'bg-black/40 border-cyan-500/30'}`}>
            <div className="text-xs font-bold text-gray-500 mb-2">{isComplete ? '✅ REWARDS CLAIMED' : '🎁 QUEST REWARDS'}</div>
            <div className="flex items-center gap-4">
              <span className="text-yellow-400 font-bold text-sm">🪙 {quest.reward.kwacha}</span>
              <span className="text-green-400 font-bold text-sm">💚 {quest.reward.gems}</span>
              {quest.reward.diamonds && <span className="text-cyan-400 font-bold text-sm">💎 {quest.reward.diamonds}</span>}
              <span className="text-cyan-400 font-bold text-sm">⚡ {quest.xp} XP</span>
            </div>
          </div>

          {/* Action Button */}
          {canClaim && (
            <button type="button" onClick={() => onClaim(quest)}
              className="w-full py-4 rounded-2xl font-black text-lg tracking-wide btn-3d btn-3d-green flex items-center justify-center gap-2"
              style={{ boxShadow: '0 0 20px rgba(34,197,94,0.25)' }}>
              🎉 Claim Rewards
            </button>
          )}
          {isComplete && (
            <div className="w-full py-3.5 bg-green-500/10 border border-green-500/20 rounded-xl font-bold text-center text-green-400">
              ✅ Quest Complete
            </div>
          )}
          {!canClaim && !isComplete && (
            <button type="button" onClick={() => { onClose(); onNavigate('minigames'); }}
              className="w-full py-4 rounded-2xl font-black text-lg tracking-wide btn-3d btn-3d-purple">
              Go Play →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
