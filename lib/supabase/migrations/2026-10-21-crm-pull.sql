-- ============================================================================
-- 2026-10-21 — CRM player-daily PULL: overwrite upsert + feed cursor
-- ============================================================================
-- Additive only. Used by GET/POST /api/cron/crm-pull (lib/season/crmPull.mjs),
-- which pulls `GET {CRM_URL}/api/player-daily` hourly. Each CRM row is the FULL
-- recomputed total for (user_id, day) and can go DOWN (voided / resettled slips,
-- reversals), so the pull REPLACES the stored row; the older push route keeps
-- its max-wins upsert_player_activity(). The pull is the source of truth.
-- `day` from the pull is the CRM's UTC day, stored as-is.
-- Doc: docs/integrations/crm-player-daily-pull.md

-- When the CRM last changed the stored values (its synced_at). An overwrite
-- only lands when it is at least as new, so an overlapping slower run can
-- never put back older totals. NULL = row written by the push route.
alter table public.player_activity add column if not exists crm_synced_at timestamptz;

-- Atomic OVERWRITE batch upsert. p_rows = [{ "user_id": "123", "day": "2026-10-20",
-- "deposits_amount": 50, "deposits_count": 2, "withdrawals_amount": 0,
-- "casino_stake": 31.5, "casino_rounds": 42, "sports_stake": 10, "sports_slips": 2,
-- "crm_synced_at": "2026-10-21T10:21:14.512Z" }, ...]. A repeated key in one
-- batch keeps its LAST occurrence (the feed is ordered by synced_at).
create or replace function public.replace_player_activity(p_rows jsonb)
returns integer
language sql
security invoker
set search_path = public
as $$
  with incoming as (
    select distinct on (r->>'user_id', (r->>'day')::date)
           r->>'user_id'                                    as user_id,
           (r->>'day')::date                                as day,
           coalesce((r->>'deposits_amount')::numeric, 0)    as deposits_amount,
           coalesce((r->>'deposits_count')::int, 0)         as deposits_count,
           coalesce((r->>'withdrawals_amount')::numeric, 0) as withdrawals_amount,
           coalesce((r->>'casino_stake')::numeric, 0)       as casino_stake,
           coalesce((r->>'casino_rounds')::int, 0)          as casino_rounds,
           coalesce((r->>'sports_stake')::numeric, 0)       as sports_stake,
           coalesce((r->>'sports_slips')::int, 0)           as sports_slips,
           (r->>'crm_synced_at')::timestamptz               as crm_synced_at
    from jsonb_array_elements(p_rows) with ordinality as e(r, ord)
    order by r->>'user_id', (r->>'day')::date, ord desc
  ), up as (
    insert into public.player_activity as pa
      (user_id, day, deposits_amount, deposits_count, withdrawals_amount, casino_stake, casino_rounds, sports_stake, sports_slips, crm_synced_at, updated_at)
    select user_id, day, deposits_amount, deposits_count, withdrawals_amount, casino_stake, casino_rounds, sports_stake, sports_slips, crm_synced_at, now()
    from incoming
    on conflict (user_id, day) do update
      set deposits_amount    = excluded.deposits_amount,
          deposits_count     = excluded.deposits_count,
          withdrawals_amount = excluded.withdrawals_amount,
          casino_stake       = excluded.casino_stake,
          casino_rounds      = excluded.casino_rounds,
          sports_stake       = excluded.sports_stake,
          sports_slips       = excluded.sports_slips,
          crm_synced_at      = excluded.crm_synced_at,
          updated_at         = now()
      where pa.crm_synced_at is null
         or excluded.crm_synced_at is null
         or excluded.crm_synced_at >= pa.crm_synced_at
    returning 1
  )
  select count(*)::int from up;
$$;

revoke all on function public.replace_player_activity(jsonb) from public, anon, authenticated;
grant execute on function public.replace_player_activity(jsonb) to service_role;

-- Where each pulled feed resumes (keyset cursor of the CRM feed). `since` is
-- kept as the CRM's exact text so no timestamp precision is lost. last_run =
-- the last run's counts/status (no secrets). Service-role only.
create table if not exists public.feed_cursors (
  name        text        primary key,          -- 'crm_player_daily'
  since       text,
  after_user  text,
  after_day   text,
  last_run    jsonb,
  updated_at  timestamptz not null default now()
);

alter table public.feed_cursors enable row level security;
revoke all on table public.feed_cursors from anon, authenticated;
