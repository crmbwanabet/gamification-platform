# Comeback SMS: list of inactive players for the CRM

Players whose last real-money activity on bwanabet (a casino or sports bet, or a deposit) was
**7 to 60 days ago** get a one-time **1,000 coin** "welcome back" bonus the next time they open
the Bonus Center. The CRM sends the SMS that brings them back; this endpoint gives it the list.

## Get the list

```
GET https://bonus.bwanabet.dev/api/crm/inactive-players
Authorization: Bearer <PLAYER_FEED_SECRET>   (the same secret as the player-daily feed)
```

Response:

```json
{
  "day": "2026-10-19",
  "link": "https://bwanabet.co.zm/?bonus=open",
  "coins": 1000,
  "players": [
    { "userId": "123456", "lastActiveDay": "2026-10-11", "daysInactive": 8 }
  ]
}
```

- Player IDs only. The CRM looks up the phone number on its side. We never receive or store
  phone numbers.
- The list is built from the daily activity the CRM already sends (`/api/activity/player-daily`).
  A player with no activity rows is never on it.
- A player who has already claimed the bonus for that gap drops off the list. They come back on
  it only after a new 7-day gap.
- Call it at most a few times a day (rate limited to 10 calls a minute).

## Suggested SMS (under 160 characters)

> BwanaBet: we miss you! A 1,000 coin welcome-back bonus is waiting in your Bonus Center.
> Claim it now: https://bwanabet.co.zm/?bonus=open

The link opens bwanabet with the Bonus Center already open (the widget script reads
`?bonus=open`). After logging in, the player sees the "Welcome back!" pop-up and claims the bonus.
The bonus can be claimed once per gap, and our server checks this, not the link.
