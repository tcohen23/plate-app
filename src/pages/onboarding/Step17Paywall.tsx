/**
 * Screen 17 — Hard paywall
 * Annual pre-selected, no skip.
 * Close → confirm modal → sign out.
 * 
 * Fully animated: floating orbs, pulsing logo rings, staggered features,
 * shimmer CTA, spring plan-card selection.
 */
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAction } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../../convex/_generated/api";
import { posthog } from "@/lib/posthog";
import { motion, AnimatePresence } from "framer-motion";

const PLANS = [
  {
    id: "annual",
    label: "Annual",
    priceMonthly: "$5.99",
    priceTotal: "$71.88/year",
    badge: "Best Value · 60% off",
    priceId: import.meta.env.VITE_STRIPE_PRICE_PREMIUM_ANNUAL,
  },
  {
    id: "monthly",
    label: "Monthly",
    priceMonthly: "$14.99",
    priceTotal: "$14.99/month",
    badge: null,
    priceId: import.meta.env.VITE_STRIPE_PRICE_PREMIUM_MONTHLY,
  },
];

const FEATURES = [
  "AI meal plans built around your goals",
  "Unlimited food & calorie tracking",
  "Weekly grocery lists",
  "Macro & nutrient insights",
  "Unlimited AI nutrition chat",
];

// ─── Particle star canvas ─────────────────────────────────────────────────────
function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const stars = Array.from({ length: 55 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.2 + 0.3,
      speed: Math.random() * 0.18 + 0.04,
      opacity: Math.random() * 0.5 + 0.15,
      flicker: Math.random() * Math.PI * 2,
    }));

    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      stars.forEach((s) => {
        s.flicker += 0.025;
        const alpha = s.opacity * (0.7 + 0.3 * Math.sin(s.flicker));
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(82,183,136,${alpha})`;
        ctx.fill();
        s.y -= s.speed;
        if (s.y < -4) { s.y = canvas.height + 4; s.x = Math.random() * canvas.width; }
      });
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0, opacity: 0.7 }}
    />
  );
}

export function Step17Paywall() {
  const navigate = useNavigate();
  const { signOut } = useAuthActions();
  const createCheckout = useAction(api.stripe.createCheckoutUrl);

  const [selectedPlan, setSelectedPlan] = useState<"annual" | "monthly">("annual");
  const [loading, setLoading] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [error, setError] = useState("");

  const handleSubscribe = async () => {
    setLoading(true);
    setError("");
    try {
      posthog.capture("paywall_plan_selected", { plan: selectedPlan });
      import("@/lib/metaPixel").then(m => m.trackMetaLead());
      const url = await createCheckout({ planType: selectedPlan === "annual" ? "premium_annual" : "premium_monthly" });
      if (url) window.location.href = url;
    } catch {
      setError("Could not start checkout. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleExit = async () => {
    await signOut();
    navigate("/onboarding");
  };

  const firstName = sessionStorage.getItem("ob_firstName") || "there";
  const calories = sessionStorage.getItem("ob_calories") || "—";

  const featureVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.09, delayChildren: 0.5 } },
  };
  const featureItem = {
    hidden: { opacity: 0, x: -16 },
    visible: { opacity: 1, x: 0, transition: { type: "spring" as const, damping: 22, stiffness: 250 } },
  };

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{ background: "#060a07" }}
    >
      {/* Starfield */}
      <StarField />

      {/* Animated background orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
        {/* Top-right orb */}
        <div
          className="absolute animate-upsell-orb-a"
          style={{
            top: -100,
            right: -80,
            width: 320,
            height: 320,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(82,183,136,0.18) 0%, transparent 70%)",
            filter: "blur(50px)",
          }}
        />
        {/* Bottom-left orb */}
        <div
          className="absolute animate-upsell-orb-b"
          style={{
            bottom: -80,
            left: -100,
            width: 280,
            height: 280,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(27,67,50,0.5) 0%, transparent 70%)",
            filter: "blur(45px)",
          }}
        />
        {/* Beam sweep */}
        <div
          className="absolute animate-upsell-beam"
          style={{
            top: "-20%",
            left: "-60%",
            width: "40%",
            height: "180%",
            background: "linear-gradient(90deg, transparent, rgba(82,183,136,0.05), transparent)",
          }}
        />
      </div>

      {/* Content */}
      <div className="relative flex-1 flex flex-col px-6 pb-10" style={{ zIndex: 1 }}>
        {/* Exit button */}
        <div className="flex justify-end px-0 pt-5">
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={() => setShowExitModal(true)}
            className="text-white/40 text-2xl leading-none px-2 py-1 transition-opacity hover:text-white/70"
            aria-label="Close"
          >
            ×
          </motion.button>
        </div>

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", damping: 24, stiffness: 200 }}
          className="text-center mb-7 pt-2"
        >
          {/* Animated logo with pulsing rings */}
          <div className="relative flex items-center justify-center mx-auto mb-5" style={{ width: 100, height: 100 }}>
            <div className="absolute animate-upsell-ring" style={{ width: 90, height: 90, borderRadius: "50%", border: "1.5px solid rgba(82,183,136,0.35)" }} />
            <div className="absolute animate-upsell-ring-delay" style={{ width: 90, height: 90, borderRadius: "50%", border: "1.5px solid rgba(82,183,136,0.2)" }} />
            <motion.img
              src="/plate-logo.jpg"
              alt="Plate"
              animate={{ y: [0, -5, 0] }}
              transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
              className="relative z-10 rounded-2xl object-contain"
              style={{ width: 72, height: 72 }}
            />
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, type: "spring", damping: 18 }}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-4"
            style={{ background: "rgba(82,183,136,0.15)", color: "#52B788", border: "1px solid rgba(82,183,136,0.3)" }}
          >
            🎯 {calories} cal/day target ready
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, type: "spring", damping: 22 }}
            className="text-white font-serif text-[1.9rem] leading-tight mb-3"
          >
            Unlock your plan,<br />{firstName}.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.42, duration: 0.4 }}
            className="text-white/60 text-sm leading-relaxed"
          >
            Start your <span style={{ color: "#52B788" }}>7-day free trial</span>. Cancel anytime.
          </motion.p>
        </motion.div>

        {/* Feature list */}
        <motion.div
          variants={featureVariants}
          initial="hidden"
          animate="visible"
          className="mb-7 space-y-3"
        >
          {FEATURES.map((f) => (
            <motion.div key={f} variants={featureItem} className="flex items-center gap-3">
              <span
                className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs"
                style={{ background: "rgba(82,183,136,0.2)", color: "#52B788" }}
              >
                ✓
              </span>
              <span className="text-white/80 text-sm">{f}</span>
            </motion.div>
          ))}
        </motion.div>

        {/* Plan toggle */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, type: "spring", damping: 22 }}
          className="flex flex-col gap-3 mb-6"
        >
          {PLANS.map((plan) => (
            <motion.button
              key={plan.id}
              onClick={() => {
                setSelectedPlan(plan.id as "annual" | "monthly");
                posthog.capture("paywall_plan_toggled", { plan: plan.id });
              }}
              whileTap={{ scale: 0.98 }}
              animate={{
                borderColor: selectedPlan === plan.id ? "#52B788" : "rgba(255,255,255,0.1)",
                background: selectedPlan === plan.id ? "rgba(82,183,136,0.1)" : "rgba(255,255,255,0.04)",
              }}
              transition={{ duration: 0.2 }}
              className="w-full px-5 py-4 rounded-2xl text-left relative"
              style={{
                border: `1.5px solid ${selectedPlan === plan.id ? "#52B788" : "rgba(255,255,255,0.1)"}`,
                background: selectedPlan === plan.id ? "rgba(82,183,136,0.1)" : "rgba(255,255,255,0.04)",
              }}
            >
              {plan.badge && (
                <span
                  className="absolute -top-2.5 left-4 text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{ background: "#52B788", color: "#0d1f13" }}
                >
                  {plan.badge}
                </span>
              )}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-white font-semibold text-sm">{plan.label}</div>
                  <div className="text-white/50 text-xs mt-0.5">{plan.priceTotal}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold" style={{ color: "#52B788" }}>{plan.priceMonthly}</div>
                  <div className="text-white/40 text-xs">/ month</div>
                </div>
              </div>
            </motion.button>
          ))}
        </motion.div>

        {error && <p className="text-xs text-center mb-4" style={{ color: "#ef4444" }}>{error}</p>}

        {/* Trial badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.88 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.85, type: "spring", damping: 18 }}
          animate-continue={{ scale: [1, 1.015, 1] }}
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-full mb-4 text-xs font-semibold tracking-wide uppercase"
          style={{ background: "rgba(82,183,136,0.12)", border: "1px solid rgba(82,183,136,0.32)", color: "#52B788" }}
        >
          <span>🎁</span>
          <span>7 Days Free — No Charge Today</span>
        </motion.div>

        {/* CTA */}
        <motion.button
          onClick={handleSubscribe}
          disabled={loading}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.92, type: "spring", damping: 20 }}
          whileTap={{ scale: 0.97 }}
          className="w-full py-4 rounded-2xl text-base font-bold disabled:opacity-50 upsell-shimmer-btn"
          style={{ color: "#0d1f13" }}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Starting trial...
            </span>
          ) : "Start My Free Trial"}
        </motion.button>

        <p className="text-white/30 text-xs text-center mt-4">
          Then {selectedPlan === "annual" ? "$5.99/mo billed annually" : "$14.99/mo"} · Cancel anytime
        </p>
      </div>

      {/* Exit confirmation modal */}
      <AnimatePresence>
        {showExitModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-end z-50"
            style={{ background: "rgba(0,0,0,0.7)" }}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="w-full rounded-t-3xl p-6"
              style={{ background: "#111" }}
            >
              <h3 className="text-white text-lg font-semibold mb-2">Leave without starting?</h3>
              <p className="text-white/60 text-sm mb-6 leading-relaxed">
                Your data will be deleted and you'll be signed out. You can start over anytime.
              </p>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={handleExit}
                className="w-full py-3.5 rounded-2xl text-base font-semibold mb-3"
                style={{ background: "#ef4444", color: "white" }}
              >
                Yes, leave & delete data
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setShowExitModal(false)}
                className="w-full py-3.5 rounded-2xl text-base font-medium"
                style={{ background: "rgba(255,255,255,0.08)", color: "white" }}
              >
                Stay, keep my plan
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
