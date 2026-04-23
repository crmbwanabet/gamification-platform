'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Trophy, Target, XCircle, CheckCircle, Flame, Timer, Clock, Medal } from 'lucide-react';
import { getDailyQuestions, DAILY_CAT_INFO, DAILY_DIFFICULTY, DAILY_PERFECT_BONUS, getDailyStreakMult } from '../../lib/data/trivia';

export default function DailyTriviaChallenge({ user, onAnswer, onNavigate }) {
  const [questions] = useState(() => getDailyQuestions());
  const [qIndex, setQIndex] = useState(user.dailyTriviaProgress?.answered || 0);
  const [selected, setSelected] = useState(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [timer, setTimer] = useState(0);
  const [results, setResults] = useState(user.dailyTriviaProgress?.results || []);
  const [phase, setPhase] = useState(user.dailyTriviaProgress?.answered >= 3 ? 'complete' : 'playing'); // playing | reveal | next | complete
  const [countdownAnim, setCountdownAnim] = useState(false);
  const timerRef = useRef(null);

  const todayCat = questions[0]?.category || 'general';
  const catInfo = DAILY_CAT_INFO[todayCat] || DAILY_CAT_INFO.general;
  const allDone = phase === 'complete' || qIndex >= 3;
  const correctCount = results.filter(r => r).length;
  const isPerfect = correctCount === 3;
  const streakMult = getDailyStreakMult(user.dailyTriviaStreak || 0);

  // Start timer for current question
  useEffect(() => {
    if (phase !== 'playing' || allDone || qIndex >= 3) return;
    const diff = DAILY_DIFFICULTY[qIndex];
    setTimer(diff.time);
    setSelected(null);
    setShowAnswer(false);
    timerRef.current = setInterval(() => {
      setTimer(t => {
        if (t <= 6 && t > 0) setCountdownAnim(true);
        if (t <= 1) {
          clearInterval(timerRef.current);
          setShowAnswer(true);
          setPhase('reveal');
          const newResults = [...results, false];
          setResults(newResults);
          setTimeout(() => advance(newResults), 2000);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { clearInterval(timerRef.current); setCountdownAnim(false); };
  }, [qIndex, phase]);

  const selectAnswer = (opt) => {
    if (showAnswer || selected || phase !== 'playing') return;
    clearInterval(timerRef.current);
    setSelected(opt);
    setShowAnswer(true);
    setPhase('reveal');
    setCountdownAnim(false);
    const correct = opt === questions[qIndex].a;
    const newResults = [...results, correct];
    setResults(newResults);
    setTimeout(() => advance(newResults), 1800);
  };

  const advance = (newResults) => {
    const nextIdx = qIndex + 1;
    if (nextIdx >= 3) {
      setPhase('complete');
      onAnswer(newResults);
    } else {
      setQIndex(nextIdx);
      setPhase('playing');
    }
  };

  // COMPLETE STATE
  if (allDone) {
    const finalResults = results.length >= 3 ? results : user.dailyTriviaProgress?.results || [];
    const finalCorrect = finalResults.filter(r => r).length;
    const finalPerfect = finalCorrect === 3;
    const baseReward = finalResults.reduce((sum, r, i) => sum + (r ? DAILY_DIFFICULTY[i].reward : 0), 0);
    const totalCoins = Math.floor((baseReward + (finalPerfect ? DAILY_PERFECT_BONUS.coins : 0)) * streakMult);
    return (
      <div className="dh-hero-card overflow-hidden" style={{ border: finalPerfect ? '1.5px solid rgba(255,215,0,.3)' : '1.5px solid rgba(147,51,234,.2)' }}>
        <div className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${finalPerfect ? 'bg-amber-500/15' : 'bg-purple-500/10'}`}>
              {finalPerfect ? <Trophy className="w-6 h-6 text-amber-400" /> : finalCorrect > 0 ? <Target className="w-6 h-6 text-purple-400" /> : <XCircle className="w-6 h-6 text-gray-500" />}
            </div>
            <div className="flex-1">
              <div className="font-bold text-sm">
                {finalPerfect ? 'Perfect Score!' : finalCorrect > 0 ? 'Today\'s Trivia — Done' : 'Today\'s Trivia — Done'}
              </div>
              <div className={`text-xs ${finalPerfect ? 'text-amber-400' : finalCorrect > 0 ? 'text-purple-400' : 'text-gray-500'}`}>
                {finalPerfect
                  ? `+${totalCoins} Coins + ${DAILY_PERFECT_BONUS.gems} Gems earned`
                  : finalCorrect > 0
                    ? `${finalCorrect}/3 Correct — +${totalCoins} Coins earned`
                    : '0/3 — Better luck tomorrow!'
                }
                {streakMult > 1 && <span className="text-purple-400 ml-1">({streakMult}x streak)</span>}
              </div>
            </div>
          </div>
          <div className="flex gap-2 mb-3">
            {finalResults.map((r, i) => (
              <div key={i} className={`flex-1 p-2.5 rounded-xl text-center border ${r ? 'bg-green-500/8 border-green-500/20' : 'bg-red-500/5 border-red-500/15'}`}>
                <div className="text-[10px] font-bold mb-1" style={{ color: DAILY_DIFFICULTY[i].color }}>{DAILY_DIFFICULTY[i].label}</div>
                {r ? <CheckCircle className="w-5 h-5 text-green-400 mx-auto" /> : <XCircle className="w-5 h-5 text-red-400/60 mx-auto" />}
              </div>
            ))}
          </div>
          {(user.dailyTriviaStreak || 0) > 1 && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/6 border border-amber-500/12">
              <Flame className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-amber-400">{user.dailyTriviaStreak} Day Streak — {streakMult}x Multiplier!</span>
            </div>
          )}
          {finalCorrect === 0 && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[.02] border border-white/[.04] mt-2">
              <Timer className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-[10px] text-gray-500">New questions drop at midnight — come back stronger!</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // PLAYING STATE
  const q = questions[qIndex];
  const diff = DAILY_DIFFICULTY[qIndex];
  if (!q) return null;

  return (
    <div className="dh-hero-card overflow-hidden" style={{ border: `1.5px solid ${diff.border}`, animation: 'dhGlowBorder 3s ease-in-out infinite' }}>
      <style>{`
        @keyframes dtPop{0%{transform:scale(.85);opacity:0}60%{transform:scale(1.04)}100%{transform:scale(1);opacity:1}}
        @keyframes dtShake{0%,100%{transform:translateX(0)}15%{transform:translateX(-6px)}30%{transform:translateX(5px)}45%{transform:translateX(-4px)}60%{transform:translateX(3px)}75%{transform:translateX(-2px)}}
        @keyframes dtTimerPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.15)}}
        @keyframes dtGlow{0%,100%{box-shadow:0 0 0 0 ${diff.color}30}50%{box-shadow:0 0 20px 4px ${diff.color}15}}
        @keyframes dtSlideUp{0%{transform:translateY(12px);opacity:0}100%{transform:translateY(0);opacity:1}}
        .dt-correct{animation:dtPop .4s ease both}
        .dt-wrong{animation:dtShake .5s ease both}
      `}</style>

      {/* Header with category + progress */}
      <div className="px-5 pt-4 pb-3 flex items-center justify-between" style={{ borderBottom: `1px solid ${diff.border}` }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: diff.bg }}>
            {catInfo.Icon ? <catInfo.Icon className="w-5 h-5" style={{ color: catInfo.color }} /> : <Target className="w-5 h-5 text-purple-400" />}
          </div>
          <div>
            <div className="font-bold text-sm flex items-center gap-2">
              <Target className="w-3.5 h-3.5 text-purple-400" /> Daily Trivia
              <span className="px-2 py-0.5 rounded-md text-[10px] font-black tracking-wider" style={{ background: diff.bg, color: diff.color, border: `1px solid ${diff.border}` }}>
                {diff.label.toUpperCase()}
              </span>
            </div>
            <div className="text-xs text-gray-500">{catInfo.name} — Q{qIndex + 1} of 3</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Progress dots */}
          <div className="flex gap-1.5">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-2.5 h-2.5 rounded-full transition-all" style={{
                background: i < qIndex ? (results[i] ? '#22c55e' : '#ef4444') : i === qIndex ? diff.color : 'rgba(255,255,255,.1)',
                boxShadow: i === qIndex ? `0 0 8px ${diff.color}40` : 'none',
              }} />
            ))}
          </div>
          {/* Timer */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold font-mono ${timer <= 5 ? 'bg-red-500/20 text-red-400' : 'text-white'}`}
            style={{ background: timer > 5 ? diff.bg : undefined, animation: countdownAnim ? 'dtTimerPulse .5s ease infinite' : 'none' }}>
            <Clock className="w-3.5 h-3.5" /> {timer}s
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="p-5" style={{ animation: 'dtSlideUp .35s ease-out' }}>
        <div className="p-3.5 rounded-xl mb-4 border border-white/8" style={{ background: 'rgba(0,0,0,.3)' }}>
          <p className="font-bold text-sm leading-relaxed">{q.q}</p>
        </div>

        {/* Reward preview */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-bold text-gray-500 tracking-widest">PICK YOUR ANSWER</span>
          <span className="text-xs font-bold flex items-center gap-1" style={{ color: diff.color }}>+{diff.reward} <Medal className="w-3 h-3 text-yellow-500" /></span>
        </div>

        {/* Options */}
        <div className="grid grid-cols-2 gap-2.5">
          {q.options.map((opt, i) => {
            const isCorrect = opt === q.a;
            const isSelected = opt === selected;
            let classes = 'bg-black/30 border border-white/8 hover:border-purple-500/30 hover:bg-purple-500/8';
            let extraStyle = {};
            if (showAnswer) {
              if (isCorrect) { classes = 'dt-correct border-2'; extraStyle = { background: 'rgba(34,197,94,.12)', borderColor: 'rgba(34,197,94,.5)', boxShadow: '0 0 15px rgba(34,197,94,.15)' }; }
              else if (isSelected && !isCorrect) { classes = 'dt-wrong border-2'; extraStyle = { background: 'rgba(239,68,68,.12)', borderColor: 'rgba(239,68,68,.5)' }; }
              else { classes = 'bg-black/20 border border-white/3 opacity-40'; }
            }
            return (
              <button key={i} type="button" onClick={() => selectAnswer(opt)} disabled={showAnswer}
                className={`p-3 rounded-xl font-medium text-xs transition-all ${classes}`}
                style={{ ...extraStyle, animationDelay: showAnswer && isCorrect ? '.1s' : '0s' }}>
                <span className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold" style={{
                    background: showAnswer ? (isCorrect ? 'rgba(34,197,94,.2)' : isSelected ? 'rgba(239,68,68,.2)' : 'rgba(255,255,255,.05)') : 'rgba(255,255,255,.06)',
                    color: showAnswer ? (isCorrect ? '#22c55e' : isSelected ? '#ef4444' : '#555') : '#888',
                  }}>
                    {showAnswer ? (isCorrect ? '✓' : isSelected ? '✗' : String.fromCharCode(65 + i)) : String.fromCharCode(65 + i)}
                  </span>
                  {opt}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
