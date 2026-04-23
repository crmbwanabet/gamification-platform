'use client';

import { useState } from 'react';
import { HelpCircle, X, RotateCcw } from 'lucide-react';
import { WHEEL_IMAGES } from '../../lib/data/images';
import { WHEEL_SEGMENTS } from '../../lib/data/platform';
import TutorialModal from '../modals/TutorialModal';

export default function WheelGame({ onClose, onWin, playsLeft, closing }) {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [pointerBouncing, setPointerBouncing] = useState(false);
  const [wheelConfetti, setWheelConfetti] = useState(false);

  const NUM = WHEEL_SEGMENTS.length;         // 9 segments
  const SEG_ANGLE = 360 / NUM;               // 40° each

  // SPIN LOGIC — written from scratch
  // How the wheel works:
  // - SVG draws segment 0 starting at top (12 o'clock), going clockwise
  // - Segment i occupies: i*40° to (i+1)*40° clockwise from top
  // - Pointer is fixed at top (12 o'clock)
  // - CSS rotate(R) spins wheel R° clockwise
  // - After rotation R, pointer reads the segment at position (360 - R%360)° from wheel's top
  // - To land on segment i's CENTER: (360 - R%360) = i*40 + 20
  //   Therefore: R % 360 = 360 - i*40 - 20 = 340 - i*40

  const spin = () => {
    if (spinning || playsLeft <= 0) return;
    setSpinning(true);
    setResult(null);
    setPointerBouncing(true);

    // 1. Pick random winner
    const winIndex = Math.floor(Math.random() * NUM);
    const segment = WHEEL_SEGMENTS[winIndex];

    // 2. Calculate where wheel must stop (mod 360)
    // Add small random offset so it doesn't always land dead center
    const jitter = (Math.random() - 0.5) * (SEG_ANGLE * 0.6); // stays within segment
    const targetRemainder = (340 - winIndex * SEG_ANGLE + jitter + 360) % 360;

    // 3. Calculate total rotation from current position
    const currentRemainder = rotation % 360;
    let extraDegrees = targetRemainder - currentRemainder;
    if (extraDegrees <= 0) extraDegrees += 360;

    // 4. Add full spins (6-8 full rotations for drama)
    const fullSpins = (6 + Math.floor(Math.random() * 3)) * 360;
    const totalRotation = rotation + fullSpins + extraDegrees;

    setRotation(totalRotation);

    setTimeout(() => {
      setSpinning(false);
      setPointerBouncing(false);
      setResult(segment);
      setShowFlash(true);
      setWheelConfetti(true);
      setTimeout(() => setShowFlash(false), 400);
      setTimeout(() => setWheelConfetti(false), 3000);
    }, 5000);
  };

  return (
    <div className={`fixed inset-0 bg-[#1a0d26]/95 flex items-center justify-center z-[70] p-4 ${closing ? "anim-backdrop-close" : "anim-fade-in"}`} onClick={onClose}>
      {showTutorial && <TutorialModal tutorialKey="wheel" onClose={() => setShowTutorial(false)} />}

      {/* Screen Flash on Win */}
      {showFlash && (
        <div className="fixed inset-0 z-[75] pointer-events-none" style={{
          background: 'radial-gradient(circle, rgba(251,191,36,0.5) 0%, rgba(168,85,247,0.3) 50%, transparent 80%)',
          animation: 'screenFlash 0.4s ease-out forwards',
        }} />
      )}

      {/* Win Confetti */}
      {wheelConfetti && (
        <div className="fixed inset-0 pointer-events-none z-[74] overflow-hidden">
          {Array.from({ length: 60 }, (_, i) => {
            const colors = ['#fbbf24', '#a855f7', '#ec4899', '#22c55e', '#3b82f6', '#f97316', '#ef4444', '#14b8a6'];
            const shape = ['circle', 'rect', 'star'][i % 3];
            const size = 6 + Math.random() * 10;
            return (
              <div key={i} style={{
                position: 'absolute',
                left: `${5 + Math.random() * 90}%`,
                top: '-20px',
                width: shape === 'rect' ? size * 0.6 : size,
                height: shape === 'star' ? size * 0.4 : size,
                backgroundColor: colors[i % colors.length],
                borderRadius: shape === 'circle' ? '50%' : '2px',
                '--drift': `${(Math.random() - 0.5) * 120}px`,
                animation: `confettiFall ${2.2 + Math.random() * 1.5}s ${Math.random() * 0.8}s cubic-bezier(0.25, 0.46, 0.45, 0.94) both`,
              }} />
            );
          })}
        </div>
      )}

      <div className={`bg-gradient-to-b from-[#0a1520] to-[#030810] rounded-3xl max-w-md w-full p-6 border-0 shadow-2xl shadow-purple-900/50 ${closing ? "anim-modal-close" : "anim-scale-in"}`} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button type="button" onClick={() => setShowTutorial(true)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <HelpCircle className="w-6 h-6 text-purple-400" />
          </button>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <span className="text-3xl">🎡</span> Wheel of Fortune
          </h2>
          <button type="button" onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-all hover:rotate-90 duration-300">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Free Spins Badge */}
        <div className="text-center mb-5">
          <span className={`px-5 py-2.5 rounded-full font-bold text-lg inline-flex items-center gap-2 ${playsLeft > 0 ? 'bg-green-500/20 text-green-400 border-2 border-green-500/40 glow-pulse' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
            {playsLeft > 0 ? `🎁 ${playsLeft} Free Spins` : '❌ No Free Spins'}
          </span>
        </div>

        {/* === THE WHEEL === */}
        <div className="relative mx-auto mb-6" style={{ width: 300, height: 300 }}>

          {/* STATIC FRAME LAYER (does not rotate) */}
          <svg viewBox="0 0 300 300" className="absolute inset-0 w-full h-full z-20 pointer-events-none" style={{ overflow: 'visible' }}>
            <defs>
              <linearGradient id="wg1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffd700" />
                <stop offset="25%" stopColor="#b8860b" />
                <stop offset="50%" stopColor="#ffd700" />
                <stop offset="75%" stopColor="#daa520" />
                <stop offset="100%" stopColor="#ffd700" />
              </linearGradient>
              <linearGradient id="wg2" x1="100%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#daa520" />
                <stop offset="50%" stopColor="#ffd700" />
                <stop offset="100%" stopColor="#b8860b" />
              </linearGradient>
              <filter id="gldGlow" x="-15%" y="-15%" width="130%" height="130%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="b" />
                <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <filter id="pegGlow" x="-80%" y="-80%" width="260%" height="260%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="b" />
                <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            {/* Outer gold ring with glow */}
            <circle cx="150" cy="150" r="147" fill="none" stroke="url(#wg1)" strokeWidth="7" filter="url(#gldGlow)" />
            {/* Dark channel */}
            <circle cx="150" cy="150" r="141" fill="none" stroke="#0a0f1a" strokeWidth="8" />
            {/* Inner gold trim */}
            <circle cx="150" cy="150" r="136" fill="none" stroke="url(#wg2)" strokeWidth="2.5" />

            {/* Decorative pegs with animated lights */}
            {[...Array(18)].map((_, i) => {
              const a = i * 20 - 90;
              const bx = 150 + 141 * Math.cos(a * Math.PI / 180);
              const by = 150 + 141 * Math.sin(a * Math.PI / 180);
              const colors = ['#fbbf24', '#ec4899', '#a855f7'];
              const c = colors[i % 3];
              return (
                <g key={`p${i}`}>
                  <circle cx={bx} cy={by} r="7" fill="#15112a" stroke="url(#wg2)" strokeWidth="1.5" />
                  <circle cx={bx} cy={by} r="4" fill={c} filter="url(#pegGlow)">
                    {spinning && (
                      <animate attributeName="opacity" values={i % 2 === 0 ? '1;0.2;1' : '0.2;1;0.2'} dur={`${0.3 + (i % 4) * 0.1}s`} repeatCount="indefinite" />
                    )}
                  </circle>
                </g>
              );
            })}
          </svg>

          {/* FLASHING LIGHTS RING - 24 chasing lights */}
          <div className="absolute inset-[-4px] z-25 pointer-events-none">
            {[...Array(24)].map((_, i) => {
              const deg = i * 15 - 90;
              const x = 50 + 50 * Math.cos(deg * Math.PI / 180);
              const y = 50 + 50 * Math.sin(deg * Math.PI / 180);
              const colors = ['#fbbf24', '#ec4899', '#a855f7', '#22c55e', '#3b82f6', '#f97316'];
              const c = colors[i % colors.length];
              const delay = (i * 0.12) % 1.8;
              return (
                <div
                  key={`fl-${i}`}
                  className="absolute rounded-full"
                  style={{
                    width: 8,
                    height: 8,
                    left: `${x}%`,
                    top: `${y}%`,
                    background: c,
                    boxShadow: `0 0 6px 2px ${c}, 0 0 12px 4px ${c}50`,
                    animation: `lightChase 1.8s ${delay}s ease-in-out infinite`,
                    transform: 'translate(-50%, -50%)',
                  }}
                />
              );
            })}
          </div>

          {/* Pointer (HTML element for reliable animation) */}
          <div
            className="absolute z-30"
            style={{
              top: -6, left: '50%', transform: 'translateX(-50%)',
              animation: pointerBouncing ? 'pointerBounce 0.15s ease-in-out infinite' : 'none',
            }}
          >
            <svg width="36" height="30" viewBox="0 0 36 30" style={{ filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.5))' }}>
              <defs>
                <linearGradient id="ptrGold" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#ffd700" />
                  <stop offset="50%" stopColor="#b8860b" />
                  <stop offset="100%" stopColor="#ffd700" />
                </linearGradient>
              </defs>
              <polygon points="18,28 3,2 33,2" fill="url(#ptrGold)" stroke="#8b6914" strokeWidth="1" />
              <polygon points="18,22 9,5 27,5" fill="#ffd700" opacity="0.5" />
              <circle cx="18" cy="7" r="4.5" fill="#dc2626" stroke="#ffd700" strokeWidth="1.2" />
              <circle cx="16.5" cy="5.5" r="1.5" fill="#ff8888" opacity="0.6" />
            </svg>
          </div>

          {/* SPINNING WHEEL LAYER */}
          <div
            className="absolute rounded-full overflow-hidden"
            style={{
              top: 16, left: 16, right: 16, bottom: 16,
              transform: `rotate(${rotation}deg)`,
              transition: spinning ? 'transform 5s cubic-bezier(0.12, 0.8, 0.18, 1)' : 'none',
            }}
          >
            {/* Colored segments */}
            <svg viewBox="0 0 200 200" className="w-full h-full">
              <defs>
                <radialGradient id="segD" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#000" stopOpacity="0.2" />
                  <stop offset="55%" stopColor="#000" stopOpacity="0" />
                  <stop offset="100%" stopColor="#000" stopOpacity="0.12" />
                </radialGradient>
                <linearGradient id="segShine" x1="30%" y1="0%" x2="70%" y2="100%">
                  <stop offset="0%" stopColor="#fff" stopOpacity="0.1" />
                  <stop offset="50%" stopColor="#fff" stopOpacity="0" />
                  <stop offset="100%" stopColor="#000" stopOpacity="0.06" />
                </linearGradient>
              </defs>
              {WHEEL_SEGMENTS.map((seg, i) => {
                const sA = i * SEG_ANGLE - 90;
                const eA = sA + SEG_ANGLE;
                const s = { x: 100 + 100 * Math.cos(sA * Math.PI / 180), y: 100 + 100 * Math.sin(sA * Math.PI / 180) };
                const e = { x: 100 + 100 * Math.cos(eA * Math.PI / 180), y: 100 + 100 * Math.sin(eA * Math.PI / 180) };
                return (
                  <g key={seg.id}>
                    <path d={`M 100 100 L ${s.x} ${s.y} A 100 100 0 0 1 ${e.x} ${e.y} Z`} fill={seg.color} stroke="#0a0f1a" strokeWidth="1" />
                    <path d={`M 100 100 L ${s.x} ${s.y} A 100 100 0 0 1 ${e.x} ${e.y} Z`} fill="url(#segD)" />
                  </g>
                );
              })}
              {/* Divider lines */}
              {WHEEL_SEGMENTS.map((_, i) => {
                const a = i * SEG_ANGLE - 90;
                return <line key={`d${i}`} x1="100" y1="100" x2={100 + 99 * Math.cos(a * Math.PI / 180)} y2={100 + 99 * Math.sin(a * Math.PI / 180)} stroke="#0a0f1a" strokeWidth="2" opacity="0.4" />;
              })}
              {/* Shine overlay */}
              <circle cx="100" cy="100" r="99" fill="url(#segShine)" />
            </svg>

            {/* Prize images */}
            {WHEEL_SEGMENTS.map((seg, i) => {
              const mid = i * SEG_ANGLE - 90 + SEG_ANGLE / 2;
              const ix = 50 + 32 * Math.cos(mid * Math.PI / 180);
              const iy = 50 + 32 * Math.sin(mid * Math.PI / 180);
              return (
                <img
                  key={`ic-${seg.id}`}
                  src={WHEEL_IMAGES[seg.image]}
                  alt={seg.label}
                  className="absolute pointer-events-none"
                  style={{
                    width: 48, height: 48,
                    left: `${ix}%`, top: `${iy}%`,
                    transform: `translate(-50%, -50%) rotate(${mid + 90}deg)`,
                    filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.5))',
                    objectFit: 'contain',
                  }}
                />
              );
            })}
          </div>

          {/* CENTER HUB (non-rotating) */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20" style={{ width: 76, height: 76 }}>
            <svg viewBox="0 0 76 76" className="w-full h-full">
              <defs>
                <radialGradient id="hubM" cx="38%" cy="35%">
                  <stop offset="0%" stopColor="#ffd700" />
                  <stop offset="50%" stopColor="#f59e0b" />
                  <stop offset="85%" stopColor="#d97706" />
                  <stop offset="100%" stopColor="#92400e" />
                </radialGradient>
                <radialGradient id="hubH" cx="35%" cy="30%">
                  <stop offset="0%" stopColor="#fff" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#fff" stopOpacity="0" />
                </radialGradient>
              </defs>
              <circle cx="38" cy="38" r="37" fill="none" stroke="url(#wg1)" strokeWidth="3" filter="url(#gldGlow)" />
              <circle cx="38" cy="38" r="34" fill="url(#hubM)" />
              <circle cx="38" cy="38" r="34" fill="url(#hubH)" />
              <circle cx="38" cy="38" r="28" fill="none" stroke="#92400e" strokeWidth="0.8" opacity="0.4" />
            </svg>
            <button
              type="button"
              onClick={spin}
              disabled={spinning || playsLeft <= 0}
              className={`absolute inset-0 rounded-full flex items-center justify-center transition-all duration-200 ${
                spinning || playsLeft <= 0 ? 'opacity-60 cursor-not-allowed' : 'hover:scale-110 active:scale-90 cursor-pointer'
              }`}
            >
              {spinning ? (
                <RotateCcw className="w-7 h-7 animate-spin text-white drop-shadow-lg" />
              ) : (
                <span className="text-white font-black text-lg tracking-wider" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.6)' }}>SPIN</span>
              )}
            </button>
          </div>
        </div>

        {/* Result */}
        {result && (
          <div
            className="text-center p-6 bg-gradient-to-r from-green-500/20 via-emerald-500/20 to-green-500/20 rounded-2xl border border-green-500/50"
            style={{ animation: 'resultZoom 0.5s cubic-bezier(0.25, 1, 0.5, 1) both' }}
          >
            <div className="w-24 h-24 mx-auto mb-3" style={{ animation: 'float 2s ease-in-out infinite' }}>
              <img src={WHEEL_IMAGES[result.image]} alt="" className="w-full h-full object-contain drop-shadow-lg" />
            </div>
            <div className="text-3xl font-black text-yellow-400 mb-4" style={{ textShadow: '0 0 20px rgba(251,191,36,0.5)' }}>
              {result.label}
            </div>
            <button
              type="button"
              onClick={() => { onWin(result.prize, result.label); setResult(null); }}
              className="px-10 py-3.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-xl font-bold text-lg shadow-lg shadow-green-500/30 btn-glow transition-all hover:scale-105 active:scale-95"
              style={{ '--btn-shadow': '#065F46', '--btn-glow': 'rgba(16,185,129,0.3)', '--btn-glow2': 'rgba(16,185,129,0.15)', animation: 'collectBtnPulse 2s ease-in-out infinite' }}
            >
              🎉 Claim Prize!
            </button>
          </div>
        )}
      </div>
    </div>
  );
}