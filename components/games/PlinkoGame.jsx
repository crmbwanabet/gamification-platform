'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { HelpCircle, X, RotateCcw } from 'lucide-react';

function PlinkoGame({ onClose, onWin, closing }) {
  const canvasRef = useRef(null);
  const [risk, setRisk] = useState('medium');
  const [wager, setWager] = useState(1);
  const [dropX, setDropX] = useState(50);
  const [activeBalls, setActiveBalls] = useState(0);
  const [totalWon, setTotalWon] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [jackpot, setJackpot] = useState(100);
  const [lastResult, setLastResult] = useState(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [autoDropping, setAutoDropping] = useState(false);

  const animRef = useRef(null);
  const ballsRef = useRef([]);
  const sparksRef = useRef([]);
  const landedSlotsRef = useRef([]);
  const isRunningRef = useRef(false);
  const jackpotRef = useRef(100);
  const timeRef = useRef(0);
  const obstaclesRef = useRef(new Set());
  const autoDropRef = useRef(null);

  const ROWS = 12;
  const PEG_RAD = 4;
  const BALL_RAD = 7;
  const GRAVITY = 0.15;
  const BOUNCE = 0.55;
  const FRICTION = 0.98;
  const MOVING_ROWS = [3, 6, 9];
  const WAGERS = [1, 5, 10, 25];

  // Slot definitions: 'JP' = jackpot, 'BOMB' = lose wager
  const RISK_CONFIG = {
    low: {
      label: '🛡️ Low', slots: [15, 10, 5, 3, 'JP', 3, 5, 10, 15],
      obstacleRate: 0.04, moveSpeed: 0.3, moveAmp: 0.015,
    },
    medium: {
      label: '⚖️ Med', slots: [50, 25, 10, 5, 'JP', 5, 10, 25, 50],
      obstacleRate: 0.06, moveSpeed: 0.6, moveAmp: 0.025,
    },
    high: {
      label: '🔥 High', slots: [250, 'BOMB', 25, 5, 'JP', 5, 25, 'BOMB', 250],
      obstacleRate: 0.09, moveSpeed: 1.0, moveAmp: 0.035,
    },
  };

  const config = RISK_CONFIG[risk];
  const slots = config.slots;
  const NUM_SLOTS = slots.length;

  const getSlotColor = (v) => {
    if (v === 'JP') return '#fbbf24';
    if (v === 'BOMB') return '#ef4444';
    if (v >= 100) return '#ef4444';
    if (v >= 25) return '#f59e0b';
    if (v >= 5) return '#22c55e';
    return '#6b7280';
  };

  // Build peg grid
  const pegsRef = useRef([]);
  const buildPegs = useCallback(() => {
    const pegs = [];
    for (let row = 0; row < ROWS; row++) {
      const count = row + 3;
      const y = (row + 1.5) / (ROWS + 3);
      for (let col = 0; col < count; col++) {
        const x = (col + 1) / (count + 1);
        pegs.push({ x, y, baseX: x, row, col, isMoving: MOVING_ROWS.includes(row) });
      }
    }
    pegsRef.current = pegs;

    // Assign obstacle pegs (not on first 2 rows, not on moving rows for clarity)
    const eligible = pegs.filter((p, i) => p.row >= 2 && !p.isMoving);
    const numObstacles = Math.floor(eligible.length * config.obstacleRate);
    const shuffled = [...eligible].sort(() => Math.random() - 0.5);
    const obstacleSet = new Set();
    for (let i = 0; i < numObstacles; i++) {
      const idx = pegs.indexOf(shuffled[i]);
      if (idx >= 0) obstacleSet.add(idx);
    }
    obstaclesRef.current = obstacleSet;
  }, [config.obstacleRate]);

  useEffect(() => { buildPegs(); }, [risk, buildPegs]);

  // Drawing
  const draw = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    const w = c.width, h = c.height;
    ctx.clearRect(0, 0, w, h);

    // BG
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#0c1520');
    bg.addColorStop(1, '#060a10');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Sparks
    const sparks = sparksRef.current;
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.life -= 0.05;
      s.x += s.vx; s.y += s.vy; s.vy += 0.001;
      if (s.life <= 0) { sparks.splice(i, 1); continue; }
      ctx.globalAlpha = s.life;
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x * w, s.y * h, s.size * s.life, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Pegs
    const pegs = pegsRef.current;
    const obstacles = obstaclesRef.current;
    const t = timeRef.current;

    for (let pi = 0; pi < pegs.length; pi++) {
      const peg = pegs[pi];
      // Update moving peg positions
      if (peg.isMoving) {
        peg.x = peg.baseX + Math.sin(t * config.moveSpeed + peg.row * 1.5) * config.moveAmp;
      }

      const px = peg.x * w, py = peg.y * h;
      const isObstacle = obstacles.has(pi);

      if (isObstacle) {
        // Red obstacle peg with danger glow
        const glow = ctx.createRadialGradient(px, py, 0, px, py, PEG_RAD * 3);
        glow.addColorStop(0, 'rgba(239,68,68,0.2)');
        glow.addColorStop(1, 'rgba(239,68,68,0)');
        ctx.fillStyle = glow;
        ctx.beginPath(); ctx.arc(px, py, PEG_RAD * 3, 0, Math.PI * 2); ctx.fill();

        const pg = ctx.createRadialGradient(px - 1, py - 1, 0, px, py, PEG_RAD + 1);
        pg.addColorStop(0, '#fca5a5');
        pg.addColorStop(1, '#dc2626');
        ctx.fillStyle = pg;
        ctx.beginPath(); ctx.arc(px, py, PEG_RAD + 1, 0, Math.PI * 2); ctx.fill();
      } else if (peg.isMoving) {
        // Cyan moving peg
        const pg = ctx.createRadialGradient(px - 1, py - 1, 0, px, py, PEG_RAD);
        pg.addColorStop(0, '#67e8f9');
        pg.addColorStop(1, '#0e7490');
        ctx.fillStyle = pg;
        ctx.beginPath(); ctx.arc(px, py, PEG_RAD, 0, Math.PI * 2); ctx.fill();
        // movement trail hint
        ctx.strokeStyle = 'rgba(103,232,249,0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo((peg.baseX - config.moveAmp) * w, py);
        ctx.lineTo((peg.baseX + config.moveAmp) * w, py);
        ctx.stroke();
      } else {
        // Normal peg
        const pg = ctx.createRadialGradient(px - 1, py - 1, 0, px, py, PEG_RAD);
        pg.addColorStop(0, '#a5b4fc');
        pg.addColorStop(1, '#4338ca');
        ctx.fillStyle = pg;
        ctx.beginPath(); ctx.arc(px, py, PEG_RAD, 0, Math.PI * 2); ctx.fill();
      }
      // specular highlight
      ctx.fillStyle = `rgba(255,255,255,${isObstacle ? 0.3 : 0.15})`;
      ctx.beginPath(); ctx.arc(px - 1, py - 1, PEG_RAD * 0.35, 0, Math.PI * 2); ctx.fill();
    }

    // Slots at bottom
    const slotH = 32;
    const slotW = w / NUM_SLOTS;
    const slotY = h - slotH;
    const landedSet = new Set(landedSlotsRef.current);

    slots.forEach((val, i) => {
      const sx = i * slotW;
      const landed = landedSet.has(i);
      const col = getSlotColor(val);
      const isJP = val === 'JP';
      const isBomb = val === 'BOMB';

      // Background
      ctx.fillStyle = landed ? col : `${col}20`;
      ctx.fillRect(sx + 1, slotY, slotW - 2, slotH);
      if (landed) {
        ctx.shadowColor = col; ctx.shadowBlur = 15;
        ctx.fillRect(sx + 1, slotY, slotW - 2, slotH);
        ctx.shadowBlur = 0;
      }

      // Border
      ctx.strokeStyle = landed ? '#fff' : `${col}40`;
      ctx.lineWidth = landed ? 2 : 0.5;
      ctx.strokeRect(sx + 1, slotY, slotW - 2, slotH);

      // Label
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const cx = sx + slotW / 2;
      const cy = slotY + slotH / 2;

      if (isJP) {
        // Jackpot slot — pulsing gold
        const pulse = 0.8 + Math.sin(t * 3) * 0.2;
        ctx.fillStyle = `rgba(251,191,36,${pulse})`;
        ctx.font = 'bold 10px system-ui';
        ctx.fillText('🏆', cx, cy - 5);
        ctx.fillStyle = landed ? '#fff' : '#fbbf24';
        ctx.font = 'bold 8px system-ui';
        ctx.fillText('JP', cx, cy + 8);
      } else if (isBomb) {
        ctx.font = '14px system-ui';
        ctx.fillText('💣', cx, cy);
      } else {
        ctx.fillStyle = landed ? '#fff' : col;
        ctx.font = `bold ${val >= 100 ? 10 : 11}px system-ui`;
        ctx.fillText(val.toString(), cx, cy);
      }
    });

    // Drop position indicator at top
    const dropPx = (dropX / 100) * w;
    ctx.beginPath();
    ctx.moveTo(dropPx, 8);
    ctx.lineTo(dropPx - 6, 0);
    ctx.lineTo(dropPx + 6, 0);
    ctx.closePath();
    ctx.fillStyle = '#fbbf24';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(dropPx, 14, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#fbbf24';
    ctx.fill();

    // Balls
    for (const ball of ballsRef.current) {
      if (ball.dead) continue;
      const bx = ball.x * w, by = ball.y * h;
      // glow
      const bg2 = ctx.createRadialGradient(bx, by, 0, bx, by, BALL_RAD * 2.5);
      bg2.addColorStop(0, 'rgba(251,191,36,0.2)');
      bg2.addColorStop(1, 'rgba(251,191,36,0)');
      ctx.fillStyle = bg2;
      ctx.beginPath(); ctx.arc(bx, by, BALL_RAD * 2.5, 0, Math.PI * 2); ctx.fill();
      // body
      const ballG = ctx.createRadialGradient(bx - 2, by - 2, 0, bx, by, BALL_RAD);
      ballG.addColorStop(0, '#fef08a');
      ballG.addColorStop(0.5, '#fbbf24');
      ballG.addColorStop(1, '#b45309');
      ctx.fillStyle = ballG;
      ctx.beginPath(); ctx.arc(bx, by, BALL_RAD, 0, Math.PI * 2); ctx.fill();
      // specular
      ctx.fillStyle = 'rgba(255,255,255,0.45)';
      ctx.beginPath(); ctx.arc(bx - 2, by - 2, BALL_RAD * 0.3, 0, Math.PI * 2); ctx.fill();
    }
  }, [slots, NUM_SLOTS, config, dropX]);

  // Physics step
  const step = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const w = c.width, h = c.height;
    const pegs = pegsRef.current;
    const obstacles = obstaclesRef.current;
    const collDist = (PEG_RAD + BALL_RAD + 1) / Math.min(w, h);
    const obstacleDist = (PEG_RAD + 2 + BALL_RAD) / Math.min(w, h);
    const slotYNorm = 1 - (32 / h);
    const balls = ballsRef.current;
    let anyActive = false;

    timeRef.current += 0.05;

    // Update moving pegs
    for (const peg of pegs) {
      if (peg.isMoving) {
        peg.x = peg.baseX + Math.sin(timeRef.current * config.moveSpeed + peg.row * 1.5) * config.moveAmp;
      }
    }

    for (let bi = balls.length - 1; bi >= 0; bi--) {
      const b = balls[bi];
      if (b.landed || b.dead) continue;
      anyActive = true;

      b.vy += GRAVITY / h;
      b.vx *= FRICTION;
      b.x += b.vx;
      b.y += b.vy;

      // Walls
      const br = BALL_RAD / w;
      if (b.x < br) { b.x = br; b.vx = Math.abs(b.vx) * 0.4; }
      if (b.x > 1 - br) { b.x = 1 - br; b.vx = -Math.abs(b.vx) * 0.4; }

      // Peg collisions
      for (let pi = 0; pi < pegs.length; pi++) {
        const p = pegs[pi];
        const dx = b.x - p.x;
        const dy = b.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const isObs = obstacles.has(pi);
        const threshold = isObs ? obstacleDist : collDist;

        if (dist < threshold && dist > 0.0001) {
          if (isObs) {
            // HIT OBSTACLE — ball destroyed!
            b.dead = true;
            setActiveBalls(prev => prev - 1);
            setLastResult({ type: 'obstacle', prize: 0 });
            // Red explosion
            for (let si = 0; si < 12; si++) {
              const angle = (si / 12) * Math.PI * 2;
              sparksRef.current.push({
                x: p.x, y: p.y,
                vx: Math.cos(angle) * 0.012,
                vy: Math.sin(angle) * 0.01,
                life: 1, size: 3 + Math.random() * 3,
                color: si % 2 === 0 ? '#ef4444' : '#fca5a5',
              });
            }
            break;
          }

          const nx = dx / dist;
          const ny = dy / dist;
          b.x = p.x + nx * (collDist + 0.002);
          b.y = p.y + ny * (collDist + 0.002);

          const dot = b.vx * nx + b.vy * ny;
          if (dot < 0) {
            b.vx -= 2 * dot * nx;
            b.vy -= 2 * dot * ny;
            b.vx *= BOUNCE;
            b.vy *= BOUNCE;
          }
          b.vx += (Math.random() - 0.5) * 0.008;
          if (b.vy < 0.002) b.vy = 0.002 + Math.random() * 0.002;

          // Cyan sparks
          for (let si = 0; si < 2; si++) {
            sparksRef.current.push({
              x: p.x, y: p.y,
              vx: (Math.random() - 0.5) * 0.006,
              vy: -Math.random() * 0.004 - 0.002,
              life: 0.6 + Math.random() * 0.3,
              size: 2 + Math.random() * 1.5,
              color: p.isMoving ? '#67e8f9' : '#a5b4fc',
            });
          }
          break;
        }
      }

      if (b.dead) continue;

      // Anti-stuck
      if (!b.stuckFrames) b.stuckFrames = 0;
      if (Math.abs(b.vy) < 0.001 && b.y > 0.1) {
        b.stuckFrames++;
        if (b.stuckFrames > 25) {
          b.vy = 0.006;
          b.vx = (Math.random() - 0.5) * 0.012;
          b.stuckFrames = 0;
        }
      } else b.stuckFrames = 0;

      // Landed in slot
      if (b.y >= slotYNorm) {
        b.y = slotYNorm;
        b.landed = true;
        const slotIdx = Math.min(NUM_SLOTS - 1, Math.max(0, Math.floor(b.x * NUM_SLOTS)));
        const slotVal = slots[slotIdx];
        landedSlotsRef.current.push(slotIdx);

        if (slotVal === 'BOMB') {
          // Bomb — lose wager, explosion
          setLastResult({ type: 'bomb', prize: 0 });
          for (let si = 0; si < 10; si++) {
            sparksRef.current.push({
              x: b.x, y: b.y - 0.02,
              vx: (Math.random() - 0.5) * 0.015,
              vy: -Math.random() * 0.015,
              life: 1, size: 3 + Math.random() * 3,
              color: si % 3 === 0 ? '#ef4444' : si % 3 === 1 ? '#f97316' : '#fbbf24',
            });
          }
        } else if (slotVal === 'JP') {
          // JACKPOT!
          const jpWin = jackpotRef.current * b.wager;
          onWin(jpWin);
          setTotalWon(prev => prev + jpWin);
          setLastResult({ type: 'jackpot', prize: jpWin });
          jackpotRef.current = 100;
          setJackpot(100);
          // Gold explosion
          for (let si = 0; si < 20; si++) {
            const angle = (si / 20) * Math.PI * 2;
            sparksRef.current.push({
              x: b.x, y: b.y - 0.02,
              vx: Math.cos(angle) * 0.015,
              vy: Math.sin(angle) * 0.012 - 0.005,
              life: 1, size: 3 + Math.random() * 4,
              color: ['#fbbf24', '#fef08a', '#f59e0b', '#fff'][si % 4],
            });
          }
        } else {
          // Normal prize
          const prize = slotVal * b.wager;
          if (prize > 0) onWin(prize);
          setTotalWon(prev => prev + prize);
          setLastResult({ type: 'win', prize });
          // Grow jackpot
          jackpotRef.current += 5;
          setJackpot(jackpotRef.current);
        }
        setActiveBalls(prev => prev - 1);
      }
    }

    draw();

    if (anyActive || sparksRef.current.length > 0) {
      animRef.current = requestAnimationFrame(step);
    } else {
      isRunningRef.current = false;
    }
  }, [draw, slots, NUM_SLOTS, config, onWin]);

  const ensureRunning = useCallback(() => {
    if (!isRunningRef.current) {
      isRunningRef.current = true;
      animRef.current = requestAnimationFrame(step);
    }
  }, [step]);

  useEffect(() => { draw(); }, [risk, draw]);

  const dropBall = useCallback(() => {
    const ball = {
      x: (dropX / 100) * 0.8 + 0.1,
      y: 0.04,
      vx: (Math.random() - 0.5) * 0.002,
      vy: 0,
      landed: false, dead: false,
      stuckFrames: 0,
      wager: wager,
    };
    ballsRef.current.push(ball);
    setActiveBalls(prev => prev + 1);
    setTotalSpent(prev => prev + wager);
    ensureRunning();
  }, [dropX, wager, ensureRunning]);

  const autoDrop = (count) => {
    setAutoDropping(true);
    let dropped = 0;
    autoDropRef.current = setInterval(() => {
      if (dropped >= count) {
        clearInterval(autoDropRef.current);
        setAutoDropping(false);
        return;
      }
      dropBall();
      dropped++;
    }, 250);
  };

  const resetBoard = () => {
    cancelAnimationFrame(animRef.current);
    clearInterval(autoDropRef.current);
    isRunningRef.current = false;
    ballsRef.current = [];
    sparksRef.current = [];
    landedSlotsRef.current = [];
    setLastResult(null);
    setTotalWon(0);
    setTotalSpent(0);
    setActiveBalls(0);
    setAutoDropping(false);
    buildPegs();
    setTimeout(() => draw(), 10);
  };

  useEffect(() => () => {
    cancelAnimationFrame(animRef.current);
    clearInterval(autoDropRef.current);
  }, []);

  const netProfit = totalWon - totalSpent;
  const hasActivity = totalSpent > 0;

  return (
    <div className={`fixed inset-0 bg-black/95 flex items-center justify-center z-[70] p-4 ${closing ? "anim-backdrop-close" : "anim-fade-in"}`} onClick={onClose}>
      <div className={`bg-gradient-to-b from-[#0a1520] to-[#030810] rounded-3xl max-w-md w-full p-4 border-0 max-h-[95vh] overflow-y-auto ${closing ? "anim-modal-close" : "anim-scale-in"}`} onClick={(e) => e.stopPropagation()} style={{ scrollbarWidth: 'none' }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <button type="button" onClick={() => setShowTutorial(true)} className="p-1.5 hover:bg-white/10 rounded-full">
            <HelpCircle className="w-5 h-5 text-cyan-400" />
          </button>
          <h2 className="text-xl font-black tracking-tight">🔮 Plinko Drop</h2>
          <button type="button" onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Jackpot banner */}
        <div className="text-center mb-2 py-1.5 rounded-xl bg-gradient-to-r from-yellow-600/20 via-yellow-500/10 to-yellow-600/20 border border-yellow-500/20">
          <div className="text-[10px] font-bold text-yellow-600 tracking-wider uppercase">Progressive Jackpot</div>
          <div className="text-xl font-black text-yellow-400" style={{ textShadow: '0 0 10px rgba(251,191,36,0.3)', animation: 'pulseGlow 2s ease-in-out infinite' }}>
            🏆 {jackpot} × wager
          </div>
        </div>

        {/* Risk + Wager row */}
        <div className="flex items-center gap-2 mb-2">
          {/* Risk */}
          <div className="flex gap-1 flex-1">
            {['low', 'medium', 'high'].map(r => (
              <button key={r} type="button" disabled={activeBalls > 0}
                onClick={() => { setRisk(r); resetBoard(); }}
                className={`flex-1 py-1.5 rounded-lg text-[11px] font-black transition-all ${risk === r
                  ? r === 'low' ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                  : r === 'medium' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  : 'bg-red-500/20 text-red-400 border border-red-500/40'
                  : 'bg-white/5 text-gray-500 border border-transparent'
                }`}
              >{RISK_CONFIG[r].label}</button>
            ))}
          </div>
          {/* Wager */}
          <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
            {WAGERS.map(w => (
              <button key={w} type="button" disabled={activeBalls > 0}
                onClick={() => setWager(w)}
                className={`px-2 py-1 rounded-md text-[11px] font-black transition-all ${wager === w
                  ? 'bg-cyan-500/30 text-cyan-400 border border-cyan-500/40'
                  : 'text-gray-500 hover:text-gray-300'
                }`}
              >{w}🪙</button>
            ))}
          </div>
        </div>

        {/* Drop position slider */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] text-gray-500 font-bold w-8">DROP</span>
          <input
            type="range" min="15" max="85" value={dropX}
            onChange={(e) => setDropX(Number(e.target.value))}
            className="flex-1 accent-yellow-500 h-1.5"
          />
        </div>

        {/* Canvas */}
        <canvas
          ref={canvasRef}
          width={380}
          height={380}
          className="w-full rounded-xl"
          style={{ maxWidth: 380, margin: '0 auto', display: 'block' }}
        />

        {/* Stats bar */}
        {hasActivity && (
          <div className="flex justify-between items-center mt-2 px-1 text-[11px] font-bold">
            <span className="text-gray-500">Spent: <span className="text-white">{totalSpent}🪙</span></span>
            <span className="text-gray-500">Won: <span className="text-yellow-400">{totalWon}🪙</span></span>
            <span className={netProfit >= 0 ? 'text-green-400' : 'text-red-400'}>
              {netProfit >= 0 ? '+' : ''}{netProfit} net
            </span>
          </div>
        )}

        {/* Last result flash */}
        {lastResult && activeBalls === 0 && (
          <div className="text-center mt-1" style={{ animation: 'resultZoom 0.4s cubic-bezier(0.34,1.56,0.64,1) both' }}>
            {lastResult.type === 'jackpot' && (
              <div className="text-lg font-black text-yellow-400" style={{ textShadow: '0 0 20px rgba(251,191,36,0.5)' }}>
                🏆 JACKPOT! +{lastResult.prize}🪙
              </div>
            )}
            {lastResult.type === 'bomb' && <div className="text-base font-black text-red-400">💣 BOOM! Lost wager</div>}
            {lastResult.type === 'obstacle' && <div className="text-base font-black text-red-400">💥 Hit obstacle!</div>}
            {lastResult.type === 'win' && lastResult.prize > 0 && (
              <div className={`text-base font-black ${lastResult.prize >= 50 ? 'text-yellow-400' : 'text-cyan-400'}`}>
                +{lastResult.prize}🪙
              </div>
            )}
          </div>
        )}

        {/* Buttons */}
        <div className="mt-2 flex gap-2">
          <button type="button" onClick={dropBall} disabled={autoDropping}
            className="flex-1 py-3 rounded-xl font-black text-sm transition-all bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 shadow-lg shadow-cyan-500/25 hover:scale-[1.02] active:scale-95 disabled:opacity-50"
          >
            🔮 Drop ({wager}🪙)
          </button>

          {!autoDropping ? (
            <button type="button" onClick={() => autoDrop(10)} disabled={activeBalls > 15}
              className="px-3 py-3 rounded-xl font-black text-[11px] bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg shadow-purple-500/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              ×10
            </button>
          ) : (
            <button type="button" onClick={() => { clearInterval(autoDropRef.current); setAutoDropping(false); }}
              className="px-3 py-3 rounded-xl font-black text-[11px] bg-red-600/30 text-red-400 border border-red-500/40"
            >
              Stop
            </button>
          )}

          {hasActivity && activeBalls === 0 && !autoDropping && (
            <button type="button" onClick={resetBoard}
              className="px-3 py-3 rounded-xl font-black text-[11px] bg-white/5 hover:bg-white/10 border border-white/10 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Legend */}
        <div className="flex justify-center gap-3 mt-2 text-[9px] text-gray-500 font-bold">
          <span><span className="inline-block w-2 h-2 rounded-full bg-indigo-500 mr-0.5" /> Peg</span>
          <span><span className="inline-block w-2 h-2 rounded-full bg-cyan-400 mr-0.5" /> Moving</span>
          <span><span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-0.5" /> Obstacle</span>
          {risk === 'high' && <span>💣 Bomb slot</span>}
          <span>🏆 Jackpot</span>
        </div>
      </div>
    </div>
  );
}

export default PlinkoGame;
