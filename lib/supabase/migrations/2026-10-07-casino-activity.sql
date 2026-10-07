-- ============================================================================
-- 2026-10-07 — casino_activity: CRM-fed casino rounds per player per day
-- ============================================================================
-- Fed by POST /api/activity/casino-rounds (CRM, shared-secret auth), read by
-- GET /api/missions/progress (SSO identity). Drives the 4 daily casino
-- missions. Service-role only like every other live table: RLS on, NO
-- policies, no grants to anon/authenticated.
--
-- `day` is the Africa/Lusaka (UTC+2) calendar date. `rounds` is the ABSOLUTE
-- total the CRM reported for that day; upserts keep the max, so re-sending
-- is idempotent and a lower total never decreases the stored count.

create table if not exists public.casino_activity (
  user_id    text        not null,             -- bwanabet user id (digits, String(Number(id)))
  day        date        not null,             -- Lusaka calendar date
  rounds     integer     not null default 0 check (rounds >= 0),
  updated_at timestamptz not null default now(), -- last time the feed reported this row
  primary key (user_id, day)
);

-- Retention / reporting by day (the PK already serves user lookups).
create index if not exists casino_activity_day_idx on public.casino_activity (day);

alter table public.casino_activity enable row level security;
revoke all on table public.casino_activity from anon, authenticated;

-- Atomic max-wins batch upsert. p_rows = [{ "user_id": "123", "day": "2026-10-07", "rounds": 37 }, ...]
-- (the route validates and de-duplicates first; the GROUP BY makes repeated
-- keys inside one batch safe anyway). Returns the number of rows written.
create or replace function public.upsert_casino_rounds(p_rows jsonb)
returns integer
language sql
security invoker
set search_path = public
as $$
  with incoming as (
    select r->>'user_id'          as user_id,
           (r->>'day')::date       as day,
           max((r->>'rounds')::int) as rounds
    from jsonb_array_elements(p_rows) as r
    group by 1, 2
  ), up as (
    insert into public.casino_activity as ca (user_id, day, rounds, updated_at)
    select user_id, day, rounds, now() from incoming
    on conflict (user_id, day) do update
      set rounds     = greatest(ca.rounds, excluded.rounds),
          updated_at = now()
    returning 1
  )
  select count(*)::int from up;
$$;

revoke all on function public.upsert_casino_rounds(jsonb) from public, anon, authenticated;
grant execute on function public.upsert_casino_rounds(jsonb) to service_role;
