import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { trackMealPlanGenerated } from "@/lib/posthog";
import { hapticLight, hapticMedium, hapticSuccess, hapticHeavy } from "@/lib/haptics";
import {
  Flame, Plus, RefreshCw, Droplets, ChevronRight,
  Download, X, Share, MoreVertical,
  CheckCircle2, Clock, Share2, Crown,
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
    description: "Protein builds and repairs muscle, keeps you full, and has the highest thermic effect of all macros, meaning your body burns more calories digesting it.",
    tip: "Prioritize protein at breakfast and lunch. It is the hardest macro to hit and the most important for body composition.",
  },
  Carbs: {
    unit: "g",
    description: "Carbohydrates are your body's preferred fuel source for workouts and brain function. Complex carbs like oats, rice, and sweet potatoes give steady energy without blood sugar spikes.",
    tip: "Time your carbs around training for best performance. Reduce them later in the day if fat loss is the goal.",
  },
  Fat: {
    unit: "g",
    description: "Dietary fat supports hormone production, brain health, and absorption of vitamins A, D, E, and K. Healthy fats from avocado, nuts, and olive oil are essential, not optional.",
    tip: "Do not cut fat below 0.3g per pound of bodyweight. Low fat diets tank testosterone and slow recovery.",
  },
};

/* ─── Single ring unit for EditorialCalorieCard ─── */
function MacroRing({
  label, value, target, color, isSelected, onTap,
}: {
  label: string; value: number; target: number; color: string;
  isSelected: boolean; onTap: () => void;
}) {
  const size = 96;
  const cx = size / 2;
  const cy = size / 2;
  const r = 38;
  const stroke = 6;
  const pct = target > 0 ? Math.min(value / target, 1) : 0;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);

  return (
    <button
      className="flex flex-col items-center transition-transform active:scale-95"
      style={{ gap: 8, background: "none", border: "none", padding: 0, cursor: "pointer" }}
      onClick={onTap}
      aria-label={`${label} details`}
    >
      {/* Label above ring */}
      <span
        style={{
          fontFamily: "var(--font-sans)",
          fontSize: 12,
          fontWeight: isSelected ? 500 : 300,
          letterSpacing: "0.01em",
          color: isSelected ? color : "var(--muted-foreground)",
          lineHeight: 1,
          transition: "color 0.2s",
        }}
      >
        {label}
      </span>

      {/* Ring with centered value */}
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          className="w-full h-full"
          viewBox={`0 0 ${size} ${size}`}
          style={{ transform: "rotate(-90deg)" }}
        >
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--ring-track)" strokeWidth={stroke} />
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.22,1,0.36,1)" }}
          />
        </svg>
        {/* Centered text overlay */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ pointerEvents: "none" }}
        >
          <span
            style={{
              fontFamily: "var(--font-serif)",
              fontSize: label === "Calories" ? 20 : 18,
              lineHeight: 1,
              letterSpacing: "-0.01em",
              color: "var(--foreground)",
              fontWeight: 400,
            }}
          >
            <AnimatedNumber value={Math.round(value)} />
          </span>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 8,
              letterSpacing: "0.04em",
              color: "var(--muted-foreground)",
              marginTop: 3,
              lineHeight: 1,
            }}
          >
            of {target.toLocaleString()}
          </span>
        </div>
      </div>
    </button>
  );
}

/* ─── Editorial Calorie Card — 4 individual rings ─── */
function EditorialCalorieCard({
  calories, calTarget,
  protein, proteinTarget,
  carbs, carbsTarget,
  fat, fatTarget,
}: {
  calories: number; calTarget: number;
  protein: number; proteinTarget: number;
  carbs: number; carbsTarget: number;
  fat: number; fatTarget: number;
}) {
  const navigate = useNavigate();
  const [selectedMacro, setSelectedMacro] = useState<string | null>(null);

  const macros = [
    { label: "Calories", value: calories, target: calTarget,     color: "#4ade80" },
    { label: "Protein",  value: protein,  target: proteinTarget, color: "#60a5fa" },
    { label: "Carbs",    value: carbs,    target: carbsTarget,   color: "#fbbf24" },
    { label: "Fat",      value: fat,      target: fatTarget,     color: "#f87171" },
  ];

  const selectedDetail = selectedMacro ? MACRO_DETAILS[selectedMacro] : null;
  const selectedColor = selectedMacro ? macros.find(m => m.label === selectedMacro)?.color : null;

  return (
    <div
      className="relative overflow-hidden w-full"
      style={{
        background: "var(--surface-card)",
        border: "1px solid var(--border)",
        borderRadius: 24,
        padding: "24px 20px 20px",
      }}
    >
      {/* Grain texture overlay */}
      <svg
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 w-full h-full"
        style={{ opacity: 0.025, mixBlendMode: "overlay" }}
      >
        <filter id="grain-cal">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain-cal)" />
      </svg>

      {/* Eyebrow */}
      <div
        className="text-center mb-6"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--muted-foreground)",
        }}
      >
        — Today's Intake —
      </div>

      {/* 2x2 ring grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-6" style={{ justifyItems: "center" }}>
        {macros.map(m => (
          <MacroRing
            key={m.label}
            label={m.label}
            value={m.value}
            target={m.target}
            color={m.color}
            isSelected={selectedMacro === m.label}
            onTap={() => {
              hapticLight();
              setSelectedMacro(prev => prev === m.label ? null : m.label);
            }}
          />
        ))}
      </div>

      {/* Macro detail expansion */}
      {selectedDetail && selectedMacro && selectedColor && (
        <div
          className="mt-5 rounded-2xl px-4 py-4"
          style={{
            background: `color-mix(in srgb, ${selectedColor} 8%, transparent)`,
            border: `1px solid color-mix(in srgb, ${selectedColor} 25%, transparent)`,
            animation: "fadeIn 0.18s ease",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: selectedColor }}>
              {selectedMacro}
            </span>
            <button
              onClick={() => setSelectedMacro(null)}
              className="w-5 h-5 flex items-center justify-center rounded-full transition-opacity active:opacity-60"
              style={{ background: "rgba(255,255,255,0.08)" }}
              aria-label="Close"
            >
              <X className="w-3 h-3" style={{ color: "var(--muted-foreground)" }} />
            </button>
          </div>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 13, color: "var(--foreground)", lineHeight: 1.55, marginBottom: 8 }}>
            {selectedDetail.description}
          </p>
          <p style={{ fontFamily: "var(--font-sans)", fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.5 }}>
            <span style={{ color: selectedColor, fontWeight: 500 }}>Tip: </span>{selectedDetail.tip}
          </p>
        </div>
      )}

      {/* Why these numbers */}
      <div className="flex justify-center mt-5">
        <button
          onClick={() => { hapticLight(); navigate("/why"); }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium transition-all active:scale-95"
          style={{
            background: "var(--surface-overlay, rgba(255,255,255,0.06))",
            border: "1px solid var(--border)",
            color: "var(--muted-foreground)",
          }}
        >
          Why these numbers?
        </button>
      </div>
    </div>
  );
}


/* ─── Smart context coach card ─── */
function CoachCard({ message }: { message: string }) {
  return (
    <div className="context-card">
      <div className="flex items-start gap-2.5">
        <span className="text-lg mt-0.5">💬</span>
        <p className="text-body text-muted-foreground leading-relaxed">{message}</p>
      </div>
    </div>
  );
}

/* ─── Tappable meal card (Today's plan) ─── */
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
      className="meal-card animate-card-stagger"
      style={{
        opacity: isSkipped ? 0.4 : isLogged ? 0.55 : 1,
        animationDelay: `${mealIndex * 70}ms`,
      }}
      onClick={() => mealData && onNavigate(meal.mealId)}
    >
      <div className="flex items-start gap-3">
        {/* Emoji avatar */}
        <div
          className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
          style={{ background: "var(--surface-overlay)" }}
        >
          {mealData?.imageEmoji || "🍽️"}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-card-label" style={{ color: "#555" }}>{formatSlot(meal.slot)}</span>
            {isSkipped && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(245,166,35,0.15)", color: "#F5A623" }}>
                SKIPPED
              </span>
            )}
            {isLogged && !isSkipped && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: "rgba(82,183,136,0.15)", color: "#52B788" }}>
                <CheckCircle2 className="w-2.5 h-2.5" /> LOGGED
              </span>
            )}
          </div>
          <div className={`text-meal-name ${isSkipped || isLogged ? "line-through" : ""}`}
            style={isLogged && !isSkipped ? { textDecorationColor: "#52B788" } : {}}
          >
            {mealData?.name || "Loading…"}
          </div>
          {mealData && (
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <span className="macro-pill macro-pill-kcal">{Math.round(mealData.calories)} kcal</span>
              <span className="macro-pill macro-pill-protein">{Math.round(mealData.protein * 10) / 10}p</span>
              <span className="macro-pill macro-pill-carbs">{Math.round(mealData.carbs * 10) / 10}c</span>
              <span className="macro-pill macro-pill-fat">{Math.round(mealData.fat * 10) / 10}f</span>
              {totalTime > 0 && (
                <span className="cook-time-pill ml-1"><Clock className="w-3 h-3" />{totalTime}m</span>
              )}
            </div>
          )}
        </div>

        {/* Action buttons — tap meal to log/unlog from detail page */}
        <div className="flex items-center gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
          {!isLogged && (
            <button
              onClick={() => onSkip(dayIndex, mealIndex)}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground"
              style={{ background: "var(--surface-overlay)" }}
              title={isSkipped ? "Restore" : "Skip"}
            >
              {isSkipped
                ? <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "#52B788" }} />
                : <X className="w-3.5 h-3.5" />
              }
            </button>
          )}
          <button
            onClick={() => onSwap(dayIndex, mealIndex)}
            disabled={isLogged}
            className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
            style={{ background: "var(--surface-overlay)" }}
            title={isLogged ? "Unlog first to swap" : "Swap meal"}
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* View recipe hint */}
      {mealData && !isSkipped && (
        <div className="flex items-center justify-end mt-2.5">
          <span className="flex items-center gap-0.5 text-xs font-medium" style={{ color: "#52B788" }}>
            View recipe <ChevronRight className="w-3 h-3" />
          </span>
        </div>
      )}
    </div>
  );
}

function formatSlot(slot: string): string {
  return slot.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ═══════════════════════════════════════════════════
   COACH MESSAGE — human-written, time-aware
   ═══════════════════════════════════════════════════ */
function getCoachMessage(consumed: any, targets: any): string {
  const { calories, protein } = consumed;
  const hour = new Date().getHours();

  if (calories === 0) {
    if (hour < 10) return "Morning. Start with something protein-heavy and the rest of the day practically takes care of itself.";
    if (hour < 13) return "No food logged yet today. Even a quick entry keeps you honest with your numbers.";
    if (hour < 17) return "Afternoon and nothing logged. You can still finish the day strong if you're intentional from here.";
    return "Evening and the log is empty. Don't stress it — just make tomorrow count.";
  }

  const proteinLeft = Math.round(targets.targetProtein - protein);
  const calLeft = Math.round(targets.targetCals - calories);
  const pctDone = Math.round((calories / targets.targetCals) * 100);

  if (calories > targets.targetCals * 1.15) {
    return `You're ${Math.abs(calLeft)} calories over today. It happens. Reset tomorrow and keep the bigger picture in view.`;
  }
  if (protein >= targets.targetProtein && calLeft >= 0) {
    return "Protein goal locked in. That's the hardest one to hit consistently — nice work today.";
  }
  if (proteinLeft > 50 && hour >= 15) {
    return `Still need ${proteinLeft}g protein before bed. A chicken breast or a scoop of whey gets you there.`;
  }
  if (calLeft > 0 && calLeft < 250 && hour >= 17) {
    return `Only ${calLeft} calories left in your budget. A small, protein-forward snack rounds this out perfectly.`;
  }
  if (pctDone >= 75) {
    return `${pctDone}% of your calories logged. You're in a solid spot — just stay consistent through the end of the day.`;
  }
  if (pctDone >= 40) {
    return `You're through ${pctDone}% of your daily target. On pace and tracking well.`;
  }
  return "You're building a solid foundation today. Keep logging and let the numbers do the work.";
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

  useEffect(() => {
    checkAchievements();
  }, []);

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
  const hydrationTarget = profile.hydrationTarget || 8;

  // Build set of mealIds already logged today (for strikethrough on plan)
  const loggedMealIds = new Set<string>(
    (todaysLog || [])
      .filter((l: any) => l.mealId)
      .map((l: any) => l.mealId.toString())
  );

  // Coach message: context-aware for nutrition state, plus daily rotating message
  const contextMsg = getCoachMessage(consumed, { targetCals, targetProtein });
  const dailyMsg = getDailyMessage();
  // Show context message when it's personalized (not the default fallback), otherwise show daily
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
    <div className="px-5 pt-5 pb-6 max-w-lg md:max-w-2xl lg:max-w-6xl mx-auto animate-page-enter">
      {achievementPopup}
      {/* Install banner */}
      {showInstallBanner && <InstallAppBanner open={installOpen} onToggle={() => setInstallOpen(o => !o)} />}

      {/* Calorie floor activation banner — shown when aggressive cut would drop below BMR */}
      {(profile as any).calorieFloorActivated && !floorBannerDismissed && (
        <div className="rounded-xl px-4 py-3 text-sm flex items-start gap-3 mb-3" style={{ background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.3)", color: "var(--foreground)" }}>
          <span className="text-lg leading-none mt-0.5">⚠️</span>
          <span className="flex-1">Your goal has been adjusted to a safer minimum. For faster fat loss, increase your activity level instead of dropping calories further.</span>
          <button
            onClick={() => {
              setFloorBannerDismissed(true);
              try { localStorage.setItem("plate_floor_banner_dismissed", "1"); } catch {}
            }}
            className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-opacity active:opacity-60 hover:opacity-80"
            style={{ background: "rgba(251,191,36,0.2)" }}
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5" style={{ color: "rgba(251,191,36,0.9)" }} />
          </button>
        </div>
      )}

      {/* ── Date + Streak + Go Premium header ── */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-card-label text-muted-foreground">{dateStr.toUpperCase()}</div>
        </div>
        <div className="flex items-center gap-2">
          {/* Trial badge — shown only during free trial */}
          {isTrialing && (
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{
                background: "rgba(82,183,136,0.12)",
                color: "#52B788",
                border: "1px solid rgba(82,183,136,0.3)",
              }}
            >
              🎉 Trial active
            </div>
          )}
          {/* Go Premium gold pill — only for fully free users (no trial, no paid) */}
          {!isPremium && isPremium !== undefined && (
            <button
              onClick={() => navigate("/onboarding/upgrade")}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-[0.97]"
              style={{
                background: "var(--plate-gold-bg, #2A2418)",
                color: "var(--plate-gold, #E5B454)",
                border: "1px solid rgba(229,180,84,0.3)",
              }}
            >
              <Crown className="w-3 h-3" />
              Go Premium
            </button>
          )}
          {stats && stats.currentStreak > 0 && (
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold animate-streak"
              style={{ background: "var(--plate-green-deep)", color: "var(--plate-green-accent)" }}
            >
              <Flame className="w-3.5 h-3.5" />
              {stats.currentStreak} day streak
            </div>
          )}
          <button
            onClick={() => setShowShareBadge(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-opacity active:opacity-60"
            style={{ background: "var(--surface-overlay)", color: "var(--muted-foreground)" }}
          >
            <Share2 className="w-3.5 h-3.5" />
            Share
          </button>
        </div>
      </div>

      {/* ── Responsive 2-col grid on desktop ── */}
      <div className="lg:grid lg:grid-cols-2 lg:gap-8 lg:items-start space-y-6 lg:space-y-0 mt-6">
      {/* ── LEFT COLUMN ── */}
      <div className="space-y-6">

      {/* ── Editorial Calorie Card ── */}
      <EditorialCalorieCard
        calories={Math.round(consumed.calories)} calTarget={targetCals}
        protein={Math.round(consumed.protein)} proteinTarget={targetProtein}
        carbs={Math.round(consumed.carbs)} carbsTarget={targetCarbs}
        fat={Math.round(consumed.fat)} fatTarget={targetFat}
      />

      {/* ── Coach card ── */}
      <CoachCard message={coachMessage} />

      {/* ── Today's Plan ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-section-header">Today's plan</h2>
          <button
            onClick={() => navigate("/plan")}
            className="text-caption text-muted-foreground flex items-center gap-0.5 hover:text-foreground transition-colors"
          >
            View all <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {todayPlan ? (
          <div className="space-y-3">
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
          <div className="p-8 text-center rounded-2xl" style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}>
            <p className="text-body text-muted-foreground mb-4">No meal plan yet.</p>
            <Button onClick={handleGeneratePlan} size="sm" className="rounded-full px-6">
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> Generate Plan
            </Button>
          </div>
        )}
      </div>

      </div>{/* end left col */}

      {/* ── RIGHT COLUMN ── */}
      <div className="space-y-6">

      {/* ── Hydration ── */}
      <div className="rounded-2xl p-4" style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Droplets className="w-4 h-4" style={{ color: "#4A9EFF" }} />
            <span className="text-body font-medium">Hydration</span>
          </div>
          <span className="text-caption text-muted-foreground">{currentGlasses}/{hydrationTarget} glasses</span>
        </div>
        <div className="flex items-center gap-1.5">
          {Array.from({ length: hydrationTarget }).map((_, i) => (
            <button
              key={i}
              onClick={() => { hapticLight(); logHydration({ glasses: i + 1 }); }}
              className="flex-1 h-5 rounded-full transition-all duration-300 tap-scale"
              style={{ background: i < currentGlasses ? "#4A9EFF" : "var(--border)" }}
            />
          ))}
        </div>
      </div>

      {/* ── Quick Actions ── */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          onClick={() => { hapticLight(); navigate("/track"); }}
          className="h-12 text-sm font-semibold rounded-xl tap-scale"
          style={{ background: "var(--plate-green-deep)", color: "var(--plate-green-accent)", border: "none" }}
        >
          <Plus className="w-4 h-4 mr-2" /> Log Food
        </Button>
        <Button
          onClick={() => { hapticLight(); navigate("/grocery"); }}
          className="h-12 text-sm font-medium rounded-xl tap-scale"
          variant="outline"
        >
          Grocery List
        </Button>
      </div>

      {/* ── Feedback / Ideas card ── */}
      <button
        onClick={() => { hapticLight(); navigate("/feedback"); }}
        className="w-full flex items-center gap-3 rounded-2xl px-4 py-3.5 text-left transition-all active:scale-[0.98]"
        style={{ background: "#141414", border: "1px solid rgba(82,183,136,0.2)" }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-base"
          style={{ background: "rgba(82,183,136,0.12)" }}
        >
          💡
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-white">Share an idea</p>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
            What should we build next?
          </p>
        </div>
        <ChevronRight className="w-4 h-4" style={{ color: "rgba(82,183,136,0.6)" }} />
      </button>

      </div>{/* end right col */}
      </div>{/* end grid */}

      {/* Share Badge Modal */}
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

/* ═══════════════════════════════════════════════════
   INSTALL BANNER
   ═══════════════════════════════════════════════════ */
function InstallAppBanner({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <div
      className="rounded-2xl overflow-hidden border"
      style={{ borderColor: "var(--plate-green-deep)", background: "var(--background)" }}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 p-3.5 hover:bg-accent/20 transition-colors"
      >
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "var(--plate-green-deep)" }}
        >
          <Download className="w-4 h-4" style={{ color: "var(--plate-green-accent)" }} />
        </div>
        <div className="flex-1 text-left">
          <span className="text-sm font-semibold">📲 Add Plate to your home screen</span>
          <p className="text-xs text-muted-foreground">Until we're in the App Store</p>
        </div>
        <ChevronRight
          className="w-4 h-4 text-muted-foreground flex-shrink-0 transition-transform"
          style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
        />
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-3">
          <div className="bg-secondary rounded-xl p-3.5 space-y-2 border border-border/50">
            <span className="text-xs font-semibold">📱 iPhone / iPad (Safari)</span>
            <ol className="space-y-1.5 text-xs text-muted-foreground">
              <li>1. Open this page in <strong className="text-foreground">Safari</strong></li>
              <li>2. Tap the <strong className="text-foreground">Share button</strong> <Share className="w-3 h-3 inline" /> at the bottom</li>
              <li>3. Tap <strong className="text-foreground">"Add to Home Screen"</strong></li>
            </ol>
          </div>
          <div className="bg-secondary rounded-xl p-3.5 space-y-2 border border-border/50">
            <span className="text-xs font-semibold">🤖 Android (Chrome)</span>
            <ol className="space-y-1.5 text-xs text-muted-foreground">
              <li>1. Open this page in <strong className="text-foreground">Chrome</strong></li>
              <li>2. Tap <strong className="text-foreground">⋮</strong> <MoreVertical className="w-3 h-3 inline" /> in the top right</li>
              <li>3. Tap <strong className="text-foreground">"Add to Home Screen"</strong> or <strong className="text-foreground">"Install app"</strong></li>
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   SKELETON
   ═══════════════════════════════════════════════════ */
function DashboardSkeleton() {
  return (
    <div className="px-5 pt-5 pb-6 max-w-lg md:max-w-2xl lg:max-w-6xl mx-auto space-y-6">
      <div className="flex justify-center">
        <div className="w-[220px] h-[220px] rounded-full skeleton-shimmer" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="h-24 skeleton-shimmer rounded-2xl" />
        <div className="h-24 skeleton-shimmer rounded-2xl" />
        <div className="h-24 skeleton-shimmer rounded-2xl" />
      </div>
      <div className="h-16 skeleton-shimmer rounded-2xl" />
      <div className="space-y-3">
        <div className="h-24 skeleton-shimmer rounded-2xl" />
        <div className="h-24 skeleton-shimmer rounded-2xl" />
        <div className="h-24 skeleton-shimmer rounded-2xl" />
      </div>
    </div>
  );
}
