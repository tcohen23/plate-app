/**
 * Screen 2 — First name capture
 * Simple, warm, no account yet.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { OnboardingLayout, OnboardingHeadline, OnboardingSubtext, OnboardingCTA } from "./OnboardingLayout";

export function Step02Name() {
  const navigate = useNavigate();
  const [name, setName] = useState(() => sessionStorage.getItem("ob_firstName") || "");

  const handleContinue = () => {
    if (!name.trim()) return;
    sessionStorage.setItem("ob_firstName", name.trim());
    navigate("/onboarding/goals");
  };

  return (
    <OnboardingLayout step="name">
      <div className="flex flex-col flex-1 px-6 pt-8 pb-10">
        <OnboardingHeadline className="mb-3">
          What should we call you?
        </OnboardingHeadline>
        <OnboardingSubtext className="mb-10">
          We'll personalise your plan around your goals and lifestyle.
        </OnboardingSubtext>

        <input
          type="text"
          autoFocus
          placeholder="Your first name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleContinue()}
          maxLength={40}
          className="w-full px-4 py-4 rounded-2xl text-lg outline-none transition-all"
          style={{
            background: "var(--muted)",
            border: "1.5px solid",
            borderColor: name ? "#52B788" : "transparent",
            color: "var(--foreground)",
          }}
        />

        <div className="mt-auto pt-8">
          <OnboardingCTA onClick={handleContinue} disabled={!name.trim()}>
            Continue
          </OnboardingCTA>
        </div>
      </div>
    </OnboardingLayout>
  );
}
