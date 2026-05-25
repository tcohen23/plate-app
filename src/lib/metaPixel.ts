/**
 * Meta Pixel — Plate
 * Tracks sign-ups and purchases for Meta Ads optimization.
 *
 * Pixel ID is set via VITE_META_PIXEL_ID env var.
 * Events:
 *   - CompleteRegistration → fired on email verification (account created)
 *   - Purchase             → fired on Stripe success (welcome-done page)
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

  // Defer until after React Router has fully initialized its history,
  // preventing the FB SDK's replaceState patch from crashing the app.
  setTimeout(() => {
    try {
      const w = window as any;
      if (w.fbq) return; // already loaded

      // Inject the fbevents.js script
      const script = document.createElement("script");
      script.async = true;
      script.src = "https://connect.facebook.net/en_US/fbevents.js";
      document.head.appendChild(script);

      // Set up the fbq stub before the script loads
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

      fbq("init", PIXEL_ID);
      fbq("track", "PageView");
    } catch {}
  }, 0);
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
