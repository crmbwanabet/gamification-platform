// Lucky Minibus — the 6 passengers at the bus stop. The bigger the multiplier,
// the harder the passenger is to win over; win chance per passenger = rtp × stake / payout
// (lib/pick6). Pure data, no React.
// x / y = the passenger's feet in the scene's SVG coordinates (viewBox 300×306);
// dir 1 = facing right as drawn, -1 = facing left. bag = the luggage the call boy
// grabs (art in components/games/minibus/kit.js). tag = multiplier tag colours
// (c = fill, l = highlight, d = shadow).
// Layout fix over the approved mock: the passengers are spread a little wider and
// the tourist / office worker swap places, so the tourist's tall tag no longer
// covers the rival bus's "SHARP SHARP!" and the 4x scramble isn't squeezed
// against the rival call boys.

const TAG = {
  1.2: { c: '#3CC21A', l: '#8BEA5C', d: '#1F7A0A' },
  1.5: { c: '#A5DE1E', l: '#D6F77A', d: '#5F8F08' },
  2:   { c: '#FFC21F', l: '#FFE27A', d: '#B88400' },
  2.5: { c: '#FF8A1A', l: '#FFC078', d: '#B85A00' },
  3:   { c: '#FF5A1F', l: '#FF9C74', d: '#B8340A' },
  4:   { c: '#FF2E63', l: '#FF8FA8', d: '#B0103A' },
};

export const PASSENGERS = [
  { id: 'granny', mult: 1.2, name: 'Grandmother', x: 272, y: 236, dir: -1, bag: 'sack' },     // mealie-meal sack
  { id: 'lady', mult: 1.5, name: 'Market lady', x: 228, y: 296, dir: 1, bag: 'basin' },      // tomato basin on her head
  { id: 'schoolboy', mult: 2, name: 'Schoolboy', x: 136, y: 294, dir: 1, bag: 'pack' },
  { id: 'office', mult: 2.5, name: 'Office worker', x: 92, y: 236, dir: -1, bag: 'brief' },
  { id: 'headphones', mult: 3, name: 'Headphones guy', x: 44, y: 296, dir: 1, bag: 'duffel' },
  { id: 'tourist', mult: 4, name: 'Tourist', x: 182, y: 238, dir: 1, bag: 'suit' },
].map(p => ({ ...p, tag: TAG[p.mult] }));

export const PASSENGER_IDS = PASSENGERS.map(p => p.id);
