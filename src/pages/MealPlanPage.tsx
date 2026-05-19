import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { RefreshCw, ListChecks, Clock, Flame, SkipForward, CheckCircle2, Loader2, CheckCheck, ChevronRight, Dumbbell, Lock, X, ChevronDown, ChevronUp, HelpCircle, AlertTriangle } from "lucide-react";
import { usePremiumAccess } from "@/components/PremiumGate";
import { PaywallModal } from "@/components/PaywallModal";
import { toast } from "sonner";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { getLocalDateString } from "@/lib/dateUtils";
import { hapticMedium } from "@/lib/haptics";

const SHORT_DAYS: Record<string, string> = {
  Monday: "Mon", Tuesday: "Tue", Wednesday: "Wed",
  Thursday: "Thu", Friday: "Fri", Saturday: "Sat", Sunday: "Sun",
};

/**
 * Deterministic seeded random — returns a value in [0, 1) from a string seed.
 * Simple string hash → linear congruential generator.
 */
function seededRandom(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  // LCG
  let s = h >>> 0;
  return () => {
    s = (Math.imul(1664525, s) + 1013904223) | 0;
    return ((s >>> 0) / 4294967296);
  };
}

/**
 * Pick 2 unlocked day indices (0-6) for this user+week combo.
 * Stable for the entire week; reshuffles at ISO week boundary.
 */
function getFreeDayIndices(userId: string, numDays: number): Set<number> {
  const now = new Date();
  // ISO week number
  const jan4 = new Date(now.getFullYear(), 0, 4);
  const isoWeek = Math.ceil(((now.getTime() - jan4.getTime()) / 86400000 + jan4.getDay() + 1) / 7);
  const seed = `${userId}:w${now.getFullYear()}:${isoWeek}`;
  const rand = seededRandom(seed);

  // Fisher-Yates shuffle of indices then pick first 2
  const indices = Array.from({ length: numDays }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return new Set(indices.slice(0, 2));
}

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
  const [selectedDay, setSelectedDay] = useState(-1);
  const [swapping, setSwapping] = useState<{ dayIdx: number; mealIdx: number } | null>(null);
  const [paywallFeature, setPaywallFeature] = useState<"meal_plan" | "workout" | "grocery" | null>(null);
  const [showWhy, setShowWhy] = useState(false);
  const [selectedMacro, setSelectedMacro] = useState<"kcal" | "protein" | "carbs" | "fat" | null>(null);
  const plan = planData?.plan;
  const mealsMap = planData?.mealsMap || {};

  const todayName = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const todayISO = new Date().toISOString().split("T")[0];
  const todayIdx = plan?.days?.findIndex(
    (d: any) => d.dayName === todayName || d.date === todayISO
  ) ?? 0;
  const activeDay = selectedDay >= 0 ? selectedDay : todayIdx;

  const todaysLog = useQuery(api.foodLogs.getTodaysLog, { localDate });
  const loggedMealIds = new Set<string>(
    (todaysLog || [])
      .filter((l: any) => l.mealId)
      .map((l: any) => l.mealId.toString())
  );
  const groceryList = useQuery(api.grocery.getCurrentGroceryList);
  const prevSyncRef = useRef(syncStatus);

  // Compute free day indices (2 of 7) — deterministic per user+week
  const userId = (profile as any)?._id?.toString() ?? (profile as any)?.userId ?? "";
  const numDays = plan?.days?.length ?? 7;
  const freeDayIndices = useMemo(
    () => (userId ? getFreeDayIndices(userId, numDays) : new Set([0, 3])),
    [userId, numDays]
  );

  // A day is "unlocked" for free users if it's in freeDayIndices
  const isDayUnlocked = (dayIdx: number) => hasPremium || freeDayIndices.has(dayIdx);

  useEffect(() => {
    const prev = prevSyncRef.current;
    if (prev && syncStatus) {
      if (!prev.inSync && syncStatus.inSync && syncStatus.hasGrocery) {
        const added = (groceryList as any)?.lastSyncAdded as string[] | undefined;
        const removed = (groceryList as any)?.lastSyncRemoved as string[] | undefined;
        const parts: string[] = [];
        if (removed && removed.length > 0) parts.push(`${removed.length} removed`);
        if (added && added.length > 0) parts.push(`${added.length} added`);
        const detail = parts.length > 0 ? ` · ${parts.join(" · ")}` : "";
        toast.success(`Grocery list updated${detail}`, { duration: 3000, icon: "✓" });
      }
    }
    prevSyncRef.current = syncStatus;
  }, [syncStatus, groceryList]);

  const handleGenerate = async () => {
    try {
      await generatePlan({});
      toast.success("New meal plan generated ✨");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleSwap = async (dayIdx: number, mealIdx: number) => {
    setSwapping({ dayIdx, mealIdx });
    try {
      const newMeal = await swapMeal({ dayIndex: dayIdx, mealIndex: mealIdx });
      toast.success(`Swapped to ${newMeal.name}`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSwapping(null);
    }
  };

  const handleSkip = async (dayIdx: number, mealIdx: number, isSkipped: boolean) => {
    try {
      await skipMeal({ dayIndex: dayIdx, mealIndex: mealIdx });
      toast(isSkipped ? "Meal restored" : "Meal skipped", { duration: 1500 });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleWorkoutClick = () => {
    hapticMedium();
    if (!hasPremium) {
      setPaywallFeature("workout");
      return;
    }
    navigate("/workout");
  };

  const handleGroceryClick = () => {
    hapticMedium();
    if (!hasPremium) {
      setPaywallFeature("grocery");
      return;
    }
    navigate("/grocery");
  };

  const handleOpenWhy = useCallback(() => {
    hapticMedium();
    setShowWhy(true);
  }, []);

  const handleDaySelect = (dayIdx: number) => {
    hapticMedium();
    if (!isDayUnlocked(dayIdx)) {
      setPaywallFeature("meal_plan");
      return;
    }
    setSelectedDay(dayIdx);
  };

  if (!plan) {
    return (
      <div className="px-5 pt-12 max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto text-center space-y-5">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <span className="text-3xl">🍽</span>
        </div>
        <h1 className="text-3xl font-serif">No plan yet</h1>
        <p className="text-muted-foreground max-w-xs mx-auto">Generate your personalized 7-day meal plan based on your goals and preferences.</p>
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

  // Is the currently selected day locked for this user?
  const currentDayLocked = !isDayUnlocked(activeDay);

  return (
    <div className="px-5 pt-5 pb-6 max-w-lg md:max-w-2xl lg:max-w-6xl mx-auto space-y-5 relative">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-serif">7-day plan</h1>
        <div className="flex items-center gap-2">
          {/* Workout Plan button */}
          <Button
            size="sm"
            onClick={handleWorkoutClick}
            className="h-9 rounded-full text-xs px-4 font-semibold"
            style={
              hasPremium
                ? { background: "transparent", border: "1px solid var(--border)", color: "var(--foreground)" }
                : { background: "var(--plate-green-accent)", color: "#0a1a0a" }
            }
          >
            {!hasPremium && <Lock className="w-3 h-3 mr-1" />}
            <Dumbbell className="w-3.5 h-3.5 mr-1" /> Workout
          </Button>
          <Button size="sm" variant="outline" onClick={handleGenerate} className="h-9 rounded-full text-xs px-4">
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Regenerate
          </Button>
        </div>
      </div>

      {/* Grocery sync indicator */}
      {syncStatus?.hasGrocery && !syncStatus.inSync && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "rgba(245,166,35,0.08)", border: "1px solid rgba(245,166,35,0.2)" }}>
          <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "#F5A623" }} />
          <span className="text-xs" style={{ color: "#F5A623" }}>Updating grocery list…</span>
        </div>
      )}

      {/* Day selector strip */}
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        {plan.days.map((day: any, i: number) => {
          const isToday = i === todayIdx;
          const isActive = activeDay === i;
          const unlocked = isDayUnlocked(i);
          const shortName = SHORT_DAYS[day.dayName] || day.dayName.slice(0, 3);

          return (
            <button
              key={i}
              onClick={() => handleDaySelect(i)}
              className="day-chip flex-shrink-0 relative"
              style={
                isActive && unlocked
                  ? { background: "#1B4332", color: "#52B788", border: "1px solid rgba(82,183,136,0.25)" }
                  : isToday && unlocked
                  ? { background: "rgba(82,183,136,0.08)", color: "#F0F0F0", border: "1px solid rgba(82,183,136,0.2)" }
                  : !unlocked
                  ? { background: "rgba(255,255,255,0.04)", color: "#333", border: "1px solid rgba(255,255,255,0.06)" }
                  : { background: "transparent", color: "#555", border: "1px solid transparent" }
              }
            >
              {!unlocked && (
                <Lock className="w-2.5 h-2.5 absolute top-1 right-1" style={{ color: "#444" }} />
              )}
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase" }}>{shortName}</span>
              <span className="day-chip-number">{i + 1}</span>
            </button>
          );
        })}
      </div>

      {/* Free tier "unlock the rest" banner */}
      {!hasPremium && (
        <button
          onClick={() => { hapticMedium(); setPaywallFeature("meal_plan"); }}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left"
          style={{ background: "rgba(82,183,136,0.06)", border: "1px solid rgba(82,183,136,0.15)" }}
        >
          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "var(--plate-green-deep)" }}>
            <Lock className="w-4 h-4" style={{ color: "var(--plate-green-accent)" }} />
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold" style={{ color: "var(--plate-green-accent)" }}>5 days locked</p>
            <p className="text-xs text-muted-foreground">Upgrade to see your full 7-day plan</p>
          </div>
          <span className="text-xs font-bold" style={{ color: "var(--plate-green-accent)" }}>Unlock →</span>
        </button>
      )}

      {/* Locked day overlay */}
      {currentDayLocked ? (
        <div
          className="rounded-2xl flex flex-col items-center justify-center py-16 px-6 text-center relative overflow-hidden cursor-pointer"
          style={{ background: "var(--surface-card)", border: "1px solid var(--border)", minHeight: 280 }}
          onClick={() => { hapticMedium(); setPaywallFeature("meal_plan"); }}
        >
          {/* Blurred placeholder */}
          <div className="absolute inset-0 flex flex-col gap-3 p-5" style={{ filter: "blur(6px)", opacity: 0.25, pointerEvents: "none" }}>
            {[1, 2, 3].map(n => (
              <div key={n} className="rounded-xl p-4" style={{ background: "var(--surface-overlay)", height: 72 }} />
            ))}
          </div>
          {/* Lock overlay */}
          <div className="relative z-10 flex flex-col items-center gap-4">
            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "var(--plate-green-deep)" }}>
              <Lock className="w-7 h-7" style={{ color: "var(--plate-green-accent)" }} />
            </div>
            <div>
              <p className="text-base font-semibold text-white">This day is locked</p>
              <p className="text-sm text-muted-foreground mt-1">Upgrade to see all 7 days</p>
            </div>
            <button
              className="px-6 py-2.5 rounded-full text-sm font-bold"
              style={{ background: "var(--plate-green-accent)", color: "#0a1a0a" }}
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
                {/* KCAL */}
                <button
                  className="flex flex-col items-center rounded-xl py-2 px-1 transition-colors active:opacity-70"
                  style={selectedMacro === "kcal" ? { background: "rgba(255,255,255,0.08)" } : {}}
                  onClick={() => setSelectedMacro(m => m === "kcal" ? null : "kcal")}
                >
                  <div className="text-card-label text-muted-foreground">kcal</div>
                  <div className="text-stat-number-sm mt-1">{Math.round(dayCalories)}</div>
                </button>
                {/* PROTEIN */}
                <button
                  className="flex flex-col items-center rounded-xl py-2 px-1 transition-colors active:opacity-70"
                  style={selectedMacro === "protein" ? { background: "rgba(74,158,255,0.12)" } : {}}
                  onClick={() => setSelectedMacro(m => m === "protein" ? null : "protein")}
                >
                  <div className="text-card-label text-muted-foreground">protein</div>
                  <div className="text-stat-number-sm mt-1" style={{ color: "#4A9EFF" }}>{Math.round(dayProtein * 10) / 10}<span className="text-xs font-sans ml-0.5">g</span></div>
                </button>
                {/* CARBS */}
                <button
                  className="flex flex-col items-center rounded-xl py-2 px-1 transition-colors active:opacity-70"
                  style={selectedMacro === "carbs" ? { background: "rgba(245,166,35,0.12)" } : {}}
                  onClick={() => setSelectedMacro(m => m === "carbs" ? null : "carbs")}
                >
                  <div className="text-card-label text-muted-foreground">carbs</div>
                  <div className="text-stat-number-sm mt-1" style={{ color: "#F5A623" }}>{Math.round(dayCarbs * 10) / 10}<span className="text-xs font-sans ml-0.5">g</span></div>
                </button>
                {/* FAT */}
                <button
                  className="flex flex-col items-center rounded-xl py-2 px-1 transition-colors active:opacity-70"
                  style={selectedMacro === "fat" ? { background: "rgba(255,107,107,0.12)" } : {}}
                  onClick={() => setSelectedMacro(m => m === "fat" ? null : "fat")}
                >
                  <div className="text-card-label text-muted-foreground">fat</div>
                  <div className="text-stat-number-sm mt-1" style={{ color: "#FF6B6B" }}>{Math.round(dayFat * 10) / 10}<span className="text-xs font-sans ml-0.5">g</span></div>
                </button>
              </div>

              {/* Macro detail card */}
              {selectedMacro && (
                <div className="mt-3 rounded-xl px-4 py-3 text-sm" style={{
                  background: selectedMacro === "kcal" ? "rgba(255,255,255,0.05)"
                    : selectedMacro === "protein" ? "rgba(74,158,255,0.08)"
                    : selectedMacro === "carbs" ? "rgba(245,166,35,0.08)"
                    : "rgba(255,107,107,0.08)",
                  border: `1px solid ${selectedMacro === "kcal" ? "rgba(255,255,255,0.1)"
                    : selectedMacro === "protein" ? "rgba(74,158,255,0.2)"
                    : selectedMacro === "carbs" ? "rgba(245,166,35,0.2)"
                    : "rgba(255,107,107,0.2)"}`,
                }}>
                  {selectedMacro === "kcal" && (
                    <>
                      <div className="font-semibold mb-1">{Math.round(dayCalories)} kcal today</div>
                      <div className="text-muted-foreground text-xs leading-relaxed">
                        This is the total energy from all your meals today. Your daily target is {(profile as any)?.targetCalories || "—"} kcal based on your goal and activity level.
                        {dayCalories < ((profile as any)?.targetCalories || 0) * 0.95 && " You're running a bit under today."}
                        {dayCalories > ((profile as any)?.targetCalories || 0) * 1.05 && " You're slightly over your target today."}
                      </div>
                    </>
                  )}
                  {selectedMacro === "protein" && (
                    <>
                      <div className="font-semibold mb-1" style={{ color: "#4A9EFF" }}>{Math.round(dayProtein * 10) / 10}g protein today</div>
                      <div className="text-muted-foreground text-xs leading-relaxed">
                        Protein repairs and builds muscle after training, keeps you full longer, and has the highest thermic effect of any macro (your body burns more calories digesting it). Your daily target is {(profile as any)?.targetProtein || "—"}g based on your bodyweight and goal.
                      </div>
                    </>
                  )}
                  {selectedMacro === "carbs" && (
                    <>
                      <div className="font-semibold mb-1" style={{ color: "#F5A623" }}>{Math.round(dayCarbs * 10) / 10}g carbs today</div>
                      <div className="text-muted-foreground text-xs leading-relaxed">
                        Carbs are your body's primary fuel for training and brain function. They replenish muscle glycogen so you can perform and recover. Your daily target is {(profile as any)?.targetCarbs || "—"}g set by your diet style and calorie goal.
                      </div>
                    </>
                  )}
                  {selectedMacro === "fat" && (
                    <>
                      <div className="font-semibold mb-1" style={{ color: "#FF6B6B" }}>{Math.round(dayFat * 10) / 10}g fat today</div>
                      <div className="text-muted-foreground text-xs leading-relaxed">
                        Dietary fat supports hormone production, absorbs fat-soluble vitamins (A, D, E, K), and helps regulate inflammation. It doesn't make you store body fat when kept within your calorie target. Your daily target is {(profile as any)?.targetFat || "—"}g.
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Why tab */}
              <div className="flex justify-center mt-3">
                <button
                  onClick={handleOpenWhy}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-opacity active:opacity-70"
                  style={{ background: "rgba(82,183,136,0.12)", color: "#52B788", border: "1px solid rgba(82,183,136,0.25)" }}
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  Why these numbers?
                </button>
              </div>
            </div>
          )}

          {/* Meal cards */}
          {currentDay && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {currentDay.meals.map((meal: any, mealIdx: number) => {
                const mealData = meal.mealId ? mealsMap[meal.mealId] : null;
                if (!mealData) return null;
                const isSwapping = swapping?.dayIdx === activeDay && swapping?.mealIdx === mealIdx;
                const isSkipped = meal.skipped ?? false;
                const isLogged = activeDay === todayIdx && (meal.mealId ? loggedMealIds.has(meal.mealId.toString()) : false);
                const cookTime = (mealData as any).cookTime;
                const prepTime = mealData.prepTime;
                const totalTime = (prepTime || 0) + (cookTime || 0);
                const difficulty = (mealData as any).difficulty;
                const imageEmoji = (mealData as any).imageEmoji as string | undefined;

                return (
                  <div
                    key={mealIdx}
                    className="meal-card animate-card-stagger"
                    style={{
                      opacity: isSkipped ? 0.4 : isLogged ? 0.7 : 1,
                      animationDelay: `${mealIdx * 60}ms`,
                    }}
                    onClick={() => navigate(`/meal/${meal.mealId}`)}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                        style={{ background: "var(--surface-overlay)" }}
                      >
                        {imageEmoji || "🍽️"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-card-label" style={{ color: "#555" }}>
                            {meal.slot.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())}
                          </span>
                          {isLogged && !isSkipped && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: "rgba(82,183,136,0.15)", color: "#52B788" }}>
                              <CheckCheck className="w-2.5 h-2.5" /> LOGGED
                            </span>
                          )}
                          {isSkipped && (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(245,166,35,0.15)", color: "#F5A623" }}>
                              SKIPPED
                            </span>
                          )}
                        </div>
                        <div className={`text-meal-name ${isSkipped || isLogged ? "line-through" : ""}`}>
                          {mealData.name}
                        </div>
                        <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                          <span className="macro-pill macro-pill-kcal">{Math.round(mealData.calories)} kcal</span>
                          <span className="macro-pill macro-pill-protein">{Math.round(mealData.protein * 10) / 10}p</span>
                          <span className="macro-pill macro-pill-carbs">{Math.round(mealData.carbs * 10) / 10}c</span>
                          <span className="macro-pill macro-pill-fat">{Math.round(mealData.fat * 10) / 10}f</span>
                          {totalTime > 0 && (
                            <span className="cook-time-pill ml-1"><Clock className="w-3 h-3" />{totalTime}m</span>
                          )}
                          {difficulty && (
                            <span className="cook-time-pill"><Flame className="w-3 h-3" />{difficulty}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
                        {!isLogged && (
                          <button
                            onClick={() => handleSkip(activeDay, mealIdx, isSkipped)}
                            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors text-muted-foreground hover:text-foreground"
                            style={{ background: "var(--surface-overlay)" }}
                            title={isSkipped ? "Restore" : "Skip"}
                          >
                            {isSkipped ? <CheckCircle2 className="w-3.5 h-3.5" style={{ color: "#52B788" }} /> : <SkipForward className="w-3.5 h-3.5" />}
                          </button>
                        )}
                        <button
                          onClick={() => handleSwap(activeDay, mealIdx)}
                          disabled={isSwapping || isLogged}
                          className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors disabled:opacity-30"
                          style={{ background: "var(--surface-overlay)" }}
                          title={isLogged ? "Tap meal to unlog" : "Swap meal"}
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isSwapping ? "animate-spin" : ""}`} />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-end mt-2.5">
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

      {/* Floating grocery list */}
      <button
        onClick={handleGroceryClick}
        className="fixed bottom-24 right-5 w-12 h-12 rounded-full shadow-lg flex items-center justify-center hover:opacity-90 transition-opacity z-40"
        style={{ background: "#F0F0F0", color: "#000" }}
        title="Grocery list"
      >
        <ListChecks className="w-5 h-5" />
      </button>

      {/* Paywall modal */}
      <PaywallModal
        open={paywallFeature !== null}
        onClose={() => setPaywallFeature(null)}
        feature={paywallFeature ?? "general"}
      />

      {/* Why modal */}
      {showWhy && profile && (
        <WhyModal profile={profile} onClose={() => setShowWhy(false)} />
      )}
    </div>
  );
}

/* ─── Why Modal ─────────────────────────────────────────────────────────── */

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
            name: profile.name,
            age: profile.age,
            gender: profile.gender || profile.sex || "other",
            height: profile.height,
            weight: profile.weight,
            activityLevel: profile.activityLevel,
            goal: profile.goal,
            dietPreference: profile.dietPreference,
            bmr: profile.bmr,
            tdee: profile.tdee,
            targetCalories: profile.targetCalories,
            targetProtein: profile.targetProtein,
            targetCarbs: profile.targetCarbs,
            targetFat: profile.targetFat,
            proteinGkg: profile.proteinGkg,
            calorieFloorActivated: profile.calorieFloorActivated,
            usesGlp1: profile.usesGlp1,
            hydrationTarget: profile.hydrationTarget,
            hydrationMl: profile.hydrationMl,
            mealStructure: profile.mealStructure,
          },
        });
        if (!cancelled) setContent(result as any);
      } catch {
        // silently fall through — content stays null, we show skeleton
      } finally {
        if (!cancelled) setLoading(false);
      }
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
        {/* Handle + header */}
        <div className="relative flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
          <div className="w-10 h-1 rounded-full absolute left-1/2 -translate-x-1/2 top-3" style={{ background: "rgba(255,255,255,0.15)" }} />
          <h2 className="text-lg font-serif">Why these numbers?</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.08)" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 pb-8 space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Every number in your plan comes from real math on your real body. Here is where it all came from.
          </p>

          {/* Calorie floor banner — inside Why */}
          {profile.calorieFloorActivated && (
            <div className="rounded-xl px-4 py-3 flex items-start gap-3" style={{ background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.25)" }}>
              <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: "#F5A623" }} />
              <p className="text-sm leading-relaxed" style={{ color: "var(--foreground)" }}>
                Your goal has been adjusted to a safer minimum. For faster fat loss, increase your activity level instead of dropping calories further.
              </p>
            </div>
          )}

          {/* Macro bar summary */}
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
              <div>
                <div className="text-xs font-bold">{cals}</div>
                <div className="text-[10px] text-muted-foreground">kcal</div>
              </div>
              <div>
                <div className="text-xs font-bold" style={{ color: "#4A9EFF" }}>{protein}g</div>
                <div className="text-[10px] text-muted-foreground">protein</div>
              </div>
              <div>
                <div className="text-xs font-bold" style={{ color: "#F5A623" }}>{carbs}g</div>
                <div className="text-[10px] text-muted-foreground">carbs</div>
              </div>
              <div>
                <div className="text-xs font-bold" style={{ color: "#FF6B6B" }}>{fat}g</div>
                <div className="text-[10px] text-muted-foreground">fat</div>
              </div>
            </div>
          </div>

          {/* AI generated content */}
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
            <div className="text-center py-8 text-sm text-muted-foreground">
              Could not load explanation. Please try again.
            </div>
          )}

          {/* Sources */}
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
                  <p key={i} className="text-xs text-muted-foreground leading-relaxed">
                    {i + 1}. {src}
                  </p>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function WhyCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-4 space-y-2" style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}>
      <h3 className="text-sm font-semibold leading-snug">{title}</h3>
      {children}
    </div>
  );
}
