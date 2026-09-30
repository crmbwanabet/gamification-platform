'use client';

import React, { useEffect, useRef } from 'react';
import { CANDY } from '../candy/tokens';

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
// Sizing: the parent coin area is a size container (container-type: size); the
// coin is sized in cqh/cqw and the toss peak is computed from the area height, so
// the arc always stays inside the area and never covers the header or balance.

const TOSS_MS = 1400;
const FALLBACK_MS = 1500;
const FADE_MS = 200;
const angleOf = (face) => (face === 'TAILS' ? 180 : 0);

const COIN_CSS = `
  @keyframes cfArc {
    0%   { transform: translateY(0) scale(1); animation-timing-function: cubic-bezier(.2,.7,.35,1); }
    45%  { transform: translateY(var(--cf-peak)) scale(1.15); animation-timing-function: cubic-bezier(.55,0,.8,.4); }
    88%  { transform: translateY(0) scale(1); animation-timing-function: ease-out; }
    94%  { transform: translateY(-8px) scale(1.02); animation-timing-function: ease-in; }
    100% { transform: translateY(0) scale(1); }
  }
  @keyframes cfSpin { from { transform: rotateY(var(--cf-from)); } to { transform: rotateY(var(--cf-to)); } }
  @keyframes cfShadow { 0%, 100% { transform: scale(1); opacity: .55; } 45% { transform: scale(.55); opacity: .22; } }
  @keyframes cfFade { from { opacity: 0; } to { opacity: 1; } }
  @keyframes cfSwirl { to { transform: rotate(360deg); } }
  @keyframes cfSwirlToss { from { transform: rotate(0deg); } to { transform: rotate(1080deg); } }
  .cf-swirl { position: absolute; pointer-events: none; transition: opacity .3s; filter: drop-shadow(0 0 4px rgba(255,190,40,.6)); }
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
    <span aria-hidden className="cf-swirl" style={{ inset, transform: `rotate(${tilt}deg) scaleY(${squash})`, opacity: flying ? 0.8 : opacity }}>
      <i style={{ animation: flying && !reduced ? `cfSwirlToss ${TOSS_MS}ms cubic-bezier(.45,0,.35,1) both` : 'none' }}>
        <i style={{ animation: reduced ? 'none' : `cfSwirl ${idleMs}ms linear infinite` }} />
      </i>
    </span>
  );
}

function Swirl({ flying, reduced }) {
  return (
    <>
      <SwirlRing inset="-36%" tilt={-16} squash={0.46} idleMs={9000} flying={flying} reduced={reduced} opacity={0.45} />
      <SwirlRing inset="-22%" tilt={-24} squash={0.58} idleMs={6500} flying={flying} reduced={reduced} opacity={0.3} />
    </>
  );
}

// A thick glossy gold coin drawn in CSS (all sizes in em = the coin size):
// reeded outer rim, recessed inner face with a bevel, a fine inner ring, the
// side name embossed in the game font, and a soft radial shine on top. The
// solid drop under the disc gives it thickness; both faces keep it, since
// rotateY leaves the y axis alone.
const RIM = [
  'repeating-conic-gradient(from 0deg, rgba(255,255,255,.16) 0 2.5deg, rgba(120,70,0,.14) 2.5deg 5deg)',
  'linear-gradient(150deg, #FFF3B0 0%, #FFD21F 30%, #E9A800 62%, #B87800 100%)',
].join(', ');
const INNER = 'radial-gradient(circle at 40% 32%, #FFE680 0%, #FFD21F 38%, #F2B90C 72%, #D99A00 100%)';
const SHINE = [
  'radial-gradient(ellipse 45% 30% at 32% 24%, rgba(255,255,255,.7) 0%, rgba(255,255,255,0) 100%)',
  'linear-gradient(125deg, rgba(255,255,255,0) 40%, rgba(255,255,255,.28) 50%, rgba(255,255,255,0) 60%)',
].join(', ');

function Face({ face, back }) {
  return (
    <div aria-label={face} style={{
      position: 'absolute', inset: 0, borderRadius: '50%',
      backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden', transform: back ? 'rotateY(180deg)' : 'none',
      background: RIM,
      boxShadow: '0 .045em 0 #9A6200, 0 .06em .05em rgba(20,0,40,.45), inset 0 .012em 0 rgba(255,250,220,.9), inset 0 -.012em 0 rgba(120,70,0,.6)',
    }}>
      {/* recessed inner face: dark bevel on top, light on the bottom */}
      <div style={{
        position: 'absolute', inset: '9%', borderRadius: '50%', background: INNER,
        boxShadow: 'inset 0 .022em .02em rgba(130,75,0,.75), inset 0 -.016em .012em rgba(255,246,200,.9), 0 .008em 0 rgba(255,246,200,.7)',
        display: 'grid', placeItems: 'center',
      }}>
        <div style={{ position: 'absolute', inset: '7%', borderRadius: '50%', border: '.012em solid rgba(160,100,0,.5)', boxShadow: '0 .006em 0 rgba(255,244,190,.7), inset 0 .006em 0 rgba(255,244,190,.7)' }} />
        <span style={{
          position: 'relative', fontFamily: CANDY.display, fontSize: '.225em', lineHeight: 1, letterSpacing: '.02em',
          color: '#B37400', textShadow: '0 -.045em 0 rgba(110,60,0,.55), 0 .05em 0 rgba(255,244,190,.95)',
        }}>{face}</span>
      </div>
      <div aria-hidden style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: SHINE, pointerEvents: 'none' }} />
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
  const size = 'min(48cqh, 58cqw, 190px)';
  // The coin rests 5cqh below the area's centre (its centre at 55cqh). At the peak
  // it is scaled 1.15, so rise until its top is 10px under the area top (the
  // margin also covers the perspective growth mid-spin).
  const peak = `calc(-1 * (55cqh - ${size} * 0.575 - 10px))`;

  return (
    <div style={{ position: 'relative', width: size, height: size, fontSize: size, margin: '0 auto', transform: 'translateY(5cqh)' }}>
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
        <div style={{ position: 'absolute', inset: 0, perspective: '900px', '--cf-peak': peak, animation: flying ? `cfArc ${TOSS_MS}ms both` : 'none' }}>
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
