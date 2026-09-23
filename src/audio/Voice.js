// VEX's spoken callouts, using the phone/computer's built-in female
// text-to-speech voice (no audio files). Lines are rate-limited so she
// doesn't talk over herself.

const LINES = {
  start: ["Let's clear this place out.", "Stay sharp. I've got your back.", "Right behind you.", "Let's go hunting."],
  contact: ['Contact!', 'Hostiles!', 'Here they come!', 'Movement ahead!', 'Eyes up!'],
  kill: ['Got one!', 'Down you go.', "That's one less.", 'Too easy.', 'Stay down!', 'Nailed it.'],
  boss: ['What is that thing?!', 'Big one! Hit it with everything!'],
  hurt: ["You're hurt! Grab a med patch.", 'Careful, you are bleeding!', 'Watch yourself!'],
  catchup: ['Wait up!', "Don't leave me behind!", 'Coming!'],
  weapon: ['Nice gun!', 'Ooh, now we are talking.'],
  secret: ['Ooh, a secret!', 'Sneaky. I like it.'],
};

// Well-known female system voices on iPhone, Mac, Windows and Android/Chrome.
const PREFERRED = ['Samantha', 'Karen', 'Moira', 'Tessa', 'Fiona', 'Victoria', 'Serena', 'Kate', 'Martha', 'Ava', 'Allison', 'Susan',
  'Nicky', 'Zira', 'Hazel', 'Libby', 'Sonia', 'Aria', 'Jenny', 'Google UK English Female', 'Google US English', 'female'];

export class Voice {
  constructor(game) {
    this.game = game;
    this.ok = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
    this.voice = null;
    this.nextT = 0;
    this.primed = false;
    if (this.ok) {
      this.pick();
      try { speechSynthesis.addEventListener('voiceschanged', () => this.pick()); } catch (_) { /* old browsers */ }
    }
  }

  pick() {
    const voices = speechSynthesis.getVoices().filter(v => /^en/i.test(v.lang));
    for (const name of PREFERRED) {
      const v = voices.find(v => v.name.toLowerCase().includes(name.toLowerCase()));
      if (v) { this.voice = v; return; }
    }
    this.voice = voices[0] || null;
  }

  /** iPhones only allow speech after it has been started once from a tap. */
  prime() {
    if (!this.ok || this.primed) return;
    this.primed = true;
    try { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); } catch (_) { /* ignore */ }
  }

  say(kind, { force = false, gap = [5, 9] } = {}) {
    const g = this.game;
    if (!this.ok || !g.settings.allyVoice || g.settings.sfxVolume <= 0) return;
    if (!force && g.time < this.nextT) return;
    const list = LINES[kind];
    if (!list) return;
    try {
      if (force) speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(list[Math.floor(Math.random() * list.length)]);
      if (this.voice) { u.voice = this.voice; u.lang = this.voice.lang; } else u.lang = 'en-GB';
      u.pitch = 1.15; u.rate = 1.08;
      u.volume = Math.min(1, g.settings.sfxVolume * 1.1);
      speechSynthesis.speak(u);
      this.nextT = g.time + gap[0] + Math.random() * (gap[1] - gap[0]);
    } catch (_) { /* speech unavailable */ }
  }

  stop() { if (this.ok) try { speechSynthesis.cancel(); } catch (_) { /* ignore */ } }
}
