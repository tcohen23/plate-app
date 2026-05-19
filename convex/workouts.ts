import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getLevelFromXp } from "./levelUtils";

const EXERCISE_DB: Record<string, Array<{ name: string; targetMuscles: string[]; sets: number; reps: string; restSeconds: number; notes?: string }>> = {
  push: [
    { name: "Barbell Bench Press", targetMuscles: ["Chest", "Triceps", "Front Delts"], sets: 4, reps: "6-8", restSeconds: 120, notes: "Control the descent, drive through chest" },
    { name: "Incline Dumbbell Press", targetMuscles: ["Upper Chest", "Triceps"], sets: 3, reps: "8-10", restSeconds: 90, notes: "30° incline, squeeze at top" },
    { name: "Overhead Press", targetMuscles: ["Shoulders", "Triceps"], sets: 3, reps: "8-10", restSeconds: 90, notes: "Brace core, press overhead" },
    { name: "Cable Flyes", targetMuscles: ["Chest"], sets: 3, reps: "12-15", restSeconds: 60, notes: "Focus on squeeze" },
    { name: "Lateral Raises", targetMuscles: ["Side Delts"], sets: 3, reps: "12-15", restSeconds: 60, notes: "Slight bend in elbows, controlled" },
    { name: "Tricep Pushdowns", targetMuscles: ["Triceps"], sets: 3, reps: "10-12", restSeconds: 60, notes: "Keep elbows pinned" },
    { name: "Overhead Tricep Extension", targetMuscles: ["Triceps"], sets: 3, reps: "10-12", restSeconds: 60 },
  ],
  pull: [
    { name: "Barbell Rows", targetMuscles: ["Back", "Biceps"], sets: 4, reps: "6-8", restSeconds: 120, notes: "Hinge at hips, pull to lower chest" },
    { name: "Lat Pulldowns", targetMuscles: ["Lats", "Biceps"], sets: 3, reps: "8-10", restSeconds: 90, notes: "Wide grip, pull to upper chest" },
    { name: "Seated Cable Rows", targetMuscles: ["Mid Back", "Biceps"], sets: 3, reps: "10-12", restSeconds: 90, notes: "Squeeze shoulder blades" },
    { name: "Face Pulls", targetMuscles: ["Rear Delts", "Traps"], sets: 3, reps: "12-15", restSeconds: 60, notes: "Pull to forehead, external rotate" },
    { name: "Dumbbell Curls", targetMuscles: ["Biceps"], sets: 3, reps: "10-12", restSeconds: 60 },
    { name: "Hammer Curls", targetMuscles: ["Biceps", "Forearms"], sets: 3, reps: "10-12", restSeconds: 60 },
  ],
  legs: [
    { name: "Barbell Squats", targetMuscles: ["Quads", "Glutes", "Core"], sets: 4, reps: "6-8", restSeconds: 150, notes: "Below parallel, brace core" },
    { name: "Romanian Deadlifts", targetMuscles: ["Hamstrings", "Glutes", "Lower Back"], sets: 3, reps: "8-10", restSeconds: 120, notes: "Hinge at hips, slight knee bend" },
    { name: "Leg Press", targetMuscles: ["Quads", "Glutes"], sets: 3, reps: "10-12", restSeconds: 90, notes: "Full range of motion" },
    { name: "Walking Lunges", targetMuscles: ["Quads", "Glutes"], sets: 3, reps: "12 each leg", restSeconds: 90 },
    { name: "Leg Curls", targetMuscles: ["Hamstrings"], sets: 3, reps: "10-12", restSeconds: 60 },
    { name: "Calf Raises", targetMuscles: ["Calves"], sets: 4, reps: "12-15", restSeconds: 60, notes: "Full stretch at bottom" },
    { name: "Leg Extensions", targetMuscles: ["Quads"], sets: 3, reps: "12-15", restSeconds: 60 },
  ],
  upper: [
    { name: "Barbell Bench Press", targetMuscles: ["Chest", "Triceps"], sets: 4, reps: "6-8", restSeconds: 120 },
    { name: "Barbell Rows", targetMuscles: ["Back", "Biceps"], sets: 4, reps: "6-8", restSeconds: 120 },
    { name: "Overhead Press", targetMuscles: ["Shoulders"], sets: 3, reps: "8-10", restSeconds: 90 },
    { name: "Lat Pulldowns", targetMuscles: ["Lats"], sets: 3, reps: "8-10", restSeconds: 90 },
    { name: "Dumbbell Curls", targetMuscles: ["Biceps"], sets: 3, reps: "10-12", restSeconds: 60 },
    { name: "Tricep Pushdowns", targetMuscles: ["Triceps"], sets: 3, reps: "10-12", restSeconds: 60 },
  ],
  lower: [
    { name: "Barbell Squats", targetMuscles: ["Quads", "Glutes"], sets: 4, reps: "6-8", restSeconds: 150 },
    { name: "Romanian Deadlifts", targetMuscles: ["Hamstrings", "Glutes"], sets: 3, reps: "8-10", restSeconds: 120 },
    { name: "Leg Press", targetMuscles: ["Quads"], sets: 3, reps: "10-12", restSeconds: 90 },
    { name: "Walking Lunges", targetMuscles: ["Quads", "Glutes"], sets: 3, reps: "12 each", restSeconds: 90 },
    { name: "Leg Curls", targetMuscles: ["Hamstrings"], sets: 3, reps: "10-12", restSeconds: 60 },
    { name: "Calf Raises", targetMuscles: ["Calves"], sets: 4, reps: "15-20", restSeconds: 60 },
  ],
  full_body: [
    { name: "Barbell Squats", targetMuscles: ["Quads", "Glutes"], sets: 3, reps: "8-10", restSeconds: 120 },
    { name: "Barbell Bench Press", targetMuscles: ["Chest", "Triceps"], sets: 3, reps: "8-10", restSeconds: 90 },
    { name: "Barbell Rows", targetMuscles: ["Back", "Biceps"], sets: 3, reps: "8-10", restSeconds: 90 },
    { name: "Overhead Press", targetMuscles: ["Shoulders"], sets: 3, reps: "8-10", restSeconds: 90 },
    { name: "Romanian Deadlifts", targetMuscles: ["Hamstrings"], sets: 3, reps: "10-12", restSeconds: 90 },
    { name: "Dumbbell Curls", targetMuscles: ["Biceps"], sets: 2, reps: "10-12", restSeconds: 60 },
  ],
  rest: [],
};

function generateSplit(split: string, frequency: string) {
  const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  if (split === "ppl") {
    if (frequency === "6+") {
      return dayNames.map((d, i) => ({
        dayName: d,
        focus: ["Push", "Pull", "Legs", "Push", "Pull", "Legs", "Rest"][i],
        exercises: EXERCISE_DB[["push", "pull", "legs", "push", "pull", "legs", "rest"][i]] || [],
      }));
    }
    // 4-5 days
    return dayNames.map((d, i) => ({
      dayName: d,
      focus: ["Push", "Pull", "Legs", "Push", "Pull", "Rest", "Rest"][i],
      exercises: EXERCISE_DB[["push", "pull", "legs", "push", "pull", "rest", "rest"][i]] || [],
    }));
  }

  if (split === "upper_lower") {
    return dayNames.map((d, i) => ({
      dayName: d,
      focus: ["Upper", "Lower", "Rest", "Upper", "Lower", "Rest", "Rest"][i],
      exercises: EXERCISE_DB[["upper", "lower", "rest", "upper", "lower", "rest", "rest"][i]] || [],
    }));
  }

  if (split === "full_body") {
    return dayNames.map((d, i) => ({
      dayName: d,
      focus: ["Full Body", "Rest", "Full Body", "Rest", "Full Body", "Rest", "Rest"][i],
      exercises: EXERCISE_DB[["full_body", "rest", "full_body", "rest", "full_body", "rest", "rest"][i]] || [],
    }));
  }

  // Bro split
  return dayNames.map((d, i) => ({
    dayName: d,
    focus: ["Push (Chest/Tri)", "Pull (Back/Bi)", "Legs", "Shoulders/Arms", "Full Body", "Rest", "Rest"][i],
    exercises: EXERCISE_DB[["push", "pull", "legs", "upper", "full_body", "rest", "rest"][i]] || [],
  }));
}

export const getCurrentWorkoutPlan = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const plans = await ctx.db.query("workoutPlans").withIndex("by_userId", (q) => q.eq("userId", userId)).collect();
    return plans.length > 0 ? plans[plans.length - 1] : null;
  },
});

export const generateWorkoutPlan = mutation({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db.query("profiles").withIndex("by_userId", (q) => q.eq("userId", userId)).unique();
    if (!profile) throw new Error("No profile");

    const split = profile.workoutSplit || "ppl";
    const frequency = profile.workoutFrequency || "4-5";
    const days = generateSplit(split, frequency);

    // Delete old plans
    const old = await ctx.db.query("workoutPlans").withIndex("by_userId", (q) => q.eq("userId", userId)).collect();
    for (const o of old) await ctx.db.delete(o._id);

    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay() + 1);

    // Transform to new schema format (exerciseId, repRange as number[], rirTarget required)
    const normalizedDays = days.map((d: any) => ({
      dayName: d.dayName,
      focus: d.focus,
      estimatedDurationMinutes: d.exercises?.length ? d.exercises.length * 8 : 0,
      exercises: (d.exercises || []).map((ex: any) => ({
        exerciseId: ex.name.toLowerCase().replace(/\s+/g, "_"),
        name: ex.name,
        sets: ex.sets,
        repRange: typeof ex.reps === "string"
          ? ex.reps.split("-").map((n: string) => parseInt(n.trim(), 10)).filter((n: number) => !isNaN(n))
          : [8, 12],
        restSeconds: ex.restSeconds || 90,
        rirTarget: 2,
        notes: ex.notes,
      })),
    }));

    const planId = await ctx.db.insert("workoutPlans", {
      userId,
      weekStart: weekStart.toISOString().split("T")[0],
      split,
      days: normalizedDays,
    });

    return planId;
  },
});

export const logWorkout = mutation({
  args: {
    dayFocus: v.string(),
    exercises: v.array(v.object({
      name: v.string(),
      sets: v.array(v.object({
        reps: v.number(),
        weight: v.number(),
        completed: v.boolean(),
      })),
    })),
    duration: v.optional(v.number()),
    fatigue: v.optional(v.number()),
    energy: v.optional(v.number()),
  },
  returns: v.id("workoutLogs"),
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const today = new Date().toISOString().split("T")[0];

    const logId = await ctx.db.insert("workoutLogs", {
      userId,
      date: today,
      ...args,
    });

    // Update stats
    const stats = await ctx.db.query("userStats").withIndex("by_userId", (q) => q.eq("userId", userId)).unique();
    if (stats) {
      await ctx.db.patch(stats._id, {
        totalWorkoutsLogged: stats.totalWorkoutsLogged + 1,
        xp: stats.xp + 25,
        level: getLevelFromXp(stats.xp + 25),
      });
    }

    return logId;
  },
});

export const getWorkoutLogs = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db.query("workoutLogs").withIndex("by_userId", (q) => q.eq("userId", userId)).collect();
  },
});
