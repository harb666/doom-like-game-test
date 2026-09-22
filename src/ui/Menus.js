// All menu screens: title, difficulty, settings, help, pause, level complete,
// game over and victory. Built as simple HTML so they're crisp on any screen.

import { DIFFICULTY, IS_TOUCH } from '../config.js';

function fmtTime(s) {
  s = Math.floor(s);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export class Menus {
  constructor(game) {
    this.game = game;
    this.root = document.getElementById('menu-root');
    this.current = null;
    this.back = null;
  }

  close() { this.root.innerHTML = ''; this.current = null; }
  get open() { return this.current !== null; }

  render(name, html, bind) {
    this.current = name;
    this.root.innerHTML = `<div class="menu ${name}">${html}</div>`;
    const menu = this.root.firstElementChild;
    menu.querySelectorAll('[data-act]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        this.game.audio.unlock();
        this.game.audio.play('weaponUp');
        bind[btn.dataset.act]?.(btn);
      });
    });
    return menu;
  }

  title() {
    const g = this.game;
    const prog = g.progressInfo();
    this.render('title-screen', `
      <h1>MAWBREAKER</h1>
      <div class="subtitle">THE EREBUS COLONY HAS FALLEN SILENT.<br>SOMETHING CAME UP FROM THE DEEP SHAFTS.</div>
      <div class="btns">
        ${prog ? `<button class="mbtn" data-act="cont">CONTINUE · ${prog}</button>` : ''}
        <button class="mbtn" data-act="new">NEW GAME</button>
        <button class="mbtn" data-act="settings">SETTINGS</button>
        <button class="mbtn" data-act="help">HOW TO PLAY</button>
      </div>
      <div class="footer">${IS_TOUCH ? 'TIP: Share &rarr; "Add to Home Screen" for full-screen play' : 'WASD move · Mouse aim · Click fire · E use'}</div>
    `, {
      cont: () => g.continueGame(),
      new: () => this.difficulty(),
      settings: () => this.settings(() => this.title()),
      help: () => this.help(() => this.title()),
    });
    g.audio.music?.play('menu');
  }

  difficulty() {
    this.render('difficulty', `
      <h2>CHOOSE YOUR FATE</h2>
      <div class="btns">
        <button class="mbtn" data-act="easy">EASY · I BRUISE LIKE A PEACH</button>
        <button class="mbtn" data-act="normal">NORMAL · BRING IT ON</button>
        <button class="mbtn" data-act="hard">HARD · MAWBREAKER</button>
        <button class="mbtn" data-act="back">BACK</button>
      </div>
    `, {
      easy: () => this.game.newGame('easy'),
      normal: () => this.game.newGame('normal'),
      hard: () => this.game.newGame('hard'),
      back: () => this.title(),
    });
  }

  help(onBack) {
    const touch = `
      <b>TOUCH CONTROLS</b><br>
      LEFT THUMB: drag anywhere on the left side to move.<br>
      RIGHT THUMB: drag on the right side to look around.<br>
      FIRE: hold to shoot - you can drag on it to aim at the same time.<br>
      USE: open doors, work lifts, find secret walls.<br>
      WPN (or tap the weapon box): switch weapon. MAP: toggle the map. II: pause.<br><br>`;
    const keys = `
      <b>KEYBOARD &amp; MOUSE</b><br>
      WASD / ARROWS move · MOUSE look · CLICK fire · E / SPACE use<br>
      1-5 or Q / WHEEL switch weapon · TAB / M map · ESC pause · SHIFT walk<br><br>`;
    this.render('help', `
      <h2>HOW TO PLAY</h2>
      <div class="help">
        ${IS_TOUCH ? touch + keys : keys + touch}
        <b>SURVIVAL</b><br>
        Find the exit pad in each sector. Coloured doors need the matching keycard.
        Toxic canisters explode when shot - use them on crowds. Some walls hide secrets:
        look for odd-looking panels and press USE.
      </div>
      <div class="btns"><button class="mbtn" data-act="back">BACK</button></div>
    `, { back: onBack });
  }

  settings(onBack) {
    const g = this.game, S = g.settings;
    const slider = (key, label, min, max, step) =>
      `<div class="setting"><span>${label}</span><input type="range" data-key="${key}" min="${min}" max="${max}" step="${step}" value="${S[key]}"></div>`;
    const toggle = (key, label) =>
      `<div class="setting"><span>${label}</span><button class="toggle ${S[key] ? 'on' : ''}" data-toggle="${key}">${S[key] ? 'ON' : 'OFF'}</button></div>`;
    const qual = ['auto', 'low', 'medium', 'high'];
    const menu = this.render('settings', `
      <h2>SETTINGS</h2>
      <div class="settings">
        ${slider('lookSensitivity', 'TOUCH LOOK SPEED', 0.3, 2.5, 0.05)}
        ${slider('mouseSensitivity', 'MOUSE SPEED', 0.2, 3, 0.05)}
        ${slider('musicVolume', 'MUSIC VOLUME', 0, 1, 0.05)}
        ${slider('sfxVolume', 'SOUND VOLUME', 0, 1, 0.05)}
        <div class="setting"><span>GRAPHICS</span><button class="toggle on" data-cycle="quality">${S.quality.toUpperCase()}</button></div>
        ${toggle('aimAssist', 'AIM ASSIST')}
        ${toggle('verticalLook', 'LOOK UP / DOWN')}
        ${toggle('invertY', 'INVERT LOOK')}
        ${toggle('autoOpenDoors', 'AUTO-OPEN DOORS')}
        ${toggle('headBob', 'HEAD BOB')}
        ${toggle('screenShake', 'SCREEN SHAKE')}
        ${toggle('showFps', 'SHOW FPS')}
      </div>
      <div class="btns"><button class="mbtn" data-act="back">BACK</button></div>
    `, { back: () => { g.saveSettings(); onBack(); } });
    menu.querySelectorAll('input[type=range]').forEach(inp => {
      inp.addEventListener('input', () => { S[inp.dataset.key] = parseFloat(inp.value); g.applySettings(); });
    });
    menu.querySelectorAll('[data-toggle]').forEach(btn => {
      btn.addEventListener('click', () => {
        const k = btn.dataset.toggle; S[k] = !S[k];
        btn.classList.toggle('on', S[k]); btn.textContent = S[k] ? 'ON' : 'OFF';
        g.applySettings();
      });
    });
    const q = menu.querySelector('[data-cycle]');
    q.addEventListener('click', () => {
      S.quality = qual[(qual.indexOf(S.quality) + 1) % qual.length];
      q.textContent = S.quality.toUpperCase();
      g.applySettings();
    });
  }

  pause() {
    const g = this.game;
    this.render('pause', `
      <h2>PAUSED</h2>
      <div class="subtitle">${g.levelDef.name.toUpperCase()} · ${DIFFICULTY[g.difficultyKey].label.toUpperCase()}</div>
      <div class="btns">
        <button class="mbtn" data-act="resume">RESUME</button>
        <button class="mbtn" data-act="restart">RESTART LEVEL</button>
        <button class="mbtn" data-act="settings">SETTINGS</button>
        <button class="mbtn" data-act="help">CONTROLS</button>
        <button class="mbtn" data-act="quit">QUIT TO TITLE</button>
      </div>
    `, {
      resume: () => g.resume(),
      restart: () => g.restartLevel(),
      settings: () => this.settings(() => this.pause()),
      help: () => this.help(() => this.pause()),
      quit: () => g.quitToTitle(),
    });
  }

  levelComplete(stats, isLast) {
    const g = this.game;
    const pct = (a, b) => b ? Math.round(a / b * 100) + '%' : '-';
    this.render('complete', `
      <h2>${g.levelDef.name.toUpperCase()} CLEARED</h2>
      <div class="stats">
        KILLS <span>${pct(stats.kills, stats.killsTotal)}</span><br>
        ITEMS <span>${pct(stats.items, stats.itemsTotal)}</span><br>
        SECRETS <span>${pct(stats.secrets, stats.secretsTotal)}</span><br>
        TIME <span>${fmtTime(stats.time)}</span><br>
        PAR <span>${fmtTime(g.levelDef.parTime || 0)}</span>
      </div>
      <div class="btns">
        <button class="mbtn" data-act="next">${isLast ? 'CONTINUE' : 'NEXT SECTOR'}</button>
      </div>
    `, { next: () => g.nextLevel() });
  }

  gameOver() {
    const g = this.game;
    this.render('gameover', `
      <h1>YOU DIED</h1>
      <div class="subtitle">THE MAW CLAIMS ANOTHER.</div>
      <div class="btns">
        <button class="mbtn" data-act="retry">TRY AGAIN</button>
        <button class="mbtn" data-act="quit">QUIT TO TITLE</button>
      </div>
    `, { retry: () => g.restartLevel(), quit: () => g.quitToTitle() });
  }

  victory(totals) {
    const g = this.game;
    this.render('victory', `
      <h1>VICTORY</h1>
      <div class="subtitle">THE MAW IS SEALED... FOR NOW.<br>THANKS FOR PLAYING THIS BUILD OF MAWBREAKER.</div>
      <div class="stats">
        TOTAL KILLS <span>${totals.kills}</span><br>
        SECRETS FOUND <span>${totals.secrets}</span><br>
        TOTAL TIME <span>${fmtTime(totals.time)}</span>
      </div>
      <div class="btns"><button class="mbtn" data-act="title">TITLE SCREEN</button></div>
    `, { title: () => g.quitToTitle() });
  }

  loading(text = 'LOADING...') {
    this.render('loading', `<div class="loading">${text}</div>`, {});
  }

  error(msg) {
    this.render('error', `<h2>SOMETHING BROKE</h2><div class="help">${msg}</div>
      <div class="btns"><button class="mbtn" data-act="reload">RELOAD</button></div>`, { reload: () => location.reload() });
  }
}
