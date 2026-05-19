import { getAuthUserId } from "@convex-dev/auth/server";
import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id, Doc } from "./_generated/dataModel";
import { getStoreByKey, getBestStoreForZip } from "./stores";

/* ─── Helpers ─────────────────────────────────────────────────── */

function categorizeIngredient(name: string): string {
  const lower = name.toLowerCase();
  const proteins = ["chicken", "turkey", "beef", "salmon", "tuna", "shrimp", "egg", "whey", "protein", "sausage", "bacon", "deli", "pork", "lamb", "steak", "cod", "tilapia", "tofu", "tempeh"];
  const carbs = ["rice", "oat", "bread", "tortilla", "pasta", "quinoa", "potato", "bun", "granola", "rice cake", "noodle", "couscous", "cereal", "sweet potato"];
  const produce = ["broccoli", "spinach", "pepper", "tomato", "banana", "apple", "berry", "blueberry", "avocado", "lettuce", "asparagus", "zucchini", "cucumber", "onion", "brussels", "pineapple", "cranberry", "pea", "corn", "carrot", "edamame", "cauliflower", "parsley", "green onion", "lime", "lemon", "garlic", "ginger", "mushroom", "celery", "kale"];
  const fats = ["olive oil", "butter", "peanut butter", "almond butter", "cheese", "feta", "parmesan", "sesame oil", "walnut", "almond", "chia", "chocolate", "coconut", "cream", "yogurt", "milk", "sour cream"];

  if (proteins.some((p) => lower.includes(p))) return "Proteins";
  if (carbs.some((c) => lower.includes(c))) return "Carbs & Grains";
  if (produce.some((p) => lower.includes(p))) return "Produce";
  if (fats.some((f) => lower.includes(f))) return "Fats & Dairy";
  return "Pantry";
}

/**
 * Core grocery calculation logic — shared between manual generation and auto-sync.
 * Returns items grouped by category with checkmark preservation.
 * NO PRICING — just a clean shopping list.
 */
async function calculateGroceryItems(
  ctx: any,
  plan: Doc<"mealPlans">,
  previousItems?: Array<{ name: string; checked: boolean }>,
) {
  // Build a lookup of previously checked items (case-insensitive)
  const checkedMap = new Map<string, boolean>();
  if (previousItems) {
    for (const item of previousItems) {
      checkedMap.set(item.name.toLowerCase(), item.checked);
    }
  }

  // Collect all active (non-skipped) meal IDs
  const mealIds = new Set<string>();
  const mealCounts: Record<string, number> = {};
  for (const day of plan.days) {
    for (const m of day.meals) {
      if (m.mealId && !m.skipped) {
        mealIds.add(m.mealId);
        mealCounts[m.mealId] = (mealCounts[m.mealId] || 0) + 1;
      }
    }
  }

  // Fetch meals
  const mealsMap: Record<string, Doc<"meals">> = {};
  for (const id of mealIds) {
    const meal = await ctx.db.get(id as Id<"meals">);
    if (meal) mealsMap[id] = meal;
  }

  // Aggregate ingredients
  const ingredientMap: Record<string, { amount: number; unit: string; category: string }> = {};
  for (const [mealId, count] of Object.entries(mealCounts)) {
    const meal = mealsMap[mealId];
    if (!meal) continue;
    for (const ing of meal.ingredients) {
      const key = ing.name.toLowerCase();
      if (!ingredientMap[key]) {
        ingredientMap[key] = { amount: 0, unit: ing.unit, category: categorizeIngredient(ing.name) };
      }
      const numAmount = parseFloat(ing.amount) || 1;
      ingredientMap[key].amount += numAmount * count;
    }
  }

  // Build items — no prices
  const items = Object.entries(ingredientMap).map(([name, data]) => {
    const displayName = name.charAt(0).toUpperCase() + name.slice(1);
    const wasChecked = checkedMap.get(name) ?? false;

    return {
      name: displayName,
      amount: `${Math.round(data.amount * 10) / 10} ${data.unit}`,
      category: data.category,
      checked: wasChecked,
    };
  });

  items.sort((a, b) => a.category.localeCompare(b.category));

  // Track removed/added items for toast
  const removedItems: string[] = [];
  const addedItems: string[] = [];
  if (previousItems) {
    const newNameSet = new Set(items.map((i) => i.name.toLowerCase()));
    const oldNameSet = new Set(previousItems.map((i) => i.name.toLowerCase()));
    for (const old of previousItems) {
      if (!newNameSet.has(old.name.toLowerCase())) removedItems.push(old.name);
    }
    for (const item of items) {
      if (!oldNameSet.has(item.name.toLowerCase())) addedItems.push(item.name);
    }
  }

  return { items, removedItems, addedItems };
}

/* ─── Queries ─────────────────────────────────────────────────── */

export const getCurrentGroceryList = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const lists = await ctx.db.query("groceryLists").withIndex("by_userId", (q) => q.eq("userId", userId)).collect();
    return lists.length > 0 ? lists[lists.length - 1] : null;
  },
});

/** Returns the plan version so the frontend can detect sync state */
export const getGrocerySyncStatus = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const plans = await ctx.db.query("mealPlans").withIndex("by_userId", (q) => q.eq("userId", userId)).collect();
    const plan = plans.length > 0 ? plans[plans.length - 1] : null;

    const lists = await ctx.db.query("groceryLists").withIndex("by_userId", (q) => q.eq("userId", userId)).collect();
    const list = lists.length > 0 ? lists[lists.length - 1] : null;

    if (!plan) return { hasPlan: false, hasGrocery: false, inSync: true };
    if (!list) return { hasPlan: true, hasGrocery: false, inSync: false };

    const planVersion = (plan as any).version ?? 0;
    const syncedVersion = (list as any).syncedPlanVersion ?? -1;

    return {
      hasPlan: true,
      hasGrocery: true,
      inSync: syncedVersion >= planVersion,
      planVersion,
      syncedVersion,
    };
  },
});

/* ─── Mutations ───────────────────────────────────────────────── */

export const generateGroceryList = mutation({
  args: { storeKey: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, { storeKey }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db.query("profiles").withIndex("by_userId", (q) => q.eq("userId", userId)).unique();
    if (!profile) throw new Error("No profile");

    const plans = await ctx.db.query("mealPlans").withIndex("by_userId", (q) => q.eq("userId", userId)).collect();
    const plan = plans[plans.length - 1];
    if (!plan) throw new Error("No meal plan. Generate a meal plan first.");

    const store = storeKey ? getStoreByKey(storeKey) : getBestStoreForZip(profile.zipCode);

    const { items } = await calculateGroceryItems(ctx, plan);

    // Delete old lists
    const oldLists = await ctx.db.query("groceryLists").withIndex("by_userId", (q) => q.eq("userId", userId)).collect();
    for (const old of oldLists) {
      await ctx.db.delete(old._id);
    }

    const listId = await ctx.db.insert("groceryLists", {
      userId,
      weekStart: plan.weekStart,
      mealPlanId: plan._id,
      zipCode: profile.zipCode,
      store: store.name,
      items,
      syncedPlanVersion: (plan as any).version ?? 0,
    });

    return listId;
  },
});

/**
 * Internal mutation — called automatically whenever a meal plan changes.
 * Preserves checkmarks for unchanged items.
 */
export const syncGroceryFromPlan = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const profile = await ctx.db.query("profiles").withIndex("by_userId", (q) => q.eq("userId", userId)).unique();
    if (!profile) return;

    const plans = await ctx.db.query("mealPlans").withIndex("by_userId", (q) => q.eq("userId", userId)).collect();
    const plan = plans[plans.length - 1];
    if (!plan) return;

    const lists = await ctx.db.query("groceryLists").withIndex("by_userId", (q) => q.eq("userId", userId)).collect();
    const existingList = lists.length > 0 ? lists[lists.length - 1] : null;

    // No grocery list exists yet — nothing to sync
    if (!existingList) return;

    const previousItems = existingList.items.map((i: any) => ({ name: i.name, checked: i.checked }));

    const { items, removedItems, addedItems } = await calculateGroceryItems(
      ctx, plan, previousItems
    );

    // Update existing list in place
    await ctx.db.patch(existingList._id, {
      mealPlanId: plan._id,
      weekStart: plan.weekStart,
      items,
      syncedPlanVersion: (plan as any).version ?? 0,
      lastSyncAdded: addedItems.length > 0 ? addedItems : undefined,
      lastSyncRemoved: removedItems.length > 0 ? removedItems : undefined,
    });
  },
});

/** Switch store on an existing grocery list — just updates the store label (no pricing). */
export const switchStore = mutation({
  args: { storeKey: v.string() },
  returns: v.any(),
  handler: async (ctx, { storeKey }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const lists = await ctx.db.query("groceryLists").withIndex("by_userId", (q) => q.eq("userId", userId)).collect();
    const list = lists.length > 0 ? lists[lists.length - 1] : null;
    if (!list) throw new Error("No grocery list yet");

    const newStore = getStoreByKey(storeKey);
    await ctx.db.patch(list._id, { store: newStore.name });
    return { store: newStore.name };
  },
});

/** Toggle an item's checked state */
export const toggleGroceryItem = mutation({
  args: { itemIndex: v.number() },
  returns: v.null(),
  handler: async (ctx, { itemIndex }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const lists = await ctx.db.query("groceryLists").withIndex("by_userId", (q) => q.eq("userId", userId)).collect();
    const list = lists.length > 0 ? lists[lists.length - 1] : null;
    if (!list) throw new Error("No grocery list");

    const items = [...list.items];
    if (itemIndex < 0 || itemIndex >= items.length) throw new Error("Invalid index");
    items[itemIndex] = { ...items[itemIndex], checked: !items[itemIndex].checked };
    await ctx.db.patch(list._id, { items });
    return null;
  },
});

/** Manual regenerate — safety net button. Preserves checkmarks. */
export const regenerateGroceryList = mutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db.query("profiles").withIndex("by_userId", (q) => q.eq("userId", userId)).unique();
    if (!profile) throw new Error("No profile");

    const plans = await ctx.db.query("mealPlans").withIndex("by_userId", (q) => q.eq("userId", userId)).collect();
    const plan = plans[plans.length - 1];
    if (!plan) throw new Error("No meal plan");

    const lists = await ctx.db.query("groceryLists").withIndex("by_userId", (q) => q.eq("userId", userId)).collect();
    const existingList = lists.length > 0 ? lists[lists.length - 1] : null;

    const previousItems = existingList?.items.map((i: any) => ({ name: i.name, checked: i.checked }));
    const { items } = await calculateGroceryItems(ctx, plan, previousItems);

    if (existingList) {
      await ctx.db.patch(existingList._id, {
        mealPlanId: plan._id,
        weekStart: plan.weekStart,
        items,
        syncedPlanVersion: (plan as any).version ?? 0,
      });
    } else {
      const store = getBestStoreForZip(profile.zipCode);
      await ctx.db.insert("groceryLists", {
        userId,
        weekStart: plan.weekStart,
        mealPlanId: plan._id,
        zipCode: profile.zipCode,
        store: store.name,
        items,
        syncedPlanVersion: (plan as any).version ?? 0,
      });
    }

    return null;
  },
});
