'use client';

import React, { useState, useEffect, useRef } from 'react';
import { getSpeedQuestions } from '../../lib/data/trivia';
import { C } from '@/components/redesign/tokens';
import { RewardIcon } from '@/components/redesign/RedesignShell';
import { GameShell, GameBtn } from './gameKit';

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

  const tfBtnStyle = (accent) => ({
    position: 'relative', padding: '18px 0', borderRadius: 16, fontWeight: 900, fontSize: 20,
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer',
    color: accent, background: 'rgba(255,255,255,.04)', border: `2px solid ${accent}66`,
    transition: 'transform .12s, border-color .15s',
  });

  return (
    <GameShell title="⚡ Speed Round" onClose={onClose} closing={closing}>
      {phase === 'playing' && (
        <p style={{ textAlign: 'center', color: C.gold, fontSize: 12.5, fontWeight: 700, margin: '-6px 0 14px' }}>True or False</p>
      )}

      {/* Ready Screen */}
      {phase === 'ready' && (
        <div style={{ textAlign: 'center', padding: '8px 0' }}>
          <div style={{ width: 112, height: 112, borderRadius: '50%', background: 'rgba(230,173,74,.14)', border: `1px solid ${C.gold}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 22px', boxShadow: '0 0 40px rgba(230,173,74,.15), inset 0 0 30px rgba(230,173,74,.08)' }}>
            <span style={{ fontSize: 58 }}>⚡</span>
          </div>
          <h3 style={{ fontSize: 20, fontWeight: 900, marginBottom: 8, color: C.text }}>20 Questions. 60 Seconds.</h3>
          <p style={{ color: C.sub, fontSize: 13.5, marginBottom: 12 }}>Read each statement and decide:</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 24 }}>
            <span style={{ padding: '8px 16px', borderRadius: 11, background: 'rgba(79,169,139,.15)', border: `2px solid ${C.green}66`, color: C.green, fontWeight: 700, fontSize: 13.5 }}>✓ TRUE</span>
            <span style={{ color: C.muted }}>or</span>
            <span style={{ padding: '8px 16px', borderRadius: 11, background: 'rgba(229,87,63,.15)', border: `2px solid ${C.red}66`, color: C.red, fontWeight: 700, fontSize: 13.5 }}>✗ FALSE</span>
          </div>
          <GameBtn onClick={startGame}>GO!</GameBtn>
        </div>
      )}

      {/* Playing */}
      {phase === 'playing' && questions[qIndex] && (
        <div>
          {/* Timer + Stats Row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            {/* Circular Timer */}
            <div style={{ position: 'relative', width: 80, height: 80, flex: 'none' }}>
              <svg width="80" height="80" viewBox="0 0 80 80" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="40" cy="40" r="38" fill="none" stroke={C.track} strokeWidth="4" />
                <circle cx="40" cy="40" r="38" fill="none"
                  stroke={C.gold} strokeWidth="4" strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={circumference - (timerPct / 100) * circumference}
                  style={{ transition: 'stroke-dashoffset 1s linear' }}
                />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: C.gold }}>
                <span style={{ fontWeight: 900, fontSize: 24, lineHeight: 1, animation: timer <= 5 ? 'timerUrgent 0.5s ease-in-out infinite' : 'none' }}>{timer}</span>
                <span style={{ fontSize: 10, opacity: 0.7 }}>sec</span>
              </div>
            </div>
            {/* Stats */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: C.muted }}>Progress</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: C.gold }}>{qIndex + 1}/20</span>
              </div>
              <div style={{ height: 8, background: C.track, borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', borderRadius: 99, transition: 'width .3s', width: `${((qIndex + 1) / 20) * 100}%`, background: C.green }} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ color: C.green, fontWeight: 900, fontSize: 18 }}>{score}</span>
                  <span style={{ fontSize: 12, color: C.muted }}>correct</span>
                </div>
                {combo >= 2 && (
                  <span style={{ padding: '2px 8px', borderRadius: 99, background: 'rgba(230,173,74,.18)', border: `1px solid ${C.gold}44`, color: C.gold, fontSize: 12, fontWeight: 700, animation: combo >= 3 ? 'streakFire 0.6s ease-in-out infinite' : 'none' }}>
                    🔥 {combo}x combo
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Statement Card */}
          <div style={{ position: 'relative', marginBottom: 24, animation: feedback === 'correct' ? 'correctPop 0.4s ease both' : feedback === 'wrong' ? 'wrongShake 0.5s ease both' : 'none' }}>
            <div style={{
              position: 'relative', borderRadius: 16, padding: 24, minHeight: 120,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background .2s, border-color .2s',
              background: feedback === 'correct' ? 'rgba(79,169,139,.16)' : feedback === 'wrong' ? 'rgba(229,87,63,.16)' : C.track,
              border: `1px solid ${feedback === 'correct' ? C.green : feedback === 'wrong' ? C.red : C.line}`,
            }}>
              {feedback === 'correct' && <div style={{ position: 'absolute', top: 12, right: 14, color: C.green, fontWeight: 700, fontSize: 13 }}>✓ Correct!</div>}
              {feedback === 'wrong' && <div style={{ position: 'absolute', top: 12, right: 14, color: C.red, fontWeight: 700, fontSize: 13 }}>✗ Wrong!</div>}
              <p style={{ fontWeight: 700, textAlign: 'center', lineHeight: 1.5, color: C.text, margin: 0 }}>{questions[qIndex].statement}</p>
            </div>
          </div>

          {/* TRUE / FALSE Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <button type="button" onClick={() => answer(true)} style={tfBtnStyle(C.green)}
              onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(.97)'; }}
              onMouseUp={(e) => { e.currentTarget.style.transform = ''; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = ''; }}>
              <span style={{ fontSize: 22 }}>✓</span> TRUE
            </button>
            <button type="button" onClick={() => answer(false)} style={tfBtnStyle(C.red)}
              onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(.97)'; }}
              onMouseUp={(e) => { e.currentTarget.style.transform = ''; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = ''; }}>
              <span style={{ fontSize: 22 }}>✗</span> FALSE
            </button>
          </div>
        </div>
      )}

      {/* Results */}
      {phase === 'result' && (
        <div style={{ textAlign: 'center', padding: '4px 0' }} className="anim-scale-in">
          <div style={{ fontSize: 66, marginBottom: 10, animation: 'symbolPop 0.5s ease both, float 2s ease-in-out 0.5s infinite' }}>
            {finalScore >= 15 ? '⚡' : finalScore >= 10 ? '🎯' : '👏'}
          </div>
          <div style={{ fontSize: 40, fontWeight: 900, marginBottom: 2, color: C.green }}>{finalScore}/20</div>
          <div style={{ color: C.sub, marginBottom: 20 }}>{finalScore >= 15 ? 'Lightning fast!' : finalScore >= 10 ? 'Quick thinker!' : 'Keep trying!'}</div>
          <div style={{ background: C.track, border: `1px solid ${C.line}`, borderRadius: 16, padding: 16, marginBottom: 20 }}>
            <div style={{ color: C.gold, fontWeight: 900, fontSize: 24, marginBottom: 2, display: 'inline-flex', alignItems: 'center', gap: 6 }}>+{finalCoins} <RewardIcon kind="coins" size={20} /></div>
            <div style={{ color: C.muted, fontSize: 11.5 }}>Coins earned</div>
            {finalScore >= 15 && <div style={{ color: C.green, fontSize: 13, marginTop: 8, fontWeight: 700 }}>⚡ Speed bonus: +{finalScore >= 20 ? 500 : 200}!</div>}
          </div>
          <GameBtn onClick={onClose}>Continue</GameBtn>
        </div>
      )}
    </GameShell>
  );
}
