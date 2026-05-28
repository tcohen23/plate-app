/**
 * MessagesPage — Plate inbox (system messages, tips, announcements)
 */
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { ChevronLeft, X, Leaf } from "lucide-react";
import { hapticLight } from "@/lib/haptics";

type Tab = "Inbox" | "Announcements";

interface Message {
  id: string;
  from: string;
  subject: string;
  preview: string;
  body: string;
  date: string;
  read: boolean;
  avatar: string;
  avatarBg: string;
}

const TODAY = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
const YESTERDAY = new Date(Date.now() - 86400000).toLocaleDateString("en-US", { month: "short", day: "numeric" });

const INBOX: Message[] = [
  {
    id: "welcome",
    from: "Plate Team",
    subject: "Welcome to Plate 🎉",
    preview: "You're in. Here's how to get the most out of your first week.",
    avatar: "🌿",
    avatarBg: "rgba(82,183,136,0.2)",
    date: TODAY,
    read: false,
    body: `Welcome to Plate — we're glad you're here.

Getting started is simple:

1. Log your first meal today using the + button at the bottom. Tap any food to search our database of 14M+ items, or scan a barcode.

2. Set your daily calorie and macro goals — they're auto-calculated from your profile, but you can adjust in Settings anytime.

3. Check your Dashboard each morning. Your daily ring shows calorie progress, and your macro bars keep you on track throughout the day.

4. Try the Meal Plan tab. Plate builds a personalized weekly plan around your goals, diet preferences, and cooking style.

5. Log your weight weekly. Trends matter more than daily readings — Plate shows you the moving average so temporary fluctuations don't derail your momentum.

Have questions? Tap More → Help to browse FAQs or reach our support team.

Here's to hitting your goals — one meal at a time.

— The Plate Team`,
  },
  {
    id: "tip1",
    from: "Plate Tips",
    subject: "Protein tip: Front-load it 💪",
    preview: "Eating protein earlier in the day reduces total daily calorie intake by up to 400 cals.",
    avatar: "💡",
    avatarBg: "rgba(249,199,79,0.15)",
    date: YESTERDAY,
    read: true,
    body: `Quick nutrition tip from our team:

**Front-load your protein.**

Studies consistently show that eating 30–40g of protein at breakfast reduces total daily calorie intake by 175–450 calories — not through restriction, but by naturally suppressing hunger for 4–6 hours.

Try this tomorrow: eggs, Greek yogurt with protein powder, or a protein smoothie before anything else. Notice how much less you want to snack by 11am.

Small shift. Big results over time.

— Plate Tips`,
  },
  {
    id: "tip2",
    from: "Plate Tips",
    subject: "Streak tip: The 2-day rule 🔥",
    preview: "Never miss two days in a row. One missed day is a slip, two is a new habit.",
    avatar: "🔥",
    avatarBg: "rgba(249,199,79,0.12)",
    date: new Date(Date.now() - 2 * 86400000).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    read: true,
    body: `The 2-day rule is the most effective habit-building principle we know of:

**Never miss two days in a row.**

One missed day is a slip. That's fine — life happens. Two consecutive missed days starts rewiring your brain back to the old pattern. The research on habit formation confirms this threshold.

On days you know you can't fully track (travel, events, holidays): log *something*. Even one meal. Even just water. Keeping the streak alive with minimal effort is infinitely better than breaking it.

Your current streak is tracked on your Dashboard. Keep it alive.

— Plate Tips`,
  },
];

const ANNOUNCEMENTS: Message[] = [
  {
    id: "ann1",
    from: "Product Updates",
    subject: "What's new in Plate — May 2026",
    preview: "Weekly Report navigation, real Learn articles, improved step tracking, and more.",
    avatar: "✨",
    avatarBg: "rgba(82,183,136,0.15)",
    date: TODAY,
    read: false,
    body: `Here's what's new in Plate this month:

**Weekly Report navigation**
You can now tap ← → in your Weekly Report to scroll through any past week's data. See your calorie trends, macro averages, and step counts for any week in your history.

**Learn hub**
The Learn page now has real, expert-written articles on nutrition science, meal prep, GLP-1 support, building muscle, and more. Every article is reviewed by a registered dietitian.

**GLP-1 Support — now free**
GLP-1 tracking (dose logging, medication reminders, side effect notes) is now available to all Plate users. No premium required.

**Steps page refresh**
The Steps page has been redesigned with a cleaner daily/weekly chart, step goal ring, and calorie burn estimate.

**Sleep tracker shortcut**
Tapping the Sleep button in your Dashboard now jumps directly into the sleep log entry — no extra taps needed.

More coming soon. Thank you for using Plate.

— The Plate Team`,
  },
];

export function MessagesPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("Inbox");
  const [openMsg, setOpenMsg] = useState<Message | null>(null);
  const [readIds, setReadIds] = useState<Set<string>>(new Set(["tip1", "tip2", "ann1"]));

  const messages = tab === "Inbox" ? INBOX : ANNOUNCEMENTS;
  const unreadCount = INBOX.filter(m => !readIds.has(m.id)).length;

  const handleOpen = (msg: Message) => {
    hapticLight();
    setReadIds(prev => new Set([...prev, msg.id]));
    setOpenMsg(msg);
  };

  if (openMsg) {
    return (
      <div className="pb-28 max-w-lg mx-auto animate-page-enter">
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <button onClick={() => { hapticLight(); setOpenMsg(null); }} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-sm font-semibold truncate max-w-[200px]">{openMsg.from}</span>
          <button onClick={() => { hapticLight(); setOpenMsg(null); }} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4">
          <h1 className="text-lg font-bold mb-1">{openMsg.subject}</h1>
          <div className="flex items-center gap-2 mb-5">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-sm" style={{ background: openMsg.avatarBg }}>
              {openMsg.avatar}
            </div>
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{openMsg.from} · {openMsg.date}</span>
          </div>

          <div className="space-y-3">
            {openMsg.body.split("\n\n").map((para, i) => {
              if (para.startsWith("**") && para.endsWith("**")) {
                return <h3 key={i} className="text-sm font-bold mt-4" style={{ color: "var(--foreground)" }}>{para.replace(/\*\*/g, "")}</h3>;
              }
              const parts = para.split(/(\*\*[^*]+\*\*)/g);
              return (
                <p key={i} className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.75)" }}>
                  {parts.map((part, j) =>
                    part.startsWith("**") && part.endsWith("**")
                      ? <strong key={j} style={{ color: "rgba(255,255,255,0.95)" }}>{part.replace(/\*\*/g, "")}</strong>
                      : part
                  )}
                </p>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-28 max-w-lg mx-auto animate-page-enter">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <button onClick={() => { hapticLight(); navigate(-1); }} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-semibold">Messages</h1>
        <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(82,183,136,0.1)" }}>
          <Leaf className="w-4 h-4" style={{ color: "#52B788" }} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex px-4 gap-1 mb-4">
        {(["Inbox", "Announcements"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { hapticLight(); setTab(t); }}
            className="flex-1 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all"
            style={{
              background: tab === t ? "#52B788" : "rgba(255,255,255,0.06)",
              color: tab === t ? "#0d1f13" : "rgba(255,255,255,0.6)",
            }}
          >
            {t}
            {t === "Inbox" && unreadCount > 0 && (
              <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black"
                style={{ background: tab === "Inbox" ? "rgba(0,0,0,0.25)" : "#52B788", color: tab === "Inbox" ? "#0d1f13" : "#000" }}>
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Message list */}
      <div className="mx-4 rounded-2xl overflow-hidden" style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}>
        {messages.map((msg, i) => {
          const isRead = readIds.has(msg.id);
          return (
            <button
              key={msg.id}
              onClick={() => handleOpen(msg)}
              className="w-full flex items-center gap-4 px-4 py-4 text-left transition-opacity active:opacity-60"
              style={{ borderBottom: i < messages.length - 1 ? "1px solid var(--border)" : "none" }}
            >
              {/* Avatar */}
              <div className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 text-xl" style={{ background: msg.avatarBg }}>
                {msg.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-sm font-semibold">{msg.from}</span>
                  <span className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>{msg.date}</span>
                </div>
                <p className="text-xs font-medium mb-0.5 truncate" style={{ color: isRead ? "rgba(255,255,255,0.5)" : "var(--foreground)" }}>
                  {msg.subject}
                </p>
                <p className="text-xs truncate" style={{ color: "var(--muted-foreground)" }}>{msg.preview}</p>
              </div>
              {!isRead && (
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#52B788" }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
