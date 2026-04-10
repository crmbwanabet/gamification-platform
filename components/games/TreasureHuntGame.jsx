'use client'

import React, { useState, useEffect } from 'react';
import { HelpCircle, X } from 'lucide-react';

function TreasureHuntGame({ onClose, onWin, closing }) {
  const [board, setBoard] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [gameState, setGameState] = useState('playing'); // playing, won, lost
  const [picksLeft, setPicksLeft] = useState(3);
  const [collected, setCollected] = useState(0);
  const [showTutorial, setShowTutorial] = useState(false);

  // Initialize board on mount
  useEffect(() => {
    generateBoard();
  }, []);

  const generateBoard = () => {
    // 5x5 grid = 25 tiles
    // 8 prizes (coins), 5 gems (bigger prize), 3 traps (skull), 9 empty
    const items = [
      ...Array(8).fill({ type: 'coins', emoji: '🪙', value: 25 }),
      ...Array(4).fill({ type: 'gem', emoji: '💎', value: 75 }),
      ...Array(1).fill({ type: 'jackpot', emoji: '👑', value: 500 }),
      ...Array(5).fill({ type: 'trap', emoji: '💀', value: 0 }),
      ...Array(7).fill({ type: 'empty', emoji: '💨', value: 0 }),
    ];

    // Shuffle
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }

    setBoard(items);
    setFlipped([]);
    setPicksLeft(3);
    setCollected(0);
    setGameState('playing');
  };

  const flipTile = (index) => {
    if (flipped.includes(index) || gameState !== 'playing' || picksLeft <= 0) return;

    const tile = board[index];
    setFlipped(prev => [...prev, index]);
    setPicksLeft(p => p - 1);

    if (tile.type === 'trap') {
      // Hit a trap - game over!
      setGameState('lost');
      // Reveal all tiles after short delay
      setTimeout(() => {
        setFlipped(board.map((_, i) => i));
      }, 500);
      // Still give partial winnings
      if (collected > 0) onWin(collected, { survivedNoTrap: false, foundCrown: false });
      return;
    }

    const newTotal = collected + tile.value;
    const hitCrown = tile.type === 'jackpot';
    setCollected(newTotal);

    // Check if last pick
    if (picksLeft <= 1) {
      setGameState('won');
      if (newTotal > 0) onWin(newTotal, { survivedNoTrap: true, foundCrown: hitCrown || flipped.some(fi => board[fi]?.type === 'jackpot') });
      // Reveal all tiles after short delay
      setTimeout(() => {
        setFlipped(board.map((_, i) => i));
      }, 800);
    }
  };

  return (
    <div className={`fixed inset-0 bg-black/95 flex items-center justify-center z-[70] p-4 ${closing ? "anim-backdrop-close" : "anim-fade-in"}`} onClick={onClose}>
      <div className={`bg-gradient-to-b from-[#0a1520] to-[#030810] rounded-3xl max-w-md w-full p-6 border-0 ${closing ? "anim-modal-close" : "anim-scale-in"}`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <button type="button" onClick={() => setShowTutorial(true)} className="p-2 hover:bg-white/10 rounded-full">
            <HelpCircle className="w-6 h-6 text-cyan-400" />
          </button>
          <h2 className="text-2xl font-bold">🗺️ Treasure Hunt</h2>
          <button type="button" onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Status bar */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Picks:</span>
            {[...Array(3)].map((_, i) => (
              <div key={i} className={`w-6 h-6 rounded-full flex items-center justify-center text-sm ${i < picksLeft ? 'bg-yellow-500/30 text-yellow-400' : 'bg-gray-800/40 border border-gray-600/20/50 text-gray-600'}`}>
                {i < picksLeft ? '👆' : '·'}
              </div>
            ))}
          </div>
          <div className="text-lg font-bold">
            Loot: <span className="text-yellow-400">{collected}</span> 🪙
          </div>
        </div>

        {/* Game Board */}
        <div className="grid grid-cols-5 gap-2 mb-4">
          {board.map((tile, i) => {
            const isFlipped = flipped.includes(i);
            return (
              <button
                key={i}
                type="button"
                onClick={() => flipTile(i)}
                disabled={isFlipped || gameState !== 'playing'}
                className={`aspect-square rounded-xl text-2xl flex items-center justify-center transition-all duration-300 ${
                  isFlipped
                    ? tile.type === 'trap'
                      ? 'bg-red-500/30 border border-red-500/50 scale-95'
                      : tile.type === 'jackpot'
                        ? 'bg-yellow-500/30 border border-yellow-500/50'
                        : tile.type === 'gem'
                          ? 'bg-cyan-500/20 border border-cyan-500/40'
                          : tile.value > 0
                            ? 'bg-green-500/20 border border-green-500/40'
                            : 'bg-gray-800/40 border border-gray-600/20/30 border border-gray-600/30 opacity-50'
                    : gameState === 'playing'
                      ? 'bg-black/40 border border-white/10 hover:bg-cyan-900/30 hover:scale-105 hover:border-cyan-400/40 active:scale-90 cursor-pointer'
                      : 'bg-black/30 border border-white/5 opacity-40'
                }`}
              >
                {isFlipped ? (
                  <span style={{ animation: tile.type === 'trap' ? 'wrongShake 0.5s ease both' : tile.type === 'jackpot' ? 'symbolPop 0.5s ease both' : 'cardFlipIn 0.3s ease both' }}>{tile.emoji}</span>
                ) : (
                  <span className="text-cyan-500/40 text-lg">?</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Result */}
        {gameState === 'lost' && (
          <div className="text-center p-4 bg-red-500/10 rounded-2xl border border-red-500/30" style={{ animation: 'resultZoom 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both' }}>
            <div className="text-4xl mb-2" style={{ animation: 'wrongShake 0.6s ease both' }}>💀</div>
            <div className="text-xl font-bold text-red-400 mb-1">Trap!</div>
            <div className="text-gray-400 mb-3">
              {collected > 0 ? `Saved ${collected} Coins before the trap!` : 'No coins collected'}
            </div>
            <button
              type="button"
              onClick={generateBoard}
              className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 rounded-xl font-bold"
            >
              Try Again 🗺️
            </button>
          </div>
        )}

        {gameState === 'won' && (
          <div className="text-center p-4 bg-green-500/10 rounded-2xl border-2 border-green-500/40" style={{ animation: 'resultZoom 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both' }}>
            <div className="text-4xl mb-2" style={{ animation: 'symbolPop 0.5s ease both, float 2s ease-in-out 0.5s infinite' }}>{collected >= 200 ? '🏆' : collected >= 75 ? '⭐' : '🪙'}</div>
            <div className="text-2xl font-black text-yellow-400 mb-1" style={{ animation: 'correctPop 0.4s ease 0.3s both' }}>+{collected} Coins!</div>
            <div className="text-gray-400 mb-3">You survived the hunt!</div>
            <button
              type="button"
              onClick={generateBoard}
              className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-xl font-bold"
            >
              Hunt Again 🗺️
            </button>
          </div>
        )}

        {/* Legend */}
        {gameState === 'playing' && (
          <div className="flex justify-center gap-4 text-xs text-gray-500">
            <span>🪙 25</span>
            <span>💎 75</span>
            <span>👑 500</span>
            <span>💀 Trap!</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default TreasureHuntGame;
