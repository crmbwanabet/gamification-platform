# Side quests: Grok art prompts (10 quests, 2026-10-18)

The 10 side quests (lib/season/config.mjs `hustle.levels`) need one picture each.
Until they exist, `lib/season/hustle.mjs` reuses the closest old hustle picture (QUEST_ART map).

Attach `public/vuma/hustle-1.jpg` to EVERY prompt as the reference image, so the boy matches.
Save each result as `public/vuma/quest-01.jpg` … `quest-10.jpg`, cropped to **600×540** (10:9),
then change `hustleImage` in `lib/season/hustle.mjs` to return `/vuma/quest-NN.jpg`.

## BASE block (paste first, every time)

> Pixel-art game scene in the exact style of the attached reference image: the same faceless
> young African boy (no facial features drawn, dark brown skin, short curly black hair, white
> vest, brown shorts, flip-flops), same chunky 16-bit pixel style, standing front-facing in the
> centre, full body, with a soft light outline. Behind him a dusty Zambian compound or market in
> daylight: tin-roof houses, trees, power lines, dirt ground, slightly soft background, muted
> warm palette that keeps him readable. No text, no brand names, no logos, no watermarks.
> Landscape 10:9.

## Quests

| # | File | Quest | Add to the prompt |
|---|------|-------|-------------------|
| 1 | quest-01.jpg | Fried rat selling | He holds a stick skewer of small roasted field mice (a Zambian roadside snack); a small charcoal brazier and a basin of skewers beside him |
| 2 | quest-02.jpg | Car washing | Bucket of soapy water and a sponge; a dusty car behind him half covered in suds |
| 3 | quest-03.jpg | Chili bite trading | A small table of golden fried chili bites in clear plastic bags |
| 4 | quest-04.jpg | Wheelbarrow pushing | He pushes a wheelbarrow loaded with sacks of maize through a busy market |
| 5 | quest-05.jpg | Tomato trading | A wooden stall with small piles of red tomatoes and plastic basins |
| 6 | quest-06.jpg | Bus conducting | Standing at the open sliding door of a blue minibus, one arm raised calling passengers, cash notes folded in his hand |
| 7 | quest-07.jpg | Bus driving | Standing proudly next to the driver's door of the blue minibus, holding the keys |
| 8 | quest-08.jpg | Salaula trading | Second-hand clothes market: heaps and hanging racks of colourful used clothes |
| 9 | quest-09.jpg | Mobile money agent | A small painted kiosk with a phone, a cash float and a plain green-and-yellow sign with no readable words |
| 10 | quest-10.jpg | Kapenta trading | Basins and open sacks of small dried silver kapenta fish on a market table |
