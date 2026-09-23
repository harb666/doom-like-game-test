// Sculpted monster models. Original designs for this game.
// Every model faces +z with its feet at y = 0.
import { V, ellipsoid, sphere, limb, rbox, chain, part, both, rgb, mix, smooth, fbm, clamp01 } from './common.mjs';
import { humanRig, J } from './rig.mjs';

const PI = Math.PI;
const side = (s, l, r) => (s < 0 ? l : r);

// ------------------------------------------------------------------ shared bits
/** Teeth: a row of cones along an arc (attachments on `bone`). */
function teeth(bone, n, cx, y, cz, rx, rz, up, r = 0.008, h = 0.03, color = '#e2d8bc', spread = 2.2) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = (i / (n - 1) - 0.5) * spread;
    out.push({ kind: 'cone', bone, pos: [cx + Math.sin(a) * rx, y, cz + Math.cos(a) * rz], r: r * (1 - Math.abs(a) * 0.2), h: h * (1 - Math.abs(a) * 0.25), rot: [up ? 0 : PI, 0, 0], color });
  }
  return out;
}
function claws(bone, x, y, z, n = 3, len = 0.08, r = 0.01, color = '#d8ccb0', spread = 0.025) {
  const out = [];
  for (let i = 0; i < n; i++) out.push({ kind: 'cone', bone, pos: [x + (i - (n - 1) / 2) * spread, y, z], r, h: len, rot: [PI - 0.25, 0, 0], color });
  return out;
}

// ------------------------------------------------------------------ HUSK
function husk() {
  const d = { hip: 0.95, spine: 1.08, chest: 1.3, neck: 1.55, head: 1.64, headZ: 0.02, jaw: [0, 1.6, 0.06], sh: [0.19, 1.49, 0], el: [0.26, 1.17, 0], hand: [0.3, 0.86, 0.03], th: [0.09, 0.93, 0], kn: [0.1, 0.5, 0.03], ft: [0.1, 0.08, 0] };
  const SKIN = { color2: '#4c583c', mottle: 14, veinColor: '#3a1a18', veinAmount: 0.6, noise: { amp: 0.004, freq: 40 } };
  const skinC = '#7c8866';
  const suit = (x, y, z) => mix(rgb('#9a5220'), rgb('#4a2410'), clamp01(fbm(x * 16, y * 16, z * 16) * 1.3 + 0.25));
  // the jumpsuit is torn open across the chest and belly
  const torso = (x, y, z) => (z > 0.03 && fbm(x * 9, y * 9, z * 9) > -0.15 && y > 1.03) ? mix(rgb(skinC), rgb('#4c583c'), clamp01(fbm(x * 14, y * 14, z * 14) + 0.4)) : suit(x, y, z);
  const parts = [
    part(ellipsoid(V(0, 0.97, 0), V(0.15, 0.11, 0.1)), 'hips', '#9a5220', { colorAt: suit, blend: 0.04 }),
    part(ellipsoid(V(0, 1.13, 0), V(0.11, 0.12, 0.08)), 'spine', skinC, { colorAt: torso, blend: 0.05 }),
    part(ellipsoid(V(0, 1.33, 0), V(0.15, 0.16, 0.1)), 'chest', skinC, { colorAt: torso, blend: 0.05, noise: { amp: 0.004, freq: 30 } }),
    ...both(s => part(ellipsoid(V(s * 0.16, 1.47, 0), V(0.07, 0.05, 0.06)), 'chest', '#9a5220', { colorAt: suit, blend: 0.04 })),
    // ribs pushing through the skin
    ...[0, 1, 2, 3, 4].flatMap(i => both(s => part(chain([V(s * 0.13, 1.4 - i * 0.05, 0.0), V(s * 0.08, 1.38 - i * 0.05, 0.085), V(s * 0.02, 1.36 - i * 0.05, 0.1)], [0.011, 0.011, 0.009]), 'chest', '#b8b496', { blend: 0.012 }))),
    part(limb(V(0, 1.44, -0.01), V(0, 1.62, 0.04), 0.047, 0.04), 'neck', skinC, { ...SKIN, blend: 0.02 }),
    // long skull, heavy brow, sunken cheeks
    part(ellipsoid(V(0, 1.72, 0.0), V(0.075, 0.1, 0.095)), 'head', skinC, { ...SKIN, blend: 0.02 }),
    part(ellipsoid(V(0, 1.65, 0.05), V(0.062, 0.075, 0.062)), 'head', skinC, { ...SKIN, blend: 0.03 }),
    part(ellipsoid(V(0, 1.71, 0.085), V(0.068, 0.016, 0.028)), 'head', skinC, { ...SKIN, blend: 0.02 }),
    ...both(s => part(ellipsoid(V(s * 0.05, 1.66, 0.065), V(0.022, 0.016, 0.02)), 'head', skinC, { ...SKIN, blend: 0.015 })),
    part(ellipsoid(V(0, 1.57, 0.075), V(0.05, 0.022, 0.05)), 'jaw', skinC, { ...SKIN, blend: 0.02 }),
    // arms
    ...both(s => part(limb(J(s, d.sh), J(s, d.el), 0.045, 0.034), side(s, 'shL', 'shR'), skinC, { ...SKIN, blend: 0.03 })),
    ...both(s => part(ellipsoid(V(s * 0.215, 1.36, 0.01), V(0.04, 0.08, 0.04)), side(s, 'shL', 'shR'), skinC, { ...SKIN, blend: 0.03 })),
    ...both(s => part(limb(J(s, d.el), J(s, d.hand), 0.034, 0.026), side(s, 'elL', 'elR'), skinC, { ...SKIN, blend: 0.025 })),
    ...both(s => part(ellipsoid(V(s * 0.305, 0.81, 0.035), V(0.025, 0.055, 0.045)), side(s, 'handL', 'handR'), skinC, { ...SKIN, blend: 0.015 })),
    ...[0, 1, 2].flatMap(i => both(s => part(limb(V(s * 0.305, 0.78, 0.01 + i * 0.025), V(s * 0.31, 0.7, 0.02 + i * 0.03), 0.009, 0.007), side(s, 'handL', 'handR'), skinC, { blend: 0.008 }))),
    // legs in the torn suit
    ...both(s => part(limb(J(s, d.th), J(s, d.kn), 0.075, 0.05), side(s, 'thL', 'thR'), '#9a5220', { colorAt: suit, blend: 0.04, noise: { amp: 0.004, freq: 25 } })),
    ...both(s => part(limb(J(s, d.kn), J(s, d.ft), 0.05, 0.036), side(s, 'knL', 'knR'), '#9a5220', { colorAt: suit, blend: 0.03, noise: { amp: 0.004, freq: 25 } })),
    ...both(s => part(rbox(V(s * 0.1, 0.05, 0.04), V(0.05, 0.05, 0.12), 0.03), side(s, 'ftL', 'ftR'), '#2a2018', { blend: 0.015 })),
  ];
  const subs = [
    ...both(s => ({ shape: ellipsoid(V(s * 0.03, 1.675, 0.1), V(0.022, 0.018, 0.02)), blend: 0.01 })),
    { shape: ellipsoid(V(0, 1.64, 0.108), V(0.012, 0.016, 0.012)), blend: 0.006 },
    { shape: ellipsoid(V(0, 1.6, 0.1), V(0.04, 0.018, 0.04)), blend: 0.01 },
    { shape: ellipsoid(V(0, 1.12, 0.09), V(0.07, 0.06, 0.03)), blend: 0.03 },
  ];
  return {
    name: 'husk', bones: humanRig(d), parts, subs,
    pieces: [{ name: 'body', voxel: 0.0115, material: 'flesh' }],
    attachments: [
      ...both(s => ({ kind: 'glowEye', bone: 'head', pos: [s * 0.03, 1.673, 0.092], r: 0.011, color: '#ffd020' })),
      ...teeth('head', 8, 0, 1.61, 0.08, 0.032, 0.02, false, 0.006, 0.024),
      ...teeth('jaw', 8, 0, 1.588, 0.078, 0.03, 0.018, true, 0.006, 0.022),
      ...both(s => claws(side(s, 'handL', 'handR'), s * 0.31, 0.7, 0.045, 3, 0.08, 0.008)).flat(),
    ],
  };
}

// ------------------------------------------------------------------ RIFTER
function rifter() {
  const d = { hip: 0.98, spine: 1.1, chest: 1.33, neck: 1.56, head: 1.64, sh: [0.22, 1.5, 0], el: [0.28, 1.2, 0], hand: [0.31, 0.93, 0.03], th: [0.1, 0.96, 0], kn: [0.11, 0.52, 0.03], ft: [0.11, 0.08, 0] };
  const SUIT = '#20252e', A = { color2: '#26344a', mottle: 30, noise: { amp: 0.0025, freq: 60 } }, ARM = '#3a4a64';
  // painted plates: grimy blue-grey with worn, lighter patches and dirt in the low spots
  const armor = (x, y, z) => {
    let c = mix(rgb(ARM), rgb('#27344a'), clamp01(fbm(x * 14, y * 14, z * 14) + 0.5));
    c = mix(c, rgb('#6c7888'), smooth(0.25, 0.5, fbm(x * 12 + 4, y * 12, z * 12)) * 0.3);
    return mix(c, rgb('#1c1a18'), smooth(0.2, 0.45, fbm(x * 9 + 9, y * 9, z * 9)) * 0.4);
  };
  const cloth = (x, y, z) => mix(rgb(SUIT), rgb('#343a30'), clamp01(fbm(x * 20, y * 20, z * 20) + 0.45));
  const parts = [
    part(ellipsoid(V(0, 1.0, 0), V(0.16, 0.11, 0.11)), 'hips', SUIT, { colorAt: cloth, noise: { amp: 0.002, freq: 45 }, blend: 0.04 }),
    part(ellipsoid(V(0, 1.14, 0), V(0.14, 0.12, 0.1)), 'spine', SUIT, { colorAt: cloth, noise: { amp: 0.002, freq: 45 }, blend: 0.05 }),
    part(ellipsoid(V(0, 1.35, 0), V(0.17, 0.16, 0.11)), 'chest', SUIT, { colorAt: cloth, noise: { amp: 0.002, freq: 45 }, blend: 0.05 }),
    part(rbox(V(0, 1.36, 0.06), V(0.16, 0.14, 0.065), 0.045, [0.08, 0, 0]), 'chest', ARM, { colorAt: armor, blend: 0.012 }),
    part(rbox(V(0, 1.36, -0.07), V(0.15, 0.15, 0.06), 0.045), 'chest', ARM, { colorAt: armor, blend: 0.012 }),
    part(rbox(V(0, 1.36, -0.15), V(0.1, 0.13, 0.05), 0.03), 'chest', '#161a20', { blend: 0.01 }),         // power pack
    part(rbox(V(0, 1.13, 0.06), V(0.12, 0.07, 0.05), 0.03), 'spine', ARM, { colorAt: armor, blend: 0.01 }),
    part(rbox(V(0, 1.0, 0.07), V(0.13, 0.05, 0.05), 0.025), 'hips', ARM, { colorAt: armor, blend: 0.01 }),
    ...both(s => part(ellipsoid(V(s * 0.24, 1.52, 0), V(0.095, 0.065, 0.095)), 'chest', ARM, { colorAt: armor, blend: 0.015 })),
    part(limb(V(0, 1.47, 0), V(0, 1.62, 0.02), 0.055, 0.05), 'neck', SUIT, { colorAt: cloth, noise: { amp: 0.002, freq: 45 }, blend: 0.02 }),
    part(ellipsoid(V(0, 1.72, 0.0), V(0.1, 0.115, 0.11)), 'head', ARM, { colorAt: armor, blend: 0.02 }),
    part(rbox(V(0, 1.645, 0.06), V(0.07, 0.04, 0.055), 0.03), 'head', '#2a3850', { colorAt: armor, blend: 0.015 }),
    part(rbox(V(0, 1.735, 0.08), V(0.075, 0.03, 0.04), 0.015), 'head', '#101216', { blend: 0.005 }),          // visor frame
    ...both(s => part(limb(J(s, d.sh), J(s, d.el), 0.052, 0.046), side(s, 'shL', 'shR'), SUIT, { colorAt: cloth, noise: { amp: 0.002, freq: 45 }, blend: 0.03 })),
    ...both(s => part(limb(J(s, d.el), J(s, d.hand), 0.05, 0.043), side(s, 'elL', 'elR'), ARM, { colorAt: armor, blend: 0.02 })),
    ...both(s => part(ellipsoid(V(s * 0.315, 0.88, 0.035), V(0.035, 0.055, 0.05)), side(s, 'handL', 'handR'), '#161a20', { blend: 0.015 })),
    ...both(s => part(limb(J(s, d.th), J(s, d.kn), 0.085, 0.06), side(s, 'thL', 'thR'), SUIT, { colorAt: cloth, noise: { amp: 0.002, freq: 45 }, blend: 0.04 })),
    ...both(s => part(rbox(V(s * 0.105, 0.76, 0.05), V(0.06, 0.12, 0.035), 0.02), side(s, 'thL', 'thR'), ARM, { colorAt: armor, blend: 0.01 })),
    ...both(s => part(ellipsoid(V(s * 0.11, 0.53, 0.07), V(0.055, 0.055, 0.04)), side(s, 'knL', 'knR'), ARM, { colorAt: armor, blend: 0.01 })),
    ...both(s => part(limb(J(s, d.kn), J(s, d.ft), 0.06, 0.05), side(s, 'knL', 'knR'), ARM, { colorAt: armor, blend: 0.03 })),
    ...both(s => part(rbox(V(s * 0.11, 0.055, 0.045), V(0.06, 0.055, 0.13), 0.03), side(s, 'ftL', 'ftR'), '#121418', { blend: 0.015 })),
    // respirator, hoses to the power pack, webbing and pouches
    part(ellipsoid(V(0, 1.625, 0.1), V(0.05, 0.04, 0.045)), 'head', '#15171b', { blend: 0.01 }),
    ...both(s => part(sphere(V(s * 0.055, 1.615, 0.1), 0.028), 'head', '#2a2d33', { blend: 0.008 })),
    ...both(s => part(chain([V(s * 0.06, 1.6, 0.11), V(s * 0.1, 1.54, 0.06), V(s * 0.13, 1.5, -0.06), V(s * 0.08, 1.45, -0.15)], [0.012, 0.013, 0.013, 0.012]), 'neck', '#101114', { blend: 0.006, noise: { amp: 0.002, freq: 160, kind: 'ridged' } })),
    ...both(s => part(limb(V(s * 0.12, 1.5, 0.11), V(s * 0.1, 1.07, 0.11), 0.018, 0.018), 'chest', '#2e2a22', { blend: 0.006 })),
    part(limb(V(-0.16, 0.99, 0.02), V(0.16, 0.99, 0.02), 0.035, 0.035), 'hips', '#2e2a22', { blend: 0.01 }),
    ...[-0.1, -0.03, 0.04].map(x => part(rbox(V(x, 1.22, 0.115), V(0.03, 0.04, 0.02), 0.008), 'spine', '#2e2a22', { blend: 0.004 })),
    ...both(s => part(rbox(V(s * 0.16, 0.96, 0.06), V(0.035, 0.045, 0.03), 0.01), 'hips', '#2e2a22', { blend: 0.004 })),
    ...[0, 1, 2].map(i => part(rbox(V(0, 1.44 - i * 0.08, -0.205), V(0.07, 0.015, 0.012), 0.005), 'chest', '#0e0f12', { blend: 0.004 })),
  ];
  return {
    name: 'rifter', bones: humanRig(d), parts,
    pieces: [{ name: 'body', voxel: 0.0105, material: 'armor' }],
    attachments: [
      { kind: 'glowBox', bone: 'head', pos: [0, 1.735, 0.113], size: [0.13, 0.03, 0.012], color: '#ff2a1a' },
      { kind: 'gun', bone: 'handR', pos: [0.31, 0.74, 0.06], size: [0.05, 0.46, 0.09] },
    ],
  };
}

// ------------------------------------------------------------------ BILE SPITTER
function spitter() {
  const bones = [
    { name: 'root', parent: null, pos: V(0, 0, 0) }, { name: 'body', parent: 'root', pos: V(0, 0.85, 0) },
    { name: 'head', parent: 'body', pos: V(0, 1.3, 0.2) }, { name: 'jaw', parent: 'head', pos: V(0, 1.27, 0.26) },
    { name: 'legL', parent: 'root', pos: V(-0.22, 0.6, 0) }, { name: 'legR', parent: 'root', pos: V(0.22, 0.6, 0) },
    { name: 'armL', parent: 'body', pos: V(-0.44, 1.05, 0.1) }, { name: 'armR', parent: 'body', pos: V(0.44, 1.05, 0.1) },
  ];
  const S = { color2: '#9a8848', mottle: 7, veinColor: '#5a7a28', veinAmount: 0.75, veinScale: 9, noise: { amp: 0.018, freq: 7 } };
  const skin = '#cbb97c';
  const parts = [
    part(ellipsoid(V(0, 0.92, 0.03), V(0.48, 0.42, 0.42)), 'body', skin, { ...S, blend: 0.08 }),
    part(ellipsoid(V(0, 1.15, -0.12), V(0.36, 0.3, 0.3)), 'body', skin, { ...S, blend: 0.1 }),
    part(ellipsoid(V(0, 1.36, 0.2), V(0.22, 0.17, 0.2)), 'head', skin, { ...S, blend: 0.1 }),
    part(ellipsoid(V(0, 1.215, 0.3), V(0.18, 0.06, 0.14)), 'jaw', skin, { ...S, blend: 0.03 }),
    ...both(s => part(limb(V(s * 0.22, 0.62, 0), V(s * 0.24, 0.12, 0.03), 0.12, 0.08), side(s, 'legL', 'legR'), skin, { ...S, blend: 0.05 })),
    ...both(s => part(ellipsoid(V(s * 0.24, 0.06, 0.08), V(0.09, 0.06, 0.14)), side(s, 'legL', 'legR'), '#9a8848', { blend: 0.04 })),
    ...both(s => part(limb(V(s * 0.44, 1.05, 0.1), V(s * 0.55, 0.8, 0.22), 0.06, 0.045), side(s, 'armL', 'armR'), skin, { ...S, blend: 0.04 })),
    // glowing bile sacs
    ...[[-0.3, 0.95, 0.36, 0.09], [0.32, 1.05, 0.32, 0.075], [0.1, 0.72, 0.42, 0.07], [-0.12, 1.2, 0.3, 0.06], [0.2, 1.25, -0.2, 0.08], [-0.28, 1.1, -0.2, 0.07]]
      .map(([x, y, z, r]) => part(sphere(V(x, y, z), r), 'body', '#7aff48', { blend: 0.02, after: true, colorAt: () => rgb('#9aff60') })),
    part(ellipsoid(V(0, 1.29, 0.3), V(0.16, 0.055, 0.1)), 'head', '#5a1010', { blend: 0.01, after: true, colorAt: () => rgb('#5a1010') }),
  ];
  const subs = [{ shape: ellipsoid(V(0, 1.28, 0.4), V(0.17, 0.07, 0.13)), blend: 0.02 }];
  return {
    name: 'spitter', bones, parts, subs,
    pieces: [{ name: 'body', voxel: 0.016, material: 'flesh' }],
    attachments: [
      ...[[-0.08, 1.46, 0.36], [0.08, 1.46, 0.36], [0, 1.5, 0.33]].map(p => ({ kind: 'glowEye', bone: 'head', pos: p, r: 0.022, color: '#ff2010' })),
      ...teeth('head', 10, 0, 1.305, 0.3, 0.14, 0.1, false, 0.012, 0.05),
      ...teeth('jaw', 10, 0, 1.25, 0.3, 0.13, 0.09, true, 0.011, 0.045),
      ...both(s => claws(side(s, 'armL', 'armR'), s * 0.56, 0.76, 0.25, 3, 0.07, 0.012)).flat(),
      ...[[-0.3, 0.95, 0.44], [0.32, 1.05, 0.38], [0.1, 0.72, 0.5]].map(p => ({ kind: 'glow', bone: 'body', pos: p, size: 0.35, color: '#8aff40' })),
      { kind: 'glow', bone: 'head', pos: [0, 1.28, 0.45], size: 0.7, color: '#8aff40', tag: 'cast', hidden: true },
    ],
  };
}

// ------------------------------------------------------------------ MAW HOUND
function hound() {
  const b = (name, parent, x, y, z) => ({ name, parent, pos: V(x, y, z) });
  const bones = [
    b('root', null, 0, 0, 0), b('body', 'root', 0, 0.85, 0), b('neck', 'body', 0, 1.0, 0.55), b('head', 'neck', 0, 1.05, 0.78), b('jaw', 'head', 0, 0.97, 0.84),
    b('tail0', 'body', 0, 0.95, -0.66), b('tail1', 'tail0', 0, 0.88, -0.95),
    b('lfL', 'body', -0.2, 0.82, 0.45), b('kfL', 'lfL', -0.22, 0.45, 0.5), b('lfR', 'body', 0.2, 0.82, 0.45), b('kfR', 'lfR', 0.22, 0.45, 0.5),
    b('lbL', 'body', -0.2, 0.85, -0.5), b('kbL', 'lbL', -0.22, 0.5, -0.35), b('lbR', 'body', 0.2, 0.85, -0.5), b('kbR', 'lbR', 0.22, 0.5, -0.35),
  ];
  const H = { color2: '#3e0c08', mottle: 10, veinColor: '#b0503a', veinAmount: 0.7, veinScale: 22, noise: { amp: 0.006, freq: 26, kind: 'ridged' } }, hide = '#7a2018';
  const parts = [
    part(ellipsoid(V(0, 0.98, 0.3), V(0.28, 0.3, 0.38)), 'body', hide, { ...H, blend: 0.08 }),
    part(ellipsoid(V(0, 0.9, -0.2), V(0.2, 0.2, 0.34)), 'body', hide, { ...H, blend: 0.08 }),
    part(ellipsoid(V(0, 0.93, -0.5), V(0.22, 0.22, 0.2)), 'body', hide, { ...H, blend: 0.08 }),
    ...both(s => part(ellipsoid(V(s * 0.2, 1.06, 0.4), V(0.12, 0.16, 0.18)), 'body', hide, { ...H, blend: 0.06 })),
    part(limb(V(0, 1.0, 0.55), V(0, 1.06, 0.76), 0.16, 0.13), 'neck', hide, { ...H, blend: 0.05 }),
    part(ellipsoid(V(0, 1.1, 0.85), V(0.14, 0.13, 0.17)), 'head', hide, { ...H, blend: 0.04 }),
    part(limb(V(0, 1.06, 0.9), V(0, 1.01, 1.12), 0.1, 0.068), 'head', hide, { ...H, blend: 0.04 }),
    ...both(s => part(ellipsoid(V(s * 0.08, 1.16, 0.93), V(0.05, 0.03, 0.05)), 'head', hide, { ...H, blend: 0.03 })),
    part(limb(V(0, 0.94, 0.86), V(0, 0.92, 1.1), 0.08, 0.055), 'jaw', hide, { ...H, blend: 0.03 }),
    ...both(s => part(limb(V(s * 0.2, 0.85, 0.45), V(s * 0.22, 0.45, 0.5), 0.1, 0.07), side(s, 'lfL', 'lfR'), hide, { ...H, blend: 0.05 })),
    ...both(s => part(limb(V(s * 0.22, 0.45, 0.5), V(s * 0.22, 0.06, 0.46), 0.06, 0.045), side(s, 'kfL', 'kfR'), hide, { ...H, blend: 0.03 })),
    ...both(s => part(ellipsoid(V(s * 0.22, 0.04, 0.52), V(0.06, 0.04, 0.09)), side(s, 'kfL', 'kfR'), '#3e0c08', { blend: 0.02 })),
    ...both(s => part(limb(V(s * 0.2, 0.9, -0.5), V(s * 0.22, 0.5, -0.35), 0.12, 0.07), side(s, 'lbL', 'lbR'), hide, { ...H, blend: 0.05 })),
    ...both(s => part(limb(V(s * 0.22, 0.5, -0.35), V(s * 0.22, 0.06, -0.52), 0.055, 0.04), side(s, 'kbL', 'kbR'), hide, { ...H, blend: 0.03 })),
    ...both(s => part(ellipsoid(V(s * 0.22, 0.04, -0.48), V(0.055, 0.04, 0.09)), side(s, 'kbL', 'kbR'), '#3e0c08', { blend: 0.02 })),
    part(limb(V(0, 0.95, -0.66), V(0, 0.88, -0.95), 0.06, 0.045), 'tail0', hide, { ...H, blend: 0.03 }),
    part(limb(V(0, 0.88, -0.95), V(0, 0.78, -1.2), 0.045, 0.015), 'tail1', hide, { ...H, blend: 0.02 }),
    part(ellipsoid(V(0, 1.0, 0.98), V(0.075, 0.03, 0.12)), 'head', '#4a0808', { blend: 0.01, after: true, colorAt: () => rgb('#3a0606') }),
  ];
  const subs = [{ shape: ellipsoid(V(0, 0.985, 1.0), V(0.08, 0.035, 0.13)), blend: 0.015 }];
  return {
    name: 'hound', bones, parts, subs,
    pieces: [{ name: 'body', voxel: 0.016, material: 'flesh' }],
    attachments: [
      ...both(s => ({ kind: 'glowEye', bone: 'head', pos: [s * 0.075, 1.15, 0.97], r: 0.018, color: '#ffe040' })),
      ...[0, 1, 2, 3, 4, 5, 6].map(i => ({ kind: 'cone', bone: 'body', pos: [0, 1.25 - Math.abs(i - 2) * 0.03, 0.45 - i * 0.16], r: 0.035, h: 0.22 - Math.abs(i - 2.5) * 0.025, rot: [-0.35, 0, 0], color: '#ddd0b0' })),
      ...both(s => ({ kind: 'cone', bone: 'head', pos: [s * 0.1, 1.22, 0.8], r: 0.03, h: 0.18, rot: [-0.7, 0, -s * 0.5], color: '#ddd0b0' })),
      ...teeth('head', 9, 0, 1.0, 0.96, 0.065, 0.14, false, 0.011, 0.045, '#e8dcc0', 1.9),
      ...teeth('jaw', 9, 0, 0.965, 0.95, 0.06, 0.13, true, 0.01, 0.04, '#e8dcc0', 1.9),
      ...['kfL', 'kfR', 'kbL', 'kbR'].flatMap((bn, i) => claws(bn, (i % 2 ? 1 : -1) * 0.22, 0.02, i < 2 ? 0.6 : -0.38, 3, 0.07, 0.012, '#d8ccb0', 0.035)),
    ],
  };
}

// ------------------------------------------------------------------ CINDER WRAITH
function wraith() {
  const b = (name, parent, x, y, z) => ({ name, parent, pos: V(x, y, z) });
  const bones = [b('root', null, 0, 0, 0), b('body', 'root', 0, 1.0, 0), b('robe', 'body', 0, 0.9, 0), b('head', 'body', 0, 1.5, 0.02),
    b('shL', 'body', -0.2, 1.36, 0), b('shR', 'body', 0.2, 1.36, 0)];
  const cloth = { color2: '#140a1c', mottle: 9, noise: { amp: 0.03, freq: 9 } };
  const parts = [
    part(limb(V(0, 1.42, 0), V(0, 0.32, 0), 0.17, 0.44), 'robe', '#2e1a40', { ...cloth, blend: 0.04 }),
    part(ellipsoid(V(0, 1.33, 0), V(0.24, 0.12, 0.17)), 'body', '#2e1a40', { ...cloth, blend: 0.06 }),
    part(ellipsoid(V(0, 1.62, 0.0), V(0.15, 0.17, 0.16)), 'head', '#2e1a40', { ...cloth, blend: 0.05 }),
    part(ellipsoid(V(0, 1.58, 0.07), V(0.075, 0.095, 0.08)), 'head', '#d8ccb0', { after: true, blend: 0.005, colorAt: (x, y, z) => mix(rgb('#d8ccb0'), rgb('#8a7a60'), clamp01(fbm(x * 40, y * 40, z * 40) + 0.3)) }),
    part(ellipsoid(V(0, 1.52, 0.1), V(0.045, 0.025, 0.04)), 'head', '#d8ccb0', { after: true, blend: 0.01 }),
    ...both(s => part(limb(V(s * 0.2, 1.36, 0), V(s * 0.3, 1.08, 0.18), 0.055, 0.04), side(s, 'shL', 'shR'), '#2e1a40', { ...cloth, blend: 0.03 })),
    ...both(s => part(limb(V(s * 0.3, 1.08, 0.18), V(s * 0.32, 0.98, 0.24), 0.025, 0.02), side(s, 'shL', 'shR'), '#d8ccb0', { blend: 0.02 })),
  ];
  const subs = [
    { shape: ellipsoid(V(0, 1.58, 0.14), V(0.1, 0.12, 0.09)), blend: 0.02 },
    { shape: ellipsoid(V(0, 0.25, 0), V(0.4, 0.3, 0.4)), blend: 0.05 },
  ];
  // ragged hem: cut away everything below a wavy line
  const hem = { min: [-0.8, -0.3, -0.8], max: [0.8, 0.5, 0.8], d: (x, y, z) => y - (0.34 + fbm(x * 9, 0, z * 9, 2) * 0.12 + Math.sin(Math.atan2(z, x) * 7) * 0.03) };
  subs.push({ shape: hem, blend: 0.02 });
  return {
    name: 'wraith', bones, parts, subs,
    pieces: [{ name: 'body', voxel: 0.014, material: 'cloth' }],
    attachments: [
      ...both(s => ({ kind: 'glowEye', bone: 'head', pos: [s * 0.03, 1.6, 0.135], r: 0.016, color: '#ff8020' })),
      ...teeth('head', 6, 0, 1.53, 0.12, 0.025, 0.02, false, 0.005, 0.02),
      ...both(s => claws(side(s, 'shL', 'shR'), s * 0.32, 0.97, 0.25, 3, 0.09, 0.008)).flat(),
      { kind: 'glow', bone: 'head', pos: [0, 1.6, 0.06], size: 0.32, color: '#ff7020' },
      { kind: 'glow', bone: 'body', pos: [0, 0.35, 0], size: 0.7, color: '#ff5010' },
      { kind: 'glow', bone: 'body', pos: [0, 1.15, 0.45], size: 0.7, color: '#ff8020', tag: 'cast', hidden: true },
    ],
  };
}

// ------------------------------------------------------------------ HELLMAW
function hellmaw() {
  const b = (name, parent, x, y, z) => ({ name, parent, pos: V(x, y, z) });
  const bones = [b('root', null, 0, 0, 0), b('body', 'root', 0, 1.7, 0), b('jaw', 'body', 0, 1.52, 0.1)];
  const tents = [];
  for (let k = 0; k < 5; k++) {
    const a = (k / 5) * PI * 2 + 0.3, x = Math.cos(a) * 0.38, z = Math.sin(a) * 0.32 - 0.12;
    const pts = [V(x, 1.25, z), V(x * 1.15, 0.9, z * 1.1), V(x * 1.2, 0.58, z * 1.05), V(x * 1.1, 0.3, z)];
    bones.push(b(`t${k}_0`, 'body', pts[0].x, pts[0].y, pts[0].z), b(`t${k}_1`, `t${k}_0`, pts[1].x, pts[1].y, pts[1].z), b(`t${k}_2`, `t${k}_1`, pts[2].x, pts[2].y, pts[2].z));
    tents.push(pts);
  }
  const S = { color2: '#5a5234', mottle: 5, veinColor: '#6a1a14', veinAmount: 0.85, veinScale: 7, noise: { amp: 0.028, freq: 5 } }, hide = '#8e8860';
  const parts = [
    part(ellipsoid(V(0, 1.78, 0), V(0.74, 0.66, 0.7)), 'body', hide, { ...S, blend: 0.1 }),
    ...[[-0.3, 2.3, -0.1, 0.22], [0.28, 2.32, -0.2, 0.25], [0, 2.25, 0.3, 0.18], [0.5, 2.0, -0.4, 0.2], [-0.5, 2.05, -0.35, 0.2]].map(([x, y, z, r]) => part(sphere(V(x, y, z), r), 'body', hide, { ...S, blend: 0.12 })),
    ...both(s => part(ellipsoid(V(s * 0.24, 2.06, 0.5), V(0.22, 0.08, 0.13)), 'body', hide, { ...S, blend: 0.06 })),
    part(ellipsoid(V(0, 1.42, 0.3), V(0.5, 0.16, 0.42)), 'jaw', hide, { ...S, blend: 0.05 }),
    part(ellipsoid(V(0, 1.58, 0.36), V(0.46, 0.13, 0.32)), 'body', '#4a0808', { after: true, blend: 0.02, colorAt: (x, y, z) => mix(rgb('#5a0a08'), rgb('#ff5018'), smooth(1.55, 1.5, y) * 0.5) }),
    ...tents.flatMap((p, k) => [0, 1, 2].map(i => part(limb(p[i], p[i + 1], 0.11 - i * 0.025, 0.09 - i * 0.03), `t${k}_${i}`, i === 2 ? '#4a4228' : hide, { ...S, noise: { amp: 0.008, freq: 14, kind: 'ridged' }, blend: i === 0 ? 0.08 : 0.03 }))),
  ];
  const subs = [
    { shape: ellipsoid(V(0, 1.56, 0.56), V(0.5, 0.18, 0.35)), blend: 0.03 },
    ...[[-0.22, 1.98, 0.6], [0.22, 1.98, 0.6], [0, 2.12, 0.55]].map(([x, y, z]) => ({ shape: sphere(V(x, y, z), 0.075), blend: 0.03 })),
  ];
  return {
    name: 'hellmaw', bones, parts, subs,
    pieces: [{ name: 'body', voxel: 0.022, material: 'flesh' }],
    attachments: [
      ...[[-0.22, 1.98, 0.57], [0.22, 1.98, 0.57], [0, 2.12, 0.52]].map(p => ({ kind: 'glowEye', bone: 'body', pos: p, r: 0.055, color: '#60ff90' })),
      ...teeth('body', 15, 0, 1.68, 0.36, 0.48, 0.34, false, 0.03, 0.14, '#ece0c4', 2.4),
      ...teeth('jaw', 14, 0, 1.49, 0.34, 0.45, 0.32, true, 0.028, 0.13, '#ece0c4', 2.3),
      { kind: 'glow', bone: 'body', pos: [0, 1.56, 0.62], size: 0.9, color: '#ff6020' },
      { kind: 'glow', bone: 'body', pos: [0, 1.56, 0.9], size: 1.3, color: '#ff6020', tag: 'cast', hidden: true },
    ],
  };
}

// ------------------------------------------------------------------ RAVAGER
function ravager() {
  const d = { hip: 1.15, spine: 1.32, chest: 1.6, neck: 1.9, head: 1.98, headZ: 0.08, jaw: [0, 1.94, 0.13], sh: [0.36, 1.82, 0], el: [0.48, 1.44, 0.03], hand: [0.54, 1.02, 0.07], th: [0.14, 1.12, 0], kn: [0.16, 0.62, 0.05], ft: [0.16, 0.1, 0] };
  const M = { color2: '#8a8d84', mottle: 9, veinColor: '#7a2a24', veinAmount: 0.55, veinScale: 11, noise: { amp: 0.006, freq: 22 } }, pale = '#b2b5ac';
  const muscle = (bn, c, r, rot) => part(ellipsoid(c, r, rot), bn, pale, { ...M, blend: 0.05 });
  const parts = [
    muscle('hips', V(0, 1.18, 0), V(0.22, 0.14, 0.16)),
    muscle('spine', V(0, 1.38, 0.02), V(0.2, 0.18, 0.15)),
    muscle('chest', V(0, 1.65, 0), V(0.3, 0.22, 0.2)),
    ...both(s => muscle('chest', V(s * 0.13, 1.69, 0.14), V(0.15, 0.1, 0.08), [0, 0, s * 0.2])),
    ...both(s => muscle('chest', V(s * 0.15, 1.86, -0.03), V(0.16, 0.08, 0.1), [0, 0, -s * 0.35])),
    ...both(s => muscle('chest', V(s * 0.36, 1.79, 0), V(0.13, 0.12, 0.13))),
    ...both(s => muscle('chest', V(s * 0.25, 1.53, -0.06), V(0.1, 0.2, 0.12))),
    // exposed ribs along the flanks
    ...[0, 1, 2, 3].flatMap(i => both(s => part(chain([V(s * 0.22, 1.56 - i * 0.07, -0.08), V(s * 0.27, 1.53 - i * 0.07, 0.03), V(s * 0.2, 1.5 - i * 0.07, 0.12)], [0.018, 0.02, 0.016]), 'chest', '#ddd6c2', { blend: 0.015, after: true }))),
    part(limb(V(0, 1.8, 0), V(0, 1.98, 0.08), 0.12, 0.1), 'neck', pale, { ...M, blend: 0.05 }),
    part(ellipsoid(V(0, 2.06, 0.06), V(0.12, 0.13, 0.13)), 'head', pale, { ...M, blend: 0.04 }),
    part(ellipsoid(V(0, 2.08, 0.15), V(0.11, 0.03, 0.05)), 'head', pale, { ...M, blend: 0.03 }),
    part(ellipsoid(V(0, 1.92, 0.17), V(0.13, 0.065, 0.12)), 'jaw', pale, { ...M, blend: 0.03 }),
    part(ellipsoid(V(0, 1.98, 0.17), V(0.11, 0.035, 0.08)), 'head', '#6a0c0a', { after: true, blend: 0.01, colorAt: () => rgb('#6a0c0a') }),
    ...both(s => part(limb(J(s, d.sh), J(s, d.el), 0.12, 0.09), side(s, 'shL', 'shR'), pale, { ...M, blend: 0.05 })),
    ...both(s => muscle(side(s, 'shL', 'shR'), V(s * 0.44, 1.62, 0.07), V(0.09, 0.14, 0.09))),
    ...both(s => part(limb(J(s, d.el), J(s, d.hand), 0.1, 0.07), side(s, 'elL', 'elR'), pale, { ...M, blend: 0.04 })),
    ...both(s => muscle(side(s, 'elL', 'elR'), V(s * 0.5, 1.33, 0.05), V(0.09, 0.14, 0.08))),
    ...both(s => part(ellipsoid(V(s * 0.55, 0.94, 0.08), V(0.07, 0.1, 0.09)), side(s, 'handL', 'handR'), '#8a8d84', { ...M, blend: 0.03 })),
    ...both(s => part(limb(J(s, d.th), J(s, d.kn), 0.14, 0.09), side(s, 'thL', 'thR'), pale, { ...M, blend: 0.06 })),
    ...both(s => muscle(side(s, 'thL', 'thR'), V(s * 0.16, 0.9, 0.06), V(0.11, 0.2, 0.1))),
    ...both(s => part(limb(J(s, d.kn), J(s, d.ft), 0.09, 0.06), side(s, 'knL', 'knR'), pale, { ...M, blend: 0.04 })),
    ...both(s => muscle(side(s, 'knL', 'knR'), V(s * 0.16, 0.45, -0.05), V(0.08, 0.14, 0.08))),
    ...both(s => part(ellipsoid(V(s * 0.16, 0.06, 0.08), V(0.09, 0.06, 0.16)), side(s, 'ftL', 'ftR'), '#8a8d84', { blend: 0.03 })),
  ];
  const subs = [
    { shape: ellipsoid(V(0, 1.985, 0.23), V(0.1, 0.035, 0.07)), blend: 0.015 },
    ...both(s => ({ shape: ellipsoid(V(s * 0.045, 2.075, 0.17), V(0.03, 0.022, 0.03)), blend: 0.015 })),
    ...[0, 1].flatMap(i => both(s => ({ shape: ellipsoid(V(s * 0.06, 1.33 + i * 0.1, 0.17), V(0.02, 0.012, 0.03)), blend: 0.02 }))),
    { shape: limb(V(0, 1.25, 0.18), V(0, 1.55, 0.2), 0.012, 0.012), blend: 0.02 },
  ];
  return {
    name: 'ravager', bones: humanRig(d), parts, subs,
    pieces: [{ name: 'body', voxel: 0.017, material: 'flesh' }],
    attachments: [
      ...both(s => ({ kind: 'glowEye', bone: 'head', pos: [s * 0.045, 2.07, 0.165], r: 0.018, color: '#ff2010' })),
      ...teeth('head', 9, 0, 2.005, 0.18, 0.085, 0.06, false, 0.012, 0.055),
      ...teeth('jaw', 9, 0, 1.955, 0.18, 0.08, 0.055, true, 0.011, 0.05),
      ...both(s => claws(side(s, 'handL', 'handR'), s * 0.56, 0.86, 0.1, 3, 0.2, 0.018, '#d8ccb0', 0.045)).flat(),
      ...both(s => claws(side(s, 'ftL', 'ftR'), s * 0.16, 0.03, 0.22, 3, 0.08, 0.015, '#d8ccb0', 0.05)).flat(),
    ],
  };
}

// ------------------------------------------------------------------ THE WARDEN (boss)
function warden() {
  const d = { hip: 1.75, spine: 2.0, chest: 2.45, neck: 2.9, head: 3.0, headZ: 0.12, jaw: [0, 2.98, 0.24], sh: [0.62, 2.78, 0], el: [0.8, 2.2, 0.04], hand: [0.88, 1.6, 0.1], th: [0.26, 1.72, 0], kn: [0.3, 0.95, 0.08], ft: [0.3, 0.15, 0] };
  const skin = '#6a1a10', S = { color2: '#380a06', mottle: 6, veinColor: '#ff6a20', veinAmount: 0.7, veinScale: 6, noise: { amp: 0.01, freq: 12 } };
  const IRON = '#3a3a42', ironC = (x, y, z) => mix(rgb(IRON), rgb('#22222a'), clamp01(fbm(x * 12, y * 12, z * 12) + 0.5));
  const m = (bn, c, r, rot) => part(ellipsoid(c, r, rot), bn, skin, { ...S, blend: 0.08 });
  const parts = [
    m('hips', V(0, 1.8, 0), V(0.38, 0.24, 0.28)), m('spine', V(0, 2.1, 0.03), V(0.36, 0.3, 0.26)), m('chest', V(0, 2.5, 0), V(0.52, 0.36, 0.34)),
    ...both(s => m('chest', V(s * 0.2, 2.55, 0.22), V(0.24, 0.16, 0.14))),
    ...both(s => m('chest', V(s * 0.25, 2.85, -0.05), V(0.26, 0.12, 0.16), [0, 0, -s * 0.3])),
    part(rbox(V(0, 2.5, 0.32), V(0.36, 0.26, 0.07), 0.05, [0.1, 0, 0]), 'chest', IRON, { colorAt: ironC, blend: 0.02 }),
    part(rbox(V(0, 1.86, 0.2), V(0.36, 0.08, 0.1), 0.04), 'hips', IRON, { colorAt: ironC, blend: 0.02 }),
    ...both(s => part(ellipsoid(V(s * 0.62, 2.85, 0), V(0.26, 0.2, 0.26)), 'chest', IRON, { colorAt: ironC, blend: 0.03 })),
    part(limb(V(0, 2.78, 0), V(0, 3.0, 0.12), 0.2, 0.17), 'neck', skin, { ...S, blend: 0.06 }),
    part(ellipsoid(V(0, 3.14, 0.12), V(0.2, 0.22, 0.22)), 'head', skin, { ...S, blend: 0.05 }),
    part(ellipsoid(V(0, 3.2, 0.26), V(0.18, 0.05, 0.08)), 'head', skin, { ...S, blend: 0.04 }),
    part(ellipsoid(V(0, 2.96, 0.28), V(0.17, 0.08, 0.15)), 'jaw', skin, { ...S, blend: 0.04 }),
    ...both(s => part(chain([V(s * 0.14, 3.28, 0.1), V(s * 0.34, 3.46, 0.02), V(s * 0.46, 3.74, -0.14), V(s * 0.4, 3.98, -0.34)], [0.075, 0.06, 0.04, 0.012]), 'head', '#d8c8a0', { blend: 0.03, noise: { amp: 0.006, freq: 30, kind: 'ridged' }, colorAt: (x, y) => mix(rgb('#d8c8a0'), rgb('#4a3a2a'), smooth(3.3, 3.9, y)) })),
    ...both(s => part(limb(J(s, d.sh), J(s, d.el), 0.2, 0.16), side(s, 'shL', 'shR'), skin, { ...S, blend: 0.06 })),
    ...both(s => part(limb(J(s, d.el), J(s, d.hand), 0.17, 0.13), side(s, 'elL', 'elR'), skin, { ...S, blend: 0.05 })),
    part(ellipsoid(V(-0.9, 1.5, 0.12), V(0.13, 0.17, 0.15)), 'handL', skin, { ...S, blend: 0.04 }),
    ...both(s => part(limb(J(s, d.th), J(s, d.kn), 0.24, 0.17), side(s, 'thL', 'thR'), skin, { ...S, blend: 0.07 })),
    ...both(s => part(limb(J(s, d.kn), J(s, d.ft), 0.17, 0.12), side(s, 'knL', 'knR'), skin, { ...S, blend: 0.05 })),
    ...both(s => part(rbox(V(s * 0.3, 0.6, 0.14), V(0.14, 0.3, 0.06), 0.04, [-0.08, 0, 0]), side(s, 'knL', 'knR'), IRON, { colorAt: ironC, blend: 0.02 })),
    ...both(s => part(rbox(V(s * 0.3, 0.1, 0.1), V(0.15, 0.1, 0.26), 0.06), side(s, 'ftL', 'ftR'), '#1a1a1a', { blend: 0.03 })),
  ];
  const subs = [
    { shape: ellipsoid(V(0, 3.02, 0.36), V(0.14, 0.04, 0.1)), blend: 0.02 },
    ...both(s => ({ shape: ellipsoid(V(s * 0.08, 3.15, 0.32), V(0.045, 0.03, 0.04)), blend: 0.02 })),
  ];
  return {
    name: 'warden', bones: humanRig(d), parts, subs,
    pieces: [{ name: 'body', voxel: 0.03, material: 'flesh' }],
    attachments: [
      ...both(s => ({ kind: 'glowEye', bone: 'head', pos: [s * 0.08, 3.15, 0.3], r: 0.035, color: '#ffe040' })),
      ...teeth('head', 9, 0, 3.03, 0.3, 0.12, 0.09, false, 0.02, 0.09),
      ...teeth('jaw', 9, 0, 2.99, 0.3, 0.11, 0.08, true, 0.018, 0.08),
      { kind: 'glowBox', bone: 'chest', pos: [0, 2.5, 0.405], size: [0.6, 0.035, 0.02], color: '#ff4010' },
      { kind: 'glowBox', bone: 'chest', pos: [0, 2.5, 0.405], size: [0.035, 0.42, 0.02], color: '#ff4010' },
      // cannon arm: barrel along the forearm (points forward when the arm is raised)
      { kind: 'cyl', bone: 'elR', pos: [0.86, 1.85, 0.1], r: 0.2, r2: 0.24, h: 0.9, color: '#3a3a42' },
      { kind: 'cyl', bone: 'elR', pos: [0.87, 1.38, 0.1], r: 0.13, h: 0.08, color: '#ff4a10' },
      { kind: 'muzzle', bone: 'elR', pos: [0.87, 1.25, 0.1], size: 1.4, color: '#ff5020' },
      ...claws('handL', -0.9, 1.35, 0.14, 3, 0.3, 0.035, '#d8c8a0', 0.08),
    ],
  };
}

export default { husk, rifter, spitter, hound, wraith, hellmaw, ravager, warden };
