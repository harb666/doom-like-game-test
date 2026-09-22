// Visual effects: sparks, blood, explosions, smoke trails, screen flashes and shake.
// Uses a fixed pool of sprites so nothing is allocated during combat (keeps phones smooth).

import * as THREE from 'three';
import { rand } from '../util.js';

let glowTex = null;
/** Soft round glow used for flashes, fireballs, sparks and plasma. */
export function glowTexture() {
  if (glowTex) return glowTex;
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const ctx = cv.getContext('2d');
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.85)');
  g.addColorStop(0.55, 'rgba(255,255,255,0.3)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
  glowTex = new THREE.CanvasTexture(cv);
  return glowTex;
}

let blobTex = null;
function blobTexture() {
  if (blobTex) return blobTex;
  const cv = document.createElement('canvas'); cv.width = cv.height = 16;
  const ctx = cv.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(8, 8, 7, 0, Math.PI * 2); ctx.fill();
  blobTex = new THREE.CanvasTexture(cv);
  return blobTex;
}

const MAX_PARTICLES = 160;

export class Effects {
  constructor(game) {
    this.game = game;
    this.group = new THREE.Group();
    this.particles = [];
    this.free = [];
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      glow.visible = false;
      this.group.add(glow);
      this.free.push({ sprite: glow, additive: true });
    }
    this.solidFree = [];
    for (let i = 0; i < 90; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: blobTexture(), alphaTest: 0.5, fog: true }));
      s.visible = false;
      this.group.add(s);
      this.solidFree.push({ sprite: s, additive: false });
    }
    this.flashEl = document.getElementById('screen-flash');
    this.flashColor = null; this.flashAmount = 0;
    this.shakeAmount = 0;
    this.shakeOffset = new THREE.Vector3();
    this.brightness = 1;
  }

  clear() {
    for (const p of this.particles) { p.sprite.visible = false; (p.additive ? this.free : this.solidFree).push(p); }
    this.particles.length = 0;
    this.flashAmount = 0; this.shakeAmount = 0; this.brightness = 1;
    this.flashEl.style.opacity = 0;
  }

  spawn(additive, x, y, z, o) {
    const pool = additive ? this.free : this.solidFree;
    let p = pool.pop();
    if (!p) {
      // recycle the oldest particle of the same kind
      const idx = this.particles.findIndex(q => q.additive === additive);
      if (idx < 0) return null;
      p = this.particles.splice(idx, 1)[0];
    }
    p.x = x; p.y = y; p.z = z;
    p.vx = o.vx || 0; p.vy = o.vy || 0; p.vz = o.vz || 0;
    p.life = p.maxLife = o.life || 0.5;
    p.gravity = o.gravity || 0;
    p.s0 = o.s0 ?? 0.2; p.s1 = o.s1 ?? p.s0;
    p.fade = o.fade ?? true;
    p.floor = o.floor ?? -100;
    p.sprite.material.color.setHex(o.color ?? 0xffffff);
    p.sprite.material.opacity = 1;
    p.sprite.position.set(x, y, z);
    p.sprite.scale.setScalar(p.s0);
    p.sprite.visible = true;
    this.particles.push(p);
    return p;
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        p.sprite.visible = false;
        this.particles.splice(i, 1);
        (p.additive ? this.free : this.solidFree).push(p);
        continue;
      }
      p.vy -= p.gravity * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.y < p.floor) { p.y = p.floor; p.vx *= 0.3; p.vz *= 0.3; p.vy = 0; }
      const t = 1 - p.life / p.maxLife;
      p.sprite.position.set(p.x, p.y, p.z);
      p.sprite.scale.setScalar(p.s0 + (p.s1 - p.s0) * t);
      if (p.fade && p.additive) p.sprite.material.opacity = 1 - t * t;
    }

    // screen flash overlay
    if (this.flashAmount > 0) {
      this.flashAmount = Math.max(0, this.flashAmount - dt * 1.6);
      this.flashEl.style.opacity = this.flashAmount.toFixed(3);
    }
    // camera shake
    if (this.shakeAmount > 0 && this.game.settings.screenShake) {
      const s = this.shakeAmount;
      this.shakeOffset.set(rand(-s, s), rand(-s, s) * 0.6, rand(-s, s));
      this.shakeAmount = Math.max(0, this.shakeAmount - dt * 0.9);
    } else this.shakeOffset.set(0, 0, 0);
    // level brightness (muzzle flash / explosions)
    if (this.brightness > 1) {
      this.brightness = Math.max(1, this.brightness - dt * 8);
      this.game.level?.setBrightness(this.brightness);
    }
  }

  // ---------- specific effects ----------
  bulletPuff(x, y, z) {
    for (let i = 0; i < 3; i++) this.spawn(true, x, y, z, { vx: rand(-1, 1), vy: rand(0.5, 2), vz: rand(-1, 1), life: 0.22, s0: 0.25, s1: 0.05, color: i ? 0xffc050 : 0xffffff });
    this.spawn(false, x, y, z, { vy: 0.6, life: 0.35, s0: 0.12, s1: 0.2, color: 0x6a6660 });
  }

  blood(x, y, z, amount = 5, color = 0x9a0808) {
    const floor = this.game.level ? this.game.level.floorAt(x, z) + 0.03 : 0;
    for (let i = 0; i < amount; i++) {
      this.spawn(false, x, y, z, { vx: rand(-2, 2), vy: rand(0, 3), vz: rand(-2, 2), gravity: 12, life: rand(0.4, 0.9), s0: rand(0.1, 0.2), color, floor });
    }
  }

  gib(x, y, z) {
    this.blood(x, y, z, 14);
    for (let i = 0; i < 6; i++) this.spawn(false, x, y, z, { vx: rand(-4, 4), vy: rand(2, 6), vz: rand(-4, 4), gravity: 14, life: 1.4, s0: 0.22, color: 0x6a1010, floor: this.game.level.floorAt(x, z) + 0.05 });
  }

  burst(x, y, z, color, n = 6) {
    this.game.lights?.flash(x, y, z, color, 6, 5, 0.18);
    this.spawn(true, x, y, z, { life: 0.25, s0: 0.5, s1: 1.1, color });
    for (let i = 0; i < n; i++) this.spawn(true, x, y, z, { vx: rand(-3, 3), vy: rand(-1, 3), vz: rand(-3, 3), gravity: 4, life: rand(0.2, 0.4), s0: 0.2, s1: 0.05, color });
  }

  trail(x, y, z, color) {
    this.spawn(true, x, y, z, { vy: 0.4, life: 0.4, s0: 0.25, s1: 0.5, color });
  }

  explosion(x, y, z, radius = 4) {
    this.spawn(true, x, y, z, { life: 0.45, s0: 1.2, s1: radius * 0.9, color: 0xffd080 });
    this.spawn(true, x, y + 0.3, z, { life: 0.6, s0: 0.8, s1: radius * 0.7, color: 0xff6010 });
    for (let i = 0; i < 12; i++) this.spawn(true, x, y, z, { vx: rand(-7, 7), vy: rand(0, 7), vz: rand(-7, 7), gravity: 9, life: rand(0.3, 0.7), s0: 0.4, s1: 0.1, color: i % 2 ? 0xffa030 : 0xff5010 });
    for (let i = 0; i < 5; i++) this.spawn(false, x + rand(-0.5, 0.5), y, z + rand(-0.5, 0.5), { vy: rand(1, 2), life: rand(0.6, 1.1), s0: 0.4, s1: 0.8, color: 0x3a3430 });
    this.game.audio.playAt('explosion', x, z);
    const p = this.game.player;
    const d = Math.hypot(p.x - x, p.z - z);
    this.shake(Math.max(0, 0.35 - d * 0.03));
    this.game.lights?.flash(x, y + 0.5, z, 0xff8030, 45, radius * 3.5, 0.45);
  }

  /** Player gunfire: a warm real-time light at the gun. */
  muzzleFlash(b = 1.4) {
    const p = this.game.player;
    this.game.lights?.flash(p.x - Math.sin(p.yaw) * 0.7, p.eyeY - 0.1, p.z - Math.cos(p.yaw) * 0.7, 0xffc070, 7 * b, 9, 0.07);
  }

  shake(amount) { this.shakeAmount = Math.min(0.4, Math.max(this.shakeAmount, amount)); }

  screenFlash(color, amount) {
    if (this.flashColor !== color) { this.flashEl.style.background = color; this.flashColor = color; }
    this.flashAmount = Math.min(0.85, Math.max(this.flashAmount, amount));
    this.flashEl.style.opacity = this.flashAmount.toFixed(3);
  }
  hurtFlash(amount) { this.screenFlash('#c00000', amount); }
  pickupFlash() { this.screenFlash('#ffd24a', 0.18); }
}
