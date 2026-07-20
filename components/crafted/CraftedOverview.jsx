'use client';

import React from 'react';
import NineSliceFrame from './NineSliceFrame';
import CurrencyTile from './CurrencyTile';
import CraftedButton from './CraftedButton';
import CraftedCardFrame from './CraftedCardFrame';
import VipShield from './VipShield';
import { PALETTE } from './tokens';

// Full crafted overview screen, assembled from the asset-based component system.
// Frames are 9-slice SVGs from /public/ui/frames; icons from /public/ui/icons.
// Pass real data via props (all have demo defaults so it renders standalone).

const PANEL = 'radial-gradient(130% 110% at 50% 0%, #241e40, #100c1d 78%)';

function Card({ title, children, gridRow }) {
  return (
    <NineSliceFrame
      src="/ui/frames/frame-gold.svg"
      slice={22}
      border={15}
      style={{ borderRadius: 14, background: PANEL, padding: 14, display: 'flex', flexDirection: 'column', gridRow }}
    >
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 19, marginBottom: 8, color: PALETTE.txt }}>{title}</div>
      {children}
    </NineSliceFrame>
  );
}

function Corners() {
  const base = {
    position: 'absolute', width: 104, height: 104, zIndex: 7, pointerEvents: 'none',
    backgroundImage: "url('/ui/frames/corner-gold.svg')", backgroundSize: 'contain', backgroundRepeat: 'no-repeat',
    filter: 'drop-shadow(0 2px 3px rgba(0,0,0,.55))',
  };
  return (
    <>
      <span style={{ ...base, top: -8, left: -8 }} />
      <span style={{ ...base, top: -8, right: -8, transform: 'scaleX(-1)' }} />
      <span style={{ ...base, bottom: -8, left: -8, transform: 'scaleY(-1)' }} />
      <span style={{ ...base, bottom: -8, right: -8, transform: 'scale(-1,-1)' }} />
    </>
  );
}

function Rosette() {
  return (
    <div
      style={{
        width: 42, height: 42, flex: 'none', borderRadius: '50%', display: 'grid', placeItems: 'center', position: 'relative',
        background: 'linear-gradient(160deg,#fff0c2,#caa12e 50%,#9a6c12)',
        boxShadow: '0 2px 5px rgba(0,0,0,.55), inset 0 1px 1px rgba(255,255,255,.8), 0 0 0 2px #7a5408',
      }}
    >
      <div style={{ position: 'absolute', inset: 5, borderRadius: '50%', border: '1.5px dashed rgba(122,84,8,.55)' }} />
      <b style={{ fontFamily: 'var(--font-display)', fontSize: 10, color: '#3a2606', position: 'relative' }}>NEW</b>
    </div>
  );
}

function MissionRow({ label, progress }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
      <Rosette />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
        <span style={{ fontSize: 12, color: PALETTE.txtDim, fontWeight: 600 }}>{label}</span>
        <div style={{ height: 11, borderRadius: 7, background: '#140d22', boxShadow: 'inset 0 1px 3px rgba(0,0,0,.8)', padding: 2 }}>
          <div style={{ height: '100%', width: `${Math.max(0, Math.min(100, progress))}%`, borderRadius: 5, background: 'linear-gradient(180deg,#ffb4ff,#d030d0 50%,#8a1d8a)', boxShadow: '0 0 8px rgba(208,48,208,.6)' }} />
        </div>
      </div>
    </div>
  );
}

const heroStyle = { flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: 8 };

const DEFAULT_MISSIONS = [
  { label: 'Daily / Weekly', progress: 72 },
  { label: 'Daily / Weekly', progress: 48 },
  { label: 'Daily / Weekly', progress: 90 },
];

export default function CraftedOverview({
  name = 'Player',
  subtitle = 'VIP Tier 7',
  vipLabel = 'VIP',
  vipTier = 'Tier 7',
  coins = '1,356',
  gems = '830',
  diamonds = 'VIP',
  xp = '81,770',
  energy = '12',
  levelLeft = 'Tier 7 → 8',
  levelRight = '1,581 / 2,000',
  xpPercent = 62,
  missions = DEFAULT_MISSIONS,
  jackpot = '€ 12,480',
  storeLine = 'Scratch & Love · 25% off',
  onNavigate,
} = {}) {
  return (
    <div
      style={{
        '--font-mono': "'JetBrains Mono', monospace",
        fontFamily: "'Onest', system-ui, sans-serif",
        display: 'flex',
        justifyContent: 'center',
        width: '100%',
        minWidth: 0,
      }}
    >
      <style>{`
        .co-frame, .co-frame * { box-sizing: border-box; }
        @media (max-width: 820px) {
          .co-frame { aspect-ratio: auto !important; padding: 18px 14px 18px !important; gap: 14px !important; min-width: 0 !important; }
          .co-rail { gap: 8px !important; }
          .co-topbar { flex-wrap: wrap !important; }
          .co-topbar > * { min-width: 0 !important; }
          .co-xp { flex: 1 1 100% !important; order: 5; margin-left: 0 !important; }
          .co-rail { flex-wrap: wrap !important; }
          .co-rail > * { flex: 1 1 28% !important; min-width: 0 !important; }
          .co-grid { grid-template-columns: minmax(0, 1fr) !important; grid-template-rows: auto !important; }
          .co-grid > * { grid-row: auto !important; min-width: 0 !important; min-height: 132px; }
        }
        @media (max-width: 440px) {
          .co-rail > * { flex: 1 1 44% !important; }
        }
      `}</style>
      <div
        className="co-frame"
        style={{
          position: 'relative', width: 'min(1120px, 100%)', aspectRatio: '1120 / 770', borderRadius: 18,
          background: 'linear-gradient(165deg,#171127,#0c0a18 60%,#120b20)',
          boxShadow: '0 50px 90px -25px rgba(0,0,0,.85), 0 0 0 1px rgba(0,0,0,.6), inset 0 0 0 2px #c9a23e, inset 0 0 0 3.5px #5e3f06, inset 0 0 60px rgba(0,0,0,.6), inset 0 -50px 110px rgba(208,48,208,.1)',
          padding: '30px 30px 26px', display: 'flex', flexDirection: 'column', gap: 18,
        }}
      >
        <Corners />
        <div style={{ position: 'absolute', top: -30, left: '50%', transform: 'translateX(-50%)', zIndex: 9 }}>
          <VipShield tier={vipTier} label={vipLabel} />
        </div>

        {/* Top bar */}
        <div className="co-topbar" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <NineSliceFrame
            src="/ui/frames/frame-gold.svg" slice={22} border={9}
            style={{ width: 60, height: 60, flex: 'none', borderRadius: 13, background: 'linear-gradient(160deg,#3a2f63,#180f2e)', display: 'grid', placeItems: 'center', color: '#8a7fc0' }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12a5 5 0 100-10 5 5 0 000 10zm0 2c-5 0-9 2.5-9 6v2h18v-2c0-3.5-4-6-9-6z" /></svg>
          </NineSliceFrame>

          <div>
            <b style={{ fontFamily: 'var(--font-display)', fontSize: 20, display: 'block', lineHeight: 1, color: PALETTE.txt }}>{name}</b>
            <span style={{ fontSize: 12, color: PALETTE.txtDim, fontWeight: 600 }}>{subtitle}</span>
          </div>

          <div className="co-xp" style={{ flex: '0 0 250px', marginLeft: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: 'var(--font-mono)', fontSize: 11, color: PALETTE.txtDim }}>
              <span>{levelLeft}</span>
              <span>{levelRight}</span>
            </div>
            <div style={{ height: 16, borderRadius: 10, background: 'linear-gradient(180deg,#fff0c2,#a9760f)', padding: 3, boxShadow: '0 2px 3px rgba(0,0,0,.5), inset 0 1px 1px rgba(255,255,255,.4)' }}>
              <div style={{ height: '100%', borderRadius: 7, background: '#140d22', boxShadow: 'inset 0 2px 5px rgba(0,0,0,.9)', padding: 2 }}>
                <div style={{ height: '100%', width: `${Math.max(0, Math.min(100, xpPercent))}%`, borderRadius: 5, background: 'linear-gradient(180deg,#ffb4ff,#d030d0 45%,#8a1d8a)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,.6), 0 0 12px rgba(208,48,208,.7)' }} />
              </div>
            </div>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 19, color: PALETTE.txt }}>{energy}</span>
            <div style={{ width: 46, height: 46, display: 'grid', placeItems: 'center', transform: 'rotate(45deg)', borderRadius: 12, background: 'linear-gradient(160deg,#ffe9ad,#a9760f)', boxShadow: '0 3px 6px rgba(0,0,0,.5), inset 0 2px 1px rgba(255,255,255,.6)' }}>
              <img src="/ui/icons/bolt.png" width="22" height="22" alt="energy" style={{ transform: 'rotate(-45deg)' }} />
            </div>
          </div>
        </div>

        {/* Currency rail */}
        <div className="co-rail" style={{ display: 'flex', gap: 12 }}>
          <CurrencyTile color="gold" icon="coin" iconExt="png" label={coins} />
          <CurrencyTile color="magenta" icon="gem" iconExt="png" label={gems} />
          <CurrencyTile color="cyan" icon="diamond" iconExt="png" label={diamonds} />
          <CurrencyTile color="violet" icon="bolt" iconExt="png" label={xp} />
          <CurrencyTile color="green" icon="flag" iconExt="png" label={String(missions.length)} />
        </div>

        {/* Card grid */}
        <div className="co-grid" style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.1fr 1.5fr 1.5fr', gridTemplateRows: '1fr 1fr', gap: 15 }}>
          <CraftedCardFrame color="gold" title="Missions" style={{ gridRow: '1 / 3' }}>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 15, flex: 1, height: '100%' }}>
              {missions.slice(0, 3).map((m, i) => (
                <MissionRow key={i} label={m.label} progress={m.progress} />
              ))}
            </div>
          </CraftedCardFrame>

          <CraftedCardFrame color="magenta" glow title="Premium Store"
            panel="radial-gradient(120% 120% at 50% 0%, #6e1d6e, #2a0d2a 82%)">
            <div style={{ ...heroStyle, height: '100%' }}>
              <img src="/ui/art/giftbox.png" alt="store" style={{ width: 92, height: 92, objectFit: 'contain', filter: 'drop-shadow(0 4px 6px rgba(0,0,0,.55)) drop-shadow(0 0 14px rgba(208,48,208,.5))' }} />
              <div style={{ color: '#f3d0f3', fontSize: 12, fontWeight: 700 }}>{storeLine}</div>
            </div>
          </CraftedCardFrame>

          <CraftedCardFrame color="blue" title="Jackpot" onClose={() => onNavigate && onNavigate('jackpot')}
            panel="radial-gradient(120% 130% at 50% -10%, #29408f, #0c1130 80%)">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, height: '100%' }}>
              <img src="/ui/art/wheel.png" alt="jackpot wheel" style={{ width: 104, height: 104, objectFit: 'contain', flex: 'none', filter: 'drop-shadow(0 4px 7px rgba(0,0,0,.6))' }} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 25, color: '#ffe79a', textShadow: '0 2px 5px rgba(0,0,0,.6)' }}>{jackpot}</div>
                <div style={{ color: '#aac0ff', fontSize: 12, fontWeight: 700 }}>Personal Jackpot</div>
              </div>
            </div>
          </CraftedCardFrame>

          <CraftedButton variant="magenta" onClick={() => onNavigate && onNavigate('jackpot')}>JACKPOT</CraftedButton>
          <CraftedButton variant="cyan" onClick={() => onNavigate && onNavigate('vip')}>VIP</CraftedButton>
        </div>
      </div>
    </div>
  );
}
