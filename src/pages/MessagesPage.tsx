/**
 * MessagesPage — MFP-style Messages (Inbox/Sent)
 */
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { ChevronLeft, Plus, User } from "lucide-react";
import { hapticLight } from "@/lib/haptics";

type Tab = "Inbox" | "Sent";

const INBOX_MESSAGES = [
  {
    id: "1",
    from: "Plate",
    preview: "Welcome to the Community — Dear Plate Member,",
    date: new Date().toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "2-digit" }),
    read: false,
  },
];

export function MessagesPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("Inbox");

  return (
    <div className="pb-28 max-w-lg mx-auto animate-page-enter">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <button onClick={() => { hapticLight(); navigate(-1); }} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-semibold">Messages</h1>
        <button className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b" style={{ borderColor: "var(--border)" }}>
        {(["Inbox", "Sent"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 py-3 text-sm font-semibold transition-colors"
            style={{
              color: tab === t ? "var(--foreground)" : "var(--muted-foreground)",
              borderBottom: tab === t ? "2px solid #52B788" : "2px solid transparent",
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Message list */}
      <div className="px-4 pt-2">
        {tab === "Inbox" && INBOX_MESSAGES.map((msg) => (
          <button
            key={msg.id}
            className="w-full flex items-center gap-4 py-4 border-b text-left transition-opacity active:opacity-60"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(255,255,255,0.1)" }}>
              <User className="w-6 h-6" style={{ color: "rgba(255,255,255,0.5)" }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-sm font-semibold">{msg.from}</span>
                <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{msg.date}</span>
              </div>
              <p className="text-xs truncate" style={{ color: "var(--muted-foreground)" }}>{msg.preview}</p>
            </div>
          </button>
        ))}
        {tab === "Sent" && (
          <div className="flex flex-col items-center justify-center py-16" style={{ color: "var(--muted-foreground)" }}>
            <p className="text-sm">No sent messages</p>
          </div>
        )}
      </div>
    </div>
  );
}
