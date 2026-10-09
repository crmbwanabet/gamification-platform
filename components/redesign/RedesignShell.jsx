'use client';

import React from 'react';
import { X } from 'lucide-react';
import { C, CANDY, APP_BG, VIOLET_EDGE, VIOLET_BASE, goldTitle, violetCard, goldRim, dotRow } from './tokens';
import NavIcon from './NavIcons';
import StoryBubble, { STORY_CSS } from './StoryBubble';
import CandyButton, { CANDY_BTN_CSS } from '../games/candy/CandyButton';
import { getLevel, getNextLevel, getXPProgress } from '@/lib/data/platform';
import { GEMS, GEM_LABEL, gemCoins, gemKwacha, coinsToKwacha, economyRates, formatKwacha, formatNumber } from '@/lib/economy/currency.mjs';
import { amountText } from '@/lib/rewardText.mjs';

/* ---------------- shared UI primitives (used by all redesign views) ------- */
// 2026-10-09: candy reskin (design "A · Full candy") — the primitives carry
// the look, so every view that uses them follows.

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

export function Badge({ children, bg, color = CANDY.outline }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 900, letterSpacing: '.03em', textTransform: 'uppercase', padding: '3px 9px', borderRadius: 999, background: bg, color, fontFamily: CANDY.body }}>{children}</span>;
}

/** Candy gold bar (the default fill); pass `color` for green (done) / teal (in progress). */
export const GOLD_BAR = `linear-gradient(180deg, #FFE27A, ${CANDY.gold} 50%, ${CANDY.goldDeep})`;
export function Progress({ value, color = GOLD_BAR, height = 7 }) {
  const target = Math.max(0, Math.min(100, value || 0));
  const [w, setW] = React.useState(() => (prefersReduced() ? target : 0));
  React.useEffect(() => {
    if (prefersReduced()) { setW(target); return; }
    const id = requestAnimationFrame(() => setW(target));
    return () => cancelAnimationFrame(id);
  }, [target]);
  const thick = height >= 12;
  return (
    <div style={{ height, boxSizing: 'border-box', borderRadius: 99, background: C.track, border: thick ? `2px solid ${VIOLET_BASE}` : `1.5px solid ${CANDY.glow}`, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${w}%`, borderRadius: 99, background: color, transition: 'width 0.6s cubic-bezier(0.2, 0.8, 0.3, 1)' }} />
    </div>
  );
}

/** Raised candy button (green by default) in a compact size for cards and rows. */
export function GreenBtn({ children, full, onClick, disabled, color = 'green', size = 17, style }) {
  return (
    <CandyButton color={color} onClick={onClick} disabled={disabled}
      style={{ flexDirection: 'row', gap: 6, fontSize: size, minHeight: 44, borderRadius: 14, padding: '0 18px', width: full ? '100%' : undefined, whiteSpace: 'nowrap', ...style }}>
      {children}
    </CandyButton>
  );
}

/** Chunky gold outlined section title. */
export const SectionTitle = ({ children, right, size = 26, id }) => (
  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, margin: '0 2px 14px' }}>
    <h2 id={id} style={goldTitle(size)}>{children}</h2>
    {right}
  </div>
);

/** Muted right-hand note next to a section title. */
export const TitleNote = ({ children }) => <span style={{ fontSize: 12, fontWeight: 800, color: 'rgba(255,255,255,.62)', whiteSpace: 'nowrap' }}>{children}</span>;

export function Card({ children, style, className }) {
  return <div className={className} style={{ ...violetCard, ...style }}>{children}</div>;
}

export function Thumb({ src, alt, from = '#3a137a', to = '#140430', h = 92, radius = 12, label }) {
  return (
    <div className="rs-thumb" style={{ position: 'relative', height: h, borderRadius: radius, overflow: 'hidden', background: `radial-gradient(130% 125% at 28% 16%, ${from}, ${to} 82%)`, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.06)' }}>
      {src && <img src={src} alt={alt || ''} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}
      {label && <span style={{ position: 'absolute', bottom: 6, left: 8, fontSize: 12, fontWeight: 900, color: '#fff', textShadow: '0 2px 4px rgba(0,0,0,.7)' }}>{label}</span>}
    </div>
  );
}

/** Red round candy close button (same face as the games' X), 44px target. */
export function CloseX({ onClick, label = 'Close', style }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label}
      style={{ width: 44, height: 44, flex: 'none', border: 'none', background: 'transparent', padding: 0, display: 'grid', placeItems: 'center', cursor: 'pointer', ...style }}>
      <span style={{ width: 36, height: 36, borderRadius: '50%', display: 'grid', placeItems: 'center', color: '#fff', background: 'linear-gradient(180deg, #f0684f, #d43a22)', border: '2px solid rgba(255,255,255,.3)', boxShadow: '0 3px 0 #8f1d0e, 0 4px 10px rgba(212,58,34,.35)' }}>
        <X size={20} strokeWidth={3.25} />
      </span>
    </button>
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
    <span style={{ display: 'inline-flex', alignItems: 'center', flexWrap: 'wrap', gap, fontSize, fontWeight: 900, ...style }}>
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

/**
 * Header balance pill: coins + the three gems. Desktop shows every count;
 * phones show the coin count and a small cluster of the gem icons (each icon
 * stays a fly-to-header target). Tapping opens the wallet sheet.
 */
function WalletButton({ wallet, onOpen }) {
  const w = wallet || {};
  const label = `Wallet: ${amountText(w.kwacha || 0, 'coins')}, ${GEMS.map(g => amountText(w[g] || 0, g)).join(', ')}`;
  return (
    <button type="button" onClick={onOpen} className="rs-wallet" aria-label={label} title="Your wallet"
      style={{ display: 'flex', alignItems: 'center', gap: 8, height: 44, boxSizing: 'border-box', padding: '0 12px', marginBottom: 4, borderRadius: 14, border: `2px solid ${VIOLET_EDGE}`, background: C.track, color: '#fff', fontFamily: CANDY.display, fontSize: 17, boxShadow: `0 4px 0 ${VIOLET_BASE}`, cursor: 'pointer', flex: 'none' }}>
      <span className="currency-coin-target" style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
        <RewardIcon kind="coins" size={22} className="" />
        <CountUp value={w.kwacha || 0} format={formatNumber} style={{ fontVariantNumeric: 'tabular-nums' }} />
      </span>
      <span className="rs-gems" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        {GEMS.map(g => (
          <span key={g} className={`rs-gem ${GEM_TARGET[g]}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
            <RewardIcon kind={g} size={16} className="" />
            <span className="rs-gem-n" style={{ fontSize: 15 }}>{formatNumber(w[g] || 0)}</span>
          </span>
        ))}
      </span>
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
    { key: 'coins', icon: <RewardIcon kind="coins" size={34} />, title: amountText(coins, 'coins'), sub: `${amountText(coinsPerKwacha, 'coins')} = ${formatKwacha(1)}`, worth: coinsToKwacha(coins, eco), color: C.gold },
    ...GEMS.map(g => {
      const n = w[g] || 0;
      return { key: g, icon: <RewardIcon kind={g} size={34} />, title: `${formatNumber(n)} ${n === 1 ? GEM_LABEL[g] : GEM_PLURAL[g]}`, sub: `1 ${GEM_LABEL[g]} = ${amountText(gemCoins(g, eco), 'coins')} · won as prizes`, worth: gemKwacha(g, eco, n), color: CURRENCY_COLOR[g] };
    }),
  ];
  const total = rows.reduce((s, r) => s + r.worth, 0);
  return (
    <div onClick={onClose} role="dialog" aria-modal="true" aria-label="Your wallet" className="rs-wallet-sheet" style={{ position: 'fixed', inset: 0, zIndex: 130, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', background: 'rgba(8,4,20,.7)', backdropFilter: 'blur(5px)', WebkitBackdropFilter: 'blur(5px)', fontFamily: CANDY.body, color: '#fff', animation: 'rs-ws-fade .16s ease-out' }}>
      <style>{`
        @keyframes rs-ws-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes rs-ws-up { from { transform: translateY(24px); opacity: 0 } to { transform: none; opacity: 1 } }
        @media (min-width: 640px) { .rs-wallet-sheet { align-items: center !important; } .rs-wallet-panel { border-radius: 24px !important; } }
        @media (prefers-reduced-motion: reduce) { .rs-wallet-sheet, .rs-wallet-panel { animation: none !important; } }
      `}</style>
      <div onClick={(e) => e.stopPropagation()} className="rs-wallet-panel" style={{ ...goldRim, position: 'relative', width: '100%', maxWidth: 440, maxHeight: '88vh', overflowY: 'auto', boxSizing: 'border-box', borderRadius: '24px 24px 0 0', padding: '12px 16px calc(18px + env(safe-area-inset-bottom))', animation: 'rs-ws-up .22s cubic-bezier(.2,.8,.3,1)' }}>
        <span aria-hidden style={{ ...dotRow(false), top: 1, left: 22, right: 22, height: 8 }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '6px 0 12px' }}>
          <h2 style={goldTitle(26)}>Your wallet</h2>
          <CloseX onClick={onClose} label="Close wallet" />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {rows.map(r => (
            <div key={r.key} data-wallet-row={r.key} style={{ display: 'flex', alignItems: 'center', gap: 12, background: `linear-gradient(180deg, ${C.panelHi}, ${C.panelLo})`, border: `2px solid ${VIOLET_BASE}`, borderRadius: 14, padding: '10px 12px' }}>
              <span style={{ width: 38, height: 38, flex: 'none', display: 'grid', placeItems: 'center' }}>{r.icon}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 900, color: r.color }}>{r.title} <span style={{ color: C.sub, fontWeight: 800 }}>· worth {formatKwacha(r.worth)}</span></div>
                <div style={{ fontSize: 11.5, color: C.muted, marginTop: 2 }}>{r.sub}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '14px 2px 4px', fontSize: 13, color: C.sub }}>
          <span>Total value</span><span style={{ fontFamily: CANDY.display, fontSize: 22, color: C.gold }}>{formatKwacha(total)}</span>
        </div>
        <p style={{ margin: '6px 2px 14px', fontSize: 12, lineHeight: 1.45, color: C.muted }}>Gems are won as prizes only. Redeem coins and gems for kwacha in the Store, and our team credits it to your bwanabet account.</p>
        {onNavigate && <GreenBtn full size={20} onClick={() => { if (onClose) onClose(); onNavigate('store'); }}>Redeem in the Store</GreenBtn>}
      </div>
    </div>
  );
}

/* ---------------- shell: header + nav ------------------------------------ */

// Badge counts come from the navBadges prop — things to attend to
// (unclaimed daily reward, open missions), not catalog sizes.
// Games live on Home (the Play tab was folded into it 2026-10).
const NAV = [
  { label: 'Home', icon: 'home', tab: 'home' },
  { label: 'Missions', icon: 'missions', tab: 'missions' },
  { label: 'Store', icon: 'store', tab: 'store' },
];

const NavBadge = ({ n }) => (n != null && n > 0 ? (
  <span aria-label={`${n} to attend to`} style={{ position: 'absolute', top: 2, right: 8, minWidth: 18, height: 18, padding: '0 4px', boxSizing: 'border-box', borderRadius: 999, fontFamily: CANDY.body, fontSize: 10.5, fontWeight: 900, display: 'grid', placeItems: 'center', background: CANDY.green.fill, color: '#fff', border: `2px solid ${C.track}`, lineHeight: 1 }}>{n}</span>
) : null);

/** Tabs: raised violet candy button when active. `place` = 'top' (desktop header) | 'bottom' (phone nav). */
function NavTabs({ active, onNavigate, navBadges = {}, place }) {
  return NAV.map((it) => {
    const isActive = it.tab === active;
    return (
      <button key={it.tab} type="button" aria-current={isActive ? 'page' : undefined} onClick={() => onNavigate && onNavigate(it.tab)}
        className={`rs-tab rs-tab-${place}${isActive ? ' rs-tab-on' : ''}`}>
        <NavIcon name={it.icon} size={place === 'top' ? 22 : 24} />
        <span>{it.label}</span>
        <NavBadge n={navBadges[it.tab]} />
      </button>
    );
  });
}

function TopBar({ lvl, nextLvl, xpPct, activeTab, onNavigate, onOpenProfile, userId, wallet, onOpenWallet, navBadges, story, onStoryOpen, onStoryClose }) {
  const stageTitle = `Stage ${lvl.level}: ${lvl.name}${nextLvl ? ` · next: ${nextLvl.name}` : ' · final stage'}`;
  return (
    <header className="rs-topbar">
      <div className="rs-who-wrap" style={{ position: 'relative', zIndex: 2 }}>
        <button type="button" onClick={() => (onOpenProfile ? onOpenProfile() : onNavigate && onNavigate('me.profile'))} title="Your profile" aria-label={`Your profile: Vuma Katongo, ${stageTitle}`} className="rs-profile">
          <span className="rs-ava" style={{ borderRadius: '50%', padding: 3, boxSizing: 'border-box', background: 'linear-gradient(180deg, #FFE27A, #E0A300)', boxShadow: '0 3px 0 #8a5a00', flex: 'none', display: 'block' }}>
            <img src={lvl.avatar} alt="" width={50} height={50} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
          </span>
          <span className="rs-who" style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, textAlign: 'left' }}>
            <span className="rs-name" style={{ fontFamily: CANDY.display, lineHeight: 1.05, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Vuma Katongo</span>
            {userId && <span title={`Your bwanabet user ID: ${userId}`} style={{ fontSize: 11.5, color: 'rgba(255,255,255,.62)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>ID {userId}</span>}
            <span title={stageTitle} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <span style={{ fontSize: 10.5, fontWeight: 900, color: CANDY.outline, background: CANDY.gold, borderRadius: 999, padding: '2px 8px', whiteSpace: 'nowrap', flex: 'none' }}>STAGE {lvl.level}</span>
              <span style={{ flex: 1, minWidth: 36 }}><Progress value={xpPct} height={7} color="linear-gradient(90deg, #FFE27A, #FFD21F)" /></span>
            </span>
          </span>
        </button>
        <StoryBubble mode={story} onOpen={onStoryOpen} onClose={onStoryClose} />
      </div>
      <nav className="rs-topnav" aria-label="Main">
        <NavTabs active={activeTab} onNavigate={onNavigate} navBadges={navBadges} place="top" />
      </nav>
      <WalletButton wallet={wallet} onOpen={onOpenWallet} />
    </header>
  );
}

const SHELL_CSS = `
  /* dvh tracks the *visible* viewport on iOS Safari — with 100vh the bottom
     of the layout hides behind the browser toolbar and the last row of
     content ends up under the fixed bottom nav. */
  .rs-shell { height: 100vh; height: 100dvh; }
  .rs-topbar {
    position: relative; z-index: 60; flex-shrink: 0; display: flex; align-items: center; gap: 10px;
    padding: 12px 14px 10px; background: linear-gradient(180deg, #24094A, ${CANDY.bgBottom});
    border-bottom: 2.5px solid ${CANDY.gold}; box-shadow: 0 2px 0 ${CANDY.goldDeep}, 0 8px 20px rgba(0,0,0,.4);
  }
  .rs-widget .rs-topbar { padding-right: 62px; }
  .rs-who-wrap { flex: 1; min-width: 0; }
  .rs-profile { all: unset; box-sizing: border-box; cursor: pointer; display: flex; align-items: center; gap: 10px; width: 100%; min-height: 44px; border-radius: 14px; -webkit-tap-highlight-color: transparent; }
  .rs-profile:focus-visible, .rs-wallet:focus-visible, .rs-tab:focus-visible { outline: 3px solid ${CANDY.gold}; outline-offset: 3px; }
  .rs-ava { width: 50px; height: 50px; }
  .rs-who { flex: 1; }
  .rs-name { font-size: 17px; }
  .rs-topnav { display: none; }
  /* phones: gem icons overlap in a small cluster (counts live in the wallet sheet) */
  .rs-wallet { gap: 6px !important; padding: 0 10px !important; font-size: 16px !important; }
  .rs-gem-n { display: none; }
  .rs-gems { gap: 0 !important; }
  .rs-gem + .rs-gem { margin-left: -7px; }
  .rs-tab {
    all: unset; box-sizing: border-box; position: relative; cursor: pointer; display: flex; align-items: center; justify-content: center;
    color: rgba(255,255,255,.72); font-family: ${CANDY.display}; letter-spacing: .3px; -webkit-tap-highlight-color: transparent;
    border: 2.5px solid transparent; border-radius: 16px; transition: transform .08s ease-out;
  }
  .rs-tab-on { color: #fff; background: linear-gradient(180deg, ${CANDY.violet.light}, ${CANDY.violet.fill} 45%); border-color: ${CANDY.violet.light}; box-shadow: 0 5px 0 ${CANDY.violet.dark}; text-shadow: 0 2px 0 rgba(0,0,0,.25); }
  .rs-tab:active { transform: translateY(3px); }
  .rs-tab-bottom { flex-direction: column; gap: 2px; width: 96px; min-height: 56px; font-size: 14px; }
  .rs-tab-top { gap: 8px; height: 46px; padding: 0 20px; font-size: 17px; }
  .rs-bottomnav {
    position: fixed; bottom: 0; left: 0; right: 0; z-index: 50; display: flex; align-items: center; justify-content: space-around;
    padding: 9px 14px calc(12px + env(safe-area-inset-bottom)); background: linear-gradient(180deg, #24094A, ${C.track});
    border-top: 2.5px solid ${CANDY.gold}; box-shadow: 0 -2px 0 ${CANDY.goldDeep}, 0 -6px 16px rgba(0,0,0,.35);
  }
  .rs-main { flex: 1; min-width: 0; overflow-y: auto; -webkit-overflow-scrolling: touch; padding: 18px 14px calc(110px + env(safe-area-inset-bottom)); }
  @media (min-width: 861px) {
    .rs-topbar { height: 82px; box-sizing: border-box; gap: 16px; padding: 0 28px; }
    .rs-widget .rs-topbar { padding-right: 76px; }
    .rs-who-wrap { flex: none; width: 320px; }
    .rs-ava { width: 54px; height: 54px; }
    .rs-name { font-size: 20px; }
    .rs-topnav { display: flex; flex: 1; justify-content: center; gap: 10px; }
    .rs-bottomnav { display: none; }
    .rs-gem-n { display: inline; }
    .rs-gems { gap: 8px !important; }
    .rs-gem + .rs-gem { margin-left: 0; }
    .rs-wallet { height: 46px !important; gap: 8px !important; padding: 0 16px !important; font-size: 18px !important; }
    .rs-main { padding: 28px; }
  }
  @media (prefers-reduced-motion: reduce) { .rs-tab { transition: none; } }
`;

/**
 * Full shell: violet candy background + gold-edged header (Vuma, wallet, and on
 * desktop the tabs) + the phone bottom nav, with the view's content in <main>.
 * Prop-driven so every screen shares one shell.
 */
export default function RedesignShell({
  xp = 0, activeTab = 'home', onNavigate, onOpenProfile, children,
  userId = null, navBadges = {}, wallet = null, isWidget = false,
  story = null, onStoryOpen, onStoryClose,
}) {
  const [walletOpen, setWalletOpen] = React.useState(false);
  const lvl = getLevel(xp), nextLvl = getNextLevel(xp), xpPct = getXPProgress(xp);
  return (
    <div className={`rs-shell${isWidget ? ' rs-widget' : ''}`} style={{ display: 'flex', flexDirection: 'column', overflowX: 'hidden', background: APP_BG, color: C.text, fontFamily: CANDY.body, WebkitFontSmoothing: 'antialiased' }}>
      <style dangerouslySetInnerHTML={{ __html: SHELL_CSS + CANDY_BTN_CSS + STORY_CSS }} />
      <TopBar lvl={lvl} nextLvl={nextLvl} xpPct={xpPct} activeTab={activeTab} onNavigate={onNavigate} onOpenProfile={onOpenProfile}
        userId={userId} wallet={wallet || { kwacha: 0 }} onOpenWallet={() => setWalletOpen(true)} navBadges={navBadges}
        story={walletOpen ? null : story} onStoryOpen={onStoryOpen} onStoryClose={onStoryClose} />
      <main className="rs-main">{children}</main>
      <nav className="rs-bottomnav" aria-label="Main">
        <NavTabs active={activeTab} onNavigate={onNavigate} navBadges={navBadges} place="bottom" />
      </nav>
      <WalletSheet open={walletOpen} onClose={() => setWalletOpen(false)} wallet={wallet} onNavigate={activeTab === 'store' ? null : onNavigate} />
    </div>
  );
}
