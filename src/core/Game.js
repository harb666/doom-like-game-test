// The heart of the game: owns every system, loads levels, runs the main loop
// and moves between states (title -> playing -> paused / dead / level complete).

import * as THREE from 'three';
import { CELL, DIFFICULTY, IS_TOUCH, PLAYER } from '../config.js';
import { Input } from './Input.js';
import { TouchControls } from './TouchControls.js';
import { Save } from './Save.js';
import { TextureLibrary } from '../world/textures.js';
import { Level } from '../world/Level.js';
import { hasLineOfSight } from '../world/Collision.js';
import { LEVELS } from '../world/levels/index.js';
import { Player } from '../player/Player.js';
import { WeaponSystem } from '../weapons/WeaponSystem.js';
import { Projectiles } from '../weapons/Projectiles.js';
import { Enemy } from '../enemies/Enemy.js';
import { Ally, ALLY } from '../allies/Ally.js';
import { FlowField } from '../enemies/FlowField.js';
import { Pickups } from '../items/Pickups.js';
import { Effects, glowTexture } from '../effects/Effects.js';
import { AudioSystem } from '../audio/Audio.js';
import { HUD } from '../ui/HUD.js';
import { Menus } from '../ui/Menus.js';
import { Automap } from '../ui/Automap.js';

const QUALITY_SCALE = { low: 0.42, medium: 0.62, high: 1.0 };
const KEY_NAMES = { red: 'RED', blue: 'BLUE', yellow: 'YELLOW' };

export class Game {
  constructor() {
    this.settings = Save.loadSettings();
    this.state = 'boot';
    this.time = 0;
    this.touchMode = IS_TOUCH;
    this.difficultyKey = 'normal';
    this.difficulty = DIFFICULTY.normal;

    // ---- renderer ----
    this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setClearColor(0x000000);
    document.getElementById('view').appendChild(this.renderer.domElement);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(70, 1, 0.05, 200);
    this.textures = new TextureLibrary(this.renderer);
    this.glowTex = glowTexture();

    // ---- systems ----
    this.input = new Input(this);
    this.touch = new TouchControls(this, this.input);
    this.audio = new AudioSystem(this);
    this.player = new Player(this);
    this.effects = new Effects(this);
    this.weapons = new WeaponSystem(this);
    this.projectiles = new Projectiles(this);
    this.pickups = new Pickups(this);
    this.hud = new HUD(this);
    this.menus = new Menus(this);
    this.automap = new Automap(this);
    this.enemyGroup = new THREE.Group();
    this.scene.add(this.effects.group, this.projectiles.group, this.pickups.group, this.enemyGroup);

    this.enemies = [];
    this.solidBodies = [];
    this._shootables = [];
    this.stats = {};
    this.totals = { kills: 0, secrets: 0, time: 0 };

    // performance tracking for automatic quality
    this.frameTimes = [];
    this.autoScale = IS_TOUCH ? QUALITY_SCALE.medium : QUALITY_SCALE.high;
    this.fps = 60;

    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 250));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { if (this.state === 'playing') this.pause(); this.audio.suspend(); }
      else this.audio.resume();
    });
    this.resize();
    this.applySettings();
  }

  start() {
    this.menus.title();
    this.state = 'title';
    this.last = performance.now();
    this.renderer.setAnimationLoop(() => this.frame());
  }

  // =========================================================
  // settings & screen
  // =========================================================
  applySettings() {
    this.audio.applyVolumes();
    this.resize();
  }
  saveSettings() { Save.saveSettings(this.settings); }

  get renderScale() {
    const q = this.settings.quality;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const s = q === 'auto' ? this.autoScale : QUALITY_SCALE[q];
    return Math.min(s, dpr);
  }
  get renderScaleLabel() { return `${Math.round(this.renderScale * 100)}%`; }

  resize() {
    const W = window.innerWidth, H = window.innerHeight;
    this.renderer.setPixelRatio(this.renderScale);
    this.renderer.setSize(W, H, false);
    const aspect = W / H;
    this.camera.aspect = aspect;
    // keep roughly a 95 degree horizontal view on wide phones, like classic shooters
    const hfov = 95 * Math.PI / 180;
    const vfov = 2 * Math.atan(Math.tan(hfov / 2) / aspect) * 180 / Math.PI;
    this.camera.fov = Math.max(52, Math.min(78, vfov));
    this.camera.updateProjectionMatrix();
    this.weapons.resize();
    if (this.automap.visible) this.automap.resize();
    this.updateRotateHint();
  }

  updateRotateHint() {
    const portrait = window.innerHeight > window.innerWidth;
    document.getElementById('rotate-hint').classList.toggle('hidden', !(portrait && IS_TOUCH && this.state === 'playing'));
  }

  trackPerformance(dt) {
    this.frameTimes.push(dt);
    if (this.frameTimes.length < 90) return;
    const avg = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    this.frameTimes.length = 0;
    this.fps = Math.round(1 / avg);
    if (this.settings.quality !== 'auto' || this.state !== 'playing') return;
    const max = IS_TOUCH ? 0.8 : 1.0;
    if (this.fps < 42 && this.autoScale > 0.36) { this.autoScale = Math.max(0.36, this.autoScale - 0.08); this.resize(); }
    else if (this.fps > 58 && this.autoScale < max) { this.autoScale = Math.min(max, this.autoScale + 0.04); this.resize(); }
  }

  // =========================================================
  // game flow
  // =========================================================
  progressInfo() {
    const p = Save.loadProgress();
    if (!p || !LEVELS[p.levelIndex]) return null;
    return `SECTOR ${p.levelIndex + 1}`;
  }

  newGame(diff) {
    this.difficultyKey = diff;
    this.difficulty = DIFFICULTY[diff];
    this.player.reset();
    this.weapons.resetForNewGame();
    this.totals = { kills: 0, secrets: 0, time: 0 };
    this.startLevel(0);
  }

  continueGame() {
    const p = Save.loadProgress();
    if (!p) return this.menus.difficulty();
    this.difficultyKey = p.difficulty || 'normal';
    this.difficulty = DIFFICULTY[this.difficultyKey];
    this.totals = p.totals || { kills: 0, secrets: 0, time: 0 };
    this.applyLoadout(p.loadout);
    this.startLevel(p.levelIndex);
  }

  captureLoadout() {
    const p = this.player;
    return { health: p.health, armor: p.armor, armorAbsorb: p.armorAbsorb, weapons: this.weapons.snapshot() };
  }
  applyLoadout(l) {
    this.player.reset();
    if (!l) { this.weapons.resetForNewGame(); return; }
    this.player.health = l.health; this.player.armor = l.armor; this.player.armorAbsorb = l.armorAbsorb;
    this.weapons.restore(l.weapons);
  }

  startLevel(index) {
    this.levelIndex = index;
    this.levelStartLoadout = this.captureLoadout();
    Save.saveProgress({ levelIndex: index, difficulty: this.difficultyKey, loadout: this.levelStartLoadout, totals: this.totals });
    this.loadLevel(LEVELS[index]);
    this.beginPlay();
    this.hud.message(`${this.levelDef.name.toUpperCase()}`, true);
    if (this.levelDef.subtitle) this.hud.message(this.levelDef.subtitle);
    if (this.ally) this.hud.message(`${ALLY.name} is fighting at your side.`);
  }

  restartLevel() {
    const l = { ...this.levelStartLoadout };
    l.health = Math.max(l.health, PLAYER.maxHealth);
    this.applyLoadout(l);
    this.loadLevel(LEVELS[this.levelIndex]);
    this.beginPlay();
    this.hud.message(`${this.levelDef.name.toUpperCase()}`, true);
  }

  loadLevel(def) {
    this.unloadLevel();
    this.levelDef = def;
    const level = new Level(def);
    this.level = level;
    this.scene.add(level.build(this.textures));
    const fog = def.fog || { color: 0x000000, near: 4, far: 36 };
    this.scene.fog = new THREE.Fog(fog.color, fog.near, fog.far);
    this.scene.background = new THREE.Color(fog.color);
    level.on((type, obj) => this.onLevelEvent(type, obj));

    this.player.resetForLevel();
    this.player.spawn(level.playerStart);
    this.weapons.resetState();
    this.flow = new FlowField(level);

    for (const t of level.things) {
      if (t.kind === 'enemy') {
        const e = new Enemy(this, t.type, t.x, t.z);
        this.enemies.push(e);
        this.enemyGroup.add(e.sprite);
      } else if (t.kind === 'item') this.pickups.add(t.type, t.x, t.z);
      else if (t.kind === 'barrel') this.pickups.addBarrel(t.x, t.z);
      else if (t.kind === 'decor') this.pickups.addDecor(t.type, t.x, t.z);
    }
    this.stats = {
      kills: 0, killsTotal: this.enemies.length, items: 0, itemsTotal: this.pickups.countable(),
      secrets: 0, secretsTotal: level.secretsTotal, time: 0,
    };
    this.flow.update(0, this.player.x, this.player.z, true);
    this.ally = null;
    if (this.settings.allyCompanion) {
      this.ally = Ally.spawnNear(this);
      this.enemyGroup.add(this.ally.sprite);
    }
  }

  unloadLevel() {
    if (this.level) {
      this.scene.remove(this.level.group);
      this.level.dispose();
      this.level = null;
    }
    for (const e of this.enemies) e.material.dispose();
    if (this.ally) { this.ally.material.dispose(); this.ally = null; }
    this.enemies = [];
    this.enemyGroup.clear();
    this.pickups.clear();
    this.projectiles.clear();
    this.effects.clear();
    this.hud.clearMessages();
    this.automap.toggle(false);
  }

  beginPlay() {
    this.menus.close();
    this.state = 'playing';
    this.hud.show(true);
    this.touch.show(this.touchMode);
    this.input.enabled = true;
    this.input.clearActions();
    if (!this.touchMode) this.input.lock();
    this.audio.unlock();
    this.audio.music?.play(this.levelDef.music || 'intake');
    this.audio.startAmbient();
    this.updateRotateHint();
    this.last = performance.now();
  }

  requestPause() { if (this.state === 'playing') this.pause(); }

  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.input.enabled = false;
    this.input.unlock();
    this.touch.show(false);
    this.automap.toggle(false);
    this.menus.pause();
    this.updateRotateHint();
  }

  resume() {
    this.menus.close();
    this.state = 'playing';
    this.input.enabled = true;
    this.input.clearActions();
    this.touch.show(this.touchMode);
    if (!this.touchMode) this.input.lock();
    this.updateRotateHint();
    this.last = performance.now();
  }

  quitToTitle() {
    this.unloadLevel();
    this.state = 'title';
    this.hud.show(false);
    this.touch.show(false);
    this.input.enabled = false;
    this.input.unlock();
    this.audio.stopAmbient();
    this.weapons.ctx.clearRect(0, 0, this.weapons.canvas.width, this.weapons.canvas.height);
    this.menus.title();
    this.updateRotateHint();
  }

  onPlayerDeath() {
    this.state = 'dead';
    this.input.enabled = false;
    this.touch.show(false);
    setTimeout(() => {
      if (this.state !== 'dead') return;
      this.input.unlock();
      this.menus.gameOver();
    }, 1800);
  }

  completeLevel() {
    if (this.state !== 'playing') return;
    if (this.levelDef.exitRequiresBoss && this.enemies.some(e => e.def.boss && !e.dead)) {
      if ((this.lockMsgT || 0) <= this.time) {
        this.hud.message('The gate is sealed while the Warden lives!', true);
        this.audio.play('locked');
        this.lockMsgT = this.time + 2;
      }
      return;
    }
    this.state = 'complete';
    this.input.enabled = false;
    this.input.unlock();
    this.touch.show(false);
    this.automap.toggle(false);
    this.audio.play('levelDone');
    this.audio.stopAmbient();
    this.totals.kills += this.stats.kills;
    this.totals.secrets += this.stats.secrets;
    this.totals.time += this.stats.time;
    Save.saveRecord(this.levelDef.id, { time: this.stats.time, kills: this.stats.kills, secrets: this.stats.secrets });
    const isLast = this.levelIndex >= LEVELS.length - 1;
    // save progress pointing at the next level with the loadout you finished with
    if (!isLast) Save.saveProgress({ levelIndex: this.levelIndex + 1, difficulty: this.difficultyKey, loadout: this.captureLoadout(), totals: this.totals });
    else Save.clearProgress();
    this.menus.levelComplete(this.stats, isLast);
  }

  nextLevel() {
    if (this.levelIndex >= LEVELS.length - 1) {
      this.unloadLevel();
      this.hud.show(false);
      this.state = 'victory';
      this.weapons.ctx.clearRect(0, 0, this.weapons.canvas.width, this.weapons.canvas.height);
      this.menus.victory(this.totals);
      return;
    }
    this.startLevel(this.levelIndex + 1);
  }

  // =========================================================
  // interactions used by other systems
  // =========================================================
  onLevelEvent(type, obj) {
    const pos = obj.cell ? obj.cell : obj.cells?.[0];
    const x = pos ? (pos.cx + 0.5) * CELL : this.player.x, z = pos ? (pos.cz + 0.5) * CELL : this.player.z;
    if (type === 'doorClose') this.audio.playAt('doorClose', x, z);
    else if (type === 'doorOpen') this.audio.playAt('doorOpen', x, z);
    else if (type === 'liftStart' || type === 'liftStop') this.audio.playAt('lift', x, z);
  }

  useDoor(door, auto = false, enemy = null) {
    if (door.state === 'open' || door.state === 'opening') { door.timer = 0; return true; }
    const x = (door.cell.cx + 0.5) * CELL, z = (door.cell.cz + 0.5) * CELL;
    if (enemy) {
      if (door.key || door.secret) return false;
      if (door.activate()) this.audio.playAt('doorOpen', x, z);
      return true;
    }
    if (door.key && !this.player.keys.has(door.key)) {
      if (!auto || (this.lockMsgT || 0) <= this.time) {
        this.hud.message(`You need the ${KEY_NAMES[door.key]} keycard to open this door.`);
        this.audio.play('locked');
        this.lockMsgT = this.time + 1.5;
      }
      return false;
    }
    if (door.secret && auto) return false;
    if (door.activate()) this.audio.playAt('doorOpen', x, z);
    return true;
  }

  useLift(lift) {
    if (lift.activate()) return true;
    return false;
  }

  tryUse() {
    const p = this.player;
    const u = this.level.findUsable(p.x, p.z, p.yaw, PLAYER.useRange);
    if (!u) return;
    if (u.door) this.useDoor(u.door, false);
    else if (u.lift) this.useLift(u.lift);
    else if (u.wall) this.audio.play('oof');
  }

  giveKey(color) {
    if (this.player.keys.has(color)) return false;
    this.player.keys.add(color);
    return true;
  }

  findSecret(cell) {
    const group = cell.secretGroup;
    for (const c of this.level.cells) if (c.secretGroup === group) c.secretFound = true;
    this.stats.secrets++;
    this.hud.message('A SECRET IS REVEALED!', true);
    this.audio.play('secret');
  }

  onEnemyKilled() { this.stats.kills++; }

  /** Gunfire wakes monsters that are within earshot (measured along walkable paths). */
  makeNoise(x, z) {
    for (const e of this.enemies) {
      if (e.state !== 'idle' || e.dead) continue;
      const d = this.flow.distAt(e.x, e.z);
      if ((d >= 0 && d <= 16) || Math.hypot(e.x - x, e.z - z) < 7) e.wake(true);
    }
  }

  /** Explosion damage: falls off with distance, blocked by walls. */
  radiusDamage(x, y, z, radius, damage, source, skip = null, selfObj = null) {
    const hurt = (t, isPlayer) => {
      if (t === skip || t === selfObj || t.dead) return;
      const cy = t.y + t.height * 0.5;
      const d = Math.max(0, Math.hypot(t.x - x, t.z - z, (cy - y) * 0.5) - t.radius);
      if (d >= radius) return;
      if (!hasLineOfSight(this.level, x, y, z, t.x, cy, t.z)) return;
      let dmg = damage * (1 - d / radius);
      if (isPlayer && source === this.player) dmg *= 0.5;   // your own rockets hurt, but less
      if (isPlayer) this.player.damage(dmg, { x, z });
      else t.takeDamage(dmg, source, null);
    };
    for (const e of this.enemies) hurt(e, false);
    for (const b of this.pickups.barrels) hurt(b, false);
    hurt(this.player, true);
  }

  shootables() { return this._shootables; }
  enemyTargets() { return this._enemyTargets; }

  isOccupied(cell) {
    const C = CELL, x0 = cell.cx * C, z0 = cell.cz * C;
    const inside = (b) => b.x + b.radius > x0 && b.x - b.radius < x0 + C && b.z + b.radius > z0 && b.z - b.radius < z0 + C;
    if (inside(this.player)) return true;
    for (const e of this.enemies) if (!e.dead && inside(e)) return true;
    return false;
  }

  // =========================================================
  // main loop
  // =========================================================
  frame() {
    const now = performance.now();
    let dt = (now - this.last) / 1000;
    this.last = now;
    if (dt > 0.05) dt = 0.05;
    if (dt <= 0) dt = 0.001;
    this.trackPerformance(dt);

    if (this.level && (this.state === 'playing' || this.state === 'dead' || this.state === 'complete')) {
      this.update(dt);
      this.render(dt);
    } else if (this.level && this.state === 'paused') {
      this.render(0);
    } else {
      this.renderer.clear();
    }
  }

  update(dt) {
    this.time += dt;
    const input = this.input;
    input.poll(dt);
    const playing = this.state === 'playing';
    if (playing) {
      this.stats.time += dt;
      if (input.consume('pause')) { this.pause(); return; }
      if (input.consume('map')) this.automap.toggle();
      if (input.consume('use')) this.tryUse();
    } else input.clearActions();

    // rebuild the lists of things that collide / can be shot
    this.solidBodies.length = 0;
    this._shootables.length = 0;
    this._enemyTargets = this.player.dead ? [] : [this.player];
    if (!this.player.dead) this.solidBodies.push(this.player);
    for (const e of this.enemies) if (!e.dead) { this.solidBodies.push(e); this._shootables.push(e); }
    for (const b of this.pickups.barrels) if (!b.dead) { this.solidBodies.push(b); this._shootables.push(b); this._enemyTargets.push(b); }
    for (const d of this.pickups.decor) if (d.solidBody) this.solidBodies.push(d);

    this.player.update(dt, playing ? input : IDLE_INPUT);
    this.checkLiftWalkOn(dt);
    this.level.update(dt, this.time, this.camera.position, (c) => this.isOccupied(c));
    this.flow.update(dt, this.player.x, this.player.z);
    for (const e of this.enemies) e.update(dt);
    if (this.ally) this.ally.update(dt);
    this.projectiles.update(dt);
    if (playing) this.weapons.update(dt, input); else this.weapons.update(dt, IDLE_INPUT);
    this.pickups.update(dt, this.time);
    this.effects.update(dt);
    this.automap.reveal(dt);
    this.hud.update(dt, this.fps);
  }

  checkLiftWalkOn(dt) {
    const p = this.player;
    const c = this.level.cellAt(p.x, p.z);
    // Stepping onto a raised lift from the top sends it down. Riding it up doesn't.
    if (!c.lift) { this.liftBoard = null; this.liftStandT = 0; return; }
    if (this.liftBoard !== c.lift) { this.liftBoard = c.lift; this.liftBoardState = c.lift.state; this.liftStandT = 0; }
    if (this.liftBoardState === 'up' && c.lift.state === 'up' && Math.abs(p.y - c.lift.h) < 0.05) {
      this.liftStandT += dt;
      if (this.liftStandT > 0.35) { this.useLift(c.lift); this.liftBoardState = 'used'; }
    }
  }

  render(dt) {
    this.player.applyCamera(this.camera, this.time);
    this.renderer.render(this.scene, this.camera);
    const cell = this.level.cellAt(this.player.x, this.player.z);
    this.weapons.render(dt, (cell.light ?? 0.7) * this.effects.brightness);
    this.automap.draw();
  }
}

const IDLE_INPUT = { moveX: 0, moveY: 0, fire: false, takeLook: () => [0, 0], consume: () => false };
