/**
 * NutritionPage — Detailed nutrition analytics
 *
 * Tabs: Calories | Nutrients | Macros
 * View modes: Week View (7-day avg) / Daily View (single day)
 * Navigation: < / > arrows to move between periods
 */
import { useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ChevronLeft, ChevronRight, Download, Crown } from "lucide-react";
import { useState, useMemo } from "react";
import { hapticLight } from "@/lib/haptics";
import { useAccessLevel } from "@/components/RequireSubscription";
import { usePaywall } from "@/components/PaywallModal";
import { getLocalDateString } from "@/lib/dateUtils";

type Tab = "Calories" | "Nutrients" | "Macros";
type ViewMode = "Week" | "Daily";

/** Returns an array of YYYY-MM-DD strings for the last N days ending on endDate */
function buildDateRange(endDate: string, days: number): string[] {
  const dates: string[] = [];
  const end = new Date(endDate + "T12:00:00Z");
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(end.getDate() - i);
    dates.push(d.toISOString().split("T")[0]);
  }
  return dates;
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + "T12:00:00Z");
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00Z");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatWeekLabel(startStr: string, endStr: string): string {
  const s = new Date(startStr + "T12:00:00Z");
  const e = new Date(endStr + "T12:00:00Z");
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${s.toLocaleDateString("en-US", opts)} – ${e.toLocaleDateString("en-US", opts)}`;
}

function getDayLabel(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00Z");
  return ["Su", "M", "Tu", "W", "Th", "F", "Sa"][d.getDay()];
}

function WeekBar({
  day,
  value,
  max,
  isAvg,
}: {
  day: string;
  value: number;
  max: number;
  isAvg?: boolean;
}) {
  const pct = max > 0 ? value / max : 0;
  return (
    <div className="flex flex-col items-center gap-1 flex-1">
      <div className="text-xs text-muted-foreground font-medium">
        {value > 0 ? value.toLocaleString() : ""}
      </div>
      <div
        className="w-full flex flex-col items-center justify-end"
        style={{ height: 80 }}
      >
        <div
          className="w-full max-w-[28px] rounded-t-sm transition-all duration-500"
          style={{
            height: `${Math.max(2, pct * 80)}px`,
            background: isAvg
              ? "rgba(82,183,136,0.4)"
              : value > 0
                ? "#52B788"
                : "rgba(255,255,255,0.06)",
          }}
        />
      </div>
      <div
        className="text-xs"
        style={{
          color: isAvg ? "#52B788" : "rgba(255,255,255,0.5)",
        }}
      >
        {day}
      </div>
    </div>
  );
}

function NutrientRow({
  label,
  avg,
  goal,
  left,
}: {
  label: string;
  avg: number | string;
  goal: number | string;
  left: number | string;
}) {
  return (
    <div
      className="grid grid-cols-4 py-3 border-b last:border-b-0 text-sm"
      style={{ borderColor: "var(--border)" }}
    >
      <div className="col-span-1 font-medium text-xs">{label}</div>
      <div className="text-xs text-right">{avg}</div>
      <div className="text-xs text-right">{goal}</div>
      <div className="text-xs text-right">{left}</div>
    </div>
  );
}

function PremiumLockedCard({
  label,
  onUpgrade,
}: {
  label: string;
  onUpgrade: () => void;
}) {
  return (
    <div
      className="rounded-xl px-4 py-3 flex items-center justify-between mb-3"
      style={{
        background: "rgba(82,183,136,0.08)",
        border: "1px solid rgba(82,183,136,0.2)",
      }}
    >
      <div className="flex items-center gap-2">
        <Crown className="w-4 h-4" style={{ color: "#52B788" }} />
        <span className="text-sm">{label}</span>
      </div>
      <button
        onClick={onUpgrade}
        className="text-xs font-bold px-3 py-1 rounded-full"
        style={{ background: "#52B788", color: "#0a1a0a" }}
      >
        Unlock
      </button>
    </div>
  );
}

export function NutritionPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("Calories");
  const [calMode, setCalMode] = useState<"Total" | "Net">("Net");
  const [viewMode, setViewMode] = useState<ViewMode>("Week");
  // weekOffset: 0 = most recent 7 days, -1 = previous 7 days, etc.
  const [weekOffset, setWeekOffset] = useState(0);
  // dayOffset: 0 = today, -1 = yesterday, etc.
  const [dayOffset, setDayOffset] = useState(0);

  const { isPremium } = useAccessLevel();
  const { paywallNode, openPaywall } = usePaywall("general");
  const profile = useQuery(api.profiles.getProfile);

  const today = getLocalDateString();

  // Compute date ranges
  const { startDate, endDate, dateList, periodLabel } = useMemo(() => {
    if (viewMode === "Week") {
      const end = addDays(today, weekOffset * 7);
      const start = addDays(end, -6);
      const list = buildDateRange(end, 7);
      const isCurrentWeek = weekOffset === 0;
      const label = isCurrentWeek ? "Last 7 Days" : formatWeekLabel(start, end);
      return { startDate: start, endDate: end, dateList: list, periodLabel: label };
    } else {
      const singleDate = addDays(today, dayOffset);
      const isToday = dayOffset === 0;
      const label = isToday ? "Today" : formatDateLabel(singleDate);
      return {
        startDate: singleDate,
        endDate: singleDate,
        dateList: [singleDate],
        periodLabel: label,
      };
    }
  }, [viewMode, weekOffset, dayOffset, today]);

  // Fetch date range summaries
  const rangeSummaries = useQuery(api.foodLogs.getDateRangeSummaries, {
    startDate,
    endDate,
  });

  const calGoal = profile?.targetCalories || 2000;
  const proteinGoal = profile?.targetProtein || 150;
  const carbsGoal = profile?.targetCarbs || 200;
  const fatGoal = profile?.targetFat || 60;

  // Compute per-day calorie values and averages
  const { dayCals, avgCal, avgProtein, avgCarbs, avgFat } = useMemo(() => {
    if (!rangeSummaries || !dateList.length) {
      return { dayCals: dateList.map(() => 0), avgCal: 0, avgProtein: 0, avgCarbs: 0, avgFat: 0 };
    }
    const cals = dateList.map((d) => rangeSummaries[d]?.calories || 0);
    const activeDays = cals.filter((v) => v > 0).length;
    const totalCals = cals.reduce((a, b) => a + b, 0);
    const avgC = activeDays > 0 ? Math.round(totalCals / activeDays) : 0;

    const proteins = dateList.map((d) => rangeSummaries[d]?.protein || 0);
    const carbs = dateList.map((d) => rangeSummaries[d]?.carbs || 0);
    const fats = dateList.map((d) => rangeSummaries[d]?.fat || 0);
    const activeDaysAll = dateList.filter((d) => (rangeSummaries[d]?.calories || 0) > 0).length || 1;
    const avgP = Math.round(proteins.reduce((a, b) => a + b, 0) / activeDaysAll);
    const avgCb = Math.round(carbs.reduce((a, b) => a + b, 0) / activeDaysAll);
    const avgFt = Math.round(fats.reduce((a, b) => a + b, 0) / activeDaysAll);

    return { dayCals: cals, avgCal: avgC, avgProtein: avgP, avgCarbs: avgCb, avgFat: avgFt };
  }, [rangeSummaries, dateList]);

  const chartMax = Math.max(...dayCals, avgCal, calGoal, 100);

  // Day labels for chart (2-char abbreviations)
  const chartDayLabels = dateList.map((d) => getDayLabel(d));

  // ── Aggregate micronutrients from the date range ──
  const microTotals = useMemo(() => {
    if (!rangeSummaries || !dateList.length) return null;
    const activeDays = dateList.filter((d) => (rangeSummaries[d]?.calories || 0) > 0).length || 1;
    const sum = (key: string) =>
      dateList.reduce((a: number, d: string) => a + ((rangeSummaries[d] as any)?.[key] || 0), 0);
    const avg = (key: string) => Math.round((sum(key) / activeDays) * 10) / 10;
    return {
      fiber: viewMode === "Week" ? avg("fiber") : sum("fiber"),
      sugar: viewMode === "Week" ? avg("sugar") : sum("sugar"),
      saturatedFat: viewMode === "Week" ? avg("saturatedFat") : sum("saturatedFat"),
      polyunsaturatedFat: viewMode === "Week" ? avg("polyunsaturatedFat") : sum("polyunsaturatedFat"),
      monounsaturatedFat: viewMode === "Week" ? avg("monounsaturatedFat") : sum("monounsaturatedFat"),
      transFat: viewMode === "Week" ? avg("transFat") : sum("transFat"),
      cholesterol: viewMode === "Week" ? Math.round(sum("cholesterol") / activeDays) : Math.round(sum("cholesterol")),
      sodium: viewMode === "Week" ? Math.round(sum("sodium") / activeDays) : Math.round(sum("sodium")),
      potassium: viewMode === "Week" ? Math.round(sum("potassium") / activeDays) : Math.round(sum("potassium")),
      vitaminA: viewMode === "Week" ? Math.round(sum("vitaminA") / activeDays) : Math.round(sum("vitaminA")),
      vitaminC: viewMode === "Week" ? Math.round(sum("vitaminC") / activeDays) : Math.round(sum("vitaminC")),
      calcium: viewMode === "Week" ? Math.round(sum("calcium") / activeDays) : Math.round(sum("calcium")),
      iron: viewMode === "Week" ? Math.round(sum("iron") / activeDays) : Math.round(sum("iron")),
    };
  }, [rangeSummaries, dateList, viewMode]);

  const m = microTotals;

  // Nutrients table — avg col shows period average, left = goal - avg
  const nutrients = [
    {
      label: "Protein",
      goal: `${proteinGoal}g`,
      avg: `${avgProtein}g`,
      left: `${Math.max(0, proteinGoal - avgProtein)}g`,
    },
    {
      label: "Carbohydrates",
      goal: `${carbsGoal}g`,
      avg: `${avgCarbs}g`,
      left: `${Math.max(0, carbsGoal - avgCarbs)}g`,
    },
    {
      label: "Fiber",
      goal: "28g",
      avg: m ? `${m.fiber}g` : "0g",
      left: m ? `${Math.max(0, Math.round((28 - m.fiber) * 10) / 10)}g` : "28g",
    },
    {
      label: "Sugar",
      goal: "50g",
      avg: m ? `${m.sugar}g` : "0g",
      left: m ? `${Math.max(0, Math.round((50 - m.sugar) * 10) / 10)}g` : "50g",
    },
    {
      label: "Fat",
      goal: `${fatGoal}g`,
      avg: `${avgFat}g`,
      left: `${Math.max(0, fatGoal - avgFat)}g`,
    },
    {
      label: "Saturated Fat",
      // WHO: ≤ 10% of total calories
      goal: `${Math.round(calGoal * 0.10 / 9)}g`,
      avg: m ? `${m.saturatedFat}g` : "0g",
      left: m ? `${Math.max(0, Math.round((calGoal * 0.10 / 9 - m.saturatedFat) * 10) / 10)}g` : `${Math.round(calGoal * 0.10 / 9)}g`,
    },
    {
      label: "Polyunsat. Fat",
      // ~28–35% of total fat
      goal: `${Math.round(fatGoal * 0.32)}g`,
      avg: m ? `${m.polyunsaturatedFat}g` : "0g",
      left: m ? `${Math.max(0, Math.round((fatGoal * 0.32 - m.polyunsaturatedFat) * 10) / 10)}g` : `${Math.round(fatGoal * 0.32)}g`,
    },
    {
      label: "Monounsat. Fat",
      // ~40–45% of total fat
      goal: `${Math.round(fatGoal * 0.42)}g`,
      avg: m ? `${m.monounsaturatedFat}g` : "0g",
      left: m ? `${Math.max(0, Math.round((fatGoal * 0.42 - m.monounsaturatedFat) * 10) / 10)}g` : `${Math.round(fatGoal * 0.42)}g`,
    },
    {
      label: "Trans Fat",
      goal: "< 2g",
      avg: m ? `${m.transFat}g` : "0g",
      left: m ? (m.transFat >= 2 ? "Over limit" : "OK") : "OK",
    },
    {
      label: "Cholesterol",
      goal: "300mg",
      avg: m ? `${m.cholesterol}mg` : "0mg",
      left: m ? `${Math.max(0, 300 - m.cholesterol)}mg` : "300mg",
    },
    {
      label: "Sodium",
      goal: "2,300mg",
      avg: m ? `${m.sodium.toLocaleString()}mg` : "0mg",
      left: m ? `${Math.max(0, 2300 - m.sodium).toLocaleString()}mg` : "2,300mg",
    },
    {
      label: "Potassium",
      goal: "3,500mg",
      avg: m ? `${m.potassium.toLocaleString()}mg` : "0mg",
      left: m ? `${Math.max(0, 3500 - m.potassium).toLocaleString()}mg` : "3,500mg",
    },
    {
      label: "Vitamin A",
      goal: "100%",
      avg: m ? `${m.vitaminA}%` : "0%",
      left: m ? `${Math.max(0, 100 - m.vitaminA)}%` : "100%",
    },
    {
      label: "Vitamin C",
      goal: "100%",
      avg: m ? `${m.vitaminC}%` : "0%",
      left: m ? `${Math.max(0, 100 - m.vitaminC)}%` : "100%",
    },
    {
      label: "Calcium",
      goal: "100%",
      avg: m ? `${m.calcium}%` : "0%",
      left: m ? `${Math.max(0, 100 - m.calcium)}%` : "100%",
    },
    {
      label: "Iron",
      goal: "100%",
      avg: m ? `${m.iron}%` : "0%",
      left: m ? `${Math.max(0, 100 - m.iron)}%` : "100%",
    },
  ];

  // Macros %
  const totalMacroG = avgCarbs + avgFat + avgProtein;
  const carbsPct =
    totalMacroG > 0 ? Math.round((avgCarbs / totalMacroG) * 100) : 0;
  const fatPct =
    totalMacroG > 0 ? Math.round((avgFat / totalMacroG) * 100) : 0;
  const protPct =
    totalMacroG > 0 ? Math.round((avgProtein / totalMacroG) * 100) : 0;
  const goalCarbsPct = Math.round(
    (carbsGoal / (carbsGoal + fatGoal + proteinGoal)) * 100
  );
  const goalFatPct = Math.round(
    (fatGoal / (carbsGoal + fatGoal + proteinGoal)) * 100
  );
  const goalProtPct = 100 - goalCarbsPct - goalFatPct;

  // Can we go forward? Don't go past today
  const canGoNext = viewMode === "Week" ? weekOffset < 0 : dayOffset < 0;

  const handlePrev = () => {
    hapticLight();
    if (viewMode === "Week") setWeekOffset((o) => o - 1);
    else setDayOffset((o) => o - 1);
  };
  const handleNext = () => {
    if (!canGoNext) return;
    hapticLight();
    if (viewMode === "Week") setWeekOffset((o) => o + 1);
    else setDayOffset((o) => o + 1);
  };

  const toggleViewMode = () => {
    hapticLight();
    if (viewMode === "Week") {
      // Switch to daily, default to today
      setViewMode("Daily");
      setDayOffset(0);
    } else {
      setViewMode("Week");
      setWeekOffset(0);
    }
  };

  return (
    <div className="pb-28 max-w-lg mx-auto animate-page-enter">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <button onClick={() => navigate(-1)}>
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-semibold">Nutrition</h1>
        <button onClick={() => navigate("/more/export")}>
          <Download className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex px-4 mb-4 gap-1">
        {(["Calories", "Nutrients", "Macros"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => {
              hapticLight();
              setTab(t);
            }}
            className="px-4 py-2 rounded-full text-sm font-medium transition-all"
            style={{
              background:
                tab === t ? "rgba(82,183,136,0.15)" : "transparent",
              color: tab === t ? "#52B788" : "rgba(255,255,255,0.5)",
              border:
                tab === t
                  ? "1px solid rgba(82,183,136,0.3)"
                  : "1px solid transparent",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Period selector */}
      <div className="flex items-center justify-between px-4 mb-4">
        <button
          onClick={toggleViewMode}
          className="flex items-center gap-1 text-sm font-medium"
          style={{ color: "#52B788" }}
        >
          {viewMode === "Week" ? "Week View" : "Daily View"}{" "}
          <ChevronRight className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-3">
          <button onClick={handlePrev}>
            <ChevronLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <span className="text-sm text-muted-foreground">{periodLabel}</span>
          <button
            onClick={handleNext}
            style={{ opacity: canGoNext ? 1 : 0.3 }}
            disabled={!canGoNext}
          >
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* ─── CALORIES TAB ─── */}
      {tab === "Calories" && (
        <div className="px-4">
          {/* Total/Net toggle */}
          <div className="flex gap-2 mb-4">
            {(["Total", "Net"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setCalMode(m)}
                className="px-4 py-1.5 rounded-full text-sm font-medium transition-all"
                style={{
                  background:
                    calMode === m ? "#52B788" : "var(--surface-card)",
                  color: calMode === m ? "#000" : "rgba(255,255,255,0.6)",
                  border: "1px solid var(--border)",
                }}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Bar chart */}
          <div
            className="rounded-2xl p-4 mb-4"
            style={{
              background: "var(--surface-card)",
              border: "1px solid var(--border)",
            }}
          >
            <div className="flex items-end justify-between gap-1">
              {dayCals.map((v, i) => (
                <WeekBar
                  key={i}
                  day={chartDayLabels[i]}
                  value={v}
                  max={chartMax}
                />
              ))}
              {viewMode === "Week" && (
                <WeekBar day="Avg" value={avgCal} max={chartMax} isAvg />
              )}
            </div>
          </div>

          {/* Stats */}
          <div
            className="rounded-2xl p-4 mb-4"
            style={{
              background: "var(--surface-card)",
              border: "1px solid var(--border)",
            }}
          >
            {viewMode === "Week" ? (
              <>
                <div
                  className="flex justify-between py-2 border-b"
                  style={{ borderColor: "var(--border)" }}
                >
                  <span className="text-sm text-muted-foreground">
                    Net Calories Under Weekly Goal
                  </span>
                  <span
                    className="text-sm font-semibold"
                    style={{ color: "#52B788" }}
                  >
                    {Math.max(
                      0,
                      calGoal * 7 - dayCals.reduce((a, b) => a + b, 0)
                    ).toLocaleString()}
                  </span>
                </div>
                <div
                  className="flex justify-between py-2 border-b"
                  style={{ borderColor: "var(--border)" }}
                >
                  <span className="text-sm text-muted-foreground">
                    Net Average
                  </span>
                  <span className="text-sm font-semibold">
                    {avgCal.toLocaleString()}
                  </span>
                </div>
              </>
            ) : (
              <div
                className="flex justify-between py-2 border-b"
                style={{ borderColor: "var(--border)" }}
              >
                <span className="text-sm text-muted-foreground">
                  {periodLabel === "Today" ? "Today" : periodLabel}
                </span>
                <span className="text-sm font-semibold">
                  {(dayCals[0] || 0).toLocaleString()} cal
                </span>
              </div>
            )}
            <div className="flex justify-between py-2">
              <span className="text-sm text-muted-foreground">Goal</span>
              <span className="text-sm font-semibold">
                {calGoal.toLocaleString()}
              </span>
            </div>
          </div>

          {!isPremium && <PremiumLockedCard
            label="Foods Highest In Calories"
            onUpgrade={openPaywall}
          />}
        </div>
      )}

      {/* ─── NUTRIENTS TAB ─── */}
      {tab === "Nutrients" && (
        <div className="px-4">
          <div
            className="rounded-2xl px-4 mb-4"
            style={{
              background: "var(--surface-card)",
              border: "1px solid var(--border)",
            }}
          >
            <div
              className="grid grid-cols-4 py-3 border-b"
              style={{ borderColor: "var(--border)" }}
            >
              <div className="col-span-1 text-xs font-bold text-muted-foreground">
                Nutrient
              </div>
              <div className="text-xs font-bold text-muted-foreground text-right">
                {viewMode === "Week" ? "Avg" : "Total"}
              </div>
              <div className="text-xs font-bold text-muted-foreground text-right">
                Goal
              </div>
              <div className="text-xs font-bold text-muted-foreground text-right">
                Left
              </div>
            </div>
            {nutrients.map((n) => (
              <NutrientRow
                key={n.label}
                label={n.label}
                avg={n.avg}
                goal={n.goal}
                left={n.left}
              />
            ))}
          </div>
        </div>
      )}

      {/* ─── MACROS TAB ─── */}
      {tab === "Macros" && (
        <div className="px-4">
          <div
            className="rounded-2xl p-4 mb-4 flex items-center justify-center"
            style={{
              background: "var(--surface-card)",
              border: "1px solid var(--border)",
              minHeight: 100,
            }}
          >
            {totalMacroG === 0 ? (
              <span className="text-sm text-muted-foreground">
                No Data Available
              </span>
            ) : (
              <div className="flex gap-1 w-full h-6 rounded-full overflow-hidden">
                <div style={{ width: `${carbsPct}%`, background: "#F9C74F" }} />
                <div style={{ width: `${fatPct}%`, background: "#FF6B6B" }} />
                <div
                  style={{ width: `${protPct}%`, background: "#52B788" }}
                />
              </div>
            )}
          </div>

          {[
            {
              label: "Carbs",
              color: "#F9C74F",
              val: avgCarbs,
              pct: carbsPct,
              goalPct: goalCarbsPct,
            },
            {
              label: "Fat",
              color: "#FF6B6B",
              val: avgFat,
              pct: fatPct,
              goalPct: goalFatPct,
            },
            {
              label: "Protein",
              color: "#52B788",
              val: avgProtein,
              pct: protPct,
              goalPct: goalProtPct,
            },
          ].map((m) => (
            <div
              key={m.label}
              className="flex items-center py-3 border-b last:border-b-0"
              style={{ borderColor: "var(--border)" }}
            >
              <div
                className="w-3 h-3 rounded-full mr-3"
                style={{ background: m.color }}
              />
              <div className="flex-1">
                <div className="text-sm font-medium">
                  {m.label} ({m.val}g)
                </div>
                <div className="text-xs text-muted-foreground">
                  {m.pct}% consumed / {m.goalPct}% goal
                </div>
              </div>
            </div>
          ))}

          <div className="mt-4 space-y-0">
            {[
              "Foods Highest In Carbs",
              "Foods Highest In Fat",
              "Foods Highest In Protein",
            ].map((l) => (
              isPremium ? null : <PremiumLockedCard key={l} label={l} onUpgrade={openPaywall} />
            ))}
          </div>
        </div>
      )}
      {paywallNode}
    </div>
  );
}
