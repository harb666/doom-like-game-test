// Checks the VEX companion: follows the player, kills monsters by herself, keeps up across the level.
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
await page.click('[data-act=new]'); await page.click('[data-act=normal]');
await page.waitForTimeout(600);
await page.evaluate(() => { const g = window.game; g.player.yaw = Math.PI; });   // turn round to look at her
await page.waitForTimeout(400);
await page.screenshot({ path: `${OUT}/ally-start.png` });
const r = await page.evaluate(() => {
  const g = window.game; g.renderer.setAnimationLoop(null); g.godMode = true; g.player.yaw = 0;
  const step = (s) => { for (let i = 0; i < s * 60; i++) g.update(1 / 60); };
  const out = { spawned: !!g.ally, startGap: Math.hypot(g.ally.x - g.player.x, g.ally.z - g.player.z).toFixed(1) };
  // walk the player up the corridor, never firing
  g.input.touchMove.active = true; g.input.touchMove.y = 1; step(3.2); g.input.touchMove.active = false; g.input.touchMove.y = 0;
  const k0 = g.stats.kills, ammo0 = g.weapons.ammo.rivets;
  step(12);
  out.pos = [g.player.x.toFixed(1), g.player.z.toFixed(1)]; out.husks = g.enemies.filter(e => e.type === "husk" && e.z > 40 && e.z < 52).map(e => [e.state, e.x.toFixed(1), e.z.toFixed(1), e.health]); out.target = g.ally.target && g.ally.target.type;
  out.killsByVex = g.stats.kills - k0; out.playerShots = ammo0 - g.weapons.ammo.rivets;
  out.gap = Math.hypot(g.ally.x - g.player.x, g.ally.z - g.player.z).toFixed(1);
  // teleport far away: she should catch up / warp
  const p = g.player; p.x = 43; p.z = 36; p.y = g.level.floorAt(p.x, p.z); step(5);
  out.afterTeleportGap = Math.hypot(g.ally.x - p.x, g.ally.z - p.z).toFixed(1);
  return out;
});
console.log(JSON.stringify(r));
await page.evaluate(() => { const g = window.game; g.player.yaw += Math.PI; g.renderer.setAnimationLoop(() => g.frame()); });
await page.waitForTimeout(500);
console.log(errors.length ? errors.join('\n') : 'NO ERRORS');
await browser.close();
