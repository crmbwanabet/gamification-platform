# Gem currencies + kwacha redemptions (2026-10-07)

## User decisions

The platform is not live yet, so there are no real balances to preserve.

1. **1,000 coins = K1.** Kwacha is real money. Admins credit it to the player's bwanabet account. The rate lives in remote config `economy.coinsPerKwacha`: default 1000, a positive integer ≤ 1,000,000.
2. **Three prize gems replace the old gems and diamonds:**

   | Gem | Value in coins | Value in kwacha |
   |---|---|---|
   | Emerald | 5,000 | K5 |
   | Ruby | 10,000 | K10 |
   | Diamond | 20,000 | K20 |

   The values live in `economy.gemValues = { emerald, ruby, diamond }`, in coins, so the kwacha value derives from coinsPerKwacha. **Gems are won as prizes only.** Nothing sells them, and coins never convert into them.
3. **"Redeem in the store" works at that rate:**
   - K1, K5, K10, K20 and K50 paid in coins;
   - 1 Emerald → K5, 1 Ruby → K10, 1 Diamond → K20, each paid with the gem.

## Currencies and state keys

| Currency | State key | Notes |
|---|---|---|
| Coins | `kwacha` | Legacy key name. It has always meant coins. |
| Emeralds | `emeralds` | New. |
| Rubies | `rubies` | New. |
| Diamonds | `diamonds` | **Reused** key name. |
| (retired) gems | `gems` | Held at 0, never read. |

**Decision: reuse `diamonds`, and add a reset marker `currencyVersion: 2`.**

The alternative was a new key such as `diamondGems`. That would leave a dead `diamonds` key that every reader has to remember to ignore. With the marker, one rule covers all three places that read balances:

> a state blob without `currencyVersion: 2` predates the gem economy. Its gems, old diamonds, emeralds and rubies count as **0**.

That rule is applied in:

- **the client**: `migrateCurrencyState` runs on SSO hydration;
- **`/api/state`**: incoming blobs are migrated before saving, so a stale bundle still open in a tab cannot write a legacy diamond back;
- **the `purchase_item` RPC**: it treats gem balances as 0 unless the marker is present.

The migration also resets every profile, setting gems, emeralds, rubies and diamonds to 0 and stamping the marker. An old test balance can therefore never become a K20 diamond.

In the purchase history, old `price_diamonds` move to `legacy_price_diamonds`, so the refund of a rejected old purchase can never pay out a new diamond. `price_gems` is never refunded.

## Reward paths

All reward rows have the shape `{ kwacha, emeralds, rubies, diamonds }`. The following paths support all of these currencies:

- mission claims;
- level-ups;
- daily rewards;
- `triggerReward`, which produces the floats ("+1 emerald") and the fly-to-header SVG trail into `.currency-emerald-target`, `.currency-ruby-target` and `.currency-diamond-target`;
- notifications;
- `CurrencyAmounts` chips;
- the level-up modal;
- the mission modal.

`cleanReward` keeps only the live currencies, as whole positive numbers. Mission overrides merge one currency at a time: an integer of 0 or more applies, and 0 removes that currency.

**No default source pays gems.** `LEVEL_REWARDS` is now coins only; it used to grant gems and diamonds. The dashboard attaches gem prizes through:

- `mission_overrides` rewards;
- `level_rewards`;
- `daily_rewards`.

The migration strips any `gems` and `diamonds` keys from stored rows of those three config keys.

## Redemptions: one purchase pipeline

Each redemption is an ordinary `store_items` row with `redeem_currency` (`coins`, `emeralds`, `rubies` or `diamonds`) and `redeem_amount`. For coin packs the amount is in kwacha; for gems it is the number of gems. The migration seeds 8 rows, using a partial unique index on `(redeem_currency, redeem_amount)`, so re-running it is idempotent.

The price and payout are **derived** in two places:

- **For display**: `/api/config` calls `buildStoreCatalog` from `lib/store/catalog.mjs` with the merged economy.
- **For the charge**: `purchase_item` reads the `economy` row and applies the same validation.

The formulas are:

- coin pack: price = K × coinsPerKwacha coins, and payout = K;
- gem: price = n gems, and payout = n × gemValue / coinsPerKwacha, rounded to ngwee.

A dashboard rate change reprices every redemption at once.

The rest of the pipeline is unchanged:

1. `POST /api/purchase` (with `parsePurchaseBody`);
2. the `purchase_item` RPC verifies and deducts the server-held balance, atomically with the stock decrement;
3. the server sends a Telegram message with the ✅ credit button;
4. the webhook or the CRM Fulfillment credits or rejects the purchase;
5. a rejection refunds the exact currencies, exactly once (`refundTotals` + `refundedPurchaseIds`).

The client deducts what the server row says it charged (`paidFromPurchase`).

**Stock:** unlimited (`NULL`). The balance check and the weekly cap bound the exposure.

**Weekly cap:** kept, because redemptions are `is_money`. A player can buy ONE money item per rolling 7 days, across every redemption and money prize. Rejected purchases do not count.

**Two-tap confirm:** real money moves, so the first tap shows "Confirm K5?" and a second tap within 4 s sends the redemption.

**Telegram message format:**

```
💵 Kwacha redemption #a1b2c3d4
Credit K5 bwanabet bonus to player 123456 — paid 5,000 coins
```

A gem redemption ends with "— paid 1 Emerald" instead. Other items keep the existing layout (Player / Item / Paid, plus the money-prize line), with gem prices worded like "1 Emerald" or "2 Rubies".

**Dashboard-stocked items** keep working. They can be priced in coins and/or any of the 3 gems (`price_emeralds`, `price_rubies`, `price_diamonds`). Items still priced in `price_gems` are deactivated by the migration, dropped from the catalog, and refused by the RPC.

## UI

The UI is built mobile-first at 360×640.

- **Header**: a wallet pill showing coins plus the three SVG gems (`public/ui/gems/{emerald,ruby,diamond}.svg`). Below 520 px it takes its own full-width row.
- **Wallet sheet**: tapping the pill opens a sheet with one row per currency ("1 Emerald · worth K5") and the total value in kwacha.
- **Store, "Redeem for kwacha"**:
  - a "You have 3,400 coins" bar showing the rate;
  - coin-pack cards, disabled when unaffordable and showing "{N} coins short";
  - gem cards showing "You have {N} emeralds";
  - the existing "Rewards Store" grid below.
- **Profile modal**: shows coins and the three gems.

## Deploy order

**Apply the migration first, then push.** If the steps happen out of order, the system degrades but stays safe:

- **New code, old database:**
  - the `/api/config` store select fails, so the store shows empty;
  - the `/api/state` update retries without the missing `emeralds` and `rubies` columns;
  - the purchase history select fails, so refunds wait for the next session.
- **Old code, new database:** the old store shows redemption rows, but the RPC charges by the new rules, and unmarked or old-bundle states hold 0 gems. No money moves without the balance.

## Admin dashboard (separate repo)

`/api/admin/catalog` now lists the economy knobs, their bounds, the reward keys and the redemption set. The dashboard should:

- edit `economy.coinsPerKwacha` and `economy.gemValues`;
- offer `emeralds`, `rubies` and `diamonds` in its reward editors, and stop offering `gems`;
- add `price_emeralds` and `price_rubies` to the store editor, and drop `price_gems`;
- show `payout_kwacha` and the new price columns in the Fulfillment queue.
