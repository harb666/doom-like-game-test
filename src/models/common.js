// Shared helpers for building low-poly 3D models (Quake 2 style) out of
// simple shapes: boxes, cylinders, spheres and cones, with gritty textures.

import * as THREE from 'three';

let grain = null;
/** A subtle noisy texture so flat colours look like worn skin / metal / cloth. */
export function grainTexture() {
  if (grain) return grain;
  const N = 64, cv = document.createElement('canvas'); cv.width = cv.height = N;
  const ctx = cv.getContext('2d'), img = ctx.createImageData(N, N);
  let s = 12345;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  for (let i = 0; i < N * N; i++) {
    const v = 200 + rnd() * 55 - (rnd() < 0.05 ? 60 : 0);
    img.data[i * 4] = img.data[i * 4 + 1] = img.data[i * 4 + 2] = v; img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  grain = new THREE.CanvasTexture(cv);
  grain.wrapS = grain.wrapT = THREE.RepeatWrapping;
  grain.colorSpace = THREE.SRGBColorSpace;
  return grain;
}

/** Canvas texture helper: draw(ctx, w, h) paints it. */
export function paintedTexture(w, h, draw) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.LinearFilter;
  return t;
}

/**
 * Keeps every material of one model so the whole model can be lit by the
 * level's light at its position, and flashed when hit.
 */
export class MaterialSet {
  constructor() { this.list = []; this.lightKey = ''; }
  make(color, opts = {}) {
    const m = new THREE.MeshLambertMaterial({
      color, map: opts.map === undefined ? grainTexture() : opts.map, flatShading: opts.flat !== false, vertexColors: true,
      transparent: !!opts.transparent, opacity: opts.opacity ?? 1, side: opts.side ?? THREE.FrontSide,
    });
    if (opts.glow) { m.emissive = new THREE.Color(opts.glow); m.emissiveIntensity = opts.glowIntensity ?? 1; }
    m.userData.base = new THREE.Color(color);
    m.userData.glow = !!opts.glow;
    this.list.push(m);
    return m;
  }
  /** Multiply every base colour by the light colour (r, g, b). */
  setLight(r, g, b) {
    const key = `${r.toFixed(2)}${g.toFixed(2)}${b.toFixed(2)}`;
    if (key === this.lightKey) return;
    this.lightKey = key;
    for (const m of this.list) m.color.setRGB(m.userData.base.r * r, m.userData.base.g * g, m.userData.base.b * b);
  }
  flash(on, color = 0xff2a10) {
    if (this.flashing === on) return;
    this.flashing = on;
    for (const m of this.list) {
      if (m.userData.glow) continue;
      if (on) { m.emissive.set(color); m.emissiveIntensity = 0.7; } else { m.emissive.set(0x000000); m.emissiveIntensity = 1; }
    }
  }
  dispose() { for (const m of this.list) m.dispose(); }
}

// Geometry caches (shared between every model that uses the same shape).
const geoCache = new Map();
function cached(key, make) { let g = geoCache.get(key); if (!g) { g = shade(make()); geoCache.set(key, g); } return g; }

/**
 * Bake simple "key light from above-front" shading into a shape's vertex
 * colours, so models look solid and 3D whatever lights are around them.
 */
export function shade(geo) {
  const n = geo.attributes.normal, cols = new Float32Array(n.count * 3);
  for (let i = 0; i < n.count; i++) {
    const v = 0.62 + 0.38 * (0.7 * n.getY(i) + 0.35 * n.getZ(i) + 0.2 * n.getX(i));
    const c = Math.max(0.28, Math.min(1.15, v));
    cols[i * 3] = cols[i * 3 + 1] = cols[i * 3 + 2] = c;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  return geo;
}

/** A box whose origin is at its TOP centre (so it hangs from a joint), or centred. */
export function box(w, h, d, mat, anchor = 'top') {
  const g = cached(`b${w},${h},${d},${anchor}`, () => {
    const geo = new THREE.BoxGeometry(w, h, d);
    if (anchor === 'top') geo.translate(0, -h / 2, 0);
    else if (anchor === 'bottom') geo.translate(0, h / 2, 0);
    return geo;
  });
  return new THREE.Mesh(g, mat);
}
export function cyl(rTop, rBot, h, mat, seg = 8, anchor = 'center', open = false) {
  const g = cached(`c${rTop},${rBot},${h},${seg},${anchor},${open}`, () => {
    const geo = new THREE.CylinderGeometry(rTop, rBot, h, seg, 1, open);
    if (anchor === 'top') geo.translate(0, -h / 2, 0);
    else if (anchor === 'bottom') geo.translate(0, h / 2, 0);
    return geo;
  });
  return new THREE.Mesh(g, mat);
}
export function ball(r, mat, detail = 1) {
  return new THREE.Mesh(cached(`s${r},${detail}`, () => new THREE.IcosahedronGeometry(r, detail)), mat);
}
export function cone(r, h, mat, seg = 6) {
  return new THREE.Mesh(cached(`k${r},${h},${seg}`, () => new THREE.ConeGeometry(r, h, seg)), mat);
}
export function torus(r, tube, mat) {
  return new THREE.Mesh(cached(`t${r},${tube}`, () => new THREE.TorusGeometry(r, tube, 6, 14)), mat);
}

/** An empty joint positioned at (x, y, z) inside `parent`. */
export function joint(parent, x = 0, y = 0, z = 0) {
  const j = new THREE.Group();
  j.position.set(x, y, z);
  parent.add(j);
  return j;
}

/** Place a mesh inside a parent at a position (and optional rotation). */
export function put(parent, mesh, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  mesh.position.set(x, y, z);
  mesh.rotation.set(rx, ry, rz);
  parent.add(mesh);
  return mesh;
}
