/**
 * Screen 8 — GLP-1 Medication Question
 * Route: /onboarding/glp1
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { OnboardingLayout, OnboardingHeadline, OnboardingSubtext, OnboardingCTA, SelectChip } from "./OnboardingLayout";

const OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "has_rx_not_started", label: "I have a prescription but have not yet started taking it" },
  { value: "getting_rx", label: "I'm in the process of getting a prescription" },
  { value: "no", label: "No" },
  { value: "prefer_not_say", label: "I prefer not to say" },
];

export function Step05Glp1() {
  const navigate = useNavigate();
  const [value, setValue] = useState(() => sessionStorage.getItem("ob_glp1") || "");

  const handleContinue = () => {
    sessionStorage.setItem("ob_glp1", value);
    // Conditional: barriers only for weight goals
    const goals: string[] = JSON.parse(sessionStorage.getItem("ob_goals") || "[]");
    const hasWeightGoal = goals.includes("lose_weight") || goals.includes("gain_weight");
    navigate(hasWeightGoal ? "/onboarding/barriers" : "/onboarding/mealplan-optin");
  };

  return (
    <OnboardingLayout step="glp1" headerTitle="Goals" activeSegment={4} totalSegments={9}>
      <div className="flex flex-col flex-1 px-6 pt-8 pb-10">
        <OnboardingHeadline className="mb-2 text-[1.5rem]">
          Are you taking GLP-1 medications like Ozempic, Mounjaro, Wegovy, or similar?
        </OnboardingHeadline>
        <OnboardingSubtext className="mb-6">
          We're here to support you! Information used in accordance with our Privacy Policy.
        </OnboardingSubtext>

        <div className="flex flex-col gap-2.5 flex-1">
          {OPTIONS.map((o) => (
            <SelectChip
              key={o.value}
              label={o.label}
              selected={value === o.value}
              onClick={() => setValue(o.value)}
            />
          ))}
        </div>

        <div className="mt-6">
          <OnboardingCTA onClick={handleContinue} disabled={!value}>
            Next
          </OnboardingCTA>
        </div>
      </div>
    </OnboardingLayout>
  );
}
