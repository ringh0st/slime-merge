// Tiny Web Audio synth: no sound files needed.
let ctx = null;
let muted = false;

function ac() {
  if (muted) return null;
  try {
    if (!ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      ctx = new C();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function blip(f0, f1, dur, { type = 'sine', vol = 0.18, delay = 0 } = {}) {
  const a = ac();
  if (!a) return;
  const t = a.currentTime + delay;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, t);
  o.frequency.exponentialRampToValueAtTime(f1, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.03);
}

export const sfx = {
  setMuted(m) {
    muted = m;
  },
  unlock() {
    ac();
  },
  drop() {
    blip(520, 240, 0.12, { vol: 0.1 });
  },
  merge(tier, combo = 1) {
    const base = 240 * Math.pow(1.12, tier);
    blip(base, base * 1.9, 0.16, { vol: 0.15 });
    blip(base * 1.5, base * 2.6, 0.14, { type: 'triangle', vol: 0.07, delay: 0.05 });
    if (combo > 1) blip(base * 2, base * 3.2, 0.12, { type: 'square', vol: 0.03, delay: 0.1 });
  },
  king() {
    [523, 659, 784, 1047].forEach((f, i) => blip(f, f * 1.02, 0.25, { type: 'triangle', vol: 0.12, delay: i * 0.09 }));
  },
  rock() {
    blip(180, 55, 0.2, { type: 'triangle', vol: 0.2 });
  },
  over() {
    blip(440, 110, 0.6, { type: 'triangle', vol: 0.14 });
    blip(330, 82, 0.7, { vol: 0.1, delay: 0.12 });
  },
  click() {
    blip(700, 950, 0.06, { vol: 0.07 });
  },
};
