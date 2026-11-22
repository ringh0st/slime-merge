import { useEffect, useState } from 'react';
import RecordList from './RecordList.jsx';
import { loadClubWinner, loadRecords } from '../records.js';
import { newClubCode, tidyClubCode } from '../club.js';

const PERIODS = [
  { id: 'week', label: 'This week' },
  { id: 'all', label: 'All time' },
];

/**
 * The club card: a private board for people who know each other, joined with a short code (no accounts).
 * Without a club it offers to start one or to type a friend's code.
 */
export default function Club({ club, mine, stamp, onJoin, onLeave, onClose }) {
  const [period, setPeriod] = useState('week');
  const [typed, setTyped] = useState('');
  const [problem, setProblem] = useState(null);
  const [copied, setCopied] = useState(false);
  // Last week's winner wears a small crown this week.
  const [winner, setWinner] = useState(null);
  useEffect(() => {
    let current = true;
    if (club) loadClubWinner(club).then((row) => current && setWinner(row));
    return () => {
      current = false;
    };
  }, [club]);

  const join = (event) => {
    event.preventDefault();
    const code = tidyClubCode(typed);
    if (!code) return setProblem('A code looks like JELLY-4821.');
    onJoin(code);
  };

  const share = async () => {
    const text = `Join my Slime Merge club! Open the game, tap Club and type ${club}\n${window.location.href.split('#')[0]}`;
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

  if (!club) {
    return (
      <div className="card club">
        <h2>Jar club</h2>
        <p className="sub">A private board for family and friends. Share one short code; no accounts.</p>
        <button className="btn" onClick={() => onJoin(newClubCode())}>
          Start a club
        </button>
        <form className="save-score" onSubmit={join}>
          <input
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            placeholder="Have a code? JELLY-4821"
            aria-label="Club code"
            maxLength={14}
            autoCapitalize="characters"
            autoComplete="off"
            enterKeyHint="done"
          />
          <button className="btn save">Join</button>
          {problem && (
            <p className="problem" role="alert">
              {problem}
            </p>
          )}
        </form>
        <button className="btn ghost" onClick={onClose}>
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="card club">
      <p className="eyebrow">Our jar club</p>
      <div className="club-code">{club}</div>
      <button className="chip-btn" onClick={share}>
        {copied ? 'Copied!' : 'Invite with this code'}
      </button>
      {winner && (
        <p className="winner">
          Last week’s winner: <b>{winner.name}</b> · {winner.score.toLocaleString()}
        </p>
      )}
      <div className="tabs" role="tablist" aria-label="Period">
        {PERIODS.map(({ id, label }) => (
          <button key={id} role="tab" aria-selected={period === id} className={`tab ${period === id ? 'on' : ''}`} onClick={() => setPeriod(id)}>
            {label}
          </button>
        ))}
      </div>
      <RecordList
        load={() => loadRecords(period, club)}
        watch={`${period}|${club}|${stamp}`}
        mine={mine}
        crowned={winner?.name}
        empty="Nobody yet. Play a game and save your score!"
      />
      <div className="menu-actions">
        <button className="btn ghost" onClick={onClose}>
          Back
        </button>
        <button className="btn ghost quiet" onClick={onLeave}>
          Leave club
        </button>
      </div>
    </div>
  );
}
