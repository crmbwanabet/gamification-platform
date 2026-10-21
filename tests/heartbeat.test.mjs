import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHeartbeat, shouldBeat, cleanPing, HEARTBEAT_MS, MIN_PING_GAP_MS, ONLINE_WINDOW_S } from '../lib/heartbeat.mjs';

// fake timers: the interval callback is fired by hand
function rig() {
  const sent = [];
  const timers = new Map();
  let next = 1;
  const hb = createHeartbeat({
    send: (final) => sent.push(final ? 'final' : 'ping'),
    setTimer: (fn, ms) => { const id = next++; timers.set(id, { fn, ms }); return id; },
    clearTimer: (id) => timers.delete(id),
  });
  const tick = () => [...timers.values()].forEach(t => t.fn());
  return { hb, sent, timers, tick };
}

test('numbers: 30 s pings, 20 s server gap, 90 s online window', () => {
  assert.equal(HEARTBEAT_MS, 30000);
  assert.equal(MIN_PING_GAP_MS, 20000);
  assert.ok(MIN_PING_GAP_MS < HEARTBEAT_MS, 'a regular ping is never refused by the gap');
  assert.ok(ONLINE_WINDOW_S * 1000 >= HEARTBEAT_MS * 2.5, 'one late ping does not drop a player offline');
});

test('shouldBeat only when open AND visible', () => {
  assert.equal(shouldBeat({ open: true, visible: true }), true);
  assert.equal(shouldBeat({ open: true, visible: false }), false);
  assert.equal(shouldBeat({ open: false, visible: true }), false);
  assert.equal(shouldBeat({}), false);
});

test('starts with a ping at once, then one per interval', () => {
  const { hb, sent, timers, tick } = rig();
  hb.update({ visible: true });
  assert.deepEqual(sent, [], 'not open yet');
  hb.update({ open: true });
  assert.deepEqual(sent, ['ping']);
  assert.equal(timers.size, 1);
  assert.equal([...timers.values()][0].ms, HEARTBEAT_MS);
  tick(); tick();
  assert.deepEqual(sent, ['ping', 'ping', 'ping']);
  assert.equal(hb.beating, true);
});

test('tab hidden stops the pings with one final ping', () => {
  const { hb, sent, timers, tick } = rig();
  hb.update({ open: true, visible: true });
  hb.update({ visible: false });
  assert.deepEqual(sent, ['ping', 'final']);
  assert.equal(timers.size, 0);
  tick();
  assert.deepEqual(sent, ['ping', 'final'], 'no pings while hidden');
  hb.update({ visible: false });
  assert.deepEqual(sent, ['ping', 'final'], 'a second hide sends nothing');
  hb.update({ visible: true });
  assert.deepEqual(sent, ['ping', 'final', 'ping'], 'back to visible resumes');
});

test('widget closed stops; stop() on page exit sends the final ping once', () => {
  const { hb, sent } = rig();
  hb.update({ open: true, visible: true });
  hb.update({ open: false });
  assert.deepEqual(sent, ['ping', 'final']);
  hb.stop();
  assert.deepEqual(sent, ['ping', 'final'], 'already stopped');
  hb.update({ open: true });
  hb.stop();
  assert.deepEqual(sent, ['ping', 'final', 'ping', 'final']);
  assert.equal(hb.beating, false);
});

test('repeated open updates never double the timer', () => {
  const { hb, sent, timers } = rig();
  hb.update({ open: true, visible: true });
  hb.update({ open: true });
  hb.update({ visible: true });
  assert.equal(timers.size, 1);
  assert.deepEqual(sent, ['ping']);
});

test('cleanPing validates the sid and the final flag', () => {
  assert.deepEqual(cleanPing({ sid: '6f1c2a9e-1b2c-4d5e-8f90-123456789abc' }), { sid: '6f1c2a9e-1b2c-4d5e-8f90-123456789abc', final: false });
  assert.deepEqual(cleanPing({ sid: '17293847561234abcdef', final: true }), { sid: '17293847561234abcdef', final: true });
  assert.equal(cleanPing({ sid: '6f1c2a9e-1b2c-4d5e-8f90-123456789abc', final: 'yes' }).final, false);
  assert.equal(cleanPing(null), null);
  assert.equal(cleanPing('x'), null);
  assert.equal(cleanPing({}), null);
  assert.equal(cleanPing({ sid: 'short' }), null);
  assert.equal(cleanPing({ sid: 'x'.repeat(41) }), null);
  assert.equal(cleanPing({ sid: "abc'; drop table--" }), null);
  assert.equal(cleanPing({ sid: 12345678 }), null);
});
