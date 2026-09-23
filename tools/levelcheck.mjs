// Loads every level in the browser, checks it parses/builds, and verifies
// the exit can be reached (following keys) using the game's own collision rules.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const playwright = require('/opt/node22/lib/node_modules/playwright');
const OUT = process.env.OUT_DIR || '.';
const browser = await playwright.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 900, height: 420 } })).newPage();
const errors = [];
page.on('pageerror', e => errors.push('[pageerror] ' + e.stack));
await page.goto('http://localhost:8080/index.html');
await page.waitForFunction(() => window.game && document.querySelector('[data-act=new]'), null, { timeout: 30000 });
await page.waitForTimeout(800);
const res = await page.evaluate(async () => {
  const { LEVELS } = await import('./src/world/levels/index.js');
  const g = window.game; const out = [];
  for (let i = 0; i < LEVELS.length; i++) {
    g.newGame('normal'); if (i) g.startLevel(i);
    const L = g.level;
    // flood fill walking (step 0.8, lifts count as passable both levels), collecting keys
    const keys = new Set(); let reach;
    const keyItems = g.pickups.items.filter(it => it.type.startsWith('key_'));
    for (let round = 0; round < 5; round++) {
      reach = new Set();
      const start = L.cellAt(L.playerStart.x, L.playerStart.z); const q = [start]; reach.add(start);
      while (q.length) {
        const c = q.pop();
        for (const n of L.neighbours(c)) {
          if (n.solid || reach.has(n)) continue;
          if (n.door && n.door.key && !keys.has(n.door.key)) continue;
          const fa = c.lift ? c.lift.high : c.floor, fb = n.floor, fa2 = c.floor;
          const fbHigh = n.lift ? n.lift.low : fb;
          if (Math.min(fbHigh, fb) - Math.max(fa, fa2) > 0.8 && !(n.lift)) continue;
          reach.add(n); q.push(n);
        }
      }
      for (const k of keyItems) if (reach.has(L.cellAt(k.x, k.z))) keys.add(k.type.slice(4));
    }
    const exits = L.cells.filter(c => c.exit);
    const unreachableItems = g.pickups.items.filter(it => !reach.has(L.cellAt(it.x, it.z))).map(it => it.type);
    const unreachableEnemies = g.enemies.filter(e => !reach.has(L.cellAt(e.x, e.z))).map(e => e.type);
    out.push({ level: L.def.id, size: `${L.w}x${L.h}`, enemies: g.enemies.length, items: g.pickups.items.length, secrets: L.secretsTotal,
      keys: [...keys], exitReachable: exits.some(c => reach.has(c)), unreachableItems, unreachableEnemies });
  }
  return out;
});
for (const r of res) console.log(JSON.stringify(r));
console.log(errors.length ? errors.join('\n') : 'NO ERRORS');
await browser.close();
