// AUTO-GENERATED from 03_combinations.json — do not edit manually
// 75-cell workout programming matrix (goal × experience × exercise_type)
// Based on NSCA, ACSM, Schoenfeld 2017, Singer/Wolf/Schoenfeld 2024

export type WorkoutGoal = "strength" | "hypertrophy" | "recomp" | "fat_loss" | "endurance";
export type ExperienceLevel = "beginner" | "intermediate" | "advanced";
export type ExerciseType = "compound_barbell" | "compound_dumbbell_machine" | "isolation" | "bodyweight" | "cardio";

export interface MatrixCell {
  goal: WorkoutGoal;
  experience: ExperienceLevel;
  exercise_type: ExerciseType;
  rest_seconds: number;
  rest_rationale: string;
  sets: number;
  reps: string;
  sets_reps_rationale: string;
  form_cues: string[];
  muscles_primary: string;
  muscles_secondary: string;
}

export const WORKOUT_MATRIX: MatrixCell[] = [
  {
    "goal": "strength",
    "experience": "beginner",
    "exercise_type": "compound_barbell",
    "rest_seconds": 120,
    "rest_rationale": "Beginners aren't lifting heavy enough relative to true potential to need 3-5 min; 2 min recovers the nervous system while keeping the session under an hour.",
    "sets": 3,
    "reps": "5",
    "sets_reps_rationale": "Classic novice strength prescription (Starting Strength / StrongLifts). Low reps teach bracing and tightness; 3 sets drives linear progression.",
    "form_cues": [
      "Crush the bar in your hands",
      "Screw your feet into the floor",
      "Big breath into your belt before each rep"
    ],
    "muscles_primary": "Movement-dependent \u2014 squat: quads/glutes; deadlift: glutes/hamstrings/erectors; bench: pecs/triceps; OHP: delts/triceps; row: lats/mid-back",
    "muscles_secondary": "Spinal erectors, core, stabilizers \u2014 depends on lift"
  },
  {
    "goal": "strength",
    "experience": "beginner",
    "exercise_type": "compound_dumbbell_machine",
    "rest_seconds": 90,
    "rest_rationale": "DB/machine work is less neurally taxing than loaded barbell; 90s keeps blood pressure recovered without dragging the session out.",
    "sets": 3,
    "reps": "6-8",
    "sets_reps_rationale": "Slightly higher reps than barbell because loads are lower and stability demands are higher; still trains strength while letting form solidify.",
    "form_cues": [
      "Move the dumbbell, don't let it move you",
      "Match your tempo on every rep",
      "Control the lowering phase"
    ],
    "muscles_primary": "Movement-dependent",
    "muscles_secondary": "Movement-dependent"
  },
  {
    "goal": "strength",
    "experience": "beginner",
    "exercise_type": "isolation",
    "rest_seconds": 60,
    "rest_rationale": "Single joint, small muscle group, low systemic cost \u2014 recovery between sets is fast even at strength rep ranges.",
    "sets": 2,
    "reps": "8",
    "sets_reps_rationale": "Pure-strength isolation work doesn't exist meaningfully for a beginner; rep range stays low-ish to support compound lifts. Volume intentionally minimal.",
    "form_cues": [
      "Lock your elbow in place",
      "No momentum \u2014 pause at the top",
      "Feel the target muscle, not your back"
    ],
    "muscles_primary": "Movement-dependent",
    "muscles_secondary": "Stabilizers"
  },
  {
    "goal": "strength",
    "experience": "beginner",
    "exercise_type": "bodyweight",
    "rest_seconds": 90,
    "rest_rationale": "Beginners doing bodyweight strength (incline push-ups, assisted pull-ups, goblet squats) work at high relative intensity; 90s allows reset before form breaks.",
    "sets": 3,
    "reps": "5",
    "sets_reps_rationale": "Mirrors barbell strength template. If 5 clean reps come easily, make the progression harder (steeper push-up, less band assistance).",
    "form_cues": [
      "Full-body tension head to toe",
      "Control the negative for a full 2-count",
      "Lock out every rep \u2014 no half reps"
    ],
    "muscles_primary": "Movement-dependent",
    "muscles_secondary": "Core stabilizers"
  },
  {
    "goal": "strength",
    "experience": "beginner",
    "exercise_type": "cardio",
    "rest_seconds": 60,
    "rest_rationale": "Strength-focused cardio is recovery and general capacity work, not primary stimulus. Steady-state needs no rest; intervals need 60s to drop HR without losing purpose.",
    "sets": 1,
    "reps": "15-20 min steady-state OR 6 x 20s moderate hill/bike with 60s easy",
    "sets_reps_rationale": "Keep cardio short and easy so it doesn't interfere with strength recovery (interference effect).",
    "form_cues": [
      "Nasal breathing if possible",
      "If you can't hold a conversation, slow down",
      "Land softly on the balls of your feet"
    ],
    "muscles_primary": "Cardiovascular system",
    "muscles_secondary": "Lower body (modality-dependent)"
  },
  {
    "goal": "strength",
    "experience": "intermediate",
    "exercise_type": "compound_barbell",
    "rest_seconds": 180,
    "rest_rationale": "Loads are now heavy enough (80-90% 1RM) that the phosphagen system needs full replenishment between sets to maintain bar speed.",
    "sets": 4,
    "reps": "4 (or 5x3 @ 80-87% 1RM)",
    "sets_reps_rationale": "Intermediate lifters need more intensity exposure than 3x5 to drive strength. Lower reps per set, more sets, higher percentage.",
    "form_cues": [
      "Same bar path every rep",
      "Drive the floor away",
      "Exhale through the sticking point"
    ],
    "muscles_primary": "Movement-dependent",
    "muscles_secondary": "Stabilizers"
  },
  {
    "goal": "strength",
    "experience": "intermediate",
    "exercise_type": "compound_dumbbell_machine",
    "rest_seconds": 120,
    "rest_rationale": "Heavier loads than beginner phase but still less neural cost than barbell; 2 min is the sweet spot.",
    "sets": 4,
    "reps": "5-6",
    "sets_reps_rationale": "Strength-leaning rep range with enough volume for these to be meaningful accessories to the main lifts.",
    "form_cues": [
      "Pin your shoulder blades down and back",
      "Drive through the full range",
      "No swinging \u2014 your torso doesn't move"
    ],
    "muscles_primary": "Movement-dependent",
    "muscles_secondary": "Stabilizers"
  },
  {
    "goal": "strength",
    "experience": "intermediate",
    "exercise_type": "isolation",
    "rest_seconds": 75,
    "rest_rationale": "Slightly longer than beginner because working sets are more challenging, but isolation still recovers fast.",
    "sets": 3,
    "reps": "6-8",
    "sets_reps_rationale": "Third set adds weekly volume on weak points (triceps for bench, hamstrings for deadlift) without bloating the session.",
    "form_cues": [
      "Squeeze hard at peak contraction",
      "Slow eccentric, fast concentric",
      "Don't let the weight bounce"
    ],
    "muscles_primary": "Movement-dependent",
    "muscles_secondary": "Stabilizers"
  },
  {
    "goal": "strength",
    "experience": "intermediate",
    "exercise_type": "bodyweight",
    "rest_seconds": 120,
    "rest_rationale": "At intermediate level, bodyweight strength = pull-ups, dips, pistol progressions \u2014 high relative intensity demands real recovery.",
    "sets": 4,
    "reps": "5",
    "sets_reps_rationale": "Fourth set added vs. beginner; if 5 reps becomes easy, progress to a harder variation, not more reps.",
    "form_cues": [
      "Initiate the pull with your lats",
      "Control to a dead hang",
      "No kipping \u2014 strict form only"
    ],
    "muscles_primary": "Movement-dependent",
    "muscles_secondary": "Core stabilizers"
  },
  {
    "goal": "strength",
    "experience": "intermediate",
    "exercise_type": "cardio",
    "rest_seconds": 90,
    "rest_rationale": "Hard intervals at this stage need enough rest to keep them anaerobic-alactic/glycolytic without crossing into pure cardio.",
    "sets": 8,
    "reps": "30s hard / 90s easy (bike or sled push)",
    "sets_reps_rationale": "Keeps total volume low so it complements rather than competes with strength training.",
    "form_cues": [
      "Drive your knees, not your arms",
      "Fully exhale on every effort",
      "Easy spin between \u2014 keep moving"
    ],
    "muscles_primary": "Cardiovascular",
    "muscles_secondary": "Lower body"
  },
  {
    "goal": "strength",
    "experience": "advanced",
    "exercise_type": "compound_barbell",
    "rest_seconds": 300,
    "rest_rationale": "Working loads at 87-95% 1RM. Maximal force production requires full CNS and phosphagen recovery \u2014 shorter and bar speed drops, killing the strength stimulus.",
    "sets": 5,
    "reps": "2-3 @ 87-93% 1RM (or 6x1-3 in peaking blocks)",
    "sets_reps_rationale": "Advanced strength = high intensity, low rep volume per set, more sets to accumulate quality work. Triples/doubles let lifter handle near-max loads without form decay.",
    "form_cues": [
      "Bar path stays vertical from above",
      "Match the tempo of your best rep",
      "Treat every rep like the heaviest one"
    ],
    "muscles_primary": "Movement-dependent",
    "muscles_secondary": "Stabilizers"
  },
  {
    "goal": "strength",
    "experience": "advanced",
    "exercise_type": "compound_dumbbell_machine",
    "rest_seconds": 150,
    "rest_rationale": "These are accessories at this stage, not main movements \u2014 2.5 min is enough.",
    "sets": 4,
    "reps": "4-6",
    "sets_reps_rationale": "Functions as heavy accessory to attack weaknesses (e.g., DB bench for lockout strength).",
    "form_cues": [
      "Match your barbell groove",
      "Punish the negative",
      "Stop the rep, don't let it stop you"
    ],
    "muscles_primary": "Movement-dependent",
    "muscles_secondary": "Stabilizers"
  },
  {
    "goal": "strength",
    "experience": "advanced",
    "exercise_type": "isolation",
    "rest_seconds": 90,
    "rest_rationale": "Advanced lifters use heavier isolation loads (loaded curls in straps, heavy tricep extensions); slightly more rest helps maintain quality.",
    "sets": 4,
    "reps": "6-8",
    "sets_reps_rationale": "Targeted volume to drive up weak links without stealing from main-lift recovery.",
    "form_cues": [
      "Pause for a full second at peak",
      "No body English",
      "If you feel it anywhere but the target, reset"
    ],
    "muscles_primary": "Movement-dependent",
    "muscles_secondary": "Stabilizers"
  },
  {
    "goal": "strength",
    "experience": "advanced",
    "exercise_type": "bodyweight",
    "rest_seconds": 150,
    "rest_rationale": "Advanced bodyweight strength = weighted pull-ups/dips, one-arm push-ups, pistols. Functionally equivalent to heavy barbell work.",
    "sets": 5,
    "reps": "3-5 (add weight when reps come easy)",
    "sets_reps_rationale": "Strength rep range with progressive loading via belt/vest.",
    "form_cues": [
      "Pull yourself to the bar, don't pull the bar down",
      "Lock out fully at the top",
      "Stay rigid \u2014 no shaking"
    ],
    "muscles_primary": "Movement-dependent",
    "muscles_secondary": "Core stabilizers"
  },
  {
    "goal": "strength",
    "experience": "advanced",
    "exercise_type": "cardio",
    "rest_seconds": 120,
    "rest_rationale": "Advanced strength athletes keep conditioning minimal \u2014 sled, sprints, low-impact intervals \u2014 to avoid interference with strength gains.",
    "sets": 6,
    "reps": "40m sprint, full recovery (90-120s) OR 20 min Zone 2 bike 2x/week",
    "sets_reps_rationale": "Maintains aerobic base and recovery capacity without compromising heavy training.",
    "form_cues": [
      "Drive through the ground, don't reach with your feet",
      "Tall posture, relaxed jaw",
      "Every sprint matches the first"
    ],
    "muscles_primary": "Cardiovascular",
    "muscles_secondary": "Posterior chain"
  },
  {
    "goal": "hypertrophy",
    "experience": "beginner",
    "exercise_type": "compound_barbell",
    "rest_seconds": 120,
    "rest_rationale": "Above the 1-2 min hypertrophy meta-analysis floor to preserve volume load; short enough to build work capacity.",
    "sets": 3,
    "reps": "8-10",
    "sets_reps_rationale": "Beginners build muscle on lower volume than intermediates. 3 sets is enough stimulus; 8-10 reps lets form solidify under fatigue.",
    "form_cues": [
      "Control the lowering for a 2-count",
      "Feel the working muscle, not the joints",
      "No bouncing at the bottom"
    ],
    "muscles_primary": "Movement-dependent",
    "muscles_secondary": "Stabilizers"
  },
  {
    "goal": "hypertrophy",
    "experience": "beginner",
    "exercise_type": "compound_dumbbell_machine",
    "rest_seconds": 75,
    "rest_rationale": "Lower stabilization demand than barbell allows shorter rest; metabolic stress contributes to hypertrophy.",
    "sets": 3,
    "reps": "10-12",
    "sets_reps_rationale": "Slightly more reps than barbell because load is lower; perfect range for building mind-muscle connection.",
    "form_cues": [
      "Squeeze the working muscle for a second at peak",
      "Don't lock out joints fully \u2014 keep tension",
      "Match left and right side"
    ],
    "muscles_primary": "Movement-dependent",
    "muscles_secondary": "Stabilizers"
  },
  {
    "goal": "hypertrophy",
    "experience": "beginner",
    "exercise_type": "isolation",
    "rest_seconds": 60,
    "rest_rationale": "Short rest maximizes metabolic stress, a key hypertrophy driver for small muscle groups.",
    "sets": 3,
    "reps": "10-12",
    "sets_reps_rationale": "Isolation thrives in moderate-high rep range; 3 sets is enough total volume for a beginner.",
    "form_cues": [
      "Stretch the muscle fully at the bottom",
      "No momentum \u2014 slow it down if you can't control it",
      "Burn = good, joint pain = stop"
    ],
    "muscles_primary": "Movement-dependent",
    "muscles_secondary": "Stabilizers"
  },
  {
    "goal": "hypertrophy",
    "experience": "beginner",
    "exercise_type": "bodyweight",
    "rest_seconds": 75,
    "rest_rationale": "Bodyweight hypertrophy needs higher rep ranges (metabolic stress); short rest enhances that.",
    "sets": 3,
    "reps": "10-15",
    "sets_reps_rationale": "With bodyweight, hypertrophy comes from approaching failure. Higher reps account for lower relative load.",
    "form_cues": [
      "Full range of motion every rep",
      "Control down, drive up",
      "Stop 1-2 reps before form breaks"
    ],
    "muscles_primary": "Movement-dependent",
    "muscles_secondary": "Core stabilizers"
  },
  {
    "goal": "hypertrophy",
    "experience": "beginner",
    "exercise_type": "cardio",
    "rest_seconds": 60,
    "rest_rationale": "Cardio is supportive, not primary. Easy work helps recovery and appetite.",
    "sets": 1,
    "reps": "20-30 min easy walk/bike 2-3x per week",
    "sets_reps_rationale": "Enough to support recovery and cardiovascular health without burning calories that would feed growth.",
    "form_cues": [
      "Stay conversational",
      "Breathe through your nose if possible",
      "Easy means easy \u2014 that's the point"
    ],
    "muscles_primary": "Cardiovascular",
    "muscles_secondary": "\u2014"
  },
  {
    "goal": "hypertrophy",
    "experience": "intermediate",
    "exercise_type": "compound_barbell",
    "rest_seconds": 150,
    "rest_rationale": "Lower body hypertrophy benefits from 2.5 min (per Longo et al.); upper body is fine at 2 min. Long enough to maintain volume load.",
    "sets": 4,
    "reps": "6-10",
    "sets_reps_rationale": "Increases total volume vs. beginner. 6-10 range covers the efficient hypertrophy zone; closer to 6 on harder lifts, closer to 10 on bench/rows.",
    "form_cues": [
      "Pause briefly at the stretch",
      "Keep tension throughout \u2014 don't rest at the top",
      "Every rep looks the same"
    ],
    "muscles_primary": "Movement-dependent",
    "muscles_secondary": "Stabilizers"
  },
  {
    "goal": "hypertrophy",
    "experience": "intermediate",
    "exercise_type": "compound_dumbbell_machine",
    "rest_seconds": 90,
    "rest_rationale": "Hits the meta-analysis sweet spot for hypertrophy; long enough to maintain reps, short enough to drive metabolic stress.",
    "sets": 4,
    "reps": "8-12",
    "sets_reps_rationale": "Classic hypertrophy range; four sets drive volume.",
    "form_cues": [
      "Full stretch at the bottom, hard squeeze at the top",
      "Shoulder blades stay set",
      "Don't chase weight \u2014 chase reps"
    ],
    "muscles_primary": "Movement-dependent",
    "muscles_secondary": "Stabilizers"
  },
  {
    "goal": "hypertrophy",
    "experience": "intermediate",
    "exercise_type": "isolation",
    "rest_seconds": 60,
    "rest_rationale": "Short rest = metabolic stress for small muscle groups, where this stimulus matters more.",
    "sets": 4,
    "reps": "10-15",
    "sets_reps_rationale": "Higher reps on isolations because loads can't be heavy enough to drive growth in low-rep ranges.",
    "form_cues": [
      "Stretch the target hard",
      "Stop the rep at point of tension, not the joint",
      "Last 2 reps should burn"
    ],
    "muscles_primary": "Movement-dependent",
    "muscles_secondary": "Stabilizers"
  },
  {
    "goal": "hypertrophy",
    "experience": "intermediate",
    "exercise_type": "bodyweight",
    "rest_seconds": 90,
    "rest_rationale": "Allows higher-rep sets to be completed close to failure without form breakdown.",
    "sets": 4,
    "reps": "8-15 (depends on progression)",
    "sets_reps_rationale": "As progressions get harder, rep ceilings drop. Train within 1-3 reps of failure.",
    "form_cues": [
      "Pause for a beat at the hardest point",
      "If reps come easy, harder variation next time",
      "Elbows/knees move on a track"
    ],
    "muscles_primary": "Movement-dependent",
    "muscles_secondary": "Core stabilizers"
  },
  {
    "goal": "hypertrophy",
    "experience": "intermediate",
    "exercise_type": "cardio",
    "rest_seconds": 60,
    "rest_rationale": "Keeps interval work productive without sapping recovery from lifting.",
    "sets": 4,
    "reps": "10-15 min Zone 2 + 4 x 30s moderate intervals",
    "sets_reps_rationale": "Light conditioning supports cardiovascular health and recovery without crashing into interference zone.",
    "form_cues": [
      "Effort 6/10 max",
      "Fully recover between intervals",
      "Keep this easy \u2014 it's not the main event"
    ],
    "muscles_primary": "Cardiovascular",
    "muscles_secondary": "\u2014"
  },
  {
    "goal": "hypertrophy",
    "experience": "advanced",
    "exercise_type": "compound_barbell",
    "rest_seconds": 180,
    "rest_rationale": "Advanced lifters move heavier loads in hypertrophy range and need more recovery to keep volume load high (Longo: longer rest preserves growth-driving volume).",
    "sets": 5,
    "reps": "6-8 (heavy hypertrophy) or 4x8-12 (volume work)",
    "sets_reps_rationale": "Advanced trainees need more volume per session and per week (12-20 weekly sets per muscle). Slightly lower reps with more sets keeps intensity high.",
    "form_cues": [
      "Same path, same tempo, every rep",
      "Pause at the stretch for a full beat",
      "Leave 1 rep in reserve until the last set"
    ],
    "muscles_primary": "Movement-dependent",
    "muscles_secondary": "Stabilizers"
  },
  {
    "goal": "hypertrophy",
    "experience": "advanced",
    "exercise_type": "compound_dumbbell_machine",
    "rest_seconds": 120,
    "rest_rationale": "Long enough to maintain rep performance across all working sets.",
    "sets": 4,
    "reps": "8-12",
    "sets_reps_rationale": "Standard hypertrophy prescription with enough volume to drive advanced gains.",
    "form_cues": [
      "Punish the eccentric \u2014 3 seconds down",
      "Stretch under load",
      "Stop just before you can't squeeze the top"
    ],
    "muscles_primary": "Movement-dependent",
    "muscles_secondary": "Stabilizers"
  },
  {
    "goal": "hypertrophy",
    "experience": "advanced",
    "exercise_type": "isolation",
    "rest_seconds": 75,
    "rest_rationale": "Drives metabolic stress while still allowing 4 quality sets.",
    "sets": 4,
    "reps": "12-15 (sometimes higher for stubborn muscles)",
    "sets_reps_rationale": "Advanced lifters need more isolation volume to grow lagging muscles. Higher reps + intensification techniques (drop sets, myo-reps on final set) work well.",
    "form_cues": [
      "Stretch is where growth happens \u2014 load it",
      "No rest at lockout or bottom",
      "Final 3 reps should be a fight"
    ],
    "muscles_primary": "Movement-dependent",
    "muscles_secondary": "Stabilizers"
  },
  {
    "goal": "hypertrophy",
    "experience": "advanced",
    "exercise_type": "bodyweight",
    "rest_seconds": 120,
    "rest_rationale": "Advanced bodyweight work (front lever progressions, planche prep, weighted dips) needs longer recovery despite 'just bodyweight.'",
    "sets": 4,
    "reps": "6-12 (variation-dependent)",
    "sets_reps_rationale": "Train each variation in its appropriate strength/hypertrophy zone.",
    "form_cues": [
      "Full body engaged \u2014 no leaks",
      "Control to a hard stop",
      "Last 1-2 reps should feel earned"
    ],
    "muscles_primary": "Movement-dependent",
    "muscles_secondary": "Core stabilizers"
  },
  {
    "goal": "hypertrophy",
    "experience": "advanced",
    "exercise_type": "cardio",
    "rest_seconds": 60,
    "rest_rationale": "Minimal cardio to avoid interference; enough for cardiovascular health and recovery.",
    "sets": 5,
    "reps": "20-25 min Zone 2 2x/week OR 5 x 1 min moderate / 1 min easy",
    "sets_reps_rationale": "Supports recovery and capillarization without taxing recovery from lifting.",
    "form_cues": [
      "Should feel restorative, not draining",
      "Nose breathing if you can",
      "This is for recovery \u2014 keep it honest"
    ],
    "muscles_primary": "Cardiovascular",
    "muscles_secondary": "\u2014"
  },
  {
    "goal": "recomp",
    "experience": "beginner",
    "exercise_type": "compound_barbell",
    "rest_seconds": 90,
    "rest_rationale": "Recomp leans into hypertrophy training with a slight density bump. Shorter rest = more work per minute = more caloric expenditure while building muscle.",
    "sets": 3,
    "reps": "6-10",
    "sets_reps_rationale": "Lower end (6) for harder lifts; higher (10) for upper-body pushes. Builds strength while supporting muscle retention in a deficit.",
    "form_cues": [
      "Move with control \u2014 speed comes with confidence",
      "Every rep teaches the next one",
      "Stop when form breaks, not when you're tired"
    ],
    "muscles_primary": "Movement-dependent",
    "muscles_secondary": "Stabilizers"
  },
  {
    "goal": "recomp",
    "experience": "beginner",
    "exercise_type": "compound_dumbbell_machine",
    "rest_seconds": 75,
    "rest_rationale": "Quicker turnaround keeps HR elevated \u2014 hybrid resistance-conditioning effect.",
    "sets": 3,
    "reps": "8-12",
    "sets_reps_rationale": "Hypertrophy-friendly rep range with enough volume to preserve muscle in a deficit.",
    "form_cues": [
      "Don't rush to the next set, but don't sit either",
      "Control the negative \u2014 that's where the work is",
      "Match left to right"
    ],
    "muscles_primary": "Movement-dependent",
    "muscles_secondary": "Stabilizers"
  },
  {
    "goal": "recomp",
    "experience": "beginner",
    "exercise_type": "isolation",
    "rest_seconds": 60,
    "rest_rationale": "Small muscles + short rest = high metabolic stress and time efficiency.",
    "sets": 3,
    "reps": "10-12",
    "sets_reps_rationale": "Standard isolation prescription; close to failure on the last set.",
    "form_cues": [
      "Squeeze hard at the top",
      "No swinging \u2014 your torso is locked",
      "Feel the burn build over the set"
    ],
    "muscles_primary": "Movement-dependent",
    "muscles_secondary": "Stabilizers"
  },
  {
    "goal": "recomp",
    "experience": "beginner",
    "exercise_type": "bodyweight",
    "rest_seconds": 60,
    "rest_rationale": "Short enough to drive conditioning effect, long enough to keep form clean.",
    "sets": 3,
    "reps": "10-15",
    "sets_reps_rationale": "Higher reps work because most beginner bodyweight movements are sub-failure.",
    "form_cues": [
      "Quality over quantity \u2014 full reps only",
      "Control the eccentric",
      "Stop 1 rep before failure"
    ],
    "muscles_primary": "Movement-dependent",
    "muscles_secondary": "Core stabilizers"
  },
  {
    "goal": "recomp",
    "experience": "beginner",
    "exercise_type": "cardio",
    "rest_seconds": 60,
    "rest_rationale": "Recomp cardio is a hybrid \u2014 hard enough to spend calories, recovered enough to repeat.",
    "sets": 6,
    "reps": "15-20 min Zone 2 OR 6 x 30s on / 60s off (bike, row, hill walk)",
    "sets_reps_rationale": "Burns calories while remaining recoverable alongside lifting.",
    "form_cues": [
      "Push work intervals, don't grind them",
      "Fully recover before the next round",
      "Stay smooth \u2014 no flailing"
    ],
    "muscles_primary": "Cardiovascular",
    "muscles_secondary": "Lower body"
  },
  {
    "goal": "recomp",
    "experience": "intermediate",
    "exercise_type": "compound_barbell",
    "rest_seconds": 120,
    "rest_rationale": "Loads heavier than beginner but rest still slightly compressed vs. pure hypertrophy to maintain density.",
    "sets": 4,
    "reps": "5-8",
    "sets_reps_rationale": "Lower-rep main lifts protect muscle and strength in a deficit; high intensity preserves lean mass.",
    "form_cues": [
      "Treat every set like a working set",
      "Bar speed stays the same on every rep",
      "Brace, lift, breathe, reset"
    ],
    "muscles_primary": "Movement-dependent",
    "muscles_secondary": "Stabilizers"
  },
  {
    "goal": "recomp",
    "experience": "intermediate",
    "exercise_type": "compound_dumbbell_machine",
    "rest_seconds": 75,
    "rest_rationale": "Keeps session metabolically active while allowing rep targets to be hit.",
    "sets": 4,
    "reps": "8-10",
    "sets_reps_rationale": "Volume sweet spot for body composition; preserves muscle, drives caloric cost.",
    "form_cues": [
      "Lower under control \u2014 count to 2 going down",
      "Stretch then squeeze",
      "No body English"
    ],
    "muscles_primary": "Movement-dependent",
    "muscles_secondary": "Stabilizers"
  },
  {
    "goal": "recomp",
    "experience": "intermediate",
    "exercise_type": "isolation",
    "rest_seconds": 45,
    "rest_rationale": "Short rest = high density; pairs well with supersets.",
    "sets": 3,
    "reps": "10-15",
    "sets_reps_rationale": "Higher rep ranges drive metabolic stress and burn glycogen \u2014 supportive of fat loss without compromising muscle.",
    "form_cues": [
      "Pump up the muscle \u2014 feel it fill",
      "No joint-locking rests",
      "Controlled tempo \u2014 both directions"
    ],
    "muscles_primary": "Movement-dependent",
    "muscles_secondary": "Stabilizers"
  },
  {
    "goal": "recomp",
    "experience": "intermediate",
    "exercise_type": "bodyweight",
    "rest_seconds": 60,
    "rest_rationale": "Short rest builds the metabolic side; works for circuit-style bodyweight programming.",
    "sets": 4,
    "reps": "10-20 (or AMRAP for last set)",
    "sets_reps_rationale": "Bodyweight in circuit format covers both muscle and conditioning goals.",
    "form_cues": [
      "Pace yourself \u2014 no max-effort first set",
      "Form is the limiter, not breath",
      "Leave a couple in reserve until the last set"
    ],
    "muscles_primary": "Movement-dependent",
    "muscles_secondary": "Core stabilizers"
  },
  {
    "goal": "recomp",
    "experience": "intermediate",
    "exercise_type": "cardio",
    "rest_seconds": 60,
    "rest_rationale": "Mix of modalities. Intervals need rest for high effort; steady-state stays continuous.",
    "sets": 8,
    "reps": "2x/week: 25 min Zone 2 + 1x/week: 8 x 40s on / 60s off",
    "sets_reps_rationale": "Mix of energy systems supports both fat loss and recovery.",
    "form_cues": [
      "Intervals: hard but repeatable \u2014 not max effort",
      "Zone 2: you can talk in full sentences",
      "Consistency beats intensity"
    ],
    "muscles_primary": "Cardiovascular",
    "muscles_secondary": "Full body (modality-dependent)"
  },
  {
    "goal": "recomp",
    "experience": "advanced",
    "exercise_type": "compound_barbell",
    "rest_seconds": 120,
    "rest_rationale": "Heavy loads in a deficit need adequate recovery to maintain performance; too-short rest costs muscle.",
    "sets": 4,
    "reps": "4-6",
    "sets_reps_rationale": "Strength-leaning rep range protects muscle most aggressively in a deficit. Heavy compound work is the #1 muscle-retention tool.",
    "form_cues": [
      "Treat every rep as max-quality",
      "Intent stays high even when energy doesn't",
      "Save the volume for accessories"
    ],
    "muscles_primary": "Movement-dependent",
    "muscles_secondary": "Stabilizers"
  },
  {
    "goal": "recomp",
    "experience": "advanced",
    "exercise_type": "compound_dumbbell_machine",
    "rest_seconds": 90,
    "rest_rationale": "Standard hypertrophy rest \u2014 performance matters more than density on these.",
    "sets": 4,
    "reps": "8-10",
    "sets_reps_rationale": "Hypertrophy range with enough volume to support muscle in a deficit.",
    "form_cues": [
      "Maximize stretch on every rep",
      "Don't shortcut the bottom",
      "Leave 1 rep in reserve"
    ],
    "muscles_primary": "Movement-dependent",
    "muscles_secondary": "Stabilizers"
  },
  {
    "goal": "recomp",
    "experience": "advanced",
    "exercise_type": "isolation",
    "rest_seconds": 60,
    "rest_rationale": "High density on small muscles serves metabolic and muscle-retention goals simultaneously.",
    "sets": 4,
    "reps": "12-15",
    "sets_reps_rationale": "Pump-style work feels good in a deficit and adds volume without overtaxing recovery.",
    "form_cues": [
      "Constant tension \u2014 never lock out",
      "The burn is the goal",
      "Drop the weight when form goes"
    ],
    "muscles_primary": "Movement-dependent",
    "muscles_secondary": "Stabilizers"
  },
  {
    "goal": "recomp",
    "experience": "advanced",
    "exercise_type": "bodyweight",
    "rest_seconds": 60,
    "rest_rationale": "Adequate for advanced progressions while keeping density high.",
    "sets": 4,
    "reps": "8-15 (skill work) or rep-out style for finishers",
    "sets_reps_rationale": "Mix of skill-based strength + metabolic finishers.",
    "form_cues": [
      "Strict reps \u2014 no kips, no swings",
      "Full ROM, every rep",
      "Stop before form decays"
    ],
    "muscles_primary": "Movement-dependent",
    "muscles_secondary": "Core stabilizers"
  },
  {
    "goal": "recomp",
    "experience": "advanced",
    "exercise_type": "cardio",
    "rest_seconds": 60,
    "rest_rationale": "Two distinct conditioning roles \u2014 calorie expenditure and recovery support.",
    "sets": 10,
    "reps": "3x/week: 25-35 min Zone 2 + 1x/week: 10 x 30s on / 60s off",
    "sets_reps_rationale": "Higher cardio frequency than other goals because the deficit needs supporting; advanced trainees can handle it.",
    "form_cues": [
      "Keep intervals smooth \u2014 power output, not flailing",
      "Zone 2 stays Zone 2 \u2014 resist the urge to push",
      "Every session has a purpose"
    ],
    "muscles_primary": "Cardiovascular",
    "muscles_secondary": "Full body"
  },
  {
    "goal": "fat_loss",
    "experience": "beginner",
    "exercise_type": "compound_barbell",
    "rest_seconds": 75,
    "rest_rationale": "Short rest drives density and total caloric expenditure; beginners can use it because loads are submaximal.",
    "sets": 3,
    "reps": "10-12",
    "sets_reps_rationale": "Higher reps + short rest = circuit-adjacent training that retains some muscle while burning calories.",
    "form_cues": [
      "Form first \u2014 speed second",
      "Breathe in pattern with the reps",
      "If form breaks, end the set"
    ],
    "muscles_primary": "Movement-dependent",
    "muscles_secondary": "Stabilizers"
  },
  {
    "goal": "fat_loss",
    "experience": "beginner",
    "exercise_type": "compound_dumbbell_machine",
    "rest_seconds": 60,
    "rest_rationale": "Even shorter rest is viable on machines and DBs because of lower stabilization demand; keeps HR elevated.",
    "sets": 3,
    "reps": "12-15",
    "sets_reps_rationale": "High-rep moderate-load work is the most accessible style for a beginner chasing fat loss.",
    "form_cues": [
      "Steady tempo \u2014 count it out",
      "Don't race \u2014 control the weight",
      "The burn is the work"
    ],
    "muscles_primary": "Movement-dependent",
    "muscles_secondary": "Stabilizers"
  },
  {
    "goal": "fat_loss",
    "experience": "beginner",
    "exercise_type": "isolation",
    "rest_seconds": 45,
    "rest_rationale": "Drives metabolic stress; high turnover supports total work volume.",
    "sets": 3,
    "reps": "12-15",
    "sets_reps_rationale": "Higher rep zone matches the lighter loads suitable for fat-loss circuits.",
    "form_cues": [
      "Full ROM every rep",
      "The moment form breaks, stop",
      "Feel the working muscle the whole way"
    ],
    "muscles_primary": "Movement-dependent",
    "muscles_secondary": "Stabilizers"
  },
  {
    "goal": "fat_loss",
    "experience": "beginner",
    "exercise_type": "bodyweight",
    "rest_seconds": 45,
    "rest_rationale": "Short rest is the engine of fat-loss bodyweight work; goal is sustained elevated HR.",
    "sets": 3,
    "reps": "12-20 (or AMRAP in 30s windows)",
    "sets_reps_rationale": "Bodyweight + short rest is essentially conditioning with a resistance flavor.",
    "form_cues": [
      "Pace it \u2014 first round should match the last",
      "Land softly on jumps",
      "Lock out fully, don't shortcut"
    ],
    "muscles_primary": "Movement-dependent",
    "muscles_secondary": "Core stabilizers"
  },
  {
    "goal": "fat_loss",
    "experience": "beginner",
    "exercise_type": "cardio",
    "rest_seconds": 60,
    "rest_rationale": "Fat loss needs total caloric expenditure; Zone 2 and intervals both contribute.",
    "sets": 8,
    "reps": "3x/week: 25-35 min Zone 2 + 1x/week: 8 x 30s on / 60s off",
    "sets_reps_rationale": "Volume comes from frequency. Beginners build a base with mostly easy work + one harder session.",
    "form_cues": [
      "Easy days stay easy \u2014 slower than you think",
      "Hard days are hard but repeatable",
      "Consistency over intensity"
    ],
    "muscles_primary": "Cardiovascular",
    "muscles_secondary": "Lower body"
  },
  {
    "goal": "fat_loss",
    "experience": "intermediate",
    "exercise_type": "compound_barbell",
    "rest_seconds": 60,
    "rest_rationale": "Short rest + heavier loads keeps both muscle stimulus and conditioning effect high.",
    "sets": 4,
    "reps": "8-10",
    "sets_reps_rationale": "Enough volume to retain muscle, enough density to drive expenditure.",
    "form_cues": [
      "Don't sacrifice form for density",
      "If you can't repeat the rep, rest longer",
      "Brace hard on every rep"
    ],
    "muscles_primary": "Movement-dependent",
    "muscles_secondary": "Stabilizers"
  },
  {
    "goal": "fat_loss",
    "experience": "intermediate",
    "exercise_type": "compound_dumbbell_machine",
    "rest_seconds": 45,
    "rest_rationale": "Density-focused; intermediates can handle the cardiovascular demand.",
    "sets": 4,
    "reps": "10-12",
    "sets_reps_rationale": "Solid hypertrophy stimulus served at fat-loss density.",
    "form_cues": [
      "Pump up the muscle \u2014 feel it fill",
      "Don't bounce out of the bottom",
      "Controlled negative every single rep"
    ],
    "muscles_primary": "Movement-dependent",
    "muscles_secondary": "Stabilizers"
  },
  {
    "goal": "fat_loss",
    "experience": "intermediate",
    "exercise_type": "isolation",
    "rest_seconds": 30,
    "rest_rationale": "Maximum density; pairs perfectly with supersets.",
    "sets": 3,
    "reps": "15-20",
    "sets_reps_rationale": "High reps drive metabolic stress and caloric burn; load is low enough to recover fast.",
    "form_cues": [
      "Burn it out \u2014 let the muscle scream",
      "No swinging",
      "Drop weight if form breaks"
    ],
    "muscles_primary": "Movement-dependent",
    "muscles_secondary": "Stabilizers"
  },
  {
    "goal": "fat_loss",
    "experience": "intermediate",
    "exercise_type": "bodyweight",
    "rest_seconds": 30,
    "rest_rationale": "Circuit-style is ideal for fat loss; rest is built into the rotation.",
    "sets": 4,
    "reps": "4 rounds x 5 movements x 30-45s each, 30s rest",
    "sets_reps_rationale": "Combines strength stimulus with sustained HR; pure metabolic work.",
    "form_cues": [
      "Pace yourself \u2014 pick a tempo you can hold",
      "Form before speed \u2014 every time",
      "Breathe on rhythm with reps"
    ],
    "muscles_primary": "Full body",
    "muscles_secondary": "Cardiovascular"
  },
  {
    "goal": "fat_loss",
    "experience": "intermediate",
    "exercise_type": "cardio",
    "rest_seconds": 60,
    "rest_rationale": "Rest matches the energy system targeted; intervals high, steady-state none.",
    "sets": 10,
    "reps": "3x/week Zone 2 (30-40 min) + 2x/week intervals (10 x 30s on / 60s off OR 5 x 2 min hard / 2 min easy)",
    "sets_reps_rationale": "Volume drives fat loss more than intensity; distribution maximizes weekly caloric burn.",
    "form_cues": [
      "Intervals: smooth power, not flailing",
      "Zone 2: nose breathing or conversational",
      "Track minutes, not feelings"
    ],
    "muscles_primary": "Cardiovascular",
    "muscles_secondary": "Full body"
  },
  {
    "goal": "fat_loss",
    "experience": "advanced",
    "exercise_type": "compound_barbell",
    "rest_seconds": 60,
    "rest_rationale": "Advanced lifters can train with high density and heavy loads; short rest keeps conditioning effect alive while moving real weight.",
    "sets": 4,
    "reps": "6-8",
    "sets_reps_rationale": "Heavy enough to fully protect muscle, dense enough to torch calories.",
    "form_cues": [
      "Quality over quantity \u2014 never sacrifice form",
      "Every rep stays sharp",
      "If bar speed drops, rest longer next set"
    ],
    "muscles_primary": "Movement-dependent",
    "muscles_secondary": "Stabilizers"
  },
  {
    "goal": "fat_loss",
    "experience": "advanced",
    "exercise_type": "compound_dumbbell_machine",
    "rest_seconds": 45,
    "rest_rationale": "Density-driven; advanced lifters have the work capacity to sustain it.",
    "sets": 4,
    "reps": "8-12",
    "sets_reps_rationale": "Strong hypertrophy stimulus that also drives expenditure.",
    "form_cues": [
      "Stretch hard, squeeze hard, repeat",
      "No rest at the top",
      "Control eccentric \u2014 that's free volume"
    ],
    "muscles_primary": "Movement-dependent",
    "muscles_secondary": "Stabilizers"
  },
  {
    "goal": "fat_loss",
    "experience": "advanced",
    "exercise_type": "isolation",
    "rest_seconds": 30,
    "rest_rationale": "Drives metabolic stress and total work; ideal for paired sets.",
    "sets": 4,
    "reps": "12-20",
    "sets_reps_rationale": "High-volume pump work that supports muscle retention in a deeper deficit.",
    "form_cues": [
      "Get a pump \u2014 that's the goal",
      "Perfect form even when burning",
      "Drop weight before form breaks"
    ],
    "muscles_primary": "Movement-dependent",
    "muscles_secondary": "Stabilizers"
  },
  {
    "goal": "fat_loss",
    "experience": "advanced",
    "exercise_type": "bodyweight",
    "rest_seconds": 30,
    "rest_rationale": "Density is the point; advanced trainees can sustain it.",
    "sets": 5,
    "reps": "5 rounds x 5 movements x 30-60s each, 20s rest",
    "sets_reps_rationale": "Pure metabolic conditioning that doubles as muscular endurance work.",
    "form_cues": [
      "Pace round 1 like round 5",
      "Land soft, push hard",
      "Form is the speed limit"
    ],
    "muscles_primary": "Full body",
    "muscles_secondary": "Cardiovascular"
  },
  {
    "goal": "fat_loss",
    "experience": "advanced",
    "exercise_type": "cardio",
    "rest_seconds": 60,
    "rest_rationale": "Highest cardio volume of any goal; rest matches the modality.",
    "sets": 12,
    "reps": "3x/week Zone 2 (40-60 min) + 2x/week intervals (12 x 30s on / 30s off OR 4 x 4 min hard / 3 min easy)",
    "sets_reps_rationale": "Maximum sustainable cardio volume to drive deficit without crushing recovery.",
    "form_cues": [
      "Zone 2 stays Zone 2 \u2014 protect it",
      "Intervals stay smooth \u2014 power, not panic",
      "Consistency over heroism"
    ],
    "muscles_primary": "Cardiovascular",
    "muscles_secondary": "Full body"
  },
  {
    "goal": "endurance",
    "experience": "beginner",
    "exercise_type": "compound_barbell",
    "rest_seconds": 60,
    "rest_rationale": "Endurance-focused resistance training uses incomplete recovery to drive lactate clearance and fatigue resistance.",
    "sets": 2,
    "reps": "15",
    "sets_reps_rationale": "ACSM endurance prescription \u2014 submaximal loads, high reps, low set count for beginners.",
    "form_cues": [
      "Steady tempo \u2014 count it out",
      "Breathe on rhythm",
      "Form is the limiter, not lungs"
    ],
    "muscles_primary": "Movement-dependent",
    "muscles_secondary": "Stabilizers"
  },
  {
    "goal": "endurance",
    "experience": "beginner",
    "exercise_type": "compound_dumbbell_machine",
    "rest_seconds": 45,
    "rest_rationale": "Short rest pushes local muscular endurance capacity.",
    "sets": 3,
    "reps": "15-20",
    "sets_reps_rationale": "Higher-rep submaximal work matches the endurance adaptation.",
    "form_cues": [
      "Pace \u2014 don't blow up in the first 5 reps",
      "Match left and right side",
      "Control both directions"
    ],
    "muscles_primary": "Movement-dependent",
    "muscles_secondary": "Stabilizers"
  },
  {
    "goal": "endurance",
    "experience": "beginner",
    "exercise_type": "isolation",
    "rest_seconds": 30,
    "rest_rationale": "Maximum density to drive fatigue resistance in small muscles.",
    "sets": 2,
    "reps": "15-20",
    "sets_reps_rationale": "Light loads, high reps; isolation is the lowest priority in an endurance program.",
    "form_cues": [
      "Push through the burn",
      "Smooth tempo \u2014 no jerks",
      "Stop only when form breaks"
    ],
    "muscles_primary": "Movement-dependent",
    "muscles_secondary": "Stabilizers"
  },
  {
    "goal": "endurance",
    "experience": "beginner",
    "exercise_type": "bodyweight",
    "rest_seconds": 45,
    "rest_rationale": "Bodyweight + endurance = the natural pairing; short rest is the whole point.",
    "sets": 3,
    "reps": "20+ (or AMRAP in 45s)",
    "sets_reps_rationale": "Bodyweight endurance work develops muscular stamina cleanly.",
    "form_cues": [
      "Pace from rep 1",
      "Breathe steadily \u2014 don't hold it",
      "Full ROM every rep"
    ],
    "muscles_primary": "Movement-dependent",
    "muscles_secondary": "Core stabilizers"
  },
  {
    "goal": "endurance",
    "experience": "beginner",
    "exercise_type": "cardio",
    "rest_seconds": 60,
    "rest_rationale": "Endurance is the main goal \u2014 cardio is the headline event.",
    "sets": 5,
    "reps": "4-5x/week: 30-45 min easy continuous + 1x/week: 5 x 3 min hard / 2 min easy",
    "sets_reps_rationale": "Build the aerobic base with mostly easy volume + one harder session weekly.",
    "form_cues": [
      "Most days easy \u2014 most really means most",
      "Tempo work feels hard but sustainable",
      "Track time on feet, not pace"
    ],
    "muscles_primary": "Cardiovascular",
    "muscles_secondary": "Lower body"
  },
  {
    "goal": "endurance",
    "experience": "intermediate",
    "exercise_type": "compound_barbell",
    "rest_seconds": 45,
    "rest_rationale": "Even shorter rest as work capacity improves; this is true endurance training, not strength.",
    "sets": 3,
    "reps": "15-20",
    "sets_reps_rationale": "Adds volume to drive fatigue resistance; suitable for intermediates.",
    "form_cues": [
      "Pace it from rep 1",
      "Form quality holds even at high reps",
      "Breathe through the work"
    ],
    "muscles_primary": "Movement-dependent",
    "muscles_secondary": "Stabilizers"
  },
  {
    "goal": "endurance",
    "experience": "intermediate",
    "exercise_type": "compound_dumbbell_machine",
    "rest_seconds": 30,
    "rest_rationale": "Drives local muscular endurance \u2014 the whole point of the protocol.",
    "sets": 3,
    "reps": "20",
    "sets_reps_rationale": "Higher volume of high-rep work builds endurance capacity.",
    "form_cues": [
      "Smooth rhythm, every rep the same",
      "No rest at lockout \u2014 keep moving",
      "Burn through \u2014 that's adaptation happening"
    ],
    "muscles_primary": "Movement-dependent",
    "muscles_secondary": "Stabilizers"
  },
  {
    "goal": "endurance",
    "experience": "intermediate",
    "exercise_type": "isolation",
    "rest_seconds": 30,
    "rest_rationale": "Maximum density for endurance adaptation.",
    "sets": 3,
    "reps": "20+",
    "sets_reps_rationale": "High-volume metabolic work for small muscles.",
    "form_cues": [
      "Burn = adaptation \u2014 embrace it",
      "Form first, reps second",
      "Consistent tempo throughout"
    ],
    "muscles_primary": "Movement-dependent",
    "muscles_secondary": "Stabilizers"
  },
  {
    "goal": "endurance",
    "experience": "intermediate",
    "exercise_type": "bodyweight",
    "rest_seconds": 30,
    "rest_rationale": "Endurance + bodyweight = circuit-style is optimal.",
    "sets": 4,
    "reps": "3-4 rounds x 6 movements x 45s each, 15s rest",
    "sets_reps_rationale": "Pure fatigue resistance training.",
    "form_cues": [
      "Set a sustainable pace \u2014 round 1 = round 4",
      "Breathing dictates the work, not pride",
      "Form holds or the set ends"
    ],
    "muscles_primary": "Full body",
    "muscles_secondary": "Cardiovascular"
  },
  {
    "goal": "endurance",
    "experience": "intermediate",
    "exercise_type": "cardio",
    "rest_seconds": 90,
    "rest_rationale": "Aerobic base development requires sustained continuous work; intervals get longer rest.",
    "sets": 6,
    "reps": "4-5x/week: 45-75 min Zone 2 + 1-2x/week: 6 x 3 min hard / 2 min easy OR 20 min tempo at threshold",
    "sets_reps_rationale": "80/20 polarized model \u2014 most easy, some hard.",
    "form_cues": [
      "Discipline the easy days \u2014 they're the work",
      "Tempo: comfortably hard, repeatable",
      "Consistency builds the engine"
    ],
    "muscles_primary": "Cardiovascular",
    "muscles_secondary": "Lower body"
  },
  {
    "goal": "endurance",
    "experience": "advanced",
    "exercise_type": "compound_barbell",
    "rest_seconds": 45,
    "rest_rationale": "Advanced endurance athletes train resistance work with high density to preserve strength under fatigue.",
    "sets": 3,
    "reps": "20-25",
    "sets_reps_rationale": "High-volume submaximal load to develop fatigue resistance without sacrificing form.",
    "form_cues": [
      "Mental pacing matters as much as physical",
      "First rep = last rep in form",
      "Breath cadence stays even"
    ],
    "muscles_primary": "Movement-dependent",
    "muscles_secondary": "Stabilizers"
  },
  {
    "goal": "endurance",
    "experience": "advanced",
    "exercise_type": "compound_dumbbell_machine",
    "rest_seconds": 30,
    "rest_rationale": "Sustained density; endurance-focused.",
    "sets": 4,
    "reps": "20-25",
    "sets_reps_rationale": "High volume, high density \u2014 local muscular endurance.",
    "form_cues": [
      "Find the cadence and hold it",
      "Let the breath set the tempo",
      "No compromise on ROM"
    ],
    "muscles_primary": "Movement-dependent",
    "muscles_secondary": "Stabilizers"
  },
  {
    "goal": "endurance",
    "experience": "advanced",
    "exercise_type": "isolation",
    "rest_seconds": 20,
    "rest_rationale": "Driving lactate tolerance; small muscles can take it.",
    "sets": 4,
    "reps": "25+",
    "sets_reps_rationale": "Maximum endurance stimulus for small muscle groups.",
    "form_cues": [
      "Burn means you're in the right zone",
      "Form before reps every time",
      "Smooth, steady, and unrelenting"
    ],
    "muscles_primary": "Movement-dependent",
    "muscles_secondary": "Stabilizers"
  },
  {
    "goal": "endurance",
    "experience": "advanced",
    "exercise_type": "bodyweight",
    "rest_seconds": 20,
    "rest_rationale": "Continuous-effort training for advanced endurance.",
    "sets": 5,
    "reps": "4-5 rounds x 6-8 movements x 45-60s each, 15s rest",
    "sets_reps_rationale": "Maximum density circuit work \u2014 muscular and cardiovascular endurance at once.",
    "form_cues": [
      "Strategy first \u2014 pacing wins this",
      "Your form is your fitness \u2014 protect it",
      "Breath and movement on the same rhythm"
    ],
    "muscles_primary": "Full body",
    "muscles_secondary": "Cardiovascular"
  },
  {
    "goal": "endurance",
    "experience": "advanced",
    "exercise_type": "cardio",
    "rest_seconds": 180,
    "rest_rationale": "Cardio is the main goal \u2014 high volume, varied intensities, rest matches interval type.",
    "sets": 8,
    "reps": "5-6x/week: 60-90 min Zone 2 + 2x/week: threshold work (3 x 10 min at threshold / 3 min easy OR 8 x 1km at VO2 pace)",
    "sets_reps_rationale": "Polarized model with significant volume; suitable for advanced endurance trainees.",
    "form_cues": [
      "The engine is built in Zone 2 \u2014 protect those hours",
      "Tempo work is repeatable, not survival",
      "Long sessions teach the mind as much as the body"
    ],
    "muscles_primary": "Cardiovascular",
    "muscles_secondary": "Lower body (modality-dependent)"
  }
];

/**
 * Look up programming parameters for a given (goal, experience, exercise_type) combination.
 * Goal mapping: muscle_gain → hypertrophy
 */
export function lookupMatrix(
  goal: string,
  experience: string,
  exerciseType: ExerciseType
): MatrixCell | undefined {
  // Map muscle_gain → hypertrophy
  const normalizedGoal = goal === "muscle_gain" ? "hypertrophy" : goal;
  return WORKOUT_MATRIX.find(
    (c) =>
      c.goal === normalizedGoal &&
      c.experience === experience &&
      c.exercise_type === exerciseType
  );
}

/**
 * Parse a rep string from the matrix into a [min, max] tuple.
 * Examples: "6-8" → [6,8], "5" → [5,5], "3 x 5" → [5,5]
 */
export function parseRepRange(reps: string): [number, number] {
  const match = reps.match(/(\d+)[-–](\d+)/);
  if (match) return [parseInt(match[1]), parseInt(match[2])];
  const single = reps.match(/^(\d+)$/);
  if (single) { const n = parseInt(single[1]); return [n, n]; }
  // fallback for complex strings like "15-20 min steady-state..."
  const fallback = reps.match(/(\d+)/);
  const n = fallback ? parseInt(fallback[1]) : 10;
  return [n, n];
}