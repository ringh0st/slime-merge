// Things to play for: goals counted over all games, each unlocking a hat the slimes can wear.

/** What is counted over all games. */
export const EMPTY_LIFE = { points: 0, games: 0, best: 0, kings: 0, rocks: 0, bestCombo: 0, dailies: 0, rainbows: 0 };

export const GOALS = [
  { id: 'king', text: 'Make a King', stat: 'kings', need: 1, hat: 'top' },
  { id: 'combo', text: 'Reach a 5× combo', stat: 'bestCombo', need: 5, hat: 'bow' },
  { id: 'rocks', text: 'Crack 20 rocks', stat: 'rocks', need: 20, hat: 'party' },
  { id: 'score', text: 'Score 5,000 in one game', stat: 'best', need: 5000, hat: 'cool' },
  { id: 'daily', text: 'Play 5 daily jars', stat: 'dailies', need: 5, hat: 'flower' },
  { id: 'kings', text: 'Make 5 Kings', stat: 'kings', need: 5, hat: 'crown' },
];

export const HATS = {
  top: { name: 'Top hat' },
  bow: { name: 'Bow' },
  party: { name: 'Party hat' },
  cool: { name: 'Cool glasses' },
  flower: { name: 'Flower' },
  crown: { name: 'Crown' },
};

export const HAT_IDS = Object.keys(HATS);

/** How far each goal is: [{ ...goal, have, isDone }]. */
export const goalProgress = (life) => GOALS.map((goal) => ({ ...goal, have: Math.min(goal.need, life[goal.stat] ?? 0), isDone: (life[goal.stat] ?? 0) >= goal.need }));

/** The hats a player has unlocked. */
export const unlockedHats = (life) => goalProgress(life).filter((goal) => goal.isDone).map((goal) => goal.hat);

/** The lifetime counts after a finished game. `run` is what the engine counted: { kings, rocks, maxCombo, rainbows }. */
export function lifeAfterGame(life, score, run, isDaily) {
  return {
    points: life.points + score,
    games: life.games + 1,
    best: Math.max(life.best, score),
    kings: life.kings + run.kings,
    rocks: life.rocks + run.rocks,
    bestCombo: Math.max(life.bestCombo, run.maxCombo),
    dailies: life.dailies + (isDaily ? 1 : 0),
    rainbows: life.rainbows + run.rainbows,
  };
}
