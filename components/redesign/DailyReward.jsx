'use client';

import React from 'react';
import { CANDY, goldRim, dotRow, innerGlow, goldTitle } from './tokens';
import { DAILY_REWARDS } from '@/lib/data/platform';
import { DAILY_LOGIN_XP } from '@/lib/xp/sources.mjs';
import { RewardIcon } from './RedesignShell';
import { rewardParts, amountText } from '@/lib/rewardText.mjs';
import { GEMS } from '@/lib/economy/currency.mjs';

const IC = '/ui/reward'; // generated 3D reward icons

const rewardText = (r) => rewardParts(r).join(' + ');
// Icon for a reward row: coins when it pays coins, else its first gem.
const iconKind = (r) => (r?.kwacha ? 'coins' : GEMS.find(g => r?.[g]) || 'coins');

const DR_CSS = `
  .rs-claim-tomorrow:disabled { color: #fff !important; text-shadow: 0 2px 0 rgba(0,0,0,.28) !important; cursor: default !important; }
  .rs-claim-login:disabled { font-size: 18px !important; }
  @media (min-width: 861px) {
    .rs-dr-gift { width: 84px !important; height: 84px !important; }
    .rs-dr-amt { font-size: 26px !important; }
    .rs-dr-title { font-size: 28px !important; }
  }
`;

/**
 * 7-day daily login reward at the top of Home, in the candy look: a gold-rimmed
 * panel with marquee dots, the chunky gold title, today's reward, a 7-dot rail
 * (past = green, today = glowing gold, day 7 = gold ring) and a raised CLAIM
 * button. Once claimed the same panel shows what was received and the button
 * turns into a red, non-actionable "CLAIM TOMORROW".
 * Amounts come from the remote-config table (cfg.dailyRewards), the same row
 * claimDailyReward credits: rewards[dailyDay - 1], falling back to rewards[0].
 * `id="daily-reward-card"` is where the platform aims the "reward ready" confetti.
 */
export default function DailyReward({ dailyDay = 1, dailyClaimed = false, onClaim, rewards = null, loggedIn = true }) {
  const list = rewards || DAILY_REWARDS;
  const total = list.length; // 7
  // claimDailyReward already advanced dailyDay (7 wraps to 1), so once claimed
  // the row just received is the one before it.
  const shownDay = dailyClaimed ? ((dailyDay - 2 + total) % total) + 1 : Math.min(dailyDay, total);
  const shown = list[shownDay - 1] || list[0];
  const tomorrow = list[dailyDay - 1] || list[0];

  return (
    <section id="daily-reward-card" aria-label="Daily reward" className="rs-daily" style={{ ...goldRim, position: 'relative', padding: 9, borderRadius: 24 }}>
      <style dangerouslySetInnerHTML={{ __html: DR_CSS }} />
      <span aria-hidden style={{ ...dotRow(false), top: 0.5, left: 22, right: 22, height: 8 }} />
      <span aria-hidden style={{ ...dotRow(false), bottom: 0.5, left: 22, right: 22, height: 8 }} />
      <div style={{ borderRadius: 16, background: innerGlow, padding: '14px 14px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <h2 className="rs-dr-title" style={goldTitle(26)}>Daily reward</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ position: 'relative', flex: 'none' }}>
            <img src={`${IC}/gift.png`} alt="" width={72} height={72} className={`rs-dr-gift${dailyClaimed ? '' : ' anim-wiggle'}`} style={{ width: 72, height: 72, objectFit: 'contain', display: 'block', filter: 'drop-shadow(0 6px 10px rgba(0,0,0,.4))' }} />
            {dailyClaimed && <img src={`${IC}/check.png`} alt="" width={26} height={26} style={{ position: 'absolute', right: -4, bottom: -2, objectFit: 'contain' }} />}
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }} aria-label={`Day ${shownDay} of ${total}: ${rewardText(shown)}${dailyClaimed ? ', claimed' : ''}`}>
            <div style={{ fontSize: 12, fontWeight: 900, color: 'rgba(255,255,255,.72)', letterSpacing: '.03em' }}>DAY {shownDay} OF {total}{dailyClaimed ? ' · CLAIMED' : shownDay === total ? ' · BONUS' : ''}</div>
            <div className="rs-dr-amt" style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: CANDY.display, fontSize: 24, lineHeight: 1.1 }}>
              <RewardIcon kind={iconKind(shown)} size={26} />{rewardText(shown)}
            </div>
            <div style={{ fontSize: 12, fontWeight: 900, color: CANDY.gold }}>
              {dailyClaimed ? `Tomorrow: ${rewardText(tomorrow)}` : `+${amountText(DAILY_LOGIN_XP, 'xp')}`}
            </div>
          </div>
        </div>
        <div aria-hidden="true" style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '2px 0 4px' }}>
          {list.map((_, i) => {
            const day = i + 1;
            const done = dailyClaimed ? day <= shownDay : day < shownDay;
            const today = !dailyClaimed && day === shownDay;
            const grand = day === total;
            const sz = grand ? 12 : 10;
            return (
              <span key={day} style={{
                width: sz, height: sz, borderRadius: '50%', boxSizing: 'border-box',
                background: done ? CANDY.green.fill : today ? CANDY.gold : CANDY.off.fill,
                boxShadow: today ? `0 0 8px ${CANDY.gold}` : 'none',
                border: grand && !today ? `2px solid ${CANDY.gold}` : 'none',
              }} />
            );
          })}
        </div>
        {dailyClaimed ? (
          <button type="button" className="candy-btn rs-claim-tomorrow" disabled aria-disabled="true"
            style={{ '--cb-fill': CANDY.red.fill, '--cb-light': CANDY.red.light, '--cb-dark': CANDY.red.dark, width: '100%', fontSize: 24, minHeight: 56 }}>
            CLAIM TOMORROW
          </button>
        ) : loggedIn ? (
          <button type="button" className="candy-btn rs-claim-pulse" onClick={(e) => onClaim && onClaim(e && e.currentTarget)}
            aria-label={`Claim ${rewardText(shown)}`}
            style={{ '--cb-fill': CANDY.green.fill, '--cb-light': CANDY.green.light, '--cb-dark': CANDY.green.dark, width: '100%', fontSize: 26, minHeight: 56 }}>
            CLAIM
          </button>
        ) : (
          <button type="button" className="candy-btn rs-claim-login" disabled
            style={{ '--cb-fill': CANDY.off.fill, '--cb-light': CANDY.off.light, '--cb-dark': CANDY.off.dark, width: '100%', fontSize: 18, minHeight: 56, color: '#fff' }}>
            Log in on bwanabet.com to claim
          </button>
        )}
      </div>
    </section>
  );
}

