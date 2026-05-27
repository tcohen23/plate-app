/**
 * PostHog Analytics — Plate
 *
 * ⚠️ POSTHOG INIT IS PERMANENTLY DISABLED (2026-05-27, fourth crash)
 *
 * PostHog patches window.history.replaceState and pushState SYNCHRONOUSLY
 * during posthog.init() — regardless of disable_session_recording, autocapture:false,
 * capture_pageview:false, or any other config. The patched version throws on
 * iOS Safari and Facebook in-app browser, which crashes React Router and
 * triggers the "An unexpected error occurred" error screen.
 *
 * Three prior fixes failed:
 *   1. disable_session_recording: true  → still patches history during init
 *   2. autocapture: false               → still patches history during init
 *   3. Save/restore history in loaded() → loaded() fires ASYNC, crash happens
 *      synchronously during init before loaded() can restore anything
 *
 * Fix: never call posthog.init(). All exported functions are no-ops so the
 * rest of the codebase compiles and runs without changes.
 *
 * TODO: wire up PostHog via server-side proxy (Convex action) to avoid
 * any client-side history patching while preserving analytics.
 */

// ── No-op posthog object — exported so `import { posthog }` calls don't throw ──
export const posthog = {
  capture: (..._args: any[]) => {},
  identify: (..._args: any[]) => {},
  reset: (..._args: any[]) => {},
  getFeatureFlag: (_key: string) => undefined as any,
  people: {
    set: (..._args: any[]) => {},
  },
};

export function initPostHog() {
  // Intentionally never calls posthog.init() — see file header.
}

/** Identify a user (call after login/signup) */
export function identifyUser(_userId: string, _properties?: Record<string, any>) {}

/** Reset identity (call on logout) */
export function resetUser() {}

/** Track a custom event */
export function trackEvent(_event: string, _properties?: Record<string, any>) {}

/** Set user properties */
export function setUserProperties(_properties: Record<string, any>) {}

// ── Pre-defined event helpers ──────────────────────────────

export function trackOnboardingStarted() {}
export function trackOnboardingStep(_step: number, _stepName: string) {}
export function trackOnboardingCompleted(_profile: Record<string, any>) {}
export function trackMealPlanGenerated(_diet: string, _days: number) {}
export function trackMealSwapped(_mealCategory: string) {}
export function trackMealSkipped(_mealCategory: string) {}
export function trackFoodLogged(_method: "barcode" | "search" | "quick_add" | "custom" | "meal_scan") {}
export function trackBarcodeScanned(_success: boolean, _barcode?: string) {}
export function trackFavoriteUpdated(_action: "added" | "removed", _food: string, _list: "favorites" | "dislikes") {}
export function trackSettingsChanged(_setting: string) {}
export function trackThemeChanged(_theme: string) {}
export function trackPageViewed(_page: string) {}
export function trackGroceryListViewed() {}
export function trackSignup(_method: string) {}
export function trackLogin(_method: string) {}
export function trackAppInstallBannerSeen() {}

// ── Feature flag helpers ──────────────────────────────────────
/**
 * Always returns undefined — PostHog is not initialized.
 */
export function getFlag(_flagKey: string): string | boolean | undefined {
  return undefined;
}
