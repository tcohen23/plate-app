/**
 * HelpPage — MFP-style Help menu
 */
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { hapticLight } from "@/lib/haptics";

const HELP_ITEMS = [
  { label: "About Plate", url: "https://plate-app.pages.dev" },
  { label: "Frequently Asked Questions", url: "mailto:support@plate-app.com" },
  { label: "Contact Support", url: "mailto:support@plate-app.com" },
  { label: "Terms of Service", url: "/terms" },
  { label: "Privacy Policy", url: "/privacy" },
  { label: "Delete Account", url: "/settings" },
  { label: "Send Feedback", url: "/feedback" },
];

export function HelpPage() {
  const navigate = useNavigate();

  const handleItem = (item: typeof HELP_ITEMS[0]) => {
    hapticLight();
    if (!item.url) return;
    if (item.url.startsWith("http") || item.url.startsWith("mailto")) {
      window.open(item.url, "_blank");
    } else {
      navigate(item.url);
    }
  };

  return (
    <div className="pb-28 max-w-lg mx-auto animate-page-enter">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <button onClick={() => { hapticLight(); navigate(-1); }} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-semibold">Help</h1>
        <div className="w-9" />
      </div>

      {/* Menu items */}
      <div className="px-4">
        {HELP_ITEMS.map((item, i) => (
          <button
            key={i}
            onClick={() => handleItem(item)}
            disabled={!item.url}
            className="w-full flex items-center justify-between py-4 border-b last:border-b-0 text-left transition-opacity active:opacity-60"
            style={{ borderColor: "var(--border)" }}
          >
            <span className="text-sm">{item.label}</span>
            {item.url && (
              <ChevronRight className="w-4 h-4" style={{ color: "rgba(255,255,255,0.2)" }} />
            )}
          </button>
        ))}
      </div>

      {/* Version info */}
      <div className="px-4 mt-6">
        <p className="text-xs text-center" style={{ color: "var(--muted-foreground)" }}>
          Plate v1.0 · Built with ❤️
        </p>
      </div>
    </div>
  );
}
