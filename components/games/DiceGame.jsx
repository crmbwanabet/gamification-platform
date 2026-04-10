'use client';

import { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';
import TutorialModal from '../modals/TutorialModal';

export default function DiceGame({ onClose, onWin, closing }) {
  const [dice1, setDice1] = useState(1);
  const [dice2, setDice2] = useState(1);
  const [rolling, setRolling] = useState(false);
  const [guess, setGuess] = useState(null);
  const [result, setResult] = useState(null);
  const [showTutorial, setShowTutorial] = useState(false);

  const roll = () => {
    if (rolling || guess === null) return;
    setRolling(true);
    setResult(null);

    let frame = 0;
    const interval = setInterval(() => {
      setDice1(Math.floor(Math.random() * 6) + 1);
      setDice2(Math.floor(Math.random() * 6) + 1);
      frame++;

      if (frame >= 20) {
        clearInterval(interval);
        const d1 = Math.floor(Math.random() * 6) + 1;
        const d2 = Math.floor(Math.random() * 6) + 1;
        setDice1(d1);
        setDice2(d2);

        const total = d1 + d2;
        const won = total === guess;
        const close = Math.abs(total - guess) <= 2 && !won;
        const prize = won ? 500 : close ? 100 : 0;

        setResult({ total, won, close, prize });
        setRolling(false);
        if (prize > 0) onWin(prize);
      }
    }, 60);
  };

  const DiceFace = ({ value, color = 'red' }) => {
    const dots = {
      1: [[50,50]],
      2: [[25,25],[75,75]],
      3: [[25,25],[50,50],[75,75]],
      4: [[25,25],[75,25],[25,75],[75,75]],
      5: [[25,25],[75,25],[50,50],[25,75],[75,75]],
      6: [[25,25],[75,25],[25,50],[75,50],[25,75],[75,75]]
    };

    return (
      <div
        className={`w-24 h-24 rounded-2xl shadow-2xl transition-transform duration-200 ${rolling ? '' : 'hover:scale-105'}`}
        style={{
          background: color === 'red' ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
          animation: rolling ? 'diceRollSpin 0.6s ease infinite' : (result && !rolling ? 'diceLand 0.4s ease-out both' : 'none'),
          boxShadow: `0 8px 24px ${color === 'red' ? 'rgba(239,68,68,0.3)' : 'rgba(59,130,246,0.3)'}`,
        }}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full p-2">
          {dots[value]?.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="12" fill="white" className="drop-shadow-md" />
          ))}
        </svg>
      </div>
    );
  };

  return (
    <div className={`fixed inset-0 bg-black/95 flex items-center justify-center z-[70] p-4 ${closing ? "anim-backdrop-close" : "anim-fade-in"}`} onClick={onClose}>
      {showTutorial && <TutorialModal tutorialKey="dice" onClose={() => setShowTutorial(false)} />}

      <div className={`bg-gradient-to-b from-[#0a1520] to-[#030810] rounded-3xl max-w-md w-full p-6 border-0 ${closing ? "anim-modal-close" : "anim-scale-in"}`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <button type="button" onClick={() => setShowTutorial(true)} className="p-2 hover:bg-white/10 rounded-full">
            <HelpCircle className="w-6 h-6 text-cyan-400" />
          </button>
          <h2 className="text-2xl font-bold">🎲 Lucky Dice</h2>
          <button type="button" onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
            <X className="w-6 h-6" />
          </button>
        </div>

        <p className="text-center text-gray-400 mb-6">Guess the total (2-12) and win big!</p>

        <div className="flex justify-center gap-8 mb-8 py-4">
          <DiceFace value={dice1} color="red" />
          <DiceFace value={dice2} color="blue" />
        </div>

        {!result && (
          <>
            <p className="text-center text-sm text-gray-400 mb-3">Select your guess:</p>
            <div className="grid grid-cols-6 gap-2 mb-6">
              {[2,3,4,5,6,7,8,9,10,11,12].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setGuess(n)}
                  disabled={rolling}
                  className={`py-3 rounded-xl font-bold text-lg transition-all ${guess === n ? 'bg-gradient-to-br from-cyan-400 to-blue-500 scale-110 shadow-lg shadow-cyan-500/50' : 'bg-black/40 hover:bg-cyan-900/30 border border-white/10 hover:scale-105'}`}
                >
                  {n}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={roll}
              disabled={rolling || guess === null}
              className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${rolling || guess === null ? 'bg-gray-600' : 'bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 shadow-lg shadow-red-500/30'}`}
            >
              {rolling ? '🎲 Rolling...' : '🎲 Roll Dice!'}
            </button>
          </>
        )}

        {result && (
          <div className="text-center" style={{ animation: 'resultZoom 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both' }}>
            <div className="text-6xl mb-4" style={{ animation: result.won ? 'symbolPop 0.5s ease both, float 2s ease-in-out 0.5s infinite' : 'symbolPop 0.4s ease both' }}>{result.won ? '🎯' : result.close ? '👍' : '😢'}</div>
            <p className="text-xl mb-2">
              Total: <span className="text-4xl text-yellow-400 font-black">{result.total}</span>
            </p>
            <p className={`text-2xl font-bold mb-6 ${result.won ? 'text-green-400' : result.close ? 'text-yellow-400' : 'text-gray-400'}`} style={{ animation: result.won ? 'correctPop 0.5s ease both' : result.prize === 0 ? 'wrongShake 0.5s ease both' : 'none' }}>
              {result.won ? `🎉 EXACT! +${result.prize} Coins!` : result.close ? `Close! +${result.prize} Coins` : 'Better luck next time!'}
            </p>
            <button
              type="button"
              onClick={() => { setResult(null); setGuess(null); }}
              className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 rounded-xl font-bold text-lg"
            >
              Play Again 🎲
            </button>
          </div>
        )}
      </div>
    </div>
  );
}