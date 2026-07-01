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
        <Thumb src={IMAGES[item.image]} alt={item.name} h={140} radius={0} />
        {item.featured && <span style={{ position: 'absolute', top: 8, left: 8, zIndex: 2 }}><Badge bg={C.gold}>Featured</Badge></span>}
        {item.isNew && <span style={{ position: 'absolute', top: 8, right: 8, zIndex: 2 }}><Badge bg={C.red} color="#fff">New</Badge></span>}
      </div>
      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>{item.name}</div>
          <div style={{ fontSize: 12, color: C.sub, marginTop: 2, minHeight: 34 }}>{item.desc}</div>
        </div>
        <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: 13, fontWeight: 800 }}>
            <span style={{ color: C.gold, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Coins size={15} />{item.price.kwacha}</span>
            {item.price.gems && <span style={{ color: C.teal, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Gem size={14} />{item.price.gems}</span>}
          </span>
          <GreenBtn onClick={(e) => onBuy && onBuy(item, e?.currentTarget)} disabled={!canBuy}>Buy</GreenBtn>
        </div>
      </div>
    </Card>
  );
}

export default function StoreView({ points = '0', missionsCount = 0, badges = 0, xp = 0, onNavigate, onBuy, kwacha = 0, gems = 0 }) {
  return (
    <RedesignShell points={points} missionsCount={missionsCount} badges={badges} xp={xp} activeTab="store" onNavigate={onNavigate}>
      <section>
        <SectionTitle>Rewards Store</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 16 }}>
          {STORE_ITEMS.map(item => {
            const canBuy = kwacha >= item.price.kwacha && (!item.price.gems || gems >= item.price.gems);
            return <StoreCard key={item.id} item={item} canBuy={canBuy} onBuy={onBuy} />;
          })}
        </div>
      </section>
    </RedesignShell>
  );
}
