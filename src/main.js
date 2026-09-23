// Entry point: starts the game and shows any crash on screen
// (handy on iPhone, where there's no developer console).

import { Game } from './core/Game.js';
import { preloadModels } from './models/skinned.js';

const MODEL_NAMES = ['ally', 'husk', 'rifter', 'spitter', 'hound', 'wraith', 'hellmaw', 'ravager', 'warden'];

function showError(msg) {
  const root = document.getElementById('menu-root');
  root.innerHTML = `<div class="menu"><h2>SOMETHING BROKE</h2><div class="help" style="white-space:pre-wrap">${String(msg).replace(/</g, '&lt;')}</div>
    <div class="btns"><button class="mbtn" onclick="location.reload()">RELOAD</button></div></div>`;
}

window.addEventListener('error', (e) => showError(`${e.message}\n${e.filename || ''}:${e.lineno || ''}`));
window.addEventListener('unhandledrejection', (e) => showError(e.reason && (e.reason.stack || e.reason.message) || e.reason));

async function boot() {
  const root = document.getElementById('menu-root');
  root.innerHTML = '<div class="menu"><div class="loading" id="load-msg">LOADING MODELS...</div></div>';
  // sculpted 3D models for the monsters and VEX (the game still runs with simpler ones if these fail)
  await preloadModels(MODEL_NAMES, (f) => { const el = document.getElementById('load-msg'); if (el) el.textContent = `LOADING MODELS... ${Math.round(f * 100)}%`; });
  const game = new Game();
  window.game = game;   // for debugging / automated tests
  game.start();
}

boot().catch((err) => { console.error(err); showError(err.stack || err.message); });
