'use client';

import React, { useState, useEffect, useRef } from 'react';
import { getRandomQuestion } from '../../lib/data/trivia';
import { C } from '@/components/redesign/tokens';
import { RewardIcon } from '@/components/redesign/RedesignShell';
import { GameShell, GameBtn, OptionBtn } from './gameKit';

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

  return (
    <GameShell title="🔥 Streak Trivia" onClose={onClose} closing={closing}>
      {phase === 'playing' && (
        <p style={{ textAlign: 'center', color: C.gold, fontSize: 12.5, fontWeight: 700, margin: '-6px 0 14px' }}>Answer or Cash Out!</p>
      )}

      {/* Ready Screen */}
      {phase === 'ready' && (
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <div style={{ width: 112, height: 112, borderRadius: '50%', background: 'rgba(230,173,74,.14)', border: `1px solid ${C.gold}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', boxShadow: '0 0 40px rgba(230,173,74,.15), inset 0 0 30px rgba(230,173,74,.08)' }}>
            <span style={{ fontSize: 58 }}>🔥</span>
          </div>
          <h3 style={{ fontSize: 20, fontWeight: 900, marginBottom: 14, color: C.text }}>How Far Can You Go?</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24, fontSize: 13.5 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,.04)', borderRadius: 11, padding: 12 }}>
              <span style={{ fontSize: 20 }}>🪙</span>
              <span style={{ color: C.sub }}>Earn <span style={{ color: C.gold, fontWeight: 700 }}>25 Coins</span> per correct answer</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,255,255,.04)', borderRadius: 11, padding: 12 }}>
              <span style={{ fontSize: 20 }}>💰</span>
              <span style={{ color: C.sub }}><span style={{ color: C.green, fontWeight: 700 }}>Cash out</span> anytime to keep coins</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(229,87,63,.1)', borderRadius: 11, padding: 12, border: `1px solid ${C.red}33` }}>
              <span style={{ fontSize: 20 }}>💥</span>
              <span style={{ color: C.sub }}>Wrong answer = <span style={{ color: C.red, fontWeight: 700 }}>lose everything!</span></span>
            </div>
          </div>
          <GameBtn onClick={startGame}>Start Streak!</GameBtn>
        </div>
      )}

      {/* Playing */}
      {phase === 'playing' && question && (
        <div>
          {/* Streak Bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 900, color: C.gold, animation: streak >= 3 ? 'streakFire 0.6s ease-in-out infinite' : 'none' }}>
                  <span style={{ fontSize: 18 }}>🔥</span>
                  <span style={{ fontSize: 20 }}>{streak}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(230,173,74,.15)', padding: '4px 12px', borderRadius: 99, border: `1px solid ${C.gold}33` }}>
                  <RewardIcon kind="coins" size={14} />
                  <span style={{ color: C.gold, fontWeight: 900, fontSize: 13 }}>{currentPrize}</span>
                </div>
              </div>
              {/* Streak Milestones */}
              <div style={{ display: 'flex', gap: 4 }}>
                {Array.from({ length: 10 }, (_, i) => (
                  <div key={i} style={{ flex: 1, height: 6, borderRadius: 99, transition: 'all .3s', background: i < streak ? C.green : C.track, boxShadow: i < streak ? `0 0 4px ${C.green}` : 'none' }} />
                ))}
              </div>
            </div>
            {/* Timer */}
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

          {/* Question */}
          <div style={{ background: C.track, borderRadius: 16, padding: 18, border: `1px solid ${C.line}`, marginBottom: 16, boxShadow: `0 0 0 1px rgba(230,173,74,.12)` }}>
            <p style={{ fontWeight: 700, textAlign: 'center', lineHeight: 1.5, color: C.text, margin: 0 }}>{question.q}</p>
          </div>

          {/* Answer Bars */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
            {question.options.map((opt, i) => {
              const isCorrect = opt === question.a;
              const isSelected = opt === selected;
              let dotColor = C.muted;
              const optStyle = { width: '100%', display: 'flex', alignItems: 'center', textAlign: 'left', gap: 12, padding: '13px 14px', fontSize: 14 };
              if (showAnswer && isCorrect) {
                optStyle.background = 'rgba(79,169,139,.18)'; optStyle.border = `2px solid ${C.green}`;
                dotColor = C.green; optStyle.animation = 'correctPop 0.4s ease both';
              } else if (showAnswer && isSelected && !isCorrect) {
                optStyle.background = 'rgba(229,87,63,.18)'; optStyle.border = `2px solid ${C.red}`;
                dotColor = C.red; optStyle.animation = 'wrongShake 0.5s ease both';
              } else if (showAnswer) {
                optStyle.opacity = 0.45;
              }
              return (
                <OptionBtn key={i} onClick={() => selectAnswer(opt)} disabled={showAnswer} style={optStyle}>
                  <span style={{ width: 12, height: 12, borderRadius: '50%', background: dotColor, flex: 'none' }} />
                  <span style={{ flex: 1, fontWeight: 600 }}>{opt}</span>
                  {showAnswer && isCorrect && <span style={{ color: C.green, fontWeight: 700, fontSize: 16 }}>✓</span>}
                  {showAnswer && isSelected && !isCorrect && <span style={{ color: C.red, fontWeight: 700, fontSize: 16 }}>✗</span>}
                </OptionBtn>
              );
            })}
          </div>

          {/* Cash Out Button */}
          {streak > 0 && !showAnswer && (
            <GameBtn onClick={cashOut}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>💰 Cash Out — {currentPrize} Coins</span>
            </GameBtn>
          )}
        </div>
      )}

      {/* Results */}
      {phase === 'result' && (
        <div style={{ textAlign: 'center', padding: '4px 0' }} className="anim-scale-in">
          <div style={{ fontSize: 66, marginBottom: 10, animation: didCashOut ? 'symbolPop 0.5s ease both, float 2s ease-in-out 0.5s infinite' : 'symbolPop 0.4s ease both' }}>
            {didCashOut ? '💰' : '💥'}
          </div>
          <div style={{ fontSize: 40, fontWeight: 900, marginBottom: 2, color: didCashOut ? C.green : C.red }}>
            Streak: {maxStreak || streak}
          </div>
          <div style={{ color: C.sub, marginBottom: 20 }}>
            {didCashOut ? 'Smart move! Coins secured.' : 'Your streak was broken!'}
          </div>
          {didCashOut && currentPrize > 0 && (
            <div style={{ background: C.track, border: `1px solid ${C.line}`, borderRadius: 16, padding: 16, marginBottom: 20 }}>
              <div style={{ color: C.gold, fontWeight: 900, fontSize: 24, marginBottom: 2, display: 'inline-flex', alignItems: 'center', gap: 6 }}>+{currentPrize} <RewardIcon kind="coins" size={20} /></div>
              <div style={{ color: C.muted, fontSize: 11.5 }}>Coins secured</div>
            </div>
          )}
          {!didCashOut && (
            <div style={{ background: 'rgba(229,87,63,.1)', border: `1px solid ${C.red}33`, borderRadius: 16, padding: 16, marginBottom: 20 }}>
              <div style={{ color: C.red, fontWeight: 700, fontSize: 18, marginBottom: 2 }}>0 Coins</div>
              <div style={{ color: C.muted, fontSize: 11.5 }}>Better luck next time!</div>
            </div>
          )}
          <GameBtn onClick={onClose}>Continue</GameBtn>
        </div>
      )}
    </GameShell>
  );
}
