// Lucky Minibus — art kit, ported verbatim from the approved mock: maths helpers,
// stop geometry, the face kit (eyes / brows / mouths / heads), shoes, caps and
// the luggage. Everything returns SVG markup strings; pfx() namespaces the ids
// and classes (mb-*) so the scene can't clash with the platform's CSS or ids.
// Pure (no React, no DOM).

import { CANDY } from '../candy/tokens';

export const O = CANDY.outline;
export const GOLD = CANDY.gold;
export const HAIR = '#1F1414';
export const VB_W = 300, VB_H = 306;

export const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const lerp2 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
export const eOut = t => 1 - Math.pow(1 - t, 3);
export const eIn = t => t * t;
export const eInOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
export const eBack = t => { const c = 1.7; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
export const smooth = t => t * t * (3 - 2 * t);
export const eRun = u => .5 * u + .5 * smooth(u);
export function rng(seed) { return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export const f1 = n => +(+n).toFixed(2);
export const D2R = Math.PI / 180;
export const rotAbout = (p, c, deg) => { const a = deg * D2R, cs = Math.cos(a), sn = Math.sin(a), x = p[0] - c[0], y = p[1] - c[1]; return [c[0] + x * cs - y * sn, c[1] + x * sn + y * cs]; };
export const star4 = (s) => `M0 ${-s} Q${f1(s * .18)} ${f1(-s * .18)} ${s} 0 Q${f1(s * .18)} ${f1(s * .18)} 0 ${s} Q${f1(-s * .18)} ${f1(s * .18)} ${-s} 0 Q${f1(-s * .18)} ${f1(-s * .18)} 0 ${-s}Z`;
export function ik(a, b, l1, l2, sign) {
  let dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || .001;
  const max = l1 + l2 - .01; if (d > max) { b = [a[0] + dx / d * max, a[1] + dy / d * max]; dx = b[0] - a[0]; dy = b[1] - a[1]; d = max; }
  const x = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, l1 * l1 - x * x));
  return { j: [a[0] + dx / d * x + sign * h * (-dy / d), a[1] + dy / d * x + sign * h * (dx / d)], end: b };
}
export const P2 = p => `${f1(p[0])} ${f1(p[1])}`;
export const bez = (a, c, b, u) => { const v = 1 - u; return [v * v * a[0] + 2 * v * u * c[0] + u * u * b[0], v * v * a[1] + 2 * v * u * c[1] + u * u * b[1]]; };
export const bezLen = (a, c, b) => { let L = 0, p = a; for (let k = 1; k <= 20; k++) { const q = bez(a, c, b, k / 20); L += Math.hypot(q[0] - p[0], q[1] - p[1]); p = q; } return L; };
export const sw = w => `stroke="${O}" stroke-width="${w}" stroke-linejoin="round"`;

export const GROUND = 160, BS = 1, DL = 48, DR = 82;
export const BUS = { y: { x: 148 }, r: { x: -40 } };
export const doorC = k => BUS[k].x + BS * (DL + DR) / 2;
export const STEP_Y = +(GROUND - 16 * BS).toFixed(2);
export const depth = y => clamp(.9 + (y - STEP_Y) * .23 / (296 - STEP_Y), .88, 1.16);

export const EL = [1.2, -.6], ER = [7.4, -.8];
export function eyesSVG(t, skin) {
  const ball = (x, y, rx, ry, px, py, pr) => `<ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${rx}" ry="${ry}" fill="#fff" ${sw(1.3)}/><circle cx="${f1(x + px)}" cy="${f1(y + py)}" r="${pr}" fill="${O}"/><circle cx="${f1(x + px + .55)}" cy="${f1(y + py - .85)}" r=".62" fill="#fff"/>`;
  const [lx, ly] = EL, [rx, ry] = ER;
  const arc = (x, y, up) => up ? `M${f1(x - 2.3)} ${f1(y + 1)} Q${f1(x)} ${f1(y - 2.8)} ${f1(x + 2.3)} ${f1(y + 1)}` : `M${f1(x - 2.3)} ${f1(y - .4)} Q${f1(x)} ${f1(y + 2.6)} ${f1(x + 2.3)} ${f1(y - .4)}`;
  const line = d => `<path d="${d}" stroke="${O}" stroke-width="1.9" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
  switch (t) {
    case 'open': return `<g class="blink">${ball(lx, ly, 2.4, 3.1, .9, .5, 1.6)}${ball(rx, ry, 2.1, 3, .8, .5, 1.5)}</g>`;
    case 'wide': return ball(lx, ly - .4, 2.8, 3.7, .2, 0, 1.15) + ball(rx, ry - .4, 2.5, 3.5, .2, 0, 1.1);
    case 'down': {
      const lid = (x, y, r) => `<path d="M${f1(x - r - .3)} ${f1(y + .4)} A${f1(r + .3)} ${f1(r + .3)} 0 0 1 ${f1(x + r + .3)} ${f1(y + .4)}Z" fill="${skin}" ${sw(1.2)}/>`;
      return ball(lx, ly, 2.4, 3, .9, 1.5, 1.45) + ball(rx, ry, 2.1, 2.9, .8, 1.5, 1.4) + lid(lx, ly, 2.4) + lid(rx, ry, 2.1);
    }
    case 'happy': return line(`${arc(lx, ly, 1)} ${arc(rx, ry, 1)}`);
    case 'closed': return line(`${arc(lx, ly, 0)} ${arc(rx, ry, 0)}`);
    case 'squeeze': return line(`M${f1(lx - 2.4)} ${f1(ly - 1.8)} L${f1(lx + 1.8)} ${f1(ly)} L${f1(lx - 2.4)} ${f1(ly + 1.8)} M${f1(rx + 2.2)} ${f1(ry - 1.8)} L${f1(rx - 1.8)} ${f1(ry)} L${f1(rx + 2.2)} ${f1(ry + 1.8)}`);
    case 'shades': return `<path d="M-2.4 -3 H11.6 L11 .8 Q10 3.6 7.6 3.4 Q5.6 3.2 5 .4 H3.8 Q3.2 3.4 .8 3.6 Q-1.8 3.4 -2.4 .6Z" fill="#2B2440" ${sw(1.3)}/><path d="M-.8 -1.6 L1.8 -1.6 M6.2 -1.6 L8.4 -1.6" stroke="#9AA6FF" stroke-width="1.2" stroke-linecap="round"/>`;
  }
  return '';
}
export function browsSVG(t, c) {
  const P = {
    calm: 'M-1 -5.6 Q1.2 -7 3.4 -5.8 M5.6 -6 Q7.6 -7.2 9.4 -6',
    up: 'M-1 -7.2 Q1.2 -8.8 3.4 -7.4 M5.6 -7.6 Q7.6 -9 9.4 -7.6',
    angry: 'M-1 -7.4 L3.6 -5.4 M5.4 -5.4 L9.6 -7.6',
    worry: 'M-1 -5.2 L3.4 -7.2 M5.6 -7.2 L9.6 -5.2',
  };
  return P[t] ? `<path d="${P[t]}" stroke="${c}" stroke-width="1.8" fill="none" stroke-linecap="round"/>` : '';
}
export function mouthSVG(t) {
  const ln = d => `<path d="${d}" stroke="${O}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`;
  switch (t) {
    case 'smile': return ln('M2.6 4.4 Q5.6 7.6 8.6 4.2');
    case 'grin': return `<path d="M2.2 3.8 Q5.6 10 9.2 3.6 Q5.6 5.2 2.2 3.8Z" fill="#fff" ${sw(1.6)}/>`;
    case 'gap': return `<path d="M2.2 3.8 Q5.6 10 9.2 3.6 Q5.6 5.2 2.2 3.8Z" fill="#fff" ${sw(1.6)}/><rect x="5" y="4.6" width="1.4" height="2.4" fill="${O}"/>`;
    case 'shout': return `<path d="M2.4 3.4 Q5.6 2.6 8.8 3.4 Q9 10.4 5.6 10.6 Q2.2 10.4 2.4 3.4Z" fill="#5A1020" ${sw(1.6)}/><ellipse cx="5.8" cy="8.6" rx="2.1" ry="1.3" fill="#FF6F7E"/><path d="M3.1 3.7 H8.1 L7.9 4.9 H3.3Z" fill="#fff"/>`;
    case 'open': return `<path d="M2.4 3.6 Q5.6 3 8.8 3.6 Q8.2 9 5.6 9 Q3 9 2.4 3.6Z" fill="#5A1020" ${sw(1.6)}/><ellipse cx="5.6" cy="7.4" rx="1.9" ry="1.1" fill="#FF6F7E"/>`;
    case 'frown': return ln('M3 7.4 Q5.6 4.4 8.4 7');
    case 'o': return `<ellipse cx="5.8" cy="6" rx="1.8" ry="2.2" fill="#5A1020" ${sw(1.4)}/>`;
    case 'flat': return ln('M3.6 5.6 Q5.8 6.4 8.2 5.4');
    case 'grit': return `<path d="M2.6 4 H9 Q8.8 7.8 5.8 7.8 Q2.8 7.8 2.6 4Z" fill="#fff" ${sw(1.5)}/><path d="M3 5.7 H8.6 M5 4 V7.5 M7 4 V7.3" stroke="${O}" stroke-width=".8"/>`;
    case 'cycle': return `<g class="mA">${mouthSVG('shout')}</g><g class="mB">${mouthSVG('grin')}</g>`;
  }
  return '';
}
export function headSVG(d) {
  const r = d.r, sk = d.skin, skd = d.skinD;
  let s = d.hairBack || '';
  const ex = -r * .6;
  s += `<ellipse cx="${f1(ex)}" cy="1.4" rx="${d.earRx || 3.3}" ry="${d.earRy || 4.1}" fill="${sk}" ${sw(1.8)}/><path d="M${f1(ex - .6)} -.6 Q${f1(ex + 1)} 1.4 ${f1(ex - .4)} 3.2" stroke="${skd}" stroke-width="1.2" fill="none" stroke-linecap="round"/>`;
  s += `<circle r="${r}" fill="${sk}" ${sw(2.3)}/>`;
  s += `<path d="M${f1(-r * .25)} ${f1(r * .97)} A${r} ${r} 0 0 1 ${f1(-r * .97)} ${f1(-r * .2)} Q${f1(-r * .62)} ${f1(r * .5)} ${f1(-r * .25)} ${f1(r * .97)}Z" fill="${skd}" opacity=".45"/>`;
  s += `<path d="M${f1(r * .15)} ${f1(-r * .92)} A${r} ${r} 0 0 1 ${f1(r * .92)} ${f1(-r * .3)}" stroke="#FFF3D0" stroke-width="1.5" fill="none" stroke-linecap="round" opacity=".5"/>`;
  s += `<ellipse cx="2.4" cy="3.6" rx="2.3" ry="1.35" fill="#FF6F7E" opacity="${d.blush || .34}"/>`;
  s += d.hair || '';
  s += `<path d="M${f1(r - 1.8)} -1.4 Q${f1(r + 2.8)} 1 ${f1(r - .9)} 3.6" fill="${d.nose || sk}" ${sw(1.6)}/>`;
  for (const [k, [e, b, m]] of Object.entries(d.ex)) s += `<g data-x="${k}"${k === 'idle' ? '' : ' display="none"'}>${eyesSVG(e, sk)}${browsSVG(b, d.browC || HAIR)}${mouthSVG(m)}</g>`;
  s += d.face || '';
  s += d.hat || '';
  return s;
}
export function shoeSVG(c, sole) {
  return `<path d="M-2.8 -1.8 Q-4 2.6 -.6 2.8 H5.8 Q8.6 2.8 8 .1 Q6.8 -2.3 1.8 -2.7Z" fill="${c}" ${sw(1.7)}/><path d="M-2.6 1.7 H7.6" stroke="${sole}" stroke-width="1.3" stroke-linecap="round"/>`;
}
export function sandalSVG(skin, strap) {
  return `<path d="M-2.4 -1.8 Q-3.6 2 -.6 2.2 H5.4 Q7.8 2.2 7.4 .1 Q6.4 -1.8 1.8 -2.4Z" fill="${skin}" ${sw(1.5)}/><path d="M-2.4 2.6 H7.8" stroke="${strap}" stroke-width="2" stroke-linecap="round"/><path d="M1 -1.6 L3.4 2.2 M4.6 -1 L3.4 2.2" stroke="${strap}" stroke-width="1.5" stroke-linecap="round"/>`;
}
export function capSVG(c, cd, back) {
  const bill = `<path d="M7.2 -4.4 Q15.8 -5.8 19 -2.4 Q13 -.6 6.6 -2Z" fill="${cd}" ${sw(1.9)}/>`;
  return `${back ? `<g transform="scale(-1 1)">${bill}</g>` : ''}
    <path d="M-10.2 -2.4 Q-11 -13.8 .2 -14 Q10.8 -13.4 10.4 -3.2 Q.2 -6.6 -10.2 -2.4Z" fill="${c}" ${sw(2.1)}/>
    <path d="M.2 -13.8 Q-1.2 -8.4 -.6 -5.4" stroke="${cd}" stroke-width="1.1" fill="none"/>
    <circle cx=".2" cy="-13.9" r="1.4" fill="${cd}" ${sw(1)}/>
    <path d="M-5.6 -10.6 Q-1.6 -12.8 3 -12.4" stroke="#fff" stroke-width="1.5" fill="none" stroke-linecap="round" opacity=".6"/>
    ${back ? '' : bill}`;
}
export const NOTES = `<g transform="translate(-14 -6)"><g class="note"><path d="M0 0 V-6.4 L4.4 -7.6 V-1.4" stroke="${O}" stroke-width="1.3" fill="none"/><ellipse cx="-1" cy=".2" rx="1.7" ry="1.3" fill="#FFD21F" ${sw(1)}/><ellipse cx="3.4" cy="-1.2" rx="1.7" ry="1.3" fill="#FFD21F" ${sw(1)}/></g></g>
  <g transform="translate(-9 -12)"><g class="note" style="animation-delay:-1.2s"><path d="M0 0 V-6" stroke="${O}" stroke-width="1.3"/><path d="M0 -6 Q3 -5 2.6 -2.6" stroke="${O}" stroke-width="1.3" fill="none"/><ellipse cx="-1.1" cy=".2" rx="1.8" ry="1.35" fill="#7BE3FF" ${sw(1)}/></g></g>`;
export const KWACHA = `<g transform="rotate(-20)"><rect x="-3.2" y="-9.4" width="6.4" height="9" rx=".8" fill="#4CC36A" ${sw(1)}/><rect x="-1.4" y="-10" width="6.4" height="9" rx=".8" fill="#FF9A3C" ${sw(1)} transform="rotate(18)"/><rect x="-4.6" y="-9.4" width="6.4" height="9" rx=".8" fill="#5FA0FF" ${sw(1)} transform="rotate(-16)"/><circle cx="0" cy="-6" r="1.3" fill="#fff" opacity=".7"/></g>`;

export const PROPART = {
  sack: `<g transform="rotate(-14)">
    <path d="M-12.6 -7.4 Q-13.6 -10 -10.4 -10 Q0 -8.4 10.8 -10.2 Q13.6 -9.8 12.8 -7 Q14 0 12.6 7.2 Q13 10 10 10 Q0 8.8 -10.4 10.2 Q-13.4 10 -12.8 7.2 Q-14 0 -12.6 -7.4Z" fill="#F7F3EA" ${sw(2)}/>
    <path d="M-12.6 4 Q0 6.2 12.8 3.6 L12.6 7.2 Q13 10 10 10 Q0 8.8 -10.4 10.2 Q-13.4 10 -12.8 7.2Z" fill="#DCD3C2"/>
    <path d="M-13.2 -2.2 Q0 -1 13.4 -2.4 L13.4 1.6 Q0 2.8 -13.3 1.8Z" fill="#E3261E" ${sw(1)}/>
    <ellipse cx="-1.2" cy="-5.6" rx="2" ry="3" fill="#FFC21F" ${sw(.9)} transform="rotate(20 -1.2 -5.6)"/>
    <path d="M-3.6 -3 Q-4.6 -6 -3 -8.4 M1.4 -3 Q2.8 -6 1.6 -8.6" stroke="#2FA35A" stroke-width="1.3" fill="none" stroke-linecap="round"/>
    <path d="M4 -6.2 h5 M4 -4.4 h3.6" stroke="${O}" stroke-width="1" opacity=".55"/>
    <path d="M-12.6 -7.4 l-2.6 -2.4 M12.8 -7 l2.4 -2.6" stroke="${O}" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M-10 6 Q-11 0 -9.6 -6" stroke="#fff" stroke-width="1.4" fill="none" opacity=".8" stroke-linecap="round"/>
  </g>`,
  basin: `<ellipse cx="0" cy=".2" rx="6" ry="2" fill="${GOLD}" ${sw(1.2)}/>
    ${[[-9, -12.2], [-3, -12.8], [3, -12.6], [9, -12], [-6, -17.4], [0, -18], [6, -17.4], [-3, -22.6], [3, -22.4]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.5" fill="#E3261E" ${sw(1.3)}/><path d="M${x - 1.6} ${y - 1.4} q1 -1 2.2 -.6" stroke="#fff" stroke-width="1" fill="none" opacity=".75"/><path d="M${x - .6} ${y - 3.4} l.8 .8 l1 -1" stroke="#2FA35A" stroke-width="1.1" fill="none"/>`).join('')}
    <path d="M-14 -8.6 H14 L11 -.8 H-11Z" fill="url(#gBasin)" ${sw(2)}/>
    <rect x="-15.6" y="-10" width="31.2" height="3" rx="1.5" fill="#EEF2FF" ${sw(1.6)}/>
    <path d="M-9 -6.4 L-7.6 -2.4" stroke="#fff" stroke-width="1.4" opacity=".8" stroke-linecap="round"/>`,
  pack: `<rect x="-6.4" y="-9.6" width="12.4" height="18" rx="4.4" fill="#2F6FE0" ${sw(2)}/>
    <rect x="-5" y="0" width="9.6" height="6.8" rx="2.6" fill="#FF8A1A" ${sw(1.4)}/>
    <path d="M-2.6 -9.4 Q0 -13.2 2.6 -9.4" stroke="${O}" stroke-width="1.7" fill="none"/>
    <path d="M-4.2 -5 H4" stroke="${O}" stroke-width="1" opacity=".5"/><path d="M-4.4 -7.6 Q-5.2 -2 -4.6 3" stroke="#8EC1FF" stroke-width="1.2" fill="none" opacity=".8"/>`,
  brief: `<path d="M-3.2 3 V1 Q-3.2 -1.2 -1.4 -1.2 H1.4 Q3.2 -1.2 3.2 1 V3" stroke="${O}" stroke-width="2" fill="none"/>
    <rect x="-9.4" y="2.6" width="18.8" height="13" rx="2.2" fill="#8A4A26" ${sw(2)}/>
    <path d="M-9.4 7.4 H9.4" stroke="${O}" stroke-width="1.2" opacity=".55"/>
    <rect x="-5.4" y="6.2" width="2.4" height="2.6" rx=".6" fill="${GOLD}" ${sw(.8)}/><rect x="3" y="6.2" width="2.4" height="2.6" rx=".6" fill="${GOLD}" ${sw(.8)}/>
    <path d="M-7.6 4.6 H6" stroke="#C98A5E" stroke-width="1.2" opacity=".8"/>`,
  duffel: `<path d="M-6.6 4.4 Q-4 -.8 0 -.6 Q4 -.8 6.6 4.4" stroke="${O}" stroke-width="2.2" fill="none"/>
    <rect x="-10.6" y="3.4" width="21.2" height="10.4" rx="5.2" fill="#E3261E" ${sw(2)}/>
    <path d="M-6.4 3.8 V13.4 M6.4 3.8 V13.4" stroke="${O}" stroke-width="1.4"/>
    <path d="M-6.4 6.4 H6.4" stroke="#fff" stroke-width="1.4"/><path d="M-8.6 9.6 Q-9.2 7 -7.4 5" stroke="#FF8A8A" stroke-width="1.2" fill="none"/>`,
  suit: `<rect x="-8.6" y="-25" width="17.2" height="23" rx="3.2" fill="#C060E8" ${sw(2)}/>
    <path d="M-4 -24 V-3 M0 -24 V-3 M4 -24 V-3" stroke="#9A3CC8" stroke-width="1.3"/>
    <circle cx="-2.6" cy="-17" r="2.6" fill="${GOLD}" ${sw(1)}/><rect x="1.6" y="-11" width="5.2" height="3.6" rx=".8" fill="#22C3D6" ${sw(1)} transform="rotate(-10 4 -9)"/>
    <path d="M-6.6 -21 Q-7.2 -12 -6.4 -5" stroke="#E6A6FF" stroke-width="1.4" fill="none" stroke-linecap="round"/>
    <circle cx="-5" cy="-.8" r="1.9" fill="#2B2440" ${sw(1)}/><circle cx="5" cy="-.8" r="1.9" fill="#2B2440" ${sw(1)}/>`,
};
// how the owner carries it, and how a call boy carries it once he grabs it
export const BAGMODE = { sack: ['own', 'head'], basin: ['own', 'head'], pack: ['own', 'handN'], brief: ['own', 'handN'], duffel: ['own', 'handN'], suit: ['own', 'roll'] };
export const CARRY_HANDS = { shoulder: [1, [-1.6, -5]], head: [1, [3.6, -21.6]], handN: [1, [2, 17.6]], handF: [0, [-1, 18]], roll: [0, [-11.4, 14]], back: null };


// Namespace every id, url(#…)/href="#…" reference and class token with "mb-".
export const pfx = (html) => html
  .replace(/\sid="([^"]+)"/g, ' id="mb-$1"')
  .replace(/url\(#([^)]+)\)/g, 'url(#mb-$1)')
  .replace(/href="#([^"]+)"/g, 'href="#mb-$1"')
  .replace(/\sclass="([^"]*)"/g, (m, c) => ` class="${c.split(/\s+/).filter(Boolean).map(k => `mb-${k}`).join(' ')}"`);
