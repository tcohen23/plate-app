/**
 * ProgressPage — MFP redesign (photos 20–21)
 *
 * Header + export icon
 * Tabs: Overview | Calories | Nutrients | Macros | Steps | Weight | Sleep (scrollable)
 *
 * Overview: 7-day calorie bar chart, Weight section, Macros section,
 *           "Manage my goals", Reports → Weekly Digest
 * Weight: log weight, chart, entries
 */
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Download, ChevronRight, Crown, Target, Plus, X } from "lucide-react";
import { getLocalDateString } from "@/lib/dateUtils";
import { hapticLight } from "@/lib/haptics";
import { useAccessLevel } from "@/components/RequireSubscription";

type ProgressTab = "Overview" | "Calories" | "Nutrients" | "Macros" | "Steps" | "Weight" | "Sleep";

const TABS: ProgressTab[] = ["Overview", "Calories", "Nutrients", "Macros", "Steps", "Weight", "Sleep"];

function WeekBarChart({ data, goal, color }: { data: number[]; goal: number; color: string }) {
  const days = ["M", "Tu", "W", "Th", "F", "Sa", "Su"];
  const max = Math.max(...data, goal, 100);
  return (
    <div>
      <div className="flex items-end gap-1 h-28">
        {data.map((v, i) => (
          <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1">
            {v > 0 && <div className="text-[9px] text-muted-foreground">{v > 1000 ? `${(v/1000).toFixed(1)}k` : v}</div>}
            <div className="w-full rounded-t-sm" style={{ height: `${Math.max(2, (v / max) * 112)}px`, background: v > 0 ? color : "rgba(255,255,255,0.06)" }} />
          </div>
        ))}
      </div>
      <div className="flex gap-1 mt-1">
        {days.map(d => <div key={d} className="flex-1 text-center text-[10px] text-muted-foreground">{d}</div>)}
      </div>
    </div>
  );
}

export function ProgressPage() {
  const navigate = useNavigate();
  
  const [tab, setTab] = useState<ProgressTab>("Overview");
  const [showLogWeight, setShowLogWeight] = useState(false);
  const [newWeight, setNewWeight] = useState("");
  const [newBodyFat, setNewBodyFat] = useState("");
  const [notes, setNotes] = useState("");
  const { isPremium } = useAccessLevel();

  const stats = useQuery(api.progress.getUserStats, {});
  const progressLogs = useQuery(api.progress.getProgressLogs);
  const profile = useQuery(api.profiles.getProfile);
  const logWeight = useMutation(api.progress.logWeight);
  const localDate = useMemo(() => getLocalDateString(), []);
  const summary = useQuery(api.foodLogs.getDailySummary, { localDate });

  // Real 7-day calorie data
  const sevenDaysAgo = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);
  const weekRangeSummaries = useQuery(api.foodLogs.getDateRangeSummaries, { startDate: sevenDaysAgo, endDate: localDate });

  const handleLogWeight = async () => {
    if (!newWeight) { toast.error("Enter your weight"); return; }
    try {
      await logWeight({
        weight: parseFloat(newWeight),
        bodyFat: newBodyFat ? parseFloat(newBodyFat) : undefined,
        notes: notes || undefined,
      });
      toast.success("Weight logged ✓");
      setShowLogWeight(false);
      setNewWeight(""); setNewBodyFat(""); setNotes("");
    } catch (e: any) {
      toast.error(e.message || "Failed to log weight");
    }
  };

  if (!stats || !profile) {
    return (
      <div className="pb-28 max-w-lg mx-auto px-4 pt-4">
        <div className="h-96 skeleton-shimmer rounded-2xl" />
      </div>
    );
  }

  const sortedLogs = [...(progressLogs || [])].sort((a: any, b: any) => a.date.localeCompare(b.date));
  const startWeight = profile.weight ?? 0;
  const latestWeight: number = sortedLogs.length > 0 ? (sortedLogs[sortedLogs.length - 1].weight ?? startWeight) : startWeight;
  const weightChange = latestWeight - startWeight;
  const goalWeight = (profile as any).goalWeight ?? 0;
  const calGoal = profile.targetCalories || 2000;
  const todayCals = summary?.totals?.calories || 0;
  // Build real 7-day calorie array
  const weekCals = useMemo(() => {
    const result: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      result.push((weekRangeSummaries as any)?.[dateStr]?.calories || 0);
    }
    return result;
  }, [weekRangeSummaries]);
  const proteinGoal = profile.targetProtein || 150;
  const carbsGoal = profile.targetCarbs || 200;
  const fatGoal = profile.targetFat || 60;
  const consumed = summary?.totals || { calories: 0, protein: 0, carbs: 0, fat: 0 };

  return (
    <div className="pb-28 max-w-lg mx-auto animate-page-enter">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <h1 className="text-xl font-bold">Progress</h1>
        <button onClick={() => navigate("/more/export")}>
          <Download className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center px-4 border-b overflow-x-auto hide-scrollbar" style={{ borderColor: "var(--border)" }}>
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => {
              hapticLight();
              if (t === "Sleep") {
                navigate("/more/sleep");
                return;
              }
              setTab(t);
            }}
            className="px-4 py-3 text-sm font-medium flex-shrink-0 border-b-2 transition-all"
            style={{
              borderBottomColor: tab === t ? "#52B788" : "transparent",
              color: tab === t ? "#52B788" : "rgba(255,255,255,0.5)",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ── */}
      {tab === "Overview" && (
        <div className="px-4 pt-4 space-y-4">
          {/* 7-day calorie chart */}
          <div className="rounded-2xl p-4" style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold">Calories — Last 7 Days</h3>
              <button onClick={() => setTab("Calories")} style={{ color: "#52B788" }} className="text-xs">
                View more
              </button>
            </div>
            <WeekBarChart data={weekCals} goal={calGoal} color="#52B788" />
            <div className="flex items-center gap-2 mt-2">
              <div className="w-6 border-t-2 border-dashed" style={{ borderColor: "#52B788" }} />
              <span className="text-xs text-muted-foreground">Goal ({calGoal})</span>
            </div>
          </div>

          {/* Weight section */}
          <div className="rounded-2xl p-4" style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold">Weight</h3>
              <button onClick={() => setTab("Weight")} style={{ color: "#52B788" }} className="text-xs">
                View more
              </button>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">Start</div>
                <div className="text-lg font-bold">{startWeight || "--"}</div>
                <div className="text-xs text-muted-foreground">lbs</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">Current</div>
                <div className="text-lg font-bold">{latestWeight || "--"}</div>
                <div className="text-xs text-muted-foreground">lbs</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-muted-foreground mb-1">Goal</div>
                <div className="text-lg font-bold">{goalWeight || "--"}</div>
                <div className="text-xs text-muted-foreground">lbs</div>
              </div>
            </div>
            {weightChange !== 0 && (
              <div className="text-center text-sm font-semibold" style={{ color: weightChange < 0 ? "#52B788" : "#ef4444" }}>
                {weightChange < 0 ? "↓" : "↑"} {Math.abs(weightChange).toFixed(1)} lbs {weightChange < 0 ? "lost" : "gained"}
              </div>
            )}
          </div>

          {/* Macros section */}
          <div className="rounded-2xl p-4" style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold">Macros Today</h3>
              <button onClick={() => setTab("Macros")} style={{ color: "#52B788" }} className="text-xs">
                View more
              </button>
            </div>
            {[
              { label: "Protein", val: Math.round(consumed.protein), goal: proteinGoal, color: "#52B788" },
              { label: "Carbs", val: Math.round(consumed.carbs), goal: carbsGoal, color: "#F9C74F" },
              { label: "Fat", val: Math.round(consumed.fat), goal: fatGoal, color: "#FF6B6B" },
            ].map(m => (
              <div key={m.label} className="mb-3 last:mb-0">
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-medium">{m.label}</span>
                  <span className="text-muted-foreground">{m.val}g / {m.goal}g</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.min((m.val / m.goal) * 100, 100)}%`, background: m.color }} />
                </div>
              </div>
            ))}
          </div>

          {/* Reports section */}
          <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}>
            <button onClick={() => navigate("/more/goals")} className="w-full flex items-center justify-between px-4 py-4 border-b transition-opacity active:opacity-60" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center gap-3">
                <Target className="w-4 h-4" style={{ color: "#52B788" }} />
                <span className="text-sm font-medium">Manage my goals</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
            <button onClick={() => navigate("/more/weekly-digest")} className="w-full flex items-center justify-between px-4 py-4 transition-opacity active:opacity-60">
              <div className="flex items-center gap-3">
                <span className="text-base">📊</span>
                <span className="text-sm font-medium">Reports — Weekly Digest</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
        </div>
      )}

      {/* ── CALORIES TAB ── */}
      {tab === "Calories" && (
        <div className="px-4 pt-4 space-y-4">
          <div className="rounded-2xl p-4" style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}>
            <div className="flex justify-between mb-3">
              <span className="text-sm text-muted-foreground">Goal</span>
              <span className="text-sm font-semibold">{calGoal}</span>
            </div>
            <div className="flex justify-between mb-3">
              <span className="text-sm text-muted-foreground">Today</span>
              <span className="text-sm font-semibold">{Math.round(todayCals)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Remaining</span>
              <span className="text-sm font-semibold" style={{ color: calGoal - todayCals >= 0 ? "#52B788" : "#ef4444" }}>
                {Math.round(calGoal - todayCals)}
              </span>
            </div>
          </div>
          <div className="rounded-2xl p-4" style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}>
            <h3 className="text-sm font-bold mb-3">Last 7 Days</h3>
            <WeekBarChart data={weekCals} goal={calGoal} color="#52B788" />
          </div>
        </div>
      )}

      {/* ── NUTRIENTS TAB ── */}
      {tab === "Nutrients" && (
        <div className="px-4 pt-4">
          <button onClick={() => navigate("/more/nutrition")} className="w-full flex items-center justify-between px-4 py-4 rounded-2xl" style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}>
            <span className="text-sm font-medium">View detailed nutrient breakdown</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      )}

      {/* ── MACROS TAB ── */}
      {tab === "Macros" && (
        <div className="px-4 pt-4 space-y-4">
          <div className="rounded-2xl p-4" style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}>
            {[
              { label: "Carbs", val: Math.round(consumed.carbs), goal: carbsGoal, color: "#F9C74F" },
              { label: "Fat", val: Math.round(consumed.fat), goal: fatGoal, color: "#FF6B6B" },
              { label: "Protein", val: Math.round(consumed.protein), goal: proteinGoal, color: "#52B788" },
            ].map(m => (
              <div key={m.label} className="mb-4 last:mb-0">
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="font-semibold">{m.label}</span>
                  <span className="text-muted-foreground">{m.val}g / {m.goal}g</span>
                </div>
                <div className="h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${Math.min((m.val / m.goal) * 100, 100)}%`, background: m.color }} />
                </div>
              </div>
            ))}
          </div>
          {/* Premium: swap macros */}
          {!isPremium && (
            <div className="rounded-2xl p-4 flex items-center justify-between" style={{ background: "rgba(229,180,84,0.08)", border: "1px solid rgba(229,180,84,0.25)" }}>
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4" style={{ color: "#E5B454" }} />
                <span className="text-sm">Swap macro targets</span>
              </div>
              <button onClick={() => navigate("/onboarding/upgrade")} className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: "#E5B454", color: "#000" }}>
                Upgrade
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── STEPS TAB ── */}
      {tab === "Steps" && (
        <div className="px-4 pt-4">
          <div className="rounded-2xl p-4" style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}>
            <div className="text-center py-8">
              <div className="text-5xl font-bold mb-2">0</div>
              <div className="text-sm text-muted-foreground">Steps today</div>
              <div className="text-xs text-muted-foreground mt-1">Goal: 10,000</div>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
              <div className="h-full rounded-full" style={{ width: "0%", background: "#52B788" }} />
            </div>
          </div>
        </div>
      )}

      {/* ── WEIGHT TAB ── */}
      {tab === "Weight" && (
        <div className="px-4 pt-4 space-y-4">
          {/* Log weight */}
          <button
            onClick={() => { hapticLight(); setShowLogWeight(!showLogWeight); }}
            className="w-full flex items-center justify-between px-4 py-4 rounded-2xl"
            style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}
          >
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4" style={{ color: "#52B788" }} />
              <span className="text-sm font-medium">Log Weight</span>
            </div>
            {showLogWeight && <X className="w-4 h-4 text-muted-foreground" />}
          </button>

          {showLogWeight && (
            <div className="rounded-2xl p-4 space-y-3 animate-fade-up" style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Weight (lbs) *</div>
                <Input value={newWeight} onChange={e => setNewWeight(e.target.value)} placeholder="170" type="number" className="h-11 rounded-xl" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Body Fat %</div>
                <Input value={newBodyFat} onChange={e => setNewBodyFat(e.target.value)} placeholder="Optional" type="number" className="h-11 rounded-xl" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Notes</div>
                <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional" className="h-11 rounded-xl" />
              </div>
              <Button onClick={handleLogWeight} className="w-full h-11 rounded-full font-bold" style={{ background: "#52B788", color: "#000" }}>
                Save
              </Button>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Start", val: startWeight },
              { label: "Current", val: latestWeight },
              { label: "Goal", val: goalWeight || "--" },
            ].map(s => (
              <div key={s.label} className="rounded-2xl p-3 text-center" style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}>
                <div className="text-xs text-muted-foreground mb-1">{s.label}</div>
                <div className="text-xl font-bold">{s.val}</div>
                <div className="text-xs text-muted-foreground">lbs</div>
              </div>
            ))}
          </div>

          {/* Entries */}
          {sortedLogs.length > 0 ? (
            <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}>
              <div className="px-4 py-3 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wider" style={{ borderColor: "var(--border)" }}>
                History
              </div>
              {[...sortedLogs].reverse().slice(0, 20).map((log: any) => (
                <div key={log._id} className="flex items-center justify-between px-4 py-3 border-b last:border-b-0" style={{ borderColor: "var(--border)" }}>
                  <div>
                    <div className="text-sm font-medium">{log.weight} lbs</div>
                    {log.bodyFat && <div className="text-xs text-muted-foreground">{log.bodyFat}% body fat</div>}
                  </div>
                  <div className="text-xs text-muted-foreground">{log.date}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl p-8 text-center" style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}>
              <p className="text-sm text-muted-foreground">No weight logs yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Tap "Log Weight" to get started.</p>
            </div>
          )}
        </div>
      )}

      {/* ── SLEEP TAB ── */}
      {tab === "Sleep" && (
        <div className="px-4 pt-4">
          <button onClick={() => navigate("/more/sleep")} className="w-full flex items-center justify-between px-4 py-4 rounded-2xl" style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}>
            <span className="text-sm font-medium">Go to Sleep tracker</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      )}
    </div>
  );
}
