'use client';

import React from 'react';
import { C } from './tokens';
import { getLevel, getNextLevel, getXPProgress, MINIGAMES, STORE_ITEMS } from '@/lib/data/platform';
import { getDailyMissions, PERMANENT_MISSIONS } from '@/lib/data/missions';

/* ---------------- shared UI primitives (used by all redesign views) ------- */

const prefersReduced = () => typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Animate a number rolling up to its new value when `value` changes. */
export function CountUp({ value = 0, duration = 550, format = (n) => n.toLocaleString(), style, className }) {
  const [display, setDisplay] = React.useState(value);
  const fromRef = React.useRef(value);
  React.useEffect(() => {
    const from = fromRef.current, to = value;
    if (from === to) return;
    if (prefersReduced()) { fromRef.current = to; setDisplay(to); return; }
    let raf, start;
    const step = (ts) => {
      if (start === undefined) start = ts;
      const t = Math.min(1, (ts - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) raf = requestAnimationFrame(step); else fromRef.current = to;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <span className={className} style={style}>{format(display)}</span>;
}

export function Badge({ children, bg, color = '#0c2b1e' }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 800, letterSpacing: '.03em', textTransform: 'uppercase', padding: '3px 8px', borderRadius: 6, background: bg, color }}>{children}</span>;
}

export function Progress({ value, color = C.green, height = 7 }) {
  const target = Math.max(0, Math.min(100, value || 0));
  const [w, setW] = React.useState(() => (prefersReduced() ? target : 0));
  React.useEffect(() => {
    if (prefersReduced()) { setW(target); return; }
    const id = requestAnimationFrame(() => setW(target));
    return () => cancelAnimationFrame(id);
  }, [target]);
  return (
    <div style={{ height, borderRadius: height, background: C.track, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${w}%`, borderRadius: height, background: color, transition: 'width 0.6s cubic-bezier(0.2, 0.8, 0.3, 1)' }} />
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

export function Card({ children, style, className }) {
  return <div className={className} style={{ background: `linear-gradient(180deg, ${C.panelHi}, ${C.panelLo})`, borderRadius: 15, border: '1px solid rgba(255,255,255,0.07)', boxShadow: '0 5px 16px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.06)', ...style }}>{children}</div>;
}

export function Thumb({ src, alt, from = '#3a4450', to = '#232a32', h = 92, radius = 10, label }) {
  return (
    <div className="rs-thumb" style={{ position: 'relative', height: h, borderRadius: radius, overflow: 'hidden', background: `radial-gradient(130% 125% at 28% 16%, ${from}, ${to} 82%)`, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.06), inset 0 -20px 34px rgba(0,0,0,.22)' }}>
      {src && <img src={src} alt={alt || ''} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(255,255,255,.10), rgba(255,255,255,0) 40%, rgba(0,0,0,.28))', pointerEvents: 'none' }} />
      {label && <span style={{ position: 'absolute', bottom: 6, left: 8, fontSize: 12, fontWeight: 900, color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,.7)' }}>{label}</span>}
    </div>
  );
}

/** Small 3D currency icon (kind = coins | gem | diamond) from public/ui/reward. */
export function RewardIcon({ kind = 'coins', size = 15, style, className }) {
  return <img src={`/ui/reward/${kind}.png`} alt="" width={size} height={size} className={`icon-pop${className ? ' ' + className : ''}`} style={{ objectFit: 'contain', verticalAlign: 'middle', flex: 'none', ...style }} />;
}

/* ---------------- shell: top bar + sidebar ------------------------------- */

// Badge counts come from the navBadges prop — things to attend to
// (unplayed free games, open missions/claims), not catalog sizes.
const NAV = [
  { label: 'Home', img: 'home', tab: 'home' },
  { label: 'Play', img: 'play', tab: 'play' },
  { label: 'Earn', img: 'earn', tab: 'earn' },
  { label: 'Store', img: 'store', tab: 'store' },
];

function Stat({ img, value, label, cls }) {
  return (
    <div className={cls} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
      <img src={`/ui/nav/${img}.png`} alt="" width={30} height={30} style={{ objectFit: 'contain', flex: 'none' }} />
      <div style={{ lineHeight: 1.1 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.text }}>{typeof value === 'number' ? <CountUp value={value} /> : value}</div>
        <div className="rs-statlabel" style={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>{label}</div>
      </div>
    </div>
  );
}

function TopBar({ points, missionsCount, badges, lvl, nextLvl, xpPct, onNavigate, onOpenProfile, userId }) {
  return (
    <div className="rs-topbar" style={{ display: 'flex', alignItems: 'center', gap: 26, padding: '14px 22px', background: C.bgTop, borderBottom: `1px solid ${C.line}`, boxShadow: '0 2px 10px rgba(0,0,0,.2)', flexShrink: 0 }}>
      <button onClick={() => (onOpenProfile ? onOpenProfile() : onNavigate && onNavigate('me.profile'))} title="Your profile" className="rs-profile" style={{ all: 'unset', display: 'flex', alignItems: 'center', gap: 12, width: 168, flex: 'none', cursor: 'pointer', borderRadius: 12, padding: 2 }}>
        <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'linear-gradient(135deg,#7fd7e8,#3a7d8c)', display: 'grid', placeItems: 'center', fontSize: 24, border: `2px solid ${C.teal}` }}>🧑‍🦰</div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.text, maxWidth: 116, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userId || 'Player'}</div>
          <span style={{ fontSize: 10, fontWeight: 700, color: C.text, background: C.panel2, padding: '2px 8px', borderRadius: 999 }}>{lvl.name}</span>
        </div>
      </button>
      <div className="rs-stats" style={{ display: 'flex', alignItems: 'center', gap: 26 }}>
        <Stat img="points" value={points} label="Points" cls="currency-coin-target currency-gem-target currency-diamond-target" />
        <Stat img="missions" value={missionsCount} label="Missions" />
        <Stat img="badges" value={badges} label="Badges" />
      </div>
      <div className="rs-level" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12, width: 300 }}>
        <div style={{ fontSize: 30 }}>{nextLvl ? nextLvl.icon : lvl.icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, color: C.sub, marginBottom: 6, fontWeight: 600 }}>Next level is, <b style={{ color: C.text }}>{nextLvl ? nextLvl.name : 'Max'}</b></div>
          <Progress value={xpPct} color="linear-gradient(90deg,#4fa98b,#8b5cf6)" height={8} />
        </div>
      </div>
    </div>
  );
}

function Sidebar({ active = 'home', onNavigate, navBadges = {} }) {
  return (
    <aside className="rs-sidebar" style={{ width: 200, flex: 'none', background: C.side, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 4, borderRight: `1px solid ${C.line}` }}>
      {NAV.map((it, i) => {
        const isActive = it.tab === active;
        const n = navBadges[it.tab];
        return (
          <button key={i} onClick={() => onNavigate && onNavigate(it.tab)} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', background: isActive ? C.green : 'transparent', color: isActive ? '#08210f' : C.sub, textAlign: 'left', width: '100%' }}>
            <span style={{ width: 30, height: 30, flex: 'none', display: 'grid', placeItems: 'center', borderRadius: 8, background: isActive ? 'rgba(6,24,14,.24)' : 'transparent' }}>
              <img src={`/ui/nav/${it.img}.png`} alt="" width={24} height={24} style={{ objectFit: 'contain' }} />
            </span>
            <span style={{ fontSize: 13.5, fontWeight: isActive ? 800 : 600, flex: 1 }}>{it.label}</span>
            {n != null && n > 0 && <span style={{ minWidth: 22, height: 20, padding: '0 6px', borderRadius: 999, fontSize: 11, fontWeight: 800, display: 'grid', placeItems: 'center', background: isActive ? 'rgba(8,33,15,.22)' : C.green, color: '#08210f', boxShadow: isActive ? 'none' : '0 2px 8px rgba(79,169,139,.4)' }}>{n}</span>}
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
function BottomNav({ active = 'home', onNavigate, navBadges = {} }) {
  return (
    <nav className="rs-bottomnav" style={{ display: 'none', position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50, background: C.bgTop, borderTop: `1px solid ${C.line}`, padding: '6px 6px calc(6px + env(safe-area-inset-bottom))', justifyContent: 'space-around', boxShadow: '0 -4px 14px rgba(0,0,0,.35)' }}>
      {NAV.map((it, i) => {
        const isActive = it.tab === active;
        const n = navBadges[it.tab];
        return (
          <button key={i} onClick={() => onNavigate && onNavigate(it.tab)} style={{ all: 'unset', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '6px 0', cursor: 'pointer', color: isActive ? C.green : C.muted }}>
            <span style={{ position: 'relative', display: 'inline-block' }}>
              <img src={`/ui/nav/${it.img}.png`} alt="" width={24} height={24} style={{ objectFit: 'contain', opacity: isActive ? 1 : 0.75, display: 'block' }} />
              {n != null && n > 0 && (
                <span style={{ position: 'absolute', top: -5, right: -9, minWidth: 16, height: 16, padding: '0 4px', borderRadius: 999, fontSize: 9.5, fontWeight: 800, display: 'grid', placeItems: 'center', background: C.green, color: '#08210f', boxShadow: '0 2px 6px rgba(0,0,0,.4)' }}>{n}</span>
              )}
            </span>
            <span style={{ fontSize: 10.5, fontWeight: isActive ? 800 : 600 }}>{it.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

export default function RedesignShell({
  points = '0', missionsCount = 0, badges = 0, xp = 0,
  activeTab = 'home', onNavigate, onOpenProfile, children,
  userId = null, navBadges = {},
}) {
  const lvl = getLevel(xp), nextLvl = getNextLevel(xp), xpPct = getXPProgress(xp);
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflowX: 'hidden', background: 'radial-gradient(130% 90% at 50% -10%, #1f2230, #171922 72%)', color: C.text, fontFamily: "var(--font-body, 'Onest', system-ui, sans-serif)", WebkitFontSmoothing: 'antialiased' }}>
      <style>{`
        @media (max-width: 860px) {
          .rs-sidebar { display: none !important; }
          .rs-bottomnav { display: flex !important; }
          .rs-topbar { flex-wrap: wrap !important; gap: 12px !important; padding: 10px 14px !important; }
          .rs-level { width: 100% !important; order: 5; margin-left: 0 !important; }
          .rs-stats { margin-left: auto !important; gap: 18px !important; }
          .rs-main { padding: 14px 14px calc(100px + env(safe-area-inset-bottom)) !important; }
          .rs-ov-grid { grid-template-columns: 1fr !important; gap: 18px !important; }
          .rs-ov-2 { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 520px) {
          .rs-profile { width: auto !important; }
          .rs-ov-3 { grid-template-columns: 1fr 1fr !important; }
          .rs-ov-2 { grid-template-columns: 1fr !important; }
          .rs-stats { gap: 12px !important; }
          .rs-stats .rs-statlabel { display: none; }
        }
      `}</style>
      <TopBar points={points} missionsCount={missionsCount} badges={badges} lvl={lvl} nextLvl={nextLvl} xpPct={xpPct} onNavigate={onNavigate} onOpenProfile={onOpenProfile} userId={userId} />
      <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'stretch' }}>
        <Sidebar active={activeTab} onNavigate={onNavigate} navBadges={navBadges} />
        <main className="rs-main" style={{ flex: 1, minWidth: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '20px 22px' }}>{children}</main>
      </div>
      <BottomNav active={activeTab} onNavigate={onNavigate} navBadges={navBadges} />
    </div>
  );
}
