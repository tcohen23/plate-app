/**
 * Slim Variant — Screen 3 of 8
 * Combines Name + Goals into a single screen.
 * Route: /onboarding/name-goals
 *
 * Part of Test 6 (ob_screen_count) Variant B (8-screen slim flow).
 * Navigates directly to /onboarding/activity (skips Realtalk interstitial).
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  OnboardingLayout,
  OnboardingHeadline,
  OnboardingSubtext,
  OnboardingCTA,
  SelectChip,
} from "./OnboardingLayout";

const GOALS = [
  { value: "lose_weight",    label: "Lose Weight",    emoji: "⚖️" },
  { value: "maintain_weight",label: "Maintain Weight",emoji: "🎯" },
  { value: "gain_weight",    label: "Gain Weight",    emoji: "📈" },
  { value: "gain_muscle",    label: "Gain Muscle",    emoji: "💪" },
  { value: "modify_diet",    label: "Modify My Diet", emoji: "🥗" },
  { value: "plan_meals",     label: "Plan Meals",     emoji: "📅" },
  { value: "manage_stress",  label: "Manage Stress",  emoji: "🧘" },
  { value: "stay_active",    label: "Stay Active",    emoji: "🏃" },
];

export function StepNameGoals() {
  const navigate = useNavigate();

  const [name, setName] = useState(() => {
    try { return sessionStorage.getItem("ob_firstName") || ""; } catch { return ""; }
  });
  const [selected, setSelected] = useState<string[]>(() => {
    try { return JSON.parse(sessionStorage.getItem("ob_goals") || "[]"); } catch { return []; }
  });

  const isValid = name.trim().length > 0 && selected.length > 0;

  const toggle = (val: string) => {
    setSelected((prev) => {
      if (prev.includes(val)) return prev.filter((v) => v !== val);
      if (prev.length >= 3) return prev;
      return [...prev, val];
    });
  };

  const handleContinue = () => {
    if (!isValid) return;
    try { sessionStorage.setItem("ob_firstName", name.trim()); } catch { /* ignore */ }
    try { sessionStorage.setItem("ob_goals", JSON.stringify(selected)); } catch { /* ignore */ }
    navigate("/onboarding/activity");
  };

  return (
    <OnboardingLayout
      step="name"
      headerTitle="Goals"
      activeSegment={1}
      totalSegments={6}
    >
      <div className="flex flex-col flex-1 px-6 pt-8 pb-10">
        <OnboardingHeadline className="mb-2">
          Let's build your plan
        </OnboardingHeadline>
        <OnboardingSubtext className="mb-6">
          We'll customise everything around your name and goals.
        </OnboardingSubtext>

        {/* Name input */}
        <div className="mb-6">
          <label
            className="block text-xs font-semibold uppercase tracking-widest mb-2"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            Your first name
          </label>
          <input
            type="text"
            autoFocus
            placeholder="First name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && isValid && handleContinue()}
            maxLength={40}
            className="w-full px-4 py-4 rounded-2xl text-lg outline-none transition-all"
            style={{
              background: "var(--muted)",
              border: "1.5px solid",
              borderColor: name ? "#52B788" : "transparent",
              color: "var(--foreground)",
            }}
          />
        </div>

        {/* Goals */}
        <div className="mb-2">
          <label
            className="block text-xs font-semibold uppercase tracking-widest mb-3"
            style={{ color: "rgba(255,255,255,0.4)" }}
          >
            Your goals{" "}
            <span style={{ color: "rgba(255,255,255,0.25)", textTransform: "none", letterSpacing: 0 }}>
              (up to 3)
            </span>
          </label>
          <div className="flex flex-col gap-2">
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
        </div>

        <div className="mt-6">
          <OnboardingCTA onClick={handleContinue} disabled={!isValid}>
            Next
          </OnboardingCTA>
        </div>
      </div>
    </OnboardingLayout>
  );
}
