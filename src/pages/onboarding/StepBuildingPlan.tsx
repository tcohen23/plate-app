/**
 * "Building Your Plan" screen — uses the existing PlanBuildAnimation component.
 * Route: /onboarding/building-plan
 *
 * Fires createMinimalProfile (idempotent) then completeOnboarding in background.
 * createMinimalProfile must run first because completeOnboarding requires the profile
 * to already exist. This screen is behind ProtectedRoute so auth is guaranteed —
 * no race condition unlike calling createMinimalProfile in StepVerifyEmail.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useConvexAuth } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { trackEvent, trackExperimentAssigned, getScreenCountVariant, getWelcomeHookVariant, getPaywallCopyVariant } from "@/lib/posthog";
import { PlanBuildAnimation } from "@/components/PlanBuildAnimation";

function calculateCalories(): number {
  const sex = sessionStorage.getItem("ob_sex") || "other";
  const age = parseInt(sessionStorage.getItem("ob_age") || "30");
  const heightFt = parseInt(sessionStorage.getItem("ob_heightFt") || "5");
  const heightIn = parseInt(sessionStorage.getItem("ob_heightIn") || "6");
  const weightLb = parseFloat(sessionStorage.getItem("ob_currentWeight") || "160");
  const activity = sessionStorage.getItem("ob_activity") || "moderate";
  const goals: string[] = JSON.parse(sessionStorage.getItem("ob_goals") || "[]");

  const heightCm = (heightFt * 12 + heightIn) * 2.54;
  const weightKg = weightLb * 0.453592;

  let bmr: number;
  if (sex === "female") {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  } else {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  }

  const multipliers: Record<string, number> = {
    sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9,
  };
  const tdee = bmr * (multipliers[activity] || 1.55);

  if (goals.includes("lose_weight")) return Math.round(tdee - 500);
  if (goals.includes("build_muscle") || goals.includes("gain_weight")) return Math.round(tdee + 250);
  return Math.round(tdee);
}

export function StepBuildingPlan() {
  const navigate = useNavigate();
  const { isAuthenticated } = useConvexAuth();
  const createMinimalProfile = useMutation(api.onboarding.createMinimalProfile);
  const completeOnboarding = useMutation(api.onboarding.completeOnboarding);
  const generatePlan = useMutation(api.mealPlans.generatePlan);
  const [isGenerating, setIsGenerating] = useState(false);

  const calories = calculateCalories();
  const protein = Math.round((calories * 0.30) / 4);
  const carbs = Math.round((calories * 0.45) / 4);
  const fat = Math.round((calories * 0.25) / 9);
  const goals: string[] = JSON.parse(sessionStorage.getItem("ob_goals") || "[]");
  const goal = goals.includes("lose_weight")
    ? "moderate_cut"
    : goals.includes("gain_weight") || goals.includes("build_muscle")
    ? "light_bulk"
    : "maintenance";

  // Save macros to sessionStorage so reveal screen can use them
  sessionStorage.setItem("ob_calories", String(calories));
  sessionStorage.setItem("ob_protein", String(protein));
  sessionStorage.setItem("ob_carbs", String(carbs));
  sessionStorage.setItem("ob_fat", String(fat));

  // Report A/B experiment assignments to PostHog now that the user is
  // authenticated and the Convex client is available.
  useEffect(() => {
    trackExperimentAssigned("ob_screen_count", getScreenCountVariant());
    trackExperimentAssigned("ob_welcome_hook", getWelcomeHookVariant());
    trackExperimentAssigned("ob_paywall_copy", getPaywallCopyVariant());
  }, []);

  // Ensure profile exists first, then completeOnboarding, then kick off plan generation.
  // generatePlan runs in background so the animation doesn't block — but we track whether
  // it's still running so PlanBuildAnimation can show a "finalizing..." line.
  useEffect(() => {
    if (!isAuthenticated) return;
    const firstName = sessionStorage.getItem("ob_firstName") || "";
    createMinimalProfile({ firstName })
      .then(() => completeOnboarding({
        firstName: sessionStorage.getItem("ob_firstName") || "",
        goals: JSON.parse(sessionStorage.getItem("ob_goals") || "[]"),
        glp1Status: sessionStorage.getItem("ob_glp1") || "no",
        pastBarriers: JSON.parse(sessionStorage.getItem("ob_barriers") || "[]"),
        habits: JSON.parse(sessionStorage.getItem("ob_habits") || "[]"),
        mealPlanOptIn: true,
        planningFrequency: sessionStorage.getItem("ob_frequency") || "daily",
        sex: sessionStorage.getItem("ob_sex") || "other",
        age: parseInt(sessionStorage.getItem("ob_age") || "25"),
        country: sessionStorage.getItem("ob_country") || "US",
        zip: sessionStorage.getItem("ob_zip") || undefined,
        currentWeightLb: parseFloat(sessionStorage.getItem("ob_currentWeight") || "160"),
        goalWeightLb: parseFloat(
          sessionStorage.getItem("ob_goalWeight") ||
          sessionStorage.getItem("ob_currentWeight") ||
          "150"
        ),
        heightFt: parseInt(sessionStorage.getItem("ob_heightFt") || "5"),
        heightIn: parseInt(sessionStorage.getItem("ob_heightIn") || "6"),
        reminderOptIn: true,
        emailOptIn: true,
        personalizationConsent: true,
        calorieTarget: calories,
        activityLevel: sessionStorage.getItem("ob_activity") || "moderate",
      }))
      .then(() => {
        // Fire plan generation right after profile is saved so it's ready when animation ends.
        setIsGenerating(true);
        return generatePlan({});
      })
      .then(() => setIsGenerating(false))
      .catch((e) => { console.error(e); setIsGenerating(false); });
  }, [isAuthenticated]);

  const handleComplete = async () => {
    // If plan is still generating, wait for it (up to 8s) before navigating
    if (isGenerating) {
      const start = Date.now();
      await new Promise<void>((resolve) => {
        const check = () => {
          if (!isGenerating || Date.now() - start > 8000) resolve();
          else setTimeout(check, 200);
        };
        check();
      });
    }
    trackEvent("onboarding_completed", { source: "building_plan" });
    navigate("/dashboard", { replace: true });
  };

  return (
    <PlanBuildAnimation
      dietLabel="your"
      calories={calories}
      protein={protein}
      carbs={carbs}
      fat={fat}
      goal={goal}
      isGenerating={isGenerating}
      onComplete={handleComplete}
    />
  );
}
