// Things to play for: goals counted over all games, each unlocking a hat the slimes can wear.

/** What is counted over all games. */
export const EMPTY_LIFE = {
  points: 0,
  games: 0,
  best: 0,
  kings: 0,
  rocks: 0,
  bestCombo: 0,
  dailies: 0,
  rainbows: 0,
  bestStreak: 0,
  // Per jar (by id): the best score and the biggest slime made there, for the jar stars.
  jarBest: {},
  jarTop: {},
  jarStars: 0,
};

/**
 * Three stars to earn in every jar (play-test: after one look each jar was just Classic with a twist), so all
 * seventeen jars stay worth playing. Counted in normal games (not the daily jar or a fight).
 */
export const JAR_STARS = [
  { id: 'score1', text: 'Score 1,000', test: (best) => best >= 1000 },
  { id: 'mochi', text: 'Make a Mochi', test: (_best, top) => top >= 8 },
  { id: 'score3', text: 'Score 3,000', test: (best) => best >= 3000 },
];

/** Which of a jar's stars are earned: [true, false, …] in JAR_STARS order. */
export const jarStarsOf = (life, jarId) => JAR_STARS.map((star) => star.test(life.jarBest?.[jarId] ?? 0, life.jarTop?.[jarId] ?? -1));

const countJarStars = (jarBest, jarTop) =>
  Object.keys({ ...jarBest, ...jarTop }).reduce((sum, id) => sum + JAR_STARS.filter((star) => star.test(jarBest[id] ?? 0, jarTop[id] ?? -1)).length, 0);

export const GOALS = [
  { id: 'king', text: 'Make a King', stat: 'kings', need: 1, hat: 'top' },
  { id: 'combo', text: 'Reach a 5× combo', stat: 'bestCombo', need: 5, hat: 'bow' },
  { id: 'rocks', text: 'Crack 20 rocks', stat: 'rocks', need: 20, hat: 'party' },
  { id: 'score', text: 'Score 4,000 in one game', stat: 'best', need: 4000, hat: 'cool' },
  { id: 'daily', text: 'Play 5 daily jars', stat: 'dailies', need: 5, hat: 'flower' },
  { id: 'kings', text: 'Make 5 Kings', stat: 'kings', need: 5, hat: 'crown' },
  // Only the daily jar gives these two: play it days in a row.
  { id: 'streak3', text: 'Daily jar 3 days in a row', stat: 'bestStreak', need: 3, hat: 'beanie' },
  { id: 'streak7', text: 'Daily jar 7 days in a row', stat: 'bestStreak', need: 7, hat: 'halo' },
  // Stars earned in the jars (three in each).
  { id: 'stars6', text: 'Earn 6 jar stars', stat: 'jarStars', need: 6, hat: 'star' },
  { id: 'stars18', text: 'Earn 18 jar stars', stat: 'jarStars', need: 18, hat: 'sprout' },
  { id: 'stars36', text: 'Earn 36 jar stars', stat: 'jarStars', need: 36, hat: 'wizard' },
];

export const HATS = {
  top: { name: 'Top hat' },
  bow: { name: 'Bow' },
  party: { name: 'Party hat' },
  cool: { name: 'Cool glasses' },
  flower: { name: 'Flower' },
  crown: { name: 'Crown' },
  beanie: { name: 'Beanie' },
  halo: { name: 'Halo' },
  star: { name: 'Star clip' },
  sprout: { name: 'Sprout' },
  wizard: { name: 'Wizard hat' },
};

export const HAT_IDS = Object.keys(HATS);

/** How far each goal is: [{ ...goal, have, isDone }]. */
export const goalProgress = (life) => GOALS.map((goal) => ({ ...goal, have: Math.min(goal.need, life[goal.stat] ?? 0), isDone: (life[goal.stat] ?? 0) >= goal.need }));

/** The hats a player has unlocked. */
export const unlockedHats = (life) => goalProgress(life).filter((goal) => goal.isDone).map((goal) => goal.hat);

/**
 * The lifetime counts after a finished game. `run` is what the engine counted: { kings, rocks, maxCombo, rainbows }.
 * @param streak the daily-jar streak including this game (0 for a game that isn't the daily jar)
 * @param jarId the jar of a normal game (null for the daily jar or a fight), for the jar stars; `top` its biggest slime
 */
export function lifeAfterGame(life, score, run, isDaily, streak = 0, jarId = null, top = -1) {
  const jarBest = { ...life.jarBest };
  const jarTop = { ...life.jarTop };
  if (jarId) {
    jarBest[jarId] = Math.max(jarBest[jarId] ?? 0, score);
    jarTop[jarId] = Math.max(jarTop[jarId] ?? -1, top);
  }
  return {
    points: life.points + score,
    games: life.games + 1,
    best: Math.max(life.best, score),
    kings: life.kings + run.kings,
    rocks: life.rocks + run.rocks,
    bestCombo: Math.max(life.bestCombo, run.maxCombo),
    dailies: life.dailies + (isDaily ? 1 : 0),
    rainbows: life.rainbows + run.rainbows,
    bestStreak: Math.max(life.bestStreak ?? 0, streak),
    jarBest,
    jarTop,
    jarStars: countJarStars(jarBest, jarTop),
  };
}
