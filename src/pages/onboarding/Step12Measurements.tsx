/**
 * Screen 12 — Height, current weight, goal weight
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { OnboardingLayout, OnboardingHeadline, OnboardingSubtext, OnboardingCTA } from "./OnboardingLayout";

export function Step12Measurements() {
  const navigate = useNavigate();
  const [heightFt, setHeightFt] = useState(() => sessionStorage.getItem("ob_heightFt") || "");
  const [heightIn, setHeightIn] = useState(() => sessionStorage.getItem("ob_heightIn") || "0");
  const [currentWeight, setCurrentWeight] = useState(() => sessionStorage.getItem("ob_currentWeight") || "");
  const [goalWeight, setGoalWeight] = useState(() => sessionStorage.getItem("ob_goalWeight") || "");

  const isValid =
    heightFt && parseInt(heightFt) >= 3 && parseInt(heightFt) <= 8 &&
    currentWeight && parseFloat(currentWeight) > 50 &&
    goalWeight && parseFloat(goalWeight) > 50;

  const handleContinue = () => {
    sessionStorage.setItem("ob_heightFt", heightFt);
    sessionStorage.setItem("ob_heightIn", heightIn);
    sessionStorage.setItem("ob_currentWeight", currentWeight);
    sessionStorage.setItem("ob_goalWeight", goalWeight);
    // Check if weight goal — show weekly goal screen
    const goals: string[] = JSON.parse(sessionStorage.getItem("ob_goals") || "[]");
    const hasWeightGoal = goals.includes("lose_weight") || goals.includes("gain_weight");
    navigate(hasWeightGoal ? "/onboarding/weekly-goal" : "/onboarding/habits");
  };

  const inputStyle = (filled: boolean) => ({
    background: "var(--muted)",
    border: `1.5px solid ${filled ? "#52B788" : "transparent"}`,
    color: "var(--foreground)",
  });

  return (
    <OnboardingLayout step="measurements" headerTitle="You" activeSegment={8} totalSegments={9}>
      <div className="flex flex-col flex-1 px-6 pt-8 pb-10">
        <OnboardingHeadline className="mb-2">Your measurements</OnboardingHeadline>
        <OnboardingSubtext className="mb-6">
          This powers your calorie and macro calculations.
        </OnboardingSubtext>

        {/* Height */}
        <div className="mb-5">
          <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2 block">
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
          <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2 block">
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
          <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2 block">
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
