'use client';

import React from 'react';
import { Coins, Gem, Check } from 'lucide-react';
import { C } from './tokens';
import { GreenBtn, Card } from './RedesignShell';
import { DAILY_REWARDS } from '@/lib/data/platform';

// 7-day streak-based daily login reward. Used on the home and in the Rewards hub.
export default function DailyReward({ dailyDay = 1, dailyClaimed = false, onClaim }) {
  return (
    <Card style={{ padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>🎁 Daily Reward</div>
        <div style={{ fontSize: 12, color: C.muted }}>Day {dailyDay} / 7</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 7, marginBottom: 14 }}>
        {DAILY_REWARDS.map((r, i) => {
          const day = i + 1;
          const past = day < dailyDay || (day === dailyDay && dailyClaimed);
          const isToday = day === dailyDay && !dailyClaimed;
          return (
            <div key={day} style={{
              borderRadius: 10, padding: '9px 2px', textAlign: 'center', minHeight: 52,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
              background: isToday ? 'rgba(79,169,139,.16)' : C.track,
              border: isToday ? `1.5px solid ${C.green}` : `1px solid ${past ? 'rgba(79,169,139,.28)' : 'transparent'}`,
              opacity: (!past && !isToday) ? 0.55 : 1,
            }}>
              <div style={{ fontSize: 9, color: C.muted }}>Day {day}</div>
              {past
                ? <Check size={15} color={C.green} />
                : <div style={{ fontSize: 11.5, fontWeight: 800, color: isToday ? C.green : C.sub, display: 'inline-flex', alignItems: 'center', gap: 2 }}><Coins size={10} />{r.kwacha}</div>}
              {!past && r.gems ? <div style={{ fontSize: 9, color: C.teal, display: 'inline-flex', alignItems: 'center', gap: 2 }}><Gem size={9} />{r.gems}</div> : null}
            </div>
          );
        })}
      </div>
      <GreenBtn full onClick={(e) => onClaim && onClaim(e && e.currentTarget)} disabled={dailyClaimed}>
        {dailyClaimed ? 'Claimed today ✓' : `Claim Day ${dailyDay}`}
      </GreenBtn>
    </Card>
  );
}
