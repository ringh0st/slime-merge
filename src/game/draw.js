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

/**
 * Draw a slime (tier >= 0) or a rock (tier < 0) centred at x,y.
 * opts: j (squash), t (time ms), seed, lookX/lookY (-1..1), blink, worried, alpha, px (device px per unit)
 */
export function drawSlime(ctx, x, y, r, tier, opts = {}) {
  const { j = 0, t = 0, seed = 0, lookX = 0, lookY = 0, blink = false, worried = false, alpha = 1, px = 1 } = opts;
  const rock = tier < 0;
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
  ctx.fillStyle = g;
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
  const ink = '#2A1D3A';
  const fy = r * 0.08;
  const ex = r * 0.3;
  const er = Math.max(1.4, r * 0.12);
  const lx = lookX * er * 0.45;
  const ly = lookY * er * 0.35;
  ctx.fillStyle = ink;
  ctx.strokeStyle = ink;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(1, r * 0.05);

  if (rock || blink) {
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
    ctx.fillStyle = '#fff';
    for (const sx of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(sx * ex + lx - er * 0.32, fy + ly - er * 0.42, er * 0.38, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Cheeks
  if (!rock && r >= 18) {
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
  } else {
    ctx.beginPath();
    ctx.arc(0, fy + er * 0.8, er * 0.7, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
  }

  if (tier === 9) crown(ctx, r);
  ctx.restore();
}
