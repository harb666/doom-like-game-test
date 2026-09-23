// Procedurally painted wall / floor / ceiling textures.
// Each texture is a 64x64 pixel-art canvas covering one 2x2 metre map square.

import * as THREE from 'three';
import { PixelArt, shadeColor, mixColor } from '../gfx/PixelArt.js';

const S = 64;

function metalPanels(p, base, seam) {
  p.fill(base);
  p.noise(0.1);
  for (const [x, y, w, h] of [[0, 0, 32, 32], [32, 0, 32, 32], [0, 32, 32, 32], [32, 32, 32, 32]]) {
    p.rect(x, y, w, 1, shadeColor(base, 1.3)); p.rect(x, y, 1, h, shadeColor(base, 1.25));
    p.rect(x, y + h - 1, w, 1, seam); p.rect(x + w - 1, y, 1, h, seam);
    for (const [rx, ry] of [[3, 3], [w - 5, 3], [3, h - 5], [w - 5, h - 5]]) {
      p.px(x + rx, y + ry, shadeColor(base, 1.6)); p.px(x + rx + 1, y + ry + 1, shadeColor(base, 0.45));
      p.px(x + rx + 1, y + ry, shadeColor(base, 1.2)); p.px(x + rx, y + ry + 1, shadeColor(base, 0.8));
    }
  }
}

const painters = {
  metal(p) {
    metalPanels(p, 0x5a5c62, 0x22242a);
    p.speckle(40, 0x3a3228); // grime
    for (let i = 0; i < 6; i++) { const x = Math.floor(p.rng() * 64); p.rect(x, 20 + Math.floor(p.rng() * 30), 1, 8 + Math.floor(p.rng() * 12), 0x4a3a2a); }
  },
  tech(p) {
    metalPanels(p, 0x4a4e58, 0x1a1c22);
    // screens and blinking lights
    p.bevel(6, 8, 20, 14, 0x0a1a12); p.rect(8, 10, 16, 10, 0x0c3a1c);
    for (let i = 0; i < 5; i++) p.rect(9, 11 + i * 2, 4 + Math.floor(p.rng() * 10), 1, 0x38e070);
    p.bevel(38, 8, 20, 14, 0x120a0a); p.rect(40, 10, 16, 10, 0x3a0c0c);
    for (let i = 0; i < 8; i++) p.rect(41 + i * 2, 19 - Math.floor(p.rng() * 8), 1, 1 + Math.floor(p.rng() * 3), 0xff5030);
    for (let i = 0; i < 6; i++) { p.rect(8 + i * 8, 44, 4, 3, [0xff3020, 0x30ff60, 0xffc020][i % 3]); }
    p.rect(4, 52, 56, 2, 0x202228); p.rect(4, 56, 56, 2, 0x202228);
  },
  brick(p) {
    p.fill(0x2a1a14);
    for (let row = 0; row < 8; row++) {
      const off = (row % 2) * 8;
      for (let col = -1; col < 4; col++) {
        const x = col * 16 + off, y = row * 8;
        const c = mixColor(0x7a2e1c, 0x5a2416, p.rng());
        p.rect(x + 1, y + 1, 15, 7, c);
        p.rect(x + 1, y + 1, 15, 1, shadeColor(c, 1.25));
        p.rect(x + 1, y + 7, 15, 1, shadeColor(c, 0.7));
      }
    }
    p.noise(0.14);
    p.speckle(60, 0x1a0e0a);
  },
  support(p) {
    p.fill(0x2e2a26); p.noise(0.1);
    p.bevel(18, 0, 28, 64, 0x4a4540, 2);
    p.rect(26, 0, 12, 64, 0x3a3632);
    for (let y = 4; y < 64; y += 12) { p.px(22, y, 0x9a948a); p.px(41, y, 0x9a948a); }
    p.rect(18, 48, 28, 8, 0x141414);
    for (let x = 18; x < 44; x += 8) p.poly([[x, 56], [x + 4, 56], [x + 8, 48], [x + 4, 48]], 0xd8a820);
  },
  crate(p) {
    p.fill(0x4a4028);
    p.bevel(0, 0, 64, 64, 0x5a4e30, 3);
    p.line(4, 4, 59, 59, 0x3a3020, 3); p.line(59, 4, 4, 59, 0x3a3020, 3);
    p.bevel(24, 24, 16, 16, 0x6a5c38, 1);
    p.noise(0.12);
    p.rect(8, 6, 14, 3, 0xc8b060); p.rect(42, 55, 14, 3, 0xc8b060);
  },
  hellrock(p) {
    p.fill(0x3a1410);
    for (let i = 0; i < 40; i++) p.blob(p.rng() * 64, p.rng() * 64, 4 + p.rng() * 8, 3 + p.rng() * 6, mixColor(0x4a1a12, 0x2a0e0a, p.rng()));
    let x = 10, y = 0;
    for (let i = 0; i < 30; i++) { const nx = x + (p.rng() - 0.5) * 10, ny = y + 3; p.line(x, y, nx, ny, 0xff7a10); x = nx; y = ny; }
    x = 48; y = 0;
    for (let i = 0; i < 30; i++) { const nx = x + (p.rng() - 0.5) * 10, ny = y + 3; p.line(x, y, nx, ny, 0xffb020); x = nx; y = ny; }
    p.noise(0.1);
  },
  flesh(p) {
    p.fill(0x5a1414);
    for (let i = 0; i < 30; i++) p.blob(p.rng() * 64, p.rng() * 64, 3 + p.rng() * 7, 3 + p.rng() * 7, mixColor(0x7a2020, 0x4a0e10, p.rng()));
    for (let i = 0; i < 6; i++) { let x = p.rng() * 64, y = p.rng() * 64; for (let k = 0; k < 12; k++) { const nx = x + (p.rng() - 0.5) * 8, ny = y + (p.rng() - 0.5) * 8; p.line(x, y, nx, ny, 0x2a0608); x = nx; y = ny; } }
    p.noise(0.12);
  },
  door(p, stripe = null) {
    metalPanels(p, 0x6a6660, 0x28241e);
    p.rect(31, 0, 2, 64, 0x18140e);
    for (let y = 8; y < 44; y += 9) { p.rect(4, y, 24, 2, 0x4a4640); p.rect(36, y, 24, 2, 0x4a4640); }
    // hazard stripes along the bottom
    p.rect(0, 50, 64, 12, 0x101010);
    for (let x = -12; x < 64; x += 8) p.poly([[x, 62], [x + 4, 62], [x + 16, 50], [x + 12, 50]], 0xe0b020);
    if (stripe !== null) {
      p.rect(0, 20, 64, 8, stripe); p.rect(0, 20, 64, 1, shadeColor(stripe, 1.4)); p.rect(0, 27, 64, 1, shadeColor(stripe, 0.5));
      p.bevel(26, 14, 12, 20, shadeColor(stripe, 0.8), 1); p.rect(30, 20, 4, 6, 0x000000);
    }
    p.noise(0.06);
  },
  door_red(p) { painters.door(p, 0xd02020); },
  door_blue(p) { painters.door(p, 0x2060e0); },
  door_yellow(p) { painters.door(p, 0xe0c020); },

  // ---- the lobby at the start of level 1 (modelled on a real room from a video)
  plaster(p) {                 // painted grey-green wall with a dark skirting board
    p.fill(0xa4a99e); p.noise(0.035);
    for (let i = 0; i < 20; i++) p.ellipse(p.rng() * 64, p.rng() * 64, 4 + p.rng() * 8, 4 + p.rng() * 8, mixColor(0xa6aba0, 0xa0a59a, p.rng()));
  },
  plaster_white(p) {
    p.fill(0xd6d8d2); p.noise(0.03);
  },
  cork(p) {                    // pressed cork / wood-chip feature wall
    p.fill(0xb49a6a);
    for (let i = 0; i < 260; i++) p.blob(p.rng() * 64, p.rng() * 64, 0.6 + p.rng() * 1.8, 0.5 + p.rng() * 1.2, mixColor(0xcab07a, 0x8a7048, p.rng()), 0);
    p.speckle(90, 0x6a5434); p.speckle(60, 0xdcc696);
    p.noise(0.08);
  },
  glass(p) {                   // floor-to-ceiling glass front with black frames, night outside
    for (let y = 0; y < 64; y++) p.rect(0, y, 64, 1, mixColor(0x0c1218, 0x26303a, y / 64));
    for (let i = 0; i < 4; i++) { const x = p.rng() * 64; p.ellipse(x, 30 + p.rng() * 20, 5 + p.rng() * 4, 6 + p.rng() * 4, 0x121a16); }  // trees outside
    for (let i = 0; i < 6; i++) { const x = p.rng() * 64, y = 26 + p.rng() * 24; p.ellipse(x, y, 1.4, 1.4, 0xffe0a0); p.px(x, y - 1, 0xfff4d0); }
    for (let i = 0; i < 2; i++) p.ellipse(p.rng() * 64, 44 + p.rng() * 6, 1, 1, 0x40ff80);
    p.noise(0.04);
    for (let i = 0; i < 4; i++) { const x = 6 + p.rng() * 44; p.line(x, 0, x + 12, 64, 0x3a4a56); p.line(x + 2, 0, x + 14, 64, 0x2e3a44); }  // reflections
    p.rect(0, 0, 3, 64, 0x0c0c0e); p.rect(61, 0, 3, 64, 0x0c0c0e); p.rect(31, 0, 2, 64, 0x0c0c0e);
    p.rect(0, 62, 64, 2, 0x0c0c0e);
  },
  door_wood(p) {               // plain wooden office door in a dark frame
    p.fill(0x2a2a2a);
    p.rect(3, 2, 58, 62, 0xb08654);
    for (let x = 3; x < 61; x++) if (p.rng() < 0.35) p.rect(x, 2, 1, 62, mixColor(0xb8905c, 0x9a7446, p.rng()));
    p.noise(0.05);
    p.rect(47, 30, 8, 2, 0xb8bcc0); p.rect(47, 32, 2, 3, 0x7a7e82);
    p.ellipse(51, 24, 1.5, 1.5, 0x2a2a2a);
    p.rect(3, 2, 58, 1, 0xd0a870);
  },
  floor_lobby(p) {             // glossy pale lilac resin floor
    p.fill(0xc6bec6); p.noise(0.025);
    for (let i = 0; i < 12; i++) p.ellipse(p.rng() * 64, p.rng() * 64, 6 + p.rng() * 10, 4 + p.rng() * 8, mixColor(0xc9c1c9, 0xc2bac2, p.rng()));
    p.speckle(30, 0xd6d0d6);
  },
  carpet(p) {                  // grey carpet tiles with a soft woven cross-hatch
    p.fill(0x6a6e6a);
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
      const r = p.rng();
      if (r < 0.18) p.px(x, y, 0x7a7e7a); else if (r < 0.34) p.px(x, y, 0x5e625e);
    }
    for (let i = 0; i < 30; i++) { const x = p.rng() * 64, y = p.rng() * 64; p.line(x, y, x + 4, y, 0x868a86); p.line(x + 1, y + 2, x + 1, y + 5, 0x585c58); }
    p.rect(0, 0, 64, 1, 0x4a4e4a); p.rect(0, 0, 1, 64, 0x4a4e4a);
  },
  floor_mat(p) {               // ribbed entrance matting
    p.fill(0x2a2c2e);
    for (let y = 0; y < 64; y += 4) { p.rect(0, y, 64, 2, 0x4a4c50); p.rect(0, y + 2, 64, 1, 0x1a1a1c); }
    p.noise(0.1);
  },
  ceil_exposed(p) {            // open ceiling painted dark, with services running through
    p.fill(0x26282a); p.noise(0.08);
    p.rect(0, 20, 64, 6, 0x4a4c4e); p.rect(0, 20, 64, 1, 0x6a6c6e);
    p.rect(40, 0, 3, 64, 0x3a3c3e);
    p.speckle(40, 0x1a1c1e);
  },
  ceil_office(p) {             // white ceiling tiles
    p.fill(0xc8cac6);
    for (let y = 0; y < 64; y += 32) for (let x = 0; x < 64; x += 32) p.bevel(x, y, 32, 32, 0xd4d6d2, 1);
    p.noise(0.04);
  },
  floor_tile(p) {
    p.fill(0x3a3630);
    for (let y = 0; y < 64; y += 16) for (let x = 0; x < 64; x += 16) {
      const c = mixColor(0x5a544a, 0x4a463e, p.rng());
      p.rect(x + 1, y + 1, 15, 15, c); p.rect(x + 1, y + 1, 15, 1, shadeColor(c, 1.15));
    }
    p.noise(0.1); p.speckle(50, 0x2a2620);
  },
  floor_hub(p) {
    p.fill(0x22201e);
    for (let y = 0; y < 64; y += 32) for (let x = 0; x < 64; x += 32) {
      const c = ((x + y) / 32) % 2 ? 0x4a4038 : 0x3a322c;
      p.bevel(x + 1, y + 1, 30, 30, c, 1);
      p.rect(x + 12, y + 12, 8, 8, shadeColor(c, 0.8));
    }
    p.noise(0.1);
  },
  floor_grate(p) {
    p.fill(0x1c1c1e);
    for (let y = 0; y < 64; y += 8) for (let x = 0; x < 64; x += 4) { p.rect(x, y, 3, 6, 0x0a0a0a); }
    for (let y = 0; y < 64; y += 8) p.rect(0, y + 6, 64, 2, 0x3a3a3e);
    for (let x = 0; x < 64; x += 4) p.rect(x + 3, 0, 1, 64, 0x2e2e32);
    p.noise(0.12);
  },
  floor_dirt(p) {
    p.fill(0x4a3a2a); p.noise(0.2);
    for (let i = 0; i < 50; i++) p.blob(p.rng() * 64, p.rng() * 64, 1 + p.rng() * 2.5, 1 + p.rng() * 2, mixColor(0x6a5a48, 0x3a2e22, p.rng()));
    p.speckle(80, 0x2a2016);
  },
  floor_plate(p) {
    p.fill(0x4e4e52); p.noise(0.08);
    for (let y = 2; y < 64; y += 8) for (let x = (y / 8 % 2) * 4 + 1; x < 64; x += 8) { p.rect(x, y, 3, 1, 0x7a7a80); p.rect(x, y + 1, 3, 1, 0x2a2a2e); }
    p.rect(0, 0, 64, 1, 0x6a6a70); p.rect(0, 63, 64, 1, 0x2a2a2e);
  },
  floor_concrete(p) {
    p.fill(0x4a4844); p.noise(0.16);
    let x = 0, y = 20;
    for (let i = 0; i < 20; i++) { const nx = x + 3 + p.rng() * 3, ny = y + (p.rng() - 0.5) * 6; p.line(x, y, nx, ny, 0x2a2826); x = nx; y = ny; }
    p.rect(0, 0, 64, 1, 0x2e2c28); p.rect(0, 0, 1, 64, 0x2e2c28);
    p.speckle(40, 0x5a5854);
  },
  floor_lift(p) {
    p.fill(0x101010);
    for (let x = -64; x < 64; x += 8) p.poly([[x, 64], [x + 4, 64], [x + 68, 0], [x + 64, 0]], 0xd0a018);
    p.bevel(8, 8, 48, 48, 0x505258, 2);
    for (let y = 12; y < 52; y += 6) for (let xx = 12; xx < 52; xx += 6) { p.rect(xx, y, 3, 1, 0x7a7c82); }
    p.noise(0.06);
  },
  ceil_panel(p) {
    p.fill(0x2a2a2e);
    for (let y = 0; y < 64; y += 16) for (let x = 0; x < 64; x += 16) p.bevel(x, y, 16, 16, 0x36363c, 1);
    p.noise(0.1);
  },
  ceil_light(p) {
    p.fill(0x303036);
    p.bevel(6, 6, 52, 52, 0x505058, 2);
    p.rect(10, 10, 44, 44, 0xe8f0ff);
    for (let y = 12; y < 54; y += 8) p.rect(10, y, 44, 2, 0xbcc8e0);
    p.noise(0.03);
  },
  ceil_rock(p) {
    p.fill(0x2a2420);
    for (let i = 0; i < 40; i++) p.blob(p.rng() * 64, p.rng() * 64, 3 + p.rng() * 6, 3 + p.rng() * 6, mixColor(0x3a322a, 0x1e1a16, p.rng()));
    p.noise(0.12);
  },
  slime(p) {
    p.fill(0x1a8a1a);
    for (let i = 0; i < 26; i++) p.blob(p.rng() * 64, p.rng() * 64, 3 + p.rng() * 8, 2 + p.rng() * 5, mixColor(0x3adc2a, 0x0e6a12, p.rng()));
    for (let i = 0; i < 14; i++) { const x = p.rng() * 64, y = p.rng() * 64; p.ellipse(x, y, 2, 2, 0x9aff6a); p.px(x - 1, y - 1, 0xe8ffd0); }
    p.noise(0.08);
  },
  lava(p) {
    p.fill(0xc03a08);
    for (let i = 0; i < 26; i++) p.blob(p.rng() * 64, p.rng() * 64, 3 + p.rng() * 8, 2 + p.rng() * 5, mixColor(0xffa020, 0x8a1a04, p.rng()));
    for (let i = 0; i < 18; i++) { const x = p.rng() * 64, y = p.rng() * 64; p.ellipse(x, y, 1.5, 1.5, 0xfff080); }
    p.noise(0.06);
  },
  exit(p) {
    p.fill(0x0a1a10);
    for (let r = 30; r > 2; r -= 6) p.ellipse(32, 32, r, r, r % 12 ? 0x1aff6a : 0x0a6a2a);
    p.ellipse(32, 32, 6, 6, 0xeaffea);
    p.rect(0, 0, 64, 2, 0x3aff8a); p.rect(0, 62, 64, 2, 0x3aff8a); p.rect(0, 0, 2, 64, 0x3aff8a); p.rect(62, 0, 2, 64, 0x3aff8a);
  },
  stepside(p) {
    p.fill(0x3a3a3e); p.noise(0.08);
    for (let y = 0; y < 64; y += 16) { p.rect(0, y, 64, 3, 0xc8a020); p.rect(0, y + 3, 64, 1, 0x1a1a1a); }
  },
  sky(p) {
    // wide canvas: dusk-red hellish sky with jagged mountains
    for (let y = 0; y < p.h; y++) {
      const t = y / p.h;
      const c = mixColor(0x1a0204, t < 0.6 ? mixColor(0x1a0204, 0x8a1a08, t / 0.6) : mixColor(0x8a1a08, 0xff7a1a, (t - 0.6) / 0.4), 1);
      p.rect(0, y, p.w, 1, c);
    }
    for (let i = 0; i < 60; i++) p.px(p.rng() * p.w, p.rng() * p.h * 0.4, 0xffd0a0);
    // distant mountains (wrap seamlessly)
    const layer = (base, amp, col, seedOff) => {
      const pts = [[0, p.h]];
      for (let x = 0; x <= p.w; x += 8) {
        const y = base - Math.abs(Math.sin((x + seedOff) * 0.031) * amp + Math.sin((x + seedOff) * 0.087) * amp * 0.5);
        pts.push([x, y]);
      }
      pts.push([p.w, p.h]);
      p.poly(pts, col);
    };
    layer(p.h * 0.78, 14, 0x2a0806, 0);
    layer(p.h * 0.9, 9, 0x120404, 77);
  },
};

const SIZES = { sky: [256, 96] };

/**
 * Quake-style detail pass: smooth-upscale the 64px pixel art, then add relief
 * shading (brighter/darker edges from the picture's own light and dark areas)
 * and fine grain, so surfaces look gritty and solid instead of chunky.
 */
function enhance(src, scale, relief, seed) {
  const W = src.width * scale, H = src.height * scale;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d');
  ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  // draw with wrap-around padding so tiles stay seamless
  for (const ox of [-W, 0, W]) for (const oy of [-H, 0, H]) ctx.drawImage(src, ox, oy, W, H);
  const img = ctx.getImageData(0, 0, W, H), d = img.data;
  const lum = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) lum[i] = (d[i * 4] * 0.3 + d[i * 4 + 1] * 0.59 + d[i * 4 + 2] * 0.11) / 255;
  let s = seed >>> 0;
  const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  const o = 2;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    const a = lum[((y - o + H) % H) * W + ((x - o + W) % W)], b = lum[((y + o) % H) * W + ((x + o) % W)];
    const k = 1 + (a - b) * relief + (rnd() - 0.5) * 0.09;
    d[i * 4] = Math.min(255, d[i * 4] * k); d[i * 4 + 1] = Math.min(255, d[i * 4 + 1] * k); d[i * 4 + 2] = Math.min(255, d[i * 4 + 2] * k);
  }
  ctx.putImageData(img, 0, 0);
  return cv;
}

export class TextureLibrary {
  constructor(renderer) {
    this.cache = new Map();
    this.maxAniso = renderer ? Math.min(8, renderer.capabilities.getMaxAnisotropy()) : 1;
  }
  get(name) {
    if (this.cache.has(name)) return this.cache.get(name);
    const painter = painters[name];
    if (!painter) throw new Error(`Unknown texture "${name}"`);
    const [w, h] = SIZES[name] || [S, S];
    let seed = 7;
    for (const ch of name) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
    const p = new PixelArt(w, h, seed);
    painter(p);
    const hi = name === 'sky' ? enhance(p.toCanvas(), 3, 0, seed) : enhance(p.toCanvas(), 4, 1.6, seed);
    const tex = new THREE.CanvasTexture(hi);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.anisotropy = this.maxAniso;
    this.cache.set(name, tex);
    return tex;
  }
  dispose() { for (const t of this.cache.values()) t.dispose(); this.cache.clear(); }
}

export const TEXTURE_NAMES = Object.keys(painters);
