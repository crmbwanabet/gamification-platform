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
// SSO session (bwanabet token -> Supabase profile)
import { useSession } from './session/SessionProvider';

// Data imports
import { IMG_BASE, CURRENCY_ICONS, IMAGES, WHEEL_IMAGES } from '../lib/data/images';
import {
  TRIVIA_QUESTIONS, TRIVIA_CATEGORIES, TRIVIA_GAMES, getQuestions,
  DAILY_CAT_ROTATION, DAILY_CAT_INFO, DAILY_DIFFICULTY, DAILY_PERFECT_BONUS,
  DAILY_STREAK_MULTIPLIERS, getDailyStreakMult, getDailyQuestions, getDailyQuestion,
  getSpeedQuestions, getRandomQuestion
} from '../lib/data/trivia';
import { TUTORIALS } from '../lib/data/tutorials';
import {
  XP_LEVELS, VIP_TIERS, MINIGAMES, STORE_ITEMS, MATCHES,
  QUESTS, DAILY_REWARDS, DAILY_FREE_SPIN_ROTATION, getDailyFreeSpinGames,
  getLevel, getNextLevel, getXPProgress, getVIP
} from '../lib/data/platform';
import {
  DAILY_MISSION_POOL, WEEKLY_MISSIONS, PERMANENT_MISSIONS,
  getDailyMissions, DIFFICULTY_CONFIG, MISSIONS
} from '../lib/data/missions';

// Component imports
import AnimatedGradientBG from './ui/AnimatedGradientBG';
import DailyTriviaChallenge from './ui/DailyTriviaChallenge';
import TutorialModal from './modals/TutorialModal';
import MissionDetailModal from './modals/MissionDetailModal';
import QuestDetailModal from './modals/QuestDetailModal';
import WheelGame from './games/WheelGame';
import ScratchGame from './games/ScratchGame';
import DiceGame from './games/DiceGame';
import HighLowGame from './games/HighLowGame';
import PlinkoGame from './games/PlinkoGame';
import TapFrenzyGame from './games/TapFrenzyGame';
import StopClockGame from './games/StopClockGame';
import ClassicQuizGame from './games/ClassicQuizGame';
import SpeedRoundGame from './games/SpeedRoundGame';
import StreakTriviaGame from './games/StreakTriviaGame';

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

export default function GamificationPlatform() {
  const prefersReducedMotion = useReducedMotion();
  const [tab, setTab] = useState('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeGame, setActiveGame] = useState(null);
  const [missionSubTab, setMissionSubTab] = useState('daily');
  const [selectedMission, setSelectedMission] = useState(null);
  const [closingModal, setClosingModal] = useState(false);
  const [activeTrivia, setActiveTrivia] = useState(null);
  const [selectedQuest, setSelectedQuest] = useState(null);
  
  const animateClose = useCallback((closeFn) => {
    setClosingModal(true);
    setTimeout(() => {
      setClosingModal(false);
      closeFn();
    }, 230);
  }, []);
  const [activeTutorial, setActiveTutorial] = useState(null);
  const [predLeague, setPredLeague] = useState('All');
  const [dailyCountdown, setDailyCountdown] = useState('');
  useEffect(() => {
    const calc = () => {
      const now = new Date(), mid = new Date(now);
      mid.setHours(24,0,0,0);
      const d = mid - now;
      setDailyCountdown(`${Math.floor(d/3600000)}h ${Math.floor((d%3600000)/60000)}m ${Math.floor((d%60000)/1000)}s`);
    };
    calc();
    const iv = setInterval(calc, 1000);
    return () => clearInterval(iv);
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
    referrals: 0,
    gamePlays: { wheel: 3, scratch: 5, dice: 5, highlow: 5, plinko: 5, tapfrenzy: 5, stopclock: 5 },
    triviaPlays: { classicQuiz: 3, speedRound: 5, streakTrivia: 3 },
    dailyChallengeAnswered: false,
    dailyChallengeCorrect: false,
    dailyTasksDone: [],
    dailyBonusClaimed: false,
    dailyTriviaProgress: { answered: 0, correct: 0, results: [] },
    dailyTriviaStreak: 0,
    dailyFreeSpinsUsed: [],
    dailyCoinBonusClaims: 0,
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
  const hydratedRef = useRef(false);
  const saveTimer = useRef(null);
  useEffect(() => {
    if (hydratedRef.current) return;
    if (session.status === 'ready' && session.profile) {
      const saved = session.profile.state;
      if (saved && typeof saved === 'object' && Object.keys(saved).length) {
        setUser(u => ({ ...u, ...saved }));
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
    trackQuest('wheelSpun', {});
    trackQuest('gamePlayed', { gameId: 'wheel' });
    trackQuest('coinsEarned', { amount: coins });
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
          case 'bets':
            if (actionType === 'betPlaced') shouldIncrement = true;
            break;
          case 'wins':
          case 'weeklyWins':
            if (actionType === 'betWon') shouldIncrement = true;
            break;
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
          case 'winStreak':
            if (actionType === 'betWon') {
              incrementBy = 1;
              shouldIncrement = true;
            } else if (actionType === 'betLost') {
              setTo = 0; // reset streak
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

          case 'triviaPlay':
            if (actionType === 'triviaPlayed') shouldIncrement = true;
            break;
          case 'triviaCorrect':
            if (actionType === 'triviaCorrect') {
              incrementBy = metadata.count || 1;
              shouldIncrement = true;
            }
            break;
          case 'speedScore':
            if (actionType === 'triviaPlayed' && metadata.triviaType === 'speed' && metadata.speedScore >= mission.target) {
              setTo = metadata.speedScore;
            }
            break;
          case 'triviaStreak':
            if (actionType === 'triviaPlayed' && metadata.triviaType === 'streak' && metadata.triviaStreak >= mission.target) {
              setTo = metadata.triviaStreak;
            }
            break;
          case 'weeklyTriviaCorrect':
            if (actionType === 'triviaCorrect') {
              incrementBy = metadata.count || 1;
              shouldIncrement = true;
            }
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
            trackQuest('missionCompleted', {});
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

  // Quest progress tracker — called alongside trackMission
  const trackQuest = useCallback((actionType, metadata = {}) => {
    setUser(prev => {
      const qp = { ...prev.questProgress };
      QUESTS.forEach(quest => {
        quest.steps.forEach(step => {
          if (prev.questsComplete.includes(quest.id)) return;
          if ((qp[step.id] || 0) >= step.target) return;
          let match = false;
          if (step.action === actionType) {
            if (step.gameId) { match = metadata.gameId === step.gameId; }
            else { match = true; }
          }
          if (match) qp[step.id] = (qp[step.id] || 0) + 1;
        });
      });
      return { ...prev, questProgress: qp };
    });
  }, []);

  // Claim quest rewards
  const claimQuest = useCallback((quest) => {
    setUser(prev => {
      if (prev.questsComplete.includes(quest.id)) return prev;
      const allDone = quest.steps.every(s => (prev.questProgress[s.id] || 0) >= s.target);
      if (!allDone) return prev;
      return {
        ...prev,
        kwacha: prev.kwacha + (quest.reward.kwacha || 0),
        gems: prev.gems + (quest.reward.gems || 0),
        diamonds: prev.diamonds + (quest.reward.diamonds || 0),
        xp: prev.xp + (quest.xp || 0),
        questsComplete: [...prev.questsComplete, quest.id],
      };
    });
    showNotif(`🏆 Quest Complete: ${quest.name}!`);
    triggerReward('big', null, { coins: quest.reward?.kwacha || 0, gems: quest.reward?.gems || 0, diamonds: quest.reward?.diamonds || 0, xp: quest.xp || 0 });
    trackQuest('questCompleted', {});
    setSelectedQuest(null);
  }, [showNotif]);

  const playGame = (gameId) => {
    if (user.gamePlays[gameId] > 0) {
      useGamePlay(gameId);
      setActiveGame(gameId);
    } else {
      showNotif('No free plays!', 'error');
    }
  };

  const playTrivia = (triviaId) => {
    const game = TRIVIA_GAMES.find(g => g.id === triviaId);
    if (!game) return;
    if (user.triviaPlays[triviaId] > 0) {
      setUser(u => ({
        ...u,
        triviaPlays: { ...u.triviaPlays, [triviaId]: Math.max(0, u.triviaPlays[triviaId] - 1) }
      }));
      setActiveTrivia(triviaId);
    } else if (user.kwacha >= game.cost) {
      addCoins(-game.cost);
      setActiveTrivia(triviaId);
    } else {
      showNotif('Not enough Coins!', 'error');
    }
  };

  const handleDailyChallenge = (resultsArr) => {
    // resultsArr is [bool, bool, bool] for the 3 questions
    const correctCount = resultsArr.filter(r => r).length;
    const isPerfect = correctCount === 3;
    const streak = isPerfect ? (user.dailyTriviaStreak || 0) + 1 : 0;
    const streakMult = getDailyStreakMult(streak);
    const baseCoins = resultsArr.reduce((sum, r, i) => sum + (r ? DAILY_DIFFICULTY[i].reward : 0), 0);
    const bonusCoins = isPerfect ? DAILY_PERFECT_BONUS.coins : 0;
    const totalCoins = Math.floor((baseCoins + bonusCoins) * streakMult);
    const totalGems = isPerfect ? DAILY_PERFECT_BONUS.gems : 0;
    const xpEarned = correctCount * 20 + (isPerfect ? 50 : 0);

    if (totalCoins > 0) addCoins(totalCoins);
    if (totalGems > 0) addGems(totalGems);
    if (xpEarned > 0) addXP(xpEarned);
    if (isPerfect) triggerReward('big', null, { coins: totalCoins, gems: totalGems, xp: xpEarned });
    else if (correctCount > 0) triggerReward('small', null, { coins: totalCoins });

    const msg = isPerfect
      ? `🏆 Perfect Trivia! +${totalCoins} Coins + ${totalGems} Gems${streakMult > 1 ? ` (${streakMult}x streak!)` : '!'}`
      : correctCount > 0
        ? `🎯 ${correctCount}/3 Correct — +${totalCoins} Coins`
        : '🎯 0/3 — Better luck tomorrow!';
    showNotif(msg);

    setUser(u => ({
      ...u,
      dailyChallengeAnswered: true,
      dailyChallengeCorrect: isPerfect,
      dailyTriviaProgress: { answered: 3, correct: correctCount, results: resultsArr },
      dailyTriviaStreak: streak,
      dailyTasksDone: [...new Set([...u.dailyTasksDone, 'trivia'])],
    }));
    trackMission('triviaPlayed', { triviaType: 'daily', correct: isPerfect });
    trackQuest('triviaPlayed', {});
    if (correctCount > 0) { trackMission('triviaCorrect', { count: correctCount }); trackQuest('triviaCorrect', { count: correctCount }); }
    trackQuest('xpEarned', { amount: xpEarned });
  };

  const tabs = [
    { id: 'home', icon: Home, label: 'Home' },
    { id: 'play', icon: Gamepad2, label: 'Play' },
    { id: 'earn', icon: Target, label: 'Earn' },
    { id: 'store', icon: Store, label: 'Store' },
    { id: 'me', icon: User, label: 'Me' },
  ];

  const SUB_NAV = {
    play: [
      { key: 'minigames', label: 'Games' },
      { key: 'predictions', label: 'Predict' },
      { key: 'daily', label: 'Daily' },
    ],
    earn: [
      { key: 'missions', label: 'Missions' },
      { key: 'quests', label: 'Quests' },
    ],
    me: [
      { key: 'profile', label: 'Profile' },
      { key: 'vip', label: 'VIP' },
      { key: 'referrals', label: 'Refer' },
      { key: 'leaderboard', label: 'Leaders' },
    ],
  };

  // Map legacy flat tab ids (used by modals/quests/missions) to new dot-notation routes.
  const LEGACY_TAB_MAP = {
    overview: 'home',
    home: 'home',
    store: 'store',
    minigames: 'play.minigames',
    predict: 'play.predictions',
    predictions: 'play.predictions',
    daily: 'play.daily',
    missions: 'earn.missions',
    quests: 'earn.quests',
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

  // Game + trivia overlays are app-global modals. Extracted so the redesigned
  // (early-returned) tabs can render them too and still launch games.
  const gameOverlays = (
    <>
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
            trackQuest('gamePlayed', { gameId: 'scratch' });
            trackQuest('coinsEarned', { amount: n });
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
            trackQuest('gamePlayed', { gameId: 'dice' });
            trackQuest('coinsEarned', { amount: n });
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
            trackQuest('gamePlayed', { gameId: 'highlow' });
            trackQuest('coinsEarned', { amount: n });
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
            trackQuest('gamePlayed', { gameId: 'plinko' });
            trackQuest('coinsEarned', { amount: n });
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
            trackQuest('gamePlayed', { gameId: 'tapfrenzy' });
            trackQuest('coinsEarned', { amount: n });
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
            trackQuest('gamePlayed', { gameId: 'stopclock' });
            trackQuest('coinsEarned', { amount: n });
          }}
        />
      )}
      {activeTrivia === 'classicQuiz' && (
        <ClassicQuizGame
          onClose={() => animateClose(() => setActiveTrivia(null))} closing={closingModal}
          onWin={(n, meta) => {
            addCoins(n);
            showNotif('🧠 +' + n + ' Coins!');
            triggerReward('medium', null, { coins: n });
            trackMission('triviaPlayed', { triviaType: 'classic' });
            trackQuest('triviaPlayed', {});
            if (meta?.triviaCorrect) { trackMission('triviaCorrect', { count: meta.triviaCorrect }); trackQuest('triviaCorrect', { count: meta.triviaCorrect }); }
            trackQuest('coinsEarned', { amount: n });
          }}
        />
      )}
      {activeTrivia === 'speedRound' && (
        <SpeedRoundGame
          onClose={() => animateClose(() => setActiveTrivia(null))} closing={closingModal}
          onWin={(n, meta) => {
            addCoins(n);
            showNotif('⚡ +' + n + ' Coins!');
            triggerReward('medium', null, { coins: n });
            trackMission('triviaPlayed', { triviaType: 'speed', speedScore: meta?.triviaCorrect ?? 0 });
            trackQuest('triviaPlayed', {});
            if (meta?.triviaCorrect) { trackMission('triviaCorrect', { count: meta.triviaCorrect }); trackQuest('triviaCorrect', { count: meta.triviaCorrect }); }
            trackQuest('coinsEarned', { amount: n });
          }}
        />
      )}
      {activeTrivia === 'streakTrivia' && (
        <StreakTriviaGame
          onClose={() => animateClose(() => setActiveTrivia(null))} closing={closingModal}
          onWin={(n, meta) => {
            addCoins(n);
            showNotif('🏆 +' + n + ' Coins!');
            triggerReward('medium', null, { coins: n });
            trackMission('triviaPlayed', { triviaType: 'streak', triviaStreak: meta?.triviaStreak ?? 0 });
            trackQuest('triviaPlayed', {});
            if (meta?.triviaStreak) { trackMission('triviaCorrect', { count: meta.triviaStreak }); trackQuest('triviaCorrect', { count: meta.triviaStreak }); }
            trackQuest('coinsEarned', { amount: n });
          }}
        />
      )}
      {selectedQuest && (
        <QuestDetailModal
          quest={selectedQuest}
          questProgress={user.questProgress}
          questsComplete={user.questsComplete}
          onClose={() => animateClose(() => setSelectedQuest(null))}
          onClaim={claimQuest}
          onNavigate={(tabId) => navigateTab(tabId)}
          onPlayGame={playGame}
          closing={closingModal}
        />
      )}
      {selectedMission && (
        <MissionDetailModal
          mission={selectedMission}
          progress={user.missionProgress[selectedMission.id] || 0}
          done={user.missionsComplete.includes(selectedMission.id)}
          onClose={() => animateClose(() => setSelectedMission(null))} closing={closingModal}
          onNavigate={(tabId) => navigateTab(tabId)}
        />
      )}
      {notif && (
        <div className={`fixed top-4 right-4 z-[100] px-6 py-3 rounded-xl shadow-2xl ${notifLeaving ? 'anim-slide-out' : 'anim-slide-down'} ${notif.type === 'success' ? 'bg-gradient-to-r from-green-500 to-emerald-600 shadow-green-500/30' : 'bg-gradient-to-r from-red-500 to-rose-600 shadow-red-500/30'}`}>
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
    </>
  );

  const v2Stats = {
    points: user.kwacha.toLocaleString(),
    missionsCount: [...getDailyMissions(), ...PERMANENT_MISSIONS].filter(m => !user.missionsComplete.includes(m.id)).length,
    badges: user.missionsComplete.length,
    xp: user.xp,
    onNavigate: navigateTab,
  };

  // === v2 redesigned Home ===
  if (tab === 'home') {
    return (<>
      <Overview {...v2Stats} activeTab="home" />
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
      <EarnView {...v2Stats} tab={tab === 'earn' ? 'earn.missions' : tab}
        missionProgress={user.missionProgress} missionsComplete={user.missionsComplete} onOpenMission={setSelectedMission}
        questProgress={user.questProgress} questsComplete={user.questsComplete} onOpenQuest={setSelectedQuest} />
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
      trackQuest('storePurchase', {});
      showNotif(`Purchased ${item.name}!`);
      triggerReward('small', el || null, { coins: 0 });
    };
    return (<>
      <StoreView {...v2Stats} onBuy={buyStoreItem} kwacha={user.kwacha} gems={user.gems} />
      {gameOverlays}
    </>);
  }

  return (
    <div className={`flex h-screen text-white overflow-hidden ${screenShake ? 'reward-shake' : ''}`}>
      {/* Animated gradient background */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0 }}>
        <AnimatedGradientBG />
      </div>
      {/* Confetti Burst - Full screen premium */}
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
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: `${10 + Math.random() * 80}%`,
                  top: '-15px',
                  width: shape === 'rect' ? size * 0.5 : size,
                  height: shape === 'star' ? size * 0.4 : size,
                  backgroundColor: colors[i % colors.length],
                  borderRadius: shape === 'circle' ? '50%' : shape === 'star' ? '1px' : '2px',
                  '--drift': `${drift}px`,
                  animation: `confettiFall ${duration}s ${delay}s cubic-bezier(0.25, 0.46, 0.45, 0.94) both`,
                  boxShadow: `0 0 3px ${colors[i % colors.length]}40`,
                }}
              />
            );
          })}
        </div>
      )}

      {/* Reward Animation Canvas */}
      <canvas
        ref={rewardCanvasRef}
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 9998 }}
      />

      {/* Screen Flash Overlay */}
      {screenFlash && (
        <div className={`reward-screen-flash reward-screen-flash-${screenFlash}`} />
      )}

      {/* Floating Numbers */}
      {rollingNumbers.map(n => (
        <div
          key={n.id}
          className="reward-float-number"
          style={{ left: n.x, top: n.y, color: n.color }}
        >
          {n.text}
        </div>
      ))}

      {/* Flying Coins to Header */}
      {flyingCoins.map(c => (
        <div
          key={c.id}
          className="reward-flying-coin"
          style={{
            left: c.fromX,
            top: c.fromY,
            '--fly-dx': `${c.toX - c.fromX}px`,
            '--fly-dy': `${c.toY - c.fromY}px`,
            '--fly-dx-half': `${(c.toX - c.fromX) * 0.3}px`,
            '--fly-dy-half': `${(c.toY - c.fromY) * 0.5 - 60}px`,
          }}
        >
          {c.emoji}
        </div>
      ))}

      {/* Notification Toast - Smooth slide */}
      {notif && (
        <div className={`fixed top-4 right-4 z-[100] px-6 py-3 rounded-xl shadow-2xl ${notifLeaving ? 'anim-slide-out' : 'anim-slide-down'} ${
          notif.type === 'success' 
            ? 'bg-gradient-to-r from-green-500 to-emerald-600 shadow-green-500/30' 
            : 'bg-gradient-to-r from-red-500 to-rose-600 shadow-red-500/30'
        }`}>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            <span className="font-bold">{notif.msg}</span>
          </div>
        </div>
      )}

      {/* Buy Credits Modal */}
      {showBuyModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[80] p-4 anim-fade-in" onClick={() => setShowBuyModal(null)}>
          <div className="w-full max-w-md anim-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(180deg, #1a0c2e 0%, #0a0310 100%)', border: '2px solid rgba(147,51,234,0.25)' }}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-black tracking-tight">
                    Buy {showBuyModal === 'coins' ? 'Coins' : showBuyModal === 'gems' ? 'Gems' : 'Diamonds'}
                  </h2>
                  <button type="button" onClick={() => setShowBuyModal(null)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-3">
                  {(showBuyModal === 'coins' ? [
                    { amount: 500, price: 'K50', bonus: '' },
                    { amount: 2000, price: 'K150', bonus: '+200 bonus' },
                    { amount: 5000, price: 'K300', bonus: '+800 bonus', best: true },
                    { amount: 15000, price: 'K750', bonus: '+3000 bonus' },
                  ] : showBuyModal === 'gems' ? [
                    { amount: 50, price: 'K100', bonus: '' },
                    { amount: 150, price: 'K250', bonus: '+20 bonus' },
                    { amount: 500, price: 'K600', bonus: '+100 bonus', best: true },
                    { amount: 1500, price: 'K1500', bonus: '+400 bonus' },
                  ] : [
                    { amount: 10, price: 'K200', bonus: '' },
                    { amount: 30, price: 'K500', bonus: '+5 bonus' },
                    { amount: 100, price: 'K1500', bonus: '+25 bonus', best: true },
                    { amount: 300, price: 'K4000', bonus: '+80 bonus' },
                  ]).map((pkg, i) => {
                    const colors = showBuyModal === 'coins' 
                      ? { border: 'rgba(234,179,8,0.3)', bg: 'rgba(234,179,8,0.06)', text: 'text-yellow-400', glow: 'rgba(234,179,8,0.15)' }
                      : showBuyModal === 'gems'
                      ? { border: 'rgba(16,185,129,0.3)', bg: 'rgba(16,185,129,0.06)', text: 'text-emerald-400', glow: 'rgba(16,185,129,0.15)' }
                      : { border: 'rgba(59,130,246,0.3)', bg: 'rgba(59,130,246,0.06)', text: 'text-blue-400', glow: 'rgba(59,130,246,0.15)' };
                    return (
                      <button 
                        key={i} type="button"
                        onClick={() => {
                          const key = showBuyModal === 'coins' ? 'kwacha' : showBuyModal;
                          setUser(u => ({ ...u, [key]: u[key] + pkg.amount }));
                          showNotif(`+${pkg.amount.toLocaleString()} ${showBuyModal}!`);
                          setShowBuyModal(null);
                        }}
                        className="w-full flex items-center justify-between p-4 rounded-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] relative"
                        style={{ border: `1.5px solid ${pkg.best ? 'rgba(245,158,11,0.6)' : colors.border}`, background: pkg.best ? 'rgba(245,158,11,0.08)' : colors.bg, boxShadow: pkg.best ? '0 0 20px rgba(245,158,11,0.18)' : 'none' }}
                      >
                        {pkg.best && <span className="absolute -top-2.5 right-3 px-2 py-0.5 bg-amber-500 text-black text-xs font-black rounded-md">BEST VALUE</span>}
                        <div className="flex items-center gap-3">
                          <img src={CURRENCY_ICONS[showBuyModal === 'coins' ? 'coin' : showBuyModal === 'gems' ? 'gem' : 'diamond']} alt="" className="w-10 h-10 object-contain" />
                          <div className="text-left">
                            <div className={`font-black text-xl ${colors.text}`}>{pkg.amount.toLocaleString()}</div>
                            {pkg.bonus && <div className="text-xs text-amber-400 font-bold">{pkg.bonus}</div>}
                          </div>
                        </div>
                        <div className="px-4 py-2 rounded-lg font-black text-sm btn-3d btn-3d-green">{pkg.price}</div>
                      </button>
                    );
                  })}
                </div>
                <p className="text-center text-xs text-gray-500 mt-4">Demo mode — credits are free</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tutorial Modal */}
      {activeTutorial && <TutorialModal tutorialKey={activeTutorial} onClose={() => animateClose(() => setActiveTutorial(null))} closing={closingModal} />}

      {/* Game Modals */}
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
            trackQuest('gamePlayed', { gameId: 'scratch' });
            trackQuest('coinsEarned', { amount: n });
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
            trackQuest('gamePlayed', { gameId: 'dice' });
            trackQuest('coinsEarned', { amount: n });
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
            trackQuest('gamePlayed', { gameId: 'highlow' });
            trackQuest('coinsEarned', { amount: n });
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
            trackQuest('gamePlayed', { gameId: 'plinko' });
            trackQuest('coinsEarned', { amount: n });
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
            trackQuest('gamePlayed', { gameId: 'tapfrenzy' });
            trackQuest('coinsEarned', { amount: n });
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
            trackQuest('gamePlayed', { gameId: 'stopclock' });
            trackQuest('coinsEarned', { amount: n });
          }}
        />
      )}

      {/* Trivia Game Modals */}
      {activeTrivia === 'classicQuiz' && (
        <ClassicQuizGame
          onClose={() => animateClose(() => setActiveTrivia(null))} closing={closingModal}
          onWin={(n, meta) => {
            addCoins(n);
            showNotif('🧠 +' + n + ' Coins!');
            triggerReward('medium', null, { coins: n });
            trackMission('triviaPlayed', { triviaType: 'classic' });
            trackQuest('triviaPlayed', {});
            if (meta?.triviaCorrect) { trackMission('triviaCorrect', { count: meta.triviaCorrect }); trackQuest('triviaCorrect', { count: meta.triviaCorrect }); }
            trackQuest('coinsEarned', { amount: n });
          }}
        />
      )}

      {activeTrivia === 'speedRound' && (
        <SpeedRoundGame
          onClose={() => animateClose(() => setActiveTrivia(null))} closing={closingModal}
          onWin={(n, meta) => {
            addCoins(n);
            showNotif('⚡ +' + n + ' Coins!');
            triggerReward('medium', null, { coins: n });
            trackMission('triviaPlayed', { triviaType: 'speed', speedScore: meta?.triviaCorrect ?? 0 });
            trackQuest('triviaPlayed', {});
            if (meta?.triviaCorrect) {
              trackMission('triviaCorrect', { count: meta.triviaCorrect });
              trackQuest('triviaCorrect', { count: meta.triviaCorrect });
            }
            trackQuest('coinsEarned', { amount: n });
          }}
        />
      )}

      {activeTrivia === 'streakTrivia' && (
        <StreakTriviaGame
          onClose={() => animateClose(() => setActiveTrivia(null))} closing={closingModal}
          onWin={(n, meta) => {
            addCoins(n);
            showNotif('🏆 +' + n + ' Coins!');
            triggerReward('medium', null, { coins: n });
            trackMission('triviaPlayed', { triviaType: 'streak', triviaStreak: meta?.triviaStreak ?? 0 });
            trackQuest('triviaPlayed', {});
            if (meta?.triviaStreak) {
              trackMission('triviaCorrect', { count: meta.triviaStreak });
              trackQuest('triviaCorrect', { count: meta.triviaStreak });
            }
            trackQuest('coinsEarned', { amount: n });
          }}
        />
      )}

      {/* Quest Detail Modal */}
      {selectedQuest && (
        <QuestDetailModal
          quest={selectedQuest}
          questProgress={user.questProgress}
          questsComplete={user.questsComplete}
          onClose={() => animateClose(() => setSelectedQuest(null))}
          onClaim={claimQuest}
          onNavigate={(tabId) => navigateTab(tabId)}
          onPlayGame={playGame}
          closing={closingModal}
        />
      )}

      {/* Mission Detail Modal */}
      {selectedMission && (
        <MissionDetailModal
          mission={selectedMission}
          progress={user.missionProgress[selectedMission.id] || 0}
          done={user.missionsComplete.includes(selectedMission.id)}
          onClose={() => animateClose(() => setSelectedMission(null))} closing={closingModal}
          onNavigate={(tabId) => navigateTab(tabId)}
        />
      )}

      {/* Avatar Selector Modal */}
      {showAvatarSelector && (
        <div className={`fixed inset-0 bg-black/90 flex items-center justify-center z-[80] p-4 ${closingModal ? "anim-backdrop-close" : "anim-fade-in"}`} onClick={() => animateClose(() => setShowAvatarSelector(false))}>
          <div className={`bg-gradient-to-b from-[#0a1520] to-[#030810] rounded-3xl max-w-md w-full p-6 border-0 ${closingModal ? "anim-modal-close" : "anim-scale-in"}`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Choose Avatar</h2>
              <button 
                type="button" 
                onClick={() => animateClose(() => setShowAvatarSelector(false))} 
                className="p-2 hover:bg-white/10 rounded-full"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* Current Avatar */}
            <div className="flex justify-center mb-6">
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-[#a855f7] to-[#7c3aed] flex items-center justify-center text-5xl shadow-lg shadow-[#9333ea]/50 anim-float">
                {user.avatar}
              </div>
            </div>
            
            {/* Avatar Grid */}
            <div className="grid grid-cols-6 gap-3 mb-6">
              {AVATARS.map((avatar) => (
                <button
                  key={avatar}
                  type="button"
                  onClick={() => {
                    setUser(u => ({ ...u, avatar }));
                    showNotif('Avatar updated!');
                    setShowAvatarSelector(false);
                  }}
                  className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-all hover:scale-110 ${user.avatar === avatar ? 'bg-gradient-to-br from-[#a855f7] to-[#7c3aed] ring-2 ring-[#a855f7]' : 'bg-black/40 hover:bg-[#7c3aed]/20 border border-white/10'}`}
                >
                  {avatar}
                </button>
              ))}
            </div>
            
            <p className="text-center text-gray-400 text-sm">
              Click an avatar to select it
            </p>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className={`${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:sticky md:top-0 top-0 left-0 z-40 w-56 h-full md:h-screen flex-shrink-0 transition-transform duration-300 overflow-y-auto`} style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch', background: 'rgba(8,6,18,0.92)', borderRight: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="p-3.5">
          {/* Logo */}
          <div className="flex items-center gap-2.5 mb-5 px-3 py-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 flex items-center justify-center font-black text-sm shadow-lg shadow-orange-500/20">
              100x
            </div>
            <div>
              <div className="font-bold text-base leading-tight">100xBet</div>
              <div className="text-[10px] text-[#c026d3] font-bold tracking-wider">REWARDS</div>
            </div>
          </div>

          {/* User Profile Card */}
          <div className="mb-5 p-3 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowAvatarSelector(true)}
                className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-[#a855f7] to-[#7c3aed] flex items-center justify-center text-lg hover:scale-105 transition-transform group flex-shrink-0"
              >
                {user.avatar}
                <div className="absolute inset-0 bg-black/50 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <span className="text-[9px]">Edit</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setTab('me.profile')}
                className="flex-1 text-left min-w-0"
              >
                <div className="font-bold text-sm truncate">Player1</div>
                <div className="text-[11px] text-gray-500">{level.icon} {level.name}</div>
              </button>
            </div>
            <div className="mt-2.5 h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#7c3aed] to-[#c026d3] rounded-full progress-animated"
                style={{ width: `${xpProgress}%` }}
              />
            </div>
            <div className="text-[10px] text-gray-500 mt-1 font-medium">
              {user.xp} / {nextLevel?.xp || 'MAX'} XP
            </div>
          </div>

          {/* Navigation */}
          <nav className="space-y-0.5">
            {tabs.map(t => {
              const Icon = t.icon;
              const active = tab === t.id || tab.startsWith(t.id + '.');
              const hasNotif = (t.id === 'play' && user.streak > 0) || (t.id === 'earn' && user.missionsComplete.length === 0) || (t.id === 'store');
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => { navigateTab(t.id); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all duration-200 relative group ${active ? 'text-white font-bold' : 'text-gray-400 hover:text-white hover:bg-white/[0.06] font-medium'}`}
                  style={active ? {
                    background: 'linear-gradient(135deg, rgba(147,51,234,0.2), rgba(192,38,211,0.15))',
                    boxShadow: '0 0 0 1px rgba(147,51,234,0.35), 0 0 20px rgba(147,51,234,0.18)',
                  } : {}}
                >
                  <Icon className={`w-[18px] h-[18px] transition-all duration-200 ${active ? 'text-[#c026d3]' : 'group-hover:text-[#a855f7] group-hover:scale-110'}`} />
                  <span className="text-[13px]">{t.label}</span>
                  {hasNotif && !active && (
                    <span className="ml-auto w-2 h-2 rounded-full bg-[#c026d3] animate-pulse" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Demo Controls */}
          <div className="mt-5 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div className="flex items-center gap-1.5 text-[10px] text-gray-500 mb-2.5 uppercase tracking-wider font-bold">
              <Sparkles className="w-3 h-3" />
              <span>Demo</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={(e) => {
                  addCoins(100);
                  addXP(50);
                  setUser(u => ({ ...u, deposits: u.deposits + 100 }));
                  trackMission('deposit');
                  trackQuest('coinsEarned', { amount: 100 });
                  trackQuest('xpEarned', { amount: 100 });
                  trackMission('xpEarned', { amount: 50 });
                  triggerReward('small', e.currentTarget, { coins: 100, xp: 50 });
                  showNotif('+100K + 50XP!');
                }}
                className="py-1.5 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg text-[10px] font-bold transition-all active:scale-95"
              >
                +Deposit
              </button>
              <button
                type="button"
                onClick={(e) => {
                  addXP(5);
                  setUser(u => ({ ...u, bets: u.bets + 1 }));
                  trackMission('betPlaced');
                  trackMission('xpEarned', { amount: 5 });
                  triggerReward('small', e.currentTarget, { xp: 5 });
                  showNotif('+1 Bet!');
                }}
                className="py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg text-[10px] font-bold transition-all active:scale-95"
              >
                +Bet
              </button>
              <button
                type="button"
                onClick={(e) => {
                  addCoins(50);
                  addXP(15);
                  setUser(u => ({ ...u, wins: u.wins + 1 }));
                  trackMission('betWon');
                  trackMission('xpEarned', { amount: 15 });
                  triggerReward('small', e.currentTarget, { coins: 50, xp: 15 });
                  showNotif('+Win!');
                }}
                className="py-1.5 bg-yellow-600/20 hover:bg-yellow-600/30 text-yellow-400 rounded-lg text-[10px] font-bold transition-all active:scale-95"
              >
                +Win
              </button>
              <button
                type="button"
                onClick={(e) => {
                  addXP(100);
                  triggerReward('small', e.currentTarget, { xp: 100 });
                  showNotif('+100 XP!');
                }}
                className="py-1.5 bg-purple-600/20 hover:bg-purple-600/30 text-purple-400 rounded-lg text-[10px] font-bold transition-all active:scale-95"
              >
                +100 XP
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden anim-fade-in" 
          onClick={() => setMobileMenuOpen(false)} 
        />
      )}

      {/* Main Content */}
      <main className="content-contrast flex-1 min-w-0 h-full overflow-y-auto relative z-10" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {/* Header */}
        <header className="px-4 py-3 sticky top-0 z-20" style={{ background: 'rgba(8,6,18,0.75)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <div className="flex items-center justify-between max-w-7xl mx-auto">
            {/* Mobile Menu Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 hover:bg-white/5 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Spacer for centering on desktop */}
            <div className="hidden md:block w-24"></div>

            {/* Currency Display — compact pill style */}
            <div className="flex items-center justify-center gap-2 flex-1 md:flex-none">
              <button type="button" onClick={() => setShowBuyModal('coins')} className={`currency-coin-target group flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all duration-200 hover:scale-[1.03] active:scale-95 cursor-pointer ${coinBounce ? 'anim-coin-bounce' : ''}`} style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)' }}>
                <img src={CURRENCY_ICONS.coin} alt="" className="w-6 h-6 object-contain" />
                <span className="font-bold text-lg text-yellow-400 tabular-nums">{user.kwacha.toLocaleString()}</span>
                <span className="w-5 h-5 rounded-md flex items-center justify-center text-yellow-900 font-bold text-xs bg-yellow-500/80 group-hover:bg-yellow-400 transition-colors">+</span>
              </button>
              <button type="button" onClick={() => setShowBuyModal('gems')} className="currency-gem-target group flex items-center gap-2 px-3.5 py-2 rounded-xl transition-all duration-200 hover:scale-[1.03] active:scale-95 cursor-pointer" style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
                <img src={CURRENCY_ICONS.gem} alt="" className="w-6 h-6 object-contain" />
                <span className="font-bold text-lg text-emerald-400 tabular-nums">{user.gems}</span>
                <span className="w-5 h-5 rounded-md flex items-center justify-center text-emerald-900 font-bold text-xs bg-emerald-500/80 group-hover:bg-emerald-400 transition-colors">+</span>
              </button>
              <button type="button" onClick={() => setShowBuyModal('diamonds')} className="currency-diamond-target hidden sm:flex group items-center gap-2 px-3.5 py-2 rounded-xl transition-all duration-200 hover:scale-[1.03] active:scale-95 cursor-pointer" style={{ background: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)' }}>
                <img src={CURRENCY_ICONS.diamond} alt="" className="w-6 h-6 object-contain" />
                <span className="font-bold text-lg text-blue-400 tabular-nums">{user.diamonds}</span>
                <span className="w-5 h-5 rounded-md flex items-center justify-center text-blue-900 font-bold text-xs bg-blue-500/80 group-hover:bg-blue-400 transition-colors">+</span>
              </button>
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-2.5">
              <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="text-xl">{level.icon}</div>
                <div>
                  <div className="text-[10px] text-gray-500 leading-tight">Lvl {level.level}</div>
                  <div className="font-bold text-xs text-[#c026d3] leading-tight">{level.name}</div>
                </div>
              </div>
              <button type="button" className="relative p-2 hover:bg-white/5 rounded-lg transition-colors">
                <Bell className="w-5 h-5 text-gray-400" />
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[9px] flex items-center justify-center font-bold">
                  3
                </span>
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-4 md:p-6 max-w-7xl mx-auto" key={tab}>
          {/* ============================================================= */}
          {/* SUB-NAV STRIP (rendered when a parent-with-children is active) */}
          {/* ============================================================= */}
          {(() => {
            const parent = tab.includes('.') ? tab.split('.')[0] : null;
            const subs = parent && SUB_NAV[parent];
            if (!subs) return null;
            return (
              <div className="flex gap-2 mb-4 overflow-x-auto -mx-1 px-1 pb-1" style={{ scrollbarWidth: 'none' }}>
                {subs.map(s => {
                  const isActive = tab === `${parent}.${s.key}`;
                  return (
                    <button
                      key={s.key}
                      type="button"
                      onClick={() => setTab(`${parent}.${s.key}`)}
                      className={`${isActive ? 'tab-btn-active' : 'tab-btn-inactive text-gray-300 hover:text-white'} px-4 py-2 text-sm whitespace-nowrap flex-shrink-0`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            );
          })()}

          {/* ============================================================= */}
          {/* HOME TAB */}
          {/* ============================================================= */}
          {tab === 'home' && (
            <div className="space-y-5">
              {/* === PRIORITY ACTION STRIP — What should the user do RIGHT NOW? === */}
              {!user.dailyClaimed && (
                <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.1) 0%, rgba(16,185,129,0.05) 100%)', border: '1px solid rgba(34,197,94,0.2)' }}>
                  <div className="flex items-center gap-4 p-4">
                    <div className="w-12 h-12 rounded-xl bg-green-500/15 flex items-center justify-center flex-shrink-0">
                      <Gift className="w-6 h-6 text-green-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm text-green-400">Your daily reward is waiting!</div>
                      <div className="text-xs text-gray-400 mt-0.5">Day {user.dailyDay} of 7 — {user.streak} day streak {user.streak >= 3 ? '🔥' : ''}</div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        const r = DAILY_REWARDS[user.dailyDay - 1];
                        addCoins(r.kwacha);
                        if (r.gems) addGems(r.gems);
                        if (r.diamonds) addDiamonds(r.diamonds);
                        addXP(20);
                        setUser(u => ({
                          ...u,
                          dailyClaimed: true,
                          dailyDay: u.dailyDay >= 7 ? 1 : u.dailyDay + 1,
                          dailyTasksDone: [...new Set([...u.dailyTasksDone, 'claim'])]
                        }));
                        trackMission('dailyClaimed');
                        trackMission('xpEarned', { amount: 20 });
                        trackQuest('dailyClaimed', {});
                        trackQuest('xpEarned', { amount: 20 });
                        showNotif(`🎉 +${r.kwacha} Coins!`);
                        triggerReward('medium', e.currentTarget, { coins: r.kwacha, gems: r.gems, diamonds: r.diamonds, xp: 20 });
                      }}
                      className="px-6 py-2.5 rounded-xl font-bold text-sm text-black flex-shrink-0 btn-3d btn-3d-green"
                    >
                      Collect Now
                    </button>
                  </div>
                </div>
              )}

              {/* === WELCOME + STATS STRIP === */}
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-black tracking-tight">Welcome back! 👋</h1>
                  <p className="text-gray-500 text-sm mt-0.5">Here's what's happening today</p>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.15)' }}>
                    <Flame className="w-3.5 h-3.5 text-orange-400" />
                    <span className="text-orange-400">{user.streak}d streak</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold" style={{ background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.15)' }}>
                    <Zap className="w-3.5 h-3.5 text-yellow-400" />
                    <span className="text-yellow-400">{user.xp.toLocaleString()} XP</span>
                  </div>
                </div>
              </div>

              {/* === HERO ACTIONS — 3 Cards with clear hierarchy === */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                {/* Daily Reward Card */}
                <div className="rounded-2xl overflow-hidden transition-all group" style={{ background: 'rgba(10,15,25,0.85)', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 2px 12px rgba(0,0,0,0.3)' }}>
                  <div className="relative h-36 overflow-hidden">
                    <img src={IMAGES.dailyGift} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f19] via-transparent to-transparent" />
                    <button
                      type="button"
                      onClick={() => setActiveTutorial('daily')}
                      className="absolute top-2.5 left-2.5 p-1.5 bg-black/40 hover:bg-black/60 rounded-lg transition-colors"
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-white/60" />
                    </button>
                    {!user.dailyClaimed && (
                      <span className="absolute top-2.5 right-2.5 px-2 py-0.5 bg-green-500 rounded-md text-[10px] font-bold tracking-wider uppercase glow-pulse">
                        Ready
                      </span>
                    )}
                    {user.dailyClaimed && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <img src={`${IMG_BASE}/green_bubble.jpg`} alt="" className="w-24 h-24 object-cover rounded-full anim-check-pop" style={{ mixBlendMode: "screen" }} />
                      </div>
                    )}
                  </div>
                  <div className="p-3.5">
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-bold text-sm">
                        {user.dailyClaimed ? '✓ Claimed Today' : 'Daily Reward'}
                      </div>
                      <div className="text-[10px] text-gray-500 font-medium">Day {user.dailyDay}/7</div>
                    </div>
                    {/* Day progress dots */}
                    <div className="flex gap-1 mb-3">
                      {[1,2,3,4,5,6,7].map(d => (
                        <div key={d} className={`h-1 flex-1 rounded-full ${d < user.dailyDay ? 'bg-green-500' : d === user.dailyDay ? (user.dailyClaimed ? 'bg-green-500' : 'bg-[#c026d3]') : 'bg-white/5'}`} />
                      ))}
                    </div>
                    {!user.dailyClaimed && (
                      <button
                        type="button"
                        onClick={(e) => {
                          const r = DAILY_REWARDS[user.dailyDay - 1];
                          addCoins(r.kwacha);
                          if (r.gems) addGems(r.gems);
                          if (r.diamonds) addDiamonds(r.diamonds);
                          addXP(20);
                          setUser(u => ({
                            ...u,
                            dailyClaimed: true,
                            dailyDay: u.dailyDay >= 7 ? 1 : u.dailyDay + 1,
                            dailyTasksDone: [...new Set([...u.dailyTasksDone, 'claim'])]
                          }));
                          trackMission('dailyClaimed');
                          trackMission('xpEarned', { amount: 20 });
                          trackQuest('dailyClaimed', {});
                          trackQuest('xpEarned', { amount: 20 });
                          triggerReward('medium', e.currentTarget, { coins: r.kwacha, gems: r.gems, diamonds: r.diamonds, xp: 20 });
                          showNotif(`🎉 +${r.kwacha} Coins!`);
                        }}
                        className="w-full py-2.5 rounded-xl font-bold text-sm btn-3d btn-3d-green"
                      >
                        Collect Reward
                      </button>
                    )}
                  </div>
                </div>

                {/* Spin Wheel Card */}
                <div onClick={() => playGame('wheel')} className="rounded-2xl overflow-hidden transition-all group cursor-pointer" style={{ background: 'rgba(10,15,25,0.85)', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 2px 12px rgba(0,0,0,0.3)' }}>
                  <div className="relative h-36 overflow-hidden">
                    <img src={IMAGES.wheel} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f19] via-transparent to-transparent" />
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setActiveTutorial('wheel'); }}
                      className="absolute top-2.5 left-2.5 p-1.5 bg-black/40 hover:bg-black/60 rounded-lg transition-colors"
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-white/60" />
                    </button>
                    {user.gamePlays.wheel > 0 && (
                      <span className="absolute top-2.5 right-2.5 px-2 py-0.5 bg-amber-500 text-black rounded-md text-[10px] font-bold tracking-wider">
                        {user.gamePlays.wheel} FREE
                      </span>
                    )}
                  </div>
                  <div className="p-3.5">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-bold text-sm">Spin & Win</div>
                      <div className="text-[10px] text-gray-500 font-medium">{user.gamePlays.wheel} spins left</div>
                    </div>
                    <div className="w-full py-2.5 rounded-xl font-bold text-sm btn-3d btn-3d-purple text-center">
                      Spin Now →
                    </div>
                  </div>
                </div>

                {/* Predictions Card */}
                <div onClick={() => setTab('play.predictions')} className="rounded-2xl overflow-hidden transition-all group cursor-pointer" style={{ background: 'rgba(10,15,25,0.85)', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 2px 12px rgba(0,0,0,0.3)' }}>
                  <div className="relative h-36 overflow-hidden">
                    <img src={IMAGES.soccerBall} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f19] via-transparent to-transparent" />
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setActiveTutorial('predictions'); }}
                      className="absolute top-2.5 left-2.5 p-1.5 bg-black/40 hover:bg-black/60 rounded-lg transition-colors"
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-white/60" />
                    </button>
                    <span className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-0.5 bg-red-500/90 rounded-md text-[10px] font-bold tracking-wider">
                      <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" /> {MATCHES.length} LIVE
                    </span>
                  </div>
                  <div className="p-3.5">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-bold text-sm">Match Predictions</div>
                      <div className="text-[10px] text-gray-500 font-medium">{MATCHES.length} matches</div>
                    </div>
                    <div className="w-full py-2.5 rounded-xl font-bold text-sm btn-3d btn-3d-blue text-center">
                      Predict & Earn →
                    </div>
                  </div>
                </div>
              </div>

              {/* === JACKPOT BANNER — slimmer === */}
              <button
                type="button"
                onClick={() => setTab('play.minigames')}
                className="w-full rounded-2xl overflow-hidden hover:brightness-110 transition-all group"
              >
                <div className="relative">
                  <img src={IMAGES.jackpotBanner} alt="" className="w-full h-32 object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent flex items-center pl-6">
                    <div className="flex items-center gap-3">
                      <Gamepad2 className="w-6 h-6 text-yellow-400" />
                      <span className="font-bold text-sm text-white/80 group-hover:text-white transition-colors">Explore 10+ minigames →</span>
                    </div>
                  </div>
                </div>
              </button>

              {/* === DAILY HUB PROMO — Compact progress card === */}
              {(() => {
                const dtCount = [
                  user.dailyTasksDone.includes('trivia'),
                  (user.dailyFreeSpinsUsed || []).length > 0,
                  (user.dailyCoinBonusClaims || 0) > 0,
                ].filter(Boolean).length;
                const dtAll = dtCount >= 3;
                const todayCat = DAILY_CAT_INFO[DAILY_CAT_ROTATION[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]] || DAILY_CAT_INFO.general;
                const CatIcon = todayCat.Icon || Target;
                return (
                  <div
                    onClick={() => setTab('play.daily')}
                    className="rounded-2xl p-3.5 cursor-pointer transition-all group"
                    style={{ background: 'rgba(10,15,25,0.7)', border: dtAll ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${dtAll ? 'bg-green-500/12' : 'bg-[#9333ea]/10'}`}>
                        {dtAll ? <CheckCircle className="w-4.5 h-4.5 text-green-400" /> : <Gift className="w-4.5 h-4.5 text-[#c026d3]" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-xs">Daily Hub</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {['trivia','freespin','coinbonus'].map((t, i) => (
                            <div key={t} className={`w-1.5 h-1.5 rounded-full transition-colors ${[
                              user.dailyTasksDone.includes('trivia'),
                              (user.dailyFreeSpinsUsed || []).length > 0,
                              (user.dailyCoinBonusClaims || 0) > 0,
                            ][i] ? 'bg-green-400' : 'bg-gray-700'}`} />
                          ))}
                          <span className={`text-[10px] font-bold ml-0.5 ${dtAll ? 'text-green-400' : 'text-gray-500'}`}>
                            {dtAll ? 'All done! Claim bonus' : !user.dailyTasksDone.includes('trivia') ? <span className="flex items-center gap-1"><CatIcon className="w-3 h-3" /> {todayCat.name} trivia + spins</span> : `${dtCount}/3 tasks`}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-[#c026d3] transition-colors" />
                    </div>
                    <div className="h-1 bg-white/[0.03] rounded-full overflow-hidden mt-2.5">
                      <div className="h-full rounded-full transition-all duration-700" style={{
                        width: `${(dtCount / 3) * 100}%`,
                        background: dtAll ? 'linear-gradient(90deg,#22c55e,#10b981)' : 'linear-gradient(90deg,#7c3aed,#c026d3)',
                      }} />
                    </div>
                  </div>
                );
              })()}

              {/* === MISSIONS SECTION — Compact horizontal scroll === */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-[#c026d3]" />
                    <h2 className="text-base font-bold">Active Missions</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTab('earn.missions')}
                    className="text-xs text-gray-500 hover:text-[#c026d3] flex items-center gap-0.5 transition-colors font-medium"
                  >
                    View all <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {[...getDailyMissions(), ...PERMANENT_MISSIONS].filter(m => !user.missionsComplete.includes(m.id)).slice(0, 3).map(m => {
                    const prog = user.missionProgress[m.id] || 0;
                    const pctM = Math.min(100, Math.round((prog / m.target) * 100));
                    return (
                      <button key={m.id} type="button" onClick={() => setSelectedMission(m)} className="rounded-2xl overflow-hidden transition-all group text-left" style={{ background: 'rgba(10,15,25,0.7)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div className="relative h-28 overflow-hidden">
                          <img src={IMAGES[m.image]} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f19] to-transparent" />
                          {m.difficulty && (
                            <div className={`absolute top-2 right-2 ${DIFFICULTY_CONFIG[m.difficulty].color} px-1.5 py-0.5 rounded-md text-[9px] font-bold shadow-md`}>
                              {DIFFICULTY_CONFIG[m.difficulty].label}
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          <div className="font-bold text-xs mb-1 truncate">{m.name}</div>
                          {/* Mission progress bar */}
                          <div className="h-1 bg-white/5 rounded-full overflow-hidden mb-2">
                            <div className="h-full bg-gradient-to-r from-[#7c3aed] to-[#c026d3] rounded-full transition-all" style={{ width: `${pctM}%` }} />
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-[10px]">
                              <span className="text-yellow-400 font-bold inline-flex items-center gap-1"><img src={CURRENCY_ICONS.coin} alt="" className="w-3.5 h-3.5 inline" />{m.reward.kwacha}</span>
                              {m.reward.gems && <span className="text-green-400 font-bold inline-flex items-center gap-1"><img src={CURRENCY_ICONS.gem} alt="" className="w-3.5 h-3.5 inline" />{m.reward.gems}</span>}
                            </div>
                            <span className="text-[9px] text-gray-500 font-medium">{prog}/{m.target}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* === FEATURED STORE — Compact === */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Store className="w-4 h-4 text-amber-400" />
                    <h2 className="text-base font-bold">Rewards Store</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTab('store')}
                    className="text-xs text-gray-500 hover:text-[#c026d3] flex items-center gap-0.5 transition-colors font-medium"
                  >
                    Browse all <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {STORE_ITEMS.filter(i => i.featured || i.isNew).slice(0, 4).map(item => (
                    <div key={item.id} className="rounded-xl overflow-hidden group transition-all" style={{ background: 'rgba(10,15,25,0.7)', border: '1px solid rgba(255,255,255,0.06)' }}>
                      <div className="relative h-24 overflow-hidden">
                        <img src={IMAGES[item.image]} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0f19] to-transparent" />
                        {item.isNew && (
                          <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 bg-green-500 rounded text-[9px] font-bold">NEW</span>
                        )}
                      </div>
                      <div className="p-2.5">
                        <div className="font-bold text-xs truncate mb-0.5">{item.name}</div>
                        <div className="text-yellow-400 font-bold text-[10px] inline-flex items-center gap-1"><img src={CURRENCY_ICONS.coin} alt="" className="w-3.5 h-3.5 inline" />{item.price.kwacha}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* MINIGAMES TAB */}
          {/* ============================================================= */}
          {tab === 'play.minigames' && (
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl font-black tracking-tight">Minigames</h1>
                <p className="text-gray-400 text-base">Play games and win prizes!</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {MINIGAMES.map(game => (
                  <div key={game.id} onClick={() => playGame(game.id)} className="rounded-3xl overflow-hidden card-interactive transition-all group cursor-pointer">
                    <div className="relative h-44 overflow-hidden">
                      <img src={IMAGES[game.image]} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                      {user.gamePlays[game.id] > 0 && (
                        <span className="absolute top-3 right-3 px-3 py-1 bg-green-500 rounded-full text-sm font-bold">
                          {user.gamePlays[game.id]} FREE
                        </span>
                      )}
                      {game.isNew && (
                        <span className="absolute top-3 left-14 px-2 py-1 bg-gradient-to-r from-orange-500 to-pink-500 rounded-full text-xs font-bold animate-pulse">
                          NEW
                        </span>
                      )}
                      <button 
                        type="button" 
                        onClick={(e) => { e.stopPropagation(); setActiveTutorial(game.id); }} 
                        className="absolute top-3 left-3 p-2 bg-black/50 hover:bg-black/70 rounded-full"
                      >
                        <HelpCircle className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="p-4">
                      <div className="font-black text-xl mb-1">{game.name}</div>
                      <div className="text-sm text-gray-400 mb-4">{game.desc}</div>
                      <div 
                        className={`w-full py-3.5 rounded-2xl font-black text-center text-lg tracking-wide transition-all duration-200 ${user.gamePlays[game.id] > 0 ? 'btn-3d btn-3d-purple' : 'bg-gray-800/40 border border-gray-600/20 text-gray-400'}`}
                      >
                        {user.gamePlays[game.id] > 0 ? 'Play Free' : `${game.cost} Coins`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            
              {/* Trivia Section */}
              <div className="mt-8">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">🧠</span>
                  <div>
                    <h2 className="text-2xl font-black tracking-tight">Trivia</h2>
                    <p className="text-sm text-gray-400">Test your knowledge, win prizes!</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {TRIVIA_GAMES.map(game => (
                    <div key={game.id} onClick={() => playTrivia(game.id)} className="rounded-3xl overflow-hidden card-interactive transition-all group cursor-pointer">
                      <div className="relative h-36 overflow-hidden">
                        <img src={IMAGES[game.image]} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0a1520] via-transparent to-transparent" />
                        {user.triviaPlays[game.id] > 0 && (
                          <span className="absolute top-3 right-3 px-3 py-1 bg-green-500 rounded-full text-sm font-bold">
                            {user.triviaPlays[game.id]} FREE
                          </span>
                        )}
                        {game.isNew && (
                          <span className="absolute top-3 left-3 px-2 py-1 bg-gradient-to-r from-orange-500 to-pink-500 rounded-full text-xs font-bold animate-pulse">NEW</span>
                        )}
                      </div>
                      <div className="p-4">
                        <div className="font-black text-xl mb-1">{game.name}</div>
                        <div className="text-sm text-gray-400 mb-4">{game.desc}</div>
                        <div 
                          className={`w-full py-3.5 rounded-2xl font-black text-center text-lg tracking-wide transition-all duration-200 ${user.triviaPlays[game.id] > 0 ? 'btn-3d btn-3d-purple' : 'bg-gray-800/40 border border-gray-600/20 text-gray-400'}`}
                        >
                          {user.triviaPlays[game.id] > 0 ? 'Play Free' : `${game.cost} Coins`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* ============================================================= */}
          {/* MISSIONS TAB */}
          {/* ============================================================= */}
          {tab === 'earn.missions' && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <img src={IMAGES.target} alt="" className="w-14 h-14 rounded-xl object-cover" />
                <div>
                  <h1 className="text-3xl font-black tracking-tight">Missions</h1>
                  <p className="text-gray-400">Complete missions for rewards!</p>
                </div>
                <button 
                  type="button" 
                  onClick={() => setActiveTutorial('missions')} 
                  className="ml-auto p-2 bg-purple-600/20 hover:bg-purple-600/40 rounded-xl"
                >
                  <HelpCircle className="w-5 h-5" />
                </button>
              </div>
              
              {/* Mission Sub-Tabs */}
              <div className="flex gap-2 bg-black/60 rounded-2xl p-1.5 border border-white/10">
                {[
                  { id: 'daily', label: '🔄 Daily', count: getDailyMissions().length },
                  { id: 'weekly', label: '📅 Weekly', count: WEEKLY_MISSIONS.length },
                  { id: 'permanent', label: '🏆 Permanent', count: PERMANENT_MISSIONS.length },
                ].map(st => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setMissionSubTab(st.id)}
                    className={`flex-1 py-3 rounded-xl font-black text-sm tracking-wide transition-all ${
                      missionSubTab === st.id 
                        ? 'tab-btn-active text-white' 
                        : 'tab-btn-inactive text-gray-400 hover:text-white'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
              
              {/* Daily Missions */}
              {missionSubTab === 'daily' && (() => {
                const dailyMissions = getDailyMissions();
                const completedCount = dailyMissions.filter(m => user.missionsComplete.includes(m.id)).length;
                const allDone = completedCount === dailyMissions.length;
                
                return (
                  <div className="space-y-4">
                    {/* Daily progress bar */}
                    <div className="match-card p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-bold">Daily Progress</span>
                        <span className="text-sm text-gray-400">{completedCount}/{dailyMissions.length} done</span>
                      </div>
                      <div className="h-3 bg-black/50 rounded-full overflow-hidden mb-3">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#7c3aed] to-[#c026d3] transition-all duration-500"
                          style={{ width: `${(completedCount / dailyMissions.length) * 100}%` }}
                        />
                      </div>
                      {/* Bonus chest reward for completing all */}
                      <div className={`flex items-center justify-between p-3 rounded-xl border ${allDone ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-black/40 border-[#7c3aed]/20'}`}>
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{allDone ? '🎁' : '🔒'}</span>
                          <div>
                            <div className="font-bold text-sm">Daily Bonus Chest</div>
                            <div className="text-xs text-gray-400">Complete all 8 missions</div>
                          </div>
                        </div>
                        <div className="text-right text-sm">
                          <span className="text-yellow-400 font-bold inline-flex items-center gap-1">500<img src={CURRENCY_ICONS.coin} alt="" className="w-4 h-4 inline" /></span>
                          <span className="text-green-400 font-bold ml-2 inline-flex items-center gap-1">10<img src={CURRENCY_ICONS.gem} alt="" className="w-4 h-4 inline" /></span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Mission cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                      {dailyMissions.map(m => {
                        const done = user.missionsComplete.includes(m.id);
                        const progress = user.missionProgress[m.id] || 0;
                        const diff = DIFFICULTY_CONFIG[m.difficulty];
                        return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setSelectedMission(m)}
                            className={`rounded-3xl overflow-hidden border text-left transition-all duration-300 group relative ${done ? 'border-green-500/50 opacity-60' : 'border-[#9333ea]/30 card-interactive hover:scale-[1.02] active:scale-[0.98]'}`}
                          >
                            {/* Full-card completed overlay */}
                            {done && (
                              <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/30 rounded-2xl">
                                <img src={`${IMG_BASE}/green_bubble.jpg`} alt="" className="w-24 h-24 object-cover rounded-full anim-check-pop" style={{ mixBlendMode: "screen" }} />
                              </div>
                            )}
                            <div className="relative h-28 overflow-hidden">
                              <img src={IMAGES[m.image]} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                              <div className="absolute inset-0 bg-gradient-to-t from-[#0a1520] via-transparent to-transparent" />
                              {/* Difficulty ribbon */}
                              <div className={`absolute top-0 right-4 ${diff.color} px-2 py-1 rounded-b-lg text-xs font-bold shadow-md`}>
                                {diff.label}
                              </div>
                            </div>
                            <div className="p-3">
                              <div className="font-bold text-sm mb-0.5 truncate">{m.name}</div>
                              <div className="text-xs text-gray-400 mb-2 truncate">{m.desc}</div>
                              <div className="flex items-center gap-2 text-xs mb-2">
                                <span className="text-yellow-400 font-bold inline-flex items-center gap-1"><img src={CURRENCY_ICONS.coin} alt="" className="w-4 h-4 inline" />{m.reward.kwacha}</span>
                                {m.reward.gems && <span className="text-green-400 font-bold inline-flex items-center gap-1"><img src={CURRENCY_ICONS.gem} alt="" className="w-4 h-4 inline" />{m.reward.gems}</span>}
                                <span className="text-[#c026d3] font-bold">⚡ {m.xp}</span>
                              </div>
                              <div className="h-1.5 bg-black/50 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${done ? 'bg-green-500' : 'bg-gradient-to-r from-[#7c3aed] to-[#c026d3]'}`}
                                  style={{ width: `${Math.min(100, (progress / m.target) * 100)}%` }} 
                                />
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
              
              {/* Weekly Missions */}
              {missionSubTab === 'weekly' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {WEEKLY_MISSIONS.map(m => {
                    const done = user.missionsComplete.includes(m.id);
                    const progress = user.missionProgress[m.id] || 0;
                    const diff = DIFFICULTY_CONFIG[m.difficulty];
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedMission(m)}
                        className={`rounded-3xl overflow-hidden border text-left transition-all duration-300 group relative ${done ? 'border-green-500/50 opacity-60' : 'border-[#9333ea]/30 card-interactive hover:scale-[1.02] active:scale-[0.98]'}`}
                      >
                        {done && (
                          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/30 rounded-2xl">
                                        <img src={`${IMG_BASE}/green_bubble.jpg`} alt="" className="w-32 h-32 object-cover rounded-full anim-check-pop" style={{ mixBlendMode: "screen" }} />
                          </div>
                        )}
                        <div className="relative h-36 overflow-hidden">
                          <img src={IMAGES[m.image]} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#0a1520] via-transparent to-transparent" />
                          <div className={`absolute top-0 right-4 ${diff.color} px-2.5 py-1.5 rounded-b-lg text-xs font-bold shadow-md`}>
                            {diff.label}
                          </div>
                        </div>
                        <div className="p-4">
                          <div className="font-bold text-lg mb-0.5">{m.name}</div>
                          <div className="text-sm text-gray-400 mb-3">{m.desc}</div>
                          <div className="flex items-center gap-3 mb-3 text-sm">
                            <span className="text-yellow-400 font-bold inline-flex items-center gap-1"><img src={CURRENCY_ICONS.coin} alt="" className="w-4 h-4 inline" />{m.reward.kwacha}</span>
                            {m.reward.gems && <span className="text-green-400 font-bold inline-flex items-center gap-1"><img src={CURRENCY_ICONS.gem} alt="" className="w-4 h-4 inline" />{m.reward.gems}</span>}
                            <span className="text-[#c026d3] font-bold">⚡ {m.xp}</span>
                          </div>
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-xs text-gray-500">{Math.min(progress, m.target)}/{m.target}</span>
                          </div>
                          <div className="h-2 bg-black/50 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${done ? 'bg-green-500' : 'bg-gradient-to-r from-[#7c3aed] to-[#c026d3]'}`}
                              style={{ width: `${Math.min(100, (progress / m.target) * 100)}%` }} 
                            />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              
              {/* Permanent Missions */}
              {missionSubTab === 'permanent' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {PERMANENT_MISSIONS.map(m => {
                    const done = user.missionsComplete.includes(m.id);
                    const progress = user.missionProgress[m.id] || 0;
                    const diff = DIFFICULTY_CONFIG[m.difficulty];
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setSelectedMission(m)}
                        className={`rounded-3xl overflow-hidden border text-left transition-all duration-300 group relative ${done ? 'border-green-500/50 opacity-60' : 'border-[#9333ea]/30 card-interactive hover:scale-[1.02] active:scale-[0.98]'}`}
                      >
                        {done && (
                          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/30 rounded-2xl">
                                        <img src={`${IMG_BASE}/green_bubble.jpg`} alt="" className="w-32 h-32 object-cover rounded-full anim-check-pop" style={{ mixBlendMode: "screen" }} />
                          </div>
                        )}
                        <div className="relative h-40 overflow-hidden">
                          <img src={IMAGES[m.image]} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#0a1520] via-transparent to-transparent" />
                          <div className={`absolute top-0 right-4 ${diff.color} px-2.5 py-1.5 rounded-b-lg text-xs font-bold shadow-md`}>
                            {diff.label}
                          </div>
                          {m.hot && !done && (
                            <span className="absolute top-3 left-3 px-2 py-1 bg-red-500 rounded-lg text-sm font-bold">
                              🔥 HOT
                            </span>
                          )}
                        </div>
                        <div className="p-4">
                          <div className="font-bold text-lg mb-0.5">{m.name}</div>
                          <div className="text-sm text-gray-400 mb-3">{m.desc}</div>
                          <div className="flex items-center gap-3 mb-3 text-sm">
                            <span className="text-yellow-400 font-bold inline-flex items-center gap-1"><img src={CURRENCY_ICONS.coin} alt="" className="w-4 h-4 inline" />{m.reward.kwacha}</span>
                            {m.reward.gems && <span className="text-green-400 font-bold inline-flex items-center gap-1"><img src={CURRENCY_ICONS.gem} alt="" className="w-4 h-4 inline" />{m.reward.gems}</span>}
                            <span className="text-[#c026d3] font-bold">⚡ {m.xp}</span>
                          </div>
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-xs text-gray-500">{Math.min(progress, m.target)}/{m.target}</span>
                          </div>
                          <div className="h-2 bg-black/50 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${done ? 'bg-green-500' : 'bg-gradient-to-r from-[#7c3aed] to-[#c026d3]'}`}
                              style={{ width: `${Math.min(100, (progress / m.target) * 100)}%` }} 
                            />
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ============================================================= */}
          {/* DAILY TAB */}
          {/* ============================================================= */}
          {tab === 'play.daily' && (() => {
            const dtFreeSpinGames = getDailyFreeSpinGames();
            const dtFreeSpinsUsed = user.dailyFreeSpinsUsed || [];
            const dtCoinClaims = user.dailyCoinBonusClaims || 0;
            const dtTasksDone = [
              user.dailyTasksDone.includes('trivia'),
              dtFreeSpinsUsed.length > 0,
              dtCoinClaims > 0,
            ];
            const dtCount = dtTasksDone.filter(Boolean).length;
            const dtAll = dtCount >= 3;
            const dtPct = (dtCount / 3) * 100;
            const DAILY_TASKS = [
              { id: 'trivia', Icon: Target, title: 'Daily Trivia', desc: 'Answer 3 questions (Easy→Hard)', done: user.dailyTasksDone.includes('trivia'), reward: 'Up to 600', scrollTo: 'dh-trivia' },
              { id: 'freespin', Icon: Gamepad2, title: 'Free Spins', desc: 'Play a daily free game', done: dtFreeSpinsUsed.length > 0, reward: 'Free Play', scrollTo: 'dh-freespins' },
              { id: 'coinbonus', Icon: CircleDollarSign, title: 'Coin Bonus', desc: 'Claim up to 3× daily', done: dtCoinClaims > 0, reward: '50+', scrollTo: 'dh-coinbonus' },
            ];
            const scrollToSection = (id) => {
              const el = document.getElementById(id);
              if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            };
            return (
            <div className="space-y-5">
              <style>{`
                @keyframes dhPulseRing{0%{box-shadow:0 0 0 0 rgba(168,85,247,.4)}70%{box-shadow:0 0 0 10px rgba(168,85,247,0)}100%{box-shadow:0 0 0 0 rgba(168,85,247,0)}}
                @keyframes dhShimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
                @keyframes dhFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
                @keyframes dhCoinSpin{0%{transform:rotateY(0)}100%{transform:rotateY(360deg)}}
                @keyframes dhGlowBorder{0%,100%{border-color:rgba(147,51,234,.25)}50%{border-color:rgba(168,85,247,.55)}}
                .dh-card{border:1.5px solid rgba(255,255,255,.08);border-radius:20px;box-shadow:0 4px 24px rgba(0,0,0,.5);background:rgba(10,15,25,.92);backdrop-filter:blur(12px);transition:all .3s ease}
                .dh-card:hover{border-color:rgba(168,85,247,.2);box-shadow:0 4px 30px rgba(0,0,0,.6),0 0 20px rgba(168,85,247,.05)}
                .dh-hero-card{border:1.5px solid rgba(147,51,234,.3);border-radius:20px;box-shadow:0 4px 24px rgba(0,0,0,.5),0 0 40px rgba(147,51,234,.06);background:linear-gradient(135deg,rgba(10,15,25,.95),rgba(30,6,50,.9));backdrop-filter:blur(12px)}
                .dh-glow-btn{position:relative;overflow:hidden}
                .dh-glow-btn::after{content:'';position:absolute;top:0;left:-100%;width:60%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.12),transparent);transition:none}
                .dh-glow-btn:hover::after{left:100%;transition:left .6s ease}
                .dh-go-btn{display:flex;align-items:center;gap:4px;padding:4px 10px;border-radius:8px;font-size:11px;font-weight:700;color:#c026d3;background:rgba(147,51,234,.08);border:1px solid rgba(147,51,234,.2);transition:all .2s;cursor:pointer;white-space:nowrap}
                .dh-go-btn:hover{background:rgba(147,51,234,.15);border-color:rgba(168,85,247,.4);transform:translateX(2px)}
                .dh-segment{height:8px;border-radius:99px;transition:all .5s cubic-bezier(.4,0,.2,1);position:relative;overflow:hidden}
                .dh-segment-filled{background:linear-gradient(90deg,#7c3aed,#c026d3)}
                .dh-segment-filled::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent 40%,rgba(255,255,255,.2) 50%,transparent 60%);background-size:200% 100%;animation:dhShimmer 2s linear infinite}
                .dh-segment-empty{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.05)}
              `}</style>

              {/* ===== HEADER (Slim) ===== */}
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(147,51,234,.15), rgba(192,38,211,.15))', border: '1.5px solid rgba(147,51,234,.25)' }}>
                  <Gift className="w-6 h-6 text-[#c026d3]" />
                </div>
                <div className="flex-1">
                  <h1 className="text-2xl font-black tracking-tight">Daily Hub</h1>
                  <p className="text-gray-500 text-xs mt-0.5">Complete tasks for bonus rewards</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(0,0,0,.3)', border: '1px solid rgba(255,255,255,.06)' }}>
                  <Timer className="w-3.5 h-3.5 text-gray-500" />
                  <div>
                    <div className="text-[9px] text-gray-500 font-medium uppercase tracking-wider">Resets in</div>
                    <div className="text-[#c026d3] font-bold text-xs font-mono leading-tight">{dailyCountdown}</div>
                  </div>
                </div>
              </div>

              {/* ===== COMPACT PROGRESS STRIP ===== */}
              <div className="dh-card p-4" style={{ animation: dtAll && !user.dailyBonusClaimed ? 'dhGlowBorder 2s ease-in-out infinite' : 'none', borderColor: dtAll && !user.dailyBonusClaimed ? 'rgba(251,191,36,.3)' : undefined }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-[#c026d3]" />
                    <span className="font-bold text-sm">Progress</span>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${dtAll ? 'bg-green-500/15 text-green-400' : 'bg-[#9333ea]/10 text-[#c026d3]'}`}>{dtCount}/3</span>
                </div>
                {/* Progress bar */}
                <div className="h-2 bg-black/40 rounded-full overflow-hidden mb-3.5" style={{ border: '1px solid rgba(255,255,255,.04)' }}>
                  <div className="h-full rounded-full transition-all duration-700 ease-out" style={{
                    width: `${dtPct}%`,
                    background: dtAll ? 'linear-gradient(90deg,#22c55e,#10b981)' : 'linear-gradient(90deg,#7c3aed,#c026d3)',
                    boxShadow: dtAll ? '0 0 12px rgba(34,197,94,.3)' : '0 0 12px rgba(147,51,234,.25)',
                  }} />
                </div>
                {/* Task list with GO buttons */}
                <div className="space-y-2">
                  {DAILY_TASKS.map(task => (
                    <div key={task.id} className={`flex items-center gap-2.5 p-2.5 rounded-xl transition-all duration-300 ${task.done ? 'bg-green-500/5 border border-green-500/10' : 'bg-black/15 border border-white/[.03]'}`}>
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${task.done ? 'bg-green-500/15' : 'bg-[#9333ea]/10'}`}>
                        {task.done ? <CheckCircle className="w-4 h-4 text-green-400" /> : <task.Icon className="w-3.5 h-3.5 text-[#c026d3]" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`font-bold text-xs ${task.done ? 'text-green-400/70 line-through' : 'text-white'}`}>{task.title}</div>
                        <div className="text-[10px] text-gray-600 leading-tight">{task.desc}</div>
                      </div>
                      {task.done ? (
                        <span className="text-[10px] font-bold text-green-400/60 bg-green-500/8 px-2 py-1 rounded-md flex-shrink-0">Done</span>
                      ) : (
                        <button type="button" onClick={() => scrollToSection(task.scrollTo)} className="dh-go-btn flex-shrink-0">
                          Go <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                {/* Completion bonus */}
                <div className={`mt-3.5 p-3 rounded-xl border transition-all duration-500 ${
                  dtAll && !user.dailyBonusClaimed
                    ? 'bg-gradient-to-r from-amber-500/8 to-orange-500/8 border-amber-400/25'
                    : user.dailyBonusClaimed
                      ? 'bg-green-500/6 border-green-500/15'
                      : 'bg-black/15 border-white/[.04] opacity-40'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${dtAll ? 'bg-amber-500/15' : user.dailyBonusClaimed ? 'bg-green-500/15' : 'bg-black/30'}`}>
                      {user.dailyBonusClaimed ? <CheckCircle className="w-5 h-5 text-green-400" /> : dtAll ? <Gift className="w-5 h-5 text-amber-400" /> : <Lock className="w-4 h-4 text-gray-600" />}
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-xs">{user.dailyBonusClaimed ? 'Bonus Claimed!' : 'Complete All 3 Tasks'}</div>
                      <div className="text-[10px] text-gray-500">
                        {user.dailyBonusClaimed 
                          ? '+200 Coins, +5 Gems, +100 XP' 
                          : <>Bonus: 200 <Medal className="w-3 h-3 text-yellow-500 inline" /> + 5 <Gem className="w-3 h-3 text-emerald-400 inline" /> + 100 XP</>
                        }
                      </div>
                    </div>
                    {dtAll && !user.dailyBonusClaimed && (
                      <button type="button" onClick={(e) => {
                        addCoins(200); addGems(5); addXP(100);
                        setUser(u => ({ ...u, dailyBonusClaimed: true }));
                        showNotif('Daily Bonus: +200 Coins + 5 Gems + 100 XP!');
                        triggerReward('big', e.currentTarget, { coins: 200, gems: 5, xp: 100 });
                      }} className="dh-glow-btn px-4 py-2 rounded-xl font-bold text-xs text-black flex-shrink-0" style={{
                        background: 'linear-gradient(180deg,#fbbf24 0%,#d97706 100%)',
                        boxShadow: '0 3px 0 #92400e, 0 4px 15px rgba(251,191,36,0.3)',
                      }}>
                        Claim!
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* ===== DAILY FREE SPINS (TOP — draws players in) ===== */}
              <div id="dh-freespins" className="dh-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-purple-500/12 border border-purple-500/20">
                      <Dices className="w-4.5 h-4.5 text-purple-400" />
                    </div>
                    <div>
                      <span className="font-bold text-sm">Daily Free Spins</span>
                      <div className="text-[10px] text-gray-500">Play today's featured games for free</div>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${dtFreeSpinsUsed.length >= 3 ? 'bg-green-500/15 text-green-400' : 'bg-white/5 text-gray-500'}`}>{dtFreeSpinsUsed.length}/3</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {dtFreeSpinGames.map(gameId => {
                    const game = MINIGAMES.find(g => g.id === gameId);
                    if (!game) return null;
                    const used = dtFreeSpinsUsed.includes(gameId);
                    return (
                      <button key={gameId} type="button" disabled={used} onClick={() => {
                        setUser(u => ({ ...u, dailyFreeSpinsUsed: [...new Set([...(u.dailyFreeSpinsUsed || []), gameId])] }));
                        setTab('play.minigames');
                        setTimeout(() => setActiveGame(gameId), 300);
                      }} className={`group relative p-3 rounded-2xl text-center transition-all duration-300 ${
                        used 
                          ? 'bg-green-500/5 border border-green-500/15 opacity-50' 
                          : 'bg-gradient-to-b from-white/[.04] to-transparent border border-[#9333ea]/20 hover:border-[#a855f7]/50 hover:shadow-lg hover:shadow-[#9333ea]/15 hover:scale-[1.03] active:scale-95'
                      }`} style={{ animation: !used ? 'dhPulseRing 2.5s ease-out infinite' : 'none', animationDelay: `${dtFreeSpinGames.indexOf(gameId) * 0.5}s` }}>
                        <div className="relative w-16 h-16 mx-auto mb-2.5 rounded-xl overflow-hidden border border-white/10 shadow-lg">
                          <img src={IMAGES[game.image]} alt="" className="w-full h-full object-cover" />
                          {used && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                              <CheckCircle className="w-7 h-7 text-green-400" />
                            </div>
                          )}
                          {!used && (
                            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                          )}
                        </div>
                        <div className="font-bold text-xs mb-1">{game.name}</div>
                        {used ? (
                          <span className="text-[10px] font-bold text-green-400/70">Played</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-black tracking-wider text-white" style={{ background: 'linear-gradient(135deg, rgba(147,51,234,.2), rgba(192,38,211,.2))', border: '1px solid rgba(168,85,247,.35)' }}>
                            <Play className="w-2.5 h-2.5" /> FREE
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ===== DAILY TRIVIA (Hero Card) ===== */}
              <div id="dh-trivia">
                <DailyTriviaChallenge
                  user={user}
                  onAnswer={handleDailyChallenge}
                  onNavigate={navigateTab}
                />
              </div>

              {/* ===== DAILY COIN BONUS (Middle) ===== */}
              {(() => {
                const maxClaims = 3;
                const claimed = user.dailyCoinBonusClaims || 0;
                const canClaim = claimed < maxClaims;
                const bonusAmount = 50 + (claimed * 25);
                return (
                  <div id="dh-coinbonus" className="dh-card p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-500/10 border border-amber-500/25">
                          <CircleDollarSign className="w-4.5 h-4.5 text-amber-400" />
                        </div>
                        <div>
                          <span className="font-bold text-sm">Coin Bonus</span>
                          <div className="text-[10px] text-gray-500">Claim {maxClaims}× daily — amounts increase!</div>
                        </div>
                      </div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${claimed >= maxClaims ? 'bg-green-500/15 text-green-400' : 'bg-white/5 text-gray-500'}`}>{claimed}/{maxClaims}</span>
                    </div>
                    {/* Claim segments */}
                    <div className="flex gap-2.5 mb-4">
                      {[50, 75, 100].map((amount, i) => (
                        <div key={i} className="flex-1">
                          <div className={`dh-segment ${i < claimed ? 'dh-segment-filled' : 'dh-segment-empty'}`} />
                          <div className="flex items-center justify-center gap-0.5 mt-1.5">
                            <Medal className={`w-3 h-3 ${i < claimed ? 'text-amber-400' : 'text-gray-700'}`} />
                            <span className={`text-[10px] font-bold ${i < claimed ? 'text-amber-400' : 'text-gray-700'}`}>{amount}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {canClaim ? (
                      <button type="button" onClick={() => {
                        addCoins(bonusAmount);
                        setUser(u => ({ ...u, dailyCoinBonusClaims: (u.dailyCoinBonusClaims || 0) + 1, dailyTasksDone: [...new Set([...u.dailyTasksDone, 'coinbonus'])] }));
                        showNotif(`+${bonusAmount} Coin Bonus claimed!`);
                        trackMission('dailyClaimed');
                        trackQuest('dailyClaimed', {});
                      }} className="dh-glow-btn w-full py-3 rounded-xl font-bold text-sm transition-all hover:scale-[1.01] active:scale-[.98]" style={{
                        background: 'linear-gradient(180deg,#a855f7 0%,#7c3aed 100%)',
                        color: '#fff',
                        boxShadow: '0 3px 0 #6d28d9, 0 4px 20px rgba(147,51,234,0.3)',
                        textShadow: '0 1px 2px rgba(0,0,0,.3)',
                      }}>
                        <span className="flex items-center justify-center gap-2">
                          <CircleDollarSign className="w-4 h-4" />
                          Claim {bonusAmount} Coins {claimed > 0 && <span className="opacity-70 text-xs">({claimed + 1} of {maxClaims})</span>}
                        </span>
                      </button>
                    ) : (
                      <div className="w-full py-3 rounded-xl text-center text-sm font-bold text-green-400 bg-green-500/6 border border-green-500/12 flex items-center justify-center gap-2">
                        <CheckCircle className="w-4 h-4" /> All bonuses claimed today!
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* ===== STREAK CALENDAR ===== */}
              <div className="dh-card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-orange-500/12 border border-orange-500/20">
                      <Flame className="w-4.5 h-4.5 text-orange-400" />
                    </div>
                    <div>
                      <span className="font-bold text-sm">{user.streak} Day Streak</span>
                      <div className="text-[10px] text-gray-500">Login daily to earn rewards</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-500/8 border border-orange-500/15">
                    <TrendingUp className="w-3 h-3 text-orange-400" />
                    <span className="text-[10px] font-bold text-orange-400">
                      {user.streak >= 7 ? 'MAX!' : `${7 - user.streak} to max`}
                    </span>
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-1.5">
                  {DAILY_REWARDS.map((r, i) => {
                    const day = i + 1;
                    const isPast = day < user.dailyDay;
                    const isCurrent = day === user.dailyDay;
                    const canClaim = isCurrent && !user.dailyClaimed;
                    const isFuture = day > user.dailyDay;
                    return (
                      <button 
                        key={day} 
                        type="button" 
                        onClick={(e) => {
                          if (canClaim) {
                            addCoins(r.kwacha);
                            if (r.gems) addGems(r.gems);
                            if (r.diamonds) addDiamonds(r.diamonds);
                            addXP(20);
                            setUser(u => ({
                              ...u,
                              dailyClaimed: true,
                              dailyDay: u.dailyDay >= 7 ? 1 : u.dailyDay + 1,
                              dailyTasksDone: [...new Set([...u.dailyTasksDone, 'claim'])]
                            }));
                            trackMission('dailyClaimed');
                            trackMission('xpEarned', { amount: 20 });
                            trackQuest('dailyClaimed', {});
                            trackQuest('xpEarned', { amount: 20 });
                            showNotif(`+${r.kwacha} Coins streak reward!`);
                            triggerReward('medium', e.currentTarget, { coins: r.kwacha, gems: r.gems, diamonds: r.diamonds, xp: 20 });
                          }
                        }}
                        disabled={!canClaim} 
                        className={`p-2 rounded-xl text-center transition-all duration-300 relative ${
                          isPast 
                            ? 'bg-green-500/10 border border-green-500/25' 
                            : canClaim
                              ? 'bg-gradient-to-br from-[#9333ea]/25 to-[#c026d3]/25 border-2 border-[#a855f7]/50 shadow-lg shadow-[#9333ea]/25 hover:scale-105'
                              : isCurrent
                                ? 'bg-[#9333ea]/10 border border-[#9333ea]/20'
                                : 'bg-black/20 border border-white/[.04]'
                        }`}
                      >
                        <div className="text-[9px] text-gray-500 mb-0.5 font-medium">Day {day}</div>
                        {isPast ? (
                          <CheckCircle className="w-4 h-4 text-green-400 mx-auto mb-0.5" />
                        ) : (
                          <div className={`flex justify-center mb-0.5 ${isFuture ? 'opacity-25' : ''}`}>
                            {r.diamonds ? <Diamond className="w-4 h-4 text-blue-400" /> : r.gems ? <Gem className="w-4 h-4 text-emerald-400" /> : <Medal className="w-4 h-4 text-yellow-500" />}
                          </div>
                        )}
                        <div className={`font-bold text-[10px] ${isPast ? 'text-green-400' : isFuture ? 'text-gray-700' : 'text-yellow-400'}`}>{r.kwacha}</div>
                        {r.gems && <div className={`text-[8px] ${isFuture ? 'text-gray-700' : 'text-emerald-400'}`}>+{r.gems}g</div>}
                        {r.diamonds && <div className={`text-[8px] ${isFuture ? 'text-gray-700' : 'text-blue-400'}`}>+1d</div>}
                        {canClaim && <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-[#c026d3] rounded-full animate-ping" />}
                      </button>
                    );
                  })}
                </div>
              </div>

            </div>
            );
          })()}

          {/* ============================================================= */}
          {/* VIP TAB */}
          {/* ============================================================= */}
          {tab === 'me.vip' && (() => {
            const currentTierIdx = VIP_TIERS.findIndex(t => t.name === vip.name);
            const nextTier = VIP_TIERS[currentTierIdx + 1];
            const prevMin = vip.min;
            const nextMin = nextTier ? nextTier.min : vip.min;
            const tierProgress = nextTier ? Math.min(100, ((user.deposits - prevMin) / (nextMin - prevMin)) * 100) : 100;
            const tierColors = {
              'Standard': { from: 'from-gray-500/20', to: 'to-slate-600/20', border: 'border-gray-500/40', glow: 'shadow-gray-500/20', accent: 'text-gray-300', bar: 'from-gray-400 to-slate-500' },
              'Bronze': { from: 'from-amber-700/20', to: 'to-orange-800/20', border: 'border-amber-600/40', glow: 'shadow-amber-600/20', accent: 'text-amber-400', bar: 'from-amber-600 to-orange-500' },
              'Silver': { from: 'from-gray-300/15', to: 'to-slate-400/15', border: 'border-gray-300/40', glow: 'shadow-gray-300/20', accent: 'text-gray-200', bar: 'from-gray-300 to-slate-400' },
              'Gold': { from: 'from-yellow-500/20', to: 'to-amber-500/20', border: 'border-yellow-400/50', glow: 'shadow-yellow-500/30', accent: 'text-yellow-400', bar: 'from-yellow-400 to-amber-500' },
              'Platinum': { from: 'from-blue-400/15', to: 'to-indigo-500/15', border: 'border-blue-400/40', glow: 'shadow-blue-400/20', accent: 'text-blue-300', bar: 'from-blue-400 to-indigo-500' },
              'Diamond': { from: 'from-cyan-400/20', to: 'to-blue-500/20', border: 'border-cyan-300/50', glow: 'shadow-cyan-400/30', accent: 'text-cyan-300', bar: 'from-cyan-300 to-blue-500' },
            };
            return (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <img src={IMAGES.crown} alt="" className="w-14 h-14 rounded-xl object-cover" />
                <div>
                  <h1 className="text-3xl font-black tracking-tight">VIP Club</h1>
                  <p className="text-gray-400">Exclusive benefits for loyal players</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTutorial('vip')}
                  className="ml-auto p-2 bg-purple-600/20 hover:bg-purple-600/40 rounded-xl"
                >
                  <HelpCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Current Tier Hero Card */}
              <div className={`relative overflow-hidden rounded-2xl p-6 border ${tierColors[vip.name]?.border || 'border-[#9333ea]/40'} glow-border`} style={{ background: `linear-gradient(135deg, rgba(147,51,234,0.12) 0%, rgba(192,38,211,0.08) 50%, rgba(124,58,237,0.06) 100%)` }}>
                <div className="absolute top-0 right-0 w-40 h-40 opacity-10 text-[120px] -mt-4 -mr-4 pointer-events-none">{vip.icon}</div>
                <div className="flex items-center gap-5 relative z-10">
                  <div className="text-6xl anim-float drop-shadow-lg" style={{ filter: 'drop-shadow(0 0 12px rgba(168,85,247,0.4))' }}>{vip.icon}</div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-0.5">Current Tier</div>
                    <div className={`text-3xl font-black ${tierColors[vip.name]?.accent || 'text-[#c026d3]'}`}>{vip.name}</div>
                    <div className="text-gray-300 mt-1">{vip.cashback}% Cashback on losses</div>
                    {nextTier && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="text-gray-400">Progress to {nextTier.name}</span>
                          <span className={`font-bold ${tierColors[nextTier.name]?.accent || 'text-[#c026d3]'}`}>K{user.deposits.toLocaleString()} / K{nextTier.min.toLocaleString()}</span>
                        </div>
                        <div className="h-2.5 bg-black/40 rounded-full overflow-hidden">
                          <div className={`h-full bg-gradient-to-r ${tierColors[nextTier.name]?.bar || 'from-[#7c3aed] to-[#c026d3]'} rounded-full transition-all duration-1000`} style={{ width: `${tierProgress}%` }} />
                        </div>
                      </div>
                    )}
                    {!nextTier && (
                      <div className="mt-3 text-sm text-[#c026d3] font-bold flex items-center gap-2">
                        <Sparkles className="w-4 h-4" /> Maximum tier reached!
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* VIP Tiers Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {VIP_TIERS.map((tier, idx) => {
                  const isCurrent = tier.name === vip.name;
                  const isLocked = idx > currentTierIdx;
                  const isUnlocked = idx < currentTierIdx;
                  const colors = tierColors[tier.name];
                  return (
                    <div
                      key={tier.name}
                      className={`relative overflow-hidden rounded-2xl p-5 border transition-all duration-500 hover:scale-[1.03] ${
                        isCurrent
                          ? `${colors.border} bg-gradient-to-br ${colors.from} ${colors.to} shadow-lg ${colors.glow} glow-pulse ring-1 ring-white/10`
                          : isUnlocked
                            ? `${colors.border} bg-gradient-to-br ${colors.from} ${colors.to} opacity-80`
                            : 'border-white/10 bg-white/[0.03]'
                      }`}
                    >
                      {isCurrent && (
                        <div className="absolute top-2 right-2 px-2 py-0.5 bg-[#9333ea]/30 rounded-full text-[10px] font-bold text-[#e9d5ff] uppercase tracking-wider">
                          Current
                        </div>
                      )}
                      {isUnlocked && (
                        <div className="absolute top-2 right-2 text-green-400">
                          <CheckCircle className="w-4 h-4" />
                        </div>
                      )}
                      {isLocked && (
                        <div className="absolute top-2 right-2 text-gray-600">
                          <Lock className="w-4 h-4" />
                        </div>
                      )}
                      <div className={`text-4xl mb-3 ${isLocked ? 'opacity-40 grayscale' : ''}`} style={!isLocked ? { filter: `drop-shadow(0 0 8px rgba(255,255,255,0.15))` } : {}}>{tier.icon}</div>
                      <div className={`font-bold text-lg ${isLocked ? 'text-gray-500' : colors.accent}`}>{tier.name}</div>
                      <div className={`text-sm mt-1 ${isLocked ? 'text-gray-600' : 'text-gray-400'}`}>K{tier.min.toLocaleString()}+ deposits</div>
                      <div className={`text-sm font-bold mt-2 ${isLocked ? 'text-gray-600' : 'text-green-400'}`}>{tier.cashback}% cashback</div>
                      {isCurrent && <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ boxShadow: 'inset 0 0 30px rgba(147,51,234,0.12)' }} />}
                    </div>
                  );
                })}
              </div>

              {/* VIP Benefits */}
              <div className="match-card p-5">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Crown className="w-5 h-5 text-yellow-400" /> VIP Benefits</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03]">
                    <div className="w-10 h-10 rounded-lg bg-green-500/15 flex items-center justify-center text-green-400 flex-shrink-0"><TrendingUp className="w-5 h-5" /></div>
                    <div><div className="font-bold text-sm">Cashback</div><div className="text-xs text-gray-400">Get % back on losses automatically</div></div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03]">
                    <div className="w-10 h-10 rounded-lg bg-yellow-500/15 flex items-center justify-center text-yellow-400 flex-shrink-0"><Gift className="w-5 h-5" /></div>
                    <div><div className="font-bold text-sm">Exclusive Rewards</div><div className="text-xs text-gray-400">VIP-only store items & bonuses</div></div>
                  </div>
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.03]">
                    <div className="w-10 h-10 rounded-lg bg-purple-500/15 flex items-center justify-center text-purple-400 flex-shrink-0"><Zap className="w-5 h-5" /></div>
                    <div><div className="font-bold text-sm">Priority Support</div><div className="text-xs text-gray-400">Fast-track customer service</div></div>
                  </div>
                </div>
              </div>
            </div>
            );
          })()}

          {/* ============================================================= */}
          {/* STORE TAB */}
          {/* ============================================================= */}
          {tab === 'store' && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-bold">Store</h1>
                <button 
                  type="button" 
                  onClick={() => setActiveTutorial('store')} 
                  className="p-2 bg-purple-600/20 hover:bg-purple-600/40 rounded-xl"
                >
                  <HelpCircle className="w-5 h-5" />
                </button>
              </div>
              <div className="rounded-3xl overflow-hidden">
                <img src={IMAGES.newArrivals} alt="" className="w-full h-44 object-cover" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {STORE_ITEMS.map(item => {
                  const canBuy = user.kwacha >= item.price.kwacha && (!item.price.gems || user.gems >= item.price.gems);
                  return (
                    <div key={item.id} className={`rounded-3xl overflow-hidden border card-interactive group ${item.featured ? 'border-amber-400/50' : 'border-[#9333ea]/30'}`}>
                      <div className="relative h-44 overflow-hidden">
                        <img src={IMAGES[item.image]} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                        {item.featured && (
                          <span className="absolute top-3 left-3 px-2 py-1 bg-amber-500 rounded text-sm font-bold text-black">⭐</span>
                        )}
                        {item.isNew && (
                          <span className="absolute top-3 right-3 px-2 py-1 bg-green-500 rounded text-sm font-bold">NEW</span>
                        )}
                      </div>
                      <div className="p-4">
                        <div className="font-bold text-lg mb-1">{item.name}</div>
                        <div className="text-sm text-gray-400 mb-4">{item.desc}</div>
                        <button 
                          type="button" 
                          onClick={(e) => {
                            if (canBuy) {
                              addCoins(-item.price.kwacha);
                              if (item.price.gems) addGems(-item.price.gems);
                              trackMission('storePurchase', { amount: item.price.kwacha });
                              trackQuest('storePurchase', {});
                              showNotif(`Purchased ${item.name}!`);
                              triggerReward('small', e.currentTarget, { coins: 0 });
                            }
                          }} 
                          disabled={!canBuy} 
                          className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-300 hover:scale-[1.02] active:scale-95 ${canBuy ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 btn-glow' : 'bg-gray-800/40 border border-gray-600/20 opacity-50'}`}
                        >
                          <img src={CURRENCY_ICONS.coin} alt="" className="w-4 h-4 inline" /> {item.price.kwacha}
                          {item.price.gems && <><span>+</span><img src={CURRENCY_ICONS.gem} alt="" className="w-4 h-4 inline" /> {item.price.gems}</>}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* PREDICTIONS TAB */}
          {/* ============================================================= */}
          {tab === 'play.predictions' && (() => {
            const leagues = ['All', ...new Set(MATCHES.map(m => m.leagueShort))];
            const filtered = predLeague === 'All' ? MATCHES : MATCHES.filter(m => m.leagueShort === predLeague);
            const todayMatches = filtered.filter(m => m.status === 'today');
            const upcomingMatches = filtered.filter(m => m.status === 'upcoming');
            const totalPredicted = user.predictions.length;
            const featuredFirst = [...filtered].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));

            const renderMatch = (m) => {
              const pred = user.predictions.find(p => p.id === m.id);
              return (
                <div key={m.id} className={`match-card overflow-hidden transition-all duration-300 ${m.featured ? 'border-amber-400/30' : ''}`}>
                  {/* Match header bar */}
                  <div className={`flex items-center justify-between px-4 py-2 ${m.featured ? 'bg-gradient-to-r from-amber-500/10 to-transparent' : 'bg-white/[0.02]'}`}>
                    <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                      <span>{m.flag}</span>
                      <span>{m.league}</span>
                      {m.featured && <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 rounded text-[10px]">⭐ FEATURED</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${m.status === 'live' ? 'bg-red-500 text-white' : m.status === 'today' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-white/5 text-gray-500'}`}>
                        {m.status === 'live' ? '🔴 LIVE' : m.time}
                      </span>
                    </div>
                  </div>

                  <div className="p-4">
                    {/* Teams row */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex-1 text-center">
                        <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center text-lg font-black text-[#c026d3] mb-1.5">
                          {m.homeShort}
                        </div>
                        <div className="font-bold text-sm leading-tight">{m.home}</div>
                      </div>

                      <div className="px-3 flex flex-col items-center">
                        <div className="text-[10px] text-gray-600 font-bold mb-1">VS</div>
                        <div className="flex items-center gap-1 text-yellow-500">
                          <span className="text-xs font-bold inline-flex items-center gap-1"><img src={CURRENCY_ICONS.coin} alt="" className="w-3.5 h-3.5 inline" />{m.reward}</span>
                        </div>
                      </div>

                      <div className="flex-1 text-center">
                        <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center text-lg font-black text-[#c026d3] mb-1.5">
                          {m.awayShort}
                        </div>
                        <div className="font-bold text-sm leading-tight">{m.away}</div>
                      </div>
                    </div>

                    {/* Odds buttons or prediction result */}
                    {pred ? (
                      <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 anim-scale-in">
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span className="text-sm font-bold text-emerald-300">
                          {pred.choice === 'home' ? m.home + ' Win' : pred.choice === 'away' ? m.away + ' Win' : 'Draw'}
                        </span>
                        <span className="text-xs text-emerald-500 ml-1">
                          @ {pred.choice === 'home' ? m.h : pred.choice === 'draw' ? m.d : m.a}
                        </span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { key: 'home', label: '1', sublabel: 'Home', odds: m.h },
                          { key: 'draw', label: 'X', sublabel: 'Draw', odds: m.d },
                          { key: 'away', label: '2', sublabel: 'Away', odds: m.a },
                        ].map(opt => (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => {
                              setUser(u => ({ ...u, predictions: [...u.predictions, { id: m.id, choice: opt.key }] }));
                              addXP(m.featured ? 10 : 5);
                              addCoins(m.featured ? 10 : 5);
                              showNotif(`🎯 Prediction placed! +${m.featured ? 10 : 5} XP`);
                            }}
                            className="odds-btn p-3 text-center transition-all duration-200 hover:scale-105 active:scale-95 group"
                          >
                            <div className="text-[10px] text-gray-500 font-bold mb-0.5">{opt.sublabel}</div>
                            <div className="text-xl font-black text-white group-hover:text-[#c026d3] transition-colors tabular-nums">{opt.odds.toFixed(2)}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            };

            return (
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center gap-4">
                  <img src={IMAGES.soccerBall} alt="" className="w-12 h-12 rounded-xl object-cover" />
                  <div className="flex-1">
                    <h1 className="text-2xl font-black tracking-tight">Predictions</h1>
                    <p className="text-gray-500 text-sm">{MATCHES.length} matches available</p>
                  </div>
                  <button type="button" onClick={() => setActiveTutorial('predictions')} className="p-2 bg-purple-600/20 hover:bg-purple-600/40 rounded-xl">
                    <HelpCircle className="w-5 h-5" />
                  </button>
                </div>

                {/* Stats bar */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="match-card p-3 text-center">
                    <div className="text-2xl font-black text-[#c026d3]">{totalPredicted}</div>
                    <div className="text-[10px] text-gray-500 font-bold">Predicted</div>
                  </div>
                  <div className="match-card p-3 text-center">
                    <div className="text-2xl font-black text-yellow-400">{MATCHES.filter(m => m.featured).length}</div>
                    <div className="text-[10px] text-gray-500 font-bold">Featured</div>
                  </div>
                  <div className="match-card p-3 text-center">
                    <div className="text-2xl font-black text-green-400">{MATCHES.length - totalPredicted}</div>
                    <div className="text-[10px] text-gray-500 font-bold">Remaining</div>
                  </div>
                </div>

                {/* League filter tabs */}
                <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
                  {leagues.map(l => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => setPredLeague(l)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-black whitespace-nowrap transition-all ${predLeague === l
                        ? 'bg-[#9333ea]/20 text-[#c026d3] border border-[#9333ea]/40'
                        : 'bg-white/5 text-gray-500 border border-transparent hover:text-gray-300'
                      }`}
                    >
                      {l === 'All' ? `⚽ All (${MATCHES.length})` : l}
                    </button>
                  ))}
                </div>

                {/* Today matches */}
                {todayMatches.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full bg-green-500" style={{ animation: 'pulseGlow 2s ease-in-out infinite' }} />
                      <span className="text-sm font-black text-green-400">TODAY</span>
                      <span className="text-xs text-gray-600">{todayMatches.length} matches</span>
                    </div>
                    <div className="space-y-3">
                      {todayMatches.map(renderMatch)}
                    </div>
                  </div>
                )}

                {/* Upcoming matches */}
                {upcomingMatches.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-black text-gray-400">UPCOMING</span>
                      <span className="text-xs text-gray-600">{upcomingMatches.length} matches</span>
                    </div>
                    <div className="space-y-3">
                      {upcomingMatches.map(renderMatch)}
                    </div>
                  </div>
                )}

                {filtered.length === 0 && (
                  <div className="text-center py-10 text-gray-500">
                    <div className="text-4xl mb-3">⚽</div>
                    <div className="font-bold">No matches in this league</div>
                  </div>
                )}
              </div>
            );
          })()}


          {/* QUESTS TAB */}
          {/* ============================================================= */}
          {tab === 'earn.quests' && (
            <div className="space-y-5">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.15)' }}>
                    <Map className="w-5 h-5 text-purple-400" />
                  </div>
                  <div>
                    <h1 className="text-xl font-black tracking-tight">Quest Log</h1>
                    <p className="text-gray-500 text-xs">Complete steps to unlock big rewards</p>
                  </div>
                </div>
                <div className="text-[10px] text-gray-500 font-medium px-2.5 py-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                  {QUESTS.filter(q => user.questsComplete.includes(q.id)).length}/{QUESTS.length} done
                </div>
              </div>

              {/* Quest Cards */}
              {QUESTS.map(quest => {
                const isComplete = user.questsComplete.includes(quest.id);
                const stepsComplete = quest.steps.filter(s => (user.questProgress[s.id] || 0) >= s.target).length;
                const allDone = stepsComplete === quest.steps.length;
                const canClaim = allDone && !isComplete;
                const pct = Math.round((stepsComplete / quest.steps.length) * 100);

                return (
                  <button key={quest.id} type="button" onClick={() => setSelectedQuest(quest)}
                    className="w-full text-left rounded-2xl overflow-hidden transition-all duration-300 hover:scale-[1.005] active:scale-[0.998] group"
                    style={{
                      background: isComplete ? 'rgba(34,197,94,0.04)' : canClaim ? 'linear-gradient(135deg, rgba(34,197,94,0.08), rgba(16,185,129,0.04))' : 'rgba(10,15,25,0.8)',
                      border: isComplete ? '1px solid rgba(34,197,94,0.15)' : canClaim ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(255,255,255,0.06)',
                      boxShadow: canClaim ? '0 0 20px rgba(34,197,94,0.08)' : '0 2px 12px rgba(0,0,0,0.2)',
                    }}>

                    <div className="flex items-stretch">
                      {/* Left Image */}
                      <div className="relative w-32 flex-shrink-0 overflow-hidden">
                        <img src={IMAGES[quest.image]} alt="" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-transparent to-[#0a0f19]" />
                        {/* Completion overlay */}
                        {isComplete && (
                          <div className="absolute inset-0 bg-green-900/30 flex items-center justify-center">
                            <CheckCircle className="w-8 h-8 text-green-400 drop-shadow-lg" />
                          </div>
                        )}
                      </div>

                      {/* Quest Info */}
                      <div className="flex-1 p-4 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${quest.diffColor}`}>{quest.difficulty}</span>
                          {canClaim && (
                            <span className="text-[9px] text-green-400 font-bold px-1.5 py-0.5 rounded bg-green-500/10 animate-pulse uppercase tracking-wider">
                              Ready to claim
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-sm mb-0.5">{quest.name}</h3>
                        <p className="text-[11px] text-gray-500 mb-3 line-clamp-1">{quest.desc}</p>

                        {/* Step indicators */}
                        <div className="flex gap-1.5 mb-3">
                          {quest.steps.map((step, si) => {
                            const stepDone = (user.questProgress[step.id] || 0) >= step.target;
                            const stepProg = Math.min(100, Math.round(((user.questProgress[step.id] || 0) / step.target) * 100));
                            return (
                              <div key={step.id} className="flex-1 relative">
                                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.04)' }}>
                                  <div className="h-full rounded-full transition-all duration-500" style={{
                                    width: `${isComplete ? 100 : stepProg}%`,
                                    background: stepDone || isComplete ? '#22c55e' : 'linear-gradient(90deg, #a855f7, #ec4899)'
                                  }} />
                                </div>
                                <div className={`text-center text-[8px] mt-0.5 font-medium ${stepDone || isComplete ? 'text-green-500' : 'text-gray-600'}`}>
                                  Step {si + 1}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Rewards row */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2.5 text-[10px]">
                            <span className="text-yellow-400 font-bold flex items-center gap-1"><img src={CURRENCY_ICONS.coin} alt="" className="w-3.5 h-3.5 inline" />{quest.reward.kwacha}</span>
                            <span className="text-green-400 font-bold flex items-center gap-1"><img src={CURRENCY_ICONS.gem} alt="" className="w-3.5 h-3.5 inline" />{quest.reward.gems}</span>
                            <span className="text-[#c026d3] font-bold flex items-center gap-0.5">⚡ {quest.xp} XP</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-medium">
                            {stepsComplete}/{quest.steps.length}
                            <ChevronRight className="w-3.5 h-3.5 text-gray-600 group-hover:text-[#c026d3] transition-colors" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Claim bar */}
                    {canClaim && (
                      <div className="px-4 pb-3">
                        <div className="w-full py-2 rounded-lg font-bold text-xs text-center btn-3d btn-3d-green">
                          Claim Quest Reward →
                        </div>
                      </div>
                    )}
                  </button>
                );
              })}

              {/* Empty state hint */}
              {QUESTS.length === 0 && (
                <div className="text-center py-16 text-gray-600">
                  <Map className="w-10 h-10 mx-auto mb-3 text-gray-700" />
                  <div className="font-bold text-sm">No quests available</div>
                  <div className="text-xs mt-1">Check back later for new adventures</div>
                </div>
              )}
            </div>
          )}

          {/* ============================================================= */}
          {/* REFERRALS TAB */}
          {/* ============================================================= */}
          {tab === 'me.referrals' && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <h1 className="text-3xl font-black tracking-tight">Referrals</h1>
                <button 
                  type="button" 
                  onClick={() => setActiveTutorial('referrals')} 
                  className="p-2 bg-purple-600/20 hover:bg-purple-600/40 rounded-xl"
                >
                  <HelpCircle className="w-5 h-5" />
                </button>
              </div>
              <div className="bg-gradient-to-r from-[#9333ea]/20 to-[#c026d3]/20 rounded-2xl p-6 border border-[#9333ea]/40 glow-border">
                <div className="text-center mb-4">
                  <h3 className="text-xl font-bold mb-2">Your Referral Code</h3>
                  <p className="text-gray-400">Earn 500 Coins + 50 Gems per referral!</p>
                </div>
                <div className="flex gap-2 mb-6">
                  <div className="flex-1 bg-black/50 rounded-xl p-4 border border-white/10 font-mono text-2xl text-center">PLAYER1X</div>
                  <button 
                    type="button" 
                    onClick={() => {
                      navigator.clipboard.writeText('PLAYER1X');
                      showNotif('Code copied!');
                    }} 
                    className="px-6 bg-[#9333ea] hover:bg-[#7c3aed] rounded-xl font-bold"
                  >
                    <Copy className="w-6 h-6" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-black/60 rounded-xl p-4 border border-white/10 text-center">
                    <div className="text-3xl font-black text-[#c026d3]">{user.referrals}</div>
                    <div className="text-gray-400">Referrals</div>
                  </div>
                  <div className="bg-black/60 rounded-xl p-4 border border-white/10 text-center">
                    <div className="text-3xl font-black text-yellow-400">{user.referrals * 500}</div>
                    <div className="text-gray-400">Coins</div>
                  </div>
                  <div className="bg-black/60 rounded-xl p-4 border border-white/10 text-center">
                    <div className="text-3xl font-black text-green-400">{user.referrals * 50}</div>
                    <div className="text-gray-400">Gems</div>
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={(e) => {
                    setUser(u => ({ ...u, referrals: u.referrals + 1 }));
                    addCoins(500);
                    addGems(50);
                    addXP(200);
                    showNotif('🎉 +500 Coins + 50 Gems!');
                    triggerReward('big', e.currentTarget, { coins: 500, gems: 50, xp: 200 });
                  }} 
                  className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-xl font-bold btn-glow transition-all duration-300 hover:scale-[1.02] active:scale-95"
                >
                  Simulate Referral (Demo)
                </button>
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* LEADERBOARD TAB */}
          {/* ============================================================= */}
          {tab === 'me.leaderboard' && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <img src={IMAGES.trophy} alt="" className="w-14 h-14 rounded-xl object-cover" />
                <div>
                  <h1 className="text-3xl font-black tracking-tight">Leaderboard</h1>
                  <p className="text-gray-400">Top players this week</p>
                </div>
              </div>

              {/* Top 3 Podium — Enhanced */}
              <div className="relative rounded-2xl p-8 pb-4 overflow-hidden" style={{ background: 'linear-gradient(180deg, rgba(234,179,8,0.06) 0%, rgba(0,0,0,0.2) 100%)' }}>
                <div className="flex justify-center items-end gap-6 md:gap-10 mb-4">
                  {[
                    { n: 'BetKing', k: 12350, i: '🥈', rank: 2, color: 'from-gray-300 to-slate-500', glow: 'rgba(148,163,184,0.3)', barH: 'h-20', size: 'w-20 h-20 text-3xl' },
                    { n: 'ProGamer', k: 15420, i: '👑', rank: 1, color: 'from-yellow-400 to-amber-600', glow: 'rgba(234,179,8,0.5)', barH: 'h-28', size: 'w-28 h-28 text-5xl' },
                    { n: 'LuckyAce', k: 9870, i: '🥉', rank: 3, color: 'from-amber-600 to-orange-800', glow: 'rgba(217,119,6,0.3)', barH: 'h-16', size: 'w-20 h-20 text-3xl' }
                  ].map((p) => (
                    <div key={p.n} className="flex flex-col items-center" style={{ order: p.rank === 1 ? 2 : p.rank === 2 ? 1 : 3 }}>
                      {/* Avatar */}
                      <div className="relative mb-3">
                        {p.rank === 1 && (
                          <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-3xl anim-float z-10" style={{ filter: 'drop-shadow(0 0 8px rgba(234,179,8,0.6))' }}>👑</div>
                        )}
                        <div
                          className={`${p.size} rounded-full bg-gradient-to-br ${p.color} flex items-center justify-center transition-transform duration-500 hover:scale-110 ring-2 ring-white/20`}
                          style={{ boxShadow: `0 0 24px ${p.glow}, 0 0 48px ${p.glow}` }}
                        >
                          {p.i}
                        </div>
                      </div>
                      {/* Name + Score */}
                      <div className="font-bold text-sm md:text-base">{p.n}</div>
                      <div className={`font-bold text-sm ${p.rank === 1 ? 'text-yellow-400' : p.rank === 2 ? 'text-gray-300' : 'text-amber-500'}`}>{p.k.toLocaleString()}</div>
                      {/* Podium Bar */}
                      <div className={`${p.barH} w-20 md:w-24 mt-3 rounded-t-xl bg-gradient-to-t ${p.color} opacity-30`} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Rankings List — Enhanced */}
              <div className="space-y-2">
                {[
                  { r: 1, n: 'ProGamer', k: 15420 },
                  { r: 2, n: 'BetKing', k: 12350 },
                  { r: 3, n: 'LuckyAce', k: 9870 },
                  { r: 4, n: 'Player1', k: user.kwacha, u: true },
                  { r: 5, n: 'WinMaster', k: 700 },
                  { r: 6, n: 'CasinoKid', k: 520 },
                  { r: 7, n: 'SpinLord', k: 310 },
                  { r: 8, n: 'DiceMaster', k: 180 }
                ].map(p => {
                  const maxK = 15420;
                  const barWidth = Math.max(5, (p.k / maxK) * 100);
                  return (
                    <div key={p.r} className={`group flex items-center gap-4 p-4 rounded-xl transition-all duration-300 hover:scale-[1.01] relative overflow-hidden ${p.u ? 'bg-[#9333ea]/15 border border-[#9333ea]/40 glow-border' : 'bg-black/20 hover:bg-black/30'}`}>
                      {/* Background bar */}
                      <div
                        className={`absolute left-0 top-0 h-full transition-all duration-700 ${p.r === 1 ? 'bg-yellow-500/10' : p.r === 2 ? 'bg-gray-400/8' : p.r === 3 ? 'bg-amber-600/8' : p.u ? 'bg-[#9333ea]/10' : 'bg-white/[0.02]'}`}
                        style={{ width: `${barWidth}%` }}
                      />
                      <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                        p.r === 1 ? 'bg-gradient-to-br from-yellow-400 to-amber-600 shadow-lg shadow-yellow-500/30 text-yellow-900' :
                        p.r === 2 ? 'bg-gradient-to-br from-gray-300 to-slate-500 shadow-lg shadow-gray-400/20 text-gray-800' :
                        p.r === 3 ? 'bg-gradient-to-br from-amber-600 to-orange-800 shadow-lg shadow-amber-600/20 text-amber-100' :
                        'bg-white/10 text-gray-400'
                      }`}>
                        {p.r <= 3 ? ['🥇','🥈','🥉'][p.r-1] : p.r}
                      </div>
                      <div className="flex-1 font-bold relative z-10">{p.n} {p.u && <span className="text-xs text-[#c026d3] ml-1">(You)</span>}</div>
                      <div className={`relative z-10 font-bold ${p.r === 1 ? 'text-yellow-400' : p.r === 2 ? 'text-gray-300' : p.r === 3 ? 'text-amber-500' : p.u ? 'text-[#c026d3]' : 'text-gray-400'}`}>{p.k.toLocaleString()}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* PROFILE TAB */}
          {/* ============================================================= */}
          {tab === 'me.profile' && (() => {
            const winRate = user.bets > 0 ? Math.round((user.wins / user.bets) * 100) : 0;
            const profileStats = [
              { label: 'Bets Placed', value: user.bets, icon: Target, color: 'yellow', gradient: 'from-yellow-500/15 to-amber-500/10', border: 'border-yellow-500/20' },
              { label: 'Bets Won', value: user.wins, icon: Trophy, color: 'green', gradient: 'from-green-500/15 to-emerald-500/10', border: 'border-green-500/20' },
              { label: 'Games Played', value: user.gamesPlayed, icon: Gamepad2, color: 'fuchsia', gradient: 'from-fuchsia-500/15 to-purple-500/10', border: 'border-fuchsia-500/20' },
              { label: 'Missions Done', value: user.missionsComplete.length, icon: CheckCircle, color: 'purple', gradient: 'from-purple-500/15 to-violet-500/10', border: 'border-purple-500/20' },
            ];
            return (
            <div className="space-y-6">
              {/* Profile Hero Card */}
              <div className="relative overflow-hidden rounded-2xl border border-[#9333ea]/30" style={{ background: 'linear-gradient(135deg, rgba(147,51,234,0.12) 0%, rgba(192,38,211,0.08) 50%, rgba(124,58,237,0.06) 100%)' }}>
                <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, rgba(168,85,247,0.4) 0%, transparent 50%)' }} />
                <div className="relative p-6">
                  <div className="flex items-center gap-5">
                    <button
                      type="button"
                      onClick={() => setShowAvatarSelector(true)}
                      className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-[#a855f7] to-[#7c3aed] flex items-center justify-center text-5xl hover:scale-105 transition-all duration-300 group shadow-lg shadow-[#9333ea]/30 ring-2 ring-[#a855f7]/30"
                    >
                      {user.avatar}
                      <div className="absolute inset-0 bg-black/50 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Camera className="w-6 h-6" />
                      </div>
                    </button>
                    <div className="flex-1">
                      <h2 className="text-3xl font-black">Player1</h2>
                      <div className="text-[#e9d5ff] flex items-center gap-2 mt-0.5">
                        <span className="text-lg">{level.icon}</span>
                        <span className="font-bold">{level.name}</span>
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-300">{user.xp.toLocaleString()} XP</span>
                      </div>
                      {/* XP Progress Bar */}
                      <div className="mt-3 max-w-sm">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-gray-400">Level {level.level}</span>
                          <span className="text-[#c026d3] font-bold">{nextLevel ? `${user.xp} / ${nextLevel.xp} XP` : 'MAX LEVEL'}</span>
                        </div>
                        <div className="h-2 bg-black/40 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-[#7c3aed] to-[#c026d3] rounded-full transition-all duration-1000 progress-animated" style={{ width: `${xpProgress}%` }} />
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Quick Info Badges */}
                  <div className="flex flex-wrap gap-2 mt-4">
                    <div className="px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/10 text-xs font-bold flex items-center gap-1.5">
                      {vip.icon} <span className="text-gray-300">VIP: {vip.name}</span>
                    </div>
                    <div className="px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/10 text-xs font-bold flex items-center gap-1.5">
                      <Flame className="w-3.5 h-3.5 text-orange-400" /> <span className="text-gray-300">{user.streak}d Streak</span>
                    </div>
                    {winRate > 0 && (
                      <div className="px-3 py-1.5 rounded-lg bg-white/[0.05] border border-white/10 text-xs font-bold flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-green-400" /> <span className="text-gray-300">{winRate}% Win Rate</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Stats Grid — Enhanced */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {profileStats.map(stat => {
                  const Icon = stat.icon;
                  return (
                    <div key={stat.label} className={`relative overflow-hidden rounded-xl p-4 border ${stat.border} bg-gradient-to-br ${stat.gradient} transition-all duration-300 hover:scale-[1.03]`}>
                      <div className="absolute top-3 right-3 opacity-10">
                        <Icon className="w-10 h-10" />
                      </div>
                      <Icon className={`w-5 h-5 text-${stat.color}-400 mb-2`} />
                      <div className={`text-3xl font-black text-${stat.color}-400`}>{stat.value}</div>
                      <div className="text-gray-400 text-sm mt-0.5">{stat.label}</div>
                    </div>
                  );
                })}
              </div>

              {/* Wallet — Enhanced */}
              <div className="match-card p-5">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Wallet className="w-5 h-5 text-[#c026d3]" /> Wallet</h3>
                <div className="space-y-3">
                  {[
                    { icon: CURRENCY_ICONS.coin, name: 'Kwacha (Coins)', value: user.kwacha, color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
                    { icon: CURRENCY_ICONS.gem, name: 'Gems', value: user.gems, color: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
                    { icon: CURRENCY_ICONS.diamond, name: 'Diamonds', value: user.diamonds, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
                  ].map(c => (
                    <div key={c.name} className={`flex items-center justify-between p-3 rounded-xl ${c.bg} border ${c.border} transition-all duration-300 hover:scale-[1.01]`}>
                      <span className="flex items-center gap-3">
                        <img src={c.icon} alt="" className="w-9 h-9 object-contain" />
                        <span className="font-medium">{c.name}</span>
                      </span>
                      <span className={`${c.color} font-bold text-xl tabular-nums`}>{c.value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Achievements Preview */}
              <div className="match-card p-5">
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Award className="w-5 h-5 text-yellow-400" /> Achievements</h3>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  {[
                    { icon: '🎯', name: 'First Bet', done: user.bets > 0 },
                    { icon: '🏆', name: 'First Win', done: user.wins > 0 },
                    { icon: '🎮', name: 'Gamer', done: user.gamesPlayed >= 5 },
                    { icon: '🔥', name: '3d Streak', done: user.streak >= 3 },
                    { icon: '💰', name: 'Rich', done: user.kwacha >= 1000 },
                    { icon: '⭐', name: 'Collector', done: user.missionsComplete.length >= 5 },
                  ].map(a => (
                    <div key={a.name} className={`text-center p-3 rounded-xl border transition-all duration-300 ${a.done ? 'bg-yellow-500/10 border-yellow-500/30 hover:scale-105' : 'bg-white/[0.02] border-white/5 opacity-40 grayscale'}`}>
                      <div className="text-2xl mb-1">{a.icon}</div>
                      <div className="text-[10px] font-bold text-gray-300">{a.name}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            );
          })()}
        </div>
      </main>
    </div>
  );
}
