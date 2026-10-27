'use client';

import React from 'react';

// A passenger waiting at the stop (from the approved design, Rider.dc.html).
// Drawn in a 56×112 box (feet at y≈107), placed with a <g transform>.
// who = look 0..6; state:
//   hidden  — "?" over the head (the player can call them)
//   idle    — before the round
//   pay     — the one you called pays (waves a note, PAID!)
//   nopay   — the one you called has no money (empty hands, NO MONEY!)
//   payer / nopayer — the others, shown after the call (HAD MONEY / NO MONEY)

const O = '#2A0A4F';

export const LOOKS = [
  { skirt: 1, skin: '#4A2C1C', top: '#FF8A1F', sleeve: '#FF8A1F', wrap: '#C8342C', wrapLine: '#FFD21F', wrapDot: '#F4F1E8', wrapColor: '#FF8A1F', shoes: '#8A5A32', headwrap: 1, basket: 1 },
  { trousers: 1, skin: '#5A3420', top: '#1E63E6', sleeve: '#F4F1E8', legs: '#4A4A54', shoes: '#1A1A1A', shortHair: 1, straps: 1, backpack: 1 },
  { trousers: 1, skin: '#3B2216', top: '#6A6A78', sleeve: '#6A6A78', legs: '#6A6A78', shoes: '#1A1A1A', shortHair: 1, tie: 1, tieColor: '#E3261E', briefcase: 1 },
  { trousers: 1, skin: '#4A2C1C', top: '#8A5A32', sleeve: '#8A5A32', legs: '#4A4038', shoes: '#3A2418', greyBeard: 1, flatCap: 1, stick: 1 },
  { skirt: 1, skin: '#5A3420', top: '#F4F1E8', sleeve: '#F4F1E8', wrap: '#43C21A', wrapLine: '#2A7D0E', wrapDot: '#FFD21F', wrapColor: '#43C21A', shoes: '#E3261E', headwrap: 1, baby: 1 },
  { trousers: 1, skin: '#4A2C1C', top: '#C8342C', sleeve: '#C8342C', legs: '#3E5A80', shoes: '#F4F4F2', capBack: 1, tshirtLogo: 1 },
  { trousers: 1, skin: '#3B2216', top: '#7FC3EA', sleeve: '#7FC3EA', legs: '#7FC3EA', shoes: '#F4F4F2', nurseCap: 1, scrubs: 1 },
];

const TAGS = { pay: 'PAID!', payer: 'HAD MONEY', nopay: 'NO MONEY!', nopayer: 'NO MONEY' };

function Arm({ d, sleeve }) {
  return (
    <>
      <path d={d} stroke={O} strokeWidth="9" strokeLinecap="round" fill="none" />
      <path d={d} stroke={sleeve} strokeWidth="6" strokeLinecap="round" fill="none" />
    </>
  );
}

export default function Rider({ who = 0, state = 'hidden' }) {
  const L = LOOKS[((who % LOOKS.length) + LOOKS.length) % LOOKS.length];
  const happy = state === 'pay', sad = state === 'nopay';
  const smile = happy || state === 'payer';
  const legs = L.legs || '#3A3A44';
  const wrapLine = L.wrapLine || '#FFD21F', wrapDot = L.wrapDot || '#F4F1E8', wrapColor = L.wrapColor || '#FF8A1F';
  const tagDy = L.basket ? -14 : 0;
  const tag = TAGS[state];
  const good = state === 'pay' || state === 'payer';

  return (
    <g>
      <ellipse cx="28" cy="109" rx="17" ry="3.2" fill="rgba(0,0,0,.3)" />

      {L.trousers && (
        <g>
          <path d="M22 70V104M34 70V104" stroke={O} strokeWidth="10" strokeLinecap="round" />
          <path d="M22 70V104M34 70V104" stroke={legs} strokeWidth="7" strokeLinecap="round" />
        </g>
      )}
      {L.skirt && (
        <g>
          <path d="M22 92V104M34 92V104" stroke={L.skin} strokeWidth="5.5" strokeLinecap="round" />
          <path d="M15 66H41L44 96H12Z" fill={L.wrap || '#C8342C'} stroke={O} strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M14 76H42M13 86H43" stroke={wrapLine} strokeWidth="2.6" />
          <path d="M17 81L21 77L25 81L29 77L33 81L37 77L41 81" stroke={wrapDot} strokeWidth="1.6" fill="none" />
        </g>
      )}
      <path d="M15 107Q15 102 22 102Q27 102 27 107Z" fill={L.shoes} stroke={O} strokeWidth="1.8" />
      <path d="M29 107Q29 102 34 102Q41 102 41 107Z" fill={L.shoes} stroke={O} strokeWidth="1.8" />

      {L.baby && (
        <g>
          <circle cx="40" cy="38" r="7" fill="#5A3420" stroke={O} strokeWidth="1.6" />
          <path d="M37 37Q38.5 36 40 37" stroke={O} strokeWidth="1" fill="none" />
          <path d="M12 46Q28 40 46 44L44 60Q28 62 13 58Z" fill={wrapLine} stroke={O} strokeWidth="1.6" />
        </g>
      )}
      {L.backpack && <rect x="8" y="42" width="40" height="26" rx="6" fill="#E3261E" stroke={O} strokeWidth="2" />}

      <path d="M14 46Q14 40 21 39H35Q42 40 42 46L41 72H15Z" fill={L.top} stroke={O} strokeWidth="2.2" strokeLinejoin="round" />
      {L.tie && (
        <g>
          <path d="M24 39L28 50L32 39Z" fill="#F4F1E8" stroke={O} strokeWidth="1.2" />
          <path d="M26.8 41H29.2L30.2 54L28 57.5L25.8 54Z" fill={L.tieColor || '#E3261E'} stroke={O} strokeWidth="1.1" />
          <path d="M24 39L26.5 50L22 47L21 40M32 39L29.5 50L34 47L35 40" fill={L.top} stroke={O} strokeWidth="1.2" strokeLinejoin="round" />
        </g>
      )}
      {L.straps && (
        <g>
          <path d="M19 40V64M37 40V64" stroke="#991510" strokeWidth="3.4" />
          <rect x="23" y="44" width="10" height="7" rx="1" fill="#F4F1E8" stroke={O} strokeWidth="1" />
        </g>
      )}
      {L.tshirtLogo && (
        <g>
          <circle cx="28" cy="52" r="5" fill="#FFD21F" stroke={O} strokeWidth="1.2" />
          <path d="M25.5 52H30.5M28 49.5V54.5" stroke={O} strokeWidth="1.4" />
        </g>
      )}
      {L.scrubs && (
        <g>
          <path d="M23 39L28 46L33 39" stroke={O} strokeWidth="1.4" fill="none" />
          <rect x="31" y="49" width="7" height="6" rx="1" fill="none" stroke={O} strokeWidth="1.1" />
          <path d="M33 47V51" stroke="#E3261E" strokeWidth="1.6" />
        </g>
      )}

      {!happy && !sad && (
        <g>
          <Arm d="M16 44Q11 56 13 68" sleeve={L.sleeve} />
          <Arm d="M40 44Q45 56 43 68" sleeve={L.sleeve} />
          <circle cx="13" cy="70" r="3.6" fill={L.skin} stroke={O} strokeWidth="1.5" />
          <circle cx="43" cy="70" r="3.6" fill={L.skin} stroke={O} strokeWidth="1.5" />
        </g>
      )}
      {happy && (
        <g>
          <Arm d="M16 44Q11 56 13 68" sleeve={L.sleeve} />
          <circle cx="13" cy="70" r="3.6" fill={L.skin} stroke={O} strokeWidth="1.5" />
          <Arm d="M40 44Q50 36 48 22" sleeve={L.sleeve} />
          <rect x="42" y="6" width="20" height="11" rx="1.5" fill="#43C21A" stroke={O} strokeWidth="1.6" transform="rotate(-14 52 11)" />
          <circle cx="52" cy="11" r="3" fill="none" stroke="#2A7D0E" strokeWidth="1.2" transform="rotate(-14 52 11)" />
          <circle cx="48" cy="19" r="3.8" fill={L.skin} stroke={O} strokeWidth="1.5" />
        </g>
      )}
      {sad && (
        <g>
          <Arm d="M16 44Q6 52 4 60" sleeve={L.sleeve} />
          <Arm d="M40 44Q50 52 52 60" sleeve={L.sleeve} />
          <ellipse cx="3" cy="61" rx="4.5" ry="3" fill={L.skin} stroke={O} strokeWidth="1.5" />
          <ellipse cx="53" cy="61" rx="4.5" ry="3" fill={L.skin} stroke={O} strokeWidth="1.5" />
          <path d="M18 70Q16 76 21 76Q24 74 22 70Z M38 70Q40 76 35 76Q32 74 34 70Z" fill="#F4F1E8" stroke={O} strokeWidth="1.2" />
        </g>
      )}
      {L.briefcase && !happy && !sad && (
        <g>
          <rect x="38" y="68" width="16" height="12" rx="2" fill="#5A3A22" stroke={O} strokeWidth="1.6" />
          <path d="M43 68V65H49V68" stroke={O} strokeWidth="1.6" fill="none" />
        </g>
      )}
      {L.stick && !sad && (
        <g>
          <path d="M10 66V106" stroke={O} strokeWidth="4.5" strokeLinecap="round" />
          <path d="M10 66V106" stroke="#7A4A22" strokeWidth="2.4" strokeLinecap="round" />
        </g>
      )}

      <rect x="24" y="32" width="8" height="8" fill={L.skin} />
      <ellipse cx="17.5" cy="22" rx="2.6" ry="3.4" fill={L.skin} stroke={O} strokeWidth="1.4" />
      <ellipse cx="38.5" cy="22" rx="2.6" ry="3.4" fill={L.skin} stroke={O} strokeWidth="1.4" />
      <ellipse cx="28" cy="22" rx="10.5" ry="12" fill={L.skin} stroke={O} strokeWidth="2" />
      {L.shortHair && <path d="M18 20Q17 9 28 9Q39 9 38 20Q36 14 28 14Q20 14 18 20Z" fill="#1A1A1A" stroke={O} strokeWidth="1.3" />}
      {L.greyBeard && <path d="M19 24Q20 35 28 35Q36 35 37 24Q34 30 28 30Q22 30 19 24Z" fill="#D8D2C4" stroke={O} strokeWidth="1" />}
      <ellipse cx="24" cy="21.5" rx="2.2" ry="1.9" fill="#FFFFFF" stroke={O} strokeWidth=".8" />
      <ellipse cx="32" cy="21.5" rx="2.2" ry="1.9" fill="#FFFFFF" stroke={O} strokeWidth=".8" />
      <circle cx="24.2" cy="21.8" r="1.15" fill={O} />
      <circle cx="32.2" cy="21.8" r="1.15" fill={O} />
      <path d={sad ? 'M21 18L26 16.5M30 16.5L35 18' : 'M21 17.2Q24 15.8 27 17.2M29 17.2Q32 15.8 35 17.2'} stroke="#1A1A1A" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      <path d="M27 22.5Q26.4 25.5 28 26Q29.6 25.5 29 22.5" stroke="rgba(0,0,0,.35)" strokeWidth="1" fill="none" />
      <path d={smile ? 'M23.5 27Q28 32 32.5 27Z' : sad ? 'M24 30Q28 26.5 32 30' : 'M24.5 28Q28 29.5 31.5 28'}
        stroke={O} strokeWidth="1.5" strokeLinecap="round" fill={smile ? '#FFFFFF' : 'none'} />

      {L.headwrap && (
        <g>
          <path d="M17 18Q15 1 28 0Q41 1 39 18Q36 10 28 10Q20 10 17 18Z" fill={wrapColor} stroke={O} strokeWidth="1.8" />
          <path d="M20 9Q28 2 36 9" stroke={wrapDot} strokeWidth="2" fill="none" />
          <path d="M34 2Q43 -4 44 4Q41 3 38 6Z" fill={wrapColor} stroke={O} strokeWidth="1.5" />
        </g>
      )}
      {L.basket && (
        <g>
          <ellipse cx="28" cy="-1" rx="15" ry="4" fill="#C8A060" stroke={O} strokeWidth="1.6" />
          {[[20, -5], [27, -7], [34, -5], [24, -11], [31, -11]].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="4" fill="#E3261E" stroke={O} strokeWidth="1" />
          ))}
        </g>
      )}
      {L.flatCap && (
        <g>
          <path d="M17 15Q17 5 28 5Q39 5 39 14Z" fill="#6A5A48" stroke={O} strokeWidth="1.8" />
          <path d="M15 15Q28 11 41 16Q41 18 38 17.5Q28 14.5 17 17Z" fill="#5A4A38" stroke={O} strokeWidth="1.6" />
        </g>
      )}
      {L.capBack && (
        <g>
          <path d="M17 16Q17 5 28 5Q39 5 39 16Z" fill="#1E63E6" stroke={O} strokeWidth="1.8" />
          <path d="M12 13Q14 10 19 11L18 15Q14 15 12 13Z" fill="#1E63E6" stroke={O} strokeWidth="1.4" />
          <path d="M16 20Q16 8 28 8Q40 8 40 20" stroke="#2A2A34" strokeWidth="2.4" fill="none" />
          <rect x="13" y="18" width="6" height="9" rx="2.5" fill="#2A2A34" stroke={O} strokeWidth="1.2" />
          <rect x="37" y="18" width="6" height="9" rx="2.5" fill="#2A2A34" stroke={O} strokeWidth="1.2" />
        </g>
      )}
      {L.nurseCap && (
        <g>
          <path d="M19 12Q19 6 28 6Q37 6 37 12Z" fill="#F4F4F2" stroke={O} strokeWidth="1.6" />
          <path d="M26 8H30M28 6.5V10" stroke="#E3261E" strokeWidth="1.6" />
          <path d="M18 18Q17 11 20 11M38 18Q39 11 36 11" stroke="#1A1A1A" strokeWidth="3" fill="none" />
        </g>
      )}

      {state === 'hidden' && (
        <g transform={`translate(0 ${tagDy})`}>
          <circle cx="28" cy="-14" r="10" fill="#FFD21F" stroke={O} strokeWidth="2.4" />
          <text x="28" y="-8.5" textAnchor="middle" fill={O} style={{ fontFamily: "var(--font-game), 'Lilita One', sans-serif", fontSize: 15 }}>?</text>
        </g>
      )}
      {tag && (
        <g transform={`translate(0 ${tagDy})`} className="bc-tag">
          <rect x="-1" y="-24" width="58" height="16" rx="6" fill={good ? '#43C21A' : '#E3261E'} stroke={O} strokeWidth="2" />
          <text x="28" y="-12.5" textAnchor="middle" fill="#FFFFFF" style={{ fontFamily: "var(--font-game), 'Lilita One', sans-serif", fontSize: 9, letterSpacing: '.2px' }}>{tag}</text>
        </g>
      )}
    </g>
  );
}
