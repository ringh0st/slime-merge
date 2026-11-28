// `sound` colors every effect in that jar (audio.js setVoice): deeper in honey, echoing in space, squeaky for
// balloons, square arcade beeps in the pixel jars.
// The jars. Each one changes how slimes move, so the same game feels different in it.
// A jar opens once the player has scored `unlockAt` points in total, over all games.
export const JARS = [
  {
    id: 'classic',
    name: 'Classic',
    blurb: 'The jar you know',
    unlockAt: 0,
    gravity: 1.1,
    air: 0.012,
    bounce: 0.1,
    friction: 0.35,
  },
  {
    id: 'honey',
    sound: { pitch: 0.72 },
    name: 'Honey jar',
    blurb: 'Thick and sticky',
    unlockAt: 500,
    gravity: 0.95,
    air: 0.04,
    bounce: 0.02,
    friction: 0.9,
  },
  {
    id: 'space',
    sound: { pitch: 0.9, wet: 0.55 },
    name: 'Space jar',
    blurb: 'Floaty, low gravity',
    unlockAt: 2500,
    gravity: 0.6,
    air: 0.006,
    bounce: 0.5,
    friction: 0.2,
  },
  {
    id: 'bowl',
    sound: { pitch: 1.1, wet: 0.3 },
    name: 'Fish bowl',
    blurb: 'Round, bubbles lift',
    unlockAt: 6000,
    gravity: 1.0,
    air: 0.02,
    bounce: 0.15,
    friction: 0.3,
    isRound: true,
    hasBubbles: true,
  },
  // Upside down: pieces are let go at the bottom, float up like balloons and pile under the lid.
  {
    id: 'balloon',
    sound: { pitch: 1.35 },
    name: 'Balloon jar',
    blurb: 'Upside down: they float up',
    unlockAt: 10000,
    gravity: 0.85,
    air: 0.02,
    bounce: 0.2,
    friction: 0.3,
    isUpsideDown: true,
  },
  // Rocks like a boat, so the pile slides from side to side.
  {
    id: 'ship',
    sound: { pitch: 0.95, wet: 0.2 },
    name: 'Ship jar',
    blurb: 'Rocks like a boat',
    unlockAt: 15000,
    gravity: 1.05,
    air: 0.012,
    bounce: 0.1,
    friction: 0.22,
    rocking: { degrees: 5, seconds: 7 },
  },
  // Three pegs send a dropped piece bouncing.
  {
    id: 'gumball',
    sound: { pitch: 1.2 },
    name: 'Gumball jar',
    blurb: 'Pegs bounce them around',
    unlockAt: 22000,
    gravity: 1.05,
    air: 0.01,
    bounce: 0.3,
    friction: 0.3,
    hasPegs: true,
  },
  // A gust every few seconds pushes everything to one side.
  {
    id: 'windy',
    sound: { pitch: 1.05, wet: 0.25 },
    name: 'Windy jar',
    blurb: 'Gusts push them sideways',
    unlockAt: 30000,
    gravity: 1.0,
    air: 0.014,
    bounce: 0.12,
    friction: 0.3,
    hasWind: true,
  },
  // A narrow middle: pieces pile above it, then squeeze through.
  {
    id: 'hourglass',
    sound: { pitch: 0.85 },
    name: 'Hourglass jar',
    blurb: 'A narrow middle',
    unlockAt: 40000,
    gravity: 1.05,
    air: 0.012,
    bounce: 0.1,
    friction: 0.3,
    hasWaist: true,
  },
  // Two slimes of the same kind that are close pull toward each other.
  { id: 'magnet', sound: { pitch: 1.12, wet: 0.35 }, name: 'Magnet jar', blurb: 'Twins pull together', unlockAt: 50000, gravity: 1.0, air: 0.014, bounce: 0.1, friction: 0.25, hasMagnet: true },
  // A wall down the middle makes two rooms; slimes only meet over the top of it.
  { id: 'twin', name: 'Twin jar', blurb: 'A wall down the middle', unlockAt: 62000, gravity: 1.05, air: 0.012, bounce: 0.1, friction: 0.3, hasDivider: true },
  // The side walls slowly come in and go back out.
  { id: 'squeeze', sound: { pitch: 0.8 }, name: 'Squeeze jar', blurb: 'The walls breathe in and out', unlockAt: 75000, gravity: 1.05, air: 0.012, bounce: 0.1, friction: 0.3, squeezing: true },
  // The arcade jars: drawn in big pixels, like games from the 1980s.
  // Glowing dots fill the maze: every dot a slime touches is eaten for points, and they come back.
  { id: 'maze', sound: { type: 'square' }, name: 'Maze jar', blurb: 'Eat the dots for points', unlockAt: 90000, gravity: 1.05, air: 0.012, bounce: 0.15, friction: 0.3, hasDots: true, isPixel: true },
  // A row of bricks: two knocks break one, and the row comes back.
  { id: 'brick', sound: { type: 'square' }, name: 'Brick jar', blurb: 'Smash the bricks', unlockAt: 105000, gravity: 1.05, air: 0.012, bounce: 0.2, friction: 0.3, hasBricks: true, isPixel: true },
  // A bat slides from side to side and knocks pieces away.
  { id: 'paddle', sound: { type: 'square' }, name: 'Paddle jar', blurb: 'A bat knocks them about', unlockAt: 120000, gravity: 1.05, air: 0.012, bounce: 0.3, friction: 0.3, hasPaddle: true, isPixel: true },
  // A row filled from wall to wall clears, as in the falling-block games.
  { id: 'line', sound: { type: 'square' }, name: 'Line jar', blurb: 'Fill a row to clear it', unlockAt: 135000, gravity: 1.05, air: 0.012, bounce: 0.08, friction: 0.35, hasRows: true, isPixel: true },
  // A squad of little aliens marches under the line: land on them for points.
  { id: 'alien', sound: { type: 'square' }, name: 'Alien jar', blurb: 'Squash the marching aliens', unlockAt: 150000, gravity: 1.05, air: 0.012, bounce: 0.2, friction: 0.3, hasAliens: true, isPixel: true },
];

export const jarById = (id) => JARS.find((jar) => jar.id === id) ?? JARS[0];

// "?alljars" on the game's address opens every jar for that visit (the owner's way to try jars not yet earned).
const ALL_OPEN = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('alljars');

export const isJarOpen = (jar, lifetimePoints) => ALL_OPEN || lifetimePoints >= jar.unlockAt;

/** The next jar to open by total points, with how far along it is ({ jar, have, need, left }); null once all are open. */
export function nextJarProgress(lifetimePoints) {
  const index = JARS.findIndex((jar) => lifetimePoints < jar.unlockAt);
  if (index < 0) return null;
  const from = JARS[index - 1]?.unlockAt ?? 0;
  const jar = JARS[index];
  return { jar, have: lifetimePoints - from, need: jar.unlockAt - from, left: jar.unlockAt - lifetimePoints };
}
