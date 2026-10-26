'use client';

import React from 'react';
import { Gamepad2, Target, Trophy, Flame, Users, Pencil } from 'lucide-react';
import { C, CANDY, goldRim, dotRow, goldTitle } from './tokens';
import { Progress, RewardIcon, CURRENCY_COLOR, CloseX } from './RedesignShell';
import { formatNumber } from '@/lib/economy/currency.mjs';
import { textStroke } from '../games/candy/tokens';
import CandyButton from '../games/candy/CandyButton';
import { validateName, canRename, nextRenameStage, playerLabel, playerName, NAME_MAX } from '@/lib/profile/name.mjs';
import { HeroPicture } from './AvatarPicture';
import { XP_BAR, XpAmount } from './XpStar';
import { itemById, normalizeAvatarItems } from '@/lib/avatar/items.mjs';

const tile = { background: `linear-gradient(180deg, ${C.panelHi}, ${C.panelLo})`, border: `2px solid ${CANDY.violet.dark}`, borderRadius: 14 };

/**
 * Player stats popup in the candy look: gold-rimmed frame with marquee dots,
 * Vuma's current stage scene on top (the story character) with the PLAYER's
 * name (or bwanabet ID) over it, a "Level N · level name" chip and the place he lives, the name editor, then the stage bar,
 * balances and stats. Rendered as a fixed overlay (in the shared
 * gameOverlays, z 140: above the widget's fixed red X at 130, so the card's
 * own candy X is the only close button), opened from the header's profile button; `startEditing`
 * opens it straight into the name form (header "Add name", level-up modal).
 * Rename rules live in lib/profile/name.mjs.
 */
export default function ProfileModal({ open, onClose, level, nextLevel, xpPct = 0, vip, user, userId = null, onSaveName, startEditing = false, onWearItem, onOpenShop, shopItemCount = 0, namePrizeXp = 0, nextBonuses = [] }) {
  const u = user || {};
  const stage = level?.level || 1;
  const current = playerName(u);
  const allowed = canRename(u, stage);
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState('');
  const [error, setError] = React.useState(null);
  const [lockNote, setLockNote] = React.useState(false); // tapped the name while a rename is locked
  const inputRef = React.useRef(null);
  React.useEffect(() => {
    if (!open) return;
    setEditing(!!startEditing && canRename(user || {}, stage));
    setDraft(playerName(user || {}) || '');
    setError(null);
    setLockNote(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, startEditing]);
  const scrollRef = React.useRef(null);
  const formRef = React.useRef(null);
  React.useEffect(() => {
    if (!editing || !inputRef.current) return;
    inputRef.current.focus({ preventScroll: true });
    if (formRef.current) formRef.current.scrollIntoView({ block: 'center' });
  }, [editing]);
  if (!open) return null;
  const who = playerLabel(u, userId);
  const look = normalizeAvatarItems(u.avatarItems);
  const owned = look.owned.map(itemById);
  const worn = look.worn;
  const lockedUntil = nextRenameStage(u, stage);
  const startEdit = () => { setDraft(current || ''); setError(null); setEditing(true); };
  const save = (e) => {
    if (e) e.preventDefault();
    const v = validateName(draft);
    if (!v.ok) { setError(v.reason); return; }
    const res = onSaveName ? onSaveName(v.name) : { ok: false, reason: 'Could not save your name' };
    if (res && res.ok) { setEditing(false); setError(null); if (scrollRef.current) scrollRef.current.scrollTo({ top: 0, behavior: 'smooth' }); } else setError((res && res.reason) || 'Could not save your name');
  };
  const money = [
    { icon: <RewardIcon kind="coins" size={26} />, label: 'Coins', value: formatNumber(u.kwacha || 0), color: C.gold },
    { icon: <RewardIcon kind="emeralds" size={24} />, label: 'Emeralds', value: formatNumber(u.emeralds || 0), color: CURRENCY_COLOR.emeralds },
    { icon: <RewardIcon kind="rubies" size={24} />, label: 'Rubies', value: formatNumber(u.rubies || 0), color: CURRENCY_COLOR.rubies },
    { icon: <RewardIcon kind="diamonds" size={24} />, label: 'Diamonds', value: formatNumber(u.diamonds || 0), color: CURRENCY_COLOR.diamonds },
  ];
  const stats = [
    { icon: <Gamepad2 size={16} />, label: 'Games played', value: u.gamesPlayed || 0 },
    { icon: <Target size={16} />, label: 'Missions done', value: (u.missionsComplete || []).length },
    { icon: <Trophy size={16} />, label: 'Wins', value: u.wins || 0 },
    { icon: <Flame size={16} />, label: 'Day streak', value: u.streak || 0 },
    { icon: <Users size={16} />, label: 'Referrals', value: u.referrals || 0 },
    // Predictions stat row parked with the predictions feature — see git history
  ];
  return (
    <div onClick={onClose} role="dialog" aria-modal="true" aria-label="Your profile" className="rs-pm-backdrop" style={{ position: 'fixed', inset: 0, zIndex: 140, display: 'grid', placeItems: 'center', padding: 16, background: 'rgba(8,4,20,.74)', backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)', fontFamily: CANDY.body, color: '#fff', animation: 'rs-pm-fade .16s ease-out' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes rs-pm-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes rs-pm-pop { from { opacity: 0; transform: translateY(10px) scale(.97) } to { opacity: 1; transform: none } }
        @media (max-width: 420px) { .rs-pm-stats { grid-template-columns: 1fr !important; } }
        /* phones: fit the dynamic viewport (the backdrop sits above the widget's red X, so the card's own X is the only one) */
        @media (max-width: 600px) { .rs-pm-card { max-height: calc(100dvh - 32px) !important; } }
        @media (prefers-reduced-motion: reduce) { .rs-pm-card { animation: none !important; } }
      ` }} />
      <div onClick={(e) => e.stopPropagation()} className="rs-pm-card" style={{ ...goldRim, boxShadow: `${goldRim.boxShadow}, 0 24px 60px rgba(0,0,0,.6)`, position: 'relative', width: '100%', maxWidth: 460, maxHeight: '92vh', boxSizing: 'border-box', padding: 9, borderRadius: 26, display: 'flex', animation: 'rs-pm-pop .2s cubic-bezier(.2,.8,.3,1)' }}>
        <span aria-hidden style={{ ...dotRow(false), top: 0.5, left: 22, right: 22, height: 8 }} />
        <span aria-hidden style={{ ...dotRow(false), bottom: 0.5, left: 22, right: 22, height: 8 }} />
        <div ref={scrollRef} style={{ position: 'relative', flex: 1, minHeight: 0, overflowY: 'auto', borderRadius: 18, background: `radial-gradient(110% 60% at 50% 30%, ${CANDY.glow}, ${CANDY.bgTop} 60%, ${CANDY.bgBottom})`, boxShadow: 'inset 0 0 0 1.5px rgba(255,210,31,.55)' }}>
          <CloseX onClick={onClose} style={{ position: 'absolute', top: 6, right: 6, zIndex: 2 }} />

          {/* Top: the current Vuma stage's full scene, name + chips on a bottom fade. */}
          <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '18px 18px 0 0' }}>
            {level?.hero
              ? <HeroPicture stage={level.level} alt={`Level ${level.level}: ${level.title || level.name}`} style={{ aspectRatio: '10 / 9' }} />
              : <div style={{ width: '100%', aspectRatio: '10 / 9' }} />}
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '60px 18px 12px', textAlign: 'center', background: `linear-gradient(180deg, rgba(43,15,94,0) 0%, rgba(43,15,94,.8) 55%, ${CANDY.bgTop} 100%)` }}>
              {/* A named player renames by tapping their own name (owner 2026-10-22: no Change name button). */}
              {current ? (
                <button type="button" data-profile-name onClick={() => (allowed ? startEdit() : setLockNote(v => !v))} aria-label={`${who.title}: ${allowed ? 'change your name' : 'name change locked'}`}
                  style={{ all: 'unset', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8, maxWidth: '100%', fontFamily: CANDY.display, fontSize: 28, lineHeight: 1.05, color: '#fff', overflowWrap: 'anywhere', textShadow: `${textStroke(2.5, CANDY.outline)}, 0 4px 0 ${CANDY.outline}` }}>
                  {who.title}<Pencil size={16} strokeWidth={3} aria-hidden style={{ flex: 'none', opacity: 0.6, filter: 'none' }} />
                </button>
              ) : (
                <div data-profile-name style={{ fontFamily: CANDY.display, fontSize: 28, lineHeight: 1.05, color: '#fff', overflowWrap: 'anywhere', textShadow: `${textStroke(2.5, CANDY.outline)}, 0 4px 0 ${CANDY.outline}` }}>{who.title}</div>
              )}
              {lockNote && !allowed && <div data-rename-locked role="status" style={{ fontSize: 12.5, fontWeight: 800, color: CANDY.gold, marginTop: 6 }}>You can change your name again at Level {lockedUntil}</div>}
              {who.sub && <div style={{ fontSize: 12.5, fontWeight: 800, color: 'rgba(255,255,255,.75)', marginTop: 4 }}>{who.sub}</div>}
              <div style={{ display: 'flex', justifyContent: 'center', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 900, color: '#fff', background: 'rgba(20,4,48,.8)', border: `1.5px solid ${CANDY.violet.fill}`, padding: '2px 11px', borderRadius: 999 }}>Level {stage}{level?.title ? ` · ${level.title}` : ''}</span>
                {/* Where the hero lives now (owner 2026-10-22: replaced the "Standard VIP" chip). */}
                {level?.place && <span data-profile-place style={{ fontSize: 12, fontWeight: 900, color: CANDY.outline, background: CANDY.gold, padding: '3px 11px', borderRadius: 999, textTransform: 'uppercase' }}>{level.place}</span>}
              </div>
            </div>
          </div>

          {/* Player name: first name any time, then one rename per level-up (tap the name). */}
          <div style={{ padding: editing || !current ? '14px 18px 2px' : 0 }}>
            {editing ? (
              <form ref={formRef} onSubmit={save} noValidate style={{ ...tile, padding: '12px 12px 6px' }}>
                <label htmlFor="rs-pm-name" style={{ display: 'block', fontFamily: CANDY.display, fontSize: 17, color: CANDY.gold, marginBottom: 8 }}>{current ? 'Change your name' : 'Add your name'}{!current && namePrizeXp ? <span style={{ fontFamily: CANDY.body, fontSize: 13, fontWeight: 800, color: C.sub }}> · earn <XpAmount size={14} gap={3}>{namePrizeXp} XP</XpAmount></span> : null}</label>
                <input id="rs-pm-name" ref={inputRef} type="text" value={draft} autoComplete="nickname" spellCheck={false} maxLength={NAME_MAX + 8}
                  onChange={(e) => { setDraft(e.target.value); if (error) setError(null); }}
                  aria-invalid={error ? 'true' : 'false'} aria-describedby="rs-pm-name-help rs-pm-name-err"
                  style={{ width: '100%', boxSizing: 'border-box', minHeight: 48, padding: '0 14px', borderRadius: 14, background: C.track, border: `2px solid ${error ? CANDY.red.light : CANDY.violet.fill}`, color: '#fff', fontFamily: CANDY.body, fontSize: 16, fontWeight: 800, outline: 'none' }} />
                <div id="rs-pm-name-help" style={{ fontSize: 11.5, color: C.muted, margin: '6px 2px 0' }}>2–{NAME_MAX} letters, numbers, spaces, . _ or -. {current ? 'After this you can change it again at your next level.' : 'After this you can change it once per new level.'}</div>
                <div id="rs-pm-name-err" role="alert" style={{ minHeight: 18, fontSize: 12.5, fontWeight: 800, color: '#ff8f86', margin: '4px 2px 6px' }}>{error || ''}</div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <CandyButton type="submit" color="green" style={{ flex: 1, fontSize: 19, minHeight: 48, borderRadius: 14 }}>Save</CandyButton>
                  <CandyButton color="violet" onClick={() => { setEditing(false); setError(null); }} style={{ flex: 1, fontSize: 19, minHeight: 48, borderRadius: 14 }}>Cancel</CandyButton>
                </div>
              </form>
            ) : !current ? (
              <CandyButton color="green" onClick={startEdit} aria-label="Add your name"
                style={{ width: '100%', flexDirection: 'row', gap: 8, fontSize: 18, minHeight: 48, borderRadius: 14 }}>
                <Pencil size={17} strokeWidth={3} aria-hidden />Add your name{namePrizeXp ? <XpAmount size={18} style={{ marginLeft: 4 }}>+{namePrizeXp} XP</XpAmount> : null}
              </CandyButton>
            ) : null}
          </div>

          {/* Avatar items (lib/avatar/items.mjs): bought in the Coin Shop, worn by the hero above. */}
          {(owned.length > 0 || (shopItemCount > 0 && onOpenShop)) && (
            <div data-my-items style={{ padding: '14px 18px 0' }}>
              <h3 style={{ ...goldTitle(20), marginBottom: 10 }}>My items</h3>
              {owned.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 8 }}>
                  {owned.map((it) => {
                    const on = worn.includes(it.id);
                    return (
                      <div key={it.id} style={{ ...tile, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '8px 8px 8px 12px' }}>
                        <span style={{ fontFamily: CANDY.display, fontSize: 15, lineHeight: 1.1 }}>{it.name}</span>
                        <button type="button" aria-pressed={on} onClick={() => onWearItem && onWearItem(it.id, !on)}
                          style={{ minHeight: 40, minWidth: 76, padding: '0 10px', borderRadius: 11, font: 'inherit', fontWeight: 900, fontSize: 13, cursor: 'pointer',
                            ...(on ? { background: 'linear-gradient(180deg, #ffd96a, #f0a800)', color: CANDY.outline, border: '2px solid #8a5a00' } : { background: 'linear-gradient(180deg, #5BE37A, #1E9E44)', color: '#fff', border: '2px solid #0f5a25' }) }}>
                          {on ? 'Take off' : 'Wear'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <CandyButton color="violet" onClick={onOpenShop} style={{ width: '100%', fontSize: 17, minHeight: 46, borderRadius: 14 }}>Dress up in the Coin Shop</CandyButton>
              )}
            </div>
          )}

          <div style={{ padding: '14px 18px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, fontSize: 12, color: C.sub, marginBottom: 7 }}>
              <span style={{ flex: 'none' }}>Level {level?.level}{user?.xp > 0 ? <> · {Math.floor(user.xp).toLocaleString('en-US')} XP in all</> : null}</span>
              {/* what the next level gives (lib/profile/nextBonuses.mjs), never its place or name */}
              <span data-next-bonuses style={{ textAlign: 'right' }}>{nextLevel ? (nextBonuses.length ? <>Next level bonuses: <b style={{ color: CANDY.gold }}>{nextBonuses.join(', ')}</b></> : null) : 'Final level'}</span>
            </div>
            <Progress value={xpPct} height={14} color={XP_BAR} />
          </div>

          <div style={{ padding: '0 18px 16px', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
            {money.map((m) => (
              <div key={m.label} style={{ ...tile, padding: '10px 4px', textAlign: 'center' }}>
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 5 }}>{m.icon}</div>
                <div style={{ fontFamily: CANDY.display, fontSize: 18, color: m.color }}>{m.value}</div>
                <div style={{ fontSize: 10.5, color: C.muted }}>{m.label}</div>
              </div>
            ))}
          </div>

          <div style={{ padding: '0 18px 20px' }}>
            <h3 style={{ ...goldTitle(20), marginBottom: 12 }}>Player stats</h3>
            <div className="rs-pm-stats" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {stats.map((s) => (
                <div key={s.label} style={{ ...tile, display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px' }}>
                  <span style={{ width: 32, height: 32, flex: 'none', borderRadius: 10, background: C.track, display: 'grid', placeItems: 'center', color: CANDY.gold }}>{s.icon}</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontFamily: CANDY.display, fontSize: 18, color: C.text, lineHeight: 1 }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
