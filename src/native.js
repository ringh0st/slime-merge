// Native-app glue (Capacitor). Everything here is a no-op on the web.
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { StatusBar, Style } from '@capacitor/status-bar';

export const isNative = Capacitor.isNativePlatform();

export function haptic(kind = 'light') {
  if (isNative) {
    if (kind === 'success') Haptics.notification({ type: NotificationType.Success }).catch(() => {});
    else if (kind === 'error') Haptics.notification({ type: NotificationType.Error }).catch(() => {});
    else
      Haptics.impact({
        style: kind === 'heavy' ? ImpactStyle.Heavy : kind === 'medium' ? ImpactStyle.Medium : ImpactStyle.Light,
      }).catch(() => {});
    return;
  }
  // Web fallback (Android browsers; iOS Safari ignores it)
  navigator.vibrate?.(kind === 'heavy' ? [18, 30, 18] : kind === 'error' ? [40, 60, 40] : 8);
}

export function setupNative() {
  if (!isNative) return;
  document.documentElement.classList.add('native');
  setStatusBar(document.documentElement.dataset.theme === 'dark');
}

/** In the app, the clock and battery at the top turn light on a night page and dark on a light one. */
export function setStatusBar(isNight) {
  if (isNative) StatusBar.setStyle({ style: isNight ? Style.Dark : Style.Light }).catch(() => {});
}
