// Studio viewer for sculpted models: node tools/modelview.mjs <name> <view> [pose]
//   view: face | body | back | side | three-quarter
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const playwright = require('/opt/node22/lib/node_modules/playwright');
const [name = 'ally', view = 'body', pose = 'idle'] = process.argv.slice(2);
const browser = await playwright.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 700, height: 700 } })).newPage();
page.on('pageerror', e => console.log('[pageerror] ' + e.stack));
page.on('console', m => { if (m.type() === 'error') console.log(m.text()); });
await page.goto('http://localhost:8080/tools/modelview.html');
await page.waitForFunction(() => window.ready === true || window.failed, null, { timeout: 60000 });
await page.evaluate(([name, view, pose]) => window.show(name, view, pose), [name, view, pose]);
await page.waitForTimeout(400);
await page.screenshot({ path: `view-${name}-${view}.png` });
await browser.close();
