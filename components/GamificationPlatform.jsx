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

// ============================================================================
// GRAINIENT — React Bits shader, raw WebGL2 (no OGL dependency)
// ============================================================================
function AnimatedGradientBG() {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';
    container.appendChild(canvas);

    const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, preserveDrawingBuffer: false });
    if (!gl) { console.warn('WebGL2 not available'); return; }

    // Compile shader helper
    const compile = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error('Shader error:', gl.getShaderInfoLog(s));
        return null;
      }
      return s;
    };

    const vertSrc = `#version 300 es
in vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }`;

    const fragSrc = `#version 300 es
precision highp float;
uniform vec2 iResolution;
uniform float iTime;
uniform float uTimeSpeed;
uniform float uColorBalance;
uniform float uWarpStrength;
uniform float uWarpFrequency;
uniform float uWarpSpeed;
uniform float uWarpAmplitude;
uniform float uBlendAngle;
uniform float uBlendSoftness;
uniform float uRotationAmount;
uniform float uNoiseScale;
uniform float uGrainAmount;
uniform float uGrainScale;
uniform float uGrainAnimated;
uniform float uContrast;
uniform float uGamma;
uniform float uSaturation;
uniform vec2 uCenterOffset;
uniform float uZoom;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
out vec4 fragColor;
#define S(a,b,t) smoothstep(a,b,t)
mat2 Rot(float a){float s=sin(a),c=cos(a);return mat2(c,-s,s,c);}
vec2 hash(vec2 p){p=vec2(dot(p,vec2(2127.1,81.17)),dot(p,vec2(1269.5,283.37)));return fract(sin(p)*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.0-2.0*f);float n=mix(mix(dot(-1.0+2.0*hash(i+vec2(0.0,0.0)),f-vec2(0.0,0.0)),dot(-1.0+2.0*hash(i+vec2(1.0,0.0)),f-vec2(1.0,0.0)),u.x),mix(dot(-1.0+2.0*hash(i+vec2(0.0,1.0)),f-vec2(0.0,1.0)),dot(-1.0+2.0*hash(i+vec2(1.0,1.0)),f-vec2(1.0,1.0)),u.x),u.y);return 0.5+0.5*n;}
void main(){
  float t=iTime*uTimeSpeed;
  vec2 uv=gl_FragCoord.xy/iResolution.xy;
  float ratio=iResolution.x/iResolution.y;
  vec2 tuv=uv-0.5+uCenterOffset;
  tuv/=max(uZoom,0.001);
  float degree=noise(vec2(t*0.1,tuv.x*tuv.y)*uNoiseScale);
  tuv.y*=1.0/ratio;
  tuv*=Rot(radians((degree-0.5)*uRotationAmount+180.0));
  tuv.y*=ratio;
  float frequency=uWarpFrequency;
  float ws=max(uWarpStrength,0.001);
  float amplitude=uWarpAmplitude/ws;
  float warpTime=t*uWarpSpeed;
  tuv.x+=sin(tuv.y*frequency+warpTime)/amplitude;
  tuv.y+=sin(tuv.x*(frequency*1.5)+warpTime)/(amplitude*0.5);
  vec3 colLav=uColor1;
  vec3 colOrg=uColor2;
  vec3 colDark=uColor3;
  float b=uColorBalance;
  float s=max(uBlendSoftness,0.0);
  mat2 blendRot=Rot(radians(uBlendAngle));
  float blendX=(tuv*blendRot).x;
  float edge0=-0.3-b-s;
  float edge1=0.2-b+s;
  float v0=0.5-b+s;
  float v1=-0.3-b-s;
  vec3 layer1=mix(colDark,colOrg,S(edge0,edge1,blendX));
  vec3 layer2=mix(colOrg,colLav,S(edge0,edge1,blendX));
  vec3 col=mix(layer1,layer2,S(v0,v1,tuv.y));
  vec2 grainUv=uv*max(uGrainScale,0.001);
  if(uGrainAnimated>0.5){grainUv+=vec2(iTime*0.05);}
  float grain=fract(sin(dot(grainUv,vec2(12.9898,78.233)))*43758.5453);
  col+=(grain-0.5)*uGrainAmount;
  col=(col-0.5)*uContrast+0.5;
  float luma=dot(col,vec3(0.2126,0.7152,0.0722));
  col=mix(vec3(luma),col,uSaturation);
  col=pow(max(col,0.0),vec3(1.0/max(uGamma,0.001)));
  col=clamp(col,0.0,1.0);
  fragColor=vec4(col,1.0);
}`;

    const vs = compile(gl.VERTEX_SHADER, vertSrc);
    const fs = compile(gl.FRAGMENT_SHADER, fragSrc);
    if (!vs || !fs) return;

    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('Link error:', gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);

    // Fullscreen triangle (covers -1..1 clip space, same as OGL Triangle)
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
    const posLoc = gl.getAttribLocation(prog, 'position');
    gl.enableVertexAttribArray(posLoc);
    gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, 0, 0);

    // Get uniform locations
    const u = {};
    ['iResolution','iTime','uTimeSpeed','uColorBalance','uWarpStrength','uWarpFrequency',
     'uWarpSpeed','uWarpAmplitude','uBlendAngle','uBlendSoftness','uRotationAmount',
     'uNoiseScale','uGrainAmount','uGrainScale','uGrainAnimated','uContrast','uGamma',
     'uSaturation','uCenterOffset','uZoom','uColor1','uColor2','uColor3'
    ].forEach(name => { u[name] = gl.getUniformLocation(prog, name); });

    // Set static uniforms — cyberpunk dark theme
    const hexToRgb = h => [parseInt(h.slice(1,3),16)/255, parseInt(h.slice(3,5),16)/255, parseInt(h.slice(5,7),16)/255];
    const c1 = hexToRgb('#1a0e2e'); // deep indigo-black
    const c2 = hexToRgb('#0a0612'); // near black cool
    const c3 = hexToRgb('#2d1b4e'); // muted plum
    gl.uniform3f(u.uColor1, c1[0], c1[1], c1[2]);
    gl.uniform3f(u.uColor2, c2[0], c2[1], c2[2]);
    gl.uniform3f(u.uColor3, c3[0], c3[1], c3[2]);
    gl.uniform1f(u.uTimeSpeed, 0.15);
    gl.uniform1f(u.uColorBalance, 0.0);
    gl.uniform1f(u.uWarpStrength, 0.6);
    gl.uniform1f(u.uWarpFrequency, 3.0);
    gl.uniform1f(u.uWarpSpeed, 1.0);
    gl.uniform1f(u.uWarpAmplitude, 80.0);
    gl.uniform1f(u.uBlendAngle, 0.0);
    gl.uniform1f(u.uBlendSoftness, 0.15);
    gl.uniform1f(u.uRotationAmount, 300.0);
    gl.uniform1f(u.uNoiseScale, 1.5);
    gl.uniform1f(u.uGrainAmount, 0.06);
    gl.uniform1f(u.uGrainScale, 2.0);
    gl.uniform1f(u.uGrainAnimated, 1.0);
    gl.uniform1f(u.uContrast, 1.2);
    gl.uniform1f(u.uGamma, 1.0);
    gl.uniform1f(u.uSaturation, 0.7);
    gl.uniform2f(u.uCenterOffset, 0.0, 0.0);
    gl.uniform1f(u.uZoom, 0.9);

    // Resize handler
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      const rect = container.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rect.width));
      const h = Math.max(1, Math.floor(rect.height));
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(u.iResolution, canvas.width, canvas.height);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    resize();

    // Animation loop
    let raf = 0;
    const t0 = performance.now();
    const loop = (t) => {
      gl.uniform1f(u.iTime, (t - t0) * 0.001);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      try { container.removeChild(canvas); } catch {}
    };
  }, []);

  return <div ref={containerRef} style={{ position: 'absolute', inset: 0, overflow: 'hidden' }} />;
}

// ============================================================================
// IMAGE PATHS - All images from GitHub repository
// ============================================================================
const IMG_BASE = 'https://raw.githubusercontent.com/aichatbotbwanabet/gamification-platform/main/public/images';

// Currency icons (local)
const CURRENCY_ICONS = {
  coin: '/images/coin.png',
  gem: '/images/gem.png',
  diamond: '/images/diamond.png',
};

const IMAGES = {
  trophy: `${IMG_BASE}/trophy.jpg`,
  medal: `${IMG_BASE}/medal.jpg`,
  treasureChest: `${IMG_BASE}/treasure-chest.jpg`,
  crown: `${IMG_BASE}/crown.jpg`,
  soccerBall: `${IMG_BASE}/soccer-ball.jpg`,
  dailyGift: `${IMG_BASE}/daily-gift.jpg`,
  mysteryBox: `${IMG_BASE}/mystery-box.jpg`,
  earbuds: `${IMG_BASE}/earbuds.jpg`,
  cap: `${IMG_BASE}/cap.jpg`,
  hoodie1: `${IMG_BASE}/hoodie-logo.jpg`,
  tshirt: `${IMG_BASE}/tshirt.jpg`,
  freeBets: `${IMG_BASE}/free-bets.jpg`,
  slotMachine: `${IMG_BASE}/slot-machine.jpg`,
  plinko: `${IMG_BASE}/plinko.png`,
  playingCards: `${IMG_BASE}/playing-cards.jpg`,
  dice: `${IMG_BASE}/dice.jpg`,
  brainQuiz: `${IMG_BASE}/brain-quiz.jpg`,
  memoryCards: `${IMG_BASE}/memory-cards.jpg`,
  wheel: `${IMG_BASE}/wheel.jpg`,
  scratchCard: `${IMG_BASE}/scratch-card.jpg`,
  mysteryBoxOpen: `${IMG_BASE}/mystery-box-open.jpg`,
  trailOfLove: `${IMG_BASE}/trail-of-love.jpg`,
  vikingSpins: `${IMG_BASE}/viking-spins.jpg`,
  winTrophy: `${IMG_BASE}/win-trophy.jpg`,
  betMission: `${IMG_BASE}/bet-mission.jpg`,
  creditCards: `${IMG_BASE}/credit-cards.jpg`,
  shoppingBags: `${IMG_BASE}/shopping-bags.jpg`,
  newArrivals: `${IMG_BASE}/new-arrivals.jpg`,
  jackpotBanner: `${IMG_BASE}/jackpot-banner.jpg`,
  welcomeBanner: `${IMG_BASE}/welcome-banner.jpg`,
  target: `${IMG_BASE}/target.jpg`,
  questMap: `${IMG_BASE}/quest-map.jpg`,
  classicQuiz: `${IMG_BASE}/classic-quiz.jpg`,
  speedRound: `${IMG_BASE}/speed-round.jpg`,
  streakTrivia: `${IMG_BASE}/streak-trivia.jpg`,
  dailyChallenge: `${IMG_BASE}/daily-challenge.jpg`,
  triviaSports: `${IMG_BASE}/trivia-sports.jpg`,
  triviaMusic: `${IMG_BASE}/trivia-music.jpg`,
  mines: `${IMG_BASE}/mines-game.png`,
};

// ============================================================================
// TRIVIA QUESTION BANK - 60 questions (15 per category)
// ============================================================================
const TRIVIA_QUESTIONS = {
  sports: [
    { q: 'Which country won the 2022 FIFA World Cup?', a: 'Argentina', wrong: ['France', 'Brazil', 'Germany'] },
    { q: 'How many players are on a football pitch per team?', a: '11', wrong: ['9', '10', '12'] },
    { q: 'Which club has won the most Champions League titles?', a: 'Real Madrid', wrong: ['AC Milan', 'Barcelona', 'Liverpool'] },
    { q: 'What is the duration of a standard football match?', a: '90 minutes', wrong: ['80 minutes', '100 minutes', '120 minutes'] },
    { q: 'Who holds the record for most international goals?', a: 'Cristiano Ronaldo', wrong: ['Lionel Messi', 'Pelé', 'Ali Daei'] },
    { q: 'Which African nation first reached a World Cup quarterfinal?', a: 'Cameroon', wrong: ['Nigeria', 'Ghana', 'Senegal'] },
    { q: 'What color card means a player is sent off?', a: 'Red', wrong: ['Yellow', 'Blue', 'Green'] },
    { q: 'Which Premier League club is known as "The Gunners"?', a: 'Arsenal', wrong: ['Chelsea', 'Tottenham', 'West Ham'] },
    { q: 'In which year was the first FIFA World Cup held?', a: '1930', wrong: ['1926', '1934', '1950'] },
    { q: 'What is the penalty spot distance from goal?', a: '12 yards', wrong: ['10 yards', '14 yards', '11 yards'] },
    { q: 'Which footballer is known as "The Egyptian King"?', a: 'Mohamed Salah', wrong: ['Sadio Mané', 'Pierre-Emerick Aubameyang', 'Riyad Mahrez'] },
    { q: 'How many teams compete in the English Premier League?', a: '20', wrong: ['18', '22', '16'] },
    { q: 'Which country hosted the 2010 FIFA World Cup?', a: 'South Africa', wrong: ['Brazil', 'Germany', 'Russia'] },
    { q: 'What does VAR stand for in football?', a: 'Video Assistant Referee', wrong: ['Visual Aid Review', 'Video Analysis Room', 'Verified Action Replay'] },
    { q: 'Which club does Kylian Mbappé play for (2024-25)?', a: 'Real Madrid', wrong: ['PSG', 'Barcelona', 'Manchester City'] },
  ],
  general: [
    { q: 'What is the largest planet in our solar system?', a: 'Jupiter', wrong: ['Saturn', 'Neptune', 'Uranus'] },
    { q: 'What is the chemical symbol for gold?', a: 'Au', wrong: ['Ag', 'Go', 'Gd'] },
    { q: 'How many continents are there on Earth?', a: '7', wrong: ['5', '6', '8'] },
    { q: 'What is the speed of light approximately?', a: '300,000 km/s', wrong: ['150,000 km/s', '500,000 km/s', '1,000,000 km/s'] },
    { q: 'Which organ pumps blood through the body?', a: 'Heart', wrong: ['Lungs', 'Liver', 'Brain'] },
    { q: 'What is the hardest natural substance?', a: 'Diamond', wrong: ['Titanium', 'Platinum', 'Quartz'] },
    { q: 'How many bones are in the adult human body?', a: '206', wrong: ['186', '212', '198'] },
    { q: 'What gas do plants absorb from the atmosphere?', a: 'Carbon dioxide', wrong: ['Oxygen', 'Nitrogen', 'Hydrogen'] },
    { q: 'Which planet is known as the Red Planet?', a: 'Mars', wrong: ['Venus', 'Mercury', 'Jupiter'] },
    { q: 'What is the boiling point of water in Celsius?', a: '100°C', wrong: ['90°C', '110°C', '120°C'] },
    { q: 'Who developed the theory of relativity?', a: 'Albert Einstein', wrong: ['Isaac Newton', 'Nikola Tesla', 'Stephen Hawking'] },
    { q: 'What is the largest ocean on Earth?', a: 'Pacific Ocean', wrong: ['Atlantic Ocean', 'Indian Ocean', 'Arctic Ocean'] },
    { q: 'How many elements are in the periodic table?', a: '118', wrong: ['100', '108', '126'] },
    { q: 'What force keeps us on the ground?', a: 'Gravity', wrong: ['Magnetism', 'Friction', 'Inertia'] },
    { q: 'Which blood type is the universal donor?', a: 'O negative', wrong: ['A positive', 'AB positive', 'B negative'] },
  ],
  music: [
    { q: 'Who is known as the "King of Pop"?', a: 'Michael Jackson', wrong: ['Prince', 'Elvis Presley', 'Stevie Wonder'] },
    { q: 'Which artist released the album "Lemonade"?', a: 'Beyoncé', wrong: ['Rihanna', 'Adele', 'Taylor Swift'] },
    { q: 'What instrument does a DJ primarily use?', a: 'Turntables', wrong: ['Guitar', 'Piano', 'Drums'] },
    { q: 'Which Nigerian artist made "Essence"?', a: 'Wizkid', wrong: ['Burna Boy', 'Davido', 'Olamide'] },
    { q: 'How many strings does a standard guitar have?', a: '6', wrong: ['4', '5', '8'] },
    { q: 'Who sang "Bohemian Rhapsody"?', a: 'Queen', wrong: ['The Beatles', 'Led Zeppelin', 'Pink Floyd'] },
    { q: 'Which genre originated in Jamaica?', a: 'Reggae', wrong: ['Blues', 'Jazz', 'Funk'] },
    { q: 'Who is known as the "Queen of Afrobeats"?', a: 'Tiwa Savage', wrong: ['Yemi Alade', 'Simi', 'Teni'] },
    { q: 'What does the "B" stand for in R&B?', a: 'Blues', wrong: ['Bass', 'Beat', 'Band'] },
    { q: 'Which South African group sang "Jerusalema"?', a: 'Master KG', wrong: ['Black Coffee', 'DJ Maphorisa', 'Kabza De Small'] },
    { q: 'How many keys are on a standard piano?', a: '88', wrong: ['76', '92', '64'] },
    { q: 'Who won the most Grammy Awards ever?', a: 'Beyoncé', wrong: ['Taylor Swift', 'Adele', 'Stevie Wonder'] },
    { q: 'What country is Afrobeats originally from?', a: 'Nigeria', wrong: ['Ghana', 'South Africa', 'Kenya'] },
    { q: 'Which Zambian artist is known as "King Dandy"?', a: 'Dandy Krazy', wrong: ['Chef 187', 'Macky 2', 'Yo Maps'] },
    { q: 'What music platform has the most subscribers?', a: 'Spotify', wrong: ['Apple Music', 'YouTube Music', 'Tidal'] },
  ],
  african: [
    { q: 'What is the largest country in Africa by area?', a: 'Algeria', wrong: ['Sudan', 'DR Congo', 'Libya'] },
    { q: 'Which river is the longest in Africa?', a: 'Nile', wrong: ['Congo', 'Niger', 'Zambezi'] },
    { q: 'What is the capital of Zambia?', a: 'Lusaka', wrong: ['Kitwe', 'Ndola', 'Livingstone'] },
    { q: 'Which African country has the largest population?', a: 'Nigeria', wrong: ['Ethiopia', 'Egypt', 'DR Congo'] },
    { q: 'What is Victoria Falls known as locally?', a: 'Mosi-oa-Tunya', wrong: ['Kalambo Falls', 'Tugela Falls', 'Blue Nile Falls'] },
    { q: 'Which country is home to the Great Pyramids?', a: 'Egypt', wrong: ['Sudan', 'Libya', 'Morocco'] },
    { q: 'What language is most widely spoken in East Africa?', a: 'Swahili', wrong: ['Amharic', 'Somali', 'Yoruba'] },
    { q: 'Which African country was never colonized?', a: 'Ethiopia', wrong: ['Liberia', 'Morocco', 'Egypt'] },
    { q: 'What is the currency of Kenya?', a: 'Kenyan Shilling', wrong: ['Kenyan Dollar', 'Kenyan Rand', 'Kenyan Kwacha'] },
    { q: 'Mount Kilimanjaro is located in which country?', a: 'Tanzania', wrong: ['Kenya', 'Uganda', 'Rwanda'] },
    { q: 'Which desert covers much of North Africa?', a: 'Sahara', wrong: ['Kalahari', 'Namib', 'Nubian'] },
    { q: 'When did most African countries gain independence?', a: '1960s', wrong: ['1940s', '1950s', '1970s'] },
    { q: 'Which African city hosted the 2010 World Cup final?', a: 'Johannesburg', wrong: ['Cape Town', 'Durban', 'Pretoria'] },
    { q: 'What is the Zambian national language?', a: 'English', wrong: ['Bemba', 'Nyanja', 'Tonga'] },
    { q: 'Which lake is the largest in Africa?', a: 'Lake Victoria', wrong: ['Lake Tanganyika', 'Lake Malawi', 'Lake Chad'] },
  ],
};

const TRIVIA_CATEGORIES = [
  { id: 'sports', name: 'Sports & Football', icon: '⚽', color: 'from-green-500 to-emerald-600' },
  { id: 'general', name: 'General Knowledge', icon: '🧠', color: 'from-blue-500 to-cyan-600' },
  { id: 'music', name: 'Music & Entertainment', icon: '🎵', color: 'from-blue-500 to-rose-600' },
  { id: 'african', name: 'African Culture', icon: '🌍', color: 'from-amber-500 to-orange-600' },
];

const TRIVIA_GAMES = [
  { id: 'classicQuiz', name: 'Classic Quiz', desc: '10 questions, pick a category', icon: '🧠', color: 'from-cyan-500 to-blue-600', free: 3, cost: 30, image: 'classicQuiz' },
  { id: 'speedRound', name: 'Speed Round', desc: '20 True/False in 60 seconds', icon: '⚡', color: 'from-yellow-500 to-orange-600', free: 5, cost: 20, image: 'speedRound', isNew: true },
  { id: 'streakTrivia', name: 'Streak Trivia', desc: 'Answer or cash out!', icon: '🏆', color: 'from-red-500 to-pink-600', free: 3, cost: 25, image: 'streakTrivia' },
];

// Get shuffled questions for a category
const getQuestions = (category, count = 10) => {
  const pool = TRIVIA_QUESTIONS[category] || [];
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map(q => ({
    ...q,
    options: [q.a, ...q.wrong].sort(() => Math.random() - 0.5),
  }));
};

// Get daily challenge question (same for everyone each day)
// Category rotation by day of week: Mon=sports, Tue=general, Wed=music, Thu=african, Fri=sports, Sat=music, Sun=general
const DAILY_CAT_ROTATION = ['sports', 'general', 'music', 'african', 'sports', 'music', 'general'];
const DAILY_CAT_INFO = { sports: { name: 'Sports', icon: '⚽', Icon: Target, color: '#22c55e' }, general: { name: 'General Knowledge', icon: '🧠', Icon: Brain, color: '#22D3EE' }, music: { name: 'Music', icon: '🎵', Icon: Music, color: '#ec4899' }, african: { name: 'African Culture', icon: '🌍', Icon: Globe, color: '#f59e0b' } };
const DAILY_DIFFICULTY = [
  { label: 'Easy', color: '#22c55e', bg: 'rgba(34,197,94,.1)', border: 'rgba(34,197,94,.25)', reward: 100, time: 20 },
  { label: 'Medium', color: '#f59e0b', bg: 'rgba(245,158,11,.1)', border: 'rgba(245,158,11,.25)', reward: 200, time: 15 },
  { label: 'Hard', color: '#ef4444', bg: 'rgba(239,68,68,.1)', border: 'rgba(239,68,68,.25)', reward: 300, time: 10 },
];
const DAILY_PERFECT_BONUS = { coins: 200, gems: 5 };
const DAILY_STREAK_MULTIPLIERS = [1, 1, 1.25, 1.5, 1.75, 2];
const getDailyStreakMult = (streak) => DAILY_STREAK_MULTIPLIERS[Math.min(streak, DAILY_STREAK_MULTIPLIERS.length - 1)];

const getDailyQuestions = () => {
  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const dayOfWeek = today.getDay() === 0 ? 6 : today.getDay() - 1; // Mon=0 ... Sun=6
  const category = DAILY_CAT_ROTATION[dayOfWeek];
  const pool = [...(TRIVIA_QUESTIONS[category] || [])];
  // Deterministic shuffle based on seed
  const seededShuffle = (arr, s) => {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = ((s * (i + 1) * 9301 + 49297) % 233280) % (i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const shuffled = seededShuffle(pool, seed);
  return shuffled.slice(0, 3).map((q, i) => ({
    ...q,
    options: [q.a, ...q.wrong].sort(() => Math.random() - 0.5),
    difficulty: i,
    category,
  }));
};

const getDailyQuestion = () => {
  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const allQuestions = Object.values(TRIVIA_QUESTIONS).flat();
  const index = seed % allQuestions.length;
  const q = allQuestions[index];
  const catKeys = Object.keys(TRIVIA_QUESTIONS);
  const category = catKeys.find(k => TRIVIA_QUESTIONS[k].includes(q));
  return { ...q, options: [q.a, ...q.wrong].sort(() => Math.random() - 0.5), category };
};

// Daily free spins — 3 rotating games per day
const DAILY_FREE_SPIN_ROTATION = [
  ['wheel', 'scratch', 'dice'],
  ['plinko', 'memory', 'highlow'],
  ['tapfrenzy', 'stopclock', 'treasure'],
  ['wheel', 'plinko', 'mines'],
  ['scratch', 'tapfrenzy', 'dice'],
  ['memory', 'stopclock', 'highlow'],
  ['treasure', 'mines', 'wheel'],
];
const getDailyFreeSpinGames = () => {
  const dayOfWeek = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
  return DAILY_FREE_SPIN_ROTATION[dayOfWeek];
};

// True/False questions for Speed Round
const getSpeedQuestions = (count = 20) => {
  const allQ = Object.values(TRIVIA_QUESTIONS).flat();
  const shuffled = [...allQ].sort(() => Math.random() - 0.5).slice(0, count);
  return shuffled.map(q => {
    const isTrue = Math.random() > 0.5;
    return {
      statement: isTrue ? `${q.q.replace('?', '')} — ${q.a}` : `${q.q.replace('?', '')} — ${q.wrong[0]}`,
      answer: isTrue,
      source: q.q,
    };
  });
};

// Get random question for streak (mixed categories)
const getRandomQuestion = () => {
  const allQ = Object.values(TRIVIA_QUESTIONS).flat();
  const q = allQ[Math.floor(Math.random() * allQ.length)];
  return { ...q, options: [q.a, ...q.wrong].sort(() => Math.random() - 0.5) };
};

// Wheel-specific premium assets (served from public/ on Vercel)
const WHEEL_IMAGES = {
  diamond: `/images/wheel/prize-diamond.png`,
  coinsStack: `/images/wheel/prize-coins-stack.png`,
  xpStar: `/images/wheel/prize-xp-star.png`,
  magicKey: `/images/wheel/prize-magic-key.png`,
  emeralds: `/images/wheel/prize-emeralds.png`,
  clover: `/images/wheel/prize-clover.png`,
  coinsPile: `/images/wheel/prize-coins-pile.png`,
  magnet: `/images/wheel/prize-magnet.png`,
  ring: `/images/wheel/prize-ring.png`,
};

// ============================================================================
// TUTORIALS - Help content for each feature
// ============================================================================
const TUTORIALS = {
  wheel: {
    title: '🎡 Wheel of Fortune',
    subtitle: 'Spin to win amazing prizes!',
    image: 'wheel',
    steps: [
      { icon: '👆', title: 'Tap to Spin', desc: 'Press the golden SPIN button in the center of the wheel.' },
      { icon: '⏳', title: 'Watch the Magic', desc: 'The wheel spins with realistic physics and slows down naturally.' },
      { icon: '🎁', title: 'Claim Your Prize', desc: 'Your prize is highlighted and automatically added to your balance!' },
    ],
    prizes: ['1 Diamond 💎', '10-350 Coins 🪙', '2 Gems 💚', '10-150 XP ⭐'],
    tips: ['You get 3 FREE spins daily', 'Extra spins cost 50 Coins', 'VIP members get bonus spins!'],
  },
  scratch: {
    title: '🎫 Scratch & Win',
    subtitle: 'Scratch to reveal your prize!',
    image: 'scratchCard',
    steps: [
      { icon: '🪙', title: 'Scratch with Coin', desc: 'Click and drag across the silver area to scratch it off.' },
      { icon: '✨', title: 'Reveal 50%', desc: 'Keep scratching until you reveal at least half the card.' },
      { icon: '💰', title: 'Instant Win', desc: 'Your Coins prize is instantly credited to your account!' },
    ],
    prizes: ['25 Coins (Common)', '50-100 Coins', '200 Coins', '500 Coins (Rare!)'],
    tips: ['5 FREE scratch cards daily', 'Scratch in circular motions', 'Bigger scratches = faster reveal'],
  },
  dice: {
    title: '🎲 Lucky Dice',
    subtitle: 'Guess the total and win big!',
    image: 'dice',
    steps: [
      { icon: '🔢', title: 'Pick Your Number', desc: 'Select a total from 2 to 12 - your prediction for both dice.' },
      { icon: '🎲', title: 'Roll the Dice', desc: 'Watch the 3D dice tumble realistically!' },
      { icon: '🎯', title: 'Win Prizes', desc: 'Exact match = 500K! Close guess (±2) = 100K!' },
    ],
    prizes: ['Exact Match: 500 Coins 🎯', 'Within ±2: 100 Coins 👍', 'Any play: +10 XP'],
    tips: ['7 is statistically most likely', '2 and 12 are hardest but pay big', '5 FREE rolls daily'],
  },
  memory: {
    title: '🧠 Memory Match',
    subtitle: 'Match pairs to win rewards!',
    image: 'memoryCards',
    steps: [
      { icon: '👀', title: 'Flip Cards', desc: 'Tap any card to flip it and reveal the symbol underneath.' },
      { icon: '🧩', title: 'Find Matches', desc: 'Remember positions and match two identical symbols to score.' },
      { icon: '⚡', title: 'Be Quick', desc: 'Fewer moves = bigger prize! Complete all 8 pairs to win.' },
    ],
    prizes: ['Under 12 moves: 300 Coins', '12-16 moves: 200 Coins', '17-20 moves: 100 Coins'],
    tips: ['Start from corners', 'Create mental patterns', '3 FREE games daily'],
  },
  highlow: {
    title: '🃏 Higher or Lower',
    subtitle: 'Build your winning streak!',
    image: 'playingCards',
    steps: [
      { icon: '👁️', title: 'See Current Card', desc: 'Look at the card shown - this is your reference point.' },
      { icon: '⬆️⬇️', title: 'Make Your Guess', desc: 'Will the next card be HIGHER or LOWER? Choose wisely!' },
      { icon: '💰', title: 'Cash Out Anytime', desc: 'Each correct guess adds 25K. Cash out or risk it all!' },
    ],
    prizes: ['Each correct: +25 Coins', '5 streak: 125 Coins total', 'Cash out anytime!'],
    tips: ['Cards near 1 or 13 are easier', '7 is 50/50 - risky!', 'Know when to cash out'],
  },
  plinko: {
    title: '🔮 Plinko Drop',
    subtitle: 'Drop the ball and watch it bounce!',
    image: 'slotMachine',
    steps: [
      { icon: '👆', title: 'Choose Position', desc: 'Slide the bar to choose where to drop the ball.' },
      { icon: '🔮', title: 'Drop & Watch', desc: 'The ball bounces off pegs unpredictably toward prize slots.' },
      { icon: '💰', title: 'Win Big', desc: 'Edge slots pay 500 Coins! Center slots pay 5-10 Coins.' },
    ],
    prizes: ['Edge slots: 500 Coins 🎯', 'Near edge: 50 Coins', 'Center: 5-25 Coins'],
    tips: ['Edge drops are risky but rewarding', 'Center drops are safer but lower', '5 FREE drops daily'],
  },
  tapfrenzy: {
    title: '⚡ Tap Frenzy',
    subtitle: 'How fast can you tap?',
    image: 'target',
    steps: [
      { icon: '⚡', title: 'Start Game', desc: 'Press START and get ready to tap!' },
      { icon: '👆', title: 'Tap Targets', desc: 'Coins, gems, and stars appear — tap them for points!' },
      { icon: '💣', title: 'Avoid Bombs', desc: 'Bombs subtract 3 points — tap carefully!' },
    ],
    prizes: ['30+ points: 300 Coins 🏆', '20+ points: 200 Coins', '10+ points: 100 Coins'],
    tips: ['Gems are worth 3 points', 'Green gems are worth 5!', 'You only have 10 seconds'],
  },
  stopclock: {
    title: '⏱️ Stop the Clock',
    subtitle: 'Test your reflexes!',
    image: 'brainQuiz',
    steps: [
      { icon: '🎯', title: 'See Target', desc: 'A random target number appears (0-99).' },
      { icon: '⏱️', title: 'Watch the Clock', desc: 'Numbers spin rapidly around the dial.' },
      { icon: '🛑', title: 'Stop!', desc: 'Hit STOP as close to the target as possible!' },
    ],
    prizes: ['Exact match: 1000 Coins! 🎯', 'Within ±5: 200 Coins', 'Within ±10: 100 Coins'],
    tips: ['Watch the rhythm of the numbers', 'Anticipate slightly ahead', 'Exact match is legendary!'],
  },
  treasure: {
    title: '🗺️ Treasure Hunt',
    subtitle: 'Pick wisely, avoid traps!',
    image: 'treasureChest',
    steps: [
      { icon: '👆', title: 'Pick 3 Tiles', desc: 'Choose 3 tiles from the 5×5 grid.' },
      { icon: '🪙', title: 'Find Treasure', desc: 'Coins (25), Gems (75), or the Crown (500)!' },
      { icon: '💀', title: 'Watch for Traps', desc: 'Hit a skull and the hunt ends immediately!' },
    ],
    prizes: ['Crown 👑: 500 Coins!', 'Gem 💎: 75 Coins', 'Coin 🪙: 25 Coins'],
    tips: ['5 traps hide among 25 tiles', 'You keep coins found before a trap', 'Corner tiles can be lucky!'],
  },
  mines: {
    title: '💎 Mines',
    subtitle: 'Find gems, avoid mines!',
    image: 'mines',
    steps: [
      { icon: '⚙️', title: 'Set Your Risk', desc: 'Choose mine count (1-10) and wager amount before each round.' },
      { icon: '💎', title: 'Pick Tiles', desc: 'Click tiles to reveal gems. Each gem increases your multiplier!' },
      { icon: '💰', title: 'Cash Out Anytime', desc: 'Hit the green button or SPACE to lock in your winnings.' },
    ],
    prizes: ['More mines = higher multipliers', 'Find all gems = max payout!', 'Cash out before hitting a mine'],
    tips: ['Start with fewer mines to learn', 'Watch the multiplier climb — know when to stop!', 'The next-pick preview shows what you could win'],
  },
  daily: {
    title: '🎁 Daily Hub',
    subtitle: 'Complete 3 daily tasks for bonus rewards!',
    image: 'dailyGift',
    steps: [
      { icon: '🎯', title: '3 Daily Tasks', desc: 'Claim your streak, answer trivia, and play a game each day.' },
      { icon: '🏆', title: 'Bonus Reward', desc: 'Complete all 3 tasks for a 200 Coin + 5 Gem + 100 XP bonus!' },
      { icon: '📈', title: 'Streak Calendar', desc: 'Day 1: 10 → Day 7: 250 + Gems + Diamonds. Don\'t break the streak!' },
    ],
    prizes: ['Daily Trivia: 500 Coins + 10 Gems', 'All Tasks Bonus: 200 🪙 + 5 💚', 'Day 7 Streak: 250 + 25g + 💎'],
    tips: ['Complete all 3 tasks every day', 'Trivia gives the biggest single reward', 'Missing a day resets your streak!'],
  },
  missions: {
    title: '🎯 Missions',
    subtitle: 'Complete tasks for rewards!',
    image: 'target',
    steps: [
      { icon: '📋', title: 'View Missions', desc: 'Check available missions - each has a specific goal to complete.' },
      { icon: '✅', title: 'Complete Tasks', desc: 'Do the required action: bet, deposit, play games, etc.' },
      { icon: '🎁', title: 'Auto Rewards', desc: 'Rewards are automatically added when you complete a mission!' },
    ],
    prizes: ['Easy: 30-50 Coins', 'Medium: 50-100 Coins', 'Hard: 100-150K + Gems'],
    tips: ['Check for new missions daily', 'Hot missions give extra XP', 'Some missions have time limits'],
  },
  vip: {
    title: '👑 VIP Club',
    subtitle: 'Exclusive benefits for loyal players!',
    image: 'crown',
    steps: [
      { icon: '💳', title: 'Make Deposits', desc: 'Your total deposits determine your VIP tier level.' },
      { icon: '⬆️', title: 'Climb the Ranks', desc: 'Bronze → Silver → Gold → Platinum → Diamond VIP!' },
      { icon: '💎', title: 'Enjoy Perks', desc: 'Higher tiers = better cashback, exclusive rewards!' },
    ],
    prizes: ['Bronze: 0.5% cashback', 'Silver: 1%', 'Gold: 1.5%', 'Diamond: 3% cashback'],
    tips: ['VIP status is permanent', 'Cashback paid weekly', 'Diamond VIPs get personal manager'],
  },
  store: {
    title: '🛒 Rewards Store',
    subtitle: 'Spend your Coins on prizes!',
    image: 'shoppingBags',
    steps: [
      { icon: '🪙', title: 'Earn Coins', desc: 'Play games, complete missions, login daily to earn Coins.' },
      { icon: '🛍️', title: 'Browse Items', desc: 'Free spins, free bets, merchandise, and exclusive rewards!' },
      { icon: '✅', title: 'Purchase', desc: 'Click to buy - some items require Coins + Gems.' },
    ],
    prizes: ['Free Spins: 300-500K', 'Free Bets: 200-450K', 'Merch: 400-2000K'],
    tips: ['Featured items are limited!', 'New arrivals every week', 'Check for sale prices'],
  },
  predictions: {
    title: '⚽ Match Predictions',
    subtitle: 'Predict and win Coins!',
    image: 'soccerBall',
    steps: [
      { icon: '📊', title: 'View Matches', desc: 'Browse upcoming matches with odds displayed.' },
      { icon: '🎯', title: 'Make Prediction', desc: 'Click Home, Draw, or Away to predict the result.' },
      { icon: '💰', title: 'Win Rewards', desc: 'Correct predictions earn Coins + XP!' },
    ],
    prizes: ['Regular matches: 50-60 Coins', 'Featured ⭐: 75-100 Coins', '+5 XP per prediction'],
    tips: ['Research before predicting', 'Featured matches pay more', 'No limit on predictions!'],
  },

  classicQuiz: {
    title: '🧠 Classic Quiz',
    subtitle: 'Test your knowledge!',
    image: 'brainQuiz',
    steps: [
      { icon: '📚', title: 'Pick Category', desc: 'Choose Sports, General Knowledge, Music, or African Culture.' },
      { icon: '⏱️', title: 'Answer Fast', desc: '10 questions with 15 seconds each. Pick the correct answer!' },
      { icon: '🏆', title: 'Score Big', desc: '10 Coins per correct answer, bonuses for 7+ and perfect scores!' },
    ],
    prizes: ['10 Coins per correct answer', '7/10 bonus: +150 Coins', '10/10 perfect: +500 Coins'],
    tips: ['Use 50/50 to eliminate 2 wrong answers (1 Gem)', 'Use Skip to auto-pass a question (2 Gems)', 'Read carefully before answering!'],
  },
  speedRound: {
    title: '⚡ Speed Round',
    subtitle: 'True or False — GO!',
    image: 'target',
    steps: [
      { icon: '⏱️', title: '60 Seconds', desc: 'You have 1 minute to answer 20 True/False questions.' },
      { icon: '✅', title: 'Quick Decisions', desc: 'Read the statement and tap TRUE or FALSE as fast as you can!' },
      { icon: '💰', title: 'Speed Bonus', desc: '5 Coins per correct answer plus bonuses for high scores!' },
    ],
    prizes: ['5 Coins per correct answer', '15+ correct: +200 Coins', '20/20 perfect: +500 Coins'],
    tips: ['Trust your instincts', "Don't overthink — speed matters!", 'Watch for tricky wording'],
  },
  streakTrivia: {
    title: '🏆 Streak Trivia',
    subtitle: 'Risk it or cash out!',
    image: 'crown',
    steps: [
      { icon: '🔥', title: 'Build Your Streak', desc: 'Answer questions correctly to build your streak multiplier.' },
      { icon: '💰', title: 'Cash Out Anytime', desc: 'Take your winnings at any time — or risk it for more!' },
      { icon: '💥', title: 'Wrong = Lose All', desc: 'One wrong answer and you lose all accumulated coins!' },
    ],
    prizes: ['25 Coins × streak level', 'Streak 5 = 125 Coins', 'Streak 10 = 250 Coins'],
    tips: ['Cash out at 5 if unsure', 'Mixed categories — prepare for anything!', 'The longer you go, the riskier it gets'],
  },
  referrals: {
    title: '👥 Referrals',
    subtitle: 'Invite friends, earn rewards!',
    image: 'trophy',
    steps: [
      { icon: '🔗', title: 'Get Your Code', desc: 'Copy your unique referral code from the Referrals page.' },
      { icon: '📤', title: 'Share with Friends', desc: 'Send your code to friends who want to join 100xBet.' },
      { icon: '🎁', title: 'Both Win', desc: 'You get 500K + 50 Gems for each friend who signs up!' },
    ],
    prizes: ['Per referral: 500 Coins', 'Per referral: 50 Gems', 'Per referral: 200 XP'],
    tips: ['Share on social media', 'Friends get welcome bonus too', 'No limit on referrals!'],
  },
};

// ============================================================================
// WHEEL SEGMENTS - Prize wheel configuration
// ============================================================================
const WHEEL_SEGMENTS = [
  { id: 1, label: '1 Diamond', prize: { diamonds: 1 }, icon: '💎', image: 'diamond', color: '#a855f7' },
  { id: 2, label: '10 Coins', prize: { kwacha: 10 }, icon: '🪙', image: 'coinsStack', color: '#fbbf24' },
  { id: 3, label: '10 XP', prize: { xp: 10 }, icon: '⭐', image: 'xpStar', color: '#ec4899' },
  { id: 4, label: '150 XP', prize: { xp: 150 }, icon: '🔑', image: 'magicKey', color: '#22c55e' },
  { id: 5, label: '2 Gems', prize: { gems: 2 }, icon: '💚', image: 'emeralds', color: '#10b981' },
  { id: 6, label: '100C+100XP', prize: { xp: 100, kwacha: 100 }, icon: '🍀', image: 'clover', color: '#f97316' },
  { id: 7, label: '200 Coins', prize: { kwacha: 200 }, icon: '🪙', image: 'coinsPile', color: '#eab308' },
  { id: 8, label: '350 Coins', prize: { kwacha: 350 }, icon: '🧲', image: 'magnet', color: '#14b8a6' },
  { id: 9, label: '100 Coins', prize: { kwacha: 100 }, icon: '💍', image: 'ring', color: '#f43f5e' },
];

// ============================================================================
// GAME DATA - Levels, VIP, Missions, etc.
// ============================================================================
const XP_LEVELS = [
  { level: 1, name: 'Stone', xp: 0, icon: '🪨' },
  { level: 2, name: 'Bronze', xp: 500, icon: '🥉' },
  { level: 3, name: 'Silver', xp: 1500, icon: '🥈' },
  { level: 4, name: 'Gold', xp: 3500, icon: '🥇' },
  { level: 5, name: 'Platinum', xp: 7000, icon: '💠' },
  { level: 6, name: 'Diamond', xp: 15000, icon: '💎' },
  { level: 7, name: 'Master', xp: 30000, icon: '👑' },
];

const VIP_TIERS = [
  { name: 'Standard', min: 0, icon: '⭐', cashback: 0 },
  { name: 'Bronze', min: 500, icon: '🥉', cashback: 0.5 },
  { name: 'Silver', min: 2000, icon: '🥈', cashback: 1 },
  { name: 'Gold', min: 5000, icon: '🥇', cashback: 1.5 },
  { name: 'Platinum', min: 15000, icon: '💠', cashback: 2 },
  { name: 'Diamond', min: 50000, icon: '💎', cashback: 3 },
];

// ============================================================================
// MISSION DATA - Daily Pool, Weekly, Permanent
// ============================================================================

// Daily missions pool (8 random picked each day from 18)
const DAILY_MISSION_POOL = [
  // Easy (6)
  { id: 'd_spin', name: 'Quick Spin', desc: 'Spin the wheel once', difficulty: 'easy', target: 1, type: 'gamePlay', gameId: 'wheel', reward: { kwacha: 50 }, xp: 25, image: 'wheel', cta: 'minigames', ctaLabel: 'Go to Games' },
  { id: 'd_scratch', name: 'Scratch It', desc: 'Play a scratch card', difficulty: 'easy', target: 1, type: 'gamePlay', gameId: 'scratch', reward: { kwacha: 50 }, xp: 25, image: 'scratchCard', cta: 'minigames', ctaLabel: 'Go to Games' },
  { id: 'd_dice', name: 'Roll the Dice', desc: 'Play Lucky Dice once', difficulty: 'easy', target: 1, type: 'gamePlay', gameId: 'dice', reward: { kwacha: 50 }, xp: 25, image: 'dice', cta: 'minigames', ctaLabel: 'Go to Games' },
  { id: 'd_plinko', name: 'Drop Zone', desc: 'Play Plinko once', difficulty: 'easy', target: 1, type: 'gamePlay', gameId: 'plinko', reward: { kwacha: 50 }, xp: 25, image: 'plinko', cta: 'minigames', ctaLabel: 'Go to Games' },
  { id: 'd_bet1', name: 'First Bet Today', desc: 'Place a bet today', difficulty: 'easy', target: 1, type: 'bets', reward: { kwacha: 75 }, xp: 30, image: 'betMission', cta: 'predict', ctaLabel: 'Go to Predict' },
  { id: 'd_daily', name: 'Daily Collector', desc: 'Claim your daily reward', difficulty: 'easy', target: 1, type: 'dailyClaim', reward: { kwacha: 50 }, xp: 20, image: 'dailyGift', cta: 'daily', ctaLabel: 'Go to Daily' },
  // Medium (6)
  { id: 'd_hopper', name: 'Game Hopper', desc: 'Play 3 different games', difficulty: 'medium', target: 3, type: 'uniqueGames', reward: { kwacha: 150 }, xp: 50, image: 'memoryCards', cta: 'minigames', ctaLabel: 'Go to Games' },
  { id: 'd_bet5', name: 'Bet Builder', desc: 'Place 5 bets', difficulty: 'medium', target: 5, type: 'bets', reward: { kwacha: 200 }, xp: 60, image: 'betMission', cta: 'predict', ctaLabel: 'Go to Predict' },
  { id: 'd_coins200', name: 'Coin Collector', desc: 'Win 200 Coins from games', difficulty: 'medium', target: 200, type: 'coinsWon', reward: { kwacha: 150 }, xp: 50, image: 'treasureChest', cta: 'minigames', ctaLabel: 'Go to Games' },
  { id: 'd_tap15', name: 'Tap Master', desc: 'Score 15+ in Tap Frenzy', difficulty: 'medium', target: 15, type: 'tapScore', reward: { kwacha: 200 }, xp: 60, image: 'target', cta: 'minigames', ctaLabel: 'Go to Games' },
  { id: 'd_treasure', name: 'Treasure Seeker', desc: 'Survive Treasure Hunt (no trap)', difficulty: 'medium', target: 1, type: 'treasureSurvive', reward: { kwacha: 175 }, xp: 50, image: 'treasureChest', cta: 'minigames', ctaLabel: 'Go to Games' },
  { id: 'd_memory', name: 'Memory Pro', desc: 'Beat Memory Match in under 16 moves', difficulty: 'medium', target: 1, type: 'memoryFast', reward: { kwacha: 200 }, xp: 60, image: 'memoryCards', cta: 'minigames', ctaLabel: 'Go to Games' },
  // Hard (6)
  { id: 'd_streak3', name: 'Hot Streak', desc: 'Win 3 bets in a row', difficulty: 'hard', target: 3, type: 'winStreak', reward: { kwacha: 400, gems: 5 }, xp: 100, image: 'winTrophy', cta: 'predict', ctaLabel: 'Go to Predict' },
  { id: 'd_tap25', name: 'Tap Frenzy Pro', desc: 'Score 25+ in Tap Frenzy', difficulty: 'hard', target: 25, type: 'tapScore', reward: { kwacha: 350, gems: 5 }, xp: 100, image: 'target', cta: 'minigames', ctaLabel: 'Go to Games' },
  { id: 'd_clock3', name: 'Clock Master', desc: 'Stop within ±3 of target', difficulty: 'hard', target: 1, type: 'clockClose', reward: { kwacha: 350, gems: 5 }, xp: 100, image: 'brainQuiz', cta: 'minigames', ctaLabel: 'Go to Games' },
  { id: 'd_bet10', name: 'High Roller', desc: 'Place 10 bets in one day', difficulty: 'hard', target: 10, type: 'bets', reward: { kwacha: 400, gems: 8 }, xp: 120, image: 'betMission', cta: 'predict', ctaLabel: 'Go to Predict' },
  { id: 'd_jackpot', name: 'Jackpot Hunter', desc: 'Find the 👑 in Treasure Hunt', difficulty: 'hard', target: 1, type: 'treasureJackpot', reward: { kwacha: 500, gems: 5 }, xp: 100, image: 'crown', cta: 'minigames', ctaLabel: 'Go to Games' },
  { id: 'd_marathon', name: 'Game Marathon', desc: 'Play 6 different games', difficulty: 'hard', target: 6, type: 'uniqueGames', reward: { kwacha: 400, gems: 10 }, xp: 120, image: 'trophy', cta: 'minigames', ctaLabel: 'Go to Games' },

  { id: 'd_trivia1', name: 'Quiz Time', desc: 'Play 1 trivia game', difficulty: 'easy', target: 1, type: 'triviaPlay', reward: { kwacha: 50 }, xp: 25, image: 'classicQuiz', cta: 'minigames', ctaLabel: 'Go to Games' },
  { id: 'd_trivia10', name: 'Trivia Buff', desc: 'Answer 10 questions correctly', difficulty: 'medium', target: 10, type: 'triviaCorrect', reward: { kwacha: 175 }, xp: 50, image: 'classicQuiz', cta: 'minigames', ctaLabel: 'Go to Games' },
  { id: 'd_speed12', name: 'Speed Demon', desc: 'Score 12+ in Speed Round', difficulty: 'medium', target: 12, type: 'speedScore', reward: { kwacha: 200 }, xp: 60, image: 'speedRound', cta: 'minigames', ctaLabel: 'Go to Games' },
  { id: 'd_tstreak5', name: 'Trivia Streak', desc: 'Reach streak of 5 in Streak Trivia', difficulty: 'hard', target: 5, type: 'triviaStreak', reward: { kwacha: 400, gems: 5 }, xp: 100, image: 'streakTrivia', cta: 'minigames', ctaLabel: 'Go to Games' },
];

// Weekly missions (5, reset every Monday)
const WEEKLY_MISSIONS = [
  { id: 'w_warrior', name: 'Weekly Warrior', desc: 'Complete 20 daily missions this week', difficulty: 'medium', target: 20, type: 'dailyMissionsDone', reward: { kwacha: 500, gems: 10 }, xp: 100, image: 'medal', cta: 'missions', ctaLabel: 'View Missions' },
  { id: 'w_spender', name: 'Big Spender', desc: 'Spend 500 Coins in the store', difficulty: 'medium', target: 500, type: 'coinsSpent', reward: { kwacha: 300, gems: 5 }, xp: 75, image: 'shoppingBags', cta: 'store', ctaLabel: 'Go to Store' },
  { id: 'w_wins10', name: 'Winning Week', desc: 'Win 10 bets this week', difficulty: 'hard', target: 10, type: 'weeklyWins', reward: { kwacha: 600, gems: 15 }, xp: 150, image: 'winTrophy', cta: 'predict', ctaLabel: 'Go to Predict' },
  { id: 'w_explorer', name: 'Game Explorer', desc: 'Play all 9 minigames this week', difficulty: 'hard', target: 9, type: 'uniqueGamesWeekly', reward: { kwacha: 500, gems: 12 }, xp: 120, image: 'trophy', cta: 'minigames', ctaLabel: 'Go to Games' },
  { id: 'w_xp500', name: 'XP Grinder', desc: 'Earn 500 XP this week', difficulty: 'hard', target: 500, type: 'weeklyXP', reward: { kwacha: 400, gems: 10 }, xp: 100, image: 'crown', cta: 'overview', ctaLabel: 'View Progress' },
  { id: 'w_trivia50', name: 'Trivia Master', desc: 'Answer 50 questions correctly this week', difficulty: 'hard', target: 50, type: 'weeklyTriviaCorrect', reward: { kwacha: 500, gems: 12 }, xp: 120, image: 'classicQuiz', cta: 'minigames', ctaLabel: 'Go to Games' },
];

// Permanent missions (always available, one-time completion)
const PERMANENT_MISSIONS = [
  { id: 'retail', name: 'Retail Therapy', desc: 'Make a purchase in the store', difficulty: 'easy', target: 1, type: 'storePurchase', reward: { kwacha: 1000 }, xp: 1000, image: 'shoppingBags', cta: 'store', ctaLabel: 'Go to Store', tips: ['Browse the store for free spins, bets, and merch', 'Spending coins here also counts toward Weekly missions'] },
  { id: 'deposit', name: 'Time to Deposit!', desc: 'Make a deposit', difficulty: 'easy', target: 1, type: 'deposits', reward: { kwacha: 100, gems: 5 }, xp: 50, image: 'creditCards', hot: true, cta: 'overview', ctaLabel: 'Deposit Now', tips: ['Any deposit amount counts', 'Higher deposits unlock VIP tiers'] },
  { id: 'firstBet', name: 'Place Your Bet', desc: 'Place your first bet', difficulty: 'easy', target: 1, type: 'bets', reward: { kwacha: 30 }, xp: 15, image: 'betMission', cta: 'predict', ctaLabel: 'Go to Predict', tips: ['Pick any match to bet on', 'Featured matches pay more XP'] },
  { id: 'bet10', name: 'Regular Player', desc: 'Place 10 bets', difficulty: 'medium', target: 10, type: 'bets', reward: { kwacha: 75 }, xp: 40, image: 'betMission', cta: 'predict', ctaLabel: 'Go to Predict', tips: ['Bet on multiple matches', 'Each bet earns XP too'] },
  { id: 'win5', name: 'Winner Winner!', desc: 'Win 5 bets', difficulty: 'hard', target: 5, type: 'wins', reward: { kwacha: 150, gems: 10 }, xp: 60, image: 'winTrophy', hot: true, cta: 'predict', ctaLabel: 'Go to Predict', tips: ['Research teams before betting', 'Featured matches have higher payouts'] },
  { id: 'spinWheel', name: 'Lucky Spinner', desc: 'Spin the wheel 3 times', difficulty: 'easy', target: 3, type: 'wheelSpins', reward: { kwacha: 50 }, xp: 30, image: 'wheel', cta: 'minigames', ctaLabel: 'Go to Games', tips: ['You get 3 free spins daily', 'Extra spins cost 50 Coins'] },
];

// Seeded random: picks 8 daily missions based on date (2 easy, 3 medium, 3 hard)
const getDailyMissions = () => {
  const today = new Date();
  const seed = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
  const seededRandom = (s) => { let x = Math.sin(s) * 10000; return x - Math.floor(x); };
  
  const easy = DAILY_MISSION_POOL.filter(m => m.difficulty === 'easy');
  const medium = DAILY_MISSION_POOL.filter(m => m.difficulty === 'medium');
  const hard = DAILY_MISSION_POOL.filter(m => m.difficulty === 'hard');
  
  const pick = (arr, count, offset) => {
    const shuffled = [...arr].sort((a, b) => seededRandom(seed + offset + arr.indexOf(a)) - seededRandom(seed + offset + arr.indexOf(b)));
    return shuffled.slice(0, count);
  };
  
  return [...pick(easy, 2, 1), ...pick(medium, 3, 100), ...pick(hard, 3, 200)];
};

const DIFFICULTY_CONFIG = {
  easy: { label: 'Easy', color: 'bg-green-500', textColor: 'text-green-400', borderColor: 'border-green-500/30' },
  medium: { label: 'Medium', color: 'bg-yellow-500', textColor: 'text-yellow-400', borderColor: 'border-yellow-500/30' },
  hard: { label: 'Hard', color: 'bg-red-500', textColor: 'text-red-400', borderColor: 'border-red-500/30' },
};

// Keep MISSIONS as alias for backward compatibility with overview
const MISSIONS = PERMANENT_MISSIONS;


const MINIGAMES = [
  { id: 'wheel', name: 'Wheel of Fortune', desc: 'Spin to win amazing prizes!', free: 3, cost: 50, image: 'wheel' },
  { id: 'scratch', name: 'Scratch & Win', desc: 'Scratch to reveal prizes!', free: 5, cost: 25, image: 'scratchCard' },
  { id: 'dice', name: 'Lucky Dice', desc: 'Roll the dice for rewards!', free: 5, cost: 20, image: 'dice' },
  { id: 'memory', name: 'Memory Match', desc: 'Match pairs to win!', free: 3, cost: 30, image: 'memoryCards' },
  { id: 'highlow', name: 'Higher or Lower', desc: 'Guess the next card!', free: 5, cost: 15, image: 'playingCards' },
  { id: 'plinko', name: 'Plinko Drop', desc: 'Drop the ball for big prizes!', free: 5, cost: 25, image: 'plinko', isNew: true },
  { id: 'tapfrenzy', name: 'Tap Frenzy', desc: 'Tap targets in 10 seconds!', free: 5, cost: 20, image: 'target', isNew: true },
  { id: 'stopclock', name: 'Stop the Clock', desc: 'Stop at the right moment!', free: 5, cost: 20, image: 'brainQuiz', isNew: true },
  { id: 'treasure', name: 'Treasure Hunt', desc: 'Find prizes, avoid traps!', free: 3, cost: 30, image: 'treasureChest', isNew: true },
  { id: 'mines', name: 'Mines', desc: 'Find gems, avoid mines — cash out anytime!', free: 5, cost: 25, image: 'mines', isNew: true },
];

const STORE_ITEMS = [
  { id: 'viking', name: '75 Free Spins - Vikings', desc: 'Vikings Go to Hell slot', price: { kwacha: 500 }, image: 'vikingSpins', featured: true },
  { id: 'spins50', name: '50 Free Spins', desc: 'Any slot game', price: { kwacha: 300 }, image: 'slotMachine' },
  { id: 'freeBet20', name: 'K20 Free Bet', desc: 'No wagering required', price: { kwacha: 200 }, image: 'freeBets' },
  { id: 'mystery', name: 'Mystery Box', desc: 'Random premium reward!', price: { kwacha: 400, gems: 10 }, image: 'mysteryBox', isNew: true },
  { id: 'hoodie', name: '100xBet Hoodie', desc: 'Limited edition', price: { kwacha: 1200, gems: 30 }, image: 'hoodie1', featured: true },
];

const MATCHES = [
  // Premier League
  { id: 'm1', league: 'Premier League', leagueShort: 'EPL', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', home: 'Manchester City', away: 'Liverpool', homeShort: 'MCI', awayShort: 'LIV', h: 1.85, d: 3.60, a: 4.20, time: 'Today 20:00', status: 'today', reward: 50 },
  { id: 'm2', league: 'Premier League', leagueShort: 'EPL', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', home: 'Arsenal', away: 'Chelsea', homeShort: 'ARS', awayShort: 'CHE', h: 1.72, d: 3.80, a: 4.50, time: 'Today 17:30', status: 'today', reward: 50 },
  { id: 'm3', league: 'Premier League', leagueShort: 'EPL', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', home: 'Tottenham', away: 'Manchester Utd', homeShort: 'TOT', awayShort: 'MUN', h: 2.20, d: 3.40, a: 3.10, time: 'Tomorrow 15:00', status: 'upcoming', reward: 50 },
  // La Liga
  { id: 'm4', league: 'La Liga', leagueShort: 'LaLiga', flag: '🇪🇸', home: 'Real Madrid', away: 'Barcelona', homeShort: 'RMA', awayShort: 'BAR', h: 2.10, d: 3.40, a: 3.50, time: 'Tomorrow 21:00', status: 'upcoming', reward: 75, featured: true },
  { id: 'm5', league: 'La Liga', leagueShort: 'LaLiga', flag: '🇪🇸', home: 'Atletico Madrid', away: 'Sevilla', homeShort: 'ATM', awayShort: 'SEV', h: 1.65, d: 3.90, a: 5.00, time: 'Sat 18:00', status: 'upcoming', reward: 50 },
  { id: 'm6', league: 'La Liga', leagueShort: 'LaLiga', flag: '🇪🇸', home: 'Real Sociedad', away: 'Villarreal', homeShort: 'RSO', awayShort: 'VIL', h: 2.30, d: 3.20, a: 3.10, time: 'Sat 20:30', status: 'upcoming', reward: 50 },
  // Champions League
  { id: 'm7', league: 'Champions League', leagueShort: 'UCL', flag: '🏆', home: 'Bayern Munich', away: 'PSG', homeShort: 'BAY', awayShort: 'PSG', h: 1.95, d: 3.70, a: 3.80, time: 'Wed 21:00', status: 'upcoming', reward: 100, featured: true },
  { id: 'm8', league: 'Champions League', leagueShort: 'UCL', flag: '🏆', home: 'Inter Milan', away: 'Man City', homeShort: 'INT', awayShort: 'MCI', h: 2.80, d: 3.30, a: 2.50, time: 'Wed 21:00', status: 'upcoming', reward: 100, featured: true },
  { id: 'm9', league: 'Champions League', leagueShort: 'UCL', flag: '🏆', home: 'Real Madrid', away: 'Dortmund', homeShort: 'RMA', awayShort: 'BVB', h: 1.55, d: 4.20, a: 5.50, time: 'Thu 21:00', status: 'upcoming', reward: 100 },
  // Serie A
  { id: 'm10', league: 'Serie A', leagueShort: 'Serie A', flag: '🇮🇹', home: 'AC Milan', away: 'Juventus', homeShort: 'MIL', awayShort: 'JUV', h: 2.40, d: 3.10, a: 3.00, time: 'Sun 20:45', status: 'upcoming', reward: 60 },
  { id: 'm11', league: 'Serie A', leagueShort: 'Serie A', flag: '🇮🇹', home: 'Napoli', away: 'Roma', homeShort: 'NAP', awayShort: 'ROM', h: 1.80, d: 3.60, a: 4.30, time: 'Sun 18:00', status: 'upcoming', reward: 60 },
  { id: 'm12', league: 'Serie A', leagueShort: 'Serie A', flag: '🇮🇹', home: 'Inter Milan', away: 'Atalanta', homeShort: 'INT', awayShort: 'ATA', h: 1.90, d: 3.50, a: 3.90, time: 'Mon 20:45', status: 'upcoming', reward: 60 },
  // Bundesliga
  { id: 'm13', league: 'Bundesliga', leagueShort: 'BuLi', flag: '🇩🇪', home: 'Bayern Munich', away: 'Dortmund', homeShort: 'BAY', awayShort: 'BVB', h: 1.50, d: 4.50, a: 5.80, time: 'Sat 18:30', status: 'upcoming', reward: 75, featured: true },
  { id: 'm14', league: 'Bundesliga', leagueShort: 'BuLi', flag: '🇩🇪', home: 'RB Leipzig', away: 'Leverkusen', homeShort: 'RBL', awayShort: 'LEV', h: 2.60, d: 3.40, a: 2.70, time: 'Sun 15:30', status: 'upcoming', reward: 60 },
  { id: 'm15', league: 'Bundesliga', leagueShort: 'BuLi', flag: '🇩🇪', home: 'Freiburg', away: 'Stuttgart', homeShort: 'FRE', awayShort: 'STU', h: 2.35, d: 3.30, a: 3.00, time: 'Sun 17:30', status: 'upcoming', reward: 50 },
];

// ============================================================================
// QUESTS — Multi-step adventures
// ============================================================================
const QUESTS = [
  {
    id: 'welcome',
    name: 'Welcome Journey',
    desc: 'Complete your first steps and earn big rewards!',
    image: 'treasureChest',
    difficulty: 'easy',
    diffColor: 'text-green-400 bg-green-500/15 border-green-500/30',
    reward: { kwacha: 500, gems: 50 },
    xp: 250,
    steps: [
      { id: 'w_s1', action: 'deposit', target: 1, desc: 'Make your first deposit', icon: '💰', go: { tab: 'overview', label: 'Deposit' } },
      { id: 'w_s2', action: 'betPlaced', target: 1, desc: 'Place your first prediction', icon: '🎯', go: { tab: 'predictions', label: 'Predict' } },
      { id: 'w_s3', action: 'wheelSpun', target: 1, desc: 'Spin the Wheel of Fortune', icon: '🎡', go: { tab: 'minigames', game: 'wheel', label: 'Play' } },
      { id: 'w_s4', action: 'missionCompleted', target: 1, desc: 'Complete any mission', icon: '✅', go: { tab: 'missions', label: 'Missions' } },
    ],
  },
  {
    id: 'explorer',
    name: 'Game Explorer',
    desc: 'Try all the minigames available!',
    image: 'questMap',
    difficulty: 'medium',
    diffColor: 'text-yellow-400 bg-yellow-500/15 border-yellow-500/30',
    reward: { kwacha: 300, gems: 30 },
    xp: 200,
    steps: [
      { id: 'e_s1', action: 'gamePlayed', gameId: 'wheel', target: 1, desc: 'Play Wheel of Fortune', icon: '🎡', go: { tab: 'minigames', game: 'wheel', label: 'Play' } },
      { id: 'e_s2', action: 'gamePlayed', gameId: 'scratch', target: 1, desc: 'Play Scratch & Win', icon: '🎫', go: { tab: 'minigames', game: 'scratch', label: 'Play' } },
      { id: 'e_s3', action: 'gamePlayed', gameId: 'dice', target: 1, desc: 'Play Lucky Dice', icon: '🎲', go: { tab: 'minigames', game: 'dice', label: 'Play' } },
      { id: 'e_s4', action: 'gamePlayed', gameId: 'memory', target: 1, desc: 'Play Memory Match', icon: '🃏', go: { tab: 'minigames', game: 'memory', label: 'Play' } },
    ],
  },
];

const DAILY_REWARDS = [
  { day: 1, kwacha: 10 },
  { day: 2, kwacha: 25 },
  { day: 3, kwacha: 50 },
  { day: 4, kwacha: 75, gems: 5 },
  { day: 5, kwacha: 100, gems: 10 },
  { day: 6, kwacha: 150, gems: 15 },
  { day: 7, kwacha: 250, gems: 25, diamonds: 1 },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
const getLevel = (xp) => XP_LEVELS.reduce((curr, lvl) => xp >= lvl.xp ? lvl : curr, XP_LEVELS[0]);
const getNextLevel = (xp) => XP_LEVELS.find(l => l.xp > xp) || null;
const getXPProgress = (xp) => {
  const curr = getLevel(xp);
  const next = getNextLevel(xp);
  if (!next) return 100;
  return ((xp - curr.xp) / (next.xp - curr.xp)) * 100;
};
const getVIP = (deposits) => VIP_TIERS.reduce((curr, tier) => deposits >= tier.min ? tier : curr, VIP_TIERS[0]);

// ============================================================================
// TUTORIAL MODAL COMPONENT
// ============================================================================
function TutorialModal({ tutorialKey, onClose, closing }) {
  const tutorial = TUTORIALS[tutorialKey];
  const [step, setStep] = useState(0);
  
  if (!tutorial) return null;
  
  return (
    <div className={`fixed inset-0 bg-black/90 flex items-center justify-center z-[80] p-4 ${closing ? 'anim-backdrop-close' : 'anim-fade-in'}`} onClick={onClose}>
      <div className={`bg-gradient-to-b from-[#0a1520] to-[#030810] rounded-3xl max-w-lg w-full overflow-hidden border-0 shadow-2xl shadow-cyan-900/50 max-h-[90vh] overflow-y-auto ${closing ? 'anim-modal-close' : 'anim-scale-in'}`} onClick={(e) => e.stopPropagation()}>
        {/* Header Image */}
        <div className="relative h-44">
          <img src={IMAGES[tutorial.image]} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a1520] via-transparent to-transparent" />
          <button 
            type="button" 
            onClick={onClose} 
            className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="absolute bottom-4 left-6">
            <h2 className="text-2xl font-black">{tutorial.title}</h2>
            <p className="text-gray-300">{tutorial.subtitle}</p>
          </div>
        </div>
        
        <div className="p-6">
          {/* Step Indicators */}
          <div className="flex justify-center gap-2 mb-6">
            {tutorial.steps.map((_, i) => (
              <button 
                key={i} 
                type="button" 
                onClick={() => setStep(i)} 
                className={`h-2 rounded-full transition-all ${step === i ? 'w-8 bg-cyan-500' : 'w-2 bg-gray-600 hover:bg-gray-500'}`} 
              />
            ))}
          </div>
          
          {/* Step Content */}
          <div className="match-card p-5 mb-6 min-h-[120px]">
            <div className="text-4xl mb-3">{tutorial.steps[step].icon}</div>
            <h3 className="font-bold text-lg mb-2">{tutorial.steps[step].title}</h3>
            <p className="text-gray-300">{tutorial.steps[step].desc}</p>
          </div>
          
          {/* Navigation Buttons */}
          <div className="flex gap-3 mb-6">
            <button 
              type="button" 
              onClick={() => setStep(s => Math.max(0, s - 1))} 
              disabled={step === 0} 
              className={`flex-1 py-3 rounded-xl font-bold transition-all ${step === 0 ? 'bg-gray-800/40 border border-gray-600/20 opacity-50' : 'bg-black/40 hover:bg-cyan-900/30 border border-white/10'}`}
            >
              ← Back
            </button>
            {step < tutorial.steps.length - 1 ? (
              <button 
                type="button" 
                onClick={() => setStep(s => s + 1)} 
                className="flex-1 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 rounded-xl font-bold"
              >
                Next →
              </button>
            ) : (
              <button 
                type="button" 
                onClick={onClose} 
                className="flex-1 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-xl font-bold flex items-center justify-center gap-2"
              >
                <Play className="w-5 h-5" /> Got it!
              </button>
            )}
          </div>
          
          {/* Prizes */}
          <div className="mb-4">
            <h4 className="text-sm font-bold text-yellow-400 mb-2">🏆 Possible Prizes</h4>
            <div className="flex flex-wrap gap-2">
              {tutorial.prizes.map((p, i) => (
                <span key={i} className="px-3 py-1 bg-yellow-500/20 rounded-lg text-sm text-yellow-200">{p}</span>
              ))}
            </div>
          </div>
          
          {/* Tips */}
          <div className="bg-cyan-500/10 rounded-xl p-4 border-0">
            <h4 className="text-sm font-bold text-cyan-400 mb-2">💡 Pro Tips</h4>
            {tutorial.tips.map((t, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-gray-300 mb-1">
                <Check className="w-4 h-4 text-green-400 flex-shrink-0" />
                <span>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}


// ============================================================================
// MISSION DETAIL MODAL
// ============================================================================
function MissionDetailModal({ mission, progress, done, onClose, onNavigate, closing }) {
  const diff = DIFFICULTY_CONFIG[mission.difficulty];
  
  return (
    <div className={`fixed inset-0 bg-black/90 flex items-center justify-center z-[80] p-4 ${closing ? 'anim-backdrop-close' : 'anim-fade-in'}`} onClick={onClose}>
      <div className={`bg-gradient-to-b from-[#0a1520] to-[#030810] rounded-3xl max-w-md w-full overflow-hidden border-0 shadow-2xl shadow-cyan-900/50 max-h-[90vh] overflow-y-auto ${closing ? 'anim-modal-close' : 'anim-scale-in'}`} onClick={(e) => e.stopPropagation()}>
        {/* Header Image */}
        <div className="relative h-44 overflow-hidden">
          <img src={IMAGES[mission.image]} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a1520] via-transparent to-transparent" />
          
          {/* Difficulty ribbon - top right corner */}
          <div className={`absolute top-0 right-6 ${diff.color} px-3 py-1.5 rounded-b-lg font-bold text-sm shadow-lg`}>
            {diff.label}
          </div>
          
          {/* HOT badge */}
          {mission.hot && !done && (
            <span className="absolute top-3 left-3 px-2 py-1 bg-red-500 rounded-lg text-sm font-bold shadow-lg">
              🔥 HOT
            </span>
          )}
          
          {/* Done overlay */}
          {done && (
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <img src={`${IMG_BASE}/green_bubble.jpg`} alt="" className="w-28 h-28 object-cover rounded-full anim-check-pop" style={{ mixBlendMode: "screen" }} />
            </div>
          )}
          
          {/* Close button */}
          <button 
            type="button" 
            onClick={onClose} 
            className="absolute top-3 right-3 p-2 bg-black/50 hover:bg-black/70 rounded-full z-10 transition-all hover:rotate-90 duration-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6">
          {/* Title & Description */}
          <h2 className="text-2xl font-bold mb-1">{mission.name}</h2>
          <p className="text-gray-400 mb-4">{mission.desc}</p>
          
          {/* Progress */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-400">Progress</span>
              <span className={`text-sm font-bold ${done ? 'text-green-400' : 'text-cyan-300'}`}>
                {done ? '✅ Complete!' : `${Math.min(progress, mission.target)} / ${mission.target}`}
              </span>
            </div>
            <div className="h-3 bg-black/50 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${done ? 'bg-green-500' : 'bg-gradient-to-r from-cyan-400 to-blue-500'}`}
                style={{ width: `${Math.min(100, (progress / mission.target) * 100)}%` }}
              />
            </div>
          </div>
          
          {/* Rewards */}
          <div className="bg-black/60 rounded-xl p-4 border border-white/10 mb-4">
            <div className="text-sm text-gray-400 mb-2 font-semibold">Rewards</div>
            <div className="flex items-center gap-4 flex-wrap">
              {mission.reward.kwacha && (
                <div className="flex items-center gap-1.5">
                  <span className="text-lg">🪙</span>
                  <span className="text-yellow-400 font-bold text-lg">{mission.reward.kwacha}</span>
                  <span className="text-gray-500 text-sm">Coins</span>
                </div>
              )}
              {mission.reward.gems && (
                <div className="flex items-center gap-1.5">
                  <span className="text-lg">💚</span>
                  <span className="text-green-400 font-bold text-lg">{mission.reward.gems}</span>
                  <span className="text-gray-500 text-sm">Gems</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <span className="text-lg">⚡</span>
                <span className="text-cyan-400 font-bold text-lg">{mission.xp}</span>
                <span className="text-gray-500 text-sm">XP</span>
              </div>
            </div>
          </div>
          
          {/* Tips */}
          {mission.tips && mission.tips.length > 0 && (
            <div className="bg-black/60 rounded-xl p-4 border border-white/10 mb-4">
              <div className="text-sm text-gray-400 mb-2 font-semibold">💡 Tips</div>
              <div className="space-y-1.5">
                {mission.tips.map((tip, i) => (
                  <div key={i} className="text-sm text-gray-300 flex items-start gap-2">
                    <span className="text-cyan-400 mt-0.5">•</span>
                    <span>{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* CTA Button */}
          {!done && mission.cta && (
            <button 
              type="button" 
              onClick={() => { onNavigate(mission.cta); onClose(); }}
              className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 rounded-xl font-bold text-lg transition-all hover:scale-[1.02] active:scale-95 shadow-lg shadow-cyan-500/30 flex items-center justify-center gap-2"
            >
              {mission.ctaLabel || 'Go'} <ChevronRight className="w-5 h-5" />
            </button>
          )}
          
          {done && (
            <div className="text-center py-3 text-green-400 font-bold text-lg">
              ✅ Mission Complete!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


// ============================================================================
// WHEEL GAME COMPONENT - Premium Edition
// ============================================================================
function WheelGame({ onClose, onWin, playsLeft, closing }) {
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
    <div className={`fixed inset-0 bg-black/95 flex items-center justify-center z-[70] p-4 ${closing ? "anim-backdrop-close" : "anim-fade-in"}`} onClick={onClose}>
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
      
      <div className={`bg-gradient-to-b from-[#0a1520] to-[#030810] rounded-3xl max-w-md w-full p-6 border-0 shadow-2xl shadow-cyan-900/50 ${closing ? "anim-modal-close" : "anim-scale-in"}`} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button type="button" onClick={() => setShowTutorial(true)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <HelpCircle className="w-6 h-6 text-cyan-400" />
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
            style={{ animation: 'resultZoom 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both' }}
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

// ============================================================================
// SCRATCH GAME COMPONENT — Lottery-style 3-zone with gold foil
// ============================================================================
function ScratchGame({ onClose, onWin, closing }) {
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

// ============================================================================
// DICE GAME COMPONENT
// ============================================================================
function DiceGame({ onClose, onWin, closing }) {
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

  const DiceFace = ({ value, color = 'red' }) => {
    const dots = {
      1: [[50,50]],
      2: [[25,25],[75,75]],
      3: [[25,25],[50,50],[75,75]],
      4: [[25,25],[75,25],[25,75],[75,75]],
      5: [[25,25],[75,25],[50,50],[25,75],[75,75]],
      6: [[25,25],[75,25],[25,50],[75,50],[25,75],[75,75]]
    };
    
    return (
      <div 
        className={`w-24 h-24 rounded-2xl shadow-2xl transition-transform duration-200 ${rolling ? '' : 'hover:scale-105'}`} 
        style={{ 
          background: color === 'red' ? 'linear-gradient(135deg, #ef4444, #dc2626)' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
          animation: rolling ? 'diceRollSpin 0.6s ease infinite' : (result && !rolling ? 'diceLand 0.4s ease-out both' : 'none'),
          boxShadow: `0 8px 24px ${color === 'red' ? 'rgba(239,68,68,0.3)' : 'rgba(59,130,246,0.3)'}`,
        }}
      >
        <svg viewBox="0 0 100 100" className="w-full h-full p-2">
          {dots[value]?.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="12" fill="white" className="drop-shadow-md" />
          ))}
        </svg>
      </div>
    );
  };

  return (
    <div className={`fixed inset-0 bg-black/95 flex items-center justify-center z-[70] p-4 ${closing ? "anim-backdrop-close" : "anim-fade-in"}`} onClick={onClose}>
      {showTutorial && <TutorialModal tutorialKey="dice" onClose={() => setShowTutorial(false)} />}
      
      <div className={`bg-gradient-to-b from-[#0a1520] to-[#030810] rounded-3xl max-w-md w-full p-6 border-0 ${closing ? "anim-modal-close" : "anim-scale-in"}`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <button type="button" onClick={() => setShowTutorial(true)} className="p-2 hover:bg-white/10 rounded-full">
            <HelpCircle className="w-6 h-6 text-cyan-400" />
          </button>
          <h2 className="text-2xl font-bold">🎲 Lucky Dice</h2>
          <button type="button" onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <p className="text-center text-gray-400 mb-6">Guess the total (2-12) and win big!</p>
        
        <div className="flex justify-center gap-8 mb-8 py-4">
          <DiceFace value={dice1} color="red" />
          <DiceFace value={dice2} color="blue" />
        </div>
        
        {!result && (
          <>
            <p className="text-center text-sm text-gray-400 mb-3">Select your guess:</p>
            <div className="grid grid-cols-6 gap-2 mb-6">
              {[2,3,4,5,6,7,8,9,10,11,12].map(n => (
                <button 
                  key={n} 
                  type="button" 
                  onClick={() => setGuess(n)} 
                  disabled={rolling} 
                  className={`py-3 rounded-xl font-bold text-lg transition-all ${guess === n ? 'bg-gradient-to-br from-cyan-400 to-blue-500 scale-110 shadow-lg shadow-cyan-500/50' : 'bg-black/40 hover:bg-cyan-900/30 border border-white/10 hover:scale-105'}`}
                >
                  {n}
                </button>
              ))}
            </div>
            <button 
              type="button" 
              onClick={roll} 
              disabled={rolling || guess === null} 
              className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${rolling || guess === null ? 'bg-gray-600' : 'bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 shadow-lg shadow-red-500/30'}`}
            >
              {rolling ? '🎲 Rolling...' : '🎲 Roll Dice!'}
            </button>
          </>
        )}
        
        {result && (
          <div className="text-center" style={{ animation: 'resultZoom 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both' }}>
            <div className="text-6xl mb-4" style={{ animation: result.won ? 'symbolPop 0.5s ease both, float 2s ease-in-out 0.5s infinite' : 'symbolPop 0.4s ease both' }}>{result.won ? '🎯' : result.close ? '👍' : '😢'}</div>
            <p className="text-xl mb-2">
              Total: <span className="text-4xl text-yellow-400 font-black">{result.total}</span>
            </p>
            <p className={`text-2xl font-bold mb-6 ${result.won ? 'text-green-400' : result.close ? 'text-yellow-400' : 'text-gray-400'}`} style={{ animation: result.won ? 'correctPop 0.5s ease both' : result.prize === 0 ? 'wrongShake 0.5s ease both' : 'none' }}>
              {result.won ? `🎉 EXACT! +${result.prize} Coins!` : result.close ? `Close! +${result.prize} Coins` : 'Better luck next time!'}
            </p>
            <button 
              type="button" 
              onClick={() => { setResult(null); setGuess(null); }} 
              className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 rounded-xl font-bold text-lg"
            >
              Play Again 🎲
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MEMORY GAME COMPONENT
// ============================================================================
function MemoryGame({ onClose, onWin, closing }) {
  const symbols = ['🎁', '💎', '⭐', '🏆', '👑', '🎰', '🍀', '💰'];
  const [cards, setCards] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [matched, setMatched] = useState([]);
  const [moves, setMoves] = useState(0);
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    setCards([...symbols, ...symbols]
      .sort(() => Math.random() - 0.5)
      .map((s, i) => ({ id: i, symbol: s })));
  }, []);

  const flip = (id) => {
    if (flipped.length === 2 || flipped.includes(id) || matched.includes(id)) return;
    
    const newFlipped = [...flipped, id];
    setFlipped(newFlipped);
    
    if (newFlipped.length === 2) {
      setMoves(m => m + 1);
      const [a, b] = newFlipped;
      
      if (cards[a].symbol === cards[b].symbol) {
        const newMatched = [...matched, a, b];
        setMatched(newMatched);
        setFlipped([]);
        
        if (newMatched.length === cards.length) {
          const prize = Math.max(300 - moves * 10, 50);
          setTimeout(() => onWin(prize, { moves: moves + 1 }), 300);
        }
      } else {
        setTimeout(() => setFlipped([]), 800);
      }
    }
  };

  const complete = matched.length === cards.length;
  const prize = Math.max(300 - moves * 10, 50);

  return (
    <div className={`fixed inset-0 bg-black/95 flex items-center justify-center z-[70] p-4 ${closing ? "anim-backdrop-close" : "anim-fade-in"}`} onClick={onClose}>
      {showTutorial && <TutorialModal tutorialKey="memory" onClose={() => setShowTutorial(false)} />}
      
      <div className={`bg-gradient-to-b from-[#0a1520] to-[#030810] rounded-3xl max-w-md w-full p-6 border-0 ${closing ? "anim-modal-close" : "anim-scale-in"}`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <button type="button" onClick={() => setShowTutorial(true)} className="p-2 hover:bg-white/10 rounded-full">
            <HelpCircle className="w-6 h-6 text-cyan-400" />
          </button>
          <h2 className="text-2xl font-bold">🧠 Memory Match</h2>
          <button type="button" onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="flex justify-center gap-6 mb-4">
          <div className="text-center px-4 py-2 bg-black/50 rounded-xl border border-white/10">
            <div className="text-xl font-bold text-yellow-400">{moves}</div>
            <div className="text-xs text-gray-400">Moves</div>
          </div>
          <div className="text-center px-4 py-2 bg-black/50 rounded-xl border border-white/10">
            <div className="text-xl font-bold text-green-400">{matched.length/2}/{symbols.length}</div>
            <div className="text-xs text-gray-400">Pairs</div>
          </div>
          <div className="text-center px-4 py-2 bg-black/50 rounded-xl border border-white/10">
            <div className="text-xl font-bold text-cyan-400">{prize}</div>
            <div className="text-xs text-gray-400">Prize</div>
          </div>
        </div>
        
        <div className="grid grid-cols-4 gap-3 mb-4">
          {cards.map(card => {
            const isFlipped = flipped.includes(card.id) || matched.includes(card.id);
            const isMatched = matched.includes(card.id);
            
            return (
              <button 
                key={card.id} 
                type="button" 
                onClick={() => flip(card.id)} 
                disabled={isFlipped} 
                className={`aspect-square rounded-xl text-3xl flex items-center justify-center font-bold ${isFlipped ? (isMatched ? 'bg-green-500/30 border-2 border-green-400' : 'bg-gradient-to-br from-yellow-400 to-orange-500') : 'bg-gradient-to-br from-cyan-500 to-blue-500 hover:scale-105 hover:shadow-lg hover:shadow-cyan-500/50'}`}
                style={{ 
                  animation: isMatched ? 'correctPop 0.4s ease both' : isFlipped ? 'cardFlipIn 0.3s ease both' : 'none',
                  transition: 'all 0.2s ease',
                }}
              >
                {isFlipped ? card.symbol : '?'}
              </button>
            );
          })}
        </div>
        
        {complete && (
          <div className="text-center p-4 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-xl border border-green-500/50" style={{ animation: 'resultZoom 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both' }}>
            <div className="text-5xl mb-2" style={{ animation: 'symbolPop 0.5s ease both, float 2s ease-in-out 0.5s infinite' }}>🎉</div>
            <div className="text-2xl font-bold text-green-400 mb-1">Complete!</div>
            <p className="text-gray-300">Finished in {moves} moves</p>
            <p className="text-yellow-400 font-bold text-xl" style={{ animation: 'correctPop 0.4s ease 0.3s both' }}>+{prize} Coins</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// HIGHER OR LOWER GAME COMPONENT
// ============================================================================
function HighLowGame({ onClose, onWin, closing }) {
  const [current, setCurrent] = useState({ v: Math.floor(Math.random() * 13) + 1, s: '♠' });
  const [next, setNext] = useState(null);
  const [revealing, setRevealing] = useState(false);
  const [streak, setStreak] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  
  const suits = ['♠', '♥', '♦', '♣'];
  const display = (v) => v === 1 ? 'A' : v === 11 ? 'J' : v === 12 ? 'Q' : v === 13 ? 'K' : v;
  const isRed = (s) => s === '♥' || s === '♦';

  const guess = (higher) => {
    if (revealing) return;
    setRevealing(true);
    
    const newV = Math.floor(Math.random() * 13) + 1;
    const newS = suits[Math.floor(Math.random() * 4)];
    
    setTimeout(() => {
      setNext({ v: newV, s: newS });
      
      setTimeout(() => {
        const correct = higher ? newV >= current.v : newV <= current.v;
        
        if (correct) {
          setStreak(s => s + 1);
          setCurrent({ v: newV, s: newS });
          setNext(null);
          setRevealing(false);
        } else {
          setGameOver(true);
          if (streak > 0) onWin(streak * 25);
        }
      }, 600);
    }, 300);
  };

  const Card = ({ value, suit, faceDown, isRevealing }) => (
    <div className={`w-24 h-36 rounded-xl flex items-center justify-center shadow-2xl ${faceDown ? 'bg-gradient-to-br from-blue-800 to-blue-950' : `bg-white ${isRed(suit) ? 'text-red-600' : 'text-gray-900'}`}`}
      style={{ animation: isRevealing ? 'cardFlipIn 0.4s ease both' : 'none' }}>
      {faceDown ? (
        <span className="text-4xl">🎴</span>
      ) : (
        <div className="text-center">
          <div className="text-2xl font-bold">{display(value)}</div>
          <div className="text-4xl">{suit}</div>
        </div>
      )}
    </div>
  );

  return (
    <div className={`fixed inset-0 bg-black/95 flex items-center justify-center z-[70] p-4 ${closing ? "anim-backdrop-close" : "anim-fade-in"}`} onClick={onClose}>
      {showTutorial && <TutorialModal tutorialKey="highlow" onClose={() => setShowTutorial(false)} />}
      
      <div className={`bg-gradient-to-b from-[#0a1520] to-[#030810] rounded-3xl max-w-md w-full p-6 border-0 ${closing ? "anim-modal-close" : "anim-scale-in"}`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <button type="button" onClick={() => setShowTutorial(true)} className="p-2 hover:bg-white/10 rounded-full">
            <HelpCircle className="w-6 h-6 text-cyan-400" />
          </button>
          <h2 className="text-2xl font-bold">🃏 Higher or Lower</h2>
          <button type="button" onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="flex justify-center gap-4 mb-6">
          <div className="px-4 py-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-xl border border-yellow-500/30" style={{ animation: streak >= 3 ? 'streakFire 0.6s ease-in-out infinite' : 'none' }}>
            <span className="text-yellow-400 font-bold">🔥 Streak: {streak}</span>
          </div>
          <div className="px-4 py-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-xl border-2 border-green-500/40">
            <span className="text-green-400 font-bold">{streak * 25} Coins</span>
          </div>
        </div>
        
        <div className="flex justify-center items-center gap-6 mb-8">
          <div className="text-center">
            <p className="text-xs text-gray-400 mb-2">Current</p>
            <Card value={current.v} suit={current.s} />
          </div>
          <div className="text-3xl text-gray-500">→</div>
          <div className="text-center">
            <p className="text-xs text-gray-400 mb-2">Next</p>
            {next ? <Card value={next.v} suit={next.s} isRevealing={revealing} /> : <Card faceDown />}
          </div>
        </div>
        
        {!gameOver && !revealing && (
          <>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <button 
                type="button" 
                onClick={() => guess(false)} 
                className="py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 rounded-xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg shadow-blue-500/30"
              >
                <ChevronDown className="w-6 h-6" /> LOWER
              </button>
              <button 
                type="button" 
                onClick={() => guess(true)} 
                className="py-4 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 rounded-xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg shadow-red-500/30"
              >
                HIGHER <ChevronUp className="w-6 h-6" />
              </button>
            </div>
            {streak > 0 && (
              <button 
                type="button" 
                onClick={() => { onWin(streak * 25); onClose(); }} 
                className="w-full py-3 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-xl font-bold shadow-lg shadow-green-500/30"
              >
                💰 Cash Out ({streak * 25} Coins)
              </button>
            )}
          </>
        )}
        
        {revealing && !gameOver && (
          <p className="text-center text-xl text-cyan-400" style={{ animation: 'pulseGlow 1s ease-in-out infinite' }}>Revealing...</p>
        )}
        
        {gameOver && (
          <div className="text-center p-4 bg-red-500/20 rounded-xl border border-red-500/50" style={{ animation: 'resultZoom 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both' }}>
            <div className="text-5xl mb-2" style={{ animation: 'wrongShake 0.6s ease both' }}>💔</div>
            <div className="text-2xl font-bold text-red-400 mb-2">Game Over!</div>
            <p className="text-gray-300 mb-4">
              {streak > 0 ? `You won ${streak * 25} Coins!` : 'Better luck next time!'}
            </p>
            <button 
              type="button" 
              onClick={() => {
                setGameOver(false);
                setStreak(0);
                setNext(null);
                setRevealing(false);
                setCurrent({ v: Math.floor(Math.random() * 13) + 1, s: '♠' });
              }} 
              className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-xl font-bold"
            >
              Play Again 🃏
            </button>
          </div>
        )}
      </div>
    </div>
  );
}




// ============================================================================
// PLINKO DROP GAME — Premium: physics, risk, wagers, obstacles, moving pegs,
// bombs, auto-drop, progressive jackpot, drop slider
// ============================================================================
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
      {showTutorial && <TutorialModal tutorialKey="plinko" onClose={() => setShowTutorial(false)} />}
      
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

// TAP FRENZY GAME
// ============================================================================
function TapFrenzyGame({ onClose, onWin, closing }) {
  const [gameState, setGameState] = useState('ready'); // ready, playing, done
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [targets, setTargets] = useState([]);
  const [taps, setTaps] = useState([]);
  const [showTutorial, setShowTutorial] = useState(false);
  const timerRef = useRef(null);
  const targetRef = useRef(null);
  
  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setTimeLeft(10);
    setTaps([]);
    spawnTarget();
    
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          clearTimeout(targetRef.current);
          setGameState('done');
          setTargets([]);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };
  
  const spawnTarget = () => {
    const types = [
      { emoji: '🪙', points: 1, size: 48, color: '#fbbf24' },
      { emoji: '💎', points: 3, size: 40, color: '#a855f7' },
      { emoji: '⭐', points: 2, size: 44, color: '#3b82f6' },
      { emoji: '💚', points: 5, size: 36, color: '#22c55e' },
      { emoji: '💣', points: -3, size: 42, color: '#ef4444' },
    ];
    const weights = [40, 15, 25, 10, 10];
    const rand = Math.random() * 100;
    let sum = 0;
    let type = types[0];
    for (let i = 0; i < types.length; i++) {
      sum += weights[i];
      if (rand < sum) { type = types[i]; break; }
    }
    
    const target = {
      id: Date.now(),
      x: 10 + Math.random() * 75,
      y: 10 + Math.random() * 65,
      ...type,
    };
    setTargets([target]);
    
    targetRef.current = setTimeout(() => {
      setTargets(prev => prev.filter(t => t.id !== target.id));
      spawnTarget();
    }, 800 + Math.random() * 600);
  };
  
  const tapTarget = (target, e) => {
    e.stopPropagation();
    setScore(s => Math.max(0, s + target.points));
    setTaps(prev => [...prev.slice(-8), { id: Date.now(), x: target.x, y: target.y, points: target.points }]);
    setTargets(prev => prev.filter(t => t.id !== target.id));
    clearTimeout(targetRef.current);
    spawnTarget();
  };
  
  useEffect(() => {
    if (gameState === 'done') {
      const prize = score >= 30 ? 300 : score >= 20 ? 200 : score >= 10 ? 100 : score >= 5 ? 50 : 10;
      if (prize > 0) onWin(prize, { score });
    }
    return () => { clearInterval(timerRef.current); clearTimeout(targetRef.current); };
  }, [gameState]);

  const getPrize = () => score >= 30 ? 300 : score >= 20 ? 200 : score >= 10 ? 100 : score >= 5 ? 50 : 10;

  return (
    <div className={`fixed inset-0 bg-black/95 flex items-center justify-center z-[70] p-4 ${closing ? "anim-backdrop-close" : "anim-fade-in"}`} onClick={onClose}>
      {showTutorial && <TutorialModal tutorialKey="tapfrenzy" onClose={() => setShowTutorial(false)} />}
      
      <div className={`bg-gradient-to-b from-[#0a1520] to-[#030810] rounded-3xl max-w-md w-full p-6 border-0 ${closing ? "anim-modal-close" : "anim-scale-in"}`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <button type="button" onClick={() => setShowTutorial(true)} className="p-2 hover:bg-white/10 rounded-full">
            <HelpCircle className="w-6 h-6 text-cyan-400" />
          </button>
          <h2 className="text-2xl font-bold">⚡ Tap Frenzy</h2>
          <button type="button" onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* Score & Timer */}
        {gameState !== 'ready' && (
          <div className="flex justify-between items-center mb-4">
            <div className="text-xl font-bold">Score: <span className="text-yellow-400">{score}</span></div>
            <div className={`text-xl font-bold px-4 py-1 rounded-full ${timeLeft <= 3 ? 'bg-red-500/30 text-red-400 animate-pulse' : 'bg-cyan-500/20 text-cyan-300'}`}>
              ⏱️ {timeLeft}s
            </div>
          </div>
        )}
        
        {/* Game Area */}
        <div 
          className="relative rounded-2xl border-0 overflow-hidden"
          style={{ height: 350, background: 'radial-gradient(ellipse at center, #0a1520 0%, #050a15 100%)' }}
        >
          {gameState === 'ready' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-6xl mb-4">⚡</div>
              <p className="text-gray-400 text-center mb-2 px-4">Tap coins & gems as fast as you can! Avoid bombs 💣</p>
              <p className="text-sm text-gray-500 mb-6">You have 10 seconds</p>
              <button 
                type="button" 
                onClick={startGame}
                className="px-8 py-4 bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 rounded-xl font-bold text-lg shadow-lg shadow-orange-500/30 hover:scale-105 active:scale-95 transition-all"
              >
                ⚡ START!
              </button>
            </div>
          )}
          
          {gameState === 'playing' && (
            <>
              {/* Targets */}
              {targets.map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={(e) => tapTarget(t, e)}
                  className="absolute transition-transform duration-100 hover:scale-125 active:scale-75 anim-scale-in"
                  style={{
                    left: `${t.x}%`, top: `${t.y}%`,
                    fontSize: t.size,
                    filter: `drop-shadow(0 0 8px ${t.color})`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  {t.emoji}
                </button>
              ))}
              
              {/* Tap score popups */}
              {taps.map(tap => (
                <div
                  key={tap.id}
                  className="absolute font-black text-xl pointer-events-none"
                  style={{
                    left: `${tap.x}%`, top: `${tap.y - 5}%`,
                    color: tap.points > 0 ? '#22c55e' : '#ef4444',
                    animation: 'scorePopUp 0.7s ease-out forwards',
                    textShadow: tap.points > 0 ? '0 0 10px rgba(34,197,94,0.5)' : '0 0 10px rgba(239,68,68,0.5)',
                  }}
                >
                  {tap.points > 0 ? `+${tap.points}` : tap.points}
                </div>
              ))}
            </>
          )}
          
          {gameState === 'done' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ animation: 'resultZoom 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both' }}>
              <div className="text-6xl mb-3" style={{ animation: 'symbolPop 0.5s ease both, float 2s ease-in-out 0.5s infinite' }}>{score >= 20 ? '🏆' : score >= 10 ? '⭐' : '👏'}</div>
              <div className="text-4xl font-black text-yellow-400 mb-2">{score} Points</div>
              <div className="text-xl text-green-400 font-bold mb-6" style={{ animation: 'correctPop 0.4s ease 0.3s both' }}>+{getPrize()} Coins!</div>
              <button 
                type="button" 
                onClick={() => { setGameState('ready'); setScore(0); setTimeLeft(10); }}
                className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 rounded-xl font-bold"
              >
                Play Again ⚡
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// STOP THE CLOCK GAME
// ============================================================================
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

  return (
    <div className={`fixed inset-0 bg-black/95 flex items-center justify-center z-[70] p-4 ${closing ? "anim-backdrop-close" : "anim-fade-in"}`} onClick={onClose}>
      {showTutorial && <TutorialModal tutorialKey="stopclock" onClose={() => setShowTutorial(false)} />}
      
      <div className={`bg-gradient-to-b from-[#0a1520] to-[#030810] rounded-3xl max-w-md w-full p-6 border-0 ${closing ? "anim-modal-close" : "anim-scale-in"}`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <button type="button" onClick={() => setShowTutorial(true)} className="p-2 hover:bg-white/10 rounded-full">
            <HelpCircle className="w-6 h-6 text-cyan-400" />
          </button>
          <h2 className="text-2xl font-bold">⏱️ Stop the Clock</h2>
          <button type="button" onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* Target display */}
        {targetNum !== null && (
          <div className="text-center mb-4">
            <span className="text-gray-400">Target: </span>
            <span className="text-2xl font-black text-green-400">{String(targetNum).padStart(2, '0')}</span>
          </div>
        )}
        
        {/* Clock Display */}
        <div className="relative w-56 h-56 mx-auto mb-6">
          {/* Outer ring */}
          <svg viewBox="0 0 200 200" className="w-full h-full">
            <defs>
              <linearGradient id="clockGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#a855f7" />
                <stop offset="100%" stopColor="#ec4899" />
              </linearGradient>
            </defs>
            <circle cx="100" cy="100" r="96" fill="none" stroke="#231a40" strokeWidth="6" />
            <circle cx="100" cy="100" r="96" fill="none" stroke="url(#clockGrad)" strokeWidth="3" opacity="0.6" />
            
            {/* Tick marks */}
            {Array.from({ length: 20 }, (_, i) => {
              const a = (i * 18 - 90) * Math.PI / 180;
              const r1 = 86, r2 = 93;
              return (
                <line key={i}
                  x1={100 + r1 * Math.cos(a)} y1={100 + r1 * Math.sin(a)}
                  x2={100 + r2 * Math.cos(a)} y2={100 + r2 * Math.sin(a)}
                  stroke={i % 5 === 0 ? '#a855f7' : '#4b3a6e'} strokeWidth={i % 5 === 0 ? 2.5 : 1.5}
                />
              );
            })}
            
            {/* Target marker */}
            {targetNum !== null && (() => {
              const ta = ((targetNum / 100) * 360 - 90) * Math.PI / 180;
              return (
                <circle cx={100 + 82 * Math.cos(ta)} cy={100 + 82 * Math.sin(ta)} r="5" fill="#22c55e" opacity="0.8">
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
                  stroke="#fbbf24" strokeWidth="3" strokeLinecap="round"
                />
              );
            })()}
            
            {/* Center dot */}
            <circle cx="100" cy="100" r="8" fill="#0a1520" stroke="#fbbf24" strokeWidth="2" />
          </svg>
          
          {/* Number display */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className={`text-5xl font-black tabular-nums ${gameState === 'spinning' ? 'text-white' : stoppedNum !== null ? (getDiff() <= 5 ? 'text-green-400' : 'text-yellow-400') : 'text-gray-500'}`}>
              {String(gameState === 'ready' ? '00' : currentNum).padStart(2, '0')}
            </div>
          </div>
        </div>
        
        {/* Buttons / Result */}
        {gameState === 'ready' && (
          <button 
            type="button" 
            onClick={startSpin}
            className="w-full py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 shadow-lg shadow-cyan-500/30 hover:scale-[1.02] active:scale-95 transition-all"
          >
            ⏱️ Start Clock!
          </button>
        )}
        
        {gameState === 'spinning' && (
          <button 
            type="button" 
            onClick={stopSpin}
            className="w-full py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700 shadow-lg shadow-red-500/30 hover:scale-[1.02] active:scale-95 transition-all animate-pulse"
          >
            🛑 STOP!
          </button>
        )}
        
        {gameState === 'stopped' && (
          <div className="text-center" style={{ animation: 'resultZoom 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both' }}>
            <div className="flex items-center justify-center gap-6 mb-3">
              <div className="text-center">
                <div className="text-sm text-gray-400">Target</div>
                <div className="text-3xl font-black text-green-400">{String(targetNum).padStart(2, '0')}</div>
              </div>
              <div className="text-2xl text-gray-500">vs</div>
              <div className="text-center">
                <div className="text-sm text-gray-400">You</div>
                <div className="text-3xl font-black text-yellow-400" style={{ animation: 'diceLand 0.3s ease-out both' }}>{String(stoppedNum).padStart(2, '0')}</div>
              </div>
            </div>
            <div className="text-lg text-gray-300 mb-2">Off by {getDiff()}</div>
            <div className={`text-2xl font-black mb-4 ${getPrize() >= 200 ? 'text-green-400' : getPrize() > 0 ? 'text-yellow-400' : 'text-gray-400'}`}
              style={{ animation: getPrize() > 0 ? 'correctPop 0.4s ease 0.3s both' : 'wrongShake 0.5s ease 0.2s both' }}>
              {getPrize() > 0 ? `🎉 +${getPrize()} Coins!` : 'Too far! Try again'}
            </div>
            <button 
              type="button" 
              onClick={() => { setGameState('ready'); setCurrentNum(0); setTargetNum(null); setStoppedNum(null); }}
              className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 rounded-xl font-bold"
            >
              Try Again ⏱️
            </button>
          </div>
        )}
        
        {/* Prize table */}
        {gameState === 'ready' && (
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-green-500/10 rounded-lg p-2 border border-green-500/20">
              <div className="text-green-400 font-bold">Exact</div>
              <div className="text-white font-bold">1000</div>
            </div>
            <div className="bg-yellow-500/10 rounded-lg p-2 border border-yellow-500/20">
              <div className="text-yellow-400 font-bold">±5</div>
              <div className="text-white font-bold">200</div>
            </div>
            <div className="bg-cyan-500/10 rounded-lg p-2 border-0">
              <div className="text-cyan-400 font-bold">±10</div>
              <div className="text-white font-bold">100</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// TREASURE HUNT GAME
// ============================================================================
function TreasureHuntGame({ onClose, onWin, closing }) {
  const [board, setBoard] = useState([]);
  const [flipped, setFlipped] = useState([]);
  const [gameState, setGameState] = useState('playing'); // playing, won, lost
  const [picksLeft, setPicksLeft] = useState(3);
  const [collected, setCollected] = useState(0);
  const [showTutorial, setShowTutorial] = useState(false);
  
  // Initialize board on mount
  useEffect(() => {
    generateBoard();
  }, []);
  
  const generateBoard = () => {
    // 5x5 grid = 25 tiles
    // 8 prizes (coins), 5 gems (bigger prize), 3 traps (skull), 9 empty
    const items = [
      ...Array(8).fill({ type: 'coins', emoji: '🪙', value: 25 }),
      ...Array(4).fill({ type: 'gem', emoji: '💎', value: 75 }),
      ...Array(1).fill({ type: 'jackpot', emoji: '👑', value: 500 }),
      ...Array(5).fill({ type: 'trap', emoji: '💀', value: 0 }),
      ...Array(7).fill({ type: 'empty', emoji: '💨', value: 0 }),
    ];
    
    // Shuffle
    for (let i = items.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [items[i], items[j]] = [items[j], items[i]];
    }
    
    setBoard(items);
    setFlipped([]);
    setPicksLeft(3);
    setCollected(0);
    setGameState('playing');
  };
  
  const flipTile = (index) => {
    if (flipped.includes(index) || gameState !== 'playing' || picksLeft <= 0) return;
    
    const tile = board[index];
    setFlipped(prev => [...prev, index]);
    setPicksLeft(p => p - 1);
    
    if (tile.type === 'trap') {
      // Hit a trap - game over!
      setGameState('lost');
      // Reveal all tiles after short delay
      setTimeout(() => {
        setFlipped(board.map((_, i) => i));
      }, 500);
      // Still give partial winnings
      if (collected > 0) onWin(collected, { survivedNoTrap: false, foundCrown: false });
      return;
    }
    
    const newTotal = collected + tile.value;
    const hitCrown = tile.type === 'jackpot';
    setCollected(newTotal);
    
    // Check if last pick
    if (picksLeft <= 1) {
      setGameState('won');
      if (newTotal > 0) onWin(newTotal, { survivedNoTrap: true, foundCrown: hitCrown || flipped.some(fi => board[fi]?.type === 'jackpot') });
      // Reveal all tiles after short delay
      setTimeout(() => {
        setFlipped(board.map((_, i) => i));
      }, 800);
    }
  };

  return (
    <div className={`fixed inset-0 bg-black/95 flex items-center justify-center z-[70] p-4 ${closing ? "anim-backdrop-close" : "anim-fade-in"}`} onClick={onClose}>
      {showTutorial && <TutorialModal tutorialKey="treasure" onClose={() => setShowTutorial(false)} />}
      
      <div className={`bg-gradient-to-b from-[#0a1520] to-[#030810] rounded-3xl max-w-md w-full p-6 border-0 ${closing ? "anim-modal-close" : "anim-scale-in"}`} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <button type="button" onClick={() => setShowTutorial(true)} className="p-2 hover:bg-white/10 rounded-full">
            <HelpCircle className="w-6 h-6 text-cyan-400" />
          </button>
          <h2 className="text-2xl font-bold">🗺️ Treasure Hunt</h2>
          <button type="button" onClick={onClose} className="p-2 hover:bg-white/10 rounded-full">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {/* Status bar */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <span className="text-gray-400">Picks:</span>
            {[...Array(3)].map((_, i) => (
              <div key={i} className={`w-6 h-6 rounded-full flex items-center justify-center text-sm ${i < picksLeft ? 'bg-yellow-500/30 text-yellow-400' : 'bg-gray-800/40 border border-gray-600/20/50 text-gray-600'}`}>
                {i < picksLeft ? '👆' : '·'}
              </div>
            ))}
          </div>
          <div className="text-lg font-bold">
            Loot: <span className="text-yellow-400">{collected}</span> 🪙
          </div>
        </div>
        
        {/* Game Board */}
        <div className="grid grid-cols-5 gap-2 mb-4">
          {board.map((tile, i) => {
            const isFlipped = flipped.includes(i);
            return (
              <button
                key={i}
                type="button"
                onClick={() => flipTile(i)}
                disabled={isFlipped || gameState !== 'playing'}
                className={`aspect-square rounded-xl text-2xl flex items-center justify-center transition-all duration-300 ${
                  isFlipped
                    ? tile.type === 'trap' 
                      ? 'bg-red-500/30 border border-red-500/50 scale-95' 
                      : tile.type === 'jackpot'
                        ? 'bg-yellow-500/30 border border-yellow-500/50'
                        : tile.type === 'gem'
                          ? 'bg-cyan-500/20 border border-cyan-500/40'
                          : tile.value > 0 
                            ? 'bg-green-500/20 border border-green-500/40'
                            : 'bg-gray-800/40 border border-gray-600/20/30 border border-gray-600/30 opacity-50'
                    : gameState === 'playing'
                      ? 'bg-black/40 border border-white/10 hover:bg-cyan-900/30 hover:scale-105 hover:border-cyan-400/40 active:scale-90 cursor-pointer'
                      : 'bg-black/30 border border-white/5 opacity-40'
                }`}
              >
                {isFlipped ? (
                  <span style={{ animation: tile.type === 'trap' ? 'wrongShake 0.5s ease both' : tile.type === 'jackpot' ? 'symbolPop 0.5s ease both' : 'cardFlipIn 0.3s ease both' }}>{tile.emoji}</span>
                ) : (
                  <span className="text-cyan-500/40 text-lg">?</span>
                )}
              </button>
            );
          })}
        </div>
        
        {/* Result */}
        {gameState === 'lost' && (
          <div className="text-center p-4 bg-red-500/10 rounded-2xl border border-red-500/30" style={{ animation: 'resultZoom 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both' }}>
            <div className="text-4xl mb-2" style={{ animation: 'wrongShake 0.6s ease both' }}>💀</div>
            <div className="text-xl font-bold text-red-400 mb-1">Trap!</div>
            <div className="text-gray-400 mb-3">
              {collected > 0 ? `Saved ${collected} Coins before the trap!` : 'No coins collected'}
            </div>
            <button 
              type="button" 
              onClick={generateBoard}
              className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 rounded-xl font-bold"
            >
              Try Again 🗺️
            </button>
          </div>
        )}
        
        {gameState === 'won' && (
          <div className="text-center p-4 bg-green-500/10 rounded-2xl border-2 border-green-500/40" style={{ animation: 'resultZoom 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) both' }}>
            <div className="text-4xl mb-2" style={{ animation: 'symbolPop 0.5s ease both, float 2s ease-in-out 0.5s infinite' }}>{collected >= 200 ? '🏆' : collected >= 75 ? '⭐' : '🪙'}</div>
            <div className="text-2xl font-black text-yellow-400 mb-1" style={{ animation: 'correctPop 0.4s ease 0.3s both' }}>+{collected} Coins!</div>
            <div className="text-gray-400 mb-3">You survived the hunt!</div>
            <button 
              type="button" 
              onClick={generateBoard}
              className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 rounded-xl font-bold"
            >
              Hunt Again 🗺️
            </button>
          </div>
        )}
        
        {/* Legend */}
        {gameState === 'playing' && (
          <div className="flex justify-center gap-4 text-xs text-gray-500">
            <span>🪙 25</span>
            <span>💎 75</span>
            <span>👑 500</span>
            <span>💀 Trap!</span>
          </div>
        )}
      </div>
    </div>
  );
}


// ============================================================================
// MAIN APP COMPONENT
// ============================================================================
// ============================================================================
// CLASSIC QUIZ COMPONENT — PREMIUM UI
// ============================================================================

// ========== MINES GAME ==========
function MinesGame({ onClose, onWin, closing }) {
  const GRID = 5, TOTAL = 25;
  const MINE_OPTIONS = [1, 3, 5, 10];
  const WAGER_OPTIONS = [1, 5, 10, 25, 50];

  const calcMult = (mines, rev) => { if (rev === 0) return 1; let m = 1; for (let i = 0; i < rev; i++) m *= (TOTAL - i) / (TOTAL - mines - i); return Math.round(m * 100) / 100; };
  const genMines = (count) => { const a = Array.from({length:TOTAL},(_,i)=>i); for (let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return new Set(a.slice(0,count)); };

  const [coins, setCoins] = useState(500);
  const [mineCount, setMineCount] = useState(3);
  const [wager, setWager] = useState(5);
  const [phase, setPhase] = useState('setup');
  const [mineSet, setMineSet] = useState(new Set());
  const [revealed, setRevealed] = useState(new Set());
  const [explodedTile, setExplodedTile] = useState(null);
  const [currentMult, setCurrentMult] = useState(1);
  const [lastWin, setLastWin] = useState(null);
  const [history, setHistory] = useState([]);
  const [shakeGrid, setShakeGrid] = useState(false);
  const [flashTile, setFlashTile] = useState(null);
  const [glowPulse, setGlowPulse] = useState(false);
  const [showAllMines, setShowAllMines] = useState(false);

  const safeCount = TOTAL - mineCount;
  const gemsFound = [...revealed].filter(i => !mineSet.has(i)).length;
  const potentialWin = Math.floor(wager * currentMult);
  const nextMult = phase === 'playing' ? calcMult(mineCount, gemsFound + 1) : 1;

  const startGame = useCallback(() => {
    if (coins < wager) return;
    setCoins(c => c - wager); setMineSet(genMines(mineCount)); setRevealed(new Set());
    setExplodedTile(null); setCurrentMult(1); setLastWin(null); setPhase('playing');
    setShowAllMines(false); setGlowPulse(false);
  }, [coins, wager, mineCount]);

  const revealTile = useCallback((idx) => {
    if (phase !== 'playing' || revealed.has(idx)) return;
    if (mineSet.has(idx)) {
      setExplodedTile(idx); setRevealed(p => new Set([...p, idx]));
      setShakeGrid(true); setTimeout(() => setShakeGrid(false), 600);
      setPhase('exploded'); setHistory(h => [{result:'loss',wager,mines:mineCount},...h.slice(0,14)]);
      setTimeout(() => { setShowAllMines(true); setRevealed(p => new Set([...p,...mineSet])); }, 700);
    } else {
      const nr = new Set([...revealed, idx]); setRevealed(nr);
      setFlashTile(idx); setTimeout(() => setFlashTile(null), 400);
      const ng = [...nr].filter(i => !mineSet.has(i)).length;
      const nm = calcMult(mineCount, ng); setCurrentMult(nm);
      if (nm > 2) setGlowPulse(true);
      if (ng >= safeCount) {
        const w = Math.floor(wager * nm); setCoins(c => c + w); setLastWin(w); setPhase('cashed');
        if (onWin) onWin(w - wager);
        setHistory(h => [{result:'win',wager,mult:nm,won:w},...h.slice(0,14)]);
        setTimeout(() => { setShowAllMines(true); setRevealed(p => new Set([...p,...mineSet])); }, 500);
      }
    }
  }, [phase, revealed, mineSet, mineCount, wager, safeCount, onWin]);

  const cashOut = useCallback(() => {
    if (phase !== 'playing' || gemsFound === 0) return;
    const w = Math.floor(wager * currentMult); setCoins(c => c + w); setLastWin(w); setPhase('cashed');
    if (onWin) onWin(w - wager);
    setHistory(h => [{result:'win',wager,mult:currentMult,won:w},...h.slice(0,14)]);
    setTimeout(() => { setShowAllMines(true); setRevealed(p => new Set([...p,...mineSet])); }, 400);
  }, [phase, gemsFound, wager, currentMult, mineSet, onWin]);

  useEffect(() => {
    const kd = (e) => { if (e.code==='Space'&&phase==='playing'&&gemsFound>0){e.preventDefault();cashOut();} };
    window.addEventListener('keydown',kd); return()=>window.removeEventListener('keydown',kd);
  }, [phase, gemsFound, cashOut]);

  const riskLabel = mineCount <= 1 ? 'LOW' : mineCount <= 5 ? 'MEDIUM' : 'HIGH';
  const riskColor = mineCount <= 1 ? '#22c55e' : mineCount <= 5 ? '#f59e0b' : '#ef4444';

  return (
    <div className={`fixed inset-0 bg-black/90 flex items-center justify-center z-[80] p-4 ${closing ? 'anim-backdrop-close' : 'anim-fade-in'}`} onClick={onClose}>
      <style>{`
        @keyframes mTileGem{0%{transform:scale(.5) rotateY(90deg);opacity:0}50%{transform:scale(1.15) rotateY(0)}100%{transform:scale(1);opacity:1}}
        @keyframes mTileExplode{0%{transform:scale(1)}20%{transform:scale(1.4)}40%{transform:scale(.85)}60%{transform:scale(1.15)}100%{transform:scale(1)}}
        @keyframes mGridShake{0%,100%{transform:translate(0)}10%{transform:translate(-8px,4px) rotate(-1deg)}20%{transform:translate(7px,-5px) rotate(1deg)}30%{transform:translate(-5px,3px)}40%{transform:translate(4px,-3px)}}
        @keyframes mCashPulse{0%,100%{box-shadow:0 4px 0 #047857,0 0 0 0 rgba(34,197,94,.25),inset 0 1px 0 rgba(255,255,255,.2)}50%{box-shadow:0 4px 0 #047857,0 0 28px 6px rgba(34,197,94,.2),inset 0 1px 0 rgba(255,255,255,.2)}}
        @keyframes mMultPulse{0%,100%{text-shadow:0 0 8px rgba(255,215,0,.3)}50%{text-shadow:0 0 24px rgba(255,215,0,.6),0 0 40px rgba(255,215,0,.2)}}
        @keyframes mResultSlide{0%{transform:translateY(20px) scale(.9);opacity:0}100%{transform:translateY(0) scale(1);opacity:1}}
        @keyframes mGemFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
        .m-tile-h:hover:not(.m-tile-l){transform:translateY(-3px) scale(1.03);border-color:rgba(6,182,212,.35)!important;box-shadow:0 6px 20px rgba(0,0,0,.4),0 0 15px rgba(6,182,212,.12)!important}
        .m-tile-h:active:not(.m-tile-l){transform:scale(.97)}
      `}</style>

      <div className={`${closing ? 'anim-modal-close' : 'anim-scale-in'}`} onClick={e=>e.stopPropagation()} style={{background:'linear-gradient(180deg,#0a1520 0%,#030810 100%)',border:'none',borderRadius:24,maxWidth:880,width:'100%',overflow:'hidden',boxShadow:'0 0 60px rgba(6,182,212,.08),0 20px 60px rgba(0,0,0,.6)'}}>
        {/* HEADER */}
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'16px 24px',borderBottom:'1px solid rgba(6,182,212,.08)'}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <span style={{fontSize:22,fontWeight:900,letterSpacing:1.5,background:'linear-gradient(135deg,#22D3EE,#06B6D4)',WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent'}}>{'💎 MINES'}</span>
            {phase==='playing'&&<span style={{fontSize:10,fontWeight:800,padding:'3px 10px',borderRadius:6,background:riskColor+'15',color:riskColor,border:`1px solid ${riskColor}25`,letterSpacing:1.5,textTransform:'uppercase'}}>{riskLabel}</span>}
          </div>
          <div style={{display:'flex',alignItems:'center',gap:14}}>
            <div style={{display:'flex',alignItems:'center',gap:6,background:'rgba(255,215,0,.06)',border:'1px solid rgba(255,215,0,.12)',borderRadius:10,padding:'6px 14px',fontWeight:700,fontSize:15,color:'#FFD700',fontFamily:'monospace'}}>{'🪙'} {coins.toLocaleString()}</div>
            <button type="button" onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><span className="text-gray-400 text-xl">{'✕'}</span></button>
          </div>
        </div>

        {/* BODY */}
        <div style={{display:'flex',gap:0,minHeight:420}}>
          {/* SIDEBAR */}
          <div style={{width:220,padding:'18px 16px',borderRight:'1px solid rgba(6,182,212,.06)',display:'flex',flexDirection:'column',gap:12,background:'rgba(0,0,0,.12)'}}>
            <div>
              <div style={{fontSize:10,fontWeight:800,color:'#556',letterSpacing:1.5,marginBottom:5,textTransform:'uppercase'}}>Mines</div>
              <div style={{display:'flex',gap:5}}>
                {MINE_OPTIONS.map(n=>(
                  <button key={n} type="button" onClick={()=>phase==='setup'&&setMineCount(n)} style={{flex:1,padding:'8px 0',borderRadius:8,fontSize:14,fontWeight:800,fontFamily:'monospace',cursor:phase==='setup'?'pointer':'default',border:mineCount===n?'1.5px solid #06B6D4':'1.5px solid rgba(255,255,255,.06)',background:mineCount===n?'rgba(6,182,212,.12)':'rgba(255,255,255,.03)',color:mineCount===n?'#22D3EE':'#777',boxShadow:mineCount===n?'0 0 12px rgba(6,182,212,.12)':'none',opacity:phase!=='setup'?0.4:1,transition:'all .15s'}}>{n}</button>
                ))}
              </div>
            </div>
            <div>
              <div style={{fontSize:10,fontWeight:800,color:'#556',letterSpacing:1.5,marginBottom:5,textTransform:'uppercase'}}>Wager</div>
              <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
                {WAGER_OPTIONS.map(w=>(
                  <button key={w} type="button" onClick={()=>phase==='setup'&&coins>=w&&setWager(w)} style={{flex:1,minWidth:36,padding:'8px 0',borderRadius:8,fontSize:13,fontWeight:800,fontFamily:'monospace',cursor:phase==='setup'&&coins>=w?'pointer':'default',border:wager===w?'1.5px solid #FFD700':'1.5px solid rgba(255,255,255,.06)',background:wager===w?'rgba(255,215,0,.1)':'rgba(255,255,255,.03)',color:wager===w?'#FFD700':'#777',boxShadow:wager===w?'0 0 10px rgba(255,215,0,.08)':'none',opacity:phase!=='setup'||coins<w?0.35:1,transition:'all .15s'}}>{w}</button>
                ))}
              </div>
            </div>
            <div style={{height:1,background:'linear-gradient(90deg,transparent,rgba(6,182,212,.12),transparent)'}} />
            {phase==='playing'&&<>
              <div style={{background:'rgba(255,215,0,.04)',border:'1px solid rgba(255,215,0,.1)',borderRadius:12,padding:'12px 10px',textAlign:'center'}}>
                <div style={{fontSize:26,fontWeight:900,color:'#FFD700',fontFamily:'monospace',animation:glowPulse?'mMultPulse 1.2s ease-in-out infinite':'none'}}>{currentMult.toFixed(2)}x</div>
                <div style={{fontSize:9,color:'#665',letterSpacing:1.5,marginTop:2,textTransform:'uppercase',fontWeight:700}}>Multiplier</div>
              </div>
              <div style={{display:'flex',gap:6}}>
                <div style={{flex:1,background:'rgba(34,197,94,.05)',border:'1px solid rgba(34,197,94,.1)',borderRadius:10,padding:'9px 6px',textAlign:'center'}}>
                  <div style={{fontSize:15,fontWeight:900,color:'#22c55e',fontFamily:'monospace'}}>{potentialWin}</div>
                  <div style={{fontSize:8,color:'#555',letterSpacing:1,marginTop:1,fontWeight:700}}>WIN</div>
                </div>
                <div style={{flex:1,background:'rgba(96,165,250,.05)',border:'1px solid rgba(96,165,250,.1)',borderRadius:10,padding:'9px 6px',textAlign:'center'}}>
                  <div style={{fontSize:15,fontWeight:900,color:'#60a5fa',fontFamily:'monospace'}}>{nextMult.toFixed(1)}x</div>
                  <div style={{fontSize:8,color:'#555',letterSpacing:1,marginTop:1,fontWeight:700}}>NEXT</div>
                </div>
              </div>
            </>}
            {phase==='exploded'&&<div style={{background:'rgba(239,68,68,.06)',border:'1px solid rgba(239,68,68,.15)',borderRadius:12,padding:'12px 10px',textAlign:'center',animation:'mResultSlide .4s ease-out'}}>
              <div style={{fontSize:22,fontWeight:900,color:'#ef4444',fontFamily:'monospace'}}>-{wager} {'🪙'}</div>
              <div style={{fontSize:9,color:'#844',letterSpacing:1.5,marginTop:2,fontWeight:700}}>BUSTED</div>
            </div>}
            {phase==='cashed'&&<div style={{background:'rgba(34,197,94,.06)',border:'1px solid rgba(34,197,94,.15)',borderRadius:12,padding:'12px 10px',textAlign:'center',animation:'mResultSlide .4s ease-out'}}>
              <div style={{fontSize:22,fontWeight:900,color:'#22c55e',fontFamily:'monospace'}}>+{lastWin} {'🪙'}</div>
              <div style={{fontSize:9,color:'#485',letterSpacing:1.5,marginTop:2,fontWeight:700}}>{currentMult.toFixed(2)}x WIN</div>
            </div>}
            <div style={{marginTop:'auto'}}>
              {phase==='setup'&&<button type="button" onClick={startGame} disabled={coins<wager} className="btn-3d" style={{width:'100%',padding:'13px 0',border:'none',borderRadius:14,fontSize:13,fontWeight:900,cursor:coins>=wager?'pointer':'default',background:coins>=wager?'linear-gradient(180deg,#22D3EE 0%,#06B6D4 40%,#0891B2 100%)':'#333',color:coins>=wager?'#000':'#666',boxShadow:coins>=wager?'0 4px 0 #0E7490,0 6px 20px rgba(6,182,212,.3),inset 0 1px 0 rgba(255,255,255,.25)':'none',letterSpacing:0.5,textTransform:'uppercase',opacity:coins>=wager?1:0.4}}>{coins>=wager ? `Bet ${wager} 🪙 & Play` : 'Not enough coins'}</button>}
              {phase==='playing'&&<button type="button" onClick={cashOut} disabled={gemsFound===0} style={{width:'100%',padding:'13px 0',border:'none',borderRadius:14,fontSize:13,fontWeight:900,cursor:gemsFound>0?'pointer':'default',background:gemsFound>0?'linear-gradient(180deg,#34D399 0%,#10B981 40%,#059669 100%)':'#222',color:gemsFound>0?'#000':'#555',boxShadow:gemsFound>0?'0 4px 0 #047857,0 6px 20px rgba(16,185,129,.3),inset 0 1px 0 rgba(255,255,255,.2)':'none',letterSpacing:0.5,textTransform:'uppercase',animation:gemsFound>0?'mCashPulse 1.5s ease-in-out infinite':'none',opacity:gemsFound>0?1:0.4}}>{gemsFound===0 ? 'Pick a tile' : `Cash out ${potentialWin} 🪙`}</button>}
              {(phase==='exploded'||phase==='cashed')&&<button type="button" onClick={()=>setPhase('setup')} className="btn-3d" style={{width:'100%',padding:'13px 0',border:'none',borderRadius:14,fontSize:13,fontWeight:900,cursor:'pointer',background:'linear-gradient(180deg,#22D3EE 0%,#06B6D4 40%,#0891B2 100%)',color:'#000',letterSpacing:0.5,textTransform:'uppercase',boxShadow:'0 4px 0 #0E7490,0 6px 20px rgba(6,182,212,.3),inset 0 1px 0 rgba(255,255,255,.25)'}}>New Round</button>}
            </div>
          </div>

          {/* GRID AREA */}
          <div style={{flex:1,padding:'18px 24px',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:12}}>
            <div style={{display:'flex',gap:8,width:'100%',maxWidth:400}}>
              {[{icon:'💎',val:safeCount-gemsFound,label:'Gems left',color:'#22D3EE'},{icon:'💣',val:mineCount,label:'Mines',color:'#ef4444'},{icon:'✓',val:`${gemsFound}/${safeCount}`,label:'Found',color:'#60a5fa'}].map((s,i)=>(
                <div key={i} style={{flex:1,background:'rgba(255,255,255,.02)',border:'1px solid rgba(255,255,255,.04)',borderRadius:10,padding:'7px 6px',textAlign:'center'}}>
                  <div style={{fontSize:14,fontWeight:900,color:s.color,fontFamily:'monospace'}}>{s.icon} {s.val}</div>
                  <div style={{fontSize:8,color:'#444',letterSpacing:1,marginTop:1,fontWeight:700,textTransform:'uppercase'}}>{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:7,width:'100%',maxWidth:400,animation:shakeGrid?'mGridShake .5s ease-out':'none'}}>
              {Array.from({length:TOTAL},(_,idx)=>{
                const isRev=revealed.has(idx),isM=mineSet.has(idx),isExp=idx===explodedTile,isFlash=idx===flashTile;
                const gameOver=phase==='exploded'||phase==='cashed';
                const canClick=phase==='playing'&&!isRev;
                let bg,bdr,shd,anim;
                if(!isRev){bg='linear-gradient(145deg,#162240,#0e1830)';bdr='2px solid rgba(6,182,212,.08)';shd='inset 0 2px 6px rgba(0,0,0,.4),0 1px 3px rgba(0,0,0,.3)';anim='none';}
                else if(isM&&isExp){bg='radial-gradient(circle,#7f1d1d,#450a0a)';bdr='2px solid rgba(255,60,60,.5)';shd='0 0 30px rgba(255,50,50,.35),inset 0 0 15px rgba(255,0,0,.15)';anim='mTileExplode .5s ease-out';}
                else if(isM){bg='linear-gradient(145deg,#1c1015,#150a0e)';bdr='2px solid rgba(239,68,68,.12)';shd='none';anim='none';}
                else{bg='radial-gradient(circle,#064e3b,#022c22)';bdr=`2px solid rgba(34,197,94,${isFlash?0.5:0.2})`;shd=isFlash?'0 0 25px rgba(34,197,94,.35),inset 0 0 10px rgba(34,197,94,.1)':'0 0 8px rgba(34,197,94,.08)';anim='mTileGem .35s ease-out';}
                return(
                  <div key={idx} onClick={()=>canClick&&revealTile(idx)} className={`${!isRev?'m-tile-h':''}${!canClick&&!isRev?' m-tile-l':''}`}
                    style={{aspectRatio:'1',borderRadius:12,display:'flex',alignItems:'center',justifyContent:'center',cursor:canClick?'pointer':'default',background:bg,border:bdr,boxShadow:shd,animation:isRev?anim:'none',transition:'all .2s',position:'relative',fontSize:26}}>
                    {isRev&&!isM&&<span style={{animation:'mGemFloat 2s ease-in-out infinite',display:'flex'}}>💎</span>}
                    {isRev&&isM&&isExp&&<span>💥</span>}
                    {isRev&&isM&&!isExp&&<span style={{opacity:0.4,fontSize:20}}>💣</span>}
                    {!isRev&&gameOver&&!isM&&<span style={{opacity:0.08,fontSize:16}}>💎</span>}
                    {!isRev&&phase==='setup'&&<span style={{opacity:0.06,fontSize:15}}>?</span>}
                  </div>
                );
              })}
            </div>

            {phase==='exploded'&&<div style={{fontSize:15,fontWeight:900,color:'#ef4444',textAlign:'center',animation:'mResultSlide .4s ease-out',textShadow:'0 0 20px rgba(239,68,68,.3)'}}>{'💥'} Hit a mine! Lost {wager} coins</div>}
            {phase==='cashed'&&<div style={{fontSize:15,fontWeight:900,color:'#22c55e',textAlign:'center',animation:'mResultSlide .4s ease-out',textShadow:'0 0 20px rgba(34,197,94,.3)'}}>{'💰'} Cashed out {lastWin} coins at {currentMult.toFixed(2)}x!</div>}
            {phase==='setup'&&<div style={{fontSize:11,color:'#445',textAlign:'center',lineHeight:1.6,maxWidth:300}}>Pick tiles to find 💎 gems. Avoid 💣 mines. Cash out anytime.</div>}
            {phase==='playing'&&gemsFound>0&&<div style={{fontSize:10,color:'#445',textAlign:'center'}}><span style={{color:'#22D3EE',fontWeight:700}}>SPACE</span> to cash out</div>}
          </div>
        </div>

        {history.length>0&&<div style={{padding:'8px 24px 12px',borderTop:'1px solid rgba(6,182,212,.05)',display:'flex',gap:4,flexWrap:'wrap',alignItems:'center'}}>
          <span style={{fontSize:9,color:'#334',fontWeight:700,letterSpacing:1.5,marginRight:4}}>HISTORY</span>
          {history.map((h,i)=>(<span key={i} style={{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:5,fontFamily:'monospace',background:h.result==='win'?'rgba(34,197,94,.08)':'rgba(239,68,68,.08)',color:h.result==='win'?'#22c55e':'#ef4444',border:`1px solid ${h.result==='win'?'rgba(34,197,94,.12)':'rgba(239,68,68,.12)'}`}}>{h.result==='win'?`+${h.won}`:`-${h.wager}`}</span>))}
        </div>}
      </div>
    </div>
  );
}

function ClassicQuizGame({ onClose, onWin, closing }) {
  const [phase, setPhase] = useState('category');
  const [category, setCategory] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [qIndex, setQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(15);
  const [selected, setSelected] = useState(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [fiftyFiftyUsed, setFiftyFiftyUsed] = useState(0);
  const [skipUsed, setSkipUsed] = useState(false);
  const [eliminated, setEliminated] = useState([]);
  const [streak, setStreak] = useState(0);
  const timerRef = useRef(null);

  const optionLetters = ['A', 'B', 'C', 'D'];
  const optionColors = [
    { bg: 'from-rose-600/30 to-pink-700/20', border: 'border-rose-500/40', glow: 'shadow-rose-500/20', letter: 'bg-rose-500', hover: 'hover:border-rose-400/60 hover:shadow-rose-500/30' },
    { bg: 'from-blue-600/30 to-cyan-700/20', border: 'border-blue-500/40', glow: 'shadow-blue-500/20', letter: 'bg-blue-500', hover: 'hover:border-blue-400/60 hover:shadow-blue-500/30' },
    { bg: 'from-amber-600/30 to-yellow-700/20', border: 'border-amber-400/50', glow: 'shadow-amber-500/20', letter: 'bg-amber-500', hover: 'hover:border-amber-400/60 hover:shadow-amber-500/30' },
    { bg: 'from-emerald-600/30 to-green-700/20', border: 'border-emerald-500/40', glow: 'shadow-emerald-500/20', letter: 'bg-emerald-500', hover: 'hover:border-emerald-400/60 hover:shadow-emerald-500/30' },
  ];

  const startQuiz = (catId) => {
    setCategory(catId);
    setQuestions(getQuestions(catId, 10));
    setPhase('playing');
    setTimer(15);
  };

  useEffect(() => {
    if (phase === 'playing' && !showAnswer) {
      timerRef.current = setInterval(() => {
        setTimer(t => {
          if (t <= 1) {
            clearInterval(timerRef.current);
            setShowAnswer(true);
            setStreak(0);
            setTimeout(() => nextQuestion(), 1500);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
      return () => clearInterval(timerRef.current);
    }
  }, [phase, qIndex, showAnswer]);

  const selectAnswer = (opt) => {
    if (showAnswer || selected) return;
    clearInterval(timerRef.current);
    setSelected(opt);
    setShowAnswer(true);
    const correct = opt === questions[qIndex].a;
    if (correct) { setScore(s => s + 1); setStreak(s => s + 1); } else { setStreak(0); }
    setTimeout(() => nextQuestion(), 1200);
  };

  const nextQuestion = () => {
    if (qIndex >= 9) {
      setPhase('result');
      const totalCoins = score * 10 + (score >= 10 ? 500 : score >= 7 ? 150 : score >= 5 ? 50 : 0);
      if (totalCoins > 0) onWin(totalCoins, { triviaCorrect: score, triviaType: 'classic' });
      return;
    }
    setQIndex(i => i + 1);
    setSelected(null);
    setShowAnswer(false);
    setEliminated([]);
    setTimer(15);
  };

  const useFiftyFifty = () => {
    if (fiftyFiftyUsed >= 2 || showAnswer) return;
    const q = questions[qIndex];
    const wrongOpts = q.options.filter(o => o !== q.a);
    const toRemove = wrongOpts.sort(() => Math.random() - 0.5).slice(0, 2);
    setEliminated(toRemove);
    setFiftyFiftyUsed(f => f + 1);
  };

  const useSkip = () => {
    if (skipUsed || showAnswer) return;
    clearInterval(timerRef.current);
    setSkipUsed(true);
    setScore(s => s + 1);
    setShowAnswer(true);
    setSelected('__skipped__');
    setTimeout(() => nextQuestion(), 800);
  };

  const q = questions[qIndex];
  const finalCoins = score * 10 + (score >= 10 ? 500 : score >= 7 ? 150 : score >= 5 ? 50 : 0);
  const timerPct = (timer / 15) * 100;
  const circumference = 2 * Math.PI * 22;

  return (
    <div className={`fixed inset-0 bg-black/95 flex items-center justify-center z-[70] p-4 ${closing ? "anim-backdrop-close" : "anim-fade-in"}`} onClick={onClose}>
      <div className={`bg-gradient-to-b from-[#0a1828]/95 via-[#061018]/95 to-[#030810]/95 backdrop-blur-xl rounded-3xl max-w-md w-full border-0 overflow-hidden ${closing ? "anim-modal-close" : "anim-scale-in"}`} onClick={(e) => e.stopPropagation()}>
        
        {/* Header with glow */}
        <div className="relative px-6 pt-5 pb-4">
          <div className="absolute inset-0 bg-gradient-to-b from-cyan-600/10 to-transparent" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                <span className="text-lg">🧠</span>
              </div>
              <div>
                <h2 className="font-black text-lg tracking-tight">Classic Quiz</h2>
                {phase === 'playing' && <span className="text-xs text-cyan-400">{TRIVIA_CATEGORIES.find(c => c.id === category)?.name}</span>}
              </div>
            </div>
            <button type="button" onClick={onClose} className="w-9 h-9 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-full transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-6 pb-6">
          {/* Category Selection */}
          {phase === 'category' && (
            <div>
              <p className="text-gray-400 text-center text-sm mb-5">Choose your category</p>
              <div className="grid grid-cols-2 gap-3">
                {TRIVIA_CATEGORIES.map(cat => (
                  <button key={cat.id} type="button" onClick={() => startQuiz(cat.id)}
                    className="group relative rounded-3xl overflow-hidden transition-all duration-300 hover:scale-[1.03] active:scale-95">
                    <div className={`absolute inset-0 bg-gradient-to-br ${cat.color} opacity-20 group-hover:opacity-40 transition-opacity`} />
                    <div className="relative p-5 text-center border border-white/10 rounded-2xl group-hover:border-white/20">
                      <div className="text-4xl mb-2 drop-shadow-lg" style={{ filter: 'drop-shadow(0 0 8px rgba(168,85,247,0.4))' }}>{cat.icon}</div>
                      <div className="font-bold text-sm">{cat.name}</div>
                      <div className="text-xs text-gray-500 mt-1">15 questions</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Playing */}
          {phase === 'playing' && q && (
            <div>
              {/* Score bar + Timer */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-cyan-300">Question {qIndex + 1}/10</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-green-400">{score} correct</span>
                      {streak >= 2 && <span className="text-xs text-orange-400 animate-pulse">🔥{streak}</span>}
                    </div>
                  </div>
                  <div className="h-2 bg-black/50 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500 ease-out" style={{
                      width: `${((qIndex + 1) / 10) * 100}%`,
                      background: 'linear-gradient(90deg, #a855f7, #ec4899, #f97316)'
                    }} />
                  </div>
                </div>
                {/* Circular Timer */}
                <div className="relative w-14 h-14 flex-shrink-0">
                  <svg className="w-14 h-14 -rotate-90" viewBox="0 0 48 48">
                    <circle cx="24" cy="24" r="22" fill="none" stroke="#0a1520" strokeWidth="3" />
                    <circle cx="24" cy="24" r="22" fill="none"
                      stroke={timer <= 5 ? '#ef4444' : timer <= 10 ? '#f59e0b' : '#a855f7'}
                      strokeWidth="3" strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={circumference - (timerPct / 100) * circumference}
                      style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
                    />
                  </svg>
                  <div className={`absolute inset-0 flex items-center justify-center font-black text-lg ${timer <= 5 ? 'text-red-400' : 'text-white'}`} style={{ animation: timer <= 5 ? 'timerUrgent 0.5s ease-in-out infinite' : 'none' }}>
                    {timer}
                  </div>
                </div>
              </div>

              {/* Question Card */}
              <div className="relative mb-4">
                <div className="absolute -inset-[1px] bg-gradient-to-r from-cyan-500/30 via-blue-500/30 to-cyan-500/30 rounded-2xl blur-sm" />
                <div className="relative bg-black/50 rounded-2xl p-5 border border-white/10">
                  <p className="font-bold text-center leading-relaxed">{q.q}</p>
                </div>
              </div>

              {/* Answer Options - Colored Bars */}
              <div className="space-y-2.5 mb-4">
                {q.options.map((opt, i) => {
                  if (eliminated.includes(opt)) return (
                    <div key={i} className="relative h-12 rounded-xl bg-gray-900/50 border border-gray-800/50 flex items-center px-4 opacity-30">
                      <span className="w-7 h-7 rounded-lg bg-gray-800/40 border border-gray-600/20 flex items-center justify-center font-black text-xs mr-3">{optionLetters[i]}</span>
                      <span className="text-gray-600 line-through text-sm">{opt}</span>
                    </div>
                  );
                  const isCorrect = opt === q.a;
                  const isSelected = opt === selected;
                  const c = optionColors[i];
                  let classes, inner;
                  if (showAnswer && isCorrect) {
                    classes = 'bg-gradient-to-r from-green-600/30 to-emerald-600/20 border-green-400/60 shadow-lg shadow-green-500/20';
                    inner = 'bg-green-500';
                  } else if (showAnswer && isSelected && !isCorrect) {
                    classes = 'bg-gradient-to-r from-red-600/30 to-red-700/20 border-red-400/60 shadow-lg shadow-red-500/20';
                    inner = 'bg-red-500';
                  } else if (showAnswer) {
                    classes = `bg-gradient-to-r ${c.bg} ${c.border} opacity-40`;
                    inner = c.letter;
                  } else {
                    classes = `bg-gradient-to-r ${c.bg} ${c.border} ${c.hover} shadow-md ${c.glow}`;
                    inner = c.letter;
                  }
                  return (
                    <button key={i} type="button" onClick={() => selectAnswer(opt)} disabled={showAnswer}
                      className={`relative w-full h-13 rounded-xl border flex items-center px-4 py-3 transition-all duration-200 ${!showAnswer ? 'hover:scale-[1.01] active:scale-[0.98]' : ''} ${classes}`}
                      style={{ animation: showAnswer && isCorrect ? 'correctPop 0.4s ease both' : showAnswer && isSelected && !isCorrect ? 'wrongShake 0.5s ease both' : 'none' }}>
                      <span className={`w-7 h-7 rounded-lg ${inner} flex items-center justify-center font-black text-xs mr-3 shadow-md flex-shrink-0`}>{optionLetters[i]}</span>
                      <span className="font-semibold text-sm flex-1 text-left">{opt}</span>
                      {showAnswer && isCorrect && <span className="text-green-400 text-lg ml-2">✓</span>}
                      {showAnswer && isSelected && !isCorrect && <span className="text-red-400 text-lg ml-2">✗</span>}
                    </button>
                  );
                })}
              </div>

              {/* Lifelines */}
              <div className="flex gap-2">
                <button type="button" onClick={useFiftyFifty} disabled={fiftyFiftyUsed >= 2 || showAnswer}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${fiftyFiftyUsed >= 2 || showAnswer ? 'bg-gray-900/50 text-gray-600 border border-gray-800/30' : 'bg-gradient-to-r from-blue-600/20 to-cyan-600/20 text-blue-300 border border-blue-500/30 hover:border-blue-400/50 shadow-md shadow-blue-500/10 hover:shadow-blue-500/20'}`}>
                  <span className="text-base">🔀</span> 50/50 <span className="opacity-50">({2 - fiftyFiftyUsed})</span>
                </button>
                <button type="button" onClick={useSkip} disabled={skipUsed || showAnswer}
                  className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${skipUsed || showAnswer ? 'bg-gray-900/50 text-gray-600 border border-gray-800/30' : 'bg-gradient-to-r from-amber-600/20 to-yellow-600/20 text-amber-300 border border-amber-500/30 hover:border-amber-400/50 shadow-md shadow-amber-500/10 hover:shadow-amber-500/20'}`}>
                  <span className="text-base">⏭️</span> Skip <span className="opacity-50">({skipUsed ? 0 : 1})</span>
                </button>
              </div>
            </div>
          )}

          {/* Results */}
          {phase === 'result' && (
            <div className="text-center py-2">
              <div className="relative inline-block mb-4">
                <div className="text-7xl" style={{ filter: 'drop-shadow(0 0 20px rgba(168,85,247,0.5))' }}>
                  {score >= 8 ? '🏆' : score >= 5 ? '⭐' : '👏'}
                </div>
                <div className="absolute -inset-4 bg-cyan-500/10 rounded-full blur-2xl" />
              </div>
              <div className="text-4xl font-black mb-1 bg-gradient-to-r from-cyan-400 via-blue-400 to-emerald-400 bg-clip-text text-transparent">{score}/10</div>
              <div className="text-gray-400 mb-5">{score >= 8 ? 'Outstanding!' : score >= 5 ? 'Well done!' : 'Keep practicing!'}</div>
              <div className="bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/20 rounded-2xl p-4 mb-5">
                <div className="text-yellow-400 font-black text-2xl mb-1">🪙 +{finalCoins}</div>
                <div className="text-yellow-400/60 text-xs">Coins earned</div>
                {score >= 7 && <div className="text-emerald-400 text-sm mt-2 font-bold">🎉 Bonus: +{score >= 10 ? 500 : 150} for {score >= 10 ? 'perfect' : 'great'} score!</div>}
              </div>
              <button type="button" onClick={onClose} className="w-full py-4 rounded-2xl font-black text-lg tracking-wide btn-3d btn-3d-purple">
                Continue
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SPEED ROUND COMPONENT — PREMIUM UI
// ============================================================================
function SpeedRoundGame({ onClose, onWin, closing }) {
  const [phase, setPhase] = useState('ready');
  const [questions, setQuestions] = useState([]);
  const [qIndex, setQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [timer, setTimer] = useState(60);
  const [feedback, setFeedback] = useState(null);
  const [combo, setCombo] = useState(0);
  const timerRef = useRef(null);
  const scoreRef = useRef(0);

  const startGame = () => {
    setQuestions(getSpeedQuestions(20));
    setPhase('playing');
    setTimer(60);
    timerRef.current = setInterval(() => {
      setTimer(t => {
        if (t <= 1) {
          clearInterval(timerRef.current);
          const s = scoreRef.current;
          const coins = s * 5 + (s >= 20 ? 500 : s >= 15 ? 200 : 0);
          if (coins > 0) onWin(coins, { triviaCorrect: s, triviaType: 'speed' });
          setPhase('result');
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => clearInterval(timerRef.current);
  }, []);

  const answer = (val) => {
    if (phase !== 'playing') return;
    const correct = val === questions[qIndex].answer;
    if (correct) {
      setScore(s => s + 1);
      scoreRef.current += 1;
      setCombo(c => c + 1);
    } else {
      setCombo(0);
    }
    setFeedback(correct ? 'correct' : 'wrong');
    setTimeout(() => {
      setFeedback(null);
      if (qIndex >= 19) {
        clearInterval(timerRef.current);
        setPhase('result');
        const totalCoins = (correct ? score + 1 : score) * 5 + ((correct ? score + 1 : score) >= 15 ? 200 : (correct ? score + 1 : score) >= 20 ? 500 : 0);
        if (totalCoins > 0) onWin(totalCoins, { triviaCorrect: correct ? score + 1 : score, triviaType: 'speed' });
      } else {
        setQIndex(i => i + 1);
      }
    }, 350);
  };

  const finalScore = score;
  const finalCoins = finalScore * 5 + (finalScore >= 20 ? 500 : finalScore >= 15 ? 200 : 0);
  const timerPct = (timer / 60) * 100;
  const circumference = 2 * Math.PI * 38;

  return (
    <div className={`fixed inset-0 bg-black/95 flex items-center justify-center z-[70] p-4 ${closing ? "anim-backdrop-close" : "anim-fade-in"}`} onClick={onClose}>
      <div className={`bg-gradient-to-b from-[#0a1828]/95 via-[#061018]/95 to-[#030810]/95 backdrop-blur-xl rounded-3xl max-w-md w-full border border-yellow-500/20 overflow-hidden ${closing ? "anim-modal-close" : "anim-scale-in"}`} onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="relative px-6 pt-5 pb-4">
          <div className="absolute inset-0 bg-gradient-to-b from-yellow-600/10 to-transparent" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
                <span className="text-lg">⚡</span>
              </div>
              <div>
                <h2 className="font-black text-lg tracking-tight">Speed Round</h2>
                {phase === 'playing' && <span className="text-xs text-yellow-400">True or False</span>}
              </div>
            </div>
            <button type="button" onClick={onClose} className="w-9 h-9 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-full transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-6 pb-6">
          {/* Ready Screen */}
          {phase === 'ready' && (
            <div className="text-center py-4">
              <div className="relative inline-block mb-6">
                <div className="w-28 h-28 rounded-full bg-gradient-to-br from-yellow-500/20 to-orange-600/20 border border-yellow-500/30 flex items-center justify-center mx-auto" style={{ boxShadow: '0 0 40px rgba(234,179,8,0.15), inset 0 0 30px rgba(234,179,8,0.1)' }}>
                  <span className="text-6xl" style={{ filter: 'drop-shadow(0 0 12px rgba(234,179,8,0.5))' }}>⚡</span>
                </div>
              </div>
              <h3 className="text-xl font-black mb-2">20 Questions. 60 Seconds.</h3>
              <p className="text-gray-400 text-sm mb-2">Read each statement and decide:</p>
              <div className="flex items-center justify-center gap-4 mb-6">
                <span className="px-4 py-2 rounded-xl bg-green-500/15 border-2 border-green-500/40 text-green-400 font-bold text-sm">✓ TRUE</span>
                <span className="text-gray-600">or</span>
                <span className="px-4 py-2 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 font-bold text-sm">✗ FALSE</span>
              </div>
              <button type="button" onClick={startGame}
                className="w-full py-4 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-xl font-black text-lg hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-orange-500/30">
                GO!
              </button>
            </div>
          )}

          {/* Playing */}
          {phase === 'playing' && questions[qIndex] && (
            <div>
              {/* Timer + Stats Row */}
              <div className="flex items-center gap-4 mb-4">
                {/* Circular Timer */}
                <div className="relative w-20 h-20 flex-shrink-0">
                  <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                    <circle cx="40" cy="40" r="38" fill="none" stroke="#0a1520" strokeWidth="4" />
                    <circle cx="40" cy="40" r="38" fill="none"
                      stroke={timer <= 10 ? '#ef4444' : timer <= 20 ? '#f59e0b' : '#eab308'}
                      strokeWidth="4" strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={circumference - (timerPct / 100) * circumference}
                      style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
                    />
                  </svg>
                  <div className={`absolute inset-0 flex flex-col items-center justify-center ${timer <= 10 ? 'text-red-400' : 'text-yellow-400'}`}>
                    <span className="font-black text-2xl leading-none" style={{ animation: timer <= 5 ? 'timerUrgent 0.5s ease-in-out infinite' : 'none' }}>{timer}</span>
                    <span className="text-[10px] opacity-60">sec</span>
                  </div>
                </div>
                {/* Stats */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Progress</span>
                    <span className="text-xs font-bold text-yellow-400">{qIndex + 1}/20</span>
                  </div>
                  <div className="h-2 bg-black/50 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-300" style={{
                      width: `${((qIndex + 1) / 20) * 100}%`,
                      background: 'linear-gradient(90deg, #eab308, #f97316, #ef4444)'
                    }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <span className="text-green-400 font-black text-lg">{score}</span>
                      <span className="text-xs text-gray-500">correct</span>
                    </div>
                    {combo >= 2 && (
                      <span className="px-2 py-0.5 rounded-full bg-orange-500/20 border border-orange-500/30 text-orange-400 text-xs font-bold" style={{ animation: combo >= 3 ? 'streakFire 0.6s ease-in-out infinite' : 'none' }}>
                        🔥 {combo}x combo
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Statement Card */}
              <div className={`relative mb-6`} style={{ animation: feedback === 'correct' ? 'correctPop 0.4s ease both' : feedback === 'wrong' ? 'wrongShake 0.5s ease both' : 'none' }}>
                <div className={`absolute -inset-[1px] rounded-2xl blur-sm transition-all duration-200 ${feedback === 'correct' ? 'bg-green-500/40' : feedback === 'wrong' ? 'bg-red-500/40' : 'bg-gradient-to-r from-yellow-500/20 via-orange-500/20 to-yellow-500/20'}`} />
                <div className={`relative bg-black/50 rounded-2xl p-6 border border-white/10 min-h-[120px] flex items-center justify-center transition-colors duration-200 ${feedback === 'correct' ? 'bg-green-900/20' : feedback === 'wrong' ? 'bg-red-900/20' : ''}`}>
                  {feedback === 'correct' && <div className="absolute top-3 right-3 text-green-400 font-bold text-sm animate-pulse">✓ Correct!</div>}
                  {feedback === 'wrong' && <div className="absolute top-3 right-3 text-red-400 font-bold text-sm animate-pulse">✗ Wrong!</div>}
                  <p className="font-bold text-center leading-relaxed">{questions[qIndex].statement}</p>
                </div>
              </div>

              {/* TRUE / FALSE Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={() => answer(true)}
                  className="group relative py-5 rounded-2xl font-black text-xl transition-all hover:scale-[1.03] active:scale-95 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-green-500/25 to-emerald-600/15 border border-green-500/40 rounded-2xl group-hover:border-green-400/60" />
                  <div className="absolute inset-0 bg-green-500/0 group-hover:bg-green-500/5 transition-colors" />
                  <div className="relative flex items-center justify-center gap-2 text-green-400">
                    <span className="text-2xl">✓</span> TRUE
                  </div>
                </button>
                <button type="button" onClick={() => answer(false)}
                  className="group relative py-5 rounded-2xl font-black text-xl transition-all hover:scale-[1.03] active:scale-95 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-red-500/25 to-rose-600/15 border border-red-500/40 rounded-2xl group-hover:border-red-400/60" />
                  <div className="absolute inset-0 bg-red-500/0 group-hover:bg-red-500/5 transition-colors" />
                  <div className="relative flex items-center justify-center gap-2 text-red-400">
                    <span className="text-2xl">✗</span> FALSE
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Results */}
          {phase === 'result' && (
            <div className="text-center py-2">
              <div className="relative inline-block mb-4">
                <div className="text-7xl" style={{ filter: 'drop-shadow(0 0 20px rgba(234,179,8,0.5))' }}>
                  {finalScore >= 15 ? '⚡' : finalScore >= 10 ? '🎯' : '👏'}
                </div>
              </div>
              <div className="text-4xl font-black mb-1 bg-gradient-to-r from-yellow-400 via-orange-400 to-red-400 bg-clip-text text-transparent">{finalScore}/20</div>
              <div className="text-gray-400 mb-5">{finalScore >= 15 ? 'Lightning fast!' : finalScore >= 10 ? 'Quick thinker!' : 'Keep trying!'}</div>
              <div className="bg-gradient-to-r from-yellow-500/10 to-amber-500/10 border border-yellow-500/20 rounded-2xl p-4 mb-5">
                <div className="text-yellow-400 font-black text-2xl mb-1">🪙 +{finalCoins}</div>
                <div className="text-yellow-400/60 text-xs">Coins earned</div>
                {finalScore >= 15 && <div className="text-emerald-400 text-sm mt-2 font-bold">⚡ Speed bonus: +{finalScore >= 20 ? 500 : 200}!</div>}
              </div>
              <button type="button" onClick={onClose} className="w-full py-3.5 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-xl font-bold hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-orange-500/25">
                Continue
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// STREAK TRIVIA COMPONENT — PREMIUM UI
// ============================================================================
function StreakTriviaGame({ onClose, onWin, closing }) {
  const [phase, setPhase] = useState('ready');
  const [didCashOut, setDidCashOut] = useState(false);
  const [question, setQuestion] = useState(null);
  const [streak, setStreak] = useState(0);
  const [selected, setSelected] = useState(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [timer, setTimer] = useState(15);
  const [maxStreak, setMaxStreak] = useState(0);
  const timerRef = useRef(null);

  const barColors = [
    { bg: 'from-rose-600/30 to-pink-700/20', border: 'border-rose-500/40', dot: 'bg-rose-500', hover: 'hover:border-rose-400/60', glow: 'shadow-rose-500/15' },
    { bg: 'from-blue-600/30 to-indigo-700/20', border: 'border-blue-500/40', dot: 'bg-blue-500', hover: 'hover:border-blue-400/60', glow: 'shadow-blue-500/15' },
    { bg: 'from-amber-600/30 to-yellow-700/20', border: 'border-amber-400/50', dot: 'bg-amber-500', hover: 'hover:border-amber-400/60', glow: 'shadow-amber-500/15' },
    { bg: 'from-teal-600/30 to-emerald-700/20', border: 'border-teal-500/40', dot: 'bg-teal-500', hover: 'hover:border-teal-400/60', glow: 'shadow-teal-500/15' },
  ];

  const loadQuestion = () => {
    setQuestion(getRandomQuestion());
    setSelected(null);
    setShowAnswer(false);
    setTimer(15);
  };

  const startGame = () => {
    setPhase('playing');
    setStreak(0);
    setDidCashOut(false);
    loadQuestion();
  };

  useEffect(() => {
    if (phase === 'playing' && !showAnswer) {
      timerRef.current = setInterval(() => {
        setTimer(t => {
          if (t <= 1) {
            clearInterval(timerRef.current);
            setShowAnswer(true);
            setTimeout(() => endGame(), 1200);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
      return () => clearInterval(timerRef.current);
    }
  }, [phase, streak, showAnswer]);

  const selectAnswer = (opt) => {
    if (showAnswer || selected) return;
    clearInterval(timerRef.current);
    setSelected(opt);
    setShowAnswer(true);
    const correct = opt === question.a;
    if (correct) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      setMaxStreak(m => Math.max(m, newStreak));
      setTimeout(() => loadQuestion(), 1000);
    } else {
      setTimeout(() => endGame(), 1200);
    }
  };

  const cashOut = () => {
    clearInterval(timerRef.current);
    setDidCashOut(true);
    const coins = streak * 25;
    if (coins > 0) onWin(coins, { triviaStreak: streak, triviaType: 'streak' });
    setPhase('result');
  };

  const endGame = () => {
    setPhase('result');
  };

  const currentPrize = streak * 25;
  const timerPct = (timer / 15) * 100;
  const circumference = 2 * Math.PI * 22;

  // Streak tier coloring
  const streakColor = streak >= 8 ? 'text-red-400' : streak >= 5 ? 'text-orange-400' : streak >= 3 ? 'text-yellow-400' : 'text-gray-400';
  const streakGlow = streak >= 5 ? 'drop-shadow(0 0 8px rgba(239,68,68,0.5))' : streak >= 3 ? 'drop-shadow(0 0 6px rgba(234,179,8,0.4))' : 'none';

  return (
    <div className={`fixed inset-0 bg-black/95 flex items-center justify-center z-[70] p-4 ${closing ? "anim-backdrop-close" : "anim-fade-in"}`} onClick={onClose}>
      <div className={`bg-gradient-to-b from-[#0a1828]/95 via-[#061018]/95 to-[#030810]/95 backdrop-blur-xl rounded-3xl max-w-md w-full border border-red-500/20 overflow-hidden ${closing ? "anim-modal-close" : "anim-scale-in"}`} onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="relative px-6 pt-5 pb-4">
          <div className="absolute inset-0 bg-gradient-to-b from-red-600/10 to-transparent" />
          <div className="relative flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center shadow-lg shadow-red-500/30">
                <span className="text-lg">🔥</span>
              </div>
              <div>
                <h2 className="font-black text-lg tracking-tight">Streak Trivia</h2>
                {phase === 'playing' && <span className="text-xs text-orange-400">Answer or Cash Out!</span>}
              </div>
            </div>
            <button type="button" onClick={onClose} className="w-9 h-9 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-full transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="px-6 pb-6">
          {/* Ready Screen */}
          {phase === 'ready' && (
            <div className="text-center py-4">
              <div className="relative inline-block mb-5">
                <div className="w-28 h-28 rounded-full bg-gradient-to-br from-red-500/20 to-orange-600/20 border border-red-500/30 flex items-center justify-center mx-auto" style={{ boxShadow: '0 0 40px rgba(239,68,68,0.15), inset 0 0 30px rgba(239,68,68,0.1)' }}>
                  <span className="text-6xl" style={{ filter: 'drop-shadow(0 0 12px rgba(239,68,68,0.5))' }}>🔥</span>
                </div>
              </div>
              <h3 className="text-xl font-black mb-3">How Far Can You Go?</h3>
              <div className="space-y-2 mb-6 text-sm">
                <div className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
                  <span className="text-xl">🪙</span>
                  <span className="text-gray-300">Earn <span className="text-yellow-400 font-bold">25 Coins</span> per correct answer</span>
                </div>
                <div className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
                  <span className="text-xl">💰</span>
                  <span className="text-gray-300"><span className="text-green-400 font-bold">Cash out</span> anytime to keep coins</span>
                </div>
                <div className="flex items-center gap-3 bg-red-500/10 rounded-xl p-3 border border-red-500/20">
                  <span className="text-xl">💥</span>
                  <span className="text-gray-300">Wrong answer = <span className="text-red-400 font-bold">lose everything!</span></span>
                </div>
              </div>
              <button type="button" onClick={startGame}
                className="w-full py-4 bg-gradient-to-r from-red-500 to-orange-600 rounded-xl font-black text-lg hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-red-500/30">
                Start Streak!
              </button>
            </div>
          )}

          {/* Playing */}
          {phase === 'playing' && question && (
            <div>
              {/* Streak Bar */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <div className={`flex items-center gap-1.5 font-black ${streakColor}`} style={{ filter: streakGlow, animation: streak >= 3 ? 'streakFire 0.6s ease-in-out infinite' : 'none' }}>
                      <span className="text-lg">🔥</span>
                      <span className="text-xl">{streak}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-yellow-500/15 px-3 py-1 rounded-full border border-yellow-500/20">
                      <span className="text-sm">🪙</span>
                      <span className="text-yellow-400 font-black text-sm">{currentPrize}</span>
                    </div>
                  </div>
                  {/* Streak Milestones */}
                  <div className="flex gap-1">
                    {Array.from({length: 10}, (_, i) => (
                      <div key={i} className={`flex-1 h-1.5 rounded-full transition-all duration-300 ${i < streak ? (i < 3 ? 'bg-yellow-500' : i < 5 ? 'bg-orange-500' : i < 8 ? 'bg-red-500' : 'bg-rose-400') : 'bg-gray-800'}`} 
                        style={i < streak ? { boxShadow: `0 0 4px ${i < 3 ? '#eab308' : i < 5 ? '#f97316' : '#ef4444'}` } : {}} />
                    ))}
                  </div>
                </div>
                {/* Timer */}
                <div className="relative w-14 h-14 flex-shrink-0">
                  <svg className="w-14 h-14 -rotate-90" viewBox="0 0 48 48">
                    <circle cx="24" cy="24" r="22" fill="none" stroke="#0a1520" strokeWidth="3" />
                    <circle cx="24" cy="24" r="22" fill="none"
                      stroke={timer <= 5 ? '#ef4444' : timer <= 10 ? '#f59e0b' : '#f97316'}
                      strokeWidth="3" strokeLinecap="round"
                      strokeDasharray={circumference}
                      strokeDashoffset={circumference - (timerPct / 100) * circumference}
                      style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.3s' }}
                    />
                  </svg>
                  <div className={`absolute inset-0 flex items-center justify-center font-black text-lg ${timer <= 5 ? 'text-red-400' : 'text-white'}`}>
                    {timer}
                  </div>
                </div>
              </div>

              {/* Question */}
              <div className="relative mb-4">
                <div className="absolute -inset-[1px] bg-gradient-to-r from-orange-500/20 via-red-500/20 to-orange-500/20 rounded-2xl blur-sm" />
                <div className="relative bg-black/50 rounded-2xl p-5 border border-white/10">
                  <p className="font-bold text-center leading-relaxed">{question.q}</p>
                </div>
              </div>

              {/* Colored Answer Bars */}
              <div className="space-y-2.5 mb-4">
                {question.options.map((opt, i) => {
                  const isCorrect = opt === question.a;
                  const isSelected = opt === selected;
                  const c = barColors[i];
                  let classes, dotClass;
                  if (showAnswer && isCorrect) {
                    classes = 'bg-gradient-to-r from-green-600/30 to-emerald-600/20 border-green-400/60 shadow-lg shadow-green-500/20';
                    dotClass = 'bg-green-500';
                  } else if (showAnswer && isSelected && !isCorrect) {
                    classes = 'bg-gradient-to-r from-red-600/30 to-red-700/20 border-red-400/60 shadow-lg shadow-red-500/20';
                    dotClass = 'bg-red-500';
                  } else if (showAnswer) {
                    classes = `bg-gradient-to-r ${c.bg} ${c.border} opacity-40`;
                    dotClass = c.dot;
                  } else {
                    classes = `bg-gradient-to-r ${c.bg} ${c.border} ${c.hover} shadow-md ${c.glow}`;
                    dotClass = c.dot;
                  }
                  return (
                    <button key={i} type="button" onClick={() => selectAnswer(opt)} disabled={showAnswer}
                      className={`relative w-full rounded-xl border flex items-center px-4 py-3.5 transition-all duration-200 ${!showAnswer ? 'hover:scale-[1.01] active:scale-[0.98]' : ''} ${classes}`}>
                      <span className={`w-3 h-3 rounded-full ${dotClass} mr-3 flex-shrink-0 shadow-sm`} />
                      <span className="font-semibold text-sm flex-1 text-left">{opt}</span>
                      {showAnswer && isCorrect && <span className="text-green-400 font-bold ml-2">✓</span>}
                      {showAnswer && isSelected && !isCorrect && <span className="text-red-400 font-bold ml-2">✗</span>}
                    </button>
                  );
                })}
              </div>

              {/* Cash Out Button */}
              {streak > 0 && !showAnswer && (
                <button type="button" onClick={cashOut}
                  className="w-full py-4 rounded-2xl font-black text-lg tracking-wide btn-3d btn-3d-green flex items-center justify-center gap-2"
                  style={{ boxShadow: '0 0 20px rgba(34,197,94,0.25), 0 4px 12px rgba(0,0,0,0.3)' }}>
                  <span className="text-lg">💰</span> Cash Out — {currentPrize} Coins
                </button>
              )}
            </div>
          )}

          {/* Results */}
          {phase === 'result' && (
            <div className="text-center py-2">
              <div className="relative inline-block mb-4">
                <div className="text-7xl" style={{ filter: didCashOut ? 'drop-shadow(0 0 20px rgba(34,197,94,0.5))' : 'drop-shadow(0 0 20px rgba(239,68,68,0.5))' }}>
                  {didCashOut ? '💰' : '💥'}
                </div>
              </div>
              <div className={`text-4xl font-black mb-1 ${didCashOut ? 'bg-gradient-to-r from-green-400 to-emerald-400' : 'bg-gradient-to-r from-red-400 to-orange-400'} bg-clip-text text-transparent`}>
                Streak: {maxStreak || streak}
              </div>
              <div className="text-gray-400 mb-5">
                {didCashOut ? 'Smart move! Coins secured.' : 'Your streak was broken!'}
              </div>
              {didCashOut && currentPrize > 0 && (
                <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20 rounded-2xl p-4 mb-5">
                  <div className="text-green-400 font-black text-2xl mb-1">🪙 +{currentPrize}</div>
                  <div className="text-green-400/60 text-xs">Coins secured</div>
                </div>
              )}
              {!didCashOut && (
                <div className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-500/20 rounded-2xl p-4 mb-5">
                  <div className="text-red-400 font-bold text-lg mb-1">0 Coins</div>
                  <div className="text-red-400/60 text-xs">Better luck next time!</div>
                </div>
              )}
              <button type="button" onClick={onClose} className="w-full py-4 rounded-2xl font-black text-lg tracking-wide btn-3d btn-3d-purple">
                Continue
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


// ============================================================================
// QUEST DETAIL MODAL — RPG Style
// ============================================================================
function QuestDetailModal({ quest, questProgress, questsComplete, onClose, onClaim, onNavigate, onPlayGame, closing }) {
  const isComplete = questsComplete.includes(quest.id);
  const allStepsDone = quest.steps.every(s => (questProgress[s.id] || 0) >= s.target);
  const canClaim = allStepsDone && !isComplete;

  const handleStepGo = (step) => {
    if (!step.go) return;
    onClose();
    if (step.go.game) {
      onNavigate('minigames');
      setTimeout(() => onPlayGame(step.go.game), 100);
    } else {
      onNavigate(step.go.tab);
    }
  };

  return (
    <div className={`fixed inset-0 bg-black/95 flex items-center justify-center z-[70] p-4 ${closing ? "anim-backdrop-close" : "anim-fade-in"}`} onClick={onClose}>
      <div className={`bg-gradient-to-b from-[#0a1828]/95 via-[#061018]/95 to-[#030810]/95 backdrop-blur-xl rounded-3xl max-w-md w-full border-0 overflow-hidden max-h-[90vh] overflow-y-auto ${closing ? "anim-modal-close" : "anim-scale-in"}`} onClick={(e) => e.stopPropagation()} style={{ scrollbarWidth: 'none' }}>
        
        {/* Hero Banner */}
        <div className="relative h-40 overflow-hidden">
          <img src={IMAGES[quest.image]} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#150e2e] via-[#150e2e]/60 to-transparent" />
          <div className="absolute top-4 right-4">
            <button type="button" onClick={onClose} className="w-9 h-9 flex items-center justify-center bg-black/50 hover:bg-black/70 rounded-full backdrop-blur-sm transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="absolute bottom-4 left-5 right-5">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${quest.diffColor}`}>{quest.difficulty}</span>
            <h2 className="font-black text-xl mt-1">{quest.name}</h2>
          </div>
        </div>

        <div className="px-5 pb-5">
          <p className="text-gray-400 text-sm my-4">{quest.desc}</p>

          {/* Steps with Go buttons */}
          <div className="space-y-3 mb-5">
            {quest.steps.map((step) => {
              const progress = questProgress[step.id] || 0;
              const done = progress >= step.target;
              const pct = Math.min(100, (progress / step.target) * 100);
              return (
                <div key={step.id} className={`rounded-xl border transition-all ${done ? 'bg-green-500/5 border-green-500/20' : 'bg-black/40 border-cyan-500/30'}`}>
                  <div className="flex items-center gap-3 p-3.5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg ${done ? 'bg-green-500/20' : 'bg-cyan-500/10'}`}>
                      {done ? '✅' : step.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className={`font-bold text-sm ${done ? 'text-green-400' : ''}`}>{step.desc}</span>
                        <span className={`text-xs font-bold ml-2 ${done ? 'text-green-400' : 'text-gray-500'}`}>{Math.min(progress, step.target)}/{step.target}</span>
                      </div>
                      {!done && (
                        <div className="h-1.5 bg-black/50 rounded-full overflow-hidden mt-1.5">
                          <div className="h-full rounded-full transition-all duration-500" style={{
                            width: `${pct}%`,
                            background: 'linear-gradient(90deg, #a855f7, #ec4899)'
                          }} />
                        </div>
                      )}
                    </div>
                    {/* Green Go button */}
                    {!done && step.go && (
                      <button type="button" onClick={() => handleStepGo(step)}
                        className="px-3 py-1.5 bg-green-500 hover:bg-green-600 rounded-lg text-xs font-bold flex-shrink-0 transition-all hover:scale-105 active:scale-95">
                        Go →
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Rewards */}
          <div className={`rounded-xl p-4 mb-4 border ${isComplete ? 'bg-green-500/5 border-green-500/20' : 'bg-black/40 border-cyan-500/30'}`}>
            <div className="text-xs font-bold text-gray-500 mb-2">{isComplete ? '✅ REWARDS CLAIMED' : '🎁 QUEST REWARDS'}</div>
            <div className="flex items-center gap-4">
              <span className="text-yellow-400 font-bold text-sm">🪙 {quest.reward.kwacha}</span>
              <span className="text-green-400 font-bold text-sm">💚 {quest.reward.gems}</span>
              {quest.reward.diamonds && <span className="text-cyan-400 font-bold text-sm">💎 {quest.reward.diamonds}</span>}
              <span className="text-cyan-400 font-bold text-sm">⚡ {quest.xp} XP</span>
            </div>
          </div>

          {/* Action Button */}
          {canClaim && (
            <button type="button" onClick={() => onClaim(quest)}
              className="w-full py-4 rounded-2xl font-black text-lg tracking-wide btn-3d btn-3d-green flex items-center justify-center gap-2"
              style={{ boxShadow: '0 0 20px rgba(34,197,94,0.25)' }}>
              🎉 Claim Rewards
            </button>
          )}
          {isComplete && (
            <div className="w-full py-3.5 bg-green-500/10 border border-green-500/20 rounded-xl font-bold text-center text-green-400">
              ✅ Quest Complete
            </div>
          )}
          {!canClaim && !isComplete && (
            <button type="button" onClick={() => { onClose(); onNavigate('minigames'); }}
              className="w-full py-4 rounded-2xl font-black text-lg tracking-wide btn-3d btn-3d-purple">
              Go Play →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


// ============================================================================
// DAILY TRIVIA CHALLENGE (3 questions: Easy → Medium → Hard)
// ============================================================================
function DailyTriviaChallenge({ user, onAnswer, onNavigate }) {
  const [questions] = useState(() => getDailyQuestions());
  const [qIndex, setQIndex] = useState(user.dailyTriviaProgress?.answered || 0);
  const [selected, setSelected] = useState(null);
  const [showAnswer, setShowAnswer] = useState(false);
  const [timer, setTimer] = useState(0);
  const [results, setResults] = useState(user.dailyTriviaProgress?.results || []);
  const [phase, setPhase] = useState(user.dailyTriviaProgress?.answered >= 3 ? 'complete' : 'playing'); // playing | reveal | next | complete
  const [countdownAnim, setCountdownAnim] = useState(false);
  const timerRef = useRef(null);

  const todayCat = questions[0]?.category || 'general';
  const catInfo = DAILY_CAT_INFO[todayCat] || DAILY_CAT_INFO.general;
  const allDone = phase === 'complete' || qIndex >= 3;
  const correctCount = results.filter(r => r).length;
  const isPerfect = correctCount === 3;
  const streakMult = getDailyStreakMult(user.dailyTriviaStreak || 0);

  // Start timer for current question
  useEffect(() => {
    if (phase !== 'playing' || allDone || qIndex >= 3) return;
    const diff = DAILY_DIFFICULTY[qIndex];
    setTimer(diff.time);
    setSelected(null);
    setShowAnswer(false);
    timerRef.current = setInterval(() => {
      setTimer(t => {
        if (t <= 6 && t > 0) setCountdownAnim(true);
        if (t <= 1) {
          clearInterval(timerRef.current);
          setShowAnswer(true);
          setPhase('reveal');
          const newResults = [...results, false];
          setResults(newResults);
          setTimeout(() => advance(newResults), 2000);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { clearInterval(timerRef.current); setCountdownAnim(false); };
  }, [qIndex, phase]);

  const selectAnswer = (opt) => {
    if (showAnswer || selected || phase !== 'playing') return;
    clearInterval(timerRef.current);
    setSelected(opt);
    setShowAnswer(true);
    setPhase('reveal');
    setCountdownAnim(false);
    const correct = opt === questions[qIndex].a;
    const newResults = [...results, correct];
    setResults(newResults);
    setTimeout(() => advance(newResults), 1800);
  };

  const advance = (newResults) => {
    const nextIdx = qIndex + 1;
    if (nextIdx >= 3) {
      setPhase('complete');
      onAnswer(newResults);
    } else {
      setQIndex(nextIdx);
      setPhase('playing');
    }
  };

  // COMPLETE STATE
  if (allDone) {
    const finalResults = results.length >= 3 ? results : user.dailyTriviaProgress?.results || [];
    const finalCorrect = finalResults.filter(r => r).length;
    const finalPerfect = finalCorrect === 3;
    const baseReward = finalResults.reduce((sum, r, i) => sum + (r ? DAILY_DIFFICULTY[i].reward : 0), 0);
    const totalCoins = Math.floor((baseReward + (finalPerfect ? DAILY_PERFECT_BONUS.coins : 0)) * streakMult);
    return (
      <div className="dh-hero-card overflow-hidden" style={{ border: finalPerfect ? '1.5px solid rgba(255,215,0,.3)' : '1.5px solid rgba(6,182,212,.2)' }}>
        <div className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${finalPerfect ? 'bg-amber-500/15' : 'bg-cyan-500/10'}`}>
              {finalPerfect ? <Trophy className="w-6 h-6 text-amber-400" /> : finalCorrect > 0 ? <Target className="w-6 h-6 text-cyan-400" /> : <XCircle className="w-6 h-6 text-gray-500" />}
            </div>
            <div className="flex-1">
              <div className="font-bold text-sm">
                {finalPerfect ? 'Perfect Score!' : finalCorrect > 0 ? 'Today\'s Trivia — Done' : 'Today\'s Trivia — Done'}
              </div>
              <div className={`text-xs ${finalPerfect ? 'text-amber-400' : finalCorrect > 0 ? 'text-cyan-400' : 'text-gray-500'}`}>
                {finalPerfect 
                  ? `+${totalCoins} Coins + ${DAILY_PERFECT_BONUS.gems} Gems earned` 
                  : finalCorrect > 0 
                    ? `${finalCorrect}/3 Correct — +${totalCoins} Coins earned`
                    : '0/3 — Better luck tomorrow!'
                }
                {streakMult > 1 && <span className="text-cyan-400 ml-1">({streakMult}x streak)</span>}
              </div>
            </div>
          </div>
          <div className="flex gap-2 mb-3">
            {finalResults.map((r, i) => (
              <div key={i} className={`flex-1 p-2.5 rounded-xl text-center border ${r ? 'bg-green-500/8 border-green-500/20' : 'bg-red-500/5 border-red-500/15'}`}>
                <div className="text-[10px] font-bold mb-1" style={{ color: DAILY_DIFFICULTY[i].color }}>{DAILY_DIFFICULTY[i].label}</div>
                {r ? <CheckCircle className="w-5 h-5 text-green-400 mx-auto" /> : <XCircle className="w-5 h-5 text-red-400/60 mx-auto" />}
              </div>
            ))}
          </div>
          {(user.dailyTriviaStreak || 0) > 1 && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/6 border border-amber-500/12">
              <Flame className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-amber-400">{user.dailyTriviaStreak} Day Streak — {streakMult}x Multiplier!</span>
            </div>
          )}
          {finalCorrect === 0 && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-white/[.02] border border-white/[.04] mt-2">
              <Timer className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-[10px] text-gray-500">New questions drop at midnight — come back stronger!</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // PLAYING STATE
  const q = questions[qIndex];
  const diff = DAILY_DIFFICULTY[qIndex];
  if (!q) return null;

  return (
    <div className="dh-hero-card overflow-hidden" style={{ border: `1.5px solid ${diff.border}`, animation: 'dhGlowBorder 3s ease-in-out infinite' }}>
      <style>{`
        @keyframes dtPop{0%{transform:scale(.85);opacity:0}60%{transform:scale(1.04)}100%{transform:scale(1);opacity:1}}
        @keyframes dtShake{0%,100%{transform:translateX(0)}15%{transform:translateX(-6px)}30%{transform:translateX(5px)}45%{transform:translateX(-4px)}60%{transform:translateX(3px)}75%{transform:translateX(-2px)}}
        @keyframes dtTimerPulse{0%,100%{transform:scale(1)}50%{transform:scale(1.15)}}
        @keyframes dtGlow{0%,100%{box-shadow:0 0 0 0 ${diff.color}30}50%{box-shadow:0 0 20px 4px ${diff.color}15}}
        @keyframes dtSlideUp{0%{transform:translateY(12px);opacity:0}100%{transform:translateY(0);opacity:1}}
        .dt-correct{animation:dtPop .4s ease both}
        .dt-wrong{animation:dtShake .5s ease both}
      `}</style>

      {/* Header with category + progress */}
      <div className="px-5 pt-4 pb-3 flex items-center justify-between" style={{ borderBottom: `1px solid ${diff.border}` }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: diff.bg }}>
            {catInfo.Icon ? <catInfo.Icon className="w-5 h-5" style={{ color: catInfo.color }} /> : <Target className="w-5 h-5 text-cyan-400" />}
          </div>
          <div>
            <div className="font-bold text-sm flex items-center gap-2">
              <Target className="w-3.5 h-3.5 text-cyan-400" /> Daily Trivia
              <span className="px-2 py-0.5 rounded-md text-[10px] font-black tracking-wider" style={{ background: diff.bg, color: diff.color, border: `1px solid ${diff.border}` }}>
                {diff.label.toUpperCase()}
              </span>
            </div>
            <div className="text-xs text-gray-500">{catInfo.name} — Q{qIndex + 1} of 3</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Progress dots */}
          <div className="flex gap-1.5">
            {[0, 1, 2].map(i => (
              <div key={i} className="w-2.5 h-2.5 rounded-full transition-all" style={{
                background: i < qIndex ? (results[i] ? '#22c55e' : '#ef4444') : i === qIndex ? diff.color : 'rgba(255,255,255,.1)',
                boxShadow: i === qIndex ? `0 0 8px ${diff.color}40` : 'none',
              }} />
            ))}
          </div>
          {/* Timer */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold font-mono ${timer <= 5 ? 'bg-red-500/20 text-red-400' : 'text-white'}`}
            style={{ background: timer > 5 ? diff.bg : undefined, animation: countdownAnim ? 'dtTimerPulse .5s ease infinite' : 'none' }}>
            <Clock className="w-3.5 h-3.5" /> {timer}s
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="p-5" style={{ animation: 'dtSlideUp .35s ease-out' }}>
        <div className="p-3.5 rounded-xl mb-4 border border-white/8" style={{ background: 'rgba(0,0,0,.3)' }}>
          <p className="font-bold text-sm leading-relaxed">{q.q}</p>
        </div>

        {/* Reward preview */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-bold text-gray-500 tracking-widest">PICK YOUR ANSWER</span>
          <span className="text-xs font-bold flex items-center gap-1" style={{ color: diff.color }}>+{diff.reward} <Medal className="w-3 h-3 text-yellow-500" /></span>
        </div>

        {/* Options */}
        <div className="grid grid-cols-2 gap-2.5">
          {q.options.map((opt, i) => {
            const isCorrect = opt === q.a;
            const isSelected = opt === selected;
            let classes = 'bg-black/30 border border-white/8 hover:border-cyan-500/30 hover:bg-cyan-500/8';
            let extraStyle = {};
            if (showAnswer) {
              if (isCorrect) { classes = 'dt-correct border-2'; extraStyle = { background: 'rgba(34,197,94,.12)', borderColor: 'rgba(34,197,94,.5)', boxShadow: '0 0 15px rgba(34,197,94,.15)' }; }
              else if (isSelected && !isCorrect) { classes = 'dt-wrong border-2'; extraStyle = { background: 'rgba(239,68,68,.12)', borderColor: 'rgba(239,68,68,.5)' }; }
              else { classes = 'bg-black/20 border border-white/3 opacity-40'; }
            }
            return (
              <button key={i} type="button" onClick={() => selectAnswer(opt)} disabled={showAnswer}
                className={`p-3 rounded-xl font-medium text-xs transition-all ${classes}`}
                style={{ ...extraStyle, animationDelay: showAnswer && isCorrect ? '.1s' : '0s' }}>
                <span className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold" style={{
                    background: showAnswer ? (isCorrect ? 'rgba(34,197,94,.2)' : isSelected ? 'rgba(239,68,68,.2)' : 'rgba(255,255,255,.05)') : 'rgba(255,255,255,.06)',
                    color: showAnswer ? (isCorrect ? '#22c55e' : isSelected ? '#ef4444' : '#555') : '#888',
                  }}>
                    {showAnswer ? (isCorrect ? '✓' : isSelected ? '✗' : String.fromCharCode(65 + i)) : String.fromCharCode(65 + i)}
                  </span>
                  {opt}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function GamificationPlatform() {
  const [tab, setTab] = useState('overview');
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

  // Screen flash effect
  const triggerFlash = useCallback((color = 'gold') => {
    setScreenFlash(color);
    setTimeout(() => setScreenFlash(null), 400);
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

  // Master reward trigger — composes all effects based on tier
  const triggerReward = useCallback((tier, sourceEl, rewards = {}) => {
    const rect = sourceEl?.getBoundingClientRect?.() || { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 };
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    if (tier === 'small') {
      // Tier 1: ~1.2s — quick burst + fly-to-header + floating numbers
      spawnParticles(cx, cy, 12, { type: 'coin', spread: 160, speed: 6, life: 30, gravity: 0.2 });
      spawnParticles(cx, cy, 6, { type: 'sparkle', spread: 200, speed: 4, life: 25, size: 10, gravity: 0.15 });
      if (rewards.coins) {
        spawnFlyingCoin(cx, cy, 'coin');
        spawnFloatingNumber(`+${rewards.coins}`, cx, cy - 20, '#EAB308');
      }
      if (rewards.gems) {
        setTimeout(() => spawnFlyingCoin(cx, cy, 'gem'), 150);
        spawnFloatingNumber(`+${rewards.gems}`, cx + 40, cy - 20, '#10B981');
      }
      if (rewards.xp) spawnFloatingNumber(`+${rewards.xp} XP`, cx - 40, cy - 20, '#22D3EE');
    }
    else if (tier === 'medium') {
      // Tier 2: ~2.2s — burst + flash + short confetti shower
      triggerFlash('gold');
      spawnParticles(cx, cy, 22, { type: 'coin', spread: 180, speed: 7, life: 40, gravity: 0.18 });
      spawnParticles(cx, cy, 10, { type: 'star', spread: 240, speed: 5, life: 35, size: 12, gravity: 0.15 });
      spawnParticles(cx, cy, 8, { type: 'sparkle', spread: 360, speed: 4, life: 30, size: 10, gravity: 0.12 });
      if (rewards.coins) {
        spawnFlyingCoin(cx, cy, 'coin');
        spawnFloatingNumber(`+${rewards.coins}`, cx, cy - 30, '#EAB308');
      }
      if (rewards.gems) {
        setTimeout(() => spawnFlyingCoin(cx, cy, 'gem'), 200);
        spawnFloatingNumber(`+${rewards.gems}`, cx + 50, cy - 30, '#10B981');
      }
      if (rewards.diamonds) {
        setTimeout(() => spawnFlyingCoin(cx, cy, 'diamond'), 350);
        spawnFloatingNumber(`+${rewards.diamonds}`, cx - 50, cy - 30, '#3B82F6');
      }
      if (rewards.xp) spawnFloatingNumber(`+${rewards.xp} XP`, cx, cy - 60, '#22D3EE');
      // Short confetti shower — 15 particles over 0.6s, each lives ~1.2s
      for (let i = 0; i < 15; i++) {
        setTimeout(() => {
          spawnParticles(Math.random() * window.innerWidth, -10, 1, {
            type: ['coin', 'star', 'sparkle'][Math.floor(Math.random() * 3)],
            spread: 30, speed: 2, gravity: 0.14, life: 65, size: 13
          });
        }, i * 40);
      }
    }
    else if (tier === 'big') {
      // Tier 3: ~3s — full celebration, everything wraps by 3s
      triggerFlash('gold');
      triggerShake();
      // Initial burst — high speed, moderate life so they scatter fast and fade
      spawnParticles(cx, cy, 35, { type: 'coin', spread: 360, speed: 9, life: 45, gravity: 0.2 });
      spawnParticles(cx, cy, 18, { type: 'star', spread: 360, speed: 7, life: 40, size: 14, gravity: 0.18 });
      spawnParticles(cx, cy, 14, { type: 'sparkle', spread: 360, speed: 6, life: 35, size: 12, gravity: 0.15 });
      // Firework bursts — tighter timing, shorter life
      setTimeout(() => spawnParticles(window.innerWidth * 0.3, window.innerHeight * 0.3, 14, { type: 'star', spread: 360, speed: 6, life: 35, size: 12, gravity: 0.18 }), 300);
      setTimeout(() => spawnParticles(window.innerWidth * 0.7, window.innerHeight * 0.25, 14, { type: 'sparkle', spread: 360, speed: 6, life: 35, size: 12, gravity: 0.18 }), 550);
      // Currency fly
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
      if (rewards.xp) spawnFloatingNumber(`+${rewards.xp} XP`, cx, cy - 70, '#22D3EE');
      // Confetti rain — 25 particles over 1s, each lives ~1.1s, heavier gravity pulls them down naturally
      for (let i = 0; i < 25; i++) {
        setTimeout(() => {
          spawnParticles(Math.random() * window.innerWidth, -10, 1, {
            type: ['coin', 'star', 'sparkle', 'fire'][Math.floor(Math.random() * 4)],
            spread: 35, speed: 2.5, gravity: 0.16, life: 60, size: 15
          });
        }, i * 40);
      }
    }
  }, [spawnParticles, spawnFlyingCoin, spawnFloatingNumber, triggerFlash, triggerShake]);

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
      * { font-family: 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif; }
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
      
      /* Cyan 3D button */
      .btn-3d-purple {
        background: linear-gradient(180deg, #22D3EE 0%, #06B6D4 40%, #0891B2 100%);
        color: #000;
        text-shadow: none;
        box-shadow: 
          0 4px 0 #0E7490,
          0 6px 20px rgba(6,182,212,0.4),
          0 0 20px rgba(34,211,238,0.15),
          inset 0 1px 0 rgba(255,255,255,0.3),
          inset 0 -1px 0 rgba(0,0,0,0.2);
      }
      .btn-3d-purple:hover {
        box-shadow: 
          0 6px 0 #0E7490,
          0 10px 30px rgba(6,182,212,0.5),
          0 0 30px rgba(34,211,238,0.25),
          inset 0 1px 0 rgba(255,255,255,0.35);
      }
      .btn-3d-purple:active {
        box-shadow: 
          0 1px 0 #0E7490,
          0 2px 8px rgba(6,182,212,0.3),
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
      
      /* ===== SOFT CARD SYSTEM ===== */
      .card-soft {
        background: linear-gradient(145deg, rgba(30,21,69,0.85) 0%, rgba(15,10,31,0.9) 100%);
        border: 1px solid rgba(168,85,247,0.08);
        box-shadow: 
          0 4px 24px rgba(0,0,0,0.3),
          0 0 0 1px rgba(168,85,247,0.06),
          inset 0 1px 0 rgba(255,255,255,0.04);
        border-radius: 20px;
        backdrop-filter: blur(12px);
      }
      .card-soft:hover {
        border-color: rgba(168,85,247,0.15);
        box-shadow: 
          0 8px 32px rgba(0,0,0,0.4),
          0 0 0 1px rgba(168,85,247,0.1),
          inset 0 1px 0 rgba(255,255,255,0.06);
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
        0%, 100% { box-shadow: 0 0 8px rgba(6, 182, 212, 0.4); }
        50% { box-shadow: 0 0 24px rgba(6, 182, 212, 0.7), 0 0 48px rgba(6, 182, 212, 0.3); }
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
        0%, 100% { border-color: rgba(6, 182, 212, 0.08); }
        50% { border-color: rgba(6, 182, 212, 0.3); }
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
        animation: rewardScreenFlash 0.4s ease-out forwards;
      }
      .reward-screen-flash-gold { background: radial-gradient(ellipse at center, rgba(234,179,8,0.3) 0%, rgba(234,179,8,0) 70%); }
      .reward-screen-flash-cyan { background: radial-gradient(ellipse at center, rgba(6,182,212,0.3) 0%, rgba(6,182,212,0) 70%); }
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
        box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5), 0 0 20px rgba(6, 182, 212, 0.15);
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
      
      /* ===== BOLD INTERACTIVE ELEMENTS ===== */
      .card-interactive {
        border: 2px solid rgba(255,255,255,0.15);
        border-radius: 20px;
        background: rgba(10,15,25,0.92);
        backdrop-filter: blur(12px);
        box-shadow: 0 4px 24px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05);
        transition: all 0.25s cubic-bezier(0.22,1,0.36,1);
      }
      .card-interactive:hover {
        border-color: rgba(6,182,212,0.6);
        box-shadow: 0 0 20px rgba(6,182,212,0.2), 0 8px 32px rgba(0,0,0,0.6);
        transform: translateY(-4px);
      }
      .match-card {
        border: 2px solid rgba(255,255,255,0.12);
        border-radius: 20px;
        box-shadow: 0 4px 24px rgba(0,0,0,0.6);
        background: rgba(10,15,25,0.92);
        backdrop-filter: blur(12px);
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
        border-color: rgba(6,182,212,0.7);
        background: rgba(6,182,212,0.2);
        box-shadow: 0 0 20px rgba(6,182,212,0.3), 0 2px 0 rgba(0,0,0,0.3);
        transform: translateY(-2px);
      }
      .tab-btn-active {
        background: linear-gradient(180deg, #22D3EE 0%, #06B6D4 40%, #0891B2 100%);
        color: #000;
        font-weight: 900;
        box-shadow: 0 4px 0 #0E7490, 0 6px 20px rgba(6,182,212,0.35), 0 0 20px rgba(34,211,238,0.15), inset 0 1px 0 rgba(255,255,255,0.3);
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
        border-color: rgba(6,182,212,0.5);
        background: rgba(6,182,212,0.15);
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
    gamePlays: { wheel: 3, scratch: 5, dice: 5, memory: 3, highlow: 5, plinko: 5, tapfrenzy: 5, stopclock: 5, treasure: 3, mines: 5 },
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
    trackMission('gamePlayed', { gameId: 'wheel', coinsWon: typeof prize === 'number' ? prize : (prize.kwacha || 0), gamesSet: gamesPlayedToday });
    trackQuest('wheelSpun', {});
    trackQuest('gamePlayed', { gameId: 'wheel' });
    trackQuest('coinsEarned', { amount: typeof prize === 'number' ? prize : (prize.kwacha || 0) });
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 1500);
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
          case 'treasureSurvive':
            if (actionType === 'gamePlayed' && metadata.gameId === 'treasure' && metadata.survivedNoTrap) {
              setTo = 1;
            }
            break;
          case 'treasureJackpot':
            if (actionType === 'gamePlayed' && metadata.gameId === 'treasure' && metadata.foundCrown) {
              setTo = 1;
            }
            break;
          case 'memoryFast':
            if (actionType === 'gamePlayed' && metadata.gameId === 'memory' && metadata.memoryMoves && metadata.memoryMoves < 16) {
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
    setShowConfetti(true);
    setTimeout(() => setShowConfetti(false), 3000);
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
    { id: 'overview', icon: Home, label: 'Overview' },
    { id: 'missions', icon: Target, label: 'Missions' },
    { id: 'quests', icon: Map, label: 'Quests' },
    { id: 'minigames', icon: Gamepad2, label: 'Games' },
    { id: 'store', icon: Store, label: 'Store' },
    { id: 'predictions', icon: Trophy, label: 'Predict' },
    { id: 'daily', icon: Gift, label: 'Daily' },
    { id: 'vip', icon: Crown, label: 'VIP' },
    { id: 'referrals', icon: Users, label: 'Refer' },
    { id: 'leaderboard', icon: Medal, label: 'Leaders' },
    { id: 'profile', icon: User, label: 'Profile' },
  ];

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
            <div className="rounded-2xl overflow-hidden" style={{ background: 'linear-gradient(180deg, #0c1a2e 0%, #030810 100%)', border: '2px solid rgba(6,182,212,0.25)' }}>
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
                        style={{ border: `1.5px solid ${pkg.best ? 'rgba(6,182,212,0.6)' : colors.border}`, background: pkg.best ? 'rgba(6,182,212,0.08)' : colors.bg, boxShadow: pkg.best ? '0 0 20px rgba(6,182,212,0.15)' : 'none' }}
                      >
                        {pkg.best && <span className="absolute -top-2.5 right-3 px-2 py-0.5 bg-cyan-500 text-black text-xs font-black rounded-md">BEST VALUE</span>}
                        <div className="flex items-center gap-3">
                          <img src={CURRENCY_ICONS[showBuyModal === 'coins' ? 'coin' : showBuyModal === 'gems' ? 'gem' : 'diamond']} alt="" className="w-10 h-10 object-contain" />
                          <div className="text-left">
                            <div className={`font-black text-xl ${colors.text}`}>{pkg.amount.toLocaleString()}</div>
                            {pkg.bonus && <div className="text-xs text-cyan-400 font-bold">{pkg.bonus}</div>}
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
            setUser(u => ({ ...u, gamesPlayed: u.gamesPlayed + 1, dailyTasksDone: [...new Set([...u.dailyTasksDone, 'game'])] }));
            setGamesPlayedToday(prev => new Set([...prev, 'dice']));
            trackMission('gamePlayed', { gameId: 'dice', coinsWon: n, gamesSet: gamesPlayedToday });
            trackQuest('gamePlayed', { gameId: 'dice' });
            trackQuest('coinsEarned', { amount: n });
          }} 
        />
      )}
      {activeGame === 'memory' && (
        <MemoryGame 
          onClose={() => animateClose(() => setActiveGame(null))} closing={closingModal} 
          onWin={(n, meta) => {
            addCoins(n);
            addXP(20);
            showNotif(`🎉 +${n} Coins + 20 XP!`);
            setUser(u => ({ ...u, gamesPlayed: u.gamesPlayed + 1, dailyTasksDone: [...new Set([...u.dailyTasksDone, 'game'])] }));
            setGamesPlayedToday(prev => new Set([...prev, 'memory']));
            trackMission('gamePlayed', { gameId: 'memory', coinsWon: n, memoryMoves: meta?.moves, gamesSet: gamesPlayedToday });
            trackQuest('gamePlayed', { gameId: 'memory' });
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
            setUser(u => ({ ...u, gamesPlayed: u.gamesPlayed + 1, dailyTasksDone: [...new Set([...u.dailyTasksDone, 'game'])] }));
            setGamesPlayedToday(prev => new Set([...prev, 'stopclock']));
            trackMission('gamePlayed', { gameId: 'stopclock', coinsWon: n, clockDiff: meta?.diff, gamesSet: gamesPlayedToday });
            trackQuest('gamePlayed', { gameId: 'stopclock' });
            trackQuest('coinsEarned', { amount: n });
          }} 
        />
      )}
      {activeGame === 'treasure' && (
        <TreasureHuntGame 
          onClose={() => animateClose(() => setActiveGame(null))} closing={closingModal} 
          onWin={(n, meta) => {
            addCoins(n);
            showNotif(`🎉 +${n} Coins!`);
            setUser(u => ({ ...u, gamesPlayed: u.gamesPlayed + 1, dailyTasksDone: [...new Set([...u.dailyTasksDone, 'game'])] }));
            setGamesPlayedToday(prev => new Set([...prev, 'treasure']));
            trackMission('gamePlayed', { gameId: 'treasure', coinsWon: n, foundCrown: meta?.foundCrown, survivedNoTrap: meta?.survivedNoTrap, gamesSet: gamesPlayedToday });
            trackQuest('gamePlayed', { gameId: 'treasure' });
            trackQuest('coinsEarned', { amount: n });
          }} 
        />
      )}



      {/* Mines Game */}
      {activeGame === 'mines' && (
        <MinesGame 
          onClose={() => animateClose(() => setActiveGame(null))} closing={closingModal} 
          onWin={(n) => {
            addCoins(n);
            showNotif(`💎 +${n} Coins from Mines!`);
            setUser(u => ({ ...u, gamesPlayed: u.gamesPlayed + 1, dailyTasksDone: [...new Set([...u.dailyTasksDone, 'game'])] }));
            setGamesPlayedToday(prev => new Set([...prev, 'mines']));
            trackMission('gamePlayed', { gameId: 'mines', coinsWon: n, gamesSet: gamesPlayedToday });
            trackQuest('gamePlayed', { gameId: 'mines' });
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
            trackMission('triviaPlayed', { triviaType: 'speed', speedScore: meta?.triviaCorrect });
            trackQuest('triviaPlayed', {});
            trackQuest('speedScore', { score: meta?.triviaCorrect || 0 });
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
            trackMission('triviaPlayed', { triviaType: 'streak', triviaStreak: meta?.triviaStreak });
            trackQuest('triviaPlayed', {});
            if (meta?.triviaStreak) { trackMission('triviaCorrect', { count: meta.triviaStreak }); trackQuest('triviaCorrect', { count: meta.triviaStreak }); trackQuest('triviaStreak', { streak: meta.triviaStreak }); }
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
          onNavigate={(tabId) => setTab(tabId)}
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
          onNavigate={(tabId) => setTab(tabId)}
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
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-5xl shadow-lg shadow-cyan-500/50 anim-float">
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
                  className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl transition-all hover:scale-110 ${user.avatar === avatar ? 'bg-gradient-to-br from-cyan-400 to-blue-500 ring-2 ring-cyan-400' : 'bg-black/40 hover:bg-cyan-900/30 border border-white/10'}`}
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
              <div className="text-[10px] text-cyan-400 font-bold tracking-wider">REWARDS</div>
            </div>
          </div>

          {/* User Profile Card */}
          <div className="mb-5 p-3 rounded-2xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setShowAvatarSelector(true)}
                className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-lg hover:scale-105 transition-transform group flex-shrink-0"
              >
                {user.avatar}
                <div className="absolute inset-0 bg-black/50 rounded-xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <span className="text-[9px]">Edit</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => setTab('profile')}
                className="flex-1 text-left min-w-0"
              >
                <div className="font-bold text-sm truncate">Player1</div>
                <div className="text-[11px] text-gray-500">{level.icon} {level.name}</div>
              </button>
            </div>
            <div className="mt-2.5 h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full progress-animated"
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
              const active = tab === t.id;
              const hasNotif = (t.id === 'daily' && user.streak > 0) || (t.id === 'missions' && user.missionsComplete.length === 0) || (t.id === 'store');
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => { setTab(t.id); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-left transition-all duration-200 relative group ${active ? 'text-white font-bold' : 'text-gray-400 hover:text-white hover:bg-white/[0.06] font-medium'}`}
                  style={active ? {
                    background: 'linear-gradient(135deg, rgba(6,182,212,0.15) 0%, rgba(6,182,212,0.08) 100%)',
                    borderLeft: '3px solid #22D3EE',
                  } : {
                    borderLeft: '3px solid transparent',
                  }}
                >
                  <Icon className={`w-[18px] h-[18px] transition-all duration-200 ${active ? 'text-cyan-400' : 'group-hover:text-cyan-300 group-hover:scale-110'}`} />
                  <span className="text-[13px]">{t.label}</span>
                  {hasNotif && !active && (
                    <span className="ml-auto w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
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
                className="py-1.5 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-400 rounded-lg text-[10px] font-bold transition-all active:scale-95"
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
                  <div className="font-bold text-xs text-cyan-400 leading-tight">{level.name}</div>
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
          {/* OVERVIEW TAB */}
          {/* ============================================================= */}
          {tab === 'overview' && (
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
                      onClick={() => {
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
                        <div key={d} className={`h-1 flex-1 rounded-full ${d < user.dailyDay ? 'bg-green-500' : d === user.dailyDay ? (user.dailyClaimed ? 'bg-green-500' : 'bg-cyan-400') : 'bg-white/5'}`} />
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
                      <span className="absolute top-2.5 right-2.5 px-2 py-0.5 bg-cyan-500 rounded-md text-[10px] font-bold tracking-wider">
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
                <div onClick={() => setTab('predictions')} className="rounded-2xl overflow-hidden transition-all group cursor-pointer" style={{ background: 'rgba(10,15,25,0.85)', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 2px 12px rgba(0,0,0,0.3)' }}>
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
                onClick={() => setTab('minigames')}
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
                    onClick={() => setTab('daily')}
                    className="rounded-2xl p-3.5 cursor-pointer transition-all group"
                    style={{ background: 'rgba(10,15,25,0.7)', border: dtAll ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(255,255,255,0.06)' }}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${dtAll ? 'bg-green-500/12' : 'bg-cyan-500/8'}`}>
                        {dtAll ? <CheckCircle className="w-4.5 h-4.5 text-green-400" /> : <Gift className="w-4.5 h-4.5 text-cyan-400" />}
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
                      <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-cyan-400 transition-colors" />
                    </div>
                    <div className="h-1 bg-white/[0.03] rounded-full overflow-hidden mt-2.5">
                      <div className="h-full rounded-full transition-all duration-700" style={{
                        width: `${(dtCount / 3) * 100}%`,
                        background: dtAll ? 'linear-gradient(90deg,#22c55e,#10b981)' : 'linear-gradient(90deg,#22D3EE,#06B6D4)',
                      }} />
                    </div>
                  </div>
                );
              })()}

              {/* === MISSIONS SECTION — Compact horizontal scroll === */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-cyan-400" />
                    <h2 className="text-base font-bold">Active Missions</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTab('missions')}
                    className="text-xs text-gray-500 hover:text-cyan-400 flex items-center gap-0.5 transition-colors font-medium"
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
                            <div className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full transition-all" style={{ width: `${pctM}%` }} />
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-[10px]">
                              <span className="text-yellow-400 font-bold">🪙 {m.reward.kwacha}</span>
                              {m.reward.gems && <span className="text-green-400 font-bold">💚 {m.reward.gems}</span>}
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
                    className="text-xs text-gray-500 hover:text-cyan-400 flex items-center gap-0.5 transition-colors font-medium"
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
                        <div className="text-yellow-400 font-bold text-[10px]">🪙 {item.price.kwacha}</div>
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
          {tab === 'minigames' && (
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
          {tab === 'missions' && (
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
                  className="ml-auto p-2 bg-cyan-600/20 hover:bg-cyan-600/40 rounded-xl"
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
                          className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-all duration-500" 
                          style={{ width: `${(completedCount / dailyMissions.length) * 100}%` }} 
                        />
                      </div>
                      {/* Bonus chest reward for completing all */}
                      <div className={`flex items-center justify-between p-3 rounded-xl border ${allDone ? 'bg-yellow-500/10 border-yellow-500/30' : 'bg-black/40 border-cyan-900/20'}`}>
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{allDone ? '🎁' : '🔒'}</span>
                          <div>
                            <div className="font-bold text-sm">Daily Bonus Chest</div>
                            <div className="text-xs text-gray-400">Complete all 8 missions</div>
                          </div>
                        </div>
                        <div className="text-right text-sm">
                          <span className="text-yellow-400 font-bold">500 🪙</span>
                          <span className="text-green-400 font-bold ml-2">10 💚</span>
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
                            className={`rounded-3xl overflow-hidden border text-left transition-all duration-300 group relative ${done ? 'border-green-500/50 opacity-60' : 'border-cyan-500/30 card-interactive hover:scale-[1.02] active:scale-[0.98]'}`}
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
                                <span className="text-yellow-400 font-bold">🪙 {m.reward.kwacha}</span>
                                {m.reward.gems && <span className="text-green-400 font-bold">💚 {m.reward.gems}</span>}
                                <span className="text-cyan-400 font-bold">⚡ {m.xp}</span>
                              </div>
                              <div className="h-1.5 bg-black/50 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${done ? 'bg-green-500' : 'bg-gradient-to-r from-cyan-400 to-blue-500'}`} 
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
                        className={`rounded-3xl overflow-hidden border text-left transition-all duration-300 group relative ${done ? 'border-green-500/50 opacity-60' : 'border-cyan-500/30 card-interactive hover:scale-[1.02] active:scale-[0.98]'}`}
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
                            <span className="text-yellow-400 font-bold">🪙 {m.reward.kwacha}</span>
                            {m.reward.gems && <span className="text-green-400 font-bold">💚 {m.reward.gems}</span>}
                            <span className="text-cyan-400 font-bold">⚡ {m.xp}</span>
                          </div>
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-xs text-gray-500">{Math.min(progress, m.target)}/{m.target}</span>
                          </div>
                          <div className="h-2 bg-black/50 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${done ? 'bg-green-500' : 'bg-gradient-to-r from-cyan-400 to-blue-500'}`} 
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
                        className={`rounded-3xl overflow-hidden border text-left transition-all duration-300 group relative ${done ? 'border-green-500/50 opacity-60' : 'border-cyan-500/30 card-interactive hover:scale-[1.02] active:scale-[0.98]'}`}
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
                            <span className="text-yellow-400 font-bold">🪙 {m.reward.kwacha}</span>
                            {m.reward.gems && <span className="text-green-400 font-bold">💚 {m.reward.gems}</span>}
                            <span className="text-cyan-400 font-bold">⚡ {m.xp}</span>
                          </div>
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-xs text-gray-500">{Math.min(progress, m.target)}/{m.target}</span>
                          </div>
                          <div className="h-2 bg-black/50 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${done ? 'bg-green-500' : 'bg-gradient-to-r from-cyan-400 to-blue-500'}`} 
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
          {tab === 'daily' && (() => {
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
                @keyframes dhPulseRing{0%{box-shadow:0 0 0 0 rgba(6,182,212,.4)}70%{box-shadow:0 0 0 10px rgba(6,182,212,0)}100%{box-shadow:0 0 0 0 rgba(6,182,212,0)}}
                @keyframes dhShimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
                @keyframes dhFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}
                @keyframes dhCoinSpin{0%{transform:rotateY(0)}100%{transform:rotateY(360deg)}}
                @keyframes dhGlowBorder{0%,100%{border-color:rgba(6,182,212,.25)}50%{border-color:rgba(6,182,212,.55)}}
                .dh-card{border:1.5px solid rgba(255,255,255,.08);border-radius:20px;box-shadow:0 4px 24px rgba(0,0,0,.5);background:rgba(10,15,25,.92);backdrop-filter:blur(12px);transition:all .3s ease}
                .dh-card:hover{border-color:rgba(6,182,212,.2);box-shadow:0 4px 30px rgba(0,0,0,.6),0 0 20px rgba(6,182,212,.05)}
                .dh-hero-card{border:1.5px solid rgba(6,182,212,.3);border-radius:20px;box-shadow:0 4px 24px rgba(0,0,0,.5),0 0 40px rgba(6,182,212,.06);background:linear-gradient(135deg,rgba(10,15,25,.95),rgba(6,30,50,.9));backdrop-filter:blur(12px)}
                .dh-glow-btn{position:relative;overflow:hidden}
                .dh-glow-btn::after{content:'';position:absolute;top:0;left:-100%;width:60%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.12),transparent);transition:none}
                .dh-glow-btn:hover::after{left:100%;transition:left .6s ease}
                .dh-go-btn{display:flex;align-items:center;gap:4px;padding:4px 10px;border-radius:8px;font-size:11px;font-weight:700;color:#22D3EE;background:rgba(6,182,212,.08);border:1px solid rgba(6,182,212,.2);transition:all .2s;cursor:pointer;white-space:nowrap}
                .dh-go-btn:hover{background:rgba(6,182,212,.15);border-color:rgba(6,182,212,.4);transform:translateX(2px)}
                .dh-segment{height:8px;border-radius:99px;transition:all .5s cubic-bezier(.4,0,.2,1);position:relative;overflow:hidden}
                .dh-segment-filled{background:linear-gradient(90deg,#22D3EE,#06B6D4)}
                .dh-segment-filled::after{content:'';position:absolute;inset:0;background:linear-gradient(90deg,transparent 40%,rgba(255,255,255,.2) 50%,transparent 60%);background-size:200% 100%;animation:dhShimmer 2s linear infinite}
                .dh-segment-empty{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.05)}
              `}</style>

              {/* ===== HEADER (Slim) ===== */}
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, rgba(6,182,212,.15), rgba(59,130,246,.15))', border: '1.5px solid rgba(6,182,212,.25)' }}>
                  <Gift className="w-6 h-6 text-cyan-400" />
                </div>
                <div className="flex-1">
                  <h1 className="text-2xl font-black tracking-tight">Daily Hub</h1>
                  <p className="text-gray-500 text-xs mt-0.5">Complete tasks for bonus rewards</p>
                </div>
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(0,0,0,.3)', border: '1px solid rgba(255,255,255,.06)' }}>
                  <Timer className="w-3.5 h-3.5 text-gray-500" />
                  <div>
                    <div className="text-[9px] text-gray-500 font-medium uppercase tracking-wider">Resets in</div>
                    <div className="text-cyan-400 font-bold text-xs font-mono leading-tight">{dailyCountdown}</div>
                  </div>
                </div>
              </div>

              {/* ===== COMPACT PROGRESS STRIP ===== */}
              <div className="dh-card p-4" style={{ animation: dtAll && !user.dailyBonusClaimed ? 'dhGlowBorder 2s ease-in-out infinite' : 'none', borderColor: dtAll && !user.dailyBonusClaimed ? 'rgba(251,191,36,.3)' : undefined }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-cyan-400" />
                    <span className="font-bold text-sm">Progress</span>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${dtAll ? 'bg-green-500/15 text-green-400' : 'bg-cyan-500/10 text-cyan-400'}`}>{dtCount}/3</span>
                </div>
                {/* Progress bar */}
                <div className="h-2 bg-black/40 rounded-full overflow-hidden mb-3.5" style={{ border: '1px solid rgba(255,255,255,.04)' }}>
                  <div className="h-full rounded-full transition-all duration-700 ease-out" style={{
                    width: `${dtPct}%`,
                    background: dtAll ? 'linear-gradient(90deg,#22c55e,#10b981)' : 'linear-gradient(90deg,#22D3EE,#06B6D4)',
                    boxShadow: dtAll ? '0 0 12px rgba(34,197,94,.3)' : '0 0 12px rgba(6,182,212,.2)',
                  }} />
                </div>
                {/* Task list with GO buttons */}
                <div className="space-y-2">
                  {DAILY_TASKS.map(task => (
                    <div key={task.id} className={`flex items-center gap-2.5 p-2.5 rounded-xl transition-all duration-300 ${task.done ? 'bg-green-500/5 border border-green-500/10' : 'bg-black/15 border border-white/[.03]'}`}>
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${task.done ? 'bg-green-500/15' : 'bg-cyan-500/8'}`}>
                        {task.done ? <CheckCircle className="w-4 h-4 text-green-400" /> : <task.Icon className="w-3.5 h-3.5 text-cyan-400" />}
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
                      <button type="button" onClick={() => {
                        addCoins(200); addGems(5); addXP(100);
                        setUser(u => ({ ...u, dailyBonusClaimed: true }));
                        showNotif('Daily Bonus: +200 Coins + 5 Gems + 100 XP!');
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
                        setTab('minigames');
                        setTimeout(() => setActiveGame(gameId), 300);
                      }} className={`group relative p-3 rounded-2xl text-center transition-all duration-300 ${
                        used 
                          ? 'bg-green-500/5 border border-green-500/15 opacity-50' 
                          : 'bg-gradient-to-b from-white/[.04] to-transparent border border-cyan-500/15 hover:border-cyan-400/40 hover:shadow-lg hover:shadow-cyan-500/10 hover:scale-[1.03] active:scale-95'
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
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-black tracking-wider text-cyan-300" style={{ background: 'linear-gradient(135deg, rgba(6,182,212,.15), rgba(59,130,246,.15))', border: '1px solid rgba(6,182,212,.25)' }}>
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
                  onNavigate={setTab}
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
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-cyan-500/10 border border-cyan-500/20">
                          <CircleDollarSign className="w-4.5 h-4.5 text-cyan-400" />
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
                            <Medal className={`w-3 h-3 ${i < claimed ? 'text-cyan-400' : 'text-gray-700'}`} />
                            <span className={`text-[10px] font-bold ${i < claimed ? 'text-cyan-400' : 'text-gray-700'}`}>{amount}</span>
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
                        background: 'linear-gradient(180deg,#22D3EE 0%,#0891b2 100%)',
                        color: '#fff',
                        boxShadow: '0 3px 0 #155e75, 0 4px 20px rgba(6,182,212,0.25)',
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
                        onClick={() => {
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
                          }
                        }} 
                        disabled={!canClaim} 
                        className={`p-2 rounded-xl text-center transition-all duration-300 relative ${
                          isPast 
                            ? 'bg-green-500/10 border border-green-500/25' 
                            : canClaim 
                              ? 'bg-gradient-to-br from-cyan-500/25 to-blue-500/25 border-2 border-cyan-400/50 shadow-lg shadow-cyan-500/20 hover:scale-105' 
                              : isCurrent 
                                ? 'bg-cyan-500/8 border border-cyan-500/20' 
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
                        {canClaim && <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-cyan-400 rounded-full animate-ping" />}
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
          {tab === 'vip' && (() => {
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
                  className="ml-auto p-2 bg-cyan-600/20 hover:bg-cyan-600/40 rounded-xl"
                >
                  <HelpCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Current Tier Hero Card */}
              <div className={`relative overflow-hidden rounded-2xl p-6 border ${tierColors[vip.name]?.border || 'border-cyan-500/40'} glow-border`} style={{ background: `linear-gradient(135deg, rgba(6,182,212,0.12) 0%, rgba(59,130,246,0.08) 50%, rgba(139,92,246,0.06) 100%)` }}>
                <div className="absolute top-0 right-0 w-40 h-40 opacity-10 text-[120px] -mt-4 -mr-4 pointer-events-none">{vip.icon}</div>
                <div className="flex items-center gap-5 relative z-10">
                  <div className="text-6xl anim-float drop-shadow-lg" style={{ filter: 'drop-shadow(0 0 12px rgba(6,182,212,0.4))' }}>{vip.icon}</div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-0.5">Current Tier</div>
                    <div className={`text-3xl font-black ${tierColors[vip.name]?.accent || 'text-cyan-300'}`}>{vip.name}</div>
                    <div className="text-gray-300 mt-1">{vip.cashback}% Cashback on losses</div>
                    {nextTier && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="text-gray-400">Progress to {nextTier.name}</span>
                          <span className={`font-bold ${tierColors[nextTier.name]?.accent || 'text-cyan-300'}`}>K{user.deposits.toLocaleString()} / K{nextTier.min.toLocaleString()}</span>
                        </div>
                        <div className="h-2.5 bg-black/40 rounded-full overflow-hidden">
                          <div className={`h-full bg-gradient-to-r ${tierColors[nextTier.name]?.bar || 'from-cyan-400 to-blue-500'} rounded-full transition-all duration-1000`} style={{ width: `${tierProgress}%` }} />
                        </div>
                      </div>
                    )}
                    {!nextTier && (
                      <div className="mt-3 text-sm text-cyan-300 font-bold flex items-center gap-2">
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
                        <div className="absolute top-2 right-2 px-2 py-0.5 bg-cyan-500/30 rounded-full text-[10px] font-bold text-cyan-300 uppercase tracking-wider">
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
                      {isCurrent && <div className="absolute inset-0 rounded-2xl pointer-events-none" style={{ boxShadow: 'inset 0 0 30px rgba(6,182,212,0.08)' }} />}
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
                    <div className="w-10 h-10 rounded-lg bg-cyan-500/15 flex items-center justify-center text-cyan-400 flex-shrink-0"><Zap className="w-5 h-5" /></div>
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
                  className="p-2 bg-cyan-600/20 hover:bg-cyan-600/40 rounded-xl"
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
                    <div key={item.id} className={`rounded-3xl overflow-hidden border card-interactive group ${item.featured ? 'border-amber-400/50' : 'border-cyan-500/30'}`}>
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
                          onClick={() => {
                            if (canBuy) {
                              addCoins(-item.price.kwacha);
                              if (item.price.gems) addGems(-item.price.gems);
                              trackMission('storePurchase', { amount: item.price.kwacha });
                              trackQuest('storePurchase', {});
                              showNotif(`Purchased ${item.name}!`);
                            }
                          }} 
                          disabled={!canBuy} 
                          className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all duration-300 hover:scale-[1.02] active:scale-95 ${canBuy ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 btn-glow' : 'bg-gray-800/40 border border-gray-600/20 opacity-50'}`}
                        >
                          🪙 {item.price.kwacha}
                          {item.price.gems && <><span>+</span>💚 {item.price.gems}</>}
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
          {tab === 'predictions' && (() => {
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
                        <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center text-lg font-black text-cyan-400 mb-1.5">
                          {m.homeShort}
                        </div>
                        <div className="font-bold text-sm leading-tight">{m.home}</div>
                      </div>

                      <div className="px-3 flex flex-col items-center">
                        <div className="text-[10px] text-gray-600 font-bold mb-1">VS</div>
                        <div className="flex items-center gap-1 text-yellow-500">
                          <span className="text-xs font-bold">🪙 {m.reward}</span>
                        </div>
                      </div>

                      <div className="flex-1 text-center">
                        <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center text-lg font-black text-cyan-400 mb-1.5">
                          {m.awayShort}
                        </div>
                        <div className="font-bold text-sm leading-tight">{m.away}</div>
                      </div>
                    </div>

                    {/* Odds buttons or prediction result */}
                    {pred ? (
                      <div className="flex items-center justify-center gap-2 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 anim-scale-in">
                        <Check className="w-4 h-4 text-cyan-400" />
                        <span className="text-sm font-bold text-cyan-300">
                          {pred.choice === 'home' ? m.home + ' Win' : pred.choice === 'away' ? m.away + ' Win' : 'Draw'}
                        </span>
                        <span className="text-xs text-cyan-500 ml-1">
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
                            <div className="text-xl font-black text-white group-hover:text-cyan-400 transition-colors tabular-nums">{opt.odds.toFixed(2)}</div>
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
                  <button type="button" onClick={() => setActiveTutorial('predictions')} className="p-2 bg-cyan-600/20 hover:bg-cyan-600/40 rounded-xl">
                    <HelpCircle className="w-5 h-5" />
                  </button>
                </div>

                {/* Stats bar */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="match-card p-3 text-center">
                    <div className="text-2xl font-black text-cyan-400">{totalPredicted}</div>
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
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
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
          {tab === 'quests' && (
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
                            <span className="text-yellow-400 font-bold flex items-center gap-0.5">🪙 {quest.reward.kwacha}</span>
                            <span className="text-green-400 font-bold flex items-center gap-0.5">💚 {quest.reward.gems}</span>
                            <span className="text-cyan-400 font-bold flex items-center gap-0.5">⚡ {quest.xp} XP</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-medium">
                            {stepsComplete}/{quest.steps.length}
                            <ChevronRight className="w-3.5 h-3.5 text-gray-600 group-hover:text-cyan-400 transition-colors" />
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
          {tab === 'referrals' && (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <h1 className="text-3xl font-black tracking-tight">Referrals</h1>
                <button 
                  type="button" 
                  onClick={() => setActiveTutorial('referrals')} 
                  className="p-2 bg-cyan-600/20 hover:bg-cyan-600/40 rounded-xl"
                >
                  <HelpCircle className="w-5 h-5" />
                </button>
              </div>
              <div className="bg-gradient-to-r from-cyan-600/20 to-blue-600/20 rounded-2xl p-6 border border-cyan-500/40 glow-border">
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
                    className="px-6 bg-cyan-600 hover:bg-cyan-700 rounded-xl font-bold"
                  >
                    <Copy className="w-6 h-6" />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-black/60 rounded-xl p-4 border border-white/10 text-center">
                    <div className="text-3xl font-black text-cyan-400">{user.referrals}</div>
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
                  onClick={() => {
                    setUser(u => ({ ...u, referrals: u.referrals + 1 }));
                    addCoins(500);
                    addGems(50);
                    addXP(200);
                    showNotif('🎉 +500 Coins + 50 Gems!');
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
          {tab === 'leaderboard' && (
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
                    <div key={p.r} className={`group flex items-center gap-4 p-4 rounded-xl transition-all duration-300 hover:scale-[1.01] relative overflow-hidden ${p.u ? 'bg-cyan-500/15 border border-cyan-500/40 glow-border' : 'bg-black/20 hover:bg-black/30'}`}>
                      {/* Background bar */}
                      <div
                        className={`absolute left-0 top-0 h-full transition-all duration-700 ${p.r === 1 ? 'bg-yellow-500/10' : p.r === 2 ? 'bg-gray-400/8' : p.r === 3 ? 'bg-amber-600/8' : p.u ? 'bg-cyan-500/10' : 'bg-white/[0.02]'}`}
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
                      <div className="flex-1 font-bold relative z-10">{p.n} {p.u && <span className="text-xs text-cyan-400 ml-1">(You)</span>}</div>
                      <div className={`relative z-10 font-bold ${p.r === 1 ? 'text-yellow-400' : p.r === 2 ? 'text-gray-300' : p.r === 3 ? 'text-amber-500' : p.u ? 'text-cyan-400' : 'text-gray-400'}`}>{p.k.toLocaleString()}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* PROFILE TAB */}
          {/* ============================================================= */}
          {tab === 'profile' && (() => {
            const winRate = user.bets > 0 ? Math.round((user.wins / user.bets) * 100) : 0;
            const profileStats = [
              { label: 'Bets Placed', value: user.bets, icon: Target, color: 'yellow', gradient: 'from-yellow-500/15 to-amber-500/10', border: 'border-yellow-500/20' },
              { label: 'Bets Won', value: user.wins, icon: Trophy, color: 'green', gradient: 'from-green-500/15 to-emerald-500/10', border: 'border-green-500/20' },
              { label: 'Games Played', value: user.gamesPlayed, icon: Gamepad2, color: 'cyan', gradient: 'from-cyan-500/15 to-blue-500/10', border: 'border-cyan-500/20' },
              { label: 'Missions Done', value: user.missionsComplete.length, icon: CheckCircle, color: 'purple', gradient: 'from-purple-500/15 to-violet-500/10', border: 'border-purple-500/20' },
            ];
            return (
            <div className="space-y-6">
              {/* Profile Hero Card */}
              <div className="relative overflow-hidden rounded-2xl border border-cyan-500/30" style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.12) 0%, rgba(59,130,246,0.08) 50%, rgba(139,92,246,0.06) 100%)' }}>
                <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, rgba(6,182,212,0.4) 0%, transparent 50%)' }} />
                <div className="relative p-6">
                  <div className="flex items-center gap-5">
                    <button
                      type="button"
                      onClick={() => setShowAvatarSelector(true)}
                      className="relative w-24 h-24 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-5xl hover:scale-105 transition-all duration-300 group shadow-lg shadow-cyan-500/30 ring-2 ring-cyan-400/30"
                    >
                      {user.avatar}
                      <div className="absolute inset-0 bg-black/50 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <Camera className="w-6 h-6" />
                      </div>
                    </button>
                    <div className="flex-1">
                      <h2 className="text-3xl font-black">Player1</h2>
                      <div className="text-cyan-300 flex items-center gap-2 mt-0.5">
                        <span className="text-lg">{level.icon}</span>
                        <span className="font-bold">{level.name}</span>
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-300">{user.xp.toLocaleString()} XP</span>
                      </div>
                      {/* XP Progress Bar */}
                      <div className="mt-3 max-w-sm">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-gray-400">Level {level.level}</span>
                          <span className="text-cyan-400 font-bold">{nextLevel ? `${user.xp} / ${nextLevel.xp} XP` : 'MAX LEVEL'}</span>
                        </div>
                        <div className="h-2 bg-black/40 rounded-full overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full transition-all duration-1000 progress-animated" style={{ width: `${xpProgress}%` }} />
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
                <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Wallet className="w-5 h-5 text-cyan-400" /> Wallet</h3>
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
