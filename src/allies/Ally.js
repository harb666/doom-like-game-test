// VEX - a friendly companion who follows the player and shoots monsters.
// Monsters ignore her and she can't be hurt, so she never gets in the way:
// she walks through bodies and warps back to you if she gets left behind.

import * as THREE from 'three';
import { buildCreature } from '../models/creatures.js';
import { moveBody, floorUnder, hasLineOfSight, cellBlocks } from '../world/Collision.js';
import { rand, randInt, chance } from '../util.js';

export const ALLY = {
  name: 'VEX',
  speed: 8.5,           // metres per second (the player runs at 9.5)
  followDistance: 3.5,  // how close she tries to stay
  range: 26,            // how far away she'll shoot
  damage: [8, 14],
  cooldown: [0.45, 0.7],
  accuracy: 0.75,
};

export class Ally {
  constructor(game, x, z) {
    this.game = game;
    this.x = x; this.z = z;
    this.y = game.level.floorAt(x, z);
    this.radius = 0.35; this.height = 1.8; this.step = 0.8;
    this.isAlly = true;
    this.target = null;
    this.thinkT = 0; this.fireT = 1; this.flashT = 0; this.animT = 0;
    this.lostT = 0;
    this.model = buildCreature('ally');
    this.sprite = this.model.root;
    this.facing = 0; this.walkPhase = 0;
  }

  update(dt) {
    const game = this.game, p = game.player;
    this.animT += dt; this.thinkT -= dt; this.fireT -= dt; this.flashT -= dt;
    const dx = p.x - this.x, dz = p.z - this.z;
    const dist = Math.hypot(dx, dz);

    // pick the closest monster she can see
    if (this.thinkT <= 0) {
      this.thinkT = 0.25;
      const had = this.target && !this.target.dead;
      this.target = null;
      let best = ALLY.range;
      for (const e of game.enemies) {
        if (e.dead) continue;
        const d = Math.hypot(e.x - this.x, e.z - this.z);
        if (d >= best) continue;
        if (e.state === 'idle' && d > 12) continue;   // don't start fights far away
        if (!hasLineOfSight(game.level, this.x, this.y + 1.5, this.z, e.x, e.y + e.height * 0.6, e.z)) continue;
        best = d; this.target = e;
      }
      if (this.target && !had) {
        if (this.target.def.boss && !this.sawBoss) { this.sawBoss = true; game.voice.say('boss', { force: true }); }
        else game.voice.say('contact');
      }
      // warn the player when they're badly hurt
      if (!p.dead && p.health < 30 && game.time > (this.hurtWarnT || 0)) { this.hurtWarnT = game.time + 20; game.voice.say('hurt', { force: true }); }
    }

    // shoot
    let shooting = false;
    if (this.target && !this.target.dead && !p.dead) {
      shooting = true;
      if (this.fireT <= 0) {
        this.fireT = rand(...ALLY.cooldown);
        this.flashT = 0.08;
        const t = this.target;
        game.audio.playAt('pistol', this.x, this.z, 0.55);
        if (chance(0.15)) game.audio.playAt('vexHup', this.x, this.z, 0.9);
        if (chance(ALLY.accuracy)) {
          t.takeDamage(randInt(...ALLY.damage), this, { x: t.x, y: t.y + t.height * 0.6, z: t.z });
          if (t.dead) {
            if (chance(0.3)) game.audio.playAt('vexLaugh', this.x, this.z, 0.9);
            game.voice.say('kill');
          }
        }
        else game.effects.bulletPuff(t.x + rand(-0.8, 0.8), t.y + rand(0.3, 1.8), t.z + rand(-0.8, 0.8));
        if (t.state === 'idle') t.wake(true);
      }
    }

    // follow the player
    if (dist > ALLY.followDistance) {
      let tx = p.x, tz = p.z;
      if (!(dist < 10 && hasLineOfSight(game.level, this.x, this.y + 1.5, this.z, p.x, p.eyeY, p.z))) {
        const next = game.flow.nextStep(this.x, this.z);
        if (next) {
          tx = next.x; tz = next.z;
          if (next.cell.door && !next.cell.door.key) game.useDoor(next.cell.door, false, this);
        }
      }
      const l = Math.hypot(tx - this.x, tz - this.z) || 1;
      const s = ALLY.speed * (shooting ? 0.6 : 1) * dt;
      const ox = this.x, oz = this.z;
      if (!shooting) this.facing = Math.atan2(tx - this.x, tz - this.z);
      const bumped = moveBody(game.level, this, (tx - this.x) / l * s, (tz - this.z) / l * s, []);
      if (bumped && bumped.door && !bumped.door.key && !bumped.door.secret) game.useDoor(bumped.door, false, this);
      const moved = Math.hypot(this.x - ox, this.z - oz);
      this.walkPhase += moved * 3.6; this.moving = moved > 0.001;
      const stuck = moved < s * 0.2;
      this.lostT = stuck || dist > 30 ? this.lostT + dt : 0;
    } else { this.lostT = 0; this.moving = false; }
    if (this.lostT > 2.5 || dist > 45) { this.warpToPlayer(); game.voice.say('catchup'); }

    const floor = floorUnder(game.level, this.x, this.z, this.radius);
    this.y = this.y < floor ? floor : Math.max(floor, this.y - 9 * dt);

    // animation + lighting
    if (shooting && this.target) this.facing = Math.atan2(this.target.x - this.x, this.target.z - this.z);
    else if (!this.moving && dist < 6) this.facing = Math.atan2(dx, dz);
    const pose = this.flashT > 0 ? 'fire' : shooting ? 'aim' : this.moving ? 'walk' : 'idle';
    this.poseT = pose === this.pose ? (this.poseT || 0) + dt : 0; this.pose = pose;
    const root = this.model.root;
    root.visible = true;
    root.position.set(this.x, this.y, this.z);
    root.rotation.y = this.facing;
    this.model.update(pose, pose === 'idle' ? this.animT : this.walkPhase, this.poseT, 0);
    const L = game.level.lightColor(game.level.cellAt(this.x, this.z), this.y + 1.2);
    const b = game.effects.brightness;
    this.model.mats.setLight(Math.max(0.35, L[0]) * b, Math.max(0.35, L[1]) * b, Math.max(0.35, L[2]) * b);
  }

  /** Put her on a free square next to the player (behind them if possible). */
  warpToPlayer() {
    const game = this.game, p = game.player, L = game.level;
    const bx = Math.sin(p.yaw), bz = Math.cos(p.yaw);   // "behind" the player
    const tries = [[bx * 2, bz * 2], [-bz * 2, bx * 2], [bz * 2, -bx * 2], [bx * 1.2, bz * 1.2], [0, 0]];
    for (const [ox, oz] of tries) {
      const x = p.x + ox, z = p.z + oz;
      const c = L.cellAt(x, z);
      if (cellBlocks(L, c, p.y, this.height, this.step)) continue;
      if (!hasLineOfSight(L, p.x, p.eyeY, p.z, x, p.eyeY, z)) continue;
      this.x = x; this.z = z; this.y = L.floorAt(x, z); this.lostT = 0;
      return;
    }
  }

  static spawnNear(game) {
    const s = game.level.playerStart;
    const a = new Ally(game, s.x, s.z);
    game.player.yaw = s.angle;
    a.warpToPlayer();
    return a;
  }
}
