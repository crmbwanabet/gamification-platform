'use client';

import React from 'react';

// One 150×44 floor of the Tower Build house (from the design's Floor piece):
// ground floor = front door, top = tin roof with a water tank + aerial, the
// rest cycle barred windows / curtains + air-con / balcony with washing, some
// with a satellite dish. Pure markup, positioned by its parent.

export const FLOOR_W = 150;
export const FLOOR_H = 44;
const INK = '#2A0A4F';

const WALLS = ['#2F9C95', '#E8C547', '#D96A8A', 'brick', '#9AC87A', '#F0EFE6', '#E8874A', '#7CB8E8'];
const KINDS = ['bars', 'curtain', 'balcony'];
const CURTAINS = ['#E3261E', '#1E63E6', '#A43BE8', '#43C21A', '#FF8A1F'];

// What floor n (1..max) looks like.
export function floorPiece(n, max) {
  if (n >= max) return { kind: 'roof' };
  const kind = n === 1 ? 'door' : KINDS[(n - 2) % KINDS.length];
  return {
    kind, bg: WALLS[(n - 1) % WALLS.length], curtain: CURTAINS[n % CURTAINS.length],
    glass: n % 2 ? '#6FB6E2' : '#5A9FD0', dish: n % 4 === 0 && kind !== 'balcony',
  };
}

const A = (s) => ({ position: 'absolute', boxSizing: 'border-box', ...s });

function BarWindow({ left, glass }) {
  return (
    <>
      <div style={A({ left, top: 13, width: 30, height: 21, background: '#F4F1E8', border: `2px solid ${INK}` })}>
        <div style={A({ inset: 2, background: `linear-gradient(135deg, #CFEAF8 0 22%, ${glass} 22%)` })} />
        <div style={A({ inset: 2, background: `repeating-linear-gradient(90deg, ${INK} 0 2px, rgba(0,0,0,0) 2px 6px)` })} />
        <div style={A({ left: 2, right: 2, top: 7, height: 2, background: INK })} />
      </div>
      <div style={A({ left: left - 3, top: 33, width: 36, height: 4, background: '#E6E0D2', border: `2px solid ${INK}` })} />
    </>
  );
}

function CurtainWindow({ left, curtain }) {
  return (
    <>
      <div style={A({ left, top: 12, width: 40, height: 22, background: '#FFE7A6', border: `2px solid ${INK}`, overflow: 'hidden' })}>
        <div style={A({ left: 0, top: 0, bottom: 0, width: 14, background: curtain, borderRadius: '0 0 8px 0', boxShadow: 'inset -3px 0 0 rgba(0,0,0,.18)' })} />
        <div style={A({ right: 0, top: 0, bottom: 0, width: 14, background: curtain, borderRadius: '0 0 0 8px', boxShadow: 'inset 3px 0 0 rgba(0,0,0,.18)' })} />
        <div style={A({ left: 0, right: 0, top: 0, height: 3, background: INK })} />
      </div>
      <div style={A({ left: left - 3, top: 33, width: 46, height: 4, background: '#E6E0D2', border: `2px solid ${INK}` })} />
    </>
  );
}

function SmallWindow({ left, glass }) {
  return (
    <div style={A({ left, top: 13, width: 24, height: 20, background: '#F4F1E8', border: `2px solid ${INK}` })}>
      <div style={A({ inset: 2, background: `linear-gradient(135deg, #CFEAF8 0 22%, ${glass} 22%)` })} />
      <div style={A({ left: 9, top: 0, bottom: 0, width: 2, background: INK })} />
    </div>
  );
}

const BRICK_ROWS = [
  { top: 0, left: 0, bg: '#7A2E18 0 2px, #B5532E 2px 18px, #A84A28 18px 20px, #BE5C34 20px 34px', line: true },
  { top: 10, left: -9, bg: '#7A2E18 0 2px, #BE5C34 2px 16px, #B5532E 16px 34px', line: true },
  { top: 20, left: 0, bg: '#7A2E18 0 2px, #A84A28 2px 18px, #B5532E 18px 34px', line: true },
  { top: 30, left: -9, bg: '#7A2E18 0 2px, #B5532E 2px 20px, #BE5C34 20px 34px', line: false },
];

function Roof() {
  return (
    <>
      {/* water tank on legs */}
      <div style={A({ left: 96, bottom: 30, width: 30, height: 30 })}>
        <div style={A({ left: 3, bottom: 0, width: 3, height: 10, background: INK })} />
        <div style={A({ right: 3, bottom: 0, width: 3, height: 10, background: INK })} />
        <div style={A({ left: 0, right: 0, bottom: 9, height: 21, background: 'linear-gradient(90deg, #3A3A44, #1C1C24 70%)', border: '2px solid #12121A', borderRadius: '6px 6px 2px 2px' })} />
        <div style={A({ left: 0, right: 0, bottom: 16, height: 2, background: 'rgba(255,255,255,.18)' })} />
        <div style={A({ left: 0, right: 0, bottom: 22, height: 2, background: 'rgba(255,255,255,.18)' })} />
      </div>
      {/* TV aerial */}
      <div style={A({ left: 30, bottom: 30, width: 2, height: 30, background: INK })} />
      <div style={A({ left: 22, bottom: 52, width: 18, height: 2, background: INK })} />
      <div style={A({ left: 25, bottom: 45, width: 12, height: 2, background: INK })} />
      {/* red tin roof */}
      <div style={A({ left: -14, right: -14, bottom: 0, height: 40, background: INK, clipPath: 'polygon(50% 0, 100% 100%, 0 100%)' })} />
      <div style={A({ left: -8, right: -8, bottom: 3, height: 34, background: 'repeating-linear-gradient(90deg, #D8423A 0 7px, #A82820 7px 10px)', clipPath: 'polygon(50% 0, 100% 100%, 0 100%)' })} />
      <div style={A({ left: 58, bottom: 21, width: 34, height: 3, background: 'rgba(255,255,255,.35)' })} />
      <div style={A({ left: 66, bottom: 9, width: 18, height: 10, borderRadius: '9px 9px 0 0', background: INK })} />
      <div style={A({ left: 69, bottom: 9, width: 12, height: 7, borderRadius: '6px 6px 0 0', background: `repeating-linear-gradient(90deg, #FFD21F 0 2px, ${INK} 2px 4px)` })} />
      <div style={A({ left: -16, right: -16, bottom: -2, height: 6, background: '#8A8A92', border: `2px solid ${INK}` })} />
    </>
  );
}

export default function Floor({ f }) {
  const k = f.kind;
  if (k === 'roof') return <div style={{ position: 'relative', width: FLOOR_W, height: FLOOR_H }}><Roof /></div>;
  const brick = f.bg === 'brick';
  const glass = f.glass || '#6FB6E2';
  const curtain = f.curtain || '#E3261E';
  return (
    <div style={{ position: 'relative', width: FLOOR_W, height: FLOOR_H }}>
      <div style={A({ left: 0, right: 0, top: 5, bottom: 0, background: brick ? '#7A2E18' : f.bg, border: `3px solid ${INK}`, overflow: 'hidden' })}>
        <div style={A({ inset: 0, background: 'repeating-linear-gradient(115deg, rgba(255,255,255,.07) 0 2px, rgba(255,255,255,0) 2px 7px)' })} />
        {brick && BRICK_ROWS.map((r, i) => (
          <div key={i} style={A({ left: r.left, right: 0, top: r.top, height: 8, background: `repeating-linear-gradient(90deg, ${r.bg})`, borderBottom: r.line ? '2px solid #7A2E18' : undefined })} />
        ))}
        <div style={A({ left: 0, right: 0, bottom: 0, height: 9, background: 'linear-gradient(0deg, rgba(42,10,79,.28), rgba(42,10,79,0))' })} />
      </div>
      {/* drain pipe */}
      <div style={A({ right: 7, top: 8, bottom: 0, width: 5, background: '#9A9AA6', borderLeft: `2px solid ${INK}`, borderRight: `2px solid ${INK}` })} />
      <div style={A({ right: 5, top: 22, width: 9, height: 3, background: INK })} />

      {k === 'door' && (
        <>
          <div style={A({ left: 56, top: 13, width: 38, height: 4, background: INK, borderRadius: 2 })} />
          <div style={A({ left: 70, top: 10, width: 10, height: 5, background: '#FFE08A', border: `2px solid ${INK}`, borderRadius: '0 0 6px 6px' })} />
          <div style={A({ left: 60, top: 17, width: 30, height: 24, background: '#1E63E6', border: `3px solid ${INK}`, borderBottom: 0 })}>
            <div style={A({ left: 3, top: 3, width: 8, height: 7, border: '2px solid #113F9C' })} />
            <div style={A({ right: 3, top: 3, width: 8, height: 7, border: '2px solid #113F9C' })} />
            <div style={A({ left: 3, top: 12, width: 18, height: 6, border: '2px solid #113F9C' })} />
            <div style={A({ right: 2, top: 10, width: 3, height: 3, borderRadius: '50%', background: '#FFD21F' })} />
          </div>
          <div style={A({ left: 54, bottom: -3, width: 42, height: 5, background: '#C9C2B2', border: `2px solid ${INK}` })} />
          <div style={A({ left: 12, top: 15, width: 34, height: 18, background: '#F4F1E8', border: `2px solid ${INK}` })}>
            <div style={A({ inset: 2, background: 'linear-gradient(135deg, #CFEAF8 0 22%, #6FB6E2 22%)' })} />
            <div style={A({ inset: 2, background: `repeating-linear-gradient(90deg, ${INK} 0 2px, rgba(0,0,0,0) 2px 6px)` })} />
          </div>
          <div style={A({ left: 9, top: 32, width: 40, height: 4, background: '#E6E0D2', border: `2px solid ${INK}` })} />
          {/* flower pot */}
          <div style={A({ left: 98, top: 26, width: 12, height: 11, background: '#B5532E', border: `2px solid ${INK}`, borderRadius: '0 0 4px 4px' })} />
          <div style={A({ left: 96, top: 14, width: 16, height: 14, borderRadius: '50%', background: '#3A8044', border: `2px solid ${INK}` })} />
          <div style={A({ left: 100, top: 12, width: 6, height: 6, borderRadius: '50%', background: '#E0408A' })} />
        </>
      )}

      {k === 'bars' && [10, 55, 100].map(l => <BarWindow key={l} left={l} glass={glass} />)}

      {k === 'curtain' && (
        <>
          <CurtainWindow left={10} curtain={curtain} />
          {/* air-con */}
          <div style={A({ left: 62, top: 15, width: 22, height: 13, background: '#F2F2F2', border: `2px solid ${INK}`, borderRadius: 2 })}>
            <div style={A({ left: 2, right: 2, top: 2, height: 5, background: 'repeating-linear-gradient(0deg, #9A9AA6 0 1px, rgba(0,0,0,0) 1px 2px)' })} />
            <div style={A({ right: 2, bottom: 1, width: 3, height: 2, background: '#43C21A' })} />
          </div>
          <CurtainWindow left={92} curtain={curtain} />
        </>
      )}

      {k === 'balcony' && (
        <>
          <SmallWindow left={12} glass={glass} />
          <div style={A({ left: 54, top: 11, width: 42, height: 27, background: '#F4F1E8', border: `2px solid ${INK}` })}>
            <div style={A({ inset: 2, background: 'linear-gradient(135deg, #CFEAF8 0 18%, #5FA8D8 18%)' })} />
            <div style={A({ left: 17, top: 0, bottom: 0, width: 2, background: INK })} />
          </div>
          <div style={A({ left: 44, top: 25, width: 62, height: 14, border: `2px solid ${INK}`, borderBottom: 0, background: `repeating-linear-gradient(90deg, ${INK} 0 2px, rgba(0,0,0,0) 2px 7px)` })} />
          <div style={A({ left: 41, top: 37, width: 68, height: 5, background: '#D8D2C4', border: `2px solid ${INK}` })} />
          {/* washing line */}
          <div style={A({ left: 47, top: 21, width: 56, height: 2, background: INK })} />
          <div style={A({ left: 52, top: 22, width: 9, height: 10, background: '#E3261E', border: `1px solid ${INK}` })} />
          <div style={A({ left: 64, top: 22, width: 8, height: 8, background: '#F2F2F2', border: `1px solid ${INK}` })} />
          <div style={A({ left: 86, top: 22, width: 10, height: 11, background: '#43C21A', border: `1px solid ${INK}` })} />
          <SmallWindow left={114} glass={glass} />
        </>
      )}

      {f.dish && (
        <>
          <div style={A({ left: -11, top: 10, width: 16, height: 16, borderRadius: '50%', background: 'radial-gradient(circle at 60% 40%, #FFFFFF, #C8C8D0)', border: `2px solid ${INK}` })} />
          <div style={A({ left: 3, top: 17, width: 7, height: 2, background: INK })} />
        </>
      )}

      {/* slab on top */}
      <div style={A({ left: -5, right: -5, top: 0, height: 8, background: '#E6E0D2', border: `3px solid ${INK}`, borderRadius: 2, boxShadow: '0 3px 0 rgba(42,10,79,.35)' })} />
    </div>
  );
}
