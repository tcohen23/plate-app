import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { ACHIEVEMENT_DEFS } from "./progress";

/* ══════════════════════════════════════════════════════════════════════════
   ADMIN LEVEL SYSTEM
   
   Levels (highest → lowest):
     owner          — Tyler. Full control. Cannot be removed or demoted.
     admin          — Manage users, send emails, reset data, promote up to moderator.
     moderator      — View all users & stats, send emails. No destructive actions.
     friends_family — Free premium access. No admin panel.
     (undefined)    — Regular user.
   ══════════════════════════════════════════════════════════════════════════ */

const LEVEL_RANK: Record<string, number> = {
  owner: 4,
  admin: 3,
  moderator: 2,
  friends_family: 1,
};

function levelRank(level?: string | null): number {
  return level ? (LEVEL_RANK[level] ?? 0) : 0;
}

/** Check if a level has at least moderator access (can see admin panel) */
function hasAdminPanelAccess(level?: string | null): boolean {
  return levelRank(level) >= LEVEL_RANK.moderator;
}

/** Resolve adminLevel from both new field and legacy isAdmin */
function resolveAdminLevel(profile: { adminLevel?: string; isAdmin?: boolean } | null): string | undefined {
  if (!profile) return undefined;
  if (profile.adminLevel) return profile.adminLevel;
  // Legacy: isAdmin === true → treat as owner (was the original admin)
  if (profile.isAdmin === true) return "owner";
  return undefined;
}

/* ───── helper: require admin panel access (moderator+) ───── */
async function requireAdminPanel(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_userId", (q: any) => q.eq("userId", userId))
    .unique();
  const level = resolveAdminLevel(profile);
  if (!hasAdminPanelAccess(level)) throw new Error("Not authorized");
  return { userId, profile, level: level! };
}

/* ───── helper: require full admin (admin+) ───── */
export async function requireAdmin(ctx: any) {
  const { userId, profile, level } = await requireAdminPanel(ctx);
  if (levelRank(level) < LEVEL_RANK.admin) throw new Error("Not authorized — admin or owner required");
  return { userId, profile, level };
}

/* ───── helper: require owner (reserved for future use) ───── */
export async function requireOwner(ctx: any) {
  const { userId, profile, level } = await requireAdminPanel(ctx);
  if (level !== "owner") throw new Error("Not authorized — owner only");
  return { userId, profile, level };
}

/* ══════════════════════════════════════════════════════════════════════════
   QUERIES
   ══════════════════════════════════════════════════════════════════════════ */

/** Check current user's admin level */
export const getAdminLevel = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    return resolveAdminLevel(profile) ?? null;
  },
});

/** Legacy compat — returns true if user has at least moderator access */
export const isAdmin = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    return hasAdminPanelAccess(resolveAdminLevel(profile));
  },
});

export const getAdminProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    const level = resolveAdminLevel(profile);
    if (!hasAdminPanelAccess(level)) return null;
    return { ...profile, adminLevel: level };
  },
});

/** Admin dashboard stats — admin+ only (moderators cannot see) */
export const getDashboardStats = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const allProfiles = await ctx.db.query("profiles").collect();
    const totalUsers = allProfiles.length;
    const completedOnboarding = allProfiles.filter((p) => p.onboardingComplete).length;

    const allFoodLogs = await ctx.db.query("foodLogs").collect();
    const totalFoodLogs = allFoodLogs.length;

    const allPlans = await ctx.db.query("mealPlans").collect();
    const totalMealPlans = allPlans.length;

    const allGrocery = await ctx.db.query("groceryLists").collect();
    const totalGroceryLists = allGrocery.length;

    const today = new Date().toISOString().split("T")[0];
    const todayLogs = allFoodLogs.filter((l) => l.date === today);
    const activeToday = new Set(todayLogs.map((l) => l.userId)).size;

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split("T")[0];
    const weekLogs = allFoodLogs.filter((l) => l.date >= weekAgoStr);
    const activeThisWeek = new Set(weekLogs.map((l) => l.userId)).size;

    const allWorkoutLogs = await ctx.db.query("workoutLogs").collect();
    const totalWorkouts = allWorkoutLogs.length;

    // Count by admin level
    const levelCounts: Record<string, number> = { owner: 0, admin: 0, moderator: 0, friends_family: 0 };
    for (const p of allProfiles) {
      const lvl = resolveAdminLevel(p);
      if (lvl && levelCounts[lvl] !== undefined) levelCounts[lvl]++;
    }

    return {
      totalUsers,
      completedOnboarding,
      totalFoodLogs,
      totalMealPlans,
      totalGroceryLists,
      activeToday,
      activeThisWeek,
      totalWorkouts,
      levelCounts,
    };
  },
});

/** Get all users — content varies by caller's admin level.
 *  moderator: name, email, role, onboarding status only
 *  admin/owner: full stats, macros, activity data
 */
export const getAllUsers = query({
  args: {},
  handler: async (ctx) => {
    const { level: callerLevel } = await requireAdminPanel(ctx);
    const callerRank = levelRank(callerLevel);
    const showStats = callerRank >= LEVEL_RANK.admin; // admin+ see full data

    const allProfiles = await ctx.db.query("profiles").collect();

    const users = await Promise.all(
      allProfiles.map(async (p) => {
        // Basic info — always visible to moderator+
        const authAccounts = await ctx.db
          .query("authAccounts")
          .filter((q) => q.eq(q.field("userId"), p.userId))
          .collect();
        const email = authAccounts.find((a) => a.providerAccountId)?.providerAccountId || null;

        const base = {
          _id: p._id,
          userId: p.userId,
          name: p.name,
          email,
          onboardingComplete: p.onboardingComplete,
          adminLevel: resolveAdminLevel(p) || null,
          isAdmin: hasAdminPanelAccess(resolveAdminLevel(p)),
          createdAt: p._creationTime,
        };

        if (!showStats) {
          // Moderator sees only basics
          return {
            ...base,
            goal: null, height: null, weight: null, age: null, gender: null,
            activityLevel: null, targetCalories: null, targetProtein: null,
            targetCarbs: null, targetFat: null, dietPreference: null, usesGlp1: false,
            xp: 0, level: 0, currentStreak: 0, longestStreak: 0,
            totalMealsLogged: 0, totalPlans: 0, totalWorkouts: 0, lastLogDate: null,
            _restricted: true,
          };
        }

        // Admin/Owner — full data
        const stats = await ctx.db
          .query("userStats")
          .withIndex("by_userId", (q) => q.eq("userId", p.userId))
          .unique();
        const foodLogs = await ctx.db
          .query("foodLogs")
          .withIndex("by_userId", (q) => q.eq("userId", p.userId))
          .collect();
        const plans = await ctx.db
          .query("mealPlans")
          .withIndex("by_userId", (q) => q.eq("userId", p.userId))
          .collect();
        const workoutLogs = await ctx.db
          .query("workoutLogs")
          .withIndex("by_userId", (q) => q.eq("userId", p.userId))
          .collect();

        return {
          ...base,
          goal: p.goal,
          height: p.height,
          weight: p.weight,
          age: p.age,
          gender: p.gender,
          activityLevel: p.activityLevel,
          targetCalories: p.targetCalories,
          targetProtein: p.targetProtein,
          targetCarbs: p.targetCarbs,
          targetFat: p.targetFat,
          dietPreference: p.dietPreference || null,
          usesGlp1: p.usesGlp1 || false,
          xp: stats?.xp || 0,
          level: stats?.level || 1,
          currentStreak: stats?.currentStreak || 0,
          longestStreak: stats?.longestStreak || 0,
          totalMealsLogged: foodLogs.length,
          totalPlans: plans.length,
          totalWorkouts: workoutLogs.length,
          lastLogDate: stats?.lastLogDate || null,
          isPremium: (p as any).isPremium || false,
          subscriptionStatus: (p as any).subscriptionStatus || null,
          trialEnd: (p as any).trialEnd || null,
          _restricted: false,
        };
      })
    );

    return users.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/** Get email logs — visible to moderator+ */
export const getEmailLogs = query({
  args: {},
  handler: async (ctx) => {
    await requireAdminPanel(ctx);
    const logs = await ctx.db
      .query("emailLogs")
      .withIndex("by_sentAt")
      .order("desc")
      .collect();
    return logs;
  },
});

/* ══════════════════════════════════════════════════════════════════════════
   MUTATIONS
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Set a user's admin level.
 * Owner can set any level. Admin can set up to moderator.
 * No one can modify the owner.
 */
export const setUserAdminLevel = mutation({
  args: {
    profileId: v.id("profiles"),
    newLevel: v.union(
      v.literal("owner"),
      v.literal("admin"),
      v.literal("moderator"),
      v.literal("friends_family"),
      v.literal("none"),
    ),
  },
  handler: async (ctx, { profileId, newLevel }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const myProfile = await ctx.db.query("profiles").withIndex("by_userId", (q) => q.eq("userId", userId)).unique();
    const myLevel = resolveAdminLevel(myProfile);
    const myRank = levelRank(myLevel);

    if (myRank < LEVEL_RANK.admin) throw new Error("Not authorized");

    const target = await ctx.db.get(profileId);
    if (!target) throw new Error("User not found");
    if (target.userId === userId) throw new Error("Cannot modify your own role");

    const targetLevel = resolveAdminLevel(target);
    const targetRank = levelRank(targetLevel);

    // Only owner can modify another admin or owner
    if (targetRank >= LEVEL_RANK.admin && myLevel !== "owner") {
      throw new Error("Only the owner can modify admins");
    }

    // Only owner can promote to admin or owner
    if (newLevel === "admin" || newLevel === "owner") {
      if (myLevel !== "owner") throw new Error("Only the owner can promote to admin or owner");
    }

    // Cannot promote to owner (there's only one)
    if (newLevel === "owner") throw new Error("There can only be one owner");

    const effectiveLevel = newLevel === "none" ? undefined : newLevel;
    const isAdminBool = hasAdminPanelAccess(effectiveLevel);

    await ctx.db.patch(profileId, {
      adminLevel: effectiveLevel,
      isAdmin: isAdminBool || undefined,
      // Sync comp premium: friends_family gets isPremium = true
      isPremium: effectiveLevel === "friends_family" ? true : undefined,
    } as any);

    // Audit log
    await ctx.db.insert("auditLogs", {
      adminUserId: userId,
      targetUserId: target.userId,
      action: "role_changed",
      fromValue: targetLevel || "none",
      toValue: effectiveLevel || "none",
      timestamp: Date.now(),
    });

    return { adminLevel: effectiveLevel || "none", name: target.name };
  },
});

/** Legacy compat: toggleUserAdmin — still works, now uses levels */
export const toggleUserAdmin = mutation({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, { profileId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const myProfile = await ctx.db.query("profiles").withIndex("by_userId", (q) => q.eq("userId", userId)).unique();
    const myLevel = resolveAdminLevel(myProfile);
    if (levelRank(myLevel) < LEVEL_RANK.admin) throw new Error("Not authorized");

    const target = await ctx.db.get(profileId);
    if (!target) throw new Error("User not found");
    if (target.userId === userId) throw new Error("Cannot modify your own admin status");

    const targetLevel = resolveAdminLevel(target);
    const wasAdmin = hasAdminPanelAccess(targetLevel);
    const newLevel = wasAdmin ? undefined : "moderator";

    await ctx.db.patch(profileId, {
      adminLevel: newLevel,
      isAdmin: newLevel ? true : undefined,
    });

    return { isAdmin: !wasAdmin };
  },
});

/** Admin: delete a user and all their data (admin+ only) */
export const deleteUser = mutation({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, { profileId }) => {
    const { userId: adminUserId, level: myLevel } = await requireAdmin(ctx);

    const targetProfile = await ctx.db.get(profileId);
    if (!targetProfile) throw new Error("User not found");
    if (targetProfile.userId === adminUserId) throw new Error("Cannot delete your own account");

    const targetLevel = resolveAdminLevel(targetProfile);
    if (targetLevel === "owner") throw new Error("Cannot delete the owner");
    if (levelRank(targetLevel) >= LEVEL_RANK.admin && myLevel !== "owner") {
      throw new Error("Only the owner can delete admins");
    }

    const targetUserId = targetProfile.userId;

    const tables = [
      { table: "foodLogs", index: "by_userId" },
      { table: "mealPlans", index: "by_userId" },
      { table: "groceryLists", index: "by_userId" },
      { table: "workoutPlans", index: "by_userId" },
      { table: "workoutLogs", index: "by_userId" },
      { table: "progressLogs", index: "by_userId" },
      { table: "medicationLogs", index: "by_userId" },
      { table: "achievements", index: "by_userId" },
      { table: "userStats", index: "by_userId" },
      { table: "socialPosts", index: "by_userId" },
      { table: "hydrationLogs" as any, index: null },
      { table: "savedMeals", index: "by_userId" },
    ] as const;

    for (const { table, index } of tables) {
      let rows;
      if (index) {
        rows = await (ctx.db.query(table as any) as any)
          .withIndex(index, (q: any) => q.eq("userId", targetUserId))
          .collect();
      } else {
        rows = await ctx.db
          .query(table as any)
          .filter((q: any) => q.eq(q.field("userId"), targetUserId))
          .collect();
      }
      for (const row of rows) {
        await ctx.db.delete(row._id);
      }
    }

    const authAccounts = await ctx.db
      .query("authAccounts")
      .filter((q) => q.eq(q.field("userId"), targetUserId))
      .collect();
    for (const account of authAccounts) {
      await ctx.db.delete(account._id);
    }

    const authSessions = await ctx.db
      .query("authSessions")
      .filter((q) => q.eq(q.field("userId"), targetUserId))
      .collect();
    for (const session of authSessions) {
      await ctx.db.delete(session._id);
    }

    await ctx.db.delete(profileId);
    try { await ctx.db.delete(targetUserId); } catch { /* may be gone */ }

    return { success: true, deletedName: targetProfile.name };
  },
});

/** Admin: reset progress (admin+ only) */
export const resetUserProgress = mutation({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, { profileId }) => {
    const { userId: adminUserId } = await requireAdmin(ctx);

    const targetProfile = await ctx.db.get(profileId);
    if (!targetProfile) throw new Error("User not found");
    if (targetProfile.userId === adminUserId) throw new Error("Cannot reset your own progress");

    const targetUserId = targetProfile.userId;

    const stats = await ctx.db
      .query("userStats")
      .withIndex("by_userId", (q) => q.eq("userId", targetUserId))
      .unique();
    if (stats) {
      await ctx.db.patch(stats._id, {
        xp: 0, level: 1, currentStreak: 0, longestStreak: 0,
        lastLogDate: undefined, totalMealsLogged: 0, totalWorkoutsLogged: 0, proteinGoalStreak: 0,
      });
    }

    const achievements = await ctx.db
      .query("achievements")
      .withIndex("by_userId", (q) => q.eq("userId", targetUserId))
      .collect();
    for (const a of achievements) await ctx.db.delete(a._id);

    return { success: true, name: targetProfile.name };
  },
});

/** Admin: reset ALL user data (admin+ only) */
export const resetUserAllData = mutation({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, { profileId }) => {
    const { userId: adminUserId } = await requireAdmin(ctx);

    const targetProfile = await ctx.db.get(profileId);
    if (!targetProfile) throw new Error("User not found");
    if (targetProfile.userId === adminUserId) throw new Error("Cannot reset your own data");

    const targetUserId = targetProfile.userId;

    const dataTables = [
      { table: "foodLogs", index: "by_userId" },
      { table: "mealPlans", index: "by_userId" },
      { table: "groceryLists", index: "by_userId" },
      { table: "workoutPlans", index: "by_userId" },
      { table: "workoutLogs", index: "by_userId" },
      { table: "progressLogs", index: "by_userId" },
      { table: "medicationLogs", index: "by_userId" },
      { table: "socialPosts", index: "by_userId" },
      { table: "savedMeals", index: "by_userId" },
    ] as const;

    let totalDeleted = 0;
    for (const { table, index } of dataTables) {
      const rows = await (ctx.db.query(table as any) as any)
        .withIndex(index, (q: any) => q.eq("userId", targetUserId))
        .collect();
      for (const row of rows) { await ctx.db.delete(row._id); totalDeleted++; }
    }

    const stats = await ctx.db
      .query("userStats")
      .withIndex("by_userId", (q) => q.eq("userId", targetUserId))
      .unique();
    if (stats) {
      await ctx.db.patch(stats._id, {
        xp: 0, level: 1, currentStreak: 0, longestStreak: 0,
        lastLogDate: undefined, totalMealsLogged: 0, totalWorkoutsLogged: 0, proteinGoalStreak: 0,
      });
    }

    const achievements = await ctx.db
      .query("achievements")
      .withIndex("by_userId", (q) => q.eq("userId", targetUserId))
      .collect();
    for (const a of achievements) { await ctx.db.delete(a._id); totalDeleted++; }

    return { success: true, name: targetProfile.name, totalDeleted };
  },
});

/** One-time migration: ensure the current isAdmin=true user becomes owner */
export const migrateToAdminLevels = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    if (!profile) throw new Error("No profile");
    if (profile.isAdmin && !profile.adminLevel) {
      await ctx.db.patch(profile._id, { adminLevel: "owner" });
      return { migrated: true };
    }
    return { migrated: false };
  },
});

/* ═══════════════════════════════════════════════════
   ADMIN: ACHIEVEMENT MANAGEMENT
   ═══════════════════════════════════════════════════ */
/** Admin: grant a specific achievement to any user */
export const adminGrantAchievement = mutation({
  args: { profileId: v.id("profiles"), achievementType: v.string() },
  returns: v.any(),
  handler: async (ctx, { profileId, achievementType }) => {
    await requireAdmin(ctx);
    const target = await ctx.db.get(profileId);
    if (!target) throw new Error("User not found");

    const existing = await ctx.db.query("achievements")
      .withIndex("by_userId", (q) => q.eq("userId", target.userId))
      .collect();
    if (existing.some((a) => a.type === achievementType)) return { alreadyHas: true };

    const def = ACHIEVEMENT_DEFS.find((d) => d.type === achievementType);
    if (!def) throw new Error("Unknown achievement type");

    const today = new Date().toISOString().split("T")[0];
    await ctx.db.insert("achievements", {
      userId: target.userId,
      type: def.type,
      name: def.name,
      description: def.description,
      earnedAt: today,
      xpAwarded: def.xp,
    });

    const stats = await ctx.db.query("userStats").withIndex("by_userId", (q) => q.eq("userId", target.userId)).unique();
    if (stats && def.xp > 0) await ctx.db.patch(stats._id, { xp: stats.xp + def.xp });

    return { granted: true, name: def.name };
  },
});

/** Admin: revoke a specific achievement from any user */
export const adminRevokeAchievement = mutation({
  args: { profileId: v.id("profiles"), achievementType: v.string() },
  returns: v.any(),
  handler: async (ctx, { profileId, achievementType }) => {
    await requireAdmin(ctx);
    const target = await ctx.db.get(profileId);
    if (!target) throw new Error("User not found");

    const ach = await ctx.db.query("achievements")
      .withIndex("by_userId", (q) => q.eq("userId", target.userId))
      .collect();
    const found = ach.find((a) => a.type === achievementType);
    if (!found) return { notFound: true };

    await ctx.db.delete(found._id);

    const stats = await ctx.db.query("userStats").withIndex("by_userId", (q) => q.eq("userId", target.userId)).unique();
    if (stats && found.xpAwarded > 0) {
      await ctx.db.patch(stats._id, { xp: Math.max(0, stats.xp - found.xpAwarded) });
    }
    return { revoked: true };
  },
});

/** Admin: grant ALL achievements to a user */
export const adminGrantAllAchievements = mutation({
  args: { profileId: v.id("profiles") },
  returns: v.any(),
  handler: async (ctx, { profileId }) => {
    await requireAdmin(ctx);
    const target = await ctx.db.get(profileId);
    if (!target) throw new Error("User not found");

    const existing = await ctx.db.query("achievements")
      .withIndex("by_userId", (q) => q.eq("userId", target.userId))
      .collect();
    const existingTypes = new Set(existing.map((a) => a.type));
    const today = new Date().toISOString().split("T")[0];
    let xpAdded = 0;
    let granted = 0;

    for (const def of ACHIEVEMENT_DEFS) {
      if (existingTypes.has(def.type)) continue;
      await ctx.db.insert("achievements", {
        userId: target.userId,
        type: def.type,
        name: def.name,
        description: def.description,
        earnedAt: today,
        xpAwarded: def.xp,
      });
      xpAdded += def.xp;
      granted++;
    }

    const stats = await ctx.db.query("userStats").withIndex("by_userId", (q) => q.eq("userId", target.userId)).unique();
    if (stats && xpAdded > 0) await ctx.db.patch(stats._id, { xp: stats.xp + xpAdded });

    return { granted, xpAdded };
  },
});

/** Admin: revoke ALL achievements from a user */
export const adminRevokeAllAchievements = mutation({
  args: { profileId: v.id("profiles") },
  returns: v.any(),
  handler: async (ctx, { profileId }) => {
    await requireAdmin(ctx);
    const target = await ctx.db.get(profileId);
    if (!target) throw new Error("User not found");

    const achs = await ctx.db.query("achievements")
      .withIndex("by_userId", (q) => q.eq("userId", target.userId))
      .collect();
    for (const a of achs) await ctx.db.delete(a._id);

    const stats = await ctx.db.query("userStats").withIndex("by_userId", (q) => q.eq("userId", target.userId)).unique();
    if (stats) await ctx.db.patch(stats._id, { xp: 0 });

    return { revoked: achs.length };
  },
});

/** Admin: override a user's XP directly */
export const adminSetXP = mutation({
  args: { profileId: v.id("profiles"), xp: v.number() },
  returns: v.any(),
  handler: async (ctx, { profileId, xp }) => {
    await requireAdmin(ctx);
    const target = await ctx.db.get(profileId);
    if (!target) throw new Error("User not found");
    const stats = await ctx.db.query("userStats").withIndex("by_userId", (q) => q.eq("userId", target.userId)).unique();
    if (!stats) throw new Error("No stats found");
    await ctx.db.patch(stats._id, { xp });
    return { success: true };
  },
});

/** Admin: override a user's level directly */
export const adminSetLevel = mutation({
  args: { profileId: v.id("profiles"), level: v.number() },
  returns: v.any(),
  handler: async (ctx, { profileId, level }) => {
    await requireAdmin(ctx);
    const target = await ctx.db.get(profileId);
    if (!target) throw new Error("User not found");
    const stats = await ctx.db.query("userStats").withIndex("by_userId", (q) => q.eq("userId", target.userId)).unique();
    if (!stats) throw new Error("No stats found");
    await ctx.db.patch(stats._id, { level });
    return { success: true };
  },
});

/** Admin: get all achievements for any user */
export const adminGetUserAchievements = query({
  args: { profileId: v.id("profiles") },
  returns: v.any(),
  handler: async (ctx, { profileId }) => {
    const callerUserId = await getAuthUserId(ctx);
    if (!callerUserId) throw new Error("Not authenticated");
    const callerProfile = await ctx.db.query("profiles").withIndex("by_userId", (q) => q.eq("userId", callerUserId)).unique();
    const level = resolveAdminLevel(callerProfile);
    if (!hasAdminPanelAccess(level)) throw new Error("Not authorized");

    const target = await ctx.db.get(profileId);
    if (!target) throw new Error("User not found");

    return ctx.db.query("achievements").withIndex("by_userId", (q) => q.eq("userId", target.userId)).collect();
  },
});

/** Admin: reset a user's food logs for today */
export const resetUserTodayLogs = mutation({
  args: { profileId: v.id("profiles") },
  handler: async (ctx, { profileId }) => {
    await requireAdmin(ctx);

    const targetProfile = await ctx.db.get(profileId);
    if (!targetProfile) throw new Error("User not found");

    const today = new Date().toISOString().split("T")[0];

    const logs = await ctx.db
      .query("foodLogs")
      .withIndex("by_userId_date", (q) =>
        q.eq("userId", targetProfile.userId).eq("date", today)
      )
      .collect();

    for (const log of logs) await ctx.db.delete(log._id);

    return { deleted: logs.length, name: targetProfile.name };
  },
});

/** Admin: force-regenerate meal plan for any user */
export const adminForceRegenPlan = mutation({
  args: { profileId: v.id("profiles") },
  returns: v.any(),
  handler: async (ctx, { profileId }) => {
    await requireAdmin(ctx);
    const target = await ctx.db.get(profileId);
    if (!target) throw new Error("User not found");

    // Delete existing plans so next load regenerates
    const plans = await ctx.db.query("mealPlans").withIndex("by_userId", (q) => q.eq("userId", target.userId)).collect();
    for (const p of plans) await ctx.db.delete(p._id);
    return { deleted: plans.length };
  },
});

/** Admin: get audit log (most recent 100 entries) */
export const getAuditLog = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const logs = await ctx.db.query("auditLogs")
      .withIndex("by_timestamp")
      .order("desc")
      .take(100);
    // Enrich with admin + target names
    return Promise.all(logs.map(async (log) => {
      const adminProfile = await ctx.db.query("profiles").withIndex("by_userId", q => q.eq("userId", log.adminUserId)).unique();
      const targetProfile = await ctx.db.query("profiles").withIndex("by_userId", q => q.eq("userId", log.targetUserId)).unique();
      return {
        ...log,
        adminName: adminProfile?.name || "Unknown",
        targetName: targetProfile?.name || "Unknown",
      };
    }));
  },
});

/** User: get my own email history (all emails Plate sent to me) */
export const getMyEmailHistory = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const logs = await ctx.db
      .query("emailLogs")
      .withIndex("by_recipientUserId", (q) => q.eq("recipientUserId", userId))
      .order("desc")
      .collect();
    return logs;
  },
});
