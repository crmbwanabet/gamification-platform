'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { CANDY, dotRow, goldTitle } from './tokens';
import { textStroke, COIN_ICON } from '../games/candy/tokens';
import { DAILY_REWARDS } from '@/lib/data/platform';
import { DAILY_LOGIN_XP } from '@/lib/xp/sources.mjs';
import XpStar, { XP_BLUE } from './XpStar';
import { RewardIcon } from './RedesignShell';
import { Sparkles } from './Shine';
import { rewardParts, amountText } from '@/lib/rewardText.mjs';
import { GEMS } from '@/lib/economy/currency.mjs';
import ChestPoster from './ChestPoster';

// three.js chest, client-only (lazy so the Home bundle stays light)
// While the 3D chunk loads, show the chest poster (same image TreasureChest3D starts from) so nothing pops in.
let chestPosterMode = 'idle';
const TreasureChest3D = dynamic(() => import('./TreasureChest3D'), {
  ssr: false,
  loading: () => <span style={{ position: 'relative', display: 'block', width: 118, height: 100 }}><ChestPoster mode={chestPosterMode} /></span>,
});

const IC = '/ui/reward'; // generated 3D reward icons
const STACK = '/ui/store/stack-small.png'; // K-coin stack (Coin Shop art)

const rewardText = (r) => rewardParts(r).join(' + ');
// Icon for a reward row: coins when it pays coins, else its first gem.
const iconKind = (r) => (r?.kwacha ? 'coins' : GEMS.find(g => r?.[g]) || 'coins');
// The headline amount of a row (coins, else its first gem) as { n, unit, extra }:
// 30 / "coins" / [] — `extra` = any further currencies ("1 emerald").
const headline = (r) => {
  const kind = iconKind(r);
  const n = (kind === 'coins' ? r?.kwacha : r?.[kind]) || 0;
  const unit = amountText(n, kind).replace(/^[\d,]+\s/, '');
  const gems = GEMS.filter(g => g !== kind && r?.[g]).map(g => ({ kind: g, n: r[g], unit: amountText(r[g], g).replace(/^[\d,]+\s/, '') }));
  return { kind, n, unit, extra: rewardParts(r).slice(1), gems };
};

// Coin art per day (2026-10-20 redesign, canvas La5VWFzkQ76ae6bKZwCEnS): the
// pile grows through the week, 1 → 2 → 3 coins, then K stacks, so the climb
// to the day-7 chest is visible. [src, left, top, width, height] in a 64×44 box.
const DAY_ART = [
  [[COIN_ICON, 15, 6, 34, 34]],
  [[COIN_ICON, 8, 12, 28, 28], [COIN_ICON, 26, 4, 30, 30]],
  [[COIN_ICON, 2, 14, 26, 26], [COIN_ICON, 36, 14, 26, 26], [COIN_ICON, 17, 2, 30, 30]],
  [[STACK, 6, 4, 52, 39]],
  [[STACK, 0, 3, 54, 40], [COIN_ICON, 38, 0, 24, 24]],
  [[STACK, 2, 1, 58, 43], [COIN_ICON, -4, 18, 24, 24], [COIN_ICON, 42, 20, 24, 24]],
];

const OUT = CANDY.outline;
// BwanaBet yellow (the logo's #FEF200) bevel for the card frame and the day-7 chest (2026-10-14).
const YB_BEVEL = 'linear-gradient(155deg, #FFFDE0 0%, #FEF200 16%, #D4B300 40%, #FEF200 60%, #FFF9A8 76%, #A88800 100%)';
const YB_DOTS = 'radial-gradient(circle, #FFFDE0 0 1.6px, rgba(254,242,0,.5) 2.2px, transparent 3px)';
const QUILT = "url('/ui/store/quilt.png') center/72px";
const TILE_BG = `${QUILT}, linear-gradient(180deg, #4F1F9C 0%, #2E0E66 100%)`;
// Layout follows the CARD's width (container query), not the screen: one row
// of 7 days on a wide card (desktop Home column), 4 + 3 on a phone.
const DR_CSS = `
  .rs-daily { container-type: inline-size; }
  .dr-inner { position: relative; border-radius: 16px; overflow: hidden; padding: 14px; display: flex; flex-direction: column; gap: 14px;
    background: radial-gradient(120% 60% at 50% 0%, #6a33c4 0%, #3a1680 40%, #22094d 100%); }
  .dr-inner::before { content: ''; position: absolute; inset: 0; background: url('/ui/store/grain.png'); opacity: .22; mix-blend-mode: overlay; pointer-events: none; }
  .dr-inner > * { position: relative; }
  /* header: gift | title + subtitle | DAY N/7 pill. The title block takes the
     free width and never runs under the pill; when the three can't share a
     row (narrow phones, ~360px and below) the pill wraps to its own line. */
  .dr-head { display: flex; align-items: center; flex-wrap: wrap; gap: 8px 10px; }
  .dr-htxt { flex: 1 1 auto; min-width: 0; }
  .dr-head h2 { font-size: min(23px, 8.4cqi) !important; white-space: nowrap; }
  .dr-gift { position: relative; flex: none; width: 50px; height: 50px; }
  .dr-gift > img.dr-g { width: 50px; height: 50px; object-fit: contain; display: block; filter: drop-shadow(0 5px 8px rgba(0,0,0,.45)); }
  .dr-gift > img.dr-chk { position: absolute; right: -5px; bottom: -3px; width: 24px; height: 24px; object-fit: contain; }
  .dr-sub { font-size: 12.5px; font-weight: 800; color: #DCCFF2; margin-top: 5px; }
  .dr-streak { margin-left: auto; flex: none; display: inline-flex; align-items: center; gap: 4px; padding: 5px 10px 5px 7px; border-radius: 999px;
    background: linear-gradient(180deg, #FFE45C, #F2B705); box-shadow: inset 0 1px 0 rgba(255,255,255,.6), 0 3px 0 #A87A00;
    color: #3A1600; font-family: ${CANDY.display}; font-size: 15px; line-height: 1; white-space: nowrap; }
  .dr-streak small { font-family: ${CANDY.body}; font-weight: 900; font-size: 11px; opacity: .75; }

  .dr-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; padding-top: 4px; }
  .dr-tile { position: relative; height: 118px; box-sizing: border-box; border-radius: 14px; padding: 12px 2px 7px; display: flex; flex-direction: column; align-items: center; min-width: 0;
    border: 1.5px solid #7B42D6; background: ${TILE_BG}; background-blend-mode: soft-light, normal;
    box-shadow: inset 0 1.5px 0 rgba(255,255,255,.24), inset 0 -3px 0 rgba(0,0,0,.22), 0 3px 0 #1A0640; transition: transform .2s; }
  .dr-lbl { font-size: 11px; font-weight: 900; letter-spacing: .08em; color: rgba(255,255,255,.78); }
  .dr-art { position: relative; width: 64px; height: 44px; margin: 3px 0 2px; flex: none; }
  .dr-art > img { position: absolute; filter: drop-shadow(0 3px 3px rgba(0,0,0,.45)); }
  .dr-art > .dr-gem { position: absolute; left: 14px; top: 4px; }
  .dr-amt { font-family: ${CANDY.display}; font-size: 22px; line-height: 1; color: #fff; text-shadow: ${textStroke(1.5, OUT)}, 0 3px 0 ${OUT}; }
  .dr-unit { font-size: 11px; font-weight: 800; color: rgba(255,255,255,.82); white-space: nowrap; }
  .dr-extra { font-size: 9.5px; font-weight: 900; color: rgba(255,255,255,.85); line-height: 1.1; text-align: center; }
  .dr-tile.past { border-color: #43237A; background: ${QUILT}, linear-gradient(180deg, #2A1152 0%, #1C0A3B 100%); background-blend-mode: soft-light, normal; box-shadow: inset 0 2px 6px rgba(0,0,0,.45); }
  .dr-tile.past .dr-art, .dr-tile.past .dr-amt, .dr-tile.past .dr-unit, .dr-tile.past .dr-extra { opacity: .42; }
  .dr-stamp { position: absolute; left: 50%; top: 38px; width: 38px; height: 38px; margin-left: -19px; filter: drop-shadow(0 2px 4px rgba(0,0,0,.6)); }
  .dr-tile.today { border: 2px solid ${CANDY.gold}; transform: translateY(-4px);
    background: radial-gradient(70% 55% at 50% 42%, rgba(255,214,60,.42), transparent 72%), ${QUILT}, linear-gradient(180deg, #6427C2 0%, #34106F 100%);
    background-blend-mode: normal, soft-light, normal; box-shadow: inset 0 1.5px 0 rgba(255,255,255,.35), 0 4px 0 #A87A00, 0 0 20px rgba(255,210,31,.55); }
  .dr-tile.today .dr-lbl, .dr-tile.today .dr-unit { color: ${CANDY.gold}; }
  .dr-tile.today .dr-art { animation: drBob 1.4s ease-in-out infinite; }
  .dr-tile.next { border-color: ${CANDY.violet.light}; }
  .dr-flag { position: absolute; top: -9px; left: 50%; transform: translateX(-50%); padding: 2px 8px; border-radius: 999px; z-index: 2;
    background: ${CANDY.gold}; color: #3A1600; font-size: 10px; font-weight: 900; letter-spacing: .1em; white-space: nowrap; box-shadow: 0 2px 0 #A87A00; }
  .dr-tile.next .dr-flag { background: ${CANDY.violet.light}; color: ${OUT}; box-shadow: 0 2px 0 ${CANDY.violet.dark}; }

  .dr-chest { grid-column: span 2; position: relative; height: 118px; box-sizing: border-box; border-radius: 14px; display: flex; align-items: center; gap: 2px; padding: 6px 8px 6px 0; min-width: 0;
    --yb-w: 2.5px; border: 2.5px solid transparent;
    background: radial-gradient(70% 90% at 30% 55%, rgba(255,220,80,.45), transparent 70%) padding-box, ${QUILT} padding-box, linear-gradient(180deg, #6E3613 0%, #2E1306 100%) padding-box, ${YB_BEVEL} border-box;
    background-blend-mode: normal, soft-light, normal, normal;
    box-shadow: inset 0 1px 0 rgba(255,255,225,.5), 0 4px 0 #8A7400, 0 0 16px rgba(254,242,0,.3); }
  .dr-chest.today { transform: translateY(-4px); box-shadow: inset 0 1px 0 rgba(255,255,225,.6), 0 4px 0 #8A7400, 0 0 30px rgba(254,242,0,.85); }
  .dr-chest.done { background: ${QUILT} padding-box, linear-gradient(180deg, #2A1152 0%, #1C0A3B 100%) padding-box, ${YB_BEVEL} border-box; background-blend-mode: soft-light, normal, normal; box-shadow: inset 0 2px 6px rgba(0,0,0,.45); }
  .dr-chest.done::before { display: none; }
  .dr-ribbon { position: absolute; top: -10px; left: 50%; transform: translateX(-50%); padding: 2px 9px; border-radius: 999px; z-index: 3;
    font-weight: 900; font-size: 10px; letter-spacing: .08em; color: #fff; white-space: nowrap;
    background: linear-gradient(180deg, ${CANDY.red.light}, ${CANDY.red.fill}); border: 1.5px solid ${CANDY.red.dark}; }
  .dr-chest.today .dr-ribbon { background: ${CANDY.gold}; border-color: #A87A00; color: #3A1600; }
  .dr-cart { position: relative; flex: none; width: 70px; height: 60px; margin-left: 2px; }
  .dr-rays { position: absolute; inset: -10px; border-radius: 50%; opacity: .55; animation: drSpin 14s linear infinite;
    background: repeating-conic-gradient(rgba(255,226,122,.28) 0 12deg, transparent 12deg 30deg);
    -webkit-mask: radial-gradient(circle, #000 30%, transparent 70%); mask: radial-gradient(circle, #000 30%, transparent 70%); }
  .dr-chest.done .dr-rays { display: none; }
  .dr-3d { position: absolute; left: -6px; top: -10px; width: 118px; height: 100px; pointer-events: none; z-index: 1; transform: scale(.7); transform-origin: 0 0; }
  .dr-cart > img.dr-badge { position: absolute; right: -4px; bottom: -2px; width: 24px; height: 24px; z-index: 2; }
  .dr-ctxt { flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: center; text-align: center; z-index: 2; }
  .dr-big { font-family: ${CANDY.display}; font-size: 26px; line-height: 1.05; color: ${CANDY.gold}; text-shadow: ${textStroke(2, OUT)}, 0 4px 0 ${OUT}; }
  .dr-chest.done .dr-big { opacity: .5; }
  .dr-csub { font-size: 11px; font-weight: 800; color: #fff; margin-top: 3px; line-height: 1.2; white-space: nowrap; }
  .dr-csub.g { color: #FFE9A8; }

  .dr-rail { display: none; height: 8px; border-radius: 999px; background: rgba(10,2,30,.6); box-shadow: inset 0 1px 2px rgba(0,0,0,.6); overflow: hidden; }
  .dr-rail > span { display: block; height: 100%; border-radius: 999px; background: linear-gradient(90deg, #F2B705, #FFE45C); }
  .dr-act { display: flex; flex-direction: column; gap: 10px; }
  .dr-btn-lbl { display: inline-flex; align-items: center; justify-content: center; gap: 7px; flex-direction: row; white-space: nowrap; }
  .dr-btn-lbl .dr-plus { opacity: .7; }
  .dr-foot { text-align: center; font-size: 12.5px; font-weight: 800; color: rgba(255,255,255,.8); }
  .dr-foot b { color: ${CANDY.gold}; }
  .rs-claim-tomorrow:disabled { color: #fff !important; text-shadow: 0 2px 0 rgba(0,0,0,.28) !important; cursor: default !important; }
  .rs-claim-login:disabled { font-size: 17px !important; color: #fff !important; cursor: default !important; }

  /* wide card (desktop Home column): one row of 7 days, progress rail, foot + button side by side */
  @container (min-width: 620px) {
    .dr-inner { padding: 16px 18px; gap: 16px; }
    .dr-gift, .dr-gift > img.dr-g { width: 56px; height: 56px; }
    .dr-sub { font-size: 13px; }
    .dr-streak { font-size: 17px; padding: 6px 12px 6px 9px; }
    .dr-grid { grid-template-columns: repeat(8, minmax(0, 1fr)); gap: 10px; }
    .dr-head h2 { font-size: 30px !important; }
    .dr-tile, .dr-chest { height: 134px; }
    .dr-tile { padding-top: 14px; }
    .dr-art { margin: 5px 0 4px; height: 48px; }
    .dr-amt { font-size: 24px; }
    .dr-lbl, .dr-unit { font-size: 11.5px; }
    .dr-stamp { top: 44px; width: 40px; height: 40px; margin-left: -20px; }
    .dr-cart { width: 86px; height: 74px; }
    .dr-3d { transform: scale(.86); left: -8px; top: -12px; }
    .dr-big { font-size: 30px; }
    .dr-csub { font-size: 11.5px; }
    .dr-rail { display: block; }
    .dr-act { flex-direction: row-reverse; align-items: center; gap: 16px; }
    .dr-act > button { width: 340px !important; flex: none; }
    .dr-foot { flex: 1; text-align: left; font-size: 13px; line-height: 1.4; }
  }

  /* popup (todayOnly): no week grid, today's prize big */
  .dr-prize { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 10px 14px; padding: 18px 10px 20px; border-radius: 14px;
    background: rgba(20,4,48,.62); border: 1.5px solid rgba(255,210,31,.35); }
  .dr-prize-lbl { flex-basis: 100%; text-align: center; font-size: 14px; font-weight: 900; letter-spacing: .1em; color: rgba(255,255,255,.72); margin-bottom: 4px; }
  .dr-prize-lbl.done { color: ${CANDY.green.light}; }
  .dr-pz { display: inline-flex; align-items: center; gap: 10px; font-family: ${CANDY.display}; font-size: 44px; line-height: 1; color: #fff; text-shadow: ${textStroke(1.5, OUT)}, 0 3px 0 ${OUT}; white-space: nowrap; }
  .dr-pz small { font-family: ${CANDY.body}; font-size: 20px; font-weight: 900; text-shadow: none; color: rgba(255,255,255,.85); }
  .dr-pz.xp, .dr-pz.xp small { color: ${XP_BLUE}; }
  .dr-pz img, .dr-pz svg { width: 52px !important; height: 52px !important; }
  .dr-plus { font-family: ${CANDY.display}; font-size: 32px; color: rgba(255,255,255,.6); }
  .dr-btn-lbl .dr-plus { font-size: inherit; color: inherit; }

  @keyframes drBob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
  @keyframes drSpin { to { transform: rotate(360deg); } }
  @keyframes drPop { 0% { transform: scale(.4); opacity: 0; } 60% { transform: scale(1.25); opacity: 1; } 100% { transform: scale(1); } }
  .dr-pop { animation: drPop .35s ease-out both; }
  @media (prefers-reduced-motion: reduce) {
    .dr-tile.today .dr-art, .dr-rays, .dr-pop { animation: none !important; }
    .dr-tile { transition: none; }
  }
`;

/** Streak flame for the "DAY 3/7" pill. */
const Flame = () => (
  <svg width="14" height="16" viewBox="0 0 14 16" aria-hidden="true" style={{ flex: 'none' }}>
    <path d="M7 1c1 3 4 4.5 4 8.5A4 4 0 0 1 3 9.5C3 7.5 4 6.5 5 5.5c0 1.5.8 2.5 2 2.5C7 5.5 6 3.5 7 1z" fill={CANDY.red.fill} stroke="#3A1600" strokeWidth="1.2" strokeLinejoin="round" />
  </svg>
);

/** The growing coin pile of a day tile (a gem row shows its gem instead). */
function DayArt({ index, kind }) {
  if (kind !== 'coins') return <span className="dr-art"><RewardIcon kind={kind} size={36} className="dr-gem" /></span>;
  return (
    <span className="dr-art" aria-hidden="true">
      {DAY_ART[Math.min(index, DAY_ART.length - 1)].map(([src, left, top, w, h], i) => (
        <img key={i} src={src} alt="" width={w} height={h} style={{ left, top, width: w, height: h }} />
      ))}
    </span>
  );
}

/**
 * 7-day daily login reward at the top of Home (redesign 2026-10-20, canvas
 * La5VWFzkQ76ae6bKZwCEnS): a gold-rimmed panel with grain + quilt textures, a
 * red gift + title + a "DAY N/7" streak pill, the week as fixed-size tiles
 * whose coin pile grows day by day (past = pressed in with a tick stamp,
 * today = gold with a TODAY flag, tomorrow = NEXT once claimed), day 7 as a
 * two-tile treasure chest with a ribbon, then ONE button that carries today's
 * prize ("CLAIM 50 + 20 XP"). Phones: 4 + 3 tiles; a wide card (container
 * ≥ 620px, the desktop Home column) puts the week in one row with a progress
 * rail and the footer beside the button. Once claimed the button is a red,
 * non-actionable "Tomorrow {coins}"; logged-out visitors get a grey log-in hint.
 * `todayOnly` (the popup) drops the week and shows today's prize big instead.
 * Amounts come from the remote-config table (cfg.dailyRewards), the same row
 * claimDailyReward credits: rewards[dailyDay - 1], falling back to rewards[0].
 * `id` (default "daily-reward-card", the Home card) is where the platform aims the
 * "reward ready" confetti; the popup copy uses "daily-reward-popup".
 */
export default function DailyReward({ id = 'daily-reward-card', todayOnly = false, dailyDay = 1, dailyClaimed = false, onClaim, rewards = null, loggedIn = true }) {
  const list = (rewards && rewards.length ? rewards : DAILY_REWARDS);
  const total = list.length; // 7
  // claimDailyReward already advanced dailyDay (7 wraps to 1), so once claimed
  // the row just received is the one before it.
  const shownDay = dailyClaimed ? ((dailyDay - 2 + total) % total) + 1 : Math.min(dailyDay, total);
  const shown = list[shownDay - 1] || list[0];
  const tomorrow = list[dailyDay - 1] || list[0];
  const xpText = amountText(DAILY_LOGIN_XP, 'xp');
  const isBonusDay = shownDay === total;

  // Pop the tile (or chest) that was just claimed.
  const [justClaimed, setJustClaimed] = React.useState(false);
  const prevClaimed = React.useRef(dailyClaimed);
  React.useEffect(() => {
    if (dailyClaimed && !prevClaimed.current) {
      setJustClaimed(true);
      const t = setTimeout(() => setJustClaimed(false), 600);
      prevClaimed.current = dailyClaimed;
      return () => clearTimeout(t);
    }
    prevClaimed.current = dailyClaimed;
  }, [dailyClaimed]);

  const days = list.slice(0, total - 1);
  const last = list[total - 1] || list[0];
  const lastH = headline(last);
  const chestState = dailyClaimed && isBonusDay ? 'done' : !dailyClaimed && isBonusDay ? 'today' : 'future';
  const chestMode = chestState === 'done' ? 'open' : chestState === 'today' ? 'today' : 'idle';
  chestPosterMode = chestMode;
  const daysLeft = total - shownDay;
  const shownH = headline(shown);
  const tomorrowH = headline(tomorrow);
  // The tile that pays tomorrow (after today's claim; day 7 wraps to a new week).
  const nextDay = dailyClaimed && !isBonusDay ? shownDay + 1 : null;
  const claimLabel = `Claim ${rewardText(shown)}`;
  const tomorrowLabel = `Tomorrow ${rewardText(tomorrow)}`;
  // Progress rail (wide card): the share of the week done, today's tile half-way.
  const railPct = Math.round(((dailyClaimed ? shownDay : shownDay - 0.5) / total) * 100);
  // One line on a phone: shrink the label as it grows (gem rows, 1,000 coins).
  const fit = (txt, icon = 0) => { const n = txt.length + icon; return n <= 17 ? 21 : n <= 22 ? 19 : n <= 27 ? 17 : 15; };
  const btnTxt = `CLAIM ${shownH.n.toLocaleString('en-US')}${shownH.gems.map(g => ` + ${g.n} ${g.unit}`).join('')} + ${DAILY_LOGIN_XP} XP`;

  const button = dailyClaimed ? (
    <button type="button" className="candy-btn rs-claim-tomorrow" disabled aria-disabled="true" tabIndex={-1}
      style={{ '--cb-fill': CANDY.red.fill, '--cb-light': CANDY.red.light, '--cb-dark': CANDY.red.dark, width: '100%', fontSize: fit(tomorrowLabel, 2), minHeight: 58 }}>
      <span className="dr-btn-lbl">Tomorrow <RewardIcon kind={tomorrowH.kind} size={24} />{rewardText(tomorrow)}</span>
    </button>
  ) : loggedIn ? (
    <button type="button" className="candy-btn rs-claim-pulse" onClick={(e) => onClaim && onClaim(e && e.currentTarget)}
      aria-label={`${claimLabel} and ${xpText}`}
      style={{ '--cb-fill': CANDY.green.fill, '--cb-light': CANDY.green.light, '--cb-dark': CANDY.green.dark, width: '100%', fontSize: fit(btnTxt, 4), minHeight: 58 }}>
      <span className="dr-btn-lbl">
        {isBonusDay && !todayOnly ? 'Open chest' : 'Claim'}
        <RewardIcon kind={shownH.kind} size={26} shine={{ delay: 0.4, duration: 4 }} />
        {shownH.n.toLocaleString('en-US')}
        {shownH.gems.map(g => <React.Fragment key={g.kind}><span className="dr-plus">+</span><RewardIcon kind={g.kind} size={22} />{g.n}</React.Fragment>)}
        <span className="dr-plus">+</span>
        <XpStar size={24} />{DAILY_LOGIN_XP} XP
      </span>
    </button>
  ) : (
    <button type="button" className="candy-btn rs-claim-login" disabled
      style={{ '--cb-fill': CANDY.off.fill, '--cb-light': CANDY.off.light, '--cb-dark': CANDY.off.dark, width: '100%', fontSize: 17, minHeight: 58, color: '#fff' }}>
      Log in on bwanabet.com to claim
    </button>
  );
  const foot = dailyClaimed
    ? <>Plus <b>{xpText}</b> tomorrow{isBonusDay ? ' · a new week starts' : ''}</>
    : loggedIn ? <>Come back every day. <b>Miss a day</b> and you start again at day 1</>
      : <>{rewardText({ kwacha: list.reduce((s, r) => s + (r?.kwacha || 0), 0) })} + {amountText(DAILY_LOGIN_XP * total, 'xp')} every full week</>;

  return (
    <section id={id} aria-label="Daily reward" className={`rs-daily yb-frame yb-glint${todayOnly ? ' dr-today-only' : ''}`} style={{ '--yb-w': '3px', '--yb-dur': '8s', position: 'relative', padding: 8, borderRadius: 24 }}>
      <style dangerouslySetInnerHTML={{ __html: DR_CSS }} />
      <span aria-hidden style={{ ...dotRow(false), backgroundImage: YB_DOTS, top: 0.5, left: 22, right: 22, height: 8 }} />
      <span aria-hidden style={{ ...dotRow(false), backgroundImage: YB_DOTS, bottom: 0.5, left: 22, right: 22, height: 8 }} />
      <div className="dr-inner">
        <div className="dr-head">
          <span className="dr-gift">
            <img src={`${IC}/gift-red.png`} alt="" width={50} height={50} className={`dr-g${dailyClaimed || !loggedIn ? '' : ' anim-wiggle'}`} />
            {dailyClaimed && <img src={`${IC}/check.png`} alt="" width={24} height={24} className="dr-chk" />}
          </span>
          <div className="dr-htxt">
            <h2 style={goldTitle(26)}>Daily reward</h2>
            <div className="dr-sub">
              {dailyClaimed ? 'Claimed today' : isBonusDay && loggedIn ? `${total} days in a row!` : `Log in ${total} days in a row`}
            </div>
          </div>
          {loggedIn && <span className="dr-streak" aria-label={`Day ${shownDay} of ${total}`}><Flame />DAY {shownDay}<small>/{total}</small></span>}
        </div>

        {!todayOnly && <div className="dr-grid">
          {days.map((r, i) => {
            const day = i + 1;
            const past = dailyClaimed ? day <= shownDay : day < shownDay;
            const today = loggedIn && !dailyClaimed && day === shownDay;
            const next = day === nextDay;
            const h = headline(r);
            const cls = past ? 'past' : today ? 'today' : next ? 'next' : 'future';
            return (
              <div key={day} className={`dr-tile ${cls}${justClaimed && dailyClaimed && day === shownDay ? ' dr-pop' : ''}`}
                aria-label={`Day ${day}: ${rewardText(r)}${past ? ', claimed' : today ? ', today' : next ? ', tomorrow' : ''}`}>
                {today && <span className="dr-flag">TODAY</span>}
                {next && <span className="dr-flag">NEXT</span>}
                <span className="dr-lbl">DAY {day}</span>
                <DayArt index={i} kind={h.kind} />
                <span className="dr-amt">{h.n.toLocaleString('en-US')}</span>
                {h.extra.length > 0 ? <span className="dr-extra">+ {h.extra.join(' + ')}</span> : <span className="dr-unit">{h.unit}</span>}
                {past && <img src={`${IC}/check.png`} alt="" className="dr-stamp" />}
              </div>
            );
          })}
          <div className={`dr-chest yb-glint ${chestState}${justClaimed && chestState === 'done' ? ' dr-pop' : ''}`}
            aria-label={`Day ${total} bonus chest: ${rewardText(last)} for ${total} days in a row${chestState === 'done' ? ', claimed' : chestState === 'today' ? ', today' : ''}`}>
            <span className="dr-ribbon">{chestState === 'today' ? `DAY ${total} · TODAY` : `DAY ${total} BONUS`}</span>
            <span className="dr-cart">
              <span className="dr-rays" aria-hidden />
              <span className="dr-3d" aria-hidden><TreasureChest3D mode={chestMode} size={118} /></span>
              {chestState !== 'done' && <Sparkles variant={1} scale={0.8} />}
              {chestState === 'done' && <img src={`${IC}/check.png`} alt="" className="dr-badge" />}
            </span>
            <span className="dr-ctxt">
              <span className="dr-big">{lastH.n.toLocaleString('en-US')}</span>
              <span className="dr-csub">{lastH.extra.length > 0 ? `${lastH.unit} + ${lastH.extra.join(' + ')}` : lastH.unit}</span>
              {loggedIn && (
                <span className="dr-csub g">
                  {chestState === 'done' ? 'Chest opened!' : chestState === 'today' ? 'Open today!' : `${daysLeft} day${daysLeft === 1 ? '' : 's'} to go`}
                </span>
              )}
            </span>
          </div>
        </div>}

        {!todayOnly && loggedIn && <div className="dr-rail" aria-hidden="true"><span style={{ width: `${railPct}%` }} /></div>}

        {todayOnly && (
          <div className="dr-prize" aria-label={`${dailyClaimed ? 'Claimed today' : "Today's prize"}: ${rewardText(shown)} and ${xpText}`}>
            <span className={`dr-prize-lbl${dailyClaimed ? ' done' : ''}`}>{dailyClaimed ? 'CLAIMED TODAY' : "TODAY'S PRIZE"}</span>
            <span className="dr-pz"><RewardIcon kind={shownH.kind} size={28} />{shownH.n.toLocaleString('en-US')}<small>{shownH.unit}</small></span>
            {shownH.gems.map(g => <React.Fragment key={g.kind}><span className="dr-plus" aria-hidden>+</span><span className="dr-pz"><RewardIcon kind={g.kind} size={24} />{g.n}<small>{g.unit}</small></span></React.Fragment>)}
            <span className="dr-plus" aria-hidden>+</span>
            <span className="dr-pz xp"><XpStar size={32} />{DAILY_LOGIN_XP}<small>XP</small></span>
          </div>
        )}

        <div className="dr-act">
          {button}
          <div className="dr-foot">{foot}</div>
        </div>
      </div>
    </section>
  );
}
