# Gamification Admin Dashboard — Design

**Date:** 2026-07-15
**Status:** Approved design, pre-implementation
**Repos touched:** `crmbwanabet/gamification-platform` (this repo) + `crmbwanabet/bwanabet-crm` (`C:\Users\USER\Desktop\Claude projects\bwanabet-crm-overview`)

## Purpose

Give BwanaBet admins one place — a new tab in the existing CRM — to monitor player activity on the 100xBet gamification platform and control its economy: hide/show games, tune economy caps and free plays, manage the store catalog, tune missions and reward calendars, and fulfill real-value purchases. Today all of this is hardcoded in `lib/data/platform.js` / `lib/data/missions.js`; the store is empty specifically waiting for this dashboard.

## Decisions made during brainstorming

- **Build location:** directly in the CRM repo as a native tab (vanilla-JS module `GamificationManager` in `index.html`), NOT standalone/iframe.
- **Access:** CRM roles `admin` + `developer` only.
- **Monitoring scope:** engagement overview, per-player drill-down (read-only), economy watch, recent activity feed — all four.
- **Control scope:** game visibility + economy + free plays, store CRUD, mission tuning, daily/streak/level reward editing — all four.
- **Fulfillment:** Telegram admin-group message AND dashboard queue, two-way synced — crediting from either channel reflects in the other.
- **Freshness:** config changes apply on the player's next widget load (no realtime push).

## Architecture

Three moving parts, two repos. The **Gamification Supabase project** (the one holding `profiles`) is the single source of truth.

### New tables (Gamification Supabase)

**`platform_config`** — `key text primary key, value jsonb not null, updated_at timestamptz default now(), updated_by text`

| key | value shape | drives |
|---|---|---|
| `economy` | `{ "maxWin": 200, "extraPlayCost": 50 }` | `GAME_ECONOMY` |
| `games` | `{ "wheel": { "enabled": true, "dailyPlays": 3 }, ... }` (all 7 game ids) | Play-grid visibility + daily free-play allowances |
| `daily_rewards` | array of 7 `{ "kwacha": n, "gems"?: n, "diamonds"?: n }` | 7-day daily calendar |
| `streak_rewards` | same shape as hardcoded `STREAK_REWARDS` | streak bonuses |
| `level_rewards` | same shape as hardcoded `LEVEL_REWARDS` | level-up rewards |
| `mission_overrides` | `{ "<missionId>": { "enabled"?: bool, "reward"?: {...}, "xp"?: n, "target"?: n }, ... }` | per-mission patches; missions stay DEFINED in code, the dashboard only overrides |

**`store_items`** — `id uuid pk default gen_random_uuid(), name text, descr text, price_kwacha int not null default 0, price_gems int not null default 0, image_url text, stock int null (null = unlimited), featured bool default false, is_new bool default false, active bool default true, sort int default 0, created_at timestamptz default now()`. Items with purchase history are deactivated, never deleted.

**`activity_events`** — `id bigserial pk, uid text not null, type text not null, game_id text, amount int, meta jsonb, created_at timestamptz default now()`. Types: `session_start`, `game_played` (amount = coins won), `mission_completed`, `daily_claimed`, `purchase`, `level_up`. Indexes: `(created_at desc)`, `(uid, created_at desc)`. Append-only.

**`purchases`** — `id uuid pk default gen_random_uuid(), uid text not null, item_id uuid references store_items, item_name text, price_kwacha int, price_gems int, status text not null default 'pending' check (status in ('pending','credited','rejected')), telegram_message_id bigint, telegram_error bool default false, handled_by text, handled_at timestamptz, created_at timestamptz default now()`.

RLS: all four tables locked to service role only (no anon access; the platform reads config through its own API, never directly).

### Gamification app (this repo) — player-facing plumbing

- **`GET /api/config`** — public. Returns merged `platform_config` rows + active `store_items`, with `Cache-Control: s-maxage=60` so Vercel edge absorbs traffic. No secrets in the response.
- **`POST /api/track`** — public beacon. Accepts `{ uid, events: [{type, gameId?, amount?, meta?, t}] }`, bulk-inserts into `activity_events`. Fire-and-forget; caps batch size (~25) and rejects oversized payloads.
- **`POST /api/purchase`** — `{ uid, itemId }`. Server re-reads the item (active? stock?), inserts the `purchases` row, decrements stock atomically, sends the Telegram message with an inline **✅ Mark credited** button, returns `{ ok, purchase }`. Client deducts coins ONLY on ok.
- **`GET /api/purchase?uid=`** — the player's own purchase list + statuses; used by the platform on session load to reconcile rejected-purchase refunds (see Fulfillment below).
- **`POST /api/telegram/webhook`** — Telegram bot webhook (verified via `X-Telegram-Bot-Api-Secret-Token`). Handles the inline-button callback: `UPDATE purchases SET status='credited', handled_by=<telegram user>, handled_at=now() WHERE id=? AND status='pending'`; edits the group message to show ✅ + who credited. Restores/extends the parked `lib/telegram.js`.

### Platform consumption (this repo)

- **`useRemoteConfig()`** hook: fetches `/api/config` once on mount; exposes merged config; until resolved (or on failure) the app uses the current hardcoded values. The dashboard being down can never break players.
- Hidden games: removed from Play grid + Overview; their plays stop refreshing.
- Economy: `maxWin`/`extraPlayCost` flow into `playGame` and the games' existing `GAME_ECONOMY` reads; `dailyPlays` feeds `refreshDailyPlays`.
- Store: `STORE_ITEMS` comes entirely from config (empty → existing restocking state).
- Missions: overrides filter/patch pools before `getDailyMissions()`.
- Rewards: daily/streak/level tables swap in when present.
- **`track(type, data)`** helper: in-memory queue, flushed via `navigator.sendBeacon('/api/track')` every ~10s and on `visibilitychange`. Call sites: session start, game onWin handlers, mission completion in `trackMission`, `claimDailyReward`, level-up effect, purchase. Tracking failures are silently dropped.
- **`buyStoreItem`** goes server-backed: POST `/api/purchase` → on ok, deduct coins client-side + notif; on failure, nothing deducted.

**Trust caveat (explicit):** coin balances remain in the client-saved `profiles.state` blob — unchanged by this project. The server validates price/stock, not the player's claimed balance. Moving balances server-side is a separate future project.

### CRM repo — the dashboard

- **`api/gamification.js`** (new Vercel function): verifies the CRM Supabase bearer → looks up `crm_users` role → requires `admin`/`developer` (same pattern as `api/chatbot-stats.js`), then executes a whitelisted set of operations against the Gamification Supabase using env `GAMI_SUPABASE_URL` + `GAMI_SUPABASE_SERVICE_KEY`. Operations: read KPIs/charts/feed (aggregate queries over `activity_events`, `profiles`, `purchases`), player search + detail, config get/set (stamps `updated_by`), store CRUD, purchase credit/reject. Also holds `TELEGRAM_BOT_TOKEN` (same bot as the gamification app) to edit group messages on dashboard-side credit/reject.
- **`GamificationManager`** module + tab in `index.html` (vanilla JS, existing Tailwind + Chart.js + Lucide), visible to admin/developer only. Sub-tab layout (approved wireframe A):
  1. **Overview** — KPI row (active players 7d, plays today, coins in circulation, store spend 7d, pending fulfillments) + charts (plays/day stacked by game; coins earned vs spent/day) + last ~50 events feed.
  2. **Players** — search by bwanabet ID/username → results table (balance, XP/level, last seen, games played) → row click opens read-only drawer (balances, missions, streaks, purchases, recent events). No balance editing in v1.
  3. **Games & Economy** — 7 game cards (enabled toggle, dailyPlays stepper) + global economy panel (maxWin, extraPlayCost). Saves write `platform_config`; UI notes "live next session".
  4. **Store** — items table + add/edit form (name, descr, image URL, prices, stock, featured/new/active, sort). Deactivate instead of delete once purchased.
  5. **Missions & Rewards** — missions grouped by pool with enable toggle + reward/XP/target editors (writes `mission_overrides`); editors for daily calendar, streak bonuses, level rewards.
  6. **Fulfillment** — queue, pending first: uid, item, price, age. **Mark credited** / **Reject (refund coins)**. Both stamp `handled_by` (CRM user) and edit the Telegram message.

### Fulfillment two-way sync

- Purchase → Telegram group message (inline ✅ button) + `purchases` row.
- Credit from Telegram → webhook updates row → dashboard shows credited on next queue refresh.
- Credit/reject from dashboard → CRM function updates row + edits the Telegram message ("✅ credited by <name>").
- Race safety: every status change is `... WHERE status='pending'` — exactly one channel wins; the loser sees "already handled".
- **Reject = refund, applied by the platform, exactly once.** Rejection (dashboard-only action) sets `status='rejected'` and restores item stock. The platform reconciles on session load: `GET /api/purchase?uid=` returns the player's purchases with statuses; any purchase with `status='rejected'` whose id is NOT in the player's `state.refundedPurchaseIds` gets its coins/gems credited back client-side, the id appended to `refundedPurchaseIds`, and the state saved. Client-side reconciliation avoids the race where a server-side balance edit is overwritten by an open session's next debounced save; `refundedPurchaseIds` makes the refund idempotent.
- Telegram send failure at purchase time: row still created with `telegram_error=true`; dashboard queue is the source of truth, badge shows it.

## Error handling

- `/api/config` unreachable → hardcoded defaults; no user-visible error.
- `/api/purchase` failure → no coin deduction, "try again" notif.
- Double-credit race → `WHERE status='pending'` guard; single winner.
- Tracking failures → dropped silently.
- CRM function → 401 for bad/absent bearer, 403 for wrong role, structured `{ error }` bodies otherwise.

## Testing

- CRM: extend `node --test` suite — role gating on `api/gamification.js`, config round-trip, credit/reject transitions incl. the already-handled race.
- Platform: live browser verification per rollout step (Playwright walkthroughs like the widget checks): hide game → gone next load; reprice item → new price shows; purchase → queue row + Telegram message; credit from each channel reflects in the other; reject refunds once.

## Rollout (each step independently shippable)

1. Supabase tables + `/api/config` + `useRemoteConfig` consumption, seeded to mirror current hardcoded values (zero player-visible change).
2. Event tracking (`/api/track` + `track()` call sites).
3. CRM tab: Overview + Players (read-only monitoring).
4. Controls: Games & Economy, Store, Missions & Rewards.
5. Purchases: `/api/purchase`, Fulfillment sub-tab, Telegram webhook + two-way sync.

Rollback at any step: delete the `platform_config` rows → platform reverts to hardcoded behaviour.

## Out of scope (v1)

- Editing player balances from the dashboard.
- Server-authoritative coin balances (trust model unchanged).
- Realtime config push to open sessions.
- Store item image uploads (URL field only; images can live in `public/ui/` or any CDN).
- Quests/predictions/trivia controls (features are parked).
