import { useEffect, useState } from 'react';
import { PERIODS, loadRecords } from '../records.js';

/**
 * The records card: the best scores of the week, the month and all time.
 * @param mine the name the player just saved under, to mark their own row
 * @param stamp changes when a new score was saved, so the list loads again
 */
export default function Records({ mine, stamp, onClose }) {
  const [period, setPeriod] = useState('week');
  const [state, setState] = useState({ status: 'loading', rows: [] });

  useEffect(() => {
    let current = true;
    setState({ status: 'loading', rows: [] });
    loadRecords(period)
      .then((rows) => current && setState({ status: 'ready', rows: rows ?? [] }))
      .catch((error) => current && setState({ status: 'error', rows: [], message: error.message }));
    return () => {
      current = false;
    };
  }, [period, stamp]);

  return (
    <div className="card records">
      <h2>Records</h2>
      <div className="tabs" role="tablist" aria-label="Period">
        {PERIODS.map(({ id, label }) => (
          <button key={id} role="tab" aria-selected={period === id} className={`tab ${period === id ? 'on' : ''}`} onClick={() => setPeriod(id)}>
            {label}
          </button>
        ))}
      </div>
      <div className="record-list" aria-busy={state.status === 'loading'}>
        {state.status === 'loading' && Array.from({ length: 5 }, (_, i) => <div key={i} className="record-row ghost-row" />)}
        {state.status === 'error' && <p className="sub">{state.message}</p>}
        {state.status === 'ready' && state.rows.length === 0 && <p className="sub">No records yet. Be the first!</p>}
        {state.status === 'ready' && state.rows.length > 0 && (
          <ol>
            {state.rows.map((row) => (
              <li key={row.place} className={`record-row ${mine && row.name.toLowerCase() === mine.toLowerCase() ? 'mine' : ''}`}>
                <span className={`place p${row.place}`}>{row.place}</span>
                <span className="who">{row.name}</span>
                <span className="pts">{row.score}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
      <button className="btn ghost" onClick={onClose}>
        Back
      </button>
    </div>
  );
}
