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

    const logId = await ctx.db.insert("foodLogs", {
      userId,
      date: today,
      slot: args.mealSlot,
      name: args.name,
      calories: args.calories,
      protein: args.protein,
      carbs: args.carbs,
      fat: args.fat,
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
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );
    // Round to 1 decimal to avoid floating point display artifacts
    totals.calories = Math.round(totals.calories);
    totals.protein = Math.round(totals.protein * 10) / 10;
    totals.carbs = Math.round(totals.carbs * 10) / 10;
    totals.fat = Math.round(totals.fat * 10) / 10;

    return {
      date,
      logs,
      totals,
      logCount: logs.length,
    };
  },
});
