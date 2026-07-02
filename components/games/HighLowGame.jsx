'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { C } from '@/components/redesign/tokens';
import { RewardIcon } from '@/components/redesign/RedesignShell';
import TutorialModal from '../modals/TutorialModal';
import { GameShell, GameBtn, OptionBtn } from './gameKit';

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
    <div
      style={{
        width: 96, height: 144, borderRadius: 14,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 12px 30px rgba(0,0,0,.4)',
        background: faceDown ? `linear-gradient(150deg, ${C.panelHi}, ${C.panelLo})` : '#f7f9fb',
        border: faceDown ? '1px solid rgba(255,255,255,.09)' : 'none',
        color: faceDown ? C.text : (isRed(suit) ? C.red : '#1a1c26'),
        animation: isRevealing ? 'cardFlipIn 0.4s ease both' : 'none',
      }}
    >
      {faceDown ? (
        <span style={{ fontSize: 40 }}>🎴</span>
      ) : (
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 26, fontWeight: 800 }}>{display(value)}</div>
          <div style={{ fontSize: 40 }}>{suit}</div>
        </div>
      )}
    </div>
  );

  return (
    <GameShell title="🃏 Higher or Lower" onClose={onClose} closing={closing} onHelp={() => setShowTutorial(true)}>
      {showTutorial && <TutorialModal tutorialKey="highlow" onClose={() => setShowTutorial(false)} />}

      <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 24 }}>
        <div
          style={{ padding: '8px 14px', borderRadius: 12, background: C.track, border: '1px solid rgba(255,255,255,.08)', animation: streak >= 3 ? 'streakFire 0.6s ease-in-out infinite' : 'none' }}
        >
          <span style={{ color: C.gold, fontWeight: 800, fontSize: 14 }}>🔥 Streak: {streak}</span>
        </div>
        <div style={{ padding: '8px 14px', borderRadius: 12, background: 'rgba(79,169,139,.16)', border: `1px solid ${C.green}` }}>
          <span style={{ color: C.green, fontWeight: 800, fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            {streak * 25}<RewardIcon kind="coins" size={16} />
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 22, marginBottom: 30 }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 11.5, color: C.muted, marginBottom: 8, fontWeight: 700 }}>Current</p>
          <Card value={current.v} suit={current.s} />
        </div>
        <div style={{ fontSize: 28, color: C.muted }}>→</div>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 11.5, color: C.muted, marginBottom: 8, fontWeight: 700 }}>Next</p>
          {next ? <Card value={next.v} suit={next.s} isRevealing={revealing} /> : <Card faceDown />}
        </div>
      </div>

      {!gameOver && !revealing && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <GameBtn onClick={() => guess(false)}>
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <ChevronDown size={22} /> LOWER
              </span>
            </GameBtn>
            <GameBtn onClick={() => guess(true)} style={{ background: 'linear-gradient(180deg,#3fc0b2,#2b978c)', color: '#04231f', boxShadow: '0 6px 18px rgba(53,179,166,.4)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                HIGHER <ChevronUp size={22} />
              </span>
            </GameBtn>
          </div>
          {streak > 0 && (
            <GameBtn onClick={() => { onWin(streak * 25); onClose(); }} variant="ghost">
              <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                💰 Cash Out ({streak * 25} <RewardIcon kind="coins" size={16} />)
              </span>
            </GameBtn>
          )}
        </>
      )}

      {revealing && !gameOver && (
        <p style={{ textAlign: 'center', fontSize: 18, color: C.teal, fontWeight: 700, animation: 'pulseGlow 1s ease-in-out infinite' }}>Revealing...</p>
      )}

      {gameOver && (
        <div style={{ textAlign: 'center' }} className="anim-scale-in">
          <div style={{ fontSize: 54, marginBottom: 8, animation: 'wrongShake 0.6s ease both' }}>💔</div>
          <p style={{ fontSize: 22, fontWeight: 800, margin: '0 0 8px', color: streak > 0 ? C.green : C.text }}>
            Game Over!
          </p>
          <p style={{ color: C.sub, marginBottom: 20, fontSize: 15, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            {streak > 0
              ? <>You won <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: C.gold, fontWeight: 800 }}>{streak * 25}<RewardIcon kind="coins" size={16} /></span></>
              : 'Better luck next time!'}
          </p>
          <div>
            <GameBtn
              full={false}
              style={{ padding: '12px 30px' }}
              onClick={() => {
                setGameOver(false);
                setStreak(0);
                setNext(null);
                setRevealing(false);
                setCurrent({ v: Math.floor(Math.random() * 13) + 1, s: '♠' });
              }}
            >
              Play Again 🃏
            </GameBtn>
          </div>
        </div>
      )}
    </GameShell>
  );
}
