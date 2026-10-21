'use client';

import React from 'react';
import { CANDY, COIN_ICON } from './tokens';
import { GEMS } from '@/lib/economy/currency.mjs';
import { amountText } from '@/lib/rewardText.mjs';
import { actionWord } from '@/lib/welcome/summary.mjs';

const GEM_ICON = { emeralds: '/ui/gems/emerald.svg', rubies: '/ui/gems/ruby.svg', diamonds: '/ui/gems/diamond.svg' };
const fmt = (n) => Math.round(Number(n) || 0).toLocaleString('en-US');
const wait = (ms) => new Promise(r => setTimeout(r, ms));

const WB_CSS = `
  .wb-ov { position: fixed; left: 0; right: 0; bottom: 0; z-index: 58; display: flex; align-items: flex-start; justify-content: center;
    padding: 10px 10px calc(10px + env(safe-area-inset-bottom)); box-sizing: border-box; background: rgba(8,4,20,.82); animation: wbFade .25s ease-out both; }
  .wb-ov.closing { animation: wbFadeOut .4s ease-in forwards; pointer-events: none; }
  .wb { position: relative; width: 100%; max-width: 480px; max-height: 100%; display: flex; flex-direction: column; box-sizing: border-box; border-radius: 22px; padding: 5px;
    background: linear-gradient(180deg, #ffe46b, ${CANDY.goldDeep}); box-shadow: 0 0 0 1.5px #7a4a00, 0 18px 50px rgba(0,0,0,.6);
    animation: wbPop .45s cubic-bezier(.22,1.3,.36,1) both; font-family: ${CANDY.body}; color: #fff; }
  .wb-ov.closing .wb { animation: wbOut .4s ease-in forwards; }
  .wb-in { display: flex; flex-direction: column; min-height: 0; border-radius: 17px; overflow: hidden;
    background: radial-gradient(120% 50% at 50% 0%, ${CANDY.glow}, ${CANDY.bgTop} 55%, ${CANDY.bgBottom}); }
  .wb-x { all: unset; box-sizing: border-box; position: absolute; top: -8px; right: -6px; z-index: 3; width: 40px; height: 40px; border-radius: 50%; cursor: pointer;
    display: grid; place-items: center; font: 900 19px/1 ${CANDY.body}; color: #fff;
    background: linear-gradient(180deg, ${CANDY.red.light}, ${CANDY.red.fill}); border: 3px solid ${CANDY.red.dark}; box-shadow: 0 3px 0 ${CANDY.red.dark}; }
  .wb-x:focus-visible, .wb-go:focus-visible { outline: 3px solid ${CANDY.gold}; outline-offset: 2px; }
  .wb-head { padding: 14px 44px 8px; text-align: center; }
  .wb-ttl { margin: 0; font-family: ${CANDY.display}; font-weight: 400; font-size: 30px; line-height: 1; color: ${CANDY.gold}; text-transform: uppercase; text-shadow: 0 3px 0 ${CANDY.outline}; }
  .wb-head p { margin: 6px 0 0; font-size: 14px; font-weight: 900; color: #D7C6F2; }
  .wb-body { position: relative; overflow-y: auto; overscroll-behavior: contain; padding: 2px 10px 12px; display: grid; gap: 14px; align-content: start; scrollbar-width: thin; }
  .wb-sec h3 { margin: 0 0 7px; display: flex; justify-content: space-between; align-items: baseline; gap: 8px; font-family: ${CANDY.display}; font-weight: 400; font-size: 17px; letter-spacing: .06em; text-transform: uppercase; }
  .wb-sec h3 small { font-family: ${CANDY.body}; font-weight: 900; font-size: 12.5px; letter-spacing: 0; text-transform: none; color: #D7C6F2; }
  .wb-got h3 { color: ${CANDY.green.light}; } .wb-near h3 { color: #3FD8F2; } .wb-todo h3 { color: #fff; } .wb-next h3 { color: #9C89BE; }
  .wb-it { display: grid; grid-template-columns: 30px minmax(0, 1fr) auto; align-items: center; gap: 10px; padding: 11px 10px; border-radius: 14px;
    background: rgba(20,4,48,.6); border: 2px solid rgba(255,255,255,.1); transition: border-color .3s, background .3s; }
  .wb-it + .wb-it { margin-top: 7px; }
  .wb-box { width: 30px; height: 30px; box-sizing: border-box; border-radius: 9px; display: grid; place-items: center; border: 2.5px solid rgba(255,255,255,.4); background: rgba(0,0,0,.25); }
  .wb-box svg { width: 19px; height: 19px; }
  .wb-got .wb-box svg { opacity: 0; transform: scale(.3); transition: transform .3s cubic-bezier(.3,1.6,.5,1), opacity .2s; }
  .wb-got .wb-it { border-color: rgba(123,227,79,.4); }
  .wb-it.now { border-color: ${CANDY.gold} !important; background: rgba(255,210,31,.13); }
  .wb-it.done .wb-box { background: ${CANDY.green.fill}; border-color: ${CANDY.green.light}; }
  .wb-it.done .wb-box svg { opacity: 1; transform: none; }
  .wb-nm { min-width: 0; display: grid; gap: 3px; }
  .wb-nm b { font-family: ${CANDY.display}; font-weight: 400; font-size: 17px; line-height: 1.12; letter-spacing: .01em; text-transform: uppercase; overflow-wrap: anywhere; }
  .wb-nm b em { font-style: normal; color: ${CANDY.gold}; }
  .wb-nm small { font-size: 12.5px; font-weight: 900; color: #D7C6F2; }
  .wb-go-txt { color: #3FD8F2; }
  .wb-pb { height: 8px; border-radius: 5px; background: rgba(0,0,0,.45); overflow: hidden; margin-top: 2px; }
  .wb-pb span { display: block; height: 100%; border-radius: 5px; background: #3FD8F2; }
  .wb-todo .wb-pb span { background: #8a7bb0; }
  .wb-rws { display: grid; gap: 3px; justify-items: end; }
  .wb-rw { display: flex; align-items: center; gap: 5px; font-family: ${CANDY.display}; font-size: 17px; line-height: 1; white-space: nowrap; text-transform: uppercase; font-variant-numeric: tabular-nums; }
  .wb-rw img { width: 22px; height: 22px; display: block; flex: none; }
  .wb-rw.x { font-size: 15px; color: ${CANDY.gold}; }
  .wb-rw.g { font-size: 14px; }
  .wb-it.done .wb-rws { opacity: .45; transition: opacity .4s .3s; }
  /* phones: the prize sits under the task, so the task keeps the row's width */
  @media (max-width: 860px) {
    .wb-it { grid-template-columns: 30px minmax(0, 1fr); grid-template-areas: 'box nm' 'box rws'; row-gap: 6px; }
    .wb-box { grid-area: box; } .wb-nm { grid-area: nm; }
    .wb-rws { grid-area: rws; display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-start; gap: 4px 14px; }
  }
  .wb-next .wb-it { opacity: .62; border-style: dashed; }
  .wb-next .wb-box { border-style: dashed; }
  .wb-next .wb-box svg { width: 15px; height: 15px; }
  .wb-foot { padding: 10px; border-top: 1px solid rgba(255,255,255,.12); background: rgba(18,6,40,.65); }
  .wb-total { display: flex; justify-content: center; align-items: center; gap: 6px 12px; flex-wrap: wrap; margin-bottom: 9px; font-family: ${CANDY.display}; font-size: 18px; text-transform: uppercase; }
  .wb-total span { display: inline-flex; align-items: center; gap: 5px; }
  .wb-total img { width: 21px; height: 21px; }
  .wb-total .x { color: ${CANDY.gold}; }
  .wb-total .lbl { font-family: ${CANDY.body}; font-weight: 900; font-size: 13px; color: #D7C6F2; text-transform: none; }
  .wb-go { all: unset; box-sizing: border-box; display: block; width: 100%; text-align: center; cursor: pointer; border-radius: 14px; padding: 13px 8px;
    font-family: ${CANDY.display}; font-size: 18px; line-height: 1.1; text-transform: uppercase; color: #fff; background: linear-gradient(180deg, #5BE37A, #1E9E44);
    border: 2.5px solid #0f5a25; box-shadow: 0 3px 0 #0f5a25; text-shadow: 0 2px 0 #0f5a25; }
  .wb-go:active:not([disabled]) { transform: translateY(2px); box-shadow: 0 1px 0 #0f5a25; }
  .wb-go[disabled] { opacity: .65; cursor: default; }
  .rs-topbar { transition: box-shadow .3s; }
  .rs-topbar.wb-lit { box-shadow: 0 2px 0 ${CANDY.goldDeep}, 0 6px 28px rgba(255,210,31,.5), 0 8px 20px rgba(0,0,0,.4); }
  @keyframes wbFade { from { opacity: 0; } }
  @keyframes wbFadeOut { to { opacity: 0; } }
  @keyframes wbPop { from { opacity: 0; transform: scale(.9) translateY(18px); } }
  @keyframes wbOut { to { opacity: 0; transform: scale(.92) translateY(24px); } }
  @media (min-width: 861px) {
    .wb-ov { padding: 18px; }
    .wb { max-width: 820px; }
    .wb-ttl { font-size: 36px; }
    .wb-body { grid-template-columns: 1fr 1fr; gap: 14px 18px; padding: 4px 16px 16px; }
    .wb-body .wb-got { grid-row: span 3; }
    .wb-rw { font-size: 19px; }
    .wb-foot { display: flex; align-items: center; gap: 16px; padding: 12px 16px; }
    .wb-total { margin: 0; flex: 1; justify-content: flex-start; }
    .wb-go { width: 340px; flex: none; }
  }
  @media (prefers-reduced-motion: reduce) {
    .wb-ov, .wb, .wb-ov.closing, .wb-ov.closing .wb { animation: none !important; }
    .wb-it, .wb-box svg, .wb-rws, .rs-topbar { transition: none !important; }
  }
`;

const TICK = <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>;
const LOCK = <svg viewBox="0 0 24 24" fill="none" stroke="#C9B8E8" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>;

function Terms({ text }) {
  const verb = actionWord(text);
  return <><em>{verb}</em>{text.slice(verb.length)}</>;
}

function Prize({ row }) {
  const r = row.reward || {};
  return (
    <span className="wb-rws">
      {r.kwacha > 0 && <span className="wb-rw" data-c><img src={COIN_ICON} alt="" />{amountText(r.kwacha, 'coins')}</span>}
      {row.xp > 0 && <span className="wb-rw x" data-x>+{fmt(row.xp)} XP</span>}
      {GEMS.filter(g => r[g] > 0).map(g => <span key={g} className="wb-rw g" data-gem={g}><img src={GEM_ICON[g]} alt="" />{amountText(r[g], g)}</span>)}
    </span>
  );
}

function Row({ row, box, state = '', rowRef }) {
  return (
    <div ref={rowRef} className={`wb-it${state ? ` ${state}` : ''}`}>
      <span className="wb-box">{box}</span>
      <span className="wb-nm">
        <b><Terms text={row.terms} /></b>
        <small>{row.sub}{row.go && <> · <span className="wb-go-txt">{row.go}</span></>}</small>
        {row.pct != null && !row.locked && <span className="wb-pb"><span style={{ width: `${Math.max(0, Math.min(100, row.pct))}%` }} /></span>}
      </span>
      <Prize row={row} />
    </div>
  );
}

/**
 * "WELCOME BACK!" pop-up (2026-10-21): opens under the app header (the dim
 * layer starts below it, so the wallet and the stage bar stay in view). After
 * ~0.9 s each YOU GOT row ticks itself in turn: `onTick(row, el)` credits it
 * and launches its coins / gems / XP stars at the header. Then the button
 * enables with the next goal. X / Escape / the button call onClose (the
 * platform credits whatever has not ticked yet, without the flights).
 * plan = welcomeSummary() + { id, subtitle } (lib/welcome/summary.mjs).
 */
export default function WelcomeBackPopup({ open = false, closing = false, plan = null, reduced = false, onTick, onFinished, onClose }) {
  const [nowKey, setNowKey] = React.useState(null);
  const [done, setDone] = React.useState(() => new Set());
  const [ready, setReady] = React.useState(false);
  const bodyRef = React.useRef(null);
  const btnRef = React.useRef(null);
  const rowRefs = React.useRef({});
  const nearRef = React.useRef(null);
  const tickRef = React.useRef(onTick); tickRef.current = onTick;
  const finRef = React.useRef(onFinished); finRef.current = onFinished;
  const closingRef = React.useRef(closing); closingRef.current = closing;

  // sit below the header, wherever it ends (phone / desktop / widget strip);
  // measured at render, re-rendered on resize
  const [, setResized] = React.useState(0);
  React.useEffect(() => {
    if (!open) return undefined;
    const onResize = () => setResized(n => n + 1);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [open]);

  // Escape closes
  React.useEffect(() => {
    if (!open || closing) return undefined;
    const onKey = (e) => { if (e.key === 'Escape' && onClose) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, closing, onClose]);

  // the auto-collect sequence
  React.useEffect(() => {
    if (!open || !plan) return undefined;
    let alive = true;
    const live = () => alive && !closingRef.current;
    const header = document.querySelector('.rs-topbar');
    const ms = (n) => (reduced ? 0 : n);
    setDone(new Set()); setNowKey(null); setReady(false);
    (async () => {
      await wait(ms(900));
      if (!live()) return;
      header?.classList.add('wb-lit');
      const body = bodyRef.current;
      for (const row of plan.got) {
        if (!live()) return;
        const el = rowRefs.current[row.key];
        // keep the row in view inside the pop-up body only (never the page)
        if (body && el) body.scrollTo({ top: Math.max(0, el.offsetTop - 40), behavior: reduced ? 'auto' : 'smooth' });
        setNowKey(row.key);
        await wait(ms(260));
        if (!live()) return;
        setDone(d => new Set(d).add(row.key));
        try { tickRef.current?.(row, el); } catch { /* the flush on close still credits it */ }
        await wait(ms(760));
      }
      if (!live()) return;
      setNowKey(null);
      header?.classList.remove('wb-lit');
      const wide = window.matchMedia('(min-width: 861px)').matches;
      if (body) body.scrollTo({ top: wide || !nearRef.current ? 0 : Math.max(0, nearRef.current.offsetTop - 6), behavior: reduced ? 'auto' : 'smooth' });
      setReady(true);
      finRef.current?.();
      requestAnimationFrame(() => btnRef.current?.focus({ preventScroll: true }));
    })();
    return () => { alive = false; header?.classList.remove('wb-lit'); };
  }, [open, plan?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    if (closing) document.querySelector('.rs-topbar')?.classList.remove('wb-lit');
  }, [closing]);

  if (!open || !plan) return null;
  const bar = typeof document !== 'undefined' ? document.querySelector('.rs-topbar') : null;
  const top = bar ? Math.max(0, Math.round(bar.getBoundingClientRect().bottom)) : 0;
  const t = plan.total || {};
  const got = plan.got || [];
  return (
    <div className={`wb-ov${closing ? ' closing' : ''}`} style={{ top }} data-welcome-back>
      <style dangerouslySetInnerHTML={{ __html: WB_CSS }} />
      <div className="wb" role="dialog" aria-modal="true" aria-labelledby="wb-title">
        <button type="button" className="wb-x" onClick={onClose} aria-label="Close">✕</button>
        <div className="wb-in">
          <div className="wb-head">
            <h2 id="wb-title" className="wb-ttl">Welcome back!</h2>
            <p>{plan.subtitle || 'Here is what you earned'}</p>
          </div>
          <div className="wb-body" ref={bodyRef}>
            <section className="wb-sec wb-got">
              <h3>You got <small aria-live="polite">{done.size} of {got.length}</small></h3>
              {got.map(row => (
                <Row key={row.key} row={row} box={TICK} rowRef={el => { rowRefs.current[row.key] = el; }}
                  state={[nowKey === row.key ? 'now' : '', done.has(row.key) ? 'done' : ''].filter(Boolean).join(' ')} />
              ))}
            </section>
            {plan.near.length > 0 && (
              <section className="wb-sec wb-near" ref={nearRef}>
                <h3>Almost there <small>keep going</small></h3>
                {plan.near.map(row => <Row key={row.key} row={row} box={null} />)}
              </section>
            )}
            {plan.todo.length > 0 && (
              <section className="wb-sec wb-todo">
                <h3>Still to do</h3>
                {plan.todo.map(row => <Row key={row.key} row={row} box={null} />)}
              </section>
            )}
            {plan.next.length > 0 && (
              <section className="wb-sec wb-next">
                <h3>Next missions</h3>
                {plan.next.map(row => <Row key={row.key} row={row} box={LOCK} />)}
              </section>
            )}
          </div>
          <div className="wb-foot">
            <div className="wb-total">
              <span className="lbl">Total</span>
              {t.kwacha > 0 && <span><img src={COIN_ICON} alt="" />{amountText(t.kwacha, 'coins')}</span>}
              {t.xp > 0 && <span className="x">+{fmt(t.xp)} XP</span>}
              {GEMS.filter(g => t[g] > 0).map(g => <span key={g}><img src={GEM_ICON[g]} alt="" />{amountText(t[g], g)}</span>)}
            </div>
            <button ref={btnRef} type="button" className="wb-go" disabled={!ready} onClick={onClose}>{ready ? plan.goal : 'Collecting…'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
