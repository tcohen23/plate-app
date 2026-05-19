/**
 * Screen 18 — Welcome / subscription confirmed
 * Shown after Stripe checkout success redirect.
 * Confetti burst, trial active badge, → dashboard.
 */
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { posthog } from "@/lib/posthog";

// Lightweight confetti (CSS-only, no library needed)
function ConfettiBurst() {
  const pieces = Array.from({ length: 30 }, (_, i) => i);
  const colors = ["#52B788", "#7EC8A4", "#ffffff", "#A8D5BD", "#1B4332", "#FAF8F5"];

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((i) => {
        const color = colors[i % colors.length];
        const left = Math.random() * 100;
        const delay = Math.random() * 0.8;
        const size = 6 + Math.random() * 8;
        const duration = 1.5 + Math.random() * 1;
        return (
          <div
            key={i}
            className="absolute top-0 rounded-sm"
            style={{
              left: `${left}%`,
              width: size,
              height: size * (0.4 + Math.random() * 0.6),
              background: color,
              animation: `confetti-fall ${duration}s ${delay}s ease-in forwards`,
              opacity: 0,
            }}
          />
        );
      })}
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}

export function Step18WelcomeDone() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const completeOnboarding = useMutation(api.onboarding.completeOnboarding);
  const [confetti, setConfetti] = useState(false);
  const [done, setDone] = useState(false);

  const firstName = sessionStorage.getItem("ob_firstName") || "there";

  useEffect(() => {
    // Fire confetti
    setConfetti(true);
    setTimeout(() => setConfetti(false), 2500);

    // Flush all sessionStorage data to Convex profile
    const flush = async () => {
      try {
        const data = {
          firstName: sessionStorage.getItem("ob_firstName") || "",
          goals: JSON.parse(sessionStorage.getItem("ob_goals") || "[]"),
          glp1Status: sessionStorage.getItem("ob_glp1") || "",
          pastBarriers: JSON.parse(sessionStorage.getItem("ob_barriers") || "[]"),
          habits: JSON.parse(sessionStorage.getItem("ob_habits") || "[]"),
          mealPlanOptIn: sessionStorage.getItem("ob_mealPlanOptIn") === "true",
          planningFrequency: sessionStorage.getItem("ob_frequency") || "",
          sex: sessionStorage.getItem("ob_sex") || "",
          age: parseInt(sessionStorage.getItem("ob_age") || "0"),
          country: sessionStorage.getItem("ob_country") || "",
          zip: sessionStorage.getItem("ob_zip") || "",
          currentWeightLb: parseFloat(sessionStorage.getItem("ob_currentWeight") || "0"),
          goalWeightLb: parseFloat(sessionStorage.getItem("ob_goalWeight") || "0"),
          heightFt: parseInt(sessionStorage.getItem("ob_heightFt") || "0"),
          heightIn: parseInt(sessionStorage.getItem("ob_heightIn") || "0"),
          reminderOptIn: sessionStorage.getItem("ob_reminderOptIn") !== "false",
          emailOptIn: sessionStorage.getItem("ob_emailOptIn") !== "false",
          personalizationConsent: sessionStorage.getItem("ob_personalizationConsent") !== "false",
          calorieTarget: parseInt(sessionStorage.getItem("ob_calories") || "0"),
          activityLevel: sessionStorage.getItem("ob_activity") || "",
        };
        await completeOnboarding(data);
        posthog.capture("onboarding_completed", { plan: searchParams.get("plan") || "premium" });
        // Meta Pixel — Purchase event (value 0 during trial; update when billing occurs)
        import("@/lib/metaPixel").then(m => {
          const plan = searchParams.get("plan") || "premium";
          const value = plan === "premium_annual" ? 59.99 : plan === "premium_monthly" ? 9.99 : 0;
          m.trackMetaPurchase(value, "USD");
        });
        // Clear sessionStorage
        Object.keys(sessionStorage)
          .filter((k) => k.startsWith("ob_"))
          .forEach((k) => sessionStorage.removeItem(k));
      } catch (e) {
        console.error("Error completing onboarding:", e);
      } finally {
        setDone(true);
      }
    };
    flush();
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center relative px-6 max-w-lg lg:max-w-2xl mx-auto w-full"
      style={{ background: "#0a0a0a" }}
    >
      {confetti && <ConfettiBurst />}

      <div className="text-center z-10">
        {/* Green check circle */}
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ background: "rgba(82,183,136,0.15)", border: "2px solid #52B788" }}
        >
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none">
            <path d="M5 13l4 4L19 7" stroke="#52B788" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Trial badge */}
        <div
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-5"
          style={{ background: "rgba(82,183,136,0.15)", color: "#52B788", border: "1px solid rgba(82,183,136,0.3)" }}
        >
          🎉 3-day free trial active
        </div>

        <h1 className="text-white font-serif text-[2.2rem] leading-tight mb-3">
          Welcome to PLATE,<br />{firstName}!
        </h1>
        <p className="text-white/60 text-base leading-relaxed mb-10">
          Your personalised nutrition plan is ready. Let's start hitting those goals.
        </p>

        <button
          onClick={() => navigate("/dashboard")}
          disabled={!done}
          className="w-full py-4 rounded-2xl text-base font-bold transition-all active:scale-[0.98] disabled:opacity-60"
          style={{ background: "#52B788", color: "#0d1f13" }}
        >
          {done ? "Go to my dashboard →" : "Setting up your plan..."}
        </button>
      </div>
    </div>
  );
}
