/**
 * Screen 11 — Personal stats (sex, age, country/ZIP)
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { OnboardingLayout, OnboardingHeadline, OnboardingSubtext, OnboardingCTA } from "./OnboardingLayout";

const SEX_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
  { value: "prefer_not_say", label: "Prefer not to say" },
];

export function Step11Stats() {
  const navigate = useNavigate();
  const [sex, setSex] = useState(() => sessionStorage.getItem("ob_sex") || "");
  const [age, setAge] = useState(() => sessionStorage.getItem("ob_age") || "");
  const [country, setCountry] = useState(() => sessionStorage.getItem("ob_country") || "US");
  const [zip, setZip] = useState(() => sessionStorage.getItem("ob_zip") || "");

  const isUS = country === "US";
  const isValid = sex && age && parseInt(age) >= 13 && parseInt(age) <= 100 && (isUS ? zip.length >= 5 : true);

  const handleContinue = () => {
    sessionStorage.setItem("ob_sex", sex);
    sessionStorage.setItem("ob_age", age);
    sessionStorage.setItem("ob_country", country);
    sessionStorage.setItem("ob_zip", zip);
    navigate("/onboarding/measurements");
  };

  return (
    <OnboardingLayout step="stats">
      <div className="flex flex-col flex-1 px-6 pt-8 pb-10">
        <OnboardingHeadline className="mb-2">A bit about you</OnboardingHeadline>
        <OnboardingSubtext className="mb-6">
          Used only to calculate your calorie targets. Never shared.
        </OnboardingSubtext>

        {/* Sex */}
        <div className="mb-5">
          <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2 block">
            Biological sex
          </label>
          <div className="grid grid-cols-2 gap-2">
            {SEX_OPTIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => setSex(o.value)}
                className="py-3 px-4 rounded-xl text-sm font-medium text-center transition-all"
                style={{
                  background: sex === o.value ? "rgba(82,183,136,0.15)" : "var(--muted)",
                  border: `1.5px solid ${sex === o.value ? "#52B788" : "transparent"}`,
                  color: sex === o.value ? "#52B788" : "var(--foreground)",
                }}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {/* Age */}
        <div className="mb-5">
          <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2 block">
            Age
          </label>
          <input
            type="number"
            inputMode="numeric"
            placeholder="e.g. 28"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            min={13}
            max={100}
            className="w-full px-4 py-3.5 rounded-xl text-base outline-none"
            style={{
              background: "var(--muted)",
              border: `1.5px solid ${age ? "#52B788" : "transparent"}`,
              color: "var(--foreground)",
            }}
          />
        </div>

        {/* Country */}
        <div className="mb-5">
          <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2 block">
            Country
          </label>
          <select
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-full px-4 py-3.5 rounded-xl text-base outline-none appearance-none"
            style={{
              background: "var(--muted)",
              border: "1.5px solid #52B788",
              color: "var(--foreground)",
            }}
          >
            <option value="US">🇺🇸 United States</option>
            <option value="CA">🇨🇦 Canada</option>
            <option value="GB">🇬🇧 United Kingdom</option>
            <option value="AU">🇦🇺 Australia</option>
            <option value="NZ">🇳🇿 New Zealand</option>
            <option value="IE">🇮🇪 Ireland</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        {/* ZIP — only for US */}
        {isUS && (
          <div className="mb-5">
            <label className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2 block">
              ZIP code
            </label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="e.g. 90210"
              value={zip}
              onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
              maxLength={5}
              className="w-full px-4 py-3.5 rounded-xl text-base outline-none"
              style={{
                background: "var(--muted)",
                border: `1.5px solid ${zip.length >= 5 ? "#52B788" : "transparent"}`,
                color: "var(--foreground)",
              }}
            />
          </div>
        )}

        <div className="mt-auto pt-4">
          <OnboardingCTA onClick={handleContinue} disabled={!isValid}>
            Continue
          </OnboardingCTA>
        </div>
      </div>
    </OnboardingLayout>
  );
}
