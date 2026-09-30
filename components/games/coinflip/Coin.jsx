'use client';

import React, { useEffect, useRef } from 'react';
import { CANDY } from '../candy/tokens';
import { COIN_FACES_READY } from './config';

// The Coin Flip coin — pure CSS 3D, no canvas/WebGL.
// Two face layers (backface-visibility: hidden) inside a preserve-3d coin:
// HEADS is the front (0deg), TAILS the back (pre-rotated 180deg). A toss is an
// arc on the outer wrapper + a rotateY spin on the coin that ends on an even
// number of half-turns for HEADS and an odd number for TAILS, so the landed
// angle equals the resting angle and nothing jumps when the animation is removed.
// onLanded fires exactly once per flight: animationend or a 1500ms fallback.
// Reduced motion: no arc/spin — the result face fades in over 200ms.
// Behind the coin sits a golden swirl (two tilted comet-trail rings, pure CSS):
// slow idle rotation; during a toss an extra ring spins exactly 3 turns with
// ease-in-out, so it ends where it started and nothing snaps at landing.
// Reduced motion: the swirl is static.

const TOSS_MS = 1400;
const FALLBACK_MS = 1500;
const FADE_MS = 200;
const angleOf = (face) => (face === 'TAILS' ? 180 : 0);

const COIN_CSS = `
  @keyframes cfArc {
    0%   { transform: translateY(0) scale(1); animation-timing-function: cubic-bezier(.2,.7,.35,1); }
    45%  { transform: translateY(var(--cf-peak)) scale(1.18); animation-timing-function: cubic-bezier(.55,0,.8,.4); }
    88%  { transform: translateY(0) scale(1); animation-timing-function: ease-out; }
    94%  { transform: translateY(-8px) scale(1.02); animation-timing-function: ease-in; }
    100% { transform: translateY(0) scale(1); }
  }
  @keyframes cfSpin { from { transform: rotateY(var(--cf-from)); } to { transform: rotateY(var(--cf-to)); } }
  @keyframes cfShadow { 0%, 100% { transform: scale(1); opacity: .55; } 45% { transform: scale(.55); opacity: .22; } }
  @keyframes cfFade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes cfSwirl { to { transform: rotate(360deg); } }
  @keyframes cfSwirlToss { from { transform: rotate(0deg); } to { transform: rotate(1080deg); } }
  .cf-swirl { position: absolute; pointer-events: none; transition: opacity .3s; filter: drop-shadow(0 0 5px rgba(255,190,40,.75)); }
  .cf-swirl > i, .cf-swirl > i > i { position: absolute; inset: 0; display: block; border-radius: 50%; }
  .cf-swirl > i > i {
    background: conic-gradient(from 0deg,
      rgba(255,180,30,0) 0deg, rgba(255,180,30,0) 50deg, rgba(255,196,48,.9) 150deg, #FFF3B0 174deg, rgba(255,210,31,0) 178deg,
      rgba(255,180,30,0) 230deg, rgba(255,196,48,.9) 330deg, #FFF3B0 354deg, rgba(255,210,31,0) 358deg);
    -webkit-mask: radial-gradient(closest-side, transparent 70%, #000 71.5% 74%, transparent 75.5% 80%, #000 81% 84.5%, transparent 86% 90%, #000 91% 93%, transparent 94.5%);
    mask: radial-gradient(closest-side, transparent 70%, #000 71.5% 74%, transparent 75.5% 80%, #000 81% 84.5%, transparent 86% 90%, #000 91% 93%, transparent 94.5%);
    filter: blur(.6px);
  }
  @keyframes cfWinGlow { 0%, 100% { opacity: .75; transform: scale(1); } 50% { opacity: 1; transform: scale(1.08); } }
`;

// One tilted ring: outer span squashes it to an ellipse, the middle <i> runs the
// toss spin, the inner <i> the idle spin (so the two never fight over transform).
function SwirlRing({ inset, tilt, squash, idleMs, flying, reduced, opacity }) {
  return (
    <span aria-hidden className="cf-swirl" style={{ inset, transform: `rotate(${tilt}deg) scaleY(${squash})`, opacity: flying ? 1 : opacity }}>
      <i style={{ animation: flying && !reduced ? `cfSwirlToss ${TOSS_MS}ms cubic-bezier(.45,0,.35,1) both` : 'none' }}>
        <i style={{ animation: reduced ? 'none' : `cfSwirl ${idleMs}ms linear infinite` }} />
      </i>
    </span>
  );
}

function Swirl({ flying, reduced }) {
  return (
    <>
      <SwirlRing inset="-38%" tilt={-16} squash={0.48} idleMs={9000} flying={flying} reduced={reduced} opacity={0.9} />
      <SwirlRing inset="-24%" tilt={-24} squash={0.6} idleMs={6500} flying={flying} reduced={reduced} opacity={0.7} />
    </>
  );
}

function Face({ face, back }) {
  const base = { position: 'absolute', inset: 0, borderRadius: '50%', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: back ? 'rotateY(180deg)' : 'none' };
  if (COIN_FACES_READY) {
    return <img src={face === 'HEADS' ? '/games/coinflip/heads.webp' : '/games/coinflip/tails.webp'} alt={face} draggable={false} style={{ ...base, width: '100%', height: '100%', objectFit: 'contain' }} />;
  }
  // Placeholder: gold disc, embossed rim, face label in the game font
  return (
    <div aria-label={face} style={{
      ...base, display: 'grid', placeItems: 'center',
      background: 'radial-gradient(circle at 34% 28%, #FFF6B8 0%, #FFD21F 30%, #F2B90C 62%, #C98A00 100%)',
      boxShadow: 'inset 0 0 0 7px #D99A00, inset 0 0 0 10px #FFE46E, inset 0 0 0 13px #C98A00, inset 0 -10px 22px rgba(120,70,0,.45)',
    }}>
      <span style={{
        fontFamily: CANDY.display, fontSize: face === 'HEADS' ? '0.2em' : '0.27em', color: '#8A5600', letterSpacing: 1,
        textShadow: '0 2px 0 rgba(255,240,170,.9), 0 -1px 0 rgba(90,50,0,.5)',
      }}>{face}</span>
    </div>
  );
}

export default function Coin({ state = 'idle', face = null, onLanded, reduced = false, win = false }) {
  const landedCb = useRef(onLanded);
  landedCb.current = onLanded;
  const doneRef = useRef(true);   // true once the current flight has reported landing
  const flightRef = useRef(0);    // bumps per flight — remount key for the reduced fade
  const prevState = useRef(state);
  // Resting face: frozen while flying so the spin starts from where the coin was.
  const restFace = useRef(face || 'HEADS');
  if (state !== 'flying') restFace.current = face || restFace.current;
  if (state === 'flying' && prevState.current !== 'flying') { flightRef.current += 1; doneRef.current = false; }
  prevState.current = state;

  const land = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    landedCb.current?.();
  };

  // Fallback so a missed animationend (background tab, etc.) never strands a round
  useEffect(() => {
    if (state !== 'flying') return undefined;
    const t = setTimeout(land, reduced ? FADE_MS + 300 : FALLBACK_MS);
    return () => clearTimeout(t);
  }, [state, reduced]); // eslint-disable-line react-hooks/exhaustive-deps

  const flying = state === 'flying';
  const from = angleOf(restFace.current);
  const to = 1440 + angleOf(face);  // 8 half-turns for HEADS, 9 for TAILS
  const size = 'min(50vw, 27dvh, 220px)';

  return (
    <div style={{ position: 'relative', width: size, height: size, fontSize: size, margin: '0 auto' }}>
      <style>{COIN_CSS}</style>
      {/* soft glow behind the coin; pulses gold on a win */}
      <div aria-hidden style={{
        position: 'absolute', inset: '-22%', borderRadius: '50%', pointerEvents: 'none',
        background: win && state === 'result'
          ? 'radial-gradient(circle, rgba(255,210,31,.75) 0%, rgba(255,210,31,.25) 40%, transparent 68%)'
          : 'radial-gradient(circle, rgba(164,59,232,.55) 0%, rgba(164,59,232,.15) 42%, transparent 68%)',
        animation: win && state === 'result' ? 'cfWinGlow 1.2s ease-in-out infinite' : 'none',
      }} />
      {/* ground shadow — shrinks while the coin is in the air */}
      <div aria-hidden style={{
        position: 'absolute', left: '18%', right: '18%', bottom: '-9%', height: '9%', borderRadius: '50%',
        background: 'rgba(10,0,30,.55)', filter: 'blur(4px)', opacity: .55,
        animation: flying && !reduced ? `cfShadow ${TOSS_MS}ms linear both` : 'none',
      }} />
      <Swirl flying={flying} reduced={reduced} />
      {reduced ? (
        <div key={flightRef.current} onAnimationEnd={(e) => { if (e.target === e.currentTarget && flying) land(); }}
          style={{ position: 'absolute', inset: 0, animation: flying ? `cfFade ${FADE_MS}ms ease-out both` : 'none' }}>
          <Face face={face || restFace.current} />
        </div>
      ) : (
        <div style={{ position: 'absolute', inset: 0, perspective: '900px', '--cf-peak': 'calc(-1 * min(34dvh, 200px))', animation: flying ? `cfArc ${TOSS_MS}ms both` : 'none' }}>
          <div onAnimationEnd={(e) => { if (e.target === e.currentTarget && flying) land(); }}
            style={{
              position: 'absolute', inset: 0, transformStyle: 'preserve-3d',
              '--cf-from': `${from}deg`, '--cf-to': `${to}deg`,
              transform: `rotateY(${flying ? from : angleOf(restFace.current)}deg)`,
              animation: flying ? `cfSpin ${TOSS_MS}ms cubic-bezier(.15,.6,.3,1) both` : 'none',
            }}>
            <Face face="HEADS" />
            <Face face="TAILS" back />
          </div>
        </div>
      )}
    </div>
  );
}
