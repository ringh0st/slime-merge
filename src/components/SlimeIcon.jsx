import { useEffect, useRef } from 'react';
import { drawSlime } from '../game/draw.js';

/** A slime (or a special piece) as a small picture. `hat` and `frozen` dress it as in the jar. */
export default function SlimeIcon({ tier, size = 40, className = '', hat = null, frozen = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    const dpr = window.devicePixelRatio || 1;
    c.width = Math.round(size * dpr);
    c.height = Math.round(size * dpr);
    const ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    const tall = tier === 9 || hat || tier === -3;
    const r = size * (frozen ? 0.3 : tall ? 0.32 : 0.38);
    drawSlime(ctx, size / 2, size / 2 + (tall ? size * 0.1 : -size * 0.02), r, tier, {
      hat,
      frozen,
      forceHat: true,
      px: dpr * 0.6,
      seed: (tier + 2) * 1.3,
      lookY: 0.2,
    });
  }, [tier, size, hat, frozen]);
  return <canvas ref={ref} className={`slime-icon ${className}`} style={{ width: size, height: size }} aria-hidden="true" />;
}
