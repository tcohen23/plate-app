import { action } from "./_generated/server";
import { v } from "convex/values";

export const lookupBarcode = action({
  args: { barcode: v.string() },
  returns: v.any(),
  handler: async (_ctx, args) => {
    const { barcode } = args;
    try {
      const response = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`
      );
      if (!response.ok) return { found: false, barcode };

      const data = await response.json();
      if (data.status !== 1 || !data.product) return { found: false, barcode };

      const product = data.product;
      const nutriments = product.nutriments || {};

      return {
        found: true,
        barcode,
        name: product.product_name || product.generic_name || "Unknown Product",
        brand: product.brands || "",
        servingSize: product.serving_size || "1 serving",
        calories: Math.round(nutriments["energy-kcal_serving"] || nutriments["energy-kcal_100g"] || 0),
        protein: Math.round(nutriments.proteins_serving || nutriments.proteins_100g || 0),
        carbs: Math.round(nutriments.carbohydrates_serving || nutriments.carbohydrates_100g || 0),
        fat: Math.round(nutriments.fat_serving || nutriments.fat_100g || 0),
        fiber: Math.round(nutriments.fiber_serving || nutriments.fiber_100g || 0),
        sugar: Math.round(nutriments.sugars_serving || nutriments.sugars_100g || 0),
        sodium: Math.round(nutriments.sodium_serving || nutriments.sodium_100g || 0),
        imageUrl: product.image_front_small_url || product.image_url || null,
      };
    } catch {
      return { found: false, barcode };
    }
  },
});
