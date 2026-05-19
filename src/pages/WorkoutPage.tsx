/**
 * WorkoutPage — Premium feature
 * Shows workout plan, active workout tracker with RIR logging + rest timer,
 * deload banners, and Push Harder nudges.
 */
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import {
  Dumbbell, Timer, ChevronDown, ChevronUp, RefreshCw,
  CheckCircle2, Circle, RotateCcw, Play, Square, Heart, X, Zap, Clock, Target, Info
} from "lucide-react";
import { hapticSuccess } from "@/lib/haptics";
import { usePremiumAccess } from "@/components/PremiumGate";
import { RehabModal } from "@/components/RehabModal";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ExerciseInPlan {
  exerciseId: string;
  name: string;
  sets: number;
  repRange: [number, number];
  restSeconds: number;
  rirTarget: number;
  notes?: string;
  formCues?: string[];
  primaryMuscles?: string[];
  secondaryMuscles?: string[];
  exerciseType?: string;
  rationale?: string;
  instructions?: string;
  how_to?: string;
  muscle_target?: string;
}

interface WorkoutDay {
  dayName: string;
  focus: string;
  exercises: ExerciseInPlan[];
  estimatedDurationMinutes: number;
}

// ─── Rest Timer ───────────────────────────────────────────────────────────────
function RestTimer({ seconds, onDone }: { seconds: number; onDone: () => void }) {
  const [remaining, setRemaining] = useState(seconds);

  useEffect(() => {
    if (remaining <= 0) { onDone(); return; }
    const id = setTimeout(() => setRemaining(r => r - 1), 1000);
    return () => clearTimeout(id);
  }, [remaining, onDone]);

  const pct = ((seconds - remaining) / seconds) * 100;
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  return (
    <div className="flex flex-col items-center gap-3 py-4">
      <div className="relative w-20 h-20">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="34" fill="none" stroke="var(--border)" strokeWidth="6" />
          <circle
            cx="40" cy="40" r="34" fill="none"
            stroke="var(--plate-green-accent)" strokeWidth="6"
            strokeDasharray={`${2 * Math.PI * 34}`}
            strokeDashoffset={`${2 * Math.PI * 34 * (1 - pct / 100)}`}
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold">{mins}:{String(secs).padStart(2, "0")}</span>
        </div>
      </div>
      <button
        onClick={onDone}
        className="text-xs text-muted-foreground underline"
      >
        Skip rest
      </button>
    </div>
  );
}

// ─── RIR Selector ─────────────────────────────────────────────────────────────
function RirSelector({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  const options = [0, 1, 2, 3, 4, 5];
  return (
    <div className="flex gap-1 items-center">
      <span className="text-xs text-muted-foreground mr-1">RIR:</span>
      {options.map(n => (
        <button
          key={n}
          onClick={() => onChange(n)}
          className="w-7 h-7 rounded-lg text-xs font-medium border transition-all"
          style={{
            background: value === n ? "var(--plate-green-accent)" : "var(--card)",
            borderColor: value === n ? "var(--plate-green-accent)" : "var(--border)",
            color: value === n ? "#0a1a0a" : undefined,
          }}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

// ─── WorkoutSetRow ────────────────────────────────────────────────────────────
function WorkoutSetRow({
  setNum, repRange, onComplete, onDraftChange, draft,
}: {
  setNum: number;
  repRange: [number, number];
  onComplete: (reps: number, weight: number, rir: number) => void;
  onDraftChange: (weight: number | undefined, reps: number, rir: number | null, done: boolean) => void;
  draft?: { weight?: number; reps?: number; rir?: number; completed?: boolean } | null;
}) {
  const [reps, setReps] = useState(draft?.reps ?? repRange[0]);
  const [weight, setWeight] = useState(draft?.weight ?? 0);
  const [rir, setRir] = useState<number | null>(draft?.rir ?? null);
  const [done, setDone] = useState(draft?.completed ?? false);

  // If draft loads after mount (async), sync state once
  const [synced, setSynced] = useState(false);
  useEffect(() => {
    if (draft && !synced) {
      if (draft.reps !== undefined) setReps(draft.reps);
      if (draft.weight !== undefined) setWeight(draft.weight);
      if (draft.rir !== undefined) setRir(draft.rir);
      if (draft.completed !== undefined) setDone(draft.completed);
      setSynced(true);
    }
  }, [draft, synced]);

  const handleWeightChange = (v: number) => {
    setWeight(v);
    onDraftChange(v || undefined, reps, rir, done);
  };
  const handleRepsChange = (v: number) => {
    setReps(v);
    onDraftChange(weight || undefined, v, rir, done);
  };
  const handleRirChange = (v: number | null) => {
    setRir(v);
    onDraftChange(weight || undefined, reps, v, done);
  };

  const complete = () => {
    if (rir === null) { toast.error("Log your RIR (reps in reserve)"); return; }
    hapticSuccess();
    setDone(true);
    onComplete(reps, weight, rir);
    onDraftChange(weight || undefined, reps, rir, true);
  };

  return (
    <div className={`flex items-center gap-2 py-2 border-b border-border/40 last:border-0 transition-opacity ${done ? "opacity-50" : ""}`}>
      <span className="text-xs font-mono w-5 text-muted-foreground">{setNum}</span>
      <div className="flex gap-1 flex-1">
        <input
          type="number"
          value={weight || ""}
          onChange={e => handleWeightChange(Number(e.target.value))}
          placeholder="lbs"
          disabled={done}
          className="w-14 text-center rounded-lg border border-border bg-card text-sm p-1"
        />
        <input
          type="number"
          value={reps}
          onChange={e => handleRepsChange(Number(e.target.value))}
          min={1} max={50}
          disabled={done}
          className="w-12 text-center rounded-lg border border-border bg-card text-sm p-1"
        />
        <div className="flex-1">
          <RirSelector value={rir} onChange={handleRirChange} />
        </div>
      </div>
      <button
        onClick={complete}
        disabled={done}
        className="p-1 rounded-lg transition-all"
        style={{ color: done ? "var(--plate-green-accent)" : "var(--muted-foreground)" }}
      >
        {done ? <CheckCircle2 className="w-5 h-5" /> : <Circle className="w-5 h-5" />}
      </button>
    </div>
  );
}

// ─── ExerciseDetailSheet ───────────────────────────────────────────────────────
function ExerciseDetailSheet({
  exercise,
  onClose,
}: {
  exercise: ExerciseInPlan | null;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"overview" | "howto" | "muscles">("overview");
  const [showRirInfo, setShowRirInfo] = useState(false);

  if (!exercise) return null;

  const restMin = Math.floor(exercise.restSeconds / 60);
  const restSec = String(exercise.restSeconds % 60).padStart(2, "0");
  const restLabel = restMin > 0
    ? `${restMin}m${restSec !== "00" ? ` ${restSec}s` : ""}`
    : `${exercise.restSeconds}s`;

  const tabs = [
    { id: "overview" as const, label: "Overview" },
    { id: "howto" as const, label: "How To" },
    { id: "muscles" as const, label: "Muscles" },
  ];

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Sheet */}
      <div
        className="relative w-full max-w-lg rounded-t-3xl overflow-hidden"
        style={{ background: "var(--card)", boxShadow: "0 -8px 40px rgba(0,0,0,0.6)", maxHeight: "88vh", display: "flex", flexDirection: "column" }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
        </div>

        {/* Header */}
        <div className="px-5 pt-2 pb-3 shrink-0">
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-3">
              <h2 className="text-lg font-bold">{exercise.name}</h2>
              {exercise.exerciseType && (
                <span className="text-xs text-muted-foreground capitalize">{exercise.exerciseType.replace(/_/g, " ")}</span>
              )}
            </div>
            <button onClick={onClose} className="p-1.5 rounded-full bg-muted/50">
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2 mt-3">
            <div className="rounded-xl p-3 text-center" style={{ background: "var(--plate-green-deep)" }}>
              <p className="text-xs text-muted-foreground mb-0.5">Sets × Reps</p>
              <p className="text-sm font-bold" style={{ color: "var(--plate-green-accent)" }}>
                {exercise.sets} × {exercise.repRange[0]}–{exercise.repRange[1]}
              </p>
            </div>
            <div className="rounded-xl p-3 text-center" style={{ background: "var(--muted)" }}>
              <p className="text-xs text-muted-foreground mb-0.5">Rest</p>
              <p className="text-sm font-bold">{restLabel}</p>
            </div>
            {/* RIR — tappable */}
            <button
              className="rounded-xl p-3 text-center relative"
              style={{ background: showRirInfo ? "var(--plate-green-deep)" : "var(--muted)", border: showRirInfo ? "1px solid var(--plate-green-accent)" : "1px solid transparent" }}
              onClick={() => setShowRirInfo(v => !v)}
            >
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <p className="text-xs text-muted-foreground">RIR Target</p>
                <Info className="w-3 h-3 text-muted-foreground" />
              </div>
              <p className="text-sm font-bold" style={{ color: showRirInfo ? "var(--plate-green-accent)" : undefined }}>
                {exercise.rirTarget} RIR
              </p>
            </button>
          </div>

          {/* RIR explanation */}
          {showRirInfo && (
            <div className="mt-2 rounded-2xl px-4 py-3 text-sm leading-relaxed"
              style={{ background: "var(--plate-green-deep)", border: "1px solid var(--plate-green-accent)" }}>
              <p className="font-semibold mb-1" style={{ color: "var(--plate-green-accent)" }}>What is RIR?</p>
              <p className="text-muted-foreground">
                RIR stands for <strong>Reps In Reserve</strong> — how many more reps you could do before you truly cannot lift anymore.
              </p>
              <p className="text-muted-foreground mt-1.5">
                <strong style={{ color: "var(--plate-green-accent)" }}>{exercise.rirTarget} RIR</strong> means stop each set when you still have {exercise.rirTarget} rep{exercise.rirTarget !== 1 ? "s" : ""} left in the tank. This keeps you training hard without burning out or risking injury.
              </p>
              <p className="text-muted-foreground mt-1.5 text-xs">
                {exercise.rirTarget === 0 ? "⚠️ Push to failure — only do this on the last set." :
                 exercise.rirTarget === 1 ? "High intensity — stop just before failure." :
                 exercise.rirTarget <= 3 ? "Moderate intensity — challenging but controlled." :
                 "Lower intensity — good for deload or warm-up sets."}
              </p>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 mt-4 p-1 rounded-2xl" style={{ background: "var(--muted)" }}>
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                style={{
                  background: tab === t.id ? "var(--card)" : "transparent",
                  color: tab === t.id ? "var(--foreground)" : "var(--muted-foreground)",
                  boxShadow: tab === t.id ? "0 1px 4px rgba(0,0,0,0.3)" : "none",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content — scrollable */}
        <div className="overflow-y-auto px-5 pb-8" style={{ flex: 1 }}>
          {tab === "overview" && (
            <div className="space-y-4 pt-1">
              {/* Form Cues */}
              {(exercise.formCues?.length || exercise.notes) ? (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Zap className="w-3.5 h-3.5" style={{ color: "var(--plate-green-accent)" }} />
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Form Cues</p>
                  </div>
                  <div className="rounded-2xl px-4 py-3 space-y-2" style={{ background: "var(--plate-green-deep)" }}>
                    {exercise.formCues?.length ? (
                      exercise.formCues.map((cue, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm">
                          <span className="mt-0.5 text-xs font-bold shrink-0" style={{ color: "var(--plate-green-accent)" }}>•</span>
                          <span>{cue.replace(/ · /g, ". ").replace(/-/g, " ")}</span>
                        </div>
                      ))
                    ) : exercise.notes ? (
                      <p className="text-sm">{exercise.notes.replace(/ · /g, ". ").replace(/-/g, " ")}</p>
                    ) : null}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Tap <strong>How To</strong> for step-by-step instructions.</p>
              )}

              {/* Rationale */}
              {exercise.rationale && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Why This Works</p>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed rounded-2xl px-4 py-3"
                    style={{ background: "var(--muted)" }}>
                    {exercise.rationale.replace(/-/g, " ")}
                  </p>
                </div>
              )}
            </div>
          )}

          {tab === "howto" && (
            <div className="space-y-4 pt-1">
              {(exercise.how_to || exercise.instructions) ? (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Info className="w-3.5 h-3.5" style={{ color: "var(--plate-green-accent)" }} />
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">How To Do It</p>
                  </div>
                  <div className="rounded-2xl px-4 py-4" style={{ background: "var(--plate-green-deep)" }}>
                    {(exercise.how_to || exercise.instructions)!.split(/\.\s+/).filter(Boolean).map((sentence, i) => (
                      <div key={i} className="flex items-start gap-3 mb-3 last:mb-0">
                        <span className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-xs font-bold mt-0.5"
                          style={{ background: "var(--plate-green-accent)", color: "#0a1a0a" }}>
                          {i + 1}
                        </span>
                        <span className="text-sm leading-relaxed">{sentence.replace(/-/g, " ").trim()}.</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl px-4 py-6 text-center" style={{ background: "var(--muted)" }}>
                  <p className="text-sm text-muted-foreground">No step-by-step guide available for this exercise yet.</p>
                </div>
              )}

              {/* Form cues in how-to too */}
              {exercise.formCues && exercise.formCues.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Zap className="w-3.5 h-3.5" style={{ color: "var(--plate-green-accent)" }} />
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Key Cues</p>
                  </div>
                  <div className="rounded-2xl px-4 py-3 space-y-2" style={{ background: "var(--muted)" }}>
                    {exercise.formCues.map((cue, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <span className="mt-0.5 text-xs font-bold shrink-0" style={{ color: "var(--plate-green-accent)" }}>→</span>
                        <span className="text-muted-foreground">{cue.replace(/ · /g, ". ").replace(/-/g, " ")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === "muscles" && (
            <div className="space-y-4 pt-1">
              {/* Simple muscle description */}
              {exercise.muscle_target && (
                <div className="rounded-2xl px-4 py-4" style={{ background: "var(--plate-green-deep)" }}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Target className="w-3.5 h-3.5" style={{ color: "var(--plate-green-accent)" }} />
                    <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--plate-green-accent)" }}>What It Works</p>
                  </div>
                  <p className="text-sm leading-relaxed">{exercise.muscle_target}</p>
                </div>
              )}

              {exercise.primaryMuscles && exercise.primaryMuscles.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Target className="w-3.5 h-3.5" style={{ color: "var(--plate-green-accent)" }} />
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Primary Muscles</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {exercise.primaryMuscles.map((m, i) => (
                      <span key={i} className="text-sm px-3 py-1.5 rounded-full font-medium capitalize"
                        style={{ background: "var(--plate-green-deep)", color: "var(--plate-green-accent)" }}>
                        {m.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {exercise.secondaryMuscles && exercise.secondaryMuscles.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Target className="w-3.5 h-3.5 opacity-50" />
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Also Works</p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {exercise.secondaryMuscles.map((m, i) => (
                      <span key={i} className="text-sm px-3 py-1.5 rounded-full font-medium capitalize"
                        style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}>
                        {m.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {(!exercise.primaryMuscles?.length && !exercise.secondaryMuscles?.length && !exercise.muscle_target) && (
                <div className="rounded-2xl px-4 py-6 text-center" style={{ background: "var(--muted)" }}>
                  <p className="text-sm text-muted-foreground">Muscle data not available for this exercise.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── ExerciseCard ──────────────────────────────────────────────────────────────
function ExerciseCard({
  exercise,
  onSetsComplete,
  date,
  saveDraft,
  draftSets,
  onMoreInfo,
}: {
  exercise: ExerciseInPlan;
  onSetsComplete: (reps: number, weight: number, rir: number) => void;
  date: string;
  saveDraft: (args: { date: string; exerciseName: string; setNumber: number; weight?: number; reps?: number; rir?: number; completed: boolean }) => void;
  draftSets: Array<{ exerciseName: string; setNumber: number; weight?: number; reps?: number; rir?: number; completed: boolean }>;
  onMoreInfo: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [restTimer, setRestTimer] = useState<number | null>(null);

  const myDrafts = draftSets.filter(d => d.exerciseName === exercise.name);
  const completedSets = myDrafts.filter(d => d.completed).length;

  const handleSetComplete = (reps: number, weight: number, rir: number) => {
    onSetsComplete(reps, weight, rir);
    if (completedSets + 1 < exercise.sets) {
      setRestTimer(exercise.restSeconds);
    }
  };

  const handleDraftChange = (setNum: number, weight: number | undefined, reps: number, rir: number | null, done: boolean) => {
    saveDraft({
      date,
      exerciseName: exercise.name,
      setNumber: setNum,
      weight,
      reps,
      rir: rir ?? undefined,
      completed: done,
    });
  };

  return (
    <Card className="overflow-hidden mb-3">
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{exercise.name}</span>
            {completedSets >= exercise.sets && completedSets > 0 && (
              <CheckCircle2 className="w-4 h-4" style={{ color: "var(--plate-green-accent)" }} />
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {exercise.sets} × {exercise.repRange[0]}–{exercise.repRange[1]} reps
            {" "}&bull;{" "}RIR target: {exercise.rirTarget}
            {" "}&bull;{" "}{Math.round(exercise.restSeconds / 60)}:{String(exercise.restSeconds % 60).padStart(2, "0")} rest
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={e => { e.stopPropagation(); onMoreInfo(); }}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium shrink-0"
            style={{ background: "var(--plate-green-deep)", color: "var(--plate-green-accent)" }}
          >
            <Info className="w-3 h-3" />
            Info
          </button>
          <span className="text-xs text-muted-foreground font-mono">{completedSets}/{exercise.sets}</span>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4">
          {exercise.notes && (
            <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2 mb-3 space-y-1">
              {exercise.formCues?.length ? (
                exercise.formCues.map((cue: string, i: number) => (
                  <div key={i} className="flex items-start gap-1.5">
                    <span style={{ color: "var(--plate-green-accent)" }}>•</span>
                    <span>{cue.replace(/ · /g, ". ").replace(/-/g, " ")}</span>
                  </div>
                ))
              ) : (
                <p>💡 {exercise.notes.replace(/ · /g, ". ").replace(/-/g, " ")}</p>
              )}
            </div>
          )}

          {restTimer !== null ? (
            <RestTimer seconds={restTimer} onDone={() => setRestTimer(null)} />
          ) : (
            <div>
              <div className="flex text-xs text-muted-foreground mb-1 gap-2 px-6">
                <span className="w-5" />
                <span className="w-14 text-center">Weight</span>
                <span className="w-12 text-center">Reps</span>
                <span className="flex-1">RIR</span>
              </div>
              {Array.from({ length: exercise.sets }, (_, i) => {
                const d = myDrafts.find(x => x.setNumber === i + 1) ?? null;
                return (
                  <WorkoutSetRow
                    key={i}
                    setNum={i + 1}
                    repRange={exercise.repRange}
                    onComplete={handleSetComplete}
                    onDraftChange={(w, r, rir, done) => handleDraftChange(i + 1, w, r, rir, done)}
                    draft={d}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ─── WorkoutPage ──────────────────────────────────────────────────────────────
export function WorkoutPage() {
  const hasPremium = usePremiumAccess();

  if (hasPremium === false) {
    window.location.replace("/upgrade");
    return null;
  }

  return <WorkoutContent />;
}

function WorkoutContent() {
  const plan = useQuery(api.workoutGenerator.getMyWorkoutPlan);
  useQuery(api.profiles.getProfile); // preload profile data
  const generatePlan = useMutation(api.workoutGenerator.generateWorkoutPlan);
  const logSet = useMutation(api.workoutGenerator.logWorkoutSet);
  const saveDraftSet = useMutation(api.workoutGenerator.saveDraftSet);

  // Today's date string for draft keying
  const todayStr = new Date().toISOString().split("T")[0];
  const draftSets = useQuery(api.workoutGenerator.getDraftSets, { date: todayStr }) ?? [];

  const [generating, setGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<any>(null);
  const [activeDay, setActiveDay] = useState(() => (new Date().getDay() + 6) % 7);
  const [workoutActive, setWorkoutActive] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showRehab, setShowRehab] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<ExerciseInPlan | null>(null);

  // Onboarding state
  const [wGoal, setWGoal] = useState("muscle_gain");
  const [wExperience, setWExperience] = useState("intermediate");
  const [wDays, setWDays] = useState(4);
  const [wMinutes, setWMinutes] = useState(60);
  const [wGymType, setWGymType] = useState<"commercial" | "home" | null>(null);
  const [wHomeEquipment, setWHomeEquipment] = useState<string[]>([]);

  const HOME_EQUIPMENT_OPTIONS: Array<{ id: string; label: string; icon: string }> = [
    { id: "dumbbell", label: "Dumbbells", icon: "🏋️" },
    { id: "barbell", label: "Barbell", icon: "⚖️" },
    { id: "squat_rack", label: "Squat Rack", icon: "🏗️" },
    { id: "bench", label: "Bench", icon: "🪑" },
    { id: "pull_up_bar", label: "Pull-up Bar", icon: "🔝" },
    { id: "kettlebell", label: "Kettlebells", icon: "🔔" },
    { id: "resistance_band", label: "Resistance Bands", icon: "🎗️" },
    { id: "dip_bars", label: "Dip Bars", icon: "📊" },
    { id: "cable_machine", label: "Cable Machine", icon: "🔗" },
    { id: "treadmill", label: "Treadmill", icon: "🏃" },
    { id: "stationary_bike", label: "Stationary Bike", icon: "🚴" },
    { id: "yoga_mat", label: "Yoga Mat / Floor", icon: "🧘" },
  ];

  const toggleHomeEquipment = (id: string) => {
    setWHomeEquipment(prev =>
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    );
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const result = await generatePlan({
        goal: wGoal,
        experience: wExperience,
        daysPerWeek: wDays,
        sessionMinutes: wMinutes,
        gymType: wGymType || "commercial",
        homeEquipment: wGymType === "home" ? wHomeEquipment : undefined,
      });
      setGeneratedPlan(result);
      setShowOnboarding(false);
      if (result.isDeload) {
        toast("Recovery week 💪 Volume reduced 40% — focus on form.", { duration: 5000 });
      } else {
        toast.success("Workout plan generated!");
      }
      hapticSuccess();
    } catch (e: any) {
      toast.error(e.message);
    }
    setGenerating(false);
  };

  const currentPlan = generatedPlan || plan;

  const today = (new Date().getDay() + 6) % 7;
  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Empty state / onboarding
  if (!currentPlan && !showOnboarding) {
    return (
      <div className="px-4 pt-8 max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto text-center space-y-6">
        {/* Rehab modal accessible from empty state too */}
        {showRehab && <RehabModal onClose={() => setShowRehab(false)} />}
      <ExerciseDetailSheet exercise={selectedExercise} onClose={() => setSelectedExercise(null)} />

        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
          style={{ background: "var(--plate-green-deep)" }}>
          <Dumbbell className="w-10 h-10" style={{ color: "var(--plate-green-accent)" }} />
        </div>
        <div>
          <h1 className="text-2xl font-serif mb-2">Workout Generator</h1>
          <p className="text-sm text-muted-foreground">
            AI-powered workout plans based on your goals, schedule, and equipment.
            Includes RIR tracking, rest timers, and auto-deload every 6 weeks.
          </p>
        </div>
        <div className="space-y-2 text-left text-sm text-muted-foreground">
          {[
            "Personalized split (PPL, Upper/Lower, Full Body)",
            "Volume targets backed by Schoenfeld 2017",
            "Push Harder — detects when you're sandbagging",
            "Auto-deload every 6 weeks for recovery",
          ].map((f, i) => (
            <div key={i} className="flex items-center gap-2">
              <span style={{ color: "var(--plate-green-accent)" }}>✓</span>
              <span>{f}</span>
            </div>
          ))}
        </div>
        <button
          onClick={() => setShowOnboarding(true)}
          className="w-full py-4 rounded-2xl text-base font-bold"
          style={{ background: "var(--plate-green-accent)", color: "#0a1a0a" }}
        >
          Build My Plan
        </button>
        {/* Rehab CTA — accessible anytime, no plan needed */}
        <button
          onClick={() => setShowRehab(true)}
          className="w-full py-3 rounded-2xl text-sm font-semibold border flex items-center justify-center gap-2"
          style={{
            borderColor: "var(--plate-green-accent)",
            color: "var(--plate-green-accent)",
            background: "var(--plate-green-deep)",
          }}
        >
          <Heart className="w-4 h-4" />
          Rehab &amp; Recovery — Sore? Tight? Start here
        </button>
      </div>
    );
  }

  // Onboarding
  if (showOnboarding) {
    const canGenerate = wGymType !== null && (wGymType === "commercial" || wHomeEquipment.length > 0);
    return (
      <div className="px-4 pt-6 max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto space-y-6 pb-32">
        <h2 className="text-xl font-serif">Build Your Plan</h2>

        {/* Gym Type */}
        <div>
          <p className="text-sm font-medium mb-2">Where do you train?</p>
          <div className="grid grid-cols-2 gap-3">
            {([["commercial", "🏢", "Commercial Gym", "Full equipment access"], ["home", "🏠", "Home Gym", "Tell us what you have"]] as const).map(([id, icon, label, sub]) => (
              <button key={id} onClick={() => setWGymType(id)}
                className="p-4 rounded-2xl border text-left transition-all"
                style={{ borderColor: wGymType === id ? "var(--plate-green-accent)" : "var(--border)", background: wGymType === id ? "var(--plate-green-deep)" : "var(--card)" }}>
                <div className="text-2xl mb-1">{icon}</div>
                <div className="text-sm font-semibold">{label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Home equipment picker — only when home gym selected */}
        {wGymType === "home" && (
          <div>
            <p className="text-sm font-medium mb-1">What equipment do you have?</p>
            <p className="text-xs text-muted-foreground mb-3">Select everything available. Your plan will be built around exactly this.</p>
            <div className="grid grid-cols-2 gap-2">
              {HOME_EQUIPMENT_OPTIONS.map(({ id, label, icon }) => {
                const selected = wHomeEquipment.includes(id);
                return (
                  <button key={id} onClick={() => toggleHomeEquipment(id)}
                    className="p-3 rounded-xl border text-left transition-all flex items-center gap-2"
                    style={{ borderColor: selected ? "var(--plate-green-accent)" : "var(--border)", background: selected ? "var(--plate-green-deep)" : "var(--card)" }}>
                    <span className="text-lg">{icon}</span>
                    <span className="text-sm font-medium">{label}</span>
                    {selected && <span className="ml-auto text-xs" style={{ color: "var(--plate-green-accent)" }}>✓</span>}
                  </button>
                );
              })}
            </div>
            {wHomeEquipment.length === 0 && (
              <p className="text-xs text-amber-400 mt-2">⚠️ Select at least one piece of equipment</p>
            )}
          </div>
        )}

        {/* Goal */}
        <div>
          <p className="text-sm font-medium mb-2">Primary Goal</p>
          <div className="grid grid-cols-2 gap-2">
            {[["muscle_gain", "💪 Build Muscle"], ["fat_loss", "🔥 Lose Fat"], ["strength", "🏋️ Get Stronger"], ["recomp", "⚖️ Recomp"], ["endurance", "🏃 Endurance"]].map(([v, l]) => (
              <button key={v} onClick={() => setWGoal(v)}
                className="p-3 rounded-xl border text-sm font-medium transition-all"
                style={{ borderColor: wGoal === v ? "var(--plate-green-accent)" : "var(--border)", background: wGoal === v ? "var(--plate-green-deep)" : "var(--card)" }}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Experience */}
        <div>
          <p className="text-sm font-medium mb-2">Experience Level</p>
          <div className="grid grid-cols-3 gap-2">
            {[["beginner", "Beginner"], ["intermediate", "Intermediate"], ["advanced", "Advanced"]].map(([v, l]) => (
              <button key={v} onClick={() => setWExperience(v)}
                className="p-3 rounded-xl border text-sm font-medium transition-all"
                style={{ borderColor: wExperience === v ? "var(--plate-green-accent)" : "var(--border)", background: wExperience === v ? "var(--plate-green-deep)" : "var(--card)" }}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Days/week */}
        <div>
          <p className="text-sm font-medium mb-2">Days per week: <strong>{wDays}</strong></p>
          <input type="range" min={2} max={7} value={wDays} onChange={e => setWDays(Number(e.target.value))}
            className="w-full accent-green-500" />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>2 days</span><span>7 days</span>
          </div>
        </div>

        {/* Session length */}
        <div>
          <p className="text-sm font-medium mb-2">Session length: <strong>{wMinutes} min</strong></p>
          <input type="range" min={20} max={120} step={5} value={wMinutes} onChange={e => setWMinutes(Number(e.target.value))}
            className="w-full accent-green-500" />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>20 min</span><span>2 hrs</span>
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={generating || !canGenerate}
          className="w-full py-4 rounded-2xl text-base font-bold disabled:opacity-40"
          style={{ background: "var(--plate-green-accent)", color: "#0a1a0a" }}
        >
          {generating ? "Building your plan…" : canGenerate ? "Generate Plan 💪" : wGymType === null ? "Select where you train ↑" : "Select your equipment ↑"}
        </button>
        <button onClick={() => setShowOnboarding(false)} className="w-full text-sm text-muted-foreground py-2">Back</button>
      </div>
    );
  }

  // Plan view
  const days: WorkoutDay[] = generatedPlan?.days || (currentPlan as any)?.days || [];
  const currentDay = days[activeDay];
  const isDeload = generatedPlan?.isDeload;

  return (
    <div className="px-4 pt-6 max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto pb-32">
      {/* Deload banner */}
      {isDeload && (
        <div className="rounded-xl px-4 py-3 mb-4 text-sm font-medium flex items-center gap-2"
          style={{ background: "var(--plate-green-deep)", color: "var(--plate-green-accent)" }}>
          <RotateCcw className="w-4 h-4 shrink-0" />
          Recovery Week — Volume reduced 40%. Focus on form &amp; technique.
        </div>
      )}

      {/* Rehab modal */}
      {showRehab && <RehabModal onClose={() => setShowRehab(false)} />}
      <ExerciseDetailSheet exercise={selectedExercise} onClose={() => setSelectedExercise(null)} />

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-serif">Workout Plan</h1>
        <div className="flex items-center gap-2">
          {/* Rehab button */}
          <button
            onClick={() => setShowRehab(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all"
            style={{
              borderColor: "var(--plate-green-accent)",
              color: "var(--plate-green-accent)",
              background: "var(--plate-green-deep)",
            }}
          >
            <Heart className="w-3.5 h-3.5" />
            Rehab
          </button>
          <button onClick={() => setShowOnboarding(true)}
            className="text-xs text-muted-foreground flex items-center gap-1 p-2">
            <RefreshCw className="w-3.5 h-3.5" />
            New plan
          </button>
        </div>
      </div>

      {/* Split + week info */}
      {generatedPlan && (
        <p className="text-xs text-muted-foreground mb-4">
          Split: <strong>{generatedPlan.split?.toUpperCase().replace("_", " ")}</strong>
          {" · "}Week {generatedPlan.weekNumber}
        </p>
      )}

      {/* Day selector */}
      <div className="flex gap-1.5 mb-6 overflow-x-auto pb-1">
        {dayNames.map((name, i) => {
          const day = days[i];
          const isRest = !day || day.focus === "Rest";
          const isToday = i === today;
          const isActive = i === activeDay;
          return (
            <button
              key={i}
              onClick={() => setActiveDay(i)}
              className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl border transition-all shrink-0"
              style={{
                borderColor: isActive ? "var(--plate-green-accent)" : "var(--border)",
                background: isActive ? "var(--plate-green-deep)" : "var(--card)",
                opacity: isRest ? 0.5 : 1,
              }}
            >
              <span className="text-xs text-muted-foreground">{name}</span>
              {isToday && <div className="w-1 h-1 rounded-full" style={{ background: "var(--plate-green-accent)" }} />}
              {isRest ? (
                <span className="text-xs">😴</span>
              ) : (
                <Dumbbell className="w-3.5 h-3.5" />
              )}
            </button>
          );
        })}
      </div>

      {/* Current day */}
      {currentDay && (
        <>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-serif">{currentDay.focus}</h2>
              {currentDay.estimatedDurationMinutes > 0 && (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                  <Timer className="w-3 h-3" />
                  ~{currentDay.estimatedDurationMinutes} min · {currentDay.exercises?.length || 0} exercises
                </p>
              )}
            </div>
            {currentDay.focus !== "Rest" && currentDay.exercises?.length > 0 && (
              <button
                onClick={() => setWorkoutActive(w => !w)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold"
                style={{ background: workoutActive ? "var(--destructive)" : "var(--plate-green-accent)", color: workoutActive ? "white" : "#0a1a0a" }}
              >
                {workoutActive ? <><Square className="w-3.5 h-3.5" /> End</> : <><Play className="w-3.5 h-3.5" /> Start</>}
              </button>
            )}
          </div>

          {currentDay.focus === "Rest" ? (
            <div className="text-center py-12 space-y-3">
              <div className="text-5xl">😴</div>
              <p className="text-muted-foreground font-medium">Rest Day</p>
              <p className="text-sm text-muted-foreground">Recovery is part of the program. Sleep, hydrate, walk.</p>
            </div>
          ) : !workoutActive ? (
            // Preview mode
            <div className="space-y-2">
              {currentDay.exercises?.map((ex, i) => (
                <button
                  key={i}
                  className="w-full text-left"
                  onClick={() => setSelectedExercise(ex)}
                >
                  <Card className="px-4 py-3 active:scale-[0.98] transition-transform">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 pr-2">
                        <p className="text-sm font-semibold">{ex.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {ex.sets} × {ex.repRange[0]}–{ex.repRange[1]} · {ex.rirTarget} RIR · {Math.round(ex.restSeconds / 60)}:{String(ex.restSeconds % 60).padStart(2, "0")} rest
                        </p>
                      </div>
                      <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    </div>
                    {(ex as any).formCues?.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1.5 italic line-clamp-1">
                        {(ex as any).formCues[0]}
                      </p>
                    )}
                  </Card>
                </button>
              ))}
              <button
                onClick={() => setWorkoutActive(true)}
                className="w-full py-4 rounded-2xl text-base font-bold mt-4"
                style={{ background: "var(--plate-green-accent)", color: "#0a1a0a" }}
              >
                Start Workout 💪
              </button>
            </div>
          ) : (
            // Active workout mode
            <div>
              {currentDay.exercises?.map((ex, i) => (
                <ExerciseCard
                  key={i}
                  exercise={ex}
                  date={todayStr}
                  saveDraft={saveDraftSet}
                  draftSets={draftSets as any}
                  onMoreInfo={() => setSelectedExercise(ex)}
                  onSetsComplete={async (reps, weight, rir) => {
                    try {
                      await logSet({
                        date: todayStr,
                        dayFocus: currentDay.focus,
                        exerciseId: ex.exerciseId,
                        exerciseName: ex.name,
                        setNumber: 1,
                        weight,
                        reps,
                        rirLogged: rir,
                      });
                    } catch { /* silent */ }
                  }}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
