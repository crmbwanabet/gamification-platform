'use client';

import React from 'react';
import { C } from './tokens';
import RedesignShell, { GreenBtn, SectionTitle, Card, Thumb, Badge, RewardIcon } from './RedesignShell';
import { IMAGES } from '@/lib/data/images';
import { STORE_ITEMS } from '@/lib/data/platform';

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
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 800 }}>
            <span style={{ color: C.gold, display: 'inline-flex', alignItems: 'center', gap: 4 }}><RewardIcon kind="coins" size={15} />{item.price.kwacha}</span>
            {item.price.gems && <span style={{ color: C.teal, display: 'inline-flex', alignItems: 'center', gap: 4 }}><RewardIcon kind="gem" size={14} />{item.price.gems}</span>}
          </span>
          <button onClick={(e) => canBuy && onBuy && onBuy(item, e?.currentTarget)} disabled={!canBuy} style={{ border: 'none', cursor: canBuy ? 'pointer' : 'not-allowed', fontSize: 11, fontWeight: 800, padding: '6px 14px', borderRadius: 8, background: canBuy ? C.green : C.track, color: canBuy ? '#08210f' : C.muted }}>Buy</button>
        </div>
      </div>
    </Card>
  );
}

export default function StoreView({ points = '0', missionsCount = 0, badges = 0, xp = 0, onNavigate, onOpenProfile, onBuy, kwacha = 0, gems = 0, userId = null, navBadges = {}, storeItems = null }) {
  const items = storeItems || STORE_ITEMS;
  return (
    <RedesignShell points={points} missionsCount={missionsCount} badges={badges} xp={xp} userId={userId} navBadges={navBadges} activeTab="store" onNavigate={onNavigate} onOpenProfile={onOpenProfile}>
      <section>
        <SectionTitle>Rewards Store</SectionTitle>
        {items.length === 0 ? (
          <Card style={{ padding: '46px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🛍️</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 6 }}>Restocking the shelves…</div>
            <div style={{ fontSize: 13, color: C.sub, maxWidth: 340, margin: '0 auto' }}>
              New rewards are on their way — free spins, free bets and exclusive merch.
              Keep earning coins so you're ready when they land!
            </div>
          </Card>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))', gap: 12 }}>
            {items.map((item, i) => {
              const canBuy = kwacha >= item.price.kwacha && (!item.price.gems || gems >= item.price.gems);
              return <StoreCard key={item.id} i={i} item={item} canBuy={canBuy} onBuy={onBuy} />;
            })}
          </div>
        )}
      </section>
    </RedesignShell>
  );
}
