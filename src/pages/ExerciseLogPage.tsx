/**
 * ExerciseLogPage — MFP-style exercise browser & logger
 *
 * Layout:
 *   Header + date
 *   Category selector: Cardio | Strength
 *   Search bar
 *   Tabs: History | My Exercises | All Exercises
 *   Exercise list (scrollable, alphabetical)
 *   "Create a New Exercise" sticky bottom button
 *
 * On exercise tap → quick-log sheet (duration/calories for Cardio, sets/reps/weight for Strength)
 */
import { useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import {
  ChevronLeft, Search, X, Plus, Dumbbell, Heart,
  Clock, Flame, Check, Crown, PersonStanding,
} from "lucide-react";
import { hapticLight, hapticSuccess } from "@/lib/haptics";
import { getLocalDateString } from "@/lib/dateUtils";
import { toast } from "sonner";
import { usePremiumAccess } from "@/components/PremiumGate";
import { PaywallModal } from "@/components/PaywallModal";

// ─── Static Exercise Lists ────────────────────────────────────────────────────

const CARDIO_EXERCISES = [
  "9Round", "Adaptive Motion Trainer", "Aerobics (general)", "Aerobics (high impact)",
  "Aerobics (low impact)", "Aerobics step", "Apple Health App Workout", "Aquathlon",
  "Aqua jogging", "Archery", "Badminton", "Baseball", "Basketball", "Battle Rope",
  "Bike (stationary)", "Bike (outdoor)", "Box jumps", "Boxing",
  "Burpees", "Circuit training", "Climbing (rock/wall)", "Cross-country skiing",
  "CrossFit", "Cycling (general)", "Dance (aerobic)", "Elliptical",
  "Football", "Golf", "Handball", "Hiking", "HIIT", "Ice skating",
  "Inline skating", "Interval training", "Jump rope", "Kayaking", "Kickboxing",
  "Lacrosse", "Lap swimming", "Martial arts", "Mountain biking", "Paddleboarding",
  "Pickleball", "Pilates", "Racquetball", "Rowing (machine)", "Rowing (outdoor)",
  "Rugby", "Running (outdoor)", "Running (treadmill)", "Skiing (downhill)",
  "Snowboarding", "Soccer", "Softball", "Spinning", "Squash", "Stair climber",
  "Step aerobics", "Surfing", "Swimming (backstroke)", "Swimming (breaststroke)",
  "Swimming (butterfly)", "Swimming (freestyle)", "Swimming (general)",
  "Tennis", "Track & field", "Treadmill (incline walk)", "Treadmill (walk)",
  "Treadmill (run)", "Triathlon", "Ultimate frisbee", "Volleyball",
  "Walking (outdoor)", "Walking (treadmill)", "Water aerobics", "Water polo",
  "Yoga", "Yoga (hot)", "Yoga (power)", "Yoga (restorative)", "Zumba",
].sort();

const STRENGTH_EXERCISES = [
  "Abdominal Crunches", "Abdominal Leg Raise", "Abdominal Twist Seated Machine",
  "Arnold Press", "Back Butterfly", "Back Extension", "Band Pull-Apart",
  "Bar Dip", "Barbell Hip Thrust", "Barbell Military Press", "Barbell Row Bent-over",
  "Bench (Chest) Press Machine", "Bench Press (Barbell)", "Bench Press (Dumbbell)",
  "Bicep Curl (Barbell)", "Bicep Curl (Cable)", "Bicep Curl (Dumbbell)",
  "Bicep Curl (EZ Bar)", "Box Squat", "Bulgarian Split Squat",
  "Cable Chest Fly", "Cable Crunch", "Cable Kickback", "Cable Lateral Raise",
  "Cable Tricep Pushdown", "Calf Raise (Machine)", "Calf Raise (Standing)",
  "Chest Fly (Dumbbell)", "Chest Press (Machine)",
  "Close-Grip Bench Press", "Concentration Curl", "Conventional Deadlift",
  "Decline Bench Press", "Decline Crunch", "Face Pull",
  "Floor Press (Dumbbell)", "Front Raise (Dumbbell)", "Front Squat",
  "Goblet Squat", "Good Morning",
  "Hack Squat (Machine)", "Hammer Curl",
  "Hip Abduction Machine", "Hip Adduction Machine", "Hip Thrust",
  "Incline Bench Press", "Incline Dumbbell Curl", "Incline Dumbbell Press",
  "Incline Fly", "Jefferson Curl", "Kettlebell Clean",
  "Kettlebell Front Squat", "Kettlebell Goblet Squat", "Kettlebell Press",
  "Kettlebell Row", "Kettlebell Swing", "Kettlebell Turkish Get-Up",
  "Landmine Press", "Landmine Row", "Lat Pulldown",
  "Lat Pulldown (Close Grip)", "Lat Pulldown (Wide Grip)",
  "Lateral Raise (Dumbbell)", "Lateral Raise (Cable)", "Leg Curl (Lying)",
  "Leg Curl (Seated)", "Leg Extension", "Leg Press",
  "Low Cable Row", "Lunge (Barbell)", "Lunge (Dumbbell)",
  "Lunge (Lateral)", "Lunge (Reverse)", "Lunge (Walking)",
  "Military Press", "One-Arm Dumbbell Row",
  "Overhead Press (Barbell)", "Overhead Press (Dumbbell)",
  "Overhead Tricep Extension", "Pec Deck", "Pendlay Row",
  "Preacher Curl",
  "Rear Delt Fly (Cable)", "Rear Delt Fly (Dumbbell)",
  "Romanian Deadlift", "Rope Crunch", "Russian Twist",
  "Seated Cable Row", "Seated Row (Machine)", "Shoulder Press (Machine)",
  "Single-Leg Deadlift", "Single-Leg Press", "Skull Crusher",
  "Smith Machine Bench Press", "Smith Machine Squat",
  "Squat (Barbell)", "Squat (Smith Machine)",
  "Step-Up (Dumbbell)", "Straight-Leg Deadlift", "Sumo Deadlift",
  "T-Bar Row", "Trap Bar Deadlift", "Tricep Dip",
  "Tricep Extension (Cable)", "Tricep Extension (Overhead)",
  "Tricep Pushdown", "Upright Row", "Wide-Grip Pull-Up",
  "Wide-Grip Seated Row", "Wrist Curl", "Wrist Extension", "Zercher Squat",
].sort();

const CALISTHENICS_EXERCISES = [
  // Push movements
  "Push-Up", "Push-Up (Wide Grip)", "Push-Up (Close Grip / Diamond)",
  "Push-Up (Decline)", "Push-Up (Incline)", "Push-Up (Archer)",
  "Push-Up (Clapping)", "Push-Up (One-Arm)", "Push-Up (Pike)",
  "Push-Up (Pseudo Planche)", "Push-Up (Straddle Planche)",
  "Push-Up (T-Rotation)", "Handstand Push-Up", "Handstand Push-Up (Wall-Assisted)",
  "Pike Push-Up", "Planche Push-Up", "Dip (Parallel Bars)", "Korean Dip",
  // Pull movements
  "Pull-Up", "Pull-Up (Wide Grip)", "Pull-Up (Close Grip)",
  "Pull-Up (Commando)", "Pull-Up (L-Sit)", "Pull-Up (Chest-to-Bar)",
  "Chin-Up", "Chin-Up (Close Grip)", "Australian Pull-Up (Rows)",
  "Bar Muscle-Up", "Ring Muscle-Up", "Ring Pull-Up",
  "Ring Row", "Ring Push-Up", "Typewriter Pull-Up",
  "One-Arm Pull-Up (Assisted)", "Archer Pull-Up",
  // Core
  "Plank", "Plank (Side)", "Plank (RKC)", "Hollow Body Hold",
  "Hollow Body Rock", "Arch Hold", "L-Sit", "L-Sit (Parallel Bars)",
  "V-Sit", "Dragon Flag", "Dragon Flag (Negative)",
  "Hanging Knee Raise", "Hanging Leg Raise", "Toes-to-Bar",
  "Ab Wheel Rollout", "Ab Wheel Rollout (Standing)", "Windshield Wiper",
  "Planche Lean", "Front Lever", "Front Lever Row", "Front Lever (Tuck)",
  // Legs & jumps
  "Squat (Bodyweight)", "Squat Jump", "Bulgarian Split Squat (Bodyweight)",
  "Lunge", "Reverse Lunge", "Lateral Lunge", "Step-Up",
  "Pistol Squat", "Pistol Squat (Assisted)", "Shrimp Squat",
  "Nordic Hamstring Curl", "Glute Bridge", "Glute Bridge (Single-Leg)",
  "Hip Thrust (Bodyweight)", "Calf Raise (Bodyweight)", "Box Jump",
  "Broad Jump", "Burpee", "Tuck Jump",
  // Skill & static holds
  "Handstand (Wall-Assisted)", "Freestanding Handstand",
  "Handstand Walk", "Elbow Lever", "Planche (Tuck)", "Planche (Advanced Tuck)",
  "Planche (Straddle)", "Full Planche", "Back Lever", "Back Lever (Tuck)",
  "Human Flag", "Human Flag (Tuck)", "Crow Pose", "Headstand",
  // Flow & mobility
  "Bear Crawl", "Crab Walk", "Inchworm", "World's Greatest Stretch",
  "Deep Squat Hold", "Hip 90/90 Stretch", "Thoracic Bridge", "Spiderman Crawl",
].sort();

type Category = "Cardio" | "Strength" | "Calisthenics";
type ExerciseTab = "History" | "My Exercises" | "All Exercises";

// ─── Quick-Log Sheet ──────────────────────────────────────────────────────────

function CardioLogSheet({
  exercise,
  date,
  onClose,
  onLogged,
}: {
  exercise: string;
  date: string;
  onClose: () => void;
  onLogged: () => void;
}) {
  const [minutes, setMinutes] = useState("30");
  const [calories, setCalories] = useState("200");
  const logCardio = useMutation(api.exercises.logCardio);
  const [saving, setSaving] = useState(false);

  const handleLog = async () => {
    if (!minutes || !calories) return;
    setSaving(true);
    try {
      await logCardio({
        date,
        exerciseName: exercise,
        minutes: Number(minutes),
        caloriesBurned: Number(calories),
      });
      hapticSuccess();
      toast.success(`${exercise} logged!`);
      onLogged();
    } catch {
      toast.error("Failed to log exercise");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <div
        className="w-full rounded-t-3xl p-6 pb-10 animate-slide-up"
        style={{ background: "var(--surface-card)", border: "1px solid var(--border)", maxWidth: 480, margin: "0 auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold">{exercise}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-5">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Duration (min)</label>
            <div className="flex items-center gap-2 px-3 py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)" }}>
              <Clock className="w-4 h-4 flex-shrink-0" style={{ color: "#52B788" }} />
              <input
                type="number"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value)}
                className="bg-transparent text-sm w-full outline-none font-medium"
                min="1"
                placeholder="30"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Calories burned</label>
            <div className="flex items-center gap-2 px-3 py-3 rounded-xl" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)" }}>
              <Flame className="w-4 h-4 flex-shrink-0" style={{ color: "#FF6B6B" }} />
              <input
                type="number"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                className="bg-transparent text-sm w-full outline-none font-medium"
                min="0"
                placeholder="200"
              />
            </div>
          </div>
        </div>

        <button
          onClick={handleLog}
          disabled={saving}
          className="w-full py-3.5 rounded-2xl text-sm font-bold disabled:opacity-60"
          style={{ background: "#52B788", color: "#0a1a0a" }}
        >
          {saving ? "Logging…" : "Log Exercise"}
        </button>
      </div>
    </div>
  );
}

function StrengthLogSheet({
  exercise,
  date,
  onClose,
  onLogged,
}: {
  exercise: string;
  date: string;
  onClose: () => void;
  onLogged: () => void;
}) {
  const [sets, setSets] = useState([
    { reps: "10", weight: "135" },
  ]);
  const logStrength = useMutation(api.exercises.logStrengthExercise);
  const [saving, setSaving] = useState(false);

  const addSet = () => {
    hapticLight();
    const last = sets[sets.length - 1];
    setSets([...sets, { reps: last.reps, weight: last.weight }]);
  };

  const removeSet = (i: number) => {
    if (sets.length === 1) return;
    setSets(sets.filter((_, idx) => idx !== i));
  };

  const handleLog = async () => {
    setSaving(true);
    try {
      await logStrength({
        date,
        exerciseName: exercise,
        sets: sets.map((s, i) => ({
          setNumber: i + 1,
          reps: Number(s.reps) || undefined,
          weight: Number(s.weight) || undefined,
          completed: true,
        })),
      });
      hapticSuccess();
      toast.success(`${exercise} logged!`);
      onLogged();
    } catch {
      toast.error("Failed to log exercise");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <div
        className="w-full rounded-t-3xl p-6 pb-10"
        style={{ background: "var(--surface-card)", border: "1px solid var(--border)", maxWidth: 480, margin: "0 auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold">{exercise}</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>

        {/* Column headers */}
        <div className="grid grid-cols-[32px_1fr_1fr_32px] gap-2 mb-2 px-1">
          <div className="text-xs text-muted-foreground text-center">Set</div>
          <div className="text-xs text-muted-foreground text-center">Weight (lbs)</div>
          <div className="text-xs text-muted-foreground text-center">Reps</div>
          <div />
        </div>

        <div className="space-y-2 mb-4 max-h-52 overflow-y-auto">
          {sets.map((set, i) => (
            <div key={i} className="grid grid-cols-[32px_1fr_1fr_32px] gap-2 items-center">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                style={{ background: "rgba(82,183,136,0.15)", color: "#52B788" }}
              >
                {i + 1}
              </div>
              <input
                type="number"
                value={set.weight}
                onChange={(e) => setSets(sets.map((s, idx) => idx === i ? { ...s, weight: e.target.value } : s))}
                className="text-center text-sm font-medium py-2.5 rounded-xl outline-none w-full"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)" }}
                placeholder="lbs"
              />
              <input
                type="number"
                value={set.reps}
                onChange={(e) => setSets(sets.map((s, idx) => idx === i ? { ...s, reps: e.target.value } : s))}
                className="text-center text-sm font-medium py-2.5 rounded-xl outline-none w-full"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)" }}
                placeholder="reps"
              />
              <button onClick={() => removeSet(i)} className="flex items-center justify-center w-7 h-7 rounded-full" style={{ color: "rgba(255,255,255,0.3)" }}>
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={addSet}
          className="w-full py-2.5 rounded-xl text-sm font-medium mb-4 flex items-center justify-center gap-2"
          style={{ background: "rgba(82,183,136,0.1)", border: "1px solid rgba(82,183,136,0.25)", color: "#52B788" }}
        >
          <Plus className="w-4 h-4" />
          Add Set
        </button>

        <button
          onClick={handleLog}
          disabled={saving}
          className="w-full py-3.5 rounded-2xl text-sm font-bold disabled:opacity-60"
          style={{ background: "#52B788", color: "#0a1a0a" }}
        >
          {saving ? "Logging…" : `Log ${sets.length} Set${sets.length !== 1 ? "s" : ""}`}
        </button>
      </div>
    </div>
  );
}

// ─── Create New Exercise Sheet ────────────────────────────────────────────────

function CreateExerciseSheet({
  category,
  onClose,
  onCreated,
}: {
  category: Category;
  onClose: () => void;
  onCreated: (name: string) => void;
}) {
  const [name, setName] = useState("");
  const [muscleGroup, setMuscleGroup] = useState("");
  const createExercise = useMutation(api.exercises.createCustomExercise);
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await createExercise({
        name: name.trim(),
        muscleGroups: muscleGroup ? [muscleGroup] : undefined,
      });
      hapticSuccess();
      toast.success("Exercise created!");
      onCreated(name.trim());
    } catch {
      toast.error("Failed to create exercise");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <div
        className="w-full rounded-t-3xl p-6 pb-10"
        style={{ background: "var(--surface-card)", border: "1px solid var(--border)", maxWidth: 480, margin: "0 auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold">Create Exercise</h3>
          <button onClick={onClose}><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>

        <div className="mb-4">
          <label className="text-xs text-muted-foreground mb-1.5 block">Exercise name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)" }}
            placeholder={`e.g. My ${category} Workout`}
            autoFocus
          />
        </div>

        <div className="mb-5">
          <label className="text-xs text-muted-foreground mb-1.5 block">Muscle group (optional)</label>
          <input
            type="text"
            value={muscleGroup}
            onChange={(e) => setMuscleGroup(e.target.value)}
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)" }}
            placeholder="e.g. Chest, Back, Legs…"
          />
        </div>

        <button
          onClick={handleCreate}
          disabled={!name.trim() || saving}
          className="w-full py-3.5 rounded-2xl text-sm font-bold disabled:opacity-40"
          style={{ background: "#52B788", color: "#0a1a0a" }}
        >
          {saving ? "Creating…" : "Create Exercise"}
        </button>
      </div>
    </div>
  );
}

// ─── Exercise Row ─────────────────────────────────────────────────────────────

function ExerciseRow({
  name,
  subtitle,
  onTap,
  logged,
}: {
  name: string;
  subtitle?: string;
  onTap: () => void;
  logged?: boolean;
}) {
  return (
    <button
      onClick={() => { hapticLight(); onTap(); }}
      className="w-full flex items-center justify-between py-3.5 border-b last:border-b-0 text-left transition-opacity active:opacity-70"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="flex-1 min-w-0 pr-2">
        <div className="text-sm font-medium truncate">{name}</div>
        {subtitle && <div className="text-xs text-muted-foreground">{subtitle}</div>}
      </div>
      {logged ? (
        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(82,183,136,0.2)" }}>
          <Check className="w-4 h-4" style={{ color: "#52B788" }} />
        </div>
      ) : (
        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)" }}>
          <Plus className="w-3.5 h-3.5" style={{ color: "#52B788" }} />
        </div>
      )}
    </button>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ExerciseLogPage() {
  const navigate = useNavigate();
  const today = getLocalDateString();

  const [category, setCategory] = useState<Category>("Cardio");
  const [tab, setTab] = useState<ExerciseTab>("All Exercises");
  const [search, setSearch] = useState("");
  const [selectedExercise, setSelectedExercise] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [loggedToday, setLoggedToday] = useState<Set<string>>(new Set());
  const [showExerciseUpsell, setShowExerciseUpsell] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const isPremium = usePremiumAccess();

  const cardioLogs = useQuery(api.exercises.getCardioLogs, { date: today });
  const exerciseLogs = useQuery(api.exercises.getExerciseLogs, { date: today });
  const recentLogs = useQuery(api.exercises.getRecentExerciseLogs);
  const customExercises = useQuery(api.exercises.getCustomExercises);

  // Determine what's logged today for checkmarks
  const todayLoggedNames = useMemo(() => {
    const names = new Set<string>();
    (cardioLogs || []).forEach((l: any) => names.add(l.exerciseName));
    (exerciseLogs || []).forEach((l: any) => names.add(l.exerciseName));
    return names;
  }, [cardioLogs, exerciseLogs, loggedToday]);

  // Full exercise list for current category
  const allExercises =
    category === "Cardio" ? CARDIO_EXERCISES :
    category === "Calisthenics" ? CALISTHENICS_EXERCISES :
    STRENGTH_EXERCISES;

  // Custom exercises for current category (all custom mixed in)
  const customNames = useMemo(() => (customExercises || []).map((e: any) => e.name), [customExercises]);

  // History tab: unique names from recent logs for this category
  const historyNames = useMemo(() => {
    if (!recentLogs) return [];
    const isCardio = category === "Cardio";
    const seen = new Set<string>();
    const names: string[] = [];
    for (const log of recentLogs) {
      const isThisCategory = isCardio
        ? log.category === "cardio"
        : log.category === "strength";
      if (isThisCategory && !seen.has(log.exerciseName)) {
        seen.add(log.exerciseName);
        names.push(log.exerciseName);
      }
    }
    return names;
  }, [recentLogs, category]);

  // Which list to show
  const baseList = useMemo(() => {
    if (tab === "History") return historyNames;
    if (tab === "My Exercises") return customNames;
    return allExercises;
  }, [tab, historyNames, customNames, allExercises]);

  // Filter by search
  const filteredList = useMemo(() => {
    if (!search.trim()) return baseList;
    const q = search.toLowerCase();
    return baseList.filter((n) => n.toLowerCase().includes(q));
  }, [baseList, search]);

  const handleExerciseLogged = () => {
    setSelectedExercise(null);
    setLoggedToday(prev => new Set([...prev, selectedExercise || ""]));
  };

  const handleCustomCreated = (name: string) => {
    setShowCreate(false);
    setSelectedExercise(name);
  };

  return (
    <div className="flex flex-col h-screen max-w-lg mx-auto" style={{ background: "var(--background)" }}>
      {/* Header */}
      <div className="flex items-center px-4 pt-4 pb-3 flex-shrink-0">
        <button onClick={() => navigate(-1)} className="mr-3">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-semibold flex-1">Log Exercise</h1>
        <div className="text-xs text-muted-foreground">
          {new Date(today + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
        </div>
      </div>

      {/* Category Selector */}
      <div className="px-4 mb-3 flex-shrink-0">
        <div className="flex gap-1.5 p-1 rounded-xl" style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}>
          {(["Cardio", "Strength", "Calisthenics"] as Category[]).map((cat) => (
            <button
              key={cat}
              onClick={() => { hapticLight(); setCategory(cat); setTab("All Exercises"); setSearch(""); }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold transition-all"
              style={
                category === cat
                  ? { background: "#52B788", color: "#0a1a0a" }
                  : { color: "rgba(255,255,255,0.5)" }
              }
            >
              {cat === "Cardio" ? <Heart className="w-3.5 h-3.5" /> : cat === "Strength" ? <Dumbbell className="w-3.5 h-3.5" /> : <PersonStanding className="w-3.5 h-3.5" />}
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Search bar */}
      <div className="px-4 mb-3 flex-shrink-0">
        <div
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
          style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}
          onClick={() => searchRef.current?.focus()}
        >
          <Search className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search for an exercise"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {search && (
            <button onClick={() => setSearch("")}>
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 flex-shrink-0">
        <div className="flex border-b" style={{ borderColor: "var(--border)" }}>
          {(["History", "My Exercises", "All Exercises"] as ExerciseTab[]).map((t) => (
            <button
              key={t}
              onClick={() => { hapticLight(); setTab(t); setSearch(""); }}
              className="flex-1 py-2.5 text-xs font-semibold transition-all"
              style={{
                color: tab === t ? "#52B788" : "rgba(255,255,255,0.4)",
                borderBottom: tab === t ? "2px solid #52B788" : "2px solid transparent",
                marginBottom: "-1px",
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Exercise List */}
      <div className="flex-1 overflow-y-auto px-4 pt-2 pb-24">
        {/* Today's logged summary (shown at top of All Exercises) */}
        {tab === "All Exercises" && todayLoggedNames.size > 0 && !search && (() => {
          const totalCalBurned = [
            ...(cardioLogs || []).map((l: any) => l.caloriesBurned ?? 0),
            ...(exerciseLogs || []).map((l: any) => l.caloriesBurned ?? 0),
          ].reduce((a, b) => a + b, 0);
          return (
            <>
              <div className="mb-3 rounded-xl px-4 py-3" style={{ background: "rgba(82,183,136,0.08)", border: "1px solid rgba(82,183,136,0.2)" }}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold mb-1" style={{ color: "#52B788" }}>Logged today</div>
                    <div className="text-xs text-muted-foreground">
                      {[...todayLoggedNames].join(" · ")}
                      {totalCalBurned > 0 && <span className="ml-2 font-semibold" style={{ color: "#52B788" }}>🔥 {totalCalBurned} cal burned</span>}
                    </div>
                  </div>
                </div>
              </div>
              {/* Contextual upsell: add burned cals to meal plan budget (free users only) */}
              {!isPremium && totalCalBurned > 0 && (
                <button
                  onClick={() => { hapticLight(); setShowExerciseUpsell(true); }}
                  className="w-full mb-3 rounded-xl px-4 py-3 text-left flex items-center gap-3 transition-all active:opacity-70"
                  style={{ background: "rgba(229,180,84,0.08)", border: "1px solid rgba(229,180,84,0.25)" }}
                >
                  <Crown className="w-4 h-4 flex-shrink-0" style={{ color: "#E5B454" }} />
                  <div>
                    <p className="text-xs font-semibold" style={{ color: "#E5B454" }}>Add {totalCalBurned} burned calories to your meal plan</p>
                    <p className="text-[10px] mt-0.5 text-muted-foreground">Premium: burned calories automatically increase your daily food budget. Tap to unlock.</p>
                  </div>
                </button>
              )}
            </>
          );
        })()}

        {filteredList.length === 0 ? (
          <div className="text-center py-16">
            {tab === "History" && (
              <>
                <div className="text-3xl mb-3">📋</div>
                <div className="text-sm font-semibold mb-1">No history yet</div>
                <div className="text-xs text-muted-foreground">Exercises you log will appear here for quick access.</div>
              </>
            )}
            {tab === "My Exercises" && (
              <>
                <div className="text-3xl mb-3">💪</div>
                <div className="text-sm font-semibold mb-1">No custom exercises yet</div>
                <div className="text-xs text-muted-foreground leading-relaxed px-6">
                  Create custom exercises with your own names, muscle groups, and notes. They'll show up here.
                </div>
                <button
                  onClick={() => { hapticLight(); setShowCreate(true); }}
                  className="mt-4 text-sm font-semibold px-4 py-2 rounded-xl"
                  style={{ background: "rgba(82,183,136,0.12)", color: "#52B788", border: "1px solid rgba(82,183,136,0.25)" }}
                >
                  Create your first exercise
                </button>
              </>
            )}
            {tab === "All Exercises" && search && (
              <>
                <div className="text-3xl mb-3">🔍</div>
                <div className="text-sm font-semibold mb-1">No results for "{search}"</div>
                <div className="text-xs text-muted-foreground">Try a different name or create a custom exercise.</div>
              </>
            )}
          </div>
        ) : (
          filteredList.map((name) => (
            <ExerciseRow
              key={name}
              name={name}
              logged={todayLoggedNames.has(name)}
              onTap={() => setSelectedExercise(name)}
            />
          ))
        )}
      </div>

      {/* Sticky bottom: Create a New Exercise */}
      <div
        className="fixed bottom-0 left-0 right-0 px-4 pb-8 pt-3 max-w-lg mx-auto"
        style={{ background: "linear-gradient(to top, var(--background) 70%, transparent)" }}
      >
        <button
          onClick={() => { hapticLight(); setShowCreate(true); }}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold transition-opacity active:opacity-70"
          style={{ background: "rgba(82,183,136,0.12)", border: "1px solid rgba(82,183,136,0.3)", color: "#52B788" }}
        >
          <Plus className="w-4 h-4" />
          Create a New Exercise
        </button>
      </div>

      {/* Quick-log sheets */}
      {selectedExercise && category === "Cardio" && (
        <CardioLogSheet
          exercise={selectedExercise}
          date={today}
          onClose={() => setSelectedExercise(null)}
          onLogged={handleExerciseLogged}
        />
      )}
      {selectedExercise && (category === "Strength" || category === "Calisthenics") && (
        <StrengthLogSheet
          exercise={selectedExercise}
          date={today}
          onClose={() => setSelectedExercise(null)}
          onLogged={handleExerciseLogged}
        />
      )}
      {showCreate && (
        <CreateExerciseSheet
          category={category}
          onClose={() => setShowCreate(false)}
          onCreated={handleCustomCreated}
        />
      )}
      <PaywallModal open={showExerciseUpsell} onClose={() => setShowExerciseUpsell(false)} feature="general" />
    </div>
  );
}
