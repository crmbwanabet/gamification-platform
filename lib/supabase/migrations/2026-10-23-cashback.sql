-- Daily gem CASHBACK (owner 2026-10-23): 5% of a player's real-money net loss (APPLIED 2026-10-23)
-- on bwanabet per UTC-day window (02:00 → 02:00 Lusaka), paid as prize gems
-- from 06:00 Lusaka the next morning.
-- Written by the cron (app/api/cron/cashback, lib/cashback/crmCashback.mjs),
-- ONE row per player per window (the primary key makes re-runs pay once);
-- the player collects it in the Bonus Center (POST /api/cashback, which sets
-- collected_at once). Service-role only, like every other table here.

create table if not exists public.cashback_awards (
  user_id         text        not null,
  window_day      date        not null,           -- the window's UTC date
  net_loss        numeric(14,2) not null,          -- kwacha, stakes minus winnings, casino + sports
  cashback_kwacha numeric(14,2) not null,          -- 5% of net_loss
  value_coins     bigint      not null,           -- what the gems are worth in coins at award time
  emeralds        integer     not null default 0,
  rubies          integer     not null default 0,
  diamonds        integer     not null default 0,
  casino_stake    numeric(14,2) not null default 0,
  casino_win      numeric(14,2) not null default 0,
  sports_stake    numeric(14,2) not null default 0,
  sports_win      numeric(14,2) not null default 0,
  created_at      timestamptz not null default now(),
  collected_at    timestamptz,
  primary key (user_id, window_day),
  check (emeralds >= 0 and rubies >= 0 and diamonds >= 0 and emeralds + rubies + diamonds > 0)
);

create index if not exists cashback_awards_uncollected on public.cashback_awards (user_id) where collected_at is null;
create index if not exists cashback_awards_window on public.cashback_awards (window_day);

alter table public.cashback_awards enable row level security;
revoke all on public.cashback_awards from anon, authenticated;
