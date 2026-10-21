// The Wheel of Fortune <-> Bonus Center contract (2026-10-21). The same JSON
// lives in the wheel repo; its own test checks the wheel side. If this fails,
// the code and the contract disagree: fix the code, or change the contract in
// BOTH repos (`npm run contract:check` compares them).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');
const contract = JSON.parse(read('docs/integrations/wheel-bonus-center-contract.json'));
const useWheel = read('components/extras/useWheel.jsx');
const widget = read('public/widget.js');

test('the default wheel URL is the contract wheel origin', () => {
  const m = useWheel.match(/NEXT_PUBLIC_WHEEL_URL \|\| '([^']+)'/);
  assert.ok(m, 'WHEEL_URL default not found in useWheel.jsx');
  assert.equal(new URL(m[1]).origin, contract.origins.wheel);
});

test('widget.js falls back to the contract Bonus Center origin', () => {
  assert.ok(widget.includes(`'${contract.origins.bonusCenter}'`));
});

test('the Bonus Center is allowed to hand the wheel its token', () => {
  assert.ok(contract.wheelAllowsAuthFrom.includes(contract.origins.bonusCenter));
});

test('every wheel -> host message is handled, every host -> wheel message is sent', () => {
  for (const { type } of contract.messages.wheelToHost) assert.ok(useWheel.includes(`'${type}'`), `useWheel.jsx does not handle ${type}`);
  for (const { type } of contract.messages.hostToWheel) assert.ok(useWheel.includes(`type: '${type}'`), `useWheel.jsx does not send ${type}`);
});

test('the preview uses only contract URL params', () => {
  const m = useWheel.match(/\$\{WHEEL_URL\}\/\?([^`]+)`/);
  assert.ok(m, 'preview src not found in useWheel.jsx');
  const names = contract.urlParams.map(p => p.name);
  for (const pair of m[1].split('&')) assert.ok(names.includes(pair.split('=')[0]), `${pair} is not in the contract`);
});
