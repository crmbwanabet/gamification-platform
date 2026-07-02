'use client';

import React from 'react';
import { Coins, Gem } from 'lucide-react';
import { C } from './tokens';
import RedesignShell, { GreenBtn, SectionTitle, Card, Thumb, Badge } from './RedesignShell';
import { IMAGES } from '@/lib/data/images';
import { STORE_ITEMS } from '@/lib/data/platform';

function StoreCard({ item, canBuy, onBuy }) {
  return (
    <Card style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ position: 'relative' }}>
        <Thumb src={IMAGES[item.image]} alt={item.name} h={90} radius={0} />
        {item.featured && <span style={{ position: 'absolute', top: 6, left: 6, zIndex: 2 }}><Badge bg={C.gold}>Featured</Badge></span>}
        {item.isNew && <span style={{ position: 'absolute', top: 6, right: 6, zIndex: 2 }}><Badge bg={C.red} color="#fff">New</Badge></span>}
      </div>
      <div style={{ padding: '10px 11px', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: C.text, lineHeight: 1.2 }}>{item.name}</div>
        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 800 }}>
            <span style={{ color: C.gold, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Coins size={13} />{item.price.kwacha}</span>
            {item.price.gems && <span style={{ color: C.teal, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Gem size={12} />{item.price.gems}</span>}
          </span>
          <button onClick={(e) => canBuy && onBuy && onBuy(item, e?.currentTarget)} disabled={!canBuy} style={{ border: 'none', cursor: canBuy ? 'pointer' : 'not-allowed', fontSize: 11, fontWeight: 800, padding: '6px 14px', borderRadius: 8, background: canBuy ? C.green : C.track, color: canBuy ? '#08210f' : C.muted }}>Buy</button>
        </div>
      </div>
    </Card>
  );
}

export default function StoreView({ points = '0', missionsCount = 0, badges = 0, xp = 0, onNavigate, onOpenProfile, onBuy, kwacha = 0, gems = 0 }) {
  return (
    <RedesignShell points={points} missionsCount={missionsCount} badges={badges} xp={xp} activeTab="store" onNavigate={onNavigate} onOpenProfile={onOpenProfile}>
      <section>
        <SectionTitle>Rewards Store</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(168px, 1fr))', gap: 12 }}>
          {STORE_ITEMS.map(item => {
            const canBuy = kwacha >= item.price.kwacha && (!item.price.gems || gems >= item.price.gems);
            return <StoreCard key={item.id} item={item} canBuy={canBuy} onBuy={onBuy} />;
          })}
        </div>
      </section>
    </RedesignShell>
  );
}
