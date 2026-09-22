// Automated smoke test: opens the game in headless Chromium, starts a new game,
// simulates some play and reports any errors. Run: node tools/smoke-test.mjs
// (needs a local server on :8080, e.g. `npx http-server -p 8080 .`)
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch { playwright = require('/opt/node22/lib/node_modules/playwright'); }

const URL = process.env.GAME_URL || 'http://localhost:8080/index.html';
const OUT = process.env.OUT_DIR || '.';
const mobile = process.argv.includes('--mobile');

const browser = await playwright.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const context = await browser.newContext(mobile
  ? { viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' }
  : { viewport: { width: 1280, height: 720 } });
const page = await context.newPage();
const errors = [];
page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`[${m.type()}] ${m.text()}`); });
page.on('pageerror', e => errors.push('[pageerror] ' + e.stack));
await page.goto(URL);
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/shot-title.png` });
await page.click('[data-act=new]');
await page.click('[data-act=normal]');
await page.waitForTimeout(2500);
await page.screenshot({ path: `${OUT}/shot-start.png` });
const info = await page.evaluate(() => {
  const g = window.game;
  return { state: g.state, enemies: g.enemies.length, items: g.pickups.items.length, player: [g.player.x, g.player.y, g.player.z], fps: g.fps };
});
console.log('INFO', JSON.stringify(info));
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'NO ERRORS');
await browser.close();
