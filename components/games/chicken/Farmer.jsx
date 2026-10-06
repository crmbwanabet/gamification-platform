'use client';

import React from 'react';
import { O, GOLD, SKIN, SKIN_D, DENIM, BOOT, cid } from './rig';

// The farmer — SVG ported from the approved mock (straw hat, chitenge shirt,
// denim overalls, moustache). Drawn facing right, origin between the feet.
// motion.js poses him every frame: the root transform, the torso lean, the
// head turn, the IK'd legs/arms (`d` of the lo/lt/lc/lb/lh and ao/as/av paths),
// the eyes/mouth/brows swaps and the pupils. Idle: a slow breathe + blink.

export const FARMER_CSS = `
  .ck-svg .ck-breathe { animation: ckBreathe 2.6s ease-in-out infinite; }
  @keyframes ckBreathe { 0%,100% { transform: translateY(0) } 50% { transform: translateY(.9px) } }
  .ck-svg .ck-blink { transform-box: fill-box; transform-origin: center; animation: ckBlink 4.2s infinite; }
  @keyframes ckBlink { 0%, 93%, 100% { transform: scaleY(1) } 95.5% { transform: scaleY(.1) } }
  .ck-svg.run .ck-breathe { animation: none; }
  @media (prefers-reduced-motion: reduce) { .ck-svg .ck-breathe, .ck-svg .ck-blink { animation: none !important; } }
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

function ArmRig({ id, skin, sleeve }) {
  return (
    <g id={cid(id)}>
      <path className="ao" stroke={O} strokeWidth="11" {...limb} />
      <path className="as" stroke={skin} strokeWidth="7" {...limb} />
      <path className="av" stroke={sleeve} strokeWidth="9.4" {...limb} />
      <circle className="ah" r="5" fill={skin} stroke={O} strokeWidth="2.2" />
    </g>
  );
}

// The straw hat (also the loose copy that pops off on the landing).
export function Hat() {
  return (
    <>
      <ellipse cx="3" cy="-96.5" rx="26" ry="6.2" fill="#D9A23A" stroke={O} strokeWidth="2.4" />
      <path d="M-10.4 -97.4 Q-12.2 -114.4 3 -115.4 Q18 -114.4 16.4 -97.4 Q3 -95 -10.4 -97.4Z" fill={`url(#${cid('strawG')})`} stroke={O} strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M-10.9 -100.2 Q3 -97.6 16.9 -100.2 L17.2 -104.4 Q3.2 -101.6 -11.4 -104.4Z" fill="#E3261E" stroke={O} strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M-6.5 -106.5 Q3 -103.8 12.8 -106.6 M-7 -110.4 Q3 -108.2 12 -110.6" stroke="#B9822A" strokeWidth=".9" fill="none" opacity=".8" />
      <path d="M-22.5 -96.2 Q3 -86.6 28.5 -96.2 Q3 -92 -22.5 -96.2Z" fill="#F7CD5E" stroke={O} strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M-17 -95 l1.2 1.6 M-10 -93 l.8 1.6 M-2 -92 l.4 1.7 M6 -92 l-.2 1.7 M14 -92.6 l-.6 1.6 M21 -94.4 l-1 1.4" stroke="#B9822A" strokeWidth=".8" strokeLinecap="round" />
      <path d="M-6.6 -112 Q-3 -114 1 -114.2" stroke="#FFF2B0" strokeWidth="1.8" fill="none" strokeLinecap="round" opacity=".85" />
    </>
  );
}

export default function Farmer() {
  return (
    <g id={cid('fm')} aria-hidden>
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
          <path d="M-1.5 -70 L3.5 -64 L8.5 -70.2" fill="#19B39A" stroke={O} strokeWidth="1.5" strokeLinejoin="round" />
          {/* head */}
          <g id={cid('fmH')}>
            <rect x="-2.5" y="-73" width="9" height="8" rx="2" fill={SKIN_D} stroke={O} strokeWidth="2" />
            <ellipse cx="-12" cy="-82.5" rx="4.2" ry="5.2" fill={SKIN} stroke={O} strokeWidth="2" />
            <path d="M-12.6 -85 Q-10.6 -82.5 -12.4 -80" stroke={SKIN_D} strokeWidth="1.4" fill="none" strokeLinecap="round" />
            <circle cx="2.5" cy="-84" r="16.5" fill={`url(#${cid('fSkin')})`} stroke={O} strokeWidth="2.6" />
            <path d="M-13.8 -88 Q-15 -99.5 2.5 -101.2 Q19.5 -100.5 18.6 -90.5 Q11 -96.5 2 -95.6 Q-8 -95 -10.4 -86.5Z" fill="#1F1414" stroke={O} strokeWidth="1.6" strokeLinejoin="round" />
            <path d="M-4 -98.6 Q3 -100.4 10 -99" stroke="#6E6070" strokeWidth="1.4" fill="none" strokeLinecap="round" />
            <path d="M-13.4 -89 Q-15.8 -80 -10.6 -75.4 L-8.6 -78.6 Q-12 -83.5 -10 -90Z" fill="#1F1414" />
            <path d="M-13.2 -84 Q-13.4 -81 -12 -78.6" stroke="#9A9090" strokeWidth="1" fill="none" strokeLinecap="round" />
            <ellipse cx="-4.5" cy="-77.5" rx="3.6" ry="2.3" fill="#FF6F5E" opacity=".38" />
            <g id={cid('eyesOpen')}><g className="ck-blink">
              <ellipse cx="0" cy="-86.5" rx="4.3" ry="5.2" fill="#fff" stroke={O} strokeWidth="1.6" />
              <ellipse cx="10.2" cy="-86.5" rx="4.3" ry="5.2" fill="#fff" stroke={O} strokeWidth="1.6" />
              <circle id={cid('fpL')} cx="1.4" cy="-85.8" r="2.5" fill={O} /><circle id={cid('fpR')} cx="11.6" cy="-85.8" r="2.5" fill={O} />
              <circle cx="2.2" cy="-87.2" r=".95" fill="#fff" /><circle cx="12.4" cy="-87.2" r=".95" fill="#fff" />
            </g></g>
            <g id={cid('eyesHappy')} style={{ display: 'none' }}><path d="M-3.8 -85.5 Q0 -91 3.8 -85.5 M6.4 -85.5 Q10.2 -91 14 -85.5" stroke={O} strokeWidth="2.4" fill="none" strokeLinecap="round" /></g>
            <g id={cid('eyesDizzy')} style={{ display: 'none' }}><path d="M0 -86.5 m-3.6 0 a3.6 3.6 0 1 0 3.6 -3.6 a2.4 2.4 0 1 0 2.2 2.6 a1.2 1.2 0 1 0 -1.4 1 M10.2 -86.5 m-3.6 0 a3.6 3.6 0 1 0 3.6 -3.6 a2.4 2.4 0 1 0 2.2 2.6 a1.2 1.2 0 1 0 -1.4 1" stroke={O} strokeWidth="1.5" fill="none" strokeLinecap="round" /></g>
            <path id={cid('brows')} d="M-4.6 -93.6 Q0 -96.2 4 -93.8 M6.4 -93.8 Q10.6 -96.2 14.6 -93.4" stroke="#1F1414" strokeWidth="2.7" fill="none" strokeLinecap="round" />
            <ellipse cx="16.4" cy="-80.4" rx="4.4" ry="3.8" fill={SKIN} stroke={O} strokeWidth="2" />
            <ellipse cx="15.6" cy="-81.6" rx="1.6" ry="1" fill="#C98A62" opacity=".8" />
            <g id={cid('mSmile')}><path d="M5.6 -72.4 Q12 -66 18.8 -72.6 Q12 -70.2 5.6 -72.4Z" fill="#fff" stroke={O} strokeWidth="1.7" strokeLinejoin="round" /></g>
            <g id={cid('mGrit')} style={{ display: 'none' }}><path d="M5.2 -73.2 H19.2 Q18.8 -67.4 12.2 -67.4 Q5.6 -67.4 5.2 -73.2Z" fill="#fff" stroke={O} strokeWidth="1.7" strokeLinejoin="round" /><path d="M6.2 -70.4 H18.2 M10 -73 V-67.8 M14.4 -73 V-67.8" stroke={O} strokeWidth=".9" /></g>
            <g id={cid('mJoy')} style={{ display: 'none' }}><path d="M4 -73.6 Q12 -58.5 20.4 -73.6Z" fill="#5A1020" stroke={O} strokeWidth="1.8" strokeLinejoin="round" /><ellipse cx="12.4" cy="-65.4" rx="4.4" ry="2.6" fill="#FF6F7E" /><path d="M5.2 -73.2 H19.2 L18.4 -70.8 H6Z" fill="#fff" /></g>
            <g id={cid('mOops')} style={{ display: 'none' }}><ellipse cx="12.6" cy="-69.6" rx="3.2" ry="3.9" fill="#5A1020" stroke={O} strokeWidth="1.7" /></g>
            <path d="M5.2 -76.2 Q9.6 -79.4 14.4 -77 Q19.2 -79.4 22.2 -75.6 Q19.6 -72.8 14.6 -74.6 Q9.8 -72.6 5.2 -76.2Z" fill="#3B2B2B" stroke={O} strokeWidth="1.3" strokeLinejoin="round" />
            <path d="M8.6 -76.2 l1.6 -.8 M12.2 -76.4 l1.2 -.6 M17.4 -76.6 l1.4 .4" stroke="#B9AFAF" strokeWidth=".8" strokeLinecap="round" />
            <g id={cid('fmHat')}><Hat /></g>
          </g>
          <ArmRig id="armN" skin={SKIN} sleeve="#FF7A1A" />
        </g>
      </g>
    </g>
  );
}
