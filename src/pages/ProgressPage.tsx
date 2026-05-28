/**
 * ProgressPage — "Progress" tab
 * Redesign: MFP-psychology layout
 * - XP / level hero card
 * - Stats row (streak, meals logged, best streak, protein streak)
 * - Weight chart with check-in form
 * - Achievements grid
 * - Leaderboard (unlocks at 1000 users)
 */
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { xpToReachLevel, xpNeededForNextLevel } from "@/lib/levelUtils";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Trophy, TrendingDown, TrendingUp, Flame, Target, Plus, X, Star, BarChart2 } from "lucide-react";
import { ACHIEVEMENT_DEFS } from "@/lib/achievementDefs";
import { hapticLight, hapticMedium } from "@/lib/haptics";

function getDifficultyStyle(xp: number, category: string) {
  if (category === "super") return { color: "#FFD700", label: "LEGENDARY", badge: "🌈" };
  if (xp === 0 || xp <= 25) return { color: "#94a3b8", label: "COMMON", badge: "🥉" };
  if (xp <= 100) return { color: "#22c55e", label: "UNCOMMON", badge: "🥈" };
  if (xp <= 500) return { color: "#f59e0b", label: "RARE", badge: "🥇" };
  if (xp <= 1500) return { color: "#8b5cf6", label: "EPIC", badge: "💠" };
  return { color: "#FFD700", label: "LEGENDARY", badge: "💎" };
}

export function ProgressPage() {
  const stats = useQuery(api.progress.getUserStats, {});
  const progressLogs = useQuery(api.progress.getProgressLogs);
  const achievements = useQuery(api.progress.getAchievements);
  const leaderboard = useQuery(api.progress.getLeaderboard);
  const totalCount = useQuery(api.progress.getTotalAchievementCount);
  const totalUsers = useQuery(api.profiles.getTotalUserCount);
  const profile = useQuery(api.profiles.getProfile);
  const logWeight = useMutation(api.progress.logWeight);

  const [showLogWeight, setShowLogWeight] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [leaderboardTab, setLeaderboardTab] = useState<"xp" | "achievements" | "streak" | "meals">("xp");
  const [newWeight, setNewWeight] = useState("");
  const [newBodyFat, setNewBodyFat] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (searchParams.get("logWeight") === "1") {
      setShowLogWeight(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleLogWeight = async () => {
    if (!newWeight) { toast.error("Enter your weight"); return; }
    try {
      await logWeight({
        weight: parseFloat(newWeight),
        bodyFat: newBodyFat ? parseFloat(newBodyFat) : undefined,
        notes: notes || undefined,
      });
      hapticMedium();
      toast.success("Weight logged ✓");
      setShowLogWeight(false);
      setNewWeight(""); setNewBodyFat(""); setNotes("");
    } catch (e: any) { toast.error(e.message); }
  };

  if (!stats || !profile) {
    return (
      <div className="px-4 pt-5 max-w-lg mx-auto space-y-4">
        <div className="h-32 rounded-2xl animate-pulse" style={{ background: "var(--surface-card)" }} />
        <div className="grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: "var(--surface-card)" }} />
          ))}
        </div>
      </div>
    );
  }

  const sortedLogs = [...(progressLogs || [])].sort((a: any, b: any) => a.date.localeCompare(b.date));
  const startWeight = profile.weight ?? 0;
  const latestWeight: number = sortedLogs.length > 0 ? (sortedLogs[sortedLogs.length - 1].weight ?? startWeight) : startWeight;
  const weightChange = latestWeight - startWeight;
  const goal = (profile as any).goal ?? "fat_loss";

  let trendColor = "#64748b";
  let progressColor = "#64748b";
  if (goal === "fat_loss") {
    trendColor = weightChange < 0 ? "#22c55e" : weightChange > 0 ? "#ef4444" : "#64748b";
    progressColor = trendColor;
  } else if (goal === "muscle_gain") {
    trendColor = weightChange > 0 ? "#22c55e" : weightChange < 0 ? "#ef4444" : "#64748b";
    progressColor = trendColor;
  } else {
    trendColor = Math.abs(weightChange) <= 2 ? "#22c55e" : "#f97316";
    progressColor = trendColor;
  }

  const xpForCurrentLevel = xpToReachLevel(stats.level);
  const xpForNextLevel = xpToReachLevel(stats.level + 1);
  const xpIntoThisLevel = stats.xp - xpForCurrentLevel;
  const xpNeededThisLevel = xpNeededForNextLevel(stats.level);
  const xpProgress = Math.min((xpIntoThisLevel / xpNeededThisLevel) * 100, 100);

  return (
    <div className="px-4 pt-4 pb-6 max-w-lg md:max-w-2xl lg:max-w-5xl mx-auto space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Progress</h1>
        <Button
          size="sm"
          variant="outline"
          className="h-8 rounded-full text-xs px-3 gap-1"
          onClick={() => { hapticLight(); setShowLogWeight(!showLogWeight); }}
        >
          {showLogWeight ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
          {showLogWeight ? "Cancel" : "Log Weight"}
        </Button>
      </div>

      {/* Log weight form */}
      {showLogWeight && (
        <div
          className="rounded-2xl p-4 space-y-3"
          style={{ background: "var(--surface-card)", border: "1px solid var(--border)", animation: "fadeIn 0.15s ease" }}
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Weight Check-In</p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Weight (lbs) *</label>
              <Input value={newWeight} onChange={(e) => setNewWeight(e.target.value)} placeholder="170" className="h-9 rounded-xl text-sm" type="number" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Body Fat %</label>
              <Input value={newBodyFat} onChange={(e) => setNewBodyFat(e.target.value)} placeholder="Optional" className="h-9 rounded-xl text-sm" type="number" />
            </div>
          </div>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" className="h-9 rounded-xl text-sm" />
          <Button onClick={handleLogWeight} className="w-full h-10 rounded-xl text-sm font-semibold">Save Check-In</Button>
        </div>
      )}

      {/* Level / XP card */}
      <div
        className="rounded-2xl p-5"
        style={{ background: "var(--plate-green-deep)", border: "1px solid rgba(82,183,136,0.2)" }}
      >
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(82,183,136,0.2)", border: "2px solid rgba(82,183,136,0.4)" }}
          >
            <span className="text-2xl font-bold" style={{ color: "#52B788" }}>{stats.level}</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold" style={{ color: "#fff" }}>Level {stats.level}</span>
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>{stats.xp.toLocaleString()} XP</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(82,183,136,0.15)" }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${xpProgress}%`, background: "#52B788" }}
              />
            </div>
            <div className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
              {Math.max(xpForNextLevel - stats.xp, 0)} XP to next level
            </div>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { icon: <Flame className="w-4 h-4" style={{ color: "#f97316" }} />, label: "Streak", value: stats.currentStreak, unit: "days" },
          { icon: <Trophy className="w-4 h-4" style={{ color: "#f59e0b" }} />, label: "Best Streak", value: stats.longestStreak, unit: "days" },
          { icon: <Target className="w-4 h-4" style={{ color: "var(--muted-foreground)" }} />, label: "Meals Logged", value: stats.totalMealsLogged, unit: "" },
          { icon: <Star className="w-4 h-4" style={{ color: "#4A9EFF" }} />, label: "Protein Streak", value: stats.proteinGoalStreak, unit: "days" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl p-4" style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}>
            <div className="flex items-center gap-2 mb-2">
              {s.icon}
              <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">{s.label}</span>
            </div>
            <div className="text-2xl font-bold">
              {s.value}
              {s.unit && <span className="text-xs font-normal text-muted-foreground ml-1">{s.unit}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Weight progress card */}
      <div className="rounded-2xl p-4 space-y-4" style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Weight</h2>
          <div className="flex items-center gap-1 text-xs font-semibold" style={{ color: trendColor }}>
            {weightChange < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
            {weightChange === 0 ? "0.0 lbs" : `${weightChange > 0 ? "+" : ""}${weightChange.toFixed(1)} lbs`}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Start</div>
            <div className="text-2xl font-bold">{startWeight}</div>
            <div className="text-[10px] text-muted-foreground">lbs</div>
          </div>
          <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
            {weightChange !== 0 && (
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(Math.abs(weightChange / Math.max(startWeight, 1)) * 100 * 8, 100)}%`,
                  background: progressColor,
                  marginLeft: weightChange < 0 ? "auto" : 0,
                }}
              />
            )}
          </div>
          <div className="text-center">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Current</div>
            <div className="text-2xl font-bold">{latestWeight}</div>
            <div className="text-[10px] text-muted-foreground">lbs</div>
          </div>
        </div>

        {sortedLogs.length === 0 && (
          <p className="text-xs text-muted-foreground text-center">Log a check-in above to track progress</p>
        )}

        {sortedLogs.length > 0 && (
          <div className="space-y-0.5">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Recent check-ins</p>
            {sortedLogs.slice(-5).reverse().map((log: any, i: number, arr: any[]) => {
              const prevLog = arr[i + 1] ?? { weight: startWeight };
              const delta = log.weight - prevLog.weight;
              const deltaColor = goal === "fat_loss"
                ? delta < 0 ? "#22c55e" : delta > 0 ? "#ef4444" : "var(--muted-foreground)"
                : goal === "muscle_gain"
                ? delta > 0 ? "#22c55e" : delta < 0 ? "#ef4444" : "var(--muted-foreground)"
                : Math.abs(delta) <= 1 ? "#22c55e" : "#f97316";
              return (
                <div key={i} className="flex items-center justify-between py-2" style={{ borderBottom: "1px solid var(--border)" }}>
                  <span className="text-xs text-muted-foreground">
                    {new Date(log.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold">{log.weight} lbs</span>
                    {delta !== 0 && (
                      <span className="text-xs font-semibold" style={{ color: deltaColor }}>
                        {delta > 0 ? "+" : ""}{delta.toFixed(1)}
                      </span>
                    )}
                    {log.bodyFat && (
                      <span className="text-xs text-muted-foreground">{log.bodyFat}% BF</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Achievements */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">Achievements</h2>
            <span className="text-xs text-muted-foreground">
              {achievements?.length || 0} / {totalCount || "…"}
            </span>
          </div>
          {totalCount && (
            <span className="text-xs text-muted-foreground">
              {Math.round(((achievements?.length || 0) / (totalCount || 1)) * 100)}%
            </span>
          )}
        </div>

        {totalCount && (
          <div className="mb-4 h-1.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(100, ((achievements?.length || 0) / totalCount) * 100)}%`,
                background: "var(--plate-green-accent)",
              }}
            />
          </div>
        )}

        {achievements && achievements.length > 0 ? (
          <div className="grid grid-cols-2 gap-2.5">
            {achievements.map((ach: any) => {
              const def = ACHIEVEMENT_DEFS.find((d) => d.type === ach.type);
              const diff = getDifficultyStyle(ach.xpAwarded, def?.category || "");
              return (
                <div
                  key={ach._id}
                  className="rounded-2xl p-3.5 relative overflow-hidden"
                  style={{ background: "var(--surface-card)", border: `1px solid ${diff.color}44` }}
                >
                  <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: diff.color }} />
                  <div className="text-2xl mb-2">{def?.emoji || "🏅"}</div>
                  <div className="text-xs font-semibold leading-snug">{ach.name}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 leading-snug">{ach.description}</div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[9px] font-bold tracking-wider" style={{ color: diff.color }}>
                      {diff.badge} {diff.label}
                    </span>
                    {ach.xpAwarded > 0 && (
                      <span className="text-[10px] text-muted-foreground">+{ach.xpAwarded} XP</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center rounded-2xl" style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}>
            <Trophy className="w-8 h-8 mx-auto mb-2 opacity-20" />
            <p className="text-sm text-muted-foreground">Start logging meals to earn achievements.</p>
          </div>
        )}
      </div>

      {/* Leaderboard — unlocks at 1000 users */}
      {(totalUsers ?? 0) >= 1000 && (
        <div>
          <h2 className="text-sm font-semibold mb-3">Leaderboard</h2>

          <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1 scrollbar-hide">
            {[
              { key: "xp", label: "XP", icon: <Star className="w-3 h-3" /> },
              { key: "achievements", label: "Trophies", icon: <Trophy className="w-3 h-3" /> },
              { key: "streak", label: "Streak", icon: <Flame className="w-3 h-3" /> },
              { key: "meals", label: "Meals", icon: <BarChart2 className="w-3 h-3" /> },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setLeaderboardTab(tab.key as any)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 transition-all"
                style={
                  leaderboardTab === tab.key
                    ? { background: "var(--foreground)", color: "var(--background)" }
                    : { background: "var(--surface-card)", color: "var(--muted-foreground)", border: "1px solid var(--border)" }
                }
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {leaderboard ? (
            <div className="space-y-2">
              {[...leaderboard]
                .sort((a: any, b: any) => {
                  if (leaderboardTab === "xp") return b.xp - a.xp;
                  if (leaderboardTab === "achievements") return b.achievementCount - a.achievementCount;
                  if (leaderboardTab === "streak") return b.currentStreak - a.currentStreak;
                  return b.totalMealsLogged - a.totalMealsLogged;
                })
                .slice(0, 10)
                .map((user: any, i: number) => {
                  const isMe = profile && user.name === profile.name;
                  const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : null;
                  const value =
                    leaderboardTab === "xp" ? `${user.xp.toLocaleString()} XP` :
                    leaderboardTab === "achievements" ? `${user.achievementCount} trophies` :
                    leaderboardTab === "streak" ? `${user.currentStreak} days` :
                    `${user.totalMealsLogged} meals`;
                  return (
                    <div
                      key={user.userId}
                      className="rounded-2xl px-4 py-3 flex items-center gap-3"
                      style={{
                        background: "var(--surface-card)",
                        border: isMe ? "1px solid rgba(82,183,136,0.4)" : "1px solid var(--border)",
                      }}
                    >
                      <div className="w-7 text-center flex-shrink-0">
                        {medal ? (
                          <span className="text-base">{medal}</span>
                        ) : (
                          <span className="text-xs font-bold text-muted-foreground">#{i + 1}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold truncate">
                          {user.name}
                          {isMe && <span className="ml-1.5 text-[10px] text-muted-foreground font-normal">(you)</span>}
                        </div>
                        <div className="text-xs text-muted-foreground">Lv. {user.level} · {user.longestStreak}d best streak</div>
                      </div>
                      <div className="text-sm font-bold flex-shrink-0">{value}</div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="p-8 text-center rounded-2xl" style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}>
              <p className="text-sm text-muted-foreground">Loading leaderboard…</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
