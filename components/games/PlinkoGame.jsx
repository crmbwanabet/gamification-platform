'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { HelpCircle, X, RotateCcw } from 'lucide-react';
import { C } from '@/components/redesign/tokens';
import { RewardIcon } from '@/components/redesign/RedesignShell';
import TutorialModal from '../modals/TutorialModal';

// ============================================================================
// PLINKO DROP — polish pass (2026-07-13). Same game, same physics, same
// structure: risk tiers, wagers, drop slider, moving/obstacle pegs, bombs,
// progressive jackpot. What changed is the rendering: 2× crisp canvas, v2
// palette (navy board, silver pegs, teal movers, gold ball), comet trail on
// the ball, peg hit-flash ripples, real slot buckets with divider fins and
// time-decaying landing flashes, jackpot screen shake, coin icons over emoji.
// ============================================================================

const W = 380, H = 380, DPR = 2; // logical size / render scale

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
  const landedFlashRef = useRef([]);   // [{slot, t}] — time-decaying flashes
  const isRunningRef = useRef(false);
  const jackpotRef = useRef(100);
  const timeRef = useRef(0);
  const shakeRef = useRef(-10);        // time of last jackpot (screen shake)
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

  // Slot definitions: 'JP' = jackpot, 'BOMB' = lose wager, 0 = no win.
  // The ×0 slots flank the jackpot: aim for the center, risk the misses.
  const RISK_CONFIG = {
    low: {
      label: '🛡️ Low', slots: [15, 10, 5, 0, 'JP', 0, 5, 10, 15],
      obstacleRate: 0.04, moveSpeed: 0.3, moveAmp: 0.015,
    },
    medium: {
      label: '⚖️ Med', slots: [50, 25, 10, 0, 'JP', 0, 10, 25, 50],
      obstacleRate: 0.06, moveSpeed: 0.6, moveAmp: 0.025,
    },
    high: {
      label: '🔥 High', slots: [250, 'BOMB', 25, 0, 'JP', 0, 25, 'BOMB', 250],
      obstacleRate: 0.09, moveSpeed: 1.0, moveAmp: 0.035,
    },
  };

  const config = RISK_CONFIG[risk];
  const slots = config.slots;
  const NUM_SLOTS = slots.length;

  // v2 palette slot colors
  const getSlotColor = (v) => {
    if (v === 'JP') return C.gold;
    if (v === 'BOMB') return C.red;
    if (v === 0) return '#565c68';
    if (v >= 100) return C.red;
    if (v >= 25) return '#e8963f';
    if (v >= 5) return C.green;
    return '#8b919c';
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
        pegs.push({ x, y, baseX: x, row, col, isMoving: MOVING_ROWS.includes(row), hitT: -10 });
      }
    }
    pegsRef.current = pegs;

    const eligible = pegs.filter((p) => p.row >= 2 && !p.isMoving);
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

  // ------------------------------------------------------------------ draw --
  const draw = useCallback(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    const t = timeRef.current;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // jackpot screen shake (first 0.45s after hit)
    const shakeAge = t - shakeRef.current;
    if (shakeAge < 0.45 && shakeAge >= 0) {
      const mag = (1 - shakeAge / 0.45) * 4;
      ctx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag);
    }

    // board: navy gradient + cool top glow + vignette
    const bg = ctx.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#1b1e2c');
    bg.addColorStop(0.6, '#151823');
    bg.addColorStop(1, '#10131c');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    const glow = ctx.createRadialGradient(W / 2, -40, 0, W / 2, -40, W * 0.8);
    glow.addColorStop(0, 'rgba(130,150,210,0.10)');
    glow.addColorStop(1, 'rgba(130,150,210,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);
    // side walls
    const wallL = ctx.createLinearGradient(0, 0, 10, 0);
    wallL.addColorStop(0, 'rgba(255,255,255,0.07)');
    wallL.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = wallL;
    ctx.fillRect(0, 0, 10, H);
    const wallR = ctx.createLinearGradient(W, 0, W - 10, 0);
    wallR.addColorStop(0, 'rgba(255,255,255,0.07)');
    wallR.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = wallR;
    ctx.fillRect(W - 10, 0, 10, H);

    // sparks
    const sparks = sparksRef.current;
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.life -= 0.05;
      s.x += s.vx; s.y += s.vy; s.vy += 0.001;
      if (s.life <= 0) { sparks.splice(i, 1); continue; }
      ctx.globalAlpha = s.life;
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x * W, s.y * H, s.size * s.life, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // pegs
    const pegs = pegsRef.current;
    const obstacles = obstaclesRef.current;

    for (let pi = 0; pi < pegs.length; pi++) {
      const peg = pegs[pi];
      if (peg.isMoving) {
        peg.x = peg.baseX + Math.sin(t * config.moveSpeed + peg.row * 1.5) * config.moveAmp;
      }
      const px = peg.x * W, py = peg.y * H;
      const isObstacle = obstacles.has(pi);

      // hit-flash ripple ring
      const hitAge = t - peg.hitT;
      if (hitAge >= 0 && hitAge < 0.45) {
        const p = hitAge / 0.45;
        ctx.globalAlpha = (1 - p) * 0.5;
        ctx.strokeStyle = isObstacle ? C.red : peg.isMoving ? C.teal : '#cdd3e0';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(px, py, PEG_RAD + p * 11, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      if (isObstacle) {
        const dGlow = ctx.createRadialGradient(px, py, 0, px, py, PEG_RAD * 3);
        dGlow.addColorStop(0, 'rgba(229,87,63,0.22)');
        dGlow.addColorStop(1, 'rgba(229,87,63,0)');
        ctx.fillStyle = dGlow;
        ctx.beginPath(); ctx.arc(px, py, PEG_RAD * 3, 0, Math.PI * 2); ctx.fill();

        const pg = ctx.createRadialGradient(px - 1, py - 1, 0, px, py, PEG_RAD + 1);
        pg.addColorStop(0, '#f5a08c');
        pg.addColorStop(1, '#c23a26');
        ctx.fillStyle = pg;
        ctx.beginPath(); ctx.arc(px, py, PEG_RAD + 1, 0, Math.PI * 2); ctx.fill();
      } else if (peg.isMoving) {
        // movement rail
        ctx.strokeStyle = 'rgba(53,179,166,0.16)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo((peg.baseX - config.moveAmp) * W, py);
        ctx.lineTo((peg.baseX + config.moveAmp) * W, py);
        ctx.stroke();
        const pg = ctx.createRadialGradient(px - 1, py - 1, 0, px, py, PEG_RAD);
        pg.addColorStop(0, '#7fe0d4');
        pg.addColorStop(1, '#1e7a70');
        ctx.fillStyle = pg;
        ctx.beginPath(); ctx.arc(px, py, PEG_RAD, 0, Math.PI * 2); ctx.fill();
      } else {
        // silver metal peg with soft under-shadow
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath(); ctx.arc(px + 0.6, py + 1.4, PEG_RAD, 0, Math.PI * 2); ctx.fill();
        const pg = ctx.createRadialGradient(px - 1.2, py - 1.2, 0, px, py, PEG_RAD);
        pg.addColorStop(0, '#eef1f6');
        pg.addColorStop(0.55, '#9aa2b1');
        pg.addColorStop(1, '#5a6170');
        ctx.fillStyle = pg;
        ctx.beginPath(); ctx.arc(px, py, PEG_RAD, 0, Math.PI * 2); ctx.fill();
      }
      // specular
      ctx.fillStyle = `rgba(255,255,255,${isObstacle ? 0.35 : 0.3})`;
      ctx.beginPath(); ctx.arc(px - 1.1, py - 1.1, PEG_RAD * 0.32, 0, Math.PI * 2); ctx.fill();
    }

    // slots — real buckets with divider fins
    const slotH = 32;
    const slotW = W / NUM_SLOTS;
    const slotY = H - slotH;

    // prune + index landing flashes
    landedFlashRef.current = landedFlashRef.current.filter(f => t - f.t < 1.4);
    const flashBySlot = new Map();
    for (const f of landedFlashRef.current) {
      const k = Math.max(0, 1 - (t - f.t) / 1.4);
      flashBySlot.set(f.slot, Math.max(flashBySlot.get(f.slot) || 0, k));
    }

    slots.forEach((val, i) => {
      const sx = i * slotW;
      const col = getSlotColor(val);
      const isJP = val === 'JP';
      const isBomb = val === 'BOMB';
      const flash = flashBySlot.get(i) || 0;

      // bucket fill
      const bucketG = ctx.createLinearGradient(0, slotY, 0, H);
      bucketG.addColorStop(0, `${col}${flash > 0 ? 'cc' : '2e'}`);
      bucketG.addColorStop(1, `${col}${flash > 0 ? '55' : '14'}`);
      ctx.fillStyle = bucketG;
      ctx.beginPath();
      ctx.roundRect(sx + 2, slotY, slotW - 4, slotH - 2, [5, 5, 0, 0]);
      ctx.fill();
      if (flash > 0) {
        ctx.globalAlpha = flash * 0.85;
        ctx.shadowColor = col; ctx.shadowBlur = 18;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }
      // top lip
      ctx.fillStyle = flash > 0 ? '#ffffff' : `${col}66`;
      ctx.fillRect(sx + 2, slotY, slotW - 4, 1.5);

      // JP ambient pulse
      if (isJP) {
        const pulse = 0.55 + Math.sin(t * 3) * 0.25;
        ctx.globalAlpha = pulse * 0.35;
        ctx.shadowColor = C.gold; ctx.shadowBlur = 14;
        ctx.fillStyle = C.gold;
        ctx.fillRect(sx + 2, slotY, slotW - 4, slotH - 2);
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1;
      }

      // label
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const cx = sx + slotW / 2;
      const cy = slotY + slotH / 2;
      if (isJP) {
        ctx.font = '11px system-ui';
        ctx.fillText('🏆', cx, cy - 6);
        ctx.fillStyle = flash > 0 ? '#fff' : C.gold;
        ctx.font = "bold 8px Onest, system-ui";
        ctx.fillText('JP', cx, cy + 8);
      } else if (isBomb) {
        ctx.font = '14px system-ui';
        ctx.fillText('💣', cx, cy);
      } else {
        ctx.fillStyle = flash > 0 ? '#fff' : val === 0 ? 'rgba(150,158,172,.75)' : col;
        ctx.font = `bold ${val >= 100 ? 9.5 : 10.5}px Onest, system-ui`;
        ctx.fillText(`×${val}`, cx, cy + 1);
      }
    });

    // divider fins between buckets
    for (let i = 0; i <= NUM_SLOTS; i++) {
      const fx = i * slotW;
      const finG = ctx.createLinearGradient(fx - 1.5, 0, fx + 1.5, 0);
      finG.addColorStop(0, 'rgba(150,158,175,0.15)');
      finG.addColorStop(0.5, 'rgba(210,216,230,0.75)');
      finG.addColorStop(1, 'rgba(150,158,175,0.15)');
      ctx.fillStyle = finG;
      ctx.beginPath();
      ctx.roundRect(fx - 1.5, slotY - 9, 3, slotH + 7, 2);
      ctx.fill();
      // fin cap
      ctx.fillStyle = 'rgba(240,244,250,0.9)';
      ctx.beginPath();
      ctx.arc(fx, slotY - 9, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // drop indicator: gold chevron + faint dashed guide
    const dropPx = (dropX / 100) * W;
    ctx.strokeStyle = 'rgba(230,173,74,0.18)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 5]);
    ctx.beginPath();
    ctx.moveTo(dropPx, 20);
    ctx.lineTo(dropPx, 64);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = C.gold;
    ctx.beginPath();
    ctx.moveTo(dropPx, 12);
    ctx.lineTo(dropPx - 6, 2);
    ctx.lineTo(dropPx + 6, 2);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(dropPx, 16, 3.2, 0, Math.PI * 2);
    ctx.fill();

    // balls — comet trail + gold body; landed balls pop and vanish
    for (const ball of ballsRef.current) {
      if (ball.dead) continue;
      const bx = ball.x * W, by = ball.y * H;
      if (ball.landed) {
        // absorb into the bucket: quick shrink + fade
        const k = Math.max(0, 1 - (t - ball.landedAt) / 0.3);
        if (k <= 0) continue;
        ctx.globalAlpha = k;
        const popG = ctx.createRadialGradient(bx - 2, by - 2, 0, bx, by, BALL_RAD * (0.4 + k * 0.6));
        popG.addColorStop(0, '#fff3c4');
        popG.addColorStop(0.45, '#f5c34d');
        popG.addColorStop(1, '#a3611a');
        ctx.fillStyle = popG;
        ctx.beginPath();
        ctx.arc(bx, by + (1 - k) * 5, BALL_RAD * (0.4 + k * 0.6), 0, Math.PI * 2);
        ctx.fill();
        // burst ring as it's absorbed
        ctx.globalAlpha = k * 0.5;
        ctx.strokeStyle = '#ffd35e';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(bx, by, BALL_RAD * (1 + (1 - k) * 1.6), 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
        continue;
      }
      // trail
      if (ball.trail) {
        for (let ti = 0; ti < ball.trail.length; ti++) {
          const tp = ball.trail[ti];
          const k = (ti + 1) / ball.trail.length; // older → smaller/fainter
          ctx.globalAlpha = k * 0.22;
          ctx.fillStyle = '#ffd35e';
          ctx.beginPath();
          ctx.arc(tp.x * W, tp.y * H, BALL_RAD * (0.35 + k * 0.5), 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      // glow
      const bg2 = ctx.createRadialGradient(bx, by, 0, bx, by, BALL_RAD * 2.5);
      bg2.addColorStop(0, 'rgba(230,173,74,0.25)');
      bg2.addColorStop(1, 'rgba(230,173,74,0)');
      ctx.fillStyle = bg2;
      ctx.beginPath(); ctx.arc(bx, by, BALL_RAD * 2.5, 0, Math.PI * 2); ctx.fill();
      // body
      const ballG = ctx.createRadialGradient(bx - 2, by - 2, 0, bx, by, BALL_RAD);
      ballG.addColorStop(0, '#fff3c4');
      ballG.addColorStop(0.45, '#f5c34d');
      ballG.addColorStop(1, '#a3611a');
      ctx.fillStyle = ballG;
      ctx.beginPath(); ctx.arc(bx, by, BALL_RAD, 0, Math.PI * 2); ctx.fill();
      // specular
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath(); ctx.arc(bx - 2, by - 2.2, BALL_RAD * 0.3, 0, Math.PI * 2); ctx.fill();
    }

    // bottom vignette
    const vig = ctx.createLinearGradient(0, H - 70, 0, H);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.22)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, H - 70, W, 70);
  }, [slots, NUM_SLOTS, config, dropX]);

  // ------------------------------------------------------------------ step --
  const step = useCallback(() => {
    const pegs = pegsRef.current;
    const obstacles = obstaclesRef.current;
    const collDist = (PEG_RAD + BALL_RAD + 1) / Math.min(W, H);
    const obstacleDist = (PEG_RAD + 2 + BALL_RAD) / Math.min(W, H);
    const slotYNorm = 1 - (32 / H);
    const balls = ballsRef.current;
    let anyActive = false;

    timeRef.current += 0.05;

    for (const peg of pegs) {
      if (peg.isMoving) {
        peg.x = peg.baseX + Math.sin(timeRef.current * config.moveSpeed + peg.row * 1.5) * config.moveAmp;
      }
    }

    for (let bi = balls.length - 1; bi >= 0; bi--) {
      const b = balls[bi];
      if (b.landed || b.dead) continue;
      anyActive = true;

      // comet trail
      if (!b.trail) b.trail = [];
      b.trail.push({ x: b.x, y: b.y });
      if (b.trail.length > 9) b.trail.shift();

      b.vy += GRAVITY / H;
      b.vx *= FRICTION;
      b.x += b.vx;
      b.y += b.vy;

      const br = BALL_RAD / W;
      if (b.x < br) { b.x = br; b.vx = Math.abs(b.vx) * 0.4; }
      if (b.x > 1 - br) { b.x = 1 - br; b.vx = -Math.abs(b.vx) * 0.4; }

      for (let pi = 0; pi < pegs.length; pi++) {
        const p = pegs[pi];
        const dx = b.x - p.x;
        const dy = b.y - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const isObs = obstacles.has(pi);
        const threshold = isObs ? obstacleDist : collDist;

        if (dist < threshold && dist > 0.0001) {
          p.hitT = timeRef.current; // light the peg up
          if (isObs) {
            b.dead = true;
            setActiveBalls(prev => prev - 1);
            setLastResult({ type: 'obstacle', prize: 0 });
            for (let si = 0; si < 12; si++) {
              const angle = (si / 12) * Math.PI * 2;
              sparksRef.current.push({
                x: p.x, y: p.y,
                vx: Math.cos(angle) * 0.012,
                vy: Math.sin(angle) * 0.01,
                life: 1, size: 3 + Math.random() * 3,
                color: si % 2 === 0 ? C.red : '#f5a08c',
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

          for (let si = 0; si < 2; si++) {
            sparksRef.current.push({
              x: p.x, y: p.y,
              vx: (Math.random() - 0.5) * 0.006,
              vy: -Math.random() * 0.004 - 0.002,
              life: 0.6 + Math.random() * 0.3,
              size: 2 + Math.random() * 1.5,
              color: p.isMoving ? '#7fe0d4' : '#cdd3e0',
            });
          }
          break;
        }
      }

      if (b.dead) continue;

      if (!b.stuckFrames) b.stuckFrames = 0;
      if (Math.abs(b.vy) < 0.001 && b.y > 0.1) {
        b.stuckFrames++;
        if (b.stuckFrames > 25) {
          b.vy = 0.006;
          b.vx = (Math.random() - 0.5) * 0.012;
          b.stuckFrames = 0;
        }
      } else b.stuckFrames = 0;

      if (b.y >= slotYNorm) {
        b.y = slotYNorm;
        b.landed = true;
        b.landedAt = timeRef.current;
        const slotIdx = Math.min(NUM_SLOTS - 1, Math.max(0, Math.floor(b.x * NUM_SLOTS)));
        const slotVal = slots[slotIdx];
        landedFlashRef.current.push({ slot: slotIdx, t: timeRef.current });

        if (slotVal === 'BOMB') {
          setLastResult({ type: 'bomb', prize: 0 });
          for (let si = 0; si < 10; si++) {
            sparksRef.current.push({
              x: b.x, y: b.y - 0.02,
              vx: (Math.random() - 0.5) * 0.015,
              vy: -Math.random() * 0.015,
              life: 1, size: 3 + Math.random() * 3,
              color: si % 3 === 0 ? C.red : si % 3 === 1 ? '#f08a3c' : C.gold,
            });
          }
        } else if (slotVal === 'JP') {
          const jpWin = jackpotRef.current * b.wager;
          onWin(jpWin);
          setTotalWon(prev => prev + jpWin);
          setLastResult({ type: 'jackpot', prize: jpWin });
          jackpotRef.current = 100;
          setJackpot(100);
          shakeRef.current = timeRef.current;
          for (let si = 0; si < 20; si++) {
            const angle = (si / 20) * Math.PI * 2;
            sparksRef.current.push({
              x: b.x, y: b.y - 0.02,
              vx: Math.cos(angle) * 0.015,
              vy: Math.sin(angle) * 0.012 - 0.005,
              life: 1, size: 3 + Math.random() * 4,
              color: [C.gold, '#fff0b8', '#e8963f', '#fff'][si % 4],
            });
          }
        } else if (slotVal === 0) {
          // ×0 — the near-miss beside the jackpot
          setLastResult({ type: 'zero', prize: 0 });
          jackpotRef.current += 5;
          setJackpot(jackpotRef.current);
        } else {
          const prize = slotVal * b.wager;
          if (prize > 0) onWin(prize);
          setTotalWon(prev => prev + prize);
          setLastResult({ type: 'win', prize });
          jackpotRef.current += 5;
          setJackpot(jackpotRef.current);
        }
        setActiveBalls(prev => prev - 1);
      }
    }

    // sweep fully-vanished balls (landed pop finished or destroyed)
    ballsRef.current = balls.filter(b =>
      !b.dead && !(b.landed && timeRef.current - b.landedAt > 0.35)
    );

    draw();

    if (anyActive || sparksRef.current.length > 0 || landedFlashRef.current.length > 0) {
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
    landedFlashRef.current = [];
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
  const CoinN = ({ n, size = 12 }) => (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
      {n}<RewardIcon kind="coins" size={size} />
    </span>
  );

  return (
    <div className={`fixed inset-0 flex items-center justify-center z-[70] p-4 ${closing ? "anim-backdrop-close" : "anim-fade-in"}`} onClick={onClose} style={{ background: 'rgba(8,10,16,.74)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' }}>
      <div className={`rounded-3xl max-w-md w-full p-4 max-h-[95vh] overflow-y-auto ${closing ? "anim-modal-close" : "anim-scale-in"}`} onClick={(e) => e.stopPropagation()} style={{ scrollbarWidth: 'none', background: `linear-gradient(180deg, ${C.panelHi}, ${C.panelLo})`, border: '1px solid rgba(255,255,255,.09)', color: C.text, boxShadow: '0 24px 60px rgba(0,0,0,.55)' }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <button type="button" onClick={() => setShowTutorial(true)} className="p-1.5 hover:bg-white/10 rounded-full">
            <HelpCircle className="w-5 h-5" style={{ color: C.sub }} />
          </button>
          <h2 className="text-xl font-black tracking-tight" style={{ fontFamily: "var(--font-display, 'Bricolage Grotesque', sans-serif)" }}>🔮 Plinko Drop</h2>
          <button type="button" onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Jackpot banner */}
        <div className="text-center mb-2 py-1.5 rounded-xl" style={{ background: 'linear-gradient(90deg, rgba(230,173,74,.16), rgba(230,173,74,.06), rgba(230,173,74,.16))', border: '1px solid rgba(230,173,74,.25)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.06)' }}>
          <div className="text-[10px] font-bold tracking-wider uppercase" style={{ color: C.gold }}>Progressive Jackpot</div>
          <div className="text-xl font-black inline-flex items-center gap-1.5" style={{ color: C.gold, textShadow: '0 0 12px rgba(230,173,74,0.35)', animation: 'pulseGlow 2s ease-in-out infinite' }}>
            🏆 {jackpot} <span className="text-[11px] font-bold" style={{ color: '#caa25c' }}>× wager</span>
          </div>
        </div>

        {/* Risk + Wager row */}
        <div className="flex items-center gap-2 mb-2">
          <div className="flex gap-1 flex-1">
            {['low', 'medium', 'high'].map(r => {
              const active = risk === r;
              const styles = {
                low: { bg: 'rgba(79,169,139,.18)', color: C.green, border: 'rgba(79,169,139,.4)' },
                medium: { bg: 'rgba(230,173,74,.18)', color: C.gold, border: 'rgba(230,173,74,.4)' },
                high: { bg: 'rgba(229,87,63,.18)', color: C.red, border: 'rgba(229,87,63,.4)' },
              }[r];
              return (
                <button key={r} type="button" disabled={activeBalls > 0}
                  onClick={() => { setRisk(r); resetBoard(); }}
                  className="flex-1 py-1.5 rounded-lg text-[11px] font-black transition-all"
                  style={active
                    ? { background: styles.bg, color: styles.color, border: `1px solid ${styles.border}` }
                    : { background: 'rgba(255,255,255,.05)', color: C.muted, border: '1px solid transparent' }}
                >{RISK_CONFIG[r].label}</button>
              );
            })}
          </div>
          <div className="flex items-center gap-1 rounded-lg p-1" style={{ background: C.track }}>
            {WAGERS.map(w => (
              <button key={w} type="button" disabled={activeBalls > 0}
                onClick={() => setWager(w)}
                className="px-2 py-1 rounded-md text-[11px] font-black transition-all"
                style={wager === w
                  ? { background: 'rgba(53,179,166,.3)', color: C.teal, border: '1px solid rgba(53,179,166,.4)' }
                  : { color: C.muted, border: '1px solid transparent' }}
              ><CoinN n={w} size={10} /></button>
            ))}
          </div>
        </div>

        {/* Drop position slider */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] font-bold w-8" style={{ color: C.muted }}>DROP</span>
          <input
            type="range" min="15" max="85" value={dropX}
            onChange={(e) => setDropX(Number(e.target.value))}
            className="flex-1 h-1.5"
            style={{ accentColor: C.gold }}
          />
        </div>

        {/* Canvas — rendered at 2× for crispness */}
        <canvas
          ref={canvasRef}
          width={W * DPR}
          height={H * DPR}
          className="w-full rounded-xl"
          style={{ maxWidth: W, margin: '0 auto', display: 'block', border: '1px solid rgba(255,255,255,.07)' }}
        />

        {/* Stats bar */}
        {hasActivity && (
          <div className="flex justify-between items-center mt-2 px-1 text-[11px] font-bold">
            <span style={{ color: C.muted }}>Spent: <span style={{ color: C.text }}><CoinN n={totalSpent} size={11} /></span></span>
            <span style={{ color: C.muted }}>Won: <span style={{ color: C.gold }}><CoinN n={totalWon} size={11} /></span></span>
            <span style={{ color: netProfit >= 0 ? C.green : C.red }}>
              {netProfit >= 0 ? '+' : ''}{netProfit} net
            </span>
          </div>
        )}

        {/* Last result flash */}
        {lastResult && activeBalls === 0 && (
          <div className="text-center mt-1" style={{ animation: 'resultZoom 0.4s cubic-bezier(0.34,1.56,0.64,1) both' }}>
            {lastResult.type === 'jackpot' && (
              <div className="text-lg font-black inline-flex items-center gap-1.5" style={{ color: C.gold, textShadow: '0 0 20px rgba(230,173,74,0.5)' }}>
                🏆 JACKPOT! +{lastResult.prize}<RewardIcon kind="coins" size={18} />
              </div>
            )}
            {lastResult.type === 'bomb' && <div className="text-base font-black" style={{ color: C.red }}>💣 BOOM! Lost wager</div>}
            {lastResult.type === 'obstacle' && <div className="text-base font-black" style={{ color: C.red }}>💥 Hit obstacle!</div>}
            {lastResult.type === 'zero' && <div className="text-base font-black" style={{ color: C.muted }}>×0 — so close to the jackpot!</div>}
            {lastResult.type === 'win' && lastResult.prize > 0 && (
              <div className="text-base font-black inline-flex items-center gap-1" style={{ color: lastResult.prize >= 50 ? C.gold : C.teal }}>
                +{lastResult.prize}<RewardIcon kind="coins" size={16} />
              </div>
            )}
          </div>
        )}

        {/* Buttons */}
        <div className="mt-2 flex gap-2">
          <button type="button" onClick={dropBall} disabled={autoDropping}
            className="flex-1 py-3 rounded-xl font-black text-sm transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
            style={{ background: 'linear-gradient(180deg,#57b795,#3f9a7b)', color: '#08210f', boxShadow: '0 6px 18px rgba(79,169,139,.4)' }}
          >
            <span className="inline-flex items-center gap-1.5">🔮 Drop ({wager}<RewardIcon kind="coins" size={13} />)</span>
          </button>

          {!autoDropping ? (
            <button type="button" onClick={() => autoDrop(10)} disabled={activeBalls > 15}
              className="px-3 py-3 rounded-xl font-black text-[11px] transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
              style={{ background: 'linear-gradient(180deg,#3fbfb0,#2f9d92)', color: '#052420', boxShadow: '0 6px 18px rgba(53,179,166,.3)' }}
            >
              ×10
            </button>
          ) : (
            <button type="button" onClick={() => { clearInterval(autoDropRef.current); setAutoDropping(false); }}
              className="px-3 py-3 rounded-xl font-black text-[11px]"
              style={{ background: 'rgba(229,87,63,.3)', color: C.red, border: '1px solid rgba(229,87,63,.4)' }}
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
        <div className="flex justify-center gap-3 mt-2 text-[9px] font-bold" style={{ color: C.muted }}>
          <span><span className="inline-block w-2 h-2 rounded-full mr-0.5" style={{ background: '#cdd3e0' }} /> Peg</span>
          <span><span className="inline-block w-2 h-2 rounded-full mr-0.5" style={{ background: C.teal }} /> Moving</span>
          <span><span className="inline-block w-2 h-2 rounded-full mr-0.5" style={{ background: C.red }} /> Obstacle</span>
          {risk === 'high' && <span>💣 Bomb slot</span>}
          <span>🏆 Jackpot</span>
        </div>
      </div>

      {showTutorial && <TutorialModal tutorialKey="plinko" onClose={() => setShowTutorial(false)} />}
    </div>
  );
}

export default PlinkoGame;
