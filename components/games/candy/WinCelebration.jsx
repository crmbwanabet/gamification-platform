'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import CandyButton from './CandyButton';
import { CANDY, textStroke } from './tokens';
import { RewardIcon } from '../../redesign/RedesignShell';

// Win celebration for the candy games (the old design's "YOU WON / K100 /
// Claim Prize!" panel, in the candy look). Render it as the LAST child of a
// CandyScreen: it covers the game area (dimmed), leaving the header — title,
// balance pill, X — bright and tappable.
//
// Money never waits on this: the game has already reported the round (onRound)
// and the platform has credited the payout. This is display only — the game
// shows `balance - payout + added` in the pill while the panel is up, and
// onTick(added) walks `added` up to the payout as the coins land; onDone() is
// the game's cue to drop the panel. Closing the game mid-celebration just
// unmounts it — nothing is lost or paid twice.
//
// Stages: wait (delay — invisible, blocks taps so the next round can't start)
// → shown (pop-in, burst, flash, count-up) → collecting (coins fly from
// COLLECT to the pill, each bumps it and ticks the number) → closing → onDone.
// Reduced motion: final number at once, no burst / flash / coins; COLLECT
// ticks the pill straight to the new balance and closes.

const N_COINS = 10;
const COUNT_MS = 900;
const FLY_MS = 620;
const STAGGER_MS = 70;
const OUT_MS = 220;
const CONFETTI_COLORS = [CANDY.gold, '#FFF3B0', CANDY.green.light, CANDY.violet.light, '#FF6B9A', '#6AC8FF', '#fff'];

const CSS = `
  @keyframes wcDim { from { opacity: 0 } to { opacity: 1 } }
  @keyframes wcPop { 0% { opacity: 0; transform: scale(.45) } 62% { opacity: 1; transform: scale(1.07) } 82% { transform: scale(.97) } 100% { opacity: 1; transform: scale(1) } }
  @keyframes wcOut { from { opacity: 1; transform: scale(1) } to { opacity: 0; transform: scale(.82) } }
  @keyframes wcFadeOut { from { opacity: 1 } to { opacity: 0 } }
  @keyframes wcFlash { 0% { opacity: 0 } 25% { opacity: .85 } 100% { opacity: 0 } }
  @keyframes wcBurst {
    0% { opacity: 1; transform: translate(-50%, -50%) rotate(0deg) scale(.6) }
    55% { opacity: 1; transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) rotate(var(--r)) scale(1) }
    100% { opacity: 0; transform: translate(calc(-50% + var(--dx) * 1.15), calc(-50% + var(--dy) + 150px)) rotate(calc(var(--r) * 1.6)) scale(.9) }
  }
  @keyframes wcGlow { 0%, 100% { box-shadow: 0 0 0 3px ${CANDY.goldDeep}, 0 0 26px rgba(255,210,31,.45), 0 18px 40px rgba(0,0,0,.55), inset 0 2px 0 rgba(255,255,255,.25) }
                      50% { box-shadow: 0 0 0 3px ${CANDY.goldDeep}, 0 0 40px rgba(255,210,31,.7), 0 18px 40px rgba(0,0,0,.55), inset 0 2px 0 rgba(255,255,255,.25) } }
  .wc-p { position: absolute; left: 50%; top: 46%; pointer-events: none; animation: wcBurst 1150ms cubic-bezier(.12,.75,.35,1) both; }
`;

const NUM_SHADOW = [
  textStroke(3.5, CANDY.outline),
  `0 6px 0 ${CANDY.outline}`,
  '0 0 22px rgba(255,210,31,.55)',
].join(', ');

function makeBurst() {
  const out = [];
  for (let i = 0; i < 30; i++) {
    const a = (i / 30) * Math.PI * 2 + Math.random() * .3;
    const d = 90 + Math.random() * 90;
    const coin = i % 5 === 0;
    out.push({
      coin,
      dx: Math.cos(a) * d, dy: Math.sin(a) * d * .8 - 30,
      r: (Math.random() - .5) * 720,
      w: coin ? 20 : 6 + Math.random() * 5, h: coin ? 20 : 9 + Math.random() * 7,
      c: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      delay: Math.random() * 90,
      round: !coin && i % 3 === 0,
    });
  }
  return out;
}

// Quadratic bezier sampled into WAAPI keyframes (the whole flight eases in,
// so coins speed up into the pill).
function arcFrames(from, ctrl, to, steps = 14) {
  const f = [];
  for (let k = 0; k <= steps; k++) {
    const t = k / steps, u = 1 - t;
    const x = u * u * from.x + 2 * u * t * ctrl.x + t * t * to.x;
    const y = u * u * from.y + 2 * u * t * ctrl.y + t * t * to.y;
    const s = 1.15 - .5 * t;
    f.push({ transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) scale(${s.toFixed(3)})`, opacity: t > .96 ? .4 : 1 });
  }
  return f;
}

export default function WinCelebration({ payout, reduced = false, delay = 0, pillRef, onTick, onDone }) {
  const [stage, setStage] = useState(delay > 0 && !reduced ? 'wait' : 'shown');
  const [shown, setShown] = useState(reduced ? payout : 0);
  const rootRef = useRef(null);
  const flyRef = useRef(null);
  const btnRef = useRef(null);
  const timers = useRef([]);
  const alive = useRef(true);
  const cb = useRef({ onTick, onDone });
  cb.current = { onTick, onDone };
  const burst = useMemo(() => (reduced ? [] : makeBurst()), [reduced]);

  const later = (fn, ms) => { const t = setTimeout(() => { if (alive.current) fn(); }, ms); timers.current.push(t); };
  // Idempotent under mount → unmount → mount (React StrictMode in dev): the
  // body re-arms `alive` every mount instead of relying on its initial value.
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; timers.current.forEach(clearTimeout); timers.current = []; };
  }, []);

  // The delay owns its own timer, so a remount simply starts it again.
  useEffect(() => {
    if (stage !== 'wait') return undefined;
    const t = setTimeout(() => setStage('shown'), delay);
    return () => clearTimeout(t);
  }, [stage, delay]);

  // Count-up 0 → payout (ease-out), and focus COLLECT for keyboard users
  useEffect(() => {
    if (stage !== 'shown') return undefined;
    try { btnRef.current?.focus({ preventScroll: true }); } catch (e) { /* old browser */ }
    if (reduced) { setShown(payout); return undefined; }
    let raf = 0;
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / COUNT_MS);
      setShown(Math.round(payout * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [stage, payout, reduced]);

  const bumpPill = () => {
    const el = pillRef?.current;
    if (!el || !el.animate) return;
    el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.22)' }, { transform: 'scale(1)' }], { duration: 230, easing: 'ease-out' });
  };

  const close = () => {
    setStage('closing');
    later(() => cb.current.onDone?.(), reduced ? 0 : OUT_MS);
  };

  const collect = () => {
    if (stage !== 'shown') return;
    setShown(payout);
    const root = rootRef.current, layer = flyRef.current, pill = pillRef?.current, btn = btnRef.current;
    if (reduced || !root || !layer || !pill || !btn || !layer.animate) {
      cb.current.onTick?.(payout);
      close();
      return;
    }
    setStage('collecting');
    const rr = root.getBoundingClientRect(), br = btn.getBoundingClientRect(), pr = pill.getBoundingClientRect();
    const SZ = 26;
    const to = { x: pr.left - rr.left + 4, y: pr.top - rr.top + (pr.height - SZ) / 2 }; // onto the pill's coin icon
    let landed = 0;
    for (let i = 0; i < N_COINS; i++) {
      later(() => {
        const from = { x: br.left - rr.left + br.width / 2 - SZ / 2 + (Math.random() - .5) * br.width * .5, y: br.top - rr.top + br.height / 2 - SZ / 2 + (Math.random() - .5) * 14 };
        const side = i % 2 ? 1 : -1;
        const ctrl = { x: (from.x + to.x) / 2 + side * (50 + Math.random() * 60), y: Math.min(from.y, to.y) + (from.y - to.y) * .35 };
        const img = document.createElement('img');
        img.src = '/ui/reward/coins.png'; img.alt = ''; img.width = SZ; img.height = SZ;
        img.style.cssText = `position:absolute;left:0;top:0;width:${SZ}px;height:${SZ}px;pointer-events:none;filter:drop-shadow(0 2px 3px rgba(0,0,0,.45));will-change:transform`;
        layer.appendChild(img);
        const anim = img.animate(arcFrames(from, ctrl, to), { duration: FLY_MS, easing: 'cubic-bezier(.4,0,.8,.6)', fill: 'forwards' });
        anim.onfinish = () => {
          img.remove();
          if (!alive.current) return;
          landed += 1;
          cb.current.onTick?.(Math.round((payout * landed) / N_COINS));
          bumpPill();
          if (landed === N_COINS) later(close, 260);
        };
      }, i * STAGGER_MS);
    }
  };

  const visible = stage !== 'wait';
  const out = stage === 'closing' && !reduced;

  return (
    <div ref={rootRef} onClick={(e) => { e.stopPropagation(); if (stage === 'shown') collect(); }}
      style={{ position: 'absolute', inset: 0, zIndex: 5, borderRadius: 14 }}>
      <style>{CSS}</style>
      {visible && (
        <>
          {/* dim layer over the game */}
          <div aria-hidden style={{
            position: 'absolute', inset: 0, borderRadius: 14, background: 'rgba(14,3,32,.66)',
            animation: out ? `wcFadeOut ${OUT_MS}ms ease-in both` : (reduced ? 'none' : 'wcDim 220ms ease-out both'),
          }} />
          {!reduced && (
            <div aria-hidden style={{ position: 'absolute', inset: 0, borderRadius: 14, pointerEvents: 'none', background: 'radial-gradient(circle at 50% 46%, rgba(255,226,122,.95) 0%, rgba(255,210,31,.55) 35%, rgba(255,210,31,0) 75%)', animation: 'wcFlash 380ms ease-out both' }} />
          )}
          {/* burst behind the panel */}
          {stage !== 'closing' && burst.map((p, i) => (
            p.coin
              ? <img key={i} className="wc-p" src="/ui/reward/coins.png" alt="" width={p.w} height={p.h}
                  style={{ '--dx': `${p.dx.toFixed(1)}px`, '--dy': `${p.dy.toFixed(1)}px`, '--r': `${p.r.toFixed(0)}deg`, animationDelay: `${p.delay.toFixed(0)}ms` }} />
              : <span key={i} className="wc-p" aria-hidden
                  style={{ width: p.w, height: p.h, background: p.c, borderRadius: p.round ? '50%' : 2, '--dx': `${p.dx.toFixed(1)}px`, '--dy': `${p.dy.toFixed(1)}px`, '--r': `${p.r.toFixed(0)}deg`, animationDelay: `${p.delay.toFixed(0)}ms` }} />
          ))}
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
            <div role="dialog" aria-label={`You won ${payout} coins`} onClick={(e) => e.stopPropagation()}
              style={{
                pointerEvents: 'auto', width: 'calc(100% - 20px)', maxWidth: 290, boxSizing: 'border-box',
                padding: '18px 18px 12px', borderRadius: 24, textAlign: 'center',
                background: `radial-gradient(ellipse 120% 80% at 50% 0%, #9B4BF0 0%, #6A22C8 45%, #3C0D86 100%)`,
                border: `3px solid ${CANDY.gold}`,
                animation: out ? `wcOut ${OUT_MS}ms ease-in both`
                  : (reduced ? 'none' : 'wcPop 460ms cubic-bezier(.2,.9,.3,1.2) both, wcGlow 1.6s ease-in-out 460ms infinite'),
                boxShadow: `0 0 0 3px ${CANDY.goldDeep}, 0 0 26px rgba(255,210,31,.45), 0 18px 40px rgba(0,0,0,.55), inset 0 2px 0 rgba(255,255,255,.25)`,
              }}>
              <div style={{ fontFamily: CANDY.display, fontSize: 17, letterSpacing: 4, color: CANDY.gold, textShadow: `0 2px 0 ${CANDY.outline}` }}>YOU WON</div>
              <div aria-hidden style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, margin: '6px 0 2px', height: 76 }}>
                <span style={{ fontFamily: CANDY.display, fontSize: 64, lineHeight: 1, color: CANDY.gold, fontVariantNumeric: 'tabular-nums', textShadow: NUM_SHADOW, transform: `scale(${(.88 + .12 * (payout ? shown / payout : 1)).toFixed(3)})` }}>
                  {shown}
                </span>
                <RewardIcon kind="coins" size={46} style={{ filter: 'drop-shadow(0 3px 0 rgba(42,10,79,.9))' }} />
              </div>
              <div style={{ fontFamily: CANDY.body, fontWeight: 700, fontSize: 15, color: 'rgba(255,255,255,.86)', margin: '0 0 12px' }}>
                Coins added to your balance
              </div>
              <CandyButton ref={btnRef} color="green" big onClick={collect}
                style={{ width: '100%', minHeight: 62, fontSize: 32, borderRadius: 18, pointerEvents: stage === 'shown' ? 'auto' : 'none' }}>
                <span style={{ textShadow: `${textStroke(2.5, CANDY.outline)}, 0 4px 0 ${CANDY.outline}` }}>COLLECT</span>
              </CandyButton>
            </div>
          </div>
          <div ref={flyRef} aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'visible' }} />
        </>
      )}
    </div>
  );
}
