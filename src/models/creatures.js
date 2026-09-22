// 3D monster + companion models, built from simple shapes and animated with
// joints (hips, knees, shoulders, elbows...). Every model faces +z.
//
// Poses: 'idle' | 'walk' | 'windup' (melee wind-up) | 'strike' (melee hit)
//        'aim' (ranged wind-up) | 'fire' (ranged shot) | 'pain' | 'dead'

import * as THREE from 'three';
import { MaterialSet, box, cyl, ball, cone, joint, put, paintedTexture, mergeStatic } from './common.js';
import { glowTexture } from '../effects/Effects.js';

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
    const hip = joint(body, s * torsoW * 0.26, 0, 0);
    hip.add(box(legW, legLen * 0.52, legW * 1.1, c.legMat));
    const knee = joint(hip, 0, -legLen * 0.5, 0);
    knee.add(box(legW * 0.88, legLen * 0.5 - footH, legW, c.shinMat || c.legMat));
    put(knee, box(legW * 1.05, footH, legW * 1.9, c.footMat), 0, -(legLen * 0.5 - footH), legW * 0.35);
    P['hip' + k] = hip; P['knee' + k] = knee;
  }
  const spine = joint(body, 0, 0, 0);
  spine.rotation.x = c.hunch || 0;
  P.spine = spine; P.hunch = c.hunch || 0;
  P.torso = put(spine, box(torsoW, torsoH, torsoD, c.torsoMat, 'bottom'));
  const neck = joint(spine, 0, torsoH, c.headForward || 0);
  P.neck = neck;
  const headMat = c.headMats || c.headMat;
  P.head = put(neck, box(headS, headS * 1.15, headS * 1.05, headMat, 'bottom'), 0, headS * 0.08, 0);
  P.headSize = headS;
  for (const [s, k] of [[-1, 'L'], [1, 'R']]) {
    const sh = joint(spine, s * (torsoW / 2 + armW / 2), torsoH - armW * 0.4, 0);
    sh.add(box(armW, armLen * 0.5, armW, c.armMat));
    const el = joint(sh, 0, -armLen * 0.48, 0);
    el.add(box(armW * 0.9, armLen * 0.46, armW * 0.9, c.foreMat || c.armMat));
    const hand = put(el, box(armW * 0.95, armW * 1.1, armW * 1.1, c.handMat || c.foreMat || c.armMat), 0, -armLen * 0.46, 0);
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

// ---------------------------------------------------------------- VEX's face
let vexFace = null;
function vexFaceTexture() {
  if (vexFace) return vexFace;
  vexFace = paintedTexture(64, 72, (c, w, h) => {
    c.fillStyle = '#e2b49a'; c.fillRect(0, 0, w, h);
    // hairline (hair pulled tightly back)
    c.fillStyle = '#1a1210'; c.fillRect(0, 0, w, 9);
    c.beginPath(); c.moveTo(0, 9); c.quadraticCurveTo(32, 16, 64, 9); c.lineTo(64, 0); c.lineTo(0, 0); c.fill();
    // contour / cheek shading
    const g = c.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, 'rgba(150,95,75,0.55)'); g.addColorStop(0.2, 'rgba(150,95,75,0)'); g.addColorStop(0.8, 'rgba(150,95,75,0)'); g.addColorStop(1, 'rgba(150,95,75,0.55)');
    c.fillStyle = g; c.fillRect(0, 18, w, 54);
    // brows: dark, sharply arched
    c.strokeStyle = '#1f140e'; c.lineWidth = 3; c.lineCap = 'round';
    c.beginPath(); c.moveTo(10, 27); c.quadraticCurveTo(18, 20, 27, 24); c.stroke();
    c.beginPath(); c.moveTo(54, 27); c.quadraticCurveTo(46, 20, 37, 24); c.stroke();
    // smoky eye shadow
    c.fillStyle = 'rgba(80,45,35,0.6)';
    c.beginPath(); c.ellipse(19, 31, 9, 5, 0, 0, PI * 2); c.fill();
    c.beginPath(); c.ellipse(45, 31, 9, 5, 0, 0, PI * 2); c.fill();
    // eyes: whites, blue-grey irises, heavy winged lashes
    for (const [x, dir] of [[19, -1], [45, 1]]) {
      c.fillStyle = '#f2ece6'; c.beginPath(); c.ellipse(x, 33, 6, 3, 0, 0, PI * 2); c.fill();
      c.fillStyle = '#86a8bc'; c.beginPath(); c.arc(x, 33, 2.8, 0, PI * 2); c.fill();
      c.fillStyle = '#101010'; c.beginPath(); c.arc(x, 33, 1.3, 0, PI * 2); c.fill();
      c.strokeStyle = '#080404'; c.lineWidth = 2.2;
      c.beginPath(); c.moveTo(x - 7, 32); c.quadraticCurveTo(x, 27.5, x + 7, 32); c.stroke();
      c.beginPath(); c.moveTo(x + dir * 6, 31.5); c.lineTo(x + dir * 10, 28.5); c.stroke();
    }
    // nose
    c.strokeStyle = 'rgba(160,105,85,0.8)'; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(32, 34); c.lineTo(31, 44); c.lineTo(34, 46); c.stroke();
    // full, glossy mauve lips
    c.fillStyle = '#9c4c5c'; c.beginPath(); c.moveTo(23, 54); c.quadraticCurveTo(28, 49, 32, 51); c.quadraticCurveTo(36, 49, 41, 54); c.quadraticCurveTo(32, 56, 23, 54); c.fill();
    c.fillStyle = '#b86878'; c.beginPath(); c.moveTo(23, 54); c.quadraticCurveTo(32, 62, 41, 54); c.quadraticCurveTo(32, 56, 23, 54); c.fill();
    c.fillStyle = 'rgba(255,220,225,0.7)'; c.beginPath(); c.ellipse(32, 57, 3, 1.2, 0, 0, PI * 2); c.fill();
  });
  return vexFace;
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
    const skin = M.make(0xe2b49a, { flat: false }), hair = M.make(0x1c1412), jacket = M.make(0x8a9098), top = M.make(0x0e0e10);
    const legs = M.make(0x16161a), shoes = M.make(0xe0e0e4), gun = M.make(0x26282c), seam = M.make(0xc8ccd0, { map: null });
    const face = M.make(0xffffff, { map: vexFaceTexture(), flat: false });
    // head box faces: +x, -x, +y, -y, +z (front), -z
    const headMats = [skin, skin, hair, skin, face, hair];
    const P = humanoid(M, { height: 1.75, torsoW: 0.34, torsoD: 0.19, legW: 0.12, armW: 0.085, head: 0.2,
      legMat: legs, torsoMat: jacket, headMats, armMat: jacket, footMat: shoes, handMat: skin, foreMat: jacket });
    // open jacket over a black top, seams, raised collar, neck with a rose tattoo
    put(P.torso, box(0.12, 0.32, 0.02, top, 'center'), 0, 0.36, 0.1);
    for (const s of [-1, 1]) put(P.torso, box(0.13, 0.015, 0.02, seam, 'center'), s * 0.11, 0.42, 0.1, 0, 0, s * 0.35);
    put(P.torso, box(0.2, 0.09, 0.2, jacket, 'center'), 0, 0.53, 0);
    const neck = put(P.neck, cyl(0.05, 0.055, 0.1, skin, 8), 0, 0.02, 0);
    put(P.neck, box(0.035, 0.035, 0.01, M.make(0x3a3a40, { map: null }), 'center'), -0.035, 0.0, 0.05);
    // hair: sleek cap, high ponytail, long waves over one shoulder and down the back
    const hs = P.headSize;
    put(P.head, box(hs * 1.08, hs * 0.35, hs * 1.12, hair, 'center'), 0, hs * 1.08, -0.01);
    const pony = joint(P.head, 0, hs * 1.25, -hs * 0.35);
    put(pony, ball(0.055, hair, 1));
    const tail = [];
    let prev = pony;
    for (let i = 0; i < 5; i++) {
      const seg = joint(prev, 0, i === 0 ? 0 : -0.13, 0);
      put(seg, box(0.1 - i * 0.008, 0.14, 0.07, hair));
      seg.rotation.x = i === 0 ? -0.5 : 0.18;
      tail.push(seg); prev = seg;
    }
    const front = joint(P.head, -hs * 0.45, hs * 0.9, hs * 0.1);
    front.rotation.z = -0.12;
    put(front, box(0.07, 0.62, 0.09, hair));
    put(front, box(0.06, 0.35, 0.07, hair), 0.03, -0.55, 0.02, 0, 0, 0.15);
    const pistol = put(P.handR, box(0.045, 0.07, 0.2, gun, 'center'), 0, -0.06, 0.06);
    const fl = muzzle(pistol, 0, 0.01, 0.14, 0xffc040, 0.45);
    return {
      M, P, kind: 'humanoid', ranged: true, flash: fl, thickness: 0.25,
      extra(pose, t) { tail.forEach((s, i) => { s.rotation.x = (i === 0 ? -0.5 : 0.18) + Math.sin(t * 1.3 + i) * 0.05; }); },
    };
  },
};

/** Build a model. Returns an object with .root (add to the scene) and .update(). */
export function buildCreature(type) {
  const m = BUILDERS[type]();
  const root = new THREE.Group();
  root.add(m.P ? m.P.root : m.root);
  const inner = m.P ? m.P.root : m.root;
  mergeStatic(inner);
  return {
    root, mats: m.M, float: !!m.float,
    update(pose, t, poseT, deathT) {
      if (pose === 'dead') { animDeath(inner, deathT, m.thickness); if (m.flash) m.flash.visible = false; return; }
      inner.rotation.x = 0; inner.position.y = 0;
      if (m.P) animHumanoid(m.P, pose, t, poseT);
      if (m.anim) m.anim(pose, t, poseT);
      if (m.extra) m.extra(pose, t);
      if (m.flash) m.flash.visible = pose === 'fire';
    },
    dispose() { m.M.dispose(); },
  };
}
