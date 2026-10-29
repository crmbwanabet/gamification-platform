import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CASHBACK_RATE, windowAt, windowFor, lastFinishedWindow, nextWindowDay, cashbackAward, paysGems, awardCoins, cashbackSplit, CASHBACK_TAKES } from '../lib/cashback/rules.mjs';
import { mapCashbackRow, runCashback, cleanState } from '../lib/cashback/crmCashback.mjs';

const ECO = { coinsPerKwacha: 10000, gemValues: { emerald: 200000, ruby: 500000, diamond: 1000000 } };

test('window = the UTC day (02:00 -> 02:00 Lusaka), paid from 06:00 Lusaka the next morning', () => {
  assert.equal(CASHBACK_RATE, 0.05);
  assert.deepEqual(windowFor('2026-10-24'), {
    day: '2026-10-24', start: '2026-10-24T00:00:00.000Z', end: '2026-10-25T00:00:00.000Z', payAt: '2026-10-25T04:00:00.000Z',
  });
  assert.equal(windowAt(new Date('2026-10-24T00:00:00Z')).day, '2026-10-24');   // 02:00 Lusaka: a new window
  assert.equal(windowAt(new Date('2026-10-23T23:59:59Z')).day, '2026-10-23');   // 01:59 Lusaka on the 24th: still the 23rd's
  assert.equal(lastFinishedWindow(new Date('2026-10-25T04:00:00Z')), '2026-10-24'); // 06:00 Lusaka: pay the 24th
  assert.equal(lastFinishedWindow(new Date('2026-10-25T03:59:00Z')), '2026-10-23'); // 05:59: the 24th waits (data is ready, the gems wait)
  assert.equal(lastFinishedWindow(new Date('2026-10-25T01:00:00Z')), '2026-10-23');
  assert.equal(nextWindowDay('2026-10-31'), '2026-11-01');
});

test('award: 5% of the loss, biggest gems first, last part to the NEAREST emerald', () => {
  const a = (loss) => { const r = cashbackAward(loss, ECO); return [r.diamonds, r.rubies, r.emeralds]; };
  assert.deepEqual(a(0), [0, 0, 0]);
  assert.deepEqual(a(-50), [0, 0, 0]);
  assert.deepEqual(a(NaN), [0, 0, 0]);
  assert.deepEqual(a(199.89), [0, 0, 0]);  // K9.99 back < half an emerald
  assert.deepEqual(a(200), [0, 0, 1]);     // K10 back = half an emerald -> rounds up
  assert.deepEqual(a(400), [0, 0, 1]);     // K20 = 1 emerald
  assert.deepEqual(a(500), [0, 0, 1]);     // K25 -> 1.25 -> 1
  assert.deepEqual(a(600), [0, 0, 2]);     // K30 -> 1.5 -> 2
  assert.deepEqual(a(1000), [0, 1, 0]);    // K50 = 1 ruby
  assert.deepEqual(a(1900), [0, 1, 2]);    // K95 = ruby + K45 -> 2.25 emeralds -> 2
  assert.deepEqual(a(2000), [1, 0, 0]);    // K100 = 1 diamond
  assert.deepEqual(a(7340), [3, 1, 1]);    // K367 = 3 diamonds + 1 ruby + K17 -> 1 emerald
  const r = cashbackAward(7340, ECO);
  assert.equal(r.cashbackKwacha, 367);
  assert.equal(r.valueCoins, 3670000);
  assert.equal(r.paidCoins, 3700000);
  assert.equal(paysGems(cashbackAward(100, ECO)), false);
  assert.equal(paysGems(cashbackAward(250, ECO)), true);
});

test('award: rounding never pays more than half an emerald over the 5%', () => {
  for (let loss = 0; loss <= 5000; loss += 7.31) {
    const r = cashbackAward(loss, ECO);
    assert.ok(r.paidCoins - r.valueCoins <= 100000, `loss ${loss}: over by ${r.paidCoins - r.valueCoins}`);
    assert.ok(r.valueCoins - r.paidCoins < 100000, `loss ${loss}: under by ${r.valueCoins - r.paidCoins}`);
  }
});

test('award follows the configured economy', () => {
  const r = cashbackAward(400, { coinsPerKwacha: 1000, gemValues: { emerald: 10000, ruby: 50000, diamond: 100000 } });
  assert.equal(r.valueCoins, 20000);
  assert.deepEqual([r.diamonds, r.rubies, r.emeralds], [0, 0, 2]);
});

test('CRM row: net loss = stakes - winnings (casino + sports), never below 0; junk rejected', () => {
  assert.deepEqual(mapCashbackRow({ user_id: 53, casino_stake: 300, casino_win: 120.5, sports_stake: '100', sports_win: 0 }),
    { user_id: '53', loss: 279.5, casino_stake: 300, casino_win: 120.5, sports_stake: 100, sports_win: 0 });
  assert.equal(mapCashbackRow({ user_id: '9', casino_stake: 10, casino_win: 50, sports_stake: 0, sports_win: 0 }).loss, 0);
  assert.equal(mapCashbackRow({ user_id: 'x', casino_stake: 1, casino_win: 0, sports_stake: 0, sports_win: 0 }).error, 'bad_user_id');
  assert.equal(mapCashbackRow({ user_id: 5, casino_stake: -1, casino_win: 0, sports_stake: 0, sports_win: 0 }).error, 'bad_casino_stake');
  assert.equal(mapCashbackRow({ user_id: 5, casino_stake: 1, casino_win: 0, sports_stake: 0 }).error, 'bad_sports_win');
  assert.equal(mapCashbackRow(null).error, 'not_an_object');
});

// --- the job, with a fake CRM + DB ---
function fakes({ pages, anchors = {}, state = null }) {
  const calls = [];
  const db = {
    state, awards: new Map(), daily: new Map(), saves: [],
    async readState() { return this.state; },
    async saveState(s, run) { this.state = { since: s.paid, after_day: s.window, after_user: s.afterUser }; this.saves.push(run.status); },
    async loadEconomy() { return ECO; },
    async loadAnchors() { return anchors; },
    async insertDaily(rows) { for (const r of rows) { const k = `${r.user_id}|${r.window_day}`; if (!this.daily.has(k)) this.daily.set(k, r); } },
    async insertAwards(rows) {
      let n = 0;
      for (const r of rows) { const k = `${r.user_id}|${r.window_day}`; if (!this.awards.has(k)) { this.awards.set(k, r); n++; } }
      return n;
    },
  };
  const fetch = async (url, init) => {
    const u = new URL(url);
    calls.push({ window: u.searchParams.get('window'), after: u.searchParams.get('after_user'), key: init.headers['x-api-key'] });
    const p = pages(u.searchParams.get('window'), u.searchParams.get('after_user'));
    if (p.status) return { ok: false, status: p.status, json: async () => ({}) };
    return { ok: true, status: 200, json: async () => p };
  };
  return { db, fetch, calls };
}
const row = (id, cs, cw = 0) => ({ user_id: id, casino_stake: cs, casino_win: cw, sports_stake: 0, sports_win: 0 });
const NOW = new Date('2026-10-24T04:05:00Z'); // 06:05 Lusaka on the 24th: window 23 has ended

test('job: disabled without the API key', async () => {
  const { db, fetch } = fakes({ pages: () => ({}) });
  assert.equal((await runCashback({ env: {}, fetch, db, now: NOW })).status, 'disabled');
});

test('job: first run pays the last finished window only, by anchor, pages through, once', async () => {
  const { db, fetch, calls } = fakes({
    anchors: { 1: '2026-10-01', 2: '2026-10-23', 3: '2026-10-24' }, // 3 anchored after the window, 4 never
    pages: (w, after) => (after == null
      ? { window: w, complete: true, rows: [row(1, 1000), row(2, 600), row(3, 5000)], next_after_user: '3' }
      : { window: w, complete: true, rows: [row(4, 9000), row(5, 100), { user_id: 'bad' }], next_after_user: null }),
  });
  const out = await runCashback({ env: { GAMIFICATION_API_KEY: 'k' }, fetch, db, now: NOW });
  assert.equal(out.status, 'done');
  assert.deepEqual(out.windows, ['2026-10-23']);
  assert.equal(out.rejected, 1);
  assert.deepEqual(calls.map(c => [c.window, c.after]), [['2026-10-23', null], ['2026-10-23', '3']]);
  assert.equal(calls[0].key, 'k');
  assert.deepEqual([...db.awards.keys()].sort(), ['1|2026-10-23', '2|2026-10-23']);
  assert.deepEqual(['rubies', 'emeralds'].map(k => db.awards.get('1|2026-10-23')[k]), [1, 0]); // K50 = 1 ruby
  assert.equal(db.awards.get('2|2026-10-23').emeralds, 2);                                     // K30 -> 2 emeralds
  assert.equal(db.state.since, '2026-10-23');
  // the ledger holds EVERY reported player's day, with the reason when it pays nothing
  assert.equal(out.recorded, 5);
  assert.deepEqual([...db.daily.values()].map(r => [r.user_id, r.status, r.cashback_kwacha]),
    [['1', 'awarded', 50], ['2', 'awarded', 30], ['3', 'not_eligible', 250], ['4', 'not_eligible', 450], ['5', 'not_eligible', 5]]);
  assert.equal(db.daily.get('3|2026-10-23').rubies, 0); // no gems on a day that does not pay
  // a second run the same morning: nothing to do, nothing paid twice
  const again = await runCashback({ env: { GAMIFICATION_API_KEY: 'k' }, fetch, db, now: NOW });
  assert.equal(again.status, 'up_to_date');
  assert.equal(db.awards.size, 2);
});

test('job: waits while the CRM window is not complete, then catches up oldest first', async () => {
  let ready = false;
  const { db, fetch } = fakes({
    state: { since: '2026-10-21' }, anchors: { 1: '2026-10-01' },
    pages: (w) => ({ window: w, complete: w !== '2026-10-23' || ready, rows: [row(1, 400)], next_after_user: null }),
  });
  const first = await runCashback({ env: { GAMIFICATION_API_KEY: 'k' }, fetch, db, now: NOW });
  assert.equal(first.status, 'waiting');
  assert.deepEqual(first.windows, ['2026-10-22']);
  assert.equal(db.state.since, '2026-10-22');
  ready = true;
  const second = await runCashback({ env: { GAMIFICATION_API_KEY: 'k' }, fetch, db, now: NOW });
  assert.equal(second.status, 'done');
  assert.deepEqual([...db.awards.keys()], ['1|2026-10-22', '1|2026-10-23']);
});

test('job: a CRM error stops the run and keeps the progress', async () => {
  const { db, fetch } = fakes({ state: { since: '2026-10-22' }, pages: () => ({ status: 500 }) });
  const out = await runCashback({ env: { GAMIFICATION_API_KEY: 'k' }, fetch, db, now: NOW });
  assert.equal(out.status, 'crm_error');
  assert.equal(out.error, 'crm_http_500');
  assert.equal(db.state.since, '2026-10-22');
});

test('job: a page for the wrong window is rejected as a bad body', async () => {
  const { db, fetch } = fakes({ pages: () => ({ window: '2026-01-01', complete: true, rows: [], next_after_user: null }) });
  const out = await runCashback({ env: { GAMIFICATION_API_KEY: 'k' }, fetch, db, now: NOW });
  assert.equal(out.error, 'crm_bad_body');
});

test('cleanState: junk -> nothing saved', () => {
  assert.deepEqual(cleanState(null), { paid: null, window: null, afterUser: null });
  assert.deepEqual(cleanState({ since: 'x', after_day: '2026-10-23', after_user: '7' }), { paid: null, window: '2026-10-23', afterUser: '7' });
});

test('job: the ledger records small losses and wins too', async () => {
  const { db, fetch } = fakes({
    anchors: { 1: '2026-10-01', 2: '2026-10-01' },
    pages: (w) => ({ window: w, complete: true, rows: [row(1, 100), row(2, 50, 80)], next_after_user: null }),
  });
  const out = await runCashback({ env: { GAMIFICATION_API_KEY: 'k' }, fetch, db, now: NOW });
  assert.equal(out.awarded, 0);
  assert.deepEqual([...db.daily.values()].map(r => [r.user_id, r.status, r.net_loss, r.cashback_kwacha]),
    [['1', 'below_minimum', 100, 5], ['2', 'no_loss', 0, 0]]);
});

test('cashback taken as coins = what the gems are worth', () => {
  assert.deepEqual(CASHBACK_TAKES, ['gems', 'coins', 'emeralds', 'rubies', 'diamonds']);
  assert.equal(awardCoins({ diamonds: 1, rubies: 1, emeralds: 2 }, ECO), 1900000);
  assert.equal(awardCoins(cashbackAward(200, ECO), ECO), 200000); // K10 back = 1 emerald = 200,000 coins
  assert.equal(awardCoins({ emeralds: 1 }, { gemValues: { emerald: 50000 } }), 50000);
  assert.equal(awardCoins({ emeralds: -3, rubies: 1.5 }, ECO), 0);
  assert.equal(awardCoins(null, ECO), 0);
});

test('choose reward: the value as coins, or one gem kind + the rest in coins', () => {
  assert.deepEqual(cashbackSplit(1400000, 'coins', ECO), { coins: 1400000, emeralds: 0, rubies: 0, diamonds: 0 });
  assert.deepEqual(cashbackSplit(1400000, 'emeralds', ECO), { coins: 0, emeralds: 7, rubies: 0, diamonds: 0 });
  assert.deepEqual(cashbackSplit(1400000, 'rubies', ECO), { coins: 400000, emeralds: 0, rubies: 2, diamonds: 0 });
  assert.deepEqual(cashbackSplit(1400000, 'diamonds', ECO), { coins: 400000, emeralds: 0, rubies: 0, diamonds: 1 });
  assert.deepEqual(cashbackSplit(200000, 'rubies', ECO), { coins: 200000, emeralds: 0, rubies: 0, diamonds: 0 }); // not enough: all coins
  assert.deepEqual(cashbackSplit(-5, 'emeralds', ECO), { coins: 0, emeralds: 0, rubies: 0, diamonds: 0 });
  // never pays more than the value
  for (const pot of [200000, 700000, 1900000]) for (const k of ['coins', 'emeralds', 'rubies', 'diamonds']) {
    const s = cashbackSplit(pot, k, ECO);
    assert.equal(s.coins + s.emeralds * 200000 + s.rubies * 500000 + s.diamonds * 1000000, pot);
  }
});
