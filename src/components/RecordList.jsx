import { useEffect, useState } from 'react';
import SlimeIcon from './SlimeIcon.jsx';

/** How often a board on screen looks for new scores. */
const REFRESH_MS = 8000;

/**
 * A board of scores: place, the player's slime (their biggest, in their hat), name and score.
 * @param load returns a promise of rows [{ place, name, score, top, hat }]
 * @param watch the list loads again whenever this changes
 * @param mine the player's own name, to mark their row
 * @param empty what to say when nobody is on the board yet
 * @param limit show only the first few rows (the home page's top three)
 */
export default function RecordList({ load, watch, mine, empty = 'No records yet. Be the first!', limit = Infinity }) {
  const [state, setState] = useState({ status: 'loading', rows: [] });

  useEffect(() => {
    let current = true;
    setState({ status: 'loading', rows: [] });
    // Loads the board; `quietly` keeps what is on screen while the new rows are on their way (no flicker).
    const refresh = (quietly) =>
      load()
        .then((rows) => current && setState({ status: 'ready', rows: rows ?? [] }))
        .catch((error) => current && !quietly && setState({ status: 'error', rows: [], message: error.message }));
    refresh(false);
    // Other players' scores show up by themselves: the board looks again every few seconds while it is on screen,
    // and the moment the player comes back to the game.
    const timer = setInterval(() => document.hidden || refresh(true), REFRESH_MS);
    const onBack = () => document.hidden || refresh(true);
    document.addEventListener('visibilitychange', onBack);
    window.addEventListener('focus', onBack);
    return () => {
      current = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onBack);
      window.removeEventListener('focus', onBack);
    };
    // `load` is a new function on every render; `watch` says when the list really changes.
  }, [watch]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="record-list" aria-busy={state.status === 'loading'}>
      {state.status === 'loading' && Array.from({ length: Math.min(4, limit) }, (_, i) => <div key={i} className="record-row ghost-row" />)}
      {state.status === 'error' && <p className="sub">{state.message}</p>}
      {state.status === 'ready' && state.rows.length === 0 && <p className="sub">{empty}</p>}
      {state.status === 'ready' && state.rows.length > 0 && (
        <ol>
          {state.rows.slice(0, limit).map((row) => (
            <li key={row.place} className={`record-row ${mine && row.name.toLowerCase() === mine.toLowerCase() ? 'mine' : ''}`}>
              <span className={`place p${row.place}`}>{row.place}</span>
              <SlimeIcon tier={row.top ?? 3} hat={row.hat} size={34} />
              <span className="who">{row.name}</span>
              <span className="pts">{row.score.toLocaleString()}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
