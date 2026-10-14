/* 100xBet Rewards — embeddable widget for bwanabet.com (desktop + mobile).
 *
 * Usage on the host page:
 *   <script>window.X100_WIDGET = { uid: 'BWANABET_USER_ID' };</script>   (optional)
 *   <script src="https://100xbet-gamification.vercel.app/widget.js" defer></script>
 *
 * Renders a floating launcher bubble (bottom-right). Clicking it opens the
 * platform in a full-screen iframe popup. The popup closes via the red X
 * inside the app (postMessage '100x-widget:close'); the launcher itself can
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
    try { return s ? new URL(s).origin : 'https://100xbet-gamification.vercel.app'; }
    catch (e) { return 'https://100xbet-gamification.vercel.app'; }
  })();
  var HIDE_KEY = 'x100-widget-hidden';
  var cfg = window.X100_WIDGET || {};

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

  if (sessionStorage.getItem(HIDE_KEY) === '1') return;

  /* ---------- styles ---------- */
  var css = [
    '.x100w-launcher{position:fixed;bottom:20px;right:20px;z-index:2147483000;width:64px;height:64px;border-radius:50%;',
    'background:radial-gradient(120% 120% at 30% 25%,#5ecb8f,#2e7d5f);border:2px solid rgba(255,255,255,.35);cursor:pointer;',
    'box-shadow:0 10px 28px rgba(0,0,0,.45),0 0 22px rgba(79,169,139,.4);display:grid;place-items:center;',
    'transition:transform .15s ease;-webkit-tap-highlight-color:transparent;}',
    '.x100w-launcher:hover{transform:scale(1.07);}',
    '.x100w-launcher img{width:38px;height:38px;object-fit:contain;pointer-events:none;',
    'filter:drop-shadow(0 2px 4px rgba(0,0,0,.4));animation:x100w-bob 2.6s ease-in-out infinite;}',
    '@keyframes x100w-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}',
    '.x100w-dismiss{position:absolute;top:-6px;right:-6px;width:22px;height:22px;border-radius:50%;border:1.5px solid rgba(255,255,255,.5);',
    'background:#d43a22;color:#fff;font:900 12px/1 Arial,sans-serif;display:grid;place-items:center;cursor:pointer;',
    'box-shadow:0 3px 8px rgba(0,0,0,.45);}',
    '.x100w-overlay{position:fixed;inset:0;z-index:2147483001;background:rgba(8,10,16,.6);display:none;}',
    '.x100w-overlay.open{display:block;}',
    '.x100w-frame{position:absolute;inset:0;width:100%;height:100%;border:0;background:#191b27;}',
    '@media (prefers-reduced-motion:reduce){.x100w-launcher img{animation:none}}',
  ].join('');
  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  /* ---------- launcher bubble (with its own red X) ---------- */
  var launcher = document.createElement('button');
  launcher.type = 'button';
  launcher.className = 'x100w-launcher';
  launcher.setAttribute('aria-label', 'Open 100xBet Rewards');
  launcher.innerHTML = '<img src="' + APP_ORIGIN + '/ui/reward/coin-k.png" alt="">';

  var dismiss = document.createElement('span');
  dismiss.className = 'x100w-dismiss';
  dismiss.setAttribute('role', 'button');
  dismiss.setAttribute('aria-label', 'Hide rewards widget');
  dismiss.textContent = '✕';
  dismiss.addEventListener('click', function (e) {
    e.stopPropagation();
    sessionStorage.setItem(HIDE_KEY, '1');
    launcher.remove();
    overlay.remove();
  });
  launcher.appendChild(dismiss);

  /* ---------- full-screen popup ---------- */
  var overlay = document.createElement('div');
  overlay.className = 'x100w-overlay';
  var frame = null;

  function openWidget() {
    if (!frame) {
      frame = document.createElement('iframe');
      frame.className = 'x100w-frame';
      frame.allow = 'clipboard-write';
      var uid = currentUid();
      frame.src = APP_ORIGIN + '/?widget=1' + (uid ? '&uid=' + encodeURIComponent(uid) : '');
      frame.addEventListener('load', sendToken);
      overlay.appendChild(frame);
    }
    sendToken();
    overlay.classList.add('open');
    launcher.style.display = 'none';
    document.documentElement.style.overflow = 'hidden';
  }
  function closeWidget() {
    overlay.classList.remove('open');
    launcher.style.display = '';
    document.documentElement.style.overflow = '';
  }

  function sendToken() {
    var t = readToken();
    if (!t || !frame || !frame.contentWindow) return;
    try { frame.contentWindow.postMessage({ type: 'bwanabet-token', token: t }, APP_ORIGIN); } catch (e) { /* ignore */ }
  }

  launcher.addEventListener('click', openWidget);
  window.addEventListener('message', function (e) {
    if (e.origin !== APP_ORIGIN) return;
    if (e.data && e.data.type === '100x-widget:close') closeWidget();
    // the app says it is mounted and listening: hand it the session token
    if (e.data && e.data.type === 'gamification-ready') sendToken();
  });

  document.body.appendChild(launcher);
  document.body.appendChild(overlay);
})();
