-- ============================================================================
-- 2026-10-09 — player_activity (CRM daily totals) + World Cup prize rows
-- ============================================================================
-- NOT APPLIED BY THE AUTHOR — the main session reviews and applies it.
-- Order: apply this migration, then push the app code (the app degrades
-- gracefully before it: /api/season answers 503, the feed falls back to a
-- read-merge-upsert only once the table exists).
--
-- player_activity: fed by POST /api/activity/player-daily (CRM, shared-secret
-- auth), read by GET /api/season and POST /api/season/claim-prize (SSO
-- identity). Service-role only like every other live table: RLS on, NO
-- policies, no grants to anon/authenticated.
--
-- `day` = Africa/Lusaka (UTC+2) calendar date. Every column is the ABSOLUTE
-- total the CRM reported for that day; upserts keep the max PER COLUMN, so
-- re-sending is idempotent and a lower total never lowers a stored value.
-- Amounts are kwacha (real money only). Contract:
-- docs/integrations/crm-player-activity-feed.md

create table if not exists public.player_activity (
  user_id            text          not null,             -- bwanabet user id (String(Number(id)))
  day                date          not null,             -- Lusaka calendar date
  deposits_amount    numeric(14,2) not null default 0 check (deposits_amount >= 0),
  deposits_count     integer       not null default 0 check (deposits_count >= 0),
  withdrawals_amount numeric(14,2) not null default 0 check (withdrawals_amount >= 0),
  casino_stake       numeric(14,2) not null default 0 check (casino_stake >= 0),     -- real-money stake only
  casino_rounds      integer       not null default 0 check (casino_rounds >= 0),
  sports_stake       numeric(14,2) not null default 0 check (sports_stake >= 0),     -- settled, real money, total odds >= 1.5
  sports_slips       integer       not null default 0 check (sports_slips >= 0),
  updated_at         timestamptz   not null default now(),
  primary key (user_id, day)
);

create index if not exists player_activity_day_idx on public.player_activity (day);

alter table public.player_activity enable row level security;
revoke all on table public.player_activity from anon, authenticated;

-- Atomic max-wins batch upsert. p_rows = [{ "user_id": "123", "day": "2026-10-09",
-- "deposits_amount": 50, "deposits_count": 1, "withdrawals_amount": 0,
-- "casino_stake": 120.5, "casino_rounds": 64, "sports_stake": 40, "sports_slips": 2 }, ...]
-- (the route validates + de-duplicates first; GROUP BY keeps repeated keys safe).
create or replace function public.upsert_player_activity(p_rows jsonb)
returns integer
language sql
security invoker
set search_path = public
as $$
  with incoming as (
    select r->>'user_id'                                         as user_id,
           (r->>'day')::date                                     as day,
           max(coalesce((r->>'deposits_amount')::numeric, 0))    as deposits_amount,
           max(coalesce((r->>'deposits_count')::int, 0))         as deposits_count,
           max(coalesce((r->>'withdrawals_amount')::numeric, 0)) as withdrawals_amount,
           max(coalesce((r->>'casino_stake')::numeric, 0))       as casino_stake,
           max(coalesce((r->>'casino_rounds')::int, 0))          as casino_rounds,
           max(coalesce((r->>'sports_stake')::numeric, 0))       as sports_stake,
           max(coalesce((r->>'sports_slips')::int, 0))           as sports_slips
    from jsonb_array_elements(p_rows) as r
    group by 1, 2
  ), up as (
    insert into public.player_activity as pa
      (user_id, day, deposits_amount, deposits_count, withdrawals_amount, casino_stake, casino_rounds, sports_stake, sports_slips, updated_at)
    select user_id, day, deposits_amount, deposits_count, withdrawals_amount, casino_stake, casino_rounds, sports_stake, sports_slips, now()
    from incoming
    on conflict (user_id, day) do update
      set deposits_amount    = greatest(pa.deposits_amount,    excluded.deposits_amount),
          deposits_count     = greatest(pa.deposits_count,     excluded.deposits_count),
          withdrawals_amount = greatest(pa.withdrawals_amount, excluded.withdrawals_amount),
          casino_stake       = greatest(pa.casino_stake,       excluded.casino_stake),
          casino_rounds      = greatest(pa.casino_rounds,      excluded.casino_rounds),
          sports_stake       = greatest(pa.sports_stake,       excluded.sports_stake),
          sports_slips       = greatest(pa.sports_slips,       excluded.sports_slips),
          updated_at         = now()
    returning 1
  )
  select count(*)::int from up;
$$;

revoke all on function public.upsert_player_activity(jsonb) from public, anon, authenticated;
grant execute on function public.upsert_player_activity(jsonb) to service_role;

-- World Cup prize = one fulfilment row in `purchases` (the existing Telegram /
-- CRM Fulfillment queue credits it). item_id stays NULL, payout_kwacha = the
-- prize, prices 0. prize_key = 'worldcup:<season id>' makes it ONE per player
-- per season (unique partial index); prize_meta keeps the server's season
-- summary so a Telegram message edit can rebuild the text.
alter table public.purchases add column if not exists prize_key  text;
alter table public.purchases add column if not exists prize_meta jsonb;
create unique index if not exists purchases_prize_once_idx on public.purchases (uid, prize_key) where prize_key is not null;
