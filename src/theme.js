import { store } from './storage.js';

/** Night or light. Follows the device until the player picks one with the button at the top. */
const BAR_COLORS = { light: '#ddd0ff', dark: '#15111f' };

const deviceTheme = () => (window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

export const currentTheme = () => store.get('slime.theme', null) ?? deviceTheme();

/** Paints the page in the theme (also the browser's bar around it). */
export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  for (const meta of document.querySelectorAll('meta[name="theme-color"]')) meta.setAttribute('content', BAR_COLORS[theme]);
}

export function saveTheme(theme) {
  store.set('slime.theme', theme);
  applyTheme(theme);
}
