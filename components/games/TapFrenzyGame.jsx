'use client'

import React, { useState, useEffect, useRef } from 'react';
import { C } from '@/components/redesign/tokens';
import { RewardIcon } from '@/components/redesign/RedesignShell';
import TutorialModal from '../modals/TutorialModal';
import { GameShell, GameBtn } from './gameKit';

function TapFrenzyGame({ onClose, onWin, closing }) {
  const [gameState, setGameState] = useState('ready'); // ready, playing, done
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [targets, setTargets] = useState([]);
  const [taps, setTaps] = useState([]);
  const [showTutorial, setShowTutorial] = useState(false);
  const timerRef = useRef(null);
  const targetRef = useRef(null);

  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setTimeLeft(10);
    setTaps([]);
    spawnTarget();

    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          clearTimeout(targetRef.current);
          setGameState('done');
          setTargets([]);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  const spawnTarget = () => {
    const types = [
      { emoji: '🪙', points: 1, size: 48, color: C.gold },
      { emoji: '💎', points: 3, size: 40, color: C.teal },
      { emoji: '⭐', points: 2, size: 44, color: C.gold },
      { emoji: '💚', points: 5, size: 36, color: C.green },
      { emoji: '💣', points: -3, size: 42, color: C.red },
    ];
    const weights = [40, 15, 25, 10, 10];
    const rand = Math.random() * 100;
    let sum = 0;
    let type = types[0];
    for (let i = 0; i < types.length; i++) {
      sum += weights[i];
      if (rand < sum) { type = types[i]; break; }
    }

    const target = {
      id: Date.now(),
      x: 10 + Math.random() * 75,
      y: 10 + Math.random() * 65,
      ...type,
    };
    setTargets([target]);

    targetRef.current = setTimeout(() => {
      setTargets(prev => prev.filter(t => t.id !== target.id));
      spawnTarget();
    }, 800 + Math.random() * 600);
  };

  const tapTarget = (target, e) => {
    e.stopPropagation();
    setScore(s => Math.max(0, s + target.points));
    setTaps(prev => [...prev.slice(-8), { id: Date.now(), x: target.x, y: target.y, points: target.points }]);
    setTargets(prev => prev.filter(t => t.id !== target.id));
    clearTimeout(targetRef.current);
    spawnTarget();
  };

  useEffect(() => {
    if (gameState === 'done') {
      const prize = score >= 30 ? 300 : score >= 20 ? 200 : score >= 10 ? 100 : score >= 5 ? 50 : 10;
      if (prize > 0) onWin(prize, { score });
    }
    return () => { clearInterval(timerRef.current); clearTimeout(targetRef.current); };
  }, [gameState]);

  const getPrize = () => score >= 30 ? 300 : score >= 20 ? 200 : score >= 10 ? 100 : score >= 5 ? 50 : 10;

  return (
    <GameShell title="⚡ Tap Frenzy" onClose={onClose} closing={closing} onHelp={() => setShowTutorial(true)}>
      {showTutorial && <TutorialModal tutorialKey="tapfrenzy" onClose={() => setShowTutorial(false)} />}

      {/* Score & Timer */}
      {gameState !== 'ready' && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>
            Score: <span style={{ color: C.gold }}>{score}</span>
          </div>
          <div style={{
            fontSize: 16, fontWeight: 800, padding: '4px 16px', borderRadius: 999,
            background: timeLeft <= 3 ? 'rgba(229,87,63,.24)' : 'rgba(53,179,166,.18)',
            color: timeLeft <= 3 ? C.red : C.teal,
            animation: timeLeft <= 3 ? 'pulseGlow 1s ease-in-out infinite' : 'none',
          }}>
            ⏱️ {timeLeft}s
          </div>
        </div>
      )}

      {/* Game Area */}
      <div
        style={{ position: 'relative', height: 350, borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(255,255,255,.09)', background: C.track }}
      >
        {gameState === 'ready' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ fontSize: 60, marginBottom: 16 }}>⚡</div>
            <p style={{ color: C.sub, textAlign: 'center', marginBottom: 8, fontSize: 14 }}>Tap coins & gems as fast as you can! Avoid bombs 💣</p>
            <p style={{ fontSize: 13, color: C.muted, marginBottom: 24 }}>You have 10 seconds</p>
            <GameBtn onClick={startGame} full={false} style={{ padding: '14px 32px', fontSize: 17 }}>⚡ START!</GameBtn>
          </div>
        )}

        {gameState === 'playing' && (
          <>
            {/* Targets */}
            {targets.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={(e) => tapTarget(t, e)}
                className="anim-scale-in"
                style={{
                  position: 'absolute',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'transform .1s',
                  left: `${t.x}%`, top: `${t.y}%`,
                  fontSize: t.size,
                  filter: `drop-shadow(0 0 8px ${t.color})`,
                  transform: 'translate(-50%, -50%)',
                }}
                onMouseDown={(e) => { e.currentTarget.style.transform = 'translate(-50%, -50%) scale(.75)'; }}
                onMouseUp={(e) => { e.currentTarget.style.transform = 'translate(-50%, -50%)'; }}
              >
                {t.emoji}
              </button>
            ))}

            {/* Tap score popups */}
            {taps.map(tap => (
              <div
                key={tap.id}
                style={{
                  position: 'absolute',
                  fontWeight: 900,
                  fontSize: 20,
                  pointerEvents: 'none',
                  left: `${tap.x}%`, top: `${tap.y - 5}%`,
                  color: tap.points > 0 ? C.green : C.red,
                  animation: 'scorePopUp 0.7s ease-out forwards',
                  textShadow: tap.points > 0 ? '0 0 10px rgba(79,169,139,0.5)' : '0 0 10px rgba(229,87,63,0.5)',
                }}
              >
                {tap.points > 0 ? `+${tap.points}` : tap.points}
              </div>
            ))}
          </>
        )}

        {gameState === 'done' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', animation: 'resultZoom 0.5s cubic-bezier(0.25, 1, 0.5, 1) both' }}>
            <div style={{ fontSize: 60, marginBottom: 12, animation: 'symbolPop 0.5s ease both, float 2s ease-in-out 0.5s infinite' }}>{score >= 20 ? '🏆' : score >= 10 ? '⭐' : '👏'}</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: C.gold, marginBottom: 8 }}>{score} Points</div>
            <div style={{ fontSize: 20, color: C.green, fontWeight: 800, marginBottom: 24, display: 'inline-flex', alignItems: 'center', gap: 6, animation: 'correctPop 0.4s ease 0.3s both' }}>
              +{getPrize()} <RewardIcon kind="coins" size={18} />
            </div>
            <GameBtn onClick={() => { setGameState('ready'); setScore(0); setTimeLeft(10); }} full={false} style={{ padding: '12px 30px' }}>Play Again ⚡</GameBtn>
          </div>
        )}
      </div>
    </GameShell>
  );
}

export default TapFrenzyGame;
