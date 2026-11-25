import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { buildTruck, FRONT, WHEEL_R, WHEEL_X } from './buildTruck';
import { buildWorld, LANE_Z } from './buildWorld';
import { NO_REFLECT_LAYER } from './optimize';
import { softSprite } from './textures';

export type Phase = 'Inbound' | 'Braking' | 'Holding' | 'Parked' | 'Departing' | 'Reversing';

export interface FrameInfo {
  p: number;
  kmh: number;
  phase: Phase;
  odo: number;
  hud: { x: number; y: number; on: boolean };
  sensors: { x: number; y: number; on: boolean }[];
}

export interface Engine {
  setProgress: (p: number) => void;
  /** Pixels from the top that hero copy occupies; the parked truck is framed below it. */
  setClearance: (px: number) => void;
  setActive: (on: boolean) => void;
  depart: () => void;
  dispose: () => void;
}

const A_NOM = 2.3;
const PARK_FRONT = 9.6;

interface Spring {
  th: number;
  w: number;
}
function stepSpring(s: Spring, target: number, hz: number, zeta: number, dt: number) {
  const w = 2 * Math.PI * hz;
  s.w += (-w * w * (s.th - target) - 2 * zeta * w * s.w) * dt;
  s.th += s.w * dt;
}
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

interface Key {
  pos: THREE.Vector3;
  target: THREE.Vector3;
  up: THREE.Vector3;
  fov: number;
  shift: number;
  /** horizontal lens shift (fraction of width); positive moves the scene left */
  shiftX?: number;
}

export function createEngine(
  canvas: HTMLCanvasElement,
  opts: { reduced: boolean; quality: 'high' | 'low'; onFrame: (f: FrameInfo) => void },
): Engine {
  const { reduced, quality } = opts;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = quality === 'high';
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  let dpr = Math.min(window.devicePixelRatio || 1, quality === 'high' ? 1.75 : 1.25);
  renderer.setPixelRatio(dpr);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 900);
  camera.layers.enable(NO_REFLECT_LAYER); // the road reflection's own camera leaves this layer out
  const world = buildWorld(scene, renderer, quality);
  const rig = buildTruck();
  rig.root.position.z = LANE_Z;
  scene.add(rig.root);

  // ── shadows ──
  // The truck is the only thing that moves, so each lamp's shadow map is redrawn
  // only while the truck is inside that lamp's pool of light (plus one frame after
  // it leaves, to clear its shadow). Everything else is drawn once.
  const shadowLights: THREE.SpotLight[] = [];
  scene.traverse((o) => {
    const l = o as THREE.SpotLight;
    if (l.isSpotLight && l.castShadow) {
      l.shadow.autoUpdate = false;
      l.shadow.needsUpdate = true;
      shadowLights.push(l);
    }
  });
  const shadowHad = shadowLights.map(() => true);
  let shadowDirty = true;
  function updateShadows() {
    if (!shadowDirty) return;
    shadowDirty = false;
    const x1 = st.x + 1; // truck spans [st.x - FRONT, st.x]
    const x0 = st.x - FRONT - 1;
    for (let i = 0; i < shadowLights.length; i++) {
      const l = shadowLights[i];
      const reach = l.position.y * Math.tan(l.angle) + 3; // radius of the lit pool on the road
      const near = x1 > l.position.x - reach && x0 < l.position.x + reach;
      if (near || shadowHad[i]) l.shadow.needsUpdate = true;
      shadowHad[i] = near;
    }
  }

  // ── post ──
  const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: quality === 'high' ? 4 : 0 });
  const composer = new EffectComposer(renderer, rt);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.62, 0.55, 0.92);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  // ── particles (exhaust, tyre spray, air brakes) ──
  const MAX_P = 900;
  const pPos = new Float32Array(MAX_P * 3);
  const pSize = new Float32Array(MAX_P);
  const pAlpha = new Float32Array(MAX_P);
  const pCol = new Float32Array(MAX_P * 3);
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute('size', new THREE.BufferAttribute(pSize, 1));
  pGeo.setAttribute('alpha', new THREE.BufferAttribute(pAlpha, 1));
  pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
  const pAttrs = ['position', 'size', 'alpha', 'color'].map((k) => {
    const a = pGeo.attributes[k] as THREE.BufferAttribute;
    a.setUsage(THREE.DynamicDrawUsage);
    return a;
  });
  const spriteT = softSprite();
  const pMat = new THREE.ShaderMaterial({
    uniforms: { map: { value: spriteT }, scale: { value: 400 } },
    vertexShader: `
      attribute float size; attribute float alpha; attribute vec3 color;
      varying float vA; varying vec3 vC;
      uniform float scale;
      void main() {
        vA = alpha; vC = color;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * scale / -mv.z;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform sampler2D map; varying float vA; varying vec3 vC;
      void main() {
        vec4 t = texture2D(map, gl_PointCoord);
        gl_FragColor = vec4(vC, t.a * vA);
      }`,
    transparent: true,
    depthWrite: false,
  });
  const points = new THREE.Points(pGeo, pMat);
  points.frustumCulled = false;
  scene.add(points);

  interface P {
    p: THREE.Vector3;
    v: THREE.Vector3;
    size: number;
    grow: number;
    life: number;
    max: number;
    a: number;
    drag: number;
    lift: number;
    c: THREE.Color;
  }
  const C_SMOKE = new THREE.Color(0.55, 0.58, 0.63);
  const C_SOOT = new THREE.Color(0.12, 0.12, 0.13);
  const C_SPRAY = new THREE.Color(0.62, 0.68, 0.76);
  const C_AIR = new THREE.Color(0.8, 0.84, 0.9);
  // Fixed pool: particles are recycled, never allocated or spliced per frame,
  // so the garbage collector has nothing to pause for.
  const pool: P[] = Array.from({ length: MAX_P }, () => ({
    p: new THREE.Vector3(),
    v: new THREE.Vector3(),
    size: 0,
    grow: 0,
    life: 0,
    max: 1,
    a: 0,
    drag: 0,
    lift: 0,
    c: C_SMOKE,
  }));
  let live = 0;
  const emit = (
    px: number, py: number, pz: number,
    vx: number, vy: number, vz: number,
    size: number, grow: number, max: number, a: number, drag: number, lift: number, c: THREE.Color,
  ) => {
    if (live >= MAX_P) return;
    const q = pool[live++];
    q.p.set(px, py, pz);
    q.v.set(vx, vy, vz);
    q.size = size;
    q.grow = grow;
    q.life = 0;
    q.max = max;
    q.a = a;
    q.drag = drag;
    q.lift = lift;
    q.c = c;
  };
  const SPRAY_X = [...WHEEL_X.trailer, WHEEL_X.drive, WHEEL_X.steer];
  const AIR_X = [...WHEEL_X.trailer, WHEEL_X.drive];

  // ── state ──
  const st = {
    phase: (reduced ? 'parked' : 'wait') as 'wait' | 'cruise' | 'brake' | 'stopped' | 'parked',
    phaseT: 0,
    t: 0,
    arrX: reduced ? PARK_FRONT : PARK_FRONT - 44,
    arrV: 0,
    arrA: 0,
    exit: 0,
    exitV: 0,
    click: false,
    clickX: 0,
    clickV: 0,
    x: 0,
    prevX: 0,
    v: 0,
    a: 0,
    wheel: 0,
    dist: 0,
    odo: 214806.4,
    brake: reduced ? 0 : 1,
    cab: { th: 0, w: 0 } as Spring,
    ch: { th: 0, w: 0 } as Spring,
    tr: { th: 0, w: 0 } as Spring,
    pTarget: 0,
    p: 0,
    acc: [0, 0],
    active: true,
  };
  st.x = st.prevX = st.arrX;

  // ── camera keyframes ──
  let W = 1;
  let H = 1;
  let keys: Key[] = [];
  let clearPx = 0;

  function buildKeys() {
    const aspect = W / H;
    const portrait = aspect < 0.9;
    const tan = (fov: number) => Math.tan((fov * Math.PI) / 360);
    const fitSide = (halfW: number, fov: number) => Math.max(halfW / (tan(fov) * aspect), 3.6 / tan(fov));
    const cx = PARK_FRONT - FRONT / 2; // truck centre x when parked
    const sideX = aspect > 1.2 ? cx - 2.2 : cx + 0.4;
    // Side shot: push the truck down (lens shift) and, if needed, back (distance)
    // until its roof clears the hero copy while the road stays on screen.
    let d0 = Math.min(80, Math.max(20, fitSide(aspect > 1.2 ? 15 : 9.8, 28)));
    let shift0 = portrait ? 0.27 : 0.26;
    {
      const camY = 1.7;
      const t = tan(28);
      for (let k = 0; k < 40; k++) {
        const roof = (4.05 - camY) / d0 / t; // ndc above centre
        const ground = camY / d0 / t; // ndc below centre
        const need = (clearPx + 14) / H - 0.5 + roof / 2;
        const s = Math.max(portrait ? 0.2 : 0.12, need);
        if (0.5 + s + ground / 2 <= 0.94 || clearPx <= 0) {
          shift0 = clearPx > 0 ? s : shift0;
          break;
        }
        d0 *= 1.06;
      }
    }
    const k1 = Math.max(1, 1.3 / aspect);
    // overhead: frame the truck in the left part of the screen, leaving room for the sensor read-outs
    const overH = portrait ? 11.5 / tan(36) : Math.min(70, Math.max(26, 17.5 / (tan(36) * aspect)));
    keys = [
      {
        pos: new THREE.Vector3(sideX, 1.7, LANE_Z + d0),
        target: new THREE.Vector3(sideX, 1.7, LANE_Z),
        up: new THREE.Vector3(0, 1, 0),
        fov: 28,
        shift: shift0,
      },
      {
        pos: new THREE.Vector3(PARK_FRONT + 7.5 * k1, 1.35, LANE_Z + 8.2 * k1),
        target: new THREE.Vector3(PARK_FRONT - (aspect > 1.2 ? 3.2 : 1.2), 2.0, LANE_Z),
        up: new THREE.Vector3(0, 1, 0),
        fov: 34,
        shift: portrait ? 0.18 : 0,
      },
      {
        pos: new THREE.Vector3(cx, overH, LANE_Z + overH * 0.22),
        target: new THREE.Vector3(cx, 0, LANE_Z),
        up: portrait ? new THREE.Vector3(-1, 0, 0) : new THREE.Vector3(0, 1, 0),
        fov: 36,
        shift: portrait ? 0 : -0.06,
        shiftX: portrait ? 0.2 : 0.07,
      },
      {
        pos: new THREE.Vector3(sideX + 4, 2.4, LANE_Z + d0 * 1.02),
        target: new THREE.Vector3(sideX + 5.5, 2.2, LANE_Z),
        up: new THREE.Vector3(0, 1, 0),
        fov: 28,
        shift: portrait ? 0.2 : 0.06,
      },
    ];
  }

  const tmpTarget = new THREE.Vector3();
  const tmpUp = new THREE.Vector3();
  const tmpV = new THREE.Vector3();

  function placeCamera() {
    const s = Math.min(2.9999, Math.max(0, st.p * 3));
    const i = Math.floor(s);
    const f = smooth(0.14, 0.86, s - i);
    const a = keys[i];
    const b = keys[i + 1];
    camera.position.lerpVectors(a.pos, b.pos, f);
    // arc each move away from the truck so the camera never clips through it
    const arc = Math.sin(Math.PI * f);
    if (i === 0) camera.position.add(tmpV.set(2, 0.6, 5).multiplyScalar(arc));
    if (i === 1) camera.position.add(tmpV.set(0, 9, 9).multiplyScalar(arc));
    if (i === 2) camera.position.add(tmpV.set(0, 2, 6).multiplyScalar(arc));
    tmpTarget.lerpVectors(a.target, b.target, f);
    tmpUp.lerpVectors(a.up, b.up, f).normalize();
    camera.fov = lerp(a.fov, b.fov, f);
    const shift = lerp(a.shift, b.shift, f);
    const shiftX = lerp(a.shiftX ?? 0, b.shiftX ?? 0, f);
    // hand-held breathing
    if (!reduced) {
      camera.position.x += Math.sin(st.t * 0.37) * 0.06;
      camera.position.y += Math.sin(st.t * 0.53 + 1) * 0.04;
    }
    camera.up.copy(tmpUp);
    camera.lookAt(tmpTarget);
    camera.setViewOffset(W, H, shiftX * W, -shift * H, W, H);
    camera.updateProjectionMatrix();
  }

  function resize() {
    const r = canvas.getBoundingClientRect();
    W = Math.max(1, r.width);
    H = Math.max(1, r.height);
    renderer.setSize(W, H, false);
    composer.setSize(W, H);
    bloom.resolution.set(W / 2, H / 2);
    camera.aspect = W / H;
    world.resize(W * dpr, H * dpr);
    pMat.uniforms.scale.value = (H * dpr) / (2 * Math.tan((28 * Math.PI) / 360));
    buildKeys();
  }

  // ── simulation ──
  const worldExhaust = new THREE.Vector3();
  function step(dt: number) {
    st.t += dt;
    st.phaseT += dt;
    st.p += (st.pTarget - st.p) * (1 - Math.exp(-dt * 5));

    // arrival
    if (st.phase === 'wait') {
      if (st.phaseT > 0.35) {
        st.arrV = Math.sqrt(2 * A_NOM * (PARK_FRONT - st.arrX) * 0.8);
        st.phase = 'cruise';
        st.phaseT = 0;
      }
    } else if (st.phase === 'cruise' || st.phase === 'brake') {
      const rem = PARK_FRONT - st.arrX;
      let cmd = 0;
      if (st.phase === 'cruise' && (st.arrV * st.arrV) / (2 * Math.max(rem, 0.01)) >= A_NOM * 0.96) {
        st.phase = 'brake';
        st.phaseT = 0;
      }
      if (st.phase === 'brake') {
        if (rem <= 0.004 || st.arrV <= 0.04) {
          st.arrV = 0;
          st.arrA = 0;
          st.arrX = Math.min(st.arrX, PARK_FRONT);
          st.phase = 'stopped';
          st.phaseT = 0;
        } else cmd = -(st.arrV * st.arrV) / (2 * rem);
      }
      if (st.phase !== 'stopped') {
        st.arrA += Math.max(-7 * dt, Math.min(7 * dt, cmd - st.arrA));
        st.arrV = Math.max(0, st.arrV + st.arrA * dt);
        st.arrX += st.arrV * dt;
      }
    } else if (st.phase === 'stopped' && st.phaseT > 1.1) {
      st.phase = 'parked';
      st.phaseT = 0;
      if (!reduced) airBrake();
    }

    // scroll-driven drive-off, with real acceleration limits
    const exitTarget = 40 * Math.pow(smooth(0.83, 1, st.p), 1.3);
    const accCmd = Math.max(-4.5, Math.min(3.6, 3.2 * (exitTarget - st.exit) - 3.4 * st.exitV));
    st.exitV = Math.max(-6, Math.min(24, st.exitV + accCmd * dt));
    st.exit += st.exitV * dt;
    if (Math.abs(st.exit - exitTarget) < 0.002 && Math.abs(st.exitV) < 0.01) {
      st.exit = exitTarget;
      st.exitV = 0;
    }
    if (st.click) {
      st.clickV += 3.4 * dt;
      st.clickX += st.clickV * dt;
    }

    st.prevX = st.x;
    st.x = st.arrX + st.exit + st.clickX;
    const dx = st.x - st.prevX;
    const v = dx / Math.max(dt, 1e-4);
    const vPrev = st.v;
    st.v += (v - st.v) * Math.min(1, dt * 20);
    const a = (st.v - vPrev) / Math.max(dt, 1e-4);
    st.a += (a - st.a) * Math.min(1, dt * 12);
    st.wheel -= dx / WHEEL_R;
    if (Math.abs(dx) > 1e-5 || Math.abs(st.cab.w) > 0.02) shadowDirty = true;
    st.dist += Math.abs(dx);
    st.odo += Math.abs(dx) / 1000;

    const holding = st.phase === 'brake' || st.phase === 'stopped';
    const braking = holding || (st.a < -0.5 && st.v > 0.3);
    st.brake += ((braking ? 1 : 0) - st.brake) * Math.min(1, dt * 16);

    for (let k = 0; k < 2; k++) {
      const h = dt / 2;
      stepSpring(st.cab, -st.a * 0.55, 1.25, 0.2, h);
      stepSpring(st.ch, -st.a * 0.14, 1.7, 0.42, h);
      stepSpring(st.tr, -st.a * 0.06, 1.15, 0.35, h);
    }

    // particles
    const moving = Math.abs(st.v);
    rig.root.updateMatrixWorld();
    worldExhaust.copy(rig.exhaust).applyMatrix4(rig.root.matrixWorld);
    if (!reduced) {
      const pulling = st.a > 0.6 && st.v > 0.1;
      const rate = pulling ? 70 : st.phase === 'cruise' ? 12 : 7;
      st.acc[0] += rate * dt;
      while (st.acc[0] >= 1) {
        st.acc[0] -= 1;
        emit(
          worldExhaust.x, worldExhaust.y, worldExhaust.z,
          -0.4 - Math.random() * 0.5, -0.8 - Math.random() * 0.4, 0.3 + Math.random() * 0.4,
          0.12, pulling ? 1.6 : 1.0, pulling ? 2.2 : 2.8, pulling ? 0.42 : 0.14, 2.2, 1.3, pulling ? C_SOOT : C_SMOKE,
        );
      }
      if (moving > 1.2) {
        st.acc[1] += moving * 6 * dt;
        while (st.acc[1] >= 1) {
          st.acc[1] -= 1;
          const wx = SPRAY_X[(Math.random() * SPRAY_X.length) | 0];
          const side = Math.random() < 0.7 ? 1 : -1;
          const dir = Math.sign(st.v) || 1;
          emit(
            rig.root.position.x + wx - dir * 0.5, 0.08, LANE_Z + side * 1.1,
            -dir * moving * (0.08 + Math.random() * 0.15), 0.6 + Math.random() * 1.4, side * (0.2 + Math.random() * 0.5),
            0.1, 1.4, 0.5 + Math.random() * 0.5, 0.16, 2.5, -4, C_SPRAY,
          );
        }
      }
    }
    for (let i = live - 1; i >= 0; i--) {
      const q = pool[i];
      q.life += dt;
      if (q.life >= q.max) {
        // swap the dead particle with the last live one
        pool[i] = pool[live - 1];
        pool[live - 1] = q;
        live--;
        continue;
      }
      const d = Math.exp(-q.drag * dt);
      q.v.multiplyScalar(d);
      q.v.y += q.lift * dt;
      q.v.x += -0.6 * dt;
      q.p.addScaledVector(q.v, dt);
      if (q.p.y < 0.02) {
        q.p.y = 0.02;
        q.v.y = Math.abs(q.v.y) * 0.2;
      }
      q.size += q.grow * dt * (1 - q.life / q.max);
    }
  }

  function airBrake() {
    for (const x of AIR_X) {
      for (let i = 0; i < 12; i++) {
        const ang = Math.random() * Math.PI * 2;
        const sp = 1.5 + Math.random() * 3;
        emit(
          rig.root.position.x + x, 0.45, LANE_Z + 0.9,
          Math.cos(ang) * sp, Math.abs(Math.sin(ang)) * sp * 0.4, 0.8 + Math.random() * 1.2,
          0.2, 2.6, 0.9 + Math.random() * 0.5, 0.18, 4, 0.4, C_AIR,
        );
      }
    }
  }

  // ── apply state to scene ──
  const anchor = new THREE.Vector3();
  const project = (local: THREE.Vector3, out: { x: number; y: number; on: boolean }) => {
    anchor.copy(local).applyMatrix4(rig.root.matrixWorld).project(camera);
    out.x = ((anchor.x + 1) / 2) * W;
    out.y = ((1 - anchor.y) / 2) * H;
    out.on = anchor.z < 1 && anchor.z > -1;
  };
  // One reused frame record: overlays get fresh positions every frame with no allocations.
  const frame: FrameInfo = {
    p: 0,
    kmh: 0,
    phase: 'Parked',
    odo: 0,
    hud: { x: 0, y: 0, on: false },
    sensors: rig.sensors.map(() => ({ x: 0, y: 0, on: false })),
  };

  function apply() {
    rig.root.position.x = st.x - FRONT;
    rig.setWheelAngle(st.wheel);
    const omega = Math.abs(st.v) / WHEEL_R;
    const blur = Math.min(0.92, Math.max(0, (omega - 4) / 18));
    (rig.blurDiscs[0].material as THREE.MeshStandardMaterial).opacity = blur;
    (rig.sharpDiscs[0].material as THREE.MeshStandardMaterial).opacity = 1 - blur * 0.95;

    const road = Math.min(Math.abs(st.v) / 10, 1);
    const d = st.dist;
    const bump = road * (Math.sin(d * 2.3) * 0.5 + Math.sin(d * 5.9 + 1.3) * 0.3 + Math.sin(d * 13.1) * 0.15);
    const idle = reduced ? 0 : st.phase === 'stopped' || st.phase === 'parked' ? 1 : 0.4;
    const vib = idle * (Math.sin(st.t * 2 * Math.PI * 12.5) * 0.6 + Math.sin(st.t * 2 * Math.PI * 7.1) * 0.35);
    const deg = Math.PI / 180;
    rig.chassisPivot.rotation.z = -st.ch.th * deg;
    rig.chassisPivot.position.y = WHEEL_R + bump * 0.004;
    rig.trailerPivot.rotation.z = -st.tr.th * deg;
    rig.trailerPivot.position.y = WHEEL_R + bump * 0.003;
    rig.cabPivot.rotation.z = -st.cab.th * deg;
    rig.cabPivot.position.y = 1.25 + bump * 0.01 + vib * 0.0018;

    rig.brakeMat.emissiveIntensity = 1.6 + st.brake * 9;
    rig.reverseMat.emissiveIntensity = st.v < -0.2 ? 6 : 0;

    const n = live;
    if (n === 0 && lastLive === 0) return;
    lastLive = n;
    for (let i = 0; i < n; i++) {
      const q = pool[i];
      const k = q.life / q.max;
      pPos[i * 3] = q.p.x;
      pPos[i * 3 + 1] = q.p.y;
      pPos[i * 3 + 2] = q.p.z;
      pSize[i] = q.size;
      pAlpha[i] = q.a * (k < 0.12 ? k / 0.12 : 1 - (k - 0.12) / 0.88);
      pCol[i * 3] = q.c.r;
      pCol[i * 3 + 1] = q.c.g;
      pCol[i * 3 + 2] = q.c.b;
    }
    pGeo.setDrawRange(0, n);
    // upload only the live slice, not all MAX_P particles
    for (const attr of pAttrs) {
      attr.clearUpdateRanges();
      attr.addUpdateRange(0, Math.max(1, n) * attr.itemSize);
      attr.needsUpdate = true;
    }
  }
  let lastLive = -1;

  // Runs every frame so the DOM overlays stay locked to the 3D scene.
  function report() {
    const kmh = Math.abs(st.v) * 3.6;
    let phase: Phase = 'Parked';
    if (st.phase === 'wait' || st.phase === 'cruise') phase = 'Inbound';
    else if (st.phase === 'brake') phase = 'Braking';
    else if (st.phase === 'stopped') phase = 'Holding';
    if (st.v > 0.3 && (st.exit > 0.05 || st.click)) phase = 'Departing';
    if (st.v < -0.3) phase = 'Reversing';
    frame.p = st.p;
    frame.kmh = kmh;
    frame.phase = phase;
    frame.odo = st.odo;
    project(rig.hudAnchor, frame.hud);
    for (let i = 0; i < rig.sensors.length; i++) project(rig.sensors[i].pos, frame.sensors[i]);
    opts.onFrame(frame);
  }

  let raf = 0;
  let disposed = false;
  let last = performance.now();

  // ── adaptive resolution ──
  // Sustained slow frames step the render resolution down; sustained fast frames
  // step it back up (never above the starting cap). MSAA goes last.
  const dprMax = dpr;
  const DPR_MIN = Math.min(dprMax, 0.6);
  const ad = { n: 0, sum: 0, bad: 0, good: 0, best: 1000 };
  function adapt(ms: number) {
    if (ms > 120) return; // tab switch or one-off stall, not load
    ad.best = Math.min(ad.best, ms);
    ad.n++;
    ad.sum += ms;
    if (ad.n < 45) return;
    const avg = ad.sum / ad.n;
    ad.n = ad.sum = 0;
    const slow = avg > 20; // under ~50 fps
    const fast = avg < Math.min(17.5, ad.best * 1.2);
    ad.bad = slow ? ad.bad + 1 : 0;
    ad.good = fast ? ad.good + 1 : 0;
    if (ad.bad >= 2) {
      ad.bad = 0;
      if (dpr > DPR_MIN + 0.01) setDpr(Math.max(DPR_MIN, dpr * 0.8));
      else if (composer.renderTarget1.samples > 0) setSamples(0);
    } else if (ad.good >= 8 && dpr < dprMax - 0.01) {
      ad.good = 0;
      setDpr(Math.min(dprMax, dpr / 0.9));
    }
  }
  function setDpr(d: number) {
    dpr = d;
    renderer.setPixelRatio(d);
    resize();
  }
  function setSamples(s: number) {
    for (const t of [composer.renderTarget1, composer.renderTarget2]) {
      t.samples = s;
      t.dispose();
    }
  }

  // ── warm-up ──
  // Compile every shader off the main thread (KHR_parallel_shader_compile) and
  // upload textures a few per frame, so the page never freezes and the truck's
  // arrival doesn't start until the scene can actually render smoothly.
  let ready = false;
  const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
  (async () => {
    resize(); // builds the camera keys the warm-up frame needs
    placeCamera();
    try {
      // Compile against the composer's target: shader variants depend on whether the
      // output is the linear HDR buffer or the screen, and only the former is used.
      const prev = renderer.getRenderTarget();
      renderer.setRenderTarget(composer.readBuffer);
      const jobs = [renderer.compileAsync(scene, camera)];
      // The bloom pass's own shaders (threshold, five blur kernels, composite)
      // would otherwise compile synchronously on the first frame.
      const post = new THREE.Scene();
      const quad = new THREE.PlaneGeometry(2, 2);
      for (const v of Object.values(bloom)) {
        for (const m of Array.isArray(v) ? v : [v]) {
          if (m && (m as THREE.Material).isMaterial) post.add(new THREE.Mesh(quad, m as THREE.Material));
        }
      }
      jobs.push(renderer.compileAsync(post, camera));
      renderer.setRenderTarget(prev);
      await Promise.all(jobs);
      quad.dispose();
    } catch {
      /* fall back to compiling on first render */
    }
    const textures = new Set<THREE.Texture>();
    scene.traverse((o) => {
      const mats = (o as THREE.Mesh).material;
      for (const m of Array.isArray(mats) ? mats : mats ? [mats] : []) {
        for (const v of Object.values(m)) if (v && (v as THREE.Texture).isTexture) textures.add(v as THREE.Texture);
      }
    });
    // Upload (and mipmap) on a time budget so no single frame stalls on a big texture.
    let t0 = performance.now();
    for (const t of textures) {
      if (disposed) return;
      renderer.initTexture(t);
      if (performance.now() - t0 > 8) {
        await nextFrame();
        t0 = performance.now();
      }
    }
    if (disposed) return;
    composer.render(0); // draws the shadow maps and compiles the last few programs (shadow depth, output)
    await nextFrame();
    ready = true;
    last = performance.now();
  })();

  // ── loop ──
  const loop = (now: number) => {
    raf = requestAnimationFrame(loop);
    const ms = now - last;
    const dt = Math.min(ms / 1000, 0.5);
    last = now;
    if (!st.active || !ready) return;
    adapt(ms);
    // fixed sub-steps keep the physics real-time even when the frame rate drops
    for (let left = dt; left > 1e-6; left -= 1 / 60) step(Math.min(left, 1 / 60));
    apply();
    world.update(st.t, dt, tmpV.set(camera.position.x, 0, 0));
    placeCamera();
    updateShadows();
    composer.render(dt);
    report();
  };

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();
  raf = requestAnimationFrame(loop);

  return {
    setClearance(px) {
      if (Math.abs(px - clearPx) < 2) return;
      clearPx = px;
      buildKeys();
    },
    setProgress(p) {
      st.pTarget = Math.min(1, Math.max(0, p));
    },
    setActive(on) {
      st.active = on;
      last = performance.now();
    },
    depart() {
      if (st.click) return;
      if (st.phase !== 'parked' && st.phase !== 'stopped') {
        st.arrX = PARK_FRONT;
        st.arrV = 0;
        st.phase = 'parked';
      }
      st.click = true;
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
      world.dispose();
      rig.dispose();
      pGeo.dispose();
      pMat.dispose();
      spriteT.dispose();
      rt.dispose();
      composer.dispose();
      renderer.dispose();
    },
  };
}
