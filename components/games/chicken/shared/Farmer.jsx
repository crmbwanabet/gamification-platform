'use client';

import React from 'react';
import { O, GOLD, SKIN, SKIN_D, DENIM, BOOT, BEARD, GREY, cid } from './rig';

// The farmer — a weathered, friendly old hand: squinting sun-crinkled eyes with
// crow's feet, bushy grey-flecked brows, a broad bulb nose, cheek lines, a short
// salt-and-pepper beard and moustache, a grass stalk in his mouth and a battered
// straw hat with a sweat-stained leather band. Chitenge shirt, red neckerchief,
// denim overalls. Drawn facing right, origin between the feet.
// The motion renderers (actors.js) pose him every frame: the root transform,
// the torso lean, the head turn, the IK'd legs/arms (`d` of the lo/lt/lc/lb/lh
// and ao/as/av paths, the hand transform + open/fist swap), the eyes/mouth/brows
// swaps, the lids (squint) and the pupils. Idle: a slow breathe + blink.

export const FARMER_CSS = `
  .ck-svg .ck-breathe { animation: ckBreathe 2.6s ease-in-out infinite; }
  @keyframes ckBreathe { 0%,100% { transform: translateY(0) } 50% { transform: translateY(.9px) } }
  .ck-svg .ck-blink { transform-box: fill-box; transform-origin: center; animation: ckBlink 4.2s infinite; }
  @keyframes ckBlink { 0%, 93%, 100% { transform: scaleY(1) } 95.5% { transform: scaleY(.1) } }
  .ck-svg .ck-grass { transform-box: fill-box; transform-origin: 0% 100%; animation: ckGrass 3.2s ease-in-out infinite; }
  @keyframes ckGrass { 0%,100% { transform: rotate(0) } 50% { transform: rotate(-8deg) } }
  .ck-svg.run .ck-breathe, .ck-svg.run .ck-grass { animation: none; }
  @media (prefers-reduced-motion: reduce) { .ck-svg .ck-breathe, .ck-svg .ck-blink, .ck-svg .ck-grass { animation: none !important; } }
`;

const limb = { fill: 'none', strokeLinecap: 'round', strokeLinejoin: 'round' };

function LegRig({ id, thigh, cuff, hl }) {
  return (
    <g id={cid(id)} {...limb}>
      <path className="lo" stroke={O} strokeWidth="12.5" />
      <path className="lt" stroke={thigh} strokeWidth="8.6" />
      <path className="lc" stroke={cuff} strokeWidth="9.6" />
      <path className="lb" stroke={BOOT} strokeWidth="9.4" />
      <path className="lh" stroke={hl} strokeWidth="1.6" />
    </g>
  );
}

// Open hand (palm + spread fingers + thumb) pointing along +x, or a fist.
const FINGERS = 'M3 -2.4 L8.8 -5.6 M4 -.7 L10.2 -1.9 M4 1 L10 2.2 M3 2.6 L8.4 5.2';
const THUMB = 'M-.4 -3.2 L1.8 -8';
function ArmRig({ id, skin, sleeve }) {
  return (
    <g id={cid(id)}>
      <path className="ao" stroke={O} strokeWidth="11" {...limb} />
      <path className="as" stroke={skin} strokeWidth="7" {...limb} />
      <path className="av" stroke={sleeve} strokeWidth="9.4" {...limb} />
      <g className="ah">
        <g className="hOpen">
          <path d={`${FINGERS} ${THUMB}`} stroke={O} strokeWidth="4.8" {...limb} />
          <ellipse cx="1" cy="0" rx="5.2" ry="4.6" fill={skin} stroke={O} strokeWidth="2.2" />
          <path d={`${FINGERS} ${THUMB}`} stroke={skin} strokeWidth="2.6" {...limb} />
          <path d="M-1 -1.6 Q1.4 -.4 1 2.2" stroke={O} strokeOpacity=".35" strokeWidth=".9" fill="none" strokeLinecap="round" />
        </g>
        <circle className="hFist" r="5" fill={skin} stroke={O} strokeWidth="2.2" style={{ display: 'none' }} />
      </g>
    </g>
  );
}

// The battered straw hat with its sweat band (also the loose copy that pops
// off on the landing). Pushed back a little so the brows show.
export function Hat() {
  return (
    <g transform="translate(0 -2.4)">
      <ellipse cx="3" cy="-96.5" rx="27" ry="6.4" fill="#D9A23A" stroke={O} strokeWidth="2.4" />
      <path d="M-10.6 -97.4 Q-12.8 -113.6 -2.6 -115.8 Q3 -112.6 8.6 -115.8 Q18.6 -113.6 16.6 -97.4 Q3 -95 -10.6 -97.4Z" fill={`url(#${cid('strawG')})`} stroke={O} strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M-6.5 -106.8 Q3 -104 12.8 -106.8 M-7.6 -110.6 Q-2 -109.2 1.6 -110.4 M5 -110.4 Q8.6 -109.2 12.4 -110.8" stroke="#B9822A" strokeWidth=".9" fill="none" opacity=".8" />
      {/* leather sweat band, darkened where it sits on his brow */}
      <path d="M-11 -100 Q3 -97.4 17 -100 L17.3 -104.4 Q3.2 -101.6 -11.5 -104.4Z" fill="#7A4524" stroke={O} strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M-5 -99.6 Q2 -98.2 8 -99.4 Q5.5 -102.2 -2.4 -102Z" fill="#3E1E0C" opacity=".55" />
      <path d="M-8.6 -102.6 h1.6 M-3.4 -101.8 h1.6 M2 -101.4 h1.6 M7.4 -101.6 h1.6 M12.6 -102.4 h1.6" stroke="#C98A52" strokeWidth=".7" strokeLinecap="round" />
      <path d="M-24 -96.2 Q3 -86.4 30 -96.2 Q3 -92 -24 -96.2Z" fill="#F7CD5E" stroke={O} strokeWidth="1.6" strokeLinejoin="round" />
      {/* frayed brim edge */}
      <path d="M-20.6 -94.4 l-.9 2 M-15.2 -92.4 l-.4 2.1 M-9 -91 l-.2 2.1 M-2.6 -90.4 l.2 2.1 M3.8 -90.4 l.3 2 M10 -90.8 l.5 2 M16.4 -91.8 l.8 1.9 M22.4 -93.4 l1 1.7 M27 -95 l1.2 1.4" stroke="#B9822A" strokeWidth="1" strokeLinecap="round" />
      <path d="M-7 -112 Q-3.6 -114 .4 -114" stroke="#FFF2B0" strokeWidth="1.8" fill="none" strokeLinecap="round" opacity=".85" />
    </g>
  );
}

// Eye geometry (head space): almond white, pupil (moved by the renderer and
// clipped to the almond), a heavy upper lid (lowered for the squint), crow's
// feet at the outer corners.
const EYE = (cx) => `M${cx - 4.7} -86 Q${cx} -92.4 ${cx + 4.7} -86 Q${cx} -81.6 ${cx - 4.7} -86Z`;
const LID = (cx) => `M${cx - 5.4} -85.4 Q${cx} -95.4 ${cx + 5.4} -85.4 Q${cx} -90.4 ${cx - 5.4} -85.4Z`;
const LID_LINE = (cx) => `M${cx - 5} -85.8 Q${cx} -90.6 ${cx + 5} -85.8`;

export default function Farmer() {
  return (
    <g id={cid('fm')} aria-hidden>
      <defs>
        <clipPath id={cid('eyeClipL')}><path d={EYE(1.2)} /></clipPath>
        <clipPath id={cid('eyeClipR')}><path d={EYE(12)} /></clipPath>
      </defs>
      <g className="ck-breathe">
        <LegRig id="legF" thigh="#24479E" cuff="#4F7FE6" hl="#5E5788" />
        <LegRig id="legN" thigh={DENIM} cuff="#6D97F0" hl="#6E68A0" />
        <g id={cid('fmT')}>
          <ArmRig id="armF" skin={SKIN_D} sleeve="#D85E10" />
          {/* trousers top + shirt */}
          <path d="M-15 -45 H16.5 L18.2 -31 Q1 -26.5 -16.8 -31Z" fill={DENIM} stroke={O} strokeWidth="2.4" strokeLinejoin="round" />
          <path d="M-12.6 -67.5 Q2 -72.5 15.2 -67.5 Q20 -53 16.4 -40.5 Q1 -37.5 -14.4 -40.5 Q-18 -53 -12.6 -67.5Z" fill={`url(#${cid('chit')})`} stroke={O} strokeWidth="2.4" strokeLinejoin="round" />
          <path d="M9 -69.4 Q15.5 -68.5 15.2 -67.5 Q20 -53 16.4 -40.5 L11.5 -39.6 Q16 -53 9 -69.4Z" fill="#7A1E00" opacity=".28" />
          <path d="M-10.5 -64 Q-13.6 -54 -12 -45" stroke="#FFD08A" strokeWidth="1.8" fill="none" strokeLinecap="round" opacity=".7" />
          {/* overall bib + straps */}
          <path d="M-3.5 -57.5 H12.5 L12 -42 H-3Z" fill={DENIM} stroke={O} strokeWidth="2" strokeLinejoin="round" />
          <path d="M-.5 -53.5 H9.5 V-47.5 H-.5Z" fill="none" stroke="#1E3A80" strokeWidth="1.1" />
          <path d="M-2.6 -56.8 L-8.5 -67.2 M11.6 -56.8 L12.4 -68.6" stroke={O} strokeWidth="5" strokeLinecap="round" />
          <path d="M-2.6 -56.8 L-8.5 -67.2 M11.6 -56.8 L12.4 -68.6" stroke={DENIM} strokeWidth="3" strokeLinecap="round" />
          <circle cx="-2.4" cy="-56" r="1.7" fill={GOLD} stroke={O} strokeWidth="1" /><circle cx="11.4" cy="-56" r="1.7" fill={GOLD} stroke={O} strokeWidth="1" />
          {/* red neckerchief */}
          <path d="M-3 -70.6 L4.4 -62.6 L11 -70.8 Q4 -68.2 -3 -70.6Z" fill="#E3261E" stroke={O} strokeWidth="1.5" strokeLinejoin="round" />
          {/* head */}
          <g id={cid('fmH')}>
            <rect x="-2.5" y="-73" width="9" height="8" rx="2" fill={SKIN_D} stroke={O} strokeWidth="2" />
            {/* ear */}
            <ellipse cx="-11.6" cy="-82.6" rx="4.4" ry="5.4" fill={SKIN} stroke={O} strokeWidth="2" />
            <path d="M-12.4 -85.2 Q-10.2 -82.6 -12.2 -80" stroke={SKIN_D} strokeWidth="1.4" fill="none" strokeLinecap="round" />
            {/* head: broad cheekbones, square weathered jaw */}
            <path d="M-12.8 -88 C-13.6 -99 -3 -102.5 5 -102 C14 -101.5 19.6 -95 19.6 -87.5 L20.6 -80 C21.4 -72 18.6 -65.6 11.4 -64.8 C4 -64.2 -5.4 -66.4 -9.6 -71.6 C-13.4 -76.4 -13.2 -82.6 -12.8 -88Z"
              fill={`url(#${cid('fSkin')})`} stroke={O} strokeWidth="2.6" strokeLinejoin="round" />
            {/* short grey-black hair under the hat, grey at the temple */}
            <path d="M-12.8 -89.6 C-13.6 -96 -8 -99.6 -2 -99.8 L-3 -95.4 C-8 -94.4 -10.4 -91.2 -10.2 -86.6 L-9.4 -80 L-12.6 -81.2 C-13.4 -84 -13.2 -87 -12.8 -89.6Z" fill="#2E2422" />
            <path d="M-11.6 -88.4 Q-12 -84.4 -10.8 -81.4 M-9 -94.6 Q-6.6 -96.4 -3.6 -96.8" stroke="#A39892" strokeWidth="1.1" fill="none" strokeLinecap="round" />
            {/* sun-warmed cheek */}
            <ellipse cx="9" cy="-79" rx="4" ry="2.4" fill="#FF6F5E" opacity=".3" />
            {/* short salt-and-pepper beard along the jaw */}
            <path d="M-9.2 -77.6 C-8.6 -70.6 -1 -64.6 10.8 -64.4 C18.2 -64.4 21.4 -68.8 21.2 -73.4 C18.6 -70.4 15 -69.4 11.6 -70.2 C6.6 -70.6 1 -72.4 -3 -75.4 C-5.4 -77 -7.4 -77.8 -9.2 -77.6Z"
              fill={BEARD} opacity=".82" />
            <g fill={GREY}>
              {[[-6, -72.6], [-2.6, -69.4], [1.6, -67.4], [6, -66.2], [10.6, -65.8], [15, -66.4], [18.6, -68.2], [-3.6, -73.6], [3.8, -69.2], [8.6, -68], [13, -68.2]].map(([x, y], k) => <circle key={k} cx={x} cy={y} r=".55" />)}
            </g>
            {/* cheek line (nose to mouth) + under-eye creases */}
            <path d="M16.2 -78.6 Q13.4 -75.8 14.2 -73" stroke={SKIN_D} strokeWidth="1.2" fill="none" strokeLinecap="round" />
            <path d="M-1.2 -83 Q1.6 -81.8 4.4 -83 M8.6 -83 Q11.6 -81.8 14.6 -83" stroke={SKIN_D} strokeWidth=".9" fill="none" strokeLinecap="round" opacity=".8" />
            {/* eyes: squinting, sun-crinkled */}
            <g id={cid('eyesOpen')}>
              <g className="ck-blink">
                <path d={EYE(1.2)} fill="#FFF8EA" stroke={O} strokeWidth="1.3" />
                <path d={EYE(12)} fill="#FFF8EA" stroke={O} strokeWidth="1.3" />
                <g clipPath={`url(#${cid('eyeClipL')})`}><circle id={cid('fpL')} cx="1.6" cy="-86.4" r="2.6" fill="#3A2416" /></g>
                <g clipPath={`url(#${cid('eyeClipR')})`}><circle id={cid('fpR')} cx="12.4" cy="-86.4" r="2.6" fill="#3A2416" /></g>
                <g id={cid('lids')}>
                  <path d={LID(1.2)} fill={SKIN} />
                  <path d={LID(12)} fill={SKIN} />
                  <path d={`${LID_LINE(1.2)} ${LID_LINE(12)}`} stroke={O} strokeWidth="1.8" fill="none" strokeLinecap="round" />
                </g>
              </g>
            </g>
            <g id={cid('eyesHappy')} style={{ display: 'none' }}>
              <path d="M-3 -85.2 Q1.2 -90.6 5.4 -85.2 M7.8 -85.2 Q12 -90.6 16.2 -85.2" stroke={O} strokeWidth="2.3" fill="none" strokeLinecap="round" />
            </g>
            <g id={cid('eyesDizzy')} style={{ display: 'none' }}>
              <path d="M1.2 -86.4 m-3.4 0 a3.4 3.4 0 1 0 3.4 -3.4 a2.3 2.3 0 1 0 2.1 2.5 a1.1 1.1 0 1 0 -1.3 1 M12 -86.4 m-3.4 0 a3.4 3.4 0 1 0 3.4 -3.4 a2.3 2.3 0 1 0 2.1 2.5 a1.1 1.1 0 1 0 -1.3 1" stroke={O} strokeWidth="1.5" fill="none" strokeLinecap="round" />
            </g>
            {/* crow's feet at the outer corners */}
            <path d="M17.6 -87.8 l2.4 -1.5 M18 -86 l2.6 -.1 M17.6 -84.4 l2.2 1.2 M-4.2 -87.6 l-2 -1.1 M-4.4 -85.8 l-2.1 .3" stroke={SKIN_D} strokeWidth="1.1" strokeLinecap="round" />
            <path id={cid('brows')} d="M-4 -92 Q1 -95 5.6 -92.8 M7.6 -92.8 Q12.4 -95.2 17 -92" stroke="#5E524E" strokeWidth="3.3" fill="none" strokeLinecap="round" />
            {/* broad bulb nose */}
            <path d="M16.6 -87.4 Q25.2 -87.6 25 -81.2 Q24.8 -76.4 19.6 -76.8 Q16.2 -77.2 16.4 -80.6Z" fill={SKIN} stroke={O} strokeWidth="2" strokeLinejoin="round" />
            <ellipse cx="20.6" cy="-78.6" rx="1.4" ry=".8" fill={SKIN_D} />
            <circle cx="22" cy="-83.4" r="1.2" fill="#C98A62" />
            {/* mouths */}
            <g id={cid('mSmile')}>
              <path d="M12.4 -72.8 Q17.4 -68.4 22.4 -72.6" stroke={O} strokeWidth="1.8" fill="none" strokeLinecap="round" />
              <path d="M14.4 -71.2 Q17.4 -69.8 20.4 -71" stroke="#C94A3A" strokeWidth="1.1" fill="none" strokeLinecap="round" />
            </g>
            <g id={cid('mSet')} style={{ display: 'none' }}><path d="M12.6 -71.8 Q17.6 -70.2 22.2 -72.4" stroke={O} strokeWidth="2" fill="none" strokeLinecap="round" /></g>
            <g id={cid('mGrit')} style={{ display: 'none' }}>
              <path d="M11.8 -73.4 H22.6 Q22.2 -68 17.2 -68 Q12.2 -68 11.8 -73.4Z" fill="#fff" stroke={O} strokeWidth="1.6" strokeLinejoin="round" />
              <path d="M12.6 -70.8 H21.8 M15.2 -73.2 V-68.4 M18.8 -73.2 V-68.4" stroke={O} strokeWidth=".8" />
            </g>
            <g id={cid('mJoy')} style={{ display: 'none' }}>
              <path d="M11.2 -73.8 Q17.2 -60.8 23.6 -73.8Z" fill="#5A1020" stroke={O} strokeWidth="1.8" strokeLinejoin="round" />
              <ellipse cx="17.4" cy="-66.2" rx="3.8" ry="2.4" fill="#FF6F7E" /><path d="M12.2 -73.4 H22.6 L22 -71.2 H12.8Z" fill="#fff" />
            </g>
            <g id={cid('mOops')} style={{ display: 'none' }}><ellipse cx="17.4" cy="-70" rx="2.9" ry="3.6" fill="#5A1020" stroke={O} strokeWidth="1.7" /></g>
            {/* bushy moustache */}
            <path d="M10.2 -76.4 Q14.6 -80 19.2 -77.4 Q23.8 -79.6 26.4 -75.4 Q23.4 -72.4 19.2 -74.6 Q14.4 -72.2 10.2 -76.4Z" fill={BEARD} stroke={O} strokeWidth="1.3" strokeLinejoin="round" />
            <path d="M13.6 -76.6 l1.6 -.6 M17.6 -76.8 l1.2 -.4 M21.6 -76.6 l1.4 .4" stroke={GREY} strokeWidth=".8" strokeLinecap="round" />
            {/* a grass stalk in the corner of his mouth */}
            <g id={cid('grass')}><g className="ck-grass">
              <path d="M20.6 -72.4 Q27.6 -74 34 -81" stroke={O} strokeWidth="2.6" fill="none" strokeLinecap="round" />
              <path d="M20.6 -72.4 Q27.6 -74 34 -81" stroke="#A6D85A" strokeWidth="1.2" fill="none" strokeLinecap="round" />
              {[[33.2, -82.6, -20], [35.6, -83.4, 40], [34.6, -85.6, -10], [36.6, -86.4, 45], [35.6, -88.4, 0]].map(([x, y, r], k) => (
                <ellipse key={k} cx={x} cy={y} rx="1.9" ry="1" transform={`rotate(${r - 50} ${x} ${y})`} fill="#E8D070" stroke={O} strokeWidth=".8" />
              ))}
            </g></g>
            <g id={cid('fmHat')}><Hat /></g>
          </g>
          <ArmRig id="armN" skin={SKIN} sleeve="#FF7A1A" />
        </g>
      </g>
    </g>
  );
}
