'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { CANDY, goldRim, dotRow, innerGlow, goldTitle } from './tokens';
import { textStroke } from '../games/candy/tokens';
import { DAILY_REWARDS } from '@/lib/data/platform';
import { DAILY_LOGIN_XP } from '@/lib/xp/sources.mjs';
import { RewardIcon } from './RedesignShell';
import { rewardParts, amountText } from '@/lib/rewardText.mjs';
import { GEMS } from '@/lib/economy/currency.mjs';

// three.js chest, client-only (lazy so the Home bundle stays light)
const TreasureChest3D = dynamic(() => import('./TreasureChest3D'), { ssr: false, loading: () => null });

const IC = '/ui/reward'; // generated 3D reward icons

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

const OUT = CANDY.outline;
const DR_CSS = `
  .dr-head { display: flex; align-items: center; justify-content: center; gap: 10px; }
  .dr-gift { position: relative; flex: none; width: 60px; height: 60px; }
  .dr-gift > img.dr-g { width: 60px; height: 60px; object-fit: contain; display: block; filter: drop-shadow(0 5px 8px rgba(0,0,0,.45)); }
  .dr-gift > img.dr-chk { position: absolute; right: -5px; bottom: -3px; width: 26px; height: 26px; object-fit: contain; }
  .dr-sub { font-size: 12.5px; font-weight: 800; color: rgba(255,255,255,.75); margin-top: 4px; }
  .dr-sub b { color: ${CANDY.gold}; }
  .dr-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 7px; }
  .dr-tile { position: relative; border-radius: 14px; padding: 7px 2px 6px; display: flex; flex-direction: column; align-items: center; gap: 2px; min-width: 0;
    background: linear-gradient(180deg, #3a137a, #24094A); border: 2.5px solid ${CANDY.violet.fill}; box-shadow: 0 4px 0 ${CANDY.violet.dark}; transition: transform .2s; }
  .dr-lbl { font-size: 10px; font-weight: 900; letter-spacing: .05em; color: rgba(255,255,255,.7); }
  .dr-ic { position: relative; width: 38px; height: 38px; display: grid; place-items: center; }
  .dr-ic > img.dr-coin { filter: drop-shadow(0 3px 4px rgba(0,0,0,.4)); }
  .dr-ic > img.dr-badge { position: absolute; right: -6px; bottom: -4px; width: 20px; height: 20px; object-fit: contain; }
  .dr-amt { font-family: ${CANDY.display}; font-size: 19px; line-height: 1; color: #fff; text-shadow: ${textStroke(1.5, OUT)}, 0 3px 0 ${OUT}; }
  .dr-unit { font-size: 10px; font-weight: 900; color: rgba(255,255,255,.8); margin-top: -1px; }
  .dr-extra { font-size: 9px; font-weight: 900; color: rgba(255,255,255,.8); line-height: 1.1; text-align: center; }
  .dr-tile.past { background: linear-gradient(180deg, #2f6e1c, #1d4a10); border-color: ${CANDY.green.fill}; box-shadow: 0 4px 0 ${CANDY.green.dark}; }
  .dr-tile.past img.dr-coin { opacity: .55; }
  .dr-tile.today { border-color: ${CANDY.gold}; box-shadow: 0 4px 0 ${CANDY.goldDeep}, 0 0 16px rgba(255,210,31,.6); transform: translateY(-2px); }
  .dr-tile.today .dr-lbl, .dr-tile.today .dr-unit { color: ${CANDY.gold}; }
  .dr-tile.today img.dr-coin { animation: drBob 1.4s ease-in-out infinite; }
  .dr-tile.future { opacity: .62; }
  .dr-tile.future img.dr-coin { filter: saturate(.7) brightness(.85); }

  .dr-chest { grid-column: span 2; position: relative; border-radius: 14px; padding: 8px 6px 7px; display: flex; align-items: center; gap: 4px; min-width: 0;
    background: radial-gradient(80% 90% at 35% 50%, rgba(255,210,31,.35), transparent 70%), linear-gradient(180deg, #5a2a10, #2c1206);
    border: 2.5px solid ${CANDY.gold}; box-shadow: 0 4px 0 ${CANDY.goldDeep}, 0 0 18px rgba(255,210,31,.35); }
  .dr-chest.today { box-shadow: 0 4px 0 ${CANDY.goldDeep}, 0 0 26px rgba(255,210,31,.85); }
  .dr-chest.done { background: linear-gradient(180deg, #2f6e1c, #1d4a10); border-color: ${CANDY.green.fill}; box-shadow: 0 4px 0 ${CANDY.green.dark}; }
  .dr-ribbon { position: absolute; top: -10px; right: 8px; padding: 3px 10px; border-radius: 999px; font-family: ${CANDY.body}; font-weight: 900; font-size: 10px; letter-spacing: .1em; color: #fff;
    background: linear-gradient(180deg, ${CANDY.red.light}, ${CANDY.red.fill}); border: 2px solid ${CANDY.red.dark}; white-space: nowrap; z-index: 2; }
  .dr-art { position: relative; flex: none; width: 78px; height: 66px; }
  .dr-rays { position: absolute; inset: -14px; border-radius: 50%; opacity: .55; animation: drSpin 14s linear infinite;
    background: repeating-conic-gradient(rgba(255,226,122,.28) 0 12deg, transparent 12deg 30deg);
    -webkit-mask: radial-gradient(circle, #000 30%, transparent 70%); mask: radial-gradient(circle, #000 30%, transparent 70%); }
  .dr-chest.future .dr-rays { opacity: .25; }
  .dr-chest.done .dr-rays { display: none; }
  .dr-3d { position: absolute; left: -26px; top: -30px; width: 118px; height: 100px; pointer-events: none; z-index: 1; }
  .dr-art > img.dr-badge { position: absolute; left: 58px; bottom: 0; width: 24px; height: 24px; z-index: 2; }
  .dr-ctxt { display: flex; flex-direction: column; gap: 1px; min-width: 0; flex: 1; align-items: center; text-align: center; padding-top: 8px; position: relative; z-index: 2; }
  .dr-big { font-family: ${CANDY.display}; font-size: 24px; line-height: 1; color: ${CANDY.gold}; text-shadow: ${textStroke(2, OUT)}, 0 4px 0 ${OUT}; }
  .dr-chest .dr-unit { color: #ffe9a8; font-size: 11px; margin-top: -2px; }
  .dr-small { font-size: 10.5px; font-weight: 900; color: rgba(255,255,255,.85); line-height: 1.15; }

  .dr-prize { display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 6px 10px; padding: 8px 10px; border-radius: 14px;
    background: rgba(20,4,48,.62); border: 1.5px solid rgba(255,210,31,.35); }
  .dr-prize-lbl { flex-basis: 100%; text-align: center; font-size: 10.5px; font-weight: 900; letter-spacing: .1em; color: rgba(255,255,255,.72); margin-bottom: -2px; }
  .dr-prize-lbl.done { color: ${CANDY.green.light}; }
  .dr-pz { display: inline-flex; align-items: center; gap: 6px; font-family: ${CANDY.display}; font-size: 22px; line-height: 1; color: #fff; text-shadow: ${textStroke(1.5, OUT)}, 0 3px 0 ${OUT}; white-space: nowrap; }
  .dr-pz small { font-family: ${CANDY.body}; font-size: 13px; font-weight: 900; text-shadow: none; color: rgba(255,255,255,.85); }
  .dr-pz.xp { color: ${CANDY.gold}; }
  .dr-pz.xp small { color: ${CANDY.gold}; }
  .dr-plus { font-family: ${CANDY.display}; font-size: 20px; color: rgba(255,255,255,.6); }

  .dr-btn-lbl { display: inline-flex; align-items: center; justify-content: center; gap: 8px; flex-direction: row; white-space: nowrap; }
  .dr-foot { text-align: center; font-size: 12px; font-weight: 800; color: rgba(255,255,255,.7); margin-top: -4px; }
  .dr-foot b { color: ${CANDY.gold}; }
  .rs-claim-tomorrow:disabled { color: #fff !important; text-shadow: 0 2px 0 rgba(0,0,0,.28) !important; cursor: default !important; }
  .rs-claim-login:disabled { font-size: 18px !important; color: #fff !important; cursor: default !important; }

  @keyframes drBob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
  @keyframes drSpin { to { transform: rotate(360deg); } }
  @keyframes drPop { 0% { transform: scale(.4); opacity: 0; } 60% { transform: scale(1.25); opacity: 1; } 100% { transform: scale(1); } }
  .dr-pop { animation: drPop .35s ease-out both; }
  @media (prefers-reduced-motion: reduce) {
    .dr-tile.today img.dr-coin, .dr-rays, .dr-pop { animation: none !important; }
    .dr-tile { transition: none; }
  }
`;

/** Gold XP star (inline SVG, so it needs no asset). */
function XpStar({ size = 26 }) {
  const uid = React.useId().replace(/:/g, '');
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" style={{ flex: 'none', filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.4))' }}>
      <defs>
        <radialGradient id={`xs-${uid}`} cx=".4" cy=".35" r=".75"><stop offset="0" stopColor="#FFF7C8" /><stop offset=".5" stopColor={CANDY.gold} /><stop offset="1" stopColor="#C07E00" /></radialGradient>
      </defs>
      <path d="M12 1.6l3.1 6.6 7.2.9-5.3 5 1.4 7.1L12 17.7l-6.4 3.5L7 14.1l-5.3-5 7.2-.9z" fill={`url(#xs-${uid})`} stroke={OUT} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M9.4 7.6l2-4.2" stroke="#fff" strokeWidth="1.2" strokeLinecap="round" opacity=".7" />
    </svg>
  );
}

/**
 * 7-day daily login reward at the top of Home, in the candy look: a gold-rimmed
 * panel with marquee dots, a red gift + chunky gold title, the week as tiles
 * (days 1–6: past = green + tick, today = glowing gold, future = dimmed) with
 * day 7 as a two-tile treasure chest, today's prize (coins + XP), a raised CLAIM
 * button and a footer line. Once claimed the button turns into a red,
 * non-actionable "CLAIM TOMORROW"; logged-out visitors get a grey log-in hint.
 * Amounts come from the remote-config table (cfg.dailyRewards), the same row
 * claimDailyReward credits: rewards[dailyDay - 1], falling back to rewards[0].
 * `id="daily-reward-card"` is where the platform aims the "reward ready" confetti.
 */
export default function DailyReward({ dailyDay = 1, dailyClaimed = false, onClaim, rewards = null, loggedIn = true }) {
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
  const daysLeft = total - shownDay;
  const shownH = headline(shown);
  // One line on a phone: shrink the label as it grows ("OPEN CHEST 100 COINS", gem rows).
  const verb = isBonusDay ? 'OPEN CHEST' : 'CLAIM';
  const btnLen = `${verb} ${rewardText(shown)}`.length;
  const btnSize = btnLen <= 15 ? 24 : btnLen <= 20 ? 20 : 16;

  return (
    <section id="daily-reward-card" aria-label="Daily reward" className="rs-daily" style={{ ...goldRim, position: 'relative', padding: 9, borderRadius: 24 }}>
      <style dangerouslySetInnerHTML={{ __html: DR_CSS }} />
      <span aria-hidden style={{ ...dotRow(false), top: 0.5, left: 22, right: 22, height: 8 }} />
      <span aria-hidden style={{ ...dotRow(false), bottom: 0.5, left: 22, right: 22, height: 8 }} />
      <div style={{ borderRadius: 16, background: innerGlow, padding: '12px 12px 12px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="dr-head">
          <span className="dr-gift">
            <img src={`${IC}/gift-red.png`} alt="" width={60} height={60} className={`dr-g${dailyClaimed || !loggedIn ? '' : ' anim-wiggle'}`} />
            {dailyClaimed && <img src={`${IC}/check.png`} alt="" width={26} height={26} className="dr-chk" />}
          </span>
          <div style={{ minWidth: 0 }}>
            <h2 style={goldTitle(26)}>Daily reward</h2>
            <div className="dr-sub">
              Day {shownDay} of {total} · {dailyClaimed ? <b>claimed</b> : <b>log in {total} days in a row</b>}
            </div>
          </div>
        </div>

        <div className="dr-grid">
          {days.map((r, i) => {
            const day = i + 1;
            const past = dailyClaimed ? day <= shownDay : day < shownDay;
            const today = !dailyClaimed && day === shownDay;
            const h = headline(r);
            const cls = past ? 'past' : today ? 'today' : 'future';
            return (
              <div key={day} className={`dr-tile ${cls}${justClaimed && dailyClaimed && day === shownDay ? ' dr-pop' : ''}`}
                aria-label={`Day ${day}: ${rewardText(r)}${past ? ', claimed' : today ? ', today' : ''}`}>
                <span className="dr-lbl">DAY {day}</span>
                <span className="dr-ic">
                  <RewardIcon kind={h.kind} size={36} className="dr-coin" />
                  {past && <img src={`${IC}/check.png`} alt="" className="dr-badge" />}
                </span>
                <span className="dr-amt">{h.n.toLocaleString('en-US')}</span>
                <span className="dr-unit">{h.unit}</span>
                {h.extra.length > 0 && <span className="dr-extra">+ {h.extra.join(' + ')}</span>}
              </div>
            );
          })}
          <div className={`dr-chest ${chestState}${justClaimed && chestState === 'done' ? ' dr-pop' : ''}`}
            aria-label={`Day ${total} bonus chest: ${rewardText(last)} for ${total} days in a row${chestState === 'done' ? ', claimed' : chestState === 'today' ? ', today' : ''}`}>
            <span className="dr-ribbon">DAY {total} BONUS</span>
            <span className="dr-art">
              <span className="dr-rays" aria-hidden />
              <span className="dr-3d" aria-hidden><TreasureChest3D mode={chestMode} size={118} /></span>
              {chestState === 'done' && <img src={`${IC}/check.png`} alt="" className="dr-badge" />}
            </span>
            <span className="dr-ctxt">
              <span className="dr-big">{lastH.n.toLocaleString('en-US')}</span>
              <span className="dr-unit">{lastH.unit}</span>
              {lastH.extra.length > 0 && <span className="dr-extra">+ {lastH.extra.join(' + ')}</span>}
              <span className="dr-small">
                {chestState === 'done' ? 'Chest opened!' : chestState === 'today' ? 'Open it today!' : `${daysLeft} more day${daysLeft === 1 ? '' : 's'} in a row`}
              </span>
            </span>
          </div>
        </div>

        <div className="dr-prize" aria-label={`${dailyClaimed ? 'Claimed today' : "Today's prize"}: ${rewardText(shown)} and ${xpText}`}>
          <span className={`dr-prize-lbl${dailyClaimed ? ' done' : ''}`}>{dailyClaimed ? 'CLAIMED TODAY' : "TODAY'S PRIZE"}</span>
          <span className="dr-pz"><RewardIcon kind={shownH.kind} size={28} />{shownH.n.toLocaleString('en-US')}<small>{shownH.unit}</small></span>
          {shownH.gems.map(g => <React.Fragment key={g.kind}><span className="dr-plus" aria-hidden>+</span><span className="dr-pz"><RewardIcon kind={g.kind} size={24} />{g.n}<small>{g.unit}</small></span></React.Fragment>)}
          <span className="dr-plus" aria-hidden>+</span>
          <span className="dr-pz xp"><XpStar size={32} />{DAILY_LOGIN_XP}<small>XP</small></span>
        </div>

        {dailyClaimed ? (
          <button type="button" className="candy-btn rs-claim-tomorrow" disabled aria-disabled="true"
            style={{ '--cb-fill': CANDY.red.fill, '--cb-light': CANDY.red.light, '--cb-dark': CANDY.red.dark, width: '100%', fontSize: 24, minHeight: 56 }}>
            CLAIM TOMORROW
          </button>
        ) : loggedIn ? (
          <button type="button" className="candy-btn rs-claim-pulse" onClick={(e) => onClaim && onClaim(e && e.currentTarget)}
            aria-label={`${isBonusDay ? 'Open chest' : 'Claim'}: ${rewardText(shown)} and ${xpText}`}
            style={{ '--cb-fill': CANDY.green.fill, '--cb-light': CANDY.green.light, '--cb-dark': CANDY.green.dark, width: '100%', fontSize: btnSize, minHeight: 56 }}>
            <span className="dr-btn-lbl">
              {verb}
              <RewardIcon kind={shownH.kind} size={26} />
              {rewardText(shown).toUpperCase()}
            </span>
          </button>
        ) : (
          <button type="button" className="candy-btn rs-claim-login" disabled
            style={{ '--cb-fill': CANDY.off.fill, '--cb-light': CANDY.off.light, '--cb-dark': CANDY.off.dark, width: '100%', fontSize: 18, minHeight: 56, color: '#fff' }}>
            Log in on bwanabet.com to claim
          </button>
        )}

        <div className="dr-foot">
          {dailyClaimed
            ? <>Tomorrow: <b>{rewardText(tomorrow)} + {xpText}</b>{isBonusDay ? ' · a new week starts' : ''}</>
            : <>Miss a day and you start again at day 1</>}
        </div>
      </div>
    </section>
  );
}
