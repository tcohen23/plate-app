/**
 * Slim Variant — Screen 5 of 8
 * Combines About You (sex + age) + Measurements (height + weight) into one screen.
 * Route: /onboarding/all-stats
 *
 * Part of Test 6 (ob_screen_count) Variant B (8-screen slim flow).
 * Navigates to /onboarding/create-account.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Info } from "lucide-react";
import { OnboardingLayout, OnboardingHeadline, OnboardingCTA } from "./OnboardingLayout";

export function StepAllStats() {
  const navigate = useNavigate();

  const [sex, setSex]               = useState(() => sessionStorage.getItem("ob_sex") || "");
  const [age, setAge]               = useState(() => sessionStorage.getItem("ob_age") || "");
  const [heightFt, setHeightFt]     = useState(() => sessionStorage.getItem("ob_heightFt") || "");
  const [heightIn, setHeightIn]     = useState(() => sessionStorage.getItem("ob_heightIn") || "0");
  const [currentWeight, setCurrentWeight] = useState(() => sessionStorage.getItem("ob_currentWeight") || "");
  const [goalWeight, setGoalWeight] = useState(() => sessionStorage.getItem("ob_goalWeight") || "");
  const [showSexInfo, setShowSexInfo] = useState(false);

  const isValid =
    sex &&
    age && parseInt(age) >= 13 && parseInt(age) <= 100 &&
    heightFt && parseInt(heightFt) >= 3 && parseInt(heightFt) <= 8 &&
    currentWeight && parseFloat(currentWeight) > 50 &&
    goalWeight && parseFloat(goalWeight) > 50;

  const handleContinue = () => {
    if (!isValid) return;
    sessionStorage.setItem("ob_sex", sex);
    sessionStorage.setItem("ob_age", age);
    sessionStorage.setItem("ob_heightFt", heightFt);
    sessionStorage.setItem("ob_heightIn", heightIn);
    sessionStorage.setItem("ob_currentWeight", currentWeight);
    sessionStorage.setItem("ob_goalWeight", goalWeight);
    navigate("/onboarding/create-account");
  };

  const inputStyle = (filled: boolean) => ({
    background: "var(--muted)",
    border: `1.5px solid ${filled ? "#52B788" : "transparent"}`,
    color: "var(--foreground)",
  });

  return (
    <OnboardingLayout step="about-you" headerTitle="You" activeSegment={4} totalSegments={6}>
      <div className="flex flex-col flex-1 px-6 pt-8 pb-10 overflow-y-auto">
        <OnboardingHeadline className="mb-6">
          A few quick stats
        </OnboardingHeadline>

        {/* Sex */}
        <div className="mb-5">
          <div className="flex items-center gap-2 mb-2">
            <p className="text-sm font-medium" style={{ color: "var(--foreground)" }}>
              Sex we should use to calculate your calorie needs:
            </p>
            <button
              type="button"
              onClick={() => setShowSexInfo(!showSexInfo)}
              className="flex-shrink-0"
              style={{ color: "#52B788" }}
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
          {showSexInfo && (
            <div
              className="text-xs rounded-xl px-4 py-3 mb-3 leading-relaxed"
              style={{ background: "rgba(82,183,136,0.1)", color: "rgba(82,183,136,0.9)" }}
            >
              We use biological sex at birth to calculate your BMR using the Mifflin-St Jeor formula — the most accurate public formula available.
            </div>
          )}
          <div className="flex gap-3">
            {["male", "female"].map((s) => (
              <button
                key={s}
                onClick={() => setSex(s)}
                className="flex-1 py-3.5 rounded-2xl font-semibold text-sm capitalize transition-all"
                style={{
                  background: sex === s ? "rgba(82,183,136,0.15)" : "var(--muted)",
                  border: `1.5px solid ${sex === s ? "#52B788" : "transparent"}`,
                  color: sex === s ? "#52B788" : "var(--foreground)",
                }}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Age */}
        <div className="mb-5">
          <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
            Age
          </label>
          <input
            type="number"
            inputMode="numeric"
            min={13}
            max={100}
            placeholder="e.g. 28"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className="w-full px-4 py-3.5 rounded-xl text-base outline-none"
            style={inputStyle(!!age && parseInt(age) >= 13)}
          />
        </div>

        {/* Height */}
        <div className="mb-5">
          <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
            Height
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <input
                type="number"
                inputMode="numeric"
                placeholder="5"
                value={heightFt}
                onChange={(e) => setHeightFt(e.target.value)}
                min={3}
                max={8}
                className="w-full px-4 py-3.5 rounded-xl text-base outline-none pr-10"
                style={inputStyle(!!heightFt)}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">ft</span>
            </div>
            <div className="relative">
              <select
                value={heightIn}
                onChange={(e) => setHeightIn(e.target.value)}
                className="w-full px-4 py-3.5 rounded-xl text-base outline-none appearance-none"
                style={inputStyle(true)}
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i} value={i}>{i}"</option>
                ))}
              </select>
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">in</span>
            </div>
          </div>
        </div>

        {/* Current weight */}
        <div className="mb-5">
          <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
            Current weight (lbs)
          </label>
          <div className="relative">
            <input
              type="number"
              inputMode="decimal"
              placeholder="e.g. 165"
              value={currentWeight}
              onChange={(e) => setCurrentWeight(e.target.value)}
              className="w-full px-4 py-3.5 rounded-xl text-base outline-none pr-12"
              style={inputStyle(!!currentWeight)}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">lbs</span>
          </div>
        </div>

        {/* Goal weight */}
        <div className="mb-5">
          <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
            Goal weight (lbs)
          </label>
          <div className="relative">
            <input
              type="number"
              inputMode="decimal"
              placeholder="e.g. 150"
              value={goalWeight}
              onChange={(e) => setGoalWeight(e.target.value)}
              className="w-full px-4 py-3.5 rounded-xl text-base outline-none pr-12"
              style={inputStyle(!!goalWeight)}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">lbs</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            Same as current weight = maintenance.
          </p>
        </div>

        <div className="mt-auto pt-4">
          <OnboardingCTA onClick={handleContinue} disabled={!isValid}>
            Continue
          </OnboardingCTA>
        </div>
      </div>
    </OnboardingLayout>
  );
}
