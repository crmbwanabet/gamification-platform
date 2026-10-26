# Village stages 2–5: new art needed (2026-10-26)

The 23-stage journey (owner documents of 2026-10-24) keeps the player in the village for
stages 1–5. Stage 1 keeps its art. Stages 2–5 are PLACEHOLDERS: they show the stage-1 picture
until the art below exists. Story text for each stage: `lib/vuma/stories.mjs`.

Use the BASE block and reference image from `docs/vuma/grok-prompts.md` (attach
`gamification avatar (Vuma Katongo).jpg` and `public/vuma/hero-01.jpg` to every prompt, so the
village and the boy stay the same). Ask for a **1024×1280 portrait**. No text, no logos.
Real green trees, never purple. The scene shows the PLACE (owner 2026-10-23).

From each portrait cut and save (same names = live on the next push, no code change):
- `public/vuma/hero-NN.jpg` 600×540 (full body + scene; the boy stands where he stands in hero-01)
- `public/vuma/banner-NN.jpg` 600×300 (wide scene, the boy small or to one side)
- `public/vuma/avatar-NN.jpg` 256×256 (waist up)

No `vs/` picture: league matches start at stage 12.

| # | Level name | Outfit | Scene |
|---|-----------|--------|-------|
| 2 | Street Hero | Same grey vest and brown shorts, now bare feet or old sandals, holding a real patched leather ball (Ambuya's gift) | The same village, late afternoon: older boys playing on a dusty clearing between mud huts, a mango tree, chickens |
| 3 | The Village Team | A borrowed team shirt (plain faded blue, taken in to fit), shorts, old boots with tape round the toes | The village pitch with stick goalposts, a row of boys lined up for selection, a coach with a whistle |
| 4 | The Village Derby | The same faded blue team shirt, now muddy, socks pulled up | Derby day: the village pitch packed with supporters on both touchlines, drummers, dust in the air |
| 5 | Village League | Matching faded blue kit (shirt and shorts), the taped boots | Village league final: teams from along the road, a crowd under the trees, a painted tin-cup trophy on a wooden table, a stranger with a notebook (the scout) at the side |

**Example full prompt (stage 3):** BASE block + "Outfit: a borrowed plain faded-blue football
shirt taken in to fit, shorts, old football boots with tape around the toes. Scene: the same
Zambian village as the reference picture, a dusty pitch with stick goalposts, a row of boys
lined up for team selection and a coach with a whistle. Green trees, warm afternoon light."
