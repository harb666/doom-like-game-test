// Screenshot every 3D model lined up in the arena (for visual checks).
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const playwright = require('/opt/node22/lib/node_modules/playwright');
const OUT = process.env.OUT_DIR || '.';
const pose = process.argv[2] || 'walk';
const browser = await playwright.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 1100, height: 500 } })).newPage();
page.on('pageerror', e => console.log('[pageerror] ' + e.stack));
await page.goto('http://localhost:8080/index.html');
await page.waitForTimeout(600);
await page.evaluate(async (pose) => {
  const { Enemy } = await import('./src/enemies/Enemy.js');
  const g = window.game; g.newGame('normal'); g.godMode = true;
  for (const e of g.enemies) e.sprite.visible = false;
  g.enemies.length = 0;
  const types = ['husk', 'rifter', 'spitter', 'hound', 'wraith', 'warden'];
  types.forEach((t, i) => { const e = new Enemy(g, t, 36 + i * 3.4, 18); e.facing = 0.35 - i * 0.12; e.update = function (dt) { this.animT += dt; this.walkPhase += dt * 5; this.setPose(pose); this.syncSprite(dt); }; g.enemies.push(e); g.enemyGroup.add(e.sprite); });
  const p = g.player; p.x = 44.5; p.z = 27; p.yaw = 0; p.pitch = 0.05; p.y = g.level.floorAt(p.x, p.z);
   g.ally.update = () => { g.ally.model.root.position.set(40.5, 0, 22); g.ally.model.root.rotation.y = 0.3; g.ally.model.update(pose === 'walk' ? 'idle' : pose, g.time * 5, 0.1, 0); g.ally.model.mats.setLight(1, 1, 1); };
  g.weapons.canvas.style.display = 'none';
}, pose);
await page.waitForTimeout(1200);
await page.screenshot({ path: `${OUT}/lineup-${pose}.png` });
await browser.close();
