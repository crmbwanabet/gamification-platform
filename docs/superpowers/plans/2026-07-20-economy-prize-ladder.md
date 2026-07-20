# Economy Prize Ladder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stock the approved three-currency money-prize ladder (K1–K100) with diamond pricing support end-to-end and a one-money-prize-per-week redemption cap, and rescale the missions that became uneconomic under 1-play/day.

**Architecture:** Extend the existing server-authoritative purchase pipeline (store_items/purchases tables → `purchase_item` RPC → /api/purchase → Telegram queue) with a `price_diamonds` column and an `is_money` flag; the weekly cap is enforced INSIDE the RPC (same transaction as balance+stock). Client store and refund path mirror diamonds. Ladder rows are data, stocked by SQL.

**Tech Stack:** Supabase Postgres (migration + plpgsql RPC), Next.js API routes, existing node--test suite for the Telegram formatter, live browser E2E with the unsigned dev JWT (`SSO_ALLOW_UNVERIFIED=true`).

**Approved economy (from conversation 2026-07-20):**
K1 = 10,000 coins · K5 = 45,000 coins · K10 = 300 gems · K20 = 550 gems · K50 = 15 diamonds · K100 = 25 diamonds. Cap: one money prize per player per rolling 7 days (rejected purchases don't count). Missions rescaled to be completable on 1 free play/day.

**Out of scope:** the CRM dashboard's store editor (separate repo `firebrand-crm`) gains a diamonds field in a follow-up; the ladder is stocked by SQL here and rarely changes.

---

### Task 1: Database migration — diamonds + money flag + capped RPC

**Files:** none in-repo (applied via Supabase `apply_migration`, project `hhdqeihdqqqdrbhvmeuj`)

- [ ] **Step 1: Apply the schema migration** (name `prize_ladder_diamonds_cap`):

```sql
ALTER TABLE store_items ADD COLUMN IF NOT EXISTS price_diamonds integer NOT NULL DEFAULT 0;
ALTER TABLE store_items ADD COLUMN IF NOT EXISTS is_money boolean NOT NULL DEFAULT false;
ALTER TABLE purchases   ADD COLUMN IF NOT EXISTS price_diamonds integer NOT NULL DEFAULT 0;
ALTER TABLE purchases   ADD COLUMN IF NOT EXISTS is_money boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.purchase_item(p_uid text, p_item_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_item store_items%rowtype;
  v_purchase purchases%rowtype;
  v_state jsonb;
  v_kwacha numeric;
  v_gems numeric;
  v_diamonds numeric;
begin
  -- Lock the profile first (consistent lock order: profile -> item).
  select state into v_state from profiles where bwanabet_user_id = p_uid::bigint for update;
  if not found then
    return jsonb_build_object('error', 'profile_required');
  end if;
  v_kwacha   := coalesce((v_state->>'kwacha')::numeric, 0);
  v_gems     := coalesce((v_state->>'gems')::numeric, 0);
  v_diamonds := coalesce((v_state->>'diamonds')::numeric, 0);

  select * into v_item from store_items where id = p_item_id for update;
  if not found or not v_item.active then
    return jsonb_build_object('error', 'item_unavailable');
  end if;
  if v_item.stock is not null and v_item.stock <= 0 then
    return jsonb_build_object('error', 'out_of_stock');
  end if;

  -- Weekly redemption cap: at most ONE money prize per rolling 7 days.
  -- Rejected purchases don't count (they were refunded).
  if v_item.is_money then
    if exists (
      select 1 from purchases
       where uid = p_uid and is_money
         and status <> 'rejected'
         and created_at > now() - interval '7 days'
    ) then
      return jsonb_build_object('error', 'weekly_limit');
    end if;
  end if;

  if v_kwacha < v_item.price_kwacha or v_gems < v_item.price_gems or v_diamonds < coalesce(v_item.price_diamonds, 0) then
    return jsonb_build_object('error', 'insufficient_funds');
  end if;

  update profiles
     set state = jsonb_set(jsonb_set(jsonb_set(coalesce(state, '{}'::jsonb),
                   '{kwacha}',   to_jsonb(v_kwacha - v_item.price_kwacha)),
                   '{gems}',     to_jsonb(v_gems - v_item.price_gems)),
                   '{diamonds}', to_jsonb(v_diamonds - coalesce(v_item.price_diamonds, 0))),
         kwacha   = v_kwacha - v_item.price_kwacha,
         gems     = v_gems - v_item.price_gems,
         diamonds = v_diamonds - coalesce(v_item.price_diamonds, 0)
   where bwanabet_user_id = p_uid::bigint;

  if v_item.stock is not null then
    update store_items set stock = stock - 1 where id = p_item_id;
  end if;

  insert into purchases (uid, item_id, item_name, price_kwacha, price_gems, price_diamonds, is_money)
  values (p_uid, p_item_id, v_item.name, v_item.price_kwacha, v_item.price_gems, coalesce(v_item.price_diamonds, 0), v_item.is_money)
  returning * into v_purchase;

  return jsonb_build_object(
    'purchase', row_to_json(v_purchase),
    'balance', jsonb_build_object(
      'kwacha',   v_kwacha - v_item.price_kwacha,
      'gems',     v_gems - v_item.price_gems,
      'diamonds', v_diamonds - coalesce(v_item.price_diamonds, 0))
  );
end
$function$;
```

- [ ] **Step 2: Live-test the RPC in SQL** (before any app code):

```sql
-- seed a test profile + a diamond-priced money item
INSERT INTO profiles (bwanabet_user_id, username, kwacha, gems, diamonds, state)
VALUES (999917, 'claude-econ-test', 60000, 900, 30,
  '{"kwacha": 60000, "gems": 900, "diamonds": 30}'::jsonb);
INSERT INTO store_items (name, descr, price_kwacha, price_gems, price_diamonds, is_money, active, stock, sort)
VALUES ('RPC-TEST K50', 'test', 0, 0, 15, true, true, NULL, 999)
RETURNING id;  -- capture as :ITEM
SELECT purchase_item('999917', :ITEM);  -- expect purchase + balance.diamonds = 15
SELECT purchase_item('999917', :ITEM);  -- expect {"error":"weekly_limit"}
UPDATE purchases SET status = 'rejected' WHERE uid = '999917';
SELECT purchase_item('999917', :ITEM);  -- expect SUCCESS again (rejected doesn't count)
-- cleanup of purchases/profile happens in Task 7; delete the RPC-TEST item now:
DELETE FROM purchases WHERE uid = '999917';
DELETE FROM store_items WHERE name = 'RPC-TEST K50';
UPDATE profiles SET diamonds = 30, state = jsonb_set(state,'{diamonds}','30') WHERE bwanabet_user_id = 999917;
```

Expected: first call returns a purchase with `price_diamonds: 15` and `balance.diamonds: 15`; second returns `weekly_limit`; after rejecting, third succeeds. Insufficient check: temporarily `UPDATE profiles SET state=jsonb_set(state,'{diamonds}','1')...` then RPC → `insufficient_funds` (restore afterwards).

---

### Task 2: Telegram admin message shows all three prices (TDD)

**Files:**
- Modify: `lib/telegram/format.mjs`
- Test: `tests/telegram-format.test.mjs`

- [ ] **Step 1:** Read both files. Add a failing test asserting a purchase with `price_diamonds: 15` renders a `💎 15` (or equivalent existing style) line, and that `price_diamonds: 0` renders no diamond text. Follow the file's existing assertion style for kwacha/gems exactly.
- [ ] **Step 2:** `npm test` → new test FAILS.
- [ ] **Step 3:** Extend the formatter to include diamonds alongside the existing kwacha/gems price rendering (same conditional pattern as gems).
- [ ] **Step 4:** `npm test` → all pass.
- [ ] **Step 5:** Commit `store: telegram purchase message includes diamond prices`.

---

### Task 3: API surfaces carry diamonds

**Files:**
- Modify: `app/api/config/route.js` (store_items select + storeItems mapping)
- Modify: `app/api/purchase/route.js` (response payload + listPurchases select)

- [ ] **Step 1:** In `app/api/config/route.js`: add `price_diamonds,is_money` to the `.select(...)` string; in the `.map(...)`, extend the price object and pass the flag:

```js
      price: { kwacha: i.price_kwacha, ...(i.price_gems ? { gems: i.price_gems } : {}), ...(i.price_diamonds ? { diamonds: i.price_diamonds } : {}) },
      isMoney: !!i.is_money,
```

- [ ] **Step 2:** In `app/api/purchase/route.js`: add `price_diamonds` to the success payload (`purchase: { ... price_diamonds: p.price_diamonds ... }`) and to the `listPurchases` `.select(...)` string.
- [ ] **Step 3:** `npm run build` (dev server STOPPED first — shared `.next`). Commit `store: diamond prices through config + purchase APIs`.

---

### Task 4: Client store — diamond pricing, weekly-limit message, refund path

**Files:**
- Modify: `components/GamificationPlatform.jsx` (`buyStoreItem` ~line 1569; store item card price/canBuy renderers found via `grep -n "price.gems" components/GamificationPlatform.jsx`; refund effect via `grep -n "refundedPurchaseIds" components/GamificationPlatform.jsx`)

- [ ] **Step 1:** canBuy adds diamonds: `const canBuy = user.kwacha >= item.price.kwacha && (!item.price.gems || user.gems >= item.price.gems) && (!item.price.diamonds || user.diamonds >= item.price.diamonds);`
- [ ] **Step 2:** Error map adds: `: d && d.error === 'weekly_limit' ? 'Money prizes are limited to one per week — come back soon!'` and `: d && d.error === 'profile_required' ? 'Connect via bwanabet to buy store items'` (keep existing entries).
- [ ] **Step 3:** Deduction mirror adds diamonds:

```js
        const paidDiamonds = d.purchase?.price_diamonds ?? (item.price.diamonds || 0);
        if (paidDiamonds) addDiamonds(-paidDiamonds);
```

- [ ] **Step 4:** Price display rows (item card + any modal) add a diamond line mirroring the gems conditional: `{item.price.diamonds && <span ...><RewardIcon kind="diamond" size={14} />{item.price.diamonds}</span>}` (verify `RewardIcon` supports kind="diamond" — `grep -n "diamond" components/redesign/RedesignShell.jsx`; if the kind is named differently, match it).
- [ ] **Step 5:** Refund effect (rejected purchases): where it refunds `price_kwacha`/`price_gems`, also refund `price_diamonds` via `addDiamonds` — read the effect and mirror the exact pattern.
- [ ] **Step 6:** `npm run build` clean. Commit `store: diamond prices in client store + weekly-limit messaging + refunds`.

---

### Task 5: Stock the ladder (data)

- [ ] **Step 1:** SQL insert (idempotent — delete any prior ladder rows by name first):

```sql
DELETE FROM store_items WHERE name IN ('K1 Bwanabet Credit','K5 Bwanabet Credit','K10 Bwanabet Credit','K20 Bwanabet Credit','K50 Bwanabet Credit','K100 Bwanabet Credit');
INSERT INTO store_items (name, descr, price_kwacha, price_gems, price_diamonds, is_money, active, stock, featured, is_new, sort, image_url) VALUES
('K1 Bwanabet Credit',   'K1 credited to your bwanabet account',   10000, 0,   0,  true, true, NULL, false, true, 10, 'https://raw.githubusercontent.com/aichatbotbwanabet/gamification-platform/main/public/images/kwacha.jpg'),
('K5 Bwanabet Credit',   'K5 credited to your bwanabet account',   45000, 0,   0,  true, true, NULL, false, true, 20, 'https://raw.githubusercontent.com/aichatbotbwanabet/gamification-platform/main/public/images/kwacha.jpg'),
('K10 Bwanabet Credit',  'K10 credited to your bwanabet account',  0,     300, 0,  true, true, NULL, true,  true, 30, 'https://raw.githubusercontent.com/aichatbotbwanabet/gamification-platform/main/public/images/free-bets.jpg'),
('K20 Bwanabet Credit',  'K20 credited to your bwanabet account',  0,     550, 0,  true, true, NULL, false, true, 40, 'https://raw.githubusercontent.com/aichatbotbwanabet/gamification-platform/main/public/images/free-bets.jpg'),
('K50 Bwanabet Credit',  'K50 credited to your bwanabet account',  0,     0,   15, true, true, NULL, false, true, 50, 'https://raw.githubusercontent.com/aichatbotbwanabet/gamification-platform/main/public/images/coins-stack.jpg'),
('K100 Bwanabet Credit', 'K100 credited to your bwanabet account', 0,     0,   25, true, true, NULL, true,  true, 60, 'https://raw.githubusercontent.com/aichatbotbwanabet/gamification-platform/main/public/images/coins-stack.jpg');
```

- [ ] **Step 2:** `curl` the deployed-or-local `/api/config` and confirm `storeItems` carries all six with the right `price` objects and `isMoney: true`.

---

### Task 6: Mission rescale for 1-play/day

**Files:**
- Modify: `lib/data/missions.js`

- [ ] **Step 1:** Apply exactly these changes (targets/rewards; descs updated to match):

| id | change |
|---|---|
| `d_scratch3` | target 3→2, desc 'Play 2 scratch cards', reward 50→100 |
| `d_dice3` | target 5→2, desc 'Win 2 Lucky Dice rounds' |
| `d_highlow3` | target 10→3, desc 'Play Higher or Lower 3 times' |
| `d_jackpot` | target 20→5, desc 'Play 5 rounds of Stop the Clock' |
| `d_wheel5` | target 20→7, desc 'Spin the wheel 7 times' |
| `spinWheel` | target 3→1, desc 'Spin the wheel', tips[0] → 'You get 1 free spin daily' |

(`d_plinkoEdge` and `w_plinko25` stay — Plinko drops cost only their wager. All other missions unchanged.)

- [ ] **Step 2:** `npm test` (missions tests use fixtures; confirm 44/44 still pass — if any test asserts these literals, update it to the new values). `npm run build`.
- [ ] **Step 3:** Commit `missions: rescale targets for the 1-free-play/day economy`.

---

### Task 7: Live E2E (browser + SQL, dev server + unsigned JWT)

Test identity: profile 999917 (`claude-econ-test`) seeded in Task 1 with 60,000 coins / 900 gems / 30 diamonds. Load `http://localhost:<port>/?t=econ#token=<unsigned JWT for id 999917>`.

- [ ] **Checklist:**
1. Store tab lists the six ladder items with correct price icons (coins/gems/diamonds).
2. Buy K1: success toast; header balance −10,000; SQL shows purchase row `status='pending', price_kwacha=10000, is_money=true`; server profile kwacha −10,000.
3. Buy K10 immediately after → **weekly-limit toast** (cap spans all money prizes).
4. SQL: mark the K1 purchase `rejected` → buy K10 (gems) → success; gems −300 client+server.
5. Insufficient diamonds: SQL-set diamonds to 5 → buy K50 → 'Balance not synced' / insufficient toast (server refuses), no deduction.
6. NOTE: purchases fire REAL Telegram messages to the admin group if dev env has the bot token — warn the user; test rows are cleaned up after.
- [ ] **Cleanup:** `DELETE FROM purchases WHERE uid='999917'; DELETE FROM profiles WHERE bwanabet_user_id=999917;`

---

### Task 8: Ship

- [ ] `npm test` + `npm run build` final green (dev server stopped).
- [ ] Commit remaining files, push, `vercel --prod`.
- [ ] Production smoke: `/api/config` shows the ladder; store renders it.
- [ ] Update memory (`project_game_economy.md`: ladder live, RPC cap, diamonds pipeline; note dashboard diamonds-field follow-up in the CRM repo).
