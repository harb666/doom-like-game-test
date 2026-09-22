// Top-down map overlay. Squares are revealed as you see them.

import { CELL } from '../config.js';
import { traceLine } from '../world/Collision.js';

const RAYS = 48;
const tr = {};

export class Automap {
  constructor(game) {
    this.game = game;
    this.canvas = document.getElementById('automap');
    this.ctx = this.canvas.getContext('2d');
    this.visible = false;
    this.revealT = 0;
  }

  toggle(on = !this.visible) {
    this.visible = on;
    this.canvas.classList.toggle('show', on);
    if (on) this.resize();
  }

  resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas.width = Math.round(window.innerWidth * dpr);
    this.canvas.height = Math.round(window.innerHeight * dpr);
  }

  /** Mark squares the player can currently see. Cheap: a fan of rays a few times a second. */
  reveal(dt) {
    this.revealT -= dt;
    if (this.revealT > 0) return;
    this.revealT = 0.2;
    const g = this.game, p = g.player, L = g.level;
    L.cellAt(p.x, p.z).seen = true;
    for (let i = 0; i < RAYS; i++) {
      const a = (i / RAYS) * Math.PI * 2;
      const ex = p.x + Math.sin(a) * 30, ez = p.z + Math.cos(a) * 30;
      traceLine(L, p.x, p.eyeY, p.z, ex, p.eyeY, ez, tr);
      const steps = Math.ceil(tr.t * 30 / (CELL * 0.5));
      for (let s = 0; s <= steps; s++) {
        const t = (s / Math.max(1, steps)) * tr.t;
        const c = L.cellAt(p.x + (ex - p.x) * t, p.z + (ez - p.z) * t);
        c.seen = true;
      }
      if (tr.cell) tr.cell.seen = true;
      const hit = L.cellAt(tr.x - Math.sin(a) * 0.05 + tr.nx * -0.2, tr.z - Math.cos(a) * 0.05 + tr.nz * -0.2);
      hit.seen = true;
    }
  }

  draw() {
    if (!this.visible) return;
    const g = this.game, L = g.level, p = g.player, ctx = this.ctx;
    const W = this.canvas.width, H = this.canvas.height;
    ctx.fillStyle = 'rgba(0,0,0,0.72)';
    ctx.fillRect(0, 0, W, H);
    const scale = Math.min(W / (L.w + 2), H / (L.h + 2)) * 1.0;
    const s = Math.max(4, Math.min(scale, 22));
    const ox = W / 2 - (p.x / CELL) * s, oz = H / 2 - (p.z / CELL) * s;
    for (const c of L.cells) {
      if (!c.seen || c.solid) continue;
      const x = ox + c.cx * s, y = oz + c.cz * s;
      let col = '#3a2a22';
      if (c.hazard) col = '#1e5a1a';
      else if (c.exit) col = '#20c060';
      else if (c.lift) col = '#6a5a20';
      else if (c.floor > 0.3) col = '#4a3a2e';
      if (c.door) col = c.door.key === 'red' ? '#c02020' : c.door.key === 'blue' ? '#2050d0' : c.door.key === 'yellow' ? '#c0a020' : c.door.secret ? '#3a2a22' : '#8a6a4a';
      ctx.fillStyle = col;
      ctx.fillRect(x, y, s + 0.5, s + 0.5);
      // walls
      ctx.fillStyle = '#d04a20';
      const n = L.neighbours(c);
      if (n[0].solid) ctx.fillRect(x, y, s, Math.max(1, s * 0.12));
      if (n[1].solid) ctx.fillRect(x + s * 0.88, y, Math.max(1, s * 0.12), s);
      if (n[2].solid) ctx.fillRect(x, y + s * 0.88, s, Math.max(1, s * 0.12));
      if (n[3].solid) ctx.fillRect(x, y, Math.max(1, s * 0.12), s);
    }
    // keys still lying around that you've seen
    for (const it of g.pickups.items) {
      if (it.taken || !it.type.startsWith('key_') || !L.cellAt(it.x, it.z).seen) continue;
      ctx.fillStyle = it.type === 'key_red' ? '#ff3030' : it.type === 'key_blue' ? '#3070ff' : '#ffd030';
      ctx.fillRect(ox + it.x / CELL * s - s * 0.25, oz + it.z / CELL * s - s * 0.25, s * 0.5, s * 0.5);
    }
    // companion
    if (g.ally) {
      ctx.fillStyle = '#40e0ff';
      ctx.fillRect(ox + g.ally.x / CELL * s - s * 0.2, oz + g.ally.z / CELL * s - s * 0.2, s * 0.4, s * 0.4);
    }
    // player arrow
    const px = ox + p.x / CELL * s, pz = oz + p.z / CELL * s;
    const fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw);
    ctx.fillStyle = '#ffe040';
    ctx.beginPath();
    ctx.moveTo(px + fx * s * 0.9, pz + fz * s * 0.9);
    ctx.lineTo(px - fx * s * 0.5 + fz * s * 0.5, pz - fz * s * 0.5 - fx * s * 0.5);
    ctx.lineTo(px - fx * s * 0.5 - fz * s * 0.5, pz - fz * s * 0.5 + fx * s * 0.5);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffcc33';
    ctx.font = `${Math.round(12 * (W / window.innerWidth))}px "Press Start 2P", monospace`;
    ctx.fillText(g.levelDef.name.toUpperCase(), 16 * (W / window.innerWidth), H - 16 * (W / window.innerWidth));
  }
}
