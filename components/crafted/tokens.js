// Shared design tokens for the crafted (asset-based) UI system.
// Palette mirrors the gamification platform: dark indigo-plum + gold, cyan reserved for Diamonds/VIP.

export const PALETTE = {
  bg0: '#080612',
  panel: '#1a1730',
  panel2: '#242040',
  gold: '#f5c542',
  goldHi: '#ffe79a',
  goldLo: '#a9760f',
  magenta: '#d030d0',
  cyan: '#22d3ee',
  violet: '#a855f7',
  green: '#46e08a',
  txt: '#f6f2ff',
  txtDim: '#b3a9d6',
};

// Color-matched outer glows for icons (drop-shadow values).
export const GLOW = {
  gold: 'rgba(245,197,66,.5)',
  magenta: 'rgba(208,48,208,.55)',
  cyan: 'rgba(34,211,238,.55)',
  violet: 'rgba(168,85,247,.55)',
  green: 'rgba(70,224,138,.5)',
};

// Maps a currency "color" to its frame asset filename (in /public/ui/frames).
export const FRAME_BY_COLOR = {
  gold: 'frame-gold',
  magenta: 'frame-magenta',
  cyan: 'frame-cyan',
  violet: 'frame-violet',
  green: 'frame-green',
};
