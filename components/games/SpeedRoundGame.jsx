'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { getSpeedQuestions } from '../../lib/data/trivia';

export default function SpeedRoundGame({ onClose, onWin, closing }) {
  const [phase, setPhase] = useState('ready');
  const [questions, setQuestions] = useState([]);
  const [qIndex, setQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(60);
  const [feedback, setFeedback] = useState(null);
  const [combo, setCombo] = useState(0);
  const timerRef = useRef(null);
  const scoreRef = useRef(0);

  const startGame = () => {
    setQuestions(getSpeedQuestions(20));
    setPhase('playing');
    setTimer(60);
    timerRef.current = setInterval(() => {
      setTimer(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          const s = scoreRef.current;
          const coins = s * 5 + (s >= 20 ? 500 : s >= 15 ? 200 : 0);
          if (coins > 0) onWin(coins, { triviaCorrect: s, triviaType: 'speed' });
          setPhase('result');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => clearInterval(timerRef.current);
  }, []);

  const answer = (val) => {
    if (phase !== 'playing') return;
    const correct = val === questions[qIndex].answer;
    if (correct) {
      setScore(s => s + 1);
      scoreRef.current += 1;
      setCombo(c => c + 1);
    } else {
      setCombo(0);
    }
    setFeedback(correct ? 'correct' : 'wrong');
    setTimeout(() => {
      setFeedback(null);
      if (qIndex >= 19) {
        clearInterval(timerRef.current);
        setPhase('result');
        const final = correct ? score + 1 : score;
        const totalCoins = final * 5 + (final >= 20 ? 500 : final >= 15 ? 200 : 0);
        if (totalCoins > 0) onWin(totalCoins, { triviaCorrect: final, triviaType: 'speed' });
      } else {
        setQIndex(i => i + 1);
      }
    }, 350);
  };

  const finalScore = score;
  const finalCoins = finalScore * 5 + (finalScore >= 20 ? 500 : finalScore >= 15 ? 200 : 0);
  const timerPct = (timer / 60) * 100;
  const circumference = 2 * Math.PI * 38;

  return (
    <div className={`fixed inset-0 bg-black/95 flex items-center justify-center z-[70] p-4 ${closing ? "anim-backdrop-close" : "anim-fade-in"}`} onClick={onClose}>
      <div className={`bg-gradient-to-b from-[#0a1828]/95 via-[#061018]/95 to-[#030810]/95 backdrop-blur-xl rounded-3xl max-w-md w-full border border-yellow-500/20 overflow-hidden ${closing ? "anim-modal-close" : "anim-scale-in"}`} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="relative px-6 pt-5 pb-4">
          <div className="absolute inset-0 bg-gradient-to-b from-yellow-600/10 to-transparent" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
                <span className="text-lg">⚡</span>
              </div>
              <div>
                <h2 className="font-black text-lg tracking-tight">Speed Round</h2>
                {phase === 'playing' && <span className="text-xs text-yellow-400">True or False</span>}
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
              <div className="relative inline-block mb-6">
                <div className="w-28 h-28 rounded-full bg-gradient-to-br from-yellow-500/20 to-orange-600/20 border border-yellow-500/30 flex items-center justify-center mx-auto" style={{ boxShadow: '0 0 40px rgba(234,179,8,0.15), inset 0 0 30px rgba(234,179,8,0.1)' }}>
                  <span className="text-6xl" style={{ filter: 'drop-shadow(0 0 12px rgba(234,179,8,0.5))' }}>⚡</span>
                </div>
              </div>
              <h3 className="text-xl font-black mb-2">20 Questions. 60 Seconds.</h3>
              <p className="text-gray-400 text-sm mb-2">Read each statement and decide:</p>
              <div className="flex items-center justify-center gap-4 mb-6">
                <span className="px-4 py-2 rounded-xl bg-emerald-500/15 border-2 border-emerald-500/40 text-emerald-300 font-bold text-sm">✓ TRUE</span>
                <span className="text-gray-600">or</span>
                <span className="px-4 py-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 font-bold text-sm">✗ FALSE</span>
              </div>
              <button type="button" onClick={startGame}
                className="w-full py-4 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-xl font-black text-lg hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-orange-500/30">
                GO!
              </button>
            </div>
          )}

          {/* Playing */}
          {phase === 'playing' && questions[qIndex] && (
            <div>
              {/* Timer + Stats Row */}
              <div className="flex items-center gap-4 mb-4">
                {/* Circular Timer */}
                <div className="relative w-20 h-20 flex-shrink-0">
                  <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="38" fill="none" stroke="#0a1520" strokeWidth="4" />
                    <circle cx="40" cy="40" r="38" fill="none"
                      stroke={timer <= 10 ? '#ef4444' : timer <= 20 ? '#f59e0b' : '#eab308'}
                      strokeWidth="4" strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={circumference - (timerPct / 100) * circumference}
                      style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
                    />
                  </svg>
                  <div className={`absolute inset-0 flex flex-col items-center justify-center ${timer <= 10 ? 'text-red-400' : 'text-yellow-400'}`}>
                    <span className="font-black text-2xl leading-none" style={{ animation: timer <= 5 ? 'timerUrgent 0.5s ease-in-out infinite' : 'none' }}>{timer}</span>
                    <span className="text-[10px] opacity-60">sec</span>
                  </div>
                </div>
                {/* Stats */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Progress</span>
                    <span className="text-xs font-bold text-yellow-400">{qIndex + 1}/20</span>
                  </div>
                  <div className="h-2 bg-black/50 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-300" style={{
                      width: `${((qIndex + 1) / 20) * 100}%`,
                      background: 'linear-gradient(90deg, #eab308, #f97316, #ef4444)'
                    }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <span className="text-green-400 font-black text-lg">{score}</span>
                      <span className="text-xs text-gray-500">correct</span>
                    </div>
                    {combo >= 2 && (
                      <span className="px-2 py-0.5 rounded-full bg-orange-500/20 border border-orange-500/30 text-orange-400 text-xs font-bold" style={{ animation: combo >= 3 ? 'streakFire 0.6s ease-in-out infinite' : 'none' }}>
                        🔥 {combo}x combo
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Statement Card */}
              <div className={`relative mb-6`} style={{ animation: feedback === 'correct' ? 'correctPop 0.4s ease both' : feedback === 'wrong' ? 'wrongShake 0.5s ease both' : 'none' }}>
                <div className={`absolute -inset-[1px] rounded-2xl blur-sm transition-all duration-200 ${feedback === 'correct' ? 'bg-green-500/40' : feedback === 'wrong' ? 'bg-red-500/40' : 'bg-gradient-to-r from-yellow-500/20 via-orange-500/20 to-yellow-500/20'}`} />
                <div className={`relative bg-black/50 rounded-2xl p-6 border border-white/10 min-h-[120px] flex items-center justify-center transition-colors duration-200 ${feedback === 'correct' ? 'bg-green-900/20' : feedback === 'wrong' ? 'bg-red-900/20' : ''}`}>
                  {feedback === 'correct' && <div className="absolute top-3 right-3 text-green-400 font-bold text-sm animate-pulse">✓ Correct!</div>}
                  {feedback === 'wrong' && <div className="absolute top-3 right-3 text-red-400 font-bold text-sm animate-pulse">✗ Wrong!</div>}
                  <p className="font-bold text-center leading-relaxed">{questions[qIndex].statement}</p>
                </div>
              </div>

              {/* TRUE / FALSE Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => answer(true)}
                  className="group relative py-5 rounded-2xl font-black text-xl transition-all hover:scale-[1.03] active:scale-95 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/30 to-green-700/20 border border-emerald-500/40 rounded-2xl group-hover:border-emerald-400/60 shadow-md shadow-emerald-500/20" />
                  <div className="absolute inset-0 bg-emerald-500/0 group-hover:bg-emerald-500/5 transition-colors" />
                  <div className="relative flex items-center justify-center gap-2 text-emerald-300">
                    <span className="text-2xl">✓</span> TRUE
                  </div>
                </button>
                <button type="button" onClick={() => answer(false)}
                  className="group relative py-5 rounded-2xl font-black text-xl transition-all hover:scale-[1.03] active:scale-95 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-rose-600/30 to-pink-700/20 border border-rose-500/40 rounded-2xl group-hover:border-rose-400/60 shadow-md shadow-rose-500/20" />
                  <div className="absolute inset-0 bg-rose-500/0 group-hover:bg-rose-500/5 transition-colors" />
                  <div className="relative flex items-center justify-center gap-2 text-rose-300">
                    <span className="text-2xl">✗</span> FALSE
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Results */}
          {phase === 'result' && (
            <div className="text-center py-2">
              <div className="relative inline-block mb-4">
                <div className="text-7xl" style={{ filter: 'drop-shadow(0 0 20px rgba(234,179,8,0.5))' }}>
                  {finalScore >= 15 ? '⚡' : finalScore >= 10 ? '🎯' : '👏'}
                </div>
              </div>
              <div className="text-4xl font-black mb-1 bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 bg-clip-text text-transparent">{finalScore}/20</div>
              <div className="text-gray-400 mb-5">{finalScore >= 15 ? 'Lightning fast!' : finalScore >= 10 ? 'Quick thinker!' : 'Keep trying!'}</div>
              <div className="bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/20 rounded-2xl p-4 mb-5">
                <div className="text-yellow-400 font-black text-2xl mb-1">🪙 +{finalCoins}</div>
                <div className="text-yellow-400/60 text-xs">Coins earned</div>
                {finalScore >= 15 && <div className="text-emerald-400 text-sm mt-2 font-bold">⚡ Speed bonus: +{finalScore >= 20 ? 500 : 200}!</div>}
              </div>
              <button type="button" onClick={onClose} className="w-full py-3.5 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-xl font-bold hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-orange-500/25">
                Continue
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
