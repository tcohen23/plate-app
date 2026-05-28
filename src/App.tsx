import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useEffect, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";
import ErrorBoundary from "./components/ErrorBoundary";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { PublicLayout } from "./components/PublicLayout";
import { PublicOnlyRoute } from "./components/PublicOnlyRoute";
import { Toaster } from "./components/ui/sonner";
import { ThemeProvider } from "./contexts/ThemeContext";
import { MobileLayout } from "./components/MobileLayout";
import { initPostHog, posthog } from "./lib/posthog";
import { initMetaPixel, trackMetaEvent } from "./lib/metaPixel";
import {
  LoginPage,
  SignupPage,
} from "./pages";
import { DashboardPage } from "./pages/DashboardPage";
import { MealPlanPage } from "./pages/MealPlanPage";
import { FoodTrackerPage } from "./pages/FoodTrackerPage";
import { GroceryPage } from "./pages/GroceryPage";
import { ProgressPage } from "./pages/ProgressPage";
import { SettingsPage } from "./pages/SettingsPage";
import { MealDetailPage } from "./pages/MealDetailPage";
import { AdminPage } from "./pages/AdminPage";
import { WhyPage } from "./pages/WhyPage";
import { FeedbackPage } from "./pages/FeedbackPage";
import { PrivacyPage } from "./pages/PrivacyPage";
import { WorkoutPage } from "./pages/WorkoutPage";
import { MorePage } from "./pages/MorePage";
import { ProfilePage } from "./pages/ProfilePage";
import { GLP1Page } from "./pages/GLP1Page";
import { SleepPage } from "./pages/SleepPage";
import { MeasurementsPage } from "./pages/MeasurementsPage";
import { WeeklyDigestPage } from "./pages/WeeklyDigestPage";
import { NutritionPage } from "./pages/NutritionPage";
import { ExportPage } from "./pages/ExportPage";
import { GoalsPage } from "./pages/GoalsPage";
import { MessagesPage } from "./pages/MessagesPage";
import { FriendsPage } from "./pages/FriendsPage";
import { HelpPage } from "./pages/HelpPage";
import { CommunityPage } from "./pages/CommunityPage";
import { LearnPage } from "./pages/LearnPage";
import { FastingPage } from "./pages/FastingPage";
import { RemindersPage } from "./pages/RemindersPage";
import { AppsDevicesPage } from "./pages/AppsDevicesPage";
import { WaterPage } from "./pages/WaterPage";


// ── Onboarding v3 ──────────────────────────────────────────────────────────
import { Step01Welcome } from "./pages/onboarding/Step01Welcome";
import { StepSignup } from "./pages/onboarding/StepSignup";
import { Step02Name } from "./pages/onboarding/Step02Name";
import { Step03Goals } from "./pages/onboarding/Step03Goals";
import { StepInterstitialRealtalk } from "./pages/onboarding/StepInterstitialRealtalk";
import { Step04Activity } from "./pages/onboarding/Step04Activity";
import { StepAboutYou } from "./pages/onboarding/StepAboutYou";
import { StepNameGoals } from "./pages/onboarding/StepNameGoals";
import { StepAllStats } from "./pages/onboarding/StepAllStats";
import { Step12Measurements } from "./pages/onboarding/Step12Measurements";
import { StepCreateAccount } from "./pages/onboarding/StepCreateAccount";
import { StepVerifyEmail } from "./pages/onboarding/StepVerifyEmail";
import { StepBuildingPlan } from "./pages/onboarding/StepBuildingPlan";
import { Step16Reveal } from "./pages/onboarding/Step16Reveal";
import { StepUpgrade } from "./pages/onboarding/StepUpgrade";
import { StepWelcomePremium } from "./pages/onboarding/StepWelcomePremium";
// Legacy v2 screens (kept for backward compat / deep-links)

import { WorkoutStep02Goals } from "./pages/onboarding/WorkoutStep02Goals";
import { WorkoutStep03Experience } from "./pages/onboarding/WorkoutStep03Experience";
import { WorkoutStep04Gym } from "./pages/onboarding/WorkoutStep04Gym";
import { ScannerPage } from "./pages/ScannerPage";

// Reads profile toast preference and renders Toaster accordingly
function SmartToaster() {
  const profile = useQuery(api.profiles.getProfile);
  const showToasts = profile === undefined || (profile as any)?.toastNotifications !== false;
  if (!showToasts) return null;
  return <Toaster />;
}

// Generates a stable anonymous session ID for the browser session
// Wrapped in try/catch — sessionStorage throws SecurityError in Slack/Facebook
// in-app browsers and QuotaExceededError in iOS Safari Private Browsing
function getSessionId(): string {
  try {
    const key = "plate_sid";
    let sid = sessionStorage.getItem(key);
    if (!sid) {
      sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
      sessionStorage.setItem(key, sid);
    }
    return sid;
  } catch {
    return Math.random().toString(36).slice(2);
  }
}

// Tracks page views on every route change
function PageViewTracker() {
  const location = useLocation();
  const trackPageView = useMutation(api.pageViews.trackPageView);
  const lastTracked = useRef<string>("");

  useEffect(() => {
    const path = location.pathname;
    if (path === lastTracked.current) return;
    lastTracked.current = path;
    const sessionId = getSessionId();
    trackPageView({ path, sessionId }).catch(() => {});
    // Manually fire PostHog $pageview (autocapture is disabled to prevent
    // PostHog from patching history.replaceState and crashing React Router)
    try { posthog.capture("$pageview"); } catch {}
    trackMetaEvent("PageView");
  }, [location.pathname, trackPageView]);

  return null;
}

// Silently saves device timezone and recalculates macros on load
function TimezoneSaver() {
  const saveTimezone = useMutation(api.profiles.saveTimezone);
  const recalcMacros = useMutation(api.profiles.recalculateMacros);
  useEffect(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) saveTimezone({ timezone: tz }).catch(() => {});
    } catch {}
    recalcMacros({}).catch(() => {});
  }, []);
  return null;
}

function App() {
  useEffect(() => {
    initPostHog();
    initMetaPixel();
  }, []);

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark" switchable>
        <SmartToaster />
        <TimezoneSaver />
        <PageViewTracker />
        <Routes>
          <Route element={<PublicLayout />}>
            <Route element={<PublicOnlyRoute />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
            </Route>
          </Route>

          {/* ── Onboarding v3 — public pre-auth steps ── */}
          <Route path="/" element={<Step01Welcome />} />
          <Route path="/onboarding" element={<Step01Welcome />} />
          <Route path="/onboarding/welcome" element={<Step01Welcome />} />

          {/* Screen 2: choose signup method */}
          <Route path="/onboarding/signup" element={<StepSignup />} />

          {/* Screen 3: name */}
          <Route path="/onboarding/name" element={<Step02Name />} />

          {/* Screen 4: goals */}
          <Route path="/onboarding/goals" element={<Step03Goals />} />

          {/* Screen 5: weight interstitial (conditional) */}
          <Route path="/onboarding/interstitial-realtalk" element={<StepInterstitialRealtalk />} />

          {/* Screen 6: activity */}
          <Route path="/onboarding/activity" element={<Step04Activity />} />

          {/* Screen 8: GLP-1 */}
          {/* Screen 7: about you (sex + age + country + zip) */}
          <Route path="/onboarding/about-you" element={<StepAboutYou />} />
          <Route path="/onboarding/stats" element={<StepAboutYou />} />

          {/* Screen 8: measurements */}
          <Route path="/onboarding/measurements" element={<Step12Measurements />} />

          {/* ── Test 6 (ob_screen_count) Variant B — 8-screen slim flow ── */}
          {/* Slim screen 3: Name + Goals combined */}
          <Route path="/onboarding/name-goals" element={<StepNameGoals />} />
          {/* Slim screen 5: All stats combined (sex + age + height + weight) */}
          <Route path="/onboarding/all-stats" element={<StepAllStats />} />

          {/* Screen 9: create account */}
          <Route path="/onboarding/create-account" element={<StepCreateAccount />} />

          {/* Screen 10: verify email — PUBLIC (user not yet authenticated) */}
          <Route path="/onboarding/verify-email" element={<StepVerifyEmail />} />

          {/* ── Post-auth onboarding (requires login) ── */}
          <Route element={<ProtectedRoute />}>

            {/* Screen 11: building plan animation + completeOnboarding */}
            <Route path="/onboarding/building-plan" element={<StepBuildingPlan />} />

            {/* Screen 12: plan reveal (calorie count-up) — kept for deep links */}
            <Route path="/onboarding/plan-ready" element={<Step16Reveal />} />
            <Route path="/onboarding/reveal" element={<Step16Reveal />} />

            {/* In-app soft upsell — reachable from dashboard, NOT onboarding flow */}
            <Route path="/onboarding/upgrade" element={<StepUpgrade />} />

            {/* Post-purchase welcome */}
            <Route path="/onboarding/welcome-premium" element={<StepWelcomePremium />} />

            <Route path="/admin" element={<AdminPage />} />

            {/* ── App routes — FREEMIUM: no subscription gate ── */}
            {/* Free users get access to the app; premium gates are in-feature */}
            <Route element={<MobileLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/plan" element={<MealPlanPage />} />
              <Route path="/track" element={<FoodTrackerPage />} />
              <Route path="/scanner" element={<ScannerPage />} />
              <Route path="/grocery" element={<GroceryPage />} />
              <Route path="/progress" element={<ProgressPage />} />
              <Route path="/why" element={<WhyPage />} />
              <Route path="/feedback" element={<FeedbackPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/meal/:mealId" element={<MealDetailPage />} />
              {/* MFP More menu and sub-pages */}
              <Route path="/more" element={<MorePage />} />
              <Route path="/more/profile" element={<ProfilePage />} />
              <Route path="/more/glp1" element={<GLP1Page />} />
              <Route path="/more/sleep" element={<SleepPage />} />
              <Route path="/more/measurements" element={<MeasurementsPage />} />
              <Route path="/more/weekly-digest" element={<WeeklyDigestPage />} />
              <Route path="/more/nutrition" element={<NutritionPage />} />
              <Route path="/more/export" element={<ExportPage />} />
              <Route path="/more/goals" element={<GoalsPage />} />
              <Route path="/more/messages" element={<MessagesPage />} />
              <Route path="/more/friends" element={<FriendsPage />} />
              <Route path="/more/help" element={<HelpPage />} />
              <Route path="/more/community" element={<CommunityPage />} />
              <Route path="/more/learn" element={<LearnPage />} />
              <Route path="/more/fasting" element={<FastingPage />} />
              <Route path="/more/reminders" element={<RemindersPage />} />
              <Route path="/more/apps-devices" element={<AppsDevicesPage />} />
              <Route path="/more/water" element={<WaterPage />} />
            </Route>

            {/* Workout onboarding screens */}
            <Route path="/onboarding/workout/goals" element={<WorkoutStep02Goals />} />
            <Route path="/onboarding/workout/experience" element={<WorkoutStep03Experience />} />
            <Route path="/onboarding/workout/gym" element={<WorkoutStep04Gym />} />

            {/* Upgrade/paywall — accessible to all logged-in users */}
            <Route path="/upgrade" element={<StepUpgrade />} />

            {/* Workout page — gated inside WorkoutPage via usePremiumAccess */}
            <Route element={<MobileLayout />}>
              <Route path="/workout" element={<WorkoutPage />} />
            </Route>
          </Route>

          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
