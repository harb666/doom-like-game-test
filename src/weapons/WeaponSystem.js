// Owns the player's arsenal: ammo, switching, firing and drawing the gun on screen.

import { WEAPONS, WEAPON_BY_ID, AMMO_TYPES } from './weaponDefs.js';
import { getWeaponArt } from './weaponSprites.js';
import { traceLine } from '../world/Collision.js';
import { rand, randInt } from '../util.js';

const SWITCH_TIME = 0.16;
const VIRTUAL_H = 200;
const tr = {};

export class WeaponSystem {
  constructor(game) {
    this.game = game;
    this.canvas = document.getElementById('weapon-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.resetForNewGame();
  }

  resetForNewGame() {
    this.owned = new Set(['pistol']);
    this.ammo = { rivets: 50, shells: 0, cells: 0, rockets: 0 };
    this.current = 'pistol';
    this.resetState();
  }

  resetState() {
    this.pending = null;
    this.switchPhase = 'raise';
    this.switchT = SWITCH_TIME;
    this.cooldown = 0.2;
    this.kick = 0;
    this.flashT = 0;
    this.animT = 0;
    this.shotsInBurst = 0;
    this.dryFired = false;
  }

  snapshot() { return { owned: [...this.owned], ammo: { ...this.ammo }, current: this.current }; }
  restore(s) {
    this.owned = new Set(s.owned); this.ammo = { ...s.ammo };
    this.current = this.owned.has(s.current) ? s.current : 'pistol';
    this.resetState();
  }

  get def() { return WEAPON_BY_ID[this.current]; }

  giveAmmo(type, n) {
    const max = AMMO_TYPES[type].max;
    if (this.ammo[type] >= max) return false;
    const hadNone = this.ammo[type] === 0;
    this.ammo[type] = Math.min(max, this.ammo[type] + Math.round(n * this.game.difficulty.ammo));
    // Doom-style: if you were out of ammo for the current gun, switch back automatically
    if (hadNone && this.def.ammo !== type && this.ammo[this.def.ammo] < this.def.perShot) this.selectBest();
    return true;
  }

  giveWeapon(id, ammoAmount) {
    const def = WEAPON_BY_ID[id];
    const isNew = !this.owned.has(id);
    const gotAmmo = this.giveAmmo(def.ammo, ammoAmount);
    if (isNew) { this.owned.add(id); this.select(id); }
    return isNew || gotAmmo;
  }

  hasAmmoFor(id) { const d = WEAPON_BY_ID[id]; return this.ammo[d.ammo] >= d.perShot; }

  select(id) {
    if (!this.owned.has(id) || (id === this.current && !this.pending)) return;
    this.pending = id;
    if (this.switchPhase !== 'lower') { this.switchPhase = 'lower'; this.switchT = 0; }
  }

  cycle(dir) {
    const list = WEAPONS.filter(w => this.owned.has(w.id) && this.hasAmmoFor(w.id));
    if (list.length < 2) return;
    const cur = this.pending || this.current;
    let i = list.findIndex(w => w.id === cur);
    i = (i + dir + list.length) % list.length;
    this.select(list[i].id);
  }

  selectBest() {
    const order = ['lancer', 'repeater', 'scattergun', 'pistol', 'hellbore'];
    for (const id of order) if (this.owned.has(id) && this.hasAmmoFor(id)) { this.select(id); return; }
  }

  update(dt, input) {
    const game = this.game;
    if (input.consume('next')) this.cycle(1);
    if (input.consume('prev')) this.cycle(-1);
    for (const w of WEAPONS) if (input.consume('slot' + w.slot)) this.select(w.id);

    this.kick *= Math.max(0, 1 - dt * 12);
    this.flashT -= dt;
    this.animT -= dt;
    this.cooldown -= dt;

    if (this.switchPhase === 'lower') {
      this.switchT += dt;
      if (this.switchT >= SWITCH_TIME) {
        this.current = this.pending || this.current; this.pending = null;
        this.switchPhase = 'raise'; this.switchT = SWITCH_TIME;
        game.audio.play('weaponUp');
      }
      return;
    }
    if (this.switchPhase === 'raise') {
      this.switchT -= dt;
      if (this.switchT <= 0) { this.switchPhase = 'ready'; this.switchT = 0; }
      return;
    }

    if (game.player.dead) return;
    if (!input.fire) { this.shotsInBurst = 0; this.dryFired = false; return; }
    if (this.cooldown > 0) return;
    const def = this.def;
    if (this.ammo[def.ammo] < def.perShot) {
      if (!this.dryFired) { game.audio.play('dryfire'); this.dryFired = true; }
      this.selectBest();
      return;
    }
    this.fire(def);
  }

  fire(def) {
    const game = this.game, p = game.player;
    this.ammo[def.ammo] -= def.perShot;
    this.cooldown = def.cooldown;
    this.kick = def.kick;
    this.flashT = def.flashTime;
    this.animT = def.pump ? 0.55 : def.spin ? 0.08 : 0.06;
    this.shotsInBurst++;
    game.audio.play(def.sound);
    game.effects.muzzleFlash(def.lightFlash);
    if (def.shake) game.effects.shake(def.shake);
    game.makeNoise(p.x, p.z);
    if (def.pump) setTimeout(() => game.audio.play('pump'), 330);

    if (def.kind === 'hitscan') {
      for (let i = 0; i < def.pellets; i++) {
        const accurate = def.firstShotAccurate && this.shotsInBurst === 1;
        const spread = accurate ? 0 : def.spread;
        const a = p.yaw + (Math.random() + Math.random() - 1) * spread;
        const vs = def.pellets > 1 ? (Math.random() - 0.5) * spread * 0.6 : 0;
        this.hitscan(a, vs, randInt(def.damage[0], def.damage[1]));
      }
    } else {
      const a = p.yaw + (Math.random() - 0.5) * def.spread;
      const slope = this.autoAimSlope(a);
      const dx = -Math.sin(a), dz = -Math.cos(a);
      game.projectiles.spawn(def.projectile, p.x + dx * 0.4, p.eyeY - 0.25, p.z + dz * 0.4, dx, slope, dz,
        'player', p, randInt(def.damage[0], def.damage[1]));
    }
  }

  /** Find the monster (or barrel) most in line with the given direction. */
  findTarget(angle, maxDist = 60, generous = false) {
    const game = this.game, p = game.player;
    const dx = -Math.sin(angle), dz = -Math.cos(angle);
    const assist = game.settings.aimAssist;
    let best = null, bestAlong = Infinity;
    for (const t of game.shootables()) {
      const rx = t.x - p.x, rz = t.z - p.z;
      const along = rx * dx + rz * dz;
      if (along <= 0.1 || along > maxDist) continue;
      const perp = Math.abs(rx * dz - rz * dx);
      const allow = t.radius + (assist ? Math.min(0.5, 0.12 + along * 0.025) : 0.05) + (generous ? 0.4 : 0);
      if (perp > allow) continue;
      if (along < bestAlong) {
        const ty = t.y + t.height * 0.6;
        if (!traceLine(game.level, p.x, p.eyeY, p.z, t.x, ty, t.z, tr).clear) continue;
        best = t; bestAlong = along;
      }
    }
    return best;
  }

  /** Vertical aim for projectiles: aim at a lined-up monster, otherwise use camera pitch. */
  autoAimSlope(angle) {
    const p = this.game.player;
    const t = this.findTarget(angle, 60, true);
    if (t) {
      const d = Math.hypot(t.x - p.x, t.z - p.z);
      return ((t.y + t.height * 0.55) - (p.eyeY - 0.25)) / Math.max(0.5, d);
    }
    return Math.tan(p.pitch);
  }

  hitscan(angle, vSpread, damage) {
    const game = this.game, p = game.player, level = game.level;
    const dx = -Math.sin(angle), dz = -Math.cos(angle);
    const t = this.findTarget(angle);
    if (t) {
      const ty = t.y + t.height * rand(0.45, 0.75);
      const d = Math.hypot(t.x - p.x, t.z - p.z);
      const hx = p.x + dx * (d - t.radius * 0.6), hz = p.z + dz * (d - t.radius * 0.6);
      t.takeDamage(damage, p, { x: hx, y: ty, z: hz, dx, dz });
      return;
    }
    const range = 64;
    const slope = Math.tan(p.pitch) + vSpread;
    traceLine(level, p.x, p.eyeY, p.z, p.x + dx * range, p.eyeY + slope * range, p.z + dz * range, tr);
    if (!tr.clear) {
      if (tr.cell && tr.cell.sky && tr.ny === -1) return;
      game.effects.bulletPuff(tr.x + tr.nx * 0.05, tr.y + tr.ny * 0.05, tr.z + tr.nz * 0.05);
    }
  }

  // ---------- drawing the gun on screen ----------
  resize() {
    const W = window.innerWidth, H = window.innerHeight;
    this.canvas.height = VIRTUAL_H;
    this.canvas.width = Math.round(VIRTUAL_H * W / H);
  }

  render(dt, light) {
    const ctx = this.ctx, cv = this.canvas;
    ctx.clearRect(0, 0, cv.width, cv.height);
    const game = this.game, p = game.player;
    if (p.dead && p.deathTime > 0.4) return;
    const art = getWeaponArt(this.current);
    const def = this.def;
    let img = art.frames.idle;
    if (art.frames.alt) {
      if (def.pump && this.animT > 0 && this.animT < 0.4) img = art.frames.alt;
      else if (def.spin && this.animT > 0 && Math.floor(game.time * 30) % 2) img = art.frames.alt;
      else if (!def.pump && !def.spin && this.flashT > 0) img = art.frames.alt;
    }
    const bob = game.settings.headBob ? p.bobAmount : p.bobAmount * 0.4;
    const bx = Math.cos(p.bobPhase) * 9 * bob;
    const by = Math.abs(Math.sin(p.bobPhase)) * 7 * bob;
    const sw = this.switchPhase === 'ready' ? 0 : (this.switchT / SWITCH_TIME) * 110;
    const x = Math.round(cv.width / 2 - img.width / 2 + bx + 8);
    const y = Math.round(cv.height - img.height + 6 + by + sw + this.kick * 0.5);
    if (this.flashT > 0) {
      const f = art.flash;
      ctx.drawImage(f, Math.round(x + art.flashAt[0] - f.width / 2), Math.round(y + art.flashAt[1] - f.height / 2 - 4));
    }
    ctx.drawImage(img, x, y);
    // darken the gun in dark rooms (sector lighting like the walls)
    const dark = Math.max(0, Math.min(0.7, (1 - light) * 0.75)) * (this.flashT > 0 ? 0.3 : 1);
    if (dark > 0.02) {
      ctx.globalCompositeOperation = 'source-atop';
      ctx.fillStyle = `rgba(0,0,0,${dark.toFixed(3)})`;
      ctx.fillRect(x, y, img.width, img.height);
      ctx.globalCompositeOperation = 'source-over';
    }
  }
}
