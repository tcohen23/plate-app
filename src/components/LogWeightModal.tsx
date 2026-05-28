/**
 * LogWeightModal — Full-screen weight logging modal
 *
 * Opened by the center "+" button in the bottom nav.
 * Custom numpad (digit-by-digit), date picker, "Log weight" CTA.
 * Saves to the same progressLogs backend as ProgressPage.
 */
import { useState } from "react";
import { X, Pencil, Camera, Delete } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { hapticLight, hapticMedium } from "@/lib/haptics";
import { toast } from "sonner";

interface LogWeightModalProps {
  open: boolean;
  onClose: () => void;
}

const NUMPAD_KEYS = ["1","2","3","4","5","6","7","8","9",".","0","⌫"] as const;

export function LogWeightModal({ open, onClose }: LogWeightModalProps) {
  const [digits, setDigits] = useState("");
  const [unit] = useState<"lbs" | "kg">("lbs");
  // Date — default today in YYYY-MM-DD
  const todayStr = new Date().toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "numeric" });
  const todayISO = new Date().toISOString().split("T")[0];
  const [dateLabel, setDateLabel] = useState("Today");
  const [dateISO, setDateISO] = useState(todayISO);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const logWeight = useMutation(api.progress.logWeight);

  if (!open) return null;

  const handleKey = (key: typeof NUMPAD_KEYS[number]) => {
    hapticLight();
    if (key === "⌫") {
      setDigits(d => d.slice(0, -1));
      return;
    }
    // Only allow one decimal point
    if (key === "." && digits.includes(".")) return;
    // Max 6 chars total (e.g. "999.99")
    if (digits.length >= 6) return;
    // Don't allow leading zeros except "0."
    if (digits === "0" && key !== ".") return;
    setDigits(d => d + key);
  };

  const handleLog = async () => {
    const val = parseFloat(digits);
    if (!digits || isNaN(val) || val <= 0) {
      toast.error("Enter your weight");
      return;
    }
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

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const iso = e.target.value;
    setDateISO(iso);
    if (iso === todayISO) {
      setDateLabel("Today");
    } else {
      const d = new Date(iso + "T12:00:00");
      setDateLabel(d.toLocaleDateString("en-US", { month: "short", day: "numeric" }));
    }
    setShowDatePicker(false);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col"
      style={{ background: "#1C1E27" }}
    >
      {/* Header */}
      <div className="relative flex items-center justify-center px-4 pt-5 pb-3">
        <button
          onClick={onClose}
          className="absolute left-4 w-9 h-9 rounded-full flex items-center justify-center transition-opacity active:opacity-60"
          style={{ background: "rgba(255,255,255,0.08)" }}
        >
          <X className="w-5 h-5" style={{ color: "rgba(255,255,255,0.7)" }} />
        </button>
        <h1 className="text-base font-semibold text-white">Log weight</h1>
      </div>

      {/* Big weight display */}
      <div className="flex-1 flex flex-col items-center justify-center pb-4">
        <div className="flex items-center gap-3">
          {/* Number display */}
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
            {/* Blue cursor line — mimics iOS numeric input */}
            <span
              className="absolute right-[-4px] bottom-2 w-[2px] animate-pulse"
              style={{
                height: 48,
                background: "#3B82F6",
                borderRadius: 2,
              }}
            />
          </div>
          <span
            className="text-2xl font-light mb-1"
            style={{ color: "rgba(255,255,255,0.45)" }}
          >
            {unit}
          </span>
        </div>
      </div>

      {/* Date + Progress Photo row */}
      <div className="flex px-6 gap-4 mb-5">
        {/* Date */}
        <div className="flex-1 flex flex-col gap-1">
          <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>
            Date
          </span>
          <button
            onClick={() => setShowDatePicker(v => !v)}
            className="flex items-center gap-1.5 transition-opacity active:opacity-70"
          >
            <span className="text-sm font-semibold" style={{ color: "#3B82F6" }}>
              {dateLabel}
            </span>
            <Pencil className="w-3.5 h-3.5" style={{ color: "#3B82F6" }} />
          </button>
          {showDatePicker && (
            <input
              type="date"
              value={dateISO}
              max={todayISO}
              onChange={handleDateChange}
              className="mt-1 text-xs rounded-lg px-2 py-1 outline-none"
              style={{
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "#fff",
                colorScheme: "dark",
              }}
              autoFocus
            />
          )}
        </div>

        {/* Progress Photo */}
        <div className="flex-1 flex flex-col gap-1">
          <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>
            Progress Photo
          </span>
          <button className="flex items-center gap-1.5 transition-opacity active:opacity-70">
            <span className="text-sm font-semibold" style={{ color: "#3B82F6" }}>
              Add
            </span>
            <Camera className="w-3.5 h-3.5" style={{ color: "#3B82F6" }} />
          </button>
        </div>
      </div>

      {/* Log weight button */}
      <div className="px-6 mb-4">
        <button
          onClick={handleLog}
          disabled={saving || !digits}
          className="w-full h-13 rounded-2xl text-base font-bold transition-all active:scale-[0.98] disabled:opacity-40"
          style={{
            height: 52,
            background: "#3B82F6",
            color: "#fff",
          }}
        >
          {saving ? "Saving…" : "Log weight"}
        </button>
      </div>

      {/* Custom numpad */}
      <div
        className="grid grid-cols-3 gap-px pb-safe"
        style={{ background: "rgba(255,255,255,0.06)", borderTop: "1px solid rgba(255,255,255,0.08)" }}
      >
        {NUMPAD_KEYS.map((key) => (
          <button
            key={key}
            onClick={() => handleKey(key)}
            className="flex items-center justify-center transition-all active:bg-white/10"
            style={{
              height: 68,
              background: key === "⌫" ? "rgba(255,255,255,0.03)" : "#1C1E27",
              fontSize: key === "⌫" ? 22 : 26,
              fontWeight: key === "⌫" ? 400 : 300,
              color: "rgba(255,255,255,0.85)",
              border: "none",
            }}
          >
            {key === "⌫" ? <Delete className="w-6 h-6" style={{ color: "rgba(255,255,255,0.6)" }} /> : key}
          </button>
        ))}
      </div>
    </div>
  );
}
