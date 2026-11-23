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
/** In a first game, specials and rocks wait this many drops longer. */
const GENTLE_DELAY = 8;
const BOMB_FUSE_MS = 900;
const BOMB_REACH = 72;
/** The jar of a fight: shorter, with smaller slimes, so two jars fit on one screen (see setShape). */
export const FIGHT_SHAPE = { height: 290, scale: 0.62 };
// Helpers: the player starts with one Shake and one Pop, earns more by scoring, and holds at most three of each.
const HELPER_COST = 350;
const HELPER_CAP = 3;
const KIND_OF = { [ROCK_TIER]: 'rock', [RAINBOW_TIER]: 'rainbow', [BOMB_TIER]: 'bomb' };
const ICE = '#BFE9FF';
// The gumball jar's pegs and the hourglass jar's waist (in the tall jar's own measures).
const PEGS = [
  [105, 200],
  [295, 200],
  [200, 285],
];
const PEG_R = 9;
const WAIST = { y: 300, r: 120, reach: 78 };
// The windy jar: a gust every few seconds, announced a moment before it blows.
// The twin jar's wall down the middle, the squeeze jar's breathing walls, the magnet jar's pull between twins.
const DIVIDER = { height: 240, thick: 14 };
const SQUEEZE = { reach: 34, seconds: 9 };
const MAGNET = { reach: 130, pull: 0.05 };
const WALL_T = 100;
// The arcade jars. Maze: glowing dots to eat (big ones are worth more). Bricks: a row to smash, which comes back.
// Paddle: a bat that slides from side to side and knocks pieces away.
const DOTS = { cols: 6, rows: 7, top: 170, r: 5, points: 5, bigPoints: 25, backAfter: 10000 };
const BRICKS = { count: 6, y: 300, h: 22, gap: 4, points: 20, backEvery: 8, colors: ['#ff5d73', '#ff9f43', '#ffd93d', '#6bcb77', '#4d96ff', '#b983ff'] };
const PADDLE = { y: 235, w: 104, h: 14, from: 62, to: 338, seconds: 6.5 };
const WIND = { every: 6500, warn: 1500, blow: 1900, pull: 0.5 };

export class Game {
  constructor(canvas, cb = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.cb = cb;
    this.scale = 1;
    this.dpr = 1;
    this.jar = JARS[0];
    // The jar's height, how big the slimes are in it, and where the danger line and the waiting slime sit.
    this.h = H;
    this.rScale = 1;
    this.dangerY = DANGER_Y;
    this.dropY = DROP_Y;
    this.tilt = 0;
    // How far the squeeze jar's walls stand in right now, and which twins the magnet jar is pulling together.
    this.inset = 0;
    this.pulls = [];
    this.dots = [];
    this.bricks = [];
    this.paddle = null;
    this.paddleDir = 1;
    this.fierce = false;
    this.gentle = false;
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

  /**
   * @param pixelWidth for an arcade jar: the jar is drawn this many pixels wide on a small hidden canvas and copied
   *   up without smoothing, so every pixel shows as a block (0 for the normal smooth drawing)
   */
  resize(cssW, cssH, dpr, pixelWidth = 0) {
    this.dpr = dpr;
    this.scale = cssW / W;
    this.canvas.width = Math.round(cssW * dpr);
    this.canvas.height = Math.round(cssH * dpr);
    this.small = null;
    if (pixelWidth) {
      this.small = document.createElement('canvas');
      this.small.width = pixelWidth;
      this.small.height = Math.round((pixelWidth * cssH) / cssW);
    }
  }

  buildWalls() {
    if (this.walls) Composite.remove(this.world, this.walls);
    if (this.bricks?.length) Composite.remove(this.world, this.bricks);
    const T = WALL_T;
    const opts = { isStatic: true, friction: 0.5, restitution: 0.1 };
    // The side the pieces settle on is closed, the other one is open: the floor, or the lid of an upside-down jar.
    const up = this.isUpsideDown;
    const sideY = up ? this.h / 2 + H : this.h / 2 - H;
    this.walls = [
      Bodies.rectangle(W / 2, up ? -T / 2 : this.h + T / 2, W + T * 2, T, opts),
      Bodies.rectangle(-T / 2, sideY, T, H * 3, opts),
      Bodies.rectangle(W + T / 2, sideY, T, H * 3, opts),
    ];
    this.sideWalls = [this.walls[1], this.walls[2]];
    this.inset = 0;
    if (this.jar.hasDivider) {
      // A wall with a round top, so nothing balances on a sharp corner.
      const top = this.h - DIVIDER.height;
      this.walls.push(Bodies.rectangle(W / 2, this.h - DIVIDER.height / 2 + DIVIDER.thick / 4, DIVIDER.thick, DIVIDER.height - DIVIDER.thick / 2, opts));
      this.walls.push(Bodies.circle(W / 2, top + DIVIDER.thick / 2, DIVIDER.thick / 2, opts));
    }
    this.bricks = [];
    this.paddle = null;
    if (this.jar.hasBricks) this.layBricks();
    if (this.jar.hasPaddle) {
      // Slippery and springy, so nothing rides on it: it slides out from under whatever lands there.
      this.paddle = Bodies.rectangle(W / 2, PADDLE.y, PADDLE.w, PADDLE.h, { isStatic: true, friction: 0, restitution: 0.85, chamfer: { radius: PADDLE.h / 2 } });
      this.walls.push(this.paddle);
    }
    if (this.jar.hasPegs) for (const [x, y] of PEGS) this.walls.push(Bodies.circle(x, y, PEG_R, { isStatic: true, friction: 0.05, restitution: 0.9 }));
    if (this.jar.hasWaist) {
      // Two round bulges in the side walls leave a narrow middle.
      for (const x of [WAIST.reach - WAIST.r, W - WAIST.reach + WAIST.r]) this.walls.push(Bodies.circle(x, WAIST.y, WAIST.r, { isStatic: true, friction: 0.2, restitution: 0.1 }));
    }
    if (this.jar.isRound) {
      // A round bottom: short flat pieces along a half circle as wide as the jar.
      const R = W / 2;
      const N = 18;
      for (let i = 0; i < N; i++) {
        const a = ((i + 0.5) / N) * Math.PI;
        const piece = Bodies.rectangle(R + Math.cos(a) * (R + 20), this.h - R + Math.sin(a) * (R + 20), 40, (Math.PI * R) / N + 10, opts);
        Body.setAngle(piece, a);
        this.walls.push(piece);
      }
    }
    Composite.add(this.world, this.walls);
  }

  /** The brick jar: put back every brick that is gone and whose place is free. */
  layBricks() {
    const w = (W - BRICKS.gap * (BRICKS.count + 1)) / BRICKS.count;
    const pieces = this.bodies();
    for (let i = 0; i < BRICKS.count; i++) {
      if (this.bricks.some((brick) => brick.plugin.slot === i)) continue;
      const x = BRICKS.gap + w / 2 + i * (w + BRICKS.gap);
      const isFree = pieces.every((b) => Math.abs(b.position.x - x) > w / 2 + b.plugin.r || Math.abs(b.position.y - BRICKS.y) > BRICKS.h / 2 + b.plugin.r);
      if (!isFree) continue;
      const brick = Bodies.rectangle(x, BRICKS.y, w, BRICKS.h, { isStatic: true, friction: 0.4, restitution: 0.2 });
      brick.plugin = { brick: true, slot: i, hits: 0, w };
      this.bricks.push(brick);
      Composite.add(this.world, brick);
    }
  }

  /** A brick takes a knock; the second one breaks it. */
  hitBrick(brick) {
    if (!this.bricks.includes(brick)) return;
    brick.plugin.hits++;
    const color = BRICKS.colors[brick.plugin.slot];
    if (brick.plugin.hits < 2) {
      this.burst(brick.position.x, brick.position.y, color, 5, 10);
      return;
    }
    this.bricks = this.bricks.filter((b) => b !== brick);
    Composite.remove(this.world, brick);
    this.burst(brick.position.x, brick.position.y, color, 16, 24);
    if (this.mode === 'play') {
      this.text(brick.position.x, brick.position.y, `+${BRICKS.points}`, color, 1);
      this.addScore(BRICKS.points);
      sfx.rock();
    }
  }

  /** Switch to another jar (only between games): its gravity, feel and shape. */
  setJar(jar) {
    this.jar = jar;
    this.layout();
    this.buildWalls();
  }

  /** An upside-down jar: pieces float up, are let go at the bottom and pile under the lid. */
  get isUpsideDown() {
    return Boolean(this.jar.isUpsideDown);
  }

  /** Which way pieces fall (1 down, -1 up). */
  get fall() {
    return this.isUpsideDown ? -1 : 1;
  }

  /** Where the danger line and the waiting slime sit, and which way the jar pulls. */
  layout() {
    const line = Math.round(DANGER_Y * this.rScale);
    const wait = Math.round(DROP_Y * this.rScale);
    this.dangerY = this.isUpsideDown ? this.h - line : line;
    this.dropY = this.isUpsideDown ? this.h - wait : wait;
    this.engine.gravity.x = 0;
    this.engine.gravity.y = this.jar.gravity * this.fall;
    this.setTilt(0);
    this.wind = { nextAt: this.simTime + WIND.every, dir: 1, power: 0, warning: 0 };
  }

  /** The ship jar leans (radians, clockwise); the game's page leans the jar on screen to match. */
  setTilt(angle) {
    if (angle === this.tilt) return;
    this.tilt = angle;
    this.cb.onTilt?.(angle);
  }

  /**
   * The jar's shape (only between games): the normal tall jar, or FIGHT_SHAPE. A smaller scale shrinks every piece
   * and moves the danger line and the waiting slime up to match.
   */
  setShape({ height = H, scale = 1 } = {}) {
    this.h = height;
    this.rScale = scale;
    this.fierce = scale < 1;
    this.layout();
    this.buildWalls();
  }

  /** How big a piece is in this jar. */
  radius(tier) {
    return tierInfo(tier).r * this.rScale;
  }

  /** What the other player of a fight needs to draw this jar: every piece, and the one waiting to drop. */
  snapshot() {
    return {
      a: Math.round(this.clampAim()),
      c: this.current.tier,
      f: this.current.frozen ? 1 : 0,
      b: this.bodies().map((b) => [b.id, b.plugin.tier, Math.round(b.position.x), Math.round(b.position.y), b.plugin.frozen ? 1 : 0]),
    };
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
    // A player's very first game stays plain for a while (`gentle`), so the basics come first.
    const late = this.gentle ? GENTLE_DELAY : 0;
    if (this.drops >= 18 + late && this.drops % 7 === 0) return { tier: ROCK_TIER };
    const isDue = !this.hadSpecial && this.drops >= FIRST_SPECIAL_BY_DROP + late;
    if (this.drops >= SPECIALS_FROM_DROP + late && (this.rng() < SPECIAL_CHANCE || isDue)) {
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
    // The random source counts its calls, so a saved game can pick up the same series of pieces (restore).
    const source = randomFrom(seed);
    this.rngCalls = 0;
    this.rng = () => {
      this.rngCalls++;
      return source();
    };
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
    this.dots = this.jar.hasDots ? this.freshDots() : [];
    if (this.jar.hasBricks) {
      if (this.bricks.length) Composite.remove(this.world, this.bricks);
      this.bricks = [];
      this.layBricks();
    }
    this.wind = { nextAt: this.simTime + WIND.every, dir: 1, power: 0, warning: 0 };
    // Counted for the goals (goals.js).
    this.run = { kings: 0, rocks: 0, maxCombo: 0, rainbows: 0 };
    if (mode === 'play') {
      this.cb.onScore?.(0);
      this.cb.onNext?.(this.next);
      this.cb.onDanger?.(0);
      this.cb.onHelpers?.(this.helperState());
    }
  }

  /**
   * Everything needed to continue this game later (a closed tab, a locked phone): the numbers, the pieces waiting
   * and every piece in the jar. Null when there is no game to keep.
   */
  serialize() {
    if (this.mode !== 'play' || this.over) return null;
    return {
      score: this.score,
      drops: this.drops,
      runMax: this.runMax,
      current: this.current,
      next: this.next,
      held: this.held,
      helpers: this.helpers,
      charge: this.charge,
      hadSpecial: this.hadSpecial,
      run: this.run,
      rngCalls: this.rngCalls,
      bodies: this.bodies()
        .filter((b) => !b.plugin.merging)
        .map((b) => [b.plugin.tier, Math.round(b.position.x), Math.round(b.position.y), b.plugin.frozen ? 1 : 0]),
    };
  }

  /** Continue a game saved by serialize(). The seed must be the one the game was started with. */
  restore(saved, seed = null) {
    this.reset('play', seed);
    for (let i = 0; i < saved.rngCalls; i++) this.rng();
    Object.assign(this, {
      score: saved.score,
      drops: saved.drops,
      runMax: saved.runMax,
      current: saved.current,
      next: saved.next,
      held: saved.held,
      helpers: { ...saved.helpers },
      charge: saved.charge,
      hadSpecial: saved.hadSpecial,
      run: { ...saved.run },
    });
    for (const [tier, x, y, frozen] of saved.bodies) {
      const b = this.spawn(tier, x, y, null, Boolean(frozen));
      // Pieces already lying in the jar: no "just born" grace before they count against the line.
      b.plugin.born = -1e9;
      // A bomb that was waiting to go off starts its fuse again.
      if (b.plugin.kind === 'bomb') b.plugin.fuseAt = this.simTime + BOMB_FUSE_MS;
    }
    this.cb.onScore?.(this.score);
    this.cb.onNext?.(this.next);
    this.cb.onDanger?.(0);
    this.cb.onHelpers?.(this.helperState());
  }

  /** Start a game. With a seed (the daily jar) the same pieces drop for everyone. */
  start(seed = null) {
    this.reset('play', seed);
  }

  /** The maze jar's dots: a grid with a big one in each corner. */
  freshDots() {
    const dots = [];
    const stepX = W / DOTS.cols;
    const stepY = (this.h - 40 - DOTS.top) / (DOTS.rows - 1);
    for (let row = 0; row < DOTS.rows; row++) {
      for (let col = 0; col < DOTS.cols; col++) {
        const isBig = (row === 0 || row === DOTS.rows - 1) && (col === 0 || col === DOTS.cols - 1);
        dots.push({ x: stepX / 2 + col * stepX, y: DOTS.top + row * stepY, isBig, backAt: 0 });
      }
    }
    return dots;
  }

  /** A slime that touches a dot eats it. A dot comes back after a while, once nothing lies on it. */
  eatDots(list) {
    for (const dot of this.dots) {
      const touching = list.some((b) => Math.hypot(b.position.x - dot.x, b.position.y - dot.y) < b.plugin.r + DOTS.r);
      if (dot.backAt) {
        if (touching) dot.backAt = Math.max(dot.backAt, this.simTime + 1500);
        else if (this.simTime >= dot.backAt) dot.backAt = 0;
        continue;
      }
      if (!touching) continue;
      dot.backAt = this.simTime + DOTS.backAfter;
      if (this.mode !== 'play') continue;
      const points = dot.isBig ? DOTS.bigPoints : DOTS.points;
      this.addScore(points);
      if (dot.isBig) {
        this.text(dot.x, dot.y, `+${points}`, '#ffd93d', 1);
        this.ring(dot.x, dot.y, 16, '#ffd93d');
      }
      sfx.dot(dot.isBig);
    }
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
      Body.setVelocity(b, { x: b.velocity.x + (Math.random() - 0.5) * 14, y: b.velocity.y - (5 + Math.random() * 5) * this.fall });
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
    return this.radius(this.current.tier);
  }

  clampAim() {
    const r = this.heldR;
    return Math.min(W - this.inset - r - 2, Math.max(this.inset + r + 2, this.aimX));
  }

  spawn(tier, x, y, vel, frozen = false) {
    const r = this.radius(tier);
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
    const b = this.spawn(this.current.tier, this.clampAim(), this.dropY, { x: 0, y: this.fall }, Boolean(this.current.frozen));
    b.plugin.jv = -1.4; // stretch as it falls
    this.drops++;
    this.canDrop = false;
    this.dropReadyAt = this.simTime + 480;
    this.current = this.next;
    this.next = this.pickPiece();
    this.canHold = true;
    this.cb.onNext?.(this.next);
    this.cb.onHelpers?.(this.helperState());
    this.cb.onDrop?.(this.drops);
    if (this.jar.hasBricks && this.drops % BRICKS.backEvery === 0) this.layBricks();
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
        // A piece that lands on a brick knocks it.
        if (rv > 1.4) for (const [brick, other] of [[a, pb], [b, pa]]) if (brick.plugin?.brick && other?.kind) this.hitBrick(brick);
        // A piece that lands on the paddle is batted the way the paddle is going.
        for (const [bat, piece] of [[a, b], [b, a]]) {
          if (bat === this.paddle && piece.plugin?.kind) Body.setVelocity(piece, { x: piece.velocity.x + this.paddleDir * 2.2, y: piece.velocity.y });
        }
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
        this.burst(x, y, color, 40, this.radius(t));
        this.burst(x, y, '#FFE27A', 30, this.radius(t));
        this.ring(x, y, this.radius(t) * 1.4, '#FFE27A');
        gained = 250;
        this.crackRocks(x, y, this.radius(t) * 1.5);
        this.thawNear(x, y, this.radius(t) * 1.5);
        if (play) sfx.king();
      } else {
        const nt = t + 1;
        // The new slime hops a little, away from the pile.
        const nb = this.spawn(nt, x, y, { x: vx * 0.5, y: (Math.min(vy * this.fall, 0) - 1.5) * this.fall });
        nb.plugin.j = -0.2;
        this.burst(x, y, color, 10 + t * 2, this.radius(t));
        this.ring(x, y, this.radius(nt), TIERS[nt].color);
        gained = POINTS[nt];
        this.crackRocks(x, y, this.radius(nt));
        this.thawNear(x, y, this.radius(nt));
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
    // A merge right beside a brick knocks it too.
    for (const brick of [...this.bricks]) {
      if (Math.abs(brick.position.x - x) < brick.plugin.w / 2 + R + 10 && Math.abs(brick.position.y - y) < BRICKS.h / 2 + R + 10) this.hitBrick(brick);
    }
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

  /** In a fight: rocks sent by the other player fall into the jar. */
  addRocks(count) {
    if (this.mode !== 'play' || this.over) return;
    for (let i = 0; i < count; i++) {
      const rock = this.spawn(ROCK_TIER, 40 + Math.random() * (W - 80), -20 - i * 40, { x: 0, y: 2 });
      rock.plugin.jv = -1;
    }
    sfx.rock();
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
    const reach = BOMB_REACH * this.rScale;
    this.ring(x, y, reach, '#FFB45E');
    for (const brick of [...this.bricks]) {
      if (Math.hypot(brick.position.x - x, brick.position.y - y) < reach + brick.plugin.w / 2) {
        this.hitBrick(brick);
        this.hitBrick(brick);
      }
    }
    let popped = 0;
    for (const b of this.bodies()) {
      const d = Math.hypot(b.position.x - x, b.position.y - y);
      if (d - b.plugin.r < reach) {
        Composite.remove(this.world, b);
        this.burst(b.position.x, b.position.y, b.plugin.frozen ? ICE : tierInfo(b.plugin.tier).color, 10, b.plugin.r);
        if (b.plugin.kind === 'rock') this.run.rocks++;
        popped++;
      } else if (d < reach * 3) {
        const push = (1 - d / (reach * 3)) * 9;
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

  /**
   * The game ends: the jar overflowed, or (`wasLeft`) the player left it from the pause card. A left game still
   * counts, so its score is kept, but there is no sad sound and no game-over card.
   */
  gameOver(wasLeft = false) {
    this.over = true;
    this.canDrop = false;
    for (const b of this.bodies()) b.plugin.dead = true;
    if (!wasLeft) sfx.over();
    this.cb.onGameOver?.(this.score, this.runMax, this.run, wasLeft);
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
    if (this.jar.rocking) {
      // The ship jar rocks like a boat: the pull leans with it, so the pile slides.
      const angle = ((this.jar.rocking.degrees * Math.PI) / 180) * Math.sin((this.simTime / (this.jar.rocking.seconds * 1000)) * Math.PI * 2);
      this.engine.gravity.x = Math.sin(angle) * this.jar.gravity;
      this.engine.gravity.y = Math.cos(angle) * this.jar.gravity;
      this.setTilt(angle);
    }
    if (this.jar.hasWind && this.mode === 'play') this.blow(list, dt);
    if (this.jar.squeezing) {
      // The squeeze jar breathes: both walls come in and go back out, slowly.
      const inset = SQUEEZE.reach * (0.5 - 0.5 * Math.cos((this.simTime / (SQUEEZE.seconds * 1000)) * Math.PI * 2));
      const [left, right] = this.sideWalls;
      Body.setPosition(left, { x: -WALL_T / 2 + inset, y: left.position.y }, true);
      Body.setPosition(right, { x: W + WALL_T / 2 - inset, y: right.position.y }, true);
      this.inset = inset;
    }
    if (this.jar.hasMagnet) this.pullTwins(list, dt);
    if (this.jar.hasDots) this.eatDots(list);
    if (this.paddle) {
      const swing = Math.sin((this.simTime / (PADDLE.seconds * 1000)) * Math.PI * 2);
      const x = (PADDLE.from + PADDLE.to) / 2 + (swing * (PADDLE.to - PADDLE.from)) / 2;
      this.paddleDir = Math.sign(x - this.paddle.position.x) || 1;
      Body.setPosition(this.paddle, { x, y: PADDLE.y }, true);
    }
    if (this.jar.hasBubbles && this.mode === 'play') {
      // The fish bowl: now and then a bubble lifts one of the small slimes.
      this.nextBubble -= dt;
      if (this.nextBubble <= 0) {
        this.nextBubble = 2200 + Math.random() * 1800;
        const small = list.filter((b) => b.plugin.r < 40 && b.position.y > this.h * 0.5);
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
        const edge = b.position.y - p.r * this.fall;
        if (this.simTime - p.born > 1500 && !p.merging && (this.isUpsideDown ? edge > this.dangerY : edge < this.dangerY)) high = true;
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
        this.spawn(t, 80 + Math.random() * (W - 160), this.isUpsideDown ? this.h + 40 : -40);
      }
    }
  }

  /** The windy jar: an arrow shows where the next gust will come from, then it pushes everything, small pieces most. */
  blow(list, dt) {
    const w = this.wind;
    const since = this.simTime - w.nextAt;
    if (since < -WIND.warn) {
      w.power = 0;
      w.warning = 0;
    } else if (since < 0) {
      if (!w.warning) w.dir = Math.random() < 0.5 ? -1 : 1;
      w.warning = 1 + since / WIND.warn;
      w.power = 0;
    } else if (since < WIND.blow) {
      if (w.warning) sfx.shake();
      w.warning = 0;
      w.power = Math.sin((since / WIND.blow) * Math.PI);
      for (const b of list) {
        if (b.plugin.r < 40) Body.setVelocity(b, { x: b.velocity.x + w.dir * w.power * 0.05 * (dt / 16.67), y: b.velocity.y });
      }
    } else {
      w.power = 0;
      w.nextAt = this.simTime + WIND.every;
    }
    this.engine.gravity.x = w.dir * w.power * WIND.pull;
  }

  /** The magnet jar: two slimes of the same kind that are close pull toward each other. */
  pullTwins(list, dt) {
    this.pulls = [];
    const f = dt / 16.67;
    const reach = MAGNET.reach * this.rScale;
    for (let i = 0; i < list.length; i++) {
      const a = list[i];
      if (a.plugin.kind !== 'slime' || a.plugin.frozen || a.plugin.merging) continue;
      for (let j = i + 1; j < list.length; j++) {
        const b = list[j];
        if (b.plugin.kind !== 'slime' || b.plugin.tier !== a.plugin.tier || b.plugin.frozen || b.plugin.merging) continue;
        const dx = b.position.x - a.position.x;
        const dy = b.position.y - a.position.y;
        const d = Math.hypot(dx, dy) || 1;
        const gap = d - a.plugin.r - b.plugin.r;
        if (gap > reach) continue;
        const pull = MAGNET.pull * (1 - Math.max(0, gap) / reach) * f;
        Body.setVelocity(a, { x: a.velocity.x + (dx / d) * pull, y: a.velocity.y + (dy / d) * pull });
        Body.setVelocity(b, { x: b.velocity.x - (dx / d) * pull, y: b.velocity.y - (dy / d) * pull });
        this.pulls.push([a, b, 1 - Math.max(0, gap) / reach]);
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

  /** A balloon's string: it hangs under the slime and sways. */
  drawString(ctx, b, now) {
    const { x, y } = b.position;
    const r = b.plugin.r;
    const sway = Math.sin(now * 0.003 + b.plugin.seed) * 4 - b.velocity.x * 2;
    ctx.strokeStyle = 'rgba(120, 100, 170, 0.6)';
    ctx.lineWidth = 1.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y + r - 1);
    ctx.quadraticCurveTo(x + sway, y + r + 10, x - sway * 0.6, y + r + 14 + r * 0.35);
    ctx.stroke();
  }

  /** What stands in a jar: the gumball jar's pegs, the hourglass jar's waist, the windy jar's gusts. */
  drawFittings(ctx, now) {
    if (this.jar.hasDots) {
      for (const dot of this.dots) {
        if (dot.backAt) continue;
        const r = dot.isBig ? DOTS.r * 2 * (0.85 + 0.15 * Math.sin(now * 0.008)) : DOTS.r;
        ctx.fillStyle = dot.isBig ? '#ffd93d' : '#ffe9a8';
        ctx.fillRect(dot.x - r, dot.y - r, r * 2, r * 2);
      }
    }
    for (const brick of this.bricks) {
      const { x, y } = brick.position;
      const w = brick.plugin.w;
      ctx.fillStyle = BRICKS.colors[brick.plugin.slot];
      ctx.fillRect(x - w / 2, y - BRICKS.h / 2, w, BRICKS.h);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.fillRect(x - w / 2, y - BRICKS.h / 2, w, 5);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
      ctx.fillRect(x - w / 2, y + BRICKS.h / 2 - 5, w, 5);
      if (brick.plugin.hits) {
        // A crack.
        ctx.strokeStyle = 'rgba(20, 10, 40, 0.8)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x - 10, y - BRICKS.h / 2);
        ctx.lineTo(x + 2, y - 2);
        ctx.lineTo(x - 5, y + 2);
        ctx.lineTo(x + 8, y + BRICKS.h / 2);
        ctx.stroke();
      }
    }
    if (this.paddle) {
      const { x, y } = this.paddle.position;
      ctx.fillStyle = '#f7f7ff';
      ctx.fillRect(x - PADDLE.w / 2, y - PADDLE.h / 2, PADDLE.w, PADDLE.h);
      ctx.fillStyle = '#4dd4ff';
      ctx.fillRect(x - PADDLE.w / 2, y - PADDLE.h / 2, 14, PADDLE.h);
      ctx.fillRect(x + PADDLE.w / 2 - 14, y - PADDLE.h / 2, 14, PADDLE.h);
    }
    if (this.jar.hasDivider) {
      const top = this.h - DIVIDER.height;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.strokeStyle = 'rgba(139, 92, 246, 0.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(W / 2 - DIVIDER.thick / 2 + 1, top + 1, DIVIDER.thick - 2, DIVIDER.height + 20, DIVIDER.thick / 2);
      ctx.fill();
      ctx.stroke();
    }
    if (this.jar.squeezing && this.inset > 0.5) {
      // The walls standing in: frosted glass with a bright inner edge.
      for (const side of [0, 1]) {
        const x = side ? W - this.inset : 0;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillRect(x, 0, this.inset, this.h);
        ctx.fillStyle = 'rgba(244, 114, 182, 0.75)';
        ctx.fillRect(side ? x : this.inset - 3, 0, 3, this.h);
      }
    }
    if (this.jar.hasMagnet) {
      // A dotted thread of light between twins that are being pulled together.
      ctx.save();
      ctx.setLineDash([3, 6]);
      ctx.lineCap = 'round';
      ctx.lineDashOffset = -now * 0.03;
      for (const [a, b, power] of this.pulls) {
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.25 + 0.6 * power})`;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(a.position.x, a.position.y);
        ctx.lineTo(b.position.x, b.position.y);
        ctx.stroke();
      }
      ctx.restore();
    }
    if (this.jar.hasPegs) {
      for (const [x, y] of PEGS) {
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#ff7aa8';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, y, PEG_R - 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
    }
    if (this.jar.hasWaist) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, W, this.h);
      ctx.clip();
      for (const x of [WAIST.reach - WAIST.r, W - WAIST.reach + WAIST.r]) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.strokeStyle = 'rgba(224, 178, 60, 0.9)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(x, WAIST.y, WAIST.r - 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    }
    if (this.jar.hasWind && this.mode === 'play') {
      const { dir, power, warning } = this.wind;
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (warning > 0) {
        // Three arrows at the side the gust comes from, blinking faster as it gets close.
        const blink = 0.45 + 0.55 * Math.abs(Math.sin(now * (0.006 + warning * 0.01)));
        ctx.strokeStyle = `rgba(70, 150, 125, ${blink})`;
        ctx.lineWidth = 5;
        for (let i = 0; i < 3; i++) {
          const x = (dir > 0 ? 22 : W - 22) + dir * i * 16;
          const y = this.h * 0.42;
          ctx.beginPath();
          ctx.moveTo(x - dir * 7, y - 12);
          ctx.lineTo(x + dir * 5, y);
          ctx.lineTo(x - dir * 7, y + 12);
          ctx.stroke();
        }
      }
      if (power > 0) {
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.9 * power})`;
        ctx.lineWidth = 4;
        for (let i = 0; i < 7; i++) {
          const y = 130 + i * ((this.h - 190) / 6) + Math.sin(i * 2.3) * 14;
          const travel = (((now * 0.45 + i * 131) % (W + 160)) + W + 160) % (W + 160);
          const x = dir > 0 ? travel - 80 : W + 80 - travel;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.bezierCurveTo(x + dir * 22, y - 6, x + dir * 44, y + 6, x + dir * 68, y);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
  }

  render(now) {
    const target = this.small ?? this.canvas;
    const ctx = this.small ? this.small.getContext('2d') : this.ctx;
    const k = this.small ? this.small.width / W : this.scale * this.dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, target.width, target.height);
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
      ctx.moveTo(14, this.dangerY);
      ctx.lineTo(W - 14, this.dangerY);
      ctx.stroke();
      ctx.restore();
    }

    // Aim guide + held slime
    if (play && !this.over) {
      const x = this.clampAim();
      const r = this.heldR;
      const up = this.isUpsideDown;
      const g = ctx.createLinearGradient(0, this.dropY, 0, up ? 0 : this.h);
      g.addColorStop(0, 'rgba(255,255,255,0.55)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      if (up) ctx.fillRect(x - 1, 0, 2, this.dropY - r);
      else ctx.fillRect(x - 1, this.dropY + r, 2, this.h);
      drawSlime(ctx, x, this.dropY + Math.sin(now * 0.004) * 2, r, this.current.tier, {
        t: now,
        alpha: this.canDrop ? 1 : 0.35,
        px: k,
        lookY: this.fall,
        frozen: this.current.frozen,
        hat: this.hat,
        fierce: this.fierce,
      });
    }

    this.drawFittings(ctx, now);

    for (const b of this.bodies()) {
      const p = b.plugin;
      let blink = false;
      if (this.isUpsideDown) this.drawString(ctx, b, now);
      if (now > p.blinkAt) {
        if (now > p.blinkAt + 140) p.blinkAt = now + 2000 + Math.random() * 5000;
        else blink = true;
      }
      drawSlime(ctx, b.position.x, b.position.y, p.r, p.tier, {
        j: p.j,
        t: now,
        seed: p.seed,
        lookX: Math.max(-1, Math.min(1, (this.aimX - b.position.x) / 150)),
        lookY: -0.3 * this.fall,
        blink: blink && !p.dead,
        worried: p.dead || (lvl > 0.15 && (this.dangerY - b.position.y) * this.fall > -140 * this.rScale),
        px: k,
        frozen: p.frozen,
        hat: this.hat,
        fierce: this.fierce,
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

    if (this.small) {
      // The arcade look: the small picture, blown up block by block.
      const screen = this.ctx;
      screen.setTransform(1, 0, 0, 1, 0, 0);
      screen.clearRect(0, 0, this.canvas.width, this.canvas.height);
      screen.imageSmoothingEnabled = false;
      screen.drawImage(this.small, 0, 0, this.canvas.width, this.canvas.height);
    }
  }
}
