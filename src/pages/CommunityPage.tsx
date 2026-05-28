/**
 * CommunityPage — MFP-style community forum (embedded view)
 */
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Bell, Search, Plus } from "lucide-react";
import { hapticLight } from "@/lib/haptics";

const FORUM_CATEGORIES = [
  {
    title: "Getting Started",
    description: "Get help and support with starting your Plate journey.",
    discussions: "44,433",
    comments: "408,516",
    latest: { title: "Ready for a Change", by: "f8wyww52wv" },
  },
  {
    title: "Health and Weight Loss",
    description: "Ask questions and get help from other members on anything health and weight loss related.",
    discussions: "261,299",
    comments: "4,098,461",
    latest: { title: "4–7pm", by: "elisa123gal" },
  },
  {
    title: "Food and Nutrition",
    description: "Post and share tips, nutritional advice, discuss ways of eating and more.",
    discussions: "176,551",
    comments: "2,597,263",
    latest: { title: "~What's for Dinner?", by: "carmichealdeb" },
  },
  {
    title: "Recipes",
    description: "Share your favorite recipes and healthy cooking tips.",
    discussions: "47,689",
    comments: "618,003",
    latest: { title: "What do your meals look like (show me pictures)....", by: "mjbnj0001" },
  },
  {
    title: "Fitness and Exercise",
    description: "Share fitness tips and exercise suggestions with other Plate members.",
    discussions: "233,015",
    comments: "2,676,139",
    latest: { title: "What Was Your Work Out Today?", by: "AnnRT77" },
  },
];

export function CommunityPage() {
  const navigate = useNavigate();

  return (
    <div className="pb-28 max-w-lg mx-auto animate-page-enter">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <button onClick={() => { hapticLight(); navigate(-1); }} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-semibold">Community</h1>
        <button className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid var(--border)" }}>
          <Search className="w-4 h-4" />
        </button>
      </div>

      {/* MFP-style blue header bar */}
      <div className="mx-4 mb-4 rounded-xl px-4 py-3 flex items-center justify-between" style={{ background: "#1a6ef5" }}>
        <div className="flex items-center gap-2">
          <div className="flex items-baseline gap-1">
            <span className="text-white font-bold text-base italic">plate</span>
            <span className="text-xs text-white/80 px-1 rounded font-medium" style={{ background: "rgba(255,255,255,0.2)" }}>Community</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Search className="w-5 h-5 text-white" />
          <button className="w-7 h-7 rounded-full flex items-center justify-center bg-white/20">
            <span className="text-white text-xs font-bold">≡</span>
          </button>
        </div>
      </div>

      {/* Forum categories */}
      <div className="px-4 space-y-0">
        {FORUM_CATEGORIES.map((cat, i) => (
          <div
            key={i}
            className="flex items-start justify-between py-4 border-b"
            style={{ borderColor: "var(--border)" }}
          >
            <div className="flex-1 min-w-0 pr-4">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-sm font-bold">{cat.title}</h3>
                <Bell className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#52B788" }} />
              </div>
              <p className="text-xs mb-1.5 leading-relaxed" style={{ color: "var(--muted-foreground)" }}>{cat.description}</p>
              <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>
                {cat.discussions} discussions &nbsp;{cat.comments} comments
              </p>
              {cat.latest && (
                <p className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>
                  Most recent: <span className="font-semibold" style={{ color: "var(--foreground)" }}>{cat.latest.title}</span> by{" "}
                  <span style={{ color: "#52B788" }}>{cat.latest.by}</span>
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* FAB */}
      <button
        className="fixed bottom-24 right-6 w-14 h-14 rounded-full flex items-center justify-center shadow-xl z-10"
        style={{ background: "#52B788" }}
      >
        <Plus className="w-6 h-6" style={{ color: "#0d1f13" }} />
      </button>
    </div>
  );
}
