// The jars. Each one changes how slimes move, so the same game feels different in it.
// A jar opens once the player has scored `unlockAt` points in total, over all games.
export const JARS = [
  { id: 'classic', name: 'Classic', blurb: 'The jar you know', unlockAt: 0, gravity: 1.1, air: 0.012, bounce: 0.1, friction: 0.35 },
  { id: 'honey', name: 'Honey jar', blurb: 'Slow and sticky', unlockAt: 500, gravity: 0.8, air: 0.07, bounce: 0.02, friction: 0.9 },
  { id: 'space', name: 'Space jar', blurb: 'Floaty, low gravity', unlockAt: 2500, gravity: 0.4, air: 0.006, bounce: 0.5, friction: 0.2 },
  { id: 'bowl', name: 'Fish bowl', blurb: 'Round, bubbles lift', unlockAt: 6000, gravity: 1.0, air: 0.02, bounce: 0.15, friction: 0.3, isRound: true, hasBubbles: true },
];

export const jarById = (id) => JARS.find((jar) => jar.id === id) ?? JARS[0];

export const isJarOpen = (jar, lifetimePoints) => lifetimePoints >= jar.unlockAt;
