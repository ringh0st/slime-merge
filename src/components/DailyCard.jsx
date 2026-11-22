import { useState } from 'react';
import RecordList from './RecordList.jsx';
import { loadDaily } from '../records.js';
import { dailyStreak, dayKey, dayLabel, weekOf } from '../daily.js';

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

/**
 * The daily jar: the week so far, today's board and one try at today's jar (the same pieces for everyone).
 * @param played { [day]: score } for the days played on this device
 * @param isOpen today's jar was started and left open: it can be continued
 */
export default function DailyCard({ played, club, mine, stamp, onPlay, isOpen = false, onClose }) {
  const today = dayKey();
  const week = weekOf();
  const myScore = played[today];
  const streak = dailyStreak(played, today);
  // With a club the board opens on it; the world is one tap away.
  const [scope, setScope] = useState(club ? 'club' : 'world');
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const text = `Slime Merge daily jar, ${dayLabel(today)}: ${myScore.toLocaleString()} points. Can you beat it?\n${window.location.href.split('#')[0]}`;
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
      }
    } catch {
      /* the share sheet was closed */
    }
  };

  return (
    <div className="card daily">
      <h2>Daily jar</h2>
      <p className="sub">The same slimes for everyone. One try a day.</p>
      <p className="streak">
        <b>{streak}</b> {streak === 1 ? 'day' : 'days'} in a row
        <small>{streak < 3 ? `${3 - streak} more for the Beanie` : streak < 7 ? `${7 - streak} more for the Halo` : 'Both streak hats are yours!'}</small>
      </p>
      <ol className="week" aria-label="This week">
        {week.map((day, i) => (
          <li
            key={day}
            className={`${played[day] != null ? 'done' : ''} ${day === today ? 'today' : ''}`}
            aria-label={`${dayLabel(day)}${played[day] != null ? `: ${played[day]} points` : day === today ? ': today' : ''}`}
          >
            <span>{DAY_LETTERS[i]}</span>
            <span aria-hidden="true">{played[day] != null ? '✓' : day === today ? '●' : ''}</span>
          </li>
        ))}
      </ol>
      {club && (
        <div className="tabs" role="tablist" aria-label="Board">
          {[
            ['club', 'My club'],
            ['world', 'World'],
          ].map(([id, label]) => (
            <button key={id} role="tab" aria-selected={scope === id} className={`tab ${scope === id ? 'on' : ''}`} onClick={() => setScope(id)}>
              {label}
            </button>
          ))}
        </div>
      )}
      <RecordList
        load={() => loadDaily(today, scope === 'club' ? club : null)}
        watch={`${today}|${scope}|${stamp}`}
        mine={mine}
        empty="Nobody has played today’s jar yet."
      />
      {myScore == null ? (
        <button className="btn" onClick={onPlay}>
          {isOpen ? 'Continue today’s jar' : 'Play today’s jar'}
        </button>
      ) : (
        <>
          <p className="badge">Your jar: {myScore.toLocaleString()}</p>
          <button className="btn" onClick={share}>
            {copied ? 'Copied!' : 'Share my jar'}
          </button>
          <p className="sub">A new jar comes tomorrow.</p>
        </>
      )}
      <button className="btn ghost" onClick={onClose}>
        Back
      </button>
    </div>
  );
}
