/* global __APP_VERSION__ */

/**
 * Phones keep an old copy of the page for a while. At every start the game asks which version is published, and if
 * this copy is older it loads the new one (once per version, so a failed try can't loop).
 */
export async function loadNewerVersion() {
  try {
    const response = await fetch('./version.json', { cache: 'no-store' });
    const { version } = await response.json();
    if (!version || version === __APP_VERSION__ || sessionStorage.getItem('slime.updatedTo') === version) return;
    sessionStorage.setItem('slime.updatedTo', version);
    const url = new URL(window.location.href);
    // A new address, so the phone can't answer from its old copy.
    url.searchParams.set('v', version);
    window.location.replace(url);
  } catch {
    // Offline, or the file isn't there: keep playing this copy.
  }
}
