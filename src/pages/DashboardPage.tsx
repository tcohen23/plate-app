import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { hapticLight } from "@/lib/haptics";
import {
  Plus, Droplets, ChevronRight,
  X, Zap, ChevronDown, ChevronLeft,
  MoreHorizontal, Dumbbell, Footprints,
  Weight, StickyNote, Coffee, Sandwich, Utensils, Cookie,
} from "lucide-react";
import { useAccessLevel } from "@/components/RequireSubscription";
import { useEffect, useState, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { getLocalDateString } from "@/lib/dateUtils";
import { useAchievementPoller } from "@/components/AchievementPopup";
import { ShareBadgeModal } from "@/components/ShareBadgeModal";
import { trackDashboardLoad, trackHydrationLogged, trackGoPremiumTap } from "@/lib/posthog";

/* ─── PWA detection ─── */

/* ─── Animated number counter ─── */
function AnimatedNumber({ value, duration = 600 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);
  useEffect(() => {
    const start = prevRef.current;
    const diff = value - start;
    if (diff === 0) return;
    const startTime = performance.now();
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(start + diff * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    prevRef.current = value;
  }, [value, duration]);
  return <>{display}</>;
}

/* ─── Macro detail copy ─── */
const MACRO_DETAILS: Record<string, { unit: string; description: string; tip: string }> = {
  Calories: {
    unit: "kcal",
    description: "Calories are the total energy your body gets from food. Your daily target is calculated from your basal metabolic rate (BMR) adjusted for your activity level and goal.",
    tip: "Consistency matters more than perfection. Hitting within 100 kcal of your target most days drives results.",
  },
  Protein: {
    unit: "g",
    description: "Protein builds and repairs muscle, keeps you full, and has the highest thermic effect of all macros, meaning your body burns more calories digesting it.",
    tip: "Prioritize protein at breakfast and lunch. It is the hardest macro to hit and the most important for body composition.",
  },
  Carbs: {
    unit: "g",
    description: "Carbohydrates are your body's preferred fuel source for workouts and brain function. Complex carbs like oats, rice, and sweet potatoes give steady energy without blood sugar spikes.",
    tip: "Time your carbs around training for best performance. Reduce them later in the day if fat loss is the goal.",
  },
  Fat: {
    unit: "g",
    description: "Dietary fat supports hormone production, brain health, and absorption of vitamins A, D, E, and K. Healthy fats from avocado, nuts, and olive oil are essential, not optional.",
    tip: "Do not cut fat below 0.3g per pound of bodyweight. Low fat diets tank testosterone and slow recovery.",
  },
};

/* ─── Single ring unit for CalorieHeroCard ─── */
function MacroRing({
  label, value, target, color, isSelected, onTap,
}: {
  label: string; value: number; target: number; color: string;
  isSelected: boolean; onTap: () => void;
}) {
  const size = 96;
  const cx = size / 2; const cy = size / 2; const r = 38; const stroke = 6;
  const pct = target > 0 ? Math.min(value / target, 1) : 0;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);
  return (
    <button
      className="flex flex-col items-center transition-transform active:scale-95"
      style={{ gap: 8, background: "none", border: "none", padding: 0, cursor: "pointer" }}
      onClick={onTap} aria-label={`${label} details`}
    >
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
          <circle
            cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={stroke}
            strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.7s cubic-bezier(.4,0,.2,1)" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ gap: 1 }}>
          <span className="font-bold" style={{ fontSize: 15, color: isSelected ? color : "#fff", lineHeight: 1 }}>{value}</span>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", lineHeight: 1 }}>/{target}g</span>
        </div>
      </div>
      <span className="text-xs font-medium" style={{ color: isSelected ? color : "rgba(255,255,255,0.6)" }}>{label}</span>
    </button>
  );
}

/* ─── PROTECTED: Editorial Calorie Hero Card (donut style) ─── */
function EditorialCalorieCard({
  calories, calTarget, protein, proteinTarget,
  carbs, carbsTarget, fat, fatTarget,
}: {
  calories: number; calTarget: number; protein: number; proteinTarget: number;
  carbs: number; carbsTarget: number; fat: number; fatTarget: number;
}) {
  const [selectedMacro, setSelectedMacro] = useState<string | null>(null);
  const navigate = useNavigate();
  const pct = calTarget > 0 ? Math.min(calories / calTarget, 1) : 0;
  const size = 220; const cx = size / 2; const cy = size / 2; const r = 94; const stroke = 14;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);
  const calLeft = Math.max(0, calTarget - calories);
  const isOver = calories > calTarget;
  const ringColor = isOver ? "#ef4444" : "#52B788";

  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}
    >
      <div className="flex flex-col items-center mb-4">
        <div style={{ position: "relative", width: size, height: size }}>
          <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
            <circle
              cx={cx} cy={cy} r={r} fill="none" stroke={ringColor} strokeWidth={stroke}
              strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(.4,0,.2,1)", filter: "drop-shadow(0 0 6px rgba(82,183,136,0.4))" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold" style={{ color: ringColor, letterSpacing: "-0.03em" }}>
              <AnimatedNumber value={calories} />
            </span>
            <span className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>/ {calTarget.toLocaleString()} kcal</span>
            {isOver
              ? <span className="text-xs mt-1" style={{ color: "#ef4444" }}>⚠️ Over goal</span>
              : <span className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>{calLeft.toLocaleString()} left</span>
            }
          </div>
        </div>
      </div>

      {/* Macro rings */}
      <div className="flex items-center justify-around mb-4">
        <MacroRing label="Protein" value={protein} target={proteinTarget} color="#52B788"
          isSelected={selectedMacro === "Protein"} onTap={() => setSelectedMacro(s => s === "Protein" ? null : "Protein")} />
        <MacroRing label="Carbs" value={carbs} target={carbsTarget} color="#F9C74F"
          isSelected={selectedMacro === "Carbs"} onTap={() => setSelectedMacro(s => s === "Carbs" ? null : "Carbs")} />
        <MacroRing label="Fat" value={fat} target={fatTarget} color="#FF6B6B"
          isSelected={selectedMacro === "Fat"} onTap={() => setSelectedMacro(s => s === "Fat" ? null : "Fat")} />
      </div>

      {/* Macro detail */}
      {selectedMacro && MACRO_DETAILS[selectedMacro] && (
        <div className="rounded-xl px-4 py-3 mb-3 text-left" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <p className="text-xs font-medium mb-1" style={{ color: "rgba(255,255,255,0.6)" }}>{selectedMacro}</p>
          <p className="text-xs mb-2 leading-relaxed" style={{ color: "rgba(255,255,255,0.85)" }}>{MACRO_DETAILS[selectedMacro].description}</p>
          <p className="text-xs italic" style={{ color: "rgba(255,255,255,0.45)" }}>💡 {MACRO_DETAILS[selectedMacro].tip}</p>
        </div>
      )}

      {/* Why these numbers link */}
      <button
        onClick={() => navigate("/why")}
        className="w-full text-center text-xs py-2 rounded-xl transition-opacity active:opacity-60"
        style={{ color: "#52B788", background: "rgba(82,183,136,0.1)", border: "1px solid rgba(82,183,136,0.2)" }}
      >
        Why these numbers?
      </button>
    </div>
  );
}

/* ─── Weekly Date Strip ─── */
function WeekStrip({ selectedDateStr, onDateChange }: { selectedDateStr: string; onDateChange: (dateStr: string) => void }) {
  const todayStr = getLocalDateString();
  const days = ["S", "M", "T", "W", "T", "F", "S"];

  // Compute week start (Sunday) from the selected date
  const selDate = new Date(selectedDateStr + "T12:00:00");
  const selDay = selDate.getDay();
  const weekStart = new Date(selDate);
  weekStart.setDate(selDate.getDate() - selDay);

  const weekDates = days.map((_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d.toISOString().split("T")[0];
  });

  const goToPrevWeek = () => {
    const d = new Date(selectedDateStr + "T12:00:00");
    d.setDate(d.getDate() - 7);
    onDateChange(d.toISOString().split("T")[0]);
  };
  const goToNextWeek = () => {
    const d = new Date(selectedDateStr + "T12:00:00");
    d.setDate(d.getDate() + 7);
    const next = d.toISOString().split("T")[0];
    if (next <= todayStr) onDateChange(next);
  };

  // Is the week strip already on the "current" week?
  const isCurrentWeek = weekDates.includes(todayStr);

  return (
    <div className="flex items-center mb-4 gap-1">
      <button
        onClick={goToPrevWeek}
        className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full active:opacity-60 transition-opacity"
        style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}
        aria-label="Previous week"
      >
        <ChevronLeft className="w-3.5 h-3.5" />
      </button>
      <div className="flex items-center justify-around flex-1">
        {days.map((day, i) => {
          const dateStr = weekDates[i];
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDateStr;
          const isFuture = dateStr > todayStr;
          const dateNum = parseInt(dateStr.split("-")[2]);
          return (
            <button
              key={dateStr}
              disabled={isFuture}
              onClick={() => { if (!isFuture) { hapticLight(); onDateChange(dateStr); }}}
              className="flex flex-col items-center gap-0.5 focus:outline-none active:scale-90 transition-transform"
              style={{ cursor: isFuture ? "default" : "pointer" }}
            >
              <div className="h-1.5 flex items-center justify-center">
                {isToday && <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#52B788" }} />}
              </div>
              <div
                className="w-9 h-9 flex items-center justify-center text-sm font-medium transition-all"
                style={{
                  borderRadius: "50%",
                  border: isSelected && isToday ? "1.5px dashed #52B788" : isSelected ? "1.5px solid #52B788" : "1.5px solid transparent",
                  color: isFuture ? "rgba(255,255,255,0.15)" : isSelected ? "#52B788" : "rgba(255,255,255,0.5)",
                  background: isSelected ? "rgba(82,183,136,0.12)" : "transparent",
                  fontWeight: isSelected ? 700 : 500,
                }}
              >
                {day}
              </div>
              <div className="text-[9px]" style={{ color: isFuture ? "rgba(255,255,255,0.1)" : isSelected ? "#52B788" : "rgba(255,255,255,0.3)" }}>
                {dateNum}
              </div>
            </button>
          );
        })}
      </div>
      <button
        onClick={goToNextWeek}
        disabled={isCurrentWeek}
        className="w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-full active:opacity-60 transition-opacity disabled:opacity-20"
        style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}
        aria-label="Next week"
      >
        <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

/* ─── Date Picker Dropdown ─── */
function DatePickerDropdown({ selectedDateStr, onSelect, onClose }: {
  selectedDateStr: string;
  onSelect: (dateStr: string) => void;
  onClose: () => void;
}) {
  const todayStr = getLocalDateString();
  const today = new Date(todayStr + "T12:00:00");

  // Build a calendar for the current/selected month
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date(selectedDateStr + "T12:00:00");
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const { year, month } = viewDate;
  const monthName = new Date(year, month, 1).toLocaleString("default", { month: "long", year: "numeric" });

  // First day of month (day-of-week), total days
  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (string | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push(dateStr);
  }

  const canGoPrev = !(year === today.getFullYear() - 1 && month === 0); // limit 1 year back
  const canGoNext = !(year === today.getFullYear() && month === today.getMonth());

  // Render via portal so fixed positioning works even inside CSS-transformed parents
  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: "rgba(0,0,0,0.5)" }}
        onClick={onClose}
      />
      {/* Dropdown panel — fixed so it's never clipped by scroll containers */}
      <div
        className="fixed z-50 rounded-2xl p-4 shadow-2xl"
        style={{
          top: "130px",
          left: "16px",
          right: "16px",
          maxWidth: "440px",
          margin: "0 auto",
          background: "#1a1a1a",
          border: "1px solid rgba(255,255,255,0.12)"
        }}
      >
        {/* Month nav */}
        <div className="flex items-center justify-between mb-3">
          <button
            disabled={!canGoPrev}
            onClick={() => setViewDate(v => {
              const m = v.month === 0 ? 11 : v.month - 1;
              const y = v.month === 0 ? v.year - 1 : v.year;
              return { year: y, month: m };
            })}
            style={{ background: "none", border: "none", color: canGoPrev ? "#fff" : "rgba(255,255,255,0.2)", cursor: canGoPrev ? "pointer" : "default", padding: 4 }}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-semibold text-white">{monthName}</span>
          <button
            disabled={!canGoNext}
            onClick={() => setViewDate(v => {
              const m = v.month === 11 ? 0 : v.month + 1;
              const y = v.month === 11 ? v.year + 1 : v.year;
              return { year: y, month: m };
            })}
            style={{ background: "none", border: "none", color: canGoNext ? "#fff" : "rgba(255,255,255,0.2)", cursor: canGoNext ? "pointer" : "default", padding: 4 }}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => (
            <div key={d} className="text-center text-xs font-medium" style={{ color: "rgba(255,255,255,0.35)", paddingBottom: 6 }}>{d}</div>
          ))}
        </div>
        {/* Day cells */}
        <div className="grid grid-cols-7 gap-y-1">
          {cells.map((dateStr, idx) => {
            if (!dateStr) return <div key={idx} />;
            const isFuture = dateStr > todayStr;
            const isSelected = dateStr === selectedDateStr;
            const isToday = dateStr === todayStr;
            return (
              <button
                key={dateStr}
                disabled={isFuture}
                onClick={() => { hapticLight(); onSelect(dateStr); onClose(); }}
                className="flex items-center justify-center text-sm font-medium transition-all"
                style={{
                  height: 36,
                  borderRadius: "50%",
                  background: isSelected ? "#52B788" : "transparent",
                  color: isFuture ? "rgba(255,255,255,0.15)" : isSelected ? "#000" : isToday ? "#52B788" : "#fff",
                  border: isToday && !isSelected ? "1px solid rgba(82,183,136,0.5)" : "1px solid transparent",
                  cursor: isFuture ? "default" : "pointer",
                  fontWeight: isToday || isSelected ? 700 : 400,
                }}
              >
                {parseInt(dateStr.split("-")[2])}
              </button>
            );
          })}
        </div>
        {/* Quick shortcuts */}
        <div className="flex gap-2 mt-3 pt-3" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <button
            onClick={() => { hapticLight(); onSelect(todayStr); onClose(); }}
            className="flex-1 py-2 rounded-xl text-sm font-semibold"
            style={{ background: selectedDateStr === todayStr ? "#52B788" : "rgba(82,183,136,0.12)", color: selectedDateStr === todayStr ? "#000" : "#52B788" }}
          >
            Today
          </button>
          <button
            onClick={() => {
              const d = new Date(todayStr + "T12:00:00");
              d.setDate(d.getDate() - 1);
              const yesterday = d.toISOString().split("T")[0];
              hapticLight(); onSelect(yesterday); onClose();
            }}
            className="flex-1 py-2 rounded-xl text-sm font-semibold"
            style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.7)" }}
          >
            Yesterday
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}

/* ─── MFP-style Calories Bar Card ─── */
function CaloriesBarCard({ calories, goal }: { calories: number; goal: number }) {
  const pct = goal > 0 ? Math.min(calories / goal, 1) : 0;
  const left = Math.max(0, goal - calories);
  return (
    <div className="rounded-2xl p-4 mb-3" style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}>
      <div className="text-sm font-medium mb-1" style={{ color: "rgba(255,255,255,0.6)" }}>Calories</div>
      <div className="flex items-baseline justify-between mb-2">
        <span className="text-2xl font-bold">
          <AnimatedNumber value={calories} /> <span className="text-base font-normal text-muted-foreground">cal / {goal.toLocaleString()}</span>
        </span>
        <span className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.7)" }}>{left.toLocaleString()} left</span>
      </div>
      <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct * 100}%`, background: pct >= 1 ? "#ef4444" : "#52B788" }}
        />
      </div>
    </div>
  );
}

/* ─── MFP-style Macros Bar Card ─── */
function MacrosBarCard({
  carbs, carbsGoal, fat, fatGoal, protein, proteinGoal,
}: {
  carbs: number; carbsGoal: number; fat: number; fatGoal: number; protein: number; proteinGoal: number;
}) {
  const macros = [
    { label: "Carbs", value: carbs, goal: carbsGoal, color: "#F9C74F" },
    { label: "Fat", value: fat, goal: fatGoal, color: "#FF6B6B" },
    { label: "Protein", value: protein, goal: proteinGoal, color: "#52B788" },
  ];
  return (
    <div className="rounded-2xl p-4 mb-3" style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-6">
          {macros.map(m => (
            <div key={m.label}>
              <div className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>{m.label}</div>
              <div className="text-base font-bold">
                <AnimatedNumber value={Math.round(m.value)} />
                <span className="text-xs font-normal text-muted-foreground"> g / {m.goal}</span>
              </div>
              <div className="w-16 h-1.5 rounded-full mt-1 overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${Math.min(m.value / (m.goal || 1), 1) * 100}%`, background: m.color }}
                />
              </div>
            </div>
          ))}
        </div>
        <button className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
          <span style={{ fontSize: 14 }}>⇄</span>
        </button>
      </div>
    </div>
  );
}



/* ─── Diary Meal Row ─── */
const MEAL_ICONS: Record<string, React.ReactNode> = {
  Breakfast: <Coffee className="w-4 h-4" style={{ color: "#52B788" }} />,
  Lunch: <Sandwich className="w-4 h-4" style={{ color: "#52B788" }} />,
  Dinner: <Utensils className="w-4 h-4" style={{ color: "#52B788" }} />,
  Snacks: <Cookie className="w-4 h-4" style={{ color: "#52B788" }} />,
};

function DiaryMealRow({
  label, calories, onLog, onMore,
}: {
  label: string; calories?: number; onLog: () => void; onMore?: () => void;
}) {
  return (
    <div
      className="flex items-center px-4 py-3.5 rounded-2xl"
      style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}
    >
      <div className="w-8 h-8 rounded-xl flex items-center justify-center mr-3 flex-shrink-0" style={{ background: "rgba(82,183,136,0.1)" }}>
        {MEAL_ICONS[label] || <Utensils className="w-4 h-4" style={{ color: "#52B788" }} />}
      </div>
      <div className="flex-1">
        <span className="text-sm font-medium">{label}</span>
        {calories != null && calories > 0 && (
          <span className="text-xs text-muted-foreground ml-2">{calories} cal</span>
        )}
      </div>
      {onMore && (
        <button onClick={onMore} className="w-8 h-8 flex items-center justify-center rounded-full mr-1" style={{ color: "rgba(255,255,255,0.4)" }}>
          <MoreHorizontal className="w-4 h-4" />
        </button>
      )}
      <button
        onClick={onLog}
        className="px-4 py-1.5 rounded-full text-sm font-semibold transition-all active:scale-95"
        style={{ background: "rgba(82,183,136,0.15)", color: "#52B788", border: "1px solid rgba(82,183,136,0.3)" }}
      >
        Log
      </button>
    </div>
  );
}

/* ─── Healthy Habits Row ─── */
function HabitRow({ icon, label, subtitle, onClick }: { icon: React.ReactNode; label: string; subtitle: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full flex items-center py-3.5 px-0 border-b last:border-b-0 text-left transition-opacity active:opacity-70" style={{ borderColor: "var(--border)" }}>
      <div className="w-8 flex-shrink-0 flex items-center justify-center" style={{ color: "rgba(255,255,255,0.5)" }}>{icon}</div>
      <div className="flex-1 ml-2">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{subtitle}</div>
      </div>
      <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(255,255,255,0.3)" }} />
    </button>
  );
}

/* ─── Premium upsell banner ─── */
function PremiumUpsellBanner({ navigate }: { navigate: (p: string) => void }) {
  return (
    <button
      onClick={() => navigate("/settings?tab=premium")}
      className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all active:scale-[0.98]"
      style={{ background: "linear-gradient(135deg, rgba(82,183,136,0.15), rgba(27,67,50,0.3))", border: "1px solid rgba(82,183,136,0.25)" }}
    >
      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(82,183,136,0.2)" }}>
        <span className="text-base">👑</span>
      </div>
      <div className="flex-1 text-left">
        <div className="text-sm font-bold" style={{ color: "#52B788" }}>Upgrade to Premium</div>
        <div className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>Unlock macros, meal planning, GLP-1 tracker &amp; more</div>
      </div>
      <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: "#52B788", color: "#0d1f13" }}>Try free</span>
    </button>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN DASHBOARD
   ═══════════════════════════════════════════════════ */
export function DashboardPage() {
  const navigate = useNavigate();
  const todayStr = useMemo(() => getLocalDateString(), []);
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const isToday = selectedDate === todayStr;

  // Friendly label for header
  const headerLabel = useMemo(() => {
    if (selectedDate === todayStr) return "Today";
    const d = new Date(todayStr + "T12:00:00");
    d.setDate(d.getDate() - 1);
    const yesterday = d.toISOString().split("T")[0];
    if (selectedDate === yesterday) return "Yesterday";
    const dt = new Date(selectedDate + "T12:00:00");
    return dt.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }, [selectedDate, todayStr]);

  const profile = useQuery(api.profiles.getProfile);
  const { isPremium, isTrialing } = useAccessLevel();
  const summary = useQuery(api.foodLogs.getDailySummary, { localDate: selectedDate });
  const todaysLog = useQuery(api.foodLogs.getTodaysLog, { localDate: selectedDate });
  const stats = useQuery(api.progress.getUserStats, { localDate: todayStr });
  const hydration = useQuery(api.progress.getTodaysHydration, { localDate: selectedDate });
  const progressLogs = useQuery(api.progress.getProgressLogs);
  const logHydration = useMutation(api.progress.logHydration);
  const { check: checkAchievements, popup: achievementPopup } = useAchievementPoller();
  const [showShareBadge, setShowShareBadge] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [floorBannerDismissed, setFloorBannerDismissed] = useState(() => {
    try { return localStorage.getItem("plate_floor_banner_dismissed") === "1"; } catch { return false; }
  });

  useEffect(() => { checkAchievements(); }, []);

  // Track dashboard load once per mount (after we know plan status)
  const dashTracked = useRef(false);
  useEffect(() => {
    if (dashTracked.current || isPremium === undefined) return;
    dashTracked.current = true;
    const plan = isPremium ? (isTrialing ? "trialing" : "premium") : "free";
    trackDashboardLoad(plan as "free" | "premium" | "trialing");
  }, [isPremium, isTrialing]);

  if (!profile || !summary) return <DashboardSkeleton />;

  const targetCals = profile.targetCalories || 2000;
  const targetProtein = profile.targetProtein || 150;
  const targetCarbs = profile.targetCarbs || 200;
  const targetFat = profile.targetFat || 60;
  const consumed = summary.totals;

  // const today = new Date();
  const currentGlasses = hydration?.glasses || 0;
  const hydrationTarget = profile.hydrationTarget || 8;

  // Per-meal calorie breakdown from today's logs
  const mealCals: Record<string, number> = {};
  (todaysLog || []).forEach((log: any) => {
    const slot = log.mealSlot || log.mealType || "Breakfast";
    const label = slot.charAt(0).toUpperCase() + slot.slice(1);
    mealCals[label] = (mealCals[label] || 0) + (log.calories || 0);
  });

  const sortedWeightLogs = [...(progressLogs || [])].sort((a: any, b: any) => a.date.localeCompare(b.date));
  const latestWeight = sortedWeightLogs.length > 0 ? sortedWeightLogs[sortedWeightLogs.length - 1].weight : null;
  const goalWeight = (profile as any).goalWeight;

  return (
    <div className="pb-28 max-w-lg mx-auto animate-page-enter">
      {achievementPopup}

      {/* ── Calorie floor banner ── */}
      {(profile as any).calorieFloorActivated && !floorBannerDismissed && (
        <div className="rounded-xl px-4 py-3 text-sm flex items-start gap-3 mx-4 mt-4" style={{ background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.3)" }}>
          <span className="text-lg leading-none mt-0.5">⚠️</span>
          <span className="flex-1">Your goal has been adjusted to a safer minimum. For faster fat loss, increase your activity level.</span>
          <button onClick={() => { setFloorBannerDismissed(true); try { localStorage.setItem("plate_floor_banner_dismissed", "1"); } catch {} }}
            className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center" style={{ background: "rgba(251,191,36,0.2)" }} aria-label="Dismiss">
            <X className="w-3.5 h-3.5" style={{ color: "rgba(251,191,36,0.9)" }} />
          </button>
        </div>
      )}

      {/* ── MFP Header: Today ▼ | Go Premium | 0⚡ ── */}
      {showDatePicker && (
        <DatePickerDropdown
          selectedDateStr={selectedDate}
          onSelect={setSelectedDate}
          onClose={() => setShowDatePicker(false)}
        />
      )}

      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <button className="flex items-center gap-1" onClick={() => { hapticLight(); setShowDatePicker(v => !v); }}>
          <span className="text-3xl font-black tracking-tight">{headerLabel}</span>
          <ChevronDown className="w-5 h-5 mt-1" style={{ color: "rgba(255,255,255,0.5)", transition: "transform 0.2s", transform: showDatePicker ? "rotate(180deg)" : "none" }} />
        </button>
        <div className="flex items-center gap-2">
          {!isPremium && (
            <button
              onClick={() => { hapticLight(); trackGoPremiumTap("dashboard_header"); navigate("/onboarding/upgrade"); }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold transition-all active:scale-95"
              style={{ background: "#E5B454", color: "#000" }}
            >
              Go Premium
            </button>
          )}
          {isPremium && isTrialing && (
            <span className="text-xs px-3 py-1.5 rounded-full font-semibold" style={{ background: "rgba(82,183,136,0.15)", color: "#52B788" }}>
              🎉 Trial
            </span>
          )}
          <div className="flex items-center gap-1 px-2 py-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)" }}>
            <span className="text-sm font-bold">{stats?.currentStreak || 0}</span>
            <Zap className="w-4 h-4" style={{ color: "#F9C74F" }} />
          </div>
        </div>
      </div>

      {/* ── Weekly Date Strip ── */}
      <div className="px-4">
        <WeekStrip selectedDateStr={selectedDate} onDateChange={setSelectedDate} />
      </div>

      {/* ── Past day banner ── */}
      {!isToday && (
        <div className="px-4 mb-2">
          <div className="flex items-center justify-between rounded-xl px-3 py-2" style={{ background: "rgba(82,183,136,0.08)", border: "1px solid rgba(82,183,136,0.2)" }}>
            <span className="text-xs font-medium" style={{ color: "#52B788" }}>📅 Viewing {headerLabel}'s log (read-only)</span>
            <button
              onClick={() => { hapticLight(); setSelectedDate(todayStr); }}
              className="text-xs font-bold px-2 py-1 rounded-lg"
              style={{ background: "#52B788", color: "#000" }}
            >
              Go to Today
            </button>
          </div>
        </div>
      )}

      {/* ── MFP Calories Bar Card ── */}
      <div className="px-4">
        <CaloriesBarCard calories={Math.round(consumed.calories)} goal={targetCals} />
      </div>

      {/* ── MFP Macros Bar Card ── */}
      <div className="px-4">
        <MacrosBarCard
          carbs={Math.round(consumed.carbs)} carbsGoal={targetCarbs}
          fat={Math.round(consumed.fat)} fatGoal={targetFat}
          protein={Math.round(consumed.protein)} proteinGoal={targetProtein}
        />
      </div>

      {/* ── PROTECTED: Plate Calorie Hero Card (donut) ── */}
      <div className="px-4 mb-3">
        <EditorialCalorieCard
          calories={Math.round(consumed.calories)} calTarget={targetCals}
          protein={Math.round(consumed.protein)} proteinTarget={targetProtein}
          carbs={Math.round(consumed.carbs)} carbsTarget={targetCarbs}
          fat={Math.round(consumed.fat)} fatTarget={targetFat}
        />
      </div>

      {/* ── Premium upsell (replaces ad slot) ── */}
      {!isPremium && (
        <div className="px-4">
          <PremiumUpsellBanner navigate={navigate} />
        </div>
      )}

      {/* ── Diary section ── */}
      <div className="px-4 mb-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-lg font-bold">Diary</span>
          <button onClick={() => navigate("/track")} className="text-sm font-medium" style={{ color: "#52B788" }}>View all</button>
        </div>
        <div className="space-y-2">
          {["Breakfast", "Lunch", "Dinner", "Snacks"].map(meal => (
            <DiaryMealRow
              key={meal}
              label={meal}
              calories={mealCals[meal]}
              onLog={() => { if (!isToday) return; hapticLight(); navigate(`/track?slot=${meal.toLowerCase()}`); }}
              onMore={() => {}}
            />
          ))}
        </div>
      </div>

      {/* ── Second premium upsell after diary ── */}
      {!isPremium && (
        <div className="px-4 mb-3">
          <PremiumUpsellBanner navigate={navigate} />
        </div>
      )}

      {/* ── PROTECTED: Hydration tracker ── */}
      <div className="px-4 mb-3">
        <div className="rounded-2xl p-4" style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Droplets className="w-4 h-4" style={{ color: "#4A9EFF" }} />
              <span className="text-sm font-medium">Hydration</span>
            </div>
            <span className="text-xs text-muted-foreground">{currentGlasses}/{hydrationTarget} glasses</span>
          </div>
          <div className="flex items-center gap-1.5 mb-3">
            {Array.from({ length: hydrationTarget }).map((_, i) => (
              <button
                key={i}
                onClick={() => { if (!isToday) return; hapticLight(); logHydration({ glasses: i + 1 }); }}
                className="flex-1 h-5 rounded-full transition-all duration-300 tap-scale"
                style={{ background: i < currentGlasses ? "#4A9EFF" : "var(--border)" }}
              />
            ))}
          </div>
          {/* + Add a glass button — matches MFP */}
          {isToday && (
            <button
              onClick={() => { hapticLight(); const next = Math.min(currentGlasses + 1, hydrationTarget); logHydration({ glasses: next }); trackHydrationLogged(next); }}
              className="w-full py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 transition-all active:scale-[0.98]"
              style={{ background: "rgba(74,158,255,0.1)", color: "#4A9EFF", border: "1px solid rgba(74,158,255,0.2)" }}
            >
              <Plus className="w-3.5 h-3.5" />
              Add a glass
            </button>
          )}
        </div>
      </div>

      {/* ── Healthy Habits ── */}
      <div className="px-4 mb-3">
        <h2 className="text-lg font-bold mb-2">Healthy habits</h2>
        <div className="rounded-2xl px-4" style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}>
          <HabitRow
            icon={<Droplets className="w-4 h-4" />}
            label="Water"
            subtitle={currentGlasses > 0 ? `${(currentGlasses * 8).toFixed(1)} oz today` : "0.0 oz (You must be thirsty!)"}
            onClick={() => navigate("/more/water")}
          />
          <HabitRow
            icon={<Dumbbell className="w-4 h-4" />}
            label="Exercise"
            subtitle="Track exercise to see calorie burn"
            onClick={() => navigate("/workout")}
          />
          <HabitRow
            icon={<Footprints className="w-4 h-4" />}
            label="Steps"
            subtitle="0 steps today"
            onClick={() => navigate("/more/measurements")}
          />
        </div>
      </div>

      {/* ── Weight section ── */}
      <div className="px-4 mb-3">
        <h2 className="text-lg font-bold mb-2">Weight</h2>
        <button
          onClick={() => navigate("/more/measurements?tab=weight")}
          className="w-full flex items-center px-4 py-4 rounded-2xl text-left transition-opacity active:opacity-70"
          style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}
        >
          <Weight className="w-4 h-4 mr-3" style={{ color: "rgba(255,255,255,0.4)" }} />
          <div className="flex-1">
            {latestWeight ? (
              <>
                <div className="text-sm font-medium">{latestWeight} lbs</div>
                {goalWeight && <div className="text-xs text-muted-foreground">Goal weight: {goalWeight} lbs</div>}
              </>
            ) : (
              <>
                <div className="text-sm font-medium">Log your first weight</div>
                {goalWeight && <div className="text-xs text-muted-foreground">Goal weight: {goalWeight} lbs</div>}
              </>
            )}
          </div>
          <ChevronRight className="w-4 h-4" style={{ color: "rgba(255,255,255,0.3)" }} />
        </button>
      </div>

      {/* ── Notes section ── */}
      <div className="px-4 mb-3">
        <h2 className="text-lg font-bold mb-2">Notes</h2>
        <div className="rounded-2xl px-4 py-3.5 flex items-center gap-3" style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}>
          <input
            value={noteText}
            onChange={e => setNoteText(e.target.value)}
            placeholder="Add a note"
            className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground"
          />
          <StickyNote className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(255,255,255,0.3)" }} />
        </div>
      </div>

      {/* ── PROTECTED: Log Food + Grocery buttons ── */}
      {isToday && (
        <div className="px-4 mb-3">
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={() => { hapticLight(); navigate("/track"); }}
              className="h-12 text-sm font-semibold rounded-xl tap-scale"
              style={{ background: "var(--plate-green-deep)", color: "var(--plate-green-accent)", border: "none" }}
            >
              <Plus className="w-4 h-4 mr-2" /> Log Food
            </Button>
            <Button
              onClick={() => { hapticLight(); navigate("/grocery"); }}
              className="h-12 text-sm font-medium rounded-xl tap-scale"
              variant="outline"
            >
              Grocery List
            </Button>
          </div>
        </div>
      )}

      {/* ── PROTECTED: Share an idea card ── */}
      <div className="px-4 mb-3">
        <button
          onClick={() => { hapticLight(); navigate("/feedback"); }}
          className="w-full flex items-center gap-3 rounded-2xl px-4 py-3.5 text-left transition-all active:scale-[0.98]"
          style={{ background: "#141414", border: "1px solid rgba(82,183,136,0.2)" }}
        >
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-base" style={{ background: "rgba(82,183,136,0.12)" }}>
            💡
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-white">Share an idea</p>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>What should we build next?</p>
          </div>
          <ChevronRight className="w-4 h-4" style={{ color: "rgba(82,183,136,0.6)" }} />
        </button>
      </div>

      {/* Share Badge Modal */}
      {showShareBadge && stats && (
        <ShareBadgeModal
          onClose={() => setShowShareBadge(false)}
          profile={{ name: profile.name, avatarChoice: (profile as any).avatarChoice, photoUrl: (profile as any).photoUrl, goal: profile.goal }}
          stats={{ level: stats.level || 1, xp: stats.xp || 0, currentStreak: stats.currentStreak || 0, totalMealsLogged: stats.totalMealsLogged || 0 }}
        />
      )}
    </div>
  );
}

/* ─── Skeleton ─── */
function DashboardSkeleton() {
  return (
    <div className="px-4 pt-4 pb-6 max-w-lg mx-auto space-y-4">
      <div className="flex justify-between items-center mb-4">
        <div className="w-24 h-8 skeleton-shimmer rounded-xl" />
        <div className="w-28 h-8 skeleton-shimmer rounded-full" />
      </div>
      <div className="flex justify-between mb-4">
        {[...Array(7)].map((_, i) => <div key={i} className="w-9 h-9 skeleton-shimmer rounded-full" />)}
      </div>
      <div className="h-14 skeleton-shimmer rounded-2xl" />
      <div className="h-20 skeleton-shimmer rounded-2xl" />
      <div className="h-64 skeleton-shimmer rounded-2xl" />
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => <div key={i} className="h-14 skeleton-shimmer rounded-2xl" />)}
      </div>
    </div>
  );
}
