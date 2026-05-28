/**
 * GoalsPage — MFP Goals settings (photos 22, 23)
 *
 * Sections:
 *   Starting Weight | Current Weight | Goal Weight | Weekly Goal | Activity Level
 *   --- Nutrition Goals ---
 *   Calorie Goal | Carbs | Protein | Fat | Calorie Goals By Meal 👑 | Show Macros By Meal 👑 | Additional Nutrient Goals
 *   --- Fitness Goals ---
 *   Workouts/Week | Minutes/Workout | Exercise Calories 👑
 *   "Go Premium, Get Results" CTA
 *   "How we make recommendations" link
 */
import { useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePaywall } from "@/components/PaywallModal";

function GoalRow({
  label, value, onClick,
}: { label: string; value?: string | number; premium?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between py-4 border-b last:border-b-0 text-left transition-opacity active:opacity-60"
      style={{ borderColor: "var(--border)" }}
      disabled={!onClick}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {value !== undefined && <span className="text-sm text-muted-foreground">{value}</span>}
        {onClick && <ChevronRight className="w-4 h-4" style={{ color: "rgba(255,255,255,0.2)" }} />}
      </div>
    </button>
  );
}

const GOAL_LABELS: Record<string, string> = {
  fat_loss: "Lose 2 lbs per week",
  muscle_gain: "Gain 0.5 lbs per week",
  maintenance: "Maintain current weight",
};

const ACTIVITY_LABELS: Record<string, string> = {
  sedentary: "Sedentary",
  lightly_active: "Lightly Active",
  moderately_active: "Moderately Active",
  active: "Active",
  very_active: "Very Active",
};

export function GoalsPage() {
  const navigate = useNavigate();
  const profile = useQuery(api.profiles.getProfile);
  const progressLogs = useQuery(api.progress.getProgressLogs);
  const { paywallNode, openPaywall } = usePaywall("general");

  if (!profile) {
    return (
      <div className="pb-28 max-w-lg mx-auto px-4 pt-4">
        <div className="h-96 skeleton-shimmer rounded-2xl" />
      </div>
    );
  }

  const sortedLogs = [...(progressLogs || [])].sort((a: any, b: any) => a.date.localeCompare(b.date));
  const startWeight = profile.weight ?? 0;
  const latestWeight = sortedLogs.length > 0 ? (sortedLogs[sortedLogs.length - 1].weight ?? startWeight) : startWeight;
  const goalWeight = (profile as any).goalWeight ?? "--";
  const goalLabel = GOAL_LABELS[(profile as any).goal] || "Maintain current weight";
  const activityLabel = ACTIVITY_LABELS[(profile as any).activityLevel] || "Active";

  return (
    <div className="pb-28 max-w-lg mx-auto animate-page-enter">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <button onClick={() => navigate(-1)} className="mr-3">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-semibold">Goals</h1>
        <div className="w-8" />
      </div>

      {/* Weight stats */}
      <div className="px-4 mb-2">
        <div className="rounded-2xl px-4" style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}>
          <GoalRow label="Starting Weight" value={startWeight ? `${startWeight} lbs on ${(profile as any).createdAt ? new Date((profile as any).createdAt).toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "2-digit" }) : ""}` : "--"} />
          <GoalRow label="Current Weight" value={latestWeight ? `${latestWeight} lbs` : "--"} onClick={() => navigate("/more/measurements?tab=weight")} />
          <GoalRow label="Goal Weight" value={goalWeight ? `${goalWeight} lbs` : "--"} onClick={() => navigate("/settings")} />
          <GoalRow label="Weekly Goal" value={goalLabel} onClick={() => navigate("/settings")} />
          <GoalRow label="Activity Level" value={activityLabel} onClick={() => navigate("/settings")} />
        </div>
      </div>

      {/* Nutrition Goals */}
      <div className="px-4 mb-2">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-1 pt-4 pb-2">Nutrition Goals</div>
        <div className="rounded-2xl px-4" style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}>
          <GoalRow label="Calorie Goal" value={profile.targetCalories ? `${profile.targetCalories} kcal` : "--"} onClick={() => navigate("/settings")} />
          <GoalRow label="Carbs Goal" value={profile.targetCarbs ? `${profile.targetCarbs}g` : "--"} onClick={() => navigate("/settings")} />
          <GoalRow label="Protein Goal" value={profile.targetProtein ? `${profile.targetProtein}g` : "--"} onClick={() => navigate("/settings")} />
          <GoalRow label="Fat Goal" value={profile.targetFat ? `${profile.targetFat}g` : "--"} onClick={() => navigate("/settings")} />
          <GoalRow label="Calorie Goals By Meal" onClick={openPaywall} />
          <GoalRow label="Show Macros By Meal" onClick={openPaywall} />
          <GoalRow label="Additional Nutrient Goals" onClick={() => navigate("/more/nutrition")} />
        </div>
      </div>

      {/* Fitness Goals */}
      <div className="px-4 mb-4">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-1 pt-4 pb-2">Fitness Goals</div>
        <div className="rounded-2xl px-4" style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}>
          <GoalRow label="Workouts / Week" value="0" onClick={() => navigate("/workout")} />
          <GoalRow label="Minutes / Workout" value="0" onClick={() => navigate("/workout")} />
          <GoalRow label="Exercise Calories" onClick={openPaywall} />
        </div>
      </div>

      {paywallNode}

      {/* How we make recommendations */}
      <div className="px-4 mb-4 text-center">
        <button onClick={() => navigate("/why")} className="text-sm" style={{ color: "#3B82F6" }}>
          How we make recommendations
        </button>
      </div>
    </div>
  );
}
