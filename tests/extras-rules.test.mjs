import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LEAGUE_BANDS, bandForStage, bandForXp, maskId, weeklyXpByUser, rankBoard, prizeForRank, lastWeek, thisWeek,
  comebackOffer, inactivePlayers, isActiveRow, pickOpen, settlePick, PICK_CLOSE_MS, weekSlip, SLIP_SIZE, PREDICTION_COINS, STORY_PRIZE, NAME_PRIZE,
} from '../lib/extras/rules.mjs';

test('bands cover stages 1..23 without gaps', () => {
  for (let s = 1; s <= 23; s++) assert.ok(LEAGUE_BANDS.some(b => s >= b.from && s <= b.to), `stage ${s}`);
  assert.equal(bandForStage(8).id, 'street');
  assert.equal(bandForStage(12).id, 'pro');
  assert.equal(bandForStage(23).id, 'intl');
  assert.equal(bandForXp(0).id, 'street');
  assert.equal(bandForXp(10000).id, 'pro', '10,000 XP = stage 12');
});

test('maskId hides the middle', () => {
  assert.equal(maskId('123456'), '12••56');
  assert.equal(maskId('123'), '1••');
});

test('weekly XP from CRM rows: daily cap 400, weekly cap 2,000', () => {
  const rows = [
    { user_id: '1', day: '2026-10-19', casino_stake: 10000 }, // 1,000 -> capped 400
    { user_id: '1', day: '2026-10-20', sports_stake: 40 },    // 10
    { user_id: '2', day: '2026-10-19', casino_stake: 50 },    // 5
  ];
  assert.deepEqual(weeklyXpByUser(rows), { 1: 410, 2: 5 });
  const many = Array.from({ length: 7 }, (_, i) => ({ user_id: '3', day: `2026-10-${19 + i}`, casino_stake: 10000 }));
  assert.equal(weeklyXpByUser(many)['3'], 2000);
});

test('rankBoard: per band, highest XP first, zero XP left out, ties keep order', () => {
  const b = rankBoard([
    { userId: 'a', xp: 50, totalXp: 100 },
    { userId: 'b', xp: 80, totalXp: 200 },
    { userId: 'c', xp: 80, totalXp: 300 },
    { userId: 'd', xp: 0, totalXp: 100 },
    { userId: 'e', xp: 999, totalXp: 10000 },
  ]);
  assert.deepEqual(b.street.map(r => [r.rank, r.userId]), [[1, 'b'], [2, 'c'], [3, 'a']]);
  assert.deepEqual(b.pro.map(r => r.userId), ['e']);
  assert.equal(b.amateur.length, 0);
  assert.equal(prizeForRank(1), 5000);
  assert.equal(prizeForRank(10), 500);
  assert.equal(prizeForRank(11), 0);
});

test('weeks are Lusaka Mon–Sun', () => {
  assert.deepEqual(lastWeek('2026-10-21'), { from: '2026-10-12', to: '2026-10-18' });
  assert.deepEqual(thisWeek('2026-10-21'), { from: '2026-10-19', to: '2026-10-21' });
});

test('comeback: 7+ days since the last active day, once per lapse', () => {
  const rows = [{ day: '2026-10-01', casino_stake: 20 }, { day: '2026-10-05', casino_rounds: 0 }, { day: '2026-10-19', casino_stake: 5 }];
  const o = comebackOffer(rows, '2026-10-19');
  assert.equal(o.lastActiveDay, '2026-10-01', 'an empty row is not activity; today does not count');
  assert.equal(o.daysAway, 18);
  assert.equal(o.eligible, true);
  assert.equal(comebackOffer(rows, '2026-10-19', ['2026-10-01']).eligible, false);
  assert.equal(comebackOffer([{ day: '2026-10-15', deposits_count: 1 }], '2026-10-19').eligible, false, 'only 4 days');
  assert.equal(comebackOffer([], '2026-10-19').eligible, false, 'never active = not a comeback');
  assert.equal(isActiveRow({ sports_slips: 1 }), true);
});

test('inactive players for the SMS list: 7..60 days, claimed lapses left out', () => {
  const rows = [
    { user_id: '1', day: '2026-10-10', casino_stake: 5 },
    { user_id: '1', day: '2026-10-11', casino_stake: 5 },
    { user_id: '2', day: '2026-10-18', casino_stake: 5 },
    { user_id: '3', day: '2026-08-01', casino_stake: 5 },
    { user_id: '4', day: '2026-10-01', casino_stake: 5 },
  ];
  const list = inactivePlayers(rows, '2026-10-19', new Set(['4:2026-10-01']));
  assert.deepEqual(list, [{ userId: '1', lastActiveDay: '2026-10-11', daysInactive: 8 }]);
});

test('predictions: picks close 5 minutes before kick-off; settle 1X2', () => {
  const now = Date.parse('2026-10-19T12:00:00Z');
  assert.equal(pickOpen(new Date(now + PICK_CLOSE_MS + 1000).toISOString(), now), true);
  assert.equal(pickOpen(new Date(now + 60000).toISOString(), now), false);
  assert.equal(pickOpen('nope', now), false);
  assert.equal(settlePick('home', { outcome: 'home' }), 'won');
  assert.equal(settlePick('draw', { outcome: 'away' }), 'lost');
  assert.equal(settlePick('home', null), null);
});

test('weekly prediction slip: 5 picks, all right to win, once', () => {
  assert.equal(SLIP_SIZE, 5);
  assert.equal(PREDICTION_COINS, 20000);
  const row = (i, pick, outcome, extra = {}) => ({ pick, outcome: outcome || null, settled_at: outcome ? 'x' : null, claimed_at: null,
    pick_day: '2026-10-2' + Math.min(i, 5), kickoff: `2026-10-2${Math.min(i, 5)}T1${i}:00:00Z`, ...extra });
  const wk = '2026-10-19'; // Monday
  const four = [1, 2, 3, 4].map(i => row(i, 'home', 'home'));
  assert.equal(weekSlip(four, wk).status, 'open');
  const five = [...four, row(5, 'away')];
  assert.equal(weekSlip(five, wk).status, 'pending');
  const won = [...four, row(5, 'away', 'away')];
  assert.deepEqual([weekSlip(won, wk).status, weekSlip(won, wk).right, weekSlip(won, wk).claimable], ['won', 5, true]);
  assert.equal(weekSlip([...four, row(5, 'away', 'draw')], wk).status, 'lost');
  assert.equal(weekSlip([row(1, 'home', 'draw')], wk).status, 'lost', 'one wrong loses the week early');
  const claimed = won.map(r => ({ ...r, claimed_at: 'y' }));
  assert.equal(weekSlip(claimed, wk).claimable, false);
  // picks from another week never count
  assert.equal(weekSlip([...four, row(5, 'away', 'away', { pick_day: '2026-10-26' })], wk).status, 'open');
});

test('story prize is 100 coins + 10 XP', () => {
  assert.deepEqual(STORY_PRIZE, { coins: 100, xp: 10 });
  assert.deepEqual(NAME_PRIZE, { coins: 0, xp: 20 });
});
