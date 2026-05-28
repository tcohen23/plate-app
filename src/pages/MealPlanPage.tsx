/**
 * MealPlanPage — "Plan" tab
 * Redesign: MFP-psychology layout
 * - Horizontal day strip with locked state for free users
 * - Day macro summary bar at top of day
 * - Meal cards with emoji, slot label, macros, swap/skip
 * - Crown upsell for locked days
 * - Floating grocery button
 */
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  RefreshCw, ListChecks, Clock, Flame, SkipForward,
  CheckCircle2, Loader2, CheckCheck, ChevronRight, Dumbbell,
  X, ChevronDown, ChevronUp, HelpCircle, AlertTriangle, Crown,
} from "lucide-react";
import { usePremiumAccess } from "@/components/PremiumGate";
import { PaywallModal } from "@/components/PaywallModal";
import { toast } from "sonner";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { getLocalDateString } from "@/lib/dateUtils";
import { hapticMedium, hapticLight } from "@/lib/haptics";

const SHORT_DAYS: Record<string, string> = {
  Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed",
  Thursday: "Thu", Friday: "Fri", Saturday: "Sat", Sunday: "Sun",
};

function seededRandom(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  let s = h >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) | 0;
    return ((s >>> 0) / 4294967296);
  };
}

function getFreeDayIndices(userId: string, numDays: number): Set<number> {
  const now = new Date();
  const jan4 = new Date(now.getFullYear(), 0, 4);
  const isoWeek = Math.ceil(((now.getTime() - jan4.getTime()) / 86400000 + jan4.getDay() + 1) / 7);
  const seed = `${userId}:w${now.getFullYear()}:${isoWeek}`;
  const rand = seededRandom(seed);
  const indices = Array.from({ length: numDays }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return new Set(indices.slice(0, 2));
}

const dietStyleNames: Record<string, string> = {
  high_protein: "High Protein", med_high_protein: "Med High Protein", moderate_protein: "Moderate Protein",
  low_protein: "Low Protein", balanced: "Balanced", low_carb: "Low Carb", high_carb: "High Carb",
  low_fat: "Low Fat", keto: "Keto", carnivore: "Carnivore", mediterranean: "Mediterranean",
  paleo: "Paleo", whole30: "Whole30", iifym: "IIFYM / Flexible", vegan: "Vegan",
  vegetarian: "Vegetarian", pescatarian: "Pescatarian",
};

const wySources = [
  "Mifflin MD, St Jeor ST, et al. A new predictive equation for resting energy expenditure in healthy individuals. Am J Clin Nutr. 1990;51(2):241-7.",
  "Jäger R, et al. International Society of Sports Nutrition Position Stand: protein and exercise. J Int Soc Sports Nutr. 2017;14:20.",
  "Schoenfeld BJ, Aragon AA. How much protein can the body use in a single meal for muscle building? J Int Soc Sports Nutr. 2018;15:10.",
  "Frankenfield D, et al. Comparison of predictive equations for resting metabolic rate. J Am Diet Assoc. 2005;105(5):775-89.",
  "2020 to 2025 Dietary Guidelines for Americans, USDA/HHS.",
];

function WhyCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-4 space-y-2" style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}>
      <h3 className="text-sm font-semibold leading-snug">{title}</h3>
      {children}
    </div>
  );
}

function WhyModal({ profile, onClose }: { profile: any; onClose: () => void }) {
  const generateWhyExplanation = useAction(api.viktorTools.generateWhyExplanation);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState<{
    calorie: string; macros: string; diet: string; hydration: string; meals: string; floorNote?: string;
  } | null>(null);

  const cals = profile.targetCalories || 0;
  const protein = profile.targetProtein || 0;
  const carbs = profile.targetCarbs || 0;
  const fat = profile.targetFat || 0;
  const dietName = dietStyleNames[profile.dietPreference || "balanced"] || "Balanced";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await generateWhyExplanation({
          profile: {
            name: profile.name, age: profile.age,
            gender: profile.gender || profile.sex || "other",
            height: profile.height, weight: profile.weight,
            activityLevel: profile.activityLevel, goal: profile.goal,
            dietPreference: profile.dietPreference, bmr: profile.bmr, tdee: profile.tdee,
            targetCalories: profile.targetCalories, targetProtein: profile.targetProtein,
            targetCarbs: profile.targetCarbs, targetFat: profile.targetFat,
            proteinGkg: profile.proteinGkg, calorieFloorActivated: profile.calorieFloorActivated,
            usesGlp1: profile.usesGlp1, hydrationTarget: profile.hydrationTarget,
            hydrationMl: profile.hydrationMl, mealStructure: profile.mealStructure,
          },
        });
        if (!cancelled) setContent(result as any);
      } catch { /* silently fall through */ }
      finally { if (!cancelled) setLoading(false); }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl flex flex-col"
        style={{ background: "var(--background)", maxHeight: "88vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
          <div className="w-10 h-1 rounded-full absolute left-1/2 -translate-x-1/2 top-3" style={{ background: "rgba(255,255,255,0.15)" }} />
          <h2 className="text-lg font-serif">Why these numbers?</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.08)" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 pb-8 space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">Every number in your plan comes from real math on your real body.</p>

          {profile.calorieFloorActivated && (
            <div className="rounded-xl px-4 py-3 flex items-start gap-3" style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.25)" }}>
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#F5A623" }} />
              <p className="text-sm leading-relaxed" style={{ color: "var(--foreground)" }}>
                Your goal has been adjusted to a safer minimum. For faster fat loss, increase your activity level instead of dropping calories further.
              </p>
            </div>
          )}

          <div className="rounded-xl p-4 space-y-3" style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}>
            <div className="flex rounded-lg overflow-hidden h-2.5">
              {cals > 0 && (
                <>
                  <div style={{ width: `${Math.round((protein * 4 / cals) * 100)}%`, background: "#4A9EFF" }} />
                  <div style={{ width: `${Math.round((carbs * 4 / cals) * 100)}%`, background: "#F5A623" }} />
                  <div style={{ width: `${Math.round((fat * 9 / cals) * 100)}%`, background: "#FF6B6B" }} />
                </>
              )}
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div><div className="text-xs font-bold">{cals}</div><div className="text-[10px] text-muted-foreground">kcal</div></div>
              <div><div className="text-xs font-bold" style={{ color: "#4A9EFF" }}>{protein}g</div><div className="text-[10px] text-muted-foreground">protein</div></div>
              <div><div className="text-xs font-bold" style={{ color: "#F5A623" }}>{carbs}g</div><div className="text-[10px] text-muted-foreground">carbs</div></div>
              <div><div className="text-xs font-bold" style={{ color: "#FF6B6B" }}>{fat}g</div><div className="text-[10px] text-muted-foreground">fat</div></div>
            </div>
          </div>

          {loading && (
            <div className="flex flex-col items-center py-10 gap-3">
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#52B788" }} />
              <p className="text-sm text-muted-foreground">Generating your personalized breakdown…</p>
            </div>
          )}

          {!loading && content && (
            <>
              <WhyCard title={`Your daily target: ${cals} kcal`}>
                <p className="text-sm text-muted-foreground leading-relaxed">{content.calorie}</p>
              </WhyCard>
              <WhyCard title={`Macros: ${protein}g protein · ${carbs}g carbs · ${fat}g fat`}>
                <p className="text-sm text-muted-foreground leading-relaxed">{content.macros}</p>
              </WhyCard>
              <WhyCard title={`Why ${dietName}`}>
                <p className="text-sm text-muted-foreground leading-relaxed">{content.diet}</p>
              </WhyCard>
              <WhyCard title={`Hydration: ${profile.hydrationTarget || 8} glasses`}>
                <p className="text-sm text-muted-foreground leading-relaxed">{content.hydration}</p>
              </WhyCard>
              <WhyCard title="Spreading your meals">
                <p className="text-sm text-muted-foreground leading-relaxed">{content.meals}</p>
              </WhyCard>
            </>
          )}

          {!loading && !content && (
            <div className="text-center py-8 text-sm text-muted-foreground">Could not load explanation. Please try again.</div>
          )}

          <div className="rounded-xl overflow-hidden" style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}>
            <button
              onClick={() => setSourcesOpen(!sourcesOpen)}
              className="w-full p-4 flex items-center justify-between text-sm font-medium"
            >
              <span>Sources</span>
              {sourcesOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
            </button>
            {sourcesOpen && (
              <div className="px-4 pb-4 space-y-2">
                {wySources.map((src, i) => (
                  <p key={i} className="text-xs text-muted-foreground leading-relaxed">{i + 1}. {src}</p>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN MEAL PLAN PAGE
   ═══════════════════════════════════════════════════ */
export function MealPlanPage() {
  const navigate = useNavigate();
  const localDate = useMemo(() => getLocalDateString(), []);
  const hasPremium = usePremiumAccess();
  const planData = useQuery(api.mealPlans.getPlanWithMeals);
  const syncStatus = useQuery(api.grocery.getGrocerySyncStatus);
  const profile = useQuery(api.profiles.getProfile);
  const generatePlan = useMutation(api.mealPlans.generatePlan);
  const swapMeal = useMutation(api.mealPlans.swapMeal);
  const skipMeal = useMutation(api.mealPlans.skipMeal);
  const regenStatus = useQuery(api.mealPlans.getWeeklyRegenStatus);
  const todaysLog = useQuery(api.foodLogs.getTodaysLog, { localDate });

  const [selectedDay, setSelectedDay] = useState(-1);
  const [swapping, setSwapping] = useState<{ dayIdx: number; mealIdx: number } | null>(null);
  const [paywallFeature, setPaywallFeature] = useState<"meal_plan" | "workout" | "grocery" | null>(null);
  const [showWhy, setShowWhy] = useState(false);

  const plan = planData?.plan;
  const mealsMap = planData?.mealsMap || {};

  const todayName = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const todayISO = new Date().toISOString().split("T")[0];
  const todayIdx = plan?.days?.findIndex(
    (d: any) => d.dayName === todayName || d.date === todayISO
  ) ?? 0;
  const activeDay = selectedDay >= 0 ? selectedDay : todayIdx;

  const userId = (profile as any)?._id?.toString() || "anon";
  const numDays = plan?.days?.length ?? 7;
  const freeDayIndices = useMemo(() => getFreeDayIndices(userId, numDays), [userId, numDays]);
  const isDayUnlocked = (dayIdx: number) => hasPremium || freeDayIndices.has(dayIdx);

  const prevSyncRef = useRef<any>(null);
  useEffect(() => {
    const prev = prevSyncRef.current;
    if (prev && syncStatus) {
      if (!prev.inSync && syncStatus.inSync && syncStatus.hasGrocery) {
        const added = (syncStatus as any)?.lastSyncAdded as string[] | undefined;
        const removed = (syncStatus as any)?.lastSyncRemoved as string[] | undefined;
        const parts: string[] = [];
        if (removed && removed.length > 0) parts.push(`${removed.length} removed`);
        if (added && added.length > 0) parts.push(`${added.length} added`);
        const detail = parts.length > 0 ? ` · ${parts.join(" · ")}` : "";
        toast.success(`Grocery list updated${detail}`, { duration: 3000, icon: "✓" });
      }
    }
    prevSyncRef.current = syncStatus;
  }, [syncStatus]);

  const isFreeUser = (regenStatus as any)?.isFree === true;
  const regenLeft = (regenStatus as any)?.regenLeft ?? null;
  const regenBlocked = isFreeUser && regenLeft !== null && regenLeft <= 0;

  const loggedMealIds = new Set<string>(
    (todaysLog || [])
      .filter((l: any) => l.mealId)
      .map((l: any) => l.mealId.toString())
  );

  const handleGenerate = async () => {
    if (regenBlocked) {
      toast.error("You've used your 2 free regenerations this week. Upgrade for unlimited.");
      return;
    }
    try {
      await generatePlan({});
      const left = regenLeft !== null ? regenLeft - 1 : null;
      const msg = isFreeUser && left !== null
        ? `New meal plan generated ✨  (${Math.max(0, left)} regen${Math.max(0, left) === 1 ? "" : "s"} left this week)`
        : "New meal plan generated ✨";
      toast.success(msg);
    } catch (e: any) {
      if (e.message?.startsWith("REGEN_LIMIT_REACHED")) {
        toast.error("You've used your 2 free regenerations this week. Upgrade for unlimited.");
      } else {
        toast.error(e.message);
      }
    }
  };

  const handleSwap = async (dayIdx: number, mealIdx: number) => {
    if (regenBlocked) {
      toast.error("You've used your 2 free regenerations this week. Upgrade for unlimited.");
      return;
    }
    setSwapping({ dayIdx, mealIdx });
    try {
      const newMeal = await swapMeal({ dayIndex: dayIdx, mealIndex: mealIdx });
      const left = regenLeft !== null ? regenLeft - 1 : null;
      const suffix = isFreeUser && left !== null
        ? `  (${Math.max(0, left)} regen${Math.max(0, left) === 1 ? "" : "s"} left this week)`
        : "";
      toast.success(`Swapped to ${(newMeal as any).name}${suffix}`);
    } catch (e: any) {
      if (e.message?.startsWith("REGEN_LIMIT_REACHED")) {
        toast.error("You've used your 2 free regenerations this week. Upgrade for unlimited.");
      } else {
        toast.error(e.message);
      }
    } finally { setSwapping(null); }
  };

  const handleSkip = async (dayIdx: number, mealIdx: number, isSkipped: boolean) => {
    try {
      await skipMeal({ dayIndex: dayIdx, mealIndex: mealIdx });
      toast(isSkipped ? "Meal restored" : "Meal skipped", { duration: 1500 });
    } catch (e: any) { toast.error(e.message); }
  };

  const handleOpenWhy = useCallback(() => { hapticMedium(); setShowWhy(true); }, []);

  if (!plan) {
    return (
      <div className="px-5 pt-12 max-w-lg mx-auto text-center space-y-5">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto" style={{ background: "var(--surface-card)" }}>
          <span className="text-3xl">🍽</span>
        </div>
        <h1 className="text-2xl font-serif">No plan yet</h1>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">Generate your personalized 7-day meal plan based on your goals and preferences.</p>
        <Button onClick={handleGenerate} size="lg" className="rounded-full px-8 mt-4">
          <RefreshCw className="w-4 h-4 mr-2" /> Generate Plan
        </Button>
      </div>
    );
  }

  const currentDay = plan.days[activeDay];
  let dayCalories = 0, dayProtein = 0, dayCarbs = 0, dayFat = 0;
  if (currentDay) {
    for (const m of currentDay.meals) {
      if (m.skipped) continue;
      const md = m.mealId ? mealsMap[m.mealId] : null;
      if (md) {
        dayCalories += md.calories;
        dayProtein += md.protein;
        dayCarbs += md.carbs;
        dayFat += md.fat;
      }
    }
  }
  const currentDayLocked = !isDayUnlocked(activeDay);

  return (
    <div className="px-4 pt-4 pb-24 max-w-lg md:max-w-2xl lg:max-w-5xl mx-auto space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">7-Day Plan</h1>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={() => { hapticMedium(); if (!hasPremium) { setPaywallFeature("workout"); return; } navigate("/workout"); }}
            className="h-8 rounded-full text-xs px-3 font-semibold gap-1"
            variant="outline"
          >
            {!hasPremium && <Crown className="w-2.5 h-2.5" style={{ color: "var(--plate-gold)" }} />}
            <Dumbbell className="w-3 h-3" /> Workout
          </Button>
          {regenBlocked ? (
            <Button
              size="sm"
              onClick={() => navigate("/upgrade")}
              className="h-8 rounded-full text-xs px-3"
              style={{ background: "var(--plate-green-accent)", color: "#0a1a0a", border: "none" }}
            >
              ✨ Upgrade
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={handleGenerate} className="h-8 rounded-full text-xs px-3 gap-1">
              <RefreshCw className="w-3 h-3" /> Regen
            </Button>
          )}
        </div>
      </div>

      {/* Grocery sync indicator */}
      {syncStatus?.hasGrocery && !(syncStatus as any).inSync && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "rgba(245,166,35,0.08)", border: "1px solid rgba(245,166,35,0.2)" }}>
          <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "#F5A623" }} />
          <span className="text-xs" style={{ color: "#F5A623" }}>Updating grocery list…</span>
        </div>
      )}

      {/* Day strip */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {plan.days.map((day: any, i: number) => {
          const isToday = i === todayIdx;
          const isActive = activeDay === i;
          const unlocked = isDayUnlocked(i);
          const shortName = SHORT_DAYS[day.dayName] || day.dayName.slice(0, 3);
          return (
            <button
              key={i}
              onClick={() => {
                hapticLight();
                if (!unlocked) { setPaywallFeature("meal_plan"); return; }
                setSelectedDay(i);
              }}
              className="flex-shrink-0 flex flex-col items-center justify-center gap-0.5 w-12 h-14 rounded-2xl relative transition-all"
              style={
                isActive && unlocked
                  ? { background: "var(--plate-green-deep)", border: "1px solid rgba(82,183,136,0.3)" }
                  : isToday && unlocked
                  ? { background: "rgba(82,183,136,0.08)", border: "1px solid rgba(82,183,136,0.2)" }
                  : !unlocked
                  ? { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }
                  : { background: "var(--surface-card)", border: "1px solid var(--border)" }
              }
            >
              {!unlocked && (
                <Crown className="w-2.5 h-2.5 absolute top-1.5 right-1.5" style={{ color: "var(--plate-gold, #E5B454)" }} />
              )}
              <span
                className="text-[10px] font-semibold uppercase tracking-wide"
                style={{ color: isActive && unlocked ? "#52B788" : unlocked ? "var(--muted-foreground)" : "#444" }}
              >
                {shortName}
              </span>
              <span
                className="text-sm font-bold"
                style={{ color: isActive && unlocked ? "#52B788" : unlocked ? "var(--foreground)" : "#333" }}
              >
                {i + 1}
              </span>
            </button>
          );
        })}
      </div>

      {/* Free banner */}
      {!hasPremium && (
        <button
          onClick={() => { hapticMedium(); setPaywallFeature("meal_plan"); }}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all active:scale-[0.98]"
          style={{ background: "rgba(229,180,84,0.06)", border: "1px solid rgba(229,180,84,0.2)" }}
        >
          <Crown className="w-4 h-4 flex-shrink-0" style={{ color: "var(--plate-gold, #E5B454)" }} />
          <div className="flex-1">
            <p className="text-xs font-semibold" style={{ color: "var(--plate-gold, #E5B454)" }}>5 days locked</p>
            <p className="text-xs text-muted-foreground">Start your free trial to unlock all 7 days</p>
          </div>
          <span className="text-xs font-bold" style={{ color: "var(--plate-gold, #E5B454)" }}>Unlock →</span>
        </button>
      )}

      {/* Locked day */}
      {currentDayLocked ? (
        <div
          className="rounded-2xl flex flex-col items-center justify-center py-16 px-6 text-center relative overflow-hidden cursor-pointer"
          style={{ background: "var(--surface-card)", border: "1px solid var(--border)", minHeight: 280 }}
          onClick={() => { hapticMedium(); setPaywallFeature("meal_plan"); }}
        >
          <div className="absolute inset-0 flex flex-col gap-3 p-5" style={{ filter: "blur(6px)", opacity: 0.2, pointerEvents: "none" }}>
            {[1, 2, 3].map(n => (
              <div key={n} className="rounded-xl p-4" style={{ background: "var(--surface-overlay)", height: 72 }} />
            ))}
          </div>
          <div className="relative z-10 flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "rgba(229,180,84,0.15)" }}>
              <Crown className="w-7 h-7" style={{ color: "var(--plate-gold, #E5B454)" }} />
            </div>
            <div>
              <p className="text-base font-semibold">This day is locked</p>
              <p className="text-sm text-muted-foreground mt-1">Upgrade to unlock all 7 days</p>
            </div>
            <button
              className="px-6 py-2.5 rounded-full text-sm font-bold"
              style={{ background: "var(--plate-gold, #E5B454)", color: "#0a0a0a" }}
            >
              Start Free Trial
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Day macro summary */}
          {currentDay && (
            <div className="rounded-2xl p-4" style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}>
              <div className="grid grid-cols-4 gap-3 text-center">
                <div className="flex flex-col items-center">
                  <div className="text-xs text-muted-foreground mb-1">kcal</div>
                  <div className="text-sm font-bold">{Math.round(dayCalories)}</div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="text-xs text-muted-foreground mb-1">protein</div>
                  <div className="text-sm font-bold" style={{ color: "#4A9EFF" }}>{Math.round(dayProtein)}g</div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="text-xs text-muted-foreground mb-1">carbs</div>
                  <div className="text-sm font-bold" style={{ color: "#F5A623" }}>{Math.round(dayCarbs)}g</div>
                </div>
                <div className="flex flex-col items-center">
                  <div className="text-xs text-muted-foreground mb-1">fat</div>
                  <div className="text-sm font-bold" style={{ color: "#FF6B6B" }}>{Math.round(dayFat)}g</div>
                </div>
              </div>
              <div className="flex justify-center mt-3">
                <button
                  onClick={handleOpenWhy}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                  style={{ background: "rgba(82,183,136,0.1)", color: "#52B788", border: "1px solid rgba(82,183,136,0.2)" }}
                >
                  <HelpCircle className="w-3 h-3" /> Why these numbers?
                </button>
              </div>
            </div>
          )}

          {/* Meal cards */}
          {currentDay && (
            <div className="space-y-3">
              {currentDay.meals.map((meal: any, mealIdx: number) => {
                const mealData = meal.mealId ? mealsMap[meal.mealId] : null;
                if (!mealData) return null;
                const isSwapping = swapping?.dayIdx === activeDay && swapping?.mealIdx === mealIdx;
                const isSkipped = meal.skipped ?? false;
                const isLogged = activeDay === todayIdx && (meal.mealId ? loggedMealIds.has(meal.mealId.toString()) : false);
                const totalTime = ((mealData as any).prepTime || 0) + ((mealData as any).cookTime || 0);
                const difficulty = (mealData as any).difficulty;
                const imageEmoji = (mealData as any).imageEmoji as string | undefined;
                const slotLabel = meal.slot.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());

                return (
                  <div
                    key={mealIdx}
                    className="rounded-2xl p-3.5 transition-all active:scale-[0.99] cursor-pointer"
                    style={{
                      background: "var(--surface-card)",
                      border: `1px solid ${isLogged ? "rgba(82,183,136,0.3)" : "var(--border)"}`,
                      opacity: isSkipped ? 0.4 : 1,
                    }}
                    onClick={() => navigate(`/meal/${meal.mealId}`)}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                        style={{ background: "var(--surface-overlay, rgba(255,255,255,0.05))" }}
                      >
                        {imageEmoji || "🍽️"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">{slotLabel}</span>
                          {isLogged && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1" style={{ background: "rgba(82,183,136,0.12)", color: "#52B788" }}>
                              <CheckCheck className="w-2.5 h-2.5" /> Logged
                            </span>
                          )}
                          {isSkipped && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "rgba(245,166,35,0.12)", color: "#F5A623" }}>Skipped</span>
                          )}
                        </div>
                        <p
                          className="text-sm font-semibold truncate"
                          style={{
                            textDecoration: isLogged || isSkipped ? "line-through" : "none",
                            textDecorationColor: isLogged ? "#52B788" : "#F5A623",
                          }}
                        >
                          {mealData.name}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs text-muted-foreground">{Math.round(mealData.calories)} kcal</span>
                          <span className="text-xs" style={{ color: "#4A9EFF" }}>{Math.round(mealData.protein)}p</span>
                          <span className="text-xs" style={{ color: "#F5A623" }}>{Math.round(mealData.carbs)}c</span>
                          <span className="text-xs" style={{ color: "#FF6B6B" }}>{Math.round(mealData.fat)}f</span>
                          {totalTime > 0 && (
                            <span className="text-xs flex items-center gap-0.5 text-muted-foreground">
                              <Clock className="w-2.5 h-2.5" />{totalTime}m
                            </span>
                          )}
                          {difficulty && (
                            <span className="text-xs flex items-center gap-0.5 text-muted-foreground">
                              <Flame className="w-2.5 h-2.5" />{difficulty}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                        {!isLogged && (
                          <button
                            onClick={() => handleSkip(activeDay, mealIdx, isSkipped)}
                            className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90"
                            style={{ background: "var(--surface-overlay, rgba(255,255,255,0.05))" }}
                          >
                            {isSkipped
                              ? <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "#52B788" }} />
                              : <SkipForward className="w-3.5 h-3.5 text-muted-foreground" />}
                          </button>
                        )}
                        <button
                          onClick={() => regenBlocked ? navigate("/upgrade") : handleSwap(activeDay, mealIdx)}
                          disabled={isSwapping || isLogged}
                          className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 disabled:opacity-30"
                          style={{ background: "var(--surface-overlay, rgba(255,255,255,0.05))" }}
                        >
                          {regenBlocked
                            ? <Crown className="w-3.5 h-3.5" style={{ color: "var(--plate-gold, #E5B454)" }} />
                            : <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${isSwapping ? "animate-spin" : ""}`} />}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-end mt-2">
                      <span className="flex items-center gap-0.5 text-xs font-medium" style={{ color: "#52B788" }}>
                        View recipe <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Floating grocery button */}
      <button
        onClick={() => { hapticMedium(); if (!hasPremium) { setPaywallFeature("grocery"); return; } navigate("/grocery"); }}
        className="fixed bottom-24 right-5 w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-all active:scale-95 z-40"
        style={{ background: "var(--foreground)", color: "var(--background)" }}
        title="Grocery list"
      >
        <ListChecks className="w-5 h-5" />
      </button>

      <PaywallModal
        open={paywallFeature !== null}
        onClose={() => setPaywallFeature(null)}
        feature={paywallFeature ?? "general"}
      />

      {showWhy && profile && (
        <WhyModal profile={profile} onClose={() => setShowWhy(false)} />
      )}
    </div>
  );
}
