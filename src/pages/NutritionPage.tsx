/**
 * NutritionPage — Detailed nutrition analytics (photos 24–27)
 *
 * Tabs: Calories | Nutrients | Macros
 * Week View ▼ / Last 7 Days with prev/next
 * Calories: Total/Net toggle, bar chart (F22–T28+Avg), stats table
 * Nutrients: Avg/Goal/Left table (all nutrients)
 * Macros: bar chart, Carbs/Fat/Protein %, Premium "Foods Highest In X"
 */
import { useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ChevronLeft, ChevronRight, Download, Crown } from "lucide-react";
import { useState } from "react";
import { hapticLight } from "@/lib/haptics";
import { useAccessLevel } from "@/components/RequireSubscription";
import { getLocalDateString } from "@/lib/dateUtils";

type Tab = "Calories" | "Nutrients" | "Macros";

function WeekBar({ day, value, max, isAvg }: { day: string; value: number; max: number; isAvg?: boolean }) {
  const pct = max > 0 ? value / max : 0;
  return (
    <div className="flex flex-col items-center gap-1 flex-1">
      <div className="text-xs text-muted-foreground font-medium">{value > 0 ? value.toLocaleString() : ""}</div>
      <div className="w-full flex flex-col items-center justify-end" style={{ height: 80 }}>
        <div
          className="w-full max-w-[28px] rounded-t-sm transition-all duration-500"
          style={{
            height: `${Math.max(2, pct * 80)}px`,
            background: isAvg ? "rgba(82,183,136,0.4)" : value > 0 ? "#52B788" : "rgba(255,255,255,0.06)",
          }}
        />
      </div>
      <div className="text-xs" style={{ color: isAvg ? "#52B788" : "rgba(255,255,255,0.5)" }}>{day}</div>
    </div>
  );
}

function NutrientRow({ label, avg, goal, left }: { label: string; avg: number | string; goal: number | string; left: number | string }) {
  return (
    <div className="grid grid-cols-4 py-3 border-b last:border-b-0 text-sm" style={{ borderColor: "var(--border)" }}>
      <div className="col-span-1 font-medium text-xs">{label}</div>
      <div className="text-xs text-right">{avg}</div>
      <div className="text-xs text-right">{goal}</div>
      <div className="text-xs text-right">{left}</div>
    </div>
  );
}

function PremiumLockedCard({ label, navigate }: { label: string; navigate: (p: string) => void }) {
  return (
    <div className="rounded-xl px-4 py-3 flex items-center justify-between mb-3" style={{ background: "rgba(229,180,84,0.08)", border: "1px solid rgba(229,180,84,0.2)" }}>
      <div className="flex items-center gap-2">
        <Crown className="w-4 h-4" style={{ color: "#E5B454" }} />
        <span className="text-sm">{label}</span>
      </div>
      <button onClick={() => navigate("/onboarding/upgrade")} className="text-xs font-bold px-3 py-1 rounded-full" style={{ background: "#E5B454", color: "#000" }}>
        Upgrade
      </button>
    </div>
  );
}

export function NutritionPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("Calories");
  const [calMode, setCalMode] = useState<"Total" | "Net">("Net");
  const { isPremium: _isPremium } = useAccessLevel(); void _isPremium;
  const profile = useQuery(api.profiles.getProfile);

//   // eslint-disable-line
  const days = ["F", "S", "S", "M", "T", "W", "T", "Avg"];

  // Build last 7 days' data from food logs (simplified — use 0 for missing)
  const localDate = getLocalDateString();
  const summary = useQuery(api.foodLogs.getDailySummary, { localDate });
  const todayCals = summary?.totals?.calories || 0;
  const calGoal = profile?.targetCalories || 2000;
  const proteinGoal = profile?.targetProtein || 150;
  const carbsGoal = profile?.targetCarbs || 200;
  const fatGoal = profile?.targetFat || 60;

  // Weekly data (today only real, rest 0)
  const weekCals = [0, 0, 0, 0, 0, 0, todayCals];
  const avgCal = weekCals.some(v => v > 0) ? Math.round(weekCals.reduce((a, b) => a + b, 0) / weekCals.filter(v => v > 0).length) : 0;
  const chartMax = Math.max(...weekCals, calGoal, 100);

  // Nutrients table rows
  const nutrients = [
    { label: "Protein", goal: `${proteinGoal}g`, avg: `${Math.round(summary?.totals?.protein || 0)}g`, left: `${Math.max(0, proteinGoal - Math.round(summary?.totals?.protein || 0))}g` },
    { label: "Carbohydrates", goal: `${carbsGoal}g`, avg: `${Math.round(summary?.totals?.carbs || 0)}g`, left: `${Math.max(0, carbsGoal - Math.round(summary?.totals?.carbs || 0))}g` },
    { label: "Fiber", goal: "28g", avg: "0g", left: "28g" },
    { label: "Sugar", goal: "50g", avg: "0g", left: "50g" },
    { label: "Fat", goal: `${fatGoal}g`, avg: `${Math.round(summary?.totals?.fat || 0)}g`, left: `${Math.max(0, fatGoal - Math.round(summary?.totals?.fat || 0))}g` },
    { label: "Saturated Fat", goal: "20g", avg: "0g", left: "20g" },
    { label: "Polyunsat. Fat", goal: "--", avg: "0g", left: "--" },
    { label: "Monounsat. Fat", goal: "--", avg: "0g", left: "--" },
    { label: "Trans Fat", goal: "0g", avg: "0g", left: "0g" },
    { label: "Cholesterol", goal: "300mg", avg: "0mg", left: "300mg" },
    { label: "Sodium", goal: "2,300mg", avg: "0mg", left: "2,300mg" },
    { label: "Potassium", goal: "3,500mg", avg: "0mg", left: "3,500mg" },
    { label: "Vitamin A", goal: "100%", avg: "0%", left: "100%" },
    { label: "Vitamin C", goal: "100%", avg: "0%", left: "100%" },
    { label: "Calcium", goal: "100%", avg: "0%", left: "100%" },
    { label: "Iron", goal: "100%", avg: "0%", left: "100%" },
  ];

  // Macros %
  const totalMacroG = (summary?.totals?.carbs || 0) + (summary?.totals?.fat || 0) + (summary?.totals?.protein || 0);
  const carbsPct = totalMacroG > 0 ? Math.round((summary?.totals?.carbs || 0) / totalMacroG * 100) : 0;
  const fatPct = totalMacroG > 0 ? Math.round((summary?.totals?.fat || 0) / totalMacroG * 100) : 0;
  const protPct = totalMacroG > 0 ? Math.round((summary?.totals?.protein || 0) / totalMacroG * 100) : 0;
  const goalCarbsPct = Math.round(carbsGoal / (carbsGoal + fatGoal + proteinGoal) * 100);
  const goalFatPct = Math.round(fatGoal / (carbsGoal + fatGoal + proteinGoal) * 100);
  const goalProtPct = 100 - goalCarbsPct - goalFatPct;

  return (
    <div className="pb-28 max-w-lg mx-auto animate-page-enter">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <button onClick={() => navigate(-1)}><ChevronLeft className="w-5 h-5" /></button>
        <h1 className="text-base font-semibold">Nutrition</h1>
        <button onClick={() => navigate("/more/export")}>
          <Download className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex px-4 mb-4 gap-1">
        {(["Calories", "Nutrients", "Macros"] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => { hapticLight(); setTab(t); }}
            className="px-4 py-2 rounded-full text-sm font-medium transition-all"
            style={{
              background: tab === t ? "rgba(82,183,136,0.15)" : "transparent",
              color: tab === t ? "#52B788" : "rgba(255,255,255,0.5)",
              border: tab === t ? "1px solid rgba(82,183,136,0.3)" : "1px solid transparent",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Period selector */}
      <div className="flex items-center justify-between px-4 mb-4">
        <button className="flex items-center gap-1 text-sm font-medium" style={{ color: "#52B788" }}>
          Week View <ChevronRight className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-3">
          <button><ChevronLeft className="w-4 h-4 text-muted-foreground" /></button>
          <span className="text-sm text-muted-foreground">Last 7 Days</span>
          <button><ChevronRight className="w-4 h-4 text-muted-foreground" /></button>
        </div>
      </div>

      {/* ─── CALORIES TAB ─── */}
      {tab === "Calories" && (
        <div className="px-4">
          {/* Total/Net toggle */}
          <div className="flex gap-2 mb-4">
            {(["Total", "Net"] as const).map(m => (
              <button key={m} onClick={() => setCalMode(m)} className="px-4 py-1.5 rounded-full text-sm font-medium transition-all"
                style={{ background: calMode === m ? "#52B788" : "var(--surface-card)", color: calMode === m ? "#000" : "rgba(255,255,255,0.6)", border: "1px solid var(--border)" }}>
                {m}
              </button>
            ))}
          </div>

          {/* Bar chart */}
          <div className="rounded-2xl p-4 mb-4" style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}>
            <div className="flex items-end justify-between gap-1">
              {weekCals.map((v, i) => (
                <WeekBar key={i} day={days[i]} value={v} max={chartMax} isAvg={i === 7} />
              ))}
              <WeekBar day="Avg" value={avgCal} max={chartMax} isAvg />
            </div>
          </div>

          {/* Stats */}
          <div className="rounded-2xl p-4 mb-4" style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}>
            <div className="flex justify-between py-2 border-b" style={{ borderColor: "var(--border)" }}>
              <span className="text-sm text-muted-foreground">Net Calories Under Weekly Goal</span>
              <span className="text-sm font-semibold" style={{ color: "#52B788" }}>{Math.max(0, calGoal * 7 - weekCals.reduce((a, b) => a + b, 0)).toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-2 border-b" style={{ borderColor: "var(--border)" }}>
              <span className="text-sm text-muted-foreground">Net Average</span>
              <span className="text-sm font-semibold">{avgCal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm text-muted-foreground">Goal</span>
              <span className="text-sm font-semibold">{calGoal.toLocaleString()}</span>
            </div>
          </div>

          {/* Premium: Foods highest in calories */}
          <PremiumLockedCard label="Foods Highest In Calories" navigate={navigate} />
        </div>
      )}

      {/* ─── NUTRIENTS TAB ─── */}
      {tab === "Nutrients" && (
        <div className="px-4">
          <div className="rounded-2xl px-4 mb-4" style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}>
            <div className="grid grid-cols-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
              <div className="col-span-1 text-xs font-bold text-muted-foreground">Nutrient</div>
              <div className="text-xs font-bold text-muted-foreground text-right">Avg</div>
              <div className="text-xs font-bold text-muted-foreground text-right">Goal</div>
              <div className="text-xs font-bold text-muted-foreground text-right">Left</div>
            </div>
            {nutrients.map(n => (
              <NutrientRow key={n.label} label={n.label} avg={n.avg} goal={n.goal} left={n.left} />
            ))}
          </div>
        </div>
      )}

      {/* ─── MACROS TAB ─── */}
      {tab === "Macros" && (
        <div className="px-4">
          {/* Bar chart */}
          <div className="rounded-2xl p-4 mb-4 flex items-center justify-center" style={{ background: "var(--surface-card)", border: "1px solid var(--border)", minHeight: 100 }}>
            {totalMacroG === 0 ? (
              <span className="text-sm text-muted-foreground">No Data Available</span>
            ) : (
              <div className="flex gap-1 w-full h-6 rounded-full overflow-hidden">
                <div style={{ width: `${carbsPct}%`, background: "#F9C74F" }} />
                <div style={{ width: `${fatPct}%`, background: "#FF6B6B" }} />
                <div style={{ width: `${protPct}%`, background: "#52B788" }} />
              </div>
            )}
          </div>

          {/* Legend + data */}
          {[
            { label: "Carbs", color: "#F9C74F", val: Math.round(summary?.totals?.carbs || 0), pct: carbsPct, goalPct: goalCarbsPct },
            { label: "Fat", color: "#FF6B6B", val: Math.round(summary?.totals?.fat || 0), pct: fatPct, goalPct: goalFatPct },
            { label: "Protein", color: "#52B788", val: Math.round(summary?.totals?.protein || 0), pct: protPct, goalPct: goalProtPct },
          ].map(m => (
            <div key={m.label} className="flex items-center py-3 border-b last:border-b-0" style={{ borderColor: "var(--border)" }}>
              <div className="w-3 h-3 rounded-full mr-3" style={{ background: m.color }} />
              <div className="flex-1">
                <div className="text-sm font-medium">{m.label} ({m.val}g)</div>
                <div className="text-xs text-muted-foreground">{m.pct}% consumed / {m.goalPct}% goal</div>
              </div>
            </div>
          ))}

          {/* Premium locked */}
          <div className="mt-4 space-y-0">
            {["Foods Highest In Carbs", "Foods Highest In Fat", "Foods Highest In Protein"].map(l => (
              <PremiumLockedCard key={l} label={l} navigate={navigate} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
