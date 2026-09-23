// Signed-distance "sculpting" toolkit used to build organic character models.
// A model is a list of parts (ellipsoids, tapered limbs, rounded boxes...)
// blended together smoothly, then turned into a mesh by surfacenets.mjs.

export const V = (x, y, z) => ({ x, y, z });

// ---------------------------------------------------------------- noise
function hash(i, j, k) {
  let h = (i * 374761393 + j * 668265263 + k * 1274126177) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function vnoise(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const l = (a, b, t) => a + (b - a) * t;
  const c = (i, j, k) => hash(xi + i, yi + j, zi + k);
  return l(l(l(c(0, 0, 0), c(1, 0, 0), u), l(c(0, 1, 0), c(1, 1, 0), u), v),
    l(l(c(0, 0, 1), c(1, 0, 1), u), l(c(0, 1, 1), c(1, 1, 1), u), v), w) * 2 - 1;
}
// Each octave is sampled in a rotated frame so the grid of the value noise
// never shows up as straight, axis-aligned lines on the skin.
const ROT = [0.62, -0.55, 0.56, 0.78, 0.47, -0.41, -0.04, 0.69, 0.72];
const rot = (x, y, z) => [ROT[0] * x + ROT[1] * y + ROT[2] * z, ROT[3] * x + ROT[4] * y + ROT[5] * z, ROT[6] * x + ROT[7] * y + ROT[8] * z];
export function fbm(x, y, z, oct = 3) {
  let a = 0.5, s = 0;
  for (let i = 0; i < oct; i++) { [x, y, z] = rot(x, y, z); s += a * vnoise(x, y, z); x *= 2.03; y *= 2.03; z *= 2.03; a *= 0.5; }
  return s;
}
export function ridged(x, y, z) { [x, y, z] = rot(x, y, z); return 1 - Math.abs(vnoise(x, y, z)); }
/** Branching vein network: thin, wandering lines that fade in and out (0..1). */
export function veins(x, y, z, scale) {
  const w = 0.55 / scale;          // domain warp makes the lines meander
  const X = x + fbm(x * scale * 0.7 + 3.1, y * scale * 0.7, z * scale * 0.7, 2) * w * 2;
  const Y = y + fbm(x * scale * 0.7, y * scale * 0.7 + 7.7, z * scale * 0.7, 2) * w * 2;
  const Z = z + fbm(x * scale * 0.7, y * scale * 0.7, z * scale * 0.7 + 1.9, 2) * w * 2;
  const big = smooth01(0.93, 0.99, ridged(X * scale, Y * scale, Z * scale));
  const small = smooth01(0.94, 0.99, ridged(X * scale * 2.3 + 5, Y * scale * 2.3, Z * scale * 2.3)) * 0.55;
  const fade = smooth01(-0.25, 0.25, fbm(x * scale * 0.35 + 11, y * scale * 0.35, z * scale * 0.35, 2));
  return Math.min(1, Math.max(big, small * fade) * (0.45 + 0.55 * fade));
}
function smooth01(a, b, t) { t = Math.min(1, Math.max(0, (t - a) / (b - a))); return t * t * (3 - 2 * t); }

// ---------------------------------------------------------------- rotation helpers
function rotMatrix(rx = 0, ry = 0, rz = 0) {
  const cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry), cz = Math.cos(rz), sz = Math.sin(rz);
  // R = Rz * Ry * Rx ; we need the inverse (transpose) to go world -> local
  const m = [
    cy * cz, cz * sy * sx - sz * cx, cz * sy * cx + sz * sx,
    cy * sz, sz * sy * sx + cz * cx, sz * sy * cx - cz * sx,
    -sy, cy * sx, cy * cx,
  ];
  return [m[0], m[3], m[6], m[1], m[4], m[7], m[2], m[5], m[8]]; // transpose
}

// ---------------------------------------------------------------- primitives
// Every primitive: { d(x,y,z) -> distance, min:[x,y,z], max:[x,y,z] }
export function ellipsoid(c, r, rot) {
  const R = rot ? rotMatrix(...rot) : null;
  const e = Math.max(r.x, r.y, r.z);
  return {
    min: [c.x - e, c.y - e, c.z - e], max: [c.x + e, c.y + e, c.z + e],
    d(x, y, z) {
      let px = x - c.x, py = y - c.y, pz = z - c.z;
      if (R) { const a = R[0] * px + R[1] * py + R[2] * pz, b = R[3] * px + R[4] * py + R[5] * pz, d = R[6] * px + R[7] * py + R[8] * pz; px = a; py = b; pz = d; }
      const k0 = Math.sqrt((px / r.x) ** 2 + (py / r.y) ** 2 + (pz / r.z) ** 2);
      const k1 = Math.sqrt((px / (r.x * r.x)) ** 2 + (py / (r.y * r.y)) ** 2 + (pz / (r.z * r.z)) ** 2);
      return k1 < 1e-9 ? -Math.min(r.x, r.y, r.z) : k0 * (k0 - 1) / k1;
    },
  };
}
export const sphere = (c, r) => ({
  min: [c.x - r, c.y - r, c.z - r], max: [c.x + r, c.y + r, c.z + r],
  d: (x, y, z) => Math.hypot(x - c.x, y - c.y, z - c.z) - r,
});
/** Tapered limb from a (radius r1) to b (radius r2). */
export function limb(a, b, r1, r2 = r1) {
  const bax = b.x - a.x, bay = b.y - a.y, baz = b.z - a.z;
  const l2 = bax * bax + bay * bay + baz * baz, rr = r1 - r2, a2 = l2 - rr * rr, il2 = 1 / l2;
  const m = Math.max(r1, r2);
  return {
    min: [Math.min(a.x, b.x) - m, Math.min(a.y, b.y) - m, Math.min(a.z, b.z) - m],
    max: [Math.max(a.x, b.x) + m, Math.max(a.y, b.y) + m, Math.max(a.z, b.z) + m],
    d(x, y, z) {
      const pax = x - a.x, pay = y - a.y, paz = z - a.z;
      const yy = pax * bax + pay * bay + paz * baz, zz = yy - l2;
      const qx = pax * l2 - bax * yy, qy = pay * l2 - bay * yy, qz = paz * l2 - baz * yy;
      const x2 = qx * qx + qy * qy + qz * qz, y2 = yy * yy * l2, z2 = zz * zz * l2;
      const k = Math.sign(rr) * rr * rr * x2;
      if (Math.sign(zz) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2;
      if (Math.sign(yy) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1;
      return (Math.sqrt(x2 * a2 * il2) + yy * rr) * il2 - r1;
    },
  };
}
/** Rounded box: half-size b, corner radius r, optional rotation. */
export function rbox(c, b, r, rot) {
  const R = rot ? rotMatrix(...rot) : null;
  const e = Math.hypot(b.x, b.y, b.z);
  return {
    min: [c.x - e, c.y - e, c.z - e], max: [c.x + e, c.y + e, c.z + e],
    d(x, y, z) {
      let px = x - c.x, py = y - c.y, pz = z - c.z;
      if (R) { const a = R[0] * px + R[1] * py + R[2] * pz, bb = R[3] * px + R[4] * py + R[5] * pz, d = R[6] * px + R[7] * py + R[8] * pz; px = a; py = bb; pz = d; }
      const qx = Math.abs(px) - b.x + r, qy = Math.abs(py) - b.y + r, qz = Math.abs(pz) - b.z + r;
      return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - r;
    },
  };
}
/** A chain of tapered limbs through points (smooth curves: hair, tentacles, tails, horns). */
export function chain(points, radii) {
  const segs = [];
  for (let i = 0; i < points.length - 1; i++) segs.push(limb(points[i], points[i + 1], radii[i], radii[i + 1]));
  return {
    min: [0, 1, 2].map(k => Math.min(...segs.map(s => s.min[k]))),
    max: [0, 1, 2].map(k => Math.max(...segs.map(s => s.max[k]))),
    d(x, y, z) { let d = 1e9; for (const s of segs) d = Math.min(d, s.d(x, y, z)); return d; },
    segs,
  };
}

export function smin(a, b, k) {
  if (k <= 0) return Math.min(a, b);
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}
export function smax(a, b, k) { return -smin(-a, -b, k); }
