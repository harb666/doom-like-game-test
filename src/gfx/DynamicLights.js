// Real-time coloured lights (Quake 2 style): muzzle flashes, explosions and
// glowing projectiles light up the walls and monsters around them.
// A fixed pool of lights is reused so phones never have to rebuild shaders.

import * as THREE from 'three';

const POOL = 4;

export class DynamicLights {
  constructor(scene) {
    this.lights = [];
    for (let i = 0; i < POOL; i++) {
      const l = new THREE.PointLight(0xffffff, 0, 8, 2);
      scene.add(l);
      this.lights.push(l);
    }
    this.events = [];
    this.cands = [];
  }

  /** A short burst of light (muzzle flash, explosion, impact). */
  flash(x, y, z, color, intensity, range, life) {
    if (this.events.length > 24) this.events.shift();
    this.events.push({ x, y, z, color, intensity, range, life, max: life });
  }

  clear() { this.events.length = 0; for (const l of this.lights) l.intensity = 0; }

  update(dt, player, projectiles) {
    const c = this.cands; c.length = 0;
    for (let i = this.events.length - 1; i >= 0; i--) {
      const e = this.events[i];
      e.life -= dt;
      if (e.life <= 0) { this.events.splice(i, 1); continue; }
      c.push({ x: e.x, y: e.y, z: e.z, color: e.color, i: e.intensity * (e.life / e.max), r: e.range });
    }
    for (const p of projectiles) {
      if (!p.def.lightColor) continue;
      c.push({ x: p.x, y: p.y, z: p.z, color: p.def.lightColor, i: p.def.lightIntensity || 8, r: 6 });
    }
    // brightest / closest first
    for (const k of c) k.score = k.i / (1 + Math.hypot(k.x - player.x, k.z - player.z) * 0.3);
    c.sort((a, b) => b.score - a.score);
    for (let i = 0; i < POOL; i++) {
      const l = this.lights[i], k = c[i];
      if (!k) { l.intensity = 0; continue; }
      l.position.set(k.x, k.y, k.z);
      l.color.setHex(k.color);
      l.intensity = k.i;
      l.distance = k.r;
    }
  }
}
