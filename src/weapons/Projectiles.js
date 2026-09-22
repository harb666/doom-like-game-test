// Flying projectiles: plasma bolts, rockets, acid globs and monster fireballs.

import * as THREE from 'three';
import { PROJECTILES } from './weaponDefs.js';
import { traceLine } from '../world/Collision.js';
import { glowTexture } from '../effects/Effects.js';

const tr = {};

export class Projectiles {
  constructor(game) {
    this.game = game;
    this.list = [];
    this.pool = [];
    this.group = new THREE.Group();
  }

  clear() {
    for (const p of this.list) { p.sprite.visible = false; this.pool.push(p); }
    this.list.length = 0;
  }

  spawn(type, x, y, z, dx, dy, dz, owner, ownerEnt, damage) {
    const def = PROJECTILES[type];
    let p = this.pool.pop();
    if (!p) {
      const mat = new THREE.SpriteMaterial({ map: glowTexture(), blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
      p = { sprite: new THREE.Sprite(mat) };
      this.group.add(p.sprite);
    }
    const len = Math.hypot(dx, dz) || 1;
    // (dx, dz) is a horizontal direction, dy is the slope (rise per metre)
    const hx = dx / len, hz = dz / len;
    const n = Math.hypot(1, dy);
    Object.assign(p, {
      type, def, x, y, z,
      vx: hx * def.speed / n, vy: dy * def.speed / n, vz: hz * def.speed / n,
      owner, ownerEnt, damage, life: 6, trailT: 0,
    });
    p.sprite.material.color.setHex(def.color);
    p.sprite.scale.setScalar(def.size);
    p.sprite.position.set(x, y, z);
    p.sprite.visible = true;
    this.list.push(p);
    return p;
  }

  update(dt) {
    const game = this.game;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.life -= dt;
      const nx = p.x + p.vx * dt, ny = p.y + p.vy * dt, nz = p.z + p.vz * dt;
      let hit = null, hitT = 1;

      // walls / floors / ceilings
      traceLine(game.level, p.x, p.y, p.z, nx, ny, nz, tr);
      if (!tr.clear) { hitT = tr.t; hit = { wall: true, x: tr.x + tr.nx * 0.1, y: tr.y + tr.ny * 0.1, z: tr.z + tr.nz * 0.1, sky: tr.cell && tr.cell.sky && tr.ny === -1 }; }

      // bodies
      const targets = p.owner === 'player' ? game.shootables() : game.enemyTargets();
      for (const t of targets) {
        if (t === p.ownerEnt) continue;
        const tt = segmentVsCylinder(p.x, p.y, p.z, nx, ny, nz, t, p.def.radius);
        if (tt !== null && tt < hitT) { hitT = tt; hit = { target: t, x: p.x + (nx - p.x) * tt, y: p.y + (ny - p.y) * tt, z: p.z + (nz - p.z) * tt }; }
      }

      if (hit || p.life <= 0) {
        if (hit) this.impact(p, hit);
        p.sprite.visible = false;
        this.list.splice(i, 1);
        this.pool.push(p);
        continue;
      }
      p.x = nx; p.y = ny; p.z = nz;
      p.sprite.position.set(nx, ny, nz);
      if (p.def.trail) {
        p.trailT -= dt;
        if (p.trailT <= 0) { p.trailT = 0.03; game.effects.trail(p.x, p.y, p.z, p.type === 'rocket' ? 0x888078 : p.def.color); }
      }
    }
  }

  impact(p, hit) {
    const game = this.game, def = p.def;
    if (hit.sky) return;   // flew off into the sky
    if (hit.target) hit.target.takeDamage(p.damage, p.ownerEnt, { x: hit.x, y: hit.y, z: hit.z, dx: p.vx, dz: p.vz, projectile: true });
    const fx = game.effects;
    switch (def.impact) {
      case 'explosion':
        fx.explosion(hit.x, hit.y, hit.z, def.splash.radius);
        game.radiusDamage(hit.x, hit.y, hit.z, def.splash.radius, def.splash.damage, p.ownerEnt, hit.target);
        break;
      case 'plasma': fx.burst(hit.x, hit.y, hit.z, 0x80d8ff, 6); game.audio.playAt('plasmaHit', hit.x, hit.z); break;
      case 'acid': fx.burst(hit.x, hit.y, hit.z, 0x9aff40, 8); game.audio.playAt('acidHit', hit.x, hit.z); break;
      case 'ember': fx.burst(hit.x, hit.y, hit.z, 0xff8020, 8); game.audio.playAt('emberHit', hit.x, hit.z); break;
    }
  }
}

/** Where (0..1) a moving sphere first touches an upright cylinder body, or null. */
function segmentVsCylinder(x0, y0, z0, x1, y1, z1, t, r) {
  const R = t.radius + r;
  const dx = x1 - x0, dz = z1 - z0;
  const fx = x0 - t.x, fz = z0 - t.z;
  const a = dx * dx + dz * dz, b = 2 * (fx * dx + fz * dz), c = fx * fx + fz * fz - R * R;
  let tt;
  if (c <= 0) tt = 0;
  else {
    if (a < 1e-9) return null;
    const disc = b * b - 4 * a * c;
    if (disc < 0) return null;
    tt = (-b - Math.sqrt(disc)) / (2 * a);
    if (tt < 0 || tt > 1) return null;
  }
  const y = y0 + (y1 - y0) * tt;
  if (y < t.y - r || y > t.y + t.height + r) return null;
  return tt;
}
