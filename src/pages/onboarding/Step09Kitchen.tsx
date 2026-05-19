/**
 * Screen 11 — "Your Kitchen, Your Rules" Interstitial
 * Route: /onboarding/interstitial-kitchen
 * 
 * Shown when user chose "yes" or "open to trying" on meal plan opt-in
 */
import { useNavigate } from "react-router-dom";
import { OnboardingLayout, OnboardingCTA } from "./OnboardingLayout";

function ChefHatIllustration() {
  return (
    <svg viewBox="0 0 200 180" className="w-full" style={{ maxHeight: 160 }}>
      {/* Hat base/band */}
      <rect x="50" y="130" width="100" height="22" rx="6" fill="white" />
      {/* Hat body */}
      <path d="M 55 135 C 45 135, 40 110, 50 95 C 55 85, 65 78, 70 85 C 75 65, 85 50, 100 50 C 115 50, 125 65, 130 85 C 135 78, 145 85, 150 95 C 160 110, 155 135, 145 135 Z" fill="white" />
      {/* Puff bumps on top */}
      <ellipse cx="80" cy="72" rx="18" ry="22" fill="white" />
      <ellipse cx="100" cy="58" rx="20" ry="24" fill="white" />
      <ellipse cx="120" cy="72" rx="18" ry="22" fill="white" />
      {/* Sparkles */}
      <text x="148" y="70" fill="#E5B454" fontSize="16">✦</text>
      <text x="34" y="100" fill="#E5B454" fontSize="12">✦</text>
      <text x="155" y="110" fill="rgba(255,255,255,0.3)" fontSize="10">✦</text>
    </svg>
  );
}

export function Step09Kitchen() {
  const navigate = useNavigate();

  return (
    <OnboardingLayout step="interstitial-kitchen" darkBg>
      <div
        className="flex flex-col flex-1 px-6 pt-16 pb-10"
        style={{
          background: "linear-gradient(135deg, #0d1f3c 0%, #1a0a2e 100%)",
          minHeight: "100vh",
        }}
      >
        {/* Illustration */}
        <div className="mb-6 px-8">
          <ChefHatIllustration />
        </div>

        {/* Tag */}
        <div className="mb-4">
          <span
            className="text-xs font-semibold px-3 py-1.5 rounded-full"
            style={{ background: "rgba(20,20,30,0.6)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            We get it.
          </span>
        </div>

        <h1 className="font-serif text-3xl text-white leading-tight mb-4">
          Your kitchen,{"\n"}your rules.
        </h1>
        <p className="text-base mb-auto" style={{ color: "rgba(255,255,255,0.6)" }}>
          If you'd like a savvy assistant, we can help simplify your life with meal plans, customized, flexible, and delicious.
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
