# Daily casino-round missions (CRM feed) + streak bonuses removed

Date: 2026-10-07. Status: built. The `casino_activity` migration must be applied before the feed goes live.

## Decisions (user)

- Missions are exactly four **daily** missions, replacing all earlier ones:

  | id | Name | Casino rounds today | Reward |
  |---|---|---|---|
  | `casino_starter` | Casino Starter | 20 | 50 coins |
  | `casino_regular` | Casino Regular | 50 | 100 coins |
  | `casino_pro` | Casino Pro | 100 | 500 coins |
  | `casino_legend` | Casino Legend | 200 | 1000 coins |

- "Slots and casino are the same thing", so there is ONE counter: casino rounds played on bwanabet.com today. All four missions progress off that counter. Each mission can be claimed once per day once it is reached. Missions reset at midnight **Africa/Lusaka** (UTC+2, no DST).
- The old missions (daily pool, weekly, permanent) are parked in `parked/lib/data/missions.legacy.js`. Old progress keys stay in saved state.
- Logged in = daily reward ready. Only players with a bwanabet SSO session can claim the daily reward.
- Streak **bonuses** are removed. A week of daily rewards pays exactly 6 × 10 + 100 = 160 coins. The streak counter remains, and it drives day 1→7.

## Data flow

```
CRM ──POST /api/activity/casino-rounds (Bearer CASINO_FEED_SECRET)──▶ casino_activity
                                                                         │
widget ──GET /api/missions/progress (Bearer <bwanabet SSO token>)───────┘ → { day, rounds, updatedAt }
```

- **Ingest** (`app/api/activity/casino-rounds/route.js`):
  - Shared secret, compared as SHA-256 digests with `timingSafeEqual`. The endpoint is disabled (503) while the secret is unset or shorter than 16 characters.
  - Rate-limited to 120 requests per minute per IP. The body may be at most 256 KB.
  - `validateCasinoBatch` checks: at most 1000 rows; `userId` is a positive integer (normalized like the SSO routes, `String(Number(id))`); `date` is a real `YYYY-MM-DD` within ±2 days of the Lusaka date; `rounds` is an integer from 0 to 100000. Invalid rows are skipped and reported by index. If every row is invalid, the response is 400.
  - `collapseBatch` deduplicates the batch. Rows are then written through the `upsert_casino_rounds(jsonb)` SQL function: `insert … on conflict do update set rounds = greatest(stored, incoming)`, which is atomic.
  - If that function is missing, the route falls back to read → `mergeWithStored` → upsert.
  - CRM-facing contract: `docs/integrations/crm-casino-rounds-feed.md`.
- **Table** `casino_activity (user_id text, day date, rounds int ≥ 0, updated_at timestamptz, pk (user_id, day))`:
  - RLS is enabled with no policies, and the function is granted to `service_role` only.
  - Migration: `lib/supabase/migrations/2026-10-07-casino-activity.sql`. The table is also documented at the end of `lib/supabase/schema.sql`.
- **Progress** (`app/api/missions/progress/route.js`):
  - The uid comes from `authedUid` (`lib/auth/ssoUid.js`), the same rule as `/api/purchase`, so a client-supplied id is never used.
  - Rate-limited to 20 requests per minute per uid and 120 per minute per IP.
  - No row → `rounds: 0, updatedAt: null`. Database error (for example, the table is not migrated) → 503 `unavailable`.

## Client

- `SessionProvider.getCasinoProgress()` returns `{ status, data }`.
- `GamificationPlatform` fetches progress on widget open (once the session resolves), on every Missions-tab visit, and every 60s while that tab is visible.
- `casinoMissionStates(missions, { rounds, progressDay, today, claims })` drives the Missions tab, the Home teaser, the modal and the badges. Rounds reported for a past day count as 0.
- Claim (`claimCasinoMission`):
  1. Re-fetches the server count.
  2. Calls `recordClaim`. It refuses locked missions, unknown ids, and missions already claimed that day.
  3. Credits the reward client-side, like every other reward. It writes `user.casinoMissionClaims = { day, ids }`, fires `mission_completed`, and plays `triggerReward('medium')`.

  A ref guards against two claims in the same tick.
- UI copy:
  - progress bars read "37 / 50 rounds"
  - rewards read "50 coins"
  - no feed data: "Play casino on bwanabet.com — progress updates every few minutes"
  - no SSO session: "Log in on bwanabet.com to track missions"
- Nav badges:
  - Missions = the number of missions that can be claimed now
  - Home = the daily reward is unclaimed and the player is logged in
- Remote config: `mission_overrides` is keyed by the four casino ids (`enabled`, `target`, `reward`, `xp`). `/api/admin/catalog` lists them in the `daily` pool.

## Login gating

`loggedIn = session.status === 'ready' && session.profile`. This is the same session that store purchases and state saves use. `claimDailyReward` and `claimCasinoMission` refuse anonymous players with "Log in on bwanabet.com to claim". The daily-reward panel then shows a locked "Log in on bwanabet.com to claim" pill instead of the Claim button.

No new dev bypass was added. Locally, open `/?widget=1#token=<any unsigned JWT with an id>` with `SSO_ALLOW_UNVERIFIED=true` in `.env.local`, which is the existing SSO dev path. In Playwright, mock `/api/session` and `/api/missions/progress`.

## Trust boundary (unchanged posture)

Progress is server-held and comes from the CRM. Claims and credits are client-side, like every other reward, and `/api/state` saves remain client-authoritative. While production runs with `SSO_ALLOW_UNVERIFIED=true`, anyone who forges a token with someone else's id can read that player's daily round count. That is the same exposure `/api/session` and `GET /api/purchase` already have.

## Tests

- `tests/casino-feed.test.mjs`: Lusaka day around 22:00 UTC and at month/year ends; date/user-id/rounds validation; batch limits; max-wins merge and idempotency.
- `tests/casino-missions.test.mjs`: progress, claimable thresholds, claimed-today, daily reset, overrides.
- `tests/merge.test.mjs`: `streak_rewards` rows are ignored, and casino `mission_overrides` pass through.
- `tests/daily-rewards.test.mjs`: a week pays 160 coins.
