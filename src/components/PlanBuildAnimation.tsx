/**
 * PlanBuildAnimation — shown during onboarding plan generation.
 * Steps animate in one by one, each ticking off with a green checkmark.
 * After all steps complete, reveals the macro summary with a cinematic entrance.
 */
import { useEffect, useRef, useState } from "react";

interface PlanBuildAnimationProps {
  dietLabel: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  goal: string;
  isGenerating?: boolean;
  onComplete: () => void | Promise<void>;
}

function buildSteps(dietLabel: string): { label: string; ms: number }[] {
  return [
    { label: "Calculating your BMR", ms: 500 },
    { label: "Computing daily calorie target", ms: 900 },
    { label: "Setting protein and macro splits", ms: 1300 },
    { label: `Matching ${dietLabel} recipes`, ms: 1800 },
    { label: "Filtering for your allergens", ms: 2200 },
    { label: "Building your 7-day meal plan", ms: 2700 },
    { label: "Generating your grocery list", ms: 3200 },
  ];
}

/* ── Particle canvas ── */
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  size: number;
  color: string;
}

function ParticleBurst({ trigger }: { trigger: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particles = useRef<Particle[]>([]);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!trigger) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const cx = canvas.width / 2;
    const cy = canvas.height * 0.38;

    const colors = ["#52B788", "#74C69D", "#95D5B2", "#ffffff", "#B7E4C7", "#40916C"];
    particles.current = Array.from({ length: 120 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 5;
      return {
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        alpha: 1,
        size: 1.5 + Math.random() * 3,
        color: colors[Math.floor(Math.random() * colors.length)],
      };
    });

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.current = particles.current.filter((p) => p.alpha > 0.01);
      for (const p of particles.current) {
        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.12; // gravity
        p.alpha -= 0.018;
        p.size *= 0.98;
      }
      if (particles.current.length > 0) {
        rafRef.current = requestAnimationFrame(draw);
      }
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [trigger]);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 w-full h-full"
      style={{ zIndex: 0 }}
    />
  );
}

/* ── Animated counter ── */
function AnimatedCounter({
  target,
  duration = 1400,
  delay = 0,
  suffix = "",
}: {
  target: number;
  duration?: number;
  delay?: number;
  suffix?: string;
}) {
  const [value, setValue] = useState(0);
  const started = useRef(false);

  useEffect(() => {
    const t = setTimeout(() => {
      if (started.current) return;
      started.current = true;
      const start = performance.now();
      const tick = (now: number) => {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out expo
        const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        setValue(Math.round(eased * target));
        if (progress < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }, delay);
    return () => clearTimeout(t);
  }, [target, duration, delay]);

  return (
    <>
      {value}
      {suffix}
    </>
  );
}

/* ── Glowing ring pulse ── */
const glowKeyframes = `
@keyframes glow-pulse {
  0%, 100% { box-shadow: 0 0 18px 4px #52B78855, 0 0 40px 10px #52B78822; }
  50%       { box-shadow: 0 0 36px 10px #52B78899, 0 0 80px 24px #52B78844; }
}
@keyframes shimmer-line {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(400%); }
}
@keyframes float-star {
  0%, 100% { transform: translateY(0px) rotate(0deg) scale(1);   opacity: 0.9; }
  33%       { transform: translateY(-6px) rotate(12deg) scale(1.1); opacity: 1;   }
  66%       { transform: translateY(3px) rotate(-8deg) scale(0.95); opacity: 0.8; }
}
@keyframes scan-line {
  0%   { top: 0%; opacity: 0.6; }
  50%  { opacity: 1;   }
  100% { top: 100%; opacity: 0; }
}
@keyframes flicker-in {
  0%   { opacity: 0; }
  10%  { opacity: 1; }
  12%  { opacity: 0; }
  14%  { opacity: 1; }
  16%  { opacity: 0; }
  18%  { opacity: 1; }
  100% { opacity: 1; }
}
@keyframes slide-up-fade {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0);    }
}
@keyframes scale-in-bounce {
  0%   { opacity: 0; transform: scale(0.4); }
  60%  { transform: scale(1.08); }
  80%  { transform: scale(0.97); }
  100% { opacity: 1; transform: scale(1); }
}
@keyframes macro-slide {
  from { opacity: 0; transform: translateX(-18px); }
  to   { opacity: 1; transform: translateX(0);     }
}
`;

export function PlanBuildAnimation({
  dietLabel,
  calories,
  protein,
  carbs,
  fat,
  goal,
  isGenerating = false,
  onComplete,
}: PlanBuildAnimationProps) {
  const steps = buildSteps(dietLabel);
  const [completedCount, setCompletedCount] = useState(0);
  const [showReveal, setShowReveal] = useState(false);
  const [revealPhase, setRevealPhase] = useState(0); // 0=hidden 1=flash 2=logo 3=headline 4=card 5=done

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];

    steps.forEach((step, i) => {
      timers.push(setTimeout(() => setCompletedCount(i + 1), step.ms));
    });

    // Trigger reveal sequence
    timers.push(setTimeout(() => setShowReveal(true), 3600));
    timers.push(setTimeout(() => setRevealPhase(1), 3650));  // white flash
    timers.push(setTimeout(() => setRevealPhase(2), 3900));  // logo
    timers.push(setTimeout(() => setRevealPhase(3), 4300));  // headline
    timers.push(setTimeout(() => setRevealPhase(4), 4700));  // macro card
    timers.push(setTimeout(() => setRevealPhase(5), 5000));  // fully done

    // Hand off to parent
    timers.push(setTimeout(() => { onComplete(); }, 7000));

    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goalLabels: Record<string, string> = {
    aggressive_cut: "Aggressive Cut",
    moderate_cut: "Moderate Cut",
    light_cut: "Light Cut",
    maintenance: "Maintenance",
    light_bulk: "Light Bulk",
    moderate_bulk: "Moderate Bulk",
    aggressive_bulk: "Aggressive Bulk",
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background overflow-hidden">
      <style>{glowKeyframes}</style>

      {/* White flash overlay */}
      {revealPhase === 1 && (
        <div
          className="absolute inset-0 z-40 pointer-events-none"
          style={{
            background: "white",
            animation: "flicker-in 0.28s ease forwards",
            opacity: 0,
          }}
        />
      )}

      {!showReveal ? (
        /* ── Build steps ── */
        <div className="w-full max-w-sm px-8">
          <div className="text-center mb-10">
            <div
              className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
              style={{ background: "#52B788" }}
            >
              <span className="font-serif text-3xl font-bold" style={{ color: "#0a2018" }}>
                P
              </span>
            </div>
            <p className="text-sm text-muted-foreground tracking-wide">Building your plan</p>
          </div>

          <div className="space-y-3">
            {steps.map((step, i) => {
              const done = i < completedCount;
              const active = i === completedCount;
              return (
                <div
                  key={i}
                  className="flex items-center gap-3 transition-all duration-300"
                  style={{ opacity: done || active ? 1 : 0.25 }}
                >
                  <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                    {done ? (
                      <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5">
                        <circle cx="10" cy="10" r="9" fill="#52B788" />
                        <path
                          d="M6 10.5l2.5 2.5 5.5-5.5"
                          stroke="#0a2018"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    ) : active ? (
                      <div
                        className="w-4 h-4 rounded-full border-2 animate-spin"
                        style={{ borderColor: "#52B788 transparent transparent transparent" }}
                      />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-border" />
                    )}
                  </div>
                  <span
                    className="text-sm transition-colors duration-300"
                    style={{
                      color: done
                        ? "#52B788"
                        : active
                        ? "var(--foreground)"
                        : "var(--muted-foreground)",
                    }}
                  >
                    {step.label}
                    {done && (
                      <span className="ml-1.5 text-xs" style={{ color: "#52B788" }}>
                        ✓
                      </span>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ── Cinematic Reveal ── */
        <div className="relative w-full max-w-sm px-8 flex flex-col items-center">
          {/* Particle burst canvas */}
          <ParticleBurst trigger={revealPhase >= 2} />

          {/* Ambient radial glow behind everything */}
          <div
            className="absolute pointer-events-none"
            style={{
              width: 340,
              height: 340,
              borderRadius: "50%",
              background:
                "radial-gradient(circle, #52B78828 0%, #52B78808 55%, transparent 75%)",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              opacity: revealPhase >= 2 ? 1 : 0,
              transition: "opacity 0.8s ease",
            }}
          />

          {/* Logo */}
          {revealPhase >= 2 && (
            <div
              className="relative z-10 mb-6 flex items-center justify-center"
              style={{ animation: "scale-in-bounce 0.55s cubic-bezier(0.34,1.56,0.64,1) forwards" }}
            >
              <div
                className="w-20 h-20 rounded-3xl flex items-center justify-center"
                style={{
                  background: "#52B788",
                  animation: "glow-pulse 2s ease-in-out infinite",
                }}
              >
                <span className="font-serif text-4xl font-bold" style={{ color: "#0a2018" }}>
                  P
                </span>
              </div>
            </div>
          )}

          {/* Headline */}
          {revealPhase >= 3 && (
            <div
              className="relative z-10 text-center mb-8"
              style={{ animation: "slide-up-fade 0.55s ease forwards" }}
            >
              {/* Floating star */}
              <div
                className="text-2xl mb-3 inline-block"
                style={{ animation: "float-star 3s ease-in-out infinite" }}
              >
                ✦
              </div>
              <h1
                className="font-serif mb-2"
                style={{
                  fontSize: 34,
                  lineHeight: 1.15,
                  background: "linear-gradient(135deg, #ffffff 30%, #52B788 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                Your plan is ready.
              </h1>
              <p className="text-sm" style={{ color: "#888" }}>
                Built around your body, your goal, your life.
              </p>
            </div>
          )}

          {/* Macro card */}
          {revealPhase >= 4 && (
            <div
              className="relative z-10 w-full rounded-2xl overflow-hidden"
              style={{
                background: "#0d0d0d",
                border: "1px solid #2a2a2a",
                animation: "slide-up-fade 0.6s ease forwards",
                boxShadow: "0 24px 60px #00000088, 0 0 0 1px #52B78822",
              }}
            >
              {/* Scan line effect */}
              <div
                className="absolute left-0 right-0 pointer-events-none"
                style={{
                  height: 2,
                  background:
                    "linear-gradient(90deg, transparent, #52B78866, transparent)",
                  animation: "scan-line 1.8s ease-out forwards",
                  zIndex: 2,
                }}
              />

              {/* Shimmer overlay */}
              <div
                className="absolute inset-0 pointer-events-none overflow-hidden"
                style={{ borderRadius: "inherit", zIndex: 1 }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    width: "30%",
                    background:
                      "linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)",
                    animation: "shimmer-line 1.2s ease forwards",
                  }}
                />
              </div>

              <div className="relative z-10 p-6">
                <div
                  className="text-xs uppercase tracking-widest mb-3"
                  style={{ color: "#555" }}
                >
                  Daily Target &middot; {goalLabels[goal] || goal}
                </div>

                {/* Calories — big animated counter */}
                <div
                  className="font-serif mb-6"
                  style={{ fontSize: 56, color: "#52B788", lineHeight: 1 }}
                >
                  <AnimatedCounter target={calories} duration={1200} delay={0} />
                  <span className="text-base font-sans ml-2" style={{ color: "#555" }}>
                    kcal
                  </span>
                </div>

                {/* Macro bars */}
                <div className="space-y-3">
                  {[
                    { label: "Protein", value: protein, color: "#52B788", delay: 200 },
                    { label: "Carbs",   value: carbs,   color: "#74C69D", delay: 400 },
                    { label: "Fat",     value: fat,     color: "#95D5B2", delay: 600 },
                  ].map((m) => {
                    const max = Math.max(protein, carbs, fat);
                    const pct = Math.round((m.value / max) * 100);
                    return (
                      <div
                        key={m.label}
                        style={{
                          animation: `macro-slide 0.5s ease ${m.delay}ms both`,
                        }}
                      >
                        <div className="flex justify-between items-baseline mb-1">
                          <span
                            className="text-xs uppercase tracking-widest"
                            style={{ color: "#555" }}
                          >
                            {m.label}
                          </span>
                          <span
                            className="font-serif text-lg"
                            style={{ color: "#ffffff" }}
                          >
                            <AnimatedCounter
                              target={m.value}
                              duration={1000}
                              delay={m.delay + 100}
                              suffix="g"
                            />
                          </span>
                        </div>
                        {/* Progress bar */}
                        <div
                          className="h-1 rounded-full overflow-hidden"
                          style={{ background: "#1e1e1e" }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${pct}%`,
                              background: `linear-gradient(90deg, ${m.color}88, ${m.color})`,
                              borderRadius: "inherit",
                              transition: `width 1.1s cubic-bezier(0.22,1,0.36,1) ${m.delay + 100}ms`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Footer */}
          {revealPhase >= 5 && (
            <div
              className="relative z-10 mt-5"
              style={{ animation: "slide-up-fade 0.5s ease 0.1s both" }}
            >
              {isGenerating ? (
                <p
                  className="text-center text-xs flex items-center justify-center gap-1.5"
                  style={{ color: "#52B788" }}
                >
                  <span
                    className="inline-block w-3 h-3 rounded-full border-2 animate-spin"
                    style={{ borderColor: "#52B788 transparent transparent transparent" }}
                  />
                  Finalizing your plan…
                </p>
              ) : (
                <p className="text-center text-xs" style={{ color: "#444" }}>
                  Taking you to your dashboard...
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
