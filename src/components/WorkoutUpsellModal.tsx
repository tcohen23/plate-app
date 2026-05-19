/**
 * WorkoutUpsellModal — shown after user logs their first meal.
 * Dark backdrop, dumbbell image (dark/light variant based on theme).
 * Triggers once via localStorage flag.
 */
import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";


export function WorkoutUpsellModal() {
  const [open, setOpen] = useState(false);

  const subscriptionStatus = useQuery(api.stripe.getSubscriptionStatus);
  const profile = useQuery(api.profiles.getProfile);


  // Dark mode detection
  const isDark = document.documentElement.classList.contains("dark");

  useEffect(() => {
    // Only show if:
    // 1. Not already shown
    // 2. Has premium but NOT workout add-on
    // 3. workoutUpsellShown is false
    const alreadyShown = localStorage.getItem("workout_upsell_shown") === "true";
    if (alreadyShown) return;

    const hasPremium = ["trialing", "active"].includes(subscriptionStatus?.subscriptionStatus || "") ||
      (profile as any)?.isPremium;
    const hasWorkout = (profile as any)?.workoutAddOnStatus === "active";

    if (hasPremium && !hasWorkout) {
      // Show after 1s delay
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

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={handleDismiss}
    >
      <div
        className="w-full rounded-t-3xl overflow-hidden"
        style={{ background: "#0a0a0a", maxWidth: 480, margin: "0 auto" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Dumbbell image */}
        <div className="relative h-48 overflow-hidden">
          <img
            src={isDark ? "/onboarding/upsell-dumbbell-dark.jpg" : "/onboarding/upsell-dumbbell-light.jpg"}
            alt="Workout add-on"
            className="w-full h-full object-cover"
          />
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(to bottom, transparent 40%, #0a0a0a 100%)" }}
          />
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 text-white/60 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="px-6 pb-8 pt-2">
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-3"
            style={{ background: "rgba(82,183,136,0.15)", color: "#52B788", border: "1px solid rgba(82,183,136,0.3)" }}
          >
            💪 New: Workout Add-On
          </div>

          <h2 className="text-white font-serif text-2xl leading-tight mb-2">
            Fuel the workout.<br />Track the gains.
          </h2>
          <p className="text-white/60 text-sm leading-relaxed mb-6">
            Add personalised workout plans to your PLATE subscription for just <span style={{ color: "#52B788" }}>$5/month</span>.
          </p>

          <div className="space-y-2 mb-6">
            {[
              "AI-generated workout plans for your goals",
              "Push-harder coaching & form tips",
              "Synced with your nutrition targets",
              "Progress tracking & PRs",
            ].map((f) => (
              <div key={f} className="flex items-center gap-2.5 text-sm text-white/75">
                <span style={{ color: "#52B788" }}>✓</span>
                {f}
              </div>
            ))}
          </div>

          <button
            onClick={handleUpgrade}
            
            className="w-full py-4 rounded-2xl text-base font-bold transition-all active:scale-[0.98] mb-3 disabled:opacity-50"
            style={{ background: "#52B788", color: "#0d1f13" }}
          >
            "Unlock Workouts"
          </button>

          <button onClick={handleDismiss} className="w-full text-center text-sm text-white/40 py-2">
            Not right now
          </button>
        </div>
      </div>
    </div>
  );
}
