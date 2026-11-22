import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Game, W, H } from './game/engine.js';
import { TIERS, pieceName } from './game/tiers.js';
import { JARS, isJarOpen, jarById } from './game/jars.js';
import { EMPTY_LIFE, lifeAfterGame, unlockedHats } from './game/goals.js';
import { sfx } from './game/audio.js';
import Records from './components/Records.jsx';
import Club from './components/Club.jsx';
import DailyCard from './components/DailyCard.jsx';
import JarPicker from './components/JarPicker.jsx';
import SlimeBook from './components/SlimeBook.jsx';
import HelperBar from './components/HelperBar.jsx';
import Home from './components/Home.jsx';
import SaveScore from './components/SaveScore.jsx';
import SlimeIcon from './components/SlimeIcon.jsx';
import { haptic } from './native.js';
import { store } from './storage.js';
import { loadRecords, saveScore } from './records.js';
import { whoPassed } from './club.js';
import { dayKey, withDailyScore } from './daily.js';

const reduceMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function safeInsets() {
  const cs = getComputedStyle(document.documentElement);
  return (parseFloat(cs.getPropertyValue('--sat')) || 0) + (parseFloat(cs.getPropertyValue('--sab')) || 0);
}

function fitJar() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const chrome = (vw < 520 ? 250 : 282) + safeInsets(); // header + hud + the helpers under the jar
  const s = Math.max(0.5, Math.min((Math.min(vw, 480) - 32) / W, (vh - chrome) / H, 1.15));
  return { w: Math.round(W * s), h: Math.round(H * s) };
}

/** One line for each special piece, shown the first time it comes up. */
const SPECIAL_NOTES = {
  [-1]: 'Rock: cracks when a merge happens beside it.',
  [-2]: 'Rainbow: merges with any slime it touches!',
  [-3]: 'Bomb: pops everything close to it!',
};
const FROZEN_NOTE = 'Frozen: merge beside it to break the ice.';
/** What the "What's new" card was last shown for; raise it to show the card again after a big update. */
const NEWS_VERSION = 1;

/** The screens that cover the jar. */
const PAGES = ['home', 'news', 'jars', 'club', 'book', 'records', 'daily'];

const NO_HELPERS = { shake: 0, pop: 0, charge: 0, held: null, canHold: false };

const Icon = {
  home: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 11.5 12 4l8 7.5M6.5 10v9h11v-9M10 19v-5h4v5" />
    </svg>
  ),
  jar: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 3h8v3H8zM7 6h10a2 2 0 0 1 2 2v10a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V8a2 2 0 0 1 2-2z" />
    </svg>
  ),
  club: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="9" r="3.2" />
      <circle cx="17" cy="10" r="2.4" />
      <path d="M3 19c.6-3.2 3-5 6-5s5.4 1.8 6 5M15.5 14.2c2.700 0 4.600 1.5 5.200 4.300" />
    </svg>
  ),
  book: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 6c-2-1.5-4.5-2-8-2v14c3.5 0 6 .5 8 2 2-1.5 4.5-2 8-2V4c-3.5 0-6 .5-8 2zM12 6v14" />
    </svg>
  ),
  trophy: (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5c0 3 1 4.5 3 5M16 6h3c0 3-1 4.5-3 5M12 13v4M8.5 20h7M10 17h4" />
    </svg>
  ),
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

  // Players from before the big update first see what is new.
  const [phase, setPhase] = useState(() => (store.get('slime.best', 0) > 0 && store.get('slime.news', 0) < NEWS_VERSION ? 'news' : 'home'));
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => store.get('slime.best', 0));
  const [next, setNext] = useState({ tier: 0 });
  const [helpers, setHelpers] = useState(NO_HELPERS);
  const [isPopping, setIsPopping] = useState(false);
  // What is kept between games: counts for the goals, the hat the slimes wear, the chosen jar, the club's code
  // and the daily jars played ({ [day]: score }).
  // A player from before the goals existed starts with their best score counted, not from zero.
  const [life, setLife] = useState(() => {
    const before = store.get('slime.best', 0);
    return { ...EMPTY_LIFE, points: before, best: before, ...store.get('slime.life', {}) };
  });
  const [hat, setHat] = useState(() => store.get('slime.hat', null));
  const [jarId, setJarId] = useState(() => store.get('slime.jar', 'classic'));
  const [club, setClub] = useState(() => store.get('slime.club', null));
  const [dailyPlayed, setDailyPlayed] = useState(() => store.get('slime.daily', {}));
  // The daily jar's day while it is being played (null in a normal game).
  const [dailyRun, setDailyRun] = useState(null);
  const [passedBy, setPassedBy] = useState([]);
  const [specialNote, setSpecialNote] = useState(null);
  const [combo, setCombo] = useState({ n: 0, id: 0 });
  const [danger, setDanger] = useState(0);
  const [discovered, setDiscovered] = useState(() => store.get('slime.discovered', 4));
  const [muted, setMuted] = useState(() => store.get('slime.muted', false));
  const [result, setResult] = useState({ score: 0, top: 4, newBest: false });
  const [toast, setToast] = useState(null);
  const [size, setSize] = useState(fitJar);
  // Records: the name scores are saved under, whether this run's score is saved, and where the records card goes back to.
  const [playerName, setPlayerName] = useState(() => store.get('slime.name', ''));
  const [saved, setSaved] = useState(false);
  // 'saving' | 'failed' | null: how the automatic save of this game's score is going.
  const [autoSave, setAutoSave] = useState(null);
  const rename = (name) => {
    setPlayerName(name);
    store.set('slime.name', name);
  };
  // Where a card (records, club, daily…) goes back to.
  const [cardFrom, setCardFrom] = useState('home');
  const openCard = (card, from = 'home') => {
    sfx.click();
    setCardFrom(from);
    setPhase(card);
  };
  const openRecords = (from) => openCard(club ? 'club' : 'records', from);
  const closeCard = () => setPhase(cardFrom);

  // Kept in refs so the game's callbacks (made once) always see the latest.
  const lifeRef = useRef(life);
  const dailyRunRef = useRef(dailyRun);
  useEffect(() => {
    lifeRef.current = life;
    dailyRunRef.current = dailyRun;
  }, [life, dailyRun]);

  // A jar or hat that isn't unlocked (cleared storage, a copied save) falls back to the plain one.
  const jar = isJarOpen(jarById(jarId), life.points) ? jarById(jarId) : JARS[0];
  const wornHat = unlockedHats(life).includes(hat) ? hat : null;
  // The daily jar is always the classic one, so it is the same for everyone.
  const shownJar = dailyRun ? JARS[0] : jar;
  // A player with a nickname never types it again: each game's score saves by itself when the game ends (or is
  // left), and a score waiting for a nickname saves the moment one is picked.
  const savedResult = useRef(null);
  useEffect(() => {
    if (!playerName || result.score < 1 || savedResult.current === result) return;
    savedResult.current = result;
    setAutoSave('saving');
    saveScore(playerName, result.score, { club, daily: result.daily, top: result.top, hat: wornHat })
      .then(() => {
        setSaved(true);
        setAutoSave(null);
      })
      .catch(() => setAutoSave('failed'));
  }, [result, playerName]); // eslint-disable-line react-hooks/exhaustive-deps

  // Behind a page nothing needs to move (and a game that just ended stays as it was).
  const isPageShown = PAGES.includes(phase);
  useEffect(() => {
    gameRef.current?.setPaused(isPageShown);
  }, [isPageShown]);

  // In a club: who moved ahead of the player this week since they last looked.
  useEffect(() => {
    if (phase !== 'home' || !club || !playerName) return;
    let current = true;
    loadRecords('week', club)
      .then((rows) => {
        if (!current) return;
        const { ahead, passedBy: fresh } = whoPassed(rows ?? [], playerName, store.get('slime.clubAhead', []));
        store.set('slime.clubAhead', ahead);
        setPassedBy(fresh);
      })
      .catch(() => {});
    return () => {
      current = false;
    };
  }, [phase, club, playerName]);

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
      onNext: (piece) => {
        setNext(piece);
        // The first time each special piece comes up, say what it does.
        const kind = piece.frozen ? 'frozen' : SPECIAL_NOTES[piece.tier] ? String(piece.tier) : null;
        const seen = store.get('slime.seenSpecials', []);
        if (kind && !seen.includes(kind)) {
          store.set('slime.seenSpecials', [...seen, kind]);
          setSpecialNote({ piece, text: piece.frozen ? FROZEN_NOTE : SPECIAL_NOTES[piece.tier], id: performance.now() });
        }
      },
      onDanger: setDanger,
      onHelpers: setHelpers,
      onBoom: () => {
        haptic('heavy');
        if (!reduceMotion) {
          shakeRef.current?.animate(
            [{ transform: 'translate(0,0)' }, { transform: 'translate(-6px, 4px)' }, { transform: 'translate(5px, -3px)' }, { transform: 'translate(0,0)' }],
            { duration: 300, easing: 'ease-out' },
          );
        }
      },
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
      onGameOver: (finalScore, top, run, wasLeft) => {
        const day = dailyRunRef.current;
        const nextLife = lifeAfterGame(lifeRef.current, finalScore, run, Boolean(day));
        // Hats and jars this game unlocked, to celebrate on the game-over card.
        const newHats = unlockedHats(nextLife).filter((id) => !unlockedHats(lifeRef.current).includes(id));
        const newJars = JARS.filter((j) => isJarOpen(j, nextLife.points) && !isJarOpen(j, lifeRef.current.points));
        setLife(nextLife);
        store.set('slime.life', nextLife);
        if (day) {
          setDailyPlayed((played) => {
            const nextPlayed = withDailyScore(played, day, finalScore);
            store.set('slime.daily', nextPlayed);
            return nextPlayed;
          });
        }
        setIsPopping(false);
        const newBest = finalScore > bestRef.current;
        if (!wasLeft) haptic(newBest ? 'success' : 'error');
        if (newBest) {
          setBest(finalScore);
          store.set('slime.best', finalScore);
        }
        setResult({ score: finalScore, top, newBest, newHats, newJars, daily: day });
        setSaved(false);
        setAutoSave(null);
        // A game left from the pause card goes where the player asked, not to the game-over card.
        if (!wasLeft) setTimeout(() => setPhase('over'), 700);
      },
    });
    gameRef.current = game;
    // While developing: the running game, for trying special pieces from the browser console.
    if (import.meta.env.DEV) window.slimeGame = game;
    const s0 = fitJar();
    game.resize(s0.w, s0.h, Math.min(window.devicePixelRatio || 1, 2.5));
    return () => game.destroy();
  }, []);

  // After the game exists (effects run in order): dress the slimes and set up the jar.
  useEffect(() => {
    gameRef.current?.setHat(wornHat);
  }, [wornHat]);
  useEffect(() => {
    // Only between games: the walls and the pull of the jar change.
    if (phase !== 'play' && phase !== 'paused' && phase !== 'over') gameRef.current?.setJar(jar);
  }, [jar, phase]);

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

  /** Start a game: a normal one in the chosen jar, or (with a day) that day's jar. */
  const start = useCallback(
    (day = null) => {
      sfx.unlock();
      sfx.click();
      setDailyRun(day);
      gameRef.current.setJar(day ? JARS[0] : jar);
      gameRef.current.start(day ? `daily-${day}` : null);
      setScore(0);
      setDanger(0);
      setCombo({ n: 0, id: 0 });
      setIsPopping(false);
      setPhase('play');
    },
    [jar],
  );
  // "Play again" after a daily jar starts a normal game: the daily is one try.
  const playAgain = () => start(null);

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
        } else if (e.key === 'h') g.hold();
        else if (e.key === 'Escape' || e.key === 'p') togglePause();
      } else if (phase === 'paused' && (e.key === 'Escape' || e.key === 'p')) togglePause();
      else if ((phase === 'home' || phase === 'over') && e.key === 'Enter' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'BUTTON') start(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, start, togglePause]);

  const toLogical = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return ((e.clientX - rect.left) / rect.width) * W;
  };
  const onPointerDown = (e) => {
    if (phase !== 'play' || isPopping) return;
    gameRef.current.setAim(toLogical(e));
  };
  const onPointerMove = (e) => {
    if (phase !== 'play' || isPopping) return;
    gameRef.current.setAim(toLogical(e));
  };
  const onPointerUp = (e) => {
    if (phase !== 'play') return;
    if (isPopping) {
      // The Pop helper: this tap picks the piece to pop instead of dropping one.
      const rect = canvasRef.current.getBoundingClientRect();
      if (gameRef.current.popAt(toLogical(e), ((e.clientY - rect.top) / rect.height) * H)) {
        haptic('medium');
        setIsPopping(false);
      }
      return;
    }
    gameRef.current.setAim(toLogical(e));
    gameRef.current.drop();
  };

  const isInGame = phase === 'play' || phase === 'paused';
  /** Leaving a game from the pause card: what was scored so far still counts (best, goals, the boards). */
  const leaveGame = () => {
    if (gameRef.current.score > 0) gameRef.current.gameOver(true);
  };
  /** The Home button at the top: from a game (its score is kept) or from any page. */
  const goHome = () => {
    sfx.click();
    if (isInGame) {
      gameRef.current.setPaused(false);
      leaveGame();
    }
    if (isInGame || phase === 'over') gameRef.current.reset('demo');
    setPhase('home');
  };
  const isPage = PAGES.includes(phase);
  const pickJar = (id) => {
    sfx.click();
    setJarId(id);
    store.set('slime.jar', id);
  };
  const pickHat = (id) => {
    sfx.click();
    setHat(id);
    store.set('slime.hat', id);
  };
  const joinClub = (code) => {
    sfx.click();
    setClub(code);
    store.set('slime.club', code);
    store.set('slime.clubAhead', []);
  };
  const leaveClub = () => {
    setClub(null);
    store.set('slime.club', null);
    setPassedBy([]);
  };

  return (
    <div className={`app ${PAGES.includes(phase) ? 'is-page' : ''}`}>
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
          {/* Home is always one tap away (the home page itself doesn't need it). */}
          {phase !== 'home' && phase !== 'news' && (
            <button className="icon-btn" onClick={goHome} aria-label="Home">
              {Icon.home}
            </button>
          )}
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
          <SlimeIcon tier={next.tier} frozen={next.frozen} size={40} className="bob" />
          <span className="next-name">{isInGame ? pieceName(next) : '—'}</span>
        </div>
        <div className="pill stat right">
          <span className="label">Best</span>
          <span className="value">{best}</span>
        </div>
      </section>

      <main className="stage">
        <div className="stage-inner" style={{ width: size.w, height: size.h }}>
        <div className="tilt" ref={tiltRef}>
          <div className={`jar-back jar-${shownJar.id}`} style={{ width: size.w, height: size.h }} />
          <div
            className={`jar jar-${shownJar.id} ${danger > 0.1 ? 'is-danger' : ''} ${isPopping ? 'is-popping' : ''}`}
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
            {isPopping && phase === 'play' && <div className="pop-hint">Tap a slime to pop it</div>}
            {dailyRun && isInGame && <div className="daily-tag">Daily jar</div>}
            {specialNote && phase === 'play' && (
              <div className="toast special" key={specialNote.id} onAnimationEnd={() => setSpecialNote(null)}>
                <SlimeIcon tier={specialNote.piece.tier} frozen={specialNote.piece.frozen} size={30} />
                <span>{specialNote.text}</span>
              </div>
            )}
            {toast && phase === 'play' && !specialNote && (
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
                    leaveGame();
                    if (dailyRun) {
                      gameRef.current.reset('demo');
                      setPhase('home');
                    } else start(null);
                  }}
                >
                  {dailyRun ? 'Leave the daily jar' : 'Restart'}
                </button>
                {!dailyRun && (
                  <button
                    className="btn ghost"
                    onClick={goHome}
                  >
                    Home
                  </button>
                )}
              </div>
            </div>
          )}

          {phase === 'over' && (
            <div className="overlay">
              <div className="card small">
                <p className="eyebrow">{result.daily ? 'Daily jar' : 'Overflow!'}</p>
                <div className="final">{result.score}</div>
                {result.newBest ? <p className="badge">New best ✦</p> : <p className="sub">Best {best}</p>}
                <div className="biggest">
                  <SlimeIcon tier={result.top} size={52} />
                  <span>
                    Biggest slime
                    <b>{TIERS[result.top].name}</b>
                  </span>
                </div>
                {(result.newHats?.length > 0 || result.newJars?.length > 0) && (
                  <ul className="unlocked">
                    {result.newHats.map((id) => (
                      <li key={id}>
                        <SlimeIcon tier={4} hat={id} size={38} />
                        <span>
                          New hat! <b>Find it in the Book</b>
                        </span>
                      </li>
                    ))}
                    {result.newJars.map((j) => (
                      <li key={j.id}>
                        <span className={`jar-mini tiny jar-${j.id}`} aria-hidden="true" />
                        <span>
                          New jar! <b>{j.name}</b>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                {playerName && result.score > 0 && autoSave !== 'failed' && (
                  <p className="sub saved-as" role="status">
                    {saved ? (
                      <>
                        Saved as <b>{playerName}</b> ✓
                      </>
                    ) : (
                      'Saving…'
                    )}
                  </p>
                )}
                {result.score > 0 && !saved && (!playerName || autoSave === 'failed') && (
                  <SaveScore
                    score={result.score}
                    initialName={playerName}
                    extras={{ club, daily: result.daily, top: result.top, hat: wornHat }}
                    onSaved={(name) => {
                      // Typed here the first time (or after a failed save): from now on it saves by itself.
                      savedResult.current = result;
                      rename(name);
                      setSaved(true);
                      setAutoSave(null);
                    }}
                  />
                )}
                <button className="btn" onClick={playAgain}>
                  Play again
                </button>
                <div className="menu-actions">
                  <button className="btn ghost" onClick={() => (result.daily ? openCard('daily', 'over') : openRecords('over'))}>
                    {result.daily ? 'Today’s board' : club ? 'Club' : 'Top players'}
                  </button>
                  <button className="btn ghost" onClick={() => setPhase('home')}>
                    Home
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </main>

      <footer className="foot" style={{ width: size.w }}>
        {isInGame ? (
          <HelperBar
            helpers={helpers}
            isPopping={isPopping}
            onShake={() => gameRef.current.shake() && haptic('medium')}
            onPop={() => setIsPopping((on) => !on)}
            onHold={() => gameRef.current.hold()}
          />
        ) : (
          <div className="evo" aria-label="Evolution chain">
            {TIERS.map((t, i) => (
              <div key={t.name} className={`evo-item ${i <= discovered ? 'on' : ''}`} title={i <= discovered ? t.name : '???'}>
                <SlimeIcon tier={i} size={size.w < 340 ? 24 : 28} />
              </div>
            ))}
          </div>
        )}
      </footer>

      {/* The pages (home, what's new, jars, club, book, records, daily) cover the jar; the game waits behind them. */}
      {isPage && (
        <div className="page" key={phase}>
          {phase === 'home' && (
            <Home
              best={best}
              life={life}
              jar={jar}
              hat={wornHat}
              club={club}
              discovered={discovered}
              dailyPlayed={dailyPlayed}
              passedBy={passedBy}
              name={playerName}
              onName={rename}
              stamp={saved}
              onPlay={() => start(null)}
              open={openCard}
            />
          )}
          {phase === 'news' && (
            <div className="sheet">
              <div className="card news">
                <h2>New in the jar!</h2>
                <ul className="special-list">
                  <li>
                    <SlimeIcon tier={-2} size={36} />
                    <span>
                      <b>Special slimes</b> Rainbow, Bomb and Frozen drop in every game.
                    </span>
                  </li>
                  <li>
                    <span className="news-icon">{Icon.jar}</span>
                    <span>
                      <b>Helpers and jars</b> Shake, Pop and Hold under the jar. New jars open as you score.
                    </span>
                  </li>
                  <li>
                    <span className="news-icon">{Icon.club}</span>
                    <span>
                      <b>Jar club</b> A private board for family and friends, with one short code.
                    </span>
                  </li>
                  <li>
                    <span className="news-icon">{Icon.trophy}</span>
                    <span>
                      <b>Daily jar</b> The same slimes for everyone, one try a day.
                    </span>
                  </li>
                  <li>
                    <SlimeIcon tier={4} hat="top" size={36} />
                    <span>
                      <b>Slime book</b> Goals that unlock hats for your slimes.
                    </span>
                  </li>
                </ul>
                <button
                  className="btn"
                  onClick={() => {
                    store.set('slime.news', NEWS_VERSION);
                    setPhase('home');
                  }}
                >
                  Got it
                </button>
              </div>
            </div>
          )}

          {phase === 'records' && (
            <div className="sheet">
              <Records mine={playerName || null} stamp={saved} onName={rename} onClose={closeCard} />
            </div>
          )}
          {phase === 'club' && (
            <div className="sheet">
              <Club club={club} mine={playerName || null} stamp={saved} onJoin={joinClub} onLeave={leaveClub} onClose={closeCard} />
            </div>
          )}
          {phase === 'daily' && (
            <div className="sheet">
              <DailyCard played={dailyPlayed} club={club} mine={playerName || null} stamp={saved} onPlay={() => start(dayKey())} onClose={closeCard} />
            </div>
          )}
          {phase === 'jars' && (
            <div className="sheet">
              <JarPicker jarId={jar.id} lifetimePoints={life.points} onPick={pickJar} onClose={closeCard} />
            </div>
          )}
          {phase === 'book' && (
            <div className="sheet">
              <SlimeBook discovered={discovered} life={life} hat={wornHat} onHat={pickHat} onClose={closeCard} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
