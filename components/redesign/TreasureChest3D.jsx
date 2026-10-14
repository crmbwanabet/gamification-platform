'use client';

// Realistic 3D treasure chest for the Daily Reward card's day-7 bonus tile
// (2026-10-14, ported from the scratchpad prototype the user signed off).
//
//   <TreasureChest3D mode="idle|today|open" size={118} />
//
// mode  'idle'  day 7 not reached: loops open/close every ~3.6s — the lid
//               swings up to ~80°, the glowing gold coin pile shows in the
//               opening for ~1.4s, then it drops shut with a little bounce.
//               Gentle sway. (2026-10-14: was a short ~1s peek every 4.6s.)
//       'today' bonus ready: the same loop every ~3.4s, livelier, a rattle
//               before each opening, more glow.
//       'open'  claimed: the lid swings fully open with an overshoot (the
//               claim moment when it comes from 'today'), stays open, coins
//               glow, a few hop and sparkle, three spill over the front rim.
// size  CSS width in px; height = size * 0.85.
//
// three.js is imported lazily on the client. SSR renders a box of the right
// size with a drawn SVG chest; the canvas fades in over it after its first
// frame. No WebGL / three fails to load => the SVG stays. Mode changes never
// rebuild the scene. Rendering pauses offscreen or while the tab is hidden.
// prefers-reduced-motion: no loop, one static frame, lid open with the coin
// pile showing (fully open for 'open'). Frames are capped at ~30fps.

import React from 'react';

const ASPECT = 0.85;

export default function TreasureChest3D({ mode = 'idle', size = 118 }) {
  const wrapRef = React.useRef(null);
  const apiRef = React.useRef(null);
  const modeRef = React.useRef(mode);
  const sizeRef = React.useRef(size);
  const [ready, setReady] = React.useState(false);
  const [failed, setFailed] = React.useState(false);

  // build once per mount
  React.useEffect(() => {
    let cancelled = false;
    let api = null;
    (async () => {
      let THREE, RoomEnvironment, RoundedBoxGeometry;
      try {
        [THREE, { RoomEnvironment }, { RoundedBoxGeometry }] = await Promise.all([
          import('three'),
          import('three/examples/jsm/environments/RoomEnvironment.js'),
          import('three/examples/jsm/geometries/RoundedBoxGeometry.js'),
        ]);
      } catch (e) {
        if (!cancelled) setFailed(true);
        return;
      }
      if (cancelled || !wrapRef.current) return;
      try {
        api = buildChest({
          THREE, RoomEnvironment, RoundedBoxGeometry,
          host: wrapRef.current,
          size: sizeRef.current,
          getMode: () => modeRef.current,
          onFirstFrame: () => { if (!cancelled) setReady(true); },
          onLost: () => { if (!cancelled) setFailed(true); },
        });
        apiRef.current = api;
      } catch (e) {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      apiRef.current = null;
      if (api) api.dispose();
    };
  }, []);

  React.useEffect(() => {
    modeRef.current = mode;
    if (apiRef.current) apiRef.current.setMode(mode);
  }, [mode]);

  React.useEffect(() => {
    sizeRef.current = size;
    if (apiRef.current) apiRef.current.resize(size);
  }, [size]);

  const h = Math.round(size * ASPECT);
  return (
    <div
      ref={wrapRef}
      aria-hidden="true"
      style={{ position: 'relative', width: size, height: h, flex: 'none' }}
    >
      {(!ready || failed) && <ChestSVG open={mode === 'open'} />}
    </div>
  );
}

// ---------------------------------------------------------------- fallback --
function ChestSVG({ open }) {
  return (
    <svg viewBox="0 0 120 102" width="100%" height="100%" style={{ position: 'absolute', inset: 0 }} aria-hidden="true">
      <defs>
        <linearGradient id="tc3-wood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7a3d17" /><stop offset="1" stopColor="#3a1806" /></linearGradient>
        <linearGradient id="tc3-lid" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#9a5524" /><stop offset="1" stopColor="#4a1f08" /></linearGradient>
        <linearGradient id="tc3-gold" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#8a5a00" /><stop offset=".4" stopColor="#fff1b0" /><stop offset=".7" stopColor="#e0a820" /><stop offset="1" stopColor="#7a4c00" /></linearGradient>
        <radialGradient id="tc3-glow" cx=".5" cy=".6" r=".5"><stop offset="0" stopColor="#fff6c4" /><stop offset=".5" stopColor="#ffd21f" stopOpacity=".6" /><stop offset="1" stopColor="#ffb000" stopOpacity="0" /></radialGradient>
      </defs>
      <ellipse cx="60" cy="96" rx="48" ry="5" fill="#000" opacity=".4" />
      {open && <path d="M18 52 L24 12 Q60 5 96 12 L102 52 Z" fill="#2a1004" stroke="#5a2a0f" strokeWidth="2" />}
      <ellipse cx="60" cy="50" rx={open ? 50 : 40} ry={open ? 24 : 16} fill="url(#tc3-glow)" />
      <g fill="#ffcf2e" stroke="#a86e00" strokeWidth="1.2">
        <ellipse cx="40" cy="52" rx="8" ry="4" /><ellipse cx="56" cy="47" rx="8" ry="4" /><ellipse cx="72" cy="50" rx="8" ry="4" />
        <ellipse cx="48" cy="44" rx="8" ry="4" /><ellipse cx="66" cy="43" rx="8" ry="4" /><ellipse cx="82" cy="53" rx="8" ry="4" />
      </g>
      <rect x="14" y="52" width="92" height="40" rx="3" fill="url(#tc3-wood)" />
      <path d="M14 66 H106 M14 79 H106" stroke="#1e0b02" strokeWidth="1.5" opacity=".7" />
      {!open && <path d="M12 54 L12 40 Q12 24 60 24 Q108 24 108 40 L108 54 Z" fill="url(#tc3-lid)" transform="translate(0 -6) rotate(-14 108 54)" />}
      <rect x="30" y="50" width="9" height="43" fill="url(#tc3-gold)" />
      <rect x="81" y="50" width="9" height="43" fill="url(#tc3-gold)" />
      <rect x="11" y="88" width="98" height="6" rx="2" fill="url(#tc3-gold)" />
      <path d="M51 56 H69 V66 Q69 74 60 78 Q51 74 51 66 Z" fill="url(#tc3-gold)" />
      <circle cx="60" cy="64" r="2.4" fill="#1a0a02" />
    </svg>
  );
}

// ------------------------------------------------------------------ scene --
function buildChest({ THREE, RoomEnvironment, RoundedBoxGeometry, host, size, getMode, onFirstFrame, onLost }) {
  const small = size <= 170;
  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  Object.assign(canvas.style, {
    position: 'absolute', inset: '0', width: '100%', height: '100%',
    opacity: '0', transition: 'opacity .25s ease', pointerEvents: 'none',
  });

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const setSize = (w) => {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, Math.round(w * ASPECT), false);
  };
  setSize(size);
  host.appendChild(canvas);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const roomEnv = new RoomEnvironment();
  const envTex = pmrem.fromScene(roomEnv, 0.04).texture;
  scene.environment = envTex;
  // RoomEnvironment's own geometries/materials are only needed for the bake
  roomEnv.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } });

  const camera = new THREE.PerspectiveCamera(27, 1 / ASPECT, 0.1, 50);
  camera.position.set(2.2, 2.55, 5.0);
  camera.lookAt(0, 0.86, 0);

  // ---- textures ----
  const textures = [];
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const TS = small ? 256 : 512;
  const k = TS / 512;
  function woodCanvas(planks) {
    const c = document.createElement('canvas'); c.width = c.height = TS;
    const g = c.getContext('2d');
    const ph = TS / planks;
    for (let i = 0; i < planks; i++) {
      const y0 = i * ph;
      g.save(); g.beginPath(); g.rect(0, y0, TS, ph); g.clip();
      const r = 74 + rnd() * 16, gg = 36 + rnd() * 8, b = 14 + rnd() * 5;
      const grad = g.createLinearGradient(0, y0, 0, y0 + ph);
      grad.addColorStop(0, `rgb(${r + 14},${gg + 8},${b + 4})`);
      grad.addColorStop(1, `rgb(${r - 18},${gg - 10},${b - 4})`);
      g.fillStyle = grad; g.fillRect(0, y0, TS, ph);
      for (let n = 0; n < 55; n++) {
        const y = y0 + rnd() * ph, amp = (0.6 + rnd() * 3.2) * k, fr = (0.004 + rnd() * 0.02) / k, p = rnd() * 6;
        g.strokeStyle = rnd() < 0.6 ? `rgba(30,10,2,${0.06 + rnd() * 0.16})` : `rgba(150,84,40,${0.04 + rnd() * 0.09})`;
        g.lineWidth = (0.4 + rnd() * 1.8) * k;
        g.beginPath();
        for (let x = 0; x <= TS; x += 6 * k) { const yy = y + Math.sin(x * fr + p) * amp; x ? g.lineTo(x, yy) : g.moveTo(x, yy); }
        g.stroke();
      }
      if (rnd() < 0.55) {
        const kx = (40 + rnd() * 432) * k, ky = y0 + ph * (0.3 + rnd() * 0.4);
        for (let j = 7; j > 0; j--) { g.strokeStyle = `rgba(35,12,2,${0.12 + j * 0.02})`; g.lineWidth = 1.2 * k; g.beginPath(); g.ellipse(kx, ky, j * 5 * k, j * 1.7 * k, 0, 0, 7); g.stroke(); }
      }
      g.restore();
      g.fillStyle = 'rgba(14,5,1,.95)'; g.fillRect(0, y0, TS, Math.max(2, 4 * k));
      g.fillStyle = 'rgba(210,130,80,.22)'; g.fillRect(0, y0 + Math.max(2, 4 * k), TS, Math.max(1, 2 * k));
    }
    return c;
  }
  function tex(c, srgb = true) {
    const t = new THREE.CanvasTexture(c);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    textures.push(t);
    return t;
  }
  function coinFaceCanvas() {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    const rg = g.createRadialGradient(54, 50, 4, 64, 64, 64);
    rg.addColorStop(0, '#fff3b8'); rg.addColorStop(0.55, '#ffcf3a'); rg.addColorStop(1, '#d99a12');
    g.fillStyle = rg; g.fillRect(0, 0, 128, 128);
    g.lineWidth = 10; g.strokeStyle = '#a86a06'; g.beginPath(); g.arc(64, 64, 58, 0, 7); g.stroke();
    g.lineWidth = 4; g.strokeStyle = '#ffe58a'; g.beginPath(); g.arc(64, 64, 50, 0, 7); g.stroke();
    g.lineWidth = 3; g.strokeStyle = '#b77a0c'; g.beginPath(); g.arc(64, 64, 42, 0, 7); g.stroke();
    // embossed star
    g.fillStyle = '#c8870e'; g.beginPath();
    for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? 12 : 28; g.lineTo(64 + Math.cos(a) * rr, 64 + Math.sin(a) * rr); }
    g.closePath(); g.fill();
    return c;
  }
  function radialCanvas(stops) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'); const rg = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    for (const [o, col] of stops) rg.addColorStop(o, col);
    g.fillStyle = rg; g.fillRect(0, 0, 128, 128);
    return c;
  }
  function sparkleCanvas() {
    const c = radialCanvas([[0, 'rgba(255,255,240,1)'], [0.18, 'rgba(255,230,140,.6)'], [0.5, 'rgba(255,200,60,0)']]);
    const g = c.getContext('2d');
    g.globalCompositeOperation = 'lighter';
    for (const [w, hgt] of [[128, 6], [6, 128]]) {
      const lg = g.createRadialGradient(64, 64, 0, 64, 64, 64);
      lg.addColorStop(0, 'rgba(255,250,220,1)'); lg.addColorStop(1, 'rgba(255,210,90,0)');
      g.fillStyle = lg; g.fillRect(64 - w / 2, 64 - hgt / 2, w, hgt);
    }
    return c;
  }

  const bodyCanvas = woodCanvas(3);
  const lidCanvas = woodCanvas(5);
  const woodBody = new THREE.MeshStandardMaterial({ map: tex(bodyCanvas), bumpMap: tex(bodyCanvas, false), bumpScale: 1.2, roughness: 0.55, metalness: 0 });
  const woodLid = new THREE.MeshStandardMaterial({ map: tex(lidCanvas), bumpMap: tex(lidCanvas, false), bumpScale: 1.2, roughness: 0.5, metalness: 0 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xf0bd4a, metalness: 1, roughness: 0.27 });
  const bronze = new THREE.MeshStandardMaterial({ color: 0xb98a2e, metalness: 1, roughness: 0.38 });
  const coinTex = tex(coinFaceCanvas());
  const coinFace = new THREE.MeshStandardMaterial({ map: coinTex, emissiveMap: coinTex, emissive: 0xffb020, emissiveIntensity: 0.2, metalness: 0.85, roughness: 0.22 });
  const coinEdge = new THREE.MeshStandardMaterial({ color: 0xc98a12, emissive: 0x7a4a00, emissiveIntensity: 0.2, metalness: 1, roughness: 0.3 });
  const coinMats = [coinEdge, coinFace, coinFace];
  const dark = new THREE.MeshStandardMaterial({ color: 0x1a0904, roughness: 1, envMapIntensity: 0 });

  const chest = new THREE.Group();
  scene.add(chest);
  const add = (geo, mat, x, y, z, parent = chest) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };

  // ---- body ----
  const BW = 1.6, BH = 0.8, BD = 1.0;
  add(new RoundedBoxGeometry(BW, BH, BD, 4, 0.03), woodBody, 0, BH / 2, 0);
  add(new THREE.BoxGeometry(BW - 0.12, 0.01, BD - 0.12), dark, 0, BH + 0.002, 0);
  const bandGeo = new RoundedBoxGeometry(0.13, BH + 0.02, BD + 0.04, 3, 0.015);
  for (const x of [-0.52, 0.52]) add(bandGeo, gold, x, BH / 2, 0);
  add(new RoundedBoxGeometry(BW + 0.05, 0.09, BD + 0.05, 3, 0.02), gold, 0, 0.045, 0);
  add(new RoundedBoxGeometry(BW + 0.04, 0.06, BD + 0.04, 3, 0.02), gold, 0, BH - 0.03, 0);
  const postGeo = new RoundedBoxGeometry(0.08, BH, 0.08, 3, 0.02);
  for (const x of [-BW / 2, BW / 2]) for (const z of [-BD / 2, BD / 2]) add(postGeo, bronze, x, BH / 2, z);
  const rivet = new THREE.SphereGeometry(0.024, 12, 8);
  for (const x of [-0.52, 0.52]) for (const y of [0.2, 0.42, 0.62]) add(rivet, gold, x, y, BD / 2 + 0.025);
  for (const x of [-0.7, -0.26, 0, 0.26, 0.7]) add(rivet, gold, x, 0.045, BD / 2 + 0.03);

  // lock plate (shield with keyhole)
  const sh = new THREE.Shape();
  sh.moveTo(-0.13, 0.12); sh.lineTo(0.13, 0.12); sh.lineTo(0.13, -0.04); sh.quadraticCurveTo(0.12, -0.15, 0, -0.2); sh.quadraticCurveTo(-0.12, -0.15, -0.13, -0.04); sh.closePath();
  add(new THREE.ExtrudeGeometry(sh, { depth: 0.03, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.012, bevelSegments: 3 }), gold, 0, 0.6, BD / 2 + 0.005);
  const kh = new THREE.Shape(); kh.absarc(0, 0.02, 0.028, 0, Math.PI * 2);
  add(new THREE.ExtrudeGeometry(kh, { depth: 0.01, bevelEnabled: false }), dark, 0, 0.6, BD / 2 + 0.05);
  const slot = new THREE.Shape(); slot.moveTo(-0.014, 0.0); slot.lineTo(0.014, 0.0); slot.lineTo(0.022, -0.07); slot.lineTo(-0.022, -0.07); slot.closePath();
  add(new THREE.ExtrudeGeometry(slot, { depth: 0.01, bevelEnabled: false }), dark, 0, 0.6, BD / 2 + 0.05);

  // ---- coins: a mound that rises above the rim (stays under the closed lid) ----
  const CR = 0.088, CT = 0.022;
  const coinGeo = new THREE.CylinderGeometry(CR, CR, CT, 24);
  const R = BD / 2;
  const PEAK = 0.4;
  const mound = (x, z) => PEAK * Math.max(0, 1 - (x / 0.8) ** 2) * Math.max(0, 1 - (z / 0.52) ** 2);
  const N = small ? 230 : 300;
  const coins = new THREE.InstancedMesh(coinGeo, coinMats, N);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s1 = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
  let ci = 0;
  const placeCoin = (x, y, z, rx, ry, rz) => {
    e.set(rx, ry, rz); q.setFromEuler(e); p.set(x, y, z);
    coins.setMatrixAt(ci++, m4.compose(p, q, s1));
  };
  const onEdge = 7;
  for (let i = 0; i < N - onEdge; i++) {
    const x = (rnd() * 2 - 1) * 0.7, z = (rnd() * 2 - 1) * 0.4;
    const h = mound(x, z);
    const top = rnd() < 0.6; // most coins sit on the visible surface
    const y = BH + 0.01 + (top ? h : h * rnd() ** 0.5);
    // surface coins lie close to the mound's slope so their faces catch light
    const tilt = top ? 0.35 : 0.9;
    placeCoin(x, y, z, (rnd() - 0.5) * tilt - z * 0.5, rnd() * 3, (rnd() - 0.5) * tilt + x * 0.35);
  }
  // a few coins standing on edge in the pile, facing the camera
  for (let i = 0; i < onEdge; i++) {
    const x = -0.5 + i * (1.0 / (onEdge - 1)) + (rnd() - 0.5) * 0.08, z = 0.05 + rnd() * 0.18;
    const h = mound(x, z);
    placeCoin(x, BH + h + CR * 0.55, z, Math.PI / 2 - 0.25 + rnd() * 0.2, 0.42 + (rnd() - 0.5) * 0.6, (rnd() - 0.5) * 0.3);
  }
  coins.count = ci;
  coins.instanceMatrix.needsUpdate = true;
  coins.castShadow = true; coins.receiveShadow = true;
  chest.add(coins);

  // spill coins: pop out over the front rim on the claim, then rest there
  const spill = [
    { to: [-0.34, BH + 0.02, BD / 2 + 0.03], rot: [1.1, 0.2, 0.1] },
    { to: [0.22, BH + 0.03, BD / 2 + 0.035], rot: [1.25, -0.3, -0.15] },
    { to: [0.42, CR * 0.97, BD / 2 + 0.1], rot: [1.32, 0.15, 0.05] }, // leans on the front
  ].map((d) => {
    const m = add(coinGeo, coinMats, 0, 0, 0);
    m.visible = false;
    return { ...d, m, from: [d.to[0] * 0.5, BH + 0.3, 0.05] };
  });
  // hopping coins (open mode)
  const hoppers = [[-0.3, 0.05, 0], [0.12, -0.05, 0.9], [0.38, 0.08, 1.7], [-0.05, 0.12, 2.4]].map(([x, z, off]) => {
    const m = add(coinGeo, coinMats, x, BH + mound(x, z), z);
    m.visible = false; m.castShadow = false;
    return { m, x, z, off };
  });

  // ---- lid on a hinge at the back top edge ----
  const hinge = new THREE.Group(); hinge.position.set(0, BH, -BD / 2); chest.add(hinge);
  const half = new THREE.Shape(); half.moveTo(-R, 0); half.absarc(0, 0, R, Math.PI, 0, true); half.lineTo(-R, 0);
  const lidGeo = new THREE.ExtrudeGeometry(half, { depth: BW, bevelEnabled: true, bevelSize: 0.025, bevelThickness: 0.025, bevelSegments: 4, curveSegments: small ? 28 : 40 });
  lidGeo.translate(0, 0, -BW / 2); lidGeo.rotateY(Math.PI / 2);
  add(lidGeo, woodLid, 0, 0, R, hinge);
  // underside of the lid (seen when open): dark wood plane
  const under = add(new THREE.PlaneGeometry(BW - 0.04, BD - 0.04), dark, 0, -0.028, R, hinge);
  under.rotation.x = Math.PI / 2;
  const ring = new THREE.Shape(); ring.absarc(0, 0, R + 0.035, 0, Math.PI, false); ring.lineTo(-R + 0.005, 0); ring.absarc(0, 0, R - 0.005, Math.PI, 0, true); ring.lineTo(R + 0.035, 0);
  const ringGeo = new THREE.ExtrudeGeometry(ring, { depth: 0.13, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 2, curveSegments: small ? 28 : 40 });
  ringGeo.translate(0, 0, -0.065); ringGeo.rotateY(Math.PI / 2);
  for (const x of [-0.52, 0.52]) add(ringGeo, gold, x, 0, R, hinge);
  add(new RoundedBoxGeometry(BW + 0.06, 0.07, BD + 0.06, 3, 0.02), gold, 0, 0.035, R, hinge);
  for (const x of [-0.52, 0.52]) for (const a of [0.45, 1.0, 1.6, 2.15]) {
    add(rivet, gold, x, Math.sin(a) * (R + 0.04), R + Math.cos(a) * (R + 0.04), hinge);
  }
  const hasp = new THREE.Shape(); hasp.moveTo(-0.06, 0.06); hasp.lineTo(0.06, 0.06); hasp.lineTo(0.06, -0.1); hasp.quadraticCurveTo(0, -0.15, -0.06, -0.1); hasp.closePath();
  add(new THREE.ExtrudeGeometry(hasp, { depth: 0.025, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.01, bevelSegments: 2 }), gold, 0, 0.0, BD + 0.03, hinge);

  // ---- lights + ground ----
  scene.add(new THREE.HemisphereLight(0xfff1dd, 0x2a0d4a, 0.5));
  const key = new THREE.DirectionalLight(0xfff0dc, 2.4); key.position.set(2.5, 4.5, 3.5); key.castShadow = true;
  const sm = small ? 512 : 1024;
  key.shadow.mapSize.set(sm, sm); key.shadow.camera.left = key.shadow.camera.bottom = -2; key.shadow.camera.right = key.shadow.camera.top = 2; key.shadow.radius = 3; key.shadow.bias = -0.0005;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffc870, 2.2); rim.position.set(-3, 2.5, -3); scene.add(rim);
  const inner = new THREE.PointLight(0xffc040, 0, 3, 1.6); inner.position.set(0, BH + 0.55, 0.15); chest.add(inner);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.ShadowMaterial({ opacity: 0.45 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);

  const glowMat = new THREE.SpriteMaterial({ map: tex(radialCanvas([[0, 'rgba(255,240,170,1)'], [0.35, 'rgba(255,200,60,.55)'], [1, 'rgba(255,170,0,0)']])), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const glow = new THREE.Sprite(glowMat);
  glow.position.set(0, BH + 0.35, 0.1); glow.scale.set(2.3, 1.6, 1); chest.add(glow);

  const sparkTex = tex(sparkleCanvas());
  const sparkles = [[-0.45, 0.42, 0.15, 0], [0.3, 0.55, 0.2, 1.3], [0.05, 0.75, 0.0, 2.1], [0.55, 0.35, 0.25, 0.7], [-0.2, 0.62, 0.3, 1.8], [-0.62, 0.28, 0.1, 2.6]].map(([x, y, z, off]) => {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: sparkTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false }));
    sp.position.set(x, BH + y, z); sp.scale.setScalar(0.001); chest.add(sp);
    return { sp, off, y: BH + y };
  });

  // ---- motion ----
  const mq = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  let reduced = !!(mq && mq.matches);
  const PEEK = -1.4; // ~80°: the coin pile shows clearly in the opening
  const OPEN = -1.78; // ~102°
  const clamp01 = (x) => Math.min(1, Math.max(0, x));
  const easeOutBack = (x, c1 = 1.7) => { const c3 = c1 + 1; return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2; };
  const easeOutCubic = (x) => 1 - (1 - x) ** 3;
  const easeInQuad = (x) => x * x;

  // one peek cycle; returns lid angle, shake and lift
  function loop(t, lively) {
    const rattle = lively ? 0.45 : 0, lift = lively ? 0.42 : 0.5, hold = lively ? 1.2 : 1.4, close = 0.3, bounce = 0.45;
    const period = lively ? 3.4 : 3.6;
    const rest = period - rattle - lift - hold - close - bounce;
    let ph = t % period;
    const out = { lid: 0, rz: 0, y: 0 };
    if ((ph -= rest) < 0) return out;
    if (ph < rattle) {
      const w = ph / rattle;
      const env = Math.sin(w * Math.PI);
      out.rz = Math.sin(w * Math.PI * 10) * 0.045 * env;
      out.y = Math.abs(Math.sin(w * Math.PI * 5)) * 0.04 * env;
      out.lid = -Math.abs(Math.sin(w * Math.PI * 10)) * 0.1 * env;
      return out;
    }
    if ((ph -= rattle) < lift) { out.lid = PEEK * easeOutBack(ph / lift, 1.2); return out; }
    if ((ph -= lift) < hold) { out.lid = PEEK + Math.sin((ph / hold) * Math.PI * 2) * 0.035; return out; }
    if ((ph -= hold) < close) { out.lid = PEEK * (1 - easeInQuad(ph / close)); return out; }
    ph -= close;
    const w = clamp01(ph / bounce);
    const decay = (1 - w) ** 1.5;
    out.lid = -Math.abs(Math.sin(w * Math.PI * 2.5)) * 0.16 * decay;
    out.rz = Math.sin(w * Math.PI * 6) * 0.03 * decay;
    out.y = Math.abs(Math.sin(w * Math.PI * 3)) * 0.035 * decay;
    return out;
  }

  let mode = getMode();
  let openStart = mode === 'open' ? -Infinity : 0; // mounted open = already open
  let openFrom = 0;
  let lidNow = 0;
  const t0 = performance.now();

  function frame(now) {
    const t = (now - t0) / 1000;
    let lid = 0, rz = 0, y = 0, glowA = 0, sway = 0, openK = 0;
    if (!reduced) sway = Math.sin(t * 0.7) * 0.1;
    if (mode === 'open') {
      const kk = reduced ? 1 : clamp01((t - openStart) / 0.95);
      openK = kk;
      lid = openFrom + (OPEN - openFrom) * easeOutBack(kk, 2.0);
      if (!reduced && kk < 1) { const w = kk; y = Math.sin(w * Math.PI) * 0.06 * (1 - w); rz = Math.sin(w * Math.PI * 4) * 0.03 * (1 - w); }
      glowA = 1 + (reduced ? 0 : Math.max(0, 0.6 * (1 - Math.abs(kk - 0.5) * 2)));
    } else if (reduced) {
      lid = PEEK; // static, open, coins showing
      glowA = mode === 'today' ? 0.95 : 0.75;
    } else {
      const lively = mode === 'today';
      const o = loop(t, lively);
      lid = o.lid; rz = o.rz; y = o.y;
      glowA = clamp01(lid / PEEK) * (lively ? 1.05 : 0.8) + (lively ? 0.12 : 0);
    }
    lidNow = lid;
    chest.rotation.set(0, -0.42 + sway, rz);
    chest.position.y = y;
    hinge.rotation.x = lid;
    inner.intensity = 7 * glowA;
    glowMat.opacity = Math.min(1, 0.8 * glowA);
    coinFace.emissiveIntensity = 0.2 + 0.35 * glowA;
    coinEdge.emissiveIntensity = 0.2 + 0.3 * glowA;

    // spill coins arc out over the rim during the claim
    const showSpill = mode === 'open';
    for (let i = 0; i < spill.length; i++) {
      const sc = spill[i];
      sc.m.visible = showSpill;
      if (!showSpill) continue;
      const w = reduced ? 1 : clamp01((openK - 0.25 - i * 0.12) / 0.5);
      const ew = easeOutCubic(w);
      sc.m.position.set(
        sc.from[0] + (sc.to[0] - sc.from[0]) * ew,
        sc.from[1] + (sc.to[1] - sc.from[1]) * ew + Math.sin(w * Math.PI) * 0.35,
        sc.from[2] + (sc.to[2] - sc.from[2]) * ew,
      );
      sc.m.rotation.set(sc.rot[0] * ew + (1 - ew) * 6 * w, sc.rot[1], sc.rot[2]);
    }
    // hopping coins
    for (const hp of hoppers) {
      const on = mode === 'open' && !reduced && openK >= 1;
      hp.m.visible = on;
      if (!on) continue;
      const cyc = ((t + hp.off) % 2.8) / 2.8;
      const w = clamp01(cyc / 0.32);
      const base = BH + mound(hp.x, hp.z) + 0.02;
      hp.m.position.set(hp.x, base + Math.sin(w * Math.PI) * 0.38, hp.z + w * 0.05);
      hp.m.rotation.set(w * Math.PI * 2, hp.off, 0.3);
    }
    // sparkles twinkle over the pile when it shows
    const sparkOn = clamp01(lid / PEEK);
    for (const s of sparkles) {
      const tw = reduced ? 0.6 : Math.max(0, Math.sin(t * 2.4 + s.off * 2.3)) ** 3;
      const a = sparkOn * tw * (mode === 'open' ? 1 : 0.8);
      s.sp.material.opacity = a;
      const sc = 0.04 + 0.2 * a;
      s.sp.scale.set(sc, sc, 1);
      s.sp.position.y = s.y + (reduced ? 0 : ((t * 0.15 + s.off) % 1) * 0.12);
    }
    renderer.render(scene, camera);
  }

  // ---- loop control: pause offscreen / hidden; reduced motion = one frame ----
  let raf = 0, visible = true, onScreen = true, disposed = false, first = true;
  let lastDraw = -1e9;
  const tick = (now) => {
    raf = 0;
    if (disposed) return;
    // ~30fps is plenty for a 118px chest and halves the GPU work
    if (!first && now - lastDraw < 31) { if (shouldLoop()) raf = requestAnimationFrame(tick); return; }
    lastDraw = now;
    frame(now);
    if (first) { first = false; canvas.style.opacity = '1'; onFirstFrame(); }
    if (shouldLoop()) raf = requestAnimationFrame(tick);
  };
  const shouldLoop = () => !disposed && visible && onScreen && !reduced;
  const kick = () => { if (!raf && !disposed) raf = requestAnimationFrame(tick); };
  const onVis = () => { visible = document.visibilityState !== 'hidden'; if (visible) kick(); };
  document.addEventListener('visibilitychange', onVis);
  let io = null;
  if (typeof IntersectionObserver !== 'undefined') {
    io = new IntersectionObserver((entries) => {
      onScreen = entries.some((en) => en.isIntersecting);
      if (onScreen) kick();
    });
    io.observe(host);
  }
  const onMq = () => { reduced = !!(mq && mq.matches); kick(); };
  if (mq && mq.addEventListener) mq.addEventListener('change', onMq);
  const onLostEvt = (ev) => { ev.preventDefault(); if (!disposed) onLost(); };
  canvas.addEventListener('webglcontextlost', onLostEvt);
  kick();

  return {
    setMode(m) {
      if (m === mode) return;
      if (m === 'open') { openFrom = lidNow; openStart = (performance.now() - t0) / 1000; }
      mode = m;
      kick();
    },
    resize(w) { setSize(w); kick(); },
    dispose() {
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      document.removeEventListener('visibilitychange', onVis);
      if (io) io.disconnect();
      if (mq && mq.removeEventListener) mq.removeEventListener('change', onMq);
      canvas.removeEventListener('webglcontextlost', onLostEvt);
      const geos = new Set(), mats = new Set();
      scene.traverse((o) => {
        if (o.geometry) geos.add(o.geometry);
        if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((mm) => mats.add(mm));
      });
      geos.forEach((g) => g.dispose());
      mats.forEach((mm) => mm.dispose());
      textures.forEach((tt) => tt.dispose());
      envTex.dispose();
      pmrem.dispose();
      key.shadow.map?.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    },
  };
}
