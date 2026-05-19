/**
 * Screen 5 — Single goal-specific interstitial
 * Route: /onboarding/interstitial-realtalk
 *
 * Content adapts to the FIRST goal the user selected:
 *   lose_weight  → "Losing weight isn't always easy" + downward curve
 *   gain_weight  → "Gaining weight isn't always easy" + upward curve
 *   gain_muscle  → "Building muscle isn't always easy" + upward curve
 *   anything else → "Small habits = mighty change" (illustration)
 *
 * Routes directly to /onboarding/activity — no second interstitial.
 */
import { useNavigate } from "react-router-dom";
import { OnboardingLayout, OnboardingCTA } from "./OnboardingLayout";

function WeightCurve({ direction }: { direction: "down" | "up" }) {
  const path = direction === "down"
    ? "M 20 20 C 60 22, 80 50, 120 55 C 160 60, 200 90, 260 100"
    : "M 20 100 C 60 95, 80 65, 120 60 C 160 55, 200 30, 260 20";

  return (
    <svg viewBox="0 0 280 120" className="w-full" style={{ maxHeight: 100 }}>
      <path
        d={direction === "down"
          ? "M 20 20 C 60 22, 80 50, 120 55 C 160 60, 200 90, 260 100 L 260 80 C 200 70, 160 40, 120 35 C 80 30, 60 2, 20 0 Z"
          : "M 20 100 C 60 95, 80 65, 120 60 C 160 55, 200 30, 260 20 L 260 40 C 200 50, 160 75, 120 80 C 80 85, 60 115, 20 120 Z"
        }
        fill="#52B78818"
      />
      <path d={path} fill="none" stroke="#52B788" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="20" cy={direction === "down" ? 20 : 100} r="5" fill="#52B788" />
      <circle cx="260" cy={direction === "down" ? 100 : 20} r="5" fill="#52B788" />
      <text x="14" y={direction === "down" ? 40 : 118} fill="rgba(255,255,255,0.5)" fontSize="10" fontFamily="Inter, sans-serif">Today</text>
      <text x="228" y={direction === "down" ? 116 : 16} fill="rgba(255,255,255,0.5)" fontSize="10" fontFamily="Inter, sans-serif">6 months</text>
    </svg>
  );
}

/** Stick figure + ball illustration for "small habits" variant */
function HabitsIllustration() {
  return (
    <div className="flex items-center justify-center my-6">
      <svg viewBox="0 0 280 160" className="w-full" style={{ maxHeight: 140 }}>
        {/* Hill */}
        <path d="M 0 140 Q 140 60, 280 140 Z" fill="#1a3a2a" />
        {/* Ball */}
        <circle cx="170" cy="82" r="28" fill="#E5B454" />
        {/* Stick figure */}
        <circle cx="120" cy="72" r="9" fill="none" stroke="white" strokeWidth="2.5" />
        <line x1="120" y1="81" x2="120" y2="108" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="120" y1="90" x2="105" y2="100" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="120" y1="90" x2="145" y2="88" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="120" y1="108" x2="108" y2="122" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="120" y1="108" x2="132" y2="122" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        {/* Stars */}
        <text x="60" y="45" fill="rgba(229,180,84,0.7)" fontSize="12">✦</text>
        <text x="230" y="55" fill="rgba(229,180,84,0.7)" fontSize="12">✦</text>
        <text x="200" y="30" fill="rgba(229,180,84,0.4)" fontSize="8">✦</text>
      </svg>
    </div>
  );
}

type GoalVariant = "lose_weight" | "gain_weight" | "gain_muscle" | "other";

function getVariant(goals: string[]): GoalVariant {
  const first = goals[0];
  if (first === "lose_weight") return "lose_weight";
  if (first === "gain_weight") return "gain_weight";
  if (first === "gain_muscle") return "gain_muscle";
  return "other";
}

const CONTENT: Record<GoalVariant, { tag: string; headline: string; body: string; ps: string }> = {
  lose_weight: {
    tag: "OK, real talk:",
    headline: "Losing weight isn't\nalways easy.",
    body: "But we'll motivate you through the ups and downs, so you can hit that goal!",
    ps: "P.S. You've already done the hardest part: getting started 🥳",
  },
  gain_weight: {
    tag: "OK, real talk:",
    headline: "Gaining weight isn't\nalways easy.",
    body: "But we'll help you build sustainably and hit your target with the right nutrition.",
    ps: "P.S. You've already done the hardest part: getting started 🥳",
  },
  gain_muscle: {
    tag: "OK, real talk:",
    headline: "Building muscle isn't\nalways easy.",
    body: "But we'll motivate you through the ups and downs, so you can hit that goal!",
    ps: "P.S. You've already done the hardest part: getting started 🥳",
  },
  other: {
    tag: "Excellent choices!",
    headline: "Small habits = mighty change.",
    body: "We'll help you bank small wins (and mighty celebrations) on the way to your goals.",
    ps: "",
  },
};

export function StepInterstitialRealtalk() {
  const navigate = useNavigate();
  const goals: string[] = JSON.parse(sessionStorage.getItem("ob_goals") || "[]");
  const variant = getVariant(goals);
  const c = CONTENT[variant];
  const showCurve = variant !== "other";
  const curveDir = variant === "lose_weight" ? "down" : "up";

  return (
    <OnboardingLayout step="interstitial-realtalk" darkBg>
      <div
        className="flex flex-col flex-1 px-6 pt-16 pb-10"
        style={{
          background: "linear-gradient(135deg, #0d1f3c 0%, #1a0a2e 100%)",
          minHeight: "100vh",
        }}
      >
        <div className="mb-6">
          <span
            className="text-xs font-semibold tracking-widest uppercase px-3 py-1.5 rounded-full"
            style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}
          >
            {c.tag}
          </span>
        </div>

        <h1 className="font-serif text-3xl text-white leading-tight mb-4" style={{ whiteSpace: "pre-line" }}>
          {c.headline}
        </h1>
        <p className="text-base mb-8" style={{ color: "rgba(255,255,255,0.6)" }}>
          {c.body}
        </p>

        {showCurve ? (
          <div className="mb-6 px-2">
            <WeightCurve direction={curveDir} />
          </div>
        ) : (
          <HabitsIllustration />
        )}

        {c.ps && (
          <div
            className="rounded-2xl px-4 py-3 mb-auto"
            style={{ background: "rgba(82,183,136,0.1)", border: "1px solid rgba(82,183,136,0.2)" }}
          >
            <p className="text-sm" style={{ color: "rgba(82,183,136,0.9)" }}>{c.ps}</p>
          </div>
        )}

        <div className="mt-8">
          <OnboardingCTA onClick={() => navigate("/onboarding/activity")}>
            Next
          </OnboardingCTA>
        </div>
      </div>
    </OnboardingLayout>
  );
}
