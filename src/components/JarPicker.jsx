import { JARS, isJarOpen } from '../game/jars.js';
import SlimeIcon from './SlimeIcon.jsx';

/** Pick the jar to play in. A locked jar says how many more points open it. */
export default function JarPicker({ jarId, lifetimePoints, onPick, onClose }) {
  return (
    <div className="card jars">
      <h2>Jars</h2>
      <p className="sub">Each jar feels different. Points from every game open new ones.</p>
      <ul className="jar-grid">
        {JARS.map((jar) => {
          const isOpen = isJarOpen(jar, lifetimePoints);
          return (
            <li key={jar.id}>
              <button
                className={`jar-tile ${jar.id === jarId ? 'on' : ''}`}
                disabled={!isOpen}
                aria-pressed={jar.id === jarId}
                onClick={() => onPick(jar.id)}
              >
                <span className={`jar-mini jar-${jar.id}`} aria-hidden="true">
                  <SlimeIcon tier={3} size={26} />
                  <SlimeIcon tier={6} size={34} />
                  <SlimeIcon tier={1} size={20} />
                </span>
                <b>{jar.name}</b>
                <small>{isOpen ? jar.blurb : `${(jar.unlockAt - lifetimePoints).toLocaleString()} more points`}</small>
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
