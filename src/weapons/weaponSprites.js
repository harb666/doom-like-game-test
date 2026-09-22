// First-person weapon art, painted in code.
// Each weapon returns { frames: { idle, alt? }, flash, flashAt: [x, y] }.
// Sizes are in "virtual pixels" on a 200-pixel-tall screen.

import { PixelArt, shadeColor } from '../gfx/PixelArt.js';

const GLOVE = 0x3a2e26, GLOVE_HI = 0x5a4838, SLEEVE = 0x3a4a2a;

function trap(p, cx, yTop, yBot, wTop, wBot, c) {
  p.poly([[cx - wTop / 2, yTop], [cx + wTop / 2, yTop], [cx + wBot / 2, yBot], [cx - wBot / 2, yBot]], c);
}

function hand(p, x, y, r = 11, mirror = false) {
  // armoured gauntlet: dark glove, knuckle row, riveted plate on the back of the hand
  p.blob(x, y + r * 0.1, r, r * 0.85, GLOVE);
  for (let i = 0; i < 4; i++) p.blob(x - r * 0.66 + i * r * 0.44, y - r * 0.62, r * 0.25, r * 0.3, GLOVE_HI);
  p.poly([[x - r * 0.62, y - r * 0.3], [x + r * 0.62, y - r * 0.3], [x + r * 0.5, y + r * 0.55], [x - r * 0.5, y + r * 0.55]], 0x4a5a3a);
  p.rect(x - r * 0.55, y - r * 0.3, r * 1.1, 1, 0x7a8a62);
  p.px(x - r * 0.35, y + r * 0.1, 0xa0a890); p.px(x + r * 0.35, y + r * 0.1, 0xa0a890);
  const tx = x + (mirror ? r * 0.85 : -r * 0.85);
  p.blob(tx, y - r * 0.05, r * 0.3, r * 0.5, GLOVE_HI);
}

function sleeve(p, x, y, w, h) { p.bevel(x, y, w, h, SLEEVE, 1); p.rect(x + 2, y + 3, w - 4, 2, shadeColor(SLEEVE, 0.7)); }

function flashArt(w, h, core, mid, outer, seed) {
  const p = new PixelArt(w, h, seed);
  const cx = w / 2, cy = h / 2;
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + p.rng() * 0.4;
    const len = (0.6 + p.rng() * 0.4) * Math.min(cx, cy);
    p.poly([[cx + Math.cos(a - 0.3) * 4, cy + Math.sin(a - 0.3) * 4], [cx + Math.cos(a) * len, cy + Math.sin(a) * len], [cx + Math.cos(a + 0.3) * 4, cy + Math.sin(a + 0.3) * 4]], outer);
  }
  p.ellipse(cx, cy, w * 0.3, h * 0.3, mid);
  p.ellipse(cx, cy, w * 0.16, h * 0.16, core);
  return p.toCanvas();
}

function pistol() {
  const make = () => {
    const p = new PixelArt(72, 84, 11), cx = 38;
    sleeve(p, cx - 20, 74, 36, 10);
    // body
    trap(p, cx, 18, 60, 18, 28, 0x464a52);
    trap(p, cx, 18, 42, 12, 18, 0x6a707a);
    p.rect(cx - 1, 20, 2, 20, 0x9aa0aa);
    trap(p, cx, 44, 50, 25, 27, 0xc8661a);
    // rivet drum
    p.blob(cx + 15, 46, 6, 9, 0x8a8e96);
    for (let i = 0; i < 3; i++) p.px(cx + 14, 41 + i * 4, 0xe0c060);
    // muzzle
    p.ellipse(cx, 18, 7, 4, 0x2a2c30); p.ellipse(cx, 18, 4, 2.2, 0x050505);
    hand(p, cx - 1, 66, 14);
    p.outline();
    return p.toCanvas();
  };
  return { frames: { idle: make() }, flash: flashArt(44, 40, 0xffffff, 0xfff0a0, 0xffa020, 3), flashAt: [38, 10] };
}

function scattergun() {
  const make = (pump) => {
    const p = new PixelArt(120, 100, 21), cx = 62;
    sleeve(p, cx + 8, 90, 34, 10);
    // barrel + mag tube
    trap(p, cx, 8, 78, 13, 24, 0x34363c);
    trap(p, cx, 8, 78, 5, 9, 0x50545c);
    trap(p, cx + 7, 20, 78, 6, 10, 0x2a2c30);
    p.ellipse(cx, 8, 7, 3.5, 0x18181a); p.ellipse(cx, 8, 4, 2, 0x000000);
    // receiver
    p.bevel(cx - 20, 70, 40, 22, 0x3e4048, 2);
    p.rect(cx + 4, 74, 10, 5, 0x101010);
    // pump grip
    const py = pump ? 10 : 0;
    trap(p, cx, 36 + py, 56 + py, 26, 32, 0x5a3a22);
    for (let i = 0; i < 5; i++) trap(p, cx, 39 + py + i * 3.5, 40 + py + i * 3.5, 26 + i, 27 + i, 0x3a2414);
    hand(p, cx - 20, 52 + py, 13);
    hand(p, cx + 22, 90, 13, true);
    p.outline();
    return p.toCanvas();
  };
  return { frames: { idle: make(false), alt: make(true) }, flash: flashArt(64, 52, 0xffffff, 0xffe080, 0xff8010, 5), flashAt: [62, 2] };
}

function repeater() {
  const make = (phase) => {
    const p = new PixelArt(128, 104, 31), cx = 64;
    sleeve(p, cx - 50, 92, 30, 12); sleeve(p, cx + 22, 92, 30, 12);
    // drum housing
    p.blob(cx, 82, 30, 20, 0x3a3c44);
    p.rect(cx - 10, 70, 20, 5, 0xb02010); p.rect(cx - 3, 71, 6, 3, phase ? 0xff6040 : 0xff2010);
    // three barrels converging
    const offs = phase ? [[-9, 0], [9, 0], [0, 7]] : [[-7, 5], [7, 5], [0, -3]];
    for (const [ox, oy] of offs) {
      trap(p, cx + ox * 0.5, 10 + oy * 0.3, 70 + oy, 7, 12, 0x4a4e58);
      p.line(cx + ox * 0.5, 12, cx + ox, 66, 0x7a7e88);
      p.ellipse(cx + ox * 0.5, 10 + oy * 0.3, 3.5, 2, 0x060606);
    }
    trap(p, cx, 30, 34, 22, 23, 0x8a6a2a); trap(p, cx, 50, 55, 28, 30, 0x8a6a2a);
    hand(p, cx - 36, 86, 13); hand(p, cx + 36, 86, 13, true);
    p.outline();
    return p.toCanvas();
  };
  return { frames: { idle: make(0), alt: make(1) }, flash: flashArt(56, 46, 0xffffff, 0xfff0a0, 0xffb030, 7), flashAt: [64, 4] };
}

function lancer() {
  const make = (glow) => {
    const p = new PixelArt(120, 98, 41), cx = 60;
    sleeve(p, cx - 8, 88, 34, 10);
    trap(p, cx, 12, 84, 16, 34, 0x2a3040);
    trap(p, cx, 12, 84, 8, 14, 0x3a4458);
    // fins
    p.poly([[cx - 16, 50], [cx - 30, 58], [cx - 30, 76], [cx - 17, 70]], 0x4a5468);
    p.poly([[cx + 16, 50], [cx + 30, 58], [cx + 30, 76], [cx + 17, 70]], 0x4a5468);
    // glowing coils
    const c = glow ? 0xb0f0ff : 0x40b8ff;
    for (let i = 0; i < 4; i++) { const y = 22 + i * 14, w = 18 + i * 4; p.ellipse(cx, y, w / 2, 2.5, c); p.ellipse(cx, y, w / 2 - 3, 1.2, 0xe8ffff); }
    p.ellipse(cx, 12, 9, 4, 0x103050); p.ellipse(cx, 12, 5, 2.5, glow ? 0xffffff : 0x80e0ff);
    hand(p, cx, 82, 14);
    p.outline();
    return p.toCanvas();
  };
  return { frames: { idle: make(false), alt: make(true) }, flash: flashArt(48, 44, 0xffffff, 0xa0e8ff, 0x3080ff, 9), flashAt: [60, 6] };
}

function hellbore() {
  const make = () => {
    const p = new PixelArt(132, 110, 51), cx = 66;
    sleeve(p, cx - 56, 98, 30, 12); sleeve(p, cx + 26, 98, 30, 12);
    trap(p, cx, 14, 96, 34, 60, 0x4a1a14);
    trap(p, cx, 14, 96, 18, 30, 0x6a2a1e);
    for (let i = 0; i < 5; i++) { const y = 26 + i * 15, w = 38 + i * 5; trap(p, cx, y, y + 4, w, w + 1, 0xc8b89a); }
    p.ellipse(cx, 14, 18, 7, 0x2a0a06); p.ellipse(cx, 14, 13, 5, 0x000000);
    p.ellipse(cx, 14, 5, 2, 0xff8020);
    // runes
    p.rect(cx - 3, 48, 6, 2, 0xff6020); p.rect(cx - 1, 45, 2, 8, 0xff6020);
    p.rect(cx - 3, 78, 6, 2, 0xff6020); p.rect(cx - 1, 75, 2, 8, 0xff6020);
    hand(p, cx - 40, 90, 14); hand(p, cx + 40, 90, 14, true);
    p.outline();
    return p.toCanvas();
  };
  return { frames: { idle: make() }, flash: flashArt(72, 60, 0xffffe0, 0xffb040, 0xff4010, 13), flashAt: [66, 6] };
}

const BUILDERS = { pistol, scattergun, repeater, lancer, hellbore };
const cache = {};
export function getWeaponArt(id) {
  if (!cache[id]) cache[id] = BUILDERS[id]();
  return cache[id];
}
