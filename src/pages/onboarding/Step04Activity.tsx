/**
 * Screen 7 — Activity level
 * Route: /onboarding/activity
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { OnboardingLayout, OnboardingHeadline, OnboardingSubtext, OnboardingCTA, SelectChip } from "./OnboardingLayout";

const ACTIVITY = [
  {
    value: "sedentary",
    label: "Not Very Active",
    desc: "Spend most of the day sitting (e.g. bank teller, desk job)",
    emoji: "🪑",
  },
  {
    value: "light",
    label: "Lightly Active",
    desc: "Spend a good part of the day on your feet (e.g. teacher, salesperson)",
    emoji: "🚶",
  },
  {
    value: "moderate",
    label: "Active",
    desc: "Spend a good part of the day doing some physical activity (e.g. food server, postal carrier)",
    emoji: "🏃",
  },
  {
    value: "very_active",
    label: "Very Active",
    desc: "Spend most of the day doing heavy physical activity (e.g. bike messenger, carpenter)",
    emoji: "🏋️",
  },
];

export function Step04Activity() {
  const navigate = useNavigate();
  const [value, setValue] = useState(() => sessionStorage.getItem("ob_activity") || "");

  const handleContinue = () => {
    sessionStorage.setItem("ob_activity", value);
    navigate("/onboarding/glp1");
  };

  return (
    <OnboardingLayout step="activity" headerTitle="Goals" activeSegment={3} totalSegments={9}>
      <div className="flex flex-col flex-1 px-6 pt-8 pb-10">
        <OnboardingHeadline className="mb-2">
          What is your baseline activity level?
        </OnboardingHeadline>
        <OnboardingSubtext className="mb-6">
          Not including workouts. We count that separately.
        </OnboardingSubtext>

        <div className="flex flex-col gap-2.5 flex-1">
          {ACTIVITY.map((a) => (
            <SelectChip
              key={a.value}
              label={a.label}
              subtitle={a.desc}
              emoji={a.emoji}
              selected={value === a.value}
              onClick={() => setValue(a.value)}
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
