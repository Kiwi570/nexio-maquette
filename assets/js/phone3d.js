/* NEXIO — téléphone 3D (WebGL, three.js)
   mode 'hero'  : écran fissuré qui se ressoude sous le curseur ou le doigt
   mode 'xray'  : radiographie, la pièce choisie s'allume */
import * as THREE from '../vendor/three/three.module.min.js';
import { RoundedBoxGeometry } from '../vendor/three/RoundedBoxGeometry.js';
import { RoomEnvironment } from '../vendor/three/RoomEnvironment.js';
import { makeCracks, crackCanvas } from './cracks.js?v=20261028';

const PW = 1.0, PH = 2.08, PD = 0.1, PR = 0.14;
const SW = 0.93, SH = 2.01;
const CYAN = new THREE.Color('#39e9f7');
const IMPACT = { x: 0.66, y: 0.27 };

const SCREEN_VS = /* glsl */`
varying vec2 vUv;
void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

const SCREEN_FS = /* glsl */`
precision highp float;
uniform float uTime, uCrackGrow, uHealWave, uPower, uXray, uHi, uGlare;
uniform sampler2D uCrack, uHeal;
uniform vec2 uImpact, uSize;
uniform vec3 uCyan;
varying vec2 vUv;
float sdRound(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p){ vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y); }
float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
vec3 wallpaper(vec2 uv){
  vec2 p = (uv - 0.5) * vec2(uSize.x / uSize.y, 1.0) * 2.0;
  float t = uTime * 0.05;
  float n = fbm(p * 1.4 + vec2(t, -t * 0.8));
  float bands = sin(p.y * 2.6 + p.x * 1.2 + n * 4.2 - uTime * 0.22) * 0.5 + 0.5;
  vec3 col = mix(vec3(0.006, 0.012, 0.022), vec3(0.012, 0.045, 0.07), uv.y);
  col += uCyan * pow(bands, 7.0) * 0.5 * (0.35 + n);
  col += vec3(0.16, 0.12, 0.42) * pow(1.0 - bands, 10.0) * 0.12;
  vec2 c = p - vec2(0.0, -0.15);
  col += uCyan * 0.10 * exp(-dot(c, c) * 1.6);
  return col;
}
void main(){
  vec2 p = (vUv - 0.5) * uSize;
  float d = sdRound(p, uSize * 0.5, 0.105);
  float aa = fwidth(d) * 1.2;
  float mask = 1.0 - smoothstep(-aa, aa, d);
  if (mask <= 0.0) discard;

  vec4 cr = texture2D(uCrack, vUv);
  float healTex = texture2D(uHeal, vUv).r;
  float dist = length((vUv - uImpact) * uSize);
  float present = 1.0 - smoothstep(uCrackGrow * 2.5 - 0.1, uCrackGrow * 2.5, dist);
  float wave = 1.0 - smoothstep(uHealWave * 2.7 - 0.3, uHealWave * 2.7, dist);
  float h = clamp(max(healTex, wave), 0.0, 1.0);
  float broken = present * (1.0 - smoothstep(0.35, 0.9, h));

  vec2 grad = vec2(dFdx(cr.g), dFdy(cr.g));
  vec3 col = wallpaper(vUv + grad * 0.5 * broken);

  float shatter = cr.b * broken;
  col *= 1.0 - shatter * 0.6;
  float row = step(0.982, hash(vec2(floor(vUv.y * 160.0), floor(uTime * 0.6))));
  col = mix(col, uCyan * 0.45, row * shatter * 0.55);
  col += vec3(0.78, 0.88, 0.95) * cr.r * broken * 0.9;
  col += vec3(0.5, 0.75, 0.85) * cr.g * broken * 0.05;

  float hot = present * smoothstep(0.03, 0.4, h) * (1.0 - smoothstep(0.55, 0.97, h));
  col += uCyan * (cr.g * 1.7 + cr.r * 2.6) * hot;
  col += vec3(1.0) * cr.r * hot * 0.7;

  float s = 1.0 - vUv.y;
  float on = 1.0 - smoothstep(uPower - 0.015, uPower, s);
  float line = exp(-pow((s - uPower) * 70.0, 2.0)) * (1.0 - step(0.999, uPower));
  col = col * on + uCyan * line * 0.9;

  float gl = 1.0 - abs((vUv.x * 0.55 + vUv.y) - (0.25 + uGlare)) * 5.0;
  col += vec3(0.8, 0.95, 1.0) * smoothstep(0.0, 1.0, gl) * 0.05 * on;

  vec2 g = fract(p * 18.0);
  float grid = (1.0 - smoothstep(0.0, 0.06, min(g.x, g.y))) * 0.5;
  vec3 xcol = vec3(0.008, 0.03, 0.04) + uCyan * grid * (0.18 + uHi * 0.6) + uCyan * uHi * 0.12;
  col = mix(col, xcol, uXray);
  float alpha = mask * mix(1.0, 0.22 + uHi * 0.5, uXray);
  gl_FragColor = vec4(col, alpha);
}`;

export function webglOK() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGL2RenderingContext && c.getContext('webgl2'));
  } catch (e) { return false; }
}

export function createPhone(canvas, { mode = 'hero', calm = false, onPaint } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.42;

  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
  camera.position.set(0, 0, 5.4);

  const key = new THREE.DirectionalLight(0xffe2c4, 1.1); key.position.set(-3, 2.5, 4); scene.add(key);
  const rim = new THREE.DirectionalLight(0x39e9f7, 3.2); rim.position.set(3.5, 1.2, -2.5); scene.add(rim);
  const rake = new THREE.PointLight(0x39e9f7, 6, 6, 1.6); rake.position.set(1.4, 0, 1.2); scene.add(rake);

  const root = new THREE.Group(); scene.add(root);
  const phone = new THREE.Group(); root.add(phone);

  /* Corps */
  const bodyGeo = new RoundedBoxGeometry(PW, PH, PD, 8, PR);
  const bodyMat = new THREE.MeshPhysicalMaterial({
    color: 0x161b21, metalness: 0.75, roughness: 0.32, clearcoat: 0.8, clearcoatRoughness: 0.18,
  });
  const body = new THREE.Mesh(bodyGeo, bodyMat); phone.add(body);
  const bodyEdges = new THREE.LineSegments(new THREE.EdgesGeometry(bodyGeo, 25), new THREE.LineBasicMaterial({ color: CYAN, transparent: true, opacity: 0 }));
  phone.add(bodyEdges);

  /* Boutons latéraux */
  const btnMat = new THREE.MeshPhysicalMaterial({ color: 0x20262e, metalness: 0.85, roughness: 0.3 });
  [[PW / 2 + 0.008, 0.45, 0.32], [-PW / 2 - 0.008, 0.55, 0.16], [-PW / 2 - 0.008, 0.3, 0.16]].forEach(([x, y, h]) => {
    const b = new THREE.Mesh(new RoundedBoxGeometry(0.03, h, 0.04, 2, 0.012), btnMat); b.position.set(x, y, 0); phone.add(b);
  });

  /* Bloc photo au dos */
  const bump = new THREE.Mesh(new RoundedBoxGeometry(0.3, 0.52, 0.035, 4, 0.08), new THREE.MeshPhysicalMaterial({ color: 0x1c2229, metalness: 0.6, roughness: 0.25, clearcoat: 1 }));
  bump.position.set(-0.27, 0.68, -PD / 2 - 0.012); phone.add(bump);
  const lensMat = new THREE.MeshPhysicalMaterial({ color: 0x05070a, metalness: 0.2, roughness: 0.05, clearcoat: 1, transmission: 0 });
  [0.82, 0.56].forEach(y => {
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.03, 40), lensMat);
    l.rotation.x = Math.PI / 2; l.position.set(-0.27, y, -PD / 2 - 0.03); phone.add(l);
  });

  /* Écran */
  const cr = makeCracks({ ix: IMPACT.x, iy: IMPACT.y });
  const crackTex = new THREE.CanvasTexture(crackCanvas(cr));
  crackTex.colorSpace = THREE.NoColorSpace;
  const healC = document.createElement('canvas'); healC.width = 160; healC.height = 346;
  const hg = healC.getContext('2d', { willReadFrequently: true }); hg.fillStyle = '#000'; hg.fillRect(0, 0, 160, 346);
  const healTex = new THREE.CanvasTexture(healC); healTex.colorSpace = THREE.NoColorSpace;

  const uniforms = {
    uTime: { value: 0 }, uCrackGrow: { value: 0 }, uHealWave: { value: 0 }, uPower: { value: 0 },
    uXray: { value: mode === 'xray' ? 1 : 0 }, uHi: { value: 0 }, uGlare: { value: 0 },
    uCrack: { value: crackTex }, uHeal: { value: healTex },
    uImpact: { value: new THREE.Vector2(IMPACT.x, 1 - IMPACT.y) }, uSize: { value: new THREE.Vector2(SW, SH) },
    uCyan: { value: new THREE.Vector3(CYAN.r, CYAN.g, CYAN.b) },
  };
  const screenMat = new THREE.ShaderMaterial({ vertexShader: SCREEN_VS, fragmentShader: SCREEN_FS, uniforms, transparent: true, depthWrite: mode !== 'xray' });
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), screenMat);
  screen.position.z = PD / 2 + 0.0015; phone.add(screen);

  let scan = null;
  /* Pièces internes (radiographie) */
  const parts = {};
  const internals = new THREE.Group(); phone.add(internals);
  const PART_BASE = new THREE.Color('#0c2a30');
  const partMat = () => new THREE.MeshBasicMaterial({ color: PART_BASE.clone(), transparent: true, opacity: 0.85, depthWrite: false });
  const addPart = (name, meshes) => {
    const g = new THREE.Group();
    const edgeMat = new THREE.LineBasicMaterial({ color: CYAN, transparent: true, opacity: 0.3 });
    const mats = [];
    meshes.forEach(m => {
      g.add(m); mats.push(m.material);
      const e = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, 30), edgeMat);
      e.position.copy(m.position); e.rotation.copy(m.rotation); g.add(e);
    });
    internals.add(g);
    parts[name] = { group: g, mats, edgeMat, k: 0 };
  };
  const box = (w, h, d, x, y, z, r = 0.01) => { const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, r), partMat()); m.position.set(x, y, z); return m; };
  addPart('battery', [box(0.66, 1.02, 0.034, 0, -0.27, -0.004, 0.03)]);
  addPart('board', [box(0.84, 0.46, 0.016, 0.02, 0.68, 0.006), box(0.16, 0.16, 0.02, 0.18, 0.7, 0.02, 0.01), box(0.12, 0.1, 0.02, 0.32, 0.56, 0.02, 0.01), box(0.1, 0.1, 0.02, -0.02, 0.58, 0.02, 0.01)]);
  const cam = (y) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.05, 28), partMat()); m.rotation.x = Math.PI / 2; m.position.set(-0.27, y, -0.02); return m; };
  addPart('camera', [cam(0.82), cam(0.56)]);
  addPart('port', [box(0.2, 0.05, 0.045, 0, -1.0, 0, 0.02)]);
  addPart('speaker', [box(0.22, 0.04, 0.035, 0.3, -0.99, 0, 0.015), box(0.18, 0.025, 0.02, 0, 0.98, 0.03, 0.01)]);
  const backMat = new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
  const backPlane = new THREE.Mesh(new THREE.PlaneGeometry(SW, SH), backMat);
  backPlane.position.z = -PD / 2 - 0.002; backPlane.rotation.y = Math.PI;
  const backEdge = new THREE.LineBasicMaterial({ color: CYAN, transparent: true, opacity: 0 });
  const backLines = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(SW, SH, 6, 12)), backEdge);
  backLines.position.copy(backPlane.position); backLines.rotation.copy(backPlane.rotation);
  phone.add(backPlane, backLines);
  parts.back = { group: backPlane, mats: [], edgeMat: backEdge, k: 0, plane: backMat };
  parts.screen = { mats: [], k: 0 };
  internals.visible = mode === 'xray';

  if (mode === 'xray') {
    bodyMat.transparent = true; bodyMat.opacity = 0.1; bodyMat.depthWrite = false;
    bodyEdges.material.opacity = 0.6;
    const scanGeo = new THREE.PlaneGeometry(PW - 0.02, 0.012);
    scan = new THREE.Mesh(scanGeo, new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    const halo = new THREE.Mesh(new THREE.PlaneGeometry(PW - 0.02, 0.14), new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0.05, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    scan.add(halo);
    phone.add(scan);
    bump.visible = false;
    phone.children.filter(c => c.material === lensMat).forEach(c => { c.visible = false; });
    uniforms.uPower.value = 1; uniforms.uCrackGrow.value = 0;
  }

  /* État piloté par GSAP */
  const state = {
    rise: mode === 'xray' ? 1 : 0, crack: 0, power: mode === 'xray' ? 1 : 0, wave: 0,
    rotX: 0.12, rotY: -0.32, x: 0, y: 0, scale: 1, part: null, spin: mode === 'xray' ? 1 : 0,
  };
  const tilt = { x: 0, y: 0, tx: 0, ty: 0 };
  const drag = { on: false, sx: 0, base: 0, off: 0 };
  let targetRot = { x: 0.12, y: -0.32 };

  /* Taille et cadrage */
  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    const fov = THREE.MathUtils.degToRad(camera.fov);
    const fitH = (PH / 0.74) / 2 / Math.tan(fov / 2);
    const hfov = 2 * Math.atan(Math.tan(fov / 2) * camera.aspect);
    const fitW = (PW / 0.62) / 2 / Math.tan(hfov / 2);
    camera.position.z = Math.max(fitH, fitW);
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize); ro.observe(canvas); resize();

  /* Peinture de soudure */
  const ray = new THREE.Raycaster(); const ndc = new THREE.Vector2();
  let healed = 0, painted = 0;
  function paintUV(u, v, strength = 0.22) {
    const x = u * healC.width, y = (1 - v) * healC.height, R = 24;
    hg.globalCompositeOperation = 'lighter';
    const g = hg.createRadialGradient(x, y, 0, x, y, R);
    g.addColorStop(0, `rgba(255,255,255,${strength})`); g.addColorStop(1, 'rgba(255,255,255,0)');
    hg.fillStyle = g; hg.fillRect(x - R, y - R, R * 2, R * 2);
    healTex.needsUpdate = true;
    painted++;
    if (painted % 12 === 0) measureHeal();
  }
  function measureHeal() {
    const d = hg.getImageData(0, 0, healC.width, healC.height).data;
    let s = 0; for (let i = 0; i < d.length; i += 16) s += d[i];
    healed = s / (d.length / 16) / 255;
    onPaint && onPaint(healed);
  }
  function hitUV(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    if (clientX < r.left || clientX > r.right || clientY < r.top || clientY > r.bottom) return null;
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObject(screen, false)[0];
    return hit ? hit.uv : null;
  }
  let overScreen = false;
  function onMove(e) {
    const r = canvas.getBoundingClientRect();
    tilt.tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    tilt.ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
    if (drag.on) { drag.off = drag.base + (e.clientX - drag.sx) / r.width * 4; return; }
    if (mode !== 'hero' || calm) return;
    const uv = hitUV(e.clientX, e.clientY);
    overScreen = !!uv && state.crack > 0.5;
    document.documentElement.classList.toggle('cursor-solder', overScreen);
    if (uv && state.crack > 0.5) paintUV(uv.x, uv.y, e.pointerType === 'touch' ? 0.32 : 0.2);
  }
  window.addEventListener('pointermove', onMove, { passive: true });
  if (mode === 'xray') {
    canvas.addEventListener('pointerdown', e => { drag.on = true; drag.sx = e.clientX; drag.base = drag.off; canvas.setPointerCapture?.(e.pointerId); });
    window.addEventListener('pointerup', () => { drag.on = false; });
  }

  /* Coup de pinceau automatique (démonstration si le visiteur ne touche pas l'écran) */
  let ghost = null;
  function ghostStroke(duration = 2.6) {
    const t0 = performance.now();
    ghost = () => {
      const k = (performance.now() - t0) / (duration * 1000);
      if (k > 1) { ghost = null; return; }
      const u = 0.5 + Math.sin(k * Math.PI * 2.2) * 0.32 * (1 - k * 0.3);
      const v = 0.86 - k * 0.72;
      paintUV(u, v, 0.18); paintUV(u + 0.04, v - 0.02, 0.12);
    };
  }

  /* Pièce en surbrillance (radiographie) */
  const PART_VIEW = {
    screen: { x: 0.08, y: -0.38 }, battery: { x: 0.12, y: 0.55 }, board: { x: 0.18, y: 0.7 },
    camera: { x: 0.15, y: Math.PI - 0.55 }, back: { x: 0.08, y: Math.PI - 0.35 },
    port: { x: -1.0, y: 0.3 }, speaker: { x: -0.95, y: -0.35 },
  };
  function setPart(name) {
    state.part = name || null;
    targetRot = name && PART_VIEW[name] ? PART_VIEW[name] : { x: 0.12, y: -0.32 };
    drag.off = 0;
  }

  /* Boucle */
  let visible = true, running = true, raf = 0, last = performance.now(), elapsed = 0;
  const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; }, { threshold: 0 });
  io.observe(canvas);
  document.addEventListener('visibilitychange', () => { running = !document.hidden; });

  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!visible || !running) { last = now; return; }
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!calm) elapsed += dt;
    if (ghost) ghost();

    tilt.x += (tilt.tx - tilt.x) * 0.06; tilt.y += (tilt.ty - tilt.y) * 0.06;
    const float = calm ? 0 : Math.sin(elapsed * 0.9) * 0.035;

    if (mode === 'xray') {
      const idle = state.part ? 0 : Math.sin(elapsed * 0.35) * 0.5;
      const tx = targetRot.x + tilt.y * 0.12, ty = targetRot.y + idle + drag.off + tilt.x * 0.15;
      phone.rotation.x += (tx - phone.rotation.x) * 0.06;
      phone.rotation.y += (ty - phone.rotation.y) * 0.06;
      Object.entries(parts).forEach(([name, p]) => {
        const on = state.part === name ? 1 : 0;
        p.k += (on - p.k) * 0.1;
        const pulse = 0.75 + Math.sin(elapsed * 4) * 0.25;
        p.mats.forEach(m => { m.color.lerpColors(PART_BASE, CYAN, p.k * (0.55 + 0.35 * pulse)); m.opacity = 0.85 + p.k * 0.15; });
        if (p.edgeMat) p.edgeMat.opacity = (name === 'back' ? 0 : 0.3) + p.k * 0.7;
        if (p.plane) p.plane.opacity = p.k * 0.12 * pulse;
      });
      uniforms.uHi.value = parts.screen.k;
      if (scan) { scan.position.y = Math.sin(elapsed * 0.7) * (PH / 2 - 0.05); scan.visible = !calm; }
    } else {
      phone.rotation.x = state.rotX + tilt.y * 0.1 + float * 0.5;
      phone.rotation.y = state.rotY + tilt.x * 0.22;
      phone.rotation.z = 0.04 * Math.sin(elapsed * 0.5);
    }
    root.position.set(state.x, state.y + (1 - state.rise) * -2.6 + float, 0);
    root.scale.setScalar(state.scale * (0.92 + state.rise * 0.08));

    rake.position.x = Math.sin(elapsed * 0.6) * 1.6;
    rake.position.y = Math.cos(elapsed * 0.43) * 1.2;
    rim.intensity = 3.2 * state.rise;

    uniforms.uTime.value = elapsed;
    uniforms.uCrackGrow.value = state.crack;
    uniforms.uPower.value = state.power;
    uniforms.uHealWave.value = state.wave;
    uniforms.uGlare.value = phone.rotation.y * 0.6 + 0.2;
    renderer.render(scene, camera);
  }
  raf = requestAnimationFrame(frame);

  return {
    state, paintUV, ghostStroke, setPart,
    get healed() { return healed; },
    get overScreen() { return overScreen; },
    resize,
    dispose() { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); window.removeEventListener('pointermove', onMove); renderer.dispose(); },
  };
}
