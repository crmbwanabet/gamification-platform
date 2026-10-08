'use client';

import React from 'react';
import { C } from './tokens';
import { DAILY_REWARDS } from '@/lib/data/platform';
import { RewardIcon } from './RedesignShell';
import { rewardParts } from '@/lib/rewardText.mjs';

const IC = '/ui/reward'; // generated 3D reward icons

const rewardText = (r) => rewardParts(r).join(' + ');

/**
 * 7-day streak-based daily login reward, shown at the top of Home.
 * Glassy panel with a streak rail, a glowing "today" tile, locked upcoming days,
 * and a gold grand-prize Day 7 (days 1–6: 10 coins each; day 7 = 7 days in a
 * row: 100 coins). Day 7 gets a wider column, a coin pile and a BONUS ribbon
 * so it stands out from the six identical days before it. The claim button overlaps the panel's bottom edge
 * and names today's reward ("Claim 50 coins"). Once claimed it collapses to a
 * slim card that says what was received and what tomorrow brings, so the games
 * below move up.
 * Amounts come from the remote-config table (cfg.dailyRewards), the same row
 * claimDailyReward credits: rewards[dailyDay - 1], falling back to rewards[0].
 */
export default function DailyReward({ dailyDay = 1, dailyClaimed = false, onClaim, rewards = null, loggedIn = true }) {
  const list = rewards || DAILY_REWARDS;
  const total = list.length; // 7
  const curDay = Math.min(dailyDay, total);
  const today = list[dailyDay - 1] || list[0];
  const isGrand = curDay === total;
  const grandReward = list[total - 1];
  const cols = `repeat(${total - 1},1fr) 1.45fr`; // the grand day gets a wider column

  if (dailyClaimed) {
    // claimDailyReward already advanced dailyDay (7 wraps to 1), so the row
    // just received is the one before it; `today` is now tomorrow's row.
    const got = list[(dailyDay - 2 + total) % total];
    return (
      <div className="rs-daily-done" style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 16,
        background: `linear-gradient(180deg, ${C.panelHi}, ${C.panelLo})`,
        border: '1px solid rgba(255,255,255,0.10)', boxShadow: '0 8px 22px rgba(0,0,0,.32), inset 0 1px 0 rgba(255,255,255,.08)',
      }}>
        <div style={{ position: 'relative', width: 42, height: 42, flex: 'none', display: 'grid', placeItems: 'center', borderRadius: 12, background: C.track }}>
          <img src={`${IC}/gift.png`} alt="" width={30} height={30} style={{ objectFit: 'contain' }} />
          <img src={`${IC}/check.png`} alt="" width={18} height={18} style={{ position: 'absolute', right: -5, bottom: -5, objectFit: 'contain' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0, lineHeight: 1.35 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: C.text }}>Daily Reward claimed ✓</div>
          <div style={{ fontSize: 12, color: C.sub }}>
            Today you got <b style={{ color: C.gold }}>{rewardText(got)}</b>
          </div>
          <div style={{ fontSize: 11.5, color: C.muted }}>
            Tomorrow: <b style={{ color: C.text }}>{rewardText(today)}</b>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rs-daily" style={{ position: 'relative', paddingBottom: 22 }}>
      <style>{`
        @media (max-width: 480px) {
          .rs-daily { padding-bottom: 16px !important; }
          .rs-daily .rs-dr-title { font-size: 16px !important; gap: 6px !important; }
          .rs-daily .rs-dr-title img { width: 20px !important; height: 20px !important; }
          .rs-daily .rs-dr-count { font-size: 14px !important; }
          .rs-daily .rs-dr-panel { padding: 10px 12px 24px !important; border-radius: 16px !important; }
          .rs-daily .rs-dr-head { margin-bottom: 4px !important; }
          .rs-daily .rs-dr-rail { margin-bottom: 8px !important; }
          .rs-daily .rs-dr-todaytile { padding: 6px 10px !important; gap: 8px !important; }
          .rs-daily .rs-dr-coin { width: 26px !important; height: 26px !important; }
          .rs-daily .rs-dr-amt { font-size: 15px !important; }
          .rs-daily .rs-dr-daylabel { font-size: 8.5px !important; }
          .rs-daily .rs-dr-hint { font-size: 9.5px !important; }
          .rs-daily .rs-dr-claim { font-size: 13px !important; padding: 8px 16px !important; }
        }
      `}</style>

      <div className="rs-dr-panel" style={{
        borderRadius: 22,
        background: `linear-gradient(180deg, ${C.panelHi}, ${C.panelLo})`,
        border: '1px solid rgba(255,255,255,0.10)',
        boxShadow: '0 12px 34px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.08)',
        padding: '18px 20px 30px',
      }}>
        {/* header */}
        <div className="rs-dr-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div className="rs-dr-title" style={{ fontSize: 25, fontWeight: 800, color: C.text, fontFamily: "var(--font-display, 'Bricolage Grotesque', sans-serif)", display: 'inline-flex', alignItems: 'center', gap: 10, lineHeight: 1 }}>
            Daily Reward <img src={`${IC}/gift.png`} alt="" width={28} height={28} className="anim-wiggle" style={{ objectFit: 'contain' }} />
          </div>
          <div className="rs-dr-count" style={{ fontSize: 21, fontWeight: 800, color: C.text, fontFamily: "var(--font-display, 'Bricolage Grotesque', sans-serif)", whiteSpace: 'nowrap' }}>
            Day {curDay} / {total}
          </div>
        </div>
        {/* progress rail */}
        <div className="rs-dr-rail" style={{ position: 'relative', height: 16, margin: '0 0 12px' }}>
          <div style={{ position: 'absolute', top: '50%', left: `${100 / ((total + 0.45) * 2)}%`, right: `${145 / ((total + 0.45) * 2)}%`, height: 2, background: 'rgba(255,255,255,.12)', transform: 'translateY(-50%)' }} />
          <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: cols, height: '100%' }}>
            {list.map((r, i) => {
              const day = i + 1;
              const past = day < dailyDay;
              const isToday = day === dailyDay && !dailyClaimed;
              return (
                <div key={day} style={{ display: 'grid', placeItems: 'center' }}>
                  <span style={{
                    width: isToday ? 12 : 9, height: isToday ? 12 : 9, borderRadius: '50%',
                    background: isToday ? '#fff' : past ? C.green : C.panel2,
                    boxShadow: isToday ? '0 0 0 4px rgba(79,169,139,.35)' : 'none',
                  }} />
                </div>
              );
            })}
          </div>
        </div>

        {/* today's reward only */}
        <div className="rs-dr-todaytile" style={{
          display: 'flex', alignItems: 'center', gap: 12, borderRadius: 13, padding: '10px 14px',
          background: isGrand ? 'linear-gradient(180deg,#f6d77c,#cf9a3b)' : 'linear-gradient(180deg,#fbfcf8,#e7ebe2)',
          color: isGrand ? '#3a2a08' : '#16241c', border: `2px solid ${C.green}`, boxShadow: '0 0 18px rgba(79,169,139,.45)',
        }}>
          <img src={`${IC}/coins.png`} alt="" width={38} height={38} className="anim-bob rs-dr-coin" style={{ objectFit: 'contain', flex: 'none' }} />
          <div aria-label={`Day ${curDay}: ${rewardText(today)}`} style={{ flex: 1, minWidth: 0, lineHeight: 1.1 }}>
            <div className="rs-dr-daylabel" style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.05em', opacity: .75 }}>DAY {curDay}{isGrand ? ' · BONUS' : ''}</div>
            <div className="rs-dr-amt" style={{ fontSize: 20, fontWeight: 900 }}>{rewardText(today)}</div>
          </div>
          {!isGrand && grandReward && <div className="rs-dr-hint" style={{ fontSize: 11, fontWeight: 700, opacity: .65, textAlign: 'right', lineHeight: 1.2 }}>Day {total}:<br />{rewardText(grandReward)}</div>}
        </div>
      </div>

      {/* claim button — overlaps the panel's bottom edge. Logged in = reward
          ready; anonymous visitors (no bwanabet SSO session) get a log-in hint. */}
      {loggedIn ? (
      <button
        onClick={(e) => onClaim && onClaim(e && e.currentTarget)}
        className="rs-claim-pulse rs-dr-claim"
        style={{
          position: 'absolute', left: '50%', bottom: 0, transform: 'translateX(-50%)',
          display: 'inline-flex', alignItems: 'center', gap: 7,
          border: 'none', cursor: 'pointer',
          padding: '10px 24px', borderRadius: 12, fontSize: 14, fontWeight: 800, letterSpacing: '.01em',
          color: '#08210f',
          background: 'linear-gradient(180deg,#57b795,#3f9a7b)',
          boxShadow: '0 6px 20px rgba(79,169,139,.5)',
          whiteSpace: 'nowrap', maxWidth: '96%',
        }}>
        <RewardIcon kind="coins" size={20} />
        Claim {rewardText(today)}
      </button>
      ) : (
        <div
          className="rs-dr-claim"
          style={{
            position: 'absolute', left: '50%', bottom: 0, transform: 'translateX(-50%)',
            display: 'inline-flex', alignItems: 'center', gap: 7,
            padding: '10px 20px', borderRadius: 12, fontSize: 13.5, fontWeight: 800,
            color: C.text, background: C.panel2, border: '1px solid rgba(255,255,255,.14)',
            boxShadow: '0 6px 18px rgba(0,0,0,.35)', whiteSpace: 'nowrap', maxWidth: '96%',
          }}>
          <img src={`${IC}/lock.png`} alt="" width={16} height={16} style={{ objectFit: 'contain' }} />
          Log in on bwanabet.com to claim
        </div>
      )}
    </div>
  );
}
