import { useState } from 'react';
import { canInstallNow, installNow, installPlatform } from '../install.js';

const ShareIcon = (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Share">
    <path d="M12 15V3M8 7l4-4 4 4M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" />
  </svg>
);
const PlusIcon = (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="4" y="4" width="16" height="16" rx="4" />
    <path d="M12 8v8M8 12h8" />
  </svg>
);
const DotsIcon = (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-label="Menu">
    <circle cx="12" cy="5" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="12" cy="19" r="2" />
  </svg>
);

const STEPS = {
  ios: [
    { icon: ShareIcon, text: <>Tap the <b>Share</b> button in Safari (the square with an arrow, at the bottom or top of the screen).</> },
    { icon: PlusIcon, text: <>Scroll down and tap <b>Add to Home Screen</b>.</> },
    { icon: null, text: <>Tap <b>Add</b>. Slime Merge now has its own icon, like an app.</> },
  ],
  android: [
    { icon: DotsIcon, text: <>Tap the <b>⋮</b> menu at the top right of Chrome.</> },
    { icon: PlusIcon, text: <>Tap <b>Add to Home screen</b> (or <b>Install app</b>).</> },
    { icon: null, text: <>Tap <b>Install</b>. Slime Merge now has its own icon, like an app.</> },
  ],
  desktop: [
    { icon: PlusIcon, text: <>In Chrome or Edge, click the <b>install</b> icon at the right end of the address bar.</> },
    { icon: null, text: <>Click <b>Install</b>. Slime Merge opens in its own window.</> },
  ],
};
const TABS = [
  ['ios', 'iPhone'],
  ['android', 'Android'],
  ['desktop', 'Computer'],
];

/**
 * How to put the game on the home screen: the steps for this device (the other devices are one tap away), and where
 * the browser allows it, a button that installs it right away.
 */
export default function InstallHelp({ onClose }) {
  const [platform, setPlatform] = useState(installPlatform);
  const [canInstall, setCanInstall] = useState(canInstallNow);
  return (
    <div className="card install">
      <h2>Add to Home Screen</h2>
      <p className="sub">Open Slime Merge with one tap, full screen, even without internet.</p>
      {canInstall && (
        <button className="btn" onClick={async () => (await installNow()) && setCanInstall(false)}>
          Install now
        </button>
      )}
      <div className="tabs" role="tablist" aria-label="Device">
        {TABS.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={platform === id} className={`tab ${platform === id ? 'on' : ''}`} onClick={() => setPlatform(id)}>
            {label}
          </button>
        ))}
      </div>
      <ol className="steps">
        {STEPS[platform].map((step, i) => (
          <li key={i}>
            <span className="step-n">{i + 1}</span>
            <span className="step-text">{step.text}</span>
            {step.icon && <span className="step-icon">{step.icon}</span>}
          </li>
        ))}
      </ol>
      {platform === 'ios' && <p className="hint always">On iPhone this works in Safari. In another browser, open the game in Safari first.</p>}
      <button className="btn ghost" onClick={onClose}>
        Back
      </button>
    </div>
  );
}
