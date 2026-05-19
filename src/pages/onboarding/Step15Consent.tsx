/**
 * Screen 15 — Personalization & privacy consent
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { OnboardingLayout, OnboardingHeadline, OnboardingSubtext, OnboardingCTA } from "./OnboardingLayout";

export function Step15Consent() {
  const navigate = useNavigate();
  const saveStep = useMutation(api.onboarding.saveStep);
  const [reminders, setReminders] = useState(true);
  const [emailOptIn, setEmailOptIn] = useState(true);
  const [personalization, setPersonalization] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    setLoading(true);
    try {
      await saveStep({
        step: "reveal",
        data: {
          reminderOptIn: reminders,
          emailOptIn,
          personalizationConsent: personalization,
        },
      });
      navigate("/onboarding/reveal");
    } catch {
      navigate("/onboarding/reveal");
    } finally {
      setLoading(false);
    }
  };

  const ToggleRow = ({
    label,
    sub,
    value,
    onChange,
  }: {
    label: string;
    sub: string;
    value: boolean;
    onChange: (v: boolean) => void;
  }) => (
    <div className="flex items-start justify-between gap-4 py-4 border-b border-border/50 last:border-0">
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
      </div>
      <button
        onClick={() => onChange(!value)}
        className="relative flex-shrink-0 w-11 h-6 rounded-full transition-colors mt-0.5"
        style={{ background: value ? "#52B788" : "var(--muted)" }}
      >
        <span
          className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform"
          style={{ transform: value ? "translateX(20px)" : "translateX(0)" }}
        />
      </button>
    </div>
  );

  return (
    <OnboardingLayout step="consent">
      <div className="flex flex-col flex-1 px-6 pt-8 pb-10">
        <OnboardingHeadline className="mb-2">One last thing</OnboardingHeadline>
        <OnboardingSubtext className="mb-8">
          Choose how PLATE uses your data. You can change these anytime in Settings.
        </OnboardingSubtext>

        <div className="rounded-2xl overflow-hidden mb-6" style={{ background: "var(--muted)" }}>
          <div className="px-4">
            <ToggleRow
              label="Personalised recommendations"
              sub="Use my data to improve meal suggestions and insights."
              value={personalization}
              onChange={setPersonalization}
            />
            <ToggleRow
              label="Email tips & updates"
              sub="Occasional nutrition tips, feature updates, and offers."
              value={emailOptIn}
              onChange={setEmailOptIn}
            />
            <ToggleRow
              label="Meal reminders"
              sub="Nudges to log meals and hit your daily targets."
              value={reminders}
              onChange={setReminders}
            />
          </div>
        </div>

        <p className="text-xs text-muted-foreground mb-8 px-1 text-center">
          Your data is never sold. Read our{" "}
          <a href="/privacy" target="_blank" className="underline" style={{ color: "#52B788" }}>
            Privacy Policy
          </a>
          .
        </p>

        <div className="mt-auto">
          <OnboardingCTA onClick={handleContinue} loading={loading}>
            Continue
          </OnboardingCTA>
        </div>
      </div>
    </OnboardingLayout>
  );
}
