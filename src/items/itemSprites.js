// Pixel-art sprites for pickups and props (barrels, lamps...).

import * as THREE from 'three';
import { PixelArt, shadeColor } from '../gfx/PixelArt.js';

const P = {
  medpatch(p) { p.bevel(3, 6, 18, 12, 0xe8e8e0, 1); p.rect(10, 8, 4, 8, 0x20b040); p.rect(8, 10, 8, 4, 0x20b040); },
  traumakit(p) { p.bevel(1, 6, 26, 16, 0xd8d8d0, 2); p.rect(12, 3, 4, 3, 0x6a6a6a); p.rect(12, 9, 4, 10, 0x20b040); p.rect(8, 12, 12, 4, 0x20b040); },
  vitalcore(p) {
    p.rect(4, 20, 16, 4, 0x4a4a52); p.rect(4, 0, 16, 3, 0x4a4a52);
    p.blob(12, 12, 8, 8, 0x8a4aff); p.ellipse(12, 12, 4, 4, 0xe0c8ff); p.px(10, 9, 0xffffff);
    for (const x of [4, 19]) p.rect(x, 2, 1, 18, 0x6a6a72);
  },
  flakvest(p) { p.poly([[4, 2], [10, 2], [12, 6], [14, 2], [20, 2], [22, 20], [2, 20]], 0x3a8a3a); p.rect(6, 8, 12, 2, 0x205a20); p.rect(6, 13, 12, 2, 0x205a20); p.noise(0.1); },
  aegisplate(p) { p.poly([[3, 1], [10, 1], [12, 5], [14, 1], [21, 1], [23, 21], [1, 21]], 0x2a5ac8); p.bevel(6, 7, 12, 10, 0x4a8aff, 1); p.rect(11, 8, 2, 8, 0xffd040); p.noise(0.08); },
  armorshard(p) { p.poly([[8, 1], [14, 6], [12, 15], [4, 15], [2, 6]], 0x3a7ae0); p.poly([[8, 3], [11, 6], [8, 11], [5, 6]], 0x9ac8ff); },
  rivets(p) { p.bevel(3, 8, 16, 10, 0x8a7a3a, 1); for (let i = 0; i < 4; i++) p.rect(5 + i * 3, 5, 2, 4, 0xd8c060); },
  rivetcrate(p) { p.bevel(1, 6, 26, 14, 0x6a5a2a, 2); p.rect(4, 10, 20, 3, 0xd8c060); p.rect(8, 15, 12, 2, 0x3a3018); },
  shells(p) { for (let i = 0; i < 4; i++) { p.bevel(3 + i * 4, 6, 3, 10, 0xc82a1a, 1); p.rect(3 + i * 4, 13, 3, 3, 0xd8b040); } },
  shellbox(p) { p.bevel(1, 6, 26, 14, 0x8a1a10, 2); p.rect(4, 9, 20, 3, 0xd8b040); for (let i = 0; i < 5; i++) p.rect(4 + i * 4, 3, 3, 4, 0xc82a1a); },
  cells(p) { p.bevel(4, 5, 14, 14, 0x3a4a5a, 1); p.rect(7, 8, 8, 8, 0x40d0ff); p.rect(9, 3, 4, 2, 0x8a8a8a); },
  cellpack(p) { p.bevel(1, 3, 26, 18, 0x2a3a4a, 2); p.rect(4, 7, 20, 10, 0x40d0ff); p.rect(4, 11, 20, 2, 0xe0ffff); },
  rocket(p) { p.rect(9, 2, 5, 18, 0x6a6a6a); p.poly([[9, 2], [14, 2], [11.5, -2]], 0xc82a1a); p.rect(7, 16, 9, 4, 0x3a3a3a); p.rect(9, 8, 5, 2, 0xffc020); },
  rocketcrate(p) { p.bevel(1, 8, 30, 14, 0x4a3a2a, 2); for (let i = 0; i < 4; i++) { p.rect(4 + i * 7, 1, 4, 8, 0x6a6a6a); p.rect(4 + i * 7, 0, 4, 2, 0xc82a1a); } p.rect(4, 13, 24, 3, 0xffc020); },
  w_scattergun(p) { p.rect(2, 8, 30, 4, 0x34363c); p.rect(10, 12, 12, 3, 0x5a3a22); p.poly([[30, 8], [42, 10], [42, 16], [32, 14]], 0x5a3a22); p.rect(2, 9, 30, 1, 0x6a6e78); },
  w_repeater(p) { for (let i = 0; i < 3; i++) p.rect(0, 5 + i * 3, 26, 2, 0x4a4e58); p.blob(32, 11, 9, 7, 0x3a3c44); p.rect(28, 16, 6, 6, 0x2a2a2e); p.rect(28, 7, 6, 2, 0xb02010); },
  w_lancer(p) { p.rect(2, 8, 34, 6, 0x2a3040); for (let i = 0; i < 4; i++) p.rect(6 + i * 7, 7, 2, 8, 0x40b8ff); p.rect(24, 14, 6, 6, 0x3a4458); p.rect(0, 9, 3, 4, 0x80e0ff); },
  w_hellbore(p) { p.rect(0, 6, 40, 10, 0x4a1a14); for (let i = 0; i < 4; i++) p.rect(6 + i * 9, 5, 3, 12, 0xc8b89a); p.rect(18, 16, 6, 6, 0x3a2a2a); p.rect(0, 9, 3, 4, 0xff8020); },
  key_red(p) { keycard(p, 0xe02020); },
  key_blue(p) { keycard(p, 0x2a6aff); },
  key_yellow(p) { keycard(p, 0xf0c820); },
  barrel(p) {
    p.blob(12, 16, 11, 15, 0x5a6a3a); p.rect(1, 5, 22, 2, 0x3a4424); p.rect(1, 25, 22, 2, 0x3a4424);
    p.ellipse(12, 3, 9, 2.5, 0x8aff40); p.ellipse(12, 3, 6, 1.5, 0xd8ffa0);
    p.poly([[12, 11], [16, 19], [8, 19]], 0xf0d020); p.rect(11, 14, 2, 3, 0x1a1a1a);
  },
  barrel_hot(p) { P.barrel(p); p.ellipse(12, 3, 9, 2.5, 0xffa040); p.ellipse(12, 3, 6, 1.5, 0xffffc0); },
  lamp(p) {
    p.rect(10, 20, 4, 40, 0x3a3a40); p.rect(6, 58, 12, 4, 0x2a2a2e);
    p.bevel(6, 4, 12, 16, 0x4a4a52, 1); p.rect(8, 6, 8, 12, 0xfff0c0); p.rect(9, 7, 6, 10, 0xffffff);
  },
  brazier(p) {
    p.poly([[2, 18], [22, 18], [18, 30], [6, 30]], 0x4a3a2a); p.rect(10, 30, 4, 10, 0x3a2a1a); p.rect(6, 40, 12, 3, 0x2a1a0a);
    p.poly([[4, 18], [8, 4], [11, 12], [13, 0], [16, 10], [19, 6], [20, 18]], 0xff6a10);
    p.poly([[8, 18], [11, 8], [14, 14], [17, 18]], 0xffd040);
  },
  remains(p) {
    p.ellipse(16, 12, 15, 3, 0x6a0808);
    p.blob(12, 10, 6, 3, 0x9a5220); p.blob(20, 10, 5, 2.5, 0x7a8a64); p.px(8, 8, 0xe0d8c0); p.px(24, 9, 0xe0d8c0);
  },
};

function keycard(p, c) {
  p.bevel(4, 3, 14, 18, c, 1);
  p.rect(6, 6, 10, 3, shadeColor(c, 0.5));
  p.rect(7, 12, 8, 6, 0xf0f0f0); p.rect(9, 14, 4, 2, c);
}

const SIZES = {
  medpatch: [24, 20], traumakit: [28, 24], vitalcore: [24, 24], flakvest: [24, 22], aegisplate: [24, 22], armorshard: [16, 16],
  rivets: [22, 20], rivetcrate: [28, 22], shells: [20, 18], shellbox: [28, 22], cells: [22, 20], cellpack: [28, 22],
  rocket: [22, 22], rocketcrate: [32, 24], w_scattergun: [44, 18], w_repeater: [42, 22], w_lancer: [38, 22], w_hellbore: [42, 22],
  key_red: [22, 22], key_blue: [22, 22], key_yellow: [22, 22], barrel: [24, 32], barrel_hot: [24, 32],
  lamp: [24, 62], brazier: [24, 44], remains: [32, 16],
};

const cache = {};
export function getItemTexture(name) {
  if (cache[name]) return cache[name];
  const [w, h] = SIZES[name];
  const p = new PixelArt(w, h, 17);
  P[name](p);
  p.outline(0x0a0604);
  const t = new THREE.CanvasTexture(p.toCanvas());
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.generateMipmaps = false;
  t.userData.w = w; t.userData.h = h;
  cache[name] = t;
  return t;
}
