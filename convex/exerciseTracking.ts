/**
 * exerciseTracking.ts
 *
 * Mutations and queries for:
 *   - Cardio logs (running, cycling, etc.)
 *   - Strength exercise logs (sets / reps / weight)
 *   - Custom exercises
 *   - Workout routines
 */

import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ─── Cardio ───────────────────────────────────────────────────────────────────

export const logCardio = mutation({
  args: {
    date: v.string(),
    exerciseName: v.string(),
    minutes: v.number(),
    caloriesBurned: v.optional(v.number()),
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
      caloriesBurned: args.caloriesBurned ?? 0,
      startTime: args.startTime,
      createdAt: Date.now(),
    });
  },
});

export const updateCardioLog = mutation({
  args: {
    logId: v.id("cardioLogs"),
    minutes: v.optional(v.number()),
    caloriesBurned: v.optional(v.number()),
    startTime: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const log = await ctx.db.get(args.logId);
    if (!log || log.userId !== userId) throw new Error("Not found");

    const updates: Record<string, unknown> = {};
    if (args.minutes !== undefined) updates.minutes = args.minutes;
    if (args.caloriesBurned !== undefined) updates.caloriesBurned = args.caloriesBurned;
    if (args.startTime !== undefined) updates.startTime = args.startTime;

    await ctx.db.patch(args.logId, updates);
    return null;
  },
});

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

export const getCardioLogsForDate = query({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("cardioLogs")
      .withIndex("by_userId_date", (q) => q.eq("userId", userId).eq("date", args.date))
      .collect();
  },
});

export const getRecentCardioExercises = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const logs = await ctx.db
      .query("cardioLogs")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50);

    // Deduplicate by name, keep most recent
    const seen = new Set<string>();
    const result: { name: string }[] = [];
    for (const log of logs) {
      if (!seen.has(log.exerciseName)) {
        seen.add(log.exerciseName);
        result.push({ name: log.exerciseName });
      }
      if (result.length >= 8) break;
    }
    return result;
  },
});

// ─── Strength ────────────────────────────────────────────────────────────────

export const logExercise = mutation({
  args: {
    date: v.string(),
    exerciseName: v.string(),
    exerciseType: v.optional(v.string()),
    sets: v.array(v.object({
      setNumber: v.number(),
      reps: v.optional(v.number()),
      weight: v.optional(v.number()),
      completed: v.boolean(),
    })),
    caloriesBurned: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  returns: v.id("exerciseLogs"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Estimate calories if not provided (rough 8 cal/set)
    const cals = args.caloriesBurned ?? Math.round(args.sets.length * 8);

    return await ctx.db.insert("exerciseLogs", {
      userId,
      date: args.date,
      exerciseName: args.exerciseName,
      exerciseType: args.exerciseType ?? "strength",
      sets: args.sets,
      caloriesBurned: cals,
      notes: args.notes,
      createdAt: Date.now(),
    });
  },
});

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

export const getExerciseLogsForDate = query({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("exerciseLogs")
      .withIndex("by_userId_date", (q) => q.eq("userId", userId).eq("date", args.date))
      .collect();
  },
});

export const getRecentStrengthExercises = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const logs = await ctx.db
      .query("exerciseLogs")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .take(100);

    const seen = new Map<string, { name: string; lastSets: number; lastWeight?: number }>();
    for (const log of logs) {
      if (!seen.has(log.exerciseName)) {
        const lastWeight = log.sets.find(s => s.weight != null)?.weight;
        seen.set(log.exerciseName, {
          name: log.exerciseName,
          lastSets: log.sets.length,
          lastWeight,
        });
      }
      if (seen.size >= 12) break;
    }
    return [...seen.values()];
  },
});

// ─── Summary (for dashboard) ─────────────────────────────────────────────────

export const getExerciseSummaryForDate = query({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { entryCount: 0, totalCalories: 0, totalMinutes: 0 };

    const [cardio, strength] = await Promise.all([
      ctx.db
        .query("cardioLogs")
        .withIndex("by_userId_date", (q) => q.eq("userId", userId).eq("date", args.date))
        .collect(),
      ctx.db
        .query("exerciseLogs")
        .withIndex("by_userId_date", (q) => q.eq("userId", userId).eq("date", args.date))
        .collect(),
    ]);

    const totalCalories = [
      ...cardio.map(l => l.caloriesBurned ?? 0),
      ...strength.map(l => l.caloriesBurned ?? 0),
    ].reduce((a, b) => a + b, 0);

    const totalMinutes = cardio.reduce((a, l) => a + (l.minutes ?? 0), 0);

    return {
      entryCount: cardio.length + strength.length,
      totalCalories,
      totalMinutes,
    };
  },
});

// ─── Custom Exercises ─────────────────────────────────────────────────────────

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
      muscleGroups: args.muscleGroups ?? [],
      equipment: args.equipment,
      notes: args.notes,
      createdAt: Date.now(),
    });
  },
});

export const deleteCustomExercise = mutation({
  args: { exerciseId: v.id("customExercises") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const ex = await ctx.db.get(args.exerciseId);
    if (!ex || ex.userId !== userId) throw new Error("Not found");

    await ctx.db.delete(args.exerciseId);
    return null;
  },
});

export const getCustomExercises = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("customExercises")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

// ─── Workout Routines ─────────────────────────────────────────────────────────

const routineExerciseValidator = v.object({
  exerciseId: v.optional(v.string()),
  name: v.string(),
  sets: v.number(),
  reps: v.optional(v.string()),
  weightLbs: v.optional(v.number()),
  restSeconds: v.optional(v.number()),
  notes: v.optional(v.string()),
});

export const createWorkoutRoutine = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    exercises: v.array(routineExerciseValidator),
    estimatedDurationMinutes: v.optional(v.number()),
    estimatedCalories: v.optional(v.number()),
    isPublic: v.optional(v.boolean()),
  },
  returns: v.id("workoutRoutines"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const totalSets = args.exercises.reduce((s, e) => s + e.sets, 0);
    const estimatedCalories = args.estimatedCalories ?? Math.round(totalSets * 8);
    const estimatedDurationMinutes = args.estimatedDurationMinutes ?? Math.round(totalSets * 2.5);

    return await ctx.db.insert("workoutRoutines", {
      userId,
      name: args.name,
      description: args.description,
      exercises: args.exercises,
      estimatedDurationMinutes,
      estimatedCalories,
      isPublic: args.isPublic ?? false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const updateWorkoutRoutine = mutation({
  args: {
    routineId: v.id("workoutRoutines"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    exercises: v.optional(v.array(routineExerciseValidator)),
    estimatedDurationMinutes: v.optional(v.number()),
    estimatedCalories: v.optional(v.number()),
    isPublic: v.optional(v.boolean()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const routine = await ctx.db.get(args.routineId);
    if (!routine || routine.userId !== userId) throw new Error("Not found");

    const updates: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.exercises !== undefined) {
      updates.exercises = args.exercises;
      const totalSets = args.exercises.reduce((s, e) => s + e.sets, 0);
      updates.estimatedCalories = args.estimatedCalories ?? Math.round(totalSets * 8);
      updates.estimatedDurationMinutes = args.estimatedDurationMinutes ?? Math.round(totalSets * 2.5);
    }
    if (args.isPublic !== undefined) updates.isPublic = args.isPublic;

    await ctx.db.patch(args.routineId, updates);
    return null;
  },
});

export const deleteWorkoutRoutine = mutation({
  args: { routineId: v.id("workoutRoutines") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const routine = await ctx.db.get(args.routineId);
    if (!routine || routine.userId !== userId) throw new Error("Not found");

    await ctx.db.delete(args.routineId);
    return null;
  },
});

export const getMyRoutines = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("workoutRoutines")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();
  },
});

export const getExploreRoutines = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("workoutRoutines")
      .withIndex("by_isPublic", (q) => q.eq("isPublic", true))
      .order("desc")
      .take(50);
  },
});
