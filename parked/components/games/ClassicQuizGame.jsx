'use client';

import React, { useState, useEffect, useRef } from 'react';
import { getQuestions, TRIVIA_CATEGORIES } from '../../lib/data/trivia';
import { C } from '@/components/redesign/tokens';
import { RewardIcon } from '@/components/redesign/RedesignShell';
import { GameShell, GameBtn, OptionBtn } from './gameKit';

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
      const totalCoins = score * 10 + (score >= 10 ? 100 : score >= 7 ? 50 : score >= 5 ? 25 : 0);
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
  const finalCoins = score * 10 + (score >= 10 ? 100 : score >= 7 ? 50 : score >= 5 ? 25 : 0);
  const timerPct = (timer / 15) * 100;
  const circumference = 2 * Math.PI * 22;
  const catName = TRIVIA_CATEGORIES.find(c => c.id === category)?.name;

  const lifelineStyle = (disabled, accent) => ({
    flex: 1, padding: '10px 8px', borderRadius: 11, fontSize: 12, fontWeight: 800,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    cursor: disabled ? 'not-allowed' : 'pointer', transition: 'border-color .15s',
    background: disabled ? C.track : 'rgba(255,255,255,.04)',
    color: disabled ? C.muted : accent,
    border: `1px solid ${disabled ? C.line : accent + '55'}`,
  });

  return (
    <GameShell title="🧠 Classic Quiz" onClose={onClose} closing={closing}>
      {phase === 'playing' && catName && (
        <p style={{ textAlign: 'center', color: C.teal, fontSize: 12.5, fontWeight: 700, margin: '-6px 0 14px' }}>{catName}</p>
      )}

      {/* Category Selection */}
      {phase === 'category' && (
        <div>
          <p style={{ textAlign: 'center', color: C.sub, fontSize: 13.5, marginBottom: 18 }}>Choose your category</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {TRIVIA_CATEGORIES.map(cat => (
              <button key={cat.id} type="button" onClick={() => startQuiz(cat.id)}
                style={{ background: C.track, border: `1px solid ${C.line}`, borderRadius: 16, padding: '20px 12px', textAlign: 'center', cursor: 'pointer', transition: 'border-color .15s, transform .12s' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.teal; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.line; }}>
                <div style={{ fontSize: 34, marginBottom: 8 }}>{cat.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 13.5, color: C.text }}>{cat.name}</div>
                <div style={{ fontSize: 11.5, color: C.muted, marginTop: 4 }}>10 questions</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Playing */}
      {phase === 'playing' && q && (
        <div>
          {/* Score bar + Timer */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.teal }}>Question {qIndex + 1}/10</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.green }}>{score} correct</span>
                  {streak >= 2 && <span style={{ fontSize: 12, color: C.gold, fontWeight: 800, animation: 'streakFire 0.6s ease-in-out infinite' }}>🔥{streak}</span>}
                </div>
              </div>
              <div style={{ height: 8, background: C.track, borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 99, transition: 'width .5s ease-out', width: `${((qIndex + 1) / 10) * 100}%`, background: C.green }} />
              </div>
            </div>
            {/* Circular Timer */}
            <div style={{ position: 'relative', width: 56, height: 56, flex: 'none' }}>
              <svg width="56" height="56" viewBox="0 0 48 48" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="24" cy="24" r="22" fill="none" stroke={C.track} strokeWidth="3" />
                <circle cx="24" cy="24" r="22" fill="none"
                  stroke={C.gold} strokeWidth="3" strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference - (timerPct / 100) * circumference}
                  style={{ transition: 'stroke-dashoffset 1s linear' }}
                />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 18, color: C.gold, animation: timer <= 5 ? 'timerUrgent 0.5s ease-in-out infinite' : 'none' }}>
                {timer}
              </div>
            </div>
          </div>

          {/* Question Card */}
          <div style={{ background: C.track, borderRadius: 16, padding: 18, border: `1px solid ${C.line}`, marginBottom: 16, boxShadow: `0 0 0 1px rgba(79,169,139,.12)` }}>
            <p style={{ fontWeight: 700, textAlign: 'center', lineHeight: 1.5, color: C.text, margin: 0 }}>{q.q}</p>
          </div>

          {/* Answer Options */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            {q.options.map((opt, i) => {
              if (eliminated.includes(opt)) return (
                <div key={i} style={{ height: 46, borderRadius: 11, background: C.track, border: `1px solid ${C.line}`, display: 'flex', alignItems: 'center', padding: '0 14px', opacity: 0.3 }}>
                  <span style={{ width: 26, height: 26, borderRadius: 8, background: C.panel2, display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 12, marginRight: 12, color: C.muted }}>{optionLetters[i]}</span>
                  <span style={{ color: C.muted, textDecoration: 'line-through', fontSize: 14 }}>{opt}</span>
                </div>
              );
              const isCorrect = opt === q.a;
              const isSelected = opt === selected;
              let badgeBg = C.panel2, badgeColor = C.text;
              const optStyle = { width: '100%', display: 'flex', alignItems: 'center', textAlign: 'left', gap: 12, padding: '12px 14px', fontSize: 14 };
              if (showAnswer && isCorrect) {
                optStyle.background = 'rgba(79,169,139,.18)'; optStyle.border = `2px solid ${C.green}`;
                badgeBg = C.green; badgeColor = '#08210f';
                optStyle.animation = 'correctPop 0.4s ease both';
              } else if (showAnswer && isSelected && !isCorrect) {
                optStyle.background = 'rgba(229,87,63,.18)'; optStyle.border = `2px solid ${C.red}`;
                badgeBg = C.red; badgeColor = '#fff';
                optStyle.animation = 'wrongShake 0.5s ease both';
              } else if (showAnswer) {
                optStyle.opacity = 0.45;
              }
              return (
                <OptionBtn key={i} onClick={() => selectAnswer(opt)} disabled={showAnswer} style={optStyle}>
                  <span style={{ width: 26, height: 26, borderRadius: 8, background: badgeBg, color: badgeColor, display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 12, flex: 'none' }}>{optionLetters[i]}</span>
                  <span style={{ flex: 1, fontWeight: 600 }}>{opt}</span>
                  {showAnswer && isCorrect && <span style={{ color: C.green, fontSize: 18 }}>✓</span>}
                  {showAnswer && isSelected && !isCorrect && <span style={{ color: C.red, fontSize: 18 }}>✗</span>}
                </OptionBtn>
              );
            })}
          </div>

          {/* Lifelines */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={useFiftyFifty} disabled={fiftyFiftyUsed >= 2 || showAnswer} style={lifelineStyle(fiftyFiftyUsed >= 2 || showAnswer, C.teal)}>
              <span style={{ fontSize: 15 }}>🔀</span> 50/50 <span style={{ opacity: 0.5 }}>({2 - fiftyFiftyUsed})</span>
            </button>
            <button type="button" onClick={useSkip} disabled={skipUsed || showAnswer} style={lifelineStyle(skipUsed || showAnswer, C.gold)}>
              <span style={{ fontSize: 15 }}>⏭️</span> Skip <span style={{ opacity: 0.5 }}>({skipUsed ? 0 : 1})</span>
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {phase === 'result' && (
        <div style={{ textAlign: 'center', padding: '4px 0' }} className="anim-scale-in">
          <div style={{ fontSize: 66, marginBottom: 10, animation: 'symbolPop 0.5s ease both, float 2s ease-in-out 0.5s infinite' }}>
            {score >= 8 ? '🏆' : score >= 5 ? '⭐' : '👏'}
          </div>
          <div style={{ fontSize: 40, fontWeight: 900, marginBottom: 2, color: C.green }}>{score}/10</div>
          <div style={{ color: C.sub, marginBottom: 20 }}>{score >= 8 ? 'Outstanding!' : score >= 5 ? 'Well done!' : 'Keep practicing!'}</div>
          <div style={{ background: C.track, border: `1px solid ${C.line}`, borderRadius: 16, padding: 16, marginBottom: 20 }}>
            <div style={{ color: C.gold, fontWeight: 900, fontSize: 24, marginBottom: 2, display: 'inline-flex', alignItems: 'center', gap: 6 }}>+{finalCoins} <RewardIcon kind="coins" size={20} /></div>
            <div style={{ color: C.muted, fontSize: 11.5 }}>Coins earned</div>
            {score >= 7 && <div style={{ color: C.green, fontSize: 13, marginTop: 8, fontWeight: 700 }}>🎉 Bonus: +{score >= 10 ? 100 : 50} for {score >= 10 ? 'perfect' : 'great'} score!</div>}
          </div>
          <GameBtn onClick={onClose}>Continue</GameBtn>
        </div>
      )}
    </GameShell>
  );
}
