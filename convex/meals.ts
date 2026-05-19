import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query, internalMutation, internalQuery, action } from "./_generated/server";
import { v } from "convex/values";
import { getAllMealsData, validateMealsDatabase } from "./mealsDatabase";
import { internal, api } from "./_generated/api";

export const getAllMeals = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return await ctx.db.query("meals").collect();
  },
});

export const getMealsByCategory = query({
  args: { category: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.query("meals").withIndex("by_category", (q) => q.eq("category", args.category)).collect();
  },
});

export const getMeal = query({
  args: { id: v.id("meals") },
  returns: v.any(),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

/** Auto-assign budgetTier based on ingredients */
function determineBudgetTier(meal: any): "low" | "moderate" | "premium" {
  const premiumIngredients = ["salmon", "shrimp", "ribeye", "steak", "lamb", "cod", "tilapia", "lobster", "scallop", "swordfish", "mahi", "crab", "wagyu", "filet", "tenderloin", "prosciutto", "smoked salmon", "bison"];
  const lowIngredients = ["oats", "rice", "egg", "banana", "bread", "tortilla", "peanut butter", "beans", "lentil", "potato", "pasta", "chicken breast", "ground turkey", "ground beef", "tuna"];

  const allIngredients = meal.ingredients.map((i: any) => i.name.toLowerCase()).join(" ");
  const hasPremium = premiumIngredients.some((p) => allIngredients.includes(p));
  const hasLow = lowIngredients.some((l) => allIngredients.includes(l));

  if (hasPremium) return "premium";
  if (hasLow && !hasPremium) return "low";
  return "moderate";
}

export const seedMeals = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    // Check if meals already seeded
    const existing = await ctx.db.query("meals").first();
    if (existing) return null;

    // ── Pre-seed validation ──
    const violations = validateMealsDatabase();
    if (violations.length > 0) {
      console.error("MEAL VALIDATION FAILURES:", violations.slice(0, 10));
      // Don't block seed — log warnings but allow
    }

    const mealsData = getAllMealsData();
    for (const meal of mealsData) {
      await ctx.db.insert("meals", {
        name: meal.name,
        category: meal.category,
        calories: meal.calories,
        protein: meal.protein,
        carbs: meal.carbs,
        fat: meal.fat,
        fiber: meal.fiber,
        ingredients: meal.ingredients.map(i => ({ name: i.name, amount: i.amount, unit: i.unit })),
        instructions: meal.instructions,
        prepTime: meal.prepTime,
        cookTime: meal.cookTime,
        cookSetting: meal.cookSetting,
        difficulty: meal.difficulty,
        cookingLevel: meal.cookingLevel ?? "none",
        tags: meal.tags,
        compatibleDiets: meal.compatibleDiets,
        forbiddenFor: meal.forbiddenFor,
        allergensPresent: meal.allergensPresent,
        imageEmoji: meal.imageEmoji,
        mealPrepTips: meal.mealPrepTips,
        budgetTier: meal.budgetTier || determineBudgetTier(meal),
      });
    }
    return null;
  },
});

/** Force re-seed: delete all meals and re-insert with latest data */
export const reseedMeals = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    // ── Pre-seed validation ──
    const violations = validateMealsDatabase();
    if (violations.length > 0) {
      console.error("MEAL VALIDATION FAILURES:", violations.slice(0, 10));
    }

    const existing = await ctx.db.query("meals").collect();
    for (const m of existing) {
      await ctx.db.delete(m._id);
    }

    const mealsData = getAllMealsData();
    for (const meal of mealsData) {
      await ctx.db.insert("meals", {
        name: meal.name,
        category: meal.category,
        calories: meal.calories,
        protein: meal.protein,
        carbs: meal.carbs,
        fat: meal.fat,
        fiber: meal.fiber,
        ingredients: meal.ingredients.map(i => ({ name: i.name, amount: i.amount, unit: i.unit })),
        instructions: meal.instructions,
        prepTime: meal.prepTime,
        cookTime: meal.cookTime,
        cookSetting: meal.cookSetting,
        difficulty: meal.difficulty,
        cookingLevel: meal.cookingLevel ?? "none",
        tags: meal.tags,
        compatibleDiets: meal.compatibleDiets,
        forbiddenFor: meal.forbiddenFor,
        allergensPresent: meal.allergensPresent,
        imageEmoji: meal.imageEmoji,
        mealPrepTips: meal.mealPrepTips,
        budgetTier: meal.budgetTier || determineBudgetTier(meal),
      });
    }
    return null;
  },
});

export const updateMealPrepTips = mutation({
  args: { mealId: v.id("meals"), mealPrepTips: v.array(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.mealId, { mealPrepTips: args.mealPrepTips });
    return null;
  },
});

export const getAllMealsAdmin = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return await ctx.db.query("meals").collect();
  },
});

/** Internal: get a single meal by id (used by action to avoid circular ref) */
export const getMealInternal = internalQuery({
  args: { mealId: v.id("meals") },
  returns: v.any(),
  handler: async (ctx, { mealId }) => {
    return await ctx.db.get(mealId);
  },
});

export const getAllMealsInternal = internalQuery({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    return await ctx.db.query("meals").collect();
  },
});

/** Internal: patch a meal's imageUrl (called from action after generation) */
export const patchMealImageUrlInternal = internalMutation({
  args: { mealId: v.id("meals"), imageUrl: v.string() },
  returns: v.null(),
  handler: async (ctx, { mealId, imageUrl }) => {
    await ctx.db.patch(mealId, { imageUrl });
    return null;
  },
});

/** Public: patch a meal's imageUrl */
export const patchMealImageUrl = mutation({
  args: { mealId: v.id("meals"), imageUrl: v.string() },
  returns: v.null(),
  handler: async (ctx, { mealId, imageUrl }) => {
    await ctx.db.patch(mealId, { imageUrl });
    return null;
  },
});

/**
 * Generate a realistic AI photo for a meal and cache it in the DB.
 * If the meal already has an imageUrl, returns it immediately without generating.
 */
export const generateAndCacheMealImage: ReturnType<typeof action> = action({
  args: { mealId: v.id("meals") },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, { mealId }: { mealId: any }): Promise<string | null> => {
    // Check if already generated
    const meal: any = await ctx.runQuery(internal.meals.getMealInternal, { mealId });
    if (!meal) return null;
    if (meal.imageUrl) return meal.imageUrl as string;

    const mealName: string = meal.name;

    // Build a detailed food photography prompt
    const prompt = `Professional food photography of ${mealName}, overhead shot, natural daylight, styled on a clean minimal plate, vibrant fresh ingredients, ultra realistic, magazine quality, 4k, shallow depth of field`;

    try {
      const imageUrl: string = await ctx.runAction(api.viktorTools.generateImage, {
        prompt,
        aspectRatio: "4:3",
      });

      if (imageUrl && imageUrl.length > 10) {
        await ctx.runMutation(internal.meals.patchMealImageUrlInternal, { mealId, imageUrl });
        return imageUrl;
      }
      console.error("generateAndCacheMealImage: got empty/invalid URL for", mealName, "url:", imageUrl);
      return null;
    } catch (err) {
      console.error("Failed to generate meal image for", mealName, err);
      return null;
    }
  },
});

/** Toggle save/favorite a meal for the current user */
export const toggleSaveMeal = mutation({
  args: { mealId: v.id("meals") },
  returns: v.boolean(), // true = now saved, false = now unsaved
  handler: async (ctx, { mealId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existing = await ctx.db
      .query("savedMeals")
      .withIndex("by_userId_mealId", (q) => q.eq("userId", userId).eq("mealId", mealId))
      .unique();
    if (existing) {
      await ctx.db.delete(existing._id);
      return false;
    } else {
      await ctx.db.insert("savedMeals", { userId, mealId });
      return true;
    }
  },
});

/** Check if the current user has saved a meal */
export const isMealSaved = query({
  args: { mealId: v.id("meals") },
  returns: v.boolean(),
  handler: async (ctx, { mealId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;
    const existing = await ctx.db
      .query("savedMeals")
      .withIndex("by_userId_mealId", (q) => q.eq("userId", userId).eq("mealId", mealId))
      .unique();
    return !!existing;
  },
});

/** Get all saved meals for the current user */
export const getSavedMeals = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const saved = await ctx.db
      .query("savedMeals")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    const meals = await Promise.all(
      saved.map((s) => ctx.db.get(s.mealId))
    );
    return meals.filter(Boolean);
  },
});
