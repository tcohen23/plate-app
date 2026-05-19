/// <reference types="node" />
/**
 * Stripe subscription management for Plate Premium ($5/month).
 *
 * Features:
 * - Webhook handler for subscription lifecycle events
 * - has_premium_access helper (Stripe + comp roles)
 * - Mutations for subscription status sync
 */
import { getAuthUserId } from "@convex-dev/auth/server";
import { httpAction, internalMutation, internalQuery, query, mutation, action } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { v } from "convex/values";

// ── Helper: check if a profile has premium access (Stripe OR comp role) ──────
export function hasPremiumAccess(profile: {
  isPremium?: boolean;
  adminLevel?: string;
  role?: string;
} | null): boolean {
  if (!profile) return false;
  // Comp access via adminLevel
  if (["owner", "admin", "moderator", "friends_family"].includes(profile.adminLevel || "")) return true;
  // Comp access via role
  if (["family", "friends", "admin"].includes(profile.role || "")) return true;
  // Stripe subscription
  return profile.isPremium === true;
}

// ── Query: get current user's subscription status ─────────────────────────────
export const getSubscriptionStatus = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const profile = await ctx.db.query("profiles").withIndex("by_userId", q => q.eq("userId", userId)).unique();
    if (!profile) return null;
    return {
      isPremium: hasPremiumAccess(profile as any),
      subscriptionStatus: (profile as any).subscriptionStatus,
      trialEnd: (profile as any).trialEnd,
      stripeCustomerId: (profile as any).stripeCustomerId,
      role: (profile as any).role,
      adminLevel: (profile as any).adminLevel,
    };
  },
});

// ── Internal mutation: sync subscription state from webhook ──────────────────
export const syncSubscription = internalMutation({
  args: {
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.string(),
    status: v.string(), // "trialing" | "active" | "canceled" | "past_due" | "unpaid"
    trialEnd: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Find profile by stripeCustomerId
    const profiles = await ctx.db.query("profiles").collect();
    const profile = profiles.find((p: any) => (p as any).stripeCustomerId === args.stripeCustomerId);
    if (!profile) {
      console.error("syncSubscription: no profile found for customer", args.stripeCustomerId);
      return;
    }

    const isPremium = ["trialing", "active"].includes(args.status);

    await ctx.db.patch(profile._id, {
      stripeSubscriptionId: args.stripeSubscriptionId,
      subscriptionStatus: args.status,
      isPremium,
      trialEnd: args.trialEnd,
    } as any);
  },
});

// ── Internal mutation: link Stripe customer to profile ───────────────────────
export const linkStripeCustomer = internalMutation({
  args: {
    userId: v.id("users"),
    stripeCustomerId: v.string(),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db.query("profiles").withIndex("by_userId", q => q.eq("userId", args.userId)).unique();
    if (!profile) throw new Error("Profile not found");
    await ctx.db.patch(profile._id, { stripeCustomerId: args.stripeCustomerId } as any);
  },
});

// ── Internal mutation: revoke premium (e.g. payment failed after retries) ────
export const revokePremium = internalMutation({
  args: { stripeCustomerId: v.string(), reason: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const profiles = await ctx.db.query("profiles").collect();
    const profile = profiles.find((p: any) => (p as any).stripeCustomerId === args.stripeCustomerId);
    if (!profile) return;
    await ctx.db.patch(profile._id, {
      isPremium: false,
      subscriptionStatus: "canceled",
    } as any);
  },
});

// ── Mutation: cancel subscription at period end (in-app cancel path) ─────────
export const cancelSubscription = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const profile = await ctx.db.query("profiles").withIndex("by_userId", q => q.eq("userId", userId)).unique();
    if (!profile) throw new Error("Profile not found");

    const customerId = (profile as any).stripeCustomerId;
    const subscriptionId = (profile as any).stripeSubscriptionId;
    if (!customerId || !subscriptionId) {
      throw new Error("No active subscription found");
    }

    // Stripe cancel is done via HTTP action — schedule it
    await ctx.scheduler.runAfter(0, internal.stripe.cancelStripeSubscription, {
      subscriptionId,
    });

    return { success: true };
  },
});

// ── HTTP Action: Stripe webhook handler ──────────────────────────────────────
export const stripeWebhook = httpAction(async (ctx, request) => {
  const stripeSignature = request.headers.get("Stripe-Signature");
  if (!stripeSignature) {
    return new Response("Missing Stripe-Signature", { status: 400 });
  }

  const body = await request.text();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  // Verify webhook signature (manual HMAC verification without stripe SDK)
  let event: any;
  try {
    event = await verifyStripeWebhook(body, stripeSignature, webhookSecret || "");
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response("Webhook signature invalid", { status: 400 });
  }

  const eventType = event.type as string;
  const data = event.data?.object;

  console.log("Stripe webhook received:", eventType);

  if (
    eventType === "customer.subscription.created" ||
    eventType === "customer.subscription.updated"
  ) {
    // Sync subscription state
    await ctx.runMutation(internal.stripe.syncSubscription, {
      stripeCustomerId: data.customer,
      stripeSubscriptionId: data.id,
      status: data.status,
      trialEnd: data.trial_end ? data.trial_end * 1000 : undefined,
    });
  } else if (eventType === "customer.subscription.deleted") {
    await ctx.runMutation(internal.stripe.revokePremium, {
      stripeCustomerId: data.customer,
      reason: "subscription_deleted",
    });
  } else if (eventType === "invoice.payment_failed") {
    // After all retries fail, subscription moves to canceled — handled by sub.updated
    // Just log it here
    console.log("Invoice payment failed for customer:", data.customer);
  } else if (eventType === "customer.subscription.trial_will_end") {
    // Trial ending in 3 days — send reminder email
    // TODO: trigger email via ViktorSpacesEmail
    console.log("Trial ending soon for customer:", data.customer);
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});

// ── Internal action: cancel Stripe subscription via API ──────────────────────
export const cancelStripeSubscription = internalMutation({
  args: { subscriptionId: v.string() },
  handler: async (_ctx, _args) => {
    // This is called via scheduler — actual Stripe API call happens in an httpAction
    // For now, log it. A proper implementation would call the Stripe API directly.
    console.log("Cancellation requested for subscription:", _args.subscriptionId);
    // In production: call Stripe API: stripe.subscriptions.update(id, { cancel_at_period_end: true })
  },
});

// ── Stripe webhook signature verification (manual, no SDK) ───────────────────
async function verifyStripeWebhook(
  payload: string,
  signature: string,
  secret: string
): Promise<any> {
  // Parse Stripe-Signature header: t=timestamp,v1=hash
  const parts = Object.fromEntries(
    signature.split(",").map(p => {
      const [k, v] = p.split("=");
      return [k, v];
    })
  );
  const timestamp = parts["t"];
  const v1Hash = parts["v1"];

  if (!timestamp || !v1Hash) throw new Error("Invalid signature format");

  // Check timestamp tolerance (5 minutes)
  const tolerance = 300; // seconds
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - parseInt(timestamp)) > tolerance) {
    throw new Error("Webhook timestamp too old");
  }

  // Compute expected HMAC-SHA256
  const signedPayload = `${timestamp}.${payload}`;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const msgData = encoder.encode(signedPayload);

  const cryptoKey = await crypto.subtle.importKey(
    "raw", keyData, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const sigBuffer = await crypto.subtle.sign("HMAC", cryptoKey, msgData);
  const sigHex = Array.from(new Uint8Array(sigBuffer))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");

  if (sigHex !== v1Hash) throw new Error("Signature mismatch");

  return JSON.parse(payload);
}

// ── HTTP Action: Create Stripe Checkout Session ───────────────────────────────
export const createCheckoutSession = httpAction(async (ctx, _request) => {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401 });
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const priceId = process.env.STRIPE_PRICE_ID; // $5/mo price ID
  const appUrl = process.env.CONVEX_SITE_URL || "https://plate-71e84f88.viktor.space";

  if (!stripeSecretKey || !priceId) {
    return new Response(JSON.stringify({ error: "Stripe not configured" }), { status: 500 });
  }

  const profile = await ctx.runQuery(api.profiles.getProfile);

  // Build checkout params
  const params = new URLSearchParams({
    "mode": "subscription",
    "payment_method_collection": "always",
    "line_items[0][price]": priceId,
    "line_items[0][quantity]": "1",
    "subscription_data[trial_period_days]": "7",
    "success_url": `${appUrl}/?subscription=success`,
    "cancel_url": `${appUrl}/settings?subscription=cancel`,
    "metadata[userId]": userId,
  });

  if ((profile as any)?.stripeCustomerId) {
    params.append("customer", (profile as any).stripeCustomerId);
  } else if ((profile as any)?.email) {
    params.append("customer_email", (profile as any).email);
  }

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${stripeSecretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const err = await res.json();
    console.error("Stripe checkout error:", err);
    return new Response(JSON.stringify({ error: "Stripe error" }), { status: 500 });
  }

  const session = await res.json();
  return new Response(JSON.stringify({ url: session.url }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});

// ── HTTP Action: Create Stripe Billing Portal Session ─────────────────────────
export const createPortalSession = httpAction(async (ctx, _request) => {
  const userId = await getAuthUserId(ctx);
  if (!userId) {
    return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401 });
  }

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const appUrl = process.env.CONVEX_SITE_URL || "https://plate-71e84f88.viktor.space";

  if (!stripeSecretKey) {
    return new Response(JSON.stringify({ error: "Stripe not configured" }), { status: 500 });
  }

  const profile = await ctx.runQuery(api.profiles.getProfile);
  const customerId = (profile as any)?.stripeCustomerId;

  if (!customerId) {
    return new Response(JSON.stringify({ error: "No billing account found" }), { status: 400 });
  }

  const params = new URLSearchParams({
    "customer": customerId,
    "return_url": `${appUrl}/settings`,
  });

  const res = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${stripeSecretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!res.ok) {
    const err = await res.json();
    console.error("Stripe portal error:", err);
    return new Response(JSON.stringify({ error: "Stripe error" }), { status: 500 });
  }

  const session = await res.json();
  return new Response(JSON.stringify({ url: session.url }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});

// ── Internal helpers: read/write system config from DB ───────────────────────
export const getConfigValue = internalQuery({
  args: { key: v.string() },
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, { key }) => {
    const doc = await ctx.db.query("systemConfig").withIndex("by_key", q => q.eq("key", key)).first();
    return doc?.value ?? null;
  },
});

export const setConfigValue = internalMutation({
  args: { key: v.string(), value: v.string() },
  handler: async (ctx, { key, value }) => {
    const existing = await ctx.db.query("systemConfig").withIndex("by_key", q => q.eq("key", key)).first();
    if (existing) {
      await ctx.db.patch(existing._id, { value });
    } else {
      await ctx.db.insert("systemConfig", { key, value });
    }
  },
});

// ── Convex Action: Create Stripe Checkout Session (called via useAction) ──────
// planType: "premium_monthly" | "premium_annual" | "workout_monthly" | "workout_annual"
export const createCheckoutUrl = action({
  args: {
    planType: v.optional(v.union(
      v.literal("premium_monthly"),
      v.literal("premium_annual"),
      v.literal("workout_monthly"),
      v.literal("workout_annual"),
    )),
  },
  returns: v.string(),
  handler: async (ctx, { planType = "premium_monthly" }): Promise<string> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY ||
      await ctx.runQuery(internal.stripe.getConfigValue, { key: "STRIPE_SECRET_KEY" });
    const appUrl = "https://plate-71e84f88.viktor.space";

    if (!stripeSecretKey) throw new Error("Stripe not configured on this deployment");

    // Resolve price ID from env based on planType
    const priceIdMap: Record<string, string | undefined> = {
      premium_monthly: process.env.STRIPE_PRICE_PREMIUM_MONTHLY ?? "price_1TVO90ATRGLQsovCaitjYYSQ",
      premium_annual: process.env.STRIPE_PRICE_PREMIUM_ANNUAL ?? "price_1TVO91ATRGLQsovCHz8INjlB",
      workout_monthly: process.env.STRIPE_PRICE_WORKOUT_MONTHLY,
      workout_annual: process.env.STRIPE_PRICE_WORKOUT_ANNUAL,
    };

    const priceId = priceIdMap[planType] ||
      await ctx.runQuery(internal.stripe.getConfigValue, { key: "STRIPE_PRICE_ID" });

    if (!priceId) throw new Error(`No price ID configured for plan: ${planType}`);

    const profile = await ctx.runQuery(api.profiles.getProfile);

    // Workout add-on: no trial; Premium: 3-day trial
    const isPremium = planType.startsWith("premium");

    const params = new URLSearchParams({
      "mode": "subscription",
      "payment_method_collection": "always",
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": "1",
      "success_url": `${appUrl}/onboarding/welcome-done?plan=${planType}`,
      "cancel_url": `${appUrl}/onboarding/paywall`,
      "metadata[userId]": userId,
      "metadata[planType]": planType,
    });

    // 7-day trial for premium plans only
    if (isPremium) {
      params.append("subscription_data[trial_period_days]", "7");
    }

    if ((profile as any)?.stripeCustomerId) {
      params.append("customer", (profile as any).stripeCustomerId);
    } else if ((profile as any)?.email) {
      params.append("customer_email", (profile as any).email);
    }

    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!res.ok) {
      const err = await res.json();
      console.error("Stripe checkout error:", err);
      throw new Error("Failed to create checkout session");
    }

    const session = await res.json();
    return session.url;
  },
});

// ── Convex Action: Create Stripe Billing Portal URL (called via useAction) ────
export const createPortalUrl = action({
  args: {},
  returns: v.string(),
  handler: async (ctx): Promise<string> => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY ||
      await ctx.runQuery(internal.stripe.getConfigValue, { key: "STRIPE_SECRET_KEY" });
    const appUrl = "https://plate-71e84f88.viktor.space";

    if (!stripeSecretKey) {
      throw new Error("Stripe not configured on this deployment");
    }

    const profile = await ctx.runQuery(api.profiles.getProfile);
    const customerId = (profile as any)?.stripeCustomerId;

    if (!customerId) throw new Error("No billing account found");

    const params = new URLSearchParams({
      "customer": customerId,
      "return_url": `${appUrl}/settings`,
    });

    const res = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!res.ok) {
      const err = await res.json();
      console.error("Stripe portal error:", err);
      throw new Error("Failed to create portal session");
    }

    const session = await res.json();
    return session.url;
  },
});
