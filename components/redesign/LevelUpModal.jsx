'use client';

import { RoundAvatar } from './AvatarPicture';
import React from 'react';
import { C, CANDY, goldRim, dotRow, goldTitle, innerGlow } from './tokens';
import { GreenBtn, CurrencyAmounts } from './RedesignShell';
import { cleanReward } from '@/lib/economy/currency.mjs';
import { HERO_DEFAULT } from '@/lib/profile/name.mjs';
import { JOURNEY_END } from '@/lib/vuma/stories.mjs';

// Celebratory stage-up modal (levels = Vuma Katongo story stages), in the
// candy look: gold-rimmed panel with marquee dots, Vuma in a gold ring.
// Driven by a `levelUp` object: { level, sub ("1.3"), newPlace, name, place, avatar, icon,
// reward: { kwacha, emeralds, rubies, diamonds }, story: { title, story, quest, skill } }.
// Since 2026-10-24 every SUB-LEVEL opens it with its story (lib/vuma/stories.mjs):
// the story, "Working towards" (the quest) and the skill unlocked; coins only
// come with a new stage (newPlace). The place line shows only on a new stage.
// `onRename` (set when this stage-up unlocks a rename for a named player)
// adds a "You can change your name now" line that opens the profile's name form.
// `hero` = the player's name, else their ID; unnamed players (`named` false)
// get an "Add your name" invite instead of the rename line.
export default function LevelUpModal({ levelUp, onClose, onRename, hero = HERO_DEFAULT, named = true }) {
  if (!levelUp) return null;
  const r = cleanReward(levelUp.reward);
  const hasReward = Object.keys(r).length > 0;
  const st = levelUp.story || null;
  return (
    <div onClick={onClose} role="dialog" aria-modal="true" aria-label={`New level: ${levelUp.sub || levelUp.level}`} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(8,4,20,.78)', backdropFilter: 'blur(4px)', display: 'grid', placeItems: 'center', padding: 20, fontFamily: CANDY.body, color: '#fff' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ ...goldRim, boxShadow: `${goldRim.boxShadow}, 0 24px 70px rgba(0,0,0,.6)`, position: 'relative', width: 'min(380px, 100%)', boxSizing: 'border-box', padding: 9, borderRadius: 26 }}>
        <span aria-hidden style={{ ...dotRow(false), top: 0.5, left: 22, right: 22, height: 8 }} />
        <span aria-hidden style={{ ...dotRow(false), bottom: 0.5, left: 22, right: 22, height: 8 }} />
        <div style={{ borderRadius: 18, background: innerGlow, padding: '22px 18px 12px', textAlign: 'center', maxHeight: 'calc(100dvh - 58px)', overflowY: 'auto', boxSizing: 'border-box' }}>
          <h2 style={{ ...goldTitle(30), textAlign: 'center' }}>New level!</h2>
          {levelUp.avatar
            ? <span style={{ display: 'block', width: 112, height: 112, margin: '14px auto 10px', borderRadius: '50%', padding: 4, boxSizing: 'border-box', background: 'linear-gradient(180deg, #FFE27A, #E0A300)', boxShadow: '0 4px 0 #8a5a00, 0 10px 24px rgba(0,0,0,.45)' }}>
                <RoundAvatar stage={levelUp.level} avatar={levelUp.avatar} alt={`${hero} at ${levelUp.name}`} size={104} />
              </span>
            : <div style={{ fontSize: 64, margin: '10px 0 2px', lineHeight: 1 }}>{levelUp.icon}</div>}
          <div style={{ fontFamily: CANDY.display, textTransform: 'uppercase', fontSize: 26, lineHeight: 1.1 }}>{st ? st.title : levelUp.name}</div>
          {levelUp.place && (levelUp.newPlace ?? true) && levelUp.level > 1 && <div style={{ fontSize: 13.5, marginTop: 4 }}>{hero} moves to {levelUp.place}{levelUp.name && levelUp.name !== levelUp.place ? `: ${levelUp.name}` : ''}</div>}
          <div style={{ fontSize: 12, color: C.sub, margin: '2px 0 12px' }}>Level {levelUp.sub || levelUp.level}{levelUp.title ? <> · <b style={{ color: CANDY.gold }}>{levelUp.title}</b></> : null}</div>
          {st && (
            <div data-level-story style={{ textAlign: 'left', background: C.track, border: `2px solid ${CANDY.violet.dark}`, borderRadius: 14, padding: '10px 13px', marginBottom: 12, fontSize: 13.5, lineHeight: 1.45 }}>
              <p style={{ margin: 0, fontWeight: 600 }}>{st.story}</p>
              <p style={{ margin: '8px 0 0' }}><b style={{ color: CANDY.gold, textTransform: 'uppercase', fontSize: 11.5, letterSpacing: '.06em' }}>Working towards</b><br />{st.quest}</p>
              {st.skill && <p style={{ margin: '8px 0 0' }}><b style={{ color: CANDY.gold, textTransform: 'uppercase', fontSize: 11.5, letterSpacing: '.06em' }}>Skill unlocked</b><br />{st.skill}</p>}
            </div>
          )}
          {levelUp.sub === '23.5' && (
            <div data-journey-end style={{ ...goldRim, borderRadius: 14, padding: '10px 13px', marginBottom: 12, fontSize: 13.5, lineHeight: 1.45 }}>
              <div style={{ ...goldTitle(18), marginBottom: 4 }}>The journey is complete</div>
              <p style={{ margin: 0, fontWeight: 600 }}>{JOURNEY_END}</p>
            </div>
          )}
          {hasReward ? (
            <div style={{ background: C.track, border: `2px solid ${CANDY.violet.dark}`, borderRadius: 14, padding: '10px 14px', marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: C.muted, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.08em' }}>Rewards</div>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <CurrencyAmounts r={r} size={22} fontSize={18} gap={16} style={{ justifyContent: 'center' }} />
              </div>
            </div>
          ) : null}
          {onRename && (
            <div data-rename-unlocked style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, background: C.track, border: `2px solid ${CANDY.violet.dark}`, borderRadius: 14, padding: '6px 6px 6px 12px', marginBottom: 14, textAlign: 'left' }}>
              <span style={{ fontSize: 13.5, fontWeight: 800 }}>{named ? 'You can change your name now' : 'Give your player a name'}</span>
              <GreenBtn color="violet" size={15} onClick={onRename} style={{ minHeight: 44, padding: '0 12px', marginBottom: 4 }}>{named ? 'Change name' : 'Add name'}</GreenBtn>
            </div>
          )}
          <GreenBtn full size={24} onClick={onClose} style={{ minHeight: 56, borderRadius: 18 }}>Continue</GreenBtn>
        </div>
      </div>
    </div>
  );
}
