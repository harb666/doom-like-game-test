// Screenshot every first-person gun (for visual checks).
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const playwright = require('/opt/node22/lib/node_modules/playwright');
const browser = await playwright.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 700, height: 330 } })).newPage();
page.on('pageerror', e => console.log('[pageerror] ' + e.stack));
await page.goto('http://localhost:8080/index.html');
await page.waitForTimeout(600);
await page.evaluate(() => { const g = window.game; g.newGame('normal'); g.godMode = true; for (const id of ['scattergun', 'repeater', 'lancer', 'hellbore']) g.weapons.giveWeapon(id, 10); });
for (const id of ['pistol', 'machinegun', 'scattergun', 'repeater', 'lancer', 'hellbore']) {
  await page.evaluate((id) => { const w = window.game.weapons; w.current = id; w.pending = null; w.switchPhase = 'ready'; w.switchT = 0; }, id);
  await page.waitForTimeout(350);
  await page.screenshot({ path: `gun-${id}.png` });
}
await browser.close();
