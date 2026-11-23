/* global __APP_VERSION__ */

/** Who makes the game and which version this is (shown on the opening screen). Bump "version" in package.json for each release. */
export const GAME_NAME = 'Slime Merge';
export const STUDIO_NAME = 'Ringhost’s Games';
// Shown short: 1.2.0 reads "1.2", 1.2.1 stays "1.2.1".
export const APP_VERSION = typeof __APP_VERSION__ === 'string' ? __APP_VERSION__.replace(/\.0$/, '') : 'dev';
export const COPYRIGHT_YEAR = 2026;
