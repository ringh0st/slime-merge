import { tierInfo } from './tiers.js';

// Renders a soft, glossy, toy-like slime with a face.
const shadeCache = new Map();

function hexRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function mix(hex, to, amt) {
  const a = hexRgb(hex);
  return `rgb(${a.map((v, i) => Math.round(v + (to[i] - v) * amt)).join(',')})`;
}
function shades(color) {
  let s = shadeCache.get(color);
  if (!s) {
    s = {
      light: mix(color, [255, 255, 255], 0.6),
      base: color,
      dark: mix(color, [40, 20, 70], 0.3),
    };
    shadeCache.set(color, s);
  }
  return s;
}

function blobPath(ctx, r, t, seed, wob) {
  const N = 30;
  const pts = [];
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const k =
      1 +
      wob * (Math.sin(3 * a + seed + t * 0.0021) * 0.6 + Math.sin(5 * a - seed * 1.7 - t * 0.0013) * 0.4);
    pts.push([Math.cos(a) * r * k, Math.sin(a) * r * k]);
  }
  ctx.beginPath();
  const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  const m0 = mid(pts[N - 1], pts[0]);
  ctx.moveTo(m0[0], m0[1]);
  for (let i = 0; i < N; i++) {
    const p = pts[i];
    const m = mid(p, pts[(i + 1) % N]);
    ctx.quadraticCurveTo(p[0], p[1], m[0], m[1]);
  }
  ctx.closePath();
}

function crown(ctx, r) {
  const w = r * 0.62;
  const y = -r * 0.86;
  ctx.save();
  ctx.translate(0, y);
  ctx.beginPath();
  ctx.moveTo(-w / 2, 0);
  ctx.lineTo(-w / 2, -r * 0.24);
  ctx.lineTo(-w / 4, -r * 0.1);
  ctx.lineTo(0, -r * 0.32);
  ctx.lineTo(w / 4, -r * 0.1);
  ctx.lineTo(w / 2, -r * 0.24);
  ctx.lineTo(w / 2, 0);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, -r * 0.32, 0, 0);
  g.addColorStop(0, '#FFF1A8');
  g.addColorStop(1, '#F5B935');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineJoin = 'round';
  ctx.lineWidth = r * 0.03;
  ctx.strokeStyle = '#D48A1A';
  ctx.stroke();
  ctx.restore();
}

/** The hats from the Slime book (goals.js), drawn on top of a slime of radius r. */
const HAT_ART = {
  top(ctx, r) {
    ctx.fillStyle = '#2A1D3A';
    ctx.beginPath();
    ctx.roundRect(-r * 0.62, -r * 0.92, r * 1.24, r * 0.16, r * 0.08);
    ctx.fill();
    ctx.beginPath();
    ctx.roundRect(-r * 0.38, -r * 1.42, r * 0.76, r * 0.56, r * 0.07);
    ctx.fill();
    ctx.fillStyle = '#FF7AA8';
    ctx.fillRect(-r * 0.38, -r * 1.02, r * 0.76, r * 0.1);
  },
  bow(ctx, r) {
    ctx.fillStyle = '#FF7AA8';
    ctx.strokeStyle = '#D94F84';
    ctx.lineWidth = Math.max(1, r * 0.04);
    ctx.lineJoin = 'round';
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(0, -r * 0.92);
      ctx.lineTo(sx * r * 0.46, -r * 1.2);
      ctx.lineTo(sx * r * 0.46, -r * 0.68);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
    ctx.fillStyle = '#D94F84';
    ctx.beginPath();
    ctx.arc(0, -r * 0.93, r * 0.11, 0, Math.PI * 2);
    ctx.fill();
  },
  party(ctx, r) {
    ctx.beginPath();
    ctx.moveTo(-r * 0.36, -r * 0.84);
    ctx.lineTo(0, -r * 1.6);
    ctx.lineTo(r * 0.36, -r * 0.84);
    ctx.closePath();
    const g = ctx.createLinearGradient(-r * 0.36, 0, r * 0.36, 0);
    g.addColorStop(0, '#7CC8FF');
    g.addColorStop(0.5, '#B4A2FF');
    g.addColorStop(1, '#FF9CC6');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.fillStyle = '#FFD45E';
    ctx.beginPath();
    ctx.arc(0, -r * 1.6, r * 0.12, 0, Math.PI * 2);
    ctx.fill();
  },
  cool(ctx, r) {
    const y = r * 0.06;
    ctx.fillStyle = '#2A1D3A';
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.roundRect(sx * r * 0.3 - r * 0.24, y - r * 0.15, r * 0.48, r * 0.32, r * 0.12);
      ctx.fill();
    }
    ctx.fillRect(-r * 0.1, y - r * 0.09, r * 0.2, r * 0.07);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    for (const sx of [-1, 1]) ctx.fillRect(sx * r * 0.3 - r * 0.15, y - r * 0.1, r * 0.12, r * 0.06);
  },
  flower(ctx, r) {
    ctx.save();
    ctx.translate(r * 0.42, -r * 0.84);
    ctx.fillStyle = '#FFFFFF';
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r * 0.16, Math.sin(a) * r * 0.16, r * 0.13, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#FFD45E';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.11, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  },
  beanie(ctx, r) {
    ctx.fillStyle = '#4fbfad';
    ctx.beginPath();
    ctx.arc(0, -r * 0.62, r * 0.62, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.roundRect(-r * 0.68, -r * 0.74, r * 1.36, r * 0.2, r * 0.1);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(0, -r * 1.26, r * 0.14, 0, Math.PI * 2);
    ctx.fill();
  },
  halo(ctx, r) {
    ctx.strokeStyle = '#ffd45e';
    ctx.lineWidth = Math.max(2, r * 0.11);
    ctx.shadowColor = 'rgba(255,212,94,0.9)';
    ctx.shadowBlur = r * 0.35;
    ctx.beginPath();
    ctx.ellipse(0, -r * 1.2, r * 0.5, r * 0.15, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowColor = 'transparent';
  },
  crown,
  // The jar-star hats (goals.js): a gold star clip, a wizard's hat and a little sprout.
  star(ctx, r) {
    ctx.save();
    ctx.translate(-r * 0.4, -r * 0.84);
    ctx.rotate(-0.25);
    ctx.fillStyle = '#FFD45E';
    ctx.strokeStyle = '#E0A92A';
    ctx.lineWidth = Math.max(1, r * 0.04);
    ctx.lineJoin = 'round';
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const d = i % 2 ? r * 0.12 : r * 0.27;
      ctx.lineTo(Math.cos(a) * d, Math.sin(a) * d);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  },
  wizard(ctx, r) {
    ctx.fillStyle = '#4A6FD8';
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.84, r * 0.66, r * 0.13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-r * 0.42, -r * 0.86);
    ctx.quadraticCurveTo(-r * 0.1, -r * 1.3, r * 0.22, -r * 1.75);
    ctx.quadraticCurveTo(r * 0.12, -r * 1.3, r * 0.42, -r * 0.86);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#FFD45E';
    for (const [x, y, s] of [[-0.12, -1.05, 0.08], [0.16, -1.25, 0.06], [0.02, -1.48, 0.05]]) {
      ctx.beginPath();
      ctx.arc(r * x, r * y, r * s, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  sprout(ctx, r) {
    ctx.strokeStyle = '#4E9F3D';
    ctx.lineWidth = Math.max(1.5, r * 0.07);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.92);
    ctx.lineTo(0, -r * 1.22);
    ctx.stroke();
    ctx.fillStyle = '#7ED957';
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(sx * r * 0.2, -r * 1.3, r * 0.22, r * 0.11, sx * -0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  },
};

/** Hats sit on slimes big enough to carry one. */
export const HAT_MIN_R = 26;

function iceBlock(ctx, r) {
  const a = r * 1.08;
  ctx.beginPath();
  ctx.roundRect(-a, -a, a * 2, a * 2, r * 0.32);
  ctx.fillStyle = 'rgba(190,233,255,0.5)';
  ctx.fill();
  ctx.lineWidth = Math.max(1.5, r * 0.07);
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.stroke();
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(-a * 0.7, -a * 0.35);
  ctx.lineTo(-a * 0.35, -a * 0.7);
  ctx.moveTo(a * 0.4, a * 0.72);
  ctx.lineTo(a * 0.72, a * 0.4);
  ctx.stroke();
}

function fuse(ctx, r, t, lit) {
  ctx.strokeStyle = '#8A6A3A';
  ctx.lineWidth = Math.max(1.5, r * 0.12);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(r * 0.35, -r * 0.85);
  ctx.quadraticCurveTo(r * 0.6, -r * 1.35, r * 0.95, -r * 1.2);
  ctx.stroke();
  // The spark: quiet until the fuse is lit, then flashing faster as it burns down.
  const flash = lit > 0 ? 0.6 + 0.4 * Math.sin(t * (0.02 + lit * 0.05)) : 0.75;
  ctx.fillStyle = lit > 0 ? '#FF7A3D' : '#FFD45E';
  ctx.beginPath();
  ctx.arc(r * 0.98, -r * 1.2, r * (0.16 + 0.12 * flash), 0, Math.PI * 2);
  ctx.fill();
}

/**
 * Draw a slime (tier >= 0), a rock (-1), a rainbow (-2) or a bomb (-3) centred at x,y.
 * opts: j (squash), t (time ms), seed, lookX/lookY (-1..1), blink, worried, alpha, px (device px per unit),
 *       frozen (in an ice block), hat (a HAT_ART id; forceHat puts it on small slimes too, for icons),
 *       fuse (0 = not lit … 1 = about to go off)
 *       fierce (a fight: lowered brows and a grin instead of the sweet face)
 */
export function drawSlime(ctx, x, y, r, tier, opts = {}) {
  const { j = 0, t = 0, seed = 0, lookX = 0, lookY = 0, blink = false, worried = false, alpha = 1, px = 1 } = opts;
  const rock = tier === -1;
  const rainbow = tier === -2;
  const bomb = tier === -3;
  const s = shades(tierInfo(tier).color);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.scale(1 + j, 1 - j);

  // Body with a soft drop shadow
  blobPath(ctx, r, t, seed, rock ? 0.05 : 0.02);
  const g = ctx.createRadialGradient(-r * 0.35, -r * 0.42, r * 0.05, 0, 0, r * 1.1);
  g.addColorStop(0, s.light);
  g.addColorStop(0.5, s.base);
  g.addColorStop(1, s.dark);
  if (rainbow) {
    // Every slime color at once, slowly turning.
    const turn = t * 0.0006 + seed;
    const band = ctx.createLinearGradient(Math.cos(turn) * -r, Math.sin(turn) * -r, Math.cos(turn) * r, Math.sin(turn) * r);
    ['#FF9CC6', '#FFD45E', '#7EE8C7', '#7CC8FF', '#C285FF'].forEach((color, i) => band.addColorStop(i / 4, color));
    ctx.fillStyle = band;
  } else ctx.fillStyle = g;
  ctx.shadowColor = 'rgba(50,25,90,0.25)';
  ctx.shadowBlur = r * 0.45 * px;
  ctx.shadowOffsetY = r * 0.16 * px;
  ctx.fill();
  ctx.shadowColor = 'transparent';

  // Bounce light on the lower edge, clipped to the body
  ctx.save();
  ctx.clip();
  const rim = ctx.createRadialGradient(r * 0.3, r * 0.75, 0, r * 0.3, r * 0.75, r * 0.85);
  rim.addColorStop(0, 'rgba(255,255,255,0.32)');
  rim.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = rim;
  ctx.fillRect(-r * 1.2, -r * 1.2, r * 2.4, r * 2.4);
  if (rock) {
    ctx.strokeStyle = 'rgba(60,60,80,0.35)';
    ctx.lineWidth = Math.max(1, r * 0.06);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(r * 0.2, -r * 0.9);
    ctx.lineTo(r * 0.05, -r * 0.5);
    ctx.lineTo(r * 0.35, -r * 0.3);
    ctx.moveTo(-r * 0.9, r * 0.2);
    ctx.lineTo(-r * 0.55, r * 0.35);
    ctx.stroke();
  }
  ctx.restore();

  // Specular highlight
  if (bomb) fuse(ctx, r, t, opts.fuse ?? 0);
  if (!rock) {
    ctx.save();
    ctx.translate(-r * 0.36, -r * 0.46);
    ctx.rotate(-0.6);
    ctx.scale(1, 0.55);
    const sp = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 0.32);
    sp.addColorStop(0, 'rgba(255,255,255,0.95)');
    sp.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = sp;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.32, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.arc(-r * 0.08, -r * 0.66, r * 0.055, 0, Math.PI * 2);
    ctx.fill();
  }

  // Face
  const ink = bomb ? '#FFFFFF' : '#2A1D3A';
  const fy = r * 0.08;
  const ex = r * 0.3;
  const er = Math.max(1.4, r * 0.12);
  const lx = lookX * er * 0.45;
  const ly = lookY * er * 0.35;
  ctx.fillStyle = ink;
  ctx.strokeStyle = ink;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(1, r * 0.05);

  if (rock || blink || opts.frozen) {
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sx * ex - er * 0.8, fy);
      ctx.lineTo(sx * ex + er * 0.8, fy);
      ctx.stroke();
    }
  } else {
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(sx * ex + lx, fy + ly, er, er * 1.18, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = bomb ? '#4A4160' : '#fff';
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(sx * ex + lx - er * 0.32, fy + ly - er * 0.42, er * 0.38, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // In a fight slimes mean business: brows slanting down toward the nose.
  const fierce = opts.fierce && !rock && !bomb && !opts.frozen;
  if (fierce) {
    ctx.strokeStyle = ink;
    ctx.lineWidth = Math.max(1.2, r * 0.075);
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sx * (ex + er * 1.25), fy - er * 2.05);
      ctx.lineTo(sx * (ex - er * 0.95), fy - er * 1.2);
      ctx.stroke();
    }
    ctx.lineWidth = Math.max(1, r * 0.05);
  }

  // Cheeks
  if (!rock && !bomb && !fierce && r >= 18) {
    ctx.fillStyle = 'rgba(255,110,150,0.35)';
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.ellipse(sx * (ex + er * 1.25), fy + er * 1.35, er * 1.0, er * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Mouth
  ctx.fillStyle = ink;
  if (worried && !rock) {
    ctx.beginPath();
    ctx.ellipse(0, fy + er * 1.7, er * 0.45, er * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (rock) {
    ctx.beginPath();
    ctx.moveTo(-er * 0.5, fy + er * 1.5);
    ctx.lineTo(er * 0.5, fy + er * 1.5);
    ctx.stroke();
  } else if (fierce) {
    // A wide grin with teeth.
    ctx.beginPath();
    ctx.moveTo(-er * 1.15, fy + er * 1.15);
    ctx.quadraticCurveTo(0, fy + er * 2.5, er * 1.15, fy + er * 1.15);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillRect(-er * 0.75, fy + er * 1.17, er * 1.5, er * 0.36);
  } else {
    ctx.beginPath();
    ctx.arc(0, fy + er * 0.8, er * 0.7, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  }

  // The King always wears its crown; other slimes wear the player's hat when they are big enough for it.
  if (tier === 9) crown(ctx, r);
  else if (tier >= 0 && opts.hat && (r >= HAT_MIN_R || opts.forceHat) && HAT_ART[opts.hat]) {
    ctx.save();
    HAT_ART[opts.hat](ctx, r);
    ctx.restore();
  }
  if (opts.frozen) iceBlock(ctx, r);
  ctx.restore();
}
