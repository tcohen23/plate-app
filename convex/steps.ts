/**
 * Steps tracking — log and query daily step counts.
 */
import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getStepLogs = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("stepLogs")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const getStepLogsRange = query({
  args: { startDate: v.string(), endDate: v.string() },
  returns: v.any(),
  handler: async (ctx, { startDate, endDate }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const logs = await ctx.db
      .query("stepLogs")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    return logs.filter((l) => l.date >= startDate && l.date <= endDate);
  },
});

export const logSteps = mutation({
  args: {
    date: v.string(),
    steps: v.number(),
    source: v.optional(v.string()),
  },
  returns: v.id("stepLogs"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existing = await ctx.db
      .query("stepLogs")
      .withIndex("by_userId_date", (q) =>
        q.eq("userId", userId).eq("date", args.date)
      )
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, {
        steps: args.steps,
        source: args.source,
      });
      return existing._id;
    }
    return await ctx.db.insert("stepLogs", { userId, ...args });
  },
});
