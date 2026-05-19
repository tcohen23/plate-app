/**
 * Screen 6 — "Excellent Choices" Interstitial
 * Route: /onboarding/interstitial-choices
 * 
 * Small habits = mighty change.
 */
import { useNavigate } from "react-router-dom";
import { OnboardingLayout, OnboardingCTA } from "./OnboardingLayout";

// Stylized figure pushing orange uphill (SVG)
function OrangeFigureIllustration() {
  return (
    <svg viewBox="0 0 280 200" className="w-full" style={{ maxHeight: 180 }}>
      {/* Hill */}
      <path d="M 20 180 Q 140 80, 260 100" fill="none" stroke="#2D6A4F" strokeWidth="3" strokeLinecap="round" />
      <path d="M 20 180 Q 140 80, 260 100 L 260 200 L 20 200 Z" fill="rgba(27,67,50,0.4)" />
      {/* Orange (giant circle) */}
      <circle cx="185" cy="120" r="32" fill="#F5A623" />
      <circle cx="175" cy="112" r="6" fill="rgba(255,255,255,0.15)" />
      {/* Leaf */}
      <path d="M 185 88 C 190 80, 200 82, 195 92" fill="none" stroke="#52B788" strokeWidth="2.5" strokeLinecap="round" />
      {/* Stick figure pushing */}
      <circle cx="148" cy="115" r="7" fill="white" />
      <line x1="148" y1="122" x2="148" y2="148" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="148" y1="130" x2="158" y2="138" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="148" y1="148" x2="140" y2="162" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="148" y1="148" x2="156" y2="162" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      {/* Arms pushing */}
      <line x1="148" y1="128" x2="168" y2="120" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
      {/* Sparkles */}
      <text x="220" y="70" fill="#E5B454" fontSize="18">✦</text>
      <text x="60" y="100" fill="#52B788" fontSize="12">✦</text>
      <text x="240" y="140" fill="rgba(255,255,255,0.4)" fontSize="10">✦</text>
    </svg>
  );
}

export function StepInterstitialChoices() {
  const navigate = useNavigate();

  return (
    <OnboardingLayout step="interstitial-choices" darkBg>
      <div
        className="flex flex-col flex-1 px-6 pt-16 pb-10"
        style={{
          background: "linear-gradient(135deg, #0d1f3c 0%, #1a0a2e 100%)",
          minHeight: "100vh",
        }}
      >
        {/* Illustration */}
        <div className="mb-6 px-4">
          <OrangeFigureIllustration />
        </div>

        {/* Tag */}
        <div className="mb-4">
          <span
            className="text-xs font-semibold px-3 py-1.5 rounded-full"
            style={{ background: "rgba(20,20,30,0.6)", color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}
          >
            Excellent choices!
          </span>
        </div>

        <h1 className="font-serif text-3xl text-white leading-tight mb-4">
          Small habits = mighty change.
        </h1>
        <p className="text-base mb-auto" style={{ color: "rgba(255,255,255,0.6)" }}>
          We'll help you bank small wins (and mighty celebrations) on the way to your goals.
        </p>

        <div className="mt-8">
          <OnboardingCTA onClick={() => navigate("/onboarding/activity")}>
            Next
          </OnboardingCTA>
        </div>
      </div>
    </OnboardingLayout>
  );
}
