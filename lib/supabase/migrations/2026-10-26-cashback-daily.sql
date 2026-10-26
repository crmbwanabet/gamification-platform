-- Daily CASHBACK LEDGER (owner 2026-10-26): every player's cashback for every
-- day is stored here, whether or not it pays gems. One row per player the CRM
-- reports for a UTC-day window (02:00 → 02:00 Lusaka), written by the cashback
-- cron (lib/cashback/crmCashback.mjs) before it pays; the gems themselves stay
-- in cashback_awards. A window is recorded once: a later CRM correction does
-- not rewrite it (the same rule as the awards). Service-role only.
--
-- status: awarded       = gems paid (a cashback_awards row exists)
--         below_minimum = cashback under half an emerald (loss under K200)
--         not_eligible  = no reward anchor on/before the window (never claimed a daily reward)
--         no_loss       = won or broke even

create table if not exists public.cashback_daily (
  user_id         text          not null,
  window_day      date          not null,          -- the window's UTC date
  casino_stake    numeric(14,2) not null default 0,
  casino_win      numeric(14,2) not null default 0,
  sports_stake    numeric(14,2) not null default 0,
  sports_win      numeric(14,2) not null default 0,
  net_loss        numeric(14,2) not null,           -- kwacha, ≥ 0
  cashback_kwacha numeric(14,2) not null,           -- 5% of net_loss
  emeralds        integer       not null default 0, -- the gems paid (0 unless awarded)
  rubies          integer       not null default 0,
  diamonds        integer       not null default 0,
  status          text          not null check (status in ('awarded', 'below_minimum', 'not_eligible', 'no_loss')),
  created_at      timestamptz   not null default now(),
  primary key (user_id, window_day)
);

create index if not exists cashback_daily_window on public.cashback_daily (window_day);

alter table public.cashback_daily enable row level security;
revoke all on public.cashback_daily from anon, authenticated;
