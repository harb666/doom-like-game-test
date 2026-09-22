// Touchscreen controls designed for phones held sideways:
//  - left side: floating joystick (appears where your thumb lands)
//  - right side: drag to look / aim
//  - FIRE button (you can also drag on it to aim while shooting)
//  - USE, WPN (next weapon), MAP and pause buttons

const STICK_RADIUS = 52;
const DEADZONE = 0.12;

export class TouchControls {
  constructor(game, input) {
    this.game = game;
    this.input = input;
    this.root = document.getElementById('app');
    this.layer = document.getElementById('touch');
    this.base = document.getElementById('stick-base');
    this.knob = document.getElementById('stick-knob');
    this.buttons = {
      fire: document.getElementById('btn-fire'),
      use: document.getElementById('btn-use'),
      weapon: document.getElementById('btn-weapon'),
      pause: document.getElementById('btn-pause'),
      map: document.getElementById('btn-map'),
    };
    this.weaponBox = document.getElementById('hud-weapon-box');
    this.touches = new Map();  // id -> { role, x, y, ox, oy }
    this.active = false;

    const opts = { passive: false };
    this.root.addEventListener('touchstart', (e) => this.onStart(e), opts);
    this.root.addEventListener('touchmove', (e) => this.onMove(e), opts);
    this.root.addEventListener('touchend', (e) => this.onEnd(e), opts);
    this.root.addEventListener('touchcancel', (e) => this.onEnd(e), opts);
    // stop iOS pinch-zoom / double-tap zoom
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    document.addEventListener('dblclick', (e) => e.preventDefault());
  }

  show(on) {
    this.active = on;
    this.layer.classList.toggle('hidden', !on);
    if (!on) this.releaseAll();
  }

  hit(el, x, y, pad = 10) {
    const r = el.getBoundingClientRect();
    if (!r.width) return false;
    return x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad;
  }

  onStart(e) {
    if (!this.active) return;
    e.preventDefault();
    this.game.audio.unlock();
    const W = window.innerWidth;
    for (const t of e.changedTouches) {
      const x = t.clientX, y = t.clientY;
      let role = null;
      const B = this.buttons;
      if (this.hit(B.pause, x, y, 6)) { role = 'button'; this.input.pressed.add('pause'); this.flash(B.pause); }
      else if (this.hit(B.map, x, y, 6)) { role = 'button'; this.input.pressed.add('map'); this.flash(B.map); }
      else if (this.hit(B.fire, x, y, 14)) { role = 'fire'; B.fire.classList.add('pressed'); }
      else if (this.hit(B.use, x, y, 10)) { role = 'button'; this.input.pressed.add('use'); this.flash(B.use); }
      else if (this.hit(B.weapon, x, y, 10)) { role = 'button'; this.input.pressed.add('next'); this.flash(B.weapon); }
      else if (this.hit(this.weaponBox, x, y, 4)) { role = 'button'; this.input.pressed.add('next'); }
      else if (x < W * 0.42 && !this.hasRole('stick')) { role = 'stick'; this.startStick(x, y); }
      else role = 'look';
      this.touches.set(t.identifier, { role, x, y, ox: x, oy: y });
    }
    this.updateFire();
  }

  onMove(e) {
    if (!this.active) return;
    e.preventDefault();
    const sens = 0.0058 * this.game.settings.lookSensitivity;
    for (const t of e.changedTouches) {
      const s = this.touches.get(t.identifier);
      if (!s) continue;
      const dx = t.clientX - s.x, dy = t.clientY - s.y;
      s.x = t.clientX; s.y = t.clientY;
      if (s.role === 'look' || s.role === 'fire') {
        this.input.lookX -= dx * sens;
        if (this.game.settings.verticalLook) this.input.lookY -= dy * sens * 0.8 * (this.game.settings.invertY ? -1 : 1);
      } else if (s.role === 'stick') this.moveStick(s);
    }
  }

  onEnd(e) {
    if (!this.active) return;
    e.preventDefault();
    for (const t of e.changedTouches) {
      const s = this.touches.get(t.identifier);
      if (!s) continue;
      if (s.role === 'stick') this.endStick();
      this.touches.delete(t.identifier);
    }
    this.updateFire();
  }

  hasRole(role) { for (const s of this.touches.values()) if (s.role === role) return true; return false; }

  updateFire() {
    const firing = this.hasRole('fire');
    this.input.touchFire = firing;
    this.buttons.fire.classList.toggle('pressed', firing);
  }

  flash(el) { el.classList.add('pressed'); setTimeout(() => el.classList.remove('pressed'), 140); }

  startStick(x, y) {
    this.stickOrigin = { x, y };
    this.base.style.left = x + 'px';
    this.base.style.top = y + 'px';
    this.base.classList.add('active');
    this.knob.style.transform = 'translate(0px, 0px)';
    this.input.touchMove.active = true;
    this.input.touchMove.x = this.input.touchMove.y = 0;
  }

  moveStick(s) {
    let dx = s.x - this.stickOrigin.x, dy = s.y - this.stickOrigin.y;
    const len = Math.hypot(dx, dy);
    if (len > STICK_RADIUS) {
      // drag the base along so the stick never "runs out"
      const k = (len - STICK_RADIUS) / len;
      this.stickOrigin.x += dx * k; this.stickOrigin.y += dy * k;
      this.base.style.left = this.stickOrigin.x + 'px';
      this.base.style.top = this.stickOrigin.y + 'px';
      dx -= dx * k; dy -= dy * k;
    }
    this.knob.style.transform = `translate(${dx}px, ${dy}px)`;
    let nx = dx / STICK_RADIUS, ny = -dy / STICK_RADIUS;
    const m = Math.hypot(nx, ny);
    if (m < DEADZONE) { nx = ny = 0; }
    else {
      // rescale so movement starts smoothly after the deadzone
      const k = Math.min(1, (m - DEADZONE) / (1 - DEADZONE)) / m;
      nx *= k; ny *= k;
    }
    this.input.touchMove.x = nx;
    this.input.touchMove.y = ny;
  }

  endStick() {
    this.base.classList.remove('active');
    this.base.style.left = '';
    this.base.style.top = '';
    this.knob.style.transform = '';
    this.input.touchMove.active = false;
    this.input.touchMove.x = this.input.touchMove.y = 0;
  }

  releaseAll() {
    this.touches.clear();
    this.endStick();
    this.input.touchFire = false;
    this.buttons.fire.classList.remove('pressed');
  }
}
