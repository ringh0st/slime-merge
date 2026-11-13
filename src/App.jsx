import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Game, W, H } from './game/engine.js';
import { TIERS, tierInfo } from './game/tiers.js';
import { sfx } from './game/audio.js';
import SlimeIcon from './components/SlimeIcon.jsx';
import { haptic } from './native.js';

const store = {
  get(k, d) {
    try {
      const v = localStorage.getItem(k);
      return v == null ? d : JSON.parse(v);
    } catch {
      return d;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {
      /* storage unavailable */
    }
  },
};

const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function safeInsets() {
  const cs = getComputedStyle(document.documentElement);
  return (parseFloat(cs.getPropertyValue('--sat')) || 0) + (parseFloat(cs.getPropertyValue('--sab')) || 0);
}

function fitJar() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const chrome = (vw < 520 ? 228 : 260) + safeInsets(); // header + hud + evolution strip
  const s = Math.max(0.5, Math.min((Math.min(vw, 480) - 32) / W, (vh - chrome) / H, 1.15));
  return { w: Math.round(W * s), h: Math.round(H * s) };
}

const Icon = {
  sound: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 5 6 9H3v6h3l5 4z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13" />
    </svg>
  ),
  mute: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 5 6 9H3v6h3l5 4z" />
      <path d="m16 9 5 6M21 9l-5 6" />
    </svg>
  ),
  pause: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
      <rect x="6" y="5" width="4" height="14" rx="1.5" />
      <rect x="14" y="5" width="4" height="14" rx="1.5" />
    </svg>
  ),
};

export default function App() {
  const canvasRef = useRef(null);
  const tiltRef = useRef(null);
  const shakeRef = useRef(null);
  const gameRef = useRef(null);

  const [phase, setPhase] = useState('menu');
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => store.get('slime.best', 0));
  const [next, setNext] = useState(0);
  const [combo, setCombo] = useState({ n: 0, id: 0 });
  const [danger, setDanger] = useState(0);
  const [discovered, setDiscovered] = useState(() => store.get('slime.discovered', 4));
  const [muted, setMuted] = useState(() => store.get('slime.muted', false));
  const [result, setResult] = useState({ score: 0, top: 4, newBest: false });
  const [toast, setToast] = useState(null);
  const [size, setSize] = useState(fitJar);

  const bestRef = useRef(best);
  const phaseRef = useRef(phase);
  useEffect(() => {
    bestRef.current = best;
    phaseRef.current = phase;
  }, [best, phase]);

  // Settle the jar back to neutral whenever a menu is showing.
  useEffect(() => {
    if (phase !== 'play') {
      tiltRef.current?.style.setProperty('--ry', '0deg');
      tiltRef.current?.style.setProperty('--rx', '5deg');
    }
  }, [phase]);

  // Create the game once.
  useEffect(() => {
    const game = new Game(canvasRef.current, {
      onScore: setScore,
      onNext: setNext,
      onDanger: setDanger,
      onMerge: (tier, n) => {
        if (n > 1) setCombo({ n, id: performance.now() });
        haptic(tier >= 6 ? 'heavy' : n > 1 ? 'medium' : 'light');
        if (tier >= 6 && !reduceMotion) {
          shakeRef.current?.animate(
            [
              { transform: 'translate(0,0)' },
              { transform: `translate(${-2 - tier * 0.4}px, ${2 + tier * 0.3}px)` },
              { transform: `translate(${2 + tier * 0.4}px, -1px)` },
              { transform: 'translate(0,0)' },
            ],
            { duration: 320, easing: 'ease-out' },
          );
        }
      },
      onDiscover: (tier) => {
        setDiscovered((d) => {
          if (tier > d) {
            store.set('slime.discovered', tier);
            setToast({ tier, id: performance.now() });
            return tier;
          }
          return d;
        });
      },
      onGameOver: (finalScore, top) => {
        const newBest = finalScore > bestRef.current;
        haptic(newBest ? 'success' : 'error');
        if (newBest) {
          setBest(finalScore);
          store.set('slime.best', finalScore);
        }
        setResult({ score: finalScore, top, newBest });
        setTimeout(() => setPhase('over'), 700);
      },
    });
    gameRef.current = game;
    const s0 = fitJar();
    game.resize(s0.w, s0.h, Math.min(window.devicePixelRatio || 1, 2.5));
    return () => game.destroy();
  }, []);

  useEffect(() => {
    sfx.setMuted(muted);
    store.set('slime.muted', muted);
  }, [muted]);

  useLayoutEffect(() => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    gameRef.current?.resize(size.w, size.h, dpr);
  }, [size]);

  useEffect(() => {
    const onResize = () => setSize(fitJar());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // Subtle 3D tilt that follows the pointer.
  useEffect(() => {
    if (reduceMotion) return;
    const onMove = (e) => {
      const el = tiltRef.current;
      // Only tilt while playing, so menu buttons never slide under the cursor.
      if (!el || phaseRef.current !== 'play') return;
      const nx = e.clientX / window.innerWidth - 0.5;
      const ny = e.clientY / window.innerHeight - 0.5;
      el.style.setProperty('--ry', `${nx * 7}deg`);
      el.style.setProperty('--rx', `${5 - ny * 4}deg`);
    };
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  const start = useCallback(() => {
    sfx.unlock();
    sfx.click();
    gameRef.current.start();
    setScore(0);
    setDanger(0);
    setCombo({ n: 0, id: 0 });
    setPhase('play');
  }, []);

  const togglePause = useCallback(() => {
    setPhase((p) => {
      if (p === 'play') {
        gameRef.current.setPaused(true);
        return 'paused';
      }
      if (p === 'paused') {
        gameRef.current.setPaused(false);
        return 'play';
      }
      return p;
    });
  }, []);

  // Keyboard controls
  useEffect(() => {
    const onKey = (e) => {
      const g = gameRef.current;
      if (phase === 'play') {
        if (e.key === 'ArrowLeft' || e.key === 'a') g.nudgeAim(-16);
        else if (e.key === 'ArrowRight' || e.key === 'd') g.nudgeAim(16);
        else if (e.key === ' ' || e.key === 'ArrowDown' || e.key === 's') {
          e.preventDefault();
          g.drop();
        } else if (e.key === 'Escape' || e.key === 'p') togglePause();
      } else if (phase === 'paused' && (e.key === 'Escape' || e.key === 'p')) togglePause();
      else if ((phase === 'menu' || phase === 'over') && e.key === 'Enter') start();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, start, togglePause]);

  const toLogical = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return ((e.clientX - rect.left) / rect.width) * W;
  };
  const onPointerDown = (e) => {
    if (phase !== 'play') return;
    gameRef.current.setAim(toLogical(e));
  };
  const onPointerMove = (e) => {
    if (phase !== 'play') return;
    gameRef.current.setAim(toLogical(e));
  };
  const onPointerUp = (e) => {
    if (phase !== 'play') return;
    gameRef.current.setAim(toLogical(e));
    gameRef.current.drop();
  };

  const nextInfo = tierInfo(next);

  return (
    <div className="app">
      <div className="backdrop" aria-hidden="true">
        <span className="orb o1" />
        <span className="orb o2" />
        <span className="orb o3" />
        <span className="grain" />
      </div>

      <header className="topbar">
        <div className="brand">
          <SlimeIcon tier={3} size={34} />
          <span>
            slime<b>merge</b>
          </span>
        </div>
        <div className="actions">
          {(phase === 'play' || phase === 'paused') && (
            <button className="icon-btn" onClick={togglePause} aria-label="Pause">
              {Icon.pause}
            </button>
          )}
          <button className="icon-btn" onClick={() => setMuted((m) => !m)} aria-label={muted ? 'Unmute' : 'Mute'}>
            {muted ? Icon.mute : Icon.sound}
          </button>
        </div>
      </header>

      <section className="hud" style={{ width: size.w }}>
        <div className="pill stat">
          <span className="label">Score</span>
          <span className="value" key={score}>
            {score}
          </span>
        </div>
        <div className="pill next">
          <span className="label">Next</span>
          <SlimeIcon tier={next} size={40} className="bob" />
          <span className="next-name">{phase === 'play' || phase === 'paused' ? nextInfo.name : '—'}</span>
        </div>
        <div className="pill stat right">
          <span className="label">Best</span>
          <span className="value">{best}</span>
        </div>
      </section>

      <main className="stage">
        <div className="stage-inner" style={{ width: size.w, height: size.h }}>
        <div className="tilt" ref={tiltRef}>
          <div className="jar-back" style={{ width: size.w, height: size.h }} />
          <div
            className={`jar ${danger > 0.1 ? 'is-danger' : ''}`}
            style={{ width: size.w, height: size.h, '--danger': danger }}
          >
            <div className="jar-shake" ref={shakeRef}>
              <canvas
                ref={canvasRef}
                style={{ width: size.w, height: size.h }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
              />
            </div>
            <span className="glint" aria-hidden="true" />

            {combo.n > 1 && phase === 'play' && (
              <div className="combo" key={combo.id}>
                combo <b>×{combo.n}</b>
              </div>
            )}
            {toast && phase === 'play' && (
              <div className="toast" key={toast.id} onAnimationEnd={() => setToast(null)}>
                <SlimeIcon tier={toast.tier} size={30} />
                <span>
                  New slime: <b>{TIERS[toast.tier].name}</b>
                </span>
              </div>
            )}

          </div>
          <div className="floor" style={{ width: size.w }} />
        </div>
          {phase === 'menu' && (
            <div className="overlay">
              <div className="card">
                <div className="hero-slimes">
                  <SlimeIcon tier={1} size={46} />
                  <SlimeIcon tier={5} size={70} />
                  <SlimeIcon tier={3} size={54} />
                </div>
                <h1>
                  Slime
                  <br />
                  Merge
                </h1>
                <p className="tag">Drop. Match. Merge. Don’t overflow.</p>
                <ul className="howto">
                  <li>
                    <span className="dot" style={{ background: TIERS[2].color }} />
                    Two matching slimes merge into a bigger one.
                  </li>
                  <li>
                    <span className="dot" style={{ background: TIERS[4].color }} />
                    Chain merges quickly for combo multipliers.
                  </li>
                  <li>
                    <span className="dot" style={{ background: '#A3A9B8' }} />
                    Rocks only crack when a merge happens beside them.
                  </li>
                  <li>
                    <span className="dot" style={{ background: TIERS[9].color }} />
                    Stay under the line, or it’s game over.
                  </li>
                </ul>
                <button className="btn" onClick={start}>
                  Play
                </button>
                <p className="hint">Tap or click to drop · ← → and Space work too</p>
              </div>
            </div>
          )}

          {phase === 'paused' && (
            <div className="overlay">
              <div className="card small">
                <h2>Paused</h2>
                <button className="btn" onClick={togglePause}>
                  Resume
                </button>
                <button
                  className="btn ghost"
                  onClick={() => {
                    gameRef.current.setPaused(false);
                    start();
                  }}
                >
                  Restart
                </button>
              </div>
            </div>
          )}

          {phase === 'over' && (
            <div className="overlay">
              <div className="card small">
                <p className="eyebrow">Overflow!</p>
                <div className="final">{result.score}</div>
                {result.newBest ? <p className="badge">New best ✦</p> : <p className="sub">Best {best}</p>}
                <div className="biggest">
                  <SlimeIcon tier={result.top} size={52} />
                  <span>
                    Biggest slime
                    <b>{TIERS[result.top].name}</b>
                  </span>
                </div>
                <button className="btn" onClick={start}>
                  Play again
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="evo" aria-label="Evolution chain">
        {TIERS.map((t, i) => (
          <div key={t.name} className={`evo-item ${i <= discovered ? 'on' : ''}`} title={i <= discovered ? t.name : '???'}>
            <SlimeIcon tier={i} size={size.w < 340 ? 24 : 28} />
          </div>
        ))}
      </footer>
    </div>
  );
}
