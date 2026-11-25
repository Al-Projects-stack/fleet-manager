import * as THREE from 'three';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { freeze, mergeStatic, skipFlatInReflection } from './optimize';
import {
  doorTexture,
  neonTexture,
  roadTextures,
  sidewalkTexture,
  skylineTexture,
  skyTexture,
  softSprite,
  trailerRearTexture,
} from './textures';

export const LANE_Z = 1.85;
const ROAD = { z0: -7.6, z1: 4.4, len: 280 };
const LAMP_X = [-44, -22, 0, 22, 44];

export interface World {
  reflector: Reflector;
  rain: THREE.LineSegments;
  update: (t: number, dt: number, focus: THREE.Vector3) => void;
  resize: (w: number, h: number) => void;
  dispose: () => void;
}

export function buildWorld(scene: THREE.Scene, renderer: THREE.WebGLRenderer, quality: 'high' | 'low'): World {
  const disposables: { dispose: () => void }[] = [];
  const keep = <T extends { dispose: () => void }>(o: T) => {
    disposables.push(o);
    return o;
  };
  const add = (o: THREE.Object3D) => {
    scene.add(o);
    return o;
  };
  const shadows = quality === 'high';

  scene.fog = new THREE.FogExp2(0x070d18, 0.0105);
  scene.background = new THREE.Color(0x03060c);

  // ── environment map: dark sky with a few bright lamp panels and a cyan strip ──
  {
    const env = new THREE.Scene();
    const skyT = keep(skyTexture());
    env.add(new THREE.Mesh(keep(new THREE.SphereGeometry(50, 32, 16)), keep(new THREE.MeshBasicMaterial({ map: skyT, side: THREE.BackSide }))));
    const lampMat = keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(6, 5.2, 4) }));
    for (let i = 0; i < 6; i++) {
      const p = new THREE.Mesh(keep(new THREE.PlaneGeometry(6, 1.5)), lampMat);
      const a = (i / 6) * Math.PI * 2;
      p.position.set(Math.cos(a) * 30, 22, Math.sin(a) * 30);
      p.lookAt(0, 0, 0);
      env.add(p);
    }
    const cyan = new THREE.Mesh(keep(new THREE.PlaneGeometry(40, 1.2)), keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(0, 2.5, 3) })));
    cyan.position.set(0, 6, -40);
    env.add(cyan);
    const ground = new THREE.Mesh(keep(new THREE.PlaneGeometry(200, 200)), keep(new THREE.MeshBasicMaterial({ color: 0x06080c })));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -2;
    env.add(ground);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const rt = pmrem.fromScene(env, 0.02);
    keep(rt);
    pmrem.dispose();
    scene.environment = rt.texture;
    scene.environmentIntensity = 0.6;
  }

  // ── sky + skyline ──
  const sky = new THREE.Mesh(
    keep(new THREE.SphereGeometry(420, 32, 16)),
    keep(new THREE.MeshBasicMaterial({ map: keep(skyTexture()), side: THREE.BackSide, fog: false, depthWrite: false })),
  );
  add(sky);
  const skyline = keep(skylineTexture());
  for (const [z, x, s, tint] of [
    [-230, 0, 1.25, 0x7d8aa0],
    [-170, 140, 0.9, 0x5e6a7e],
  ] as const) {
    const m = new THREE.Mesh(
      keep(new THREE.PlaneGeometry(700 * s, 110 * s)),
      keep(new THREE.MeshBasicMaterial({ map: skyline, transparent: true, fog: false, color: tint, depthWrite: false })),
    );
    m.position.set(x, 50 * s - 6, z);
    add(m);
  }
  // horizon glow band
  const glowC = document.createElement('canvas');
  glowC.width = 4;
  glowC.height = 128;
  {
    const g = glowC.getContext('2d')!;
    const grd = g.createLinearGradient(0, 0, 0, 128);
    grd.addColorStop(0, 'rgba(58,166,201,0)');
    grd.addColorStop(0.75, 'rgba(58,166,201,0.22)');
    grd.addColorStop(1, 'rgba(58,166,201,0)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 4, 128);
  }
  const glowT = keep(new THREE.CanvasTexture(glowC));
  const glow = new THREE.Mesh(
    keep(new THREE.PlaneGeometry(900, 60)),
    keep(new THREE.MeshBasicMaterial({ map: glowT, transparent: true, fog: false, depthWrite: false, blending: THREE.AdditiveBlending })),
  );
  glow.position.set(0, 18, -200);
  add(glow);

  // ── ground ──
  const groundMat = keep(new THREE.MeshStandardMaterial({ color: 0x07090c, roughness: 1 }));
  const groundPlane = new THREE.Mesh(keep(new THREE.PlaneGeometry(900, 900)), groundMat);
  groundPlane.rotation.x = -Math.PI / 2;
  groundPlane.position.y = -0.02;
  groundPlane.receiveShadow = true;
  add(groundPlane);

  // ── wet road: mirror underneath, semi-transparent asphalt on top ──
  const roadW = ROAD.z1 - ROAD.z0;
  const roadZ = (ROAD.z0 + ROAD.z1) / 2;
  const reflector = new Reflector(keep(new THREE.PlaneGeometry(ROAD.len, roadW)), {
    clipBias: 0.003,
    textureWidth: 512,
    textureHeight: 512,
    color: 0x9aa1ad,
  });
  reflector.rotation.x = -Math.PI / 2;
  reflector.position.set(0, 0, roadZ);
  add(reflector);
  const road = roadTextures();
  keep(road.map);
  keep(road.alpha);
  for (const t of [road.map, road.alpha]) {
    t.wrapS = THREE.RepeatWrapping;
    t.repeat.set(ROAD.len / 20, 1);
  }
  const asphalt = new THREE.Mesh(
    keep(new THREE.PlaneGeometry(ROAD.len, roadW)),
    keep(
      new THREE.MeshStandardMaterial({
        map: road.map,
        alphaMap: road.alpha,
        transparent: true,
        roughness: 0.42,
        metalness: 0,
        envMapIntensity: 0.6,
      }),
    ),
  );
  asphalt.rotation.x = -Math.PI / 2;
  asphalt.position.set(0, 0.004, roadZ);
  asphalt.receiveShadow = true;
  add(asphalt);

  // ── kerbs and pavements ──
  const kerbMat = keep(new THREE.MeshStandardMaterial({ color: 0x4a4f57, roughness: 0.8 }));
  const swT = keep(sidewalkTexture());
  swT.wrapS = THREE.RepeatWrapping;
  swT.repeat.set(ROAD.len / 4, 1);
  const swMat = keep(new THREE.MeshStandardMaterial({ map: swT, roughness: 0.75, color: 0x9aa0a8 }));
  const strip = (z0: number, z1: number, h: number, mat: THREE.Material) => {
    const m = new THREE.Mesh(keep(new THREE.BoxGeometry(ROAD.len, h, z1 - z0)), mat);
    m.position.set(0, h / 2 - 0.02, (z0 + z1) / 2);
    m.receiveShadow = true;
    add(m);
  };
  strip(4.4, 4.62, 0.16, kerbMat);
  strip(4.62, 8.5, 0.14, swMat);
  strip(-7.82, -7.6, 0.16, kerbMat);
  strip(-11.2, -7.82, 0.14, swMat);

  // ── fence ──
  {
    const postGeo = keep(new THREE.CylinderGeometry(0.035, 0.035, 2.1, 6));
    const postMat = keep(new THREE.MeshStandardMaterial({ color: 0x22272e, metalness: 0.6, roughness: 0.5 }));
    const n = 70;
    const posts = new THREE.InstancedMesh(postGeo, postMat, n);
    const m = new THREE.Matrix4();
    for (let i = 0; i < n; i++) {
      m.makeTranslation(-70 + i * 2, 1.05, -11.1);
      posts.setMatrixAt(i, m);
    }
    add(posts);
    for (const y of [0.15, 1.05, 2.05]) {
      const rail = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.02, 0.02, 140, 6)), postMat);
      rail.rotation.z = Math.PI / 2;
      rail.position.set(0, y, -11.1);
      add(rail);
    }
    // gate opening near the depot entrance is implied by the yard lights
  }

  // ── depot yard + building ──
  {
    const yard = new THREE.Mesh(keep(new THREE.PlaneGeometry(120, 13)), keep(new THREE.MeshStandardMaterial({ color: 0x0c0f14, roughness: 0.7 })));
    yard.rotation.x = -Math.PI / 2;
    yard.position.set(0, 0.0, -17.7);
    yard.receiveShadow = true;
    add(yard);

    const wallMat = keep(new THREE.MeshStandardMaterial({ color: 0x1a2232, roughness: 0.85, metalness: 0.2 }));
    const bld = new THREE.Mesh(keep(new THREE.BoxGeometry(110, 10, 18)), wallMat);
    bld.position.set(4, 5, -33.2);
    bld.receiveShadow = true;
    add(bld);
    const fascia = new THREE.Mesh(keep(new THREE.BoxGeometry(110, 0.6, 0.4)), keep(new THREE.MeshStandardMaterial({ color: 0x2b374b, roughness: 0.6 })));
    fascia.position.set(4, 9.9, -24.1);
    add(fascia);
    // cladding ribs
    const ribGeo = keep(new THREE.BoxGeometry(0.08, 10, 0.08));
    const ribs = new THREE.InstancedMesh(ribGeo, keep(new THREE.MeshStandardMaterial({ color: 0x111824 })), 180);
    const m = new THREE.Matrix4();
    for (let i = 0; i < 180; i++) {
      m.makeTranslation(-51 + i * 0.6, 5, -24.18);
      ribs.setMatrixAt(i, m);
    }
    add(ribs);

    const litT = keep(doorTexture(true));
    const darkT = keep(doorTexture(false));
    const litMat = keep(new THREE.MeshStandardMaterial({ map: litT, emissive: 0xffffff, emissiveMap: litT, emissiveIntensity: 1.6 }));
    const darkMat = keep(new THREE.MeshStandardMaterial({ map: darkT, roughness: 0.6, metalness: 0.4 }));
    const lampMat = keep(new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff0d6, emissiveIntensity: 6 }));
    const sprite = keep(softSprite());
    const glowMat = keep(
      new THREE.SpriteMaterial({ map: sprite, color: 0xffd9a0, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    const doorGeo = keep(new THREE.PlaneGeometry(3.2, 3.6));
    for (let i = 0; i < 9; i++) {
      const x = -20 + i * 5;
      const lit = i === 4 || i === 7;
      const d = new THREE.Mesh(doorGeo, lit ? litMat : darkMat);
      d.position.set(x, 1.8 + 1.1, -24.17);
      add(d);
      // dock leveller / bumpers
      const lev = new THREE.Mesh(keep(new THREE.BoxGeometry(3.4, 1.1, 0.5)), keep(new THREE.MeshStandardMaterial({ color: 0x0a0d12 })));
      lev.position.set(x, 0.55, -23.95);
      add(lev);
      const lamp = new THREE.Mesh(keep(new THREE.BoxGeometry(0.4, 0.1, 0.25)), lampMat);
      lamp.position.set(x, 5.2, -23.95);
      add(lamp);
      const gl = new THREE.Sprite(glowMat);
      gl.scale.set(3, 3, 1);
      gl.position.set(x, 5.0, -23.7);
      add(gl);
    }
    // neon sign
    const neonT = keep(neonTexture('DEPOT 04'));
    const neonMat = keep(
      new THREE.MeshStandardMaterial({ map: neonT, emissive: 0xffffff, emissiveMap: neonT, emissiveIntensity: 3, transparent: true, depthWrite: false }),
    );
    const neon = new THREE.Mesh(keep(new THREE.PlaneGeometry(9, 1.7)), neonMat);
    neon.position.set(0, 7.6, -24.05);
    neon.name = 'neon';
    add(neon);

    // parked trailers backed onto the docks
    const tMat = keep(new THREE.MeshStandardMaterial({ color: 0x9aa3ae, roughness: 0.5, metalness: 0.2 }));
    const rearT = keep(trailerRearTexture());
    const rearMat = keep(new THREE.MeshStandardMaterial({ map: rearT, roughness: 0.5 }));
    for (const x of [-15, -5, 10]) {
      const tb = new THREE.Mesh(keep(new THREE.BoxGeometry(2.55, 2.75, 13.6)), [tMat, tMat, tMat, tMat, rearMat, tMat]);
      tb.position.set(x, 2.6, -17.2);
      tb.castShadow = true;
      tb.receiveShadow = true;
      add(tb);
      const und = new THREE.Mesh(keep(new THREE.BoxGeometry(2.2, 0.9, 12)), keep(new THREE.MeshStandardMaterial({ color: 0x050608 })));
      und.position.set(x, 0.7, -17.2);
      add(und);
    }
  }

  // ── street lamps (far side) with real spot lights, light cones and glow ──
  const coneC = document.createElement('canvas');
  coneC.width = 4;
  coneC.height = 256;
  {
    const g = coneC.getContext('2d')!;
    const grd = g.createLinearGradient(0, 0, 0, 256);
    grd.addColorStop(0, 'rgba(255,232,190,0)');
    grd.addColorStop(0.85, 'rgba(255,232,190,0.5)');
    grd.addColorStop(1, 'rgba(255,232,190,0.9)');
    g.fillStyle = grd;
    g.fillRect(0, 0, 4, 256);
  }
  const coneT = keep(new THREE.CanvasTexture(coneC));
  const coneMat = keep(
    new THREE.MeshBasicMaterial({
      map: coneT,
      color: 0xffe2b0,
      transparent: true,
      opacity: 0.04,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  const coneGeo = keep(new THREE.ConeGeometry(5.2, 9, 32, 1, true));
  const poleMat = keep(new THREE.MeshStandardMaterial({ color: 0x1d242e, metalness: 0.7, roughness: 0.4 }));
  const headMat = keep(new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffeccc, emissiveIntensity: 14 }));
  const lampSprite = keep(softSprite());
  const lampGlowMat = keep(
    new THREE.SpriteMaterial({ map: lampSprite, color: 0xffdca8, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  for (const x of LAMP_X) {
    const z = -8.7;
    const pole = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.07, 0.11, 9.2, 12)), poleMat);
    pole.position.set(x, 4.6, z);
    pole.castShadow = true;
    add(pole);
    const arm = new THREE.Mesh(keep(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 8)), poleMat);
    arm.rotation.x = Math.PI / 2 - 0.12;
    arm.position.set(x, 9.25, z + 1.15);
    add(arm);
    const head = new THREE.Mesh(keep(new THREE.BoxGeometry(0.5, 0.16, 0.9)), poleMat);
    head.position.set(x, 9.35, z + 2.4);
    add(head);
    const lens = new THREE.Mesh(keep(new THREE.BoxGeometry(0.36, 0.03, 0.7)), headMat);
    lens.position.set(x, 9.26, z + 2.4);
    add(lens);
    const g = new THREE.Sprite(lampGlowMat);
    g.scale.set(2.2, 2.2, 1);
    g.position.set(x, 9.2, z + 2.4);
    add(g);
    const cone = new THREE.Mesh(coneGeo, coneMat);
    cone.position.set(x, 9.2 - 4.5, z + 2.6);
    add(cone);

    const spot = new THREE.SpotLight(0xffe2b8, 520, 32, 0.95, 0.75, 1.6);
    spot.position.set(x, 9.2, z + 2.4);
    spot.target.position.set(x, 0, z + 5.2);
    if (shadows && (x === 0 || x === 22 || x === -22)) {
      spot.castShadow = true;
      spot.shadow.mapSize.set(1024, 1024);
      spot.shadow.bias = -0.0004;
      spot.shadow.camera.near = 1;
      spot.shadow.camera.far = 30;
    }
    add(spot);
    add(spot.target);
  }

  // ── lamps behind the camera (no visible poles) so the near side of the truck is lit ──
  for (const [x, i] of [
    [-9, 160],
    [12, 190],
  ] as const) {
    const s = new THREE.SpotLight(0xffe6c4, i, 40, 0.75, 0.9, 1.5);
    s.position.set(x, 9, 12);
    s.target.position.set(x * 0.6, 1.2, LANE_Z);
    add(s);
    add(s.target);
  }

  // ── fill lights ──
  add(new THREE.HemisphereLight(0x2a3f66, 0x05070a, 0.55));
  const moon = new THREE.DirectionalLight(0x9cb8ff, 0.5);
  moon.position.set(15, 25, 40);
  add(moon);

  // ── rain ──
  // Animated entirely in the vertex shader: the CPU never touches the drops and
  // nothing is re-uploaded per frame.
  const N = quality === 'high' ? 1500 : 700;
  const box = { x: 30, y: 16, z0: -12, z1: 11 };
  const seed = new Float32Array(N * 2 * 4); // x0, y phase, z, speed (same for both ends)
  const end = new Float32Array(N * 2); // 0 = head, 1 = tail
  for (let i = 0; i < N; i++) {
    const x0 = (Math.random() - 0.5) * 2 * box.x;
    const y0 = Math.random() * box.y;
    const z = box.z0 + Math.random() * (box.z1 - box.z0);
    const sp = 9 + Math.random() * 4;
    for (let e = 0; e < 2; e++) {
      seed.set([x0, y0, z, sp], (i * 2 + e) * 4);
      end[i * 2 + e] = e;
    }
  }
  const rainGeo = keep(new THREE.BufferGeometry());
  rainGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 2 * 3), 3));
  rainGeo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
  rainGeo.setAttribute('aEnd', new THREE.BufferAttribute(end, 1));
  const rainU = { uTime: { value: 0 }, uFocusX: { value: 0 } };
  const rainMat = keep(new THREE.LineBasicMaterial({ color: 0xa9bfd9, transparent: true, opacity: 0.2, depthWrite: false }));
  rainMat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, rainU);
    sh.vertexShader = sh.vertexShader
      .replace(
        '#include <common>',
        '#include <common>\nuniform float uTime;\nuniform float uFocusX;\nattribute vec4 aSeed;\nattribute float aEnd;',
      )
      .replace(
        '#include <begin_vertex>',
        `const float WIND = -1.6;
        const float BX = ${box.x.toFixed(1)};
        const float BY = ${box.y.toFixed(1)};
        float sp = aSeed.w;
        float y = BY - mod(BY - aSeed.y + sp * uTime, BY);
        float x = aSeed.x + WIND * uTime;
        x = uFocusX + mod(x - uFocusX + 3.0 * BX, 2.0 * BX) - BX;
        vec3 transformed = vec3(x - aEnd * (WIND / sp) * 0.38, y + aEnd * 0.38, aSeed.z);`,
      );
  };
  const rain = new THREE.LineSegments(rainGeo, rainMat);
  rain.frustumCulled = false;
  add(rain);

  const neon = scene.getObjectByName('neon') as THREE.Mesh;
  const neonMat = neon.material as THREE.MeshStandardMaterial;

  // ~90 small static meshes collapse to one per material, then the whole world is
  // frozen so the per-frame scene graph update skips it.
  skipFlatInReflection(scene);
  mergeStatic(scene);
  freeze([...scene.children]);

  return {
    reflector,
    rain,
    update(t, _dt, focus) {
      // neon flicker (two short dips every 6 s)
      const ph = t % 6;
      neonMat.emissiveIntensity = (ph > 1.2 && ph < 1.32) || (ph > 3.8 && ph < 3.86) ? 1.1 : 3;
      // wrapped so float precision holds on long sessions
      rainU.uTime.value = t % 600;
      rainU.uFocusX.value = focus.x;
    },
    resize(w, h) {
      const q = quality === 'high' ? 0.4 : 0.25;
      reflector.getRenderTarget().setSize(Math.max(256, Math.round(w * q)), Math.max(256, Math.round(h * q)));
    },
    dispose() {
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh && m.geometry) m.geometry.dispose();
      });
      reflector.dispose();
      disposables.forEach((d) => d.dispose());
    },
  };
}
