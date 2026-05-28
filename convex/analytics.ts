/**
 * analytics.ts — PostHog server-side event proxy
 *
 * Avoids the iOS Safari crash caused by posthog.init() patching window.history.
 * Events are sent from Convex (server) via the PostHog /capture/ REST endpoint.
 * The client just calls this mutation — no posthog.js is ever loaded on the client.
 */
import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

const POSTHOG_API_KEY = "phc_wuCAdVLDxvBns5Zcne9btMgma54uKEPvpg32gPvuhUio";
const POSTHOG_HOST = "https://us.i.posthog.com";

/** Fire-and-forget: send an event to PostHog. Never throws — analytics must never break the app. */
async function sendToPostHog(distinctId: string, event: string, properties: Record<string, unknown>) {
  try {
    await fetch(`${POSTHOG_HOST}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: POSTHOG_API_KEY,
        distinct_id: distinctId,
        event,
        properties: {
          ...properties,
          $lib: "plate-convex",
        },
        timestamp: new Date().toISOString(),
      }),
    });
  } catch {
    // Silently ignore — PostHog being down must not break the app
  }
}

/** Track any custom event. Properties are a flat JSON-serialisable record. */
export const trackEvent = mutation({
  args: {
    event: v.string(),
    properties: v.optional(v.any()),
  },
  handler: async (ctx, { event, properties = {} }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return; // Don't track anonymous events for now

    const distinctId = userId.toString();
    await sendToPostHog(distinctId, event, properties as Record<string, unknown>);
  },
});

/** Identify a user — sets person properties in PostHog. */
export const identifyUser = mutation({
  args: {
    properties: v.optional(v.any()),
  },
  handler: async (ctx, { properties = {} }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;

    const distinctId = userId.toString();
    try {
      await fetch(`${POSTHOG_HOST}/capture/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: POSTHOG_API_KEY,
          distinct_id: distinctId,
          event: "$identify",
          properties: {
            $set: properties,
            $lib: "plate-convex",
          },
          timestamp: new Date().toISOString(),
        }),
      });
    } catch {
      // Silent
    }
  },
});
