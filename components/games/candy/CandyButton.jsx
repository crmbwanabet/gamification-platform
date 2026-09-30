'use client';

import React from 'react';
import { CANDY } from './tokens';

// Raised candy button: solid fill, lighter top highlight + border, sitting on a
// 6px darker base. Pressing drops it onto the base — pure CSS (:active), no JS.
// Colours / lift / ring travel as CSS variables so the scoped :active rule can
// override transform + shadow (inline styles would otherwise win).
// CANDY_BTN_CSS is injected once by CandyScreen; render candy buttons inside it.

export const CANDY_BTN_CSS = `
  .candy-btn {
    position: relative; min-height: 56px; margin-bottom: 6px; padding: 0 14px;
    border: 3px solid var(--cb-light); border-radius: 18px;
    background: linear-gradient(180deg, var(--cb-light) 0%, var(--cb-fill) 42%, var(--cb-fill) 100%);
    color: #fff; font-family: ${CANDY.display}; letter-spacing: .5px; line-height: 1;
    text-shadow: 0 2px 0 rgba(0,0,0,.28);
    box-shadow: inset 0 3px 0 rgba(255,255,255,.35), 0 6px 0 var(--cb-dark), var(--cb-ring, 0 0 0 transparent);
    transform: translateY(var(--cb-lift, 0px));
    transition: transform .08s ease-out, box-shadow .08s ease-out, opacity .15s, filter .15s;
    cursor: pointer; user-select: none; -webkit-user-select: none;
    -webkit-tap-highlight-color: transparent; touch-action: manipulation;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
  }
  .candy-btn:active:not(:disabled) {
    transform: translateY(6px);
    box-shadow: inset 0 3px 0 rgba(255,255,255,.35), 0 0 0 var(--cb-dark), var(--cb-ring, 0 0 0 transparent);
  }
  .candy-btn:focus-visible { outline: 3px solid ${CANDY.gold}; outline-offset: 3px; }
  .candy-btn[data-dim="1"] { opacity: .7; }
  .candy-btn:disabled { cursor: not-allowed; color: rgba(255,255,255,.45); text-shadow: none; opacity: 1; }
`;

// Gold glowing ring + slight lift for the chosen option
const RING = `0 0 0 3px ${CANDY.gold}, 0 0 18px 2px rgba(255,210,31,.65)`;

export default function CandyButton({ color = 'green', children, onClick, disabled, selected, dim, big, style, ...rest }) {
  const c = disabled ? CANDY.off : (CANDY[color] || CANDY.green);
  return (
    <button type="button" className="candy-btn" onClick={onClick} disabled={disabled}
      data-dim={dim && !selected && !disabled ? '1' : undefined}
      aria-pressed={selected === undefined ? undefined : !!selected}
      style={{
        '--cb-fill': c.fill, '--cb-light': c.light, '--cb-dark': c.dark,
        '--cb-ring': selected && !disabled ? RING : '0 0 0 transparent',
        '--cb-lift': selected && !disabled ? '-4px' : '0px',
        fontSize: big ? 36 : 24, minHeight: big ? 72 : 56, borderRadius: big ? 22 : 18,
        ...style,
      }}
      {...rest}>
      {children}
    </button>
  );
}
