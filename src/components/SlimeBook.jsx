import SlimeIcon from './SlimeIcon.jsx';
import { TIERS, RAINBOW_TIER, BOMB_TIER, ROCK_TIER } from '../game/tiers.js';
import { HATS, goalProgress } from '../game/goals.js';

const SPECIALS = [
  { tier: RAINBOW_TIER, name: 'Rainbow', text: 'Merges with any slime it touches.' },
  { tier: BOMB_TIER, name: 'Bomb', text: 'Pops everything close to it.' },
  { tier: 2, frozen: true, name: 'Frozen', text: 'Can’t merge until a merge happens beside it.' },
  { tier: ROCK_TIER, name: 'Rock', text: 'Cracks when a merge happens beside it.' },
];

/**
 * The slime book: every slime found so far, the special pieces, and goals that unlock hats.
 * Tapping an unlocked hat puts it on the bigger slimes in the jar; tapping it again takes it off.
 */
export default function SlimeBook({ discovered, life, hat, onHat, onClose }) {
  const goals = goalProgress(life);
  return (
    <div className="card book">
      <h2>Slime book</h2>
      <p className="eyebrow">
        Slimes · {Math.min(discovered + 1, TIERS.length)} / {TIERS.length}
      </p>
      <ul className="book-grid">
        {TIERS.map((tier, i) => (
          <li key={tier.name} className={i <= discovered ? 'on' : ''}>
            <SlimeIcon tier={i} size={42} hat={i <= discovered && i !== 9 ? hat : null} />
            <small>{i <= discovered ? tier.name : '???'}</small>
          </li>
        ))}
      </ul>

      <p className="eyebrow">Special pieces</p>
      <ul className="special-list">
        {SPECIALS.map((special) => (
          <li key={special.name}>
            <SlimeIcon tier={special.tier} frozen={special.frozen} size={36} />
            <span>
              <b>{special.name}</b> {special.text}
            </span>
          </li>
        ))}
      </ul>

      <p className="eyebrow">Goals and hats</p>
      <ul className="goal-list">
        {goals.map((goal) => (
          <li key={goal.id} className={goal.isDone ? 'done' : ''}>
            <button
              className={`hat-btn ${hat === goal.hat ? 'on' : ''}`}
              disabled={!goal.isDone}
              aria-pressed={hat === goal.hat}
              aria-label={goal.isDone ? `${HATS[goal.hat].name}: ${hat === goal.hat ? 'take off' : 'wear'}` : `${HATS[goal.hat].name}, locked`}
              onClick={() => onHat(hat === goal.hat ? null : goal.hat)}
            >
              <SlimeIcon tier={4} hat={goal.hat} size={40} />
            </button>
            <span className="goal-text">
              <b>{goal.text}</b>
              <span className="meter">
                <span style={{ width: `${(goal.have / goal.need) * 100}%` }} />
              </span>
              <small>
                {goal.isDone ? `${HATS[goal.hat].name} unlocked. Tap it to wear.` : `${goal.have.toLocaleString()} / ${goal.need.toLocaleString()} · ${HATS[goal.hat].name}`}
              </small>
            </span>
          </li>
        ))}
      </ul>
      <button className="btn ghost" onClick={onClose}>
        Back
      </button>
    </div>
  );
}
