'use client';

import { RoundAvatar, HeroPicture } from './AvatarPicture';
import React from 'react';
import { CANDY, COIN_ICON } from './tokens';
import { cleanReward } from '@/lib/economy/currency.mjs';
import { amountText } from '@/lib/rewardText.mjs';
import { XP_STAR_SRC } from './XpStar';
import { HERO_DEFAULT } from '@/lib/profile/name.mjs';

// Level-up pop-up (owner 2026-10-27, design artifact Q6mu2Y4F1YZXdgCRmPsdhg
// v5): every new SUB-LEVEL opens it. Top to bottom:
//   the new level ("LEVEL 1.3!") + "You went up N levels" / "New place: …" + the coin prize
//   WHY YOU LEVELLED UP — the XP each source gave since the last pop-up (lib/xp/levelUpInfo.mjs)
//   YOUR STORY — closed bar, tap to open: "You did it" + "What comes next" (lib/vuma/stories.mjs)
//   NEXT MISSION — the whole box is a button to where the mission is done
//   CLOSE
// Driven by `levelUp` = { level, sub, levelsUp, newPlace, place, avatar, reward,
// story: { title, teaser, won, next, when }, reasons: [...], next: { terms,
// coins, xp, dest, here, step } | null }. `onGo(dest)` follows the mission
// button. `kind: 'xpFull'` = the once-a-day "no more game XP today" version.

const REASON_ART = {
  games: '/games/coinflip/card.svg',
  daily: '/ui/levelup/gift.png',
  missions: '/ui/levelup/flag.png',
  sports: '/ui/levelup/ball.png',
  casino: '/ui/levelup/slot.png',
  deposit: '/ui/levelup/deposit.png',
};

// What still gives XP once the Bonus Center's daily XP is full (lib/season/config.mjs crm rates)
const BET_XP = [
  { kind: 'sports', label: 'Sports bets, odds 1.5+', rate: 'K4 = 1 XP' },
  { kind: 'casino', label: 'Casino and Aviator', rate: 'K10 = 1 XP' },
  { kind: 'deposit', label: 'A deposit today', rate: '30 XP' },
];

function XpChip({ n, big }) {
  return (
    <span className="lu-xp" style={big ? { fontSize: 20 } : null}>
      <img src={XP_STAR_SRC} alt="" width={big ? 24 : 18} height={big ? 24 : 18} />+{Number(n).toLocaleString('en-US')} XP
    </span>
  );
}

function Reasons({ rows, title = 'Why you levelled up' }) {
  if (!rows || !rows.length) return null;
  return (
    <div className="lu-box lu-why">
      <div className="lu-hd">{title}</div>
      {rows.map((r) => (
        <div className="lu-row" key={r.kind}>
          <span className={`lu-ic${r.kind === 'games' ? ' wide' : ''}`}><img src={REASON_ART[r.kind]} alt="" /></span>
          <span className="lu-t">{r.label}{r.detail ? <small>{r.detail}</small> : null}</span>
          <XpChip n={r.xp} />
        </div>
      ))}
    </div>
  );
}

function Story({ st, open = false }) {
  if (!st) return null;
  return (
    <details className="lu-tale" open={open || undefined}>
      <summary>
        <span className="lu-st"><b>Your story</b><span>{st.teaser}</span></span>
        <span className="lu-chev" aria-hidden><svg viewBox="0 0 24 24"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
      </summary>
      <div className="lu-body">
        <div className="lu-part won"><div className="k">You did it</div><p>{st.won}</p></div>
        <div className="lu-part why">
          <div className="k">What comes next</div><p>{st.next}</p>
          <div className="lu-facts">{st.when ? <span className="time">{st.when}</span> : null}<span>Finish 3 missions</span></div>
        </div>
      </div>
    </details>
  );
}

function NextMission({ next, onGo }) {
  if (!next) return null;
  return (
    <button type="button" className="lu-next" onClick={() => onGo && onGo(next.dest)}
      aria-label={`${next.terms}. ${next.here ? 'Opens it here' : 'Opens it on BwanaBet'}`}>
      <span className="lu-next-label">{next.ready ? 'Mission ready' : 'Next mission'}{next.step ? <span className="step">{next.step}</span> : null}</span>
      <span className="lu-next-text">{next.ready ? `Collect: ${next.terms}` : next.terms}</span>
      <span className="lu-next-reward">
        {next.coins > 0 && <span className="c"><img src={COIN_ICON} alt="" width={24} height={24} />+{Number(next.coins).toLocaleString('en-US')}</span>}
        {next.xp > 0 && <XpChip n={next.xp} big />}
      </span>
    </button>
  );
}

const WIDE_QUERY = '(min-width: 861px)'; // the desktop layout in LU_CSS
const TALL_QUERY = '(min-width: 861px) and (min-height: 1000px)'; // room to show the story open

export default function LevelUpModal({ levelUp, onClose, onGo, onRename, hero = HERO_DEFAULT, named = true }) {
  const [wide, setWide] = React.useState(false);
  const [tall, setTall] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia(WIDE_QUERY);
    const on = () => { setWide(mq.matches); setTall(window.matchMedia(TALL_QUERY).matches); };
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  if (!levelUp) return null;
  const r = cleanReward(levelUp.reward);
  const full = levelUp.kind === 'xpFull';
  return (
    <div onClick={onClose} role="dialog" aria-modal="true" aria-label={full ? 'No more game XP today' : `New level: ${levelUp.sub || levelUp.level}`} className="lu-back">
      <style dangerouslySetInnerHTML={{ __html: LU_CSS }} />
      <div onClick={(e) => e.stopPropagation()} className="lu-frame">
        <div className="lu-in">
          <div className="lu-side">
          {wide && <div className="lu-hero" aria-hidden><HeroPicture stage={levelUp.level} style={{ height: '100%', aspectRatio: 'auto' }} imgStyle={{ objectPosition: '50% 70%' }} /></div>}
          <div className="lu-top">
            {levelUp.avatar && !wide && (
              <span className="lu-av"><RoundAvatar stage={levelUp.level} avatar={levelUp.avatar} alt={hero} size={60} /></span>
            )}
            {full ? <div className="lu-big blue">No more game XP today</div> : <div className="lu-big">Level {levelUp.sub || levelUp.level}!</div>}
            {!full && levelUp.levelsUp > 1 && <div className="lu-place">You went up {levelUp.levelsUp} levels</div>}
            {!full && levelUp.newPlace && levelUp.place && <div className="lu-place">New place: {levelUp.place}</div>}
            {r.kwacha > 0 && <span className="lu-prize"><img src={COIN_ICON} alt="" width={28} height={28} />+{amountText(r.kwacha, 'coins')}</span>}
          </div>
          </div>
          <div className="lu-main">
          {full ? (
            <div className="lu-box lu-full">
              <div className="lu-hd">Today</div>
              <div className="lu-meter"><span>XP from the Bonus Center</span><span className="lu-xp">{levelUp.cap} / {levelUp.cap}</span></div>
              <div className="lu-bar"><span /></div>
              <div className="lu-note">Mini-games still pay coins. They give XP again tomorrow.</div>
            </div>
          ) : <Reasons rows={levelUp.reasons} />}
          {full && (
            <div className="lu-box lu-why">
              <div className="lu-hd">Bets still give XP today</div>
              {BET_XP.map((b) => (
                <div className="lu-row" key={b.kind}>
                  <span className="lu-ic"><img src={REASON_ART[b.kind]} alt="" /></span>
                  <span className="lu-t">{b.label}</span>
                  <span className="lu-xp">{b.rate}</span>
                </div>
              ))}
            </div>
          )}
          {!full && <Story st={levelUp.story} open={tall || (wide && (levelUp.reasons || []).length <= 2)} />}
          <NextMission next={levelUp.next} onGo={onGo} />
          {onRename && (
            <button type="button" className="lu-rename" onClick={onRename}>{named ? 'You can change your name now' : 'Give your player a name'} ›</button>
          )}
          <button type="button" className="lu-close" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const LU_CSS = `
.lu-back { position: fixed; inset: 0; z-index: 300; background: rgba(8,4,20,.78); backdrop-filter: blur(4px); display: grid; place-items: center; padding: 16px; font-family: ${CANDY.body}; color: #fff; }
.lu-frame { width: min(380px, 100%); box-sizing: border-box; border-radius: 24px; padding: 7px; background: linear-gradient(180deg, #ffe27a, #e0a300 55%, #a86c00); box-shadow: 0 3px 0 #6b4300, 0 22px 50px rgba(0,0,0,.55); }
.lu-in { border-radius: 18px; background: radial-gradient(120% 70% at 50% 0%, #3a1d78 0%, #24124a 55%, #1a0d38 100%); padding: 18px 14px 12px; display: grid; gap: 12px; text-align: center; max-height: calc(100dvh - 50px); overflow-y: auto; box-sizing: border-box; }
.lu-top { display: grid; justify-items: center; gap: 8px; }
.lu-av { display: block; width: 84px; height: 84px; border-radius: 50%; padding: 3px; box-sizing: border-box; background: linear-gradient(180deg, #ffe27a, #e0a300); box-shadow: 0 3px 0 #8a5a00; }
.lu-big { font-family: ${CANDY.display}; font-size: 48px; line-height: 1; color: ${CANDY.gold}; text-shadow: 0 3px 0 #6b3d00; text-transform: uppercase; letter-spacing: -.5px; }
.lu-big.blue { color: #7fd8ff; text-shadow: 0 3px 0 #164a66; font-size: 30px; }
.lu-place { font-size: 15px; font-weight: 700; color: #e0d5ff; }
.lu-prize { display: inline-flex; align-items: center; gap: 8px; background: rgba(255,200,61,.14); border: 2px solid rgba(255,200,61,.55); border-radius: 999px; padding: 4px 14px 4px 6px; font-weight: 800; color: ${CANDY.gold}; font-size: 18px; }
.lu-box { border-radius: 14px; padding: 10px 11px; text-align: left; display: grid; gap: 8px; }
.lu-hd { font-size: 13px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; }
.lu-why { background: rgba(47,196,99,.16); border: 2px solid rgba(47,196,99,.45); }
.lu-why .lu-hd { color: #7ff0a6; }
.lu-row { display: grid; grid-template-columns: 44px 1fr auto; gap: 9px; align-items: center; font-size: 14px; font-weight: 600; }
.lu-t { min-width: 0; }
.lu-t small { display: block; font-weight: 400; font-size: 13px; color: #e0d5ff; }
.lu-ic { width: 44px; height: 44px; border-radius: 13px; overflow: hidden; display: grid; place-items: center; background: radial-gradient(80% 80% at 50% 35%, #6a3fc4, #2a1460); border: 2px solid rgba(255,255,255,.18); box-shadow: 0 3px 0 rgba(0,0,0,.35); box-sizing: border-box; }
.lu-ic img { width: 100%; height: 100%; object-fit: contain; display: block; filter: drop-shadow(0 2px 2px rgba(0,0,0,.35)); }
.lu-ic.wide img { object-fit: cover; transform: scale(1.9); filter: none; }
.lu-xp { display: inline-flex; align-items: center; gap: 3px; font-weight: 800; color: #7fd8ff; font-variant-numeric: tabular-nums; white-space: nowrap; }
.lu-tale { background: linear-gradient(180deg, rgba(255,200,61,.12), rgba(255,200,61,.04)); border: 2px solid rgba(255,200,61,.5); border-radius: 16px; text-align: left; }
.lu-tale summary { list-style: none; cursor: pointer; display: flex; align-items: center; gap: 10px; padding: 10px 12px; min-height: 48px; box-sizing: border-box; }
.lu-tale summary::-webkit-details-marker { display: none; }
.lu-tale summary:focus-visible { outline: 3px solid #fff; outline-offset: 2px; border-radius: 14px; }
.lu-st { flex: 1; min-width: 0; }
.lu-st b { display: block; font-family: ${CANDY.display}; font-weight: 400; font-size: 16px; letter-spacing: .06em; color: ${CANDY.gold}; text-transform: uppercase; }
.lu-st span { display: block; font-size: 13.5px; color: #e0d5ff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.lu-tale[open] .lu-st span { display: none; }
.lu-chev { flex: none; width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center; background: ${CANDY.gold}; color: #4a2b00; box-shadow: 0 3px 0 #8a5a00; transition: transform .2s; }
.lu-chev svg { width: 16px; height: 16px; }
.lu-tale[open] .lu-chev { transform: rotate(180deg); }
.lu-body { padding: 0 12px 12px; display: grid; gap: 10px; }
.lu-part { display: grid; gap: 3px; }
.lu-part .k { font-size: 12px; font-weight: 800; letter-spacing: .09em; text-transform: uppercase; }
.lu-part.won .k { color: #7ff0a6; }
.lu-part.why .k { color: #7fd8ff; }
.lu-part p { margin: 0; font-size: 15px; line-height: 1.5; font-weight: 600; }
.lu-facts { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
.lu-facts span { font-size: 13px; font-weight: 800; border-radius: 999px; padding: 3px 10px; background: rgba(127,216,255,.16); border: 1px solid rgba(127,216,255,.5); color: #7fd8ff; }
.lu-facts span.time { background: rgba(255,107,107,.14); border-color: rgba(255,107,107,.5); color: #ff9b9b; }
/* the next mission: the whole box is the button (v4 look); it lifts under the mouse */
.lu-next { display: grid; justify-items: center; gap: 4px; width: 100%; box-sizing: border-box; cursor: pointer; font: inherit; color: #fff;
  background: linear-gradient(180deg, rgba(127,216,255,.18), rgba(127,216,255,.08)); border: 2px solid #7fd8ff; border-radius: 18px; padding: 16px 12px; text-align: center;
  box-shadow: 0 4px 0 rgba(22,74,102,.9); transition: transform .15s ease, box-shadow .15s ease, background .15s ease; }
.lu-next:hover { transform: translateY(-5px) scale(1.03); background: linear-gradient(180deg, rgba(127,216,255,.3), rgba(127,216,255,.14)); box-shadow: 0 9px 0 rgba(22,74,102,.9), 0 14px 26px rgba(127,216,255,.3); }
.lu-next:active { transform: translateY(2px) scale(.99); box-shadow: 0 1px 0 rgba(22,74,102,.9); }
.lu-next:focus-visible { outline: 3px solid #fff; outline-offset: 3px; }
.lu-next-label { font-family: ${CANDY.display}; font-size: 13px; letter-spacing: .08em; text-transform: uppercase; color: #7fd8ff; }
.lu-next-label .step { display: inline-block; margin-left: 6px; padding: 1px 8px; border-radius: 999px; background: #7fd8ff; color: #140a28; letter-spacing: .04em; }
.lu-next-text { font-family: ${CANDY.display}; font-size: 24px; line-height: 1.08; text-transform: uppercase; text-shadow: 0 2px 0 #164a66; }
.lu-next-reward { display: inline-flex; align-items: center; gap: 12px; margin-top: 4px; font-family: ${CANDY.display}; font-size: 20px; }
.lu-next-reward .c { display: inline-flex; align-items: center; gap: 4px; color: ${CANDY.gold}; }
.lu-full { background: rgba(255,107,107,.1); border: 2px solid rgba(255,107,107,.45); }
.lu-full .lu-hd { color: #ff6b6b; }
.lu-meter { display: flex; justify-content: space-between; gap: 10px; font-weight: 700; font-size: 14px; }
.lu-bar { height: 10px; border-radius: 999px; background: #1b0f3a; border: 1px solid #46288a; overflow: hidden; }
.lu-bar span { display: block; height: 100%; width: 100%; background: #ff6b6b; }
.lu-note { font-size: 14.5px; }
.lu-rename { border: 0; background: none; color: ${CANDY.gold}; font: 700 14px ${CANDY.body}; cursor: pointer; padding: 4px; }
.lu-close { display: block; width: 100%; min-height: 50px; margin-bottom: 5px; border: 2px solid rgba(0,0,0,.4); border-radius: 15px; padding: 10px; cursor: pointer;
  background: linear-gradient(180deg, #8d6bd6, #5a3aa6); color: #fff; font-family: ${CANDY.display}; font-size: 20px; letter-spacing: .06em; text-transform: uppercase; text-shadow: 0 2px 0 rgba(0,0,0,.3);
  box-shadow: 0 5px 0 #2e1a63, 0 9px 14px rgba(0,0,0,.35), inset 0 2px 0 rgba(255,255,255,.4); transition: transform .08s, box-shadow .08s; }
.lu-close:active { transform: translateY(4px); box-shadow: 0 1px 0 #2e1a63, inset 0 2px 0 rgba(255,255,255,.35); }
.lu-close:focus-visible, .lu-rename:focus-visible { outline: 3px solid #fff; outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) { .lu-next, .lu-chev, .lu-close { transition: none; } .lu-next:hover { transform: none; } }
/* phones: the side + main wrappers vanish into the single column */
.lu-side, .lu-main { display: contents; }
/* phones (owner 2026-10-27: keep the small one, it must fit the screen): the
   picture and the level side by side, slim rows, a shorter mission button.
   Checked at 360 x 580 (a small Android inside the widget, under bwanabet's
   60 px strip) up to 412 x 855. */
@media (max-width: 860px) {
  .lu-back { padding: 10px; }
  .lu-frame { padding: 6px; border-radius: 22px; }
  .lu-in { padding: 12px 12px 8px; gap: 9px; max-height: calc(100dvh - 32px); }
  .lu-top { grid-template-columns: auto 1fr; justify-items: start; align-items: center; column-gap: 12px; row-gap: 3px; text-align: left; }
  .lu-top > .lu-av { grid-row: span 3; width: 64px; height: 64px; }
  .lu-top > :not(.lu-av) { grid-column: 2; }
  .lu-big { font-size: 36px; }
  .lu-big.blue { font-size: 24px; }
  .lu-place { font-size: 13.5px; }
  .lu-prize { font-size: 15px; padding: 2px 10px 2px 4px; gap: 5px; }
  .lu-prize img { width: 22px; height: 22px; }
  .lu-box { padding: 8px 10px; gap: 5px; }
  .lu-hd { font-size: 11.5px; }
  .lu-row { grid-template-columns: 32px 1fr auto; gap: 8px; font-size: 13.5px; }
  .lu-ic { width: 32px; height: 32px; border-radius: 9px; border-width: 1.5px; box-shadow: 0 2px 0 rgba(0,0,0,.35); }
  .lu-t small { font-size: 12px; }
  .lu-xp { font-size: 13.5px; }
  .lu-xp img { width: 15px; height: 15px; }
  .lu-tale summary { min-height: 44px; padding: 6px 10px; }
  .lu-st b { font-size: 14px; }
  .lu-st span { font-size: 12.5px; }
  .lu-chev { width: 28px; height: 28px; }
  .lu-part p { font-size: 14px; }
  .lu-next { padding: 10px 10px 12px; gap: 3px; border-radius: 15px; }
  .lu-next-label { font-size: 11.5px; }
  .lu-next-text { font-size: 19px; }
  .lu-next-reward { font-size: 17px; margin-top: 2px; gap: 10px; }
  .lu-next-reward img { width: 20px; height: 20px; }
  .lu-meter { font-size: 13px; }
  .lu-note { font-size: 13px; }
  .lu-close { min-height: 46px; font-size: 18px; margin-bottom: 4px; padding: 8px; }
}
/* short phone screens: the detail lines go (the XP numbers stay) */
@media (max-width: 860px) and (max-height: 700px) {
  .lu-top > .lu-av { width: 52px; height: 52px; }
  .lu-big { font-size: 30px; }
  .lu-row small, .lu-st span { display: none; }
  .lu-row { font-size: 13px; }
  .lu-ic { width: 28px; height: 28px; }
  .lu-row { grid-template-columns: 28px 1fr auto; }
  .lu-next-text { font-size: 17px; }
}
/* desktop (owner 2026-10-27: "too small", then "empty spaces, top to bottom"):
   full screen height like the games; LEFT = the hero's own picture with the
   level on it; RIGHT = everything else top to bottom, the mission button
   taking whatever height is left, so nothing stands empty. */
@media (min-width: 861px) {
  .lu-frame { width: min(1040px, 100%); height: min(calc(100dvh - 32px), 920px); padding: 9px; border-radius: 30px; }
  .lu-in { height: 100%; max-height: none; padding: 0; gap: 0; border-radius: 22px; overflow: hidden; grid-template-columns: 5fr 6fr; text-align: left; }
  .lu-side { display: flex; flex-direction: column; justify-content: flex-end; position: relative; overflow: hidden; min-height: 0; }
  .lu-hero { position: absolute; inset: 0; }
  .lu-side::after { content: ""; position: absolute; inset: 0; pointer-events: none; background: linear-gradient(180deg, rgba(20,8,48,0) 35%, rgba(20,8,48,.75) 62%, #1a0d38 92%); }
  .lu-top { position: relative; z-index: 1; justify-items: start; gap: 10px; padding: 0 28px 30px; }
  .lu-big { font-size: 76px; text-shadow: 0 4px 0 #6b3d00, 0 8px 24px rgba(0,0,0,.55); }
  .lu-big.blue { font-size: 50px; }
  .lu-place { font-size: 20px; color: #fff; text-shadow: 0 2px 6px rgba(0,0,0,.7); }
  .lu-prize { font-size: 24px; padding: 6px 18px 6px 8px; background: rgba(26,13,56,.85); }
  .lu-main { display: flex; flex-direction: column; gap: 14px; padding: 24px 24px 18px; min-height: 0; overflow-y: auto; border-left: 2px solid rgba(255,200,61,.25); }
  .lu-main > * { flex: none; }
  .lu-next { flex: 1 0 auto; min-height: 150px; align-content: center; padding: 22px 18px; gap: 10px; }
  .lu-close { width: 100%; min-height: 58px; font-size: 24px; }
  .lu-hd { font-size: 14px; }
  .lu-row { grid-template-columns: 52px 1fr auto; font-size: 16.5px; }
  .lu-t small { font-size: 14px; }
  .lu-ic { width: 52px; height: 52px; }
  .lu-xp { font-size: 17px; }
  .lu-st b { font-size: 18px; }
  .lu-st span { font-size: 15px; }
  .lu-part p { font-size: 17px; }
  .lu-facts span { font-size: 14px; }
  .lu-next-label { font-size: 15px; }
  .lu-next-text { font-size: 34px; text-align: center; }
  .lu-next-reward { font-size: 26px; }
  .lu-meter, .lu-note { font-size: 16.5px; }
}
`;
