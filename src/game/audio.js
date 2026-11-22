// The game's sound, all made in the browser (Web Audio): no sound files. Two parts with their own switches:
// sound effects (soft, squishy, a little echo) and quiet background music that is put together as it plays.
let ctx = null;
let sfxBus = null;
let musicBus = null;
let echo = null;
let sfxOn = true;
let musicOn = true;

/** The audio context, made on first use (browsers only allow sound after a tap). Null when sound is unavailable. */
function ac() {
  try {
    if (!ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return null;
      ctx = new AudioCtx();
      // Everything passes one gentle limiter, so stacked sounds never crackle.
      const limiter = ctx.createDynamicsCompressor();
      limiter.threshold.value = -14;
      limiter.ratio.value = 6;
      limiter.connect(ctx.destination);
      sfxBus = ctx.createGain();
      sfxBus.connect(limiter);
      musicBus = ctx.createGain();
      musicBus.gain.value = 0;
      musicBus.connect(limiter);
      // A short, soft echo that effects can send a little of themselves into.
      const delay = ctx.createDelay(0.5);
      delay.delayTime.value = 0.19;
      const feedback = ctx.createGain();
      feedback.gain.value = 0.28;
      const damp = ctx.createBiquadFilter();
      damp.type = 'lowpass';
      damp.frequency.value = 2400;
      echo = ctx.createGain();
      echo.connect(delay);
      delay.connect(damp);
      damp.connect(feedback);
      feedback.connect(delay);
      damp.connect(sfxBus);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/**
 * One note: a tone that fades in fast and out softly, sliding from f0 to f1.
 * opts: type, vol, delay (s), attack (s), wet (how much goes to the echo), bus
 */
function note(f0, f1, dur, { type = 'sine', vol = 0.18, delay = 0, attack = 0.008, wet = 0, bus = null } = {}) {
  const a = ac();
  if (!a) return;
  const t = a.currentTime + delay;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) osc.frequency.exponentialRampToValueAtTime(f1, t + dur);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain);
  gain.connect(bus ?? sfxBus);
  if (wet > 0) {
    const send = a.createGain();
    send.gain.value = wet;
    gain.connect(send);
    send.connect(echo);
  }
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

let noiseBuffer = null;
/** A puff of filtered noise: the "air" in pops, cracks and rattles. */
function puff(dur, { freq = 1800, q = 0.8, vol = 0.12, delay = 0, type = 'bandpass', slideTo = null, bus = null } = {}) {
  const a = ac();
  if (!a) return;
  if (!noiseBuffer) {
    noiseBuffer = a.createBuffer(1, a.sampleRate, a.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }
  const t = a.currentTime + delay;
  const src = a.createBufferSource();
  src.buffer = noiseBuffer;
  const filter = a.createBiquadFilter();
  filter.type = type;
  filter.frequency.setValueAtTime(freq, t);
  if (slideTo) filter.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  filter.Q.value = q;
  const gain = a.createGain();
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(bus ?? sfxBus);
  src.start(t, Math.random() * 0.5, dur + 0.05);
}

// A happy five-note scale (C major pentatonic); steps climb it, octave after octave.
const SCALE = [0, 2, 4, 7, 9];
const step = (n, base = 261.63) => base * 2 ** (Math.floor(n / 5) + SCALE[((n % 5) + 5) % 5] / 12);

/** Runs an effect only while effects are on. */
const fx = (play) => (...args) => {
  if (sfxOn) play(...args);
};

export const sfx = {
  /** Wakes the audio up; call from a tap. */
  unlock() {
    ac();
    music.sync();
  },
  setSfx(on) {
    sfxOn = on;
  },
  setMusic(on) {
    musicOn = on;
    music.sync();
  },
  /** How full the jar is, 0 (calm) to 1 (about to overflow): the music picks up with it. */
  setTension(level) {
    music.tension = level;
  },
  /** A slime let go: a small wet "plip". */
  drop: fx(() => {
    note(620, 250, 0.11, { vol: 0.1 });
    puff(0.04, { freq: 3200, vol: 0.03 });
  }),
  /** Two slimes merge: a round "blop" that dips and rises; bigger slimes sound deeper, combos climb the scale. */
  merge: fx((tier, combo = 1) => {
    const base = 520 * 0.88 ** tier;
    note(base * 0.75, base * 1.7, 0.13, { vol: 0.17, wet: 0.15 });
    note(base * 1.5, base * 0.9, 0.07, { vol: 0.07, type: 'triangle' });
    puff(0.05, { freq: 900 + base, vol: 0.035 });
    if (tier >= 6) note(base * 0.5, base * 0.42, 0.24, { vol: 0.13, type: 'triangle' });
    // The chime on top: one step higher with every merge of a combo.
    note(step(4 + Math.min(combo, 9)), step(4 + Math.min(combo, 9)), 0.22, { vol: 0.06, type: 'triangle', delay: 0.05, wet: 0.5 });
  }),
  /** A slime never made before. */
  discover: fx(() => {
    [5, 7, 9].forEach((n, i) => note(step(n), step(n), 0.26, { vol: 0.08, type: 'triangle', delay: 0.08 + i * 0.09, wet: 0.5 }));
  }),
  /** Two Kings: a small fanfare. */
  king: fx(() => {
    [5, 7, 9, 10, 12].forEach((n, i) => note(step(n), step(n), 0.34, { vol: 0.1, type: 'triangle', delay: i * 0.085, wet: 0.5 }));
    note(step(0, 130.81), step(0, 130.81), 0.6, { vol: 0.12 });
  }),
  /** A rock cracks. */
  rock: fx(() => {
    note(170, 60, 0.18, { type: 'triangle', vol: 0.18 });
    puff(0.09, { freq: 2600, vol: 0.09, q: 0.5 });
  }),
  /** The jar overflowed: three soft notes down, kind rather than sad. */
  over: fx(() => {
    [9, 7, 5].forEach((n, i) => note(step(n, 196), step(n, 196) * 0.985, 0.42, { vol: 0.11, type: 'triangle', delay: i * 0.17, wet: 0.4 }));
  }),
  /** Too high: a tick that rises with how close the jar is to overflowing (level 0…1). */
  warn: fx((level) => {
    note(500 + level * 700, 520 + level * 760, 0.09, { type: 'triangle', vol: 0.07 + level * 0.07 });
  }),
  click: fx(() => {
    note(780, 1040, 0.05, { vol: 0.06 });
  }),
  /** A bomb goes off: a soft thump and a whoosh. */
  boom: fx(() => {
    note(150, 38, 0.4, { type: 'triangle', vol: 0.24 });
    puff(0.35, { type: 'lowpass', freq: 2400, slideTo: 200, vol: 0.2, q: 0.3 });
  }),
  /** A rainbow slime joins in: a quick run up the scale. */
  rainbow: fx(() => {
    [5, 6, 7, 8, 9, 10].forEach((n, i) => note(step(n), step(n), 0.16, { vol: 0.07, type: 'triangle', delay: i * 0.04, wet: 0.6 }));
  }),
  /** Ice breaks: glassy pings. */
  thaw: fx(() => {
    [14, 17, 16].forEach((n, i) => note(step(n), step(n), 0.09, { vol: 0.05, delay: i * 0.035, wet: 0.5 }));
    puff(0.08, { freq: 6000, vol: 0.05, type: 'highpass' });
  }),
  /** The Shake helper: the jar rattles. */
  shake: fx(() => {
    [0, 0.06, 0.12, 0.18].forEach((delay, i) => puff(0.05, { freq: 700 + i * 180, vol: 0.12, delay, q: 1.5 }));
    note(120, 80, 0.2, { type: 'triangle', vol: 0.1 });
  }),
  /** The Pop helper: one clean pop. */
  pop: fx(() => {
    note(1000, 240, 0.08, { vol: 0.16 });
    puff(0.03, { freq: 4000, vol: 0.06 });
  }),
  /** A helper earned: two bright notes. */
  helper: fx(() => {
    note(step(7), step(7), 0.14, { type: 'triangle', vol: 0.09, wet: 0.4 });
    note(step(10), step(10), 0.2, { type: 'triangle', vol: 0.09, delay: 0.09, wet: 0.4 });
  }),
};

/*
 * Background music: light and bouncy, like the slimes, and quiet. It is put together as it plays, so it never loops
 * the same way twice. Four chords take turns (two bars each). A hopping bass and a soft shaker keep the bounce, a
 * plucked voice plays a tune that skips around the chord, and a faint pad holds it together. When the jar fills up
 * (`tension`), it plays a little faster and the shaker gets busier.
 */
const BPM = 104;
// Each chord: its bass note and the scale steps that sound good over it.
const CHORDS = [
  { bass: 130.81, tones: [0, 2, 4, 5, 7, 9] }, // C
  { bass: 110.0, tones: [-1, 2, 4, 5, 7, 9] }, // A minor
  { bass: 87.31, tones: [0, 2, 3, 5, 7, 8] }, // F
  { bass: 98.0, tones: [1, 3, 4, 6, 8, 9] }, // G
];

const music = {
  timer: null,
  nextBeat: 0,
  beat: 0,
  last: 6,
  tension: 0,
  /** Starts or stops the music to match the switch (and only once the audio is awake). */
  sync() {
    if (!ctx) return;
    const shouldPlay = musicOn && !document.hidden;
    musicBus.gain.cancelScheduledValues(ctx.currentTime);
    musicBus.gain.setTargetAtTime(shouldPlay ? 1 : 0, ctx.currentTime, 0.4);
    if (shouldPlay && !this.timer) {
      this.nextBeat = ctx.currentTime + 0.1;
      this.timer = setInterval(() => this.fill(), 120);
    } else if (!shouldPlay && this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  },
  /** Writes the next beats a little ahead of time, so the rhythm stays steady whatever the screen is doing. */
  fill() {
    while (this.nextBeat < ctx.currentTime + 0.5) {
      // A fuller jar plays up to an eighth faster.
      const beatLength = 60 / (BPM * (1 + this.tension * 0.12));
      this.playBeat(this.beat, this.nextBeat - ctx.currentTime, beatLength);
      this.beat += 1;
      this.nextBeat += beatLength;
    }
  },
  playBeat(beat, delay, len) {
    const chord = CHORDS[Math.floor(beat / 8) % CHORDS.length];
    const inBar = beat % 4;
    const to = { bus: musicBus };
    const half = delay + len * 0.56; // the off-beat, swung a little late: that is the bounce
    if (beat % 8 === 0) {
      // The pad: two soft notes of the chord, held for the two bars.
      [chord.tones[0], chord.tones[2]].forEach((n) => note(step(n), step(n), len * 8.2, { ...to, type: 'triangle', vol: 0.014, delay, attack: 0.8 }));
    }
    // The bass hops: the root on 1 and 3, a higher bounce on the off-beats of 2 and 4.
    if (inBar === 0 || inBar === 2) note(chord.bass, chord.bass * 0.98, len * 0.5, { ...to, type: 'triangle', vol: 0.085, delay, attack: 0.006 });
    else note(chord.bass * 2, chord.bass * 2, len * 0.3, { ...to, type: 'triangle', vol: 0.04, delay: half, attack: 0.006 });
    // The shaker: a whisper on every off-beat, and on the beats too once the jar gets full.
    puff(0.04, { ...to, type: 'highpass', freq: 6500, vol: 0.016, delay: half });
    if (this.tension > 0.35) puff(0.03, { ...to, type: 'highpass', freq: 7500, vol: 0.012, delay });
    // The tune: short plucked notes that skip around the chord, more often on the off-beats.
    for (const [at, chance] of [
      [delay, 0.62],
      [half, 0.5],
    ]) {
      if (Math.random() > chance) continue;
      const near = chord.tones.map((tone) => tone + 5).sort((p, q) => Math.abs(p - this.last) - Math.abs(q - this.last));
      // Mostly a neighbor, now and then a leap: that is what makes it playful.
      const pick = Math.random() < 0.25 ? near[near.length - 1 - Math.floor(Math.random() * 2)] : near[Math.floor(Math.random() * 3)];
      this.last = pick;
      note(step(pick), step(pick), 0.22, { ...to, type: 'triangle', vol: 0.05, delay: at, attack: 0.003 });
      note(step(pick) * 2, step(pick) * 2, 0.07, { ...to, vol: 0.012, delay: at });
    }
  },
};

// The music rests while the game is in the background.
if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => music.sync());
