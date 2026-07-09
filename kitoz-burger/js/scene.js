/* ============================================================================
   KITOZ BURGER — Hero 3D scene (Three.js)  ·  premium build
   ----------------------------------------------------------------------------
   A studio-lit, physically-shaded smash burger:
   • Lathe-modeled brioche buns with a glazed clearcoat
   • Seared, irregular patty · melting cheese with drips · ruffled lettuce
   • Tomato + onion · scattered sesame seeds
   • Real environment reflections (RoomEnvironment), filmic tone mapping,
     soft contact shadow and a warm additive glow.
   Reacts to the mouse, respects reduced-motion, pauses when hidden, and
   degrades gracefully if WebGL / add-ons are unavailable.
   ========================================================================== */
import * as THREE from "three";

const canvas = document.getElementById("scene");
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

if (canvas && !reduceMotion) {
  init().catch((e) => console.warn("3D scene disabled:", e));
}

async function init() {
  /* ---- Renderer --------------------------------------------------------- */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.12;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
  camera.position.set(0, 0.7, 12);

  /* ---- Environment reflections (soft studio) ---------------------------- */
  try {
    const { RoomEnvironment } = await import("three/addons/environments/RoomEnvironment.js");
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  } catch (e) {
    // No env map — the lights below still render a good result.
  }

  /* ---- Stage (holds everything; repositioned on resize) ----------------- */
  const stage = new THREE.Group();
  scene.add(stage);

  /* ---- Lighting: warm 3-point studio ------------------------------------ */
  scene.add(new THREE.HemisphereLight(0xffe9d2, 0x241a12, 0.5));

  const key = new THREE.DirectionalLight(0xfff2e2, 2.6);
  key.position.set(4.5, 8, 6);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  key.shadow.radius = 6;
  key.shadow.bias = -0.0006;
  const sc = key.shadow.camera;
  sc.near = 1; sc.far = 30; sc.left = -4.5; sc.right = 4.5; sc.top = 4.5; sc.bottom = -4.5;
  const keyTarget = new THREE.Object3D();
  stage.add(keyTarget);
  key.target = keyTarget;
  stage.add(key);

  const rim = new THREE.DirectionalLight(0xff7a18, 3.2);   // orange edge light
  rim.position.set(-6, 2.5, -5);
  stage.add(rim);

  const fill = new THREE.PointLight(0xffb060, 1.1, 40);
  fill.position.set(-3, -1.5, 6);
  stage.add(fill);

  /* ---- Materials -------------------------------------------------------- */
  const physical = (o) => new THREE.MeshPhysicalMaterial(o);

  const bunMat = physical({ color: 0xd98a37, roughness: 0.42, clearcoat: 0.55, clearcoatRoughness: 0.45, sheen: 0.3, sheenColor: new THREE.Color(0xffcaa0) });
  const bunBottomMat = physical({ color: 0xcf7f30, roughness: 0.5, clearcoat: 0.4, clearcoatRoughness: 0.5 });
  const pattyMat = physical({ color: 0x3c2214, roughness: 0.9, clearcoat: 0.15, clearcoatRoughness: 0.8 });
  const cheeseMat = physical({ color: 0xf7b301, roughness: 0.28, clearcoat: 0.85, clearcoatRoughness: 0.25, sheen: 0.4, sheenColor: new THREE.Color(0xffe08a) });
  const lettuceMat = physical({ color: 0x74b83a, roughness: 0.55, sheen: 0.5, sheenColor: new THREE.Color(0xbfe08a), clearcoat: 0.2 });
  const tomatoMat = physical({ color: 0xd8382c, roughness: 0.32, clearcoat: 0.5, clearcoatRoughness: 0.3, transmission: 0.08, thickness: 0.4 });
  const onionMat = physical({ color: 0xf3e8de, roughness: 0.4, transmission: 0.25, thickness: 0.3, clearcoat: 0.3 });
  const seedMat = physical({ color: 0xf3e0b6, roughness: 0.5 });

  /* ---- Burger pivot (this is what rotates / bobs) ----------------------- */
  const burger = new THREE.Group();
  stage.add(burger);

  const enableShadow = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };

  // Bottom bun — lathe-revolved rounded disc
  const bottomBun = enableShadow(new THREE.Mesh(lathe([
    [0.02, -0.50], [0.55, -0.52], [1.15, -0.50], [1.62, -0.42],
    [1.92, -0.26], [2.00, -0.03], [1.88, 0.10], [1.40, 0.15], [0.02, 0.15]
  ]), bunBottomMat));
  bottomBun.position.y = -1.5;
  burger.add(bottomBun);

  // Patty — thick seared disc with an irregular, bumpy rim (peeks past the bun)
  const pattyGeo = new THREE.CylinderGeometry(2.0, 1.94, 0.5, 64, 3, false);
  roundEdges(pattyGeo, 0.18);
  jitterRim(pattyGeo, 0.06);
  const patty = enableShadow(new THREE.Mesh(pattyGeo, pattyMat));
  patty.position.y = -1.05;
  burger.add(patty);

  // Cheese — square slab rotated to show corners, plus melting drips
  const cheese = enableShadow(new THREE.Mesh(new THREE.BoxGeometry(3.05, 0.13, 3.05, 1, 1, 1), cheeseMat));
  cheese.position.y = -0.75;
  cheese.rotation.y = Math.PI / 4;
  burger.add(cheese);
  for (let i = 0; i < 4; i++) {
    const drip = enableShadow(new THREE.Mesh(new THREE.SphereGeometry(0.22, 16, 12), cheeseMat));
    const a = (i / 4) * Math.PI * 2;
    drip.position.set(Math.cos(a) * 1.6, -0.86, Math.sin(a) * 1.6);
    drip.scale.set(1, 1.5, 0.68);   // draping blob hugging the patty edge
    burger.add(drip);
  }

  // Tomato slice
  const tomato = enableShadow(new THREE.Mesh(new THREE.CylinderGeometry(1.86, 1.84, 0.16, 48), tomatoMat));
  tomato.position.y = -0.6;
  burger.add(tomato);

  // Onion ring
  const onion = enableShadow(new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.09, 12, 48), onionMat));
  onion.rotation.x = Math.PI / 2;
  onion.scale.y = 0.5;
  onion.position.y = -0.5;
  burger.add(onion);

  // Lettuce — ruffled green ring, leafing out past the buns
  const lettuceGeo = new THREE.TorusGeometry(1.82, 0.34, 16, 100);
  ruffle(lettuceGeo, 0.2, 10);
  const lettuce = enableShadow(new THREE.Mesh(lettuceGeo, lettuceMat));
  lettuce.rotation.x = Math.PI / 2;
  lettuce.scale.y = 0.5;
  lettuce.position.y = -0.42;
  burger.add(lettuce);

  // Top bun — lathe-revolved brioche dome
  const topBun = enableShadow(new THREE.Mesh(lathe([
    [2.00, -0.06], [2.03, 0.06], [1.9, 0.30], [1.6, 0.60],
    [1.2, 0.86], [0.78, 1.03], [0.36, 1.13], [0.02, 1.16]
  ]), bunMat));
  topBun.position.y = -0.28;
  burger.add(topBun);

  // Sesame seeds scattered on the dome
  const seedGeo = new THREE.SphereGeometry(0.085, 10, 8);
  const domeCx = 0, domeCy = topBun.position.y, rx = 2.0, ry = 1.16;
  const golden = Math.PI * (3 - Math.sqrt(5));   // even, non-clumping spread
  const seedCount = 30;
  for (let i = 0; i < seedCount; i++) {
    const seed = enableShadow(new THREE.Mesh(seedGeo, seedMat));
    const frac = (i + 0.5) / seedCount;
    const phi = (0.28 + frac * 0.64) * (Math.PI / 2);   // skip the very apex
    const theta = i * golden;
    const sx = rx * Math.sin(phi) * Math.cos(theta);
    const sz = rx * Math.sin(phi) * Math.sin(theta);
    const sy = domeCy + ry * Math.cos(phi);
    seed.position.set(domeCx + sx * 0.99, sy + 0.02, sz * 0.99);
    seed.scale.set(1, 0.55, 1.5);
    seed.lookAt(0, domeCy + ry + 1.4, 0);
    seed.rotateZ(Math.random() * Math.PI);   // vary seed orientation
    burger.add(seed);
  }

  // Lift the whole burger so it frames nicely
  burger.position.y = 0.55;
  burger.rotation.x = 0.1;

  /* ---- Soft contact shadow --------------------------------------------- */
  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(16, 16),
    new THREE.ShadowMaterial({ opacity: 0.34 })
  );
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = -1.75;
  shadowPlane.receiveShadow = true;
  stage.add(shadowPlane);

  /* ---- Warm glow behind the burger ------------------------------------- */
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({
    map: radialTexture("#ff7a18"), color: 0xffffff, transparent: true,
    opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending
  }));
  glow.scale.set(11, 11, 1);
  glow.position.set(0, 0.4, -2.5);
  stage.add(glow);

  /* ---- Floating embers -------------------------------------------------- */
  const count = 70;
  const pGeo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 16;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 12;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 8 - 1;
  }
  pGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const embers = new THREE.Points(pGeo, new THREE.PointsMaterial({
    map: radialTexture("#ffb264"), color: 0xffb060, size: 0.16, transparent: true,
    opacity: 0.8, depthWrite: false, blending: THREE.AdditiveBlending
  }));
  scene.add(embers);

  /* ---- Pointer parallax ------------------------------------------------- */
  const target = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
  window.addEventListener("pointermove", (e) => {
    target.x = e.clientX / window.innerWidth - 0.5;
    target.y = e.clientY / window.innerHeight - 0.5;
  }, { passive: true });

  /* ---- Resize ----------------------------------------------------------- */
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const wide = w / h > 1.1;
    stage.position.x = wide ? 3.0 : 0;
    stage.position.y = wide ? 0 : -0.5;
    stage.scale.setScalar(wide ? 1 : 0.82);
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);
  resize();

  /* ---- Animate ---------------------------------------------------------- */
  const clock = new THREE.Clock();
  let running = true;
  document.addEventListener("visibilitychange", () => {
    running = !document.hidden;
    if (running) { clock.start(); loop(); }
  });

  function loop() {
    if (!running) return;
    requestAnimationFrame(loop);
    const t = clock.getElapsedTime();

    cur.x += (target.x - cur.x) * 0.05;
    cur.y += (target.y - cur.y) * 0.05;

    burger.rotation.y += 0.0038;
    burger.rotation.z = cur.x * 0.16;
    burger.rotation.x = 0.1 + cur.y * 0.18;
    burger.position.y = 0.55 + Math.sin(t * 1.1) * 0.05;

    embers.rotation.y = t * 0.025;
    embers.position.y = Math.sin(t * 0.35) * 0.4;
    glow.material.opacity = 0.5 + Math.sin(t * 1.4) * 0.06;

    renderer.render(scene, camera);
  }
  loop();
}

/* ============================================================================
   Geometry & texture helpers
   ========================================================================== */

// Build a lathe (surface of revolution) from [radius, y] pairs.
function lathe(pairs) {
  const pts = pairs.map(([r, y]) => new THREE.Vector2(Math.max(r, 0.001), y));
  const g = new THREE.LatheGeometry(pts, 64);
  g.computeVertexNormals();
  return g;
}

// Soften the top/bottom rim of a cylinder by pulling the outer edge inward.
function roundEdges(g, amt) {
  const p = g.attributes.position;
  let maxY = -Infinity, minY = Infinity;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i); if (y > maxY) maxY = y; if (y < minY) minY = y; }
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    if (Math.abs(y - maxY) < 1e-3 || Math.abs(y - minY) < 1e-3) {
      const x = p.getX(i), z = p.getZ(i), s = 1 - amt;
      p.setX(i, x * s); p.setZ(i, z * s);
    }
  }
  g.computeVertexNormals();
}

// Add subtle radial jitter to a mesh's rim so it isn't perfectly circular.
function jitterRim(g, amt) {
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    const r = Math.hypot(x, z);
    if (r > 0.001) {
      const n = 1 + (Math.sin(Math.atan2(z, x) * 7) * 0.5 + (Math.random() - 0.5)) * amt;
      p.setX(i, x * n); p.setZ(i, z * n);
    }
  }
  g.computeVertexNormals();
}

// Give a torus a rippled, leafy edge.
function ruffle(g, amt, freq) {
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const ang = Math.atan2(z, x);
    const w = Math.sin(ang * freq) * amt + (Math.random() - 0.5) * amt * 0.5;
    p.setY(i, y + w);
    const s = 1 + w * 0.25;
    p.setX(i, x * s); p.setZ(i, z * s);
  }
  g.computeVertexNormals();
}

// A soft radial-gradient sprite texture (for glow & embers).
function radialTexture(hex) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d");
  const grd = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, hex);
  grd.addColorStop(0.4, hex + "88");
  grd.addColorStop(1, hex + "00");
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
