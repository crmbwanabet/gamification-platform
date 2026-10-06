'use client';

import React from 'react';
import { C } from './tokens';
import { DAILY_REWARDS } from '@/lib/data/platform';
import { RewardIcon } from './RedesignShell';
import { rewardParts, amountText } from '@/lib/rewardText.mjs';

const DIAMOND = '#7db8ff';
const IC = '/ui/reward'; // generated 3D reward icons

const rewardText = (r) => rewardParts(r).join(' + ');

/**
 * 7-day streak-based daily login reward, shown at the top of Home.
 * Glassy panel with a streak rail, a glowing "today" tile, locked upcoming days,
 * and a gold grand-prize Day 7. The claim button overlaps the panel's bottom edge
 * and names today's reward ("Claim 50 coins"). Once claimed it collapses to a
 * slim card that says what was received and what tomorrow brings, so the games
 * below move up.
 * Amounts come from the remote-config table (cfg.dailyRewards), the same row
 * claimDailyReward credits: rewards[dailyDay - 1], falling back to rewards[0].
 */
export default function DailyReward({ dailyDay = 1, dailyClaimed = false, onClaim, rewards = null }) {
  const list = rewards || DAILY_REWARDS;
  const total = list.length; // 7
  const curDay = Math.min(dailyDay, total);
  const today = list[dailyDay - 1] || list[0];

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
        @media (max-width: 560px) {
          .rs-daily .rs-dr-title { font-size: 19px !important; }
          .rs-daily .rs-dr-count { font-size: 16px !important; }
          .rs-daily .rs-dr-tile { min-height: 82px !important; padding: 8px 2px !important; }
          .rs-daily .rs-dr-amt { font-size: 13px !important; }
          .rs-daily .rs-dr-daylabel { font-size: 8px !important; }
          .rs-daily .rs-dr-panel { padding: 14px 12px 30px !important; }
          .rs-daily .rs-dr-tiles { gap: 5px !important; }
          .rs-daily .rs-dr-unit { font-size: 8.5px !important; }
          .rs-daily .rs-dr-extra { font-size: 7.5px !important; letter-spacing: -.01em; }
          .rs-daily .rs-dr-claim { font-size: 13px !important; padding: 10px 18px !important; }
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div className="rs-dr-title" style={{ fontSize: 25, fontWeight: 800, color: C.text, fontFamily: "var(--font-display, 'Bricolage Grotesque', sans-serif)", display: 'inline-flex', alignItems: 'center', gap: 10, lineHeight: 1 }}>
            Daily Reward <img src={`${IC}/gift.png`} alt="" width={28} height={28} className="anim-wiggle" style={{ objectFit: 'contain' }} />
          </div>
          <div className="rs-dr-count" style={{ fontSize: 21, fontWeight: 800, color: C.text, fontFamily: "var(--font-display, 'Bricolage Grotesque', sans-serif)", whiteSpace: 'nowrap' }}>
            Day {curDay} / {total}
          </div>
        </div>
        <div className="rs-dr-today" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, fontSize: 13.5, fontWeight: 700, color: C.sub, marginBottom: 12 }}>
          Today:
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: C.gold, fontWeight: 800 }}>
            <RewardIcon kind="coins" size={17} />{rewardText(today)}
          </span>
        </div>

        {/* progress rail */}
        <div style={{ position: 'relative', height: 16, margin: '0 0 12px' }}>
          <div style={{ position: 'absolute', top: '50%', left: `${100 / (total * 2)}%`, right: `${100 / (total * 2)}%`, height: 2, background: 'rgba(255,255,255,.12)', transform: 'translateY(-50%)' }} />
          <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: `repeat(${total},1fr)`, height: '100%' }}>
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

        {/* day tiles */}
        <div className="rs-dr-tiles" style={{ display: 'grid', gridTemplateColumns: `repeat(${total},1fr)`, gap: 8 }}>
          {list.map((r, i) => {
            const day = i + 1;
            const past = day < dailyDay;
            const isToday = day === dailyDay && !dailyClaimed;
            const locked = !past && !isToday;
            const grand = day === total;

            let bg = C.track, textCol = C.text, border = '1px solid rgba(255,255,255,.05)', shadow = 'none';
            if (isToday) {
              bg = 'linear-gradient(180deg,#fbfcf8,#e7ebe2)';
              textCol = '#16241c';
              border = `2px solid ${C.green}`;
              shadow = '0 0 18px rgba(79,169,139,.55)';
            } else if (grand) {
              bg = 'linear-gradient(180deg,#ecc665,#cf9a3b)';
              textCol = '#3a2a08';
              border = '1px solid rgba(255,255,255,.25)';
              shadow = '0 6px 16px rgba(207,154,59,.3)';
            }

            return (
              <div key={day} className="rs-dr-tile" style={{
                position: 'relative', borderRadius: 13, padding: '10px 3px', minHeight: 96,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', gap: 4,
                background: bg, border, boxShadow: shadow, opacity: locked && !grand ? 0.72 : 1,
              }}>
                <div className="rs-dr-daylabel" style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '.04em', color: isToday ? '#3a6a55' : grand ? '#5c4410' : C.muted }}>DAY {day}</div>

                <div style={{ position: 'relative', display: 'grid', placeItems: 'center', height: 36 }}>
                  {past ? (
                    <img src={`${IC}/check.png`} alt="" width={32} height={32} style={{ objectFit: 'contain' }} />
                  ) : grand ? (
                    <img src={`${IC}/diamond.png`} alt="" width={36} height={36} className="anim-breathe" style={{ objectFit: 'contain', filter: 'drop-shadow(0 2px 5px rgba(0,0,0,.35))' }} />
                  ) : (
                    <>
                      <img src={`${IC}/coins.png`} alt="" width={34} height={34} className={isToday ? 'anim-bob' : undefined} style={{ objectFit: 'contain', opacity: locked ? 0.92 : 1, filter: locked ? 'saturate(.8) brightness(.9)' : 'none' }} />
                      {locked && <img src={`${IC}/lock.png`} alt="" width={16} height={16} style={{ position: 'absolute', right: -2, bottom: -3, objectFit: 'contain', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,.55))' }} />}
                    </>
                  )}
                </div>

                <div aria-label={`Day ${day}: ${rewardText(r)}`} style={{ textAlign: 'center', lineHeight: 1.05 }}>
                  <div className="rs-dr-amt" style={{ fontSize: 15, fontWeight: 800, color: textCol }}>{r.kwacha}</div>
                  <div className="rs-dr-unit" style={{ fontSize: 9.5, fontWeight: 700, color: textCol, opacity: 0.8 }}>{r.kwacha === 1 ? 'coin' : 'coins'}</div>
                  {r.gems ? <div className="rs-dr-extra" style={{ fontSize: 9, fontWeight: 800, marginTop: 3, color: grand ? '#3a2a08' : isToday ? '#1d7a6f' : C.teal, whiteSpace: 'nowrap' }}>+{amountText(r.gems, 'gems')}</div> : null}
                  {r.diamonds ? <div className="rs-dr-extra" style={{ fontSize: 9, fontWeight: 800, marginTop: 1, color: grand ? '#1c3a5c' : DIAMOND, whiteSpace: 'nowrap' }}>+{amountText(r.diamonds, 'diamonds')}</div> : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* claim button — overlaps the panel's bottom edge */}
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
    </div>
  );
}
