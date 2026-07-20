# /public/ui — crafted UI art assets

Drop game-UI art here; the React components in `components/crafted/` render it.
The starter `.svg` files are placeholders — replace them anytime with CC0 / CC-BY
kit art or Spline/3D PNG exports. No code changes needed if you keep the filenames.

## Folders & naming
- `frames/` — 9-slice frame images. Names: `frame-gold`, `frame-magenta`, `frame-cyan`, `frame-violet`, `frame-green`.
- `icons/`  — currency/badge icons. Names: `coin`, `gem`, `diamond`, `bolt`, `flag` (+ add `shield`, etc.).
  The `.png` icons are real crafted 3D renders (mcpollinations `flux`, alpha-keyed via
  `scripts/key_black_bg.py`); the matching `.svg` files are the old fallback placeholders.
  Regenerate: prompt a glossy 3D icon "isolated on a pure flat solid black background, no text",
  then `python scripts/key_black_bg.py raw.png public/ui/icons/<name>.png`.
- (`buttons/` optional — only if you switch buttons from CSS to art.)

## How 9-slice works (why frames stay crisp at any size)
A frame image is cut into 9 regions: the **4 corners stay fixed**, the **4 edges
stretch** along one axis, the **center** is your own content. You tell it the
corner size via the `slice` prop, measured in the SOURCE image's pixels.

```jsx
import NineSliceFrame from '@/components/crafted/NineSliceFrame';

<NineSliceFrame src="/ui/frames/frame-gold.svg" slice={22} border={15}
  style={{ borderRadius: 14, background: '#150f24' }}>
  ...your content...
</NineSliceFrame>
```
- `slice`  = ornate-corner size in the image's px (these placeholders use ~22 of 96).
- `border` = how thick the frame renders on screen.

## Swapping in real assets
1. **Frames/buttons** — grab CC0 art from OpenGameArt (`opengameart.org`, search "UI pack")
   or a free itch.io kit. Make it roughly square, note the corner size in px, set `slice`
   to that. Recolor to the palette if needed, save over the matching `frame-*.svg`/`.png`.
2. **Icons** — render in Spline (free) using `spline-icon-shotlist.md`, export transparent
   PNGs as `coin.png`, `gem.png`, etc. into `icons/`, then render with
   `<CraftedIcon name="coin" ext="png" glow="gold" />`. Or use game-icons.net SVGs (CC-BY).

## Components (in `components/crafted/`)
- `NineSliceFrame` — the core stretchable frame.
- `CraftedIcon` — `<CraftedIcon name="coin" glow="gold" size={42} />` (svg or png).
- `CurrencyTile` — colored frame + icon + label.
- `CraftedButton` — glossy chamfered button (`variant="magenta"|"cyan"`).
- `tokens.js` — palette + glow + color→frame map.

## See it live
`npm run dev` → open **/crafted-preview**.

> Licensing note: 100xBet is commercial, so use **CC0** (no strings) or **CC-BY**
> (free, needs a small attribution line) assets only — not "personal use only" art.
