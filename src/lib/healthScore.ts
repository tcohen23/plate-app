/**
 * Calculate a 1-100 health score based on nutrition data + product metadata.
 * Higher = healthier. Uses multiple signals from Open Food Facts.
 */
export function calculateHealthScore(product: any): { score: number; color: string; label: string; reasons: string[] } {
  const n = product.nutriments || {};
  const reasons: string[] = [];
  let score = 50; // Start neutral

  // --- Nutri-Score (A-E, from Open Food Facts) ---
  const nutriScore = (product.nutriscore_grade || product.nutrition_grades || "").toLowerCase();
  if (nutriScore === "a") { score += 25; reasons.push("Excellent Nutri-Score (A)"); }
  else if (nutriScore === "b") { score += 15; reasons.push("Good Nutri-Score (B)"); }
  else if (nutriScore === "c") { score += 0; reasons.push("Average Nutri-Score (C)"); }
  else if (nutriScore === "d") { score -= 15; reasons.push("Below-average Nutri-Score (D)"); }
  else if (nutriScore === "e") { score -= 25; reasons.push("Poor Nutri-Score (E)"); }

  // --- Protein content (per 100g) ---
  const protein100 = n.proteins_100g || 0;
  if (protein100 >= 20) { score += 10; reasons.push("High protein (" + Math.round(protein100) + "g/100g)"); }
  else if (protein100 >= 10) { score += 5; reasons.push("Good protein content"); }

  // --- Sugar (per 100g) ---
  const sugar100 = n.sugars_100g || 0;
  if (sugar100 > 22) { score -= 15; reasons.push("Very high sugar (" + Math.round(sugar100) + "g/100g)"); }
  else if (sugar100 > 12) { score -= 8; reasons.push("High sugar content"); }
  else if (sugar100 < 5) { score += 5; reasons.push("Low sugar"); }

  // --- Saturated fat (per 100g) ---
  const satFat100 = n["saturated-fat_100g"] || 0;
  if (satFat100 > 10) { score -= 12; reasons.push("High saturated fat (" + Math.round(satFat100) + "g/100g)"); }
  else if (satFat100 > 5) { score -= 5; reasons.push("Moderate saturated fat"); }
  else if (satFat100 < 2) { score += 5; reasons.push("Low saturated fat"); }

  // --- Sodium (per 100g) ---
  const sodium100 = n.sodium_100g || 0;
  if (sodium100 > 0.8) { score -= 10; reasons.push("High sodium (" + Math.round(sodium100 * 1000) + "mg/100g)"); }
  else if (sodium100 > 0.4) { score -= 5; reasons.push("Moderate sodium"); }
  else if (sodium100 < 0.1) { score += 3; reasons.push("Low sodium"); }

  // --- Fiber (per 100g) ---
  const fiber100 = n.fiber_100g || 0;
  if (fiber100 >= 6) { score += 8; reasons.push("High fiber (" + Math.round(fiber100) + "g/100g)"); }
  else if (fiber100 >= 3) { score += 4; reasons.push("Good fiber content"); }

  // --- Calories per 100g ---
  const kcal100 = n["energy-kcal_100g"] || 0;
  if (kcal100 > 500) { score -= 8; reasons.push("Very calorie-dense (" + Math.round(kcal100) + " kcal/100g)"); }
  else if (kcal100 < 100) { score += 5; reasons.push("Low calorie density"); }

  // --- NOVA group (level of processing) ---
  const nova = product.nova_group;
  if (nova === 1) { score += 10; reasons.push("Unprocessed / minimally processed (NOVA 1)"); }
  else if (nova === 2) { score += 5; reasons.push("Processed culinary ingredient (NOVA 2)"); }
  else if (nova === 3) { score -= 3; reasons.push("Processed food (NOVA 3)"); }
  else if (nova === 4) { score -= 12; reasons.push("Ultra-processed food (NOVA 4)"); }

  // --- Additives ---
  const additives = product.additives_n || 0;
  if (additives > 5) { score -= 8; reasons.push(additives + " additives detected"); }
  else if (additives > 2) { score -= 3; reasons.push("Some additives (" + additives + ")"); }
  else if (additives === 0) { score += 3; reasons.push("No additives"); }

  // Clamp score
  score = Math.max(1, Math.min(100, score));

  // Determine color and label
  let color: string, label: string;
  if (score >= 80) { color = "#22c55e"; label = "Excellent"; }
  else if (score >= 65) { color = "#84cc16"; label = "Good"; }
  else if (score >= 50) { color = "#eab308"; label = "Average"; }
  else if (score >= 35) { color = "#f97316"; label = "Below Average"; }
  else { color = "#ef4444"; label = "Poor"; }

  return { score, color, label, reasons: reasons.slice(0, 4) };
}
