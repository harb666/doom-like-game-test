// High-resolution painted details for sculpted models (brows, eye makeup, lips,
// clothing details). The painting works as a "multiply" layer over the model's
// own colours, and is positioned using the landmark map the model generator
// saved, so every stroke lands exactly on the sculpted face.

import * as THREE from 'three';

/** Build a function mapping front-view model coordinates (x, y) to canvas pixels. */
function mapper(lookup, W, H) {
  const { x0, y0, step, rows } = lookup;
  const nx = rows[0].length, ny = rows.length;
  return (x, y) => {
    const fi = Math.max(0, Math.min(nx - 1.001, (x - x0) / step)), fj = Math.max(0, Math.min(ny - 1.001, (y - y0) / step));
    const i = Math.floor(fi), j = Math.floor(fj), a = fi - i, b = fj - j;
    const q = (k) => (rows[j][i][k] * (1 - a) + rows[j][i + 1][k] * a) * (1 - b) + (rows[j + 1][i][k] * (1 - a) + rows[j + 1][i + 1][k] * a) * b;
    return [q(0) * W, (1 - q(1)) * H];
  };
}

const rgbStr = (r, g, b, a = 1) => `rgba(${Math.round(r * 255)},${Math.round(g * 255)},${Math.round(b * 255)},${a})`;

function path(c, P, pts, close = true) {
  c.beginPath();
  pts.forEach(([x, y], i) => { const [px, py] = P(x, y); if (i) c.lineTo(px, py); else c.moveTo(px, py); });
  if (close) c.closePath();
}
/** Smooth curve through points (Catmull-Rom sampled in model space). */
function curve(pts, n = 8) {
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let k = 0; k < n; k++) {
      const t = k / n, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map(d => 0.5 * ((2 * p1[d]) + (-p0[d] + p2[d]) * t + (2 * p0[d] - 5 * p1[d] + 4 * p2[d] - p3[d]) * t2 + (-p0[d] + 3 * p1[d] - 3 * p2[d] + p3[d]) * t3)));
    }
  }
  out.push(pts[pts.length - 1]);
  return out;
}
function glow(c, P, x, y, rx, color) {
  const [px, py] = P(x, y), [ex] = P(x + rx, y);
  const r = Math.max(2, Math.abs(ex - px));
  const g = c.createRadialGradient(px, py, 0, px, py, r);
  g.addColorStop(0, color); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(px - r, py - r, r * 2, r * 2);
}

const PAINTERS = {
  ally: {
    face(c, W, H, P) {
      for (const s of [-1, 1]) {
        // soft contour and blush
        glow(c, P, s * 0.05, 1.583, 0.02, rgbStr(0.84, 0.72, 0.68, 0.55));
        glow(c, P, s * 0.041, 1.599, 0.017, rgbStr(0.98, 0.8, 0.78, 0.55));
        // smoky eyeshadow
        glow(c, P, s * 0.032, 1.6335, 0.016, rgbStr(0.62, 0.46, 0.42, 0.8));
        glow(c, P, s * 0.042, 1.632, 0.01, rgbStr(0.55, 0.4, 0.38, 0.6));
        // brows: full, dark, sharply arched
        const top = curve([[s * 0.0115, 1.6452], [s * 0.028, 1.6505], [s * 0.043, 1.6528], [s * 0.058, 1.6465]]);
        const bot = curve([[s * 0.058, 1.6452], [s * 0.043, 1.6488], [s * 0.028, 1.6466], [s * 0.0115, 1.6418]]);
        path(c, P, [...top, ...bot]); c.fillStyle = rgbStr(0.2, 0.14, 0.11, 0.97); c.fill();
        c.strokeStyle = rgbStr(0.16, 0.11, 0.09, 0.6); c.lineWidth = 1;
        for (let i = 0; i < 26; i++) {   // hair strokes
          const t = i / 25, x = s * (0.012 + t * 0.045), y = 1.6435 + Math.sin(Math.min(1, t * 1.25) * Math.PI) * 0.006;
          path(c, P, [[x, y - 0.0015], [x + s * 0.004, y + 0.0022]], false); c.stroke();
        }
        // upper lash line with a sharp wing
        const lash = curve([[s * 0.0162, 1.6262], [s * 0.024, 1.6298], [s * 0.0305, 1.6311], [s * 0.038, 1.6302], [s * 0.0448, 1.628], [s * 0.053, 1.6328]]);
        path(c, P, lash, false);
        c.strokeStyle = rgbStr(0.08, 0.05, 0.05); c.lineWidth = Math.max(2, W * 0.0028); c.lineCap = 'round'; c.stroke();
        c.lineWidth = 1.2;
        for (let i = 0; i < 14; i++) {    // individual lashes
          const t = i / 13, x = s * (0.018 + t * 0.026), y = 1.6268 + Math.sin(t * Math.PI) * 0.0045;
          path(c, P, [[x, y], [x + s * 0.0022, y + 0.0028]], false); c.stroke();
        }
        // soft lower liner
        path(c, P, curve([[s * 0.019, 1.6222], [s * 0.03, 1.6212], [s * 0.043, 1.6232]]), false);
        c.strokeStyle = rgbStr(0.4, 0.28, 0.25, 0.8); c.lineWidth = Math.max(1, W * 0.0012); c.stroke();
        // nose shading
        glow(c, P, s * 0.009, 1.61, 0.006, rgbStr(0.86, 0.76, 0.72, 0.5));
      }
      // lips: glossy mauve with a cupid's bow
      const upper = [...curve([[-0.0185, 1.5604], [-0.012, 1.5644], [-0.0045, 1.5672], [0, 1.5657], [0.0045, 1.5672], [0.012, 1.5644], [0.0185, 1.5604]]),
        ...curve([[0.0185, 1.5604], [0.009, 1.5596], [0, 1.5594], [-0.009, 1.5596], [-0.0185, 1.5604]])];
      path(c, P, upper); c.fillStyle = rgbStr(0.72, 0.47, 0.6); c.fill();
      const lower = [...curve([[-0.0185, 1.5604], [-0.009, 1.5596], [0, 1.5594], [0.009, 1.5596], [0.0185, 1.5604]]),
        ...curve([[0.0185, 1.5604], [0.012, 1.5552], [0, 1.5503], [-0.012, 1.5552], [-0.0185, 1.5604]])];
      path(c, P, lower); c.fillStyle = rgbStr(0.78, 0.52, 0.64); c.fill();
      glow(c, P, 0.0, 1.5535, 0.007, rgbStr(1, 0.9, 0.93, 0.55));             // gloss
      path(c, P, curve([[-0.0185, 1.5604], [-0.009, 1.5597], [0, 1.5596], [0.009, 1.5597], [0.0185, 1.5604]]), false);
      c.strokeStyle = rgbStr(0.35, 0.16, 0.2); c.lineWidth = Math.max(1.5, W * 0.0016); c.stroke();
    },
    skin(c, W, H, P) {
      // black top showing through the open zip, dark zip teeth and seams
      const v = [];
      for (let y = 1.43; y >= 1.13; y -= 0.01) v.push([-(y - 1.13) * 0.2, y]);
      for (let y = 1.13; y <= 1.43; y += 0.01) v.push([(y - 1.13) * 0.2, y]);
      path(c, P, v); c.fillStyle = rgbStr(0.16, 0.16, 0.17); c.fill();
      for (const s of [-1, 1]) {
        path(c, P, [[0, 1.13], [s * 0.061, 1.435]], false); c.strokeStyle = rgbStr(0.62, 0.64, 0.68); c.lineWidth = 2; c.stroke();
        path(c, P, [[s * 0.075, 1.335], [s * 0.16, 1.29]], false); c.strokeStyle = rgbStr(0.75, 0.77, 0.8); c.lineWidth = 1.5; c.stroke();
      }
    },
  },
};

const cache = new Map();
/** Painted texture for (model, material), or null if that material has no painting. */
export function paintedFor(model, material, lookup) {
  const painter = PAINTERS[model]?.[material];
  if (!painter || !lookup) return null;
  const key = model + ':' + material;
  if (cache.has(key)) return cache.get(key);
  const W = material === 'face' ? 1024 : 512, H = material === 'face' ? 512 : 512;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const c = cv.getContext('2d');
  c.fillStyle = '#fff'; c.fillRect(0, 0, W, H);
  painter(c, W, H, mapper(lookup, W, H));
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  cache.set(key, t);
  return t;
}
