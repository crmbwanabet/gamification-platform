# Admin Dashboard Plan C: Purchases + Fulfillment + Telegram Two-Way Sync

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Open the player store for real: server-backed purchases with atomic stock, a Telegram admin-group notification with a ✅ credit button, a CRM Fulfillment queue that stays in two-way sync with Telegram, and exactly-once refunds — rollout step 5 (final) of the spec at `docs/superpowers/specs/2026-07-15-gamification-admin-dashboard-design.md`.

**Architecture:** Two SQL RPCs make purchase/reject atomic (stock + row in one transaction). The gamification app gains `POST/GET /api/purchase` (RPC + Telegram send with inline button; list for refund reconciliation) and `POST /api/telegram/webhook` (secret-verified button-tap → credit). The player client replaces the gated `buyStoreItem` with the server call and reconciles rejected-purchase refunds exactly once via `state.refundedPurchaseIds`. The CRM's `api/gamification.js` gains `purchases`/`credit_purchase`/`reject_purchase` ops (editing the Telegram message on dashboard-side handling), and the Fulfillment placeholder becomes the queue UI.

**Tech Stack:** As Plans A/B. Telegram Bot API (token + admin-group chat id already in the gamification app's env; token+chat id must ALSO go to the CRM's Vercel env for message edits). New env: `TELEGRAM_WEBHOOK_SECRET` (gamification app).

**Conventions:** Same as Plans A/B (main + auto-deploy; Supabase MCP + secrets = coordinator-run; gamification repo deploys via `git push` + `vercel --prod`, CRM auto-deploys on push so CRM pushes happen only at ship time).

**Trust model reminders (from the spec):** the server validates price/stock and profile existence, NOT the player's coin balance (balances live in the client-saved state blob — unchanged). Purchases are restricted to SSO players (profile row must exist) so they are fulfillable and refundable. Rejection restores stock and refunds coins on the player's next session load, exactly once.

**Task order:** 1 (coordinator: RPCs + env) → 2 (telegram lib) → 3 (purchase routes) → 4 (webhook) → 5 (player client) → 6 (coordinator: deploy + webhook registration + prod smoke) → 7 (CRM ops) → 8 (CRM Fulfillment UI) → 9 (ship + QA + docs + final review).

---

### Task 1 (COORDINATOR-RUN): purchase RPCs + env vars

**No repo files.** Recorded for completeness.

- [ ] **Step 1: Migration** `purchase_fulfillment_rpcs` on project `hhdqeihdqqqdrbhvmeuj`:

```sql
-- Atomic purchase: lock the item row, check availability/stock, decrement,
-- insert the pending purchase. Returns {purchase} or {error}.
create or replace function purchase_item(p_uid text, p_item_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item store_items%rowtype;
  v_purchase purchases%rowtype;
begin
  select * into v_item from store_items where id = p_item_id for update;
  if not found or not v_item.active then
    return jsonb_build_object('error', 'item_unavailable');
  end if;
  if v_item.stock is not null and v_item.stock <= 0 then
    return jsonb_build_object('error', 'out_of_stock');
  end if;
  if v_item.stock is not null then
    update store_items set stock = stock - 1 where id = p_item_id;
  end if;
  insert into purchases (uid, item_id, item_name, price_kwacha, price_gems)
  values (p_uid, p_item_id, v_item.name, v_item.price_kwacha, v_item.price_gems)
  returning * into v_purchase;
  return jsonb_build_object('purchase', row_to_json(v_purchase));
end
$$;

-- Race-safe reject: only a pending purchase flips; stock is restored for
-- stock-tracked items. Returns {purchase} or {error:'already_handled'}.
create or replace function reject_purchase(p_purchase_id uuid, p_handled_by text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_p purchases%rowtype;
begin
  update purchases
     set status = 'rejected', handled_by = p_handled_by, handled_at = now()
   where id = p_purchase_id and status = 'pending'
   returning * into v_p;
  if not found then
    return jsonb_build_object('error', 'already_handled');
  end if;
  if v_p.item_id is not null then
    update store_items set stock = stock + 1 where id = v_p.item_id and stock is not null;
  end if;
  return jsonb_build_object('purchase', row_to_json(v_p));
end
$$;

revoke all on function purchase_item(text, uuid) from public;
revoke all on function purchase_item(text, uuid) from anon;
revoke all on function purchase_item(text, uuid) from authenticated;
revoke all on function reject_purchase(uuid, text) from public;
revoke all on function reject_purchase(uuid, text) from anon;
revoke all on function reject_purchase(uuid, text) from authenticated;
```

- [ ] **Step 1b: Extend the stats RPC with store spend** (deferred from Plan B — the Overview's "store spend" KPI becomes meaningful now). Apply migration `admin_dashboard_stats_store_spend`: re-run Plan B's full `create or replace function admin_dashboard_stats(...)` definition (see `bwanabet-crm-overview/docs/superpowers/plans/2026-07-16-gamification-dashboard-tab.md` Task 2) with ONE added line inside the `kpis` jsonb_build_object:

```sql
    'store_spend', coalesce((select sum(price_kwacha) from purchases where status <> 'rejected' and created_at between p_from and p_to), 0),
```

(Non-rejected = pending + credited both count as spend; rejected purchases are refunded so they don't.) Re-apply the three revokes (create or replace resets nothing, but keep the migration self-contained). Smoke: `select admin_dashboard_stats(now() - interval '7 days', now());` → kpis now include `store_spend: 0`.

- [ ] **Step 2: Smoke via MCP `execute_sql`** — insert a temp item, buy it twice with stock 1 (second must return `out_of_stock`), reject the purchase (stock back to 1, second reject returns `already_handled`), then delete the temp rows.

- [ ] **Step 3: Env vars.**
  - Gamification Vercel project: generate a random `TELEGRAM_WEBHOOK_SECRET` (32+ chars), add to Production (+ local `.env.local`). `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID` already exist (verified).
  - CRM Vercel project: add `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` (same values as the gamification app's) to production/preview/development + local `.env` — needed for dashboard-side message edits.

---

### Task 2: Gamification repo — telegram lib (pure format + client)

**Files (in `C:\Users\USER\Desktop\Claude projects\Gamification platform`):**
- Create: `lib/telegram/format.mjs` (pure, node-testable)
- Create: `tests/telegram-format.test.mjs`
- Create: `lib/telegram/client.js` (fetch wrapper, server-only)

Note: `parked/lib/telegram.js` is the old voucher-only sender — leave it parked; this is a fresh, purchase-shaped lib.

- [ ] **Step 1: Failing tests** — `tests/telegram-format.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { purchaseMessage, handledSuffix, parseCreditCallback } from '../lib/telegram/format.mjs';

const P = { id: 'a1b2c3d4-0000-0000-0000-000000000000', uid: '207978', item_name: 'K20 Free Bet', price_kwacha: 200, price_gems: 0 };

test('purchaseMessage: includes player, item, price', () => {
  const m = purchaseMessage(P);
  assert.ok(m.includes('207978'));
  assert.ok(m.includes('K20 Free Bet'));
  assert.ok(m.includes('200 coins'));
  assert.ok(m.startsWith('🛒'));
});

test('purchaseMessage: gems shown only when nonzero', () => {
  assert.ok(!purchaseMessage(P).includes('gems'));
  assert.ok(purchaseMessage({ ...P, price_gems: 5 }).includes('5 gems'));
});

test('handledSuffix: credit and reject variants', () => {
  assert.equal(handledSuffix('credited', 'jane'), '\n\n✅ Credited by jane');
  assert.equal(handledSuffix('rejected', 'jane'), '\n\n❌ Rejected by jane (refunded)');
});

test('parseCreditCallback: extracts uuid, rejects junk', () => {
  assert.equal(parseCreditCallback('credit:' + P.id), P.id);
  assert.equal(parseCreditCallback('credit:not-a-uuid'), null);
  assert.equal(parseCreditCallback('boom'), null);
  assert.equal(parseCreditCallback(null), null);
});
```

Run `npm test` → new file FAILS (module not found); existing 16 green.

- [ ] **Step 2: Implement `lib/telegram/format.mjs`:**

```js
// Pure Telegram message shaping for the purchase flow — node-testable.
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function purchaseMessage(p) {
  const price = [
    p.price_kwacha ? `${p.price_kwacha} coins` : null,
    p.price_gems ? `${p.price_gems} gems` : null,
  ].filter(Boolean).join(' + ');
  return `🛒 Store purchase #${String(p.id).slice(0, 8)}\nPlayer: ${p.uid}\nItem: ${p.item_name}\nPaid: ${price}`;
}

export function handledSuffix(status, by) {
  return status === 'credited' ? `\n\n✅ Credited by ${by}` : `\n\n❌ Rejected by ${by} (refunded)`;
}

// callback_data is "credit:<purchase uuid>" — anything else is ignored.
export function parseCreditCallback(data) {
  if (typeof data !== 'string' || !data.startsWith('credit:')) return null;
  const id = data.slice(7);
  return UUID_RE.test(id) ? id : null;
}
```

Run `npm test` → all green (16 + 4 new = 20).

- [ ] **Step 3: Implement `lib/telegram/client.js`:**

```js
// Server-only Telegram Bot API calls for the purchase flow. Every function
// resolves rather than throws — Telegram being down must never fail a purchase
// (the purchases table is the source of truth; telegram_error flags the miss).
const api = (method) => `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`;
const CHAT_ID = () => process.env.TELEGRAM_CHAT_ID;

async function call(method, payload) {
  try {
    const r = await fetch(api(method), {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
    });
    const d = await r.json().catch(() => null);
    if (!r.ok || !d || d.ok === false) {
      console.error(`[telegram] ${method} failed:`, d && d.description || r.status);
      return null;
    }
    return d.result;
  } catch (e) {
    console.error(`[telegram] ${method} error:`, e.message);
    return null;
  }
}

// Returns message_id or null.
export async function sendPurchase(text, purchaseId) {
  if (!process.env.TELEGRAM_BOT_TOKEN || !CHAT_ID()) return null;
  const result = await call('sendMessage', {
    chat_id: CHAT_ID(), text,
    reply_markup: { inline_keyboard: [[{ text: '✅ Mark credited', callback_data: `credit:${purchaseId}` }]] },
  });
  return result ? result.message_id : null;
}

// Replaces the message text (dropping the button) after handling.
export async function editPurchaseMessage(messageId, text) {
  if (!process.env.TELEGRAM_BOT_TOKEN || !CHAT_ID() || !messageId) return null;
  return call('editMessageText', { chat_id: CHAT_ID(), message_id: messageId, text });
}

export async function answerCallback(callbackQueryId, text) {
  return call('answerCallbackQuery', { callback_query_id: callbackQueryId, text });
}
```

- [ ] **Step 4:** `npm test` (20/20) + `npm run build` clean.

- [ ] **Step 5: Commit**

```bash
git add lib/telegram/format.mjs lib/telegram/client.js tests/telegram-format.test.mjs
git commit -m "telegram: purchase message lib — pure format + non-throwing client"
```

---

### Task 3: Gamification repo — POST/GET /api/purchase

**Files:**
- Create: `app/api/purchase/route.js`
- Create: `lib/rateLimit.js`

- [ ] **Step 1: Rate limiter** — `lib/rateLimit.js` (in-memory, per serverless instance — a speed bump, not a wall; same approach as the wheel widget):

```js
// Tiny in-memory rate limiter (per serverless instance). Not durable across
// cold starts — acceptable: it exists to blunt bursts, not to be a wall.
const hits = new Map();

export function rateLimit(key, max = 5, windowMs = 60000) {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter(t => now - t < windowMs);
  if (arr.length >= max) return false;
  arr.push(now);
  hits.set(key, arr);
  if (hits.size > 5000) hits.clear(); // crude memory cap
  return true;
}
```

- [ ] **Step 2: The route** — `app/api/purchase/route.js`:

```js
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { purchaseMessage } from '@/lib/telegram/format.mjs';
import { sendPurchase } from '@/lib/telegram/client';
import { rateLimit } from '@/lib/rateLimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Server-backed store purchase. Validates the item + stock atomically via the
// purchase_item RPC and requires an existing SSO profile (purchases must be
// fulfillable + refundable). Coin balances are client-held (existing trust
// model) — the client deducts only after ok:true.
export async function POST(req) {
  if (!supabaseAdmin) return NextResponse.json({ error: 'not_configured' }, { status: 500 });
  const ip = (req.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim();
  if (!rateLimit(`buy:${ip}`)) return NextResponse.json({ error: 'slow_down' }, { status: 429 });

  let body;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'bad_request' }, { status: 400 }); }
  const uid = String(body?.uid || '').trim().slice(0, 64);
  const itemId = String(body?.itemId || '').trim();
  if (!uid || !/^[0-9a-f-]{36}$/i.test(itemId)) return NextResponse.json({ error: 'bad_request' }, { status: 400 });

  // SSO players only: profile row must exist (also blocks forged-uid spam).
  const { data: prof } = await supabaseAdmin.from('profiles').select('bwanabet_user_id').eq('bwanabet_user_id', uid).limit(1);
  if (!prof || !prof.length) return NextResponse.json({ error: 'profile_required' }, { status: 403 });

  const { data, error } = await supabaseAdmin.rpc('purchase_item', { p_uid: uid, p_item_id: itemId });
  if (error) {
    console.error('[purchase] rpc failed:', error.message);
    return NextResponse.json({ error: 'purchase_failed' }, { status: 500 });
  }
  if (data?.error) return NextResponse.json({ error: data.error }, { status: 400 });

  const p = data.purchase;
  const messageId = await sendPurchase(purchaseMessage(p), p.id);
  await supabaseAdmin.from('purchases')
    .update(messageId ? { telegram_message_id: messageId } : { telegram_error: true })
    .eq('id', p.id);

  return NextResponse.json({ ok: true, purchase: { id: p.id, item_name: p.item_name, price_kwacha: p.price_kwacha, price_gems: p.price_gems, status: p.status } });
}

// The player's own purchase list — used by the app on session load to
// reconcile rejected-purchase refunds (exactly once, via refundedPurchaseIds).
export async function GET(req) {
  if (!supabaseAdmin) return NextResponse.json({ purchases: [] });
  const uid = String(new URL(req.url).searchParams.get('uid') || '').trim().slice(0, 64);
  if (!uid) return NextResponse.json({ purchases: [] });
  const { data } = await supabaseAdmin.from('purchases')
    .select('id,item_name,price_kwacha,price_gems,status,created_at')
    .eq('uid', uid).order('created_at', { ascending: false }).limit(50);
  return NextResponse.json({ purchases: data || [] });
}
```

- [ ] **Step 3: Verify locally.** You cannot run SQL — verify shape only: `curl -s -X POST http://localhost:PORT/api/purchase -H "Content-Type: application/json" -d "{}"` → 400 `bad_request`; `curl -s -X POST ... -d "{\"uid\":\"999999999\",\"itemId\":\"00000000-0000-0000-0000-000000000000\"}"` → 403 `profile_required` (uid not in profiles); `curl -s "http://localhost:PORT/api/purchase?uid=none"` → `{"purchases":[]}`. The full positive path is the coordinator's Task 6.

- [ ] **Step 4:** `npm test` (20/20), `npm run build` clean (route shows λ).

- [ ] **Step 5: Commit**

```bash
git add app/api/purchase/route.js lib/rateLimit.js
git commit -m "api: server-backed store purchase + player purchase list (atomic RPC, telegram notify)"
```

---

### Task 4: Gamification repo — Telegram webhook

**Files:**
- Create: `app/api/telegram/webhook/route.js`

- [ ] **Step 1: The route:**

```js
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { parseCreditCallback, handledSuffix, purchaseMessage } from '@/lib/telegram/format.mjs';
import { editPurchaseMessage, answerCallback } from '@/lib/telegram/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Telegram webhook: handles the "✅ Mark credited" button tap in the admin
// group. Verified via the secret token Telegram echoes back on every call.
// Race-safe: the UPDATE only wins while status='pending' — a dashboard-side
// credit/reject beats it and the tapper is told it's already handled.
export async function POST(req) {
  if (req.headers.get('x-telegram-bot-api-secret-token') !== process.env.TELEGRAM_WEBHOOK_SECRET) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  let update;
  try { update = await req.json(); } catch { return NextResponse.json({ ok: true }); }
  const cq = update?.callback_query;
  if (!cq) return NextResponse.json({ ok: true }); // not a button tap — ignore

  const purchaseId = parseCreditCallback(cq.data);
  if (!purchaseId || !supabaseAdmin) { await answerCallback(cq.id, 'Unrecognized action'); return NextResponse.json({ ok: true }); }

  const by = cq.from?.username ? '@' + cq.from.username : (cq.from?.first_name || 'admin');
  const { data } = await supabaseAdmin.from('purchases')
    .update({ status: 'credited', handled_by: `telegram:${by}`, handled_at: new Date().toISOString() })
    .eq('id', purchaseId).eq('status', 'pending')
    .select().limit(1);

  if (data && data.length) {
    const p = data[0];
    await editPurchaseMessage(p.telegram_message_id || cq.message?.message_id, purchaseMessage(p) + handledSuffix('credited', by));
    await answerCallback(cq.id, 'Marked credited ✅');
  } else {
    await answerCallback(cq.id, 'Already handled');
  }
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Verify locally** (simulate Telegram): with the dev server running and `TELEGRAM_WEBHOOK_SECRET` set in `.env.local` (coordinator added it in Task 1 — if missing, ask):
`curl -s -X POST http://localhost:PORT/api/telegram/webhook -H "Content-Type: application/json" -d "{}"` → 401 (no secret header). With `-H "X-Telegram-Bot-Api-Secret-Token: <value from .env.local>"` and body `{}` → `{"ok":true}`. With a callback_query whose data is `credit:00000000-0000-0000-0000-000000000000` → `{"ok":true}` (row won't match; the answerCallback call logs a telegram error locally — that's fine, don't assert on it).

- [ ] **Step 3:** `npm test` (20/20), `npm run build`.

- [ ] **Step 4: Commit**

```bash
git add app/api/telegram/webhook/route.js
git commit -m "api: telegram webhook — credit-button taps update the fulfillment queue"
```

---

### Task 5: Gamification repo — player client (buy + refunds)

**Files:**
- Modify: `components/GamificationPlatform.jsx`

- [ ] **Step 1: Replace the gated `buyStoreItem`** (in the store early-return; it currently shows "The store opens soon" and returns, with the old client-only logic dead below). Replace the ENTIRE function with:

```js
    const buyStoreItem = async (item, el) => {
      const uid = session?.profile?.bwanabet_user_id || null;
      if (!uid) { showNotif('Connect via bwanabet to buy store items', 'error'); return; }
      const canBuy = user.kwacha >= item.price.kwacha && (!item.price.gems || user.gems >= item.price.gems);
      if (!canBuy) { showNotif('Not enough balance!', 'error'); return; }
      try {
        const r = await fetch('/api/purchase', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uid: String(uid), itemId: item.id }),
        });
        const d = await r.json().catch(() => ({}));
        if (!r.ok || !d.ok) {
          const msg = d.error === 'out_of_stock' ? 'Sold out — someone beat you to it!'
            : d.error === 'slow_down' ? 'Too many attempts — wait a minute.'
            : 'Purchase failed — try again.';
          showNotif(msg, 'error');
          return;
        }
        // Server accepted: deduct locally, celebrate, track.
        addCoins(-item.price.kwacha);
        if (item.price.gems) addGems(-item.price.gems);
        trackMission('storePurchase', { amount: item.price.kwacha });
        track('purchase', { amount: item.price.kwacha, meta: { itemId: item.id } });
        showNotif(`🛒 ${item.name} purchased — our team will credit it shortly!`);
        triggerReward('medium', el || null, { coins: 0 });
      } catch (e) {
        showNotif('Purchase failed — try again.', 'error');
      }
    };
```

Delete the now-dead old body below it (the `// Kept for Plan C to replace...` comment, the unreachable `canBuy` line, `addCoins`/`addGems`/`trackMission`/`showNotif`/`triggerReward` lines of the pre-gate implementation) — Plan C IS the replacement, nothing kept.

- [ ] **Step 2: Refund reconciliation.** Add `refundedPurchaseIds: [],` to the initial `user` state (next to `questProgress` and the saved-history comment). Then add this effect near the SSO hydrate effects (after `hydratedRef` exists):

```js
  // Rejected store purchases are refunded HERE, exactly once: compare the
  // server's rejected list against refundedPurchaseIds in saved state. Runs
  // only for hydrated SSO sessions — anonymous state isn't persisted, so
  // reconciling there would refund on every visit.
  const refundRanRef = useRef(false);
  useEffect(() => {
    if (refundRanRef.current || session.status !== 'ready' || !hydratedRef.current) return;
    const uid = session?.profile?.bwanabet_user_id;
    if (!uid) return;
    refundRanRef.current = true;
    fetch('/api/purchase?uid=' + encodeURIComponent(String(uid)))
      .then(r => (r.ok ? r.json() : null))
      .then(d => {
        if (!d || !Array.isArray(d.purchases)) return;
        setUser(u => {
          const done = new Set(u.refundedPurchaseIds || []);
          const toRefund = d.purchases.filter(p => p.status === 'rejected' && !done.has(p.id));
          if (!toRefund.length) return u;
          const coins = toRefund.reduce((s, p) => s + (p.price_kwacha || 0), 0);
          const gems = toRefund.reduce((s, p) => s + (p.price_gems || 0), 0);
          showNotif(`↩️ ${toRefund.length > 1 ? toRefund.length + ' purchases' : 'A purchase'} was refunded: +${coins} coins`);
          return {
            ...u,
            kwacha: u.kwacha + coins,
            gems: u.gems + gems,
            refundedPurchaseIds: [...(u.refundedPurchaseIds || []), ...toRefund.map(p => p.id)],
          };
        });
      })
      .catch(() => {});
  }, [session.status, session?.profile]); // eslint-disable-line react-hooks/exhaustive-deps
```

- [ ] **Step 3: Verify.** `npm test` (20/20), `npm run build` clean. Local browser check: store still shows the restocking state (no items yet) — no visible change; the "opens soon" gate is gone from the code (grep for 'opens soon' → no matches).

- [ ] **Step 4: Commit**

```bash
git add components/GamificationPlatform.jsx
git commit -m "store: server-backed purchases + exactly-once refund reconciliation"
```

---

### Task 6 (COORDINATOR-RUN): deploy, register webhook, prod smoke

- [ ] **Step 1:** `npm test` + `npm run build`, `git push`, `vercel --prod` (gamification repo).
- [ ] **Step 2: Register the webhook** (secret from Task 1):
`curl -s "https://api.telegram.org/bot<TOKEN>/setWebhook" -d "url=https://100xbet-gamification.vercel.app/api/telegram/webhook" -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>" -d "allowed_updates=[\"callback_query\"]"` → `{"ok":true}`. Then `getWebhookInfo` → url matches, no last_error.
- [ ] **Step 3: End-to-end prod smoke:** create a test store item (SQL, stock 1); POST /api/purchase with the real test profile uid (207978) → ok:true; verify the purchases row has `telegram_message_id` set AND the message appears in the admin group; simulate a webhook credit with curl + the secret → row flips to credited, message edited; then reset: delete the purchase row + test item. (Leave the REAL button-tap test for user QA — a human in the group taps it on a fresh purchase.)
- [ ] **Step 4:** unauthenticated webhook curl (no secret header) → 401; /api/purchase with unknown uid → 403.

---

### Task 7: CRM — fulfillment ops in api/gamification.js (TDD)

**Files (in `C:\Users\USER\Desktop\Claude projects\bwanabet-crm-overview`):**
- Modify: `api/gamification.js`
- Modify: `tests/gamification-api.test.js`

- [ ] **Step 1: Failing tests** — append to `tests/gamification-api.test.js`:

```js
test('handler: purchases list, credit (already-handled -> 409), reject via RPC', async () => {
  const handler = require('../api/gamification.js');
  const orig = global.fetch;
  const mkRes = () => ({ statusCode: 200, body: null, status(c) { this.statusCode = c; return this; }, json(o) { this.body = o; return this; }, setHeader() {}, end() { return this; } });
  const auth = (url) => {
    if (String(url).includes('/auth/v1/user')) return { ok: true, json: async () => ({ email: 'a@b.com' }) };
    if (String(url).includes('crm_users')) return { ok: true, json: async () => [{ role: 'admin', is_active: true }] };
    return null;
  };

  // list
  global.fetch = async (url) => auth(url) || { ok: true, status: 200, text: async () => JSON.stringify([{ id: 'p1', status: 'pending' }]), json: async () => [{ id: 'p1', status: 'pending' }] };
  let res = mkRes();
  await handler({ method: 'GET', headers: { authorization: 'Bearer t' }, query: { op: 'purchases', status: 'pending' } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.purchases[0].id, 'p1');

  // credit: PATCH returns empty array -> already handled -> 409
  global.fetch = async (url, init) => auth(url) || { ok: true, status: 200, text: async () => '[]', json: async () => [] };
  res = mkRes();
  await handler({ method: 'POST', headers: { authorization: 'Bearer t' }, body: { op: 'credit_purchase', id: '00000000-0000-0000-0000-000000000000' }, query: {} }, res);
  assert.equal(res.statusCode, 409);

  // reject: RPC returns {error:'already_handled'} -> 409
  global.fetch = async (url, init) => auth(url) || { ok: true, status: 200, text: async () => JSON.stringify({ error: 'already_handled' }), json: async () => ({ error: 'already_handled' }) };
  res = mkRes();
  await handler({ method: 'POST', headers: { authorization: 'Bearer t' }, body: { op: 'reject_purchase', id: '00000000-0000-0000-0000-000000000000' }, query: {} }, res);
  assert.equal(res.statusCode, 409);

  global.fetch = orig;
});
```

Run `npm test` → the new test FAILS (unknown_op → 400); existing 90 green.

- [ ] **Step 2: Implement the three ops** in `api/gamification.js`. Add near the top, after `G_APP`:

```js
const TG_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TG_CHAT = process.env.TELEGRAM_CHAT_ID;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Best-effort Telegram message edit after a dashboard-side credit/reject —
// keeps the group message in sync. Never throws; the DB row is the truth.
async function tgEdit(messageId, text) {
  if (!TG_TOKEN || !TG_CHAT || !messageId) return;
  try {
    await fetch(`https://api.telegram.org/bot${TG_TOKEN}/editMessageText`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TG_CHAT, message_id: messageId, text }),
    });
  } catch (e) { /* best effort */ }
}

function purchaseText(p) {
  const price = [p.price_kwacha ? `${p.price_kwacha} coins` : null, p.price_gems ? `${p.price_gems} gems` : null].filter(Boolean).join(' + ');
  return `🛒 Store purchase #${String(p.id).slice(0, 8)}\nPlayer: ${p.uid}\nItem: ${p.item_name}\nPaid: ${price}`;
}
```

And in the op router (before the final `unknown_op` return):

```js
    if (req.method === 'GET' && op === 'purchases') {
      const status = req.query.status === 'all' ? null : 'pending';
      const filter = status ? `status=eq.${status}&` : '';
      const rows = await gRest(`purchases?${filter}select=id,uid,item_name,price_kwacha,price_gems,status,telegram_error,handled_by,handled_at,created_at&order=created_at.desc&limit=100`);
      return res.status(200).json({ purchases: rows || [] });
    }

    if (req.method === 'POST' && op === 'credit_purchase') {
      const id = String(req.body && req.body.id || '');
      if (!UUID_RE.test(id)) return res.status(400).json({ error: 'bad_id' });
      const rows = await gRest(`purchases?id=eq.${id}&status=eq.pending`, {
        method: 'PATCH', headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ status: 'credited', handled_by: user.email, handled_at: new Date().toISOString() }),
      });
      if (!rows || !rows.length) return res.status(409).json({ error: 'already_handled' });
      const p = rows[0];
      await tgEdit(p.telegram_message_id, purchaseText(p) + `\n\n✅ Credited by ${user.email}`);
      return res.status(200).json({ ok: true, purchase: p });
    }

    if (req.method === 'POST' && op === 'reject_purchase') {
      const id = String(req.body && req.body.id || '');
      if (!UUID_RE.test(id)) return res.status(400).json({ error: 'bad_id' });
      const data = await gRest('rpc/reject_purchase', {
        method: 'POST', body: JSON.stringify({ p_purchase_id: id, p_handled_by: user.email }),
      });
      if (!data || data.error) return res.status(409).json({ error: (data && data.error) || 'already_handled' });
      const p = data.purchase;
      await tgEdit(p.telegram_message_id, purchaseText(p) + `\n\n❌ Rejected by ${user.email} (refunded)`);
      return res.status(200).json({ ok: true, purchase: p });
    }
```

NOTE: `credit_purchase`'s select list — the PATCH `return=representation` returns ALL columns including `telegram_message_id`; keep as-is.

- [ ] **Step 3:** `npm test` → all green (92). Commit:

```bash
git add api/gamification.js tests/gamification-api.test.js
git commit -m "feat: fulfillment ops — purchases list, credit, reject (telegram-synced)"
```
Do NOT push.

---

### Task 8: CRM — Fulfillment sub-tab UI

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Replace the fulfillment placeholder** — the `#gami-sec-fulfillment` div's inner placeholder card becomes:

```html
  <div id="gami-sec-fulfillment" class="gami-sec hidden">
    <div class="bg-white rounded-xl shadow-sm p-5">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-bold text-slate-800">Fulfillment queue</h3>
        <div class="flex gap-2">
          <button class="gami-fstat px-3 py-1.5 rounded-lg text-xs font-semibold bg-yellow-400 text-black" data-status="pending">Pending</button>
          <button class="gami-fstat px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200" data-status="all">All</button>
        </div>
      </div>
      <p class="text-xs text-slate-400 mb-4">Credit = you have manually credited the player's bwanabet account. Reject = purchase refunded to the player (coins returned on their next session) and stock restored. Telegram's group message updates either way.</p>
      <div class="max-h-[480px] overflow-y-auto"><table class="w-full">
        <thead class="bg-slate-50 sticky top-0"><tr>
          <th class="px-4 py-2 text-left text-xs font-semibold text-slate-600">When</th>
          <th class="px-4 py-2 text-left text-xs font-semibold text-slate-600">Player</th>
          <th class="px-4 py-2 text-left text-xs font-semibold text-slate-600">Item</th>
          <th class="px-4 py-2 text-right text-xs font-semibold text-slate-600">Paid</th>
          <th class="px-4 py-2 text-center text-xs font-semibold text-slate-600">Status</th>
          <th class="px-4 py-2 text-center text-xs font-semibold text-slate-600">Actions</th>
        </tr></thead>
        <tbody id="gami-fulfillment-body"><tr><td colspan="6" class="px-4 py-8 text-center text-slate-400">Loading…</td></tr></tbody>
      </table></div>
    </div>
  </div>
```

- [ ] **Step 2: Module methods** — add to `Gamification` (after `saveDaily`, before the closing `};`):

```js
  _fulfillWired: false,
  _fulfillStatus: 'pending',
  async loadFulfillment() {
    if (!this._fulfillWired) {
      this._fulfillWired = true;
      document.querySelectorAll('#gami-sec-fulfillment .gami-fstat').forEach(b => b.addEventListener('click', () => {
        this._fulfillStatus = b.dataset.status;
        document.querySelectorAll('#gami-sec-fulfillment .gami-fstat').forEach(x => {
          const on = x === b;
          x.classList.toggle('bg-yellow-400', on); x.classList.toggle('text-black', on); x.classList.toggle('font-semibold', on);
          x.classList.toggle('bg-slate-100', !on); x.classList.toggle('text-slate-600', !on); x.classList.toggle('font-medium', !on);
        });
        this.loadFulfillment();
      }));
    }
    const body = document.getElementById('gami-fulfillment-body');
    body.innerHTML = '<tr><td colspan="6" class="px-4 py-8 text-center text-slate-400">Loading…</td></tr>';
    try {
      const { purchases } = await this._api('purchases', { params: { status: this._fulfillStatus } });
      const L = GamificationLogic;
      body.innerHTML = purchases.length ? purchases.map(p => `
        <tr class="border-b border-slate-100">
          <td class="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">${L.timeAgo(p.created_at)}${p.telegram_error ? ' <span title="Telegram notification failed — queue is the source of truth">⚠️</span>' : ''}</td>
          <td class="px-4 py-3 text-sm font-medium text-slate-700">${esc(String(p.uid))}</td>
          <td class="px-4 py-3 text-sm text-slate-700">${esc(p.item_name)}</td>
          <td class="px-4 py-3 text-sm text-right font-bold">${L.fmt(p.price_kwacha)}${p.price_gems ? ' + ' + L.fmt(p.price_gems) + ' 💎' : ''}</td>
          <td class="px-4 py-3 text-center"><span class="px-2 py-0.5 rounded text-xs font-bold ${p.status === 'pending' ? 'bg-amber-100 text-amber-700' : p.status === 'credited' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}">${esc(p.status)}</span>${p.handled_by ? `<div class="text-[10px] text-slate-400 mt-0.5">${esc(p.handled_by)}</div>` : ''}</td>
          <td class="px-4 py-3 text-center whitespace-nowrap">
            ${p.status === 'pending' ? `
              <button class="px-2 py-1 text-xs bg-emerald-50 text-emerald-700 rounded font-semibold" onclick="Gamification.creditPurchase('${escAttrJs(String(p.id))}')">✅ Credit</button>
              <button class="px-2 py-1 text-xs bg-red-50 text-red-600 rounded font-semibold" onclick="Gamification.rejectPurchase('${escAttrJs(String(p.id))}')">Reject</button>
            ` : ''}
          </td>
        </tr>`).join('')
        : '<tr><td colspan="6" class="px-4 py-8 text-center text-slate-400">Nothing here — all clear.</td></tr>';
    } catch (err) {
      body.innerHTML = `<tr><td colspan="6" class="px-4 py-8 text-center text-red-400">${esc(err.message)}</td></tr>`;
    }
  },

  async creditPurchase(id) {
    this._status('Crediting…');
    try {
      await this._api('credit_purchase', { method: 'POST', body: { id } });
      this._status('Credited — Telegram message updated.');
      setTimeout(() => this._status(''), 4000);
    } catch (err) {
      this._status(err.message === 'already_handled' ? 'Already handled (Telegram or another admin beat you).' : 'Credit failed: ' + err.message);
    }
    this.loadFulfillment();
  },

  async rejectPurchase(id) {
    if (!confirm('Reject this purchase? The player is refunded on their next session and stock is restored.')) return;
    this._status('Rejecting…');
    try {
      await this._api('reject_purchase', { method: 'POST', body: { id } });
      this._status('Rejected — player will be refunded, stock restored.');
      setTimeout(() => this._status(''), 4000);
    } catch (err) {
      this._status(err.message === 'already_handled' ? 'Already handled (Telegram or another admin beat you).' : 'Reject failed: ' + err.message);
    }
    this.loadFulfillment();
  },
```

- [ ] **Step 3: Wire the sub-tab** — in `showSub`, add:
```js
    if (sub === 'fulfillment') this.loadFulfillment();
```
(next to the existing players/games/store/missions lines).

- [ ] **Step 3b: Store-spend KPI** — in `renderKPIs`, replace the 'Pending fulfillments' card entry so the grid gains the new stat (8 cards = clean 2×4 grid, fixing the empty-cell nit from Plan B review):
```js
      { label: 'Store spend', value: L.fmt(k.store_spend), sub: `last ${this.state.days} days` },
      { label: 'Pending fulfillments', value: L.fmt(k.pending_purchases), sub: 'awaiting credit' },
```
(i.e. insert the store-spend card before the pending card and drop the old '(Plan C)' suffix from the pending card's sub.)

NOTE: `rejectPurchase` uses `confirm()` — check the repo first: if other destructive CRM actions use `confirm()`, keep it; if the app has its own modal helper, use that instead and report which you found.

- [ ] **Step 4: Verify:** `npm test` (91) still green; extract-largest-script `node --check`; `npm run build`. Commit (do NOT push):

```bash
git add index.html assets/css/tailwind.css
git commit -m "feat: Gamification tab — fulfillment queue with credit/reject + telegram sync"
```

---

### Task 9 (part COORDINATOR): ship + verify + docs + final review

- [ ] **Step 1:** CRM: `npm test` + `npm run build` + final whole-plan review (subagent) BEFORE push (CRM auto-deploys; check no foreign staged files this time — `git status` must be clean of non-plan files).
- [ ] **Step 2:** Push CRM; verify deployment; smoke `?op=purchases` unauthenticated → 401.
- [ ] **Step 3: USER QA (needs CRM login + Telegram group membership):** buy a real test item as an SSO player → Telegram message appears → tap ✅ in Telegram → Fulfillment shows credited-by-telegram; buy again → credit from the DASHBOARD → Telegram message edits; buy again → REJECT from dashboard → player's next session shows the refund notif + coins back + stock restored; confirm the player Store enforces stock (sold-out item unbuyable).
- [ ] **Step 4: Docs/memory:** CRM CLAUDE.md (fulfillment ops + TELEGRAM_* env); gamification CLAUDE.md (purchase/webhook routes, store now LIVE); memory `project_admin_dashboard.md` → Plan C shipped, project COMPLETE (pending any post-QA polish backlog).
