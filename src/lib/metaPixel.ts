/**
 * Meta Pixel — Plate
 * Tracks sign-ups and purchases for Meta Ads optimization.
 *
 * Pixel ID is set via VITE_META_PIXEL_ID env var.
 * Events:
 *   - CompleteRegistration → fired on email verification (account created)
 *   - Purchase             → fired on Stripe success (welcome-done page)
 *
 * HISTORY OF THE replaceState CRASH:
 *   Facebook's fbevents.js patches window.history.replaceState when it loads.
 *   This confuses React Router's internal routing state and throws
 *   "An unexpected error occurred" on every navigation.
 *   Two prior attempts (autoConfig=false queued, setTimeout) failed because
 *   autoConfig must be set BEFORE fbevents.js executes, not queued.
 *
 * SOLUTION: Freeze history.replaceState and pushState with Object.defineProperty
 * BEFORE injecting fbevents.js, so FB cannot overwrite them. Then set
 * autoConfig=false + init in the script's onload callback so the real fbq
 * handles it (not the queue stub).
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

const PIXEL_ID = (import.meta as any).env?.VITE_META_PIXEL_ID as string | undefined;

function fbq(...args: any[]) {
  const w = window as any;
  if (typeof w.fbq === "function") {
    w.fbq(...args);
  }
}

/** Initialize the Meta Pixel (called once on app load) */
export function initMetaPixel() {
  if (!PIXEL_ID) return;

  try {
    const w = window as any;
    if (w.fbq) return; // already loaded

    // Step 1: Freeze history.replaceState + pushState BEFORE fbevents.js loads.
    // Facebook's SDK overwrites these via direct assignment (history.replaceState = ...)
    // which triggers the React Router crash. Object.defineProperty with a no-op setter
    // blocks the assignment while keeping the native function usable via the getter.
    try {
      const nativeReplaceState = history.replaceState.bind(history);
      const nativePushState = history.pushState.bind(history);
      Object.defineProperty(history, "replaceState", {
        get: () => nativeReplaceState,
        set: () => { /* block FB SDK from patching */ },
        configurable: true,
      });
      Object.defineProperty(history, "pushState", {
        get: () => nativePushState,
        set: () => { /* block FB SDK from patching */ },
        configurable: true,
      });
    } catch {
      // defineProperty failed (e.g. strict iframe) — proceed anyway
    }

    // Step 2: Set up the standard fbq stub so calls queued before load are replayed.
    const queue: any[][] = [];
    const fbqFn: any = (...args: any[]) => {
      try {
        if (fbqFn.callMethod) {
          fbqFn.callMethod(...args);
        } else {
          queue.push(args);
        }
      } catch {}
    };
    fbqFn.push = fbqFn;
    fbqFn.loaded = true;
    fbqFn.version = "2.0";
    fbqFn.queue = queue;
    w.fbq = fbqFn;
    if (!w._fbq) w._fbq = fbqFn;

    // Step 3: Inject fbevents.js. Set autoConfig=false + init in onload so the
    // real fbq (not the stub) handles autoConfig — this is what actually works.
    const script = document.createElement("script");
    script.async = true;
    script.src = "https://connect.facebook.net/en_US/fbevents.js";
    script.onload = () => {
      try {
        // Must call set autoConfig BEFORE init, using the now-loaded real fbq
        fbq("set", "autoConfig", false, PIXEL_ID);
        fbq("init", PIXEL_ID);
        fbq("track", "PageView");
      } catch {}
    };
    document.head.appendChild(script);
  } catch {}
}

/** Fire CompleteRegistration — call when a new account is fully verified */
export function trackMetaRegistration() {
  fbq("track", "CompleteRegistration");
}

/**
 * Fire Purchase — call when Stripe subscription is confirmed.
 * @param value   Amount charged (0 for trial, actual price for paid plans)
 * @param currency ISO currency code, default "USD"
 */
export function trackMetaPurchase(value = 0, currency = "USD") {
  fbq("track", "Purchase", { value, currency });
}

/**
 * Fire Lead — call when user taps the Subscribe/checkout button on the paywall.
 * Signals high purchase intent to Meta Ads.
 */
export function trackMetaLead() {
  fbq("track", "Lead");
}

/** Generic event for future use */
export function trackMetaEvent(eventName: string, params?: Record<string, any>) {
  fbq("track", eventName, params);
}
