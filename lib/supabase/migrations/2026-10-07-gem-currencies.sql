-- ============================================================================
-- 2026-10-07 — gem currencies: emeralds / rubies / diamonds + kwacha redemptions
-- ============================================================================
-- NOT APPLIED BY THE AUTHOR. The main session reviews it and applies it via
-- Supabase MCP (project hhdqeihdqqqdrbhvmeuj). ORDER: apply this migration
-- FIRST, then push the app code.
--
-- Before applying, dump the live RPC and diff it against the body this file
-- replaces (the repo never held it in a migration; the last known body is in
-- docs/superpowers/plans/2026-07-20-economy-prize-ladder.md, Task 1):
--   select pg_get_functiondef('public.purchase_item(text, uuid)'::regprocedure);
--
-- What changes
--  * Economy: 1,000 coins = K1 (platform_config economy.coinsPerKwacha, default
--    1000). Prize gems, valued in coins (economy.gemValues):
--    emerald 5,000 (K5), ruby 10,000 (K10), diamond 20,000 (K20).
--    Gems are won as prizes only; nothing sells them.
--  * Retired: `gems` and the old `diamonds`. The platform is not live, so every
--    legacy gems/diamonds balance is reset to 0 (no real balances exist).
--  * State keys: emeralds, rubies, diamonds (the `diamonds` key is REUSED) plus
--    the marker state.currencyVersion = 2. purchase_item counts gem balances
--    ONLY under that marker, so a blob written by an old bundle (no marker) can
--    never spend a legacy diamond as a K20 diamond. /api/state and the client
--    apply the same rule (lib/economy/currency.mjs migrateCurrencyState).
--  * Store: price_emeralds / price_rubies columns; price_diamonds now means the
--    new diamond. Items still priced in price_gems are taken off the shelf and
--    refused by the RPC. Old price_diamonds on purchase history move to
--    legacy_price_diamonds so a refund can never pay out a new diamond.
--  * Kwacha redemptions = ordinary store_items rows (one purchase pipeline)
--    with redeem_currency + redeem_amount. purchase_item DERIVES their price
--    and payout from the economy row at purchase time:
--      coins:  price = amount x coinsPerKwacha coins, payout = K amount
--      gem:    price = amount gems,                   payout = amount x gemValue / coinsPerKwacha
--    Stock NULL (unlimited); is_money = true, so the existing weekly cap
--    applies: ONE money item (any redemption or money prize) per player per
--    rolling 7 days, rejected purchases not counted.
-- ============================================================================

-- 1. Columns ------------------------------------------------------------------
alter table public.store_items add column if not exists price_emeralds  integer not null default 0;
alter table public.store_items add column if not exists price_rubies    integer not null default 0;
alter table public.store_items add column if not exists redeem_currency text;
alter table public.store_items add column if not exists redeem_amount   integer;

alter table public.purchases add column if not exists price_emeralds        integer not null default 0;
alter table public.purchases add column if not exists price_rubies          integer not null default 0;
alter table public.purchases add column if not exists payout_kwacha         numeric(12,2);   -- set for kwacha redemptions only
alter table public.purchases add column if not exists legacy_price_diamonds integer not null default 0;

alter table public.profiles add column if not exists emeralds integer not null default 0;
alter table public.profiles add column if not exists rubies   integer not null default 0;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'store_items_redeem_chk') then
    alter table public.store_items add constraint store_items_redeem_chk check (
      (redeem_currency is null and redeem_amount is null)
      or (redeem_currency in ('coins', 'emeralds', 'rubies', 'diamonds') and redeem_amount > 0)
    );
  end if;
  if not exists (select 1 from pg_constraint where conname = 'store_items_gem_prices_chk') then
    alter table public.store_items add constraint store_items_gem_prices_chk check (
      price_emeralds >= 0 and price_rubies >= 0
    );
  end if;
end $$;

create unique index if not exists store_items_redeem_uq
  on public.store_items (redeem_currency, redeem_amount) where redeem_currency is not null;

-- 2. Retire legacy balances (pre-launch: no real balances to keep) -----------
update public.profiles
   set state = coalesce(state, '{}'::jsonb)
               || jsonb_build_object('gems', 0, 'emeralds', 0, 'rubies', 0, 'diamonds', 0, 'currencyVersion', 2),
       gems = 0, diamonds = 0, emeralds = 0, rubies = 0;

-- 3. Purchase history: old diamonds can never refund as new diamonds ---------
update public.purchases
   set legacy_price_diamonds = price_diamonds, price_diamonds = 0
 where price_diamonds <> 0;

-- 4. Shelf: anything priced in a retired currency comes off -----------------
--    (the K1–K100 ladder of 2026-07-20 included: wrong rate now). The
--    dashboard re-prices and re-activates what it still wants.
update public.store_items
   set active = false
 where redeem_currency is null
   and active
   and (coalesce(price_gems, 0) > 0
        or coalesce(price_diamonds, 0) > 0
        or name in ('K1 Bwanabet Credit', 'K5 Bwanabet Credit', 'K10 Bwanabet Credit',
                    'K20 Bwanabet Credit', 'K50 Bwanabet Credit', 'K100 Bwanabet Credit'));

-- 5. Config rows: strip retired currencies from reward tables ----------------
update public.platform_config
   set value = (select coalesce(jsonb_object_agg(k, case when jsonb_typeof(v) = 'object' then v - 'gems' - 'diamonds' else v end), '{}'::jsonb)
                  from jsonb_each(value) as e(k, v))
 where key = 'level_rewards' and jsonb_typeof(value) = 'object';

update public.platform_config
   set value = (select coalesce(jsonb_object_agg(k, case when jsonb_typeof(v -> 'reward') = 'object'
                                                         then jsonb_set(v, '{reward}', (v -> 'reward') - 'gems' - 'diamonds')
                                                         else v end), '{}'::jsonb)
                  from jsonb_each(value) as e(k, v))
 where key = 'mission_overrides' and jsonb_typeof(value) = 'object';

update public.platform_config
   set value = (select coalesce(jsonb_agg(case when jsonb_typeof(x) = 'object' then x - 'gems' - 'diamonds' else x end order by ord), '[]'::jsonb)
                  from jsonb_array_elements(value) with ordinality as a(x, ord))
 where key = 'daily_rewards' and jsonb_typeof(value) = 'array';

-- 6. Seed the redemptions (idempotent; prices here are display defaults only —
--    purchase_item recomputes them from the economy row) --------------------
insert into public.store_items
  (name, descr, price_kwacha, price_gems, price_emeralds, price_rubies, price_diamonds,
   is_money, active, stock, featured, is_new, sort, image_url, redeem_currency, redeem_amount)
values
  ('K1 bwanabet bonus',  'Redeem 1,000 coins for K1 on your bwanabet account',   1000,  0, 0, 0, 0, true, true, null, false, false, 101, null, 'coins', 1),
  ('K5 bwanabet bonus',  'Redeem 5,000 coins for K5 on your bwanabet account',   5000,  0, 0, 0, 0, true, true, null, false, false, 102, null, 'coins', 5),
  ('K10 bwanabet bonus', 'Redeem 10,000 coins for K10 on your bwanabet account', 10000, 0, 0, 0, 0, true, true, null, false, false, 103, null, 'coins', 10),
  ('K20 bwanabet bonus', 'Redeem 20,000 coins for K20 on your bwanabet account', 20000, 0, 0, 0, 0, true, true, null, false, false, 104, null, 'coins', 20),
  ('K50 bwanabet bonus', 'Redeem 50,000 coins for K50 on your bwanabet account', 50000, 0, 0, 0, 0, true, true, null, false, false, 105, null, 'coins', 50),
  ('Emerald redemption', 'Redeem 1 Emerald for K5 on your bwanabet account',     0,     0, 1, 0, 0, true, true, null, false, false, 111, null, 'emeralds', 1),
  ('Ruby redemption',    'Redeem 1 Ruby for K10 on your bwanabet account',       0,     0, 0, 1, 0, true, true, null, false, false, 112, null, 'rubies', 1),
  ('Diamond redemption', 'Redeem 1 Diamond for K20 on your bwanabet account',    0,     0, 0, 0, 1, true, true, null, false, false, 113, null, 'diamonds', 1)
on conflict (redeem_currency, redeem_amount) where redeem_currency is not null
do update set active = true, stock = null, is_money = true;

-- 7. purchase_item: live currencies, derived redemption prices --------------
create or replace function public.purchase_item(p_uid text, p_item_id uuid)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_item     store_items%rowtype;
  v_purchase purchases%rowtype;
  v_state    jsonb;
  v_econ     jsonb;
  v_cpk      numeric := 1000;            -- coins per kwacha
  v_gemval   numeric;                    -- coins per gem (redemptions)
  v_marked   boolean;
  v_kwacha   numeric;                    -- coins balance (legacy key name)
  v_em       numeric;
  v_ru       numeric;
  v_di       numeric;
  c_coins    numeric;                    -- the charge
  c_em       numeric := 0;
  c_ru       numeric := 0;
  c_di       numeric := 0;
  v_payout   numeric(12,2);
  v_name     text;
begin
  -- Lock the profile first (consistent lock order: profile -> item).
  select state into v_state from profiles where bwanabet_user_id = p_uid::bigint for update;
  if not found then
    return jsonb_build_object('error', 'profile_required');
  end if;
  v_state  := coalesce(v_state, '{}'::jsonb);
  v_kwacha := case when jsonb_typeof(v_state -> 'kwacha') = 'number' then greatest((v_state ->> 'kwacha')::numeric, 0) else 0 end;
  -- Gem balances count only once the blob is on the gem economy.
  v_marked := (v_state ->> 'currencyVersion') = '2';
  v_em := case when v_marked and jsonb_typeof(v_state -> 'emeralds') = 'number' then greatest(floor((v_state ->> 'emeralds')::numeric), 0) else 0 end;
  v_ru := case when v_marked and jsonb_typeof(v_state -> 'rubies')   = 'number' then greatest(floor((v_state ->> 'rubies')::numeric), 0)   else 0 end;
  v_di := case when v_marked and jsonb_typeof(v_state -> 'diamonds') = 'number' then greatest(floor((v_state ->> 'diamonds')::numeric), 0) else 0 end;

  select * into v_item from store_items where id = p_item_id for update;
  if not found or not v_item.active then
    return jsonb_build_object('error', 'item_unavailable');
  end if;
  -- Retired currency: an item still priced in gems must be re-priced first.
  if coalesce(v_item.price_gems, 0) > 0 then
    return jsonb_build_object('error', 'item_unavailable');
  end if;
  if v_item.stock is not null and v_item.stock <= 0 then
    return jsonb_build_object('error', 'out_of_stock');
  end if;

  if v_item.redeem_currency is not null then
    -- Price + payout derived from the economy row (same validation as
    -- lib/economy/currency.mjs: positive integers, bounded).
    select value into v_econ from platform_config where key = 'economy';
    if jsonb_typeof(v_econ -> 'coinsPerKwacha') = 'number'
       and (v_econ ->> 'coinsPerKwacha')::numeric = trunc((v_econ ->> 'coinsPerKwacha')::numeric)
       and (v_econ ->> 'coinsPerKwacha')::numeric between 1 and 1000000 then
      v_cpk := (v_econ ->> 'coinsPerKwacha')::numeric;
    end if;
    if v_item.redeem_currency = 'coins' then
      c_coins  := v_item.redeem_amount * v_cpk;
      v_payout := v_item.redeem_amount;
    else
      v_gemval := case v_item.redeem_currency when 'emeralds' then 5000 when 'rubies' then 10000 else 20000 end;
      declare
        k text := case v_item.redeem_currency when 'emeralds' then 'emerald' when 'rubies' then 'ruby' else 'diamond' end;
      begin
        if jsonb_typeof(v_econ -> 'gemValues' -> k) = 'number'
           and (v_econ -> 'gemValues' ->> k)::numeric = trunc((v_econ -> 'gemValues' ->> k)::numeric)
           and (v_econ -> 'gemValues' ->> k)::numeric between 1 and 1000000000 then
          v_gemval := (v_econ -> 'gemValues' ->> k)::numeric;
        end if;
      end;
      c_coins := 0;
      if v_item.redeem_currency = 'emeralds' then c_em := v_item.redeem_amount;
      elsif v_item.redeem_currency = 'rubies' then c_ru := v_item.redeem_amount;
      else c_di := v_item.redeem_amount;
      end if;
      v_payout := round(v_item.redeem_amount * v_gemval / v_cpk, 2);
    end if;
    v_name := 'K' || case when v_payout = trunc(v_payout) then trunc(v_payout)::bigint::text
                          else to_char(v_payout, 'FM999999990.00') end || ' bwanabet bonus';
  else
    c_coins  := coalesce(v_item.price_kwacha, 0);
    c_em     := coalesce(v_item.price_emeralds, 0);
    c_ru     := coalesce(v_item.price_rubies, 0);
    c_di     := coalesce(v_item.price_diamonds, 0);
    v_payout := null;
    v_name   := v_item.name;
  end if;

  -- Weekly redemption cap: at most ONE money item per rolling 7 days.
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

  if v_kwacha < c_coins or v_em < c_em or v_ru < c_ru or v_di < c_di then
    return jsonb_build_object('error', 'insufficient_funds');
  end if;

  update profiles
     set state = v_state || jsonb_build_object(
                   'kwacha',   v_kwacha - c_coins,
                   'emeralds', v_em - c_em,
                   'rubies',   v_ru - c_ru,
                   'diamonds', v_di - c_di,
                   'gems',     0,
                   'currencyVersion', 2),
         kwacha   = v_kwacha - c_coins,
         emeralds = v_em - c_em,
         rubies   = v_ru - c_ru,
         diamonds = v_di - c_di,
         gems     = 0
   where bwanabet_user_id = p_uid::bigint;

  if v_item.stock is not null then
    update store_items set stock = stock - 1 where id = p_item_id;
  end if;

  insert into purchases (uid, item_id, item_name, price_kwacha, price_gems, price_emeralds, price_rubies, price_diamonds, is_money, payout_kwacha)
  values (p_uid, p_item_id, v_name, c_coins, 0, c_em, c_ru, c_di, v_item.is_money, v_payout)
  returning * into v_purchase;

  return jsonb_build_object(
    'purchase', row_to_json(v_purchase),
    'balance', jsonb_build_object(
      'kwacha',   v_kwacha - c_coins,
      'emeralds', v_em - c_em,
      'rubies',   v_ru - c_ru,
      'diamonds', v_di - c_di)
  );
end
$function$;

revoke all on function public.purchase_item(text, uuid) from public;
revoke all on function public.purchase_item(text, uuid) from anon;
revoke all on function public.purchase_item(text, uuid) from authenticated;

-- ============================================================================
-- Post-apply checks (run by hand; test profile 999917 as in the 2026-07-20 plan)
--   select id, name, redeem_currency, redeem_amount, active from store_items where redeem_currency is not null order by sort;  -- 8 rows
--   select count(*) from profiles where (state->>'currencyVersion') is distinct from '2';                                     -- 0
--   -- with a test profile holding {"kwacha": 6000, "emeralds": 1, "currencyVersion": 2}:
--   select purchase_item('999917', '<K5 row id>');     -- purchase.price_kwacha 5000, payout_kwacha 5.00, balance.kwacha 1000
--   select purchase_item('999917', '<Emerald row id>'); -- {"error":"weekly_limit"} (one money item per 7 days)
-- ============================================================================
