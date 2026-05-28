import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const logMedication = mutation({
  args: {
    date: v.string(),
    medication: v.string(),
    dosage: v.string(),
    appetiteLevel: v.optional(v.number()),
    sideEffects: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
  },
  returns: v.id("medicationLogs"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const id = await ctx.db.insert("medicationLogs", {
      userId,
      date: args.date,
      medication: args.medication,
      dosage: args.dosage,
      appetiteLevel: args.appetiteLevel,
      sideEffects: args.sideEffects,
      notes: args.notes,
    });
    return id;
  },
});

export const getMedicationLogs = query({
  args: {},
  returns: v.array(v.any()),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db.query("medicationLogs")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50);
  },
});
