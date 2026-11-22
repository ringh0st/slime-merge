import { useEffect, useState } from 'react';
import SlimeIcon from './SlimeIcon.jsx';

/**
 * A board of scores: place, the player's slime (their biggest, in their hat), name and score.
 * @param load returns a promise of rows [{ place, name, score, top, hat }]
 * @param watch the list loads again whenever this changes
 * @param mine the player's own name, to mark their row
 * @param empty what to say when nobody is on the board yet
 */
export default function RecordList({ load, watch, mine, empty = 'No records yet. Be the first!' }) {
  const [state, setState] = useState({ status: 'loading', rows: [] });

  useEffect(() => {
    let current = true;
    setState({ status: 'loading', rows: [] });
    load()
      .then((rows) => current && setState({ status: 'ready', rows: rows ?? [] }))
      .catch((error) => current && setState({ status: 'error', rows: [], message: error.message }));
    return () => {
      current = false;
    };
    // `load` is a new function on every render; `watch` says when the list really changes.
  }, [watch]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="record-list" aria-busy={state.status === 'loading'}>
      {state.status === 'loading' && Array.from({ length: 4 }, (_, i) => <div key={i} className="record-row ghost-row" />)}
      {state.status === 'error' && <p className="sub">{state.message}</p>}
      {state.status === 'ready' && state.rows.length === 0 && <p className="sub">{empty}</p>}
      {state.status === 'ready' && state.rows.length > 0 && (
        <ol>
          {state.rows.map((row) => (
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
