/**
 * Screen 9 — Past Barriers (multi-select)
 * Route: /onboarding/barriers
 * 
 * Conditional: only shown for weight goals
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { OnboardingLayout, OnboardingHeadline, OnboardingSubtext, OnboardingCTA } from "./OnboardingLayout";

const BARRIERS = [
  "Lack of time",
  "The regimen was too hard to follow",
  "Did not enjoy the food",
  "Difficult to make food choices",
  "Social eating and events",
  "Food cravings",
  "Lack of progress",
  "Healthy food doesn't taste good",
  "Lack of support",
  "Cost of healthy food",
  "None of the above",
];

export function Step06Barriers() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string[]>(() => {
    try { return JSON.parse(sessionStorage.getItem("ob_barriers") || "[]"); } catch { return []; }
  });

  const toggle = (val: string) => {
    setSelected((prev) => {
      if (val === "None of the above") return [val];
      const without = prev.filter((v) => v !== "None of the above");
      if (prev.includes(val)) return without.filter((v) => v !== val);
      return [...without, val];
    });
  };

  const handleContinue = () => {
    sessionStorage.setItem("ob_barriers", JSON.stringify(selected));
    navigate("/onboarding/mealplan-optin");
  };

  return (
    <OnboardingLayout step="barriers" headerTitle="Goals" activeSegment={5} totalSegments={9}>
      <div className="flex flex-col flex-1 px-6 pt-8 pb-10">
        <OnboardingHeadline className="mb-2">
          In the past, what were barriers to achieving your goals?
        </OnboardingHeadline>
        <OnboardingSubtext className="mb-6">
          Select all that apply.
        </OnboardingSubtext>

        <div className="flex flex-col gap-2 flex-1">
          {BARRIERS.map((b) => {
            const sel = selected.includes(b);
            return (
              <button
                key={b}
                onClick={() => toggle(b)}
                className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-left transition-all active:scale-[0.98]"
                style={{
                  background: sel ? "rgba(82,183,136,0.12)" : "var(--muted)",
                  border: `1.5px solid ${sel ? "#52B788" : "transparent"}`,
                }}
              >
                <div
                  className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-all"
                  style={{
                    background: sel ? "#52B788" : "transparent",
                    border: `1.5px solid ${sel ? "#52B788" : "rgba(255,255,255,0.2)"}`,
                  }}
                >
                  {sel && (
                    <svg width="11" height="9" viewBox="0 0 11 9" fill="none">
                      <path d="M1 4.5l3 3.5L10 1" stroke="#0d1f13" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span className="text-sm" style={{ color: sel ? "#52B788" : "var(--foreground)" }}>
                  {b}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-6">
          <OnboardingCTA onClick={handleContinue}>
            Next
          </OnboardingCTA>
        </div>
      </div>
    </OnboardingLayout>
  );
}
