import { useEffect, useRef, useState } from "react";
import SlimeIcon from "./SlimeIcon.jsx";
import {
  APP_VERSION,
  COPYRIGHT_YEAR,
  GAME_NAME,
  STUDIO_NAME,
} from "../appInfo.js";

const SPLASH_MS = 3600;
const FADE_MS = 420;
const LINES = [
  "Filling the jar…",
  "Waking the slimes…",
  "Polishing the King’s crown…",
];

/**
 * The opening screen: two slimes drop into a little jar and merge into a bigger one, the game's name pops in and a
 * bar fills while the game loads underneath. Shows who made it and the version. A tap, Enter or Escape skips it.
 */
export default function Splash({ onDone }) {
  const [isLeaving, setIsLeaving] = useState(false);
  const [line, setLine] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    const leave = setTimeout(() => setIsLeaving(true), SPLASH_MS);
    const lines = setInterval(
      () => setLine((i) => (i + 1) % LINES.length),
      SPLASH_MS / LINES.length
    );
    ref.current?.focus({ preventScroll: true });
    return () => {
      clearTimeout(leave);
      clearInterval(lines);
    };
  }, []);

  useEffect(() => {
    if (!isLeaving) return undefined;
    const done = setTimeout(onDone, FADE_MS);
    return () => clearTimeout(done);
  }, [isLeaving, onDone]);

  const skip = () => setIsLeaving(true);

  return (
    <div
      className={`splash ${isLeaving ? "leaving" : ""}`}
      ref={ref}
      tabIndex={-1}
      onClick={skip}
      onKeyDown={(e) =>
        (e.key === "Enter" || e.key === "Escape" || e.key === " ") && skip()
      }
      role="dialog"
      aria-modal="true"
      aria-label={`${GAME_NAME}, a ${STUDIO_NAME} production. Version ${APP_VERSION}. Tap to skip.`}
    >
      <div className="splash-jar" aria-hidden="true">
        <span className="splash-drop a">
          <SlimeIcon tier={3} size={64} />
        </span>
        <span className="splash-drop b">
          <SlimeIcon tier={3} size={64} />
        </span>
        <span className="splash-ring" />
        <span className="splash-big">
          <SlimeIcon tier={5} size={112} />
        </span>
      </div>

      <h1 className="splash-title" aria-hidden="true">
        {[...GAME_NAME].map((letter, i) => (
          <span key={i} style={{ "--i": i }}>
            {letter === " " ? "\u00a0" : letter}
          </span>
        ))}
      </h1>
      <p className="splash-tag" aria-hidden="true">
        Drop. Match. Merge.
      </p>

      <div className="splash-loading" aria-hidden="true">
        <div className="splash-bar">
          <span style={{ animationDuration: `${SPLASH_MS}ms` }} />
        </div>
        <p key={line}>{LINES[line]}</p>
      </div>

      <footer className="splash-foot">
        <p>
          A <b>{STUDIO_NAME}</b> production
        </p>
        <small>
          Version {APP_VERSION} · © {COPYRIGHT_YEAR} {STUDIO_NAME}
        </small>
      </footer>
    </div>
  );
}
