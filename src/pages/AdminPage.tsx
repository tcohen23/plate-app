import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Users, UtensilsCrossed, ShoppingCart, CalendarDays,
  TrendingUp, Shield, ChevronLeft, Activity, Trash2,
  RotateCcw, ChevronDown, ChevronUp, Dumbbell, AlertTriangle,
  Search, X, Mail, Send, Crown, Star, Heart, Eye, BarChart3, Download,
} from "lucide-react";

type Tab = "overview" | "users" | "emails" | "analytics" | "ideas";
type PageViewWindow = 7 | 30 | 90;

/* ── Admin level config ── */
const LEVEL_META: Record<string, { label: string; icon: any; color: string; rank: number }> = {
  owner:          { label: "Owner",            icon: Crown,  color: "text-amber-500",   rank: 4 },
  admin:          { label: "Admin",            icon: Shield, color: "text-blue-500",     rank: 3 },
  moderator:      { label: "Moderator",        icon: Star,   color: "text-purple-500",   rank: 2 },
  friends_family: { label: "Friends & Family", icon: Heart,  color: "text-pink-500",     rank: 1 },
};

function getLevelMeta(level: string | null) {
  return level ? LEVEL_META[level] : null;
}

const ASSIGNABLE_LEVELS = [
  { value: "friends_family", label: "💎 Friends & Family", desc: "Free premium access, no admin panel" },
  { value: "moderator", label: "⭐ Moderator", desc: "View users & send emails" },
  { value: "admin", label: "🛡️ Admin", desc: "Full user management" },
  { value: "none", label: "Remove role", desc: "Regular user" },
];

/** Human-readable names for known app routes */
const PAGE_LABELS: Record<string, string> = {
  "/": "🏠 Home / Landing",
  "/dashboard": "📊 Dashboard",
  "/plan": "🥗 Meal Plan",
  "/track": "📝 Food Tracker",
  "/grocery": "🛒 Grocery List",
  "/progress": "📈 Progress",
  "/workout": "💪 Workout",
  "/why": "❓ Why Page",
  "/settings": "⚙️ Settings",
  "/feedback": "💡 Feedback",
  "/admin": "🛡️ Admin",
  "/login": "🔑 Login",
  "/signup": "📋 Signup",
  "/onboarding": "🚀 Onboarding (start)",
  "/onboarding/welcome": "🚀 Onboarding: Welcome",
  "/onboarding/signup": "🚀 Onboarding: Signup",
  "/onboarding/name": "🚀 Onboarding: Name",
  "/onboarding/goals": "🚀 Onboarding: Goals",
  "/onboarding/activity": "🚀 Onboarding: Activity",
  "/onboarding/glp1": "🚀 Onboarding: GLP-1",
  "/onboarding/barriers": "🚀 Onboarding: Barriers",
  "/onboarding/about-you": "🚀 Onboarding: About You",
  "/onboarding/measurements": "🚀 Onboarding: Measurements",
  "/onboarding/create-account": "🚀 Onboarding: Create Account",
  "/onboarding/verify-email": "🚀 Onboarding: Verify Email",
  "/onboarding/username": "🚀 Onboarding: Username",
  "/onboarding/plan-ready": "🚀 Onboarding: Plan Reveal",
  "/onboarding/features": "🚀 Onboarding: Features",
  "/onboarding/upgrade": "🚀 Onboarding: Upgrade",
  "/onboarding/welcome-premium": "🚀 Onboarding: Welcome Premium",
  "/upgrade": "💎 Upgrade / Paywall",
  "/privacy": "📜 Privacy Policy",
};

export function AdminPage() {
  const navigate = useNavigate();
  const adminLevel = useQuery(api.admin.getAdminLevel);
  const stats = useQuery(api.admin.getDashboardStats, adminLevel && adminLevel !== "friends_family" ? {} : "skip");
  const users = useQuery(api.admin.getAllUsers, adminLevel && adminLevel !== "friends_family" ? {} : "skip");
  const emailLogs = useQuery(api.admin.getEmailLogs, adminLevel && adminLevel !== "friends_family" ? {} : "skip");
  const setLevel = useMutation(api.admin.setUserAdminLevel);
  const deleteUserMut = useMutation(api.admin.deleteUser);
  const resetProgressMut = useMutation(api.admin.resetUserProgress);
  const resetAllDataMut = useMutation(api.admin.resetUserAllData);
  const resetTodayLogsMut = useMutation(api.admin.resetUserTodayLogs);
  const migrateAdmin = useMutation(api.admin.migrateToAdminLevels);
  const sendAdminEmail = useAction(api.welcomeEmail.sendAdminUpgradeEmail);
  const sendCustomEmail = useAction(api.welcomeEmail.sendCustomEmailToUser);
  const grantAllAchievements = useMutation(api.admin.adminGrantAllAchievements);
  const revokeAllAchievements = useMutation(api.admin.adminRevokeAllAchievements);
  const setXP = useMutation(api.admin.adminSetXP);
  const setLevel2 = useMutation(api.admin.adminSetLevel);
  const forceRegenPlan = useMutation(api.admin.adminForceRegenPlan);
  const feedbackList = useQuery(api.feedback.listFeedback);
  const deleteFeedback = useMutation(api.feedback.deleteFeedback);
  const [pvWindow, setPvWindow] = useState<PageViewWindow>(30);
  const pageViewStats = useQuery(
    api.pageViews.getPageViewStats,
    adminLevel && adminLevel !== "friends_family" ? { days: pvWindow } : "skip"
  );
  const authUserCount = useQuery(
    api.pageViews.getAuthUserCount,
    adminLevel && adminLevel !== "friends_family" ? {} : "skip"
  );

  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ userId: string; action: string; name: string; extra?: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [rolePickerUser, setRolePickerUser] = useState<string | null>(null);
  // Compose email state
  const [composeTarget, setComposeTarget] = useState<{ userId: string; name: string; email: string } | null>(null);
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [composeSending, setComposeSending] = useState(false);
  // Email log expanded
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);
  // Achievement / XP state
  const [xpEditUser, setXpEditUser] = useState<string | null>(null);
  const [xpEditVal, setXpEditVal] = useState("");
  const [lvlEditVal, setLvlEditVal] = useState("");

  const myRank = adminLevel ? (LEVEL_META[adminLevel]?.rank ?? 0) : 0;
  const canManageUsers = myRank >= 3; // admin+
  const canViewStats = myRank >= 3;   // admin+
  const isOwner = adminLevel === "owner";

  // Auto-migrate legacy isAdmin → owner on first load
  useEffect(() => {
    if (adminLevel === "owner" || adminLevel === "admin" || adminLevel === "moderator") return;
    // If the query returned something truthy but not a recognized level, try migration
    migrateAdmin().catch(() => {});
  }, [adminLevel, migrateAdmin]);

  // Loading
  if (adminLevel === undefined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground text-sm">Loading...</div>
      </div>
    );
  }

  // No admin access
  if (!adminLevel || adminLevel === "friends_family") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-5">
        <div className="max-w-sm w-full text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <Shield className="w-7 h-7 text-destructive" />
          </div>
          <h1 className="text-2xl font-serif">Access Denied</h1>
          <p className="text-sm text-muted-foreground">
            {adminLevel === "friends_family"
              ? "You have Friends & Family access but the admin panel requires Moderator or above."
              : "You don't have admin access. This page is restricted."}
          </p>
          <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="rounded-full">
            <ChevronLeft className="w-4 h-4 mr-1" /> Back to App
          </Button>
        </div>
      </div>
    );
  }

  const filteredUsers = users?.filter((u: any) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.adminLevel?.toLowerCase().includes(q) ||
      u.goal?.toLowerCase().includes(q)
    );
  });

  const handleAction = async () => {
    if (!confirmAction) return;
    try {
      if (confirmAction.action === "delete") {
        await deleteUserMut({ profileId: confirmAction.userId as any });
        toast.success(`${confirmAction.name} has been removed`);
      } else if (confirmAction.action === "resetProgress") {
        await resetProgressMut({ profileId: confirmAction.userId as any });
        toast.success(`Progress reset for ${confirmAction.name}`);
      } else if (confirmAction.action === "resetAll") {
        await resetAllDataMut({ profileId: confirmAction.userId as any });
        toast.success(`All data reset for ${confirmAction.name}`);
      } else if (confirmAction.action === "resetToday") {
        const result = await resetTodayLogsMut({ profileId: confirmAction.userId as any });
        toast.success(`Cleared ${(result as any).deleted} food log(s) for today — ${confirmAction.name}`);
      } else if (confirmAction.action === "setLevel") {
        const result = await setLevel({
          profileId: confirmAction.userId as any,
          newLevel: confirmAction.extra as any,
        });
        const levelLabel = LEVEL_META[result.adminLevel]?.label || "Regular User";
        toast.success(`${result.name} → ${levelLabel}`);
        // Send admin upgrade email if promoted to admin+
        if (confirmAction.extra === "admin" || confirmAction.extra === "moderator") {
          const user = users?.find((u: any) => u._id === confirmAction.userId);
          if (user) {
            sendAdminEmail({ targetUserId: user.userId }).catch(() => {});
          }
        }
        setRolePickerUser(null);
      }
    } catch (e: any) {
      toast.error(e.message);
    }
    setConfirmAction(null);
  };

  const handleSendEmail = async () => {
    if (!composeTarget || !composeSubject.trim() || !composeBody.trim()) {
      toast.error("Please fill in subject and message");
      return;
    }
    setComposeSending(true);
    try {
      await sendCustomEmail({
        targetUserId: composeTarget.userId as any,
        subject: composeSubject,
        body: composeBody,
      });
      toast.success(`Email sent to ${composeTarget.name}`);
      setComposeTarget(null);
      setComposeSubject("");
      setComposeBody("");
    } catch (e: any) {
      toast.error(e.message || "Failed to send email");
    } finally {
      setComposeSending(false);
    }
  };

  const myLevelMeta = getLevelMeta(adminLevel);

  return (
    <div className="min-h-screen bg-background">
      {/* ── Confirmation dialog ── */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-5">
          <Card className="max-w-sm w-full p-6 rounded-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div>
                <h3 className="font-serif text-lg">Confirm Action</h3>
                <p className="text-sm text-muted-foreground">
                  {confirmAction.action === "delete" && `Permanently remove ${confirmAction.name} and all their data?`}
                  {confirmAction.action === "resetProgress" && `Reset progress for ${confirmAction.name}?`}
                  {confirmAction.action === "resetAll" && `Delete ALL data for ${confirmAction.name}?`}
                  {confirmAction.action === "resetToday" && `Clear all food logs for today for ${confirmAction.name}?`}
                  {confirmAction.action === "setLevel" && `Change ${confirmAction.name}'s role to ${LEVEL_META[confirmAction.extra!]?.label || "Regular User"}?`}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant={confirmAction.action === "delete" ? "destructive" : "default"} className="flex-1 rounded-xl" onClick={handleAction}>
                Confirm
              </Button>
              <Button variant="outline" className="flex-1 rounded-xl" onClick={() => { setConfirmAction(null); setRolePickerUser(null); }}>
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ── Compose email overlay ── */}
      {composeTarget && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-5">
          <Card className="max-w-md w-full p-6 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-serif text-lg">Send Email</h3>
                <p className="text-sm text-muted-foreground">To: {composeTarget.name} ({composeTarget.email})</p>
              </div>
              <button onClick={() => setComposeTarget(null)} className="p-1 hover:bg-accent rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">Subject</label>
                <input
                  type="text"
                  value={composeSubject}
                  onChange={(e) => setComposeSubject(e.target.value)}
                  placeholder="Email subject..."
                  className="w-full h-10 px-3 rounded-xl border border-border/60 bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground mb-1 block">Message</label>
                <textarea
                  value={composeBody}
                  onChange={(e) => setComposeBody(e.target.value)}
                  placeholder="Write your message..."
                  rows={6}
                  className="w-full px-3 py-2 rounded-xl border border-border/60 bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1 rounded-xl" onClick={handleSendEmail} disabled={composeSending}>
                {composeSending ? "Sending..." : <><Send className="w-4 h-4 mr-1" /> Send Email</>}
              </Button>
              <Button variant="outline" className="rounded-xl" onClick={() => setComposeTarget(null)}>
                Cancel
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* ── Header ── */}
      <header className="sticky top-0 bg-background/95 backdrop-blur-md z-40 border-b border-border/50">
        <div className="max-w-6xl mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard")} className="rounded-full h-8 w-8 p-0">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="font-serif text-lg">Plate Admin</h1>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Dashboard</p>
            </div>
          </div>
          {myLevelMeta && (
            <div className={`flex items-center gap-1.5 bg-primary/10 px-3 py-1.5 rounded-full ${myLevelMeta.color}`}>
              <myLevelMeta.icon className="w-3.5 h-3.5" />
              <span className="text-xs font-medium">{myLevelMeta.label}</span>
            </div>
          )}
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-5 py-6 space-y-6">
        {/* ── Tabs ── */}
        <div className="flex gap-2 flex-wrap">
          {canViewStats && (
            <TabButton active={activeTab === "overview"} onClick={() => setActiveTab("overview")}>
              Overview
            </TabButton>
          )}
          <TabButton active={activeTab === "users"} onClick={() => setActiveTab("users")}>
            Users{users ? ` (${users.length})` : ""}
          </TabButton>
          <TabButton active={activeTab === "emails"} onClick={() => setActiveTab("emails")}>
            <Mail className="w-3.5 h-3.5 mr-1" /> Emails{emailLogs ? ` (${emailLogs.length})` : ""}
          </TabButton>
          <TabButton active={activeTab === "analytics"} onClick={() => setActiveTab("analytics")}>
            <BarChart3 className="w-3.5 h-3.5 mr-1" /> Analytics
          </TabButton>
          <TabButton active={activeTab === "ideas"} onClick={() => setActiveTab("ideas")}>
            💡 Ideas{feedbackList ? ` (${feedbackList.length})` : ""}
          </TabButton>
        </div>

        {/* ════════════════ OVERVIEW TAB ════════════════ */}
        {activeTab === "overview" && canViewStats && stats && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard icon={Users} label="Total Users" value={stats.totalUsers} />
              <StatCard icon={Activity} label="Active Today" value={stats.activeToday} />
              <StatCard icon={TrendingUp} label="Active This Week" value={stats.activeThisWeek} />
              <StatCard icon={Users} label="Onboarded" value={stats.completedOnboarding} />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard icon={UtensilsCrossed} label="Food Logs" value={stats.totalFoodLogs} />
              <StatCard icon={CalendarDays} label="Meal Plans" value={stats.totalMealPlans} />
              <StatCard icon={ShoppingCart} label="Grocery Lists" value={stats.totalGroceryLists} />
              <StatCard icon={Dumbbell} label="Workouts" value={stats.totalWorkouts} />
            </div>

            {/* Role breakdown */}
            <Card className="p-5 rounded-xl space-y-3">
              <h3 className="font-serif text-lg">Roles</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {Object.entries(LEVEL_META).map(([key, meta]) => (
                  <div key={key} className="flex items-center gap-2 p-3 rounded-lg bg-accent/20">
                    <meta.icon className={`w-4 h-4 ${meta.color}`} />
                    <span className="text-sm font-medium">{(stats as any).levelCounts?.[key] ?? 0}</span>
                    <span className="text-xs text-muted-foreground">{meta.label}</span>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5 rounded-xl space-y-3">
              <h3 className="font-serif text-lg">Quick Insights</h3>
              <div className="space-y-2 text-sm">
                <InsightRow label="Onboarding completion rate" value={stats.totalUsers > 0 ? `${Math.round((stats.completedOnboarding / stats.totalUsers) * 100)}%` : "0%"} />
                <InsightRow label="Avg food logs per user" value={stats.totalUsers > 0 ? (stats.totalFoodLogs / stats.totalUsers).toFixed(1) : "0"} />
                <InsightRow label="Plans generated per user" value={stats.totalUsers > 0 ? (stats.totalMealPlans / stats.totalUsers).toFixed(1) : "0"} />
                <InsightRow label="Weekly active rate" value={stats.totalUsers > 0 ? `${Math.round((stats.activeThisWeek / stats.totalUsers) * 100)}%` : "0%"} />
                <InsightRow label="Avg workouts per user" value={stats.totalUsers > 0 ? (stats.totalWorkouts / stats.totalUsers).toFixed(1) : "0"} />
                {authUserCount !== undefined && (
                  <InsightRow
                    label="Auth accounts vs profiles"
                    value={`${authUserCount} auth / ${stats.totalUsers} profiles${authUserCount !== stats.totalUsers ? ` ⚠️ ${Math.abs(authUserCount - stats.totalUsers)} mismatch` : " ✓ accurate"}`}
                    last
                  />
                )}
              </div>
            </Card>

            {/* ── Page Visitors ── */}
            <Card className="p-5 rounded-xl space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="font-serif text-lg flex items-center gap-2">
                  <Eye className="w-4 h-4 text-emerald-500" />
                  Page Visitors
                </h3>
                <div className="flex gap-1.5">
                  {([7, 30, 90] as PageViewWindow[]).map((d) => (
                    <button
                      key={d}
                      onClick={() => setPvWindow(d)}
                      className={`text-xs px-3 py-1 rounded-full border transition-all ${
                        pvWindow === d
                          ? "bg-foreground text-background border-foreground"
                          : "border-border text-muted-foreground hover:border-foreground/30"
                      }`}
                    >
                      {d}d
                    </button>
                  ))}
                </div>
              </div>

              {!pageViewStats ? (
                <div className="animate-pulse text-xs text-muted-foreground">Loading page view data...</div>
              ) : (
                <>
                  {/* Summary row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-accent/20 rounded-xl p-3 text-center">
                      <div className="text-2xl font-serif">{pageViewStats.totalViews.toLocaleString()}</div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">Total Views</div>
                    </div>
                    <div className="bg-accent/20 rounded-xl p-3 text-center">
                      <div className="text-2xl font-serif">{pageViewStats.uniqueVisitors.toLocaleString()}</div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">Unique Visitors</div>
                    </div>
                  </div>

                  {/* Daily sparkline */}
                  {pageViewStats.daily.length > 0 && (
                    <div>
                      <div className="text-xs text-muted-foreground mb-2">Daily views (last 14 days)</div>
                      <div className="flex items-end gap-1 h-12">
                        {pageViewStats.daily.map((d) => {
                          const max = Math.max(...pageViewStats.daily.map((x) => x.count), 1);
                          const pct = (d.count / max) * 100;
                          return (
                            <div key={d.date} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                              <div
                                className="w-full bg-emerald-500/60 hover:bg-emerald-500 rounded-sm transition-colors"
                                style={{ height: `${Math.max(pct, 4)}%` }}
                                title={`${d.date}: ${d.count} views`}
                              />
                              <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-card border border-border/50 text-[9px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                {d.count}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex justify-between text-[9px] text-muted-foreground/50 mt-1">
                        <span>{pageViewStats.daily[0]?.date.slice(5)}</span>
                        <span>{pageViewStats.daily[pageViewStats.daily.length - 1]?.date.slice(5)}</span>
                      </div>
                    </div>
                  )}

                  {/* Per-page breakdown */}
                  {pageViewStats.pages.length === 0 ? (
                    <div className="text-xs text-muted-foreground italic py-2">
                      No page views tracked yet — data will appear as users visit the app.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="text-xs text-muted-foreground mb-2">By page</div>
                      {pageViewStats.pages.map((page) => {
                        const maxViews = pageViewStats.pages[0]?.total || 1;
                        const pct = (page.total / maxViews) * 100;
                        const label = PAGE_LABELS[page.path] ?? page.path;
                        return (
                          <div key={page.path} className="space-y-0.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-medium truncate max-w-[60%]">{label}</span>
                              <div className="flex items-center gap-3 text-muted-foreground">
                                <span>{page.unique} unique</span>
                                <span className="font-medium text-foreground">{page.total.toLocaleString()}</span>
                              </div>
                            </div>
                            <div className="h-1.5 rounded-full bg-accent/30 overflow-hidden">
                              <div
                                className="h-full bg-emerald-500/70 rounded-full"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </Card>
          </>
        )}

        {/* ════════════════ USERS TAB ════════════════ */}
        {activeTab === "users" && users && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by name, email, role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-9 pr-9 rounded-xl border border-border/60 bg-card text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>

            <div className="text-sm text-muted-foreground">
              {filteredUsers?.length} user{filteredUsers?.length !== 1 ? "s" : ""}
              {searchQuery && ` matching "${searchQuery}"`}
            </div>

            {filteredUsers?.map((user: any) => {
              const isExpanded = expandedUser === user._id;
              const userLevelMeta = getLevelMeta(user.adminLevel);
              const userRank = userLevelMeta?.rank ?? 0;
              const restricted = user._restricted;

              return (
                <Card key={user._id} className="rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpandedUser(isExpanded ? null : user._id)}
                    className="w-full p-4 flex items-start justify-between gap-3 text-left hover:bg-accent/20 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium">{user.name}</span>
                        {userLevelMeta && (
                          <span className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-medium ${userLevelMeta.color} bg-current/10`}
                            style={{ backgroundColor: `color-mix(in srgb, currentColor 10%, transparent)` }}>
                            <userLevelMeta.icon className="w-3 h-3" />
                            {userLevelMeta.label}
                          </span>
                        )}
                        {user.isPremium && (
                          <span className="text-[10px] uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-0.5 rounded-full font-medium">
                            💎 Premium
                          </span>
                        )}
                        {user.subscriptionStatus === "trialing" && (
                          <span className="text-[10px] uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-medium">
                            Trial
                          </span>
                        )}
                        {user.subscriptionStatus === "past_due" && (
                          <span className="text-[10px] uppercase tracking-wider bg-red-500/10 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full font-medium">
                            ⚠ Past Due
                          </span>
                        )}
                        {!user.onboardingComplete && (
                          <span className="text-[10px] uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium">
                            Not onboarded
                          </span>
                        )}
                      </div>
                      {user.email && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <Mail className="w-3 h-3" />
                          <span>{user.email}</span>
                        </div>
                      )}
                      {!restricted && (
                        <div className="flex gap-4 mt-1.5 text-xs text-muted-foreground">
                          <span>Lvl {user.level}</span>
                          <span>{user.xp} XP</span>
                          <span>{user.currentStreak}d streak</span>
                          <span>{user.totalMealsLogged} meals</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-muted-foreground/50">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-border/50 p-4 space-y-4 bg-accent/5">
                      {/* Full details (admin+ only) */}
                      {!restricted && (
                        <>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                            <DetailItem label="Goal" value={user.goal?.replace(/_/g, " ") || "—"} />
                            <DetailItem label="Calories" value={user.targetCalories ? `${user.targetCalories} kcal` : "—"} />
                            <DetailItem label="Protein" value={user.targetProtein ? `${user.targetProtein}g` : "—"} />
                            <DetailItem label="Carbs" value={user.targetCarbs ? `${user.targetCarbs}g` : "—"} />
                            <DetailItem label="Fat" value={user.targetFat ? `${user.targetFat}g` : "—"} />
                            <DetailItem label="Height" value={user.height ? `${Math.floor(user.height / 12)}'${user.height % 12}"` : "—"} />
                            <DetailItem label="Weight" value={user.weight ? `${user.weight} lbs` : "—"} />
                            <DetailItem label="Age" value={user.age ? `${user.age}` : "—"} />
                            <DetailItem label="Gender" value={user.gender || "—"} />
                            <DetailItem label="Activity" value={user.activityLevel?.replace(/_/g, " ") || "—"} />
                            <DetailItem label="Diet" value={user.dietPreference?.replace(/_/g, " ") || "—"} />
                            <DetailItem label="GLP-1" value={user.usesGlp1 ? "Yes" : "No"} />
                            <DetailItem label="Premium" value={user.isPremium ? "Yes ✓" : "No"} />
                            <DetailItem label="Sub Status" value={user.subscriptionStatus || "—"} />
                            {user.trialEnd && (
                              <DetailItem label="Trial Ends" value={new Date(user.trialEnd).toLocaleDateString()} />
                            )}
                          </div>
                          <div className="grid grid-cols-4 gap-2">
                            <MiniStat label="Meals" value={user.totalMealsLogged} />
                            <MiniStat label="Plans" value={user.totalPlans} />
                            <MiniStat label="Workouts" value={user.totalWorkouts} />
                            <MiniStat label="Best Streak" value={`${user.longestStreak}d`} />
                          </div>
                          {user.lastLogDate && (
                            <div className="text-xs text-muted-foreground">Last active: {user.lastLogDate}</div>
                          )}
                        </>
                      )}

                      {restricted && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground italic py-2">
                          <Eye className="w-3.5 h-3.5" />
                          Detailed stats are only visible to Admins and Owner.
                        </div>
                      )}

                      {/* ── Action buttons ── */}
                      <div className="flex flex-wrap gap-2 pt-2 border-t border-border/30">
                        {/* Send email — moderator+ */}
                        {user.email && (
                          <Button
                            variant="outline" size="sm" className="rounded-lg text-xs h-8"
                            onClick={() => setComposeTarget({ userId: user.userId, name: user.name, email: user.email })}
                          >
                            <Mail className="w-3 h-3 mr-1" /> Email
                          </Button>
                        )}

                        {/* Role management — admin+ can assign roles below them, owner can assign anything */}
                        {canManageUsers && user.adminLevel !== "owner" && (
                          <>
                            {rolePickerUser === user._id ? (
                              <div className="w-full mt-2 space-y-2">
                                <div className="text-xs font-medium text-muted-foreground">Set role for {user.name}:</div>
                                <div className="grid grid-cols-2 gap-2">
                                  {ASSIGNABLE_LEVELS
                                    .filter((lvl) => {
                                      if (lvl.value === "admin" && !isOwner) return false;
                                      return true;
                                    })
                                    .map((lvl) => (
                                      <button
                                        key={lvl.value}
                                        onClick={() => setConfirmAction({ userId: user._id, action: "setLevel", name: user.name, extra: lvl.value })}
                                        className={`text-left p-3 rounded-xl border transition-all text-sm ${
                                          user.adminLevel === lvl.value
                                            ? "border-foreground bg-primary/5"
                                            : "border-border hover:border-foreground/30"
                                        }`}
                                      >
                                        <div className="font-medium">{lvl.label}</div>
                                        <div className="text-[10px] text-muted-foreground mt-0.5">{lvl.desc}</div>
                                      </button>
                                    ))}
                                </div>
                                <Button variant="ghost" size="sm" className="text-xs" onClick={() => setRolePickerUser(null)}>
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="outline" size="sm" className="rounded-lg text-xs h-8"
                                onClick={() => setRolePickerUser(user._id)}
                              >
                                <Shield className="w-3 h-3 mr-1" /> Set Role
                              </Button>
                            )}
                          </>
                        )}

                        {/* Destructive actions — admin+ only, not on admins (unless owner) */}
                        {canManageUsers && user.adminLevel !== "owner" && (userRank < myRank || isOwner) && rolePickerUser !== user._id && (
                          <>
                            <Button
                              variant="outline" size="sm" className="rounded-lg text-xs h-8"
                              onClick={() => setConfirmAction({ userId: user._id, action: "resetToday", name: user.name })}
                            >
                              <RotateCcw className="w-3 h-3 mr-1" /> Reset Today
                            </Button>
                            <Button variant="ghost" size="sm" className="text-xs h-7"
                              onClick={() => setConfirmAction({ userId: user._id, action: "resetProgress", name: user.name })}
                            >
                              <RotateCcw className="w-3 h-3 mr-1" /> Reset Progress
                            </Button>
                            <Button
                              variant="outline" size="sm"
                              className="rounded-lg text-xs h-8 text-amber-600 border-amber-200 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-800 dark:hover:bg-amber-950"
                              onClick={() => setConfirmAction({ userId: user._id, action: "resetAll", name: user.name })}
                            >
                              <RotateCcw className="w-3 h-3 mr-1" /> Reset All Data
                            </Button>
                            <Button
                              variant="outline" size="sm"
                              className="rounded-lg text-xs h-8 text-destructive border-destructive/30 hover:bg-destructive/10"
                              onClick={() => setConfirmAction({ userId: user._id, action: "delete", name: user.name })}
                            >
                              <Trash2 className="w-3 h-3 mr-1" /> Remove
                            </Button>
                          </>
                        )}

                        {user.adminLevel === "owner" && (
                          <div className="text-xs text-muted-foreground italic">
                            Owner account — cannot be modified.
                          </div>
                        )}
                      </div>

                      {/* ── Achievement & XP Controls (owner only) ── */}
                      {isOwner && (
                        <div className="pt-3 border-t border-border/30 space-y-3">
                          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Achievement & XP Controls</div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="outline" size="sm" className="rounded-lg text-xs h-8"
                              onClick={async () => {
                                try {
                                  const res = await grantAllAchievements({ profileId: user._id as any });
                                  toast.success(`Granted ${(res as any).granted ?? "all"} achievements`);
                                } catch (e: any) { toast.error(e.message); }
                              }}
                            >
                              🏆 Grant All Achievements
                            </Button>
                            <Button
                              variant="outline" size="sm" className="rounded-lg text-xs h-8 text-destructive border-destructive/30 hover:bg-destructive/10"
                              onClick={async () => {
                                try {
                                  await revokeAllAchievements({ profileId: user._id as any });
                                  toast.success("Revoked all achievements");
                                } catch (e: any) { toast.error(e.message); }
                              }}
                            >
                              🗑️ Revoke All
                            </Button>
                            <Button
                              variant="outline" size="sm" className="rounded-lg text-xs h-8"
                              onClick={async () => {
                                try {
                                  await forceRegenPlan({ profileId: user._id as any });
                                  toast.success("Meal plan regenerated");
                                } catch (e: any) { toast.error(e.message); }
                              }}
                            >
                              <RotateCcw className="w-3 h-3 mr-1" /> Regen Meal Plan
                            </Button>
                          </div>
                          {/* XP / Level editor */}
                          {xpEditUser === user._id ? (
                            <div className="flex flex-wrap gap-2 items-center">
                              <input
                                type="number"
                                placeholder="XP value"
                                value={xpEditVal}
                                onChange={e => setXpEditVal(e.target.value)}
                                className="w-24 h-8 px-2 text-xs rounded-lg border border-border bg-background"
                              />
                              <input
                                type="number"
                                placeholder="Level"
                                value={lvlEditVal}
                                onChange={e => setLvlEditVal(e.target.value)}
                                className="w-20 h-8 px-2 text-xs rounded-lg border border-border bg-background"
                              />
                              <Button size="sm" className="rounded-lg text-xs h-8" onClick={async () => {
                                try {
                                  if (xpEditVal) await setXP({ profileId: user._id as any, xp: Number(xpEditVal) });
                                  if (lvlEditVal) await setLevel2({ profileId: user._id as any, level: Number(lvlEditVal) });
                                  toast.success("XP/Level updated");
                                  setXpEditUser(null); setXpEditVal(""); setLvlEditVal("");
                                } catch (e: any) { toast.error(e.message); }
                              }}>Save</Button>
                              <Button variant="ghost" size="sm" className="text-xs h-8" onClick={() => { setXpEditUser(null); setXpEditVal(""); setLvlEditVal(""); }}>Cancel</Button>
                            </div>
                          ) : (
                            <Button variant="outline" size="sm" className="rounded-lg text-xs h-8" onClick={() => { setXpEditUser(user._id); setXpEditVal(String(user.xp)); setLvlEditVal(String(user.level)); }}>
                              ✏️ Edit XP / Level
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {/* ════════════════ EMAILS TAB ════════════════ */}
        {activeTab === "emails" && (
          <div className="space-y-4">
            {/* ── All user emails ── */}
            <Card className="p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">All User Emails</div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {users?.filter((u: any) => u.email).length ?? 0} emails collected automatically
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline" size="sm" className="rounded-lg text-xs h-8"
                    onClick={() => {
                      const emails = (users ?? []).filter((u: any) => u.email).map((u: any) => u.email).join(", ");
                      navigator.clipboard.writeText(emails);
                      toast.success("Copied all emails to clipboard");
                    }}
                  >
                    <Mail className="w-3 h-3 mr-1" /> Copy All
                  </Button>
                  <Button
                    variant="outline" size="sm" className="rounded-lg text-xs h-8"
                    onClick={() => {
                      const usersWithEmail = (users ?? []).filter((u: any) => u.email);
                      const header = "Name,Email,Role,Joined\n";
                      const rows = usersWithEmail.map((u: any) => {
                        const name = `"${(u.name || "").replace(/"/g, '""')}"`;
                        const email = `"${(u.email || "").replace(/"/g, '""')}"`;
                        const role = u.adminLevel || "user";
                        const joined = u._creationTime ? new Date(u._creationTime).toLocaleDateString() : "";
                        return `${name},${email},${role},${joined}`;
                      }).join("\n");
                      const csv = header + rows;
                      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement("a");
                      link.href = url;
                      link.download = `plate-emails-${new Date().toISOString().slice(0, 10)}.csv`;
                      link.click();
                      URL.revokeObjectURL(url);
                      toast.success(`Downloaded ${usersWithEmail.length} emails as CSV`);
                    }}
                  >
                    <Download className="w-3 h-3 mr-1" /> Download CSV
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
                {(users ?? []).filter((u: any) => u.email).map((u: any) => (
                  <span
                    key={u._id}
                    className="text-xs bg-accent/50 border border-border/40 rounded-full px-2 py-0.5 cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => {
                      navigator.clipboard.writeText(u.email);
                      toast.success(`Copied ${u.email}`);
                    }}
                    title={`${u.name} — click to copy`}
                  >
                    {u.email}
                  </span>
                ))}
                {(users ?? []).filter((u: any) => u.email).length === 0 && (
                  <span className="text-xs text-muted-foreground">No emails yet.</span>
                )}
              </div>
            </Card>

            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {emailLogs?.length ?? 0} email{(emailLogs?.length ?? 0) !== 1 ? "s" : ""} sent
              </p>
            </div>

            {(!emailLogs || emailLogs.length === 0) && (
              <Card className="p-8 rounded-xl text-center">
                <Mail className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No emails sent yet.</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Welcome emails and admin notifications will appear here.
                </p>
              </Card>
            )}

            {emailLogs?.map((log: any) => {
              const isExp = expandedEmail === log._id;
              const typeLabels: Record<string, { label: string; color: string }> = {
                welcome: { label: "Welcome", color: "bg-green-500/10 text-green-600 dark:text-green-400" },
                admin_upgrade: { label: "Admin Upgrade", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
                custom: { label: "Custom", color: "bg-purple-500/10 text-purple-600 dark:text-purple-400" },
              };
              const typeMeta = typeLabels[log.emailType] || { label: log.emailType, color: "bg-gray-500/10 text-gray-600" };

              return (
                <Card key={log._id} className="rounded-xl overflow-hidden">
                  <button
                    onClick={() => setExpandedEmail(isExp ? null : log._id)}
                    className="w-full p-4 flex items-start justify-between gap-3 text-left hover:bg-accent/20 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-medium ${typeMeta.color}`}>
                          {typeMeta.label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          → {log.recipientName}
                        </span>
                      </div>
                      <div className="text-sm font-medium truncate">{log.subject}</div>
                      {log.previewHtml && (
                        <div className="text-xs text-muted-foreground mt-0.5 truncate">{log.previewHtml}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[10px] text-muted-foreground/50">
                        {new Date(log.sentAt).toLocaleDateString()} {new Date(log.sentAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {isExp ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </div>
                  </button>
                  {isExp && (
                    <div className="border-t border-border/50 p-4 bg-accent/5 space-y-2 text-sm">
                      <div className="grid grid-cols-2 gap-2">
                        <DetailItem label="To" value={`${log.recipientName} (${log.recipientEmail})`} />
                        <DetailItem label="Type" value={typeMeta.label} />
                        <DetailItem label="Sent" value={new Date(log.sentAt).toLocaleString()} />
                        <DetailItem label="Subject" value={log.subject} />
                      </div>
                      {log.previewHtml && (
                        <div className="mt-2 p-3 bg-card rounded-lg border border-border/40 text-sm text-muted-foreground">
                          {log.previewHtml}
                        </div>
                      )}
                      {/* Quick re-email button */}
                      {log.recipientUserId && (
                        <Button
                          variant="outline" size="sm" className="rounded-lg text-xs h-8 mt-2"
                          onClick={() => setComposeTarget({
                            userId: log.recipientUserId,
                            name: log.recipientName,
                            email: log.recipientEmail,
                          })}
                        >
                          <Mail className="w-3 h-3 mr-1" /> Send Another Email
                        </Button>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}

        {/* ════════════════ ANALYTICS TAB ════════════════ */}
        {activeTab === "analytics" && (
          <AnalyticsTab />
        )}

        {/* ════════════════ IDEAS TAB ════════════════ */}
        {activeTab === "ideas" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">User-submitted ideas and feature requests. Delete items once they've been actioned.</p>
            {!feedbackList || feedbackList.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground text-sm">No ideas submitted yet.</div>
            ) : (
              feedbackList.map((item) => (
                <div
                  key={item._id}
                  className="rounded-2xl px-4 py-3 flex items-start justify-between gap-3"
                  style={{ background: "var(--card)", border: "1px solid var(--border)" }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium capitalize"
                        style={{ background: "var(--muted)", color: "var(--muted-foreground)" }}>
                        {item.category}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        👍 {item.upvotes}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        item.status === "in_progress" ? "bg-blue-500/20 text-blue-400" :
                        item.status === "planned" ? "bg-green-500/20 text-green-400" :
                        item.status === "done" ? "bg-gray-500/20 text-gray-400" :
                        "bg-yellow-500/20 text-yellow-400"
                      }`}>
                        {item.status === "in_progress" ? "In Progress" : item.status === "planned" ? "Planned" : item.status === "done" ? "Done" : "New"}
                      </span>
                    </div>
                    <p className="text-sm leading-snug">{item.text}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      if (!confirm("Delete this idea permanently?")) return;
                      await deleteFeedback({ feedbackId: item._id });
                      toast.success("Idea deleted");
                    }}
                    className="shrink-0 p-2 rounded-xl hover:bg-red-500/10 transition-colors"
                    title="Delete idea"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Analytics Tab Component ─── */

function AnalyticsTab() {
  const POSTHOG_PROJECT_URL = "https://us.posthog.com/project/404155";

  const quickLinks = [
    { label: "Full Dashboard", url: `${POSTHOG_PROJECT_URL}/dashboard/1528847`, desc: "DAUs, WAUs, Retention, Growth" },
    { label: "Live Events", url: `${POSTHOG_PROJECT_URL}/activity/explore`, desc: "Real-time event stream" },
    { label: "User Paths", url: `${POSTHOG_PROJECT_URL}/web/paths`, desc: "How users navigate the app" },
    { label: "Session Recordings", url: `${POSTHOG_PROJECT_URL}/replay`, desc: "Watch real user sessions" },
  ];

  const trackedEvents = [
    { event: "onboarding_started", desc: "User begins onboarding" },
    { event: "onboarding_step_completed", desc: "Each step with step name" },
    { event: "onboarding_completed", desc: "Onboarding finished (diet, goal, calories)" },
    { event: "meal_plan_generated", desc: "New meal plan created" },
    { event: "meal_swapped", desc: "User swaps a meal" },
    { event: "meal_skipped", desc: "User skips a meal" },
    { event: "food_logged", desc: "Food tracked (barcode/search/quick/custom)" },
    { event: "barcode_scanned", desc: "Barcode scan attempt (success/fail)" },
    { event: "favorite_updated", desc: "Food added/removed from favorites or dislikes" },
    { event: "settings_changed", desc: "Any settings change" },
    { event: "theme_changed", desc: "Theme toggle (dark/light/system)" },
    { event: "grocery_list_viewed", desc: "Grocery list opened" },
    { event: "install_banner_seen", desc: "PWA install banner displayed" },
    { event: "$pageview", desc: "Every page navigation (automatic)" },
    { event: "$pageleave", desc: "User leaves a page (automatic)" },
    { event: "$autocapture", desc: "Button clicks, form submissions (automatic)" },
  ];

  return (
    <div className="space-y-4">
      {/* Quick links to PostHog */}
      <Card className="p-4 rounded-xl">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-emerald-500" />
          PostHog Analytics
        </h3>
        <p className="text-xs text-muted-foreground mb-4">
          Product analytics powered by PostHog. Track user behavior, retention, and feature adoption.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {quickLinks.map((link) => (
            <a
              key={link.label}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block p-3 rounded-lg border border-border/40 hover:border-emerald-500/50 transition-all bg-card/50 hover:bg-emerald-500/5"
            >
              <div className="text-sm font-medium group-hover:text-emerald-500 transition-colors">{link.label}</div>
              <div className="text-[10px] text-muted-foreground mt-0.5">{link.desc}</div>
            </a>
          ))}
        </div>
      </Card>

      {/* Embedded dashboard */}
      <Card className="p-4 rounded-xl">
        <h3 className="text-sm font-semibold mb-3">Live Dashboard</h3>
        <div className="rounded-lg overflow-hidden border border-border/40 bg-black/20" style={{ height: 480 }}>
          <iframe
            src={`${POSTHOG_PROJECT_URL}/embedded/dashboard/1528847`}
            width="100%"
            height="100%"
            style={{ border: "none" }}
            title="PostHog Dashboard"
            allow="fullscreen"
          />
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 text-center">
          If the dashboard doesn't load, enable sharing on the{" "}
          <a href={`${POSTHOG_PROJECT_URL}/dashboard/1528847`} target="_blank" rel="noopener noreferrer" className="text-emerald-500 hover:underline">
            PostHog dashboard
          </a>.
        </p>
      </Card>

      {/* Tracked events reference */}
      <Card className="p-4 rounded-xl">
        <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-emerald-500" />
          Tracked Events ({trackedEvents.length})
        </h3>
        <div className="space-y-1">
          {trackedEvents.map((e) => (
            <div key={e.event} className="flex items-start gap-2 py-1.5 border-b border-border/20 last:border-0">
              <code className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-mono shrink-0">{e.event}</code>
              <span className="text-[11px] text-muted-foreground">{e.desc}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* User properties */}
      <Card className="p-4 rounded-xl">
        <h3 className="text-sm font-semibold mb-3">User Properties</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Set on every identified user for segmentation and filtering:
        </p>
        <div className="grid grid-cols-2 gap-2">
          {["diet", "goal", "calorie_target", "cooking_level"].map((prop) => (
            <div key={prop} className="bg-card/50 border border-border/30 rounded-lg px-3 py-2">
              <code className="text-[10px] text-emerald-400 font-mono">{prop}</code>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ─── Sub-components ─── */

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium border transition-all ${
        active
          ? "bg-foreground text-background border-foreground"
          : "bg-card border-border/60 text-foreground hover:border-foreground/30"
      }`}
    >
      {children}
    </button>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <Card className="p-4 rounded-xl">
      <div className="flex items-center gap-2 mb-2">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      </div>
      <div className="text-2xl font-serif">{value}</div>
    </Card>
  );
}

function InsightRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={`flex justify-between py-2 ${last ? "" : "border-b border-border/30"}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm font-medium capitalize">{value}</div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-card border border-border/40 rounded-lg p-2 text-center">
      <div className="text-lg font-serif">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    </div>
  );
}
