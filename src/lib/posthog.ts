/**
 * PostHog Analytics — Plate (Server-Side Proxy Edition)
 *
 * ⚠️ posthog.init() is PERMANENTLY disabled — it patches window.history
 * synchronously on iOS Safari / FB in-app browser and crashes React Router.
 *
 * All events are sent via Convex mutations (convex/analytics.ts) which POST
 * to the PostHog /capture/ REST endpoint server-side. Zero client-side SDK.
 *
 * Usage:
 *   trackEvent("food_logged", { method: "barcode" })
 *   trackGateTap("voice_log")
 *   etc.
 *
 * All functions are fire-and-forget and never throw.
 */

import { useConvex } from "convex/react";
import { api } from "../../convex/_generated/api";

// ── Global Convex client reference (set once MobileLayout mounts) ───────────
let _convexClient: ReturnType<typeof useConvex> | null = null;

export function setConvexClientForAnalytics(client: ReturnType<typeof useConvex>) {
  _convexClient = client;
}

function track(event: string, properties?: Record<string, unknown>) {
  if (!_convexClient) return;
  // Fire-and-forget — never await in analytics
  _convexClient.mutation(api.analytics.trackEvent, { event, properties }).catch(() => {});
}

// ── Legacy no-op posthog object (kept for any remaining import references) ──
export const posthog = {
  capture: (..._args: any[]) => {},
  identify: (..._args: any[]) => {},
  reset: (..._args: any[]) => {},
  getFeatureFlag: (_key: string) => undefined as any,
  people: { set: (..._args: any[]) => {} },
};

export function initPostHog() {}

// ── User identity ─────────────────────────────────────────────────────────
export function identifyUser(_userId: string, properties?: Record<string, any>) {
  if (!_convexClient) return;
  _convexClient.mutation(api.analytics.identifyUser, { properties }).catch(() => {});
}

export function resetUser() {}
export function setUserProperties(properties: Record<string, any>) {
  if (!_convexClient) return;
  _convexClient.mutation(api.analytics.identifyUser, { properties }).catch(() => {});
}

// ── Generic event ─────────────────────────────────────────────────────────
export function trackEvent(event: string, properties?: Record<string, any>) {
  track(event, properties);
}

export function trackPageViewed(page: string) {
  track("page_viewed", { page });
}

// ── Dashboard ──────────────────────────────────────────────────────────────
export function trackDashboardLoad(plan: "free" | "premium" | "trialing") {
  track("dashboard_loaded", { plan });
}

// ── Food logging ───────────────────────────────────────────────────────────
export function trackFoodLogged(method: "barcode" | "search" | "quick_add" | "custom" | "meal_scan" | "voice") {
  track("food_logged", { method });
}

export function trackBarcodeScanned(success: boolean, barcode?: string) {
  track("barcode_scanned", { success, barcode });
}

// ── Feature gates ──────────────────────────────────────────────────────────
/** Call when a free user hits a premium gate */
export function trackGateHit(feature: string) {
  track("premium_gate_hit", { feature });
}

/** Call when user taps "Go Premium" CTA */
export function trackGoPremiumTap(location: string) {
  track("go_premium_tapped", { location });
}

// ── Hydration & weight ─────────────────────────────────────────────────────
export function trackHydrationLogged(glasses: number) {
  track("hydration_logged", { glasses });
}

export function trackWeightLogged(weight: number) {
  track("weight_logged", { weight });
}

// ── Navigation & content ──────────────────────────────────────────────────
export function trackGoalsViewed() {
  track("goals_viewed");
}

export function trackWeeklyDigestViewed() {
  track("weekly_digest_viewed");
}

export function trackSettingsViewed(section?: string) {
  track("settings_viewed", section ? { section } : undefined);
}

// ── Meal plan ─────────────────────────────────────────────────────────────
export function trackMealPlanGenerated(diet: string, days: number) {
  track("meal_plan_generated", { diet, days });
}

export function trackMealSwapped(mealCategory: string) {
  track("meal_swapped", { meal_category: mealCategory });
}

export function trackMealSkipped(mealCategory: string) {
  track("meal_skipped", { meal_category: mealCategory });
}

// ── Onboarding (kept as stubs — do not instrument onboarding) ───────────
export function trackOnboardingStarted() {}
export function trackOnboardingStep(_step: number, _stepName: string) {}
export function trackOnboardingCompleted(_profile: Record<string, any>) {}

// ── Misc (kept for backward compat) ──────────────────────────────────────
export function trackFavoriteUpdated(_action: "added" | "removed", _food: string, _list: "favorites" | "dislikes") {}
export function trackSettingsChanged(_setting: string) {}
export function trackThemeChanged(_theme: string) {}
export function trackGroceryListViewed() { track("grocery_list_viewed"); }
export function trackSignup(_method: string) {}
export function trackLogin(_method: string) {}
export function trackAppInstallBannerSeen() {}

// ── Feature flags (no-ops — PostHog not initialized client-side) ──────────
export function getFlag(_flagKey: string): string | boolean | undefined { return undefined; }

// ── A/B test variant assignment ───────────────────────────────────────────
// All tests use local sessionStorage randomization (PostHog SDK is disabled
// client-side to prevent iOS Safari / FB in-app browser crashes).
// Variants are reported to PostHog server-side at signup completion via
// trackExperimentAssigned(), called from StepBuildingPlan when the user is
// authenticated and the Convex client is available.

function safeSessionGet(key: string): string | null {
  try { return sessionStorage.getItem(key); } catch { return null; }
}
function safeSessionSet(key: string, value: string): void {
  try { sessionStorage.setItem(key, value); } catch {}
}

// Test 6 — ob_screen_count: full 12-screen flow vs 8-screen slim flow
export function getScreenCountVariant(): "control" | "variant_b" {
  const stored = safeSessionGet("ob_screen_count");
  if (stored === "control" || stored === "variant_b") return stored;
  const assigned = Math.random() < 0.5 ? "control" : "variant_b";
  safeSessionSet("ob_screen_count", assigned);
  return assigned;
}

// Test 7 — ob_welcome_hook: carousel (control) vs bold statement (variant_b)
// vs stat-led hook (variant_c). Equal 3-way split.
export function getWelcomeHookVariant(): "control" | "variant_b" | "variant_c" {
  const stored = safeSessionGet("ob_welcome_hook");
  if (stored === "control" || stored === "variant_b" || stored === "variant_c") {
    return stored as "control" | "variant_b" | "variant_c";
  }
  const r = Math.random();
  const assigned = r < 0.333 ? "control" : r < 0.667 ? "variant_b" : "variant_c";
  safeSessionSet("ob_welcome_hook", assigned);
  return assigned;
}

// Test 8 — ob_paywall_copy: default copy (control) vs urgency-focused (variant_b)
export function getPaywallCopyVariant(): "control" | "variant_b" {
  const stored = safeSessionGet("ob_paywall_copy");
  if (stored === "control" || stored === "variant_b") return stored;
  const assigned = Math.random() < 0.5 ? "control" : "variant_b";
  safeSessionSet("ob_paywall_copy", assigned);
  return assigned;
}

// ── Experiment reporting (call once at signup, when Convex client is ready) ─
// Sends all active A/B assignments to PostHog via server-side event so results
// are visible in PostHog experiments dashboard.
export function trackExperimentAssigned(
  experiment: string,
  variant: string,
) {
  track("$feature_flag_called", {
    $feature_flag: experiment,
    $feature_flag_response: variant,
    experiment,
    variant,
  });
}
