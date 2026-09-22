// The player: movement, camera, health, armour, keys and death.

import { PLAYER, GRAVITY } from '../config.js';
import { moveBody, floorUnder } from '../world/Collision.js';
import { clamp } from '../util.js';

export class Player {
  constructor(game) {
    this.game = game;
    this.radius = PLAYER.radius;
    this.height = PLAYER.height;
    this.step = PLAYER.step;
    this.solidBody = true;
    this.isPlayer = true;
    this.reset();
  }

  /** Full reset for a brand-new game. */
  reset() {
    this.health = 100;
    this.armor = 0;
    this.armorAbsorb = 0;
    this.resetForLevel();
  }

  /** Things that never carry over between levels. */
  resetForLevel() {
    this.x = 0; this.z = 0; this.y = 0; this.vy = 0;
    this.vx = 0; this.vz = 0;
    this.yaw = 0; this.pitch = 0;
    this.keys = new Set();
    this.dead = false;
    this.deathTime = 0;
    this.viewOffset = 0;      // smooths out stepping up stairs
    this.bobPhase = 0;
    this.bobAmount = 0;
    this.hazardTimer = 0;
    this.stepTimer = 0;
    this.onGround = true;
    this.painCooldown = 0;
    this.lastHurtFrom = null;
  }

  spawn(start) {
    this.x = start.x; this.z = start.z;
    this.yaw = start.angle; this.pitch = 0;
    this.y = this.game.level.floorAt(this.x, this.z);
    this.vx = this.vz = this.vy = 0;
  }

  get eyeY() { return this.y + PLAYER.eye; }

  update(dt, input) {
    const game = this.game, level = game.level, S = game.settings;
    this.painCooldown -= dt;

    if (this.dead) { this.updateDeath(dt); return; }

    // ---- looking ----
    const [lx, ly] = input.takeLook();
    this.yaw += lx;
    if (S.verticalLook) this.pitch = clamp(this.pitch + ly, -0.7, 0.7);
    else this.pitch *= Math.max(0, 1 - dt * 8);

    // ---- moving ----
    const fx = -Math.sin(this.yaw), fz = -Math.cos(this.yaw);
    const rx = Math.cos(this.yaw), rz = -Math.sin(this.yaw);
    const wishX = fx * input.moveY + rx * input.moveX;
    const wishZ = fz * input.moveY + rz * input.moveX;
    const speed = PLAYER.runSpeed;
    const accel = this.onGround ? 12 : 3;
    const k = 1 - Math.exp(-accel * dt);
    this.vx += (wishX * speed - this.vx) * k;
    this.vz += (wishZ * speed - this.vz) * k;

    const others = game.solidBodies;
    const bumped = moveBody(level, this, this.vx * dt, this.vz * dt, others);
    if (bumped && S.autoOpenDoors) {
      if (bumped.door && !bumped.door.secret) game.useDoor(bumped.door, true);
      if (bumped.lift) game.useLift(bumped.lift);
    }

    // ---- vertical: steps, lifts, falling ----
    const floor = floorUnder(level, this.x, this.z, this.radius);
    if (this.y < floor) {
      const rise = floor - this.y;
      this.y = floor; this.vy = 0;
      if (rise < 1) this.viewOffset -= rise;   // smooth stair climbing
      this.onGround = true;
    } else if (this.y > floor + 0.001) {
      if (this.onGround && this.y - floor < 0.25 && this.vy <= 0) { this.y = floor; }
      else {
        this.onGround = false;
        this.vy -= GRAVITY * dt;
        this.y += this.vy * dt;
        if (this.y <= floor) {
          if (this.vy < -7) { game.audio.play('land'); this.viewOffset -= Math.min(0.35, -this.vy * 0.03); }
          this.y = floor; this.vy = 0; this.onGround = true;
        }
      }
    } else this.onGround = true;
    this.viewOffset *= Math.max(0, 1 - dt * 12);

    // ---- head bob & footsteps ----
    const moving = Math.hypot(this.vx, this.vz);
    this.bobAmount += ((this.onGround ? Math.min(1, moving / speed) : 0) - this.bobAmount) * Math.min(1, dt * 10);
    this.bobPhase += dt * moving * 1.25;
    if (this.onGround && moving > 2) {
      this.stepTimer -= dt * moving;
      if (this.stepTimer <= 0) { this.stepTimer = 3.2; game.audio.play('step'); }
    }

    // ---- special floors ----
    const cell = level.cellAt(this.x, this.z);
    if (cell.hazard && this.y <= level.floorOf(cell) + 0.05) {
      this.hazardTimer -= dt;
      if (this.hazardTimer <= 0) { this.hazardTimer = 0.5; this.damage(cell.hazard * 0.5, null, 'hazard'); }
    } else this.hazardTimer = Math.min(this.hazardTimer, 0.1);
    if (cell.secret && !cell.secretFound) game.findSecret(cell);
    if (cell.exit && this.y <= level.floorOf(cell) + 0.1) game.completeLevel();
  }

  updateDeath(dt) {
    this.deathTime += dt;
    this.viewOffset += (-(PLAYER.eye - 0.25) - this.viewOffset) * Math.min(1, dt * 5);
    this.pitch += (0.25 - this.pitch) * Math.min(1, dt * 3);
    this.vx *= 0.9; this.vz *= 0.9;
  }

  /** Update the three.js camera to match the player. */
  applyCamera(camera, time) {
    const S = this.game.settings;
    const bob = S.headBob ? this.bobAmount : 0;
    const bobY = Math.sin(this.bobPhase * 2) * 0.06 * bob;
    const shake = this.game.effects.shakeOffset;
    camera.position.set(this.x + shake.x, this.eyeY + this.viewOffset + bobY + shake.y, this.z + shake.z);
    camera.rotation.set(this.pitch, this.yaw, this.dead ? Math.min(0.5, this.deathTime * 1.2) : 0, 'YXZ');
  }

  /** Take damage. `from` is an optional {x,z} used to shake the view in that direction. */
  damage(amount, from = null, kind = 'hit') {
    if (this.dead || this.game.godMode) return;
    const game = this.game;
    amount *= game.difficulty.dmgTaken;
    let saved = 0;
    if (this.armor > 0) {
      saved = Math.min(this.armor, amount * this.armorAbsorb);
      this.armor -= saved;
      if (this.armor <= 0) { this.armor = 0; this.armorAbsorb = 0; }
    }
    const taken = Math.max(1, Math.round(amount - saved));
    this.health -= taken;
    game.effects.hurtFlash(Math.min(0.8, 0.2 + taken / 40));
    if (from) this.lastHurtFrom = { x: from.x, z: from.z, t: game.time };
    if (this.health <= 0) { this.health = 0; this.die(); return; }
    if (this.painCooldown <= 0) { game.audio.play('playerPain'); this.painCooldown = 0.35; }
    if (kind !== 'hazard') game.effects.shake(Math.min(0.25, taken / 60));
  }

  /** Called when a projectile hits the player. */
  takeDamage(amount, source) { this.damage(amount, source); }

  die() {
    this.dead = true;
    this.deathTime = 0;
    this.game.audio.play('playerDeath');
    this.game.onPlayerDeath();
  }

  heal(amount, max) {
    if (this.health >= max) return false;
    this.health = Math.min(max, this.health + amount);
    return true;
  }

  addArmor(amount, absorb, max, replace = false) {
    if (replace) {
      if (this.armor >= amount) return false;
      this.armor = amount; this.armorAbsorb = absorb; return true;
    }
    if (this.armor >= max) return false;
    this.armor = Math.min(max, this.armor + amount);
    if (!this.armorAbsorb) this.armorAbsorb = absorb;
    return true;
  }
}
