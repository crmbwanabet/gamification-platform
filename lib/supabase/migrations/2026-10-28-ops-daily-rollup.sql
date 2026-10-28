-- Ops console DAILY ROLLUP (2026-10-28, owner): activity_events grows ~270k
-- rows a day, so reports over weeks/months ran past the 8 s API timeout even
-- after 2026-10-28-ops-report-speed.sql. The console now reads ops_daily (one
-- row per Lusaka day x player x event type x game) plus the few raw events
-- not rolled up yet, so every report stays live to the minute.
--
--  ops_daily          the rollup (service-role only). Event types the reports
--                     never break out fold into '_other' (game_id ''), see
--                     ops_kept_type(): ADDING A TYPE to ops_reward_types() (or a
--                     new report column) needs a re-backfill (truncate + the
--                     backfill below), else its old rows stay under '_other'.
--  ops_rollup_state   rolled_until: every event with created_at < it is in ops_daily
--  ops_rollup()       adds events [rolled_until, now - 1 min) (at most 2 hours a
--                     call, so a missed cron catches up in steps); upsert ADDS to
--                     the rows. Called every 10 min by /api/cron/ops-rollup.
--  ops_events(f, t)   rollup rows of the window + the raw tail, same shape
--  ops_coins / ops_games / ops_report_days / ops_report_players read ops_events
--  (same columns and results as before: hash-checked on 7-day and 1-day windows).
-- Backfill: insert everything before a cutoff once, then set rolled_until (done
-- by hand 2026-10-28, see the end of this file).

create table if not exists ops_daily (
  day date not null,
  uid text not null,
  type text not null,
  game_id text not null default '',   -- '' = no game (NULL in activity_events)
  n bigint not null,
  amount numeric,                      -- sum(amount), NULL when every amount was NULL
  staked numeric,                      -- sum(meta.stake) over events that carry a stake, else NULL
  paid numeric,                        -- sum(meta.payout) over the same events
  first_at timestamptz not null,
  last_at timestamptz not null,
  primary key (day, uid, type, game_id)
);
alter table ops_daily enable row level security;
revoke all on ops_daily from public, anon, authenticated;

create or replace function ops_kept_type(t text) returns text language sql immutable as $$
  select case when t = any (ops_reward_types()) or t in ('game_open','game_played','wheel_spun','mission_completed','sports_mission_claimed','daily_claimed') then t else '_other' end
$$;

create table if not exists ops_rollup_state (
  id int primary key default 1 check (id = 1),
  rolled_until timestamptz not null,
  updated_at timestamptz not null default now()
);
alter table ops_rollup_state enable row level security;
revoke all on ops_rollup_state from public, anon, authenticated;

create or replace function ops_rollup()
returns table(rolled_from timestamptz, rolled_to timestamptz, rows_upserted bigint)
language plpgsql security definer
set search_path = public
as $$
declare s timestamptz; u timestamptz; c bigint;
begin
  select rolled_until into s from ops_rollup_state where id = 1 for update;
  if s is null then raise exception 'ops_rollup_state not initialised'; end if;
  u := least(now() - interval '1 minute', s + interval '2 hours');
  if u <= s then return query select s, s, 0::bigint; return; end if;
  insert into ops_daily as d (day, uid, type, game_id, n, amount, staked, paid, first_at, last_at)
  select (e.created_at at time zone 'Africa/Lusaka')::date, e.uid, ops_kept_type(e.type),
    case when e.type in ('game_open','game_played') then coalesce(e.game_id, '') else '' end,
    count(*), sum(e.amount),
    sum((e.meta->>'stake')::numeric) filter (where e.meta ? 'stake'),
    sum((e.meta->>'payout')::numeric) filter (where e.meta ? 'stake'),
    min(e.created_at), max(e.created_at)
  from activity_events e
  where e.created_at >= s and e.created_at < u and e.uid ~ '^[0-9]+$'
  group by 1, 2, 3, 4
  on conflict (day, uid, type, game_id) do update set
    n = d.n + excluded.n,
    amount = case when d.amount is null and excluded.amount is null then null else coalesce(d.amount, 0) + coalesce(excluded.amount, 0) end,
    staked = case when d.staked is null and excluded.staked is null then null else coalesce(d.staked, 0) + coalesce(excluded.staked, 0) end,
    paid = case when d.paid is null and excluded.paid is null then null else coalesce(d.paid, 0) + coalesce(excluded.paid, 0) end,
    first_at = least(d.first_at, excluded.first_at),
    last_at = greatest(d.last_at, excluded.last_at);
  get diagnostics c = row_count;
  update ops_rollup_state set rolled_until = u, updated_at = now() where id = 1;
  return query select s, u, c;
end
$$;

-- The window's events in rollup shape: rolled-up days + the raw tail since rolled_until.
create or replace function ops_events(p_from timestamptz, p_to timestamptz)
returns table(day date, uid text, type text, game_id text, n bigint, amount numeric, staked numeric, paid numeric, first_at timestamptz, last_at timestamptz)
language plpgsql stable security definer
set search_path = public
as $fn$
declare r timestamptz;
begin
  select rolled_until into r from ops_rollup_state where id = 1;
  r := coalesce(r, '-infinity');
  return query execute $q$
    select d.day, d.uid, d.type, d.game_id, d.n, d.amount, d.staked, d.paid, d.first_at, d.last_at
    from ops_daily d
    -- the console's windows are whole Lusaka days: [from 00:00, day after "to" 00:00)
    where d.day >= ($1 at time zone 'Africa/Lusaka')::date and d.day < ($2 at time zone 'Africa/Lusaka')::date
    union all
    select (e.created_at at time zone 'Africa/Lusaka')::date, e.uid, ops_kept_type(e.type),
      case when e.type in ('game_open','game_played') then coalesce(e.game_id, '') else '' end,
      count(*), sum(e.amount)::numeric,
      sum((e.meta->>'stake')::numeric) filter (where e.meta ? 'stake'),
      sum((e.meta->>'payout')::numeric) filter (where e.meta ? 'stake'),
      min(e.created_at), max(e.created_at)
    from activity_events e
    where e.created_at >= greatest($1, $3) and e.created_at < $2 and e.uid ~ '^[0-9]+$'
    group by 1, 2, 3, 4
  $q$ using p_from, p_to, r;
end
$fn$;

create or replace function ops_coins(p_from timestamptz, p_to timestamptz)
returns table(kind text, source text, events bigint, players bigint, coins numeric, staked numeric, paid numeric)
language sql stable security definer
set search_path = public
as $$
  with ev as (select * from ops_events(p_from, p_to))
  select 'reward', ev.type, sum(ev.n)::bigint, count(distinct ev.uid), coalesce(sum(ev.amount), 0), null::numeric, null::numeric
  from ev where ev.type = any (ops_reward_types())
  group by ev.type
  union all
  select 'game', coalesce(nullif(ev.game_id, ''), '?'), sum(ev.n)::bigint, count(distinct ev.uid), coalesce(sum(ev.amount), 0),
    sum(ev.staked), sum(ev.paid)
  from ev where ev.type = 'game_played'
  group by nullif(ev.game_id, '')
$$;

create or replace function ops_games(p_from timestamptz, p_to timestamptz)
returns table(game text, sessions bigint, players bigint, rounds bigint, staked numeric, paid numeric, last_played timestamptz)
language sql stable security definer
set search_path = public
as $$
  select coalesce(nullif(ev.game_id, ''), '?'),
    coalesce(sum(ev.n) filter (where ev.type = 'game_open'), 0)::bigint,
    count(distinct ev.uid),
    coalesce(sum(ev.n) filter (where ev.type = 'game_played'), 0)::bigint,
    coalesce(sum(ev.staked) filter (where ev.type = 'game_played'), 0),
    coalesce(sum(ev.paid) filter (where ev.type = 'game_played'), 0),
    max(ev.last_at) filter (where ev.type = 'game_played')
  from ops_events(p_from, p_to) ev
  where ev.type in ('game_open', 'game_played')
  group by nullif(ev.game_id, '')
$$;

create or replace function ops_report_players(p_from timestamptz, p_to timestamptz)
returns table(uid text, last_seen timestamptz, visits bigint, active_minutes numeric, daily_claims bigint, missions bigint, game_sessions bigint, games bigint, rounds bigint, staked numeric, paid numeric, coins_out numeric, wheel_spins bigint)
language sql stable security definer
set search_path = public
as $$
  with s as (
    select ps.uid, count(*) visits, sum(coalesce(ps.active_seconds, 0)) secs, max(ps.last_ping_at) last_ping
    from play_sessions ps
    where ps.started_at >= p_from and ps.started_at < p_to and ps.uid ~ '^[0-9]+$'
    group by ps.uid
  ), e2 as (
    select ev.uid,
      max(ev.last_at) last_ev,
      coalesce(sum(ev.n) filter (where ev.type = 'daily_claimed'), 0)::bigint daily_claims,
      coalesce(sum(ev.n) filter (where ev.type in ('mission_completed','sports_mission_claimed')), 0)::bigint missions,
      coalesce(sum(ev.n) filter (where ev.type = 'game_open'), 0)::bigint game_sessions,
      count(distinct nullif(ev.game_id, '')) filter (where ev.type in ('game_open','game_played')) games,
      coalesce(sum(ev.n) filter (where ev.type = 'game_played'), 0)::bigint rounds,
      sum(ev.staked) filter (where ev.type = 'game_played') staked,
      sum(ev.paid) filter (where ev.type = 'game_played') paid,
      sum(ev.amount) filter (where ev.type = any (ops_reward_types())) coins_out,
      coalesce(sum(ev.n) filter (where ev.type = 'wheel_spun'), 0)::bigint wheel_spins
    from ops_events(p_from, p_to) ev
    group by ev.uid
  )
  select coalesce(e2.uid, s.uid),
         greatest(e2.last_ev, s.last_ping),
         coalesce(s.visits, 0), round(coalesce(s.secs, 0) / 60.0, 1),
         coalesce(e2.daily_claims, 0), coalesce(e2.missions, 0), coalesce(e2.game_sessions, 0), coalesce(e2.games, 0),
         coalesce(e2.rounds, 0), coalesce(e2.staked, 0), coalesce(e2.paid, 0), coalesce(e2.coins_out, 0), coalesce(e2.wheel_spins, 0)
  from e2 full join s on s.uid = e2.uid
$$;
alter function ops_report_players(timestamptz, timestamptz) reset all;
alter function ops_report_players(timestamptz, timestamptz) set search_path = public;

create or replace function ops_report_days(p_from timestamptz, p_to timestamptz)
returns table(day date, players bigint, visits bigint, active_minutes numeric, daily_claims bigint, missions bigint, rounds bigint, staked numeric, paid numeric, coins_out numeric, wheel_spins bigint, new_players bigint)
language sql stable security definer
set search_path = public
set work_mem = '64MB'
as $$
  with ev as (select * from ops_events(p_from, p_to)),
  ea as (
    select ev.day d,
      coalesce(sum(ev.n) filter (where ev.type = 'daily_claimed'), 0)::bigint daily_claims,
      coalesce(sum(ev.n) filter (where ev.type in ('mission_completed','sports_mission_claimed')), 0)::bigint missions,
      coalesce(sum(ev.n) filter (where ev.type = 'game_played'), 0)::bigint rounds,
      coalesce(sum(ev.staked) filter (where ev.type = 'game_played'), 0) staked,
      coalesce(sum(ev.paid) filter (where ev.type = 'game_played'), 0) paid,
      coalesce(sum(ev.amount) filter (where ev.type = any (ops_reward_types())), 0) coins_out,
      coalesce(sum(ev.n) filter (where ev.type = 'wheel_spun'), 0)::bigint wheel_spins
    from ev group by ev.day
  ), s as (
    select (ps.started_at at time zone 'Africa/Lusaka')::date d, ps.uid, coalesce(ps.active_seconds, 0) secs
    from play_sessions ps
    where ps.started_at >= p_from and ps.started_at < p_to and ps.uid ~ '^[0-9]+$'
  ), sa as (
    select s.d, count(*) visits, round(coalesce(sum(s.secs), 0) / 60.0, 1) mins from s group by s.d
  ), act as (
    select x.d, count(distinct x.uid) n from (select ev.day d, ev.uid from ev union select s.d, s.uid from s) x group by x.d
  ), days as (select ea.d from ea union select sa.d from sa),
  np as (
    select (p.first_daily_at at time zone 'Africa/Lusaka')::date d, count(*) n
    from profiles p where p.first_daily_at is not null group by 1
  )
  select days.d, coalesce(act.n, 0), coalesce(sa.visits, 0), coalesce(sa.mins, 0),
    coalesce(ea.daily_claims, 0), coalesce(ea.missions, 0), coalesce(ea.rounds, 0),
    coalesce(ea.staked, 0), coalesce(ea.paid, 0), coalesce(ea.coins_out, 0), coalesce(ea.wheel_spins, 0),
    coalesce(np.n, 0)
  from days
  left join ea on ea.d = days.d
  left join sa on sa.d = days.d
  left join act on act.d = days.d
  left join np on np.d = days.d
  order by days.d
$$;

revoke all on function ops_rollup() from public, anon, authenticated;
revoke all on function ops_events(timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function ops_rollup() to service_role;
grant execute on function ops_events(timestamptz, timestamptz) to service_role;
revoke all on function ops_kept_type(text) from public, anon, authenticated;

-- Backfill (APPLIED 2026-10-28 13:53 UTC; also the way to rebuild):
-- begin;
-- delete from ops_rollup_state; truncate ops_daily;
-- create temp table _cut on commit drop as select date_trunc('minute', now()) - interval '1 minute' c;
-- insert into ops_daily (day, uid, type, game_id, n, amount, staked, paid, first_at, last_at)
-- select (e.created_at at time zone 'Africa/Lusaka')::date, e.uid, ops_kept_type(e.type),
--   case when e.type in ('game_open','game_played') then coalesce(e.game_id, '') else '' end,
--   count(*), sum(e.amount),
--   sum((e.meta->>'stake')::numeric) filter (where e.meta ? 'stake'),
--   sum((e.meta->>'payout')::numeric) filter (where e.meta ? 'stake'),
--   min(e.created_at), max(e.created_at)
-- from activity_events e where e.created_at < (select c from _cut) and e.uid ~ '^[0-9]+$'
-- group by 1, 2, 3, 4;
-- insert into ops_rollup_state (id, rolled_until) select 1, c from _cut;
-- commit;
