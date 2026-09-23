// Close-up screenshots of individual models: node tools/closeup.mjs <type> <pose> [distance] [yawOffset]
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const playwright = require('/opt/node22/lib/node_modules/playwright');
const [type = 'ally', pose = 'idle', dist = '3', turn = '0', eye = ''] = process.argv.slice(2);
const browser = await playwright.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 900, height: 520 } })).newPage();
page.on('pageerror', e => console.log('[pageerror] ' + e.stack));
await page.goto('http://localhost:8080/index.html');
await page.waitForFunction(() => window.game && document.querySelector('[data-act=new]'), null, { timeout: 30000 });
await page.waitForTimeout(600);
await page.evaluate(async ([type, pose, dist, turn, eye]) => {
  const { buildCreature } = await import('./src/models/creatures.js');
  const g = window.game; g.newGame('normal'); g.godMode = true;
  for (const e of g.enemies) e.sprite.visible = false; g.enemies.length = 0;
  if (g.ally) g.ally.update = () => { g.ally.sprite.visible = false; };
  const m = buildCreature(type); g.scene.add(m.root);
  const p = g.player; p.x = 44.5; p.z = 20 + +dist; p.yaw = 0; p.pitch = type === 'ally' ? -0.05 : 0.12; p.y = g.level.floorAt(p.x, p.z);
  m.root.position.set(44.5, 0, 20); m.root.rotation.y = +turn;
  if (eye) { const ey = +eye; const fl = g.level.floorAt(p.x, p.z); g.player.update = function () {}; p.y = ey - 1.35; p.pitch = 0; p.onGround = true; }
  let t = 0; const upd = g.update.bind(g);
  g.update = (dt) => { upd(dt); t += dt; m.update(pose, t * 4, 0.1, 0); m.mats.setLight(1.1, 1.05, 1); };
  g.weapons.render = () => {};
}, [type, pose, dist, turn, eye]);
await page.waitForTimeout(1200);
await page.screenshot({ path: `close-${type}-${pose}${eye ? '-face' : ''}.png` });
await browser.close();
