import { useState, useEffect, useCallback, useRef } from "react";
import { PlateLogoImage } from "./PlateLogo";

const SLIDES = [
  "/onboarding/slide-a-athlete.jpg",
  "/onboarding/slide-c-meal-bowl.jpg",
  "/onboarding/interstitial-strawberry-blueberry.jpg",
];
const SLIDE_DURATION = 4000;

const BIOMETRIC_ENABLED_KEY = "plate_biometric_enabled";
const CREDENTIAL_ID_KEY = "plate_credential_id";
const LAST_ACTIVE_KEY = "plate_last_active";
const LOCK_TIMEOUT_MS = 2 * 60 * 1000; // Lock after 2 min inactive

/**
 * Check if biometric lock is enabled in user preferences.
 */
export function isBiometricEnabled(): boolean {
  return localStorage.getItem(BIOMETRIC_ENABLED_KEY) === "true";
}

/**
 * Check if WebAuthn platform authenticator (Face ID / Touch ID / fingerprint) is available.
 */
export async function isBiometricAvailable(): Promise<boolean> {
  if (!window.PublicKeyCredential) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/**
 * Register a biometric credential (one-time setup).
 */
export async function registerBiometric(userName: string): Promise<boolean> {
  try {
    const challenge = crypto.getRandomValues(new Uint8Array(32));
    const userId = crypto.getRandomValues(new Uint8Array(16));

    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: "Plate", id: window.location.hostname },
        user: {
          id: userId,
          name: userName,
          displayName: userName,
        },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" },    // ES256
          { alg: -257, type: "public-key" },   // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
          residentKey: "preferred",
        },
        timeout: 60000,
      },
    });

    if (credential && "rawId" in credential) {
      const idArray = Array.from(new Uint8Array((credential as PublicKeyCredential).rawId));
      localStorage.setItem(CREDENTIAL_ID_KEY, JSON.stringify(idArray));
      localStorage.setItem(BIOMETRIC_ENABLED_KEY, "true");
      localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Verify biometric — triggers Face ID / Touch ID / fingerprint.
 */
export async function verifyBiometric(): Promise<boolean> {
  try {
    const storedId = localStorage.getItem(CREDENTIAL_ID_KEY);
    if (!storedId) return false;

    const credentialId = new Uint8Array(JSON.parse(storedId));
    const challenge = crypto.getRandomValues(new Uint8Array(32));

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: [
          {
            type: "public-key",
            id: credentialId,
            transports: ["internal"],
          },
        ],
        userVerification: "required",
        timeout: 60000,
      },
    });

    return !!assertion;
  } catch {
    return false;
  }
}

/**
 * Disable biometric lock.
 */
export function disableBiometric() {
  localStorage.removeItem(BIOMETRIC_ENABLED_KEY);
  localStorage.removeItem(CREDENTIAL_ID_KEY);
}

/**
 * Track activity — call on user interactions to reset the lock timer.
 */
export function trackActivity() {
  localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now()));
}

/**
 * Check if app should be locked (inactive longer than timeout).
 */
function shouldLock(): boolean {
  if (!isBiometricEnabled()) return false;
  const lastActive = parseInt(localStorage.getItem(LAST_ACTIVE_KEY) || "0");
  return Date.now() - lastActive > LOCK_TIMEOUT_MS;
}

/**
 * Biometric lock screen — wraps the app and shows a lock overlay when needed.
 */
export function BiometricLock({ children }: { children: React.ReactNode }) {
  const [locked, setLocked] = useState(() => shouldLock());
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");
  const [activeSlide, setActiveSlide] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartX = useRef<number | null>(null);

  const goToSlide = (idx: number) => {
    setActiveSlide(idx);
    // Reset auto-advance timer on manual swipe
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % SLIDES.length);
    }, SLIDE_DURATION);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(dx) < 40) return;
    if (dx < 0) {
      goToSlide((activeSlide + 1) % SLIDES.length);
    } else {
      goToSlide((activeSlide - 1 + SLIDES.length) % SLIDES.length);
    }
  };

  // Carousel auto-advance
  useEffect(() => {
    if (!locked) return;
    timerRef.current = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % SLIDES.length);
    }, SLIDE_DURATION);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [locked]);

  // Track activity on visibility change
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "hidden") {
        trackActivity(); // Save last active time
      } else if (document.visibilityState === "visible") {
        if (shouldLock()) {
          setLocked(true);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    // Also track activity on interactions
    const handleInteraction = () => trackActivity();
    document.addEventListener("touchstart", handleInteraction, { passive: true });
    document.addEventListener("click", handleInteraction);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      document.removeEventListener("touchstart", handleInteraction);
      document.removeEventListener("click", handleInteraction);
    };
  }, []);

  const handleUnlock = useCallback(async () => {
    setVerifying(true);
    setError("");
    const success = await verifyBiometric();
    if (success) {
      trackActivity();
      setLocked(false);
    } else {
      setError("Verification failed. Try again.");
    }
    setVerifying(false);
  }, []);

  // Auto-trigger biometric on mount when locked
  useEffect(() => {
    if (locked && !verifying) {
      // Small delay so the lock screen renders first
      const timer = setTimeout(() => handleUnlock(), 400);
      return () => clearTimeout(timer);
    }
  }, [locked]);

  if (!locked) {
    return <>{children}</>;
  }

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col"
      style={{ maxWidth: 480, margin: "0 auto" }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Carousel background */}
      <div className="absolute inset-0">
        {SLIDES.map((src, i) => (
          <img
            key={i}
            src={src}
            alt=""
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
            style={{ opacity: i === activeSlide ? 1 : 0 }}
          />
        ))}
        {/* Gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0.1) 35%, rgba(0,0,0,0.72) 65%, rgba(0,0,0,0.92) 100%)",
          }}
        />
      </div>

      {/* Top: wordmark */}
      <div className="relative z-10 pt-12 px-6 flex items-center gap-2">
        <PlateLogoImage size={32} />
        <span className="text-white text-xl font-bold tracking-wide">PLATE</span>
      </div>

      {/* Bottom: lock UI */}
      <div className="relative z-10 mt-auto px-6 pb-12 flex flex-col items-center text-center">
        {/* Slide dots */}
        <div className="flex gap-2 mb-8">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => goToSlide(i)}
              className="h-2 w-2 rounded-full transition-all duration-300 p-0"
              style={{
                background: i === activeSlide ? "#52B788" : "rgba(255,255,255,0.4)",
                transform: i === activeSlide ? "scale(1.3)" : "scale(1)",
                border: "none",
                cursor: "pointer",
              }}
            />
          ))}
        </div>

        <h1 className="text-white font-serif text-3xl mb-1">Plate</h1>
        <p className="text-white/50 text-xs uppercase tracking-widest mb-10">Nutrition, Perfected.</p>

        <button
          onClick={handleUnlock}
          disabled={verifying}
          className="w-full py-4 rounded-full text-sm font-semibold transition-opacity disabled:opacity-50"
          style={{ background: "#52B788", color: "#0a2018" }}
        >
          {verifying ? "Verifying..." : "Unlock with Face ID"}
        </button>

        {error && (
          <p className="text-xs mt-3" style={{ color: "#ff6b6b" }}>{error}</p>
        )}

        <button
          onClick={() => { trackActivity(); setLocked(false); }}
          className="mt-4 text-xs"
          style={{ color: "rgba(255,255,255,0.45)" }}
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
