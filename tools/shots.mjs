// Screenshot any level at given spots: node tools/shots.mjs <levelIndex> '[["name",cx,cz,deg],...]'
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const playwright = require('/opt/node22/lib/node_modules/playwright');
const OUT = process.env.OUT_DIR || '.';
const browser = await playwright.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 1000, height: 460 } })).newPage();
const errors = [];
page.on('pageerror', e => errors.push('[pageerror] ' + e.stack));
await page.goto('http://localhost:8080/index.html');
await page.waitForTimeout(800);
const lvl = +process.argv[2];
await page.evaluate((i) => { const g = window.game; g.newGame('normal'); if (i) g.startLevel(i); g.godMode = true; }, lvl);
for (const [name, cx, cz, deg, pre] of JSON.parse(process.argv[3])) {
  await page.evaluate(([cx, cz, deg, pre]) => {
    const g = window.game, p = g.player;
    p.x = (cx + 0.5) * 2; p.z = (cz + 0.5) * 2; p.yaw = deg * Math.PI / 180; p.pitch = 0; p.y = g.level.floorAt(p.x, p.z);
    if (pre) eval(pre);
  }, [cx, cz, deg, pre || '']);
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT}/L${lvl}-${name}.png` });
}
console.log(errors.length ? errors.join('\n') : 'NO ERRORS');
await browser.close();
