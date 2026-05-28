/**
 * GLP1Page — GLP-1 Medication Support (photo 43)
 * Beta badge, toggle, 3 feature cards: Log dose / Med reminders / Track side effects
 * Legal disclaimer, "Start my GLP-1 Support" button
 *
 * Plate already has medication logs so this integrates with those.
 */
import { useNavigate } from "react-router-dom";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ChevronLeft, Pill, Bell, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { hapticLight } from "@/lib/haptics";
import { toast } from "sonner";
import { getLocalDateString } from "@/lib/dateUtils";

export function GLP1Page() {
  const navigate = useNavigate();
  const [enabled, setEnabled] = useState(false);
  const [showLogDose, setShowLogDose] = useState(false);
  const [medication, setMedication] = useState("Semaglutide (Ozempic)");
  const [dosage, setDosage] = useState("0.25 mg");
  const [notes, setNotes] = useState("");
  const localDate = getLocalDateString();
  const logMedication = useMutation((api as any).medicationLogs.logMedication);

  const handleLogDose = async () => {
    try {
      await logMedication({ date: localDate, medication, dosage, notes: notes || undefined });
      toast.success("Dose logged ✓");
      setShowLogDose(false);
      setNotes("");
    } catch (e: any) {
      toast.error(e.message || "Failed to log dose");
    }
  };

  const featureCards = [
    {
      icon: <Pill className="w-5 h-5" />,
      title: "See your doses in one place",
      subtitle: "Keep a clear log of your medication schedule",
      action: "Log dose",
      onAction: () => setShowLogDose(true),
    },
    {
      icon: <Bell className="w-5 h-5" />,
      title: "Stay on track with reminders",
      subtitle: "Never miss a dose with smart notifications",
      action: "Schedule med reminders",
      onAction: () => toast.info("Reminder scheduling coming soon!"),
    },
    {
      icon: <Activity className="w-5 h-5" />,
      title: "Track your side effects",
      subtitle: "Monitor and log how you feel over time",
      action: "Log new",
      onAction: () => toast.info("Side effect tracking coming soon!"),
    },
  ];

  return (
    <div className="pb-28 max-w-lg mx-auto animate-page-enter">
      {/* Header */}
      <div className="flex items-center px-4 pt-4 pb-3">
        <button onClick={() => navigate(-1)} className="mr-3">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-base font-semibold">GLP-1 Support</span>
        <span className="ml-2 text-xs px-2 py-0.5 rounded font-bold" style={{ background: "rgba(82,183,136,0.15)", color: "#52B788" }}>
          Beta
        </span>
      </div>

      {/* Title */}
      <div className="px-4 mb-6">
        <h1 className="text-xl font-bold mb-2">Support your GLP-1 journey with Plate</h1>
        <p className="text-sm text-muted-foreground">Track your medication, manage side effects, and stay on schedule.</p>
      </div>

      {/* GLP-1 Support Toggle */}
      <div
        className="mx-4 mb-6 flex items-center justify-between px-4 py-4 rounded-2xl"
        style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}
      >
        <div>
          <div className="text-sm font-semibold">GLP-1 Support</div>
          <div className="text-xs text-muted-foreground">{enabled ? "Active — tracking enabled" : "Enable to start tracking"}</div>
        </div>
        <button
          onClick={() => { hapticLight(); setEnabled(e => !e); }}
          className="relative w-12 h-6 rounded-full transition-colors duration-300"
          style={{ background: enabled ? "#52B788" : "rgba(255,255,255,0.12)" }}
        >
          <div
            className="absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all duration-300"
            style={{ left: enabled ? "calc(100% - 22px)" : "2px" }}
          />
        </button>
      </div>

      {/* Feature cards */}
      <div className="px-4 space-y-3 mb-6">
        {featureCards.map((card, i) => (
          <div key={i} className="rounded-2xl p-4" style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}>
            <div className="flex items-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "rgba(82,183,136,0.1)", color: "#52B788" }}>
                {card.icon}
              </div>
              <div>
                <div className="text-sm font-semibold mb-0.5">{card.title}</div>
                <div className="text-xs text-muted-foreground">{card.subtitle}</div>
              </div>
            </div>
            <button
              onClick={() => { hapticLight(); card.onAction(); }}
              className="text-sm font-semibold px-4 py-2 rounded-full transition-all active:scale-95"
              style={{ background: "rgba(82,183,136,0.12)", color: "#52B788", border: "1px solid rgba(82,183,136,0.3)" }}
            >
              {card.action}
            </button>
          </div>
        ))}
      </div>

      {/* Legal disclaimer */}
      <div className="px-4 mb-6">
        <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.35)" }}>
          GLP-1 Support is intended for informational purposes only and does not constitute medical advice.
          Always consult your healthcare provider before starting, stopping, or changing your medication dosage.
          Plate is not liable for medication-related decisions made using this tool.
        </p>
      </div>

      {/* CTA */}
      <div className="px-4">
        <Button
          onClick={() => { hapticLight(); setEnabled(true); toast.success("GLP-1 Support enabled!"); }}
          className="w-full h-12 rounded-full font-bold text-base"
          style={{ background: "#3B82F6", color: "#fff" }}
        >
          Start my GLP-1 Support
        </Button>
      </div>

      {/* Log Dose Modal */}
      {showLogDose && (
        <div className="fixed inset-0 z-50 flex items-end" style={{ background: "rgba(0,0,0,0.6)" }}>
          <div className="w-full max-w-lg mx-auto rounded-t-3xl p-6 pb-10" style={{ background: "var(--background)", border: "1px solid var(--border)" }}>
            <div className="flex items-center justify-between mb-6">
              <button onClick={() => setShowLogDose(false)} className="text-muted-foreground text-xl">×</button>
              <h2 className="text-base font-semibold">Log Dose</h2>
              <div className="w-6" />
            </div>
            <div className="space-y-3 mb-4">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Medication</div>
                <input
                  value={medication}
                  onChange={e => setMedication(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm bg-transparent outline-none"
                  style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}
                />
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Dosage</div>
                <input
                  value={dosage}
                  onChange={e => setDosage(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm bg-transparent outline-none"
                  style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}
                />
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Notes (optional)</div>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="How are you feeling?"
                  rows={2}
                  className="w-full px-4 py-3 rounded-xl text-sm bg-transparent outline-none resize-none"
                  style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}
                />
              </div>
            </div>
            <Button onClick={handleLogDose} className="w-full h-12 rounded-full font-bold" style={{ background: "#52B788", color: "#000" }}>
              Log Dose
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
