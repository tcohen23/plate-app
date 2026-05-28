/**
 * MobileLayout — App shell (Redesign)
 *
 * Phone/Tablet (< 1024px): sticky header + bottom nav (MFP psychology)
 * Desktop (≥ 1024px): fixed sidebar nav + full-width content area
 *
 * Design language: clean dark surfaces, Plate green accents, gold premium CTAs,
 * MFP-inspired nav psychology — user always knows where they are.
 */
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { api } from "../../convex/_generated/api";
import {
  Activity, CalendarDays, TrendingUp, MoreHorizontal, Plus, X,
  ShoppingCart, UtensilsCrossed, Settings, Dumbbell, Lightbulb,
  HelpCircle, Crown, Droplets, Minus,
} from "lucide-react";
import { parseAvatarChoice } from "@/pages/SettingsPage";
import { identifyUser, setUserProperties } from "../lib/posthog";
import { hapticLight, hapticMedium } from "@/lib/haptics";
import { RefreshCw } from "lucide-react";
import { useAccessLevel } from "@/components/RequireSubscription";
import { PaywallModal } from "@/components/PaywallModal";
import type { PaywallFeature } from "@/components/PaywallModal";
import { toast } from "sonner";

/* ─── Nav definitions ─── */
const BOTTOM_TABS = [
  { path: "/dashboard", label: "Today", icon: Activity },
  { path: "/plan", label: "Plan", icon: CalendarDays },
  // center "+" placeholder
  { path: "/progress", label: "Progress", icon: TrendingUp },
  { path: "/more", label: "More", icon: MoreHorizontal },
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

const QUICK_ACTIONS = [
  { icon: "🎙️", label: "Voice Log", action: "voice", premium: true },
  { icon: "📸", label: "Meal Scan", action: "photo", premium: true },
  { icon: "📦", label: "Barcode", action: "barcode", premium: true },
  { icon: "🍽️", label: "Log Food", action: "log", route: "/track" },
  { icon: "💧", label: "Log Water", action: "water" },
  { icon: "⚖️", label: "Log Weight", action: "weight", route: "/progress?logWeight=1" },
];

const MORE_ITEMS = [
  { label: "Track Food", path: "/track", icon: "🍽️" },
  { label: "Grocery List", path: "/grocery", icon: "🛒" },
  { label: "Share an Idea 💡", path: "/feedback", icon: "✨" },
  { label: "Why Plate", path: "/why", icon: "❓" },
  { label: "Workout", path: "/workout", icon: "🏋️", requiresWorkout: true },
  { label: "Settings", path: "/settings", icon: "⚙️" },
];

const ACTION_FEATURE_MAP: Record<string, PaywallFeature> = {
  barcode: "barcode",
  voice: "voice_log",
  photo: "meal_scan",
};

/* ─── Quick action sheet ─── */
function QuickActionSheet({ onClose, navigate, isPremium }: {
  onClose: () => void;
  navigate: (path: string) => void;
  isPremium: boolean;
}) {
  const [paywallFeature, setPaywallFeature] = useState<PaywallFeature | null>(null);
  const [showWater, setShowWater] = useState(false);
  const [glasses, setGlasses] = useState(1);
  const [waterLogging, setWaterLogging] = useState(false);
  const logHydration = useMutation(api.progress.logHydration);
  const todaysHydration = useQuery(api.progress.getTodaysHydration);

  const handleAction = (action: (typeof QUICK_ACTIONS)[0]) => {
    hapticLight();
    if (action.action === "water") { setShowWater(true); return; }
    if ((action as any).premium && !isPremium) {
      setPaywallFeature(ACTION_FEATURE_MAP[action.action] ?? "general");
      return;
    }
    if (action.action === "photo") { onClose(); navigate("/scanner?mode=food"); return; }
    onClose();
    if (action.action === "voice") { navigate("/track?voice=1"); return; }
    if (action.action === "barcode") { navigate("/scanner?mode=barcode"); return; }
    if ((action as any).route) navigate((action as any).route);
  };

  const handleLogWater = async () => {
    setWaterLogging(true);
    try {
      const current = todaysHydration?.glasses ?? 0;
      await logHydration({ glasses: current + glasses });
      hapticMedium();
      toast.success(`+${glasses} glass${glasses > 1 ? "es" : ""} logged 💧`);
      onClose();
    } catch {
      toast.error("Failed to log water");
    } finally {
      setWaterLogging(false);
    }
  };

  if (showWater) {
    return (
      <div className="px-5 pb-8 pt-4">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => setShowWater(false)}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-opacity active:opacity-60"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <X className="w-4 h-4 text-white" />
          </button>
          <h3 className="font-semibold text-white text-base">Log Water</h3>
        </div>
        <div className="flex items-center justify-center gap-8 mb-6">
          <button
            onClick={() => setGlasses(Math.max(1, glasses - 1))}
            className="w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-90"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
          >
            <Minus className="w-5 h-5 text-white" />
          </button>
          <div className="flex flex-col items-center gap-1">
            <Droplets className="w-9 h-9" style={{ color: "#52B788" }} />
            <span className="text-5xl font-bold text-white" style={{ fontFamily: "var(--font-serif)" }}>{glasses}</span>
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
              glass{glasses > 1 ? "es" : ""} · {glasses * 8} oz
            </span>
          </div>
          <button
            onClick={() => setGlasses(Math.min(16, glasses + 1))}
            className="w-14 h-14 rounded-full flex items-center justify-center transition-all active:scale-90"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)" }}
          >
            <Plus className="w-5 h-5 text-white" />
          </button>
        </div>
        {todaysHydration && (
          <p className="text-center text-xs mb-5" style={{ color: "rgba(255,255,255,0.35)" }}>
            Today: {todaysHydration.glasses} / {todaysHydration.target ?? 8} glasses
          </p>
        )}
        <button
          onClick={handleLogWater}
          disabled={waterLogging}
          className="w-full py-4 rounded-2xl font-semibold text-sm disabled:opacity-50 transition-all active:scale-[0.98]"
          style={{ background: "#52B788", color: "#0d1f13" }}
        >
          {waterLogging ? "Logging..." : "Log Water"}
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="px-5 pb-8 pt-4">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-semibold text-white text-lg">Quick Log</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-opacity active:opacity-60"
            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          {QUICK_ACTIONS.map((action) => {
            const isGated = (action as any).premium && !isPremium;
            return (
              <button
                key={action.action}
                onClick={() => handleAction(action)}
                className="flex flex-col items-center gap-2.5 py-5 px-3 rounded-2xl transition-all active:scale-[0.94] relative"
                style={{
                  background: isGated ? "rgba(229,180,84,0.07)" : "rgba(255,255,255,0.05)",
                  border: isGated
                    ? "1px solid rgba(229,180,84,0.2)"
                    : "1px solid rgba(255,255,255,0.07)",
                }}
              >
                {isGated && (
                  <span
                    className="absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: "rgba(229,180,84,0.15)", color: "#E5B454" }}
                  >
                    PRO
                  </span>
                )}
                <span className="text-2xl">{action.icon}</span>
                <span
                  className="text-xs font-medium text-center leading-tight"
                  style={{ color: isGated ? "rgba(229,180,84,0.85)" : "rgba(255,255,255,0.75)" }}
                >
                  {action.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      <PaywallModal
        open={paywallFeature !== null}
        onClose={() => setPaywallFeature(null)}
        feature={paywallFeature ?? "general"}
      />
    </>
  );
}

/* ─── More page (bottom sheet) ─── */
function MorePage({ onClose, navigate, hasWorkout }: {
  onClose: () => void;
  navigate: (path: string) => void;
  hasWorkout: boolean;
}) {
  const items = MORE_ITEMS.filter((item) => !item.requiresWorkout || hasWorkout);
  return (
    <div className="px-5 pb-8 pt-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white text-lg">More</h3>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-opacity active:opacity-60"
          style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)" }}
        >
          <X className="w-4 h-4 text-white" />
        </button>
      </div>
      <div className="flex flex-col gap-1.5">
        {items.map((item) => (
          <button
            key={item.path}
            onClick={() => { onClose(); navigate(item.path); hapticLight(); }}
            className="flex items-center gap-4 px-4 py-3.5 rounded-2xl text-left transition-all active:scale-[0.98]"
            style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-base"
              style={{ background: "rgba(255,255,255,0.07)" }}
            >
              {item.icon}
            </div>
            <span className="text-sm font-medium text-white flex-1">{item.label}</span>
            <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 18 }}>›</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Bottom sheet ─── */
function BottomSheet({ open, onClose, children }: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;
  return (
    <>
      <div
        className="fixed inset-0 z-50 lg:hidden"
        style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
        onClick={onClose}
      />
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl lg:hidden"
        style={{
          background: "#111214",
          maxWidth: 480,
          margin: "0 auto",
          boxShadow: "0 -12px 60px rgba(0,0,0,0.7)",
          borderTop: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full" style={{ background: "rgba(255,255,255,0.12)" }} />
        </div>
        {children}
      </div>
      {/* Desktop modal */}
      <div
        className="hidden lg:flex fixed inset-0 z-50 items-center justify-center"
        onClick={onClose}
      >
        <div
          className="rounded-3xl w-full max-w-sm overflow-hidden"
          style={{
            background: "#111214",
            boxShadow: "0 24px 80px rgba(0,0,0,0.9)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {children}
        </div>
      </div>
    </>
  );
}

/* ─── Avatar display ─── */
function AvatarDisplay({ profilePictureUrl, profile, initial }: {
  profilePictureUrl: string | null | undefined;
  profile: any;
  initial: string;
}) {
  if (profilePictureUrl) {
    return <img src={profilePictureUrl} alt="Profile" className="w-full h-full object-cover" />;
  }
  const parsed = parseAvatarChoice((profile as any)?.avatarChoice);
  if (parsed?.type === "emoji") {
    return (
      <div className="w-full h-full rounded-full flex items-center justify-center text-base" style={{ background: parsed.bg }}>
        {parsed.emoji}
      </div>
    );
  }
  if (parsed?.type === "url") {
    return <img src={parsed.url} alt="Avatar" className="w-full h-full p-0.5" />;
  }
  return (
    <span className="text-xs font-serif font-medium" style={{ color: "var(--plate-green-accent)" }}>
      {initial}
    </span>
  );
}

/* ─── Desktop sidebar ─── */
function DesktopSidebar({ profile, profilePictureUrl, isPremium, isTrialing, hasWorkout, navigate, location, onQuickAction }: {
  profile: any;
  profilePictureUrl: string | null | undefined;
  isPremium: boolean;
  isTrialing: boolean;
  hasWorkout: boolean;
  navigate: (path: string) => void;
  location: ReturnType<typeof useLocation>;
  onQuickAction: () => void;
}) {
  const initial = (profile?.name || "U")[0].toUpperCase();
  const navItems = SIDEBAR_NAV.filter((item) => !item.requiresWorkout || hasWorkout);

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
      <div className="px-5 py-5 flex items-center gap-2.5" style={{ borderBottom: "1px solid var(--border)" }}>
        <img src="/logo.png" alt="Plate" className="w-8 h-8 rounded-xl" />
        <span style={{ fontFamily: "var(--font-serif)", fontSize: 20, fontWeight: 400, color: "var(--foreground)" }}>
          Plate
        </span>
      </div>

      {/* Quick Log button */}
      <div className="px-4 pt-4 pb-3">
        <button
          onClick={onQuickAction}
          className="w-full flex items-center gap-2.5 px-4 py-3 rounded-2xl font-semibold text-sm transition-all hover:opacity-90 active:scale-[0.98]"
          style={{ background: "var(--plate-green-accent)", color: "#0d1f13" }}
        >
          <Plus className="w-4 h-4" />
          Quick Log
        </button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <button
              key={item.path}
              onClick={() => { navigate(item.path); hapticLight(); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all mb-0.5"
              style={{
                background: isActive ? "var(--plate-green-deep)" : "transparent",
                color: isActive ? "var(--plate-green-accent)" : "var(--muted-foreground)",
              }}
            >
              <Icon className="w-4.5 h-4.5 flex-shrink-0" style={{ width: 18, height: 18 }} />
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Profile + upgrade */}
      <div className="px-4 pb-5 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
        {!isPremium && (
          <button
            onClick={() => navigate("/onboarding/upgrade")}
            className="w-full flex items-center gap-2 px-4 py-3 rounded-2xl mb-3 transition-all hover:opacity-90 active:scale-[0.98]"
            style={{ background: "var(--plate-gold-bg)", border: "1px solid rgba(229,180,84,0.3)" }}
          >
            <Crown className="w-4 h-4 flex-shrink-0" style={{ color: "var(--plate-gold)" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--plate-gold)" }}>
              {isTrialing ? "Trial Active" : "Go Premium"}
            </span>
          </button>
        )}
        <button
          onClick={() => navigate("/settings")}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all hover:bg-accent/20"
        >
          <div
            className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0"
            style={{ background: "var(--plate-green-deep)", border: "1.5px solid var(--plate-green-accent)" }}
          >
            <AvatarDisplay profilePictureUrl={profilePictureUrl} profile={profile} initial={initial} />
          </div>
          <div className="text-left flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{profile?.name || "You"}</p>
            <p className="text-xs text-muted-foreground">{isPremium ? "Premium ✓" : "Free plan"}</p>
          </div>
        </button>
      </div>
    </aside>
  );
}

/* ═══════════════════════════════════════════════════
   MOBILE LAYOUT
   ═══════════════════════════════════════════════════ */
export function MobileLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const profile = useQuery(api.profiles.getProfile);
  const profilePictureUrl = useQuery(api.profiles.getProfilePictureUrl);
  const workoutPlan = useQuery(api.workouts.getCurrentWorkoutPlan);
  const { isPremium, isTrialing } = useAccessLevel();
  const [sheetMode, setSheetMode] = useState<"closed" | "actions" | "more">("closed");
  const prevPath = useRef(location.pathname);

  // Close sheet on navigation
  useEffect(() => {
    if (location.pathname !== prevPath.current) {
      setSheetMode("closed");
      prevPath.current = location.pathname;
    }
  }, [location.pathname]);

  // Identify user in PostHog
  useEffect(() => {
    if (!profile) return;
    const p = profile as any;
    identifyUser(p._id?.toString() ?? p.userId ?? "anon");
    setUserProperties({
      name: p.name,
      goal: p.goal,
      isPremium: isPremium,
      isTrialing: isTrialing,
    });
  }, [profile, isPremium, isTrialing]);

  if (!profile) {
    return (
      <div className="flex items-center justify-center h-screen">
        <RefreshCw className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const p = profile as any;
  const initial = (p.name || "U")[0].toUpperCase();
  const hasWorkout = !!(workoutPlan as any)?.plan;

  const isTabActive = (path: string) => {
    if (path === "/more") {
      // "More" is active when on pages not in the main tabs
      const mainPaths = ["/dashboard", "/plan", "/progress"];
      return !mainPaths.some((mp) => location.pathname.startsWith(mp));
    }
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  return (
    <div
      className="flex flex-col"
      style={{ minHeight: "100dvh", background: "var(--background)" }}
    >
      {/* Desktop sidebar */}
      <DesktopSidebar
        profile={profile}
        profilePictureUrl={profilePictureUrl as any}
        isPremium={isPremium}
        isTrialing={isTrialing}
        hasWorkout={hasWorkout}
        navigate={navigate}
        location={location}
        onQuickAction={() => setSheetMode("actions")}
      />

      {/* Main content area */}
      <main
        className="flex-1 lg:ml-60"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {/* Mobile header */}
        <header
          className="lg:hidden sticky top-0 z-30 flex items-center justify-between px-4"
          style={{
            height: 56,
            background: "var(--background)",
            borderBottom: "1px solid var(--border)",
            paddingTop: "env(safe-area-inset-top, 0px)",
          }}
        >
          {/* Logo */}
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Plate" className="w-7 h-7 rounded-lg" />
            <span
              style={{
                fontFamily: "var(--font-serif)",
                fontSize: 18,
                fontWeight: 400,
                color: "var(--foreground)",
                letterSpacing: "-0.01em",
              }}
            >
              Plate
            </span>
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            {/* Streak badge if active */}
            {/* Settings avatar */}
            <button
              onClick={() => { hapticLight(); navigate("/settings"); }}
              className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 transition-opacity active:opacity-70"
              style={{
                background: "var(--plate-green-deep)",
                border: "1.5px solid rgba(82,183,136,0.4)",
              }}
            >
              <AvatarDisplay
                profilePictureUrl={profilePictureUrl as any}
                profile={profile}
                initial={initial}
              />
            </button>
          </div>
        </header>

        {/* Page content */}
        <div className="pb-24 lg:pb-8">
          <Outlet />
        </div>
      </main>

      {/* ── Bottom tab bar (mobile only) ── */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40"
        style={{
          background: "var(--background)",
          borderTop: "1px solid var(--border)",
          paddingBottom: "env(safe-area-inset-bottom, 12px)",
        }}
      >
        <div className="flex items-end justify-around px-2 pt-2 pb-1 max-w-lg mx-auto relative">
          {/* Left 2 tabs */}
          {BOTTOM_TABS.slice(0, 2).map((tab) => {
            const Icon = tab.icon;
            const active = isTabActive(tab.path);
            return (
              <button
                key={tab.path}
                onClick={() => { hapticLight(); navigate(tab.path); }}
                className="flex flex-col items-center gap-1 flex-1 py-1 transition-all active:scale-95"
                style={{ minWidth: 0 }}
              >
                <Icon
                  className="w-5 h-5 transition-colors"
                  style={{ color: active ? "var(--plate-green-accent)" : "var(--muted-foreground)" }}
                />
                <span
                  className="text-[10px] font-medium transition-colors"
                  style={{ color: active ? "var(--plate-green-accent)" : "var(--muted-foreground)" }}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}

          {/* Center floating "+" button */}
          <div className="flex-1 flex items-end justify-center" style={{ paddingBottom: 4 }}>
            <button
              onClick={() => { hapticMedium(); setSheetMode("actions"); }}
              className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-90"
              style={{
                background: "var(--plate-green-accent)",
                boxShadow: "0 4px 20px rgba(82,183,136,0.4)",
                marginBottom: 4,
              }}
            >
              <Plus
                className="w-6 h-6 transition-transform"
                style={{
                  color: "#0d1f13",
                  transform: sheetMode === "actions" ? "rotate(45deg)" : "rotate(0deg)",
                  transition: "transform 0.2s ease",
                }}
              />
            </button>
          </div>

          {/* Right 2 tabs */}
          {BOTTOM_TABS.slice(2).map((tab) => {
            const Icon = tab.icon;
            const active = isTabActive(tab.path);
            const isMore = tab.path === "/more";
            return (
              <button
                key={tab.path}
                onClick={() => {
                  hapticLight();
                  if (isMore) {
                    setSheetMode(sheetMode === "more" ? "closed" : "more");
                  } else {
                    navigate(tab.path);
                  }
                }}
                className="flex flex-col items-center gap-1 flex-1 py-1 transition-all active:scale-95"
                style={{ minWidth: 0 }}
              >
                <Icon
                  className="w-5 h-5 transition-colors"
                  style={{
                    color:
                      isMore && sheetMode === "more"
                        ? "var(--plate-green-accent)"
                        : active
                        ? "var(--plate-green-accent)"
                        : "var(--muted-foreground)",
                  }}
                />
                <span
                  className="text-[10px] font-medium transition-colors"
                  style={{
                    color:
                      isMore && sheetMode === "more"
                        ? "var(--plate-green-accent)"
                        : active
                        ? "var(--plate-green-accent)"
                        : "var(--muted-foreground)",
                  }}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* ── Bottom sheets ── */}
      <BottomSheet open={sheetMode === "actions"} onClose={() => setSheetMode("closed")}>
        <QuickActionSheet
          onClose={() => setSheetMode("closed")}
          navigate={navigate}
          isPremium={isPremium}
        />
      </BottomSheet>

      <BottomSheet open={sheetMode === "more"} onClose={() => setSheetMode("closed")}>
        <MorePage
          onClose={() => setSheetMode("closed")}
          navigate={navigate}
          hasWorkout={hasWorkout}
        />
      </BottomSheet>
    </div>
  );
}
