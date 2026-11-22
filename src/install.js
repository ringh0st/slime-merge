// Putting the game on the phone's home screen, so it opens full screen like an app.
import { isNative } from './native.js';

/** The browser's own install offer (Android Chrome and desktop), kept until the player asks for it. */
let offer = null;
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    offer = event;
  });
}

/** Already running from the home screen (or as the app from a store): nothing to install. */
export const isInstalled = () =>
  isNative || window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;

/** Which instructions fit this device: 'ios' | 'android' | 'desktop'. */
export function installPlatform() {
  const agent = window.navigator.userAgent;
  // An iPad says it is a Mac, but a Mac has no touch screen.
  if (/iPhone|iPad|iPod/.test(agent) || (/Macintosh/.test(agent) && window.navigator.maxTouchPoints > 1)) return 'ios';
  if (/Android/.test(agent)) return 'android';
  return 'desktop';
}

/** Whether one tap can install it here (the browser made an offer). */
export const canInstallNow = () => Boolean(offer);

/** Shows the browser's install window; resolves to true when the player accepted. */
export async function installNow() {
  if (!offer) return false;
  offer.prompt();
  const { outcome } = await offer.userChoice;
  offer = null;
  return outcome === 'accepted';
}
