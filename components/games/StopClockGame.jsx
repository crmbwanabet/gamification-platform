'use client'

import React, { useState, useEffect, useRef } from 'react';
import { C } from '@/components/redesign/tokens';
import { RewardIcon } from '@/components/redesign/RedesignShell';
import TutorialModal from '../modals/TutorialModal';
import { GameShell, GameBtn } from './gameKit';

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

  const numberColor = gameState === 'spinning'
    ? C.text
    : stoppedNum !== null
      ? (getDiff() <= 5 ? C.green : C.gold)
      : C.muted;

  return (
    <GameShell title="⏱️ Stop the Clock" onClose={onClose} closing={closing} onHelp={() => setShowTutorial(true)}>
      {showTutorial && <TutorialModal tutorialKey="stopclock" onClose={() => setShowTutorial(false)} />}

      {/* Target display */}
      {targetNum !== null && (
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <span style={{ color: C.muted, fontSize: 14 }}>Target: </span>
          <span style={{ fontSize: 24, fontWeight: 900, color: C.green }}>{String(targetNum).padStart(2, '0')}</span>
        </div>
      )}

      {/* Clock Display */}
      <div style={{ position: 'relative', width: 224, height: 224, margin: '0 auto 24px' }}>
        <svg viewBox="0 0 200 200" style={{ width: '100%', height: '100%' }}>
          <defs>
            <linearGradient id="clockGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={C.green} />
              <stop offset="100%" stopColor={C.teal} />
            </linearGradient>
          </defs>
          <circle cx="100" cy="100" r="96" fill="none" stroke={C.track} strokeWidth="6" />
          <circle cx="100" cy="100" r="96" fill="none" stroke="url(#clockGrad)" strokeWidth="3" opacity="0.6" />

          {/* Tick marks */}
          {Array.from({ length: 20 }, (_, i) => {
            const a = (i * 18 - 90) * Math.PI / 180;
            const r1 = 86, r2 = 93;
            return (
              <line key={i}
                x1={100 + r1 * Math.cos(a)} y1={100 + r1 * Math.sin(a)}
                x2={100 + r2 * Math.cos(a)} y2={100 + r2 * Math.sin(a)}
                stroke={i % 5 === 0 ? C.green : C.panel2} strokeWidth={i % 5 === 0 ? 2.5 : 1.5}
              />
            );
          })}

          {/* Target marker */}
          {targetNum !== null && (() => {
            const ta = ((targetNum / 100) * 360 - 90) * Math.PI / 180;
            return (
              <circle cx={100 + 82 * Math.cos(ta)} cy={100 + 82 * Math.sin(ta)} r="5" fill={C.green} opacity="0.85">
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
                stroke={C.gold} strokeWidth="3" strokeLinecap="round"
              />
            );
          })()}

          {/* Center dot */}
          <circle cx="100" cy="100" r="8" fill={C.bg} stroke={C.gold} strokeWidth="2" />
        </svg>

        {/* Number display */}
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontSize: 48, fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: numberColor }}>
            {String(gameState === 'ready' ? '00' : currentNum).padStart(2, '0')}
          </div>
        </div>
      </div>

      {/* Buttons / Result */}
      {gameState === 'ready' && (
        <GameBtn onClick={startSpin}>⏱️ Start Clock!</GameBtn>
      )}

      {gameState === 'spinning' && (
        <GameBtn onClick={stopSpin} variant="danger" style={{ animation: 'pulseGlow 1s ease-in-out infinite' }}>🛑 STOP!</GameBtn>
      )}

      {gameState === 'stopped' && (
        <div style={{ textAlign: 'center' }} className="anim-scale-in">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 22, marginBottom: 12 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: C.muted }}>Target</div>
              <div style={{ fontSize: 30, fontWeight: 900, color: C.green }}>{String(targetNum).padStart(2, '0')}</div>
            </div>
            <div style={{ fontSize: 20, color: C.muted }}>vs</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 13, color: C.muted }}>You</div>
              <div style={{ fontSize: 30, fontWeight: 900, color: C.gold, animation: 'diceLand 0.3s ease-out both' }}>{String(stoppedNum).padStart(2, '0')}</div>
            </div>
          </div>
          <div style={{ fontSize: 17, color: C.sub, marginBottom: 8 }}>Off by {getDiff()}</div>
          <div
            style={{ fontSize: 22, fontWeight: 900, marginBottom: 20, color: getPrize() >= 200 ? C.green : getPrize() > 0 ? C.gold : C.muted, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, animation: getPrize() > 0 ? 'correctPop 0.4s ease 0.3s both' : 'wrongShake 0.5s ease 0.2s both' }}
          >
            {getPrize() > 0 ? <>🎉 +{getPrize()} <RewardIcon kind="coins" size={20} /></> : 'Too far! Try again'}
          </div>
          <div>
            <GameBtn
              full={false}
              style={{ padding: '12px 30px' }}
              onClick={() => { setGameState('ready'); setCurrentNum(0); setTargetNum(null); setStoppedNum(null); }}
            >
              Try Again ⏱️
            </GameBtn>
          </div>
        </div>
      )}

      {/* Prize table */}
      {gameState === 'ready' && (
        <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, textAlign: 'center', fontSize: 12 }}>
          <div style={{ background: 'rgba(79,169,139,.12)', borderRadius: 10, padding: 8, border: `1px solid ${C.green}44` }}>
            <div style={{ color: C.green, fontWeight: 800 }}>Exact</div>
            <div style={{ color: C.text, fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 3 }}>1000<RewardIcon kind="coins" size={13} /></div>
          </div>
          <div style={{ background: 'rgba(230,173,74,.12)', borderRadius: 10, padding: 8, border: `1px solid ${C.gold}44` }}>
            <div style={{ color: C.gold, fontWeight: 800 }}>±5</div>
            <div style={{ color: C.text, fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 3 }}>200<RewardIcon kind="coins" size={13} /></div>
          </div>
          <div style={{ background: 'rgba(53,179,166,.12)', borderRadius: 10, padding: 8, border: `1px solid ${C.teal}44` }}>
            <div style={{ color: C.teal, fontWeight: 800 }}>±10</div>
            <div style={{ color: C.text, fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 3 }}>100<RewardIcon kind="coins" size={13} /></div>
          </div>
        </div>
      )}
    </GameShell>
  );
}

export default StopClockGame;
