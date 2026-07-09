/* ============================================================================
   KITOZ BURGER — Hero 3D scene (Three.js)
   A procedural, slowly rotating smash burger with warm studio lighting and
   floating spark particles. Reacts to the mouse, respects reduced-motion,
   and pauses when the tab is hidden. Degrades gracefully if WebGL is absent.
   ========================================================================== */
import * as THREE from "three";

const canvas = document.getElementById("scene");
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;

if (canvas && !reduceMotion) {
  try { init(); } catch (e) { console.warn("3D scene disabled:", e); }
}

function init() {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 1.1, 11);

  /* ---- Lighting: warm studio ------------------------------------------- */
  scene.add(new THREE.AmbientLight(0xffe8d0, 0.55));

  const key = new THREE.DirectionalLight(0xffffff, 2.1);
  key.position.set(5, 8, 6);
  scene.add(key);

  const rim = new THREE.DirectionalLight(0xff7a18, 2.4);
  rim.position.set(-6, 3, -4);
  scene.add(rim);

  const fill = new THREE.PointLight(0xffb347, 1.4, 40);
  fill.position.set(-3, -2, 6);
  scene.add(fill);

  /* ---- Materials -------------------------------------------------------- */
  const mat = (color, rough, metal = 0) =>
    new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });

  const bunMat = mat(0xe8912f, 0.62);
  const bunTopMat = mat(0xef9d3a, 0.55);
  const pattyMat = mat(0x3a2013, 0.85);
  const cheeseMat = mat(0xffb302, 0.35);
  const lettuceMat = mat(0x6fb63a, 0.7);
  const tomatoMat = mat(0xd23c34, 0.5);
  const seedMat = mat(0xf5e2b8, 0.5);

  /* ---- Build the burger ------------------------------------------------- */
  const burger = new THREE.Group();

  // Bottom bun — a slightly domed disc
  const bottomBun = new THREE.Mesh(new THREE.CylinderGeometry(2.05, 1.9, 0.7, 48), bunMat);
  roundTop(bottomBun);
  bottomBun.position.y = -1.55;
  burger.add(bottomBun);

  // Patty
  const patty = new THREE.Mesh(new THREE.CylinderGeometry(2.15, 2.15, 0.55, 48), pattyMat);
  patty.position.y = -1.0;
  burger.add(patty);

  // Cheese — a square slab rotated to show corners
  const cheese = new THREE.Mesh(new THREE.BoxGeometry(3.9, 0.14, 3.9), cheeseMat);
  cheese.position.y = -0.66;
  cheese.rotation.y = Math.PI / 4;
  burger.add(cheese);

  // Lettuce — a wavy green ring
  const lettuce = new THREE.Mesh(new THREE.TorusGeometry(1.85, 0.42, 12, 40), lettuceMat);
  wobble(lettuce.geometry, 0.14);
  lettuce.rotation.x = Math.PI / 2;
  lettuce.scale.y = 0.55;
  lettuce.position.y = -0.42;
  burger.add(lettuce);

  // Tomato
  const tomato = new THREE.Mesh(new THREE.CylinderGeometry(1.95, 1.95, 0.22, 40), tomatoMat);
  tomato.position.y = -0.12;
  burger.add(tomato);

  // Top bun — a dome
  const topBun = new THREE.Mesh(new THREE.SphereGeometry(2.1, 48, 32, 0, Math.PI * 2, 0, Math.PI / 2), bunTopMat);
  topBun.scale.y = 0.72;
  topBun.position.y = 0.15;
  burger.add(topBun);

  // Sesame seeds on the dome
  const seedGeo = new THREE.SphereGeometry(0.09, 8, 6);
  for (let i = 0; i < 26; i++) {
    const seed = new THREE.Mesh(seedGeo, seedMat);
    const phi = Math.acos(1 - Math.random() * 0.72);   // upper hemisphere-ish
    const theta = Math.random() * Math.PI * 2;
    const r = 2.02;
    seed.position.set(
      r * Math.sin(phi) * Math.cos(theta),
      0.15 + r * 0.72 * Math.cos(phi),
      r * Math.sin(phi) * Math.sin(theta)
    );
    seed.scale.set(1, 0.55, 1.5);
    seed.lookAt(0, 3, 0);
    burger.add(seed);
  }

  burger.rotation.x = 0.12;
  scene.add(burger);

  /* ---- Floating spark particles ---------------------------------------- */
  const count = 90;
  const pGeo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 22;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 16;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 10 - 2;
  }
  pGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({
    color: 0xff9d3c, size: 0.08, transparent: true, opacity: 0.7, depthWrite: false,
    blending: THREE.AdditiveBlending
  }));
  scene.add(particles);

  /* ---- Pointer parallax ------------------------------------------------- */
  const target = { x: 0, y: 0 };
  const cur = { x: 0, y: 0 };
  window.addEventListener("pointermove", (e) => {
    target.x = (e.clientX / window.innerWidth - 0.5);
    target.y = (e.clientY / window.innerHeight - 0.5);
  }, { passive: true });

  /* ---- Resize ----------------------------------------------------------- */
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (w === 0 || h === 0) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // pull the burger to the right on wide screens, center on narrow
    burger.position.x = w / h > 1.1 ? 3.1 : 0;
    burger.position.y = w / h > 1.1 ? 0 : -0.6;
    const s = w / h > 1.1 ? 1 : 0.82;
    burger.scale.setScalar(s);
    camera.updateProjectionMatrix();
  }
  window.addEventListener("resize", resize);
  resize();

  /* ---- Animate ---------------------------------------------------------- */
  let running = true;
  document.addEventListener("visibilitychange", () => {
    running = !document.hidden;
    if (running) clock.start(), loop();
  });

  const clock = new THREE.Clock();
  function loop() {
    if (!running) return;
    requestAnimationFrame(loop);
    const t = clock.getElapsedTime();

    cur.x += (target.x - cur.x) * 0.05;
    cur.y += (target.y - cur.y) * 0.05;

    burger.rotation.y += 0.004;
    burger.rotation.z = cur.x * 0.18;
    burger.rotation.x = 0.12 + cur.y * 0.2;
    burger.position.y += Math.sin(t * 1.1) * 0.0016;   // gentle bob

    particles.rotation.y = t * 0.03;
    particles.position.y = Math.sin(t * 0.4) * 0.4;

    renderer.render(scene, camera);
  }
  loop();
}

/* ---- Geometry helpers ---------------------------------------------------- */
// Round off the top rim of a cylinder for a softer bun look
function roundTop(mesh) {
  const g = mesh.geometry;
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const y = p.getY(i);
    if (y > 0) {
      const x = p.getX(i), z = p.getZ(i);
      p.setX(i, x * 0.92);
      p.setZ(i, z * 0.92);
    }
  }
  g.computeVertexNormals();
}

// Add gentle random wobble to a geometry for organic edges
function wobble(g, amt) {
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    p.setX(i, p.getX(i) + (Math.random() - 0.5) * amt);
    p.setY(i, p.getY(i) + (Math.random() - 0.5) * amt);
    p.setZ(i, p.getZ(i) + (Math.random() - 0.5) * amt);
  }
  g.computeVertexNormals();
}
