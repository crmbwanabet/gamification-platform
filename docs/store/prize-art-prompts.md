# Coin Shop REAL PRIZES: Grok image prompts (2026-10-26)

The original prompts for `public/ui/prizes/*.webp` were never saved; these are rewritten to match the live art
(glossy cartoon game icons, black + BwanaBet yellow #FEF200, soft shadow, dark plum background).

How to use:
1. In Grok, paste the STYLE block, then ONE item line. Ask for a 1:1 (square) image.
2. Generate 3-4 times and pick the best.
3. Logos and the mascot badge are added by us afterwards (Grok garbles text), so the prompts ask for a
   BLANK yellow patch where the logo goes. Send the picked images back and Claude cuts them out, adds the
   BwanaBet logo / mascot badge, and saves them as `public/ui/prizes/<id>.webp` (256x256).

**Mascot items (cap, bucket hat, T-shirt, hoodie):** ATTACH the BwanaBet leprechaun mascot picture in Grok
together with the prompt (Grok cannot draw the mascot from words). If Grok changes his face, use the item
without the badge and Claude puts the real mascot badge on afterwards (as on the live art of 2026-10-22).
For these four, end the STYLE block with "No text, no letters, no watermark, no people except the mascot
on the badge." instead of its last sentence.
The BWANABET wordmark is always added by Claude afterwards.

## STYLE (paste first, every time)

Mobile game reward icon, single object, centred, 3/4 front view, filling about 80% of a square frame.
Glossy cartoon 3D style with clean dark outlines, soft studio lighting, a bright rim light and a subtle
white highlight. Colour palette: deep black and bright lemon yellow (#FEF200) accents, with the object's
natural colours. Plain flat dark plum background (#241A3A) with 3-4 tiny white sparkle stars around the
object and a soft oval shadow under it. No text, no letters, no logos, no watermark, no people, no hands.

## ITEMS (one per image)

| id | Item line |
|---|---|
| cap | A black baseball cap with a yellow peak edge and yellow stitching. On the front panel, a round embroidered badge with a thin gold ring showing the attached BwanaBet leprechaun mascot (green top hat, pixel sunglasses, big smile, beard), copied exactly from the attached image. |
| buckethat | A black bucket hat with yellow stitched rings around the brim and crown. On the front, a round embroidered badge with a thin gold ring showing the attached BwanaBet leprechaun mascot, copied exactly from the attached image. |
| tshirt | A black football jersey T-shirt laid flat, yellow V-neck collar and yellow sleeve cuffs. In the centre of the chest, a large round printed badge with a thin gold ring showing the attached BwanaBet leprechaun mascot, copied exactly from the attached image. |
| hoodie | A black pullover hoodie with a yellow hood lining, yellow drawstrings and a front pouch pocket. In the centre of the chest, a large round printed badge with a thin gold ring showing the attached BwanaBet leprechaun mascot, copied exactly from the attached image. |
| football | A classic black-and-white football (soccer ball), shiny, slightly tilted, with a faint yellow glow behind it. |
| powerbank | A chunky black power bank with yellow side trim, a small screen showing a green full battery icon, a yellow lightning bolt on the front, and a short charging cable curling out of the top. |
| wifi | A sleek black Wi-Fi home router with two antennas, little green status lights and glowing yellow Wi-Fi signal arcs above it; a red-and-gold award ribbon rosette in the bottom-right corner with a blank centre. |
| iphonex | A modern smartphone in silver with an edge-to-edge screen and a notch, the screen showing a colourful grid of app icons, standing upright at a slight angle. No brand logo. |
| galaxyultra | A large flagship Android smartphone in titanium grey shown front and back, the back with a big camera bump of four lenses, the front lock screen showing a clock, with a yellow stylus pen leaning against it. No brand logo. |
| iphone18 | The newest premium smartphone in deep red metal, shown front and back: the front lock screen with a clock, the back with a large triple-camera bump. No brand logo. |
| tv | A 50-inch flat-screen TV on two slim feet, the screen showing a green football pitch match from above with a small scoreboard bar on the top-left (no readable text); a red-and-gold award ribbon rosette on the top-right corner with a blank centre. |
| scooter | A black electric kick scooter with yellow accents, a yellow lightning bolt on the stem, a glowing white headlight beam and small wheels, side view slightly turned. |
| car | A small red 5-door hatchback city car (compact Japanese hatchback shape), shiny, with a big gold ribbon and bow tied over the roof like a gift. No badges or number plate text. |

## Clothing with the mascot logo (2026-10-28, live)

The owner's logo (mascot + BWANABET wordmark) is `docs/store/bwanabet-mascot-logo.jpg`. Grok draws the clothing
PLAIN (prompt: "... completely plain black front/chest with nothing on it", no text/logos/prints), then Claude cuts
the logo from its purple background and composites it onto the fabric, shaded by the fabric's lighting (hoodie:
the print sits over the drawstrings so they never cross the mascot's face).
