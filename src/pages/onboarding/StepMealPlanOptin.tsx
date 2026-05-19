/**
 * Screen 10 — Meal Plan Opt-In
 * Route: /onboarding/mealplan-optin
 */
import { useNavigate } from "react-router-dom";
import { OnboardingLayout, OnboardingHeadline, OnboardingSubtext, SelectChip } from "./OnboardingLayout";
import { useState } from "react";

const OPTIONS = [
  { value: "yes", label: "Yes, definitely", emoji: "🙌" },
  { value: "open", label: "Open to trying", emoji: "🤔" },
  { value: "no", label: "No thanks", emoji: "👋" },
];

export function StepMealPlanOptin() {
  const navigate = useNavigate();
  const [value, setValue] = useState(() => sessionStorage.getItem("ob_mealPlanOptIn") || "");

  const handleNext = (v: string) => {
    sessionStorage.setItem("ob_mealPlanOptIn", v);
    if (v === "no") {
      navigate("/onboarding/interstitial-journey");
    } else {
      navigate("/onboarding/interstitial-kitchen");
    }
  };

  return (
    <OnboardingLayout step="mealplan-optin" headerTitle="Goals" activeSegment={6} totalSegments={9}>
      <div className="flex flex-col flex-1 px-6 pt-8 pb-10">
        <OnboardingHeadline className="mb-2">
          Do you want us to help you build weekly meal plans?
        </OnboardingHeadline>
        <OnboardingSubtext className="mb-8">
          Your custom plan will be tailored to your lifestyle and goals.
        </OnboardingSubtext>

        <div className="flex flex-col gap-3 flex-1">
          {OPTIONS.map((o) => (
            <SelectChip
              key={o.value}
              label={o.label}
              emoji={o.emoji}
              selected={value === o.value}
              onClick={() => {
                setValue(o.value);
                handleNext(o.value);
              }}
            />
          ))}
        </div>
      </div>
    </OnboardingLayout>
  );
}
