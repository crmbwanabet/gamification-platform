# CRM → 100xBet: player activity feed

This page is for the bwanabet CRM / Playmaster developers. It describes how to send each player's daily real-money activity to the 100xBet gamification platform. The totals drive the player's Season XP: Vuma Katongo's story stages, weekly league matches, the World Cup with Zambia and its K10,000 prize.

It sits next to the casino-rounds feed (`crm-casino-rounds-feed.md`). Both feeds have the same shape and rules. Keep sending both.

## Endpoint

```
POST https://100xbet-gamification.vercel.app/api/activity/player-daily
Content-Type: application/json
Authorization: Bearer <PLAYER_FEED_SECRET>
```

- **Auth:** a shared secret that we give you through a secure channel (until a separate one is issued, the casino-rounds secret works here too). Send it as a Bearer token. It is compared in constant time. Keep it server-side.
- **Disabled state:** while no secret is configured on our side, every call returns `503 feed_disabled`.

## Payload

A JSON array of up to **1,000 rows** (or `{ "rows": [ ... ] }`), at most 256 KB.

```json
[
  { "userId": "123456", "date": "2026-10-09", "depositsAmount": 200, "depositsCount": 1, "withdrawalsAmount": 0,
    "casinoStake": 350.50, "casinoRounds": 140, "sportsStake": 80, "sportsSlips": 3 }
]
```

| Field | Type | Meaning |
|---|---|---|
| `userId` | string or integer | The bwanabet user id (the `id` in the login token). Positive integer. |
| `date` | `YYYY-MM-DD` | The **Africa/Lusaka** calendar date (UTC+2). Within **±2 days** of today in Lusaka. |
| `depositsAmount` | number (K) | Total deposited that day. |
| `depositsCount` | integer | Number of deposits that day. |
| `withdrawalsAmount` | number (K) | Total withdrawn that day. |
| `casinoStake` | number (K) | Total **real-money** casino stake that day (slots count as casino). **Bonus money excluded.** |
| `casinoRounds` | integer | Casino rounds that day (same number as the casino-rounds feed). |
| `sportsStake` | number (K) | Total stake of sports slips **settled** that day that are **real money** (not bonus/freebet) with **total odds ≥ 1.5**. Voided slips and cashed-out slips are **excluded**. |
| `sportsSlips` | integer | Number of slips counted in `sportsStake`. |

Amounts are kwacha with up to 2 decimals (numbers or numeric strings). A missing field counts as 0. A present but invalid field rejects that row.

Sports slips count on the day they **settle**, not the day they are placed.

## Semantics: absolute totals, max-wins

- Send the **running total for the day** for every field, never a delta.
- Each stored column keeps the **maximum** of what we have and what you send. Re-sending is always safe; a lower value never lowers a stored one. Corrections downwards are not possible through the feed — contact us.
- Days are separate. After 00:00 Lusaka (22:00 UTC) send the new date. Send one last update for the previous date shortly after midnight.

## Cadence

Every **5–15 minutes**, send the rows of every player whose totals changed. Players see "your matches update every few minutes". Rate limit about 120 requests per minute per IP; split batches over 1,000 rows.

## Responses

Same as the casino-rounds feed: `200 { ok, accepted, stored, rejected: [{ index, error }] }`; `400 bad_json | not_an_array | empty_batch | no_valid_rows`; `401 unauthorized`; `413 batch_too_large | payload_too_large`; `429 slow_down`; `503 feed_disabled | not_configured`; `500 db_error` (retry).

Row errors: `not_an_object`, `bad_user_id`, `bad_date`, `date_out_of_range`, `bad_<field>` (e.g. `bad_casinoStake`), `no_fields`.

## How we use it (for reference)

Per Lusaka day: 1 XP per K10 casino stake, 1 XP per K4 settled sports stake, +30 XP on a deposit day (not on a day that only deposits and withdraws without staking). Caps: 400 XP a day, 2,000 a week. The World Cup prize is verified server-side from these rows before anyone is paid.
