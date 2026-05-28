/**
 * LearnPage — Real nutrition education hub
 * Full articles with expandable detail, dietitian tips, topic browsing
 */
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { ChevronLeft, ChevronRight, X, Clock, BookOpen } from "lucide-react";
import { hapticLight } from "@/lib/haptics";

type FilterChip = "All" | "GLP-1" | "Meal Prep" | "Building Muscle" | "Weight Loss" | "Recipes" | "Nutrition";

const FILTER_CHIPS: FilterChip[] = ["All", "Weight Loss", "Nutrition", "Building Muscle", "Meal Prep", "GLP-1", "Recipes"];

interface Article {
  id: string;
  title: string;
  readTime: string;
  category: FilterChip;
  gradient: string;
  emoji: string;
  content: string;
  author: string;
  authorRole: string;
  keyTakeaways: string[];
}

const ARTICLES: Article[] = [
  {
    id: "1",
    title: "The Truth About Calorie Deficits (And Why 500/Day Isn't for Everyone)",
    readTime: "5 min read",
    category: "Weight Loss",
    gradient: "linear-gradient(135deg, #1B4332, #2D6A4F)",
    emoji: "🔥",
    author: "Dr. Sarah Mitchell",
    authorRole: "RD, Sports Nutritionist",
    keyTakeaways: [
      "A 500 cal/day deficit = ~1 lb/week — but only if your TDEE is accurate",
      "Aggressive deficits trigger muscle loss and metabolic adaptation after 4–6 weeks",
      "Diet breaks every 8–12 weeks reset leptin and reduce adaptive thermogenesis",
      "Track weekly averages, not daily — weight fluctuates ±4 lbs from water alone",
    ],
    content: `A 500-calorie daily deficit is the standard advice you'll see everywhere — lose 1 pound a week, simple math. The problem is this formula assumes your Total Daily Energy Expenditure (TDEE) is fixed, and it isn't.

**Your metabolism adapts.** When you eat less, your body does three things: reduces non-exercise activity (you fidget less, move slower), lowers your resting metabolic rate by 10–15%, and decreases the thermic effect of food. Combined, this can reduce your daily burn by 200–400 calories within 4 weeks. That's why weight loss always slows, even when you stay perfectly on plan.

**Who shouldn't do a 500/day deficit**

If you weigh under 150 lbs or have a sedentary job, a 500-calorie cut is likely too aggressive. You'll lose ~30–40% of weight from muscle, not fat — especially if protein is under 0.8g/lb of bodyweight. A 20–25% deficit (moderate cut) with high protein preserves lean mass and produces nearly the same fat loss over 12 weeks.

**The diet break strategy**

Spending 2 weeks at maintenance calories every 8–10 weeks of cutting resets leptin levels (your satiety hormone), restores gym performance, and reduces psychological diet fatigue. Studies show dieters who take structured breaks lose the same total fat but retain significantly more muscle than those who cut straight through.

**What actually matters**

Track calories in weekly averages, not daily. A perfect Monday means nothing if weekends blow it — consistency across 7 days is the only metric that predicts outcomes. Weigh yourself daily, but judge the 7-day average trend, not individual readings (water weight from sodium, carbs, and stress can swing ±4 lbs in a day).`,
  },
  {
    id: "2",
    title: "How Much Protein Do You Actually Need?",
    readTime: "6 min read",
    category: "Nutrition",
    gradient: "linear-gradient(135deg, #1a1a2e, #16213e)",
    emoji: "💪",
    author: "James Kellner",
    authorRole: "MS, CSCS",
    keyTakeaways: [
      "0.7–1g per pound of bodyweight covers muscle-building and preservation",
      "Timing matters less than total daily intake — 3–5 meals is optimal",
      "Plant proteins are complete when combined (rice + beans, etc.)",
      "More than 1.2g/lb shows diminishing returns for most people",
    ],
    content: `The RDA for protein is 0.36g per pound of bodyweight — enough to prevent deficiency, not enough to build or preserve muscle. For anyone training or trying to change body composition, real targets are 2–3× higher.

**The research consensus**

Meta-analyses covering 49 studies (over 1,800 subjects) find muscle growth plateaus at around 0.73g/lb/day in trained individuals. For safety margin and practical tracking, 0.8–1g/lb is the gold standard for active people. Older adults (50+) need slightly more — closer to 1–1.1g/lb — because muscle protein synthesis efficiency decreases with age.

**Timing: does it matter?**

Protein timing gets overcomplicated. The "anabolic window" is real but wide — 4–5 hours, not 30 minutes. What matters more is spreading protein across 3–5 meals to max muscle protein synthesis per meal. Each meal should hit ~30–40g of protein to fully stimulate synthesis (leucine threshold). One 120g protein day split into two massive meals is less effective than 4 × 30g meals.

**Best protein sources ranked**

Animal sources: chicken breast (31g/100g), tuna (30g/100g), Greek yogurt (17g/100g), eggs (13g/100g). These are "complete" — all essential amino acids present.

Plant sources: Tofu (17g/100g), edamame (11g/100g), lentils (9g/100g). Most are incomplete — combine rice + legumes or use a blended plant protein powder to cover all amino acids.

**Don't overthink it**

Hit your daily target. Make sure each meal has a quality protein source. Spread it reasonably. The rest is marketing.`,
  },
  {
    id: "3",
    title: "Meal Prep That Actually Works (The 90-Minute Sunday Method)",
    readTime: "7 min read",
    category: "Meal Prep",
    gradient: "linear-gradient(135deg, #2d1b69, #11998e)",
    emoji: "🥡",
    author: "Maya Torres",
    authorRole: "RDN, Culinary Nutritionist",
    keyTakeaways: [
      "Batch-cook 2 proteins, 2 starches, 3 veggies — mix-and-match all week",
      "Prep components, not full meals — avoids food fatigue",
      "Glass containers keep food fresh 5–6 days; freeze proteins on day 1",
      "90 minutes covers a full week if you use the oven + stovetop simultaneously",
    ],
    content: `The reason most people fail at meal prep: they cook 7 identical containers of the same meal and are sick of it by Wednesday. Component prepping fixes this.

**The system**

Cook 2 proteins, 2 carb sources, and 3 vegetables separately. Store them in individual containers. Build different combinations throughout the week — same ingredients, different meals. Monday is chicken + rice + broccoli. Tuesday is chicken + sweet potato + spinach. Same prep, zero food fatigue.

**The 90-minute workflow**

- **0:00** — Preheat oven to 400°F. Season chicken thighs and salmon. Season and chop 2 sheet pans of vegetables (broccoli, bell peppers, zucchini).
- **0:15** — Oven in: chicken and vegetables. Start rice in rice cooker. Start sweet potatoes in microwave (8 min).
- **0:30** — Boil eggs. Prep a cold salad base (kale holds up all week; spinach doesn't).
- **0:55** — Flip chicken, check vegetables.
- **1:15** — Everything out of oven. Rest meat 5 minutes.
- **1:20** — Portion and container.
- **1:30** — Done.

**Storage rules**

Glass containers beat plastic for meal prep — no chemical leaching, microwave-safe, stays fresh longer. Cooked chicken and fish: 4 days in fridge max. Cooked grains: 5 days. Roasted veg: 4–5 days. If you won't eat something by day 3, freeze it immediately on prep day.

**The one rule that changes everything**

Never pre-sauce your proteins. Keep sauces and dressings separate. Dry chicken stays good 4 days; sauced chicken gets soggy and unpleasant by day 2. Add sauce when you plate.`,
  },
  {
    id: "4",
    title: "Building Muscle on a Calorie Deficit: What the Science Says",
    readTime: "8 min read",
    category: "Building Muscle",
    gradient: "linear-gradient(135deg, #0f3460, #533483)",
    emoji: "🏋️",
    author: "Dr. James Kellner",
    authorRole: "PhD Exercise Physiology",
    keyTakeaways: [
      "Body recomposition is real — but mostly works for beginners and returning lifters",
      "High protein (1g/lb+) is non-negotiable for muscle gain while cutting",
      "Training volume and progressive overload matter more than surplus size",
      "Sleep and recovery are where muscle is actually built",
    ],
    content: `Body recomposition — simultaneously losing fat and gaining muscle — is real, but it's not equally accessible to everyone. Understanding who can do it and how sets correct expectations.

**Who can recomp effectively**

Beginners (under 1 year of consistent training) see the most dramatic recomp results. "Newbie gains" drive rapid muscle synthesis even in a deficit because untrained muscle tissue responds strongly to any novel stimulus. Returning lifters who took extended breaks (6+ months) also recomp well — muscle memory allows rapid regain of lost mass.

Experienced, lean trainees (2+ years, under 15% body fat) will find recomp very slow. At this stage, a dedicated bulk/cut cycle produces faster results.

**The non-negotiables**

Protein must be 0.9–1.2g/lb of bodyweight — this is the single biggest factor. Progressive overload must continue (add weight or reps each week). Sleep must be 7–9 hours — growth hormone is released primarily during deep sleep, and cutting this short kills muscle protein synthesis.

**Training for recomp**

Prioritize compound movements (squat, deadlift, bench, row, overhead press). Train 3–5 days per week with 10–20 working sets per muscle group per week. Keep intensity high (RPE 7–9) — moderate weight for high reps does not build as much muscle as heavier loads pushed close to failure.

**What doesn't matter much**

Post-workout nutrition timing. Specific exercises. Supplements (except creatine, which has solid evidence). Cardio type. These are second-order factors that matter only after the fundamentals are locked in.`,
  },
  {
    id: "5",
    title: "GLP-1 Medications & Nutrition: What to Eat on Ozempic",
    readTime: "10 min read",
    category: "GLP-1",
    gradient: "linear-gradient(135deg, #1d3557, #457b9d)",
    emoji: "💊",
    author: "Dr. Patricia Chen",
    authorRole: "MD, Endocrinology",
    keyTakeaways: [
      "Prioritize protein above all else — muscle loss is the #1 risk on GLP-1s",
      "Eat small, frequent meals — large meals can cause severe nausea",
      "Focus on nutrient density: every bite counts when appetite is suppressed",
      "Stay hydrated — dehydration is the most common GLP-1 side effect",
    ],
    content: `GLP-1 receptor agonists (semaglutide, tirzepatide) are powerful weight-loss tools, but they come with a significant nutritional challenge: dramatically reduced appetite can lead to inadequate protein and micronutrient intake, accelerating muscle loss alongside fat loss.

**The muscle loss problem**

Studies of semaglutide users show 25–39% of weight lost is lean mass (muscle + bone density) — significantly higher than the 20–25% seen in traditional caloric restriction. This happens because GLP-1s suppress appetite uniformly; without deliberate protein prioritization, people simply don't eat enough amino acids to maintain muscle.

The fix: aim for 1–1.2g of protein per pound of goal bodyweight, every day. This is higher than the standard 0.8–1g/lb because you're fighting both caloric restriction and blunted appetite simultaneously.

**What to eat**

*First priority: protein.* Chicken, fish, Greek yogurt, eggs, cottage cheese, protein shakes. Eat protein before anything else at every meal.

*Second: vegetables.* Fiber slows gastric emptying further (which is already slowed by GLP-1s), but it's essential for gut health and micronutrient density.

*Minimize:* High-fat, high-sugar, highly processed foods. These cause the most nausea on GLP-1s due to their effect on gastric motility.

**Managing nausea**

Eat slowly. Eat smaller meals more frequently (5–6 small meals vs. 3 large). Avoid lying down for 2 hours after eating. Ginger tea and cold foods are tolerated better than hot, heavy meals by most users.

**When to talk to your doctor**

If you're losing more than 2 lbs/week consistently, vomiting frequently, or unable to maintain adequate protein intake, dose adjustment may be needed. GLP-1 effectiveness is highest when nutrition is optimized — they're a tool, not a replacement for eating well.`,
  },
  {
    id: "6",
    title: "The Glycemic Index: Useful Tool or Overrated?",
    readTime: "5 min read",
    category: "Nutrition",
    gradient: "linear-gradient(135deg, #2C3E50, #4CA1AF)",
    emoji: "🍚",
    author: "Sarah Mitchell",
    authorRole: "RD, Metabolic Health Specialist",
    keyTakeaways: [
      "GI measures blood sugar response in isolation — real meals are always mixed",
      "Glycemic Load (GL) is more useful: accounts for portion size",
      "Context matters: a ripe banana isn't dangerous; calories in context is what matters",
      "For most healthy people, GI obsession yields minimal return vs. tracking total carbs",
    ],
    content: `The glycemic index (GI) ranks carbohydrates on a 0–100 scale based on how quickly they raise blood sugar compared to pure glucose. Low GI = slower absorption. High GI = rapid spike.

**The problem with GI in practice**

GI is measured in isolation — a single food, eaten alone, in a standard amount. Real eating doesn't work this way. A baked potato (GI: 85) eaten with chicken, vegetables, and olive oil has a dramatically different blood sugar response than a potato eaten plain. Protein, fat, and fiber all slow glucose absorption.

**Glycemic Load is better**

Glycemic Load = (GI × carb grams per serving) ÷ 100. It accounts for both speed and quantity. Watermelon has a high GI (72) but low GL (4) because a serving has very few carbs. This is why GI alone misleads — you'd avoid watermelon but eat a whole plate of pasta if you only tracked GI.

**Who benefits from tracking GI**

People with type 2 diabetes or insulin resistance genuinely benefit from lower-GI food choices, particularly at breakfast. For everyone else, total carb intake and calorie balance matter far more.

**The bottom line**

For body composition: total calories > macros > food quality > GI. Focus energy where the return is highest. Track calories and protein first. GI becomes a useful refinement only after those fundamentals are in place.`,
  },
  {
    id: "7",
    title: "High-Protein Breakfast Recipes Under 15 Minutes",
    readTime: "4 min read",
    category: "Recipes",
    gradient: "linear-gradient(135deg, #11998e, #38ef7d)",
    emoji: "🍳",
    author: "Maya Torres",
    authorRole: "RDN, Culinary Nutritionist",
    keyTakeaways: [
      "Breakfast protein reduces hunger and calorie intake for the entire day",
      "4-ingredient egg muffins can be prepped Sunday for the whole week",
      "Greek yogurt parfaits: 20g+ protein in 90 seconds",
      "Protein smoothies: 40g protein in 3 minutes, highly portable",
    ],
    content: `Eating protein at breakfast is one of the highest-leverage nutritional habits you can build. Studies consistently show 30–40g of protein at breakfast reduces total daily calorie intake by 175–450 calories — not through restriction, but by naturally suppressing ghrelin (hunger hormone) for 4–6 hours.

**Recipe 1: 3-Minute Greek Yogurt Parfait (30g protein)**
- 200g full-fat Greek yogurt (17g protein)
- 1 scoop vanilla protein powder mixed in (20–25g protein)
- Handful of granola or oats
- Fresh berries
Mix yogurt and protein powder until smooth. Layer with granola and berries. Done in 90 seconds.

**Recipe 2: Egg White Veggie Scramble (35g protein, 8 min)**
- 6 egg whites + 2 whole eggs
- 1/2 cup cottage cheese (folded in at the end)
- Spinach, bell pepper, onion
- Salt, pepper, everything bagel seasoning
Scramble eggs and whites, add veg, stir in cottage cheese off heat. The cottage cheese adds creaminess and 14g extra protein.

**Recipe 3: Sunday Egg Muffins (28g protein, 15 min prep for 12 muffins)**
- 10 eggs whisked
- 1/2 cup diced turkey or chicken sausage
- 1/2 cup bell pepper + onion
- 1/4 cup cheddar
- Salt + pepper
Pour into muffin tin, bake at 375°F for 18–20 min. Store in fridge, microwave 45 seconds per muffin. 3 muffins = full breakfast.

**Recipe 4: Protein Smoothie (40g protein, 3 min)**
- 1 cup unsweetened almond milk
- 2 scoops protein powder
- 1/2 frozen banana
- 1 tbsp peanut butter
- Handful of spinach (you won't taste it)
- Ice
Blend 30 seconds. High protein, portable, takes 90 seconds active time.`,
  },
  {
    id: "8",
    title: "Sleep & Fat Loss: The Connection Nobody Talks About",
    readTime: "6 min read",
    category: "Weight Loss",
    gradient: "linear-gradient(135deg, #0f0c29, #302b63)",
    emoji: "😴",
    author: "Dr. Patricia Chen",
    authorRole: "MD, Metabolic Health",
    keyTakeaways: [
      "Under 7 hours of sleep doubles the proportion of weight lost from muscle vs. fat",
      "Sleep deprivation increases ghrelin (hunger) by 24% and reduces leptin by 18%",
      "Even one bad night impairs insulin sensitivity by 25%",
      "7–9 hours of sleep per night is a legitimate fat loss intervention",
    ],
    content: `Sleep is the most underestimated variable in body composition. While most people focus intensely on diet and training, chronic sleep restriction quietly works against every fat loss effort.

**The fat vs. muscle partitioning problem**

A landmark study by the University of Chicago found that calorie-restricted subjects sleeping 5.5 hours/night lost 55% of their weight from lean mass — compared to 25% lean mass loss in the group sleeping 8.5 hours. Both groups ate the same number of calories. The only variable was sleep. Less sleep = less growth hormone (released during deep sleep), which directly impairs fat mobilization and muscle preservation.

**The hunger hormone cascade**

Sleep deprivation causes measurable hormonal changes within 2 nights: ghrelin (your hunger hormone) rises 24%, leptin (your satiety hormone) drops 18%, and appetite for calorie-dense, high-carb foods specifically increases. This isn't willpower failure — it's a biological drive that's extraordinarily hard to resist consciously.

**Insulin sensitivity**

One night of poor sleep reduces insulin sensitivity by 25% in healthy adults. Chronically impaired insulin sensitivity shifts your body toward storing calories as fat rather than using them for energy — even before obesity or metabolic disease develops.

**Practical sleep optimization**

- Keep a consistent sleep/wake time, including weekends (±30 min max)
- Room temp 65–68°F is the proven optimal range for deep sleep
- No screens 60 min before bed, or use blue light glasses
- Avoid alcohol — it fragments sleep architecture even if you fall asleep faster
- Caffeine has a 5–6 hour half-life; last coffee by 2 PM if you sleep at 10 PM

Treating sleep as a fat loss tool — not just recovery — changes the calculation entirely.`,
  },
];

const DIETITIAN_TIPS = [
  {
    name: "Sarah Mitchell, RD",
    text: "\"I recommend prioritizing fiber as part of a balanced diet. As you increase fiber intake, increase water consumption equally — fiber without water causes the opposite of what you want.\"",
  },
  {
    name: "James Kellner, MS CSCS",
    text: "\"Protein is the most satiating macronutrient. Aim for 0.8–1g per pound of bodyweight to preserve muscle while in a calorie deficit. This single habit changes outcomes more than anything else.\"",
  },
  {
    name: "Maya Torres, RDN",
    text: "\"Sunday meal prep reduces weekday decision fatigue significantly. Even just prepping 2 proteins and 2 grains gives you infinite combination options without repeating the same meal.\"",
  },
  {
    name: "Dr. Patricia Chen, MD",
    text: "\"For my GLP-1 patients, I always emphasize: eat your protein first, every single meal. When appetite is suppressed, you have fewer bites — make each one count toward your muscle preservation goals.\"",
  },
];

const TOPICS = [
  { label: "Getting Started", emoji: "🚀" },
  { label: "Gut Health", emoji: "🦠" },
  { label: "Calories & Macros", emoji: "🔢" },
  { label: "Protein Timing", emoji: "⏱️" },
  { label: "Hydration", emoji: "💧" },
  { label: "Sleep & Recovery", emoji: "😴" },
  { label: "Supplements", emoji: "💊" },
  { label: "Hormones", emoji: "🧬" },
];

const PAGE_SIZE = 4;

export function LearnPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterChip>("All");
  const [page, setPage] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
  const [openArticle, setOpenArticle] = useState<Article | null>(null);

  const filtered = filter === "All" ? ARTICLES : ARTICLES.filter(a => a.category === filter);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageArticles = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const handleFilter = (f: FilterChip) => {
    hapticLight();
    setFilter(f);
    setPage(0);
  };

  // Article detail overlay
  if (openArticle) {
    return (
      <div className="pb-28 max-w-lg mx-auto animate-page-enter">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3">
          <button
            onClick={() => { hapticLight(); setOpenArticle(null); }}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-xs px-3 py-1 rounded-full font-semibold" style={{ background: "rgba(82,183,136,0.15)", color: "#52B788" }}>
            {openArticle.category}
          </span>
          <button
            onClick={() => { hapticLight(); setOpenArticle(null); }}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Hero */}
        <div className="mx-4 mb-5 rounded-2xl overflow-hidden" style={{ height: 160, background: openArticle.gradient }}>
          <div className="w-full h-full flex items-center justify-center text-6xl">
            {openArticle.emoji}
          </div>
        </div>

        {/* Title + meta */}
        <div className="px-4 mb-4">
          <h1 className="text-xl font-bold leading-snug mb-3">{openArticle.title}</h1>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm" style={{ background: "rgba(82,183,136,0.15)", color: "#52B788" }}>
              👩‍⚕️
            </div>
            <div>
              <div className="text-xs font-semibold">{openArticle.author}</div>
              <div className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{openArticle.authorRole}</div>
            </div>
            <div className="flex items-center gap-1 ml-auto" style={{ color: "rgba(255,255,255,0.4)" }}>
              <Clock className="w-3.5 h-3.5" />
              <span className="text-xs">{openArticle.readTime}</span>
            </div>
          </div>
        </div>

        {/* Key Takeaways */}
        <div className="mx-4 mb-5 p-4 rounded-2xl" style={{ background: "rgba(82,183,136,0.07)", border: "1px solid rgba(82,183,136,0.18)" }}>
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-4 h-4" style={{ color: "#52B788" }} />
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#52B788" }}>Key Takeaways</span>
          </div>
          <ul className="space-y-2">
            {openArticle.keyTakeaways.map((point, i) => (
              <li key={i} className="flex items-start gap-2 text-xs leading-relaxed">
                <span className="mt-0.5 flex-shrink-0" style={{ color: "#52B788" }}>✓</span>
                <span style={{ color: "rgba(255,255,255,0.8)" }}>{point}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Full article content */}
        <div className="px-4">
          {openArticle.content.split("\n\n").map((para, i) => {
            if (para.startsWith("**") && para.endsWith("**")) {
              return (
                <h3 key={i} className="text-sm font-bold mt-5 mb-2" style={{ color: "var(--foreground)" }}>
                  {para.replace(/\*\*/g, "")}
                </h3>
              );
            }
            // Inline bold
            const parts = para.split(/(\*\*[^*]+\*\*)/g);
            return (
              <p key={i} className="text-sm leading-relaxed mb-3" style={{ color: "rgba(255,255,255,0.75)" }}>
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
    );
  }

  return (
    <div className="pb-28 max-w-lg mx-auto animate-page-enter">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <button onClick={() => { hapticLight(); navigate(-1); }} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-bold">Learn</h1>
        <div className="w-9" />
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
              onClick={() => { hapticLight(); setOpenArticle(article); }}
              className="flex flex-col text-left rounded-2xl overflow-hidden transition-all active:scale-[0.98]"
              style={{ background: "var(--surface-card)", border: "1px solid var(--border)" }}
            >
              {/* Gradient hero image */}
              <div
                className="w-full flex items-center justify-center text-4xl"
                style={{ background: article.gradient, height: 90 }}
              >
                {article.emoji}
              </div>
              <div className="p-3">
                <span className="text-[10px] font-semibold uppercase tracking-wide mb-1 block" style={{ color: "#52B788" }}>
                  {article.category}
                </span>
                <p className="text-xs font-semibold leading-snug mb-1.5" style={{ color: "var(--foreground)" }}>
                  {article.title}
                </p>
                <div className="flex items-center gap-1" style={{ color: "var(--muted-foreground)" }}>
                  <Clock className="w-3 h-3" />
                  <p className="text-[10px]">{article.readTime}</p>
                </div>
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
      <div className="px-4 mb-5">
        <h2 className="text-base font-bold mb-3">Dietitians' Corner</h2>
        <div className="rounded-2xl p-4 flex items-start gap-3" style={{ background: "rgba(82,183,136,0.08)", border: "1px solid rgba(82,183,136,0.2)" }}>
          <div className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center text-2xl" style={{ background: "rgba(82,183,136,0.15)" }}>
            👩‍⚕️
          </div>
          <div className="flex-1">
            <p className="text-sm italic leading-relaxed mb-2" style={{ color: "rgba(255,255,255,0.85)" }}>
              {DIETITIAN_TIPS[tipIndex].text}
            </p>
            <p className="text-xs font-semibold" style={{ color: "#52B788" }}>
              — {DIETITIAN_TIPS[tipIndex].name}
            </p>
          </div>
        </div>
        <div className="flex gap-2 justify-center mt-3">
          {DIETITIAN_TIPS.map((_, i) => (
            <button
              key={i}
              onClick={() => { hapticLight(); setTipIndex(i); }}
              className="w-2 h-2 rounded-full transition-all"
              style={{ background: i === tipIndex ? "#52B788" : "rgba(255,255,255,0.2)" }}
            />
          ))}
        </div>
      </div>

      {/* Topics */}
      <div className="px-4">
        <h2 className="text-base font-bold mb-3">Browse Topics</h2>
        <div className="grid grid-cols-2 gap-2">
          {TOPICS.map((topic) => (
            <button
              key={topic.label}
              onClick={() => hapticLight()}
              className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-medium transition-all active:scale-[0.97] text-left"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.09)" }}
            >
              <span className="text-xl">{topic.emoji}</span>
              <span className="leading-tight">{topic.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
