-- ============================================================================
-- 2026-10-19 — every player action tracked; first login = first reward claim.
-- APPLIED 2026-10-19 (Supabase migration activity_tracking_first_login).
-- Writer: POST /api/track (identity from the bwanabet token, checked there).
-- Event types: lib/trackTypes.mjs. Service-role only (no anon/authenticated).
-- ============================================================================
alter table public.activity_events add column if not exists session_id text;          -- one id per widget load
alter table public.activity_events add column if not exists verified boolean not null default false; -- uid from a checked token
alter table public.profiles add column if not exists first_login_at timestamptz;       -- first reward claimed in the Bonus Center
alter table public.profiles add column if not exists last_seen_at timestamptz;         -- latest tracked activity
create index if not exists activity_events_uid_time_idx on public.activity_events (uid, created_at desc);
create index if not exists activity_events_type_time_idx on public.activity_events (type, created_at desc);
create index if not exists activity_events_session_idx on public.activity_events (session_id);

-- One row per player: first login, last seen, activity counts.
create or replace view public.player_engagement with (security_invoker = true) as
select p.bwanabet_user_id as uid, p.first_login_at, p.last_seen_at,
  (select count(*) from public.activity_events e where e.uid = p.bwanabet_user_id::text) as events_total,
  (select count(*) from public.activity_events e where e.uid = p.bwanabet_user_id::text and e.created_at > now() - interval '7 days') as events_7d,
  (select count(distinct e.session_id) from public.activity_events e where e.uid = p.bwanabet_user_id::text) as visits,
  (select max(e.created_at) from public.activity_events e where e.uid = p.bwanabet_user_id::text) as last_event_at
from public.profiles p;
revoke all on public.player_engagement from anon, authenticated;
