// Grid-based collision: walls, doors, steps and ceilings, plus line-of-sight
// tracing used by bullets and monster eyesight.

import { CELL } from '../config.js';

/** Can a body standing at height `feet` enter this square? */
export function cellBlocks(level, cell, feet, height, step) {
  if (cell.solid) return true;
  if (cell.door && cell.door.blocks(feet, height)) return true;
  const f = level.floorOf(cell);
  if (f > feet + step) return true;
  if (cell.ceil - Math.max(f, feet) < height) return true;
  return false;
}

function blockingCells(level, ent, x, z, out) {
  const r = ent.radius - 0.001;
  const x0 = Math.floor((x - r) / CELL), x1 = Math.floor((x + r) / CELL);
  const z0 = Math.floor((z - r) / CELL), z1 = Math.floor((z + r) / CELL);
  out.length = 0;
  for (let cz = z0; cz <= z1; cz++)
    for (let cx = x0; cx <= x1; cx++) {
      const c = level.cell(cx, cz);
      if (cellBlocks(level, c, ent.y, ent.height, ent.step)) out.push(c);
    }
  return out;
}

const tmp = [];

function circleHit(ent, x, z, others) {
  for (const o of others) {
    if (o === ent || !o.solidBody) continue;
    // ignore bodies we are clearly above / below (monsters on ledges)
    if (o.y > ent.y + ent.height || ent.y > o.y + o.height) continue;
    const rr = ent.radius + o.radius;
    const dx = x - o.x, dz = z - o.z;
    const d2 = dx * dx + dz * dz;
    if (d2 < rr * rr) {
      const odx = ent.x - o.x, odz = ent.z - o.z;
      if (d2 < odx * odx + odz * odz) return o;   // only block if moving closer
    }
  }
  return null;
}

/**
 * Move a body by (dx, dz), sliding along walls.
 * ent needs: x, z, y (feet), radius, height, step.
 * Returns the door/lift square it bumped into (for auto-opening), if any.
 */
export function moveBody(level, ent, dx, dz, others = []) {
  const dist = Math.max(Math.abs(dx), Math.abs(dz));
  const steps = Math.max(1, Math.ceil(dist / 0.2));
  const sx = dx / steps, sz = dz / steps;
  let bumped = null;
  ent.blockedX = ent.blockedZ = false;
  for (let i = 0; i < steps; i++) {
    if (sx) {
      const nx = ent.x + sx;
      const bl = blockingCells(level, ent, nx, ent.z, tmp);
      if (bl.length) {
        let lim = sx > 0 ? Infinity : -Infinity;
        for (const c of bl) {
          if (c.door || c.lift) bumped = c;
          lim = sx > 0 ? Math.min(lim, c.cx * CELL - ent.radius - 0.001) : Math.max(lim, (c.cx + 1) * CELL + ent.radius + 0.001);
        }
        ent.x = sx > 0 ? Math.max(ent.x, Math.min(nx, lim)) : Math.min(ent.x, Math.max(nx, lim));
        ent.blockedX = true;
      } else if (!circleHit(ent, nx, ent.z, others)) ent.x = nx;
      else ent.blockedX = true;
    }
    if (sz) {
      const nz = ent.z + sz;
      const bl = blockingCells(level, ent, ent.x, nz, tmp);
      if (bl.length) {
        let lim = sz > 0 ? Infinity : -Infinity;
        for (const c of bl) {
          if (c.door || c.lift) bumped = c;
          lim = sz > 0 ? Math.min(lim, c.cz * CELL - ent.radius - 0.001) : Math.max(lim, (c.cz + 1) * CELL + ent.radius + 0.001);
        }
        ent.z = sz > 0 ? Math.max(ent.z, Math.min(nz, lim)) : Math.min(ent.z, Math.max(nz, lim));
        ent.blockedZ = true;
      } else if (!circleHit(ent, ent.x, nz, others)) ent.z = nz;
      else ent.blockedZ = true;
    }
  }
  return bumped;
}

/** Highest floor under a body's footprint. */
export function floorUnder(level, x, z, radius) {
  const r = radius * 0.8;
  const x0 = Math.floor((x - r) / CELL), x1 = Math.floor((x + r) / CELL);
  const z0 = Math.floor((z - r) / CELL), z1 = Math.floor((z + r) / CELL);
  let f = -Infinity;
  for (let cz = z0; cz <= z1; cz++)
    for (let cx = x0; cx <= x1; cx++) {
      const c = level.cell(cx, cz);
      if (c.solid) continue;
      f = Math.max(f, level.floorOf(c));
    }
  return f === -Infinity ? level.floorAt(x, z) : f;
}

/** Lowest ceiling under a body's footprint. */
export function ceilingOver(level, x, z, radius) {
  const r = radius * 0.8;
  let c = Infinity;
  for (const [ox, oz] of [[-r, -r], [r, -r], [-r, r], [r, r]]) {
    const k = level.cellAt(x + ox, z + oz);
    if (!k.solid) c = Math.min(c, k.ceil);
  }
  return c;
}

/**
 * Trace a straight 3D line through the map. Returns { t, x, y, z, nx, nz, cell, clear }.
 * t is how far along the line (0..1) the first obstacle was hit.
 */
export function traceLine(level, x0, y0, z0, x1, y1, z1, result = {}) {
  const dx = x1 - x0, dz = z1 - z0, dy = y1 - y0;
  let cx = Math.floor(x0 / CELL), cz = Math.floor(z0 / CELL);
  const stepX = dx > 0 ? 1 : -1, stepZ = dz > 0 ? 1 : -1;
  const tDeltaX = dx !== 0 ? Math.abs(CELL / dx) : Infinity;
  const tDeltaZ = dz !== 0 ? Math.abs(CELL / dz) : Infinity;
  let tMaxX = dx !== 0 ? (dx > 0 ? (cx + 1) * CELL - x0 : x0 - cx * CELL) / Math.abs(dx) : Infinity;
  let tMaxZ = dz !== 0 ? (dz > 0 ? (cz + 1) * CELL - z0 : z0 - cz * CELL) / Math.abs(dz) : Infinity;
  let tEnter = 0, nx = 0, nz = 0, first = true;

  for (let guard = 0; guard < 512; guard++) {
    const tExit = Math.min(tMaxX, tMaxZ, 1);
    const cell = level.cell(cx, cz);
    const yA = y0 + dy * tEnter, yB = y0 + dy * tExit;
    let hitT = -1, hnx = nx, hnz = nz, hny = 0;
    if (!first && cell.solid) hitT = tEnter;
    else if (!cell.solid) {
      if (!first && cell.door && cell.door.blocksRayAt(Math.max(yA, yB))) hitT = tEnter;
      else {
        const f = level.floorOf(cell);
        if (Math.min(yA, yB) < f) {
          // hits the floor (or the side of a raised step)
          if (yA < f && !first) hitT = tEnter;
          else { hitT = dy !== 0 ? Math.max(tEnter, (f - y0) / dy) : tEnter; hnx = hnz = 0; hny = 1; }
        } else if (!cell.sky && Math.max(yA, yB) > cell.ceil) {
          if (yA > cell.ceil && !first) hitT = tEnter;
          else { hitT = dy !== 0 ? Math.max(tEnter, (cell.ceil - y0) / dy) : tEnter; hnx = hnz = 0; hny = -1; }
        }
      }
    }
    if (hitT >= 0) {
      result.t = hitT; result.clear = false; result.cell = cell;
      result.x = x0 + dx * hitT; result.y = y0 + dy * hitT; result.z = z0 + dz * hitT;
      result.nx = hnx; result.nz = hnz; result.ny = hny;
      return result;
    }
    if (tExit >= 1) break;
    first = false;
    if (tMaxX < tMaxZ) { cx += stepX; tEnter = tMaxX; tMaxX += tDeltaX; nx = -stepX; nz = 0; }
    else { cz += stepZ; tEnter = tMaxZ; tMaxZ += tDeltaZ; nx = 0; nz = -stepZ; }
  }
  result.t = 1; result.clear = true; result.cell = null;
  result.x = x1; result.y = y1; result.z = z1; result.nx = result.nz = result.ny = 0;
  return result;
}

/** True if nothing solid is between the two points. */
export function hasLineOfSight(level, x0, y0, z0, x1, y1, z1) {
  return traceLine(level, x0, y0, z0, x1, y1, z1, losResult).clear;
}
const losResult = {};
