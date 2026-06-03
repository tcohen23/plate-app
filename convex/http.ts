import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { auth } from "./auth";
import { stripeWebhook } from "./stripe";
import { getAuthUserId } from "@convex-dev/auth/server";
import { api } from "./_generated/api";

const http = httpRouter();
auth.addHttpRoutes(http);

const ALLOWED_ORIGIN = process.env.SITE_URL || "https://plate-71e84f88.viktor.space";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

// CORS preflight for checkout session
http.route({
  path: "/api/create-checkout-session",
  method: "OPTIONS",
  handler: httpAction(async (_ctx, _request) => {
    return new Response(null, {
      status: 204,
      headers: { ...corsHeaders(), "Access-Control-Max-Age": "86400" },
    });
  }),
});

// CORS preflight for portal session
http.route({
  path: "/api/create-portal-session",
  method: "OPTIONS",
  handler: httpAction(async (_ctx, _request) => {
    return new Response(null, {
      status: 204,
      headers: { ...corsHeaders(), "Access-Control-Max-Age": "86400" },
    });
  }),
});

// Stripe checkout — creates a new subscription checkout session
http.route({
  path: "/api/create-checkout-session",
  method: "POST",
  handler: httpAction(async (ctx, _request) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders() },
      });
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const priceId = process.env.STRIPE_PRICE_ID;
    const appUrl = process.env.SITE_URL || "https://plate-71e84f88.viktor.space";

    if (!stripeSecretKey || !priceId) {
      return new Response(JSON.stringify({ error: "Stripe not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders() },
      });
    }

    const profile = await ctx.runQuery(api.profiles.getProfile);

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
      return new Response(JSON.stringify({ error: "Stripe error", detail: err }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders() },
      });
    }

    const session = await res.json();
    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders() },
    });
  }),
});

// Stripe portal — lets users manage/cancel subscription
http.route({
  path: "/api/create-portal-session",
  method: "POST",
  handler: httpAction(async (ctx, _request) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders() },
      });
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const appUrl = process.env.SITE_URL || "https://plate-71e84f88.viktor.space";

    if (!stripeSecretKey) {
      return new Response(JSON.stringify({ error: "Stripe not configured" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders() },
      });
    }

    const profile = await ctx.runQuery(api.profiles.getProfile);
    const customerId = (profile as any)?.stripeCustomerId;

    if (!customerId) {
      return new Response(JSON.stringify({ error: "No billing account found" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders() },
      });
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
      return new Response(JSON.stringify({ error: "Stripe error" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders() },
      });
    }

    const session = await res.json();
    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders() },
    });
  }),
});

// Stripe webhook — handles subscription lifecycle events
http.route({
  path: "/webhooks/stripe",
  method: "POST",
  handler: stripeWebhook,
});

// Seed Stripe config into DB (bootstrap endpoint, protected by static token)
http.route({
  path: "/api/seed-stripe-config",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const SEED_TOKEN = "plate-stripe-seed-2026";
    let body: any;
    try { body = await request.json(); } catch { body = {}; }
    if (body.token !== SEED_TOKEN) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }
    const { key, value } = body;
    if (!key || !value) {
      return new Response(JSON.stringify({ error: "Missing key or value" }), { status: 400 });
    }
    await ctx.runMutation(internal.stripe.setConfigValue, { key, value });
    return new Response(JSON.stringify({ ok: true, key }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// Admin: reset rate limit for an email so they can re-try OTP verification
// Protected by a secret token
http.route({
  path: "/api/admin/reset-rate-limit",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const ADMIN_TOKEN = "plate-admin-reset-2026";
    let body: any;
    try { body = await request.json(); } catch { body = {}; }
    if (body.token !== ADMIN_TOKEN) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }
    const { email } = body;
    if (!email) {
      return new Response(JSON.stringify({ error: "Missing email" }), { status: 400 });
    }
    // Delete rate limit record for this email
    const limit = await ctx.runQuery(internal.authHelpers.getRateLimit, { email });
    if (limit) {
      await ctx.runMutation(internal.authHelpers.deleteRateLimit, { id: limit });
    }
    // Also extend any existing OTP code expiry
    const extended = await ctx.runMutation(internal.authHelpers.extendVerificationCode, { email });
    return new Response(JSON.stringify({ ok: true, rateResetDone: !!limit, codeExtended: extended }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// ── Admin: recover missed Stripe subscriptions (for webhook outage recovery) ──
http.route({
  path: "/api/admin/recover-subscription",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const ADMIN_TOKEN = "plate-admin-reset-2026";
    let body: any;
    try { body = await request.json(); } catch { body = {}; }
    if (body.token !== ADMIN_TOKEN) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }
    const { email, stripeCustomerId, stripeSubscriptionId, status, trialEnd } = body;
    if (!email || !stripeCustomerId || !stripeSubscriptionId || !status) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400 });
    }
    const result = await ctx.runMutation(internal.stripe.recoverSubscriptionByEmail, {
      email, stripeCustomerId, stripeSubscriptionId, status,
      trialEnd: trialEnd ?? undefined,
    });
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// ── Viktor agent: unauthenticated media upload for social posting ──
// Secret key to prevent abuse
const VIKTOR_UPLOAD_SECRET = process.env.VIKTOR_UPLOAD_SECRET || "viktor-plate-upload-2026";

http.route({
  path: "/api/viktor-upload-media",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = request.headers.get("x-viktor-secret");
    if (secret !== VIKTOR_UPLOAD_SECRET) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }
    try {
      const blob = await request.blob();
      const storageId = await ctx.storage.store(blob);
      const url = await ctx.storage.getUrl(storageId);
      return new Response(JSON.stringify({ storageId, url }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
    }
  }),
});

export default http;

// ── Admin: set user as owner by email ────────────────────────────────────────
http.route({
  path: "/api/admin/set-owner",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const ADMIN_TOKEN = "plate-admin-reset-2026";
    let body: any;
    try { body = await request.json(); } catch { body = {}; }
    if (body.token !== ADMIN_TOKEN) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }
    const { email } = body;
    if (!email) {
      return new Response(JSON.stringify({ error: "Missing email" }), { status: 400 });
    }
    const result = await ctx.runMutation(internal.admin.setOwnerByEmail, { email });
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

// ── Admin: grant premium by email (searches users + authAccounts) ─────────────
http.route({
  path: "/api/admin/grant-premium",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const ADMIN_TOKEN = "plate-admin-reset-2026";
    let body: any;
    try { body = await request.json(); } catch { body = {}; }
    if (body.token !== ADMIN_TOKEN) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }
    const { email, stripeCustomerId, stripeSubscriptionId, status, trialEnd } = body;
    if (!email) {
      return new Response(JSON.stringify({ error: "Missing email" }), { status: 400 });
    }

    const user = await ctx.runQuery(internal.stripe.findUserByEmail, { email });
    if (!user) {
      return new Response(JSON.stringify({ ok: false, reason: "user_not_found" }), {
        status: 404, headers: { "Content-Type": "application/json" },
      });
    }

    const result = await ctx.runMutation(internal.stripe.grantPremiumToUser, {
      userId: user._id,
      stripeCustomerId: stripeCustomerId || undefined,
      stripeSubscriptionId: stripeSubscriptionId || undefined,
      subscriptionStatus: status || "trialing",
      trialEnd: trialEnd || undefined,
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});
