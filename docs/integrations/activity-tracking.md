# Player activity tracking (Bonus Center)

Since 2026-10-19 the Bonus Center records every player action in the Supabase table
`activity_events` (project "Gamification"). The player is identified by the server from their
bwanabet login token, never by what the browser claims. The token is checked and then
discarded: it is never stored or logged.

## First login and last seen

- `profiles.first_login_at`: when the player claimed their **first reward** in the Bonus
  Center (daily reward, a mission, a prediction, the league prize, a comeback bonus, an album
  set, the side quest, a match bonus). Set once. A `first_login` event is recorded at the same
  moment, with the reward type in `meta.via`.
- `profiles.last_seen_at`: the time of their latest tracked activity.
- View `player_engagement`: one row per player with first login, last seen, total events,
  events in the last 7 days, number of visits and the last event time.

## Event columns

| Column | Meaning |
|---|---|
| `uid` | bwanabet player ID (`anon` when not logged in) |
| `verified` | true when the ID came from a checked login token |
| `type` | the action (below) |
| `session_id` | one ID per Bonus Center load, so a visit can be followed step by step |
| `game_id` | the game, for game events |
| `amount` | coins involved (reward, stake, cost) |
| `meta` | details (mission id, tab, pick, rank…) |
| `created_at` | when it happened |

## Event types

| Group | Types |
|---|---|
| Visits | `session_start`, `widget_open`, `widget_close`, `tab_view`, `profile_open`, `story_open`, `intro_toggle`, `mission_open` |
| Rewards claimed | `daily_claimed`, `mission_completed` (casino), `sports_mission_claimed`, `prediction_claimed` (weekly 5 out of 5, meta.week), `story_prize_claimed` (the story LET'S GO prize, once), `leaderboard_claimed`, `comeback_claimed`, `album_set_claimed`, `hustle_collected`, `league_bonus_claimed`, `wc_bonus_claimed`, `first_login` |
| Progress | `level_up` |
| Actions | `game_open`, `game_played`, `prediction_made`, `friendly_accepted`, `friendly_declined`, `prize_claimed` (World Cup), `name_set`, `purchase`, `comeback_shown`, `bonus_unlock_seen` (the "New bonuses unlocked" pop-up), `avatar_item_bought` / `_worn` / `_removed` |
| Wheel of Fortune | `wheel_available`, `wheel_auto_open`, `wheel_opened`, `wheel_spun`, `wheel_closed` |

The allowed list lives in `lib/trackTypes.mjs`. Anything else is dropped.

## Useful queries

```sql
-- every action of one player, newest first
select created_at, type, game_id, amount, meta, session_id
from activity_events where uid = '123456' order by created_at desc limit 200;

-- first logins per day
select date_trunc('day', first_login_at) as day, count(*) from profiles
where first_login_at is not null group by 1 order by 1 desc;

-- engagement overview
select * from player_engagement order by last_seen_at desc nulls last limit 100;

-- wheel funnel today: shown -> opened -> spun
select type, count(distinct uid) from activity_events
where type like 'wheel_%' and created_at > date_trunc('day', now()) group by type;
```

The wheel's prizes and payouts are still recorded by the wheel app in its own database. These
events only show what the player did in the Bonus Center.
