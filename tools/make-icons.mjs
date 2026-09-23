// Generates the home-screen icons (icons/icon-180.png, icons/icon-512.png).
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire(import.meta.url);
const playwright = require('/opt/node22/lib/node_modules/playwright');
const browser = await playwright.chromium.launch();
const page = await browser.newPage();
for (const size of [180, 512]) {
  const data = await page.evaluate((size) => {
    const N = 32, cv = document.createElement('canvas'); cv.width = cv.height = N;
    const c = cv.getContext('2d');
    const g = c.createLinearGradient(0, 0, 0, N); g.addColorStop(0, '#2a0402'); g.addColorStop(1, '#6a1004');
    c.fillStyle = g; c.fillRect(0, 0, N, N);
    // a fanged maw
    c.fillStyle = '#120202'; c.beginPath(); c.ellipse(16, 17, 11, 9, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#ff5a1a'; c.fillRect(9, 9, 3, 2); c.fillRect(20, 9, 3, 2);
    c.fillStyle = '#e8dcc0';
    for (let i = 0; i < 5; i++) { c.beginPath(); c.moveTo(8 + i * 4, 13); c.lineTo(10 + i * 4, 13); c.lineTo(9 + i * 4, 18); c.fill(); }
    for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(10 + i * 4, 25); c.lineTo(12 + i * 4, 25); c.lineTo(11 + i * 4, 20); c.fill(); }
    c.fillStyle = '#ffcc33'; c.fillRect(4, 28, 24, 2);
    const out = document.createElement('canvas'); out.width = out.height = size;
    const o = out.getContext('2d'); o.imageSmoothingEnabled = false; o.drawImage(cv, 0, 0, size, size);
    return out.toDataURL('image/png').split(',')[1];
  }, size);
  fs.writeFileSync(`icons/icon-${size}.png`, Buffer.from(data, 'base64'));
}
await browser.close();
console.log('icons written');
