// Keyboard + mouse controls (desktop), merged into one shared input state
// that the touch controls also write into.

export class Input {
  constructor(game) {
    this.game = game;
    this.moveX = 0;       // -1 left .. 1 right (strafe)
    this.moveY = 0;       // -1 back .. 1 forward
    this.lookX = 0;       // accumulated look deltas (radians) - consumed each frame
    this.lookY = 0;
    this.fire = false;
    this.run = true;
    this.pressed = new Set();   // one-shot actions: use, next, prev, pause, map, slot1..5
    this.keys = new Set();
    this.mouseFire = false;
    this.touchFire = false;
    this.touchMove = { x: 0, y: 0, active: false };
    this.pointerLocked = false;
    this.enabled = false;

    window.addEventListener('keydown', (e) => this.onKey(e, true));
    window.addEventListener('keyup', (e) => this.onKey(e, false));
    window.addEventListener('blur', () => { this.keys.clear(); this.mouseFire = false; });
    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === this.lockTarget;
      if (!this.pointerLocked && this.enabled && !game.touchMode) game.requestPause();
    });
    document.addEventListener('mousemove', (e) => {
      if (!this.pointerLocked) return;
      const s = 0.0022 * game.settings.mouseSensitivity;
      this.lookX -= e.movementX * s;
      this.lookY -= e.movementY * s * (game.settings.invertY ? -1 : 1);
    });
    document.addEventListener('mousedown', (e) => {
      if (!this.enabled || game.touchMode) return;
      if (!this.pointerLocked) { this.lock(); return; }
      if (e.button === 0) this.mouseFire = true;
      if (e.button === 2) this.pressed.add('use');
    });
    document.addEventListener('mouseup', (e) => { if (e.button === 0) this.mouseFire = false; });
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('wheel', (e) => {
      if (!this.enabled) return;
      this.pressed.add(e.deltaY > 0 ? 'next' : 'prev');
    }, { passive: true });
  }

  lock() {
    this.lockTarget = document.getElementById('app');
    if (this.lockTarget.requestPointerLock) {
      try {
        const p = this.lockTarget.requestPointerLock();
        if (p && p.catch) p.catch(() => {});
      } catch (_) { /* not supported */ }
    }
  }
  unlock() { if (document.pointerLockElement && document.exitPointerLock) document.exitPointerLock(); }

  onKey(e, down) {
    const k = e.code;
    if (down) {
      if (!this.keys.has(k)) {
        if (k === 'Escape' || k === 'KeyP') this.pressed.add('pause');
        if (k === 'KeyE' || k === 'Space' || k === 'Enter') this.pressed.add('use');
        if (k === 'Tab' || k === 'KeyM') this.pressed.add('map');
        if (k === 'KeyQ') this.pressed.add('next');
        if (/^Digit[1-9]$/.test(k)) this.pressed.add('slot' + k.slice(5));
      }
      this.keys.add(k);
      if (this.enabled && ['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(k)) e.preventDefault();
    } else this.keys.delete(k);
  }

  /** Called once per frame before the game reads the state. */
  poll(dt) {
    const K = this.keys;
    let mx = 0, my = 0;
    if (K.has('KeyW') || K.has('ArrowUp')) my += 1;
    if (K.has('KeyS') || K.has('ArrowDown')) my -= 1;
    if (K.has('KeyD')) mx += 1;
    if (K.has('KeyA')) mx -= 1;
    if (K.has('ArrowLeft')) this.lookX += 2.6 * dt;
    if (K.has('ArrowRight')) this.lookX -= 2.6 * dt;
    const walk = K.has('ShiftLeft') || K.has('ShiftRight');
    if (walk) { mx *= 0.5; my *= 0.5; }
    const len = Math.hypot(mx, my);
    if (len > 1) { mx /= len; my /= len; }
    if (this.touchMove.active) { mx = this.touchMove.x; my = this.touchMove.y; }
    this.moveX = mx; this.moveY = my;
    this.fire = this.mouseFire || this.touchFire || K.has('ControlLeft') || K.has('KeyF');
  }

  consume(action) {
    if (this.pressed.has(action)) { this.pressed.delete(action); return true; }
    return false;
  }
  takeLook() { const x = this.lookX, y = this.lookY; this.lookX = this.lookY = 0; return [x, y]; }
  clearActions() { this.pressed.clear(); this.lookX = this.lookY = 0; this.mouseFire = false; }
}
