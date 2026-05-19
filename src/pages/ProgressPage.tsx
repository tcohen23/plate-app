import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { xpToReachLevel, xpNeededForNextLevel } from "@/lib/levelUtils";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Trophy, TrendingDown, TrendingUp, Flame, Target, Plus, X, Crown, Star, BarChart2 } from "lucide-react";
import { ACHIEVEMENT_DEFS } from "@/lib/achievementDefs";

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

  // Auto-open weight form when navigated with ?logWeight=1
  useEffect(() => {
    if (searchParams.get("logWeight") === "1") {
      setShowLogWeight(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);
  const [leaderboardTab, setLeaderboardTab] = useState<"xp" | "achievements" | "streak" | "meals">("xp");
  const [newWeight, setNewWeight] = useState("");
  const [newBodyFat, setNewBodyFat] = useState("");
  const [notes, setNotes] = useState("");

  const handleLogWeight = async () => {
    if (!newWeight) { toast.error("Enter your weight"); return; }
    try {
      await logWeight({
        weight: parseFloat(newWeight),
        bodyFat: newBodyFat ? parseFloat(newBodyFat) : undefined,
        notes: notes || undefined,
      });
      toast.success("Weight logged ✓");
      setShowLogWeight(false);
      setNewWeight(""); setNewBodyFat(""); setNotes("");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  if (!stats || !profile) {
    return <div className="px-5 pt-5 max-w-lg mx-auto"><div className="h-64 bg-muted rounded-2xl animate-pulse" /></div>;
  }

  const sortedLogs = [...(progressLogs || [])].sort((a: any, b: any) => a.date.localeCompare(b.date));
  // START is always locked to the weight entered at onboarding
  const startWeight = profile.weight ?? 0;
  const latestWeight: number = sortedLogs.length > 0 ? (sortedLogs[sortedLogs.length - 1].weight ?? startWeight) : startWeight;
  const weightChange = latestWeight - startWeight;
  const goal = (profile as any).goal ?? "fat_loss"; // "fat_loss" | "muscle_gain" | "maintenance"

  // Color logic: green = moving in the RIGHT direction for the goal
  // Cut/fat_loss: losing weight = good (green), gaining = bad (red)
  // Bulk/muscle_gain: gaining weight = good (green), losing = bad (red)
  // Maintenance: within ±2 lbs = good (green), outside = orange
  let trendColor = "text-blue-500";
  let barColor = "bg-blue-500";
  if (goal === "fat_loss") {
    trendColor = weightChange < 0 ? "text-green-500" : weightChange > 0 ? "text-red-500" : "text-muted-foreground";
    barColor = weightChange < 0 ? "bg-green-500" : weightChange > 0 ? "bg-red-500" : "bg-muted-foreground";
  } else if (goal === "muscle_gain") {
    trendColor = weightChange > 0 ? "text-green-500" : weightChange < 0 ? "text-red-500" : "text-muted-foreground";
    barColor = weightChange > 0 ? "bg-green-500" : weightChange < 0 ? "bg-red-500" : "bg-muted-foreground";
  } else {
    // maintenance
    trendColor = Math.abs(weightChange) <= 2 ? "text-green-500" : "text-orange-500";
    barColor = Math.abs(weightChange) <= 2 ? "bg-green-500" : "bg-orange-500";
  }
  const _isLosing = weightChange < 0; void _isLosing;

  const xpForCurrentLevel = xpToReachLevel(stats.level);
  const xpForNextLevel = xpToReachLevel(stats.level + 1);
  const xpIntoThisLevel = stats.xp - xpForCurrentLevel;
  const xpNeededThisLevel = xpNeededForNextLevel(stats.level);
  const xpProgress = Math.min((xpIntoThisLevel / xpNeededThisLevel) * 100, 100);

  return (
    <div className="px-5 pt-5 pb-6 max-w-lg md:max-w-2xl lg:max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-serif">Progress</h1>
        <Button size="sm" variant="outline" className="h-9 rounded-full text-xs px-4" onClick={() => setShowLogWeight(!showLogWeight)}>
          {showLogWeight ? <X className="w-3.5 h-3.5 mr-1" /> : <Plus className="w-3.5 h-3.5 mr-1" />}
          {showLogWeight ? "Cancel" : "Log Weight"}
        </Button>
      </div>

      {/* Log weight form */}
      {showLogWeight && (
        <Card className="p-4 rounded-xl space-y-3 border-foreground/10 animate-fade-up">
          <div className="label-uppercase text-muted-foreground">Weight check-in</div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground">Weight (lbs) *</label>
              <Input value={newWeight} onChange={(e) => setNewWeight(e.target.value)} placeholder="170" className="h-10 rounded-lg" type="number" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Body Fat %</label>
              <Input value={newBodyFat} onChange={(e) => setNewBodyFat(e.target.value)} placeholder="Optional" className="h-10 rounded-lg" type="number" />
            </div>
          </div>
          <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Notes (optional)" className="h-10 rounded-lg" />
          <Button onClick={handleLogWeight} className="w-full h-10 rounded-xl">Save Check-in</Button>
        </Card>
      )}

      {/* Level & XP */}
      <Card className="p-5 rounded-2xl bg-primary text-primary-foreground">
        <div className="flex items-center gap-5">
          <div className="w-18 h-18 rounded-full border-3 border-primary-foreground/30 flex items-center justify-center">
            <span className="text-3xl font-serif">{stats.level}</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm font-medium">Level {stats.level}</span>
              <span className="text-xs opacity-70">{stats.xp} XP</span>
            </div>
            <div className="h-2 bg-primary-foreground/20 rounded-full overflow-hidden">
              <div className="h-full bg-primary-foreground/80 rounded-full progress-fill" style={{ width: `${Math.min(xpProgress, 100)}%` }} />
            </div>
            <div className="text-xs opacity-60 mt-1">{Math.max(xpForNextLevel - stats.xp, 0)} XP to next level</div>
          </div>
        </div>
      </Card>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="p-4 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Flame className="w-4 h-4 text-orange-500" />
            <span className="label-uppercase text-muted-foreground">Streak</span>
          </div>
          <div className="text-3xl font-serif">{stats.currentStreak}<span className="text-sm font-sans text-muted-foreground ml-1">days</span></div>
        </Card>
        <Card className="p-4 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-4 h-4 text-amber-500" />
            <span className="label-uppercase text-muted-foreground">Best Streak</span>
          </div>
          <div className="text-3xl font-serif">{stats.longestStreak}<span className="text-sm font-sans text-muted-foreground ml-1">days</span></div>
        </Card>
        <Card className="p-4 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-foreground/60" />
            <span className="label-uppercase text-muted-foreground">Meals Logged</span>
          </div>
          <div className="text-3xl font-serif">{stats.totalMealsLogged}</div>
        </Card>
        <Card className="p-4 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-foreground/60" />
            <span className="label-uppercase text-muted-foreground">Protein Streak</span>
          </div>
          <div className="text-3xl font-serif">{stats.proteinGoalStreak}<span className="text-sm font-sans text-muted-foreground ml-1">days</span></div>
        </Card>
      </div>

      {/* Weight Progress */}
      <Card className="p-4 rounded-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-serif">Weight</h2>
          <div className={`flex items-center gap-1 text-sm font-medium ${trendColor}`}>
            {weightChange < 0 ? <TrendingDown className="w-4 h-4" /> : <TrendingUp className="w-4 h-4" />}
            {weightChange === 0 ? "0.0 lbs" : `${weightChange > 0 ? "+" : ""}${weightChange.toFixed(1)} lbs`}
          </div>
        </div>

        <div className="flex items-center justify-between mb-3">
          <div className="text-center">
            <div className="label-uppercase text-muted-foreground">Start</div>
            <div className="text-2xl font-serif mt-1">{startWeight}</div>
          </div>
          {/* Progress bar: fills from center outward, direction shows gain vs loss */}
          <div className="flex-1 mx-6 h-1.5 bg-muted rounded-full relative overflow-hidden">
            {weightChange !== 0 && (
              <div
                className={`absolute top-0 h-full rounded-full ${barColor} transition-all duration-500`}
                style={{
                  width: `${Math.min(Math.abs(weightChange / Math.max(startWeight, 1)) * 100 * 8, 100)}%`,
                  left: weightChange < 0 ? "auto" : "0",
                  right: weightChange < 0 ? "0" : "auto",
                }}
              />
            )}
          </div>
          <div className="text-center">
            <div className="label-uppercase text-muted-foreground">Current</div>
            <div className="text-2xl font-serif mt-1">{latestWeight}</div>
          </div>
        </div>
        {sortedLogs.length === 0 && (
          <p className="text-xs text-muted-foreground text-center pb-1">Log a weight check-in to track your progress</p>
        )}

        {sortedLogs.length > 0 && (
          <div className="space-y-1">
            <div className="label-uppercase text-muted-foreground mb-2">Recent check-ins</div>
            {sortedLogs.slice(-5).reverse().map((log: any, i: number, arr: any[]) => {
              // Previous entry in reversed array = next in sorted array
              const prevLog = arr[i + 1] ?? { weight: startWeight };
              const delta = log.weight - prevLog.weight;
              const deltaColor = goal === "fat_loss"
                ? delta < 0 ? "text-green-500" : delta > 0 ? "text-red-500" : "text-muted-foreground"
                : goal === "muscle_gain"
                ? delta > 0 ? "text-green-500" : delta < 0 ? "text-red-500" : "text-muted-foreground"
                : Math.abs(delta) <= 1 ? "text-green-500" : "text-orange-500";
              return (
                <div key={i} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0 text-sm">
                  <span className="text-muted-foreground">{new Date(log.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{log.weight} lbs</span>
                    {delta !== 0 && (
                      <span className={`text-xs font-medium ${deltaColor}`}>
                        {delta > 0 ? "+" : ""}{delta.toFixed(1)}
                      </span>
                    )}
                    {log.bodyFat && <span className="text-xs text-muted-foreground">{log.bodyFat}% BF</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* ── Achievements ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-serif">
            Achievements
            <span className="text-sm font-sans font-normal text-muted-foreground ml-2">
              {achievements?.length || 0} / {totalCount || "…"}
            </span>
          </h2>
          {achievements && achievements.length > 0 && (
            <div className="text-xs text-muted-foreground">
              {Math.round(((achievements?.length || 0) / (totalCount || 1)) * 100)}% complete
            </div>
          )}
        </div>

        {/* Progress bar */}
        {totalCount && (
          <div className="mb-4 h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.min(100, ((achievements?.length || 0) / totalCount) * 100)}%`,
                background: "var(--plate-green-accent)",
              }}
            />
          </div>
        )}

        {achievements && achievements.length > 0 ? (
          <div className="grid grid-cols-2 gap-2">
            {achievements.map((ach: any) => {
              const def = ACHIEVEMENT_DEFS.find((d) => d.type === ach.type);
              const diff = getDifficultyStyle(ach.xpAwarded, def?.category || "");
              return (
                <Card
                  key={ach._id}
                  className="p-3.5 rounded-xl overflow-hidden relative"
                  style={{ borderColor: diff.color + "44" }}
                >
                  <div
                    className="absolute top-0 left-0 right-0 h-0.5"
                    style={{ background: diff.color }}
                  />
                  <div className="text-2xl mb-2">{def?.emoji || "🏅"}</div>
                  <div className="text-xs font-semibold leading-snug">{ach.name}</div>
                  <div className="text-[10px] text-muted-foreground mt-1 leading-snug">{ach.description}</div>
                  <div className="flex items-center justify-between mt-2">
                    <span
                      className="text-[9px] font-bold tracking-wider"
                      style={{ color: diff.color }}
                    >
                      {diff.badge} {diff.label}
                    </span>
                    {ach.xpAwarded > 0 && (
                      <span className="text-[10px] text-muted-foreground font-medium">+{ach.xpAwarded} XP</span>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="p-8 text-center rounded-xl">
            <Trophy className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Start logging meals to earn achievements.</p>
          </Card>
        )}
      </div>

      {/* ── Leaderboard (unlocks at 1000 users) ── */}
      {(totalUsers ?? 0) >= 1000 && <div>
        <h2 className="text-lg font-serif mb-3">Leaderboard</h2>

        {/* Tab pills */}
        <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
          {[
            { key: "xp", label: "XP", icon: <Star className="w-3 h-3" /> },
            { key: "achievements", label: "Trophies", icon: <Trophy className="w-3 h-3" /> },
            { key: "streak", label: "Streak", icon: <Flame className="w-3 h-3" /> },
            { key: "meals", label: "Meals", icon: <BarChart2 className="w-3 h-3" /> },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setLeaderboardTab(tab.key as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium flex-shrink-0 transition-all ${
                leaderboardTab === tab.key
                  ? "bg-foreground text-background"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
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
                  <Card
                    key={user.userId}
                    className={`p-3.5 rounded-xl flex items-center gap-3 ${isMe ? "border-foreground/40" : ""}`}
                  >
                    <div className="w-7 text-center flex-shrink-0">
                      {medal ? (
                        <span className="text-lg">{medal}</span>
                      ) : (
                        <span className="text-sm font-bold text-muted-foreground">#{i + 1}</span>
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
                  </Card>
                );
              })}
          </div>
        ) : (
          <Card className="p-8 text-center rounded-xl">
            <Crown className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Loading leaderboard…</p>
          </Card>
        )}
      </div>}
    </div>
  );
}
