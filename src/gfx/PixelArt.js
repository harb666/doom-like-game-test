// A tiny pixel-art "paint program" used to draw every texture, sprite and weapon
// in code. Nothing is copied from any other game - all art is generated here.

import { seededRandom } from '../util.js';

function toRGB(c) { return [(c >> 16) & 255, (c >> 8) & 255, c & 255]; }
export function shadeColor(c, f) {
  const [r, g, b] = toRGB(c);
  const k = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
  return (k(r) << 16) | (k(g) << 8) | k(b);
}
export function mixColor(a, b, t) {
  const A = toRGB(a), B = toRGB(b);
  const m = (i) => Math.round(A[i] + (B[i] - A[i]) * t);
  return (m(0) << 16) | (m(1) << 8) | m(2);
}

export class PixelArt {
  constructor(w, h, seed = 1) {
    this.w = w; this.h = h;
    this.data = new Uint8ClampedArray(w * h * 4);
    this.rng = seededRandom(seed);
  }

  px(x, y, c, a = 255) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    this.data[i] = (c >> 16) & 255; this.data[i + 1] = (c >> 8) & 255; this.data[i + 2] = c & 255; this.data[i + 3] = a;
  }
  get(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return null;
    const i = (y * this.w + x) * 4;
    return this.data[i + 3] ? (this.data[i] << 16) | (this.data[i + 1] << 8) | this.data[i + 2] : null;
  }
  alpha(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return 0;
    return this.data[(y * this.w + x) * 4 + 3];
  }
  clear(x, y) { if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.data[(y * this.w + x) * 4 + 3] = 0; }

  fill(c) { this.rect(0, 0, this.w, this.h, c); }
  rect(x, y, w, h, c) {
    for (let j = Math.round(y); j < Math.round(y + h); j++)
      for (let i = Math.round(x); i < Math.round(x + w); i++) this.px(i, j, c);
  }
  /** Rectangle with a light top/left edge and a dark bottom/right edge (bevel). */
  bevel(x, y, w, h, c, depth = 1) {
    this.rect(x, y, w, h, c);
    const hi = shadeColor(c, 1.35), lo = shadeColor(c, 0.6);
    for (let d = 0; d < depth; d++) {
      this.rect(x + d, y + d, w - d * 2, 1, hi); this.rect(x + d, y + d, 1, h - d * 2, hi);
      this.rect(x + d, y + h - 1 - d, w - d * 2, 1, lo); this.rect(x + w - 1 - d, y + d, 1, h - d * 2, lo);
    }
  }
  ellipse(cx, cy, rx, ry, c) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.px(x, y, c);
      }
  }
  /** Ellipse with chunky 3-band shading, lit from the top-left. */
  blob(cx, cy, rx, ry, c, light = 1) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx, dy = (y + 0.5 - cy) / ry;
        const d = dx * dx + dy * dy;
        if (d > 1) continue;
        const l = -(dx * 0.55 + dy * 0.8) * light - d * 0.35;
        const f = l > 0.25 ? 1.3 : l > -0.3 ? 1.0 : l > -0.75 ? 0.72 : 0.5;
        this.px(x, y, shadeColor(c, f));
      }
  }
  line(x0, y0, x1, y1, c, thick = 1) {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1) * 2;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
      if (thick <= 1) this.px(Math.round(x), Math.round(y), c);
      else this.ellipse(x, y, thick / 2, thick / 2, c);
    }
  }
  /** Filled polygon, points = [[x,y],...] */
  poly(pts, c) {
    let minY = Infinity, maxY = -Infinity, minX = Infinity, maxX = -Infinity;
    for (const [x, y] of pts) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); minX = Math.min(minX, x); maxX = Math.max(maxX, x); }
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++)
      for (let x = Math.floor(minX); x <= Math.ceil(maxX); x++) {
        const px = x + 0.5, py = y + 0.5;
        let inside = false;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          const [xi, yi] = pts[i], [xj, yj] = pts[j];
          if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) inside = !inside;
        }
        if (inside) this.px(x, y, c);
      }
  }
  /** Add random brightness grain to every opaque pixel. */
  noise(amount = 0.12, x0 = 0, y0 = 0, w = this.w, h = this.h) {
    for (let y = y0; y < y0 + h; y++)
      for (let x = x0; x < x0 + w; x++) {
        const c = this.get(x, y);
        if (c === null) continue;
        this.px(x, y, shadeColor(c, 1 + (this.rng() - 0.5) * 2 * amount), this.alpha(x, y));
      }
  }
  /** Scatter darker/lighter speckles. */
  speckle(count, c, x0 = 0, y0 = 0, w = this.w, h = this.h) {
    for (let i = 0; i < count; i++) this.px(x0 + Math.floor(this.rng() * w), y0 + Math.floor(this.rng() * h), c);
  }
  /** Draw a dark outline around all opaque pixels (sprite readability). */
  outline(c = 0x080404) {
    const edge = [];
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        if (this.alpha(x, y)) continue;
        if (this.alpha(x + 1, y) || this.alpha(x - 1, y) || this.alpha(x, y + 1) || this.alpha(x, y - 1)) edge.push([x, y]);
      }
    for (const [x, y] of edge) this.px(x, y, c);
  }
  /** Mirror the left half onto the right half (for symmetric creatures). */
  mirrorX() {
    const half = Math.floor(this.w / 2);
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < half; x++) {
        const i = (y * this.w + x) * 4, j = (y * this.w + (this.w - 1 - x)) * 4;
        for (let k = 0; k < 4; k++) this.data[j + k] = this.data[i + k];
      }
  }
  copyFrom(other, dx = 0, dy = 0) {
    for (let y = 0; y < other.h; y++)
      for (let x = 0; x < other.w; x++) {
        const a = other.alpha(x, y);
        if (a) this.px(x + dx, y + dy, other.get(x, y), a);
      }
  }
  clone() { const p = new PixelArt(this.w, this.h); p.data.set(this.data); return p; }

  toCanvas() {
    const cv = document.createElement('canvas');
    cv.width = this.w; cv.height = this.h;
    const ctx = cv.getContext('2d');
    ctx.putImageData(new ImageData(this.data, this.w, this.h), 0, 0);
    return cv;
  }
}
