'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { getRandomQuestion } from '../../lib/data/trivia';

export default function StreakTriviaGame({ onClose, onWin, closing }) {
  const [phase, setPhase] = useState('ready');
  const [didCashOut, setDidCashOut] = useState(false);
  const [question, setQuestion] = useState(null);
  const [streak, setStreak] = useState(0);
  const [selected, setSelected] = useState(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [timer, setTimer] = useState(15);
  const [maxStreak, setMaxStreak] = useState(0);
  const timerRef = useRef(null);

  const barColors = [
    { bg: 'from-rose-600/30 to-pink-700/20', border: 'border-rose-500/40', dot: 'bg-rose-500', hover: 'hover:border-rose-400/60', glow: 'shadow-rose-500/15' },
    { bg: 'from-blue-600/30 to-indigo-700/20', border: 'border-blue-500/40', dot: 'bg-blue-500', hover: 'hover:border-blue-400/60', glow: 'shadow-blue-500/15' },
    { bg: 'from-amber-600/30 to-yellow-700/20', border: 'border-amber-400/50', dot: 'bg-amber-500', hover: 'hover:border-amber-400/60', glow: 'shadow-amber-500/15' },
    { bg: 'from-emerald-600/30 to-green-700/20', border: 'border-emerald-500/40', dot: 'bg-emerald-500', hover: 'hover:border-emerald-400/60', glow: 'shadow-emerald-500/15' },
  ];

  const loadQuestion = () => {
    setQuestion(getRandomQuestion());
    setSelected(null);
    setShowAnswer(false);
    setTimer(15);
  };

  const startGame = () => {
    setPhase('playing');
    setStreak(0);
    setDidCashOut(false);
    loadQuestion();
  };

  useEffect(() => {
    if (phase === 'playing' && !showAnswer) {
      timerRef.current = setInterval(() => {
        setTimer(t => {
          if (t <= 1) {
            clearInterval(timerRef.current);
            setShowAnswer(true);
            setTimeout(() => endGame(), 1200);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
      return () => clearInterval(timerRef.current);
    }
  }, [phase, streak, showAnswer]);

  const selectAnswer = (opt) => {
    if (showAnswer || selected) return;
    clearInterval(timerRef.current);
    setSelected(opt);
    setShowAnswer(true);
    const correct = opt === question.a;
    if (correct) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      setMaxStreak(m => Math.max(m, newStreak));
      setTimeout(() => loadQuestion(), 1000);
    } else {
      setTimeout(() => endGame(), 1200);
    }
  };

  const cashOut = () => {
    clearInterval(timerRef.current);
    setDidCashOut(true);
    const coins = streak * 25;
    if (coins > 0) onWin(coins, { triviaStreak: streak, triviaType: 'streak' });
    setPhase('result');
  };

  const endGame = () => {
    setPhase('result');
  };

  const currentPrize = streak * 25;
  const timerPct = (timer / 15) * 100;
  const circumference = 2 * Math.PI * 22;

  // Streak tier coloring
  const streakColor = streak >= 8 ? 'text-red-400' : streak >= 5 ? 'text-orange-400' : streak >= 3 ? 'text-yellow-400' : 'text-gray-400';
  const streakGlow = streak >= 5 ? 'drop-shadow(0 0 8px rgba(239,68,68,0.5))' : streak >= 3 ? 'drop-shadow(0 0 6px rgba(234,179,8,0.4))' : 'none';

  return (
    <div className={`fixed inset-0 bg-black/95 flex items-center justify-center z-[70] p-4 ${closing ? "anim-backdrop-close" : "anim-fade-in"}`} onClick={onClose}>
      <div className={`bg-gradient-to-b from-[#0a1828]/95 via-[#061018]/95 to-[#030810]/95 backdrop-blur-xl rounded-3xl max-w-md w-full border border-red-500/20 overflow-hidden ${closing ? "anim-modal-close" : "anim-scale-in"}`} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="relative px-6 pt-5 pb-4">
          <div className="absolute inset-0 bg-gradient-to-b from-red-600/10 to-transparent" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shadow-lg shadow-red-500/30">
                <span className="text-lg">🔥</span>
              </div>
              <div>
                <h2 className="font-black text-lg tracking-tight">Streak Trivia</h2>
                {phase === 'playing' && <span className="text-xs text-orange-400">Answer or Cash Out!</span>}
              </div>
            </div>
            <button type="button" onClick={onClose} className="w-9 h-9 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-full transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-6 pb-6">
          {/* Ready Screen */}
          {phase === 'ready' && (
            <div className="text-center py-4">
              <div className="relative inline-block mb-5">
                <div className="w-28 h-28 rounded-full bg-gradient-to-br from-red-500/20 to-orange-600/20 border border-red-500/30 flex items-center justify-center mx-auto" style={{ boxShadow: '0 0 40px rgba(239,68,68,0.15), inset 0 0 30px rgba(239,68,68,0.1)' }}>
                  <span className="text-6xl" style={{ filter: 'drop-shadow(0 0 12px rgba(239,68,68,0.5))' }}>🔥</span>
                </div>
              </div>
              <h3 className="text-xl font-black mb-3">How Far Can You Go?</h3>
              <div className="space-y-2 mb-6 text-sm">
                <div className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
                  <span className="text-xl">🪙</span>
                  <span className="text-gray-300">Earn <span className="text-yellow-400 font-bold">25 Coins</span> per correct answer</span>
                </div>
                <div className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
                  <span className="text-xl">💰</span>
                  <span className="text-gray-300"><span className="text-green-400 font-bold">Cash out</span> anytime to keep coins</span>
                </div>
                <div className="flex items-center gap-3 bg-red-500/10 rounded-xl p-3 border border-red-500/20">
                  <span className="text-xl">💥</span>
                  <span className="text-gray-300">Wrong answer = <span className="text-red-400 font-bold">lose everything!</span></span>
                </div>
              </div>
              <button type="button" onClick={startGame}
                className="w-full py-4 bg-gradient-to-r from-red-500 to-orange-600 rounded-xl font-black text-lg hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-red-500/30">
                Start Streak!
              </button>
            </div>
          )}

          {/* Playing */}
          {phase === 'playing' && question && (
            <div>
              {/* Streak Bar */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div className={`flex items-center gap-1.5 font-black ${streakColor}`} style={{ filter: streakGlow, animation: streak >= 3 ? 'streakFire 0.6s ease-in-out infinite' : 'none' }}>
                      <span className="text-lg">🔥</span>
                      <span className="text-xl">{streak}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-yellow-500/15 px-3 py-1 rounded-full border border-yellow-500/20">
                      <span className="text-sm">🪙</span>
                      <span className="text-yellow-400 font-black text-sm">{currentPrize}</span>
                    </div>
                  </div>
                  {/* Streak Milestones */}
                  <div className="flex gap-1">
                    {Array.from({length: 10}, (_, i) => (
                      <div key={i} className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${i < streak ? (i < 3 ? 'bg-yellow-500' : i < 5 ? 'bg-orange-500' : i < 8 ? 'bg-red-500' : 'bg-rose-400') : 'bg-gray-800'}`}
                        style={i < streak ? { boxShadow: `0 0 4px ${i < 3 ? '#eab308' : i < 5 ? '#f97316' : '#ef4444'}` } : {}} />
                    ))}
                  </div>
                </div>
                {/* Timer */}
                <div className="relative w-14 h-14 flex-shrink-0">
                  <svg className="w-14 h-14 -rotate-90" viewBox="0 0 48 48">
                    <circle cx="24" cy="24" r="22" fill="none" stroke="#0a1520" strokeWidth="3" />
                    <circle cx="24" cy="24" r="22" fill="none"
                      stroke={timer <= 5 ? '#ef4444' : timer <= 10 ? '#f59e0b' : '#f97316'}
                      strokeWidth="3" strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={circumference - (timerPct / 100) * circumference}
                      style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
                    />
                  </svg>
                  <div className={`absolute inset-0 flex items-center justify-center font-black text-lg ${timer <= 5 ? 'text-red-400' : 'text-white'}`}>
                    {timer}
                  </div>
                </div>
              </div>

              {/* Question */}
              <div className="relative mb-4">
                <div className="absolute -inset-[1px] bg-gradient-to-r from-orange-500/20 via-red-500/20 to-orange-500/20 rounded-2xl blur-sm" />
                <div className="relative bg-black/50 rounded-2xl p-5 border border-white/10">
                  <p className="font-bold text-center leading-relaxed">{question.q}</p>
                </div>
              </div>

              {/* Colored Answer Bars */}
              <div className="space-y-2.5 mb-4">
                {question.options.map((opt, i) => {
                  const isCorrect = opt === question.a;
                  const isSelected = opt === selected;
                  const c = barColors[i];
                  let classes, dotClass;
                  if (showAnswer && isCorrect) {
                    classes = 'bg-gradient-to-r from-green-600/30 to-emerald-600/20 border-green-400/60 shadow-lg shadow-green-500/20';
                    dotClass = 'bg-green-500';
                  } else if (showAnswer && isSelected && !isCorrect) {
                    classes = 'bg-gradient-to-r from-red-600/30 to-red-700/20 border-red-400/60 shadow-lg shadow-red-500/20';
                    dotClass = 'bg-red-500';
                  } else if (showAnswer) {
                    classes = `bg-gradient-to-r ${c.bg} ${c.border} opacity-40`;
                    dotClass = c.dot;
                  } else {
                    classes = `bg-gradient-to-r ${c.bg} ${c.border} ${c.hover} shadow-md ${c.glow}`;
                    dotClass = c.dot;
                  }
                  return (
                    <button key={i} type="button" onClick={() => selectAnswer(opt)} disabled={showAnswer}
                      className={`relative w-full rounded-xl border flex items-center px-4 py-3.5 transition-all duration-200 ${!showAnswer ? 'hover:scale-[1.01] active:scale-[0.98]' : ''} ${classes}`}>
                      <span className={`w-3 h-3 rounded-full ${dotClass} mr-3 flex-shrink-0 shadow-sm`} />
                      <span className="font-semibold text-sm flex-1 text-left">{opt}</span>
                      {showAnswer && isCorrect && <span className="text-green-400 font-bold ml-2">✓</span>}
                      {showAnswer && isSelected && !isCorrect && <span className="text-red-400 font-bold ml-2">✗</span>}
                    </button>
                  );
                })}
              </div>

              {/* Cash Out Button */}
              {streak > 0 && !showAnswer && (
                <button type="button" onClick={cashOut}
                  className="w-full py-4 rounded-2xl font-black text-lg tracking-wide btn-3d btn-3d-green flex items-center justify-center gap-2"
                  style={{ boxShadow: '0 0 20px rgba(34,197,94,0.25), 0 4px 12px rgba(0,0,0,0.3)' }}>
                  <span className="text-lg">💰</span> Cash Out — {currentPrize} Coins
                </button>
              )}
            </div>
          )}

          {/* Results */}
          {phase === 'result' && (
            <div className="text-center py-2">
              <div className="relative inline-block mb-4">
                <div className="text-7xl" style={{ filter: didCashOut ? 'drop-shadow(0 0 20px rgba(34,197,94,0.5))' : 'drop-shadow(0 0 20px rgba(239,68,68,0.5))' }}>
                  {didCashOut ? '💰' : '💥'}
                </div>
              </div>
              <div className={`text-4xl font-black mb-1 ${didCashOut ? 'bg-gradient-to-r from-green-400 to-emerald-400' : 'bg-gradient-to-r from-red-400 to-orange-400'} bg-clip-text text-transparent`}>
                Streak: {maxStreak || streak}
              </div>
              <div className="text-gray-400 mb-5">
                {didCashOut ? 'Smart move! Coins secured.' : 'Your streak was broken!'}
              </div>
              {didCashOut && currentPrize > 0 && (
                <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-2xl p-4 mb-5">
                  <div className="text-green-400 font-black text-2xl mb-1">🪙 +{currentPrize}</div>
                  <div className="text-green-400/60 text-xs">Coins secured</div>
                </div>
              )}
              {!didCashOut && (
                <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/20 rounded-2xl p-4 mb-5">
                  <div className="text-red-400 font-bold text-lg mb-1">0 Coins</div>
                  <div className="text-red-400/60 text-xs">Better luck next time!</div>
                </div>
              )}
              <button type="button" onClick={onClose} className="w-full py-4 rounded-2xl font-black text-lg tracking-wide btn-3d btn-3d-purple">
                Continue
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
