/**
 * RequireSubscription — Route guard.
 * 
 * In v3 (freemium model):
 * - Used ONLY for workout add-on gate (/workout route)
 * - App routes (dashboard, plan, etc.) are freely accessible to all logged-in users
 * - If no profile or onboarding not done → send to onboarding
 * 
 * For requireWorkout=true: checks workout add-on OR comp access.
 */
import { Outlet, Navigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

interface RequireSubscriptionProps {
  /** If true, requires workout add-on to be active */
  requireWorkout?: boolean;
}

// All roles that get comp premium + workout access
const COMP_ADMIN_LEVELS = new Set([
  "owner", "admin", "moderator", "friends_family", "family", "friends",
]);
const COMP_ROLES = new Set(["family", "friends", "admin"]);

export function RequireSubscription({ requireWorkout = false }: RequireSubscriptionProps) {
  const profile = useQuery(api.profiles.getProfile);
  const subscriptionStatus = useQuery(api.stripe.getSubscriptionStatus);

  // Still loading
  if (profile === undefined || subscriptionStatus === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--background)" }}>
        <div className="flex flex-col items-center gap-3">
          <svg className="animate-spin w-7 h-7" style={{ color: "#52B788" }} viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // No profile → send to onboarding
  if (!profile) {
    return <Navigate to="/onboarding" replace />;
  }

  // Comp access check (owner, admin, moderator, friends_family etc.)
  const isComp =
    (profile as any)?.isPremium === true ||
    COMP_ADMIN_LEVELS.has((profile as any)?.adminLevel || "") ||
    COMP_ROLES.has((profile as any)?.role || "");

  // ── Workout add-on gate ────────────────────────────────────────────────────
  if (requireWorkout) {
    const hasWorkout =
      isComp ||
      (profile as any)?.workoutAddOnStatus === "active" ||
      (profile as any)?.workoutAddOnStatus === "active";
    if (!hasWorkout) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <Outlet />;
}

/**
 * useAccessLevel — hook to check premium/workout access anywhere in the app
 */
export function useAccessLevel() {
  const profile = useQuery(api.profiles.getProfile);
  const subscriptionStatus = useQuery(api.stripe.getSubscriptionStatus);

  const isLoading = profile === undefined || subscriptionStatus === undefined;

  const isComp =
    (profile as any)?.isPremium === true ||
    COMP_ADMIN_LEVELS.has((profile as any)?.adminLevel || "") ||
    COMP_ROLES.has((profile as any)?.role || "");

  // isPremium = trial OR paid — controls feature gating (trial users get premium features)
  const isPremium =
    isComp ||
    ["trialing", "active"].includes(subscriptionStatus?.subscriptionStatus || "");

  // isPaid = active paid subscription ONLY
  const isPaid =
    isComp ||
    subscriptionStatus?.subscriptionStatus === "active";

  // isTrialing = currently in free trial (not yet paid)
  const isTrialing =
    !isComp &&
    subscriptionStatus?.subscriptionStatus === "trialing";

  const hasWorkout =
    isComp ||
    (profile as any)?.workoutAddOnStatus === "active" ||
    (profile as any)?.workoutAddOnStatus === "active";

  return { isPremium, isPaid, isTrialing, hasWorkout, isComp, isLoading };
}
