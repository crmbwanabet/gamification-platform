'use client';

import { useState, useEffect } from 'react';
import { HelpCircle, X } from 'lucide-react';
import TutorialModal from '../modals/TutorialModal';

export default function MemoryGame({ onClose, onWin, closing }) {
  const symbols = ['🎁', '💎', '⭐', '🏆', '👑', '🎰', '🍀', '💰'];
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [moves, setMoves] = useState(0);
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    setCards([...symbols, ...symbols]
      .sort(() => Math.random() - 0.5)
      .map((s, i) => ({ id: i, symbol: s })));
  }, []);

  const flip = (id) => {
    if (flipped.length === 2 || flipped.includes(id) || matched.includes(id)) return;

    const newFlipped = [...flipped, id];
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      const [a, b] = newFlipped;

      if (cards[a].symbol === cards[b].symbol) {
        const newMatched = [...matched, a, b];
        setMatched(newMatched);
        setFlipped([]);

        if (newMatched.length === cards.length) {
          const prize = Math.max(300 - moves * 10, 50);
          setTimeout(() => onWin(prize, { moves: moves + 1 }), 300);
        }
      } else {
        setTimeout(() => setFlipped([]), 800);
      }
    }
  };

  const complete = matched.length === cards.length;
  const prize = Math.max(300 - moves * 10, 50);

  return (
    <div className={`fixed inset-0 bg-black/95 flex items-center justify-center z-[70] p-4 ${closing ? "anim-backdrop-close" : "anim-fade-in"}`} onClick={onClose}>
      {showTutorial && <TutorialModal tutorialKey="memory" onClose={() => setShowTutorial(false)} />}

      <div className={`bg-gradient-to-b from-[#0a1520] to-[#030810] rounded-3xl max-w-md w-full p-6 border-0 ${closing ? "anim-modal-close" : "anim-scale-in"}`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <button type="button" onClick={() => setShowTutorial(true)} className="p-2 hover:bg-white/10 rounded-full">
            <HelpCircle className="w-6 h-6 text-cyan-400" />
          </button>
          <h2 className="text-2xl font-bold">🧠 Memory Match</h2>
          <button type="button" onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex justify-center gap-6 mb-4">
          <div className="text-center px-4 py-2 bg-black/50 rounded-xl border border-white/10">
            <div className="text-xl font-bold text-yellow-400">{moves}</div>
            <div className="text-xs text-gray-400">Moves</div>
          </div>
          <div className="text-center px-4 py-2 bg-black/50 rounded-xl border border-white/10">
            <div className="text-xl font-bold text-green-400">{matched.length/2}/{symbols.length}</div>
            <div className="text-xs text-gray-400">Pairs</div>
          </div>
          <div className="text-center px-4 py-2 bg-black/50 rounded-xl border border-white/10">
            <div className="text-xl font-bold text-cyan-400">{prize}</div>
            <div className="text-xs text-gray-400">Prize</div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-4">
          {cards.map(card => {
            const isFlipped = flipped.includes(card.id) || matched.includes(card.id);
            const isMatched = matched.includes(card.id);

            return (
              <button
                key={card.id}
                type="button"
                onClick={() => flip(card.id)}
                disabled={isFlipped}
                className={`aspect-square rounded-xl text-3xl flex items-center justify-center font-bold ${isFlipped ? (isMatched ? 'bg-green-500/30 border-2 border-green-400' : 'bg-gradient-to-br from-yellow-400 to-orange-500') : 'bg-gradient-to-br from-cyan-500 to-blue-500 hover:scale-105 hover:shadow-lg hover:shadow-cyan-500/50'}`}
                style={{
                  animation: isMatched ? 'correctPop 0.4s ease both' : isFlipped ? 'cardFlipIn 0.3s ease both' : 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                {isFlipped ? card.symbol : '?'}
              </button>
            );
          })}
        </div>

        {complete && (
          <div className="text-center p-4 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-xl border border-green-500/50" style={{ animation: 'resultZoom 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both' }}>
            <div className="text-5xl mb-2" style={{ animation: 'symbolPop 0.5s ease both, float 2s ease-in-out 0.5s infinite' }}>🎉</div>
            <div className="text-2xl font-bold text-green-400 mb-1">Complete!</div>
            <p className="text-gray-300">Finished in {moves} moves</p>
            <p className="text-yellow-400 font-bold text-xl" style={{ animation: 'correctPop 0.4s ease 0.3s both' }}>+{prize} Coins</p>
          </div>
        )}
      </div>
    </div>
  );
}