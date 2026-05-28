/**
 * PremiumGate — Wraps premium features with a paywall overlay.
 *
 * Usage:
 *   <PremiumGate feature="grocery" featureLabel="Grocery List">
 *     <GroceryContent />
 *   </PremiumGate>
 *
 * If user has premium access, children render normally.
 * If not, children render with a lock overlay that opens the animated PaywallModal on tap.
 */

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Lock, ShoppingCart, Dumbbell, Sparkles } from "lucide-react";
import { hapticMedium } from "@/lib/haptics";
import { PaywallModal, type PaywallFeature } from "@/components/PaywallModal";

export type PremiumFeature = "grocery" | "premium_avatar" | "workouts";

// Map PremiumGate feature names → PaywallModal feature keys
const PREMIUM_TO_PAYWALL_FEATURE: Record<PremiumFeature, PaywallFeature> = {
  grocery: "grocery",
  premium_avatar: "premium_avatar",
  workouts: "workout",
};

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
  const [paywallOpen, setPaywallOpen] = useState(false);

  // Still loading profile
  if (hasPremium === undefined) return <>{children}</>;
  if (hasPremium) return <>{children}</>;

  const copy = FEATURE_COPY[feature];
  const paywallFeature = PREMIUM_TO_PAYWALL_FEATURE[feature];

  const handleUpgradeTap = () => {
    hapticMedium();
    setPaywallOpen(true);
  };

  const paywallModal = (
    <PaywallModal
      open={paywallOpen}
      onClose={() => setPaywallOpen(false)}
      feature={paywallFeature}
    />
  );

  if (overlayMode) {
    return (
      <>
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
        {paywallModal}
      </>
    );
  }

  // Full-screen gate: show blurred children behind + animated paywall that auto-opens
  return <FullScreenGate feature={feature} featureLabel={featureLabel} onTap={handleUpgradeTap} paywallModal={paywallModal} />;
}

function FullScreenGate({
  feature,
  featureLabel,
  onTap,
  paywallModal,
}: {
  feature: PremiumFeature;
  featureLabel?: string;
  onTap: () => void;
  paywallModal: React.ReactNode;
}) {
  const copy = FEATURE_COPY[feature];
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 py-12 text-center">
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6"
        style={{ background: "rgba(82,183,136,0.1)", border: "1px solid rgba(82,183,136,0.25)", color: "#52B788" }}
      >
        {copy.icon}
      </div>
      <h2 className="text-2xl font-serif mb-3 text-white">{featureLabel || copy.headline}</h2>
      <ul className="text-sm space-y-2 mb-8 text-left max-w-xs" style={{ color: "rgba(255,255,255,0.55)" }}>
        {copy.bullets.map((b, i) => (
          <li key={i} className="flex items-start gap-2">
            <span style={{ color: "#52B788" }}>✓</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>
      <button
        onClick={onTap}
        className="w-full max-w-xs py-4 rounded-2xl text-base font-bold transition-opacity active:opacity-80"
        style={{ background: "#52B788", color: "#0a1a0a" }}
      >
        Start 7-Day Free Trial
      </button>
      <p className="text-xs mt-3" style={{ color: "rgba(255,255,255,0.3)" }}>$14.99/mo · or $5.99/mo billed annually · Cancel anytime</p>
      {paywallModal}
    </div>
  );
}


