/**
 * ExportPage — Export My Information (photo 28)
 * Tapping export buttons triggers paywall modal.
 */
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Download, FileSpreadsheet, Database, File } from "lucide-react";
import { usePaywall } from "@/components/PaywallModal";

export function ExportPage() {
  const navigate = useNavigate();
  const { paywallNode, openPaywall } = usePaywall("general");

  return (
    <div className="pb-28 max-w-lg mx-auto animate-page-enter">
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <button onClick={() => navigate(-1)}><ChevronLeft className="w-5 h-5" /></button>
        <h1 className="text-base font-semibold">Export Information</h1>
        <div className="w-6" />
      </div>

      {/* Visual */}
      <div className="flex items-center justify-center gap-4 py-10 px-4">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "rgba(82,183,136,0.1)", border: "1px solid rgba(82,183,136,0.2)" }}>
          <Database className="w-6 h-6" style={{ color: "#52B788" }} />
        </div>
        <div className="flex flex-col gap-1">
          <div className="w-10 h-0.5 rounded" style={{ background: "#52B788" }} />
          <div className="w-10 h-0.5 rounded" style={{ background: "#52B788" }} />
          <div className="w-10 h-0.5 rounded" style={{ background: "#52B788" }} />
        </div>
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "rgba(229,180,84,0.1)", border: "1px solid rgba(229,180,84,0.2)" }}>
          <FileSpreadsheet className="w-6 h-6" style={{ color: "#E5B454" }} />
        </div>
      </div>

      <div className="px-4 text-center mb-8">
        <h2 className="text-xl font-bold mb-2">Export My Information</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Download a full CSV export of your nutrition logs, weight history, exercise data, and more.
        </p>
      </div>

      <div className="px-4 space-y-3">
        {["Nutrition Logs (CSV)", "Weight & Measurements (CSV)", "Exercise Logs (CSV)", "Complete Data Export (ZIP)"].map(type => (
          <button key={type} className="w-full flex items-center px-4 py-4 rounded-2xl text-left transition-opacity active:opacity-70"
            style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}
            onClick={openPaywall}>
            <File className="w-4 h-4 mr-3" style={{ color: "#52B788" }} />
            <span className="flex-1 text-sm">{type}</span>
            <Download className="w-4 h-4" style={{ color: "rgba(255,255,255,0.3)" }} />
          </button>
        ))}
      </div>

      {paywallNode}
    </div>
  );
}
