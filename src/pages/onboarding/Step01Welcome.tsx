/**
 * Screen 1 — Welcome Carousel (3 slides)
 * Route: / or /onboarding/welcome
 *
 * Mobile: full-bleed immersive carousel
 * Desktop (≥768px): split layout — image left, content right
 */
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useConvexAuth } from "convex/react";

const SLIDES = [
  {
    image: "/onboarding/slide-a-athlete.jpg",
    headline: "Ready for some wins?\nStart tracking, it's easy!",
    sub: "Track macros, log meals, and build habits that stick. All in one place.",
  },
  {
    image: "/onboarding/interstitial-strawberry-blueberry.jpg",
    headline: "Discover the impact of your\nfood and fitness",
    sub: "AI-powered meal plans tailored to your exact calorie and macro targets.",
  },
  {
    image: "/onboarding/slide-c-meal-bowl.jpg",
    headline: "And make mindful eating\na habit for life",
    sub: "Beautiful insights, streak tracking, and daily motivation to keep you going.",
    macroCard: { protein: 32, fat: 20, carbs: 57 },
  },
];

const SLIDE_DURATION = 4000;

export function Step01Welcome() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [activeSlide, setActiveSlide] = useState(0);

  // If already logged in, skip straight to the app
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const touchStartX = useRef<number | null>(null);

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % SLIDES.length);
    }, SLIDE_DURATION);
  };

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const goToSlide = (index: number) => {
    setActiveSlide(index);
    startTimer();
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      goToSlide(diff > 0
        ? (activeSlide + 1) % SLIDES.length
        : (activeSlide - 1 + SLIDES.length) % SLIDES.length
      );
    }
    touchStartX.current = null;
  };

  const slide = SLIDES[activeSlide];

  return (
    <>
      {/* ═══ MOBILE layout (< md) ═══ */}
      <div
        className="md:hidden relative min-h-screen flex flex-col"
        style={{ background: "#000" }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Hero image */}
        <div className="relative flex-1 min-h-0" style={{ minHeight: "55vh" }}>
          <img
            key={activeSlide}
            src={slide.image}
            alt="Plate onboarding"
            className="absolute inset-0 w-full h-full object-cover"
            style={{ objectPosition: "center top" }}
          />
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(to bottom, rgba(0,0,0,0.2) 0%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.85) 100%)",
            }}
          />
          {/* Top logo */}
          <div className="absolute top-0 left-0 right-0 px-6 pt-10 flex items-center gap-2">
            <img src="/plate-p-mark-lg.png" alt="Plate" style={{ height: 36, width: 36, objectFit: "contain" }} />
            <div>
              <span className="text-white font-serif font-bold text-xl" style={{ letterSpacing: "0.05em" }}>PLATE</span>
              <p className="text-xs font-serif" style={{ color: "rgba(82,183,136,0.7)", lineHeight: 1 }}>Nutrition, Perfected.</p>
            </div>
          </div>
          {/* Macro card */}
          {(slide as any).macroCard && (
            <div
              className="absolute bottom-8 left-6 right-6 rounded-2xl p-4"
              style={{ background: "rgba(20,20,20,0.85)", backdropFilter: "blur(12px)" }}
            >
              <p className="text-xs font-semibold mb-3" style={{ color: "rgba(255,255,255,0.6)" }}>Macros</p>
              <div className="flex gap-4">
                {[
                  { label: "Protein", value: (slide as any).macroCard.protein, color: "#4A9EFF" },
                  { label: "Fat", value: (slide as any).macroCard.fat, color: "#FF6B6B" },
                  { label: "Carbs", value: (slide as any).macroCard.carbs, color: "#F5A623" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="flex-1 text-center">
                    <div className="text-lg font-bold" style={{ color }}>{value}</div>
                    <div className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bottom content */}
        <div className="flex flex-col px-6 pb-10 pt-4" style={{ background: "#000" }}>
          <h2 className="font-serif text-2xl text-white mb-5 leading-tight" style={{ whiteSpace: "pre-line" }}>
            {slide.headline}
          </h2>
          {/* Dots */}
          <div className="flex items-center justify-center gap-2 mb-6">
            {SLIDES.map((_, i) => (
              <button key={i} onClick={() => goToSlide(i)} className="transition-all duration-300" style={{
                width: i === activeSlide ? 20 : 6, height: 6, borderRadius: 3,
                background: i === activeSlide ? "#52B788" : "rgba(255,255,255,0.25)",
              }} />
            ))}
          </div>
          <button
            onClick={() => navigate("/onboarding/signup")}
            className="w-full font-bold text-base rounded-full transition-all active:scale-[0.98]"
            style={{ background: "#52B788", color: "#0d1f13", height: "56px" }}
          >
            Sign Up For Free
          </button>
          <button
            onClick={() => navigate("/login")}
            className="w-full mt-3 text-base font-medium transition-all active:opacity-70"
            style={{ color: "rgba(255,255,255,0.7)", height: "48px" }}
          >
            Log In
          </button>
          <p className="text-center text-xs mt-3 font-serif" style={{ color: "rgba(82,183,136,0.6)" }}>
            Nutrition, Perfected.
          </p>
        </div>
      </div>

      {/* ═══ DESKTOP layout (≥ md) ═══ */}
      <div
        className="hidden md:flex min-h-screen"
        style={{ background: "#000" }}
      >
        {/* Left: image carousel */}
        <div className="relative flex-1 overflow-hidden">
          {SLIDES.map((s, i) => (
            <img
              key={i}
              src={s.image}
              alt=""
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
              style={{ opacity: i === activeSlide ? 1 : 0, objectPosition: "center top" }}
            />
          ))}
          {/* Gradient for readability */}
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(to right, rgba(0,0,0,0) 60%, rgba(0,0,0,0.7) 100%), linear-gradient(to bottom, rgba(0,0,0,0.3) 0%, transparent 30%)",
            }}
          />
          {/* Macro card (slide 3) */}
          {(slide as any).macroCard && (
            <div
              className="absolute bottom-10 left-10 rounded-2xl p-5"
              style={{ background: "rgba(20,20,20,0.85)", backdropFilter: "blur(16px)", minWidth: 220 }}
            >
              <p className="text-xs font-semibold mb-3" style={{ color: "rgba(255,255,255,0.6)" }}>Today's Macros</p>
              <div className="flex gap-6">
                {[
                  { label: "Protein", value: (slide as any).macroCard.protein, color: "#4A9EFF" },
                  { label: "Fat", value: (slide as any).macroCard.fat, color: "#FF6B6B" },
                  { label: "Carbs", value: (slide as any).macroCard.carbs, color: "#F5A623" },
                ].map(({ label, value, color }) => (
                  <div key={label} className="text-center">
                    <div className="text-xl font-bold" style={{ color }}>{value}g</div>
                    <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Slide dots over image */}
          <div className="absolute bottom-10 right-0 left-0 flex justify-center gap-2">
            {SLIDES.map((_, i) => (
              <button key={i} onClick={() => goToSlide(i)} className="transition-all duration-300" style={{
                width: i === activeSlide ? 24 : 8, height: 8, borderRadius: 4,
                background: i === activeSlide ? "#52B788" : "rgba(255,255,255,0.3)",
              }} />
            ))}
          </div>
        </div>

        {/* Right: branding + CTA panel */}
        <div
          className="flex flex-col justify-between"
          style={{
            width: 440,
            minWidth: 380,
            background: "#0A0A0A",
            borderLeft: "1px solid rgba(255,255,255,0.06)",
            padding: "60px 48px",
          }}
        >
          {/* Logo */}
          <div>
            <div className="flex items-center gap-3 mb-1">
              <img src="/plate-p-mark-lg.png" alt="Plate" style={{ height: 52, width: 52, objectFit: "contain" }} />
              <span className="text-white font-serif font-bold text-3xl tracking-wide">PLATE</span>
            </div>
            <p className="text-xs font-serif" style={{ color: "rgba(82,183,136,0.6)" }}>Nutrition, Perfected.</p>
          </div>

          {/* Headline + sub copy */}
          <div>
            <h1
              className="font-serif text-white leading-tight mb-4"
              style={{ fontSize: "2rem", whiteSpace: "pre-line" }}
            >
              {slide.headline}
            </h1>
            <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
              {slide.sub}
            </p>

            {/* Feature bullets */}
            <div className="mt-8 space-y-3">
              {[
                { icon: "🎯", text: "AI meal plans built around your macros" },
                { icon: "📊", text: "Track calories, protein, carbs & fat" },
                { icon: "🔥", text: "Daily streaks & progress insights" },
              ].map((item) => (
                <div key={item.text} className="flex items-center gap-3">
                  <span className="text-lg">{item.icon}</span>
                  <span className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CTAs */}
          <div>
            <button
              onClick={() => navigate("/onboarding/signup")}
              className="w-full font-bold text-base rounded-full transition-all hover:opacity-90 active:scale-[0.98] mb-3"
              style={{ background: "#52B788", color: "#0d1f13", height: "56px" }}
            >
              Sign Up For Free
            </button>
            <button
              onClick={() => navigate("/login")}
              className="w-full text-base font-medium transition-all hover:opacity-80"
              style={{ color: "rgba(255,255,255,0.55)", height: "48px" }}
            >
              Log In
            </button>
            <p className="text-center text-xs mt-4" style={{ color: "rgba(255,255,255,0.2)" }}>
              No credit card required · Free forever
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
