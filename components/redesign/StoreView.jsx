'use client';

import React from 'react';
import { C, CANDY } from './tokens';
import RedesignShell, { Card, Badge, RewardIcon, CurrencyAmounts } from './RedesignShell';
import { IMAGES } from '@/lib/data/images';
import { STORE_ITEMS } from '@/lib/data/platform';
import { amountText } from '@/lib/rewardText.mjs';
import { canAfford, cleanReward, coinsToKwacha, economyRates, formatKwacha, formatNumber } from '@/lib/economy/currency.mjs';
import { splitCatalog, nextPackGoal, storeLockReason, itemBuyable } from '@/lib/store/catalog.mjs';
import { prizesOpenFor, prizesTester, shopPrizes } from '@/lib/store/prizes.mjs';
import { getLevel } from '@/lib/data/platform';
import { BB_CSS, STORE_ART, packArtSrc, CoinMeter, PackLock, goalText, ShopLockPlate, ShopLockWrap } from './storeKit';
import { ShineImg, Sparkles } from './Shine';
import { HeroPicture } from './AvatarPicture';
import { layerSrc } from '@/lib/avatar/items.mjs';

// Balances the store compares prices against ({ kwacha, emeralds, rubies, diamonds }).
export const balancesOf = (w) => ({ kwacha: w?.kwacha || 0, emeralds: w?.emeralds || 0, rubies: w?.rubies || 0, diamonds: w?.diamonds || 0 });

/** "Coming soon" plate in place of Convert: only the kwacha packs are on sale (itemBuyable). */
export function SoonLock({ className = '' }) {
  return <div className={`bb-lock ${className}`}><img src="/ui/reward/lock.png" alt="" width={16} height={16} style={{ marginRight: 6 }} />Coming soon</div>;
}

/** An ordinary (non-pack) store item in the tile look: art well, name, price, and a Coming soon lock (only kwacha packs sell for now). */
export function StoreCard({ item, canBuy, onBuy }) {
  const src = item.imageUrl || IMAGES[item.image];
  return (
    <div className="bb-tile st-item">
      <div className="bb-well st-item-art">
        {src ? <img src={src} alt={item.name} /> : <img src={STORE_ART.chest} alt="" className="st-item-fallback" />}
        {item.featured && <span style={{ position: 'absolute', top: 6, left: 6, zIndex: 2 }}><Badge bg={C.gold}>Featured</Badge></span>}
        {item.isNew && <span style={{ position: 'absolute', top: 6, right: 6, zIndex: 2 }}><Badge bg={C.red} color="#fff">New</Badge></span>}
      </div>
      <div className="st-item-foot">
        {Object.keys(cleanReward(item.price)).length ? <CurrencyAmounts r={item.price} size={16} fontSize={12.5} gap={8} /> : <span style={{ fontSize: 12.5, fontWeight: 800, color: C.green }}>Free</span>}
      </div>
      <div className="st-item-name">{item.name}</div>
      {itemBuyable(item)
        ? <button type="button" className="bb-buy st-item-buy" disabled={!canBuy} onClick={(e) => canBuy && onBuy && onBuy(item, e?.currentTarget)}>Convert</button>
        : <SoonLock className="st-item-buy" />}
    </div>
  );
}

/**
 * Buy button for a kwacha pack, with a two-tap confirm: real money moves, so
 * the first tap arms it ("Confirm K5?") and a second tap within 4s buys it.
 * Look = the glossy green `bb-buy` (gold while armed); size comes from `className`.
 */
export function PackBuyButton({ item, canBuy, onBuy, busy, className = '' }) {
  const [armed, setArmed] = React.useState(false);
  React.useEffect(() => {
    if (!armed) return undefined;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);
  const disabled = !canBuy || busy;
  const onClick = (e) => {
    if (disabled) return;
    if (!armed) { setArmed(true); return; }
    setArmed(false);
    if (onBuy) onBuy(item, e?.currentTarget);
  };
  return (
    <button type="button" onClick={onClick} disabled={disabled} data-pack={item.id} className={`bb-buy${armed && !disabled ? ' bb-armed' : ''} ${className}`}
      aria-label={armed ? `Confirm: convert coins to ${formatKwacha(item.payoutKwacha)}` : `Convert coins to ${formatKwacha(item.payoutKwacha)}`}>
      {busy ? 'Sending…' : armed ? `Confirm ${formatKwacha(item.payoutKwacha)}?` : 'Convert'}
    </button>
  );
}

/** Big Store-tab pack card: art, coin cost on top, "BUYS" + the K amount below, Convert or "N more". The top pack wears the gold frame. */
function StorePackCard({ item, balances, onBuy, busy, top, i = 0 }) {
  const coins = item.price.kwacha;
  const ok = canAfford(item.price, balances);
  const short = Math.max(0, coins - balances.kwacha);
  const k = formatKwacha(item.payoutKwacha);
  return (
    <div className={`bb-tile st-pack${ok ? ' bb-ready' : ''}${top ? ' bb-gold yb-glint' : ''}`}>
      {top && <div className="st-top">TOP PRIZE</div>}
      <ShineImg src={packArtSrc(item)} alt={`${k} pack`} className="st-pack-art" imgClassName="bb-art" width={140} height={140} delay={0.6 + i * 0.85}>
        <Sparkles variant={i} />
      </ShineImg>
      <div className="st-pack-cost"><RewardIcon kind="coins" size={20} />{formatNumber(coins)} coins</div>
      <div className="st-pack-buys">buys</div>
      <div className="bb-k bb-title st-pack-k">{k}</div>
      {ok || busy
        ? <PackBuyButton item={item} canBuy={ok} onBuy={onBuy} busy={busy} className="st-pack-act" />
        : <PackLock short={short} className="st-pack-act st-pack-lock" />}
    </div>
  );
}

/**
 * Avatar item card (lib/avatar/items.mjs): the hero at the player's stage
 * trying the item on, the coin cost on top, "BUYS" + the item below, then
 * Convert (two taps: "Confirm Cap?"), "N more" when short, or Wear / Take off
 * once owned.
 */
function AvatarItemCard({ item, stage, coins, owned, worn, onBuy, onWear }) {
  const [armed, setArmed] = React.useState(false);
  React.useEffect(() => {
    if (!armed) return undefined;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);
  const src = layerSrc(item.id, stage);
  const short = Math.max(0, item.price - coins);
  const buy = (e) => {
    if (!armed) { setArmed(true); return; }
    setArmed(false);
    if (onBuy) onBuy(item.id, e?.currentTarget);
  };
  return (
    <div className={`bb-tile st-av${!owned && !short ? ' bb-ready' : ''}`} data-avatar-shop={item.id}>
      <div className="bb-well st-av-art">
        <HeroPicture stage={stage} alt={`You wearing the ${item.name}`} layers={src ? [{ id: item.id, src }] : []} />
        {owned && <span style={{ position: 'absolute', top: 6, left: 6, zIndex: 2 }}><Badge bg={C.gold}>Yours</Badge></span>}
      </div>
      <div className="st-pack-cost"><RewardIcon kind="coins" size={20} />{formatNumber(item.price)} coins</div>
      <div className="st-pack-buys">buys</div>
      <div className="bb-title st-av-name">{item.name}</div>
      {owned ? (
        <button type="button" aria-pressed={worn} onClick={() => onWear && onWear(item.id, !worn)} className={`bb-buy st-pack-act${worn ? ' bb-armed' : ''}`}>{worn ? 'Take off' : 'Wear'}</button>
      ) : short ? (
        <PackLock short={short} className="st-pack-act st-pack-lock" />
      ) : (
        <button type="button" onClick={buy} className={`bb-buy st-pack-act${armed ? ' bb-armed' : ''}`}
          aria-label={armed ? `Confirm: convert ${formatNumber(item.price)} coins to the ${item.name}` : `Convert ${formatNumber(item.price)} coins to the ${item.name}`}>
          {armed ? `Confirm ${item.name}?` : 'Convert'}
        </button>
      )}
    </div>
  );
}

const UNIT = { kwacha: 'coins', emeralds: 'emeralds', rubies: 'rubies', diamonds: 'diamonds' };
const BUTTON = { kwacha: 'Use coins', emeralds: 'Use emeralds', rubies: 'Use rubies', diamonds: 'Use diamonds' };
/** A one-currency price -> [key, amount] ('kwacha' = coins). */
const onePrice = (price) => Object.entries(cleanReward(price))[0] || ['kwacha', 0];

/** One price option of a prize: two taps ("Convert" / "Use emeralds", then "Confirm?"), or "N more emeralds" when short. */
function PrizeBuyButton({ item, label, balances, busy, onBuy }) {
  const [armed, setArmed] = React.useState(false);
  React.useEffect(() => {
    if (!armed) return undefined;
    const t = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(t);
  }, [armed]);
  const [k, v] = onePrice(item.price);
  const short = Math.max(0, v - (balances[k] || 0));
  if (short > 0 && !busy) {
    return <div className="bb-lock st-pack-act st-pack-lock" aria-label={`${amountText(short, k === 'kwacha' ? 'coins' : k)} more needed`}>{formatNumber(short)} more {UNIT[k]}</div>;
  }
  const onClick = (e) => {
    if (busy) return;
    if (!armed) { setArmed(true); return; }
    setArmed(false);
    if (onBuy) onBuy(item, e?.currentTarget);
  };
  return (
    <button type="button" onClick={onClick} disabled={busy} className={`bb-buy st-pack-act${armed ? ' bb-armed' : ''}`}
      aria-label={armed ? `Confirm: buy the ${item.name} for ${formatNumber(v)} ${UNIT[k]}` : `Buy the ${item.name} for ${formatNumber(v)} ${UNIT[k]}`}>
      {busy ? 'Sending…' : armed ? 'Confirm?' : label}
    </button>
  );
}

/**
 * A real prize in the pack look (owner 2026-10-26: one list, the prizes right
 * after the kwacha packs): art, each price on top ("1,000,000 coins OR
 * 5 emeralds"), "BUYS" + the prize name, then one button per price.
 */
function StorePrizeCard({ prize, options, balances, onBuy, busyId }) {
  const ready = options.some(o => canAfford(o.price, balances));
  const many = options.length > 1;
  return (
    <div className={`bb-tile st-pack${ready ? ' bb-ready' : ''}`} data-prize={prize.id}>
      <img src={prize.art} alt={prize.name} width={140} height={140} loading="lazy" className="st-pack-art st-prize-img" />
      {options.map((o, i) => {
        const [k, v] = onePrice(o.price);
        return (
          <React.Fragment key={o.id}>
            {i > 0 && <div className="st-pack-buys st-prize-or">or</div>}
            <div className="st-pack-cost"><RewardIcon kind={k === 'kwacha' ? 'coins' : k} size={20} />{formatNumber(v)} {UNIT[k]}</div>
          </React.Fragment>
        );
      })}
      <div className="st-pack-buys">buys</div>
      <div className="bb-title st-prize-name">{prize.name}</div>
      <div className="st-prize-acts">
        {options.map(o => <PrizeBuyButton key={o.id} item={o} label={many ? BUTTON[onePrice(o.price)[0]] : 'Convert'} balances={balances} busy={busyId === o.id} onBuy={onBuy} />)}
      </div>
    </div>
  );
}

/** Store hero: BwanaBet banner, title and the rate guide ("10,000 COINS BUYS K1.00").
 * The balance + next-pack meter were removed 2026-10-18 (they confused players). */
function StoreHero({ economy }) {
  const { coinsPerKwacha } = economyRates(economy);
  return (
    <div className="st-hero">
      <div className="st-hero-shade" aria-hidden />
      <div className="st-hero-body">
        <img src={STORE_ART.logo} alt="BwanaBet" className="st-hero-logo" />
        <h1 className="bb-display st-hero-title">Coin Shop</h1>
        <div className="st-hero-bal">
          <RewardIcon kind="coins" size={58} className="st-hero-coin" shine={{ delay: 1.2, duration: 4.5 }} />
          <span className="bb-display st-hero-num">{formatNumber(coinsPerKwacha)} COINS <span style={{ color: '#E4D8F7', fontSize: '.6em' }}>BUYS</span> <span style={{ color: '#FFD21F' }}>K1.00</span></span>
        </div>
      </div>
    </div>
  );
}

const ST_CSS = `
  .st-wrap { width: 100%; max-width: 1060px; margin: 0 auto; display: flex; flex-direction: column; gap: 28px; }
  .st-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
  .st-hero { position: relative; min-height: 270px; border-radius: 26px; overflow: hidden; border: 2px solid #5B2BB0; display: flex; align-items: center;
    background: #2B1061 url(${STORE_ART.banner}) right center / cover no-repeat; }
  .st-hero-shade { position: absolute; inset: 0; background: linear-gradient(90deg, rgba(31,8,68,.95) 0%, rgba(31,8,68,.6) 42%, rgba(31,8,68,0) 70%); }
  .st-hero-body { position: relative; box-sizing: border-box; width: 100%; max-width: 534px; padding: 24px 32px; display: flex; flex-direction: column; gap: 12px; }
  .st-hero-logo { height: 26px; width: auto; align-self: flex-start; display: block; }
  .st-hero-title { margin: 0; text-transform: uppercase; font-size: 40px; line-height: 1; color: #FFD21F; text-shadow: 0 4px 0 #2A0A4F; }
  .st-hero-bal { display: flex; align-items: center; gap: 12px; }
  .st-hero-coin { filter: drop-shadow(0 6px 10px rgba(20,4,48,.6)); }
  .st-hero-num { font-size: 40px; line-height: 1; color: #fff; text-shadow: 0 3px 0 #2A0A4F; }
  .st-hero-sub { font-size: 15px; font-weight: 800; color: #E4D8F7; }
  .st-hero-goal { font-size: 14px; font-weight: 800; color: #F1E8FF; }
  .st-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; flex-wrap: wrap; margin-bottom: 16px; }
  .st-h2 { margin: 0; text-transform: uppercase; font-size: 28px; line-height: 1.05; color: #FFD21F; text-shadow: 0 3px 0 #2A0A4F; }
  .st-note { font-size: 13px; font-weight: 700; color: #B9A0E6; }
  .st-packs { display: grid; grid-template-columns: repeat(auto-fill, minmax(176px, 1fr)); gap: 16px; padding-top: 12px; }
  .st-pack { position: relative; display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 14px; border-radius: 22px; min-width: 0; }
  .st-pack-art { display: block; width: min(140px, 100%); aspect-ratio: 1; }
  .st-pack-art > img { width: 100%; height: 100%; display: block; }
  .st-pack-k { font-size: 36px; }
  .st-pack-cost { display: inline-flex; align-items: center; gap: 6px; font-family: ${CANDY.display}; font-size: 19px; line-height: 1; color: #fff; text-transform: uppercase; text-shadow: 0 2px 0 #2A0A4F; white-space: nowrap; }
  .st-prize-img { object-fit: contain; }
  .st-prize-or { opacity: .8; }
  .st-prize-name { font-family: ${CANDY.display}; font-size: 20px; line-height: 1.1; color: #FFD21F; text-shadow: 0 2px 0 #2A0A4F; text-align: center; min-height: 2.2em; display: flex; align-items: center; }
  .st-prize-acts { width: 100%; margin-top: auto; display: flex; flex-direction: column; gap: 6px; }
  .st-prize-acts .st-pack-act { margin-top: 0; }
  .st-pack-buys { font-family: ${CANDY.display}; font-size: 12px; letter-spacing: .14em; line-height: 1; color: #FFD21F; text-transform: uppercase; }
  .st-pack-act { width: 100%; min-height: 44px; margin-top: 6px; border-radius: 13px; font-size: 15px; padding: 0 6px; }
  .st-pack-lock { font-size: 12.5px; }
  .st-top { position: absolute; top: -12px; left: 50%; transform: translateX(-50%); padding: 3px 10px; border-radius: 999px; background: #E3261E;
    font-size: 11px; font-weight: 900; letter-spacing: .05em; color: #fff; white-space: nowrap; box-shadow: 0 2px 0 #991510; }
  .st-av { position: relative; display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 12px; border-radius: 22px; min-width: 0; }
  .st-av-art { position: relative; width: 100%; border-radius: 16px; overflow: hidden; margin-bottom: 4px; }
  .st-av-name { font-size: 26px; line-height: 1.05; text-align: center; }
  .st-items { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 16px; }
  .st-item { display: flex; flex-direction: column; gap: 10px; padding: 12px; border-radius: 22px; min-width: 0; }
  .st-item-art { position: relative; height: 120px; border-radius: 16px; overflow: hidden; display: flex; align-items: center; justify-content: center; }
  .st-item-art img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .st-item-art img.st-item-fallback { width: auto; height: 86%; object-fit: contain; }
  .st-item-name { font-family: ${CANDY.display}; font-size: 17px; line-height: 1.15; color: #fff; }
  .st-item-foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; }
  .st-item-buy { margin-top: auto; align-self: stretch; min-height: 44px; padding: 0 18px; border-radius: 13px; font-size: 15px; }
  @media (max-width: 600px) {
    .st-wrap { gap: 22px; }
    .st-hero { min-height: 0; align-items: flex-end; background-position: 72% center; }
    .st-hero-shade { background: linear-gradient(180deg, rgba(31,8,68,.25) 0%, rgba(31,8,68,.92) 70%); }
    .st-hero-body { max-width: none; padding: 96px 16px 18px; gap: 10px; }
    .st-hero-logo { height: 18px; }
    .st-hero-title { font-size: 32px; }
    .st-hero-num { font-size: 30px; }
    .st-hero-sub { font-size: 13px; }
    .st-hero-goal { font-size: 13px; }
    .st-hero-bal img.st-hero-coin { width: 44px; height: 44px; }
    .st-h2 { font-size: 24px; }
    .st-packs { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
    .st-pack { padding: 12px 10px; border-radius: 18px; }
    .st-pack-k { font-size: 30px; }
    .st-items { grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }
      }
`;

export default function StoreView({ wallet = null, xp = 0, onNavigate, onOpenProfile, onBuy, userId = null, displayName = null, onEditName, navBadges = {}, storeItems = null, busyId = null, isWidget = false, story = null, onStoryOpen, onStoryClose, onStoryGo, storyPrize = null, intro = null, avatarShop = null }) {
  // Coins -> kwacha only through the kwacha packs (gem redemptions were
  // removed 2026-10-12; any still served are ignored).
  const { coinPacks, items, prizes } = splitCatalog(storeItems || STORE_ITEMS);
  const balances = balancesOf(wallet);
  // Real prizes (2026-10-26): shown once the `prizes` row is open, before that
  // to its testers only, who also skip the level lock to preview them.
  const uid = wallet?.uid ?? userId;
  const showPrizes = prizesOpenFor(wallet?.prizes, uid);
  const prizeCards = showPrizes ? shopPrizes(prizes, wallet?.economy) : [];
  const lockWhy = prizesTester(wallet?.prizes, uid) ? null : storeLockReason(getLevel(xp).level, wallet?.store);
  const locked = !!lockWhy;
  const avItems = avatarShop?.items || [];
  const empty = coinPacks.length + prizeCards.length + items.length + avItems.length === 0;
  const topId = coinPacks.length > 1 ? coinPacks[coinPacks.length - 1].id : null;
  return (
    <RedesignShell wallet={wallet} xp={xp} userId={userId} displayName={displayName} onEditName={onEditName} navBadges={navBadges} activeTab="store" onNavigate={onNavigate} onOpenProfile={onOpenProfile}
      isWidget={isWidget} story={story} onStoryOpen={onStoryOpen} onStoryClose={onStoryClose} onStoryGo={onStoryGo} storyPrize={storyPrize} intro={intro}>
      <style dangerouslySetInnerHTML={{ __html: BB_CSS + ST_CSS }} />
      <div className="st-wrap">
        <ShopLockWrap locked={locked}><StoreHero balances={balances} economy={wallet?.economy} coinPacks={coinPacks} /></ShopLockWrap>
        {locked && <ShopLockPlate xp={xp} reason={lockWhy} className="bb-shoplock--static" />}
        <ShopLockWrap locked={locked} className="st-wrap">
        {empty ? (
          <Card style={{ padding: '46px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>🛍️</div>
            <div style={{ fontFamily: CANDY.display, fontSize: 20, color: C.text, marginBottom: 6 }}>Restocking the shelves…</div>
            <div style={{ fontSize: 13, color: C.sub, maxWidth: 340, margin: '0 auto' }}>
              New rewards are on their way — free spins, free bets and exclusive merch.
              Keep earning coins so you're ready when they land!
            </div>
          </Card>
        ) : (
          <>
            {coinPacks.length + prizeCards.length > 0 && (
              <section aria-label="Coin Shop">
                <div className="st-packs">
                  {coinPacks.map((it, i) => <StorePackCard key={it.id} i={i} item={it} balances={balances} onBuy={onBuy} busy={busyId === it.id} top={prizeCards.length === 0 && it.id === topId} />)}
                  {prizeCards.map(c => <StorePrizeCard key={c.prize.id} prize={c.prize} options={c.options} balances={balances} onBuy={onBuy} busyId={busyId} />)}
                </div>
              </section>
            )}
            {avItems.length > 0 && (
              <section aria-labelledby="st-av-title" id="avatar-shop">
                <div className="st-head">
                  <h2 id="st-av-title" className="bb-display st-h2">Avatar shop</h2>
                  <span className="st-note">Your player wears them in every picture · tap Convert twice</span>
                </div>
                <div className="st-packs">
                  {avItems.map(it => (
                    <AvatarItemCard key={it.id} item={it} stage={avatarShop.stage} coins={balances.kwacha}
                      owned={avatarShop.look.owned.includes(it.id)} worn={avatarShop.look.worn.includes(it.id)}
                      onBuy={avatarShop.onBuy} onWear={avatarShop.onWear} />
                  ))}
                </div>
              </section>
            )}
            {items.length > 0 && (
              <section aria-labelledby="st-more-title">
                <div className="st-head"><h2 id="st-more-title" className="bb-display st-h2">More rewards</h2></div>
                <div className="st-items">
                  {items.map(item => <StoreCard key={item.id} item={item} canBuy={canAfford(item.price, balances)} onBuy={onBuy} />)}
                </div>
              </section>
            )}
          </>
        )}
        </ShopLockWrap>
      </div>
    </RedesignShell>
  );
}
