-- Bonus Center OPS CONSOLE (2026-10-22): its own logins, sessions, failed-login
-- counter and a hash-chained audit log, plus read-only report functions.
-- Same model as the USSD ops console (E:\UssdCrashGame). Service-role only:
-- RLS on, no policies; the functions are revoked from anon/authenticated.

create table if not exists ops_admins (
  id           bigserial primary key,
  username     text not null unique,
  pw_hash      text not null,            -- pbkdf2-sha256, hex
  pw_salt      text not null,            -- hex
  pw_iter      integer not null,
  role         text not null check (role in ('master', 'limited')),
  permissions  jsonb not null default '[]'::jsonb,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  created_by   text,
  last_login_at timestamptz
);

create table if not exists ops_sessions (
  token_hash  text primary key,          -- sha256 of the token; the token itself is never stored
  admin_id    bigint not null references ops_admins(id) on delete cascade,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null,
  ip          text
);
create index if not exists ops_sessions_admin on ops_sessions(admin_id);

create table if not exists ops_login_failures (
  id  bigserial primary key,
  ip  text not null,
  at  timestamptz not null default now()
);
create index if not exists ops_login_failures_ip_at on ops_login_failures(ip, at);

create table if not exists ops_audit (
  id        bigserial primary key,
  at        timestamptz not null default now(),
  actor     text not null,
  ip        text,
  action    text not null,
  target    text,
  detail    jsonb,
  prev_hash text not null,
  hash      text not null
);

alter table ops_admins enable row level security;
alter table ops_sessions enable row level security;
alter table ops_login_failures enable row level security;
alter table ops_audit enable row level security;

-- ---------------------------------------------------------------------------
-- Report functions. Days are Africa/Lusaka days. A "player" is a numeric
-- bwanabet id (anonymous visitors are left out). Coins out = the reward event
-- types that carry an amount. Mini-game staked/paid come from game_played meta
-- (recorded from 2026-10-22; older rounds only have the net win).
-- ---------------------------------------------------------------------------

create or replace function ops_reward_types() returns text[] language sql immutable as $$
  select array['daily_claimed','mission_completed','sports_mission_claimed','prediction_claimed','leaderboard_claimed',
               'comeback_claimed','album_set_claimed','hustle_collected','league_bonus_claimed','wc_bonus_claimed',
               'story_prize_claimed','level_up','streak_bonus']
$$;

-- One row per player active in [p_from, p_to)
create or replace function ops_report_players(p_from timestamptz, p_to timestamptz)
returns table (uid text, last_seen timestamptz, visits bigint, active_minutes numeric, daily_claims bigint,
               missions bigint, rounds bigint, staked numeric, paid numeric, coins_out numeric, wheel_spins bigint)
language sql stable security definer set search_path = public as $$
  with ev as (
    select e.uid, e.type, e.amount, e.meta, e.created_at
    from activity_events e
    where e.created_at >= p_from and e.created_at < p_to and e.uid ~ '^[0-9]+$'
  ), s as (
    select ps.uid, count(*) visits, sum(coalesce(ps.active_seconds, 0)) secs, max(ps.last_ping_at) last_ping
    from play_sessions ps
    where ps.started_at >= p_from and ps.started_at < p_to and ps.uid ~ '^[0-9]+$'
    group by ps.uid
  ), e2 as (
    select uid,
      max(created_at) last_ev,
      count(*) filter (where type = 'daily_claimed') daily_claims,
      count(*) filter (where type in ('mission_completed','sports_mission_claimed')) missions,
      count(*) filter (where type = 'game_played') rounds,
      sum((meta->>'stake')::numeric) filter (where type = 'game_played' and meta ? 'stake') staked,
      sum((meta->>'payout')::numeric) filter (where type = 'game_played' and meta ? 'stake') paid,
      sum(amount) filter (where type = any (ops_reward_types())) coins_out,
      count(*) filter (where type = 'wheel_spun') wheel_spins
    from ev group by uid
  )
  select coalesce(e2.uid, s.uid),
         greatest(e2.last_ev, s.last_ping),
         coalesce(s.visits, 0), round(coalesce(s.secs, 0) / 60.0, 1),
         coalesce(e2.daily_claims, 0), coalesce(e2.missions, 0), coalesce(e2.rounds, 0),
         coalesce(e2.staked, 0), coalesce(e2.paid, 0), coalesce(e2.coins_out, 0), coalesce(e2.wheel_spins, 0)
  from e2 full join s on s.uid = e2.uid
$$;

-- One row per Lusaka day in [p_from, p_to)
create or replace function ops_report_days(p_from timestamptz, p_to timestamptz)
returns table (day date, players bigint, visits bigint, active_minutes numeric, daily_claims bigint, missions bigint,
               rounds bigint, staked numeric, paid numeric, coins_out numeric, wheel_spins bigint, new_players bigint)
language sql stable security definer set search_path = public as $$
  with ev as (
    select (e.created_at at time zone 'Africa/Lusaka')::date d, e.uid, e.type, e.amount, e.meta
    from activity_events e
    where e.created_at >= p_from and e.created_at < p_to and e.uid ~ '^[0-9]+$'
  ), s as (
    select (ps.started_at at time zone 'Africa/Lusaka')::date d, ps.uid, coalesce(ps.active_seconds, 0) secs
    from play_sessions ps
    where ps.started_at >= p_from and ps.started_at < p_to and ps.uid ~ '^[0-9]+$'
  ), days as (select d from ev union select d from s), act as (select d, uid from ev union select d, uid from s)
  select days.d,
    (select count(distinct a.uid) from act a where a.d = days.d),
    (select count(*) from s where s.d = days.d),
    (select round(coalesce(sum(s.secs), 0) / 60.0, 1) from s where s.d = days.d),
    (select count(*) from ev where ev.d = days.d and ev.type = 'daily_claimed'),
    (select count(*) from ev where ev.d = days.d and ev.type in ('mission_completed','sports_mission_claimed')),
    (select count(*) from ev where ev.d = days.d and ev.type = 'game_played'),
    (select coalesce(sum((ev.meta->>'stake')::numeric), 0) from ev where ev.d = days.d and ev.type = 'game_played' and ev.meta ? 'stake'),
    (select coalesce(sum((ev.meta->>'payout')::numeric), 0) from ev where ev.d = days.d and ev.type = 'game_played' and ev.meta ? 'stake'),
    (select coalesce(sum(ev.amount), 0) from ev where ev.d = days.d and ev.type = any (ops_reward_types())),
    (select count(*) from ev where ev.d = days.d and ev.type = 'wheel_spun'),
    (select count(*) from profiles p where (p.first_daily_at at time zone 'Africa/Lusaka')::date = days.d)
  from days order by days.d
$$;

-- Coins handed out per source, and the mini-games per game, in [p_from, p_to)
create or replace function ops_coins(p_from timestamptz, p_to timestamptz)
returns table (kind text, source text, events bigint, players bigint, coins numeric, staked numeric, paid numeric)
language sql stable security definer set search_path = public as $$
  select 'reward', e.type, count(*), count(distinct e.uid), coalesce(sum(e.amount), 0), null::numeric, null::numeric
  from activity_events e
  where e.created_at >= p_from and e.created_at < p_to and e.uid ~ '^[0-9]+$' and e.type = any (ops_reward_types())
  group by e.type
  union all
  select 'game', coalesce(e.game_id, '?'), count(*), count(distinct e.uid), coalesce(sum(e.amount), 0),
         sum((e.meta->>'stake')::numeric) filter (where e.meta ? 'stake'),
         sum((e.meta->>'payout')::numeric) filter (where e.meta ? 'stake')
  from activity_events e
  where e.created_at >= p_from and e.created_at < p_to and e.uid ~ '^[0-9]+$' and e.type = 'game_played'
  group by e.game_id
$$;

-- The player list: everyone with a profile, with lifetime + 7-day CRM betting
create or replace function ops_players(p_q text, p_limit integer)
returns table (uid text, name text, xp bigint, coins numeric, emeralds integer, rubies integer, diamonds integer,
               missions integer, first_daily_at timestamptz, created_at timestamptz, last_seen timestamptz,
               visits bigint, active_minutes numeric, casino_7d numeric, sports_7d numeric, deposits_7d numeric, bet_days_7d bigint)
language sql stable security definer set search_path = public as $$
  with p as (
    select pr.* from profiles pr
    where p_q is null or p_q = ''
       or pr.bwanabet_user_id::text like '%' || p_q || '%'
       or lower(coalesce(pr.state->>'displayName', '')) like '%' || lower(p_q) || '%'
    order by coalesce(pr.last_seen_at, pr.updated_at) desc nulls last
    limit greatest(1, least(coalesce(p_limit, 500), 2000))
  )
  select p.bwanabet_user_id::text, p.state->>'displayName', p.xp,
    coalesce((p.state->>'kwacha')::numeric, p.kwacha), coalesce(p.emeralds, 0), coalesce(p.rubies, 0), coalesce(p.diamonds, 0),
    coalesce(jsonb_array_length(case when jsonb_typeof(p.state->'missionClaims') = 'array' then p.state->'missionClaims' end), 0),
    p.first_daily_at, p.created_at, coalesce(p.last_seen_at, p.updated_at),
    (select count(*) from play_sessions s where s.uid = p.bwanabet_user_id::text),
    (select round(coalesce(sum(s.active_seconds), 0) / 60.0, 1) from play_sessions s where s.uid = p.bwanabet_user_id::text),
    (select coalesce(sum(a.casino_stake), 0) from player_activity a where a.user_id = p.bwanabet_user_id::text and a.day >= current_date - 6),
    (select coalesce(sum(a.sports_stake), 0) from player_activity a where a.user_id = p.bwanabet_user_id::text and a.day >= current_date - 6),
    (select coalesce(sum(a.deposits_amount), 0) from player_activity a where a.user_id = p.bwanabet_user_id::text and a.day >= current_date - 6),
    (select count(*) from player_activity a where a.user_id = p.bwanabet_user_id::text and a.day >= current_date - 6 and (a.casino_stake > 0 or a.sports_stake > 0))
  from p
$$;

revoke all on function ops_reward_types() from public, anon, authenticated;
revoke all on function ops_report_players(timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function ops_report_days(timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function ops_coins(timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function ops_players(text, integer) from public, anon, authenticated;
grant execute on function ops_reward_types() to service_role;
grant execute on function ops_report_players(timestamptz, timestamptz) to service_role;
grant execute on function ops_report_days(timestamptz, timestamptz) to service_role;
grant execute on function ops_coins(timestamptz, timestamptz) to service_role;
grant execute on function ops_players(text, integer) to service_role;
