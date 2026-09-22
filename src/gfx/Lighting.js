// Quake-style baked lighting. Before a level starts we work out how much
// coloured light reaches every corner of every wall, floor and ceiling from
// the level's light sources (ceiling panels, lamps, lava, slime, the sky...),
// including shadows. The result is stored as vertex colours, so it costs
// nothing while playing.

import { CELL } from '../config.js';
import { traceLine } from '../world/Collision.js';

const tr = {};

export class LightBaker {
  constructor(level) {
    this.level = level;
    this.lights = [];
    this.cache = new Map();
    this.collect();
    this.bucket();
  }

  add(x, y, z, color, intensity, radius) { this.lights.push({ x, y, z, c: color, i: intensity, r: radius }); }

  collect() {
    const L = this.level, C = CELL;
    for (const c of L.cells) {
      if (c.solid) continue;
      const x = (c.cx + 0.5) * C, z = (c.cz + 0.5) * C;
      if (c.ceilTex === 'ceil_light' && !c.sky) this.add(x, c.ceil - 0.3, z, [1, 0.93, 0.8], 0.75, 9);
      if (c.floorTex === 'exit') this.add(x, c.floor + 0.6, z, [0.3, 1, 0.5], 1.0, 5.5);
      if (c.floorTex === 'slime' && (c.cx + c.cz) % 2 === 0) this.add(x, c.floor + 0.7, z, [0.3, 1, 0.2], 0.9, 6.5);
      if (c.floorTex === 'lava' && (c.cx + c.cz) % 2 === 0) this.add(x, c.floor + 0.7, z, [1, 0.42, 0.1], 1.4, 7.5);
      if (c.lamp) this.add(x, c.floor + (c.lamp.y ?? 2), z, c.lamp.color, c.lamp.i ?? 1, c.lamp.r ?? 7);
    }
    for (const t of L.things) {
      if (t.kind !== 'decor') continue;
      const f = L.floorAt(t.x, t.z);
      if (t.type === 'lamp') this.add(t.x, f + 1.95, t.z, [1, 0.9, 0.7], 1.35, 9);
      if (t.type === 'brazier') this.add(t.x, f + 1.3, t.z, [1, 0.5, 0.18], 1.3, 8);
    }
  }

  bucket() {
    const L = this.level;
    this.grid = new Map();
    for (const l of this.lights) {
      const r = Math.ceil(l.r / CELL);
      const cx = Math.floor(l.x / CELL), cz = Math.floor(l.z / CELL);
      for (let z = cz - r; z <= cz + r; z++) for (let x = cx - r; x <= cx + r; x++) {
        if (x < 0 || z < 0 || x >= L.w || z >= L.h) continue;
        const k = z * L.w + x;
        let a = this.grid.get(k);
        if (!a) this.grid.set(k, a = []);
        a.push(l);
      }
    }
  }

  /** Ambient (unlit) colour for a map square. */
  ambient(cell) {
    const b = cell.light ?? 0.7;
    const a = 0.06 + 0.42 * b * b;
    const t = cell.tint || [1, 1, 1];
    const out = [a * t[0], a * t[1], a * t[2]];
    if (cell.sky) { out[0] += 0.26; out[1] += 0.13; out[2] += 0.1; }
    return out;
  }

  /** Light arriving at a point on a surface with normal (nx, ny, nz). */
  at(x, y, z, nx, ny, nz, cell) {
    const key = `${x.toFixed(2)},${y.toFixed(2)},${z.toFixed(2)},${nx},${ny},${nz}`;
    const hit = this.cache.get(key);
    if (hit) return hit;
    const col = this.ambient(cell);
    // start the shadow ray just off the surface, nudged into the square
    const cxm = (cell.cx + 0.5) * CELL, czm = (cell.cz + 0.5) * CELL;
    const px = x + nx * 0.06 + (cxm - x) * 0.01, py = y + ny * 0.06, pz = z + nz * 0.06 + (czm - z) * 0.01;
    const L = this.level;
    const list = this.grid.get(cell.cz * L.w + cell.cx) || [];
    for (const l of list) {
      const dx = l.x - px, dy = l.y - py, dz = l.z - pz;
      const d = Math.hypot(dx, dy, dz);
      if (d >= l.r) continue;
      const ndl = (dx * nx + dy * ny + dz * nz) / (d || 1);
      if (ndl <= -0.05) continue;
      if (d > 0.4 && !traceLine(L, px, py, pz, l.x, l.y, l.z, tr).clear) continue;
      const fall = (1 - d / l.r) * (1 - d / l.r);
      const k = l.i * fall * (0.3 + 0.7 * Math.max(0, ndl));
      col[0] += l.c[0] * k; col[1] += l.c[1] * k; col[2] += l.c[2] * k;
    }
    for (let i = 0; i < 3; i++) col[i] = Math.min(1.5, col[i]);
    this.cache.set(key, col);
    return col;
  }
}
