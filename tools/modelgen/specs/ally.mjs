// VEX - the companion. A realistic-proportioned young woman: dark hair in a
// sleek high ponytail with a long wavy lock over one shoulder, dramatic eye
// makeup, glossy mauve lips, a grey half-zip over a black top, black leggings
// and white trainers. Faces +z, feet at y = 0, height 1.74 m.
import { V, ellipsoid, sphere, limb, rbox, chain, part, both, rgb, mix, smooth, fbm, clamp01 } from './common.mjs';

const SKIN = '#dfae93', JACKET = '#8b9199', TOP = '#111114', LEGS = '#18181c', SHOE = '#e6e6ea', LIP = '#a9586a', HAIR = '#1b1411';

export default function ally() {
  const bones = [
    { name: 'root', parent: null, pos: V(0, 0, 0) },
    { name: 'hips', parent: 'root', pos: V(0, 0.9, 0) },
    { name: 'spine', parent: 'hips', pos: V(0, 1.02, 0) },
    { name: 'chest', parent: 'spine', pos: V(0, 1.2, 0) },
    { name: 'neck', parent: 'chest', pos: V(0, 1.44, -0.005) },
    { name: 'head', parent: 'neck', pos: V(0, 1.535, 0.005) },
    { name: 'shL', parent: 'chest', pos: V(-0.165, 1.385, -0.005) }, { name: 'elL', parent: 'shL', pos: V(-0.225, 1.125, -0.01) }, { name: 'handL', parent: 'elL', pos: V(-0.262, 0.875, 0.012) },
    { name: 'shR', parent: 'chest', pos: V(0.165, 1.385, -0.005) }, { name: 'elR', parent: 'shR', pos: V(0.225, 1.125, -0.01) }, { name: 'handR', parent: 'elR', pos: V(0.262, 0.875, 0.012) },
    { name: 'thL', parent: 'hips', pos: V(-0.088, 0.88, 0) }, { name: 'knL', parent: 'thL', pos: V(-0.098, 0.48, 0.012) }, { name: 'ftL', parent: 'knL', pos: V(-0.1, 0.085, -0.005) },
    { name: 'thR', parent: 'hips', pos: V(0.088, 0.88, 0) }, { name: 'knR', parent: 'thR', pos: V(0.098, 0.48, 0.012) }, { name: 'ftR', parent: 'knR', pos: V(0.1, 0.085, -0.005) },
    { name: 'pony0', parent: 'head', pos: V(0, 1.73, -0.065) }, { name: 'pony1', parent: 'pony0', pos: V(0, 1.68, -0.15) },
    { name: 'pony2', parent: 'pony1', pos: V(0.01, 1.52, -0.165) }, { name: 'pony3', parent: 'pony2', pos: V(-0.005, 1.35, -0.155) },
    { name: 'lock0', parent: 'head', pos: V(-0.07, 1.62, 0.005) }, { name: 'lock1', parent: 'lock0', pos: V(-0.122, 1.45, 0.05) }, { name: 'lock2', parent: 'lock1', pos: V(-0.118, 1.27, 0.08) },
  ];

  const clothColor = (base, opts = {}) => (x, y, z) => {
    let c = rgb(base);
    const n = fbm(x * 90, y * 90, z * 90, 2) * 0.05;            // fabric texture
    c = c.map(v => v * (1 + n));
    return c;
  };
  const skinColor = (x, y, z) => {
    let c = rgb(SKIN);
    c = mix(c, rgb('#d49c84'), clamp01(fbm(x * 30, y * 30, z * 30) * 0.8 + 0.3) * 0.35);
    return c;
  };

  const parts = [
    // ---------------- torso (jacket over hips/waist/chest)
    part(ellipsoid(V(0, 0.905, -0.005), V(0.162, 0.115, 0.108)), 'hips', LEGS, { colorAt: (x, y, z) => clothColor(y > 0.945 ? JACKET : LEGS)(x, y, z) }),
    part(ellipsoid(V(0, 0.965, -0.004), V(0.15, 0.07, 0.098)), 'hips', JACKET, { colorAt: (x, y, z) => clothColor(y > 0.945 ? JACKET : LEGS)(x, y, z), blend: 0.03 }),
    part(ellipsoid(V(0, 1.06, 0.0), V(0.128, 0.12, 0.086)), 'spine', JACKET, { colorAt: clothColor(JACKET), blend: 0.05 }),
    part(ellipsoid(V(0, 1.235, -0.004), V(0.148, 0.145, 0.098)), 'chest', JACKET, { colorAt: clothColor(JACKET), blend: 0.05 }),
    ...both(s => part(ellipsoid(V(s * 0.062, 1.245, 0.058), V(0.064, 0.058, 0.055)), 'chest', JACKET, { colorAt: clothColor(JACKET), blend: 0.04 })),
    ...both(s => part(ellipsoid(V(s * 0.148, 1.375, -0.008), V(0.07, 0.052, 0.062)), 'chest', JACKET, { colorAt: clothColor(JACKET), blend: 0.045 })),
    part(limb(V(0, 1.36, -0.012), V(0, 1.43, -0.01), 0.062, 0.058), 'neck', JACKET, { colorAt: clothColor(JACKET), blend: 0.02 }),  // raised collar
    part(limb(V(0, 1.38, -0.008), V(0, 1.56, 0.005), 0.049, 0.043), 'neck', SKIN, { colorAt: skinColor, blend: 0.015, alsoIn: ['head'] }),
    // ---------------- arms (jacket sleeves) + hands
    ...both(s => part(limb(V(s * 0.168, 1.375, -0.006), V(s * 0.225, 1.125, -0.01), 0.046, 0.037), s < 0 ? 'shL' : 'shR', JACKET, { colorAt: clothColor(JACKET), blend: 0.03 })),
    ...both(s => part(limb(V(s * 0.225, 1.125, -0.01), V(s * 0.258, 0.9, 0.01), 0.036, 0.029), s < 0 ? 'elL' : 'elR', JACKET, { colorAt: clothColor(JACKET), blend: 0.02, alsoIn: ['hands'] })),
    ...both(s => part(limb(V(s * 0.259, 0.9, 0.011), V(s * 0.263, 0.868, 0.013), 0.024, 0.022), s < 0 ? 'handL' : 'handR', SKIN, { colorAt: skinColor, piece: 'hands', blend: 0.01 })),
    ...both(s => part(ellipsoid(V(s * 0.267, 0.83, 0.016), V(0.017, 0.042, 0.035), [0, 0, s * 0.08]), s < 0 ? 'handL' : 'handR', SKIN, { colorAt: skinColor, piece: 'hands', blend: 0.012 })),
    ...both(s => part(limb(V(s * 0.262, 0.85, 0.045), V(s * 0.255, 0.8, 0.062), 0.009, 0.007), s < 0 ? 'handL' : 'handR', SKIN, { colorAt: skinColor, piece: 'hands', blend: 0.008 })), // thumb
    ...[0, 1, 2, 3].flatMap(i => both(s => part(limb(V(s * 0.268, 0.795, 0.036 - i * 0.017), V(s * 0.262, 0.748 + Math.abs(i - 1.5) * 0.008, 0.038 - i * 0.017), 0.0075, 0.0058), s < 0 ? 'handL' : 'handR', SKIN, { colorAt: skinColor, piece: 'hands', blend: 0.006 }))),
    // ---------------- legs (leggings) + trainers
    ...both(s => part(limb(V(s * 0.088, 0.9, -0.005), V(s * 0.098, 0.49, 0.012), 0.083, 0.052), s < 0 ? 'thL' : 'thR', LEGS, { colorAt: clothColor(LEGS), blend: 0.05 })),
    ...both(s => part(limb(V(s * 0.098, 0.48, 0.012), V(s * 0.1, 0.105, -0.008), 0.05, 0.032), s < 0 ? 'knL' : 'knR', LEGS, { colorAt: clothColor(LEGS), blend: 0.03 })),
    ...both(s => part(ellipsoid(V(s * 0.1, 0.35, -0.028), V(0.042, 0.085, 0.042)), s < 0 ? 'knL' : 'knR', LEGS, { colorAt: clothColor(LEGS), blend: 0.03 })),
    ...both(s => part(rbox(V(s * 0.1, 0.045, 0.045), V(0.045, 0.045, 0.125), 0.035), s < 0 ? 'ftL' : 'ftR', SHOE, { blend: 0.015, colorAt: (x, y) => y < 0.022 ? rgb('#9a9aa0') : rgb(SHOE) })),

    // ---------------- head (fine detail piece)
    part(ellipsoid(V(0, 1.648, -0.012), V(0.077, 0.097, 0.094)), 'head', SKIN, { colorAt: skinColor, piece: 'head', blend: 0.02 }),
    part(ellipsoid(V(0, 1.6, 0.02), V(0.058, 0.078, 0.07)), 'head', SKIN, { colorAt: skinColor, piece: 'head', blend: 0.03 }),
    part(ellipsoid(V(0, 1.527, 0.058), V(0.025, 0.021, 0.024)), 'head', SKIN, { colorAt: skinColor, piece: 'head', blend: 0.026 }),
    // muscles around the mouth: fills the gap between cheeks and lips (no "muzzle")
    part(ellipsoid(V(0, 1.565, 0.068), V(0.036, 0.026, 0.026)), 'head', SKIN, { colorAt: skinColor, piece: 'head', blend: 0.028 }),
    ...both(s => part(ellipsoid(V(s * 0.03, 1.575, 0.058), V(0.022, 0.024, 0.022)), 'head', SKIN, { colorAt: skinColor, piece: 'head', blend: 0.025 })),
    ...both(s => part(limb(V(s * 0.056, 1.588, -0.012), V(s * 0.014, 1.532, 0.05), 0.017, 0.014), 'head', SKIN, { colorAt: skinColor, piece: 'head', blend: 0.022 })),
    ...both(s => part(ellipsoid(V(s * 0.041, 1.605, 0.058), V(0.021, 0.013, 0.019)), 'head', SKIN, { colorAt: skinColor, piece: 'head', blend: 0.018 })),
    part(ellipsoid(V(0, 1.648, 0.068), V(0.057, 0.011, 0.022)), 'head', SKIN, { colorAt: skinColor, piece: 'head', blend: 0.02 }),
    part(limb(V(0, 1.642, 0.084), V(0, 1.599, 0.1045), 0.0072, 0.0088), 'head', SKIN, { colorAt: skinColor, piece: 'head', blend: 0.008 }),
    part(sphere(V(0, 1.5935, 0.1015), 0.0092), 'head', SKIN, { colorAt: skinColor, piece: 'head', blend: 0.01 }),
    ...both(s => part(ellipsoid(V(s * 0.0115, 1.589, 0.092), V(0.008, 0.0062, 0.0075)), 'head', SKIN, { colorAt: skinColor, piece: 'head', blend: 0.006 })),
    part(ellipsoid(V(0, 1.5648, 0.087), V(0.0195, 0.0055, 0.0085)), 'head', LIP, { piece: 'head', blend: 0.011, colorAt: skinColor }),
    part(ellipsoid(V(0, 1.5548, 0.0862), V(0.0172, 0.0068, 0.0086)), 'head', LIP, { piece: 'head', blend: 0.011, colorAt: skinColor }),
    ...both(s => part(ellipsoid(V(s * 0.078, 1.618, -0.008), V(0.007, 0.027, 0.017)), 'head', SKIN, { colorAt: skinColor, piece: 'head', blend: 0.008 })),
    // eyelids: the upper lid covers the top third of the eye (relaxed, confident look)
    ...both(s => part(ellipsoid(V(s * 0.0302, 1.6372, 0.0802), V(0.0158, 0.0064, 0.0106), [0.25, 0, s * -0.12]), 'head', SKIN, { colorAt: skinColor, piece: 'head', blend: 0.003, after: true })),
    ...both(s => part(ellipsoid(V(s * 0.0302, 1.6178, 0.0802), V(0.0146, 0.0034, 0.0096), [-0.2, 0, 0]), 'head', SKIN, { colorAt: skinColor, piece: 'head', blend: 0.003, after: true })),

    // ---------------- hair: sleek cap, high ponytail, long lock over the shoulder
    part(ellipsoid(V(0, 1.652, -0.016), V(0.083, 0.104, 0.1)), 'head', HAIR, { piece: 'hair', blend: 0.01, noise: { amp: 0.0012, freq: 260, kind: 'strands' } }),
    part(sphere(V(0, 1.728, -0.062), 0.03), 'pony0', HAIR, { piece: 'hair', blend: 0.015 }),
    part(chain([V(0, 1.735, -0.07), V(0.004, 1.72, -0.12), V(0, 1.67, -0.155)], [0.03, 0.034, 0.036]), 'pony0', HAIR, { piece: 'hair', blend: 0.02, noise: { amp: 0.003, freq: 140, kind: 'strands' } }),
    part(chain([V(0, 1.67, -0.155), V(0.012, 1.6, -0.168), V(0.008, 1.52, -0.168)], [0.036, 0.035, 0.033]), 'pony1', HAIR, { piece: 'hair', blend: 0.02, noise: { amp: 0.003, freq: 140, kind: 'strands' } }),
    part(chain([V(0.008, 1.52, -0.168), V(-0.01, 1.44, -0.162), V(-0.004, 1.36, -0.155)], [0.033, 0.029, 0.025]), 'pony2', HAIR, { piece: 'hair', blend: 0.02, noise: { amp: 0.003, freq: 140, kind: 'strands' } }),
    part(chain([V(-0.004, 1.36, -0.155), V(0.012, 1.27, -0.145), V(0.0, 1.19, -0.135)], [0.025, 0.02, 0.008]), 'pony3', HAIR, { piece: 'hair', blend: 0.02, noise: { amp: 0.0025, freq: 140, kind: 'strands' } }),
    part(chain([V(-0.066, 1.64, 0.0), V(-0.083, 1.57, 0.02), V(-0.122, 1.46, 0.048)], [0.02, 0.023, 0.024]), 'lock0', HAIR, { piece: 'hair', blend: 0.02, noise: { amp: 0.0025, freq: 150, kind: 'strands' } }),
    part(chain([V(-0.122, 1.46, 0.048), V(-0.136, 1.37, 0.07), V(-0.118, 1.27, 0.082)], [0.024, 0.023, 0.021]), 'lock1', HAIR, { piece: 'hair', blend: 0.02, noise: { amp: 0.0025, freq: 150, kind: 'strands' } }),
    part(chain([V(-0.118, 1.27, 0.082), V(-0.13, 1.18, 0.083), V(-0.118, 1.1, 0.078)], [0.021, 0.016, 0.006]), 'lock2', HAIR, { piece: 'hair', blend: 0.02, noise: { amp: 0.002, freq: 150, kind: 'strands' } }),
  ];
  // hair colour: near-black with glossy strands
  // (strands follow the head's curve from the hairline back over the crown and down)
  for (const p of parts) if (p.piece === 'hair') p.colorAt = (x, y, z) => {
    const a = Math.atan2(y - 1.64, z + 0.02), r = Math.hypot(y - 1.64, z + 0.02);
    return mix(rgb(HAIR), rgb('#4a3830'), clamp01(fbm(x * 180, a * 2.2, r * 60, 2) * 1.2 + 0.1) * 0.5);
  };

  const subs = [
    // eye sockets, mouth line, the face cut out of the hair cap
    ...both(s => ({ shape: ellipsoid(V(s * 0.03, 1.627, 0.086), V(0.019, 0.012, 0.016)), blend: 0.008, pieces: ['head'] })),
    { shape: ellipsoid(V(0, 1.575, 0.078), V(0.074, 0.1, 0.086)), blend: 0.012, pieces: ['hair'] },
    ...both(s => ({ shape: ellipsoid(V(s * 0.084, 1.595, -0.004), V(0.022, 0.045, 0.03)), blend: 0.01, pieces: ['hair'] })),
  ];

  // ---------------- painted-on details
  const decals = [];
  const onHead = Object.assign((f) => f, {});
  const brows = (x, y, z) => {
    const xs = Math.abs(x);
    if (z < 0.05 || xs < 0.011 || xs > 0.058) return null;
    const t = (xs - 0.011) / 0.047;
    const cy = 1.6435 + 0.0095 * Math.sin(Math.PI * Math.min(1, t * 1.25)) - (t > 0.8 ? (t - 0.8) * 0.02 : 0);
    const w = 0.0046 * (1 - t * 0.5);
    const d = Math.abs(y - cy);
    return d < w ? [rgb('#24160f'), 0.95 * smooth(w, w * 0.4, d)] : null;
  };
  // (brows is painted as a texture now)
  const mouthLine = (x, y, z) => (z > 0.085 && Math.abs(x) < 0.0185 && Math.abs(y - (1.5597 + 0.0012 * (1 - (x / 0.0185) ** 2))) < 0.0008) ? [rgb('#4a1e26'), 0.85] : null;
  // (mouthLine is painted as a texture now)
  const eyes = (x, y, z) => {
    const xs = Math.abs(x);
    if (z < 0.06 || xs > 0.062 || y < 1.612 || y > 1.645) return null;
    const u = (xs - 0.0302) / 0.0165;                              // -1 .. 1 across the eye
    const lid = 1.6292 + 0.0024 * (1 - u * u);                      // edge of the upper lid
    if (Math.abs(u) < 1.05 && y > lid - 0.0011 && y < lid + 0.0016) return [rgb('#0a0605'), 0.95];   // lash line
    if (u > 0.9 && u < 1.75 && Math.abs(y - (1.6292 + (u - 0.9) * 0.0055)) < 0.0011) return [rgb('#0a0605'), 0.95]; // wing
    if (Math.abs(u) < 1.2 && y > lid && y < 1.6395) return [rgb('#6e4436'), 0.42 * smooth(1.6395, 1.631, y)];      // smoky shadow
    if (Math.abs(u) < 0.95 && Math.abs(y - (1.6212 - 0.0012 * (1 - u * u))) < 0.0007) return [rgb('#3a2620'), 0.45];  // soft lower liner
    return null;
  };
  // (eyes is painted as a texture now)
  const contour = (x, y, z) => {
    if (z < 0.02 || y > 1.61 || y < 1.54) return null;
    const xs = Math.abs(x);
    const k = smooth(0.035, 0.058, xs) * smooth(1.54, 1.575, y) * (1 - smooth(1.595, 1.61, y));
    return k > 0 ? [rgb('#b87a64'), 0.35 * k] : null;
  };
  // (contour is painted as a texture now)
  const blush = (x, y, z) => {
    const d = Math.hypot(Math.abs(x) - 0.042, y - 1.598);
    return z > 0.05 && d < 0.02 ? [rgb('#d98a80'), 0.25 * smooth(0.02, 0.005, d)] : null;
  };
  // (blush is painted as a texture now)
  const top = (x, y, z) => {
    // open zip showing the black top, with silver zip edges
    if (z < 0.02 || y < 1.1 || y > 1.43) return null;
    const half = Math.max(0, (y - 1.13) * 0.2);
    const xs = Math.abs(x);
    if (xs < half) return [rgb(TOP), 1];
    if (xs < half + 0.005) return [rgb('#a2a8b0'), 0.55];
    return null;
  };
  // (top is painted as a texture now)
  const seams = (x, y, z) => {
    // reflective seam lines across the chest and down the sleeves
    const xs = Math.abs(x);
    if (z > 0.02 && xs > 0.07 && xs < 0.16 && Math.abs(y - (1.34 - (xs - 0.07) * 0.5)) < 0.003) return [rgb('#d6d9dd'), 0.85];
    return null;
  };
  // (seams is painted as a texture now)
  const tattoo = (x, y, z) => {
    const d = Math.hypot(x + 0.034, y - 1.455, (z - 0.03) * 0.6);
    if (d > 0.02) return null;
    const petals = fbm((x + 0.034) * 400, (y - 1.455) * 400, z * 50, 2);
    return petals > -0.05 ? [rgb('#2c2f36'), 0.8 * smooth(0.02, 0.012, d)] : null;
  };
  tattoo.pieces = ['body', 'head']; decals.push(tattoo);
  void onHead;

  return {
    name: 'ally', bones, parts, subs, decals,
    pieces: [
      { name: 'body', voxel: 0.0165, material: 'skin', uv: { cx: 0, cz: 0, y0: 0.85, y1: 1.5 }, uvGrid: { x0: -0.2, x1: 0.2, y0: 1.0, y1: 1.46, step: 0.01, zFront: 0.3, zBack: -0.05 } },
      { name: 'head', voxel: 0.0036, material: 'face', ao: 0.6, uv: { cx: 0, cz: -0.012, y0: 1.44, y1: 1.8 }, uvGrid: { x0: -0.075, x1: 0.075, y0: 1.5, y1: 1.7, step: 0.0025, zFront: 0.2, zBack: 0.0 }, clip: { min: [-0.12, 1.462, -0.13], max: [0.12, 1.78, 0.14] }, inflate: 0.0012 },
      { name: 'hands', voxel: 0.0056, material: 'skin', clip: { min: [-0.32, 0.72, -0.03], max: [0.32, 0.9, 0.09] }, inflate: 0.001, skinSoft: 0.012 },
      { name: 'hair', voxel: 0.0068, material: 'hair', skinSoft: 0.03 },
    ],
    attachments: [
      ...both(s => ({ kind: 'eye', bone: 'head', pos: [s * 0.0302, 1.6258, 0.0752], r: 0.0124, iris: '#7fa3b8' })),
      { kind: 'gun', bone: 'handR', pos: [0.262, 0.77, 0.05], size: [0.035, 0.24, 0.06] },
    ],
  };
}
