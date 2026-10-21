-- Reward anchor (2026-10-21): a player earns nothing for bwanabet activity
-- before their FIRST DAILY REWARD claim in the Bonus Center (lib/season/anchor.mjs).
-- profiles.first_login_at is the first claim of ANY reward (story prize,
-- comeback, missions ... count too), so the daily claim gets its own column.
-- Set once by POST /api/track (first 'daily_claimed' event) and, as a fallback
-- for a dropped beacon, by POST /api/state when the saved blob shows a claim.

alter table public.profiles add column if not exists first_daily_at timestamptz;

-- Backfill from the earliest verified daily_claimed event per player.
update public.profiles p
   set first_daily_at = e.first_at
  from (
    select uid, min(created_at) as first_at
      from public.activity_events
     where type = 'daily_claimed' and verified
     group by uid
  ) e
 where e.uid = p.bwanabet_user_id::text
   and p.first_daily_at is null;
