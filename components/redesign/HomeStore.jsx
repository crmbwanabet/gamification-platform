'use client';

import React from 'react';
import { C, CANDY } from './tokens';
import { RewardIcon, CurrencyAmounts } from './RedesignShell';
import { PackBuyButton, balancesOf, SoonLock } from './StoreView';
import { BB_CSS, STORE_ART, packArtSrc, CoinMeter, PackLock, goalText, ShopLockPlate, ShopLockWrap } from './storeKit';
import { ShineImg, Sparkles } from './Shine';
import { IMAGES } from '@/lib/data/images';
import { canAfford, cleanReward, coinsToKwacha, formatKwacha, formatNumber } from '@/lib/economy/currency.mjs';
import { splitCatalog, nextPackGoal, itemBuyable } from '@/lib/store/catalog.mjs';

// Home store panel ("COIN SHOP", was "Cash out coins"; a rate plate on the
// banner art says "10,000 COINS / BUYS / K1.00" from economy.coinsPerKwacha; Coins & Store redesign 2026-10-14): a
// BwanaBet banner with the balance, its kwacha worth and a meter toward the
// next pack the player can't afford yet, then the kwacha packs as tiles. Same
// catalog (splitCatalog), same buy handler + busy id as the Store tab
// (GamificationPlatform's buyStoreItem -> POST /api/purchase), same two-tap
// confirm (PackBuyButton). Desktop (>=861px): a panel of at most 780px beside
// the daily reward, 3 tiles a row (the 6th = "More rewards" -> Store tab),
// tiles sized to their content (never stretched to the daily card). Phones:
// one pack per row, Convert on the right.
const MAX_ON_HOME = 5;

const HS_CSS = `
  .hs-panel { box-sizing: border-box; width: 100%; min-width: 0; display: flex; flex-direction: column; border-radius: 22px; overflow: hidden;
    border: 2px solid #5B2BB0; background: #2B1061; --hs-coin: 34px; }
  .hs-banner { position: relative; background: #2B1061 url(${STORE_ART.banner}) 72% center / cover no-repeat; }
  .hs-shade { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(31,8,68,.1) 0%, rgba(31,8,68,.9) 100%); }
  .hs-body { position: relative; box-sizing: border-box; min-height: 176px; padding: 12px 14px; display: flex; flex-direction: column; gap: 6px; }
  .hs-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .hs-titles { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
  .hs-logo { height: 15px; width: auto; display: block; align-self: flex-start; }
  .hs-title { margin: 0; font-family: ${CANDY.display}; font-weight: 400; font-size: 25px; line-height: 1.05; color: #FFD21F; text-shadow: 0 3px 0 #2A0A4F; }
  .hs-link { min-height: 44px; padding: 0 14px; font-size: 13px; flex: none; }
  .hs-bal { margin-top: auto; display: flex; align-items: center; gap: 8px; min-width: 0; }
  .hs-num { font-family: ${CANDY.display}; font-size: 24px; line-height: 1; color: #fff; text-shadow: 0 2px 0 #2A0A4F; }
  .hs-sub { font-size: 13px; font-weight: 800; color: #E4D8F7; }
  .hs-goal { display: flex; flex-direction: column; gap: 6px; }
  .hs-goal-text { font-size: 12px; font-weight: 800; color: #F1E8FF; white-space: nowrap; }
  .hs-d { display: none; }
  .hs-rate { position: absolute; right: 12px; bottom: 50px; z-index: 1; padding: 6px 10px 7px; border-radius: 14px; text-align: center; line-height: 1;
    background: rgba(20,6,44,.82); border: 2px solid #FFD21F; box-shadow: 0 0 0 1.5px #2A0A4F, 0 6px 16px rgba(0,0,0,.45); font-family: ${CANDY.display}; color: #fff; }
  .hs-rate b { display: block; font-weight: 400; font-size: 15px; }
  .hs-rate i { display: block; font-style: normal; font-size: 11px; letter-spacing: .14em; color: #FFD21F; margin: 3px 0 2px; }
  .hs-rate strong { display: block; font-weight: 400; font-size: 24px; color: #FEF200; text-shadow: 0 2px 0 #2A0A4F; }

  .hs-grid { padding: 12px; display: flex; flex-direction: column; gap: 8px; }
  .hs-tile { box-sizing: border-box; min-width: 0; display: grid; grid-template-columns: 64px minmax(0, 1fr) auto;
    grid-template-areas: "well k act" "well price act"; column-gap: 10px; row-gap: 3px; align-items: center; align-content: center;
    padding: 6px 10px 6px 6px; border-radius: 14px; }
  .hs-well { grid-area: well; position: relative; width: 64px; height: 64px; border-radius: 12px; overflow: hidden; display: flex; align-items: center; justify-content: center; }
  .hs-well img { width: 62px; height: 62px; display: block; }
  .hs-well img.hs-photo { width: 100%; height: 100%; object-fit: cover; }
  .hs-k { grid-area: k; align-self: end; font-size: 23px; text-shadow: 0 2px 0 #2A0A4F; }
  .hs-cost { grid-area: k; align-self: end; font-family: ${CANDY.display}; font-size: 17px; line-height: 1.05; color: #fff; text-transform: uppercase; text-shadow: 0 2px 0 #2A0A4F; white-space: nowrap; }
  .hs-cost--item { font-family: inherit; text-transform: none; }
  .hs-buys { grid-area: price; align-self: start; display: flex; align-items: baseline; gap: 6px; font-family: ${CANDY.display}; font-size: 12px; letter-spacing: .12em; color: #FFD21F; text-transform: uppercase; }
  .hs-buys b { font-weight: 400; font-size: 23px; letter-spacing: 0; text-shadow: 0 2px 0 #2A0A4F; }
  .hs-name { grid-area: price; align-self: start; font-family: ${CANDY.display}; font-size: 16px; line-height: 1.1; color: #fff;
    overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
  .hs-price { grid-area: price; align-self: start; font-size: 12px; font-weight: 800; color: #E4D8F7; }
  .hs-act { grid-area: act; min-width: 104px; min-height: 44px; border-radius: 12px; font-size: 14px; padding: 0 10px; }
  .hs-lock { font-size: 11.5px; }
  .hs-more { all: unset; box-sizing: border-box; cursor: pointer; display: none; align-items: center; gap: 10px; padding: 10px; border-radius: 16px;
    border: 2px dashed #5B2BB0; min-width: 0; }
  .hs-more:hover { border-color: #8B5BE0; }
  .hs-more:focus-visible { outline: 3px solid #FFD21F; outline-offset: 2px; }
  .hs-more img { width: 70px; height: 70px; object-fit: contain; flex: none; }
  .hs-foot { margin: 0; padding: 4px 12px 14px; font-size: 11.5px; font-weight: 700; line-height: 1.4; color: #B9A0E6; text-align: center; }

  @media (min-width: 861px) {
    .hs-panel { max-width: 780px; border-radius: 24px; --hs-coin: 40px; }
    .hs-banner { background-position: 85% center; }
    .hs-shade { background: linear-gradient(90deg, rgba(31,8,68,.92) 0%, rgba(31,8,68,.55) 45%, rgba(31,8,68,0) 75%); }
    .hs-body { min-height: 168px; padding: 16px 22px; gap: 8px; }
    .hs-top { align-items: flex-end; }
    .hs-titles { gap: 8px; }
    .hs-logo { height: 18px; }
    .hs-title { font-size: 30px; line-height: 1; }
    .hs-link { min-height: 36px; padding: 0 14px; font-size: 14px; }
    .hs-bal { margin-top: 0; gap: 10px; }
    .hs-num { font-size: 28px; }
    .hs-sub { font-size: 14px; }
    .hs-rate { right: 26px; bottom: auto; top: 68px; padding: 6px 14px 7px; }
    .hs-rate b { font-size: 18px; }
    .hs-rate strong { font-size: 30px; }
    .hs-goal { flex-direction: row; align-items: center; gap: 10px; max-width: 360px; }
    .hs-d { display: inline; }
    .hs-m { display: none; }

    .hs-grid { padding: 16px; display: grid; grid-template-columns: repeat(auto-fill, minmax(216px, 1fr)); gap: 12px; align-items: start; }
    .hs-tile { grid-template-columns: 84px minmax(0, 1fr); grid-template-areas: "well k" "well price" "well act"; row-gap: 4px; padding: 10px; border-radius: 16px; }
    .hs-well { width: 84px; height: 84px; border-radius: 14px; }
    .hs-well img { width: 80px; height: 80px; }
    .hs-buys b { font-size: 26px; }
    .hs-cost { font-size: 18px; }
    .hs-act { min-width: 0; min-height: 36px; border-radius: 11px; }
    .hs-lock { font-size: 12px; }
    .hs-more { display: flex; align-self: stretch; }
    .hs-foot { padding: 0 16px 14px; font-size: 12px; text-align: left; }
  }
  /* Narrow desktop column: the text runs over the chest art, so darken more of the banner. */
  @media (min-width: 861px) and (max-width: 1180px) {
    .hs-shade { background: linear-gradient(90deg, rgba(31,8,68,.95) 0%, rgba(31,8,68,.82) 55%, rgba(31,8,68,.35) 100%); }
  }
`;

function HomePackTile({ item, balances, onBuy, busy, top, i = 0 }) {
  const coins = item.price.kwacha;
  const ok = canAfford(item.price, balances);
  const short = Math.max(0, coins - balances.kwacha);
  const k = formatKwacha(item.payoutKwacha);
  return (
    <div className={`bb-tile hs-tile${ok ? ' bb-ready' : ''}${top ? ' bb-gold yb-glint' : ''}`}>
      <div className="bb-well hs-well">
        <ShineImg src={packArtSrc(item)} alt={`${k} pack`} width={80} height={80} imgClassName="bb-art" delay={0.6 + i * 0.85}>
          <Sparkles variant={i} scale={0.75} />
        </ShineImg>
      </div>
      <div className="hs-cost">{formatNumber(coins)} coins</div>
      <div className="hs-buys"><span>buys</span><b className="bb-k">{k}</b></div>
      {ok || busy
        ? <PackBuyButton item={item} canBuy={ok} onBuy={onBuy} busy={busy} className="hs-act" />
        : <PackLock short={short} className="hs-act hs-lock" />}
    </div>
  );
}

/** An ordinary store item (when fewer than 5 packs are stocked), in the same tile shape. */
function HomeItemTile({ item, balances, onBuy }) {
  const ok = canAfford(item.price, balances);
  const src = item.imageUrl || IMAGES[item.image];
  return (
    <div className={`bb-tile hs-tile${ok ? ' bb-ready' : ''}`}>
      <div className="bb-well hs-well">{src ? <img src={src} alt={item.name} className="hs-photo" /> : <img src={STORE_ART.chest} alt="" />}</div>
      <div className="hs-cost hs-cost--item">
        {Object.keys(cleanReward(item.price)).length ? <CurrencyAmounts r={item.price} size={14} fontSize={13} gap={6} /> : <span style={{ color: C.green }}>Free</span>}
      </div>
      <div className="hs-name">{item.name}</div>
      {itemBuyable(item)
        ? <button type="button" className="bb-buy hs-act" disabled={!ok} onClick={(e) => ok && onBuy && onBuy(item, e?.currentTarget)}>Convert</button>
        : <SoonLock className="hs-act" />}
    </div>
  );
}

/** Store selection for Home: kwacha packs first, then ordinary items, up to 5. Renders nothing when the store is empty. */
export default function HomeStore({ storeItems, wallet, onBuy, busyId = null, onSeeAll, className = '', locked = false, xp = 0 }) {
  const { coinPacks, items } = splitCatalog(storeItems);
  if (!(coinPacks.length + items.length)) return null;
  const packs = coinPacks.slice(0, MAX_ON_HOME);
  const extras = items.slice(0, MAX_ON_HOME - packs.length);
  const topId = packs.length > 1 ? packs[packs.length - 1].id : null;
  const balances = balancesOf(wallet);
  const rate = Number(wallet?.economy?.coinsPerKwacha) || 10000;
  return (
    <section className={`hs-panel bb-lockhost ${className}`} aria-labelledby="hs-title">
      <style dangerouslySetInnerHTML={{ __html: BB_CSS + HS_CSS }} />
      {locked && <ShopLockPlate xp={xp} reason={locked} className="bb-shoplock--high" />}
      <ShopLockWrap locked={!!locked}>
      <div className="hs-banner">
        <div className="hs-shade" aria-hidden />
        <div className="hs-rate"><b>{formatNumber(rate)} COINS</b><i>BUYS</i><strong>K1.00</strong></div>
        <div className="hs-body">
          <div className="hs-top">
            <div className="hs-titles">
              <img src={STORE_ART.logo} alt="BwanaBet" className="hs-logo" />
              <h2 id="hs-title" className="hs-title">COIN SHOP</h2>
            </div>
            <button type="button" className="bb-link hs-link" onClick={onSeeAll}>
              <span className="hs-d">See coin shop ›</span><span className="hs-m">Shop ›</span>
            </button>
          </div>
        </div>
      </div>
      <div className="hs-grid">
        {packs.map((it, i) => <HomePackTile key={it.id} i={i} item={it} balances={balances} onBuy={onBuy} busy={busyId === it.id} top={it.id === topId} />)}
        {extras.map(it => <HomeItemTile key={it.id} item={it} balances={balances} onBuy={onBuy} />)}
        <button type="button" className="hs-more" onClick={onSeeAll}>
          <img src={STORE_ART.chest} alt="" />
          <span style={{ display: 'flex', flexDirection: 'column', gap: 2, fontWeight: 900, fontSize: 15, color: '#FFD21F' }}>
            More rewards ›<span style={{ fontSize: 12, fontWeight: 700, color: '#B9A0E6' }}>See the whole coin shop</span>
          </span>
        </button>
      </div>
      {packs.length > 0 && (
        <p className="hs-foot">
          <span className="hs-d">Tap Convert twice to confirm · credited to your bwanabet account · one pack a week</span>
          <span className="hs-m">Tap Convert twice · credited to bwanabet · one pack a week</span>
        </p>
      )}
      </ShopLockWrap>
    </section>
  );
}
