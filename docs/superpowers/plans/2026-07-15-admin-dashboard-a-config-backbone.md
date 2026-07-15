# Admin Dashboard Plan A: Config Backbone + Event Tracking

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the gamification platform remote-config (game visibility, economy, rewards, store) and an activity-event log — rollout steps 1–2 of the admin-dashboard spec (`docs/superpowers/specs/2026-07-15-gamification-admin-dashboard-design.md`). Zero player-visible change until an admin writes config.

**Architecture:** Four new service-role-only tables in the existing Gamification Supabase. A public `GET /api/config` merges `platform_config` rows + active `store_items` over the hardcoded defaults (edge-cached 60s). A `useRemoteConfig()` hook feeds the merged config through `GamificationPlatform` into the views as props (imports remain the fallback). A `track()` beacon batches events to `POST /api/track` → `activity_events`.

**Tech Stack:** Next.js 14 App Router (existing), Supabase JS v2 via `lib/supabase/admin.js` (`supabaseAdmin`, service role), `node --test` for the one pure function, curl + dev-server checks for routes.

**Conventions:** This repo works directly on `main` and auto-deploys (`git push` + `vercel --prod`) per the owner's standing instruction. Supabase DDL is applied with the claude.ai Supabase MCP tools (`apply_migration` against the **Gamification** project — NOT the CRM's project); if MCP is unavailable, run the same SQL in the Supabase dashboard SQL editor.

**Plans B & C** (CRM dashboard tab; purchases/fulfillment) are separate documents written after this plan ships.

---

### Task 1: Supabase tables

**Files:** none in-repo (DB migration; SQL recorded here).

- [ ] **Step 1: Find the Gamification project id**

Use MCP tool `mcp__claude_ai_Supabase__list_projects` and pick the project named **Gamification** (the one whose `profiles` table is keyed by `bwanabet_user_id`). Confirm with `mcp__claude_ai_Supabase__list_tables` that you see `profiles` — if you don't, STOP: wrong project.

- [ ] **Step 2: Apply the migration**

MCP `mcp__claude_ai_Supabase__apply_migration`, name `admin_dashboard_config_tables`, query:

```sql
create table if not exists platform_config (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by text
);

create table if not exists store_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  descr text not null default '',
  price_kwacha int not null default 0,
  price_gems int not null default 0,
  image_url text,
  stock int,                     -- null = unlimited
  featured boolean not null default false,
  is_new boolean not null default false,
  active boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists activity_events (
  id bigserial primary key,
  uid text not null,
  type text not null,
  game_id text,
  amount int,
  meta jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_activity_events_created on activity_events (created_at desc);
create index if not exists idx_activity_events_uid on activity_events (uid, created_at desc);

create table if not exists purchases (
  id uuid primary key default gen_random_uuid(),
  uid text not null,
  item_id uuid references store_items(id),
  item_name text not null,
  price_kwacha int not null default 0,
  price_gems int not null default 0,
  status text not null default 'pending' check (status in ('pending','credited','rejected')),
  telegram_message_id bigint,
  telegram_error boolean not null default false,
  handled_by text,
  handled_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_purchases_status on purchases (status, created_at desc);

-- Service-role only: enable RLS and add NO policies (anon/authenticated get nothing).
alter table platform_config enable row level security;
alter table store_items enable row level security;
alter table activity_events enable row level security;
alter table purchases enable row level security;
```

- [ ] **Step 3: Verify**

MCP `mcp__claude_ai_Supabase__list_tables` → the 4 new tables exist. Then `mcp__claude_ai_Supabase__get_advisors` (type `security`) → no new "RLS disabled" findings for these tables.

*(purchases is created now so the schema ships once; it stays unused until Plan C.)*

---

### Task 2: Defaults + pure merge function (TDD)

**Files:**
- Create: `lib/config/merge.mjs` (pure, no imports — node-testable)
- Create: `tests/merge.test.mjs`
- Create: `lib/config/defaults.js` (builds DEFAULT_CONFIG from existing exports)
- Modify: `package.json` (add test script)

- [ ] **Step 1: Write the failing test**

`tests/merge.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeConfig } from '../lib/config/merge.mjs';

const DEFAULTS = {
  economy: { maxWin: 200, extraPlayCost: 50 },
  games: { wheel: { enabled: true, dailyPlays: 3 }, dice: { enabled: true, dailyPlays: 5 } },
  dailyRewards: [{ kwacha: 10 }],
  streakRewards: [{ days: 3, kwacha: 100 }],
  levelRewards: { 2: { kwacha: 50 } },
  missionOverrides: {},
};

test('no rows -> defaults unchanged', () => {
  assert.deepEqual(mergeConfig(DEFAULTS, []), DEFAULTS);
});

test('economy row overrides only provided fields', () => {
  const out = mergeConfig(DEFAULTS, [{ key: 'economy', value: { maxWin: 300 } }]);
  assert.equal(out.economy.maxWin, 300);
  assert.equal(out.economy.extraPlayCost, 50);
});

test('games rows merge per game, unknown game ids ignored', () => {
  const out = mergeConfig(DEFAULTS, [{ key: 'games', value: { wheel: { enabled: false }, bogus: { enabled: true } } }]);
  assert.equal(out.games.wheel.enabled, false);
  assert.equal(out.games.wheel.dailyPlays, 3); // untouched field survives
  assert.equal(out.games.bogus, undefined);
});

test('array keys replace wholesale', () => {
  const out = mergeConfig(DEFAULTS, [{ key: 'daily_rewards', value: [{ kwacha: 99 }] }]);
  assert.deepEqual(out.dailyRewards, [{ kwacha: 99 }]);
});

test('mission_overrides passes through', () => {
  const out = mergeConfig(DEFAULTS, [{ key: 'mission_overrides', value: { d_spin: { enabled: false } } }]);
  assert.deepEqual(out.missionOverrides, { d_spin: { enabled: false } });
});

test('malformed row values are ignored, not fatal', () => {
  const out = mergeConfig(DEFAULTS, [{ key: 'economy', value: 'not-an-object' }, { key: 'daily_rewards', value: 7 }]);
  assert.deepEqual(out, DEFAULTS);
});
```

- [ ] **Step 2: Add test script and run to verify failure**

In `package.json` scripts add: `"test": "node --test tests/"`.
Run: `npm test` → Expected: FAIL (`Cannot find module '../lib/config/merge.mjs'`).

- [ ] **Step 3: Implement `lib/config/merge.mjs`**

```js
// Pure merge of platform_config rows over DEFAULT_CONFIG. No imports so the
// node test runner can load it directly (package is CJS; .mjs opts into ESM).
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// DB key -> config field + merge strategy
const KEYS = {
  economy:            { field: 'economy',          mode: 'shallow' },
  games:              { field: 'games',            mode: 'perGame' },
  daily_rewards:      { field: 'dailyRewards',     mode: 'replaceArray' },
  streak_rewards:     { field: 'streakRewards',    mode: 'replaceArray' },
  level_rewards:      { field: 'levelRewards',     mode: 'shallow' },
  mission_overrides:  { field: 'missionOverrides', mode: 'shallow' },
};

export function mergeConfig(defaults, rows) {
  const out = structuredClone(defaults);
  for (const row of rows || []) {
    const spec = KEYS[row?.key];
    if (!spec) continue;
    const v = row.value;
    if (spec.mode === 'replaceArray') {
      if (Array.isArray(v)) out[spec.field] = v;
    } else if (spec.mode === 'shallow') {
      if (isObj(v)) out[spec.field] = { ...out[spec.field], ...v };
    } else if (spec.mode === 'perGame') {
      if (isObj(v)) {
        for (const id of Object.keys(v)) {
          if (out.games[id] && isObj(v[id])) out.games[id] = { ...out.games[id], ...v[id] };
        }
      }
    }
  }
  return out;
}
```

- [ ] **Step 4: Run tests to verify pass**

Run: `npm test` → Expected: all 6 pass.

- [ ] **Step 5: Create `lib/config/defaults.js`**

```js
// The platform's hardcoded values, expressed in remote-config shape.
// /api/config merges platform_config rows over this; the client falls back to
// it entirely when the fetch fails. Keep in sync with lib/data/platform.js.
import { GAME_ECONOMY, MINIGAMES, DAILY_REWARDS, STREAK_REWARDS, LEVEL_REWARDS } from '@/lib/data/platform';

// Mirrors DAILY_GAME_PLAYS in GamificationPlatform.jsx (single source once
// Task 4 makes the component read this instead).
export const DEFAULT_DAILY_PLAYS = { wheel: 3, scratch: 5, dice: 5, highlow: 5, plinko: 5, tapfrenzy: 5, stopclock: 5 };

export const DEFAULT_CONFIG = {
  economy: { maxWin: GAME_ECONOMY.MAX_WIN, extraPlayCost: GAME_ECONOMY.EXTRA_PLAY_COST },
  games: Object.fromEntries(MINIGAMES.map(g => [g.id, { enabled: true, dailyPlays: DEFAULT_DAILY_PLAYS[g.id] ?? 5 }])),
  dailyRewards: DAILY_REWARDS,
  streakRewards: STREAK_REWARDS,
  levelRewards: LEVEL_REWARDS,
  missionOverrides: {},
};
```

- [ ] **Step 6: Commit**

```bash
git add lib/config/merge.mjs lib/config/defaults.js tests/merge.test.mjs package.json
git commit -m "config: defaults + tested merge for remote platform config"
```

---

### Task 3: GET /api/config

**Files:**
- Create: `app/api/config/route.js`

- [ ] **Step 1: Write the route**

```js
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { DEFAULT_CONFIG } from '@/lib/config/defaults';
import { mergeConfig } from '@/lib/config/merge.mjs';

export const runtime = 'nodejs';

// Public, read-only merged config. Failure of any DB read degrades to the
// hardcoded defaults — the dashboard being down must never break players.
export async function GET() {
  let rows = [];
  let items = [];
  if (supabaseAdmin) {
    try {
      const [cfgRes, itemRes] = await Promise.all([
        supabaseAdmin.from('platform_config').select('key,value'),
        supabaseAdmin.from('store_items').select('id,name,descr,price_kwacha,price_gems,image_url,stock,featured,is_new,sort')
          .eq('active', true).order('sort', { ascending: true }),
      ]);
      rows = cfgRes.data || [];
      items = itemRes.data || [];
    } catch (e) { /* defaults */ }
  }
  const config = mergeConfig(DEFAULT_CONFIG, rows);
  config.storeItems = items
    .filter(i => i.stock === null || i.stock > 0)
    .map(i => ({
      id: i.id, name: i.name, desc: i.descr,
      price: { kwacha: i.price_kwacha, ...(i.price_gems ? { gems: i.price_gems } : {}) },
      imageUrl: i.image_url || null, featured: i.featured, isNew: i.is_new,
    }));
  return NextResponse.json(config, {
    headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' },
  });
}
```

- [ ] **Step 2: Verify locally**

Dev server running (`npm run dev`), then:
`curl -s http://localhost:3000/api/config`
Expected: JSON with `economy.maxWin: 200`, all 7 game ids under `games` each `{"enabled":true,...}`, `storeItems: []`.

- [ ] **Step 3: Verify DB override reaches the endpoint**

MCP `mcp__claude_ai_Supabase__execute_sql`:
`insert into platform_config (key, value) values ('economy', '{"maxWin": 250}');`
`curl -s http://localhost:3000/api/config` → `economy.maxWin` is `250`, `extraPlayCost` still `50`.
Clean up: `delete from platform_config where key = 'economy';`

- [ ] **Step 4: Commit**

```bash
git add app/api/config/route.js
git commit -m "api: public /api/config — merged remote config + store items"
```

---

### Task 4: useRemoteConfig + platform consumption

**Files:**
- Create: `lib/config/useRemoteConfig.js`
- Modify: `components/GamificationPlatform.jsx` (hook wire-up, `DAILY_GAME_PLAYS`, `playGame`, `refreshDailyPlays`, `navBadges`, view props)
- Modify: `components/redesign/PlayView.jsx` (games prop)
- Modify: `components/redesign/StoreView.jsx` (storeItems prop + imageUrl)
- Modify: `components/redesign/Overview.jsx` (games + storeItems props)

- [ ] **Step 1: Create the hook**

`lib/config/useRemoteConfig.js`:

```js
'use client';
import { useEffect, useState } from 'react';
import { DEFAULT_CONFIG } from '@/lib/config/defaults';

// Fetch /api/config once on mount. Until it resolves — or forever, if it
// fails — the app runs on DEFAULT_CONFIG (+ empty store). `ready` flips true
// after the first settle either way so callers can sequence on it.
export function useRemoteConfig() {
  const [state, setState] = useState({ ...DEFAULT_CONFIG, storeItems: [], ready: false });
  useEffect(() => {
    let alive = true;
    fetch('/api/config')
      .then(r => (r.ok ? r.json() : null))
      .then(cfg => { if (alive) setState(cfg ? { ...cfg, ready: true } : s => ({ ...s, ready: true })); })
      .catch(() => { if (alive) setState(s => ({ ...s, ready: true })); });
    return () => { alive = false; };
  }, []);
  return state;
}
```

*(Setter-with-object vs function mix: when cfg is null we use the functional form to preserve defaults; when cfg exists it fully replaces.)*

- [ ] **Step 2: Wire into GamificationPlatform**

In `components/GamificationPlatform.jsx`:

a. Add import: `import { useRemoteConfig } from '@/lib/config/useRemoteConfig';`

b. Near the top of the component (right after `const prefersReducedMotion = useReducedMotion();`) add:

```js
  const cfg = useRemoteConfig();
  // Games list the UI shows: enabled games only, extra-play cost from config.
  const activeGames = MINIGAMES.filter(g => cfg.games[g.id]?.enabled !== false)
    .map(g => ({ ...g, cost: cfg.economy.extraPlayCost }));
```

c. Replace the `DAILY_GAME_PLAYS` **uses** (keep the const as fallback for initial state). In `refreshDailyPlays`, change:

```js
        gamePlays: topUp(u.gamePlays, DAILY_GAME_PLAYS),
```
to
```js
        gamePlays: topUp(u.gamePlays, dailyPlaysRef.current),
```

and above `refreshDailyPlays` add a ref that tracks config (refs avoid re-creating the interval):

```js
  const dailyPlaysRef = useRef(DAILY_GAME_PLAYS);
  useEffect(() => {
    // Disabled games stop refreshing; allowances come from config.
    dailyPlaysRef.current = Object.fromEntries(
      Object.entries(cfg.games).filter(([, g]) => g.enabled !== false).map(([id, g]) => [id, g.dailyPlays])
    );
  }, [cfg]);
```

d. In `playGame`, change `const game = MINIGAMES.find(g => g.id === gameId);` to `const game = activeGames.find(g => g.id === gameId);`

e. In `v2Stats.navBadges`, change `play: MINIGAMES.filter(...)` to `play: activeGames.filter(g => (user.gamePlays[g.id] || 0) > 0).length || null,`

f. Add to `v2Stats`: `games: activeGames, storeItems: cfg.storeItems,` (v2Stats spreads into all four views).

g. In the store early-return, `buyStoreItem` stays as-is for now (server-backed purchase is Plan C).

- [ ] **Step 3: Views accept props with import fallback**

`PlayView.jsx` — signature gains `games = null`; grid line becomes:
```js
        {(games || MINIGAMES).map((g, i) => <GameCard key={g.id} i={i} g={g} free={gamePlays?.[g.id] ?? 0} onPlay={onPlay} />)}
```

`StoreView.jsx` — signature gains `storeItems = null`; replace both `STORE_ITEMS` uses with a local `const items = storeItems || STORE_ITEMS;` at the top of the component; `StoreCard`'s Thumb line becomes:
```js
        <Thumb src={item.imageUrl || IMAGES[item.image]} alt={item.name} h={90} radius={0} />
```

`Overview.jsx` — the module-level `featuredItem` / `storeMore` / `wheelGame` consts move INSIDE the component, computed from new props `games = null, storeItems = null`:
```js
  const items = storeItems || STORE_ITEMS;
  const gameList = games || MINIGAMES;
  const featuredItem = items.find(i => i.featured) || items[0] || null;
  const storeMore = featuredItem ? items.filter(i => i.id !== featuredItem.id).slice(0, 2) : [];
  const wheelGame = gameList.find(g => g.id === 'wheel');
```
Where Overview renders `MINIGAMES.length`, use `gameList.length`. Guard the wheel card with `{wheelGame && (...)}` if not already conditional. Any Overview `IMAGES[item.image]` for store items follows the same `item.imageUrl || IMAGES[item.image]` pattern as StoreView.

- [ ] **Step 4: Build**

Run: `npm run build` → Expected: compiles clean.

- [ ] **Step 5: Live-verify the whole loop**

1. MCP `execute_sql`: `insert into platform_config (key, value) values ('games', '{"stopclock": {"enabled": false}}');`
2. Reload `http://localhost:3000/` → Play tab: Stop the Clock is GONE from the grid; other 6 games present.
3. `update platform_config set value = '{"stopclock": {"enabled": true, "dailyPlays": 9}}' where key = 'games';` → reload → game back.
4. Clean up: `delete from platform_config where key = 'games';` → reload → default state.

- [ ] **Step 6: Commit**

```bash
git add lib/config/useRemoteConfig.js components/GamificationPlatform.jsx components/redesign/PlayView.jsx components/redesign/StoreView.jsx components/redesign/Overview.jsx
git commit -m "platform: consume remote config — game visibility, economy, plays, store"
```

---

### Task 5: Reward tables + mission overrides consumption

**Files:**
- Create: `lib/config/missions.mjs` (pure, node-testable)
- Create: `tests/missions.test.mjs`
- Modify: `components/GamificationPlatform.jsx`
- Modify: `components/redesign/EarnView.jsx`
- Modify: `components/redesign/Overview.jsx`
- Modify: `components/redesign/DailyReward.jsx`

- [ ] **Step 1: Write the failing test**

`tests/missions.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyMissionOverrides } from '../lib/config/missions.mjs';

const MISSIONS = [
  { id: 'a', target: 5, xp: 25, reward: { kwacha: 50 } },
  { id: 'b', target: 3, xp: 40, reward: { kwacha: 100, gems: 5 } },
];

test('no overrides -> unchanged', () => {
  assert.deepEqual(applyMissionOverrides(MISSIONS, {}), MISSIONS);
  assert.deepEqual(applyMissionOverrides(MISSIONS, null), MISSIONS);
});

test('enabled:false drops the mission', () => {
  const out = applyMissionOverrides(MISSIONS, { a: { enabled: false } });
  assert.deepEqual(out.map(m => m.id), ['b']);
});

test('reward/target/xp patch, reward merges shallow', () => {
  const out = applyMissionOverrides(MISSIONS, { b: { target: 10, xp: 60, reward: { kwacha: 150 } } });
  const b = out.find(m => m.id === 'b');
  assert.equal(b.target, 10);
  assert.equal(b.xp, 60);
  assert.deepEqual(b.reward, { kwacha: 150, gems: 5 }); // gems survive
});
```

Run: `npm test` → Expected: FAIL (module not found).

- [ ] **Step 2: Implement `lib/config/missions.mjs`**

```js
// Apply dashboard mission_overrides to a mission list. Pure — node-testable.
export function applyMissionOverrides(missions, overrides) {
  if (!overrides || typeof overrides !== 'object') return missions;
  return missions
    .filter(m => overrides[m.id]?.enabled !== false)
    .map(m => {
      const o = overrides[m.id];
      if (!o) return m;
      return {
        ...m,
        ...(o.target ? { target: o.target } : {}),
        ...(o.xp ? { xp: o.xp } : {}),
        ...(o.reward ? { reward: { ...m.reward, ...o.reward } } : {}),
      };
    });
}
```

Run: `npm test` → Expected: all pass.

- [ ] **Step 3: GamificationPlatform wiring**

a. Imports: `import { applyMissionOverrides } from '@/lib/config/missions.mjs';` and add `useMemo` to the React import if absent.

b. Below the `activeGames` line from Task 4 add:

```js
  const activeMissions = useMemo(
    () => applyMissionOverrides([...getDailyMissions(), ...PERMANENT_MISSIONS], cfg.missionOverrides),
    [cfg]
  );
  const cfgRef = useRef(cfg);
  useEffect(() => { cfgRef.current = cfg; }, [cfg]);
```

c. `trackMission` (a `useCallback([])` — read config via ref to avoid stale closures): replace
`const allActive = [...getDailyMissions(), ...WEEKLY_MISSIONS, ...PERMANENT_MISSIONS];` with
`const allActive = applyMissionOverrides([...getDailyMissions(), ...WEEKLY_MISSIONS, ...PERMANENT_MISSIONS], cfgRef.current.missionOverrides);`

d. `openMissionsCount`: replace `[...getDailyMissions(), ...PERMANENT_MISSIONS]` with `activeMissions`.

e. `claimDailyReward`: `const r = cfg.dailyRewards[user.dailyDay - 1] || cfg.dailyRewards[0];`

f. Level-up effect: replace both `LEVEL_REWARDS[...]` reads with `cfg.levelRewards[...]` (JSONB object keys are strings; JS numeric indexing coerces, so `cfg.levelRewards[L]` works for both sources).

g. Add to `v2Stats`: `missions: activeMissions, dailyRewards: cfg.dailyRewards, streakRewards: cfg.streakRewards, levelRewards: cfg.levelRewards,`

- [ ] **Step 4: Views**

`EarnView.jsx` — delete the module-level `const ALL_MISSIONS = ...`; signature gains `missions = null, dailyRewards = null, streakRewards = null, levelRewards = null`; at the top of the component body:
```js
  const allMissions = missions || [...getDailyMissions(), ...PERMANENT_MISSIONS];
```
Replace the `ALL_MISSIONS.map` with `allMissions.map`. Pass the reward props into `RewardsSection` (`dailyRewards={dailyRewards} streakRewards={streakRewards} levelRewards={levelRewards}`); inside `RewardsSection`, add the same three params and use `(levelRewards || LEVEL_REWARDS)`, `(streakRewards || STREAK_REWARDS)` in the two map/filter sites, and pass `rewards={dailyRewards}` into `<DailyReward>`.

`Overview.jsx` — the module-level `const MISSIONS = [...]` moves into the component as `const allMissions = missions || [...getDailyMissions(), ...PERMANENT_MISSIONS];` (signature gains `missions = null, dailyRewards = null`). The signature's `missionsCount = MISSIONS.length` default references the deleted const — change it to `missionsCount = 0` (v2Stats always supplies the real count). Change `pickLatestMissions(missionProgress, missionsComplete)` to take the list as first arg — `pickLatestMissions(allMissions, missionProgress, missionsComplete)` — and inside it, replace its internal `[...getDailyMissions(), ...PERMANENT_MISSIONS]` with that parameter. Pass `rewards={dailyRewards}` to its `<DailyReward>`.

`DailyReward.jsx` — signature gains `rewards = null`; first line of body: `const list = rewards || DAILY_REWARDS;`; replace every other `DAILY_REWARDS` reference in the file with `list`.

- [ ] **Step 5: Build + live verify**

`npm run build` passes. Then MCP `execute_sql`:
1. `insert into platform_config (key, value) values ('mission_overrides', '{"spinWheel": {"enabled": false}}'), ('daily_rewards', '[{"kwacha": 99},{"kwacha": 25},{"kwacha": 50},{"kwacha": 75},{"kwacha": 100},{"kwacha": 150},{"kwacha": 250, "gems": 25, "diamonds": 1}]');`
2. Reload → Earn tab: "Lucky Spinner" mission gone; Rewards sub-tab + home calendar show Day 1 = 99.
3. Clean up: `delete from platform_config where key in ('mission_overrides','daily_rewards');`

- [ ] **Step 6: Commit**

```bash
git add lib/config/missions.mjs tests/missions.test.mjs components/GamificationPlatform.jsx components/redesign/EarnView.jsx components/redesign/Overview.jsx components/redesign/DailyReward.jsx
git commit -m "platform: consume mission overrides + daily/streak/level reward tables"
```

---

### Task 6: Event tracking

**Files:**
- Create: `app/api/track/route.js`
- Create: `lib/track.js`
- Modify: `components/GamificationPlatform.jsx` (call sites)

- [ ] **Step 1: Write the API route**

`app/api/track/route.js`:

```js
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';

const TYPES = new Set(['session_start', 'game_played', 'mission_completed', 'daily_claimed', 'purchase', 'level_up']);
const MAX_EVENTS = 25;

// Fire-and-forget beacon. Always 200s (client never retries); invalid input
// is dropped, not errored.
export async function POST(req) {
  try {
    const body = await req.json();
    const uid = String(body?.uid || 'anon').slice(0, 64);
    const events = Array.isArray(body?.events) ? body.events.slice(0, MAX_EVENTS) : [];
    const rows = events
      .filter(e => TYPES.has(e?.type))
      .map(e => ({
        uid,
        type: e.type,
        game_id: e.gameId ? String(e.gameId).slice(0, 32) : null,
        amount: Number.isFinite(e.amount) ? Math.trunc(e.amount) : null,
        meta: e.meta && typeof e.meta === 'object' ? e.meta : null,
      }));
    if (rows.length && supabaseAdmin) await supabaseAdmin.from('activity_events').insert(rows);
  } catch (e) { /* drop */ }
  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Write the client helper**

`lib/track.js`:

```js
'use client';
// Batched activity beacon. Never throws, never blocks gameplay.
let queue = [];
let uid = 'anon';
let timer = null;

function flush() {
  if (!queue.length) return;
  const payload = JSON.stringify({ uid, events: queue.splice(0, 25) });
  try {
    if (navigator.sendBeacon) navigator.sendBeacon('/api/track', new Blob([payload], { type: 'application/json' }));
    else fetch('/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true }).catch(() => {});
  } catch (e) { /* drop */ }
}

export function setTrackUid(id) { if (id) uid = String(id); }

export function track(type, data = {}) {
  if (typeof window === 'undefined') return;
  queue.push({ type, ...data });
  if (!timer) {
    timer = setInterval(flush, 10000);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flush(); });
  }
}
```

- [ ] **Step 3: Call sites in GamificationPlatform.jsx**

a. Import: `import { track, setTrackUid } from '@/lib/track';`

b. Session start + uid — add one effect near the SSO hydrate effects:

```js
  useEffect(() => {
    const id = session?.profile?.bwanabet_user_id || session?.profile?.username || widgetUid;
    if (id) setTrackUid(id);
  }, [session?.profile, widgetUid]);
  useEffect(() => { track('session_start'); }, []);
```

c. In `trackMission`, right at the top of the function body (before `setUser`):

```js
    if (actionType === 'gamePlayed') track('game_played', { gameId: metadata.gameId, amount: metadata.coinsWon || 0 });
```

and inside the `justCompleted.forEach(m => { ... })` notification block add: `track('mission_completed', { meta: { missionId: m.id } });`

d. In `claimDailyReward`, next to `trackMission('dailyClaimed')`: `track('daily_claimed', { amount: r.kwacha });`

e. In the level-up effect, next to `showNotif(...)`: `track('level_up', { meta: { level: lvl.level } });`

*(`purchase` events come with Plan C's real purchase flow.)*

- [ ] **Step 4: Verify**

`npm run build` passes. Dev server: open the app, play one Dice round, wait ~12s (or switch tabs to force the visibility flush). MCP `execute_sql`: `select type, game_id, amount, uid from activity_events order by id desc limit 10;` → Expected: a `session_start` and a `game_played` row (`game_id='dice'`).

- [ ] **Step 5: Commit**

```bash
git add app/api/track/route.js lib/track.js components/GamificationPlatform.jsx
git commit -m "tracking: activity_events beacon — session/game/mission/daily/level events"
```

---

### Task 7: Ship + live verify

**Files:** none new.

- [ ] **Step 1: Full test + build**

Run: `npm test && npm run build` → Expected: tests pass, build clean.

- [ ] **Step 2: Push + deploy**

```bash
git push
vercel --prod
```

- [ ] **Step 3: Verify production**

1. `curl -s https://100xbet-gamification.vercel.app/api/config` → merged defaults JSON (maxWin 200, 7 games, empty storeItems).
2. Open https://100xbet-gamification.vercel.app/, play a game, then MCP `execute_sql`: `select count(*) from activity_events where created_at > now() - interval '10 minutes';` → > 0.
3. Confirm response header `cache-control: s-maxage=60, stale-while-revalidate=300` on `/api/config` (`curl -sI`).

- [ ] **Step 4: Update docs/memory**

Add to `CLAUDE.md` Architecture: remote config via `/api/config` (platform_config + store_items over hardcoded defaults; hook `useRemoteConfig`) and `activity_events` beacon via `/api/track`. Update the auto-memory `project_game_economy.md` note that GAME_ECONOMY is now config-driven with hardcoded fallback.
