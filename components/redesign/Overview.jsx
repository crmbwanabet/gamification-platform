'use client';

import React from 'react';
import { Coins, Gem } from 'lucide-react';
import { C } from './tokens';
import RedesignShell, { Badge, Progress, GreenBtn, SectionTitle, Card, Thumb } from './RedesignShell';
import { IMAGES } from '@/lib/data/images';
import { getDailyMissions, PERMANENT_MISSIONS } from '@/lib/data/missions';
import { STORE_ITEMS, MINIGAMES } from '@/lib/data/platform';

const MISSIONS = [...getDailyMissions(), ...PERMANENT_MISSIONS];
const viking = STORE_ITEMS.find(i => i.id === 'viking') || STORE_ITEMS[0];
const storeMore = STORE_ITEMS.filter(i => i.id !== viking.id).slice(0, 2);
const wheelGame = MINIGAMES.find(g => g.id === 'wheel');
const MISSION_STATE = [{ kind: 'done' }, { kind: 'progress', pct: 62, isNew: true }, { kind: 'reward' }];

function MissionCard({ m, state }) {
  const highlight = state.kind === 'progress';
  return (
    <Card style={{ padding: 12, position: 'relative', overflow: 'hidden', border: highlight ? `1.5px solid ${C.teal}` : '1px solid rgba(255,255,255,0.07)' }}>
      {state.isNew && <div style={{ position: 'absolute', top: 12, left: -30, transform: 'rotate(-45deg)', background: C.green, color: '#08210f', fontSize: 10, fontWeight: 900, padding: '3px 34px', letterSpacing: '.05em', zIndex: 2 }}>NEW!</div>}
      <div style={{ fontSize: 13.5, fontWeight: 800, color: C.text, marginBottom: 10, minHeight: 34 }}>{m.name}</div>
      <Thumb src={IMAGES[m.image]} alt={m.name} h={78} />
      <div style={{ marginTop: 10 }}>
        {state.kind === 'done' && <Badge bg={C.green}>Mission is completed</Badge>}
        {state.kind === 'progress' && <Badge bg={C.teal} color="#06231f">In progress</Badge>}
        <div style={{ marginTop: 8 }}>
          {state.kind === 'reward'
            ? <div style={{ fontSize: 11, color: C.sub }}><span style={{ color: C.muted }}>Reward:</span> <b style={{ color: C.text }}>{m.reward.kwacha} Points</b></div>
            : <Progress value={state.kind === 'done' ? 100 : state.pct} />}
        </div>
      </div>
    </Card>
  );
}

function StoreRow({ item, onNavigate }) {
  return (
    <Card style={{ padding: 12, display: 'flex', gap: 12, alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
      {item.isNew && <div style={{ position: 'absolute', top: 10, left: -28, transform: 'rotate(-45deg)', background: C.red, color: '#fff', fontSize: 9, fontWeight: 900, padding: '2px 30px', zIndex: 2 }}>NEW</div>}
      <div style={{ width: 96, flex: 'none' }}><Thumb src={IMAGES[item.image]} alt={item.name} h={72} /></div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 800, color: C.text }}>{item.name}</div>
        {item.desc && <div style={{ fontSize: 11.5, color: C.sub, margin: '2px 0 8px' }}>{item.desc}</div>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: item.desc ? 0 : 8 }}>
          <GreenBtn onClick={() => onNavigate && onNavigate('store')}>Buy Now</GreenBtn>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13, fontWeight: 800, color: C.gold }}><Coins size={15} /> {item.price.kwacha}</span>
          {item.price.gems && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 13, fontWeight: 800, color: C.teal }}><Gem size={14} /> {item.price.gems}</span>}
        </div>
      </div>
    </Card>
  );
}

export default function Overview({ points = '2,344', missionsCount = MISSIONS.length, badges = 12, xp = 1200, activeTab = 'home', onNavigate } = {}) {
  const go = (t) => onNavigate && onNavigate(t);
  return (
    <RedesignShell points={points} missionsCount={missionsCount} badges={badges} xp={xp} activeTab={activeTab} onNavigate={onNavigate}>
      <div className="rs-ov-grid" style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: 26, alignContent: 'start' }}>

        <section>
          <SectionTitle>Latest Missions</SectionTitle>
          <div className="rs-ov-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
            {MISSIONS.slice(0, 3).map((m, i) => <MissionCard key={m.id} m={m} state={MISSION_STATE[i]} />)}
          </div>
        </section>

        <section>
          <SectionTitle>Featured Reward</SectionTitle>
          <Card style={{ padding: 14, display: 'flex', gap: 14, alignItems: 'center' }}>
            <div style={{ width: 120, flex: 'none' }}><Thumb src={IMAGES[viking.image]} alt={viking.name} h={96} /></div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 800, marginBottom: 10 }}>{viking.name}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <GreenBtn onClick={() => go('store')}>Buy Now</GreenBtn>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 14, fontWeight: 800, color: C.gold }}><Coins size={16} /> {viking.price.kwacha}</span>
              </div>
            </div>
          </Card>
        </section>

        <section className="rs-ov-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div>
            <SectionTitle>Featured</SectionTitle>
            <Card style={{ overflow: 'hidden' }}>
              <div style={{ position: 'relative' }}>
                <Thumb src={IMAGES.jackpotBanner} alt="Jackpot" h={104} radius={0} />
                <span style={{ position: 'absolute', top: 10, left: 12, background: '#111', color: C.gold, fontSize: 12, fontWeight: 900, padding: '3px 10px', borderRadius: 6, letterSpacing: '.06em', zIndex: 2 }}>BIG PRIZE</span>
              </div>
              <div style={{ padding: 12 }}>
                <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{MINIGAMES.length}+ minigames</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 10 }}>Play &amp; win the daily jackpot</div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                  {[['Entry', 'Free'], ['Games', String(MINIGAMES.length)], ['Prize', 'Jackpot']].map(([k, v]) => (
                    <div key={k} style={{ flex: 1 }}>
                      <div style={{ fontSize: 9.5, color: C.muted, marginBottom: 3 }}>{k}</div>
                      <div style={{ fontSize: 12, fontWeight: 800, background: C.track, borderRadius: 7, padding: '6px 8px', textAlign: 'center' }}>{v}</div>
                    </div>
                  ))}
                </div>
                <GreenBtn full onClick={() => go('play')}>Play Now</GreenBtn>
              </div>
            </Card>
          </div>

          <div>
            <SectionTitle>Spin the wheel</SectionTitle>
            <Card style={{ overflow: 'hidden' }}>
              <Thumb src={IMAGES.wheel} alt="Wheel of Fortune" h={104} radius={0} />
              <div style={{ padding: 12, textAlign: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>{wheelGame ? wheelGame.name : 'Wheel of Fortune'}</div>
                <div style={{ fontSize: 11.5, color: C.sub, marginBottom: 12, lineHeight: 1.5 }}>{wheelGame ? wheelGame.desc : 'Spin to win amazing prizes!'}</div>
                <GreenBtn full onClick={() => go('play')}>Free to spin</GreenBtn>
              </div>
            </Card>
          </div>
        </section>

        <section>
          <SectionTitle>More in the store</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {storeMore.map(item => <StoreRow key={item.id} item={item} onNavigate={onNavigate} />)}
          </div>
        </section>
      </div>
    </RedesignShell>
  );
}
