/**
 * Exercise Logging — Cardio & Strength
 *
 * Tables used:
 *   - cardioLogs:     minutes + calories burned per cardio session
 *   - exerciseLogs:   strength sets (reps + weight)
 *   - customExercises: user-created exercises
 */
import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ─── Queries ──────────────────────────────────────────────────────────────────

/** All cardio logs for a specific date */
export const getCardioLogs = query({
  args: { date: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("cardioLogs")
      .withIndex("by_userId_date", (q) => q.eq("userId", userId).eq("date", args.date))
      .collect();
  },
});

/** All strength exercise logs for a specific date */
export const getExerciseLogs = query({
  args: { date: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("exerciseLogs")
      .withIndex("by_userId_date", (q) => q.eq("userId", userId).eq("date", args.date))
      .collect();
  },
});

/** Historical exercise logs (last 30 days) for History tab */
export const getRecentExerciseLogs = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);
    const cutoffStr = cutoff.toISOString().split("T")[0];

    const cardio = await ctx.db
      .query("cardioLogs")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    const strength = await ctx.db
      .query("exerciseLogs")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    const allRecent = [
      ...cardio.filter((l) => l.date >= cutoffStr).map((l) => ({ ...l, category: "cardio" as const })),
      ...strength.filter((l) => l.date >= cutoffStr).map((l) => ({ ...l, category: "strength" as const })),
    ].sort((a, b) => b.date.localeCompare(a.date));

    return allRecent;
  },
});

/** Custom exercises created by this user */
export const getCustomExercises = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("customExercises")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
  },
});

// ─── Mutations ────────────────────────────────────────────────────────────────

/** Log a cardio session */
export const logCardio = mutation({
  args: {
    date: v.string(),
    exerciseName: v.string(),
    minutes: v.number(),
    caloriesBurned: v.number(),
    startTime: v.optional(v.string()),
  },
  returns: v.id("cardioLogs"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.db.insert("cardioLogs", {
      userId,
      date: args.date,
      exerciseName: args.exerciseName,
      minutes: args.minutes,
      caloriesBurned: args.caloriesBurned,
      startTime: args.startTime,
      createdAt: Date.now(),
    });
  },
});

/** Log a strength exercise (sets/reps/weight) */
export const logStrengthExercise = mutation({
  args: {
    date: v.string(),
    exerciseName: v.string(),
    sets: v.array(v.object({
      setNumber: v.number(),
      reps: v.optional(v.number()),
      weight: v.optional(v.number()),
      completed: v.optional(v.boolean()),
    })),
    caloriesBurned: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  returns: v.id("exerciseLogs"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.db.insert("exerciseLogs", {
      userId,
      date: args.date,
      exerciseName: args.exerciseName,
      exerciseType: "strength",
      sets: args.sets,
      caloriesBurned: args.caloriesBurned,
      notes: args.notes,
      createdAt: Date.now(),
    });
  },
});

/** Delete a cardio log */
export const deleteCardioLog = mutation({
  args: { logId: v.id("cardioLogs") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const log = await ctx.db.get(args.logId);
    if (!log || log.userId !== userId) throw new Error("Not found");
    await ctx.db.delete(args.logId);
    return null;
  },
});

/** Delete a strength exercise log */
export const deleteExerciseLog = mutation({
  args: { logId: v.id("exerciseLogs") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const log = await ctx.db.get(args.logId);
    if (!log || log.userId !== userId) throw new Error("Not found");
    await ctx.db.delete(args.logId);
    return null;
  },
});

/** Combined exercise summary for a date (used by Dashboard exercise row) */
export const getExerciseSummaryForDate = query({
  args: { date: v.string() },
  returns: v.any(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { totalCalories: 0, totalMinutes: 0, entryCount: 0 };

    const [cardio, strength] = await Promise.all([
      ctx.db.query("cardioLogs").withIndex("by_userId_date", (q) => q.eq("userId", userId).eq("date", args.date)).collect(),
      ctx.db.query("exerciseLogs").withIndex("by_userId_date", (q) => q.eq("userId", userId).eq("date", args.date)).collect(),
    ]);

    const totalCalories =
      cardio.reduce((s: number, l: any) => s + l.caloriesBurned, 0) +
      strength.reduce((s: number, l: any) => s + (l.caloriesBurned ?? 0), 0);
    const totalMinutes = cardio.reduce((s: number, l: any) => s + l.minutes, 0);
    const entryCount = cardio.length + strength.length;

    return { totalCalories, totalMinutes, entryCount };
  },
});

/** Create a custom exercise */
export const createCustomExercise = mutation({
  args: {
    name: v.string(),
    muscleGroups: v.optional(v.array(v.string())),
    equipment: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  returns: v.id("customExercises"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.db.insert("customExercises", {
      userId,
      name: args.name,
      muscleGroups: args.muscleGroups,
      equipment: args.equipment,
      notes: args.notes,
      createdAt: Date.now(),
    });
  },
});
