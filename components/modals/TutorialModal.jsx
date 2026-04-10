'use client';

import React, { useState } from 'react';
import { X, Play, Check } from 'lucide-react';
import { TUTORIALS } from '../../lib/data/tutorials';
import { IMAGES } from '../../lib/data/images';

export default function TutorialModal({ tutorialKey, onClose, closing }) {
  const tutorial = TUTORIALS[tutorialKey];
  const [step, setStep] = useState(0);

  if (!tutorial) return null;

  return (
    <div className={`fixed inset-0 bg-black/90 flex items-center justify-center z-[80] p-4 ${closing ? 'anim-backdrop-close' : 'anim-fade-in'}`} onClick={onClose}>
      <div className={`bg-gradient-to-b from-[#0a1520] to-[#030810] rounded-3xl max-w-lg w-full overflow-hidden border-0 shadow-2xl shadow-cyan-900/50 max-h-[90vh] overflow-y-auto ${closing ? 'anim-modal-close' : 'anim-scale-in'}`} onClick={(e) => e.stopPropagation()}>
        {/* Header Image */}
        <div className="relative h-44">
          <img src={IMAGES[tutorial.image]} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a1520] via-transparent to-transparent" />
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="absolute bottom-4 left-6">
            <h2 className="text-2xl font-black">{tutorial.title}</h2>
            <p className="text-gray-300">{tutorial.subtitle}</p>
          </div>
        </div>

        <div className="p-6">
          {/* Step Indicators */}
          <div className="flex justify-center gap-2 mb-6">
            {tutorial.steps.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setStep(i)}
                className={`h-2 rounded-full transition-all ${step === i ? 'w-8 bg-cyan-500' : 'w-2 bg-gray-600 hover:bg-gray-500'}`}
              />
            ))}
          </div>

          {/* Step Content */}
          <div className="match-card p-5 mb-6 min-h-[120px]">
            <div className="text-4xl mb-3">{tutorial.steps[step].icon}</div>
            <h3 className="font-bold text-lg mb-2">{tutorial.steps[step].title}</h3>
            <p className="text-gray-300">{tutorial.steps[step].desc}</p>
          </div>

          {/* Navigation Buttons */}
          <div className="flex gap-3 mb-6">
            <button
              type="button"
              onClick={() => setStep(s => Math.max(0, s - 1))}
              disabled={step === 0}
              className={`flex-1 py-3 rounded-xl font-bold transition-all ${step === 0 ? 'bg-gray-800/40 border border-gray-600/20 opacity-50' : 'bg-black/40 hover:bg-cyan-900/30 border border-white/10'}`}
            >
              ← Back
            </button>
            {step < tutorial.steps.length - 1 ? (
              <button
                type="button"
                onClick={() => setStep(s => s + 1)}
                className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 rounded-xl font-bold"
              >
                Next →
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-xl font-bold flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5" /> Got it!
              </button>
            )}
          </div>

          {/* Prizes */}
          <div className="mb-4">
            <h4 className="text-sm font-bold text-yellow-400 mb-2">🏆 Possible Prizes</h4>
            <div className="flex flex-wrap gap-2">
              {tutorial.prizes.map((p, i) => (
                <span key={i} className="px-3 py-1 bg-yellow-500/20 rounded-lg text-sm text-yellow-200">{p}</span>
              ))}
            </div>
          </div>

          {/* Tips */}
          <div className="bg-cyan-500/10 rounded-xl p-4 border-0">
            <h4 className="text-sm font-bold text-cyan-400 mb-2">💡 Pro Tips</h4>
            {tutorial.tips.map((t, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-gray-300 mb-1">
                <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                <span>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
