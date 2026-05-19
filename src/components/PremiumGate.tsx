/**
 * PremiumGate — Wraps premium features with a paywall overlay.
 *
 * Usage:
 *   <PremiumGate feature="grocery" featureLabel="Grocery List">
 *     <GroceryContent />
 *   </PremiumGate>
 *
 * If user has premium access, children render normally.
 * If not, children render with a lock overlay that opens the upgrade modal on tap.
 */

import { useQuery } from "convex/react";
import { useNavigate } from "react-router-dom";
import { api } from "../../convex/_generated/api";
import { Lock, ShoppingCart, Dumbbell, Pill, Sparkles } from "lucide-react";
import { hapticMedium } from "@/lib/haptics";

export type PremiumFeature = "grocery" | "glp1" | "premium_avatar" | "workouts";

interface PremiumGateProps {
  feature: PremiumFeature;
  featureLabel?: string;
  children: React.ReactNode;
  /** If true, wraps children with a lock overlay instead of replacing them */
  overlayMode?: boolean;
}

const FEATURE_COPY: Record<PremiumFeature, { icon: React.ReactNode; headline: string; bullets: string[] }> = {
  grocery: {
    icon: <ShoppingCart className="w-10 h-10" />,
    headline: "Unlock your Grocery List",
    bullets: [
      "Full week of ingredients, auto-generated from your meal plan",
      "Deduplicated and sorted by store section",
      "Check off items as you shop",
      "Syncs every time your plan changes",
    ],
  },
  glp1: {
    icon: <Pill className="w-10 h-10" />,
    headline: "Unlock GLP-1 Support",
    bullets: [
      "Macro targets adjusted for GLP-1 appetite changes",
      "Higher protein priority to protect lean mass",
      "Smaller portions, more frequent meals",
      "Built on semaglutide/tirzepatide clinical data",
    ],
  },
  premium_avatar: {
    icon: <Sparkles className="w-10 h-10" />,
    headline: "Unlock Premium Avatars",
    bullets: [
      "Access the full premium avatar collection",
      "Stand out on the leaderboard and in sharing",
      "Includes rare and limited-edition picks",
    ],
  },
  workouts: {
    icon: <Dumbbell className="w-10 h-10" />,
    headline: "Unlock Workout Generator",
    bullets: [
      "Personalized workout plans based on your goals and equipment",
      "Weight lifting, calisthenics, or functional fitness",
      "RIR-based Push Harder coaching — auto-detect when you're sandbagging",
      "Auto-deload every 6 weeks, rest timer, streak tracking",
    ],
  },
};

/** Check if the current user has premium access (Stripe OR comp role) */
export function usePremiumAccess(): boolean | undefined {
  const profile = useQuery(api.profiles.getProfile);
  if (profile === undefined) return undefined; // loading
  if (!profile) return false; // no profile yet (new user)

  const adminLevel = (profile as any).adminLevel as string | undefined;
  const role = (profile as any).role as string | undefined;
  const isPremium = (profile as any).isPremium as boolean | undefined;

  // Comp access: friends_family adminLevel OR family/friends/admin role
  if (adminLevel === "friends_family" || adminLevel === "owner" || adminLevel === "admin" || adminLevel === "moderator") return true;
  if (role === "family" || role === "friends" || role === "admin") return true;
  return isPremium === true;
}

export function PremiumGate({ feature, featureLabel, children, overlayMode = false }: PremiumGateProps) {
  const hasPremium = usePremiumAccess();
  const navigate = useNavigate();

  // Still loading profile
  if (hasPremium === undefined) return <>{children}</>;
  if (hasPremium) return <>{children}</>;

  const copy = FEATURE_COPY[feature];

  const handleUpgradeTap = () => {
    hapticMedium();
    navigate("/upgrade");
  };

  if (overlayMode) {
    return (
      <div className="relative">
        <div className="pointer-events-none select-none" style={{ filter: "blur(2px)", opacity: 0.4 }}>
          {children}
        </div>
        <div
          className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer rounded-xl"
          style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)" }}
          onClick={handleUpgradeTap}
        >
          <Lock className="w-8 h-8 mb-2" style={{ color: "var(--plate-green-accent)" }} />
          <span className="text-sm font-semibold text-white">{featureLabel || copy.headline}</span>
          <span className="text-xs text-white/70 mt-1">Tap to unlock — Start free trial</span>
        </div>
      </div>
    );
  }

  return <PaywallScreen feature={feature} onUpgrade={handleUpgradeTap} />;
}

function PaywallScreen({ feature, onUpgrade }: { feature: PremiumFeature; onUpgrade: () => void }) {
  const copy = FEATURE_COPY[feature];
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 py-12 text-center">
      <img
        src="/plate-logo.jpg"
        alt="Plate"
        className="w-24 h-24 rounded-2xl object-contain mb-6"
        style={{ background: "#0a0a0a" }}
      />
      <h2 className="text-2xl font-serif mb-3">{copy.headline}</h2>
      <ul className="text-sm text-muted-foreground space-y-2 mb-8 text-left max-w-xs">
        {copy.bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-2">
            <span style={{ color: "var(--plate-green-accent)" }}>✓</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
      <button
        onClick={onUpgrade}
        className="w-full max-w-xs py-4 rounded-2xl text-base font-bold transition-opacity active:opacity-80"
        style={{ background: "var(--plate-green-accent)", color: "#0a1a0a" }}
      >
        Start 7-Day Free Trial
      </button>
      <p className="text-xs text-muted-foreground mt-3">$14.99/mo · or $5.99/mo billed annually · Cancel anytime</p>
    </div>
  );
}


