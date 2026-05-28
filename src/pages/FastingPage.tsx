/**
 * FastingPage — Intermittent Fasting tracker (MFP-style, fully functional)
 */
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { ChevronLeft, Clock, Play, Square, CheckCircle } from "lucide-react";
import { hapticLight, hapticMedium } from "@/lib/haptics";
import { usePaywall } from "@/components/PaywallModal";
import { toast } from "sonner";

const FASTING_PROTOCOLS = [
  { label: "16:8", fastHours: 16, eatHours: 8, description: "Fast 16h, eat in 8h window", popular: true },
  { label: "18:6", fastHours: 18, eatHours: 6, description: "Fast 18h, eat in 6h window", popular: false },
  { label: "20:4", fastHours: 20, eatHours: 4, description: "Fast 20h, eat in 4h window", popular: false },
  { label: "5:2", fastHours: 0, eatHours: 0, description: "Eat normally 5 days, restrict 2", popular: false },
  { label: "OMAD", fastHours: 23, eatHours: 1, description: "One meal a day", popular: false },
];

function formatDuration(ms: number) {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function FastingPage() {
  const navigate = useNavigate();
  const { paywallNode, openPaywall } = usePaywall("general");
  const [activeProtocol, setActiveProtocol] = useState("16:8");
  const [isFasting, setIsFasting] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());

  // Load saved fasting state from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("plate_fasting");
      if (saved) {
        const { protocol, start } = JSON.parse(saved);
        setActiveProtocol(protocol);
        setStartTime(start);
        setIsFasting(true);
      }
    } catch {}
  }, []);

  // Tick every second when fasting
  useEffect(() => {
    if (!isFasting) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [isFasting]);

  const protocol = FASTING_PROTOCOLS.find(p => p.label === activeProtocol)!;
  const elapsed = startTime ? now - startTime : 0;
  const targetMs = (protocol.fastHours || 16) * 3600 * 1000;
  const pct = Math.min(elapsed / targetMs, 1);

  const handleStart = () => {
    openPaywall();
    hapticMedium();
    const start = Date.now();
    setStartTime(start);
    setIsFasting(true);
    try { localStorage.setItem("plate_fasting", JSON.stringify({ protocol: activeProtocol, start })); } catch {}
    toast.success("Fasting timer started!");
  };

  const handleStop = () => {
    hapticMedium();
    setIsFasting(false);
    setStartTime(null);
    try { localStorage.removeItem("plate_fasting"); } catch {}
    toast.success("Fast completed! 🎉");
  };

  const endTime = startTime ? new Date(startTime + targetMs) : null;

  // SVG donut
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const dash = pct * circumference;

  return (
    <div className="pb-28 max-w-lg mx-auto animate-page-enter">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <button onClick={() => { hapticLight(); navigate(-1); }} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-semibold">Intermittent Fasting</h1>
        {!isPremium ? (
          <button onClick={() => navigate("/onboarding/upgrade")} className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold" style={{ background: "#E5B454", color: "#000" }}>
            <Crown className="w-3 h-3" /> Pro
          </button>
        ) : <div className="w-9" />}
      </div>

      {/* Protocol selector */}
      <div className="px-4 mb-6">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {FASTING_PROTOCOLS.map((p) => (
            <button
              key={p.label}
              onClick={() => { if (!isFasting) { hapticLight(); setActiveProtocol(p.label); }}}
              disabled={isFasting}
              className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all"
              style={{
                background: activeProtocol === p.label ? "#52B788" : "rgba(255,255,255,0.07)",
                color: activeProtocol === p.label ? "#0d1f13" : "rgba(255,255,255,0.7)",
                border: p.popular && activeProtocol !== p.label ? "1px solid rgba(82,183,136,0.3)" : "1px solid transparent",
              }}
            >
              {p.label}
              {p.popular && activeProtocol !== p.label && <span className="ml-1 text-[9px] opacity-70">popular</span>}
            </button>
          ))}
        </div>
        <p className="text-xs mt-2 px-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
          {protocol.description}
        </p>
      </div>

      {/* Main timer donut */}
      <div className="flex flex-col items-center px-4 mb-6">
        <div className="relative" style={{ width: 220, height: 220 }}>
          <svg width={220} height={220} viewBox="0 0 220 220" style={{ transform: "rotate(-90deg)" }}>
            {/* Track */}
            <circle cx={110} cy={110} r={radius} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={18} />
            {/* Progress */}
            <circle
              cx={110} cy={110} r={radius} fill="none"
              stroke={pct >= 1 ? "#52B788" : "#52B788"}
              strokeWidth={18}
              strokeDasharray={`${dash} ${circumference}`}
              strokeLinecap="round"
              style={{ transition: "stroke-dasharray 1s linear", opacity: isFasting ? 1 : 0.3 }}
            />
          </svg>
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {isFasting ? (
              <>
                <span className="text-3xl font-black font-mono tabular-nums">{formatDuration(elapsed)}</span>
                <span className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>
                  {pct >= 1 ? "Fast complete! 🎉" : `of ${protocol.fastHours}h goal`}
                </span>
                {pct >= 1 && <CheckCircle className="w-5 h-5 mt-1" style={{ color: "#52B788" }} />}
              </>
            ) : (
              <>
                <Clock className="w-10 h-10 mb-2" style={{ color: "rgba(255,255,255,0.2)" }} />
                <span className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.4)" }}>Not fasting</span>
              </>
            )}
          </div>
        </div>

        {/* End time info */}
        {isFasting && endTime && (
          <div className="mt-3 px-4 py-2 rounded-xl text-center" style={{ background: "rgba(82,183,136,0.1)", border: "1px solid rgba(82,183,136,0.2)" }}>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
              Eating window opens at{" "}
              <span className="font-semibold" style={{ color: "#52B788" }}>
                {endTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
              </span>
            </p>
          </div>
        )}
      </div>

      {/* Start / Stop button */}
      <div className="px-4 mb-6">
        {isFasting ? (
          <button
            onClick={handleStop}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-bold transition-all active:scale-[0.97]"
            style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}
          >
            <Square className="w-4 h-4 fill-current" />
            Stop Fasting
          </button>
        ) : (
          <button
            onClick={handleStart}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-bold transition-all active:scale-[0.97]"
            style={{ background: "#52B788", color: "#0d1f13" }}
          >
            <Play className="w-4 h-4 fill-current" />
            Start Fasting
          </button>
        )}
      </div>

      {/* Benefits section */}
      <div className="px-4">
        <h3 className="text-sm font-semibold mb-3" style={{ color: "rgba(255,255,255,0.5)" }}>
          BENEFITS OF {activeProtocol}
        </h3>
        <div className="space-y-2">
          {[
            { icon: "🔥", title: "Fat Burning", desc: "Fasting shifts your body to burn stored fat for fuel" },
            { icon: "🧠", title: "Mental Clarity", desc: "Many people experience better focus during fasted states" },
            { icon: "❤️", title: "Metabolic Health", desc: "May improve insulin sensitivity and blood sugar levels" },
          ].map((b) => (
            <div key={b.title} className="flex items-start gap-3 p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <span className="text-xl">{b.icon}</span>
              <div>
                <p className="text-sm font-semibold">{b.title}</p>
                <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.45)" }}>{b.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
