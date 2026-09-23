// Loads the sculpted, skinned character models (assets/models/*.bin, made by
// tools/modelgen) and builds animated instances of them.

import * as THREE from 'three';
import { MaterialSet, paintedTexture, box, cyl, cone, ball, mergeStatic } from './common.js';
import { glowTexture } from '../effects/Effects.js';
import { paintedFor } from './paint.js';

const loaded = new Map();

// sRGB byte -> linear float (vertex colours are treated as linear by three.js)
const LIN = new Float32Array(256);
for (let i = 0; i < 256; i++) { const c = i / 255; LIN[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }

function parse(buf) {
  const dv = new DataView(buf);
  if (dv.getUint32(0, true) !== 0x4d57424b) throw new Error('bad model file');
  const jlen = dv.getUint32(4, true);
  const meta = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 8, jlen)));
  let base = 8 + jlen; base += (4 - (base % 4)) % 4;
  meta.meshes = meta.meshes.map(m => {
    const n = m.vertices;
    const geo = new THREE.BufferGeometry();
    const qp = new Uint16Array(buf, base + m.pos, n * 3), pf = new Float32Array(n * 3);
    for (let i = 0; i < n * 3; i++) pf[i] = m.pmin[i % 3] + qp[i] * m.pstep[i % 3];
    geo.setAttribute('position', new THREE.BufferAttribute(pf, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(new Int8Array(buf, base + m.nrm, n * 3), 3, true));
    const cb = new Uint8Array(buf, base + m.col, n * 3), cf = new Float32Array(n * 3);
    for (let i = 0; i < n * 3; i++) cf[i] = LIN[cb[i]];
    geo.setAttribute('color', new THREE.BufferAttribute(cf, 3));
    geo.setAttribute('skinIndex', new THREE.BufferAttribute(new Uint8Array(buf, base + m.sIdx, n * 4), 4));
    geo.setAttribute('skinWeight', new THREE.BufferAttribute(new Uint8Array(buf, base + m.sW, n * 4), 4, true));
    if (m.uv !== null && m.uv !== undefined) geo.setAttribute('uv', new THREE.BufferAttribute(new Uint16Array(buf, base + m.uv, n * 2), 2, true));
    geo.setIndex(new THREE.BufferAttribute(m.idx32 ? new Uint32Array(buf, base + m.idx, m.idxCount) : new Uint16Array(buf, base + m.idx, m.idxCount), 1));
    geo.computeBoundingSphere();
    const size = geo.boundingSphere.radius;
    geo.boundingSphere.radius *= 1.6;          // room for animation
    return { material: m.material, lod: m.lod || 0, geo, lookup: m.lookup, size };
  });
  return meta;
}

/** Load models by name. Missing files are skipped (the game falls back to simpler models). */
export async function preloadModels(names, onProgress) {
  let done = 0;
  await Promise.all(names.map(async (name) => {
    try {
      const res = await fetch(new URL(`../../assets/models/${name}.bin`, import.meta.url));
      if (res.ok) loaded.set(name, parse(await res.arrayBuffer()));
    } catch (e) { console.warn('model', name, e); }
    onProgress?.(++done / names.length);
  }));
}
export const hasModel = (name) => loaded.has(name);

const MATERIALS = {
  skin: { shininess: 22, specular: 0x1c1816 },
  face: { shininess: 28, specular: 0x241e1c },
  hair: { shininess: 30, specular: 0x1a1614 },
  flesh: { shininess: 45, specular: 0x2a1a18 },
  armor: { shininess: 60, specular: 0x4a4a52 },
  cloth: { shininess: 8, specular: 0x0a0a0a },
};

/** Switch to the coarse mesh beyond this many model radii from the camera. */
const LOD_DISTANCE = 7;

let irisCache = new Map();
function eyeTexture(iris) {
  if (irisCache.has(iris)) return irisCache.get(iris);
  const t = paintedTexture(128, 64, (c, W, H) => {
    c.fillStyle = '#f4efe9'; c.fillRect(0, 0, W, H);
    const cx = W * 0.25, cy = H * 0.5;
    const g = c.createRadialGradient(cx, cy, 1, cx, cy, 10);
    g.addColorStop(0, '#20303a'); g.addColorStop(0.35, iris); g.addColorStop(0.8, iris); g.addColorStop(1, '#2a3a44');
    c.fillStyle = g; c.beginPath(); c.ellipse(cx, cy, 10, 20, 0, 0, 7); c.fill();
    c.fillStyle = '#050505'; c.beginPath(); c.ellipse(cx, cy, 4, 8, 0, 0, 7); c.fill();
    c.fillStyle = 'rgba(255,255,255,0.9)'; c.beginPath(); c.ellipse(cx - 3, cy - 6, 1.6, 3, 0, 0, 7); c.fill();
  });
  irisCache.set(iris, t);
  return t;
}

/**
 * Create an animated instance. Returns { root, mats, bones, extras }.
 * `bones` is a name -> THREE.Bone map for the animation code.
 */
export function instantiate(name) {
  const meta = loaded.get(name);
  const root = new THREE.Group();
  const M = new MaterialSet();
  // skeleton
  const bones = {}, rest = {};
  for (const b of meta.bones) {
    const bone = new THREE.Bone(); bone.name = b.name;
    const parent = b.parent ? meta.bones.find(p => p.name === b.parent) : null;
    bone.position.set(b.pos[0] - (parent ? parent.pos[0] : 0), b.pos[1] - (parent ? parent.pos[1] : 0), b.pos[2] - (parent ? parent.pos[2] : 0));
    bones[b.name] = bone; rest[b.name] = b.pos;
    if (parent) bones[b.parent].add(bone);
  }
  const rootBone = bones[meta.bones[0].name];
  root.add(rootBone);
  root.updateMatrixWorld(true);
  const skeleton = new THREE.Skeleton(meta.bones.map(b => bones[b.name]));
  // full-detail meshes up close, the coarse copy (lod 1) further away; both share the skeleton
  const levels = [new THREE.Group(), new THREE.Group()];
  const mats = new Map();
  let size = 0;
  for (const m of meta.meshes) {
    if (!mats.has(m.material)) {
      const mat = new THREE.MeshPhongMaterial({ vertexColors: true, ...(MATERIALS[m.material] || MATERIALS.skin) });
      const tex = m.geo.attributes.uv ? paintedFor(name, m.material, m.lookup) : null;
      if (tex) mat.map = tex;
      M.adopt(mat);
      mats.set(m.material, mat);
    }
    const mesh = new THREE.SkinnedMesh(m.geo, mats.get(m.material));
    mesh.bind(skeleton);
    levels[m.lod].add(mesh);
    if (!m.lod) size = Math.max(size, m.size);
  }
  if (levels[1].children.length) {
    const lod = new THREE.LOD();
    lod.addLevel(levels[0], 0);
    lod.addLevel(levels[1], Math.max(6, size * LOD_DISTANCE));
    root.add(lod);
  } else root.add(levels[0]);
  // attachments (eyes, teeth, claws, horns, guns, glows) ride on bones
  const extras = { glows: [], muzzles: [] };
  const local = (bone, p) => new THREE.Vector3(p[0] - rest[bone][0], p[1] - rest[bone][1], p[2] - rest[bone][2]);
  const matCache = new Map();
  const matFor = (key, make) => { if (!matCache.has(key)) { const m = make(); matCache.set(key, m); M.adopt(m, !!m.userData.glow); } return matCache.get(key); };
  for (const a of meta.attachments) {
    const bone = bones[a.bone];
    let obj = null;
    if (a.kind === 'eye') {
      obj = new THREE.Mesh(new THREE.SphereGeometry(a.r, 20, 14), matFor('eye' + a.iris, () => new THREE.MeshPhongMaterial({ map: eyeTexture(a.iris), shininess: 120, specular: 0x777777 })));
    } else if (a.kind === 'glowEye') {
      obj = ball(a.r, matFor('ge' + a.color, () => { const m = new THREE.MeshBasicMaterial({ color: a.color }); m.userData.glow = true; return m; }), 1);
    } else if (a.kind === 'cone') {
      obj = cone(a.r, a.h, matFor('c' + a.color, () => new THREE.MeshPhongMaterial({ color: a.color, shininess: 60, specular: 0x333333, vertexColors: true })), 6);
      if (a.rot) obj.rotation.set(...a.rot);
    } else if (a.kind === 'box') {
      obj = box(a.size[0], a.size[1], a.size[2], matFor('b' + a.color, () => new THREE.MeshPhongMaterial({ color: a.color, shininess: 50, specular: 0x333333, vertexColors: true })), 'center');
      if (a.rot) obj.rotation.set(...a.rot);
    } else if (a.kind === 'glowBox') {
      obj = box(a.size[0], a.size[1], a.size[2], matFor('gb' + a.color, () => { const m = new THREE.MeshBasicMaterial({ color: a.color }); m.userData.glow = true; return m; }), 'center');
      if (a.rot) obj.rotation.set(...a.rot);
    } else if (a.kind === 'cyl') {
      obj = new THREE.Mesh(new THREE.CylinderGeometry(a.r, a.r2 ?? a.r, a.h, 12), matFor('cy' + a.color, () => new THREE.MeshPhongMaterial({ color: a.color, shininess: 60, specular: 0x444444 })));
      if (a.rot) obj.rotation.set(...a.rot);
    } else if (a.kind === 'gun') {
      // held gun: the barrel runs down the forearm (-y) so it points ahead when the arm is raised
      const [w, len, h] = a.size;
      const dark = matFor('gun', () => new THREE.MeshPhongMaterial({ color: 0x2a2c30, shininess: 80, specular: 0x555555, vertexColors: true }));
      const metal = matFor('gunMetal', () => new THREE.MeshPhongMaterial({ color: 0x55585e, shininess: 110, specular: 0x888888, vertexColors: true }));
      obj = new THREE.Group();
      const add = (m, x, y, z) => { m.position.set(x, y, z); obj.add(m); return m; };
      add(box(w, len * 0.62, h, dark, 'center'), 0, len * 0.09, 0);                      // receiver
      add(box(w * 0.7, len * 0.14, h * 0.9, dark, 'center'), 0, len * 0.45, -h * 0.1);   // stock
      add(box(w * 0.8, len * 0.12, h * 0.9, dark, 'center'), 0, -len * 0.05, -h * 0.85); // magazine
      add(box(w * 0.5, len * 0.3, h * 0.25, metal, 'center'), 0, -len * 0.05, h * 0.6);  // top rail / sight
      add(cyl(h * 0.16, h * 0.16, len * 0.32, metal, 10), 0, -len * 0.37, h * 0.12);         // barrel
      const fl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffc040, blending: THREE.AdditiveBlending, depthWrite: false }));
      fl.scale.setScalar(0.4); fl.position.set(0, -len * 0.55 - 0.04, h * 0.12); fl.visible = false; obj.add(fl);
      extras.muzzles.push(fl);
    } else if (a.kind === 'glow' || a.kind === 'muzzle') {
      obj = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: a.color, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      obj.scale.setScalar(a.size);
      obj.visible = a.kind === 'glow' && !a.hidden;
      (a.kind === 'muzzle' ? extras.muzzles : extras.glows).push(Object.assign(obj, { tag: a.tag }));
    }
    if (!obj) continue;
    obj.position.copy(local(a.bone, a.pos));
    if (a.scale) obj.scale.set(...a.scale);
    bone.add(obj);
  }
  for (const b of Object.values(bones)) mergeStatic(b);
  return { root, mats: M, bones, extras, meta };
}
