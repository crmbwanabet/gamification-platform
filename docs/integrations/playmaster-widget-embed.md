# BwanaBet Bonus Center: embed code for Playmaster

The Bonus Center (daily reward, missions, football story, Coin Shop, games) runs on our server
and shows on the bwanabet website as a widget: a round coin button bottom-right that opens the
Bonus Center full screen (desktop and phone). The red X inside closes it.

## 1. Add this line to every page (once, in `<head>` or before `</body>`)

```html
<script src="https://100xbet-gamification.vercel.app/widget.js" defer></script>
```

That is all that is required. The player's login is picked up automatically from the site's
existing `token` cookie, so a logged-in player is logged in to the Bonus Center too (no second
login). The token is handed to our app by `postMessage`, never put in a URL, logged or stored
by us. If Playmaster can share the JWT signing key (or public key), we will also verify the
token's signature on our server.

## 2. Optional: open it from your own menu button instead of the floating coin

```html
<script>window.BWANABET_BONUS = { launcher: false };</script>
<script src="https://100xbet-gamification.vercel.app/widget.js" defer></script>

<!-- anywhere in your menu / header -->
<a href="#" onclick="BwanaBetBonus.open(); return false;">Bonus Center</a>
```

Leave out `launcher: false` to have both the floating coin and your own button.
`BwanaBetBonus.close()` closes it from your side.

## 3. Requirements on the bwanabet site

- **Content-Security-Policy** (only if the site sends one): allow
  `https://100xbet-gamification.vercel.app` in `script-src`, `frame-src` and `img-src`.
- The `token` cookie must stay readable by page JavaScript on the page that loads the script
  (it is today).
- The site must be served from one of the domains our app accepts the login from:
  `bwanabet.co.zm`, `www.bwanabet.co.zm`, `bwanabet.com`, `www.bwanabet.com`. Another domain
  (e.g. a staging site) must be added on our side first. Tell us the address.

## 4. How to check it works

1. Open any bwanabet page: a gold K coin button appears bottom-right.
2. Click it: the Bonus Center opens full screen. Logged out, it says "Log in on bwanabet.com".
   Logged in, the header shows the player's ID and the daily reward can be claimed.
3. The red X closes it. The small red X on the coin button hides the button until the page is
   reloaded.

Contact: the BwanaBet CRM team.
