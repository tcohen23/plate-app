/**
 * Screen 13 — Account creation: email + password + ToS
 * Flow: signUp → OTP verification email → verify → createProfile → navigate
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useConvexAuth } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { OnboardingLayout, OnboardingHeadline, OnboardingSubtext, OnboardingCTA } from "./OnboardingLayout";
import { trackSignup } from "@/lib/posthog";
import { Eye, EyeOff } from "lucide-react";

type FlowStep = "signup" | "verify";

export function Step13Account() {
  const navigate = useNavigate();
  const { signIn } = useAuthActions();
  const createProfile = useMutation(api.onboarding.createMinimalProfile);
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
  const [flowStep, setFlowStep] = useState<FlowStep>("signup");
  const [otp, setOtp] = useState("");

  const firstName = sessionStorage.getItem("ob_firstName") || "there";

  const isSignupValid = email.includes("@") && password.length >= 8 && tosChecked;
  const isOtpValid = otp.length === 6;

  // Step 1: Initiate sign-up → sends OTP email
  // If the account already exists (unverified), fall back to signIn which re-sends the OTP
  const handleSignUp = async () => {
    if (!isSignupValid) return;
    setLoading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.set("flow", "signUp");
      fd.set("email", email);
      fd.set("password", password);
      fd.set("name", firstName);
      await signIn("password", fd);
      setFlowStep("verify");
    } catch (signUpErr: any) {
      // Account already exists (from a previous broken attempt) — try signIn
      // For unverified accounts, signIn re-triggers the verification email
      try {
        const fd2 = new FormData();
        fd2.set("flow", "signIn");
        fd2.set("email", email);
        fd2.set("password", password);
        await signIn("password", fd2);
        setFlowStep("verify");
      } catch {
        const msg = signUpErr?.message || "";
        if (msg.toLowerCase().includes("already") || msg.toLowerCase().includes("exists")) {
          setError("An account exists with this email but the password may not match. Try signing in instead.");
        } else {
          setError("Something went wrong. Please try again.");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Resend verification code
  const handleResend = async () => {
    setLoading(true);
    setError("");
    setOtp("");
    try {
      const fd = new FormData();
      fd.set("flow", "signIn");
      fd.set("email", email);
      fd.set("password", password);
      await signIn("password", fd);
    } catch {
      // Ignore — might have succeeded in sending even if it threw
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP → fully authenticated → seed profile
  const handleVerify = async () => {
    if (!isOtpValid) return;
    setLoading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.set("flow", "email-verification");
      formData.set("email", email);
      formData.set("code", otp);
      await signIn("password", formData);
      await createProfile({ firstName });
      sessionStorage.setItem("ob_email", email);
      trackSignup("email");
      import("@/lib/metaPixel").then(m => m.trackMetaRegistration());
      navigate("/onboarding/username");
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.toLowerCase().includes("expired") || msg.toLowerCase().includes("invalid")) {
        setError("Invalid or expired code. Check your email and try again.");
      } else {
        setError("Verification failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Verify OTP screen ─────────────────────────────────────────────────────
  if (flowStep === "verify") {
    return (
      <OnboardingLayout step="account">
        <div className="flex flex-col flex-1 px-6 pt-8 pb-10">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mb-6"
            style={{ background: "rgba(82,183,136,0.12)" }}
          >
            <span className="text-2xl">📬</span>
          </div>

          <OnboardingHeadline className="mb-2">
            Check your email
          </OnboardingHeadline>
          <OnboardingSubtext className="mb-8">
            We sent a 6-digit code to <span style={{ color: "#52B788" }}>{email}</span>. Enter it below to verify your account.
          </OnboardingSubtext>

          {/* OTP input */}
          <div className="mb-4">
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              maxLength={6}
              value={otp}
              onChange={(e) => { setOtp(e.target.value.replace(/\D/g, "")); setError(""); }}
              className="w-full px-4 py-5 rounded-2xl text-center text-2xl font-mono tracking-[0.5em] outline-none"
              style={{
                background: "var(--muted)",
                border: `1.5px solid ${otp.length === 6 ? "#52B788" : "transparent"}`,
                color: "var(--foreground)",
              }}
            />
          </div>

          {error && (
            <p className="text-sm mt-2 px-1" style={{ color: "#ef4444" }}>{error}</p>
          )}

          <div className="mt-auto pt-6">
            <p className="text-xs text-center mb-4" style={{ color: "rgba(255,255,255,0.35)" }}>
              Check your spam folder if you don't see it.
            </p>

            <OnboardingCTA onClick={handleVerify} disabled={!isOtpValid} loading={loading}>
              Verify & continue
            </OnboardingCTA>

            <button
              onClick={handleResend}
              disabled={loading}
              className="block mx-auto text-sm text-center mt-4 underline"
              style={{ color: "#52B788" }}
            >
              Resend code
            </button>

            <button
              onClick={() => { setFlowStep("signup"); setOtp(""); setError(""); }}
              className="block mx-auto text-xs text-center mt-3"
              style={{ color: "rgba(255,255,255,0.4)" }}
            >
              Use a different email
            </button>
          </div>
        </div>
      </OnboardingLayout>
    );
  }

  // ── Sign-up screen ─────────────────────────────────────────────────────────
  return (
    <OnboardingLayout step="account">
      <div className="flex flex-col flex-1 px-6 pt-8 pb-10">
        <OnboardingHeadline className="mb-2">
          Create your account
        </OnboardingHeadline>
        <OnboardingSubtext className="mb-8">
          Your progress is saved. You won't lose a thing.
        </OnboardingSubtext>

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
        <div className="mb-4 relative">
          <input
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Password (8+ characters)"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(""); }}
            className="w-full px-4 py-4 rounded-2xl text-base outline-none pr-12"
            style={{
              background: "var(--muted)",
              border: `1.5px solid ${password.length >= 8 ? "#52B788" : "transparent"}`,
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
          <OnboardingCTA onClick={handleSignUp} disabled={!isSignupValid} loading={loading}>
            Create account
          </OnboardingCTA>

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
