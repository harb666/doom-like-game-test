// 3D gun models, used for the first-person view and for weapon pickups.
// Every gun points down -z (straight ahead in first person), origin at the grip.
// userData: muzzle (Vector3), spin (barrels that rotate), pump (part that slides).

import * as THREE from 'three';
import { box, cyl, ball, cone, put, torus } from './common.js';

const X = Math.PI / 2;
const COL = { metal: 0x4a4e56, dark: 0x2a2c32, light: 0x6a6e78, orange: 0xc8661a, wood: 0x5a3a22, olive: 0x4a5236 };

function barrel(g, r, len, mat, x, y, zBack, seg = 10) {
  // a cylinder lying along z, from zBack forward (towards -z)
  return put(g, cyl(r, r, len, mat, seg), x, y, zBack - len / 2, X, 0, 0);
}

const BUILDERS = {
  pistol(M) {
    const g = new THREE.Group();
    const metal = M.make(COL.metal), light = M.make(COL.light), dark = M.make(COL.dark), orange = M.make(COL.orange);
    put(g, box(0.07, 0.085, 0.3, metal, 'center'), 0, 0.05, -0.08);
    put(g, box(0.05, 0.02, 0.28, light, 'center'), 0, 0.1, -0.08);
    barrel(g, 0.022, 0.08, dark, 0, 0.05, -0.23);
    put(g, box(0.072, 0.03, 0.06, orange, 'center'), 0, 0.05, 0.02);
    put(g, box(0.06, 0.15, 0.08, dark, 'top'), 0, 0.02, 0.03, -0.25, 0, 0);
    put(g, cyl(0.045, 0.045, 0.09, light, 8), 0.055, 0.04, -0.06, 0, 0, X);
    put(g, box(0.015, 0.02, 0.015, orange, 'center'), 0, 0.12, -0.2);
    g.userData.muzzle = new THREE.Vector3(0, 0.05, -0.33);
    return g;
  },
  machinegun(M) {
    const g = new THREE.Group();
    const metal = M.make(COL.metal), dark = M.make(COL.dark), light = M.make(COL.light), olive = M.make(COL.olive);
    put(g, box(0.085, 0.11, 0.42, metal, 'center'), 0, 0.06, -0.08);
    put(g, box(0.06, 0.02, 0.4, light, 'center'), 0, 0.125, -0.08);
    // perforated barrel shroud
    barrel(g, 0.036, 0.3, dark, 0, 0.06, -0.29, 10);
    for (let i = 0; i < 5; i++) put(g, torus(0.037, 0.008, light), 0, 0.06, -0.33 - i * 0.05);
    barrel(g, 0.016, 0.08, metal, 0, 0.06, -0.59);
    // carry handle, magazine, grip, stock
    put(g, box(0.014, 0.035, 0.03, dark, 'center'), 0, 0.145, -0.2);
    put(g, box(0.014, 0.035, 0.03, dark, 'center'), 0, 0.145, 0.06);
    put(g, box(0.025, 0.012, 0.3, light, 'center'), 0, 0.165, -0.07);
    put(g, box(0.05, 0.18, 0.09, olive, 'top'), 0, 0.01, -0.14, 0.2, 0, 0);
    put(g, box(0.055, 0.13, 0.07, dark, 'top'), 0, 0.01, 0.06, -0.3, 0, 0);
    put(g, box(0.06, 0.09, 0.22, olive, 'center'), 0, 0.05, 0.22);
    put(g, box(0.07, 0.03, 0.03, M.make(0xb02010, { glow: 0x801000 }), 'center'), 0, 0.09, 0.06);
    g.userData.muzzle = new THREE.Vector3(0, 0.06, -0.65);
    return g;
  },
  scattergun(M) {
    const g = new THREE.Group();
    const metal = M.make(COL.metal), dark = M.make(COL.dark), wood = M.make(COL.wood);
    barrel(g, 0.034, 0.62, dark, 0, 0.08, -0.08);
    barrel(g, 0.025, 0.5, metal, 0, 0.025, -0.1);
    put(g, box(0.09, 0.12, 0.2, metal, 'center'), 0, 0.05, 0.02);
    const pump = new THREE.Group(); g.add(pump);
    put(pump, box(0.085, 0.075, 0.18, wood, 'center'), 0, 0.03, -0.32);
    for (let i = 0; i < 4; i++) put(pump, box(0.088, 0.078, 0.012, M.make(0x3a2414), 'center'), 0, 0.03, -0.26 - i * 0.04);
    put(g, box(0.07, 0.1, 0.28, wood, 'center'), 0, 0.01, 0.24, 0.15, 0, 0);
    put(g, box(0.02, 0.02, 0.02, M.make(0xd8c060), 'center'), 0, 0.12, -0.66);
    g.userData.muzzle = new THREE.Vector3(0, 0.08, -0.72);
    g.userData.pump = pump;
    return g;
  },
  repeater(M) {
    const g = new THREE.Group();
    const metal = M.make(COL.metal), dark = M.make(COL.dark), brass = M.make(0x8a6a2a);
    put(g, cyl(0.11, 0.11, 0.26, metal, 12), 0, 0.06, 0.06, X, 0, 0);
    const spin = new THREE.Group(); spin.position.set(0, 0.06, -0.1); g.add(spin);
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2;
      put(spin, cyl(0.018, 0.018, 0.52, dark, 6), Math.cos(a) * 0.048, Math.sin(a) * 0.048, -0.24, X, 0, 0);
    }
    put(spin, torus(0.06, 0.012, brass), 0, 0, -0.12);
    put(spin, torus(0.06, 0.012, brass), 0, 0, -0.46);
    put(g, box(0.05, 0.06, 0.2, dark, 'center'), 0, 0.2, 0.05);
    put(g, box(0.12, 0.1, 0.16, brass, 'center'), -0.12, 0.02, 0.08);
    put(g, box(0.06, 0.03, 0.04, M.make(0xb02010, { glow: 0xff2010 }), 'center'), 0, 0.17, 0.12);
    g.userData.muzzle = new THREE.Vector3(0, 0.06, -0.66);
    g.userData.spin = spin;
    return g;
  },
  lancer(M) {
    const g = new THREE.Group();
    const body = M.make(0x2a3040), trim = M.make(0x4a5468), glowC = M.make(0x2080c0, { glow: 0x40c8ff });
    put(g, cyl(0.05, 0.075, 0.55, body, 8), 0, 0.06, -0.12, X, 0, 0);
    for (let i = 0; i < 4; i++) put(g, torus(0.07 - i * 0.005, 0.014, glowC), 0, 0.06, -0.02 - i * 0.1);
    for (const s of [-1, 1]) put(g, box(0.01, 0.1, 0.22, trim, 'center'), s * 0.08, 0.07, 0.02, 0, 0, s * 0.4);
    put(g, ball(0.035, glowC, 1), 0, 0.06, -0.42);
    put(g, box(0.06, 0.13, 0.08, trim, 'top'), 0, 0.02, 0.1, -0.25, 0, 0);
    g.userData.muzzle = new THREE.Vector3(0, 0.06, -0.46);
    g.userData.glowMat = glowC;
    return g;
  },
  hellbore(M) {
    const g = new THREE.Group();
    const tube = M.make(0x4a1a14), bone = M.make(0xc8b89a), dark = M.make(0x1a0806);
    put(g, cyl(0.1, 0.12, 0.72, tube, 10), 0, 0.08, -0.12, X, 0, 0);
    for (let i = 0; i < 4; i++) put(g, torus(0.115, 0.018, bone), 0, 0.08, 0.14 - i * 0.16);
    put(g, cyl(0.075, 0.075, 0.02, M.make(0x401008, { glow: 0xff5010 }), 10), 0, 0.08, -0.47, X, 0, 0);
    put(g, cyl(0.1, 0.1, 0.04, dark, 10), 0, 0.08, -0.49, X, 0, 0);
    put(g, box(0.06, 0.14, 0.08, dark, 'top'), 0, -0.02, 0.05, -0.2, 0, 0);
    put(g, box(0.05, 0.03, 0.12, M.make(0xff6020, { glow: 0xff4010 }), 'center'), 0, 0.2, 0.02);
    g.userData.muzzle = new THREE.Vector3(0, 0.08, -0.52);
    return g;
  },
};

export function buildWeaponModel(id, M) { return BUILDERS[id](M); }

/** The player's gloved hand + forearm holding the grip (first person only). */
export function buildArm(M) {
  const g = new THREE.Group();
  const glove = M.make(0x2e2620), sleeve = M.make(0x3a4a2a), plate = M.make(0x5a6a4a);
  put(g, box(0.085, 0.1, 0.12, glove, 'center'), 0, -0.02, 0.04);
  put(g, box(0.07, 0.03, 0.09, plate, 'center'), 0.02, 0.03, 0.04);
  const fore = put(g, box(0.1, 0.1, 0.5, sleeve, 'center'), 0.05, -0.08, 0.3);
  fore.rotation.set(0.35, -0.25, 0);
  return g;
}
