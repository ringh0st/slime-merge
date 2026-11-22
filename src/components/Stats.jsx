import { useEffect, useState } from 'react';
import { loadStats } from '../records.js';
import { dayLabel } from '../daily.js';

/**
 * The owner's view of how many people play (open the game with ?stats at the end of its address): totals, and one
 * row per day for the last 30 days. Counts only, nothing personal.
 */
export default function Stats({ onClose }) {
  const [state, setState] = useState({ status: 'loading' });
  useEffect(() => {
    let current = true;
    loadStats()
      .then((stats) => current && setState({ status: 'ready', stats }))
      .catch((error) => current && setState({ status: 'error', message: error.message }));
    return () => {
      current = false;
    };
  }, []);

  if (state.status !== 'ready') {
    return (
      <div className="card stats">
        <h2>Players</h2>
        <p className="sub">{state.status === 'loading' ? 'Counting…' : `${state.message} (Run the newest slime_records.sql in Supabase first.)`}</p>
        <button className="btn ghost" onClick={onClose}>
          Back
        </button>
      </div>
    );
  }

  const { stats } = state;
  const most = Math.max(1, ...stats.days.map((day) => day.players));
  return (
    <div className="card stats">
      <h2>Players</h2>
      <ul className="stat-tiles">
        <li>
          <b>{stats.players_ever.toLocaleString()}</b>
          <span>tried the game</span>
        </li>
        <li>
          <b>{stats.games_ever.toLocaleString()}</b>
          <span>games played</span>
        </li>
        <li>
          <b>{stats.names.toLocaleString()}</b>
          <span>names on the boards</span>
        </li>
        <li>
          <b>{stats.fights_ever.toLocaleString()}</b>
          <span>fights</span>
        </li>
      </ul>
      <p className="hint always">{stats.counting_since ? `Counting since ${dayLabel(stats.counting_since)}. Each phone or browser counts once.` : 'Nobody has been counted yet.'}</p>
      {stats.days.length > 0 && (
        <table className="stat-days">
          <thead>
            <tr>
              <th>Day</th>
              <th>Players</th>
              <th>New</th>
              <th>Games</th>
            </tr>
          </thead>
          <tbody>
            {stats.days.map((day) => (
              <tr key={day.day}>
                <td>{dayLabel(day.day)}</td>
                {/* A bar behind the number: how busy the day was next to the busiest one. */}
                <td style={{ backgroundImage: `linear-gradient(90deg, var(--bar) ${(day.players / most) * 100}%, transparent 0)` }}>{day.players}</td>
                <td>{day.new_players}</td>
                <td>{day.games}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <button className="btn ghost" onClick={onClose}>
        Back
      </button>
    </div>
  );
}
