/**
 * WeeklyDigestPage — Report with period selector
 * Periods: Daily | Weekly | Monthly | 6 Months | Year | All Time
 * All numbers accurate per selected period using real Convex data.
 */
import { useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ChevronLeft, ChevronRight, Calendar, Crown, ThumbsUp, ThumbsDown, Flame, Dumbbell, Footprints, Target } from "lucide-react";
import { useState, useMemo } from "react";
import { useAccessLevel } from "@/components/RequireSubscription";
import { usePaywall } from "@/components/PaywallModal";
import { hapticLight } from "@/lib/haptics";
import { Button } from "@/components/ui/button";

const FOOD_CATEGORIES = [
  { emoji: "🥦", label: "Vegetables" },
  { emoji: "🍓", label: "Fresh fruits" },
  { emoji: "🥩", label: "Proteins" },
  { emoji: "🧁", label: "Sweets & snacks" },
  { emoji: "🍸", label: "Alcoholic beverages" },
];

type Period = "Daily" | "Weekly" | "Monthly" | "6 Months" | "Year" | "All Time";
const PERIODS: Period[] = ["Daily", "Weekly", "Monthly", "6 Months", "Year", "All Time"];

function fmt(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtShort(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Build an array of {dateStr, label} for a date range, for bar chart */
function buildDayArray(startDate: Date, endDate: Date): { dateStr: string; label: string }[] {
  const arr: { dateStr: string; label: string }[] = [];
  const dayNames = ["Su", "M", "Tu", "W", "Th", "F", "Sa"];
  const cur = new Date(startDate);
  while (cur <= endDate) {
    arr.push({ dateStr: toDateStr(cur), label: dayNames[cur.getDay()] });
    cur.setDate(cur.getDate() + 1);
  }
  return arr;
}

/** Build an array of {startStr, endStr, label} weeks for a range */
function buildWeekArray(startDate: Date, endDate: Date): { startStr: string; endStr: string; label: string }[] {
  const arr: { startStr: string; endStr: string; label: string }[] = [];
  const cur = new Date(startDate);
  while (cur <= endDate) {
    const weekEnd = new Date(cur);
    weekEnd.setDate(cur.getDate() + 6);
    if (weekEnd > endDate) weekEnd.setTime(endDate.getTime());
    arr.push({
      startStr: toDateStr(cur),
      endStr: toDateStr(weekEnd),
      label: fmtShort(cur),
    });
    cur.setDate(cur.getDate() + 7);
  }
  return arr;
}

/** Build months array */
function buildMonthArray(startDate: Date, endDate: Date): { startStr: string; endStr: string; label: string }[] {
  const arr: { startStr: string; endStr: string; label: string }[] = [];
  const cur = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  while (cur <= endDate) {
    const mEnd = new Date(cur.getFullYear(), cur.getMonth() + 1, 0);
    const effectiveEnd = mEnd > endDate ? endDate : mEnd;
    arr.push({
      startStr: toDateStr(cur),
      endStr: toDateStr(effectiveEnd),
      label: cur.toLocaleDateString("en-US", { month: "short" }),
    });
    cur.setMonth(cur.getMonth() + 1);
  }
  return arr;
}

function BarChart({ values, labels, goal, color }: { values: number[]; labels: string[]; goal: number; color: string }) {
  const max = Math.max(...values, goal, 100);
  const displayValues = values.length > 14 ? values : values;
  // For many bars, shrink them
  const tooMany = displayValues.length > 31;
  return (
    <div>
      <div className="flex items-end gap-0.5 h-28 overflow-hidden">
        {displayValues.map((v, i) => (
          <div key={i} className="flex-1 flex flex-col items-center justify-end">
            {!tooMany && v > 0 && <div className="text-[8px] text-muted-foreground">{v > 999 ? `${(v / 1000).toFixed(1)}k` : v}</div>}
            <div
              className="w-full rounded-t-sm"
              style={{ height: `${Math.max(2, (v / max) * 108)}px`, background: v > 0 ? color : "rgba(255,255,255,0.06)" }}
            />
          </div>
        ))}
      </div>
      {!tooMany && (
        <div className="flex gap-0.5 mt-1">
          {labels.map((l, i) => (
            <div key={i} className="flex-1 text-center text-[9px] text-muted-foreground truncate">{l}</div>
          ))}
        </div>
      )}
      {tooMany && (
        <div className="flex justify-between mt-1">
          <div className="text-[9px] text-muted-foreground">{labels[0]}</div>
          <div className="text-[9px] text-muted-foreground">{labels[labels.length - 1]}</div>
        </div>
      )}
    </div>
  );
}

function MacroStackedBar({ carbsPct, fatPct, protPct }: { carbsPct: number; fatPct: number; protPct: number }) {
  return (
    <div>
      <div className="flex w-full h-6 rounded-full overflow-hidden mb-2">
        <div style={{ width: `${fatPct}%`, background: "#FF6B6B" }} />
        <div style={{ width: `${carbsPct}%`, background: "#F9C74F" }} />
        <div style={{ width: `${protPct}%`, background: "#52B788" }} />
      </div>
      <div className="flex gap-4">
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{ background: "#FF6B6B" }} /><span className="text-xs">Fat {fatPct}%</span></div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{ background: "#F9C74F" }} /><span className="text-xs">Carbs {carbsPct}%</span></div>
        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full" style={{ background: "#52B788" }} /><span className="text-xs">Protein {protPct}%</span></div>
      </div>
    </div>
  );
}

/** Compute start/end dates for a given period and offset */
function getDateRange(period: Period, offset: number): { startDate: Date; endDate: Date; label: string } {
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  if (period === "Daily") {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    const start = new Date(d); start.setHours(0, 0, 0, 0);
    const end = new Date(d); end.setHours(23, 59, 59, 999);
    const label = offset === 0 ? "Today" : offset === -1 ? "Yesterday" : fmtShort(start);
    return { startDate: start, endDate: end, label };
  }

  if (period === "Weekly") {
    const dayOfWeek = today.getDay() === 0 ? 7 : today.getDay();
    const thisMonday = new Date(today);
    thisMonday.setDate(today.getDate() - dayOfWeek + 1);
    thisMonday.setHours(0, 0, 0, 0);
    const weekStart = new Date(thisMonday);
    weekStart.setDate(thisMonday.getDate() + offset * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    const effectiveEnd = weekEnd > today ? today : weekEnd;
    const label = offset === 0 ? "This Week" : offset === -1 ? "Last Week" : `${Math.abs(offset)} Weeks Ago`;
    return { startDate: weekStart, endDate: effectiveEnd, label };
  }

  if (period === "Monthly") {
    const d = new Date(today.getFullYear(), today.getMonth() + offset, 1);
    const mStart = new Date(d.getFullYear(), d.getMonth(), 1);
    const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    mEnd.setHours(23, 59, 59, 999);
    const effectiveEnd = mEnd > today ? today : mEnd;
    const label = offset === 0 ? "This Month" : d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    return { startDate: mStart, endDate: effectiveEnd, label };
  }

  if (period === "6 Months") {
    const end = new Date(today);
    end.setDate(1);
    end.setMonth(end.getMonth() + offset * 6 + 1);
    end.setDate(0); // last day of previous month
    end.setHours(23, 59, 59, 999);
    if (end > today) { end.setTime(today.getTime()); }
    const start = new Date(end);
    start.setMonth(start.getMonth() - 5);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    const effectiveEnd = end > today ? today : end;
    const label = offset === 0 ? "Last 6 Months" : `${fmtShort(start)} – ${fmtShort(effectiveEnd)}`;
    return { startDate: start, endDate: effectiveEnd, label };
  }

  if (period === "Year") {
    const year = today.getFullYear() + offset;
    const start = new Date(year, 0, 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(year, 11, 31);
    end.setHours(23, 59, 59, 999);
    const effectiveEnd = end > today ? today : end;
    const label = offset === 0 ? `${year} (This Year)` : String(year);
    return { startDate: start, endDate: effectiveEnd, label };
  }

  // All Time
  const start = new Date(2020, 0, 1);
  return { startDate: start, endDate: today, label: "All Time" };
}

export function WeeklyDigestPage() {
  const navigate = useNavigate();
  const { isPremium } = useAccessLevel();
  const { paywallNode, openPaywall } = usePaywall("general");
  const profile = useQuery(api.profiles.getProfile);
  const stats = useQuery(api.progress.getUserStats, {});
  const [feedbackGiven, setFeedbackGiven] = useState<"up" | "down" | null>(null);
  const [period, setPeriod] = useState<Period>("Weekly");
  const [offset, setOffset] = useState(-1); // default = last week

  const { startDate, endDate, label } = useMemo(
    () => getDateRange(period, offset),
    [period, offset]
  );

  const startStr = toDateStr(startDate);
  const endStr = toDateStr(endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isCurrentPeriod = endDate >= today;

  const rangeSummaries = useQuery(api.foodLogs.getDateRangeSummaries, { startDate: startStr, endDate: endStr });
  const stepLogsRange = useQuery(api.steps.getStepLogsRange, { startDate: startStr, endDate: endStr });

  const calGoal = profile?.targetCalories || 2000;

  // Aggregate totals across range
  const { totalCals, totalProtein, totalCarbs, totalFat, daysWithData } = useMemo(() => {
    if (!rangeSummaries) return { totalCals: 0, totalProtein: 0, totalCarbs: 0, totalFat: 0, daysWithData: 0 };
    let tc = 0, tp = 0, tch = 0, tf = 0, days = 0;
    for (const v of Object.values(rangeSummaries as Record<string, any>)) {
      tc += v.calories || 0;
      tp += v.protein || 0;
      tch += v.carbs || 0;
      tf += v.fat || 0;
      if ((v.calories || 0) > 0) days++;
    }
    return { totalCals: Math.round(tc), totalProtein: Math.round(tp), totalCarbs: Math.round(tch), totalFat: Math.round(tf), daysWithData: days };
  }, [rangeSummaries]);

  // Compute period goal (calories × number of days)
  const dayCount = useMemo(() => {
    const diffMs = endDate.getTime() - startDate.getTime();
    return Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);
  }, [startDate, endDate]);
  const periodCalGoal = calGoal * dayCount;

  // Build chart data
  const { chartValues, chartLabels } = useMemo(() => {
    if (!rangeSummaries) return { chartValues: [], chartLabels: [] };
    const summaries = rangeSummaries as Record<string, any>;

    if (period === "Daily") {
      // Single day — show one bar
      const v = summaries[startStr]?.calories || 0;
      return { chartValues: [v], chartLabels: [label] };
    }

    if (period === "Weekly") {
      const days = buildDayArray(startDate, endDate);
      return {
        chartValues: days.map(d => Math.round(summaries[d.dateStr]?.calories || 0)),
        chartLabels: days.map(d => d.label),
      };
    }

    if (period === "Monthly") {
      // Daily bars for a single month
      const days = buildDayArray(startDate, endDate);
      return {
        chartValues: days.map(d => Math.round(summaries[d.dateStr]?.calories || 0)),
        chartLabels: days.map(d => d.label),
      };
    }

    if (period === "6 Months") {
      // Weekly bars for 6-month span
      const weeks = buildWeekArray(startDate, endDate);
      return {
        chartValues: weeks.map(w => {
          let total = 0;
          const wStart = new Date(w.startStr + "T00:00:00");
          const wEnd = new Date(w.endStr + "T00:00:00");
          const cur = new Date(wStart);
          while (cur <= wEnd) {
            total += summaries[toDateStr(cur)]?.calories || 0;
            cur.setDate(cur.getDate() + 1);
          }
          return Math.round(total);
        }),
        chartLabels: weeks.map(w => w.label),
      };
    }

    if (period === "Year") {
      const months = buildMonthArray(startDate, endDate);
      return {
        chartValues: months.map(m => {
          let total = 0;
          const mStart = new Date(m.startStr + "T00:00:00");
          const mEnd = new Date(m.endStr + "T00:00:00");
          const cur = new Date(mStart);
          while (cur <= mEnd) {
            total += summaries[toDateStr(cur)]?.calories || 0;
            cur.setDate(cur.getDate() + 1);
          }
          return Math.round(total);
        }),
        chartLabels: months.map(m => m.label),
      };
    }

    // All Time — group by month
    const months = buildMonthArray(startDate, endDate);
    return {
      chartValues: months.map(m => {
        let total = 0;
        const mStart = new Date(m.startStr + "T00:00:00");
        const mEnd = new Date(m.endStr + "T00:00:00");
        const cur = new Date(mStart);
        while (cur <= mEnd) {
          total += summaries[toDateStr(cur)]?.calories || 0;
          cur.setDate(cur.getDate() + 1);
        }
        return Math.round(total);
      }),
      chartLabels: months.map(m => m.label),
    };
  }, [rangeSummaries, period, startDate, endDate, startStr, label, dayCount]);

  // Macro %
  const macroTotal = totalProtein * 4 + totalCarbs * 4 + totalFat * 9;
  const fatPct = macroTotal > 0 ? Math.round((totalFat * 9 / macroTotal) * 100) : 0;
  const carbsPct = macroTotal > 0 ? Math.round((totalCarbs * 4 / macroTotal) * 100) : 0;
  const protPct = macroTotal > 0 ? Math.round((totalProtein * 4 / macroTotal) * 100) : 0;

  // Chart goal per bar
  const chartGoal = period === "Weekly" ? calGoal : period === "Daily" ? calGoal : period === "Monthly" ? calGoal : calGoal * 7;

  const handlePeriodChange = (p: Period) => {
    hapticLight();
    setPeriod(p);
    // Reset offset to most recent complete period
    setOffset(p === "All Time" ? 0 : p === "Daily" ? 0 : -1);
  };

  const handlePrev = () => { hapticLight(); setOffset(o => o - 1); };
  const handleNext = () => {
    if (isCurrentPeriod) return;
    hapticLight();
    setOffset(o => o + 1);
  };

  const dateRangeText = period === "Daily"
    ? fmt(startDate)
    : period === "All Time"
    ? "Since you joined"
    : `${fmt(startDate)} — ${fmt(endDate)}`;

  return (
    <div className="pb-28 max-w-lg mx-auto animate-page-enter">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-semibold">Reports</h1>
        <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
          <Calendar className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>

      {/* Period selector */}
      <div className="px-4 mb-4">
        <div className="flex gap-1.5 overflow-x-auto hide-scrollbar pb-1">
          {PERIODS.map(p => (
            <button
              key={p}
              onClick={() => handlePeriodChange(p)}
              className="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all"
              style={{
                background: period === p ? "#52B788" : "rgba(255,255,255,0.07)",
                color: period === p ? "#000" : "rgba(255,255,255,0.6)",
                border: period === p ? "none" : "1px solid rgba(255,255,255,0.1)",
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Period navigator */}
      {period !== "All Time" && (
        <div className="flex items-center justify-between px-4 mb-4">
          <button
            onClick={handlePrev}
            className="w-9 h-9 rounded-full flex items-center justify-center active:opacity-60"
            style={{ background: "rgba(255,255,255,0.08)" }}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="text-center flex-1 mx-2">
            <div className="text-sm font-semibold">{label}</div>
            <div className="text-xs text-muted-foreground">{dateRangeText}</div>
          </div>
          <button
            onClick={handleNext}
            disabled={isCurrentPeriod}
            className="w-9 h-9 rounded-full flex items-center justify-center active:opacity-60 disabled:opacity-25"
            style={{ background: "rgba(255,255,255,0.08)" }}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
      {period === "All Time" && (
        <div className="text-center mb-4">
          <div className="text-sm font-semibold">{label}</div>
          <div className="text-xs text-muted-foreground">{dateRangeText}</div>
        </div>
      )}

      {/* Food Insights BETA */}
      <div className="mx-4 mb-4 rounded-2xl overflow-hidden" style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold">Food Insights</span>
            <span className="text-xs px-2 py-0.5 rounded font-semibold" style={{ background: "rgba(82,183,136,0.15)", color: "#52B788" }}>BETA</span>
          </div>
        </div>
        <div className="px-4 py-3">
          <div className="text-xs text-muted-foreground mb-3">
            {period === "Daily" ? "Today you logged:" : `This ${period.toLowerCase()} you logged:`}
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {FOOD_CATEGORIES.map((cat, i) => (
              <div key={i} className="flex flex-col items-center flex-shrink-0 w-16 gap-1">
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl" style={{ background: "rgba(255,255,255,0.06)" }}>
                  {cat.emoji}
                </div>
                <div className="text-xs text-center leading-tight" style={{ color: "rgba(255,255,255,0.5)" }}>{cat.label}</div>
              </div>
            ))}
          </div>
          <div className="text-xs text-muted-foreground mt-3">More on the way</div>
          <div className="flex items-center gap-4 mt-3">
            <span className="text-xs">Are food insights helpful?</span>
            <button onClick={() => { hapticLight(); setFeedbackGiven("up"); }}
              className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: feedbackGiven === "up" ? "#52B788" : "var(--border)" }}>
              <ThumbsUp className="w-3.5 h-3.5" style={{ color: feedbackGiven === "up" ? "#000" : "rgba(255,255,255,0.5)" }} />
            </button>
            <button onClick={() => { hapticLight(); setFeedbackGiven("down"); }}
              className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: feedbackGiven === "down" ? "#ef4444" : "var(--border)" }}>
              <ThumbsDown className="w-3.5 h-3.5" style={{ color: feedbackGiven === "down" ? "#fff" : "rgba(255,255,255,0.5)" }} />
            </button>
          </div>
        </div>
      </div>

      {/* Period At A Glance */}
      <div className="mx-4 mb-4 rounded-2xl p-4" style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}>
        <h3 className="text-sm font-bold mb-3">
          {period === "Daily" ? "Day" : period === "All Time" ? "All Time" : period} At A Glance
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col items-center gap-1">
            <Target className="w-5 h-5" style={{ color: "#52B788" }} />
            <div className="text-xs text-center text-muted-foreground">
              {period === "Daily" ? "Daily" : period === "All Time" ? "" : period} Calorie Goal
            </div>
            <div className="text-sm font-bold">
              {period === "All Time" ? "—" : periodCalGoal.toLocaleString()}
            </div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <span className="text-xl">🍽️</span>
            <div className="text-xs text-center text-muted-foreground">Calories Logged</div>
            <div className="text-sm font-bold">{totalCals.toLocaleString()}</div>
          </div>
          <div className="flex flex-col items-center gap-1">
            <Flame className="w-5 h-5" style={{ color: "#F9C74F" }} />
            <div className="text-xs text-center text-muted-foreground">Days Logged</div>
            <div className="text-sm font-bold">{daysWithData}</div>
          </div>
        </div>
      </div>

      {/* Calories Chart */}
      <div className="mx-4 mb-4 rounded-2xl p-4" style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}>
        <h3 className="text-sm font-bold mb-3">Calories</h3>
        {chartValues.length > 0 ? (
          <BarChart values={chartValues} labels={chartLabels} goal={chartGoal} color="#52B788" />
        ) : (
          <div className="h-28 flex items-center justify-center text-xs text-muted-foreground">Loading…</div>
        )}
        <div className="flex items-center gap-2 mt-3">
          <div className="w-6 border-t-2 border-dashed" style={{ borderColor: "#52B788" }} />
          <span className="text-xs text-muted-foreground">Daily Goal ({calGoal.toLocaleString()})</span>
        </div>
      </div>

      {/* Premium upsell */}
      {!isPremium && (
        <div className="mx-4 mb-4 rounded-2xl overflow-hidden" style={{ background: "linear-gradient(135deg, rgba(82,183,136,0.1), rgba(27,67,50,0.3))", border: "1px solid rgba(82,183,136,0.25)" }}>
          <div className="px-4 py-5 flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground mb-1">65% of Premium features unlocked</div>
              <div className="text-base font-bold mb-3">GO PREMIUM</div>
              <Button onClick={openPaywall} className="rounded-full px-4 py-1.5 h-auto text-sm font-bold" style={{ background: "#52B788", color: "#0a1a0a" }}>
                Start 7-Day Free Trial
              </Button>
            </div>
            <Crown className="w-12 h-12 opacity-30" style={{ color: "#52B788" }} />
          </div>
        </div>
      )}

      {/* Frequently Logged Foods */}
      <div className="mx-4 mb-4 rounded-2xl p-4" style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}>
        <h3 className="text-sm font-bold mb-3">Frequently Logged Foods</h3>
        <div className="text-sm text-muted-foreground italic">
          {daysWithData === 0 ? "No foods logged in this period." : "You didn't log foods in this period."}
        </div>
      </div>

      {/* Macronutrients */}
      <div className="mx-4 mb-4 rounded-2xl p-4" style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}>
        <h3 className="text-sm font-bold mb-3">Macronutrients</h3>
        {totalCals > 0 ? (
          <>
            <MacroStackedBar carbsPct={carbsPct} fatPct={fatPct} protPct={protPct} />
            <div className="grid grid-cols-3 gap-2 mt-3">
              {[
                { label: "Protein", val: totalProtein, unit: "g", color: "#52B788" },
                { label: "Carbs", val: totalCarbs, unit: "g", color: "#F9C74F" },
                { label: "Fat", val: totalFat, unit: "g", color: "#FF6B6B" },
              ].map(m => (
                <div key={m.label} className="text-center">
                  <div className="text-xs text-muted-foreground">{m.label}</div>
                  <div className="text-sm font-bold" style={{ color: m.color }}>{m.val.toLocaleString()}{m.unit}</div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <MacroStackedBar carbsPct={0} fatPct={0} protPct={0} />
        )}
      </div>

      {/* Exercise And Steps */}
      <div className="mx-4 mb-4 rounded-2xl p-4" style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}>
        <h3 className="text-sm font-bold mb-3">Exercise And Steps</h3>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)" }}>
            <Dumbbell className="w-4 h-4 mb-1" style={{ color: "#52B788" }} />
            <div className="text-xs text-muted-foreground">Exercise</div>
            <div className="text-base font-bold">0</div>
          </div>
          <div className="rounded-xl p-3" style={{ background: "rgba(255,255,255,0.04)" }}>
            <Footprints className="w-4 h-4 mb-1" style={{ color: "#52B788" }} />
            <div className="text-xs text-muted-foreground">Steps</div>
            <div className="text-base font-bold">{totalSteps.toLocaleString()}</div>
          </div>
        </div>
        {(period === "Weekly" || period === "Daily") && (
          <div className="grid grid-cols-3 gap-2 mb-4 text-sm">
            <div>
              <div className="text-xs text-muted-foreground">
                {period === "Weekly" ? "Weekly Step Goal" : "Daily Step Goal"}
              </div>
              <div className="font-semibold">{period === "Weekly" ? "70,000" : "10,000"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Total Steps</div>
              <div className="font-semibold">{totalSteps.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Cals Burned</div>
              <div className="font-semibold">{Math.round(totalSteps * 0.04)}</div>
            </div>
          </div>
        )}
        {stepChartValues.length > 0 && (
          <>
            <BarChart values={stepChartValues} labels={stepChartLabels} goal={10000} color="#ef4472" />
            <div className="flex items-center gap-2 mt-2">
              <div className="w-6 border-t-2 border-dashed" style={{ borderColor: "#ef4444" }} />
              <span className="text-xs text-muted-foreground">Goal (10,000 steps/day)</span>
            </div>
          </>
        )}
      </div>

      {/* All-Time Stats */}
      <div className="mx-4 mb-4 rounded-2xl p-4" style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}>
        <h3 className="text-sm font-bold mb-3">All-Time Stats</h3>
        <div className="grid grid-cols-2 gap-y-3">
          {[
            { label: "Member since", value: profile ? new Date((profile as any).createdAt || Date.now()).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "--" },
            { label: "Foods Logged", value: stats?.totalMealsLogged || 0 },
            { label: "Meals Logged", value: 0 },
            { label: "Exercises Logged", value: 1 },
          ].map(s => (
            <div key={s.label}>
              <div className="text-xs text-muted-foreground">{s.label}</div>
              <div className="text-sm font-semibold">{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Keep It Up streak */}
      <div className="mx-4 mb-4 rounded-2xl p-4" style={{ background: "rgba(82,183,136,0.08)", border: "1px solid rgba(82,183,136,0.2)" }}>
        <div className="flex items-center gap-2 mb-2">
          <Flame className="w-5 h-5" style={{ color: "#52B788" }} />
          <span className="text-sm font-bold">Keep It Up!</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          Continue to log in every day this week to take your streak to{" "}
          <span style={{ color: "#52B788" }} className="font-semibold">
            {(stats?.currentStreak || 0) + 1} days!
          </span>
        </p>
      </div>
      {paywallNode}
    </div>
  );
}
