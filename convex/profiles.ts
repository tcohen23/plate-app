import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

/* ══════════════════════════════════════════════════════════════════════════
   NUTRITION SCIENCE CALCULATIONS
   All formulas are evidence-based and sourced from:
   - Mifflin-St Jeor (1990) for BMR
   - ISSN Position Stand on protein (Jäger et al., 2017)
   - Schoenfeld & Aragon, JISSN 2018 (per-meal protein)
   - ACSM/AND/DC Joint Position Statement on Nutrition & Athletic Performance
   - 2020-2025 Dietary Guidelines for Americans (calorie floors)
   - Sawka et al., 2007 (ACSM hydration)
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * BMR via Mifflin-St Jeor — most accurate for general population.
 * Male:   (10 × kg) + (6.25 × cm) − (5 × age) + 5
 * Female: (10 × kg) + (6.25 × cm) − (5 × age) − 161
 */
function calculateBMR(weight: number, height: number, age: number, gender: string): number {
  const weightKg = weight * 0.453592;
  const heightCm = height * 2.54;
  if (gender === "male") {
    return 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  }
  return 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
}

/**
 * TDEE = BMR × activity multiplier (Katch-McArdle validated ranges).
 */
function calculateTDEE(bmr: number, activityLevel: string): number {
  const multipliers: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };
  return Math.round(bmr * (multipliers[activityLevel] || 1.55));
}

/**
 * Calorie target with SAFETY FLOORS per Tyler's macro spec v2.
 *
 * Goal multipliers applied to TDEE:
 *   Aggressive Cut: ×0.70, Moderate Cut: ×0.80, Light Cut: ×0.90
 *   Maintenance: ×1.00, Light Bulk: ×1.10, Moderate Bulk: ×1.20, Aggressive Bulk: ×1.30
 *
 * Safety floor = max(gender_floor, BMR):
 *   Male: max(1500, BMR) | Female: max(1200, BMR)
 * Never allow calories to fall below BMR (per InBody and sports nutrition guidance).
 *
 * Returns { calories, floorActivated } so callers can surface the warning banner.
 */
function calculateTargetCalories(tdee: number, goal: string, gender: string, bmr: number): { calories: number; floorActivated: boolean } {
  const multipliers: Record<string, number> = {
    aggressive_cut: 0.70,
    moderate_cut: 0.80,
    light_cut: 0.90,
    maintenance: 1.00,
    light_bulk: 1.10,
    moderate_bulk: 1.20,
    aggressive_bulk: 1.30,
  };
  const mult = multipliers[goal] ?? 1.00;
  const rawTarget = Math.round(tdee * mult);

  const genderFloor = gender === "female" ? 1200 : 1500;
  const floor = Math.max(genderFloor, Math.round(bmr));
  const calories = Math.max(rawTarget, floor);
  return { calories, floorActivated: rawTarget < floor };
}

/**
 * Macro calculator — Tyler's Macro Spec v2.
 *
 * Order of operations (spec section 4):
 *   1. Protein first (g/kg bodyweight, goal-scaled, 40% kcal cap)
 *   2. Fat second (g/kg bodyweight, goal-scaled, floor at 20-25% kcal, hard floor 0.66 g/kg)
 *   3. Carbs fill the remainder (floor 50g unless keto/carnivore)
 *
 * Diet style overrides applied AFTER base calculation.
 * Katch-McArdle override: if bodyFatPct provided and < threshold, use LBM-based BMR
 *   (caller must pass bodyFatPct; we return adjusted macros).
 *
 * Returns: { protein, carbs, fat, proteinGkg, proteinCapped, carbWarning }
 */
function calculateMacros(
  targetCalories: number,
  weight: number,
  goal: string,
  dietPreference?: string,
  usesGlp1?: boolean,
) {
  const weightKg = weight * 0.453592;
  const isCutting = goal.includes("cut");
  const isPlantBased = ["vegan", "vegetarian", "pescatarian"].includes(dietPreference || "");

  // ── STEP 1: Protein (g/kg by goal per spec section 4) ──────────────────
  // Base protein multiplier by goal (spec table)
  const goalProteinGkg: Record<string, number> = {
    aggressive_cut:  2.3,
    moderate_cut:    2.1,
    light_cut:       1.9,
    maintenance:     1.7,
    light_bulk:      1.7,
    moderate_bulk:   1.6,
    aggressive_bulk: 1.6,
  };
  let proteinGkg = goalProteinGkg[goal] ?? 1.7;

  // Diet style protein modifier (spec diet overrides table)
  const dietProteinMult: Record<string, number> = {
    high_protein:     1.15,
    med_high_protein: 1.05,
    moderate_protein: 1.00,
    low_protein:      0.85,
    balanced:         1.00,
    carnivore:        1.00,   // handled separately below
    keto:             1.00,   // handled separately below
  };
  const dietMult = dietProteinMult[dietPreference || "balanced"] ?? 1.00;
  proteinGkg = proteinGkg * dietMult;

  // GLP-1 floor: minimum 1.4 g/kg, or 1.6 if cutting
  if (usesGlp1) {
    proteinGkg = Math.max(proteinGkg, isCutting ? 1.6 : 1.4);
  }

  // Plant-based digestibility +10% (lower DIAAS, need more total protein)
  if (isPlantBased) {
    proteinGkg *= 1.10;
  }

  let protein = Math.round(weightKg * proteinGkg);
  let proteinCapped = false;

  // 40% kcal cap on protein (rare edge case at low cals / high bodyweight)
  const maxProteinFromCap = Math.round((targetCalories * 0.40) / 4);
  if (protein > maxProteinFromCap) {
    protein = maxProteinFromCap;
    proteinCapped = true;
  }

  const proteinKcal = protein * 4;

  // ── STEP 2: Fat (g/kg by goal, with floor per spec section 4) ──────────
  const goalFatGkg: Record<string, number> = {
    aggressive_cut:  0.6,
    moderate_cut:    0.7,
    light_cut:       0.8,
    maintenance:     0.9,
    light_bulk:      0.95,
    moderate_bulk:   0.95,
    aggressive_bulk: 1.0,
  };
  const fatGkg = goalFatGkg[goal] ?? 0.9;

  const goalFatFloorPct: Record<string, number> = {
    aggressive_cut:  0.20,
    moderate_cut:    0.20,
    light_cut:       0.20,
    maintenance:     0.25,
    light_bulk:      0.25,
    moderate_bulk:   0.25,
    aggressive_bulk: 0.25,
  };
  const fatFloorPct = goalFatFloorPct[goal] ?? 0.25;

  let fatKcalInitial = weightKg * fatGkg * 9;
  const fatPctInitial = fatKcalInitial / targetCalories;
  let fatKcal: number;
  if (fatPctInitial < fatFloorPct) {
    fatKcal = targetCalories * fatFloorPct;
  } else {
    fatKcal = fatKcalInitial;
  }

  // Hard floor: never below 0.66 g/kg bodyweight (Whittaker 2021: sex hormones)
  const hardFatFloor = weightKg * 0.66 * 9;
  fatKcal = Math.max(fatKcal, hardFatFloor);

  let fat = Math.round(fatKcal / 9);

  // ── STEP 3: Carbs fill the remainder ───────────────────────────────────
  let carbKcal = targetCalories - proteinKcal - (fat * 9);
  let carbs = Math.round(carbKcal / 4);
  let carbWarning = false;

  // Carb floor: 50g minimum (don't ship <50g unless keto/carnivore)
  if (carbs < 50 && dietPreference !== "keto" && dietPreference !== "carnivore") {
    carbWarning = true;
    carbs = 50;
    // Re-derive fat to fit: (targetCals - proteinKcal - 50*4) / 9
    fat = Math.max(Math.round((targetCalories - proteinKcal - 200) / 9), fat);
  }

  // ── DIET STYLE OVERRIDES ────────────────────────────────────────────────
  // Note: "balanced" has NO override — goal-based protein always takes priority.
  // The formula above (protein-first → fat-second → carbs fill) is the spec default.

  // Keto: carbs hard cap 25g, fat fills rest
  if (dietPreference === "keto") {
    const ketoCarbs = 25;
    const ketoCarbKcal = ketoCarbs * 4;
    fat   = Math.round((targetCalories - proteinKcal - ketoCarbKcal) / 9);
    fat   = Math.max(fat, Math.round(hardFatFloor / 9));
    return { protein, carbs: ketoCarbs, fat, proteinGkg: Math.round(proteinGkg * 10) / 10, proteinCapped, carbWarning: false };
  }

  // Carnivore: carbs 10g, protein 30% of kcal, fat fills rest
  if (dietPreference === "carnivore") {
    const carnCarbs = 10;
    const carnProtein = Math.round((targetCalories * 0.30) / 4);
    const carnFat = Math.round((targetCalories - carnProtein * 4 - carnCarbs * 4) / 9);
    return { protein: carnProtein, carbs: carnCarbs, fat: Math.max(carnFat, Math.round(hardFatFloor / 9)), proteinGkg: Math.round(proteinGkg * 10) / 10, proteinCapped, carbWarning: false };
  }

  // Low Carb: carbs capped at 100g, fat fills rest
  if (dietPreference === "low_carb") {
    carbs = Math.min(carbs, 100);
    fat   = Math.round((targetCalories - proteinKcal - carbs * 4) / 9);
    fat   = Math.max(fat, Math.round(hardFatFloor / 9));
    return { protein, carbs, fat, proteinGkg: Math.round(proteinGkg * 10) / 10, proteinCapped, carbWarning };
  }

  // High Carb: carbs minimum 50% of kcal, fat minimum still applies
  if (dietPreference === "high_carb") {
    const minCarbKcal = targetCalories * 0.50;
    if (carbKcal < minCarbKcal) {
      carbs = Math.round(minCarbKcal / 4);
      fat   = Math.max(Math.round((targetCalories - proteinKcal - carbs * 4) / 9), Math.round(hardFatFloor / 9));
    }
    return { protein, carbs, fat, proteinGkg: Math.round(proteinGkg * 10) / 10, proteinCapped, carbWarning };
  }

  // Low Fat: fat = 20% of kcal (floor), carbs fill rest
  if (dietPreference === "low_fat") {
    fat   = Math.round((targetCalories * 0.20) / 9);
    fat   = Math.max(fat, Math.round(hardFatFloor / 9));
    carbs = Math.round((targetCalories - proteinKcal - fat * 9) / 4);
    carbs = Math.max(carbs, 50);
    return { protein, carbs, fat, proteinGkg: Math.round(proteinGkg * 10) / 10, proteinCapped, carbWarning };
  }

  // Mediterranean: fat 35% (mostly mono/poly), protein default, carbs fill
  if (dietPreference === "mediterranean") {
    fat   = Math.round((targetCalories * 0.35) / 9);
    carbs = Math.round((targetCalories - proteinKcal - fat * 9) / 4);
    carbs = Math.max(carbs, 50);
    return { protein, carbs, fat, proteinGkg: Math.round(proteinGkg * 10) / 10, proteinCapped, carbWarning };
  }

  return { protein, carbs, fat, proteinGkg: Math.round(proteinGkg * 10) / 10, proteinCapped, carbWarning };
}

/**
 * Personalized hydration target.
 * Formula: bodyweight_kg × 35 mL + activity bonus + GLP-1 bonus
 * Source: IOM DRI; ACSM (Sawka et al., 2007)
 */
function calculateHydration(weight: number, activityLevel: string, usesGlp1?: boolean): { glasses: number; mL: number } {
  const weightKg = weight * 0.453592;
  let mL = Math.round(weightKg * 35);

  // Activity bonus: estimate 30-min exercise sessions per week, add 200mL per session
  const activityBonus: Record<string, number> = {
    sedentary: 0,
    light: 200,      // ~1 session worth
    moderate: 400,    // ~2 sessions
    active: 600,      // ~3 sessions
    very_active: 800, // ~4 sessions
  };
  mL += activityBonus[activityLevel] || 0;

  // GLP-1 bonus: +500 mL (medication can cause dehydration via reduced thirst signals)
  if (usesGlp1) {
    mL += 500;
  }

  const glasses = Math.round(mL / 240); // 1 glass = 8 oz = 240 mL
  return { glasses, mL };
}

/* ══════════════════════════════════════════════════════════════════════════
   QUERIES
   ══════════════════════════════════════════════════════════════════════════ */

export const getProfile = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db.query("profiles").withIndex("by_userId", (q) => q.eq("userId", userId)).unique();
  },
});

/* ══════════════════════════════════════════════════════════════════════════
   MUTATIONS
   ══════════════════════════════════════════════════════════════════════════ */

export const createProfile = mutation({
  args: {
    name: v.string(),
    height: v.number(),
    weight: v.number(),
    age: v.number(),
    gender: v.string(),
    activityLevel: v.string(),
    goal: v.string(),
    mealStructure: v.string(),
    varietyDepth: v.string(),
    cookingPreference: v.string(),
    budgetLevel: v.string(),
    zipCode: v.string(),
    goesToGym: v.optional(v.string()),
    workoutGoal: v.optional(v.string()),
    experienceLevel: v.optional(v.string()),
    workoutFrequency: v.optional(v.string()),
    workoutSplit: v.optional(v.string()),
    gymType: v.optional(v.string()),
    equipment: v.optional(v.array(v.string())),
    usesGlp1: v.optional(v.boolean()),
    glp1Medication: v.optional(v.string()),
    glp1Dosage: v.optional(v.string()),
    dietPreference: v.optional(v.string()),
    dietPreferences: v.optional(v.array(v.string())),
    allergens: v.optional(v.array(v.string())),
    maxCookTime: v.optional(v.number()),
    mealsPerDay: v.optional(v.string()),
    favoriteFoods: v.optional(v.array(v.string())),
    dislikedFoods: v.optional(v.array(v.string())),
  },
  returns: v.id("profiles"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db.query("profiles").withIndex("by_userId", (q) => q.eq("userId", userId)).unique();
    if (existing) {
      await ctx.db.delete(existing._id);
    }

    const bmr = calculateBMR(args.weight, args.height, args.age, args.gender);
    const tdee = calculateTDEE(bmr, args.activityLevel);
    const { calories: targetCalories, floorActivated } = calculateTargetCalories(tdee, args.goal, args.gender, bmr);
    // Primary diet = first selected (drives macros); all diets stored for meal filtering
    const primaryDiet = (args.dietPreferences && args.dietPreferences.length > 0)
      ? args.dietPreferences[0]
      : args.dietPreference;
    const macros = calculateMacros(targetCalories, args.weight, args.goal, primaryDiet, args.usesGlp1);
    const hydration = calculateHydration(args.weight, args.activityLevel, args.usesGlp1);

    const profileId = await ctx.db.insert("profiles", {
      userId,
      ...args,
      dietPreference: primaryDiet,
      bmr: Math.round(bmr),
      tdee,
      targetCalories,
      targetProtein: macros.protein,
      targetCarbs: macros.carbs,
      targetFat: macros.fat,
      proteinGkg: macros.proteinGkg,
      calorieFloorActivated: floorActivated,
      hydrationTarget: hydration.glasses,
      hydrationMl: hydration.mL,
      onboardingComplete: true,
    });

    // Initialize user stats
    const existingStats = await ctx.db.query("userStats").withIndex("by_userId", (q) => q.eq("userId", userId)).unique();
    if (!existingStats) {
      await ctx.db.insert("userStats", {
        userId,
        xp: 0,
        level: 1,
        currentStreak: 0,
        longestStreak: 0,
        totalMealsLogged: 0,
        totalWorkoutsLogged: 0,
        proteinGoalStreak: 0,
      });
    }

    return profileId;
  },
});

export const updateProfile = mutation({
  args: {
    name: v.optional(v.string()),
    lastName: v.optional(v.string()),
    phone: v.optional(v.string()),
    height: v.optional(v.number()),
    weight: v.optional(v.number()),
    age: v.optional(v.number()),
    gender: v.optional(v.string()),
    activityLevel: v.optional(v.string()),
    goal: v.optional(v.string()),
    mealStructure: v.optional(v.string()),
    varietyDepth: v.optional(v.string()),
    cookingPreference: v.optional(v.string()),
    budgetLevel: v.optional(v.string()),
    zipCode: v.optional(v.string()),
    workoutSplit: v.optional(v.string()),
    workoutFrequency: v.optional(v.string()),
    dietPreference: v.optional(v.string()),
    usesGlp1: v.optional(v.boolean()),
    units: v.optional(v.string()),
    allergens: v.optional(v.array(v.string())),
    maxCookTime: v.optional(v.number()),
    mealsPerDay: v.optional(v.string()),
    favoriteFoods: v.optional(v.array(v.string())),
    dislikedFoods: v.optional(v.array(v.string())),
    toastNotifications: v.optional(v.boolean()),
    timezone: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const profile = await ctx.db.query("profiles").withIndex("by_userId", (q) => q.eq("userId", userId)).unique();
    if (!profile) throw new Error("No profile found");

    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(args)) {
      if (value !== undefined) updates[key] = value;
    }

    // Recalculate if relevant fields changed
    const weight = (args.weight ?? profile.weight);
    const height = (args.height ?? profile.height);
    const age = (args.age ?? profile.age);
    const gender = (args.gender ?? profile.gender);
    const activityLevel = (args.activityLevel ?? profile.activityLevel);
    const goal = (args.goal ?? profile.goal);
    const dietPref = (args.dietPreference ?? profile.dietPreference);
    const glp1 = (args.usesGlp1 ?? profile.usesGlp1);

    const bmr = calculateBMR(weight, height, age, gender);
    const tdee = calculateTDEE(bmr, activityLevel);
    const { calories: targetCalories, floorActivated } = calculateTargetCalories(tdee, goal, gender, bmr);
    const macros = calculateMacros(targetCalories, weight, goal, dietPref, glp1);
    const hydration = calculateHydration(weight, activityLevel, glp1);

    updates.bmr = Math.round(bmr);
    updates.tdee = tdee;
    updates.targetCalories = targetCalories;
    updates.targetProtein = macros.protein;
    updates.targetCarbs = macros.carbs;
    updates.targetFat = macros.fat;
    updates.proteinGkg = macros.proteinGkg;
    updates.calorieFloorActivated = floorActivated;
    updates.hydrationTarget = hydration.glasses;
    updates.hydrationMl = hydration.mL;

    await ctx.db.patch(profile._id, updates);

    // ── Auto-regenerate meal plan if diet-affecting fields changed ──
    const planAffectingKeys = [
      "dietPreference", "allergens", "maxCookTime", "cookingPreference",
      "activityLevel", "goal", "weight", "height", "age", "gender", "usesGlp1",
      "mealsPerDay", "budgetLevel", "favoriteFoods", "dislikedFoods",
    ];
    const changedPlanField = planAffectingKeys.some((key) => (args as any)[key] !== undefined);
    if (changedPlanField) {
      await ctx.scheduler.runAfter(0, internal.mealPlans.regenerateForUser, { userId });
    }

    return null;
  },
});

/* ── Recalculate + save macros for the current user (call on app load to fix stale data) ── */
export const recalculateMacros = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const profile = await ctx.db.query("profiles").withIndex("by_userId", (q) => q.eq("userId", userId)).unique();
    if (!profile) return null;

    const weight = profile.weight;
    const height = profile.height;
    const age = (profile as any).age as number | undefined;
    const gender = (profile as any).gender as string | undefined;
    const activityLevel = profile.activityLevel;
    const goal = profile.goal;
    if (!weight || !height || !age || !gender || !activityLevel || !goal) return null;

    const bmr = calculateBMR(weight, height, age, gender);
    const tdee = calculateTDEE(bmr, activityLevel);
    const { calories: targetCalories, floorActivated } = calculateTargetCalories(tdee, goal, gender, bmr);
    const allDiets: string[] = ((profile as any).dietPreferences as string[] | undefined)
      || (profile.dietPreference ? [profile.dietPreference] : ["balanced"]);
    const primaryDiet = allDiets[0] || "balanced";
    const macros = calculateMacros(targetCalories, weight, goal, primaryDiet, (profile as any).usesGlp1);

    await ctx.db.patch(profile._id, {
      targetCalories,
      targetProtein: macros.protein,
      targetCarbs: macros.carbs,
      targetFat: macros.fat,
      bmr: Math.round(bmr),
      tdee,
      calorieFloorActivated: floorActivated,
    } as any);
    return null;
  },
});

/* ── Save timezone silently on app init ── */
export const saveTimezone = mutation({
  args: { timezone: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const profile = await ctx.db.query("profiles").withIndex("by_userId", (q) => q.eq("userId", userId)).unique();
    if (!profile) return null;
    // Only update if changed to avoid noisy writes
    if ((profile as any).timezone !== args.timezone) {
      await ctx.db.patch(profile._id, { timezone: args.timezone });
    }
    return null;
  },
});

/* ── Profile picture upload ── */
export const generateUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.storage.generateUploadUrl();
  },
});

export const updateProfilePicture = mutation({
  args: { storageId: v.id("_storage") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const profile = await ctx.db.query("profiles").withIndex("by_userId", (q) => q.eq("userId", userId)).unique();
    if (!profile) throw new Error("No profile found");
    await ctx.db.patch(profile._id, { profilePictureId: args.storageId });
    return null;
  },
});

export const getProfilePictureUrl = query({
  args: {},
  returns: v.union(v.string(), v.null()),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const profile = await ctx.db.query("profiles").withIndex("by_userId", (q) => q.eq("userId", userId)).unique();
    if (!profile || !(profile as any).profilePictureId) return null;
    return await ctx.storage.getUrl((profile as any).profilePictureId);
  },
});

export const setAvatarChoice = mutation({
  args: { avatarUrl: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const profile = await ctx.db.query("profiles").withIndex("by_userId", (q) => q.eq("userId", userId)).unique();
    if (!profile) throw new Error("No profile found");
    await ctx.db.patch(profile._id, { avatarChoice: args.avatarUrl } as any);
    return null;
  },
});

export const getTotalUserCount = query({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const profiles = await ctx.db.query("profiles").collect();
    return profiles.length;
  },
});
