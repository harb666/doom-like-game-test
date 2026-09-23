// Heads-up display: health, armour, ammo, weapon, keys, messages, boss bar.
// Only touches the page when a value actually changes (cheap on phones).

import { WEAPONS, AMMO_TYPES } from '../weapons/weaponDefs.js';

export class HUD {
  constructor(game) {
    this.game = game;
    const $ = (id) => document.getElementById(id);
    this.root = $('hud');
    this.el = {
      health: $('hud-health'), armor: $('hud-armor'), ammo: $('hud-ammo'), weapon: $('hud-weapon-name'),
      keys: $('hud-keys'), slots: $('hud-slots'), msgs: $('hud-messages'), fps: $('hud-fps'),
      boss: $('hud-boss'), bossName: $('hud-boss-name'), bossFill: $('hud-boss-fill'),
    };
    this.crosshair = $('crosshair');
    this.cache = {};
    this.messages = [];
    this.el.slots.innerHTML = WEAPONS.map(w => `<div class="slot" data-slot="${w.id}">${w.slot}</div>`).join('');
    this.slotEls = [...this.el.slots.children];
  }

  show(on) {
    this.root.classList.toggle('hidden', !on);
    this.crosshair.classList.toggle('show', on);
  }

  set(key, el, value, extra) {
    if (this.cache[key] === value) return;
    this.cache[key] = value;
    el.textContent = value;
    if (extra) extra(el, value);
  }

  message(text, big = false) {
    const div = document.createElement('div');
    div.className = 'hud-msg' + (big ? ' big' : '');
    div.textContent = text;
    this.el.msgs.appendChild(div);
    const m = { div, t: big ? 4 : 2.6 };
    this.messages.push(m);
    while (this.messages.length > 4) this.messages.shift().div.remove();
  }

  clearMessages() { for (const m of this.messages) m.div.remove(); this.messages.length = 0; }

  update(dt, fps) {
    const g = this.game, p = g.player, w = g.weapons;
    this.set('hp', this.el.health, Math.ceil(p.health), (el, v) => el.classList.toggle('low', v <= 25));
    this.set('ar', this.el.armor, Math.ceil(p.armor));
    const def = w.def;
    this.set('wn', this.el.weapon, def.name.toUpperCase());
    const ammo = w.ammo[def.ammo];
    this.set('am', this.el.ammo, ammo, (el, v) => el.classList.toggle('low', v <= Math.max(3, AMMO_TYPES[def.ammo].max * 0.08)));
    const keyStr = [...p.keys].sort().join(',');
    if (this.cache.keys !== keyStr) {
      this.cache.keys = keyStr;
      this.el.keys.innerHTML = [...p.keys].sort().map(k => `<div class="key-icon key-${k}"></div>`).join('');
    }
    const slotState = WEAPONS.map(x => (w.owned.has(x.id) ? 'o' : '-') + (x.id === w.current ? 'a' : '')).join('');
    if (this.cache.slots !== slotState) {
      this.cache.slots = slotState;
      this.slotEls.forEach((el, i) => {
        const id = WEAPONS[i].id;
        el.classList.toggle('owned', w.owned.has(id));
        el.classList.toggle('active', id === w.current);
      });
    }
    for (let i = this.messages.length - 1; i >= 0; i--) {
      const m = this.messages[i];
      m.t -= dt;
      if (m.t < 0.6) m.div.style.opacity = Math.max(0, m.t / 0.6);
      if (m.t <= 0) { m.div.remove(); this.messages.splice(i, 1); }
    }
    // boss health bar
    const boss = g.enemies.find(e => e.def.boss && e.state !== 'idle' && !e.dead);
    this.el.boss.classList.toggle('hidden', !boss);
    if (boss) {
      this.set('bn', this.el.bossName, boss.def.name.toUpperCase());
      this.el.bossFill.style.width = Math.max(0, (boss.health / boss.maxHealth) * 100).toFixed(1) + '%';
    }
    this.el.fps.classList.toggle('hidden', !g.settings.showFps);
    if (g.settings.showFps) this.set('fps', this.el.fps, `${fps} FPS · ${g.renderScaleLabel}`);
  }
}
