/**
 * Screen 23 — Welcome Premium
 * Route: /onboarding/welcome-premium
 * 
 * Shown after Stripe checkout succeeds. Celebrates the purchase.
 */
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

export function StepWelcomePremium() {
  const navigate = useNavigate();
  const completeOnboarding = useMutation(api.onboarding.completeOnboarding);

  useEffect(() => {
    // Flush all sessionStorage onboarding data to profile
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
    } catch (e) {
      console.error("completeOnboarding error:", e);
    }
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 max-w-lg lg:max-w-2xl mx-auto w-full"
      style={{ background: "#000" }}
    >
      {/* Animated glow circle */}
      <div
        className="relative flex items-center justify-center mb-8"
        style={{ width: 140, height: 140 }}
      >
        <div
          className="absolute inset-0 rounded-full animate-pulse"
          style={{ background: "radial-gradient(circle, rgba(229,180,84,0.3) 0%, transparent 70%)" }}
        />
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center"
          style={{ background: "rgba(229,180,84,0.12)", border: "2px solid rgba(229,180,84,0.3)" }}
        >
          <span className="text-4xl">👑</span>
        </div>
      </div>

      <h1 className="font-serif text-3xl text-white text-center leading-tight mb-3">
        Welcome to{" "}
        <span style={{ color: "var(--plate-gold)" }}>Premium</span>
      </h1>
      <p className="text-base text-center mb-10" style={{ color: "rgba(255,255,255,0.55)" }}>
        You now have full access to every feature in PLATE. Let's get started on your goals!
      </p>

      {/* What's unlocked */}
      <div
        className="w-full rounded-2xl px-5 py-4 mb-10"
        style={{ background: "rgba(229,180,84,0.06)", border: "1px solid rgba(229,180,84,0.15)" }}
      >
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "rgba(229,180,84,0.7)" }}>
          Unlocked for you
        </p>
        {[
          "📸 Meal Photo Scan",
          "🎙️ Voice Logging",
          "📊 Advanced Analytics",
          "🍽️ Unlimited Meal Plans",
          "🚫 No Ads",
        ].map((item) => (
          <div key={item} className="flex items-center gap-2 py-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" fill="rgba(229,180,84,0.2)" />
              <path d="M7 13l3 3 7-7" stroke="#E5B454" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span className="text-sm text-white">{item}</span>
          </div>
        ))}
      </div>

      <button
        onClick={() => navigate("/dashboard", { replace: true })}
        className="w-full font-bold text-base rounded-full transition-all active:scale-[0.98]"
        style={{
          background: "var(--plate-gold)",
          color: "#1a1200",
          height: "56px",
        }}
      >
        Go to My Dashboard
      </button>
    </div>
  );
}
