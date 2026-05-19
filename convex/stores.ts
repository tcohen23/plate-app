import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

/**
 * Comprehensive US grocery store database.
 * Each store has a name, pricing tier, and the ZIP-code prefixes (first 3 digits)
 * where it operates. "nationwide" means available everywhere.
 */
interface StoreInfo {
  key: string;
  name: string;
  multiplier: number; // price multiplier vs. national average
  regions: "nationwide" | number[][]; // ranges of 3-digit ZIP prefixes
}

const STORES: StoreInfo[] = [
  // --- Nationwide / near-nationwide ---
  { key: "walmart", name: "Walmart", multiplier: 0.85, regions: "nationwide" },
  { key: "target", name: "Target", multiplier: 1.05, regions: "nationwide" },
  { key: "costco", name: "Costco", multiplier: 0.80, regions: "nationwide" },
  { key: "sams_club", name: "Sam's Club", multiplier: 0.82, regions: "nationwide" },
  { key: "aldi", name: "Aldi", multiplier: 0.78, regions: [[0, 199], [200, 399], [400, 599], [600, 699], [700, 799]] },
  { key: "whole_foods", name: "Whole Foods", multiplier: 1.30, regions: "nationwide" },
  { key: "trader_joes", name: "Trader Joe's", multiplier: 1.05, regions: "nationwide" },

  // --- Southeast ---
  { key: "publix", name: "Publix", multiplier: 1.12, regions: [[200, 349], [320, 349], [370, 399]] },
  { key: "food_lion", name: "Food Lion", multiplier: 0.90, regions: [[200, 299], [270, 289], [300, 319], [370, 379], [230, 249]] },
  { key: "harris_teeter", name: "Harris Teeter", multiplier: 1.10, regions: [[200, 299], [270, 289], [300, 319]] },
  { key: "winn_dixie", name: "Winn-Dixie", multiplier: 0.92, regions: [[320, 349], [350, 369], [700, 714]] },
  { key: "piggly_wiggly", name: "Piggly Wiggly", multiplier: 0.88, regions: [[290, 299], [350, 369], [370, 399], [530, 549]] },
  { key: "bi_lo", name: "BI-LO", multiplier: 0.91, regions: [[290, 299], [300, 319]] },

  // --- Northeast ---
  { key: "wegmans", name: "Wegmans", multiplier: 1.18, regions: [[0, 99], [100, 149], [170, 199], [200, 219]] },
  { key: "stop_shop", name: "Stop & Shop", multiplier: 1.10, regions: [[0, 69], [100, 119]] },
  { key: "shoprite", name: "ShopRite", multiplier: 1.00, regions: [[0, 99], [100, 119], [170, 199]] },
  { key: "giant", name: "Giant", multiplier: 1.05, regions: [[170, 199], [200, 219]] },
  { key: "market_basket", name: "Market Basket", multiplier: 0.88, regions: [[0, 39]] },
  { key: "hannaford", name: "Hannaford", multiplier: 0.95, regions: [[0, 49], [120, 149]] },

  // --- Midwest ---
  { key: "kroger", name: "Kroger", multiplier: 0.95, regions: [[400, 479], [480, 499], [300, 319], [370, 399], [430, 458], [700, 714]] },
  { key: "meijer", name: "Meijer", multiplier: 0.92, regions: [[480, 499], [430, 449], [460, 479], [530, 549], [600, 629]] },
  { key: "hy_vee", name: "Hy-Vee", multiplier: 0.93, regions: [[500, 528], [550, 567], [600, 629], [680, 693]] },
  { key: "schnucks", name: "Schnucks", multiplier: 0.94, regions: [[600, 629], [470, 479]] },
  { key: "jewel_osco", name: "Jewel-Osco", multiplier: 1.02, regions: [[600, 629]] },

  // --- South Central / Texas ---
  { key: "heb", name: "H-E-B", multiplier: 0.88, regions: [[750, 799]] },
  { key: "brookshire", name: "Brookshire's", multiplier: 0.91, regions: [[715, 749], [750, 769]] },

  // --- Mountain West ---
  { key: "smiths", name: "Smith's", multiplier: 0.96, regions: [[800, 849], [870, 884]] },
  { key: "king_soopers", name: "King Soopers", multiplier: 0.95, regions: [[800, 816]] },
  { key: "albertsons", name: "Albertsons", multiplier: 1.05, regions: [[800, 899], [900, 961]] },
  { key: "winco", name: "WinCo Foods", multiplier: 0.82, regions: [[830, 838], [840, 847], [900, 961], [970, 979]] },

  // --- Pacific / West Coast ---
  { key: "safeway", name: "Safeway", multiplier: 1.08, regions: [[900, 961], [970, 994]] },
  { key: "vons", name: "Vons", multiplier: 1.10, regions: [[900, 935]] },
  { key: "ralphs", name: "Ralphs", multiplier: 1.08, regions: [[900, 935]] },
  { key: "fred_meyer", name: "Fred Meyer", multiplier: 1.00, regions: [[970, 994]] },
  { key: "sprouts", name: "Sprouts", multiplier: 1.12, regions: [[750, 799], [800, 865], [900, 961]] },
  { key: "grocery_outlet", name: "Grocery Outlet", multiplier: 0.80, regions: [[900, 961], [970, 994]] },
];

/**
 * Given a 5-digit ZIP code, return the stores available in that area.
 */
function getStoresForZip(zip: string): StoreInfo[] {
  const prefix = parseInt(zip.substring(0, 3));
  if (isNaN(prefix)) return STORES.filter((s) => s.regions === "nationwide");

  return STORES.filter((store) => {
    if (store.regions === "nationwide") return true;
    return (store.regions as number[][]).some(
      ([lo, hi]) => prefix >= lo && prefix <= hi
    );
  });
}

/**
 * Query: get stores available for the current user's ZIP code.
 * Returns local stores (based on ZIP) + a flag indicating more are available.
 */
export const getStoresForUser = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { local: [], all: [] };

    const profile = await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (!profile) return { local: [], all: [] };

    const localStores = getStoresForZip(profile.zipCode).map((s) => ({
      key: s.key,
      name: s.name,
      multiplier: s.multiplier,
      isLocal: true,
    }));

    // Sort: cheapest first
    localStores.sort((a, b) => a.multiplier - b.multiplier);

    // Also provide the full list for "Browse all stores"
    const allStores = STORES.map((s) => ({
      key: s.key,
      name: s.name,
      multiplier: s.multiplier,
      isLocal: localStores.some((l) => l.key === s.key),
    }));
    allStores.sort((a, b) => a.name.localeCompare(b.name));

    return { local: localStores, all: allStores, zipCode: profile.zipCode };
  },
});

/**
 * Get store info by key — used by grocery list generator.
 */
export function getStoreByKey(key: string) {
  const store = STORES.find((s) => s.key === key);
  return store || STORES[0]; // default to Walmart
}

/**
 * Get the best (cheapest local) store for a ZIP code.
 */
export function getBestStoreForZip(zip: string): { key: string; name: string; multiplier: number } {
  const local = getStoresForZip(zip);
  const sorted = [...local].sort((a, b) => a.multiplier - b.multiplier);
  return sorted[0] || STORES[0];
}

/**
 * Find a store by display name (e.g. "Walmart", "Whole Foods").
 * Falls back to Walmart if not found.
 */
export function getStoreByName(name: string) {
  const store = STORES.find((s) => s.name === name);
  return store || STORES[0];
}
