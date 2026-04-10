'use client'

import React, { useState, useEffect, useRef } from 'react';
import { HelpCircle, X } from 'lucide-react';

function StopClockGame({ onClose, onWin, closing }) {
  const [gameState, setGameState] = useState('ready'); // ready, spinning, stopped
  const [currentNum, setCurrentNum] = useState(0);
  const [targetNum, setTargetNum] = useState(null);
  const [stoppedNum, setStoppedNum] = useState(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const intervalRef = useRef(null);

  const startSpin = () => {
    const target = Math.floor(Math.random() * 100);
    setTargetNum(target);
    setGameState('spinning');
    setStoppedNum(null);

    let num = 0;
    intervalRef.current = setInterval(() => {
      num = (num + 1) % 100;
      setCurrentNum(num);
    }, 40);
  };

  const stopSpin = () => {
    clearInterval(intervalRef.current);
    setStoppedNum(currentNum);
    setGameState('stopped');

    const diff = Math.abs(currentNum - targetNum);
    const minDiff = Math.min(diff, 100 - diff);
    const prize = minDiff === 0 ? 1000 : minDiff <= 2 ? 500 : minDiff <= 5 ? 200 : minDiff <= 10 ? 100 : minDiff <= 20 ? 50 : 0;
    if (prize > 0) onWin(prize, { diff: minDiff });
  };

  useEffect(() => {
    return () => clearInterval(intervalRef.current);
  }, []);

  const getDiff = () => {
    if (stoppedNum === null || targetNum === null) return null;
    const diff = Math.abs(stoppedNum - targetNum);
    return Math.min(diff, 100 - diff);
  };

  const getPrize = () => {
    const d = getDiff();
    if (d === null) return 0;
    return d === 0 ? 1000 : d <= 2 ? 500 : d <= 5 ? 200 : d <= 10 ? 100 : d <= 20 ? 50 : 0;
  };

  // Calculate dial rotation (0-99 mapped to 0-360 degrees)
  const dialRotation = (currentNum / 100) * 360;

  return (
    <div className={`fixed inset-0 bg-black/95 flex items-center justify-center z-[70] p-4 ${closing ? "anim-backdrop-close" : "anim-fade-in"}`} onClick={onClose}>
      <div className={`bg-gradient-to-b from-[#0a1520] to-[#030810] rounded-3xl max-w-md w-full p-6 border-0 ${closing ? "anim-modal-close" : "anim-scale-in"}`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <button type="button" onClick={() => setShowTutorial(true)} className="p-2 hover:bg-white/10 rounded-full">
            <HelpCircle className="w-6 h-6 text-cyan-400" />
          </button>
          <h2 className="text-2xl font-bold">⏱️ Stop the Clock</h2>
          <button type="button" onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Target display */}
        {targetNum !== null && (
          <div className="text-center mb-4">
            <span className="text-gray-400">Target: </span>
            <span className="text-2xl font-black text-green-400">{String(targetNum).padStart(2, '0')}</span>
          </div>
        )}

        {/* Clock Display */}
        <div className="relative w-56 h-56 mx-auto mb-6">
          {/* Outer ring */}
          <svg viewBox="0 0 200 200" className="w-full h-full">
            <defs>
              <linearGradient id="clockGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>
            </defs>
            <circle cx="100" cy="100" r="96" fill="none" stroke="#231a40" strokeWidth="6" />
            <circle cx="100" cy="100" r="96" fill="none" stroke="url(#clockGrad)" strokeWidth="3" opacity="0.6" />

            {/* Tick marks */}
            {Array.from({ length: 20 }, (_, i) => {
              const a = (i * 18 - 90) * Math.PI / 180;
              const r1 = 86, r2 = 93;
              return (
                <line key={i}
                  x1={100 + r1 * Math.cos(a)} y1={100 + r1 * Math.sin(a)}
                  x2={100 + r2 * Math.cos(a)} y2={100 + r2 * Math.sin(a)}
                  stroke={i % 5 === 0 ? '#a855f7' : '#4b3a6e'} strokeWidth={i % 5 === 0 ? 2.5 : 1.5}
                />
              );
            })}

            {/* Target marker */}
            {targetNum !== null && (() => {
              const ta = ((targetNum / 100) * 360 - 90) * Math.PI / 180;
              return (
                <circle cx={100 + 82 * Math.cos(ta)} cy={100 + 82 * Math.sin(ta)} r="5" fill="#22c55e" opacity="0.8">
                  <animate attributeName="r" values="5;7;5" dur="1s" repeatCount="indefinite" />
                </circle>
              );
            })()}

            {/* Spinning needle */}
            {gameState !== 'ready' && (() => {
              const na = (dialRotation - 90) * Math.PI / 180;
              return (
                <line
                  x1="100" y1="100"
                  x2={100 + 70 * Math.cos(na)} y2={100 + 70 * Math.sin(na)}
                  stroke="#fbbf24" strokeWidth="3" strokeLinecap="round"
                />
              );
            })()}

            {/* Center dot */}
            <circle cx="100" cy="100" r="8" fill="#0a1520" stroke="#fbbf24" strokeWidth="2" />
          </svg>

          {/* Number display */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={`text-5xl font-black tabular-nums ${gameState === 'spinning' ? 'text-white' : stoppedNum !== null ? (getDiff() <= 5 ? 'text-green-400' : 'text-yellow-400') : 'text-gray-500'}`}>
              {String(gameState === 'ready' ? '00' : currentNum).padStart(2, '0')}
            </div>
          </div>
        </div>

        {/* Buttons / Result */}
        {gameState === 'ready' && (
          <button
            type="button"
            onClick={startSpin}
            className="w-full py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 shadow-lg shadow-cyan-500/30 hover:scale-[1.02] active:scale-95 transition-all"
          >
            ⏱️ Start Clock!
          </button>
        )}

        {gameState === 'spinning' && (
          <button
            type="button"
            onClick={stopSpin}
            className="w-full py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 shadow-lg shadow-red-500/30 hover:scale-[1.02] active:scale-95 transition-all animate-pulse"
          >
            🛑 STOP!
          </button>
        )}

        {gameState === 'stopped' && (
          <div className="text-center" style={{ animation: 'resultZoom 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both' }}>
            <div className="flex items-center justify-center gap-6 mb-3">
              <div className="text-center">
                <div className="text-sm text-gray-400">Target</div>
                <div className="text-3xl font-black text-green-400">{String(targetNum).padStart(2, '0')}</div>
              </div>
              <div className="text-2xl text-gray-500">vs</div>
              <div className="text-center">
                <div className="text-sm text-gray-400">You</div>
                <div className="text-3xl font-black text-yellow-400" style={{ animation: 'diceLand 0.3s ease-out both' }}>{String(stoppedNum).padStart(2, '0')}</div>
              </div>
            </div>
            <div className="text-lg text-gray-300 mb-2">Off by {getDiff()}</div>
            <div className={`text-2xl font-black mb-4 ${getPrize() >= 200 ? 'text-green-400' : getPrize() > 0 ? 'text-yellow-400' : 'text-gray-400'}`}
              style={{ animation: getPrize() > 0 ? 'correctPop 0.4s ease 0.3s both' : 'wrongShake 0.5s ease 0.2s both' }}>
              {getPrize() > 0 ? `🎉 +${getPrize()} Coins!` : 'Too far! Try again'}
            </div>
            <button
              type="button"
              onClick={() => { setGameState('ready'); setCurrentNum(0); setTargetNum(null); setStoppedNum(null); }}
              className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 rounded-xl font-bold"
            >
              Try Again ⏱️
            </button>
          </div>
        )}

        {/* Prize table */}
        {gameState === 'ready' && (
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-green-500/10 rounded-lg p-2 border border-green-500/20">
              <div className="text-green-400 font-bold">Exact</div>
              <div className="text-white font-bold">1000</div>
            </div>
            <div className="bg-yellow-500/10 rounded-lg p-2 border border-yellow-500/20">
              <div className="text-yellow-400 font-bold">±5</div>
              <div className="text-white font-bold">200</div>
            </div>
            <div className="bg-cyan-500/10 rounded-lg p-2 border-0">
              <div className="text-cyan-400 font-bold">±10</div>
              <div className="text-white font-bold">100</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default StopClockGame;
