// Measures level load (light baking) time and per-frame draw calls.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const playwright = require('/opt/node22/lib/node_modules/playwright');
const browser = await playwright.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 844, height: 390 } })).newPage();
page.on('pageerror', e => console.log('[pageerror] ' + e.stack));
await page.goto('http://localhost:8080/index.html');
await page.waitForTimeout(600);
const r = await page.evaluate(() => {
  const g = window.game, out = [];
  g.newGame('normal');
  for (let i = 0; i < 3; i++) {
    const t0 = performance.now(); g.startLevel(i); const t1 = performance.now();
    for (let k = 0; k < 5; k++) g.update(1 / 60);
    g.renderer.info.autoReset = false; g.renderer.info.reset();
    g.render(0.016);
    let tris = 0; g.level.group.traverse(o => { if (o.geometry?.index) tris += o.geometry.index.count / 3; });
    out.push({ level: i, loadMs: Math.round(t1 - t0), calls: g.renderer.info.render.calls, frameTris: g.renderer.info.render.triangles, levelTris: tris });
    g.renderer.info.autoReset = true;
  }
  return out;
});
console.log(JSON.stringify(r));
await browser.close();
