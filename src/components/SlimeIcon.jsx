import { useEffect, useRef } from 'react';
import { drawSlime } from '../game/draw.js';

export default function SlimeIcon({ tier, size = 40, className = '' }) {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current;
    const dpr = window.devicePixelRatio || 1;
    c.width = Math.round(size * dpr);
    c.height = Math.round(size * dpr);
    const ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    const r = size * (tier === 9 ? 0.34 : 0.38);
    drawSlime(ctx, size / 2, size / 2 + (tier === 9 ? size * 0.08 : -size * 0.02), r, tier, {
      px: dpr * 0.6,
      seed: (tier + 2) * 1.3,
      lookY: 0.2,
    });
  }, [tier, size]);
  return <canvas ref={ref} className={`slime-icon ${className}`} style={{ width: size, height: size }} aria-hidden="true" />;
}
