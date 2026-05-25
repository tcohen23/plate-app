/**
 * Meta Pixel — Plate
 * Tracks sign-ups and purchases for Meta Ads optimization.
 *
 * Pixel ID is set via VITE_META_PIXEL_ID env var.
 *
 * Configuration:
 * - autoConfig: false  — prevents FB from auto-capturing button clicks and
 *   doing extra URL manipulation. We fire events manually where needed.
 * - PageView fires manually from PageViewTracker in App.tsx on each route change.
 *
 * NOTE: Facebook's fbevents.js calls history.replaceState to clean up ?fbclid=
 * from the URL after capturing it. This is safe now that PostHog's history
 * patching (autocapture) has been disabled — there's no longer a conflicting
 * history wrapper that crashes React Router.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

declare global {
  interface Window {
    fbq: (...args: any[]) => void;
    _fbq: (...args: any[]) => void;
  }
}

const PIXEL_ID = (import.meta as any).env?.VITE_META_PIXEL_ID as string | undefined;

let initialized = false;

/** Initialize the Meta Pixel and inject fbevents.js */
export function initMetaPixel() {
  if (!PIXEL_ID || initialized) return;
  initialized = true;

  // Set up the fbq stub before the script loads
  if (!window.fbq) {
    const fbq: any = function (...args: any[]) {
      (fbq as any).callMethod
        ? (fbq as any).callMethod.apply(fbq, args)
        : (fbq as any).queue.push(args);
    };
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = "2.0";
    fbq.queue = [];
    window.fbq = fbq;
    window._fbq = fbq;
  }

  // autoConfig: false — prevent FB from auto-capturing clicks and doing
  // extra URL manipulation that could interfere with React Router
  window.fbq("set", "autoConfig", false, PIXEL_ID);
  window.fbq("init", PIXEL_ID);

  // Inject fbevents.js
  const script = document.createElement("script");
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(script);
}

/** Fire PageView — called manually from PageViewTracker on each route change */
export function trackMetaEvent(eventName: string, params?: Record<string, any>) {
  if (!window.fbq) return;
  window.fbq("track", eventName, params);
}

/** Fire CompleteRegistration — call when a new account is fully verified */
export function trackMetaRegistration() {
  trackMetaEvent("CompleteRegistration");
}

/**
 * Fire Purchase — call when Stripe subscription is confirmed.
 * @param value   Amount charged (0 for trial, actual price for paid plans)
 * @param currency ISO currency code, default "USD"
 */
export function trackMetaPurchase(value = 0, currency = "USD") {
  trackMetaEvent("Purchase", { value, currency });
}

/**
 * Fire Lead — call when user taps the Subscribe/checkout button on the paywall.
 * Signals high purchase intent to Meta Ads.
 */
export function trackMetaLead() {
  trackMetaEvent("Lead");
}
