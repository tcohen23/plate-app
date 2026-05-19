import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Card } from "@/components/ui/card";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

const activityLabels: Record<string, string> = {
  sedentary: "Sedentary",
  light: "Lightly Active",
  moderate: "Moderately Active",
  active: "Very Active",
  very_active: "Extra Active",
};

const activityMultipliers: Record<string, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const goalLabels: Record<string, string> = {
  aggressive_cut: "Aggressive Cut",
  moderate_cut: "Moderate Cut",
  light_cut: "Light Cut",
  maintenance: "Maintenance",
  light_bulk: "Light Bulk",
  moderate_bulk: "Moderate Bulk",
  aggressive_bulk: "Aggressive Bulk",
};

const goalAdjustments: Record<string, string> = {
  aggressive_cut: "−30%",
  moderate_cut: "−20%",
  light_cut: "−10%",
  maintenance: "0%",
  light_bulk: "+10%",
  moderate_bulk: "+20%",
  aggressive_bulk: "+30%",
};

const dietStyleNames: Record<string, string> = {
  high_protein: "High Protein",
  med_high_protein: "Med-High Protein",
  moderate_protein: "Moderate Protein",
  low_protein: "Low Protein",
  balanced: "Balanced",
  low_carb: "Low Carb",
  high_carb: "High Carb",
  low_fat: "Low Fat",
  keto: "Keto",
  carnivore: "Carnivore",
  mediterranean: "Mediterranean",
  paleo: "Paleo",
  whole30: "Whole30",
  iifym: "IIFYM / Flexible",
  vegan: "Vegan",
  vegetarian: "Vegetarian",
  pescatarian: "Pescatarian",
};

const dietExplanations: Record<string, string> = {
  balanced: "A balanced split works because no single macronutrient is the enemy. Protein keeps you full and protects muscle. Carbs fuel your workouts and your brain. Fat keeps your hormones in check. Research consistently shows that when total calories and protein are controlled, the exact carb-to-fat ratio matters far less than people think. This approach is easier to stick to long-term because nothing is off limits.",
  low_carb: "Cutting carbs to 20 to 25% of your calories pushes your body to burn more fat for fuel. Studies show low-carb diets often produce more fat loss in the short term, especially around your midsection, compared to low-fat diets at the same calories. It works best for people who tend to overeat when carbs are around or who struggle with blood sugar stability.",
  high_carb: "Carbs are your body's fastest fuel. If you're training hard with heavy lifting, running, or anything that gets your heart rate up, your muscles run on glycogen, which comes from carbs. Going high-carb means you recover faster, perform better in the gym, and don't run out of gas mid-session. The key is keeping the sources clean: oats, rice, potatoes, fruit.",
  low_fat: "Fat has more than double the calories per gram compared to protein or carbs. So capping it gives you more food volume for the same calorie budget. This can make it easier to stay full without going over. It's a solid approach when you're in a significant deficit and need every calorie to count.",
  keto: "Ketosis happens when carbs drop low enough (usually under 25g a day) that your liver starts converting fat into ketones, which your brain and muscles use instead of glucose. It sounds extreme but it genuinely suppresses appetite for most people, which is why it works well for fat loss. The tradeoff is that performance on high-intensity work takes a hit until your body fully adapts.",
  carnivore: "Animal foods only: meat, fish, eggs, some dairy. The upside is total simplicity. You never have to think about what you can or can't eat. A lot of people report better digestion and less bloating on carnivore because they've eliminated fiber and plant compounds their gut doesn't handle well. To do it right, eat a variety of cuts and include organ meat occasionally to cover micronutrients.",
  mediterranean: "This is the most studied diet on the planet, and the results are consistent across decades. The combination of olive oil, fatty fish, whole grains, legumes, and plenty of produce does real things for cardiovascular health and longevity. It doesn't feel like a diet because it isn't one. It's just a way of eating that happens to be very good for you.",
  paleo: "The idea behind paleo is simple: eat the foods humans were eating before agriculture changed everything. Meat, fish, eggs, vegetables, fruit, nuts. No grains, no legumes, no dairy, no processed anything. Studies show it improves glucose tolerance and brings triglycerides down. Whether or not you buy the evolutionary argument, the food quality is hard to argue with.",
  whole30: "Whole30 is 30 days of strict elimination to figure out what's actually bothering your body. No sugar, no alcohol, no grains, no legumes, no dairy. It's not meant to be a permanent way of eating. It's a reset. A lot of people are surprised by what they notice when they reintroduce things one at a time. Think of it as a diagnostic tool, not a lifestyle.",
  iifym: "Hit your numbers, eat real food most of the time, and don't stress about the rest. Research backs this up. People who give themselves some flexibility have better long-term adherence and lower rates of binge eating than people who try to be perfect. The general rule of thumb is 80% whole foods, 20% whatever you want. As long as the macros are there, the scale doesn't know the difference.",
  vegan: "Plant-based protein is completely viable for building muscle. You just have to be intentional about it. We've bumped your protein target up slightly to account for the lower digestibility of most plant proteins. The key is variety: legumes, soy, grains, and nuts all have different amino acid profiles, so eating a mix throughout the day covers everything your muscles need.",
  vegetarian: "Eggs and dairy give you access to complete, high-quality proteins that close the gap compared to fully vegan eating. Greek yogurt, cottage cheese, and eggs are some of the most protein-dense foods around. Long-term cohort studies consistently show vegetarians have lower BMI and better cardiovascular markers than omnivores.",
  pescatarian: "You get the benefits of a mostly plant-based diet plus the omega-3s from fatty fish, which are genuinely hard to get elsewhere. Salmon, sardines, and mackerel are loaded with EPA and DHA, the forms of omega-3 your body actually uses, which reduce inflammation and support heart and brain health. It's one of the most complete and sustainable ways to eat.",
  high_protein: "More protein means more muscle protein synthesis, better satiety, and less muscle loss when you're in a deficit. The research is pretty clear that 2.0+ g/kg is the sweet spot for serious training. Your body also burns more calories digesting protein than carbs or fat, so there's a metabolic advantage built in.",
  med_high_protein: "1.6 g/kg consistently shows up in research as the point where muscle-building rates peak. Below this, you're leaving gains on the table. Above it, you're not getting much more benefit, just more calories from protein. This range is ideal for people who lift regularly but aren't trying to maximize protein above all else.",
  moderate_protein: "The ACSM recommends 1.2 g/kg for active people who aren't specifically trying to build muscle. At this level you'll preserve lean mass and support recovery without leaning too hard into protein at the expense of carbs and fat. It's a sensible default for general health.",
  low_protein: "This is close to the bare minimum the body needs to avoid deficiency. Fine for people who are largely sedentary and not trying to change their body composition. If your goals shift toward building muscle or losing fat while keeping muscle, this target will need to go up.",
};

const sources = [
  "Mifflin MD, St Jeor ST, et al. A new predictive equation for resting energy expenditure in healthy individuals. Am J Clin Nutr. 1990;51(2):241-7.",
  "Jäger R, et al. International Society of Sports Nutrition Position Stand: protein and exercise. J Int Soc Sports Nutr. 2017;14:20.",
  "Schoenfeld BJ, Aragon AA. How much protein can the body use in a single meal for muscle-building? J Int Soc Sports Nutr. 2018;15:10.",
  "Sawka MN, et al. ACSM Position Stand: Exercise and Fluid Replacement. Med Sci Sports Exerc. 2007;39(2):377-90.",
  "Helms ER, et al. Evidence-based recommendations for natural bodybuilding contest preparation. J Int Soc Sports Nutr. 2014;11:20.",
  "Frankenfield D, et al. Comparison of predictive equations for resting metabolic rate. J Am Diet Assoc. 2005;105(5):775-89.",
  "2020-2025 Dietary Guidelines for Americans, USDA/HHS.",
];

export function WhyPage() {
  const profile = useQuery(api.profiles.getProfile);
  const [sourcesOpen, setSourcesOpen] = useState(false);

  if (!profile) {
    return (
      <div className="px-5 pt-5 max-w-lg mx-auto space-y-4">
        <div className="h-8 w-32 bg-muted rounded animate-pulse" />
        <div className="h-40 bg-muted rounded-xl animate-pulse" />
        <div className="h-40 bg-muted rounded-xl animate-pulse" />
        <div className="h-40 bg-muted rounded-xl animate-pulse" />
      </div>
    );
  }

  const bmr = profile.bmr || 0;
  const tdee = profile.tdee || 0;
  const cals = profile.targetCalories || 0;
  const protein = profile.targetProtein || 0;
  const carbs = profile.targetCarbs || 0;
  const fat = profile.targetFat || 0;
  const proteinGkg = profile.proteinGkg || 1.2;
  const activityName = activityLabels[profile.activityLevel] || "Moderate";
  const multiplier = activityMultipliers[profile.activityLevel] || 1.55;
  const goalName = goalLabels[profile.goal] || "Maintenance";
  const goalAdj = goalAdjustments[profile.goal] || "0%";
  const dietName = dietStyleNames[profile.dietPreference || "balanced"] || "Balanced";
  const dietExplain = dietExplanations[profile.dietPreference || "balanced"] || dietExplanations.balanced;
  const hydrationGlasses = profile.hydrationTarget || 8;
  const hydrationMl = profile.hydrationMl || 2400;
  const weightKg = Math.round(profile.weight * 0.453592);
  const genderFloor = profile.gender === "female" ? 1200 : 1500;
  const floor = Math.max(genderFloor, bmr);
  const isCutting = profile.goal?.includes("cut");
  const mealsPerDay = 4;
  const proteinPerMeal = Math.round(protein / mealsPerDay);
  const proteinPerMealGkg = Math.round((proteinGkg / mealsPerDay) * 10) / 10;

  return (
    <div className="px-5 pt-5 pb-6 max-w-lg mx-auto space-y-5">
      <h1 className="text-2xl font-serif">Why</h1>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Every number in your plan comes from real math on your real body. Here's where it all came from.
      </p>

      <WhySection title={`Your daily target: ${cals} kcal`}>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We start with your Basal Metabolic Rate, the calories your body burns just existing with no movement required.
          Using the Mifflin-St Jeor equation (the most validated formula for this, per a 2005 meta-analysis in the Journal of the American Dietetic Association),
          your BMR is <span className="text-foreground font-medium">{bmr} kcal</span>. Multiply that by your activity factor ({multiplier}x for {activityName}) and you get your
          total daily energy expenditure: <span className="text-foreground font-medium">{tdee} kcal</span>. Then we apply your {goalAdj} adjustment for {goalName}.
        </p>
        <div className="mt-3 p-3 rounded-lg bg-accent/30 text-sm text-muted-foreground">
          Your floor is <span className="text-foreground font-medium">{Math.round(floor)} kcal</span>. Going below this consistently
          slows your metabolism and starts eating into muscle, not just fat.
        </div>
      </WhySection>

      <WhySection title={`Your macros: ${protein}g protein · ${carbs}g carbs · ${fat}g fat`}>
        <p className="text-sm text-muted-foreground leading-relaxed">
          <span className="text-foreground font-medium">Protein ({protein}g):</span> Set at {proteinGkg} g per kg of bodyweight ({weightKg} kg)
          based on your {dietName} preference{isCutting ? " with a bump to protect muscle during your cut" : ""}.
          The ISSN puts the optimal range at 1.4 to 2.0 g/kg for active people, and up to 2.3 g/kg when cutting.
          {profile.usesGlp1 && (
            " Since you're on a GLP-1 medication, we raised your protein target. People on these medications who hit 1.2+ g/kg hold onto significantly more muscle during weight loss."
          )}
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed mt-2">
          <span className="text-foreground font-medium">Carbs ({carbs}g) and fat ({fat}g):</span> Filled in around your protein based on
          your {dietName} approach.{profile.dietPreference === "keto" ? " Carbs are capped at 25g to keep you in ketosis." : ""}
        </p>
        <div className="mt-3 p-3 rounded-lg bg-accent/30 text-sm text-muted-foreground">
          Spreading your protein across {mealsPerDay} meals means roughly {proteinPerMeal}g each time, which is where muscle protein synthesis peaks
          ({proteinPerMealGkg} g/kg per meal). Front-loading or back-loading your protein wastes some of it.
        </div>
      </WhySection>

      <WhySection title={`Why ${dietName}`}>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {dietExplain}
        </p>
      </WhySection>

      <WhySection title={`Hydration: ${hydrationGlasses} glasses (${hydrationMl} mL)`}>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Most people don't realize how much water affects performance. At just 2% dehydration your strength, endurance, and focus all measurably drop. Your body is mostly water and every metabolic process, including fat burning, requires it. We set your target at 35 mL per kg of bodyweight ({weightKg} kg), adjusted for your activity level ({activityName}).
          {profile.usesGlp1 && (
            " GLP-1 medications suppress thirst, which makes dehydration a real risk. We added 500 mL to your target to account for that."
          )}
        </p>
        <div className="mt-3 p-3 rounded-lg bg-accent/30 text-sm text-muted-foreground">
          Simplest check: pale yellow urine means you're doing fine. Clear all day means you're overdoing it. Dark yellow or amber means drink more now.
        </div>
      </WhySection>

      <WhySection title={`Why ${mealsPerDay} meals`}>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Research from Schoenfeld and Aragon shows your body can only use about 0.4 g of protein per kg bodyweight per meal to stimulate muscle building. Beyond that, the excess gets burned for energy or converted. That's why packing your whole protein target into two meals doesn't work as well as spreading it out. With {mealsPerDay} meals, each one gets {proteinPerMeal}g of protein, right in the window where muscle protein synthesis is fully activated.
        </p>
      </WhySection>

      <Card className="rounded-xl overflow-hidden">
        <button
          onClick={() => setSourcesOpen(!sourcesOpen)}
          className="w-full p-4 flex items-center justify-between text-sm font-medium hover:bg-accent/30 transition-colors"
        >
          <span>Sources</span>
          {sourcesOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>
        {sourcesOpen && (
          <div className="px-4 pb-4 space-y-2">
            {sources.map((src, i) => (
              <p key={i} className="text-xs text-muted-foreground leading-relaxed">
                {i + 1}. {src}
              </p>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function WhySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-5 rounded-xl space-y-2">
      <h2 className="text-base font-serif leading-snug">{title}</h2>
      {children}
    </Card>
  );
}
