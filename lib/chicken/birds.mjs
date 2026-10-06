// Chicken Catch — the 6 birds in the yard. Risk rises with speed and attitude;
// win chance per bird = 0.95 / mult (lib/pick6). Pure data, no React.
// x / y = the bird's feet in the scene's SVG coordinates (viewBox 300×306);
// dir 1 = facing left as drawn, -1 = facing right.
// Art: rx/ry body radii, leg/neck lengths, hr head radius (all ×1.12 in the
// scene), c/l/d body fill/light/dark, wing, belly, comb, eye, tail, tc tail
// colours; speckle/sheen/hackle/halo are per-bird extras. tag = multiplier tag
// colours (c = fill, l = highlight, d = shadow).

const TAG = {
  1.2: { c: '#3CC21A', l: '#8BEA5C', d: '#1F7A0A' },
  1.5: { c: '#A5DE1E', l: '#D6F77A', d: '#5F8F08' },
  2:   { c: '#FFC21F', l: '#FFE27A', d: '#B88400' },
  2.5: { c: '#FF8A1A', l: '#FFC078', d: '#B85A00' },
  3:   { c: '#FF5A1F', l: '#FF9C74', d: '#B8340A' },
  4:   { c: '#FF2E63', l: '#FF8FA8', d: '#B0103A' },
};

export const BIRDS = [
  { id: 'brown', mult: 1.2, name: 'Fat brown hen', x: 106, y: 290, dir: 1, rx: 22.5, ry: 18, leg: 5.5, neck: 2, hr: 9.4, c: '#BA6A30', l: '#E39A55', d: '#7C3B15', wing: '#9A4C1D', belly: '#EDB884', comb: 'small', eye: 'sleepy', tail: 'hen', tc: ['#7C3B15', '#A8561F', '#8A4418'] },
  { id: 'white', mult: 1.5, name: 'Plump white hen', x: 128, y: 224, dir: -1, rx: 19.5, ry: 15.5, leg: 7, neck: 3.5, hr: 9, c: '#FFF8EF', l: '#FFFFFF', d: '#D6C3E4', wing: '#EEE2F3', belly: '#FFFFFF', comb: 'big', eye: 'cute', tail: 'hen', tc: ['#E2D2EC', '#FFFFFF', '#EADCF0'] },
  { id: 'speckled', mult: 2, name: 'Speckled hen', x: 186, y: 293, dir: 1, rx: 18, ry: 14.5, leg: 8, neck: 4.5, hr: 8.6, c: '#6C7DB0', l: '#A3B3DC', d: '#434F80', wing: '#55639A', belly: '#AAB8DE', speckle: true, comb: 'small', eye: 'cute', tail: 'hen', tc: ['#434F80', '#6C7DB0', '#4C5990'] },
  { id: 'red', mult: 2.5, name: 'Lanky red hen', x: 206, y: 226, dir: 1, rx: 15, ry: 11.5, leg: 14.5, neck: 10, hr: 8, c: '#D9461F', l: '#F77A4C', d: '#93290F', wing: '#AE3414', belly: '#F79C6C', comb: 'small', eye: 'cute', tail: 'hen', tc: ['#93290F', '#C23A17', '#A8300F'] },
  // halo: a light rim so the dark hen reads on the shaded ground
  { id: 'black', mult: 3, name: 'Small black hen', x: 262, y: 287, dir: 1, rx: 13.5, ry: 11, leg: 8, neck: 3.5, hr: 7.6, c: '#2F2850', l: '#4E4680', d: '#17122C', wing: '#221C3E', belly: '#433A6E', sheen: true, halo: '#E4D8FF', comb: 'small', eye: 'sharp', tail: 'hen', tc: ['#1C5E5C', '#2F2850', '#4B2A70'] },
  { id: 'rooster', mult: 4, name: 'Proud rooster', x: 272, y: 216, dir: -1, rx: 13.5, ry: 12.5, leg: 15, neck: 11, hr: 8, c: '#E0521C', l: '#FF8C4C', d: '#8E2A0E', wing: '#7A2410', belly: '#B93A12', hackle: true, comb: 'rooster', eye: 'proud', tail: 'sickle' },
].map(b => ({ ...b, tag: TAG[b.mult] }));

export const BIRD_IDS = BIRDS.map(b => b.id);
