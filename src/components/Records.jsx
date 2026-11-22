import { useState } from 'react';
import RecordList from './RecordList.jsx';
import { PERIODS, loadRecords } from '../records.js';

/**
 * The records card: the best scores of the week, the month and all time, in the whole world.
 * @param mine the name the player saves under, to mark their own row
 * @param stamp changes when a new score was saved, so the list loads again
 */
export default function Records({ mine, stamp, onClose }) {
  const [period, setPeriod] = useState('week');
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
      <RecordList load={() => loadRecords(period)} watch={`${period}|${stamp}`} mine={mine} />
      <button className="btn ghost" onClick={onClose}>
        Back
      </button>
    </div>
  );
}
