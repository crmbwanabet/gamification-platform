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

## Heartbeat: visit length and who is online now (2026-10-21)

While the Bonus Center is open (the widget is shown) and its browser tab is visible, the app sends
a small ping to `POST /api/track/ping` every 30 seconds. When the tab is hidden, the widget is
closed or the page goes away, it sends one last ping and stops. A standalone page counts as open
from the start; inside the widget, the app waits for `widget.js` to say it is shown.

- One row per visit in **`play_sessions`** (`sid` = the same session id as `activity_events.session_id`):
  `uid` (null = not logged in), `verified`, `started_at`, `last_ping_at`, `pings`,
  `active_seconds` (time open and visible, accurate to about 30 s, even if the browser dies),
  `ended_at` (set by the last ping; cleared if the player comes back in the same visit).
- The player id comes only from the bwanabet token, checked on the server. The token is never stored or logged.
- At most one regular ping per visit every 20 seconds is recorded (checked in the route and in the
  `ping_session()` database function); each ping also moves `profiles.last_seen_at`.
- Migration: `lib/supabase/migrations/2026-10-21-play-sessions.sql` (applied). Service-role only.

```sql
-- who is in the Bonus Center right now (a ping in the last 90 seconds)
select * from online_now order by started_at;
select count(*) as online, count(*) filter (where verified) as logged_in from online_now;

-- visits and minutes per player per day (Lusaka days)
select * from session_lengths where day = (now() at time zone 'Africa/Lusaka')::date order by minutes desc;

-- one player's visits, newest first (minutes open and visible)
select started_at, last_ping_at, round(active_seconds / 60.0, 1) as minutes, pings, ended_at
from play_sessions where uid = '123456' order by started_at desc limit 50;

-- average visit length per day, logged-in players
select day, sum(visits) as visits, round(sum(minutes) / nullif(sum(visits), 0), 1) as avg_minutes
from session_lengths where uid <> 'anon' group by day order by day desc limit 30;
```

`minutes` = time the Bonus Center was open and visible. `span_minutes` = last ping minus start,
which also counts time the tab was hidden.
