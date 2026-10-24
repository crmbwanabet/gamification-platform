'use client';

// XP collect moments (2026-10-13, design artifact WyNRmfbsYjBfeGSSo8UX2c):
// XP stars (XpStar, the light-blue lettered star) fly from where XP was earned into the header stage bar, the bar
// fills star by star behind a white "incoming" segment, then a chip under it
// says "+20 XP · today 160 / 400". XP over the daily/weekly max flies on as
// XP stars with a green glow into the side hustle stock.
//
// How the bar is held: the header shows `shown`, not user.xp. While any
// collect is pending (`hold`), shown stays put, so the real xp can update
// underneath; when the last collect finishes, shown snaps to the real xp.
// Things that must wait for the stars (the stage-up modal) use whenIdle().
// Moments queue: one plays at a time. Reduced motion: no stars, the bar jumps
// and the chip shows.

import React from 'react';
import { getSubLevel, getXPProgress } from '@/lib/data/platform';
import { starCount } from '@/lib/xp/collect.mjs';
import { CANDY } from './tokens';
import XpStar, { XP_STAR_SRC, XP_BLUE } from './XpStar';

export const XpFxContext = React.createContext(null);

const POP_MS = 120, FLY_MS = 600, GAP_MS = 70, CHIP_MS = 1600, HOLD_MAX_MS = 15000;
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const fmt = (n) => Math.round(n).toLocaleString('en-US');
const centerOf = (el) => {
  const r = el?.getBoundingClientRect?.();
  if (!r || (!r.width && !r.height)) return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
};

export function useXpCollect(xp, reduced, getNote) {
  const [shown, setShownState] = React.useState(xp);
  const [ghost, setGhost] = React.useState(null);   // xp the bar is heading to
  const [chip, setChip] = React.useState(null);     // { id, amount, note }
  const [shine, setShine] = React.useState(0);
  const shownRef = React.useRef(xp);
  const xpRef = React.useRef(xp);
  xpRef.current = xp;
  const reducedRef = React.useRef(reduced);
  reducedRef.current = reduced;
  const noteRef = React.useRef(getNote);
  noteRef.current = getNote;
  const holds = React.useRef(0);
  const idle = React.useRef([]);
  const queue = React.useRef(Promise.resolve());
  const layerRef = React.useRef(null);
  const chipTimer = React.useRef(null);

  const setShown = React.useCallback((v) => { shownRef.current = v; setShownState(v); }, []);
  React.useEffect(() => { if (holds.current === 0) setShown(xp); }, [xp, setShown]);
  React.useEffect(() => () => clearTimeout(chipTimer.current), []);

  const releaseOne = React.useCallback(() => {
    holds.current = Math.max(0, holds.current - 1);
    if (holds.current) return;
    setGhost(null);
    setShown(xpRef.current);
    const fns = idle.current.splice(0);
    // after the bar's last step has painted
    if (fns.length) setTimeout(() => fns.forEach(f => { try { f(); } catch { /* keep going */ } }), 60);
  }, [setShown]);

  /** Freeze the bar now; returns release(). Safe to call twice; auto-releases after 15 s. */
  const hold = React.useCallback(() => {
    holds.current += 1;
    let done = false;
    const t = setTimeout(() => { if (!done) { done = true; releaseOne(); } }, HOLD_MAX_MS);
    return () => { if (!done) { done = true; clearTimeout(t); releaseOne(); } };
  }, [releaseOne]);

  /** Run fn once no collect is pending (now, if none). */
  const whenIdle = React.useCallback((fn) => { if (holds.current) idle.current.push(fn); else fn(); }, []);

  const showChip = React.useCallback((amount, note) => {
    clearTimeout(chipTimer.current);
    setChip({ id: Date.now() + Math.random(), amount, note });
    chipTimer.current = setTimeout(() => setChip(null), reducedRef.current ? 2000 : CHIP_MS);
  }, []);

  const spark = (p, green) => {
    const layer = layerRef.current; if (!layer) return;
    const d = document.createElement('div');
    d.className = `xpfx-spark${green ? ' xpfx-green' : ''}`;
    d.style.left = `${p.x}px`; d.style.top = `${p.y}px`;
    layer.appendChild(d); setTimeout(() => d.remove(), 400);
  };

  // One star: pop out of the source, then an ease-in arc into target() (re-read every frame).
  const flyStar = (from, target, i, green) => new Promise(res => {
    const layer = layerRef.current;
    if (!layer) { res(); return; }
    const o = document.createElement('div');
    o.className = `xpfx-star${green ? ' xpfx-green' : ''}`;
    layer.appendChild(o);
    const ang = (-90 + (i % 2 ? 1 : -1) * (20 + Math.random() * 50)) * Math.PI / 180;
    const dist = 26 + Math.random() * 18;
    const pop = { x: from.x + Math.cos(ang) * dist, y: from.y + Math.sin(ang) * dist };
    const t0 = performance.now();
    const step = (now) => {
      const t = now - t0;
      let x, y, sc;
      if (t < POP_MS) {
        const e = 1 - Math.pow(1 - t / POP_MS, 3);
        x = from.x + (pop.x - from.x) * e; y = from.y + (pop.y - from.y) * e; sc = 0.4 + 0.8 * e;
      } else {
        const k = Math.min(1, (t - POP_MS) / FLY_MS);
        const e = k * k * (3 - 2 * k) * 0.35 + k * k * 0.65;
        const end = target();
        const c = { x: (pop.x + end.x) / 2 + 40, y: Math.min(pop.y, end.y) - 60 };
        x = (1 - e) * (1 - e) * pop.x + 2 * (1 - e) * e * c.x + e * e * end.x;
        y = (1 - e) * (1 - e) * pop.y + 2 * (1 - e) * e * c.y + e * e * end.y;
        sc = 1.2 - 0.5 * e;
        if (k >= 1) { o.remove(); spark(end, green); res(); return; }
      }
      o.style.transform = `translate(${x}px, ${y}px) scale(${sc}) rotate(${Math.sin(t / 90) * 14}deg)`; // a wobble, so the XP letters stay readable
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });

  const barEdge = () => {
    const bar = document.querySelector('[data-xp-bar]');
    const r = bar?.getBoundingClientRect?.();
    if (!r || !r.width) return { x: window.innerWidth / 2, y: 30 };
    return { x: r.left + r.width * getXPProgress(shownRef.current) / 100, y: r.top + r.height / 2 };
  };

  /**
   * Queue a collect. opts:
   *   from     — element the stars burst out of (null = screen centre)
   *   fromAt   — () => element, looked up when the collect starts (wins over `from`)
   *   amount   — XP for the bar; capped at run time by what the real xp actually gained
   *   startXp  — bar start (default: what the bar shows now); a function (shown, xp) => start is read when it starts
   *   overflow — XP that flies on to the side hustle ([data-hustle-target]) as green stars
   *   delay    — ms before it starts (lets a coin float go first)
   *   onStart  — called when it starts playing
   * Holds the bar from the call on, so the real xp can land meanwhile.
   * Returns a promise that settles when it has played.
   */
  const collect = React.useCallback((opts = {}) => {
    const release = hold();
    // where `from` is NOW: a claim button can be replaced before the stars launch
    const fromNow = typeof window !== 'undefined' ? centerOf(opts.from) : null;
    const run = async () => {
      try {
        if (opts.delay) await wait(reducedRef.current ? 0 : opts.delay);
        opts.onStart?.();
        // startXp may be a function of (shown, real xp), read when the collect starts
        const start = typeof opts.startXp === 'function' ? opts.startXp(shownRef.current, xpRef.current) : (opts.startXp ?? shownRef.current);
        const gained = Math.max(0, xpRef.current - start);
        const amount = Math.max(0, Math.min(Math.floor(opts.amount ?? gained), gained));
        const overflow = Math.max(0, Math.floor(opts.overflow || 0));
        const atEl = opts.fromAt?.();
        const from = atEl ? centerOf(atEl) : fromNow;
        if (opts.startXp != null) setShown(start);
        const end = start + amount;
        if (reducedRef.current || typeof window === 'undefined') {
          setShown(end);
          if (amount) showChip(amount, noteRef.current?.(overflow > 0) || '');
          return;
        }
        if (amount > 0) {
          const n = starCount(amount);
          let got = 0;
          await Promise.all(Array.from({ length: n }, (_, i) => wait(i * GAP_MS).then(() => flyStar(from, barEdge, i).then(() => {
            got += 1;
            if (got === 1) setGhost(end);
            setShown(start + Math.round(amount * got / n));
          }))));
          setShine(s => s + 1);
          showChip(amount, noteRef.current?.(overflow > 0) || '');
        } else if (!overflow) {
          showChip(0, noteRef.current?.(true) || '');
        }
        if (overflow > 0) {
          const target = () => centerOf(document.querySelector('[data-hustle-target]'));
          if (document.querySelector('[data-hustle-target]')) {
            const o = amount > 0 ? barEdge() : from;
            const n = Math.max(4, Math.min(10, Math.round(overflow / 15)));
            await Promise.all(Array.from({ length: n }, (_, i) => wait(i * GAP_MS).then(() => flyStar(o, target, i, true))));
          }
        }
      } finally {
        release();
      }
    };
    const p = queue.current.then(run, run);
    queue.current = p.catch(() => {});
    return p;
  }, [hold, setShown, showChip]);

  /** Gold ring off the header avatar (the stage-up beat before the modal). */
  const ring = React.useCallback(() => {
    if (reducedRef.current) return;
    const ava = document.querySelector('.rs-ava');
    const layer = layerRef.current;
    if (!ava || !layer) return;
    const p = centerOf(ava);
    const d = document.createElement('div');
    d.className = 'xpfx-ring';
    d.style.left = `${p.x}px`; d.style.top = `${p.y}px`;
    layer.appendChild(d); setTimeout(() => d.remove(), 750);
  }, []);

  const layer = <div ref={layerRef} className="xpfx-layer" aria-hidden="true"><style dangerouslySetInnerHTML={{ __html: XP_FX_CSS }} /></div>;

  // ghost only while it is ahead of the bar; a stage crossing shows it to the end
  const ghostPct = ghost == null || ghost <= shown ? null
    : getSubLevel(ghost).index > getSubLevel(shown).index ? 100 : getXPProgress(ghost);

  return React.useMemo(() => ({ shown, ghostPct, chip, shine, collect, hold, whenIdle, ring, layer }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shown, ghostPct, chip, shine, collect, hold, whenIdle, ring]);
}

/** "+20 XP · today 160 / 400" — hangs under the header stage bar after a collect. */
export function XpChip({ chip }) {
  if (!chip) return null;
  return (
    <span key={chip.id} className="xpfx-chip" role="status">
      <XpStar size={18} style={{ alignSelf: 'center' }} />
      <b>{chip.amount > 0 ? `+${fmt(chip.amount)} XP` : 'XP full today'}</b>
      {chip.note && <small>{chip.note}</small>}
    </span>
  );
}

/**
 * The "+86 XP from your bets" card: drops under the header when the season
 * feed (or the casino-rounds feed) brings XP the player hasn't seen. One row
 * per source; each row's XP is collected in turn from its chip. Tap closes it
 * (the XP still lands). card = { id, title, rows: [{ key, label, sub, bar, hustle }], release }.
 */
export function XpFeedCard({ card, collect, onDone }) {
  const chipRefs = React.useRef({});
  const [top, setTop] = React.useState(76);
  const [open, setOpen] = React.useState(false);
  const [sent, setSent] = React.useState({});
  React.useEffect(() => {
    if (!card) return undefined;
    let alive = true;
    const bar = document.querySelector('.rs-topbar');
    if (bar) setTop(Math.round(bar.getBoundingClientRect().bottom) + 8);
    setSent({});
    requestAnimationFrame(() => alive && setOpen(true));
    (async () => {
      await wait(450);
      if (!alive) return;
      const plays = card.rows.map(r => collect({
        fromAt: () => chipRefs.current[r.key], amount: r.bar, overflow: r.hustle,
        onStart: () => alive && setSent(s => ({ ...s, [r.key]: 'go' })),
      }).then(() => alive && setSent(s => ({ ...s, [r.key]: 'done' }))));
      card.release?.(); // the row collects hold the bar from here
      await Promise.all(plays);
      await wait(1600);
      if (!alive) return;
      setOpen(false);
      await wait(400);
      onDone?.();
    })();
    return () => { alive = false; card.release?.(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card?.id]);
  if (!card) return null;
  return (
    <div className={`xpfx-card${open ? ' xpfx-open' : ''}`} style={{ top }} role="status" aria-live="polite" onClick={() => setOpen(false)}>
      <div className="xpfx-card-t">{card.title}</div>
      <div className="xpfx-card-why">Since your last visit, on bwanabet</div>
      {card.rows.map(r => (
        <div key={r.key} className="xpfx-row">
          <span className="xpfx-row-l">{r.label}{r.sub && <small>{r.sub}</small>}</span>
          <span ref={el => { chipRefs.current[r.key] = el; }} className={`xpfx-tag${r.bar ? '' : ' xpfx-tag-green'}${sent[r.key] === 'done' ? ' xpfx-sent' : ''}`}><XpStar size={16} />+{fmt(r.bar + r.hustle)} XP</span>
        </div>
      ))}
      <div className="xpfx-card-tap">Tap to close</div>
    </div>
  );
}

const O = CANDY.outline;
export const XP_FX_CSS = `
  .xpfx-layer { position: fixed; inset: 0; z-index: 250; pointer-events: none; overflow: hidden; }
  .xpfx-star { position: absolute; left: 0; top: 0; width: 22px; height: 22px; margin: -11px 0 0 -11px; will-change: transform;
    background: url(${XP_STAR_SRC}) center / contain no-repeat;
    filter: drop-shadow(0 0 4px rgba(127,216,255,.9)); }
  .xpfx-star.xpfx-green { filter: drop-shadow(0 0 5px rgba(123,227,79,.95)); }
  .xpfx-spark { position: absolute; width: 22px; height: 22px; margin: -11px 0 0 -11px; border-radius: 50%; border: 2px solid ${XP_BLUE}; animation: xpfx-spark .35s ease-out forwards; }
  .xpfx-spark.xpfx-green { border-color: ${CANDY.green.light}; }
  @keyframes xpfx-spark { from { transform: scale(.3); opacity: 1; } to { transform: scale(1.6); opacity: 0; } }
  .xpfx-ring { position: absolute; width: 56px; height: 56px; margin: -28px 0 0 -28px; border-radius: 50%; border: 3px solid ${CANDY.gold}; animation: xpfx-ring .7s ease-out forwards; }
  @keyframes xpfx-ring { from { transform: scale(.8); opacity: 1; } to { transform: scale(2.4); opacity: 0; } }

  /* right-aligned under the bar: the "My story" bubble sits under the avatar on the left */
  .xpfx-chip { position: absolute; right: 0; top: calc(100% + 5px); z-index: 20; display: inline-flex; align-items: baseline; gap: 6px; padding: 3px 9px 4px; border-radius: 10px;
    background: ${O}; border: 2px solid ${XP_BLUE}; box-shadow: 0 3px 0 #16042F; white-space: nowrap; pointer-events: none;
    transform-origin: calc(100% - 20px) 0; animation: xpfx-chip-in .32s cubic-bezier(.3,1.5,.5,1) both, xpfx-chip-out .3s ease-in ${CHIP_MS - 300}ms forwards; }
  .xpfx-chip b { font-family: ${CANDY.display}; font-weight: 400; font-size: 16px; color: ${XP_BLUE}; }
  .xpfx-chip small { font-size: 10.5px; font-weight: 800; color: rgba(255,255,255,.75); }
  @keyframes xpfx-chip-in { from { transform: scale(.4) translateY(-8px); opacity: 0; } }
  @keyframes xpfx-chip-out { to { transform: translateY(-6px); opacity: 0; } }

  .xpfx-bar { position: relative; }
  .xpfx-ghost { position: absolute; inset: 0 auto 0 0; border-radius: 99px; background: rgba(255,255,255,.85); transition: width .18s ease-out; }
  .xpfx-shine { position: absolute; inset: 0; border-radius: 99px; pointer-events: none; background: linear-gradient(90deg, transparent, rgba(255,255,255,.95), transparent); animation: xpfx-shine .55s ease-out forwards; }
  @keyframes xpfx-shine { from { transform: translateX(-100%); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
  .xpfx-bump { animation: xpfx-bump .28s cubic-bezier(.3,1.6,.5,1); }
  @keyframes xpfx-bump { 50% { transform: scale(1.15); } }

  .xpfx-card { position: fixed; left: 50%; z-index: 70; width: min(440px, calc(100vw - 20px)); box-sizing: border-box; padding: 12px 12px 8px; border-radius: 16px; cursor: pointer;
    font-family: ${CANDY.body}; color: #fff; background: linear-gradient(180deg, #3a137a, #1d0742); border: 2.5px solid ${CANDY.gold};
    box-shadow: 0 0 0 1.5px ${CANDY.goldDeep}, 0 14px 30px rgba(0,0,0,.55);
    transform: translate(-50%, calc(-100% - 120px)); transition: transform .42s cubic-bezier(.2,1.2,.4,1); }
  .xpfx-card.xpfx-open { transform: translate(-50%, 0); }
  .xpfx-card-t { font-family: ${CANDY.display}; font-size: 18px; color: ${CANDY.gold}; line-height: 1.1; }
  .xpfx-card-why { font-size: 12px; font-weight: 700; color: rgba(255,255,255,.72); margin: 2px 0 8px; }
  .xpfx-row { display: flex; align-items: center; gap: 8px; padding: 6px 0; border-top: 1px solid rgba(255,255,255,.12); font-size: 13px; font-weight: 800; }
  .xpfx-row-l { flex: 1; min-width: 0; }
  .xpfx-row-l small { display: block; font-size: 11px; font-weight: 700; color: rgba(255,255,255,.58); }
  .xpfx-tag { flex: none; display: inline-flex; align-items: center; gap: 4px; font-family: ${CANDY.display}; font-size: 15px; color: ${XP_BLUE}; padding: 2px 8px; border-radius: 8px; background: ${O}; border: 1.5px solid ${XP_BLUE}; font-variant-numeric: tabular-nums; transition: opacity .25s, transform .25s; }
  .xpfx-tag-green { color: ${CANDY.green.light}; border-color: ${CANDY.green.fill}; }
  .xpfx-sent { opacity: .35; transform: scale(.9); }
  .xpfx-card-tap { text-align: center; font-size: 11px; font-weight: 700; color: rgba(255,255,255,.5); margin-top: 4px; }
  @media (prefers-reduced-motion: reduce) {
    .xpfx-card { transition: none; } .xpfx-ghost { transition: none; }
    .xpfx-chip { animation: none; } .xpfx-shine, .xpfx-bump { animation: none; }
  }
`;
