'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Trophy, Star, Gift, Target, Crown, Gem, Diamond, Gamepad2, Store, Medal, 
  Zap, ChevronRight, Check, X, Users, Award, Sparkles, 
  Bell, Flame, ChevronDown, ChevronUp, User, Home, Menu, Copy, 
  Map, HelpCircle, Play, RotateCcw, Clock, CheckCircle,
  Lock, Timer, ArrowRight, XCircle, TrendingUp, Calendar, CircleDollarSign, Dices, Music, Brain, Globe,
  Camera, Wallet
} from 'lucide-react';

// Redesign (v2) screens
import Overview from './redesign/Overview';
import PlayView from './redesign/PlayView';
import EarnView from './redesign/EarnView';
import StoreView from './redesign/StoreView';
import LevelUpModal from './redesign/LevelUpModal';
import ProfileModal from './redesign/ProfileModal';
// SSO session (bwanabet token -> Supabase profile)
import { useSession } from './session/SessionProvider';

// Data imports
import { IMG_BASE, CURRENCY_ICONS, IMAGES, WHEEL_IMAGES } from '../lib/data/images';
// trivia + predictions libs parked — see parked/lib/
import {
  XP_LEVELS, VIP_TIERS, MINIGAMES, STORE_ITEMS,
  DAILY_REWARDS, LEVEL_REWARDS, STREAK_REWARDS, DAILY_FREE_SPIN_ROTATION, getDailyFreeSpinGames,
  getLevel, getNextLevel, getXPProgress, getVIP
} from '../lib/data/platform';
import {
  DAILY_MISSION_POOL, WEEKLY_MISSIONS, PERMANENT_MISSIONS,
  getDailyMissions, DIFFICULTY_CONFIG, MISSIONS
} from '../lib/data/missions';

// Component imports
import MissionDetailModal from './modals/MissionDetailModal';
import WheelGame from './games/WheelGame';
import ScratchGame from './games/ScratchGame';
import DiceGame from './games/DiceGame';
import HighLowGame from './games/HighLowGame';
import PlinkoGame from './games/PlinkoGame';
import TapFrenzyGame from './games/TapFrenzyGame';
import StopClockGame from './games/StopClockGame';
// trivia games parked — see parked/components/games/

// Respect the user's OS-level motion preference.
// Returns true when `prefers-reduced-motion: reduce` is active.
const useReducedMotion = () => {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return reduced;
};

// Daily free allowance per game. All games refresh back to these values at
// 6am local time every day; plays ABOVE the allowance (earned/purchased
// extras) carry over untouched — the refresh only tops up, never removes.
const DAILY_GAME_PLAYS = { wheel: 3, scratch: 5, dice: 5, highlow: 5, plinko: 5, tapfrenzy: 5, stopclock: 5 };
// Identifies the current "game day" — a new one starts at 6am.
const playsRefreshKey = () => {
  const d = new Date();
  if (d.getHours() < 6) d.setDate(d.getDate() - 1);
  return d.toDateString();
};

export default function GamificationPlatform() {
  const prefersReducedMotion = useReducedMotion();
  const [tab, setTab] = useState('home');
  const [activeGame, setActiveGame] = useState(null);
  const [selectedMission, setSelectedMission] = useState(null);
  const [closingModal, setClosingModal] = useState(false);
  
  const animateClose = useCallback((closeFn) => {
    setClosingModal(true);
    setTimeout(() => {
      setClosingModal(false);
      closeFn();
    }, 230);
  }, []);
  const [notif, setNotif] = useState(null);
  const [notifLeaving, setNotifLeaving] = useState(false);
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [showBuyModal, setShowBuyModal] = useState(null); // 'coins' | 'gems' | 'diamonds' | null
  const [showConfetti, setShowConfetti] = useState(false);
  const [coinBounce, setCoinBounce] = useState(false);

  // ============================================================================
  // REWARD ANIMATION SYSTEM
  // ============================================================================
  const rewardCanvasRef = useRef(null);
  const rewardParticlesRef = useRef([]);
  const rewardAnimFrameRef = useRef(null);
  const [rewardOverlay, setRewardOverlay] = useState(null); // { type, rewards, source }
  const [flyingCoins, setFlyingCoins] = useState([]);
  const [screenFlash, setScreenFlash] = useState(null); // 'gold' | 'cyan' | 'white'
  const [screenShake, setScreenShake] = useState(false);
  const [rollingNumbers, setRollingNumbers] = useState([]); // [{id, value, x, y, color}]
  const flyIdRef = useRef(0);
  const rollIdRef = useRef(0);

  // Particle engine — renders themed particles on canvas
  const spawnParticles = useCallback((x, y, count, config = {}) => {
    const { type = 'coin', spread = 120, speed = 4, gravity = 0.12, life = 80, size = 8 } = config;
    const emojis = { coin: '🪙', gem: '💚', diamond: '💎', star: '⭐', fire: '🔥', sparkle: '✨' };
    const colors = { coin: '#EAB308', gem: '#10B981', diamond: '#3B82F6', star: '#FBBF24', fire: '#F97316', sparkle: '#E0E7FF' };
    for (let i = 0; i < count; i++) {
      const angle = (Math.random() - 0.5) * (spread * Math.PI / 180);
      const vel = speed * (0.5 + Math.random() * 0.8);
      rewardParticlesRef.current.push({
        x, y,
        vx: Math.sin(angle) * vel * (Math.random() > 0.5 ? 1 : -1),
        vy: -Math.cos(angle) * vel - Math.random() * 2,
        life: life + Math.random() * 30,
        maxLife: life + Math.random() * 30,
        size: size * (0.6 + Math.random() * 0.6),
        rotation: Math.random() * 360,
        rotSpeed: (Math.random() - 0.5) * 12,
        emoji: emojis[type] || '✨',
        color: colors[type] || '#FBBF24',
        gravity,
        type,
      });
    }
    if (!rewardAnimFrameRef.current) startParticleLoop();
  }, []);

  const startParticleLoop = useCallback(() => {
    const canvas = rewardCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    const loop = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + 'px';
      canvas.style.height = window.innerHeight + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      const particles = rewardParticlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.vx *= 0.99;
        p.rotation += p.rotSpeed;
        p.life--;

        const alpha = Math.min(1, p.life / (p.maxLife * 0.3));
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.font = `${p.size}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.emoji, 0, 0);
        ctx.restore();

        if (p.life <= 0) particles.splice(i, 1);
      }

      if (particles.length > 0) {
        rewardAnimFrameRef.current = requestAnimationFrame(loop);
      } else {
        rewardAnimFrameRef.current = null;
      }
    };
    rewardAnimFrameRef.current = requestAnimationFrame(loop);
  }, []);

  // Screen flash effect — short, amber-tinted acknowledgement (~180ms)
  const triggerFlash = useCallback((color = 'gold') => {
    setScreenFlash(color);
    setTimeout(() => setScreenFlash(null), 180);
  }, []);

  // Screen shake effect
  const triggerShake = useCallback(() => {
    setScreenShake(true);
    setTimeout(() => setScreenShake(false), 400);
  }, []);

  // Floating number pop-up from a point
  const spawnFloatingNumber = useCallback((text, x, y, color = '#EAB308') => {
    const id = ++rollIdRef.current;
    setRollingNumbers(prev => [...prev, { id, text, x, y, color }]);
    setTimeout(() => setRollingNumbers(prev => prev.filter(r => r.id !== id)), 900);
  }, []);

  // Currency fly-to-header animation
  const spawnFlyingCoin = useCallback((fromX, fromY, type = 'coin') => {
    const emojis = { coin: '🪙', gem: '💚', diamond: '💎' };
    const targets = { coin: '.currency-coin-target', gem: '.currency-gem-target', diamond: '.currency-diamond-target' };
    const targetEl = document.querySelector(targets[type]);
    const toX = targetEl ? targetEl.getBoundingClientRect().left + 12 : window.innerWidth / 2;
    const toY = targetEl ? targetEl.getBoundingClientRect().top + 12 : 30;
    const count = type === 'coin' ? 6 : 3;
    for (let i = 0; i < count; i++) {
      const id = ++flyIdRef.current;
      const delay = i * 80;
      const startX = fromX + (Math.random() - 0.5) * 40;
      const startY = fromY + (Math.random() - 0.5) * 40;
      setTimeout(() => {
        setFlyingCoins(prev => [...prev, { id, emoji: emojis[type], fromX: startX, fromY: startY, toX, toY }]);
        setTimeout(() => {
          setFlyingCoins(prev => prev.filter(c => c.id !== id));
          setCoinBounce(true);
          setTimeout(() => setCoinBounce(false), 300);
        }, 700);
      }, delay);
    }
  }, []);

  // Master reward trigger — composes effects based on tier under a 2-layer motion budget.
  // Budget excludes the persistent WebGL background shader and hover transitions.
  //   small  -> 1 layer:  floating number(s)
  //   medium -> 2 layers: floating number(s) + brief gold screen flash
  //   big    -> 2 layers: fly-to-header trail + confetti burst (the trail IS the drama)
  // prefers-reduced-motion collapses every tier to a static floating number only.
  const triggerReward = useCallback((tier, sourceEl, rewards = {}) => {
    const rect = sourceEl?.getBoundingClientRect?.() || { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 };
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    // Reduced-motion path: acknowledge the reward with a single, gentle float-up number.
    // No confetti, no shake, no flash, no shimmer, no fly-to-header trail.
    if (prefersReducedMotion) {
      if (rewards.coins) spawnFloatingNumber(`+${rewards.coins}`, cx, cy - 20, '#EAB308');
      if (rewards.gems) spawnFloatingNumber(`+${rewards.gems}`, cx + 40, cy - 20, '#10B981');
      if (rewards.diamonds) spawnFloatingNumber(`+${rewards.diamonds}`, cx - 40, cy - 20, '#3B82F6');
      if (rewards.xp) spawnFloatingNumber(`+${rewards.xp} XP`, cx, cy - 50, '#c026d3');
      return;
    }

    if (tier === 'small') {
      // 1 layer: float number(s) only. No shake, no flash, no particles.
      if (rewards.coins) spawnFloatingNumber(`+${rewards.coins}`, cx, cy - 20, '#EAB308');
      if (rewards.gems) spawnFloatingNumber(`+${rewards.gems}`, cx + 40, cy - 20, '#10B981');
      if (rewards.xp) spawnFloatingNumber(`+${rewards.xp} XP`, cx - 40, cy - 20, '#c026d3');
    }
    else if (tier === 'medium') {
      // 2 layers: float number(s) + brief amber screen flash (~180ms via triggerFlash).
      triggerFlash('gold');
      if (rewards.coins) spawnFloatingNumber(`+${rewards.coins}`, cx, cy - 30, '#EAB308');
      if (rewards.gems) spawnFloatingNumber(`+${rewards.gems}`, cx + 50, cy - 30, '#10B981');
      if (rewards.diamonds) spawnFloatingNumber(`+${rewards.diamonds}`, cx - 50, cy - 30, '#3B82F6');
      if (rewards.xp) spawnFloatingNumber(`+${rewards.xp} XP`, cx, cy - 60, '#c026d3');
    }
    else if (tier === 'big') {
      // 2 layers: fly-to-header currency trail + confetti burst. No shake, no flash, no shimmer.
      if (rewards.coins) {
        spawnFlyingCoin(cx, cy, 'coin');
        spawnFloatingNumber(`+${rewards.coins}`, cx, cy - 30, '#EAB308');
      }
      if (rewards.gems) {
        setTimeout(() => spawnFlyingCoin(cx, cy, 'gem'), 250);
        spawnFloatingNumber(`+${rewards.gems}`, cx + 50, cy - 30, '#10B981');
      }
      if (rewards.diamonds) {
        setTimeout(() => spawnFlyingCoin(cx, cy, 'diamond'), 450);
        spawnFloatingNumber(`+${rewards.diamonds}`, cx - 50, cy - 30, '#3B82F6');
      }
      if (rewards.xp) spawnFloatingNumber(`+${rewards.xp} XP`, cx, cy - 70, '#c026d3');
      // Confetti burst (second layer) — single downpour, lighter than before.
      for (let i = 0; i < 20; i++) {
        setTimeout(() => {
          spawnParticles(Math.random() * window.innerWidth, -10, 1, {
            type: ['coin', 'star', 'sparkle'][Math.floor(Math.random() * 3)],
            spread: 35, speed: 2.5, gravity: 0.16, life: 60, size: 14
          });
        }, i * 45);
      }
    }
  }, [prefersReducedMotion, spawnParticles, spawnFlyingCoin, spawnFloatingNumber, triggerFlash]);

  // Avatar options
  const AVATARS = [
    '😎', '🤩', '😈', '👻', '🤖', '👽', '🦁', '🐯', '🦊', '🐺',
    '🦅', '🦉', '🐲', '🔥', '⚡', '💀', '👑', '🎮', '🎯', '🏆',
    '💎', '🌟', '🚀', '🎪', '🎭', '🃏', '🎲', '🎰', '💰', '🏴‍☠️'
  ];

  // Add CSS for scrollbars and animations
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      /* Global overrides - bigger/bolder fonts, soft edges */
      .scrollbar-hide::-webkit-scrollbar { display: none; }
      .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
      
      /* ===== 3D BUTTON SYSTEM ===== */
      .btn-3d {
        position: relative;
        border: none;
        border-radius: 16px;
        font-weight: 800;
        letter-spacing: 0.02em;
        text-shadow: 0 1px 2px rgba(0,0,0,0.3);
        box-shadow: 
          0 4px 0 rgba(0,0,0,0.35),
          0 6px 20px rgba(0,0,0,0.25),
          inset 0 1px 0 rgba(255,255,255,0.2),
          inset 0 -1px 0 rgba(0,0,0,0.15);
        transition: all 0.15s cubic-bezier(0.22, 1, 0.36, 1);
        overflow: hidden;
        transform: translateY(0);
      }
      .btn-3d:hover {
        transform: translateY(-2px);
        box-shadow: 
          0 6px 0 rgba(0,0,0,0.35),
          0 10px 30px rgba(0,0,0,0.3),
          inset 0 1px 0 rgba(255,255,255,0.25),
          inset 0 -1px 0 rgba(0,0,0,0.15);
      }
      .btn-3d:active {
        transform: translateY(3px);
        box-shadow: 
          0 1px 0 rgba(0,0,0,0.35),
          0 2px 8px rgba(0,0,0,0.2),
          inset 0 2px 4px rgba(0,0,0,0.2);
      }
      .btn-3d::after {
        content: '';
        position: absolute;
        top: 0; left: 0; right: 0;
        height: 50%;
        background: linear-gradient(180deg, rgba(255,255,255,0.12) 0%, transparent 100%);
        border-radius: 16px 16px 0 0;
        pointer-events: none;
      }
      
      /* Plum 3D button */
      .btn-3d-purple {
        background: linear-gradient(180deg, #a855f7 0%, #9333ea 40%, #7c3aed 100%);
        color: #fff;
        text-shadow: none;
        box-shadow:
          0 4px 0 #6d28d9,
          0 6px 20px rgba(147,51,234,0.3),
          0 0 20px rgba(168,85,247,0.15),
          inset 0 1px 0 rgba(255,255,255,0.3),
          inset 0 -1px 0 rgba(0,0,0,0.2);
      }
      .btn-3d-purple:hover {
        box-shadow:
          0 6px 0 #6d28d9,
          0 10px 30px rgba(147,51,234,0.4),
          0 0 30px rgba(168,85,247,0.25),
          inset 0 1px 0 rgba(255,255,255,0.35);
      }
      .btn-3d-purple:active {
        box-shadow:
          0 1px 0 #6d28d9,
          0 2px 8px rgba(147,51,234,0.3),
          inset 0 2px 4px rgba(0,0,0,0.3);
      }
      
      /* Green 3D button */
      .btn-3d-green {
        background: linear-gradient(180deg, #22C55E 0%, #16A34A 40%, #15803D 100%);
        box-shadow: 
          0 4px 0 #166534,
          0 6px 20px rgba(34,197,94,0.35),
          inset 0 1px 0 rgba(255,255,255,0.2),
          inset 0 -1px 0 rgba(0,0,0,0.2);
      }
      .btn-3d-green:hover {
        box-shadow: 
          0 6px 0 #166534,
          0 10px 30px rgba(34,197,94,0.5),
          inset 0 1px 0 rgba(255,255,255,0.25);
      }
      .btn-3d-green:active {
        box-shadow: 
          0 1px 0 #166534,
          0 2px 8px rgba(34,197,94,0.3),
          inset 0 2px 4px rgba(0,0,0,0.3);
      }

      /* Pink 3D button */
      .btn-3d-pink {
        background: linear-gradient(180deg, #EC4899 0%, #DB2777 40%, #BE185D 100%);
        box-shadow: 
          0 4px 0 #9D174D,
          0 6px 20px rgba(236,72,153,0.35),
          inset 0 1px 0 rgba(255,255,255,0.2),
          inset 0 -1px 0 rgba(0,0,0,0.2);
      }
      .btn-3d-pink:hover {
        box-shadow: 
          0 6px 0 #9D174D,
          0 10px 30px rgba(236,72,153,0.5),
          inset 0 1px 0 rgba(255,255,255,0.25);
      }

      /* Electric blue 3D button */
      .btn-3d-blue {
        background: linear-gradient(180deg, #38BDF8 0%, #0EA5E9 40%, #0284C7 100%);
        color: #000;
        text-shadow: none;
        box-shadow: 
          0 4px 0 #075985,
          0 6px 20px rgba(14,165,233,0.4),
          0 0 20px rgba(56,189,248,0.15),
          inset 0 1px 0 rgba(255,255,255,0.3),
          inset 0 -1px 0 rgba(0,0,0,0.2);
      }
      .btn-3d-blue:hover {
        box-shadow: 
          0 6px 0 #075985,
          0 10px 30px rgba(14,165,233,0.5),
          0 0 30px rgba(56,189,248,0.25),
          inset 0 1px 0 rgba(255,255,255,0.35);
      }
      
      /* ===== UNIFIED CARD SYSTEM =====
         One source of truth: .card = base tokens.
         Variants: .card--elevated (hero/feature), .card--flat (subtle), .card--match (predictions).
         Legacy aliases (.card-soft / .card-interactive / .match-card) compose these. */
      .card {
        background: rgba(36, 20, 50, 0.65);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(147, 51, 234, 0.15);
        border-radius: 16px;
        transition: border-color 180ms ease, background 180ms ease, transform 180ms ease, box-shadow 180ms ease;
      }
      .card-interactive:hover,
      .card.interactive:hover {
        border-color: rgba(147, 51, 234, 0.4);
        background: rgba(45, 26, 63, 0.75);
      }
      /* Variant modifiers */
      .card--elevated {
        background: rgba(45, 26, 63, 0.8);
        box-shadow: 0 12px 32px rgba(12, 5, 24, 0.5);
      }
      .card--flat {
        background: rgba(30, 16, 44, 0.5);
        backdrop-filter: blur(8px);
      }
      .card--match {
        border-radius: 20px;
        padding: 16px;
      }
      /* Legacy aliases — keep JSX usage sites working, but composed from .card tokens */
      .card-soft {
        background: rgba(30, 16, 44, 0.5);
        backdrop-filter: blur(8px);
        border: 1px solid rgba(147, 51, 234, 0.15);
        border-radius: 16px;
        transition: border-color 180ms ease, background 180ms ease, box-shadow 180ms ease;
      }
      .card-soft:hover {
        border-color: rgba(147, 51, 234, 0.4);
        background: rgba(45, 26, 63, 0.75);
      }
      
      @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes slideDown {
        from { opacity: 0; transform: translateY(-100%); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes slideOut {
        from { opacity: 1; transform: translateY(0); }
        to { opacity: 0; transform: translateY(-100%); }
      }
      @keyframes scaleIn {
        from { opacity: 0; transform: scale(0.85); }
        to { opacity: 1; transform: scale(1); }
      }
      @keyframes pulseGlow {
        0%, 100% { box-shadow: 0 0 8px rgba(147, 51, 234, 0.4); }
        50% { box-shadow: 0 0 24px rgba(147, 51, 234, 0.7), 0 0 48px rgba(147, 51, 234, 0.3); }
      }
      @keyframes shimmer {
        0% { background-position: -200% center; }
        100% { background-position: 200% center; }
      }
      @keyframes confettiDrop {
        0% { opacity: 1; transform: translateY(0) rotate(0deg) scale(1); }
        100% { opacity: 0; transform: translateY(120px) rotate(720deg) scale(0.3); }
      }
      @keyframes float {
        0%, 100% { transform: translateY(0); }
        50% { transform: translateY(-6px); }
      }
      @keyframes coinBounce {
        0% { transform: scale(1); }
        50% { transform: scale(1.12); }
        100% { transform: scale(1); }
      }
      @keyframes borderGlow {
        0%, 100% { border-color: rgba(147, 51, 234, 0.08); }
        50% { border-color: rgba(147, 51, 234, 0.3); }
      }
      @keyframes wiggle {
        0%, 100% { transform: rotate(0deg); }
        25% { transform: rotate(-3deg); }
        75% { transform: rotate(3deg); }
      }
      @keyframes progressFill {
        from { width: 0%; }
      }
      @keyframes pointerBounce {
        0%, 100% { transform: translateX(-50%) translateY(-2px) rotate(0deg); }
        50% { transform: translateX(-50%) translateY(4px) rotate(2deg); }
      }
      @keyframes screenFlash {
        0% { opacity: 0.7; }
        100% { opacity: 0; }
      }
      @keyframes resultZoom {
        0% { opacity: 0; transform: scale(0.3) rotate(-10deg); }
        60% { transform: scale(1.1) rotate(2deg); }
        100% { opacity: 1; transform: scale(1) rotate(0deg); }
      }
      @keyframes sparkleFloat {
        0% { opacity: 1; transform: translate(0, 0) scale(1); }
        100% { opacity: 0; transform: translate(var(--sx), var(--sy)) scale(0); }
      }
      @keyframes confettiFall {
        0% { opacity: 1; transform: translateY(0) translateX(0) rotate(0deg) scale(1); }
        25% { transform: translateY(25vh) translateX(var(--drift)) rotate(180deg) scale(0.95); }
        50% { transform: translateY(50vh) translateX(calc(var(--drift) * -0.5)) rotate(360deg) scale(0.9); }
        75% { transform: translateY(75vh) translateX(var(--drift)) rotate(540deg) scale(0.8); }
        100% { opacity: 0; transform: translateY(105vh) translateX(calc(var(--drift) * -1)) rotate(720deg) scale(0.5); }
      }
      @keyframes lightPulse {
        0%, 100% { opacity: 0.4; transform: translate(-50%, -50%) scale(0.8); }
        50% { opacity: 1; transform: translate(-50%, -50%) scale(1.2); }
      }
      @keyframes lightChase {
        0%, 100% { opacity: 0.15; transform: translate(-50%, -50%) scale(0.6); box-shadow: none; }
        15%, 35% { opacity: 1; transform: translate(-50%, -50%) scale(1.3); }
        50% { opacity: 0.15; transform: translate(-50%, -50%) scale(0.6); box-shadow: none; }
      }
      /* === NEW ANIMATION KEYFRAMES === */
      @keyframes symbolPop {
        0% { transform: scale(0.3) rotate(-15deg); opacity: 0; }
        50% { transform: scale(1.25) rotate(5deg); opacity: 1; }
        70% { transform: scale(0.9) rotate(-2deg); }
        100% { transform: scale(1) rotate(0deg); opacity: 1; }
      }
      @keyframes sparkleOrbit {
        0% { transform: rotate(0deg) translateX(28px) rotate(0deg) scale(0.8); opacity: 0.6; }
        50% { transform: rotate(180deg) translateX(28px) rotate(-180deg) scale(1.2); opacity: 1; }
        100% { transform: rotate(360deg) translateX(28px) rotate(-360deg) scale(0.8); opacity: 0.6; }
      }
      @keyframes goldShimmer {
        0% { left: -40%; }
        100% { left: 140%; }
      }
      @keyframes jackpotShake {
        0%, 100% { transform: translateX(0); }
        10% { transform: translateX(-6px) rotate(-1deg); }
        20% { transform: translateX(6px) rotate(1deg); }
        30% { transform: translateX(-5px) rotate(-0.5deg); }
        40% { transform: translateX(5px) rotate(0.5deg); }
        50% { transform: translateX(-3px); }
        60% { transform: translateX(3px); }
        70% { transform: translateX(-2px); }
        80% { transform: translateX(2px); }
        90% { transform: translateX(-1px); }
      }
      @keyframes jackpotFlash {
        0% { opacity: 0; }
        15% { opacity: 0.8; }
        100% { opacity: 0; }
      }
      @keyframes matchPulse {
        0%, 100% { transform: scale(1); filter: brightness(1); }
        50% { transform: scale(1.08); filter: brightness(1.4); }
      }
      @keyframes collectBtnPulse {
        0%, 100% { box-shadow: 0 4px 0 var(--btn-shadow), 0 0 15px var(--btn-glow); }
        50% { box-shadow: 0 4px 0 var(--btn-shadow), 0 0 35px var(--btn-glow), 0 0 60px var(--btn-glow2); transform: scale(1.02); }
      }
      @keyframes diceRollSpin {
        0% { transform: rotateX(0deg) rotateZ(0deg) scale(1); }
        25% { transform: rotateX(180deg) rotateZ(90deg) scale(0.8); }
        50% { transform: rotateX(360deg) rotateZ(180deg) scale(1.1); }
        75% { transform: rotateX(540deg) rotateZ(270deg) scale(0.9); }
        100% { transform: rotateX(720deg) rotateZ(360deg) scale(1); }
      }
      @keyframes diceLand {
        0% { transform: scale(1.15) rotate(5deg); }
        40% { transform: scale(0.95) rotate(-2deg); }
        70% { transform: scale(1.03) rotate(1deg); }
        100% { transform: scale(1) rotate(0deg); }
      }
      @keyframes correctPop {
        0% { transform: scale(1); background-color: rgba(34, 197, 94, 0); }
        30% { transform: scale(1.06); background-color: rgba(34, 197, 94, 0.15); }
        60% { transform: scale(0.98); }
        100% { transform: scale(1); background-color: rgba(34, 197, 94, 0.08); }
      }
      @keyframes wrongShake {
        0%, 100% { transform: translateX(0); background-color: rgba(239, 68, 68, 0); }
        15% { transform: translateX(-8px); background-color: rgba(239, 68, 68, 0.15); }
        30% { transform: translateX(8px); }
        45% { transform: translateX(-6px); }
        60% { transform: translateX(6px); }
        75% { transform: translateX(-3px); background-color: rgba(239, 68, 68, 0.08); }
      }
      @keyframes timerUrgent {
        0%, 100% { color: #F87171; transform: scale(1); }
        50% { color: #FCA5A5; transform: scale(1.1); }
      }
      @keyframes streakFire {
        0%, 100% { transform: scale(1); filter: brightness(1); }
        25% { transform: scale(1.05) rotate(-2deg); filter: brightness(1.2); }
        75% { transform: scale(1.05) rotate(2deg); filter: brightness(1.2); }
      }
      @keyframes cardFlipIn {
        0% { transform: rotateY(90deg) scale(0.8); opacity: 0.5; }
        100% { transform: rotateY(0deg) scale(1); opacity: 1; }
      }
      @keyframes revealBurst {
        0% { transform: scale(0); opacity: 0.8; }
        100% { transform: scale(2.5); opacity: 0; }
      }
      @keyframes coinShower {
        0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
        70% { opacity: 1; }
        100% { transform: translateY(calc(100vh + 20px)) rotate(720deg); opacity: 0; }
      }
      @keyframes scorePopUp {
        0% { opacity: 0; transform: translateY(10px) scale(0.5); }
        50% { opacity: 1; transform: translateY(-15px) scale(1.2); }
        100% { opacity: 0; transform: translateY(-35px) scale(0.8); }
      }
      @keyframes plinkoLand {
        0% { transform: scale(1.3); filter: brightness(1.5); }
        50% { transform: scale(0.95); }
        100% { transform: scale(1); filter: brightness(1); }
      }
      @keyframes tapRipple {
        0% { transform: scale(0.5); opacity: 0.6; }
        100% { transform: scale(3); opacity: 0; }
      }
      
      .anim-fade-up { animation: fadeInUp 0.5s cubic-bezier(0.22, 1, 0.36, 1) both; }
      .anim-fade-in { animation: fadeIn 0.4s ease both; }
      .anim-scale-in { animation: scaleIn 0.35s cubic-bezier(0.22, 1, 0.36, 1) both; }
      .anim-slide-down { animation: slideDown 0.4s cubic-bezier(0.22, 1, 0.36, 1) both; }
      .anim-slide-out { animation: slideOut 0.3s ease-in both; }
      .anim-float { animation: float 3s ease-in-out infinite; }
      .anim-coin-bounce { animation: coinBounce 0.4s ease; }
      .glow-pulse { animation: pulseGlow 2.5s ease-in-out infinite; }
      .glow-border { animation: borderGlow 3s ease-in-out infinite; }
      .progress-animated { animation: progressFill 1s cubic-bezier(0.22, 1, 0.36, 1) both; }

      /* ===== REWARD ANIMATION SYSTEM ===== */
      @keyframes rewardScreenFlash {
        0% { opacity: 0.6; }
        100% { opacity: 0; }
      }
      @keyframes rewardScreenShake {
        0%, 100% { transform: translate(0, 0); }
        10% { transform: translate(-4px, -2px); }
        20% { transform: translate(4px, 2px); }
        30% { transform: translate(-3px, 1px); }
        40% { transform: translate(3px, -1px); }
        50% { transform: translate(-2px, 2px); }
        60% { transform: translate(2px, -2px); }
        70% { transform: translate(-1px, 1px); }
        80% { transform: translate(1px, -1px); }
      }
      @keyframes rewardFloatUp {
        0% { opacity: 0; transform: translateY(0) scale(0.5); }
        15% { opacity: 1; transform: translateY(-8px) scale(1.3); }
        50% { opacity: 1; transform: translateY(-25px) scale(1.05); }
        100% { opacity: 0; transform: translateY(-55px) scale(0.85); }
      }
      @keyframes rewardFlyTo {
        0% { opacity: 1; transform: translate(0, 0) scale(1); }
        50% { opacity: 1; transform: translate(var(--fly-dx-half), var(--fly-dy-half)) scale(1.3); }
        100% { opacity: 0; transform: translate(var(--fly-dx), var(--fly-dy)) scale(0.3); }
      }
      @keyframes rewardHeaderPulse {
        0% { transform: scale(1); filter: brightness(1); }
        50% { transform: scale(1.15); filter: brightness(1.5); }
        100% { transform: scale(1); filter: brightness(1); }
      }
      .reward-screen-flash {
        position: fixed; inset: 0; z-index: 9999; pointer-events: none;
        animation: rewardScreenFlash 0.18s ease-out forwards;
      }
      .reward-screen-flash-gold { background: radial-gradient(ellipse at center, rgba(234,179,8,0.3) 0%, rgba(234,179,8,0) 70%); }
      .reward-screen-flash-white { background: radial-gradient(ellipse at center, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0) 70%); }
      .reward-shake { animation: rewardScreenShake 0.4s ease-out; }
      .reward-float-number {
        position: fixed; z-index: 10000; pointer-events: none;
        font-weight: 900; font-size: 24px; text-shadow: 0 2px 8px rgba(0,0,0,0.5);
        animation: rewardFloatUp 0.9s cubic-bezier(0.22, 1, 0.36, 1) forwards;
      }
      .reward-flying-coin {
        position: fixed; z-index: 10000; pointer-events: none; font-size: 20px;
        animation: rewardFlyTo 0.7s cubic-bezier(0.32, 0, 0.67, 0) forwards;
      }
      .reward-header-pulse { animation: rewardHeaderPulse 0.4s ease; }

      .hover-lift {
        transition: transform 0.25s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.25s ease;
      }
      .hover-lift:hover {
        transform: translateY(-6px);
        box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5), 0 0 20px rgba(147, 51, 234, 0.15);
      }
      
      .btn-glow {
        position: relative;
        overflow: hidden;
      }
      .btn-glow::after {
        content: '';
        position: absolute;
        inset: -2px;
        background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%);
        background-size: 200% 200%;
        animation: shimmer 2.5s infinite;
        border-radius: inherit;
        pointer-events: none;
      }

      @keyframes modalScaleOut {
        0% { opacity: 1; transform: scale(1); }
        30% { opacity: 1; transform: scale(1.03); }
        100% { opacity: 0; transform: scale(0.85); }
      }
      @keyframes backdropFadeOut {
        0% { opacity: 1; }
        100% { opacity: 0; }
      }
      .anim-modal-close { animation: modalScaleOut 0.25s cubic-bezier(0.22, 1, 0.36, 1) forwards; }
      .anim-backdrop-close { animation: backdropFadeOut 0.25s ease forwards; }

      @keyframes checkPop {
        0% { opacity: 0; transform: scale(0); }
        50% { opacity: 1; transform: scale(1.25); }
        70% { transform: scale(0.9); }
        100% { opacity: 1; transform: scale(1); }
      }
      .anim-check-pop { animation: checkPop 0.5s cubic-bezier(0.22, 1, 0.36, 1) both; }
      .card-gradient { background: linear-gradient(145deg, #0a1628 0%, #030810 100%); }
      
      /* Legacy aliases — composed from .card tokens (see unified card system above) */
      .card-interactive {
        background: rgba(45, 26, 63, 0.8);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(147, 51, 234, 0.15);
        border-radius: 16px;
        box-shadow: 0 12px 32px rgba(12, 5, 24, 0.5);
        transition: border-color 180ms ease, background 180ms ease, transform 180ms ease, box-shadow 180ms ease;
      }
      .card-interactive:hover {
        border-color: rgba(147, 51, 234, 0.4);
        background: rgba(45, 26, 63, 0.9);
        box-shadow: 0 16px 40px rgba(12, 5, 24, 0.6), 0 0 20px rgba(147,51,234,0.2);
        transform: translateY(-4px);
      }
      .match-card {
        background: rgba(36, 20, 50, 0.65);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(147, 51, 234, 0.15);
        border-radius: 20px;
        padding: 16px;
        transition: border-color 180ms ease, background 180ms ease;
      }
      /* Contrast boost for content over animated gradient background */
      .content-contrast h1,
      .content-contrast h2,
      .content-contrast > div > div > h1 {
        text-shadow: 0 2px 6px rgba(0,0,0,0.9), 0 0 20px rgba(0,0,0,0.5);
      }
      .content-contrast p,
      .content-contrast span,
      .content-contrast label {
        text-shadow: 0 1px 4px rgba(0,0,0,0.8);
      }
      .odds-btn {
        border: 2px solid rgba(255,255,255,0.15);
        border-radius: 14px;
        background: rgba(10,15,25,0.85);
        box-shadow: 0 2px 0 rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06);
        transition: all 0.2s ease;
      }
      .odds-btn:hover {
        border-color: rgba(168,85,247,0.7);
        background: rgba(147,51,234,0.2);
        box-shadow: 0 0 20px rgba(147,51,234,0.3), 0 2px 0 rgba(0,0,0,0.3);
        transform: translateY(-2px);
      }
      .tab-btn-active {
        background: linear-gradient(135deg, #9333ea 0%, #7c3aed 100%);
        color: #fff;
        font-weight: 900;
        box-shadow: 0 4px 0 #6d28d9, 0 6px 20px rgba(147,51,234,0.25), 0 0 20px rgba(168,85,247,0.15), inset 0 1px 0 rgba(255,255,255,0.25);
        border: none;
        border-radius: 14px;
      }
      .tab-btn-inactive {
        background: rgba(10,15,25,0.85);
        border: 2px solid rgba(255,255,255,0.12);
        border-radius: 14px;
        transition: all 0.2s ease;
      }
      .tab-btn-inactive:hover {
        border-color: rgba(168,85,247,0.5);
        background: rgba(147,51,234,0.15);
      }

      /* ===== ACCESSIBILITY — reduced-motion safety net =====
         Catches any keyframe animation the runtime check misses.
         Does not affect the persistent WebGL background (not CSS-driven). */
      @media (prefers-reduced-motion: reduce) {
        *, *::before, *::after {
          animation-duration: 0.01ms !important;
          animation-iteration-count: 1 !important;
          transition-duration: 0.01ms !important;
          scroll-behavior: auto !important;
        }
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const [user, setUser] = useState({
    avatar: '😎',
    kwacha: 0,
    gems: 0,
    diamonds: 0,
    xp: 0,
    deposits: 0,
    bets: 0,
    wins: 0,
    streak: 1,
    gamesPlayed: 0,
    predictions: [],
    missionsComplete: [],
    missionProgress: {},
    dailyDay: 1,
    dailyClaimed: false,
    lastDailyClaim: null,
    referrals: 0,
    gamePlays: { ...DAILY_GAME_PLAYS },
    lastPlaysRefresh: null,
    dailyTasksDone: [],
    dailyBonusClaimed: false,
    dailyFreeSpinsUsed: [],
    dailyCoinBonusClaims: 0,
    // predictions/bets/wins above + questProgress/questsComplete below stay so
    // existing players' saved history survives the parked features (2026-07-15)
    questProgress: {},
    questsComplete: [],
  });

  const level = getLevel(user.xp);
  const nextLevel = getNextLevel(user.xp);
  const xpProgress = getXPProgress(user.xp);
  const vip = getVIP(user.deposits);

  // === SSO persistence: load this player's saved progress on session, save on change ===
  // When embedded on bwanabet with a valid token, session.status becomes 'ready'.
  // Standalone (no token) it stays idle -> app runs on local state as before.
  const session = useSession();

  // Widget mode: the platform runs as a popup (iframe) on bwanabet.com.
  // Detected via iframe embedding or ?widget=1; the host passes ?uid=.
  // Resolved after mount so the first client render matches SSR (hydration).
  const [{ isWidget, widgetUid }, setWidgetCtx] = useState({ isWidget: false, widgetUid: null });
  useEffect(() => {
    let inIframe = false;
    try { inIframe = window.self !== window.top; } catch (e) { inIframe = true; }
    const params = new URLSearchParams(window.location.search);
    setWidgetCtx({ isWidget: inIframe || params.get('widget') === '1', widgetUid: params.get('uid') });
  }, []);
  const hydratedRef = useRef(false);
  const saveTimer = useRef(null);
  const lastLevelRef = useRef(null);
  const [levelUp, setLevelUp] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  useEffect(() => {
    if (hydratedRef.current) return;
    if (session.status === 'ready' && session.profile) {
      const saved = session.profile.state;
      if (saved && typeof saved === 'object' && Object.keys(saved).length) {
        setUser(u => ({ ...u, ...saved }));
        lastLevelRef.current = getLevel(saved.xp || 0).level; // don't award levels already earned
      }
      hydratedRef.current = true;
    }
  }, [session.status, session.profile]);
  useEffect(() => {
    if (session.status !== 'ready' || !hydratedRef.current) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      session.saveState({
        kwacha: user.kwacha, gems: user.gems, diamonds: user.diamonds,
        xp: user.xp, deposits: user.deposits, streak: user.streak,
        state: user,
      });
    }, 1500);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [user, session.status]);

  // 6am play refresh: top every game's plays back up to the daily allowance
  // when a new game day starts. Extras above the allowance are kept (max, not
  // overwrite). Runs on mount, when SSO hydration lands, and every minute so
  // a session left open across 6am refreshes live.
  const refreshDailyPlays = useCallback(() => {
    setUser(u => {
      const key = playsRefreshKey();
      if (u.lastPlaysRefresh === key) return u;
      const topUp = (cur, defs) => Object.fromEntries(
        Object.keys(defs).map(k => [k, Math.max(cur?.[k] ?? 0, defs[k])])
      );
      return {
        ...u,
        lastPlaysRefresh: key,
        gamePlays: topUp(u.gamePlays, DAILY_GAME_PLAYS),
      };
    });
  }, []);
  useEffect(() => {
    refreshDailyPlays();
    const iv = setInterval(refreshDailyPlays, 60000);
    return () => clearInterval(iv);
  }, [refreshDailyPlays]);
  useEffect(() => {
    if (session.status === 'ready') refreshDailyPlays();
  }, [session.status, refreshDailyPlays]);

  // Daily-reward day rollover: once a new calendar day begins since the last
  // claim, re-open the claim. Runs on mount and whenever the stored claim date
  // changes (e.g. after SSO hydration restores yesterday's claim).
  useEffect(() => {
    const today = new Date().toDateString();
    setUser(u => {
      if (!u.lastDailyClaim || u.lastDailyClaim === today) return u;
      const days = Math.round((new Date(today) - new Date(u.lastDailyClaim)) / 86400000);
      if (days <= 0) return u;
      if (days === 1) return u.dailyClaimed ? { ...u, dailyClaimed: false } : u;
      // missed one or more days → reset the 7-day cycle and streak
      if (u.dailyClaimed || u.dailyDay !== 1 || u.streak !== 1) return { ...u, dailyClaimed: false, dailyDay: 1, streak: 1 };
      return u;
    });
  }, [user.lastDailyClaim]);

  // Helper functions
  const showNotif = useCallback((msg, type = 'success') => {
    setNotifLeaving(false);
    setNotif({ msg, type });
    if (msg.includes('Coins') || msg.includes('+')) {
      setCoinBounce(true);
      setTimeout(() => setCoinBounce(false), 400);
    }
    setTimeout(() => {
      setNotifLeaving(true);
      setTimeout(() => { setNotif(null); setNotifLeaving(false); }, 300);
    }, 2200);
  }, []);
  
  const addCoins = (n) => setUser(u => ({ ...u, kwacha: u.kwacha + n }));
  const addGems = (n) => setUser(u => ({ ...u, gems: u.gems + n }));
  const addDiamonds = (n) => setUser(u => ({ ...u, diamonds: u.diamonds + n }));
  const addXP = (n) => setUser(u => ({ ...u, xp: u.xp + n }));
  const useGamePlay = (game) => setUser(u => ({ 
    ...u, 
    gamePlays: { ...u.gamePlays, [game]: Math.max(0, u.gamePlays[game] - 1) } 
  }));

  const handleWin = (prize, name) => {
    const coins = typeof prize === 'number' ? prize : (prize.kwacha || 0);
    if (typeof prize === 'number') {
      addCoins(prize);
      showNotif(`🎉 +${prize} Coins!`);
    } else {
      if (prize.kwacha) addCoins(prize.kwacha);
      if (prize.gems) addGems(prize.gems);
      if (prize.diamonds) addDiamonds(prize.diamonds);
      if (prize.xp) addXP(prize.xp);
      showNotif(`🎉 Won: ${name}!`);
    }
    setUser(u => ({ ...u, gamesPlayed: u.gamesPlayed + 1, dailyTasksDone: [...new Set([...u.dailyTasksDone, 'game'])] }));
    setGamesPlayedToday(prev => new Set([...prev, 'wheel']));
    trackMission('gamePlayed', { gameId: 'wheel', coinsWon: coins, gamesSet: gamesPlayedToday });
    // NOTE: No triggerReward() call — the wheel renders its own self-contained
    // celebration overlay (count-up + confetti + screen flash). Calling
    // triggerReward here would fire a second confetti burst on prize claim.
  };


  // Mission tracking
  const [gamesPlayedToday, setGamesPlayedToday] = useState(new Set());
  
  const trackMission = useCallback((actionType, metadata = {}) => {
    const allActive = [...getDailyMissions(), ...WEEKLY_MISSIONS, ...PERMANENT_MISSIONS];
    
    setUser(prev => {
      const newProgress = { ...prev.missionProgress };
      const newComplete = [...prev.missionsComplete];
      let bonusCoins = 0, bonusGems = 0, bonusXP = 0;
      let justCompleted = [];
      
      allActive.forEach(mission => {
        if (newComplete.includes(mission.id)) return; // already done
        
        let shouldIncrement = false;
        let incrementBy = 1;
        let setTo = null; // for score-type missions
        
        switch (mission.type) {
          case 'gamePlay':
            if (actionType === 'gamePlayed' && metadata.gameId === mission.gameId) shouldIncrement = true;
            break;
          // bets/wins/winStreak + trivia cases parked with their missions —
          // see parked/components/GamificationPlatform.removed-wiring.jsx
          case 'dailyClaim':
            if (actionType === 'dailyClaimed') shouldIncrement = true;
            break;
          case 'uniqueGames':
          case 'uniqueGamesWeekly':
            if (actionType === 'gamePlayed') {
              const updatedSet = new Set([...(metadata.gamesSet || []), metadata.gameId]);
              setTo = updatedSet.size;
            }
            break;
          case 'coinsWon':
            if (actionType === 'gamePlayed' && metadata.coinsWon > 0) {
              incrementBy = metadata.coinsWon;
              shouldIncrement = true;
            }
            break;
          case 'tapScore':
            if (actionType === 'gamePlayed' && metadata.gameId === 'tapfrenzy' && metadata.tapScore >= mission.target) {
              setTo = metadata.tapScore;
            }
            break;
          case 'clockClose':
            if (actionType === 'gamePlayed' && metadata.gameId === 'stopclock' && metadata.clockDiff !== undefined && metadata.clockDiff <= 3) {
              setTo = 1;
            }
            break;
          case 'wheelSpins':
            if (actionType === 'gamePlayed' && metadata.gameId === 'wheel') shouldIncrement = true;
            break;
          case 'storePurchase':
          case 'coinsSpent':
            if (actionType === 'storePurchase') {
              incrementBy = metadata.amount || 1;
              shouldIncrement = true;
            }
            break;
          case 'deposits':
            if (actionType === 'deposit') shouldIncrement = true;
            break;
          case 'dailyMissionsDone':
            if (actionType === 'missionCompleted' && metadata.missionId?.startsWith('d_')) shouldIncrement = true;
            break;
          case 'weeklyXP':
            if (actionType === 'xpEarned') {
              incrementBy = metadata.amount || 0;
              shouldIncrement = true;
            }
            break;
        }
        
        if (shouldIncrement) {
          newProgress[mission.id] = (newProgress[mission.id] || 0) + incrementBy;
        } else if (setTo !== null) {
          newProgress[mission.id] = setTo;
        }
        
        // Check completion
        if (!newComplete.includes(mission.id) && (newProgress[mission.id] || 0) >= mission.target) {
          newComplete.push(mission.id);
          bonusCoins += mission.reward.kwacha || 0;
          bonusGems += mission.reward.gems || 0;
          bonusXP += mission.xp || 0;
          justCompleted.push(mission);
        }
      });
      
      // Show completion notifications (delayed so state updates first)
      if (justCompleted.length > 0) {
        setTimeout(() => {
          justCompleted.forEach(m => {
            showNotif('✅ Mission Complete: ' + m.name + '!');
            triggerReward('small', null, { coins: m.reward?.kwacha || 0, gems: m.reward?.gems || 0, xp: m.xp || 0 });
            // Track weekly mission for daily missions completed
            if (m.id.startsWith('d_')) {
              trackMission('missionCompleted', { missionId: m.id });
            }
          });
        }, 300);
      }
      
      return {
        ...prev,
        kwacha: prev.kwacha + bonusCoins,
        gems: prev.gems + bonusGems,
        xp: prev.xp + bonusXP,
        missionProgress: newProgress,
        missionsComplete: newComplete,
      };
    });
  }, [showNotif]);

  // trackQuest + claimQuest parked — see parked/components/GamificationPlatform.removed-wiring.jsx

  const playGame = (gameId) => {
    if (user.gamePlays[gameId] > 0) {
      useGamePlay(gameId);
      setActiveGame(gameId);
    } else {
      // extra plays are a paid gamble: EXTRA_PLAY_COST vs the MAX_WIN ceiling
      const game = MINIGAMES.find(g => g.id === gameId);
      if (game && user.kwacha >= game.cost) {
        addCoins(-game.cost);
        showNotif(`Extra play — ${game.cost} Coins`);
        setActiveGame(gameId);
      } else {
        showNotif('Not enough Coins for an extra play!', 'error');
      }
    }
  };

  // playTrivia + handleDailyChallenge parked — see parked/components/GamificationPlatform.removed-wiring.jsx
  // (tabs/SUB_NAV consts went with the legacy shell — see parked/components/legacy/)

  // Map legacy flat tab ids (used by modals/missions) to new dot-notation routes.
  const LEGACY_TAB_MAP = {
    overview: 'home',
    home: 'home',
    store: 'store',
    minigames: 'play.minigames',
    // Predictions / Daily trivia / Quests PARKED (see parked/) — legacy CTAs
    // land on the nearest live tab instead of a dead route. Restore the
    // originals (play.predictions / play.daily / earn.quests) to bring them back.
    predict: 'play.minigames',
    predictions: 'play.minigames',
    daily: 'earn.rewards',
    missions: 'earn.missions',
    quests: 'earn.missions',
    profile: 'me.profile',
    vip: 'me.vip',
    refer: 'me.referrals',
    referrals: 'me.referrals',
    leaders: 'me.leaderboard',
    leaderboard: 'me.leaderboard',
    play: 'play.minigames',
    earn: 'earn.missions',
    me: 'me.profile',
    overview: 'home',
  };
  const navigateTab = (id) => setTab(LEGACY_TAB_MAP[id] || id);

  // Level-up: award LEVEL_REWARDS + celebrate when the player's level increases.
  useEffect(() => {
    const curLevel = getLevel(user.xp).level;
    if (lastLevelRef.current === null) { lastLevelRef.current = curLevel; return; }
    if (curLevel > lastLevelRef.current) {
      const total = { kwacha: 0, gems: 0, diamonds: 0 };
      for (let L = lastLevelRef.current + 1; L <= curLevel; L++) {
        const r = LEVEL_REWARDS[L];
        if (r) { total.kwacha += r.kwacha || 0; total.gems += r.gems || 0; total.diamonds += r.diamonds || 0; }
      }
      lastLevelRef.current = curLevel;
      if (total.kwacha) addCoins(total.kwacha);
      if (total.gems) addGems(total.gems);
      if (total.diamonds) addDiamonds(total.diamonds);
      const lvl = getLevel(user.xp);
      setLevelUp({ level: lvl.level, name: lvl.name, icon: lvl.icon, reward: total });
      showNotif(`🎉 Level up — ${lvl.name}!`);
      triggerReward('big', null, { coins: total.kwacha || undefined, gems: total.gems || undefined, diamonds: total.diamonds || undefined });
    }
  }, [user.xp]);

  // Game + trivia overlays are app-global modals. Extracted so the redesigned
  // (early-returned) tabs can render them too and still launch games.
  const gameOverlays = (
    <>
      {/* Widget mode: prominent red close button — tells the host page to hide the popup */}
      {isWidget && (
        <button
          type="button"
          aria-label="Close 100xBet Rewards"
          onClick={() => { try { window.parent.postMessage({ type: '100x-widget:close' }, '*'); } catch (e) {} }}
          style={{
            position: 'fixed', top: 10, right: 10, zIndex: 130,
            width: 46, height: 46, borderRadius: '50%',
            border: '2px solid rgba(255,255,255,.3)',
            background: 'linear-gradient(180deg, #f0684f, #d43a22)',
            color: '#fff', fontSize: 20, fontWeight: 900, lineHeight: 1,
            cursor: 'pointer', display: 'grid', placeItems: 'center',
            boxShadow: '0 6px 18px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.3)',
          }}
        >
          ✕
        </button>
      )}
      {activeGame === 'wheel' && (
        <WheelGame
          onClose={() => animateClose(() => setActiveGame(null))} closing={closingModal}
          onWin={handleWin}
          playsLeft={user.gamePlays.wheel}
        />
      )}
      {activeGame === 'scratch' && (
        <ScratchGame
          onClose={() => animateClose(() => setActiveGame(null))} closing={closingModal}
          onWin={(n) => {
            addCoins(n);
            showNotif(`🎉 +${n} Coins!`);
            triggerReward('medium', null, { coins: n });
            setUser(u => ({ ...u, gamesPlayed: u.gamesPlayed + 1, dailyTasksDone: [...new Set([...u.dailyTasksDone, 'game'])] }));
            setGamesPlayedToday(prev => new Set([...prev, 'scratch']));
            trackMission('gamePlayed', { gameId: 'scratch', coinsWon: n, gamesSet: gamesPlayedToday });
          }}
        />
      )}
      {activeGame === 'dice' && (
        <DiceGame
          onClose={() => animateClose(() => setActiveGame(null))} closing={closingModal}
          onWin={(n) => {
            addCoins(n);
            showNotif(`🎉 +${n} Coins!`);
            triggerReward('medium', null, { coins: n });
            setUser(u => ({ ...u, gamesPlayed: u.gamesPlayed + 1, dailyTasksDone: [...new Set([...u.dailyTasksDone, 'game'])] }));
            setGamesPlayedToday(prev => new Set([...prev, 'dice']));
            trackMission('gamePlayed', { gameId: 'dice', coinsWon: n, gamesSet: gamesPlayedToday });
          }}
        />
      )}
      {activeGame === 'highlow' && (
        <HighLowGame
          onClose={() => animateClose(() => setActiveGame(null))} closing={closingModal}
          onWin={(n) => {
            addCoins(n);
            showNotif(`🎉 +${n} Coins!`);
            triggerReward('medium', null, { coins: n });
            setUser(u => ({ ...u, gamesPlayed: u.gamesPlayed + 1, dailyTasksDone: [...new Set([...u.dailyTasksDone, 'game'])] }));
            setGamesPlayedToday(prev => new Set([...prev, 'highlow']));
            trackMission('gamePlayed', { gameId: 'highlow', coinsWon: n, gamesSet: gamesPlayedToday });
          }}
        />
      )}
      {activeGame === 'plinko' && (
        <PlinkoGame
          onClose={() => animateClose(() => setActiveGame(null))} closing={closingModal}
          onWin={(n) => {
            addCoins(n);
            showNotif(`🎉 +${n} Coins!`);
            triggerReward('medium', null, { coins: n });
            setUser(u => ({ ...u, gamesPlayed: u.gamesPlayed + 1, dailyTasksDone: [...new Set([...u.dailyTasksDone, 'game'])] }));
            setGamesPlayedToday(prev => new Set([...prev, 'plinko']));
            trackMission('gamePlayed', { gameId: 'plinko', coinsWon: n, gamesSet: gamesPlayedToday });
          }}
        />
      )}
      {activeGame === 'tapfrenzy' && (
        <TapFrenzyGame
          onClose={() => animateClose(() => setActiveGame(null))} closing={closingModal}
          onWin={(n, meta) => {
            addCoins(n);
            showNotif(`🎉 +${n} Coins!`);
            triggerReward('medium', null, { coins: n });
            setUser(u => ({ ...u, gamesPlayed: u.gamesPlayed + 1, dailyTasksDone: [...new Set([...u.dailyTasksDone, 'game'])] }));
            setGamesPlayedToday(prev => new Set([...prev, 'tapfrenzy']));
            trackMission('gamePlayed', { gameId: 'tapfrenzy', coinsWon: n, tapScore: meta?.score, gamesSet: gamesPlayedToday });
          }}
        />
      )}
      {activeGame === 'stopclock' && (
        <StopClockGame
          onClose={() => animateClose(() => setActiveGame(null))} closing={closingModal}
          onWin={(n, meta) => {
            addCoins(n);
            showNotif(`🎉 +${n} Coins!`);
            triggerReward('medium', null, { coins: n });
            setUser(u => ({ ...u, gamesPlayed: u.gamesPlayed + 1, dailyTasksDone: [...new Set([...u.dailyTasksDone, 'game'])] }));
            setGamesPlayedToday(prev => new Set([...prev, 'stopclock']));
            trackMission('gamePlayed', { gameId: 'stopclock', coinsWon: n, clockDiff: meta?.diff, gamesSet: gamesPlayedToday });
          }}
        />
      )}
      {/* trivia game modals + QuestDetailModal parked — see parked/components/GamificationPlatform.removed-wiring.jsx */}
      {selectedMission && (
        <MissionDetailModal
          mission={selectedMission}
          progress={user.missionProgress[selectedMission.id] || 0}
          done={user.missionsComplete.includes(selectedMission.id)}
          onClose={() => animateClose(() => setSelectedMission(null))} closing={closingModal}
          onNavigate={(tabId) => navigateTab(tabId)}
          onPlayGame={(gameId) => { navigateTab('minigames'); playGame(gameId); }}
        />
      )}
      {notif && (
        <div className={`fixed top-4 z-[100] px-6 py-3 rounded-xl shadow-2xl ${notifLeaving ? 'anim-slide-out' : 'anim-slide-down'} ${notif.type === 'success' ? 'bg-gradient-to-r from-green-500 to-emerald-600 shadow-green-500/30' : 'bg-gradient-to-r from-red-500 to-rose-600 shadow-red-500/30'}`} style={{ right: isWidget ? 66 : 16 }}>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            <span className="font-bold">{notif.msg}</span>
          </div>
        </div>
      )}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-[200] overflow-hidden">
          {Array.from({ length: 50 }, (_, i) => {
            const colors = ['#fbbf24', '#a855f7', '#ec4899', '#22c55e', '#3b82f6', '#f97316', '#ef4444', '#14b8a6'];
            const shapes = ['circle', 'rect', 'star'];
            const shape = shapes[i % 3];
            const size = 6 + Math.random() * 10;
            const drift = (Math.random() - 0.5) * 100;
            const delay = Math.random() * 0.5;
            const duration = 1.8 + Math.random() * 1.2;
            return (
              <div key={i} style={{ position: 'absolute', left: `${10 + Math.random() * 80}%`, top: '-15px', width: shape === 'rect' ? size * 0.5 : size, height: shape === 'star' ? size * 0.4 : size, backgroundColor: colors[i % colors.length], borderRadius: shape === 'circle' ? '50%' : shape === 'star' ? '1px' : '2px', '--drift': `${drift}px`, animation: `confettiFall ${duration}s ${delay}s cubic-bezier(0.25, 0.46, 0.45, 0.94) both`, boxShadow: `0 0 3px ${colors[i % colors.length]}40` }} />
            );
          })}
        </div>
      )}
      <canvas ref={rewardCanvasRef} className="fixed inset-0 pointer-events-none" style={{ zIndex: 9998 }} />
      {screenFlash && <div className={`reward-screen-flash reward-screen-flash-${screenFlash}`} />}
      {rollingNumbers.map(n => (
        <div key={n.id} className="reward-float-number" style={{ left: n.x, top: n.y, color: n.color }}>{n.text}</div>
      ))}
      {flyingCoins.map(c => (
        <div key={c.id} className="reward-flying-coin" style={{ left: c.fromX, top: c.fromY, '--fly-dx': `${c.toX - c.fromX}px`, '--fly-dy': `${c.toY - c.fromY}px`, '--fly-dx-half': `${(c.toX - c.fromX) * 0.3}px`, '--fly-dy-half': `${(c.toY - c.fromY) * 0.5 - 60}px` }}>{c.emoji}</div>
      ))}
      <LevelUpModal levelUp={levelUp} onClose={() => setLevelUp(null)} />
      <ProfileModal
        open={showProfile} onClose={() => setShowProfile(false)}
        name={session?.profile?.username || session?.profile?.first_name || 'Player'}
        level={level} nextLevel={nextLevel} xpPct={xpProgress} vip={vip} user={user}
      />
    </>
  );

  const openMissionsCount = [...getDailyMissions(), ...PERMANENT_MISSIONS].filter(m => !user.missionsComplete.includes(m.id)).length;
  const v2Stats = {
    points: user.kwacha,
    missionsCount: openMissionsCount,
    badges: user.missionsComplete.length,
    xp: user.xp,
    onNavigate: navigateTab,
    onOpenProfile: () => setShowProfile(true),
    // the header shows the bwanabet user id once the SSO session resolves
    userId: session?.profile?.bwanabet_user_id || session?.profile?.username || widgetUid || null,
    // nav badges = things to attend to, not catalog sizes
    navBadges: {
      play: MINIGAMES.filter(g => (user.gamePlays[g.id] || 0) > 0).length || null,
      earn: (openMissionsCount + (user.dailyClaimed ? 0 : 1)) || null,
      store: null, // store is empty until the admin dashboard stocks it
    },
  };

  const claimDailyReward = (el) => {
    if (user.dailyClaimed) return;
    const r = DAILY_REWARDS[user.dailyDay - 1] || DAILY_REWARDS[0];
    addCoins(r.kwacha);
    if (r.gems) addGems(r.gems);
    if (r.diamonds) addDiamonds(r.diamonds);
    addXP(20);
    const today = new Date().toDateString();
    setUser(u => {
      const wasYesterday = u.lastDailyClaim && Math.round((new Date(today) - new Date(u.lastDailyClaim)) / 86400000) === 1;
      return { ...u, dailyClaimed: true, lastDailyClaim: today, dailyDay: u.dailyDay >= 7 ? 1 : u.dailyDay + 1, streak: wasYesterday ? u.streak + 1 : u.streak, dailyTasksDone: [...new Set([...u.dailyTasksDone, 'claim'])] };
    });
    trackMission('dailyClaimed');
    showNotif(`🎉 +${r.kwacha} Coins claimed!`);
    triggerReward('medium', el || null, { coins: r.kwacha, gems: r.gems, diamonds: r.diamonds, xp: 20 });
  };

  // placePrediction + streak-voucher check + prediction settlement parked —
  // see parked/components/GamificationPlatform.removed-wiring.jsx

  // === v2 redesigned Home ===
  if (tab === 'home') {
    return (<>
      <Overview {...v2Stats} activeTab="home"
        missionProgress={user.missionProgress} missionsComplete={user.missionsComplete} onOpenMission={setSelectedMission}
        dailyDay={user.dailyDay} dailyClaimed={user.dailyClaimed} onClaimDaily={claimDailyReward} />
      {gameOverlays}
    </>);
  }
  // === v2 redesigned Play ===
  if (tab === 'play' || tab.startsWith('play.')) {
    return (<>
      <PlayView {...v2Stats} tab={tab} gamePlays={user.gamePlays} onPlay={playGame} />
      {gameOverlays}
    </>);
  }
  // === v2 redesigned Earn ===
  if (tab === 'earn' || tab.startsWith('earn.')) {
    return (<>
      <EarnView {...v2Stats} tab={tab === 'earn' ? 'earn.missions' : tab} streak={user.streak}
        missionProgress={user.missionProgress} missionsComplete={user.missionsComplete} onOpenMission={setSelectedMission}
        dailyDay={user.dailyDay} dailyClaimed={user.dailyClaimed} onClaimDaily={claimDailyReward} />
      {gameOverlays}
    </>);
  }
  // === v2 redesigned Store ===
  if (tab === 'store') {
    const buyStoreItem = (item, el) => {
      const canBuy = user.kwacha >= item.price.kwacha && (!item.price.gems || user.gems >= item.price.gems);
      if (!canBuy) { showNotif('Not enough balance!', 'error'); return; }
      addCoins(-item.price.kwacha);
      if (item.price.gems) addGems(-item.price.gems);
      trackMission('storePurchase', { amount: item.price.kwacha });
      showNotif(`Purchased ${item.name}!`);
      triggerReward('small', el || null, { coins: 0 });
    };
    return (<>
      <StoreView {...v2Stats} onBuy={buyStoreItem} kwacha={user.kwacha} gems={user.gems} />
      {gameOverlays}
    </>);
  }

  // Any unknown tab falls back to Home. The old pre-v2 shell that used to
  // render here (trivia / quests / predictions / me.* tabs) was parked on
  // 2026-07-15 — see parked/components/legacy/GamificationPlatform.legacy-return.jsx
  return (<>
    <Overview {...v2Stats} activeTab="home"
      missionProgress={user.missionProgress} missionsComplete={user.missionsComplete} onOpenMission={setSelectedMission}
      dailyDay={user.dailyDay} dailyClaimed={user.dailyClaimed} onClaimDaily={claimDailyReward} />
    {gameOverlays}
  </>);
}
