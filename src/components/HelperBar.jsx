import SlimeIcon from './SlimeIcon.jsx';

const ART = {
  shake: (
    <svg viewBox="0 0 32 32" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="10" y="8" width="12" height="18" rx="4" />
      <path d="M12 8V5h8v3M4 12l3 3-3 3M28 12l-3 3 3 3" />
    </svg>
  ),
  pop: (
    <svg viewBox="0 0 32 32" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="16" cy="16" r="6" />
      <path d="M16 3v4M16 25v4M3 16h4M25 16h4M7 7l3 3M22 22l3 3M25 7l-3 3M10 22l-3 3" />
    </svg>
  ),
  hold: (
    <svg viewBox="0 0 32 32" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 9h12M11 5h10v4H11zM9 13c0-2 1-4 3-4h8c2 0 3 2 3 4v10a4 4 0 0 1-4 4h-6a4 4 0 0 1-4-4z" />
    </svg>
  ),
};

/**
 * The three helpers under the jar, each with two words saying what it does (the owner asked what Hold is). Shake
 * makes everything jump; Pop removes one piece you tap; Hold puts the waiting piece aside (or swaps it back). Shake and Pop are earned by scoring: the bar shows the next one filling.
 * @param helpers { shake, pop, charge, held, canHold } from the game
 */
export default function HelperBar({ helpers, isPopping, onShake, onPop, onHold }) {
  return (
    <div className="helpers">
      <div className="helper-row">
        <button className="helper" onClick={onShake} disabled={helpers.shake < 1} aria-label={`Shake the jar, ${helpers.shake} left`}>
          {ART.shake}
          <span>
            Shake
            <small>jiggle all</small>
          </span>
          <i aria-hidden="true">{helpers.shake}</i>
        </button>
        <button
          className={`helper ${isPopping ? 'on' : ''}`}
          onClick={onPop}
          disabled={helpers.pop < 1}
          aria-pressed={isPopping}
          aria-label={`Pop a slime, ${helpers.pop} left`}
        >
          {ART.pop}
          <span>
            Pop
            <small>remove one</small>
          </span>
          <i aria-hidden="true">{helpers.pop}</i>
        </button>
        <button
          className="helper"
          onClick={onHold}
          disabled={!helpers.canHold}
          aria-label={helpers.held ? 'Swap with the slime you put aside' : 'Put this slime aside'}
        >
          {helpers.held ? <SlimeIcon tier={helpers.held.tier} frozen={helpers.held.frozen} size={28} /> : ART.hold}
          <span>
            {helpers.held ? 'Swap' : 'Hold'}
            <small>{helpers.held ? 'use the saved one' : 'save for later'}</small>
          </span>
        </button>
      </div>
      <div className="helper-meter" role="img" aria-label={`Next helper ${Math.round(helpers.charge * 100)}% ready`}>
        <span style={{ width: `${helpers.charge * 100}%` }} />
      </div>
    </div>
  );
}
