import { useState } from 'react';
import { nameProblem, saveScore } from '../records.js';

/** On the game-over card: type a name and save this score to the shared records. */
export default function SaveScore({ score, initialName, onSaved }) {
  const [name, setName] = useState(initialName);
  const [status, setStatus] = useState('idle');
  const [problem, setProblem] = useState(null);

  const submit = async (event) => {
    event.preventDefault();
    const issue = nameProblem(name);
    if (issue) return setProblem(issue);
    setStatus('saving');
    setProblem(null);
    try {
      onSaved(await saveScore(name, score));
    } catch (error) {
      setProblem(error.message);
      setStatus('idle');
    }
  };

  return (
    <form className="save-score" onSubmit={submit}>
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        placeholder="Your name"
        aria-label="Your name"
        maxLength={16}
        autoComplete="nickname"
        enterKeyHint="done"
      />
      <button className="btn save" disabled={status === 'saving'}>
        {status === 'saving' ? 'Saving…' : 'Save'}
      </button>
      {problem && (
        <p className="problem" role="alert">
          {problem}
        </p>
      )}
    </form>
  );
}
