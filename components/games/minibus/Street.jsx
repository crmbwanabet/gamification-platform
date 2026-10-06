'use client';

import React, { memo } from 'react';
import { DEFS, BACK, FRONT, CAST, FX, OVERLAY } from './scene';

// The bus stop scene as React components. The markup is the approved mock's,
// built once at module load by scene.js (deterministic, seeded), and handed to
// React as static inner HTML: React renders it once and never diffs inside it,
// so motion.js can pose, reorder and re-parent the nodes freely.
// Layers (back → front): <StreetDefs/> · <StreetBack/> (sky, shops, jacaranda,
// road, both minibuses) · <StreetFront/> (curb, pavement) · <Cast/> (shadows,
// dust, people, luggage) · <Effects/> · <StreetOverlay/> (falling petals,
// vignette, grass tufts).
// Everything is namespaced mb-* (ids, classes, keyframes) and scoped under
// .mb-svg, so nothing leaks into or out of the platform's CSS.

export const STREET_CSS = `
  .mb-svg text { font-family: var(--font-game), 'Lilita One', system-ui, sans-serif; }
  .mb-svg #mb-actors, .mb-svg #mb-shadows, .mb-svg #mb-fx { transition: opacity .2s ease; }
  .mb-svg .mb-gone { opacity: 0; }
  .mb-svg #mb-busr { transition: opacity .25s ease; }
  .mb-svg #mb-puffs, .mb-svg #mb-shadows, .mb-svg #mb-fx { pointer-events: none; }

  /* passengers: tap targets, ring, tags */
  .mb-svg .mb-pa { cursor: pointer; outline: none; -webkit-tap-highlight-color: transparent; }
  .mb-svg .mb-pa .mb-ring { opacity: 0; transition: opacity .15s; }
  .mb-svg .mb-pa.mb-on .mb-ring { opacity: 1; }
  .mb-svg .mb-pa .mb-tagSel { opacity: 0; }
  .mb-svg .mb-pa.mb-on .mb-tagSel { opacity: 1; }
  .mb-svg .mb-pa.mb-on .mb-tagB { transform: scale(1.12); }
  .mb-svg .mb-tagB { transform-box: fill-box; transform-origin: 50% 100%; transition: transform .15s ease-out; }
  .mb-svg .mb-pa:focus-visible .mb-focus { opacity: 1; }
  .mb-svg .mb-ring .mb-pulse { transform-box: fill-box; transform-origin: center; animation: mbPulse 1.3s ease-out infinite; }
  @keyframes mbPulse { 0% { transform: scale(1); opacity: .95; } 100% { transform: scale(1.45); opacity: 0; } }

  /* idle life */
  .mb-svg .mb-i-sway { transform-box: fill-box; transform-origin: 50% 100%; animation: mbSway 3.4s ease-in-out infinite; }
  @keyframes mbSway { 0%,100% { transform: rotate(-1.4deg) } 50% { transform: rotate(1.4deg) } }
  .mb-svg .mb-i-bounce { animation: mbBounce .36s ease-in-out infinite alternate; }
  @keyframes mbBounce { from { transform: translateY(0) } to { transform: translateY(-1.7px) } }
  .mb-svg .mb-i-shuffle { transform-box: fill-box; transform-origin: 50% 100%; animation: mbShuf 1.15s ease-in-out infinite; }
  @keyframes mbShuf { 0%,50%,100% { transform: translateY(0) rotate(0) } 25% { transform: translateY(-1.1px) rotate(-1.6deg) } 75% { transform: translateY(-1.1px) rotate(1.6deg) } }
  .mb-svg .mb-i-breathe { animation: mbBreathe 2.6s ease-in-out infinite; }
  @keyframes mbBreathe { 0%,100% { transform: translateY(0) } 50% { transform: translateY(.9px) } }
  .mb-svg .mb-i-nod { animation: mbNod .44s ease-in-out infinite alternate; }
  @keyframes mbNod { from { transform: rotate(-4deg) } to { transform: rotate(8deg) } }
  .mb-svg .mb-i-look { animation: mbLook 4.6s ease-in-out infinite; }
  @keyframes mbLook { 0%,100% { transform: rotate(-3deg) } 30% { transform: rotate(-3deg) } 45% { transform: rotate(9deg) } 75% { transform: rotate(9deg) } 88% { transform: rotate(-3deg) } }
  .mb-svg .mb-i-scroll { animation: mbScroll 2.2s ease-in-out infinite; }
  @keyframes mbScroll { 0%,100% { transform: rotate(0) } 40% { transform: rotate(3deg) } 60% { transform: rotate(-2deg) } }
  .mb-svg .mb-glow { animation: mbGlow 1.8s ease-in-out infinite; }
  @keyframes mbGlow { 0%,100% { opacity: .5 } 50% { opacity: .95 } }
  .mb-svg .mb-note { opacity: 0; animation: mbNote 2.4s ease-out infinite; }
  @keyframes mbNote { 0% { opacity: 0; transform: translate(0,0) } 15% { opacity: 1 } 100% { opacity: 0; transform: translate(-7px,-15px) rotate(-18deg) } }
  .mb-svg .mb-wv { animation: mbWv .42s ease-in-out infinite alternate; }
  @keyframes mbWv { from { transform: rotate(-12deg) } to { transform: rotate(14deg) } }
  .mb-svg .mb-wv2 { animation: mbWv .5s ease-in-out infinite alternate-reverse; }
  .mb-svg .mb-fan { animation: mbFan .5s ease-in-out infinite alternate; }
  @keyframes mbFan { from { transform: rotate(-6deg) } to { transform: rotate(8deg) } }
  .mb-svg .mb-blink { transform-box: fill-box; transform-origin: center; animation: mbBlink 4.4s infinite; }
  @keyframes mbBlink { 0%, 93%, 100% { transform: scaleY(1) } 95.5% { transform: scaleY(.1) } }
  .mb-svg .mb-shake { animation: mbShake .19s ease-in-out infinite alternate; }
  @keyframes mbShake { from { transform: translateY(0) } to { transform: translateY(.75px) } }
  .mb-svg .mb-exh { opacity: 0; transform-box: fill-box; transform-origin: 50% 50%; animation: mbExh 2.1s ease-out infinite; }
  @keyframes mbExh { 0% { opacity: 0; transform: translate(0,0) scale(.35) } 12% { opacity: .95 } 100% { opacity: 0; transform: translate(var(--ex, 7px), -15px) scale(1.7) } }
  .mb-svg .mb-bubI { transform-box: fill-box; transform-origin: 50% 100%; animation: mbBub 3.3s ease-out infinite; animation-delay: var(--d, 0s); }
  @keyframes mbBub { 0% { transform: scale(.3); opacity: 0 } 4% { transform: scale(1.14); opacity: 1 } 8% { transform: scale(1) } 64% { opacity: 1; transform: scale(1) } 70%, 100% { opacity: 0; transform: scale(.9) } }
  .mb-svg .mb-mA { animation: mbMA 3.3s steps(1) infinite; animation-delay: var(--d, 0s); }
  .mb-svg .mb-mB { animation: mbMB 3.3s steps(1) infinite; animation-delay: var(--d, 0s); }
  @keyframes mbMA { 0% { opacity: 1 } 14% { opacity: 0 } 20% { opacity: 1 } 36% { opacity: 0 } 42% { opacity: 1 } 62%, 100% { opacity: 0 } }
  @keyframes mbMB { 0% { opacity: 0 } 14% { opacity: 1 } 20% { opacity: 0 } 36% { opacity: 1 } 42% { opacity: 0 } 62%, 100% { opacity: 1 } }
  .mb-svg .mb-pf { animation: mbPf 9s linear infinite; }
  @keyframes mbPf { 0% { transform: translate(0,0) rotate(0); opacity: 0 } 6% { opacity: 1 } 25% { transform: translate(8px,40px) rotate(120deg) } 50% { transform: translate(-4px,85px) rotate(230deg) } 75% { transform: translate(9px,130px) rotate(330deg) } 94% { opacity: 1 } 100% { transform: translate(2px,170px) rotate(420deg); opacity: 0 } }
  .mb-svg .mb-rays { transform-box: view-box; animation: mbRays 80s linear infinite; }
  @keyframes mbRays { to { transform: rotate(360deg) } }

  /* a round is running: bubbles / petals / ring pulse stop, and the movers' idle loops */
  .mb-svg.mb-run .mb-bubI, .mb-svg.mb-run .mb-pf { animation: none; }
  .mb-svg.mb-run .mb-bubI { opacity: 1; }
  .mb-svg .mb-mv .mb-i-sway, .mb-svg .mb-mv .mb-i-bounce, .mb-svg .mb-mv .mb-i-shuffle, .mb-svg .mb-mv .mb-i-breathe, .mb-svg .mb-mv .mb-i-nod,
  .mb-svg .mb-mv .mb-i-look, .mb-svg .mb-mv .mb-i-scroll, .mb-svg .mb-mv .mb-wv, .mb-svg .mb-mv .mb-wv2, .mb-svg .mb-mv .mb-fan, .mb-svg .mb-mv .mb-note { animation: none; }
  .mb-svg .mb-mv .mb-note { opacity: 0; }
  .mb-svg .mb-mv .mb-mA { animation: none; opacity: 1; } .mb-svg .mb-mv .mb-mB { animation: none; opacity: 0; }
  .mb-svg.mb-run .mb-ring .mb-pulse { animation: none; }

  /* reduced motion: every idle loop off (media query, or .mb-rm set by the game) */
  @media (prefers-reduced-motion: reduce) {
    .mb-svg .mb-i-sway, .mb-svg .mb-i-bounce, .mb-svg .mb-i-shuffle, .mb-svg .mb-i-breathe, .mb-svg .mb-i-nod, .mb-svg .mb-i-look, .mb-svg .mb-i-scroll,
    .mb-svg .mb-glow, .mb-svg .mb-wv, .mb-svg .mb-wv2, .mb-svg .mb-fan, .mb-svg .mb-blink, .mb-svg .mb-shake, .mb-svg .mb-rays,
    .mb-svg .mb-bubI, .mb-svg .mb-mA, .mb-svg .mb-mB { animation: none !important; }
    .mb-svg .mb-exh, .mb-svg .mb-note, .mb-svg .mb-pf, .mb-svg .mb-ring .mb-pulse { animation: none !important; opacity: 0 !important; }
    .mb-svg .mb-mB { opacity: 0; }
    .mb-svg #mb-actors, .mb-svg #mb-shadows, .mb-svg #mb-fx, .mb-svg #mb-busr { transition: none; }
  }
  .mb-svg.mb-rm .mb-i-sway, .mb-svg.mb-rm .mb-i-bounce, .mb-svg.mb-rm .mb-i-shuffle, .mb-svg.mb-rm .mb-i-breathe, .mb-svg.mb-rm .mb-i-nod,
  .mb-svg.mb-rm .mb-i-look, .mb-svg.mb-rm .mb-i-scroll, .mb-svg.mb-rm .mb-glow, .mb-svg.mb-rm .mb-wv, .mb-svg.mb-rm .mb-wv2, .mb-svg.mb-rm .mb-fan,
  .mb-svg.mb-rm .mb-blink, .mb-svg.mb-rm .mb-shake, .mb-svg.mb-rm .mb-rays, .mb-svg.mb-rm .mb-bubI, .mb-svg.mb-rm .mb-mA, .mb-svg.mb-rm .mb-mB { animation: none !important; }
  .mb-svg.mb-rm .mb-exh, .mb-svg.mb-rm .mb-note, .mb-svg.mb-rm .mb-pf, .mb-svg.mb-rm .mb-ring .mb-pulse { animation: none !important; opacity: 0 !important; }
  .mb-svg.mb-rm .mb-mB { opacity: 0; }
`;

// The {__html} objects are module constants on purpose: React (the canary Next
// ships) re-applies innerHTML whenever the prop object changes identity, which
// would wipe the renderer's work on every re-render.
const HTML = {
  defs: { __html: DEFS }, back: { __html: BACK }, front: { __html: FRONT },
  cast: { __html: CAST }, fx: { __html: FX }, overlay: { __html: OVERLAY },
};
const NO_TAPS = { pointerEvents: 'none' };

export const StreetDefs = memo(function StreetDefs() { return <defs dangerouslySetInnerHTML={HTML.defs} />; });
export const StreetBack = memo(function StreetBack() { return <g dangerouslySetInnerHTML={HTML.back} />; });
export const StreetFront = memo(function StreetFront() { return <g dangerouslySetInnerHTML={HTML.front} />; });
export const Cast = memo(function Cast() { return <g dangerouslySetInnerHTML={HTML.cast} />; });
export const Effects = memo(function Effects() { return <g dangerouslySetInnerHTML={HTML.fx} />; });
export const StreetOverlay = memo(function StreetOverlay() { return <g aria-hidden style={NO_TAPS} dangerouslySetInnerHTML={HTML.overlay} />; });
