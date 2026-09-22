// Dark ambient horror music (in the spirit of Doom 64's soundtrack), generated
// live: droning pads, ghostly choir chords, reversed swells, distant metallic
// clangs, heartbeats, whispers and deep booms, all in a cavernous reverb.
// Nothing is pre-recorded, so it never loops the same way twice.

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
const rnd = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];

// Each mood: root note, a dark scale, how often each layer plays, heartbeat speed.
const MOODS = {
  menu:    { root: 33, scale: [0, 1, 3, 5, 7, 8, 10], choir: [9, 15], clang: [8, 16], swell: [14, 24], whisper: [10, 20], boom: [20, 34], heart: 0,    drone: 0.9 },
  intake:  { root: 36, scale: [0, 1, 3, 6, 7, 8, 11], choir: [10, 18], clang: [6, 14], swell: [12, 22], whisper: [9, 18], boom: [18, 30], heart: 0,    drone: 1.0 },
  foundry: { root: 31, scale: [0, 1, 4, 5, 7, 8, 10], choir: [9, 16], clang: [4, 10], swell: [12, 20], whisper: [12, 22], boom: [14, 24], heart: 1.25, drone: 1.1 },
  boss:    { root: 30, scale: [0, 1, 3, 6, 7, 9, 10], choir: [6, 10], clang: [3, 7], swell: [8, 14], whisper: [8, 14], boom: [8, 14], heart: 0.72, drone: 1.25 },
};

export class Music {
  constructor(audio) {
    this.audio = audio;
    this.ctx = audio.ctx;
    this.out = this.ctx.createGain();
    this.out.connect(audio.musicBus);
    this.timer = null;
    this.current = null;
    this.voices = [];
  }

  play(name) {
    if (this.current === name) return;
    this.stop();
    const mood = MOODS[name] || MOODS.intake;
    this.current = name;
    this.mood = mood;
    const t = this.ctx.currentTime;
    this.out.gain.cancelScheduledValues(t);
    this.out.gain.setValueAtTime(0.0001, t);
    this.out.gain.linearRampToValueAtTime(1, t + 3);
    this.startDrone(mood);
    this.next = { choir: t + 1.5, clang: t + rnd(3, 6), swell: t + rnd(6, 10), whisper: t + rnd(5, 9), boom: t + rnd(8, 14), heart: t + 2 };
    this.timer = setInterval(() => this.tick(), 100);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.current = null;
    const t = this.ctx.currentTime;
    for (const v of this.voices) {
      try { v.g.gain.cancelScheduledValues(t); v.g.gain.setValueAtTime(v.g.gain.value, t); v.g.gain.linearRampToValueAtTime(0, t + 1.5); } catch (_) { /* ignore */ }
      setTimeout(() => v.nodes.forEach(n => { try { n.stop(); } catch (_) { /* already stopped */ } }), 1700);
    }
    this.voices = [];
  }

  tick() {
    const ctx = this.ctx;
    if (ctx.state !== 'running') return;
    const t = ctx.currentTime, m = this.mood, n = this.next;
    const due = (k) => n[k] <= t + 0.2;
    if (due('choir')) { this.choir(n.choir); n.choir += rnd(...m.choir); }
    if (due('clang')) { this.clang(n.clang); n.clang += rnd(...m.clang); }
    if (due('swell')) { this.swell(n.swell); n.swell += rnd(...m.swell); }
    if (due('whisper')) { this.whisper(n.whisper); n.whisper += rnd(...m.whisper); }
    if (due('boom')) { this.boom(n.boom); n.boom += rnd(...m.boom); }
    if (m.heart && due('heart')) { this.heartbeat(n.heart); n.heart += m.heart; }
    // don't fall far behind if the tab was hidden
    for (const k in n) if (n[k] < t - 2) n[k] = t + 0.5;
  }

  note(i, oct = 0) { const m = this.mood; return midi(m.root + m.scale[((i % m.scale.length) + m.scale.length) % m.scale.length] + 12 * (oct + Math.floor(i / m.scale.length))); }

  // ---------------------------------------------------------------- layers
  /** Endless low drone: detuned saws + sub, with a slowly breathing filter. */
  startDrone(m) {
    const ctx = this.ctx, t = ctx.currentTime;
    const g = ctx.createGain(); g.gain.value = 0.16 * m.drone;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 260; lp.Q.value = 4;
    const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 0.045; lg.gain.value = 180;
    lfo.connect(lg); lg.connect(lp.frequency);
    const nodes = [lfo];
    const f = midi(m.root);
    for (const [mul, det, type, v] of [[1, -7, 'sawtooth', 1], [1, 6, 'sawtooth', 1], [0.5, 0, 'sine', 1.6], [1.5, 3, 'sawtooth', 0.35], [1.0595, 0, 'sine', 0.25]]) {
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = f * mul; o.detune.value = det;
      const og = ctx.createGain(); og.gain.value = v * 0.3;
      o.connect(og); og.connect(lp); o.start(t); nodes.push(o);
    }
    // slow tremolo on the dissonant voice
    lp.connect(g); g.connect(this.out); lfo.start(t);
    this.voices.push({ g, nodes });
  }

  /** Ghostly choir: 3-note cluster through vowel formant filters, slow swell. */
  choir(t) {
    const ctx = this.ctx, dur = rnd(6, 10);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.07, t + dur * 0.4); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    const f1 = ctx.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = pick([650, 700, 400]); f1.Q.value = 6;
    const f2 = ctx.createBiquadFilter(); f2.type = 'bandpass'; f2.frequency.value = pick([1080, 1150, 800]); f2.Q.value = 7;
    const base = Math.floor(rnd(0, 7));
    const chord = [base, base + pick([1, 2]), base + pick([3, 4])];
    for (const i of chord) for (const det of [-9, 9]) {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = this.note(i, 2); o.detune.value = det;
      const vib = ctx.createOscillator(), vg = ctx.createGain(); vib.frequency.value = rnd(4.5, 5.5); vg.gain.value = 4;
      vib.connect(vg); vg.connect(o.detune);
      o.connect(f1); o.connect(f2);
      o.start(t); o.stop(t + dur + 0.1); vib.start(t); vib.stop(t + dur + 0.1);
    }
    f1.connect(g); f2.connect(g); g.connect(this.out);
  }

  /** Distant inharmonic metal clang / bell (FM synthesis), long decay. */
  clang(t) {
    const ctx = this.ctx;
    const f = this.note(Math.floor(rnd(0, 7)), pick([1, 2]));
    const car = ctx.createOscillator(), mod = ctx.createOscillator(), mg = ctx.createGain();
    car.frequency.value = f; mod.frequency.value = f * pick([1.41, 2.76, 3.14]);
    mg.gain.setValueAtTime(f * 3, t); mg.gain.exponentialRampToValueAtTime(f * 0.1, t + 3);
    mod.connect(mg); mg.connect(car.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.09, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0005, t + 4.5);
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    car.connect(g);
    if (pan) { pan.pan.value = rnd(-0.8, 0.8); g.connect(pan); pan.connect(this.out); } else g.connect(this.out);
    car.start(t); mod.start(t); car.stop(t + 4.6); mod.stop(t + 4.6);
  }

  /** "Reversed" swell: grows louder then cuts off abruptly. */
  swell(t) {
    const ctx = this.ctx, dur = rnd(2.2, 3.5);
    const s = ctx.createBufferSource(); s.buffer = this.audio.noise; s.loop = true;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.setValueAtTime(300, t); bp.frequency.exponentialRampToValueAtTime(2400, t + dur); bp.Q.value = 2;
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = this.note(Math.floor(rnd(0, 7)), 1);
    const og = ctx.createGain(); og.gain.value = 0.25;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.12, t + dur); g.gain.linearRampToValueAtTime(0, t + dur + 0.05);
    s.connect(bp); o.connect(og); og.connect(bp); bp.connect(g); g.connect(this.out);
    s.start(t); s.stop(t + dur + 0.1); o.start(t); o.stop(t + dur + 0.1);
  }

  /** Breathy whispers panned around you. */
  whisper(t) {
    const ctx = this.ctx, dur = rnd(1.2, 2.4);
    const s = ctx.createBufferSource(); s.buffer = this.audio.noise;
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = rnd(1800, 3500); bp.Q.value = 5;
    const am = ctx.createOscillator(), ag = ctx.createGain(); am.frequency.value = rnd(5, 11); ag.gain.value = 0.03;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.035, t + dur * 0.3); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    am.connect(ag); ag.connect(g.gain);
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    s.connect(bp); bp.connect(g);
    if (pan) { pan.pan.value = pick([-0.9, 0.9, -0.5, 0.5]); g.connect(pan); pan.connect(this.out); } else g.connect(this.out);
    s.start(t, rnd(0, 1)); s.stop(t + dur + 0.1); am.start(t); am.stop(t + dur + 0.1);
  }

  /** Deep sub-bass impact, like something huge moving far away. */
  boom(t) {
    const ctx = this.ctx;
    const o = ctx.createOscillator(); o.type = 'sine';
    o.frequency.setValueAtTime(60, t); o.frequency.exponentialRampToValueAtTime(24, t + 2.5);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.4, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0005, t + 3);
    const s = ctx.createBufferSource(); s.buffer = this.audio.noise;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 180;
    const ng = ctx.createGain(); ng.gain.setValueAtTime(0.2, t); ng.gain.exponentialRampToValueAtTime(0.0005, t + 1.5);
    o.connect(g); g.connect(this.out); s.connect(lp); lp.connect(ng); ng.connect(this.out);
    o.start(t); o.stop(t + 3.1); s.start(t); s.stop(t + 1.6);
  }

  /** Low double-thump heartbeat. */
  heartbeat(t) {
    const ctx = this.ctx;
    for (const [dt, v] of [[0, 0.38], [0.16, 0.26]]) {
      const o = ctx.createOscillator(); o.frequency.setValueAtTime(62, t + dt); o.frequency.exponentialRampToValueAtTime(38, t + dt + 0.14);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t + dt); g.gain.linearRampToValueAtTime(v, t + dt + 0.01); g.gain.exponentialRampToValueAtTime(0.0005, t + dt + 0.22);
      o.connect(g); g.connect(this.out); o.start(t + dt); o.stop(t + dt + 0.25);
    }
  }
}
