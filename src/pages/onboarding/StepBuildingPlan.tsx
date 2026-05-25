/**
 * "Building Your Plan" screen — uses the existing PlanBuildAnimation component.
 * Route: /onboarding/building-plan
 *
 * Fires completeOnboarding in background, shows the animated plan build,
 * then navigates straight to /dashboard. No paywall.
 */
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { trackEvent } from "@/lib/posthog";
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
  const completeOnboarding = useMutation(api.onboarding.completeOnboarding);

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

  // Fire completeOnboarding in background immediately on mount
  useEffect(() => {
    completeOnboarding({
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
    }).catch(console.error);
  }, []);

  const handleComplete = () => {
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
      onComplete={handleComplete}
    />
  );
}
