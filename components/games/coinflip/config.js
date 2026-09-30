// Flip to `true` once public/games/coinflip/heads.webp and tails.webp exist
// (512px, <= 25KB each, front-on Grok renders). The webps are used only when
// this is true — there is no runtime existence probing; until then Coin.jsx
// draws a CSS gold placeholder coin with the face label.
// When flipping it, also point IMAGES.coinflip (lib/data/images.js) at the heads webp.
export const COIN_FACES_READY = true;
