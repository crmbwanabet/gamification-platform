# 19-stage story: new art needed (2026-10-19)

The story grew from 17 to 19 stages (owner list): 11 Zambian locations, each with a club,
then the 8 abroad stages. Data: `lib/vuma/stages.mjs`. The art files were renumbered to match
(old 6–9 → 8–11, old 10–17 → 12–19). Stages 2–7 and the banners of 8–11 are now PLACEHOLDERS
(the nearest old picture) until the new art below exists.

Use the BASE block and reference image from `docs/vuma/grok-prompts.md` (attach
`gamification avatar (Vuma Katongo).jpg` to every prompt). Ask for a **1024×1280 portrait**.
No real club crests, sponsor or league logos: kits are identified by colour only. No text.

From each portrait cut and save (same names = live on the next push, no code change):
- `public/vuma/hero-NN.jpg` 600×540 (full body + scene)
- `public/vuma/banner-NN.jpg` 600×300 (wide scene, the boy small or to one side)
- `public/vuma/avatar-NN.jpg` 256×256 (waist up)
- stages 8–19 only: `public/vuma/vs/vuma-NN.png` 300×420, transparent background (match card)

## What is needed

| # | Place | Club | Level name | Needed | Outfit | Background |
|---|-------|------|-----------|--------|--------|------------|
| 1 | The village | – | Village Football | keep | – | – |
| 2 | Small town | Copperbelt Football Academy | Street Hero | **hero, banner, avatar** | Academy training bib (copper orange) over a faded T-shirt, old boots, socks pulled up | Small Copperbelt town: low brick houses, a mine headframe far behind, a dusty academy pitch with cones and stick goalposts |
| 3 | Town | Junction Rovers FC | Street Legend | **hero, banner, avatar** | Red and white second-hand kit, cheap canvas sneakers | Busy town crossroads: fuel station, minibuses, a gravel pitch beside the road junction |
| 4 | Big town compound | Nsofu Boys FC | Amateur League | **hero, banner, avatar** | Grey and green amateur kit, first real boots (taped) | Crowded compound in a big town: tin-roof houses, washing lines, a sand pitch with painted lines, kids watching |
| 5 | Big town suburb | Mphamvu United | Amateur League Hero | **hero, banner, avatar** | Purple and white matching kit, shin pads | Leafy suburb of a big town: walled houses, jacaranda trees, a grass community pitch with a small stand |
| 6 | City compound | Mulilo Stars FC | Amateur League Hero | **hero, banner, avatar** | Orange and black kit, captain's armband | Big-city compound at dusk: markets, minibuses, a floodlit dirt pitch, a crowd on the touchline |
| 7 | City suburb | Kalulu FC | Amateur League Legend | **hero, banner, avatar** | Sky-blue and brown kit with a hare-coloured trim, modern boots | City suburb ground: neat grass pitch, a small concrete stand, scouts with clipboards |
| 8 | Lusaka compound | Kafue Gaels FC | Professional League | **banner** (keep kit art) | Same kit as `avatar-08.jpg` (attach it too) | Lusaka compound stadium: low concrete stand, compound houses behind, local fans |
| 9 | Lusaka compound | Crimson Arrows FC | Pro League Hero | **banner** | Same kit as `avatar-09.jpg` (attach it too) | Bigger Lusaka compound ground, packed stand, drums |
| 10 | Lusaka suburb | Energy Dynamos FC | Pro League Hero | **banner** | Same kit as `avatar-10.jpg` (attach it too) | Lusaka suburb stadium under floodlights, packed stands |
| 11 | Lusaka suburb | ZEMCO United | Pro League Legend | **banner** | Same kit as `avatar-11.jpg` (attach it too) | Large Lusaka stadium at night, full crowd, confetti |
| 12–19 | Soweto … Doha | Shaka Chiefs … Doha Dam SC | International League … | keep | – | – |

Stages 6–7 never play a league match (matches start at stage 8), so they need no `vs/` picture.

**Example full prompt (stage 2):** BASE block + "Outfit: a copper-orange academy training bib over
a faded T-shirt, old football boots, socks pulled up. Background: a small Copperbelt town in
Zambia with low brick houses, a mine headframe in the far distance and a dusty academy pitch
with cones and stick goalposts."
