/**
 * PaywallModal — Animated bottom-sheet carousel paywall.
 * Slides up from the bottom when a free user taps a premium feature.
 * Shows feature-specific slides (phone mockup + copy) then a CTA slide.
 * Uses createPortal so it works from any component.
 *
 * Usage:
 *   const [showPaywall, setShowPaywall] = useState(false);
 *   <PaywallModal open={showPaywall} onClose={() => setShowPaywall(false)} feature="barcode" />
 *
 * Or use the hook:
 *   const { paywallNode, openPaywall } = usePaywall("barcode");
 *   // call openPaywall() on any premium tap, render paywallNode in JSX
 */
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { hapticMedium, hapticLight } from "@/lib/haptics";

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

// ─── Slide definitions per feature ───────────────────────────────────────────

interface Slide {
  /** Large emoji/icon shown inside the phone mockup */
  mockupEmoji: string;
  /** Short lines shown inside the phone mockup preview */
  mockupLines?: string[];
  /** Slide headline */
  headline: string;
  /** Slide subtext */
  sub: string;
}

const FEATURE_SLIDES: Record<PaywallFeature, Slide[]> = {
  barcode: [
    {
      mockupEmoji: "📦",
      mockupLines: ["Scan any product"],
      headline: "Scan Any Barcode",
      sub: "Point your camera at any packaged food and Plate pulls the full nutrition label instantly.",
    },
    {
      mockupEmoji: "⚡",
      mockupLines: ["Chicken Breast — 165 cal", "Protein 31g · Carbs 0g · Fat 4g"],
      headline: "Instant Nutrition Facts",
      sub: "No typing, no guessing. Calories, protein, carbs, and fat load in under a second.",
    },
    {
      mockupEmoji: "✅",
      mockupLines: ["Added to Lunch", "31g protein logged"],
      headline: "Log in Seconds",
      sub: "Tap to confirm and it's logged. The fastest way to track packaged foods.",
    },
  ],
  voice_log: [
    {
      mockupEmoji: "🎙️",
      mockupLines: ["Listening…"],
      headline: "Just Say What You Ate",
      sub: "Tap and speak naturally — \"two scrambled eggs and a banana\" — Plate does the rest.",
    },
    {
      mockupEmoji: "🧠",
      mockupLines: ["Eggs × 2 — 140 cal", "Banana — 105 cal"],
      headline: "AI Handles the Math",
      sub: "Our AI parses every food, portion, and preparation detail from your words.",
    },
    {
      mockupEmoji: "✅",
      mockupLines: ["Breakfast logged", "245 cal · 14g protein"],
      headline: "Log Hands-Free",
      sub: "Perfect while cooking, driving, or mid-workout. Never stop to type again.",
    },
  ],
  meal_scan: [
    {
      mockupEmoji: "📸",
      mockupLines: ["Snap your plate"],
      headline: "Snap Your Meal",
      sub: "Take a photo of anything — home cooking, restaurant dish, or a snack — and let AI analyze it.",
    },
    {
      mockupEmoji: "🔍",
      mockupLines: ["Oatmeal · Blueberries", "Coffee · Orange juice"],
      headline: "AI Identifies Everything",
      sub: "Plate's vision AI spots every ingredient and estimates portions automatically.",
    },
    {
      mockupEmoji: "✅",
      mockupLines: ["5 items detected", "Tap to review & log"],
      headline: "Review & Log",
      sub: "Confirm what looks right, remove anything off, and log the whole meal at once.",
    },
  ],
  workout: [
    {
      mockupEmoji: "🏋️",
      mockupLines: ["Push Day — Week 1"],
      headline: "Personalized Workout Plans",
      sub: "Tell Plate your goals and equipment — it builds a science-backed split just for you.",
    },
    {
      mockupEmoji: "📈",
      mockupLines: ["RIR Coach: Push harder"],
      headline: "RIR-Based Coaching",
      sub: "Know exactly how hard to push each set with Reps in Reserve guidance built in.",
    },
    {
      mockupEmoji: "🔄",
      mockupLines: ["Auto-deload in 2 weeks"],
      headline: "Auto-Deload & Progress",
      sub: "Plate auto-deloads every 6 weeks and tracks your streaks, rest, and progress.",
    },
  ],
  meal_plan: [
    {
      mockupEmoji: "📅",
      mockupLines: ["Full 7-Day Plan"],
      headline: "Your Full 7-Day Meal Plan",
      sub: "See all 7 days of meals, not just 2. Every meal matched to your exact macros.",
    },
    {
      mockupEmoji: "🔁",
      mockupLines: ["Regenerate any meal"],
      headline: "Unlimited Regenerations",
      sub: "Don't like a meal? Swap it. Regenerate as many times as you want.",
    },
    {
      mockupEmoji: "🛒",
      mockupLines: ["Grocery list ready"],
      headline: "Auto Grocery List",
      sub: "Every ingredient from your 7-day plan, sorted by store section. Ready to shop.",
    },
  ],
  analytics: [
    {
      mockupEmoji: "📊",
      mockupLines: ["Weekly macro trends"],
      headline: "Weekly Macro Trends",
      sub: "See how consistent you've been across protein, carbs, and fat — week by week.",
    },
    {
      mockupEmoji: "⚖️",
      mockupLines: ["Weight projection"],
      headline: "Weight Trend Projection",
      sub: "Plate charts your progress and projects where you're headed based on real data.",
    },
    {
      mockupEmoji: "🔥",
      mockupLines: ["Streak: 12 days"],
      headline: "Streak & Habit Insights",
      sub: "Track your logging streaks, habit scores, and what's driving your results.",
    },
  ],
  grocery: [
    {
      mockupEmoji: "🛒",
      mockupLines: ["This week's list"],
      headline: "Auto-Generated Grocery List",
      sub: "Every ingredient from your weekly meal plan, deduplicated and sorted by aisle.",
    },
    {
      mockupEmoji: "✅",
      mockupLines: ["Chicken ✓", "Greek yogurt ✓"],
      headline: "Check Off As You Shop",
      sub: "Tap items as you grab them. Plate tracks what you've got and what's left.",
    },
  ],
  glp1: [
    {
      mockupEmoji: "💉",
      mockupLines: ["GLP-1 Mode active"],
      headline: "Tuned for GLP-1 Medications",
      sub: "Macros and portions adjusted for semaglutide and tirzepatide's appetite effects.",
    },
    {
      mockupEmoji: "💪",
      mockupLines: ["Protein priority: High"],
      headline: "Protect Your Lean Mass",
      sub: "Higher protein targets to prevent muscle loss — the biggest risk on GLP-1s.",
    },
  ],
  premium_avatar: [
    {
      mockupEmoji: "⭐",
      mockupLines: ["Premium collection"],
      headline: "Exclusive Avatar Collection",
      sub: "Stand out with rare, limited-edition avatar styles on the leaderboard and in sharing.",
    },
  ],
  general: [
    {
      mockupEmoji: "📸",
      mockupLines: ["Meal Scan · Voice Log", "Barcode Scan"],
      headline: "Log Food 10× Faster",
      sub: "Scan a barcode, snap a photo, or just say what you ate. No more manual entry.",
    },
    {
      mockupEmoji: "📅",
      mockupLines: ["7-Day Meal Plan", "Auto grocery list"],
      headline: "Full 7-Day Meal Plan",
      sub: "See every meal, swap anything you don't like, and get your grocery list built automatically.",
    },
    {
      mockupEmoji: "🏋️",
      mockupLines: ["Push Day — Week 1", "RIR Coach active"],
      headline: "Workout Generator",
      sub: "Science-backed splits with RIR coaching, auto-deload, and full progress tracking.",
    },
    {
      mockupEmoji: "📊",
      mockupLines: ["Weekly macro trends", "Streak: 12 days"],
      headline: "Advanced Analytics",
      sub: "Weekly consistency scores, weight projections, and habit insights in one view.",
    },
  ],
};

// ─── Phone Mockup Component ───────────────────────────────────────────────────

function PhoneMockup({ slide }: { slide: Slide }) {
  return (
    <div
      className="relative mx-auto"
      style={{
        width: 200,
        height: 340,
        background: "#111",
        borderRadius: 32,
        border: "2px solid rgba(82,183,136,0.25)",
        boxShadow: "0 0 40px rgba(82,183,136,0.12), 0 20px 60px rgba(0,0,0,0.6)",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Phone notch */}
      <div style={{ height: 28, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <div style={{ width: 60, height: 10, background: "#222", borderRadius: 8 }} />
      </div>

      {/* Plate header bar */}
      <div
        style={{
          height: 36,
          background: "#0a0a0a",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderBottom: "1px solid rgba(82,183,136,0.15)",
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 700, color: "#52B788", letterSpacing: 1.5, textTransform: "uppercase" }}>
          Plate
        </span>
      </div>

      {/* Content area */}
      <div
        style={{
          flex: 1,
          background: "linear-gradient(160deg, #0d1a12 0%, #0a0a0a 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "12px 10px",
          gap: 10,
        }}
      >
        {/* Big emoji */}
        <div style={{ fontSize: 52, lineHeight: 1, filter: "drop-shadow(0 4px 12px rgba(82,183,136,0.3))" }}>
          {slide.mockupEmoji}
        </div>

        {/* Preview lines */}
        {slide.mockupLines && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4, width: "100%" }}>
            {slide.mockupLines.map((line, i) => (
              <div
                key={i}
                style={{
                  background: i === 0 ? "rgba(82,183,136,0.15)" : "rgba(255,255,255,0.05)",
                  borderRadius: 8,
                  padding: "5px 8px",
                  fontSize: 9,
                  color: i === 0 ? "#52B788" : "rgba(255,255,255,0.5)",
                  fontWeight: i === 0 ? 600 : 400,
                  textAlign: "center",
                  border: i === 0 ? "1px solid rgba(82,183,136,0.25)" : "1px solid transparent",
                }}
              >
                {line}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div
        style={{
          height: 40,
          background: "#0a0a0a",
          borderTop: "1px solid rgba(82,183,136,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            background: "#52B788",
            borderRadius: 10,
            padding: "5px 16px",
            fontSize: 9,
            fontWeight: 700,
            color: "#0a1a0a",
          }}
        >
          Premium
        </div>
      </div>

      {/* Home indicator */}
      <div style={{ height: 20, display: "flex", alignItems: "center", justifyContent: "center", background: "#0a0a0a", flexShrink: 0 }}>
        <div style={{ width: 40, height: 3, background: "rgba(255,255,255,0.2)", borderRadius: 2 }} />
      </div>
    </div>
  );
}

// ─── Main PaywallModal ────────────────────────────────────────────────────────

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
  feature?: PaywallFeature;
}

export function PaywallModal({ open, onClose, feature = "general" }: PaywallModalProps) {
  const navigate = useNavigate();
  const slides = FEATURE_SLIDES[feature] ?? FEATURE_SLIDES.general;
  const [currentSlide, setCurrentSlide] = useState(0);
  const [visible, setVisible] = useState(false);
  const [_animating, _setAnimating] = useState(false);
  const touchStartX = useRef<number | null>(null);

  // Animate in / out
  useEffect(() => {
    if (open) {
      setCurrentSlide(0);
      // Small delay so the CSS transition fires
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
    } else {
      setVisible(false);
    }
  }, [open]);

  if (!open && !visible) return null;

  const isLast = currentSlide === slides.length - 1;
  const slide = slides[currentSlide];

  const goNext = () => {
    hapticLight();
    if (isLast) {
      hapticMedium();
      onClose();
      navigate("/onboarding/upgrade");
    } else {
      setCurrentSlide((s) => s + 1);
    }
  };

  const goPrev = () => {
    if (currentSlide > 0) {
      hapticLight();
      setCurrentSlide((s) => s - 1);
    }
  };

  const handleBackdropClick = () => {
    setVisible(false);
    setTimeout(onClose, 350);
  };

  // Touch swipe support
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (delta < -40 && !isLast) goNext();
    if (delta > 40 && currentSlide > 0) goPrev();
  };

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex flex-col justify-end"
      style={{
        background: visible ? "rgba(0,0,0,0.75)" : "rgba(0,0,0,0)",
        backdropFilter: visible ? "blur(6px)" : "none",
        transition: "background 0.35s ease, backdrop-filter 0.35s ease",
      }}
      onClick={handleBackdropClick}
    >
      {/* Bottom sheet */}
      <div
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          background: "#0a0a0a",
          borderRadius: "28px 28px 0 0",
          border: "1px solid rgba(82,183,136,0.18)",
          borderBottom: "none",
          boxShadow: "0 -8px 60px rgba(82,183,136,0.08), 0 -2px 20px rgba(0,0,0,0.6)",
          transform: visible ? "translateY(0)" : "translateY(100%)",
          transition: "transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)",
          paddingBottom: "env(safe-area-inset-bottom, 24px)",
          maxHeight: "92vh",
          overflowY: "auto",
        }}
      >
        {/* Handle + close row */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          {/* Drag handle */}
          <div style={{ width: 40, height: 4, background: "rgba(255,255,255,0.12)", borderRadius: 2 }} className="mx-auto absolute left-1/2 -translate-x-1/2 top-3" />

          {/* Close */}
          <div style={{ width: 28 }} />
          <div />
          <button
            onClick={() => { setVisible(false); setTimeout(onClose, 350); }}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.08)" }}
          >
            <X className="w-4 h-4 text-white/60" />
          </button>
        </div>

        {/* Phone mockup */}
        <div className="px-6 pt-2 pb-4">
          <PhoneMockup slide={slide} />
        </div>

        {/* Pagination dots */}
        <div className="flex items-center justify-center gap-2 mb-5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => { hapticLight(); setCurrentSlide(i); }}
              style={{
                width: i === currentSlide ? 20 : 6,
                height: 6,
                borderRadius: 3,
                background: i === currentSlide ? "#52B788" : "rgba(255,255,255,0.2)",
                transition: "all 0.3s ease",
                border: "none",
                padding: 0,
                cursor: "pointer",
              }}
            />
          ))}
        </div>

        {/* Copy */}
        <div className="px-6 pb-2">
          <h2
            className="text-[26px] font-bold text-white mb-2 leading-tight"
            style={{ fontFamily: "'Georgia', serif" }}
          >
            {slide.headline}
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
            {slide.sub}
          </p>
        </div>

        {/* CTA */}
        <div className="px-6 pb-2 pt-4">
          {isLast ? (
            <>
              {/* Trial badge */}
              <div
                className="flex items-center justify-center gap-2 py-2 rounded-full mb-4 text-xs font-semibold tracking-wide"
                style={{
                  background: "rgba(82,183,136,0.1)",
                  border: "1px solid rgba(82,183,136,0.3)",
                  color: "#52B788",
                }}
              >
                <span>🎁</span>
                <span>7 Days Free — No Charge Today</span>
              </div>

              <button
                onClick={goNext}
                className="w-full py-4 rounded-2xl text-base font-bold transition-opacity active:opacity-80"
                style={{ background: "#52B788", color: "#0a1a0a" }}
              >
                Start My Free Trial
              </button>
              <p className="text-center text-xs mt-3" style={{ color: "rgba(255,255,255,0.3)" }}>
                Then $14.99/mo · or $5.99/mo billed annually · Cancel anytime
              </p>
            </>
          ) : (
            <button
              onClick={goNext}
              className="w-full py-4 rounded-2xl text-base font-bold transition-opacity active:opacity-80"
              style={{ background: "#52B788", color: "#0a1a0a" }}
            >
              Next
            </button>
          )}
        </div>

        {/* Bottom padding for safe area */}
        <div style={{ height: 8 }} />
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

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
