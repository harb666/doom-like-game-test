// Original procedural music: a tiny step sequencer playing distorted bass riffs,
// synth drums and a lead line. Each level picks a song by name.

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

// Riffs are written as semitone offsets from the song's root note. null = rest.
const SONGS = {
  menu: {
    bpm: 72, root: 33, // A1
    bars: [
      { bass: [0, null, null, null, null, null, null, null, 0, null, null, null, null, null, null, null], pad: [0, 3, 7], drums: { k: 'x...............', s: '................', h: '................' } },
      { bass: [-2, null, null, null, null, null, null, null, -2, null, null, null, null, null, null, null], pad: [-2, 2, 5], drums: { k: 'x...............', s: '................', h: '................' } },
      { bass: [-4, null, null, null, null, null, null, null, -4, null, null, null, null, null, null, null], pad: [-4, 0, 3], drums: { k: 'x...............', s: '................', h: '................' } },
      { bass: [-5, null, null, null, null, null, null, null, -1, null, null, null, null, null, null, null], pad: [-5, -1, 2], drums: { k: 'x.......x.......', s: '................', h: '................' } },
    ],
    lead: [[0, 12, 6], [8, 15, 4], [12, 14, 4], [16, 10, 8], [32, 8, 6], [40, 7, 8], [48, 11, 12]],
  },
  intake: {
    bpm: 138, root: 40, // E2
    bars: [
      { bass: [0, 0, 12, 0, 0, 10, 0, 0, 0, 0, 12, 0, 7, 6, 5, 3], drums: { k: 'x.....x.x.......', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' } },
      { bass: [0, 0, 12, 0, 0, 10, 0, 0, 0, 0, 12, 0, 3, 5, 6, 7], drums: { k: 'x.....x.x.....x.', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' } },
      { bass: [5, 5, 17, 5, 5, 15, 5, 5, 3, 3, 15, 3, 2, 3, 5, 7], drums: { k: 'x.....x.x.......', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' } },
      { bass: [0, 0, 12, 0, 0, 10, 0, 0, -2, -2, 10, -2, -1, -1, 11, -1], drums: { k: 'x.x...x.x.x.....', s: '....x.......x.xx', h: 'x.x.x.x.x.x.x.x.' } },
    ],
    lead: [[32, 24, 3], [35, 22, 3], [38, 19, 4], [42, 17, 2], [44, 19, 4], [48, 24, 8], [56, 23, 8]],
  },
  foundry: {
    bpm: 112, root: 38, // D2
    bars: [
      { bass: [0, null, 0, 0, 1, null, 0, null, 0, null, 0, 0, 3, null, 1, null], drums: { k: 'x..x..x...x.....', s: '........x.......', h: 'x...x...x...x...' } },
      { bass: [0, null, 0, 0, 1, null, 0, null, 5, null, 4, null, 3, null, 1, null], drums: { k: 'x..x..x...x..x..', s: '........x.......', h: 'x...x...x...x...' } },
      { bass: [-2, null, -2, -2, -1, null, -2, null, -2, null, -2, -2, 1, null, -1, null], drums: { k: 'x..x..x...x.....', s: '........x.......', h: 'x...x...x...x...' } },
      { bass: [0, null, 0, 0, 1, null, 0, null, 6, 6, 5, 5, 3, 3, 1, 1], drums: { k: 'x..x..x...x.x.x.', s: '........x...x.xx', h: 'x.x.x.x.x.x.x.x.' } },
    ],
    lead: [[0, 24, 12], [16, 25, 12], [32, 22, 12], [48, 24, 4], [52, 27, 4], [56, 30, 8]],
  },
  boss: {
    bpm: 164, root: 37, // C#2
    bars: [
      { bass: [0, 12, 0, 11, 0, 10, 0, 9, 0, 12, 0, 11, 13, 12, 11, 10], drums: { k: 'x.x.x.x.x.x.x.x.', s: '....x.......x...', h: 'xxxxxxxxxxxxxxxx' } },
      { bass: [0, 12, 0, 11, 0, 10, 0, 9, 1, 13, 1, 12, 3, 15, 3, 14], drums: { k: 'x.x.x.x.x.x.x.x.', s: '....x.......x.x.', h: 'xxxxxxxxxxxxxxxx' } },
    ],
    lead: [[0, 24, 4], [4, 25, 4], [8, 28, 4], [12, 27, 4], [16, 31, 8], [24, 30, 8]],
  },
};

export class Music {
  constructor(audio) {
    this.audio = audio;
    this.ctx = audio.ctx;
    this.out = this.ctx.createGain();
    this.out.connect(audio.musicBus);
    // gentle distortion curve for the bass "guitar"
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) { const x = i / 128 - 1; curve[i] = Math.tanh(x * 4); }
    this.curve = curve;
    this.timer = null;
    this.current = null;
  }

  play(name) {
    if (this.current === name) return;
    this.stop();
    const song = SONGS[name];
    if (!song) return;
    this.current = name;
    this.song = song;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.1;
    this.out.gain.cancelScheduledValues(this.ctx.currentTime);
    this.out.gain.setValueAtTime(1, this.ctx.currentTime);
    this.timer = setInterval(() => this.schedule(), 40);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.current = null;
  }

  schedule() {
    const ctx = this.ctx;
    if (ctx.state !== 'running') { this.nextTime = ctx.currentTime + 0.1; return; }
    const song = this.song, stepDur = 60 / song.bpm / 4;
    if (this.nextTime < ctx.currentTime - 0.3) this.nextTime = ctx.currentTime + 0.05; // skipped (tab hidden)
    while (this.nextTime < ctx.currentTime + 0.18) {
      this.playStep(this.step, this.nextTime, stepDur);
      this.nextTime += stepDur;
      this.step++;
    }
  }

  playStep(step, t, stepDur) {
    const song = this.song;
    const barIdx = Math.floor(step / 16) % song.bars.length;
    const s = step % 16;
    const bar = song.bars[barIdx];
    const b = bar.bass[s];
    if (b !== null && b !== undefined) this.bass(midi(song.root + b), t, stepDur * (song.bpm < 90 ? 7 : 0.9));
    if (bar.pad && s === 0) this.pad(bar.pad.map(n => midi(song.root + 24 + n)), t, stepDur * 16);
    const d = bar.drums;
    if (d.k[s] === 'x') this.kick(t);
    if (d.s[s] === 'x') this.snare(t);
    if (d.h[s] === 'x') this.hat(t);
    // lead line loops over the whole pattern
    const total = song.bars.length * 16;
    const ls = step % total;
    for (const [at, n, len] of song.lead) if (at === ls) this.lead(midi(song.root + n), t, stepDur * len);
  }

  bass(f, t, dur) {
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.32, t + 0.005); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    const sh = ctx.createWaveShaper(); sh.curve = this.curve;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.setValueAtTime(1400, t); lp.frequency.exponentialRampToValueAtTime(500, t + dur);
    for (const [mul, v] of [[1, 1], [1.5, 0.5], [2, 0.3]]) {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f * mul;
      const og = ctx.createGain(); og.gain.value = v;
      o.connect(og); og.connect(sh); o.start(t); o.stop(t + dur + 0.02);
    }
    sh.connect(lp); lp.connect(g); g.connect(this.out);
  }

  pad(freqs, t, dur) {
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.08, t + dur * 0.3); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
    for (const f of freqs) for (const det of [-6, 6]) {
      const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det;
      o.connect(lp); o.start(t); o.stop(t + dur + 0.05);
    }
    lp.connect(g); g.connect(this.out);
  }

  lead(f, t, dur) {
    const ctx = this.ctx;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.07, t + 0.03); g.gain.setValueAtTime(0.07, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = f;
    const l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = 5.5; lg.gain.value = f * 0.012; l.connect(lg); lg.connect(o.frequency);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400;
    o.connect(lp); lp.connect(g); g.connect(this.out);
    o.start(t); o.stop(t + dur + 0.05); l.start(t); l.stop(t + dur + 0.05);
  }

  kick(t) {
    const ctx = this.ctx, o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(0.7, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
    o.connect(g); g.connect(this.out); o.start(t); o.stop(t + 0.22);
  }

  snare(t) {
    const ctx = this.ctx, s = ctx.createBufferSource(); s.buffer = this.audio.noise;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 0.7;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.35, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
    s.connect(f); f.connect(g); g.connect(this.out); s.start(t, Math.random()); s.stop(t + 0.18);
    const o = ctx.createOscillator(), og = ctx.createGain(); o.frequency.value = 190;
    og.gain.setValueAtTime(0.2, t); og.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    o.connect(og); og.connect(this.out); o.start(t); o.stop(t + 0.1);
  }

  hat(t) {
    const ctx = this.ctx, s = ctx.createBufferSource(); s.buffer = this.audio.noise;
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.08, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    s.connect(f); f.connect(g); g.connect(this.out); s.start(t, Math.random()); s.stop(t + 0.05);
  }
}
