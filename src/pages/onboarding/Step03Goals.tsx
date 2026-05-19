/**
 * Screen 4 — Goals multi-select (up to 3)
 * Route: /onboarding/goals
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { OnboardingLayout, OnboardingHeadline, OnboardingSubtext, OnboardingCTA, SelectChip } from "./OnboardingLayout";

const GOALS = [
  { value: "lose_weight", label: "Lose Weight", emoji: "⚖️" },
  { value: "maintain_weight", label: "Maintain Weight", emoji: "🎯" },
  { value: "gain_weight", label: "Gain Weight", emoji: "📈" },
  { value: "gain_muscle", label: "Gain Muscle", emoji: "💪" },
  { value: "modify_diet", label: "Modify My Diet", emoji: "🥗" },
  { value: "plan_meals", label: "Plan Meals", emoji: "📅" },
  { value: "manage_stress", label: "Manage Stress", emoji: "🧘" },
  { value: "stay_active", label: "Stay Active", emoji: "🏃" },
];

export function Step03Goals() {
  const navigate = useNavigate();
  const firstName = sessionStorage.getItem("ob_firstName") || "there";

  const [selected, setSelected] = useState<string[]>(() => {
    try { return JSON.parse(sessionStorage.getItem("ob_goals") || "[]"); } catch { return []; }
  });

  const toggle = (val: string) => {
    setSelected((prev) => {
      if (prev.includes(val)) return prev.filter((v) => v !== val);
      if (prev.length >= 3) return prev;
      return [...prev, val];
    });
  };

  const handleContinue = () => {
    sessionStorage.setItem("ob_goals", JSON.stringify(selected));
    // Always go to single goal-specific interstitial (content adapts to first goal)
    navigate("/onboarding/interstitial-realtalk");
  };

  return (
    <OnboardingLayout step="goals" headerTitle="Goals" activeSegment={2} totalSegments={9}>
      <div className="flex flex-col flex-1 px-6 pt-8 pb-10">
        <OnboardingHeadline className="mb-2">
          Hey, {firstName}. 👋{"\n"}Let's start with your goals.
        </OnboardingHeadline>
        <OnboardingSubtext className="mb-6">
          Select up to three that are most important to you.
        </OnboardingSubtext>

        <div className="flex flex-col gap-2.5 flex-1">
          {GOALS.map((g) => (
            <SelectChip
              key={g.value}
              label={g.label}
              emoji={g.emoji}
              selected={selected.includes(g.value)}
              onClick={() => toggle(g.value)}
            />
          ))}
        </div>

        <div className="mt-6">
          <OnboardingCTA onClick={handleContinue} disabled={selected.length === 0}>
            Next
          </OnboardingCTA>
        </div>
      </div>
    </OnboardingLayout>
  );
}
