/**
 * Screen 8 — Meal plan opt-in
 * Yes → chef hat interstitial → frequency
 * No → signpost interstitial → frequency
 */
import { useNavigate } from "react-router-dom";
import { OnboardingLayout, OnboardingHeadline, OnboardingSubtext } from "./OnboardingLayout";

export function Step08MealPlan() {
  const navigate = useNavigate();

  const choose = (optIn: boolean) => {
    sessionStorage.setItem("ob_mealPlanOptIn", JSON.stringify(optIn));
    navigate(optIn ? "/onboarding/kitchen" : "/onboarding/journey");
  };

  return (
    <OnboardingLayout step="meal-plan">
      <div className="flex flex-col flex-1 px-6 pt-8 pb-10">
        <OnboardingHeadline className="mb-2">
          Want us to build your meal plan?
        </OnboardingHeadline>
        <OnboardingSubtext className="mb-10">
          We'll generate a full week of meals based on your goals, preferences, and kitchen setup.
        </OnboardingSubtext>

        <div className="flex flex-col gap-3 flex-1">
          <button
            onClick={() => choose(true)}
            className="w-full px-5 py-5 rounded-2xl text-left transition-all active:scale-[0.98]"
            style={{ background: "rgba(82,183,136,0.12)", border: "1.5px solid #52B788" }}
          >
            <div className="text-base font-semibold mb-1" style={{ color: "#52B788" }}>
              Yes, build my plan 🙌
            </div>
            <div className="text-sm text-muted-foreground">
              A personalised weekly meal plan, ready to go.
            </div>
          </button>

          <button
            onClick={() => choose(false)}
            className="w-full px-5 py-5 rounded-2xl text-left transition-all active:scale-[0.98]"
            style={{ background: "var(--muted)", border: "1.5px solid transparent" }}
          >
            <div className="text-base font-semibold mb-1">
              No thanks, I'll track manually 👌
            </div>
            <div className="text-sm text-muted-foreground">
              Just give me the food tracker and calorie targets.
            </div>
          </button>
        </div>
      </div>
    </OnboardingLayout>
  );
}
