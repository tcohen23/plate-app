/**
 * PostHog Analytics — Plate
 * Tracks user behavior for product analytics.
 */
import posthog from "posthog-js";

const POSTHOG_KEY = "phc_wuCAdVLDxvBns5Zcne9btMgma54uKEPvpg32gPvuhUio";
const POSTHOG_HOST = "https://us.i.posthog.com";

let initialized = false;

export function initPostHog() {
  if (initialized) return;
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    person_profiles: "identified_only",
    // CRITICAL: disable PostHog's built-in pageview capture and autocapture.
    // PostHog patches history.replaceState/pushState to detect URL changes,
    // which conflicts with React Router and causes "An unexpected error occurred"
    // on every navigation. We fire $pageview manually from PageViewTracker instead.
    capture_pageview: false,
    capture_pageleave: false,
    autocapture: false,
    persistence: "localStorage+cookie",
    session_recording: {
      maskAllInputs: false,
      maskInputOptions: {
        password: true,
      },
    },
    disable_session_recording: false,
    loaded: (_ph) => {
      if (window.location.hostname === "localhost") {
        // ph.opt_out_capturing();
      }
    },
  });
  initialized = true;
}

/** Identify a user (call after login/signup) */
export function identifyUser(userId: string, properties?: Record<string, any>) {
  posthog.identify(userId, properties);
}

/** Reset identity (call on logout) */
export function resetUser() {
  posthog.reset();
}

/** Track a custom event */
export function trackEvent(event: string, properties?: Record<string, any>) {
  posthog.capture(event, properties);
}

/** Set user properties */
export function setUserProperties(properties: Record<string, any>) {
  posthog.people.set(properties);
}

// ── Pre-defined event helpers ──────────────────────────────

export function trackOnboardingStarted() {
  trackEvent("onboarding_started");
}

export function trackOnboardingStep(step: number, stepName: string) {
  trackEvent("onboarding_step_completed", { step, step_name: stepName });
}

export function trackOnboardingCompleted(profile: Record<string, any>) {
  trackEvent("onboarding_completed", {
    diet: profile.dietPreference,
    goal: profile.goal,
    calorie_target: profile.calorieTarget,
  });
}

export function trackMealPlanGenerated(diet: string, days: number) {
  trackEvent("meal_plan_generated", { diet, days });
}

export function trackMealSwapped(mealCategory: string) {
  trackEvent("meal_swapped", { category: mealCategory });
}

export function trackMealSkipped(mealCategory: string) {
  trackEvent("meal_skipped", { category: mealCategory });
}

export function trackFoodLogged(method: "barcode" | "search" | "quick_add" | "custom" | "meal_scan") {
  trackEvent("food_logged", { method });
}

export function trackBarcodeScanned(success: boolean, barcode?: string) {
  trackEvent("barcode_scanned", { success, barcode });
}

export function trackFavoriteUpdated(action: "added" | "removed", food: string, list: "favorites" | "dislikes") {
  trackEvent("favorite_updated", { action, food, list });
}

export function trackSettingsChanged(setting: string) {
  trackEvent("settings_changed", { setting });
}

export function trackThemeChanged(theme: string) {
  trackEvent("theme_changed", { theme });
}

export function trackPageViewed(page: string) {
  trackEvent("$pageview", { page });
}

export function trackGroceryListViewed() {
  trackEvent("grocery_list_viewed");
}

export function trackSignup(method: string) {
  trackEvent("user_signed_up", { method });
}

export function trackLogin(method: string) {
  trackEvent("user_logged_in", { method });
}

export function trackAppInstallBannerSeen() {
  trackEvent("install_banner_seen");
}

export { posthog };

// ── Feature flag helpers ──────────────────────────────────────
/**
 * Get a PostHog feature flag value synchronously.
 * Returns undefined if PostHog isn't loaded or flag not set.
 */
export function getFlag(flagKey: string): string | boolean | undefined {
  try {
    return posthog.getFeatureFlag(flagKey) as string | boolean | undefined;
  } catch {
    return undefined;
  }
}
