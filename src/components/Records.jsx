import { useState } from 'react';
import RecordList from './RecordList.jsx';
import Nickname from './Nickname.jsx';
import { PERIODS, loadRecords } from '../records.js';

/**
 * Top players: the best scores of all time, the month and the week, in the whole world, and the nickname the
 * player shows under.
 * @param mine the player's nickname, to mark their own row
 * @param onName called with a new nickname
 * @param stamp changes when a new score was saved, so the list loads again
 */
export default function Records({ mine, stamp, onName, onClose }) {
  const [period, setPeriod] = useState('all');
  return (
    <div className="card records">
      <h2>Top players</h2>
      <Nickname name={mine ?? ''} onChange={onName} />
      <div className="tabs" role="tablist" aria-label="Period">
        {PERIODS.map(({ id, label }) => (
          <button key={id} role="tab" aria-selected={period === id} className={`tab ${period === id ? 'on' : ''}`} onClick={() => setPeriod(id)}>
            {label}
          </button>
        ))}
      </div>
      <RecordList load={() => loadRecords(period)} watch={`${period}|${stamp}`} mine={mine} canReport />
      <p className="hint always">See a name that isn’t OK? Tap the small flag next to it.</p>
      <button className="btn ghost" onClick={onClose}>
        Back
      </button>
    </div>
  );
}
