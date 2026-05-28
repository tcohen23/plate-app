/**
 * LearnPage — MFP-style Learn (articles grid, dietitians' corner, topics)
 */
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Share2 } from "lucide-react";
import { hapticLight } from "@/lib/haptics";

type FilterChip = "All" | "GLP-1" | "Meal Prep" | "Building Muscle" | "Weight Loss" | "Recipes";

const FILTER_CHIPS: FilterChip[] = ["GLP-1", "All", "Meal Prep", "Building Muscle", "Weight Loss", "Recipes"];

const ARTICLES = [
  {
    id: "1",
    title: "Peach Overnight Oats With Chia Seeds",
    readTime: "1 minute read",
    image: "🥣",
    category: "Recipes",
  },
  {
    id: "2",
    title: "7 Ways To Make Healthy Choices When Eating Out...",
    readTime: "7 minute read",
    image: "🍽️",
    category: "All",
  },
  {
    id: "3",
    title: "I Tried Blue Apron Meal Kits For A Week — Here's How They ...",
    readTime: "8 minute read",
    image: "📦",
    category: "Meal Prep",
  },
  {
    id: "4",
    title: "What A Calorie Deficit Meal Plan Looks Like",
    readTime: "8 minute read",
    image: "🥗",
    category: "Weight Loss",
  },
  {
    id: "5",
    title: "Cameron Brink's 5 Tips For Tracking Nutrition Without Th...",
    readTime: "5 minute read",
    image: "💪",
    category: "Building Muscle",
  },
  {
    id: "6",
    title: "What Actually Happens When You Log Your Food (And...",
    readTime: "7 minute read",
    image: "📱",
    category: "All",
  },
  {
    id: "7",
    title: "What To Expect On GLP-1s: Typical Side Effects And...",
    readTime: "10 minute read",
    image: "💊",
    category: "GLP-1",
  },
  {
    id: "8",
    title: "The 11 Biggest GLP-1 Myths, Busted By Expert Dietitians",
    readTime: "10 minute read",
    image: "🔬",
    category: "GLP-1",
  },
];

const DIETITIAN_TIPS = [
  `"I recommend fiber as part of a balanced diet. As you increase your fiber intake, make sure to increase water consumption as well." — Sarah M., RD`,
  `"Protein is the most satiating macronutrient. Aim for 0.7–1g per pound of bodyweight to preserve muscle while in a calorie deficit." — James K., RD`,
  `"Meal prepping on Sundays can reduce weekday decision fatigue significantly — even just prepping 2–3 proteins helps." — Maya T., RDN`,
];

const TOPICS = ["Getting Started", "Gut Health", "Calories", "Protein", "Hydration", "Sleep"];

const PAGE_SIZE = 4;

export function LearnPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterChip>("All");
  const [page, setPage] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);

  const filtered = filter === "All"
    ? ARTICLES
    : ARTICLES.filter(a => a.category === filter);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageArticles = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleFilter = (f: FilterChip) => {
    hapticLight();
    setFilter(f);
    setPage(0);
  };

  return (
    <div className="pb-28 max-w-lg mx-auto animate-page-enter">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <button onClick={() => { hapticLight(); navigate(-1); }} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-bold">Learn</h1>
        <button className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
          <Share2 className="w-4 h-4" />
        </button>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 px-4 pb-4 overflow-x-auto scrollbar-hide">
        {FILTER_CHIPS.map((chip) => (
          <button
            key={chip}
            onClick={() => handleFilter(chip)}
            className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all active:scale-95"
            style={{
              background: filter === chip ? "#52B788" : "rgba(255,255,255,0.1)",
              color: filter === chip ? "#0d1f13" : "var(--foreground)",
              border: filter === chip ? "none" : "1px solid rgba(255,255,255,0.15)",
            }}
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Article grid */}
      <div className="px-4 mb-4">
        <div className="grid grid-cols-2 gap-3">
          {pageArticles.map((article) => (
            <button
              key={article.id}
              onClick={() => hapticLight()}
              className="flex flex-col text-left rounded-2xl overflow-hidden transition-all active:scale-[0.98]"
              style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}
            >
              {/* Image placeholder */}
              <div className="w-full aspect-video flex items-center justify-center text-4xl" style={{ background: "rgba(255,255,255,0.05)" }}>
                {article.image}
              </div>
              <div className="p-3">
                <p className="text-xs font-semibold leading-snug mb-1" style={{ color: "var(--foreground)" }}>{article.title}</p>
                <p className="text-xs" style={{ color: "var(--muted-foreground)" }}>{article.readTime}</p>
              </div>
            </button>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 px-2">
            <button
              onClick={() => { hapticLight(); setPage(Math.max(0, page - 1)); }}
              disabled={page === 0}
              className="w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-30"
              style={{ background: "#52B788" }}
            >
              <ChevronLeft className="w-5 h-5" style={{ color: "#0d1f13" }} />
            </button>
            <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>{page + 1} / {totalPages}</span>
            <button
              onClick={() => { hapticLight(); setPage(Math.min(totalPages - 1, page + 1)); }}
              disabled={page >= totalPages - 1}
              className="w-10 h-10 rounded-full flex items-center justify-center disabled:opacity-30"
              style={{ background: "#52B788" }}
            >
              <ChevronRight className="w-5 h-5" style={{ color: "#0d1f13" }} />
            </button>
          </div>
        )}
      </div>

      {/* Dietitians' corner */}
      <div className="px-4 mb-4">
        <h2 className="text-lg font-bold mb-3">Dietitians' corner</h2>
        <div className="rounded-2xl p-4 flex items-start gap-3" style={{ background: "rgba(82,183,136,0.08)", border: "1px solid rgba(82,183,136,0.2)" }}>
          <div className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center text-2xl" style={{ background: "rgba(82,183,136,0.15)" }}>
            👩‍⚕️
          </div>
          <p className="text-sm italic leading-relaxed flex-1" style={{ color: "rgba(255,255,255,0.85)" }}>
            {DIETITIAN_TIPS[tipIndex]}
          </p>
        </div>
        <div className="flex gap-1 justify-center mt-3">
          {DIETITIAN_TIPS.map((_, i) => (
            <button
              key={i}
              onClick={() => { hapticLight(); setTipIndex(i); }}
              className="w-1.5 h-1.5 rounded-full transition-all"
              style={{ background: i === tipIndex ? "#52B788" : "rgba(255,255,255,0.2)" }}
            />
          ))}
        </div>
      </div>

      {/* Topics */}
      <div className="px-4">
        <h2 className="text-lg font-bold mb-3">Topics</h2>
        <div className="flex flex-wrap gap-2">
          {TOPICS.map((topic) => (
            <button
              key={topic}
              onClick={() => hapticLight()}
              className="px-4 py-2 rounded-full text-sm font-medium transition-all active:scale-95"
              style={{ background: "rgba(255,255,255,0.07)", border: "1px solid var(--border)" }}
            >
              {topic}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
