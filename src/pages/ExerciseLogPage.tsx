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
  Clock, Flame, Check,
} from "lucide-react";
import { hapticLight, hapticSuccess } from "@/lib/haptics";
import { getLocalDateString } from "@/lib/dateUtils";
import { toast } from "sonner";

// ─── Static Exercise Lists ────────────────────────────────────────────────────

const CARDIO_EXERCISES = [
  "9Round", "Adaptive Motion Trainer", "Aerobics (general)", "Aerobics (high impact)",
  "Aerobics (low impact)", "Aerobics step", "Apple Health App Workout", "Aquathlon",
  "Aqua jogging", "Archery", "Badminton", "Basketball", "Battle Rope",
  "Bike (stationary)", "Bike (outdoor)", "Box jumps", "Boxing",
  "Circuit training", "Climbing (rock/wall)", "Cross-country skiing",
  "CrossFit", "Cycling (general)", "Dance (aerobic)", "Elliptical",
  "Football", "Golf", "Hiking", "HIIT", "Ice skating", "Jump rope",
  "Kayaking", "Kickboxing", "Lap swimming", "Martial arts",
  "Mountain biking", "Pilates", "Racquetball", "Rowing (machine)",
  "Rowing (outdoor)", "Running (outdoor)", "Running (treadmill)",
  "Soccer", "Spinning", "Squash", "Stair climber", "Swimming (general)",
  "Tennis", "Treadmill (walk)", "Treadmill (run)", "Volleyball",
  "Walking (outdoor)", "Walking (treadmill)", "Water polo", "Yoga", "Zumba",
].sort();

const STRENGTH_EXERCISES = [
  "Abdominal Crunches", "Abdominal Leg Raise", "Abdominal Twist Seated Machine",
  "Arnold Press", "Back Butterfly", "Back Extension", "Bar Dip",
  "Barbell Hip Thrust", "Barbell Military Press", "Barbell Row Bent-over",
  "Bench (Chest) Press Machine", "Bench Press (Barbell)", "Bench Press (Dumbbell)",
  "Bicep Curl (Barbell)", "Bicep Curl (Cable)", "Bicep Curl (Dumbbell)",
  "Box Squat", "Bulgarian Split Squat", "Cable Chest Fly", "Cable Lateral Raise",
  "Cable Tricep Pushdown", "Calf Raise (Machine)", "Calf Raise (Standing)",
  "Chest Fly (Dumbbell)", "Chest Press (Machine)", "Chin-Up", "Close-Grip Bench Press",
  "Conventional Deadlift", "Decline Bench Press", "Face Pull",
  "Front Squat", "Glute Bridge", "Goblet Squat", "Good Morning",
  "Hack Squat (Machine)", "Hammer Curl", "Hip Abduction Machine",
  "Hip Adduction Machine", "Hip Thrust", "Incline Bench Press",
  "Incline Dumbbell Curl", "Incline Dumbbell Press", "Kettlebell Swing",
  "Lat Pulldown", "Lateral Raise (Dumbbell)", "Lateral Raise (Cable)",
  "Leg Curl (Lying)", "Leg Curl (Seated)", "Leg Extension",
  "Leg Press", "Lunge (Barbell)", "Lunge (Dumbbell)", "Military Press",
  "One-Arm Dumbbell Row", "Overhead Press (Barbell)", "Overhead Press (Dumbbell)",
  "Pec Deck", "Plank", "Pull-Up", "Push-Up",
  "Rear Delt Fly (Cable)", "Rear Delt Fly (Dumbbell)",
  "Romanian Deadlift", "Seated Cable Row", "Seated Row (Machine)",
  "Shoulder Press (Machine)", "Skull Crusher", "Smith Machine Squat",
  "Squat (Barbell)", "Squat (Bodyweight)", "Sumo Deadlift",
  "T-Bar Row", "Tricep Dip", "Tricep Extension (Cable)",
  "Tricep Extension (Overhead)", "Tricep Pushdown", "Upright Row",
  "Wide-Grip Pull-Up", "Wrist Curl",
].sort();

type Category = "Cardio" | "Strength";
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

  const searchRef = useRef<HTMLInputElement>(null);

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
  const allExercises = category === "Cardio" ? CARDIO_EXERCISES : STRENGTH_EXERCISES;

  // Custom exercises for current category (all custom mixed in)
  const customNames = useMemo(() => (customExercises || []).map((e: any) => e.name), [customExercises]);

  // History tab: unique names from recent logs for this category
  const historyNames = useMemo(() => {
    if (!recentLogs) return [];
    const isCardio = category === "Cardio";
    const seen = new Set<string>();
    const names: string[] = [];
    for (const log of recentLogs) {
      const isThisCategory = isCardio ? log.category === "cardio" : log.category === "strength";
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
        <div className="flex gap-2 p-1 rounded-xl" style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}>
          {(["Cardio", "Strength"] as Category[]).map((cat) => (
            <button
              key={cat}
              onClick={() => { hapticLight(); setCategory(cat); setTab("All Exercises"); setSearch(""); }}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all"
              style={
                category === cat
                  ? { background: "#52B788", color: "#0a1a0a" }
                  : { color: "rgba(255,255,255,0.5)" }
              }
            >
              {cat === "Cardio" ? <Heart className="w-4 h-4" /> : <Dumbbell className="w-4 h-4" />}
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
        {tab === "All Exercises" && todayLoggedNames.size > 0 && !search && (
          <div className="mb-3 rounded-xl px-4 py-3" style={{ background: "rgba(82,183,136,0.08)", border: "1px solid rgba(82,183,136,0.2)" }}>
            <div className="text-xs font-semibold mb-1" style={{ color: "#52B788" }}>Logged today</div>
            <div className="text-xs text-muted-foreground">{[...todayLoggedNames].join(" · ")}</div>
          </div>
        )}

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
      {selectedExercise && category === "Strength" && (
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
    </div>
  );
}
