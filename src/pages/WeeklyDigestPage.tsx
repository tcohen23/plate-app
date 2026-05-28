/**
 * WeeklyDigestPage — Full weekly digest/report (photos 32–39)
 *
 * - Date range + calendar icon
 * - Food Insights BETA card
 * - "This week you logged:" category circles
 * - "Are food insights helpful?" 👍👎
 * - Week At A Glance: Weekly Calorie Goal / Calories Logged / Calories Burned
 * - Weekly Summary bar chart (M–Su)
 * - Premium upsell (65%)
 * - Frequently Logged Foods
 * - Macronutrients stacked chart
 * - Exercise And Steps section
 * - All-Time Stats
 * - "Keep It Up" streak CTA
 */
import { useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ChevronLeft, ChevronRight, Calendar, ThumbsUp, ThumbsDown, Flame, Dumbbell, Footprints, Target } from "lucide-react";
import { useState } from "react";

import { hapticLight } from "@/lib/haptics";

const FOOD_CATEGORIES = [
  { emoji: "🥦", label: "Vegetables", sublabel: "Nutrition Superstars" },
  { emoji: "🍓", label: "Fresh fruits", sublabel: "Full of Fiber" },
  { emoji: "🥩", label: "Proteins", sublabel: "Nutrition Powerhouses" },
  { emoji: "🧁", label: "Sweets & snacks", sublabel: "Track Your Treats" },
  { emoji: "🍸", label: "Alcoholic beverages", sublabel: "Sips and Spirits" },
];

const WEEK_DAYS = ["M", "Tu", "W", "Th", "F", "Sa", "Su"];

function WeekBarChart({ data, goal, color }: { data: number[]; goal: number; color: string }) {
  const max = Math.max(...data, goal, 100);
  return (
    <div className="space-y-1">
      <div className="flex items-end gap-1 h-32">
        {data.map((v, i) => {
          const pct = v / max;
          return (
            <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1">
              <div className="w-full rounded-t-sm" style={{ height: `${Math.max(2, pct * 128)}px`, background: v > 0 ? color : "rgba(255,255,255,0.06)" }} />
            </div>
          );
        })}
      </div>
      <div className="flex gap-1">
        {WEEK_DAYS.map(d => (
          <div key={d} className="flex-1 text-center text-xs text-muted-foreground">{d}</div>
        ))}
      </div>
    </div>
  );
}

function MacroStackedBar({ carbsPct, fatPct, protPct }: { carbsPct: number; fatPct: number; protPct: number }) {
  return (
    <div>
      <div className="flex w-full h-6 rounded-full overflow-hidden mb-2">
        <div style={{ width: `${fatPct}%`, background: "#FF6B6B" }} />
        <div style={{ width: `${carbsPct}%`, background: "#F9C74F" }} />
        <div style={{ width: `${protPct}%`, background: "#52B788" }} />
      </div>
      <div className="flex gap-4">
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{ background: "#FF6B6B" }} /><span className="text-xs">Fat {fatPct}%</span></div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{ background: "#F9C74F" }} /><span className="text-xs">Carbs {carbsPct}%</span></div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{ background: "#52B788" }} /><span className="text-xs">Protein {protPct}%</span></div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{ background: "rgba(255,255,255,0.2)" }} /><span className="text-xs">Goal</span></div>
      </div>
    </div>
  );
}

export function WeeklyDigestPage() {
  const navigate = useNavigate();

  const profile = useQuery(api.profiles.getProfile);
  const stats = useQuery(api.progress.getUserStats, {});
  const [feedbackGiven, setFeedbackGiven] = useState<"up" | "down" | null>(null);
  // weekOffset: 0 = this week, -1 = last week, etc.
  const [weekOffset, setWeekOffset] = useState(-1);

  // Build date range based on weekOffset
  const today = new Date();
  // Start from the most recent Monday
  const dayOfWeek = today.getDay() === 0 ? 7 : today.getDay(); // 1=Mon … 7=Sun
  const thisWeekMonday = new Date(today);
  thisWeekMonday.setDate(today.getDate() - dayOfWeek + 1);
  thisWeekMonday.setHours(0, 0, 0, 0);

  const weekStart = new Date(thisWeekMonday);
  weekStart.setDate(thisWeekMonday.getDate() + weekOffset * 7);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const isCurrentWeek = weekOffset === 0;
  const fmtDate = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  const handlePrevWeek = () => { hapticLight(); setWeekOffset(o => o - 1); };
  const handleNextWeek = () => { if (!isCurrentWeek) { hapticLight(); setWeekOffset(o => o + 1); } };

  const calGoal = profile?.targetCalories || 2000;
  const weekCalData = [0, 0, 0, 0, 0, 0, 0]; // would be real data
  const weekCalTotal = weekCalData.reduce((a, b) => a + b, 0);
  const stepsData = [0, 0, 0, 0, 4735, 3196, 5380];
  const totalSteps = stepsData.reduce((a, b) => a + b, 0);

  return (
    <div className="pb-28 max-w-lg mx-auto animate-page-enter">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-semibold">Weekly Report</h1>
        <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
          <Calendar className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>

      {/* Week navigator */}
      <div className="flex items-center justify-between px-4 mb-4">
        <button
          onClick={handlePrevWeek}
          className="w-9 h-9 rounded-full flex items-center justify-center active:opacity-60"
          style={{ background: "rgba(255,255,255,0.08)" }}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <div className="text-sm font-semibold">
            {isCurrentWeek ? "This Week" : weekOffset === -1 ? "Last Week" : `${Math.abs(weekOffset)} Weeks Ago`}
          </div>
          <div className="text-xs text-muted-foreground">{fmtDate(weekStart)} — {fmtDate(weekEnd)}</div>
        </div>
        <button
          onClick={handleNextWeek}
          disabled={isCurrentWeek}
          className="w-9 h-9 rounded-full flex items-center justify-center active:opacity-60 disabled:opacity-25"
          style={{ background: "rgba(255,255,255,0.08)" }}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Food Insights BETA */}
      <div className="mx-4 mb-4 rounded-2xl overflow-hidden" style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold">Food Insights</span>
            <span className="text-xs px-2 py-0.5 rounded font-semibold" style={{ background: "rgba(82,183,136,0.15)", color: "#52B788" }}>BETA</span>
          </div>
        </div>
        <div className="px-4 py-3">
          <div className="text-xs text-muted-foreground mb-3">This week you logged:</div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {FOOD_CATEGORIES.map((cat, i) => (
              <div key={i} className="flex flex-col items-center flex-shrink-0 w-16 gap-1">
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl" style={{ background: "rgba(255,255,255,0.06)" }}>
                  {cat.emoji}
                </div>
                <div className="text-xs text-center leading-tight" style={{ color: "rgba(255,255,255,0.5)" }}>{cat.label}</div>
              </div>
            ))}
          </div>
          <div className="text-xs text-muted-foreground mt-3">More on the way</div>
          <div className="flex items-center gap-4 mt-3">
            <span className="text-xs">Are food insights helpful?</span>
            <button onClick={() => { hapticLight(); setFeedbackGiven("up"); }}
              className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: feedbackGiven === "up" ? "#52B788" : "var(--border)" }}>
              <ThumbsUp className="w-3.5 h-3.5" style={{ color: feedbackGiven === "up" ? "#000" : "rgba(255,255,255,0.5)" }} />
            </button>
            <button onClick={() => { hapticLight(); setFeedbackGiven("down"); }}
              className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: feedbackGiven === "down" ? "#ef4444" : "var(--border)" }}>
              <ThumbsDown className="w-3.5 h-3.5" style={{ color: feedbackGiven === "down" ? "#fff" : "rgba(255,255,255,0.5)" }} />
            </button>
          </div>
        </div>
      </div>

      {/* Week At A Glance */}
      <div className="mx-4 mb-4 rounded-2xl p-4" style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}>
        <h3 className="text-sm font-bold mb-3">Week At A Glance</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col items-center gap-1">
            <Target className="w-5 h-5" style={{ color: "#52B788" }} />
            <div className="text-xs text-center text-muted-foreground">Weekly Calorie Goal</div>
            <div className="text-sm font-bold">{(calGoal * 7).toLocaleString()}</div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-xl">🍽️</span>
            <div className="text-xs text-center text-muted-foreground">Calories Logged</div>
            <div className="text-sm font-bold">{weekCalTotal.toLocaleString()}</div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Flame className="w-5 h-5" style={{ color: "#F9C74F" }} />
            <div className="text-xs text-center text-muted-foreground">Calories Burned</div>
            <div className="text-sm font-bold">0</div>
          </div>
        </div>
      </div>

      {/* Weekly Summary chart */}
      <div className="mx-4 mb-4 rounded-2xl p-4" style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}>
        <h3 className="text-sm font-bold mb-3">Calories</h3>
        <WeekBarChart data={weekCalData} goal={calGoal} color="#52B788" />
        <div className="flex items-center gap-2 mt-3">
          <div className="w-6 border-t-2 border-dashed" style={{ borderColor: "#52B788" }} />
          <span className="text-xs text-muted-foreground">Calorie Goal ({calGoal})</span>
        </div>
      </div>



      {/* Frequently Logged Foods */}
      <div className="mx-4 mb-4 rounded-2xl p-4" style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}>
        <h3 className="text-sm font-bold mb-3">Frequently Logged Foods</h3>
        <div className="text-sm text-muted-foreground italic">You didn't log any foods this week.</div>
      </div>

      {/* Macronutrients */}
      <div className="mx-4 mb-4 rounded-2xl p-4" style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}>
        <h3 className="text-sm font-bold mb-3">Macronutrients</h3>
        <MacroStackedBar carbsPct={0} fatPct={0} protPct={0} />
      </div>

      {/* Exercise And Steps */}
      <div className="mx-4 mb-4 rounded-2xl p-4" style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}>
        <h3 className="text-sm font-bold mb-3">Exercise And Steps</h3>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)" }}>
            <Dumbbell className="w-4 h-4 mb-1" style={{ color: "#52B788" }} />
            <div className="text-xs text-muted-foreground">Exercise</div>
            <div className="text-base font-bold">0</div>
          </div>
          <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)" }}>
            <Footprints className="w-4 h-4 mb-1" style={{ color: "#52B788" }} />
            <div className="text-xs text-muted-foreground">Steps</div>
            <div className="text-base font-bold">{totalSteps.toLocaleString()}</div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-4 text-sm">
          <div><div className="text-xs text-muted-foreground">Weekly Step Goal</div><div className="font-semibold">70,000</div></div>
          <div><div className="text-xs text-muted-foreground">Total Steps</div><div className="font-semibold">{totalSteps.toLocaleString()}</div></div>
          <div><div className="text-xs text-muted-foreground">Steps Cals Burned</div><div className="font-semibold">{Math.round(totalSteps * 0.04)}</div></div>
        </div>
        <WeekBarChart data={stepsData} goal={10000} color="#ef4472" />
        <div className="flex items-center gap-2 mt-2">
          <div className="w-6 border-t-2 border-dashed" style={{ borderColor: "#ef4444" }} />
          <span className="text-xs text-muted-foreground">Goal (10,000 Steps)</span>
        </div>
      </div>

      {/* All-Time Stats */}
      <div className="mx-4 mb-4 rounded-2xl p-4" style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}>
        <h3 className="text-sm font-bold mb-3">All-Time Stats</h3>
        <div className="grid grid-cols-2 gap-y-3">
          {[
            { label: "Member since", value: profile ? new Date((profile as any).createdAt || Date.now()).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "--" },
            { label: "Foods Logged", value: stats?.totalMealsLogged || 0 },
            { label: "Meals Logged", value: 0 },
            { label: "Exercises Logged", value: 1 },
            { label: "Steps Logged", value: totalSteps.toLocaleString() },
          ].map(s => (
            <div key={s.label}>
              <div className="text-xs text-muted-foreground">{s.label}</div>
              <div className="text-sm font-semibold">{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Keep It Up streak */}
      <div className="mx-4 mb-4 rounded-2xl p-4" style={{ background: "rgba(82,183,136,0.08)", border: "1px solid rgba(82,183,136,0.2)" }}>
        <div className="flex items-center gap-2 mb-2">
          <Flame className="w-5 h-5" style={{ color: "#52B788" }} />
          <span className="text-sm font-bold">Keep It Up!</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Continue to log in every day this week to take your streak to{" "}
          <span style={{ color: "#52B788" }} className="font-semibold">
            {(stats?.currentStreak || 0) + 1} days!
          </span>
        </p>
      </div>
    </div>
  );
}
