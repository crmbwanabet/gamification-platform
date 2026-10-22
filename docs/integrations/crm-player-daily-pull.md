# CRM player-daily pull (hourly import)

Built 2026-10-21 on branch `feat/crm-player-daily-pull`. The Bonus Center
pulls the CRM's per-player daily totals every hour into `player_activity`,
which drives the Season XP, side quest, league, World Cup, the sports/deposit
missions, the comeback check and the weekly league table.

**The pull is the source of truth.** The older push route
`POST /api/activity/player-daily` (max-wins, Lusaka day) still works, but the
CRM should not use both: a push writes `greatest(stored, pushed)`, which would
undo a lowered total from the pull, and its rows are keyed by Lusaka day while
the pull's are UTC days.

## How it works

- CRM side (owned by the CRM repo `crmbwanabet/bwanabet-crm`, spec
  `docs/superpowers/specs/2026-10-21-player-daily-feed.md`):
  `GET {CRM_URL}/api/player-daily?since=&after_user=&after_day=&limit=` with
  header `x-api-key`. Rows ordered by `(synced_at, user_id, day)`; `next` is the
  keyset cursor, `null` on the last page. The CRM sync runs hourly at :20 and
  rewrites today + the 2 days before (UTC); a row only gets a new `synced_at`
  when its values changed. The CRM keeps 60 days.
- Our side:
  - `lib/season/crmPull.mjs` (pure): validates + maps each feed row
    (`mapFeedRow`: bwanabet id digits, real `YYYY-MM-DD` day within 62 days back
    / 1 day ahead of the UTC date, every amount ≥ 0 and ≤ 1e9 rounded to the
    ngwee, every count a whole number ≥ 0, `synced_at` an ISO time), keeps the
    last row per (user, day) in a page, builds the cursor (`next`, else the last
    raw row of a short page, so a bad row never stalls the pull), pages with
    `pullFeed` (fetch injected).
  - `lib/season/crmPullJob.mjs` (`runCrmPull`): one run: read the cursor, pull
    pages of 1,000, write each page, save the cursor after each committed page,
    stop after a 240 s budget (the route's `maxDuration` is 300 s) and resume
    next run.
  - `app/api/cron/crm-pull/route.js`: `GET` or `POST`, `Authorization: Bearer
    <CRON_SECRET>` (SHA-256 + timingSafeEqual, like the feed routes). Returns
    `{ ok, status, pages, fetched, written, rejected, more, from, to, ms }`.
    Status: `done` | `time_up` / `max_pages` (more to come, 200) | `disabled`
    (no API key, 200, nothing fetched) | `crm_error` (502) | `db_error` (500) |
    `busy` (409, a run is already going on this instance). 503 `cron_disabled`
    while `CRON_SECRET` is unset.
  - Database (migration `lib/supabase/migrations/2026-10-21-crm-pull.sql`,
    APPLIED 2026-10-21 to hhdqeihdqqqdrbhvmeuj):
    - `replace_player_activity(jsonb)`: OVERWRITE upsert per (user_id, day)
      (totals can go DOWN: voided/resettled slips, reversals). Writes only when
      the incoming `crm_synced_at` is at least as new as the stored one, so an
      overlapping slower run never restores older totals. Service role only.
    - `player_activity.crm_synced_at` (new column; NULL = row from the push).
    - `feed_cursors (name pk, since, after_user, after_day, last_run, updated_at)`,
      row `crm_player_daily`. `since` is the CRM's exact text. `last_run` = the
      last run's counts (no secrets). RLS on, no anon/authenticated grants.
- Errors: a CRM failure stops the run and keeps everything already committed;
  nothing is ever deleted. A DB failure stops before that page's cursor is
  saved, so the page is re-read next time (overwrite = harmless).
- `day` is the CRM's **UTC day** (02:00 to 02:00 Lusaka), stored as-is. The
  rest of the app treats `day` as a Lusaka day; the 2-hour skew is accepted.

## Environment (Vercel, production)

| Name | Value |
|------|-------|
| `GAMIFICATION_API_KEY` | the CRM's shared key (owner sets it; never log it, never commit it). Unset = the job is a no-op with `status: "disabled"`. |
| `CRM_URL` | `https://bwanabet-crm-next.vercel.app` (default when unset). Change it to `https://bwanabet-crm-overview.vercel.app` when the CRM moves. |
| `CRON_SECRET` | random secret, ≥ 16 chars; the scheduler sends it as `Authorization: Bearer`. |

## Schedule (NOT enabled yet: enable after the branch is merged and deployed)

The Vercel project is on **Pro**, and Supabase has `pg_cron`, `pg_net` and
Vault available (pg_cron/pg_net not installed yet). Preferred: Supabase
pg_cron at :35 every hour (the CRM finishes by ~:25).

Run this in the Supabase SQL editor of project `hhdqeihdqqqdrbhvmeuj` after the
merge. Paste the real `CRON_SECRET` (from `vercel env pull`) in place of the
placeholder in the SQL editor only, never in a file or chat:

```sql
create extension if not exists pg_cron;
create extension if not exists pg_net;

select vault.create_secret('<CRON_SECRET>', 'crm_pull_cron_secret', 'Bearer for /api/cron/crm-pull');

select cron.schedule(
  'crm-player-daily-pull',
  '35 * * * *',
  $$
  select net.http_post(
    url := 'https://bonus.bwanabet.dev/api/cron/crm-pull',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'crm_pull_cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 300000
  );
  $$
);
```

Check it: `select * from cron.job_run_details order by start_time desc limit 5;`,
`select id, status_code, content from net._http_response order by created desc limit 5;`
and `select since, last_run, updated_at from public.feed_cursors;`.
Pause it: `select cron.unschedule('crm-player-daily-pull');`.
Rotate the secret: `select vault.update_secret((select id from vault.secrets where name = 'crm_pull_cron_secret'), '<new>');`
after changing `CRON_SECRET` on Vercel.

Alternative (no Supabase extensions): Vercel Cron, since the project is on Pro.
Add to `vercel.json` and merge; Vercel sends `CRON_SECRET` by itself. Use ONE
scheduler, never both.

```json
"crons": [{ "path": "/api/cron/crm-pull", "schedule": "35 * * * *" }]
```

### First run

The first pull has no cursor and reads everything the CRM holds (up to 60
days, ~20k rows for 3 days today, more later). Each run does up to ~240 s and
resumes from the saved cursor, so a big backfill just takes a few runs. To
start it by hand after the deploy (from a shell with the secret in an env var,
not typed into chat):
`curl -s -X POST -H "Authorization: Bearer $CRON_SECRET" https://bonus.bwanabet.dev/api/cron/crm-pull`.
Re-run it until `more` is false.

To re-import from scratch: `delete from public.feed_cursors where name = 'crm_player_daily';`
(the next run re-reads all 60 days and overwrites).

## Live setup (2026-10-21)

The schedule in use is **Vercel Cron** (`vercel.json`, `6-56/10 * * * *`: every 10 minutes at :06 :16 :26 :36 :46 :56, since 2026-10-22). The CRM pushes TODAY every 10 minutes at :03/:13/... (crm-ec2 unit `crm-next-sync-player-daily-today`, `node sync/player-daily.js --days 0`, ~7 s) plus the full today + 2 days run hourly at :20 (~35 s), so each of our runs lands about 3 minutes after the CRM's. ClickHouse itself loads casino every 5 minutes, transactions hourly at :06 and sport hourly at :51 (checked 2026-10-22), so casino play reaches players in about 5–15 minutes, deposits and sports within about an hour. Do not also enable the pg_cron job below. `CRM_URL`, `GAMIFICATION_API_KEY` and `CRON_SECRET` are set on Vercel production.
