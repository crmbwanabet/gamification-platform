'use client';

import React from 'react';
import { C } from './tokens';
import { getLevel, getNextLevel, getXPProgress, MINIGAMES, STORE_ITEMS } from '@/lib/data/platform';
import { getDailyMissions, PERMANENT_MISSIONS } from '@/lib/data/missions';

/* ---------------- shared UI primitives (used by all redesign views) ------- */

export function Badge({ children, bg, color = '#0c2b1e' }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 800, letterSpacing: '.03em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 6, background: bg, color }}>{children}</span>;
}

export function Progress({ value, color = C.green, height = 7 }) {
  return (
    <div style={{ height, borderRadius: height, background: C.track, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.max(0, Math.min(100, value))}%`, borderRadius: height, background: color }} />
    </div>
  );
}

export function GreenBtn({ children, full, onClick, disabled }) {
  return (
    <button onClick={onClick} disabled={disabled} style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
      width: full ? '100%' : 'auto', padding: '9px 18px', borderRadius: 9, border: 'none',
      cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
      background: C.green, color: '#08210f', fontWeight: 800, fontSize: 13, boxShadow: '0 4px 12px rgba(79,169,139,.28)',
    }}>{children}</button>
  );
}

export const SectionTitle = ({ children, right }) => (
  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', margin: '0 0 12px' }}>
    <h2 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: C.text }}>{children}</h2>
    {right}
  </div>
);

export function Card({ children, style }) {
  return <div style={{ background: `linear-gradient(180deg, ${C.panelHi}, ${C.panelLo})`, borderRadius: 15, border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 5px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)', ...style }}>{children}</div>;
}

export function Thumb({ src, alt, from = '#3a4450', to = '#232a32', h = 92, radius = 10, label }) {
  return (
    <div style={{ position: 'relative', height: h, borderRadius: radius, overflow: 'hidden', background: `radial-gradient(130% 125% at 28% 16%, ${from}, ${to} 82%)`, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.06), inset 0 -20px 34px rgba(0,0,0,.22)' }}>
      {src && <img src={src} alt={alt || ''} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(255,255,255,.10), rgba(255,255,255,0) 40%, rgba(0,0,0,.28))', pointerEvents: 'none' }} />
      {label && <span style={{ position: 'absolute', bottom: 6, left: 8, fontSize: 12, fontWeight: 900, color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,.7)' }}>{label}</span>}
    </div>
  );
}

/* ---------------- shell: top bar + sidebar ------------------------------- */

const NAV = [
  { label: 'Home', img: 'home', tab: 'home' },
  { label: 'Play', img: 'play', tab: 'play', n: MINIGAMES.length },
  { label: 'Earn', img: 'earn', tab: 'earn', n: [...getDailyMissions(), ...PERMANENT_MISSIONS].length },
  { label: 'Store', img: 'store', tab: 'store', n: STORE_ITEMS.length },
];

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
          <button key={i} onClick={() => onNavigate && onNavigate(it.tab)} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', background: isActive ? C.green : 'transparent', color: isActive ? '#08210f' : C.sub, textAlign: 'left', width: '100%' }}>
            <span style={{ width: 30, height: 30, flex: 'none', display: 'grid', placeItems: 'center', borderRadius: 8, background: isActive ? 'rgba(6,24,14,.24)' : 'transparent' }}>
              <img src={`/ui/nav/${it.img}.png`} alt="" width={24} height={24} style={{ objectFit: 'contain' }} />
            </span>
            <span style={{ fontSize: 13.5, fontWeight: isActive ? 800 : 600, flex: 1 }}>{it.label}</span>
            {it.n != null && <span style={{ minWidth: 22, height: 20, padding: '0 6px', borderRadius: 999, fontSize: 11, fontWeight: 800, display: 'grid', placeItems: 'center', background: isActive ? 'rgba(8,33,15,.18)' : C.panel2, color: isActive ? '#08210f' : C.sub }}>+{it.n}</span>}
          </button>
        );
      })}
    </aside>
  );
}

/**
 * Full redesign shell: navy background + top bar + sidebar, with the view's
 * content rendered in <main>. Prop-driven so every screen shares one shell.
 */
export default function RedesignShell({
  points = '0', missionsCount = 0, badges = 0, xp = 0,
  activeTab = 'home', onNavigate, children,
}) {
  const lvl = getLevel(xp), nextLvl = getNextLevel(xp), xpPct = getXPProgress(xp);
  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(130% 90% at 50% -10%, #1f2230, #171922 72%)', color: C.text, fontFamily: "var(--font-body, 'Onest', system-ui, sans-serif)", WebkitFontSmoothing: 'antialiased' }}>
      <TopBar points={points} missionsCount={missionsCount} badges={badges} lvl={lvl} nextLvl={nextLvl} xpPct={xpPct} />
      <div style={{ display: 'flex', alignItems: 'stretch' }}>
        <Sidebar active={activeTab} onNavigate={onNavigate} />
        <main style={{ flex: 1, minWidth: 0, padding: '20px 22px' }}>{children}</main>
      </div>
    </div>
  );
}
