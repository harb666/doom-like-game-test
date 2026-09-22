// Saves settings and progress in the browser (localStorage), so closing Safari
// doesn't lose your place. Everything is wrapped in try/catch because private
// browsing can block storage - the game still works, it just won't remember.

import { DEFAULT_SETTINGS } from '../config.js';

const KEY = 'mawbreaker.save.v1';

function read() {
  try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (_) { return {}; }
}
function write(data) {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (_) { /* storage unavailable */ }
}

export const Save = {
  loadSettings() { return { ...DEFAULT_SETTINGS, ...(read().settings || {}) }; },
  saveSettings(settings) { const d = read(); d.settings = settings; write(d); },

  /** Progress = which level you reached plus your health/weapons when you entered it. */
  loadProgress() { return read().progress || null; },
  saveProgress(progress) { const d = read(); d.progress = progress; write(d); },
  clearProgress() { const d = read(); delete d.progress; write(d); },

  loadRecords() { return read().records || {}; },
  saveRecord(levelId, rec) {
    const d = read(); d.records = d.records || {};
    const old = d.records[levelId];
    if (!old || rec.time < old.time) d.records[levelId] = rec;
    write(d);
  },
};
