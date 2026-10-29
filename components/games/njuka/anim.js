'use client';

// Njuka animation vocabulary — Web Animations API helpers + shared durations.
// Every helper no-ops under prefers-reduced-motion so the game collapses to
// static state changes exactly like the rest of the platform.

import { useEffect, useRef } from 'react';

export const DEAL_MS = 320;      // one card's deck→seat flight
export const DEAL_STAGGER = 90;  // gap between dealt cards
export const FLIP_MS = 420;      // rotateY reveal
export const FLIGHT_MS = 300;    // seat→pile / discard arrival flight
export const CHIP_MS = 550;      // chip seat→pot / pot→winner flight

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// Fly the element in from the center of another element (by DOM id).
// Used for: dealing (from #njk-deck), discard-pile arrivals (from a seat),
// bot draws (deck → seat). Runs once per `key` change.
export function useFlyFrom(sourceId, key, { delay = 0, duration = FLIGHT_MS, spin = 0 } = {}) {
  const ref = useRef(null);
  useEffect(() => {
    if (key == null || prefersReducedMotion()) return;
    const el = ref.current;
    const src = document.getElementById(sourceId);
    if (!el || !src) return;
    const a = src.getBoundingClientRect();
    const b = el.getBoundingClientRect();
    if (!b.width) return;
    const dx = a.left + a.width / 2 - (b.left + b.width / 2);
    const dy = a.top + a.height / 2 - (b.top + b.height / 2);
    el.animate(
      [
        { transform: `translate(${dx}px, ${dy}px) rotate(${spin}deg) scale(.85)`, opacity: 0.85 },
        { transform: 'translate(0, 0) rotate(0deg) scale(1)', opacity: 1 },
      ],
      { duration, delay, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'backwards' }
    );
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return ref;
}

// 3D flip-in (back → face). The element must contain .njk-flip-back and
// .njk-flip-front absolutely-stacked children with backface-visibility hidden.
export function useFlipIn(key, { delay = 0, duration = FLIP_MS } = {}) {
  const ref = useRef(null);
  useEffect(() => {
    if (key == null || prefersReducedMotion()) return;
    const el = ref.current;
    if (!el) return;
    el.animate(
      [{ transform: 'rotateY(180deg)' }, { transform: 'rotateY(0deg)' }],
      { duration, delay, easing: 'cubic-bezier(.3,.6,.3,1)', fill: 'backwards' }
    );
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return ref;
}

// Imperative chip flight between two DOM ids: spawns a gold chip, flies it,
// removes it. Fire-and-forget; safe to call repeatedly. Reduced motion: skip.
export function flyChip(fromId, toId, { delay = 0, onArrive } = {}) {
  if (typeof document === 'undefined') return;
  if (prefersReducedMotion()) { onArrive?.(); return; }
  const from = document.getElementById(fromId);
  const to = document.getElementById(toId);
  if (!from || !to) { onArrive?.(); return; }
  const a = from.getBoundingClientRect();
  const b = to.getBoundingClientRect();
  const chip = document.createElement('div');
  chip.style.cssText = `position:fixed;left:${a.left + a.width / 2 - 9}px;top:${a.top + a.height / 2 - 9}px;` +
    'width:18px;height:18px;border-radius:50%;z-index:120;pointer-events:none;' +
    'background:radial-gradient(circle at 35% 30%, #f5d878, #e6ad4a 55%, #a97a24);' +
    'box-shadow:0 2px 6px rgba(0,0,0,.5), inset 0 0 0 2.5px rgba(255,255,255,.35);';
  document.body.appendChild(chip);
  const anim = chip.animate(
    [
      { transform: 'translate(0,0) scale(1)', opacity: 1 },
      { transform: `translate(${b.left + b.width / 2 - (a.left + a.width / 2)}px, ${b.top + b.height / 2 - (a.top + a.height / 2)}px) scale(.8)`, opacity: 0.95 },
    ],
    { duration: CHIP_MS, delay, easing: 'cubic-bezier(.3,.5,.2,1)', fill: 'backwards' }
  );
  anim.onfinish = () => { chip.remove(); onArrive?.(); };
  anim.oncancel = () => chip.remove();
}
