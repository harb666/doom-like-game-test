// Scripted play-through checks for level 1. Drives the real game code in
// headless Chromium and reports PASS/FAIL for each gameplay system.
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const playwright = require('/opt/node22/lib/node_modules/playwright');
const OUT = process.env.OUT_DIR || '.';
const browser = await playwright.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await (await browser.newContext({ viewport: { width: 900, height: 420 } })).newPage();
const errors = [];
page.on('pageerror', e => errors.push('[pageerror] ' + e.stack));
page.on('console', m => { if (m.type() === 'error' && !m.text().includes('ERR_CERT')) errors.push(m.text()); });
await page.goto('http://localhost:8080/index.html');
await page.waitForTimeout(800);
await page.click('[data-act=new]'); await page.click('[data-act=normal]');
await page.waitForTimeout(500);

// helpers injected into the page
await page.evaluate(() => {
  const g = window.game;
  g.renderer.setAnimationLoop(null);   // we drive time ourselves
  window.T = {
    step(sec) { const n = Math.round(sec * 60); for (let i = 0; i < n; i++) { g.update(1 / 60); if (g.state !== 'playing' && g.state !== 'dead' && g.state !== 'complete') break; } },
    tp(cx, cz, deg) { const p = g.player; p.x = (cx + 0.5) * 2; p.z = (cz + 0.5) * 2; p.yaw = deg * Math.PI / 180; p.pitch = 0; p.vx = p.vz = 0; p.y = g.level.floorAt(p.x, p.z); },
    move(x, y) { g.input.touchMove.active = !!(x || y); g.input.touchMove.x = x; g.input.touchMove.y = y; },
    fire(on) { g.input.touchFire = on; },
    press(a) { g.input.pressed.add(a); },
    enemyAt(cx, cz) { return g.enemies.find(e => Math.floor(e.x / 2) === cx && Math.floor(e.z / 2) === cz); },
  };
});
const results = [];
async function check(name, fn) {
  try { const r = await page.evaluate(fn); results.push(`${r.ok ? 'PASS' : 'FAIL'}  ${name}  ${JSON.stringify(r.info ?? '')}`); }
  catch (e) { results.push(`ERROR ${name} ${e.message.split('\n')[0]}`); }
}

await check('spawns valid', () => {
  const g = window.game; const bad = [];
  for (const e of g.enemies) if (g.level.cellAt(e.x, e.z).solid) bad.push(e.type);
  return { ok: !bad.length && g.enemies.length > 10, info: { enemies: g.enemies.length, bad } };
});
await check('shoot husks in corridor', () => {
  const g = window.game; T.tp(7, 23, -90); g.godMode = true;
  const k0 = g.stats.kills; T.fire(true); T.step(6); T.fire(false); T.step(0.5);
  return { ok: g.stats.kills - k0 >= 2, info: { kills: g.stats.kills - k0, ammo: g.weapons.ammo.rivets } };
});
await check('monsters hurt the player', () => {
  const g = window.game; g.godMode = false; T.tp(21, 26, 0);
  for (const e of g.enemies) if (Math.abs(e.x - 42) < 14 && Math.abs(e.z - 44) < 12) e.wake(false);
  const h0 = g.player.health; T.step(6);
  return { ok: g.player.health < h0 || g.player.dead, info: { health: g.player.health } };
});
await check('door opens by walking into it', () => {
  const g = window.game; g.godMode = true; g.player.health = 100; g.player.dead = false; g.state = 'playing';
  T.tp(6, 31, 0); T.move(0, 1); T.step(0.6); T.move(0, 0);
  const d = g.level.cellAt(13, 61).door; T.step(0.6);
  return { ok: d && d.open > 0.5, info: { state: d && d.state, open: d && d.open } };
});
await check('walk through opened door', () => {
  const g = window.game; T.tp(6, 31, 0); T.move(0, 1); T.step(2.0); T.move(0, 0);
  return { ok: g.player.z < 60, info: { z: g.player.z.toFixed(2) } };
});
await check('pick up scattergun', () => {
  const g = window.game; T.tp(40, 22, 0); T.step(0.2);
  return { ok: g.weapons.owned.has('scattergun'), info: { shells: g.weapons.ammo.shells, current: g.weapons.current } };
});
await check('fire scattergun', () => {
  const g = window.game; T.step(0.5); const s0 = g.weapons.ammo.shells; T.fire(true); T.step(0.2); T.fire(false); T.step(1);
  return { ok: g.weapons.ammo.shells === s0 - 1, info: { s0, s1: g.weapons.ammo.shells } };
});
await check('slime hurts', () => {
  const g = window.game; g.godMode = false; g.player.health = 100; T.tp(33, 26, 0); T.step(2.1);
  const h = g.player.health; g.player.health = 100; g.godMode = true;
  return { ok: h < 100, info: { health: h } };
});
await check('red door locked without key', () => {
  const g = window.game; T.tp(13, 6, 90); T.move(0, 1); T.step(0.8); T.move(0, 0);
  const d = g.level.cell(12, 6).door;
  return { ok: d.open === 0, info: { state: d.state } };
});
await check('grab red key on platform', () => {
  const g = window.game; T.tp(27, 6, 0); T.step(0.2);
  return { ok: g.player.keys.has('red') && Math.abs(g.player.y - 1) < 0.01, info: { keys: [...g.player.keys], y: g.player.y } };
});
await check('walk down the stairs', () => {
  const g = window.game; T.tp(27, 7, 180); T.move(0, 1); T.step(1.0); T.move(0, 0);
  return { ok: g.player.y < 0.3 && g.player.z > 22, info: { y: g.player.y.toFixed(2), z: g.player.z.toFixed(1) } };
});
await check('red door opens with key', () => {
  const g = window.game; T.tp(13, 6, 90); T.move(0, 1); T.step(1.2); T.move(0, 0);
  const d = g.level.cell(12, 6).door;
  return { ok: d.open > 0.5 || g.player.x < 24, info: { state: d.state, x: g.player.x.toFixed(1) } };
});
await check('lift: use lowers it, ride it up', () => {
  const g = window.game; const lift = g.level.lifts.get('L');
  T.tp(6, 5, 90); T.press('use'); T.step(2.0);
  const low = lift.h;
  T.tp(5, 5, 90); T.step(5.0);
  return { ok: low < 0.05 && Math.abs(g.player.y - 2) < 0.05, info: { low, y: g.player.y, state: lift.state } };
});
await check('walk from lift onto ledge, get blue key', () => {
  const g = window.game; const trace = [];
  for (const e of g.enemies) if (!e.dead && Math.hypot(e.x - g.player.x, e.z - g.player.z) < 10) e.takeDamage(9999, g.player, null);
  T.move(0, 1);
  for (let i = 0; i < 8; i++) { T.step(0.1); trace.push([+g.player.x.toFixed(1), +g.player.y.toFixed(2), g.level.lifts.get('L').state]); }
  T.move(0, 0); window.__trace = trace;
  const onLedge = g.player.x < 10 && g.player.y > 1.9;
  T.tp(2, 10, 0); T.step(0.2);
  return { ok: onLedge && g.player.keys.has('blue'), info: { trace: window.__trace, onLedge, x: g.player.x.toFixed(2), y: g.player.y.toFixed(2), lift: g.level.lifts.get('L').state, blockers: g.solidBodies.filter(b => b !== g.player && Math.hypot(b.x - g.player.x, b.z - g.player.z) < 2).map(b => b.type || 'x') } };
});
await check('find secret closet', () => {
  const g = window.game; const s0 = g.stats.secrets; T.tp(9, 34, -90); T.press('use'); T.step(1.0); T.move(0, 1); T.step(0.8); T.move(0, 0);
  return { ok: g.stats.secrets === s0 + 1, info: { secrets: g.stats.secrets, of: g.stats.secretsTotal, x: g.player.x } };
});
await check('barrel explodes and kills', () => {
  const g = window.game; const b = g.pickups.barrels[0];
  b.takeDamage(50, g.player); T.step(0.5);
  return { ok: b.dead, info: { dead: b.dead } };
});
await check('long AI soak (60s, god mode)', () => {
  const g = window.game; g.godMode = true; T.tp(21, 22, 0);
  for (const e of g.enemies) e.wake(false);
  const before = g.enemies.filter(e => !e.dead).map(e => [e.x, e.z]);
  for (let i = 0; i < 30; i++) { T.fire(i % 3 === 0); T.step(2); }
  T.fire(false);
  const near = g.enemies.filter(e => !e.dead && Math.hypot(e.x - g.player.x, e.z - g.player.z) < 8).length;
  return { ok: true, info: { alive: g.enemies.filter(e => !e.dead).length, near, kills: g.stats.kills, particles: g.effects.particles.length } };
});
await check('exit completes level', () => {
  const g = window.game; T.tp(47, 6, 0); T.step(0.2);
  return { ok: g.state === 'complete' && !!document.querySelector('.complete'), info: { state: g.state, stats: g.stats } };
});
await page.screenshot({ path: `${OUT}/play-complete.png` });
await check('death -> game over -> retry', async () => {
  const g = window.game; g.restartLevel(); g.renderer.setAnimationLoop(null); g.godMode = false; g.player.damage(500);
  const dead = g.state === 'dead';
  await new Promise(r => setTimeout(r, 2000));
  const menu = !!document.querySelector('.gameover');
  document.querySelector('[data-act=retry]')?.click();
  return { ok: dead && menu && g.state === 'playing' && g.player.health === 100, info: { dead, menu, state: g.state } };
});

console.log(results.join('\n'));
console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'NO PAGE ERRORS');
await browser.close();
