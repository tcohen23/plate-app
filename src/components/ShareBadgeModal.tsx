import { useRef } from "react";
import { X, Share2, Copy, Check } from "lucide-react";
import { parseAvatarChoice } from "@/pages/SettingsPage";
import { useState } from "react";
import { toast } from "sonner";

const PLATE_URL = "https://plate-71e84f88.viktor.space";

interface ShareBadgeProps {
  onClose: () => void;
  profile: {
    name?: string;
    avatarChoice?: string;
    photoUrl?: string;
    goal?: string;
  };
  stats: {
    level: number;
    xp: number;
    currentStreak: number;
    totalMealsLogged: number;
  };
}

function GoalLabel(goal: string | undefined) {
  if (goal === "fat_loss") return "Cutting";
  if (goal === "muscle_gain") return "Bulking";
  if (goal === "maintenance") return "Maintaining";
  return "Eating right";
}

function LevelBadge({ level }: { level: number }) {
  const tiers = [
    { min: 1,  max: 9,  label: "Rookie",      color: "#8B8B8B" },
    { min: 10, max: 19, label: "Regular",      color: "#4EAAF0" },
    { min: 20, max: 34, label: "Dedicated",    color: "#52B788" },
    { min: 35, max: 49, label: "Elite",        color: "#F4A261" },
    { min: 50, max: 69, label: "Pro",          color: "#9B72CF" },
    { min: 70, max: 89, label: "Expert",       color: "#E76F51" },
    { min: 90, max: 99, label: "Legend",       color: "#FFD700" },
    { min: 100,max: 999,label: "Godmode",      color: "#FF4FC8" },
  ];
  const tier = tiers.find((t) => level >= t.min && level <= t.max) || tiers[0];
  return { label: tier.label, color: tier.color };
}

export function ShareBadgeModal({ onClose, profile, stats }: ShareBadgeProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const parsed = parseAvatarChoice((profile as any).avatarChoice);
  const firstName = (profile.name || "").split(" ")[0] || "User";
  const { label: tierLabel, color: tierColor } = LevelBadge({ level: stats.level });
  const goalText = GoalLabel(profile.goal);

  async function handleShare() {
    const streakLine = stats.currentStreak > 0 ? ` ${stats.currentStreak} day streak,` : "";
    const text = `Level ${stats.level} ${tierLabel} on Plate.${streakLine} ${stats.totalMealsLogged} meals tracked. This app is built different 🍽️`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Plate — Nutrition, Perfected.", text, url: PLATE_URL });
      } catch {
        // user cancelled
      }
    } else {
      await navigator.clipboard.writeText(`${text}\n${PLATE_URL}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Link copied!");
    }
  }

  async function handleCopyLink() {
    await navigator.clipboard.writeText(PLATE_URL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Link copied!");
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-5"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-sm rounded-3xl pb-6 pt-5 px-5 flex flex-col gap-5"
        style={{ background: "var(--surface-card)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-base font-bold">Share Plate</span>
          <button onClick={onClose} className="rounded-full p-1.5" style={{ background: "var(--surface-overlay)" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Badge Card */}
        <div
          ref={cardRef}
          className="rounded-2xl overflow-hidden relative"
          style={{
            background: "linear-gradient(135deg, #0a1a12 0%, #0d2318 60%, #091510 100%)",
            border: "1px solid rgba(82,183,136,0.25)",
            boxShadow: "0 0 40px rgba(82,183,136,0.12)",
          }}
        >
          {/* Glow orb */}
          <div
            className="absolute top-0 right-0 w-48 h-48 rounded-full pointer-events-none"
            style={{
              background: `radial-gradient(circle, ${tierColor}22 0%, transparent 70%)`,
              transform: "translate(30%, -30%)",
            }}
          />

          <div className="relative p-5 flex flex-col gap-4">
            {/* Top row: avatar + name + tier */}
            <div className="flex items-center gap-3">
              {/* Avatar */}
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden"
                style={{ background: parsed?.type === "emoji" ? parsed.bg : "#1a2e22" }}
              >
                {profile.photoUrl ? (
                  <img src={profile.photoUrl} alt="" className="w-full h-full object-cover" />
                ) : parsed?.type === "emoji" ? (
                  <span>{parsed.emoji}</span>
                ) : (
                  <span className="text-2xl font-bold" style={{ color: "#52B788" }}>
                    {firstName[0]?.toUpperCase()}
                  </span>
                )}
              </div>

              {/* Name + goal */}
              <div className="flex-1 min-w-0">
                <div className="text-white font-bold text-lg leading-tight truncate">{firstName}</div>
                <div className="text-sm mt-0.5" style={{ color: "#52B788" }}>{goalText}</div>
              </div>

              {/* Tier badge */}
              <div
                className="px-3 py-1 rounded-full text-xs font-bold"
                style={{ background: `${tierColor}22`, color: tierColor, border: `1px solid ${tierColor}55` }}
              >
                {tierLabel}
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: "rgba(82,183,136,0.15)" }} />

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              <StatBox label="Level" value={String(stats.level)} color={tierColor} />
              <StatBox label="Streak" value={`${stats.currentStreak}d`} color="#F4A261" />
              <StatBox label="Meals" value={String(stats.totalMealsLogged)} color="#4EAAF0" />
            </div>

            {/* Plate branding */}
            <div className="flex items-center justify-between mt-1">
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black"
                  style={{ background: "#52B788", color: "#000" }}
                >
                  P
                </div>
                <span className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.5)" }}>
                  Plate — Nutrition, Perfected.
                </span>
              </div>
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                plate.app
              </span>
            </div>
          </div>
        </div>

        {/* Hint */}
        <p className="text-xs text-center" style={{ color: "rgba(255,255,255,0.4)" }}>
          Screenshot the card above to share on Instagram or TikTok
        </p>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={handleShare}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm"
            style={{ background: "#52B788", color: "#000" }}
          >
            <Share2 className="w-4 h-4" />
            Invite Friends
          </button>
          <button
            onClick={handleCopyLink}
            className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl font-semibold text-sm"
            style={{ background: "var(--surface-overlay)", color: "var(--foreground)" }}
          >
            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied" : "Copy Link"}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      className="rounded-xl flex flex-col items-center justify-center py-3 gap-0.5"
      style={{ background: "rgba(255,255,255,0.04)" }}
    >
      <span className="text-xl font-black" style={{ color }}>{value}</span>
      <span className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>{label}</span>
    </div>
  );
}
