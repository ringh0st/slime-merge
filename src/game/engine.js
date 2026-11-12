import Matter from 'matter-js';
import { TIERS, ROCK, POINTS, DROP_WEIGHTS, tierInfo } from './tiers.js';
import { drawSlime } from './draw.js';
import { sfx } from './audio.js';

const { Engine, Bodies, Body, Composite, Events } = Matter;

// Logical jar size; the canvas is scaled to fit the screen.
export const W = 400;
export const H = 600;
export const DANGER_Y = 100;
const DROP_Y = 48;
const STEP = 1000 / 120;
const OVER_MS = 2600;
const COMBO_MS = 1200;

function pickTier() {
  const total = DROP_WEIGHTS.reduce((a, b) => a + b, 0);
  let x = Math.random() * total;
  for (let i = 0; i < DROP_WEIGHTS.length; i++) {
    x -= DROP_WEIGHTS[i];
    if (x < 0) return i;
  }
  return 0;
}

export class Game {
  constructor(canvas, cb = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cb = cb;
    this.scale = 1;
    this.dpr = 1;
    this.engine = Engine.create({ gravity: { y: 1.1 }, positionIterations: 8, velocityIterations: 6 });
    this.world = this.engine.world;
    this.pending = [];
    this.particles = [];
    this.texts = [];
    this.rings = [];
    this.aimX = W / 2;
    this.last = 0;
    this.acc = 0;
    this.simTime = 0;
    this.onStart = (e) => this.onCollide(e, true);
    this.onActive = (e) => this.onCollide(e, false);
    Events.on(this.engine, 'collisionStart', this.onStart);
    Events.on(this.engine, 'collisionActive', this.onActive);
    this.buildWalls();
    this.reset('demo');
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    Events.off(this.engine, 'collisionStart', this.onStart);
    Events.off(this.engine, 'collisionActive', this.onActive);
    Composite.clear(this.world, false);
    Engine.clear(this.engine);
  }

  resize(cssW, cssH, dpr) {
    this.dpr = dpr;
    this.scale = cssW / W;
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
  }

  buildWalls() {
    const T = 100;
    const opts = { isStatic: true, friction: 0.5, restitution: 0.1 };
    Composite.add(this.world, [
      Bodies.rectangle(W / 2, H + T / 2, W + T * 2, T, opts),
      Bodies.rectangle(-T / 2, H / 2 - H, T, H * 3, opts),
      Bodies.rectangle(W + T / 2, H / 2 - H, T, H * 3, opts),
    ]);
  }

  bodies() {
    return Composite.allBodies(this.world).filter((b) => b.plugin && b.plugin.kind);
  }

  reset(mode) {
    for (const b of this.bodies()) Composite.remove(this.world, b);
    this.pending.length = 0;
    this.particles.length = 0;
    this.texts.length = 0;
    this.rings.length = 0;
    this.mode = mode;
    this.score = 0;
    this.drops = 0;
    this.combo = 0;
    this.lastMerge = -1e9;
    this.danger = 0;
    this.reportedDanger = 0;
    this.runMax = 4;
    this.canDrop = true;
    this.over = false;
    this.paused = false;
    this.nextDemo = 0;
    this.current = pickTier();
    this.next = pickTier();
    if (mode === 'play') {
      this.cb.onScore?.(0);
      this.cb.onNext?.(this.next);
      this.cb.onDanger?.(0);
    }
  }

  start() {
    this.reset('play');
  }

  setPaused(p) {
    this.paused = p;
    this.last = 0;
  }

  setAim(x) {
    this.aimX = x;
  }

  nudgeAim(dx) {
    this.aimX = this.clampAim() + dx;
  }

  get heldR() {
    return tierInfo(this.current).r;
  }

  clampAim() {
    const r = this.heldR;
    return Math.min(W - r - 2, Math.max(r + 2, this.aimX));
  }

  spawn(tier, x, y, vel) {
    const r = tierInfo(tier).r;
    const b = Bodies.circle(x, y, r, {
      restitution: 0.1,
      friction: 0.35,
      frictionStatic: 0.5,
      frictionAir: 0.012,
      density: tier < 0 ? 0.004 : 0.0012,
      slop: 0.03,
    });
    b.plugin = {
      kind: tier < 0 ? 'rock' : 'slime',
      tier,
      r,
      born: this.simTime,
      j: 0,
      jv: 0,
      seed: Math.random() * 10,
      blinkAt: performance.now() + 800 + Math.random() * 4000,
      merging: false,
    };
    if (vel) Body.setVelocity(b, vel);
    Composite.add(this.world, b);
    return b;
  }

  drop() {
    if (this.mode !== 'play' || !this.canDrop || this.over || this.paused) return false;
    const b = this.spawn(this.current, this.clampAim(), DROP_Y, { x: 0, y: 1 });
    b.plugin.jv = -1.4; // stretch as it falls
    this.drops++;
    this.canDrop = false;
    this.dropReadyAt = this.simTime + 480;
    this.current = this.next;
    // Rocks start showing up after a while, then every 7th drop.
    this.next = this.drops >= 18 && this.drops % 7 === 0 ? -1 : pickTier();
    this.cb.onNext?.(this.next);
    sfx.drop();
    return true;
  }

  onCollide(e, isStart) {
    for (const p of e.pairs) {
      const a = p.bodyA;
      const b = p.bodyB;
      const pa = a.plugin;
      const pb = b.plugin;
      if (isStart) {
        const rv = Math.hypot(a.velocity.x - b.velocity.x, a.velocity.y - b.velocity.y);
        const kick = Math.min(rv, 14) * 0.1;
        if (pa?.kind) pa.jv += kick;
        if (pb?.kind) pb.jv += kick;
      }
      if (
        pa?.kind === 'slime' &&
        pb?.kind === 'slime' &&
        pa.tier === pb.tier &&
        !pa.merging &&
        !pb.merging &&
        !this.over
      ) {
        pa.merging = pb.merging = true;
        this.pending.push([a, b]);
      }
    }
  }

  processMerges() {
    if (!this.pending.length) return;
    const list = this.pending;
    this.pending = [];
    const play = this.mode === 'play';
    for (const [a, b] of list) {
      const t = a.plugin.tier;
      const x = (a.position.x + b.position.x) / 2;
      const y = (a.position.y + b.position.y) / 2;
      const vx = (a.velocity.x + b.velocity.x) / 2;
      const vy = (a.velocity.y + b.velocity.y) / 2;
      Composite.remove(this.world, a);
      Composite.remove(this.world, b);
      const color = TIERS[t].color;
      let gained;
      if (t === TIERS.length - 1) {
        // Two kings: a royal explosion and they vanish.
        this.burst(x, y, color, 40, TIERS[t].r);
        this.burst(x, y, '#FFE27A', 30, TIERS[t].r);
        this.ring(x, y, TIERS[t].r * 1.4, '#FFE27A');
        gained = 250;
        this.crackRocks(x, y, TIERS[t].r * 1.5);
        if (play) sfx.king();
      } else {
        const nt = t + 1;
        const nb = this.spawn(nt, x, y, { x: vx * 0.5, y: Math.min(vy, 0) - 1.5 });
        nb.plugin.j = -0.2;
        this.burst(x, y, color, 10 + t * 2, TIERS[t].r);
        this.ring(x, y, TIERS[nt].r, TIERS[nt].color);
        gained = POINTS[nt];
        this.crackRocks(x, y, TIERS[nt].r);
        if (play && nt > this.runMax) {
          this.runMax = nt;
          this.cb.onDiscover?.(nt);
        }
      }
      if (play) {
        this.combo = this.simTime - this.lastMerge < COMBO_MS ? this.combo + 1 : 1;
        this.lastMerge = this.simTime;
        const pts = Math.round(gained * (1 + (this.combo - 1) * 0.5));
        this.score += pts;
        this.text(x, y, `+${pts}`, color, this.combo);
        this.cb.onScore?.(this.score);
        this.cb.onMerge?.(Math.min(t + 1, TIERS.length - 1), this.combo);
        sfx.merge(t + 1, this.combo);
      }
    }
  }

  crackRocks(x, y, R) {
    for (const b of this.bodies()) {
      if (b.plugin.kind !== 'rock') continue;
      if (Math.hypot(b.position.x - x, b.position.y - y) < R + b.plugin.r + 16) {
        Composite.remove(this.world, b);
        this.burst(b.position.x, b.position.y, ROCK.color, 16, b.plugin.r);
        if (this.mode === 'play') {
          this.score += 10;
          this.text(b.position.x, b.position.y - 10, '+10', ROCK.color, 1);
          this.cb.onScore?.(this.score);
          sfx.rock();
        }
      }
    }
  }

  burst(x, y, color, n, r) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 1.5 + Math.random() * 4.5;
      this.particles.push({
        x: x + Math.cos(a) * r * 0.5,
        y: y + Math.sin(a) * r * 0.5,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 1.5,
        r: 2 + Math.random() * Math.max(2, r * 0.12),
        life: 1,
        color,
      });
    }
  }

  ring(x, y, r, color) {
    this.rings.push({ x, y, r, color, life: 1 });
  }

  text(x, y, s, color, combo) {
    this.texts.push({ x: Math.min(W - 50, Math.max(50, x)), y: Math.max(40, y), s, color, combo, life: 1 });
  }

  gameOver() {
    this.over = true;
    this.canDrop = false;
    for (const b of this.bodies()) b.plugin.dead = true;
    sfx.over();
    this.cb.onGameOver?.(this.score, this.runMax);
  }

  loop(now) {
    this.raf = requestAnimationFrame(this.loop);
    const dt = this.last ? Math.min(50, now - this.last) : 16;
    this.last = now;
    if (!this.paused) {
      if (!this.over) {
        this.acc += dt;
        let n = 0;
        while (this.acc >= STEP && n < 6) {
          Engine.update(this.engine, STEP);
          this.simTime += STEP;
          this.processMerges();
          this.acc -= STEP;
          n++;
        }
        if (n === 6) this.acc = 0;
        this.tick(dt);
      }
      this.tickFx(dt);
    }
    this.render(now);
  }

  tick(dt) {
    const s = dt / 1000;
    const list = this.bodies();
    for (const b of list) {
      const p = b.plugin;
      p.jv += (-340 * p.j - 11 * p.jv) * s;
      p.j = Math.max(-0.25, Math.min(0.25, p.j + p.jv * s));
    }
    if (!this.canDrop && this.simTime >= this.dropReadyAt) this.canDrop = true;

    if (this.mode === 'play') {
      let high = false;
      for (const b of list) {
        const p = b.plugin;
        if (this.simTime - p.born > 1500 && !p.merging && b.position.y - p.r < DANGER_Y) high = true;
      }
      this.danger = high ? this.danger + dt : Math.max(0, this.danger - dt * 1.5);
      const lvl = Math.min(1, this.danger / OVER_MS);
      if (Math.abs(lvl - this.reportedDanger) > 0.05 || (lvl === 0 && this.reportedDanger !== 0)) {
        this.reportedDanger = lvl;
        this.cb.onDanger?.(lvl);
      }
      if (this.danger >= OVER_MS) this.gameOver();
    } else if (this.mode === 'demo') {
      // Idle background play behind the menu.
      this.nextDemo -= dt;
      if (this.nextDemo <= 0 && list.length < 16) {
        this.nextDemo = 700;
        const t = Math.floor(Math.random() * 4);
        this.spawn(t, 40 + Math.random() * (W - 80), -40);
      }
    }
  }

  tickFx(dt) {
    const f = dt / 16.67;
    for (const p of this.particles) {
      p.vy += 0.18 * f;
      p.x += p.vx * f;
      p.y += p.vy * f;
      p.life -= 0.025 * f;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const r of this.rings) r.life -= 0.04 * f;
    this.rings = this.rings.filter((r) => r.life > 0);
    for (const t of this.texts) {
      t.y -= 0.7 * f;
      t.life -= 0.016 * f;
    }
    this.texts = this.texts.filter((t) => t.life > 0);
  }

  render(now) {
    const { ctx } = this;
    const k = this.scale * this.dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(k, 0, 0, k, 0, 0);

    const lvl = Math.min(1, this.danger / OVER_MS);
    const play = this.mode === 'play';

    // Danger line
    if (play) {
      ctx.save();
      ctx.setLineDash([6, 9]);
      ctx.lineCap = 'round';
      ctx.lineWidth = 2;
      ctx.strokeStyle =
        lvl > 0
          ? `rgba(255,70,110,${0.4 + 0.5 * lvl * (0.5 + 0.5 * Math.sin(now * 0.02))})`
          : 'rgba(130,110,190,0.28)';
      ctx.beginPath();
      ctx.moveTo(14, DANGER_Y);
      ctx.lineTo(W - 14, DANGER_Y);
      ctx.stroke();
      ctx.restore();
    }

    // Aim guide + held slime
    if (play && !this.over) {
      const x = this.clampAim();
      const r = this.heldR;
      const g = ctx.createLinearGradient(0, DROP_Y, 0, H);
      g.addColorStop(0, 'rgba(255,255,255,0.55)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.fillRect(x - 1, DROP_Y + r, 2, H);
      drawSlime(ctx, x, DROP_Y + Math.sin(now * 0.004) * 2, r, this.current, {
        t: now,
        alpha: this.canDrop ? 1 : 0.35,
        px: k,
        lookY: 1,
      });
    }

    for (const b of this.bodies()) {
      const p = b.plugin;
      let blink = false;
      if (now > p.blinkAt) {
        if (now > p.blinkAt + 140) p.blinkAt = now + 2000 + Math.random() * 5000;
        else blink = true;
      }
      drawSlime(ctx, b.position.x, b.position.y, p.r, p.tier, {
        j: p.j,
        t: now,
        seed: p.seed,
        lookX: Math.max(-1, Math.min(1, (this.aimX - b.position.x) / 150)),
        lookY: -0.3,
        blink: blink && !p.dead,
        worried: p.dead || (lvl > 0.15 && b.position.y < DANGER_Y + 140),
        px: k,
      });
    }

    for (const r of this.rings) {
      ctx.globalAlpha = r.life;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = 4 * r.life;
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r * (1 + (1 - r.life) * 0.7), 0, Math.PI * 2);
      ctx.stroke();
    }
    for (const p of this.particles) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * (0.5 + p.life * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    ctx.textAlign = 'center';
    ctx.lineJoin = 'round';
    for (const t of this.texts) {
      ctx.globalAlpha = Math.min(1, t.life * 2);
      const size = 18 + Math.min(t.combo, 6) * 3;
      ctx.font = `700 ${size}px Fredoka, ui-rounded, system-ui, sans-serif`;
      ctx.lineWidth = 5;
      ctx.strokeStyle = t.color;
      ctx.strokeText(t.s, t.x, t.y);
      ctx.fillStyle = '#fff';
      ctx.fillText(t.s, t.x, t.y);
      if (t.combo > 1) {
        ctx.font = `700 13px Fredoka, ui-rounded, system-ui, sans-serif`;
        ctx.lineWidth = 4;
        ctx.strokeText(`combo ×${t.combo}`, t.x, t.y + 18);
        ctx.fillText(`combo ×${t.combo}`, t.x, t.y + 18);
      }
    }
    ctx.globalAlpha = 1;
  }
}
