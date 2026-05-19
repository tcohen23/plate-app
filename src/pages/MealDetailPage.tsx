import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useParams, useNavigate } from "react-router-dom";
import { getLocalDateString } from "@/lib/dateUtils";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Clock, Flame, Thermometer, UtensilsCrossed, Timer, CheckCircle2, Undo2, Heart } from "lucide-react";
import { toast } from "sonner";
import type { Id } from "../../convex/_generated/dataModel";
import { hapticMedium, hapticSuccess, hapticLight } from "@/lib/haptics";


const difficultyConfig: Record<string, { label: string; color: string }> = {
  easy: { label: "Easy", color: "text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-950/40" },
  medium: { label: "Medium", color: "text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/40" },
  hard: { label: "Hard", color: "text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-950/40" },
};

export function MealDetailPage() {
  const { mealId } = useParams();
  const navigate = useNavigate();
  const localDate = getLocalDateString();
  const meal = useQuery(api.meals.getMeal, mealId ? { id: mealId as Id<"meals"> } : "skip");
  const logFood = useMutation(api.foodLogs.logFood);
  const unlogMeal = useMutation(api.foodLogs.unlogMeal);
  const toggleSave = useMutation(api.meals.toggleSaveMeal);
  const isSaved = useQuery(api.meals.isMealSaved, mealId ? { mealId: mealId as Id<"meals"> } : "skip");
  const alreadyLogged = useQuery(
    api.foodLogs.isAlreadyLoggedToday,
    mealId ? { mealId: mealId as Id<"meals">, localDate } : "skip"
  );

  if (!meal) {
    return (
      <div className="px-5 pt-5 max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto">
        <div className="h-64 bg-muted rounded-2xl animate-pulse" />
      </div>
    );
  }

  const handleLogMeal = async () => {
    hapticMedium();
    try {
      await logFood({
        mealSlot: meal.category || "lunch",
        name: meal.name,
        calories: meal.calories,
        protein: meal.protein,
        carbs: meal.carbs,
        fat: meal.fat,
        mealId: mealId as Id<"meals">,
        localDate,
      });
      hapticSuccess();
      toast.success(`${meal.name} logged`);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleUnlog = async () => {
    hapticLight();
    try {
      await unlogMeal({ mealId: mealId as Id<"meals">, localDate });
      toast("Meal unlogged");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const handleToggleSave = async () => {
    hapticLight();
    try {
      const nowSaved = await toggleSave({ mealId: mealId as Id<"meals"> });
      if (nowSaved) {
        hapticSuccess();
        toast.success("Saved to favorites");
      } else {
        toast("Removed from favorites");
      }
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const cookTime = (meal as any).cookTime as number | undefined;
  const cookTemp = (meal as any).cookTemp as number | undefined;
  const cookSetting = (meal as any).cookSetting as string | undefined;
  const difficulty = (meal as any).difficulty as string | undefined;
  const mealPrepTips = (meal as any).mealPrepTips as string[] | undefined;
  const compatibleDiets = (meal as any).compatibleDiets as string[] | undefined;
  const allergensPresent = (meal as any).allergensPresent as string[] | undefined;
  const imageEmoji = (meal as any).imageEmoji as string | undefined;

  const totalTime = (meal.prepTime || 0) + (cookTime || 0);
  const diffConfig = difficulty ? difficultyConfig[difficulty] : null;

  return (
    <div className="px-5 pt-5 pb-6 max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto space-y-5">
      {/* Back button */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors -ml-1">
        <ChevronLeft className="w-4 h-4" /> Back
      </button>

      {/* Hero emoji block */}
      <div className="rounded-2xl overflow-hidden w-full relative" style={{ height: 160, background: "var(--surface-overlay)" }}>
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-7xl">{imageEmoji || "🍽️"}</span>
        </div>
        {/* Favorite button */}
        <button
          onClick={handleToggleSave}
          className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90"
          style={{
            background: isSaved ? "rgba(239,68,68,0.15)" : "rgba(0,0,0,0.35)",
            backdropFilter: "blur(8px)",
          }}
          aria-label={isSaved ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart
            className="w-4 h-4 transition-colors"
            style={{ color: isSaved ? "#ef4444" : "#ffffff", fill: isSaved ? "#ef4444" : "none" }}
          />
        </button>
      </div>

      {/* Meal name + quick stats */}
      <div>
        <h1 className="text-2xl font-serif mb-1">{meal.name}</h1>
        <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
          <span>{Math.round(meal.calories)} kcal</span>
          {totalTime > 0 && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {totalTime} min</span>}
          {totalTime === 0 && <span className="text-green-500 font-medium">No cook</span>}
          {diffConfig && (
            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${diffConfig.color}`}>
              <Flame className="w-3 h-3" /> {diffConfig.label}
            </span>
          )}
        </div>
      </div>

      {/* Cooking Details Card */}
      {(cookTime !== undefined || cookTemp || cookSetting) && (
        <Card className="p-4 rounded-xl">
          <div className="label-uppercase text-muted-foreground mb-3">Cooking Details</div>
          <div className="grid grid-cols-2 gap-3">
            {meal.prepTime !== undefined && meal.prepTime > 0 && (
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center flex-shrink-0">
                  <Timer className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Prep</div>
                  <div className="text-sm font-medium">{meal.prepTime} min</div>
                </div>
              </div>
            )}
            {cookTime !== undefined && cookTime > 0 && (
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center flex-shrink-0">
                  <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Cook time</div>
                  <div className="text-sm font-medium">{cookTime} min</div>
                </div>
              </div>
            )}
            {cookTemp && (
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-50 dark:bg-red-950/30 flex items-center justify-center flex-shrink-0">
                  <Thermometer className="w-4 h-4 text-red-500 dark:text-red-400" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Temperature</div>
                  <div className="text-sm font-medium">{cookTemp}°F</div>
                </div>
              </div>
            )}
            {cookSetting && cookSetting !== "no cook" && (
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/30 flex items-center justify-center flex-shrink-0">
                  <UtensilsCrossed className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Method</div>
                  <div className="text-sm font-medium capitalize">{cookSetting}</div>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Log / Unlog this meal */}
      {alreadyLogged ? (
        <div className="flex gap-2">
          <Button
            disabled
            className="flex-1 h-11 rounded-xl text-sm"
            style={{ background: "rgba(82,183,136,0.15)", color: "#52B788", border: "1px solid rgba(82,183,136,0.3)" }}
          >
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Logged today
            </span>
          </Button>
          <Button
            onClick={handleUnlog}
            variant="outline"
            className="h-11 px-4 rounded-xl text-sm"
            title="Unlog this meal"
          >
            <Undo2 className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <Button
          onClick={handleLogMeal}
          className="w-full h-11 rounded-xl text-sm"
        >
          Log this meal
        </Button>
      )}

      {/* Nutrition */}
      <Card className="p-5 rounded-xl">
        <div className="label-uppercase text-muted-foreground mb-4">Nutrition Facts</div>
        <div className="grid grid-cols-4 gap-3 text-center">
          <div>
            <div className="text-2xl font-serif text-blue-600">{Math.round(meal.protein * 10) / 10}g</div>
            <div className="label-uppercase text-muted-foreground mt-1">Protein</div>
          </div>
          <div>
            <div className="text-2xl font-serif text-amber-600">{Math.round(meal.carbs * 10) / 10}g</div>
            <div className="label-uppercase text-muted-foreground mt-1">Carbs</div>
          </div>
          <div>
            <div className="text-2xl font-serif text-red-500">{Math.round(meal.fat * 10) / 10}g</div>
            <div className="label-uppercase text-muted-foreground mt-1">Fat</div>
          </div>
          {meal.fiber !== undefined && (
            <div>
              <div className="text-2xl font-serif text-green-600">{meal.fiber}g</div>
              <div className="label-uppercase text-muted-foreground mt-1">Fiber</div>
            </div>
          )}
        </div>
      </Card>

      {/* Ingredients */}
      <Card className="p-5 rounded-xl">
        <div className="label-uppercase text-muted-foreground mb-3">Ingredients</div>
        <div className="space-y-0">
          {meal.ingredients.map((ing: any, i: number) => (
            <div key={i} className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
              <span className="text-sm">{ing.name}</span>
              <span className="text-sm text-muted-foreground tabular-nums">{ing.amount} {ing.unit}</span>
            </div>
          ))}
        </div>

      </Card>

      {/* Instructions */}
      {meal.instructions && meal.instructions.length > 0 && (
        <Card className="p-5 rounded-xl">
          <div className="label-uppercase text-muted-foreground mb-4">Preparation</div>
          <ol className="space-y-3">
            {meal.instructions.map((step: string, i: number) => (
              <li key={i} className="flex gap-3 text-sm leading-relaxed">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-foreground text-xs font-semibold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {/* Why this meal */}
      <Card className="p-5 rounded-xl border-border/60">
        <div className="label-uppercase text-muted-foreground mb-2">Why this meal</div>
        <p className="text-sm text-muted-foreground leading-relaxed">
          {getMealExplanation(meal)}
        </p>
      </Card>

      {/* Meal prep tips — uses DB data now */}
      <Card className="p-5 rounded-xl">
        <div className="label-uppercase text-muted-foreground mb-3">Meal prep tips</div>
        <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed">
          {mealPrepTips && mealPrepTips.length > 0 ? (
            mealPrepTips.map((tip: string, i: number) => (
              <li key={i}>• {tip}</li>
            ))
          ) : (
            <>
              <li>• Can be prepped in advance and stored for 3–4 days</li>
              <li>• Store in airtight containers in the fridge</li>
              <li>• Reheat in microwave 1–2 min or oven at 350°F for 10 min</li>
              {meal.cookingLevel === "none" && <li>• No reheating needed — grab and go</li>}
            </>
          )}
        </ul>
      </Card>

      {/* Diet compatibility & allergens */}
      {(compatibleDiets || allergensPresent) && (
        <Card className="p-5 rounded-xl">
          {compatibleDiets && compatibleDiets.length > 0 && (
            <div className="mb-4">
              <div className="label-uppercase text-muted-foreground mb-2">Compatible diets</div>
              <div className="flex flex-wrap gap-1.5">
                {compatibleDiets.map((diet: string) => (
                  <span key={diet} className="px-2.5 py-1 rounded-full bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 text-[11px] font-medium">
                    {diet.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            </div>
          )}
          {allergensPresent && allergensPresent.length > 0 && (
            <div>
              <div className="label-uppercase text-muted-foreground mb-2">Contains</div>
              <div className="flex flex-wrap gap-1.5">
                {allergensPresent.map((allergen: string) => (
                  <span key={allergen} className="px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 text-[11px] font-medium capitalize">
                    {allergen}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function getMealExplanation(meal: any): string {
  const parts: string[] = [];
  if (meal.protein >= 30) parts.push(`With ${Math.round(meal.protein * 10) / 10}g protein, this meal supports muscle maintenance and keeps you satiated.`);
  if (meal.fiber && meal.fiber >= 5) parts.push(`The ${meal.fiber}g of fiber promotes digestive health and sustained energy.`);
  if (meal.calories < 400) parts.push("A lighter option, ideal for staying in a calorie deficit without sacrificing nutrition.");
  if (meal.calories >= 500) parts.push("A higher-calorie meal that provides substantial fuel for active days.");
  if (meal.tags?.includes("omega-3")) parts.push("Rich in omega-3 fatty acids for heart health.");
  if (meal.tags?.includes("meal-prep")) parts.push("Excellent for batch cooking — prepare once, enjoy all week.");
  if (parts.length === 0) parts.push(`A balanced meal with ${meal.calories} calories providing ${Math.round(meal.protein * 10) / 10}g protein, ${Math.round(meal.carbs * 10) / 10}g carbs, and ${Math.round(meal.fat * 10) / 10}g fat.`);
  return parts.join(" ");
}
