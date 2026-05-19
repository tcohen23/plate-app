/**
 * PaywallModal — Full-screen overlay paywall that fires when a free user taps
 * a premium-only feature. Uses createPortal so it works from any component.
 *
 * Usage:
 *   const [showPaywall, setShowPaywall] = useState(false);
 *   <PaywallModal open={showPaywall} onClose={() => setShowPaywall(false)} feature="workout" />
 *
 * Or use the hook:
 *   const { paywallNode, openPaywall } = usePaywall();
 *   // call openPaywall() on any premium tap, render paywallNode in JSX
 */
import { useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { hapticMedium } from "@/lib/haptics";

export type PaywallFeature =
  | "workout"
  | "meal_scan"
  | "voice_log"
  | "barcode"
  | "meal_plan"
  | "analytics"
  | "grocery"
  | "glp1"
  | "premium_avatar"
  | "general";

const FEATURE_COPY: Record<
  PaywallFeature,
  { headline: string; sub: string; bullets: string[] }
> = {
  workout: {
    headline: "Unlock Workout Plans",
    sub: "Science-backed training, built for your goals",
    bullets: [
      "Personalized push/pull/legs or full-body splits",
      "RIR-based coaching — know exactly how hard to push",
      "Auto-deload every 6 weeks, rest timer, streak tracking",
      "All workout types: gym, home, calisthenics",
    ],
  },
  meal_scan: {
    headline: "Unlock Meal Photo Scan",
    sub: "Log any meal by snapping a photo",
    bullets: [
      "AI identifies every ingredient and portion automatically",
      "Accurate macro + calorie breakdown in seconds",
      "No more manual logging for complex meals",
      "Works on restaurant dishes, home cooking, and more",
    ],
  },
  voice_log: {
    headline: "Unlock Voice Logging",
    sub: "Log meals hands-free with your voice",
    bullets: [
      "Just say what you ate — AI handles the rest",
      "Works while cooking, driving, or at the gym",
      "Instant macro calculation from natural speech",
      "Faster than typing or searching",
    ],
  },
  barcode: {
    headline: "Unlock Barcode Scan",
    sub: "Instant logging by scanning product barcodes",
    bullets: [
      "Scan any packaged food label in seconds",
      "Pulls nutrition facts from a massive product database",
      "No typing, no searching — just scan and log",
      "Works with groceries, supplements, snacks, and more",
    ],
  },
  meal_plan: {
    headline: "Unlock Your Full 7-Day Meal Plan",
    sub: "See all 7 days — not just 2",
    bullets: [
      "Full week of meals matched to your exact macros",
      "Unlimited plan regenerations",
      "Swap out any meal you don't like",
      "Auto-generates your grocery list",
    ],
  },
  analytics: {
    headline: "Unlock Advanced Analytics",
    sub: "Understand your progress with weekly trends",
    bullets: [
      "Weekly macro consistency scores",
      "Weight trend charts with projection",
      "Streak analysis and habit insights",
      "Export your data anytime",
    ],
  },
  grocery: {
    headline: "Unlock Grocery List",
    sub: "Auto-generated from your weekly meal plan",
    bullets: [
      "Full week of ingredients, deduplicated and sorted by aisle",
      "Check off items as you shop",
      "Syncs every time your plan changes",
      "Never forget an ingredient again",
    ],
  },
  glp1: {
    headline: "Unlock GLP-1 Support",
    sub: "Nutrition tuned for semaglutide & tirzepatide",
    bullets: [
      "Macro targets adjusted for GLP-1 appetite changes",
      "Higher protein to protect lean muscle mass",
      "Smaller portions, more frequent meals",
      "Built on clinical semaglutide/tirzepatide data",
    ],
  },
  premium_avatar: {
    headline: "Unlock Premium Avatars",
    sub: "Stand out with exclusive avatar styles",
    bullets: [
      "Full access to the premium avatar collection",
      "Rare and limited-edition picks",
      "Personalize your profile and leaderboard presence",
    ],
  },
  general: {
    headline: "Go Premium for Full Access",
    sub: "Unlock everything Plate has to offer",
    bullets: [
      "Meal Photo Scan, Voice Logging, Barcode Scan",
      "Full 7-day meal plan with unlimited regenerations",
      "Workout generator with RIR coaching",
      "Advanced analytics, Grocery List, GLP-1 support",
    ],
  },
};

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
  feature?: PaywallFeature;
}

export function PaywallModal({ open, onClose, feature = "general" }: PaywallModalProps) {
  const navigate = useNavigate();
  const copy = FEATURE_COPY[feature];

  if (!open) return null;

  const handleUpgrade = () => {
    hapticMedium();
    onClose();
    navigate("/onboarding/upgrade");
  };

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex flex-col"
      style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
    >
      {/* Close button */}
      <div className="flex justify-end p-4 pt-safe">
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.1)" }}
        >
          <X className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-safe text-center">
        {/* Lock icon */}
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
          style={{ background: "var(--plate-green-deep)", border: "1px solid rgba(82,183,136,0.3)" }}
        >
          <img
            src="/plate-logo.jpg"
            alt="Plate"
            className="w-14 h-14 rounded-2xl object-contain"
          />
        </div>

        <h2 className="text-2xl font-serif text-white mb-2">{copy.headline}</h2>
        <p className="text-sm mb-8" style={{ color: "rgba(255,255,255,0.5)" }}>{copy.sub}</p>

        {/* Bullets */}
        <ul className="text-sm text-left space-y-3 mb-10 w-full max-w-xs">
          {copy.bullets.map((b, i) => (
            <li key={i} className="flex items-start gap-3">
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold"
                style={{ background: "var(--plate-green-deep)", color: "var(--plate-green-accent)" }}
              >
                ✓
              </span>
              <span style={{ color: "rgba(255,255,255,0.8)" }}>{b}</span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <button
          onClick={handleUpgrade}
          className="w-full max-w-xs py-4 rounded-2xl text-base font-bold transition-opacity active:opacity-80"
          style={{ background: "var(--plate-green-accent)", color: "#0a1a0a" }}
        >
          Start 7-Day Free Trial
        </button>
        <p className="text-xs mt-3" style={{ color: "rgba(255,255,255,0.35)" }}>
          $14.99/mo · or $5.99/mo billed annually · Cancel anytime
        </p>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

/** Hook for inline paywall usage */
export function usePaywall(feature: PaywallFeature = "general") {
  const [open, setOpen] = useState(false);

  const paywallNode = (
    <PaywallModal open={open} onClose={() => setOpen(false)} feature={feature} />
  );

  return {
    paywallNode,
    openPaywall: () => { hapticMedium(); setOpen(true); },
    closePaywall: () => setOpen(false),
  };
}
