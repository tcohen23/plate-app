/**
 * MobileLayout — App shell
 *
 * Phone/Tablet (< 1024px): sticky header + bottom nav (MFP style)
 * Desktop (≥ 1024px): fixed sidebar nav + full-width content area
 */
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useQuery, useConvex } from "convex/react";
import { useEffect, useRef } from "react";
import { api } from "../../convex/_generated/api";
import {
  Activity, CalendarDays, TrendingUp, MoreHorizontal, Plus,
  ShoppingCart, UtensilsCrossed, Settings, Dumbbell, Lightbulb,
  HelpCircle, Crown,
} from "lucide-react";


import { identifyUser, setUserProperties, setConvexClientForAnalytics } from "../lib/posthog";
import { hapticLight, hapticMedium } from "@/lib/haptics";
import { RefreshCw } from "lucide-react";
import { useAccessLevel } from "@/components/RequireSubscription";


/* ─── Nav definitions ─── */
const BOTTOM_TABS = [
  { path: "/dashboard", label: "Today", icon: Activity },
  { path: "/plan", label: "Plan", icon: CalendarDays },
  // center "+" placeholder
  { path: "/progress", label: "Progress", icon: TrendingUp },
  { path: "/more", label: "More", icon: MoreHorizontal, matchPrefix: "/more" },
];

const SIDEBAR_NAV = [
  { path: "/dashboard", label: "Today", icon: Activity },
  { path: "/plan", label: "Meal Plan", icon: CalendarDays },
  { path: "/progress", label: "Progress", icon: TrendingUp },
  { path: "/track", label: "Log Food", icon: UtensilsCrossed },
  { path: "/grocery", label: "Grocery", icon: ShoppingCart },
  { path: "/workout", label: "Workout", icon: Dumbbell, requiresWorkout: true },
  { path: "/feedback", label: "Ideas", icon: Lightbulb },
  { path: "/why", label: "Why Plate", icon: HelpCircle },
  { path: "/settings", label: "Settings", icon: Settings },
];




/* ─── Avatar display helper ─── */
function AvatarDisplay({ profilePictureUrl, initial }: { profilePictureUrl: string | null | undefined; profile?: any; initial: string }) {
  if (profilePictureUrl) return <img src={profilePictureUrl} alt="Profile" className="w-full h-full object-cover" />;
  return <span className="text-xs font-bold" style={{ color: "var(--plate-green-accent)" }}>{initial}</span>;
}

/* ─── Desktop sidebar ─── */
function DesktopSidebar({ profile, profilePictureUrl, isPremium, isTrialing, hasWorkout, navigate, location }: {
  profile: any;
  profilePictureUrl: string | null | undefined;
  isPremium: boolean;
  isTrialing: boolean;
  hasWorkout: boolean;
  navigate: (path: string) => void;
  location: ReturnType<typeof useLocation>;
}) {
  const initial = (profile?.name || "U")[0].toUpperCase();
  const navItems = SIDEBAR_NAV.filter(item => !item.requiresWorkout || hasWorkout);

  return (
    <aside
      className="hidden lg:flex flex-col fixed left-0 top-0 bottom-0 z-40"
      style={{
        width: 240,
        background: "var(--background)",
        borderRight: "1px solid var(--border)",
      }}
    >
      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-2.5 border-b border-border/50">
        <img src="/logo.png" alt="Plate" className="w-8 h-8 rounded-lg" />
        <span className="font-serif text-xl font-normal">Plate</span>
      </div>

      {/* Quick Log button */}
      <div className="px-4 pt-4 pb-2">
        <button
          onClick={() => navigate("/track")}
          className="w-full flex items-center justify-center gap-2 rounded-2xl py-2.5 font-semibold text-sm transition-all hover:opacity-90 active:scale-[0.98]"
          style={{ background: "#52B788", color: "#0d1f13" }}
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          Log Food
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all"
              style={{
                background: isActive ? "rgba(82,183,136,0.12)" : "transparent",
                color: isActive ? "var(--plate-green-accent)" : "var(--muted-foreground)",
                fontWeight: isActive ? 600 : 400,
              }}
            >
              <Icon
                className="w-4.5 h-4.5 flex-shrink-0"
                style={{ strokeWidth: isActive ? 2.5 : 1.75 }}
              />
              <span className="text-sm">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom: Premium upsell + profile */}
      <div className="px-4 pb-5 space-y-3 border-t border-border/50 pt-3">
        {/* Trial badge — shown only during free trial */}
        {isTrialing && (
          <div
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold"
            style={{
              background: "rgba(82,183,136,0.1)",
              color: "#52B788",
              border: "1px solid rgba(82,183,136,0.25)",
            }}
          >
            🎉 Trial active
          </div>
        )}
        {/* Go Premium pill — only for fully free users */}
        {!isPremium && (
          <button
            onClick={() => navigate("/onboarding/upgrade")}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90"
            style={{
              background: "var(--plate-gold-bg, #2A2418)",
              color: "var(--plate-gold, #E5B454)",
              border: "1px solid rgba(229,180,84,0.25)",
            }}
          >
            <Crown className="w-4 h-4" />
            Go Premium
          </button>
        )}
        <button
          onClick={() => navigate("/settings")}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all hover:bg-accent/30"
        >
          <div
            className="w-8 h-8 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center"
            style={{ background: "var(--plate-green-deep)" }}
          >
            <AvatarDisplay profilePictureUrl={profilePictureUrl} profile={profile} initial={initial} />
          </div>
          <div className="flex-1 min-w-0 text-left">
            <div className="text-sm font-medium truncate">{profile?.name || "Account"}</div>
            <div className="text-xs text-muted-foreground">Settings</div>
          </div>
        </button>
      </div>
    </aside>
  );
}

/* ══════════════════════════════════════════════════════
   MAIN LAYOUT
   ══════════════════════════════════════════════════════ */
export function MobileLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const convex = useConvex();
  const profile = useQuery(api.profiles.getProfile);
  const profilePictureUrl = useQuery(api.profiles.getProfilePictureUrl);
  const { isPremium, isTrialing, hasWorkout } = useAccessLevel();

  // Wire Convex client into analytics so posthog.ts can fire server-side events
  useEffect(() => { setConvexClientForAnalytics(convex); }, [convex]);





  // Identify user in PostHog
  const identified = useRef(false);
  useEffect(() => {
    if (profile && profile._id && !identified.current) {
      identified.current = true;
      identifyUser(profile._id, {
        name: profile.name || undefined,
        diet: profile.dietPreference || undefined,
        goal: profile.goal || undefined,
        calorie_target: profile.targetCalories || undefined,
      });
      setUserProperties({
        diet: profile.dietPreference,
        goal: profile.goal,
        calorie_target: profile.targetCalories,
        cooking_level: profile.cookingPreference,
      });
    }
  }, [profile]);

  // Navigate to onboarding inside an effect — never call navigate() during render,
  // it's a side-effect and crashes React 19 (causes replaceState in render phase).
  useEffect(() => {
    if (profile === null) {
      navigate("/onboarding/building-plan", { replace: true });
    }
  }, [profile, navigate]);

  if (profile === undefined || profile === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <RefreshCw className="w-6 h-6 text-muted-foreground animate-spin" />
      </div>
    );
  }

  const initial = (profile.name || "U")[0].toUpperCase();

  const handleTabPress = (tab: (typeof BOTTOM_TABS)[number]) => {
    hapticLight();
    navigate(tab.path);
  };

  const isTabActive = (tab: (typeof BOTTOM_TABS)[number]) => {
    if ((tab as any).matchPrefix) return location.pathname.startsWith((tab as any).matchPrefix);
    return location.pathname === tab.path;
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* ── Desktop sidebar ── */}
      <DesktopSidebar
        profile={profile}
        profilePictureUrl={profilePictureUrl}
        isPremium={!!isPremium}
        isTrialing={!!isTrialing}
        hasWorkout={!!hasWorkout}
        navigate={navigate}
        location={location}
      />

      {/* ── Right side: header + content ── */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-[240px]">
        {/* Header — shown on all sizes */}
        <header className="sticky top-0 bg-background z-40 px-5 py-3 flex items-center justify-between border-b border-border/50">
          {/* Mobile: logo. Desktop: page title */}
          <div className="flex items-center gap-2 lg:hidden">
            <img src="/logo.png" alt="Plate" className="w-7 h-7 rounded-md" />
            <span className="font-serif text-xl font-normal">Plate</span>
          </div>
          {/* Desktop: current page name */}
          <div className="hidden lg:block">
            <span className="font-serif text-xl capitalize">
              {SIDEBAR_NAV.find(n => n.path === location.pathname)?.label ?? "Plate"}
            </span>
          </div>

          {/* Right: avatar/settings button */}
          <button
            onClick={() => navigate("/settings")}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-full border border-border/60 hover:border-foreground/30 hover:bg-accent/30 transition-all tap-scale"
          >
            <div
              className="w-7 h-7 rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center"
              style={{ background: "var(--plate-green-deep)" }}
            >
              <AvatarDisplay profilePictureUrl={profilePictureUrl} profile={profile} initial={initial} />
            </div>
            <span className="text-sm text-muted-foreground font-medium pr-0.5">
              {profile.name?.split(" ")[0] || "Account"}
            </span>
          </button>
        </header>

        {/* ── Main content ── */}
        <main className="flex-1 pb-24 lg:pb-8 overflow-y-auto">
          <Outlet />
        </main>

        {/* ── Bottom nav — mobile/tablet only ── */}
        <nav className="fixed bottom-0 left-0 right-0 bottom-nav z-50 pb-safe lg:hidden">
          <div className="flex items-center justify-around max-w-lg mx-auto px-1 relative" style={{ height: 62 }}>
            {BOTTOM_TABS.slice(0, 2).map((tab) => {
              const isActive = isTabActive(tab);
              const Icon = tab.icon;
              return (
                <button key={tab.path} onClick={() => handleTabPress(tab)} className={`bottom-nav-item py-2 px-3 ${isActive ? "active" : ""}`}>
                  <Icon className={`w-[20px] h-[20px] transition-all duration-200 ${isActive ? "stroke-[2.5]" : "stroke-[1.5]"}`} />
                  <span className={`text-[10px] tracking-wide ${isActive ? "font-semibold" : "font-medium"}`}>{tab.label}</span>
                </button>
              );
            })}

            {/* Center "+" — navigates directly to Food Tracker */}
            <button
              onClick={() => { hapticMedium(); navigate("/track"); }}
              className="flex items-center justify-center rounded-full transition-all active:scale-[0.94] shadow-lg"
              style={{ width: 52, height: 52, background: "#52B788", boxShadow: "0 4px 16px rgba(82,183,136,0.4)", marginBottom: 8 }}
              aria-label="Log food"
            >
              <Plus className="w-6 h-6" style={{ color: "#0d1f13", strokeWidth: 2.5 }} />
            </button>

            {BOTTOM_TABS.slice(2).map((tab) => {
              const isActive = isTabActive(tab);
              const Icon = tab.icon;
              return (
                <button key={tab.path || tab.label} onClick={() => handleTabPress(tab)} className={`bottom-nav-item py-2 px-3 ${isActive ? "active" : ""}`}>
                  <Icon className={`w-[20px] h-[20px] transition-all duration-200 ${isActive ? "stroke-[2.5]" : "stroke-[1.5]"}`} />
                  <span className={`text-[10px] tracking-wide ${isActive ? "font-semibold" : "font-medium"}`}>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Quick Actions Sheet — opened by center "+" button */}


    </div>
  );
}
