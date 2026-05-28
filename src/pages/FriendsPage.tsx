/**
 * FriendsPage — MFP-style Friends list (All/Requests tabs)
 */
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { ChevronLeft, UserPlus, Search } from "lucide-react";
import { hapticLight } from "@/lib/haptics";

type Tab = "All" | "Requests";

export function FriendsPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("All");

  return (
    <div className="pb-28 max-w-lg mx-auto animate-page-enter">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <button onClick={() => { hapticLight(); navigate(-1); }} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-semibold">Friends</h1>
        <button className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
          <UserPlus className="w-5 h-5" />
        </button>
      </div>

      {/* Search bar */}
      <div className="px-4 mb-3">
        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid var(--border)" }}>
          <Search className="w-4 h-4 flex-shrink-0" style={{ color: "var(--muted-foreground)" }} />
          <input
            placeholder="Find friends..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b" style={{ borderColor: "var(--border)" }}>
        {(["All", "Requests"] as Tab[]).map((t) => (
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

      {/* Empty state */}
      <div className="flex flex-col items-center justify-center py-16 px-8 text-center" style={{ color: "var(--muted-foreground)" }}>
        <UserPlus className="w-12 h-12 mb-4 opacity-30" />
        <p className="text-base font-semibold mb-1" style={{ color: "var(--foreground)" }}>
          {tab === "All" ? "No friends yet" : "No pending requests"}
        </p>
        <p className="text-sm">
          {tab === "All"
            ? "Add friends to compare progress and stay motivated together."
            : "When someone sends you a friend request, it will appear here."}
        </p>
        {tab === "All" && (
          <button
            className="mt-5 px-6 py-2.5 rounded-full text-sm font-semibold"
            style={{ background: "#52B788", color: "#0d1f13" }}
          >
            Add Friends
          </button>
        )}
      </div>
    </div>
  );
}
