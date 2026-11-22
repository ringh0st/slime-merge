import { useEffect, useState } from 'react';
import SlimeIcon from './SlimeIcon.jsx';
import { reportName } from '../records.js';

/** How often a board on screen looks for new scores. */
const REFRESH_MS = 8000;

/**
 * A board of scores: place, the player's slime (their biggest, in their hat), name and score.
 * @param load returns a promise of rows [{ place, name, score, top, hat }]
 * @param watch the list loads again whenever this changes
 * @param mine the player's own name, to mark their row
 * @param empty what to say when nobody is on the board yet
 * @param limit show only the first few rows (the home page's top three)
 * @param canReport each row gets a small flag to report its name to the owner
 * @param crowned a name that wears a small crown (last week's club winner)
 */
export default function RecordList({ load, watch, mine, empty = 'No records yet. Be the first!', limit = Infinity, canReport = false, crowned = null }) {
  // The row being reported: null, a name (asking "are you sure?"), or { done: name }.
  const [reporting, setReporting] = useState(null);
  const report = (name) => {
    reportName(name).catch(() => {});
    setReporting({ done: name });
  };
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
              <span className="who">
                {row.name}
                {crowned && crowned.toLowerCase() === row.name.toLowerCase() && (
                  <svg viewBox="0 0 24 24" width="16" height="16" aria-label="Last week’s winner" className="mini-crown">
                    <path d="M3 18l1.5-10 4.5 4 3-7 3 7 4.5-4L21 18z" fill="#ffd45e" stroke="#c9962a" strokeWidth="1.5" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              {reporting === row.name ? (
                <span className="report-ask">
                  Report?
                  <button onClick={() => report(row.name)}>Yes</button>
                  <button onClick={() => setReporting(null)}>No</button>
                </span>
              ) : reporting?.done === row.name ? (
                <span className="report-ask">Thanks!</span>
              ) : (
                <>
                  <span className="pts">{row.score.toLocaleString()}</span>
                  {canReport && !(mine && row.name.toLowerCase() === mine.toLowerCase()) && (
                    <button className="flag" aria-label={`Report the name ${row.name}`} onClick={() => setReporting(row.name)}>
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M5 21V4M5 4h11l-2 4 2 4H5" />
                      </svg>
                    </button>
                  )}
                </>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
