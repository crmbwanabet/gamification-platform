'use client'

import React, { useState, useEffect, useRef } from 'react';
import { C } from '@/components/redesign/tokens';
import { RewardIcon } from '@/components/redesign/RedesignShell';
import TutorialModal from '../modals/TutorialModal';
import { GameShell, GameBtn } from './gameKit';

const STAGES = [
  { name: 'WARM-UP',   lap: 4000, color: '#4fa98b', prizes: [150, 70, 40, 20, 10] },
  { name: 'PRO',       lap: 2400, color: '#e6ad4a', prizes: [250, 120, 60, 30, 15] },
  { name: 'LIGHTNING', lap: 1500, color: '#e5573f', prizes: [400, 200, 100, 50, 25] },
];
const STREAK_BONUS = 200; // every stage within ±5

const wrapDiff = (a, b) => {
  const d = Math.abs(a - b);
  return Math.min(d, 100 - d);
};
const prizeFor = (diff, stageIdx) => {
  const p = STAGES[stageIdx].prizes;
  return diff === 0 ? p[0] : diff <= 2 ? p[1] : diff <= 5 ? p[2] : diff <= 10 ? p[3] : diff <= 20 ? p[4] : 0;
};

// watch.png face geometry (512x512 art): center (245,273), radius 139
const FC = { x: 245, y: 273, r: 139 };

function StopClockGame({ onClose, onWin, closing }) {
  const [gameState, setGameState] = useState('ready'); // ready, intro, spinning, stageResult, done
  const [stage, setStage] = useState(0);
  const [currentNum, setCurrentNum] = useState(0);
  const [targetNum, setTargetNum] = useState(null);
  const [results, setResults] = useState([]); // { target, stopped, diff, prize }
  const [showTutorial, setShowTutorial] = useState(false);
  const rafRef = useRef(null);

  const banked = results.reduce((s, r) => s + r.prize, 0);
  const streak = results.length === 3 && results.every(r => r.diff <= 5);
  const total = banked + (streak ? STREAK_BONUS : 0);

  const startGame = () => {
    setResults([]);
    setStage(0);
    setGameState('intro');
  };

  // stage intro: pick a target, flash the stage card, then spin
  useEffect(() => {
    if (gameState !== 'intro') return;
    setTargetNum(Math.floor(Math.random() * 100));
    setCurrentNum(0);
    const t = setTimeout(() => setGameState('spinning'), 1100);
    return () => clearTimeout(t);
  }, [gameState, stage]);

  // rAF spin loop — time-based so lap speed stays exact even at LIGHTNING pace
  useEffect(() => {
    if (gameState !== 'spinning') return;
    const start = performance.now();
    const offset = Math.random() * 100;
    const lap = STAGES[stage].lap;
    const tick = (now) => {
      setCurrentNum(Math.floor((offset + ((now - start) / lap) * 100) % 100));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [gameState, stage]);

  const stopSpin = () => {
    if (gameState !== 'spinning') return;
    const diff = wrapDiff(currentNum, targetNum);
    setResults(prev => [...prev, { target: targetNum, stopped: currentNum, diff, prize: prizeFor(diff, stage) }]);
    setGameState('stageResult');
  };

  // stage result: brief pause, then next stage or final summary
  useEffect(() => {
    if (gameState !== 'stageResult') return;
    const t = setTimeout(() => {
      if (stage < STAGES.length - 1) {
        setStage(s => s + 1);
        setGameState('intro');
      } else {
        setGameState('done');
      }
    }, 1700);
    return () => clearTimeout(t);
  }, [gameState, stage]);

  useEffect(() => {
    if (gameState !== 'done' || results.length !== 3) return;
    if (total > 0) onWin(total, { diff: Math.min(...results.map(r => r.diff)) });
  }, [gameState]);

  const last = results[results.length - 1];
  const stageColor = STAGES[stage].color;
  const needleAngle = (currentNum / 100) * 360;
  const targetAngle = targetNum !== null ? (targetNum / 100) * 360 : 0;
  const polar = (deg, r) => {
    const a = (deg - 90) * Math.PI / 180;
    return [FC.x + r * Math.cos(a), FC.y + r * Math.sin(a)];
  };

  return (
    <GameShell title="⏱️ Stop the Clock" onClose={onClose} closing={closing} onHelp={() => setShowTutorial(true)}>
      {showTutorial && <TutorialModal tutorialKey="stopclock" onClose={() => setShowTutorial(false)} />}

      <style>{`
        @keyframes scBeamSway { from { transform: rotate(-13deg); } to { transform: rotate(13deg); } }
        @keyframes scSparkleFloat {
          0%   { transform: translateY(0) scale(.6); opacity: 0; }
          15%  { opacity: .85; }
          80%  { opacity: .45; }
          100% { transform: translateY(-420px) scale(1.1); opacity: 0; }
        }
        @keyframes scIntroZoom { 0% { transform: scale(.4); opacity: 0; } 60% { transform: scale(1.08); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes scResultPop { 0% { transform: scale(.5); opacity: 0; } 70% { transform: scale(1.1); } 100% { transform: scale(1); opacity: 1; } }
        .sc-beam {
          position: absolute; top: -6%; height: 110%; width: 110px;
          transform-origin: 50% 0; pointer-events: none; mix-blend-mode: screen;
          background: linear-gradient(180deg, rgba(200,170,255,.4), rgba(200,170,255,.14) 55%, rgba(200,170,255,0) 82%);
          clip-path: polygon(42% 0, 58% 0, 100% 100%, 0 100%);
          filter: blur(5px);
          animation: scBeamSway var(--sway, 8s) ease-in-out infinite alternate;
        }
        .sc-sparkle {
          position: absolute; bottom: -8px; border-radius: 999px; pointer-events: none;
          background: radial-gradient(circle, rgba(255,244,200,.95) 0%, rgba(255,214,90,.5) 45%, rgba(255,214,90,0) 70%);
          animation: scSparkleFloat var(--dur, 5s) linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .sc-beam { animation: none; }
          .sc-sparkle { display: none; animation: none; }
        }
      `}</style>

      {/* Arena */}
      <div style={{
        position: 'relative', borderRadius: 16, overflow: 'hidden', padding: '14px 14px 18px',
        border: '1px solid rgba(255,255,255,.09)',
        backgroundImage: "linear-gradient(rgba(10,6,20,.44), rgba(10,6,20,.28)), url('/ui/stopclock/bg.webp')",
        backgroundSize: 'cover', backgroundPosition: 'center 70%',
        userSelect: 'none', WebkitUserSelect: 'none',
      }}>
        <div className="sc-beam" style={{ left: '14%', '--sway': '8s' }} />
        <div className="sc-beam" style={{ left: '66%', '--sway': '10.5s', animationDelay: '-5s' }} />
        {[['10%', 4, 5.4, 0], ['30%', 5, 4.4, -2.1], ['55%', 3, 6.2, -3.3], ['75%', 5, 4.8, -1.2], ['90%', 4, 5.8, -4.2]].map(([left, size, dur, delay], i) => (
          <div key={i} className="sc-sparkle" style={{ left, width: size, height: size, '--dur': `${dur}s`, animationDelay: `${delay}s` }} />
        ))}

        {/* Stage pips + bank */}
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {STAGES.map((s, i) => {
              const done = i < results.length;
              const active = i === stage && gameState !== 'ready' && gameState !== 'done';
              return (
                <div key={s.name} style={{
                  fontSize: 11, fontWeight: 800, letterSpacing: '.05em', padding: '3px 10px', borderRadius: 999,
                  background: done ? 'rgba(79,169,139,.25)' : active ? `${s.color}33` : 'rgba(255,255,255,.07)',
                  color: done ? C.green : active ? s.color : C.muted,
                  border: `1px solid ${done ? C.green : active ? s.color : 'transparent'}44`,
                }}>
                  {done ? '✓' : i + 1} {s.name}
                </div>
              );
            })}
          </div>
          <div style={{ fontSize: 13, fontWeight: 800, color: C.gold, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            {banked} <RewardIcon kind="coins" size={14} />
          </div>
        </div>

        {/* Target */}
        <div style={{ position: 'relative', textAlign: 'center', height: 34, marginBottom: 2 }}>
          {targetNum !== null && gameState !== 'ready' && gameState !== 'done' && (
            <>
              <span style={{ color: C.sub, fontSize: 13 }}>Target </span>
              <span style={{ fontSize: 24, fontWeight: 900, color: stageColor, fontVariantNumeric: 'tabular-nums' }}>{String(targetNum).padStart(2, '0')}</span>
            </>
          )}
        </div>

        {/* Watch */}
        <div style={{ position: 'relative', width: 'min(340px, 82vw)', aspectRatio: '1', margin: '0 auto 6px' }}>
          <img src="/ui/stopclock/watch.png" alt="" draggable={false} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', filter: 'drop-shadow(0 10px 22px rgba(0,0,0,.45))' }} />
          <svg viewBox="0 0 512 512" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
            {/* tick ring */}
            {Array.from({ length: 20 }, (_, i) => {
              const [x1, y1] = polar(i * 18, FC.r - 22);
              const [x2, y2] = polar(i * 18, FC.r - (i % 5 === 0 ? 8 : 14));
              return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={i % 5 === 0 ? 'rgba(255,214,90,.85)' : 'rgba(255,255,255,.28)'} strokeWidth={i % 5 === 0 ? 5 : 2.5} strokeLinecap="round" />;
            })}

            {/* target marker */}
            {targetNum !== null && gameState !== 'ready' && (() => {
              const [tx, ty] = polar(targetAngle, FC.r - 34);
              return (
                <g>
                  <circle cx={tx} cy={ty} r="11" fill={stageColor} opacity=".9">
                    <animate attributeName="r" values="11;15;11" dur="0.9s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values=".9;.5;.9" dur="0.9s" repeatCount="indefinite" />
                  </circle>
                  <circle cx={tx} cy={ty} r="5.5" fill="#fff" opacity=".95" />
                </g>
              );
            })()}

            {/* needle + trail */}
            {gameState !== 'ready' && (() => {
              const [nx, ny] = polar(needleAngle, FC.r - 30);
              const trail = gameState === 'spinning' ? [6, 13, 21] : [];
              return (
                <g>
                  {trail.map((back, i) => {
                    const [txx, tyy] = polar(needleAngle - back, FC.r - 34);
                    return <line key={i} x1={FC.x} y1={FC.y} x2={txx} y2={tyy} stroke={C.gold} strokeWidth={5 - i} strokeLinecap="round" opacity={.28 - i * .08} />;
                  })}
                  <line x1={FC.x} y1={FC.y} x2={nx} y2={ny} stroke={C.gold} strokeWidth="7" strokeLinecap="round" style={{ filter: 'drop-shadow(0 0 6px rgba(230,173,74,.8))' }} />
                  <circle cx={FC.x} cy={FC.y} r="14" fill="#1a1226" stroke={C.gold} strokeWidth="4" />
                </g>
              );
            })()}
          </svg>

          {/* big number */}
          <div style={{ position: 'absolute', left: `${(FC.x / 512) * 100}%`, top: `${((FC.y + 64) / 512) * 100}%`, transform: 'translate(-50%, -50%)', fontSize: 44, fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: gameState === 'spinning' ? '#fff' : last && gameState !== 'ready' ? (last.diff <= 5 ? C.green : C.gold) : 'rgba(255,255,255,.5)', textShadow: '0 2px 8px rgba(0,0,0,.6)' }}>
            {String(gameState === 'ready' ? 0 : currentNum).padStart(2, '0')}
          </div>

          {/* stage intro flash */}
          {gameState === 'intro' && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <div style={{ animation: 'scIntroZoom .5s cubic-bezier(.34,1.56,.64,1) both', textAlign: 'center', background: 'rgba(12,7,24,.82)', border: `2px solid ${stageColor}`, borderRadius: 16, padding: '14px 22px', boxShadow: `0 0 30px ${stageColor}66` }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: C.sub, letterSpacing: '.1em' }}>STAGE {stage + 1}</div>
                <div style={{ fontSize: 26, fontWeight: 900, color: stageColor }}>{STAGES[stage].name}</div>
                {stage > 0 && <div style={{ fontSize: 13, fontWeight: 800, color: C.text, marginTop: 2 }}>⚡ FASTER!</div>}
              </div>
            </div>
          )}

          {/* stage result flash */}
          {gameState === 'stageResult' && last && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
              <div style={{ animation: 'scResultPop .45s cubic-bezier(.34,1.56,.64,1) both', textAlign: 'center', background: 'rgba(12,7,24,.85)', border: `2px solid ${last.prize > 0 ? C.green : C.red}`, borderRadius: 16, padding: '14px 24px', boxShadow: `0 0 30px ${last.prize > 0 ? 'rgba(79,169,139,.5)' : 'rgba(229,87,63,.4)'}` }}>
                <div style={{ fontSize: 14, color: C.sub, fontWeight: 700 }}>{last.diff === 0 ? '💥 PERFECT!' : `Off by ${last.diff}`}</div>
                <div style={{ fontSize: 26, fontWeight: 900, color: last.prize > 0 ? C.green : C.red, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  {last.prize > 0 ? <>+{last.prize} <RewardIcon kind="coins" size={20} /></> : 'Missed!'}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Button row */}
        <div style={{ position: 'relative', minHeight: 54 }}>
          {gameState === 'ready' && <GameBtn onClick={startGame}>⏱️ Start — 3 Stages!</GameBtn>}
          {gameState === 'spinning' && <GameBtn onClick={stopSpin} variant="danger" style={{ animation: 'pulseGlow 1s ease-in-out infinite' }}>🛑 STOP!</GameBtn>}
          {(gameState === 'intro' || gameState === 'stageResult') && (
            <GameBtn disabled style={{ opacity: .45, cursor: 'default' }}>{gameState === 'intro' ? 'Get ready…' : stage < 2 ? 'Next stage…' : 'Totting up…'}</GameBtn>
          )}

          {gameState === 'done' && (
            <div style={{ textAlign: 'center' }} className="anim-scale-in">
              <div style={{ display: 'grid', gap: 5, marginBottom: 10 }}>
                {results.map((r, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(12,7,24,.72)', borderRadius: 10, padding: '6px 12px', fontSize: 13.5 }}>
                    <span style={{ color: STAGES[i].color, fontWeight: 800 }}>{STAGES[i].name}</span>
                    <span style={{ color: C.sub }}>{r.diff === 0 ? 'PERFECT' : `off by ${r.diff}`}</span>
                    <span style={{ color: r.prize > 0 ? C.green : C.muted, fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      +{r.prize} <RewardIcon kind="coins" size={13} />
                    </span>
                  </div>
                ))}
                {streak && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(230,173,74,.16)', border: `1px solid ${C.gold}55`, borderRadius: 10, padding: '6px 12px', fontSize: 13.5, animation: 'correctPop .4s ease .5s both' }}>
                    <span style={{ color: C.gold, fontWeight: 900 }}>🎯 SHARPSHOOTER</span>
                    <span style={{ color: C.sub, fontSize: 12 }}>all 3 within ±5</span>
                    <span style={{ color: C.gold, fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 4 }}>+{STREAK_BONUS} <RewardIcon kind="coins" size={13} /></span>
                  </div>
                )}
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, marginBottom: 12, color: total > 0 ? C.gold : C.muted, display: 'inline-flex', alignItems: 'center', gap: 7, animation: total > 0 ? 'correctPop 0.4s ease 0.3s both' : 'none' }}>
                {total > 0 ? <>Total +{total} <RewardIcon kind="coins" size={20} /></> : 'No luck this time!'}
              </div>
              <div>
                <GameBtn full={false} style={{ padding: '12px 30px' }} onClick={() => { setGameState('ready'); setResults([]); setStage(0); setTargetNum(null); setCurrentNum(0); }}>
                  Play Again ⏱️
                </GameBtn>
              </div>
            </div>
          )}
        </div>

        {/* Prize hint (ready only) */}
        {gameState === 'ready' && (
          <div style={{ position: 'relative', marginTop: 12, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, textAlign: 'center', fontSize: 12 }}>
            {STAGES.map((s, i) => (
              <div key={s.name} style={{ background: 'rgba(12,7,24,.72)', borderRadius: 10, padding: 8, border: `1px solid ${s.color}44` }}>
                <div style={{ color: s.color, fontWeight: 800 }}>{s.name}</div>
                <div style={{ color: C.sub, fontSize: 11 }}>{(s.lap / 1000).toFixed(1)}s lap</div>
                <div style={{ color: C.text, fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: 3 }}>{s.prizes[0]}<RewardIcon kind="coins" size={13} /></div>
              </div>
            ))}
            <div style={{ gridColumn: '1 / -1', color: C.sub, fontSize: 11.5 }}>
              🎯 All 3 stages within ±5 = <b style={{ color: C.gold }}>+{STREAK_BONUS} bonus</b> — perfect game pays <b style={{ color: C.gold }}>1,000</b>
            </div>
          </div>
        )}
      </div>
    </GameShell>
  );
}

export default StopClockGame;
