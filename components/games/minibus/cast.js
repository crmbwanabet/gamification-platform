// Lucky Minibus — the cast, ported verbatim from the approved mock: your call
// boy (yellow cap, blue shirt, kwacha notes), three rival call boys and the six
// passengers with their luggage. All drawn facing right (dir -1 mirrors); the
// motion renderer (motion.js) poses their IK limbs by writing SVG attributes.
// Fixes over the mock: rival r2 stands further left so the rival bus's
// "SHARP SHARP!" stays readable, and every passenger waves with the near arm
// (motion.js tucks it behind the head, so the raised hand pops up beside it).

import { O, GOLD, HAIR, f1, P2, sw, doorC, STEP_Y, headSVG, shoeSVG, sandalSVG, capSVG, NOTES, KWACHA, PROPART } from './kit';
import { PASSENGERS } from '@/lib/minibus/passengers.mjs';

function callBoy(id, o) {
  const H = -25, S = -45.6;
  const torso = `
    <path d="M-7.6 -23.4 L-8.4 -42 Q-8.4 -46.8 -3.4 -47.2 L5.8 -47.2 Q10.6 -46.8 10.3 -42 L9.1 -23.4 Q.7 -21.6 -7.6 -23.4Z" fill="${o.shirtFill || o.shirt}" ${sw(2.2)}/>
    <path d="M-8.1 -41 Q-8.8 -31 -7.5 -24 L-4.4 -23.4 Q-5.8 -31 -4.8 -42.6Z" fill="${O}" opacity=".16"/>
    <path d="M7.2 -44.4 Q9 -36 7.9 -27" stroke="#fff" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".45"/>
    ${o.side ? `<path d="M-7.6 -40 L-7 -26" stroke="${o.trim}" stroke-width="2.2"/>` : ''}
    <path d="M-1.6 -47.2 L2.2 -42.4 L5.8 -47.2" fill="none" stroke="${o.trim}" stroke-width="2.4" stroke-linejoin="round"/>
    ${o.chest || ''}
    <path d="M-7.9 -26.4 H9.3 L9.2 -21.6 Q.7 -20 -7.8 -21.6Z" fill="${o.shorts || o.pants}" ${sw(1.9)}/>
    <path d="M-3 -26 V-22 M4.6 -26 V-21.8" stroke="${O}" stroke-width=".9" opacity=".45"/>`;
  const hat = o.hat === 'beanie'
    ? `<path d="M-10.3 -1.4 Q-11.6 -15.6 .2 -15.8 Q11.6 -15.2 10.5 -2.6 Q.2 -5.4 -10.3 -1.4Z" fill="${o.cap}" ${sw(2.1)}/>
       <path d="M-10.5 -1.4 Q.2 -5.6 10.6 -2.6 L10.3 -6.6 Q.2 -9.6 -10.5 -5.6Z" fill="${o.capD}" ${sw(1.6)}/>
       <path d="M-6 -12 L-6.4 -7 M-2 -13.6 L-2.2 -8.4 M2 -14 V-8.6 M6 -13 L6.4 -8" stroke="${o.capD}" stroke-width="1" opacity=".8"/>`
    : capSVG(o.cap, o.capD, o.hat === 'back');
  return {
    id, kind: 'boy', H, S, hip: [-2.4, 2.4], sh: [[-2.4, S + 1.4], [2.8, S + 1.4]], head: [1.4, -56.4], r: 10,
    legs: [12.8, 12.4], arms: [9.6, 9.6], legW: 6, armW: 5, shW: 12,
    skin: o.skin, skinD: o.skinD, pants: o.shorts ? o.skin : o.pants, pantsD: o.shorts ? o.skinD : o.pantsD, shorts: o.shorts, sleeve: o.sleeve || o.shirt, sleeveD: o.sleeveD,
    shoe: o.flip ? sandalSVG(o.skin, o.shoe) : shoeSVG(o.shoe, o.sole || '#fff'), top: 72,
    torso, hairBack: '', hair: `<path d="M-9.8 -2.6 Q-10.8 2 -8.4 5.8 L-6.8 4.6 Q-8.6 1.4 -8.2 -2.4Z" fill="${HAIR}"/><g class="capHair" display="none"><path d="M-10 -.6 Q-11 -11.6 .2 -11.8 Q9.8 -11.4 9.9 -3.4 Q6.2 -7.8 .4 -7.6 Q-5.8 -7.6 -8 -.6Z" fill="${HAIR}"/><path d="M-6 -8.6 Q-2 -10.6 3 -10" stroke="#5A4A5A" stroke-width="1" fill="none"/></g>`,
    hat: `<g class="capOn">${hat}</g>`,
    ex: o.ex || { idle: ['open', 'up', 'cycle'], run: ['open', 'angry', 'shout'], push: ['open', 'up', 'grin'], joy: ['happy', 'up', 'open'], sad: ['squeeze', 'worry', 'frown'], mad: ['open', 'angry', 'grit'] },
    holdArt: [o.holdF || '', o.holdN || ''],
    capArt: hat,
    ...o.extra,
  };
}

export const CB = callBoy('cb', {
  skin: '#8A5232', skinD: '#6A3A20', shirt: '#1E63E6', sleeveD: '#174FBF', trim: GOLD, side: true, pants: '#2E4A9E', pantsD: '#243A80', shoe: '#E3261E',
  cap: GOLD, capD: '#E0A300', holdN: KWACHA,
  chest: `<path d="M-1 -38 h5.6 v4.4 q-2.8 2.6 -5.6 0z" fill="${GOLD}" ${sw(1)}/><path d="M.4 -36.6 l1.4 1.4 l1.6 -2.4" stroke="${O}" stroke-width=".9" fill="none"/>`,
});
export const RIV = [
  callBoy('r1', { skin: '#6A3A20', skinD: '#4E2812', shirt: '#F4F1FF', shirtFill: 'url(#stripeR)', sleeve: '#F4F1FF', sleeveD: '#DCD4F2', trim: '#E3261E', pants: '#2B2440', pantsD: '#1E1934', shoe: '#F4F1FF', sole: '#E3261E', cap: '#E3261E', capD: '#A8160F', hat: 'back' }),
  callBoy('r2', { skin: '#7A4626', skinD: '#5A2E14', shirt: '#E3261E', sleeveD: '#B81A14', trim: '#fff', side: true, pants: '#4A4470', pantsD: '#3A3460', shoe: '#2B2440', sole: '#fff', cap: '#E3261E', capD: '#A8160F', hat: 'beanie',
    ex: { idle: ['shades', 'up', 'cycle'], run: ['shades', 'angry', 'shout'], push: ['shades', 'up', 'grin'], joy: ['shades', 'up', 'open'], sad: ['shades', 'worry', 'frown'], mad: ['shades', 'angry', 'grit'] } }),
  callBoy('r3', { skin: '#9A5C36', skinD: '#7A4022', shirt: '#F4F1FF', sleeve: '#E3261E', sleeveD: '#B81A14', trim: '#E3261E', shorts: '#D9B26A', pants: '#D9B26A', shoe: '#E3261E', flip: true, cap: '#E3261E', capD: '#A8160F' }),
];
// homes + idle poses for the call boys
CB.home = [doorC('y'), STEP_Y]; CB.dir = -1; CB.step = true; CB.bus = 'y';
CB.idle = { feet: [[-3.6, 0], [3.8, 0]], hands: [[-12, -3], [4, -18.6]], lean: -2, head: -6, elb: [1, -1] };
CB.armCls = ['', 'wv']; CB.bub = 'town'; CB.d = '-.2s';
RIV[0].home = [doorC('r'), STEP_Y]; RIV[0].dir = 1; RIV[0].step = true;
RIV[0].idle = { feet: [[-3.6, 0], [3.8, 0]], hands: [[-11, -2], [5, -18]], lean: -2, head: -5, elb: [1, -1] };
RIV[0].armCls = ['', 'wv2']; RIV[0].bub = 'kamwala'; RIV[0].d = '-1.05s';
RIV[1].home = [46, 188]; RIV[1].dir = 1;
RIV[1].idle = { feet: [[-4.6, 0], [4.8, 0]], hands: [[-6.4, 9], [10.4, -9]], lean: 0, head: 0, elb: [-1, 1] };
RIV[1].armCls = ['', 'wv'];
RIV[2].home = [128, 180]; RIV[2].dir = -1;
RIV[2].idle = { feet: [[-4.2, 0], [4.4, 0]], hands: [[3, -19.4], [7.6, -10]], lean: -3, head: -8, elb: [-1, 1] };
RIV[2].armCls = ['wv2', '']; RIV[2].bub = 'matero'; RIV[2].d = '-1.3s';
export const BOYS = [CB, ...RIV];

// ---------- passengers (positions / multipliers / names: lib/minibus/passengers.mjs) ----------
const GRANNY = {
  id: 'p0', H: -19.5, S: -39, hip: [-2.6, 2.6], sh: [[-3.2, -37.6], [3.4, -37.6]], head: [2.2, -49.4], r: 10,
  legs: [9.6, 9.2], arms: [8.8, 8.6], legW: 5.6, armW: 5.2, shW: 14, top: 62,
  skin: '#7A4428', skinD: '#5A2E18', pants: '#7A4428', pantsD: '#5A2E18', sleeve: '#FF7AA8', sleeveD: '#E05A8A', sleeveLen: .75,
  shoe: shoeSVG('#7B3FE4', '#C9A2FF'), browC: '#C9C2DA',
  torso: `
    <path d="M-9.6 -21 Q-11.4 -33.4 -7.8 -39 Q0 -41.8 8.4 -38.8 Q11.8 -31 10.4 -21 Q.4 -19 -9.6 -21Z" fill="#FF7AA8" ${sw(2.2)}/>
    <path d="M-9 -33 Q-10.4 -26 -9.2 -21.6 L-5.6 -21 Q-7 -27 -6 -34Z" fill="${O}" opacity=".15"/>
    <path d="M-2.6 -40.4 Q1.4 -35.8 5.6 -40.2" fill="#FFB3CC" ${sw(1.4)}/>
    <path d="M-10.4 -23.6 Q-13.4 -12 -13 -3 Q0 -.8 13 -3 Q13.4 -12 10.6 -23.6 Q0 -21.4 -10.4 -23.6Z" fill="url(#chitA)" ${sw(2.2)}/>
    <path d="M2 -21 Q3 -12 1.6 -2.2 M-5.4 -21.6 Q-7.4 -12 -6.8 -2.6" stroke="${O}" stroke-width="1" opacity=".3" fill="none"/>
    <path d="M-10.6 -24.6 Q0 -22 10.8 -24.6 L10.6 -21.4 Q0 -19 -10.4 -21.4Z" fill="#19B39A" ${sw(1.6)}/>
    <path d="M5.6 -23.4 Q10 -21.4 9.2 -16.4 Q6.8 -18.8 5.6 -23.4Z" fill="${GOLD}" ${sw(1.3)}/>`,
  hairBack: `<path d="M-7.6 -6.6 Q-15.6 -9.6 -15.2 -3.4 Q-12.4 -1.2 -9 -2.8 Q-13.6 1.4 -11.6 5.4 Q-8 2.2 -7.6 -2Z" fill="#7B3FE4" ${sw(1.6)}/>`,
  hair: `<path d="M-7.4 -2.6 Q-6.4 0 -7.4 2.4" stroke="#E6E0F2" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M-10.5 1.2 Q-11.8 -11.8 0 -12.6 Q11.2 -12.4 10.8 -2.8 Q8.2 -6.6 2 -7 Q-5 -7.2 -7.8 -2 Q-8.8 0 -10.5 1.2Z" fill="url(#scarf)" ${sw(1.9)}/>
    <path d="M-5 -10 Q0 -12 5 -11" stroke="#fff" stroke-width="1.3" fill="none" opacity=".45" stroke-linecap="round"/>`,
  face: `<g fill="none" stroke="#5A2A8A" stroke-width="1.3"><circle cx="1.2" cy="-.7" r="3.5"/><circle cx="7.6" cy="-.9" r="3.1"/><path d="M4.7 -1.2 Q4.6 -2.2 4.5 -1.2 M-2.3 -1 L-6 -.2"/></g><path d="M9.4 3.6 Q10.2 5 9.4 6.4" stroke="${O}" stroke-width="1" fill="none" opacity=".5"/>`,
  ex: { idle: ['happy', 'calm', 'smile'], go: ['happy', 'up', 'open'] },
  idle: { feet: [[-5.6, 0], [5.6, -.4]], hands: [[10.4, 12.4], [10.6, 14]], lean: 7, head: 2, elb: [1, 1] },
  own: ['T1', 'translate(7.4 -24) rotate(10)'], idleCls: 'i-shuffle', wave: [1, [-15, -11]],
};
const LADY = {
  id: 'p1', H: -24, S: -45, hip: [-2.6, 2.6], sh: [[-3, -43.4], [3.4, -43.4]], head: [1.4, -55.8], r: 10.4,
  legs: [12, 11.6], arms: [9.6, 9.6], legW: 6, armW: 5.6, shW: 15, top: 88,
  skin: '#9A5A34', skinD: '#7A4022', pants: '#9A5A34', pantsD: '#7A4022', sleeve: '#2FA35A', sleeveD: '#1F8A48', sleeveLen: .7,
  shoe: sandalSVG('#9A5A34', '#E3261E'),
  torso: `
    <path d="M-8.8 -44.2 Q0 -47.4 9 -44.2 Q11.8 -35 10.6 -26 Q14.2 -15 13.8 -8.2 Q0 -5.4 -13 -8.2 Q-13.4 -16 -10.4 -26 Q-11.8 -35 -8.8 -44.2Z" fill="url(#chitB)" ${sw(2.2)}/>
    <path d="M-10 -36 Q-11 -30 -10 -26 Q-13 -16 -12.6 -9 L-8.4 -8.2 Q-9.6 -17 -7.4 -26 Q-8.6 -31 -7.6 -37Z" fill="${O}" opacity=".16"/>
    <path d="M-10.6 -27.8 Q0 -25.2 10.8 -27.8 L10.8 -24.4 Q0 -21.8 -10.6 -24.4Z" fill="${GOLD}" ${sw(1.6)}/>
    <path d="M-3.4 -45.8 Q1 -41 5.4 -45.6" fill="#9A5A34" ${sw(1.4)}/>
    <path d="M3 -21 Q4.6 -14 3.6 -6.4 M-4 -21.4 Q-6 -14 -5.6 -6.6" stroke="${O}" stroke-width="1" opacity=".28" fill="none"/>`,
  hair: `<path d="M-10.6 -.6 Q-12 -12.8 .2 -13.4 Q11.4 -13 10.8 -2.6 Q7.4 -6.8 1 -7.2 Q-6 -7.2 -8.2 -2.2Z" fill="#E3261E" ${sw(1.9)}/>
    <path d="M-8.6 -8 Q0 -11.6 9.4 -7.4" stroke="${GOLD}" stroke-width="1.8" fill="none"/>
    <path d="M-9.4 -11 Q-15 -14 -13.4 -6 Q-11.4 -7 -10 -8Z" fill="#E3261E" ${sw(1.5)}/>
    <ellipse cx="0" cy="-12.8" rx="7" ry="2.2" fill="${GOLD}" ${sw(1.3)}/>`,
  face: `<circle cx="-6.2" cy="5.8" r="1.6" fill="${GOLD}" ${sw(.9)}/>`,
  ex: { idle: ['happy', 'calm', 'grin'], go: ['open', 'up', 'open'] },
  idle: { feet: [[-4.4, 0], [4.8, 0]], hands: [[-11.6, -22.6], [3.4, 18]], lean: -1, head: 0, elb: [1, 1] },
  own: ['head', 'translate(0 -10)'], idleCls: 'i-sway', wave: [1, [16, -10]],
};
const BOY = {
  id: 'p2', H: -18, S: -33.6, hip: [-2.2, 2.2], sh: [[-2.4, -32.4], [2.6, -32.4]], head: [1.6, -44.6], r: 10.6,
  legs: [9.6, 9.2], arms: [7.8, 7.6], legW: 5.2, armW: 4.6, shW: 11, top: 56, earRx: 3.8, earRy: 4.6,
  skin: '#8A4E2C', skinD: '#6A3418', pants: '#8A4E2C', pantsD: '#6A3418', shorts: '#2E8B57', sock: '#FFFFFF', sleeve: '#F4F6FF', sleeveD: '#D9DCEE', sleeveLen: .6,
  shoe: shoeSVG('#2B2440', '#6A6488'),
  torso: `
    <path d="M-7 -16.4 L-7.6 -31 Q-7.2 -34.8 -3.2 -35.2 L4.4 -35.2 Q8.2 -34.8 8.2 -31 L7.6 -16.4 Q.3 -15 -7 -16.4Z" fill="#F4F6FF" ${sw(2.1)}/>
    <path d="M-7.2 -29 Q-7.8 -22 -6.8 -17 L-4.4 -16.6 Q-5.4 -22 -4.6 -29.6Z" fill="${O}" opacity=".12"/>
    <path d="M-4.6 -34.8 Q-6.2 -26 -4.6 -18.6" stroke="#1D4FB8" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    <path d="M-2.4 -35.4 L1 -32 L2.2 -35.4 M2.2 -35.4 L3.2 -32 L6.2 -35.4" fill="#fff" ${sw(1.2)}/>
    <path d="M3.6 -28.6 h3.2 v2.6 q-1.6 1.8 -3.2 0z" fill="#E3261E" ${sw(.8)}/>
    <path d="M-7.4 -19.4 H7.8 L8 -14.6 Q.3 -13.2 -7.6 -14.6Z" fill="#2E8B57" ${sw(1.8)}/>`,
  hair: `<path d="M-10.2 -1.4 Q-11.2 -12 .4 -11.8 Q8.8 -11.6 10 -4.4 Q6 -8.2 .6 -7.8 Q-5.6 -7.8 -7.8 -1Z" fill="${HAIR}"/><g fill="#4A3A40"><circle cx="-5" cy="-8" r=".7"/><circle cx="-1" cy="-9.6" r=".7"/><circle cx="3" cy="-9.4" r=".7"/><circle cx="-6.6" cy="-4.4" r=".7"/></g>`,
  ex: { idle: ['open', 'up', 'gap'], go: ['happy', 'up', 'open'] },
  idle: { feet: [[-3.8, 0], [4, 0]], hands: [[-1.4, 14.6], [2.4, 14.4]], lean: 0, head: -2, elb: [1, 1] },
  own: ['T0', 'translate(-10.4 -22.4)'], idleCls: 'i-bounce', wave: [1, [13, -8]],
};
const OFFICE = {
  id: 'p3', H: -27, S: -49, hip: [-2.4, 2.4], sh: [[-2.6, -47.6], [3, -47.6]], head: [2, -60.2], r: 9.8,
  legs: [13.6, 13], arms: [10.6, 10.4], legW: 6, armW: 4.8, shW: 12, top: 70,
  skin: '#6E3E22', skinD: '#4E2812', pants: '#2B2D5E', pantsD: '#20224A', sleeve: '#DDEBFF', sleeveD: '#BFD0F0', sleeveLong: true,
  shoe: shoeSVG('#1B1430', '#4A3A60'),
  torso: `
    <path d="M-7.2 -25.4 L-8 -45.6 Q-7.8 -50.2 -3.2 -50.4 L5.6 -50.4 Q10 -50 9.8 -45.6 L8.8 -25.4 Q.8 -23.8 -7.2 -25.4Z" fill="#DDEBFF" ${sw(2.2)}/>
    <path d="M-7.6 -44 Q-8.4 -33 -7 -26 L-4.4 -25.6 Q-5.8 -33 -5 -45Z" fill="${O}" opacity=".12"/>
    <path d="M-3.8 -38.6 h4 v5.4 h-4z" fill="#fff" ${sw(.9)}/><path d="M-3 -37.4 h2.4 M-3 -35.6 h1.6" stroke="#5FA0FF" stroke-width=".9"/>
    <path d="M-2 -50 L-1.8 -38.6 M-.2 -50 L-.2 -38.6" stroke="#1E63E6" stroke-width=".9"/>
    <path d="M1.6 -48.4 L4.2 -48.4 L3.8 -46.2 L5.4 -32.8 L3 -30 L.8 -32.8 L2 -46.2Z" fill="#E3261E" ${sw(1.3)}/>
    <path d="M2.2 -43 L4.6 -44.4 M2.6 -39 L5 -40.4 M2.8 -35 L5.2 -36.4" stroke="${GOLD}" stroke-width="1"/>
    <path d="M-1.6 -50.6 L1.8 -47.2 L2.9 -50.6 M2.9 -50.6 L4.4 -47.2 L7.4 -50.6" fill="#fff" ${sw(1.2)}/>
    <path d="M-7.6 -28 H9 L8.9 -23.4 Q.8 -22 -7.4 -23.4Z" fill="#2B2D5E" ${sw(1.8)}/>
    <rect x="1.6" y="-27.6" width="3.4" height="3" rx=".6" fill="${GOLD}" ${sw(.8)}/>`,
  hair: `<path d="M-9.6 -.8 Q-10.6 -10.8 .2 -11.2 Q9.6 -10.8 9.6 -3.2 Q9 -7.4 3.6 -7.6 L2.2 -9 L1.4 -7.6 Q-5.6 -7.6 -7.4 -.8Z" fill="${HAIR}"/>`,
  face: `<path d="M4.6 3.2 Q7.4 2 10 3.4 Q7.4 4.4 4.6 3.2Z" fill="${HAIR}"/><g fill="none" stroke="#1B1430" stroke-width="1.3"><rect x="-1.8" y="-3.4" width="6" height="5" rx="1.4"/><rect x="5" y="-3.6" width="5.2" height="5" rx="1.4"/><path d="M4.2 -1.4 H5 M-1.8 -1.2 L-5.8 -.2"/></g>`,
  ex: { idle: ['down', 'calm', 'flat'], go: ['open', 'up', 'grin'] },
  idle: { feet: [[-4, 0], [4.4, 0]], hands: [[-.6, 20.4], [8.6, 4.6]], lean: 1, head: 15, elb: [1, 1] },
  holdArt: ['', `<g transform="rotate(-12)"><rect x="-2.4" y="-8.6" width="5" height="8.6" rx="1.2" fill="#1B1430" ${sw(1)}/><rect class="glow" x="-1.5" y="-7.7" width="3.2" height="6.2" rx=".6" fill="#7BE3FF"/></g>`],
  own: ['hold0', ''], idleCls: 'i-breathe', headCls: 'i-scroll', wave: [1, [17, -10]],
};
const HEADPH = {
  id: 'p4', H: -26, S: -47.6, hip: [-2.4, 2.4], sh: [[-2.6, -46], [3, -46]], head: [1.4, -58.2], r: 10,
  legs: [13.2, 12.6], arms: [10, 10], legW: 6.4, armW: 5.6, shW: 13, top: 74,
  skin: '#5C321C', skinD: '#3E200E', pants: '#2B2440', pantsD: '#211B36', stripe: '#F4F1FF', sleeve: '#FF8A1A', sleeveD: '#E06A00', sleeveLong: true,
  shoe: shoeSVG('#F4F1FF', '#E3261E'),
  torso: `
    <path d="M-8.2 -24 L-9 -44 Q-8.6 -48.6 -3.6 -49 L6 -49 Q10.6 -48.6 10.4 -44 L9.6 -24 Q.8 -22.2 -8.2 -24Z" fill="#FF8A1A" ${sw(2.2)}/>
    <path d="M-8.6 -42 Q-9.4 -32 -8 -25 L-5 -24.4 Q-6.4 -32 -5.4 -43Z" fill="${O}" opacity=".16"/>
    <path d="M-8.8 -46.8 Q-12.4 -51.4 -7.4 -53.4 Q-2 -53 .2 -49.2 Q-5 -50.4 -8.8 -46.8Z" fill="#E06A00" ${sw(1.6)}/>
    <path d="M-2.4 -33.4 H8.6 L9.8 -26.6 H-3.2Z" fill="#E87612" ${sw(1.3)}/>
    <path d="M3 -48.6 L2.4 -40.6 M6 -48.6 L5.8 -41.2" stroke="#fff" stroke-width="1.2" stroke-linecap="round"/>
    <path d="M7.8 -46 Q9.6 -37 8.6 -28" stroke="#FFC078" stroke-width="1.6" fill="none" opacity=".7" stroke-linecap="round"/>
    <path d="M-8.2 -26.6 H9.6 L9.6 -23 Q.8 -21.4 -8.2 -23Z" fill="#E06A00" ${sw(1.6)}/>`,
  hair: `<g fill="${HAIR}" ${sw(1.2)}><circle cx="-6.6" cy="-8.4" r="2.8"/><circle cx="-2.6" cy="-10.6" r="2.9"/><circle cx="1.8" cy="-11" r="2.8"/><circle cx="5.8" cy="-9.4" r="2.6"/><circle cx="-8.8" cy="-4.4" r="2.4"/></g>`,
  hat: `<path d="M-6.8 -2.4 Q-8.6 -16.4 1.4 -16.4 Q10.4 -16 9.4 -6.4" stroke="${O}" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M-6.8 -2.4 Q-8.6 -16.4 1.4 -16.4 Q10.4 -16 9.4 -6.4" stroke="#19B39A" stroke-width="2.8" fill="none" stroke-linecap="round"/>
    <rect x="-10.6" y="-5" width="8" height="11" rx="3.6" fill="#19B39A" ${sw(1.9)}/><rect x="-9" y="-3.4" width="3.6" height="7.8" rx="1.8" fill="#7FF0D8" opacity=".7"/>${NOTES}`,
  ex: { idle: ['closed', 'calm', 'smile'], go: ['open', 'up', 'grin'] },
  idle: { feet: [[-4.6, 0], [4.8, 0]], hands: [[-1.4, 18.4], [4.6, 14.4]], lean: 0, head: 0, elb: [1, 1] },
  own: ['hold0', ''], idleCls: 'i-breathe', headCls: 'i-nod', wave: [1, [16, -11]],
};
const TOURIST = {
  id: 'p5', H: -25, S: -47.6, hip: [-2.8, 2.8], sh: [[-2.8, -46], [3.6, -46]], head: [1.4, -58.6], r: 10.4,
  legs: [12.6, 12], arms: [9.8, 9.6], legW: 6.2, armW: 5.4, shW: 15, top: 75,
  skin: '#F7C9A8', skinD: '#E09E86', pants: '#F7C9A8', pantsD: '#E09E86', shorts: '#D9B26A', sock: '#FFFFFF', sleeve: '#22C3D6', sleeveD: '#1AA4B8', sleeveLen: .66,
  shoe: sandalSVG('#FFFFFF', '#8A4A26'), nose: '#FF8F7E', blush: .6, browC: '#C98A2E',
  torso: `
    <path d="M-8.4 -23.6 L-9 -43.6 Q-8.8 -48.8 -3.6 -49 L6.2 -49 Q11 -48.8 11.2 -43 Q15.8 -34 12.8 -25 Q10.8 -22.6 1 -22.4 Q-6 -22.4 -8.4 -23.6Z" fill="url(#hawaii)" ${sw(2.2)}/>
    <path d="M-8.8 -42 Q-9.4 -32 -8.2 -24.2 L-5 -23.6 Q-6.4 -32 -5.6 -43Z" fill="${O}" opacity=".14"/>
    <path d="M-.6 -49 L3.4 -43.4 L6.6 -49Z" fill="#F7C9A8" ${sw(1.3)}/>
    <path d="M3.4 -43.4 Q6.8 -33 4.4 -23" stroke="${O}" stroke-width="1" opacity=".45" fill="none"/>
    <path d="M-8.6 -25.8 H12.4 Q12.8 -21.6 11.8 -19.8 Q1.6 -18.6 -8.4 -19.8Z" fill="#D9B26A" ${sw(1.8)}/>
    <path d="M-1.6 -48.8 Q-1 -40.4 3 -37.4 Q7.6 -40.4 7.8 -48.6" stroke="#2B2440" stroke-width="1.4" fill="none"/>
    <rect x="1" y="-39" width="8.6" height="6.2" rx="1.4" fill="#2B2440" ${sw(1.2)}/><circle cx="6.8" cy="-35.9" r="2.4" fill="#5A6A9A" ${sw(1)}/><circle cx="7.3" cy="-36.6" r=".8" fill="#fff"/><rect x="2.2" y="-38.4" width="2" height="1.2" fill="${GOLD}"/>`,
  hair: `<path d="M-9.4 -3.4 Q-11.6 1 -9.2 4.6 Q-7.8 1 -8.2 -2.6Z" fill="#F2C94C" ${sw(1)}/><g fill="#E0866E"><circle cx="9" cy="2.4" r=".5"/><circle cx="7.8" cy="4.2" r=".5"/><circle cx="1" cy="2.6" r=".5"/></g>`,
  hat: `<path d="M-8.8 -5 Q-9.8 -16.2 .6 -16.4 Q10.6 -16 9.6 -5.2Z" fill="#E8D3A0" ${sw(2)}/>
    <path d="M-9 -7.6 Q.6 -9.6 9.8 -7.8 L9.7 -5.4 Q.6 -7.4 -8.9 -5.2Z" fill="#7A4A26"/>
    <path d="M-14 -4 Q.4 -8.8 14.6 -4.4 Q12.2 -1.4 .4 -2.8 Q-12 -1.2 -14 -4Z" fill="#D9BF84" ${sw(1.8)}/>
    <g transform="translate(3.6 -11.4)"><path d="M-4.6 -1.6 H5 L4.6 1 Q3.8 2.4 2.4 2.2 Q1.2 2 .8 .2 H-.6 Q-1 2.2 -2.4 2.4 Q-4 2.2 -4.6 .6Z" fill="#2B2440" ${sw(1)}/><path d="M-3.4 -.6 h1.6" stroke="#9AA6FF" stroke-width=".9"/></g>`,
  ex: { idle: ['open', 'up', 'grin'], go: ['happy', 'up', 'open'] },
  idle: { feet: [[-4.6, 0], [5, 0]], hands: [[-10.6, 15], [9.6, -1.6]], lean: -1, head: -2, elb: [1, 1] },
  holdArt: ['', `<g class="fan"><g transform="rotate(-8)"><path d="M-1.6 -12.6 L9.6 -11.2 L8.8 1.4 L-2.4 0Z" fill="#FFF3D0" ${sw(1.3)}/><path d="M2 -12.2 L1.2 .4 M5.8 -11.8 L5 .8" stroke="${O}" stroke-width=".7" opacity=".4"/><path d="M-.6 -9 Q3 -7 4 -9.6 Q6 -6 8.4 -7" stroke="#22C3D6" stroke-width="1.4" fill="none"/><circle cx="6.4" cy="-3.6" r="1.4" fill="#E3261E"/><path d="M-.8 -4 Q2 -2.4 4 -4.4" stroke="#43C21A" stroke-width="1.6" fill="none"/></g></g>`],
  own: ['hold0', 'suit'], idleCls: 'i-sway', headCls: 'i-look', wave: [1, [16, -10]],
};
export const PASDEF = [GRANNY, LADY, BOY, OFFICE, HEADPH, TOURIST];
PASDEF.forEach((d, i) => {
  const P = PASSENGERS[i];
  Object.assign(d, { m: P.mult, name: P.name, x: P.x, y: P.y, dir: P.dir, bag: P.bag });
  d.pass = true; d.i = i; d.t = P.tag;
});
// chunky cartoon heads: scale every head up, lift it so the neck still meets the shoulders
[...BOYS, ...PASDEF].forEach(d => { d.hs = d.hs || (d.pass ? 1.24 : 1.18); d.head = [d.head[0], d.head[1] - d.r * (d.hs - 1) * .78]; d.top += d.r * (d.hs - 1) * 1.8; });

function ownBagSVG(d) {
  if (d.own[1] === 'suit') { // rolling case standing on the ground, handle up to the hand
    const hy = -(d.sh[0][1] + d.idle.hands[0][1]);
    return `<g class="ownBag"><path d="M0 0 L-6 ${f1(hy - 25)}" stroke="${O}" stroke-width="3.4" stroke-linecap="round"/><path d="M0 0 L-6 ${f1(hy - 25)}" stroke="#C9CDE6" stroke-width="1.6" stroke-linecap="round"/><g transform="translate(-6 ${f1(hy)})">${PROPART.suit}</g></g>`;
  }
  return `<g class="ownBag" transform="${d.own[1]}">${PROPART[d.bag]}</g>`;
}
export function personSVG(d) {
  const id = d.id;
  const legG = k => `<g id="${id}l${k}" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path class="lo" stroke="${O}" stroke-width="${f1(d.legW + 3.4)}"/>
    <path class="lc" stroke="${k ? d.pants : (d.pantsD || d.pants)}" stroke-width="${d.legW}"/>
    ${d.shorts ? `<path class="lso" stroke="${O}" stroke-width="${f1(d.legW + 5.4)}"/><path class="ls" stroke="${d.shorts}" stroke-width="${f1(d.legW + 2)}"/>` : ''}
    ${d.sock ? `<path class="lk" stroke="${d.sock}" stroke-width="${f1(d.legW + .4)}"/>` : ''}
    ${d.stripe ? `<path class="lp" stroke="${d.stripe}" stroke-width="1.2"/>` : ''}
    <g class="shoe">${d.shoe}</g></g>`;
  const armG = k => `<g transform="translate(${P2(d.sh[k])})"><g class="arm${k ? 'N' : 'F'} ${(d.armCls || [])[k] || ''}"><g id="${id}a${k}" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path class="ao" stroke="${O}" stroke-width="${f1(d.armW + 3.2)}"/>
    <path class="af" stroke="${d.sleeveLong ? (k ? d.sleeve : (d.sleeveD || d.sleeve)) : (k ? d.skin : d.skinD)}" stroke-width="${d.armW}"/>
    ${d.sleeveLong ? '' : `<path class="auo" stroke="${O}" stroke-width="${f1(d.armW + 4.6)}"/><path class="au" stroke="${k ? d.sleeve : (d.sleeveD || d.sleeve)}" stroke-width="${f1(d.armW + 1.6)}"/>`}
    <g class="hold">${(d.holdArt || [])[k] || ''}${d.own && d.own[0] === 'hold' + k ? ownBagSVG(d) : ''}</g>
    <circle class="ah" r="3" fill="${k ? d.skin : d.skinD}" ${sw(1.9)}/>
  </g></g></g>`;
  const T = d.pass ? d.t : null, mt = d.pass ? String(d.m) : '', tw = mt.length > 1 ? 40 : 30;
  const hitW = 24, hitTop = -(d.top + 30);
  return `<g id="${id}" class="actor${d.pass ? ' pa' : ''}" ${d.pass ? `data-i="${d.i}" role="button" tabindex="0" aria-label="${d.name}, ${d.m}x" aria-pressed="false"` : ''}>
   <g id="${id}b">
    ${d.pass ? `<g class="ring">
      <ellipse class="pulse" cx="0" cy="1" rx="19" ry="6.4" fill="none" stroke="${GOLD}" stroke-width="2.6"/>
      <ellipse cx="0" cy="1" rx="19" ry="6.4" fill="${GOLD}" fill-opacity=".22" stroke="${O}" stroke-width="6"/>
      <ellipse cx="0" cy="1" rx="19" ry="6.4" fill="none" stroke="url(#goldRing)" stroke-width="3.4"/></g>` : ''}
    <g class="${d.idleCls || ''}">
      <g id="${id}h"><g id="${id}T0">${armG(0)}${d.own && d.own[0] === 'T0' ? ownBagSVG(d) : ''}</g></g>
      ${legG(0)}${legG(1)}
      <g id="${id}h2"><g id="${id}T1">
        ${d.torso}
        ${d.own && d.own[0] === 'T1' ? ownBagSVG(d) : ''}
        <g id="${id}H"><g class="${d.headCls || ''}" style="--d:${d.d || '0s'}"><g id="${id}HI">${headSVG(d)}</g>${d.own && d.own[0] === 'head' ? ownBagSVG(d) : ''}</g></g>
        ${armG(1)}
      </g></g>
    </g>
    ${d.pass ? `<rect class="focus" x="-24" y="${-d.top - 6}" width="48" height="${d.top + 12}" rx="10" fill="none" stroke="#fff" stroke-width="1.6" stroke-dasharray="4 3" opacity="0"/>
    <rect x="${-hitW}" y="${hitTop}" width="${2 * hitW}" height="${-hitTop + 8}" fill="transparent"/>` : ''}
   </g>
   ${d.pass ? `<g id="${id}tag"><g class="tagB">
      <path d="M${-tw / 2 + 10} -22 H${tw / 2 - 10} A10 10 0 0 1 ${tw / 2 - 10} -2 H5 L0 4 L-5 -2 H${-tw / 2 + 10} A10 10 0 0 1 ${-tw / 2 + 10} -22Z" fill="url(#tagG${d.i})" stroke="${O}" stroke-width="2.4" stroke-linejoin="round"/>
      <path class="tagSel" d="M${-tw / 2 + 10} -24.6 H${tw / 2 - 10} A12.6 12.6 0 0 1 ${tw / 2 - 10} .6 H6 L0 7.2 L-6 .6 H${-tw / 2 + 10} A12.6 12.6 0 0 1 ${-tw / 2 + 10} -24.6Z" fill="none" stroke="${GOLD}" stroke-width="2.6" stroke-linejoin="round"/>
      <path d="M${-tw / 2 + 7} -18.5 Q${-tw / 2 + 9} -20.6 ${-tw / 2 + 14} -20.4" stroke="#fff" stroke-width="2" stroke-linecap="round" fill="none" opacity=".75"/>
      <text text-anchor="middle" y="-6.6" font-family="Lilita One" font-size="15" fill="#fff" stroke="${O}" stroke-width="4.2" stroke-linejoin="round" paint-order="stroke">${mt}<tspan font-size="11">x</tspan></text>
   </g></g>` : ''}
  </g>`;
}

// A passenger's luggage once a call boy has it (before that it is drawn as part of its owner).
export function bagSVG(d) {
  const id = 'bag' + d.i;
  return d.bag === 'suit'
    ? `<g id="${id}"><path class="hdl" stroke="${O}" stroke-width="3.4" stroke-linecap="round" fill="none"/><path class="hdl2" stroke="#C9CDE6" stroke-width="1.6" stroke-linecap="round" fill="none"/><g class="pb">${PROPART.suit}</g></g>`
    : `<g id="${id}"><g class="pb">${PROPART[d.bag]}</g></g>`;
}
export const ALL = [...BOYS, ...PASDEF];
