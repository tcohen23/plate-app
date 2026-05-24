import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { trackOnboardingStarted, trackOnboardingStep, trackOnboardingCompleted } from "@/lib/posthog";
import { PlanBuildAnimation } from "@/components/PlanBuildAnimation";
import { hapticSuccess } from "@/lib/haptics";

// 4 steps — get people to a plan fast
const TOTAL_STEPS = 4;

const activityOptions = [
  { value: "sedentary", label: "Sedentary", mult: "1.2×", desc: "Desk job, little movement." },
  { value: "light", label: "Lightly Active", mult: "1.375×", desc: "Desk job + 1 to 3 workouts per week." },
  { value: "moderate", label: "Moderately Active", mult: "1.55×", desc: "Consistent exercise 3 to 5 days per week." },
  { value: "active", label: "Very Active", mult: "1.725×", desc: "Hard training 6 to 7 days a week." },
  { value: "very_active", label: "Extra Active", mult: "1.9×", desc: "Physical job plus intense training daily." },
];

const goalOptions = [
  { value: "aggressive_cut", label: "Aggressive Cut", desc: "−30% calories" },
  { value: "moderate_cut", label: "Moderate Cut", desc: "−20% calories" },
  { value: "light_cut", label: "Light Cut", desc: "−10% calories" },
  { value: "maintenance", label: "Maintenance", desc: "Stay the same" },
  { value: "light_bulk", label: "Light Bulk", desc: "+10% calories" },
  { value: "moderate_bulk", label: "Moderate Bulk", desc: "+20% calories" },
  { value: "aggressive_bulk", label: "Aggressive Bulk", desc: "+30% calories" },
];

const dietOptions = [
  { value: "high_protein", label: "High Protein", group: "Protein Level" },
  { value: "med_high_protein", label: "Med-High Protein", group: "Protein Level" },
  { value: "moderate_protein", label: "Moderate Protein", group: "Protein Level" },
  { value: "low_protein", label: "Low Protein", group: "Protein Level" },
  { value: "balanced", label: "Balanced", group: "Diet Style" },
  { value: "low_carb", label: "Low Carb", group: "Diet Style" },
  { value: "high_carb", label: "High Carb", group: "Diet Style" },
  { value: "low_fat", label: "Low Fat", group: "Diet Style" },
  { value: "keto", label: "Keto", group: "Diet Style" },
  { value: "carnivore", label: "Carnivore", group: "Diet Style" },
  { value: "mediterranean", label: "Mediterranean", group: "Lifestyle" },
  { value: "paleo", label: "Paleo", group: "Lifestyle" },
  { value: "whole30", label: "Whole30", group: "Lifestyle" },
  { value: "iifym", label: "IIFYM / Flexible", group: "Lifestyle" },
  { value: "vegan", label: "Vegan", group: "Plant-Based" },
  { value: "vegetarian", label: "Vegetarian", group: "Plant-Based" },
  { value: "pescatarian", label: "Pescatarian", group: "Plant-Based" },
];

export function OnboardingPage() {
  const navigate = useNavigate();
  const createProfile = useMutation(api.profiles.createProfile);
  const seedMeals = useMutation(api.meals.seedMeals);
  const generatePlan = useMutation(api.mealPlans.generatePlan);
  const sendWelcome = useAction(api.welcomeEmail.sendWelcomeEmail);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [building, setBuilding] = useState(false);
  const [planMacros, setPlanMacros] = useState<{ calories: number; protein: number; carbs: number; fat: number } | null>(null);

  // Essential fields only
  const [name, setName] = useState("");
  const [height, setHeight] = useState({ feet: "5", inches: "10" });
  const [weight, setWeight] = useState("170");
  const [age, setAge] = useState("28");
  const [gender, setGender] = useState("male");
  const [activityLevel, setActivityLevel] = useState("moderate");
  const [goal, setGoal] = useState("moderate_cut");
  const [dietPreferences, setDietPreferences] = useState<string[]>(["high_protein"]);
  const [allergens, setAllergens] = useState<string[]>([]);

  const allergenOptions = [
    { value: "dairy", label: "Dairy", emoji: "🥛" },
    { value: "gluten", label: "Gluten", emoji: "🌾" },
    { value: "nuts", label: "Tree Nuts", emoji: "🥜" },
    { value: "peanuts", label: "Peanuts", emoji: "🥜" },
    { value: "soy", label: "Soy", emoji: "🫘" },
    { value: "eggs", label: "Eggs", emoji: "🥚" },
    { value: "shellfish", label: "Shellfish", emoji: "🦐" },
    { value: "fish", label: "Fish", emoji: "🐟" },
    { value: "sesame", label: "Sesame", emoji: "🌰" },
  ];

  const toggleAllergen = (val: string) =>
    setAllergens((prev) => prev.includes(val) ? prev.filter((a) => a !== val) : [...prev, val]);

  const toggleDiet = (val: string) =>
    setDietPreferences((prev) =>
      prev.includes(val)
        ? prev.length > 1 ? prev.filter((d) => d !== val) : prev // always keep at least 1
        : [...prev, val]
    );

  const primaryDiet = dietPreferences[0] || "high_protein";

  const totalHeightInches = (parseInt(height.feet) || 0) * 12 + (parseInt(height.inches) || 0);
  const weightNum = parseFloat(weight) || 0;
  const ageNum = parseInt(age) || 0;

  const handleNext = () => {
    if (step === 1 && !name.trim()) {
      toast.error("Enter your name to continue");
      return;
    }
    if (step === 1) trackOnboardingStarted();
    const stepNames = ["basics", "body", "activity_goal", "diet"];
    trackOnboardingStep(step, stepNames[step - 1] || `step_${step}`);
    setStep(Math.min(step + 1, TOTAL_STEPS));
  };

  const handleBack = () => setStep(Math.max(step - 1, 1));

  const handleSubmit = async () => {
    setLoading(true);
    // Show branded build animation immediately
    setPlanMacros({
      calories: estimateCalories(),
      protein: estimateProtein(),
      carbs: estimateCarbs(),
      fat: estimateFat(),
    });
    setBuilding(true);
    hapticSuccess();
    try {
      await seedMeals();
      const profileId = await createProfile({
        name,
        height: totalHeightInches,
        weight: weightNum,
        age: ageNum,
        gender,
        activityLevel,
        goal,
        mealStructure: "semi_varied",
        varietyDepth: "medium",
        cookingPreference: "moderate",
        budgetLevel: "moderate",
        zipCode: "",
        goesToGym: "no",
        workoutGoal: "fat_loss",
        experienceLevel: "beginner",
        workoutFrequency: "2-3",
        workoutSplit: "full_body",
        usesGlp1: false,
        dietPreference: primaryDiet,
        dietPreferences,
        allergens: allergens.length > 0 ? allergens : undefined,
        mealsPerDay: "3+1",
      });
      // Generate plan in background — animation handles timing
      generatePlan({ profileId }).catch(() => {});
      trackOnboardingCompleted({ dietPreference: primaryDiet, goal, calorieTarget: estimateCalories() });
      sendWelcome().catch(() => {});
    } catch (e: any) {
      setBuilding(false);
      setLoading(false);
      toast.error(e.message || "Something went wrong");
    }
  };

  const OptionCard = ({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: React.ReactNode }) => (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
        selected ? "border-foreground bg-primary/5" : "border-border bg-card hover:border-foreground/20"
      }`}
    >
      {children}
    </button>
  );

  const dietDisplayLabel = (primaryDiet || "").replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) || "your diet";

  if (building && planMacros) {
    return (
      <PlanBuildAnimation
        dietLabel={dietDisplayLabel}
        calories={planMacros.calories}
        protein={planMacros.protein}
        carbs={planMacros.carbs}
        fat={planMacros.fat}
        goal={goal}
        onComplete={() => navigate("/dashboard", { replace: true })}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur-md z-10 px-5 pt-4 pb-3 border-b border-border/50">
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-3">
            {step > 1 ? (
              <button onClick={handleBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors -ml-1">
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <img src="/logo.png" alt="Plate" className="w-6 h-6 rounded-md" />
                <span className="font-serif text-lg">Plate</span>
              </div>
            )}
            <span className="text-xs text-muted-foreground tracking-wide">{step} / {TOTAL_STEPS}</span>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
              <div
                key={i}
                className="h-1 flex-1 rounded-full transition-all duration-300"
                style={{ background: i < step ? "var(--foreground)" : "var(--border)" }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 pt-7 pb-32 max-w-md md:max-w-xl lg:max-w-2xl mx-auto">

        {/* Step 1: Name + Age + Gender */}
        {step === 1 && (
          <div className="space-y-7 animate-fade-up">
            <div className="space-y-1.5">
              <h1 className="text-3xl font-serif">Welcome</h1>
              <p className="text-muted-foreground">Takes 60 seconds. We'll build your plan right after.</p>
            </div>

            <div className="space-y-5">
              <div>
                <label className="label-uppercase mb-2 block text-muted-foreground">Your name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="h-12 text-base bg-card border-border rounded-xl"
                  autoFocus
                />
              </div>
              <div>
                <label className="label-uppercase mb-2 block text-muted-foreground">Age</label>
                <Input type="number" value={age} onChange={(e) => setAge(e.target.value)} className="h-12 text-base bg-card border-border rounded-xl" />
              </div>
              <div>
                <label className="label-uppercase mb-2 block text-muted-foreground">Gender</label>
                <div className="grid grid-cols-2 gap-2">
                  {[{ value: "male", label: "Male" }, { value: "female", label: "Female" }].map((opt) => (
                    <OptionCard key={opt.value} selected={gender === opt.value} onClick={() => setGender(opt.value)}>
                      <span className="font-medium text-sm">{opt.label}</span>
                    </OptionCard>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Height + Weight */}
        {step === 2 && (
          <div className="space-y-7 animate-fade-up">
            <div className="space-y-1.5">
              <h1 className="text-3xl font-serif">Your body</h1>
              <p className="text-muted-foreground">Used to calculate your exact calorie target.</p>
            </div>

            <div className="space-y-5">
              <div>
                <label className="label-uppercase mb-2 block text-muted-foreground">Height</label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <Input type="number" value={height.feet} onChange={(e) => setHeight({ ...height, feet: e.target.value })} className="h-12 text-base bg-card border-border rounded-xl" />
                    <span className="absolute right-3 top-3.5 text-xs text-muted-foreground">ft</span>
                  </div>
                  <div className="flex-1 relative">
                    <Input type="number" value={height.inches} onChange={(e) => setHeight({ ...height, inches: e.target.value })} className="h-12 text-base bg-card border-border rounded-xl" />
                    <span className="absolute right-3 top-3.5 text-xs text-muted-foreground">in</span>
                  </div>
                </div>
              </div>
              <div>
                <label className="label-uppercase mb-2 block text-muted-foreground">Weight (lbs)</label>
                <Input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} className="h-12 text-base bg-card border-border rounded-xl" />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Activity + Goal */}
        {step === 3 && (
          <div className="space-y-7 animate-fade-up">
            <div className="space-y-1.5">
              <h1 className="text-3xl font-serif">Activity and goal</h1>
              <p className="text-muted-foreground">This determines your daily calorie target.</p>
            </div>

            <div className="space-y-5">
              <div>
                <label className="label-uppercase mb-2 block text-muted-foreground">How active are you?</label>
                <div className="space-y-2">
                  {activityOptions.map((opt) => (
                    <OptionCard key={opt.value} selected={activityLevel === opt.value} onClick={() => setActivityLevel(opt.value)}>
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{opt.label}</span>
                        <span className="text-xs text-muted-foreground font-mono">{opt.mult}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                    </OptionCard>
                  ))}
                </div>
              </div>
              <div>
                <label className="label-uppercase mb-2 block text-muted-foreground">What's your goal?</label>
                <div className="space-y-2">
                  {goalOptions.map((opt) => (
                    <OptionCard key={opt.value} selected={goal === opt.value} onClick={() => setGoal(opt.value)}>
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{opt.label}</span>
                        <span className="text-xs text-muted-foreground">{opt.desc}</span>
                      </div>
                    </OptionCard>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Diet (multi-select) + Allergens + Preview */}
        {step === 4 && (
          <div className="space-y-7 animate-fade-up">
            <div className="space-y-1.5">
              <h1 className="text-3xl font-serif">Diet style</h1>
              <p className="text-muted-foreground">Pick one or more. Your meal plan will match all of them.</p>
            </div>

            <div>
              {(["Protein Level", "Diet Style", "Lifestyle", "Plant-Based"] as const).map((group) => {
                const groupOpts = dietOptions.filter((o) => o.group === group);
                return (
                  <div key={group} className="mb-3">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-1.5">{group}</div>
                    <div className="flex gap-2 flex-wrap">
                      {groupOpts.map((opt) => {
                        const isSelected = dietPreferences.includes(opt.value);
                        const isPrimary = dietPreferences[0] === opt.value;
                        return (
                          <button
                            key={opt.value}
                            onClick={() => toggleDiet(opt.value)}
                            className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-all ${
                              isSelected
                                ? "bg-foreground text-background border-foreground"
                                : "bg-card border-border text-foreground hover:border-foreground/30"
                            }`}
                          >
                            {opt.label}
                            {isSelected && dietPreferences.length > 1 && isPrimary && (
                              <span className="ml-1 text-[10px] opacity-60">primary</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {dietPreferences.length > 1 && (
                <p className="text-xs text-muted-foreground/60 mt-1">First selected = primary (drives your macros). Tap to reorder.</p>
              )}
            </div>

            {/* Calorie preview */}
            <Card className="p-5 bg-primary text-primary-foreground rounded-2xl">
              <div className="text-xs uppercase tracking-wider opacity-70 mb-2">Your Daily Target</div>
              <div className="text-4xl font-serif mb-3">{estimateCalories()}<span className="text-base font-sans ml-1 opacity-70">kcal</span></div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <div className="text-[10px] uppercase opacity-60">Protein</div>
                  <div className="text-xl font-serif mt-0.5">{estimateProtein()}g</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase opacity-60">Carbs</div>
                  <div className="text-xl font-serif mt-0.5">{estimateCarbs()}g</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase opacity-60">Fat</div>
                  <div className="text-xl font-serif mt-0.5">{estimateFat()}g</div>
                </div>
              </div>
            </Card>

            {/* Allergens */}
            <div>
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <label className="label-uppercase text-muted-foreground">Allergies</label>
                <span className="text-xs text-muted-foreground/60 normal-case ml-1">optional</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">Meals with these will be fully excluded from your plan.</p>
              <div className="grid grid-cols-3 gap-2">
                {allergenOptions.map((opt) => {
                  const isSelected = allergens.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      onClick={() => toggleAllergen(opt.value)}
                      className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all duration-200 ${
                        isSelected
                          ? "border-red-400 bg-red-50 dark:bg-red-950/30 dark:border-red-500/50"
                          : "border-border bg-card hover:border-foreground/20"
                      }`}
                    >
                      <span className="text-xl">{opt.emoji}</span>
                      <span className={`text-xs font-medium ${isSelected ? "text-red-600 dark:text-red-400" : ""}`}>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
              {allergens.length === 0 && (
                <p className="text-xs text-muted-foreground/50 text-center mt-2">None selected</p>
              )}
            </div>

            <p className="text-xs text-muted-foreground text-center">Cooking time, budget, and more can be set in Settings after setup.</p>
          </div>
        )}
      </div>

      {/* Fixed bottom */}
      <div className="fixed bottom-0 left-0 right-0 p-5 bg-background/95 backdrop-blur-md border-t border-border/50">
        <div className="max-w-md md:max-w-xl lg:max-w-2xl mx-auto flex gap-3">
          {step > 1 && (
            <Button onClick={handleBack} variant="outline" className="h-12 px-5 rounded-xl flex-shrink-0">
              <ChevronLeft className="w-4 h-4" />
            </Button>
          )}
          {step < TOTAL_STEPS ? (
            <Button onClick={handleNext} className="w-full h-12 rounded-xl font-medium" size="lg">
              Continue <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              className="w-full h-12 rounded-xl font-medium"
              style={{ background: "var(--plate-green-accent)", color: "#0a2018" }}
              size="lg"
              disabled={loading}
            >
              {loading ? "Building your plan..." : "✦  Generate my plan"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  function estimateBMR() {
    const weightKg = weightNum * 0.453592;
    const heightCm = totalHeightInches * 2.54;
    return Math.round(
      gender === "male"
        ? 10 * weightKg + 6.25 * heightCm - 5 * ageNum + 5
        : 10 * weightKg + 6.25 * heightCm - 5 * ageNum - 161
    );
  }
  function estimateTDEE() {
    const multipliers: Record<string, number> = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 };
    return Math.round(estimateBMR() * (multipliers[activityLevel] || 1.55));
  }
  function estimateCalories() {
    const adjustments: Record<string, number> = { aggressive_cut: -0.3, moderate_cut: -0.2, light_cut: -0.1, maintenance: 0, light_bulk: 0.1, moderate_bulk: 0.2, aggressive_bulk: 0.3 };
    let target = Math.round(estimateTDEE() * (1 + (adjustments[goal] || 0)));
    const genderFloor = gender === "female" ? 1200 : 1500;
    const floor = Math.max(genderFloor, estimateBMR());
    return Math.max(target, floor);
  }
  function estimateProtein() {
    const weightKg = weightNum * 0.453592;
    const tiers: Record<string, number> = {
      low_protein: 0.8, moderate_protein: 1.2, med_high_protein: 1.6, high_protein: 2.0,
      balanced: 1.2, low_carb: 1.6, low_fat: 1.4, keto: 1.5, carnivore: 2.0, high_carb: 1.2,
      mediterranean: 1.2, paleo: 1.6, whole30: 1.6, iifym: 1.4,
      vegan: 1.4, vegetarian: 1.4, pescatarian: 1.4,
    };
    let gkg = tiers[primaryDiet] || 1.2;
    if (goal === "aggressive_cut") gkg = Math.max(gkg + 0.4, 2.2);
    else if (goal === "moderate_cut") gkg = Math.max(gkg + 0.2, 1.8);
    else if (goal === "light_cut") gkg = Math.max(gkg + 0.1, 1.6);
    const isPlantBased = ["vegan", "vegetarian", "pescatarian"].includes(primaryDiet);
    if (isPlantBased) gkg *= 1.10;
    return Math.round(weightKg * gkg);
  }
  function estimateFat() {
    const fatPcts: Record<string, number> = {
      high_protein: 0.25, med_high_protein: 0.27, moderate_protein: 0.28, low_protein: 0.30,
      balanced: 0.28, low_carb: 0.40, low_fat: 0.175, keto: 0.72, carnivore: 0.65, high_carb: 0.175,
      mediterranean: 0.325, paleo: 0.375, whole30: 0.35, iifym: 0.28,
      vegan: 0.28, vegetarian: 0.28, pescatarian: 0.28,
    };
    if (primaryDiet === "keto") return Math.round((estimateCalories() - estimateProtein() * 4 - 25 * 4) / 9);
    if (primaryDiet === "carnivore") return Math.round((estimateCalories() - estimateProtein() * 4 - 5 * 4) / 9);
    const pct = fatPcts[primaryDiet] || 0.28;
    return Math.round(Math.max(estimateCalories() * pct, estimateCalories() * 0.15) / 9);
  }
  function estimateCarbs() {
    if (primaryDiet === "keto") return 25;
    if (primaryDiet === "carnivore") return 5;
    const cals = estimateCalories();
    const minCarbsG: Record<string, number> = {
      high_protein: 80, med_high_protein: 80, moderate_protein: 100, low_protein: 120,
      balanced: 100, low_carb: 50, low_fat: 150, high_carb: 150,
      mediterranean: 100, paleo: 50, whole30: 50, iifym: 100,
      vegan: 120, vegetarian: 100, pescatarian: 100,
    };
    const minG = minCarbsG[primaryDiet] || 100;
    return Math.round(Math.max(cals - estimateProtein() * 4 - estimateFat() * 9, minG * 4) / 4);
  }
}
