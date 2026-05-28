/**
 * Screen 23 — Welcome Premium
 * Route: /onboarding/welcome-premium
 *
 * Shown after Stripe checkout succeeds. Cinematic celebration with
 * canvas confetti burst, floating crown, staggered feature reveals.
 */
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { motion } from "framer-motion";

// ─── Confetti canvas ──────────────────────────────────────────────────────────
function ConfettiBurst() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    const colors = ["#52B788", "#E5B454", "#60a5fa", "#f87171", "#a78bfa", "#fde68a", "#34d399"];

    const particles = Array.from({ length: 80 }, () => ({
      x: canvas.width / 2,
      y: canvas.height * 0.35,
      vx: (Math.random() - 0.5) * 14,
      vy: -Math.random() * 12 - 4,
      gravity: 0.28,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 7 + 3,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.2,
      opacity: 1,
      shape: Math.random() > 0.5 ? "rect" : "circle",
    }));

    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let allDone = true;
      particles.forEach((p) => {
        if (p.opacity <= 0) return;
        allDone = false;
        p.x += p.vx;
        p.vy += p.gravity;
        p.y += p.vy;
        p.rotation += p.rotSpeed;
        p.opacity -= 0.012;

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.opacity);
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = p.color;
        if (p.shape === "rect") {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.55);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      });
      if (!allDone) raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 5 }}
    />
  );
}

const UNLOCKED_ITEMS = [
  "📸 Meal Photo Scan",
  "🎙️ Voice Logging",
  "📊 Advanced Analytics",
  "🍽️ Unlimited Meal Plans",
  "🚫 No Ads",
];

export function StepWelcomePremium() {
  const navigate = useNavigate();
  const completeOnboarding = useMutation(api.onboarding.completeOnboarding);

  useEffect(() => {
    try {
      completeOnboarding({
        firstName: sessionStorage.getItem("ob_firstName") || "",
        goals: JSON.parse(sessionStorage.getItem("ob_goals") || "[]"),
        glp1Status: sessionStorage.getItem("ob_glp1") || "no",
        pastBarriers: JSON.parse(sessionStorage.getItem("ob_barriers") || "[]"),
        habits: JSON.parse(sessionStorage.getItem("ob_habits") || "[]"),
        mealPlanOptIn: sessionStorage.getItem("ob_mealPlanOptIn") !== "no",
        planningFrequency: sessionStorage.getItem("ob_frequency") || "daily",
        sex: sessionStorage.getItem("ob_sex") || "other",
        age: parseInt(sessionStorage.getItem("ob_age") || "25"),
        country: sessionStorage.getItem("ob_country") || "US",
        zip: sessionStorage.getItem("ob_zip") || undefined,
        currentWeightLb: parseFloat(sessionStorage.getItem("ob_currentWeight") || "160"),
        goalWeightLb: parseFloat(sessionStorage.getItem("ob_goalWeight") || "150"),
        heightFt: parseInt(sessionStorage.getItem("ob_heightFt") || "5"),
        heightIn: parseInt(sessionStorage.getItem("ob_heightIn") || "6"),
        reminderOptIn: true,
        emailOptIn: true,
        personalizationConsent: true,
        calorieTarget: parseInt(sessionStorage.getItem("ob_calories") || "2000"),
        activityLevel: sessionStorage.getItem("ob_activity") || "moderate",
      }).catch(console.error);
    } catch (e) {
      console.error("completeOnboarding error:", e);
    }
  }, []);

  const itemVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.1, delayChildren: 0.9 } },
  };
  const itemChild = {
    hidden: { opacity: 0, x: -16 },
    visible: { opacity: 1, x: 0, transition: { type: "spring" as const, damping: 22, stiffness: 260 } },
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-6 max-w-lg lg:max-w-2xl mx-auto w-full relative overflow-hidden"
      style={{ background: "#060805" }}
    >
      {/* Background orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute animate-upsell-orb-a" style={{ top: -80, right: -60, width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle, rgba(229,180,84,0.18) 0%, transparent 70%)", filter: "blur(50px)" }} />
        <div className="absolute animate-upsell-orb-b" style={{ bottom: -60, left: -80, width: 260, height: 260, borderRadius: "50%", background: "radial-gradient(circle, rgba(82,183,136,0.14) 0%, transparent 70%)", filter: "blur(45px)" }} />
      </div>

      {/* Confetti burst */}
      <ConfettiBurst />

      {/* Crown with bounce entrance */}
      <div className="relative flex items-center justify-center mb-8" style={{ width: 150, height: 150, zIndex: 10 }}>
        {/* Expanding rings */}
        <div className="absolute animate-upsell-ring" style={{ width: 130, height: 130, borderRadius: "50%", border: "1.5px solid rgba(229,180,84,0.4)" }} />
        <div className="absolute animate-upsell-ring-delay" style={{ width: 130, height: 130, borderRadius: "50%", border: "1.5px solid rgba(229,180,84,0.22)" }} />
        {/* Glow */}
        <div
          className="absolute"
          style={{
            width: 110,
            height: 110,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(229,180,84,0.3) 0%, transparent 70%)",
            filter: "blur(16px)",
            animation: "upsell-pulse-glow 3s ease-in-out infinite",
          }}
        />
        <motion.div
          initial={{ scale: 0, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: "spring", damping: 12, stiffness: 200, delay: 0.15 }}
          className="relative z-10 w-24 h-24 rounded-full flex items-center justify-center"
          style={{
            background: "rgba(229,180,84,0.12)",
            border: "2px solid rgba(229,180,84,0.35)",
          }}
        >
          <motion.span
            animate={{ rotate: [0, -8, 8, -4, 4, 0], y: [0, -4, 0] }}
            transition={{ delay: 0.7, duration: 0.8, ease: "easeInOut" }}
            style={{ fontSize: 44 }}
          >
            👑
          </motion.span>
        </motion.div>
      </div>

      {/* Headline */}
      <motion.h1
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, type: "spring", damping: 22 }}
        className="font-serif text-3xl text-white text-center leading-tight mb-3"
        style={{ zIndex: 10 }}
      >
        Welcome to{" "}
        <motion.span
          style={{ color: "var(--plate-gold)" }}
          animate={{ opacity: [0.8, 1, 0.8] }}
          transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
        >
          Premium
        </motion.span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.55, duration: 0.5 }}
        className="text-base text-center mb-10"
        style={{ color: "rgba(255,255,255,0.5)", zIndex: 10 }}
      >
        You now have full access to every feature in PLATE. Let's get started on your goals!
      </motion.p>

      {/* What's unlocked */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7, type: "spring", damping: 22 }}
        className="w-full rounded-2xl px-5 py-4 mb-10"
        style={{
          background: "rgba(229,180,84,0.06)",
          border: "1px solid rgba(229,180,84,0.18)",
          zIndex: 10,
          position: "relative",
        }}
      >
        <p className="text-xs font-semibold uppercase tracking-wider mb-3" style={{ color: "rgba(229,180,84,0.65)" }}>
          Unlocked for you
        </p>
        <motion.div variants={itemVariants} initial="hidden" animate="visible">
          {UNLOCKED_ITEMS.map((item) => (
            <motion.div key={item} variants={itemChild} className="flex items-center gap-2 py-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" fill="rgba(229,180,84,0.2)" />
                <path d="M7 13l3 3 7-7" stroke="#E5B454" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-sm text-white">{item}</span>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      <motion.button
        onClick={() => navigate("/dashboard", { replace: true })}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.05, type: "spring", damping: 20 }}
        whileTap={{ scale: 0.97 }}
        className="w-full font-bold text-base rounded-full"
        style={{
          background: "var(--plate-gold)",
          color: "#1a1200",
          height: "56px",
          zIndex: 10,
          position: "relative",
        }}
      >
        Go to My Dashboard
      </motion.button>
    </div>
  );
}
