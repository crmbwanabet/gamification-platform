'use client';

import { useState } from 'react';
import { HelpCircle, X, ChevronDown, ChevronUp } from 'lucide-react';
import TutorialModal from '../modals/TutorialModal';

export default function HighLowGame({ onClose, onWin, closing }) {
  const [current, setCurrent] = useState({ v: Math.floor(Math.random() * 13) + 1, s: '♠' });
  const [next, setNext] = useState(null);
  const [revealing, setRevealing] = useState(false);
  const [streak, setStreak] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);

  const suits = ['♠', '♥', '♦', '♣'];
  const display = (v) => v === 1 ? 'A' : v === 11 ? 'J' : v === 12 ? 'Q' : v === 13 ? 'K' : v;
  const isRed = (s) => s === '♥' || s === '♦';

  const guess = (higher) => {
    if (revealing) return;
    setRevealing(true);

    const newV = Math.floor(Math.random() * 13) + 1;
    const newS = suits[Math.floor(Math.random() * 4)];

    setTimeout(() => {
      setNext({ v: newV, s: newS });

      setTimeout(() => {
        const correct = higher ? newV >= current.v : newV <= current.v;

        if (correct) {
          setStreak(s => s + 1);
          setCurrent({ v: newV, s: newS });
          setNext(null);
          setRevealing(false);
        } else {
          setGameOver(true);
          if (streak > 0) onWin(streak * 25);
        }
      }, 600);
    }, 300);
  };

  const Card = ({ value, suit, faceDown, isRevealing }) => (
    <div className={`w-24 h-36 rounded-xl flex items-center justify-center shadow-2xl ${faceDown ? 'bg-gradient-to-br from-blue-800 to-blue-950' : `bg-white ${isRed(suit) ? 'text-red-600' : 'text-gray-900'}`}`}
      style={{ animation: isRevealing ? 'cardFlipIn 0.4s ease both' : 'none' }}>
      {faceDown ? (
        <span className="text-4xl">🎴</span>
      ) : (
        <div className="text-center">
          <div className="text-2xl font-bold">{display(value)}</div>
          <div className="text-4xl">{suit}</div>
        </div>
      )}
    </div>
  );

  return (
    <div className={`fixed inset-0 bg-[#1a0d26]/95 flex items-center justify-center z-[70] p-4 ${closing ? "anim-backdrop-close" : "anim-fade-in"}`} onClick={onClose}>
      {showTutorial && <TutorialModal tutorialKey="highlow" onClose={() => setShowTutorial(false)} />}

      <div className={`bg-gradient-to-b from-[#0a1520] to-[#030810] rounded-3xl max-w-md w-full p-6 border-0 ${closing ? "anim-modal-close" : "anim-scale-in"}`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <button type="button" onClick={() => setShowTutorial(true)} className="p-2 hover:bg-white/10 rounded-full">
            <HelpCircle className="w-6 h-6 text-purple-400" />
          </button>
          <h2 className="text-2xl font-bold">🃏 Higher or Lower</h2>
          <button type="button" onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex justify-center gap-4 mb-6">
          <div className="px-4 py-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-xl border border-yellow-500/30" style={{ animation: streak >= 3 ? 'streakFire 0.6s ease-in-out infinite' : 'none' }}>
            <span className="text-yellow-400 font-bold">🔥 Streak: {streak}</span>
          </div>
          <div className="px-4 py-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-xl border-2 border-green-500/40">
            <span className="text-green-400 font-bold">{streak * 25} Coins</span>
          </div>
        </div>

        <div className="flex justify-center items-center gap-6 mb-8">
          <div className="text-center">
            <p className="text-xs text-gray-400 mb-2">Current</p>
            <Card value={current.v} suit={current.s} />
          </div>
          <div className="text-3xl text-gray-500">→</div>
          <div className="text-center">
            <p className="text-xs text-gray-400 mb-2">Next</p>
            {next ? <Card value={next.v} suit={next.s} isRevealing={revealing} /> : <Card faceDown />}
          </div>
        </div>

        {!gameOver && !revealing && (
          <>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <button
                type="button"
                onClick={() => guess(false)}
                className="py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 rounded-xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30"
              >
                <ChevronDown className="w-6 h-6" /> LOWER
              </button>
              <button
                type="button"
                onClick={() => guess(true)}
                className="py-4 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 rounded-xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg shadow-red-500/30"
              >
                HIGHER <ChevronUp className="w-6 h-6" />
              </button>
            </div>
            {streak > 0 && (
              <button
                type="button"
                onClick={() => { onWin(streak * 25); onClose(); }}
                className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-xl font-bold shadow-lg shadow-green-500/30"
              >
                💰 Cash Out ({streak * 25} Coins)
              </button>
            )}
          </>
        )}

        {revealing && !gameOver && (
          <p className="text-center text-xl text-purple-400" style={{ animation: 'pulseGlow 1s ease-in-out infinite' }}>Revealing...</p>
        )}

        {gameOver && (
          <div className="text-center p-4 bg-red-500/20 rounded-xl border border-red-500/50" style={{ animation: 'resultZoom 0.5s cubic-bezier(0.25, 1, 0.5, 1) both' }}>
            <div className="text-5xl mb-2" style={{ animation: 'wrongShake 0.6s ease both' }}>💔</div>
            <div className="text-2xl font-bold text-red-400 mb-2">Game Over!</div>
            <p className="text-gray-300 mb-4">
              {streak > 0 ? `You won ${streak * 25} Coins!` : 'Better luck next time!'}
            </p>
            <button
              type="button"
              onClick={() => {
                setGameOver(false);
                setStreak(0);
                setNext(null);
                setRevealing(false);
                setCurrent({ v: Math.floor(Math.random() * 13) + 1, s: '♠' });
              }}
              className="px-8 py-3 bg-gradient-to-r from-purple-500 to-purple-700 rounded-xl font-bold"
            >
              Play Again 🃏
            </button>
          </div>
        )}
      </div>
    </div>
  );
}