/**
 * Screen 2 — Sign Up Method
 * Route: /onboarding/signup
 * 
 * Options: Continue (email path), Google, Apple OAuth
 * Email path → /onboarding/name
 * Google/Apple → skip name, go to /onboarding/goals (pre-fill from provider)
 */
import { useNavigate } from "react-router-dom";
import { useAuthActions } from "@convex-dev/auth/react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ChevronLeft } from "lucide-react";
import { useState, useEffect } from "react";
import { trackSignup } from "@/lib/posthog";

export function StepSignup() {
  const navigate = useNavigate();
  const { signIn } = useAuthActions();
  const [oauthLoading, setOauthLoading] = useState<"google" | "apple" | null>(null);
  const profile = useQuery(api.profiles.getProfile);

  // If already logged in, redirect — must be in useEffect, not during render
  useEffect(() => {
    if (profile && (profile as any).onboardingCompletedAt) {
      navigate("/dashboard", { replace: true });
    }
  }, [profile, navigate]);

  const handleOAuth = async (provider: "google" | "apple") => {
    setOauthLoading(provider);
    try {
      trackSignup(provider);
      import("@/lib/metaPixel").then(m => m.trackMetaRegistration());
      await signIn(provider as any, {
        redirectTo: "/onboarding/goals",
      });
    } catch (err) {
      console.error("OAuth error", err);
      setOauthLoading(null);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col max-w-lg lg:max-w-2xl mx-auto w-full"
      style={{ background: "#000" }}
    >
      {/* Header */}
      <div className="flex items-center px-5 pt-12 pb-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center justify-center w-9 h-9 rounded-full transition-opacity active:opacity-60 mr-auto"
          style={{ background: "rgba(255,255,255,0.08)", color: "white" }}
          aria-label="Go back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-white font-semibold text-base absolute left-1/2 -translate-x-1/2">
          Sign Up
        </span>
      </div>

      <div className="flex flex-col flex-1 px-6 pt-6 pb-10">
        <h1
          className="text-white font-serif text-2xl leading-tight mb-2"
        >
          Welcome! Let's customize PLATE for your goals.
        </h1>
        <p className="text-sm mb-10" style={{ color: "rgba(255,255,255,0.5)" }}>
          Create a free account to get started.
        </p>

        {/* Primary email CTA */}
        <button
          onClick={() => navigate("/onboarding/name")}
          className="w-full font-bold text-base rounded-full transition-all active:scale-[0.98] mb-4"
          style={{
            background: "#52B788",
            color: "#0d1f13",
            height: "56px",
          }}
        >
          Continue with Email
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.12)" }} />
          <span className="text-xs font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>OR</span>
          <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.12)" }} />
        </div>

        {/* Google */}
        <button
          onClick={() => handleOAuth("google")}
          disabled={!!oauthLoading}
          className="w-full font-semibold text-sm rounded-full transition-all active:scale-[0.98] flex items-center justify-center gap-3 mb-3"
          style={{
            background: "#fff",
            color: "#111",
            height: "52px",
            opacity: oauthLoading === "google" ? 0.7 : 1,
          }}
        >
          {oauthLoading === "google" ? (
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
            </svg>
          )}
          Continue with Google
        </button>

        {/* Apple */}
        <button
          onClick={() => handleOAuth("apple")}
          disabled={!!oauthLoading}
          className="w-full font-semibold text-sm rounded-full transition-all active:scale-[0.98] flex items-center justify-center gap-3"
          style={{
            background: "#000",
            color: "#fff",
            border: "1.5px solid rgba(255,255,255,0.2)",
            height: "52px",
            opacity: oauthLoading === "apple" ? 0.7 : 1,
          }}
        >
          {oauthLoading === "apple" ? (
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          ) : (
            <svg width="16" height="19" viewBox="0 0 16 19" fill="white">
              <path d="M13.476 9.896c.021 2.146 1.882 2.858 1.904 2.867-.016.05-.298 1.018-.98 2.016-.59.861-1.203 1.718-2.17 1.736-.95.018-1.255-.563-2.34-.563-1.086 0-1.426.545-2.323.581-.933.036-1.643-.922-2.237-1.78-1.218-1.756-2.15-4.965-0.9-7.133.621-1.078 1.732-1.762 2.938-1.78 0.917-.018 1.782.617 2.343.617.562 0 1.616-.762 2.72-.651.462.02 1.762.188 2.594 1.404-.067.042-1.549.905-1.53 2.688zm-2.89-5.248c.495-.601.83-1.437.738-2.269-.714.03-1.578.476-2.09 1.077-.459.534-.862 1.389-.754 2.208.794.062 1.607-.404 2.105-1.016z"/>
            </svg>
          )}
          Continue with Apple
        </button>

        {/* Disclaimer */}
        <p className="text-xs text-center mt-8 leading-relaxed" style={{ color: "rgba(255,255,255,0.3)" }}>
          We will collect personal information from and about you and use it for various purposes, 
          including to customize PLATE for you. Read more in our{" "}
          <a href="/privacy" className="underline" style={{ color: "rgba(82,183,136,0.7)" }}>Privacy Policy</a>.
        </p>

        <p className="text-xs text-center mt-4" style={{ color: "rgba(255,255,255,0.4)" }}>
          Already have an account?{" "}
          <button
            onClick={() => navigate("/login")}
            className="underline"
            style={{ color: "#52B788" }}
          >
            Log In
          </button>
        </p>
      </div>
    </div>
  );
}
