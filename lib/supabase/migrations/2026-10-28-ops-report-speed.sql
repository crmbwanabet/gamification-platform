-- Ops console speed (2026-10-28): activity_events passed 1.6M rows in 6 days
-- and the Coins (27 s) / Report (26 s players, 43 s days) calls ran past the
-- 8 s API statement timeout (500 in the console).
--  1. a covering index so the type-filtered reports (ops_coins, ops_games)
--     read only the index (APPLIED by hand with CONCURRENTLY; kept here for
--     the record):
--       create index concurrently if not exists activity_events_type_time_cover_idx
--         on public.activity_events (type, created_at) include (uid, game_id, amount, meta);
--  2. the two all-types reports read the table straight through (the planner
--     chose a 1.5M-row index walk: 17 s vs ~1 s seq scan) with room to sort;
--  3. ops_report_days reads the events ONCE, per day per player first (it
--     re-scanned them ~10 times per day); same columns and results.

create or replace function ops_report_days(p_from timestamptz, p_to timestamptz)
returns table(day date, players bigint, visits bigint, active_minutes numeric, daily_claims bigint, missions bigint, rounds bigint, staked numeric, paid numeric, coins_out numeric, wheel_spins bigint, new_players bigint)
language plpgsql stable security definer
set search_path = public
set enable_indexscan = off
set enable_bitmapscan = off
set work_mem = '64MB'
as $fn$
begin
  -- EXECUTE plans with the real dates (a plain SQL function planned for any
  -- date range and took 7.9 s instead of 3.2 s)
  return query execute $q$
  with pu as (
    -- one pass: per Lusaka day per player, then rolled up per day below
    select (e.created_at at time zone 'Africa/Lusaka')::date d, e.uid,
      count(*) filter (where e.type = 'daily_claimed') daily_claims,
      count(*) filter (where e.type in ('mission_completed','sports_mission_claimed')) missions,
      count(*) filter (where e.type = 'game_played') rounds,
      sum((e.meta->>'stake')::numeric) filter (where e.type = 'game_played' and e.meta ? 'stake') staked,
      sum((e.meta->>'payout')::numeric) filter (where e.type = 'game_played' and e.meta ? 'stake') paid,
      sum(e.amount) filter (where e.type = any (ops_reward_types())) coins_out,
      count(*) filter (where e.type = 'wheel_spun') wheel_spins
    from activity_events e
    where e.created_at >= $1 and e.created_at < $2 and e.uid ~ '^[0-9]+$'
    group by 1, 2
  ), s as (
    select (ps.started_at at time zone 'Africa/Lusaka')::date d, ps.uid, coalesce(ps.active_seconds, 0) secs
    from play_sessions ps
    where ps.started_at >= $1 and ps.started_at < $2 and ps.uid ~ '^[0-9]+$'
  ), ea as (
    select d, sum(daily_claims)::bigint daily_claims, sum(missions)::bigint missions, sum(rounds)::bigint rounds,
      coalesce(sum(staked), 0) staked, coalesce(sum(paid), 0) paid, coalesce(sum(coins_out), 0) coins_out,
      sum(wheel_spins)::bigint wheel_spins
    from pu group by d
  ), sa as (
    select d, count(*) visits, round(coalesce(sum(secs), 0) / 60.0, 1) mins from s group by d
  ), act as (
    select d, count(distinct uid) n from (select d, uid from pu union select d, uid from s) x group by d
  ), days as (select d from ea union select d from sa),
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
  $q$ using p_from, p_to;
end
$fn$;

alter function ops_report_players(timestamptz, timestamptz)
  set enable_indexscan = off;
alter function ops_report_players(timestamptz, timestamptz)
  set enable_bitmapscan = off;
alter function ops_report_players(timestamptz, timestamptz)
  set work_mem = '64MB';
