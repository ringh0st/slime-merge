import { useEffect, useState } from 'react';
import SlimeIcon from './SlimeIcon.jsx';
import { ROUNDS_TO_WIN, tidyFightCode } from '../fight.js';

const HEADLINES = { win: 'You win!', lose: 'You lose', draw: 'It’s a draw!' };
const REASONS = {
  win: { overflow: 'Their jar overflowed.', time: 'Time’s up: you scored more.', left: 'Your friend left the fight.' },
  lose: { overflow: 'Your jar overflowed.', time: 'Time’s up: they scored more.' },
  draw: { time: 'Time’s up: the same score!' },
};

/**
 * The fight page: start a fight and share its code, or join one; then the countdown and, after a fight, the result
 * with a rematch. The fight itself is played in the jar (App).
 * @param fight the state from useFight
 */
export default function Fight({ fight, me, onHost, onJoin, onAgain, onLeave }) {
  const [typed, setTyped] = useState('');
  const [problem, setProblem] = useState(null);
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (fight.status !== 'countdown') return undefined;
    const timer = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(timer);
  }, [fight.status]);

  const join = (event) => {
    event.preventDefault();
    const code = tidyFightCode(typed);
    if (!code) return setProblem('A code is five numbers.');
    setProblem(null);
    onJoin(code);
  };

  const share = async () => {
    const text = `Fight me in Slime Merge! Open the game, tap Fight a friend and type ${fight.code}\n${window.location.href.split('#')[0]}`;
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

  const versus = fight.foe && (
    <div className="versus">
      <span>
        <SlimeIcon tier={5} hat={me.hat} size={56} />
        <b>{me.name || 'You'}</b>
        {fight.status === 'done' && <i>{fight.myScore.toLocaleString()}</i>}
      </span>
      <em>vs</em>
      <span>
        <SlimeIcon tier={3} hat={fight.foe.hat} size={56} />
        <b>{fight.foe.name}</b>
        {fight.status === 'done' && <i>{fight.foe.score.toLocaleString()}</i>}
      </span>
    </div>
  );

  if (fight.status === 'idle') {
    return (
      <div className="card fight">
        <h2>Fight a friend</h2>
        <p className="sub">Two jars, the same slimes, three minutes a round, first to two rounds. Watch your friend play live: combos drop rocks into their jar!</p>
        <button className="btn" onClick={onHost}>
          Start a fight
        </button>
        <form className="save-score" onSubmit={join}>
          <input
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            placeholder="Have a code? 12345"
            aria-label="Fight code"
            inputMode="numeric"
            maxLength={7}
            autoComplete="off"
            enterKeyHint="go"
          />
          <button className="btn save">Join</button>
          {(problem || fight.problem) && (
            <p className="problem" role="alert">
              {problem || fight.problem}
            </p>
          )}
        </form>
        <button className="btn ghost" onClick={onLeave}>
          Back
        </button>
      </div>
    );
  }

  if (fight.status === 'connecting' || fight.status === 'waiting') {
    return (
      <div className="card fight">
        <h2>{fight.isHost ? 'Your fight code' : 'Joining…'}</h2>
        {fight.isHost ? (
          <>
            <div className="club-code">{fight.code}</div>
            <p className="sub" role="status">
              {fight.status === 'connecting' ? 'Opening the fight…' : 'Waiting for your friend to type this code…'}
            </p>
            <button className="btn" onClick={share}>
              {copied ? 'Copied!' : 'Send the code'}
            </button>
          </>
        ) : (
          <p className="sub" role="status">
            Looking for fight {fight.code}…
          </p>
        )}
        <button className="btn ghost" onClick={onLeave}>
          Cancel
        </button>
      </div>
    );
  }

  if (fight.status === 'countdown') {
    return (
      <div className="card fight">
        {versus}
        <div className="final" aria-live="polite">
          {Math.max(1, Math.ceil((fight.startAt - now) / 1000))}
        </div>
        <p className="sub">Get ready!</p>
      </div>
    );
  }

  // After a round: who took it, and how the match (first to two rounds) stands.
  const { me: myWins, foe: foeWins } = fight.wins;
  const isMatchOver = myWins >= ROUNDS_TO_WIN || foeWins >= ROUNDS_TO_WIN;
  return (
    <div className="card fight">
      <h2>{isMatchOver ? (myWins > foeWins ? 'You won the match!' : `${fight.foe?.name ?? 'Your friend'} won the match`) : HEADLINES[fight.outcome]}</h2>
      <p className="sub">{REASONS[fight.outcome]?.[fight.reason]}</p>
      {versus}
      <p className="series" aria-label={`Rounds: you ${myWins}, ${fight.foe?.name ?? 'friend'} ${foeWins}`}>
        <b>{myWins}</b> – <b>{foeWins}</b>
        <small>{isMatchOver ? 'Match over' : `First to ${ROUNDS_TO_WIN} rounds wins`}</small>
      </p>
      {fight.foe ? (
        <button className="btn" onClick={onAgain} disabled={fight.wantsAgain}>
          {fight.wantsAgain ? 'Waiting for your friend…' : isMatchOver ? (fight.foeWantsAgain ? 'New match! They’re ready' : 'New match') : fight.foeWantsAgain ? 'Next round! They’re ready' : 'Next round'}
        </button>
      ) : (
        <p className="sub">Your friend left.</p>
      )}
      <button className="btn ghost" onClick={onLeave}>
        Home
      </button>
      <p className="hint always">Fight scores are just for the fight: they don’t count for Top players or your best.</p>
    </div>
  );
}
