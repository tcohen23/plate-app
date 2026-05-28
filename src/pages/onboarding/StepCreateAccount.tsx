/**
 * Screen 18 — Create Account (email + password + ToS)
 * Route: /onboarding/create-account
 * 
 * Initiates sign-up → sends OTP → navigates to /onboarding/verify-email
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";
import { OnboardingLayout } from "./OnboardingLayout";
import { Eye, EyeOff } from "lucide-react";

export function StepCreateAccount() {
  const navigate = useNavigate();
  const { signIn } = useAuthActions();
  const { isAuthenticated } = useConvexAuth();

  // If user already authenticated (e.g. via Google/Apple OAuth), skip straight to username
  useEffect(() => {
    if (isAuthenticated) {
      navigate("/onboarding/username", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const [email, setEmail] = useState(() => sessionStorage.getItem("ob_email") || "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [tosChecked, setTosChecked] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const firstName = sessionStorage.getItem("ob_firstName") || "there";

  // Password strength check — 10+ chars per brief
  const passwordStrength = (() => {
    if (password.length === 0) return null;
    if (password.length < 8) return "weak";
    if (password.length < 10) return "fair";
    const hasUpper = /[A-Z]/.test(password);
    const hasNum = /\d/.test(password);
    const hasSpecial = /[^A-Za-z0-9]/.test(password);
    const extras = [hasUpper, hasNum, hasSpecial].filter(Boolean).length;
    if (extras >= 2 && password.length >= 10) return "strong";
    return "good";
  })();

  const strengthColor = {
    weak: "#ef4444",
    fair: "#F5A623",
    good: "#52B788",
    strong: "#52B788",
  }[passwordStrength || "weak"] || "transparent";

  const strengthWidth = {
    weak: "25%",
    fair: "50%",
    good: "75%",
    strong: "100%",
  }[passwordStrength || "weak"] || "0%";

  const isValid = email.includes("@") && password.length >= 10 && tosChecked;

  const handleSignUp = async () => {
    if (!isValid) return;
    setLoading(true);
    setError("");
    try {
      sessionStorage.setItem("ob_email", email);
      sessionStorage.setItem("ob_password", password);
      const fd = new FormData();
      fd.set("flow", "signUp");
      fd.set("email", email);
      fd.set("password", password);
      fd.set("name", firstName);
      const result = await signIn("password", fd);
      // If signIn returned tokens immediately, the account was already verified —
      // skip the OTP step and go straight to the next onboarding step.
      if (result && result.signingIn) {
        navigate("/onboarding/building-plan");
        return;
      }
      // OTP sent — go to verification screen
      navigate("/onboarding/verify-email");
    } catch (err: any) {
      const msg = (err?.message || "").toLowerCase();
      if (msg.includes("already") || msg.includes("exists") || msg.includes("taken")) {
        setError("An account already exists with this email. Sign in instead.");
      } else if (msg.includes("invalid") || msg.includes("password")) {
        setError("Invalid email or password format. Please check and try again.");
      } else {
        // OTP might have still been sent — navigate anyway
        navigate("/onboarding/verify-email");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <OnboardingLayout step="create-account" darkBg>
      <div
        className="flex flex-col flex-1 px-6 pt-14 pb-10"
        style={{ background: "#000", minHeight: "100vh" }}
      >
        {/* Icon */}
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
          style={{ background: "rgba(82,183,136,0.12)" }}
        >
          <span className="text-2xl">🌱</span>
        </div>

        <h1 className="font-serif text-2xl text-white leading-tight mb-2">
          {firstName && firstName !== "there" ? `Almost there, ${firstName}!` : "Almost there!"}
        </h1>
        <p className="text-sm mb-8" style={{ color: "rgba(255,255,255,0.5)" }}>
          Create your account to save your plan. We'll never share your info.
        </p>

        {/* Email */}
        <div className="mb-4">
          <input
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(""); }}
            className="w-full px-4 py-4 rounded-2xl text-base outline-none"
            style={{
              background: "var(--muted)",
              border: `1.5px solid ${email.includes("@") ? "#52B788" : "transparent"}`,
              color: "var(--foreground)",
            }}
          />
        </div>

        {/* Password */}
        <div className="mb-2 relative">
          <input
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Password (10+ characters)"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(""); }}
            className="w-full px-4 py-4 rounded-2xl text-base outline-none pr-12"
            style={{
              background: "var(--muted)",
              border: `1.5px solid ${password.length >= 10 ? "#52B788" : "transparent"}`,
              color: "var(--foreground)",
            }}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {/* Password strength */}
        {password.length > 0 && (
          <div className="mb-4 px-1">
            <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: strengthWidth, background: strengthColor }}
              />
            </div>
            <p className="text-xs mt-1" style={{ color: strengthColor }}>
              {passwordStrength === "weak" && "Too short"}
              {passwordStrength === "fair" && "Fair, add numbers or symbols"}
              {passwordStrength === "good" && "Good"}
              {passwordStrength === "strong" && "Strong ✓"}
            </p>
          </div>
        )}

        {/* ToS */}
        <label className="flex items-start gap-3 cursor-pointer mb-2">
          <div className="mt-0.5 flex-shrink-0">
            <input
              type="checkbox"
              checked={tosChecked}
              onChange={(e) => setTosChecked(e.target.checked)}
              className="sr-only"
            />
            <div
              className="w-5 h-5 rounded flex items-center justify-center transition-all"
              style={{
                background: tosChecked ? "#52B788" : "var(--muted)",
                border: `1.5px solid ${tosChecked ? "#52B788" : "var(--border)"}`,
              }}
            >
              {tosChecked && (
                <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                  <path d="M1 5l3.5 4L11 1" stroke="#0d1f13" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
          </div>
          <span className="text-sm text-muted-foreground leading-relaxed">
            I agree to PLATE's{" "}
            <a href="/privacy" target="_blank" className="underline" style={{ color: "#52B788" }}>
              Terms &amp; Privacy Policy
            </a>
          </span>
        </label>

        {error && (
          <p className="text-sm mt-2 px-1" style={{ color: "#ef4444" }}>{error}</p>
        )}

        <div className="mt-auto pt-6">
          <button
            onClick={handleSignUp}
            disabled={!isValid || loading}
            className="w-full font-bold text-base rounded-full transition-all active:scale-[0.98] disabled:opacity-50"
            style={{
              background: "#52B788",
              color: "#0d1f13",
              height: "56px",
            }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Creating account...
              </span>
            ) : "Create Account"}
          </button>

          <p className="text-xs text-center text-muted-foreground mt-4">
            Already have an account?{" "}
            <button
              onClick={() => navigate("/login")}
              className="underline"
              style={{ color: "#52B788" }}
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </OnboardingLayout>
  );
}
