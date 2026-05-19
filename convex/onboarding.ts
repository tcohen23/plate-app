/**
 * Onboarding v2 — backend mutations/queries
 *
 * Handles:
 * - Saving individual steps (pre-auth stored client-side; post-auth flushed here)
 * - Username availability check + claim
 * - Username suggestions
 * - ToS acceptance
 * - Completing onboarding (flush all sessionStorage data → profile)
 * - Creating a minimal profile on account creation
 */
import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// ── saveStep: patch profile with step-specific data ─────────────────────────
export const saveStep = mutation({
  args: {
    step: v.string(),
    data: v.any(),
  },
  handler: async (ctx, { step, data }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    if (!profile) throw new Error("Profile not found");

    await ctx.db.patch(profile._id, {
      ...data,
      onboardingStep: step,
    } as any);
  },
});

// ── getProgress: return current onboarding state ─────────────────────────────
export const getProgress = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    if (!profile) return null;
    return {
      step: (profile as any).onboardingStep || "welcome",
      completedAt: (profile as any).onboardingCompletedAt || null,
    };
  },
});

// ── getOnboardingStatus: quick check for RequireOnboarding gate ──────────────
export const getOnboardingStatus = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { isComplete: false, step: null };

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    if (!profile) return { isComplete: false, step: null };
    return {
      isComplete: !!(profile as any).onboardingCompletedAt,
      step: (profile as any).onboardingStep || "welcome",
    };
  },
});

// ── checkUsernameAvailable: returns true if available ────────────────────────
export const checkUsernameAvailable = query({
  args: { username: v.string() },
  handler: async (ctx, { username }) => {
    const lower = username.toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(lower)) return false;

    const existing = await ctx.db
      .query("usernames")
      .withIndex("by_username", (q) => q.eq("username", lower))
      .unique();

    return !existing;
  },
});

// ── claimUsername: reserve username + patch profile ───────────────────────────
export const claimUsername = mutation({
  args: { username: v.string() },
  handler: async (ctx, { username }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const lower = username.toLowerCase();
    if (!/^[a-z0-9_]{3,20}$/.test(lower)) throw new Error("Invalid username format");

    // Race-condition safe: check again inside mutation
    const existing = await ctx.db
      .query("usernames")
      .withIndex("by_username", (q) => q.eq("username", lower))
      .unique();

    if (existing) throw new Error("Username already taken");

    // Reserve it
    await ctx.db.insert("usernames", { username: lower, userId });

    // Patch profile
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    if (profile) {
      await ctx.db.patch(profile._id, { username: lower } as any);
    }
  },
});

// ── suggestUsernames: returns up to 5 username suggestions ───────────────────
export const suggestUsernames = mutation({
  args: { firstName: v.string() },
  handler: async (ctx, { firstName }) => {
    const base = firstName.toLowerCase().replace(/[^a-z0-9]/g, "");
    const candidates = [
      base,
      `${base}_fit`,
      `${base}_eats`,
      `${base}_plate`,
      `the_${base}`,
      `${base}${Math.floor(Math.random() * 900) + 100}`,
      `${base}_${Math.floor(Math.random() * 90) + 10}`,
    ];

    const available: string[] = [];
    for (const candidate of candidates) {
      if (!/^[a-z0-9_]{3,20}$/.test(candidate)) continue;
      const existing = await ctx.db
        .query("usernames")
        .withIndex("by_username", (q) => q.eq("username", candidate))
        .unique();
      if (!existing) available.push(candidate);
      if (available.length >= 5) break;
    }

    return available;
  },
});

// ── acceptToS: record acceptance timestamp ───────────────────────────────────
export const acceptToS = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    if (!profile) throw new Error("Profile not found");

    await ctx.db.patch(profile._id, {
      tosAccepted: true,
      tosAcceptedAt: Date.now(),
    } as any);
  },
});

// ── createMinimalProfile: called right after signUp ──────────────────────────
// Creates a bare-minimum profile so queries don't fail during onboarding.
export const createMinimalProfile = mutation({
  args: {
    firstName: v.string(),
  },
  handler: async (ctx, { firstName }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Don't create duplicate
    const existing = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    if (existing) {
      // Just update firstName
      await ctx.db.patch(existing._id, { firstName, name: firstName } as any);
      return existing._id;
    }

    return await ctx.db.insert("profiles", {
      userId,
      name: firstName,
      firstName,
      // Required schema fields with sensible defaults
      height: 66,
      weight: 160,
      age: 25,
      gender: "other",
      activityLevel: "moderate",
      goal: "maintenance",
      mealStructure: "semi_varied",
      varietyDepth: "medium",
      cookingPreference: "moderate",
      budgetLevel: "medium",
      zipCode: "",
      onboardingComplete: false,
      onboardingStep: "name",
      tosAccepted: false,
      tosAcceptedAt: Date.now(),
    } as any);
  },
});

// ── completeOnboarding: flush all collected data → profile ───────────────────
export const completeOnboarding = mutation({
  args: {
    firstName: v.string(),
    goals: v.array(v.string()),
    glp1Status: v.string(),
    pastBarriers: v.array(v.string()),
    habits: v.array(v.string()),
    mealPlanOptIn: v.boolean(),
    planningFrequency: v.string(),
    sex: v.string(),
    age: v.number(),
    country: v.string(),
    zip: v.optional(v.string()),
    currentWeightLb: v.number(),
    goalWeightLb: v.number(),
    heightFt: v.number(),
    heightIn: v.number(),
    reminderOptIn: v.boolean(),
    emailOptIn: v.boolean(),
    personalizationConsent: v.boolean(),
    calorieTarget: v.optional(v.number()),
    activityLevel: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    if (!profile) throw new Error("Profile not found");

    const heightInches = args.heightFt * 12 + args.heightIn;

    await ctx.db.patch(profile._id, {
      firstName: args.firstName,
      name: args.firstName,
      goals: args.goals,
      glp1Status: args.glp1Status,
      pastBarriers: args.pastBarriers,
      habits: args.habits,
      mealPlanOptIn: args.mealPlanOptIn,
      planningFrequency: args.planningFrequency,
      sex: args.sex,
      gender: args.sex,
      age: args.age,
      country: args.country,
      zipCode: args.zip || "",
      currentWeightLb: args.currentWeightLb,
      goalWeightLb: args.goalWeightLb,
      weight: args.currentWeightLb,
      height: heightInches,
      activityLevel: args.activityLevel || "moderate",
      reminderOptIn: args.reminderOptIn,
      emailOptIn: args.emailOptIn,
      personalizationConsent: args.personalizationConsent,
      targetCalories: args.calorieTarget,
      onboardingComplete: true,
      onboardingCompletedAt: Date.now(),
      onboardingStep: "complete",
    } as any);
  },
});
