'use client';

import React from 'react';
import { C } from './tokens';
import RedesignShell, { SectionTitle, Card, Thumb, Badge, RewardIcon, CurrencyAmounts, CURRENCY_COLOR } from './RedesignShell';
import { IMAGES } from '@/lib/data/images';
import { STORE_ITEMS } from '@/lib/data/platform';
import { amountText } from '@/lib/rewardText.mjs';
import { GEM_LABEL, canAfford, cleanReward, economyRates, formatKwacha } from '@/lib/economy/currency.mjs';
import { splitCatalog } from '@/lib/store/catalog.mjs';

// Balances the store compares prices against ({ kwacha, emeralds, rubies, diamonds }).
const balancesOf = (w) => ({ kwacha: w?.kwacha || 0, emeralds: w?.emeralds || 0, rubies: w?.rubies || 0, diamonds: w?.diamonds || 0 });

function StoreCard({ item, canBuy, onBuy, i = 0 }) {
  return (
    <Card className="card-enter" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', animationDelay: `${i * 45}ms` }}>
      <div style={{ position: 'relative' }}>
        <Thumb src={item.imageUrl || IMAGES[item.image]} alt={item.name} h={90} radius={0} />
        {item.featured && <span style={{ position: 'absolute', top: 6, left: 6, zIndex: 2 }}><Badge bg={C.gold}>Featured</Badge></span>}
        {item.isNew && <span style={{ position: 'absolute', top: 6, right: 6, zIndex: 2 }}><Badge bg={C.red} color="#fff">New</Badge></span>}
      </div>
      <div style={{ padding: '10px 11px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: C.text, lineHeight: 1.2 }}>{item.name}</div>
        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          {Object.keys(cleanReward(item.price)).length ? <CurrencyAmounts r={item.price} size={14} fontSize={12} gap={8} /> : <span style={{ fontSize: 12, fontWeight: 800, color: C.green }}>Free</span>}
          <button onClick={(e) => canBuy && onBuy && onBuy(item, e?.currentTarget)} disabled={!canBuy} style={{ border: 'none', cursor: canBuy ? 'pointer' : 'not-allowed', fontSize: 11, fontWeight: 800, padding: '6px 14px', borderRadius: 8, background: canBuy ? C.green : C.track, color: canBuy ? '#08210f' : C.muted }}>Buy</button>
        </div>
      </div>
    </Card>
  );
}

/**
 * Redeem button with a two-tap confirm: real money moves, so the first tap
 * arms it ("Confirm K5?") and a second tap within 4s sends the redemption.
 */
function RedeemButton({ item, canBuy, onBuy, busy }) {
  const [armed, setArmed] = React.useState(false);
  React.useEffect(() => {
    if (!armed) return undefined;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);
  const disabled = !canBuy || busy;
  const onClick = (e) => {
    if (disabled) return;
    if (!armed) { setArmed(true); return; }
    setArmed(false);
    if (onBuy) onBuy(item, e?.currentTarget);
  };
  return (
    <button type="button" onClick={onClick} disabled={disabled} data-redeem={item.id}
      aria-label={armed ? `Confirm: redeem ${formatKwacha(item.payoutKwacha)}` : `Redeem ${formatKwacha(item.payoutKwacha)}`}
      style={{ width: '100%', minHeight: 36, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer', fontSize: 12.5, fontWeight: 800, padding: '8px 10px', borderRadius: 9, background: disabled ? C.track : armed ? C.gold : C.green, color: disabled ? C.muted : '#08210f', boxShadow: disabled ? 'none' : '0 3px 10px rgba(0,0,0,.25)', transition: 'background .15s ease' }}>
      {busy ? 'Sending…' : armed ? `Confirm ${formatKwacha(item.payoutKwacha)}?` : 'Redeem'}
    </button>
  );
}

function CoinPackCard({ item, balances, onBuy, busy, i }) {
  const coins = item.price.kwacha;
  const ok = canAfford(item.price, balances);
  const short = Math.max(0, coins - balances.kwacha);
  return (
    <Card className="card-enter" style={{ padding: '12px 12px 11px', display: 'flex', flexDirection: 'column', gap: 8, animationDelay: `${i * 40}ms`, opacity: ok ? 1 : 0.78 }}>
      <div style={{ fontSize: 26, fontWeight: 900, lineHeight: 1, color: C.text, fontFamily: "var(--font-display, 'Bricolage Grotesque', sans-serif)" }}>{formatKwacha(item.payoutKwacha)}</div>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: C.muted, marginTop: -4 }}>bwanabet bonus</div>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 800, color: C.gold }}>
        <RewardIcon kind="coins" size={15} />{amountText(coins, 'coins')}
      </div>
      <div style={{ fontSize: 10.5, fontWeight: 600, color: ok ? C.green : C.muted, minHeight: 13 }}>{ok ? 'You can redeem this' : `${amountText(short, 'coins')} short`}</div>
      <RedeemButton item={item} canBuy={ok} onBuy={onBuy} busy={busy} />
    </Card>
  );
}

function GemRedeemCard({ item, balances, onBuy, busy, i }) {
  const g = item.redeem.currency;
  const n = item.price[g] || 1;
  const have = balances[g] || 0;
  const ok = canAfford(item.price, balances);
  return (
    <Card className="card-enter" style={{ padding: '12px 10px 11px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 6, animationDelay: `${i * 40}ms`, opacity: ok ? 1 : 0.78 }}>
      <RewardIcon kind={g} size={40} />
      <div style={{ fontSize: 12.5, fontWeight: 800, color: CURRENCY_COLOR[g], lineHeight: 1.2 }}>{n} {GEM_LABEL[g]}</div>
      <div style={{ fontSize: 20, fontWeight: 900, color: C.text, lineHeight: 1 }}>{formatKwacha(item.payoutKwacha)}</div>
      <div style={{ fontSize: 10.5, fontWeight: 600, color: C.muted }}>You have {amountText(have, g)}</div>
      <RedeemButton item={item} canBuy={ok} onBuy={onBuy} busy={busy} />
    </Card>
  );
}

export default function StoreView({ wallet = null, points = '0', missionsCount = 0, badges = 0, xp = 0, onNavigate, onOpenProfile, onBuy, userId = null, navBadges = {}, storeItems = null, busyId = null }) {
  const { coinPacks, gemRedemptions, items } = splitCatalog(storeItems || STORE_ITEMS);
  const balances = balancesOf(wallet);
  const { coinsPerKwacha } = economyRates(wallet?.economy);
  const hasRedeem = coinPacks.length + gemRedemptions.length > 0;
  return (
    <RedesignShell wallet={wallet} points={points} missionsCount={missionsCount} badges={badges} xp={xp} userId={userId} navBadges={navBadges} activeTab="store" onNavigate={onNavigate} onOpenProfile={onOpenProfile}>
      <style>{`
        .rs-redeem-coins { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
        .rs-redeem-gems { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
        @media (max-width: 400px) { .rs-redeem-coins { grid-template-columns: 1fr 1fr; } .rs-redeem-gems { gap: 8px; } }
      `}</style>
      {hasRedeem && (
        <section aria-labelledby="rs-redeem-title" style={{ marginBottom: 22 }}>
          <SectionTitle><span id="rs-redeem-title">Redeem for kwacha</span></SectionTitle>
          <Card style={{ padding: '11px 13px', marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <span data-store-balance style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13.5, fontWeight: 800, color: C.text }}>
              <RewardIcon kind="coins" size={17} />You have {amountText(balances.kwacha, 'coins')}
            </span>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: C.sub }}>{amountText(coinsPerKwacha, 'coins')} = {formatKwacha(1)}</span>
          </Card>
          {coinPacks.length > 0 && (
            <div className="rs-redeem-coins">
              {coinPacks.map((it, i) => <CoinPackCard key={it.id} i={i} item={it} balances={balances} onBuy={onBuy} busy={busyId === it.id} />)}
            </div>
          )}
          {gemRedemptions.length > 0 && (
            <>
              <div style={{ fontSize: 12, fontWeight: 800, color: C.sub, textTransform: 'uppercase', letterSpacing: '.05em', margin: '16px 2px 10px' }}>Redeem a gem</div>
              <div className="rs-redeem-gems">
                {gemRedemptions.map((it, i) => <GemRedeemCard key={it.id} i={i} item={it} balances={balances} onBuy={onBuy} busy={busyId === it.id} />)}
              </div>
            </>
          )}
          <p style={{ margin: '12px 2px 0', fontSize: 11.5, lineHeight: 1.45, color: C.muted }}>
            Our team credits the kwacha to your bwanabet account. One kwacha redemption per week. Gems are won as prizes only.
          </p>
        </section>
      )}
      <section>
        {(items.length > 0 || !hasRedeem) && <SectionTitle>Rewards Store</SectionTitle>}
        {items.length === 0 && !hasRedeem ? (
          <Card style={{ padding: '46px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🛍️</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 6 }}>Restocking the shelves…</div>
            <div style={{ fontSize: 13, color: C.sub, maxWidth: 340, margin: '0 auto' }}>
              New rewards are on their way — free spins, free bets and exclusive merch.
              Keep earning coins so you're ready when they land!
            </div>
          </Card>
        ) : items.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))', gap: 12 }}>
            {items.map((item, i) => <StoreCard key={item.id} i={i} item={item} canBuy={canAfford(item.price, balances)} onBuy={onBuy} />)}
          </div>
        ) : null}
      </section>
    </RedesignShell>
  );
}
