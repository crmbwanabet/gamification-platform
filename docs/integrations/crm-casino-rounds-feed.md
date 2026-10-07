# CRM → 100xBet: casino rounds feed

This page is for the bwanabet CRM developers. It describes how to send each player's daily count of casino rounds to the 100xBet gamification platform. The count drives four daily missions: 20, 50, 100 and 200 casino rounds in a day. Slots count as casino rounds, so there is one counter.

## Endpoint

```
POST https://100xbet-gamification.vercel.app/api/activity/casino-rounds
Content-Type: application/json
Authorization: Bearer <CASINO_FEED_SECRET>
```

- **Auth:** a shared secret that we give you through a secure channel. Send it as a Bearer token. It is compared in constant time. Keep it server-side and never ship it to a browser or app.
- **Disabled state:** while no secret is configured on our side, every call returns `503 feed_disabled`.

## Payload

The body is a JSON array (a batch) of up to **1,000 rows**, with a maximum body size of 256 KB. `{ "rows": [ ... ] }` is also accepted.

```json
[
  { "userId": "123456", "date": "2026-10-07", "rounds": 37 },
  { "userId": 789012,   "date": "2026-10-07", "rounds": 212 }
]
```

| Field | Type | Rules |
|---|---|---|
| `userId` | string or integer | The bwanabet user id (the `id` in the bwanabet login token). A positive integer, digits only. Leading zeros are ignored. |
| `date` | string `YYYY-MM-DD` | The **Africa/Lusaka** calendar date (CAT, UTC+2, no daylight saving). It must be within **±2 days** of today in Lusaka. |
| `rounds` | integer | The **total** casino rounds the player played on that date. Range 0 to 100,000. |

## Semantics: absolute totals, idempotent

- Send the **running total for the day**, not the rounds since your last call. A player who has played 37 rounds today is `rounds: 37`. After 10 more rounds, send `47`.
- The stored value is the **maximum** of what we already have and what you send. This means:
  - Re-sending the same day's total is always safe, so you can retry freely after timeouts.
  - A lower total never lowers the stored count. Out-of-order or late batches can't undo progress.
  - Corrections downwards are not possible through the feed. Contact us if you need one.
- If one batch contains the same player and date twice, the higher value is kept.
- Days are separate. At 00:00 Lusaka time (22:00 UTC) a new day starts and the missions reset. Send the new date's totals from then on. Late updates for yesterday (within ±2 days) are still accepted.

## Cadence

Every **5–15 minutes**, send the totals for every player whose count changed since your last send. You can also send all of today's active players each time. Players see "progress updates every few minutes" in the app.

Shortly after midnight Lusaka time, send one last update for the previous date, so that rounds played just before midnight are counted on the right day.

If you have more than 1,000 players to send, split them into several requests. The rate limit is about 120 requests per minute per source IP.

## Example

```bash
curl -X POST https://100xbet-gamification.vercel.app/api/activity/casino-rounds \
  -H "Authorization: Bearer $CASINO_FEED_SECRET" \
  -H "Content-Type: application/json" \
  -d '[{"userId":"123456","date":"2026-10-07","rounds":37},{"userId":"789012","date":"2026-10-07","rounds":212}]'
```

## Responses

**200 OK**: the valid rows were stored. Rows that failed validation are skipped and listed by their index in your array.

```json
{ "ok": true, "accepted": 2, "stored": 2, "rejected": [] }
```

```json
{ "ok": true, "accepted": 1, "stored": 1, "rejected": [{ "index": 1, "error": "date_out_of_range" }] }
```

`accepted` = valid rows received. `stored` = distinct player/date pairs written.

| Status | `error` | Meaning |
|---|---|---|
| 400 | `bad_json` | The body is not valid JSON. |
| 400 | `not_an_array` | The body is not an array (or `{ rows: [...] }`). |
| 400 | `empty_batch` | The array is empty. |
| 400 | `no_valid_rows` | Every row failed validation. The body includes `rejected`. |
| 401 | `unauthorized` | The Bearer secret is missing or wrong. |
| 405 | `method_not_allowed` | You used something other than POST. |
| 413 | `batch_too_large` | There are more than 1,000 rows. Split the batch. |
| 413 | `payload_too_large` | The body is over 256 KB. |
| 429 | `slow_down` | Rate limited. Retry after a short pause. |
| 500 | `db_error` | A storage error. Retry later (retries are safe). |
| 503 | `feed_disabled` / `not_configured` | The feed is not enabled on our side. |

Per-row `rejected[].error` values:

| `error` | Meaning |
|---|---|
| `not_an_object` | The row is not a JSON object. |
| `bad_user_id` | `userId` is not a positive integer. |
| `bad_date` | `date` is not a real `YYYY-MM-DD` date. |
| `date_out_of_range` | `date` is more than 2 days from today in Lusaka. |
| `bad_rounds` | `rounds` is not an integer from 0 to 100,000. |

## What the player sees

Players open the 100xBet widget while logged in on bwanabet. They see today's casino rounds and four missions:

| Mission | Rounds today | Reward |
|---|---|---|
| Casino Starter | 20 | 50 coins |
| Casino Regular | 50 | 100 coins |
| Casino Pro | 100 | 500 coins |
| Casino Legend | 200 | 1,000 coins |

Each mission can be claimed once per Lusaka day. Players whose id never appears in the feed see 0 rounds.
