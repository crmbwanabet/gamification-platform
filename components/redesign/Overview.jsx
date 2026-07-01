'use client';

import React from 'react';
import { Coins, Gem } from 'lucide-react';
import { C } from './tokens';
import { IMAGES } from '@/lib/data/images';
import { getDailyMissions, PERMANENT_MISSIONS } from '@/lib/data/missions';
import { STORE_ITEMS, MINIGAMES, getLevel, getNextLevel, getXPProgress } from '@/lib/data/platform';

/* ------------------------------------------------------------------ */
/*  Building blocks                                                    */
/* ------------------------------------------------------------------ */

function Badge({ children, bg, color = '#0c2b1e' }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 800, letterSpacing: '.03em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 6, background: bg, color }}>{children}</span>
  );
}

function Progress({ value, color = C.green, height = 7 }) {
  return (
    <div style={{ height, borderRadius: height, background: C.track, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.max(0, Math.min(100, value))}%`, borderRadius: height, background: color }} />
    </div>
  );
}

function GreenBtn({ children, full, onClick }) {
  return (
    <button onClick={onClick} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: full ? '100%' : 'auto', padding: '9px 18px', borderRadius: 9, border: 'none', cursor: 'pointer', background: C.green, color: '#08210f', fontWeight: 800, fontSize: 13, boxShadow: '0 4px 12px rgba(79,169,139,.28)' }}>{children}</button>
  );
}

const SectionTitle = ({ children }) => <h2 style={{ margin: '0 0 12px', fontSize: 17, fontWeight: 800, color: C.text }}>{children}</h2>;

function Card({ children, style }) {
  return (
    <div style={{ background: `linear-gradient(180deg, ${C.panelHi}, ${C.panelLo})`, borderRadius: 15, border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 5px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)', ...style }}>{children}</div>
  );
}

function Thumb({ src, alt, from = '#3a4450', to = '#232a32', h = 92, radius = 10, label }) {
  return (
    <div style={{ position: 'relative', height: h, borderRadius: radius, overflow: 'hidden', background: `radial-gradient(130% 125% at 28% 16%, ${from}, ${to} 82%)`, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.06), inset 0 -20px 34px rgba(0,0,0,.22)' }}>
      {src && <img src={src} alt={alt || ''} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(255,255,255,.10), rgba(255,255,255,0) 40%, rgba(0,0,0,.28))', pointerEvents: 'none' }} />
      {label && <span style={{ position: 'absolute', bottom: 6, left: 8, fontSize: 12, fontWeight: 900, color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,.7)' }}>{label}</span>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Real content                                                       */
/* ------------------------------------------------------------------ */

const MISSIONS = [...getDailyMissions(), ...PERMANENT_MISSIONS];
const viking = STORE_ITEMS.find(i => i.id === 'viking') || STORE_ITEMS[0];
const storeMore = STORE_ITEMS.filter(i => i.id !== viking.id).slice(0, 2);
const wheelGame = MINIGAMES.find(g => g.id === 'wheel');

const MISSION_STATE = [
  { kind: 'done' },
  { kind: 'progress', pct: 62, isNew: true },
  { kind: 'reward' },
];

const NAV = [
  { label: 'Home', img: 'home', tab: 'home' },
  { label: 'Play', img: 'play', tab: 'play', n: MINIGAMES.length },
  { label: 'Earn', img: 'earn', tab: 'earn', n: MISSIONS.length },
  { label: 'Store', img: 'store', tab: 'store', n: STORE_ITEMS.length },
];

/* ------------------------------------------------------------------ */
/*  Shell pieces                                                       */
/* ------------------------------------------------------------------ */

function Stat({ img, value, label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      <img src={`/ui/nav/${img}.png`} alt="" width={30} height={30} style={{ objectFit: 'contain', flex: 'none' }} />
      <div style={{ lineHeight: 1.1 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>{value}</div>
        <div style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>{label}</div>
      </div>
    </div>
  );
}

function TopBar({ points, missionsCount, badges, lvl, nextLvl, xpPct }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 26, padding: '14px 22px', background: C.bgTop, borderBottom: `1px solid ${C.line}`, boxShadow: '0 2px 10px rgba(0,0,0,.2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: 168, flex: 'none' }}>
        <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'linear-gradient(135deg,#7fd7e8,#3a7d8c)', display: 'grid', placeItems: 'center', fontSize: 24, border: `2px solid ${C.teal}` }}>🧑‍🦰</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>Player</div>
          <span style={{ fontSize: 10, fontWeight: 700, color: C.text, background: C.panel2, padding: '2px 8px', borderRadius: 999 }}>{lvl.name}</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 26 }}>
        <Stat img="points" value={points} label="Points" />
        <Stat img="missions" value={missionsCount} label="Missions" />
        <Stat img="badges" value={badges} label="Badges" />
      </div>

      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12, width: 300 }}>
        <div style={{ fontSize: 30 }}>{nextLvl ? nextLvl.icon : lvl.icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: C.sub, marginBottom: 6, fontWeight: 600 }}>Next level is, <b style={{ color: C.text }}>{nextLvl ? nextLvl.name : 'Max'}</b></div>
          <Progress value={xpPct} color="linear-gradient(90deg,#4fa98b,#8b5cf6)" height={8} />
        </div>
      </div>
    </div>
  );
}

function Sidebar({ active = 'home', onNavigate }) {
  return (
    <aside style={{ width: 200, flex: 'none', background: C.side, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4, borderRight: `1px solid ${C.line}` }}>
      {NAV.map((it, i) => {
        const isActive = it.tab === active;
        return (
          <button key={i} onClick={() => onNavigate && onNavigate(it.tab)} style={{
            display: 'flex', alignItems: 'center', gap: 11, padding: '9px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
            background: isActive ? C.green : 'transparent', color: isActive ? '#08210f' : C.sub, textAlign: 'left', width: '100%',
          }}>
            <span style={{ width: 30, height: 30, flex: 'none', display: 'grid', placeItems: 'center', borderRadius: 8, background: isActive ? 'rgba(6,24,14,.24)' : 'transparent' }}>
              <img src={`/ui/nav/${it.img}.png`} alt="" width={24} height={24} style={{ objectFit: 'contain' }} />
            </span>
            <span style={{ fontSize: 13.5, fontWeight: isActive ? 800 : 600, flex: 1 }}>{it.label}</span>
            {it.n != null && (
              <span style={{ minWidth: 22, height: 20, padding: '0 6px', borderRadius: 999, fontSize: 11, fontWeight: 800, display: 'grid', placeItems: 'center', background: isActive ? 'rgba(8,33,15,.18)' : C.panel2, color: isActive ? '#08210f' : C.sub }}>+{it.n}</span>
            )}
          </button>
        );
      })}
    </aside>
  );
}

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

/* ------------------------------------------------------------------ */
/*  Page — prop-driven so it works standalone (/redesign) and in-app   */
/* ------------------------------------------------------------------ */

export default function Overview({
  points = '2,344',
  missionsCount = MISSIONS.length,
  badges = 12,
  xp = 1200,
  activeTab = 'home',
  onNavigate,
} = {}) {
  const lvl = getLevel(xp), nextLvl = getNextLevel(xp), xpPct = getXPProgress(xp);
  const go = (t) => onNavigate && onNavigate(t);
  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(130% 90% at 50% -10%, #1f2230, #171922 72%)', color: C.text, fontFamily: "var(--font-body, 'Onest', system-ui, sans-serif)", WebkitFontSmoothing: 'antialiased' }}>
      <TopBar points={points} missionsCount={missionsCount} badges={badges} lvl={lvl} nextLvl={nextLvl} xpPct={xpPct} />
      <div style={{ display: 'flex', alignItems: 'stretch' }}>
        <Sidebar active={activeTab} onNavigate={onNavigate} />

        <main style={{ flex: 1, minWidth: 0, padding: '20px 22px', display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: 26, alignContent: 'start' }}>

          <section>
            <SectionTitle>Latest Missions</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
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

          <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
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
        </main>
      </div>
    </div>
  );
}
