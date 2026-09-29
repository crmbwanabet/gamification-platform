// Flip to `true` once public/games/coinflip/eagle.webp and 100x.webp exist
// (512px, <= 25KB each, front-on Grok renders). The webps are used only when
// this is true — there is no runtime existence probing; until then Coin.jsx
// draws a CSS gold placeholder coin with the face label.
// When flipping it, also point IMAGES.coinflip (lib/data/images.js) at the eagle webp.
export const COIN_FACES_READY = false;
