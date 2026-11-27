import { useState } from 'react';
import { nameProblem, tidyName } from '../records.js';

/**
 * The player's nickname: the name their scores show under on every board. A chip that says it (or asks for one);
 * tapping it opens a small form. Once a nickname is set, scores save by themselves after each game.
 */
export default function Nickname({ name, onChange }) {
  const [isEditing, setIsEditing] = useState(false);
  const [typed, setTyped] = useState(name);
  const [problem, setProblem] = useState(null);

  const submit = (event) => {
    event.preventDefault();
    const issue = nameProblem(typed);
    if (issue) return setProblem(issue);
    onChange(tidyName(typed));
    setProblem(null);
    setIsEditing(false);
  };

  const cancel = () => {
    setTyped(name);
    setProblem(null);
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <button
        className={`name-chip ${name ? '' : 'ask'}`}
        onClick={() => {
          setTyped(name);
          setIsEditing(true);
        }}
      >
        {name ? (
          <>
            Playing as <b>{name}</b>
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-label="Change">
              <path d="M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4" />
            </svg>
          </>
        ) : (
          'Pick your nickname'
        )}
      </button>
    );
  }

  return (
    // Escape or the ✕ puts the name back as it was (the only way out used to be Save).
    <form className="save-score name-form" onSubmit={submit} onKeyDown={(event) => event.key === 'Escape' && cancel()}>
      <input
        value={typed}
        onChange={(event) => setTyped(event.target.value)}
        placeholder="Your nickname"
        aria-label="Your nickname"
        maxLength={16}
        autoComplete="nickname"
        enterKeyHint="done"
        autoFocus
      />
      <button className="btn save">Save</button>
      {name && (
        <button type="button" className="btn ghost cancel" onClick={cancel} aria-label="Cancel">
          ✕
        </button>
      )}
      {problem && (
        <p className="problem" role="alert">
          {problem}
        </p>
      )}
    </form>
  );
}
