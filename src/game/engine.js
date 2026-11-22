import Matter from 'matter-js';
import { TIERS, ROCK, POINTS, DROP_WEIGHTS, ROCK_TIER, RAINBOW_TIER, BOMB_TIER, tierInfo } from './tiers.js';
import { JARS } from './jars.js';
import { randomFrom } from './random.js';
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
// Special pieces: none in the first few drops, one for sure early on (so every game meets them), then about one
// drop in seven.
const SPECIALS_FROM_DROP = 5;
const FIRST_SPECIAL_BY_DROP = 7;
const SPECIAL_CHANCE = 0.14;
const BOMB_FUSE_MS = 900;
const BOMB_REACH = 72;
// Helpers: the player starts with one Shake and one Pop, earns more by scoring, and holds at most three of each.
const HELPER_COST = 350;
const HELPER_CAP = 3;
const KIND_OF = { [ROCK_TIER]: 'rock', [RAINBOW_TIER]: 'rainbow', [BOMB_TIER]: 'bomb' };
const ICE = '#BFE9FF';

export class Game {
  constructor(canvas, cb = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cb = cb;
    this.scale = 1;
    this.dpr = 1;
    this.jar = JARS[0];
    this.hat = null;
    this.rng = Math.random;
    this.engine = Engine.create({ gravity: { y: this.jar.gravity }, positionIterations: 8, velocityIterations: 6 });
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
    if (this.walls) Composite.remove(this.world, this.walls);
    const T = 100;
    const opts = { isStatic: true, friction: 0.5, restitution: 0.1 };
    this.walls = [
      Bodies.rectangle(W / 2, H + T / 2, W + T * 2, T, opts),
      Bodies.rectangle(-T / 2, H / 2 - H, T, H * 3, opts),
      Bodies.rectangle(W + T / 2, H / 2 - H, T, H * 3, opts),
    ];
    if (this.jar.isRound) {
      // A round bottom: short flat pieces along a half circle as wide as the jar.
      const R = W / 2;
      const N = 18;
      for (let i = 0; i < N; i++) {
        const a = ((i + 0.5) / N) * Math.PI;
        const piece = Bodies.rectangle(R + Math.cos(a) * (R + 20), H - R + Math.sin(a) * (R + 20), 40, (Math.PI * R) / N + 10, opts);
        Body.setAngle(piece, a);
        this.walls.push(piece);
      }
    }
    Composite.add(this.world, this.walls);
  }

  /** Switch to another jar (only between games): its gravity, feel and shape. */
  setJar(jar) {
    this.jar = jar;
    this.engine.gravity.y = jar.gravity;
    this.buildWalls();
  }

  /** The hat every bigger slime wears (null for none). */
  setHat(hat) {
    this.hat = hat;
  }

  pickTier() {
    const total = DROP_WEIGHTS.reduce((a, b) => a + b, 0);
    let x = this.rng() * total;
    for (let i = 0; i < DROP_WEIGHTS.length; i++) {
      x -= DROP_WEIGHTS[i];
      if (x < 0) return i;
    }
    return 0;
  }

  /** The piece after the one now waiting: a slime, or now and then a rock or a special. */
  pickPiece() {
    // Rocks start showing up after a while, then every 7th drop.
    if (this.drops >= 18 && this.drops % 7 === 0) return { tier: ROCK_TIER };
    const isDue = !this.hadSpecial && this.drops >= FIRST_SPECIAL_BY_DROP;
    if (this.drops >= SPECIALS_FROM_DROP && (this.rng() < SPECIAL_CHANCE || isDue)) {
      this.hadSpecial = true;
      const pick = this.rng();
      if (pick < 0.4) return { tier: RAINBOW_TIER };
      if (pick < 0.7) return { tier: BOMB_TIER };
      return { tier: this.pickTier(), frozen: true };
    }
    return { tier: this.pickTier() };
  }

  bodies() {
    return Composite.allBodies(this.world).filter((b) => b.plugin && b.plugin.kind);
  }

  reset(mode, seed = null) {
    this.rng = randomFrom(seed);
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
    this.current = { tier: this.pickTier() };
    this.next = { tier: this.pickTier() };
    this.held = null;
    this.canHold = true;
    this.hadSpecial = false;
    this.helpers = { shake: 1, pop: 1 };
    this.charge = 0;
    this.nextBubble = 2500;
    // Counted for the goals (goals.js).
    this.run = { kings: 0, rocks: 0, maxCombo: 0, rainbows: 0 };
    if (mode === 'play') {
      this.cb.onScore?.(0);
      this.cb.onNext?.(this.next);
      this.cb.onDanger?.(0);
      this.cb.onHelpers?.(this.helperState());
    }
  }

  /** Start a game. With a seed (the daily jar) the same pieces drop for everyone. */
  start(seed = null) {
    this.reset('play', seed);
  }

  helperState() {
    return { ...this.helpers, charge: this.charge, held: this.held, canHold: this.canHold };
  }

  /** Points fill the helper meter; a full meter gives one more of whichever helper is lower. */
  addScore(points) {
    this.score += points;
    this.cb.onScore?.(this.score);
    this.charge += points / HELPER_COST;
    while (this.charge >= 1) {
      this.charge -= 1;
      const kind = this.helpers.shake <= this.helpers.pop ? 'shake' : 'pop';
      if (this.helpers[kind] < HELPER_CAP) {
        this.helpers[kind]++;
        sfx.helper();
      }
    }
    this.cb.onHelpers?.(this.helperState());
  }

  /** Helper: everything in the jar jumps, so slimes that almost touch can meet. */
  shake() {
    if (this.mode !== 'play' || this.over || this.paused || this.helpers.shake < 1) return false;
    this.helpers.shake--;
    for (const b of this.bodies()) {
      Body.setVelocity(b, { x: b.velocity.x + (Math.random() - 0.5) * 14, y: b.velocity.y - 5 - Math.random() * 5 });
      b.plugin.jv += 2;
    }
    sfx.shake();
    this.cb.onHelpers?.(this.helperState());
    return true;
  }

  /** Helper: pop the piece at a point of the jar (no points for it). */
  popAt(x, y) {
    if (this.mode !== 'play' || this.over || this.paused || this.helpers.pop < 1) return false;
    const hit = this.bodies()
      .map((b) => ({ b, d: Math.hypot(b.position.x - x, b.position.y - y) - b.plugin.r }))
      .filter(({ d }) => d < 10)
      .sort((p, q) => p.d - q.d)[0];
    if (!hit) return false;
    this.helpers.pop--;
    const { b } = hit;
    Composite.remove(this.world, b);
    this.burst(b.position.x, b.position.y, b.plugin.frozen ? ICE : tierInfo(b.plugin.tier).color, 18, b.plugin.r);
    this.ring(b.position.x, b.position.y, b.plugin.r, '#FF7AA8');
    sfx.pop();
    this.cb.onHelpers?.(this.helperState());
    return true;
  }

  /** Helper: put the waiting piece aside, or swap it with the one put aside. Once per drop, free. */
  hold() {
    if (this.mode !== 'play' || this.over || this.paused || !this.canHold) return false;
    if (this.held) {
      [this.held, this.current] = [this.current, this.held];
    } else {
      this.held = this.current;
      this.current = this.next;
      this.next = this.pickPiece();
      this.cb.onNext?.(this.next);
    }
    this.canHold = false;
    sfx.click();
    this.cb.onHelpers?.(this.helperState());
    return true;
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
    return tierInfo(this.current.tier).r;
  }

  clampAim() {
    const r = this.heldR;
    return Math.min(W - r - 2, Math.max(r + 2, this.aimX));
  }

  spawn(tier, x, y, vel, frozen = false) {
    const r = tierInfo(tier).r;
    const b = Bodies.circle(x, y, r, {
      restitution: this.jar.bounce,
      friction: this.jar.friction,
      frictionStatic: 0.5,
      frictionAir: this.jar.air,
      density: tier === ROCK_TIER ? 0.004 : 0.0012,
      slop: 0.03,
    });
    b.plugin = {
      kind: KIND_OF[tier] ?? 'slime',
      tier,
      frozen,
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
    const b = this.spawn(this.current.tier, this.clampAim(), DROP_Y, { x: 0, y: 1 }, Boolean(this.current.frozen));
    b.plugin.jv = -1.4; // stretch as it falls
    this.drops++;
    this.canDrop = false;
    this.dropReadyAt = this.simTime + 480;
    this.current = this.next;
    this.next = this.pickPiece();
    this.canHold = true;
    this.cb.onNext?.(this.next);
    this.cb.onHelpers?.(this.helperState());
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
        // A bomb's fuse starts the moment it touches anything.
        for (const bomb of [pa, pb]) if (bomb?.kind === 'bomb' && !bomb.fuseAt) bomb.fuseAt = this.simTime + BOMB_FUSE_MS;
      }
      if (this.over || !pa?.kind || !pb?.kind || pa.merging || pb.merging || pa.frozen || pb.frozen) continue;
      if (pa.kind === 'slime' && pb.kind === 'slime' && pa.tier === pb.tier) {
        pa.merging = pb.merging = true;
        this.pending.push([a, b]);
      } else if ((pa.kind === 'rainbow' && pb.kind === 'slime') || (pb.kind === 'rainbow' && pa.kind === 'slime')) {
        // A rainbow becomes the slime it touches, and the two merge where that slime is.
        pa.merging = pb.merging = true;
        this.pending.push(pa.kind === 'slime' ? [a, b] : [b, a]);
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
      const withRainbow = b.plugin.kind === 'rainbow';
      const x = withRainbow ? a.position.x : (a.position.x + b.position.x) / 2;
      const y = withRainbow ? a.position.y : (a.position.y + b.position.y) / 2;
      if (withRainbow) {
        this.burst(b.position.x, b.position.y, '#FFD45E', 8, b.plugin.r);
        this.burst(b.position.x, b.position.y, '#7CC8FF', 8, b.plugin.r);
        if (play) {
          this.run.rainbows++;
          sfx.rainbow();
        }
      }
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
        this.thawNear(x, y, TIERS[t].r * 1.5);
        if (play) sfx.king();
      } else {
        const nt = t + 1;
        const nb = this.spawn(nt, x, y, { x: vx * 0.5, y: Math.min(vy, 0) - 1.5 });
        nb.plugin.j = -0.2;
        this.burst(x, y, color, 10 + t * 2, TIERS[t].r);
        this.ring(x, y, TIERS[nt].r, TIERS[nt].color);
        gained = POINTS[nt];
        this.crackRocks(x, y, TIERS[nt].r);
        this.thawNear(x, y, TIERS[nt].r);
        if (play && nt === TIERS.length - 1) this.run.kings++;
        if (play && nt > this.runMax) {
          this.runMax = nt;
          this.cb.onDiscover?.(nt);
        }
      }
      if (play) {
        this.combo = this.simTime - this.lastMerge < COMBO_MS ? this.combo + 1 : 1;
        this.lastMerge = this.simTime;
        this.run.maxCombo = Math.max(this.run.maxCombo, this.combo);
        const pts = Math.round(gained * (1 + (this.combo - 1) * 0.5));
        this.text(x, y, `+${pts}`, color, this.combo);
        this.addScore(pts);
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
          this.run.rocks++;
          this.text(b.position.x, b.position.y - 10, '+10', ROCK.color, 1);
          this.addScore(10);
          sfx.rock();
        }
      }
    }
  }

  /** A merge right beside a frozen slime breaks its ice, so it can merge again. */
  thawNear(x, y, R) {
    for (const b of this.bodies()) {
      if (!b.plugin.frozen) continue;
      if (Math.hypot(b.position.x - x, b.position.y - y) < R + b.plugin.r + 16) {
        b.plugin.frozen = false;
        b.plugin.jv += 2;
        this.burst(b.position.x, b.position.y, ICE, 14, b.plugin.r);
        if (this.mode === 'play') sfx.thaw();
      }
    }
  }

  /** A bomb goes off: it pops every piece close to it and pushes the rest away. */
  explode(bomb) {
    const { x, y } = bomb.position;
    Composite.remove(this.world, bomb);
    this.burst(x, y, '#FFB45E', 34, 30);
    this.burst(x, y, '#4A4160', 16, 20);
    this.ring(x, y, BOMB_REACH, '#FFB45E');
    let popped = 0;
    for (const b of this.bodies()) {
      const d = Math.hypot(b.position.x - x, b.position.y - y);
      if (d - b.plugin.r < BOMB_REACH) {
        Composite.remove(this.world, b);
        this.burst(b.position.x, b.position.y, b.plugin.frozen ? ICE : tierInfo(b.plugin.tier).color, 10, b.plugin.r);
        if (b.plugin.kind === 'rock') this.run.rocks++;
        popped++;
      } else if (d < BOMB_REACH * 3) {
        const push = (1 - d / (BOMB_REACH * 3)) * 9;
        Body.setVelocity(b, { x: b.velocity.x + ((b.position.x - x) / d) * push, y: b.velocity.y + ((b.position.y - y) / d) * push });
      }
    }
    if (this.mode === 'play') {
      sfx.boom();
      this.cb.onBoom?.();
      if (popped) {
        this.text(x, y, `+${popped * 5}`, '#FFB45E', 1);
        this.addScore(popped * 5);
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
    this.cb.onGameOver?.(this.score, this.runMax, this.run);
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
    for (const b of list) if (b.plugin.kind === 'bomb' && b.plugin.fuseAt && this.simTime >= b.plugin.fuseAt) this.explode(b);
    if (this.jar.hasBubbles && this.mode === 'play') {
      // The fish bowl: now and then a bubble lifts one of the small slimes.
      this.nextBubble -= dt;
      if (this.nextBubble <= 0) {
        this.nextBubble = 2200 + Math.random() * 1800;
        const small = list.filter((b) => b.plugin.r < 40 && b.position.y > H * 0.5);
        const b = small[Math.floor(Math.random() * small.length)];
        if (b) {
          Body.setVelocity(b, { x: b.velocity.x + (Math.random() - 0.5) * 3, y: -7 - Math.random() * 3 });
          this.ring(b.position.x, b.position.y + b.plugin.r, b.plugin.r * 0.8, '#FFFFFF');
          this.burst(b.position.x, b.position.y + b.plugin.r, '#E8FAFF', 6, b.plugin.r);
        }
      }
    }

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
        this.spawn(t, 80 + Math.random() * (W - 160), -40);
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
      drawSlime(ctx, x, DROP_Y + Math.sin(now * 0.004) * 2, r, this.current.tier, {
        t: now,
        alpha: this.canDrop ? 1 : 0.35,
        px: k,
        lookY: 1,
        frozen: this.current.frozen,
        hat: this.hat,
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
        frozen: p.frozen,
        hat: this.hat,
        // A lit fuse flashes faster and faster.
        fuse: p.fuseAt ? 1 - Math.max(0, p.fuseAt - this.simTime) / BOMB_FUSE_MS : 0,
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
