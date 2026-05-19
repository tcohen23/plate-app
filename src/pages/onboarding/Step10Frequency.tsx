/**
 * Screen 10 — Meal planning frequency
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { OnboardingLayout, OnboardingHeadline, OnboardingSubtext, OnboardingCTA, SelectChip } from "./OnboardingLayout";

const OPTIONS = [
  { value: "daily", label: "Daily: fresh plan every morning", emoji: "🌅" },
  { value: "weekly", label: "Weekly: plan the whole week at once", emoji: "📅" },
  { value: "bi_weekly", label: "Every two weeks", emoji: "🗓️" },
  { value: "monthly", label: "Monthly: set it and forget it", emoji: "📆" },
];

export function Step10Frequency() {
  const navigate = useNavigate();
  const [value, setValue] = useState(() => sessionStorage.getItem("ob_frequency") || "");

  const handleContinue = () => {
    sessionStorage.setItem("ob_frequency", value);
    navigate("/onboarding/stats");
  };

  return (
    <OnboardingLayout step="frequency">
      <div className="flex flex-col flex-1 px-6 pt-8 pb-10">
        <OnboardingHeadline className="mb-2">
          How often do you want to plan?
        </OnboardingHeadline>
        <OnboardingSubtext className="mb-6">
          You can always change this later in settings.
        </OnboardingSubtext>

        <div className="flex flex-col gap-2.5 flex-1">
          {OPTIONS.map((o) => (
            <SelectChip
              key={o.value}
              label={o.label}
              emoji={o.emoji}
              selected={value === o.value}
              onClick={() => setValue(o.value)}
            />
          ))}
        </div>

        <div className="mt-6">
          <OnboardingCTA onClick={handleContinue} disabled={!value}>
            Continue
          </OnboardingCTA>
        </div>
      </div>
    </OnboardingLayout>
  );
}
