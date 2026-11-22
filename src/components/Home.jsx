import SlimeIcon from './SlimeIcon.jsx';
import Nickname from './Nickname.jsx';
import RecordList from './RecordList.jsx';
import { loadRecords } from '../records.js';
import { TIERS } from '../game/tiers.js';
import { JARS, isJarOpen } from '../game/jars.js';
import { unlockedHats } from '../game/goals.js';
import { HAT_IDS } from '../game/goals.js';
import { dayKey, weekOf } from '../daily.js';

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/**
 * The home page: the game's front door. Play is the big button; with it the player's nickname, today's daily jar,
 * a live fight with a friend, three doors (jars, club, slime book) that show where the player stands, and the top
 * three players of all time.
 * @param open opens one of the pages: 'daily' | 'jars' | 'club' | 'book' | 'records'
 */
export default function Home({ best, life, jar, hat, club, discovered, dailyPlayed, passedBy, name, onName, stamp, onPlay, open }) {
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
      <Nickname name={name} onChange={onName} />

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

      <button className="btn alt fight-btn" onClick={() => open('fight')}>
        Fight a friend
        <small>Live, with a code · 3 minutes</small>
      </button>

      <button className="home-daily" onClick={() => open('daily')}>
        <span className="home-daily-head">
          <b>Daily jar</b>
          <span className={`chip ${todayScore == null ? 'fresh' : ''}`}>{todayScore == null ? 'Play today’s' : `Done · ${todayScore.toLocaleString()}`}</span>
        </span>
        <small>One jar a day, the same slimes for everyone. One try: who scores most?</small>
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
      </div>
      <section className="home-top" aria-labelledby="top-players">
        <div className="home-daily-head">
          <b id="top-players">Top players</b>
          <button className="chip" onClick={() => open('records')}>
            See all
          </button>
        </div>
        <RecordList load={() => loadRecords('all')} watch={stamp} mine={name || null} limit={3} />
      </section>
      <p className="hint">Tap or click to drop · ← → and Space work too</p>
    </div>
  );
}
