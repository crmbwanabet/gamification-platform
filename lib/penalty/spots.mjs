// Penalty Crash — the 6 target spots over the goal mouth (2 rows × 3 columns).
// Risk rises toward the corners; win chance per spot = rtp × stake / payout (lib/pick6).
// x / y are the spot centres in the scene's SVG coordinates (viewBox 300×306).
// Colours: c = disc, l = ring highlight, d = ring shadow.

export const SPOTS = [
  { id: 'TL', row: 0, col: 0, mult: 4,   label: 'Top left',      x: 72,  y: 78,  c: '#FF2E63', l: '#FF8FA8', d: '#B0103A' },
  { id: 'TC', row: 0, col: 1, mult: 1.5, label: 'Top centre',    x: 150, y: 78,  c: '#A5DE1E', l: '#D6F77A', d: '#5F8F08' },
  { id: 'TR', row: 0, col: 2, mult: 3,   label: 'Top right',     x: 228, y: 78,  c: '#FF5A1F', l: '#FF9C74', d: '#B8340A' },
  { id: 'BL', row: 1, col: 0, mult: 2.5, label: 'Bottom left',   x: 72,  y: 166, c: '#FF8A1A', l: '#FFC078', d: '#B85A00' },
  { id: 'BC', row: 1, col: 1, mult: 1.2, label: 'Bottom centre', x: 150, y: 166, c: '#3CC21A', l: '#8BEA5C', d: '#1F7A0A' },
  { id: 'BR', row: 1, col: 2, mult: 2,   label: 'Bottom right',  x: 228, y: 166, c: '#FFC21F', l: '#FFE27A', d: '#B88400' },
];

export const SPOT_IDS = SPOTS.map(s => s.id);
