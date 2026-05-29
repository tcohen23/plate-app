/**
 * Sleep tracking — log and query daily sleep data.
 *
 * Sleep stages are estimated using well-known formulas:
 * - Deep sleep:  ~15–20% of total sleep (drops with age/alcohol)
 * - REM sleep:   ~20–25% of total sleep (first cycle ~90min in, grows later)
 * - Core (light): ~50–55% of total sleep
 * - Awake:       time-to-fall-asleep + (timesAwoke * avgWakeDuration)
 *
 * Reference: Walker, M. (2017). "Why We Sleep" — stage distribution estimates.
 */
import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/** Parse "HH:MM" → total minutes from midnight */
function parseTime(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

/**
 * Calculate sleep duration in minutes.
 * Handles overnight sleep (bedtime > wake time crosses midnight).
 */
function calcDuration(bedtime: string, wakeTime: string): number {
  let bed = parseTime(bedtime);
  let wake = parseTime(wakeTime);
  if (wake <= bed) wake += 24 * 60; // crossed midnight
  return wake - bed;
}

/**
 * Estimate sleep stages from total sleep minutes + quality survey answers.
 * Returns { awake, rem, core, deep } in minutes.
 */
function estimateSleepStages(args: {
  totalMinutes: number;
  timeToFallAsleep?: number;
  timesAwoke?: number;
  qualityRating?: number;
}): { awakeMinutes: number; remMinutes: number; coreMinutes: number; deepMinutes: number } {
  const { totalMinutes, timeToFallAsleep = 15, timesAwoke = 0, qualityRating = 3 } = args;

  // Awake time during sleep: each waking averages ~5 min
  const awakeMinutes = Math.round(timesAwoke * 5);
  const actualSleep = totalMinutes - awakeMinutes;

  // Quality modifier: poor quality (1-2) reduces deep sleep
  const qualityMod = qualityRating >= 4 ? 1.1 : qualityRating <= 2 ? 0.75 : 1.0;

  // Deep sleep: 15-20% of actual sleep, modulated by quality
  const deepPct = 0.17 * qualityMod;
  const deepMinutes = Math.round(Math.min(actualSleep * deepPct, actualSleep * 0.25));

  // REM sleep: 20-25% of actual sleep
  const remPct = 0.22;
  const remMinutes = Math.round(actualSleep * remPct);

  // Core (light) sleep: the remainder
  const coreMinutes = Math.max(0, actualSleep - deepMinutes - remMinutes);

  return {
    awakeMinutes: Math.max(0, awakeMinutes),
    remMinutes: Math.max(0, remMinutes),
    coreMinutes: Math.max(0, coreMinutes),
    deepMinutes: Math.max(0, deepMinutes),
  };
}

export const getSleepLog = query({
  args: { date: v.string() },
  returns: v.any(),
  handler: async (ctx, { date }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db
      .query("sleepLogs")
      .withIndex("by_userId_date", (q) => q.eq("userId", userId).eq("date", date))
      .unique();
  },
});

export const getSleepLogs = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("sleepLogs")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const getSleepLogsRange = query({
  args: { startDate: v.string(), endDate: v.string() },
  returns: v.any(),
  handler: async (ctx, { startDate, endDate }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const logs = await ctx.db
      .query("sleepLogs")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    return logs.filter((l) => l.date >= startDate && l.date <= endDate);
  },
});

export const logSleep = mutation({
  args: {
    date: v.string(),
    bedtime: v.string(),
    wakeTime: v.string(),
    qualityRating: v.optional(v.number()),
    timeToFallAsleep: v.optional(v.number()),
    timesAwoke: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  returns: v.id("sleepLogs"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const totalMinutes = calcDuration(args.bedtime, args.wakeTime);
    const stages = estimateSleepStages({
      totalMinutes,
      timeToFallAsleep: args.timeToFallAsleep,
      timesAwoke: args.timesAwoke,
      qualityRating: args.qualityRating,
    });

    const existing = await ctx.db
      .query("sleepLogs")
      .withIndex("by_userId_date", (q) =>
        q.eq("userId", userId).eq("date", args.date)
      )
      .unique();

    const payload = {
      userId,
      date: args.date,
      bedtime: args.bedtime,
      wakeTime: args.wakeTime,
      totalMinutes,
      qualityRating: args.qualityRating,
      timeToFallAsleep: args.timeToFallAsleep,
      timesAwoke: args.timesAwoke,
      notes: args.notes,
      ...stages,
    };

    if (existing) {
      await ctx.db.patch(existing._id, payload);
      return existing._id;
    }
    return await ctx.db.insert("sleepLogs", payload);
  },
});

export const deleteSleepLog = mutation({
  args: { date: v.string() },
  returns: v.null(),
  handler: async (ctx, { date }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const log = await ctx.db
      .query("sleepLogs")
      .withIndex("by_userId_date", (q) => q.eq("userId", userId).eq("date", date))
      .unique();
    if (log) await ctx.db.delete(log._id);
    return null;
  },
});
