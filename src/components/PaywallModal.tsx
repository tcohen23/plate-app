/**
 * PaywallModal — Paywall that adapts based on feature type.
 *
 * SCANNER features (barcode, voice_log, meal_scan):
 *   → Animated bottom-sheet carousel. Slides up from bottom, phone mockup
 *     preview, swipeable slides per feature, CTA on the last slide.
 *
 * ALL OTHER features (workout, meal_plan, analytics, grocery, glp1, etc.):
 *   → Existing full-screen animated overlay (blurred backdrop, logo, bullets,
 *     trial CTA). Now with a slide-up entrance animation.
 *
 * Usage:
 *   const { paywallNode, openPaywall } = usePaywall("barcode");
 *   // call openPaywall() on premium tap, render paywallNode in JSX
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

// ─── Scanner features → carousel bottom-sheet ────────────────────────────────

const SCANNER_FEATURES = new Set<PaywallFeature>(["barcode", "voice_log", "meal_scan"]);

// ─── Carousel slide definitions (scanner features only) ──────────────────────

interface Slide {
  mockupEmoji: string;
  mockupLines?: string[];
  headline: string;
  sub: string;
}

const SCANNER_SLIDES: Record<string, Slide[]> = {
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
};

// ─── Full-screen paywall copy (all non-scanner features) ─────────────────────

const FULLSCREEN_COPY: Record<
  string,
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

// ─── Public interface ─────────────────────────────────────────────────────────

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
  feature?: PaywallFeature;
}

/** Routes to the correct paywall style based on feature type */
export function PaywallModal({ open, onClose, feature = "general" }: PaywallModalProps) {
  if (SCANNER_FEATURES.has(feature)) {
    return <ScannerCarouselPaywall open={open} onClose={onClose} feature={feature} />;
  }
  return <FullScreenPaywall open={open} onClose={onClose} feature={feature} />;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCANNER CAROUSEL — barcode / voice_log / meal_scan
// ═══════════════════════════════════════════════════════════════════════════════

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
      {/* Notch */}
      <div style={{ height: 28, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <div style={{ width: 60, height: 10, background: "#222", borderRadius: 8 }} />
      </div>

      {/* Plate header */}
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

      {/* Content */}
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
        <div style={{ fontSize: 52, lineHeight: 1, filter: "drop-shadow(0 4px 12px rgba(82,183,136,0.3))" }}>
          {slide.mockupEmoji}
        </div>
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
        <div style={{ background: "#52B788", borderRadius: 10, padding: "5px 16px", fontSize: 9, fontWeight: 700, color: "#0a1a0a" }}>
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

function ScannerCarouselPaywall({ open, onClose, feature }: PaywallModalProps) {
  const navigate = useNavigate();
  const slides = SCANNER_SLIDES[feature!] ?? SCANNER_SLIDES.barcode;
  const [currentSlide, setCurrentSlide] = useState(0);
  const [visible, setVisible] = useState(false);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    if (open) {
      setCurrentSlide(0);
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
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

  const handleBackdropClick = () => {
    setVisible(false);
    setTimeout(onClose, 350);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (delta < -40 && !isLast) goNext();
    if (delta > 40 && currentSlide > 0) { hapticLight(); setCurrentSlide((s) => s - 1); }
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
        {/* Handle + close */}
        <div className="relative flex items-center justify-between px-5 pt-4 pb-2">
          <div style={{ width: 40, height: 4, background: "rgba(255,255,255,0.12)", borderRadius: 2 }} className="absolute left-1/2 -translate-x-1/2 top-3" />
          <div style={{ width: 28 }} />
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
          <h2 className="text-[26px] font-bold text-white mb-2 leading-tight" style={{ fontFamily: "'Georgia', serif" }}>
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
              <div
                className="flex items-center justify-center gap-2 py-2 rounded-full mb-4 text-xs font-semibold tracking-wide"
                style={{ background: "rgba(82,183,136,0.1)", border: "1px solid rgba(82,183,136,0.3)", color: "#52B788" }}
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

        <div style={{ height: 8 }} />
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

// ═══════════════════════════════════════════════════════════════════════════════
// FULL-SCREEN ANIMATED OVERLAY — all non-scanner features
// ═══════════════════════════════════════════════════════════════════════════════

function FullScreenPaywall({ open, onClose, feature }: PaywallModalProps) {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const copy = FULLSCREEN_COPY[feature!] ?? FULLSCREEN_COPY.general;

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    } else {
      setVisible(false);
    }
  }, [open]);

  if (!open && !visible) return null;

  const handleUpgrade = () => {
    hapticMedium();
    onClose();
    navigate("/onboarding/upgrade");
  };

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex flex-col"
      style={{
        background: visible ? "rgba(0,0,0,0.88)" : "rgba(0,0,0,0)",
        backdropFilter: visible ? "blur(8px)" : "none",
        transition: "background 0.35s ease, backdrop-filter 0.35s ease",
      }}
    >
      {/* Content card — slides up */}
      <div
        className="flex flex-col flex-1"
        style={{
          transform: visible ? "translateY(0)" : "translateY(40px)",
          opacity: visible ? 1 : 0,
          transition: "transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s ease",
        }}
      >
        {/* Close */}
        <div className="flex justify-end p-4" style={{ paddingTop: "env(safe-area-inset-top, 16px)" }}>
          <button
            onClick={() => { setVisible(false); setTimeout(onClose, 350); }}
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.1)" }}
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center" style={{ paddingBottom: "env(safe-area-inset-bottom, 24px)" }}>
          <img
            src="/plate-logo.jpg"
            alt="Plate"
            className="mb-6 rounded-2xl object-contain"
            style={{ width: 80, height: 80 }}
          />
          <h2 className="text-2xl font-serif text-white mb-2">{copy.headline}</h2>
          <p className="text-sm mb-8" style={{ color: "rgba(255,255,255,0.5)" }}>{copy.sub}</p>

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

          <div
            className="flex items-center gap-2 px-4 py-2 rounded-full mb-4 text-xs font-semibold tracking-wide uppercase"
            style={{ background: "rgba(82,183,136,0.15)", border: "1px solid rgba(82,183,136,0.35)", color: "var(--plate-green-accent)" }}
          >
            <span>🎁</span>
            <span>7 Days Free — No Charge Today</span>
          </div>

          <button
            onClick={handleUpgrade}
            className="w-full max-w-xs py-4 rounded-2xl text-base font-bold transition-opacity active:opacity-80"
            style={{ background: "var(--plate-green-accent)", color: "#0a1a0a" }}
          >
            Start My Free Trial
          </button>
          <p className="text-xs mt-3" style={{ color: "rgba(255,255,255,0.35)" }}>
            Then $14.99/mo · or $5.99/mo billed annually · Cancel anytime
          </p>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════════

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
