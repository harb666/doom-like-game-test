// Draws the 3D gun in the player's hands (Quake-style view model).
// It lives in its own small scene, drawn on top of the world every frame.

import * as THREE from 'three';
import { MaterialSet } from '../models/common.js';
import { buildWeaponModel, buildArm } from '../models/weapons.js';
import { glowTexture } from '../effects/Effects.js';

const FLASH_COLORS = { pistol: 0xffc860, machinegun: 0xffc050, scattergun: 0xffb040, repeater: 0xffc860, lancer: 0x80d8ff, hellbore: 0xff7020 };

export class ViewModel {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(58, 1, 0.01, 10);
    this.ambient = new THREE.AmbientLight(0xffffff, 1.5);
    this.key = new THREE.DirectionalLight(0xfff0e0, 1.6);
    this.key.position.set(-1, 2, 1);
    this.flashLight = new THREE.PointLight(0xffc060, 0, 2.5, 2);
    this.scene.add(this.ambient, this.key, this.flashLight);
    this.holder = new THREE.Group();
    this.scene.add(this.holder);
    this.models = {};
    this.flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false }));
    this.flash.visible = false;
    this.scene.add(this.flash);
    this.current = null;
    this.spin = 0;
  }

  get(id) {
    if (!this.models[id]) {
      const M = new MaterialSet();
      const g = new THREE.Group();
      const gun = buildWeaponModel(id, M);
      g.add(gun);
      const arm = buildArm(M);
      g.add(arm);
      g.userData.gun = gun; g.userData.mats = M;
      this.models[id] = g;
    }
    return this.models[id];
  }

  resize(aspect) { this.camera.aspect = aspect; this.camera.updateProjectionMatrix(); }

  /**
   * state: { id, bobX, bobY, lower (0..1), kick (0..1), flash (bool), pump (0..1), spinning, light: [r,g,b], pitch }
   */
  render(renderer, s, dt) {
    const m = this.get(s.id);
    if (this.current !== m) {
      if (this.current) this.holder.remove(this.current);
      this.holder.add(m); this.current = m;
    }
    const gun = m.userData.gun, ud = gun.userData;
    // position: held low on the right, like Quake 2
    this.holder.position.set(0.13 + s.bobX, -0.125 + s.bobY - s.lower * 0.3 + s.kick * 0.006, -0.2 + s.kick * 0.035);
    this.holder.rotation.set(s.kick * 0.15 - s.lower * 0.6, 0.07, 0);
    this.holder.scale.setScalar(0.5);
    if (ud.pump) ud.pump.position.z = s.pump * 0.12;
    if (ud.spin) { this.spin += dt * (s.spinning ? 30 : 2); ud.spin.rotation.z = this.spin; }
    // light the gun with the room's light
    const [r, g, b] = s.light;
    this.ambient.color.setRGB(Math.min(1.2, r), Math.min(1.2, g), Math.min(1.2, b));
    this.key.intensity = 0.5 + 1.1 * Math.min(1, (r + g + b) / 3);
    // muzzle flash
    if (s.flash) {
      const col = FLASH_COLORS[s.id] || 0xffc060;
      const mz = ud.muzzle.clone().applyMatrix4(gun.matrixWorld);
      this.holder.updateMatrixWorld(true);
      mz.copy(ud.muzzle).applyMatrix4(gun.matrixWorld);
      this.flash.position.copy(mz);
      this.flash.material.color.setHex(col);
      this.flash.material.rotation = Math.random() * 6;
      this.flash.scale.setScalar(s.id === 'hellbore' || s.id === 'scattergun' ? 0.18 : 0.12);
      this.flash.visible = true;
      this.flashLight.color.setHex(col); this.flashLight.intensity = 3; this.flashLight.position.copy(mz);
    } else { this.flash.visible = false; this.flashLight.intensity = 0; }
    renderer.autoClear = false;
    renderer.clearDepth();
    renderer.render(this.scene, this.camera);
    renderer.autoClear = true;
  }
}
