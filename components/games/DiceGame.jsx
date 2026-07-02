'use client';

import { useState } from 'react';
import { C } from '@/components/redesign/tokens';
import { RewardIcon } from '@/components/redesign/RedesignShell';
import TutorialModal from '../modals/TutorialModal';
import { GameShell, GameBtn, OptionBtn } from './gameKit';

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

  const DiceFace = ({ value, tint }) => {
    const dots = {
      1: [[50, 50]],
      2: [[25, 25], [75, 75]],
      3: [[25, 25], [50, 50], [75, 75]],
      4: [[25, 25], [75, 25], [25, 75], [75, 75]],
      5: [[25, 25], [75, 25], [50, 50], [25, 75], [75, 75]],
      6: [[25, 25], [75, 25], [25, 50], [75, 50], [25, 75], [75, 75]],
    };
    return (
      <div style={{
        width: 92, height: 92, borderRadius: 18,
        background: 'linear-gradient(150deg, #fbfcf8, #d7dbe1)',
        boxShadow: `0 10px 26px rgba(0,0,0,.35), inset 0 0 0 2px ${tint}55, inset 0 -8px 14px rgba(0,0,0,.08)`,
        animation: rolling ? 'diceRollSpin 0.6s ease infinite' : (result && !rolling ? 'diceLand 0.4s ease-out both' : 'none'),
      }}>
        <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', padding: 8 }}>
          {dots[value]?.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="11" fill={C.bg} />
          ))}
        </svg>
      </div>
    );
  };

  return (
    <GameShell title="🎲 Lucky Dice" onClose={onClose} closing={closing} onHelp={() => setShowTutorial(true)}>
      {showTutorial && <TutorialModal tutorialKey="dice" onClose={() => setShowTutorial(false)} />}

      <p style={{ textAlign: 'center', color: C.sub, marginBottom: 22, fontSize: 13.5 }}>Guess the total (2–12) and win big!</p>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 28, marginBottom: 26, padding: '4px 0' }}>
        <DiceFace value={dice1} tint={C.gold} />
        <DiceFace value={dice2} tint={C.teal} />
      </div>

      {!result && (
        <>
          <p style={{ textAlign: 'center', fontSize: 12.5, color: C.muted, marginBottom: 12, fontWeight: 700 }}>Select your guess</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, marginBottom: 20 }}>
            {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
              <OptionBtn key={n} selected={guess === n} disabled={rolling} onClick={() => setGuess(n)}>{n}</OptionBtn>
            ))}
          </div>
          <GameBtn onClick={roll} disabled={rolling || guess === null}>{rolling ? '🎲 Rolling…' : '🎲 Roll Dice!'}</GameBtn>
        </>
      )}

      {result && (
        <div style={{ textAlign: 'center' }} className="anim-scale-in">
          <div style={{ fontSize: 58, marginBottom: 10, animation: result.won ? 'symbolPop 0.5s ease both, float 2s ease-in-out 0.5s infinite' : 'symbolPop 0.4s ease both' }}>{result.won ? '🎯' : result.close ? '👍' : '😢'}</div>
          <p style={{ fontSize: 15, color: C.sub, marginBottom: 6 }}>Total: <span style={{ fontSize: 34, color: C.gold, fontWeight: 900, verticalAlign: 'middle' }}>{result.total}</span></p>
          <p style={{ fontSize: 20, fontWeight: 800, margin: '2px 0 20px', display: 'inline-flex', alignItems: 'center', gap: 7, color: result.won ? C.green : result.close ? C.gold : C.muted, animation: result.won ? 'correctPop 0.5s ease both' : result.prize === 0 ? 'wrongShake 0.5s ease both' : 'none' }}>
            {result.prize > 0 ? <>{result.won ? '🎉 EXACT!' : 'Close!'} <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>+{result.prize}<RewardIcon kind="coins" size={18} /></span></> : 'Better luck next time!'}
          </p>
          <div><GameBtn onClick={() => { setResult(null); setGuess(null); }} full={false} style={{ padding: '12px 30px' }}>Play Again 🎲</GameBtn></div>
        </div>
      )}
    </GameShell>
  );
}
