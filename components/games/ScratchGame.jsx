'use client';

import { useState, useEffect, useRef } from 'react';
import { HelpCircle, X } from 'lucide-react';
import TutorialModal from '../modals/TutorialModal';

export default function ScratchGame({ onClose, onWin, closing }) {
  const canvas0 = useRef(null);
  const canvas1 = useRef(null);
  const canvas2 = useRef(null);
  const canvasRefs = [canvas0, canvas1, canvas2];
  const [scratching, setScratching] = useState(-1);
  const [revealed, setRevealed] = useState([false, false, false]);
  const [allRevealed, setAllRevealed] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [confettiParts, setConfettiParts] = useState([]);
  const [prizeAnim, setPrizeAnim] = useState(false);
  const [jackpotFlash, setJackpotFlash] = useState(false);
  const [jackpotShake, setJackpotShake] = useState(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const percents = useRef([0, 0, 0]);

  const SYMBOLS = [
    { icon: '/images/diamond.png', name: 'Diamond', color: '#60A5FA' },
    { icon: '/images/coin.png', name: 'Gold', color: '#FBBF24' },
    { icon: '/images/gem.png', name: 'Gem', color: '#34D399' },
    { icon: '/images/wheel/fire.png', name: 'Fire', color: '#F87171' },
    { icon: '/images/wheel/star.png', name: 'Star', color: '#A78BFA' },
    { icon: '/images/wheel/lucky-clover.png', name: 'Lucky', color: '#4ADE80' },
  ];

  const [symbols] = useState(() => {
    const roll = Math.random();
    if (roll < 0.20) {
      const s = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
      return [s, s, s];
    } else if (roll < 0.55) {
      const s = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
      let other;
      do { other = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]; } while (other.icon === s.icon);
      const arr = [s, s, other];
      const pos = Math.floor(Math.random() * 3);
      [arr[pos], arr[2]] = [arr[2], arr[pos]];
      return arr;
    } else {
      const picked = [];
      while (picked.length < 3) {
        const s = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
        if (picked.length < 2 || !picked.every(p => p.icon === s.icon)) picked.push(s);
        else picked.push(SYMBOLS[(SYMBOLS.indexOf(s) + 1) % SYMBOLS.length]);
      }
      return picked;
    }
  });

  const matchCount = symbols[0].icon === symbols[1].icon && symbols[1].icon === symbols[2].icon ? 3
    : (symbols[0].icon === symbols[1].icon || symbols[1].icon === symbols[2].icon || symbols[0].icon === symbols[2].icon) ? 2 : 0;

  const prize = matchCount === 3 ? [200, 300, 500][Math.floor(Math.random() * 3)]
    : matchCount === 2 ? [50, 75, 100][Math.floor(Math.random() * 3)]
    : [10, 15, 25][Math.floor(Math.random() * 3)];

  // Draw gold foil on each canvas
  useEffect(() => {
    canvasRefs.forEach((ref) => {
      const c = ref.current;
      if (!c) return;
      const ctx = c.getContext('2d');
      const w = c.width, h = c.height;
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, '#D4A017');
      g.addColorStop(0.2, '#F5D060');
      g.addColorStop(0.4, '#C8960C');
      g.addColorStop(0.6, '#F5D060');
      g.addColorStop(0.8, '#D4A017');
      g.addColorStop(1, '#E8C840');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 800; i++) {
        ctx.fillStyle = `rgba(255,255,255,${Math.random() * 0.15})`;
        ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1);
      }
      for (let i = 0; i < 400; i++) {
        ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.1})`;
        ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1);
      }
      ctx.fillStyle = 'rgba(180,140,20,0.6)';
      ctx.font = 'bold 14px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('SCRATCH', w / 2, h / 2);
    });
  }, []);

  const doScratch = (e, idx) => {
    if (scratching !== idx || revealed[idx]) return;
    const c = canvasRefs[idx].current;
    const ctx = c.getContext('2d');
    const rect = c.getBoundingClientRect();
    const cx = (e.clientX || e.touches?.[0]?.clientX);
    const cy = (e.clientY || e.touches?.[0]?.clientY);
    if (!cx || !cy) return;
    const x = (cx - rect.left) * (c.width / rect.width);
    const y = (cy - rect.top) * (c.height / rect.height);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.fill();
    if (lastPos.current.x) {
      ctx.lineWidth = 40;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    lastPos.current = { x, y };
    const imageData = ctx.getImageData(0, 0, c.width, c.height);
    let transparent = 0;
    for (let i = 3; i < imageData.data.length; i += 4) {
      if (imageData.data[i] === 0) transparent++;
    }
    const pct = (transparent / (c.width * c.height)) * 100;
    percents.current[idx] = pct;
    if (pct > 45 && !revealed[idx]) {
      ctx.clearRect(0, 0, c.width, c.height);
      const newRevealed = [...revealed];
      newRevealed[idx] = true;
      setRevealed(newRevealed);
      if (newRevealed.every(r => r)) {
        setAllRevealed(true);
        setPrizeAnim(true);
        // Jackpot effects
        if (matchCount === 3) {
          setJackpotFlash(true);
          setJackpotShake(true);
          setTimeout(() => setJackpotFlash(false), 600);
          setTimeout(() => setJackpotShake(false), 800);
        }
        // Confetti
        const parts = [];
        const count = matchCount === 3 ? 80 : matchCount === 2 ? 50 : 30;
        for (let i = 0; i < count; i++) {
          parts.push({
            id: i, x: 30 + Math.random() * 40, y: 30 + Math.random() * 20,
            color: ['#FBBF24', '#F87171', '#34D399', '#60A5FA', '#A78BFA', '#F472B6', '#FB923C'][i % 7],
            size: 4 + Math.random() * 7, rotation: Math.random() * 360,
            delay: Math.random() * 0.5, duration: 1.5 + Math.random() * 1.5,
          });
        }
        setConfettiParts(parts);
        onWin(prize);
      }
    }
  };

  const startScratch = (idx) => { setScratching(idx); lastPos.current = { x: 0, y: 0 }; };
  const stopScratch = () => setScratching(-1);

  // Check if two symbols match for pulse effect
  const isMatched = (idx) => {
    if (!allRevealed) return false;
    return symbols.filter(s => s.icon === symbols[idx].icon).length >= 2;
  };

  return (
    <div className={`fixed inset-0 bg-black/95 flex items-center justify-center z-[70] p-4 ${closing ? 'anim-backdrop-close' : 'anim-fade-in'}`} onClick={onClose}>
      {showTutorial && <TutorialModal tutorialKey="scratch" onClose={() => setShowTutorial(false)} />}

      {/* Jackpot screen flash */}
      {jackpotFlash && (
        <div className="fixed inset-0 z-[80] pointer-events-none bg-yellow-400" style={{ animation: 'jackpotFlash 0.6s ease-out forwards' }} />
      )}

      <div
        className={`max-w-lg w-full ${closing ? 'anim-modal-close' : 'anim-scale-in'}`}
        style={jackpotShake ? { animation: 'jackpotShake 0.8s ease-out' } : {}}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rounded-3xl overflow-hidden relative" style={{ background: 'linear-gradient(180deg, #1a1000 0%, #0d0800 100%)', border: '3px solid #D4A017', boxShadow: '0 0 40px rgba(212,160,23,0.2), 0 20px 60px rgba(0,0,0,0.5)' }}>

          {/* Header */}
          <div className="relative px-6 pt-5 pb-4">
            <div className="flex items-center justify-between">
              <button type="button" onClick={() => setShowTutorial(true)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <HelpCircle className="w-5 h-5 text-yellow-500/70" />
              </button>
              <div className="text-center">
                <div className="text-xs font-bold tracking-[0.3em] text-yellow-600 mb-1">✦ PREMIUM ✦</div>
                <h2 className="text-2xl font-black text-yellow-400" style={{ textShadow: '0 2px 8px rgba(251,191,36,0.3)' }}>SCRATCH & WIN</h2>
              </div>
              <button type="button" onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <p className="text-center text-yellow-700 text-sm mt-2 font-medium">Match 3 symbols for the jackpot!</p>
            <div className="mt-4 h-px bg-gradient-to-r from-transparent via-yellow-600/40 to-transparent" />
          </div>

          {/* Prize tiers */}
          <div className="flex justify-center gap-4 px-6 pb-4">
            {[
              { label: '3×', text: 'JACKPOT', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20', textColor: 'text-yellow-300', labelColor: 'text-yellow-400' },
              { label: '2×', text: 'WIN', bg: 'bg-white/5', border: 'border-white/10', textColor: 'text-gray-300', labelColor: 'text-gray-400' },
              { label: '0×', text: 'BONUS', bg: 'bg-white/5', border: 'border-white/10', textColor: 'text-gray-400', labelColor: 'text-gray-500' },
            ].map((t, i) => (
              <div key={i} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg ${t.bg} border ${t.border}`}>
                <span className={`${t.labelColor} text-xs font-bold`}>{t.label}</span>
                <span className={`${t.textColor} text-xs font-black`}>{t.text}</span>
              </div>
            ))}
          </div>

          {/* 3 Scratch Zones */}
          <div className="flex gap-4 px-6 pb-2 justify-center">
            {[0, 1, 2].map(idx => (
              <div key={idx} className="relative" style={{ width: 130, height: 150 }}>
                <div className="absolute inset-0 rounded-2xl overflow-hidden" style={{
                  border: revealed[idx] ? `3px solid ${symbols[idx].color}` : '3px solid rgba(212,160,23,0.4)',
                  boxShadow: revealed[idx] ? `0 0 25px ${symbols[idx].color}50, inset 0 0 25px ${symbols[idx].color}20` : '0 0 10px rgba(212,160,23,0.1)',
                  transition: 'all 0.5s ease',
                }}>
                  {/* Prize underneath */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ background: revealed[idx] ? `radial-gradient(circle, ${symbols[idx].color}15 0%, rgba(5,10,20,0.95) 70%)` : 'rgba(5,10,20,0.95)' }}>
                    {/* Reveal burst ring */}
                    {revealed[idx] && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-16 h-16 rounded-full border-2" style={{ borderColor: symbols[idx].color, animation: 'revealBurst 0.6s ease-out forwards' }} />
                      </div>
                    )}
                    {/* Symbol with pop animation */}
                    <img
                      src={symbols[idx].icon}
                      alt={symbols[idx].name}
                      className="w-16 h-16 object-contain"
                      style={{
                        animation: revealed[idx]
                          ? `symbolPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both${isMatched(idx) ? ', matchPulse 1.2s ease-in-out 0.6s infinite' : ''}`
                          : 'none',
                        opacity: revealed[idx] ? 1 : 0.2,
                        transform: revealed[idx] ? 'scale(1)' : 'scale(0.4)',
                        filter: revealed[idx] ? `drop-shadow(0 0 14px ${symbols[idx].color}90)` : 'none',
                      }}
                    />
                    {/* Sparkle particles orbiting */}
                    {revealed[idx] && [0, 1, 2, 3].map(si => (
                      <div key={si} className="absolute pointer-events-none" style={{
                        top: '50%', left: '50%', marginTop: -4, marginLeft: -4,
                        width: 8, height: 8, borderRadius: '50%',
                        background: `radial-gradient(circle, white, ${symbols[idx].color})`,
                        animation: `sparkleOrbit ${2 + si * 0.3}s linear ${si * 0.4}s infinite`,
                        boxShadow: `0 0 6px ${symbols[idx].color}`,
                      }} />
                    ))}
                    <div className={`text-xs font-black mt-2 tracking-wider transition-all duration-500 ${revealed[idx] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`} style={{ color: symbols[idx].color, transitionDelay: '0.3s' }}>
                      {symbols[idx].name.toUpperCase()}
                    </div>
                  </div>

                  {/* Gold foil canvas + shimmer overlay */}
                  {!revealed[idx] && (
                    <>
                      <canvas
                        ref={canvasRefs[idx]}
                        width={130}
                        height={150}
                        className="absolute inset-0 cursor-crosshair touch-none rounded-2xl"
                        style={{ width: '100%', height: '100%' }}
                        onMouseDown={() => startScratch(idx)}
                        onMouseUp={stopScratch}
                        onMouseLeave={stopScratch}
                        onMouseMove={(e) => doScratch(e, idx)}
                        onTouchStart={() => startScratch(idx)}
                        onTouchEnd={stopScratch}
                        onTouchMove={(e) => doScratch(e, idx)}
                      />
                      {/* Gold shimmer sweep */}
                      <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
                        <div className="absolute top-0 w-[30%] h-full" style={{
                          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)',
                          animation: 'goldShimmer 3s ease-in-out infinite',
                          animationDelay: `${idx * 0.8}s`,
                        }} />
                      </div>
                    </>
                  )}
                </div>
                {/* Zone number */}
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black" style={{ background: revealed[idx] ? symbols[idx].color : 'rgba(212,160,23,0.8)', color: '#000' }}>
                  {revealed[idx] ? '✓' : idx + 1}
                </div>
              </div>
            ))}
          </div>

          {/* Status dots */}
          <div className="px-6 py-4">
            <div className="flex items-center justify-center gap-3 mb-3">
              {[0, 1, 2].map(idx => (
                <div key={idx} className="transition-all duration-300" style={{
                  width: revealed[idx] ? 14 : 10, height: revealed[idx] ? 14 : 10, borderRadius: '50%',
                  background: revealed[idx] ? '#4ADE80' : '#374151',
                  boxShadow: revealed[idx] ? '0 0 10px rgba(74,222,128,0.6)' : 'none',
                  animation: revealed[idx] ? 'symbolPop 0.3s ease both' : 'none',
                }} />
              ))}
              <span className="text-xs text-gray-500 ml-2">{revealed.filter(r => r).length}/3 revealed</span>
            </div>

            {/* Prize result */}
            {allRevealed && (
              <div className={`text-center py-5 rounded-2xl mb-4`} style={{
                animation: 'resultZoom 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both',
                background: matchCount === 3 ? 'linear-gradient(135deg, rgba(251,191,36,0.15) 0%, rgba(245,158,11,0.05) 100%)' : matchCount === 2 ? 'linear-gradient(135deg, rgba(96,165,250,0.1) 0%, rgba(59,130,246,0.05) 100%)' : 'rgba(255,255,255,0.03)',
                border: matchCount === 3 ? '2px solid rgba(251,191,36,0.4)' : matchCount === 2 ? '2px solid rgba(96,165,250,0.3)' : '2px solid rgba(255,255,255,0.1)',
              }}>
                <div className="text-4xl mb-2" style={{ animation: 'float 2s ease-in-out infinite' }}>
                  {matchCount === 3 ? '🎰' : matchCount === 2 ? '🎉' : '🪙'}
                </div>
                <div className={`text-sm font-bold mb-1 ${matchCount === 3 ? 'text-yellow-400' : matchCount === 2 ? 'text-blue-400' : 'text-gray-400'}`}>
                  {matchCount === 3 ? '🔥 JACKPOT! 3 MATCHES! 🔥' : matchCount === 2 ? '✨ 2 MATCHES!' : 'Bonus Prize'}
                </div>
                <div className={`text-5xl font-black tabular-nums ${matchCount === 3 ? 'text-yellow-400' : matchCount === 2 ? 'text-blue-400' : 'text-gray-300'}`} style={{ textShadow: matchCount === 3 ? '0 0 30px rgba(251,191,36,0.5)' : 'none' }}>
                  {prize}
                </div>
                <div className={`text-sm font-bold ${matchCount === 3 ? 'text-yellow-500' : matchCount === 2 ? 'text-blue-300' : 'text-gray-500'}`}>
                  KWACHA
                </div>
              </div>
            )}

            {/* Collect button with pulse */}
            {allRevealed ? (
              <button
                type="button"
                onClick={onClose}
                className="w-full py-4 rounded-2xl font-black text-lg transition-all hover:scale-[1.02] active:scale-95"
                style={{
                  '--btn-shadow': matchCount === 3 ? '#92400E' : '#164E63',
                  '--btn-glow': matchCount === 3 ? 'rgba(251,191,36,0.3)' : 'rgba(6,182,212,0.2)',
                  '--btn-glow2': matchCount === 3 ? 'rgba(251,191,36,0.15)' : 'rgba(6,182,212,0.1)',
                  background: matchCount === 3 ? 'linear-gradient(180deg, #FBBF24 0%, #D97706 100%)' : 'linear-gradient(180deg, #22D3EE 0%, #0891B2 100%)',
                  color: '#000',
                  animation: 'collectBtnPulse 2s ease-in-out infinite',
                }}
              >
                💰 Collect {prize} Coins!
              </button>
            ) : (
              <p className="text-center text-gray-500 text-sm">Scratch each zone to reveal your symbols</p>
            )}
          </div>

          {/* Confetti overlay */}
          {confettiParts.length > 0 && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
              {confettiParts.map(p => (
                <div
                  key={p.id}
                  className="absolute"
                  style={{
                    left: `${p.x}%`, top: `${p.y}%`,
                    width: p.size, height: p.size * 0.6,
                    background: p.color, borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                    transform: `rotate(${p.rotation}deg)`,
                    animation: `confettiFall ${p.duration}s ease-out ${p.delay}s forwards`,
                    '--drift': `${(Math.random() - 0.5) * 60}px`,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}