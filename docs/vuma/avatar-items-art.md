# Avatar items: art guide (2026-10-20)

The Coin Shop sells five items that the player's hero wears in the avatar pictures:

| Item | Price | Where it goes |
|---|---|---|
| Cap | 20,000 coins | on the head |
| T-shirt | 30,000 coins | over the kit top (one top at a time) |
| Football | 40,000 coins | under the arm / in the hands |
| Hoodie | 60,000 coins | over the kit top (one top at a time) |
| 50" TV | 150,000 coins | in the background behind the player |

Prices and on/off switches live in the remote-config row `avatar_items`
(`{ "cap": { "price": 25000, "enabled": false } }`).

**An item appears in the shop only when its art is ready.** Until then the shop doesn't
show it. No code change is needed when the art lands: run the script below and deploy.

## How the art works

The player stands in the same spot in all 19 full-body hero pictures
(`public/vuma/hero-NN.jpg`, 600×540). So each item is ONE transparent layer drawn over that
frame, and it fits every stage. The round header / level-up avatar shows a zoomed crop of the
same dressed picture.

Grok does not need to make transparent images. Ask it to EDIT a hero picture, adding only
the item. The script compares the edit with the original and keeps only what changed.

1. Upload `public/vuma/hero-09.jpg` (Crimson Arrows, plain background) to Grok with the prompt below.
2. Save the result, then run:
   `npm run avatar:items -- cut cap path/to/grok-cap.png`
   This writes `public/vuma/items/cap.png` and updates `lib/avatar/art.generated.mjs`.
3. Check the fit on all 19 stages:
   `npm run avatar:items -- preview --out preview.jpg`
4. If one stage doesn't fit (stage 19 wears a crown, so the cap may need its own layer),
   edit that stage's hero picture and cut a stage layer:
   `npm run avatar:items -- cut cap grok-cap-19.png --from 19 --stage 19`
5. Commit `public/vuma/items/*` + `lib/avatar/art.generated.mjs` and push. The item is now on sale.

If Grok redraws the whole picture (the script stops with "N% of the picture changed"), ask
again with "keep every other pixel identical", or hand in a transparent PNG of the item in the
600×540 frame. The script uses a transparent PNG as it is.

## Grok prompts (edit of hero-09.jpg)

Shared lead for every prompt:

> Edit this pixel-art picture. Keep EVERYTHING identical: same size, same pixel style, same
> player, same pose, same position, same background, same colours. Only add the item below,
> drawn in the same chunky pixel-art style with a dark outline like the player.

- **Cap**: "Add a red BwanaBet baseball cap on the player's head, peak facing forward, sitting
  on top of his hair. A small yellow 'B' on the front."
- **T-shirt**: "Replace only his football shirt with a plain red BwanaBet T-shirt with short
  sleeves and a small yellow 'B' logo on the chest. Arms, shorts and everything else unchanged."
- **Hoodie**: "Replace only his football shirt with a red BwanaBet hoodie: long sleeves down to the
  wrists, a hood resting behind the neck, a front pocket, a yellow 'B' on the chest. Shorts and
  everything else unchanged."
- **Football**: "Put a classic white-and-black football under his right arm, held against his hip
  (the viewer's left side). Leave the ball on the ground as it is."
- **50" TV**: "Add a big flat-screen TV on a stand in the background, behind the player and to
  his left, showing a green football pitch. It is about as tall as his upper body. The player
  stays in front of it, fully visible."

(The brand look follows the BwanaBet red and yellow. Change the colours here if the owner wants.)
