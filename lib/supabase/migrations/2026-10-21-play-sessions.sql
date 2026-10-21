-- ============================================================================
-- 2026-10-21 — heartbeat: exact visit length + who is online now.
-- APPLIED 2026-10-21 (Supabase migration play_sessions_heartbeat).
-- Writer: POST /api/track/ping (lib/heartbeat.mjs), via ping_session(). The
-- client pings every 30 s while the Bonus Center is open AND its tab is
-- visible, plus one final ping on hide/close. ONE row per session (sid = the
-- lib/track.js session id, one per widget load). uid only from the bwanabet
-- token checked on the server; anonymous sessions keep uid null.
-- Service-role only (RLS on, no policies, no anon/authenticated grants).
-- ============================================================================
create table if not exists public.play_sessions (
  sid            text primary key,
  uid            text,                                  -- bwanabet user id (text, like activity_events.uid); null = anonymous
  verified       boolean not null default false,        -- uid came from a checked token
  started_at     timestamptz not null default now(),
  last_ping_at   timestamptz not null default now(),
  pings          integer not null default 1,
  active_seconds integer not null default 0,            -- open + visible time: each ping adds the gap since the last one (max 45 s; 0 after a final ping)
  ended_at       timestamptz                            -- set by the final ping on hide/close; cleared when the player comes back
);
create index if not exists play_sessions_last_ping_idx on public.play_sessions (last_ping_at desc);
create index if not exists play_sessions_uid_started_idx on public.play_sessions (uid, started_at desc);

alter table public.play_sessions enable row level security;
revoke all on public.play_sessions from anon, authenticated;

-- One call per ping: upsert the session row (at most one regular ping per sid
-- every 20 s; a final ping always lands) and, for a verified player, move
-- profiles.last_seen_at. Returns true when the ping was recorded.
create or replace function public.ping_session(p_sid text, p_uid text, p_final boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  insert into public.play_sessions as s (sid, uid, verified, started_at, last_ping_at, pings, active_seconds, ended_at)
  values (p_sid, p_uid, p_uid is not null, now(), now(), 1, 0, case when p_final then now() end)
  on conflict (sid) do update set
    uid            = coalesce(s.uid, excluded.uid),
    verified       = s.verified or excluded.verified,
    active_seconds = s.active_seconds + case when s.ended_at is null
                       then least(45, greatest(0, extract(epoch from now() - s.last_ping_at)))::integer else 0 end,
    last_ping_at   = now(),
    pings          = s.pings + 1,
    ended_at       = case when p_final then now() else null end
  where p_final or s.ended_at is not null or s.last_ping_at < now() - interval '20 seconds';
  get diagnostics n = row_count;
  if n > 0 and p_uid is not null then
    update public.profiles set last_seen_at = now() where bwanabet_user_id = p_uid::bigint;
  end if;
  return n > 0;
end;
$$;
revoke all on function public.ping_session(text, text, boolean) from public, anon, authenticated;
grant execute on function public.ping_session(text, text, boolean) to service_role;

-- Who is in the Bonus Center right now: a ping in the last 90 s, not ended.
create or replace view public.online_now with (security_invoker = true) as
select sid, uid, verified, started_at, last_ping_at,
  round(active_seconds / 60.0, 1) as minutes_so_far
from public.play_sessions
where last_ping_at > now() - interval '90 seconds' and ended_at is null;
revoke all on public.online_now from anon, authenticated;

-- Per player per Lusaka day: visits and minutes open. `minutes` = active time
-- (open + visible, accurate to ~30 s); `span_minutes` = last ping - start.
create or replace view public.session_lengths with (security_invoker = true) as
select coalesce(uid, 'anon') as uid,
  (started_at at time zone 'Africa/Lusaka')::date as day,
  count(*) as visits,
  round(sum(active_seconds) / 60.0, 1) as minutes,
  round(sum(extract(epoch from last_ping_at - started_at)) / 60.0, 1) as span_minutes,
  round(max(active_seconds) / 60.0, 1) as longest_visit_minutes
from public.play_sessions
group by 1, 2;
revoke all on public.session_lengths from anon, authenticated;
