# Season: XP from real play, side hustle, league, World Cup (2026-10-09)

User-approved design. Every number lives in `lib/season/config.mjs` (`SEASON_DEFAULTS`) and can be
overridden through the remote-config row **`season`** (validated + clamped by `cleanSeasonConfig`,
applied in `lib/config/merge.mjs`). Stage thresholds live in `lib/vuma/stages.mjs`.

## 1. Data feed (CRM / Playmaster → us)

`POST /api/activity/player-daily`, Bearer `PLAYER_FEED_SECRET` (falls back to `CASINO_FEED_SECRET`),
same validation / ±2 Lusaka days / batch ≤ 1000 / 256 KB / rate limit as the casino-rounds feed.
Rows are ABSOLUTE daily totals per player per Lusaka day, merged **max-wins per column**
(`upsert_player_activity(jsonb)`), so resends are idempotent.

Table `player_activity (user_id, day, deposits_amount, deposits_count, withdrawals_amount,
casino_stake, casino_rounds, sports_stake, sports_slips, updated_at)`, PK `(user_id, day)`,
service-role only. Amounts in kwacha. Contract (CRM doc: `docs/integrations/crm-player-activity-feed.md`):
sports = settled, real-money slips with total odds ≥ 1.5 (voids, cash-outs, bonus stakes excluded);
casino_stake = real-money stake only.

`GET /api/season` (SSO identity, never a client id) → `{ day, days: [row…] (≤ 400, ascending), prize }`;
503 when the table is missing.

## 2. XP engine (`lib/season/xp.mjs`, pure, deterministic)

Per Lusaka day:

| Part | Rule |
|---|---|
| CRM XP | `floor(casino_stake/10) + floor(sports_stake/4) + (deposits_count > 0 ? 30 : 0)`; the deposit 30 is skipped when `withdrawals_amount ≥ deposits_amount` and no casino/sports stake that day |
| Platform XP | daily claim 20 + game rounds (1/coin) + casino missions 10/15/20/30 + casino rounds (1/round, **dropped on days with a player_activity row**), total capped **60/day** |
| Daily cap | 400 XP (CRM + platform) |
| Weekly cap | 2,000 XP per Lusaka week (Mon–Sun) |

Everything above a cap is **overflow** (feeds the hustle), never XP. Season XP = sum of capped daily XP.
The client stores its platform XP per day in `user.xpDays` (`{ day: { daily, games, missions, casino } }`,
latest 400 days) and merges it with the server rows. `user.xp` is now DERIVED (mirrored for saves).

Stages (XP): 0, 50, 300, 800, 1,600, 3,000, 4,800, 7,000, 9,600, 12,600, 16,000, 19,800, 24,000,
28,600, 33,600, 39,000, 50,000. Stage-up coin rewards unchanged.

## 3. Side hustle (`lib/season/hustle.mjs`)

Unlocks at stage 2. Stock = cumulative overflow XP. Levels: 1 Washing cars in the compound (0),
2 Kantemba (1,000), 3 Vuma's Car Wash (3,000), 4 Minibus (7,000), 5 Vuma Mart (15,000).
Pay 20 / 50 / 100 / 200 / 400 coins per Lusaka day (rate = level reached by that day), collected in
the widget; uncollected pay accrues for at most 2 days ("the shop was closed"). State
`user.hustle = { lastCollectDay, collected }`. Art `/vuma/hustle-1..5.jpg` (fallback panel if missing).

## 4. League (`lib/season/league.mjs`)

From the week (Mon–Sun) the player reaches stage 6, forever (runs alongside the World Cup). One match a
week vs a synonym-parody opponent from the tier of the player's stage at the week's start
(Zambia st. 6–9, South Africa st. 10, England st. 11–15, top st. 16–17). Win = 1,200 capped XP that
week. Bonus coins on a win: Zambia 150, South Africa 250, England 400, top 600; loss = none.
Opponents only from names with versus art: Lusaka Dynamics, Emerald Buffaloes, Fish Eagles FC, Crimson Arrows FC; Orlando Buccaneers, Mamelodi Sunsets; Arsenal Armoury FC, Liverpool Harbour, Tottenham Cockerels, Newcastle Union (the top tier replays the English sides; Vuma never plays his own club). Record W / L / points (3 a win). Bonus claimable once: `user.season.leagueClaims = [weekStart…]`.

## 5. World Cup (`lib/season/worldcup.mjs`)

Unlocks on the day the player reaches stage 16. Zambia plays 8 sequential 6-day windows starting the
next day: Group Morocco, Mexico, Portugal; R32 USA; R16 Nigeria; QF France; SF Argentina; Final Brazil.
Targets (capped XP in the window): 1400, 1400, 1400, 1600, 1700, 1800, 1900, 2000. A match is won as
soon as the target is reached, lost when its window ends short. Group loss = no bonus, Zambia advances
anyway; knockout loss = eliminated (league continues). Bonus coins: group 500 each, R32 1000,
R16 1500, QF 2500, SF 5000 (`user.season.wcClaims`).

**Final win = K10,000 real money, never auto-credited.** `POST /api/season/claim-prize` (SSO identity)
recomputes the whole season server-side from `player_activity`, with platform XP at most 60/day:
first assuming 60 for every day, else with the client's per-day platform XP clamped to [0, 60]
(either way no day can exceed the cap a real client can earn). Only when the server agrees the Final
was won does it insert one `purchases` row (`prize_key = 'worldcup:<season id>'`, unique per player,
`payout_kwacha 10000`, `item_id` null) and post "🏆 World Cup prize — credit K10,000 to player <id>"
with the season summary to the Telegram admin group (✅ button = existing fulfilment flow).
Idempotent. Client shows "Prize claimed — being verified".

## 6. UI

Missions tab: Season section (current match card with live gap "340 XP to go · 14h left", league
record, World Cup path or locked teaser "Reach Manchester Metropolis to play for Zambia").
Match card = VERSUS picture (Vuma `public/vuma/vs/vuma-NN.png` / `vuma-zambia.png` vs `opp-<kebab-slug>.png`, silhouettes when missing), big centred countdown, and what a miss costs ("Miss it and you lose: 500 coins bonus" / "Miss it and Zambia is OUT of the World Cup" / "Miss it and you lose the K10,000"). Stage 10 club renamed Shaka Chiefs.
Home: compact match card + hustle Collect card. Result moments (win / loss / knocked out / champion)
as LevelUpModal-style modals (`user.season.seen`). Empty feed → "Play on bwanabet.com — your matches
update every few minutes".
