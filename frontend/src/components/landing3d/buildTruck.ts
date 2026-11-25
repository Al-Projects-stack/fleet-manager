import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  cabSideTexture,
  grilleTexture,
  rimTexture,
  sidewallTexture,
  trailerRearTexture,
  trailerSideTexture,
  treadTexture,
} from './textures';

/**
 * European cab-over tractor + tri-axle box trailer, built from primitives.
 * Truck-local metres: x = 0 at trailer rear, x = FRONT at the bumper, y up from
 * the road, z across (0 = centreline, +z = the side facing the camera).
 */
export const FRONT = 17.2;
export const WHEEL_R = 0.52;
export const WHEEL_X = { trailer: [2.13, 3.45, 4.77], drive: 11.91, steer: 16.0 } as const;
const CAB = { x0: 14.68, x1: 17.05, half: 1.22 };

export interface Sensor {
  id: string;
  label: string;
  value: string;
  pos: THREE.Vector3; // truck-local
}

export interface TruckRig {
  root: THREE.Group;
  trailerPivot: THREE.Group;
  chassisPivot: THREE.Group;
  cabPivot: THREE.Group;
  wheels: THREE.Group[];
  blurDiscs: THREE.Mesh[];
  sharpDiscs: THREE.Mesh[];
  brakeMat: THREE.MeshStandardMaterial;
  reverseMat: THREE.MeshStandardMaterial;
  headlights: THREE.SpotLight[];
  exhaust: THREE.Vector3; // truck-local
  hudAnchor: THREE.Vector3;
  sensors: Sensor[];
  dispose: () => void;
}

function box(w: number, h: number, d: number, mat: THREE.Material, x: number, y: number, z: number, r = 0) {
  const geo = r > 0 ? new RoundedBoxGeometry(w, h, d, 3, r) : new THREE.BoxGeometry(w, h, d);
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function cyl(r: number, len: number, mat: THREE.Material, axis: 'x' | 'y' | 'z', seg = 32) {
  const geo = new THREE.CylinderGeometry(r, r, len, seg);
  if (axis === 'x') geo.rotateZ(Math.PI / 2);
  if (axis === 'z') geo.rotateX(Math.PI / 2);
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  return m;
}

/** Pivot group at `p`, with a child group offset back so children use truck-local coords. */
function pivot(parent: THREE.Object3D, p: { x: number; y: number; z: number }) {
  const pv = new THREE.Group();
  pv.position.set(p.x, p.y, p.z);
  const inner = new THREE.Group();
  inner.position.set(-p.x, -p.y, -p.z);
  pv.add(inner);
  parent.add(pv);
  return [pv, inner] as const;
}

export function buildTruck(): TruckRig {
  const disposables: { dispose: () => void }[] = [];
  const keep = <T extends { dispose: () => void }>(o: T) => {
    disposables.push(o);
    return o;
  };

  // ── materials ──
  const paint = keep(
    new THREE.MeshPhysicalMaterial({
      color: 0x0f1d33,
      metalness: 0.6,
      roughness: 0.3,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      envMapIntensity: 1.4,
    }),
  );
  const trailerBody = keep(
    new THREE.MeshPhysicalMaterial({ color: 0xdfe3e8, metalness: 0.15, roughness: 0.42, clearcoat: 0.4, clearcoatRoughness: 0.2 }),
  );
  const sideTex = keep(trailerSideTexture());
  const trailerSide = keep(
    new THREE.MeshPhysicalMaterial({ map: sideTex, metalness: 0.12, roughness: 0.38, clearcoat: 0.5, clearcoatRoughness: 0.15 }),
  );
  const rearTex = keep(trailerRearTexture());
  const trailerRear = keep(new THREE.MeshStandardMaterial({ map: rearTex, metalness: 0.2, roughness: 0.45 }));
  const black = keep(new THREE.MeshStandardMaterial({ color: 0x0c0d10, roughness: 0.75, metalness: 0.1 }));
  const frame = keep(new THREE.MeshStandardMaterial({ color: 0x15181d, roughness: 0.55, metalness: 0.4 }));
  const chrome = keep(new THREE.MeshStandardMaterial({ color: 0xe3e7ec, roughness: 0.12, metalness: 1 }));
  const alu = keep(new THREE.MeshStandardMaterial({ color: 0xc4cbd3, roughness: 0.28, metalness: 1 }));
  const glass = keep(
    new THREE.MeshPhysicalMaterial({ color: 0x03060b, roughness: 0.04, metalness: 0.1, clearcoat: 1, envMapIntensity: 2.2, side: THREE.DoubleSide }),
  );
  const blackDouble = keep(new THREE.MeshStandardMaterial({ color: 0x0c0d10, roughness: 0.75, metalness: 0.1, side: THREE.DoubleSide }));
  /** Half-cylinder shell with its axis along z, covering the top (fenders, arch liners). */
  const halfShell = (r: number, len: number) => {
    const g = new THREE.CylinderGeometry(r, r, len, 24, 1, true, -Math.PI / 2, Math.PI);
    g.rotateX(-Math.PI / 2);
    return keep(g);
  };
  const tread = keep(treadTexture());
  tread.repeat.set(6, 1);
  const tyreMat = keep(new THREE.MeshStandardMaterial({ map: tread, roughness: 0.9 }));
  const sidewall = keep(new THREE.MeshStandardMaterial({ map: keep(sidewallTexture()), roughness: 0.85 }));
  const rimSharp = keep(new THREE.MeshStandardMaterial({ map: keep(rimTexture(false)), metalness: 0.9, roughness: 0.22, transparent: true }));
  const rimBlur = keep(new THREE.MeshStandardMaterial({ map: keep(rimTexture(true)), metalness: 0.9, roughness: 0.3, transparent: true, opacity: 0 }));
  const headMat = keep(new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff4e0, emissiveIntensity: 9 }));
  const drlMat = keep(new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xdff4ff, emissiveIntensity: 6 }));
  const amber = keep(new THREE.MeshStandardMaterial({ color: 0xffa531, emissive: 0xff8a10, emissiveIntensity: 4 }));
  const brakeMat = keep(new THREE.MeshStandardMaterial({ color: 0x400806, emissive: 0xff1a0a, emissiveIntensity: 2 }));
  const reverseMat = keep(new THREE.MeshStandardMaterial({ color: 0x777777, emissive: 0xffffff, emissiveIntensity: 0 }));
  const reefer = keep(new THREE.MeshStandardMaterial({ color: 0x2a3039, roughness: 0.5, metalness: 0.4 }));
  const hoseMats = [0xa3221b, 0x1e40af, 0x18191c].map((c) => keep(new THREE.MeshStandardMaterial({ color: c, roughness: 0.5 })));

  const root = new THREE.Group();
  root.name = 'truck';

  // ── wheels ──
  const wheels: THREE.Group[] = [];
  const blurDiscs: THREE.Mesh[] = [];
  const sharpDiscs: THREE.Mesh[] = [];

  const nutGeo = keep(
    mergeGeometries(
      Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2 + 0.31;
        const g = new THREE.CylinderGeometry(0.022, 0.022, 0.05, 6);
        g.rotateX(Math.PI / 2);
        g.translate(Math.cos(a) * 0.16, Math.sin(a) * 0.16, 0);
        return g;
      }),
    )!,
  );

  function tyreGeo(width: number) {
    const pts: THREE.Vector2[] = [];
    const ri = 0.29;
    const ro = WHEEL_R;
    const hw = width / 2;
    pts.push(new THREE.Vector2(ri, -hw));
    pts.push(new THREE.Vector2(ro - 0.08, -hw));
    for (let i = 0; i <= 6; i++) {
      const a = -Math.PI / 2 + (i / 6) * (Math.PI / 2);
      pts.push(new THREE.Vector2(ro - 0.08 + Math.cos(a) * 0.08, -hw + 0.08 + Math.sin(a) * 0.08));
    }
    for (let i = 0; i <= 6; i++) {
      const a = (i / 6) * (Math.PI / 2);
      pts.push(new THREE.Vector2(ro - 0.08 + Math.cos(a) * 0.08, hw - 0.08 + Math.sin(a) * 0.08));
    }
    pts.push(new THREE.Vector2(ri, hw));
    const g = new THREE.LatheGeometry(pts, 48);
    g.rotateX(Math.PI / 2);
    return keep(g);
  }
  const tyreSingle = tyreGeo(0.38);
  const tyreSteer = tyreGeo(0.32);
  const rimGeo = keep(new THREE.CylinderGeometry(0.295, 0.295, 1, 40, 1, true));
  rimGeo.rotateX(Math.PI / 2);
  const discGeo = keep(new THREE.CircleGeometry(0.285, 40));
  const wallGeo = keep(new THREE.RingGeometry(0.29, 0.5, 48));
  const hubGeo = keep(new THREE.CylinderGeometry(0.075, 0.09, 0.09, 24));
  hubGeo.rotateX(Math.PI / 2);

  /** One tyre+rim assembly; outward = +1 if its face points to +z. */
  function tyre(width: number, outward: 1 | -1, geo: THREE.BufferGeometry) {
    const g = new THREE.Group();
    const t = new THREE.Mesh(geo, tyreMat);
    t.castShadow = true;
    g.add(t);
    const wall = new THREE.Mesh(wallGeo, sidewall);
    wall.position.z = (outward * width) / 2 + outward * 0.002;
    if (outward < 0) wall.rotation.y = Math.PI;
    g.add(wall);
    const rim = new THREE.Mesh(rimGeo, alu);
    rim.scale.z = width * 0.92;
    g.add(rim);
    const face = outward * (width * 0.46 - 0.03);
    const sharp = new THREE.Mesh(discGeo, rimSharp);
    sharp.position.z = face;
    const blur = new THREE.Mesh(discGeo, rimBlur);
    blur.position.z = face + outward * 0.002;
    if (outward < 0) {
      sharp.rotation.y = Math.PI;
      blur.rotation.y = Math.PI;
    }
    g.add(sharp, blur);
    sharpDiscs.push(sharp);
    blurDiscs.push(blur);
    const nuts = new THREE.Mesh(nutGeo, chrome);
    nuts.position.z = face + outward * 0.02;
    const hub = new THREE.Mesh(hubGeo, chrome);
    hub.position.z = face + outward * 0.045;
    g.add(nuts, hub);
    return g;
  }

  function axle(x: number, kind: 'single' | 'dual' | 'steer') {
    const spin = new THREE.Group();
    spin.position.set(x, WHEEL_R, 0);
    const track = kind === 'steer' ? 1.04 : kind === 'dual' ? 0.9 : 1.03;
    for (const side of [1, -1] as const) {
      if (kind === 'dual') {
        const outer = tyre(0.3, side, tyreSteer);
        outer.position.z = side * (track + 0.17);
        const inner = tyre(0.3, side, tyreSteer);
        inner.position.z = side * (track - 0.17);
        spin.add(outer, inner);
      } else {
        const t = tyre(kind === 'steer' ? 0.32 : 0.38, side, kind === 'steer' ? tyreSteer : tyreSingle);
        t.position.z = side * track;
        spin.add(t);
      }
    }
    const shaft = cyl(0.07, track * 2, frame, 'z', 12);
    spin.add(shaft);
    root.add(spin);
    wheels.push(spin);
  }
  WHEEL_X.trailer.forEach((x) => axle(x, 'single'));
  axle(WHEEL_X.drive, 'dual');
  axle(WHEEL_X.steer, 'steer');

  // ── trailer ──
  const [trailerPivot, T] = pivot(root, { x: WHEEL_X.trailer[1], y: WHEEL_R, z: 0 });
  {
    const L = 13.6;
    const H = 2.75;
    const Wd = 2.55;
    const y0 = 1.22;
    T.add(box(L, H, Wd, trailerBody, L / 2, y0 + H / 2, 0, 0.05));
    const side = new THREE.PlaneGeometry(L - 0.08, H - 0.06);
    keep(side);
    const near = new THREE.Mesh(side, trailerSide);
    near.position.set(L / 2, y0 + H / 2, Wd / 2 + 0.003);
    near.receiveShadow = true;
    const far = new THREE.Mesh(side, trailerSide);
    far.position.set(L / 2, y0 + H / 2, -Wd / 2 - 0.003);
    far.rotation.y = Math.PI;
    T.add(near, far);
    const rear = new THREE.Mesh(keep(new THREE.PlaneGeometry(Wd - 0.06, H - 0.06)), trailerRear);
    rear.position.set(-0.003, y0 + H / 2, 0);
    rear.rotation.y = -Math.PI / 2;
    T.add(rear);
    // underframe, rails
    T.add(box(L, 0.16, Wd, frame, L / 2, y0 - 0.06, 0));
    T.add(box(L - 1, 0.28, 1.9, black, L / 2 + 0.3, y0 - 0.25, 0));
    // reefer unit
    T.add(box(0.36, 1.85, 2.05, reefer, L + 0.18, 2.75, 0, 0.05));
    for (let i = 0; i < 8; i++) T.add(box(0.02, 0.05, 1.8, black, L + 0.37, 2.0 + i * 0.2, 0));
    // mudguards over tri-axle
    for (const side of [1, -1]) {
      T.add(box(3.9, 0.05, 0.5, black, 3.45, 1.12, side * 1.03));
      T.add(box(0.03, 0.6, 0.5, black, 1.4, 0.75, side * 1.03));
      // side guard rails
      T.add(box(4.2, 0.08, 0.04, alu, 7.85, 0.62, side * 1.22));
      T.add(box(4.2, 0.08, 0.04, alu, 7.85, 0.9, side * 1.22));
      for (const x of [5.9, 7.85, 9.8]) T.add(box(0.05, 0.42, 0.05, frame, x, 0.85, side * 1.2));
      // landing gear
      T.add(box(0.12, 0.95, 0.12, alu, 10.3, 0.62, side * 0.92));
      T.add(box(0.3, 0.05, 0.3, frame, 10.3, 0.15, side * 0.92));
      // side markers
      for (const x of [0.7, 2.7, 6.4, 8.3, 12.6]) T.add(box(0.1, 0.06, 0.02, amber, x, 1.12, side * 1.29));
      // rear lights
      const tl = box(0.04, 0.12, 0.42, brakeMat, -0.02, 0.98, side * 0.95);
      T.add(tl);
      T.add(box(0.04, 0.1, 0.12, amber, -0.02, 0.98, side * 1.2));
      T.add(box(0.04, 0.08, 0.1, reverseMat, -0.02, 0.98, side * 0.65));
    }
    // rear underrun bar
    T.add(box(0.14, 0.14, 2.4, alu, 0.12, 0.55, 0));
    for (const z of [-0.7, 0.7]) T.add(box(0.08, 0.6, 0.08, frame, 0.25, 0.85, z));
    // top marker lights
    for (const z of [-1.15, 1.15]) T.add(box(0.06, 0.06, 0.06, amber, 13.5, 3.98, z));
  }

  // ── tractor chassis ──
  const [chassisPivot, C] = pivot(root, { x: WHEEL_X.drive, y: WHEEL_R, z: 0 });
  {
    for (const z of [-0.43, 0.43]) C.add(box(6.1, 0.28, 0.1, frame, 13.95, 1.04, z));
    C.add(box(1.4, 0.08, 2.0, frame, 12.0, 1.2, 0));
    // drive fenders + flaps
    for (const side of [1, -1]) {
      const f = new THREE.Mesh(halfShell(0.64, 0.72), blackDouble);
      f.position.set(WHEEL_X.drive, WHEEL_R, side * 0.9);
      C.add(f);
      C.add(box(0.03, 0.6, 0.62, black, 11.12, 0.55, side * 0.9));
    }
    // fuel tank (near side) and AdBlue + battery box (far side)
    const tank = cyl(0.33, 1.75, alu, 'x', 40);
    tank.position.set(13.95, 0.72, 1.0);
    C.add(tank);
    for (const x of [13.35, 14.55]) {
      const strap = cyl(0.338, 0.05, frame, 'x', 40);
      strap.position.set(x, 0.72, 1.0);
      C.add(strap);
    }
    const cap = cyl(0.06, 0.04, chrome, 'y', 16);
    cap.position.set(14.2, 1.06, 1.0);
    C.add(cap);
    const adblue = cyl(0.25, 0.6, alu, 'x', 32);
    adblue.position.set(13.5, 0.75, -1.0);
    C.add(adblue);
    C.add(box(0.8, 0.5, 0.5, black, 14.4, 0.78, -0.95, 0.03));
    // air tanks
    for (const z of [-0.7, 0.7]) {
      const at = cyl(0.13, 0.9, frame, 'x', 20);
      at.position.set(12.75, 0.82, z);
      C.add(at);
    }
    // exhaust silencer + tailpipe (near side, behind tank)
    C.add(box(0.5, 0.42, 0.55, frame, 12.65, 0.75, 0.9, 0.04));
    const pipe = cyl(0.045, 0.3, frame, 'y', 12);
    pipe.position.set(12.45, 0.42, 1.05);
    C.add(pipe);
    // front bumper + lamps
    C.add(box(0.34, 0.58, 2.52, paint, 16.98, 0.82, 0, 0.08));
    C.add(box(0.06, 0.12, 2.3, black, 17.15, 0.6, 0));
    for (const side of [1, -1]) {
      C.add(box(0.04, 0.17, 0.44, headMat, 17.16, 0.98, side * 0.86));
      C.add(box(0.03, 0.025, 0.44, drlMat, 17.16, 1.09, side * 0.86));
      C.add(box(0.03, 0.08, 0.14, amber, 17.13, 0.98, side * 1.18));
      C.add(box(0.03, 0.07, 0.16, headMat, 17.16, 0.62, side * 0.95));
    }
    // steps
    for (const side of [1, -1]) {
      C.add(box(0.7, 0.62, 0.3, black, 15.05, 0.72, side * 1.07));
      C.add(box(0.62, 0.035, 0.32, alu, 15.05, 0.5, side * 1.12));
      C.add(box(0.62, 0.035, 0.32, alu, 15.05, 0.82, side * 1.12));
      // front arch liners
      const liner = new THREE.Mesh(halfShell(0.68, 0.42), blackDouble);
      liner.position.set(WHEEL_X.steer, WHEEL_R, side * 1.0);
      C.add(liner);
    }
  }

  // ── cab (own suspension) ──
  const [cabPivot, K] = pivot(C, { x: 15.0, y: 1.25, z: 0 });
  {
    const s = new THREE.Shape();
    s.moveTo(CAB.x0, 1.02);
    s.lineTo(CAB.x0, 3.57);
    s.quadraticCurveTo(CAB.x0, 3.83, 14.94, 3.83);
    s.lineTo(16.47, 3.83);
    s.quadraticCurveTo(16.79, 3.83, 16.85, 3.57);
    s.lineTo(17.0, 1.36);
    s.lineTo(17.05, 1.02);
    s.lineTo(16.52, 1.02);
    s.absarc(WHEEL_X.steer, WHEEL_R, 0.72, Math.atan2(0.5, 0.52), Math.PI - Math.atan2(0.5, 0.52), false);
    s.lineTo(CAB.x0, 1.02);
    const depth = CAB.half * 2;
    const geo = keep(
      new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.07, bevelSegments: 5, curveSegments: 28 }),
    );
    geo.translate(0, 0, -depth / 2);
    const body = new THREE.Mesh(geo, paint);
    body.castShadow = true;
    body.receiveShadow = true;
    K.add(body);

    // side decals (door seams, handle, accent stripe)
    const decalShape = new THREE.Shape();
    decalShape.moveTo(CAB.x0 - 0.06, 0.96);
    decalShape.lineTo(CAB.x0 - 0.06, 3.9);
    decalShape.lineTo(16.9, 3.9);
    decalShape.lineTo(17.12, 0.96);
    decalShape.lineTo(16.55, 0.96);
    decalShape.absarc(WHEEL_X.steer, WHEEL_R, 0.76, Math.atan2(0.44, 0.55), Math.PI - Math.atan2(0.44, 0.55), false);
    decalShape.lineTo(CAB.x0 - 0.06, 0.96);
    const decalGeo = keep(new THREE.ShapeGeometry(decalShape, 24));
    const decalMat = keep(new THREE.MeshStandardMaterial({ map: keep(cabSideTexture()), transparent: true, roughness: 0.4, depthWrite: false }));
    const zSurf = CAB.half + 0.07 + 0.004;
    const dn = new THREE.Mesh(decalGeo, decalMat);
    dn.position.z = zSurf;
    K.add(dn);

    // side windows
    const win = new THREE.Shape();
    win.moveTo(15.15, 2.3);
    win.lineTo(16.55, 2.3);
    win.lineTo(16.64, 3.3);
    win.quadraticCurveTo(16.62, 3.42, 16.5, 3.42);
    win.lineTo(15.15, 3.42);
    win.lineTo(15.15, 2.3);
    const winGeo = keep(new THREE.ShapeGeometry(win, 8));
    for (const side of [1, -1]) {
      const w = new THREE.Mesh(winGeo, glass);
      w.position.z = side * (zSurf + 0.002);
      K.add(w);
    }

    // front face (tilted with the windscreen rake)
    const face = new THREE.Group();
    face.position.set(17.0 + 0.07, 1.36, 0);
    face.rotation.z = Math.atan2(0.15, 2.21);
    K.add(face);
    const onFace = (geo: THREE.BufferGeometry, mat: THREE.Material, y: number, z = 0, out = 0.004) => {
      const m = new THREE.Mesh(geo, mat);
      m.rotation.y = Math.PI / 2;
      m.position.set(out, y, z);
      face.add(m);
      return m;
    };
    onFace(keep(new THREE.PlaneGeometry(2.3, 1.12)), glass, 1.55);
    onFace(keep(new THREE.PlaneGeometry(2.0, 0.84)), keep(new THREE.MeshStandardMaterial({ map: keep(grilleTexture()), metalness: 0.6, roughness: 0.35 })), 0.48);
    // wipers
    for (const z of [-0.5, 0.55]) {
      const wp = box(0.03, 0.025, 0.95, black, 0.02, 1.02, z);
      wp.rotation.x = 0.18;
      face.add(wp);
    }
    // sun visor
    const visor = box(0.32, 0.06, 2.4, paint, 0.1, 2.2, 0, 0.02);
    visor.rotation.z = -0.12;
    face.add(visor);

    // roof light bar
    K.add(box(0.12, 0.08, 1.9, black, 16.5, 3.92, 0));
    for (let i = 0; i < 5; i++) K.add(box(0.06, 0.06, 0.12, amber, 16.57, 3.93, -0.8 + i * 0.4));
    // roof deflector edge, horns, antennas
    K.add(box(1.9, 0.05, 2.3, paint, 15.7, 3.92, 0, 0.02));
    const ant = cyl(0.008, 0.5, black, 'y', 6);
    ant.position.set(15.0, 4.15, -1.0);
    K.add(ant);

    // mirrors
    for (const side of [1, -1]) {
      const arm = box(0.04, 0.04, 0.32, black, 16.95, 3.0, side * 1.42);
      K.add(arm);
      K.add(box(0.1, 0.5, 0.24, black, 17.08, 2.78, side * 1.58, 0.03));
      K.add(box(0.012, 0.44, 0.19, glass, 17.02, 2.78, side * 1.58));
      K.add(box(0.1, 0.2, 0.2, black, 17.1, 2.35, side * 1.5, 0.03));
      // grab handles
      K.add(box(0.03, 0.75, 0.03, chrome, 14.84, 2.05, side * (zSurf + 0.03)));
      // cab side marker
      K.add(box(0.12, 0.06, 0.02, amber, 14.8, 1.1, side * (zSurf + 0.005)));
    }

    // suzie coils (air + electric) from back of cab to trailer front
    hoseMats.forEach((mat, i) => {
      const z = -0.25 + i * 0.25;
      const pts: THREE.Vector3[] = [];
      for (let k = 0; k <= 80; k++) {
        const t = k / 80;
        const x = 14.62 - t * 0.62;
        const y = 3.0 - i * 0.08 - Math.sin(t * Math.PI) * (0.35 - i * 0.06);
        const a = t * Math.PI * 28;
        pts.push(new THREE.Vector3(x + Math.cos(a) * 0.035, y + Math.sin(a) * 0.035, z + Math.sin(a + 1) * 0.035));
      }
      const tube = new THREE.Mesh(keep(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 400, 0.011, 6)), mat);
      K.add(tube);
    });
  }

  // ── headlight spot lights (follow chassis pitch) ──
  const headlights: THREE.SpotLight[] = [];
  for (const side of [1, -1]) {
    const l = new THREE.SpotLight(0xfff2dc, 120, 70, 0.42, 0.55, 1.4);
    l.position.set(17.2, 1.0, side * 0.86);
    l.target.position.set(40, 0, side * 2.2);
    C.add(l, l.target);
    headlights.push(l);
  }

  // ── sensors (for the overhead stage) ──
  const sensors: Sensor[] = [
    // Only fields the app actually ingests (see backend Telemetry + Vehicle models).
    { id: 'gps', label: 'GPS position', value: 'Live', pos: new THREE.Vector3(15.8, 4.0, 0) },
    { id: 'engine', label: 'Engine temp', value: '88°C', pos: new THREE.Vector3(16.6, 1.5, 1.3) },
    { id: 'fuel', label: 'Fuel level', value: '72%', pos: new THREE.Vector3(13.95, 1.05, 1.34) },
    { id: 'odo', label: 'Odometer', value: '214,806 km', pos: new THREE.Vector3(15.7, 2.8, 1.3) },
    { id: 'hours', label: 'Engine hours', value: '9,412 h', pos: new THREE.Vector3(14.75, 1.9, 1.3) },
    { id: 'service', label: 'Service due in', value: '420 km', pos: new THREE.Vector3(WHEEL_X.drive, 0.52, 1.3) },
  ];

  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });

  return {
    root,
    trailerPivot,
    chassisPivot,
    cabPivot,
    wheels,
    blurDiscs,
    sharpDiscs,
    brakeMat,
    reverseMat,
    headlights,
    exhaust: new THREE.Vector3(12.45, 0.25, 1.05),
    hudAnchor: new THREE.Vector3(15.9, 4.1, 0),
    sensors,
    dispose: () => {
      root.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) m.geometry.dispose();
      });
      disposables.forEach((d) => d.dispose());
    },
  };
}
