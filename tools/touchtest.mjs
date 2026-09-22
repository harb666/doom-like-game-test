// Simulates an iPhone (landscape) and checks the touch controls with real multi-touch events.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const playwright = require('/opt/node22/lib/node_modules/playwright');
const OUT = process.env.OUT_DIR || '.';
const browser = await playwright.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const context = await browser.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
const page = await context.newPage();
const errors = [];
page.on('pageerror', e => errors.push('[pageerror] ' + e.stack));
page.on('console', m => { if (m.type() === 'error' && !m.text().includes('ERR_CERT')) errors.push(m.text()); });
await page.goto('http://localhost:8080/index.html');
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/mobile-title.png` });
await page.tap('[data-act=new]'); await page.waitForTimeout(200);
await page.tap('[data-act=normal]'); await page.waitForTimeout(1200);
const cdp = await context.newCDPSession(page);
const touch = (type, points) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points.map(([x, y, id]) => ({ x, y, id })) });
const get = () => page.evaluate(() => { const g = window.game; return { x: g.player.x, z: g.player.z, yaw: g.player.yaw, ammo: g.weapons.ammo.rivets, weapon: g.weapons.current, state: g.state, touch: g.touchMode }; });
const s0 = await get();
// left thumb: push stick forward, right thumb: drag to turn - at the same time
await touch('touchStart', [[150, 300, 1], [600, 200, 2]]);
for (let i = 1; i <= 10; i++) { await touch('touchMove', [[150, 300 - i * 6, 1], [600 + i * 8, 200, 2]]); await page.waitForTimeout(30); }
await page.waitForTimeout(600);
await page.screenshot({ path: `${OUT}/mobile-play.png` });
await touch('touchEnd', []);
const s1 = await get();
// fire button (bottom-right)
await touch('touchStart', [[844 - 26 - 48, 390 - 26 - 48, 3]]);
await page.waitForTimeout(700);
await touch('touchEnd', []);
const s2 = await get();
// pause button
await page.waitForTimeout(100);
await touch('touchStart', [[34, 137, 4]]); await touch('touchEnd', []);
await page.waitForTimeout(300);
const s3 = await get();
await page.screenshot({ path: `${OUT}/mobile-pause.png` });
console.log(JSON.stringify({ touchMode: s0.touch, moved: Math.hypot(s1.x - s0.x, s1.z - s0.z).toFixed(2), turned: (s1.yaw - s0.yaw).toFixed(2), shots: s1.ammo - s2.ammo, paused: s3.state }));
console.log(errors.length ? errors.join('\n') : 'NO ERRORS');
await browser.close();
