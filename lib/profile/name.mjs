// ============================================================================
// Player display name (2026-10-09). The header + profile show the PLAYER
// (name, else their bwanabet ID) — Vuma Katongo stays the story character.
// Rules: the first name can be added any time; after that the player may
// rename once per stage-up (a name set at stage N unlocks again at N+1).
// State keys on the user blob (saved via /api/state like every other key):
//   displayName     string | null
//   nameSetAtStage  stage (1..17) at which the name was last set | null
// Pure ESM so node --test can pin it (tests/profile-name.test.mjs).
// ============================================================================

export const NAME_MIN = 2;
export const NAME_MAX = 16;
// Letters (any script, accents incl. combining marks), digits, space, . _ -
const ALLOWED = /^[\p{L}\p{M}\p{Nd} ._-]+$/u;
const HAS_ALNUM = /[\p{L}\p{Nd}]/u;

/** Trim, collapse inner whitespace, NFC-normalise. Non-strings -> ''. */
export function cleanName(raw) {
  if (typeof raw !== 'string') return '';
  return raw.normalize('NFC').replace(/\s+/gu, ' ').trim();
}

/** { ok: true, name } or { ok: false, reason } (short, player-facing). */
export function validateName(raw) {
  const name = cleanName(raw);
  const len = [...name].length;
  if (!len) return { ok: false, reason: 'Enter a name' };
  if (len < NAME_MIN) return { ok: false, reason: `Use at least ${NAME_MIN} characters` };
  if (len > NAME_MAX) return { ok: false, reason: `Use at most ${NAME_MAX} characters` };
  if (!ALLOWED.test(name)) return { ok: false, reason: 'Use letters, numbers, spaces, . _ or -' };
  if (!HAS_ALNUM.test(name)) return { ok: false, reason: 'Include a letter or number' };
  return { ok: true, name };
}

const validStage = (s) => Number.isInteger(s) && s >= 0;

/** The player's current valid name, or null. */
export function playerName(user) {
  const v = validateName(user?.displayName);
  return v.ok ? v.name : null;
}

/** May the player set/change their name at `currentStage`? */
export function canRename(user, currentStage) {
  if (!playerName(user)) return true; // first name: any time
  const at = user.nameSetAtStage;
  if (!validStage(at)) return true; // no lock recorded -> don't strand the player
  return Number.isInteger(currentStage) && currentStage > at;
}

/** Stage at which the next rename unlocks, or null when renaming is open now / no name yet. */
export function nextRenameStage(user, currentStage) {
  if (canRename(user, currentStage)) return null;
  return user.nameSetAtStage + 1;
}

/**
 * New user state with the name set, or null when the name is invalid or a
 * rename is locked. Setting the same name again returns `user` unchanged
 * (no rename consumed).
 */
export function setName(user, name, stage) {
  const v = validateName(name);
  if (!v.ok) return null;
  if (playerName(user) === v.name) return user;
  if (!canRename(user, stage)) return null;
  return { ...user, displayName: v.name, nameSetAtStage: validStage(stage) ? stage : 0 };
}

/** Sanitise the name keys of a saved state blob (old blobs have neither). */
export function normalizeNameState(saved) {
  const v = validateName(saved?.displayName);
  if (!v.ok) return { displayName: null, nameSetAtStage: null };
  return { displayName: v.name, nameSetAtStage: validStage(saved.nameSetAtStage) ? saved.nameSetAtStage : 0 };
}

/** Header/profile label pieces: { title, sub } — name over "ID x", else "ID x", else "Player". */
export function playerLabel(user, userId) {
  const name = playerName(user);
  const id = userId != null && String(userId).trim() ? `ID ${String(userId).trim()}` : null;
  if (name) return { title: name, sub: id, named: true };
  return { title: id || 'Player', sub: null, named: false };
}
