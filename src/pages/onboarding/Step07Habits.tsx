/**
 * Screen 7 — Healthy habits priority
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { OnboardingLayout, OnboardingHeadline, OnboardingSubtext, OnboardingCTA, SelectChip } from "./OnboardingLayout";

const HABITS = [
  { value: "meal_prep", label: "Meal prepping on weekends", emoji: "🥡" },
  { value: "tracking", label: "Tracking what I eat", emoji: "📊" },
  { value: "hydration", label: "Drinking more water", emoji: "💧" },
  { value: "less_processed", label: "Eating less processed food", emoji: "🥦" },
  { value: "more_protein", label: "Hitting my protein goals", emoji: "🥩" },
  { value: "mindful_eating", label: "Mindful eating", emoji: "🧘" },
  { value: "cooking_home", label: "Cooking at home more", emoji: "🍳" },
];

export function Step07Habits() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string[]>(() => {
    try { return JSON.parse(sessionStorage.getItem("ob_habits") || "[]"); } catch { return []; }
  });

  const toggle = (val: string) => {
    setSelected((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
    );
  };

  const handleContinue = () => {
    sessionStorage.setItem("ob_habits", JSON.stringify(selected));
    navigate("/onboarding/personalization");
  };

  return (
    <OnboardingLayout step="habits">
      <div className="flex flex-col flex-1 px-6 pt-8 pb-10">
        <OnboardingHeadline className="mb-2">
          Which habits matter most to you?
        </OnboardingHeadline>
        <OnboardingSubtext className="mb-6">
          We'll weave these into your plan. Pick as many as you like.
        </OnboardingSubtext>

        <div className="flex flex-col gap-2.5 flex-1">
          {HABITS.map((h) => (
            <SelectChip
              key={h.value}
              label={h.label}
              emoji={h.emoji}
              selected={selected.includes(h.value)}
              onClick={() => toggle(h.value)}
            />
          ))}
        </div>

        <div className="mt-6">
          <OnboardingCTA onClick={handleContinue}>
            Continue {selected.length > 0 ? `(${selected.length} selected)` : ""}
          </OnboardingCTA>
          <button onClick={handleContinue} className="w-full text-center text-sm text-muted-foreground mt-3 py-2">
            Skip
          </button>
        </div>
      </div>
    </OnboardingLayout>
  );
}
