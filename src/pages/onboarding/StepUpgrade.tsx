/**
 * Screen 22 — Soft Upsell / Upgrade
 * Route: /onboarding/upgrade  |  /onboarding/paywall
 *
 * PLATE-branded freemium upsell. Annual selected by default.
 * Two exits: "Skip for now" (top-right) and "Continue with Free plan" (bottom).
 * Both call completeOnboarding with free-tier data and redirect to /dashboard.
 *
 * Split test: ob_paywall_copy
 *   control   → "Go Premium for full access" / generic framing
 *   variant_b → Loss framing, personalized calorie number
 *   variant_c → Social proof, honest framing
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Camera, Mic, BarChart3, UtensilsCrossed, Ban, X, Dumbbell } from "lucide-react";
import { posthog, getFlag } from "@/lib/posthog";

type Plan = "annual" | "monthly";

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Pull all sessionStorage onboarding data and call completeOnboarding */
function useCompleteOnboardingFree() {
  const completeOnboarding = useMutation(api.onboarding.completeOnboarding);
  return () => {
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
    } catch {}
  };
}

// ── Sub-components ───────────────────────────────────────────────────────────

function PlanCard({
  selected,
  onClick,
  badge,
  title,
  price,
  period,
  subtitle,
}: {
  selected: boolean;
  onClick: () => void;
  badge?: string;
  title: string;
  price: string;
  period: string;
  subtitle: string;
}) {
  return (
    <button
      onClick={onClick}
      className="relative rounded-2xl p-6 text-left w-full transition-all duration-200 active:scale-[0.97]"
      style={{
        background: "var(--plate-card-dark)",
        border: selected
          ? "2px solid var(--plate-green-accent)"
          : "1px solid var(--plate-border)",
        boxShadow: selected ? "0 0 0 1px var(--plate-green-glow)" : "none",
      }}
    >
      {badge && (
        <span
          className="absolute -top-3 left-4 rounded-full px-3 py-1 text-xs font-semibold"
          style={{
            background: "var(--plate-green-deep)",
            color: "var(--plate-green-accent)",
          }}
        >
          {badge}
        </span>
      )}
      <div
        className="text-base font-semibold mb-2"
        style={{ color: selected ? "var(--plate-green-accent)" : "white" }}
      >
        {title}
      </div>
      <div className="text-[36px] font-bold leading-none text-white">{price}</div>
      <div className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.45)" }}>
        {period}
      </div>
      <div className="text-[13px] mt-2" style={{ color: "rgba(255,255,255,0.4)" }}>
        {subtitle}
      </div>
    </button>
  );
}

function Feature({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <li className="flex items-center gap-3">
      <Icon size={22} style={{ color: "var(--plate-green-accent)", flexShrink: 0 }} />
      <span className="text-[16px] font-medium text-white">{text}</span>
    </li>
  );
}

// ── Variant copy definitions ─────────────────────────────────────────────────

function getPaywallCopy(variant: string, firstName: string, calories: number) {
  const name = firstName || "there";
  const cal = calories || 2000;

  if (variant === "variant_b") {
    return {
      pill: `🎯 Your ${cal} cal plan is ready`,
      headline: `Your plan is ready, ${name}. Don't lose it.`,
      sub: `Start your 7 day free trial to save your personalized calorie and macro targets.`,
      cta: "Start 7 Day Free Trial",
    };
  }

  if (variant === "variant_c") {
    return {
      pill: "⭐ Trusted by Plate members",
      headline: "Join people already hitting their goals.",
      sub: "Start your 7 day free trial. Cancel anytime before it ends.",
      cta: "Start 7 Day Free Trial",
    };
  }

  // control
  return {
    pill: null,
    headline: "Go Premium for full access",
    sub: "7 day free trial. Cancel anytime before it ends.",
    cta: "Start 7 Day Free Trial",
  };
}

// ── Main component ───────────────────────────────────────────────────────────

export function StepUpgrade() {
  const navigate = useNavigate();
  const [plan, setPlan] = useState<Plan>("annual");
  const [loading, setLoading] = useState(false);
  const [variant, setVariant] = useState<string>("control");
  const createCheckout = useAction(api.stripe.createCheckoutUrl);
  const completeOnboardingFree = useCompleteOnboardingFree();

  // Pull session data for personalization
  const firstName = sessionStorage.getItem("ob_firstName") || "";
  const calories = parseInt(sessionStorage.getItem("ob_calories") || "0");

  // Resolve PostHog feature flag
  useEffect(() => {
    const flag = getFlag("ob_paywall_copy");
    const resolved = typeof flag === "string" ? flag : "control";
    setVariant(resolved);
    posthog.capture("paywall_variant_seen", { variant: resolved });
  }, []);

  const copy = getPaywallCopy(variant, firstName, calories);

  const handleSkip = () => {
    posthog.capture("paywall_skipped", { variant, plan });
    completeOnboardingFree();
    navigate("/dashboard", { replace: true });
  };

  const handleStartTrial = async () => {
    posthog.capture("paywall_plan_selected", { variant, plan });
    setLoading(true);
    try {
      const planType = plan === "annual" ? "premium_annual" : "premium_monthly";
      const url = await createCheckout({ planType });
      if (url) window.location.href = url;
    } catch (err) {
      console.error("Checkout error:", err);
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col px-5 pt-12 pb-8 max-w-lg lg:max-w-2xl mx-auto w-full"
      style={{ background: "var(--plate-bg-dark)" }}
    >
      {/* Skip button — top right */}
      <div className="flex justify-end mb-8">
        <button
          onClick={handleSkip}
          className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm transition-all active:opacity-70"
          style={{
            border: "1px solid var(--plate-border)",
            color: "rgba(255,255,255,0.85)",
            background: "transparent",
          }}
        >
          <X size={14} />
          Skip for now
        </button>
      </div>

      {/* Hero */}
      <div className="text-center mb-8">
        <img
          src="/plate-logo.jpg"
          alt="Plate"
          className="mx-auto mb-6 rounded-2xl object-contain"
          style={{ width: 90, height: 90, background: "#0a0a0a" }}
        />

        {/* Pill badge (variants B and C only) */}
        {copy.pill && (
          <div className="flex justify-center mb-4">
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold"
              style={{
                background: "rgba(82,183,136,0.12)",
                color: "var(--plate-green-accent)",
                border: "1px solid rgba(82,183,136,0.25)",
              }}
            >
              {copy.pill}
            </span>
          </div>
        )}

        <h1
          className="font-serif text-[32px] font-semibold leading-tight text-white"
          style={{ fontFamily: "'Fraunces', 'Georgia', serif" }}
        >
          {copy.headline}
        </h1>
        <p className="mt-3 text-[15px]" style={{ color: "rgba(255,255,255,0.45)" }}>
          {copy.sub}
        </p>
      </div>

      {/* Pricing cards */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <PlanCard
          selected={plan === "annual"}
          onClick={() => setPlan("annual")}
          badge="Save 60%"
          title="Annual"
          price="$5.99"
          period="/ month"
          subtitle="Billed $71.88/yr"
        />
        <PlanCard
          selected={plan === "monthly"}
          onClick={() => setPlan("monthly")}
          title="Monthly"
          price="$14.99"
          period="/ month"
          subtitle="Billed monthly"
        />
      </div>

      {/* Feature list */}
      <ul className="space-y-4 mb-8">
        <Feature icon={Dumbbell} text="AI Workout Plan, personalized to your goals" />
        <Feature icon={UtensilsCrossed} text="AI Meal Plans, 7 day plans built for your macros" />
        <Feature icon={Camera} text="Barcode Scanner, instant nutrition lookup" />
        <Feature icon={Mic} text="Voice Logging, log food hands free in seconds" />
        <Feature icon={Camera} text="Meal Photo Scan, snap a photo to log any meal" />
        <Feature icon={BarChart3} text="Advanced Analytics, weekly trends & body insights" />
        <Feature icon={Ban} text="No ads, ever" />
      </ul>

      {/* Sticky bottom CTA */}
      <div className="mt-auto">
        {/* Trial badge */}
        <div
          className="flex items-center justify-center gap-2 px-4 py-2 rounded-full mb-4 text-xs font-semibold tracking-wide uppercase"
          style={{ background: "rgba(82,183,136,0.15)", border: "1px solid rgba(82,183,136,0.35)", color: "var(--plate-green-accent)" }}
        >
          <span>🎁</span>
          <span>7 Days Free — No Charge Today</span>
        </div>

        <button
          onClick={handleStartTrial}
          disabled={loading}
          className="w-full rounded-full font-semibold text-[17px] transition-all active:scale-[0.98] disabled:opacity-60"
          style={{
            background: "var(--plate-green-accent)",
            color: "#0d1f13",
            height: "56px",
          }}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Loading...
            </span>
          ) : "Start My Free Trial"}
        </button>

        <p className="text-center text-[13px] mt-3" style={{ color: "rgba(255,255,255,0.4)" }}>
          Then {plan === "annual" ? "$5.99/mo billed annually" : "$14.99/mo"} · Cancel anytime
        </p>

        <button
          onClick={handleSkip}
          className="block mx-auto mt-4 text-[15px] transition-all active:opacity-50"
          style={{ color: "rgba(255,255,255,0.45)" }}
        >
          Continue with Free plan
        </button>
      </div>
    </div>
  );
}
