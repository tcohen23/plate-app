/**
 * Screen 21 — Feature Showcase
 * Route: /onboarding/features
 *
 * Shows 3 key free features. "Start For Free" completes onboarding and
 * navigates directly to /dashboard — no upsell page.
 */
import { useNavigate } from "react-router-dom";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

function useCompleteOnboardingFree() {
  const completeOnboarding = useMutation(api.onboarding.completeOnboarding);
  return () => {
    try {
      completeOnboarding({
        firstName: sessionStorage.getItem("ob_firstName") || "",
        goals: JSON.parse(sessionStorage.getItem("ob_goals") || "[]"),
        glp1Status: sessionStorage.getItem("ob_glp1") || "no",
        pastBarriers: JSON.parse(sessionStorage.getItem("ob_barriers") || "[]"),
        habits: JSON.parse(sessionStorage.getItem("ob_habits") || "[]"),
        mealPlanOptIn: sessionStorage.getItem("ob_mealPlanOptIn") !== "no",
        planningFrequency: sessionStorage.getItem("ob_frequency") || "daily",
        sex: sessionStorage.getItem("ob_sex") || "other",
        age: parseInt(sessionStorage.getItem("ob_age") || "25"),
        country: sessionStorage.getItem("ob_country") || "US",
        zip: sessionStorage.getItem("ob_zip") || undefined,
        currentWeightLb: parseFloat(sessionStorage.getItem("ob_currentWeight") || "160"),
        goalWeightLb: parseFloat(sessionStorage.getItem("ob_goalWeight") || "150"),
        heightFt: parseInt(sessionStorage.getItem("ob_heightFt") || "5"),
        heightIn: parseInt(sessionStorage.getItem("ob_heightIn") || "6"),
        reminderOptIn: true,
        emailOptIn: true,
        personalizationConsent: true,
        calorieTarget: parseInt(sessionStorage.getItem("ob_calories") || "2000"),
        activityLevel: sessionStorage.getItem("ob_activity") || "moderate",
      }).catch(console.error);
    } catch {}
  };
}

const FEATURES = [
  {
    icon: "🎯",
    title: "Macro & Calorie Tracking",
    body: "Your personalized daily targets for calories, protein, carbs, and fat tracked automatically as you log meals.",
    badge: "Free",
  },
  {
    icon: "📅",
    title: "Meal Planning",
    body: "A custom weekly meal plan built around your goals, preferences, and schedule.",
    badge: "Free",
  },
  {
    icon: "💧",
    title: "Water Tracking",
    body: "Log your daily water intake and hit your hydration goals.",
    badge: "Free",
  },
];

export function StepFeatures() {
  const navigate = useNavigate();
  const completeOnboardingFree = useCompleteOnboardingFree();

  return (
    <div
      className="min-h-screen flex flex-col max-w-lg lg:max-w-2xl mx-auto w-full"
      style={{ background: "#000" }}
    >
      <div className="flex-1 flex flex-col px-6 pt-14 pb-6">
        {/* Header */}
        <div className="mb-2">
          <span
            className="text-xs font-semibold tracking-widest uppercase px-3 py-1.5 rounded-full"
            style={{ background: "rgba(82,183,136,0.1)", color: "#52B788" }}
          >
            Your plan is ready 🎉
          </span>
        </div>

        <h1 className="font-serif text-3xl text-white leading-tight mt-4 mb-2">
          Meet your new nutrition toolkit.
        </h1>
        <p className="text-sm mb-10" style={{ color: "rgba(255,255,255,0.5)" }}>
          Everything you need to hit your goals, right in your pocket.
        </p>

        {/* Feature cards */}
        <div className="flex flex-col gap-4 flex-1">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="flex items-start gap-4 px-4 py-4 rounded-2xl"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
                style={{ background: "rgba(255,255,255,0.06)" }}
              >
                {f.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-white">{f.title}</span>
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{
                      background: f.badge === "Premium" ? "rgba(229,180,84,0.15)" : "rgba(82,183,136,0.12)",
                      color: f.badge === "Premium" ? "#E5B454" : "#52B788",
                    }}
                  >
                    {f.badge}
                  </span>
                </div>
                <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
                  {f.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="px-6 pb-10">
        <button
          onClick={() => {
            completeOnboardingFree();
            navigate("/dashboard", { replace: true });
          }}
          className="w-full font-bold text-base rounded-full transition-all active:scale-[0.98]"
          style={{
            background: "#52B788",
            color: "#0d1f13",
            height: "56px",
          }}
        >
          Start For Free
        </button>
        <p className="text-xs text-center mt-3" style={{ color: "rgba(255,255,255,0.3)" }}>
          Free plan available · Upgrade anytime
        </p>
      </div>
    </div>
  );
}
