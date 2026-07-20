'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { C } from '@/components/redesign/tokens';
import { RewardIcon } from '@/components/redesign/RedesignShell';
import TutorialModal from '../modals/TutorialModal';
import { GameShell, GameBtn, OptionBtn } from './gameKit';

// ============================================================================
// LUCKY DICE — real rigid-body physics (three.js + cannon-es, lazy-loaded).
// Two dice are thrown into a small invisible arena with random velocity and
// spin, tumble under gravity, bounce off the table and walls, collide with
// each other, and settle naturally. The game result IS the physics result:
// whichever faces end up pointing up decide the total. If a die ends cocked
// (leaning), it gets a nudge; after two nudges it's gently straightened.
// ============================================================================

const ARENA = { w: 6.0, d: 3.8 };          // invisible walls keep dice in view
const DIE = 1.0;                            // die edge length (world units)
const SETTLE_FRAMES = 14;                   // consecutive quiet frames = settled
const MAX_ROLL_MS = 5000;                   // hard cap before force-settle
// local face normal → die value (opposite faces sum to 7)
const FACE_NORMALS = [
  [1, 0, 0, 3], [-1, 0, 0, 4],
  [0, 1, 0, 2], [0, -1, 0, 5],
  [0, 0, 1, 1], [0, 0, -1, 6],
];

// Pip layouts for the face textures
const PIPS = {
  1: [[0.5, 0.5]],
  2: [[0.3, 0.3], [0.7, 0.7]],
  3: [[0.27, 0.27], [0.5, 0.5], [0.73, 0.73]],
  4: [[0.3, 0.3], [0.7, 0.3], [0.3, 0.7], [0.7, 0.7]],
  5: [[0.28, 0.28], [0.72, 0.28], [0.5, 0.5], [0.28, 0.72], [0.72, 0.72]],
  6: [[0.3, 0.26], [0.7, 0.26], [0.3, 0.5], [0.7, 0.5], [0.3, 0.74], [0.7, 0.74]],
};

// Small flat die face used in the result equation ("3 + 4 = 7")
function MiniDie({ value, tint }) {
  return (
    <span style={{
      width: 30, height: 30, borderRadius: 7, display: 'inline-block', flex: 'none',
      background: 'linear-gradient(150deg, #fbfcf8, #d7dbe1)',
      boxShadow: `inset 0 0 0 1.5px ${tint}66, 0 3px 8px rgba(0,0,0,.4)`,
    }}>
      <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%', padding: 3 }}>
        {PIPS[value].map(([x, y], i) => (
          <circle key={i} cx={x * 100} cy={y * 100} r="10" fill="#12141c" />
        ))}
      </svg>
    </span>
  );
}

function makeFaceTexture(THREE, value, tint) {
  const size = 128;
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  const ctx = cv.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, size, size);
  g.addColorStop(0, '#fdfefb');
  g.addColorStop(0.55, '#eef0ee');
  g.addColorStop(1, '#d8dce2');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  // tinted edge ring
  ctx.strokeStyle = tint;
  ctx.globalAlpha = 0.4;
  ctx.lineWidth = 5;
  ctx.strokeRect(4, 4, size - 8, size - 8);
  ctx.globalAlpha = 1;
  // pips
  for (const [px, py] of PIPS[value]) {
    const x = px * size, y = py * size, r = size * 0.085;
    const pg = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.15, x, y, r);
    pg.addColorStop(0, '#3a3f4d');
    pg.addColorStop(1, '#12141c');
    ctx.fillStyle = pg;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.2)';
    ctx.beginPath();
    ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.25, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export default function DiceGame({ onClose, onWin, closing, onReplay }) {
  const mountRef = useRef(null);
  const engineRef = useRef(null);
  const rafRef = useRef(null);
  const rollTimeoutRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [rolling, setRolling] = useState(false);
  const [guess, setGuess] = useState(null);
  const [result, setResult] = useState(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [confetti, setConfetti] = useState([]);
  const [goldFlash, setGoldFlash] = useState(false);
  const [prizeCount, setPrizeCount] = useState(0);
  const guessRef = useRef(null);
  guessRef.current = guess;

  // count the prize chip up once the result lands
  useEffect(() => {
    if (!result || result.prize === 0) { setPrizeCount(0); return; }
    const t0 = performance.now();
    let raf;
    const tick = (now) => {
      const t = Math.min((now - t0) / 650, 1);
      setPrizeCount(Math.round(result.prize * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { if (raf) cancelAnimationFrame(raf); };
  }, [result]);

  // ---------------------------------------------------------------- scene --
  useEffect(() => {
    let disposed = false;
    (async () => {
      const [THREE, CANNON] = await Promise.all([
        import('three'),
        import('cannon-es'),
      ]);
      let RoundedBoxGeometry = null;
      try {
        ({ RoundedBoxGeometry } = await import('three/examples/jsm/geometries/RoundedBoxGeometry.js'));
      } catch (e) { /* fall back to sharp box */ }
      if (disposed || !mountRef.current) return;

      const mount = mountRef.current;
      const width = mount.clientWidth || 360;
      const height = 220;

      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height);
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      mount.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 60);
      camera.position.set(0, 4.9, 4.6);
      camera.lookAt(0, 0.3, -0.1);

      scene.add(new THREE.AmbientLight(0xffffff, 0.95));
      const key = new THREE.DirectionalLight(0xfff2dd, 1.9);
      key.position.set(3.5, 9, 4);
      key.castShadow = true;
      key.shadow.mapSize.set(1024, 1024);
      key.shadow.camera.left = -6; key.shadow.camera.right = 6;
      key.shadow.camera.top = 6; key.shadow.camera.bottom = -6;
      scene.add(key);
      const rim = new THREE.DirectionalLight(0x8fb8ff, 0.5);
      rim.position.set(-4, 5, -3);
      scene.add(rim);

      // shadow-only floor so the dice cast onto the modal's dark panel
      const floorMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(24, 24),
        new THREE.ShadowMaterial({ opacity: 0.4 })
      );
      floorMesh.rotation.x = -Math.PI / 2;
      floorMesh.receiveShadow = true;
      scene.add(floorMesh);

      // physics world
      const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -34, 0) });
      world.defaultContactMaterial.friction = 0.28;
      world.defaultContactMaterial.restitution = 0.42;

      const floorBody = new CANNON.Body({ type: CANNON.Body.STATIC, shape: new CANNON.Plane() });
      floorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
      world.addBody(floorBody);

      // invisible walls (front wall slightly lower so the camera sees in)
      const wall = (x, z, ry) => {
        const b = new CANNON.Body({ type: CANNON.Body.STATIC, shape: new CANNON.Plane() });
        b.position.set(x, 0, z);
        b.quaternion.setFromEuler(0, ry, 0);
        world.addBody(b);
      };
      wall(-ARENA.w / 2, 0, Math.PI / 2);
      wall(ARENA.w / 2, 0, -Math.PI / 2);
      wall(0, -ARENA.d / 2, 0);
      wall(0, ARENA.d / 2, Math.PI);

      // dice
      const tints = ['#e6ad4a', '#35b3a6'];
      const geo = RoundedBoxGeometry
        ? new RoundedBoxGeometry(DIE, DIE, DIE, 4, DIE * 0.09)
        : new THREE.BoxGeometry(DIE, DIE, DIE);
      const dice = tints.map((tint, i) => {
        // BoxGeometry material order: +x,-x,+y,-y,+z,-z → 3,4,2,5,1,6
        const mats = [3, 4, 2, 5, 1, 6].map(v => new THREE.MeshStandardMaterial({
          map: makeFaceTexture(THREE, v, tint),
          roughness: 0.32,
          metalness: 0.05,
        }));
        const mesh = new THREE.Mesh(geo, mats);
        mesh.castShadow = true;
        scene.add(mesh);
        const body = new CANNON.Body({
          mass: 1,
          shape: new CANNON.Box(new CANNON.Vec3(DIE / 2, DIE / 2, DIE / 2)),
          angularDamping: 0.12,
          linearDamping: 0.02,
        });
        // resting start pose
        body.position.set(i === 0 ? -1.1 : 1.1, DIE / 2, 0.2);
        body.quaternion.setFromEuler(0, (Math.random() - 0.5) * 1.2, 0);
        world.addBody(body);
        mesh.position.copy(body.position);
        mesh.quaternion.copy(body.quaternion);
        return { mesh, body, tint, nudges: 0 };
      });

      const renderOnce = () => renderer.render(scene, camera);
      renderOnce();

      engineRef.current = { THREE, CANNON, renderer, scene, camera, world, dice, renderOnce, mount };
      if (process.env.NODE_ENV !== 'production') window.__diceEngine = engineRef.current;
      setReady(true);
    })();

    return () => {
      disposed = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (rollTimeoutRef.current) clearTimeout(rollTimeoutRef.current);
      const eng = engineRef.current;
      if (eng) {
        eng.renderer.dispose();
        eng.dice.forEach(d => {
          d.mesh.material.forEach(m => { m.map?.dispose(); m.dispose(); });
        });
        eng.dice[0]?.mesh.geometry.dispose();
        if (eng.renderer.domElement.parentNode) {
          eng.renderer.domElement.parentNode.removeChild(eng.renderer.domElement);
        }
        engineRef.current = null;
      }
    };
  }, []);

  // ----------------------------------------------------------------- roll --
  const topFace = (CANNON, body) => {
    let best = -2, val = 1;
    for (const [x, y, z, v] of FACE_NORMALS) {
      const w = body.quaternion.vmult(new CANNON.Vec3(x, y, z));
      if (w.y > best) { best = w.y; val = v; }
    }
    return { val, dot: best };
  };

  const finishRoll = useCallback((values) => {
    const total = values[0] + values[1];
    const g = guessRef.current;
    const won = total === g;
    const close = Math.abs(total - g) <= 2 && !won;
    const prize = won ? 200 : close ? 40 : 0;
    setResult({ total, won, close, prize, d1: values[0], d2: values[1], guess: g });
    setRolling(false);
    if (won) {
      setGoldFlash(true);
      setTimeout(() => setGoldFlash(false), 700);
      setConfetti(Array.from({ length: 56 }, (_, i) => ({
        id: i,
        x: 26 + Math.random() * 48,
        y: 18 + Math.random() * 16,
        color: ['#ffd700', '#f5d060', '#e6ad4a', '#fff', '#57b795', '#eceef2'][i % 6],
        size: 4 + Math.random() * 7,
        rotation: Math.random() * 360,
        delay: Math.random() * 0.4,
        duration: 1.5 + Math.random() * 1.4,
      })));
      setTimeout(() => setConfetti([]), 3400);
    }
    if (prize > 0) onWin(prize);
    try { navigator.vibrate?.(won ? [20, 40, 30] : 15); } catch (e) {}
  }, [onWin]);

  const roll = () => {
    const eng = engineRef.current;
    if (!eng || rolling || guess === null) return;
    setRolling(true);
    setResult(null);

    const { THREE, CANNON, world, dice, renderer, scene, camera } = eng;

    // throw both dice in from above with random velocity + spin
    dice.forEach(({ body }, i) => {
      body.wakeUp?.();
      body.position.set((i === 0 ? -1 : 1) * (1.6 + Math.random() * 0.7), 3.4 + Math.random() * 1.2, 1.2 + Math.random() * 0.6);
      body.quaternion.setFromEuler(Math.random() * Math.PI * 2, Math.random() * Math.PI * 2, Math.random() * Math.PI * 2);
      body.velocity.set((i === 0 ? 1 : -1) * (3.5 + Math.random() * 2.5), 1 + Math.random() * 1.5, -(4 + Math.random() * 2));
      body.angularVelocity.set(
        (Math.random() - 0.5) * 30,
        (Math.random() - 0.5) * 30,
        (Math.random() - 0.5) * 30
      );
      // eslint-disable-next-line no-param-reassign
    });
    dice.forEach(d => { d.nudges = 0; });

    const started = performance.now();
    let quietFrames = 0;
    let lastTs = null;
    let snapping = null; // {t0, fromQ[], toQ[]} straighten-cocked-dice phase

    const step = (ts) => {
      const eng2 = engineRef.current;
      if (!eng2) return;
      const dt = lastTs === null ? 1 / 60 : Math.min((ts - lastTs) / 1000, 1 / 30);
      lastTs = ts;

      if (!snapping) {
        world.step(1 / 120, dt, 6);
        dice.forEach(({ mesh, body }) => {
          mesh.position.copy(body.position);
          mesh.quaternion.copy(body.quaternion);
        });

        const speeds = dice.map(({ body }) => body.velocity.length() + body.angularVelocity.length());
        const allQuiet = speeds.every(s => s < 0.32);
        quietFrames = allQuiet ? quietFrames + 1 : 0;
        const timedOut = performance.now() - started > MAX_ROLL_MS;

        if (quietFrames >= SETTLE_FRAMES || timedOut) {
          // check for cocked dice
          const faces = dice.map(d => topFace(CANNON, d.body));
          const cockedIdx = faces.findIndex(f => f.dot < 0.96);
          if (cockedIdx >= 0 && dice[cockedIdx].nudges < 2 && !timedOut) {
            // nudge the leaning die back into play
            const b = dice[cockedIdx].body;
            dice[cockedIdx].nudges++;
            b.velocity.set((Math.random() - 0.5) * 2, 4.5, (Math.random() - 0.5) * 2);
            b.angularVelocity.set((Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 12);
            quietFrames = 0;
          } else {
            // straighten any residual lean, then finish
            const toQ = dice.map(({ body }, i) => {
              const { val } = faces[i];
              const [nx, ny, nz] = FACE_NORMALS.find(f => f[3] === val);
              const worldN = body.quaternion.vmult(new CANNON.Vec3(nx, ny, nz));
              const arc = new THREE.Quaternion().setFromUnitVectors(
                new THREE.Vector3(worldN.x, worldN.y, worldN.z).normalize(),
                new THREE.Vector3(0, 1, 0)
              );
              const cur = new THREE.Quaternion(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w);
              return arc.multiply(cur);
            });
            snapping = {
              t0: ts,
              vals: faces.map(f => f.val),
              fromQ: dice.map(d => d.mesh.quaternion.clone()),
              toQ,
              fromY: dice.map(d => d.mesh.position.y),
            };
          }
        }
      } else {
        // short ease straightening the dice flat
        const t = Math.min((ts - snapping.t0) / 240, 1);
        const e = 1 - Math.pow(1 - t, 3);
        dice.forEach((d, i) => {
          d.mesh.quaternion.slerpQuaternions(snapping.fromQ[i], snapping.toQ[i], e);
          d.mesh.position.y = snapping.fromY[i] + (DIE / 2 - snapping.fromY[i]) * e;
        });
        if (t >= 1) {
          renderer.render(scene, camera);
          rafRef.current = null;
          finishRoll(snapping.vals);
          return;
        }
      }

      renderer.render(scene, camera);
      rafRef.current = requestAnimationFrame(step);
    };
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(step);
  };

  return (
    <GameShell title="🎲 Lucky Dice" onClose={onClose} closing={closing} onHelp={() => setShowTutorial(true)}>
      {showTutorial && <TutorialModal tutorialKey="dice" onClose={() => setShowTutorial(false)} />}

      <style>{`
        @keyframes diceGoldFlash {
          0% { opacity: 0; transform: scale(.7); }
          25% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.25); }
        }
        @keyframes diceEqIn {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes diceTotalPop {
          0% { opacity: 0; transform: scale(.2); }
          70% { transform: scale(1.18); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes diceBannerPop {
          0% { opacity: 0; transform: scale(.4) rotate(-5deg); }
          60% { opacity: 1; transform: scale(1.12) rotate(1.5deg); }
          100% { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        @keyframes diceChipRise {
          0% { opacity: 0; transform: translateY(16px) scale(.85); }
          70% { transform: translateY(-3px) scale(1.03); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .dice-again {
          border: none; cursor: pointer; padding: 0; border-radius: 14px;
          background: #2c6e56;
          box-shadow: 0 10px 26px rgba(79,169,139,.32);
          animation: diceChipRise .45s cubic-bezier(.34,1.56,.64,1) .6s both;
        }
        .dice-again-face {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 14px 38px; border-radius: 14px;
          background: linear-gradient(180deg, #66c5a3 0%, #4aa886 55%, #3f9a7b 100%);
          color: #08210f; font-weight: 900; font-size: 16px; letter-spacing: .07em;
          box-shadow: inset 0 1.5px 0 rgba(255,255,255,.4);
          transform: translateY(-5px);
          transition: transform .09s ease, filter .15s ease;
        }
        .dice-again:hover .dice-again-face { transform: translateY(-7px); filter: brightness(1.05); }
        .dice-again:active .dice-again-face { transform: translateY(-1px); }
      `}</style>

      <p style={{ textAlign: 'center', color: C.sub, marginBottom: 12, fontSize: 13.5 }}>Guess the total (2–12) and win big!</p>

      {/* physics table */}
      <div style={{ position: 'relative', marginBottom: 14 }}>
        <div ref={mountRef} style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {!ready && <span style={{ color: C.muted, fontSize: 13 }}>Loading dice…</span>}
        </div>
        {goldFlash && (
          <div style={{
            position: 'absolute', inset: '-10%', pointerEvents: 'none',
            background: 'radial-gradient(circle, rgba(255,215,0,.4) 0%, rgba(230,173,74,.15) 45%, transparent 75%)',
            animation: 'diceGoldFlash .7s ease-out both',
          }} />
        )}
      </div>

      {!result && (
        <>
          <p style={{ textAlign: 'center', fontSize: 12.5, color: C.muted, marginBottom: 12, fontWeight: 700 }}>
            {rolling ? 'The dice are tumbling…' : 'Select your guess'}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8, marginBottom: 20 }}>
            {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
              <OptionBtn key={n} selected={guess === n} disabled={rolling} onClick={() => setGuess(n)}>{n}</OptionBtn>
            ))}
          </div>
          <GameBtn onClick={roll} disabled={rolling || guess === null || !ready}>{rolling ? '🎲 Rolling…' : '🎲 Roll Dice!'}</GameBtn>
        </>
      )}

      {result && (
        <div style={{ textAlign: 'center' }}>
          {/* dice equation: [d1] + [d2] = total */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, marginBottom: 10, animation: 'diceEqIn .4s ease both' }}>
            <MiniDie value={result.d1} tint={C.gold} />
            <span style={{ color: C.muted, fontWeight: 800, fontSize: 15 }}>+</span>
            <MiniDie value={result.d2} tint={C.teal} />
            <span style={{ color: C.muted, fontWeight: 800, fontSize: 15 }}>=</span>
            <span style={{
              fontSize: 38, fontWeight: 900, lineHeight: 1, fontVariantNumeric: 'tabular-nums',
              background: result.won
                ? 'linear-gradient(180deg, #ffeaa0 0%, #ffd700 40%, #ff9500 100%)'
                : 'none',
              WebkitBackgroundClip: result.won ? 'text' : 'initial',
              WebkitTextFillColor: result.won ? 'transparent' : C.text,
              filter: result.won ? 'drop-shadow(0 0 14px rgba(255,215,0,.45))' : 'none',
              animation: 'diceTotalPop .55s cubic-bezier(.34,1.56,.64,1) .15s both',
            }}>{result.total}</span>
          </div>

          {/* verdict banner */}
          <div style={{
            fontSize: result.won ? 26 : 19,
            fontWeight: 900,
            letterSpacing: result.won ? '.06em' : '.03em',
            marginBottom: 6,
            ...(result.won ? {
              background: 'linear-gradient(180deg, #ffeaa0 0%, #ffd700 40%, #ff9500 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              filter: 'drop-shadow(0 2px 6px rgba(255,180,0,.35))',
            } : { color: result.close ? C.teal : C.muted }),
            animation: result.won
              ? 'diceBannerPop .5s cubic-bezier(.34,1.56,.64,1) .25s both'
              : result.close ? 'diceEqIn .4s ease .2s both' : 'wrongShake .5s ease .2s both',
          }}>
            {result.won ? 'EXACT HIT!' : result.close ? 'SO CLOSE!' : 'NO LUCK'}
          </div>

          {/* context line */}
          <p style={{ fontSize: 12.5, color: C.muted, margin: '0 0 12px' }}>
            {result.won
              ? `Called it — you guessed ${result.guess}!`
              : result.close
                ? `You guessed ${result.guess}, just ${Math.abs(result.total - result.guess)} off`
                : `You guessed ${result.guess} — the dice had other plans`}
          </p>

          {/* prize chip */}
          {result.prize > 0 && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '9px 20px', borderRadius: 999, marginBottom: 16,
              background: result.won ? 'rgba(230,173,74,.14)' : 'rgba(53,179,166,.12)',
              border: result.won ? '1.5px solid rgba(230,173,74,.45)' : '1.5px solid rgba(53,179,166,.4)',
              boxShadow: result.won ? '0 0 22px rgba(230,173,74,.18)' : 'none',
              animation: 'diceChipRise .45s cubic-bezier(.34,1.56,.64,1) .45s both',
            }}>
              <RewardIcon kind="coins" size={22} />
              <span style={{ fontSize: 22, fontWeight: 900, fontVariantNumeric: 'tabular-nums', color: result.won ? C.gold : C.teal }}>
                +{prizeCount}
              </span>
            </div>
          )}
          {result.prize === 0 && (
            <div style={{ height: 8 }} />
          )}

          {/* roll again — chunky 3D press button */}
          <div>
            <button
              type="button"
              className="dice-again"
              onClick={() => { if (onReplay && !onReplay()) return; setResult(null); setGuess(null); }}
            >
              <span className="dice-again-face">
                🎲 ROLL AGAIN
              </span>
            </button>
          </div>
        </div>
      )}

      {/* win confetti over the whole card */}
      {confetti.length > 0 && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', borderRadius: 20 }}>
          {confetti.map(p => (
            <div key={p.id} style={{
              position: 'absolute', left: `${p.x}%`, top: `${p.y}%`,
              width: p.size, height: p.size * 0.6,
              background: p.color, borderRadius: p.id % 2 ? '50%' : 2,
              transform: `rotate(${p.rotation}deg)`,
              animation: `confettiFall ${p.duration}s ease-out ${p.delay}s forwards`,
              '--drift': `${(Math.random() - 0.5) * 70}px`,
            }} />
          ))}
        </div>
      )}
    </GameShell>
  );
}
