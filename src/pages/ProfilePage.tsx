/**
 * ProfilePage — User profile (photo 42)
 * - Avatar circle + username + location + "Last Login"
 * - "0 lbs Lost" | "0 Friends"
 * - "Go Premium" gold button
 * - "Edit Profile" blue link
 */
import { useNavigate } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ChevronLeft, Crown, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAccessLevel } from "@/components/RequireSubscription";
import { useMemo } from "react";

export function ProfilePage() {
  const navigate = useNavigate();
  const profile = useQuery(api.profiles.getProfile);
  const progressLogs = useQuery(api.progress.getProgressLogs);
  const { isPremium } = useAccessLevel();

  const startWeight = (profile as any)?.weight ?? 0;
  const sortedLogs = useMemo(() => [...(progressLogs || [])].sort((a: any, b: any) => a.date.localeCompare(b.date)), [progressLogs]);
  const latestWeight = sortedLogs.length > 0 ? (sortedLogs[sortedLogs.length - 1].weight ?? startWeight) : startWeight;
  const lbsLost = Math.max(0, startWeight - latestWeight);

  if (!profile) {
    return (
      <div className="pb-28 max-w-lg mx-auto px-4 pt-4">
        <div className="h-96 skeleton-shimmer rounded-2xl" />
      </div>
    );
  }

  const displayName = profile.name || "User";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="pb-28 max-w-lg mx-auto animate-page-enter">
      {/* Header */}
      <div className="flex items-center px-4 pt-4 pb-3">
        <button onClick={() => navigate(-1)} className="mr-3">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-base font-semibold">My Profile</span>
      </div>

      {/* Avatar + info */}
      <div className="flex flex-col items-center px-4 py-8">
        {/* Avatar circle */}
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center text-4xl font-black mb-4"
          style={{ background: "rgba(82,183,136,0.15)", border: "3px solid rgba(82,183,136,0.3)", color: "#52B788" }}
        >
          {initial}
        </div>

        {/* Username */}
        <div className="text-xl font-bold mb-1">{displayName}</div>

        {/* Location */}
        <div className="text-sm text-muted-foreground mb-1">
          {(profile as any).location || ""}
        </div>

        {/* Last login */}
        <div className="text-xs text-muted-foreground mb-6">
          Last Login: Yesterday
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-10 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold">{lbsLost.toFixed(0)}</div>
            <div className="text-xs text-muted-foreground">lbs Lost</div>
          </div>
          <div className="w-px h-8" style={{ background: "var(--border)" }} />
          <div className="text-center">
            <div className="text-2xl font-bold">0</div>
            <div className="text-xs text-muted-foreground">Friends</div>
          </div>
        </div>

        {/* Go Premium button — only for free users */}
        {!isPremium && (
          <Button
            onClick={() => navigate("/onboarding/upgrade")}
            className="w-full max-w-xs h-12 rounded-full font-bold text-base mb-4"
            style={{ background: "#E5B454", color: "#000" }}
          >
            <Crown className="w-4 h-4 mr-2" /> Go Premium
          </Button>
        )}

        {/* Edit Profile link */}
        <button
          onClick={() => navigate("/settings")}
          className="text-sm font-semibold"
          style={{ color: "#3B82F6" }}
        >
          <Edit className="w-3.5 h-3.5 inline mr-1.5 mb-0.5" />
          Edit Profile
        </button>
      </div>
    </div>
  );
}
