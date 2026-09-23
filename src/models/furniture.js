// Furniture and fittings for indoor rooms (the lobby at the start of level 1).
// Every builder gets (g, K, opts): g is the group to add to, K makes materials.
// Models stand on the floor at their origin and face +z ("front").

import * as THREE from 'three';
import { box, cyl, put, shade } from './common.js';

const PI = Math.PI;

// ------------------------------------------------------------------ desks
/** Straight run of the security counter: work top, thick end panels, dark modesty panel, raised front. */
function deskRun(g, K, { len = 4, depth = 0.8, ends = [true, true] } = {}) {
  const white = K(0xc6c8c4), dark = K(0x1c1c1e);
  put(g, box(len, 0.06, depth, white, 'bottom'), 0, 0.72, 0);                                   // work top
  put(g, box(len, 0.64, 0.05, dark, 'bottom'), 0, 0.06, -depth * 0.1);                          // modesty panel
  put(g, box(len, 1.08, 0.08, white, 'bottom'), 0, 0, depth / 2 - 0.04);                         // front (visitor side)
  put(g, box(len + 0.02, 0.05, 0.3, white, 'bottom'), 0, 1.08, depth / 2 - 0.1);                 // counter cap
  for (const [i, s] of [[0, -1], [1, 1]]) if (ends[i]) put(g, box(0.07, 0.78, depth, white, 'bottom'), s * (len / 2 - 0.035), 0, 0);
}

/** Curved section of the counter (bulges out towards the visitor). */
function deskCurve(g, K, { r = 2, depth = 0.8, from = 0, to = 1.2 } = {}) {
  const white = K(0xc6c8c4);
  const r0 = r - depth / 2, r1 = r + depth / 2;
  const shape = new THREE.Shape();
  shape.absarc(0, 0, r1, from, to, false);
  shape.absarc(0, 0, r0, to, from, true);
  const top = new THREE.ExtrudeGeometry(shape, { depth: 0.06, bevelEnabled: false, curveSegments: 24 });
  top.rotateX(PI / 2); top.translate(0, 0.78, 0);
  g.add(new THREE.Mesh(shade(top), white));
  // a shape point at angle a lands at (cos a, sin a) in x/z; a cylinder's angle t at (sin t, cos t)
  const arc = (rad, h, y, color) => {
    const c = new THREE.CylinderGeometry(rad, rad, h, 28, 1, true, PI / 2 - to, to - from);
    c.translate(0, y + h / 2, 0);
    g.add(new THREE.Mesh(shade(c), K(color, { side: THREE.DoubleSide })));
  };
  arc(r1 - 0.02, 1.08, 0, 0xc6c8c4);
  arc(r0 + 0.1, 0.64, 0.06, 0x1c1c1e);
  const cap = new THREE.Shape();
  cap.absarc(0, 0, r1, from, to, false); cap.absarc(0, 0, r1 - 0.3, to, from, true);
  const cg = new THREE.ExtrudeGeometry(cap, { depth: 0.05, bevelEnabled: false, curveSegments: 24 });
  cg.rotateX(PI / 2); cg.translate(0, 1.13, 0);
  g.add(new THREE.Mesh(shade(cg), white));
}

function officeDesk(g, K, { len = 1.6, depth = 0.75 } = {}) {
  const top = K(0xe4e4e0), leg = K(0x2a2a2c);
  put(g, box(len, 0.04, depth, top, 'bottom'), 0, 0.72, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) put(g, box(0.05, 0.72, 0.05, leg, 'bottom'), sx * (len / 2 - 0.06), 0, sz * (depth / 2 - 0.06));
}

// ------------------------------------------------------------------ seating
function officeChair(g, K, { seat = 0xb4b0a4 } = {}) {
  const black = K(0x1e1e20), grey = K(0x6a6a6e), fabric = K(seat, { grain: true }), mesh = K(0x2a2a2e);
  for (let i = 0; i < 5; i++) {
    const a = i / 5 * PI * 2;
    put(g, box(0.05, 0.04, 0.34, black, 'center'), Math.sin(a) * 0.17, 0.07, Math.cos(a) * 0.17, 0, a, 0);
    put(g, cyl(0.03, 0.03, 0.05, black, 6), Math.sin(a) * 0.33, 0.03, Math.cos(a) * 0.33, PI / 2, a, 0);
  }
  put(g, cyl(0.03, 0.03, 0.36, grey, 8, 'bottom'), 0, 0.08, 0);
  put(g, box(0.5, 0.08, 0.48, fabric, 'bottom'), 0, 0.44, 0.02);
  put(g, box(0.46, 0.62, 0.04, mesh, 'bottom'), 0, 0.56, -0.24, -0.12, 0, 0);
  put(g, box(0.5, 0.06, 0.06, black, 'bottom'), 0, 1.16, -0.31);
  for (const s of [-1, 1]) {
    put(g, box(0.04, 0.22, 0.04, black, 'bottom'), s * 0.27, 0.5, 0);
    put(g, box(0.07, 0.03, 0.26, black, 'bottom'), s * 0.27, 0.72, 0.02);
  }
}

function armchair(g, K, { color = 0x7a28a8 } = {}) {
  const fab = K(color, { grain: true }), dark = K(color === 0x7a28a8 ? 0x5a1c80 : 0x3a3a3a, { grain: true }), leg = K(0x1a1a1a);
  put(g, box(0.72, 0.16, 0.66, fab, 'bottom'), 0, 0.26, 0.02);
  put(g, box(0.72, 0.58, 0.16, fab, 'bottom'), 0, 0.3, -0.3, -0.12, 0, 0);
  for (const s of [-1, 1]) put(g, box(0.12, 0.32, 0.6, dark, 'bottom'), s * 0.36, 0.26, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) put(g, cyl(0.018, 0.012, 0.26, leg, 6, 'bottom'), sx * 0.3, 0, sz * 0.26);
}

function sideTable(g, K) {
  const black = K(0x1a1a1c);
  put(g, cyl(0.28, 0.28, 0.03, black, 20, 'bottom'), 0, 0.5, 0);
  put(g, cyl(0.025, 0.025, 0.5, black, 8, 'bottom'), 0, 0, 0);
  put(g, cyl(0.2, 0.22, 0.02, black, 16, 'bottom'), 0, 0, 0);
}

function bench(g, K, { len = 2 } = {}) {         // slatted wooden console / bench
  const wood = K(0xc89a5a, { grain: true }), dwood = K(0xa87a42, { grain: true });
  put(g, box(len, 0.05, 0.42, wood, 'bottom'), 0, 0.82, 0);
  put(g, box(len, 0.04, 0.4, dwood, 'bottom'), 0, 0.06, 0);
  for (let x = -len / 2 + 0.06; x <= len / 2 - 0.05; x += 0.12) put(g, box(0.06, 0.76, 0.06, wood, 'bottom'), x, 0.06, 0.16);
  for (const s of [-1, 1]) put(g, box(0.06, 0.82, 0.42, dwood, 'bottom'), s * (len / 2 - 0.03), 0, 0);
}

// ------------------------------------------------------------------ fittings
function slatScreen(g, K, { len = 2, h = 2.6 } = {}) {
  const wood = K(0xc8904a, { grain: true }), wood2 = K(0xb07a3a, { grain: true });
  for (let x = -len / 2 + 0.05, i = 0; x <= len / 2; x += 0.14, i++) put(g, box(0.06, h, 0.1, i % 2 ? wood : wood2, 'bottom'), x, 0, 0);
  put(g, box(len + 0.04, 0.06, 0.12, wood2, 'bottom'), 0, h, 0);
}

function detectorArch(g, K) {                   // walk-through security arch
  const panel = K(0xcfd2d0), trim = K(0x8a8e90);
  for (const s of [-1, 1]) {
    put(g, box(0.1, 2.1, 0.55, panel, 'bottom'), s * 0.5, 0, 0);
    put(g, box(0.12, 0.08, 0.6, trim, 'bottom'), s * 0.5, 0, 0);
  }
  put(g, box(1.12, 0.22, 0.6, panel, 'bottom'), 0, 2.1, 0);
  const lit = K(0x30ff70, { basic: true });
  put(g, box(0.36, 0.08, 0.02, lit, 'center'), 0, 2.2, 0.31);
  put(g, box(0.36, 0.08, 0.02, lit, 'center'), 0, 2.2, -0.31);
}

function plant(g, K, { h = 1.9 } = {}) {
  const pot = K(0x151517), soil = K(0x2a2018), leafA = K(0x3a7a2a, { side: THREE.DoubleSide }), leafB = K(0x5a9a3a, { side: THREE.DoubleSide }), stem = K(0x4a5a2a);
  put(g, cyl(0.2, 0.16, 0.5, pot, 14, 'bottom'), 0, 0, 0);
  put(g, cyl(0.18, 0.18, 0.02, soil, 12, 'bottom'), 0, 0.46, 0);
  let seed = 3;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  for (let i = 0; i < 4; i++) put(g, cyl(0.015, 0.02, h - 0.4 - i * 0.2, stem, 5, 'bottom'), (rnd() - 0.5) * 0.12, 0.45, (rnd() - 0.5) * 0.12, (rnd() - 0.5) * 0.2, 0, (rnd() - 0.5) * 0.2);
  // long arching palm-like leaves: each a bent strip of quads
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * PI * 2 + rnd() * 0.4, y0 = 0.9 + rnd() * (h - 1.1), len = 0.45 + rnd() * 0.35, w = 0.09;
    const pos = [], n = 6;
    for (let k = 0; k <= n; k++) {
      const t = k / n, out = t * len, up = Math.sin(t * PI * 0.8) * 0.18 - t * t * 0.25, ww = w * Math.sin(Math.min(1, t * 1.3 + 0.15) * PI);
      const cx = Math.cos(a) * out, cz = Math.sin(a) * out, px = -Math.sin(a) * ww / 2, pz = Math.cos(a) * ww / 2;
      pos.push([cx - px, y0 + up, cz - pz], [cx + px, y0 + up, cz + pz]);
    }
    const arr = [];
    for (let k = 0; k < n; k++) { const [a0, a1] = [pos[k * 2], pos[k * 2 + 1]], [b0, b1] = [pos[k * 2 + 2], pos[k * 2 + 3]]; arr.push(...a0, ...b0, ...a1, ...a1, ...b0, ...b1); }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Array(arr.length / 3 * 2).fill(0), 2));
    geo.computeVertexNormals();
    g.add(new THREE.Mesh(shade(geo), i % 2 ? leafA : leafB));
  }
}

function tv(g, K, { w = 1.3, h = 0.74 } = {}) {        // wall-mounted screen, switched off
  put(g, box(w, h, 0.05, K(0x101012), 'center'), 0, 0, 0.03);
  put(g, box(w - 0.04, h - 0.04, 0.01, K(0x1c2024, { shiny: true }), 'center'), 0, 0, 0.06);
}

function frame(g, K, { w = 0.6, h = 0.8, art = 'violet' } = {}) {
  put(g, box(w, h, 0.03, K(0x141414), 'center'), 0, 0, 0.015);
  put(g, box(w - 0.08, h - 0.08, 0.01, K(0xffffff, { map: artTexture(art) }), 'center'), 0, 0, 0.035);
}

function exitSign(g, K) {
  put(g, box(0.36, 0.16, 0.05, K(0xe8ece8), 'center'), 0, 0, 0.025);
  put(g, box(0.32, 0.12, 0.01, K(0xffffff, { basic: true, map: exitTexture() }), 'center'), 0, 0, 0.055);
}

function duct(g, K, { len = 10, r = 0.2 } = {}) {       // runs along local x
  const m = K(0x9a9ea2), band = K(0x7a7e82);
  put(g, cyl(r, r, len, m, 14, 'center'), 0, 0, 0, 0, 0, PI / 2);
  for (let x = -len / 2 + 0.6; x < len / 2; x += 1.2) put(g, cyl(r + 0.012, r + 0.012, 0.05, band, 14, 'center'), x, 0, 0, 0, 0, PI / 2);
}

function pendant(g, K, { drop = 0.7 } = {}) {           // hangs from the ceiling at the origin
  const black = K(0x2a2a2c), rim = K(0xd8dadc);
  put(g, cyl(0.008, 0.008, drop, black, 4, 'top'), 0, 0, 0);
  put(g, cyl(0.1, 0.13, 0.26, rim, 14, 'top'), 0, -drop, 0);
  put(g, cyl(0.11, 0.11, 0.01, K(0xfff4dc, { basic: true }), 14, 'top'), 0, -drop - 0.26, 0);
}

function pcTower(g, K) {
  put(g, box(0.2, 0.44, 0.45, K(0x1a1a1c), 'bottom'));
  put(g, box(0.01, 0.02, 0.02, K(0x40a0ff, { basic: true }), 'center'), -0.1, 0.38, 0.2);
}
function bin(g, K) { put(g, cyl(0.15, 0.13, 0.36, K(0x2a2a2c), 12, 'bottom')); }

// ------------------------------------------------------------------ screens
/** Desk monitor facing +z. `feed` = which CCTV picture it shows, or null for a work screen. */
function monitor(g, K, { w = 0.6, h = 0.36, feed = 0, screens } = {}) {
  const black = K(0x121214);
  put(g, box(0.22, 0.015, 0.18, black, 'bottom'), 0, 0, 0);
  put(g, box(0.04, 0.2, 0.03, black, 'bottom'), 0, 0, -0.04);
  put(g, box(w, h, 0.03, black, 'center'), 0, 0.2 + h / 2, 0);
  const scr = screenQuad(w - 0.02, h - 0.02, screens, feed);
  scr.position.set(0, 0.2 + h / 2, 0.017); g.add(scr);
}
function keyboard(g, K) {
  put(g, box(0.44, 0.02, 0.14, K(0x1c1c1e), 'bottom'));
  put(g, box(0.06, 0.02, 0.1, K(0x1c1c1e), 'bottom'), 0.32, 0, 0.02);
}
function papers(g, K) {
  put(g, box(0.3, 0.01, 0.22, K(0xe8c878), 'bottom'), 0, 0, 0, 0, 0.2, 0);
  put(g, cyl(0.05, 0.05, 0.05, K(0x8ab050), 12, 'bottom'), 0.22, 0, 0.05);
}

/** Wall of CCTV screens (cols x rows), facing +z, centred at the origin. */
function videoWall(g, K, { cols = 3, rows = 2, sw = 1.2, sh = 0.68, screens } = {}) {
  const black = K(0x0c0c0e);
  put(g, box(cols * sw + 0.08, rows * sh + 0.08, 0.06, black, 'center'), 0, 0, 0.03);
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const q = screenQuad(sw - 0.03, sh - 0.03, screens, r * cols + c);
    q.position.set((c - (cols - 1) / 2) * sw, ((rows - 1) / 2 - r) * sh, 0.065); g.add(q);
  }
}

/** A sign with our own lettering and emblem, raised off the wall (faces +z). */
function wallSign(g, K, { text = 'INTAKE', w = 2.2, h = 0.6 } = {}) {
  const t = signTexture(text);
  const m = K(0xffffff, { map: t, transparent: true });
  m.alphaTest = 0.4;
  put(g, box(w, h, 0.03, m, 'center'), 0, 0, 0.03);
}

export const FURNITURE = {
  deskRun, deskCurve, officeDesk, officeChair, armchair, sideTable, bench, slatScreen, detectorArch, plant,
  tv, frame, exitSign, duct, pendant, pcTower, bin, monitor, keyboard, papers, videoWall, wallSign,
};

// ------------------------------------------------------------------ textures
function canvasTex(w, h, draw) {
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
const texCache = new Map();
const cachedTex = (key, make) => { if (!texCache.has(key)) texCache.set(key, make()); return texCache.get(key); };

/** Original abstract artwork for the frames. */
function artTexture(kind) {
  return cachedTex('art' + kind, () => canvasTex(128, 160, (c, W, H) => {
    if (kind === 'violet') {
      const g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#2a0a3a'); g.addColorStop(0.5, '#8a1a6a'); g.addColorStop(1, '#1a0a2a');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      for (let i = 0; i < 9; i++) {
        c.strokeStyle = `rgba(${200 + i * 5},${60 + i * 12},${160 + i * 8},0.7)`; c.lineWidth = 3 + i;
        c.beginPath(); c.arc(W * 0.55, H * 0.45, 12 + i * 7, i * 0.6, i * 0.6 + 2.4); c.stroke();
      }
      c.fillStyle = '#ffd0f0'; c.beginPath(); c.arc(W * 0.55, H * 0.45, 6, 0, 7); c.fill();
    } else {                                                            // pale architectural print
      c.fillStyle = '#e8e6e0'; c.fillRect(0, 0, W, H);
      c.strokeStyle = '#6a6a66'; c.lineWidth = 1.5;
      for (let i = 0; i < 6; i++) { c.strokeRect(14 + i * 3, 30 + i * 5, W - 28 - i * 6, H - 70 - i * 6); }
      c.beginPath(); c.moveTo(14, H - 40); c.lineTo(W / 2, 24); c.lineTo(W - 14, H - 40); c.stroke();
    }
  }));
}
function exitTexture() {
  return cachedTex('exit', () => canvasTex(128, 48, (c, W, H) => {
    c.fillStyle = '#10a040'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#eaffea';
    c.fillRect(W * 0.62, 8, 26, 32); c.fillStyle = '#10a040'; c.fillRect(W * 0.62 + 5, 12, 16, 28);
    c.fillStyle = '#eaffea';                                              // running figure
    c.beginPath(); c.arc(36, 12, 5, 0, 7); c.fill();
    c.lineWidth = 5; c.strokeStyle = '#eaffea'; c.lineCap = 'round';
    c.beginPath(); c.moveTo(34, 18); c.lineTo(30, 30); c.lineTo(20, 40); c.moveTo(30, 30); c.lineTo(40, 38); c.lineTo(46, 44);
    c.moveTo(33, 21); c.lineTo(22, 24); c.moveTo(33, 21); c.lineTo(44, 26); c.stroke();
    c.beginPath(); c.moveTo(56, 24); c.lineTo(70, 24); c.moveTo(64, 18); c.lineTo(70, 24); c.lineTo(64, 30); c.stroke();
  }));
}
function signTexture(text) {
  return cachedTex('sign' + text, () => canvasTex(512, 140, (c, W, H) => {
    c.clearRect(0, 0, W, H);
    c.font = 'bold 96px Arial, Helvetica, sans-serif'; c.textBaseline = 'middle';
    c.fillStyle = '#4a3a2e'; c.fillText(text, 8, H / 2 + 4);
    c.fillStyle = '#6e5a48'; c.fillText(text, 4, H / 2);
    // emblem: a red three-bar "claw" mark
    const x0 = c.measureText(text).width + 30;
    c.fillStyle = '#b01818';
    for (let i = 0; i < 3; i++) { c.save(); c.translate(x0 + i * 18, 30); c.rotate(0.35); c.fillRect(0, 0, 10, 70); c.restore(); }
  }));
}

// ------------------------------------------------------------------ fake CCTV feeds
/**
 * One shared canvas holding every "camera" picture; screens show a part of it.
 * Redrawn a few times a second so the monitors flicker and things move.
 */
export class CCTVFeeds {
  constructor(n = 8) {
    this.n = n; this.cols = 4; this.rows = Math.ceil(n / 4);
    this.cw = 160; this.ch = 90;
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.cw * this.cols; this.canvas.height = this.ch * this.rows;
    this.ctx = this.canvas.getContext('2d');
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.material = new THREE.MeshBasicMaterial({ map: this.texture });
    this.t = 0; this.acc = 0;
    this.draw();
  }
  uv(i) {
    i %= this.n;
    const c = i % this.cols, r = Math.floor(i / this.cols);
    return [c / this.cols, 1 - (r + 1) / this.rows, (c + 1) / this.cols, 1 - r / this.rows];
  }
  update(dt) {
    this.t += dt; this.acc += dt;
    if (this.acc < 0.25) return;
    this.acc = 0; this.draw(); this.texture.needsUpdate = true;
  }
  draw() {
    const c = this.ctx, W = this.cw, H = this.ch, t = this.t;
    for (let i = 0; i < this.n; i++) {
      const ox = (i % this.cols) * W, oy = Math.floor(i / this.cols) * H;
      c.save(); c.translate(ox, oy); c.beginPath(); c.rect(0, 0, W, H); c.clip();
      const tint = ['#1a2a3a', '#20303a', '#1a2a30', '#2a2a3a'][i % 4];
      c.fillStyle = tint; c.fillRect(0, 0, W, H);
      // a corridor in perspective
      const vx = W * (0.4 + (i % 3) * 0.1), vy = H * 0.42;
      c.fillStyle = '#3a4a5a'; c.beginPath(); c.moveTo(0, H); c.lineTo(vx - 10, vy + 8); c.lineTo(vx + 10, vy + 8); c.lineTo(W, H); c.fill();
      c.strokeStyle = '#6a8aa0'; c.lineWidth = 1;
      for (const [x, y] of [[0, 0], [W, 0], [0, H], [W, H]]) { c.beginPath(); c.moveTo(x, y); c.lineTo(vx + (x ? 10 : -10), vy + (y ? 8 : -8)); c.stroke(); }
      c.strokeRect(vx - 10, vy - 8, 20, 16);
      for (let k = 1; k < 4; k++) { const f = k / 4; c.strokeStyle = 'rgba(160,200,220,0.25)'; c.strokeRect(vx - 10 - (vx - 10) * f, vy - 8 - (vy - 8) * f, 20 + (W - 20) * f, 16 + (H - 16) * f); }
      // something moving down the corridor now and then
      const phase = (t * 0.15 + i * 0.37) % 1;
      if (i % 3 !== 1 && phase < 0.6) {
        const f = phase / 0.6, x = vx + Math.sin(i * 3 + t * 0.5) * 20 * f, y = vy + (H - vy) * f * 0.8, s = 4 + f * 26;
        c.fillStyle = i % 2 ? '#0a0a0a' : '#3a0a0a';
        c.beginPath(); c.ellipse(x, y - s * 0.5, s * 0.28, s * 0.6, 0, 0, 7); c.fill();
        c.beginPath(); c.arc(x, y - s * 1.2, s * 0.2, 0, 7); c.fill();
      }
      // noise, scan lines and the time stamp
      for (let k = 0; k < 40; k++) { c.fillStyle = `rgba(255,255,255,${Math.random() * 0.12})`; c.fillRect(Math.random() * W, Math.random() * H, 2, 1); }
      c.fillStyle = 'rgba(0,0,0,0.18)'; for (let y = 0; y < H; y += 3) c.fillRect(0, y, W, 1);
      c.fillStyle = '#d8e8f0'; c.font = '9px monospace';
      const s = Math.floor(t) % 60, m = (Math.floor(t / 60) + 13) % 60;
      c.fillText(`CAM ${String(i + 1).padStart(2, '0')}  03:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`, 4, 11);
      if (Math.floor(t * 2) % 2) { c.fillStyle = '#ff2020'; c.beginPath(); c.arc(W - 8, 7, 3, 0, 7); c.fill(); }
      c.restore();
    }
  }
  dispose() { this.texture.dispose(); this.material.dispose(); }
}

function screenQuad(w, h, screens, feed) {
  const geo = new THREE.PlaneGeometry(w, h);
  if (screens && feed !== null && feed !== undefined) {
    const [u0, v0, u1, v1] = screens.uv(feed), uv = geo.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) ? u1 : u0, uv.getY(i) ? v1 : v0);
    return new THREE.Mesh(geo, screens.material);
  }
  return new THREE.Mesh(geo, workScreenMaterial());
}
let workMat = null;
function workScreenMaterial() {
  if (!workMat) workMat = new THREE.MeshBasicMaterial({ map: canvasTex(128, 80, (c, W, H) => {
    c.fillStyle = '#e8eef4'; c.fillRect(0, 0, W, H);
    c.fillStyle = '#2a5a9a'; c.fillRect(0, 0, W, 9);
    c.fillStyle = '#9aa8b8'; for (let y = 16; y < H - 6; y += 7) c.fillRect(6, y, 30 + (y * 37 % 80), 3);
  }) });
  return workMat;
}
