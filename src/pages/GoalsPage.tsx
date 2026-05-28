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
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ChevronLeft, ChevronRight, Crown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAccessLevel } from "@/components/RequireSubscription";
import { usePaywall } from "@/components/PaywallModal";
import { toast } from "sonner";

function GoalRow({
  label, value, premium, onClick,
}: { label: string; value?: string | number; premium?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between py-4 border-b last:border-b-0 text-left transition-opacity active:opacity-60"
      style={{ borderColor: "var(--border)" }}
      disabled={!onClick}
    >
      <div className="flex items-center gap-2">
        {premium && <Crown className="w-3.5 h-3.5" style={{ color: "#E5B454" }} />}
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
  const { isPremium } = useAccessLevel();
  const { paywallNode, openPaywall } = usePaywall("general");
  const updateProfile = useMutation(api.profiles.updateProfile);

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
          <GoalRow label="Calorie Goals By Meal" premium onClick={isPremium ? () => navigate("/track") : openPaywall} />
          <GoalRow label="Show Macros By Meal" premium onClick={isPremium ? () => navigate("/more/nutrition") : openPaywall} />
          <GoalRow label="Additional Nutrient Goals" onClick={() => navigate("/more/nutrition")} />
        </div>
      </div>

      {/* Fitness Goals */}
      <div className="px-4 mb-4">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-widest px-1 pt-4 pb-2">Fitness Goals</div>
        <div className="rounded-2xl px-4" style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}>
          <GoalRow label="Workouts / Week" value={(profile as any).workoutFrequency || "0"} onClick={() => navigate("/workout")} />
          <GoalRow label="Minutes / Workout" value={(profile as any).workoutDuration || "0"} onClick={() => navigate("/workout")} />
          {/* Exercise Calories — premium feature that actually works */}
          {isPremium ? (
            <div className="py-4 border-b last:border-b-0" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center gap-2 mb-3">
                <Crown className="w-3.5 h-3.5" style={{ color: "#E5B454" }} />
                <span className="text-sm">Exercise Calories</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { value: "info_only", label: "Show Info Only", desc: "See cals burned, doesn't adjust meal plan" },
                  { value: "add_to_goal", label: "Add to Goal", desc: "Burned calories added back to your daily meal plan budget" },
                ] as const).map(opt => {
                  const current = (profile as any).exerciseCalorieMode ?? "info_only";
                  const active = current === opt.value;
                  return (
                    <button
                      key={opt.value}
                      onClick={() =>
                        updateProfile({ exerciseCalorieMode: opt.value }).then(() =>
                          toast.success(opt.value === "add_to_goal" ? "Exercise calories now added to your meal plan goal 🔥" : "Exercise calories shown as info only")
                        )
                      }
                      className="rounded-xl p-3 text-left border transition-all"
                      style={{
                        background: active ? "rgba(82,183,136,0.12)" : "var(--surface-card)",
                        borderColor: active ? "#52B788" : "var(--border)",
                      }}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        {active && <Check className="w-3 h-3" style={{ color: "#52B788" }} />}
                        <p className="text-xs font-bold" style={{ color: active ? "#52B788" : "var(--foreground)" }}>{opt.label}</p>
                      </div>
                      <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.45)" }}>{opt.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <GoalRow label="Exercise Calories" premium onClick={openPaywall} />
          )}
        </div>
      </div>

      {/* Go Premium CTA */}
      {!isPremium && (
        <div className="px-4 mb-4">
          <div className="rounded-2xl p-5" style={{ background: "rgba(82,183,136,0.08)", border: "1px solid rgba(82,183,136,0.25)" }}>
            <div className="flex items-center gap-3 mb-3">
              <Crown className="w-6 h-6" style={{ color: "#52B788" }} />
              <div>
                <div className="text-sm font-bold">Go Premium, Get Results</div>
                <div className="text-xs text-muted-foreground">Unlock macro goals per meal, premium insights & more</div>
              </div>
            </div>
            <Button
              onClick={openPaywall}
              className="w-full rounded-full font-bold"
              style={{ background: "#52B788", color: "#0a1a0a" }}
            >
              Start 7-Day Free Trial
            </Button>
          </div>
        </div>
      )}
      {paywallNode}

      {/* How we make recommendations */}
      <div className="px-4 mb-4 text-center">
        <button onClick={() => navigate("/why")} className="text-sm" style={{ color: "#52B788" }}>
          How we make recommendations
        </button>
      </div>
    </div>
  );
}
