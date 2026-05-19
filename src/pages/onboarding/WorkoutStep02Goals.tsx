/**
 * Workout Screen W2 — Workout goals
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { OnboardingLayout, OnboardingHeadline, OnboardingSubtext, OnboardingCTA, SelectChip } from "./OnboardingLayout";

const GOALS = [
  { value: "fat_loss", label: "Burn fat & get lean", emoji: "🔥" },
  { value: "muscle_gain", label: "Build muscle & size", emoji: "💪" },
  { value: "recomp", label: "Recomp, lose fat and gain muscle", emoji: "⚖️" },
  { value: "strength", label: "Get stronger (powerlifting focus)", emoji: "🏋️" },
  { value: "endurance", label: "Improve endurance & cardio", emoji: "🏃" },
  { value: "athletic", label: "Athletic performance", emoji: "🏆" },
];

export function WorkoutStep02Goals() {
  const navigate = useNavigate();
  const [value, setValue] = useState(() => sessionStorage.getItem("wo_goal") || "");

  const handleContinue = () => {
    sessionStorage.setItem("wo_goal", value);
    navigate("/onboarding/workout/experience");
  };

  return (
    <OnboardingLayout step="workout-goals">
      <div className="flex flex-col flex-1 px-6 pt-8 pb-10">
        <OnboardingHeadline className="mb-2">What's your workout goal?</OnboardingHeadline>
        <OnboardingSubtext className="mb-6">
          We'll build your program around this primary objective.
        </OnboardingSubtext>

        <div className="flex flex-col gap-2.5 flex-1">
          {GOALS.map((g) => (
            <SelectChip
              key={g.value}
              label={g.label}
              emoji={g.emoji}
              selected={value === g.value}
              onClick={() => setValue(g.value)}
            />
          ))}
        </div>

        <div className="mt-6">
          <OnboardingCTA onClick={handleContinue} disabled={!value}>Continue</OnboardingCTA>
        </div>
      </div>
    </OnboardingLayout>
  );
}
