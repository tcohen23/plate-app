/**
 * Screen 14 — Username picker
 * Auto-suggestions + uniqueness check (debounced)
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { OnboardingLayout, OnboardingHeadline, OnboardingSubtext, OnboardingCTA } from "./OnboardingLayout";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

export function Step14Username() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [checking, setChecking] = useState(false);
  const [debouncedUsername, setDebouncedUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const claimUsername = useMutation(api.onboarding.claimUsername);
  const suggestUsernames = useMutation(api.onboarding.suggestUsernames);
  const [suggestions, setSuggestions] = useState<string[]>([]);

  const available = useQuery(
    api.onboarding.checkUsernameAvailable,
    debouncedUsername.length >= 3 ? { username: debouncedUsername } : "skip"
  );

  const firstName = sessionStorage.getItem("ob_firstName") || "user";

  // Load suggestions on mount
  useEffect(() => {
    suggestUsernames({ firstName }).then(setSuggestions).catch(() => {});
  }, []);

  // Debounce username input
  useEffect(() => {
    setChecking(true);
    const t = setTimeout(() => {
      setDebouncedUsername(username.toLowerCase().replace(/[^a-z0-9_]/g, ""));
      setChecking(false);
    }, 400);
    return () => clearTimeout(t);
  }, [username]);

  const isValid = /^[a-z0-9_]{3,20}$/.test(username.toLowerCase()) && available === true;

  const handleContinue = async () => {
    if (!isValid) return;
    setLoading(true);
    setError("");
    try {
      await claimUsername({ username });
      navigate("/onboarding/consent");
    } catch (err: any) {
      setError(err?.message || "Username unavailable. Try another.");
    } finally {
      setLoading(false);
    }
  };

  const statusIcon = () => {
    if (username.length < 3) return null;
    if (checking || available === undefined) return <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />;
    if (available === true) return <CheckCircle className="w-4 h-4" style={{ color: "#52B788" }} />;
    return <XCircle className="w-4 h-4" style={{ color: "#ef4444" }} />;
  };

  return (
    <OnboardingLayout step="username">
      <div className="flex flex-col flex-1 px-6 pt-8 pb-10">
        <OnboardingHeadline className="mb-2">Pick a username</OnboardingHeadline>
        <OnboardingSubtext className="mb-6">
          This is how others will see you on PLATE.
        </OnboardingSubtext>

        {/* Input */}
        <div className="relative mb-2">
          <span
            className="absolute left-4 top-1/2 -translate-y-1/2 text-base text-muted-foreground"
            style={{ userSelect: "none" }}
          >
            @
          </span>
          <input
            type="text"
            placeholder="yourname"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""));
              setError("");
            }}
            maxLength={20}
            className="w-full pl-8 pr-10 py-4 rounded-2xl text-base outline-none"
            style={{
              background: "var(--muted)",
              border: `1.5px solid ${
                username.length >= 3
                  ? available === true
                    ? "#52B788"
                    : available === false
                    ? "#ef4444"
                    : "transparent"
                  : "transparent"
              }`,
              color: "var(--foreground)",
            }}
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2">{statusIcon()}</span>
        </div>

        {username.length > 0 && username.length < 3 && (
          <p className="text-xs text-muted-foreground mb-3 px-1">At least 3 characters</p>
        )}
        {available === false && username.length >= 3 && (
          <p className="text-xs mb-3 px-1" style={{ color: "#ef4444" }}>That username is taken</p>
        )}
        {error && <p className="text-xs mb-3 px-1" style={{ color: "#ef4444" }}>{error}</p>}

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">
              Suggestions
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => setUsername(s)}
                  className="px-3 py-1.5 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background: username === s ? "rgba(82,183,136,0.15)" : "var(--muted)",
                    border: `1.5px solid ${username === s ? "#52B788" : "transparent"}`,
                    color: username === s ? "#52B788" : "var(--foreground)",
                  }}
                >
                  @{s}
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground mt-3 px-1">
          3–20 characters. Letters, numbers, underscores only.
        </p>

        <div className="mt-auto pt-6">
          <OnboardingCTA onClick={handleContinue} disabled={!isValid} loading={loading}>
            Continue
          </OnboardingCTA>
        </div>
      </div>
    </OnboardingLayout>
  );
}
