/**
 * Screen 16 — Calorie goal reveal
 * Mifflin-St Jeor equation, large serif number, animated count-up.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { OnboardingCTA } from "./OnboardingLayout";

function calculateCalories(): number {
  const sex = sessionStorage.getItem("ob_sex") || "other";
  const age = parseInt(sessionStorage.getItem("ob_age") || "30");
  const heightFt = parseInt(sessionStorage.getItem("ob_heightFt") || "5");
  const heightIn = parseInt(sessionStorage.getItem("ob_heightIn") || "6");
  const weightLb = parseFloat(sessionStorage.getItem("ob_currentWeight") || "160");
  const activity = sessionStorage.getItem("ob_activity") || "moderate";
  const goals: string[] = JSON.parse(sessionStorage.getItem("ob_goals") || "[]");

  // Convert to metric
  const heightCm = (heightFt * 12 + heightIn) * 2.54;
  const weightKg = weightLb * 0.453592;

  // Mifflin-St Jeor BMR
  let bmr: number;
  if (sex === "female") {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
  } else {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  }

  // Activity multiplier
  const multipliers: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };
  const tdee = bmr * (multipliers[activity] || 1.55);

  // Adjust for goal
  if (goals.includes("lose_weight")) return Math.round(tdee - 500);
  if (goals.includes("build_muscle")) return Math.round(tdee + 250);
  return Math.round(tdee);
}

function useCountUp(target: number, duration = 1200) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.round(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return count;
}

export function Step16Reveal() {
  const navigate = useNavigate();
  const [calories] = useState(() => calculateCalories());
  const displayCals = useCountUp(calories);

  const protein = Math.round((calories * 0.30) / 4);
  const carbs = Math.round((calories * 0.45) / 4);
  const fat = Math.round((calories * 0.25) / 9);

  const firstName = sessionStorage.getItem("ob_firstName") || "";

  const handleContinue = () => {
    sessionStorage.setItem("ob_calories", String(calories));
    sessionStorage.setItem("ob_protein", String(protein));
    sessionStorage.setItem("ob_carbs", String(carbs));
    sessionStorage.setItem("ob_fat", String(fat));
    // New flow: features showcase (no hard paywall)
    navigate("/onboarding/features");
  };

  return (
    <div
      className="min-h-screen flex flex-col max-w-lg lg:max-w-2xl mx-auto w-full"
      style={{ background: "#000" }}
    >
      {/* Top decoration */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-16">
        <p className="text-white/50 text-sm uppercase tracking-widest mb-4">
          {firstName ? `${firstName}'s daily target` : "Your daily target"}
        </p>

        {/* Big calorie number */}
        <div
          className="font-serif text-center mb-2 tabular-nums"
          style={{ fontSize: "clamp(5rem, 22vw, 8rem)", lineHeight: 1, color: "#52B788" }}
        >
          {displayCals.toLocaleString()}
        </div>
        <p className="text-white/60 text-xl font-light mb-12">calories / day</p>

        {/* Macro breakdown */}
        <div className="flex gap-6 mb-12">
          {[
            { label: "Protein", value: `${protein}g`, color: "#52B788" },
            { label: "Carbs", value: `${carbs}g`, color: "#7EC8A4" },
            { label: "Fat", value: `${fat}g`, color: "#A8D5BD" },
          ].map((m) => (
            <div key={m.label} className="text-center">
              <div className="text-xl font-bold" style={{ color: m.color }}>{m.value}</div>
              <div className="text-xs text-white/50 mt-0.5">{m.label}</div>
            </div>
          ))}
        </div>

        {/* Context note */}
        <div
          className="w-full rounded-2xl p-4 text-center"
          style={{ background: "rgba(82,183,136,0.1)", border: "1px solid rgba(82,183,136,0.2)" }}
        >
          <p className="text-white/70 text-sm leading-relaxed">
            Based on the Mifflin-St Jeor equation. Your plan adapts as you log real meals.
          </p>
        </div>
      </div>

      {/* CTA */}
      <div className="px-6 pb-10">
        <OnboardingCTA onClick={handleContinue}>
          See my plan →
        </OnboardingCTA>
      </div>
    </div>
  );
}
