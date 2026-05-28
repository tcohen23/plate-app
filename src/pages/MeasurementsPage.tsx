/**
 * MeasurementsPage — Steps & Weight tabs
 * - Steps toggle / Weight toggle
 * - Period selector (1 Month / 3 Months / 6 Months)
 * - Stats: Average | Best | Total (steps) or Start | Current | Change (weight)
 * - Bar chart with date axis
 * - Entries list (real data from DB)
 * - No ads
 */
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState, useMemo } from "react";
import { hapticLight } from "@/lib/haptics";
import {
  ChevronLeft,
  Plus,
  Upload,
  Weight,
  Footprints,
  BarChart2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Period = "1M" | "3M" | "6M";

const PERIOD_DAYS: Record<Period, number> = { "1M": 30, "3M": 90, "6M": 180 };
const PERIOD_LABELS: Record<Period, string> = {
  "1M": "1 Month",
  "3M": "3 Months",
  "6M": "6 Months",
};

function getDateNDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

function formatEntryDate(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00Z");
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function formatEntryDay(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00Z");
  return d.toLocaleDateString("en-US", { weekday: "long" });
}

/** Bucket daily data into N evenly-spaced bars for the chart */
function bucketData(
  entries: { date: string; value: number }[],
  days: number,
  buckets: number
): { value: number; label: string }[] {
  const result: { value: number; label: string }[] = [];
  const bucketSize = Math.ceil(days / buckets);
  const today = new Date();

  for (let i = 0; i < buckets; i++) {
    const bucketEnd = new Date(today);
    bucketEnd.setDate(today.getDate() - i * bucketSize);
    const bucketStart = new Date(bucketEnd);
    bucketStart.setDate(bucketEnd.getDate() - bucketSize + 1);

    const bucketEntries = entries.filter((e) => {
      const d = new Date(e.date + "T12:00:00Z");
      return d >= bucketStart && d <= bucketEnd;
    });

    const total = bucketEntries.reduce((a, b) => a + b.value, 0);
    // Month label for leftmost bucket of each month
    const label = bucketStart.toLocaleDateString("en-US", { month: "short" });
    result.unshift({ value: total, label });
  }
  return result;
}

function MiniBarChart({
  data,
  max,
  color,
  goalLine,
}: {
  data: { value: number; label: string }[];
  max: number;
  color: string;
  goalLine?: number;
}) {
  const h = 120;
  // Show month labels — only show first occurrence of each month label
  const seen = new Set<string>();
  const labels = data.map((d) => {
    if (!seen.has(d.label)) {
      seen.add(d.label);
      return d.label;
    }
    return "";
  });

  return (
    <div>
      {goalLine && max > 0 && (
        <div
          className="relative mb-1"
          style={{ height: h, marginBottom: 4 }}
        >
          {/* Goal line */}
          <div
            className="absolute left-0 right-0 border-t-2 border-dashed"
            style={{
              borderColor: "#ef4444",
              bottom: `${(goalLine / max) * h}px`,
              opacity: 0.6,
            }}
          />
          <div className="flex items-end gap-0.5 h-full">
            {data.map((d, i) => {
              const pct = max > 0 ? d.value / max : 0;
              return (
                <div
                  key={i}
                  className="flex-1 flex flex-col justify-end"
                  style={{ height: h }}
                >
                  <div
                    className="w-full rounded-t-sm transition-all duration-500"
                    style={{
                      height: `${Math.max(d.value > 0 ? 3 : 0, pct * h)}px`,
                      background: d.value > 0 ? color : "rgba(255,255,255,0.06)",
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
      {!goalLine && (
        <div className="flex items-end gap-0.5" style={{ height: h }}>
          {data.map((d, i) => {
            const pct = max > 0 ? d.value / max : 0;
            return (
              <div
                key={i}
                className="flex-1 flex flex-col justify-end"
                style={{ height: h }}
              >
                <div
                  className="w-full rounded-t-sm transition-all duration-500"
                  style={{
                    height: `${Math.max(d.value > 0 ? 3 : 0, pct * h)}px`,
                    background: d.value > 0 ? color : "rgba(255,255,255,0.06)",
                  }}
                />
              </div>
            );
          })}
        </div>
      )}
      {/* Month labels */}
      <div className="flex gap-0.5 mt-1">
        {labels.map((l, i) => (
          <div
            key={i}
            className="flex-1 text-center text-[9px] text-muted-foreground truncate"
          >
            {l}
          </div>
        ))}
      </div>
    </div>
  );
}

export function MeasurementsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialTab =
    searchParams.get("tab") === "weight" ? "Weight" : "Steps";
  const [tab, setTab] = useState<"Steps" | "Weight">(initialTab as "Steps" | "Weight");
  const [period, setPeriod] = useState<Period>("6M");
  const [showPeriodMenu, setShowPeriodMenu] = useState(false);
  const [showLogWeight, setShowLogWeight] = useState(false);
  const [showLogSteps, setShowLogSteps] = useState(false);
  const [newWeight, setNewWeight] = useState("");
  const [newSteps, setNewSteps] = useState("");

  const progressLogs = useQuery(api.progress.getProgressLogs);
  const stepLogs = useQuery(api.steps.getStepLogs);
  const profile = useQuery(api.profiles.getProfile);
  const logWeightMut = useMutation(api.progress.logWeight);
  const logStepsMut = useMutation(api.steps.logSteps);

  const days = PERIOD_DAYS[period];
  const startDate = getDateNDaysAgo(days);

  // ── Steps data ──
  const stepsInRange = useMemo(() => {
    return (stepLogs || []).filter((l: any) => l.date >= startDate).sort((a: any, b: any) => b.date.localeCompare(a.date));
  }, [stepLogs, startDate]);

  const allStepsEntries = useMemo(
    () =>
      (stepsInRange as any[]).map((l) => ({ date: l.date, value: l.steps })),
    [stepsInRange]
  );

  const totalSteps = allStepsEntries.reduce((a, b) => a + b.value, 0);
  const bestEntry = allStepsEntries.reduce(
    (best, cur) => (cur.value > (best?.value || 0) ? cur : best),
    allStepsEntries[0]
  );
  const bestSteps = bestEntry?.value || 0;
  const bestDate = bestEntry?.date
    ? new Date(bestEntry.date + "T12:00:00Z").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })
    : "--";
  const avgSteps =
    allStepsEntries.length > 0
      ? Math.round(totalSteps / allStepsEntries.length)
      : 0;

  const BUCKETS = 24;
  const stepsChartData = useMemo(
    () => bucketData(allStepsEntries, days, BUCKETS),
    [allStepsEntries, days]
  );
  const stepsChartMax = Math.max(
    ...stepsChartData.map((d) => d.value),
    10000,
    1
  );

  // ── Weight data ──
  const sortedWeightLogs = useMemo(() => {
    return [...(progressLogs || [])].sort((a: any, b: any) =>
      a.date.localeCompare(b.date)
    );
  }, [progressLogs]);

  const startWeight = (profile as any)?.weight ?? 0;
  const latestWeight =
    sortedWeightLogs.length > 0
      ? (sortedWeightLogs[sortedWeightLogs.length - 1] as any).weight ??
        startWeight
      : startWeight;
  const weightChange = latestWeight - startWeight;

  const weightInRange = sortedWeightLogs.filter(
    (l: any) => l.date >= startDate
  );
  const weightEntries = weightInRange.map((l: any) => ({
    date: l.date,
    value: l.weight || 0,
  }));
  const weightChartData = useMemo(
    () => bucketData(weightEntries, days, BUCKETS),
    [weightEntries, days]
  );
  const weightChartMax = Math.max(
    ...weightChartData.map((d) => d.value),
    startWeight + 10,
    1
  );

  const handleLogWeight = async () => {
    if (!newWeight) {
      toast.error("Enter your weight");
      return;
    }
    try {
      const today = new Date().toISOString().split("T")[0];
      await logWeightMut({ weight: parseFloat(newWeight) });
      void today;
      toast.success("Weight logged ✓");
      setShowLogWeight(false);
      setNewWeight("");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleLogSteps = async () => {
    if (!newSteps) {
      toast.error("Enter your step count");
      return;
    }
    try {
      const today = new Date().toISOString().split("T")[0];
      await logStepsMut({
        date: today,
        steps: parseInt(newSteps, 10),
        source: "manual",
      });
      toast.success("Steps logged ✓");
      setShowLogSteps(false);
      setNewSteps("");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="pb-28 max-w-lg mx-auto animate-page-enter">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "var(--surface-card)" }}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-semibold">Measurements</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {}}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: "var(--surface-card)" }}
          >
            <Upload className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              if (tab === "Weight") setShowLogWeight(true);
              else setShowLogSteps(true);
            }}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: "var(--surface-card)" }}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Steps / Weight toggle + Period */}
      <div className="flex items-center px-4 mb-4 gap-2">
        <div
          className="flex rounded-xl overflow-hidden"
          style={{
            background: "var(--surface-card)",
            border: "1px solid var(--border)",
          }}
        >
          {(["Steps", "Weight"] as const).map((t) => (
            <button
              key={t}
              onClick={() => {
                hapticLight();
                setTab(t);
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-all"
              style={{
                background:
                  tab === t ? "rgba(82,183,136,0.15)" : "transparent",
                color: tab === t ? "#52B788" : "rgba(255,255,255,0.5)",
              }}
            >
              {t === "Steps" ? (
                <Footprints className="w-4 h-4" />
              ) : (
                <Weight className="w-4 h-4" />
              )}
              {t}
            </button>
          ))}
        </div>

        {/* Period picker */}
        <div className="relative">
          <button
            onClick={() => setShowPeriodMenu((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-sm"
            style={{
              background: "var(--surface-card)",
              border: "1px solid var(--border)",
              color: "#52B788",
            }}
          >
            <BarChart2 className="w-4 h-4" />
            {PERIOD_LABELS[period]}
          </button>
          {showPeriodMenu && (
            <div
              className="absolute top-full left-0 mt-1 rounded-xl overflow-hidden z-10 shadow-xl"
              style={{
                background: "var(--surface-card)",
                border: "1px solid var(--border)",
                minWidth: 120,
              }}
            >
              {(["1M", "3M", "6M"] as Period[]).map((p) => (
                <button
                  key={p}
                  onClick={() => {
                    setPeriod(p);
                    setShowPeriodMenu(false);
                  }}
                  className="w-full text-left px-4 py-2.5 text-sm hover:opacity-80 transition-all"
                  style={{
                    color: period === p ? "#52B788" : "rgba(255,255,255,0.7)",
                    background:
                      period === p ? "rgba(82,183,136,0.1)" : "transparent",
                  }}
                >
                  {PERIOD_LABELS[p]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Stats row */}
      {tab === "Steps" ? (
        <div className="flex items-start px-4 mb-4 gap-6">
          <div>
            <div className="text-2xl font-bold">
              {avgSteps.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">
              Average
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold">
              {bestSteps.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">
              Best {bestDate !== "--" ? `(${bestDate})` : ""}
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold">
              {totalSteps.toLocaleString()}
            </div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">
              Total
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-start px-4 mb-4 gap-6">
          <div>
            <div className="text-2xl font-bold">{startWeight || "--"}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">
              Start
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold">{latestWeight || "--"}</div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">
              Current
            </div>
          </div>
          <div>
            <div
              className="text-2xl font-bold"
              style={{
                color:
                  weightChange < 0
                    ? "#52B788"
                    : weightChange > 0
                      ? "#ef4444"
                      : undefined,
              }}
            >
              {weightChange >= 0 ? "+" : ""}
              {weightChange.toFixed(1)}
            </div>
            <div className="text-xs text-muted-foreground uppercase tracking-wide">
              Change (lbs)
            </div>
          </div>
        </div>
      )}

      {/* Chart */}
      <div
        className="px-4 mb-4 rounded-2xl py-4 mx-4"
        style={{
          background: "var(--surface-card)",
          border: "1px solid var(--border)",
        }}
      >
        {tab === "Steps" ? (
          <>
            <MiniBarChart
              data={stepsChartData}
              max={stepsChartMax}
              color="#ef4472"
              goalLine={10000}
            />
            <div className="flex items-center gap-2 mt-3 pl-2">
              <div
                className="w-8 border-t-2 border-dashed"
                style={{ borderColor: "#ef4444" }}
              />
              <span className="text-xs text-muted-foreground">
                10,000 goal
              </span>
            </div>
          </>
        ) : (
          <>
            {weightChartData.some((d) => d.value > 0) ? (
              <MiniBarChart
                data={weightChartData}
                max={weightChartMax}
                color="#52B788"
              />
            ) : (
              <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
                No Data Available
              </div>
            )}
          </>
        )}
      </div>

      {/* Entries */}
      <div className="px-4">
        <h3 className="text-base font-bold mb-3">Entries</h3>
        {tab === "Steps" ? (
          stepsInRange.length === 0 ? (
            <div
              className="rounded-2xl py-10 text-center"
              style={{
                background: "var(--surface-card)",
                border: "1px solid var(--border)",
              }}
            >
              <Footprints
                className="w-8 h-8 mx-auto mb-3 opacity-30"
              />
              <p className="text-sm text-muted-foreground">
                No step entries yet.
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Tap + to log your steps.
              </p>
            </div>
          ) : (
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: "var(--surface-card)",
                border: "1px solid var(--border)",
              }}
            >
              {(stepsInRange as any[]).slice(0, 30).map((entry, i) => (
                <div
                  key={i}
                  className="flex items-center px-4 py-3.5 border-b last:border-b-0"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div className="flex-1">
                    <div className="text-sm font-medium">
                      {formatEntryDate(entry.date)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatEntryDay(entry.date)}
                    </div>
                  </div>
                  <div className="text-sm font-semibold">
                    {entry.steps.toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          <div>
            {sortedWeightLogs.length === 0 ? (
              <div
                className="rounded-2xl py-10 text-center"
                style={{
                  background: "var(--surface-card)",
                  border: "1px solid var(--border)",
                }}
              >
                <p className="text-sm text-muted-foreground">
                  No weight entries yet.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Tap + to log your weight.
                </p>
              </div>
            ) : (
              <div
                className="rounded-2xl overflow-hidden"
                style={{
                  background: "var(--surface-card)",
                  border: "1px solid var(--border)",
                }}
              >
                {[...sortedWeightLogs]
                  .reverse()
                  .slice(0, 30)
                  .map((log: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-center px-4 py-3.5 border-b last:border-b-0"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <div className="flex-1">
                        <div className="text-sm font-medium">
                          {formatEntryDate(log.date)}
                        </div>
                        {log.bodyFat && (
                          <div className="text-xs text-muted-foreground">
                            {log.bodyFat}% body fat
                          </div>
                        )}
                      </div>
                      <div className="text-sm font-semibold">
                        {log.weight} lbs
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Log Steps modal */}
      {showLogSteps && (
        <div
          className="fixed inset-0 z-50 flex items-end"
          style={{ background: "rgba(0,0,0,0.6)" }}
        >
          <div
            className="w-full max-w-lg mx-auto rounded-t-3xl p-6 pb-10"
            style={{
              background: "var(--background)",
              border: "1px solid var(--border)",
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => setShowLogSteps(false)}
                className="text-muted-foreground text-xl"
              >
                ×
              </button>
              <h2 className="text-base font-semibold">Log Steps</h2>
              <div className="w-6" />
            </div>
            <div className="text-center mb-8">
              <input
                type="number"
                value={newSteps}
                onChange={(e) => setNewSteps(e.target.value)}
                placeholder="8000"
                className="text-6xl font-black bg-transparent text-center outline-none w-48"
                style={{ color: newSteps ? "#fff" : "rgba(255,255,255,0.3)" }}
              />
              <span className="text-xl ml-2 text-muted-foreground">steps</span>
            </div>
            <Button
              onClick={handleLogSteps}
              className="w-full h-12 text-base font-bold rounded-full"
              style={{ background: "#52B788", color: "#000" }}
            >
              Log Steps
            </Button>
          </div>
        </div>
      )}

      {/* Log Weight modal */}
      {showLogWeight && (
        <div
          className="fixed inset-0 z-50 flex items-end"
          style={{ background: "rgba(0,0,0,0.6)" }}
        >
          <div
            className="w-full max-w-lg mx-auto rounded-t-3xl p-6 pb-10"
            style={{
              background: "var(--background)",
              border: "1px solid var(--border)",
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => setShowLogWeight(false)}
                className="text-muted-foreground text-xl"
              >
                ×
              </button>
              <h2 className="text-base font-semibold">Log Weight</h2>
              <div className="w-6" />
            </div>
            <div className="text-center mb-8">
              <input
                type="number"
                value={newWeight}
                onChange={(e) => setNewWeight(e.target.value)}
                placeholder="170"
                className="text-6xl font-black bg-transparent text-center outline-none w-48"
                style={{
                  color: newWeight ? "#fff" : "rgba(255,255,255,0.3)",
                }}
              />
              <span className="text-2xl ml-2 text-muted-foreground">lbs</span>
            </div>
            <Button
              onClick={handleLogWeight}
              className="w-full h-12 text-base font-bold rounded-full"
              style={{ background: "#52B788", color: "#000" }}
            >
              Log Weight
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
