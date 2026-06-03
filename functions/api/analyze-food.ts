/**
 * Cloudflare Pages Function: /api/analyze-food
 * Server-side meal scan via Viktor Spaces Gemini proxy.
 * Called by FoodTrackerPage.tsx instead of the Convex analyzeFoodImage action.
 */

const VIKTOR_API_URL = "https://zetalabs-ai-prod--viktor-none.modal.run";
const PROJECT_NAME = "plate";
const PROJECT_SECRET = "BQIW368e7c-CAgcYvc1NlknKDFuu5P1e1_8e2qvTVXc";

const FOOD_SCAN_PROMPT = `You are a nutrition expert. Look at this food image and identify every distinct food item visible.

For each food item, provide a JSON object with EXACT values (not ranges):
- name: specific food name (e.g. "Grilled Chicken Breast", not just "Chicken")
- calories: integer (kcal for ONE serving)
- protein: grams (number)
- carbs: grams (number)
- fat: grams (number)
- fiber: grams (number, 0 if unknown)
- servingSize: string (e.g. "1 cup", "3 oz", "1 slice")

Return ONLY a valid JSON array. If no food is visible, return [].
Example: [{"name":"Brown Rice","calories":216,"protein":5,"carbs":45,"fat":2,"fiber":2,"servingSize":"1 cup"}]`;

interface OnRequestContext {
  request: Request;
  env: Record<string, string>;
}

export async function onRequestPost({ request }: OnRequestContext): Promise<Response> {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  try {
    const { imageUrl } = await request.json() as { imageUrl: string };
    if (!imageUrl) {
      return new Response(JSON.stringify({ error: "missing_image" }), { status: 400, headers: corsHeaders });
    }

    // Convert imageUrl to base64 inline_data for Gemini
    let mimeType = "image/jpeg";
    let base64Data: string;

    if (imageUrl.startsWith("data:")) {
      // Already a data URL
      const match = imageUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) {
        return new Response(JSON.stringify({ error: "invalid_image_format" }), { status: 400, headers: corsHeaders });
      }
      mimeType = match[1];
      base64Data = match[2];
    } else {
      // Fetch the image and convert to base64
      const imgRes = await fetch(imageUrl);
      if (!imgRes.ok) {
        return new Response(JSON.stringify({ error: "image_fetch_failed" }), { status: 400, headers: corsHeaders });
      }
      mimeType = imgRes.headers.get("content-type") || "image/jpeg";
      const buf = await imgRes.arrayBuffer();
      base64Data = btoa(String.fromCharCode(...new Uint8Array(buf)));
    }

    // Call Gemini via Viktor Spaces Pipedream proxy
    const toolCallRes = await fetch(`${VIKTOR_API_URL}/api/viktor-spaces/tools/call`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_name: PROJECT_NAME,
        project_secret: PROJECT_SECRET,
        role: "mcp_pd_google_gemini_proxy_post",
        arguments: {
          url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
          json_body: {
            contents: [{
              parts: [
                { text: FOOD_SCAN_PROMPT },
                { inline_data: { mime_type: mimeType, data: base64Data } },
              ],
            }],
            generationConfig: { maxOutputTokens: 700 },
          },
        },
      }),
    });

    if (!toolCallRes.ok) {
      throw new Error(`Viktor API HTTP ${toolCallRes.status}`);
    }

    const toolResult = await toolCallRes.json() as any;
    if (!toolResult.success) {
      throw new Error(toolResult.error || "Tool call failed");
    }

    // Parse Gemini response
    let geminiBody: any;
    try {
      const content = toolResult.result?.content;
      if (typeof content === "string") {
        geminiBody = JSON.parse(content);
      } else {
        geminiBody = content;
      }
    } catch {
      throw new Error("Failed to parse Gemini response");
    }

    const gemText: string = geminiBody?.body?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    if (!gemText) {
      return new Response(JSON.stringify([]), { status: 200, headers: corsHeaders });
    }

    // Extract JSON array from the text
    const jsonMatch = gemText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return new Response(JSON.stringify([]), { status: 200, headers: corsHeaders });
    }

    const items = JSON.parse(jsonMatch[0]);
    return new Response(JSON.stringify(Array.isArray(items) ? items : []), {
      status: 200,
      headers: corsHeaders,
    });

  } catch (e: any) {
    console.error("[analyze-food] Error:", e);
    return new Response(JSON.stringify({ error: "vision_api_not_configured" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
}

export async function onRequestOptions(): Promise<Response> {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
