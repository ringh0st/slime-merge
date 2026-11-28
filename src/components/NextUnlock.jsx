import SlimeIcon from './SlimeIcon.jsx';
import { nextJarProgress } from '../game/jars.js';
import { HATS, goalProgress } from '../game/goals.js';

/**
 * What's next to earn, as a bar that fills (play-test: progress to the next jar was only shown inside the Jars page):
 * the next jar by total points, or, once every jar is open, the hat goal closest to done.
 */
export default function NextUnlock({ life, gained = 0 }) {
  const jarNext = nextJarProgress(life.points);
  const goal = jarNext
    ? null
    : goalProgress(life)
        .filter((g) => !g.isDone)
        .sort((a, b) => b.have / b.need - a.have / a.need)[0];
  if (!jarNext && !goal) return null;
  const have = jarNext ? jarNext.have : goal.have;
  const need = jarNext ? jarNext.need : goal.need;
  const before = Math.max(0, have - gained);
  return (
    <div className="next-unlock" role="img" aria-label={jarNext ? `${jarNext.jar.name}: ${jarNext.left.toLocaleString()} points to go` : `${HATS[goal.hat].name}: ${goal.text}, ${goal.have} of ${goal.need}`}>
      {jarNext ? <span className={`jar-mini tiny jar-${jarNext.jar.id}`} aria-hidden="true" /> : <SlimeIcon tier={4} hat={goal.hat} size={34} />}
      <span className="next-unlock-text">
        <b>{jarNext ? jarNext.jar.name : HATS[goal.hat].name}</b>
        <small>{jarNext ? `${jarNext.left.toLocaleString()} to go` : goal.text}</small>
        <span className="next-unlock-bar" aria-hidden="true">
          {/* What this game added grows in after what was there before */}
          <i className="was" style={{ width: `${(before / need) * 100}%` }} />
          <i className="now" style={{ width: `${(have / need) * 100}%` }} />
        </span>
      </span>
    </div>
  );
}
