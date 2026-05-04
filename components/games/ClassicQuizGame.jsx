'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { getQuestions, TRIVIA_CATEGORIES } from '../../lib/data/trivia';

export default function ClassicQuizGame({ onClose, onWin, closing }) {
  const [phase, setPhase] = useState('category');
  const [category, setCategory] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [qIndex, setQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(15);
  const [selected, setSelected] = useState(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [fiftyFiftyUsed, setFiftyFiftyUsed] = useState(0);
  const [skipUsed, setSkipUsed] = useState(false);
  const [eliminated, setEliminated] = useState([]);
  const [streak, setStreak] = useState(0);
  const timerRef = useRef(null);

  const optionLetters = ['A', 'B', 'C', 'D'];
  const optionColors = [
    { bg: 'from-rose-600/30 to-pink-700/20', border: 'border-rose-500/40', glow: 'shadow-rose-500/20', letter: 'bg-rose-500', hover: 'hover:border-rose-400/60 hover:shadow-rose-500/30' },
    { bg: 'from-blue-600/30 to-cyan-700/20', border: 'border-blue-500/40', glow: 'shadow-blue-500/20', letter: 'bg-blue-500', hover: 'hover:border-blue-400/60 hover:shadow-blue-500/30' },
    { bg: 'from-amber-600/30 to-yellow-700/20', border: 'border-amber-400/50', glow: 'shadow-amber-500/20', letter: 'bg-amber-500', hover: 'hover:border-amber-400/60 hover:shadow-amber-500/30' },
    { bg: 'from-emerald-600/30 to-green-700/20', border: 'border-emerald-500/40', glow: 'shadow-emerald-500/20', letter: 'bg-emerald-500', hover: 'hover:border-emerald-400/60 hover:shadow-emerald-500/30' },
  ];

  const startQuiz = (catId) => {
    setCategory(catId);
    setQuestions(getQuestions(catId, 10));
    setPhase('playing');
    setTimer(15);
  };

  useEffect(() => {
    if (phase === 'playing' && !showAnswer) {
      timerRef.current = setInterval(() => {
        setTimer(t => {
          if (t <= 1) {
            clearInterval(timerRef.current);
            setShowAnswer(true);
            setStreak(0);
            setTimeout(() => nextQuestion(), 1500);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
      return () => clearInterval(timerRef.current);
    }
  }, [phase, qIndex, showAnswer]);

  const selectAnswer = (opt) => {
    if (showAnswer || selected) return;
    clearInterval(timerRef.current);
    setSelected(opt);
    setShowAnswer(true);
    const correct = opt === questions[qIndex].a;
    if (correct) { setScore(s => s + 1); setStreak(s => s + 1); } else { setStreak(0); }
    setTimeout(() => nextQuestion(), 1200);
  };

  const nextQuestion = () => {
    if (qIndex >= 9) {
      setPhase('result');
      const totalCoins = score * 10 + (score >= 10 ? 500 : score >= 7 ? 150 : score >= 5 ? 50 : 0);
      if (totalCoins > 0) onWin(totalCoins, { triviaCorrect: score, triviaType: 'classic' });
      return;
    }
    setQIndex(i => i + 1);
    setSelected(null);
    setShowAnswer(false);
    setEliminated([]);
    setTimer(15);
  };

  const useFiftyFifty = () => {
    if (fiftyFiftyUsed >= 2 || showAnswer) return;
    const q = questions[qIndex];
    const wrongOpts = q.options.filter(o => o !== q.a);
    const toRemove = wrongOpts.sort(() => Math.random() - 0.5).slice(0, 2);
    setEliminated(toRemove);
    setFiftyFiftyUsed(f => f + 1);
  };

  const useSkip = () => {
    if (skipUsed || showAnswer) return;
    clearInterval(timerRef.current);
    setSkipUsed(true);
    setScore(s => s + 1);
    setShowAnswer(true);
    setSelected('__skipped__');
    setTimeout(() => nextQuestion(), 800);
  };

  const q = questions[qIndex];
  const finalCoins = score * 10 + (score >= 10 ? 500 : score >= 7 ? 150 : score >= 5 ? 50 : 0);
  const timerPct = (timer / 15) * 100;
  const circumference = 2 * Math.PI * 22;

  return (
    <div className={`fixed inset-0 bg-black/95 flex items-center justify-center z-[70] p-4 ${closing ? "anim-backdrop-close" : "anim-fade-in"}`} onClick={onClose}>
      <div className={`bg-gradient-to-b from-[#0a1828]/95 via-[#061018]/95 to-[#030810]/95 backdrop-blur-xl rounded-3xl max-w-md w-full border-0 overflow-hidden ${closing ? "anim-modal-close" : "anim-scale-in"}`} onClick={(e) => e.stopPropagation()}>

        {/* Header with glow */}
        <div className="relative px-6 pt-5 pb-4">
          <div className="absolute inset-0 bg-gradient-to-b from-purple-600/10 to-transparent" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                <span className="text-lg">🧠</span>
              </div>
              <div>
                <h2 className="font-black text-lg tracking-tight">Classic Quiz</h2>
                {phase === 'playing' && <span className="text-xs text-purple-400">{TRIVIA_CATEGORIES.find(c => c.id === category)?.name}</span>}
              </div>
            </div>
            <button type="button" onClick={onClose} className="w-9 h-9 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-full transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-6 pb-6">
          {/* Category Selection */}
          {phase === 'category' && (
            <div>
              <p className="text-gray-400 text-center text-sm mb-5">Choose your category</p>
              <div className="grid grid-cols-2 gap-3">
                {TRIVIA_CATEGORIES.map(cat => (
                  <button key={cat.id} type="button" onClick={() => startQuiz(cat.id)}
                    className="group relative rounded-3xl overflow-hidden transition-all duration-300 hover:scale-[1.03] active:scale-95">
                    <div className={`absolute inset-0 bg-gradient-to-br ${cat.color} opacity-20 group-hover:opacity-40 transition-opacity`} />
                    <div className="relative p-5 text-center border border-white/10 rounded-2xl group-hover:border-white/20">
                      <div className="text-4xl mb-2 drop-shadow-lg" style={{ filter: 'drop-shadow(0 0 8px rgba(168,85,247,0.4))' }}>{cat.icon}</div>
                      <div className="font-bold text-sm">{cat.name}</div>
                      <div className="text-xs text-gray-500 mt-1">10 questions</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Playing */}
          {phase === 'playing' && q && (
            <div>
              {/* Score bar + Timer */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-purple-300">Question {qIndex + 1}/10</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-green-400">{score} correct</span>
                      {streak >= 2 && <span className="text-xs text-orange-400 animate-pulse">🔥{streak}</span>}
                    </div>
                  </div>
                  <div className="h-2 bg-black/50 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500 ease-out" style={{
                      width: `${((qIndex + 1) / 10) * 100}%`,
                      background: 'linear-gradient(90deg, #a855f7, #ec4899, #f97316)'
                    }} />
                  </div>
                </div>
                {/* Circular Timer */}
                <div className="relative w-14 h-14 flex-shrink-0">
                  <svg className="w-14 h-14 -rotate-90" viewBox="0 0 48 48">
                    <circle cx="24" cy="24" r="22" fill="none" stroke="#0a1520" strokeWidth="3" />
                    <circle cx="24" cy="24" r="22" fill="none"
                      stroke={timer <= 5 ? '#ef4444' : timer <= 10 ? '#f59e0b' : '#a855f7'}
                      strokeWidth="3" strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={circumference - (timerPct / 100) * circumference}
                      style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
                    />
                  </svg>
                  <div className={`absolute inset-0 flex items-center justify-center font-black text-lg ${timer <= 5 ? 'text-red-400' : 'text-white'}`} style={{ animation: timer <= 5 ? 'timerUrgent 0.5s ease-in-out infinite' : 'none' }}>
                    {timer}
                  </div>
                </div>
              </div>

              {/* Question Card */}
              <div className="relative mb-4">
                <div className="absolute -inset-[1px] bg-gradient-to-r from-purple-500/30 via-fuchsia-500/30 to-purple-500/30 rounded-2xl blur-sm" />
                <div className="relative bg-black/50 rounded-2xl p-5 border border-white/10">
                  <p className="font-bold text-center leading-relaxed">{q.q}</p>
                </div>
              </div>

              {/* Answer Options - Colored Bars */}
              <div className="space-y-2.5 mb-4">
                {q.options.map((opt, i) => {
                  if (eliminated.includes(opt)) return (
                    <div key={i} className="relative h-12 rounded-xl bg-gray-900/50 border border-gray-800/50 flex items-center px-4 opacity-30">
                      <span className="w-7 h-7 rounded-lg bg-gray-800/40 border border-gray-600/20 flex items-center justify-center font-black text-xs mr-3">{optionLetters[i]}</span>
                      <span className="text-gray-600 line-through text-sm">{opt}</span>
                    </div>
                  );
                  const isCorrect = opt === q.a;
                  const isSelected = opt === selected;
                  const c = optionColors[i];
                  let classes, inner;
                  if (showAnswer && isCorrect) {
                    classes = 'bg-gradient-to-r from-green-600/30 to-emerald-600/20 border-green-400/60 shadow-lg shadow-green-500/20';
                    inner = 'bg-green-500';
                  } else if (showAnswer && isSelected && !isCorrect) {
                    classes = 'bg-gradient-to-r from-red-600/30 to-red-700/20 border-red-400/60 shadow-lg shadow-red-500/20';
                    inner = 'bg-red-500';
                  } else if (showAnswer) {
                    classes = `bg-gradient-to-r ${c.bg} ${c.border} opacity-40`;
                    inner = c.letter;
                  } else {
                    classes = `bg-gradient-to-r ${c.bg} ${c.border} ${c.hover} shadow-md ${c.glow}`;
                    inner = c.letter;
                  }
                  return (
                    <button key={i} type="button" onClick={() => selectAnswer(opt)} disabled={showAnswer}
                      className={`relative w-full h-13 rounded-xl border flex items-center px-4 py-3 transition-all duration-200 ${!showAnswer ? 'hover:scale-[1.01] active:scale-[0.98]' : ''} ${classes}`}
                      style={{ animation: showAnswer && isCorrect ? 'correctPop 0.4s ease both' : showAnswer && isSelected && !isCorrect ? 'wrongShake 0.5s ease both' : 'none' }}>
                      <span className={`w-7 h-7 rounded-lg ${inner} flex items-center justify-center font-black text-xs mr-3 shadow-md flex-shrink-0`}>{optionLetters[i]}</span>
                      <span className="font-semibold text-sm flex-1 text-left">{opt}</span>
                      {showAnswer && isCorrect && <span className="text-green-400 text-lg ml-2">✓</span>}
                      {showAnswer && isSelected && !isCorrect && <span className="text-red-400 text-lg ml-2">✗</span>}
                    </button>
                  );
                })}
              </div>

              {/* Lifelines */}
              <div className="flex gap-2">
                <button type="button" onClick={useFiftyFifty} disabled={fiftyFiftyUsed >= 2 || showAnswer}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${fiftyFiftyUsed >= 2 || showAnswer ? 'bg-gray-900/50 text-gray-600 border border-gray-800/30' : 'bg-gradient-to-r from-blue-600/20 to-cyan-600/20 text-blue-300 border border-blue-500/30 hover:border-blue-400/50 shadow-md shadow-blue-500/10 hover:shadow-blue-500/20'}`}>
                  <span className="text-base">🔀</span> 50/50 <span className="opacity-50">({2 - fiftyFiftyUsed})</span>
                </button>
                <button type="button" onClick={useSkip} disabled={skipUsed || showAnswer}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${skipUsed || showAnswer ? 'bg-gray-900/50 text-gray-600 border border-gray-800/30' : 'bg-gradient-to-r from-amber-600/20 to-yellow-600/20 text-amber-300 border border-amber-500/30 hover:border-amber-400/50 shadow-md shadow-amber-500/10 hover:shadow-amber-500/20'}`}>
                  <span className="text-base">⏭️</span> Skip <span className="opacity-50">({skipUsed ? 0 : 1})</span>
                </button>
              </div>
            </div>
          )}

          {/* Results */}
          {phase === 'result' && (
            <div className="text-center py-2">
              <div className="relative inline-block mb-4">
                <div className="text-7xl" style={{ filter: 'drop-shadow(0 0 20px rgba(168,85,247,0.5))' }}>
                  {score >= 8 ? '🏆' : score >= 5 ? '⭐' : '👏'}
                </div>
                <div className="absolute -inset-4 bg-purple-500/10 rounded-full blur-2xl" />
              </div>
              <div className="text-4xl font-black mb-1 bg-gradient-to-r from-purple-400 via-fuchsia-400 to-emerald-400 bg-clip-text text-transparent">{score}/10</div>
              <div className="text-gray-400 mb-5">{score >= 8 ? 'Outstanding!' : score >= 5 ? 'Well done!' : 'Keep practicing!'}</div>
              <div className="bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/20 rounded-2xl p-4 mb-5">
                <div className="text-yellow-400 font-black text-2xl mb-1">🪙 +{finalCoins}</div>
                <div className="text-yellow-400/60 text-xs">Coins earned</div>
                {score >= 7 && <div className="text-emerald-400 text-sm mt-2 font-bold">🎉 Bonus: +{score >= 10 ? 500 : 150} for {score >= 10 ? 'perfect' : 'great'} score!</div>}
              </div>
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
