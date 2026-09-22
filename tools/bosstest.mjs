// Checks the Ion Lancer, Hellbore Launcher, the Warden boss and the boss-locked exit.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const playwright = require('/opt/node22/lib/node_modules/playwright');
const browser = await playwright.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 900, height: 420 } })).newPage();
const errors = [];
page.on('pageerror', e => errors.push('[pageerror] ' + e.stack));
await page.goto('http://localhost:8080/index.html');
await page.waitForTimeout(800);
const r = await page.evaluate(() => {
  const g = window.game; const out = {};
  g.newGame('normal'); g.startLevel(2); g.renderer.setAnimationLoop(null); g.godMode = true;
  const step = (s) => { for (let i = 0; i < s * 60; i++) g.update(1 / 60); };
  const tp = (cx, cz, deg) => { const p = g.player; p.x = (cx + .5) * 2; p.z = (cz + .5) * 2; p.yaw = deg * Math.PI / 180; p.y = g.level.floorAt(p.x, p.z); };
  // exit locked while boss alive
  tp(20, 3, 0); step(0.3); out.lockedExit = g.state === 'playing';
  const boss = g.enemies.find(e => e.def.boss);
  boss.wake(false); tp(20, 20, 0); step(3);
  out.bossProjectiles = g.projectiles.list.length; out.bossAwake = boss.state;
  // hellbore
  g.weapons.giveWeapon('hellbore', 40); step(0.5);
  const h0 = boss.health; g.input.touchFire = true;
  for (let i = 0; i < 40 && !boss.dead; i++) { const p = g.player; p.yaw = Math.atan2(-(boss.x - p.x), -(boss.z - p.z)); step(0.5); }
  g.input.touchFire = false;
  out.hellboreDamage = h0 - boss.health; out.bossDead = boss.dead; out.rocketsLeft = g.weapons.ammo.rockets;
  // lancer vs remaining monsters
  g.weapons.giveWeapon('lancer', 200); step(0.5);
  const k0 = g.stats.kills; g.input.touchFire = true;
  for (let i = 0; i < 60; i++) {
    const p = g.player; const t = g.enemies.filter(e => !e.dead && e.canSeePlayer()).sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0];
    if (!t) break; p.yaw = Math.atan2(-(t.x - p.x), -(t.z - p.z)); step(0.25);
  }
  g.input.touchFire = false;
  out.lancerKills = g.stats.kills - k0; out.cells = g.weapons.ammo.cells;
  tp(20, 3, 0); step(0.3); out.exitAfterBoss = g.state;
  g.nextLevel(); out.afterLast = g.state; out.victoryMenu = !!document.querySelector('.victory');
  return out;
});
console.log(JSON.stringify(r, null, 1));
console.log(errors.length ? errors.join('\n') : 'NO ERRORS');
await browser.close();
