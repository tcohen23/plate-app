/**
 * Screen 13 — Personal Stats Part 1 (Sex, Age, Country, ZIP)
 * Route: /onboarding/about-you
 * Country + ZIP are optional — helps personalize grocery list.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { OnboardingLayout, OnboardingHeadline, OnboardingCTA } from "./OnboardingLayout";
import { Info } from "lucide-react";

export function StepAboutYou() {
  const navigate = useNavigate();

  const [sex, setSex] = useState(() => sessionStorage.getItem("ob_sex") || "");
  const [age, setAge] = useState(() => sessionStorage.getItem("ob_age") || "");
  const [country, setCountry] = useState(() => sessionStorage.getItem("ob_country") || "");
  const [zip, setZip] = useState(() => sessionStorage.getItem("ob_zip") || "");
  const [showSexInfo, setShowSexInfo] = useState(false);

  // Only sex + age are required
  const isValid = sex && age && parseInt(age) >= 13 && parseInt(age) <= 100;

  const handleNext = () => {
    if (!isValid) return;
    sessionStorage.setItem("ob_sex", sex);
    sessionStorage.setItem("ob_age", age);
    if (country) sessionStorage.setItem("ob_country", country);
    if (zip) sessionStorage.setItem("ob_zip", zip);
    navigate("/onboarding/measurements");
  };

  return (
    <OnboardingLayout step="about-you" headerTitle="You" activeSegment={7} totalSegments={9}>
      <div className="flex flex-col flex-1 px-6 pt-8 pb-10">
        <OnboardingHeadline className="mb-8">
          Tell us a little bit about yourself
        </OnboardingHeadline>

        {/* Sex */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
            <p className="text-sm font-medium text-foreground">
              Please select which sex we should use to calculate your calorie needs:
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
              We use biological sex at birth to calculate your Basal Metabolic Rate (BMR) using the Mifflin-St Jeor formula. This is the most accurate public formula available.
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
        <div className="mb-6">
          <label className="block text-sm font-medium text-foreground mb-2">
            How old are you?
          </label>
          <input
            type="number"
            inputMode="numeric"
            min={13}
            max={100}
            placeholder="Age"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className="w-full px-4 py-4 rounded-2xl text-base outline-none"
            style={{
              background: "var(--muted)",
              border: `1.5px solid ${age && parseInt(age) >= 13 ? "#52B788" : "transparent"}`,
              color: "var(--foreground)",
            }}
          />
          <p className="text-xs mt-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>
            We use sex at birth and age to calculate an accurate goal for you.
          </p>
        </div>

        {/* Country — optional */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-foreground">
              Where do you live?
            </label>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: "rgba(82,183,136,0.1)", color: "#52B788" }}>
              Optional
            </span>
          </div>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-full px-4 py-4 rounded-2xl text-base outline-none appearance-none"
            style={{
              background: "var(--muted)",
              border: `1.5px solid ${country ? "#52B788" : "transparent"}`,
              color: country ? "var(--foreground)" : "rgba(255,255,255,0.35)",
            }}
          >
            <option value="">Select country…</option>
            <option value="United States">🇺🇸 United States</option>
            <option value="Canada">🇨🇦 Canada</option>
            <option value="United Kingdom">🇬🇧 United Kingdom</option>
            <option value="Australia">🇦🇺 Australia</option>
            <option value="Germany">🇩🇪 Germany</option>
            <option value="France">🇫🇷 France</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {/* ZIP — optional */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-foreground">
              ZIP / Postal Code
            </label>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: "rgba(82,183,136,0.1)", color: "#52B788" }}>
              Optional
            </span>
          </div>
          <input
            type="text"
            inputMode="numeric"
            maxLength={10}
            placeholder="e.g. 90210"
            value={zip}
            onChange={(e) => setZip(e.target.value)}
            className="w-full px-4 py-4 rounded-2xl text-base outline-none"
            style={{
              background: "var(--muted)",
              border: `1.5px solid ${zip ? "#52B788" : "transparent"}`,
              color: "var(--foreground)",
            }}
          />
          <p className="text-xs mt-1.5 flex items-center gap-1" style={{ color: "rgba(255,255,255,0.4)" }}>
            🛒 Helps us find the best grocery deals near you for a more accurate grocery list.
          </p>
        </div>

        <div className="mt-auto">
          <OnboardingCTA onClick={handleNext} disabled={!isValid}>
            Next
          </OnboardingCTA>
        </div>
      </div>
    </OnboardingLayout>
  );
}
