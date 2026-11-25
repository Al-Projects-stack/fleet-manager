import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const tmp = new THREE.Matrix4();
const inv = new THREE.Matrix4();

/**
 * Collapses every plain, childless Mesh below `root` into one Mesh per material
 * (and shadow flags), baked into `root`'s local space. Cuts draw calls for the
 * main pass, the road reflection and every shadow map.
 *
 * `stop` marks subtrees that move on their own (pivots, wheels) and must stay separate.
 * Call before the first render so the original geometries are never uploaded.
 */
export function mergeStatic(root: THREE.Object3D, stop: (o: THREE.Object3D) => boolean = () => false) {
  root.updateMatrixWorld(true);
  inv.copy(root.matrixWorld).invert();

  type Bucket = { mesh: THREE.Mesh; geos: THREE.BufferGeometry[]; members: THREE.Mesh[] };
  const buckets = new Map<string, Bucket>();

  const visit = (o: THREE.Object3D) => {
    for (const c of o.children) {
      if (stop(c)) continue;
      const m = c as THREE.Mesh;
      if (
        m.constructor === THREE.Mesh &&
        m.children.length === 0 &&
        m.visible &&
        !Array.isArray(m.material) &&
        !m.userData.noMerge &&
        Object.keys(m.geometry.morphAttributes).length === 0
      ) {
        const g = m.geometry;
        const sig = Object.keys(g.attributes).sort().join(',') + (g.index ? '|i' : '|n');
        const key = `${(m.material as THREE.Material).uuid}|${+m.castShadow}${+m.receiveShadow}|${m.renderOrder}|${m.layers.mask}|${sig}`;
        let b = buckets.get(key);
        if (!b) buckets.set(key, (b = { mesh: m, geos: [], members: [] }));
        const geo = g.clone();
        geo.clearGroups();
        geo.applyMatrix4(tmp.multiplyMatrices(inv, m.matrixWorld));
        if (tmp.determinant() < 0) flipWinding(geo);
        b.geos.push(geo);
        b.members.push(m);
      } else {
        visit(c);
      }
    }
  };
  visit(root);

  let before = 0;
  let after = 0;
  for (const b of buckets.values()) {
    before += b.members.length;
    if (b.members.length < 2) {
      after += b.members.length;
      b.geos.forEach((g) => g.dispose());
      continue;
    }
    const merged = mergeGeometries(b.geos, false);
    b.geos.forEach((g) => g.dispose());
    if (!merged) {
      after += b.members.length;
      continue;
    }
    const src = b.mesh;
    const out = new THREE.Mesh(merged, src.material);
    out.castShadow = src.castShadow;
    out.receiveShadow = src.receiveShadow;
    out.renderOrder = src.renderOrder;
    out.layers.mask = src.layers.mask;
    out.name = `merged:${(src.material as THREE.Material).type}`;
    for (const m of b.members) m.removeFromParent();
    root.add(out);
    out.updateMatrix();
    out.matrixAutoUpdate = false;
    after += 1;
  }
  return { before, after };
}

function flipWinding(g: THREE.BufferGeometry) {
  const idx = g.index;
  if (idx) {
    const a = idx.array;
    for (let i = 0; i < a.length; i += 3) {
      const t = a[i + 1];
      a[i + 1] = a[i + 2];
      a[i + 2] = t;
    }
    idx.needsUpdate = true;
    return;
  }
  for (const attr of Object.values(g.attributes)) {
    const s = attr.itemSize;
    const a = attr.array as Float32Array;
    for (let v = 0; v < attr.count; v += 3) {
      for (let k = 0; k < s; k++) {
        const i1 = (v + 1) * s + k;
        const i2 = (v + 2) * s + k;
        const t = a[i1];
        a[i1] = a[i2];
        a[i2] = t;
      }
    }
    attr.needsUpdate = true;
  }
}

const twinMats = new Map<THREE.Side, THREE.MeshBasicMaterial>();
/**
 * Replaces the shadow casting of every mesh below `root` (not crossing `stop`)
 * with one position-only "twin" per face side. The twin draws nothing on screen
 * (no colour or depth writes) but casts the same shadow, so a shadow map costs one
 * draw per moving part instead of one per material. Wheels can share their
 * parent's twin: a spinning wheel's silhouette doesn't change.
 */
export function shadowTwin(root: THREE.Object3D, stop: (o: THREE.Object3D) => boolean = () => false) {
  root.updateMatrixWorld(true);
  inv.copy(root.matrixWorld).invert();
  const bySide = new Map<THREE.Side, THREE.BufferGeometry[]>();
  const inst = new THREE.Matrix4();
  const add = (g: THREE.BufferGeometry, m: THREE.Matrix4, side: THREE.Side) => {
    const geo = new THREE.BufferGeometry();
    const src = g.index ? g.toNonIndexed() : g;
    geo.setAttribute('position', src.getAttribute('position').clone());
    if (src !== g) src.dispose();
    geo.applyMatrix4(m);
    if (m.determinant() < 0) flipWinding(geo);
    let list = bySide.get(side);
    if (!list) bySide.set(side, (list = []));
    list.push(geo);
  };
  const visit = (o: THREE.Object3D) => {
    for (const c of o.children) {
      if (stop(c)) continue;
      const m = c as THREE.Mesh;
      if (m.isMesh && m.castShadow && m.visible && !Array.isArray(m.material)) {
        const side = (m.material as THREE.Material).side;
        tmp.multiplyMatrices(inv, m.matrixWorld);
        const im = m as THREE.InstancedMesh;
        if (im.isInstancedMesh) {
          for (let i = 0; i < im.count; i++) {
            im.getMatrixAt(i, inst);
            add(m.geometry, inst.premultiply(tmp), side);
          }
        } else {
          add(m.geometry, tmp, side);
        }
        m.castShadow = false;
      }
      visit(c);
    }
  };
  visit(root);
  for (const [side, geos] of bySide) {
    const merged = mergeGeometries(geos, false);
    geos.forEach((g) => g.dispose());
    if (!merged) continue;
    let mat = twinMats.get(side);
    if (!mat) twinMats.set(side, (mat = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, side })));
    const twin = new THREE.Mesh(merged, mat);
    twin.name = 'shadowTwin';
    twin.castShadow = true;
    twin.layers.set(NO_REFLECT_LAYER);
    root.add(twin);
    twin.updateMatrix();
    twin.matrixAutoUpdate = false;
  }
}

/** Layer seen by the main camera but skipped by the road reflection's camera. */
export const NO_REFLECT_LAYER = 1;

/**
 * Moves meshes that lie flat on the ground (markings, kerbs, pavement) onto a
 * layer the planar reflection doesn't render: anything this low reflects into a
 * sliver at most, but would still cost a draw call in the mirrored pass.
 */
export function skipFlatInReflection(root: THREE.Object3D, maxY = 0.35) {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3();
  root.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh || (m as unknown as { isReflector?: boolean }).isReflector) return;
    box.setFromObject(m);
    if (!box.isEmpty() && box.max.y < maxY) m.layers.set(NO_REFLECT_LAYER);
  });
}

/**
 * Freezes the world matrices of objects that never move, so the per-frame
 * scene graph update skips them entirely.
 */
export function freeze(objects: THREE.Object3D[]) {
  for (const o of objects) {
    o.updateMatrixWorld(true);
    o.traverse((c) => {
      c.matrixAutoUpdate = false;
      c.matrixWorldAutoUpdate = false;
    });
  }
}
