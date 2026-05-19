/**
 * Workout Screen W4 — Gym type + equipment
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { OnboardingLayout, OnboardingHeadline, OnboardingSubtext, OnboardingCTA, SelectChip } from "./OnboardingLayout";

const GYM_TYPES = [
  { value: "commercial", label: "Commercial gym (Planet Fitness, LA Fitness etc)", emoji: "🏢" },
  { value: "home", label: "Home gym", emoji: "🏠" },
  { value: "crossfit", label: "CrossFit / functional fitness box", emoji: "🔗" },
  { value: "minimalist", label: "Minimalist (bands, bodyweight only)", emoji: "🪢" },
];

const EQUIPMENT = [
  { value: "barbells", label: "Barbells", emoji: "🏋️" },
  { value: "dumbbells", label: "Dumbbells", emoji: "💪" },
  { value: "cables", label: "Cables / machines", emoji: "🔧" },
  { value: "kettlebells", label: "Kettlebells", emoji: "🫙" },
  { value: "pull_up_bar", label: "Pull-up bar", emoji: "🪝" },
  { value: "resistance_bands", label: "Resistance bands", emoji: "🪢" },
  { value: "cardio_machines", label: "Cardio machines", emoji: "🚴" },
];

export function WorkoutStep04Gym() {
  const navigate = useNavigate();
  const saveStep = useMutation(api.onboarding.saveStep);

  const [gymType, setGymType] = useState(() => sessionStorage.getItem("wo_gymType") || "");
  const [equipment, setEquipment] = useState<string[]>(() => {
    try { return JSON.parse(sessionStorage.getItem("wo_equipment") || "[]"); } catch { return []; }
  });
  const [loading, setLoading] = useState(false);

  const toggleEquip = (val: string) => {
    setEquipment((prev) => prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]);
  };

  const handleContinue = async () => {
    sessionStorage.setItem("wo_gymType", gymType);
    sessionStorage.setItem("wo_equipment", JSON.stringify(equipment));
    setLoading(true);
    try {
      await saveStep({
        step: "workout-complete",
        data: {
          goesToGym: gymType !== "home" ? "yes" : "home",
          gymType,
          equipment,
          workoutGoal: sessionStorage.getItem("wo_goal") || "",
          experienceLevel: sessionStorage.getItem("wo_experience") || "",
          workoutFrequency: sessionStorage.getItem("wo_frequency") || "",
        },
      });
      // Clear workout sessionStorage
      ["wo_goal", "wo_experience", "wo_frequency", "wo_gymType", "wo_equipment"].forEach((k) => sessionStorage.removeItem(k));
      navigate("/workout");
    } catch {
      setLoading(false);
    }
  };

  return (
    <OnboardingLayout step="workout-gym">
      <div className="flex flex-col flex-1 px-6 pt-8 pb-10">
        <OnboardingHeadline className="mb-2">Where do you train?</OnboardingHeadline>
        <OnboardingSubtext className="mb-6">
          We'll tailor exercises to what you actually have access to.
        </OnboardingSubtext>

        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Gym type</p>
          <div className="flex flex-col gap-2.5">
            {GYM_TYPES.map((g) => (
              <SelectChip key={g.value} label={g.label} emoji={g.emoji} selected={gymType === g.value} onClick={() => setGymType(g.value)} />
            ))}
          </div>
        </div>

        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Equipment available</p>
          <div className="flex flex-col gap-2.5">
            {EQUIPMENT.map((e) => (
              <SelectChip key={e.value} label={e.label} emoji={e.emoji} selected={equipment.includes(e.value)} onClick={() => toggleEquip(e.value)} />
            ))}
          </div>
        </div>

        <div className="mt-auto">
          <OnboardingCTA onClick={handleContinue} disabled={!gymType} loading={loading}>
            Build my workout plan →
          </OnboardingCTA>
        </div>
      </div>
    </OnboardingLayout>
  );
}
