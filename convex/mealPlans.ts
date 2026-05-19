import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { FORBIDDEN_KEYWORDS } from "./mealsDatabase";

// ═══════════════════════════════════════════════════════════════
// HARD DIET FILTERING — No fallbacks, no exceptions
// ═══════════════════════════════════════════════════════════════

/**
 * Triple-validation filter for meals.
 * Pass 1: forbiddenFor check (DB-level equivalent)
 * Pass 2: compatibleDiets check
 * Pass 3: Forbidden keyword scan on ingredients
 * If a meal fails ANY pass, it is EXCLUDED. No fallback to unfiltered.
 */
// ── Budget inference: assign a tier based on ingredients when none is stored ──
function inferBudgetTier(meal: Doc<"meals">): string {
  const ingredientText = meal.ingredients.map(i => i.name.toLowerCase()).join(" ");
  const mealName = meal.name.toLowerCase();
  const text = ingredientText + " " + mealName;

  const premiumKeywords = [
    "salmon", "tuna steak", "swordfish", "halibut", "lobster", "crab", "shrimp", "scallop",
    "ribeye", "filet mignon", "strip steak", "bison", "wagyu", "duck", "lamb chop",
    "prosciutto", "truffle", "pine nuts", "macadamia", "pistachio", "cashew",
    "avocado", "aged cheese", "parmesan", "manchego", "gruyere",
    "almond butter", "grass-fed", "organic", "wild caught",
  ];
  const cheapKeywords = [
    "egg", "oat", "bean", "lentil", "rice", "bread", "pasta", "potato",
    "banana", "apple", "cabbage", "carrot", "onion", "canned", "frozen",
    "peanut butter", "tuna can", "sardine", "ground turkey", "ground beef",
    "chicken thigh", "chicken breast", "tofu", "tempeh", "cottage cheese",
    "yogurt", "milk", "cheddar", "mozzarella",
  ];

  const premiumScore = premiumKeywords.filter(k => text.includes(k)).length;
  const cheapScore = cheapKeywords.filter(k => text.includes(k)).length;

  if (premiumScore >= 2) return "premium";
  if (premiumScore === 1 && cheapScore === 0) return "moderate";
  if (cheapScore >= 1 && premiumScore === 0) return "low";
  return "moderate"; // default
}

// ── Diet-aware cooking level defaults (if user left cooking pref unset) ──
const DIET_COOKING_DEFAULTS: Record<string, string> = {
  keto: "moderate",
  carnivore: "moderate",
  paleo: "moderate",
  whole30: "moderate",
  mediterranean: "moderate",
  high_protein: "minimal",
  med_high_protein: "minimal",
  balanced: "moderate",
  iifym: "moderate",
  vegan: "minimal",
  vegetarian: "minimal",
  pescatarian: "minimal",
  low_carb: "minimal",
  high_carb: "minimal",
  low_fat: "minimal",
  moderate_protein: "minimal",
  low_protein: "minimal",
};

function hardFilterForUser(
  meals: Doc<"meals">[],
  profile: {
    dietPreference?: string;
    dietPreferences?: string[];
    allergens?: string[];
    cookingPreference: string;
    maxCookTime?: number;
    budgetLevel: string;
    dislikedFoods?: string[];
  },
  slotCategory?: string
): Doc<"meals">[] {
  const allDiets = profile.dietPreferences && profile.dietPreferences.length > 0
    ? profile.dietPreferences
    : [profile.dietPreference || "balanced"];
  const userDiet = allDiets[0]; // primary diet for keyword/macro checks
  const userAllergens = profile.allergens;
  const userMaxCookTime = profile.maxCookTime;
  const userBudget = profile.budgetLevel || "high";

  // Resolve effective cooking preference — if user set "advanced" use that,
  // otherwise fall back to diet-aware default
  const rawCookPref = profile.cookingPreference;
  const effectiveCookPref =
    rawCookPref && rawCookPref !== "moderate"
      ? rawCookPref
      : (DIET_COOKING_DEFAULTS[userDiet] ?? rawCookPref ?? "moderate");

  const budgetTierOrder: Record<string, number> = { low: 1, moderate: 2, premium: 3 };
  const budgetAllowed: Record<string, number> = {
    tight: 1, low: 1, moderate: 2, comfortable: 3, high: 3,
  };
  const maxBudgetTier = budgetAllowed[userBudget] ?? 3;

  let filtered = [...meals];

  // ── PASS 1: forbiddenFor check (HARD — never fallback) ──
  filtered = filtered.filter((m) => {
    const forbidden = (m as any).forbiddenFor as string[] | undefined;
    if (!forbidden || forbidden.length === 0) return true;
    return !forbidden.includes(userDiet);
  });

  // ── PASS 2: compatibleDiets check (soft — only apply when data is present) ──
  // Meal passes if it's compatible with ANY of the user's selected diets
  filtered = filtered.filter((m) => {
    const diets = (m as any).compatibleDiets as string[] | undefined;
    if (!diets || diets.length === 0) return true; // No compatibleDiets = rely on forbiddenFor alone
    return allDiets.some((d) => diets.includes(d));
  });

  // ── PASS 3: Forbidden keyword scan (HARD — never fallback) ──
  const forbiddenWords = FORBIDDEN_KEYWORDS[userDiet];
  if (forbiddenWords && forbiddenWords.length > 0) {
    filtered = filtered.filter((m) => {
      const ingredientText = m.ingredients.map(i => i.name.toLowerCase()).join(" ");
      const mealNameLower = m.name.toLowerCase();
      for (const word of forbiddenWords) {
        if (ingredientText.includes(word) || mealNameLower.includes(word)) {
          return false; // Violation — EXCLUDE
        }
      }
      return true;
    });
  }

  // ── Allergen filter (HARD) ──
  if (userAllergens && userAllergens.length > 0) {
    filtered = filtered.filter((m) => {
      const allergens = (m as any).allergensPresent as string[] | undefined;
      if (!allergens || allergens.length === 0) return true;
      return !allergens.some((a: string) => userAllergens.includes(a));
    });
  }

  // ── Disliked foods filter (HARD — never serve disliked foods) ──
  const disliked = profile.dislikedFoods;
  if (disliked && disliked.length > 0) {
    filtered = filtered.filter((m) => {
      const searchText = [
        m.name.toLowerCase(),
        ...m.ingredients.map(i => i.name.toLowerCase()),
        ...(m.tags || []).map(t => t.toLowerCase()),
      ].join(" ");
      for (const food of disliked) {
        if (searchText.includes(food.toLowerCase())) {
          return false;
        }
      }
      return true;
    });
  }

  // ── Cooking level filter (soft — fallback allowed here) ──
  const cookLevels: Record<string, string[]> = {
    none: ["none"],
    minimal: ["none", "minimal"],
    moderate: ["none", "minimal", "moderate"],
    advanced: ["none", "minimal", "moderate", "advanced"],
  };
  const allowedLevels = cookLevels[effectiveCookPref] || ["none", "minimal", "moderate", "advanced"];
  // Only apply if the meal has a cookingLevel set; meals without it always pass
  const cookFiltered = filtered.filter((m) =>
    !m.cookingLevel || allowedLevels.includes(m.cookingLevel)
  );
  if (cookFiltered.length > 0) filtered = cookFiltered;

  // ── Max cook time filter (soft) ──
  // Dinner gets +30 min buffer so longer meals like Chicken Parm still show up
  if (userMaxCookTime && userMaxCookTime > 0) {
    const isDinner = slotCategory === "dinner";
    const effectiveMax = isDinner ? userMaxCookTime + 30 : userMaxCookTime;
    const timeFiltered = filtered.filter((m) => {
      const totalTime = ((m as any).cookTime || 0) + (m.prepTime || 0);
      return totalTime <= effectiveMax;
    });
    if (timeFiltered.length > 0) filtered = timeFiltered;
  }

  // ── Budget tier filter — use stored tier OR infer from ingredients ──
  if (maxBudgetTier < 3) {
    const budgetFiltered = filtered.filter((m) => {
      const storedTier = (m as any).budgetTier as string | undefined;
      const tier = storedTier || inferBudgetTier(m);
      return (budgetTierOrder[tier] ?? 2) <= maxBudgetTier;
    });
    if (budgetFiltered.length > 0) filtered = budgetFiltered;
  }

  return filtered;
}

// ═══════════════════════════════════════════════════════════════
// QUERIES
// ═══════════════════════════════════════════════════════════════

export const getCurrentPlan = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const plans = await ctx.db.query("mealPlans").withIndex("by_userId", (q) => q.eq("userId", userId)).collect();
    if (plans.length === 0) return null;
    return plans[plans.length - 1];
  },
});

export const getPlanWithMeals = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const plans = await ctx.db.query("mealPlans").withIndex("by_userId", (q) => q.eq("userId", userId)).collect();
    if (plans.length === 0) return null;
    const plan = plans[plans.length - 1];
    
    const mealIds = new Set<string>();
    for (const day of plan.days) {
      for (const meal of day.meals) {
        if (meal.mealId) mealIds.add(meal.mealId);
      }
    }
    
    const mealsMap: Record<string, Doc<"meals">> = {};
    for (const id of mealIds) {
      const meal = await ctx.db.get(id as Id<"meals">);
      if (meal) mealsMap[id] = meal;
    }
    
    return { plan, mealsMap };
  },
});

// ═══════════════════════════════════════════════════════════════
// MUTATIONS
// ═══════════════════════════════════════════════════════════════

export const generatePlan = mutation({
  args: { profileId: v.optional(v.id("profiles")) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = args.profileId
      ? await ctx.db.get(args.profileId)
      : await ctx.db.query("profiles").withIndex("by_userId", (q) => q.eq("userId", userId)).unique();
    if (!profile) throw new Error("No profile found. Complete onboarding first.");

    const allMeals = await ctx.db.query("meals").collect();
    if (allMeals.length === 0) throw new Error("No meals in database. Please wait a moment and try again.");

    // Support multi-diet: use all selected diets for filtering, primary for keyword checks
    const allDiets: string[] = ((profile as any).dietPreferences as string[] | undefined)
      || (profile.dietPreference ? [profile.dietPreference] : ["balanced"]);

    const userProfile = {
      dietPreference: allDiets[0] || "balanced",
      dietPreferences: allDiets,
      allergens: (profile as any).allergens as string[] | undefined,
      cookingPreference: profile.cookingPreference,
      maxCookTime: (profile as any).maxCookTime as number | undefined,
      budgetLevel: profile.budgetLevel,
      dislikedFoods: (profile as any).dislikedFoods as string[] | undefined,
    };
    const userFavorites = ((profile as any).favoriteFoods as string[] | undefined) || [];

    // Category pools
    const breakfasts = allMeals.filter((m) => m.category === "breakfast");
    const lunches = allMeals.filter((m) => m.category === "lunch");
    const dinners = allMeals.filter((m) => m.category === "dinner");
    const snacks = allMeals.filter((m) => m.category === "snack");

    // HARD filter each pool
    const filteredBreakfasts = hardFilterForUser(breakfasts, userProfile, "breakfast");
    const filteredLunches = hardFilterForUser(lunches, userProfile, "lunch");
    const filteredDinners = hardFilterForUser(dinners, userProfile, "dinner");
    const filteredSnacks = hardFilterForUser(snacks, userProfile, "snack");

    // Log the filtering for debugging
    console.log(`[generatePlan] User ${userId} diet=${userProfile.dietPreference} allergens=${JSON.stringify(userProfile.allergens)} favorites=${userFavorites.length} disliked=${(userProfile.dislikedFoods || []).length}`);
    console.log(`[generatePlan] Pools: ${breakfasts.length}→${filteredBreakfasts.length} breakfast, ${lunches.length}→${filteredLunches.length} lunch, ${dinners.length}→${filteredDinners.length} dinner, ${snacks.length}→${filteredSnacks.length} snack`);

    // If ANY core pool is empty after hard filtering, return friendly error
    if (filteredBreakfasts.length === 0 || filteredLunches.length === 0 || filteredDinners.length === 0) {
      const emptyPools = [];
      if (filteredBreakfasts.length === 0) emptyPools.push("breakfast");
      if (filteredLunches.length === 0) emptyPools.push("lunch");
      if (filteredDinners.length === 0) emptyPools.push("dinner");
      console.error(`[generatePlan] EMPTY POOLS for diet=${userProfile.dietPreference}: ${emptyPools.join(", ")}. Total meals in DB: ${allMeals.length}. Allergens: ${JSON.stringify(userProfile.allergens)}`);
      throw new Error(
        `We don't have enough ${emptyPools.join(" and ")} options for your ${userProfile.dietPreference} diet yet. ` +
        `We're adding more meals soon — please try adjusting your preferences or check back later.`
      );
    }

    // Variety engine
    // minUnique = how many different meals to cycle through before repeating
    // Use at least 14 (2 full weeks) so a 7-day plan never repeats
    const varietyConfig: Record<string, number> = {
      low: 14, medium: 21, high: 28, ultra: 35,
    };
    const minUnique = varietyConfig[profile.varietyDepth] || 21;

    const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() + 1);

    // Load existing plan to restore cross-regeneration seen history
    const existingPlan = await ctx.db.query("mealPlans").withIndex("by_userId", (q) => q.eq("userId", userId)).unique();

    // Restore seen IDs from previous plan — so regenerating doesn't repeat recently shown meals
    const usedBreakfasts: Set<string> = new Set(existingPlan?.seenBreakfastIds || []);
    const usedLunches: Set<string> = new Set(existingPlan?.seenLunchIds || []);
    const usedDinners: Set<string> = new Set(existingPlan?.seenDinnerIds || []);
    const usedSnacks: Set<string> = new Set(existingPlan?.seenSnackIds || []);

    const targetCals = profile.targetCalories || 2000;
    const targetProteinDaily = (profile as any).targetProtein as number | undefined || Math.round(targetCals * 0.30 / 4);
    const targetCarbs = (profile as any).targetCarbs as number | undefined;
    const targetFat = (profile as any).targetFat as number | undefined;
    const primaryDiet = allDiets[0] || "balanced";

    /** Score a meal: favorites + calorie proximity + protein + diet-aware macro scoring */
    const scoreMeal = (meal: Doc<"meals">, slotTargetCals: number, slotTargetProtein: number): number => {
      let score = 1.0;
      // Favorites boost
      if (userFavorites.length > 0) {
        const searchText = [
          meal.name.toLowerCase(),
          ...meal.ingredients.map(i => i.name.toLowerCase()),
          ...(meal.tags || []).map(t => t.toLowerCase()),
        ].join(" ");
        for (const fav of userFavorites) {
          if (searchText.includes(fav.toLowerCase())) score += 0.3;
        }
      }
      // Calorie proximity (0 to -0.5)
      const calDiff = Math.abs(meal.calories - slotTargetCals);
      score -= Math.min(calDiff / 800, 0.5);

      // Protein proximity — weighted heavily so the day total reliably hits target.
      // Penalty is proportional to target (not a fixed divisor), max -1.2.
      const proteinDiff = Math.abs(meal.protein - slotTargetProtein);
      const proteinRatio = slotTargetProtein > 0 ? proteinDiff / slotTargetProtein : 0;
      score -= Math.min(proteinRatio * 1.5, 1.2);
      // Bonus for hitting ≥90% of slot protein target
      if (slotTargetProtein > 0 && meal.protein >= slotTargetProtein * 0.90) score += 0.4;
      // Extra bonus for landing within ±15% of target
      if (slotTargetProtein > 0 && meal.protein >= slotTargetProtein && meal.protein <= slotTargetProtein * 1.15) score += 0.2;

      // ── Diet-aware macro scoring ──
      if (primaryDiet === "keto" || primaryDiet === "carnivore") {
        // Heavy penalty for high-carb meals (keto: <30g/day total, carnivore: <10g)
        const carbLimit = primaryDiet === "carnivore" ? 5 : 15; // per-meal carb budget
        if (meal.carbs > carbLimit * 2) score -= 1.0;
        else if (meal.carbs > carbLimit) score -= 0.5;
        // Reward high fat
        const fatRatio = (meal.fat * 9) / Math.max(meal.calories, 1);
        if (fatRatio >= 0.60) score += 0.3;
      } else if (primaryDiet === "high_protein" || primaryDiet === "med_high_protein") {
        // Extra reward for high protein-to-calorie ratio
        const protRatio = (meal.protein * 4) / Math.max(meal.calories, 1);
        if (protRatio >= 0.35) score += 0.3;
      } else if (primaryDiet === "low_carb") {
        if (meal.carbs > 40) score -= 0.4;
      } else if (primaryDiet === "high_carb") {
        const carbRatio = (meal.carbs * 4) / Math.max(meal.calories, 1);
        if (carbRatio >= 0.55) score += 0.2;
      } else if (primaryDiet === "low_fat") {
        const fatRatio = (meal.fat * 9) / Math.max(meal.calories, 1);
        if (fatRatio > 0.25) score -= 0.3;
      }
      // Penalize if meal carbs diverge from profile targetCarbs per-slot proportionally
      if (targetCarbs) {
        const slotCarbTarget = targetCarbs * (slotTargetCals / targetCals);
        const carbDiff = Math.abs(meal.carbs - slotCarbTarget);
        score -= Math.min(carbDiff / 100, 0.3);
      }
      // Penalize if meal fat diverges from profile targetFat per-slot
      if (targetFat) {
        const slotFatTarget = targetFat * (slotTargetCals / targetCals);
        const fatDiff = Math.abs(meal.fat - slotFatTarget);
        score -= Math.min(fatDiff / 80, 0.3);
      }
      return score;
    };

    /** Select best meal from pool for a given calorie target (with variety tracking) */
    const selectMeal = (pool: Doc<"meals">[], used: Set<string>, slotTargetCals: number, slotTargetProtein: number): Doc<"meals"> => {
      const unused = pool.filter((m) => !used.has(m._id));
      let candidates = unused.length > 0 ? unused : pool;

      // Protein-first filtering: when protein target is high (>=50g/slot),
      // restrict candidates to meals hitting >=75% of target, if >=3 qualify.
      // This ensures high-protein users reliably hit their daily protein goal.
      if (slotTargetProtein >= 50) {
        const minProtein = slotTargetProtein * 0.75;
        const proteinFiltered = candidates.filter(m => m.protein >= minProtein);
        if (proteinFiltered.length >= 3) {
          candidates = proteinFiltered;
        }
      }

      const scored = candidates.map(m => ({ meal: m, score: scoreMeal(m, slotTargetCals, slotTargetProtein) }));
      scored.sort((a, b) => b.score - a.score);
      // Top 7 for variety while still staying macro-accurate
      const topN = scored.slice(0, Math.min(7, scored.length));
      const pick = topN[Math.floor(Math.random() * topN.length)].meal;
      used.add(pick._id);
      if (used.size >= Math.min(minUnique, pool.length)) {
        used.clear();
        used.add(pick._id);
      }
      return pick;
    };

    /** Select meal closest to an EXACT calorie target (used for last-slot fill) */
    const selectMealExact = (pool: Doc<"meals">[], used: Set<string>, exactCals: number, slotTargetProtein: number): Doc<"meals"> => {
      const unused = pool.filter((m) => !used.has(m._id));
      const candidates = unused.length > 0 ? unused : pool;
      // Score: 70% calorie exact fit + 30% diet/protein score
      const scored = candidates.map(m => {
        const calScore = 1.0 - Math.min(Math.abs(m.calories - exactCals) / Math.max(exactCals, 1), 1.0);
        const macroScore = (scoreMeal(m, exactCals, slotTargetProtein) + 1.0) / 3.0;
        return { meal: m, score: calScore * 0.7 + macroScore * 0.3 };
      });
      scored.sort((a, b) => b.score - a.score);
      const pick = scored[0].meal;
      used.add(pick._id);
      if (used.size >= Math.min(minUnique, pool.length)) {
        used.clear();
        used.add(pick._id);
      }
      return pick;
    };

    const mealsPerDay = (profile as any).mealsPerDay as string | undefined;

    type SlotConfig = { slot: string; pool: Doc<"meals">[]; used: Set<string>; calPct: number };
    const buildSlots = (): SlotConfig[] => {
      // For snack slots, if no snacks available, skip them
      const hasSnacks = filteredSnacks.length > 0;
      switch (mealsPerDay) {
        case "3":
          return [
            { slot: "breakfast", pool: filteredBreakfasts, used: usedBreakfasts, calPct: 0.30 },
            { slot: "lunch", pool: filteredLunches, used: usedLunches, calPct: 0.35 },
            { slot: "dinner", pool: filteredDinners, used: usedDinners, calPct: 0.35 },
          ];
        case "3+1":
          return [
            { slot: "breakfast", pool: filteredBreakfasts, used: usedBreakfasts, calPct: hasSnacks ? 0.25 : 0.30 },
            { slot: "lunch", pool: filteredLunches, used: usedLunches, calPct: hasSnacks ? 0.30 : 0.35 },
            { slot: "dinner", pool: filteredDinners, used: usedDinners, calPct: hasSnacks ? 0.30 : 0.35 },
            ...(hasSnacks ? [{ slot: "snack", pool: filteredSnacks, used: usedSnacks, calPct: 0.15 }] : []),
          ];
        case "3+2":
          return [
            { slot: "breakfast", pool: filteredBreakfasts, used: usedBreakfasts, calPct: hasSnacks ? 0.22 : 0.30 },
            { slot: "lunch", pool: filteredLunches, used: usedLunches, calPct: hasSnacks ? 0.28 : 0.35 },
            { slot: "dinner", pool: filteredDinners, used: usedDinners, calPct: hasSnacks ? 0.28 : 0.35 },
            ...(hasSnacks ? [
              { slot: "snack_1", pool: filteredSnacks, used: usedSnacks, calPct: 0.11 },
              { slot: "snack_2", pool: filteredSnacks, used: usedSnacks, calPct: 0.11 },
            ] : []),
          ];
        case "4":
          return [
            { slot: "breakfast", pool: filteredBreakfasts, used: usedBreakfasts, calPct: 0.25 },
            { slot: "lunch", pool: filteredLunches, used: usedLunches, calPct: 0.25 },
            { slot: "dinner", pool: filteredDinners, used: usedDinners, calPct: 0.25 },
            ...(hasSnacks ? [{ slot: "snack", pool: filteredSnacks, used: usedSnacks, calPct: 0.25 }] : []),
          ];
        case "5-6":
          return [
            { slot: "breakfast", pool: filteredBreakfasts, used: usedBreakfasts, calPct: 0.18 },
            ...(hasSnacks ? [{ slot: "snack_1", pool: filteredSnacks, used: usedSnacks, calPct: 0.12 }] : []),
            { slot: "lunch", pool: filteredLunches, used: usedLunches, calPct: 0.22 },
            ...(hasSnacks ? [{ slot: "snack_2", pool: filteredSnacks, used: usedSnacks, calPct: 0.12 }] : []),
            { slot: "dinner", pool: filteredDinners, used: usedDinners, calPct: 0.22 },
            ...(hasSnacks ? [{ slot: "snack_3", pool: filteredSnacks, used: usedSnacks, calPct: 0.14 }] : []),
          ];
        default:
          return [
            { slot: "breakfast", pool: filteredBreakfasts, used: usedBreakfasts, calPct: hasSnacks ? 0.25 : 0.30 },
            { slot: "lunch", pool: filteredLunches, used: usedLunches, calPct: hasSnacks ? 0.35 : 0.35 },
            { slot: "dinner", pool: filteredDinners, used: usedDinners, calPct: hasSnacks ? 0.30 : 0.35 },
            ...(hasSnacks ? [{ slot: "snack", pool: filteredSnacks, used: usedSnacks, calPct: 0.10 }] : []),
          ];
      }
    };

    const slotConfigs = buildSlots();
    let totalCalories = 0;
    let totalProtein = 0;

    // Build a map of logged meals for this week: date → normalized slot → mealId
    // This lets us preserve meals the user already ate when regenerating
    const weekDates: string[] = dayNames.map((_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      return d.toISOString().split("T")[0];
    });
    const allWeekLogs = await ctx.db.query("foodLogs")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    // Map: date → normalized-slot → mealId (only logs with a mealId from a plan meal)
    const loggedMealByDateSlot: Record<string, Record<string, string>> = {};
    for (const log of allWeekLogs) {
      if (!weekDates.includes(log.date)) continue;
      if (!log.mealId) continue;
      if (!loggedMealByDateSlot[log.date]) loggedMealByDateSlot[log.date] = {};
      // Normalize snack slots (snack_1, snack_2, snack_3 → snack) for matching
      const normalizedSlot = log.slot.startsWith("snack") ? "snack" : log.slot;
      loggedMealByDateSlot[log.date][normalizedSlot] = log.mealId as string;
    }

    // Tolerance bands per spec section 6:
    //   Calories ±5%, Protein -5%/+15%, Fat ±10%, Carbs ±10%
    const dayInTolerance = (meals: Array<{ mealId: Id<"meals"> }>): boolean => {
      let dayCals = 0, dayProtein = 0, dayFat = 0, dayCarbs = 0;
      for (const m of meals) {
        const md = allMeals.find((x) => x._id === m.mealId);
        if (md) {
          dayCals += md.calories;
          dayProtein += (md as any).protein ?? 0;
          dayFat += (md as any).fat ?? 0;
          dayCarbs += (md as any).carbs ?? 0;
        }
      }
      const calOk = dayCals >= targetCals * 0.95 && dayCals <= targetCals * 1.05;
      const proteinOk = dayProtein >= targetProteinDaily * 0.95 && dayProtein <= targetProteinDaily * 1.15;
      const fatDailyTarget = (profile as any).targetFat as number | undefined;
      const carbDailyTarget = (profile as any).targetCarbs as number | undefined;
      const fatOk = !fatDailyTarget || (dayFat >= fatDailyTarget * 0.90 && dayFat <= fatDailyTarget * 1.10);
      const carbsOk = !carbDailyTarget || (dayCarbs >= carbDailyTarget * 0.90 && dayCarbs <= carbDailyTarget * 1.10);
      return calOk && proteinOk && fatOk && carbsOk;
    };

    /** Build one day's meals using last-slot fill */
    const buildDayMeals = (dateStr: string): Array<{ slot: string; mealId: Id<"meals">; completed: boolean }> => {
      const built: Array<{ slot: string; mealId: Id<"meals">; completed: boolean }> = [];
      let runningCals = 0;

      const lockedCalories = slotConfigs.reduce((sum, sc) => {
        const normalizedSlot = sc.slot.startsWith("snack") ? "snack" : sc.slot;
        const loggedMealId = loggedMealByDateSlot[dateStr]?.[normalizedSlot];
        if (loggedMealId) {
          const md = allMeals.find((x) => x._id === loggedMealId);
          return sum + (md?.calories ?? 0);
        }
        return sum;
      }, 0);

      const unlockedSlots = slotConfigs.filter((sc) => {
        const normalizedSlot = sc.slot.startsWith("snack") ? "snack" : sc.slot;
        return !loggedMealByDateSlot[dateStr]?.[normalizedSlot];
      });

      for (let si = 0; si < slotConfigs.length; si++) {
        const sc = slotConfigs[si];
        const normalizedSlot = sc.slot.startsWith("snack") ? "snack" : sc.slot;
        const loggedMealId = loggedMealByDateSlot[dateStr]?.[normalizedSlot];

        if (loggedMealId) {
          const md = allMeals.find((x) => x._id === loggedMealId);
          runningCals += md?.calories ?? 0;
          built.push({ slot: sc.slot, mealId: loggedMealId as Id<"meals">, completed: true });
          continue;
        }

        const isLastUnlocked = unlockedSlots.length > 0 && sc.slot === unlockedSlots[unlockedSlots.length - 1].slot;
        const proteinTarget = Math.round(targetProteinDaily * sc.calPct);

        let meal: Doc<"meals">;
        if (isLastUnlocked && unlockedSlots.length > 1) {
          const remainingNeeded = targetCals - lockedCalories - runningCals;
          meal = selectMealExact(sc.pool, sc.used, remainingNeeded, proteinTarget);
        } else {
          const calTarget = Math.round(targetCals * sc.calPct);
          meal = selectMeal(sc.pool, sc.used, calTarget, proteinTarget);
        }

        runningCals += meal.calories;
        built.push({ slot: sc.slot, mealId: meal._id, completed: false });
      }
      return built;
    };

    const days = dayNames.map((dayName, i) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      const dateStr = date.toISOString().split("T")[0];

      // Rule 1: retry up to 10 times if day is out of tolerance, use closest match
      let bestMeals = buildDayMeals(dateStr);
      if (!dayInTolerance(bestMeals)) {
        for (let retry = 0; retry < 9; retry++) {
          const attempt = buildDayMeals(dateStr);
          if (dayInTolerance(attempt)) {
            bestMeals = attempt;
            break;
          }
          // Keep the attempt with the best macro proximity as fallback (protein + calories)
          const attemptCals = attempt.reduce((s, m) => s + (allMeals.find(x => x._id === m.mealId)?.calories ?? 0), 0);
          const attemptProt = attempt.reduce((s, m) => s + ((allMeals.find(x => x._id === m.mealId) as any)?.protein ?? 0), 0);
          const bestCals = bestMeals.reduce((s, m) => s + (allMeals.find(x => x._id === m.mealId)?.calories ?? 0), 0);
          const bestProt = bestMeals.reduce((s, m) => s + ((allMeals.find(x => x._id === m.mealId) as any)?.protein ?? 0), 0);
          // Score: normalized calorie diff + 2x normalized protein diff (protein matters more)
          const attemptScore = Math.abs(attemptCals - targetCals) / targetCals + 2 * Math.abs(attemptProt - targetProteinDaily) / Math.max(targetProteinDaily, 1);
          const bestScore = Math.abs(bestCals - targetCals) / targetCals + 2 * Math.abs(bestProt - targetProteinDaily) / Math.max(targetProteinDaily, 1);
          if (attemptScore < bestScore) {
            bestMeals = attempt;
          }
        }
      }

      // Accumulate weekly totals
      for (const m of bestMeals) {
        const md = allMeals.find((x) => x._id === m.mealId);
        if (md) { totalCalories += md.calories; totalProtein += md.protein; }
      }

      return { date: dateStr, dayName, meals: bestMeals };
    });

    // Delete old plans
    const oldPlans = await ctx.db.query("mealPlans").withIndex("by_userId", (q) => q.eq("userId", userId)).collect();
    for (const old of oldPlans) {
      await ctx.db.delete(old._id);
    }

    const planId = await ctx.db.insert("mealPlans", {
      userId,
      weekStart: weekStart.toISOString().split("T")[0],
      days,
      totalCalories: Math.round(totalCalories / 7),
      totalProtein: Math.round(totalProtein / 7),
      swapHistory: [],
      version: 1,
      // Persist seen meal IDs so next regeneration avoids them until the pool cycles
      seenBreakfastIds: Array.from(usedBreakfasts),
      seenLunchIds: Array.from(usedLunches),
      seenDinnerIds: Array.from(usedDinners),
      seenSnackIds: Array.from(usedSnacks),
    });

    // Auto-sync grocery list
    await ctx.scheduler.runAfter(0, internal.grocery.syncGroceryFromPlan, { userId });

    return planId;
  },
});

export const toggleMealComplete = mutation({
  args: {
    dayIndex: v.number(),
    mealIndex: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const plans = await ctx.db.query("mealPlans").withIndex("by_userId", (q) => q.eq("userId", userId)).collect();
    const plan = plans[plans.length - 1];
    if (!plan) throw new Error("No meal plan found");

    const days = [...plan.days];
    const meals = [...days[args.dayIndex].meals];
    meals[args.mealIndex] = { ...meals[args.mealIndex], completed: !meals[args.mealIndex].completed };
    days[args.dayIndex] = { ...days[args.dayIndex], meals };

    await ctx.db.patch(plan._id, { days });
    return null;
  },
});

export const swapMeal = mutation({
  args: {
    dayIndex: v.number(),
    mealIndex: v.number(),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const plans = await ctx.db.query("mealPlans").withIndex("by_userId", (q) => q.eq("userId", userId)).collect();
    const plan = plans[plans.length - 1];
    if (!plan) throw new Error("No meal plan found");

    const profile = await ctx.db.query("profiles").withIndex("by_userId", (q) => q.eq("userId", userId)).unique();
    const meal = plan.days[args.dayIndex].meals[args.mealIndex];
    const slot = meal.slot;
    
    // Determine category from slot
    const category = slot.startsWith("snack") ? "snack" : slot;
    let allMeals = await ctx.db.query("meals").withIndex("by_category", (q) => q.eq("category", category)).collect();

    // HARD filter — same triple-validation as plan generation
    if (profile) {
      const userProfile = {
        dietPreference: profile.dietPreference,
        allergens: (profile as any).allergens as string[] | undefined,
        cookingPreference: profile.cookingPreference,
        maxCookTime: (profile as any).maxCookTime as number | undefined,
        budgetLevel: profile.budgetLevel,
        dislikedFoods: (profile as any).dislikedFoods as string[] | undefined,
      };
      allMeals = hardFilterForUser(allMeals, userProfile);
    }

    // If no meals after hard filter, throw honest error
    if (allMeals.length === 0) {
      throw new Error(
        `No replacement meals available for your diet. ` +
        `All ${category} options were filtered out by your dietary restrictions.`
      );
    }

    const excluded = new Set([meal.mealId, ...plan.swapHistory].filter(Boolean) as string[]);
    let candidates = allMeals.filter((m) => !excluded.has(m._id));
    if (candidates.length === 0) candidates = allMeals.filter((m) => m._id !== meal.mealId);
    if (candidates.length === 0) candidates = allMeals;

    // ── Rule 2: Constrained single-meal regeneration ─────────────────────
    // Calculate the macro gap created by the remaining meals of this day.
    // The new meal must fill that gap within tolerance bands.
    const dailyTargetCals = (profile as any)?.targetCalories as number | undefined ?? 2000;
    const dailyTargetProtein = (profile as any)?.targetProtein as number | undefined ?? Math.round(dailyTargetCals * 0.30 / 4);
    const dailyTargetFat = (profile as any)?.targetFat as number | undefined ?? Math.round(dailyTargetCals * 0.30 / 9);
    const dailyTargetCarbs = (profile as any)?.targetCarbs as number | undefined ?? Math.round(dailyTargetCals * 0.40 / 4);

    // Sum macros of all other meals in the day (fixed meals)
    const dayMeals = plan.days[args.dayIndex].meals;
    const allDayMealDocs = await Promise.all(
      dayMeals.map((m) => m.mealId ? ctx.db.get(m.mealId as Id<"meals">) : Promise.resolve(null))
    );
    let fixedCals = 0, fixedProtein = 0, fixedFat = 0, fixedCarbs = 0;
    for (let mi = 0; mi < dayMeals.length; mi++) {
      if (mi === args.mealIndex) continue; // skip the one being replaced
      const md = allDayMealDocs[mi];
      if (md) {
        fixedCals += md.calories;
        fixedProtein += (md as any).protein ?? 0;
        fixedFat += (md as any).fat ?? 0;
        fixedCarbs += (md as any).carbs ?? 0;
      }
    }

    // Target for the new single meal
    const neededCals = dailyTargetCals - fixedCals;
    const neededProtein = dailyTargetProtein - fixedProtein;
    const neededFat = dailyTargetFat - fixedFat;
    const neededCarbs = dailyTargetCarbs - fixedCarbs;

    // Tolerance bands per spec: cals ±5%, protein -5/+15%, fat ±10%, carbs ±10%
    // But applied to the per-meal gap (not daily totals), so use tight scoring
    const isInBand = (actual: number, target: number, minPct: number, maxPct: number) => {
      if (target <= 0) return true; // no meaningful target
      const ratio = actual / target;
      return ratio >= minPct && ratio <= maxPct;
    };

    // Score each candidate: prioritize calorie match (70%) + macro fit (30%)
    const scored = candidates.map((m) => {
      const calScore = 1.0 - Math.min(Math.abs(m.calories - neededCals) / Math.max(neededCals, 1), 1.0);
      const proteinScore = 1.0 - Math.min(Math.abs((m as any).protein - neededProtein) / Math.max(neededProtein, 1), 1.0);
      const fatScore = 1.0 - Math.min(Math.abs((m as any).fat - neededFat) / Math.max(neededFat, 1), 1.0);
      const carbScore = 1.0 - Math.min(Math.abs((m as any).carbs - neededCarbs) / Math.max(neededCarbs, 1), 1.0);
      return { meal: m, score: calScore * 0.5 + proteinScore * 0.25 + fatScore * 0.125 + carbScore * 0.125 };
    });
    scored.sort((a, b) => b.score - a.score);

    // Try top 10 candidates, pick first one that keeps the day within spec tolerance bands
    let newMeal = scored[0].meal;
    let foundInBand = false;
    for (let attempt = 0; attempt < Math.min(10, scored.length); attempt++) {
      const m = scored[attempt].meal;
      const dayTotalCals = fixedCals + m.calories;
      const dayTotalProtein = fixedProtein + ((m as any).protein ?? 0);
      if (
        isInBand(dayTotalCals, dailyTargetCals, 0.95, 1.05) &&
        isInBand(dayTotalProtein, dailyTargetProtein, 0.95, 1.15)
      ) {
        newMeal = m;
        foundInBand = true;
        break;
      }
    }
    // If no candidate hits the day tolerance, use closest match (scored[0]) and allow it
    if (!foundInBand) {
      newMeal = scored[0].meal;
    }

    const days = [...plan.days];
    const meals = [...days[args.dayIndex].meals];
    meals[args.mealIndex] = { ...meals[args.mealIndex], mealId: newMeal._id, skipped: undefined };
    days[args.dayIndex] = { ...days[args.dayIndex], meals };

    const swapHistory = [...plan.swapHistory];
    if (meal.mealId) swapHistory.push(meal.mealId);

    const newVersion = ((plan as any).version ?? 0) + 1;
    await ctx.db.patch(plan._id, { days, swapHistory, version: newVersion });

    // Auto-sync grocery list
    await ctx.scheduler.runAfter(0, internal.grocery.syncGroceryFromPlan, { userId });

    return newMeal;
  },
});

export const skipMeal = mutation({
  args: {
    dayIndex: v.number(),
    mealIndex: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const plans = await ctx.db.query("mealPlans").withIndex("by_userId", (q) => q.eq("userId", userId)).collect();
    const plan = plans[plans.length - 1];
    if (!plan) throw new Error("No meal plan found");

    const days = [...plan.days];
    const meals = [...days[args.dayIndex].meals];
    const currentMeal = meals[args.mealIndex];
    const isCurrentlySkipped = currentMeal.skipped ?? false;
    meals[args.mealIndex] = { ...currentMeal, skipped: !isCurrentlySkipped, completed: false };
    days[args.dayIndex] = { ...days[args.dayIndex], meals };

    const newVersion = ((plan as any).version ?? 0) + 1;
    await ctx.db.patch(plan._id, { days, version: newVersion });

    // Auto-sync grocery list (skip changes quantities)
    await ctx.scheduler.runAfter(0, internal.grocery.syncGroceryFromPlan, { userId });

    return null;
  },
});

/**
 * Internal mutation — regenerate plan for a given userId.
 * Called by updateProfile when diet-affecting fields change.
 */
export const regenerateForUser = internalMutation({
  args: { userId: v.id("users") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = args.userId;
    const profile = await ctx.db.query("profiles").withIndex("by_userId", (q) => q.eq("userId", userId)).unique();
    if (!profile) return null;

    // Check if a plan exists — only regen if they already have one
    const existingPlans = await ctx.db.query("mealPlans").withIndex("by_userId", (q) => q.eq("userId", userId)).collect();
    if (existingPlans.length === 0) return null;

    const allMeals = await ctx.db.query("meals").collect();
    if (allMeals.length === 0) return null;

    const userProfile = {
      dietPreference: profile.dietPreference,
      allergens: (profile as any).allergens as string[] | undefined,
      cookingPreference: profile.cookingPreference,
      maxCookTime: (profile as any).maxCookTime as number | undefined,
      budgetLevel: profile.budgetLevel,
      dislikedFoods: (profile as any).dislikedFoods as string[] | undefined,
    };

    // Category pools — HARD filtered
    const breakfasts = allMeals.filter((m) => m.category === "breakfast");
    const lunches = allMeals.filter((m) => m.category === "lunch");
    const dinners = allMeals.filter((m) => m.category === "dinner");
    const snacks = allMeals.filter((m) => m.category === "snack");

    const filteredBreakfasts = hardFilterForUser(breakfasts, userProfile, "breakfast");
    const filteredLunches = hardFilterForUser(lunches, userProfile, "lunch");
    const filteredDinners = hardFilterForUser(dinners, userProfile, "dinner");
    const filteredSnacks = hardFilterForUser(snacks, userProfile, "snack");

    // If not enough meals, bail silently for internal mutation
    if (filteredBreakfasts.length === 0 || filteredLunches.length === 0 || filteredDinners.length === 0) {
      return null;
    }

    const varietyConfig: Record<string, number> = { low: 14, medium: 21, high: 28, ultra: 35 };
    const minUnique = varietyConfig[profile.varietyDepth] || 21;

    const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() + 1);

    const usedBreakfasts: Set<string> = new Set();
    const usedLunches: Set<string> = new Set();
    const usedDinners: Set<string> = new Set();
    const usedSnacks: Set<string> = new Set();

    const targetCals = profile.targetCalories || 2000;
    const targetProteinDaily = (profile as any).targetProtein as number | undefined || Math.round(targetCals * 0.30 / 4);
    const regenTargetCarbs = (profile as any).targetCarbs as number | undefined;
    const regenTargetFat = (profile as any).targetFat as number | undefined;
    const regenPrimaryDiet = ((profile as any).dietPreferences as string[] | undefined)?.[0] || profile.dietPreference || "balanced";

    /** Diet-aware meal scorer for regenerate */
    const scoreMealRegen = (meal: Doc<"meals">, slotTargetCals: number, slotTargetProtein: number): number => {
      let score = 1.0;
      const calDiff = Math.abs(meal.calories - slotTargetCals);
      score -= Math.min(calDiff / 800, 0.5);
      // Protein — same heavy weighting as main generator
      const proteinDiff = Math.abs(meal.protein - slotTargetProtein);
      const proteinRatio = slotTargetProtein > 0 ? proteinDiff / slotTargetProtein : 0;
      score -= Math.min(proteinRatio * 1.5, 1.2);
      if (slotTargetProtein > 0 && meal.protein >= slotTargetProtein * 0.90) score += 0.4;
      if (slotTargetProtein > 0 && meal.protein >= slotTargetProtein && meal.protein <= slotTargetProtein * 1.15) score += 0.2;
      if (regenPrimaryDiet === "keto" || regenPrimaryDiet === "carnivore") {
        const carbLimit = regenPrimaryDiet === "carnivore" ? 5 : 15;
        if (meal.carbs > carbLimit * 2) score -= 1.0;
        else if (meal.carbs > carbLimit) score -= 0.5;
        const fatRatio = (meal.fat * 9) / Math.max(meal.calories, 1);
        if (fatRatio >= 0.60) score += 0.3;
      } else if (regenPrimaryDiet === "high_protein" || regenPrimaryDiet === "med_high_protein") {
        const protRatio = (meal.protein * 4) / Math.max(meal.calories, 1);
        if (protRatio >= 0.35) score += 0.3;
      } else if (regenPrimaryDiet === "low_carb") {
        if (meal.carbs > 40) score -= 0.4;
      }
      if (regenTargetCarbs) {
        const slotCarbTarget = regenTargetCarbs * (slotTargetCals / targetCals);
        score -= Math.min(Math.abs(meal.carbs - slotCarbTarget) / 100, 0.3);
      }
      if (regenTargetFat) {
        const slotFatTarget = regenTargetFat * (slotTargetCals / targetCals);
        score -= Math.min(Math.abs(meal.fat - slotFatTarget) / 80, 0.3);
      }
      return score;
    };

    const selectMeal = (pool: Doc<"meals">[], used: Set<string>, slotTargetCals: number, slotTargetProtein: number): Doc<"meals"> => {
      const unused = pool.filter((m) => !used.has(m._id));
      const candidates = unused.length > 0 ? unused : pool;
      const scored = candidates.map(m => ({ meal: m, score: scoreMealRegen(m, slotTargetCals, slotTargetProtein) }));
      scored.sort((a, b) => b.score - a.score);
      const topN = scored.slice(0, Math.min(5, scored.length));
      const pick = topN[Math.floor(Math.random() * topN.length)].meal;
      used.add(pick._id);
      if (used.size >= Math.min(minUnique, pool.length)) {
        used.clear();
        used.add(pick._id);
      }
      return pick;
    };

    const selectMealExactRegen = (pool: Doc<"meals">[], used: Set<string>, exactCals: number, slotTargetProtein: number): Doc<"meals"> => {
      const unused = pool.filter((m) => !used.has(m._id));
      const candidates = unused.length > 0 ? unused : pool;
      const scored = candidates.map(m => {
        const calScore = 1.0 - Math.min(Math.abs(m.calories - exactCals) / Math.max(exactCals, 1), 1.0);
        const macroScore = (scoreMealRegen(m, exactCals, slotTargetProtein) + 1.0) / 3.0;
        return { meal: m, score: calScore * 0.7 + macroScore * 0.3 };
      });
      scored.sort((a, b) => b.score - a.score);
      const pick = scored[0].meal;
      used.add(pick._id);
      if (used.size >= Math.min(minUnique, pool.length)) {
        used.clear();
        used.add(pick._id);
      }
      return pick;
    };
    const mealsPerDay = (profile as any).mealsPerDay as string | undefined;
    const hasSnacks = filteredSnacks.length > 0;

    type SlotConfig = { slot: string; pool: Doc<"meals">[]; used: Set<string>; calPct: number };
    const buildSlots = (): SlotConfig[] => {
      switch (mealsPerDay) {
        case "3":
          return [
            { slot: "breakfast", pool: filteredBreakfasts, used: usedBreakfasts, calPct: 0.30 },
            { slot: "lunch", pool: filteredLunches, used: usedLunches, calPct: 0.35 },
            { slot: "dinner", pool: filteredDinners, used: usedDinners, calPct: 0.35 },
          ];
        case "3+1":
          return [
            { slot: "breakfast", pool: filteredBreakfasts, used: usedBreakfasts, calPct: hasSnacks ? 0.25 : 0.30 },
            { slot: "lunch", pool: filteredLunches, used: usedLunches, calPct: hasSnacks ? 0.30 : 0.35 },
            { slot: "dinner", pool: filteredDinners, used: usedDinners, calPct: hasSnacks ? 0.30 : 0.35 },
            ...(hasSnacks ? [{ slot: "snack", pool: filteredSnacks, used: usedSnacks, calPct: 0.15 }] : []),
          ];
        case "3+2":
          return [
            { slot: "breakfast", pool: filteredBreakfasts, used: usedBreakfasts, calPct: hasSnacks ? 0.22 : 0.30 },
            { slot: "lunch", pool: filteredLunches, used: usedLunches, calPct: hasSnacks ? 0.28 : 0.35 },
            { slot: "dinner", pool: filteredDinners, used: usedDinners, calPct: hasSnacks ? 0.28 : 0.35 },
            ...(hasSnacks ? [
              { slot: "snack_1", pool: filteredSnacks, used: usedSnacks, calPct: 0.11 },
              { slot: "snack_2", pool: filteredSnacks, used: usedSnacks, calPct: 0.11 },
            ] : []),
          ];
        case "4":
          return [
            { slot: "breakfast", pool: filteredBreakfasts, used: usedBreakfasts, calPct: 0.25 },
            { slot: "lunch", pool: filteredLunches, used: usedLunches, calPct: 0.25 },
            { slot: "dinner", pool: filteredDinners, used: usedDinners, calPct: 0.25 },
            ...(hasSnacks ? [{ slot: "snack", pool: filteredSnacks, used: usedSnacks, calPct: 0.25 }] : []),
          ];
        case "5-6":
          return [
            { slot: "breakfast", pool: filteredBreakfasts, used: usedBreakfasts, calPct: 0.18 },
            ...(hasSnacks ? [{ slot: "snack_1", pool: filteredSnacks, used: usedSnacks, calPct: 0.12 }] : []),
            { slot: "lunch", pool: filteredLunches, used: usedLunches, calPct: 0.22 },
            ...(hasSnacks ? [{ slot: "snack_2", pool: filteredSnacks, used: usedSnacks, calPct: 0.12 }] : []),
            { slot: "dinner", pool: filteredDinners, used: usedDinners, calPct: 0.22 },
            ...(hasSnacks ? [{ slot: "snack_3", pool: filteredSnacks, used: usedSnacks, calPct: 0.14 }] : []),
          ];
        default:
          return [
            { slot: "breakfast", pool: filteredBreakfasts, used: usedBreakfasts, calPct: hasSnacks ? 0.25 : 0.30 },
            { slot: "lunch", pool: filteredLunches, used: usedLunches, calPct: hasSnacks ? 0.35 : 0.35 },
            { slot: "dinner", pool: filteredDinners, used: usedDinners, calPct: hasSnacks ? 0.30 : 0.35 },
            ...(hasSnacks ? [{ slot: "snack", pool: filteredSnacks, used: usedSnacks, calPct: 0.10 }] : []),
          ];
      }
    };

    const slotConfigs = buildSlots();
    let totalCalories = 0;
    let totalProtein = 0;

    const days = dayNames.map((dayName, i) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      const dateStr = date.toISOString().split("T")[0];

      // Last-slot fill: pick all slots except last normally, use last to hit calorie target
      const dayMeals2: Array<{ slot: string; mealId: Id<"meals">; completed: boolean }> = [];
      let runningCals2 = 0;
      for (let si = 0; si < slotConfigs.length; si++) {
        const sc = slotConfigs[si];
        const proteinTarget = Math.round(targetProteinDaily * sc.calPct);
        let meal: Doc<"meals">;
        if (si === slotConfigs.length - 1 && slotConfigs.length > 1) {
          const remainingNeeded = targetCals - runningCals2;
          meal = selectMealExactRegen(sc.pool, sc.used, remainingNeeded, proteinTarget);
        } else {
          const calTarget = Math.round(targetCals * sc.calPct);
          meal = selectMeal(sc.pool, sc.used, calTarget, proteinTarget);
        }
        runningCals2 += meal.calories;
        dayMeals2.push({ slot: sc.slot, mealId: meal._id, completed: false });
      }

      for (const m of dayMeals2) {
        const md = allMeals.find((x) => x._id === m.mealId);
        if (md) { totalCalories += md.calories; totalProtein += md.protein; }
      }

      return { date: dateStr, dayName, meals: dayMeals2 };
    });

    // Delete old plans
    for (const old of existingPlans) {
      await ctx.db.delete(old._id);
    }

    await ctx.db.insert("mealPlans", {
      userId,
      weekStart: weekStart.toISOString().split("T")[0],
      days,
      totalCalories: Math.round(totalCalories / 7),
      totalProtein: Math.round(totalProtein / 7),
      swapHistory: [],
      version: 1,
    });

    // Auto-sync grocery list
    await ctx.scheduler.runAfter(0, internal.grocery.syncGroceryFromPlan, { userId });

    return null;
  },
});
