// Helpers shared by every model spec.
import { fbm, ridged, veins } from '../sdf.mjs';
export * from '../sdf.mjs';

/** '#rrggbb' or 0xrrggbb -> [r, g, b] in 0..1 (sRGB, converted to linear by the game). */
export function rgb(c) {
  if (typeof c === 'string') c = parseInt(c.replace('#', ''), 16);
  return [((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255];
}
export const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
export const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const smooth = (e0, e1, x) => { const t = clamp01((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };

/**
 * A sculpt part.
 *  color: base colour; opts.color2 + opts.mottle: noisy blend between two colours
 *  opts.veins: dark ridged lines; opts.noise: {amp, freq}: bumps on the surface
 */
export function part(shape, bone, color, opts = {}) {
  const c1 = rgb(color), c2 = opts.color2 ? rgb(opts.color2) : null, vc = opts.veinColor ? rgb(opts.veinColor) : null;
  const p = { shape, bone, blend: opts.blend ?? 0.02, piece: opts.piece, alsoIn: opts.alsoIn, grow: opts.grow, after: opts.after };
  if (opts.noise) {
    const { amp, freq, oct = 3, kind } = opts.noise;
    p.noise = { amp, fn: kind === 'ridged' ? (x, y, z) => ridged(x * freq, y * freq, z * freq) - 0.5 : kind === 'strands' ? (x, y, z) => fbm(x * freq, y * freq * 0.12, z * freq, 2) : (x, y, z) => fbm(x * freq, y * freq, z * freq, oct) };
  }
  p.colorAt = opts.colorAt || ((x, y, z) => {
    let c = c1;
    if (c2) {
      const m = opts.mottle || 12;
      c = mix(c1, c2, clamp01(fbm(x * m, y * m, z * m) * 1.4 + 0.5 + fbm(x * m * 4, y * m * 4, z * m * 4, 2) * 0.22));
    }
    if (vc) c = mix(c, vc, veins(x, y, z, opts.veinScale || 18) * (opts.veinAmount ?? 0.8));
    // fine blotches, like pores and uneven pigment
    const f = fbm(x * 90, y * 90, z * 90, 2) * 0.06;
    return [clamp01(c[0] * (1 + f)), clamp01(c[1] * (1 + f)), clamp01(c[2] * (1 + f))];
  });
  return p;
}

/** Mirror helper: build a part for the -x side ('L') and the +x side ('R'). */
export function both(fn) { return [fn(-1, 'L'), fn(1, 'R')]; }
export const X = (s, v) => s * v;
