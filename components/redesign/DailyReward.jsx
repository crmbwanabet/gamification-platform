'use client';

import React from 'react';
import { Coins, Gem, Diamond, Check, Lock } from 'lucide-react';
import { C } from './tokens';
import { DAILY_REWARDS } from '@/lib/data/platform';

const DIAMOND = '#7db8ff';

/**
 * 7-day streak-based daily login reward. Used on the home and in the Rewards hub.
 * Glassy panel with a streak rail, a glowing "today" tile, locked upcoming days,
 * and a gold grand-prize Day 7. The claim button overlaps the panel's bottom edge.
 */
export default function DailyReward({ dailyDay = 1, dailyClaimed = false, onClaim }) {
  const total = DAILY_REWARDS.length; // 7
  const curDay = Math.min(dailyDay, total);

  return (
    <div className="rs-daily" style={{ position: 'relative', paddingBottom: 22 }}>
      <style>{`
        @media (max-width: 560px) {
          .rs-daily .rs-dr-title { font-size: 19px !important; }
          .rs-daily .rs-dr-count { font-size: 16px !important; }
          .rs-daily .rs-dr-tile { min-height: 82px !important; padding: 8px 2px !important; }
          .rs-daily .rs-dr-amt { font-size: 13px !important; }
          .rs-daily .rs-dr-daylabel { font-size: 8px !important; }
        }
      `}</style>

      <div style={{
        borderRadius: 22,
        background: `linear-gradient(180deg, ${C.panelHi}, ${C.panelLo})`,
        border: '1px solid rgba(255,255,255,0.10)',
        boxShadow: '0 12px 34px rgba(0,0,0,.4), inset 0 1px 0 rgba(255,255,255,.08)',
        padding: '18px 20px 30px',
      }}>
        {/* header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div className="rs-dr-title" style={{ fontSize: 25, fontWeight: 800, color: C.text, fontFamily: "var(--font-display, 'Bricolage Grotesque', sans-serif)", display: 'inline-flex', alignItems: 'center', gap: 10, lineHeight: 1 }}>
            Daily Reward <span style={{ fontSize: 22 }}>🎁</span>
          </div>
          <div className="rs-dr-count" style={{ fontSize: 21, fontWeight: 800, color: C.text, fontFamily: "var(--font-display, 'Bricolage Grotesque', sans-serif)", whiteSpace: 'nowrap' }}>
            Day {curDay} / {total}
          </div>
        </div>

        {/* progress rail */}
        <div style={{ position: 'relative', height: 16, margin: '0 0 12px' }}>
          <div style={{ position: 'absolute', top: '50%', left: `${100 / (total * 2)}%`, right: `${100 / (total * 2)}%`, height: 2, background: 'rgba(255,255,255,.12)', transform: 'translateY(-50%)' }} />
          <div style={{ position: 'relative', display: 'grid', gridTemplateColumns: `repeat(${total},1fr)`, height: '100%' }}>
            {DAILY_REWARDS.map((r, i) => {
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
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${total},1fr)`, gap: 8 }}>
          {DAILY_REWARDS.map((r, i) => {
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

                <div style={{ position: 'relative', display: 'grid', placeItems: 'center', height: 26 }}>
                  {past ? (
                    <Check size={20} color={C.green} strokeWidth={3} />
                  ) : grand ? (
                    <Diamond size={22} color={DIAMOND} fill={DIAMOND} style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,.3))' }} />
                  ) : (
                    <>
                      <Coins size={20} color={C.gold} style={{ opacity: locked ? 0.85 : 1 }} />
                      {locked && <Lock size={11} color={C.muted} style={{ position: 'absolute', right: -5, bottom: -3 }} />}
                    </>
                  )}
                </div>

                <div style={{ textAlign: 'center', lineHeight: 1.05 }}>
                  <div className="rs-dr-amt" style={{ fontSize: 15, fontWeight: 800, color: textCol }}>{r.kwacha}</div>
                  {(r.gems || r.diamonds) && (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9, fontWeight: 700, marginTop: 1 }}>
                      {r.gems ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 1, color: grand ? '#3a2a08' : C.teal }}><Gem size={8} />{r.gems}</span> : null}
                      {r.diamonds ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 1, color: grand ? '#1c3a5c' : DIAMOND }}><Diamond size={8} />{r.diamonds}</span> : null}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* claim button — overlaps the panel's bottom edge */}
      <button
        onClick={(e) => !dailyClaimed && onClaim && onClaim(e && e.currentTarget)}
        disabled={dailyClaimed}
        style={{
          position: 'absolute', left: '50%', bottom: 0, transform: 'translateX(-50%)',
          border: 'none', cursor: dailyClaimed ? 'default' : 'pointer',
          padding: '11px 30px', borderRadius: 12, fontSize: 14, fontWeight: 800, letterSpacing: '.03em',
          color: dailyClaimed ? C.sub : '#08210f',
          background: dailyClaimed ? C.panel2 : 'linear-gradient(180deg,#57b795,#3f9a7b)',
          boxShadow: dailyClaimed ? 'none' : '0 6px 20px rgba(79,169,139,.5)',
          whiteSpace: 'nowrap',
        }}>
        {dailyClaimed ? 'Claimed today ✓' : `CLAIM DAY ${curDay}`}
      </button>
    </div>
  );
}
