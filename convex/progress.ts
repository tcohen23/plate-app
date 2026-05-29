import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getUserStats = query({
  args: { localDate: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const stats = await ctx.db.query("userStats").withIndex("by_userId", (q) => q.eq("userId", userId)).unique();
    if (!stats) return null;

    // Use client's local date to avoid UTC midnight rollover breaking streaks
    const today = args.localDate || new Date().toISOString().split("T")[0];
    const yesterdayDate = new Date(today + "T12:00:00Z");
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = yesterdayDate.toISOString().split("T")[0];

    // Recompute live streak — if lastLogDate is not today or yesterday, streak has broken
    const streakAlive = stats.lastLogDate === today || stats.lastLogDate === yesterdayStr;
    const liveStreak = streakAlive ? stats.currentStreak : 0;

    return { ...stats, currentStreak: liveStreak };
  },
});

export const getProgressLogs = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db.query("progressLogs").withIndex("by_userId", (q) => q.eq("userId", userId)).collect();
  },
});

export const logWeight = mutation({
  args: {
    weight: v.number(),
    bodyFat: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  returns: v.id("progressLogs"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const today = new Date().toISOString().split("T")[0];

    // Check if already logged today
    const existing = await ctx.db.query("progressLogs")
      .withIndex("by_userId_date", (q) => q.eq("userId", userId).eq("date", today))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { weight: args.weight, bodyFat: args.bodyFat, notes: args.notes });
      return existing._id;
    }

    return await ctx.db.insert("progressLogs", {
      userId,
      date: today,
      ...args,
    });
  },
});

export const getAchievements = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db.query("achievements").withIndex("by_userId", (q) => q.eq("userId", userId)).collect();
  },
});

/* ─── Master achievement definitions ─── */
export const ACHIEVEMENT_DEFS: Array<{ type: string; name: string; description: string; xp: number; emoji: string; category: string }> = [
  // ── Logging streaks ──
  { type: "streak_1", name: "Day One", description: "Logged your first day in a row", xp: 5, emoji: "🌱", category: "streak" },
  { type: "streak_3", name: "On a Roll", description: "3-day logging streak", xp: 25, emoji: "🔥", category: "streak" },
  { type: "streak_7", name: "Week Warrior", description: "7-day logging streak", xp: 50, emoji: "⚡", category: "streak" },
  { type: "streak_14", name: "Two Week Titan", description: "14-day logging streak", xp: 100, emoji: "💪", category: "streak" },
  { type: "streak_21", name: "Three Week Machine", description: "21-day logging streak", xp: 150, emoji: "🏋️", category: "streak" },
  { type: "streak_30", name: "Month Master", description: "30-day logging streak", xp: 250, emoji: "🏆", category: "streak" },
  { type: "streak_45", name: "Relentless", description: "45-day logging streak", xp: 350, emoji: "🔱", category: "streak" },
  { type: "streak_60", name: "Two Month Beast", description: "60-day logging streak", xp: 500, emoji: "🦾", category: "streak" },
  { type: "streak_90", name: "Quarter Year King", description: "90-day logging streak", xp: 750, emoji: "👑", category: "streak" },
  { type: "streak_180", name: "Half Year Legend", description: "180-day logging streak", xp: 1500, emoji: "🌟", category: "streak" },
  { type: "streak_365", name: "Full Year God Mode", description: "365-day logging streak", xp: 5000, emoji: "🎖️", category: "streak" },
  // ── Meals logged ──
  { type: "meals_1", name: "First Bite", description: "Logged your first meal", xp: 10, emoji: "🍽️", category: "meals" },
  { type: "meals_5", name: "Five and Counting", description: "Logged 5 meals", xp: 15, emoji: "✅", category: "meals" },
  { type: "meals_10", name: "Getting Consistent", description: "Logged 10 meals", xp: 20, emoji: "📈", category: "meals" },
  { type: "meals_25", name: "Quarter Century", description: "Logged 25 meals", xp: 40, emoji: "🥇", category: "meals" },
  { type: "meals_50", name: "Meal Tracker Pro", description: "Logged 50 meals", xp: 75, emoji: "🏅", category: "meals" },
  { type: "meals_100", name: "Century Club", description: "Logged 100 meals", xp: 150, emoji: "💯", category: "meals" },
  { type: "meals_200", name: "200 Meals Deep", description: "Logged 200 meals", xp: 250, emoji: "🍱", category: "meals" },
  { type: "meals_365", name: "Year of Eating Right", description: "Logged 365 meals", xp: 400, emoji: "🗓️", category: "meals" },
  { type: "meals_500", name: "500 Club", description: "Logged 500 meals", xp: 600, emoji: "🌠", category: "meals" },
  { type: "meals_750", name: "750 Strong", description: "Logged 750 meals", xp: 800, emoji: "💫", category: "meals" },
  { type: "meals_1000", name: "One Thousand Meals", description: "Logged 1000 meals", xp: 1200, emoji: "🏆", category: "meals" },
  // ── Workouts logged ──
  { type: "workout_1", name: "First Rep", description: "Logged your first workout", xp: 15, emoji: "💪", category: "workouts" },
  { type: "workout_5", name: "Five Sessions", description: "Logged 5 workouts", xp: 30, emoji: "🏃", category: "workouts" },
  { type: "workout_10", name: "Gym Regular", description: "Logged 10 workouts", xp: 50, emoji: "🏋️", category: "workouts" },
  { type: "workout_25", name: "25 Sessions Done", description: "Logged 25 workouts", xp: 100, emoji: "🎯", category: "workouts" },
  { type: "workout_50", name: "50 Workouts", description: "Logged 50 workouts", xp: 200, emoji: "🔥", category: "workouts" },
  { type: "workout_100", name: "100 Workouts", description: "Logged 100 workouts", xp: 400, emoji: "⚡", category: "workouts" },
  { type: "workout_200", name: "200 Sessions", description: "Logged 200 workouts", xp: 750, emoji: "🦾", category: "workouts" },
  { type: "workout_365", name: "A Year of Reps", description: "Logged 365 workouts", xp: 1500, emoji: "🌟", category: "workouts" },
  // ── XP / Levels ──
  { type: "xp_100", name: "First 100 XP", description: "Earned 100 XP", xp: 0, emoji: "⭐", category: "level" },
  { type: "xp_500", name: "500 XP", description: "Earned 500 XP", xp: 0, emoji: "🌙", category: "level" },
  { type: "xp_1000", name: "1K XP Club", description: "Earned 1000 XP", xp: 0, emoji: "💎", category: "level" },
  { type: "xp_5000", name: "5K Powerhouse", description: "Earned 5000 XP", xp: 0, emoji: "🔮", category: "level" },
  { type: "xp_10000", name: "10K Legend", description: "Earned 10,000 XP", xp: 0, emoji: "👑", category: "level" },
  { type: "level_2", name: "Level Up", description: "Reached level 2", xp: 10, emoji: "📶", category: "level" },
  { type: "level_3", name: "Level 3", description: "Reached level 3", xp: 15, emoji: "📶", category: "level" },
  { type: "level_5", name: "Rising Star", description: "Reached level 5", xp: 30, emoji: "⭐", category: "level" },
  { type: "level_10", name: "Nutrition Ninja", description: "Reached level 10", xp: 75, emoji: "🥷", category: "level" },
  { type: "level_20", name: "Macro Master", description: "Reached level 20", xp: 150, emoji: "🧬", category: "level" },
  { type: "level_30", name: "Elite Tracker", description: "Reached level 30", xp: 300, emoji: "🎯", category: "level" },
  { type: "level_50", name: "Half Century", description: "Reached level 50", xp: 500, emoji: "🔱", category: "level" },
  { type: "level_75", name: "Platinum Status", description: "Reached level 75", xp: 1000, emoji: "💠", category: "level" },
  { type: "level_100", name: "Centurion", description: "Reached level 100", xp: 2000, emoji: "👑", category: "level" },
  // ── Protein goals ──
  { type: "protein_goal_1", name: "Protein Checked", description: "Hit your protein goal for the first time", xp: 20, emoji: "🥩", category: "nutrition" },
  { type: "protein_goal_3", name: "Protein Streak", description: "Hit protein goal 3 days in a row", xp: 40, emoji: "🥩", category: "nutrition" },
  { type: "protein_goal_7", name: "Protein Week", description: "Hit protein goal 7 days in a row", xp: 80, emoji: "💪", category: "nutrition" },
  { type: "protein_goal_14", name: "Protein Fortnight", description: "Hit protein goal 14 days in a row", xp: 150, emoji: "🥩", category: "nutrition" },
  { type: "protein_goal_30", name: "Protein King", description: "Hit protein goal 30 days in a row", xp: 400, emoji: "👑", category: "nutrition" },
  // ── Hydration ──
  { type: "hydration_1", name: "First Glass", description: "Logged hydration for the first time", xp: 5, emoji: "💧", category: "hydration" },
  { type: "hydration_goal_1", name: "Hydrated", description: "Hit your water goal for the first time", xp: 15, emoji: "💧", category: "hydration" },
  { type: "hydration_goal_3", name: "Three Day Hydration", description: "Hit water goal 3 days in a row", xp: 30, emoji: "🌊", category: "hydration" },
  { type: "hydration_goal_7", name: "Water Week", description: "Hit water goal 7 days in a row", xp: 60, emoji: "🌊", category: "hydration" },
  { type: "hydration_goal_30", name: "Hydration Master", description: "Hit water goal 30 days in a row", xp: 200, emoji: "🌊", category: "hydration" },
  // ── Meal plans ──
  { type: "plan_first", name: "Plan Created", description: "Generated your first meal plan", xp: 30, emoji: "📋", category: "plans" },
  { type: "plan_5", name: "Five Plans", description: "Generated 5 meal plans", xp: 60, emoji: "📅", category: "plans" },
  { type: "plan_10", name: "Plan Veteran", description: "Generated 10 meal plans", xp: 100, emoji: "📆", category: "plans" },
  { type: "plan_25", name: "Master Planner", description: "Generated 25 meal plans", xp: 250, emoji: "🗓️", category: "plans" },
  { type: "swap_first", name: "First Swap", description: "Swapped a meal for the first time", xp: 10, emoji: "🔄", category: "plans" },
  { type: "swap_10", name: "Swap Artist", description: "Swapped 10 meals", xp: 40, emoji: "🔄", category: "plans" },
  { type: "swap_50", name: "Swap Master", description: "Swapped 50 meals", xp: 150, emoji: "🔄", category: "plans" },
  // ── Weight / Progress logs ──
  { type: "weight_first", name: "First Weigh-In", description: "Logged your first weight", xp: 10, emoji: "⚖️", category: "progress" },
  { type: "weight_7", name: "Weekly Check-In", description: "Logged weight 7 times", xp: 30, emoji: "⚖️", category: "progress" },
  { type: "weight_30", name: "Monthly Tracker", description: "Logged weight 30 times", xp: 100, emoji: "📉", category: "progress" },
  { type: "weight_100", name: "100 Weigh-Ins", description: "Logged weight 100 times", xp: 300, emoji: "📊", category: "progress" },
  // ── Onboarding / Setup ──
  { type: "onboarding_complete", name: "All Set Up", description: "Completed your profile setup", xp: 50, emoji: "✅", category: "setup" },
  { type: "profile_picture", name: "Looking Good", description: "Added a profile picture", xp: 15, emoji: "📸", category: "setup" },
  { type: "zip_set", name: "Local", description: "Set your location for grocery estimates", xp: 10, emoji: "📍", category: "setup" },
  // ── Barcode scanner ──
  { type: "barcode_first", name: "Scanner Activated", description: "Used the barcode scanner for the first time", xp: 20, emoji: "📱", category: "food" },
  { type: "barcode_10", name: "10 Scans", description: "Scanned 10 barcodes", xp: 50, emoji: "🔍", category: "food" },
  { type: "barcode_50", name: "Scan Machine", description: "Scanned 50 barcodes", xp: 150, emoji: "🔍", category: "food" },
  { type: "barcode_100", name: "Barcode Pro", description: "Scanned 100 barcodes", xp: 300, emoji: "🏅", category: "food" },
  // ── Grocery ──
  { type: "grocery_first", name: "First List", description: "Generated your first grocery list", xp: 20, emoji: "🛒", category: "grocery" },
  { type: "grocery_5", name: "Five Lists", description: "Generated 5 grocery lists", xp: 50, emoji: "🛒", category: "grocery" },
  { type: "grocery_25", name: "Grocery Regular", description: "Generated 25 grocery lists", xp: 150, emoji: "🛒", category: "grocery" },
  // ── Calorie goals ──
  { type: "calorie_goal_1", name: "On Target", description: "Hit your calorie goal for the first time", xp: 20, emoji: "🎯", category: "nutrition" },
  { type: "calorie_goal_7", name: "Calorie Week", description: "Hit calorie goal 7 days in a row", xp: 80, emoji: "🎯", category: "nutrition" },
  { type: "calorie_goal_30", name: "Calorie Month", description: "Hit calorie goal 30 days in a row", xp: 350, emoji: "🎯", category: "nutrition" },
  // ── Time of day habits ──
  { type: "breakfast_7", name: "Breakfast Habit", description: "Logged breakfast 7 days in a row", xp: 40, emoji: "🌅", category: "habits" },
  { type: "breakfast_30", name: "Breakfast Champion", description: "Logged breakfast 30 days in a row", xp: 150, emoji: "🥣", category: "habits" },
  { type: "dinner_7", name: "Dinner Tracker", description: "Logged dinner 7 days in a row", xp: 40, emoji: "🌆", category: "habits" },
  { type: "no_skip_week", name: "No Skips", description: "Logged all 3 meals for 7 days straight", xp: 100, emoji: "💯", category: "habits" },
  // ── Diet diversity ──
  { type: "diet_variety_5", name: "Mix It Up", description: "Logged 5 different meal categories", xp: 30, emoji: "🌈", category: "nutrition" },
  { type: "diet_variety_10", name: "Full Spectrum", description: "Logged 10 different meals", xp: 60, emoji: "🎨", category: "nutrition" },
  { type: "veg_week", name: "Veggie Week", description: "Logged a vegetable for 7 days in a row", xp: 50, emoji: "🥦", category: "nutrition" },
  // ── Calorie amounts ──
  { type: "under_1200", name: "Light Day", description: "Had a day under 1200 calories", xp: 15, emoji: "🍃", category: "nutrition" },
  { type: "over_3000", name: "Bulk Day", description: "Had a day over 3000 calories", xp: 15, emoji: "🏋️", category: "nutrition" },
  // ── Long-term consistency ──
  { type: "month_1_member", name: "One Month In", description: "Been tracking for 30 days", xp: 100, emoji: "📅", category: "milestones" },
  { type: "month_3_member", name: "Three Months Strong", description: "Been tracking for 90 days", xp: 300, emoji: "📅", category: "milestones" },
  { type: "month_6_member", name: "Half Year Tracker", description: "Been tracking for 180 days", xp: 700, emoji: "🏆", category: "milestones" },
  { type: "year_1_member", name: "One Year", description: "Been tracking for 365 days", xp: 2000, emoji: "🎂", category: "milestones" },
  // ── GLP-1 specific ──
  { type: "glp1_week", name: "GLP-1 Week", description: "Tracked consistently while on GLP-1 for 7 days", xp: 50, emoji: "💊", category: "health" },
  { type: "glp1_month", name: "GLP-1 Month", description: "Tracked consistently while on GLP-1 for 30 days", xp: 200, emoji: "💊", category: "health" },
  // ── Theme / Customization ──
  { type: "theme_changed", name: "Your Style", description: "Changed the app theme", xp: 10, emoji: "🎨", category: "setup" },
  // ── Specific achievements ──
  { type: "early_bird", name: "Early Bird", description: "Logged a meal before 8am", xp: 20, emoji: "🐦", category: "habits" },
  { type: "night_owl", name: "Night Owl", description: "Logged a meal after 10pm", xp: 20, emoji: "🦉", category: "habits" },
  { type: "weekend_warrior", name: "Weekend Warrior", description: "Logged on both Saturday and Sunday", xp: 25, emoji: "🗓️", category: "habits" },
  { type: "monday_starter", name: "Monday Starter", description: "Started a new plan on a Monday", xp: 15, emoji: "📆", category: "habits" },
  { type: "comeback_kid", name: "Comeback Kid", description: "Resumed logging after a 7+ day break", xp: 30, emoji: "🔙", category: "streak" },
  { type: "double_protein", name: "Double Protein Day", description: "Hit 2x your protein goal in a single day", xp: 30, emoji: "💪", category: "nutrition" },
  { type: "perfect_macros", name: "Perfect Macros", description: "Hit all three macro goals on the same day", xp: 75, emoji: "🎯", category: "nutrition" },
  { type: "clean_plate", name: "Clean Plate", description: "Logged every planned meal for a full day", xp: 50, emoji: "🍽️", category: "habits" },
  { type: "clean_plate_7", name: "Clean Plate Week", description: "Logged every planned meal for 7 days", xp: 200, emoji: "🍽️", category: "habits" },
  // ── Workout intensity ──
  { type: "first_legs", name: "Leg Day", description: "Logged a leg workout", xp: 20, emoji: "🦵", category: "workouts" },
  { type: "first_push", name: "Push Day", description: "Logged a push workout", xp: 20, emoji: "🏋️", category: "workouts" },
  { type: "first_pull", name: "Pull Day", description: "Logged a pull workout", xp: 20, emoji: "🏋️", category: "workouts" },
  { type: "full_body_week", name: "Full Body Week", description: "Logged 3+ workouts in a week", xp: 60, emoji: "💥", category: "workouts" },
  { type: "workout_streak_7", name: "7-Day Gym Streak", description: "Logged a workout every day for 7 days", xp: 150, emoji: "🔥", category: "workouts" },
  { type: "workout_streak_30", name: "30-Day Gym Streak", description: "Logged a workout every day for 30 days", xp: 500, emoji: "⚡", category: "workouts" },
  // ── Body composition ──
  { type: "lost_5lbs", name: "First 5 Pounds", description: "Lost 5 lbs from your starting weight", xp: 100, emoji: "📉", category: "progress" },
  { type: "lost_10lbs", name: "10 Down", description: "Lost 10 lbs from your starting weight", xp: 200, emoji: "📉", category: "progress" },
  { type: "lost_20lbs", name: "20 Down", description: "Lost 20 lbs from your starting weight", xp: 400, emoji: "📉", category: "progress" },
  { type: "lost_30lbs", name: "30 Down", description: "Lost 30 lbs from your starting weight", xp: 600, emoji: "📉", category: "progress" },
  { type: "lost_50lbs", name: "50 Down", description: "Lost 50 lbs from your starting weight", xp: 1000, emoji: "🏆", category: "progress" },
  { type: "gained_5lbs", name: "First 5 Pounds On", description: "Gained 5 lbs from your starting weight", xp: 100, emoji: "📈", category: "progress" },
  { type: "gained_10lbs", name: "10 Gained", description: "Gained 10 lbs from your starting weight", xp: 200, emoji: "📈", category: "progress" },
  // ── Community ──
  { type: "social_first_post", name: "First Post", description: "Shared your first achievement", xp: 20, emoji: "📣", category: "social" },
  // ── App usage ──
  { type: "settings_updated", name: "Dialed In", description: "Updated your profile settings", xp: 10, emoji: "⚙️", category: "setup" },
  { type: "daily_log_7am", name: "Morning Logger", description: "Logged before 9am for the first time", xp: 15, emoji: "☀️", category: "habits" },
  // ── Food variety ──
  { type: "logged_fish", name: "Fish Friday", description: "Logged a fish meal", xp: 15, emoji: "🐟", category: "food" },
  { type: "logged_chicken", name: "Chicken Every Day", description: "Logged chicken 5 days in a row", xp: 25, emoji: "🍗", category: "food" },
  { type: "logged_eggs", name: "Egg Lover", description: "Logged eggs 10 times", xp: 25, emoji: "🥚", category: "food" },
  { type: "logged_salad", name: "Salad Days", description: "Logged a salad 5 times", xp: 25, emoji: "🥗", category: "food" },
  { type: "logged_smoothie", name: "Smoothie Life", description: "Logged a smoothie 5 times", xp: 25, emoji: "🥤", category: "food" },
  { type: "logged_rice", name: "Rice Guy", description: "Logged a rice dish 10 times", xp: 20, emoji: "🍚", category: "food" },
  { type: "logged_oats", name: "Oat Fan", description: "Logged oats 7 times", xp: 20, emoji: "🌾", category: "food" },
  // ── Macro precision ──
  { type: "within_50_cals", name: "Precision Eater", description: "Finished a day within 50 calories of your target", xp: 30, emoji: "🎯", category: "nutrition" },
  { type: "within_100_cals_7days", name: "Precision Week", description: "Within 100 calories of target 7 days in a row", xp: 100, emoji: "🎯", category: "nutrition" },
  // ── Special / Milestone dates ──
  { type: "new_year_log", name: "New Year, New Me", description: "Logged on January 1st", xp: 50, emoji: "🎆", category: "special" },
  { type: "new_years_eve_log", name: "Year-End Strong", description: "Logged on December 31st", xp: 50, emoji: "🎉", category: "special" },
  { type: "birthday_log", name: "Birthday Tracker", description: "Logged on your birthday", xp: 75, emoji: "🎂", category: "special" },
  // ── Macro-specific extremes ──
  { type: "zero_carb_day", name: "Zero Carb Day", description: "Logged a day with under 10g of carbs", xp: 25, emoji: "🥩", category: "nutrition" },
  { type: "low_fat_day", name: "Low Fat Day", description: "Logged a day with under 20g of fat", xp: 25, emoji: "🌿", category: "nutrition" },
  { type: "high_fiber_day", name: "Fiber Rich", description: "Logged over 30g of fiber in a day", xp: 25, emoji: "🥦", category: "nutrition" },
  // ── Longevity milestones ──
  { type: "total_xp_25000", name: "25K XP Club", description: "Earned 25,000 total XP", xp: 0, emoji: "💠", category: "level" },
  { type: "total_xp_50000", name: "50K Elite", description: "Earned 50,000 total XP", xp: 0, emoji: "🔮", category: "level" },
  { type: "longest_streak_100", name: "100-Day Best", description: "Achieved a 100-day streak at any point", xp: 1000, emoji: "🌟", category: "streak" },
  { type: "longest_streak_365", name: "365-Day Best", description: "Achieved a 365-day streak at any point", xp: 5000, emoji: "🎖️", category: "streak" },
  // ── Macro monthly ──
  { type: "protein_month", name: "Protein Month", description: "Averaged over your protein target for a full month", xp: 300, emoji: "🥩", category: "nutrition" },
  // ── Account age ──
  { type: "week_1_member", name: "First Week Done", description: "Used Plate for 7 days", xp: 25, emoji: "🌱", category: "milestones" },
  // ── Onboarding steps ──
  { type: "first_plan_generated", name: "First Plan", description: "Generated your very first meal plan", xp: 30, emoji: "📋", category: "plans" },
  // ── Favorites ──
  { type: "favorites_set", name: "Personalized", description: "Set your favorite foods", xp: 15, emoji: "❤️", category: "setup" },
  // ── Profile completeness ──
  { type: "full_profile", name: "Complete Profile", description: "Filled out every section of your profile", xp: 50, emoji: "✅", category: "setup" },
  // ── Calorie deficit / surplus ──
  { type: "calorie_deficit_7", name: "Deficit Week", description: "Stayed in a calorie deficit for 7 days straight", xp: 80, emoji: "📉", category: "nutrition" },
  { type: "calorie_surplus_7", name: "Surplus Week", description: "Stayed in a calorie surplus for 7 days straight", xp: 80, emoji: "📈", category: "nutrition" },
  // ── Food log volume ──
  { type: "log_3_meals_day", name: "Three Meal Day", description: "Logged 3 meals in a single day", xp: 10, emoji: "🍽️", category: "habits" },
  { type: "log_4_meals_day", name: "Four Meal Day", description: "Logged 4 meals in a single day", xp: 15, emoji: "🍽️", category: "habits" },
  // ── Motivational ──
  { type: "back_to_back_plans", name: "Back to Back", description: "Generated plans two weeks in a row", xp: 40, emoji: "🔁", category: "plans" },
  { type: "never_skip_monday", name: "No Monday Excuses", description: "Logged every Monday for 4 weeks", xp: 60, emoji: "📆", category: "habits" },
  // ── Macro ratios ──
  { type: "balanced_day", name: "Balanced Day", description: "Hit within 10% of all three macro targets on the same day", xp: 50, emoji: "⚖️", category: "nutrition" },
  // ── Water amounts ──
  { type: "water_gallon", name: "Gallon Club", description: "Drank a gallon of water in a day (128oz / ~16 glasses)", xp: 40, emoji: "💧", category: "hydration" },
  // ── Personal bests ──
  { type: "new_longest_streak", name: "Personal Best Streak", description: "Beat your previous longest streak", xp: 50, emoji: "🏅", category: "streak" },
  // ── Community ──
  { type: "referred_friend", name: "Brought a Friend", description: "Referred someone to Plate", xp: 100, emoji: "👥", category: "social" },
  // ── Seasonal ──
  { type: "summer_shred", name: "Summer Shred", description: "Logged consistently through summer (Jun–Aug)", xp: 200, emoji: "☀️", category: "special" },
  { type: "winter_bulk", name: "Winter Bulk", description: "Logged consistently through winter (Dec–Feb)", xp: 200, emoji: "❄️", category: "special" },
  // ── Extra meal milestones ──
  { type: "meals_1500", name: "1500 Meals", description: "Logged 1500 meals", xp: 1500, emoji: "🍱", category: "meals" },
  { type: "meals_2000", name: "2000 Meals", description: "Logged 2000 meals", xp: 2000, emoji: "🏆", category: "meals" },
  // ── Protein per kg ──
  { type: "protein_2gkg", name: "2g per Kg", description: "Hit 2g of protein per kg bodyweight in a day", xp: 40, emoji: "🥩", category: "nutrition" },
  // ── Commitment ──
  { type: "no_cheat_30", name: "30 Clean Days", description: "Stayed within macros every day for 30 days", xp: 500, emoji: "🌟", category: "habits" },
  // ── App exploration ──
  { type: "explored_grocery", name: "Grocery Explorer", description: "Used the grocery list feature", xp: 10, emoji: "🛒", category: "setup" },
  { type: "explored_progress", name: "Progress Watcher", description: "Visited the progress page", xp: 10, emoji: "📊", category: "setup" },
  { type: "explored_why", name: "Why Guy", description: "Read your nutrition breakdown on the Why page", xp: 10, emoji: "🧬", category: "setup" },
  // ── Calorie targets ──
  { type: "hit_tdee", name: "TDEE Match", description: "Ate exactly at maintenance calories for a day", xp: 25, emoji: "⚖️", category: "nutrition" },
  // ── Weight trend ──
  { type: "3_week_downtrend", name: "3-Week Downtrend", description: "Lost weight 3 weeks in a row", xp: 150, emoji: "📉", category: "progress" },
  { type: "3_week_uptrend", name: "3-Week Uptrend", description: "Gained weight 3 weeks in a row", xp: 150, emoji: "📈", category: "progress" },
  // ── Night routine ──
  { type: "logged_before_bed", name: "Night Logger", description: "Logged all your meals before midnight", xp: 15, emoji: "🌙", category: "habits" },
  // ── Fast log ──
  { type: "log_under_2min", name: "Speed Logger", description: "Logged a meal in under 2 minutes", xp: 20, emoji: "⚡", category: "habits" },
  // ── Premium use ──
  { type: "customized_macros", name: "Custom Macros", description: "Updated your macro targets", xp: 15, emoji: "🔧", category: "setup" },
  { type: "used_barcode_and_manual", name: "Both Methods", description: "Used both the barcode scanner and manual logging", xp: 25, emoji: "🔀", category: "food" },
  // ── Milestone count padding to approach 300 ──
  { type: "meals_3000", name: "3000 Meals", description: "Logged 3000 meals — absolute legend", xp: 3000, emoji: "🏆", category: "meals" },
  { type: "streak_100", name: "100-Day Streak", description: "100 days without missing a log", xp: 1000, emoji: "💎", category: "streak" },
  { type: "streak_150", name: "150-Day Streak", description: "150 days without missing a log", xp: 1500, emoji: "💎", category: "streak" },
  { type: "streak_200", name: "200-Day Streak", description: "200 days without missing a log", xp: 2000, emoji: "💎", category: "streak" },
  { type: "streak_250", name: "250-Day Streak", description: "250 days without missing a log", xp: 2500, emoji: "💎", category: "streak" },
  { type: "streak_300", name: "300-Day Streak", description: "300 days without missing a log", xp: 3000, emoji: "💎", category: "streak" },
  { type: "workout_300", name: "300 Workouts", description: "Logged 300 workouts", xp: 1000, emoji: "⚡", category: "workouts" },
  { type: "workout_500", name: "500 Workouts", description: "Logged 500 workouts", xp: 2000, emoji: "🏆", category: "workouts" },
  { type: "weight_50", name: "50 Weigh-Ins", description: "Logged weight 50 times", xp: 200, emoji: "⚖️", category: "progress" },
  { type: "weight_200", name: "200 Weigh-Ins", description: "Logged weight 200 times", xp: 500, emoji: "📊", category: "progress" },
  { type: "protein_goal_60", name: "Protein 60 Days", description: "Hit protein goal 60 days in a row", xp: 750, emoji: "🥩", category: "nutrition" },
  { type: "protein_goal_90", name: "Protein 90 Days", description: "Hit protein goal 90 days in a row", xp: 1000, emoji: "🥩", category: "nutrition" },
  { type: "hydration_goal_14", name: "Hydration 14 Days", description: "Hit water goal 14 days in a row", xp: 100, emoji: "🌊", category: "hydration" },
  { type: "hydration_goal_60", name: "Hydration 60 Days", description: "Hit water goal 60 days in a row", xp: 400, emoji: "🌊", category: "hydration" },
  { type: "hydration_goal_90", name: "Hydration 90 Days", description: "Hit water goal 90 days in a row", xp: 600, emoji: "🌊", category: "hydration" },
  { type: "plan_50", name: "50 Plans", description: "Generated 50 meal plans", xp: 500, emoji: "📅", category: "plans" },
  { type: "plan_100", name: "100 Plans", description: "Generated 100 meal plans", xp: 1000, emoji: "🗓️", category: "plans" },
  { type: "swap_100", name: "100 Swaps", description: "Swapped 100 meals", xp: 300, emoji: "🔄", category: "plans" },
  { type: "grocery_50", name: "50 Grocery Lists", description: "Generated 50 grocery lists", xp: 300, emoji: "🛒", category: "grocery" },
  { type: "grocery_100", name: "100 Grocery Lists", description: "Generated 100 grocery lists", xp: 600, emoji: "🛒", category: "grocery" },
  { type: "level_150", name: "Level 150", description: "Reached level 150", xp: 3000, emoji: "👑", category: "level" },
  { type: "level_200", name: "Level 200", description: "Reached level 200", xp: 5000, emoji: "👑", category: "level" },
  { type: "xp_25000", name: "25K XP", description: "Earned 25,000 XP", xp: 0, emoji: "💠", category: "level" },
  { type: "xp_50000", name: "50K XP", description: "Earned 50,000 XP", xp: 0, emoji: "🔮", category: "level" },
  { type: "calorie_goal_14", name: "Calorie 14 Days", description: "Hit calorie goal 14 days in a row", xp: 150, emoji: "🎯", category: "nutrition" },
  { type: "calorie_goal_60", name: "Calorie 60 Days", description: "Hit calorie goal 60 days in a row", xp: 700, emoji: "🎯", category: "nutrition" },
  { type: "calorie_goal_90", name: "Calorie 90 Days", description: "Hit calorie goal 90 days in a row", xp: 1000, emoji: "🎯", category: "nutrition" },
  { type: "perfect_macros_7", name: "Perfect Macros Week", description: "Hit all three macro goals 7 days in a row", xp: 250, emoji: "🎯", category: "nutrition" },
  { type: "perfect_macros_30", name: "Perfect Month", description: "Hit all three macro goals 30 days in a row", xp: 1000, emoji: "🏆", category: "nutrition" },
  { type: "no_cheat_7", name: "7 Clean Days", description: "Stayed within macros every day for 7 days", xp: 100, emoji: "✨", category: "habits" },
  { type: "no_cheat_14", name: "14 Clean Days", description: "Stayed within macros every day for 14 days", xp: 200, emoji: "✨", category: "habits" },
  { type: "no_cheat_60", name: "60 Clean Days", description: "Stayed within macros every day for 60 days", xp: 800, emoji: "🌟", category: "habits" },
  { type: "no_cheat_90", name: "90 Clean Days", description: "Stayed within macros every day for 90 days", xp: 1500, emoji: "🌟", category: "habits" },
  { type: "protein_2gkg_7", name: "2g/kg Week", description: "Hit 2g protein per kg for 7 days in a row", xp: 100, emoji: "🥩", category: "nutrition" },
  { type: "protein_2gkg_30", name: "2g/kg Month", description: "Hit 2g protein per kg for 30 days in a row", xp: 400, emoji: "🥩", category: "nutrition" },
  { type: "water_gallon_7", name: "Gallon Week", description: "Drank a gallon of water 7 days in a row", xp: 100, emoji: "💧", category: "hydration" },
  { type: "water_gallon_30", name: "Gallon Month", description: "Drank a gallon of water 30 days in a row", xp: 400, emoji: "💧", category: "hydration" },
  { type: "clean_plate_14", name: "Clean Plate Fortnight", description: "Logged every planned meal for 14 days", xp: 350, emoji: "🍽️", category: "habits" },
  { type: "clean_plate_30", name: "Clean Plate Month", description: "Logged every planned meal for 30 days", xp: 700, emoji: "🍽️", category: "habits" },
  { type: "lost_1lb", name: "First Pound", description: "Lost 1 lb from starting weight", xp: 30, emoji: "📉", category: "progress" },
  { type: "lost_3lbs", name: "3 Pounds Down", description: "Lost 3 lbs from starting weight", xp: 60, emoji: "📉", category: "progress" },
  { type: "lost_40lbs", name: "40 Down", description: "Lost 40 lbs from starting weight", xp: 800, emoji: "📉", category: "progress" },
  { type: "lost_60lbs", name: "60 Down", description: "Lost 60 lbs from starting weight", xp: 1200, emoji: "🏆", category: "progress" },
  { type: "lost_75lbs", name: "75 Down", description: "Lost 75 lbs from starting weight", xp: 1500, emoji: "🏆", category: "progress" },
  { type: "lost_100lbs", name: "100 Down", description: "Lost 100 lbs from starting weight", xp: 3000, emoji: "🌟", category: "progress" },
  { type: "gained_3lbs", name: "3 Gained", description: "Gained 3 lbs from starting weight", xp: 60, emoji: "📈", category: "progress" },
  { type: "gained_20lbs", name: "20 Gained", description: "Gained 20 lbs from starting weight", xp: 400, emoji: "📈", category: "progress" },
  { type: "gained_30lbs", name: "30 Gained", description: "Gained 30 lbs from starting weight", xp: 600, emoji: "📈", category: "progress" },
  // ── Midnight streak challenge ──
  { type: "midnight_streak_3", name: "Midnight Run x3", description: "Logged 3 days in a row past midnight", xp: 30, emoji: "🌙", category: "habits" },
  // ── Macro absolute goals ──
  { type: "hit_200g_protein", name: "200g Protein", description: "Logged 200g or more of protein in a day", xp: 50, emoji: "🥩", category: "nutrition" },
  { type: "hit_300g_protein", name: "300g Protein", description: "Logged 300g or more of protein in a day", xp: 100, emoji: "🥩", category: "nutrition" },
  { type: "hit_400g_carbs", name: "400g Carb Day", description: "Logged 400g or more of carbs in a day", xp: 30, emoji: "🍚", category: "nutrition" },
  // ── Long workout streaks ──
  { type: "workout_streak_14", name: "14-Day Gym Streak", description: "Logged a workout every day for 14 days", xp: 300, emoji: "🔥", category: "workouts" },
  { type: "workout_streak_60", name: "60-Day Gym Streak", description: "Logged a workout every day for 60 days", xp: 1000, emoji: "⚡", category: "workouts" },
  // ── Super achievement — all 299 collected ──
  { type: "super_achiever", name: "The Plate Legend", description: "Unlocked every single achievement. You are the Plate legend.", xp: 10000, emoji: "🌈", category: "super" },
];

export const TOTAL_ACHIEVEMENT_COUNT = ACHIEVEMENT_DEFS.length;

export const checkAndAwardAchievements = mutation({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const stats = await ctx.db.query("userStats").withIndex("by_userId", (q) => q.eq("userId", userId)).unique();
    if (!stats) return [];

    const existing = await ctx.db.query("achievements").withIndex("by_userId", (q) => q.eq("userId", userId)).collect();
    const existingTypes = new Set(existing.map((a) => a.type));
    const newAchievements: Array<{ type: string; name: string; description: string; xp: number; emoji: string; category: string }> = [];

    // Stat-based checks (subset that can be checked from userStats)
    const statChecks: Array<{ type: string; check: () => boolean }> = [
      // Streaks
      { type: "streak_1", check: () => stats.currentStreak >= 1 },
      { type: "streak_3", check: () => stats.currentStreak >= 3 },
      { type: "streak_7", check: () => stats.currentStreak >= 7 },
      { type: "streak_14", check: () => stats.currentStreak >= 14 },
      { type: "streak_21", check: () => stats.currentStreak >= 21 },
      { type: "streak_30", check: () => stats.currentStreak >= 30 },
      { type: "streak_45", check: () => stats.currentStreak >= 45 },
      { type: "streak_60", check: () => stats.currentStreak >= 60 },
      { type: "streak_90", check: () => stats.currentStreak >= 90 },
      { type: "streak_100", check: () => stats.currentStreak >= 100 },
      { type: "streak_150", check: () => stats.currentStreak >= 150 },
      { type: "streak_180", check: () => stats.currentStreak >= 180 },
      { type: "streak_200", check: () => stats.currentStreak >= 200 },
      { type: "streak_250", check: () => stats.currentStreak >= 250 },
      { type: "streak_300", check: () => stats.currentStreak >= 300 },
      { type: "streak_365", check: () => stats.currentStreak >= 365 },
      { type: "longest_streak_100", check: () => stats.longestStreak >= 100 },
      { type: "longest_streak_365", check: () => stats.longestStreak >= 365 },
      { type: "new_longest_streak", check: () => stats.currentStreak > 0 && stats.currentStreak >= stats.longestStreak && stats.currentStreak > 1 },
      // Meals
      { type: "meals_1", check: () => stats.totalMealsLogged >= 1 },
      { type: "meals_5", check: () => stats.totalMealsLogged >= 5 },
      { type: "meals_10", check: () => stats.totalMealsLogged >= 10 },
      { type: "meals_25", check: () => stats.totalMealsLogged >= 25 },
      { type: "meals_50", check: () => stats.totalMealsLogged >= 50 },
      { type: "meals_100", check: () => stats.totalMealsLogged >= 100 },
      { type: "meals_200", check: () => stats.totalMealsLogged >= 200 },
      { type: "meals_365", check: () => stats.totalMealsLogged >= 365 },
      { type: "meals_500", check: () => stats.totalMealsLogged >= 500 },
      { type: "meals_750", check: () => stats.totalMealsLogged >= 750 },
      { type: "meals_1000", check: () => stats.totalMealsLogged >= 1000 },
      { type: "meals_1500", check: () => stats.totalMealsLogged >= 1500 },
      { type: "meals_2000", check: () => stats.totalMealsLogged >= 2000 },
      { type: "meals_3000", check: () => stats.totalMealsLogged >= 3000 },
      // Workouts
      { type: "workout_1", check: () => stats.totalWorkoutsLogged >= 1 },
      { type: "workout_5", check: () => stats.totalWorkoutsLogged >= 5 },
      { type: "workout_10", check: () => stats.totalWorkoutsLogged >= 10 },
      { type: "workout_25", check: () => stats.totalWorkoutsLogged >= 25 },
      { type: "workout_50", check: () => stats.totalWorkoutsLogged >= 50 },
      { type: "workout_100", check: () => stats.totalWorkoutsLogged >= 100 },
      { type: "workout_200", check: () => stats.totalWorkoutsLogged >= 200 },
      { type: "workout_300", check: () => stats.totalWorkoutsLogged >= 300 },
      { type: "workout_365", check: () => stats.totalWorkoutsLogged >= 365 },
      { type: "workout_500", check: () => stats.totalWorkoutsLogged >= 500 },
      // Levels
      { type: "level_2", check: () => stats.level >= 2 },
      { type: "level_3", check: () => stats.level >= 3 },
      { type: "level_5", check: () => stats.level >= 5 },
      { type: "level_10", check: () => stats.level >= 10 },
      { type: "level_20", check: () => stats.level >= 20 },
      { type: "level_30", check: () => stats.level >= 30 },
      { type: "level_50", check: () => stats.level >= 50 },
      { type: "level_75", check: () => stats.level >= 75 },
      { type: "level_100", check: () => stats.level >= 100 },
      { type: "level_150", check: () => stats.level >= 150 },
      { type: "level_200", check: () => stats.level >= 200 },
      // XP
      { type: "xp_100", check: () => stats.xp >= 100 },
      { type: "xp_500", check: () => stats.xp >= 500 },
      { type: "xp_1000", check: () => stats.xp >= 1000 },
      { type: "xp_5000", check: () => stats.xp >= 5000 },
      { type: "xp_10000", check: () => stats.xp >= 10000 },
      { type: "total_xp_25000", check: () => stats.xp >= 25000 },
      { type: "xp_25000", check: () => stats.xp >= 25000 },
      { type: "total_xp_50000", check: () => stats.xp >= 50000 },
      { type: "xp_50000", check: () => stats.xp >= 50000 },
      // Protein streak
      { type: "protein_goal_1", check: () => stats.proteinGoalStreak >= 1 },
      { type: "protein_goal_3", check: () => stats.proteinGoalStreak >= 3 },
      { type: "protein_goal_7", check: () => stats.proteinGoalStreak >= 7 },
      { type: "protein_goal_14", check: () => stats.proteinGoalStreak >= 14 },
      { type: "protein_goal_30", check: () => stats.proteinGoalStreak >= 30 },
      { type: "protein_goal_60", check: () => stats.proteinGoalStreak >= 60 },
      { type: "protein_goal_90", check: () => stats.proteinGoalStreak >= 90 },
    ];

    const today = new Date().toISOString().split("T")[0];
    let xpAdded = 0;

    // Process stat-based checks
    for (const check of statChecks) {
      if (!existingTypes.has(check.type) && check.check()) {
        const def = ACHIEVEMENT_DEFS.find((d) => d.type === check.type);
        if (!def) continue;
        await ctx.db.insert("achievements", {
          userId,
          type: def.type,
          name: def.name,
          description: def.description,
          earnedAt: today,
          xpAwarded: def.xp,
        });
        existingTypes.add(def.type);
        newAchievements.push(def);
        xpAdded += def.xp;
      }
    }

    // Check for super achiever — all non-super achievements unlocked
    const nonSuperDefs = ACHIEVEMENT_DEFS.filter((d) => d.type !== "super_achiever");
    const nonSuperTypes = new Set(nonSuperDefs.map((d) => d.type));
    const hasAll = [...nonSuperTypes].every((t) => existingTypes.has(t));
    if (hasAll && !existingTypes.has("super_achiever")) {
      const superDef = ACHIEVEMENT_DEFS.find((d) => d.type === "super_achiever")!;
      await ctx.db.insert("achievements", {
        userId,
        type: superDef.type,
        name: superDef.name,
        description: superDef.description,
        earnedAt: today,
        xpAwarded: superDef.xp,
      });
      newAchievements.push(superDef);
      xpAdded += superDef.xp;
    }

    if (xpAdded > 0 && stats) {
      await ctx.db.patch(stats._id, { xp: stats.xp + xpAdded });
    }

    return newAchievements;
  },
});

export const getTotalAchievementCount = query({
  args: {},
  returns: v.number(),
  handler: async () => TOTAL_ACHIEVEMENT_COUNT,
});

export const logHydration = mutation({
  args: { glasses: v.number(), localDate: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    // Use client-provided local date when available to avoid UTC/timezone mismatch
    const today = args.localDate || new Date().toISOString().split("T")[0];

    const existing = await ctx.db.query("hydrationLogs")
      .withIndex("by_userId_date", (q) => q.eq("userId", userId).eq("date", today))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { glasses: args.glasses });
    } else {
      await ctx.db.insert("hydrationLogs", {
        userId,
        date: today,
        glasses: args.glasses,
        target: 8,
      });
    }
    return null;
  },
});

export const getTodaysHydration = query({
  args: { localDate: v.optional(v.string()) },
  returns: v.any(),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const today = args.localDate || new Date().toISOString().split("T")[0];
    return await ctx.db.query("hydrationLogs")
      .withIndex("by_userId_date", (q) => q.eq("userId", userId).eq("date", today))
      .unique();
  },
});

/* ── Leaderboard ── */
export const getLeaderboard = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const allStats = await ctx.db.query("userStats").collect();
    const results = await Promise.all(
      allStats.map(async (s) => {
        const profile = await ctx.db.query("profiles")
          .withIndex("by_userId", (q) => q.eq("userId", s.userId))
          .unique();
        const achievements = await ctx.db.query("achievements")
          .withIndex("by_userId", (q) => q.eq("userId", s.userId))
          .collect();
        return {
          userId: s.userId,
          name: profile?.name || "Anonymous",
          xp: s.xp,
          level: s.level,
          currentStreak: s.currentStreak,
          longestStreak: s.longestStreak,
          totalMealsLogged: s.totalMealsLogged,
          totalWorkoutsLogged: s.totalWorkoutsLogged,
          achievementCount: achievements.length,
        };
      })
    );
    return results;
  },
});
