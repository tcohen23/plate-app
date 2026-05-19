/**
 * Plate Workout Generator — Premium Feature
 *
 * Generates personalized weekly workout plans using the exercise database.
 * Implements:
 * - Split recommendation (based on days/experience/goal)
 * - Volume/rep ranges by goal (Schoenfeld 2017, NSCA, ACSM)
 * - Programming matrix: 75-cell lookup (goal × experience × exercise_type)
 * - Injury filtering via risk tags
 * - Auto-deload every 6 weeks
 * - Push Harder (RIR-based sandbagging detection)
 */
import { getAuthUserId } from "@convex-dev/auth/server";
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import {
  getExercise,
  getExercisesForEquipment,
  getExercisesExcludingRisks,
  type Exercise,
  type MuscleGroup,
  type RiskTag,
} from "./exerciseDatabase";
import { lookupMatrix, parseRepRange, type ExerciseType } from "./workoutMatrix";

// ── Types ──────────────────────────────────────────────────────────────────────

type WorkoutGoal = "fat_loss" | "muscle_gain" | "recomp" | "strength" | "endurance";
type Experience = "beginner" | "intermediate" | "advanced";
type SplitType = "full_body" | "upper_lower" | "ppl" | "ppl_plus" | "bro_split";

interface WorkoutDayPlan {
  dayName: string;
  focus: string;
  exercises: Array<{
    exerciseId: string;
    name: string;
    sets: number;
    repRange: [number, number];
    restSeconds: number;
    rirTarget: number; // Reps in reserve target
    notes?: string;
  }>;
  estimatedDurationMinutes: number;
}

// ── Volume/rep targets by goal (Schoenfeld 2017) ──────────────────────────────
const GOAL_VOLUME: Record<WorkoutGoal, { setsPerMusclePerWeek: number; repRange: [number, number]; rirTarget: number }> = {
  strength: { setsPerMusclePerWeek: 10, repRange: [3, 6], rirTarget: 1 },
  muscle_gain: { setsPerMusclePerWeek: 16, repRange: [8, 12], rirTarget: 2 },
  recomp: { setsPerMusclePerWeek: 14, repRange: [8, 15], rirTarget: 2 },
  fat_loss: { setsPerMusclePerWeek: 12, repRange: [12, 20], rirTarget: 3 },
  endurance: { setsPerMusclePerWeek: 10, repRange: [15, 25], rirTarget: 3 },
};

// ── Split logic ───────────────────────────────────────────────────────────────
function recommendSplit(days: number, experience: Experience, goal: WorkoutGoal): SplitType {
  if (days <= 3) return "full_body";
  if (days === 4) {
    if (experience === "beginner") return "full_body";
    return "upper_lower";
  }
  if (days === 5) {
    if (experience === "beginner") return "upper_lower";
    if (goal === "muscle_gain" || goal === "recomp") return "ppl";
    return "ppl";
  }
  if (days >= 6) {
    if (experience === "advanced") return "ppl_plus";
    return "ppl";
  }
  return "full_body";
}

// ── Split day templates ───────────────────────────────────────────────────────
const SPLIT_TEMPLATES: Record<SplitType, Array<{ focus: string; muscles: MuscleGroup[]; isRest?: boolean }>> = {
  full_body: [
    { focus: "Full Body A", muscles: ["quads", "chest", "upper_back", "shoulders", "abs"] },
    { focus: "Rest", muscles: [], isRest: true },
    { focus: "Full Body B", muscles: ["glutes", "hamstrings", "chest", "lats", "core"] },
    { focus: "Rest", muscles: [], isRest: true },
    { focus: "Full Body C", muscles: ["quads", "upper_back", "shoulders", "biceps", "triceps"] },
    { focus: "Rest", muscles: [], isRest: true },
    { focus: "Rest", muscles: [], isRest: true },
  ],
  upper_lower: [
    { focus: "Upper A", muscles: ["chest", "upper_back", "shoulders", "biceps", "triceps"] },
    { focus: "Lower A", muscles: ["quads", "hamstrings", "glutes", "calves"] },
    { focus: "Rest", muscles: [], isRest: true },
    { focus: "Upper B", muscles: ["chest", "upper_back", "shoulders", "biceps", "triceps"] },
    { focus: "Lower B", muscles: ["quads", "hamstrings", "glutes", "calves", "core"] },
    { focus: "Rest", muscles: [], isRest: true },
    { focus: "Rest", muscles: [], isRest: true },
  ],
  ppl: [
    { focus: "Push", muscles: ["chest", "shoulders", "triceps"] },
    { focus: "Pull", muscles: ["upper_back", "lats", "biceps", "rear_delts"] },
    { focus: "Legs", muscles: ["quads", "hamstrings", "glutes", "calves"] },
    { focus: "Rest", muscles: [], isRest: true },
    { focus: "Push", muscles: ["chest", "shoulders", "triceps"] },
    { focus: "Pull", muscles: ["upper_back", "lats", "biceps", "rear_delts"] },
    { focus: "Legs", muscles: ["quads", "hamstrings", "glutes", "calves", "abs"] },
  ],
  ppl_plus: [
    { focus: "Push", muscles: ["chest", "upper_chest", "front_delts", "side_delts", "triceps"] },
    { focus: "Pull", muscles: ["upper_back", "lats", "rhomboids", "biceps", "rear_delts"] },
    { focus: "Legs", muscles: ["quads", "hamstrings", "glutes", "calves"] },
    { focus: "Push (Hypertrophy)", muscles: ["chest", "shoulders", "triceps"] },
    { focus: "Pull (Hypertrophy)", muscles: ["lats", "upper_back", "biceps"] },
    { focus: "Legs (Posterior)", muscles: ["hamstrings", "glutes", "calves", "abs"] },
    { focus: "Rest", muscles: [], isRest: true },
  ],
  bro_split: [
    { focus: "Chest", muscles: ["chest", "upper_chest", "lower_chest"] },
    { focus: "Back", muscles: ["upper_back", "lats", "rhomboids", "traps"] },
    { focus: "Shoulders", muscles: ["front_delts", "side_delts", "rear_delts"] },
    { focus: "Arms", muscles: ["biceps", "triceps", "forearms"] },
    { focus: "Legs", muscles: ["quads", "hamstrings", "glutes", "calves"] },
    { focus: "Rest", muscles: [], isRest: true },
    { focus: "Rest", muscles: [], isRest: true },
  ],
};

// ── Deload detection ──────────────────────────────────────────────────────────
function shouldDeload(weekNumber: number): boolean {
  return weekNumber > 0 && weekNumber % 6 === 0;
}

// ── Exercise selection for a day ──────────────────────────────────────────────
function selectExercisesForDay(
  targetMuscles: MuscleGroup[],
  availableExercises: Exercise[],
  experience: Experience,
  goal: WorkoutGoal,
  sessionMinutes: number,
  isDeload: boolean
): WorkoutDayPlan["exercises"] {
  const goalParams = GOAL_VOLUME[goal];

  // Filter to exercises targeting our muscles
  const relevant = availableExercises.filter(ex =>
    ex.primary_muscles.some(m => targetMuscles.includes(m)) ||
    ex.secondary_muscles.some(m => targetMuscles.includes(m))
  );

  // Score by suitability for experience level
  const scored = relevant.map(ex => ({
    exercise: ex,
    score:
      experience === "beginner" ? ex.suitability_beginner
      : experience === "intermediate" ? ex.suitability_intermediate
      : ex.suitability_advanced,
  })).filter(e => e.score > 0);

  // Sort by compound first, then score
  scored.sort((a, b) => {
    if (a.exercise.is_compound !== b.exercise.is_compound) {
      return a.exercise.is_compound ? -1 : 1;
    }
    return b.score - a.score;
  });

  // Pick top exercises to fill the session time
  // Estimate ~8 min per exercise (warmup set + working sets + rest)
  const maxExercises = Math.min(Math.floor(sessionMinutes / 8), 7);

  // Ensure muscle coverage — pick at least one compound per major muscle
  const selected: Exercise[] = [];
  const coveredMuscles = new Set<string>();

  // First pass: compounds for each target muscle
  for (const muscle of targetMuscles) {
    if (selected.length >= maxExercises) break;
    const compound = scored.find(e =>
      e.exercise.is_compound &&
      e.exercise.primary_muscles.includes(muscle) &&
      !selected.includes(e.exercise)
    );
    if (compound && !coveredMuscles.has(muscle)) {
      selected.push(compound.exercise);
      compound.exercise.primary_muscles.forEach(m => coveredMuscles.add(m));
    }
  }

  // Second pass: fill remaining slots with high-scoring isolations
  for (const { exercise } of scored) {
    if (selected.length >= maxExercises) break;
    if (!selected.includes(exercise)) {
      selected.push(exercise);
    }
  }

  // Map WorkoutGoal → exercise DB key (exercise DB uses "hypertrophy", we use "muscle_gain")
  type ExGoalKey = "strength" | "hypertrophy" | "endurance" | "recomp" | "fat_loss";
  const goalToExKey: Record<WorkoutGoal, ExGoalKey> = {
    muscle_gain: "hypertrophy",
    strength: "strength",
    endurance: "endurance",
    recomp: "recomp",
    fat_loss: "fat_loss",
  };
  const exGoalKey = goalToExKey[goal] ?? "hypertrophy";

  // Build exercise list with sets/reps — use programming matrix for precise prescriptions
  return selected.map(ex => {
    // Determine exercise type for matrix lookup
    const exType: ExerciseType =
      ex.modality === "barbell" ? "compound_barbell"
      : ex.modality === "cardio_machine" || ex.modality === "free_cardio" ? "cardio"
      : ex.modality === "bodyweight" ? "bodyweight"
      : ex.is_compound ? "compound_dumbbell_machine"
      : "isolation";

    // Look up the programming matrix cell
    const matrixCell = lookupMatrix(goal, experience, exType);

    // Fall back to exercise DB params if matrix lookup fails
    const baseRepRange = matrixCell
      ? parseRepRange(matrixCell.reps)
      : (ex.rep_ranges?.[exGoalKey] || goalParams.repRange);
    const baseSets = matrixCell
      ? matrixCell.sets
      : (ex.sets_by_goal?.[exGoalKey] || ex.default_sets);
    const baseRest = matrixCell
      ? matrixCell.rest_seconds
      : (ex.rest_seconds?.[exGoalKey] || ex.default_rest_seconds);

    const sets = isDeload ? Math.max(2, Math.floor(baseSets * 0.6)) : baseSets;
    const repRange: [number, number] = isDeload
      ? [Math.floor(baseRepRange[0] * 0.8), Math.floor(baseRepRange[1] * 0.8)]
      : baseRepRange;
    const restSeconds = isDeload ? Math.round(baseRest * 0.7) : baseRest;

    // Form cues from matrix + deload note
    const formCues = matrixCell?.form_cues || [];
    const notes = isDeload
      ? "Deload week — reduce weight 20%, focus on form"
      : formCues.length > 0
        ? formCues.join(" · ")
        : ex.instructions;

    return {
      exerciseId: ex.id,
      name: ex.name,
      sets,
      repRange,
      restSeconds,
      rirTarget: isDeload ? 4 : goalParams.rirTarget,
      notes,
      // Expose cues separately for richer UI rendering
      formCues: isDeload ? [] : formCues,
      // Muscle targeting from exercise database
      primaryMuscles: ex.primary_muscles || [],
      secondaryMuscles: ex.secondary_muscles || [],
      // Matrix metadata
      exerciseType: matrixCell?.exercise_type || null,
      rationale: matrixCell?.sets_reps_rationale || null,
      // How-to instructions from exercise database
      instructions: ex.instructions || null,
      // Simple how-to and muscle target descriptions
      how_to: ex.how_to || null,
      muscle_target: ex.muscle_target || null,
    };
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getProfile(ctx: any, userId: any) {
  return ctx.db.query("profiles").withIndex("by_userId", (q: any) => q.eq("userId", userId)).unique();
}

function mapProfileToRiskTags(profile: any): RiskTag[] {
  // Could be extended to use onboarding injury tags
  const tags: RiskTag[] = [];
  if (profile.injuries) {
    for (const inj of profile.injuries as string[]) {
      if (inj === "lower_back") tags.push("lower_back_high");
      if (inj === "knee") tags.push("knee_high");
      if (inj === "shoulder") tags.push("shoulder_high");
      if (inj === "wrist") tags.push("wrist_elbow_high");
      if (inj === "ankle") tags.push("ankle_high");
    }
  }
  return tags;
}

function mapProfileToEquipment(profile: any): any[] {
  const equip = profile.equipment as string[] | undefined;
  if (!equip || equip.length === 0) {
    // Default: well-equipped commercial gym
    return ["barbell", "squat_rack", "bench", "dumbbell", "pull_up_bar", "cable_machine",
      "lat_pulldown_machine", "leg_press", "leg_curl", "leg_extension", "chest_press_machine",
      "pec_deck", "shoulder_press_machine", "treadmill", "stationary_bike", "rowing_machine",
      "elliptical", "foam_roller"];
  }
  return equip;
}

// ── Queries ───────────────────────────────────────────────────────────────────

export const getMyWorkoutPlan = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const plan = await ctx.db.query("workoutPlans")
      .withIndex("by_userId", (q: any) => q.eq("userId", userId))
      .order("desc")
      .first();
    if (!plan) return null;

    // Enrich each exercise with how_to and muscle_target from the live exercise DB
    const enrichedDays = (plan.days || []).map((day: any) => ({
      ...day,
      exercises: (day.exercises || []).map((ex: any) => {
        const dbExercise = getExercise(ex.exerciseId);
        return {
          ...ex,
          how_to: ex.how_to || dbExercise?.how_to || null,
          muscle_target: ex.muscle_target || dbExercise?.muscle_target || null,
          instructions: ex.instructions || dbExercise?.instructions || null,
          primaryMuscles: ex.primaryMuscles?.length ? ex.primaryMuscles : (dbExercise?.primary_muscles || []),
          secondaryMuscles: ex.secondaryMuscles?.length ? ex.secondaryMuscles : (dbExercise?.secondary_muscles || []),
        };
      }),
    }));

    return { ...plan, days: enrichedDays };
  },
});

export const getWeeklyWorkoutLogs = query({
  args: { weekStart: v.string() },
  handler: async (ctx, { weekStart }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return ctx.db.query("workoutLogs")
      .withIndex("by_userId", (q: any) => q.eq("userId", userId))
      .filter((q: any) => q.eq(q.field("date"), weekStart))
      .collect();
  },
});

// ── Generate workout plan ──────────────────────────────────────────────────────

export const generateWorkoutPlan = mutation({
  args: {
    goal: v.string(), // fat_loss | muscle_gain | recomp | strength | endurance
    experience: v.string(), // beginner | intermediate | advanced
    daysPerWeek: v.number(),
    sessionMinutes: v.number(),
    injuries: v.optional(v.array(v.string())),
    splitOverride: v.optional(v.string()),
    gymType: v.optional(v.string()), // "commercial" | "home"
    homeEquipment: v.optional(v.array(v.string())), // equipment selected for home gym
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await getProfile(ctx, userId);
    if (!profile) throw new Error("Profile not found");

    const goal = args.goal as WorkoutGoal;
    const experience = args.experience as Experience;
    const days = Math.min(Math.max(args.daysPerWeek, 2), 7);
    const sessionMinutes = Math.min(Math.max(args.sessionMinutes, 20), 120);

    // Determine split
    const split: SplitType = (args.splitOverride as SplitType) || recommendSplit(days, experience, goal);

    // Build equipment filter based on gym type
    let equipmentList: string[];
    if (args.gymType === "home" && args.homeEquipment && args.homeEquipment.length > 0) {
      // Home gym: use exactly what they selected
      equipmentList = args.homeEquipment;
    } else if (args.gymType === "commercial") {
      // Commercial gym: full equipment suite
      equipmentList = ["barbell", "squat_rack", "bench", "dumbbell", "pull_up_bar", "cable_machine",
        "lat_pulldown_machine", "leg_press", "leg_curl", "leg_extension", "chest_press_machine",
        "pec_deck", "shoulder_press_machine", "treadmill", "stationary_bike", "rowing_machine",
        "elliptical", "foam_roller", "smith_machine", "hack_squat_machine", "dip_bars", "kettlebell"];
    } else {
      // Fallback: use profile equipment or default to full gym
      equipmentList = mapProfileToEquipment(profile);
    }
    const riskTags = mapProfileToRiskTags({ ...profile, injuries: args.injuries });

    // Get available exercises after filtering
    const availableExercises = getExercisesExcludingRisks(
      getExercisesForEquipment(equipmentList as any),
      riskTags
    );

    // Determine week number for deload
    const existingPlans = await ctx.db.query("workoutPlans")
      .withIndex("by_userId", (q: any) => q.eq("userId", userId))
      .collect();
    const weekNumber = existingPlans.length + 1;
    const isDeload = shouldDeload(weekNumber);

    // Generate plan for each day of the week
    const template = SPLIT_TEMPLATES[split];
    const workoutDays: WorkoutDayPlan[] = [];
    let activeDayCount = 0;

    for (let i = 0; i < 7; i++) {
      const dayTemplate = template[i % template.length];

      if (dayTemplate.isRest || activeDayCount >= days) {
        workoutDays.push({
          dayName: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][i],
          focus: "Rest",
          exercises: [],
          estimatedDurationMinutes: 0,
        });
        continue;
      }

      activeDayCount++;
      const exercises = selectExercisesForDay(
        dayTemplate.muscles,
        availableExercises,
        experience,
        goal,
        sessionMinutes,
        isDeload
      );

      const estimatedMinutes = exercises.reduce((acc, ex) => {
        const restMins = (ex.restSeconds * ex.sets) / 60;
        const workMins = ex.sets * 0.75; // ~45s per set
        return acc + restMins + workMins;
      }, 0);

      workoutDays.push({
        dayName: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"][i],
        focus: dayTemplate.focus + (isDeload ? " (Deload)" : ""),
        exercises,
        estimatedDurationMinutes: Math.round(estimatedMinutes),
      });
    }

    // Save plan (including exercises so they persist across page reloads)
    const planId = await ctx.db.insert("workoutPlans", {
      userId,
      weekStart: new Date().toISOString().split("T")[0],
      split,
      weekNumber,
      isDeload,
      days: workoutDays.map(d => ({
        dayName: d.dayName,
        focus: d.focus,
        estimatedDurationMinutes: d.estimatedDurationMinutes,
        exercises: d.exercises.map(ex => ({
          exerciseId: ex.exerciseId,
          name: ex.name,
          sets: ex.sets,
          repRange: ex.repRange as number[],
          restSeconds: ex.restSeconds,
          rirTarget: ex.rirTarget,
          notes: ex.notes,
        })),
      })),
    });

    return {
      planId,
      split,
      isDeload,
      weekNumber,
      days: workoutDays,
      deloadMessage: isDeload
        ? "Recovery week activated 💪 Volume is reduced 40%. Focus on form, keep intensity around 80%. Your body will thank you."
        : null,
    };
  },
});

// ── Log a completed workout set (for RIR tracking) ────────────────────────────

export const logWorkoutSet = mutation({
  args: {
    date: v.string(),
    dayFocus: v.string(),
    exerciseId: v.string(),
    exerciseName: v.string(),
    setNumber: v.number(),
    weight: v.optional(v.number()),
    reps: v.number(),
    rirLogged: v.optional(v.number()), // How many reps left in tank
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if there's already a workout log for this day
    const existing = await ctx.db.query("workoutLogs")
      .withIndex("by_userId", (q: any) => q.eq("userId", userId))
      .filter((q: any) => q.eq(q.field("date"), args.date))
      .first();

    if (existing) {
      const exercises = (existing.exercises as any[]) || [];
      const exIdx = exercises.findIndex((e: any) => e.name === args.exerciseName);

      if (exIdx >= 0) {
        exercises[exIdx].sets.push({
          reps: args.reps,
          weight: args.weight,
          rir: args.rirLogged,
        });
      } else {
        exercises.push({
          name: args.exerciseName,
          sets: [{ reps: args.reps, weight: args.weight, rir: args.rirLogged }],
        });
      }

      await ctx.db.patch(existing._id, { exercises });
      return existing._id;
    }

    return ctx.db.insert("workoutLogs", {
      userId,
      date: args.date,
      dayFocus: args.dayFocus,
      exercises: [{
        name: args.exerciseName,
        sets: [{ reps: args.reps, weight: args.weight, rir: args.rirLogged }],
      }],
    } as any);
  },
});

// ── Push Harder detection ─────────────────────────────────────────────────────

export const checkPushHarder = query({
  args: { exerciseId: v.string() },
  handler: async (ctx, { exerciseId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    // Get last 3 workout logs containing this exercise
    const logs = await ctx.db.query("workoutLogs")
      .withIndex("by_userId", (q: any) => q.eq("userId", userId))
      .order("desc")
      .take(30);

    const relevantSessions: number[][] = [];
    for (const log of logs) {
      const ex = (log.exercises as any[]).find(e => e.name === exerciseId || e.name.toLowerCase().includes(exerciseId));
      if (ex) {
        const rirs = ex.sets
          .map((s: any) => s.rir)
          .filter((r: any) => r !== undefined && r !== null) as number[];
        if (rirs.length > 0) relevantSessions.push(rirs);
        if (relevantSessions.length >= 3) break;
      }
    }

    if (relevantSessions.length < 3) return null;

    // Check if avg RIR >= 3 over last 3 sessions (hypertrophy target RIR=2)
    const avgRirs = relevantSessions.map(s => s.reduce((a, b) => a + b, 0) / s.length);
    const overallAvg = avgRirs.reduce((a, b) => a + b, 0) / avgRirs.length;

    // Get profile to check experience level
    const profile = await getProfile(ctx, userId);
    const experience = profile?.experienceLevel || "intermediate";
    const sandbaggingThreshold = experience === "beginner" ? 4 : 3;

    if (overallAvg >= sandbaggingThreshold) {
      return {
        shouldNudge: true,
        avgRir: Math.round(overallAvg * 10) / 10,
        nudgeMessage: getPushHarderCopy(overallAvg, experience),
      };
    }

    return { shouldNudge: false, avgRir: Math.round(overallAvg * 10) / 10 };
  },
});

// ── Brand-voice Push Harder copy ─────────────────────────────────────────────

function getPushHarderCopy(avgRir: number, experience: string): string {
  const messages = [
    `You're leaving reps in the tank — avg ${avgRir.toFixed(1)} RIR last 3 sessions. You've got more in you. Don't cheat your gains.`,
    `Real talk: you're holding back. ${avgRir.toFixed(1)} reps left over every set. Push to within 1-2 reps of failure — that's where growth lives.`,
    `Your body has adapted. It's time to level up the load. Go heavier, go closer to the edge. Progress lives outside comfort.`,
    `You've been too comfortable. Average ${avgRir.toFixed(1)} RIR says there's still gas in the tank. Use it.`,
    `Growth happens at the edge of your capacity, not in the middle of it. Next session — go harder.`,
  ];

  // Softer version for beginners
  if (experience === "beginner") {
    return `Nice consistency! You're building great habits. Now it's time to push a little harder each session — try adding 2.5-5 lbs or 1-2 reps next time.`;
  }

  return messages[Math.floor(Math.random() * messages.length)];
}

// ── Workout Draft Sets (persist in-progress sets across sessions) ──────────────

export const getDraftSets = query({
  args: { date: v.string() },
  handler: async (ctx, { date }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return ctx.db.query("workoutDrafts")
      .withIndex("by_userId_date", (q: any) => q.eq("userId", userId).eq("date", date))
      .collect();
  },
});

export const saveDraftSet = mutation({
  args: {
    date: v.string(),
    exerciseName: v.string(),
    setNumber: v.number(),
    weight: v.optional(v.number()),
    reps: v.optional(v.number()),
    rir: v.optional(v.number()),
    completed: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db.query("workoutDrafts")
      .withIndex("by_userId_date_exercise", (q: any) =>
        q.eq("userId", userId).eq("date", args.date).eq("exerciseName", args.exerciseName)
      )
      .filter((q: any) => q.eq(q.field("setNumber"), args.setNumber))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        weight: args.weight,
        reps: args.reps,
        rir: args.rir,
        completed: args.completed,
      });
    } else {
      await ctx.db.insert("workoutDrafts", {
        userId,
        date: args.date,
        exerciseName: args.exerciseName,
        setNumber: args.setNumber,
        weight: args.weight,
        reps: args.reps,
        rir: args.rir,
        completed: args.completed,
      } as any);
    }
  },
});

export const clearDraftSets = mutation({
  args: { date: v.string(), exerciseName: v.optional(v.string()) },
  handler: async (ctx, { date, exerciseName }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    let query = ctx.db.query("workoutDrafts")
      .withIndex("by_userId_date", (q: any) => q.eq("userId", userId).eq("date", date));

    const drafts = await (query as any).collect();
    for (const d of drafts) {
      if (!exerciseName || d.exerciseName === exerciseName) {
        await ctx.db.delete(d._id);
      }
    }
  },
});
