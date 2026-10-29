import { test } from 'node:test';
import assert from 'node:assert/strict';
import { can, cleanPermissions, effectivePermissions, editProblem, checkPassword, cleanUsername, ALL_PERMISSIONS } from '../lib/ops/perms.mjs';
import { hashPassword, verifyPassword, newToken, sha256, auditHash, verifyChain, GENESIS, safeEqual } from '../lib/ops/crypto.mjs';

test('roles: master can do everything, limited only what is ticked, inactive nothing', () => {
  const master = { id: 1, role: 'master', permissions: [] };
  const lim = { id: 2, role: 'limited', permissions: ['see.report', 'nonsense'] };
  assert.ok(can(master, 'can.users'));
  assert.ok(can(lim, 'see.report'));
  assert.ok(!can(lim, 'see.players'));
  assert.ok(can(lim, null), 'any signed-in login may use me / logout / own password');
  assert.ok(!can({ ...master, active: false }, 'see.report'));
  assert.deepEqual(cleanPermissions(['see.health', 'x', 'see.report', 'see.report']), ['see.report', 'see.health']);
  assert.deepEqual(effectivePermissions(master), ALL_PERMISSIONS);
});

test('login edit guards: last master, own access', () => {
  const m = { id: 1, role: 'master', permissions: [], active: true };
  assert.match(editProblem({ actor: m, before: m, after: { ...m, role: 'limited' }, masters: 1 }), /last master/);
  assert.match(editProblem({ actor: m, before: m, after: { ...m, active: false }, masters: 2 }), /own login/);
  const lim = { id: 2, role: 'limited', permissions: ['see.report', 'can.users'], active: true };
  assert.match(editProblem({ actor: lim, before: lim, after: { ...lim, permissions: ['can.users'] }, masters: 1 }), /own access/);
  assert.equal(editProblem({ actor: m, before: lim, after: { ...lim, permissions: [] }, masters: 1 }), null);
});

test('passwords + usernames', () => {
  assert.equal(checkPassword('short').ok, false);
  assert.equal(checkPassword('a-long-enough-pass').ok, true);
  assert.equal(cleanUsername('  Chola.M '), 'chola.m');
  assert.equal(cleanUsername('a b'), null);
  const h = hashPassword('correct horse battery', undefined, 1000);
  assert.ok(verifyPassword('correct horse battery', h));
  assert.ok(!verifyPassword('wrong horse battery', h));
  assert.ok(safeEqual('abc', 'abc') && !safeEqual('abc', 'abd'));
});

test('session tokens: only the sha256 is stored', () => {
  const { token, tokenHash } = newToken();
  assert.equal(token.length, 64);
  assert.equal(tokenHash, sha256(token));
  assert.notEqual(token, tokenHash);
});

test('audit chain: intact, then tampered', () => {
  const rows = [];
  let prev = GENESIS;
  for (let i = 1; i <= 3; i++) {
    const at = new Date(Date.UTC(2026, 9, 22, 12, i)).toISOString();
    const e = { at, actor: 'boss', ip: '1.2.3.4', action: 'auth.login', target: null, detail: { n: i } };
    const hash = auditHash(prev, e);
    rows.push({ id: i, ...e, prev_hash: prev, hash });
    prev = hash;
  }
  assert.deepEqual(verifyChain(rows), { ok: true, checked: 3, brokenAt: null });
  rows[1] = { ...rows[1], actor: 'someone else' };
  assert.equal(verifyChain(rows).brokenAt, 2);
});

test('ops console page: dates are dd-mm-yyyy in both languages, no leftover dd.mm / "Oct" strings', async () => {
  const { readFileSync } = await import('node:fs');
  const html = readFileSync(new URL('../public/ops/index.html', import.meta.url), 'utf8');
  assert.ok(!/function dsep/.test(html), 'one shared formatter, no per-language separator');
  assert.ok(!/\b\d{1,2} (Oct|Nov|Sep)\w* 20\d\d/.test(html), 'no written-out dates in strings');
  assert.match(html, /placeholder="dd-mm-yyyy"/);
});
