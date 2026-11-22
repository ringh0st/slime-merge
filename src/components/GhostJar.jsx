import { useEffect, useRef } from 'react';
import { drawSlime } from '../game/draw.js';
import { tierInfo } from '../game/tiers.js';
import { FIGHT_SHAPE, W } from '../game/engine.js';

/**
 * The other player's jar in a fight, drawn live from what their game sends five times a second
 * (`jarRef.current`, see Game.snapshot). Pieces glide between the positions heard, so it moves smoothly.
 */
export default function GhostJar({ jarRef, hat, width, height, dangerY }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    const k = (width / W) * dpr;
    // Where each piece is drawn now, by its id: it moves a part of the way to its newest position every frame.
    const shown = new Map();
    let frame = 0;
    const draw = (now) => {
      frame = requestAnimationFrame(draw);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(k, 0, 0, k, 0, 0);
      ctx.setLineDash([6, 9]);
      ctx.lineCap = 'round';
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgba(255,93,143,0.45)';
      ctx.beginPath();
      ctx.moveTo(14, dangerY);
      ctx.lineTo(W - 14, dangerY);
      ctx.stroke();
      ctx.setLineDash([]);
      const jar = jarRef.current;
      if (!jar) return;
      const live = new Set();
      for (const [id, tier, x, y, frozen] of jar.b) {
        live.add(id);
        const at = shown.get(id) ?? { x, y };
        at.x += (x - at.x) * 0.35;
        at.y += (y - at.y) * 0.35;
        shown.set(id, at);
        drawSlime(ctx, at.x, at.y, tierInfo(tier).r * FIGHT_SHAPE.scale, tier, { t: now, seed: id, px: k, hat, frozen: Boolean(frozen), fierce: true });
      }
      for (const id of shown.keys()) if (!live.has(id)) shown.delete(id);
      // The piece they are about to drop.
      drawSlime(ctx, jar.a, Math.round(48 * FIGHT_SHAPE.scale), tierInfo(jar.c).r * FIGHT_SHAPE.scale, jar.c, { t: now, px: k, hat, frozen: Boolean(jar.f), fierce: true, alpha: 0.9 });
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [jarRef, hat, width, height, dangerY]);
  return <canvas ref={canvasRef} style={{ width, height, display: 'block' }} aria-hidden="true" />;
}
