import { useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { X } from "lucide-react";

/* ── Difficulty tiers by XP ── */
function getDifficulty(xp: number, category: string): { label: string; color: string; badge: string } {
  if (category === "super") return { label: "LEGENDARY", color: "#FFD700", badge: "🌈" };
  if (xp === 0) return { label: "COMMON", color: "#94a3b8", badge: "🥉" };
  if (xp <= 25) return { label: "COMMON", color: "#94a3b8", badge: "🥉" };
  if (xp <= 100) return { label: "UNCOMMON", color: "#22c55e", badge: "🥈" };
  if (xp <= 500) return { label: "RARE", color: "#f59e0b", badge: "🥇" };
  if (xp <= 1500) return { label: "EPIC", color: "#8b5cf6", badge: "💠" };
  return { label: "LEGENDARY", color: "#FFD700", badge: "💎" };
}

const PUMP_MESSAGES = [
  "Keep going, you're building something.",
  "Look at you go.",
  "That's what consistency looks like.",
  "One step at a time and you're moving.",
  "Not everyone makes it this far.",
  "Progress is progress, no matter how small.",
  "You showing up is the whole thing.",
  "That didn't happen by accident.",
  "You earned that.",
  "The work is working.",
];

function getPumpMessage(type: string): string {
  // Deterministic based on type string so it's consistent
  let hash = 0;
  for (let i = 0; i < type.length; i++) hash = (hash * 31 + type.charCodeAt(i)) & 0xffffffff;
  return PUMP_MESSAGES[Math.abs(hash) % PUMP_MESSAGES.length];
}

interface AchievementData {
  type: string;
  name: string;
  description: string;
  xp: number;
  emoji: string;
  category: string;
}

interface AchievementPopupProps {
  achievements: AchievementData[];
  onDone: () => void;
}

export function AchievementPopup({ achievements, onDone }: AchievementPopupProps) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [animating, setAnimating] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const current = achievements[index];

  // Auto-dismiss after 5s
  useEffect(() => {
    setAnimating(true);
    timerRef.current = setTimeout(() => advance(), 5000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [index]);

  function advance() {
    if (timerRef.current) clearTimeout(timerRef.current);
    setAnimating(false);
    setTimeout(() => {
      if (index < achievements.length - 1) {
        setIndex(index + 1);
        setAnimating(true);
      } else {
        setVisible(false);
        setTimeout(onDone, 300);
      }
    }, 200);
  }

  if (!visible || !current) return null;

  const diff = getDifficulty(current.xp, current.category);
  const msg = getPumpMessage(current.type);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center pb-24 px-4 pointer-events-none"
    >
      <div
        className="pointer-events-auto w-full max-w-sm"
        style={{
          transform: animating ? "translateY(0)" : "translateY(20px)",
          opacity: animating ? 1 : 0,
          transition: "transform 0.35s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease",
        }}
      >
        <div
          className="rounded-2xl overflow-hidden shadow-2xl"
          style={{
            background: "var(--background)",
            border: `2px solid ${diff.color}`,
          }}
        >
          {/* Top bar */}
          <div
            className="flex items-center justify-between px-4 py-2"
            style={{ background: diff.color + "22" }}
          >
            <span className="text-xs font-bold tracking-widest" style={{ color: diff.color }}>
              {diff.badge} {diff.label}
            </span>
            <button
              onClick={advance}
              className="rounded-full p-1 hover:bg-black/10 transition-colors"
              style={{ color: diff.color }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Body */}
          <div className="px-5 py-4 flex items-start gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 text-3xl"
              style={{ background: diff.color + "22", border: `1.5px solid ${diff.color}44` }}
            >
              {current.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground mb-0.5 font-medium">Achievement Unlocked</p>
              <h3 className="font-serif text-lg leading-tight">{current.name}</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-snug">{current.description}</p>
            </div>
          </div>

          {/* Message + XP */}
          <div className="px-5 pb-4 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground italic flex-1">{msg}</p>
            {current.xp > 0 && (
              <span
                className="text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0"
                style={{ background: diff.color + "22", color: diff.color }}
              >
                +{current.xp} XP
              </span>
            )}
          </div>

          {/* Progress dots if multiple */}
          {achievements.length > 1 && (
            <div className="pb-3 flex justify-center gap-1.5">
              {achievements.map((_, i) => (
                <div
                  key={i}
                  className="rounded-full transition-all"
                  style={{
                    width: i === index ? 16 : 6,
                    height: 6,
                    background: i === index ? diff.color : diff.color + "44",
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Hook: poll for new achievements and show popup ── */
export function useAchievementPoller() {
  const checkAchievements = useMutation(api.progress.checkAndAwardAchievements);
  const [pendingAchievements, setPendingAchievements] = useState<AchievementData[]>([]);
  const [showing, setShowing] = useState(false);

  async function check() {
    try {
      const newOnes = await checkAchievements();
      if (newOnes && newOnes.length > 0) {
        setPendingAchievements((prev: AchievementData[]) => [...prev, ...newOnes]);
        setShowing(true);
      }
    } catch {}
  }

  function dismiss() {
    setShowing(false);
    setPendingAchievements([]);
  }

  const popup = showing && pendingAchievements.length > 0 ? (
    <AchievementPopup achievements={pendingAchievements} onDone={dismiss} />
  ) : null;

  return { check, popup };
}
