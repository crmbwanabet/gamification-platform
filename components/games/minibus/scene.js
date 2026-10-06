// Lucky Minibus — the bus stop, ported verbatim from the approved mock as SVG
// markup strings: sunny sky with slow rays, Mwape Store and Blessed Salon, a
// jacaranda and an umbrella stall, the road with the rival (white) and your
// (blue) minibus, the curb and the petal-strewn pavement; the cast layers; the
// effect pools (dust, skid, exhaust, honk, bubbles, confetti, sparkles, +payout)
// and the front overlay. Street.jsx renders them; motion.js animates them.
// Fix over the mock: the rival's "SHARP SHARP!" moves back along its body
// (sx 116 → 122) so the call boys and tags no longer hide it.

import { O, GOLD, f1, D2R, rng, star4, clamp, sw, GROUND, BS, DL, DR, BUS, pfx } from './kit';
import { CB, RIV, PASDEF, ALL, BOYS, personSVG, bagSVG } from './cast';

const BODY_OUT = 'M6 -12 L3.6 -36 Q4 -41.5 7.8 -44 L17 -66.4 Q18.8 -72 24.5 -72 L143.5 -72 Q149.5 -72 149.8 -66 L150 -16 Q150 -12 146 -12 L134.5 -12 A12.5 12.5 0 0 0 109.5 -12 L42.5 -12 A12.5 12.5 0 0 0 17.5 -12 Z';
const DOOR_HOLE = `M${DL} -16 V-63.5 Q${DL} -66.5 ${DL + 3} -66.5 H${DR - 3} Q${DR} -66.5 ${DR} -63.5 V-16 Z`;
function busSVG(k) {
  const Y = k === 'y', X = BUS[k].x;
  const c = Y
    ? { body: 'url(#gBlue)', flat: '#3A86F0', skirt: '#1C4FB8', stripe: '#FFFFFF', pin: GOLD, txt: GOLD, slo: ['NO HURRY', 'IN AFRICA'], sx: 116 }
    : { body: 'url(#gWhite)', flat: '#F4F1FF', skirt: '#E3261E', stripe: '#E3261E', pin: '#FFB21F', txt: '#E3261E', slo: ['SHARP', 'SHARP!'], sx: 122 };
  const T = `translate(${X} ${GROUND}) scale(${BS})`;
  const wheel = (cx, i) => `<g transform="translate(${cx} -10.5)"><circle r="10.5" fill="#2B2440" ${sw(2)}/><circle r="10.5" fill="none" stroke="#4A4470" stroke-width="1.6" stroke-dasharray="3 3"/>
    <circle r="6.2" fill="#D6DAF0" ${sw(1.4)}/><g id="wh${k}${i}">${[0, 72, 144, 216, 288].map(a => `<circle cx="${f1(Math.cos(a * D2R) * 3.6)}" cy="${f1(Math.sin(a * D2R) * 3.6)}" r=".95" fill="#6A6E98"/>`).join('')}<path d="M0 -5.6 V-2.4" stroke="#8A90B8" stroke-width="1.2"/></g><circle r="1.8" fill="#8A90B8" ${sw(1)}/>
    <path d="M-4 -3.8 A5.6 5.6 0 0 1 2 -5.4" stroke="#fff" stroke-width="1.3" fill="none" opacity=".8" stroke-linecap="round"/></g>`;
  const glare = (x, y, h) => `<path d="M${x} ${y + h} L${x + h * .55} ${y} M${x + 4} ${y + h} L${x + 4 + h * .4} ${y + h * .3}" stroke="#fff" stroke-width="2" opacity=".55" stroke-linecap="round"/>`;
  const rack = Y
    ? `<path d="M36 -79.4 Q35 -88 46 -88.6 Q58 -89 60 -80 Z" fill="#F7F3EA" ${sw(1.8)}/><path d="M37 -84 Q48 -82.6 59.6 -84.4" stroke="#E3261E" stroke-width="2.4" fill="none"/>
       <rect x="64" y="-90.6" width="30" height="11.6" rx="2.6" fill="url(#checkB)" ${sw(1.8)}/><path d="M70 -90.6 Q79 -95 88 -90.6" stroke="${O}" stroke-width="1.6" fill="none"/>
       <rect x="100" y="-88" width="22" height="9" rx="1" fill="#C98A4E" ${sw(1.6)}/><path d="M100 -84.6 H122 M106 -88 V-79 M116 -88 V-79" stroke="#8A5A2E" stroke-width="1.1"/>
       <g transform="translate(111 -88)"><ellipse cx="0" cy="-2.6" rx="5" ry="3.6" fill="#BA6A30" ${sw(1.4)}/><circle cx="-4.2" cy="-6" r="2.6" fill="#BA6A30" ${sw(1.3)}/><path d="M-4.4 -8.4 l.6 -2 l1 1.6 l.8 -1.6" fill="#FF3B45" stroke="${O}" stroke-width=".8"/><path d="M-6.6 -5.8 l-1.8 .6 l1.8 .7" fill="#FFB21F" stroke="${O}" stroke-width=".7"/><circle cx="-4.6" cy="-6.4" r=".6" fill="${O}"/></g>`
    : `<rect x="40" y="-89" width="26" height="10" rx="5" fill="#1E63E6" ${sw(1.8)}/><path d="M44 -84 H62" stroke="#8EC1FF" stroke-width="1.3"/>
       <path d="M74 -79.4 L72 -90 Q86 -93 100 -90 L98 -79.4Z" fill="#F7F3EA" ${sw(1.8)}/><path d="M73 -86 Q86 -88 99.4 -86" stroke="#2FA35A" stroke-width="2.2" fill="none"/>
       <rect x="108" y="-87.6" width="26" height="8.6" rx="2" fill="url(#checkR)" ${sw(1.6)}/>`;
  return `
  <ellipse cx="${f1(X + 76 * BS)}" cy="${GROUND + 1}" rx="${f1(82 * BS)}" ry="5" fill="${O}" opacity=".3"/>
  <g class="shake" style="animation-delay:${Y ? '0s' : '-.09s'}">
    <g transform="${T}">
      <circle cx="30" cy="-12" r="12.6" fill="#1A0838"/><circle cx="122" cy="-12" r="12.6" fill="#1A0838"/>
      <path d="M${DL - 1} -67.5 H${DR + 1} V-15 H${DL - 1}Z" fill="#2E1252"/>
      <path d="M${DL - 1} -67.5 H${DR + 1} V-58 H${DL - 1}Z" fill="#1B0736"/>
      <rect x="${DL + 3}" y="-63" width="28" height="11.5" rx="2" fill="#8ED8FF" opacity=".35"/>
      <path d="M64 -45 Q64 -49 68 -49 H80 V-27 H64Z" fill="#C2283A" ${sw(1.4)}/><path d="M66.4 -46 Q66.6 -40 66.4 -30" stroke="#FF7A86" stroke-width="1.4" opacity=".8" fill="none"/>
      <rect x="54.6" y="-29.4" width="27.6" height="5.2" rx="2" fill="#E0414F" ${sw(1.3)}/>
      <path d="M57.4 -66 V-29.6" stroke="#C9CDE6" stroke-width="1.9"/>
      <path d="M${DL - 1} -20.6 H${DR + 1} V-15 H${DL - 1}Z" fill="#9AA0C8" ${sw(1.3)}/><path d="M${DL + 3} -18.6 H${DR - 3}" stroke="#6A6E98" stroke-width="1" stroke-dasharray="2 1.6"/>
    </g>
    <clipPath id="ic${k}"><rect x="${f1(X + (DL - 1) * BS)}" y="${f1(GROUND - 67 * BS)}" width="${f1((DR - DL + 2) * BS)}" height="${f1(54 * BS)}"/></clipPath>
    <g id="in${k}" clip-path="url(#ic${k})"></g>
    <g transform="${T}">
      <g id="door${k}" transform="translate(34 0)">
        <path d="M${DL} -66.5 H${DR} V-16 H${DL}Z" fill="${c.flat}" ${sw(1.8)}/>
        <rect x="${DL}" y="-22" width="${DR - DL}" height="6" fill="${c.skirt}"/>
        <rect x="${DL}" y="-48.5" width="${DR - DL}" height="4" fill="${c.stripe}"/><rect x="${DL}" y="-43.6" width="${DR - DL}" height="1.3" fill="${c.pin}"/>
        <rect x="${DL + 3}" y="-64.5" width="28" height="14.5" rx="2.2" fill="url(#gGlass)" ${sw(1.6)}/>
        ${Y ? `<clipPath id="wclip"><rect x="${DL + 3}" y="-64.5" width="28" height="14.5" rx="2.2"/></clipPath><g clip-path="url(#wclip)"><g id="winFace" opacity="0"><use id="winUse" href="#p4HI"/></g></g><rect x="${DL + 3}" y="-64.5" width="28" height="14.5" rx="2.2" fill="#BFEFFF" opacity=".18"/><rect x="${DL + 3}" y="-64.5" width="28" height="14.5" rx="2.2" fill="none" ${sw(1.6)}/>` : ''}
        ${glare(DL + 7, -63, 10)}
        <rect x="${DL + 3.4}" y="-38.4" width="6.4" height="2" rx="1" fill="#C9CDE6" ${sw(1)}/>
        <path d="M${DL} -66.5 H${DR} V-16 H${DL}Z" fill="none" ${sw(1.8)}/>
      </g>
      <clipPath id="bc${k}"><path d="${BODY_OUT} ${DOOR_HOLE}" clip-rule="evenodd"/></clipPath>
      <path d="${BODY_OUT} ${DOOR_HOLE}" fill="${c.body}" fill-rule="evenodd"/>
      <g clip-path="url(#bc${k})">
        <rect x="0" y="-22" width="152" height="12" fill="${c.skirt}"/>
        <rect x="0" y="-48.5" width="152" height="4" fill="${c.stripe}"/><rect x="0" y="-43.6" width="152" height="1.3" fill="${c.pin}"/>
        <rect x="0" y="-72" width="152" height="3.6" fill="#fff" opacity=".35"/>
        <rect x="141" y="-72" width="12" height="62" fill="${O}" opacity=".13"/>
        <path d="M0 -44 L8 -44 L4 -12 L0 -12Z" fill="${O}" opacity=".12"/>
        ${Y ? '' : `<path d="M0 -36 H152 V-34.4 H0Z" fill="#FFB21F" opacity=".0"/>`}
      </g>
      <path d="M8.6 -44 L17.6 -65.6 Q18.8 -68.4 21.6 -68 L13.8 -44Z" fill="url(#gGlass)" ${sw(1.6)}/>
      <path d="M19.4 -50 L25.6 -64.8 Q26.4 -66.4 28.2 -66.4 H43.6 V-50Z" fill="url(#gGlass)" ${sw(1.6)}/>${glare(28, -64.6, 11)}
      <rect x="86" y="-66" width="27" height="16" rx="2.6" fill="url(#gGlass)" ${sw(1.6)}/>${glare(90, -64.4, 12)}
      <path d="M116.6 -66 H141 Q146 -66 146 -61 V-50 H116.6Z" fill="url(#gGlass)" ${sw(1.6)}/>${glare(121, -64.4, 12)}
      <path d="M84 -49.6 H146" stroke="${O}" stroke-width="1.2" opacity=".5"/>
      <path d="M15 -44 V-16 M45.4 -50 V-16" stroke="${O}" stroke-width="1.4" opacity=".7"/>
      <rect x="37" y="-38.6" width="6" height="2" rx="1" fill="#C9CDE6" ${sw(1)}/>
      <path d="M13.4 -50 L6.4 -53.6" stroke="${O}" stroke-width="2.6" stroke-linecap="round"/>
      <rect x="1.6" y="-60.6" width="5.6" height="9" rx="2" fill="${c.flat}" ${sw(1.6)}/><rect x="2.8" y="-59.2" width="3.2" height="6.2" rx="1.2" fill="#8ED8FF"/>
      <path d="M3.8 -34 L7 -34.6 L7.2 -27.4 L4.2 -27Z" fill="#FFF6C0" ${sw(1.3)}/><path d="M4.4 -25.6 L7.2 -26 L7.3 -23 L4.6 -22.8Z" fill="#FF9A1A" ${sw(1)}/>
      <rect x="-1.4" y="-17.6" width="21" height="5.6" rx="2.6" fill="#C9CDE6" ${sw(1.6)}/><rect x="137" y="-17.6" width="15.4" height="5.6" rx="2.6" fill="#C9CDE6" ${sw(1.6)}/>
      <rect x="146.6" y="-41" width="4" height="10.6" rx="1.4" fill="#FF3B45" ${sw(1.2)}/>
      <circle cx="136" cy="-30" r="2.3" fill="${c.flat}" ${sw(1.1)}/>
      <g font-family="Lilita One" font-size="11" text-anchor="middle" fill="${c.txt}" stroke="${O}" stroke-width="${Y ? 3.2 : 2.4}" stroke-linejoin="round" paint-order="stroke" letter-spacing=".3">
        <text x="${c.sx}" y="-34.4">${c.slo[0]}</text><text x="${c.sx}" y="-25.6">${c.slo[1]}</text>
      </g>
      <path d="M28 -72 V-79 M58 -72 V-79 M92 -72 V-79 M126 -72 V-79" stroke="${O}" stroke-width="2.2"/>
      <rect x="24" y="-80.8" width="122" height="2.8" rx="1.4" fill="#C9CDE6" ${sw(1.4)}/>
      ${rack}
      ${wheel(30, 0)}${wheel(122, 1)}
      <path d="${BODY_OUT} ${DOOR_HOLE}" fill="none" ${sw(2.4)}/>
      <g transform="translate(150 -15)">${[0, 1, 2].map(i => `<g class="exh" style="animation-delay:${-i * .7}s;--ex:${Y ? '6px' : '9px'}"><circle cx="0" cy="0" r="3.6" fill="#E8E4F6" stroke="#8A84AA" stroke-width="1"/><circle cx="3" cy="1" r="2.6" fill="#F6F4FF" stroke="#8A84AA" stroke-width="1"/></g>`).join('')}</g>
    </g>
  </g>`;
}

const r0 = rng(9);
let rays = '';
for (let k = 0; k < 16; k++) rays += `<path d="M0 0 L-8 -300 L8 -300Z" transform="rotate(${k * 22.5})"/>`;
// jacaranda canopy
const CAN = [[96, 30, 21], [124, 14, 25], [152, 28, 21], [80, 50, 15], [108, 46, 20], [140, 48, 19], [168, 44, 14], [124, -12, 18], [98, 4, 16], [152, 0, 18], [124, 40, 18]];
const bloom = (() => { let s = ''; for (let k = 0; k < 70; k++) { const a = r0() * Math.PI * 2, rr = Math.sqrt(r0()); const c = CAN[k % CAN.length]; const x = c[0] + Math.cos(a) * c[2] * .85 * rr, y = c[1] + Math.sin(a) * c[2] * .85 * rr; s += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(1.4 + r0() * 1.4)}" fill="${['#C4A2FF', '#E2CCFF', '#A97BF5'][k % 3]}"/>`; } return s; })();
const canopy = CAN.map(([x, y, rr]) => `<circle cx="${x}" cy="${y}" r="${rr + 2.2}" fill="${O}"/>`).join('') +
  CAN.map(([x, y, rr]) => `<circle cx="${x}" cy="${y}" r="${rr}" fill="#6A3FC8"/>`).join('') +
  CAN.map(([x, y, rr]) => `<circle cx="${f1(x + rr * .2)}" cy="${f1(y - rr * .24)}" r="${f1(rr * .74)}" fill="#8A5AE6"/>`).join('') +
  CAN.map(([x, y, rr]) => `<path d="M${f1(x + rr * .2)} ${f1(y - rr * .92)} A${rr} ${rr} 0 0 1 ${f1(x + rr * .95)} ${f1(y - rr * .1)}" stroke="#D9C2FF" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".8"/>`).join('') + bloom;
// pavement texture + fallen jacaranda petals
let speck = '';
for (let k = 0; k < 80; k++) {
  const x = -30 + r0() * 360, y = 182 + Math.pow(r0(), .9) * 124;
  speck += r0() < .5
    ? `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(.8 + r0() * 1.6)}" ry="${f1(.5 + r0() * .7)}" fill="#B0602E" opacity=".4"/>`
    : `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1(.5 + r0() * .8)}" fill="#FFE0B0" opacity=".6"/>`;
}
let petals = '';
for (let k = 0; k < 46; k++) {
  const x = -20 + r0() * 340, y = 180 + Math.pow(r0(), 1.3) * 126, a = r0() * 180;
  petals += `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(1.6 + r0())}" ry="${f1(1 + r0() * .5)}" fill="${['#A97BF5', '#C4A2FF', '#8A5AE6'][k % 3]}" transform="rotate(${f1(a)} ${f1(x)} ${f1(y)})" opacity=".9"/>`;
}
let falling = '';
[[100, 40, 0], [140, 30, -3], [170, 50, -6], [86, 60, -1.5], [126, 56, -4.5], [156, 20, -7.5]].forEach(([x, y, dl]) => {
  falling += `<g transform="translate(${x} ${y})"><g class="pf" style="animation-delay:${dl}s"><ellipse rx="2" ry="1.2" fill="#C4A2FF" stroke="${O}" stroke-width=".6"/></g></g>`;
});
const tuft = (x, y, s = 1, flip = 1) => `<g transform="translate(${x} ${y}) scale(${s * flip} ${s})">
  <path d="M-9 0 Q-9 -8 -13 -13 Q-5 -9 -4 -2 Q-3 -13 0 -17 Q2 -9 2 -2 Q5 -12 10 -14 Q6 -7 7 0Z" fill="#5E9E2A" stroke="${O}" stroke-width="1.8" stroke-linejoin="round"/>
  <path d="M-3.5 -3 Q-2.8 -10 0 -14 M3 -3 Q5 -9 8 -11.5" stroke="#9AD84A" stroke-width="1.2" fill="none" stroke-linecap="round"/></g>`;
let curb = '';
for (let x = -40, k = 0; x < 340; x += 14, k++) curb += `<rect x="${x}" y="174.6" width="14" height="5.6" fill="${k % 2 ? '#F4F1FF' : '#3A2A5A'}"/>`;
let dashes = '';
for (let x = -30; x < 330; x += 26) dashes += `<rect x="${x}" y="137.6" width="14" height="2.4" rx="1" fill="#FFE27A" opacity=".85"/>`;
// salon menu heads
const menuHead = (x, y, hair) => `<g transform="translate(${x} ${y})"><circle r="5" fill="#8A5232" ${sw(1.2)}/>${hair}<circle cx="1.6" cy="-.4" r=".7" fill="${O}"/><path d="M.6 2 Q2 3 3.2 1.8" stroke="${O}" stroke-width=".8" fill="none"/></g>`;

// FX pools
export const N_DUST = 8;
const puffSVG = (id, s = 1) => `<g id="${id}" opacity="0"><circle cx="0" cy="0" r="${4 * s}" fill="#FFE2C2" stroke="#B0703A" stroke-width="1"/><circle cx="${-4.2 * s}" cy="${1.6 * s}" r="${3 * s}" fill="#FAD0A8" stroke="#B0703A" stroke-width="1"/><circle cx="${4 * s}" cy="${1.4 * s}" r="${3.2 * s}" fill="#FFF0DC" stroke="#B0703A" stroke-width="1"/></g>`;
const smokeSVG = id => `<g id="${id}" opacity="0"><circle r="4.6" fill="#E8E4F6" stroke="#8A84AA" stroke-width="1"/><circle cx="3.6" cy="1.4" r="3.4" fill="#F6F4FF" stroke="#8A84AA" stroke-width="1"/></g>`;
export const SPARK = [[-26, -16, 7], [26, -22, 6], [-32, 8, 5], [32, 4, 7], [0, -34, 5.5]];
const rcf = rng(42);
export const CONFP = Array.from({ length: 30 }, (_, i) => { const a = (-165 + rcf() * 150) * D2R, sp = 90 + rcf() * 150;
  return { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, w: 2.6 + rcf() * 2.4, h: 5 + rcf() * 4, spin: (rcf() - .5) * 1400, c: ['#FFD21F', '#FF4FA0', '#A6F03A', '#7BE3FF', '#FFFFFF', '#FF8A1A'][i % 6], round: i % 5 === 0 }; });
const confSVG = CONFP.map((p, i) => p.round ? `<circle id="cf${i}" r="${f1(p.w / 1.4)}" fill="${p.c}"/>` : `<rect id="cf${i}" x="${f1(-p.w / 2)}" y="${f1(-p.h / 2)}" width="${f1(p.w)}" height="${f1(p.h)}" rx=".8" fill="${p.c}"/>`).join('');
const sparkSVG = SPARK.map((s, k) => `<path id="sp${k}" d="${star4(s[2])}" fill="#FFF3B0" stroke="${GOLD}" stroke-width=".8" opacity="0"/>`).join('');


// speech bubbles: origin = tail tip
export const BUBS = { town: ['Town! Town!', 10.5, 14], kamwala: ['Kamwala!', 10.5, -14], matero: ['Matero!', 10.5, -10], tiyende: ['Tiyende!', 11, -18], eish: ['Eish!', 11, 13], ah: ['Aah!', 10.5, -10] };
export const BUBW = {};
function bubbleSVG(key, cls, d) {
  const [txt, fs, ox] = BUBS[key], w = Math.round(txt.length * fs * .52 + 13), h = Math.round(fs + 9);
  BUBW[key] = w;
  const L = ox - w / 2, R = ox + w / 2, bx = clamp(0, L + 9, R - 9);
  return `<g id="bub_${key}" opacity="0"><g class="${cls}" style="--d:${d || '0s'}">
    <path d="M${L + 6} ${-h - 5} H${R - 6} Q${R} ${-h - 5} ${R} ${-h + 1} V-11 Q${R} -5 ${R - 6} -5 H${bx + 5} L0 1 L${bx - 3} -5 H${L + 6} Q${L} -5 ${L} -11 V${-h + 1} Q${L} ${-h - 5} ${L + 6} ${-h - 5}Z" fill="#fff" stroke="${O}" stroke-width="2" stroke-linejoin="round"/>
    <text x="${ox}" y="${f1(-5 - h / 2 + fs * .36)}" text-anchor="middle" font-family="Lilita One" font-size="${fs}" fill="${O}" letter-spacing=".2">${txt}</text>
  </g></g>`;
}
function burstSVG(id, txt, fs, fill, col) {
  let p = ''; const n = 14, R1 = txt.length * fs * .36 + 9, R2 = R1 - 6, ry = .62;
  for (let k = 0; k < n * 2; k++) { const a = k / (n * 2) * Math.PI * 2, rr = k % 2 ? R2 : R1; p += `${k ? 'L' : 'M'}${f1(Math.cos(a) * rr)} ${f1(Math.sin(a) * rr * ry)} `; }
  return `<g id="${id}" opacity="0"><path d="${p}Z" fill="${fill}" stroke="${O}" stroke-width="2" stroke-linejoin="round"/><text y="${f1(fs * .36)}" text-anchor="middle" font-family="Lilita One" font-size="${fs}" fill="${col}" stroke="${O}" stroke-width="2.6" paint-order="stroke" stroke-linejoin="round">${txt}</text></g>`;
}

const tagDefs = PASDEF.map((d, i) => `<linearGradient id="tagG${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${d.t.l}"/><stop offset=".5" stop-color="${d.t.c}"/><stop offset="1" stop-color="${d.t.d}"/></linearGradient>`).join('');


export const DEFS = pfx(`
  <linearGradient id="skyG" gradientUnits="userSpaceOnUse" x1="0" y1="-220" x2="0" y2="100">
    <stop offset="0" stop-color="#2E7DE8"/><stop offset=".45" stop-color="#47A6F7"/><stop offset=".75" stop-color="#8ED4FF"/><stop offset="1" stop-color="#FFF0C2"/>
  </linearGradient>
  <radialGradient id="sunG"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".55" stop-color="#FFF6C0"/><stop offset="1" stop-color="#FFD24A"/></radialGradient>
  <radialGradient id="sunGlow"><stop offset="0" stop-color="#FFF6CC" stop-opacity=".95"/><stop offset=".3" stop-color="#FFE9A0" stop-opacity=".45"/><stop offset="1" stop-color="#FFE9A0" stop-opacity="0"/></radialGradient>
  <radialGradient id="sunWash" gradientUnits="userSpaceOnUse" cx="262" cy="0" r="330"><stop offset="0" stop-color="#FFE7A0" stop-opacity=".34"/><stop offset=".55" stop-color="#FFC870" stop-opacity=".08"/><stop offset="1" stop-color="#FFC870" stop-opacity="0"/></radialGradient>
  <linearGradient id="roadG" gradientUnits="userSpaceOnUse" x1="0" y1="118" x2="0" y2="176"><stop offset="0" stop-color="#6E6596"/><stop offset="1" stop-color="#4E4676"/></linearGradient>
  <linearGradient id="paveG" gradientUnits="userSpaceOnUse" x1="0" y1="180" x2="0" y2="310"><stop offset="0" stop-color="#F7C98E"/><stop offset=".5" stop-color="#EDB070"/><stop offset="1" stop-color="#DB9152"/></linearGradient>
  <linearGradient id="gBlue" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7AB8FF"/><stop offset=".35" stop-color="#3A86F0"/><stop offset="1" stop-color="#2468DA"/></linearGradient>
  <linearGradient id="gWhite" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".5" stop-color="#F1EEFF"/><stop offset="1" stop-color="#DAD3F2"/></linearGradient>
  <linearGradient id="gGlass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#D2F4FF"/><stop offset=".45" stop-color="#6CC0F2"/><stop offset="1" stop-color="#4A62C8"/></linearGradient>
  <linearGradient id="gBasin" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#9AA6D8"/><stop offset=".4" stop-color="#EEF2FF"/><stop offset="1" stop-color="#B6C0E8"/></linearGradient>
  <linearGradient id="goldRing" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF3B0"/><stop offset=".5" stop-color="${GOLD}"/><stop offset="1" stop-color="#E0A300"/></linearGradient>
  <radialGradient id="vig" cx=".5" cy=".5" r=".5" gradientTransform="translate(0 .04) scale(1 .92)"><stop offset=".64" stop-color="#2A0A4F" stop-opacity="0"/><stop offset="1" stop-color="#2A0A4F" stop-opacity=".45"/></radialGradient>
  <pattern id="chitA" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(8)">
    <rect width="10" height="10" fill="#FF8A1A"/><path d="M5 1 L9 5 L5 9 L1 5Z" fill="#7B3FE4"/><circle cx="5" cy="5" r="1.6" fill="${GOLD}"/>
    <circle cx="0" cy="0" r="1.3" fill="#19B39A"/><circle cx="10" cy="0" r="1.3" fill="#19B39A"/><circle cx="0" cy="10" r="1.3" fill="#19B39A"/><circle cx="10" cy="10" r="1.3" fill="#19B39A"/>
  </pattern>
  <pattern id="chitB" width="9" height="9" patternUnits="userSpaceOnUse">
    <rect width="9" height="9" fill="#2FA35A"/><circle cx="4.5" cy="4.5" r="3" fill="${GOLD}"/><circle cx="4.5" cy="4.5" r="1.5" fill="#E3261E"/><path d="M0 0 L2.2 0 L0 2.2Z M9 9 L6.8 9 L9 6.8Z M9 0 L6.8 0 L9 2.2Z M0 9 L2.2 9 L0 6.8Z" fill="#7B3FE4"/>
  </pattern>
  <pattern id="scarf" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#7B3FE4"/><circle cx="3" cy="3" r="1.2" fill="${GOLD}"/><circle cx="0" cy="0" r=".8" fill="#FF7AA8"/><circle cx="6" cy="6" r=".8" fill="#FF7AA8"/></pattern>
  <pattern id="hawaii" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(-10)">
    <rect width="12" height="12" fill="#22C3D6"/>
    ${[0, 72, 144, 216, 288].map(a => `<ellipse cx="${f1(4 + Math.cos(a * D2R) * 1.8)}" cy="${f1(4 + Math.sin(a * D2R) * 1.8)}" rx="1.6" ry="1.1" fill="#FF6FB0" transform="rotate(${a} ${f1(4 + Math.cos(a * D2R) * 1.8)} ${f1(4 + Math.sin(a * D2R) * 1.8)})"/>`).join('')}
    <circle cx="4" cy="4" r=".9" fill="${GOLD}"/><path d="M8 9 Q10 7 12 9 Q10 11 8 9Z" fill="#1F8A48"/>
  </pattern>
  <pattern id="stripeR" width="6" height="4.6" patternUnits="userSpaceOnUse"><rect width="6" height="4.6" fill="#F4F1FF"/><rect y="2.8" width="6" height="1.8" fill="#E3261E"/></pattern>
  <pattern id="checkB" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#F4F1FF"/><rect width="3" height="6" fill="#1E63E6" opacity=".7"/><rect width="6" height="3" fill="#E3261E" opacity=".55"/></pattern>
  <pattern id="checkR" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#F4F1FF"/><rect width="3" height="6" fill="#2FA35A" opacity=".7"/><rect width="6" height="3" fill="#7B3FE4" opacity=".5"/></pattern>
  ${tagDefs}
`);
export const BACK = pfx(`<!-- sky -->
<rect x="-80" y="-300" width="460" height="420" fill="url(#skyG)"/>
<g transform="translate(262 2)" fill="#FFFBE0" opacity=".16"><g class="rays">${rays}</g></g>
<circle cx="262" cy="2" r="70" fill="url(#sunGlow)"/>
<circle cx="262" cy="2" r="15" fill="url(#sunG)"/>
<circle cx="262" cy="2" r="15" fill="none" stroke="#FFFBE6" stroke-width="2" opacity=".8"/>
<g>
  <path d="M-20 18 Q-14 6 -2 9 Q4 0 16 3 Q26 -3 34 6 Q46 4 48 14Z" fill="#FFFFFF" stroke="#B9A2F0" stroke-width="1.4" stroke-linejoin="round"/>
  <path d="M-16 16 Q14 13 46 14" stroke="#DCCFFF" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M186 -30 Q192 -40 204 -37 Q210 -47 224 -43 Q234 -48 240 -38 Q252 -40 254 -30Z" fill="#FFFFFF" stroke="#B9A2F0" stroke-width="1.4" stroke-linejoin="round"/>
  <path d="M190 -32 Q220 -35 250 -32" stroke="#DCCFFF" stroke-width="3" fill="none" stroke-linecap="round"/>
  <path d="M30 -90 Q36 -100 50 -96 Q58 -106 72 -100 Q84 -104 88 -92Z" fill="#FFFFFF" stroke="#B9A2F0" stroke-width="1.3" opacity=".9"/>
  <path d="M220 -130 Q226 -138 238 -135 Q246 -143 258 -137 Q268 -139 270 -130Z" fill="#FFFFFF" stroke="#B9A2F0" stroke-width="1.3" opacity=".85"/>
</g>
<path d="M-20 8 Q60 22 140 14 Q220 6 320 22" stroke="#3A2A5A" stroke-width="1.1" fill="none" opacity=".7"/>
<path d="M-20 14 Q60 28 140 20 Q220 12 320 28" stroke="#3A2A5A" stroke-width="1.1" fill="none" opacity=".7"/>
<g fill="#3A2A5A"><path d="M206 12.4 q2 -3.4 4 0 l-.4 2.6 h-3.2z"/><circle cx="208" cy="10.6" r="1.6"/><path d="M216 11.4 q2 -3.4 4 0 l-.4 2.6 h-3.2z"/><circle cx="218" cy="9.6" r="1.6"/></g>

<!-- left shop (behind the rival bus) -->
<g>
  <rect x="-40" y="26" width="142" height="96" fill="#2EC4B6" stroke="${O}" stroke-width="2.4"/>
  <rect x="-40" y="26" width="142" height="5" fill="#fff" opacity=".25"/>
  <rect x="-44" y="19" width="150" height="8" rx="1.6" fill="#1C9C90" stroke="${O}" stroke-width="2"/>
  <path d="M-44 23 H106" stroke="#7FF0E0" stroke-width="1.4" opacity=".6"/>
  <rect x="2" y="32" width="72" height="20" rx="3.4" fill="${GOLD}" stroke="${O}" stroke-width="2.2"/>
  <text x="38" y="46.4" text-anchor="middle" font-family="Lilita One" font-size="10.4" fill="#E3261E" stroke="${O}" stroke-width="1.6" paint-order="stroke" letter-spacing=".3">MWAPE STORE</text>
  <rect x="-40" y="57" width="142" height="11" fill="#E3261E"/>
  <text x="34" y="65" text-anchor="middle" font-family="Lilita One" font-size="7.2" fill="#fff" letter-spacing=".6">AIRTIME · BREAD · SUGAR · SOAP</text>
  <path d="M-40 57 H102 M-40 68 H102" stroke="${O}" stroke-width="1.4"/>
  <rect x="-24" y="74" width="40" height="40" fill="#1A6F78" stroke="${O}" stroke-width="2"/><path d="M-16 74 V114 M-8 74 V114 M0 74 V114 M8 74 V114" stroke="#BFEFEA" stroke-width="1.4"/>
  <rect x="34" y="74" width="40" height="40" fill="#1A6F78" stroke="${O}" stroke-width="2"/><path d="M42 74 V114 M50 74 V114 M58 74 V114 M66 74 V114" stroke="#BFEFEA" stroke-width="1.4"/>
</g>
<!-- right shop: the salon (behind your bus) -->
<g>
  <rect x="150" y="30" width="180" height="92" fill="#FFC93C" stroke="${O}" stroke-width="2.4"/>
  <rect x="150" y="30" width="180" height="5" fill="#fff" opacity=".3"/>
  <rect x="146" y="22" width="190" height="9" rx="1.6" fill="#F29A1A" stroke="${O}" stroke-width="2"/>
  <rect x="180" y="35" width="114" height="20" rx="3.4" fill="#fff" stroke="${O}" stroke-width="2.2"/>
  <text x="237" y="49.6" text-anchor="middle" font-family="Lilita One" font-size="11.5" fill="#7B3FE4" letter-spacing=".4">BLESSED SALON</text>
  <g transform="translate(186 45) rotate(-30)"><circle cx="-2" cy="2.6" r="1.8" fill="none" stroke="#E3261E" stroke-width="1.2"/><circle cx="2" cy="2.6" r="1.8" fill="none" stroke="#E3261E" stroke-width="1.2"/><path d="M-1.2 1 L2.4 -5 M1.2 1 L-2.4 -5" stroke="${O}" stroke-width="1.1"/></g>
  <rect x="150" y="60" width="180" height="11" fill="#7B3FE4"/><path d="M150 60 H330 M150 71 H330" stroke="${O}" stroke-width="1.4"/>
  <text x="237" y="68.4" text-anchor="middle" font-family="Lilita One" font-size="7.2" fill="#fff" letter-spacing=".6">CUTS · BRAIDS · NAILS · OPEN 7 DAYS</text>
  <path d="M188 80 H262" stroke="${O}" stroke-width="1" opacity=".35"/>
  <rect x="274" y="62" width="40" height="52" fill="#7B3FE4" stroke="${O}" stroke-width="2"/><rect x="279" y="67" width="30" height="20" fill="#8ED8FF" stroke="${O}" stroke-width="1.4"/>
  <rect x="164" y="88" width="44" height="26" fill="#1A6F78" stroke="${O}" stroke-width="2"/>
</g>
<!-- gap: far pavement, jacaranda, umbrella stall -->
<rect x="-80" y="112" width="460" height="9" fill="#E4B585"/>
<path d="M-80 112 H380" stroke="${O}" stroke-width="1.2" opacity=".4"/>
<g>
  <path d="M120 118 Q118 92 122 60 M121 84 Q108 72 98 54 M122 76 Q136 62 150 44 M122 66 Q118 50 124 30" stroke="${O}" stroke-width="10" fill="none" stroke-linecap="round"/>
  <path d="M120 118 Q118 92 122 60 M121 84 Q108 72 98 54 M122 76 Q136 62 150 44 M122 66 Q118 50 124 30" stroke="#5A2A3A" stroke-width="6" fill="none" stroke-linecap="round"/>
  <path d="M121.6 114 Q120.6 94 123.4 66" stroke="#8A4A5A" stroke-width="1.6" fill="none"/>
  <g>${canopy}</g>
</g>
<g transform="translate(130 96)">
  <path d="M0 0 V22" stroke="${O}" stroke-width="2.2"/>
  <path d="M-20 0 Q-18 -12 0 -14 Q18 -12 20 0 Q15 -2 10 0 Q5 -2 0 0 Q-5 -2 -10 0 Q-15 -2 -20 0Z" fill="#43C21A" stroke="${O}" stroke-width="1.8" stroke-linejoin="round"/>
  <path d="M-10 0 Q-9 -10 0 -14 Q9 -10 10 0 Q5 -2 0 0 Q-5 -2 -10 0Z" fill="${GOLD}" stroke="${O}" stroke-width="1.2"/>
  <rect x="-14" y="13" width="28" height="4" fill="#C98A4E" stroke="${O}" stroke-width="1.4"/>
  ${[[-9, 11.6], [-5, 11.6], [-7, 8.6], [5, 11.6], [9, 11.6], [7, 8.6]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.2" fill="#E3261E" stroke="${O}" stroke-width=".9"/>`).join('')}
</g>
<!-- road -->
<rect x="-80" y="120" width="460" height="55" fill="url(#roadG)"/>
<path d="M-80 120.6 H380" stroke="${O}" stroke-width="1.4" opacity=".5"/>
${dashes}
<!-- minibuses -->
<g id="busr">${busSVG('r')}</g>
<g id="busy">${busSVG('y')}</g>
`);
export const FRONT = pfx(`<!-- curb + pavement -->
<rect x="-80" y="170.4" width="460" height="4.6" fill="#E8E2F6"/>
${curb}
<path d="M-80 170.4 H380 M-80 175 H380" stroke="${O}" stroke-width="1.2" opacity=".55"/>
<rect x="-80" y="180" width="460" height="160" fill="url(#paveG)"/>
<path d="M-80 180.2 H380" stroke="${O}" stroke-width="1.4" opacity=".5"/>
<path d="M-80 182 H380 V186 Q150 188 -80 186Z" fill="#B0602E" opacity=".18"/>
<g>${speck}</g>
<g>${petals}</g>
<path d="M18 252 l10 4 l6 -3 M262 300 l12 -3 l5 4" stroke="#B0602E" stroke-width="1.1" fill="none" opacity=".5"/>
<rect x="-80" y="-300" width="460" height="640" fill="url(#sunWash)" pointer-events="none"/>

`);
export const CAST = pfx(`<g id="shadows">${ALL.map(d => `<ellipse id="${d.id}sh" rx="${d.shW}" ry="3.6" fill="#7A3A10" opacity=".3"/>`).join('')}</g>
<g id="puffs">${BOYS.map((b, i) => Array.from({ length: N_DUST }, (_, k) => puffSVG(`ds${i}_${k}`)).join('')).join('')}${Array.from({ length: 6 }, (_, k) => puffSVG(`sk${k}`, 1.25)).join('')}${Array.from({ length: 8 }, (_, k) => smokeSVG(`sm${k}`)).join('')}</g>
<g id="actors">${ALL.map(personSVG).join('')}${PASDEF.map(bagSVG).join('')}</g>`);
export const FX = pfx(`<g id="fx">
  <g id="honkL" opacity="0"><path d="M0 -6 L-8 -10 M-1 0 L-11 0 M0 6 L-8 10" stroke="${O}" stroke-width="2.6" stroke-linecap="round"/><path d="M0 -6 L-8 -10 M-1 0 L-11 0 M0 6 L-8 10" stroke="${GOLD}" stroke-width="1.2" stroke-linecap="round"/></g>
  ${burstSVG('honk', 'HONK!', 11, GOLD, '#E3261E')}
  ${burstSVG('pap', 'PAP PAP!', 10, '#FF6FB0', '#fff')}
  <g id="flash" opacity="0"><path d="${star4(11)}" fill="#FFF6C0" stroke="${GOLD}" stroke-width="1.4"/><path d="${star4(6)}" fill="#fff" transform="rotate(45)"/></g>
  <g id="capW" opacity="0">${CB.capArt}</g>
  <g id="steam" opacity="0"><path id="st0" d="M0 0 q-3 -4 0 -7 q3 -3 0 -7" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round"/><path id="st1" d="M0 0 q3 -4 0 -7 q-3 -3 0 -7" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round"/></g>
  <g id="slam" opacity="0"><path d="M0 -10 l-5 -5 M-2 0 h-8 M0 10 l-5 5" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></g>
  ${Object.keys(BUBS).map(k => bubbleSVG(k, 'bubI', k === 'town' ? CB.d : k === 'kamwala' ? RIV[0].d : k === 'matero' ? RIV[2].d : '0s')).join('')}
  <g id="conf" opacity="0">${confSVG}</g>
  <g id="sparks">${sparkSVG}</g>
  <g id="plus" opacity="0"><text id="plusT" text-anchor="middle" font-family="Lilita One" font-size="22" fill="${GOLD}" stroke="${O}" stroke-width="5" stroke-linejoin="round" paint-order="stroke">+90</text></g>
</g>
`);
export const OVERLAY = pfx(`<g>${falling}</g>
<rect x="-80" y="-300" width="460" height="640" fill="url(#vig)" pointer-events="none"/>
${tuft(-6, 312, 1.3)}${tuft(306, 314, 1.4, -1)}
`);
