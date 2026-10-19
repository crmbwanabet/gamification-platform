-- ============================================================================
-- 2026-10-19 — extras: match-day predictions, weekly leaderboard prizes,
-- comeback bonuses. Service-role only like every other live table: RLS on,
-- NO policies, no grants to anon/authenticated. Rules: lib/extras/rules.mjs.
-- ============================================================================

-- One free 1X2 pick per player per fixture (bwanabet sportsbook event id).
create table if not exists public.predictions (
  user_id     text        not null,                 -- bwanabet user id
  event_id    text        not null,
  pick        text        not null check (pick in ('home', 'draw', 'away')),
  home        text        not null,
  away        text        not null,
  league      text,
  kickoff     timestamptz not null,
  pick_day    date        not null,                 -- Lusaka day of the pick (daily limit)
  created_at  timestamptz not null default now(),
  outcome     text        check (outcome in ('home', 'draw', 'away')),
  score       text,
  settled_at  timestamptz,
  claimed_at  timestamptz,
  primary key (user_id, event_id)
);
create index if not exists predictions_unsettled_idx on public.predictions (kickoff) where settled_at is null;
alter table public.predictions enable row level security;

-- A weekly leaderboard prize, paid once per player per week.
create table if not exists public.leaderboard_claims (
  user_id     text        not null,
  week_start  date        not null,                 -- Monday of the Lusaka week the rank was for
  band        text        not null,
  rank        integer     not null check (rank > 0),
  coins       integer     not null check (coins > 0),
  created_at  timestamptz not null default now(),
  primary key (user_id, week_start)
);
alter table public.leaderboard_claims enable row level security;

-- A comeback bonus, paid once per lapse (keyed by the last active day before the gap).
create table if not exists public.comeback_claims (
  user_id          text        not null,
  last_active_day  date        not null,
  coins            integer     not null check (coins > 0),
  created_at       timestamptz not null default now(),
  primary key (user_id, last_active_day)
);
alter table public.comeback_claims enable row level security;

-- The leaderboard and the SMS list read player_activity by day range.
create index if not exists player_activity_day_idx on public.player_activity (day);
revoke all on public.predictions, public.leaderboard_claims, public.comeback_claims from anon, authenticated;
-- APPLIED 2026-10-19 (Supabase migration extras_predictions_leaderboard_comeback).
