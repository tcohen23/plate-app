/**
 * OnboardingLayout — Shared wrapper for all onboarding screens.
 * Handles segmented progress bar, back navigation, and consistent padding.
 * 
 * Updated for v3 brief: new 24-screen flow, segmented dash progress bar.
 */
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

// All steps that show progress bar, in order
const PROGRESS_STEPS = [
  "name",          // 1
  "goals",         // 2
  "activity",      // 3
  "glp1",          // 4
  "barriers",      // 5
  "mealplan-optin",// 6
  "about-you",     // 7
  "measurements",  // 8
  "weekly-goal",   // 9
];

const STEP_INDEX: Record<string, number> = Object.fromEntries(
  PROGRESS_STEPS.map((s, i) => [s, i + 1])
);

// Steps that show no progress bar / back button
const NO_CHROME = new Set([
  "welcome",
  "signup",
  "interstitial-realtalk",
  "interstitial-choices",
  "interstitial-kitchen",
  "interstitial-journey",
  "habits",
  "personalization",
  "create-account",
  "verify-email",
  "username",
  "plan-ready",
  "features",
  "upgrade",
  "welcome-premium",
  // legacy names
  "paywall", "welcome-done", "account",
]);

// Steps that show no back button
const NO_BACK = new Set([
  "welcome",
  "signup",
  "name",
  "interstitial-realtalk",
  "interstitial-choices",
  "interstitial-kitchen",
  "interstitial-journey",
  "personalization",
  "create-account",
  "verify-email",
  "plan-ready",
  "features",
  "upgrade",
  "welcome-premium",
  // legacy
  "account", "paywall", "welcome-done", "reveal",
]);

interface OnboardingLayoutProps {
  step: string;
  children: React.ReactNode;
  onBack?: () => void;
  /** Override the computed progress (0–1) */
  progress?: number;
  darkBg?: boolean;
  /** Header title label (e.g. "Goals", "You") */
  headerTitle?: string;
  /** Total number of segments (default 9) */
  totalSegments?: number;
  /** Which segment is active (1-based) */
  activeSegment?: number;
}

export function OnboardingLayout({
  step,
  children,
  onBack,
  progress: _progress,
  darkBg = false,
  headerTitle,
  totalSegments = 9,
  activeSegment,
}: OnboardingLayoutProps) {
  const navigate = useNavigate();

  const stepIndex = STEP_INDEX[step] ?? 1;
  const filledCount = activeSegment ?? stepIndex;
  const showChrome = !NO_CHROME.has(step);
  const showBack = !NO_BACK.has(step);

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  // ── Mobile / tablet (< lg): narrow centered card, unchanged ──
  const mobileContent = (
    <div
      className="min-h-screen flex flex-col w-full"
      style={{
        background: darkBg ? "#000" : "var(--background)",
        maxWidth: "520px",
        margin: "0 auto",
      }}
    >
      {showChrome && (
        <div className="flex items-center gap-3 px-5 pt-safe-top pt-4 pb-2">
          {showBack && (
            <button
              onClick={handleBack}
              className="flex items-center justify-center w-9 h-9 rounded-full transition-opacity active:opacity-60 flex-shrink-0"
              style={{ background: "var(--muted)", color: "var(--foreground)" }}
              aria-label="Go back"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <div className="flex-1 flex gap-1">
            {Array.from({ length: totalSegments }).map((_, i) => (
              <div
                key={i}
                className="h-1 flex-1 rounded-full transition-all duration-500"
                style={{ background: i < filledCount ? "#52B788" : "var(--muted)" }}
              />
            ))}
          </div>
        </div>
      )}
      {headerTitle && showChrome && (
        <p className="text-center text-xs font-semibold tracking-widest uppercase px-5 pt-1 pb-0"
          style={{ color: "rgba(255,255,255,0.5)" }}>
          {headerTitle}
        </p>
      )}
      <div className="flex-1 flex flex-col">{children}</div>
    </div>
  );

  // ── Desktop (≥ lg): full-screen with centered card ──
  const desktopContent = (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: darkBg ? "#050505" : "#0A0A0A" }}
    >
      {/* Subtle background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-[0.04]"
          style={{ background: "radial-gradient(circle, #52B788 0%, transparent 70%)" }} />
      </div>

      <div
        className="relative w-full flex flex-col"
        style={{
          maxWidth: 560,
          background: "#111",
          borderRadius: 28,
          border: "1px solid rgba(255,255,255,0.07)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.6)",
          minHeight: 580,
        }}
      >
        {/* Logo bar at top of card */}
        <div className="flex items-center justify-between px-8 pt-6 pb-0">
          <div className="flex items-center gap-2">
            <img src="/plate-p-mark-lg.png" alt="Plate" style={{ height: 28, width: 28, objectFit: "contain" }} />
            <span className="font-serif font-bold text-base tracking-wide" style={{ color: "rgba(255,255,255,0.8)" }}>PLATE</span>
          </div>
          {showChrome && (
            <div className="flex items-center gap-2">
              {showBack && (
                <button
                  onClick={handleBack}
                  className="flex items-center justify-center w-8 h-8 rounded-full transition-opacity hover:opacity-80"
                  style={{ background: "rgba(255,255,255,0.08)", color: "var(--foreground)" }}
                  aria-label="Go back"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
              {/* Progress bar */}
              <div className="flex gap-1" style={{ width: 180 }}>
                {Array.from({ length: totalSegments }).map((_, i) => (
                  <div
                    key={i}
                    className="h-1 flex-1 rounded-full transition-all duration-500"
                    style={{ background: i < filledCount ? "#52B788" : "rgba(255,255,255,0.1)" }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {headerTitle && showChrome && (
          <p className="text-center text-xs font-semibold tracking-widest uppercase px-8 pt-2 pb-0"
            style={{ color: "rgba(255,255,255,0.35)" }}>
            {headerTitle}
          </p>
        )}

        <div className="flex-1 flex flex-col">{children}</div>
      </div>
    </div>
  );

  return (
    <>
      <div className="lg:hidden">{mobileContent}</div>
      <div className="hidden lg:block">{desktopContent}</div>
    </>
  );
}

/** Big serif headline used on most screens */
export function OnboardingHeadline({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h1
      className={`text-[2rem] leading-tight font-serif text-foreground ${className}`}
    >
      {children}
    </h1>
  );
}

/** Sub-text below headline */
export function OnboardingSubtext({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={`text-base text-muted-foreground leading-relaxed ${className}`}
    >
      {children}
    </p>
  );
}

/** Primary CTA button */
export function OnboardingCTA({
  children,
  onClick,
  disabled = false,
  loading = false,
  className = "",
  gold = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  gold?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`w-full py-4 rounded-full text-base font-bold transition-all active:scale-[0.98] disabled:opacity-50 ${className}`}
      style={{
        background: gold ? "var(--plate-gold)" : "#52B788",
        color: gold ? "#1a1200" : "#0d1f13",
        height: "56px",
      }}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  );
}

/** Pill-style selectable chip */
export function SelectChip({
  label,
  subtitle,
  selected,
  onClick,
  emoji,
}: {
  label: string;
  subtitle?: string;
  selected: boolean;
  onClick: () => void;
  emoji?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 w-full px-4 py-3.5 rounded-2xl text-left transition-all active:scale-[0.98]"
      style={{
        background: selected ? "rgba(82,183,136,0.15)" : "var(--muted)",
        border: `1.5px solid ${selected ? "#52B788" : "transparent"}`,
      }}
    >
      {emoji && <span className="text-lg flex-shrink-0">{emoji}</span>}
      <div className="flex flex-col min-w-0 flex-1">
        <span
          className="text-sm font-medium"
          style={{ color: selected ? "#52B788" : "var(--foreground)" }}
        >
          {label}
        </span>
        {subtitle && (
          <span
            className="text-xs mt-0.5"
            style={{ color: selected ? "rgba(82,183,136,0.75)" : "rgba(255,255,255,0.4)" }}
          >
            {subtitle}
          </span>
        )}
      </div>
      {selected && (
        <span className="ml-auto flex-shrink-0 text-[#52B788]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      )}
    </button>
  );
}
