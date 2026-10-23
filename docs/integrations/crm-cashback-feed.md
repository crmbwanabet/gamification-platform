# CRM → Bonus Center: daily cashback feed

**Status:** the Bonus Center side is LIVE and waiting (2026-10-23). Until the CRM serves this endpoint, the cron gets a 404 and pays nothing.

## What it is for

Every player gets **5% of their real-money net loss** on bwanabet back as prize gems, once a day:

- **Window:** one UTC day, `00:00Z` → `00:00Z` (02:00 → 02:00 Lusaka), named by its UTC date: window `2026-10-24` = `2026-10-24T00:00:00Z` → `2026-10-25T00:00:00Z`. Agreed with the CRM session on 2026-10-23: the warehouse has casino totals only per player per UTC day, so the owner's first idea of a 06:00 cut was not possible. The owner chose this window, with the gems going out from **06:00 Lusaka** the next morning.
- **Net loss** = real-money stakes − real-money winnings, casino + sports added together. A player who won overall gets nothing. Bonus money (free bets, bonus balance) is excluded on both sides.
- **Paid in gems** (emerald 200,000 coins = K20, ruby 500,000 = K50, diamond 1,000,000 = K100 at 10,000 coins = K1): biggest gems first, the last part rounded to the nearest emerald. A K200 loss (K10 back) is the smallest that pays: 1 emerald.

The Bonus Center does the 5%, the rounding and the payout. The CRM only reports the totals per player per window.

## The endpoint the CRM serves

```
GET {CRM_URL}/api/player-cashback?window=2026-10-23&limit=1000[&after_user=<id>]
x-api-key: <GAMIFICATION_API_KEY>        (the same key as /api/player-daily)
```

Response:

```json
{
  "window": "2026-10-23",
  "complete": true,
  "rows": [
    { "user_id": 207978, "casino_stake": 1250.00, "casino_win": 980.50, "sports_stake": 300.00, "sports_win": 0 }
  ],
  "next_after_user": "207978"
}
```

- **`window`**: echo of the requested window. Any other value makes us reject the page.
- **`complete`**: `true` only when every source has loaded data up to the window's END (00:00 UTC the next day) plus a safety margin: casino AND sports settlements. The CRM expects this around 00:30 UTC. We first ask at 04:00 UTC (06:00 Lusaka, the pay time), and while it is `false` we retry every 10 minutes and pay nothing for that window.
- **Served from** `https://bwanabet-crm-overview.vercel.app` after the CRM database move of 2026-10-24 (our `CRM_URL` env switches to it).
- **`rows`**: one row per player who had real-money activity in the window. Rows where winnings exceed stakes may be sent or left out. Amounts are kwacha with up to 2 decimals, as numbers or numeric strings, all four required and ≥ 0.
  - `casino_stake` / `casino_win`: real-money casino bets and their winnings for rounds that **settled** inside the window.
  - `sports_stake` / `sports_win`: real-money slips that **settled** inside the window: stake, and the amount returned (0 for a lost slip, the payout for a won one, the cash-out amount for a cashed-out one). Voided slips are left out entirely (stake and return both 0).
- **Paging**: ordered by `user_id`, at most `limit` rows. `next_after_user` = the last `user_id` on the page when more rows follow, `null` on the last page. We pass it back as `after_user`.
- **Errors**: 401 for a bad key, 400 for a bad window. Anything other than 200 makes us retry on the next run.

## What the Bonus Center does with it

`app/api/cron/cashback` (Vercel Cron every 10 min, `lib/cashback/crmCashback.mjs`):

1. From 06:00 Lusaka (04:00 UTC) after a window, finds the oldest unpaid window whose pay time has come. On the very first run it pays only the latest one, with no back pay.
2. Pages through the CRM rows once `complete` is true.
3. Keeps only players whose **reward anchor** (first daily-reward claim in the Bonus Center, its Lusaka day) is on or before the window day. A player who never opened the Bonus Center gets no cashback.
4. Writes ONE `cashback_awards` row per player per window (primary key). Re-runs never pay twice, and a later CRM correction does not change a window that is already paid.
5. The player sees a "Your cashback" pop-up on their next Bonus Center open; Collect credits the gems (`POST /api/cashback` marks the row collected once).
