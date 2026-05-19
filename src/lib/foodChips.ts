/**
 * Shared food chip definitions for onboarding and settings.
 * These match actual ingredients in the 264-meal database so favorites/exclusions
 * connect directly to meal scoring and filtering.
 */
export type FoodChipGroup = { category: string; foods: string[] };

/* ── Base pools (covers every major ingredient in DB) ── */

const ALL_PROTEINS = [
  "chicken", "salmon", "ground beef", "eggs", "shrimp", "tuna", "turkey",
  "steak", "pork", "lamb", "tofu", "bacon", "cottage cheese", "greek yogurt",
  "lentils", "chickpeas", "black beans", "tempeh", "cod", "sardines",
  "tilapia", "bison", "sausage",
];

const ALL_CARBS = [
  "rice", "pasta", "sweet potato", "oats", "bread", "quinoa", "tortilla",
  "potato", "couscous", "granola", "noodles",
];

const ALL_VEGGIES = [
  "broccoli", "spinach", "bell peppers", "onion", "carrots", "zucchini",
  "mushrooms", "avocado", "tomato", "kale", "asparagus", "brussels sprouts",
  "cauliflower", "cucumber", "corn", "cabbage", "celery", "green beans",
];

const ALL_FRUITS = [
  "banana", "berries", "apple", "pineapple", "mango", "strawberries",
];

const ALL_FATS_DAIRY = [
  "cheese", "peanut butter", "almond butter", "olive oil", "butter",
  "coconut oil", "almonds", "walnuts", "chia seeds",
];

const ALL_SAUCES_EXTRAS = [
  "hot sauce", "soy sauce", "salsa", "hummus", "honey", "maple syrup",
  "pesto", "teriyaki sauce",
];

/* ── Exclude-only options (common allergens/aversions not in favorites) ── */
export const EXCLUDE_ONLY_FOODS = [
  "gluten", "dairy", "soy", "nuts", "shellfish", "pork", "red meat",
  "spicy food", "raw fish", "coconut", "corn", "mushrooms",
];

/* ── Diet-specific chip sets ── */

const VEGAN_PROTEINS = ["tofu", "tempeh", "lentils", "chickpeas", "black beans", "edamame", "seitan", "hemp seeds"];
const VEGAN_OTHER = ["nutritional yeast", "coconut yogurt", "plant milk", "tahini", "hummus"];

const KETO_LOW_CARB = ["cauliflower rice", "almond flour", "coconut flour"];
const KETO_FATS = ["butter", "cream cheese", "bacon", "heavy cream", "mct oil", "almonds", "walnuts"];

const CARNIVORE_PROTEINS = ["chicken", "ground beef", "steak", "salmon", "eggs", "bacon", "pork", "turkey", "lamb", "shrimp", "bison", "sardines"];
const CARNIVORE_FATS = ["butter", "tallow", "bone broth", "heavy cream"];

export function getFoodChipsForDiet(diet: string): FoodChipGroup[] {
  switch (diet) {
    case "vegan":
      return [
        { category: "Proteins", foods: VEGAN_PROTEINS },
        { category: "Carbs", foods: ["rice", "sweet potato", "oats", "quinoa", "pasta", "bread", "couscous", "noodles"] },
        { category: "Veggies", foods: ALL_VEGGIES },
        { category: "Fruits", foods: ALL_FRUITS },
        { category: "Other", foods: [...VEGAN_OTHER, "peanut butter", "olive oil", ...ALL_SAUCES_EXTRAS.filter(s => s !== "honey")] },
      ];
    case "vegetarian":
      return [
        { category: "Proteins", foods: ["eggs", "greek yogurt", "cottage cheese", "tofu", "tempeh", "lentils", "chickpeas", "black beans"] },
        { category: "Carbs", foods: ALL_CARBS },
        { category: "Veggies", foods: ALL_VEGGIES },
        { category: "Fruits", foods: ALL_FRUITS },
        { category: "Fats & Dairy", foods: ALL_FATS_DAIRY },
        { category: "Extras", foods: ALL_SAUCES_EXTRAS },
      ];
    case "pescatarian":
      return [
        { category: "Proteins", foods: ["salmon", "shrimp", "tuna", "cod", "tilapia", "sardines", "eggs", "greek yogurt", "tofu", "lentils", "chickpeas"] },
        { category: "Carbs", foods: ALL_CARBS },
        { category: "Veggies", foods: ALL_VEGGIES },
        { category: "Fruits", foods: ALL_FRUITS },
        { category: "Fats & Dairy", foods: ALL_FATS_DAIRY },
        { category: "Extras", foods: ALL_SAUCES_EXTRAS },
      ];
    case "keto":
      return [
        { category: "Proteins", foods: ["chicken", "salmon", "ground beef", "eggs", "shrimp", "bacon", "steak", "pork", "lamb"] },
        { category: "Low-Carb Swaps", foods: KETO_LOW_CARB },
        { category: "Veggies", foods: ["broccoli", "spinach", "bell peppers", "zucchini", "mushrooms", "avocado", "cauliflower", "asparagus", "cucumber", "celery"] },
        { category: "Fats", foods: KETO_FATS },
      ];
    case "carnivore":
      return [
        { category: "Proteins", foods: CARNIVORE_PROTEINS },
        { category: "Fats", foods: CARNIVORE_FATS },
      ];
    case "paleo":
    case "whole30":
      return [
        { category: "Proteins", foods: ["chicken", "salmon", "ground beef", "eggs", "shrimp", "tuna", "turkey", "steak", "pork", "lamb", "cod", "bison"] },
        { category: "Carbs", foods: ["sweet potato", "potato", "cauliflower rice"] },
        { category: "Veggies", foods: ALL_VEGGIES },
        { category: "Fruits", foods: ALL_FRUITS },
        { category: "Fats", foods: ["olive oil", "coconut oil", "avocado", "almonds", "walnuts"] },
      ];
    case "mediterranean":
      return [
        { category: "Proteins", foods: ["salmon", "chicken", "shrimp", "tuna", "eggs", "lentils", "chickpeas", "greek yogurt", "lamb", "cod"] },
        { category: "Carbs", foods: ["quinoa", "rice", "couscous", "bread", "pasta", "sweet potato"] },
        { category: "Veggies", foods: ALL_VEGGIES },
        { category: "Fruits", foods: ALL_FRUITS },
        { category: "Fats & Dairy", foods: ["olive oil", "feta", "almonds", "walnuts", "hummus", "tahini"] },
      ];
    default:
      // balanced, iifym, high_protein, etc.
      return [
        { category: "Proteins", foods: ALL_PROTEINS },
        { category: "Carbs", foods: ALL_CARBS },
        { category: "Veggies", foods: ALL_VEGGIES },
        { category: "Fruits", foods: ALL_FRUITS },
        { category: "Fats & Dairy", foods: ALL_FATS_DAIRY },
        { category: "Extras", foods: ALL_SAUCES_EXTRAS },
      ];
  }
}

/** Get dislike/exclude chip options — includes diet-specific + common aversions */
export function getExcludeChipsForDiet(diet: string): FoodChipGroup[] {
  const base = getFoodChipsForDiet(diet);
  return [
    ...base,
    { category: "Common Exclusions", foods: EXCLUDE_ONLY_FOODS },
  ];
}
