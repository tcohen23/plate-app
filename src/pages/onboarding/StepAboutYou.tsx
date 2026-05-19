/**
 * Screen 13 — Personal Stats Part 1 (Sex, Age, Country, ZIP)
 * Route: /onboarding/about-you
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { OnboardingLayout, OnboardingHeadline, OnboardingCTA } from "./OnboardingLayout";
import { Info } from "lucide-react";

export function StepAboutYou() {
  const navigate = useNavigate();

  const [sex, setSex] = useState(() => sessionStorage.getItem("ob_sex") || "");
  const [age, setAge] = useState(() => sessionStorage.getItem("ob_age") || "");
  const [country, setCountry] = useState(() => sessionStorage.getItem("ob_country") || "United States");
  const [zip, setZip] = useState(() => sessionStorage.getItem("ob_zip") || "");
  const [showSexInfo, setShowSexInfo] = useState(false);

  const isNonUS = country && country !== "United States";
  const isValid = sex && age && parseInt(age) >= 13 && parseInt(age) <= 100 && country === "United States" && /^\d{5}$/.test(zip);

  const handleNext = () => {
    if (!isValid) return;
    sessionStorage.setItem("ob_sex", sex);
    sessionStorage.setItem("ob_age", age);
    sessionStorage.setItem("ob_country", country);
    sessionStorage.setItem("ob_zip", zip);
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

        {/* Country */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-foreground mb-2">
            Where do you live?
          </label>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-full px-4 py-4 rounded-2xl text-base outline-none appearance-none"
            style={{
              background: "var(--muted)",
              border: `1.5px solid ${country ? "#52B788" : "transparent"}`,
              color: "var(--foreground)",
            }}
          >
            <option value="United States">🇺🇸 United States</option>
            <option value="Canada">🇨🇦 Canada</option>
            <option value="United Kingdom">🇬🇧 United Kingdom</option>
            <option value="Australia">🇦🇺 Australia</option>
            <option value="Germany">🇩🇪 Germany</option>
            <option value="France">🇫🇷 France</option>
            <option value="Other">Other</option>
          </select>
          {!isNonUS && (
            <div
              className="flex items-center gap-2 mt-2 text-xs rounded-xl px-3 py-2"
              style={{ background: "rgba(82,183,136,0.08)", color: "#52B788" }}
            >
              🇺🇸 PLATE is currently only available in the United States. International support is coming soon.
            </div>
          )}
          {isNonUS && (
            <div
              className="flex items-center gap-2 mt-2 text-xs rounded-xl px-3 py-2"
              style={{ background: "rgba(245,166,35,0.1)", color: "#F5A623" }}
            >
              PLATE isn't available in your region yet.{" "}
              <a href="/waitlist" className="underline font-semibold">Join the waitlist</a>
            </div>
          )}
        </div>

        {/* ZIP */}
        {!isNonUS && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-foreground mb-2">
              ZIP/Postal Code
            </label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={5}
              placeholder="12345"
              value={zip}
              onChange={(e) => setZip(e.target.value.replace(/\D/g, ""))}
              className="w-full px-4 py-4 rounded-2xl text-base outline-none"
              style={{
                background: "var(--muted)",
                border: `1.5px solid ${/^\d{5}$/.test(zip) ? "#52B788" : "transparent"}`,
                color: "var(--foreground)",
              }}
            />
            <p className="text-xs mt-1.5" style={{ color: "rgba(255,255,255,0.4)" }}>
              Used for local grocery pricing. We find the cheapest store near you.
            </p>
          </div>
        )}

        <div className="mt-auto">
          <OnboardingCTA onClick={handleNext} disabled={!isValid}>
            Next
          </OnboardingCTA>
        </div>
      </div>
    </OnboardingLayout>
  );
}
