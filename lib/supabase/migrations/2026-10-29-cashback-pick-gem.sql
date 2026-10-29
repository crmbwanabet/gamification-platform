-- CASHBACK "CHOOSE REWARD" (owner 2026-10-29). Service-role only.
--
-- The pop-up has two steps: Coins, or Gems and then WHICH gem. All the windows
-- waiting are collected together (POST /api/cashback { windows, take }): the
-- reward value (what the awarded gems are worth) is paid as coins, or as the
-- picked gem with the rest in coins. taken_as now also holds the picked gem,
-- and `paid` records what the collection paid ({coins, emeralds, rubies,
-- diamonds}) on its OLDEST window (the other windows of that collection keep
-- paid null, so summing `paid` over rows is right).

alter table public.cashback_awards drop constraint if exists cashback_awards_taken_as_check;
alter table public.cashback_awards add constraint cashback_awards_taken_as_check
  check (taken_as in ('gems', 'coins', 'emeralds', 'rubies', 'diamonds'));
alter table public.cashback_awards add column if not exists paid jsonb;
