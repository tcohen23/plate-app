/**
 * Haptic feedback via the Web Vibration API.
 * Works on Android Chrome and iOS Safari (14.5+).
 * Silently no-ops on desktop or unsupported browsers.
 */

function vibrate(pattern: number | number[]) {
  try {
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  } catch {
    // Silently ignore — not all browsers support this
  }
}

/** Light tap — button press, toggle, select option */
export function hapticLight() {
  vibrate(10);
}

/** Medium pulse — save, log meal, confirm action */
export function hapticMedium() {
  vibrate(25);
}

/** Success — achievement unlocked, plan generated, streak milestone */
export function hapticSuccess() {
  vibrate([20, 60, 40]);
}

/** Heavy — destructive action, error */
export function hapticHeavy() {
  vibrate(60);
}

/** Double tap — nav selection */
export function hapticDouble() {
  vibrate([10, 40, 10]);
}
