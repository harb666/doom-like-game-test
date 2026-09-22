// Pickups (health, armour, ammo, weapons, keycards) and props (explosive barrels, lamps).

import * as THREE from 'three';
import { getItemTexture } from './itemSprites.js';
import { PLAYER } from '../config.js';

const PX = 0.035; // world metres per sprite pixel

// What each pickup does. `give` returns false if the player can't use it (e.g. already full).
export const ITEMS = {
  medpatch:   { msg: 'Picked up a Med Patch.', sound: 'pickup', give: (g) => g.player.heal(15, PLAYER.maxHealth) },
  traumakit:  { msg: 'Picked up a Trauma Kit.', sound: 'pickup', give: (g) => g.player.heal(40, PLAYER.maxHealth) },
  vitalcore:  { msg: 'VITAL CORE! Health overcharged!', sound: 'powerup', counts: true, glow: 0x9a6aff, give: (g) => g.player.heal(100, PLAYER.overHealth) },
  flakvest:   { msg: 'Picked up the Flak Vest.', sound: 'pickupArmor', counts: true, give: (g) => g.player.addArmor(100, 1 / 3, 200, true) },
  aegisplate: { msg: 'Picked up the Aegis Plate!', sound: 'pickupArmor', counts: true, glow: 0x4a8aff, give: (g) => g.player.addArmor(200, 1 / 2, 200, true) },
  armorshard: { msg: 'Picked up an armor shard.', sound: 'pickup', counts: true, give: (g) => g.player.addArmor(5, 1 / 3, PLAYER.maxArmor) },
  rivets:     { msg: 'Picked up a clip of rivets.', sound: 'pickup', give: (g, it) => g.weapons.giveAmmo('rivets', it.amount || 12) },
  rivetcrate: { msg: 'Picked up a crate of rivets.', sound: 'pickup', give: (g) => g.weapons.giveAmmo('rivets', 50) },
  shells:     { msg: 'Picked up 4 shells.', sound: 'pickup', give: (g) => g.weapons.giveAmmo('shells', 4) },
  shellbox:   { msg: 'Picked up a box of shells.', sound: 'pickup', give: (g) => g.weapons.giveAmmo('shells', 20) },
  cells:      { msg: 'Picked up an energy cell.', sound: 'pickup', give: (g, it) => g.weapons.giveAmmo('cells', it.amount || 25) },
  cellpack:   { msg: 'Picked up a cell pack.', sound: 'pickup', give: (g) => g.weapons.giveAmmo('cells', 100) },
  rocket:     { msg: 'Picked up a rocket.', sound: 'pickup', give: (g) => g.weapons.giveAmmo('rockets', 1) },
  rocketcrate:{ msg: 'Picked up a crate of rockets.', sound: 'pickup', give: (g) => g.weapons.giveAmmo('rockets', 5) },
  w_scattergun: { msg: 'You got the BREACHER SCATTERGUN!', sound: 'weaponPickup', give: (g) => g.weapons.giveWeapon('scattergun', 8) },
  w_repeater:   { msg: 'You got the BUZZSAW REPEATER!', sound: 'weaponPickup', give: (g) => g.weapons.giveWeapon('repeater', 40) },
  w_lancer:     { msg: 'You got the ION LANCER!', sound: 'weaponPickup', give: (g) => g.weapons.giveWeapon('lancer', 60) },
  w_hellbore:   { msg: 'You got the HELLBORE LAUNCHER!', sound: 'weaponPickup', give: (g) => g.weapons.giveWeapon('hellbore', 4) },
  key_red:    { msg: 'Picked up the RED keycard.', sound: 'keyPickup', glow: 0xff3030, give: (g) => g.giveKey('red') },
  key_blue:   { msg: 'Picked up the BLUE keycard.', sound: 'keyPickup', glow: 0x3070ff, give: (g) => g.giveKey('blue') },
  key_yellow: { msg: 'Picked up the YELLOW keycard.', sound: 'keyPickup', glow: 0xffd030, give: (g) => g.giveKey('yellow') },
};

function makeSprite(texName, fog = true) {
  const tex = getItemTexture(texName);
  const mat = new THREE.SpriteMaterial({ map: tex, alphaTest: 0.5, fog });
  const s = new THREE.Sprite(mat);
  s.center.set(0.5, 0);
  s.scale.set(tex.userData.w * PX, tex.userData.h * PX, 1);
  return s;
}

function lightAt(game, x, z) {
  const c = game.level.cellAt(x, z);
  return Math.max(0.2, Math.pow(Math.min(1.2, c.light ?? 0.7), 1.8)) * game.effects.brightness;
}

export class Pickups {
  constructor(game) {
    this.game = game;
    this.group = new THREE.Group();
    this.items = [];
    this.barrels = [];
    this.decor = [];
  }

  clear() {
    this.group.clear();
    this.items.length = 0; this.barrels.length = 0; this.decor.length = 0;
  }

  add(type, x, z, extra = {}) {
    const def = ITEMS[type];
    if (!def) throw new Error('Unknown item ' + type);
    const sprite = makeSprite(type);
    const it = { type, def, x, z, y: this.game.level.floorAt(x, z), sprite, phase: Math.random() * 6, taken: false, ...extra };
    if (def.glow) {
      const g = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.game.glowTex, color: def.glow, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, opacity: 0.5 }));
      g.scale.setScalar(1.3);
      it.glow = g; this.group.add(g);
    }
    this.group.add(sprite);
    this.items.push(it);
    return it;
  }

  spawnDrop(kind, x, z) { this.add(kind, x, z, { amount: kind === 'rivets' ? 6 : 12, dropped: true }); }

  addBarrel(x, z) {
    const sprite = makeSprite('barrel');
    const b = new Barrel(this.game, x, z, sprite);
    this.group.add(sprite);
    this.barrels.push(b);
    return b;
  }

  addDecor(type, x, z) {
    const sprite = makeSprite(type);
    const d = { type, x, z, y: this.game.level.floorAt(x, z), sprite, radius: type === 'remains' ? 0 : 0.3, height: 2, solidBody: type !== 'remains', bright: type !== 'remains' };
    sprite.position.set(x, d.y, z);
    this.group.add(sprite);
    if (d.bright) {
      const g = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.game.glowTex, color: type === 'lamp' ? 0xfff0c0 : 0xff8020, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, opacity: 0.35 }));
      g.position.set(x, d.y + (type === 'lamp' ? 1.95 : 1.2), z); g.scale.setScalar(1.6);
      this.group.add(g); d.glow = g;
    }
    this.decor.push(d);
    return d;
  }

  update(dt, time) {
    const game = this.game, p = game.player;
    for (const it of this.items) {
      if (it.taken) continue;
      it.y = game.level.floorAt(it.x, it.z);
      const bob = Math.sin(time * 3 + it.phase) * 0.06 + 0.08;
      it.sprite.position.set(it.x, it.y + bob, it.z);
      const L = lightAt(game, it.x, it.z);
      it.sprite.material.color.setScalar(it.def.glow ? Math.max(1, L) : L);
      if (it.glow) { it.glow.position.set(it.x, it.y + 0.45 + bob, it.z); it.glow.material.opacity = 0.35 + Math.sin(time * 5 + it.phase) * 0.15; }
      // touch to collect
      if (!p.dead && Math.abs(p.x - it.x) < 0.95 && Math.abs(p.z - it.z) < 0.95 && Math.abs(p.y - it.y) < 1.2) {
        if (it.def.give(game, it)) {
          it.taken = true;
          it.sprite.visible = false;
          if (it.glow) it.glow.visible = false;
          if (it.def.counts && !it.dropped) game.stats.items++;
          game.hud.message(it.def.msg, it.type.startsWith('w_') || it.type.startsWith('key') || it.def.counts && it.def.glow);
          game.audio.play(it.def.sound);
          if (game.ally && it.type.startsWith('w_')) setTimeout(() => game.voice.say('weapon'), 700);
          game.effects.pickupFlash();
        }
      }
    }
    for (const b of this.barrels) b.update(dt);
    for (const d of this.decor) {
      d.sprite.material.color.setScalar(d.bright ? 1 : lightAt(game, d.x, d.z));
      if (d.glow) d.glow.material.opacity = 0.3 + Math.sin(time * 9 + d.x) * 0.05;
    }
  }

  countable() { return this.items.filter(i => i.def.counts && !i.dropped).length; }
}

/** Explosive canister: shoot it and it blows up (chain reactions included). */
class Barrel {
  constructor(game, x, z, sprite) {
    this.game = game;
    this.x = x; this.z = z;
    this.y = game.level.floorAt(x, z);
    this.radius = 0.42; this.height = 1.1;
    this.health = 20;
    this.solidBody = true;
    this.isBarrel = true;
    this.dead = false;
    this.fuse = -1;
    this.sprite = sprite;
    sprite.position.set(x, this.y, z);
  }
  get alive() { return !this.dead; }
  takeDamage(amount, source) {
    if (this.dead || this.fuse >= 0) return;
    this.health -= amount;
    this.lastHit = source;
    if (this.health <= 0) {
      this.fuse = 0.12 + Math.random() * 0.1;
      this.sprite.material.map = getItemTexture('barrel_hot');
    }
  }
  update(dt) {
    if (this.dead) return;
    const L = lightAt(this.game, this.x, this.z);
    this.sprite.material.color.setScalar(L);
    if (this.fuse >= 0) {
      this.fuse -= dt;
      if (this.fuse < 0) {
        this.dead = true;
        this.solidBody = false;
        this.sprite.visible = false;
        this.game.effects.explosion(this.x, this.y + 0.6, this.z, 4);
        this.game.radiusDamage(this.x, this.y + 0.6, this.z, 4.5, 110, this.lastHit, null, this);
      }
    }
  }
}
