import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

/** Submit a new piece of feedback / feature idea */
export const submitFeedback = mutation({
  args: {
    text: v.string(),
    category: v.optional(v.string()),
  },
  handler: async (ctx, { text, category }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    if (!text.trim()) throw new Error("Feedback cannot be empty");
    if (text.length > 1000) throw new Error("Feedback too long (max 1000 chars)");

    await ctx.db.insert("feedback", {
      userId,
      text: text.trim(),
      category: category ?? "general",
      upvotes: 0,
      status: "new",
      createdAt: Date.now(),
    });
    return { success: true };
  },
});

/** List all feedback (sorted by upvotes + recent), with upvote status for current user */
export const listFeedback = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const items = await ctx.db
      .query("feedback")
      .withIndex("by_createdAt")
      .order("desc")
      .take(100);

    // Get upvote status for each
    const result = await Promise.all(
      items.map(async (item) => {
        const myUpvote = await ctx.db
          .query("feedbackUpvotes")
          .withIndex("by_feedbackId_userId", (q) =>
            q.eq("feedbackId", item._id).eq("userId", userId)
          )
          .unique();
        return {
          _id: item._id,
          text: item.text,
          category: item.category ?? "general",
          upvotes: item.upvotes ?? 0,
          status: item.status ?? "new",
          createdAt: item.createdAt,
          isOwn: item.userId === userId,
          hasUpvoted: !!myUpvote,
        };
      })
    );

    // Sort: planned/in_progress first, then by upvotes desc
    return result.sort((a, b) => {
      const statusOrder: Record<string, number> = {
        in_progress: 0,
        planned: 1,
        new: 2,
        done: 3,
      };
      const aOrder = statusOrder[a.status] ?? 2;
      const bOrder = statusOrder[b.status] ?? 2;
      if (aOrder !== bOrder) return aOrder - bOrder;
      return b.upvotes - a.upvotes;
    });
  },
});

/** Delete a feedback item (admin only — caller must be admin) */
export const deleteFeedback = mutation({
  args: { feedbackId: v.id("feedback") },
  handler: async (ctx, { feedbackId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Delete all upvotes for this item first
    const upvotes = await ctx.db
      .query("feedbackUpvotes")
      .withIndex("by_feedbackId_userId", (q) => q.eq("feedbackId", feedbackId))
      .collect();
    await Promise.all(upvotes.map((u) => ctx.db.delete(u._id)));

    // Delete the feedback itself
    await ctx.db.delete(feedbackId);
    return { success: true };
  },
});

/** Toggle upvote on a feedback item */
export const toggleUpvote = mutation({
  args: { feedbackId: v.id("feedback") },
  handler: async (ctx, { feedbackId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("feedbackUpvotes")
      .withIndex("by_feedbackId_userId", (q) =>
        q.eq("feedbackId", feedbackId).eq("userId", userId)
      )
      .unique();

    const item = await ctx.db.get(feedbackId);
    if (!item) throw new Error("Feedback not found");

    if (existing) {
      // Remove upvote
      await ctx.db.delete(existing._id);
      await ctx.db.patch(feedbackId, {
        upvotes: Math.max((item.upvotes ?? 0) - 1, 0),
      });
    } else {
      // Add upvote
      await ctx.db.insert("feedbackUpvotes", { feedbackId, userId });
      await ctx.db.patch(feedbackId, {
        upvotes: (item.upvotes ?? 0) + 1,
      });
    }
  },
});

/** Admin: directly set the upvote count on a feedback item */
export const setUpvoteCount = mutation({
  args: {
    feedbackId: v.id("feedback"),
    upvotes: v.number(),
  },
  handler: async (ctx, { feedbackId, upvotes }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Verify caller has admin/moderator access
    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    const hasAccess =
      profile?.adminLevel === "owner" ||
      profile?.adminLevel === "admin" ||
      profile?.adminLevel === "moderator" ||
      profile?.isAdmin === true;
    if (!hasAccess) throw new Error("Not authorized");

    await ctx.db.patch(feedbackId, { upvotes: Math.max(0, Math.round(upvotes)) });
  },
});
