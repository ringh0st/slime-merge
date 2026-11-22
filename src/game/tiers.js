// The slime evolution chain. Two of the same tier merge into the next one.
export const TIERS = [
  { name: 'Drip', r: 15, color: '#7EE8C7' },
  { name: 'Dew', r: 21, color: '#7CC8FF' },
  { name: 'Bubble', r: 28, color: '#B4A2FF' },
  { name: 'Jelly', r: 36, color: '#FF9CC6' },
  { name: 'Puff', r: 44, color: '#FFAE73' },
  { name: 'Butter', r: 54, color: '#FFD45E' },
  { name: 'Gloop', r: 64, color: '#93DB59' },
  { name: 'Mallow', r: 76, color: '#5FB8FF' },
  { name: 'Mochi', r: 89, color: '#C285FF' },
  { name: 'King', r: 104, color: '#FF6585' },
];

// A rock: can't merge, only cracks when a merge happens right next to it.
export const ROCK = { name: 'Rock', r: 24, color: '#A3A9B8' };

// Points for creating a slime of each tier.
export const POINTS = [1, 3, 6, 10, 15, 21, 28, 36, 45, 55];

// Relative odds of each droppable tier.
export const DROP_WEIGHTS = [32, 26, 20, 13, 9];

// Special pieces that drop now and then. A rainbow becomes whatever slime it touches and merges with it;
// a bomb pops everything close to it a moment after it lands.
export const RAINBOW = { name: 'Rainbow', r: 22, color: '#FFFFFF' };
export const BOMB = { name: 'Bomb', r: 22, color: '#4A4160' };
export const ROCK_TIER = -1;
export const RAINBOW_TIER = -2;
export const BOMB_TIER = -3;

const SPECIALS = { [ROCK_TIER]: ROCK, [RAINBOW_TIER]: RAINBOW, [BOMB_TIER]: BOMB };

export const tierInfo = (t) => (t < 0 ? SPECIALS[t] : TIERS[t]);

/** What a piece is called on the Next panel (a frozen slime says so). */
export const pieceName = (piece) => (piece.frozen ? `Frozen ${TIERS[piece.tier].name}` : tierInfo(piece.tier).name);
