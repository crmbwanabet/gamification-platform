-- CASHBACK AS GEMS OR COINS + COINS -> GEMS (owner 2026-10-28). Service-role only.
--
-- 1. cashback_awards.taken_as / coins_paid: when collecting, the player picks
--    'gems' (the award's gems) or 'coins' (what those gems are worth at
--    economy.gemValues). POST /api/cashback { window, take } records the pick
--    with collected_at, once.
-- 2. buy_gems(uid, gem, count): coins -> gems at `prizes.buyRate` (default
--    1.25) of the gem's coin value (1 diamond = 1,000,000 coins costs
--    1,250,000), atomically on the server-held state, logged in
--    gem_conversions with direction 'to_gems'. Same balance rules as
--    convert_gems / purchase_item.

alter table public.cashback_awards add column if not exists taken_as text check (taken_as in ('gems', 'coins'));
alter table public.cashback_awards add column if not exists coins_paid bigint;

alter table public.gem_conversions add column if not exists direction text not null default 'to_coins'
  check (direction in ('to_coins', 'to_gems'));

create or replace function public.buy_gems(p_uid text, p_gem text, p_count integer)
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
  v_rate   numeric := 1.25;
  v_have   numeric;
  v_kwacha numeric;
  v_cost   bigint;
begin
  if p_gem not in ('emeralds', 'rubies', 'diamonds') or p_count is null or p_count < 1 or p_count > 1000 then
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
  if jsonb_typeof(v_cfg -> 'buyRate') = 'number'
     and (v_cfg ->> 'buyRate')::numeric >= 1 and (v_cfg ->> 'buyRate')::numeric <= 5 then
    v_rate := (v_cfg ->> 'buyRate')::numeric;
  end if;

  select state into v_state from profiles where bwanabet_user_id = p_uid::bigint for update;
  if not found then
    return jsonb_build_object('error', 'profile_required');
  end if;
  v_state  := coalesce(v_state, '{}'::jsonb);
  v_kwacha := case when jsonb_typeof(v_state -> 'kwacha') = 'number' then greatest((v_state ->> 'kwacha')::numeric, 0) else 0 end;
  v_have   := case when (v_state ->> 'currencyVersion') = '2' and jsonb_typeof(v_state -> p_gem) = 'number'
                   then greatest(floor((v_state ->> p_gem)::numeric), 0) else 0 end;
  v_cost := ceil(p_count * v_gemval * v_rate);
  if v_kwacha < v_cost then
    return jsonb_build_object('error', 'insufficient_funds');
  end if;

  update profiles
     set state = v_state || jsonb_build_object('kwacha', v_kwacha - v_cost, p_gem, v_have + p_count, 'gems', 0, 'currencyVersion', 2),
         kwacha = v_kwacha - v_cost,
         emeralds = case when p_gem = 'emeralds' then v_have + p_count else emeralds end,
         rubies   = case when p_gem = 'rubies'   then v_have + p_count else rubies end,
         diamonds = case when p_gem = 'diamonds' then v_have + p_count else diamonds end
   where bwanabet_user_id = p_uid::bigint;

  insert into gem_conversions (uid, gem, count, coins, rate, direction) values (p_uid, p_gem, p_count, v_cost, v_rate, 'to_gems');

  return jsonb_build_object('coins', v_cost, 'gem', p_gem, 'count', p_count, 'rate', v_rate,
    'balance', jsonb_build_object('kwacha', v_kwacha - v_cost, p_gem, v_have + p_count));
end
$$;
revoke all on function public.buy_gems(text, text, integer) from public, anon, authenticated;
