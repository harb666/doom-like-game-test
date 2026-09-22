// Original monster art, painted in code as pixel sprites.
// Each monster has walk (2 frames), attack (2 frames), pain and death frames.

import * as THREE from 'three';
import { PixelArt, shadeColor, mixColor } from '../gfx/PixelArt.js';

function claws(p, x, y, dir, c = 0xe8dcb8) {
  p.line(x, y, x - 2 * dir, y + 4, c); p.line(x, y, x, y + 5, c); p.line(x, y, x + 2 * dir, y + 4, c);
}

const PAINTERS = {
  husk: { w: 48, h: 64, paint(p, pose) {
    const cx = 24, skin = 0x7a8a64, suit = 0xa05a22, boot = 0x2a2018;
    const lo = pose === 'walk1' ? 3 : pose === 'walk0' ? -3 : 0;
    p.poly([[cx - 9, 40], [cx - 1, 40], [cx - 3 + lo, 60], [cx - 10 + lo, 60]], suit);
    p.poly([[cx + 1, 40], [cx + 9, 40], [cx + 10 - lo, 60], [cx + 3 - lo, 60]], shadeColor(suit, 0.8));
    p.rect(cx - 11 + lo, 59, 8, 4, boot); p.rect(cx + 3 - lo, 59, 8, 4, boot);
    p.blob(cx, 32, 12, 12, suit);
    p.blob(cx - 2, 30, 6, 7, skin);
    for (let i = 0; i < 4; i++) p.rect(cx - 6, 26 + i * 3, 8, 1, 0xd8cca0);
    p.speckle(30, 0x4a2a10, cx - 12, 22, 24, 22);
    p.blob(cx + 1, 16, 7, 8, skin);
    p.rect(cx - 3, 14, 2, 2, 0xffe040); p.rect(cx + 3, 14, 2, 2, 0xffe040);
    p.rect(cx - 2, 20, 6, 3, 0x200808); p.px(cx - 1, 20, 0xe8e0c0); p.px(cx + 2, 20, 0xe8e0c0);
    if (pose === 'attack0') {
      p.line(cx - 10, 25, cx - 16, 6, skin, 4); p.line(cx + 10, 25, cx + 16, 6, skin, 4);
      claws(p, cx - 16, 2, -1); claws(p, cx + 16, 2, 1);
    } else if (pose === 'attack1') {
      p.line(cx - 10, 25, cx + 4, 42, skin, 4); p.line(cx + 10, 25, cx - 2, 44, skin, 4);
      claws(p, cx + 4, 42, 1); claws(p, cx - 2, 44, -1);
    } else {
      p.line(cx - 10, 25, cx - 15 - lo * 0.3, 46, skin, 4); p.line(cx + 10, 25, cx + 15 - lo * 0.3, 46, skin, 4);
      claws(p, cx - 15 - lo * 0.3, 47, -1); claws(p, cx + 15 - lo * 0.3, 47, 1);
    }
  } },

  rifter: { w: 48, h: 64, paint(p, pose) {
    const cx = 24, armor = 0x34445e, hi = 0x5a6e90, dark = 0x161c28, gun = 0x2a2a2e;
    const lo = pose === 'walk1' ? 3 : pose === 'walk0' ? -3 : 0;
    p.poly([[cx - 9, 38], [cx - 1, 38], [cx - 2 + lo, 60], [cx - 10 + lo, 60]], armor);
    p.poly([[cx + 1, 38], [cx + 9, 38], [cx + 10 - lo, 60], [cx + 2 - lo, 60]], shadeColor(armor, 0.8));
    p.blob(cx - 6 + lo, 48, 3, 3, hi); p.blob(cx + 6 - lo, 48, 3, 3, hi);
    p.rect(cx - 11 + lo, 59, 9, 4, dark); p.rect(cx + 2 - lo, 59, 9, 4, dark);
    p.blob(cx, 30, 12, 11, armor);
    p.bevel(cx - 7, 25, 14, 10, hi, 1);
    p.rect(cx - 8, 36, 16, 3, dark);
    p.blob(cx - 12, 23, 5, 4, hi); p.blob(cx + 12, 23, 5, 4, hi);
    p.blob(cx, 14, 7, 8, armor);
    p.rect(cx - 5, 13, 10, 3, 0xff2a1a); p.rect(cx - 4, 13, 3, 1, 0xffa080);
    if (pose === 'attack0' || pose === 'attack1') {
      p.line(cx - 12, 26, cx - 4, 32, armor, 4); p.line(cx + 12, 26, cx + 4, 32, armor, 4);
      p.bevel(cx - 4, 27, 8, 10, gun, 1);
      p.ellipse(cx, 30, 2.5, 2.5, 0x000000);
      if (pose === 'attack1') { p.ellipse(cx, 29, 7, 6, 0xffb030); p.ellipse(cx, 29, 3.5, 3, 0xffffff); }
    } else {
      p.line(cx - 12, 26, cx - 8, 38, armor, 4); p.line(cx + 12, 26, cx + 8, 34, armor, 4);
      p.line(cx - 12, 40, cx + 12, 28, gun, 4);
      p.px(cx + 12, 28, 0x000000);
    }
  } },

  spitter: { w: 56, h: 56, paint(p, pose) {
    const cx = 28, body = 0xc8b878, sac = 0x8aff40;
    const lo = pose === 'walk1' ? 2 : pose === 'walk0' ? -2 : 0;
    p.blob(cx - 10 + lo, 49, 6, 7, shadeColor(body, 0.8)); p.blob(cx + 10 - lo, 49, 6, 7, shadeColor(body, 0.8));
    p.rect(cx - 15 + lo, 53, 10, 3, 0x3a3020); p.rect(cx + 5 - lo, 53, 10, 3, 0x3a3020);
    p.blob(cx, 34, 20, 16, body);
    p.blob(cx - 8, 38, 4, 4, sac); p.px(cx - 9, 37, 0xf0ffe0);
    p.blob(cx + 9, 31, 3, 3, sac); p.px(cx + 8, 30, 0xf0ffe0);
    p.blob(cx + 4, 43, 3, 2, sac);
    p.blob(cx, 18, 12, 9, body);
    p.rect(cx - 6, 12, 2, 2, 0xff2010); p.rect(cx + 4, 12, 2, 2, 0xff2010); p.rect(cx - 1, 10, 2, 2, 0xff2010);
    if (pose === 'attack0' || pose === 'attack1') {
      p.ellipse(cx, 22, 9, 6, 0x3a0a0a);
      for (let i = -7; i <= 7; i += 3) { p.px(cx + i, 17, 0xf0e8d0); p.px(cx + i, 27, 0xf0e8d0); }
      if (pose === 'attack1') { p.blob(cx, 22, 6, 4, 0x9aff40); p.px(cx - 2, 20, 0xffffff); }
    } else {
      p.ellipse(cx, 22, 7, 2.5, 0x3a0a0a);
      for (let i = -5; i <= 5; i += 3) p.px(cx + i, 21, 0xf0e8d0);
    }
    p.line(cx - 16, 32, cx - 22, 40 + lo, body, 3); p.line(cx + 16, 32, cx + 22, 40 - lo, body, 3);
  } },

  hound: { w: 64, h: 44, paint(p, pose) {
    const cx = 32, body = 0x7a2018, bone = 0xe0d0b0;
    const lo = pose === 'walk1' ? 3 : pose === 'walk0' ? -3 : 0;
    for (let i = -3; i <= 3; i++) p.poly([[cx + i * 5 - 2, 12], [cx + i * 5 + 2, 12], [cx + i * 6, 2 + Math.abs(i) * 2]], bone);
    p.blob(cx, 20, 21, 11, body);
    p.poly([[cx - 18, 22], [cx - 10, 22], [cx - 12 + lo, 40], [cx - 19 + lo, 40]], shadeColor(body, 0.85));
    p.poly([[cx + 10, 22], [cx + 18, 22], [cx + 19 - lo, 40], [cx + 12 - lo, 40]], shadeColor(body, 0.85));
    claws(p, cx - 15 + lo, 40, -1, bone); claws(p, cx + 15 - lo, 40, 1, bone);
    p.blob(cx, 26, 12, 9, shadeColor(body, 1.15));
    p.rect(cx - 7, 21, 3, 2, 0xffe040); p.rect(cx + 4, 21, 3, 2, 0xffe040);
    if (pose === 'attack0' || pose === 'attack1') {
      const open = pose === 'attack1' ? 8 : 6;
      p.ellipse(cx, 31, 9, open, 0x200404);
      for (let i = -7; i <= 7; i += 2) { p.px(cx + i, 31 - open + 1, bone); p.px(cx + i, 31 + open - 1, bone); }
    } else {
      p.rect(cx - 8, 30, 16, 2, 0x200404);
      for (let i = -7; i <= 7; i += 3) p.px(cx + i, 31, bone);
    }
  } },

  wraith: { w: 48, h: 60, paint(p, pose) {
    const cx = 24, cloak = 0x2e1a40, hi = 0x4a2a60;
    const sway = pose === 'walk1' ? 2 : 0;
    p.poly([[cx - 12, 20], [cx + 12, 20], [cx + 16 + sway, 54], [cx + 10, 48], [cx + 6 + sway, 58], [cx, 50], [cx - 6 + sway, 58], [cx - 10, 48], [cx - 16 + sway, 54]], cloak);
    p.blob(cx, 30, 13, 12, cloak);
    p.line(cx - 3, 24, cx - 5 + sway, 52, hi, 2); p.line(cx + 4, 24, cx + 6 + sway, 50, hi, 2);
    const fl = pose === 'walk1' ? 0 : 2;
    p.poly([[cx - 8, 10], [cx - 5, 0 + fl], [cx - 2, 8], [cx + 1, -1 + fl], [cx + 4, 8], [cx + 7, 2 - fl], [cx + 9, 10]], 0xff7010);
    p.poly([[cx - 5, 10], [cx - 3, 4 + fl], [cx, 9], [cx + 3, 3 - fl], [cx + 6, 10]], 0xffd040);
    p.blob(cx, 17, 10, 10, cloak);
    p.ellipse(cx, 18, 7, 7, 0x0a0408);
    p.blob(cx, 19, 5, 6, 0xd8ccb0);
    p.rect(cx - 3, 17, 2, 2, 0xff8020); p.rect(cx + 2, 17, 2, 2, 0xff8020);
    p.rect(cx - 2, 22, 5, 1, 0x2a1010);
    if (pose === 'attack0' || pose === 'attack1') {
      p.line(cx - 11, 26, cx - 5, 34, cloak, 4); p.line(cx + 11, 26, cx + 5, 34, cloak, 4);
      claws(p, cx - 4, 34, 1); claws(p, cx + 4, 34, -1);
      const r = pose === 'attack1' ? 7 : 4;
      p.blob(cx, 38, r, r, 0xff8020); p.ellipse(cx, 38, r * 0.5, r * 0.5, 0xfff0a0);
    } else {
      p.line(cx - 11, 26, cx - 17, 38 + sway, cloak, 4); p.line(cx + 11, 26, cx + 17, 38 - sway, cloak, 4);
      claws(p, cx - 17, 39 + sway, -1); claws(p, cx + 17, 39 - sway, 1);
    }
  } },

  warden: { w: 88, h: 104, paint(p, pose) {
    const cx = 44, skin = 0x6a1a10, armor = 0x3a3a42, glow = 0xff3a10, horn = 0xd8c8a0;
    const lo = pose === 'walk1' ? 4 : pose === 'walk0' ? -4 : 0;
    p.poly([[cx - 20, 66], [cx - 4, 66], [cx - 6 + lo, 98], [cx - 22 + lo, 98]], skin);
    p.poly([[cx + 4, 66], [cx + 20, 66], [cx + 22 - lo, 98], [cx + 6 - lo, 98]], shadeColor(skin, 0.8));
    p.bevel(cx - 23 + lo, 96, 18, 7, 0x1a1a1a, 1); p.bevel(cx + 5 - lo, 96, 18, 7, 0x1a1a1a, 1);
    p.blob(cx, 52, 28, 24, skin);
    p.bevel(cx - 18, 36, 36, 26, armor, 2);
    p.rect(cx - 16, 48, 32, 2, glow); p.rect(cx - 1, 38, 2, 22, glow);
    p.bevel(cx - 20, 62, 40, 8, armor, 1);
    p.blob(cx - 26, 34, 10, 8, armor); p.blob(cx + 26, 34, 10, 8, armor);
    p.blob(cx, 24, 11, 11, skin);
    p.poly([[cx - 8, 18], [cx - 22, 10], [cx - 26, -0], [cx - 18, 8], [cx - 5, 14]], horn);
    p.poly([[cx + 8, 18], [cx + 22, 10], [cx + 26, -0], [cx + 18, 8], [cx + 5, 14]], horn);
    p.rect(cx - 6, 22, 4, 2, 0xffe040); p.rect(cx + 2, 22, 4, 2, 0xffe040);
    p.rect(cx - 5, 29, 10, 3, 0x200404);
    // cannon arm (viewer's left)
    const raise = pose === 'attack0' || pose === 'attack1' ? -12 : 0;
    p.bevel(cx - 42, 40 + raise, 14, 32, armor, 2);
    p.ellipse(cx - 35, 72 + raise, 7, 4, 0x0a0a0a);
    if (pose === 'attack1') { p.blob(cx - 35, 72 + raise, 9, 7, glow); p.ellipse(cx - 35, 72 + raise, 4, 3, 0xffe080); }
    else p.ellipse(cx - 35, 72 + raise, 3, 2, glow);
    // claw arm
    p.line(cx + 28, 38, cx + 36, 64 + lo * 0.5, skin, 7);
    claws(p, cx + 34, 66 + lo * 0.5, -1, horn); claws(p, cx + 39, 66 + lo * 0.5, 1, horn);
  } },
};

// Friendly companion (see src/allies/Ally.js) - uses the same frame system.
PAINTERS.ally = { w: 48, h: 80, paint(p, pose) {
  const cx = 24, skin = 0xe2b49a, skinSh = 0xc08c74, hair = 0x1a1210, hairHi = 0x3e2c24;
  const jacket = 0x8a9098, jacketDk = 0x60666e, seam = 0xc4c8cc, leg = 0x141418;
  const lo = pose === 'walk1' ? 2 : pose === 'walk0' ? -2 : 0;
  const wave = (x0, y0, x1, y1, w, c) => {           // a wavy lock of hair
    const pts = [], back = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10, x = x0 + (x1 - x0) * t + Math.sin(t * 9) * 1.6, y = y0 + (y1 - y0) * t;
      const ww = w * (1 - t * 0.35);
      pts.push([x - ww / 2, y]); back.unshift([x + ww / 2, y]);
    }
    p.poly(pts.concat(back), c);
  };
  // hair behind the body (back of the ponytail)
  wave(cx + 5, 8, cx + 10, 40, 6, hair);
  // legs: black leggings + white trainers
  p.poly([[cx - 8, 50], [cx - 1, 50], [cx - 2 + lo, 75], [cx - 8 + lo, 75]], leg);
  p.poly([[cx + 1, 50], [cx + 8, 50], [cx + 8 - lo, 75], [cx + 2 - lo, 75]], shadeColor(leg, 1.35));
  p.rect(cx - 9 + lo, 74, 8, 5, 0xe0e0e4); p.rect(cx + 1 - lo, 74, 8, 5, 0xe0e0e4);
  p.rect(cx - 9 + lo, 78, 8, 1, 0x8a8a90); p.rect(cx + 1 - lo, 78, 8, 1, 0x8a8a90);
  // fitted grey half-zip, unzipped over a black top
  p.poly([[cx - 12, 29], [cx + 12, 29], [cx + 10, 52], [cx - 10, 52]], jacket);
  p.poly([[cx - 4, 28], [cx + 4, 28], [cx + 2, 44], [cx - 2, 44]], 0x0c0c0e);
  p.line(cx - 4, 29, cx - 2, 44, jacketDk); p.line(cx + 4, 29, cx + 2, 44, jacketDk);
  p.line(cx - 11, 33, cx - 4, 36, seam); p.line(cx + 11, 33, cx + 4, 36, seam);
  p.rect(cx - 9, 46, 18, 1, jacketDk); p.rect(cx - 10, 51, 20, 1, jacketDk);
  // raised collar
  p.poly([[cx - 7, 24], [cx - 4, 24], [cx - 3, 30], [cx - 8, 30]], jacket);
  p.poly([[cx + 4, 24], [cx + 7, 24], [cx + 8, 30], [cx + 3, 30]], jacket);
  // neck with a rose tattoo
  p.rect(cx - 3, 22, 6, 7, skin); p.rect(cx + 1, 22, 2, 7, skinSh);
  p.blob(cx - 4, 27, 2, 2, 0x3a3a40); p.px(cx - 4, 27, 0x5a5a60); p.px(cx - 6, 29, 0x3a3a40); p.px(cx - 3, 30, 0x3a3a40);
  // face
  p.ellipse(cx, 15, 6.5, 8.5, skin);
  p.rect(cx - 6, 15, 1, 5, skinSh); p.rect(cx + 5, 15, 1, 5, skinSh);        // contour
  p.rect(cx - 5, 21, 2, 1, skinSh); p.rect(cx + 3, 21, 2, 1, skinSh);
  // sleek hair pulled back into a high ponytail
  p.blob(cx, 7, 7, 3.6, hair);
  p.rect(cx - 6, 9, 12, 1, hair);
  p.poly([[cx - 7, 8], [cx - 6, 8], [cx - 6, 12], [cx - 7, 12]], hair);
  p.poly([[cx + 6, 8], [cx + 7, 8], [cx + 7, 12], [cx + 6, 12]], hair);
  p.line(cx - 3, 5, cx + 3, 5, hairHi);
  p.blob(cx + 2, 2, 3.5, 2.5, hair);
  // brows, smoky eyes with lashes, blue-grey irises
  p.rect(cx - 5, 11, 3, 1, 0x20140e); p.px(cx - 2, 11, 0x20140e); p.px(cx - 5, 12, 0x20140e);
  p.rect(cx + 2, 11, 3, 1, 0x20140e); p.px(cx + 1, 11, 0x20140e); p.px(cx + 4, 12, 0x20140e);
  p.rect(cx - 5, 13, 4, 1, 0x6a4a40); p.rect(cx + 1, 13, 4, 1, 0x6a4a40);
  p.rect(cx - 5, 14, 4, 1, 0x0a0606); p.rect(cx + 1, 14, 4, 1, 0x0a0606);
  p.px(cx - 6, 13, 0x0a0606); p.px(cx + 5, 13, 0x0a0606);
  p.rect(cx - 4, 15, 2, 1, 0x8ab0c4); p.rect(cx + 2, 15, 2, 1, 0x8ab0c4);
  p.px(cx - 5, 15, 0xf0e8e0); p.px(cx + 4, 15, 0xf0e8e0);
  // nose and glossy mauve lips
  p.px(cx, 17, skinSh); p.px(cx - 1, 18, skinSh);
  p.rect(cx - 2, 20, 4, 1, 0x9a4e5e); p.rect(cx - 1, 21, 3, 1, 0xb86878); p.px(cx, 21, 0xe0a4b0);
  // long wavy hair cascading over one shoulder, in front of the jacket
  wave(cx - 9, 12, cx - 13, 58, 7, hair);
  p.line(cx - 10, 16, cx - 12, 52, hairHi);
  p.line(cx - 8, 22, cx - 10, 48, hairHi);
  // arms and sidearm
  if (pose === 'attack0' || pose === 'attack1') {
    p.line(cx - 11, 31, cx - 3, 36, jacket, 4); p.line(cx + 11, 31, cx + 3, 36, jacket, 4);
    p.blob(cx, 36, 3, 2, skin);
    p.rect(cx - 2, 31, 4, 5, 0x26282c);
    if (pose === 'attack1') { p.ellipse(cx, 29, 6, 5, 0xffc040); p.ellipse(cx, 29, 2.5, 2, 0xffffff); }
  } else {
    p.line(cx - 11, 31, cx - 13 + lo * 0.5, 50, jacket, 4); p.line(cx + 11, 31, cx + 13 - lo * 0.5, 50, jacket, 4);
    p.blob(cx - 13 + lo * 0.5, 51, 2, 2, skin); p.blob(cx + 13 - lo * 0.5, 51, 2, 2, skin);
    p.rect(cx + 12 - lo * 0.5, 50, 3, 7, 0x26282c);
  }
} };

// ---------- derived frames ----------
function tint(src, color, amount) {
  const p = src.clone();
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) {
    const c = p.get(x, y);
    if (c !== null) p.px(x, y, mixColor(c, color, amount));
  }
  return p;
}

/** Rotate a sprite around its bottom-centre (for falling-over death frames). */
function fallen(src, angle, extraW, sink = 0) {
  const W = src.w + extraW, H = src.h;
  const out = new PixelArt(W, H, 5);
  const pivX = src.w / 2, pivY = src.h - 1;
  const cos = Math.cos(angle), sin = Math.sin(angle);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const dx = x - W / 2, dy = y - (H - 1) + sink;
    const sx = Math.round(pivX + dx * cos + dy * sin);
    const sy = Math.round(pivY - dx * sin + dy * cos);
    const c = src.get(sx, sy);
    if (c !== null) out.px(x, y, c);
  }
  return out;
}

function deathFrames(base, blood) {
  const extra = Math.round(base.h * 0.6);
  const f1 = fallen(base, 0.35, extra);
  const f2 = fallen(tint(base, 0x400000, 0.25), 0.9, extra, 2);
  const f3 = fallen(tint(base, 0x400000, 0.4), Math.PI / 2 - 0.1, extra, 4);
  // blood pool + splatter under the corpse
  const pool = new PixelArt(f3.w, f3.h, 9);
  pool.ellipse(f3.w / 2, f3.h - 3, f3.w * 0.42, 3, blood);
  pool.copyFrom(f3);
  pool.speckle(30, shadeColor(blood, 0.7), 0, f3.h - 14, f3.w, 12);
  // gore chunks
  for (let i = 0; i < 6; i++) pool.blob(f3.w * (0.2 + pool.rng() * 0.6), f3.h - 4 - pool.rng() * 6, 2, 1.5, shadeColor(blood, 1.2));
  return [f1, f2, pool];
}

function texFrom(p) {
  const t = new THREE.CanvasTexture(p.toCanvas());
  t.colorSpace = THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.userData.aspect = p.w / p.h;
  return t;
}

const cache = {};
export function getEnemyFrames(type, bloodColor = 0x8a0808) {
  if (cache[type]) return cache[type];
  const P = PAINTERS[type];
  const make = (pose) => { const p = new PixelArt(P.w, P.h, 3); P.paint(p, pose); p.outline(); return p; };
  const walk0 = make('walk0'), walk1 = make('walk1');
  const frames = {
    walk: [texFrom(walk0), texFrom(walk1)],
    attack: [texFrom(make('attack0')), texFrom(make('attack1'))],
    pain: texFrom(tint(walk0, 0xffffff, 0.35)),
    death: deathFrames(walk0, bloodColor).map(texFrom),
    baseAspect: P.w / P.h,
  };
  cache[type] = frames;
  return frames;
}
