/**
 * SleepPage — Sleep tracking (photo 31)
 * - Date nav (prev/next)
 * - Donut "0h 0min Total Sleep"
 * - Stage bars: Awake / REM / Core / Deep (all N/A)
 * - "Psst...you awake?" Premium upsell card
 * - "Log meals for more insights" + Add Food CTA
 */
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Crown } from "lucide-react";
import { hapticLight } from "@/lib/haptics";
import { Button } from "@/components/ui/button";
import { useAccessLevel } from "@/components/RequireSubscription";

function SleepDonut({ hours, mins }: { hours: number; mins: number }) {
  const size = 200; const cx = 100; const cy = 100; const r = 80; const stroke = 14;
  const circ = 2 * Math.PI * r;
  const pct = Math.min((hours * 60 + mins) / 480, 1); // 8h = full
  const offset = circ * (1 - pct);
  return (
    <div className="flex flex-col items-center">
      <div style={{ position: "relative", width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#6B7BD4" strokeWidth={stroke}
            strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 0.8s ease" }} />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-2xl font-bold">{hours}h {mins}min</div>
          <div className="text-xs text-muted-foreground">Total Sleep</div>
        </div>
      </div>
    </div>
  );
}

type StageRow = { label: string; color: string; value: string | null };

function SleepStageRow({ label, color, value }: StageRow) {
  return (
    <div className="flex items-center px-4 py-4 border-b last:border-b-0" style={{ borderColor: "var(--border)" }}>
      <div className="w-3 h-3 rounded-full mr-3 flex-shrink-0" style={{ background: color }} />
      <span className="flex-1 text-sm font-medium">{label}</span>
      <span className="text-sm text-muted-foreground">{value ?? "N/A"}</span>
    </div>
  );
}

export function SleepPage() {
  const navigate = useNavigate();
  const { isPremium } = useAccessLevel();
  const [currentDate, setCurrentDate] = useState(new Date());

  const formatDate = (d: Date) => d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
  const prevDay = () => { hapticLight(); setCurrentDate(d => { const n = new Date(d); n.setDate(d.getDate() - 1); return n; }); };
  const nextDay = () => { hapticLight(); setCurrentDate(d => { const n = new Date(d); n.setDate(d.getDate() + 1); return n; }); };
  const isToday = currentDate.toDateString() === new Date().toDateString();

  const stages: StageRow[] = [
    { label: "Awake", color: "#ef4444", value: null },
    { label: "REM", color: "#8B5CF6", value: null },
    { label: "Core", color: "#4A9EFF", value: null },
    { label: "Deep", color: "#1E3A8A", value: null },
  ];

  return (
    <div className="pb-28 max-w-lg mx-auto animate-page-enter">
      {/* Header */}
      <div className="flex items-center px-4 pt-4 pb-3">
        <button onClick={() => navigate(-1)} className="mr-3">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-base font-semibold">Sleep</span>
      </div>

      {/* Date navigator */}
      <div className="flex items-center justify-center gap-4 mb-6 px-4">
        <button onClick={prevDay} className="w-8 h-8 flex items-center justify-center rounded-full" style={{ background: "var(--surface-card)" }}>
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-medium">{formatDate(currentDate)}</span>
        <button onClick={nextDay} disabled={isToday} className="w-8 h-8 flex items-center justify-center rounded-full disabled:opacity-30" style={{ background: "var(--surface-card)" }}>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Sleep donut */}
      <div className="flex justify-center mb-6">
        <SleepDonut hours={0} mins={0} />
      </div>

      {/* Stage bars */}
      <div className="mx-4 mb-4 rounded-2xl overflow-hidden" style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}>
        {stages.map(s => <SleepStageRow key={s.label} {...s} />)}
      </div>

      {/* Premium upsell: "Psst...you awake?" */}
      {!isPremium && (
        <div className="mx-4 mb-4 rounded-2xl p-5" style={{ background: "linear-gradient(135deg, #1a1a4e, #2d2066)", border: "1px solid rgba(107,123,212,0.3)" }}>
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="text-base font-bold mb-1">Psst...you awake? 👀</div>
              <div className="text-xs text-muted-foreground leading-relaxed">
                Unlock sleep stage tracking, insights, and sleep quality scores with Plate Premium.
              </div>
            </div>
            <Crown className="w-5 h-5 ml-3 flex-shrink-0" style={{ color: "#E5B454" }} />
          </div>
          <Button
            onClick={() => navigate("/onboarding/upgrade")}
            className="w-full rounded-full font-bold"
            style={{ background: "#E5B454", color: "#000" }}
          >
            Unlock Sleep Tracking
          </Button>
        </div>
      )}

      {/* Log meals insight */}
      <div className="mx-4 rounded-2xl p-4" style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}>
        <div className="text-sm font-medium mb-1">Log meals for more insights</div>
        <div className="text-xs text-muted-foreground mb-3">Track what you eat to see how food affects your sleep quality.</div>
        <Button
          onClick={() => navigate("/track")}
          variant="outline"
          size="sm"
          className="rounded-full px-4"
        >
          Add Food
        </Button>
      </div>
    </div>
  );
}
