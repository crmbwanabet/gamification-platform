/* BwanaBet Bonus Center — embeddable widget for bwanabet (desktop + mobile).
 *
 * Usage on the host page (one line, every page, anywhere in <head> or <body>):
 *   <script src="https://bonus.bwanabet.dev/widget.js" defer></script>
 *
 * Optional settings, BEFORE that line:
 *   <script>window.BWANABET_BONUS = { launcher: false };</script>
 *     launcher: false  -> no floating bubble; open it from your own button:
 *                         <button onclick="BwanaBetBonus.open()">Bonus Center</button>
 *     uid: '123456'    -> player ID to display (normally read from the token cookie)
 *     preview: true    -> the preview page: the wheel in its TEST mode (never pays)
 *   (window.X100_WIDGET is still read, for older embeds.)
 * Page API: BwanaBetBonus.open(), BwanaBetBonus.close().
 * A page URL with ?bonus=open opens the Bonus Center on load (SMS links).
 *
 * ONE launcher for the Wheel of Fortune and the Bonus Center: the wheel's gift
 * box while today's spin is open (opens the wheel first), the K coin after it.
 * Renders a floating launcher bubble (bottom-LEFT, owner 2026-10-22). Clicking it opens the
 * platform in a full-screen iframe popup under a top strip that holds the big
 * red close X (2026-10-21): the iframe starts BELOW the strip, so nothing in
 * the app (games, pop-ups, the wheel) can ever sit under the button. The app
 * can still close the popup itself (postMessage '100x-widget:close'); it is
 * opened with &strip=1 so it hides its own X. The launcher itself can
 * be dismissed via its own red X badge — it stays hidden while the visitor
 * browses between pages, but comes back on a page RELOAD.
 */
(function () {
  'use strict';
  if (window.__x100WidgetLoaded) return;
  window.__x100WidgetLoaded = true;

  var APP_ORIGIN = (function () {
    // serve the app from wherever this script was loaded
    var s = document.currentScript && document.currentScript.src;
    try { return s ? new URL(s).origin : 'https://bonus.bwanabet.dev'; }
    catch (e) { return 'https://bonus.bwanabet.dev'; }
  })();
  var HIDE_KEY = 'x100-widget-hidden';
  var cfg = window.BWANABET_BONUS || window.X100_WIDGET || {};

  // SSO: the player's bwanabet session lives in the host page's `token`
  // cookie (JS-readable JWT). Read it fresh each time (it refreshes on the
  // host), skip it once expired, and hand it to the iframe by postMessage —
  // the app's server validates it (/api/session). Without this hand-off the
  // app runs anonymous: no player ID, no daily reward, no saved progress.
  // The token is never put in the iframe URL or logged.
  function readToken() {
    try {
      var m = document.cookie.match(/(?:^|;\s*)token=([^;]+)/);
      if (!m) return null;
      var t = decodeURIComponent(m[1]);
      var p = tokenClaims(t);
      if (p && p.exp && p.exp * 1000 < Date.now()) return null;
      return t;
    } catch (e) { return null; }
  }
  function tokenClaims(t) {
    try {
      var b = t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      while (b.length % 4) b += '=';
      return JSON.parse(atob(b));
    } catch (e) { return null; }
  }
  // Display-only player ID for the iframe URL (the header shows it even
  // before / without the session exchange); identity is still decided server-side.
  function currentUid() {
    if (cfg.uid) return String(cfg.uid);
    var t = readToken();
    var p = t && tokenClaims(t);
    return p && p.id != null ? String(p.id) : '';
  }

  // Dismissed = hidden while the visitor moves between pages (nav type
  // 'navigate'/'back_forward'), but an explicit RELOAD clears the flag so the
  // launcher returns. sessionStorage alone would survive reloads too.
  try {
    var navEntry = performance.getEntriesByType && performance.getEntriesByType('navigation')[0];
    var navType = navEntry ? navEntry.type
      : (performance.navigation && performance.navigation.type === 1 ? 'reload' : '');
    if (navType === 'reload') sessionStorage.removeItem(HIDE_KEY);
  } catch (e) { /* very old browsers: keep sessionStorage behaviour */ }

  var hidden = false;
  try { hidden = sessionStorage.getItem(HIDE_KEY) === '1'; } catch (e) { /* storage blocked */ }
  var showLauncher = cfg.launcher !== false && !hidden;

  /* ---------- styles ---------- */
  var css = [
    // Bonus Center icon (owner 2026-10-22): the daily reward's treasure chest IS the button,
    // filling it, opening and shutting like on the daily reward card
    '.x100w-launcher{position:fixed;bottom:calc(20px + env(safe-area-inset-bottom,0px));left:calc(20px + env(safe-area-inset-left,0px));z-index:2147483000;width:64px;height:64px;border-radius:50%;padding:0;',
    'background:transparent;border:0;cursor:pointer;display:grid;place-items:center;',
    'transition:transform .15s ease;-webkit-tap-highlight-color:transparent;}',
    '.x100w-launcher:hover{transform:scale(1.07);}',
    '.x100w-launcher img{display:block;width:72px;height:auto;object-fit:contain;pointer-events:none;',
    'filter:drop-shadow(0 6px 10px rgba(0,0,0,.45));}',
    '.x100w-dismiss{position:absolute;top:-6px;right:-6px;width:22px;height:22px;border-radius:50%;border:1.5px solid rgba(255,255,255,.5);',
    'background:#111;color:#fff;font:900 12px/1 Arial,sans-serif;display:grid;place-items:center;cursor:pointer;',
    'box-shadow:0 3px 8px rgba(0,0,0,.45);}',
    '.x100w-overlay{position:fixed;inset:0;z-index:2147483001;background:rgba(8,10,16,.6);display:none;}',
    '.x100w-overlay.open{display:block;}',
    // top strip + big red X; the frame starts under it (--x100w-bar)
    '.x100w-overlay{--x100w-bar:calc(60px + env(safe-area-inset-top,0px));}',
    '.x100w-bar{position:absolute;top:0;left:0;right:0;height:var(--x100w-bar);box-sizing:border-box;',
    'padding:env(safe-area-inset-top,0px) max(10px,env(safe-area-inset-right,0px)) 0 max(16px,env(safe-area-inset-left,0px));',
    'display:flex;align-items:center;gap:12px;background:#120a24;border-bottom:1px solid rgba(255,255,255,.1);',
    'box-shadow:0 2px 10px rgba(0,0,0,.35);}',
    '.x100w-title{flex:1;min-width:0;color:#FEF200;font:900 15px/1.1 "Arial Black",Arial,sans-serif;letter-spacing:.04em;',
    'text-transform:uppercase;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}',
    '.x100w-close{flex:none;width:48px;height:48px;border-radius:50%;border:2px solid rgba(255,255,255,.45);',
    'background:linear-gradient(180deg,#ff5a40,#d4161b);color:#fff;font:900 24px/1 Arial,sans-serif;cursor:pointer;',
    'display:grid;place-items:center;padding:0;box-shadow:0 4px 12px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.35);',
    '-webkit-tap-highlight-color:transparent;transition:transform .12s ease;}',
    '.x100w-close:hover{transform:scale(1.06);}',
    '.x100w-close:active{transform:scale(.94);}',
    '.x100w-close:focus-visible{outline:3px solid #FEF200;outline-offset:2px;}',
    '.x100w-frame{position:absolute;top:var(--x100w-bar);left:0;width:100%;height:calc(100% - var(--x100w-bar));border:0;background:#191b27;}',
    // wheel icon (today's spin is open): the wheel's own gift box + its gold pulse
    '.x100w-launcher.x100w-wheel{background:rgba(250,204,21,.15);border:2px solid rgba(250,204,21,.55);',
    '-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px);animation:x100w-pulse 2s ease-in-out infinite;}',
    '.x100w-launcher.x100w-wheel svg{pointer-events:none;filter:drop-shadow(0 2px 4px rgba(0,0,0,.35));}',
    '@keyframes x100w-pulse{0%,100%{box-shadow:0 4px 20px rgba(250,204,21,.4),0 0 0 0 rgba(250,204,21,.6)}',
    '50%{box-shadow:0 4px 30px rgba(250,204,21,.6),0 0 0 12px rgba(250,204,21,0)}}',
    '@media (prefers-reduced-motion:reduce){.x100w-launcher.x100w-wheel{animation:none}}',
  ].join('');
  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  /* ---------- launcher bubble (with its own red X) ---------- */
  // ONE widget for the Wheel of Fortune and the Bonus Center (owner
  // 2026-10-22): while today's spin is open the launcher shows the WHEEL icon
  // (the wheel's own gift box) and opens the wheel first; from the spin on it
  // shows the Bonus Center icon (gold K coin) and opens the Bonus Center. The
  // app inside says which ('100x-widget:wheel' {available}); the last answer
  // is remembered per player per day so the icon doesn't flicker between pages.
  var WHEEL_ICON =
    '<svg viewBox="0 0 64 64" width="50" height="50" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">' +
    '<defs>' +
    '<linearGradient id="x100wBoxFront" x1="0%" y1="0%" x2="100%" y2="0%">' +
    '<stop offset="0%" stop-color="#eab308"/><stop offset="100%" stop-color="#facc15"/>' +
    '</linearGradient>' +
    '<linearGradient id="x100wBoxSide" x1="0%" y1="0%" x2="100%" y2="0%">' +
    '<stop offset="0%" stop-color="#ca8a04"/><stop offset="100%" stop-color="#d69e0a"/>' +
    '</linearGradient>' +
    '<linearGradient id="x100wBoxTop" x1="0%" y1="100%" x2="0%" y2="0%">' +
    '<stop offset="0%" stop-color="#fde047"/><stop offset="100%" stop-color="#fef08a"/>' +
    '</linearGradient>' +
    '<linearGradient id="x100wLidFront" x1="0%" y1="0%" x2="100%" y2="0%">' +
    '<stop offset="0%" stop-color="#fde047"/><stop offset="100%" stop-color="#fef9c3"/>' +
    '</linearGradient>' +
    '<linearGradient id="x100wLidSide" x1="0%" y1="0%" x2="100%" y2="0%">' +
    '<stop offset="0%" stop-color="#ca8a04"/><stop offset="100%" stop-color="#d69e0a"/>' +
    '</linearGradient>' +
    '<linearGradient id="x100wLidTop" x1="0%" y1="100%" x2="0%" y2="0%">' +
    '<stop offset="0%" stop-color="#fef08a"/><stop offset="100%" stop-color="#fefce8"/>' +
    '</linearGradient>' +
    '<linearGradient id="x100wRibbon" x1="0%" y1="0%" x2="0%" y2="100%">' +
    '<stop offset="0%" stop-color="#ef4444"/><stop offset="100%" stop-color="#b91c1c"/>' +
    '</linearGradient>' +
    '<linearGradient id="x100wRibbonDark" x1="0%" y1="0%" x2="0%" y2="100%">' +
    '<stop offset="0%" stop-color="#dc2626"/><stop offset="100%" stop-color="#991b1b"/>' +
    '</linearGradient>' +
    '</defs>' +
    // Box body — front face
    '<polygon points="8,32 48,32 48,56 8,56" fill="url(#x100wBoxFront)"/>' +
    // Box body — right side face
    '<polygon points="48,32 58,24 58,48 48,56" fill="url(#x100wBoxSide)"/>' +
    // Box body — top face
    '<polygon points="8,32 48,32 58,24 18,24" fill="url(#x100wBoxTop)"/>' +
    // Lid — front face
    '<polygon points="5,25 51,25 51,32 5,32" fill="url(#x100wLidFront)"/>' +
    // Lid — right side
    '<polygon points="51,25 61,17 61,24 51,32" fill="url(#x100wLidSide)"/>' +
    // Lid — top face
    '<polygon points="5,25 51,25 61,17 15,17" fill="url(#x100wLidTop)"/>' +
    // Ribbon — front vertical
    '<polygon points="24,25 32,25 32,56 24,56" fill="url(#x100wRibbon)"/>' +
    // Ribbon — front horizontal
    '<polygon points="5,27 51,27 51,31 5,31" fill="url(#x100wRibbon)"/>' +
    // Ribbon — right side vertical
    '<polygon points="32,25 32,56 48,56 48,32 58,24 42,17" fill="url(#x100wRibbonDark)" opacity="0.3"/>' +
    '<polygon points="48,32 52,29 52,52 48,56" fill="url(#x100wRibbonDark)" opacity="0.6"/>' +
    // Ribbon — top
    '<polygon points="24,25 32,25 42,17 34,17" fill="#dc2626"/>' +
    // Ribbon cross on top face
    '<polygon points="5,27 51,27 61,19 15,19" fill="#dc2626" opacity="0.5"/>' +
    '<polygon points="5,29 51,29 61,21 15,21" fill="#dc2626" opacity="0.3"/>' +
    // Bow — left loop
    '<ellipse cx="28" cy="14" rx="10" ry="6" fill="#ef4444" stroke="#dc2626" stroke-width="1" transform="rotate(-20 28 14)"/>' +
    '<ellipse cx="28" cy="14" rx="7" ry="4" fill="#f87171" transform="rotate(-20 28 14)"/>' +
    // Bow — right loop
    '<ellipse cx="44" cy="14" rx="10" ry="6" fill="#ef4444" stroke="#dc2626" stroke-width="1" transform="rotate(20 44 14)"/>' +
    '<ellipse cx="44" cy="14" rx="7" ry="4" fill="#f87171" transform="rotate(20 44 14)"/>' +
    // Bow — center knot
    '<ellipse cx="36" cy="16" rx="4" ry="3" fill="#dc2626"/>' +
    '<ellipse cx="36" cy="15.5" rx="2.5" ry="2" fill="#ef4444"/>' +
    // Shine highlights
    '<polygon points="10,34 14,34 13,44 9,44" fill="rgba(255,255,255,0.25)" rx="1"/>' +
    '<polygon points="52,26 56,22 56.5,28 52.5,32" fill="rgba(255,255,255,0.15)"/>' +
    // Edge lines for definition
    '<polygon points="8,32 48,32 48,56 8,56" fill="none" stroke="#b45309" stroke-width="0.5" opacity="0.4"/>' +
    '<polygon points="48,32 58,24 58,48 48,56" fill="none" stroke="#92400e" stroke-width="0.5" opacity="0.4"/>' +
    '<polygon points="5,25 51,25 51,32 5,32" fill="none" stroke="#b45309" stroke-width="0.5" opacity="0.3"/>' +
    '<polygon points="51,25 61,17 61,24 51,32" fill="none" stroke="#92400e" stroke-width="0.5" opacity="0.3"/>' +
    '</svg>';
  // the chest loop (recorded from the daily reward's 3D chest, one 3.6 s open/close cycle);
  // a still open chest under reduced motion
  var BONUS_ICON = '<picture><source media="(prefers-reduced-motion: reduce)" srcset="' + APP_ORIGIN + '/ui/widget/chest-still.png">' +
    '<img src="' + APP_ORIGIN + '/ui/widget/chest-loop.webp" alt="" width="72" height="66"></picture>';
  var MODE_KEY = 'x100-widget-mode';
  var mode = null;
  var launcher = document.createElement('button');
  launcher.type = 'button';
  launcher.className = 'x100w-launcher';
  var launcherIcon = document.createElement('span');
  launcherIcon.style.cssText = 'display:grid;place-items:center;pointer-events:none;';
  launcher.appendChild(launcherIcon);
  function today() { return new Date().toISOString().slice(0, 10); }
  function setMode(next, remember) {
    if (next !== 'wheel') next = 'bonus';
    if (remember) {
      try { sessionStorage.setItem(MODE_KEY, JSON.stringify({ uid: currentUid(), day: today(), mode: next })); } catch (e) { /* storage blocked */ }
    }
    if (next === mode) return;
    mode = next;
    var wheel = next === 'wheel';
    launcherIcon.innerHTML = wheel ? WHEEL_ICON : BONUS_ICON;
    launcher.classList.toggle('x100w-wheel', wheel);
    launcher.setAttribute('aria-label', wheel ? 'Spin the BwanaBet Wheel of Fortune' : 'Open the BwanaBet Bonus Center');
    launcher.title = wheel ? 'Wheel of Fortune' : 'Bonus Center';
  }
  // Start with what this player was last told today (same tab session), else the Bonus Center.
  (function () {
    var saved = null;
    try { saved = JSON.parse(sessionStorage.getItem(MODE_KEY) || 'null'); } catch (e) { /* storage blocked */ }
    var fresh = saved && readToken() && saved.uid === currentUid() && saved.day === today();
    setMode(fresh ? saved.mode : 'bonus', false);
  })();

  var dismiss = document.createElement('span');
  dismiss.className = 'x100w-dismiss';
  dismiss.setAttribute('role', 'button');
  dismiss.setAttribute('aria-label', 'Hide the Bonus Center button');
  dismiss.textContent = '✕';
  dismiss.addEventListener('click', function (e) {
    e.stopPropagation();
    try { sessionStorage.setItem(HIDE_KEY, '1'); } catch (err) { /* storage blocked */ }
    launcher.remove();
  });
  launcher.appendChild(dismiss);

  /* ---------- full-screen popup ---------- */
  var overlay = document.createElement('div');
  overlay.className = 'x100w-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-label', 'BwanaBet Bonus Center');
  var bar = document.createElement('div');
  bar.className = 'x100w-bar';
  var title = document.createElement('span');
  title.className = 'x100w-title';
  title.textContent = 'BwanaBet Bonus Center';
  var closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'x100w-close';
  closeBtn.setAttribute('aria-label', 'Close the Bonus Center');
  closeBtn.textContent = '✕';
  bar.appendChild(title);
  bar.appendChild(closeBtn);
  overlay.appendChild(bar);
  var frame = null;
  var frameToken = null; // the token the current iframe was opened with

  // The iframe is created on the first open, or straight away (hidden) for a
  // logged-in player so the Bonus Center can check the Wheel of Fortune.
  function ensureFrame() {
    // the player logged in, out or switched account since the iframe opened:
    // start a fresh iframe so it never shows the previous session
    var t = readToken();
    if (frame && t !== frameToken) { frame.remove(); frame = null; setMode('bonus', false); }
    frameToken = t;
    if (!frame) {
      frame = document.createElement('iframe');
      frame.className = 'x100w-frame';
      frame.allow = 'clipboard-write; autoplay';
      var uid = currentUid();
      frame.src = APP_ORIGIN + '/?widget=1' + (uid ? '&uid=' + encodeURIComponent(uid) : '') + (cfg.preview ? '&preview=1' : '') + '&strip=1';
      frame.addEventListener('load', sendToken);
      frame.addEventListener('load', function () { if (wantWheel) setTimeout(showWheel, 1500); });
      // the app's heartbeat needs the open state even when the iframe loaded after openWidget() told it
      frame.addEventListener('load', function () { tellApp(isOpen); });
      overlay.appendChild(frame);
    }
    sendToken();
  }
  var isOpen = false;
  function tellApp(open) {
    try { if (frame && frame.contentWindow) frame.contentWindow.postMessage({ type: '100x-widget:visibility', open: open }, APP_ORIGIN); } catch (e) { /* ignore */ }
  }
  function openWidget() {
    ensureFrame();
    overlay.classList.add('open');
    if (launcher.parentNode) launcher.style.display = 'none';
    document.documentElement.style.overflow = 'hidden';
    if (!isOpen) { isOpen = true; tellApp(true); }
  }
  function closeWidget() {
    overlay.classList.remove('open');
    launcher.style.display = '';
    document.documentElement.style.overflow = '';
    if (isOpen) { isOpen = false; tellApp(false); }
  }

  // The popup NEVER opens by itself (owner 2026-10-22: a casino game on the
  // page must never be interrupted); only the player opens it. With today's
  // spin unused the button is the gift box and the wheel shows first inside.

  function sendToken() {
    var t = readToken();
    if (!t || !frame || !frame.contentWindow) return;
    try { frame.contentWindow.postMessage({ type: 'bwanabet-token', token: t }, APP_ORIGIN); } catch (e) { /* ignore */ }
  }

  // Wheel icon: open the popup with the wheel on top (the app opens it when it
  // can; a frame still loading gets the request once it has loaded).
  var wantWheel = false;
  function showWheel() {
    try { if (frame && frame.contentWindow) frame.contentWindow.postMessage({ type: '100x-widget:show-wheel' }, APP_ORIGIN); } catch (e) { /* ignore */ }
  }
  launcher.addEventListener('click', function () {
    wantWheel = mode === 'wheel';
    openWidget();
    if (wantWheel) showWheel();
  });
  closeBtn.addEventListener('click', closeWidget);
  document.addEventListener('keydown', function (e) { if (isOpen && e.key === 'Escape') closeWidget(); });
  window.BwanaBetBonus = { open: openWidget, close: closeWidget };
  window.addEventListener('message', function (e) {
    if (e.origin !== APP_ORIGIN) return;
    if (e.data && e.data.type === '100x-widget:close') closeWidget();
    // the app's wheel verdict: open spin -> wheel icon, spun / none -> Bonus Center icon
    if (e.data && e.data.type === '100x-widget:wheel' && frame && e.source === frame.contentWindow) {
      setMode(e.data.available ? 'wheel' : 'bonus', true);
      if (!e.data.available) wantWheel = false;
    }
    // the app says it is mounted and listening: hand it the session token
    if (e.data && e.data.type === 'gamification-ready') sendToken();
  });

  function mount() {
    if (showLauncher) document.body.appendChild(launcher);
    document.body.appendChild(overlay);
    // SMS / campaign links: https://bwanabet.co.zm/?bonus=open opens the
    // Bonus Center straight away (the comeback bonus waits inside).
    try { if (/[?&]bonus=open/.test(window.location.search)) openWidget(); } catch (e) { /* ignore */ }
    // Logged in (or the preview page): load the Bonus Center hidden now, so the
    // launcher knows at once whether today's spin is open (gift box vs chest).
    if (!frame && (readToken() || cfg.preview)) ensureFrame();
    // Visitors from the free-spins promo sites (?wof=new|existing) get the
    // wheel's "register / log in and deposit" arrival popup: only that part of
    // the wheel's old embed runs (window.__bwArrivalOnly), served from
    // wheel.bwanabet.dev (vercel.app is blocked on some networks). One per page
    // even while the wheel's own embed.js loader is also on it.
    try {
      if (/[?&]wof=(new|existing)\b/.test(window.location.search) && !window.__bwArrivalLoaded) {
        window.__bwArrivalLoaded = true;
        window.__bwArrivalOnly = true;
        var arrival = document.createElement('script');
        arrival.src = 'https://wheel.bwanabet.dev/embed-standalone.js';
        arrival.defer = true;
        (document.head || document.documentElement).appendChild(arrival);
      }
    } catch (e) { /* never break the host page */ }
  }
  if (document.body) mount();
  else document.addEventListener('DOMContentLoaded', mount);
})();
