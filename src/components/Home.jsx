import SlimeIcon from './SlimeIcon.jsx';
import { TIERS } from '../game/tiers.js';
import { JARS, isJarOpen } from '../game/jars.js';
import { unlockedHats } from '../game/goals.js';
import { HAT_IDS } from '../game/goals.js';
import { dayKey, weekOf } from '../daily.js';

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/**
 * The home page: the game's front door. Play is the big button; under it today's daily jar and four doors
 * (jars, club, slime book, records), each showing where the player stands.
 * @param open opens one of the pages: 'daily' | 'jars' | 'club' | 'book' | 'records'
 */
export default function Home({ best, life, jar, hat, club, discovered, dailyPlayed, passedBy, onPlay, open }) {
  const today = dayKey();
  const todayScore = dailyPlayed[today];
  const openJars = JARS.filter((j) => isJarOpen(j, life.points)).length;
  return (
    <div className="home">
      <div className="hero-slimes">
        <SlimeIcon tier={1} size={62} hat={hat} />
        <SlimeIcon tier={5} size={96} hat={hat} />
        <SlimeIcon tier={3} size={74} hat={hat} />
      </div>
      <h1>Slime Merge</h1>
      <p className="tag">Drop. Match. Merge. Don’t overflow.</p>

      {life.games === 0 && best === 0 && (
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
            <span className="dot" style={{ background: TIERS[9].color }} />
            Stay under the line, or it’s game over.
          </li>
        </ul>
      )}

      {passedBy.length > 0 && (
        <button className="passed" onClick={() => open('club')}>
          <b>{passedBy[0]}</b>
          {passedBy.length > 1 ? ` and ${passedBy.length - 1} more` : ''} passed you this week! Play back →
        </button>
      )}

      <button className="btn play-big" onClick={onPlay}>
        Play
        <small>
          {jar.name}
          {best > 0 ? ` · Best ${best.toLocaleString()}` : ''}
        </small>
      </button>

      <button className="home-daily" onClick={() => open('daily')}>
        <span className="home-daily-head">
          <b>Daily jar</b>
          <span className={`chip ${todayScore == null ? 'fresh' : ''}`}>{todayScore == null ? 'Play today’s' : `Done · ${todayScore.toLocaleString()}`}</span>
        </span>
        <span className="week" aria-hidden="true">
          {weekOf().map((day, i) => (
            <span key={day} className={`${dailyPlayed[day] != null ? 'done' : ''} ${day === today ? 'today' : ''}`}>
              {DAY_LETTERS[i]}
            </span>
          ))}
        </span>
      </button>

      <div className="home-doors">
        <button onClick={() => open('jars')}>
          <span className={`jar-mini jar-${jar.id}`} aria-hidden="true">
            <SlimeIcon tier={3} size={24} />
            <SlimeIcon tier={6} size={32} />
          </span>
          <b>Jars</b>
          <small>
            {openJars} of {JARS.length} open
          </small>
        </button>
        <button onClick={() => open('club')}>
          <span className="door-art" aria-hidden="true">
            <SlimeIcon tier={9} size={40} />
            <SlimeIcon tier={6} size={34} hat="bow" />
          </span>
          <b>Jar club</b>
          <small>{club ?? 'Play with family'}</small>
        </button>
        <button onClick={() => open('book')}>
          <span className="door-art" aria-hidden="true">
            <SlimeIcon tier={4} size={40} hat={hat ?? 'top'} />
          </span>
          <b>Slime book</b>
          <small>
            {Math.min(discovered + 1, TIERS.length)}/{TIERS.length} slimes · {unlockedHats(life).length}/{HAT_IDS.length} hats
          </small>
        </button>
        <button onClick={() => open('records')}>
          <span className="door-art" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="38" height="38" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H5c0 3 1 4.5 3 5M16 6h3c0 3-1 4.5-3 5M12 13v4M8.5 20h7M10 17h4" />
            </svg>
          </span>
          <b>Records</b>
          <small>The whole world</small>
        </button>
      </div>
      <p className="hint">Tap or click to drop · ← → and Space work too</p>
    </div>
  );
}
