// Screenshots around the level 1 lobby: node tools/roomshots.mjs [x z yawDeg name]...
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const playwright = require('/opt/node22/lib/node_modules/playwright');
const views = [];
const a = process.argv.slice(2);
for (let i = 0; i + 3 < a.length; i += 4) views.push([+a[i], +a[i + 1], +a[i + 2], a[i + 3]]);
if (!views.length) views.push([15, 73, 0, 'start']);
const browser = await playwright.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 900, height: 520 } })).newPage();
page.on('pageerror', e => console.log('[pageerror] ' + e.stack));
page.on('console', m => { if (m.type() === 'error' && !m.text().includes('ERR_CERT')) console.log(m.text()); });
await page.goto('http://localhost:8080/index.html');
await page.waitForFunction(() => window.game && document.querySelector('[data-act=new]'), null, { timeout: 60000 });
await page.evaluate(() => { const g = window.game; g.newGame('normal'); g.godMode = true; for (const e of g.enemies) { e.sprite.visible = false; e.update = () => {}; } });
await page.waitForTimeout(1200);
for (const [x, z, yaw, name] of views) {
  await page.evaluate(([x, z, yaw]) => { const p = window.game.player; p.x = x; p.z = z; p.yaw = yaw * Math.PI / 180; p.pitch = 0; if (window.game.ally) window.game.ally.sprite.visible = false; }, [x, z, yaw]);
  await page.waitForTimeout(700);
  await page.screenshot({ path: `room-${name}.png` });
}
await browser.close();
