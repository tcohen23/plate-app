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
import { initPostHog } from "./lib/posthog";
import { initMetaPixel } from "./lib/metaPixel";
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


// ── Onboarding v3 ──────────────────────────────────────────────────────────
import { Step01Welcome } from "./pages/onboarding/Step01Welcome";
import { StepSignup } from "./pages/onboarding/StepSignup";
import { Step02Name } from "./pages/onboarding/Step02Name";
import { Step03Goals } from "./pages/onboarding/Step03Goals";
import { StepInterstitialRealtalk } from "./pages/onboarding/StepInterstitialRealtalk";
import { StepInterstitialChoices } from "./pages/onboarding/StepInterstitialChoices";
import { Step04Activity } from "./pages/onboarding/Step04Activity";
import { Step05Glp1 } from "./pages/onboarding/Step05Glp1";
import { Step06Barriers } from "./pages/onboarding/Step06Barriers";
import { StepMealPlanOptin } from "./pages/onboarding/StepMealPlanOptin";
import { Step09Kitchen } from "./pages/onboarding/Step09Kitchen";
import { Step09Journey } from "./pages/onboarding/Step09Journey";
import { StepAboutYou } from "./pages/onboarding/StepAboutYou";
import { Step12Measurements } from "./pages/onboarding/Step12Measurements";
import { StepWeeklyGoal } from "./pages/onboarding/StepWeeklyGoal";
import { Step07Habits } from "./pages/onboarding/Step07Habits";
import { StepPersonalization } from "./pages/onboarding/StepPersonalization";
import { StepCreateAccount } from "./pages/onboarding/StepCreateAccount";
import { StepVerifyEmail } from "./pages/onboarding/StepVerifyEmail";
import { Step14Username } from "./pages/onboarding/Step14Username";
import { Step16Reveal } from "./pages/onboarding/Step16Reveal";
import { StepFeatures } from "./pages/onboarding/StepFeatures";
import { StepUpgrade } from "./pages/onboarding/StepUpgrade";
import { StepWelcomePremium } from "./pages/onboarding/StepWelcomePremium";
// Legacy v2 screens (kept for backward compat / deep-links)
import { Step10Frequency } from "./pages/onboarding/Step10Frequency";
import { Step13Account } from "./pages/onboarding/Step13Account";
import { Step15Consent } from "./pages/onboarding/Step15Consent";
import { Step18WelcomeDone } from "./pages/onboarding/Step18WelcomeDone";
import { WorkoutStep02Goals } from "./pages/onboarding/WorkoutStep02Goals";
import { WorkoutStep03Experience } from "./pages/onboarding/WorkoutStep03Experience";
import { WorkoutStep04Gym } from "./pages/onboarding/WorkoutStep04Gym";

// Reads profile toast preference and renders Toaster accordingly
function SmartToaster() {
  const profile = useQuery(api.profiles.getProfile);
  const showToasts = profile === undefined || (profile as any)?.toastNotifications !== false;
  if (!showToasts) return null;
  return <Toaster />;
}

// Generates a stable anonymous session ID for the browser session
function getSessionId(): string {
  const key = "plate_sid";
  let sid = sessionStorage.getItem(key);
  if (!sid) {
    sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem(key, sid);
  }
  return sid;
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

          {/* Screen 6: choices interstitial */}
          <Route path="/onboarding/interstitial-choices" element={<StepInterstitialChoices />} />

          {/* Screen 7: activity */}
          <Route path="/onboarding/activity" element={<Step04Activity />} />

          {/* Screen 8: GLP-1 */}
          <Route path="/onboarding/glp1" element={<Step05Glp1 />} />

          {/* Screen 9: barriers (conditional) */}
          <Route path="/onboarding/barriers" element={<Step06Barriers />} />

          {/* Screen 10: meal plan opt-in */}
          <Route path="/onboarding/mealplan-optin" element={<StepMealPlanOptin />} />
          {/* Legacy route alias */}
          <Route path="/onboarding/meal-plan" element={<StepMealPlanOptin />} />

          {/* Screen 11: kitchen interstitial */}
          <Route path="/onboarding/interstitial-kitchen" element={<Step09Kitchen />} />
          <Route path="/onboarding/kitchen" element={<Step09Kitchen />} />

          {/* Screen 12: journey interstitial */}
          <Route path="/onboarding/interstitial-journey" element={<Step09Journey />} />
          <Route path="/onboarding/journey" element={<Step09Journey />} />

          {/* Screen 13: about you (sex + age + country + zip) */}
          <Route path="/onboarding/about-you" element={<StepAboutYou />} />
          {/* Legacy: stats used to do this */}
          <Route path="/onboarding/stats" element={<StepAboutYou />} />

          {/* Screen 14: measurements */}
          <Route path="/onboarding/measurements" element={<Step12Measurements />} />

          {/* Screen 15: weekly goal (conditional) */}
          <Route path="/onboarding/weekly-goal" element={<StepWeeklyGoal />} />

          {/* Screen 16: habits */}
          <Route path="/onboarding/habits" element={<Step07Habits />} />

          {/* Screen 17: personalization consent */}
          <Route path="/onboarding/personalization" element={<StepPersonalization />} />

          {/* Screen 18: create account */}
          <Route path="/onboarding/create-account" element={<StepCreateAccount />} />
          {/* Legacy account route */}
          <Route path="/onboarding/account" element={<Step13Account />} />

          {/* Legacy screens */}
          <Route path="/onboarding/frequency" element={<Step10Frequency />} />

          {/* Screen 18.5: verify email — PUBLIC (user not yet authenticated, awaiting OTP) */}
          <Route path="/onboarding/verify-email" element={<StepVerifyEmail />} />

          {/* ── Post-auth onboarding (requires login) ── */}
          <Route element={<ProtectedRoute />}>

            {/* Screen 19: username */}
            <Route path="/onboarding/username" element={<Step14Username />} />

            {/* Legacy consent */}
            <Route path="/onboarding/consent" element={<Step15Consent />} />

            {/* Screen 20: plan reveal */}
            <Route path="/onboarding/plan-ready" element={<Step16Reveal />} />
            <Route path="/onboarding/reveal" element={<Step16Reveal />} />

            {/* Screen 21: feature showcase */}
            <Route path="/onboarding/features" element={<StepFeatures />} />

            {/* Screen 22: soft upsell (skippable) */}
            <Route path="/onboarding/upgrade" element={<StepUpgrade />} />

            {/* Legacy paywall — redirect to soft upsell */}
            <Route path="/onboarding/paywall" element={<StepUpgrade />} />

            {/* Screen 23: welcome premium (post-purchase) */}
            <Route path="/onboarding/welcome-premium" element={<StepWelcomePremium />} />

            {/* Legacy welcome-done */}
            <Route path="/onboarding/welcome-done" element={<Step18WelcomeDone />} />

            <Route path="/admin" element={<AdminPage />} />

            {/* ── App routes — FREEMIUM: no subscription gate ── */}
            {/* Free users get access to the app; premium gates are in-feature */}
            <Route element={<MobileLayout />}>
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/plan" element={<MealPlanPage />} />
              <Route path="/track" element={<FoodTrackerPage />} />
              <Route path="/grocery" element={<GroceryPage />} />
              <Route path="/progress" element={<ProgressPage />} />
              <Route path="/why" element={<WhyPage />} />
              <Route path="/feedback" element={<FeedbackPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/meal/:mealId" element={<MealDetailPage />} />
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
