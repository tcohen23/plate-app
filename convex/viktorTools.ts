/**
 * Viktor Tools - Call any Viktor SDK function from your Convex app.
 *
 * Available tools include:
 * - quick_ai_search: AI-powered web search with summarized results
 * - text2im: Generate images from text prompts
 * - file_to_markdown: Convert PDF/DOCX/XLSX files to markdown
 * - And all MCP integration tools configured for your user
 *
 * To add a new tool, first test it to see the response shape.
 */
import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";

declare const process: { env: Record<string, string | undefined> };

const VIKTOR_API_URL = process.env.VIKTOR_SPACES_API_URL!;
const PROJECT_NAME = process.env.VIKTOR_SPACES_PROJECT_NAME!;
const PROJECT_SECRET = process.env.VIKTOR_SPACES_PROJECT_SECRET!;

async function callTool<T>(role: string, args: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch(`${VIKTOR_API_URL}/api/viktor-spaces/tools/call`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      project_name: PROJECT_NAME,
      project_secret: PROJECT_SECRET,
      role,
      arguments: args,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  const json = await response.json();
  if (!json.success) {
    throw new Error(json.error ?? "Tool call failed");
  }
  return json.result as T;
}

export const quickAiSearch = action({
  args: { query: v.string() },
  returns: v.string(),
  handler: async (_ctx, { query }) => {
    const result = await callTool<{ search_response: string }>("quick_ai_search", {
      search_question: query,
    });
    return result.search_response;
  },
});

/** Parse macros from a web search text response */
function parseMacrosFromSearchText(text: string): { calories: number; protein: number; carbs: number; fat: number } {
  // Calories
  let calMatch = text.match(/Calories?\s+([\d,]+)/i) || text.match(/([\d,]+)\s*(?:kcal|cal(?:ories?)?)\b/i);
  // Protein
  let protMatch = text.match(/Protein\s+([\d.]+)\s*g/i) || text.match(/([\d.]+)\s*g\s*protein/i) || text.match(/(\d+)p\b/i);
  // Carbs
  let carbMatch = text.match(/(?:Total\s+)?Carb(?:ohydrate)?s?\s+([\d.]+)\s*g/i)
    || text.match(/Carb\s+([\d.]+)\s*g/i)
    || text.match(/([\d.]+)\s*g\s*carb/i)
    || text.match(/(\d+)c\s*(?:\(per meal\))?/i);
  // Fat
  let fatMatch = text.match(/(?:Total\s+)?Fat\s+([\d.]+)\s*g/i) || text.match(/([\d.]+)\s*g\s*fat/i) || text.match(/(\d+)f\s*(?:\(per meal\))?/i);

  return {
    calories: calMatch ? Math.round(parseFloat(calMatch[1].replace(",", ""))) : 0,
    protein: protMatch ? Math.round(parseFloat(protMatch[1])) : 0,
    carbs: carbMatch ? Math.round(parseFloat(carbMatch[1])) : 0,
    fat: fatMatch ? Math.round(parseFloat(fatMatch[1])) : 0,
  };
}

/** Call OpenAI API directly (no Pipedream) if OPENAI_API_KEY is set */
async function callOpenAIDirectly(prompt: string, imageBase64?: string): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const messages: any[] = [];

  if (imageBase64) {
    // Vision request
    messages.push({
      role: "user",
      content: [
        { type: "text", text: prompt },
        {
          type: "image_url",
          image_url: {
            url: imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`,
          },
        },
      ],
    });
  } else {
    messages.push({ role: "user", content: prompt });
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: imageBase64 ? "gpt-4o-mini" : "gpt-4o-mini",
      messages,
      max_tokens: 500,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("[callOpenAIDirectly] Error:", err);
    return null;
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? null;
}

/** Call Gemini API directly (no Pipedream) if GEMINI_API_KEY is set */
async function callGeminiDirectly(prompt: string, imageBase64?: string): Promise<string | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const parts: any[] = [{ text: prompt }];

  if (imageBase64) {
    // Extract base64 data (strip data: prefix if present)
    const base64Data = imageBase64.includes(",") ? imageBase64.split(",")[1] : imageBase64;
    const mimeType = imageBase64.startsWith("data:image/png") ? "image/png" : "image/jpeg";
    parts.push({ inline_data: { mime_type: mimeType, data: base64Data } });
  }

  const model = imageBase64 ? "gemini-1.5-flash" : "gemini-1.5-flash";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { maxOutputTokens: 500 },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    console.error("[callGeminiDirectly] Error:", err);
    return null;
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
}

/** Extract JSON array from AI response text */
function extractJsonArray(text: string): any[] | null {
  if (!text) return null;
  const cleaned = text.replace(/```json?\s*/gi, "").replace(/```\s*/g, "").trim();
  const match = cleaned.match(/\[[\s\S]*\]/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

/** Parse a voice transcript into food items with estimated macros */
export const parseFoodVoiceLog = action({
  args: { transcript: v.string() },
  returns: v.any(),
  handler: async (ctx, { transcript }) => {
    // Step 1: Get all meals from the database for fuzzy matching after AI parse
    let allMeals: any[] = [];
    try {
      allMeals = await ctx.runQuery(internal.meals.getAllMealsInternal, {}) as any[];
    } catch (e) {
      console.error("[parseFoodVoiceLog] Failed to load meals database:", e);
    }

    const jsonPrompt = `You are a nutrition parser for the Plate app. Parse the voice transcript below and extract every food item the user mentioned.

Voice transcript: "${transcript}"

Return ONLY a valid JSON array — no markdown, no code fences, no explanation:
[{"name":"Food Name","calories":300,"protein":20,"carbs":30,"fat":10,"mealSlot":"snack"}]

Rules:
- Estimate realistic macros for a typical serving size
- mealSlot must be exactly one of: breakfast, lunch, dinner, snack (infer from context; default to snack)
- All macro values must be integers
- If no food is detected return []
- Output the JSON array and nothing else`;

    let parsedItems: any[] | null = null;

    // Strategy 1: Try OpenAI API directly (requires OPENAI_API_KEY env var)
    try {
      const openaiText = await callOpenAIDirectly(jsonPrompt);
      if (openaiText) {
        console.log("[parseFoodVoiceLog] OpenAI direct response:", openaiText.substring(0, 200));
        parsedItems = extractJsonArray(openaiText);
      }
    } catch (e) {
      console.error("[parseFoodVoiceLog] OpenAI direct call failed:", e);
    }

    // Strategy 2: Try Gemini API directly (requires GEMINI_API_KEY env var)
    if (!parsedItems) {
      try {
        const geminiText = await callGeminiDirectly(jsonPrompt);
        if (geminiText) {
          console.log("[parseFoodVoiceLog] Gemini direct response:", geminiText.substring(0, 200));
          parsedItems = extractJsonArray(geminiText);
        }
      } catch (e) {
        console.error("[parseFoodVoiceLog] Gemini direct call failed:", e);
      }
    }

    // Strategy 3: Use quick_ai_search for nutrition data (always available, no API key needed)
    if (!parsedItems) {
      try {
        console.log("[parseFoodVoiceLog] Falling back to quick_ai_search for:", transcript);
        
        // Use search to find foods and macros from the transcript
        const searchResult = await callTool<{ search_response: string }>("quick_ai_search", {
          search_question: `nutrition macros calories protein carbs fat grams for: "${transcript}"`,
        });
        
        const searchText = searchResult.search_response || "";
        console.log("[parseFoodVoiceLog] Search result:", searchText.substring(0, 300));
        
        // Try to extract a JSON block if the search returned one
        const jsonFromSearch = extractJsonArray(searchText);
        if (jsonFromSearch && jsonFromSearch.length > 0) {
          parsedItems = jsonFromSearch;
        } else {
          // Parse macros from natural language search result
          const macros = parseMacrosFromSearchText(searchText);
          
          // Extract a food name from the transcript (first significant noun phrase)
          const cleanTranscript = transcript.replace(/^(i\s+had|i\s+ate|i\s+just\s+had|had|ate)\s+/i, "").trim();
          const foodName = cleanTranscript.charAt(0).toUpperCase() + cleanTranscript.slice(1).substring(0, 50);
          
          // Infer meal slot from transcript
          let mealSlot = "snack";
          const lower = transcript.toLowerCase();
          if (lower.includes("breakfast") || lower.includes("morning")) mealSlot = "breakfast";
          else if (lower.includes("lunch") || lower.includes("midday") || lower.includes("noon")) mealSlot = "lunch";
          else if (lower.includes("dinner") || lower.includes("supper") || lower.includes("evening")) mealSlot = "dinner";
          
          if (macros.calories > 0) {
            parsedItems = [{ name: foodName, ...macros, mealSlot, fromDatabase: false }];
          }
        }
      } catch (e) {
        console.error("[parseFoodVoiceLog] quick_ai_search fallback failed:", e);
      }
    }

    if (!parsedItems || parsedItems.length === 0) {
      console.error("[parseFoodVoiceLog] All strategies failed, returning []");
      return [];
    }

    // Step 3: Fuzzy-match each item against the Plate meals DB
    return parsedItems.map((item: any) => {
      const searchName = (item.name || "").toLowerCase().trim();
      const dbMatch = allMeals.find((m: any) => {
        const dbName = m.name.toLowerCase();
        return (
          dbName === searchName ||
          dbName.includes(searchName) ||
          searchName.includes(dbName) ||
          // word-level partial match on first two words
          searchName.split(" ").slice(0, 2).every((w: string) => dbName.includes(w))
        );
      });
      if (dbMatch) {
        return {
          name: dbMatch.name,
          calories: Math.round(dbMatch.calories),
          protein: Math.round(dbMatch.protein),
          carbs: Math.round(dbMatch.carbs),
          fat: Math.round(dbMatch.fat),
          mealSlot: item.mealSlot || "snack",
          fromDatabase: true,
        };
      }
      // Fallback: use AI-estimated macros for foods not in DB
      return {
        name: item.name,
        calories: item.calories || 0,
        protein: item.protein || 0,
        carbs: item.carbs || 0,
        fat: item.fat || 0,
        mealSlot: item.mealSlot || "snack",
        fromDatabase: false,
      };
    });
  },
});

/** Analyze a food photo URL and return estimated food items + macros */
export const analyzeFoodImage = action({
  args: { imageUrl: v.string() },
  returns: v.any(),
  handler: async (_ctx, { imageUrl }) => {
    const visionPrompt = `Analyze this food photo. Identify every visible food item. For each, estimate:
- name
- calories (integer)
- protein in grams (integer)
- carbs in grams (integer)
- fat in grams (integer)
- mealSlot: breakfast, lunch, dinner, or snack

Return ONLY a valid JSON array (no markdown):
[{"name":"Grilled Chicken","calories":280,"protein":40,"carbs":0,"fat":8,"mealSlot":"lunch"}]

If no food visible, return [].`;

    // Strategy 1: OpenAI Vision API directly (requires OPENAI_API_KEY)
    try {
      const openaiText = await callOpenAIDirectly(visionPrompt, imageUrl);
      if (openaiText) {
        console.log("[analyzeFoodImage] OpenAI vision response:", openaiText.substring(0, 200));
        const parsed = extractJsonArray(openaiText);
        if (parsed && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error("[analyzeFoodImage] OpenAI direct vision failed:", e);
    }

    // Strategy 2: Gemini Vision API directly (requires GEMINI_API_KEY)
    try {
      const geminiText = await callGeminiDirectly(visionPrompt, imageUrl);
      if (geminiText) {
        console.log("[analyzeFoodImage] Gemini vision response:", geminiText.substring(0, 200));
        const parsed = extractJsonArray(geminiText);
        if (parsed && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error("[analyzeFoodImage] Gemini direct vision failed:", e);
    }

    // Strategy 3: Fallback — search for the image URL to get any available data
    // (limited without vision AI, but better than silent failure)
    console.warn("[analyzeFoodImage] No vision API key configured. Add OPENAI_API_KEY or GEMINI_API_KEY to Convex env vars.");
    
    // Return a specific error object so the frontend can show a helpful message
    return { error: "vision_api_not_configured", message: "Add OPENAI_API_KEY or GEMINI_API_KEY to Convex environment variables to enable meal scan." };
  },
});

export const generateImage = action({
  args: {
    prompt: v.string(),
    aspectRatio: v.optional(
      v.union(
        v.literal("1:1"),
        v.literal("16:9"),
        v.literal("9:16"),
        v.literal("4:3"),
        v.literal("3:2"),
      ),
    ),
  },
  returns: v.string(),
  handler: async (_ctx, { prompt, aspectRatio }) => {
    const result = await callTool<{ image_url?: string; response_text?: string }>("text2im", {
      prompt,
      aspect_ratio: aspectRatio ?? "1:1",
    });
    // image_url is the publicly accessible URL; fall back to response_text if needed
    return result.image_url ?? result.response_text ?? "";
  },
});

/** Generate a fully personalized "Why" explanation for a user's macro targets */
export const generateWhyExplanation = action({
  args: {
    profile: v.object({
      name: v.optional(v.string()),
      age: v.number(),
      gender: v.string(),
      height: v.number(),        // inches
      weight: v.number(),        // lbs
      activityLevel: v.string(),
      goal: v.string(),
      dietPreference: v.optional(v.string()),
      bmr: v.optional(v.number()),
      tdee: v.optional(v.number()),
      targetCalories: v.optional(v.number()),
      targetProtein: v.optional(v.number()),
      targetCarbs: v.optional(v.number()),
      targetFat: v.optional(v.number()),
      proteinGkg: v.optional(v.number()),
      calorieFloorActivated: v.optional(v.boolean()),
      usesGlp1: v.optional(v.boolean()),
      hydrationTarget: v.optional(v.number()),
      hydrationMl: v.optional(v.number()),
      mealStructure: v.optional(v.string()),
    }),
  },
  returns: v.object({
    calorie: v.string(),
    macros: v.string(),
    diet: v.string(),
    hydration: v.string(),
    meals: v.string(),
    floorNote: v.optional(v.string()),
  }),
  handler: async (_ctx, { profile }) => {
    const heightFt = Math.floor(profile.height / 12);
    const heightIn = Math.round(profile.height % 12);
    const weightKg = Math.round(profile.weight * 0.453592);
    const heightCm = Math.round(profile.height * 2.54);

    const activityMap: Record<string, string> = {
      sedentary: "sedentary (desk job, little movement)",
      light: "lightly active (light exercise 1-3 days/week)",
      moderate: "moderately active (exercise 3-5 days/week)",
      active: "very active (hard exercise 6-7 days/week)",
      very_active: "extremely active (physical job + daily training)",
    };
    const goalMap: Record<string, string> = {
      aggressive_cut: "aggressive fat loss (aggressive cut)",
      moderate_cut: "moderate fat loss (moderate cut)",
      light_cut: "light fat loss (light cut)",
      maintenance: "maintain current weight",
      light_bulk: "light muscle gain (light bulk)",
      moderate_bulk: "moderate muscle gain (moderate bulk)",
      aggressive_bulk: "aggressive muscle gain (aggressive bulk)",
    };

    const activityStr = activityMap[profile.activityLevel] || profile.activityLevel;
    const goalStr = goalMap[profile.goal] || profile.goal;
    const dietStr = profile.dietPreference?.replace(/_/g, " ") || "balanced";
    const bmr = profile.bmr || 0;
    const tdee = profile.tdee || 0;
    const cals = profile.targetCalories || 0;
    const protein = profile.targetProtein || 0;
    const carbs = profile.targetCarbs || 0;
    const fat = profile.targetFat || 0;
    const proteinGkg = profile.proteinGkg || 1.6;
    const hydrationGlasses = profile.hydrationTarget || 8;
    const hydrationMl = profile.hydrationMl || 2000;
    const glp1Note = profile.usesGlp1 ? "This person is currently using a GLP-1 medication (like Ozempic or Wegovy)." : "";
    const floorNote = profile.calorieFloorActivated ? "Their calorie target was raised to a safer minimum because their aggressive cut goal would have dropped below their BMR." : "";

    const systemPrompt = `You are a certified sports nutritionist and dietitian writing personalized macro explanations for a fitness app called Plate.
Write in second person ("you", "your"). Be direct, educational, and specific to this exact person's stats.
No bullet points. No headers. Write in flowing paragraphs.
DO NOT use any hyphens anywhere — not in words, not in ranges, not as dashes.
Keep each section to 3 to 5 sentences. Sound like a knowledgeable coach talking to a client, not a textbook.
Every explanation must reference their specific numbers, body stats, activity level, or goal — never be generic.`;

    const userPrompt = `Write personalized nutrition explanations for this person. Return ONLY valid JSON with these exact keys: calorie, macros, diet, hydration, meals. No markdown. No extra text.

Person stats:
Age: ${profile.age}
Gender: ${profile.gender}
Height: ${heightFt}ft ${heightIn}in (${heightCm}cm)
Weight: ${profile.weight}lbs (${weightKg}kg)
Activity: ${activityStr}
Goal: ${goalStr}
Diet preference: ${dietStr}
BMR: ${bmr} kcal
TDEE: ${tdee} kcal
Target calories: ${cals} kcal
Target protein: ${protein}g (${proteinGkg}g per kg)
Target carbs: ${carbs}g
Target fat: ${fat}g
Hydration: ${hydrationGlasses} glasses (${hydrationMl}mL)
${glp1Note}
${floorNote}

Keys to generate:
"calorie": Explain exactly why they got ${cals} kcal. Walk through BMR (${bmr} kcal) calculated from their specific height, weight, age and gender using Mifflin-St Jeor. Then explain the activity multiplier for ${activityStr}. Then the goal adjustment for ${goalStr}. Reference their specific numbers throughout.

"macros": Explain their exact protein (${protein}g), carbs (${carbs}g), and fat (${fat}g) targets. Tie protein to their ${proteinGkg}g/kg at ${weightKg}kg bodyweight. Explain why carbs and fat were split the way they were given their ${dietStr} preference and ${goalStr} goal. If GLP-1: note the protein bump. If aggressive cut: note muscle protection.

"diet": Explain why the ${dietStr} approach was chosen and how it shapes their specific macro split. Reference real research but make it conversational. Tie it to their specific goal of ${goalStr} and their activity level.

"hydration": Explain their ${hydrationGlasses} glass (${hydrationMl}mL) target specifically. Reference their ${weightKg}kg weight and ${activityStr} activity. If GLP-1: mention the extra target. Make it feel personal to their stats.

"meals": Explain why spreading macros across multiple meals matters specifically for someone at ${protein}g protein target with ${goalStr} goal. Reference muscle protein synthesis windows and their specific numbers. Keep it practical.`;

    // Try OpenAI first, then Gemini
    let rawText: string | null = null;
    rawText = await callOpenAIDirectly(userPrompt + "\n\nSystem: " + systemPrompt);
    if (!rawText) {
      rawText = await callGeminiDirectly(userPrompt + "\n\nSystem: " + systemPrompt);
    }

    if (!rawText) {
      // Fallback to generic explanations if no AI available
      return {
        calorie: `Your daily target is ${cals} kcal. Starting from your BMR of ${bmr} kcal, which is the energy your body burns at complete rest based on your height, weight, age, and gender using the Mifflin-St Jeor equation. Multiplied by your activity factor for ${activityStr}, giving a TDEE of ${tdee} kcal. Then adjusted for your ${goalStr} goal to arrive at ${cals} kcal.`,
        macros: `Protein is set at ${protein}g (${proteinGkg}g per kg of your ${weightKg}kg bodyweight) to protect and build muscle at your activity level. Carbs at ${carbs}g and fat at ${fat}g are divided to match your ${dietStr} approach while hitting your total calorie target.`,
        diet: `The ${dietStr} approach shapes how your calories are divided between protein, carbs, and fat. It fits your ${goalStr} goal and ${activityStr} lifestyle, giving you the right fuel at the right times.`,
        hydration: `Your target of ${hydrationGlasses} glasses (${hydrationMl}mL) is based on 35mL per kg of your ${weightKg}kg bodyweight, adjusted for your ${activityStr} activity level. Staying hydrated supports every metabolic process including fat burning and muscle recovery.`,
        meals: `Spreading your ${protein}g protein across multiple meals maximizes muscle protein synthesis. Research shows your body uses roughly 0.4g per kg bodyweight per meal for muscle building, so distributing your intake throughout the day is more effective than front or back-loading.`,
        ...(profile.calorieFloorActivated ? { floorNote: "Your calorie target was raised to a safer minimum. Dropping below your BMR consistently slows your metabolism and causes muscle loss rather than fat loss. Increasing your activity level is the more effective path to faster results." } : {}),
      };
    }

    // Parse the JSON response
    try {
      const cleaned = rawText.replace(/```json?\s*/gi, "").replace(/```\s*/g, "").trim();
      const parsed = JSON.parse(cleaned);
      return {
        calorie: parsed.calorie || "",
        macros: parsed.macros || "",
        diet: parsed.diet || "",
        hydration: parsed.hydration || "",
        meals: parsed.meals || "",
        ...(profile.calorieFloorActivated ? { floorNote: "Your calorie target was raised to a safer minimum. Dropping below your BMR consistently slows your metabolism and causes muscle loss rather than fat loss. Increasing your activity level is the more effective path to faster results." } : {}),
      };
    } catch {
      return {
        calorie: rawText.substring(0, 300),
        macros: "",
        diet: "",
        hydration: "",
        meals: "",
      };
    }
  },
});
