// Sound effects, synthesised live with the Web Audio API (no audio files needed,
// nothing copied). Each sound is a small "recipe" of oscillators and noise.

import { Music } from './Music.js';

// A tiny silent WAV, looped through a normal <audio> element. On iPhone this
// switches the page into "media playback" mode, so game sound still plays
// when the ring/silent switch is set to silent.
function silentWavUrl() {
  const rate = 8000, n = 4000, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  w(36, 'data'); v.setUint32(40, n * 2, true);
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
}

/** A long, dark, cavernous reverb made from decaying noise. */
function makeImpulse(ctx, seconds, decay) {
  const len = Math.floor(ctx.sampleRate * seconds), buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let lp = 0;
    for (let i = 0; i < len; i++) {
      lp += ((Math.random() * 2 - 1) - lp) * 0.35;           // darken the tail
      d[i] = lp * Math.pow(1 - i / len, decay);
    }
  }
  return buf;
}

export class AudioSystem {
  constructor(game) {
    this.game = game;
    this.ctx = null;
    this.recent = new Map();
    this.music = null;
    // Any real tap / click / key press (re)starts audio. iPhones only allow this
    // on "touchend"/"click", not on "touchstart", so listen for those.
    const kick = () => this.unlock();
    for (const ev of ['touchend', 'click', 'keydown', 'pointerup']) document.addEventListener(ev, kick, { capture: true, passive: true });
  }

  /** Must be called from a tap/click - browsers (esp. iPhone) block sound until then. */
  unlock() {
    try {
      if (navigator.audioSession && navigator.audioSession.type !== 'playback') navigator.audioSession.type = 'playback';
    } catch (_) { /* older Safari */ }
    if (!this.mediaEl) {
      try {
        const el = document.createElement('audio');
        el.setAttribute('playsinline', ''); el.setAttribute('x-webkit-airplay', 'deny');
        el.loop = true; el.src = silentWavUrl();
        this.mediaEl = el;
      } catch (_) { /* ignore */ }
    }
    if (this.mediaEl && this.mediaEl.paused) this.mediaEl.play().catch(() => {});
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      const ctx = this.ctx;
      this.master = ctx.createGain();
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14; comp.ratio.value = 6;
      this.master.connect(comp); comp.connect(ctx.destination);
      this.sfx = ctx.createGain(); this.sfx.connect(this.master);
      this.musicBus = ctx.createGain(); this.musicBus.connect(this.master);
      // big echoing reverb shared by sound effects and music (Doom 64 atmosphere)
      this.reverb = ctx.createConvolver();
      this.reverb.buffer = makeImpulse(ctx, 3.2, 2.4);
      this.reverb.connect(this.master);
      this.sfxSend = ctx.createGain(); this.sfxSend.gain.value = 0.35; this.sfx.connect(this.sfxSend); this.sfxSend.connect(this.reverb);
      this.musicSend = ctx.createGain(); this.musicSend.gain.value = 0.8; this.musicBus.connect(this.musicSend); this.musicSend.connect(this.reverb);
      this.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      this.music = new Music(this);
      this.applyVolumes();
      if (this.game.state === 'title') this.music.play('menu');
      // play a silent blip to fully wake the audio hardware on iOS
      const b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource();
      s.buffer = b; s.connect(ctx.destination); s.start(0);
    }
    if (this.ctx.state !== 'running' && !document.hidden) this.ctx.resume().catch?.(() => {});
    this.game.voice?.prime();
  }

  applyVolumes() {
    if (!this.ctx) return;
    const S = this.game.settings;
    this.sfx.gain.value = S.sfxVolume;
    this.musicBus.gain.value = S.musicVolume * 0.9;
  }

  suspend() { if (this.ctx && this.ctx.state === 'running') this.ctx.suspend(); }
  resume() { if (this.ctx && this.ctx.state !== 'running') this.ctx.resume().catch?.(() => {}); }

  play(name, vol = 1, pan = 0, rate = 1) {
    const ctx = this.ctx;
    if (!ctx || vol < 0.02) return;
    if (ctx.state !== 'running') { this.resume(); return; }
    const recipe = SOUNDS[name];
    if (!recipe) return;
    // don't stack the same sound more than a few times per instant
    const now = ctx.currentTime;
    const r = this.recent.get(name) || [];
    const fresh = r.filter(t => now - t < 0.05);
    if (fresh.length >= 3) return;
    fresh.push(now); this.recent.set(name, fresh);

    const out = ctx.createGain();
    out.gain.value = vol;
    let node = out;
    if (pan && ctx.createStereoPanner) {
      const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan));
      out.connect(p); node = p;
    }
    node.connect(this.sfx);
    recipe(new Synth(ctx, out, now, this.noise, rate));
    setTimeout(() => { try { out.disconnect(); node.disconnect(); } catch (_) {} }, 4000);
  }

  /** Play a sound coming from a spot in the world (quieter with distance, panned left/right). */
  playAt(name, x, z, vol = 1) {
    const p = this.game.player;
    if (!p) return this.play(name, vol);
    const dx = x - p.x, dz = z - p.z;
    const d = Math.hypot(dx, dz);
    const v = vol / (1 + d * 0.09);
    // pan from the angle relative to where the player is facing
    const rightX = Math.cos(p.yaw), rightZ = -Math.sin(p.yaw);
    const pan = d > 0.5 ? ((dx * rightX + dz * rightZ) / d) * 0.7 : 0;
    // monster voices are pitched down for a deeper, nastier sound
    const rate = /(Sight|Pain|Death|Idle)$/.test(name) && !name.startsWith('vex') ? 0.8 : 1;
    this.play(name, v, pan, rate);
  }

  startAmbient() {
    if (!this.ctx || this.ambient) return;
    const ctx = this.ctx, g = ctx.createGain();
    g.gain.value = 0;
    g.gain.linearRampToValueAtTime(0.09, ctx.currentTime + 2);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 180; f.Q.value = 3;
    const lfo = ctx.createOscillator(), lg = ctx.createGain();
    lfo.frequency.value = 0.07; lg.gain.value = 90; lfo.connect(lg); lg.connect(f.frequency);
    const oscs = [43.6, 44.1, 65.4].map(fr => { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fr; o.connect(f); o.start(); return o; });
    const n = ctx.createBufferSource(); n.buffer = this.noise; n.loop = true;
    const nf = ctx.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 400; nf.Q.value = 0.6;
    const ng = ctx.createGain(); ng.gain.value = 0.25;
    n.connect(nf); nf.connect(ng); ng.connect(g); n.start();
    f.connect(g); g.connect(this.sfx); lfo.start();
    this.ambient = { g, nodes: [...oscs, n, lfo] };
  }

  stopAmbient() {
    if (!this.ambient) return;
    const { g, nodes } = this.ambient; this.ambient = null;
    const t = this.ctx.currentTime;
    g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0, t + 0.5);
    setTimeout(() => nodes.forEach(n => { try { n.stop(); } catch (_) {} }), 700);
  }
}

/** Helper that builds oscillator / noise voices for one sound. */
class Synth {
  constructor(ctx, out, t, noise, rate) { this.ctx = ctx; this.out = out; this.t = t; this.noiseBuf = noise; this.rate = rate; }

  env(g, at, peak, dur, attack = 0.005) {
    g.gain.setValueAtTime(0.0001, at);
    g.gain.linearRampToValueAtTime(peak, at + attack);
    g.gain.exponentialRampToValueAtTime(0.0005, at + dur);
  }

  tone({ type = 'square', f = 440, f2 = null, dur = 0.2, vol = 0.3, at = 0, attack = 0.005, vib = 0, vibDepth = 0, filter = null, q = 1, filterEnd = null }) {
    const ctx = this.ctx, t = this.t + at;
    const o = ctx.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f * this.rate, t);
    if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2 * this.rate), t + dur);
    const g = ctx.createGain(); this.env(g, t, vol, dur, attack);
    let src = o;
    if (filter) {
      const fl = ctx.createBiquadFilter(); fl.type = 'bandpass'; fl.frequency.setValueAtTime(filter, t); fl.Q.value = q;
      if (filterEnd) fl.frequency.exponentialRampToValueAtTime(filterEnd, t + dur);
      o.connect(fl); src = fl;
    }
    if (vib) {
      const l = ctx.createOscillator(), lg = ctx.createGain();
      l.frequency.value = vib; lg.gain.value = vibDepth || f * 0.05; l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(t + dur + 0.05);
    }
    src.connect(g); g.connect(this.out);
    o.start(t); o.stop(t + dur + 0.05);
  }

  noise({ dur = 0.2, vol = 0.5, at = 0, type = 'lowpass', f = 1000, f2 = null, q = 1, attack = 0.003 }) {
    const ctx = this.ctx, t = this.t + at;
    const s = ctx.createBufferSource(); s.buffer = this.noiseBuf;
    s.playbackRate.value = 0.7 + Math.random() * 0.6;
    const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
    if (f2) fl.frequency.exponentialRampToValueAtTime(Math.max(30, f2), t + dur);
    const g = ctx.createGain(); this.env(g, t, vol, dur, attack);
    s.connect(fl); fl.connect(g); g.connect(this.out);
    s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
  }

  /** Monster voice: buzzy oscillator through a vowel-like filter with wobble. */
  growl(f, f2, dur, formant = 700, vib = 8, vol = 0.45, noiseAmt = 0.2, at = 0) {
    this.tone({ type: 'sawtooth', f, f2, dur, vol, at, attack: 0.03, vib, vibDepth: f * 0.08, filter: formant, q: 3 });
    this.tone({ type: 'square', f: f * 0.5, f2: f2 * 0.5, dur, vol: vol * 0.4, at, attack: 0.03, filter: formant * 0.6, q: 2 });
    if (noiseAmt) this.noise({ dur, vol: noiseAmt, at, type: 'bandpass', f: formant * 1.5, q: 1.5, attack: 0.03 });
  }
}

const rnd = (a, b) => a + Math.random() * (b - a);

const SOUNDS = {
  // ----- weapons -----
  pistol: (s) => { s.noise({ dur: 0.16, vol: 0.9, type: 'bandpass', f: 1700, f2: 400, q: 0.8 }); s.tone({ type: 'sine', f: 150, f2: 45, dur: 0.14, vol: 0.6 }); },
  machinegun: (s) => { s.noise({ dur: 0.11, vol: 0.95, type: 'bandpass', f: rnd(1600, 2000), f2: 500, q: 0.8 }); s.tone({ type: 'sine', f: 130, f2: 45, dur: 0.1, vol: 0.55 }); s.noise({ dur: 0.03, vol: 0.35, type: 'highpass', f: 5000 }); },
  shotgun: (s) => { s.noise({ dur: 0.55, vol: 1.3, type: 'lowpass', f: 3200, f2: 180 }); s.tone({ type: 'sine', f: 95, f2: 30, dur: 0.4, vol: 1.1 }); s.noise({ dur: 0.08, vol: 0.5, type: 'highpass', f: 2600 }); },
  repeater: (s) => { s.noise({ dur: 0.08, vol: 0.7, type: 'bandpass', f: rnd(2400, 3000), f2: 800, q: 0.9 }); s.tone({ type: 'square', f: 240, f2: 80, dur: 0.05, vol: 0.28 }); },
  plasma: (s) => { s.tone({ type: 'sawtooth', f: 1400, f2: 260, dur: 0.16, vol: 0.28 }); s.tone({ type: 'square', f: 500, f2: 1600, dur: 0.07, vol: 0.12 }); },
  rocket: (s) => { s.noise({ dur: 0.55, vol: 0.7, type: 'lowpass', f: 1400, f2: 180, attack: 0.02 }); s.tone({ type: 'sawtooth', f: 140, f2: 50, dur: 0.35, vol: 0.3 }); },
  explosion: (s) => { s.noise({ dur: 1.1, vol: 1.4, type: 'lowpass', f: 1600, f2: 90 }); s.tone({ type: 'sine', f: 80, f2: 22, dur: 0.9, vol: 1.1 }); s.noise({ dur: 0.3, vol: 0.5, type: 'highpass', f: 2000, at: 0.02 }); },
  pump: (s) => { s.noise({ dur: 0.04, vol: 0.5, type: 'highpass', f: 2500 }); s.noise({ dur: 0.05, vol: 0.6, type: 'bandpass', f: 1500, at: 0.13 }); },
  dryfire: (s) => { s.noise({ dur: 0.03, vol: 0.4, type: 'highpass', f: 4000 }); },
  weaponUp: (s) => { s.noise({ dur: 0.06, vol: 0.18, type: 'bandpass', f: 2200, q: 2 }); },
  plasmaHit: (s) => { s.tone({ type: 'square', f: 900, f2: 200, dur: 0.1, vol: 0.12 }); s.noise({ dur: 0.1, vol: 0.2, type: 'highpass', f: 3000 }); },
  acidHit: (s) => { s.noise({ dur: 0.35, vol: 0.35, type: 'highpass', f: 2500, f2: 5000 }); s.tone({ type: 'sine', f: 300, f2: 120, dur: 0.2, vol: 0.2, vib: 30 }); },
  emberHit: (s) => { s.noise({ dur: 0.35, vol: 0.5, type: 'lowpass', f: 1200, f2: 200 }); },

  // ----- items & world -----
  pickup: (s) => { s.tone({ type: 'square', f: 660, dur: 0.06, vol: 0.14 }); s.tone({ type: 'square', f: 990, dur: 0.09, vol: 0.14, at: 0.06 }); },
  pickupArmor: (s) => { [440, 660, 880].forEach((f, i) => s.tone({ type: 'square', f, dur: 0.07, vol: 0.13, at: i * 0.06 })); },
  powerup: (s) => { [330, 440, 554, 660, 880, 1108, 1320].forEach((f, i) => s.tone({ type: 'sawtooth', f, dur: 0.12, vol: 0.12, at: i * 0.05 })); },
  keyPickup: (s) => { [880, 1320, 1760].forEach((f, i) => s.tone({ type: 'triangle', f, dur: 0.12, vol: 0.25, at: i * 0.07 })); },
  weaponPickup: (s) => { [220, 330, 440].forEach(f => s.tone({ type: 'square', f, dur: 0.4, vol: 0.08 })); [440, 554, 660, 880].forEach((f, i) => s.tone({ type: 'square', f, dur: 0.1, vol: 0.1, at: 0.1 + i * 0.06 })); },
  doorOpen: (s) => { s.noise({ dur: 0.7, vol: 0.45, type: 'lowpass', f: 500, f2: 250, attack: 0.05 }); s.tone({ type: 'sawtooth', f: 55, f2: 80, dur: 0.6, vol: 0.12, filter: 300 }); },
  doorClose: (s) => { s.noise({ dur: 0.6, vol: 0.4, type: 'lowpass', f: 350, f2: 200, attack: 0.05 }); s.tone({ type: 'sine', f: 90, f2: 40, dur: 0.2, vol: 0.5, at: 0.5 }); },
  locked: (s) => { s.tone({ type: 'square', f: 150, dur: 0.14, vol: 0.2 }); s.tone({ type: 'square', f: 110, dur: 0.22, vol: 0.2, at: 0.15 }); },
  lift: (s) => { s.tone({ type: 'sawtooth', f: 50, dur: 0.5, vol: 0.18, filter: 250, attack: 0.05 }); s.noise({ dur: 0.5, vol: 0.2, type: 'lowpass', f: 300, attack: 0.05 }); },
  oof: (s) => { s.tone({ type: 'sawtooth', f: 170, f2: 120, dur: 0.16, vol: 0.35, filter: 700, q: 2 }); },
  step: (s) => { s.noise({ dur: 0.07, vol: 0.13, type: 'lowpass', f: rnd(220, 320) }); },
  land: (s) => { s.noise({ dur: 0.13, vol: 0.45, type: 'lowpass', f: 220 }); },
  secret: (s) => { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => s.tone({ type: 'triangle', f, dur: 0.14, vol: 0.22, at: i * 0.09 })); },
  levelDone: (s) => { [262, 330, 392, 523, 392, 523, 659].forEach((f, i) => s.tone({ type: 'square', f, dur: 0.22, vol: 0.12, at: i * 0.12 })); },
  playerPain: (s) => { s.tone({ type: 'sawtooth', f: rnd(210, 240), f2: 150, dur: 0.22, vol: 0.4, filter: 900, q: 3 }); s.noise({ dur: 0.1, vol: 0.2, type: 'bandpass', f: 1200 }); },
  playerDeath: (s) => { s.tone({ type: 'sawtooth', f: 220, f2: 55, dur: 1.1, vol: 0.45, filter: 800, q: 3, vib: 6 }); s.noise({ dur: 0.5, vol: 0.3, type: 'lowpass', f: 800 }); },

  // ----- VEX (female companion) : breathy vowel-shaped efforts -----
  vexHup: (s) => { const f = rnd(250, 290); s.tone({ type: 'sawtooth', f, f2: f * 0.85, dur: 0.14, vol: 0.2, attack: 0.02, filter: 900, q: 4 }); s.tone({ type: 'triangle', f, f2: f * 0.85, dur: 0.14, vol: 0.14, attack: 0.02 }); s.noise({ dur: 0.12, vol: 0.12, type: 'bandpass', f: 2600, q: 2, attack: 0.01 }); },
  vexLaugh: (s) => { for (let i = 0; i < 3; i++) { const f = 330 - i * 20; s.tone({ type: 'sawtooth', f, f2: f * 0.9, dur: 0.1, vol: 0.16, at: i * 0.13, attack: 0.015, filter: 1000, q: 4 }); s.tone({ type: 'triangle', f, dur: 0.1, vol: 0.1, at: i * 0.13 }); s.noise({ dur: 0.08, vol: 0.1, type: 'bandpass', f: 2800, q: 2, at: i * 0.13 }); } },

  // ----- monsters -----
  claw: (s) => { s.noise({ dur: 0.15, vol: 0.5, type: 'bandpass', f: 3500, f2: 900, q: 2 }); },
  bite: (s) => { s.noise({ dur: 0.1, vol: 0.6, type: 'lowpass', f: 1200 }); s.tone({ type: 'square', f: 130, f2: 60, dur: 0.12, vol: 0.3 }); },
  enemyRifle: (s) => { s.noise({ dur: 0.09, vol: 0.5, type: 'bandpass', f: 1500, f2: 500, q: 0.8 }); s.tone({ type: 'square', f: 160, f2: 60, dur: 0.06, vol: 0.18 }); },
  spit: (s) => { s.noise({ dur: 0.25, vol: 0.4, type: 'bandpass', f: 800, q: 2 }); s.tone({ type: 'sine', f: 320, f2: 140, dur: 0.25, vol: 0.3, vib: 25, vibDepth: 40 }); },
  fireball: (s) => { s.noise({ dur: 0.5, vol: 0.55, type: 'lowpass', f: 1800, f2: 350, attack: 0.04 }); },

  huskSight: (s) => s.growl(rnd(85, 100), 65, 0.8, 600, 7, 0.5),
  huskPain: (s) => s.growl(150, 100, 0.25, 800, 12, 0.4),
  huskDeath: (s) => s.growl(120, 38, 1.0, 500, 5, 0.5, 0.3),
  huskIdle: (s) => s.growl(75, 70, 0.6, 450, 4, 0.25, 0.1),
  rifterSight: (s) => { s.tone({ type: 'square', f: 420, dur: 0.08, vol: 0.15 }); s.growl(160, 120, 0.4, 1100, 18, 0.35, 0.3, 0.08); s.noise({ dur: 0.35, vol: 0.2, type: 'bandpass', f: 2200, at: 0.05 }); },
  rifterPain: (s) => s.growl(190, 150, 0.2, 1000, 20, 0.35),
  rifterDeath: (s) => { s.growl(170, 50, 0.8, 900, 10, 0.45, 0.25); s.noise({ dur: 0.4, vol: 0.2, type: 'bandpass', f: 2500, at: 0.3 }); },
  rifterIdle: (s) => { s.noise({ dur: 0.35, vol: 0.18, type: 'bandpass', f: 2200, q: 3 }); s.tone({ type: 'square', f: 380, dur: 0.05, vol: 0.08, at: 0.3 }); },
  spitterSight: (s) => s.growl(60, 55, 0.9, 380, 16, 0.55, 0.3),
  spitterPain: (s) => s.growl(90, 70, 0.3, 450, 22, 0.45, 0.3),
  spitterDeath: (s) => { s.growl(80, 30, 1.0, 350, 12, 0.5, 0.3); s.noise({ dur: 0.5, vol: 0.35, type: 'lowpass', f: 700, at: 0.3 }); },
  spitterIdle: (s) => s.growl(55, 50, 0.7, 300, 20, 0.3, 0.2),
  houndSight: (s) => { s.growl(230, 130, 0.22, 900, 10, 0.5, 0.35); s.growl(210, 120, 0.25, 900, 10, 0.5, 0.35, 0.25); },
  houndPain: (s) => s.growl(420, 300, 0.2, 1400, 14, 0.4),
  houndDeath: (s) => s.growl(340, 70, 1.1, 1000, 6, 0.5, 0.2),
  houndIdle: (s) => s.growl(95, 85, 0.6, 500, 30, 0.3, 0.3),
  wraithSight: (s) => s.growl(700, 950, 0.9, 1600, 22, 0.35, 0.4),
  wraithPain: (s) => s.growl(800, 600, 0.25, 1800, 30, 0.3, 0.3),
  wraithDeath: (s) => s.growl(900, 90, 1.4, 1400, 12, 0.4, 0.4),
  wraithIdle: (s) => { s.noise({ dur: 0.9, vol: 0.2, type: 'bandpass', f: 2800, f2: 1500, q: 4, attack: 0.3 }); },
  wardenSight: (s) => { s.growl(55, 38, 1.8, 320, 6, 0.8, 0.5); s.tone({ type: 'sine', f: 40, f2: 30, dur: 1.6, vol: 0.6 }); },
  wardenPain: (s) => s.growl(80, 60, 0.4, 380, 8, 0.6, 0.3),
  wardenDeath: (s) => { s.growl(70, 25, 2.8, 300, 4, 0.8, 0.5); s.noise({ dur: 2.5, vol: 0.6, type: 'lowpass', f: 600, f2: 80, at: 0.4 }); },
  wardenIdle: (s) => s.growl(45, 42, 0.9, 260, 5, 0.4, 0.3),
};
