'use client'

import React, { useState, useEffect, useRef } from 'react';
import { HelpCircle, X } from 'lucide-react';

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
      { emoji: '🪙', points: 1, size: 48, color: '#fbbf24' },
      { emoji: '💎', points: 3, size: 40, color: '#a855f7' },
      { emoji: '⭐', points: 2, size: 44, color: '#3b82f6' },
      { emoji: '💚', points: 5, size: 36, color: '#22c55e' },
      { emoji: '💣', points: -3, size: 42, color: '#ef4444' },
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
    <div className={`fixed inset-0 bg-[#1a0d26]/95 flex items-center justify-center z-[70] p-4 ${closing ? "anim-backdrop-close" : "anim-fade-in"}`} onClick={onClose}>
      <div className={`bg-gradient-to-b from-[#0a1520] to-[#030810] rounded-3xl max-w-md w-full p-6 border-0 ${closing ? "anim-modal-close" : "anim-scale-in"}`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <button type="button" onClick={() => setShowTutorial(true)} className="p-2 hover:bg-white/10 rounded-full">
            <HelpCircle className="w-6 h-6 text-purple-400" />
          </button>
          <h2 className="text-2xl font-bold">⚡ Tap Frenzy</h2>
          <button type="button" onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Score & Timer */}
        {gameState !== 'ready' && (
          <div className="flex justify-between items-center mb-4">
            <div className="text-xl font-bold">Score: <span className="text-yellow-400">{score}</span></div>
            <div className={`text-xl font-bold px-4 py-1 rounded-full ${timeLeft <= 3 ? 'bg-red-500/30 text-red-400 animate-pulse' : 'bg-purple-500/20 text-purple-300'}`}>
              ⏱️ {timeLeft}s
            </div>
          </div>
        )}

        {/* Game Area */}
        <div
          className="relative rounded-2xl border-0 overflow-hidden"
          style={{ height: 350, background: 'radial-gradient(ellipse at center, #0a1520 0%, #050a15 100%)' }}
        >
          {gameState === 'ready' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-6xl mb-4">⚡</div>
              <p className="text-gray-400 text-center mb-2 px-4">Tap coins & gems as fast as you can! Avoid bombs 💣</p>
              <p className="text-sm text-gray-500 mb-6">You have 10 seconds</p>
              <button
                type="button"
                onClick={startGame}
                className="px-8 py-4 bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 rounded-xl font-bold text-lg shadow-lg shadow-orange-500/30 hover:scale-105 active:scale-95 transition-all"
              >
                ⚡ START!
              </button>
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
                  className="absolute transition-transform duration-100 hover:scale-125 active:scale-75 anim-scale-in"
                  style={{
                    left: `${t.x}%`, top: `${t.y}%`,
                    fontSize: t.size,
                    filter: `drop-shadow(0 0 8px ${t.color})`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  {t.emoji}
                </button>
              ))}

              {/* Tap score popups */}
              {taps.map(tap => (
                <div
                  key={tap.id}
                  className="absolute font-black text-xl pointer-events-none"
                  style={{
                    left: `${tap.x}%`, top: `${tap.y - 5}%`,
                    color: tap.points > 0 ? '#22c55e' : '#ef4444',
                    animation: 'scorePopUp 0.7s ease-out forwards',
                    textShadow: tap.points > 0 ? '0 0 10px rgba(34,197,94,0.5)' : '0 0 10px rgba(239,68,68,0.5)',
                  }}
                >
                  {tap.points > 0 ? `+${tap.points}` : tap.points}
                </div>
              ))}
            </>
          )}

          {gameState === 'done' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ animation: 'resultZoom 0.5s cubic-bezier(0.25, 1, 0.5, 1) both' }}>
              <div className="text-6xl mb-3" style={{ animation: 'symbolPop 0.5s ease both, float 2s ease-in-out 0.5s infinite' }}>{score >= 20 ? '🏆' : score >= 10 ? '⭐' : '👏'}</div>
              <div className="text-4xl font-black text-yellow-400 mb-2">{score} Points</div>
              <div className="text-xl text-green-400 font-bold mb-6" style={{ animation: 'correctPop 0.4s ease 0.3s both' }}>+{getPrize()} Coins!</div>
              <button
                type="button"
                onClick={() => { setGameState('ready'); setScore(0); setTimeLeft(10); }}
                className="px-8 py-3 bg-gradient-to-r from-purple-500 to-purple-700 hover:from-purple-600 hover:to-purple-800 rounded-xl font-bold"
              >
                Play Again ⚡
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TapFrenzyGame;
