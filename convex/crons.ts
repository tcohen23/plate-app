import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
// Note: welcomeEmail.sendReEngagementEmails is registered as an internalAction
// Note: welcomeEmail.sendWinBackEmails is registered as an internalAction

/**
 * Midnight plan regeneration — runs every 30 minutes.
 * For each user who has a meal plan, checks whether it's midnight (00:00–00:29)
 * in their stored timezone. If so, regenerates their plan for the new day/week.
 *
 * Users whose timezone isn't stored default to "America/New_York" (Tyler's timezone).
 */
export const midnightPlanRegen = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const now = new Date();
    const allPlans = await ctx.db.query("mealPlans").collect();
    const processed = new Set<string>();

    for (const plan of allPlans) {
      const userId = plan.userId;
      if (processed.has(userId)) continue;
      processed.add(userId);

      const profile = await ctx.db
        .query("profiles")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .unique();
      if (!profile) continue;

      const tz = (profile as any).timezone as string | undefined || "America/New_York";

      // Get the current hour and minute in the user's local timezone
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: tz,
        hour: "numeric",
        minute: "numeric",
        hour12: false,
      }).formatToParts(now);

      const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "12", 10);
      const minute = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);

      // Trigger only during midnight window: 00:00–00:29 local time
      if (hour === 0 && minute < 30) {
        console.log(`[midnight cron] Regenerating plan for user ${userId} (tz=${tz})`);
        await ctx.scheduler.runAfter(0, internal.mealPlans.regenerateForUser, { userId });
      }
    }

    return null;
  },
});

const crons = cronJobs();

// Run every 30 minutes — checks each user's local timezone for midnight
crons.interval("midnight plan regen", { minutes: 30 }, internal.crons.midnightPlanRegen);

// Run daily at 10am UTC (6am EST) — re-engagement emails for inactive premium users
crons.daily(
  "re-engagement emails",
  { hourUTC: 10, minuteUTC: 0 },
  internal.welcomeEmail.sendReEngagementEmails,
);

export default crons;

// Run every Tuesday at 3pm UTC (10am EST) — premium upsell to free users
crons.weekly(
  "premium upsell emails",
  { dayOfWeek: "tuesday", hourUTC: 15, minuteUTC: 0 },
  internal.welcomeEmail.sendPremiumUpsellEmails,
);

// Run every 5 days at 3pm UTC (10am EST) — nudge users who never finished onboarding
crons.interval(
  "onboarding reminder emails",
  { hours: 120 }, // every 5 days
  internal.welcomeEmail.sendOnboardingReminderEmails,
);

// Run daily at 11am UTC (7am EST) — win-back emails for churned/cancelled users
crons.daily(
  "win-back emails",
  { hourUTC: 11, minuteUTC: 0 },
  internal.welcomeEmail.sendWinBackEmails,
);
