/**
 * DashboardPage — "Today" tab
 *
 * Redesign: MFP-psychology layout
 * - Prominent calorie ring (top focus) with macro breakdown below
 * - Water tracking (tap each segment = 1 glass — Tyler's tap-to-add, improved)
 * - Today's meals with log/skip/swap
 * - Streak + coach nudge card
 * - Crown/premium upsell pill in header
 */
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { trackMealPlanGenerated } from "@/lib/posthog";
import { hapticLight, hapticMedium, hapticSuccess, hapticHeavy } from "@/lib/haptics";
import {
  Flame, Plus, RefreshCw, Droplets, ChevronRight,
  Download, X, Share, MoreVertical, CheckCircle2, Clock, Share2, Crown,
} from "lucide-react";
import { useAccessLevel } from "@/components/RequireSubscription";
import { toast } from "sonner";
import { useEffect, useState, useRef, useMemo } from "react";
import { getLocalDateString } from "@/lib/dateUtils";
import { useAchievementPoller } from "@/components/AchievementPopup";
import { getDailyMessage } from "@/data/dailyMessages";
import { ShareBadgeModal } from "@/components/ShareBadgeModal";

/* ─── PWA detection ─── */
function isRunningStandalone() {
  if (window.matchMedia("(display-mode: standalone)").matches) return true;
  if ((navigator as any).standalone === true) return true;
  return false;
}

/* ─── Animated number counter ─── */
function AnimatedNumber({ value, duration = 800 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);

  useEffect(() => {
    const start = prevRef.current;
    const end = value;
    const diff = end - start;
    if (diff === 0) return;

    const startTime = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + diff * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    prevRef.current = end;
  }, [value, duration]);

  return <>{display}</>;
}

/* ─── Macro detail copy ─── */
const MACRO_DETAILS: Record<string, { unit: string; description: string; tip: string }> = {
  Calories: {
    unit: "kcal",
    description: "Calories are the total energy your body gets from food. Your daily target is calculated from your basal metabolic rate (BMR) adjusted for your activity level and goal.",
    tip: "Consistency matters more than perfection. Hitting within 100 kcal of your target most days drives results.",
  },
  Protein: {
    unit: "g",
    description: "Protein builds and repairs muscle, keeps you full, and has the highest thermic effect of all macros.",
    tip: "Prioritize protein at breakfast and lunch. It is the hardest macro to hit and the most important for body composition.",
  },
  Carbs: {
    unit: "g",
    description: "Carbohydrates are your body's preferred fuel source for workouts and brain function.",
    tip: "Time your carbs around training for best performance. Reduce later in the day if fat loss is the goal.",
  },
  Fat: {
    unit: "g",
    description: "Dietary fat supports hormone production, brain health, and absorption of vitamins A, D, E, and K.",
    tip: "Do not cut fat below 0.3g per pound of bodyweight. Low fat diets tank testosterone and slow recovery.",
  },
};

/* ─── Calorie + macro hero card ─── */
function CalorieHeroCard({
  calories, calTarget,
  protein, proteinTarget,
  carbs, carbsTarget,
  fat, fatTarget,
  onNavigateWhy,
}: {
  calories: number; calTarget: number;
  protein: number; proteinTarget: number;
  carbs: number; carbsTarget: number;
  fat: number; fatTarget: number;
  onNavigateWhy: () => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const remaining = Math.max(calTarget - calories, 0);
  const over = calories > calTarget ? calories - calTarget : 0;
  const pct = calTarget > 0 ? Math.min(calories / calTarget, 1) : 0;

  // Ring geometry
  const size = 180;
  const cx = size / 2;
  const cy = size / 2;
  const r = 76;
  const stroke = 10;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);

  // Macro bar helpers
  const macros = [
    { label: "Protein", value: protein, target: proteinTarget, color: "#4A9EFF" },
    { label: "Carbs", value: carbs, target: carbsTarget, color: "#F5A623" },
    { label: "Fat", value: fat, target: fatTarget, color: "#FF6B6B" },
  ];

  return (
    <div
      className="rounded-3xl overflow-hidden"
      style={{
        background: "var(--surface-card)",
        border: "1px solid var(--border)",
      }}
    >
      {/* Calorie ring section */}
      <div className="px-5 pt-5 pb-4 flex flex-col items-center">
        {/* Eyebrow */}
        <p className="text-xs font-medium tracking-widest uppercase mb-4" style={{ color: "var(--muted-foreground)", letterSpacing: "0.12em" }}>
          Today's Calories
        </p>

        {/* Ring */}
        <div className="relative" style={{ width: size, height: size }}>
          <svg
            viewBox={`0 0 ${size} ${size}`}
            style={{ width: size, height: size, transform: "rotate(-90deg)" }}
          >
            {/* Track */}
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
            {/* Progress */}
            <circle
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={over > 0 ? "#FF6B6B" : "var(--plate-green-accent)"}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.22,1,0.36,1), stroke 0.3s" }}
            />
          </svg>
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-0.5">
            <span
              className="leading-none"
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 38,
                fontWeight: 400,
                color: "var(--foreground)",
                letterSpacing: "-0.02em",
              }}
            >
              <AnimatedNumber value={calories} />
            </span>
            <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
              / {calTarget} kcal
            </span>
            {over > 0 ? (
              <span className="text-xs font-semibold mt-0.5" style={{ color: "#FF6B6B" }}>
                +{over} over
              </span>
            ) : (
              <span className="text-xs font-medium mt-0.5" style={{ color: "var(--plate-green-accent)" }}>
                {remaining} left
              </span>
            )}
          </div>
        </div>

        {/* Macro row: consumed / target */}
        <div className="w-full flex justify-around mt-4 pt-4" style={{ borderTop: "1px solid var(--border)" }}>
          {macros.map((m) => (
            <button
              key={m.label}
              onClick={() => { hapticLight(); setExpanded(expanded === m.label ? null : m.label); }}
              className="flex flex-col items-center gap-1 flex-1 transition-all active:scale-95"
            >
              <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: "var(--border)", maxWidth: 52 }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min((m.value / m.target) * 100, 100)}%`,
                    background: m.color,
                  }}
                />
              </div>
              <span className="text-xs font-semibold" style={{ color: m.color }}>
                {Math.round(m.value)}g
              </span>
              <span className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>
                {m.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Macro detail expansion */}
      {expanded && MACRO_DETAILS[expanded] && (
        <div
          className="mx-4 mb-4 rounded-2xl px-4 py-3.5"
          style={{
            background: "var(--surface-elevated, rgba(255,255,255,0.03))",
            border: "1px solid var(--border)",
            animation: "fadeIn 0.15s ease",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--plate-green-accent)" }}>
              {expanded}
            </span>
            <button
              onClick={() => setExpanded(null)}
              className="w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.08)" }}
            >
              <X className="w-3 h-3 text-muted-foreground" />
            </button>
          </div>
          <p className="text-xs leading-relaxed mb-2" style={{ color: "var(--foreground)" }}>
            {MACRO_DETAILS[expanded].description}
          </p>
          <p className="text-xs leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
            <span style={{ color: "var(--plate-green-accent)", fontWeight: 500 }}>Tip: </span>
            {MACRO_DETAILS[expanded].tip}
          </p>
        </div>
      )}

      {/* Why these numbers */}
      <div className="flex justify-center pb-4">
        <button
          onClick={onNavigateWhy}
          className="text-xs flex items-center gap-1 px-3 py-1.5 rounded-full transition-all active:scale-95"
          style={{ color: "var(--muted-foreground)", background: "var(--surface-elevated, rgba(255,255,255,0.04))", border: "1px solid var(--border)" }}
        >
          Why these numbers?
        </button>
      </div>
    </div>
  );
}

/* ─── Water tracker — Tyler's tap-to-add (improved) ─── */
function WaterTracker({ current, target, onLog }: {
  current: number;
  target: number;
  onLog: (n: number) => void;
}) {
  return (
    <div
      className="rounded-2xl px-4 py-4"
      style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Droplets className="w-4 h-4" style={{ color: "#4A9EFF" }} />
          <span className="text-sm font-semibold">Hydration</span>
        </div>
        <span className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
          {current} / {target} glasses
        </span>
      </div>

      {/* Tap-to-add segments */}
      <div className="flex items-center gap-1.5">
        {Array.from({ length: target }).map((_, i) => {
          const isFilled = i < current;
          return (
            <button
              key={i}
              onClick={() => { hapticLight(); onLog(i + 1); }}
              className="flex-1 rounded-full transition-all duration-200 active:scale-y-90"
              style={{
                height: 20,
                background: isFilled
                  ? "#4A9EFF"
                  : "var(--border)",
                boxShadow: isFilled ? "0 0 6px rgba(74,158,255,0.35)" : "none",
              }}
              aria-label={`Log ${i + 1} glass${i > 0 ? "es" : ""}`}
            />
          );
        })}
      </div>

      {/* Quick +1 button */}
      {current < target && (
        <button
          onClick={() => { hapticLight(); onLog(current + 1); }}
          className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all active:scale-[0.98]"
          style={{ background: "rgba(74,158,255,0.1)", color: "#4A9EFF", border: "1px solid rgba(74,158,255,0.2)" }}
        >
          <Plus className="w-3 h-3" /> Add a glass
        </button>
      )}
      {current >= target && (
        <p className="mt-2 text-center text-xs font-medium" style={{ color: "#4A9EFF" }}>
          🎉 Goal reached!
        </p>
      )}
    </div>
  );
}

/* ─── Coach card ─── */
function CoachCard({ message }: { message: string }) {
  return (
    <div
      className="rounded-2xl px-4 py-3.5 flex items-start gap-3"
      style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}
    >
      <span className="text-lg leading-none mt-0.5">💬</span>
      <p className="text-sm leading-relaxed" style={{ color: "var(--muted-foreground)" }}>{message}</p>
    </div>
  );
}

/* ─── Meal slot label ─── */
function formatSlot(slot: string) {
  const map: Record<string, string> = {
    breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner",
    snack: "Snack", "morning-snack": "Morning Snack",
    "afternoon-snack": "Afternoon Snack", "evening-snack": "Evening Snack",
  };
  return map[slot] ?? slot;
}

/* ─── Meal card ─── */
function TodayMealCard({
  meal, mealData, dayIndex, mealIndex,
  onSwap, onSkip, onNavigate, isLogged,
}: {
  meal: any; mealData: any; dayIndex: number; mealIndex: number;
  onSwap: (d: number, m: number) => void;
  onSkip: (d: number, m: number) => void;
  onNavigate: (id: string) => void;
  isLogged?: boolean;
}) {
  const isSkipped = meal.skipped ?? false;
  const totalTime = mealData ? (mealData.prepTime || 0) + (mealData.cookTime || 0) : 0;

  return (
    <div
      className="rounded-2xl p-3.5 transition-all active:scale-[0.99] cursor-pointer"
      style={{
        background: "var(--surface-card)",
        border: `1px solid ${isLogged ? "rgba(82,183,136,0.3)" : "var(--border)"}`,
        opacity: isSkipped ? 0.4 : 1,
      }}
      onClick={() => mealData && onNavigate(meal.mealId)}
    >
      <div className="flex items-center gap-3">
        {/* Emoji */}
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
          style={{ background: "var(--surface-overlay, rgba(255,255,255,0.05))" }}
        >
          {mealData?.imageEmoji || "🍽️"}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] uppercase tracking-wider font-medium" style={{ color: "var(--muted-foreground)" }}>
              {formatSlot(meal.slot)}
            </span>
            {isLogged && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1" style={{ background: "rgba(82,183,136,0.12)", color: "#52B788" }}>
                <CheckCircle2 className="w-2.5 h-2.5" /> Logged
              </span>
            )}
            {isSkipped && !isLogged && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(245,166,35,0.12)", color: "#F5A623" }}>
                Skipped
              </span>
            )}
          </div>
          <p
            className="text-sm font-semibold truncate"
            style={{
              color: "var(--foreground)",
              textDecoration: isLogged || isSkipped ? "line-through" : "none",
              textDecorationColor: isLogged ? "#52B788" : "#F5A623",
            }}
          >
            {mealData?.name || "Loading…"}
          </p>
          {mealData && (
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
                {Math.round(mealData.calories)} kcal
              </span>
              <span className="text-xs" style={{ color: "#4A9EFF" }}>{Math.round(mealData.protein)}p</span>
              <span className="text-xs" style={{ color: "#F5A623" }}>{Math.round(mealData.carbs)}c</span>
              <span className="text-xs" style={{ color: "#FF6B6B" }}>{Math.round(mealData.fat)}f</span>
              {totalTime > 0 && (
                <span className="text-xs flex items-center gap-0.5" style={{ color: "var(--muted-foreground)" }}>
                  <Clock className="w-2.5 h-2.5" />{totalTime}m
                </span>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          {!isLogged && (
            <button
              onClick={() => onSkip(dayIndex, mealIndex)}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90"
              style={{ background: "var(--surface-overlay, rgba(255,255,255,0.05))" }}
              title={isSkipped ? "Restore" : "Skip"}
            >
              {isSkipped
                ? <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "#52B788" }} />
                : <X className="w-3.5 h-3.5 text-muted-foreground" />}
            </button>
          )}
          <button
            onClick={() => onSwap(dayIndex, mealIndex)}
            disabled={isLogged}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 disabled:opacity-30"
            style={{ background: "var(--surface-overlay, rgba(255,255,255,0.05))" }}
            title={isLogged ? "Unlog first to swap" : "Swap meal"}
          >
            <RefreshCw className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Coach message logic ─── */
function getCoachMessage(consumed: any, targets: { targetCals: number; targetProtein: number }) {
  const { targetCals, targetProtein } = targets;
  const { calories, protein } = consumed;
  const pctDone = Math.round((calories / targetCals) * 100);
  const proteinLeft = Math.max(targetProtein - protein, 0);

  if (calories > targetCals * 1.1) {
    return `You've gone ${Math.round(calories - targetCals)} kcal over today. Tomorrow's a fresh start — don't let one day derail the week.`;
  }
  if (proteinLeft > targetProtein * 0.5) {
    return `Protein is still ${Math.round(proteinLeft)}g short. Prioritize a high-protein meal or snack before the day ends.`;
  }
  if (pctDone >= 90) {
    return `Almost at your target for today. Stay the course — precision over the last stretch is where results happen.`;
  }
  if (pctDone >= 75) {
    return `${pctDone}% of your calories logged. You're in a solid spot — just stay consistent through the end of the day.`;
  }
  if (pctDone >= 40) {
    return `You're through ${pctDone}% of your daily target. On pace and tracking well.`;
  }
  return "You're building a solid foundation today. Keep logging and let the numbers do the work.";
}

/* ─── Install banner ─── */
function InstallAppBanner({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <div
      className="rounded-2xl overflow-hidden mb-4"
      style={{ border: "1px solid var(--plate-green-deep)", background: "var(--surface-card)" }}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-3.5 transition-colors hover:bg-accent/10"
      >
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "var(--plate-green-deep)" }}>
          <Download className="w-4 h-4" style={{ color: "var(--plate-green-accent)" }} />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-semibold">📲 Add Plate to your home screen</p>
          <p className="text-xs text-muted-foreground">Until we're in the App Store</p>
        </div>
        <ChevronRight
          className="w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform"
          style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
        />
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3">
          <div className="rounded-xl p-3.5 space-y-2" style={{ background: "var(--surface-elevated, rgba(255,255,255,0.03))", border: "1px solid var(--border)" }}>
            <span className="text-xs font-semibold">📱 iPhone / iPad (Safari)</span>
            <ol className="space-y-1.5 text-xs text-muted-foreground">
              <li>1. Open in <strong className="text-foreground">Safari</strong></li>
              <li>2. Tap the <strong className="text-foreground">Share</strong> <Share className="w-3 h-3 inline" /> button</li>
              <li>3. Tap <strong className="text-foreground">"Add to Home Screen"</strong></li>
            </ol>
          </div>
          <div className="rounded-xl p-3.5 space-y-2" style={{ background: "var(--surface-elevated, rgba(255,255,255,0.03))", border: "1px solid var(--border)" }}>
            <span className="text-xs font-semibold">🤖 Android (Chrome)</span>
            <ol className="space-y-1.5 text-xs text-muted-foreground">
              <li>1. Open in <strong className="text-foreground">Chrome</strong></li>
              <li>2. Tap <strong className="text-foreground">⋮</strong> <MoreVertical className="w-3 h-3 inline" /></li>
              <li>3. Tap <strong className="text-foreground">"Add to Home Screen"</strong></li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Skeleton ─── */
function DashboardSkeleton() {
  return (
    <div className="px-4 pt-5 pb-6 max-w-lg mx-auto space-y-4">
      <div className="flex justify-center">
        <div className="w-44 h-44 rounded-full" style={{ background: "var(--surface-card)", animation: "pulse 1.5s ease-in-out infinite" }} />
      </div>
      <div className="h-16 rounded-2xl" style={{ background: "var(--surface-card)", animation: "pulse 1.5s ease-in-out infinite" }} />
      <div className="h-20 rounded-2xl" style={{ background: "var(--surface-card)", animation: "pulse 1.5s ease-in-out infinite" }} />
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-20 rounded-2xl" style={{ background: "var(--surface-card)", animation: "pulse 1.5s ease-in-out infinite", animationDelay: `${i * 0.1}s` }} />
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN DASHBOARD
   ═══════════════════════════════════════════════════ */
export function DashboardPage() {
  const navigate = useNavigate();
  const localDate = useMemo(() => getLocalDateString(), []);
  const profile = useQuery(api.profiles.getProfile);
  const { isPremium, isTrialing } = useAccessLevel();
  const summary = useQuery(api.foodLogs.getDailySummary, { localDate });
  const todaysLog = useQuery(api.foodLogs.getTodaysLog, { localDate });
  const planData = useQuery(api.mealPlans.getPlanWithMeals);
  const stats = useQuery(api.progress.getUserStats, { localDate });
  const hydration = useQuery(api.progress.getTodaysHydration);
  const generatePlan = useMutation(api.mealPlans.generatePlan);
  const swapMealMut = useMutation(api.mealPlans.swapMeal);
  const skipMealMut = useMutation(api.mealPlans.skipMeal);
  const logHydration = useMutation(api.progress.logHydration);
  const { check: checkAchievements, popup: achievementPopup } = useAchievementPoller();

  const showInstallBanner = !isRunningStandalone();
  const [installOpen, setInstallOpen] = useState(false);
  const [showShareBadge, setShowShareBadge] = useState(false);
  const [floorBannerDismissed, setFloorBannerDismissed] = useState(() => {
    try { return localStorage.getItem("plate_floor_banner_dismissed") === "1"; } catch { return false; }
  });

  useEffect(() => { checkAchievements(); }, []);

  if (!profile || !summary) {
    return <DashboardSkeleton />;
  }

  const targetCals = profile.targetCalories || 2000;
  const targetProtein = profile.targetProtein || 150;
  const targetCarbs = profile.targetCarbs || 200;
  const targetFat = profile.targetFat || 60;
  const consumed = summary.totals;

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  const todayDayName = today.toLocaleDateString("en-US", { weekday: "long" });
  const todayISO = today.toISOString().split("T")[0];
  const todayDayIndex = planData?.plan?.days?.findIndex(
    (d: any) => d.dayName === todayDayName || d.date === todayISO
  ) ?? -1;
  const todayPlan = todayDayIndex >= 0 ? planData?.plan?.days?.[todayDayIndex] : null;

  const currentGlasses = hydration?.glasses || 0;
  const hydrationTarget = (profile as any).hydrationTarget || 8;

  const loggedMealIds = new Set<string>(
    (todaysLog || [])
      .filter((l: any) => l.mealId)
      .map((l: any) => l.mealId.toString())
  );

  const contextMsg = getCoachMessage(consumed, { targetCals, targetProtein });
  const dailyMsg = getDailyMessage();
  const isDefaultMsg = contextMsg === "You're building a solid foundation today. Keep logging and let the numbers do the work.";
  const coachMessage = isDefaultMsg ? dailyMsg : contextMsg;

  const handleGeneratePlan = async () => {
    hapticMedium();
    try {
      await generatePlan({});
      trackMealPlanGenerated(profile?.dietPreference || "unknown", 7);
      hapticSuccess();
      toast.success("Meal plan generated ✨");
    } catch (e: any) {
      hapticHeavy();
      const msg = e?.message || "";
      if (msg.includes("enough") || msg.includes("diet") || msg.includes("preferences")) {
        toast.error(msg, { duration: 6000 });
      } else {
        toast.error("Couldn't generate your plan right now. Please try again.", { duration: 5000 });
      }
    }
  };

  const handleSwap = async (dayIndex: number, mealIndex: number) => {
    hapticLight();
    try {
      const newMeal = await swapMealMut({ dayIndex, mealIndex });
      hapticMedium();
      toast.success(`Swapped to ${(newMeal as any).name}`);
    } catch (e: any) {
      const msg = e?.message || "";
      if (msg.includes("replacement") || msg.includes("diet")) {
        toast.error(msg, { duration: 5000 });
      } else {
        toast.error("Couldn't swap this meal. Please try again.", { duration: 4000 });
      }
    }
  };

  const handleSkip = async (dayIndex: number, mealIndex: number) => {
    hapticLight();
    try {
      await skipMealMut({ dayIndex, mealIndex });
      toast("Meal updated", { duration: 1500 });
    } catch {
      toast.error("Couldn't update this meal. Please try again.");
    }
  };

  return (
    <div className="px-4 pt-4 pb-6 max-w-lg md:max-w-2xl lg:max-w-5xl mx-auto">
      {achievementPopup}

      {/* Install banner */}
      {showInstallBanner && (
        <InstallAppBanner open={installOpen} onToggle={() => setInstallOpen((o) => !o)} />
      )}

      {/* Calorie floor warning */}
      {(profile as any).calorieFloorActivated && !floorBannerDismissed && (
        <div
          className="rounded-xl px-4 py-3 text-sm flex items-start gap-3 mb-4"
          style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.25)", color: "var(--foreground)" }}
        >
          <span className="text-base leading-none mt-0.5">⚠️</span>
          <span className="flex-1">Your goal has been adjusted to a safer minimum. For faster fat loss, increase your activity level instead of dropping calories further.</span>
          <button
            onClick={() => {
              setFloorBannerDismissed(true);
              try { localStorage.setItem("plate_floor_banner_dismissed", "1"); } catch {}
            }}
            className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
            style={{ background: "rgba(251,191,36,0.2)" }}
          >
            <X className="w-3 h-3" style={{ color: "rgba(251,191,36,0.9)" }} />
          </button>
        </div>
      )}

      {/* ── Header: date + streak + premium ── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--muted-foreground)", letterSpacing: "0.1em" }}>
            {dateStr}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isTrialing && !isPremium && (
            <div
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold"
              style={{ background: "rgba(82,183,136,0.1)", color: "#52B788", border: "1px solid rgba(82,183,136,0.25)" }}
            >
              🎉 Trial
            </div>
          )}
          {!isPremium && (
            <button
              onClick={() => navigate("/onboarding/upgrade")}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all active:scale-95"
              style={{ background: "var(--plate-gold-bg)", color: "var(--plate-gold)", border: "1px solid rgba(229,180,84,0.25)" }}
            >
              <Crown className="w-2.5 h-2.5" /> Go Premium
            </button>
          )}
          {stats && stats.currentStreak > 0 && (
            <div
              className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold"
              style={{ background: "var(--plate-green-deep)", color: "var(--plate-green-accent)" }}
            >
              <Flame className="w-2.5 h-2.5" /> {stats.currentStreak}d
            </div>
          )}
          <button
            onClick={() => setShowShareBadge(true)}
            className="w-7 h-7 rounded-full flex items-center justify-center transition-opacity active:opacity-60"
            style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}
          >
            <Share2 className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* ── Responsive 2-col grid on lg ── */}
      <div className="lg:grid lg:grid-cols-2 lg:gap-8 lg:items-start space-y-4 lg:space-y-0">

        {/* LEFT COLUMN */}
        <div className="space-y-4">

          {/* Calorie hero card */}
          <CalorieHeroCard
            calories={Math.round(consumed.calories)}
            calTarget={targetCals}
            protein={Math.round(consumed.protein)}
            proteinTarget={targetProtein}
            carbs={Math.round(consumed.carbs)}
            carbsTarget={targetCarbs}
            fat={Math.round(consumed.fat)}
            fatTarget={targetFat}
            onNavigateWhy={() => navigate("/why")}
          />

          {/* Coach card */}
          <CoachCard message={coachMessage} />

          {/* Today's plan */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>Today's Plan</h2>
              <button
                onClick={() => navigate("/plan")}
                className="flex items-center gap-0.5 text-xs transition-colors active:opacity-60"
                style={{ color: "var(--muted-foreground)" }}
              >
                View all <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {todayPlan ? (
              <div className="space-y-2.5">
                {todayPlan.meals.map((meal: any, idx: number) => {
                  const mealData = meal.mealId ? planData?.mealsMap?.[meal.mealId] : null;
                  const isLogged = meal.mealId ? loggedMealIds.has(meal.mealId.toString()) : false;
                  return (
                    <TodayMealCard
                      key={idx}
                      meal={meal}
                      mealData={mealData}
                      dayIndex={todayDayIndex}
                      mealIndex={idx}
                      onSwap={handleSwap}
                      onSkip={handleSkip}
                      onNavigate={(id) => navigate(`/meal/${id}`)}
                      isLogged={isLogged}
                    />
                  );
                })}
              </div>
            ) : (
              <div
                className="p-8 text-center rounded-2xl"
                style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}
              >
                <p className="text-sm text-muted-foreground mb-4">No meal plan yet.</p>
                <Button onClick={handleGeneratePlan} size="sm" className="rounded-full px-6">
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Generate Plan
                </Button>
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-4">

          {/* Water tracker */}
          <WaterTracker
            current={currentGlasses}
            target={hydrationTarget}
            onLog={(n) => { hapticLight(); logHydration({ glasses: n }); }}
          />

          {/* Quick action buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => { hapticLight(); navigate("/track"); }}
              className="h-12 text-sm font-semibold rounded-xl active:scale-95 transition-all"
              style={{ background: "var(--plate-green-deep)", color: "var(--plate-green-accent)", border: "none" }}
            >
              <Plus className="w-4 h-4 mr-2" /> Log Food
            </Button>
            <Button
              onClick={() => { hapticLight(); navigate("/grocery"); }}
              className="h-12 text-sm font-medium rounded-xl active:scale-95 transition-all"
              variant="outline"
            >
              Grocery List
            </Button>
          </div>

          {/* Feedback / Ideas card */}
          <button
            onClick={() => { hapticLight(); navigate("/feedback"); }}
            className="w-full flex items-center gap-3 rounded-2xl px-4 py-3.5 text-left transition-all active:scale-[0.98]"
            style={{ background: "var(--surface-card)", border: "1px solid rgba(82,183,136,0.15)" }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-base"
              style={{ background: "rgba(82,183,136,0.1)" }}
            >
              💡
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">Share an idea</p>
              <p className="text-xs text-muted-foreground">What should we build next?</p>
            </div>
            <ChevronRight className="w-4 h-4" style={{ color: "rgba(82,183,136,0.5)" }} />
          </button>

        </div>

      </div>

      {/* Share badge modal */}
      {showShareBadge && stats && (
        <ShareBadgeModal
          onClose={() => setShowShareBadge(false)}
          profile={{
            name: profile.name,
            avatarChoice: (profile as any).avatarChoice,
            photoUrl: (profile as any).photoUrl,
            goal: profile.goal,
          }}
          stats={{
            level: stats.level || 1,
            xp: stats.xp || 0,
            currentStreak: stats.currentStreak || 0,
            totalMealsLogged: stats.totalMealsLogged || 0,
          }}
        />
      )}
    </div>
  );
}
