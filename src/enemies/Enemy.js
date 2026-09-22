// A single monster: sprite, health and its AI "brain" (a small state machine).
//   idle   -> waiting; wakes up on sight or when it hears gunfire
//   chase  -> runs at the player using the flow field
//   attack -> winds up, then claws / shoots
//   pain   -> brief flinch after being hurt
//   dead   -> plays death frames and leaves a corpse

import * as THREE from 'three';
import { ENEMIES } from './enemyDefs.js';
import { getEnemyFrames } from './enemySprites.js';
import { moveBody, floorUnder, hasLineOfSight } from '../world/Collision.js';
import { rand, randInt, chance, wrapAngle } from '../util.js';

export class Enemy {
  constructor(game, type, x, z) {
    this.game = game;
    this.type = type;
    this.def = ENEMIES[type];
    const D = game.difficulty;
    this.maxHealth = Math.round(this.def.health * D.enemyHealth);
    this.health = this.maxHealth;
    this.x = x; this.z = z;
    this.y = game.level.floorAt(x, z);
    this.radius = this.def.radius;
    this.height = this.def.height;
    this.step = this.def.float ? 1.4 : 0.8;
    this.solidBody = true;
    this.isEnemy = true;
    this.state = 'idle';
    this.stateT = 0;
    this.attackCooldown = rand(0.5, 1.5);
    this.thinkT = rand(0, 0.3);
    this.animT = rand(0, 1);
    this.flashT = 0;
    this.strafe = 0; this.strafeT = 0;
    this.stuckT = 0;
    this.wanderAngle = rand(0, Math.PI * 2);
    this.dead = false;
    this.deathT = 0;
    this.shotsLeft = 0;
    this.facing = rand(0, Math.PI * 2);
    this.idleSoundT = rand(4, 12);

    this.frames = getEnemyFrames(type, this.def.blood);
    this.material = new THREE.SpriteMaterial({ map: this.frames.walk[0], alphaTest: 0.5, fog: true });
    this.sprite = new THREE.Sprite(this.material);
    this.sprite.center.set(0.5, 0);
    this.setFrame(this.frames.walk[0]);
    this.syncSprite();
  }

  get alive() { return !this.dead; }

  setFrame(tex) {
    if (this.material.map !== tex) { this.material.map = tex; }
    const aspect = tex.userData.aspect || 1;
    this.sprite.scale.set(this.height * aspect, this.height, 1);
  }

  syncSprite() {
    const bob = this.def.float && !this.dead ? Math.sin(this.animT * 2.5) * 0.12 + this.def.float : 0;
    this.sprite.position.set(this.x, this.y + bob - (this.dead ? 0.02 : 0), this.z);
    const cell = this.game.level.cellAt(this.x, this.z);
    const light = Math.max(0.22, Math.pow(Math.min(1.2, cell.light ?? 0.7), 1.8)) * this.game.effects.brightness;
    const f = this.flashT > 0 ? 2.2 : 1;
    this.material.color.setRGB(light * f, light * (this.flashT > 0 ? 1.6 : 1), light * (this.flashT > 0 ? 1.6 : 1));
  }

  // ---------- damage ----------
  takeDamage(amount, source, hit) {
    if (this.dead) return;
    const game = this.game;
    this.health -= amount;
    this.flashT = 0.08;
    if (hit) game.effects.blood(hit.x, hit.y, hit.z, Math.min(10, 3 + (amount / 6) | 0), this.def.blood);
    if (this.health <= 0) { this.die(amount); return; }
    if (this.state === 'idle') this.wake(false);
    if (chance(this.def.painChance) && this.state !== 'pain') {
      this.state = 'pain'; this.stateT = 0.22;
      this.setFrame(this.frames.pain);
      game.audio.playAt(this.def.sounds.pain, this.x, this.z);
    }
  }

  die(overkill) {
    const game = this.game;
    this.dead = true; this.state = 'dead'; this.deathT = 0;
    this.solidBody = false;
    game.audio.playAt(this.def.sounds.death, this.x, this.z);
    if (overkill > 45 || this.health < -this.maxHealth * 0.6) game.effects.gib(this.x, this.y + this.height * 0.5, this.z);
    game.onEnemyKilled(this);
    if (this.def.drop) game.pickups.spawnDrop(this.def.drop, this.x, this.z);
  }

  wake(withSound = true) {
    if (this.state !== 'idle' || this.dead) return;
    this.state = 'chase';
    this.attackCooldown = rand(0.3, 1.0) * this.def.reaction * this.game.difficulty.reaction;
    if (withSound || chance(0.5)) this.game.audio.playAt(this.def.sounds.sight, this.x, this.z);
  }

  // ---------- AI ----------
  update(dt) {
    const game = this.game, p = game.player;
    this.animT += dt;
    this.flashT -= dt;

    if (this.dead) {
      this.deathT += dt;
      const i = Math.min(2, Math.floor(this.deathT / 0.12));
      this.setFrame(this.frames.death[i]);
      this.y = floorUnder(game.level, this.x, this.z, 0.2);
      this.syncSprite();
      return;
    }

    const dx = p.x - this.x, dz = p.z - this.z;
    const dist = Math.hypot(dx, dz);
    this.thinkT -= dt;

    if (this.state === 'idle') {
      if (this.thinkT <= 0) {
        this.thinkT = 0.25;
        if (!p.dead && dist < this.def.sightRange && this.canSeePlayer()) {
          // needs to be roughly facing you unless you're close
          const ang = Math.abs(wrapAngle(Math.atan2(dx, dz) - this.facing));
          if (dist < 5 || ang < 1.4 || this.def.boss) this.wake(true);
        }
      }
      this.setFrame(this.frames.walk[0]);
    } else if (this.state === 'pain') {
      this.stateT -= dt;
      if (this.stateT <= 0) this.state = 'chase';
    } else if (this.state === 'chase') {
      this.chase(dt, dx, dz, dist);
    } else if (this.state === 'attack') {
      this.attack(dt, dx, dz, dist);
    }

    this.idleSoundT -= dt;
    if (this.idleSoundT <= 0) {
      this.idleSoundT = rand(6, 14);
      if (this.state === 'chase' && dist < 20) game.audio.playAt(this.def.sounds.idle, this.x, this.z);
    }

    // vertical: stand on floors / ride lifts
    const floor = floorUnder(game.level, this.x, this.z, this.radius);
    if (this.y < floor) this.y = floor;
    else if (this.y > floor) this.y = Math.max(floor, this.y - 9 * dt);
    this.syncSprite();
  }

  canSeePlayer() {
    const p = this.game.player;
    return hasLineOfSight(this.game.level, this.x, this.y + this.height * 0.85, this.z, p.x, p.eyeY, p.z);
  }

  chase(dt, dx, dz, dist) {
    const game = this.game, p = game.player, def = this.def;
    this.attackCooldown -= dt;
    if (this.thinkT <= 0) {
      this.thinkT = 0.2;
      this.seesPlayer = !p.dead && this.canSeePlayer();
      if (--this.strafeT <= 0) { this.strafe = chance(0.5) ? randInt(-1, 1) : 0; this.strafeT = randInt(3, 8); }
    }

    // attack?
    if (!p.dead && this.seesPlayer && this.attackCooldown <= 0) {
      if (def.melee && dist < def.melee.range + p.radius) return this.startAttack('melee');
      if (def.ranged && dist < def.ranged.range && chance(dist < 6 ? 0.9 : 0.55)) return this.startAttack('ranged');
      this.attackCooldown = 0.3;
    }

    // movement
    let tx, tz;
    if (p.dead) {
      // wander about aimlessly once the player is dead
      this.wanderAngle += rand(-1, 1) * dt;
      tx = this.x + Math.sin(this.wanderAngle); tz = this.z + Math.cos(this.wanderAngle);
    } else if (this.seesPlayer && dist < 12) {
      tx = p.x; tz = p.z;
    } else {
      const next = game.flow.nextStep(this.x, this.z);
      if (next) { tx = next.x; tz = next.z; if (next.cell.door) game.useDoor(next.cell.door, false, this); }
      else { tx = p.x; tz = p.z; }
    }
    let mx = tx - this.x, mz = tz - this.z;
    const ml = Math.hypot(mx, mz) || 1;
    mx /= ml; mz /= ml;
    if (this.strafe && this.seesPlayer && dist > 3) { const sx = -mz * this.strafe * 0.7, sz = mx * this.strafe * 0.7; mx += sx; mz += sz; }
    if (this.stuckT > 0) { this.stuckT -= dt; mx = Math.sin(this.wanderAngle); mz = Math.cos(this.wanderAngle); }
    const keepAway = def.melee ? 0.9 : 2.2;
    if (dist < keepAway + p.radius && this.seesPlayer) { mx = 0; mz = 0; }
    const speed = def.speed * game.difficulty.enemySpeed;
    const ox = this.x, oz = this.z;
    const bumped = moveBody(game.level, this, mx * speed * dt, mz * speed * dt, game.solidBodies);
    if (bumped && bumped.door) game.useDoor(bumped.door, false, this);
    const moved = Math.hypot(this.x - ox, this.z - oz);
    if ((mx || mz) && moved < speed * dt * 0.25 && this.stuckT <= 0) { this.stuckT = rand(0.3, 0.7); this.wanderAngle = rand(0, Math.PI * 2); }
    if (mx || mz) this.facing = Math.atan2(mx, mz);
    const f = Math.floor(this.animT * (speed > 5 ? 8 : 4)) % 2;
    this.setFrame(this.frames.walk[f]);
  }

  startAttack(kind) {
    const a = kind === 'melee' ? this.def.melee : this.def.ranged;
    this.state = 'attack';
    this.attackKind = kind;
    this.stateT = a.windup * this.game.difficulty.reaction;
    this.fired = false;
    this.shotsLeft = a.shots || 1;
    this.setFrame(this.frames.attack[0]);
    if (kind === 'melee' && this.def.melee.lunge) this.game.audio.playAt(this.def.sounds.sight, this.x, this.z, 0.6);
  }

  attack(dt, dx, dz, dist) {
    const game = this.game, def = this.def, p = game.player;
    this.stateT -= dt;
    this.facing = Math.atan2(dx, dz);
    if (this.attackKind === 'melee' && def.melee.lunge && !this.fired) {
      // hounds leap forward during the wind-up
      const s = def.speed * 1.4 * dt;
      moveBody(game.level, this, dx / (dist || 1) * s, dz / (dist || 1) * s, game.solidBodies);
    }
    if (this.stateT > 0) return;
    if (!this.fired || this.shotsLeft > 0) {
      this.setFrame(this.frames.attack[1]);
      if (this.attackKind === 'melee') {
        this.fired = true; this.shotsLeft = 0;
        game.audio.playAt(def.sounds.attack, this.x, this.z);
        if (!p.dead && dist < def.melee.range + p.radius + 0.4) p.damage(randInt(...def.melee.damage), this);
        this.stateT = 0.35;
        this.attackCooldown = def.melee.cooldown;
        return;
      }
      const r = def.ranged;
      this.fired = true;
      this.shotsLeft--;
      this.fireRanged(r, dx, dz, dist);
      if (this.shotsLeft > 0) { this.stateT = r.interval; return; }
      this.stateT = 0.3;
      this.attackCooldown = rand(r.cooldown[0], r.cooldown[1]) * game.difficulty.reaction;
      return;
    }
    this.state = 'chase';
    this.setFrame(this.frames.walk[0]);
  }

  fireRanged(r, dx, dz, dist) {
    const game = this.game, p = game.player;
    game.audio.playAt(this.def.sounds.attack, this.x, this.z);
    if (r.kind === 'hitscan') {
      // chance to miss grows with distance and player speed
      const moving = Math.hypot(p.vx, p.vz);
      const hitChance = Math.max(0.15, 0.85 - dist * 0.018 - moving * 0.03);
      if (this.canSeePlayer() && chance(hitChance)) p.damage(randInt(...r.damage), this);
      else game.effects.bulletPuff(p.x + rand(-1, 1), p.eyeY + rand(-0.8, 0.4), p.z + rand(-1, 1));
      return;
    }
    const n = r.volley || 1;
    const sy = this.y + this.height * 0.6;
    const base = Math.atan2(dx, dz);
    for (let i = 0; i < n; i++) {
      const a = base + (i - (n - 1) / 2) * (r.volleySpread || 0) + rand(-0.03, 0.03);
      const hx = Math.sin(a), hz = Math.cos(a);
      const slope = ((p.y + 1.0) - sy) / Math.max(1, dist);
      game.projectiles.spawn(r.projectile, this.x + hx * (this.radius + 0.3), sy, this.z + hz * (this.radius + 0.3), hx, slope, hz,
        'enemy', this, randInt(...r.damage));
    }
  }
}
