// Bonus Center OPS CONSOLE (2026-10-22): roles + permissions, the same model as
// the USSD ops console. A `master` may do everything; a `limited` login only
// what is ticked. Read-only in v1: the only action is managing logins. Pure.

export const SECTIONS = [
  { id: 'see.report', label: 'Report' },
  { id: 'see.coins', label: 'Coins & prizes' },
  { id: 'see.txns', label: 'Transactions' },
  { id: 'see.trends', label: 'Trends' },
  { id: 'see.players', label: 'Players' },
  { id: 'see.activity', label: 'Activity' },
  { id: 'see.health', label: 'System health' },
];
export const ACTIONS = [
  { id: 'can.users', label: 'Manage logins' },
];
export const ALL_PERMISSIONS = [...SECTIONS, ...ACTIONS].map(p => p.id);

/** Route -> the permission it needs (null = any signed-in login). */
export const ROUTE_PERMS = {
  me: null,
  'auth/logout': null,
  'auth/password': null,
  report: 'see.report',
  coins: 'see.coins',
  transactions: 'see.txns',
  trends: 'see.trends',
  players: 'see.players',
  player: 'see.players',
  activity: 'see.activity',
  'activity/verify': 'see.activity',
  health: 'see.health',
  users: 'can.users',
  'users/create': 'can.users',
  'users/update': 'can.users',
  'users/password': 'can.users',
};

/** Keep only known permission ids, de-duplicated, in the canonical order. */
export function cleanPermissions(list) {
  const want = new Set(Array.isArray(list) ? list.filter(x => typeof x === 'string') : []);
  return ALL_PERMISSIONS.filter(p => want.has(p));
}

/** May this login use `perm`? A master may do everything; inactive logins nothing. */
export function can(admin, perm) {
  if (!admin || admin.active === false) return false;
  if (perm == null) return true;
  if (admin.role === 'master') return true;
  return Array.isArray(admin.permissions) && admin.permissions.includes(perm);
}

/** The permissions a login effectively has (masters: all). */
export const effectivePermissions = (admin) => (admin?.role === 'master' ? [...ALL_PERMISSIONS] : cleanPermissions(admin?.permissions));

export const USERNAME_RE = /^[a-z0-9._-]{3,32}$/;
export const PASSWORD_MIN = 12;

/** { ok } or { ok:false, reason } for a new / changed password. */
export function checkPassword(pw) {
  if (typeof pw !== 'string' || pw.length < PASSWORD_MIN) return { ok: false, reason: `Use at least ${PASSWORD_MIN} characters` };
  if (pw.length > 200) return { ok: false, reason: 'Too long' };
  return { ok: true };
}

/** Normalised username or null: lowercase letters, digits, . _ - (3-32). */
export function cleanUsername(u) {
  const v = typeof u === 'string' ? u.trim().toLowerCase() : '';
  return USERNAME_RE.test(v) ? v : null;
}

/**
 * Guards for editing logins (USSD rules): the last active master can't be
 * removed or demoted, and nobody can reduce their own access.
 * `before`/`after` = the edited login; `actor` = who edits; `masters` = active master count now.
 */
export function editProblem({ actor, before, after, masters }) {
  const wasMaster = before.role === 'master' && before.active !== false;
  const staysMaster = after.role === 'master' && after.active !== false;
  if (wasMaster && !staysMaster && masters <= 1) return 'The last master login cannot be removed or demoted';
  if (actor.id === before.id) {
    if (after.active === false) return 'You cannot switch off your own login';
    if (before.role === 'master' && after.role !== 'master') return 'You cannot reduce your own access';
    const lost = effectivePermissions(before).filter(p => !effectivePermissions(after).includes(p));
    if (lost.length) return 'You cannot reduce your own access';
  }
  return null;
}
