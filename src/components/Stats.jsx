import { useEffect, useState } from 'react';
import { loadStats } from '../records.js';
import { store } from '../storage.js';
import { dayLabel } from '../daily.js';

/**
 * The owner's view of how many people play (open the game with ?stats at the end of its address): totals, and one
 * row per day for the last 30 days. Counts only, nothing personal. It opens only with the owner's password, which
 * the server checks (supabase/slime_records.sql, slime_owner).
 */
export default function Stats({ onClose }) {
  // The owner's password is typed once and kept on this device.
  const [password, setPassword] = useState(() => store.get('slime.ownerKey', ''));
  const [typed, setTyped] = useState('');
  const [state, setState] = useState({ status: password ? 'loading' : 'locked' });
  useEffect(() => {
    if (!password) return undefined;
    let current = true;
    setState({ status: 'loading' });
    loadStats(password)
      .then((stats) => {
        if (!current) return;
        if (stats) return setState({ status: 'ready', stats });
        store.set('slime.ownerKey', '');
        setPassword('');
        setState({ status: 'locked', problem: 'That password isn’t right.' });
      })
      .catch((error) => current && setState({ status: 'locked', problem: `${error.message} (Run the newest slime_records.sql in Supabase first.)` }));
    return () => {
      current = false;
    };
  }, [password]);

  const unlock = (event) => {
    event.preventDefault();
    store.set('slime.ownerKey', typed);
    setPassword(typed);
  };

  if (state.status !== 'ready') {
    return (
      <div className="card stats">
        <h2>Admin</h2>
        {state.status === 'loading' ? (
          <p className="sub">Counting…</p>
        ) : (
          <>
            <p className="sub">For the game’s owner. Enter the admin password.</p>
            <form className="save-score" onSubmit={unlock}>
              <input
                type="password"
                value={typed}
                onChange={(event) => setTyped(event.target.value)}
                placeholder="Admin password"
                aria-label="Admin password"
                autoComplete="current-password"
                enterKeyHint="go"
              />
              <button className="btn save">Open</button>
              {state.problem && (
                <p className="problem" role="alert">
                  {state.problem}
                </p>
              )}
            </form>
          </>
        )}
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
      <h2>Admin</h2>
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
