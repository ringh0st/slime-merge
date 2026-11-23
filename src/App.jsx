import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Game, W, H, FIGHT_SHAPE } from './game/engine.js';
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
import Fight from './components/Fight.jsx';
import InstallHelp from './components/InstallHelp.jsx';
import Stats from './components/Stats.jsx';
import GhostJar from './components/GhostJar.jsx';
import { useFight } from './useFight.js';
import { EMOTES, rocksForCombo } from './fight.js';
import SaveScore from './components/SaveScore.jsx';
import SlimeIcon from './components/SlimeIcon.jsx';
import Splash from './components/Splash.jsx';
import { currentTheme, saveTheme } from './theme.js';
import { haptic, setStatusBar } from './native.js';
import { store } from './storage.js';
import { countGame, countVisit, loadRecords, saveScore } from './records.js';
import { nextToBeat, whoPassed } from './club.js';
import { dailyStreak, dayKey, withDailyScore } from './daily.js';

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

/** How long slimes may stay over the line before the jar overflows (OVER_MS in the engine). */
const OVERFLOW_SECONDS = 2.6;

/** The first game's tips, one at a time: each stays until the player has done what it says. */
const COACH_TIPS = {
  aim: 'Slide your finger to aim. Lift it to drop the slime.',
  merge: 'Drop it on one of the same color: they merge into a bigger slime!',
  line: 'Keep going! Just don’t let the slimes pile up over the dashed line.',
  helpers: 'Stuck? The buttons below help: Shake, Pop and Hold.',
};

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
const PAGES = ['home', 'news', 'jars', 'club', 'book', 'records', 'daily', 'fight', 'install', 'stats'];

const NO_HELPERS = { shake: 0, pop: 0, charge: 0, held: null, canHold: false };

const Icon = {
  moon: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a7 7 0 1 0 10.5 10.5Z" />
    </svg>
  ),
  sun: (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
    </svg>
  ),
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
  const [phase, setPhase] = useState(() =>
    // The owner's numbers: the game's address with ?stats at the end.
    new URLSearchParams(window.location.search).has('stats') ? 'stats' : (store.get('slime.best', 0) > 0 && store.get('slime.news', 0) < NEWS_VERSION ? 'news' : 'home'),
  );
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
  // This week's club board, for "next to beat" on the home page.
  const [clubRows, setClubRows] = useState([]);
  // A live fight is being played in the jar.
  const [isFighting, setIsFighting] = useState(false);
  const isFightingRef = useRef(false);
  const [clock, setClock] = useState(() => Date.now());
  // A game that was left open (a closed tab, a locked phone), to continue: { day, jarId, score, state }.
  const [savedRun, setSavedRun] = useState(() => store.get('slime.run', null));
  const forgetRun = useCallback(() => {
    store.set('slime.run', null);
    setSavedRun(null);
  }, []);
  // The first game ever is guided: one short tip at a time (see the coach in the jar).
  const [coach, setCoach] = useState(null);
  const [specialNote, setSpecialNote] = useState(null);
  const [combo, setCombo] = useState({ n: 0, id: 0 });
  const [danger, setDanger] = useState(0);
  const [discovered, setDiscovered] = useState(() => store.get('slime.discovered', 4));
  // Sound effects and music have their own switches (the old single mute turned both off).
  // The opening screen, once per start of the app (not on the owner's numbers page).
  const [isSplashUp, setIsSplashUp] = useState(() => !new URLSearchParams(window.location.search).has('stats'));
  const [theme, setTheme] = useState(currentTheme);
  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    saveTheme(next);
    setStatusBar(next === 'dark');
    setTheme(next);
    sfx.click();
  };
  const [sfxOn, setSfxOn] = useState(() => store.get('slime.sfx', !store.get('slime.muted', false)));
  const [musicOn, setMusicOn] = useState(() => store.get('slime.music', !store.get('slime.muted', false)));
  const [isSoundOpen, setIsSoundOpen] = useState(false);
  const [result, setResult] = useState({ score: 0, top: 4, newBest: false });
  const [toast, setToast] = useState(null);
  const [size, setSize] = useState(fitJar);
  // Records: the name scores are saved under, whether this run's score is saved, and where the records card goes back to.
  const [playerName, setPlayerName] = useState(() => store.get('slime.name', ''));
  const [saved, setSaved] = useState(false);
  // 'saving' | 'failed' | null: how the automatic save of this game's score is going.
  const [autoSave, setAutoSave] = useState(null);
  // Goes up whenever a score reached the server, so the boards on screen load again.
  const [boardStamp, setBoardStamp] = useState(0);
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
  const dailyPlayedRef = useRef(dailyPlayed);
  const dailyRunRef = useRef(dailyRun);
  useEffect(() => {
    lifeRef.current = life;
    dailyPlayedRef.current = dailyPlayed;
    dailyRunRef.current = dailyRun;
  }, [life, dailyRun]);

  // A jar or hat that isn't unlocked (cleared storage, a copied save) falls back to the plain one.
  const jar = isJarOpen(jarById(jarId), life.points) ? jarById(jarId) : JARS[0];
  const wornHat = unlockedHats(life).includes(hat) ? hat : null;
  const fightApi = useFight(
    { name: playerName, hat: wornHat },
    {
      onGo: (seed) => start(null, seed),
      onRocks: (count) => gameRef.current.addRocks(count),
      snapshot: () => gameRef.current.snapshot(),
      onFinish: () => {
        const game = gameRef.current;
        if (game.mode === 'play' && !game.over) game.gameOver(true);
        game.setShape();
        game.reset('demo');
        isFightingRef.current = false;
        setIsFighting(false);
        setPhase('fight');
      },
    },
  );
  const fightRef = useRef(fightApi);
  useEffect(() => {
    fightRef.current = fightApi;
  });
  const { fight, foeJar } = fightApi;
  // The other player sees my score and how full my jar is; the fight's clock ticks on screen.
  useEffect(() => {
    if (isFighting) fightApi.report(score, danger);
  }, [isFighting, score, danger]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!isFighting) return undefined;
    const timer = setInterval(() => setClock(Date.now()), 500);
    return () => clearInterval(timer);
  }, [isFighting]);

  const fightSecondsLeft = Math.max(0, Math.ceil((fight.endsAt - clock) / 1000));
  // The daily jar is always the classic one, so it is the same for everyone.
  const shownJar = dailyRun || isFighting ? JARS[0] : jar;
  // A player with a nickname never types it again: each game's score saves by itself when the game ends (or is
  // left), and a score waiting for a nickname saves the moment one is picked.
  const savedResult = useRef(null);
  useEffect(() => {
    // A fight's score isn't a record: rocks from the other player are part of it.
    if (!playerName || result.score < 1 || result.fight || savedResult.current === result) return;
    savedResult.current = result;
    setAutoSave('saving');
    saveScore(playerName, result.score, { club, daily: result.daily, top: result.top, hat: wornHat })
      .then(() => {
        setSaved(true);
        setAutoSave(null);
      })
      .catch(() => setAutoSave('failed'));
  }, [result, playerName]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Writes the game being played to the device, to continue it later. */
  const keepRun = useCallback(() => {
    const state = gameRef.current.serialize();
    if (!state || state.drops < 1) return;
    const run = { day: dailyRun, jarId: jar.id, score: state.score, state };
    store.set('slime.run', run);
    setSavedRun(run);
  }, [dailyRun, jar]);

  // A game in progress is kept on the device every few seconds and when the game goes to the background, so a
  // closed tab or a locked phone doesn't lose it. Fights are live and can't be continued.
  useEffect(() => {
    if ((phase !== 'play' && phase !== 'paused') || isFighting) return undefined;
    const keep = keepRun;
    const timer = setInterval(keep, 3000);
    const onHide = () => document.hidden && keep();
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', keep);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', keep);
    };
  }, [phase, isFighting, keepRun]);
  // A daily jar from another day can't be continued.
  useEffect(() => {
    if (savedRun?.day && savedRun.day !== dayKey()) forgetRun();
  }, [savedRun, forgetRun]);

  // Outside a game the music is calm again.
  useEffect(() => {
    if (phase !== 'play' && phase !== 'paused') sfx.setTension(0);
  }, [phase]);

  // The board shows what Best shows: a best score made before the nickname was picked (or under an older
  // nickname) is saved under the current one, once.
  useEffect(() => {
    if (!playerName || best < 1) return;
    const onBoard = store.get('slime.boardBest', {});
    if ((onBoard[playerName] ?? 0) >= best) return;
    saveScore(playerName, best, { club, top: discovered, hat: wornHat })
      .then(() => {
        store.set('slime.boardBest', { ...onBoard, [playerName]: best });
        setBoardStamp((n) => n + 1);
      })
      .catch(() => {});
  }, [playerName]); // eslint-disable-line react-hooks/exhaustive-deps

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
        setClubRows(rows ?? []);
        const { ahead, passedBy: fresh } = whoPassed(rows ?? [], playerName, store.get('slime.clubAhead', []));
        store.set('slime.clubAhead', ahead);
        setPassedBy(fresh);
      })
      .catch(() => {});
    return () => {
      current = false;
    };
  }, [phase, club, playerName]);

  const lastWarn = useRef(0);
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
      onDanger: (level) => {
        setDanger(level);
        sfx.setTension(level);
        // A tick that rises as the jar gets closer to overflowing, about three a second.
        if (level > 0.12 && performance.now() - lastWarn.current > 330) {
          lastWarn.current = performance.now();
          sfx.warn(level);
        }
      },
      onHelpers: setHelpers,
      onDrop: (drops) =>
        setCoach((step) => (step === 'aim' ? 'merge' : step === 'line' && drops >= 7 ? 'helpers' : step === 'helpers' && drops >= 10 ? null : step)),
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
        setCoach((step) => (step === 'merge' ? 'line' : step));
        // In a fight a combo drops rocks into the other player's jar.
        if (isFightingRef.current) fightRef.current.attack(rocksForCombo(n));
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
            sfx.discover();
            setToast({ tier, id: performance.now() });
            return tier;
          }
          return d;
        });
      },
      onGameOver: (finalScore, top, run, wasLeft) => {
        countGame(isFightingRef.current);
        store.set('slime.run', null);
        setSavedRun(null);
        store.set('slime.coached', true);
        setCoach(null);
        const day = dailyRunRef.current;
        const playedNow = day ? withDailyScore(dailyPlayedRef.current, day, finalScore) : dailyPlayedRef.current;
        const nextLife = lifeAfterGame(lifeRef.current, finalScore, run, Boolean(day), day ? dailyStreak(playedNow, day) : 0);
        // Hats and jars this game unlocked, to celebrate on the game-over card.
        const newHats = unlockedHats(nextLife).filter((id) => !unlockedHats(lifeRef.current).includes(id));
        const newJars = JARS.filter((j) => isJarOpen(j, nextLife.points) && !isJarOpen(j, lifeRef.current.points));
        setLife(nextLife);
        store.set('slime.life', nextLife);
        if (day) {
          setDailyPlayed(playedNow);
          store.set('slime.daily', playedNow);
        }
        setIsPopping(false);
        // A fight isn't a record (rocks from the other player, a different jar): it never changes Best.
        const newBest = finalScore > bestRef.current && !isFightingRef.current;
        if (!wasLeft) haptic(newBest ? 'success' : 'error');
        if (newBest) {
          setBest(finalScore);
          store.set('slime.best', finalScore);
        }
        const isFight = isFightingRef.current;
        setResult({ score: finalScore, top, newBest, newHats, newJars, daily: day, fight: isFight });
        setSaved(false);
        setAutoSave(null);
        // A game left from the pause card goes where the player asked, not to the game-over card.
        if (isFight) {
          // The fight page shows who won; my overflow tells the other player they did.
          if (!wasLeft) fightRef.current.lost(finalScore);
        } else if (!wasLeft) setTimeout(() => setPhase('over'), 700);
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
    sfx.setSfx(sfxOn);
    store.set('slime.sfx', sfxOn);
  }, [sfxOn]);
  useEffect(() => {
    sfx.setMusic(musicOn);
    store.set('slime.music', musicOn);
  }, [musicOn]);
  // Counted once a day per device, with no name or id: how many people play, and how many are new.
  useEffect(() => {
    const today = dayKey();
    if (store.get('slime.countedDay', null) === today) return;
    countVisit(store.get('slime.countedDay', null) === null);
    store.set('slime.countedDay', today);
  }, []);

  // Browsers only allow sound after a tap: the first one anywhere wakes the audio (and starts the music).
  useEffect(() => {
    const wake = () => sfx.unlock();
    window.addEventListener('pointerdown', wake, { once: true });
    return () => window.removeEventListener('pointerdown', wake);
  }, []);

  // In a fight two short jars share the room of the one tall jar (with a name over each).
  const duelW = Math.min(size.w, Math.floor((size.h - 52) / ((2 * FIGHT_SHAPE.height) / W)));
  const jarW = isFighting ? duelW : size.w;
  const jarH = isFighting ? Math.round((duelW * FIGHT_SHAPE.height) / W) : size.h;
  useLayoutEffect(() => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    gameRef.current?.resize(jarW, jarH, dpr);
  }, [jarW, jarH]);

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

  /** Start a game: a normal one in the chosen jar, that day's jar (with a day), or a fight (with its seed). */
  const start = useCallback(
    (day = null, fightSeed = null) => {
      sfx.unlock();
      sfx.click();
      forgetRun();
      setDailyRun(day);
      // A first game ever: plain pieces for a while, and tips in the jar.
      const isFirst = !fightSeed && !day && lifeRef.current.games === 0 && !store.get('slime.coached', false);
      gameRef.current.gentle = isFirst;
      setCoach(isFirst ? 'aim' : null);
      setIsFighting(Boolean(fightSeed));
      isFightingRef.current = Boolean(fightSeed);
      // The daily jar and a fight are always in the classic jar, so they are the same for everyone.
      gameRef.current.setJar(day || fightSeed ? JARS[0] : jar);
      // A fight is played in a short jar with small slimes, so both jars fit on the screen.
      gameRef.current.setShape(fightSeed ? FIGHT_SHAPE : undefined);
      gameRef.current.start(fightSeed ?? (day ? `daily-${day}` : null));
      setScore(0);
      setDanger(0);
      setCombo({ n: 0, id: 0 });
      setIsPopping(false);
      setPhase('play');
    },
    [jar, forgetRun],
  );
  /** Continue the game that was left open. */
  const continueRun = () => {
    const run = savedRun;
    if (!run) return;
    sfx.unlock();
    sfx.click();
    setDailyRun(run.day);
    setIsFighting(false);
    isFightingRef.current = false;
    setCoach(null);
    if (!run.day) pickJar(run.jarId);
    gameRef.current.gentle = false;
    gameRef.current.setJar(run.day ? JARS[0] : jarById(run.jarId));
    gameRef.current.setShape();
    gameRef.current.restore(run.state, run.day ? `daily-${run.day}` : null);
    setDanger(0);
    setCombo({ n: 0, id: 0 });
    setIsPopping(false);
    setPhase('play');
  };
  // "Play again" after a daily jar starts a normal game: the daily is one try.
  const playAgain = () => start(null);

  const togglePause = useCallback(() => {
    // A live fight can't be paused.
    if (isFightingRef.current) return;
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
      if (gameRef.current.popAt(toLogical(e), ((e.clientY - rect.top) / rect.height) * gameRef.current.h)) {
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
      if (isFighting) leaveGame();
      else {
        // Going home doesn't end the game: it waits there to be continued. What was scored so far already
        // counts for Best and, with a nickname, for the board.
        keepRun();
        const soFar = gameRef.current.score;
        if (soFar > best) {
          setBest(soFar);
          store.set('slime.best', soFar);
        }
        if (playerName && soFar > 0) {
          saveScore(playerName, soFar, { club, daily: dailyRun, top: gameRef.current.runMax, hat: wornHat })
            .then(() => setBoardStamp((n) => n + 1))
            .catch(() => {});
        }
      }
    }
    if (isInGame || phase === 'over') gameRef.current.reset('demo');
    // Leaving a fight (also from its page) tells the other player.
    if (fight.status !== 'idle') fightApi.leave();
    if (isFighting) {
      gameRef.current.setShape();
      gameRef.current.reset('demo');
    }
    isFightingRef.current = false;
    setIsFighting(false);
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
      {isSplashUp && <Splash onDone={() => setIsSplashUp(false)} />}
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
          {(phase === 'play' || phase === 'paused') && !isFighting && (
            <button className="icon-btn" onClick={togglePause} aria-label="Pause">
              {Icon.pause}
            </button>
          )}
          <button className="icon-btn" onClick={toggleTheme} aria-label={theme === 'dark' ? 'Light mode' : 'Night mode'}>
            {theme === 'dark' ? Icon.sun : Icon.moon}
          </button>
          <button className="icon-btn" onClick={() => setIsSoundOpen((open) => !open)} aria-label="Sound" aria-expanded={isSoundOpen}>
            {sfxOn || musicOn ? Icon.sound : Icon.mute}
          </button>
          {isSoundOpen && (
            <>
              <button className="scrim" aria-label="Close" onClick={() => setIsSoundOpen(false)} />
              <div className="sound-menu" role="group" aria-label="Sound">
                <label>
                  <span>Music</span>
                  <input type="checkbox" role="switch" checked={musicOn} onChange={(event) => setMusicOn(event.target.checked)} />
                </label>
                <label>
                  <span>Sound effects</span>
                  <input
                    type="checkbox"
                    role="switch"
                    checked={sfxOn}
                    onChange={(event) => {
                      setSfxOn(event.target.checked);
                      sfx.setSfx(event.target.checked);
                      sfx.click();
                    }}
                  />
                </label>
              </div>
            </>
          )}
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
        {isFighting && fight.foe ? (
          <div className="pill stat right foe" aria-label={`${fight.foe.name}: ${fight.foe.score} points`}>
            <span className="label">{fight.foe.name}</span>
            <span className="value">{fight.foe.score}</span>
            <span className="foe-danger" aria-hidden="true">
              <span style={{ width: `${fight.foe.danger * 100}%` }} />
            </span>
          </div>
        ) : (
          <div className="pill stat right">
            <span className="label">Best</span>
            <span className="value">{best}</span>
          </div>
        )}
      </section>

      <main className="stage">
        <div className={`stage-inner ${isFighting ? 'is-duel' : ''}`} style={{ width: size.w, height: size.h }}>
          {isFighting && (
            <>
              <p className="duel-name foe">{fight.foe?.name ?? 'Friend'} · live</p>
              <div className="jar jar-classic ghost" style={{ width: jarW, height: jarH }}>
                <GhostJar jarRef={foeJar} hat={fight.foe?.hat} width={jarW} height={jarH} dangerY={Math.round(100 * FIGHT_SHAPE.scale)} />
                {fight.emote?.from === 'foe' && (
                  <span className="emote-pop" key={fight.emote.id} aria-live="polite">
                    {fight.emote.e}
                  </span>
                )}
              </div>
              <div className="duel-row">
                <p className="duel-name">You</p>
                {/* Quick reactions: they pop up over your jar on your friend's screen. */}
                <div className="emotes" role="group" aria-label="Send a reaction">
                  {EMOTES.map((e) => (
                    <button key={e} onClick={() => fightApi.emote(e)} aria-label={`Send ${e}`}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        <div className="tilt" ref={tiltRef}>
          <div className={`jar-back jar-${shownJar.id}`} style={{ width: jarW, height: jarH }} />
          <div
            className={`jar jar-${shownJar.id} ${danger > 0.1 ? 'is-danger' : ''} ${isPopping ? 'is-popping' : ''}`}
            style={{ width: jarW, height: jarH, '--danger': danger }}
          >
            <div className="jar-shake" ref={shakeRef}>
              <canvas
                ref={canvasRef}
                style={{ width: jarW, height: jarH }}
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
            {/* Too high: a ring that empties and the seconds left, so an overflow never comes as a surprise. */}
            {danger > 0.12 && phase === 'play' && (
              <div className="overflow-warn" role="alert" style={{ '--left': 1 - danger }}>
                <b>{Math.max(1, Math.ceil((1 - danger) * OVERFLOW_SECONDS))}</b>
                <span>Too high!</span>
              </div>
            )}
            {coach && phase === 'play' && !isPopping && (
              <div className={`coach coach-${coach}`} key={coach} role="status">
                {COACH_TIPS[coach]}
              </div>
            )}
            {dailyRun && isInGame && <div className="daily-tag">Daily jar</div>}
            {isFighting && fight.emote?.from === 'me' && (
              <span className="emote-pop mine" key={fight.emote.id} aria-hidden="true">
                {fight.emote.e}
              </span>
            )}
            {isFighting && isInGame && (
              <div className="daily-tag" role="timer">
                {Math.floor(fightSecondsLeft / 60)}:{String(fightSecondsLeft % 60).padStart(2, '0')}
              </div>
            )}
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
          <div className="floor" style={{ width: jarW }} />
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
              target={club ? nextToBeat(clubRows, playerName) : null}
              name={playerName}
              onName={rename}
              stamp={`${saved}|${boardStamp}`}
              onPlay={() => start(null)}
              savedRun={savedRun}
              onContinue={continueRun}
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
              <Records mine={playerName || null} stamp={`${saved}|${boardStamp}`} onName={rename} onClose={closeCard} />
            </div>
          )}
          {phase === 'club' && (
            <div className="sheet">
              <Club club={club} mine={playerName || null} stamp={`${saved}|${boardStamp}`} onJoin={joinClub} onLeave={leaveClub} onClose={closeCard} />
            </div>
          )}
          {phase === 'daily' && (
            <div className="sheet">
              <DailyCard played={dailyPlayed} club={club} mine={playerName || null} stamp={`${saved}|${boardStamp}`} onPlay={() => (savedRun?.day === dayKey() ? continueRun() : start(dayKey()))} isOpen={savedRun?.day === dayKey()} onClose={closeCard} />
            </div>
          )}
          {phase === 'fight' && (
            <div className="sheet">
              <Fight
                fight={fight}
                me={{ name: playerName, hat: wornHat }}
                onHost={fightApi.host}
                onJoin={fightApi.join}
                onAgain={fightApi.again}
                onLeave={goHome}
              />
            </div>
          )}
          {phase === 'stats' && (
            <div className="sheet">
              <Stats onClose={() => setPhase('home')} />
            </div>
          )}
          {phase === 'install' && (
            <div className="sheet">
              <InstallHelp onClose={closeCard} />
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
