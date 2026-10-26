-- REAL PRIZES + GEM -> COIN CONVERSION (owner 2026-10-26). Service-role only.
--
-- 1. store_items.prize_id groups the price OPTIONS of one real prize
--    (lib/store/prizes.mjs ids): a prize sold for "1,000,000 coins or
--    5 emeralds" is two rows with the same prize_id, each bought through the
--    usual POST /api/purchase -> purchase_item path (balance check + deduct +
--    Telegram). Prices exactly as the owner set them.
-- 2. convert_gems(uid, gem, count): gems -> coins at `prizes.convertRate`
--    (default 0.75) of the gem's coin value (economy.gemValues), atomically on
--    the server-held state, logged in gem_conversions.
-- 3. platform_config `prizes` = { open, testers, convertRate }: while open is
--    not true only the tester ids see/buy prizes and convert gems
--    (lib/store/prizes.mjs cleanPrizesConfig; /api/purchase + /api/gems/convert).

alter table public.store_items add column if not exists prize_id text;
create index if not exists store_items_prize on public.store_items (prize_id) where prize_id is not null;

insert into public.platform_config (key, value)
values ('prizes', '{"open": false, "testers": ["53"], "convertRate": 0.75}'::jsonb)
on conflict (key) do nothing;

-- One row per price option. sort 200+ keeps them after the kwacha packs.
insert into public.store_items (name, prize_id, price_kwacha, price_emeralds, price_rubies, price_diamonds, is_money, active, sort, stock)
select v.name, v.prize_id, v.coins, v.em, v.ru, v.di, false, true, v.sort, null
from (values
  ('BwanaBet Cap',               'cap',          500000,   0,   0,   0, 201),
  ('BwanaBet Bucket Hat',        'buckethat',    600000,   0,   0,   0, 202),
  ('BwanaBet T-shirt',           'tshirt',       800000,   0,   0,   0, 203),
  ('Football',                   'football',     700000,   0,   0,   0, 204),
  ('Power Bank',                 'powerbank',   1000000,   0,   0,   0, 205),
  ('Power Bank',                 'powerbank',         0,   5,   0,   0, 206),
  ('BwanaBet Hoodie',            'hoodie',      1500000,   0,   0,   0, 207),
  ('BwanaBet Hoodie',            'hoodie',            0,  10,   0,   0, 208),
  ('Wi-Fi Router + 1 Year Bundle','wifi',             0,  50,   0,   0, 209),
  ('Wi-Fi Router + 1 Year Bundle','wifi',             0,   0,  20,   0, 210),
  ('Electric Scooter',           'scooter',           0, 300,   0,   0, 211),
  ('Electric Scooter',           'scooter',           0,   0, 120,   0, 212),
  ('iPhone X (refurbished)',     'iphonex',           0,   0, 100,   0, 213),
  ('iPhone X (refurbished)',     'iphonex',           0,   0,   0,  40, 214),
  ('55" TV',                     'tv',                0,   0, 300,   0, 215),
  ('55" TV',                     'tv',                0,   0,   0, 120, 216),
  ('Samsung Galaxy S26 Ultra',   'galaxyultra',       0,   0,   0, 150, 217),
  ('iPhone 18 Pro',              'iphone18',          0,   0,   0, 150, 218),
  ('Honda Fit (2012-2015)',      'car',               0,   0,   0, 500, 219)
) as v(name, prize_id, coins, em, ru, di, sort)
where not exists (
  select 1 from public.store_items s
   where s.prize_id = v.prize_id
     and coalesce(s.price_kwacha, 0) = v.coins and coalesce(s.price_emeralds, 0) = v.em
     and coalesce(s.price_rubies, 0) = v.ru and coalesce(s.price_diamonds, 0) = v.di
);

create table if not exists public.gem_conversions (
  id         bigserial primary key,
  uid        text        not null,
  gem        text        not null check (gem in ('emeralds', 'rubies', 'diamonds')),
  count      integer     not null check (count > 0),
  coins      bigint      not null,
  rate       numeric     not null,
  created_at timestamptz not null default now()
);
create index if not exists gem_conversions_uid on public.gem_conversions (uid, created_at desc);
alter table public.gem_conversions enable row level security;
revoke all on public.gem_conversions from anon, authenticated;

-- Gems -> coins. Same balance rules as purchase_item: a blob without the
-- currencyVersion 2 marker holds no gems. Coins = floor(count x gem value x rate).
create or replace function public.convert_gems(p_uid text, p_gem text, p_count integer)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_state  jsonb;
  v_econ   jsonb;
  v_cfg    jsonb;
  v_key    text;
  v_gemval numeric;
  v_rate   numeric := 0.75;
  v_have   numeric;
  v_kwacha numeric;
  v_coins  bigint;
begin
  if p_gem not in ('emeralds', 'rubies', 'diamonds') or p_count is null or p_count < 1 or p_count > 10000 then
    return jsonb_build_object('error', 'bad_request');
  end if;
  v_key := case p_gem when 'emeralds' then 'emerald' when 'rubies' then 'ruby' else 'diamond' end;
  v_gemval := case p_gem when 'emeralds' then 200000 when 'rubies' then 500000 else 1000000 end;
  select value into v_econ from platform_config where key = 'economy';
  if jsonb_typeof(v_econ -> 'gemValues' -> v_key) = 'number'
     and (v_econ -> 'gemValues' ->> v_key)::numeric = trunc((v_econ -> 'gemValues' ->> v_key)::numeric)
     and (v_econ -> 'gemValues' ->> v_key)::numeric between 1 and 1000000000 then
    v_gemval := (v_econ -> 'gemValues' ->> v_key)::numeric;
  end if;
  select value into v_cfg from platform_config where key = 'prizes';
  if jsonb_typeof(v_cfg -> 'convertRate') = 'number'
     and (v_cfg ->> 'convertRate')::numeric > 0 and (v_cfg ->> 'convertRate')::numeric <= 1 then
    v_rate := (v_cfg ->> 'convertRate')::numeric;
  end if;

  select state into v_state from profiles where bwanabet_user_id = p_uid::bigint for update;
  if not found then
    return jsonb_build_object('error', 'profile_required');
  end if;
  v_state  := coalesce(v_state, '{}'::jsonb);
  v_kwacha := case when jsonb_typeof(v_state -> 'kwacha') = 'number' then greatest((v_state ->> 'kwacha')::numeric, 0) else 0 end;
  v_have   := case when (v_state ->> 'currencyVersion') = '2' and jsonb_typeof(v_state -> p_gem) = 'number'
                   then greatest(floor((v_state ->> p_gem)::numeric), 0) else 0 end;
  if v_have < p_count then
    return jsonb_build_object('error', 'insufficient_funds');
  end if;

  v_coins := floor(p_count * v_gemval * v_rate);
  update profiles
     set state = v_state || jsonb_build_object('kwacha', v_kwacha + v_coins, p_gem, v_have - p_count, 'gems', 0, 'currencyVersion', 2),
         kwacha = v_kwacha + v_coins,
         emeralds = case when p_gem = 'emeralds' then v_have - p_count else emeralds end,
         rubies   = case when p_gem = 'rubies'   then v_have - p_count else rubies end,
         diamonds = case when p_gem = 'diamonds' then v_have - p_count else diamonds end
   where bwanabet_user_id = p_uid::bigint;

  insert into gem_conversions (uid, gem, count, coins, rate) values (p_uid, p_gem, p_count, v_coins, v_rate);

  return jsonb_build_object('coins', v_coins, 'gem', p_gem, 'count', p_count, 'rate', v_rate,
    'balance', jsonb_build_object('kwacha', v_kwacha + v_coins, p_gem, v_have - p_count));
end
$$;
revoke all on function public.convert_gems(text, text, integer) from public, anon, authenticated;
