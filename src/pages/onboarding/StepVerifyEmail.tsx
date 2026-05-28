/**
 * Screen 18.5 — Email OTP Verification
 * Route: /onboarding/verify-email
 * 
 * Separated from create-account step. Uses sessionStorage for email + password.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { OnboardingLayout } from "./OnboardingLayout";
import { trackSignup } from "@/lib/posthog";

export function StepVerifyEmail() {
  const navigate = useNavigate();
  const { signIn } = useAuthActions();
  const createProfile = useMutation(api.onboarding.createMinimalProfile);
  const resendOtpAction = useAction(api.authHelpers.resendOtp);

  const email = sessionStorage.getItem("ob_email") || "";
  const firstName = sessionStorage.getItem("ob_firstName") || "there";

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);
  const [autoResending, setAutoResending] = useState(false);

  // 6 individual boxes
  const chars = otp.padEnd(6, " ").split("");

  const handleInput = (val: string) => {
    setOtp(val.replace(/\D/g, "").slice(0, 6));
    setError("");
  };

  const handleVerify = async () => {
    if (otp.length !== 6) return;
    setLoading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.set("flow", "email-verification");
      formData.set("email", email);
      formData.set("code", otp);
      const result = await signIn("password", formData);
      // If verification failed silently (signingIn:false), auto-resend a fresh code
      if (!result || !result.signingIn) {
        setOtp("");
        setAutoResending(true);
        try {
          await resendOtpAction({ email });
          setError("That code didn't work — a fresh code was just sent to your email.");
          setResent(true);
          setTimeout(() => setResent(false), 5000);
        } catch {
          setError("Incorrect or expired code. Tap \"Resend code\" to get a fresh code.");
        } finally {
          setAutoResending(false);
        }
        setLoading(false);
        return;
      }
      await createProfile({ firstName });
      trackSignup("email");
      navigate("/onboarding/building-plan");
    } catch (err: any) {
      const msg = (err?.message || "").toLowerCase();
      if (msg.includes("rate") || msg.includes("too many")) {
        setError("Too many attempts. Please wait a few minutes and try again.");
        setLoading(false);
        return;
      }
      // For all other failures (expired, invalid, server error, etc.)
      // auto-resend a fresh code so the user can just enter the new one
      setOtp("");
      setAutoResending(true);
      try {
        await resendOtpAction({ email });
        setError("That code didn't work — a fresh code was just sent to your email.");
        setResent(true);
        setTimeout(() => setResent(false), 5000);
      } catch {
        setError("Incorrect or expired code. Tap \"Resend code\" to get a fresh code.");
      } finally {
        setAutoResending(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    setError("");
    setOtp("");
    try {
      // Use our custom resendOtp action: generates fresh code + sends email directly
      await resendOtpAction({ email });
      setResent(true);
      setTimeout(() => setResent(false), 4000);
    } catch (err: any) {
      const msg = (err?.message || "").toLowerCase();
      if (msg.includes("no account")) {
        setError("No account found for this email. Please go back and sign up again.");
      } else {
        setError("Could not send code. Check your connection and try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <OnboardingLayout step="verify-email" darkBg>
      <div
        className="flex flex-col flex-1 px-6 pt-14 pb-10"
        style={{ background: "#000", minHeight: "100vh" }}
      >
        {/* Icon */}
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
          style={{ background: "rgba(82,183,136,0.12)" }}
        >
          <span className="text-2xl">📬</span>
        </div>

        <h1 className="font-serif text-2xl text-white leading-tight mb-2">
          Check your email
        </h1>
        <p className="text-sm mb-8" style={{ color: "rgba(255,255,255,0.5)" }}>
          We sent a 6-digit code to{" "}
          <span style={{ color: "#52B788" }}>{email}</span>.
          Enter it below to verify your account.
        </p>

        {/* 6-box OTP input */}
        <div className="relative mb-4">
          {/* Hidden actual input for keyboard */}
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            value={otp}
            onChange={(e) => handleInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && otp.length === 6) handleVerify();
            }}
            className="absolute inset-0 w-full opacity-0 z-10"
            maxLength={6}
            autoFocus
          />
          {/* Visual boxes */}
          <div className="flex gap-2 justify-center">
            {chars.map((c, i) => (
              <div
                key={i}
                className="w-11 h-14 rounded-xl flex items-center justify-center text-xl font-bold transition-all"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: `1.5px solid ${
                    i === otp.length
                      ? "#52B788"
                      : i < otp.length
                      ? "rgba(82,183,136,0.5)"
                      : "rgba(255,255,255,0.1)"
                  }`,
                  color: "white",
                }}
              >
                {c.trim() ? c : ""}
              </div>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-sm px-1 mb-2" style={{ color: "#ef4444" }}>{error}</p>
        )}

        <p className="text-xs mb-2" style={{ color: "rgba(255,255,255,0.35)" }}>
          Check your spam folder if you don't see it.
        </p>

        <div className="mt-auto">
          <button
            onClick={handleVerify}
            disabled={otp.length !== 6 || loading}
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
                {autoResending ? "Sending fresh code…" : "Verifying…"}
              </span>
            ) : "Verify & Continue"}
          </button>

          <button
            onClick={handleResend}
            disabled={loading}
            className="block mx-auto text-sm text-center mt-4 underline"
            style={{ color: resent ? "#52B788" : "rgba(82,183,136,0.7)" }}
          >
            {resent ? "Code sent! ✓" : "Resend code"}
          </button>

          <button
            onClick={() => navigate("/onboarding/create-account")}
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
