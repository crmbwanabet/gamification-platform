'use client';

import { useState, useRef } from 'react';
import { C } from '@/components/redesign/tokens';
import { RewardIcon } from '@/components/redesign/RedesignShell';
import TutorialModal from '../modals/TutorialModal';
import { GameShell } from './gameKit';
import { GAME_ECONOMY } from '@/lib/data/platform';

// ============================================================================
// HIGHER OR LOWER — casino-felt edition (visual direction from Grok concept:
// navy felt table, classic printed playing cards, split green/red beveled
// HIGHER/LOWER bar, dark chamfered CASH OUT plate, fire streak + coin pot).
// The next card does a real 3D flip off its back. Ties count as correct.
// Fixes the old bug where a busted streak left the reveal animation looping.
// ============================================================================

const CARD_W = 104;
const CARD_H = 156;

const SUITS = ['♠', '♥', '♦', '♣'];
const isRed = (s) => s === '♥' || s === '♦';
const displayRank = (v) => (v === 1 ? 'A' : v === 11 ? 'J' : v === 12 ? 'Q' : v === 13 ? 'K' : String(v));
const drawCard = () => ({ v: Math.floor(Math.random() * 13) + 1, s: SUITS[Math.floor(Math.random() * 4)] });

// Standard pip positions for ranks 2–10: [x%, y%, inverted]
const PIP_LAYOUT = {
  2: [[50, 18, 0], [50, 82, 1]],
  3: [[50, 18, 0], [50, 50, 0], [50, 82, 1]],
  4: [[32, 18, 0], [68, 18, 0], [32, 82, 1], [68, 82, 1]],
  5: [[32, 18, 0], [68, 18, 0], [50, 50, 0], [32, 82, 1], [68, 82, 1]],
  6: [[32, 18, 0], [68, 18, 0], [32, 50, 0], [68, 50, 0], [32, 82, 1], [68, 82, 1]],
  7: [[32, 18, 0], [68, 18, 0], [50, 34, 0], [32, 50, 0], [68, 50, 0], [32, 82, 1], [68, 82, 1]],
  8: [[32, 18, 0], [68, 18, 0], [50, 34, 0], [32, 50, 0], [68, 50, 0], [50, 66, 1], [32, 82, 1], [68, 82, 1]],
  9: [[32, 16, 0], [68, 16, 0], [32, 39, 0], [68, 39, 0], [50, 50, 0], [32, 61, 1], [68, 61, 1], [32, 84, 1], [68, 84, 1]],
  10: [[32, 16, 0], [68, 16, 0], [50, 27, 0], [32, 39, 0], [68, 39, 0], [32, 61, 1], [68, 61, 1], [50, 73, 1], [32, 84, 1], [68, 84, 1]],
};

// Filled suit shapes (viewBox 0 0 100 100)
const SUIT_PATH = {
  '♥': 'M50 88 C 26 66 10 50 10 32 C 10 18 21 9 33 9 C 41 9 48 14 50 21 C 52 14 59 9 67 9 C 79 9 90 18 90 32 C 90 50 74 66 50 88 Z',
  '♦': 'M50 6 C 58 22 70 36 82 50 C 70 64 58 78 50 94 C 42 78 30 64 18 50 C 30 36 42 22 50 6 Z',
  '♠': 'M50 8 C 58 26 86 40 86 58 C 86 68 78 75 69 75 C 62 75 56 71 53 66 C 54 76 58 85 64 92 L 36 92 C 42 85 46 76 47 66 C 44 71 38 75 31 75 C 22 75 14 68 14 58 C 14 40 42 26 50 8 Z',
  '♣': 'M50 6 C 59 6 66 13 66 22 C 66 27 64 31 61 34 C 65 32 69 31 72 31 C 81 31 88 38 88 47 C 88 56 81 63 72 63 C 65 63 59 59 56 54 C 56 68 60 82 66 92 L 34 92 C 40 82 44 68 44 54 C 41 59 35 63 28 63 C 19 63 12 56 12 47 C 12 38 19 31 28 31 C 31 31 35 32 39 34 C 36 31 34 27 34 22 C 34 13 41 6 50 6 Z',
};

// A suit symbol; `engraved` adds inner outline detail like ornate print work.
function Suit({ s, size, fill, engraved = false }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} style={{ display: 'block' }}>
      <path d={SUIT_PATH[s]} fill={fill} />
      {engraved && (
        <>
          <path d={SUIT_PATH[s]} fill="none" stroke="#f6f0dd" strokeWidth="1.6" opacity="0.85"
            transform="translate(50,50) scale(0.74) translate(-50,-50)" />
          <path d={SUIT_PATH[s]} fill="none" stroke="#f6f0dd" strokeWidth="1.1" opacity="0.55"
            transform="translate(50,50) scale(0.5) translate(-50,-50)" />
          <path d={SUIT_PATH[s]} fill="#f6f0dd" opacity="0.9"
            transform="translate(50,50) scale(0.13) translate(-50,-50)" />
        </>
      )}
    </svg>
  );
}

function CardFace({ v, s }) {
  const red = isRed(s);
  const ink = red ? '#b3222c' : '#22242e';
  const rank = displayRank(v);
  const bigCenter = v === 1 || v > 10; // A/J/Q/K: one large ornate suit like the concept art
  return (
    <div style={{
      position: 'absolute', inset: 0, borderRadius: 12, overflow: 'hidden',
      background: 'linear-gradient(160deg, #fffef8 0%, #f8f4e8 45%, #ede6d3 100%)',
      boxShadow: 'inset 0 0 0 1px rgba(120,100,60,.14), inset 0 1px 2px rgba(255,255,255,.9)',
      backfaceVisibility: 'hidden', transform: 'rotateY(180deg)',
    }}>
      {/* corner indices — rank over a small suit, mirrored */}
      {[0, 1].map(i => (
        <div key={i} style={{
          position: 'absolute', lineHeight: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
          ...(i === 0 ? { top: 8, left: 8 } : { bottom: 8, right: 8, transform: 'rotate(180deg)' }),
        }}>
          <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'Georgia, "Times New Roman", serif', color: ink }}>{rank}</div>
          <Suit s={s} size={13} fill={ink} />
        </div>
      ))}
      {bigCenter ? (
        <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
          <div style={{ filter: 'drop-shadow(0 2px 2px rgba(80,60,20,.25))' }}>
            <Suit s={s} size={CARD_W * 0.62} fill={ink} engraved />
          </div>
        </div>
      ) : (
        <svg viewBox="0 0 100 150" style={{ position: 'absolute', left: '18%', top: '10%', width: '64%', height: '80%' }}>
          {PIP_LAYOUT[v]?.map(([x, y, inv], i) => (
            <g key={i} transform={`translate(${x - 10}, ${y * 1.5 - 10})${inv ? ' rotate(180, 10, 10)' : ''}`}>
              <path d={SUIT_PATH[s]} fill={ink} transform="scale(0.2)" />
            </g>
          ))}
        </svg>
      )}
    </div>
  );
}

function CardBack() {
  const line = '#9fb0dd';
  return (
    <div style={{
      position: 'absolute', inset: 0, borderRadius: 12, overflow: 'hidden',
      background: 'linear-gradient(160deg, #fffef8, #ece5d2)', // white printed border like a real card
      backfaceVisibility: 'hidden',
      boxShadow: 'inset 0 0 0 1px rgba(120,100,60,.14)',
    }}>
      <svg viewBox="0 0 100 150" style={{ position: 'absolute', inset: 4, width: 'calc(100% - 8px)', height: 'calc(100% - 8px)' }} preserveAspectRatio="none">
        <defs>
          <pattern id="hlGuilloche" width="7" height="7" patternUnits="userSpaceOnUse">
            <path d="M0 7 L7 0 M-1 1 L1 -1 M6 8 L8 6" stroke={line} strokeWidth="0.55" opacity="0.5" />
            <path d="M0 0 L7 7 M6 -1 L8 1 M-1 6 L1 8" stroke={line} strokeWidth="0.55" opacity="0.5" />
            <circle cx="3.5" cy="3.5" r="0.7" fill={line} opacity="0.6" />
          </pattern>
        </defs>
        {/* navy plate */}
        <rect x="0" y="0" width="100" height="150" rx="5" fill="#1c2a52" />
        <rect x="0" y="0" width="100" height="150" rx="5" fill="url(#hlGuilloche)" />
        {/* double frame */}
        <rect x="4" y="4" width="92" height="142" rx="4" fill="none" stroke={line} strokeWidth="1.4" opacity="0.9" />
        <rect x="7.5" y="7.5" width="85" height="135" rx="3" fill="none" stroke={line} strokeWidth="0.5" opacity="0.6" />
        {/* central medallion */}
        <g stroke={line} fill="none" opacity="0.9">
          <circle cx="50" cy="75" r="30" strokeWidth="1.2" />
          <circle cx="50" cy="75" r="24.5" strokeWidth="0.5" />
          <circle cx="50" cy="75" r="15" strokeWidth="0.8" />
          {Array.from({ length: 12 }, (_, i) => (
            <ellipse key={i} cx="50" cy="55.5" rx="3.6" ry="8.5" strokeWidth="0.6"
              transform={`rotate(${i * 30}, 50, 75)`} />
          ))}
        </g>
        <g fill={line} opacity="0.95">
          <path d={SUIT_PATH['♠']} transform="translate(43.5, 68.5) scale(0.13)" />
        </g>
        {/* corner fans */}
        {[[0, 0, 0], [100, 0, 90], [100, 150, 180], [0, 150, 270]].map(([cx, cy, rot], i) => (
          <g key={i} stroke={line} fill="none" opacity="0.75" transform={`rotate(${rot}, ${cx}, ${cy})`}>
            <circle cx={cx} cy={cy} r="14" strokeWidth="0.8" />
            <circle cx={cx} cy={cy} r="10" strokeWidth="0.5" />
            <circle cx={cx} cy={cy} r="18" strokeWidth="0.5" opacity="0.6" />
          </g>
        ))}
      </svg>
    </div>
  );
}

// Chunky extruded 3D arrow for the HIGHER / LOWER buttons
function Arrow3D({ dir }) {
  const up = dir === 'up';
  const grad = up ? ['#d9ff9e', '#7ee254', '#2f9e26'] : ['#ffc2b0', '#f0705a', '#b52a1c'];
  const edge = up ? '#124d12' : '#5e0f08';
  const gid = `hlArrow-${dir}`;
  // block arrow pointing up in a 64×46 box; flipped for down
  const pts = '32,2 62,30 46,30 46,44 18,44 18,30 2,30';
  return (
    <svg width="34" height="25" viewBox="0 0 64 50" style={{ display: 'block', transform: up ? 'none' : 'rotate(180deg)' }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={grad[0]} />
          <stop offset="45%" stopColor={grad[1]} />
          <stop offset="100%" stopColor={grad[2]} />
        </linearGradient>
      </defs>
      {/* extrusion */}
      <polygon points={pts} fill={edge} transform="translate(0, 5)" />
      {/* face */}
      <polygon points={pts} fill={`url(#${gid})`} stroke={edge} strokeWidth="1.5" />
      {/* gloss */}
      <polygon points="32,5 54,26 10,26" fill="#ffffff" opacity="0.28" />
    </svg>
  );
}

// A card that can 3D-flip from back to face.
function FlipCard({ card, flipped, fatal, dealt }) {
  return (
    <div style={{ width: CARD_W, height: CARD_H, perspective: 800, animation: dealt ? 'hlDeal .38s cubic-bezier(.2,.9,.3,1.2) both' : 'none' }}>
      <div style={{
        position: 'relative', width: '100%', height: '100%',
        transformStyle: 'preserve-3d',
        transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        transition: 'transform .55s cubic-bezier(.35,.1,.25,1)',
        borderRadius: 12,
        boxShadow: fatal
          ? '0 12px 30px rgba(0,0,0,.45), 0 0 26px rgba(229,87,63,.55)'
          : '0 12px 30px rgba(0,0,0,.45)',
        animation: fatal ? 'hlFatal .5s ease-in-out 2' : 'none',
      }}>
        <CardBack />
        {card && <CardFace v={card.v} s={card.s} />}
      </div>
    </div>
  );
}

function StaticCard({ card, glow }) {
  return (
    <div style={{
      position: 'relative', width: CARD_W, height: CARD_H, borderRadius: 12,
      boxShadow: glow
        ? '0 12px 30px rgba(0,0,0,.45), 0 0 20px rgba(79,169,139,.4)'
        : '0 12px 30px rgba(0,0,0,.45)',
      transition: 'box-shadow .4s ease',
    }}>
      <div style={{ position: 'absolute', inset: 0, transform: 'rotateY(180deg)', transformStyle: 'preserve-3d' }}>
        <CardFace v={card.v} s={card.s} />
      </div>
    </div>
  );
}

export default function HighLowGame({ onClose, onWin, closing, onReplay }) {
  const [current, setCurrent] = useState(drawCard);
  const [nextCard, setNextCard] = useState(null);   // the face of the flipping card
  const [flipped, setFlipped] = useState(false);
  const [dealt, setDealt] = useState(false);        // triggers deal-in animation
  const [revealing, setRevealing] = useState(false);
  const [streak, setStreak] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [lastCall, setLastCall] = useState(null);
  const [justAdvanced, setJustAdvanced] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const timers = useRef([]);
  const later = (fn, ms) => { timers.current.push(setTimeout(fn, ms)); };

  // pot caps at GAME_ECONOMY.MAX_WIN — streak 8+ holds the max
  const pot = Math.min(streak * 25, GAME_ECONOMY.MAX_WIN);
  const potMaxed = streak > 0 && streak * 25 >= GAME_ECONOMY.MAX_WIN;

  const guess = (higher) => {
    if (revealing || gameOver) return;
    setRevealing(true);
    setLastCall(higher);
    const card = drawCard();
    setNextCard(card);
    // small beat, then flip
    later(() => setFlipped(true), 120);

    later(() => {
      const correct = higher ? card.v >= current.v : card.v <= current.v;
      if (correct) {
        setStreak(s => s + 1);
        setJustAdvanced(true);
        try { navigator.vibrate?.(12); } catch (e) {}
        // slide the revealed card into the "current" seat, deal a fresh back
        later(() => {
          setCurrent(card);
          setNextCard(null);
          setFlipped(false);
          setDealt(true);
          setRevealing(false);
          setJustAdvanced(false);
          later(() => setDealt(false), 420);
        }, 620);
      } else {
        // bust — reveal stays face-up and STOPS (no looping animation)
        setRevealing(false);
        setGameOver(true);
        if (streak > 0) onWin(pot);
        try { navigator.vibrate?.([60, 40, 60]); } catch (e) {}
      }
    }, 780);
  };

  const cashOut = () => {
    if (revealing || gameOver || streak === 0) return;
    onWin(pot);
    onClose();
  };

  const reset = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setGameOver(false);
    setStreak(0);
    setNextCard(null);
    setFlipped(false);
    setRevealing(false);
    setLastCall(null);
    setCurrent(drawCard());
  };

  return (
    <GameShell title="🃏 Higher or Lower" onClose={onClose} closing={closing} onHelp={() => setShowTutorial(true)}>
      {showTutorial && <TutorialModal tutorialKey="highlow" onClose={() => setShowTutorial(false)} />}

      <style>{`
        @keyframes hlDeal {
          0% { opacity: 0; transform: translateX(46px) translateY(-14px) rotate(7deg); }
          100% { opacity: 1; transform: translateX(0) translateY(0) rotate(0); }
        }
        @keyframes hlFatal {
          0%, 100% { transform: translateX(0) rotateY(180deg); }
          25% { transform: translateX(-5px) rotateY(180deg); }
          75% { transform: translateX(5px) rotateY(180deg); }
        }
        @keyframes hlEmber {
          0% { opacity: 0; transform: translateY(0) scale(1); }
          25% { opacity: .9; }
          100% { opacity: 0; transform: translateY(-34px) scale(.4); }
        }
        @keyframes hlPotPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.12); }
        }
        .hl-btnbar {
          display: grid; grid-template-columns: 1fr 1fr;
          border-radius: 16px; overflow: hidden;
          border: 3px solid #10131c;
          box-shadow: 0 10px 26px rgba(0,0,0,.5), 0 2px 0 rgba(255,255,255,.06);
        }
        .hl-btn {
          border: none; cursor: pointer; padding: 13px 8px 15px;
          display: flex; flex-direction: column; align-items: center; gap: 2px;
          font-weight: 900; font-size: 21px; letter-spacing: .05em;
          font-family: var(--font-display, 'Bricolage Grotesque', sans-serif);
          transition: filter .12s ease, transform .1s ease;
        }
        .hl-btn:disabled { cursor: default; filter: saturate(.45) brightness(.75); }
        .hl-btn:not(:disabled):hover { filter: brightness(1.1); }
        .hl-btn:not(:disabled):active { transform: translateY(2px); filter: brightness(.92); }
        .hl-higher {
          background: linear-gradient(180deg, #7ee254 0%, #46b830 45%, #2f9e26 100%);
          color: #eaffe3;
          box-shadow: inset 0 2px 0 rgba(255,255,255,.45), inset 0 -4px 8px rgba(0,60,0,.35), inset -1px 0 0 rgba(0,0,0,.25);
          text-shadow: 0 2px 3px rgba(10,60,5,.7);
        }
        .hl-lower {
          background: linear-gradient(180deg, #f27a63 0%, #d8402c 45%, #b52a1c 100%);
          color: #ffe9e4;
          box-shadow: inset 0 2px 0 rgba(255,255,255,.4), inset 0 -4px 8px rgba(80,0,0,.4), inset 1px 0 0 rgba(0,0,0,.25);
          text-shadow: 0 2px 3px rgba(90,15,5,.7);
        }
        .hl-arrow { line-height: 1; filter: drop-shadow(0 3px 3px rgba(0,0,0,.45)); margin-bottom: 1px; }
        .hl-cashout {
          border: none; cursor: pointer;
          clip-path: polygon(12px 0, calc(100% - 12px) 0, 100% 50%, calc(100% - 12px) 100%, 12px 100%, 0 50%);
          background: linear-gradient(180deg, #3a4152 0%, #262c3a 55%, #1c212d 100%);
          color: #e8ecf4; font-weight: 900; font-size: 14.5px; letter-spacing: .1em;
          padding: 12px 34px;
          display: inline-flex; align-items: center; gap: 8px;
          box-shadow: inset 0 1.5px 0 rgba(255,255,255,.22);
          transition: filter .12s ease, transform .1s ease;
        }
        .hl-cashout:disabled { cursor: default; opacity: .45; }
        .hl-cashout:not(:disabled):hover { filter: brightness(1.15); }
        .hl-cashout:not(:disabled):active { transform: translateY(1px); }
        .hl-again {
          border: none; cursor: pointer; padding: 0; border-radius: 14px;
          background: #2c6e56;
          box-shadow: 0 10px 26px rgba(79,169,139,.32);
        }
        .hl-again-face {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 13px 34px; border-radius: 14px;
          background: linear-gradient(180deg, #66c5a3 0%, #4aa886 55%, #3f9a7b 100%);
          color: #08210f; font-weight: 900; font-size: 15px; letter-spacing: .07em;
          box-shadow: inset 0 1.5px 0 rgba(255,255,255,.4);
          transform: translateY(-5px);
          transition: transform .09s ease;
        }
        .hl-again:hover .hl-again-face { transform: translateY(-7px); }
        .hl-again:active .hl-again-face { transform: translateY(-1px); }
      `}</style>

      {/* === FELT TABLE === */}
      <div style={{
        position: 'relative', borderRadius: 16, padding: '16px 14px 20px', marginBottom: 16,
        background: `
          radial-gradient(120% 90% at 72% 0%, rgba(255,190,90,.13) 0%, transparent 45%),
          radial-gradient(140% 120% at 50% 30%, #2b3a63 0%, #1e2a4d 55%, #16203c 100%)`,
        border: '1px solid rgba(120,140,190,.22)',
        boxShadow: 'inset 0 0 44px rgba(0,0,0,.45), 0 10px 30px rgba(0,0,0,.35)',
        overflow: 'hidden',
      }}>
        {/* felt weave */}
        <div style={{
          position: 'absolute', inset: 0, opacity: .5, pointerEvents: 'none',
          background: 'repeating-linear-gradient(55deg, rgba(255,255,255,.016) 0 2px, transparent 2px 4px), repeating-linear-gradient(-55deg, rgba(0,0,0,.05) 0 2px, transparent 2px 4px)',
        }} />

        {/* streak + pot row */}
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, minHeight: 46 }}>
          <div style={{ position: 'relative', textAlign: 'center', paddingLeft: 4 }}>
            {/* embers */}
            {streak >= 3 && [0, 1, 2].map(i => (
              <span key={i} style={{
                position: 'absolute', left: `${18 + i * 26}%`, top: -4,
                width: 4, height: 4, borderRadius: '50%',
                background: i % 2 ? '#ffb347' : '#ff7a3c',
                animation: `hlEmber ${1.1 + i * 0.35}s ease-out ${i * 0.4}s infinite`,
              }} />
            ))}
            <div style={{
              fontSize: 19, fontWeight: 900, letterSpacing: '.08em',
              fontFamily: "var(--font-display, 'Bricolage Grotesque', sans-serif)",
              background: 'linear-gradient(180deg, #ffe9a8 0%, #ffb340 45%, #f4711f 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.6))',
            }}>
              🔥 STREAK {streak}
            </div>
          </div>

          {/* coin pot */}
          <div style={{ textAlign: 'center', paddingRight: 4 }}>
            <div style={{ position: 'relative', width: 56, height: 30, margin: '0 auto' }}>
              <RewardIcon kind="coins" size={26} style={{ position: 'absolute', left: 0, bottom: 0 }} />
              <RewardIcon kind="coins" size={22} style={{ position: 'absolute', right: 2, bottom: 0, transform: 'scaleX(-1)' }} />
              {streak >= 4 && <RewardIcon kind="coins" size={20} style={{ position: 'absolute', left: 17, top: 0 }} />}
            </div>
            <div style={{
              fontSize: 17, fontWeight: 900, fontVariantNumeric: 'tabular-nums',
              color: C.gold, textShadow: '0 2px 4px rgba(0,0,0,.6)',
              animation: justAdvanced ? 'hlPotPulse .4s ease' : 'none',
            }}>{pot}</div>
          </div>
        </div>

        {/* cards */}
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 20 }}>
          <StaticCard card={current} glow={justAdvanced} />
          <FlipCard card={nextCard} flipped={flipped} fatal={gameOver} dealt={dealt} />
        </div>
      </div>

      {!gameOver ? (
        <>
          <div className="hl-btnbar" style={{ marginBottom: 12 }}>
            <button type="button" className="hl-btn hl-higher" disabled={revealing} onClick={() => guess(true)}>
              <span className="hl-arrow"><Arrow3D dir="up" /></span>
              HIGHER
            </button>
            <button type="button" className="hl-btn hl-lower" disabled={revealing} onClick={() => guess(false)}>
              <span className="hl-arrow"><Arrow3D dir="down" /></span>
              LOWER
            </button>
          </div>
          <div style={{ textAlign: 'center' }}>
            <button type="button" className="hl-cashout" disabled={revealing || streak === 0} onClick={cashOut}>
              <RewardIcon kind="coins" size={18} />
              CASH OUT {streak > 0 ? pot : ''}{potMaxed ? ' MAX' : ''}
            </button>
          </div>
        </>
      ) : (
        <div style={{ textAlign: 'center' }} className="anim-scale-in">
          <div style={{
            fontSize: 21, fontWeight: 900, letterSpacing: '.06em', marginBottom: 4,
            color: streak > 0 ? C.gold : C.sub,
            fontFamily: "var(--font-display, 'Bricolage Grotesque', sans-serif)",
          }}>
            {streak > 0 ? 'STREAK BROKEN' : 'BUSTED FIRST FLIP'}
          </div>
          <p style={{ fontSize: 12.5, color: C.muted, margin: '0 0 12px' }}>
            You called {lastCall ? 'HIGHER' : 'LOWER'} on {displayRank(current.v)}{current.s} — drew {nextCard ? `${displayRank(nextCard.v)}${nextCard.s}` : ''}
          </p>
          {streak > 0 ? (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '9px 20px', borderRadius: 999, marginBottom: 16,
              background: 'rgba(230,173,74,.14)', border: '1.5px solid rgba(230,173,74,.45)',
            }}>
              <RewardIcon kind="coins" size={20} />
              <span style={{ fontSize: 20, fontWeight: 900, color: C.gold, fontVariantNumeric: 'tabular-nums' }}>+{pot}</span>
              <span style={{ fontSize: 11, color: C.sub, fontWeight: 700 }}>banked from {streak} {streak === 1 ? 'win' : 'wins'}</span>
            </div>
          ) : (
            <p style={{ fontSize: 13, color: C.sub, marginBottom: 16 }}>Nothing banked — the deck is cruel sometimes.</p>
          )}
          <div>
            <button type="button" className="hl-again" onClick={() => { if (onReplay && !onReplay()) return; reset(); }}>
              <span className="hl-again-face">🃏 DEAL AGAIN</span>
            </button>
          </div>
        </div>
      )}
    </GameShell>
  );
}
