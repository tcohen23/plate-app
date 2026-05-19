/**
 * Rehab Modal — on-demand stretching & mobility tool
 * 17 body-part regions · 67 stretches
 * Based on ACSM + Wilke et al. 2025
 */
import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { X, ChevronLeft, ChevronDown, ChevronUp, AlertTriangle, Timer } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Stretch {
  id: string;
  name: string;
  targets: string;
  how_to: string;
  hold_seconds: number | null; // null = movement-based (reps, not hold time)
  sets: number;
  each_side: boolean;
  cues: string[];
  stop_signal: string;
}

interface BodyPart {
  id: string;
  display_name: string;
  order: number;
  stretchCount: number;
}

interface BodyPartDetail {
  id: string;
  display_name: string;
  order: number;
  stretches: Stretch[];
  disclaimer: string;
}

// ── Body part icons ──────────────────────────────────────────────────────────

const BODY_PART_ICONS: Record<string, string> = {
  neck: "🧠",
  shoulders: "💪",
  upper_back: "🔝",
  mid_back: "🔙",
  lower_back: "🫀",
  chest: "❤️",
  biceps_forearms: "💪",
  triceps: "🦾",
  core: "🏋️",
  hips: "⚙️",
  glutes: "🍑",
  quads: "🦵",
  hamstrings: "🦿",
  adductors: "🤸",
  calves: "🦶",
  ankles: "👟",
  full_body: "🌀",
};

function getBodyPartIcon(id: string): string {
  for (const key of Object.keys(BODY_PART_ICONS)) {
    if (id.includes(key)) return BODY_PART_ICONS[key];
  }
  return "🤸";
}

// ── Hold Timer ────────────────────────────────────────────────────────────────

function HoldTimer({ seconds, onDone }: { seconds: number; onDone: () => void }) {
  const [remaining, setRemaining] = useState(seconds);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running || remaining <= 0) return;
    if (remaining <= 0) { onDone(); return; }
    const id = setTimeout(() => setRemaining(r => r - 1), 1000);
    return () => clearTimeout(id);
  }, [remaining, running, onDone]);

  useEffect(() => {
    if (running && remaining <= 0) {
      onDone();
    }
  }, [remaining, running, onDone]);

  const pct = ((seconds - remaining) / seconds) * 100;
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;

  if (!running) {
    return (
      <button
        onClick={() => setRunning(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
        style={{ background: "var(--plate-green-accent)", color: "#0a1a0a" }}
      >
        <Timer className="w-4 h-4" />
        Start {seconds}s timer
      </button>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-16 h-16">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
          <circle cx="32" cy="32" r="27" fill="none" stroke="var(--border)" strokeWidth="5" />
          <circle
            cx="32" cy="32" r="27" fill="none"
            stroke="var(--plate-green-accent)" strokeWidth="5"
            strokeDasharray={`${2 * Math.PI * 27}`}
            strokeDashoffset={`${2 * Math.PI * 27 * (1 - pct / 100)}`}
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold">{mins > 0 ? `${mins}:${String(secs).padStart(2, "0")}` : secs}</span>
        </div>
      </div>
      <button onClick={onDone} className="text-xs text-muted-foreground underline">Done early</button>
    </div>
  );
}

// ── Stretch Card ──────────────────────────────────────────────────────────────

function StretchCard({ stretch }: { stretch: Stretch }) {
  const [expanded, setExpanded] = useState(false);
  const [currentSet, setCurrentSet] = useState(0);
  const [showTimer, setShowTimer] = useState(false);
  const [completedSets, setCompletedSets] = useState<number[]>([]);

  const handleSetDone = () => {
    setShowTimer(false);
    setCompletedSets(prev => [...prev, currentSet]);
    if (currentSet + 1 < stretch.sets) {
      setCurrentSet(s => s + 1);
    }
  };

  const allDone = completedSets.length >= stretch.sets;
  const isMovement = stretch.hold_seconds === null;
  const dosageLabel = isMovement
    ? `${stretch.sets} rep${stretch.sets > 1 ? "s" : ""}${stretch.each_side ? " each side" : ""}`
    : stretch.each_side
      ? `${stretch.hold_seconds}s × ${stretch.sets} sets each side`
      : `${stretch.hold_seconds}s × ${stretch.sets} set${stretch.sets > 1 ? "s" : ""}`;

  return (
    <div
      className="rounded-2xl border overflow-hidden mb-3 transition-all"
      style={{
        borderColor: allDone ? "var(--plate-green-accent)" : "var(--border)",
        background: "var(--card)",
        opacity: allDone ? 0.8 : 1,
      }}
    >
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{stretch.name}</span>
            {allDone && <span className="text-xs" style={{ color: "var(--plate-green-accent)" }}>✓ Done</span>}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{stretch.targets}</p>
          <p className="text-xs mt-0.5" style={{ color: "var(--plate-green-accent)" }}>{dosageLabel}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-muted-foreground font-mono">{completedSets.length}/{stretch.sets}</span>
          {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          {/* How-to */}
          <p className="text-sm text-muted-foreground leading-relaxed">{stretch.how_to}</p>

          {/* Cues */}
          {stretch.cues.length > 0 && (
            <div className="space-y-1">
              {stretch.cues.map((cue, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <span style={{ color: "var(--plate-green-accent)" }}>•</span>
                  <span>{cue}</span>
                </div>
              ))}
            </div>
          )}

          {/* Stop signal */}
          <div className="flex items-start gap-2 rounded-xl px-3 py-2"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: "#ef4444" }} />
            <p className="text-xs" style={{ color: "#ef4444" }}>
              <strong>Stop if:</strong> {stretch.stop_signal}
            </p>
          </div>

          {/* Set tracker + timer */}
          {!allDone && (
            <div className="pt-1">
              {!isMovement && stretch.each_side && (
                <p className="text-xs text-muted-foreground mb-2">
                  Complete {stretch.hold_seconds}s on each side = 1 set
                </p>
              )}
              <div className="flex items-center gap-3">
                <div className="text-xs text-muted-foreground">
                  {isMovement ? `Rep ${currentSet + 1} of ${stretch.sets}` : `Set ${currentSet + 1} of ${stretch.sets}`}
                </div>
                {isMovement ? (
                  <button
                    onClick={handleSetDone}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
                    style={{ background: "var(--plate-green-accent)", color: "#0a1a0a" }}
                  >
                    ✓ Done
                  </button>
                ) : showTimer ? (
                  <HoldTimer seconds={stretch.hold_seconds!} onDone={handleSetDone} />
                ) : (
                  <button
                    onClick={() => setShowTimer(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
                    style={{ background: "var(--plate-green-accent)", color: "#0a1a0a" }}
                  >
                    <Timer className="w-3 h-3" />
                    {completedSets.length === 0 ? "Start" : "Next set"}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Body Part List ────────────────────────────────────────────────────────────

function BodyPartList({ bodyParts, onSelect }: { bodyParts: BodyPart[]; onSelect: (id: string) => void }) {
  return (
    <div className="space-y-2 pb-4">
      {bodyParts.map(bp => (
        <button
          key={bp.id}
          onClick={() => onSelect(bp.id)}
          className="w-full flex items-center justify-between px-4 py-3 rounded-2xl border text-left transition-all active:scale-98"
          style={{ background: "var(--card)", borderColor: "var(--border)" }}
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">{getBodyPartIcon(bp.id)}</span>
            <span className="text-sm font-medium">{bp.display_name}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{bp.stretchCount} stretches</span>
            <ChevronDown className="w-4 h-4 text-muted-foreground -rotate-90" />
          </div>
        </button>
      ))}
    </div>
  );
}

// ── Stretch List View ─────────────────────────────────────────────────────────

function StretchListView({
  bodyPartId,
  onBack,
}: {
  bodyPartId: string;
  onBack: () => void;
}) {
  const detail = useQuery(api.rehab.getStretchesForBodyPart, { bodyPartId }) as BodyPartDetail | null | undefined;

  if (!detail) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: "var(--plate-green-accent)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  return (
    <div>
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-muted-foreground mb-4"
      >
        <ChevronLeft className="w-4 h-4" />
        All areas
      </button>

      <h3 className="text-lg font-serif mb-1">{detail.display_name}</h3>
      <p className="text-xs text-muted-foreground mb-4">{detail.stretches.length} stretches · tap to expand</p>

      {/* Disclaimer */}
      <div className="rounded-xl px-3 py-2 mb-4 text-xs text-muted-foreground"
        style={{ background: "var(--muted)", borderLeft: "3px solid var(--plate-green-accent)" }}>
        {detail.disclaimer}
      </div>

      {detail.stretches.map(stretch => (
        <StretchCard key={stretch.id} stretch={stretch} />
      ))}
    </div>
  );
}

// ── Main RehabModal ───────────────────────────────────────────────────────────

export function RehabModal({ onClose }: { onClose: () => void }) {
  const bodyParts = useQuery(api.rehab.getRehabBodyParts) as BodyPart[] | undefined;
  const [selectedBodyPart, setSelectedBodyPart] = useState<string | null>(null);

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex flex-col"
      style={{ background: "var(--background)", top: 0, left: 0, right: 0, bottom: 0 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 pb-3 border-b border-border"
        style={{ background: "var(--background)", paddingTop: "calc(env(safe-area-inset-top, 0px) + 16px)", flexShrink: 0 }}>
        <div className="flex items-center gap-3">
          {selectedBodyPart ? (
            <button onClick={() => setSelectedBodyPart(null)} className="p-1">
              <ChevronLeft className="w-5 h-5" />
            </button>
          ) : (
            <span className="text-xl">🤸</span>
          )}
          <div>
            <h2 className="text-base font-serif font-semibold">Rehab & Recovery</h2>
            {!selectedBodyPart && (
              <p className="text-xs text-muted-foreground">Tap a body area to see stretches</p>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-xl"
          style={{ background: "var(--muted)" }}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="px-4 pt-4" style={{ flex: 1, overflowY: "auto", paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 24px)", WebkitOverflowScrolling: "touch" as React.CSSProperties["WebkitOverflowScrolling"] }}>
        {!bodyParts ? (
          <div className="flex items-center justify-center h-32">
            <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: "var(--plate-green-accent)", borderTopColor: "transparent" }} />
          </div>
        ) : selectedBodyPart ? (
          <StretchListView
            bodyPartId={selectedBodyPart}
            onBack={() => setSelectedBodyPart(null)}
          />
        ) : (
          <>
            {/* Intro card */}
            <div className="rounded-2xl px-4 py-3 mb-4 text-sm"
              style={{ background: "var(--plate-green-deep)", borderLeft: "3px solid var(--plate-green-accent)" }}>
              <p className="font-medium mb-0.5">On-demand recovery</p>
              <p className="text-xs text-muted-foreground">
                Sore back? Tight hips? Pick the area, follow the holds. No plan needed.
              </p>
            </div>

            <BodyPartList
              bodyParts={bodyParts.sort((a, b) => a.order - b.order)}
              onSelect={setSelectedBodyPart}
            />
          </>
        )}
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
