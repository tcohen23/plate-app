/**
 * FastingPage — Intermittent Fasting tracker (MFP-style)
 */
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { ChevronLeft, Crown, Clock, Play, Square } from "lucide-react";
import { hapticLight } from "@/lib/haptics";
import { useAccessLevel } from "@/components/RequireSubscription";

const FASTING_PROTOCOLS = [
  { label: "16:8", description: "Fast 16h, eat in 8h window", popular: true },
  { label: "18:6", description: "Fast 18h, eat in 6h window", popular: false },
  { label: "5:2", description: "Eat normally 5 days, restrict 2", popular: false },
  { label: "OMAD", description: "One meal a day", popular: false },
  { label: "Custom", description: "Set your own schedule", popular: false },
];

export function FastingPage() {
  const navigate = useNavigate();
  const { isPremium } = useAccessLevel();
  const [activeProtocol, setActiveProtocol] = useState("16:8");
  const [isFasting, setIsFasting] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);

  const handleToggleFast = () => {
    if (!isPremium) return;
    hapticLight();
    if (!isFasting) {
      setStartTime(new Date());
      setIsFasting(true);
    } else {
      setIsFasting(false);
      setStartTime(null);
    }
  };

  const elapsed = startTime ? Math.floor((Date.now() - startTime.getTime()) / 1000) : 0;
  const hours = Math.floor(elapsed / 3600);
  const minutes = Math.floor((elapsed % 3600) / 60);
  const secs = elapsed % 60;

  return (
    <div className="pb-28 max-w-lg mx-auto animate-page-enter">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <button onClick={() => { hapticLight(); navigate(-1); }} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-semibold">Intermittent Fasting</h1>
        <div className="w-9" />
      </div>

      {!isPremium ? (
        /* Paywall state */
        <div className="px-4 pt-6">
          <div className="rounded-2xl p-6 flex flex-col items-center text-center" style={{ background: "rgba(229,180,84,0.08)", border: "1px solid rgba(229,180,84,0.2)" }}>
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: "rgba(229,180,84,0.15)" }}>
              <Crown className="w-8 h-8" style={{ color: "#E5B454" }} />
            </div>
            <h2 className="text-xl font-bold mb-2">Premium Feature</h2>
            <p className="text-sm mb-5" style={{ color: "var(--muted-foreground)" }}>
              Track your fasting windows, set custom schedules, and see how fasting affects your progress — available in Plate Premium.
            </p>
            <button
              onClick={() => { hapticLight(); navigate("/onboarding/upgrade"); }}
              className="px-8 py-3 rounded-full text-sm font-bold transition-all active:scale-95"
              style={{ background: "#E5B454", color: "#000" }}
            >
              Upgrade to Premium
            </button>
          </div>

          {/* Preview */}
          <div className="mt-6">
            <h3 className="text-base font-bold mb-3 px-1">Fasting Protocols</h3>
            <div className="space-y-2">
              {FASTING_PROTOCOLS.map((p) => (
                <div
                  key={p.label}
                  className="flex items-center justify-between px-4 py-3.5 rounded-xl opacity-50"
                  style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}
                >
                  <div>
                    <span className="text-sm font-bold mr-2">{p.label}</span>
                    {p.popular && <span className="text-xs px-2 py-0.5 rounded" style={{ background: "rgba(82,183,136,0.15)", color: "#52B788" }}>Popular</span>}
                    <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>{p.description}</p>
                  </div>
                  <Crown className="w-4 h-4" style={{ color: "#E5B454" }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Premium: full fasting tracker */
        <div className="px-4">
          {/* Timer */}
          <div className="rounded-2xl p-6 flex flex-col items-center mb-4" style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}>
            <Clock className="w-8 h-8 mb-3" style={{ color: isFasting ? "#52B788" : "rgba(255,255,255,0.3)" }} />
            <div className="text-5xl font-black tabular-nums mb-2">
              {String(hours).padStart(2, "0")}:{String(minutes).padStart(2, "0")}:{String(secs).padStart(2, "0")}
            </div>
            <p className="text-sm mb-4" style={{ color: "var(--muted-foreground)" }}>
              {isFasting ? `Fasting since ${startTime?.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}` : "Start your fast"}
            </p>
            <button
              onClick={handleToggleFast}
              className="w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-90"
              style={{ background: isFasting ? "rgba(239,68,68,0.2)" : "rgba(82,183,136,0.2)", border: `2px solid ${isFasting ? "#ef4444" : "#52B788"}` }}
            >
              {isFasting ? <Square className="w-6 h-6" style={{ color: "#ef4444" }} /> : <Play className="w-6 h-6 ml-0.5" style={{ color: "#52B788" }} />}
            </button>
          </div>

          {/* Protocols */}
          <h3 className="text-base font-bold mb-3">Protocol</h3>
          <div className="space-y-2">
            {FASTING_PROTOCOLS.map((p) => (
              <button
                key={p.label}
                onClick={() => { hapticLight(); setActiveProtocol(p.label); }}
                className="w-full flex items-center justify-between px-4 py-3.5 rounded-xl text-left transition-all active:scale-[0.98]"
                style={{
                  background: activeProtocol === p.label ? "rgba(82,183,136,0.1)" : "var(--surface-card)",
                  border: `1px solid ${activeProtocol === p.label ? "#52B788" : "var(--border)"}`,
                }}
              >
                <div>
                  <span className="text-sm font-bold mr-2">{p.label}</span>
                  {p.popular && <span className="text-xs px-2 py-0.5 rounded" style={{ background: "rgba(82,183,136,0.15)", color: "#52B788" }}>Popular</span>}
                  <p className="text-xs mt-0.5" style={{ color: "var(--muted-foreground)" }}>{p.description}</p>
                </div>
                {activeProtocol === p.label && (
                  <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "#52B788" }}>
                    <span className="text-xs text-black font-bold">✓</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
