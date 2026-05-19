/**
 * Screen 12 — "This Is Your Journey" Interstitial
 * Route: /onboarding/interstitial-journey
 * 
 * Shown when user chose "no thanks" on meal plan opt-in
 */
import { useNavigate } from "react-router-dom";
import { OnboardingLayout, OnboardingCTA } from "./OnboardingLayout";

function SignpostIllustration() {
  return (
    <svg viewBox="0 0 200 180" className="w-full" style={{ maxHeight: 160 }}>
      {/* Vertical pole */}
      <line x1="100" y1="20" x2="100" y2="160" stroke="rgba(255,255,255,0.3)" strokeWidth="4" strokeLinecap="round" />
      {/* Sign 1 (top, pointing right) */}
      <path d="M 100 45 L 145 45 L 155 55 L 145 65 L 100 65 Z" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
      {/* Sign 2 (middle, highlighted green, pointing right) */}
      <path d="M 100 80 L 145 80 L 158 90 L 145 100 L 100 100 Z" fill="#52B788" />
      {/* Sign 3 (lower, pointing left) */}
      <path d="M 100 115 L 55 115 L 45 125 L 55 135 L 100 135 Z" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
      {/* Sparkles */}
      <text x="158" y="55" fill="#E5B454" fontSize="14">✦</text>
      <text x="35" y="90" fill="rgba(255,255,255,0.3)" fontSize="10">✦</text>
    </svg>
  );
}

export function Step09Journey() {
  const navigate = useNavigate();

  return (
    <OnboardingLayout step="interstitial-journey" darkBg>
      <div
        className="flex flex-col flex-1 px-6 pt-16 pb-10"
        style={{
          background: "linear-gradient(135deg, #0d1f3c 0%, #1a0a2e 100%)",
          minHeight: "100vh",
        }}
      >
        {/* Illustration */}
        <div className="mb-6 px-8">
          <SignpostIllustration />
        </div>

        {/* Tag */}
        <div className="mb-4">
          <span
            className="text-xs font-semibold px-3 py-1.5 rounded-full"
            style={{ background: "rgba(20,20,30,0.6)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            No problem!
          </span>
        </div>

        <h1 className="font-serif text-3xl text-white leading-tight mb-4">
          This is your journey. We'll be your guide.
        </h1>
        <p className="text-base mb-auto" style={{ color: "rgba(255,255,255,0.6)" }}>
          You'll get food insights that shed new light on your daily habits, with inspiration and recipes along the way.
        </p>

        <div className="mt-8">
          <OnboardingCTA onClick={() => navigate("/onboarding/about-you")}>
            Next
          </OnboardingCTA>
        </div>
      </div>
    </OnboardingLayout>
  );
}
