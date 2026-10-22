# BwanaBet Bonus Center: embed code for Playmaster

The Bonus Center (daily reward, missions, football story, Coin Shop, games) runs on our server
and shows on the bwanabet website as a widget: a round button bottom-LEFT that opens the
Bonus Center full screen (desktop and phone). The red X inside closes it.

## 1. Add this line to every page (once, in `<head>` or before `</body>`)

```html
<script src="https://bonus.bwanabet.dev/widget.js" defer></script>
```

**New address (2026-10-22):** the Bonus Center moved to `bonus.bwanabet.dev` and the wheel to
`wheel.bwanabet.dev` (some networks block `vercel.app`). If the site already has the old line
`https://100xbet-gamification.vercel.app/widget.js`, replace it with the line above. The old
line keeps working meanwhile (same app, same data), so there is no deadline, but only one of
the two lines may be on a page.

That is all that is required. The player's login is picked up automatically from the site's
existing `token` cookie, so a logged-in player is logged in to the Bonus Center too (no second
login). The token is handed to our app by `postMessage`, never put in a URL, logged or stored
by us. If Playmaster can share the JWT signing key (or public key), we will also verify the
token's signature on our server.

### The Wheel of Fortune is now INSIDE the Bonus Center (2026-10-19)

This one line also runs the Wheel of Fortune. There is ONE button for both: while the player's free spin for today is unused it shows the **wheel's gift box** and opens the wheel; from the moment they spin it shows the **Bonus Center coin** and opens the Bonus Center. **Remove the wheel's own script**
(`https://wheel-of-fortune-roan.vercel.app/embed.js`) from the site, otherwise a player sees
two wheels. What players see:

Nothing ever opens by itself: the widget never covers a page (or a casino game) unless the
player taps the button.

1. A logged-in player whose free spin for today is unused sees the wheel's GIFT BOX button.
   Tapping it opens the Bonus Center with the Wheel of Fortune on top.
2. They spin and see whether they won or lost. From that moment the button is the Bonus
   Center's TREASURE CHEST for the rest of the day.
3. When they close the wheel (its button, its red X, or a click outside the box), the Bonus
   Center is already open behind it.
4. A returning player who earned rewards while away gets the WELCOME BACK pop-up, then the
   daily reward pop-up. Pop-ups only appear while the Bonus Center is open, and never while a
   Bonus Center mini-game is being played.
5. The red X at the top right closes the Bonus Center. The button opens it again.

A player who already used the spin today just sees the treasure chest.

Preview of the whole flow (test wheel, spins never pay):
https://bonus.bwanabet.dev/preview.html

## 2. Optional: open it from your own menu button instead of the floating coin

```html
<script>window.BWANABET_BONUS = { launcher: false };</script>
<script src="https://bonus.bwanabet.dev/widget.js" defer></script>

<!-- anywhere in your menu / header -->
<a href="#" onclick="BwanaBetBonus.open(); return false;">Bonus Center</a>
```

Leave out `launcher: false` to have both the floating coin and your own button.
`BwanaBetBonus.close()` closes it from your side.

## 3. Requirements on the bwanabet site

- **Content-Security-Policy** (only if the site sends one): allow
  `https://bonus.bwanabet.dev` in `script-src`, `frame-src` and `img-src`.
- The `token` cookie must stay readable by page JavaScript on the page that loads the script
  (it is today).
- The site must be served from one of the domains our app accepts the login from:
  `bwanabet.co.zm`, `www.bwanabet.co.zm`, `bwanabet.com`, `www.bwanabet.com`. Another domain
  (e.g. a staging site) must be added on our side first. Tell us the address.

## 4. How to check it works

1. Open any bwanabet page: a treasure-chest button (gift box while a free spin is waiting) appears bottom-left.
2. Click it: the Bonus Center opens full screen. Logged out, it says "Log in on bwanabet.com".
   Logged in, the header shows the player's ID and the daily reward can be claimed.
3. The red X closes it. The small black X on the button hides it until the page is
   reloaded.

Contact: the BwanaBet CRM team.
