import { useState } from 'react';
import { JARS, isJarOpen } from '../game/jars.js';
import SlimeIcon from './SlimeIcon.jsx';
import { JAR_STARS, jarStarsOf } from '../game/goals.js';

/**
 * Pick the jar to play in. A locked jar says how many more points open it.
 * @param openGame a game that was left open: { jar, score } (null for none). That game stays in its jar, so picking
 *   another jar asks first: Play starts a new game there and ends the open one, Back keeps everything.
 * @param onStart starts a new game in a jar right away (after that question)
 */
export default function JarPicker({ jarId, lifetimePoints, life, openGame = null, onPick, onStart, onClose }) {
  // The jar the player tapped while a game in another jar is open.
  const [asked, setAsked] = useState(null);
  const pick = (jar) => {
    if (openGame && jar.id !== openGame.jar.id) setAsked(jar);
    else onPick(jar.id);
  };
  if (asked) {
    return (
      <div className="card jars" role="alertdialog" aria-labelledby="new-game-title">
        <span className={`jar-mini jar-${asked.id} ask-jar`} aria-hidden="true">
          <SlimeIcon tier={3} size={26} />
          <SlimeIcon tier={6} size={34} />
          <SlimeIcon tier={1} size={20} />
        </span>
        <h2 id="new-game-title">New game in the {asked.name}?</h2>
        <p className="sub">
          Your open game in the <b>{openGame.jar.name}</b> ({openGame.score.toLocaleString()} points) will end. Its points are kept.
        </p>
        <button className="btn" onClick={() => onStart(asked.id)} autoFocus>
          Play
        </button>
        <button className="btn ghost" onClick={() => setAsked(null)}>
          Back
        </button>
      </div>
    );
  }
  return (
    <div className="card jars">
      <h2>Jars</h2>
      <p className="sub">Each jar feels different. Points from every game open new ones.</p>
      {/* Every jar has three stars to earn; the star hats come from them */}
      <p className="jar-star-key">
        {JAR_STARS.map((star) => (
          <span key={star.id}>
            ★ {star.text}
          </span>
        ))}
        <b>
          {life.jarStars ?? 0} / {JARS.length * JAR_STARS.length} ★
        </b>
      </p>
      {openGame && (
        <p className="jar-note" role="note">
          You have a game open in the <b>{openGame.jar.name}</b>. Another jar starts a new game.
        </p>
      )}
      <ul className="jar-grid">
        {JARS.map((jar) => {
          const isOpen = isJarOpen(jar, lifetimePoints);
          return (
            <li key={jar.id}>
              <button
                className={`jar-tile ${jar.id === jarId ? 'on' : ''}`}
                disabled={!isOpen}
                aria-pressed={jar.id === jarId}
                onClick={() => pick(jar)}
              >
                <span className={`jar-mini jar-${jar.id}`} aria-hidden="true">
                  <SlimeIcon tier={3} size={26} />
                  <SlimeIcon tier={6} size={34} />
                  <SlimeIcon tier={1} size={20} />
                </span>
                <b>{jar.name}</b>
                <small>{isOpen ? jar.blurb : `${(jar.unlockAt - lifetimePoints).toLocaleString()} more points`}</small>
                {isOpen && (
                  <span className="jar-stars" aria-label={`${jarStarsOf(life, jar.id).filter(Boolean).length} of ${JAR_STARS.length} stars`}>
                    {jarStarsOf(life, jar.id).map((isEarned, i) => (
                      <i key={i} className={isEarned ? 'on' : ''}>
                        ★
                      </i>
                    ))}
                  </span>
                )}
                {!isOpen && (
                  <span className="lock" aria-label="Locked">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                      <rect x="5" y="11" width="14" height="9" rx="2.5" />
                      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                    </svg>
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      <button className="btn ghost" onClick={onClose}>
        Back
      </button>
    </div>
  );
}
