// Turns a text map (see levels/level1.js) into 3D geometry, and runs the
// level's moving parts: doors, lifts and animated floors.

import * as THREE from 'three';
import { CELL } from '../config.js';
import { THING_CODES } from './thingCodes.js';

const DOOR_SPEED = 1.8;     // fraction per second (full open in ~0.55s)
const DOOR_WAIT = 4.0;      // seconds a door stays open
const LIFT_SPEED = 1.6;     // metres per second
const LIFT_WAIT = 3.0;

// Doom-style fake contrast: walls facing east/west are a bit brighter than north/south.
const SHADE_NS = 0.82, SHADE_EW = 1.0, SHADE_FLOOR = 1.0, SHADE_CEIL = 0.85;

class Door {
  constructor(cell, opts, level) {
    this.cell = cell;
    this.level = level;
    this.key = opts.key || null;
    this.secret = !!opts.secret;
    this.tex = opts.tex || (this.key ? `door_${this.key}` : 'door');
    this.height = cell.ceil - cell.floor;
    this.open = 0;          // 0 = closed, 1 = fully open
    this.state = 'closed';  // closed | opening | open | closing
    this.timer = 0;
    this.found = false;     // secrets are counted once
  }
  get bottom() { return this.cell.floor + this.open * this.height; }
  blocks(feet, height) { return this.open < 1 && this.bottom < feet + height - 0.05; }
  blocksRayAt(y) { return this.open < 1 && y > this.bottom; }
  activate() {
    if (this.state === 'closed' || this.state === 'closing') { this.state = 'opening'; return true; }
    if (this.state === 'open') { this.timer = 0; }
    return false;
  }
  update(dt, occupied) {
    if (this.state === 'opening') {
      this.open = Math.min(1, this.open + DOOR_SPEED * dt);
      if (this.open >= 1) { this.state = 'open'; this.timer = 0; }
    } else if (this.state === 'open') {
      if (this.secret) return;
      this.timer += dt;
      if (this.timer > DOOR_WAIT && !occupied(this.cell)) { this.state = 'closing'; this.level.emit('doorClose', this); }
    } else if (this.state === 'closing') {
      if (occupied(this.cell)) { this.state = 'opening'; this.level.emit('doorOpen', this); return; }
      this.open = Math.max(0, this.open - DOOR_SPEED * dt);
      if (this.open <= 0) this.state = 'closed';
    }
    if (this.mesh) this.mesh.position.y = this.cell.floor + this.height / 2 + this.open * (this.height - 0.05);
  }
}

class Lift {
  constructor(id, low, high, level) {
    this.id = id; this.low = low; this.high = high; this.level = level;
    this.h = high;          // current floor height of the lift platform
    this.state = 'up';      // up | lowering | down | raising
    this.timer = 0;
    this.cells = [];
    this.meshes = [];
  }
  activate() {
    if (this.state === 'up') { this.state = 'lowering'; this.level.emit('liftStart', this); return true; }
    if (this.state === 'down') { this.timer = 0; }
    return false;
  }
  update(dt) {
    if (this.state === 'lowering') {
      this.h = Math.max(this.low, this.h - LIFT_SPEED * dt);
      if (this.h <= this.low) { this.state = 'down'; this.timer = 0; this.level.emit('liftStop', this); }
    } else if (this.state === 'down') {
      this.timer += dt;
      if (this.timer > LIFT_WAIT) { this.state = 'raising'; this.level.emit('liftStart', this); }
    } else if (this.state === 'raising') {
      this.h = Math.min(this.high, this.h + LIFT_SPEED * dt);
      if (this.h >= this.high) { this.state = 'up'; this.level.emit('liftStop', this); }
    }
    const H = this.high - this.low;
    for (const m of this.meshes) m.position.y = this.h - H / 2;
  }
}

/** Collects quads and turns them into one mesh per texture. */
class GeometryBuilder {
  constructor() { this.groups = new Map(); }
  group(tex) {
    let g = this.groups.get(tex);
    if (!g) { g = { pos: [], uv: [], col: [], idx: [] }; this.groups.set(tex, g); }
    return g;
  }
  quad(tex, verts, uvs, light) {
    const g = this.group(tex);
    const base = g.pos.length / 3;
    for (let i = 0; i < 4; i++) {
      g.pos.push(verts[i][0], verts[i][1], verts[i][2]);
      g.uv.push(uvs[i][0], uvs[i][1]);
      g.col.push(light, light, light);
    }
    g.idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  build(textures) {
    const group = new THREE.Group();
    for (const [tex, g] of this.groups) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(g.pos, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(g.uv, 2));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(g.col, 3));
      geo.setIndex(g.idx);
      geo.computeBoundingSphere();
      const mat = new THREE.MeshBasicMaterial({ map: textures.get(tex), vertexColors: true });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.matrixAutoUpdate = false;
      mesh.userData.tex = tex;
      group.add(mesh);
    }
    return group;
  }
}

export function lightCurve(l) { return Math.pow(Math.max(0, Math.min(1.2, l)), 2.2); }

export class Level {
  constructor(def) {
    this.def = def;
    this.listeners = [];
    this.parse(def);
  }

  on(fn) { this.listeners.push(fn); }
  emit(type, obj) { for (const fn of this.listeners) fn(type, obj); }

  // ---------- parsing ----------
  parse(def) {
    const rows = def.map;
    this.h = rows.length;
    this.w = Math.max(...rows.map(r => r.length));
    if (def.things.length !== this.h) throw new Error(`Level ${def.id}: things layer has ${def.things.length} rows, map has ${this.h}`);
    this.cells = new Array(this.w * this.h);
    this.doors = [];
    this.lifts = new Map();
    this.things = [];
    this.secretsTotal = 0;
    const secretGroups = new Set();
    const defaultWall = def.legend[def.defaultWall || '#']?.wall || 'metal';

    for (let z = 0; z < this.h; z++) {
      for (let x = 0; x < this.w; x++) {
        const ch = rows[z][x] || ' ';
        const L = def.legend[ch];
        const cell = { cx: x, cz: z, ch, solid: true, wallTex: defaultWall, floor: 0, ceil: 3, light: 0.7,
          floorTex: 'floor_tile', ceilTex: 'ceil_panel', sky: false, hazard: 0, secret: false, exit: false,
          lowerTex: null, upperTex: null, door: null, lift: null, seen: false, void: ch === ' ' };
        if (ch !== ' ') {
          if (!L) throw new Error(`Level ${def.id}: unknown map character "${ch}" at ${x},${z}`);
          if (L.wall) { cell.wallTex = L.wall; }
          else {
            Object.assign(cell, {
              solid: false, floor: L.floor ?? 0, ceil: L.ceil ?? 3, light: L.light ?? 0.7,
              floorTex: L.floorTex || 'floor_tile', ceilTex: L.ceilTex || 'ceil_panel', sky: !!L.sky,
              hazard: L.hazard || 0, secret: !!L.secret, exit: !!L.exit,
              lowerTex: L.lowerTex || null, upperTex: L.upperTex || null,
            });
            if (L.door) { cell.door = new Door(cell, L.door, this); this.doors.push(cell.door); }
            if (L.lift) {
              let lift = this.lifts.get(ch);
              if (!lift) { lift = new Lift(ch, L.lift.low, L.lift.high, this); this.lifts.set(ch, lift); }
              cell.lift = lift; cell.floor = L.lift.low; lift.cells.push(cell);
            }
            if (cell.secret) secretGroups.add(ch + ':' + x + ':' + z);
          }
        }
        this.cells[z * this.w + x] = cell;

        const tch = def.things[z][x];
        if (tch && tch !== '.' && tch !== ' ') {
          const code = THING_CODES[tch];
          if (!code) throw new Error(`Level ${def.id}: unknown thing "${tch}" at ${x},${z}`);
          if (cell.solid) throw new Error(`Level ${def.id}: thing "${tch}" placed inside a wall at ${x},${z}`);
          const t = { ...code, x: (x + 0.5) * CELL, z: (z + 0.5) * CELL, cell };
          if (code.kind === 'player') this.playerStart = { x: t.x, z: t.z, angle: (def.playerAngle || 0) * Math.PI / 180 };
          else this.things.push(t);
        }
      }
    }
    if (!this.playerStart) throw new Error(`Level ${def.id}: no player start ("p")`);
    // Count secret areas as connected groups of secret squares.
    this.secretsTotal = this.countSecretGroups();
  }

  countSecretGroups() {
    const seen = new Set(); let groups = 0;
    for (const c of this.cells) {
      if (!c.secret || seen.has(c)) continue;
      groups++;
      const stack = [c];
      while (stack.length) {
        const k = stack.pop();
        if (seen.has(k)) continue;
        seen.add(k); k.secretGroup = groups;
        for (const n of this.neighbours(k)) if (n.secret && !seen.has(n)) stack.push(n);
      }
    }
    return groups;
  }

  neighbours(c) {
    return [this.cell(c.cx, c.cz - 1), this.cell(c.cx + 1, c.cz), this.cell(c.cx, c.cz + 1), this.cell(c.cx - 1, c.cz)];
  }

  // ---------- queries ----------
  cell(cx, cz) {
    if (cx < 0 || cz < 0 || cx >= this.w || cz >= this.h) return OUTSIDE;
    return this.cells[cz * this.w + cx];
  }
  cellAt(x, z) { return this.cell(Math.floor(x / CELL), Math.floor(z / CELL)); }
  floorOf(cell) { return cell.lift ? cell.lift.h : cell.floor; }
  floorAt(x, z) { const c = this.cellAt(x, z); return c.solid ? 0 : this.floorOf(c); }

  // ---------- geometry ----------
  build(textures) {
    const B = new GeometryBuilder();
    const C = CELL;
    for (const cell of this.cells) {
      if (cell.solid) continue;
      const x0 = cell.cx * C, x1 = x0 + C, z0 = cell.cz * C, z1 = z0 + C;
      const f = cell.floor, c = cell.ceil;
      const L = lightCurve(cell.light);

      if (!cell.lift) {
        B.quad(cell.floorTex, [[x0, f, z0], [x0, f, z1], [x1, f, z1], [x1, f, z0]],
          [[x0 / C, -z0 / C], [x0 / C, -z1 / C], [x1 / C, -z1 / C], [x1 / C, -z0 / C]], L * SHADE_FLOOR);
      }
      if (!cell.sky) {
        B.quad(cell.ceilTex, [[x0, c, z0], [x1, c, z0], [x1, c, z1], [x0, c, z1]],
          [[x0 / C, z0 / C], [x1 / C, z0 / C], [x1 / C, z1 / C], [x0 / C, z1 / C]], L * SHADE_CEIL);
      }

      // Walls on each of the four sides. A, B are the left/right ends as seen from inside this square.
      const sides = [
        { n: this.cell(cell.cx, cell.cz - 1), A: [x0, z0], B: [x1, z0], u: (x) => x, shade: SHADE_NS },
        { n: this.cell(cell.cx, cell.cz + 1), A: [x1, z1], B: [x0, z1], u: (x) => -x, shade: SHADE_NS },
        { n: this.cell(cell.cx - 1, cell.cz), A: [x0, z1], B: [x0, z0], u: (x, z) => -z, shade: SHADE_EW },
        { n: this.cell(cell.cx + 1, cell.cz), A: [x1, z0], B: [x1, z1], u: (x, z) => z, shade: SHADE_EW },
      ];
      for (const s of sides) {
        const n = s.n;
        const wall = (tex, yb, yt) => {
          if (yt - yb <= 0.001) return;
          const [ax, az] = s.A, [bx, bz] = s.B;
          const ua = s.u(ax, az) / C, ub = s.u(bx, bz) / C;
          B.quad(tex, [[ax, yb, az], [bx, yb, bz], [bx, yt, bz], [ax, yt, az]],
            [[ua, yb / C], [ub, yb / C], [ub, yt / C], [ua, yt / C]], L * s.shade);
        };
        if (n.solid) {
          wall(n.wallTex, f, c);
        } else {
          // step up to a higher floor (lifts are drawn separately as boxes)
          const nf = n.lift ? n.lift.low : n.floor;
          if (nf > f && !n.lift) wall(n.lowerTex || cell.lowerTex || 'stepside', f, nf);
          else if (n.lift && n.lift.low > f) wall(n.lowerTex || 'stepside', f, n.lift.low);
          // step down from a higher ceiling to a lower one
          if (n.ceil < c && !(n.sky && cell.sky)) wall(n.upperTex || cell.upperTex || this.defaultUpper(), Math.max(n.ceil, f), c);
        }
      }
    }
    this.group = B.build(textures);
    this.materials = this.group.children.map(m => m.material);
    this.animatedTextures = ['slime', 'lava'].filter(t => B.groups.has(t)).map(t => textures.get(t));

    // doors
    for (const d of this.doors) {
      const cell = d.cell;
      const W = this.cell(cell.cx - 1, cell.cz).solid && this.cell(cell.cx + 1, cell.cz).solid;
      const thick = d.secret ? C : 0.45;
      const geo = W ? new THREE.BoxGeometry(C, d.height, thick) : new THREE.BoxGeometry(thick, d.height, C);
      const L = lightCurve(cell.light);
      const face = new THREE.MeshBasicMaterial({ map: textures.get(d.tex) });
      face.color.setScalar(L);
      const edge = new THREE.MeshBasicMaterial({ map: textures.get(d.secret ? d.tex : 'support') });
      edge.color.setScalar(L * 0.7);
      // Box faces: +x, -x, +y, -y, +z, -z
      const mats = W ? [edge, edge, edge, edge, face, face] : [face, face, edge, edge, edge, edge];
      if (d.secret) { // match the surrounding walls exactly
        const sec = new THREE.MeshBasicMaterial({ map: this.secretTexture(textures, d, d.height) });
        sec.color.setScalar(L * SHADE_EW);
        mats.fill(sec);
      }
      d.mesh = new THREE.Mesh(geo, mats);
      d.mesh.position.set((cell.cx + 0.5) * C, cell.floor + d.height / 2, (cell.cz + 0.5) * C);
      this.group.add(d.mesh);
    }

    // lifts
    for (const lift of this.lifts.values()) {
      const H = lift.high - lift.low;
      for (const cell of lift.cells) {
        const L = lightCurve(cell.light);
        const sideTex = textures.get('stepside').clone();
        sideTex.needsUpdate = true; sideTex.repeat.set(1, H / C);
        const side = new THREE.MeshBasicMaterial({ map: sideTex }); side.color.setScalar(L * 0.9);
        const top = new THREE.MeshBasicMaterial({ map: textures.get(cell.floorTex) }); top.color.setScalar(L);
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(C, H, C), [side, side, top, side, side, side]);
        mesh.position.set((cell.cx + 0.5) * C, lift.h - H / 2, (cell.cz + 0.5) * C);
        lift.meshes.push(mesh);
        this.group.add(mesh);
      }
    }

    // sky dome
    if (this.cells.some(c => c.sky)) {
      const tex = textures.get('sky').clone();
      tex.needsUpdate = true; tex.repeat.set(4, 1); tex.wrapT = THREE.ClampToEdgeWrapping;
      const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false, depthWrite: false });
      this.sky = new THREE.Mesh(new THREE.CylinderGeometry(60, 60, 70, 24, 1, true), mat);
      this.sky.renderOrder = -10;
      this.group.add(this.sky);
    }
    return this.group;
  }

  secretTexture(textures, door, height) {
    const t = textures.get(door.tex).clone();
    t.needsUpdate = true; t.repeat.set(1, height / CELL);
    return t;
  }

  defaultUpper() { return this.def.legend[this.def.defaultWall || '#']?.wall || 'metal'; }

  // ---------- runtime ----------
  update(dt, time, cameraPos, occupied) {
    for (const d of this.doors) d.update(dt, occupied);
    for (const l of this.lifts.values()) l.update(dt);
    for (const t of this.animatedTextures) { t.offset.x = Math.sin(time * 0.4) * 0.15; t.offset.y = time * 0.08; }
    if (this.sky) { this.sky.position.set(cameraPos.x, cameraPos.y + 28, cameraPos.z); }
  }

  /** Flash the whole level brighter (muzzle flashes, explosions). */
  setBrightness(b) {
    for (const m of this.materials) m.color.setScalar(b);
  }

  /** Find the door / lift in front of a position (used by the USE button). */
  findUsable(x, z, angle, range) {
    const dx = -Math.sin(angle), dz = -Math.cos(angle);
    for (let d = 0.3; d <= range; d += 0.25) {
      const c = this.cellAt(x + dx * d, z + dz * d);
      if (c.door) return { door: c.door };
      if (c.lift && Math.abs(this.floorOf(c) - this.floorAt(x, z)) > 0.1) return { lift: c.lift };
      if (c.solid) return { wall: c };
    }
    return null;
  }

  dispose() {
    if (!this.group) return;
    this.group.traverse(o => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose());
    });
  }
}

const OUTSIDE = { solid: true, void: true, wallTex: 'metal', cx: -1, cz: -1, floor: 0, ceil: 0, light: 0 };
