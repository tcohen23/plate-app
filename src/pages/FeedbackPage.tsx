/**
 * FeedbackPage — Users submit ideas + upvote existing ones
 * Route: /feedback
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { ChevronLeft, Lightbulb, ThumbsUp, Send, Sparkles, Loader2, Trash2, Edit3, Check, X } from "lucide-react";
import { hapticLight, hapticMedium } from "@/lib/haptics";
import { toast } from "sonner";

const CATEGORIES = [
  { id: "feature", label: "New Feature", emoji: "✨" },
  { id: "improvement", label: "Improvement", emoji: "🔧" },
  { id: "bug", label: "Bug Report", emoji: "🐛" },
  { id: "general", label: "General", emoji: "💬" },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  new: { label: "New", color: "#888", bg: "rgba(255,255,255,0.06)" },
  planned: { label: "Planned", color: "#60a5fa", bg: "rgba(96,165,250,0.1)" },
  in_progress: { label: "In Progress", color: "#52B788", bg: "rgba(82,183,136,0.1)" },
  done: { label: "Done ✓", color: "#a78bfa", bg: "rgba(167,139,250,0.1)" },
};

export function FeedbackPage() {
  const navigate = useNavigate();
  const feedbackList = useQuery(api.feedback.listFeedback);
  const isAdmin = useQuery(api.admin.isAdmin) === true;
  const submitFeedback = useMutation(api.feedback.submitFeedback);
  const toggleUpvote = useMutation(api.feedback.toggleUpvote);
  const deleteFeedback = useMutation(api.feedback.deleteFeedback);
  const setUpvoteCount = useMutation(api.feedback.setUpvoteCount);

  const [text, setText] = useState("");
  const [category, setCategory] = useState("feature");
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingUpvotesId, setEditingUpvotesId] = useState<Id<"feedback"> | null>(null);
  const [editingUpvotesVal, setEditingUpvotesVal] = useState("");

  const handleSubmit = async () => {
    if (!text.trim() || text.trim().length < 5) {
      toast.error("Please write at least a sentence 😊");
      return;
    }
    setSubmitting(true);
    try {
      await submitFeedback({ text, category });
      hapticMedium();
      toast.success("Idea submitted! Thanks 🙌");
      setText("");
      setCategory("feature");
      setShowForm(false);
    } catch {
      toast.error("Failed to submit. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpvote = async (id: Id<"feedback">) => {
    hapticLight();
    try {
      await toggleUpvote({ feedbackId: id });
    } catch {
      toast.error("Could not upvote");
    }
  };

  const handleDelete = async (id: Id<"feedback">) => {
    if (!confirm("Delete this idea?")) return;
    try {
      await deleteFeedback({ feedbackId: id });
      hapticMedium();
      toast.success("Idea deleted");
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleSaveUpvotes = async (id: Id<"feedback">) => {
    const val = parseInt(editingUpvotesVal, 10);
    if (isNaN(val) || val < 0) { toast.error("Enter a valid number"); return; }
    try {
      await setUpvoteCount({ feedbackId: id, upvotes: val });
      toast.success("Upvotes updated");
      setEditingUpvotesId(null);
      setEditingUpvotesVal("");
    } catch {
      toast.error("Failed to update");
    }
  };

  return (
    <div
      className="flex flex-col min-h-screen"
      style={{ background: "#000", paddingBottom: 100 }}
    >
    <div className="max-w-2xl lg:max-w-4xl mx-auto w-full flex-1 flex flex-col">
      {/* Header */}
      <div
        className="flex items-center gap-3 px-4 pt-5 pb-4 sticky top-0 z-10"
        style={{ background: "rgba(0,0,0,0.95)", backdropFilter: "blur(10px)" }}
      >
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "rgba(255,255,255,0.08)" }}
        >
          <ChevronLeft className="w-5 h-5 text-white" />
        </button>
        <div className="flex-1">
          <h1 className="text-white font-semibold text-base">Ideas & Feedback</h1>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
            Shape the future of Plate
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); hapticLight(); }}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-full font-semibold text-sm"
          style={{ background: "#52B788", color: "#0d1f13" }}
        >
          <Lightbulb className="w-3.5 h-3.5" />
          Share Idea
        </button>
      </div>

      {/* Submit form (slide-in card) */}
      {showForm && (
        <div className="px-4 mb-5">
          <div
            className="rounded-2xl p-4"
            style={{ background: "#141414", border: "1px solid rgba(82,183,136,0.3)" }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4" style={{ color: "#52B788" }} />
              <span className="text-white font-semibold text-sm">Share your idea</span>
              <button
                onClick={() => setShowForm(false)}
                className="ml-auto text-xs"
                style={{ color: "rgba(255,255,255,0.4)" }}
              >
                Cancel
              </button>
            </div>

            {/* Category chips */}
            <div className="flex gap-2 flex-wrap mb-3">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => { setCategory(cat.id); hapticLight(); }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                  style={{
                    background: category === cat.id ? "#52B788" : "rgba(255,255,255,0.06)",
                    color: category === cat.id ? "#0d1f13" : "rgba(255,255,255,0.6)",
                    border: `1px solid ${category === cat.id ? "transparent" : "rgba(255,255,255,0.1)"}`,
                  }}
                >
                  <span>{cat.emoji}</span>
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Textarea */}
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Describe your idea or feedback... What problem does it solve?"
              className="w-full text-sm text-white resize-none rounded-xl p-3 outline-none"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                minHeight: 100,
                color: "white",
              }}
              maxLength={1000}
              autoFocus
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                {text.length}/1000
              </span>
              <button
                onClick={handleSubmit}
                disabled={submitting || text.trim().length < 5}
                className="flex items-center gap-1.5 px-4 py-2 rounded-full font-semibold text-sm disabled:opacity-40"
                style={{ background: "#52B788", color: "#0d1f13" }}
              >
                {submitting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hero card — only when list is empty-ish / first time */}
      {!showForm && feedbackList?.length === 0 && (
        <div className="mx-4 mb-4 rounded-2xl p-5 text-center" style={{ background: "#141414", border: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="text-3xl mb-3">💡</div>
          <p className="text-white font-semibold text-sm mb-1">Be the first to share an idea</p>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
            Your feedback directly shapes what gets built next.
          </p>
        </div>
      )}

      {/* Feedback list */}
      <div className="px-4 flex flex-col gap-3">
        {feedbackList === undefined ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-5 h-5 animate-spin" style={{ color: "rgba(255,255,255,0.3)" }} />
          </div>
        ) : (
          feedbackList.map((item) => {
            const statusCfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.new;
            const catCfg = CATEGORIES.find((c) => c.id === item.category);
            return (
              <div
                key={item._id}
                className="rounded-2xl p-4"
                style={{
                  background: item.isOwn ? "rgba(82,183,136,0.05)" : "#141414",
                  border: `1px solid ${item.isOwn ? "rgba(82,183,136,0.2)" : "rgba(255,255,255,0.06)"}`,
                }}
              >
                {/* Top row: category + status */}
                <div className="flex items-center gap-2 mb-2">
                  {catCfg && (
                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
                      {catCfg.emoji} {catCfg.label}
                    </span>
                  )}
                  <span
                    className="ml-auto text-xs font-medium px-2.5 py-0.5 rounded-full"
                    style={{ background: statusCfg.bg, color: statusCfg.color }}
                  >
                    {statusCfg.label}
                  </span>
                </div>

                {/* Text */}
                <p className="text-white text-sm leading-relaxed mb-3">{item.text}</p>

                {/* Bottom: upvote button + admin controls */}
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
                    {new Date(item.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    {item.isOwn && <span style={{ color: "rgba(82,183,136,0.6)" }}> · your idea</span>}
                  </span>
                  <div className="flex items-center gap-2">
                    {/* Admin: edit upvote count */}
                    {isAdmin && editingUpvotesId === item._id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={editingUpvotesVal}
                          onChange={(e) => setEditingUpvotesVal(e.target.value)}
                          className="w-14 text-xs text-white text-center rounded-lg px-2 py-1 outline-none"
                          style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.2)" }}
                          autoFocus
                          min={0}
                        />
                        <button
                          onClick={() => handleSaveUpvotes(item._id)}
                          className="w-6 h-6 rounded-full flex items-center justify-center"
                          style={{ background: "rgba(82,183,136,0.2)", color: "#52B788" }}
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => { setEditingUpvotesId(null); setEditingUpvotesVal(""); }}
                          className="w-6 h-6 rounded-full flex items-center justify-center"
                          style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.5)" }}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <>
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => { setEditingUpvotesId(item._id); setEditingUpvotesVal(String(item.upvotes ?? 0)); hapticLight(); }}
                              className="w-7 h-7 rounded-full flex items-center justify-center transition-all active:scale-90"
                              style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.4)" }}
                              title="Edit upvote count"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDelete(item._id)}
                              className="w-7 h-7 rounded-full flex items-center justify-center transition-all active:scale-90"
                              style={{ background: "rgba(239,68,68,0.1)", color: "rgba(239,68,68,0.7)" }}
                              title="Delete idea"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleUpvote(item._id)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95"
                          style={{
                            background: item.hasUpvoted ? "rgba(82,183,136,0.15)" : "rgba(255,255,255,0.06)",
                            color: item.hasUpvoted ? "#52B788" : "rgba(255,255,255,0.5)",
                            border: `1px solid ${item.hasUpvoted ? "rgba(82,183,136,0.3)" : "rgba(255,255,255,0.08)"}`,
                          }}
                        >
                          <ThumbsUp className="w-3 h-3" />
                          {item.upvotes > 0 ? item.upvotes : "Upvote"}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>{/* max-w wrapper */}
    </div>
  );
}
