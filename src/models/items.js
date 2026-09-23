// 3D pickups and props. Pickups spin and bob like classic Quake items.

import * as THREE from 'three';
import { MaterialSet, box, cyl, ball, cone, put, torus, shade, mergeStatic } from './common.js';
import { glowTexture } from '../effects/Effects.js';

function glow(color, size) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, opacity: 0.6 }));
  s.scale.setScalar(size);
  return s;
}

function addGlow(parent, color, size, x, y, z) {
  const s = glow(color, size); s.position.set(x, y, z); parent.add(s); return s;
}

function medkit(g, M, s) {
  const white = M.make(0xe8e8e0), green = M.make(0x20b040, { glow: 0x106020 });
  put(g, box(0.5 * s, 0.3 * s, 0.34 * s, white, 'bottom'));
  put(g, box(0.1 * s, 0.04, 0.26 * s, green, 'center'), 0, 0.3 * s, 0);
  put(g, box(0.26 * s, 0.04, 0.1 * s, green, 'center'), 0, 0.3 * s, 0);
  put(g, box(0.16 * s, 0.05, 0.05, M.make(0x6a6a6a), 'bottom'), 0, 0.3 * s, 0);
}
function crate(g, M, color, stripe, w = 0.55, h = 0.32, d = 0.36) {
  put(g, box(w, h, d, M.make(color), 'bottom'));
  put(g, box(w + 0.01, 0.06, d + 0.01, M.make(stripe, { glow: stripe, glowIntensity: 0.25 }), 'center'), 0, h * 0.55, 0);
}
function shell(g, M, x, z) {
  const red = M.make(0xc82a1a), brass = M.make(0xd8b040);
  put(g, cyl(0.045, 0.045, 0.22, red, 8, 'bottom'), x, 0.05, z);
  put(g, cyl(0.05, 0.05, 0.06, brass, 8, 'bottom'), x, 0, z);
}
function armor(g, M, color, trim, big) {
  const c = M.make(color), t = M.make(trim);
  const s = big ? 1.15 : 1;
  put(g, box(0.5 * s, 0.55 * s, 0.22, c, 'bottom'), 0, 0.05, 0);
  for (const x of [-1, 1]) put(g, box(0.2 * s, 0.14, 0.26, t, 'center'), x * 0.28 * s, 0.58 * s, 0);
  put(g, box(0.16, 0.2, 0.05, t, 'center'), 0, 0.35, 0.12);
  if (big) put(g, box(0.06, 0.3, 0.02, M.make(0xffd040, { glow: 0xffa020 }), 'center'), 0, 0.35, 0.15);
}
function battery(g, M, big) {
  const s = big ? 1.6 : 1;
  put(g, cyl(0.12 * s, 0.12 * s, 0.3 * s, M.make(0x2a3a4a), 10, 'bottom'));
  put(g, cyl(0.125 * s, 0.125 * s, 0.14 * s, M.make(0x20a0d0, { glow: 0x40d0ff }), 10, 'center'), 0, 0.15 * s, 0);
  put(g, cyl(0.04, 0.04, 0.06, M.make(0x9a9a9a), 6, 'bottom'), 0, 0.3 * s, 0);
}
function rocket(g, M, x = 0, z = 0) {
  put(g, cyl(0.06, 0.06, 0.42, M.make(0x6a6a6a), 8, 'bottom'), x, 0.04, z);
  put(g, cone(0.06, 0.14, M.make(0xc82a1a), 8), x, 0.53, z);
  put(g, box(0.18, 0.1, 0.02, M.make(0x3a3a3a), 'bottom'), x, 0.04, z);
  put(g, cyl(0.062, 0.062, 0.04, M.make(0xffc020), 8, 'bottom'), x, 0.3, z);
}
function keycard(g, M, color) {
  put(g, box(0.34, 0.46, 0.04, M.make(color, { glow: color, glowIntensity: 0.55 }), 'bottom'), 0, 0.1, 0);
  put(g, box(0.24, 0.12, 0.05, M.make(0xf0f0f0), 'center'), 0, 0.22, 0);
  put(g, box(0.24, 0.05, 0.05, M.make(0x101010), 'center'), 0, 0.45, 0);
  addGlow(g, color, 1.1, 0, 0.35, 0);
}

const ITEM_MODELS = {
  medpatch: (g, M) => medkit(g, M, 0.8),
  traumakit: (g, M) => medkit(g, M, 1.25),
  vitalcore: (g, M) => {
    const core = put(g, ball(0.2, M.make(0x6a2aff, { glow: 0x9a6aff }), 1), 0, 0.4, 0);
    const cage = M.make(0x5a5a62);
    put(g, torus(0.3, 0.025, cage), 0, 0.4, 0, Math.PI / 2, 0, 0);
    put(g, torus(0.3, 0.025, cage), 0, 0.4, 0);
    addGlow(g, 0x9a6aff, 1.4, 0, 0.4, 0);
    g.userData.pulse = core;
  },
  flakvest: (g, M) => armor(g, M, 0x3a8a3a, 0x205a20, false),
  aegisplate: (g, M) => { armor(g, M, 0x2a5ac8, 0x4a8aff, true); addGlow(g, 0x4a8aff, 1.2, 0, 0.4, 0); },
  armorshard: (g, M) => { put(g, new THREE.Mesh(shade(new THREE.OctahedronGeometry(0.1)), M.make(0x3a7ae0, { glow: 0x2050c0 })), 0, 0.25, 0); },
  rivets: (g, M) => crate(g, M, 0x6a5a2a, 0xd8c060, 0.34, 0.2, 0.24),
  rivetcrate: (g, M) => crate(g, M, 0x5a4a22, 0xd8c060, 0.6, 0.34, 0.4),
  shells: (g, M) => { for (let i = 0; i < 4; i++) shell(g, M, -0.15 + i * 0.1, 0); },
  shellbox: (g, M) => crate(g, M, 0x8a1a10, 0xd8b040, 0.55, 0.3, 0.36),
  cells: (g, M) => battery(g, M, false),
  cellpack: (g, M) => battery(g, M, true),
  rocket: (g, M) => rocket(g, M),
  rocketcrate: (g, M) => { crate(g, M, 0x4a3a2a, 0xffc020, 0.7, 0.3, 0.4); for (let i = 0; i < 3; i++) rocket(g, M, -0.2 + i * 0.2, 0); },
  key_red: (g, M) => keycard(g, M, 0xe02020),
  key_blue: (g, M) => keycard(g, M, 0x2a6aff),
  key_yellow: (g, M) => keycard(g, M, 0xf0c820),
};

/** Build a pickup model. Weapon pickups use the first-person gun models, shrunk. */
export function buildItem(type, weaponBuilder) {
  const root = new THREE.Group(), g = new THREE.Group();
  root.add(g);
  const M = new MaterialSet();
  if (type.startsWith('w_') && weaponBuilder) {
    const w = weaponBuilder(type.slice(2), M);
    w.scale.setScalar(1.3);
    w.rotation.y = Math.PI / 2;
    w.position.y = 0.3;
    g.add(w);
  } else ITEM_MODELS[type](g, M);
  mergeStatic(g);
  return { root, spin: g, mats: M };
}

/** Explosive toxic canister. */
export function buildBarrel() {
  const root = new THREE.Group(), M = new MaterialSet();
  const body = M.make(0x4a5a30), band = M.make(0x2a3218), top = M.make(0x4aa020, { glow: 0x8aff40 });
  put(root, cyl(0.4, 0.4, 1.05, body, 12, 'bottom'));
  for (const y of [0.15, 0.85]) put(root, cyl(0.42, 0.42, 0.07, band, 12, 'center'), 0, y, 0);
  put(root, cyl(0.34, 0.34, 0.03, top, 12, 'bottom'), 0, 1.05, 0);
  put(root, cone(0.13, 0.2, M.make(0xf0d020, { glow: 0x806000 }), 3), 0, 0.5, 0.4, Math.PI / 2, 0, 0);
  addGlow(root, 0x8aff40, 0.9, 0, 1.15, 0);
  mergeStatic(root);
  return { root, mats: M };
}

export function buildDecor(type) {
  const root = new THREE.Group(), M = new MaterialSet();
  if (type === 'lamp') {
    const metal = M.make(0x3a3a40);
    put(root, cyl(0.25, 0.3, 0.12, metal, 8, 'bottom'));
    put(root, cyl(0.05, 0.05, 1.75, metal, 6, 'bottom'), 0, 0.1, 0);
    put(root, box(0.3, 0.34, 0.3, M.make(0x4a4a52), 'bottom'), 0, 1.8, 0);
    put(root, box(0.24, 0.26, 0.31, M.make(0xfff0c0, { glow: 0xfff0c0 }), 'bottom'), 0, 1.84, 0);
  } else if (type === 'brazier') {
    const iron = M.make(0x3a2a1a);
    put(root, cyl(0.12, 0.2, 0.9, iron, 6, 'bottom'));
    put(root, cyl(0.45, 0.25, 0.3, iron, 8, 'bottom'), 0, 0.9, 0);
    put(root, ball(0.3, M.make(0xff6a10, { glow: 0xff6a10 }), 0), 0, 1.25, 0);
  } else if (type === 'remains') {
    const flesh = M.make(0x6a1010), cloth = M.make(0x9a5220), bone = M.make(0xe0d8c0);
    put(root, cyl(0.7, 0.8, 0.02, M.make(0x4a0606, { map: null }), 10, 'bottom'));
    put(root, box(0.5, 0.15, 0.3, cloth, 'bottom'), -0.1, 0, 0, 0, 0.4, 0);
    put(root, ball(0.14, flesh, 0), 0.3, 0.1, 0.1);
    put(root, box(0.4, 0.05, 0.05, bone, 'bottom'), 0.1, 0.02, -0.25, 0, 1.1, 0);
  }
  mergeStatic(root);
  return { root, mats: M };
}
