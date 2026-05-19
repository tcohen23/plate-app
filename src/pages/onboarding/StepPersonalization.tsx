/**
 * Screen 17 — Privacy/Personalization Consent
 * Route: /onboarding/personalization
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { OnboardingLayout, OnboardingCTA } from "./OnboardingLayout";

interface ConsentOption {
  key: string;
  title: string;
  body: string;
  required?: boolean;
}

const CONSENTS: ConsentOption[] = [
  {
    key: "personalizeAds",
    title: "Personalized Ads",
    body: "Allow PLATE to use your data to show you more relevant ads. You can change this in settings at any time.",
  },
  {
    key: "analyticsTracking",
    title: "Analytics & Improvement",
    body: "Help us improve PLATE by sharing anonymized usage data.",
  },
  {
    key: "healthDataProcessing",
    title: "Health Data Processing",
    body: "Allow PLATE to process your health information (weight, macros, activity) to personalize your plan.",
    required: true,
  },
];

export function StepPersonalization() {
  const navigate = useNavigate();
  const [consents, setConsents] = useState<Record<string, boolean>>({
    personalizeAds: true,
    analyticsTracking: true,
    healthDataProcessing: true,
  });

  const toggle = (key: string) => {
    const opt = CONSENTS.find((c) => c.key === key);
    if (opt?.required) return;
    setConsents((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleNext = () => {
    sessionStorage.setItem("ob_consents", JSON.stringify(consents));
    navigate("/onboarding/create-account");
  };

  return (
    <OnboardingLayout step="personalization" darkBg>
      <div
        className="flex flex-col flex-1 px-6 pt-14 pb-10"
        style={{ background: "#000", minHeight: "100vh" }}
      >
        {/* Icon */}
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
          style={{ background: "rgba(82,183,136,0.12)" }}
        >
          <span className="text-2xl">🔒</span>
        </div>

        <h1 className="font-serif text-2xl text-white leading-tight mb-2">
          Privacy matters to us.
        </h1>
        <p className="text-sm mb-8" style={{ color: "rgba(255,255,255,0.5)" }}>
          Control how PLATE uses your information. All data is encrypted and protected.
        </p>

        {/* Consent items */}
        <div className="flex flex-col gap-4 flex-1">
          {CONSENTS.map((c) => {
            const checked = consents[c.key];
            return (
              <div
                key={c.key}
                className="flex items-start gap-4 px-4 py-4 rounded-2xl"
                style={{
                  background: checked ? "rgba(82,183,136,0.08)" : "rgba(255,255,255,0.04)",
                  border: `1px solid ${checked ? "rgba(82,183,136,0.2)" : "rgba(255,255,255,0.08)"}`,
                }}
              >
                <button
                  type="button"
                  onClick={() => toggle(c.key)}
                  className="flex-shrink-0 mt-0.5"
                >
                  <div
                    className="w-6 h-6 rounded-lg flex items-center justify-center transition-all"
                    style={{
                      background: checked ? "#52B788" : "rgba(255,255,255,0.1)",
                      border: `1.5px solid ${checked ? "#52B788" : "rgba(255,255,255,0.2)"}`,
                    }}
                  >
                    {checked && (
                      <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                        <path d="M1 5l3.5 4L11 1" stroke="#0d1f13" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </div>
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-white">{c.title}</span>
                    {c.required && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{ background: "rgba(82,183,136,0.15)", color: "#52B788" }}
                      >
                        Required
                      </span>
                    )}
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
                    {c.body}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-center mt-6 mb-4" style={{ color: "rgba(255,255,255,0.3)" }}>
          By continuing, you accept our{" "}
          <a href="/privacy" className="underline" style={{ color: "rgba(82,183,136,0.7)" }}>
            Privacy Policy
          </a>{" "}
          and{" "}
          <a href="/terms" className="underline" style={{ color: "rgba(82,183,136,0.7)" }}>
            Terms of Service
          </a>
        </p>

        <OnboardingCTA onClick={handleNext}>
          Continue
        </OnboardingCTA>
      </div>
    </OnboardingLayout>
  );
}
