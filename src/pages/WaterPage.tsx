/**
 * WaterPage — Water / Hydration tracker sub-page
 * Accessible from More > Water and from Healthy Habits row
 */
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Droplets, Plus, Minus } from "lucide-react";
import { hapticLight } from "@/lib/haptics";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { toast } from "sonner";
import { useState } from "react";

const GLASS_SIZE_OZ = 8;

export function WaterPage() {
  const navigate = useNavigate();
  const todaysHydration = useQuery(api.progress.getTodaysHydration, {});
  const logHydration = useMutation(api.progress.logHydration);
  const [logging, setLogging] = useState(false);

  const currentGlasses = todaysHydration?.glasses ?? 0;
  const hydrationTarget = todaysHydration?.target ?? 8;
  const ozConsumed = currentGlasses * GLASS_SIZE_OZ;
  const ozGoal = hydrationTarget * GLASS_SIZE_OZ;
  const pct = hydrationTarget > 0 ? Math.min(currentGlasses / hydrationTarget, 1) : 0;

  const handleLog = async (glasses: number) => {
    if (logging) return;
    hapticLight();
    setLogging(true);
    try {
      await logHydration({ glasses: Math.max(0, Math.min(glasses, hydrationTarget)) });
      if (glasses > currentGlasses) toast.success("Glass logged 💧");
    } catch {
      toast.error("Failed to log water");
    } finally {
      setLogging(false);
    }
  };

  return (
    <div className="pb-28 max-w-lg mx-auto animate-page-enter">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <button
          onClick={() => { hapticLight(); navigate(-1); }}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.06)" }}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-semibold">Water</h1>
        <div className="w-9" />
      </div>

      {/* Big water ring */}
      <div className="flex flex-col items-center py-8">
        <div className="relative" style={{ width: 180, height: 180 }}>
          <svg width="180" height="180" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="90" cy="90" r="74" fill="none" stroke="rgba(74,158,255,0.1)" strokeWidth="14" />
            <circle
              cx="90" cy="90" r="74" fill="none"
              stroke="#4A9EFF" strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={2 * Math.PI * 74}
              strokeDashoffset={2 * Math.PI * 74 * (1 - pct)}
              style={{ transition: "stroke-dashoffset 0.6s ease" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Droplets className="w-6 h-6 mb-1" style={{ color: "#4A9EFF" }} />
            <div className="text-2xl font-bold">{ozConsumed} oz</div>
            <div className="text-xs text-muted-foreground">of {ozGoal} oz goal</div>
          </div>
        </div>
        <div className="text-sm text-muted-foreground mt-2">
          {currentGlasses} of {hydrationTarget} glasses
        </div>
      </div>

      {/* Glass dots */}
      <div className="px-6 mb-6">
        <div className="flex items-center gap-2 flex-wrap justify-center">
          {Array.from({ length: hydrationTarget }).map((_, i) => (
            <button
              key={i}
              onClick={() => handleLog(i + 1)}
              className="w-8 h-8 rounded-full transition-all duration-300 active:scale-90"
              style={{
                background: i < currentGlasses ? "#4A9EFF" : "rgba(74,158,255,0.12)",
                border: i < currentGlasses ? "none" : "1.5px solid rgba(74,158,255,0.3)",
              }}
            />
          ))}
        </div>
      </div>

      {/* +/- buttons */}
      <div className="px-6 flex gap-3">
        <button
          onClick={() => handleLog(Math.max(0, currentGlasses - 1))}
          disabled={currentGlasses <= 0 || logging}
          className="flex-1 py-3.5 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.97] disabled:opacity-40"
          style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.8)" }}
        >
          <Minus className="w-4 h-4" />
          Remove glass
        </button>
        <button
          onClick={() => handleLog(Math.min(currentGlasses + 1, hydrationTarget))}
          disabled={currentGlasses >= hydrationTarget || logging}
          className="flex-1 py-3.5 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.97] disabled:opacity-40"
          style={{ background: "rgba(74,158,255,0.15)", border: "1px solid rgba(74,158,255,0.3)", color: "#4A9EFF" }}
        >
          <Plus className="w-4 h-4" />
          Add a glass
        </button>
      </div>

      {/* Info card */}
      <div className="mx-4 mt-6 rounded-2xl p-4" style={{ background: "rgba(74,158,255,0.07)", border: "1px solid rgba(74,158,255,0.15)" }}>
        <div className="text-xs font-semibold mb-1" style={{ color: "#4A9EFF" }}>💡 Did you know?</div>
        <div className="text-xs text-muted-foreground">
          Drinking enough water supports metabolism, reduces hunger, and improves energy. Aim for 8 glasses (64 oz) daily.
        </div>
      </div>
    </div>
  );
}
