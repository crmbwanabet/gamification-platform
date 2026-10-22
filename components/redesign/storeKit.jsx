'use client';

import React from 'react';
import { CANDY } from './tokens';
import { amountText } from '@/lib/rewardText.mjs';
import { formatKwacha, formatNumber } from '@/lib/economy/currency.mjs';
import { packArtAmount, STORE_UNLOCK_STAGE, STORE_UNLOCK_XP } from '@/lib/store/catalog.mjs';

// Coins & Store redesign (2026-10-14, design "Coins & Store"): shared art and
// the texture/depth system (`bb-*` classes) used by the Home store panel and
// the Store tab. Velvet panels, grain-tiled tiles, recessed art wells, gold
// bevel frames, glossy green buttons, pressed "N more" locks and a glowing
// gold meter. Art lives in public/ui/store.

const ART = '/ui/store';
export const STORE_ART = {
  banner: `${ART}/banner.jpg`,
  logo: `${ART}/bwanabet-logo.png`,
  quilt: `${ART}/quilt.png`,
  grain: `${ART}/grain.png`,
  chest: `${ART}/chest-cut.png`,
  stack: `${ART}/stack-small.png`,
};
/** Pack art for a kwacha pack item (pack-k1 … pack-k50). */
export const packArtSrc = (item) => `${ART}/pack-k${packArtAmount(item?.payoutKwacha || 0)}.png`;

export const BB_CSS = `
  .bb-lockhost { position: relative; }
  .bb-locked { filter: grayscale(1) brightness(.75); opacity: .5; pointer-events: none; user-select: none; }
  .bb-shoplock { position: absolute; z-index: 5; left: 50%; top: 50%; transform: translate(-50%, -50%); display: flex; flex-direction: column; align-items: center; gap: 4px;
    padding: 16px 22px; border-radius: 20px; text-align: center; background: rgba(20,6,44,.92); border: 2.5px solid #FFD21F;
    box-shadow: 0 0 0 2px #2A0A4F, 0 14px 34px rgba(0,0,0,.55); color: #fff; white-space: nowrap; }
  .bb-shoplock img { width: 56px; height: 56px; display: block; }
  .bb-shoplock b { font-family: ${CANDY.display}; font-weight: 400; font-size: 22px; line-height: 1.05; color: #FFD21F; text-transform: uppercase; text-shadow: 0 2px 0 #2A0A4F; }
  .bb-shoplock span { font-size: 13px; font-weight: 800; color: #E4D8F7; }
  .bb-shoplock--high { top: 120px; transform: translateX(-50%); }
  .bb-shoplock--static { position: static; transform: none; margin: 0 auto; }
  .bb-velvet { background: url(${STORE_ART.quilt}), radial-gradient(120% 90% at 50% 0%, #3C1586 0%, #26094F 100%);
    box-shadow: inset 0 1px 0 rgba(255,255,255,.14), inset 0 -2px 0 rgba(0,0,0,.35), 0 14px 30px rgba(6,0,20,.55); }
  .bb-tile { border: 2px solid transparent;
    background: radial-gradient(circle at 50% 30%, rgba(255,196,60,.30) 0%, rgba(255,196,60,0) 55%), url(${STORE_ART.grain}), linear-gradient(180deg, #4C1FA0 0%, #2F0F68 100%);
    box-shadow: inset 0 1px 0 rgba(255,255,255,.22), inset 0 -3px 0 rgba(0,0,0,.30), 0 8px 16px rgba(6,0,20,.5); }
  .bb-tile.bb-ready { border-color: #43C21A; }
  .bb-well { background: radial-gradient(circle at 50% 55%, rgba(255,200,70,.45) 0%, rgba(255,200,70,0) 62%), url(${STORE_ART.grain}), #1C0742;
    box-shadow: inset 0 5px 12px rgba(0,0,0,.6), inset 0 -1px 0 rgba(255,255,255,.14); }
  /* Top-prize frame = bevelled BwanaBet yellow (logo #FEF200), same as the daily card; .yb-glint adds the travelling glint. */
  .bb-gold { --yb-w: 2px; border-color: #FEF200;
    box-shadow: inset 0 0 0 2px #FFFBB8, inset 0 0 0 4px rgba(110,88,0,.9), inset 0 2px 18px rgba(254,242,0,.24), 0 0 0 1.5px #6E5800, 0 0 22px rgba(254,242,0,.34), 0 12px 26px rgba(6,0,20,.55); }
  .bb-tile.bb-gold { border-color: #FEF200; }
  .bb-lock { box-sizing: border-box; display: flex; align-items: center; justify-content: center; text-align: center;
    background: linear-gradient(180deg, #24104D 0%, #1A0839 100%); color: #B9A0E6; font-weight: 800;
    box-shadow: inset 0 2px 5px rgba(0,0,0,.55), 0 1px 0 rgba(255,255,255,.08); }
  .bb-meter { position: relative; overflow: hidden; border-radius: 999px; background: linear-gradient(180deg, #12042C, #220A4C);
    box-shadow: inset 0 2px 4px rgba(0,0,0,.7), 0 1px 0 rgba(255,255,255,.12); }
  .bb-fill { height: 100%; border-radius: 999px; background: linear-gradient(180deg, #FFF0A0 0%, #FFD21F 45%, #E09A00 100%);
    box-shadow: inset 0 1px 0 rgba(255,255,255,.7), 0 0 10px rgba(255,200,40,.6); }
  /* Pack art: fade the outer 8% so the art's square glow edge never shows. */
  .bb-art { -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 8%, #000 92%, transparent 100%), linear-gradient(180deg, transparent 0, #000 8%, #000 92%, transparent 100%);
    -webkit-mask-composite: source-in; mask-image: linear-gradient(90deg, transparent 0, #000 8%, #000 92%, transparent 100%), linear-gradient(180deg, transparent 0, #000 8%, #000 92%, transparent 100%);
    mask-composite: intersect; }
  .bb-title { text-shadow: 0 2px 0 #B07800, 0 4px 0 #2A0A4F, 0 8px 14px rgba(0,0,0,.55); }
  .bb-k { font-family: ${CANDY.display}; font-weight: 400; line-height: 1; color: #FFD21F; }
  .bb-display { font-family: ${CANDY.display}; font-weight: 400; }

  /* Buy buttons: glossy green; armed (second tap) = gold; busy = grey. */
  .bb-buy { all: unset; box-sizing: border-box; cursor: pointer; display: flex; align-items: center; justify-content: center; text-align: center;
    white-space: nowrap; font-family: ${CANDY.body}; font-weight: 900; color: #fff;
    background: linear-gradient(180deg, #7BE34F 0%, #43C21A 48%, #33A010 100%);
    box-shadow: inset 0 2px 0 rgba(255,255,255,.55), inset 0 -2px 0 rgba(0,0,0,.18), 0 4px 0 #22700A, 0 8px 14px rgba(0,0,0,.4);
    text-shadow: 0 2px 0 rgba(20,80,0,.6); }
  .bb-buy:active:not(:disabled) { transform: translateY(2px); box-shadow: inset 0 2px 0 rgba(255,255,255,.5), inset 0 -2px 0 rgba(0,0,0,.18), 0 2px 0 #22700A, 0 4px 8px rgba(0,0,0,.4); }
  .bb-buy:focus-visible, .bb-link:focus-visible { outline: 3px solid #FFD21F; outline-offset: 2px; }
  .bb-buy.bb-armed { color: #2A0A4F; text-shadow: none; background: linear-gradient(180deg, #FFF0A0 0%, #FFD21F 45%, #E09A00 100%);
    box-shadow: inset 0 2px 0 rgba(255,255,255,.7), 0 4px 0 #8a5a00, 0 0 14px rgba(255,200,40,.55); }
  .bb-buy:disabled { cursor: default; color: rgba(255,255,255,.75); text-shadow: none; background: #54496B; box-shadow: 0 3px 0 #2F2742; }
  .bb-link { all: unset; box-sizing: border-box; cursor: pointer; display: inline-flex; align-items: center; justify-content: center;
    white-space: nowrap; font-weight: 900; color: #FFD21F; border-radius: 999px; background: rgba(23,6,52,.75); }
  .bb-link:hover { color: #FFE45C; }
  @media (prefers-reduced-motion: no-preference) {
    .bb-buy { transition: transform .08s ease, box-shadow .08s ease, background .15s ease; }
    .bb-fill { transition: width .6s cubic-bezier(.2,.8,.3,1); }
  }
`;

/** Gold coin-progress meter. `pct` 0..100. */
export function CoinMeter({ pct, height = 12, style, label }) {
  return (
    <div className="bb-meter" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} aria-label={label}
      style={{ height, flex: 1, minWidth: 0, ...style }}>
      <div className="bb-fill" style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Pressed "N more" plate shown instead of Buy while a pack is out of reach. */
export function PackLock({ short, className = '', style }) {
  return (
    <div className={`bb-lock ${className}`} style={style} aria-label={`${amountText(short, 'coins')} more needed`}>
      {formatNumber(short)} more
    </div>
  );
}

/** "26,600 to K5" (short) or "26,600 more for the K5 pack" (long). */
export const goalText = (goal, long = false) => (goal
  ? (long ? `${formatNumber(goal.short)} more for the ${formatKwacha(goal.pack.payoutKwacha)} pack` : `${formatNumber(goal.short)} to ${formatKwacha(goal.pack.payoutKwacha)}`)
  : 'You can buy every pack');

/**
 * Coin Shop lock (level 10, lib/store/catalog.mjs): the plate laid over the
 * greyed shop on Home and in the Store tab. `xp` = the player's XP;
 * reason 'soon' = the shop is switched off for everyone (storeLockReason).
 */
export function ShopLockPlate({ xp = 0, reason = 'stage', className = '' }) {
  const left = Math.max(0, STORE_UNLOCK_XP - (Number(xp) || 0));
  if (reason === 'soon') {
    return (
      <div className={`bb-shoplock ${className}`} role="note" data-shop-locked="soon">
        <img src="/ui/reward/lock.png" alt="" width={56} height={56} />
        <b>Coming soon</b>
        <span>Keep collecting coins</span>
      </div>
    );
  }
  return (
    <div className={`bb-shoplock ${className}`} role="note" data-shop-locked>
      <img src="/ui/reward/lock.png" alt="" width={56} height={56} />
      <b>Opens at level {STORE_UNLOCK_STAGE}</b>
      <span>{left > 0 ? `${formatNumber(left)} XP to go` : 'Almost there'}</span>
    </div>
  );
}

/** Wraps the shop: greyed out and not clickable (inert) while locked. */
export function ShopLockWrap({ locked, children, className = '' }) {
  const ref = React.useCallback((el) => { if (el) { if (locked) el.setAttribute('inert', ''); else el.removeAttribute('inert'); } }, [locked]);
  return <div ref={ref} className={`${locked ? 'bb-locked ' : ''}${className}`} aria-hidden={locked || undefined}>{children}</div>;
}
