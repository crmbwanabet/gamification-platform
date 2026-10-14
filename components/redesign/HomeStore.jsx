'use client';

import React from 'react';
import { C, CANDY } from './tokens';
import { SectionTitle, Card, RewardIcon } from './RedesignShell';
import { StoreCard, PackBuyButton, balancesOf } from './StoreView';
import { amountText } from '@/lib/rewardText.mjs';
import { canAfford, economyRates, formatKwacha } from '@/lib/economy/currency.mjs';
import { splitCatalog } from '@/lib/store/catalog.mjs';

// Home store panel (2026-10-14): a compact slice of the Store beside the
// daily reward on desktop, under it on phones. Same catalog (remote-config
// store items via splitCatalog), same buy handler + busy id as the Store tab
// (GamificationPlatform's buyStoreItem -> POST /api/purchase), same two-tap
// confirm for kwacha packs (PackBuyButton). "See all" opens the Store tab.
const MAX_ON_HOME = 5;

const HS_CSS = `
  .hs-panel { display: flex; flex-direction: column; min-width: 0; }
  .hs-card { flex: 1; display: flex; flex-direction: column; gap: 12px; padding: 14px; }
  .hs-row { display: grid; grid-auto-flow: column; grid-auto-columns: 136px; gap: 10px; overflow-x: auto; scroll-snap-type: x mandatory;
    margin: 0 -14px; padding: 2px 14px 6px; scrollbar-width: none; }
  .hs-row::-webkit-scrollbar { display: none; }
  .hs-row > * { scroll-snap-align: start; min-width: 0; }
  .hs-all { all: unset; box-sizing: border-box; cursor: pointer; display: inline-flex; align-items: center; min-height: 44px; padding: 0 4px;
    font-size: 13px; font-weight: 900; color: ${CANDY.gold}; border-radius: 10px; }
  .hs-all:focus-visible { outline: 3px solid ${CANDY.gold}; outline-offset: 2px; }
  .hs-pack { display: flex; flex-direction: column; align-items: center; text-align: center; gap: 6px; padding: 12px 10px 10px; height: 100%; box-sizing: border-box; }
  .hs-pack-icon { width: 46px; height: 46px; }
  @media (min-width: 861px) {
    .hs-row { grid-auto-flow: row; grid-auto-columns: auto; grid-template-columns: repeat(var(--hs-n), minmax(0, 1fr)); overflow: visible; margin: 0; padding: 0; flex: 1; }
    .hs-pack { justify-content: space-between; padding: 18px 12px 12px; }
    .hs-pack-icon { width: 76px; height: 76px; }
  }
`;

function HomePackCard({ item, balances, onBuy, busy }) {
  const coins = item.price.kwacha;
  const ok = canAfford(item.price, balances);
  const short = Math.max(0, coins - balances.kwacha);
  return (
    <Card style={{ height: '100%', opacity: ok ? 1 : 0.82 }}>
      <div className="hs-pack">
        <RewardIcon kind="coins" className="hs-pack-icon" size={46} />
        <div style={{ fontSize: 30, lineHeight: 1, color: CANDY.gold, fontFamily: CANDY.display, textShadow: `0 3px 0 ${CANDY.outline}` }}>{formatKwacha(item.payoutKwacha)}</div>
        <div style={{ fontSize: 10.5, fontWeight: 700, color: C.muted }}>bwanabet bonus</div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 800, color: C.gold }}>
          <RewardIcon kind="coins" size={15} />{amountText(coins, 'coins')}
        </div>
        <div style={{ fontSize: 10.5, fontWeight: 600, color: ok ? C.green : C.muted, minHeight: 13 }}>{ok ? 'You can buy this' : `${amountText(short, 'coins')} short`}</div>
        <div style={{ width: '100%' }}><PackBuyButton item={item} canBuy={ok} onBuy={onBuy} busy={busy} /></div>
      </div>
    </Card>
  );
}

/** Store selection for Home: kwacha packs first, then ordinary items, up to 5. Renders nothing when the store is empty. */
export default function HomeStore({ storeItems, wallet, onBuy, busyId = null, onSeeAll, className = '' }) {
  const { coinPacks, items } = splitCatalog(storeItems);
  const total = coinPacks.length + items.length;
  if (!total) return null;
  const packs = coinPacks.slice(0, MAX_ON_HOME);
  const extras = items.slice(0, MAX_ON_HOME - packs.length);
  const shown = packs.length + extras.length;
  const balances = balancesOf(wallet);
  const { coinsPerKwacha } = economyRates(wallet?.economy);
  return (
    <section className={`hs-panel ${className}`} aria-labelledby="hs-title">
      <style dangerouslySetInnerHTML={{ __html: HS_CSS }} />
      <SectionTitle id="hs-title" size={22}
        right={<button type="button" className="hs-all" onClick={onSeeAll}>See all{total > shown ? ` ${total}` : ''} ›</button>}>Store</SectionTitle>
      <Card className="hs-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13.5, fontWeight: 800, color: C.text }}>
            <RewardIcon kind="coins" size={17} />You have {amountText(balances.kwacha, 'coins')}
          </span>
          {packs.length > 0 && <span style={{ fontSize: 12, fontWeight: 800, color: C.muted }}>{amountText(coinsPerKwacha, 'coins')} = {formatKwacha(1)}</span>}
        </div>
        <div className="hs-row" style={{ '--hs-n': shown }}>
          {packs.map(it => <HomePackCard key={it.id} item={it} balances={balances} onBuy={onBuy} busy={busyId === it.id} />)}
          {extras.map((it, i) => <StoreCard key={it.id} i={i} item={it} canBuy={canAfford(it.price, balances)} onBuy={onBuy} />)}
        </div>
        {packs.length > 0 && (
          <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.45, color: C.muted }}>
            Tap Buy twice to confirm. Our team credits the pack to your bwanabet account. One kwacha pack per week.
          </p>
        )}
      </Card>
    </section>
  );
}
