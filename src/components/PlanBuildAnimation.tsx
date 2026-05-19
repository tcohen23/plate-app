/**
 * PlanBuildAnimation — shown during onboarding plan generation.
 * Steps animate in one by one, each ticking off with a green checkmark.
 * After all steps complete, reveals the macro summary with a cinematic entrance.
 */
import { useEffect, useState } from "react";

interface PlanBuildAnimationProps {
  dietLabel: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  goal: string;
  onComplete: () => void;
}

function buildSteps(dietLabel: string): { label: string; ms: number }[] {
  return [
    { label: "Calculating your BMR", ms: 500 },
    { label: "Computing daily calorie target", ms: 900 },
    { label: "Setting protein and macro splits", ms: 1300 },
    { label: `Matching ${dietLabel} recipes`, ms: 1800 },
    { label: "Filtering for your allergens", ms: 2200 },
    { label: "Building your 7-day meal plan", ms: 2700 },
    { label: "Generating your grocery list", ms: 3200 },
  ];
}

export function PlanBuildAnimation({
  dietLabel,
  calories,
  protein,
  carbs,
  fat,
  goal,
  onComplete,
}: PlanBuildAnimationProps) {
  const steps = buildSteps(dietLabel);
  const [completedCount, setCompletedCount] = useState(0);
  const [showReveal, setShowReveal] = useState(false);
  const [revealVisible, setRevealVisible] = useState(false);

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    steps.forEach((step, i) => {
      timers.push(
        setTimeout(() => {
          setCompletedCount(i + 1);
        }, step.ms)
      );
    });

    // After all steps, show the reveal
    timers.push(
      setTimeout(() => {
        setShowReveal(true);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => setRevealVisible(true));
        });
      }, 3600)
    );

    // Hand off to parent after animation completes
    timers.push(
      setTimeout(() => {
        onComplete();
      }, 5200)
    );

    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goalLabels: Record<string, string> = {
    aggressive_cut: "Aggressive Cut",
    moderate_cut: "Moderate Cut",
    light_cut: "Light Cut",
    maintenance: "Maintenance",
    light_bulk: "Light Bulk",
    moderate_bulk: "Moderate Bulk",
    aggressive_bulk: "Aggressive Bulk",
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background px-8">
      {!showReveal ? (
        <div className="w-full max-w-sm">
          {/* Logo pulse */}
          <div className="text-center mb-10">
            <div
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
              style={{ background: "#52B788" }}
            >
              <span
                className="font-serif text-3xl font-bold"
                style={{ color: "#0a2018" }}
              >
                P
              </span>
            </div>
            <p className="text-sm text-muted-foreground tracking-wide">Building your plan</p>
          </div>

          {/* Steps list */}
          <div className="space-y-3">
            {steps.map((step, i) => {
              const done = i < completedCount;
              const active = i === completedCount;
              return (
                <div
                  key={i}
                  className="flex items-center gap-3 transition-all duration-300"
                  style={{ opacity: done || active ? 1 : 0.25 }}
                >
                  {/* Check / spinner / empty */}
                  <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                    {done ? (
                      <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5">
                        <circle cx="10" cy="10" r="9" fill="#52B788" />
                        <path
                          d="M6 10.5l2.5 2.5 5.5-5.5"
                          stroke="#0a2018"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : active ? (
                      <div
                        className="w-4 h-4 rounded-full border-2 animate-spin"
                        style={{ borderColor: "#52B788 transparent transparent transparent" }}
                      />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-border" />
                    )}
                  </div>

                  <span
                    className="text-sm transition-colors duration-300"
                    style={{ color: done ? "#52B788" : active ? "var(--foreground)" : "var(--muted-foreground)" }}
                  >
                    {step.label}
                    {done && (
                      <span
                        className="ml-1.5 text-xs"
                        style={{ color: "#52B788" }}
                      >
                        ✓
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ── Reveal ── */
        <div
          className="w-full max-w-sm transition-all duration-700"
          style={{
            opacity: revealVisible ? 1 : 0,
            transform: revealVisible ? "translateY(0) scale(1)" : "translateY(32px) scale(0.96)",
          }}
        >
          <div className="text-center mb-8">
            <div className="text-4xl mb-3">✦</div>
            <h1 className="font-serif text-3xl mb-2">Your plan is ready.</h1>
            <p className="text-muted-foreground text-sm">
              Built around your body, your goal, your life.
            </p>
          </div>

          {/* Macro card */}
          <div
            className="rounded-2xl p-6 mb-4"
            style={{ background: "#141414", border: "1px solid #2a2a2a" }}
          >
            <div className="text-xs uppercase tracking-widest mb-3" style={{ color: "#555" }}>
              Daily Target &middot; {goalLabels[goal] || goal}
            </div>
            <div
              className="font-serif mb-5"
              style={{ fontSize: 48, color: "#52B788", lineHeight: 1 }}
            >
              {calories}
              <span className="text-base font-sans ml-1" style={{ color: "#555" }}>
                kcal
              </span>
            </div>

            <div className="grid grid-cols-3 gap-0">
              {[
                { label: "Protein", value: protein },
                { label: "Carbs", value: carbs },
                { label: "Fat", value: fat },
              ].map((m, idx) => (
                <div
                  key={m.label}
                  className="py-3"
                  style={{
                    borderTop: "1px solid #2a2a2a",
                    textAlign: idx === 1 ? "center" : idx === 2 ? "right" : "left",
                  }}
                >
                  <div
                    className="text-[10px] uppercase tracking-widest mb-1"
                    style={{ color: "#555" }}
                  >
                    {m.label}
                  </div>
                  <div
                    className="font-serif text-xl"
                    style={{ color: "#ffffff" }}
                  >
                    {m.value}g
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Taking you to your dashboard...
          </p>
        </div>
      )}
    </div>
  );
}
