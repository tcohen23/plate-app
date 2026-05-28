/**
 * PaywallModal — Animated paywall adapting by feature type.
 *
 * SCANNER features (barcode, voice_log, meal_scan):
 *   → Animated bottom-sheet carousel. Phone mockup with live scan line,
 *     swipeable slides, spring transitions, glow effects.
 *
 * ALL OTHER features:
 *   → Full-screen cinematic upsell. Floating orbs background, pulsing logo,
 *     staggered bullet reveal, shimmer CTA.
 */
import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
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

const SCANNER_FEATURES = new Set<PaywallFeature>(["barcode", "voice_log", "meal_scan"]);

// ─── Carousel slide definitions ───────────────────────────────────────────────

interface Slide {
  mockupEmoji: string;
  mockupLines?: string[];
  headline: string;
  sub: string;
  accentColor?: string;
}

const SCANNER_SLIDES: Record<string, Slide[]> = {
  barcode: [
    {
      mockupEmoji: "📦",
      mockupLines: ["Scan any product"],
      headline: "Scan Any Barcode",
      sub: "Point your camera at any packaged food — Plate pulls the full nutrition label instantly.",
      accentColor: "#60a5fa",
    },
    {
      mockupEmoji: "⚡",
      mockupLines: ["Chicken Breast — 165 cal", "Protein 31g · Carbs 0g · Fat 4g"],
      headline: "Instant Nutrition Facts",
      sub: "No typing, no guessing. Calories, protein, carbs, and fat load in under a second.",
      accentColor: "#f59e0b",
    },
    {
      mockupEmoji: "✅",
      mockupLines: ["Added to Lunch", "31g protein logged"],
      headline: "Log in Seconds",
      sub: "Tap to confirm and it's logged. The fastest way to track packaged foods.",
      accentColor: "#52B788",
    },
  ],
  voice_log: [
    {
      mockupEmoji: "🎙️",
      mockupLines: ["Listening…"],
      headline: "Just Say What You Ate",
      sub: "Tap and speak naturally — \"two scrambled eggs and a banana\" — Plate does the rest.",
      accentColor: "#a78bfa",
    },
    {
      mockupEmoji: "🧠",
      mockupLines: ["Eggs × 2 — 140 cal", "Banana — 105 cal"],
      headline: "AI Handles the Math",
      sub: "Our AI parses every food, portion, and preparation detail from your words.",
      accentColor: "#60a5fa",
    },
    {
      mockupEmoji: "✅",
      mockupLines: ["Breakfast logged", "245 cal · 14g protein"],
      headline: "Log Hands-Free",
      sub: "Perfect while cooking, driving, or mid-workout. Never stop to type again.",
      accentColor: "#52B788",
    },
  ],
  meal_scan: [
    {
      mockupEmoji: "📸",
      mockupLines: ["Snap your plate"],
      headline: "Snap Your Meal",
      sub: "Take a photo of anything — home cooking, restaurant dish, or a snack — and let AI analyze it.",
      accentColor: "#f87171",
    },
    {
      mockupEmoji: "🔍",
      mockupLines: ["Oatmeal · Blueberries", "Coffee · Orange juice"],
      headline: "AI Identifies Everything",
      sub: "Plate's vision AI spots every ingredient and estimates portions automatically.",
      accentColor: "#60a5fa",
    },
    {
      mockupEmoji: "✅",
      mockupLines: ["5 items detected", "Tap to review & log"],
      headline: "Review & Log",
      sub: "Confirm what looks right, remove anything off, and log the whole meal at once.",
      accentColor: "#52B788",
    },
  ],
};

// ─── Full-screen paywall copy ─────────────────────────────────────────────────

const FULLSCREEN_COPY: Record<
  string,
  { icon: string; headline: string; sub: string; bullets: string[] }
> = {
  workout: {
    icon: "💪",
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
    icon: "🍽️",
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
    icon: "📊",
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
    icon: "🛒",
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
    icon: "💊",
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
    icon: "🎭",
    headline: "Unlock Premium Avatars",
    sub: "Stand out with exclusive avatar styles",
    bullets: [
      "Full access to the premium avatar collection",
      "Rare and limited-edition picks",
      "Personalize your profile and leaderboard presence",
    ],
  },
  general: {
    icon: "👑",
    headline: "Go Premium for Full Access",
    sub: "Unlock everything Plate has to offer",
    bullets: [
      "Meal Photo Scan, Voice Logging, Barcode Scan",
      "Full 7-day meal plan with unlimited regenerations",
      "Personalized workout plans with RIR coaching",
      "Advanced analytics, Grocery List & more",
    ],
  },
};

// ─── Public interface ─────────────────────────────────────────────────────────

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
  feature?: PaywallFeature;
}

export function PaywallModal({ open, onClose, feature = "general" }: PaywallModalProps) {
  if (SCANNER_FEATURES.has(feature)) {
    return <ScannerCarouselPaywall open={open} onClose={onClose} feature={feature} />;
  }
  return <FullScreenPaywall open={open} onClose={onClose} feature={feature} />;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED: Animated orb background
// ═══════════════════════════════════════════════════════════════════════════════

function OrbBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
      {/* Beam sweep */}
      <div
        className="absolute animate-upsell-beam"
        style={{
          top: "-20%",
          left: "-60%",
          width: "40%",
          height: "160%",
          background: "linear-gradient(90deg, transparent, rgba(82,183,136,0.06), transparent)",
          transformOrigin: "center",
        }}
      />
      {/* Orb A — top right */}
      <div
        className="absolute animate-upsell-orb-a"
        style={{
          top: "-80px",
          right: "-60px",
          width: 260,
          height: 260,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(82,183,136,0.22) 0%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />
      {/* Orb B — bottom left */}
      <div
        className="absolute animate-upsell-orb-b"
        style={{
          bottom: "-60px",
          left: "-80px",
          width: 300,
          height: 300,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(27,67,50,0.6) 0%, transparent 70%)",
          filter: "blur(50px)",
        }}
      />
      {/* Orb C — mid center */}
      <div
        className="absolute"
        style={{
          top: "35%",
          left: "30%",
          width: 180,
          height: 180,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(82,183,136,0.08) 0%, transparent 70%)",
          filter: "blur(30px)",
          animation: "upsell-orb-drift 13s ease-in-out 2s infinite",
        }}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// SCANNER CAROUSEL — barcode / voice_log / meal_scan
// ═══════════════════════════════════════════════════════════════════════════════

function AnimatedPhoneMockup({ slide }: { slide: Slide }) {
  const accent = slide.accentColor ?? "#52B788";
  return (
    <div
      className="relative mx-auto"
      style={{
        width: 190,
        height: 330,
        background: "#080e0b",
        borderRadius: 32,
        border: `1.5px solid ${accent}40`,
        boxShadow: `0 0 0 1px ${accent}18, 0 0 50px ${accent}22, 0 20px 60px rgba(0,0,0,0.7)`,
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Pulsing glow ring around phone */}
      <div
        className="absolute inset-0 rounded-[30px] pointer-events-none"
        style={{
          boxShadow: `0 0 0 1px ${accent}30, 0 0 20px 2px ${accent}18`,
          animation: "upsell-pulse-glow 2.5s ease-in-out infinite",
        }}
      />

      {/* Notch */}
      <div style={{ height: 26, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <div style={{ width: 56, height: 9, background: "#111", borderRadius: 8 }} />
      </div>

      {/* Header bar */}
      <div
        style={{
          height: 34,
          background: "#050d08",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderBottom: `1px solid ${accent}18`,
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 10, fontWeight: 700, color: "#52B788", letterSpacing: 1.5, textTransform: "uppercase" }}>
          Plate
        </span>
      </div>

      {/* Content area with scan line */}
      <div
        style={{
          flex: 1,
          background: "linear-gradient(160deg, #0a1a0e 0%, #060a07 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "10px 8px",
          gap: 8,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Animated scan line */}
        <div
          className="absolute left-0 right-0 animate-scan-line"
          style={{
            height: 2,
            background: `linear-gradient(90deg, transparent, ${accent}, transparent)`,
            boxShadow: `0 0 8px 2px ${accent}`,
            zIndex: 2,
          }}
        />

        {/* Corner scan brackets */}
        {[
          { top: 10, left: 10 }, { top: 10, right: 10 },
          { bottom: 10, left: 10 }, { bottom: 10, right: 10 },
        ].map((pos, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              width: 14,
              height: 14,
              borderColor: `${accent}aa`,
              borderStyle: "solid",
              borderWidth: 0,
              borderTopWidth: pos.top !== undefined ? 2 : 0,
              borderBottomWidth: pos.bottom !== undefined ? 2 : 0,
              borderLeftWidth: pos.left !== undefined ? 2 : 0,
              borderRightWidth: pos.right !== undefined ? 2 : 0,
              borderRadius: i === 0 ? "4px 0 0 0" : i === 1 ? "0 4px 0 0" : i === 2 ? "0 0 0 4px" : "0 0 4px 0",
              ...pos,
            }}
          />
        ))}

        <div style={{ fontSize: 46, lineHeight: 1, filter: `drop-shadow(0 4px 14px ${accent}55)`, zIndex: 1 }}>
          {slide.mockupEmoji}
        </div>
        {slide.mockupLines && (
          <div style={{ display: "flex", flexDirection: "column", gap: 4, width: "100%", zIndex: 1 }}>
            {slide.mockupLines.map((line, i) => (
              <div
                key={i}
                style={{
                  background: i === 0 ? `${accent}22` : "rgba(255,255,255,0.04)",
                  borderRadius: 7,
                  padding: "4px 7px",
                  fontSize: 8.5,
                  color: i === 0 ? accent : "rgba(255,255,255,0.45)",
                  fontWeight: i === 0 ? 600 : 400,
                  textAlign: "center",
                  border: i === 0 ? `1px solid ${accent}30` : "1px solid transparent",
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
          height: 38,
          background: "#050d08",
          borderTop: `1px solid ${accent}15`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <div style={{ background: "#52B788", borderRadius: 9, padding: "4px 14px", fontSize: 8.5, fontWeight: 700, color: "#0a1a0a" }}>
          Premium
        </div>
      </div>

      {/* Home indicator */}
      <div style={{ height: 18, display: "flex", alignItems: "center", justifyContent: "center", background: "#050d08", flexShrink: 0 }}>
        <div style={{ width: 36, height: 3, background: "rgba(255,255,255,0.15)", borderRadius: 2 }} />
      </div>
    </div>
  );
}

function ScannerCarouselPaywall({ open, onClose, feature }: PaywallModalProps) {
  const navigate = useNavigate();
  const slides = SCANNER_SLIDES[feature!] ?? SCANNER_SLIDES.barcode;
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(1);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    if (open) setCurrentSlide(0);
  }, [open]);

  if (!open) return null;

  const isLast = currentSlide === slides.length - 1;
  const slide = slides[currentSlide];
  const accent = slide.accentColor ?? "#52B788";

  const goNext = () => {
    hapticLight();
    if (isLast) {
      hapticMedium();
      onClose();
      navigate("/onboarding/upgrade");
    } else {
      setDirection(1);
      setCurrentSlide((s) => s + 1);
    }
  };

  const goPrev = () => {
    if (currentSlide > 0) {
      hapticLight();
      setDirection(-1);
      setCurrentSlide((s) => s - 1);
    }
  };

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

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? 60 : -60, opacity: 0, scale: 0.96 }),
    center: { x: 0, opacity: 1, scale: 1 },
    exit: (d: number) => ({ x: d > 0 ? -60 : 60, opacity: 0, scale: 0.96 }),
  };

  const modal = (
    <motion.div
      className="fixed inset-0 z-[9999] flex flex-col justify-end"
      initial={{ backgroundColor: "rgba(0,0,0,0)" }}
      animate={{ backgroundColor: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}
      exit={{ backgroundColor: "rgba(0,0,0,0)" }}
      transition={{ duration: 0.3 }}
      onClick={() => { hapticLight(); onClose(); }}
    >
      <motion.div
        onClick={(e) => e.stopPropagation()}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 300 }}
        style={{
          background: "linear-gradient(160deg, #0a1209 0%, #060807 100%)",
          borderRadius: "28px 28px 0 0",
          border: "1px solid rgba(82,183,136,0.18)",
          borderBottom: "none",
          boxShadow: "0 -8px 60px rgba(82,183,136,0.1), 0 -2px 20px rgba(0,0,0,0.7)",
          paddingBottom: "env(safe-area-inset-bottom, 24px)",
          maxHeight: "92vh",
          overflowY: "auto",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background orbs */}
        <OrbBackground />

        {/* Handle + close */}
        <div className="relative flex items-center justify-between px-5 pt-4 pb-2" style={{ zIndex: 1 }}>
          <div style={{ width: 40, height: 4, background: "rgba(255,255,255,0.12)", borderRadius: 2 }} className="absolute left-1/2 -translate-x-1/2 top-3" />
          <div style={{ width: 28 }} />
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => { hapticLight(); onClose(); }}
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.08)" }}
          >
            <X className="w-4 h-4 text-white/60" />
          </motion.button>
        </div>

        {/* Animated phone mockup */}
        <div className="px-6 pt-2 pb-4" style={{ zIndex: 1, position: "relative" }}>
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentSlide}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "spring", damping: 28, stiffness: 280 }}
            >
              <AnimatedPhoneMockup slide={slide} />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Pagination dots */}
        <div className="flex items-center justify-center gap-2 mb-5" style={{ zIndex: 1, position: "relative" }}>
          {slides.map((_s, i) => (
            <motion.button
              key={i}
              animate={{
                width: i === currentSlide ? 22 : 6,
                backgroundColor: i === currentSlide ? accent : "rgba(255,255,255,0.2)",
              }}
              transition={{ type: "spring", damping: 20, stiffness: 300 }}
              style={{ height: 6, borderRadius: 3, border: "none", padding: 0, cursor: "pointer" }}
              onClick={() => { hapticLight(); setDirection(i > currentSlide ? 1 : -1); setCurrentSlide(i); }}
            />
          ))}
        </div>

        {/* Copy — animates on slide change */}
        <div className="px-6 pb-2" style={{ zIndex: 1, position: "relative" }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={currentSlide + "-copy"}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <h2 className="text-[26px] font-bold text-white mb-2 leading-tight" style={{ fontFamily: "'Georgia', serif" }}>
                {slide.headline}
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
                {slide.sub}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* CTA */}
        <div className="px-6 pb-2 pt-4" style={{ zIndex: 1, position: "relative" }}>
          <AnimatePresence mode="wait">
            {isLast ? (
              <motion.div key="last" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                <motion.div
                  className="flex items-center justify-center gap-2 py-2 rounded-full mb-4 text-xs font-semibold tracking-wide"
                  style={{ background: "rgba(82,183,136,0.12)", border: "1px solid rgba(82,183,136,0.3)", color: "#52B788" }}
                  animate={{ scale: [1, 1.015, 1] }}
                  transition={{ repeat: Infinity, duration: 2.5 }}
                >
                  <span>🎁</span>
                  <span>7 Days Free — No Charge Today</span>
                </motion.div>
                <motion.button
                  onClick={goNext}
                  whileTap={{ scale: 0.97 }}
                  className="w-full py-4 rounded-2xl text-base font-bold upsell-shimmer-btn"
                  style={{ color: "#0a1a0a" }}
                >
                  Start My Free Trial
                </motion.button>
                <p className="text-center text-xs mt-3" style={{ color: "rgba(255,255,255,0.28)" }}>
                  Then $14.99/mo · or $5.99/mo billed annually · Cancel anytime
                </p>
              </motion.div>
            ) : (
              <motion.button
                key="next"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={goNext}
                whileTap={{ scale: 0.97 }}
                className="w-full py-4 rounded-2xl text-base font-bold transition-opacity"
                style={{ background: accent, color: "#0a1a0a" }}
              >
                Next
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        <div style={{ height: 8 }} />
      </motion.div>
    </motion.div>
  );

  return createPortal(
    <AnimatePresence>{open && modal}</AnimatePresence>,
    document.body
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FULL-SCREEN ANIMATED OVERLAY — all non-scanner features
// ═══════════════════════════════════════════════════════════════════════════════

function FullScreenPaywall({ open, onClose, feature }: PaywallModalProps) {
  const navigate = useNavigate();
  const copy = FULLSCREEN_COPY[feature!] ?? FULLSCREEN_COPY.general;

  const handleUpgrade = () => {
    hapticMedium();
    onClose();
    navigate("/onboarding/upgrade");
  };

  const bulletVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.1, delayChildren: 0.45 } },
  };
  const bulletItem = {
    hidden: { opacity: 0, x: -18 },
    visible: { opacity: 1, x: 0, transition: { type: "spring" as const, damping: 24, stiffness: 260 } },
  };

  const modal = (
    <motion.div
      className="fixed inset-0 z-[9999] flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      style={{
        background: "rgba(0,0,0,0.92)",
        backdropFilter: "blur(10px)",
      }}
    >
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <OrbBackground />
      </div>

      {/* Content */}
      <motion.div
        className="flex flex-col flex-1 relative"
        style={{ zIndex: 1 }}
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        transition={{ type: "spring", damping: 28, stiffness: 280, delay: 0.05 }}
      >
        {/* Close */}
        <div className="flex justify-end p-4" style={{ paddingTop: "max(env(safe-area-inset-top, 16px), 16px)" }}>
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => { hapticLight(); onClose(); }}
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.08)" }}
          >
            <X className="w-5 h-5 text-white" />
          </motion.button>
        </div>

        {/* Body */}
        <div
          className="flex-1 flex flex-col items-center justify-center px-6 text-center overflow-y-auto"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 24px)" }}
        >
          {/* Logo with pulsing rings */}
          <div className="relative mb-7 flex items-center justify-center">
            {/* Expanding rings */}
            <div
              className="absolute animate-upsell-ring"
              style={{
                width: 100, height: 100,
                borderRadius: "50%",
                border: "1.5px solid rgba(82,183,136,0.35)",
              }}
            />
            <div
              className="absolute animate-upsell-ring-delay"
              style={{
                width: 100, height: 100,
                borderRadius: "50%",
                border: "1.5px solid rgba(82,183,136,0.2)",
              }}
            />
            <motion.div
              animate={{ y: [0, -6, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
            >
              <div
                className="relative z-10 w-20 h-20 rounded-2xl flex items-center justify-center text-4xl"
                style={{
                  background: "linear-gradient(135deg, rgba(82,183,136,0.15), rgba(27,67,50,0.4))",
                  border: "1px solid rgba(82,183,136,0.3)",
                  boxShadow: "0 0 30px rgba(82,183,136,0.2), 0 8px 24px rgba(0,0,0,0.5)",
                }}
              >
                {copy.icon}
              </div>
            </motion.div>
          </div>

          {/* Headline */}
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, type: "spring", damping: 24 }}
            className="text-2xl font-bold text-white mb-2 leading-tight"
            style={{ fontFamily: "'Georgia', serif" }}
          >
            {copy.headline}
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.28, duration: 0.4 }}
            className="text-sm mb-7"
            style={{ color: "rgba(255,255,255,0.48)" }}
          >
            {copy.sub}
          </motion.p>

          {/* Bullets */}
          <motion.ul
            variants={bulletVariants}
            initial="hidden"
            animate="visible"
            className="text-sm text-left space-y-3 mb-8 w-full max-w-xs"
          >
            {copy.bullets.map((b, i) => (
              <motion.li key={i} variants={bulletItem} className="flex items-start gap-3">
                <motion.span
                  whileInView={{ scale: [0.6, 1.15, 1] }}
                  transition={{ type: "spring", damping: 15, delay: i * 0.08 }}
                  className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-bold"
                  style={{ background: "rgba(82,183,136,0.2)", color: "#52B788" }}
                >
                  ✓
                </motion.span>
                <span style={{ color: "rgba(255,255,255,0.82)" }}>{b}</span>
              </motion.li>
            ))}
          </motion.ul>

          {/* Trial badge */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.65, type: "spring", damping: 20 }}
            className="flex items-center gap-2 px-4 py-2 rounded-full mb-4 text-xs font-semibold tracking-wide uppercase"
            style={{
              background: "rgba(82,183,136,0.12)",
              border: "1px solid rgba(82,183,136,0.3)",
              color: "#52B788",
            }}
          >
            <span>🎁</span>
            <span>7 Days Free — No Charge Today</span>
          </motion.div>

          {/* CTA */}
          <motion.button
            onClick={handleUpgrade}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.72, type: "spring", damping: 22 }}
            whileTap={{ scale: 0.97 }}
            className="w-full max-w-xs py-4 rounded-2xl text-base font-bold upsell-shimmer-btn"
            style={{ color: "#0a1a0a" }}
          >
            Start My Free Trial
          </motion.button>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.85 }}
            className="text-xs mt-3"
            style={{ color: "rgba(255,255,255,0.28)" }}
          >
            Then $14.99/mo · or $5.99/mo billed annually · Cancel anytime
          </motion.p>
        </div>
      </motion.div>
    </motion.div>
  );

  return createPortal(
    <AnimatePresence>{open && modal}</AnimatePresence>,
    document.body
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HOOK
// ═══════════════════════════════════════════════════════════════════════════════

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
