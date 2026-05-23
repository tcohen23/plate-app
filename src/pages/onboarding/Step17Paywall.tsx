/**
 * Screen 17 — Hard paywall
 * Annual pre-selected, no skip.
 * Close → confirm modal → sign out.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAction } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../../../convex/_generated/api";
import { posthog } from "@/lib/posthog";

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
    } catch (err: any) {
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

  return (
    <div
      className="min-h-screen flex flex-col relative"
      style={{ background: "#0a0a0a" }}
    >
      {/* Exit button */}
      <div className="flex justify-end px-4 pt-5">
        <button
          onClick={() => setShowExitModal(true)}
          className="text-white/40 text-2xl leading-none px-2 py-1 transition-opacity hover:text-white/70"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <div className="flex-1 flex flex-col px-6 pb-10">
        {/* Hero */}
        <div className="text-center mb-8 pt-2">
          <div
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-4"
            style={{ background: "rgba(82,183,136,0.15)", color: "#52B788", border: "1px solid rgba(82,183,136,0.3)" }}
          >
            🎯 {calories} cal/day target ready
          </div>
          <h1 className="text-white font-serif text-[2rem] leading-tight mb-3">
            Unlock your plan,<br />{firstName}.
          </h1>
          <p className="text-white/60 text-sm leading-relaxed">
            Start your <span style={{ color: "#52B788" }}>7-day free trial</span>. Cancel anytime.
          </p>
        </div>

        {/* Feature list */}
        <div className="mb-8 space-y-3">
          {[
            "AI meal plans built around your goals",
            "Unlimited food & calorie tracking",
            "Weekly grocery lists",
            "Macro & nutrient insights",
            "Unlimited AI nutrition chat",
          ].map((f) => (
            <div key={f} className="flex items-center gap-3">
              <span
                className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs"
                style={{ background: "rgba(82,183,136,0.2)", color: "#52B788" }}
              >
                ✓
              </span>
              <span className="text-white/80 text-sm">{f}</span>
            </div>
          ))}
        </div>

        {/* Plan toggle */}
        <div className="flex flex-col gap-3 mb-6">
          {PLANS.map((plan) => (
            <button
              key={plan.id}
              onClick={() => {
                setSelectedPlan(plan.id as "annual" | "monthly");
                posthog.capture("paywall_plan_toggled", { plan: plan.id });
              }}
              className="w-full px-5 py-4 rounded-2xl text-left relative transition-all active:scale-[0.98]"
              style={{
                background: selectedPlan === plan.id ? "rgba(82,183,136,0.12)" : "rgba(255,255,255,0.05)",
                border: `1.5px solid ${selectedPlan === plan.id ? "#52B788" : "rgba(255,255,255,0.1)"}`,
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
            </button>
          ))}
        </div>

        {error && <p className="text-xs text-center mb-4" style={{ color: "#ef4444" }}>{error}</p>}

        {/* CTA */}
        <button
          onClick={handleSubscribe}
          disabled={loading}
          className="w-full py-4 rounded-2xl text-base font-bold transition-all active:scale-[0.98] disabled:opacity-50"
          style={{ background: "#52B788", color: "#0d1f13" }}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              Starting trial...
            </span>
          ) : (
            "Start free trial →"
          )}
        </button>

        <p className="text-white/30 text-xs text-center mt-4">
          No charge for 7 days. Cancel before trial ends to avoid billing.
        </p>
      </div>

      {/* Exit confirmation modal */}
      {showExitModal && (
        <div className="absolute inset-0 flex items-end z-50 bg-black/60">
          <div
            className="w-full rounded-t-3xl p-6"
            style={{ background: "#1a1a1a" }}
          >
            <h3 className="text-white text-lg font-semibold mb-2">Leave without starting?</h3>
            <p className="text-white/60 text-sm mb-6 leading-relaxed">
              Your data will be deleted and you'll be signed out. You can start over anytime.
            </p>
            <button
              onClick={handleExit}
              className="w-full py-3.5 rounded-2xl text-base font-semibold mb-3"
              style={{ background: "#ef4444", color: "white" }}
            >
              Yes, leave & delete data
            </button>
            <button
              onClick={() => setShowExitModal(false)}
              className="w-full py-3.5 rounded-2xl text-base font-medium"
              style={{ background: "rgba(255,255,255,0.08)", color: "white" }}
            >
              Stay, keep my plan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
