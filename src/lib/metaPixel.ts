/**
 * Meta Pixel — Plate
 * Tracks sign-ups and purchases for Meta Ads optimization.
 *
 * Pixel ID is set via VITE_META_PIXEL_ID env var.
 *
 * ⚠️ CLIENT-SIDE FBEVENTS.JS IS DISABLED (2026-05-26, second time)
 * Facebook's fbevents.js calls history.replaceState() internally when it loads,
 * which crashes React Router ("An unexpected error occurred") on every page.
 * autoConfig: false does NOT prevent this — FB still calls replaceState to clean
 * up ?fbclid= from the URL, which crashes React Router regardless.
 *
 * Confirmed crashing on iOS Safari / Facebook in-app browser.
 * Previously disabled 2026-05-25, re-enabled 2026-05-25, crashing again 2026-05-26.
 *
 * FIX: We set up the fbq stub (so calls don't throw) but do NOT inject fbevents.js.
 * TODO: Wire up Meta Conversions API server-side from Convex for reliable tracking.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

const PIXEL_ID = (import.meta as any).env?.VITE_META_PIXEL_ID as string | undefined;

// No-op stub so trackMetaEvent calls don't throw
function fbqNoOp(..._args: any[]) {
  // fbevents.js is not loaded — crashes React Router
}

/** Initialize the Meta Pixel stub (does NOT inject fbevents.js) */
export function initMetaPixel() {
  if (!PIXEL_ID) return;
  // Intentionally not loading fbevents.js — see file header for explanation
  // Events fire into the stub below and are silently dropped client-side.
}

/** Fire a named event — no-op while fbevents.js is disabled */
export function trackMetaEvent(eventName: string, params?: Record<string, any>) {
  fbqNoOp("track", eventName, params);
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
