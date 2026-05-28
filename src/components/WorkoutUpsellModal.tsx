/**
 * WorkoutUpsellModal — shown after user logs their first meal.
 * Cinematic bottom sheet with animated orb background, floating headline,
 * staggered feature list, shimmer CTA.
 * Triggers once via localStorage flag.
 */
import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { motion, AnimatePresence } from "framer-motion";

export function WorkoutUpsellModal() {
  const [open, setOpen] = useState(false);

  const subscriptionStatus = useQuery(api.stripe.getSubscriptionStatus);
  const profile = useQuery(api.profiles.getProfile);

  useEffect(() => {
    const alreadyShown = localStorage.getItem("workout_upsell_shown") === "true";
    if (alreadyShown) return;

    const hasPremium = ["trialing", "active"].includes(subscriptionStatus?.subscriptionStatus || "") ||
      (profile as any)?.isPremium;
    const hasWorkout = (profile as any)?.workoutAddOnStatus === "active";

    if (hasPremium && !hasWorkout) {
      const t = setTimeout(() => setOpen(true), 1000);
      return () => clearTimeout(t);
    }
  }, [subscriptionStatus, profile]);

  const handleDismiss = () => {
    localStorage.setItem("workout_upsell_shown", "true");
    setOpen(false);
  };

  const handleUpgrade = () => {
    localStorage.setItem("workout_upsell_shown", "true");
    window.location.href = "/upgrade";
  };

  const features = [
    "AI-generated workout plans for your goals",
    "Push-harder coaching & form tips",
    "Synced with your nutrition targets",
    "Progress tracking & PRs",
  ];

  const featureVariants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.09, delayChildren: 0.35 } },
  };
  const featureItem = {
    hidden: { opacity: 0, x: -14 },
    visible: { opacity: 1, x: 0, transition: { type: "spring" as const, damping: 22, stiffness: 260 } },
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
          onClick={handleDismiss}
        >
          <motion.div
            className="w-full rounded-t-3xl overflow-hidden relative"
            style={{ background: "#080e08", maxWidth: 480, margin: "0 auto" }}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Orb background */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              <div className="absolute animate-upsell-orb-a" style={{ top: -60, right: -40, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, rgba(82,183,136,0.18) 0%, transparent 70%)", filter: "blur(40px)" }} />
              <div className="absolute animate-upsell-orb-b" style={{ bottom: -40, left: -50, width: 180, height: 180, borderRadius: "50%", background: "radial-gradient(circle, rgba(27,67,50,0.45) 0%, transparent 70%)", filter: "blur(35px)" }} />
              <div className="absolute animate-upsell-beam" style={{ top: "-20%", left: "-60%", width: "40%", height: "180%", background: "linear-gradient(90deg, transparent, rgba(82,183,136,0.04), transparent)" }} />
            </div>

            {/* Dumbbell image with gradient */}
            <div className="relative h-48 overflow-hidden">
              <img
                src="/onboarding/upsell-dumbbell-dark.jpg"
                alt="Workout add-on"
                className="w-full h-full object-cover"
              />
              <div
                className="absolute inset-0"
                style={{ background: "linear-gradient(to bottom, transparent 30%, #080e08 100%)" }}
              />
              {/* Scan line on image */}
              <div
                className="absolute left-0 right-0 animate-scan-line"
                style={{
                  height: 1.5,
                  background: "linear-gradient(90deg, transparent, rgba(82,183,136,0.6), transparent)",
                  boxShadow: "0 0 8px rgba(82,183,136,0.4)",
                  zIndex: 2,
                }}
              />
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={handleDismiss}
                className="absolute top-4 right-4 text-white/60 text-2xl leading-none"
              >
                ×
              </motion.button>
            </div>

            <div className="px-6 pb-8 pt-2 relative" style={{ zIndex: 1 }}>
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.15, type: "spring", damping: 18 }}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-3"
                style={{ background: "rgba(82,183,136,0.15)", color: "#52B788", border: "1px solid rgba(82,183,136,0.3)" }}
              >
                💪 New: Workout Add-On
              </motion.div>

              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.22, type: "spring", damping: 22 }}
                className="text-white font-serif text-2xl leading-tight mb-2"
              >
                Fuel the workout.<br />Track the gains.
              </motion.h2>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.32, duration: 0.4 }}
                className="text-white/60 text-sm leading-relaxed mb-6"
              >
                Add personalised workout plans to your PLATE subscription for just{" "}
                <span style={{ color: "#52B788" }}>$5/month</span>.
              </motion.p>

              <motion.div
                variants={featureVariants}
                initial="hidden"
                animate="visible"
                className="space-y-2 mb-6"
              >
                {features.map((f) => (
                  <motion.div key={f} variants={featureItem} className="flex items-center gap-2.5 text-sm text-white/75">
                    <span style={{ color: "#52B788" }}>✓</span>
                    {f}
                  </motion.div>
                ))}
              </motion.div>

              <motion.button
                onClick={handleUpgrade}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.75, type: "spring", damping: 20 }}
                whileTap={{ scale: 0.97 }}
                className="w-full py-4 rounded-2xl text-base font-bold mb-3 upsell-shimmer-btn"
                style={{ color: "#0d1f13" }}
              >
                Unlock Workouts
              </motion.button>

              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.88 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleDismiss}
                className="w-full text-center text-sm text-white/40 py-2"
              >
                Not right now
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
