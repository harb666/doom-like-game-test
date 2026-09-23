// Turns a sculpted model spec (see specs/*.mjs) into a high-poly, skinned,
// vertex-coloured mesh with baked ambient occlusion, and saves it as a compact
// binary file the game loads (assets/models/<name>.bin).
//
//   node tools/modelgen/build.mjs            -> builds every model
//   node tools/modelgen/build.mjs ally husk  -> builds just those

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { smin, smax } from './sdf.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(HERE, '../../assets/models');

// ---------------------------------------------------------------- field
function makeField(spec, pieceName) {
  const all = spec.parts.filter(p => (p.piece || 'body') === pieceName || (p.alsoIn || []).includes(pieceName));
  const parts = all.filter(p => !p.after), post = all.filter(p => p.after);
  const subs = (spec.subs || []).filter(s => !s.pieces || s.pieces.includes(pieceName));
  const piece = spec.pieces.find(p => p.name === pieceName);
  const inflate = piece.inflate || 0;
  for (const p of [...all, ...subs]) {
    const m = (p.blend || 0) + (p.noise ? p.noise.amp * 1.5 : 0) + 0.01;
    p._min = p.shape.min.map(v => v - m); p._max = p.shape.max.map(v => v + m);
  }
  const partD = (p, x, y, z) => {
    let d = p.shape.d(x, y, z);
    if (p.noise) d -= p.noise.fn(x, y, z) * p.noise.amp;
    if (p.grow) d -= p.grow;
    return d;
  };
  const inBox = (p, x, y, z) => x >= p._min[0] && x <= p._max[0] && y >= p._min[1] && y <= p._max[1] && z >= p._min[2] && z <= p._max[2];
  function d(x, y, z) {
    let v = 1e3;
    for (const p of parts) {
      if (!inBox(p, x, y, z)) continue;
      v = smin(v, partD(p, x, y, z), p.blend ?? 0.02);
    }
    for (const s of subs) {
      if (!inBox(s, x, y, z)) continue;
      v = smax(v, -s.shape.d(x, y, z), s.blend ?? 0.01);
    }
    // details added after carving (eyelids inside eye sockets, etc.)
    for (const p of post) {
      if (!inBox(p, x, y, z)) continue;
      v = smin(v, partD(p, x, y, z), p.blend ?? 0.004);
    }
    if (piece.clip) {
      const c = piece.clip;
      // keep only inside the clip box (soft edge hidden inside other pieces)
      const out = Math.max(c.min[0] - x, x - c.max[0], c.min[1] - y, y - c.max[1], c.min[2] - z, z - c.max[2]);
      v = Math.max(v, out);
    }
    return v - inflate;
  }
  function partsAt(x, y, z) {
    const out = [];
    for (const p of all) { if (inBox(p, x, y, z)) out.push([p, partD(p, x, y, z)]); }
    return out;
  }
  const min = [0, 1, 2].map(k => Math.min(...all.map(p => p._min[k])));
  const max = [0, 1, 2].map(k => Math.max(...all.map(p => p._max[k])));
  if (piece.clip) for (let k = 0; k < 3; k++) { min[k] = Math.max(min[k], piece.clip.min[k] - 0.02); max[k] = Math.min(max[k], piece.clip.max[k] + 0.02); }
  return { d, partsAt, min, max, parts: all };
}

// ---------------------------------------------------------------- surface nets
function surfaceNets(field, h) {
  const [x0, y0, z0] = field.min.map(v => v - h * 2);
  const nx = Math.ceil((field.max[0] - x0) / h) + 3, ny = Math.ceil((field.max[1] - y0) / h) + 3, nz = Math.ceil((field.max[2] - z0) / h) + 3;
  const F = new Float32Array(nx * ny * nz);
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++)
    F[i + nx * (j + ny * k)] = field.d(x0 + i * h, y0 + j * h, z0 + k * h);
  const at = (i, j, k) => F[i + nx * (j + ny * k)];
  const cellIndex = new Int32Array((nx - 1) * (ny - 1) * (nz - 1)).fill(-1);
  const pos = [];
  const corners = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
  const edges = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const cv = new Float32Array(8);
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    let neg = 0;
    for (let c = 0; c < 8; c++) { cv[c] = at(i + corners[c][0], j + corners[c][1], k + corners[c][2]); if (cv[c] < 0) neg++; }
    if (neg === 0 || neg === 8) continue;
    let sx = 0, sy = 0, sz = 0, n = 0;
    for (const [a, b] of edges) {
      if ((cv[a] < 0) === (cv[b] < 0)) continue;
      const t = cv[a] / (cv[a] - cv[b]);
      sx += corners[a][0] + (corners[b][0] - corners[a][0]) * t;
      sy += corners[a][1] + (corners[b][1] - corners[a][1]) * t;
      sz += corners[a][2] + (corners[b][2] - corners[a][2]) * t;
      n++;
    }
    cellIndex[i + (nx - 1) * (j + (ny - 1) * k)] = pos.length / 3;
    pos.push(x0 + (i + sx / n) * h, y0 + (j + sy / n) * h, z0 + (k + sz / n) * h);
  }
  const ci = (i, j, k) => cellIndex[i + (nx - 1) * (j + (ny - 1) * k)];
  const quads = [];
  for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
    const v0 = at(i, j, k) < 0;
    if (v0 !== (at(i + 1, j, k) < 0)) quads.push([ci(i, j - 1, k - 1), ci(i, j, k - 1), ci(i, j, k), ci(i, j - 1, k)]);
    if (v0 !== (at(i, j + 1, k) < 0)) quads.push([ci(i - 1, j, k - 1), ci(i, j, k - 1), ci(i, j, k), ci(i - 1, j, k)]);
    if (v0 !== (at(i, j, k + 1) < 0)) quads.push([ci(i - 1, j - 1, k), ci(i, j - 1, k), ci(i, j, k), ci(i - 1, j, k)]);
  }
  return { pos, quads: quads.filter(q => q.every(v => v >= 0)) };
}

function grad(d, x, y, z, e = 0.0015) {
  const gx = d(x + e, y, z) - d(x - e, y, z), gy = d(x, y + e, z) - d(x, y - e, z), gz = d(x, y, z + e) - d(x, y, z - e);
  const l = Math.hypot(gx, gy, gz) || 1;
  return [gx / l, gy / l, gz / l];
}

// ---------------------------------------------------------------- texture coordinates
/** Cylinder wrapped around a vertical axis: u = angle around (front = 0.5), v = height. */
export function projectUV(P, x, y, z) {
  return [0.5 + Math.atan2(x - P.cx, z - P.cz) / (Math.PI * 2), (y - P.y0) / (P.y1 - P.y0)];
}
/** For a grid of (x, y) points seen from the front, find the surface and its (u, v). */
function uvGrid(field, P, G) {
  const out = [];
  for (let y = G.y0; y <= G.y1 + 1e-9; y += G.step) {
    const row = [];
    for (let x = G.x0; x <= G.x1 + 1e-9; x += G.step) {
      let z = G.zFront, hit = false;
      for (let i = 0; i < 800 && z > G.zBack; i++) { const d = field.d(x, y, z); if (d < 0.0004) { hit = true; break; } z -= Math.min(0.004, Math.max(0.0003, d * 0.9)); }
      const t = projectUV(P, x, y, hit ? z : G.zBack);
      row.push([+t[0].toFixed(5), +t[1].toFixed(5)]);
    }
    out.push(row);
  }
  return { ...G, rows: out };
}

// ---------------------------------------------------------------- one piece
function buildPiece(spec, piece, boneIndex) {
  const field = makeField(spec, piece.name);
  const h = piece.voxel;
  const { pos, quads } = surfaceNets(field, h);
  const nV = pos.length / 3;
  // snap each vertex exactly onto the sculpted surface
  for (let v = 0; v < nV; v++) {
    let x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2];
    for (let it = 0; it < 3; it++) {
      const dd = field.d(x, y, z);
      const g = grad(field.d, x, y, z);
      const s = Math.max(-h, Math.min(h, dd));
      x -= g[0] * s; y -= g[1] * s; z -= g[2] * s;
    }
    pos[v * 3] = x; pos[v * 3 + 1] = y; pos[v * 3 + 2] = z;
  }
  const nrm = new Float32Array(nV * 3), col = new Float32Array(nV * 3), sIdx = new Uint8Array(nV * 4), sW = new Uint8Array(nV * 4);
  const uv = piece.uv ? new Float32Array(nV * 2) : null;
  if (uv) for (let v = 0; v < nV; v++) { const t = projectUV(piece.uv, pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]); uv[v * 2] = t[0]; uv[v * 2 + 1] = t[1]; }
  for (let v = 0; v < nV; v++) {
    const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2];
    const n = grad(field.d, x, y, z, h * 0.35);
    nrm.set(n, v * 3);
    const near = field.partsAt(x, y, z).sort((a, b) => a[1] - b[1]);
    // colour: blend the two nearest parts
    let c = [0.5, 0.5, 0.5];
    if (near.length) {
      const [p0, d0] = near[0];
      c = p0.colorAt(x, y, z, n);
      if (near[1]) {
        const [p1, d1] = near[1];
        const k = Math.max(0, 1 - (d1 - d0) / ((p1.blend ?? 0.02) + 0.004)) * 0.5;
        if (k > 0) { const c1 = p1.colorAt(x, y, z, n); c = c.map((ch, i) => ch * (1 - k) + c1[i] * k); }
      }
    }
    for (const dec of spec.decals || []) {
      if (dec.pieces && !dec.pieces.includes(piece.name)) continue;
      const r = dec(x, y, z, n);
      if (r) { const [dc, a] = r; c = c.map((ch, i) => ch * (1 - a) + dc[i] * a); }
    }
    // ambient occlusion from the sculpt itself: creases, armpits, sockets get darker
    let ao = 1;
    const aoK = piece.ao ?? 1;
    for (const [dist, w0] of [[0.012, 0.3], [0.03, 0.25], [0.07, 0.2], [0.15, 0.12]]) {
      const w = w0 * aoK;
      const s = spec.fullField ? spec.fullField(x + n[0] * dist, y + n[1] * dist, z + n[2] * dist) : field.d(x + n[0] * dist, y + n[1] * dist, z + n[2] * dist);
      ao -= Math.max(0, (dist - s) / dist) * w;
    }
    ao = Math.max(0.3, Math.min(1, ao));
    col[v * 3] = c[0] * ao; col[v * 3 + 1] = c[1] * ao; col[v * 3 + 2] = c[2] * ao;
    // skinning: weight bones by how close their parts are
    const byBone = new Map();
    for (const [p, dd] of near) {
      const b = p.bone;
      if (!byBone.has(b) || byBone.get(b) > dd) byBone.set(b, dd);
    }
    let list = [...byBone.entries()].sort((a, b) => a[1] - b[1]).slice(0, 2);
    if (!list.length) list = [[spec.bones[0].name, 0]];
    const soft = piece.skinSoft ?? 0.025;
    const ws = list.map(([, dd]) => Math.exp(-(dd - list[0][1]) / soft));
    const tot = ws.reduce((a, b) => a + b, 0);
    let wsum = 0;
    list.forEach(([b], i) => {
      sIdx[v * 4 + i] = boneIndex[b];
      const w = i === list.length - 1 ? 255 - wsum : Math.round(ws[i] / tot * 255);
      sW[v * 4 + i] = w; wsum += w;
    });
  }
  // triangles, oriented to face outwards
  const tris = [];
  const P = (i) => [pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]];
  for (const [a, b, c, d] of quads) {
    const pa = P(a), pb = P(b), pc = P(c), pd = P(d);
    const diag1 = Math.hypot(pa[0] - pc[0], pa[1] - pc[1], pa[2] - pc[2]), diag2 = Math.hypot(pb[0] - pd[0], pb[1] - pd[1], pb[2] - pd[2]);
    const tt = diag1 < diag2 ? [[a, b, c], [a, c, d]] : [[a, b, d], [b, c, d]];
    for (const t of tt) {
      const [p0, p1, p2] = t.map(P);
      const ux = p1[0] - p0[0], uy = p1[1] - p0[1], uz = p1[2] - p0[2], vx = p2[0] - p0[0], vy = p2[1] - p0[1], vz = p2[2] - p0[2];
      const fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx;
      const nx = nrm[t[0] * 3] + nrm[t[1] * 3] + nrm[t[2] * 3], ny = nrm[t[0] * 3 + 1] + nrm[t[1] * 3 + 1] + nrm[t[2] * 3 + 1], nz = nrm[t[0] * 3 + 2] + nrm[t[1] * 3 + 2] + nrm[t[2] * 3 + 2];
      if (fx * nx + fy * ny + fz * nz < 0) tris.push(t[0], t[2], t[1]); else tris.push(t[0], t[1], t[2]);
    }
  }
  // where named surface points ended up in texture space (for painting faces etc.)
  const lookup = piece.uv && piece.uvGrid ? uvGrid(field, piece.uv, piece.uvGrid) : null;
  return { name: piece.name, material: piece.material || 'skin', pos: new Float32Array(pos), nrm, col, sIdx, sW, tris, uv, lookup };
}

// ---------------------------------------------------------------- export
function pack(spec, pieces) {
  // merge pieces that share a material into one mesh
  const groups = new Map();
  for (const p of pieces) { const k = p.material + '|' + (p.lod || 0); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(p); }
  const chunks = [], meshes = [];
  let offset = 0;
  const add = (arr) => { const buf = Buffer.from(arr.buffer, arr.byteOffset, arr.byteLength); const pad = (4 - (buf.length % 4)) % 4; chunks.push(buf, Buffer.alloc(pad)); const o = offset; offset += buf.length + pad; return o; };
  for (const [key, list] of groups) {
    const [material, lod] = key.split('|');
    const nV = list.reduce((n, p) => n + p.pos.length / 3, 0);
    const pos = new Float32Array(nV * 3), nrm = new Int8Array(nV * 3), col = new Uint8Array(nV * 3), sIdx = new Uint8Array(nV * 4), sW = new Uint8Array(nV * 4);
    const hasUV = list.some(p => p.uv), uv = hasUV ? new Float32Array(nV * 2) : null;
    const tris = [];
    let base = 0;
    for (const p of list) {
      const n = p.pos.length / 3;
      pos.set(p.pos, base * 3);
      for (let i = 0; i < n * 3; i++) { nrm[base * 3 + i] = Math.round(p.nrm[i] * 127); col[base * 3 + i] = Math.round(Math.min(1, Math.max(0, p.col[i])) * 255); }
      sIdx.set(p.sIdx, base * 4); sW.set(p.sW, base * 4);
      if (uv && p.uv) uv.set(p.uv, base * 2);
      for (const t of p.tris) tris.push(t + base);
      base += n;
    }
    const idx = nV > 65535 ? new Uint32Array(tris) : new Uint16Array(tris);
    // positions stored as 16-bit steps inside the mesh's bounding box (well under 0.1 mm)
    const pmin = [0, 1, 2].map(k => { let v = Infinity; for (let i = k; i < pos.length; i += 3) v = Math.min(v, pos[i]); return v; });
    const pmax = [0, 1, 2].map(k => { let v = -Infinity; for (let i = k; i < pos.length; i += 3) v = Math.max(v, pos[i]); return v; });
    const pstep = pmin.map((v, k) => Math.max(1e-6, (pmax[k] - v) / 65535));
    const qpos = new Uint16Array(pos.length);
    for (let i = 0; i < pos.length; i++) qpos[i] = Math.round((pos[i] - pmin[i % 3]) / pstep[i % 3]);
    const quv = uv ? Uint16Array.from(uv, v => Math.round(Math.min(1, Math.max(0, v)) * 65535)) : null;
    meshes.push({ material, lod: +lod, vertices: nV, triangles: tris.length / 3, idx32: nV > 65535,
      pos: add(qpos), pmin, pstep, nrm: add(nrm), col: add(col), sIdx: add(sIdx), sW: add(sW), idx: add(idx), idxCount: tris.length, uv: quv ? add(quv) : null,
      lookup: list.find(p => p.lookup)?.lookup || null });
  }
  const meta = { name: spec.name, bones: spec.bones.map(b => ({ name: b.name, parent: b.parent, pos: [b.pos.x, b.pos.y, b.pos.z] })), meshes, attachments: spec.attachments || [], extra: spec.extra || {} };
  const json = Buffer.from(JSON.stringify(meta));
  const head = Buffer.alloc(8); head.writeUInt32LE(0x4d57424b, 0); head.writeUInt32LE(json.length, 4);
  const jpad = Buffer.alloc((4 - ((8 + json.length) % 4)) % 4, 32);
  return Buffer.concat([head, json, jpad, ...chunks]);
}

const LOD_SCALE = 2.4;

export async function buildModel(spec) {
  const boneIndex = Object.fromEntries(spec.bones.map((b, i) => [b.name, i]));
  for (const p of spec.parts) if (!(p.bone in boneIndex)) throw new Error(`${spec.name}: unknown bone ${p.bone}`);
  const t0 = Date.now();
  // occlusion looks at every piece together (so hair shades the face, etc.)
  const fields = spec.pieces.map(pc => makeField(spec, pc.name));
  spec.fullField = (x, y, z) => { let d = 1e3; for (const f of fields) d = Math.min(d, f.d(x, y, z)); return d; };
  const full = spec.pieces.map(pc => buildPiece(spec, pc, boneIndex));
  // a coarser copy of every piece, drawn when the model is far from the camera
  const coarse = spec.pieces.map(pc => Object.assign(buildPiece(spec, { ...pc, voxel: pc.voxel * LOD_SCALE }, boneIndex), { lod: 1 }));
  const buf = pack(spec, [...full, ...coarse]);
  const pieces = full;
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, spec.name + '.bin'), buf);
  const verts = pieces.reduce((n, p) => n + p.pos.length / 3, 0), tris = pieces.reduce((n, p) => n + p.tris.length / 3, 0);
  const lodTris = coarse.reduce((n, p) => n + p.tris.length / 3, 0);
  console.log(`${spec.name}: ${verts} vertices, ${lodTris} far triangles, ${tris} triangles, ${(buf.length / 1024).toFixed(0)} KB, ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

if (process.argv[1] && process.argv[1].endsWith('build.mjs')) {
  const { SPECS } = await import('./specs/index.mjs');
  const only = process.argv.slice(2);
  for (const [name, make] of Object.entries(SPECS)) {
    if (only.length && !only.includes(name)) continue;
    await buildModel(make());
  }
}
