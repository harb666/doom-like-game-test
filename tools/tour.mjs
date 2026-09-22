// Takes screenshots from several spots in level 1 for visual checks.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const playwright = require('/opt/node22/lib/node_modules/playwright');
const OUT = process.env.OUT_DIR || '.';
const browser = await playwright.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 1000, height: 460 } })).newPage();
const errors = [];
page.on('pageerror', e => errors.push('[pageerror] ' + e.stack));
page.on('console', m => { if (m.type() === 'error' && !m.text().includes('ERR_CERT')) errors.push(m.text()); });
await page.goto('http://localhost:8080/index.html');
await page.waitForTimeout(800);
await page.click('[data-act=new]'); await page.click('[data-act=normal]');
await page.waitForTimeout(800);
const spots = JSON.parse(process.argv[2] || '[]');
for (const [name, cx, cz, deg, pitch] of spots) {
  await page.evaluate(([cx, cz, deg, pitch]) => {
    const g = window.game; g.godMode = true;
    g.player.x = (cx + 0.5) * 2; g.player.z = (cz + 0.5) * 2; g.player.yaw = deg * Math.PI / 180; g.player.pitch = pitch || 0;
    g.player.y = g.level.floorAt(g.player.x, g.player.z);
    for (const e of g.enemies) e.state = e.state === 'idle' ? 'idle' : e.state;
  }, [cx, cz, deg, pitch]);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/tour-${name}.png` });
}
console.log(errors.length ? errors.join('\n') : 'NO ERRORS');
await browser.close();
