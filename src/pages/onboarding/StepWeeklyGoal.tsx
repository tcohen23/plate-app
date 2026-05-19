/**
 * Screen 15 — Weekly Weight Goal
 * Route: /onboarding/weekly-goal
 * 
 * Conditional: only shown when weight loss/gain goal
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { OnboardingLayout, OnboardingHeadline, OnboardingSubtext, OnboardingCTA, SelectChip } from "./OnboardingLayout";

export function StepWeeklyGoal() {
  const navigate = useNavigate();
  const goals: string[] = JSON.parse(sessionStorage.getItem("ob_goals") || "[]");
  // "Lose Weight" always takes priority — if it's in the list, ask about losing weight
  const isGain = !goals.includes("lose_weight") && (goals.includes("gain_weight") || goals.includes("gain_muscle"));

  const OPTIONS = isGain
    ? [
        { value: "0.25", label: "0.25 lbs (0.11 kg) per week", desc: "Slow and steady, minimal surplus" },
        { value: "0.5", label: "0.5 lbs (0.23 kg) per week", desc: "Balanced, recommended for most" },
        { value: "1", label: "1 lb (0.45 kg) per week", desc: "Faster gain, higher surplus" },
      ]
    : [
        { value: "0.5", label: "0.5 lbs (0.23 kg) per week", desc: "Light deficit, sustainable long-term" },
        { value: "1", label: "1 lb (0.45 kg) per week", desc: "Balanced, recommended for most" },
        { value: "1.5", label: "1.5 lbs (0.68 kg) per week", desc: "More aggressive, still safe" },
        { value: "2", label: "2 lbs (0.91 kg) per week", desc: "Maximum rate, not for everyone" },
      ];

  const [value, setValue] = useState(() => sessionStorage.getItem("ob_weeklyGoal") || "");

  const handleContinue = () => {
    sessionStorage.setItem("ob_weeklyGoal", value);
    navigate("/onboarding/habits");
  };

  return (
    <OnboardingLayout step="measurements" headerTitle="You" activeSegment={9} totalSegments={9}>
      <div className="flex flex-col flex-1 px-6 pt-8 pb-10">
        <OnboardingHeadline className="mb-2">
          How {isGain ? "quickly" : "quickly"} do you want to {isGain ? "gain weight" : "lose weight"}?
        </OnboardingHeadline>
        <OnboardingSubtext className="mb-6">
          {isGain
            ? "Gaining too fast means more fat. We'll help you build lean mass."
            : "Setting a realistic goal keeps you on track and fueled."}
        </OnboardingSubtext>

        <div className="flex flex-col gap-2.5 flex-1">
          {OPTIONS.map((o) => (
            <SelectChip
              key={o.value}
              label={o.label}
              subtitle={o.desc}
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
