import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const schema = defineSchema({
  ...authTables,

  // User profile with fitness data
  profiles: defineTable({
    userId: v.id("users"),
    name: v.string(),
    height: v.number(), // inches
    weight: v.number(), // lbs
    age: v.number(),
    gender: v.string(),
    activityLevel: v.string(), // sedentary, light, moderate, active, very_active
    goal: v.string(), // aggressive_cut, moderate_cut, light_cut, maintenance, light_bulk, moderate_bulk, aggressive_bulk
    mealStructure: v.string(), // repetitive, semi_varied, full_variety, ultra_variety
    varietyDepth: v.string(), // low, medium, high, ultra
    cookingPreference: v.string(), // none, minimal, moderate, advanced
    budgetLevel: v.string(), // low, medium, high
    zipCode: v.string(),
    // Workout preferences
    goesToGym: v.optional(v.string()), // yes, no, both
    workoutGoal: v.optional(v.string()), // fat_loss, muscle_gain, recomp, strength, endurance
    experienceLevel: v.optional(v.string()), // beginner, intermediate, advanced
    workoutFrequency: v.optional(v.string()), // 2-3, 4-5, 6+
    workoutSplit: v.optional(v.string()), // full_body, upper_lower, ppl, bro_split, athletic
    gymType: v.optional(v.string()), // planet_fitness, la_fitness, anytime, golds, home, custom
    equipment: v.optional(v.array(v.string())),
    // GLP-1
    usesGlp1: v.optional(v.boolean()),
    glp1Medication: v.optional(v.string()),
    glp1Dosage: v.optional(v.string()),
    // Calculated
    bmr: v.optional(v.number()),
    tdee: v.optional(v.number()),
    targetCalories: v.optional(v.number()),
    targetProtein: v.optional(v.number()),
    targetCarbs: v.optional(v.number()),
    targetFat: v.optional(v.number()),
    onboardingComplete: v.boolean(),
    // Diet preference
    dietPreference: v.optional(v.string()), // primary diet (drives macros) — kept for backwards compat
    dietPreferences: v.optional(v.array(v.string())), // multi-select: all chosen diets
    // Protein g/kg used in calculation (for Why tab display)
    proteinGkg: v.optional(v.number()),
    calorieFloorActivated: v.optional(v.boolean()),
    // Exercise calorie tracking preference
    // "add_to_goal" = calories burned add back to daily budget; "info_only" = show but don't affect goal
    exerciseCalorieMode: v.optional(v.string()),
    // Hydration
    hydrationTarget: v.optional(v.number()), // personalized glasses target
    hydrationMl: v.optional(v.number()), // personalized mL target
    // Allergens selected during onboarding
    allergens: v.optional(v.array(v.string())),
    // Cooking time preference (in minutes): 15, 30, 45, 60, 0 = unlimited
    maxCookTime: v.optional(v.number()),
    // Meals per day: "3", "3+1", "3+2", "4", "5-6"
    mealsPerDay: v.optional(v.string()),
    // Profile extras
    lastName: v.optional(v.string()),
    phone: v.optional(v.string()),
    units: v.optional(v.string()), // "imperial" | "metric"
    // Admin — legacy field kept for backward compat
    isAdmin: v.optional(v.boolean()),
    // Admin levels: "owner" | "admin" | "moderator" | "friends_family" | undefined (regular user)
    adminLevel: v.optional(v.string()),
    // Role for comp access: "user" | "family" | "friends" | "admin"
    role: v.optional(v.string()),
    // Stripe subscription
    isPremium: v.optional(v.boolean()),
    stripeCustomerId: v.optional(v.string()),
    stripeSubscriptionId: v.optional(v.string()),
    subscriptionStatus: v.optional(v.string()), // "trialing" | "active" | "canceled" | "past_due" | "unpaid"
    trialEnd: v.optional(v.number()), // timestamp
    // User timezone for daily resets
    timezone: v.optional(v.string()),
    // Theme preference: "dark" | "cream" | "system"
    themePreference: v.optional(v.string()),
    // Favorite foods — scoring boost in meal generation
    favoriteFoods: v.optional(v.array(v.string())),
    // Disliked foods — hard exclusion from meal generation
    dislikedFoods: v.optional(v.array(v.string())),
    profilePictureId: v.optional(v.id("_storage")),
    avatarChoice: v.optional(v.string()), // DiceBear avatar URL chosen by user
    // App notification preferences
    toastNotifications: v.optional(v.boolean()), // true = show toasts (default), false = hidden

    // ── New Onboarding v2 fields ──────────────────────────────────────────────
    firstName: v.optional(v.string()),
    username: v.optional(v.string()),
    // Goals multi-select: "lose_weight" | "build_muscle" | "eat_healthier" | "manage_stress" | "boost_energy" | "better_sleep" | "improve_performance"
    goals: v.optional(v.array(v.string())),
    // GLP-1: "yes_current" | "yes_past" | "no" | "prefer_not_say"
    glp1Status: v.optional(v.string()),
    // Past barriers multi-select
    pastBarriers: v.optional(v.array(v.string())),
    // Healthy habits priority
    habits: v.optional(v.array(v.string())),
    // Meal plan opt-in
    mealPlanOptIn: v.optional(v.boolean()),
    // Planning frequency: "daily" | "weekly" | "bi_weekly" | "monthly"
    planningFrequency: v.optional(v.string()),
    // Sex: "male" | "female" | "other" | "prefer_not_say"
    sex: v.optional(v.string()),
    // country/zip
    country: v.optional(v.string()),
    // Weight/goal with new naming (kg-based too)
    currentWeightLb: v.optional(v.number()),
    goalWeightLb: v.optional(v.number()),
    // Notifications & consent
    reminderOptIn: v.optional(v.boolean()),
    stepTrackingOptIn: v.optional(v.boolean()),
    emailOptIn: v.optional(v.boolean()),
    personalizationConsent: v.optional(v.boolean()),
    // Timestamp of when onboarding v2 was completed
    onboardingCompletedAt: v.optional(v.number()),
    // Onboarding step tracking (route slug)
    onboardingStep: v.optional(v.string()),
    // Workout add-on: "not_offered" | "declined" | "active"
    workoutAddOnStatus: v.optional(v.string()),
    workoutAddOnStripeSubscriptionId: v.optional(v.string()),
    // Whether workout upsell has been shown
    workoutUpsellShown: v.optional(v.boolean()),
    // ToS accepted
    tosAccepted: v.optional(v.boolean()),
    tosAcceptedAt: v.optional(v.number()),
  })
    .index("by_userId", ["userId"]),

  // Meal database
  meals: defineTable({
    name: v.string(),
    category: v.string(), // breakfast, lunch, dinner, snack
    calories: v.number(),
    protein: v.number(),
    carbs: v.number(),
    fat: v.number(),
    fiber: v.optional(v.number()),
    ingredients: v.array(v.object({
      name: v.string(),
      amount: v.string(),
      unit: v.string(),
      calories: v.optional(v.number()),
      estimatedPrice: v.optional(v.number()),
    })),
    instructions: v.optional(v.array(v.string())),
    prepTime: v.optional(v.number()), // minutes
    cookTime: v.optional(v.number()), // minutes — actual cooking time
    cookTemp: v.optional(v.number()), // °F — oven/grill temp (null if stovetop/no-cook)
    cookSetting: v.optional(v.string()), // e.g. "stovetop medium heat", "bake", "air fry 400°F"
    difficulty: v.optional(v.string()), // easy, medium, hard
    cookingLevel: v.string(), // none, minimal, moderate, advanced
    tags: v.array(v.string()),
    compatibleDiets: v.optional(v.array(v.string())), // ["vegan","keto","paleo",…]
    forbiddenFor: v.optional(v.array(v.string())), // diets this meal CANNOT be served to
    allergensPresent: v.optional(v.array(v.string())), // ["dairy","gluten","nuts",…]
    imageEmoji: v.optional(v.string()),
    imageUrl: v.optional(v.string()), // AI-generated or sourced photo URL
    mealPrepTips: v.optional(v.array(v.string())),
    // Budget tier: "low" (basic staples), "moderate" (standard), "premium" (specialty)
    budgetTier: v.optional(v.string()),
  })
    .index("by_category", ["category"])
    .index("by_cookingLevel", ["cookingLevel"]),

  // Weekly meal plans
  mealPlans: defineTable({
    userId: v.id("users"),
    weekStart: v.string(), // ISO date
    days: v.array(v.object({
      date: v.string(),
      dayName: v.string(),
      meals: v.array(v.object({
        slot: v.string(), // breakfast, lunch, dinner, snack
        mealId: v.optional(v.id("meals")),
        customMeal: v.optional(v.object({
          name: v.string(),
          calories: v.number(),
          protein: v.number(),
          carbs: v.number(),
          fat: v.number(),
        })),
        completed: v.boolean(),
        skipped: v.optional(v.boolean()),
      })),
    })),
    totalCalories: v.number(),
    totalProtein: v.number(),
    swapHistory: v.array(v.string()), // meal IDs that have been swapped out
    version: v.optional(v.number()), // increments on every change for grocery sync
    // Per-category history to avoid repeating meals across regenerations
    seenBreakfastIds: v.optional(v.array(v.string())),
    seenLunchIds: v.optional(v.array(v.string())),
    seenDinnerIds: v.optional(v.array(v.string())),
    seenSnackIds: v.optional(v.array(v.string())),
    // Free-user weekly regen limit (2 per week — any combo of plan regen or meal swap)
    weeklyRegenCount: v.optional(v.number()),
    weeklyRegenResetAt: v.optional(v.string()), // ISO date of Monday this week started
  })
    .index("by_userId", ["userId"])
    .index("by_userId_weekStart", ["userId", "weekStart"]),

  // Food log entries
  foodLogs: defineTable({
    userId: v.id("users"),
    date: v.string(), // ISO date
    slot: v.string(), // breakfast, lunch, dinner, snack
    name: v.string(),
    calories: v.number(),
    protein: v.number(),
    carbs: v.number(),
    fat: v.number(),
    servingSize: v.optional(v.string()),
    mealId: v.optional(v.id("meals")),
    source: v.string(), // manual, barcode, quick_add, meal_plan
  })
    .index("by_userId_date", ["userId", "date"])
    .index("by_userId", ["userId"]),

  // Grocery lists
  groceryLists: defineTable({
    userId: v.id("users"),
    weekStart: v.string(),
    mealPlanId: v.id("mealPlans"),
    zipCode: v.string(),
    store: v.string(),
    items: v.array(v.object({
      name: v.string(),
      amount: v.optional(v.string()),
      category: v.string(), // protein, carbs, produce, fats, pantry
      estimatedPrice: v.optional(v.number()), // deprecated, kept for compat
      checked: v.boolean(),
    })),
    totalCost: v.optional(v.number()),   // deprecated
    costPerMeal: v.optional(v.number()), // deprecated
    syncedPlanVersion: v.optional(v.number()), // tracks which plan version this list matches
    lastSyncAdded: v.optional(v.array(v.string())),   // items added in last sync
    lastSyncRemoved: v.optional(v.array(v.string())), // items removed in last sync
  })
    .index("by_userId", ["userId"])
    .index("by_userId_weekStart", ["userId", "weekStart"]),

  // Workout plans
  workoutPlans: defineTable({
    userId: v.id("users"),
    weekStart: v.string(),
    split: v.string(),
    days: v.array(v.object({
      dayName: v.string(),
      focus: v.string(), // e.g. "Push", "Pull", "Legs", "Rest"
      estimatedDurationMinutes: v.optional(v.number()),
      exercises: v.optional(v.array(v.object({
        exerciseId: v.string(),
        name: v.string(),
        sets: v.number(),
        repRange: v.array(v.number()), // [min, max]
        restSeconds: v.number(),
        rirTarget: v.number(),
        notes: v.optional(v.string()),
      }))),
    })),
    weekNumber: v.optional(v.number()),
    isDeload: v.optional(v.boolean()),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_weekStart", ["userId", "weekStart"]),

  // Workout logs — supports RIR tracking
  workoutLogs: defineTable({
    userId: v.id("users"),
    date: v.string(),
    dayFocus: v.string(),
    exercises: v.array(v.object({
      name: v.string(),
      sets: v.array(v.object({
        reps: v.number(),
        weight: v.optional(v.number()),
        rir: v.optional(v.number()), // reps in reserve
        completed: v.optional(v.boolean()),
      })),
    })),
    duration: v.optional(v.number()), // minutes
    fatigue: v.optional(v.number()), // 1-10
    energy: v.optional(v.number()), // 1-10
  })
    .index("by_userId", ["userId"])
    .index("by_userId_date", ["userId", "date"]),

  // Weight/progress logs
  progressLogs: defineTable({
    userId: v.id("users"),
    date: v.string(),
    weight: v.optional(v.number()),
    bodyFat: v.optional(v.number()),
    notes: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_date", ["userId", "date"]),

  // GLP-1 medication logs
  medicationLogs: defineTable({
    userId: v.id("users"),
    date: v.string(),
    medication: v.string(),
    dosage: v.string(),
    appetiteLevel: v.optional(v.number()), // 1-10
    sideEffects: v.optional(v.array(v.string())),
    notes: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_date", ["userId", "date"]),

  // Achievements
  achievements: defineTable({
    userId: v.id("users"),
    type: v.string(), // streak_7, streak_30, protein_5day, first_plan, etc.
    name: v.string(),
    description: v.string(),
    earnedAt: v.string(),
    xpAwarded: v.number(),
  })
    .index("by_userId", ["userId"]),

  // User stats (XP, streaks, etc.)
  userStats: defineTable({
    userId: v.id("users"),
    xp: v.number(),
    level: v.number(),
    currentStreak: v.number(),
    longestStreak: v.number(),
    lastLogDate: v.optional(v.string()),
    totalMealsLogged: v.number(),
    totalWorkoutsLogged: v.number(),
    proteinGoalStreak: v.number(),
    proteinGoalLastDate: v.optional(v.string()),
    reEngagementSentAt: v.optional(v.number()), // timestamp of last re-engagement email sent
    reEngagementCount: v.optional(v.number()),   // how many re-engagement emails sent (used to rotate features)
    upsellSentAt: v.optional(v.number()),        // timestamp of last premium upsell email sent
    upsellCount: v.optional(v.number()),          // how many upsell emails sent (used to rotate pitches)
    onboardingReminderSentAt: v.optional(v.number()), // timestamp of last onboarding nudge sent
    onboardingReminderCount: v.optional(v.number()),  // how many onboarding reminders sent (max 4, then stops)
    // Win-back — targets churned/cancelled users, fires 30 days after cancellation
    winBackSentAt: v.optional(v.number()),    // timestamp of last win-back email sent
    winBackCount: v.optional(v.number()),     // how many win-back emails sent (3 max, then stops)
    // Split test variant: "A" | "B" | "C" — assigned once per user, never changes
    // A = Dark Classic, B = Deep Forest, C = Cream Light
    emailVariant: v.optional(v.string()),
  })
    .index("by_userId", ["userId"]),

  // Social posts
  socialPosts: defineTable({
    userId: v.id("users"),
    userName: v.string(),
    type: v.string(), // meal_share, achievement, progress, milestone
    content: v.string(),
    data: v.optional(v.any()),
    likes: v.number(),
    likedBy: v.array(v.id("users")),
  })
    .index("by_userId", ["userId"]),

  // Hydration logs
  hydrationLogs: defineTable({
    userId: v.id("users"),
    date: v.string(),
    glasses: v.number(), // 8oz glasses
    target: v.number(),
  })
    .index("by_userId_date", ["userId", "date"]),

  // Saved/favorite meals
  savedMeals: defineTable({
    userId: v.id("users"),
    mealId: v.id("meals"),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_mealId", ["userId", "mealId"]),

  // Email log — tracks every email sent by the system
  emailLogs: defineTable({
    recipientUserId: v.optional(v.id("users")),
    recipientEmail: v.string(),
    recipientName: v.string(),
    subject: v.string(),
    emailType: v.string(), // welcome, admin_upgrade, custom
    sentAt: v.number(), // timestamp
    sentByUserId: v.optional(v.id("users")), // null = system, set = admin who sent it
    previewHtml: v.optional(v.string()), // short snippet for list display
  })
    .index("by_sentAt", ["sentAt"])
    .index("by_recipientUserId", ["recipientUserId"])
    .index("by_emailType", ["emailType"]),

  // Admin audit log — every role/permission change
  auditLogs: defineTable({
    adminUserId: v.id("users"),
    targetUserId: v.id("users"),
    action: v.string(), // "role_changed", "premium_granted", "premium_revoked"
    fromValue: v.optional(v.string()),
    toValue: v.optional(v.string()),
    timestamp: v.number(),
    note: v.optional(v.string()),
  })
    .index("by_timestamp", ["timestamp"])
    .index("by_targetUserId", ["targetUserId"]),

  // Weight tracking logs for body weight charting
  weightLogs: defineTable({
    userId: v.id("users"),
    date: v.string(), // ISO date
    weightLbs: v.number(),
    note: v.optional(v.string()),
  })
    .index("by_userId_date", ["userId", "date"]),

  // Progress photos
  progressPhotos: defineTable({
    userId: v.id("users"),
    date: v.string(), // ISO date
    storageId: v.id("_storage"),
    angle: v.string(), // "front" | "side" | "back"
    note: v.optional(v.string()),
  })
    .index("by_userId_date", ["userId", "date"]),

  // User feedback / feature ideas
  feedback: defineTable({
    userId: v.id("users"),
    text: v.string(),
    category: v.optional(v.string()), // "feature" | "bug" | "general"
    upvotes: v.optional(v.number()),
    status: v.optional(v.string()), // "new" | "planned" | "in_progress" | "done"
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_createdAt", ["createdAt"]),

  // Feedback upvotes — track who upvoted what
  feedbackUpvotes: defineTable({
    feedbackId: v.id("feedback"),
    userId: v.id("users"),
  })
    .index("by_feedbackId", ["feedbackId"])
    .index("by_feedbackId_userId", ["feedbackId", "userId"]),

  // System config (singleton) — used to store Stripe keys in DB as fallback
  systemConfig: defineTable({
    key: v.string(),
    value: v.string(),
  }).index("by_key", ["key"]),

  // Reserved usernames — ensures uniqueness across the platform
  usernames: defineTable({
    username: v.string(), // lowercase
    userId: v.id("users"),
  }).index("by_username", ["username"])
    .index("by_userId", ["userId"]),

  // Subscriptions — one per (userId, productType) for premium and workout add-on
  subscriptions: defineTable({
    userId: v.id("users"),
    productType: v.string(), // "premium" | "workout"
    stripeSubscriptionId: v.string(),
    stripePriceId: v.optional(v.string()),
    status: v.string(), // "trialing" | "active" | "canceled" | "past_due"
    trialEnd: v.optional(v.number()),
    currentPeriodEnd: v.optional(v.number()),
    cancelAtPeriodEnd: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_userId", ["userId"])
    .index("by_userId_productType", ["userId", "productType"])
    .index("by_stripeSubscriptionId", ["stripeSubscriptionId"]),

  // Step count logs — daily step tracking
  stepLogs: defineTable({
    userId: v.id("users"),
    date: v.string(), // ISO date YYYY-MM-DD
    steps: v.number(),
    source: v.optional(v.string()), // "manual" | "healthkit"
  })
    .index("by_userId_date", ["userId", "date"])
    .index("by_userId", ["userId"]),

  // Page view tracking — lightweight anonymous page visit counter
  pageViews: defineTable({
    path: v.string(),          // e.g. "/dashboard", "/plan", "/"
    userId: v.optional(v.id("users")), // null = anonymous
    sessionId: v.optional(v.string()), // anonymous session ID
    ts: v.number(),            // timestamp
  })
    .index("by_path", ["path"])
    .index("by_ts", ["ts"]),

  // In-progress workout set drafts — persisted across sessions until cleared
  workoutDrafts: defineTable({
    userId: v.id("users"),
    date: v.string(),             // YYYY-MM-DD
    exerciseName: v.string(),
    setNumber: v.number(),        // 1-based
    weight: v.optional(v.number()),
    reps: v.optional(v.number()),
    rir: v.optional(v.number()),
    completed: v.boolean(),
  })
    .index("by_userId_date", ["userId", "date"])
    .index("by_userId_date_exercise", ["userId", "date", "exerciseName"]),

  // Cardio exercise logs — minutes + calories logged manually
  cardioLogs: defineTable({
    userId: v.id("users"),
    date: v.string(),             // YYYY-MM-DD
    exerciseName: v.string(),
    minutes: v.number(),
    caloriesBurned: v.number(),
    startTime: v.optional(v.string()), // HH:MM 24h
    createdAt: v.number(),
  })
    .index("by_userId_date", ["userId", "date"])
    .index("by_userId", ["userId"]),

  // Strength exercise logs — manual exercise tracking (separate from AI workout plan)
  exerciseLogs: defineTable({
    userId: v.id("users"),
    date: v.string(),             // YYYY-MM-DD
    exerciseName: v.string(),
    exerciseType: v.optional(v.string()), // "strength" | "cardio"
    sets: v.array(v.object({
      setNumber: v.number(),
      reps: v.optional(v.number()),
      weight: v.optional(v.number()),  // lbs
      completed: v.optional(v.boolean()),
    })),
    caloriesBurned: v.optional(v.number()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_userId_date", ["userId", "date"])
    .index("by_userId", ["userId"]),

  // Custom exercises created by user
  customExercises: defineTable({
    userId: v.id("users"),
    name: v.string(),
    muscleGroups: v.optional(v.array(v.string())),
    equipment: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"]),

  // User-built workout routines
  workoutRoutines: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    exercises: v.array(v.object({
      exerciseId: v.optional(v.string()),
      name: v.string(),
      sets: v.number(),
      reps: v.optional(v.string()),   // "8-12", "15", etc.
      weightLbs: v.optional(v.number()),
      restSeconds: v.optional(v.number()),
      notes: v.optional(v.string()),
    })),
    estimatedDurationMinutes: v.optional(v.number()),
    estimatedCalories: v.optional(v.number()),
    isPublic: v.optional(v.boolean()),  // for Explore tab
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_isPublic", ["isPublic"]),
});

export default schema;
