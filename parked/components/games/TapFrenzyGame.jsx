'use client'

import React, { useState, useEffect, useRef } from 'react';
import { C } from '@/components/redesign/tokens';
import { RewardIcon } from '@/components/redesign/RedesignShell';
import TutorialModal from '../modals/TutorialModal';
import { GameShell, GameBtn } from './gameKit';

const GAME_LEN = 15;   // seconds per round
const FRENZY_AT = 4;   // final seconds: 2x points, faster spawns

const REWARD_TYPES = [
  { key: 'coin',    icon: '/ui/tapfrenzy/coin.png',    points: 1, size: 48, weight: 40, glow: 'rgba(243,196,69,.65)' },
  { key: 'gem',     icon: '/ui/tapfrenzy/gem.png',     points: 2, size: 44, weight: 24, glow: 'rgba(168,85,247,.6)' },
  { key: 'diamond', icon: '/ui/tapfrenzy/diamond.png', points: 3, size: 42, weight: 14, glow: 'rgba(56,209,224,.6)' },
  { key: 'bolt',    icon: '/ui/tapfrenzy/bolt.png',    points: 5, size: 40, weight: 8,  glow: 'rgba(255,214,90,.75)' },
];
const BOMB = { key: 'bomb', icon: '/ui/tapfrenzy/bomb.png', points: -5, size: 46, glow: 'rgba(229,87,63,.55)' };

const SPARKLES = [
  { left: '8%',  size: 5, dur: 5.2, delay: 0 },
  { left: '22%', size: 3, dur: 4.1, delay: -2.2 },
  { left: '38%', size: 6, dur: 6.0, delay: -3.5 },
  { left: '52%', size: 4, dur: 4.6, delay: -1.4 },
  { left: '66%', size: 5, dur: 5.6, delay: -4.1 },
  { left: '81%', size: 3, dur: 4.3, delay: -0.8 },
  { left: '92%', size: 6, dur: 6.4, delay: -2.9 },
];

// Difficulty curve — p is round progress 0→1
const curve = (p) => ({
  life: 1400 - 800 * p,                        // ms a target stays up
  gap: 550 - 300 * p,                          // ms between spawns
  maxTargets: p < 0.3 ? 1 : p < 0.65 ? 2 : 3,  // simultaneous targets
  bombPct: 10 + 15 * p,                        // bomb share of spawns
  scale: 1 - 0.2 * p,                          // targets shrink
});

const getPrize = (score) => score >= 60 ? 200 : score >= 45 ? 100 : score >= 30 ? 50 : score >= 15 ? 25 : 10;

function TapFrenzyGame({ onClose, onWin, closing, onReplay }) {
  const [gameState, setGameState] = useState('ready'); // ready, playing, done
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_LEN);
  const [targets, setTargets] = useState([]);
  const [taps, setTaps] = useState([]);
  const [bombHit, setBombHit] = useState(0);
  const [showTutorial, setShowTutorial] = useState(false);
  const idRef = useRef(0);
  const targetsRef = useRef([]);
  useEffect(() => { targetsRef.current = targets; }, [targets]);

  const startGame = () => {
    setScore(0);
    setTimeLeft(GAME_LEN);
    setTargets([]);
    setTaps([]);
    setBombHit(0);
    setGameState('playing');
  };

  // Timer + spawn engine live entirely inside this effect so the ready→playing
  // transition can't clear them (the old version killed its own interval that way)
  useEffect(() => {
    if (gameState !== 'playing') return;
    const start = performance.now();
    const elapsed = () => (performance.now() - start) / 1000;
    const timeouts = new Set();
    const later = (fn, ms) => {
      const id = setTimeout(() => { timeouts.delete(id); fn(); }, ms);
      timeouts.add(id);
    };

    const spawn = () => {
      const el = elapsed();
      if (el >= GAME_LEN) return;
      const cv = curve(Math.min(1, el / GAME_LEN));
      const frenzyNow = GAME_LEN - el <= FRENZY_AT;

      // build the target outside setTargets so the updater stays pure
      // (StrictMode double-invokes updaters; a later() inside one leaks timers)
      const live = targetsRef.current;
      if (live.length < cv.maxTargets) {
        const roll = Math.random() * 100;
        let type = BOMB;
        if (roll >= cv.bombPct) {
          const totalW = REWARD_TYPES.reduce((s, r) => s + r.weight, 0);
          let r = ((roll - cv.bombPct) / (100 - cv.bombPct)) * totalW;
          type = REWARD_TYPES[0];
          for (const rt of REWARD_TYPES) { r -= rt.weight; if (r < 0) { type = rt; break; } }
        }
        // keep new targets clear of live ones
        let x = 12 + Math.random() * 76, y = 14 + Math.random() * 62;
        for (let i = 0; i < 8; i++) {
          const cx = 12 + Math.random() * 76, cy = 14 + Math.random() * 62;
          if (live.every(o => Math.hypot(cx - o.x, (cy - o.y) * 1.6) > 24)) { x = cx; y = cy; break; }
        }
        const target = {
          id: ++idRef.current, x, y, ...type,
          points: frenzyNow && type.points > 0 ? type.points * 2 : type.points,
          size: Math.round(type.size * cv.scale),
          frenzy: frenzyNow && type.points > 0,
        };
        later(() => setTargets(p => p.filter(o => o.id !== target.id)), cv.life);
        setTargets(prev => prev.length >= cv.maxTargets ? prev : [...prev, target]);
      }

      later(spawn, cv.gap * (0.8 + Math.random() * 0.4) * (frenzyNow ? 0.8 : 1));
    };
    spawn();

    const iv = setInterval(() => {
      const remain = GAME_LEN - Math.floor(elapsed());
      setTimeLeft(Math.max(0, remain));
      if (remain <= 0) {
        clearInterval(iv);
        setTargets([]);
        setGameState('done');
      }
    }, 200);

    // clearing targets here also removes the spawn a StrictMode dev
    // double-mount leaves behind after its despawn timer is cleared
    return () => { clearInterval(iv); timeouts.forEach(clearTimeout); setTargets([]); };
  }, [gameState]);

  useEffect(() => {
    if (gameState !== 'done') return;
    const prize = getPrize(score);
    if (prize > 0) onWin(prize, { score });
  }, [gameState]);

  const tapTarget = (target, e) => {
    e.stopPropagation();
    setScore(s => Math.max(0, s + target.points));
    setTaps(prev => [...prev.slice(-8), { id: ++idRef.current, x: target.x, y: target.y, points: target.points }]);
    setTargets(prev => prev.filter(t => t.id !== target.id));
    if (target.points < 0) setBombHit(n => n + 1);
  };

  const frenzy = gameState === 'playing' && timeLeft <= FRENZY_AT && timeLeft > 0;

  return (
    <GameShell title="⚡ Tap Frenzy" onClose={onClose} closing={closing} onHelp={() => setShowTutorial(true)}>
      {showTutorial && <TutorialModal tutorialKey="tapfrenzy" onClose={() => setShowTutorial(false)} />}

      <style>{`
        @keyframes tfFrenzyPulse { 0%, 100% { transform: translateX(-50%) scale(1); } 50% { transform: translateX(-50%) scale(1.08); } }
        @keyframes tfBombFlash { 0% { opacity: 1; } 100% { opacity: 0; } }
        @keyframes tfFrenzyVignette { 0%, 100% { opacity: .55; } 50% { opacity: 1; } }
        @keyframes tfBeamSway { from { transform: rotate(-14deg); } to { transform: rotate(14deg); } }
        @keyframes tfSparkleFloat {
          0%   { transform: translateY(0) scale(.6); opacity: 0; }
          15%  { opacity: .9; }
          80%  { opacity: .5; }
          100% { transform: translateY(-330px) scale(1.1); opacity: 0; }
        }
        .tf-beam {
          position: absolute; top: -6%; height: 115%; width: 120px;
          transform-origin: 50% 0; pointer-events: none; mix-blend-mode: screen;
          background: linear-gradient(180deg, rgba(255,232,170,.5), rgba(255,232,170,.18) 55%, rgba(255,232,170,0) 82%);
          clip-path: polygon(42% 0, 58% 0, 100% 100%, 0 100%);
          filter: blur(5px);
          animation: tfBeamSway var(--sway, 7s) ease-in-out infinite alternate;
        }
        .tf-frenzy .tf-beam { animation-duration: 1.6s; background: linear-gradient(180deg, rgba(255,208,94,.65), rgba(255,208,94,.22) 55%, rgba(255,208,94,0) 82%); }
        .tf-sparkle {
          position: absolute; bottom: -8px; border-radius: 999px; pointer-events: none;
          background: radial-gradient(circle, rgba(255,244,200,.95) 0%, rgba(255,214,90,.5) 45%, rgba(255,214,90,0) 70%);
          animation: tfSparkleFloat var(--dur, 5s) linear infinite;
        }
        @keyframes tfGridScroll { from { background-position: 0 0; } to { background-position: 0 44px; } }
        .tf-grid {
          position: absolute; left: -25%; right: -25%; bottom: -4%; height: 52%;
          pointer-events: none; mix-blend-mode: screen; opacity: .5;
          background-image:
            repeating-linear-gradient(0deg, rgba(255,214,90,.55) 0 2px, transparent 2px 44px),
            repeating-linear-gradient(90deg, rgba(255,214,90,.4) 0 2px, transparent 2px 52px);
          transform: perspective(260px) rotateX(58deg);
          transform-origin: 50% 100%;
          -webkit-mask-image: linear-gradient(180deg, transparent 0%, #000 45%);
          mask-image: linear-gradient(180deg, transparent 0%, #000 45%);
          animation: tfGridScroll 2.6s linear infinite;
        }
        .tf-frenzy .tf-grid { animation-duration: 1s; opacity: .7; }
        @media (prefers-reduced-motion: reduce) {
          .tf-beam, .tf-sparkle, .tf-grid { animation: none; }
          .tf-sparkle { display: none; }
        }
      `}</style>

      {/* Score & Timer */}
      {gameState !== 'ready' && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>
            Score: <span style={{ color: C.gold }}>{score}</span>
          </div>
          <div style={{
            fontSize: 16, fontWeight: 800, padding: '4px 16px', borderRadius: 999,
            background: timeLeft <= 3 ? 'rgba(229,87,63,.24)' : frenzy ? 'rgba(243,192,69,.22)' : 'rgba(53,179,166,.18)',
            color: timeLeft <= 3 ? C.red : frenzy ? C.gold : C.teal,
            animation: timeLeft <= 3 ? 'pulseGlow 1s ease-in-out infinite' : 'none',
          }}>
            ⏱️ {timeLeft}s
          </div>
        </div>
      )}

      {/* Game Area */}
      <div
        className={frenzy ? 'tf-frenzy' : undefined}
        style={{
          position: 'relative', height: 350, borderRadius: 16, overflow: 'hidden',
          border: '1px solid rgba(255,255,255,.09)',
          backgroundImage: "linear-gradient(rgba(10,6,20,.3), rgba(10,6,20,.08) 35%, rgba(10,6,20,.16)), url('/ui/tapfrenzy/arena.webp')",
          backgroundSize: 'cover', backgroundPosition: 'center',
          userSelect: 'none', WebkitUserSelect: 'none', touchAction: 'manipulation',
        }}
      >
        {/* Ambient moving lights (behind everything, always on) */}
        <div className="tf-grid" />
        <div className="tf-beam" style={{ left: '16%', '--sway': '7s' }} />
        <div className="tf-beam" style={{ left: '62%', '--sway': '9.5s', animationDelay: '-4.2s' }} />
        {SPARKLES.map((s, i) => (
          <div key={i} className="tf-sparkle" style={{ left: s.left, width: s.size, height: s.size, '--dur': `${s.dur}s`, animationDelay: `${s.delay}s` }} />
        ))}
        {gameState === 'ready' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'rgba(10,6,20,.35)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <img src="/ui/tapfrenzy/coin.png" alt="" width={44} height={44} draggable={false} style={{ filter: 'drop-shadow(0 0 10px rgba(243,196,69,.5))' }} />
              <img src="/ui/tapfrenzy/gem.png" alt="" width={40} height={40} draggable={false} style={{ filter: 'drop-shadow(0 0 10px rgba(168,85,247,.5))' }} />
              <img src="/ui/tapfrenzy/diamond.png" alt="" width={40} height={40} draggable={false} style={{ filter: 'drop-shadow(0 0 10px rgba(56,209,224,.5))' }} />
              <img src="/ui/tapfrenzy/bolt.png" alt="" width={36} height={36} draggable={false} style={{ filter: 'drop-shadow(0 0 10px rgba(255,214,90,.6))' }} />
              <img src="/ui/tapfrenzy/bomb.png" alt="bomb" width={44} height={44} draggable={false} style={{ filter: 'drop-shadow(0 0 10px rgba(229,87,63,.55))', marginLeft: 6 }} />
            </div>
            <p style={{ color: C.text, textAlign: 'center', marginBottom: 6, fontSize: 14, fontWeight: 600 }}>Tap the loot as fast as you can — never the bomb!</p>
            <p style={{ fontSize: 13, color: C.sub, marginBottom: 24, textAlign: 'center' }}>{GAME_LEN} seconds. It gets faster — the last {FRENZY_AT}s are ×2 FRENZY 🔥</p>
            <GameBtn onClick={startGame} full={false} style={{ padding: '14px 32px', fontSize: 17 }}>⚡ START!</GameBtn>
          </div>
        )}

        {gameState === 'playing' && (
          <>
            {/* Frenzy vignette + banner */}
            {frenzy && (
              <>
                <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', boxShadow: 'inset 0 0 46px rgba(243,192,69,.4)', animation: 'tfFrenzyVignette 0.8s ease-in-out infinite', zIndex: 1 }} />
                <div style={{
                  position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)', zIndex: 2, pointerEvents: 'none',
                  padding: '5px 16px', borderRadius: 999, fontSize: 14, fontWeight: 900, letterSpacing: '.06em',
                  color: '#1a1226', background: 'linear-gradient(180deg, #ffd75e, #e6ad4a)', boxShadow: '0 0 18px rgba(243,192,69,.65)',
                  animation: 'tfFrenzyPulse 0.7s ease-in-out infinite',
                }}>
                  🔥 FRENZY ×2
                </div>
              </>
            )}

            {/* Bomb hit flash */}
            {bombHit > 0 && (
              <div key={bombHit} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'rgba(229,87,63,.28)', boxShadow: 'inset 0 0 60px rgba(229,87,63,.55)', animation: 'tfBombFlash 0.4s ease-out forwards', zIndex: 3 }} />
            )}

            {/* Targets */}
            {targets.map(t => (
              <button
                key={t.id}
                type="button"
                onPointerDown={(e) => tapTarget(t, e)}
                className="anim-scale-in"
                style={{
                  position: 'absolute',
                  background: 'transparent',
                  border: 'none',
                  padding: 6,
                  cursor: 'pointer',
                  left: `${t.x}%`, top: `${t.y}%`,
                  transform: 'translate(-50%, -50%)',
                  WebkitTapHighlightColor: 'transparent',
                  zIndex: 2,
                }}
              >
                <img
                  src={t.icon}
                  alt={t.key}
                  width={t.size} height={t.size}
                  draggable={false}
                  style={{ display: 'block', filter: `drop-shadow(0 0 ${t.frenzy ? 14 : 9}px ${t.glow})`, pointerEvents: 'none' }}
                />
                {t.frenzy && (
                  <span style={{
                    position: 'absolute', top: -2, right: -6, fontSize: 11, fontWeight: 900, color: '#1a1226',
                    background: 'linear-gradient(180deg, #ffd75e, #e6ad4a)', borderRadius: 999, padding: '1px 6px',
                    boxShadow: '0 0 8px rgba(243,192,69,.7)', pointerEvents: 'none',
                  }}>×2</span>
                )}
              </button>
            ))}

            {/* Tap score popups */}
            {taps.map(tap => (
              <div
                key={tap.id}
                style={{
                  position: 'absolute',
                  fontWeight: 900,
                  fontSize: 20,
                  pointerEvents: 'none',
                  left: `${tap.x}%`, top: `${tap.y - 5}%`,
                  color: tap.points > 0 ? C.green : C.red,
                  animation: 'scorePopUp 0.7s ease-out forwards',
                  textShadow: tap.points > 0 ? '0 0 10px rgba(79,169,139,0.5)' : '0 0 10px rgba(229,87,63,0.5)',
                  zIndex: 4,
                }}
              >
                {tap.points > 0 ? `+${tap.points}` : tap.points}
              </div>
            ))}
          </>
        )}

        {gameState === 'done' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(10,6,20,.5)', animation: 'resultZoom 0.5s cubic-bezier(0.25, 1, 0.5, 1) both' }}>
            <div style={{ fontSize: 60, marginBottom: 12, animation: 'symbolPop 0.5s ease both, float 2s ease-in-out 0.5s infinite' }}>{score >= 45 ? '🏆' : score >= 30 ? '⭐' : '👏'}</div>
            <div style={{ fontSize: 36, fontWeight: 900, color: C.gold, marginBottom: 8 }}>{score} Points</div>
            <div style={{ fontSize: 20, color: C.green, fontWeight: 800, marginBottom: 24, display: 'inline-flex', alignItems: 'center', gap: 6, animation: 'correctPop 0.4s ease 0.3s both' }}>
              +{getPrize(score)} <RewardIcon kind="coins" size={18} />
            </div>
            <GameBtn onClick={() => { if (onReplay && !onReplay()) return; setGameState('ready'); setScore(0); setTimeLeft(GAME_LEN); }} full={false} style={{ padding: '12px 30px' }}>Play Again ⚡</GameBtn>
          </div>
        )}
      </div>
    </GameShell>
  );
}

export default TapFrenzyGame;
