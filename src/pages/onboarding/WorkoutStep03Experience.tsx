/**
 * Workout Screen W3 — Experience level + frequency
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { OnboardingLayout, OnboardingHeadline, OnboardingSubtext, OnboardingCTA, SelectChip } from "./OnboardingLayout";

const EXPERIENCE = [
  { value: "beginner", label: "Beginner, under 1 year", emoji: "🌱" },
  { value: "intermediate", label: "Intermediate, 1 to 3 years", emoji: "📈" },
  { value: "advanced", label: "Advanced, 3+ years", emoji: "🏆" },
];

const FREQUENCY = [
  { value: "2-3", label: "2–3 days/week", emoji: "🟢" },
  { value: "4-5", label: "4–5 days/week", emoji: "🟡" },
  { value: "6+", label: "6+ days/week", emoji: "🔴" },
];

export function WorkoutStep03Experience() {
  const navigate = useNavigate();
  const [experience, setExperience] = useState(() => sessionStorage.getItem("wo_experience") || "");
  const [frequency, setFrequency] = useState(() => sessionStorage.getItem("wo_frequency") || "");

  const isValid = experience && frequency;

  const handleContinue = () => {
    sessionStorage.setItem("wo_experience", experience);
    sessionStorage.setItem("wo_frequency", frequency);
    navigate("/onboarding/workout/gym");
  };

  return (
    <OnboardingLayout step="workout-experience">
      <div className="flex flex-col flex-1 px-6 pt-8 pb-10">
        <OnboardingHeadline className="mb-2">Training background</OnboardingHeadline>
        <OnboardingSubtext className="mb-6">
          Helps us pitch the right exercises and volume for you.
        </OnboardingSubtext>

        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Experience level</p>
          <div className="flex flex-col gap-2.5">
            {EXPERIENCE.map((e) => (
              <SelectChip key={e.value} label={e.label} emoji={e.emoji} selected={experience === e.value} onClick={() => setExperience(e.value)} />
            ))}
          </div>
        </div>

        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">How many days/week?</p>
          <div className="flex flex-col gap-2.5">
            {FREQUENCY.map((f) => (
              <SelectChip key={f.value} label={f.label} emoji={f.emoji} selected={frequency === f.value} onClick={() => setFrequency(f.value)} />
            ))}
          </div>
        </div>

        <div className="mt-auto">
          <OnboardingCTA onClick={handleContinue} disabled={!isValid}>Continue</OnboardingCTA>
        </div>
      </div>
    </OnboardingLayout>
  );
}
