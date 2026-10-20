'use client';

import React from 'react';
import { HERO_FRAME, HEAD_CROP, wornLayers } from '@/lib/avatar/items.mjs';

/**
 * The player's avatar items (user.avatarItems = { owned, worn }), provided
 * once by GamificationPlatform so the header, level-up modal and profile all
 * dress the hero the same way (lib/avatar/items.mjs).
 */
export const AvatarLookContext = React.createContext(null);

const heroSrc = (stage) => `/vuma/hero-${String(stage).padStart(2, '0')}.jpg`;
const fill = { position: 'absolute', display: 'block', maxWidth: 'none' };

/** Full-body hero picture (profile top) with the worn item layers on it. `layers` overrides what is drawn (shop try-on). */
export function HeroPicture({ stage, alt = '', layers = null, style, imgStyle }) {
  const items = React.useContext(AvatarLookContext);
  const list = layers || wornLayers(items, stage);
  return (
    <div style={{ position: 'relative', width: '100%', aspectRatio: `${HERO_FRAME.w} / ${HERO_FRAME.h}`, overflow: 'hidden', ...style }}>
      <img src={heroSrc(stage)} alt={alt} width={HERO_FRAME.w} height={HERO_FRAME.h} style={{ ...fill, inset: 0, width: '100%', height: '100%', objectFit: 'cover', ...imgStyle }} />
      {list.map((l) => <img key={l.id} src={l.src} alt="" aria-hidden width={HERO_FRAME.w} height={HERO_FRAME.h} data-avatar-item={l.id} style={{ ...fill, inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />)}
    </div>
  );
}

/**
 * Round avatar (header, level-up). No items worn = the stage's drawn avatar
 * picture as before; wearing items = the head-and-shoulders crop of the hero
 * picture (HEAD_CROP) with the layers, so the items show on the avatar too.
 */
export function RoundAvatar({ stage, avatar, alt = '', size, layers = null, style }) {
  const items = React.useContext(AvatarLookContext);
  const list = layers || wornLayers(items, stage);
  const box = { width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', display: 'block', position: 'relative', ...style };
  if (!list.length) return <img src={avatar} alt={alt} width={size} height={size} style={{ ...box, objectFit: 'cover' }} />;
  const s = HEAD_CROP.size;
  const pos = { ...fill, width: `${(HERO_FRAME.w / s) * 100}%`, height: 'auto', left: `${(-HEAD_CROP.x / s) * 100}%`, top: `${(-HEAD_CROP.y / s) * 100}%` };
  return (
    <span role={alt ? 'img' : undefined} aria-label={alt || undefined} data-avatar-dressed style={box}>
      <img src={heroSrc(stage)} alt="" aria-hidden width={HERO_FRAME.w} height={HERO_FRAME.h} style={pos} />
      {list.map((l) => <img key={l.id} src={l.src} alt="" aria-hidden width={HERO_FRAME.w} height={HERO_FRAME.h} style={pos} />)}
    </span>
  );
}
