/**
 * SleepPage — Manual sleep tracking with stage estimation
 * - Date nav (prev/next)
 * - Donut: real or empty total sleep
 * - Stage bars: Awake / REM / Core / Deep (estimated from questionnaire)
 * - Log Sleep button → step-by-step questions (bedtime, wake time, quality, etc.)
 * - Premium upsell
 */
import { useNavigate } from "react-router-dom";
import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Crown, Plus, Moon, Edit2, Trash2, X, Check } from "lucide-react";
import { hapticLight } from "@/lib/haptics";
import { Button } from "@/components/ui/button";
import { useAccessLevel } from "@/components/RequireSubscription";
import { usePaywall } from "@/components/PaywallModal";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";

// ── Helpers ──
function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function minutesToHM(mins: number): { h: number; m: number } {
  return { h: Math.floor(mins / 60), m: mins % 60 };
}

function formatHM(mins: number): string {
  const { h, m } = minutesToHM(mins);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatTime12(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(":");
  const h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const suffix = h < 12 ? "AM" : "PM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

// ── Donut chart ──
function SleepDonut({ hours, mins, empty }: { hours: number; mins: number; empty?: boolean }) {
  const size = 200; const cx = 100; const cy = 100; const r = 80; const stroke = 14;
  const circ = 2 * Math.PI * r;
  const pct = empty ? 0 : Math.min((hours * 60 + mins) / 480, 1);
  const offset = circ * (1 - pct);
  return (
    <div className="flex flex-col items-center">
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
          {!empty && (
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="#6B7BD4" strokeWidth={stroke}
              strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 0.8s ease" }} />
          )}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {empty ? (
            <>
              <Moon className="w-8 h-8 mb-1" style={{ color: "rgba(255,255,255,0.2)" }} />
              <div className="text-xs text-muted-foreground text-center">No sleep logged</div>
            </>
          ) : (
            <>
              <div className="text-2xl font-bold">{hours}h {mins}m</div>
              <div className="text-xs text-muted-foreground">Total Sleep</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SleepStageRow({ label, color, value, goal }: { label: string; color: string; value: string | null; goal?: string }) {
  return (
    <div className="flex items-center px-4 py-4 border-b last:border-b-0" style={{ borderColor: "var(--border)" }}>
      <div className="w-3 h-3 rounded-full mr-3 flex-shrink-0" style={{ background: color }} />
      <span className="flex-1 text-sm font-medium">{label}</span>
      {goal && <span className="text-xs text-muted-foreground mr-4">Goal: {goal}</span>}
      <span className="text-sm" style={{ color: value ? "#fff" : "rgba(255,255,255,0.35)" }}>
        {value ?? "N/A"}
      </span>
    </div>
  );
}

// ── Sleep log form (step-by-step questionnaire) ──
type FormStep = "bedtime" | "waketime" | "quality" | "fall_asleep" | "woke_up" | "notes" | "done";

function SleepLogForm({ date, existing, onClose }: {
  date: string;
  existing: any | null;
  onClose: () => void;
}) {
  const logSleep = useMutation(api.sleep.logSleep);
  const deleteSleep = useMutation(api.sleep.deleteSleepLog);

  const [step, setStep] = useState<FormStep>("bedtime");
  const [bedtime, setBedtime] = useState(existing?.bedtime ?? "22:00");
  const [wakeTime, setWakeTime] = useState(existing?.wakeTime ?? "06:30");
  const [quality, setQuality] = useState<number>(existing?.qualityRating ?? 3);
  const [fallAsleep, setFallAsleep] = useState<string>(String(existing?.timeToFallAsleep ?? "15"));
  const [wokeUp, setWokeUp] = useState<string>(String(existing?.timesAwoke ?? "0"));
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [saving, setSaving] = useState(false);

  const steps: FormStep[] = ["bedtime", "waketime", "quality", "fall_asleep", "woke_up", "notes"];
  const currentIdx = steps.indexOf(step);
  const progress = ((currentIdx) / steps.length) * 100;

  const goNext = (nextStep: FormStep) => { hapticLight(); setStep(nextStep); };
  const goBack = () => {
    hapticLight();
    const prev = steps[currentIdx - 1];
    if (prev) setStep(prev);
    else onClose();
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await logSleep({
        date,
        bedtime,
        wakeTime,
        qualityRating: quality,
        timeToFallAsleep: parseInt(fallAsleep, 10) || 15,
        timesAwoke: parseInt(wokeUp, 10) || 0,
        notes: notes.trim() || undefined,
      });
      toast.success("Sleep logged ✓");
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteSleep({ date });
      toast.success("Sleep log removed");
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Failed to delete");
    }
  };

  const qualityLabels = ["", "Poor 😩", "Fair 😕", "OK 😐", "Good 😊", "Great 😴"];
  const qualityColors = ["", "#ef4444", "#f97316", "#eab308", "#52B788", "#6B7BD4"];

  return (
    <div className="fixed inset-0 z-50 flex items-end" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div className="w-full max-w-lg mx-auto rounded-t-3xl pb-10" style={{ background: "var(--background)", border: "1px solid var(--border)" }}>
        {/* Progress bar */}
        <div className="w-full h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: "#6B7BD4" }} />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4">
          <button onClick={goBack} className="text-muted-foreground">
            {currentIdx === 0 ? <X className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
          <span className="text-sm font-semibold">Log Sleep</span>
          {existing && (
            <button onClick={handleDelete} className="text-xs" style={{ color: "#ef4444" }}>Delete</button>
          )}
          {!existing && <div className="w-10" />}
        </div>

        <div className="px-6">
          {step === "bedtime" && (
            <>
              <div className="text-lg font-bold mb-1">When did you go to bed?</div>
              <div className="text-xs text-muted-foreground mb-6">Enter the time you got into bed</div>
              <div className="flex justify-center mb-8">
                <input
                  type="time"
                  value={bedtime}
                  onChange={e => setBedtime(e.target.value)}
                  className="text-4xl font-black bg-transparent text-center outline-none"
                  style={{ color: "#fff", width: 180, WebkitAppearance: "none" }}
                />
              </div>
              <Button
                onClick={() => goNext("waketime")}
                className="w-full h-12 text-base font-bold rounded-full"
                style={{ background: "#6B7BD4", color: "#fff" }}
              >
                Next
              </Button>
            </>
          )}

          {step === "waketime" && (
            <>
              <div className="text-lg font-bold mb-1">When did you wake up?</div>
              <div className="text-xs text-muted-foreground mb-6">Enter the time you got out of bed</div>
              <div className="flex justify-center mb-8">
                <input
                  type="time"
                  value={wakeTime}
                  onChange={e => setWakeTime(e.target.value)}
                  className="text-4xl font-black bg-transparent text-center outline-none"
                  style={{ color: "#fff", width: 180, WebkitAppearance: "none" }}
                />
              </div>
              <Button
                onClick={() => goNext("quality")}
                className="w-full h-12 text-base font-bold rounded-full"
                style={{ background: "#6B7BD4", color: "#fff" }}
              >
                Next
              </Button>
            </>
          )}

          {step === "quality" && (
            <>
              <div className="text-lg font-bold mb-1">How was your sleep quality?</div>
              <div className="text-xs text-muted-foreground mb-6">Rate how rested you feel</div>
              <div className="flex justify-center gap-3 mb-6">
                {[1, 2, 3, 4, 5].map(q => (
                  <button
                    key={q}
                    onClick={() => { hapticLight(); setQuality(q); }}
                    className="w-12 h-12 rounded-2xl text-xl font-black transition-all"
                    style={{
                      background: quality === q ? qualityColors[q] : "rgba(255,255,255,0.07)",
                      color: quality === q ? "#fff" : "rgba(255,255,255,0.4)",
                      border: quality === q ? `2px solid ${qualityColors[q]}` : "2px solid transparent",
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
              <div className="text-center text-sm font-semibold mb-8" style={{ color: qualityColors[quality] }}>
                {qualityLabels[quality]}
              </div>
              <Button
                onClick={() => goNext("fall_asleep")}
                className="w-full h-12 text-base font-bold rounded-full"
                style={{ background: "#6B7BD4", color: "#fff" }}
              >
                Next
              </Button>
            </>
          )}

          {step === "fall_asleep" && (
            <>
              <div className="text-lg font-bold mb-1">How long to fall asleep?</div>
              <div className="text-xs text-muted-foreground mb-6">Roughly how many minutes it took</div>
              <div className="flex items-center justify-center gap-2 mb-8">
                <input
                  type="number"
                  value={fallAsleep}
                  onChange={e => setFallAsleep(e.target.value)}
                  min={0}
                  max={180}
                  className="text-5xl font-black bg-transparent text-center outline-none w-32"
                  style={{ color: "#fff" }}
                />
                <span className="text-lg text-muted-foreground">min</span>
              </div>
              <div className="flex gap-2 mb-8">
                {[5, 10, 15, 20, 30, 45, 60].map(v => (
                  <button
                    key={v}
                    onClick={() => { hapticLight(); setFallAsleep(String(v)); }}
                    className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
                    style={{
                      background: fallAsleep === String(v) ? "rgba(107,123,212,0.25)" : "rgba(255,255,255,0.06)",
                      color: fallAsleep === String(v) ? "#6B7BD4" : "rgba(255,255,255,0.5)",
                    }}
                  >
                    {v}
                  </button>
                ))}
              </div>
              <Button
                onClick={() => goNext("woke_up")}
                className="w-full h-12 text-base font-bold rounded-full"
                style={{ background: "#6B7BD4", color: "#fff" }}
              >
                Next
              </Button>
            </>
          )}

          {step === "woke_up" && (
            <>
              <div className="text-lg font-bold mb-1">How many times did you wake up?</div>
              <div className="text-xs text-muted-foreground mb-6">Brief interruptions during sleep</div>
              <div className="flex items-center justify-center gap-2 mb-8">
                <input
                  type="number"
                  value={wokeUp}
                  onChange={e => setWokeUp(e.target.value)}
                  min={0}
                  max={20}
                  className="text-5xl font-black bg-transparent text-center outline-none w-28"
                  style={{ color: "#fff" }}
                />
                <span className="text-lg text-muted-foreground">times</span>
              </div>
              <div className="flex gap-3 mb-8">
                {[0, 1, 2, 3, 4, 5].map(v => (
                  <button
                    key={v}
                    onClick={() => { hapticLight(); setWokeUp(String(v)); }}
                    className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
                    style={{
                      background: wokeUp === String(v) ? "rgba(107,123,212,0.25)" : "rgba(255,255,255,0.06)",
                      color: wokeUp === String(v) ? "#6B7BD4" : "rgba(255,255,255,0.5)",
                    }}
                  >
                    {v}
                  </button>
                ))}
              </div>
              <Button
                onClick={() => goNext("notes")}
                className="w-full h-12 text-base font-bold rounded-full"
                style={{ background: "#6B7BD4", color: "#fff" }}
              >
                Next
              </Button>
            </>
          )}

          {step === "notes" && (
            <>
              <div className="text-lg font-bold mb-1">Any notes? <span className="text-sm font-normal text-muted-foreground">(optional)</span></div>
              <div className="text-xs text-muted-foreground mb-4">e.g. "Had coffee late", "Stressed", "Amazing sleep"</div>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Add a note…"
                rows={3}
                className="w-full bg-transparent border rounded-xl px-4 py-3 text-sm outline-none resize-none mb-6"
                style={{ borderColor: "var(--border)", color: "rgba(255,255,255,0.8)" }}
              />
              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full h-12 text-base font-bold rounded-full flex items-center justify-center gap-2"
                style={{ background: "#6B7BD4", color: "#fff" }}
              >
                {saving ? "Saving…" : <><Check className="w-5 h-5" /> Save Sleep Log</>}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ──
export function SleepPage() {
  const navigate = useNavigate();
  const { isPremium } = useAccessLevel();
  const { paywallNode, openPaywall } = usePaywall("general");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showForm, setShowForm] = useState(false);

  const dateStr = toDateStr(currentDate);
  const sleepLog = useQuery(api.sleep.getSleepLog, { date: dateStr });

  const formatDate = (d: Date) => d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const prevDay = () => { hapticLight(); setCurrentDate(d => { const n = new Date(d); n.setDate(d.getDate() - 1); return n; }); };
  const nextDay = () => { hapticLight(); setCurrentDate(d => { const n = new Date(d); n.setDate(d.getDate() + 1); return n; }); };
  const isToday = currentDate.toDateString() === new Date().toDateString();

  const { h, m } = useMemo(() => {
    if (!sleepLog) return { h: 0, m: 0 };
    return minutesToHM(sleepLog.totalMinutes || 0);
  }, [sleepLog]);

  const stages = [
    {
      label: "Awake",
      color: "#ef4444",
      value: sleepLog ? formatHM(sleepLog.awakeMinutes || 0) : null,
      goal: "< 30m",
    },
    {
      label: "REM",
      color: "#8B5CF6",
      value: sleepLog ? formatHM(sleepLog.remMinutes || 0) : null,
      goal: "90–120m",
    },
    {
      label: "Core",
      color: "#4A9EFF",
      value: sleepLog ? formatHM(sleepLog.coreMinutes || 0) : null,
      goal: "3–4h",
    },
    {
      label: "Deep",
      color: "#1E3A8A",
      value: sleepLog ? formatHM(sleepLog.deepMinutes || 0) : null,
      goal: "60–90m",
    },
  ];

  const qualityLabels = ["", "Poor", "Fair", "OK", "Good", "Great"];
  const qualityColors = ["", "#ef4444", "#f97316", "#eab308", "#52B788", "#6B7BD4"];

  return (
    <div className="pb-28 max-w-lg mx-auto animate-page-enter">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "var(--surface-card)" }}>
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-base font-semibold">Sleep</span>
        <button
          onClick={() => { hapticLight(); setShowForm(true); }}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: sleepLog ? "rgba(107,123,212,0.15)" : "var(--surface-card)" }}
          title={sleepLog ? "Edit sleep log" : "Log sleep"}
        >
          {sleepLog ? <Edit2 className="w-4 h-4" style={{ color: "#6B7BD4" }} /> : <Plus className="w-4 h-4" />}
        </button>
      </div>

      {/* Date navigator */}
      <div className="flex items-center justify-center gap-4 mb-6 px-4">
        <button onClick={prevDay} className="w-8 h-8 flex items-center justify-center rounded-full" style={{ background: "var(--surface-card)" }}>
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-medium">{formatDate(currentDate)}</span>
        <button onClick={nextDay} disabled={isToday} className="w-8 h-8 flex items-center justify-center rounded-full disabled:opacity-30" style={{ background: "var(--surface-card)" }}>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Sleep donut */}
      <div className="flex justify-center mb-4">
        <SleepDonut hours={h} mins={m} empty={!sleepLog} />
      </div>

      {/* Sleep summary (bedtime / wake / quality) */}
      {sleepLog ? (
        <div className="flex justify-center gap-6 mb-6 px-4">
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">Bedtime</div>
            <div className="text-sm font-semibold">{formatTime12(sleepLog.bedtime)}</div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground mb-1">Wake Up</div>
            <div className="text-sm font-semibold">{formatTime12(sleepLog.wakeTime)}</div>
          </div>
          {sleepLog.qualityRating && (
            <div className="text-center">
              <div className="text-xs text-muted-foreground mb-1">Quality</div>
              <div className="text-sm font-semibold" style={{ color: qualityColors[sleepLog.qualityRating] }}>
                {qualityLabels[sleepLog.qualityRating]}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex justify-center mb-6">
          <button
            onClick={() => { hapticLight(); setShowForm(true); }}
            className="flex items-center gap-2 px-6 py-3 rounded-full font-semibold text-sm transition-all active:scale-95"
            style={{ background: "rgba(107,123,212,0.15)", color: "#6B7BD4", border: "1px solid rgba(107,123,212,0.3)" }}
          >
            <Plus className="w-4 h-4" />
            Log Sleep
          </button>
        </div>
      )}

      {/* Stage bars */}
      <div className="mx-4 mb-4 rounded-2xl overflow-hidden" style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}>
        {stages.map(s => (
          <SleepStageRow key={s.label} {...s} />
        ))}
      </div>

      {/* Sleep tips / notes */}
      {sleepLog?.notes && (
        <div className="mx-4 mb-4 rounded-2xl p-4" style={{ background: "rgba(107,123,212,0.08)", border: "1px solid rgba(107,123,212,0.2)" }}>
          <div className="text-xs font-semibold mb-1" style={{ color: "#6B7BD4" }}>📝 Notes</div>
          <div className="text-sm text-muted-foreground">{sleepLog.notes}</div>
        </div>
      )}

      {/* Stage explanation */}
      <div className="mx-4 mb-4 rounded-2xl p-4" style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}>
        <div className="text-xs font-semibold mb-2">How stages are estimated</div>
        <div className="text-xs text-muted-foreground leading-relaxed">
          Sleep stages are estimated from your bedtime, wake time, and quality answers using published sleep science formulas (Walker, 2017). For precise data, connect a wearable.
        </div>
      </div>

      {/* Premium upsell */}
      {!isPremium && (
        <div className="mx-4 mb-4 rounded-2xl p-5" style={{ background: "rgba(82,183,136,0.08)", border: "1px solid rgba(82,183,136,0.25)" }}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="text-base font-bold mb-1">Psst...you awake? 👀</div>
              <div className="text-xs text-muted-foreground leading-relaxed">
                Unlock sleep stage tracking, insights, and sleep quality scores with Plate Premium.
              </div>
            </div>
            <Crown className="w-5 h-5 ml-3 flex-shrink-0" style={{ color: "#52B788" }} />
          </div>
          <Button
            onClick={openPaywall}
            className="w-full rounded-full font-bold"
            style={{ background: "#52B788", color: "#0a1a0a" }}
          >
            Start 7-Day Free Trial
          </Button>
        </div>
      )}
      {paywallNode}

      {/* Log meals insight */}
      <div className="mx-4 rounded-2xl p-4" style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}>
        <div className="text-sm font-medium mb-1">Log meals for more insights</div>
        <div className="text-xs text-muted-foreground mb-3">Track what you eat to see how food affects your sleep quality.</div>
        <Button
          onClick={() => navigate("/track")}
          variant="outline"
          size="sm"
          className="rounded-full px-4"
        >
          Add Food
        </Button>
      </div>

      {/* Sleep log form modal */}
      {showForm && (
        <SleepLogForm
          date={dateStr}
          existing={sleepLog ?? null}
          onClose={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
