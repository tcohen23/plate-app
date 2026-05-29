import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getLevelFromXp } from "./levelUtils";

/** Get the client's local date string, falling back to UTC if not provided */
function resolveDate(localDate?: string): string {
  if (localDate) return localDate;
  return new Date().toISOString().split("T")[0];
}

export const getTodaysLog = query({
  args: { localDate: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const today = resolveDate(args.localDate);
    const logs = await ctx.db.query("foodLogs")
      .withIndex("by_userId_date", (q) => q.eq("userId", userId).eq("date", today))
      .collect();
    // Return with mealSlot alias for frontend
    return logs.map((log) => ({ ...log, mealSlot: log.slot }));
  },
});

export const getLogsByDate = query({
  args: { date: v.string(), localDate: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const date = args.date || resolveDate(args.localDate);
    const logs = await ctx.db.query("foodLogs")
      .withIndex("by_userId_date", (q) => q.eq("userId", userId).eq("date", date))
      .collect();
    return logs.map((log) => ({ ...log, mealSlot: log.slot }));
  },
});

export const isAlreadyLoggedToday = query({
  args: { mealId: v.id("meals"), localDate: v.optional(v.string()) },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;
    const today = resolveDate(args.localDate);
    const logs = await ctx.db.query("foodLogs")
      .withIndex("by_userId_date", (q) => q.eq("userId", userId).eq("date", today))
      .collect();
    return logs.some((l) => l.mealId?.toString() === args.mealId.toString());
  },
});

export const logFood = mutation({
  args: {
    name: v.string(),
    calories: v.number(),
    protein: v.number(),
    carbs: v.number(),
    fat: v.number(),
    mealSlot: v.string(),
    servingSize: v.optional(v.string()),
    mealId: v.optional(v.id("meals")),
    localDate: v.optional(v.string()),
    // Micronutrients (optional)
    fiber: v.optional(v.number()),
    sugar: v.optional(v.number()),
    saturatedFat: v.optional(v.number()),
    polyunsaturatedFat: v.optional(v.number()),
    monounsaturatedFat: v.optional(v.number()),
    transFat: v.optional(v.number()),
    cholesterol: v.optional(v.number()),
    sodium: v.optional(v.number()),
    potassium: v.optional(v.number()),
    vitaminA: v.optional(v.number()),
    vitaminC: v.optional(v.number()),
    calcium: v.optional(v.number()),
    iron: v.optional(v.number()),
  },
  returns: v.id("foodLogs"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const today = resolveDate(args.localDate);

    // ── Duplicate prevention: if logging a plan meal, block if already logged today ──
    if (args.mealId) {
      const existing = await ctx.db.query("foodLogs")
        .withIndex("by_userId_date", (q) => q.eq("userId", userId).eq("date", today))
        .collect();
      const alreadyLogged = existing.some((l) => l.mealId?.toString() === args.mealId!.toString());
      if (alreadyLogged) {
        throw new Error("This meal is already logged for today.");
      }
    }

    // If fat subtypes aren't provided, estimate from total fat using average USDA mixed-diet ratios.
    // These are clearly estimates (not barcode-verified data) but better than showing 0.
    const fat = args.fat;
    const hasFatBreakdown = args.saturatedFat != null || args.polyunsaturatedFat != null || args.monounsaturatedFat != null;
    const estimatedSatFat   = hasFatBreakdown ? args.saturatedFat   : (fat > 0 ? Math.round(fat * 0.30 * 10) / 10 : undefined);
    const estimatedPolyFat  = hasFatBreakdown ? args.polyunsaturatedFat : (fat > 0 ? Math.round(fat * 0.28 * 10) / 10 : undefined);
    const estimatedMonoFat  = hasFatBreakdown ? args.monounsaturatedFat : (fat > 0 ? Math.round(fat * 0.40 * 10) / 10 : undefined);
    const estimatedTransFat = hasFatBreakdown ? args.transFat        : (fat > 0 ? 0 : undefined);

    const logId = await ctx.db.insert("foodLogs", {
      userId,
      date: today,
      slot: args.mealSlot,
      name: args.name,
      calories: args.calories,
      protein: args.protein,
      carbs: args.carbs,
      fat: args.fat,
      fiber: args.fiber,
      sugar: args.sugar,
      saturatedFat: estimatedSatFat,
      polyunsaturatedFat: estimatedPolyFat,
      monounsaturatedFat: estimatedMonoFat,
      transFat: estimatedTransFat,
      cholesterol: args.cholesterol,
      sodium: args.sodium,
      potassium: args.potassium,
      vitaminA: args.vitaminA,
      vitaminC: args.vitaminC,
      calcium: args.calcium,
      iron: args.iron,
      servingSize: args.servingSize,
      mealId: args.mealId,
      source: "manual",
    });

    // Update user stats
    const stats = await ctx.db.query("userStats")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (stats) {
      let newStreak = stats.currentStreak;
      if (stats.lastLogDate !== today) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split("T")[0];
        if (stats.lastLogDate === yesterdayStr) {
          newStreak = stats.currentStreak + 1;
        } else if (!stats.lastLogDate) {
          newStreak = 1;
        } else {
          newStreak = 1;
        }
      }

      // Check if protein goal is now hit for today (after this log)
      const profile = await ctx.db.query("profiles").withIndex("by_userId", (q) => q.eq("userId", userId)).unique();
      const targetProtein = profile?.targetProtein || 150;
      const todayLogs = await ctx.db.query("foodLogs")
        .withIndex("by_userId_date", (q) => q.eq("userId", userId).eq("date", today))
        .collect();
      const totalProteinToday = todayLogs.reduce((sum, l) => sum + l.protein, 0) + args.protein;

      let newProteinStreak = stats.proteinGoalStreak;
      if (totalProteinToday >= targetProtein) {
        // Only increment if we haven't already counted today
        const proteinLastDate = (stats as any).proteinGoalLastDate as string | undefined;
        if (proteinLastDate !== today) {
          const yesterday2 = new Date();
          yesterday2.setDate(yesterday2.getDate() - 1);
          const yest2 = yesterday2.toISOString().split("T")[0];
          newProteinStreak = proteinLastDate === yest2 ? stats.proteinGoalStreak + 1 : 1;
        }
      }

      await ctx.db.patch(stats._id, {
        totalMealsLogged: stats.totalMealsLogged + 1,
        xp: stats.xp + 10,
        currentStreak: newStreak,
        longestStreak: Math.max(stats.longestStreak, newStreak),
        lastLogDate: today,
        level: getLevelFromXp(stats.xp + 10),
        proteinGoalStreak: newProteinStreak,
        ...(totalProteinToday >= targetProtein && (stats as any).proteinGoalLastDate !== today
          ? { proteinGoalLastDate: today }
          : {}),
      });
    }

    return logId;
  },
});

export const deleteLog = mutation({
  args: { logId: v.id("foodLogs") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const log = await ctx.db.get(args.logId);
    if (log && log.userId === userId) {
      await ctx.db.delete(args.logId);

      // Reverse stats: subtract XP and meal count
      const stats = await ctx.db.query("userStats")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .unique();
      if (stats) {
        const xpReduction = log.source === "quick_add" ? 5 : 10;
        await ctx.db.patch(stats._id, {
          totalMealsLogged: Math.max(0, stats.totalMealsLogged - 1),
          xp: Math.max(0, stats.xp - xpReduction),
          level: getLevelFromXp(Math.max(0, stats.xp - xpReduction)),
        });
      }
    }
    return null;
  },
});

/** Unlog a plan meal by mealId — finds and deletes the food log entry for today */
export const unlogMeal = mutation({
  args: { mealId: v.id("meals"), localDate: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const today = resolveDate(args.localDate);
    const logs = await ctx.db.query("foodLogs")
      .withIndex("by_userId_date", (q) => q.eq("userId", userId).eq("date", today))
      .collect();
    const log = logs.find((l) => l.mealId?.toString() === args.mealId.toString());
    if (!log) return null;
    await ctx.db.delete(log._id);
    // Reverse stats
    const stats = await ctx.db.query("userStats")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (stats) {
      await ctx.db.patch(stats._id, {
        totalMealsLogged: Math.max(0, stats.totalMealsLogged - 1),
        xp: Math.max(0, stats.xp - 10),
        level: getLevelFromXp(Math.max(0, stats.xp - 10)),
      });
    }
    return null;
  },
});

export const quickAddCalories = mutation({
  args: {
    name: v.optional(v.string()),
    calories: v.number(),
    protein: v.optional(v.number()),
    carbs: v.optional(v.number()),
    fat: v.optional(v.number()),
    localDate: v.optional(v.string()),
  },
  returns: v.id("foodLogs"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const today = resolveDate(args.localDate);

    // Use provided macros or estimate from calories
    const protein = args.protein ?? Math.round(args.calories * 0.3 / 4);
    const carbs = args.carbs ?? Math.round(args.calories * 0.4 / 4);
    const fat = args.fat ?? Math.round(args.calories * 0.3 / 9);

    const logId = await ctx.db.insert("foodLogs", {
      userId,
      date: today,
      slot: "snack",
      name: args.name || "Quick Add",
      calories: args.calories,
      protein,
      carbs,
      fat,
      saturatedFat:        fat > 0 ? Math.round(fat * 0.30 * 10) / 10 : undefined,
      polyunsaturatedFat:  fat > 0 ? Math.round(fat * 0.28 * 10) / 10 : undefined,
      monounsaturatedFat:  fat > 0 ? Math.round(fat * 0.40 * 10) / 10 : undefined,
      transFat:            fat > 0 ? 0 : undefined,
      source: "quick_add",
    });

    // Update stats
    const stats = await ctx.db.query("userStats")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (stats) {
      await ctx.db.patch(stats._id, {
        totalMealsLogged: stats.totalMealsLogged + 1,
        xp: stats.xp + 5,
        level: getLevelFromXp(stats.xp + 5),
      });
    }

    return logId;
  },
});

export const getDailySummary = query({
  args: { date: v.optional(v.string()), localDate: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { date: "", logs: [], totals: { calories: 0, protein: 0, carbs: 0, fat: 0 }, logCount: 0 };
    const date = args.date || resolveDate(args.localDate);
    const logs = await ctx.db.query("foodLogs")
      .withIndex("by_userId_date", (q) => q.eq("userId", userId).eq("date", date))
      .collect();

    const totals = logs.reduce(
      (acc, log) => ({
        calories: acc.calories + log.calories,
        protein: acc.protein + log.protein,
        carbs: acc.carbs + log.carbs,
        fat: acc.fat + log.fat,
        fiber: acc.fiber + (log.fiber ?? 0),
        sugar: acc.sugar + (log.sugar ?? 0),
        saturatedFat: acc.saturatedFat + (log.saturatedFat ?? 0),
        polyunsaturatedFat: acc.polyunsaturatedFat + (log.polyunsaturatedFat ?? 0),
        monounsaturatedFat: acc.monounsaturatedFat + (log.monounsaturatedFat ?? 0),
        transFat: acc.transFat + (log.transFat ?? 0),
        cholesterol: acc.cholesterol + (log.cholesterol ?? 0),
        sodium: acc.sodium + (log.sodium ?? 0),
        potassium: acc.potassium + (log.potassium ?? 0),
        vitaminA: acc.vitaminA + (log.vitaminA ?? 0),
        vitaminC: acc.vitaminC + (log.vitaminC ?? 0),
        calcium: acc.calcium + (log.calcium ?? 0),
        iron: acc.iron + (log.iron ?? 0),
      }),
      {
        calories: 0, protein: 0, carbs: 0, fat: 0,
        fiber: 0, sugar: 0, saturatedFat: 0, polyunsaturatedFat: 0,
        monounsaturatedFat: 0, transFat: 0, cholesterol: 0, sodium: 0,
        potassium: 0, vitaminA: 0, vitaminC: 0, calcium: 0, iron: 0,
      }
    );
    // Round to 1 decimal
    totals.calories = Math.round(totals.calories);
    totals.protein = Math.round(totals.protein * 10) / 10;
    totals.carbs = Math.round(totals.carbs * 10) / 10;
    totals.fat = Math.round(totals.fat * 10) / 10;
    totals.fiber = Math.round(totals.fiber * 10) / 10;
    totals.sugar = Math.round(totals.sugar * 10) / 10;
    totals.saturatedFat = Math.round(totals.saturatedFat * 10) / 10;
    totals.cholesterol = Math.round(totals.cholesterol);
    totals.sodium = Math.round(totals.sodium);
    totals.potassium = Math.round(totals.potassium);
    totals.vitaminA = Math.round(totals.vitaminA);
    totals.vitaminC = Math.round(totals.vitaminC);
    totals.calcium = Math.round(totals.calcium);
    totals.iron = Math.round(totals.iron);

    return {
      date,
      logs,
      totals,
      logCount: logs.length,
    };
  },
});

export const getDateRangeSummaries = query({
  args: { startDate: v.string(), endDate: v.string() },
  returns: v.any(),
  handler: async (ctx, { startDate, endDate }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return {};
    const allLogs = await ctx.db
      .query("foodLogs")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    const filtered = allLogs.filter(
      (l) => l.date >= startDate && l.date <= endDate
    );
    const byDate: Record<string, {
      calories: number; protein: number; carbs: number; fat: number;
      fiber: number; sugar: number; saturatedFat: number;
      polyunsaturatedFat: number; monounsaturatedFat: number; transFat: number;
      cholesterol: number; sodium: number; potassium: number;
      vitaminA: number; vitaminC: number; calcium: number; iron: number;
    }> = {};
    for (const log of filtered) {
      if (!byDate[log.date]) {
        byDate[log.date] = {
          calories: 0, protein: 0, carbs: 0, fat: 0,
          fiber: 0, sugar: 0, saturatedFat: 0,
          polyunsaturatedFat: 0, monounsaturatedFat: 0, transFat: 0,
          cholesterol: 0, sodium: 0, potassium: 0,
          vitaminA: 0, vitaminC: 0, calcium: 0, iron: 0,
        };
      }
      byDate[log.date].calories += log.calories;
      byDate[log.date].protein += log.protein;
      byDate[log.date].carbs += log.carbs;
      byDate[log.date].fat += log.fat;
      byDate[log.date].fiber += (log.fiber ?? 0);
      byDate[log.date].sugar += (log.sugar ?? 0);
      byDate[log.date].saturatedFat += (log.saturatedFat ?? 0);
      byDate[log.date].polyunsaturatedFat += (log.polyunsaturatedFat ?? 0);
      byDate[log.date].monounsaturatedFat += (log.monounsaturatedFat ?? 0);
      byDate[log.date].transFat += (log.transFat ?? 0);
      byDate[log.date].cholesterol += (log.cholesterol ?? 0);
      byDate[log.date].sodium += (log.sodium ?? 0);
      byDate[log.date].potassium += (log.potassium ?? 0);
      byDate[log.date].vitaminA += (log.vitaminA ?? 0);
      byDate[log.date].vitaminC += (log.vitaminC ?? 0);
      byDate[log.date].calcium += (log.calcium ?? 0);
      byDate[log.date].iron += (log.iron ?? 0);
    }
    // Round values
    for (const d of Object.keys(byDate)) {
      byDate[d].calories = Math.round(byDate[d].calories);
      byDate[d].protein = Math.round(byDate[d].protein * 10) / 10;
      byDate[d].carbs = Math.round(byDate[d].carbs * 10) / 10;
      byDate[d].fat = Math.round(byDate[d].fat * 10) / 10;
      byDate[d].fiber = Math.round(byDate[d].fiber * 10) / 10;
      byDate[d].sugar = Math.round(byDate[d].sugar * 10) / 10;
      byDate[d].saturatedFat = Math.round(byDate[d].saturatedFat * 10) / 10;
      byDate[d].polyunsaturatedFat = Math.round(byDate[d].polyunsaturatedFat * 10) / 10;
      byDate[d].monounsaturatedFat = Math.round(byDate[d].monounsaturatedFat * 10) / 10;
      byDate[d].transFat = Math.round(byDate[d].transFat * 10) / 10;
      byDate[d].cholesterol = Math.round(byDate[d].cholesterol);
      byDate[d].sodium = Math.round(byDate[d].sodium);
      byDate[d].potassium = Math.round(byDate[d].potassium);
      byDate[d].vitaminA = Math.round(byDate[d].vitaminA);
      byDate[d].vitaminC = Math.round(byDate[d].vitaminC);
      byDate[d].calcium = Math.round(byDate[d].calcium);
      byDate[d].iron = Math.round(byDate[d].iron);
    }
    return byDate;
  },
});
