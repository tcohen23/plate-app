import { Link } from "react-router-dom";
import { SignIn } from "@/components/SignIn";
import { TestUserLoginSection } from "@/components/TestUserLoginSection";
import { Button } from "@/components/ui/button";
import { useAuthActions } from "@convex-dev/auth/react";
import { useState } from "react";

export function LoginPage() {
  const { signIn } = useAuthActions();
  const [oauthLoading, setOauthLoading] = useState<"google" | "apple" | null>(null);
  const [oauthError, setOauthError] = useState("");

  const handleOAuth = async (provider: "google" | "apple") => {
    setOauthLoading(provider);
    setOauthError("");
    try {
      await signIn(provider as any, { redirectTo: "/dashboard" });
    } catch (err: any) {
      console.error("OAuth error", err);
      setOauthError(
        err?.message && !err.message.includes("undefined")
          ? err.message
          : `Could not sign in with ${provider === "google" ? "Google" : "Apple"}. Please try email below or contact support.`
      );
      setOauthLoading(null);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 relative">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/4 size-96 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 size-96 rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-2">
          <img src="/plate-logo.png" alt="Plate" className="mx-auto size-14 mb-4" />
          <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
          <p className="text-muted-foreground text-sm">
            Sign in to your account to continue
          </p>
        </div>

        {/* Google */}
        <button
          onClick={() => handleOAuth("google")}
          disabled={!!oauthLoading}
          className="w-full font-semibold text-sm rounded-full transition-all active:scale-[0.98] flex items-center justify-center gap-3"
          style={{
            background: "#fff",
            color: "#111",
            height: "52px",
            border: "1.5px solid #e5e7eb",
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

        {oauthError && (
          <p className="text-sm text-destructive bg-destructive/10 rounded-lg px-3 py-2 text-center">
            {oauthError}
          </p>
        )}

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground font-medium">OR</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <TestUserLoginSection />
        <SignIn />

        <p className="text-center text-sm text-muted-foreground">
          Don't have an account?{" "}
          <Button variant="link" className="p-0 h-auto font-medium" asChild>
            <Link to="/signup">Sign up</Link>
          </Button>
        </p>
      </div>
    </div>
  );
}
