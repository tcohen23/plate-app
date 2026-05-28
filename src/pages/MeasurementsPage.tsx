/**
 * MeasurementsPage — Steps & Weight tabs (photos 29, 30)
 * - Steps toggle / Weight toggle
 * - Period selector (1 Month)
 * - Stats: Average | Best | Total (steps) or Start | Current | Change% (weight)
 * - Bar chart
 * - Premium upsell
 * - Entries list
 */
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useMemo } from "react";
import { hapticLight } from "@/lib/haptics";
import { ChevronLeft, Plus, Upload, Weight, Footprints, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

function MiniBarChart({ data, max, color, goalLine: _goalLine }: { data: number[]; max: number; color: string; goalLine?: number }) {
  const h = 120;
//   // const barW = Math.max(8, Math.floor((300 - data.length * 2) / data.length));  // eslint-disable-line
  return (
    <div className="flex items-end gap-0.5 h-32 px-1">
      {data.map((v, i) => {
        const pct = max > 0 ? v / max : 0;
        return (
          <div key={i} className="flex-1 flex flex-col items-center justify-end" style={{ height: h }}>
            <div
              className="w-full rounded-t-sm transition-all duration-500"
              style={{ height: `${Math.max(2, pct * h)}px`, background: v > 0 ? color : "rgba(255,255,255,0.06)" }}
            />
          </div>
        );
      })}
    </div>
  );
}

export function MeasurementsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") === "weight" ? "Weight" : "Steps";
  const [tab, setTab] = useState<"Steps" | "Weight">(initialTab as any);
  const [showLogWeight, setShowLogWeight] = useState(false);
  const [newWeight, setNewWeight] = useState("");
//   const localDate = useMemo(() => (), []);  // eslint-disable-line
  const progressLogs = useQuery(api.progress.getProgressLogs);
  const profile = useQuery(api.profiles.getProfile);
  const logWeightMut = useMutation(api.progress.logWeight);

  const sortedWeightLogs = useMemo(() => {
    return [...(progressLogs || [])].sort((a: any, b: any) => a.date.localeCompare(b.date));
  }, [progressLogs]);

  const startWeight = (profile as any)?.weight ?? 0;
  const latestWeight = sortedWeightLogs.length > 0 ? sortedWeightLogs[sortedWeightLogs.length - 1].weight ?? 0 : 0;
  const weightChange = latestWeight - startWeight;

  // Mock steps data (replace with real step logs when table exists)
  const stepsData = useMemo(() => Array.from({ length: 30 }, (_, i) => {
    if (i < 28) return 0;
    return [4735, 5380][i - 28] || 0;
  }), []);
  const totalSteps = stepsData.reduce((a, b) => a + b, 0);
  const bestSteps = Math.max(...stepsData);
  const avgSteps = stepsData.filter(v => v > 0).length > 0
    ? Math.round(totalSteps / stepsData.filter(v => v > 0).length)
    : 0;

  const handleLogWeight = async () => {
    if (!newWeight) { toast.error("Enter your weight"); return; }
    try {
      await logWeightMut({ weight: parseFloat(newWeight) });
      toast.success("Weight logged ✓");
      setShowLogWeight(false);
      setNewWeight("");
    } catch (e: any) { toast.error(e.message); }
  };

  const weightChartData = sortedWeightLogs.slice(-30).map((l: any) => l.weight || 0);
  const weightMax = Math.max(...weightChartData, startWeight + 5);

  return (
    <div className="pb-28 max-w-lg mx-auto animate-page-enter">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "var(--surface-card)" }}>
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-semibold">Measurements</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => {}} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "var(--surface-card)" }}>
            <Upload className="w-4 h-4" />
          </button>
          {tab === "Weight" && (
            <button onClick={() => setShowLogWeight(true)} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "var(--surface-card)" }}>
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Steps / Weight toggle */}
      <div className="flex items-center px-4 mb-4 gap-2">
        <div className="flex rounded-xl overflow-hidden" style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}>
          {(["Steps", "Weight"] as const).map(t => (
            <button
              key={t}
              onClick={() => { hapticLight(); setTab(t); }}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-all"
              style={{
                background: tab === t ? "rgba(82,183,136,0.15)" : "transparent",
                color: tab === t ? "#52B788" : "rgba(255,255,255,0.5)",
              }}
            >
              {t === "Steps" ? <Footprints className="w-4 h-4" /> : <Weight className="w-4 h-4" />}
              {t}
            </button>
          ))}
        </div>
        <button className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm" style={{ background: "var(--surface-card)", border: "1px solid var(--border)", color: "#52B788" }}>
          📅 1 Month
        </button>
      </div>

      {/* Stats row */}
      {tab === "Steps" ? (
        <div className="flex items-start px-4 mb-4 gap-4">
          <div>
            <div className="text-2xl font-bold">{avgSteps.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Average</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{bestSteps.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Best (May 25)</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{totalSteps.toLocaleString()}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Total</div>
          </div>
        </div>
      ) : (
        <div className="flex items-start px-4 mb-4 gap-6">
          <div>
            <div className="text-2xl font-bold">{startWeight || 0}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Start</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{latestWeight || 0}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Current</div>
          </div>
          <div>
            <div className="text-2xl font-bold">{weightChange >= 0 ? "+" : ""}{weightChange.toFixed(1)}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">Change (0%)</div>
          </div>
        </div>
      )}

      {/* Chart */}
      <div className="px-4 mb-4 rounded-2xl py-4 mx-4" style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}>
        {tab === "Steps" ? (
          <>
            <MiniBarChart data={stepsData} max={Math.max(...stepsData, 10000)} color="#ef4472" goalLine={10000} />
            <div className="flex items-center gap-2 mt-3 pl-2">
              <div className="w-8 border-t-2 border-dashed" style={{ borderColor: "#ef4444" }} />
              <span className="text-xs text-muted-foreground">10,000 goal</span>
            </div>
          </>
        ) : (
          <>
            {weightChartData.length > 0 ? (
              <MiniBarChart data={weightChartData} max={weightMax} color="#52B788" />
            ) : (
              <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">No Data Available</div>
            )}
          </>
        )}
      </div>

      {/* Premium upsell */}
      <div className="px-4 mb-4">
        <div className="rounded-xl px-4 py-3 flex items-center justify-between" style={{ background: "rgba(229,180,84,0.08)", border: "1px solid rgba(229,180,84,0.2)" }}>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Get ad-free tracking in Premium—upgrade now</div>
            <button onClick={() => navigate("/onboarding/upgrade")} className="text-sm font-bold px-4 py-1.5 rounded-full" style={{ background: "#E5B454", color: "#000" }}>
              Go Premium
            </button>
          </div>
          <Crown className="w-6 h-6" style={{ color: "#E5B454" }} />
        </div>
      </div>

      {/* Entries */}
      <div className="px-4">
        <h3 className="text-base font-bold mb-3">Entries</h3>
        {tab === "Steps" ? (
          <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}>
            {[
              { date: "Wednesday, May 27, 2026", day: "Wednesday", steps: 4735 },
              { date: "Tuesday, May 26, 2026", day: "Tuesday", steps: 3196 },
              { date: "Monday, May 25, 2026", day: "Monday", steps: 6090 },
              { date: "Sunday, May 24, 2026", day: "Sunday", steps: 5380 },
            ].map((entry, i) => (
              <div key={i} className="flex items-center px-4 py-3.5 border-b last:border-b-0" style={{ borderColor: "var(--border)" }}>
                <div className="flex-1">
                  <div className="text-sm font-medium">{entry.date}</div>
                  <div className="text-xs text-muted-foreground">{entry.day}</div>
                </div>
                <div className="text-sm font-semibold">{entry.steps.toLocaleString()}</div>
              </div>
            ))}
          </div>
        ) : (
          <div>
            {sortedWeightLogs.length === 0 ? (
              <div className="rounded-2xl py-8 text-center text-muted-foreground text-sm" style={{ background: "#000", border: "1px solid var(--border)" }}>
                No previous measurements.
              </div>
            ) : (
              <div className="rounded-2xl overflow-hidden" style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}>
                {[...sortedWeightLogs].reverse().slice(0, 10).map((log: any, i: number) => (
                  <div key={i} className="flex items-center px-4 py-3.5 border-b last:border-b-0" style={{ borderColor: "var(--border)" }}>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{log.date}</div>
                    </div>
                    <div className="text-sm font-semibold">{log.weight} lbs</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Log Weight Modal */}
      {showLogWeight && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ background: "rgba(0,0,0,0.6)" }}>
          <div className="w-full max-w-lg mx-auto rounded-t-3xl p-6 pb-10" style={{ background: "var(--background)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-6">
              <button onClick={() => setShowLogWeight(false)} className="text-muted-foreground"><span className="text-xl">×</span></button>
              <h2 className="text-base font-semibold">Log weight</h2>
              <div className="w-6" />
            </div>
            <div className="text-center mb-8">
              <input
                type="number"
                value={newWeight}
                onChange={e => setNewWeight(e.target.value)}
                placeholder="268"
                className="text-6xl font-black bg-transparent text-center outline-none w-48"
                style={{ color: "rgba(255,255,255,0.3)" }}
              />
              <span className="text-2xl ml-2 text-muted-foreground">lbs</span>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-xl px-4 py-3 flex items-center justify-between" style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}>
                <div>
                  <div className="text-xs text-muted-foreground">Date</div>
                  <div className="text-sm font-medium text-blue-400">Today</div>
                </div>
              </div>
              <div className="rounded-xl px-4 py-3 flex items-center justify-between" style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}>
                <div>
                  <div className="text-xs text-muted-foreground">Progress Photo</div>
                  <div className="text-sm font-medium text-blue-400">Add</div>
                </div>
              </div>
            </div>
            <Button onClick={handleLogWeight} className="w-full h-12 text-base font-bold rounded-full" style={{ background: "#3B82F6", color: "#fff" }}>
              Log weight
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
