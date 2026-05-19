import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requireAdmin } from "./admin";

/** Track a page view — called client-side on every route change */
export const trackPageView = mutation({
  args: {
    path: v.string(),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, { path, sessionId }) => {
    const userId = await getAuthUserId(ctx);
    // Normalise path — strip query strings and hash, keep only the route
    const cleanPath = path.split("?")[0].split("#")[0] || "/";
    await ctx.db.insert("pageViews", {
      path: cleanPath,
      userId: userId ?? undefined,
      sessionId: sessionId ?? undefined,
      ts: Date.now(),
    });
  },
});

/** Get page view stats grouped by page — admin+ only */
export const getPageViewStats = query({
  args: {
    days: v.optional(v.number()), // lookback window in days (default 30)
  },
  handler: async (ctx, { days = 30 }) => {
    await requireAdmin(ctx);

    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const rows = await ctx.db
      .query("pageViews")
      .withIndex("by_ts", (q) => q.gte("ts", cutoff))
      .collect();

    // Group by path
    const byPath: Record<string, { total: number; unique: Set<string> }> = {};
    for (const row of rows) {
      if (!byPath[row.path]) {
        byPath[row.path] = { total: 0, unique: new Set() };
      }
      byPath[row.path].total++;
      // Count unique by userId (if logged in) or sessionId (anonymous)
      const identifier = row.userId ?? row.sessionId;
      if (identifier) byPath[row.path].unique.add(identifier);
    }

    const pages = Object.entries(byPath)
      .map(([path, data]) => ({
        path,
        total: data.total,
        unique: data.unique.size,
      }))
      .sort((a, b) => b.total - a.total);

    // Total across all pages
    const totalViews = rows.length;
    const uniqueVisitors = new Set(
      rows.map((r) => r.userId ?? r.sessionId).filter(Boolean)
    ).size;

    // Daily breakdown (last 14 days)
    const dailyCounts: Record<string, number> = {};
    for (const row of rows) {
      const day = new Date(row.ts).toISOString().split("T")[0];
      dailyCounts[day] = (dailyCounts[day] || 0) + 1;
    }
    const daily = Object.entries(dailyCounts)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14)
      .map(([date, count]) => ({ date, count }));

    return { pages, totalViews, uniqueVisitors, daily, days };
  },
});

/** Get auth user count — for accuracy check vs profiles */
export const getAuthUserCount = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const users = await ctx.db.query("users").collect();
    return users.length;
  },
});
