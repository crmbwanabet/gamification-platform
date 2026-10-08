'use client';

import React from 'react';
import { C } from './tokens';
import NavIcon from './NavIcons';
import { getLevel, getNextLevel, getXPProgress, MINIGAMES, STORE_ITEMS } from '@/lib/data/platform';
import { GEMS, GEM_LABEL, gemCoins, gemKwacha, coinsToKwacha, economyRates, formatKwacha, formatNumber } from '@/lib/economy/currency.mjs';
import { amountText } from '@/lib/rewardText.mjs';

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

// Prize gems (2026-10-07): crisp SVGs in public/ui/gems. `emeralds` and
// `emerald` both resolve, so reward keys and singular names work alike.
const GEM_ICON = {
  emeralds: '/ui/gems/emerald.svg', emerald: '/ui/gems/emerald.svg',
  rubies: '/ui/gems/ruby.svg', ruby: '/ui/gems/ruby.svg',
  diamonds: '/ui/gems/diamond.svg', diamond: '/ui/gems/diamond.svg',
};
/** Text colour per currency (coins gold, emerald green, ruby red, diamond ice-blue). */
export const CURRENCY_COLOR = { kwacha: C.gold, coins: C.gold, emeralds: '#3ee6a0', rubies: '#ff6b81', diamonds: '#a9e2ff' };
const GEM_PLURAL = { emeralds: 'Emeralds', rubies: 'Rubies', diamonds: 'Diamonds' };

/** Currency icon: coins = 3D png from public/ui/reward; emeralds/rubies/diamonds = SVG gems. */
export function RewardIcon({ kind = 'coins', size = 15, style, className }) {
  const src = GEM_ICON[kind] || `/ui/reward/${kind}.png`;
  return <img src={src} alt="" width={size} height={size} className={`icon-pop${className ? ' ' + className : ''}`} style={{ objectFit: 'contain', verticalAlign: 'middle', flex: 'none', ...style }} />;
}

/**
 * A reward row ({ kwacha, emeralds, rubies, diamonds }) as icon + "{N} coins" /
 * "{N} emeralds" chips. Every reward surface (missions, level-ups, the
 * mission modal) renders through this, so each currency shows up everywhere.
 */
export function CurrencyAmounts({ r, size = 15, fontSize = 13, gap = 12, style }) {
  if (!r) return null;
  const rows = [['kwacha', 'coins'], ...GEMS.map(g => [g, g])].filter(([k]) => r[k]);
  if (!rows.length) return null;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', flexWrap: 'wrap', gap, fontSize, fontWeight: 800, ...style }}>
      {rows.map(([k, unit]) => (
        <span key={k} style={{ color: CURRENCY_COLOR[k], display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <RewardIcon kind={unit} size={size} />{amountText(r[k], unit)}
        </span>
      ))}
    </span>
  );
}

// Fly-to-header targets for the reward trail (triggerReward 'big').
const GEM_TARGET = { emeralds: 'currency-emerald-target', rubies: 'currency-ruby-target', diamonds: 'currency-diamond-target' };

/** Header balance: coins + the three gems. Tapping opens the wallet sheet. */
function WalletButton({ wallet, onOpen }) {
  const w = wallet || {};
  const label = `Wallet: ${amountText(w.kwacha || 0, 'coins')}, ${GEMS.map(g => amountText(w[g] || 0, g)).join(', ')}`;
  return (
    <button type="button" onClick={onOpen} className="rs-wallet" aria-label={label} title="Your wallet" style={{ all: 'unset', boxSizing: 'border-box', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, padding: '6px 12px', minHeight: 40, borderRadius: 12, background: 'rgba(0,0,0,.22)', border: '1px solid rgba(255,255,255,.08)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.05)', flex: 'none' }}>
      <span className="currency-coin-target" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <img src="/ui/nav/points.png" alt="" width={24} height={24} style={{ objectFit: 'contain', flex: 'none' }} />
        <span style={{ fontSize: 16, fontWeight: 800, color: C.text }}><CountUp value={w.kwacha || 0} format={formatNumber} /></span>
      </span>
      <span aria-hidden="true" style={{ width: 1, alignSelf: 'stretch', background: 'rgba(255,255,255,.1)' }} />
      {GEMS.map(g => (
        <span key={g} className={GEM_TARGET[g]} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <RewardIcon kind={g} size={19} />
          <span style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{formatNumber(w[g] || 0)}</span>
        </span>
      ))}
    </button>
  );
}

/** Wallet sheet: each balance and what it is worth in kwacha ("1 Emerald · worth K5"). */
export function WalletSheet({ open, onClose, wallet, onNavigate }) {
  if (!open) return null;
  const w = wallet || {};
  const eco = w.economy;
  const coins = w.kwacha || 0;
  const { coinsPerKwacha } = economyRates(eco);
  const rows = [
    { key: 'coins', icon: <img src="/ui/nav/points.png" alt="" width={34} height={34} style={{ objectFit: 'contain' }} />, title: amountText(coins, 'coins'), sub: `${amountText(coinsPerKwacha, 'coins')} = ${formatKwacha(1)}`, worth: coinsToKwacha(coins, eco), color: C.gold },
    ...GEMS.map(g => {
      const n = w[g] || 0;
      return { key: g, icon: <RewardIcon kind={g} size={34} />, title: `${formatNumber(n)} ${n === 1 ? GEM_LABEL[g] : GEM_PLURAL[g]}`, sub: `1 ${GEM_LABEL[g]} = ${amountText(gemCoins(g, eco), 'coins')} · won as prizes`, worth: gemKwacha(g, eco, n), color: CURRENCY_COLOR[g] };
    }),
  ];
  const total = rows.reduce((s, r) => s + r.worth, 0);
  return (
    <div onClick={onClose} role="dialog" aria-modal="true" aria-label="Your wallet" className="rs-wallet-sheet" style={{ position: 'fixed', inset: 0, zIndex: 130, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(8,10,16,.66)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)', fontFamily: "var(--font-body, 'Onest', system-ui, sans-serif)", animation: 'rs-ws-fade .16s ease-out' }}>
      <style>{`
        @keyframes rs-ws-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes rs-ws-up { from { transform: translateY(24px); opacity: 0 } to { transform: none; opacity: 1 } }
        @media (min-width: 640px) { .rs-wallet-sheet { align-items: center !important; } .rs-wallet-panel { border-radius: 18px !important; } }
        @media (prefers-reduced-motion: reduce) { .rs-wallet-sheet, .rs-wallet-panel { animation: none !important; } }
      `}</style>
      <div onClick={(e) => e.stopPropagation()} className="rs-wallet-panel" style={{ width: '100%', maxWidth: 440, maxHeight: '88vh', overflowY: 'auto', boxSizing: 'border-box', borderRadius: '18px 18px 0 0', background: `linear-gradient(180deg, ${C.bgTop}, ${C.bg})`, border: '1px solid rgba(255,255,255,.09)', boxShadow: '0 -10px 40px rgba(0,0,0,.5)', padding: '10px 16px calc(18px + env(safe-area-inset-bottom))', animation: 'rs-ws-up .22s cubic-bezier(.2,.8,.3,1)' }}>
        <div aria-hidden="true" style={{ width: 40, height: 4, borderRadius: 4, background: 'rgba(255,255,255,.18)', margin: '0 auto 12px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: C.text, fontFamily: "var(--font-display, 'Bricolage Grotesque', sans-serif)" }}>Your wallet</h2>
          <button type="button" onClick={onClose} aria-label="Close wallet" style={{ all: 'unset', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: C.sub, padding: '8px 4px' }}>Close</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map(r => (
            <div key={r.key} data-wallet-row={r.key} style={{ display: 'flex', alignItems: 'center', gap: 12, background: C.panel2, borderRadius: 12, padding: '10px 12px' }}>
              <span style={{ width: 38, height: 38, flex: 'none', display: 'grid', placeItems: 'center' }}>{r.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: r.color }}>{r.title} <span style={{ color: C.sub, fontWeight: 700 }}>· worth {formatKwacha(r.worth)}</span></div>
                <div style={{ fontSize: 11, color: C.muted, fontWeight: 600, marginTop: 2 }}>{r.sub}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '12px 2px 4px', fontSize: 13, color: C.sub, fontWeight: 700 }}>
          <span>Total value</span><span style={{ fontSize: 16, color: C.text, fontWeight: 900 }}>{formatKwacha(total)}</span>
        </div>
        <p style={{ margin: '6px 2px 12px', fontSize: 11.5, lineHeight: 1.45, color: C.muted }}>Gems are won as prizes only. Redeem coins and gems for kwacha in the Store, and our team credits it to your bwanabet account.</p>
        {onNavigate && <GreenBtn full onClick={() => { if (onClose) onClose(); onNavigate('store'); }}>Redeem in the Store</GreenBtn>}
      </div>
    </div>
  );
}

/* ---------------- shell: top bar + sidebar ------------------------------- */

// Badge counts come from the navBadges prop — things to attend to
// (unclaimed daily reward, open missions), not catalog sizes.
// Games live on Home (the Play tab was folded into it 2026-10).
const NAV = [
  { label: 'Home', icon: 'home', tab: 'home' },
  { label: 'Missions', icon: 'missions', tab: 'missions' },
  { label: 'Store', icon: 'store', tab: 'store' },
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

function TopBar({ points, missionsCount, badges, lvl, nextLvl, xpPct, onNavigate, onOpenProfile, userId, wallet, onOpenWallet }) {
  return (
    <div className="rs-topbar" style={{ display: 'flex', alignItems: 'center', gap: 26, padding: '14px 22px', background: C.bgTop, borderBottom: `1px solid ${C.line}`, boxShadow: '0 2px 10px rgba(0,0,0,.2)', flexShrink: 0 }}>
      <button onClick={() => (onOpenProfile ? onOpenProfile() : onNavigate && onNavigate('me.profile'))} title="Your profile" className="rs-profile" style={{ all: 'unset', display: 'flex', alignItems: 'center', gap: 12, width: 168, flex: 'none', cursor: 'pointer', borderRadius: 12, padding: 2 }}>
        <div style={{ width: 46, height: 46, flex: 'none', borderRadius: '50%', overflow: 'hidden', background: 'linear-gradient(135deg,#7fd7e8,#3a7d8c)', border: `2px solid ${C.teal}`, boxSizing: 'border-box' }}>
          <img src={lvl.avatar} alt={`Vuma at stage ${lvl.level}: ${lvl.name}`} width={46} height={46} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.text, maxWidth: 116, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{userId || 'Player'}</div>
          <span title={`Stage ${lvl.level}: ${lvl.name}`} style={{ display: 'inline-block', maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', verticalAlign: 'top', fontSize: 10, fontWeight: 700, color: C.text, background: C.panel2, padding: '2px 8px', borderRadius: 999 }}>{lvl.name}</span>
        </div>
      </button>
      <WalletButton wallet={wallet || { kwacha: typeof points === 'number' ? points : 0 }} onOpen={onOpenWallet} />
      <div className="rs-stats" style={{ display: 'flex', alignItems: 'center', gap: 26 }}>
        <Stat img="missions" value={missionsCount} label="Missions" />
        <Stat img="badges" value={badges} label="Badges" />
      </div>
      <div className="rs-level" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12, width: 300 }}>
        <img src={(nextLvl || lvl).avatar} alt="" width={34} height={34} style={{ width: 34, height: 34, flex: 'none', borderRadius: '50%', objectFit: 'cover', border: `1.5px solid ${C.line}`, opacity: nextLvl ? 0.85 : 1 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, color: C.sub, marginBottom: 6, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nextLvl ? <>Next stage: <b style={{ color: C.text }}>{nextLvl.name}</b></> : <b style={{ color: C.text }}>Final stage</b>}</div>
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
          <button key={i} aria-current={isActive ? 'page' : undefined} onClick={() => onNavigate && onNavigate(it.tab)} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', background: isActive ? C.green : 'transparent', color: isActive ? '#08210f' : C.sub, textAlign: 'left', width: '100%' }}>
            <span style={{ width: 30, height: 30, flex: 'none', display: 'grid', placeItems: 'center', borderRadius: 8, background: isActive ? 'rgba(6,24,14,.24)' : 'transparent' }}>
              <NavIcon name={it.icon} active={isActive} size={24} />
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
          <button key={i} aria-label={it.label} aria-current={isActive ? 'page' : undefined} onClick={() => onNavigate && onNavigate(it.tab)} style={{ all: 'unset', flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, padding: '6px 0', cursor: 'pointer', color: isActive ? C.green : C.muted }}>
            <span style={{ position: 'relative', display: 'inline-block' }}>
              <span style={{ display: 'grid', placeItems: 'center', width: 44, height: 30, borderRadius: 999, background: isActive ? 'rgba(79,169,139,.22)' : 'transparent', boxShadow: isActive ? 'inset 0 0 0 1px rgba(79,169,139,.45)' : 'none', transition: 'background .2s ease' }}>
                <NavIcon name={it.icon} active={isActive} size={isActive ? 26 : 24} />
              </span>
              {n != null && n > 0 && (
                <span style={{ position: 'absolute', top: -4, right: -2, minWidth: 16, height: 16, padding: '0 4px', borderRadius: 999, fontSize: 9.5, fontWeight: 800, display: 'grid', placeItems: 'center', background: C.green, color: '#08210f', boxShadow: '0 2px 6px rgba(0,0,0,.4)' }}>{n}</span>
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
  userId = null, navBadges = {}, wallet = null,
}) {
  const [walletOpen, setWalletOpen] = React.useState(false);
  const lvl = getLevel(xp), nextLvl = getNextLevel(xp), xpPct = getXPProgress(xp);
  // Collapse the tall mobile header once the user scrolls down (hysteresis so it
  // doesn't flicker around the threshold); CSS only applies below 860px.
  const [collapsed, setCollapsed] = React.useState(false);
  const onMainScroll = React.useCallback((e) => {
    const el = e.currentTarget;
    const t = el.scrollTop;
    // Collapsing hands ~63px of height back to the scroll area, which shrinks
    // its own scroll range — on short pages (store) that re-clamps scrollTop
    // below the expand threshold and the header oscillates, locking the last
    // row out of reach. Only collapse when the page scrolls well beyond what
    // the collapse itself gives back.
    const overflow = el.scrollHeight - el.clientHeight;
    setCollapsed((prev) => (t > 64 && overflow > 170 ? true : t < 16 ? false : prev));
  }, []);
  return (
    <div className={`rs-shell${collapsed ? ' rs-collapsed' : ''}`} style={{ display: 'flex', flexDirection: 'column', overflowX: 'hidden', background: 'radial-gradient(130% 90% at 50% -10%, #1f2230, #171922 72%)', color: C.text, fontFamily: "var(--font-body, 'Onest', system-ui, sans-serif)", WebkitFontSmoothing: 'antialiased' }}>
      <style>{`
        /* dvh tracks the *visible* viewport on iOS Safari — with 100vh the bottom
           of the layout hides behind the browser toolbar and the last row of
           content ends up under the fixed bottom nav. */
        .rs-shell { height: 100vh; height: 100dvh; }
        @media (max-width: 860px) {
          .rs-sidebar { display: none !important; }
          .rs-bottomnav { display: flex !important; }
          .rs-topbar { flex-wrap: wrap !important; gap: 12px !important; padding: 10px 14px !important; }
          .rs-level { width: 100% !important; order: 5; margin-left: 0 !important; }
          .rs-stats { margin-left: auto !important; gap: 18px !important; }
          .rs-main { padding: 14px 14px calc(100px + env(safe-area-inset-bottom)) !important; }
          .rs-topbar { transition: padding .28s ease, row-gap .28s ease; }
          .rs-level { overflow: hidden; max-height: 64px; transition: max-height .28s ease, opacity .2s ease; }
          .rs-collapsed .rs-topbar { padding: 7px 14px !important; row-gap: 0 !important; }
          .rs-collapsed .rs-level { max-height: 0; opacity: 0; }
          .rs-ov-grid { grid-template-columns: 1fr !important; gap: 18px !important; }
          .rs-ov-2 { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 520px) {
          .rs-profile { width: auto !important; }
          .rs-ov-3 { grid-template-columns: 1fr 1fr !important; }
          .rs-ov-2 { grid-template-columns: 1fr !important; }
          .rs-stats { gap: 12px !important; }
          .rs-stats .rs-statlabel { display: none; }
          .rs-wallet { order: 4 !important; flex: 1 1 100% !important; justify-content: space-between !important; }
        }
        @media (prefers-reduced-motion: reduce) {
          .rs-topbar, .rs-level { transition: none !important; }
        }
      `}</style>
      <TopBar points={points} missionsCount={missionsCount} badges={badges} lvl={lvl} nextLvl={nextLvl} xpPct={xpPct} onNavigate={onNavigate} onOpenProfile={onOpenProfile} userId={userId} wallet={wallet} onOpenWallet={() => setWalletOpen(true)} />
      <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'stretch' }}>
        <Sidebar active={activeTab} onNavigate={onNavigate} navBadges={navBadges} />
        <main className="rs-main" onScroll={onMainScroll} style={{ flex: 1, minWidth: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch', padding: '20px 22px' }}>{children}</main>
      </div>
      <BottomNav active={activeTab} onNavigate={onNavigate} navBadges={navBadges} />
      <WalletSheet open={walletOpen} onClose={() => setWalletOpen(false)} wallet={wallet} onNavigate={activeTab === 'store' ? null : onNavigate} />
    </div>
  );
}
