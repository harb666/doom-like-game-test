// Monster navigation: a "flow field" that stores, for every map square,
// how many steps it is from the player. Monsters simply walk downhill.
// One cheap breadth-first search serves every monster at once.

import { CELL } from '../config.js';

const STEP = 0.8;
const MAX_DIST = 80;

export class FlowField {
  constructor(level) {
    this.level = level;
    this.dist = new Int16Array(level.w * level.h).fill(-1);
    this.queue = new Int32Array(level.w * level.h);
    this.originIdx = -1;
    this.timer = 0;
  }

  /** Can a monster walk from square a into neighbouring square b? */
  passable(a, b) {
    if (b.solid) return false;
    if (b.door && (b.door.key || b.door.secret) && b.door.open < 1) return false;
    const L = this.level;
    if (L.floorOf(b) - L.floorOf(a) > STEP) return false;
    if (b.ceil - L.floorOf(b) < 1.2) return false;
    return true;
  }

  update(dt, px, pz, force = false) {
    this.timer -= dt;
    const L = this.level;
    const cx = Math.floor(px / CELL), cz = Math.floor(pz / CELL);
    const idx = cz * L.w + cx;
    if (!force && idx === this.originIdx && this.timer > 0) return;
    this.timer = 0.5;
    this.originIdx = idx;
    const dist = this.dist, q = this.queue, W = L.w;
    dist.fill(-1);
    if (cx < 0 || cz < 0 || cx >= L.w || cz >= L.h) return;
    let head = 0, tail = 0;
    dist[idx] = 0; q[tail++] = idx;
    while (head < tail) {
      const i = q[head++];
      const d = dist[i];
      if (d >= MAX_DIST) continue;
      const x = i % W, z = (i / W) | 0;
      const here = L.cells[i];
      // expand to neighbours that could walk INTO this square
      for (let k = 0; k < 4; k++) {
        const nx = x + (k === 0 ? 1 : k === 1 ? -1 : 0), nz = z + (k === 2 ? 1 : k === 3 ? -1 : 0);
        if (nx < 0 || nz < 0 || nx >= L.w || nz >= L.h) continue;
        const j = nz * W + nx;
        if (dist[j] !== -1) continue;
        const n = L.cells[j];
        if (n.solid) continue;
        if (!this.passable(n, here)) continue;
        dist[j] = d + 1;
        q[tail++] = j;
      }
    }
  }

  distAt(x, z) {
    const L = this.level;
    const cx = Math.floor(x / CELL), cz = Math.floor(z / CELL);
    if (cx < 0 || cz < 0 || cx >= L.w || cz >= L.h) return -1;
    return this.dist[cz * L.w + cx];
  }

  /** World position of the next square to walk to (or null if unreachable). */
  nextStep(x, z) {
    const L = this.level, W = L.w;
    const cx = Math.floor(x / CELL), cz = Math.floor(z / CELL);
    const i = cz * W + cx;
    const d = this.dist[i];
    if (d <= 0) return null;
    const here = L.cells[i];
    let best = -1, bestD = d;
    // prefer straight moves, allow diagonals when both sides are open
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
    for (const [dx, dz] of dirs) {
      const nx = cx + dx, nz = cz + dz;
      if (nx < 0 || nz < 0 || nx >= L.w || nz >= L.h) continue;
      const j = nz * W + nx;
      const nd = this.dist[j];
      if (nd < 0 || nd >= bestD) continue;
      if (dx && dz) {
        const a = L.cells[cz * W + nx], b = L.cells[nz * W + cx];
        if (!this.passable(here, a) || !this.passable(here, b)) continue;
      }
      if (!this.passable(here, L.cells[j])) continue;
      best = j; bestD = nd;
    }
    if (best < 0) return null;
    return { x: (best % W + 0.5) * CELL, z: (((best / W) | 0) + 0.5) * CELL, cell: L.cells[best] };
  }
}
