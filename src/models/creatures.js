// 3D monster + companion models, built from simple shapes and animated with
// joints (hips, knees, shoulders, elbows...). Every model faces +z.
//
// Poses: 'idle' | 'walk' | 'windup' (melee wind-up) | 'strike' (melee hit)
//        'aim' (ranged wind-up) | 'fire' (ranged shot) | 'pain' | 'dead'

import * as THREE from 'three';
import { MaterialSet, box, cyl, ball, cone, joint, put, paintedTexture, mergeStatic, capsule, smoothSphere, shade as shadeGeo } from './common.js';
import { glowTexture } from '../effects/Effects.js';
import { hasModel, instantiate } from './skinned.js';
import * as rigs from './rigs.js';

const PI = Math.PI;

// ---------------------------------------------------------------- humanoid rig
function humanoid(M, c) {
  const H = c.height;
  const legLen = c.legLen ?? H * 0.47, torsoH = c.torsoH ?? H * 0.3, headS = c.head ?? H * 0.13;
  const legW = c.legW ?? H * 0.085, armW = c.armW ?? H * 0.07, armLen = c.armLen ?? H * 0.4;
  const torsoW = c.torsoW ?? H * 0.24, torsoD = c.torsoD ?? H * 0.14;
  const footH = legW * 0.6;
  const root = new THREE.Group();
  const body = joint(root, 0, legLen, 0);
  const P = { root, body, legLen, torsoH, torsoD };
  for (const [s, k] of [[-1, 'L'], [1, 'R']]) {
    const hip = joint(body, s * torsoW * (c.hipSpread ?? 0.26), 0, 0);
    hip.add(c.smooth ? capsule(legW * 0.55, legLen * 0.56, c.legMat) : box(legW, legLen * 0.52, legW * 1.1, c.legMat));
    const knee = joint(hip, 0, -legLen * 0.5, 0);
    knee.add(c.smooth ? capsule(legW * 0.45, legLen * 0.5 - footH * 0.5, c.shinMat || c.legMat) : box(legW * 0.88, legLen * 0.5 - footH, legW, c.shinMat || c.legMat));
    put(knee, box(legW * 1.05, footH, legW * 1.9, c.footMat), 0, -(legLen * 0.5 - footH), legW * 0.35);
    P['hip' + k] = hip; P['knee' + k] = knee;
  }
  const spine = joint(body, 0, 0, 0);
  spine.rotation.x = c.hunch || 0;
  P.spine = spine; P.hunch = c.hunch || 0;
  P.torso = c.torsoFn ? c.torsoFn(spine, torsoW, torsoH, torsoD) : put(spine, box(torsoW, torsoH, torsoD, c.torsoMat, 'bottom'));
  const neck = joint(spine, 0, torsoH, c.headForward || 0);
  P.neck = neck;
  const headMat = c.headMats || c.headMat;
  P.head = c.headFn ? c.headFn(neck, headS) : put(neck, box(headS, headS * 1.15, headS * 1.05, headMat, 'bottom'), 0, headS * 0.08, 0);
  P.headSize = headS;
  for (const [s, k] of [[-1, 'L'], [1, 'R']]) {
    const sh = joint(spine, s * (torsoW / 2 + armW / 2), torsoH - armW * 0.4, 0);
    sh.add(c.smooth ? capsule(armW * 0.55, armLen * 0.52, c.armMat) : box(armW, armLen * 0.5, armW, c.armMat));
    const el = joint(sh, 0, -armLen * 0.48, 0);
    el.add(c.smooth ? capsule(armW * 0.47, armLen * 0.48, c.foreMat || c.armMat) : box(armW * 0.9, armLen * 0.46, armW * 0.9, c.foreMat || c.armMat));
    const handMesh = c.smooth ? ball(armW * 0.55, c.handMat || c.foreMat || c.armMat, 1) : box(armW * 0.95, armW * 1.1, armW * 1.1, c.handMat || c.foreMat || c.armMat);
    if (c.smooth) handMesh.scale.set(0.9, 1.3, 1);
    const hand = put(el, handMesh, 0, -armLen * 0.46 - (c.smooth ? armW * 0.4 : 0), 0);
    P['sh' + k] = sh; P['el' + k] = el; P['hand' + k] = hand;
  }
  P.armLen = armLen; P.armW = armW;
  return P;
}

function animHumanoid(P, pose, t, poseT, opts = {}) {
  const w = Math.sin(t);
  const set = (j, x = 0, y = 0, z = 0) => j.rotation.set(x, y, z);
  set(P.hipL); set(P.hipR); set(P.kneeL); set(P.kneeR);
  set(P.shL, 0, 0, -0.08); set(P.shR, 0, 0, 0.08); set(P.elL, -0.25); set(P.elR, -0.25);
  P.spine.rotation.set(P.hunch, 0, 0);
  P.body.position.y = P.legLen;
  if (pose === 'walk') {
    set(P.hipL, -w * 0.65); set(P.hipR, w * 0.65);
    set(P.kneeL, Math.max(0, w) * 1.0); set(P.kneeR, Math.max(0, -w) * 1.0);
    if (!opts.armsBusy) { set(P.shL, w * 0.55, 0, -0.08); set(P.shR, -w * 0.55, 0, 0.08); }
    P.body.position.y = P.legLen + Math.abs(Math.cos(t)) * 0.04;
    P.spine.rotation.y = w * 0.08;
  } else if (pose === 'idle') {
    P.spine.rotation.x = P.hunch + Math.sin(t * 0.3) * 0.03;
  }
  if (pose === 'windup') { set(P.shL, -2.7, 0, -0.3); set(P.shR, -2.7, 0, 0.3); set(P.elL, -0.6); set(P.elR, -0.6); P.spine.rotation.x = P.hunch - 0.15; }
  if (pose === 'strike') { set(P.shL, -1.0, 0, 0.2); set(P.shR, -1.0, 0, -0.2); set(P.elL, -0.1); set(P.elR, -0.1); P.spine.rotation.x = P.hunch + 0.25; }
  if (pose === 'aim' || pose === 'fire' || opts.armsBusy) {
    const kick = pose === 'fire' ? 0.25 : 0;
    set(P.shR, -1.5 + kick, 0.15, 0); set(P.elR, -0.05);
    set(P.shL, -1.35 + kick, -0.5, 0); set(P.elL, -0.35);
  }
  if (pose === 'pain') { P.spine.rotation.x = P.hunch - 0.4; set(P.shL, -0.6, 0, -0.6); set(P.shR, -0.3, 0, 0.7); }
}

/** Fall over backwards and settle on the floor. */
function animDeath(root, deathT, thickness) {
  const k = Math.min(1, deathT / 0.45);
  const e = 1 - (1 - k) * (1 - k);
  root.rotation.x = -e * PI / 2;
  root.position.y = e * thickness * 0.5 + (k < 1 ? Math.sin(k * PI) * 0.15 : 0);
}

function glowSprite(color, size) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  s.scale.setScalar(size);
  return s;
}

function muzzle(parent, x, y, z, color = 0xffc040, size = 0.6) {
  const s = glowSprite(color, size);
  s.position.set(x, y, z); s.visible = false;
  parent.add(s);
  return s;
}

// ---------------------------------------------------------------- VEX's head
// One painted texture wraps the whole (rounded) head: face at the front,
// sleek dark hair pulled back over the top and the back.
let vexHead = null;
function vexHeadTexture() {
  if (vexHead) return vexHead;
  vexHead = paintedTexture(512, 256, (c, W, H) => {
    const FX = 128;                                   // front of the face on the sphere's UV map
    const skin = c.createLinearGradient(0, 0, 0, H);
    skin.addColorStop(0, '#e6b89e'); skin.addColorStop(1, '#d9a88c');
    c.fillStyle = skin; c.fillRect(0, 0, W, H);
    // soft contour under the cheekbones and along the jaw
    for (const dx of [-44, 44]) {
      const g = c.createRadialGradient(FX + dx, 165, 2, FX + dx, 165, 40);
      g.addColorStop(0, 'rgba(160,100,80,0.45)'); g.addColorStop(1, 'rgba(160,100,80,0)');
      c.fillStyle = g; c.fillRect(FX + dx - 45, 120, 90, 100);
    }
    const blush = (x) => { const g = c.createRadialGradient(x, 150, 1, x, 150, 18); g.addColorStop(0, 'rgba(210,120,110,0.35)'); g.addColorStop(1, 'rgba(210,120,110,0)'); c.fillStyle = g; c.fillRect(x - 20, 130, 40, 40); };
    blush(FX - 34); blush(FX + 34);
    // slicked-back dark hair: covers the top, the sides above the ears and the whole back
    c.fillStyle = '#1b1311';
    c.beginPath();
    c.moveTo(0, 0); c.lineTo(W, 0); c.lineTo(W, 205);
    c.bezierCurveTo(400, 215, 300, 200, 256, 150);        // back hairline down to the nape
    c.bezierCurveTo(230, 110, 200, 72, FX + 60, 70);      // side hairline around the temple
    c.bezierCurveTo(FX + 30, 60, FX - 30, 60, FX - 60, 70); // forehead hairline
    c.bezierCurveTo(56, 72, 26, 110, 0, 150);
    c.closePath(); c.fill();
    // glossy highlights combed back
    c.strokeStyle = 'rgba(120,90,75,0.55)'; c.lineWidth = 2;
    for (let i = -5; i <= 5; i++) { c.beginPath(); c.moveTo(FX + i * 14, 66); c.quadraticCurveTo(FX + i * 10 + 60, 20, 380 + i * 8, 10); c.stroke(); }
    // brows: dark, sharply arched
    c.strokeStyle = '#1f130d'; c.lineCap = 'round'; c.lineWidth = 5;
    c.lineWidth = 7; c.beginPath(); c.moveTo(FX - 52, 100); c.quadraticCurveTo(FX - 36, 80, FX - 11, 92); c.stroke();
    c.beginPath(); c.moveTo(FX + 52, 100); c.quadraticCurveTo(FX + 36, 80, FX + 11, 92); c.stroke();
    // eyes: smoky shadow, whites, blue-grey irises, heavy lashes with a wing
    for (const [x, dir] of [[FX - 29, -1], [FX + 29, 1]]) {
      const sh = c.createRadialGradient(x, 112, 3, x, 112, 24);
      sh.addColorStop(0, 'rgba(90,50,40,0.75)'); sh.addColorStop(1, 'rgba(90,50,40,0)');
      c.fillStyle = sh; c.fillRect(x - 26, 92, 52, 36);
      c.fillStyle = '#f3ede8'; c.beginPath(); c.ellipse(x, 115, 15, 7.5, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#7fa3b8'; c.beginPath(); c.arc(x, 115, 6.8, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(x, 115, 6.8, 0, Math.PI * 2); c.lineWidth = 1.5; c.strokeStyle = '#3a5060'; c.stroke();
      c.fillStyle = '#0c0c0c'; c.beginPath(); c.arc(x, 115, 3, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#ffffff'; c.fillRect(x - 3, 111, 2.5, 2.5);
      c.strokeStyle = '#070303'; c.lineWidth = 4.5;
      c.beginPath(); c.moveTo(x - 16, 116); c.quadraticCurveTo(x, 103, x + 16, 114); c.stroke();
      c.beginPath(); c.moveTo(x + dir * 15, 113); c.lineTo(x + dir * 25, 105); c.stroke();
      c.lineWidth = 1.6;
      for (let k = -12; k <= 12; k += 3) { c.beginPath(); c.moveTo(x + k, 108); c.lineTo(x + k * 1.25 + dir * 2, 100); c.stroke(); }
      c.lineWidth = 1.5; c.beginPath(); c.moveTo(x - 13, 120); c.quadraticCurveTo(x, 125, x + 13, 120); c.stroke();
    }
    // nose: soft shading and nostrils
    c.strokeStyle = 'rgba(165,105,85,0.7)'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(FX - 4, 112); c.quadraticCurveTo(FX - 7, 135, FX - 5, 142); c.stroke();
    c.fillStyle = 'rgba(120,70,55,0.6)'; c.beginPath(); c.ellipse(FX - 5, 144, 2.5, 1.5, 0, 0, 7); c.fill(); c.beginPath(); c.ellipse(FX + 5, 144, 2.5, 1.5, 0, 0, 7); c.fill();
    // full glossy mauve lips
    c.fillStyle = '#9a4a5a';
    c.beginPath(); c.moveTo(FX - 22, 162); c.quadraticCurveTo(FX - 10, 149, FX, 154); c.quadraticCurveTo(FX + 10, 149, FX + 22, 162); c.quadraticCurveTo(FX, 165, FX - 22, 162); c.fill();
    c.fillStyle = '#b86676';
    c.beginPath(); c.moveTo(FX - 22, 162); c.quadraticCurveTo(FX, 184, FX + 22, 162); c.quadraticCurveTo(FX, 166, FX - 22, 162); c.fill();
    c.fillStyle = 'rgba(255,225,230,0.8)'; c.beginPath(); c.ellipse(FX, 170, 8, 2.5, 0, 0, 7); c.fill();
    c.strokeStyle = 'rgba(90,30,40,0.85)'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(FX - 21, 162); c.quadraticCurveTo(FX, 166, FX + 21, 162); c.stroke();
  });
  return vexHead;
}

// ---------------------------------------------------------------- builders
const BUILDERS = {
  husk() {
    const M = new MaterialSet();
    const suit = M.make(0xa05a22), skin = M.make(0x7a8a64), boot = M.make(0x2a2018), eye = M.make(0x000000, { glow: 0xffd020, map: null });
    const mouth = M.make(0x200808, { map: null }), bone = M.make(0xd8cca0);
    const P = humanoid(M, { height: 1.85, hunch: 0.38, armLen: 0.95, legMat: suit, torsoMat: suit, headMat: skin, armMat: skin, footMat: boot, handMat: skin, headForward: 0.08 });
    const hs = P.headSize;
    put(P.head, box(0.05, 0.035, 0.02, eye, 'center'), -0.055, hs * 0.72, hs * 0.53);
    put(P.head, box(0.05, 0.035, 0.02, eye, 'center'), 0.055, hs * 0.72, hs * 0.53);
    put(P.head, box(hs * 0.6, 0.06, 0.02, mouth, 'center'), 0, hs * 0.3, hs * 0.53);
    for (let i = 0; i < 4; i++) put(P.torso, box(0.3, 0.02, 0.02, bone, 'center'), 0, 0.25 + i * 0.07, 0.14);
    for (const h of [P.handL, P.handR]) for (let i = -1; i <= 1; i++) put(h, cone(0.015, 0.12, bone), i * 0.035, -0.15, 0.02, PI, 0, 0);
    return { M, P, kind: 'humanoid', thickness: 0.3 };
  },

  rifter() {
    const M = new MaterialSet();
    const armor = M.make(0x34445e), hi = M.make(0x5a6e90), dark = M.make(0x161c28), gun = M.make(0x26262a);
    const visor = M.make(0x000000, { glow: 0xff2a1a, map: null });
    const P = humanoid(M, { height: 1.9, legMat: armor, torsoMat: armor, headMat: armor, armMat: armor, footMat: dark, handMat: dark, torsoW: 0.5 });
    put(P.torso, box(0.36, 0.3, 0.06, hi, 'center'), 0, 0.38, 0.13);
    put(P.torso, box(0.3, 0.35, 0.18, dark, 'center'), 0, 0.35, -0.15);
    for (const s of [-1, 1]) put(P.torso, box(0.18, 0.1, 0.3, hi, 'center'), s * 0.3, 0.55, 0);
    put(P.head, box(0.2, 0.05, 0.02, visor, 'center'), 0, 0.15, 0.13);
    const rifle = put(P.handR, box(0.08, 0.1, 0.62, gun, 'center'), 0, -0.05, 0.25);
    put(rifle, cyl(0.02, 0.02, 0.25, dark, 6), 0, 0.01, 0.4, PI / 2, 0, 0);
    const fl = muzzle(rifle, 0, 0.01, 0.58, 0xffc040, 0.7);
    return { M, P, kind: 'humanoid', ranged: true, flash: fl, thickness: 0.3 };
  },

  spitter() {
    const M = new MaterialSet();
    const skin = M.make(0xc8b878), sac = M.make(0x508a20, { glow: 0x6aff30, glowIntensity: 0.9 }), mouthM = M.make(0x2a0606, { map: null });
    const teeth = M.make(0xf0e8d0), eye = M.make(0x000000, { glow: 0xff2010, map: null });
    const root = new THREE.Group();
    const body = joint(root, 0, 0.55, 0);
    const belly = put(body, ball(0.6, skin, 1), 0, 0.45, 0); belly.scale.set(1, 0.85, 0.9);
    const head = joint(body, 0, 0.95, 0.25);
    put(head, ball(0.38, skin, 1));
    const jaw = joint(head, 0, -0.05, 0.28);
    put(jaw, box(0.42, 0.06, 0.12, mouthM, 'center'));
    const lower = joint(head, 0, -0.12, 0.2);
    put(lower, box(0.4, 0.07, 0.25, skin, 'center'), 0, -0.02, 0.05);
    for (let i = -2; i <= 2; i++) { put(jaw, cone(0.025, 0.07, teeth), i * 0.07, 0.05, 0.05, PI, 0, 0); put(lower, cone(0.022, 0.06, teeth), i * 0.07, 0.03, 0.14); }
    for (const [x, y] of [[-0.12, 0.2], [0.12, 0.2], [0, 0.28]]) put(head, box(0.05, 0.04, 0.03, eye, 'center'), x, y, 0.33);
    for (const [x, y, z, r] of [[-0.35, 0.5, 0.35, 0.13], [0.4, 0.3, 0.3, 0.1], [0.1, 0.1, 0.5, 0.09], [-0.2, 0.75, 0.3, 0.08]]) put(body, ball(r, sac, 0), x, y, z);
    const legs = [];
    for (const s of [-1, 1]) { const hip = joint(root, s * 0.3, 0.55, 0); hip.add(box(0.2, 0.55, 0.22, skin)); legs.push(hip); }
    const arms = [];
    for (const s of [-1, 1]) { const sh = joint(body, s * 0.55, 0.7, 0.1); sh.add(box(0.1, 0.4, 0.1, skin)); arms.push(sh); }
    const glob = put(head, ball(0.12, M.make(0x60c020, { glow: 0x9aff40 }), 0), 0, -0.05, 0.4); glob.visible = false;
    return {
      M, root, thickness: 0.8, ranged: true,
      anim(pose, t, poseT) {
        const w = Math.sin(t);
        legs[0].rotation.x = pose === 'walk' ? -w * 0.5 : 0; legs[1].rotation.x = pose === 'walk' ? w * 0.5 : 0;
        arms[0].rotation.set(pose === 'walk' ? w * 0.6 : -0.3, 0, -0.5); arms[1].rotation.set(pose === 'walk' ? -w * 0.6 : -0.3, 0, 0.5);
        body.position.y = 0.55 + (pose === 'walk' ? Math.abs(Math.cos(t)) * 0.05 : 0);
        const open = pose === 'aim' ? 0.6 : pose === 'fire' ? 0.8 : pose === 'windup' || pose === 'strike' ? 0.5 : 0.1 + Math.sin(t * 2) * 0.05;
        lower.rotation.x = open; glob.visible = pose === 'fire';
        body.rotation.x = pose === 'pain' ? -0.3 : pose === 'strike' ? 0.3 : 0;
        belly.scale.set(1 + (pose === 'aim' ? 0.08 : 0), 0.85, 0.9);
      },
    };
  },

  hound() {
    const M = new MaterialSet();
    const hide = M.make(0x7a2018), dark = M.make(0x4a100c), bone = M.make(0xe0d0b0), mouthM = M.make(0x200404, { map: null });
    const eye = M.make(0x000000, { glow: 0xffe040, map: null });
    const root = new THREE.Group();
    const body = joint(root, 0, 0.75, 0);
    put(body, box(0.62, 0.5, 1.25, hide, 'center'), 0, 0.05, 0);
    put(body, box(0.7, 0.55, 0.5, dark, 'center'), 0, 0.12, 0.38);
    for (let i = 0; i < 6; i++) put(body, cone(0.05, 0.25 - Math.abs(i - 2.5) * 0.03, bone), 0, 0.42, 0.45 - i * 0.18);
    const neck = joint(body, 0, 0.15, 0.65);
    const head = put(neck, box(0.42, 0.34, 0.5, hide, 'center'), 0, 0, 0.2);
    put(head, box(0.08, 0.05, 0.02, eye, 'center'), -0.12, 0.08, 0.25); put(head, box(0.08, 0.05, 0.02, eye, 'center'), 0.12, 0.08, 0.25);
    for (const s of [-1, 1]) put(head, cone(0.05, 0.22, bone), s * 0.17, 0.22, -0.05, -0.4, 0, s * 0.4);
    const jaw = joint(neck, 0, -0.12, 0.2);
    put(jaw, box(0.38, 0.1, 0.48, dark, 'center'), 0, -0.04, 0.24);
    put(head, box(0.36, 0.05, 0.46, mouthM, 'center'), 0, -0.16, 0.02);
    for (let i = -2; i <= 2; i++) { put(head, cone(0.025, 0.09, bone), i * 0.07, -0.2, 0.2, PI, 0, 0); put(jaw, cone(0.022, 0.08, bone), i * 0.07, 0.03, 0.4); }
    const legs = [];
    for (const [x, z] of [[-0.28, 0.45], [0.28, 0.45], [-0.26, -0.45], [0.26, -0.45]]) {
      const hip = joint(body, x, -0.05, z); hip.add(box(0.16, 0.4, 0.18, hide));
      const knee = joint(hip, 0, -0.38, 0); knee.add(box(0.12, 0.35, 0.13, dark));
      put(knee, cone(0.03, 0.1, bone), 0, -0.36, 0.08, PI / 2, 0, 0);
      legs.push([hip, knee]);
    }
    const tail = joint(body, 0, 0.1, -0.62); put(tail, box(0.08, 0.08, 0.5, hide, 'center'), 0, 0, -0.25);
    return {
      M, root, thickness: 0.6,
      anim(pose, t, poseT) {
        const w = Math.sin(t);
        legs.forEach(([hip, knee], i) => {
          const ph = (i === 0 || i === 3) ? w : -w;
          hip.rotation.x = pose === 'walk' ? ph * 0.7 : 0;
          knee.rotation.x = pose === 'walk' ? Math.max(0, -ph) * 0.8 : 0;
        });
        body.position.y = 0.75 + (pose === 'walk' ? Math.abs(Math.cos(t)) * 0.08 : 0);
        body.rotation.x = pose === 'windup' ? -0.25 : pose === 'strike' ? 0.2 : pose === 'pain' ? -0.35 : 0;
        jaw.rotation.x = pose === 'windup' ? 0.7 : pose === 'strike' ? 0.1 : 0.05 + Math.max(0, Math.sin(t * 0.5)) * 0.15;
        neck.rotation.x = pose === 'strike' ? 0.35 : 0;
        tail.rotation.y = Math.sin(t * 1.3) * 0.4;
      },
    };
  },

  wraith() {
    const M = new MaterialSet();
    const cloak = M.make(0x2e1a40, { side: THREE.DoubleSide }), bone = M.make(0xd8ccb0), dark = M.make(0x0a0408, { map: null });
    const eye = M.make(0x000000, { glow: 0xff8020, map: null });
    const root = new THREE.Group();
    const body = joint(root, 0, 0.5, 0);
    const robe = put(body, cone(0.5, 1.3, cloak, 7), 0, 0.45, 0); robe.rotation.x = PI;
    put(body, ball(0.32, cloak, 1), 0, 1.05, 0);
    const head = joint(body, 0, 1.35, 0.05);
    put(head, ball(0.26, cloak, 1)).scale.set(1, 1.1, 1);
    put(head, ball(0.2, dark, 1), 0, -0.02, 0.1);
    const skull = put(head, ball(0.15, bone, 1), 0, -0.02, 0.13); skull.scale.set(1, 1.15, 0.9);
    put(head, box(0.05, 0.04, 0.02, eye, 'center'), -0.055, 0.02, 0.27); put(head, box(0.05, 0.04, 0.02, eye, 'center'), 0.055, 0.02, 0.27);
    const flame = glowSprite(0xff7020, 0.9); flame.position.set(0, 0.35, 0); head.add(flame);
    const arms = [];
    for (const s of [-1, 1]) { const sh = joint(body, s * 0.36, 1.05, 0); sh.add(box(0.12, 0.55, 0.12, cloak)); const h = put(sh, box(0.08, 0.14, 0.08, bone), 0, -0.55, 0); arms.push(sh); for (let i = -1; i <= 1; i++) put(h, cone(0.012, 0.1, bone), i * 0.025, -0.14, 0, PI, 0, 0); }
    const orb = glowSprite(0xff8020, 0.6); orb.position.set(0, 0.8, 0.45); orb.visible = false; body.add(orb);
    return {
      M, root, thickness: 0.6, ranged: true, float: true,
      anim(pose, t, poseT) {
        body.position.y = 0.5 + Math.sin(t * 0.8) * 0.1;
        robe.rotation.z = Math.sin(t * 0.7) * 0.06;
        const cast = pose === 'aim' || pose === 'fire';
        arms[0].rotation.set(cast ? -1.3 : Math.sin(t * 0.6) * 0.2, 0, cast ? 0.35 : -0.35);
        arms[1].rotation.set(cast ? -1.3 : -Math.sin(t * 0.6) * 0.2, 0, cast ? -0.35 : 0.35);
        orb.visible = cast; orb.scale.setScalar(pose === 'fire' ? 1.0 : 0.55);
        flame.scale.setScalar(0.8 + Math.sin(t * 7) * 0.15);
        head.rotation.x = pose === 'pain' ? -0.4 : 0;
      },
    };
  },

  warden() {
    const M = new MaterialSet();
    const skin = M.make(0x6a1a10), armor = M.make(0x3a3a42), horn = M.make(0xd8c8a0), dark = M.make(0x1a1a1a);
    const glow = M.make(0x802010, { glow: 0xff3a10, map: null });
    const P = humanoid(M, { height: 3.6, legW: 0.38, armW: 0.34, torsoW: 1.2, torsoD: 0.7, head: 0.42, hunch: 0.15,
      legMat: skin, torsoMat: skin, headMat: skin, armMat: skin, footMat: dark, handMat: skin, headForward: 0.1 });
    put(P.torso, box(0.95, 0.65, 0.12, armor, 'center'), 0, 0.65, 0.36);
    put(P.torso, box(0.8, 0.05, 0.02, glow, 'center'), 0, 0.62, 0.43);
    put(P.torso, box(0.05, 0.55, 0.02, glow, 'center'), 0, 0.65, 0.43);
    for (const s of [-1, 1]) {
      put(P.torso, box(0.5, 0.3, 0.8, armor, 'center'), s * 0.7, 1.0, 0);
      const h = put(P.head, cone(0.09, 0.6, horn, 6), s * 0.22, 0.55, -0.05, -0.3, 0, -s * 0.6);
      h.scale.set(1, 1, 1);
    }
    put(P.head, box(0.1, 0.05, 0.02, glow, 'center'), -0.1, 0.3, 0.23); put(P.head, box(0.1, 0.05, 0.02, glow, 'center'), 0.1, 0.3, 0.23);
    // cannon on the right arm
    const cannon = put(P.elR, cyl(0.2, 0.24, 0.9, armor, 8), 0, -0.55, 0.15, PI / 2, 0, 0);
    put(cannon, cyl(0.12, 0.12, 0.05, glow, 8), 0, 0.46, 0);
    const fl = muzzle(P.elR, 0, -0.55, 0.7, 0xff5020, 1.4);
    for (let i = -1; i <= 1; i++) put(P.handL, cone(0.05, 0.3, horn), i * 0.1, -0.35, 0.05, PI, 0, 0);
    return { M, P, kind: 'humanoid', ranged: true, flash: fl, thickness: 0.8 };
  },

  ally() {
    const M = new MaterialSet();
    const skin = M.make(0xe2b49a, { flat: false, map: null }), hair = M.make(0x1c1412, { flat: false });
    const jacket = M.make(0x8a9098, { flat: false }), top = M.make(0x0e0e10, { flat: false }), seam = M.make(0xc8ccd0, { map: null, flat: false });
    const legs = M.make(0x17171b, { flat: false }), shoes = M.make(0xe4e4e8, { flat: false }), gun = M.make(0x26282c);
    const headMat = M.make(0xffffff, { map: vexHeadTexture(), flat: false });
    const P = humanoid(M, {
      height: 1.74, smooth: true, torsoW: 0.3, torsoD: 0.19, legW: 0.12, armW: 0.075, head: 0.2, hipSpread: 0.3,
      legMat: legs, armMat: jacket, foreMat: jacket, footMat: shoes, handMat: skin,
      torsoFn(spine, W, Hh) {
        const t = new THREE.Group(); spine.add(t);
        put(t, cyl(0.135, 0.15, 0.13, legs, 14, 'bottom'), 0, -0.05, 0).scale.set(1, 1, 0.7);          // hips
        put(t, cyl(0.155, 0.12, 0.2, jacket, 14, 'bottom'), 0, 0.06, 0).scale.set(1, 1, 0.66);          // waist
        put(t, cyl(0.16, 0.155, 0.22, jacket, 14, 'bottom'), 0, 0.26, 0).scale.set(1, 1, 0.72);         // chest
        put(t, box(0.075, 0.26, 0.02, top, 'center'), 0, 0.36, 0.105, -0.12, 0, 0);                    // open zip, black top
        for (const s of [-1, 1]) put(t, box(0.12, 0.012, 0.012, seam, 'center'), s * 0.09, 0.4, 0.105, 0, 0, s * 0.35);
        put(t, cyl(0.075, 0.09, 0.08, jacket, 12, 'bottom'), 0, 0.47, -0.01);                          // raised collar
        for (const s of [-1, 1]) put(t, ball(0.07, jacket, 2), s * 0.15, 0.44, 0).scale.set(1, 0.8, 1); // shoulders
        return t;
      },
      headFn(neck, hs) {
        put(neck, cyl(0.045, 0.05, 0.11, skin, 10, 'bottom'), 0, -0.02, 0);
        put(neck, box(0.03, 0.03, 0.006, M.make(0x35353a, { map: null }), 'center'), -0.03, 0.03, 0.043, 0, -0.5, 0);  // rose tattoo
        const head = joint(neck, 0, 0.09, 0.01);
        const skull = put(head, smoothSphere(0.1, headMat), 0, 0.1, 0);
        skull.scale.set(0.88, 1.18, 1.0);
        put(head, smoothSphere(0.05, skin, 12, 8), 0, 0.02, 0.035).scale.set(1.1, 0.9, 1.1);       // jaw / chin
        // hair volume: a sleek cap over the top and a fuller shell over the back of the head
        const cap = put(head, new THREE.Mesh(new THREE.SphereGeometry(0.106, 24, 10, 0, Math.PI * 2, 0, Math.PI * 0.3), hair), 0, 0.1, 0);
        cap.scale.set(0.9, 1.2, 1.02);
        const back = put(head, new THREE.Mesh(new THREE.SphereGeometry(0.109, 20, 14, Math.PI * 0.85, Math.PI * 1.3, 0, Math.PI * 0.72), hair), 0, 0.1, -0.004);
        back.scale.set(0.92, 1.2, 1.03);
        for (const m of [cap, back]) { shadeGeo(m.geometry); }
        return head;
      },
    });
    // hair: high ponytail cascading down the back, long waves over one shoulder
    const hs = 0.2;
    const pony = joint(P.head, 0, 0.21, -0.05);
    put(pony, ball(0.045, hair, 2));
    const tail = []; let prev = pony;
    for (let i = 0; i < 7; i++) {
      const seg = joint(prev, 0, i === 0 ? 0 : -0.09, 0);
      put(seg, capsule(0.045 - i * 0.003, 0.12, hair)).scale.set(1.2, 1, 0.8);
      seg.rotation.x = i === 0 ? 0.9 : -0.13; tail.push(seg); prev = seg;
    }
    // long wavy hair falling forward over her right shoulder
    const lock = []; prev = joint(P.head, -0.085, 0.12, 0.0);
    for (let i = 0; i < 7; i++) {
      const seg = joint(prev, 0, i === 0 ? 0 : -0.075, 0);
      put(seg, capsule(0.04 - i * 0.002, 0.12, hair)).scale.set(1.35, 1, 0.7);
      seg.rotation.z = i === 0 ? -0.45 : (i === 1 ? 0.35 : (i % 2 ? 0.16 : -0.16));
      seg.rotation.x = i === 1 ? -0.3 : 0.03;
      lock.push(seg); prev = seg;
    }
    const pistol = put(P.handR, box(0.04, 0.065, 0.19, gun, 'center'), 0, -0.04, 0.07);
    const fl = muzzle(pistol, 0, 0.01, 0.13, 0xffc040, 0.45);
    void hs;
    return {
      M, P, kind: 'humanoid', ranged: true, flash: fl, thickness: 0.25,
      extra(pose, t) {
        tail.forEach((s, i) => { s.rotation.x = (i === 0 ? 0.9 : -0.13) + Math.sin(t * 1.4 + i * 0.7) * 0.05; s.rotation.z = Math.sin(t * 0.9 + i) * 0.05; });
        lock.forEach((s, i) => { if (i > 1) s.rotation.z = (i % 2 ? 0.16 : -0.16) + Math.sin(t * 1.2 + i) * 0.04; });
      },
    };
  },

  hellmaw() {
    const M = new MaterialSet();
    const hide = M.make(0x8a845c, { flat: false }), dark = M.make(0x5a4a34, { flat: false }), vein = M.make(0x7a2a20, { flat: false });
    const bone = M.make(0xe8dcc0), gum = M.make(0x4a0a08, { glow: 0xff4010, glowIntensity: 0.55 });
    const eye = M.make(0x103010, { glow: 0x60ff90, map: null });
    const root = new THREE.Group();
    const body = joint(root, 0, 1.7, 0);
    const head = put(body, ball(0.72, hide, 2)); head.scale.set(1.1, 0.95, 1.05);
    for (const [x, y, z, r] of [[-0.3, 0.55, 0.1, 0.22], [0.25, 0.6, -0.1, 0.25], [0, 0.5, 0.4, 0.18], [0.45, 0.3, -0.35, 0.2]]) put(body, ball(r, dark, 1), x, y, z);
    for (const [x, y, z] of [[-0.4, 0.35, 0.45], [0.3, 0.45, 0.4], [0.55, 0.1, 0.35]]) put(body, ball(0.09, vein, 1), x, y, z).scale.set(1.8, 0.5, 1);
    for (const [x, y] of [[-0.22, 0.22], [0.22, 0.22], [0, 0.34]]) put(body, ball(0.065, eye, 1), x, y, 0.64);
    // mouth: glowing gums, two rows of teeth, a hinged lower jaw
    const maw = put(body, ball(0.52, gum, 2), 0, -0.14, 0.42); maw.scale.set(1.25, 0.42, 0.55);
    for (let i = 0; i < 13; i++) {
      const a = (i / 12 - 0.5) * 2.3;
      put(body, cone(0.035, 0.16, bone, 5), Math.sin(a) * 0.6, -0.03, 0.42 + Math.cos(a) * 0.38, Math.PI, 0, 0);
    }
    const jaw = joint(body, 0, -0.2, 0.05);
    const chin = put(jaw, ball(0.55, hide, 2), 0, -0.12, 0.25); chin.scale.set(1.1, 0.42, 0.95);
    for (let i = 0; i < 12; i++) {
      const a = (i / 11 - 0.5) * 2.2;
      put(jaw, cone(0.032, 0.15, bone, 5), Math.sin(a) * 0.55, 0.02, 0.28 + Math.cos(a) * 0.36);
    }
    const fire = glowSprite(0xff6020, 0.9); fire.position.set(0, -0.12, 0.6); fire.visible = false; body.add(fire);
    // dangling tentacles
    const tents = [];
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + 0.4;
      let prev = joint(body, Math.cos(a) * 0.35, -0.45, Math.sin(a) * 0.3 - 0.1);
      const segs = [];
      for (let i = 0; i < 3; i++) {
        const seg = joint(prev, 0, i === 0 ? 0 : -0.32, 0);
        put(seg, capsule(0.07 - i * 0.018, 0.36, i === 2 ? dark : hide));
        segs.push(seg); prev = seg;
      }
      tents.push(segs);
    }
    return {
      M, root, thickness: 1.0, ranged: true, float: true,
      anim(pose, t) {
        body.position.y = 1.7 + Math.sin(t * 0.9) * 0.12;
        body.rotation.x = pose === 'pain' ? -0.35 : pose === 'strike' ? 0.3 : Math.sin(t * 0.5) * 0.05;
        const open = pose === 'aim' ? 0.55 : pose === 'fire' ? 0.75 : pose === 'windup' ? 0.6 : pose === 'strike' ? 0.1 : 0.12 + Math.sin(t * 1.5) * 0.06;
        jaw.rotation.x = open;
        fire.visible = pose === 'aim' || pose === 'fire';
        fire.scale.setScalar(pose === 'fire' ? 1.3 : 0.7 + Math.sin(t * 20) * 0.1);
        tents.forEach((segs, k) => segs.forEach((s, i) => {
          s.rotation.x = Math.sin(t * 1.6 + k + i * 0.8) * (0.25 + i * 0.1);
          s.rotation.z = Math.cos(t * 1.3 + k * 2 + i) * (0.2 + i * 0.1);
        }));
      },
      death(deathT) {
        const k = Math.min(1, deathT / 0.6);
        body.position.y = 1.7 - k * k * 1.1;
        body.rotation.x = -k * 0.9; body.rotation.z = k * 0.4;
        jaw.rotation.x = 0.9; fire.visible = false;
      },
    };
  },

  ravager() {
    const M = new MaterialSet();
    const hide = M.make(0xa9aca2, { flat: false }), sinew = M.make(0x6e7068, { flat: false }), flesh = M.make(0x8a2a24, { flat: false });
    const bone = M.make(0xe8e0cc), gum = M.make(0x5a0c0a, { flat: false });
    const P = humanoid(M, {
      height: 2.3, smooth: true, hunch: 0.55, legW: 0.22, armW: 0.19, armLen: 1.1, torsoW: 0.7, torsoD: 0.42, head: 0.3,
      legMat: hide, armMat: hide, foreMat: sinew, footMat: sinew, handMat: sinew, headForward: 0.14,
      torsoFn(spine, W, Hh, D) {
        const t = new THREE.Group(); spine.add(t);
        put(t, ball(0.36, hide, 2), 0, 0.18, 0).scale.set(1, 0.9, 0.75);        // gut
        put(t, ball(0.44, hide, 2), 0, 0.5, 0).scale.set(1.05, 0.8, 0.8);       // chest
        for (const s of [-1, 1]) put(t, ball(0.24, hide, 2), s * 0.38, 0.68, 0);  // huge shoulders
        for (let i = 0; i < 4; i++) put(t, capsule(0.025, 0.36, bone, 'center'), 0, 0.3 + i * 0.09, 0.3, 0, 0, Math.PI / 2);   // ribs
        put(t, box(0.3, 0.3, 0.02, flesh, 'center'), 0, 0.42, 0.28);
        return t;
      },
      headFn(neck, hs) {
        const head = joint(neck, 0, 0.02, 0.05);
        put(head, ball(0.2, hide, 2), 0, 0.2, -0.02).scale.set(1, 1.05, 1.1);
        put(head, ball(0.16, gum, 2), 0, 0.06, 0.12).scale.set(1.1, 0.6, 1.0);
        for (let i = 0; i < 7; i++) {
          const x = (i - 3) * 0.045;
          put(head, cone(0.018, 0.09, bone, 5), x, 0.12, 0.24 - Math.abs(i - 3) * 0.01, Math.PI, 0, 0);
          put(head, cone(0.016, 0.08, bone, 5), x, -0.01, 0.23 - Math.abs(i - 3) * 0.01);
        }
        for (const s of [-1, 1]) put(head, ball(0.03, M.make(0x200000, { glow: 0xff2010, map: null }), 1), s * 0.07, 0.27, 0.17);
        return head;
      },
    });
    for (const h of [P.handL, P.handR]) for (let i = -1; i <= 1; i++) put(h, cone(0.03, 0.22, bone, 5), i * 0.05, -0.2, 0.04, Math.PI + 0.2, 0, 0);
    return { M, P, kind: 'humanoid', thickness: 0.6 };
  },
};

// How each sculpted (skinned) model is animated.
const RIGS = {
  ally: { fn: rigs.humanoid, cfg: { aim: { rz: -0.12, lz: 0.55 } }, thickness: 0.25 },
  husk: { fn: rigs.humanoid, cfg: { hunch: 0.35, jawIdle: 0.25, stride: 0.45 }, thickness: 0.3 },
  rifter: { fn: rigs.humanoid, cfg: { aim: { rz: -0.1, lz: 0.5 } }, thickness: 0.3 },
  ravager: { fn: rigs.humanoid, cfg: { hunch: 0.45, jawIdle: 0.2, stride: 0.55 }, thickness: 0.55 },
  warden: { fn: rigs.humanoid, cfg: { hunch: 0.12, jawIdle: 0.1, stride: 0.45, aim: { twoHanded: false, rz: -0.05 } }, thickness: 0.8 },
  spitter: { fn: rigs.spitter, thickness: 0.8 },
  hound: { fn: rigs.hound, thickness: 0.6 },
  hellmaw: { fn: rigs.hellmaw, death: rigs.hellmawDeath, thickness: 1.0 },
  wraith: { fn: rigs.wraith, thickness: 0.6 },
};

/** Build a model. Returns an object with .root (add to the scene) and .update(). */
export function buildCreature(type) {
  if (hasModel(type) && RIGS[type]) {
    const inst = instantiate(type), rig = RIGS[type], B = inst.bones;
    const root = new THREE.Group();
    root.add(inst.root);
    return {
      root, mats: inst.mats, float: type === 'hellmaw' || type === 'wraith',
      update(pose, t, poseT, deathT) {
        const firing = pose === 'fire', casting = pose === 'aim' || pose === 'fire';
        for (const m of inst.extras.muzzles) m.visible = firing;
        for (const g of inst.extras.glows) if (g.tag === 'cast') { g.visible = casting; g.scale.setScalar(firing ? 1.3 : 0.8); }
        if (pose === 'dead') {
          if (rig.death) rig.death(B, deathT); else animDeath(inst.root, deathT, rig.thickness);
          for (const m of inst.extras.muzzles) m.visible = false;
          return;
        }
        inst.root.rotation.x = 0; inst.root.position.y = 0;
        rig.fn(B, pose, t, poseT, rig.cfg);
      },
      dispose() { inst.mats.dispose(); },
    };
  }
  const m = BUILDERS[type]();
  const root = new THREE.Group();
  root.add(m.P ? m.P.root : m.root);
  const inner = m.P ? m.P.root : m.root;
  mergeStatic(inner);
  return {
    root, mats: m.M, float: !!m.float,
    update(pose, t, poseT, deathT) {
      if (pose === 'dead') { if (m.death) m.death(deathT); else animDeath(inner, deathT, m.thickness); if (m.flash) m.flash.visible = false; return; }
      inner.rotation.x = 0; inner.position.y = 0;
      if (m.P) animHumanoid(m.P, pose, t, poseT);
      if (m.anim) m.anim(pose, t, poseT);
      if (m.extra) m.extra(pose, t);
      if (m.flash) m.flash.visible = pose === 'fire';
    },
    dispose() { m.M.dispose(); },
  };
}
