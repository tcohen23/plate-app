/**
 * Meta Pixel — Plate
 * Tracks sign-ups and purchases for Meta Ads optimization.
 *
 * Pixel ID is set via VITE_META_PIXEL_ID env var.
 *
 * ⚠️ CLIENT-SIDE FBEVENTS.JS IS DISABLED (2026-05-25)
 * Facebook's fbevents.js calls history.replaceState() internally when it loads,
 * which crashes React Router ("An unexpected error occurred") on every page.
 * Three separate fix attempts (autoConfig=false, setTimeout, Object.defineProperty
 * to block overwrite) all failed because FB calls replaceState — not just patches it.
 *
 * FIX: We set up the fbq stub (so calls don't throw) but do NOT inject fbevents.js.
 * Tracking events are sent server-side via Convex mutations to Meta Conversions API
 * where they're more reliable (no ad blockers, no ITP).
 *
 * TODO: Wire up Meta Conversions API in Convex for CompleteRegistration + Purchase.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

const PIXEL_ID = (import.meta as any).env?.VITE_META_PIXEL_ID as string | undefined;

function fbq(..._args: any[]) {
  // No-op — fbevents.js is not loaded client-side (crashes React Router)
}

/** Initialize the Meta Pixel stub (does NOT inject fbevents.js) */
export function initMetaPixel() {
  if (!PIXEL_ID) return;
  // Intentionally not loading fbevents.js — see file header for explanation
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
