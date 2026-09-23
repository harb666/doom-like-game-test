// Static furniture placed freely in a level (not tied to the map grid):
// the level definition lists `props: [[type, x, z, turn, options], ...]` in
// metres (map square (c, r) covers x = 2c..2c+2, z = 2r..2r+2), `turn` in
// degrees (0 = the model's front faces +z / south on the map, 90 = faces +x / east).
//
// Everything is merged into a few meshes per material with the level's baked
// lighting multiplied into the vertex colours, so a furnished room costs only
// a handful of draw calls. Props also get collision boxes.

import * as THREE from 'three';
import { FURNITURE, CCTVFeeds } from '../models/furniture.js';
import { grainTexture } from '../models/common.js';
import { ignoreKeyLight } from './Level.js';

/** Collision footprint (half width, half depth) of each prop type, before turning. */
const FOOTPRINT = {
  deskRun: (o) => [(o.len ?? 4) / 2, (o.depth ?? 0.8) / 2],
  officeDesk: (o) => [(o.len ?? 1.6) / 2, (o.depth ?? 0.75) / 2],
  officeChair: () => [0.28, 0.28],
  armchair: () => [0.4, 0.36],
  sideTable: () => [0.26, 0.26],
  bench: (o) => [(o.len ?? 2) / 2, 0.22],
  slatScreen: (o) => [(o.len ?? 2) / 2, 0.08],
  plant: () => [0.24, 0.24],
  pcTower: () => [0.12, 0.24],
  bin: () => [0.15, 0.15],
};

export class Props {
  constructor(game) {
    this.game = game;
    this.group = new THREE.Group();
    this.colliders = [];
    this.feeds = null;
    this.owned = [];
  }

  build(def, level) {
    this.clear();
    if (!def.props?.length) return;
    this.feeds = new CCTVFeeds(8);
    const mats = new Map();
    const K = (color, o = {}) => {
      const key = `${color}|${o.basic ? 1 : 0}|${o.side ?? 0}|${o.map ? o.map.uuid : ''}|${o.transparent ? 1 : 0}|${o.grain ? 1 : 0}`;
      if (!mats.has(key)) {
        const m = o.basic
          ? new THREE.MeshBasicMaterial({ color, map: o.map || null })
          : ignoreKeyLight(new THREE.MeshLambertMaterial({ color, map: o.map || (o.grain ? grainTexture() : null), vertexColors: true, side: o.side ?? THREE.FrontSide, transparent: !!o.transparent }));
        m.userData.lit = !o.basic;
        mats.set(key, m);
      }
      return mats.get(key);
    };
    const scratch = new THREE.Group();
    for (const [type, x, z, turn = 0, opts = {}] of def.props) {
      const make = FURNITURE[type];
      if (!make) throw new Error(`Level ${def.id}: unknown prop "${type}"`);
      const g = new THREE.Group();
      make(g, K, { ...opts, screens: this.feeds });
      const rot = turn * Math.PI / 180;
      g.position.set(x, opts.y ?? level.floorAt(x, z), z);
      g.rotation.y = rot;
      scratch.add(g);
      const fp = FOOTPRINT[type];
      if (fp && !opts.noCollide) {
        let [hx, hz] = fp(opts);
        if (Math.abs(Math.sin(rot)) > 0.7) [hx, hz] = [hz, hx];
        this.colliders.push({ x, z, y: 0, height: 3, radius: Math.max(hx, hz), box: [hx, hz], solidBody: true, prop: true });
      }
    }
    for (const [x, z, hx, hz] of def.colliders || []) this.colliders.push({ x, z, y: 0, height: 3, radius: Math.max(hx, hz), box: [hx, hz], solidBody: true, prop: true });
    scratch.updateMatrixWorld(true);
    this.merge(scratch, level);
    this.owned.push(...mats.values());
  }

  /** Merge every mesh by material, baking the level light into lit ones. */
  merge(root, level) {
    const byMat = new Map();
    root.traverse(o => {
      if (!o.isMesh) return;
      if (!byMat.has(o.material)) byMat.set(o.material, []);
      byMat.get(o.material).push(o);
    });
    const v = new THREE.Vector3(), n = new THREE.Vector3(), nm = new THREE.Matrix3();
    for (const [mat, meshes] of byMat) {
      const pos = [], nrm = [], col = [], uv = [];
      for (const m of meshes) {
        const g = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry;
        const P = g.attributes.position, N = g.attributes.normal, C = g.attributes.color, U = g.attributes.uv;
        nm.getNormalMatrix(m.matrixWorld);
        for (let i = 0; i < P.count; i++) {
          v.fromBufferAttribute(P, i).applyMatrix4(m.matrixWorld);
          n.fromBufferAttribute(N, i).applyMatrix3(nm).normalize();
          pos.push(v.x, v.y, v.z); nrm.push(n.x, n.y, n.z);
          uv.push(U ? U.getX(i) : 0, U ? U.getY(i) : 0);
          let c = C ? C.getX(i) : 1;
          if (mat.userData.lit) {
            // light from the level, sampled just off the surface
            const sx = v.x + n.x * 0.25, sz = v.z + n.z * 0.25;
            const L = level.lightColor(level.cellAt(sx, sz), v.y + n.y * 0.25);
            col.push(c * L[0], c * L[1], c * L[2]);
          } else col.push(1, 1, 1);
        }
        if (g !== m.geometry) g.dispose();
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      geo.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
      geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      geo.computeBoundingSphere();
      this.group.add(new THREE.Mesh(geo, mat));
      this.owned.push(geo);
    }
  }

  update(dt) { if (this.feeds) this.feeds.update(dt); }

  clear() {
    this.group.clear();
    for (const o of this.owned) o.dispose();
    this.owned.length = 0;
    this.colliders.length = 0;
    if (this.feeds) { this.feeds.dispose(); this.feeds = null; }
  }
}
