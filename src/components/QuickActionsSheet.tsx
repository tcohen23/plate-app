/**
 * QuickActionsSheet — MFP-style "+" button menu
 *
 * Bottom sheet listing 5 actions:
 *   Log Food → /track
 *   Quick Add → calories (free) + macros (premium-gated)
 *   Log Water → oz input + quick presets
 *   Log Weight → big number display + custom keypad
 *   Exercise → cardio / strength / routines drawer
 *
 * Each sub-screen is self-contained; pressing any row opens its flow
 * as a full-screen overlay. Pressing ← returns to the menu.
 */

import { useState } from "react";
import {
  X, ChevronLeft, ChevronRight,
  UtensilsCrossed, Zap, Droplets, Scale, Dumbbell,
  Pencil, Camera, Delete, Crown, Bike, BarChart2, ListChecks,
} from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { hapticLight, hapticMedium } from "@/lib/haptics";
import { toast } from "sonner";
import { useAccessLevel } from "@/components/RequireSubscription";
import { useNavigate } from "react-router-dom";
import { getLocalDateString } from "@/lib/dateUtils";

/* ═══════════════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════════════ */
type Screen =
  | "menu"
  | "log-food"      // shows meal picker sub-screen
  | "quick-add"
  | "log-water"
  | "log-weight"
  | "exercise";

/* ═══════════════════════════════════════════════════════
   NUMPAD — shared between Log Weight & Quick Add
═══════════════════════════════════════════════════════ */
const NUMPAD_KEYS = ["1","2","3","4","5","6","7","8","9",".","0","⌫"] as const;
type NumKey = typeof NUMPAD_KEYS[number];

function Numpad({ onKey }: { onKey: (k: NumKey) => void }) {
  return (
    <div className="grid grid-cols-3">
      {NUMPAD_KEYS.map((key) => (
        <button
          key={key}
          onPointerDown={(e) => { e.preventDefault(); onKey(key); hapticLight(); }}
          className="flex items-center justify-center transition-colors active:bg-white/10"
          style={{
            height: 66,
            background: key === "⌫" ? "rgba(255,255,255,0.03)" : "transparent",
            borderTop: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          {key === "⌫"
            ? <Delete className="w-5 h-5" style={{ color: "rgba(255,255,255,0.55)" }} />
            : <span style={{ fontSize: 26, fontWeight: 300, color: "rgba(255,255,255,0.88)" }}>{key}</span>
          }
        </button>
      ))}
    </div>
  );
}

/* helper: append digit to string value (max 7 chars, one dot) */
function applyKey(current: string, key: NumKey): string {
  if (key === "⌫") return current.slice(0, -1);
  if (key === "." && current.includes(".")) return current;
  if (current.length >= 7) return current;
  if (current === "0" && key !== ".") return key; // replace leading zero
  return current + key;
}

/* ═══════════════════════════════════════════════════════
   LOG WEIGHT SCREEN
═══════════════════════════════════════════════════════ */
function LogWeightScreen({ onBack, onClose }: { onBack: () => void; onClose: () => void }) {
  const [digits, setDigits] = useState("");
  const todayISO = new Date().toISOString().split("T")[0];
  const [dateLabel, setDateLabel] = useState("Today");
  const [dateISO, setDateISO] = useState(todayISO);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const logWeight = useMutation(api.progress.logWeight);

  const handleKey = (k: NumKey) => setDigits(d => applyKey(d, k));

  const handleLog = async () => {
    const val = parseFloat(digits);
    if (!digits || isNaN(val) || val <= 0) { toast.error("Enter your weight"); return; }
    hapticMedium();
    setSaving(true);
    try {
      await logWeight({ weight: val });
      toast.success("Weight logged ✓");
      setDigits("");
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Failed to log weight");
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[70] flex flex-col" style={{ background: "#1C1E27" }}>
      {/* Header */}
      <div className="relative flex items-center justify-center px-4 pt-5 pb-3 flex-shrink-0">
        <button
          onClick={onBack}
          className="absolute left-4 w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.08)" }}
        >
          <ChevronLeft className="w-5 h-5" style={{ color: "rgba(255,255,255,0.7)" }} />
        </button>
        <h1 className="text-base font-semibold text-white">Log weight</h1>
        <button
          onClick={onClose}
          className="absolute right-4 w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.08)" }}
        >
          <X className="w-4 h-4" style={{ color: "rgba(255,255,255,0.5)" }} />
        </button>
      </div>

      {/* Big display */}
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-end gap-3">
          <div className="relative flex items-end">
            <span
              className="font-light leading-none"
              style={{
                fontSize: 72,
                color: digits ? "#fff" : "rgba(255,255,255,0.2)",
                letterSpacing: "-2px",
                minWidth: 120,
                textAlign: "right",
              }}
            >
              {digits || "0"}
            </span>
            {/* blue cursor */}
            <span
              className="absolute animate-pulse"
              style={{
                right: -6, bottom: 6,
                width: 2, height: 48,
                background: "#3B82F6",
                borderRadius: 2,
              }}
            />
          </div>
          <span className="text-2xl font-light mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>
            lbs
          </span>
        </div>
      </div>

      {/* Date + progress photo */}
      <div className="flex px-6 gap-6 mb-5 flex-shrink-0">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.38)" }}>Date</span>
          <button onClick={() => setShowDatePicker(v => !v)} className="flex items-center gap-1.5 active:opacity-70">
            <span className="text-sm font-semibold" style={{ color: "#3B82F6" }}>{dateLabel}</span>
            <Pencil className="w-3.5 h-3.5" style={{ color: "#3B82F6" }} />
          </button>
          {showDatePicker && (
            <input
              type="date" value={dateISO} max={todayISO}
              onChange={(e) => {
                const iso = e.target.value; setDateISO(iso);
                setDateLabel(iso === todayISO ? "Today" : new Date(iso + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }));
                setShowDatePicker(false);
              }}
              className="mt-1 text-xs rounded-lg px-2 py-1 outline-none"
              style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", colorScheme: "dark" }}
              autoFocus
            />
          )}
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.38)" }}>Progress Photo</span>
          <button className="flex items-center gap-1.5 active:opacity-70">
            <span className="text-sm font-semibold" style={{ color: "#3B82F6" }}>Add</span>
            <Camera className="w-3.5 h-3.5" style={{ color: "#3B82F6" }} />
          </button>
        </div>
      </div>

      {/* CTA */}
      <div className="px-5 mb-4 flex-shrink-0">
        <button
          onClick={handleLog}
          disabled={saving || !digits}
          className="w-full rounded-2xl font-bold text-base transition-all active:scale-[0.98] disabled:opacity-40"
          style={{ height: 52, background: "#3B82F6", color: "#fff" }}
        >
          {saving ? "Saving…" : "Log weight"}
        </button>
      </div>

      {/* Numpad */}
      <div className="flex-shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <Numpad onKey={handleKey} />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   LOG WATER SCREEN
═══════════════════════════════════════════════════════ */
const WATER_PRESETS = [
  { label: "+8 oz", oz: 8 },
  { label: "+17 oz", oz: 17 },
  { label: "+24 oz", oz: 24 },
];

// oz → glasses conversion: 1 glass = 8 oz
function ozToGlasses(oz: number) { return Math.round(oz / 8); }

function LogWaterScreen({ onBack, onClose }: { onBack: () => void; onClose: () => void }) {
  const [ozStr, setOzStr] = useState("");
  const [unit, setUnit] = useState<"oz" | "ml">("oz");
  const [saving, setSaving] = useState(false);
  const logHydration = useMutation(api.progress.logHydration);
  const localDate = getLocalDateString();
  const todaysHydration = useQuery(api.progress.getTodaysHydration, { localDate });
  const currentGlasses = todaysHydration?.glasses ?? 0;

  const handleAdd = async (extraOz?: number) => {
    const oz = extraOz ?? parseFloat(ozStr);
    if (!oz || isNaN(oz) || oz <= 0) { toast.error("Enter an amount"); return; }
    hapticMedium();
    setSaving(true);
    try {
      const newGlasses = currentGlasses + ozToGlasses(oz);
      await logHydration({ glasses: newGlasses, localDate: getLocalDateString() });
      toast.success(`+${oz} oz logged 💧`);
      setOzStr("");
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Failed to log water");
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[70] flex flex-col" style={{ background: "#1C1E27" }}>
      {/* Header */}
      <div className="relative flex items-center justify-center px-4 pt-5 pb-3 flex-shrink-0">
        <button onClick={onBack} className="absolute left-4 w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.08)" }}>
          <ChevronLeft className="w-5 h-5" style={{ color: "rgba(255,255,255,0.7)" }} />
        </button>
        <h1 className="text-base font-semibold text-white">Add Water</h1>
        <button onClick={onClose} className="absolute right-4 w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.08)" }}>
          <X className="w-4 h-4" style={{ color: "rgba(255,255,255,0.5)" }} />
        </button>
      </div>

      {/* Water bottle icon */}
      <div className="flex flex-col items-center pt-6 pb-4 flex-shrink-0">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mb-3" style={{ background: "rgba(59,130,246,0.12)", border: "2px solid rgba(59,130,246,0.25)" }}>
          <Droplets className="w-10 h-10" style={{ color: "#3B82F6" }} />
        </div>
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
          Today: {currentGlasses * 8} oz logged
        </p>
      </div>

      {/* Custom amount input */}
      <div className="px-5 mb-5 flex-shrink-0">
        <div className="rounded-2xl px-4 py-4 flex items-center gap-3" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}>
          <input
            type="number"
            inputMode="decimal"
            placeholder="Amount"
            value={ozStr}
            onChange={(e) => setOzStr(e.target.value)}
            className="flex-1 bg-transparent text-2xl font-light outline-none"
            style={{ color: ozStr ? "#fff" : "rgba(255,255,255,0.25)" }}
          />
          <span className="text-base font-medium" style={{ color: "rgba(255,255,255,0.5)" }}>{unit}</span>
        </div>
      </div>

      {/* Quick presets */}
      <div className="px-5 flex gap-3 mb-6 flex-shrink-0">
        {WATER_PRESETS.map((p) => (
          <button
            key={p.oz}
            onClick={() => { hapticLight(); handleAdd(p.oz); }}
            disabled={saving}
            className="flex-1 py-3 rounded-2xl text-sm font-bold transition-all active:scale-[0.97] disabled:opacity-50"
            style={{ background: "rgba(59,130,246,0.15)", color: "#3B82F6", border: "1px solid rgba(59,130,246,0.25)" }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Unit toggle */}
      <div className="px-5 mb-6 flex-shrink-0">
        <button
          onClick={() => { hapticLight(); setUnit(u => u === "oz" ? "ml" : "oz"); }}
          className="text-sm font-semibold transition-opacity active:opacity-60"
          style={{ color: "#3B82F6" }}
        >
          Change Unit ({unit === "oz" ? "switch to ml" : "switch to oz"})
        </button>
      </div>

      {/* CTA */}
      <div className="px-5 flex-shrink-0">
        <button
          onClick={() => handleAdd()}
          disabled={saving || !ozStr}
          className="w-full rounded-2xl font-bold text-base transition-all active:scale-[0.98] disabled:opacity-40"
          style={{ height: 52, background: "#3B82F6", color: "#fff" }}
        >
          {saving ? "Saving…" : `Add ${ozStr || ""} ${unit}`}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   QUICK ADD SCREEN
═══════════════════════════════════════════════════════ */
type MealSlot = "breakfast" | "lunch" | "dinner" | "snack";
const MEAL_SLOTS: { label: string; value: MealSlot }[] = [
  { label: "Breakfast", value: "breakfast" },
  { label: "Lunch", value: "lunch" },
  { label: "Dinner", value: "dinner" },
  { label: "Snack", value: "snack" },
];

function QuickAddScreen({ onBack, onClose }: { onBack: () => void; onClose: () => void }) {
  const { isPremium } = useAccessLevel();
  const navigate = useNavigate();
  const [slot, setSlot] = useState<MealSlot>("snack");
  const [calories, setCalories] = useState("");
  const [fat, setFat] = useState("");
  const [carbs, setCarbs] = useState("");
  const [protein, setProtein] = useState("");
  const [saving, setSaving] = useState(false);
  const localDate = getLocalDateString();
  const quickAdd = useMutation(api.foodLogs.quickAddCalories);

  const handleSave = async () => {
    const cal = parseFloat(calories);
    if (!calories || isNaN(cal) || cal <= 0) { toast.error("Enter calories"); return; }
    hapticMedium();
    setSaving(true);
    try {
      await quickAdd({
        calories: cal,
        protein: protein ? parseFloat(protein) : undefined,
        carbs: carbs ? parseFloat(carbs) : undefined,
        fat: fat ? parseFloat(fat) : undefined,
        localDate,
      });
      toast.success("Added ✓");
      onClose();
    } catch (e: any) {
      toast.error(e.message || "Failed to add");
    }
    setSaving(false);
  };

  const fieldStyle = {
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.1)",
  };

  return (
    <div className="fixed inset-0 z-[70] flex flex-col overflow-y-auto" style={{ background: "#1C1E27" }}>
      {/* Header */}
      <div className="relative flex items-center justify-center px-4 pt-5 pb-3 flex-shrink-0">
        <button onClick={onBack} className="absolute left-4 w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.08)" }}>
          <ChevronLeft className="w-5 h-5" style={{ color: "rgba(255,255,255,0.7)" }} />
        </button>
        <h1 className="text-base font-semibold text-white">Quick Add</h1>
        <button onClick={onClose} className="absolute right-4 w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.08)" }}>
          <X className="w-4 h-4" style={{ color: "rgba(255,255,255,0.5)" }} />
        </button>
      </div>

      {/* Meal selector */}
      <div className="flex gap-2 px-5 py-3 overflow-x-auto scrollbar-hide flex-shrink-0">
        {MEAL_SLOTS.map((s) => (
          <button
            key={s.value}
            onClick={() => { hapticLight(); setSlot(s.value); }}
            className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all active:scale-95"
            style={{
              background: slot === s.value ? "#52B788" : "rgba(255,255,255,0.08)",
              color: slot === s.value ? "#0d1f13" : "rgba(255,255,255,0.7)",
              border: slot === s.value ? "none" : "1px solid rgba(255,255,255,0.12)",
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Fields */}
      <div className="px-5 pt-2 flex-1 space-y-3">
        {/* Calories — FREE */}
        <div className="rounded-2xl px-4 py-4" style={fieldStyle}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.45)" }}>Calories</span>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: "rgba(82,183,136,0.15)", color: "#52B788" }}>FREE</span>
          </div>
          <input
            type="number"
            inputMode="decimal"
            placeholder="0"
            value={calories}
            onChange={(e) => setCalories(e.target.value)}
            className="w-full bg-transparent text-3xl font-light outline-none"
            style={{ color: calories ? "#fff" : "rgba(255,255,255,0.2)" }}
          />
        </div>

        {/* Macros — PREMIUM gated */}
        {(["Total Fat (g)", "Total Carbohydrates (g)", "Protein (g)"] as const).map((label, i) => {
          const val = [fat, carbs, protein][i];
          const setter = [setFat, setCarbs, setProtein][i];
          return (
            <div key={label} className="rounded-2xl px-4 py-4 relative" style={fieldStyle}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.45)" }}>{label}</span>
                {!isPremium && (
                  <div className="flex items-center gap-1.5">
                    <Crown className="w-3.5 h-3.5" style={{ color: "#E5B454" }} />
                    <span className="text-xs font-semibold" style={{ color: "#E5B454" }}>Premium</span>
                  </div>
                )}
              </div>
              {isPremium ? (
                <input
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  value={val}
                  onChange={(e) => setter(e.target.value)}
                  className="w-full bg-transparent text-3xl font-light outline-none"
                  style={{ color: val ? "#fff" : "rgba(255,255,255,0.2)" }}
                />
              ) : (
                <div className="flex items-center justify-between">
                  <span className="text-3xl font-light" style={{ color: "rgba(255,255,255,0.15)" }}>—</span>
                  <button
                    onClick={() => { hapticLight(); onClose(); navigate("/onboarding/upgrade"); }}
                    className="text-xs font-bold px-3 py-1.5 rounded-full transition-all active:scale-95"
                    style={{ background: "rgba(229,180,84,0.15)", color: "#E5B454", border: "1px solid rgba(229,180,84,0.3)" }}
                  >
                    Go Premium
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* CTA */}
      <div className="px-5 py-5 flex-shrink-0">
        <button
          onClick={handleSave}
          disabled={saving || !calories}
          className="w-full rounded-2xl font-bold text-base transition-all active:scale-[0.98] disabled:opacity-40"
          style={{ height: 52, background: "#52B788", color: "#0d1f13" }}
        >
          {saving ? "Saving…" : "Add to Diary"}
        </button>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   EXERCISE SCREEN
═══════════════════════════════════════════════════════ */
function ExerciseScreen({ onBack, onClose }: { onBack: () => void; onClose: () => void }) {
  const navigate = useNavigate();
  const { hasWorkout: _hasWorkout } = useAccessLevel();

  const options = [
    {
      icon: <Bike className="w-6 h-6" />,
      label: "Cardio",
      sub: "Running, cycling, swimming & more",
      onTap: () => { hapticLight(); onClose(); navigate("/workout?tab=cardio"); },
    },
    {
      icon: <BarChart2 className="w-6 h-6" />,
      label: "Strength",
      sub: "Log sets, reps & weight",
      onTap: () => { hapticLight(); onClose(); navigate("/workout?tab=strength"); },
    },
    {
      icon: <ListChecks className="w-6 h-6" />,
      label: "Workout Routines",
      sub: "Follow a structured plan",
      onTap: () => { hapticLight(); onClose(); navigate("/workout"); },
    },
  ];

  return (
    <div className="fixed inset-0 z-[70] flex flex-col" style={{ background: "#1C1E27" }}>
      {/* Header */}
      <div className="relative flex items-center justify-center px-4 pt-5 pb-3 flex-shrink-0">
        <button onClick={onBack} className="absolute left-4 w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.08)" }}>
          <ChevronLeft className="w-5 h-5" style={{ color: "rgba(255,255,255,0.7)" }} />
        </button>
        <h1 className="text-base font-semibold text-white">Add Exercise</h1>
        <button onClick={onClose} className="absolute right-4 w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.08)" }}>
          <X className="w-4 h-4" style={{ color: "rgba(255,255,255,0.5)" }} />
        </button>
      </div>

      <div className="px-5 pt-4 space-y-3">
        {options.map((opt) => (
          <button
            key={opt.label}
            onClick={opt.onTap}
            className="w-full flex items-center gap-4 px-4 py-5 rounded-2xl text-left transition-all active:scale-[0.98]"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(82,183,136,0.12)", color: "#52B788" }}>
              {opt.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-base font-semibold text-white mb-0.5">{opt.label}</div>
              <div className="text-sm" style={{ color: "rgba(255,255,255,0.45)" }}>{opt.sub}</div>
            </div>
            <ChevronRight className="w-5 h-5 flex-shrink-0" style={{ color: "rgba(255,255,255,0.25)" }} />
          </button>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MEAL PICKER — MFP-style (shown when "Log Food" tapped)
═══════════════════════════════════════════════════════ */
const MEAL_OPTIONS = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch",     label: "Lunch"     },
  { value: "dinner",    label: "Dinner"    },
  { value: "snack",     label: "Snacks"    },
] as const;

function MealPickerScreen({ onBack, onClose }: { onBack: () => void; onClose: () => void }) {
  const navigate = useNavigate();
  return (
    <div className="px-4 pt-2 pb-8">
      {/* Handle */}
      <div className="flex justify-center mb-4">
        <div className="w-10 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
      </div>
      {/* Back + title */}
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => { hapticLight(); onBack(); }} className="p-2 -ml-2 rounded-xl active:bg-white/10">
          <ChevronLeft className="w-5 h-5" style={{ color: "rgba(255,255,255,0.6)" }} />
        </button>
        <span className="text-base font-semibold" style={{ color: "rgba(255,255,255,0.9)" }}>Select a Meal</span>
      </div>
      <div className="space-y-2">
        {MEAL_OPTIONS.map((m) => (
          <button
            key={m.value}
            onClick={() => {
              hapticLight();
              onClose();
              navigate(`/track?meal=${m.value}`);
            }}
            className="w-full flex items-center justify-between px-5 py-4 rounded-2xl text-left transition-all active:scale-[0.98]"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)" }}
          >
            <span className="text-base font-medium" style={{ color: "rgba(255,255,255,0.88)" }}>{m.label}</span>
            <ChevronRight className="w-4 h-4" style={{ color: "rgba(255,255,255,0.3)" }} />
          </button>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MENU SHEET (the initial bottom sheet)
═══════════════════════════════════════════════════════ */
const MENU_ITEMS: { icon: React.ReactNode; label: string; sub: string; screen: Screen; color: string }[] = [
  { icon: <UtensilsCrossed className="w-5 h-5" />, label: "Log Food", sub: "Search & log meals", screen: "log-food", color: "#52B788" },
  { icon: <Zap className="w-5 h-5" />, label: "Quick Add", sub: "Calories + macros", screen: "quick-add", color: "#F59E0B" },
  { icon: <Droplets className="w-5 h-5" />, label: "Log Water", sub: "Track hydration", screen: "log-water", color: "#3B82F6" },
  { icon: <Scale className="w-5 h-5" />, label: "Log Weight", sub: "Record your weight", screen: "log-weight", color: "#A78BFA" },
  { icon: <Dumbbell className="w-5 h-5" />, label: "Exercise", sub: "Cardio, strength & routines", screen: "exercise", color: "#F87171" },
];

function MenuSheet({ onClose: _onClose, onSelect }: { onClose: () => void; onSelect: (s: Screen) => void }) {
  return (
    <div className="px-4 pt-2 pb-8">
      {/* Handle */}
      <div className="flex justify-center mb-4">
        <div className="w-10 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }} />
      </div>
      <div className="space-y-2">
        {MENU_ITEMS.map((item) => (
          <button
            key={item.label}
            onClick={() => { hapticLight(); onSelect(item.screen); }}
            className="w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-left transition-all active:scale-[0.98]"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${item.color}18`, color: item.color }}
            >
              {item.icon}
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-white">{item.label}</div>
              <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>{item.sub}</div>
            </div>
            <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(255,255,255,0.2)" }} />
          </button>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN EXPORT
═══════════════════════════════════════════════════════ */
interface QuickActionsSheetProps {
  open: boolean;
  onClose: () => void;
}

export function QuickActionsSheet({ open, onClose }: QuickActionsSheetProps) {
  const [screen, setScreen] = useState<Screen>("menu");

  if (!open) return null;

  const handleClose = () => {
    setScreen("menu");
    onClose();
  };

  const handleSelect = (s: Screen) => setScreen(s);

  const handleBack = () => setScreen("menu");

  // Full-screen sub-screens
  if (screen === "log-food") return <MealPickerScreen onBack={handleBack} onClose={handleClose} />;
  if (screen === "log-weight") return <LogWeightScreen onBack={handleBack} onClose={handleClose} />;
  if (screen === "log-water") return <LogWaterScreen onBack={handleBack} onClose={handleClose} />;
  if (screen === "quick-add") return <QuickAddScreen onBack={handleBack} onClose={handleClose} />;
  if (screen === "exercise") return <ExerciseScreen onBack={handleBack} onClose={handleClose} />;

  // Menu bottom sheet
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60]"
        style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
        onClick={handleClose}
      />
      {/* Sheet */}
      <div
        className="fixed bottom-0 left-0 right-0 z-[60] rounded-t-3xl lg:hidden"
        style={{
          background: "#161820",
          maxWidth: 480,
          margin: "0 auto",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.6)",
        }}
      >
        <MenuSheet onClose={handleClose} onSelect={handleSelect} />
      </div>
      {/* Desktop modal */}
      <div
        className="hidden lg:flex fixed inset-0 z-[60] items-center justify-center"
        onClick={handleClose}
      >
        <div
          className="rounded-3xl w-full max-w-sm overflow-hidden"
          style={{ background: "#161820", boxShadow: "0 24px 80px rgba(0,0,0,0.8)" }}
          onClick={(e) => e.stopPropagation()}
        >
          <MenuSheet onClose={handleClose} onSelect={handleSelect} />
        </div>
      </div>
    </>
  );
}
