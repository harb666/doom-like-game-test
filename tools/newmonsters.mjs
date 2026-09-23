// Checks the Hellmaw spits fireballs and the Ravager charges + claws.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const playwright = require('/opt/node22/lib/node_modules/playwright');
const browser = await playwright.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 900, height: 420 } })).newPage();
const errors = [];
page.on('pageerror', e => errors.push('[pageerror] ' + e.stack));
await page.goto('http://localhost:8080/index.html');
await page.waitForFunction(() => window.game && document.querySelector('[data-act=new]'), null, { timeout: 30000 });
await page.waitForTimeout(600);
const r = await page.evaluate(() => {
  const g = window.game; g.newGame('normal'); g.renderer.setAnimationLoop(null);
  g.settings.allyCompanion = false;
  const step = (s) => { for (let i = 0; i < s * 60; i++) g.update(1 / 60); };
  const p = g.player;
  for (const e of g.enemies) if (e.type !== 'hellmaw' && e.type !== 'ravager') { e.health = 0; e.die(0); }
  const maw = g.enemies.find(e => e.type === 'hellmaw'), rav = g.enemies.find(e => e.type === 'ravager');
  // stand in the arena, in view of a Hellmaw
  p.x = maw.x; p.z = maw.z + 14; p.y = g.level.floorAt(p.x, p.z); p.health = 100;
  maw.wake(false);
  let fireballs = 0; const spawn = g.projectiles.spawn.bind(g.projectiles);
  g.projectiles.spawn = (type, ...a) => { if (type === 'mawfire') fireballs++; return spawn(type, ...a); };
  step(6);
  const out = { fireballs, playerHealthAfterMaw: Math.round(p.health), mawState: maw.state };
  p.health = 100; p.dead = false; g.state = 'playing';
  maw.health = 0; maw.die(0);
  p.x = rav.x + 10; p.z = rav.z; p.y = g.level.floorAt(p.x, p.z);
  if (g.level.cellAt(p.x, p.z).solid) { p.x = rav.x; p.z = rav.z + 8; }
  rav.wake(false); step(6);
  out.playerHealthAfterRavager = Math.round(p.health); out.ravState = rav.state;
  return out;
});
console.log(JSON.stringify(r));
console.log(errors.length ? errors.join('\n') : 'NO ERRORS');
await browser.close();
