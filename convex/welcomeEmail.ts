import { getAuthUserId } from "@convex-dev/auth/server";
import { action, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { APP_NAME } from "./constants";

declare const process: { env: Record<string, string | undefined> };

/* ══════════════════════════════════════════════════════════════════════════
   INTERNAL HELPERS
   ══════════════════════════════════════════════════════════════════════════ */

/** Get a user's email from authAccounts */
export const _getUserEmail = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const accounts = await ctx.db
      .query("authAccounts")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();
    return accounts.find((a) => a.providerAccountId)?.providerAccountId ?? null;
  },
});

/** Get a user's profile by userId */
export const _getProfileByUserId = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db
      .query("profiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
  },
});

/** Log an email to the emailLogs table */
export const _logEmail = internalMutation({
  args: {
    recipientUserId: v.optional(v.id("users")),
    recipientEmail: v.string(),
    recipientName: v.string(),
    subject: v.string(),
    emailType: v.string(),
    sentByUserId: v.optional(v.id("users")),
    previewHtml: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("emailLogs", {
      ...args,
      sentAt: Date.now(),
    });
  },
});

/* ══════════════════════════════════════════════════════════════════════════
   EMAIL SENDING (shared helper)
   ══════════════════════════════════════════════════════════════════════════ */

async function sendEmailViaAPI({
  toEmail,
  subject,
  htmlContent,
  textContent,
  emailType,
}: {
  toEmail: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  emailType: string;
}) {
  const apiUrl = process.env.VIKTOR_SPACES_API_URL;
  const projectName = process.env.VIKTOR_SPACES_PROJECT_NAME;
  const projectSecret = process.env.VIKTOR_SPACES_PROJECT_SECRET;

  if (!apiUrl || !projectName || !projectSecret) {
    throw new Error("Viktor Spaces environment variables not configured");
  }

  const response = await fetch(`${apiUrl}/api/viktor-spaces/send-email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      project_name: projectName,
      project_secret: projectSecret,
      to_email: toEmail,
      subject,
      html_content: htmlContent,
      text_content: textContent,
      email_type: emailType,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send email: ${error}`);
  }

  const result = (await response.json()) as { success: boolean; error?: string };
  if (!result.success) {
    throw new Error(`Email failed: ${result.error}`);
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   SPLIT TEST VARIANT SYSTEM
   Variants A / B / C — same copy, different visual treatment.
   Assigned once per user based on userId hash. Never changes.

   A — Dark Classic:  #000000 bg, #52B788 green button, dark card
   B — Deep Forest:   #0D2318 bg, #A7F3D0 mint button, dark green card
   C — Cream Light:   #FAF8F5 bg, #1B4332 deep green button, white card
   ══════════════════════════════════════════════════════════════════════════ */

type Variant = "A" | "B" | "C";

interface VariantStyle {
  bodyBg: string;
  cardBg: string;
  cardBorder: string;
  innerBg: string;
  innerBorder: string;
  headingColor: string;
  bodyText: string;
  subText: string;
  btnBg: string;
  btnText: string;
  footerText: string;
  signColor: string;
  checkColor: string;
  badgeBg: string;
  badgeColor: string;
  logoTextColor: string;
}

const VARIANT_STYLES: Record<Variant, VariantStyle> = {
  A: {
    bodyBg: "#000000",
    cardBg: "#0f0f0f",
    cardBorder: "#1e1e1e",
    innerBg: "#141414",
    innerBorder: "#222222",
    headingColor: "#ffffff",
    bodyText: "#aaaaaa",
    subText: "#888888",
    btnBg: "#52B788",
    btnText: "#000000",
    footerText: "#3a3a3a",
    signColor: "#555555",
    checkColor: "#52B788",
    badgeBg: "#52B78820",
    badgeColor: "#52B788",
    logoTextColor: "#ffffff",
  },
  B: {
    bodyBg: "#0D2318",
    cardBg: "#162D22",
    cardBorder: "#1E4030",
    innerBg: "#1A3828",
    innerBorder: "#255040",
    headingColor: "#ffffff",
    bodyText: "#B7DBC8",
    subText: "#7DAF90",
    btnBg: "#A7F3D0",
    btnText: "#0D2318",
    footerText: "#3D6B52",
    signColor: "#5F9A75",
    checkColor: "#A7F3D0",
    badgeBg: "#1B4332",
    badgeColor: "#A7F3D0",
    logoTextColor: "#ffffff",
  },
  C: {
    bodyBg: "#FAF8F5",
    cardBg: "#FFFFFF",
    cardBorder: "#E8E4DE",
    innerBg: "#F5F2EE",
    innerBorder: "#E0DBD4",
    headingColor: "#111111",
    bodyText: "#444444",
    subText: "#777777",
    btnBg: "#1B4332",
    btnText: "#ffffff",
    footerText: "#aaaaaa",
    signColor: "#888888",
    checkColor: "#52B788",
    badgeBg: "#52B78815",
    badgeColor: "#1B4332",
    logoTextColor: "#111111",
  },
};

/** Deterministically assign A/B/C based on userId — 1/3 split, permanent */
function assignVariant(userId: string): Variant {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    hash = (hash * 31 + userId.charCodeAt(i)) & 0xffffffff;
  }
  const bucket = Math.abs(hash) % 3;
  return (["A", "B", "C"] as Variant[])[bucket];
}

/* ══════════════════════════════════════════════════════════════════════════
   SHARED EMAIL SHELL — renders full HTML email for any variant
   ══════════════════════════════════════════════════════════════════════════ */

const LOGO_URL = "https://plate-71e84f88.viktor.space/plate-logo.png";
const APP_URL = "https://plate-71e84f88.viktor.space";

function emailShellVariant(bodyContent: string, v: VariantStyle): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background:${v.bodyBg};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${v.bodyBg};padding:48px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px;">

        <!-- Logo -->
        <tr><td align="center" style="padding-bottom:40px;">
          <table cellpadding="0" cellspacing="0" border="0"><tr>
            <td align="center" valign="middle">
              <img src="${LOGO_URL}" alt="Plate" width="52" height="52" style="display:block;border-radius:13px;"/>
            </td>
            <td style="padding-left:14px;vertical-align:middle;">
              <div style="color:${v.logoTextColor};font-size:26px;font-weight:700;letter-spacing:0.12em;font-family:Georgia,serif;">PLATE</div>
              <div style="font-size:9px;letter-spacing:3px;text-transform:uppercase;color:#52B788;margin-top:3px;">Nutrition, Perfected.</div>
            </td>
          </tr></table>
        </td></tr>

        <!-- Card -->
        <tr><td style="background:${v.cardBg};border-radius:20px;padding:40px 36px;border:1px solid ${v.cardBorder};">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            ${bodyContent}
          </table>
        </td></tr>

        <!-- Footer -->
        <tr><td align="center" style="padding-top:32px;">
          <p style="margin:0;color:${v.footerText};font-size:12px;line-height:2;">&copy; 2026 Plate &nbsp;&middot;&nbsp; All rights reserved.</p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function heading(text: string, v: VariantStyle, size = 26, bottom = 28): string {
  return `<tr><td style="padding-bottom:${bottom}px;"><p style="margin:0;color:${v.headingColor};font-size:${size}px;font-weight:700;line-height:1.3;">${text}</p></td></tr>`;
}

function para(text: string, v: VariantStyle, colorKey: keyof VariantStyle = "bodyText", size = 15, bottom = 18): string {
  return `<tr><td style="padding-bottom:${bottom}px;"><p style="margin:0;color:${v[colorKey] as string};font-size:${size}px;line-height:1.75;">${text}</p></td></tr>`;
}

function checks(items: string[], v: VariantStyle): string {
  const rows = items.map(item =>
    `<tr><td style="padding:13px 18px;border-bottom:1px solid ${v.innerBorder};">
      <table cellpadding="0" cellspacing="0" border="0"><tr>
        <td valign="top" style="padding-right:12px;width:18px;"><span style="color:${v.checkColor};font-size:14px;font-weight:700;">&#10003;</span></td>
        <td><span style="color:${v.bodyText};font-size:14px;line-height:1.6;">${item}</span></td>
      </tr></table>
    </td></tr>`
  ).join("");
  return `<tr><td style="padding-bottom:28px;"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${v.innerBg};border-radius:14px;border:1px solid ${v.innerBorder};overflow:hidden;">${rows}</table></td></tr>`;
}

function cta(label: string, v: VariantStyle, url = APP_URL): string {
  return `<tr><td align="center" style="padding-top:12px;padding-bottom:4px;">
    <a href="${url}" style="display:inline-block;background:${v.btnBg};color:${v.btnText};font-size:15px;font-weight:700;padding:16px 40px;border-radius:14px;text-decoration:none;letter-spacing:0.03em;">${label} &#8594;</a>
  </td></tr>`;
}

function badge(text: string, v: VariantStyle): string {
  return `<tr><td style="padding-bottom:20px;"><span style="display:inline-block;background:${v.badgeBg};color:${v.badgeColor};font-size:11px;font-weight:700;letter-spacing:0.12em;padding:5px 16px;border-radius:100px;text-transform:uppercase;">${text}</span></td></tr>`;
}

function sign(v: VariantStyle): string {
  return `<tr><td style="padding-top:28px;"><p style="margin:0;color:${v.signColor};font-size:13px;line-height:1.8;">Plate Team</p></td></tr>`;
}

/* ══════════════════════════════════════════════════════════════════════════
   WELCOME EMAIL (unchanged — not in split test funnel)
   ══════════════════════════════════════════════════════════════════════════ */

function welcomeEmailHtml(name: string, goalLabel: string, cals: number | null, protein: number | null, carbs: number | null, fat: number | null): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Welcome to Plate</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:48px 20px 40px;">
    <div style="text-align:center;margin-bottom:36px;">
      <div style="display:inline-block;width:60px;height:60px;border-radius:16px;background:#52B788;line-height:60px;text-align:center;margin-bottom:14px;">
        <span style="font-family:Georgia,serif;font-size:30px;color:#0a2018;font-weight:bold;">P</span>
      </div>
      <div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#ffffff;letter-spacing:3px;text-transform:uppercase;">PLATE</div>
      <div style="font-size:10px;letter-spacing:2.5px;text-transform:uppercase;color:#555;margin-top:5px;">Nutrition, Perfected.</div>
    </div>
    <div style="background:#141414;border-radius:20px;padding:36px 32px;border:1px solid #2a2a2a;margin-bottom:20px;">
      <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:28px;color:#ffffff;margin:0 0 10px 0;font-weight:normal;">Your plan is live, ${name}.</h1>
      <p style="color:#888;font-size:15px;line-height:1.7;margin:0 0 28px 0;">We built everything around your body and your goal. Open the app and your meal plan is already waiting.</p>
      <div style="background:#0a0a0a;border-radius:14px;padding:24px;margin-bottom:28px;border:1px solid #222;">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#555;margin-bottom:10px;">Daily Target &middot; ${goalLabel}</div>
        <div style="font-family:Georgia,'Times New Roman',serif;font-size:44px;color:#52B788;margin-bottom:18px;line-height:1;">${cals ?? "—"}<span style="font-size:15px;font-family:sans-serif;color:#555;margin-left:6px;">kcal</span></div>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:12px 0;border-top:1px solid #222;width:33%;"><div style="font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:#555;margin-bottom:4px;">Protein</div><div style="font-family:Georgia,serif;font-size:22px;color:#ffffff;">${protein ?? "—"}g</div></td>
            <td style="padding:12px 0;border-top:1px solid #222;width:33%;text-align:center;"><div style="font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:#555;margin-bottom:4px;">Carbs</div><div style="font-family:Georgia,serif;font-size:22px;color:#ffffff;">${carbs ?? "—"}g</div></td>
            <td style="padding:12px 0;border-top:1px solid #222;width:33%;text-align:right;"><div style="font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:#555;margin-bottom:4px;">Fat</div><div style="font-family:Georgia,serif;font-size:22px;color:#ffffff;">${fat ?? "—"}g</div></td>
          </tr>
        </table>
      </div>
      <div style="margin-bottom:28px;">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#555;margin-bottom:16px;">What to do next</div>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:8px 0;vertical-align:top;width:28px;"><span style="display:inline-block;width:20px;height:20px;border-radius:50%;background:#52B788;text-align:center;line-height:20px;font-size:11px;color:#0a2018;font-weight:bold;">1</span></td><td style="padding:8px 0;"><span style="color:#cccccc;font-size:14px;line-height:1.6;">Open the <strong style="color:#ffffff;">Today tab</strong> and check out your personalized meal plan</span></td></tr>
          <tr><td style="padding:8px 0;vertical-align:top;width:28px;"><span style="display:inline-block;width:20px;height:20px;border-radius:50%;background:#52B788;text-align:center;line-height:20px;font-size:11px;color:#0a2018;font-weight:bold;">2</span></td><td style="padding:8px 0;"><span style="color:#cccccc;font-size:14px;line-height:1.6;">Head to <strong style="color:#ffffff;">Grocery</strong> and your shopping list is already generated</span></td></tr>
          <tr><td style="padding:8px 0;vertical-align:top;width:28px;"><span style="display:inline-block;width:20px;height:20px;border-radius:50%;background:#52B788;text-align:center;line-height:20px;font-size:11px;color:#0a2018;font-weight:bold;">3</span></td><td style="padding:8px 0;"><span style="color:#cccccc;font-size:14px;line-height:1.6;">Log meals from the <strong style="color:#ffffff;">Track tab</strong> or scan barcodes to stay on target</span></td></tr>
          <tr><td style="padding:8px 0;vertical-align:top;width:28px;"><span style="display:inline-block;width:20px;height:20px;border-radius:50%;background:#52B788;text-align:center;line-height:20px;font-size:11px;color:#0a2018;font-weight:bold;">4</span></td><td style="padding:8px 0;"><span style="color:#cccccc;font-size:14px;line-height:1.6;">Add Plate to your <strong style="color:#ffffff;">home screen</strong> for a native app feel</span></td></tr>
        </table>
      </div>
      <a href="${APP_URL}/dashboard" style="display:block;background:#52B788;color:#0a2018;text-align:center;text-decoration:none;font-size:15px;font-weight:600;padding:16px 24px;border-radius:12px;letter-spacing:0.5px;">Open Plate</a>
    </div>
    <div style="text-align:center;padding:0 20px;">
      <p style="color:#444;font-size:12px;line-height:1.7;margin:0;">You signed up for Plate &mdash; we're glad you're here.<br>Questions? Just reply to this email.</p>
    </div>
  </div>
</body>
</html>`;
}

/* ══════════════════════════════════════════════════════════════════════════
   PREMIUM UPSELL — 4-week funnel, 3 split test variants
   Weekly (Tuesdays 10am EST). Targets free users only.
   Pause: user upgrades to premium → stop sequence.
   Resume: if user was free, fell off, we resume at stored upsellCount index.
   ══════════════════════════════════════════════════════════════════════════ */

interface UpsellPitch {
  subject: string;
  hookLine: string;
  body: string;
  bullets: string[];
  cta: string;
}

const PREMIUM_PITCHES: UpsellPitch[] = [
  // Week 1 — Meal plan hook
  {
    subject: "Your nutrition plan is already built. You just need to unlock it.",
    hookLine: "Your nutrition plan is already built.",
    body: "Plate Premium gives you a full week of meals planned around your exact macros, your food preferences, and your goal. No templates, no guesswork. A real plan built for your body, refreshed every week automatically.",
    bullets: [
      "AI meal plans matched to your calorie and macro targets",
      "Weekly grocery list generated automatically",
      "Personalized workout plans synced to your nutrition goal",
      "Barcode and meal scanning so logging takes seconds",
    ],
    cta: "Start your free trial",
  },
  // Week 2 — Tracking ease hook
  {
    subject: "Tracking your nutrition should not feel like a second job.",
    hookLine: "Tracking your nutrition should not feel like a second job.",
    body: "Plate fixes that. Log a meal in seconds with a barcode scan or a photo. Your macro ring updates live. At the end of the day you actually know what you ate and where you stood. No spreadsheets, no manual entry.",
    bullets: [
      "Barcode scanner for packaged foods",
      "AI photo logging from your camera",
      "Live macro tracking throughout the day",
      "Automated grocery list every week",
    ],
    cta: "Try it free for 7 days",
  },
  // Week 3 — Value hook
  {
    subject: "A personal trainer and nutritionist used to cost hundreds a month.",
    hookLine: "A personal trainer and nutritionist used to cost hundreds a month.",
    body: "Plate Premium gives you both in one app, free to try. Workout plans that sync with your nutrition targets. Meal plans that adapt to your goal. All in one place, built around your body from day one.",
    bullets: [
      "Personalized workout plans matched to your diet",
      "Full week of meals built around your body",
      "Barcode and meal scanning for instant logging",
      "Progress tracking that shows what is actually working",
    ],
    cta: "Start free trial",
  },
  // Week 4 — Habit/system hook
  {
    subject: "You set a goal. Plate helps you stay on it every day.",
    hookLine: "You set a goal. Plate helps you stay on it every single day.",
    body: "Premium users get meal plans, workout programs, grocery lists, and progress tracking all working together. Not just information but a full system that does the thinking for you so you can just execute.",
    bullets: [
      "Daily streak tracking to build the habit",
      "Weekly adherence charts so you can see your progress",
      "Everything synced to your specific goal",
      "Scan meals and barcodes in seconds",
    ],
    cta: "Get Plate Premium",
  },
];

function premiumUpsellHtml(_name: string, pitch: UpsellPitch, variant: Variant): string {
  const vs = VARIANT_STYLES[variant];
  const body = `
    ${heading(pitch.hookLine, vs, 24, 20)}
    ${para(pitch.body, vs, "bodyText", 15, 22)}
    ${checks(pitch.bullets, vs)}
    ${cta(pitch.cta, vs, `${APP_URL}/settings`)}
    ${sign(vs)}
  `;
  return emailShellVariant(body, vs);
}

/* ══════════════════════════════════════════════════════════════════════════
   RE-ENGAGEMENT — 4-week funnel, 3 split test variants
   Daily check: premium users inactive 3+ days. Max once per 7 days.
   Pause: user logs food (comes back → lastLogDate < 3 days).
   Resume: next time they go inactive 3+ days, pick up at reEngagementCount.
   ══════════════════════════════════════════════════════════════════════════ */

interface FeatureSpotlight {
  emoji: string;
  title: string;
  tagline: string;
  bullets: string[];
  cta: string;
}

// 4 spotlight features for 4-week re-engagement funnel
const RE_ENGAGEMENT_FEATURES: FeatureSpotlight[] = [
  {
    emoji: "🥗",
    title: "AI Meal Plans built for your body",
    tagline: "Plate builds you a full week of meals every week based on your exact calorie and macro targets. Every meal fits your goal. You do not have to think about what to eat.",
    bullets: [
      "New plan generated every Monday automatically",
      "Swap any meal you do not like in one tap",
      "Grocery list created straight from your plan",
    ],
    cta: "Open your meal plan",
  },
  {
    emoji: "📊",
    title: "Macro Tracking that takes seconds",
    tagline: "Log a meal with a barcode scan or snap a photo and let AI do the rest. Your macro ring updates live. No manual entry, no guesswork.",
    bullets: [
      "Barcode scanner for packaged foods",
      "AI photo logging from your camera",
      "Live calorie and macro ring updates as you go",
    ],
    cta: "Log today's meals",
  },
  {
    emoji: "💪",
    title: "Workout Plans matched to your nutrition",
    tagline: "Your workouts and your diet should work together. Plate's workout plans are built to match your goal so your training and nutrition are aligned from day one.",
    bullets: [
      "Personalized programs based on your fitness goal",
      "Beginner through advanced splits",
      "Synced with your daily calorie and macro targets",
    ],
    cta: "View your workout plan",
  },
  {
    emoji: "🛒",
    title: "Smart Grocery Lists with zero thinking",
    tagline: "Your weekly meal plan automatically generates a complete organized grocery list. Everything grouped by section. Just shop and cook.",
    bullets: [
      "Auto-generated from your weekly meal plan",
      "Organized by grocery section",
      "Check off items as you shop",
    ],
    cta: "View your grocery list",
  },
];

function reEngagementHtml(name: string, feature: FeatureSpotlight, variant: Variant): string {
  const vs = VARIANT_STYLES[variant];
  const body = `
    ${badge("Feature Spotlight", vs)}
    ${heading(feature.title, vs, 22, 16)}
    ${para(`Hey ${name} — it has been a few days. Come back and check this out.`, vs, "subText", 14, 8)}
    ${para(feature.tagline, vs, "bodyText", 15, 22)}
    ${checks(feature.bullets, vs)}
    ${cta(feature.cta, vs)}
    ${sign(vs)}
  `;
  return emailShellVariant(body, vs);
}

/* ══════════════════════════════════════════════════════════════════════════
   ONBOARDING REMINDER — 4-week funnel (4 emails, every 5 days), 3 variants
   Targets users with onboardingComplete !== true.
   Pause/stop: when onboardingComplete becomes true, stop permanently.
   Resume: if user created account, hit obstacle, left — resume at stored count.
   Max: 4 emails. After 4th, sequence ends (do not loop).
   ══════════════════════════════════════════════════════════════════════════ */

interface OnboardingReminder {
  subject: string;
  headline: string;
  body: string;
  bullets: string[];
  cta: string;
}

const ONBOARDING_REMINDERS: OnboardingReminder[] = [
  // Day 5 — First nudge
  {
    subject: "You never finished setting up your Plate account",
    headline: "Your free meal plan is waiting.",
    body: "You started signing up for Plate a few days ago but never finished. That means your meal plan is just sitting there waiting and you have not gotten to use it yet. It takes two minutes to finish. We will build your first full week of meals the second you do, completely free.",
    bullets: [
      "Personalized daily meal plan",
      "Custom macro targets built around your body",
      "Weekly grocery list generated automatically",
      "Barcode and meal scanning ready to go",
      "100% free to start, no credit card needed",
    ],
    cta: "Finish setting up",
  },
  // Day 10 — Second nudge
  {
    subject: "Still thinking about it? Your Plate account is ready.",
    headline: "Still thinking about it?",
    body: "Your Plate account is ready and waiting for you. You just never finished the last few steps. Once you do, you will have a full personalized meal plan, your macro targets, and a grocery list ready instantly. All free, no card needed.",
    bullets: [
      "Full week of meals built around your goal",
      "Macro and calorie targets personalized to your body",
      "Grocery list auto-generated from your plan",
      "Barcode scanner and workout plans ready",
    ],
    cta: "Pick up where you left off",
  },
  // Day 15 — Third nudge (feature angle)
  {
    subject: "One thing you are missing out on right now",
    headline: "Here is what you are missing.",
    body: "Every Plate user who finishes setup gets a full meal plan, a grocery list, and macro targets built specifically for their body and goal. All of it is waiting for you. And it takes about two minutes to unlock.",
    bullets: [
      "AI meal plans refreshed every week automatically",
      "Personalized macros calculated for your exact body",
      "Workout programs synced to your nutrition goal",
      "Instant barcode and photo meal logging",
    ],
    cta: "Get your free meal plan",
  },
  // Day 20 — Final nudge
  {
    subject: "Last reminder from Plate — your account is ready",
    headline: "This is our last one.",
    body: "We will stop sending these after this. Your Plate account is ready and your meal plan will be built the second you finish setup. If you change your mind later you can always come back. But if you are still thinking about it this takes two minutes and costs nothing.",
    bullets: [
      "Full personalized meal plan, yours immediately",
      "Grocery list built from your plan automatically",
      "Macro targets for your goal and body",
      "Workout plans that match your nutrition",
    ],
    cta: "Finish setup",
  },
];

const MAX_ONBOARDING_REMINDERS = ONBOARDING_REMINDERS.length; // 4

function onboardingReminderHtml(_name: string, reminder: OnboardingReminder, variant: Variant): string {
  const vs = VARIANT_STYLES[variant];
  const body = `
    ${heading(reminder.headline, vs, 24, 20)}
    ${para(reminder.body, vs, "bodyText", 15, 22)}
    ${checks(reminder.bullets, vs)}
    ${cta(reminder.cta, vs, `${APP_URL}/signup`)}
    ${sign(vs)}
  `;
  return emailShellVariant(body, vs);
}

/* ══════════════════════════════════════════════════════════════════════════
   SUBSCRIPTION STARTED (unchanged — not in split test funnel)
   ══════════════════════════════════════════════════════════════════════════ */

function subscriptionStartedHtml(name: string, planLabel: string, trialEnd: string | null): string {
  const trialSection = trialEnd
    ? `<tr><td style="padding-bottom:24px;"><p style="margin:0;color:#a3a3a3;font-size:14px;line-height:1.6;">Your 7-day free trial runs until <strong style="color:#ffffff;">${trialEnd}</strong>. You won't be charged until then — cancel anytime in settings.</p></td></tr>`
    : `<tr><td style="padding-bottom:24px;"><p style="margin:0;color:#a3a3a3;font-size:14px;line-height:1.6;">Your subscription is now active. Thank you for supporting PLATE!</p></td></tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;">
        <tr><td align="center" style="padding-bottom:32px;">
          <table cellpadding="0" cellspacing="0" border="0"><tr>
            <td align="center" valign="middle"><img src="${LOGO_URL}" alt="Plate" width="40" height="40" style="display:block;border-radius:10px;"/></td>
            <td style="padding-left:10px;vertical-align:middle;"><span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:0.08em;">PLATE</span></td>
          </tr></table>
        </td></tr>
        <tr><td style="background:#1a1a1a;border-radius:16px;padding:32px;border:1px solid #2a2a2a;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr><td style="padding-bottom:8px;"><span style="display:inline-block;background:#52B788;color:#000;font-size:11px;font-weight:700;letter-spacing:0.1em;padding:4px 12px;border-radius:100px;text-transform:uppercase;">Premium Active</span></td></tr>
            <tr><td style="padding-bottom:16px;"><h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;">You are in, ${name}!</h1></td></tr>
            <tr><td style="padding-bottom:16px;"><p style="margin:0;color:#a3a3a3;font-size:14px;line-height:1.6;">Your <strong style="color:#ffffff;">${planLabel}</strong> plan is now active. Your personalized meal plans, AI nutrition tracking, and everything Plate has to offer is ready to go.</p></td></tr>
            ${trialSection}
            <tr><td style="padding-bottom:24px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#111;border-radius:12px;border:1px solid #2a2a2a;overflow:hidden;">
                <tr><td style="padding:16px 20px;border-bottom:1px solid #2a2a2a;"><span style="color:#52B788;font-size:13px;font-weight:600;">&#10003;</span><span style="color:#e5e5e5;font-size:13px;margin-left:10px;">Unlimited meal plan generation</span></td></tr>
                <tr><td style="padding:16px 20px;border-bottom:1px solid #2a2a2a;"><span style="color:#52B788;font-size:13px;font-weight:600;">&#10003;</span><span style="color:#e5e5e5;font-size:13px;margin-left:10px;">AI calorie and macro tracking</span></td></tr>
                <tr><td style="padding:16px 20px;border-bottom:1px solid #2a2a2a;"><span style="color:#52B788;font-size:13px;font-weight:600;">&#10003;</span><span style="color:#e5e5e5;font-size:13px;margin-left:10px;">Smart grocery lists</span></td></tr>
                <tr><td style="padding:16px 20px;"><span style="color:#52B788;font-size:13px;font-weight:600;">&#10003;</span><span style="color:#e5e5e5;font-size:13px;margin-left:10px;">Progress tracking and insights</span></td></tr>
              </table>
            </td></tr>
            <tr><td align="center"><a href="${APP_URL}" style="display:inline-block;background:#52B788;color:#000;font-size:15px;font-weight:700;padding:14px 32px;border-radius:12px;text-decoration:none;letter-spacing:0.01em;">Open Plate &#8594;</a></td></tr>
          </table>
        </td></tr>
        <tr><td align="center" style="padding-top:24px;"><p style="margin:0;color:#555;font-size:12px;">Questions? Reply to this email.<br/>&copy; 2026 Plate. All rights reserved.</p></td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/* ══════════════════════════════════════════════════════════════════════════
   WIN-BACK — 3-email sequence, 3 split test variants
   Daily check: targets users whose subscription is "canceled" or trial expired
   without converting, AND have been inactive for 30+ days.
   Cooldown: 14 days between emails. Hard stop after 3 emails.
   ══════════════════════════════════════════════════════════════════════════ */

interface WinBackEmail {
  subject: string;
  headline: string;
  body: string;
  bullets: string[];
  cta: string;
  badge: string;
}

const WIN_BACK_EMAILS: WinBackEmail[] = [
  // Email 1 — soft comeback, "things have changed"
  {
    subject: "It's been a while. Come see what's new.",
    headline: "It has been a while.",
    body: "You have not been on Plate in a bit and we just wanted to check in. Meal plans are smarter now. Tracking is faster. Workout plans sync with your nutrition targets automatically. Your account is exactly where you left it and your meal plan will rebuild the second you open the app.",
    bullets: [
      "AI meal plans built around your exact macros every week",
      "Log meals with a barcode scan or a photo in seconds",
      "Workout plans that match your nutrition goal",
      "Grocery list generated straight from your weekly plan",
    ],
    cta: "Come back to Plate",
    badge: "We miss you",
  },
  // Email 2 — progress framing, "you were so close"
  {
    subject: "You started something. That matters.",
    headline: "You started something.",
    body: "Most people never even get to the point of setting their goals and tracking what they eat. You did. That is not nothing. The gap between where you left off and where you want to be is smaller than you think and Plate will be here whenever you are ready to get back into it.",
    bullets: [
      "Your goal and macro targets are still saved",
      "Your streak picks back up the day you return",
      "Meal plan rebuilds automatically when you log back in",
      "No setup needed at all",
    ],
    cta: "Pick up where you left off",
    badge: "Still here for you",
  },
  // Email 3 — final, no pressure, leave the door open
  {
    subject: "Last one from us.",
    headline: "This is the last one.",
    body: "We are not going to keep sending these. But if you have been thinking about getting back on track with your nutrition then Plate is still here and your account is still active. Whenever you are ready, even if it is months from now, everything will be waiting for you.",
    bullets: [
      "Your account stays active indefinitely",
      "Meal plan rebuilds the moment you log back in",
      "Free trial still available if you want to restart Premium",
      "No commitment, cancel any time",
    ],
    cta: "Open Plate",
    badge: "No pressure",
  },
];

const MAX_WIN_BACK_EMAILS = WIN_BACK_EMAILS.length; // 3

function winBackHtml(name: string, wb: WinBackEmail, variant: Variant): string {
  const vs = VARIANT_STYLES[variant];
  const body = `
    ${badge(wb.badge, vs)}
    ${heading(wb.headline, vs, 24, 16)}
    ${para(`Hey ${name} —`, vs, "subText", 14, 6)}
    ${para(wb.body, vs, "bodyText", 15, 22)}
    ${checks(wb.bullets, vs)}
    ${cta(wb.cta, vs, APP_URL)}
    ${sign(vs)}
  `;
  return emailShellVariant(body, vs);
}

/* ══════════════════════════════════════════════════════════════════════════
   ADMIN EMAIL TEMPLATES (unchanged)
   ══════════════════════════════════════════════════════════════════════════ */

function emailShell(bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f8f8f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:32px;">
      <table align="center" cellpadding="0" cellspacing="0" style="margin:0 auto;">
        <tr>
          <td style="vertical-align:middle;padding-right:10px;"><img src="${LOGO_URL}" alt="Plate" width="36" height="36" style="display:block;border-radius:8px;"/></td>
          <td style="vertical-align:middle;"><span style="font-family:Georgia,'Times New Roman',serif;font-size:26px;color:#1a1a1a;font-style:italic;">Plate</span></td>
        </tr>
      </table>
      <div style="font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:#999;margin-top:6px;">Nutrition, Perfected.</div>
    </div>
    ${bodyContent}
    <div style="text-align:center;margin-top:28px;padding-top:20px;border-top:1px solid #e8e8e4;">
      <img src="${LOGO_URL}" alt="Plate" width="20" height="20" style="display:inline-block;border-radius:4px;vertical-align:middle;margin-right:6px;opacity:0.5;"/>
      <span style="color:#bbb;font-size:11px;vertical-align:middle;">Sent by ${APP_NAME}</span>
    </div>
  </div>
</body>
</html>`;
}

function adminUpgradeEmailHtml(name: string): string {
  return emailShell(`
    <div style="background:#ffffff;border-radius:16px;padding:32px;border:1px solid #e8e8e4;">
      <div style="text-align:center;margin-bottom:20px;"><div style="display:inline-block;width:56px;height:56px;border-radius:14px;background:#1a1a1a;line-height:56px;text-align:center;"><span style="font-size:28px;">🛡️</span></div></div>
      <h2 style="font-family:Georgia,'Times New Roman',serif;font-size:24px;color:#1a1a1a;margin:0 0 8px 0;font-weight:normal;text-align:center;">You are an Admin, ${name}</h2>
      <p style="color:#666;font-size:15px;line-height:1.6;margin:0 0 24px 0;text-align:center;">You have been granted admin access to ${APP_NAME}. You now have access to the admin dashboard.</p>
      <div style="background:#f8f8f6;border-radius:12px;padding:20px;margin-bottom:24px;">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#999;margin-bottom:12px;">What You Can Do</div>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:5px 0;vertical-align:top;width:24px;color:#1a1a1a;font-size:14px;">&#10022;</td><td style="padding:5px 0;color:#555;font-size:14px;line-height:1.5;">View all users, their stats and activity</td></tr>
          <tr><td style="padding:5px 0;vertical-align:top;width:24px;color:#1a1a1a;font-size:14px;">&#10022;</td><td style="padding:5px 0;color:#555;font-size:14px;line-height:1.5;">Reset user progress or data</td></tr>
          <tr><td style="padding:5px 0;vertical-align:top;width:24px;color:#1a1a1a;font-size:14px;">&#10022;</td><td style="padding:5px 0;color:#555;font-size:14px;line-height:1.5;">Manage admin access for the team</td></tr>
          <tr><td style="padding:5px 0;vertical-align:top;width:24px;color:#1a1a1a;font-size:14px;">&#10022;</td><td style="padding:5px 0;color:#555;font-size:14px;line-height:1.5;">Send emails to users</td></tr>
        </table>
      </div>
      <p style="color:#666;font-size:13px;line-height:1.5;margin:0;text-align:center;">Head to the Admin page from your dashboard to get started.</p>
    </div>
  `);
}

function customEmailHtml(recipientName: string, _subject: string, body: string): string {
  const htmlBody = body
    .split("\n")
    .map((line) => `<p style="color:#555;font-size:15px;line-height:1.7;margin:0 0 8px 0;">${line || "&nbsp;"}</p>`)
    .join("");
  return emailShell(`
    <div style="background:#ffffff;border-radius:16px;padding:32px;border:1px solid #e8e8e4;">
      <h2 style="font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#1a1a1a;margin:0 0 6px 0;font-weight:normal;">Hey ${recipientName},</h2>
      <div style="width:40px;height:2px;background:#1a1a1a;border-radius:1px;margin:16px 0 20px 0;"></div>
      ${htmlBody}
    </div>
  `);
}

/* ══════════════════════════════════════════════════════════════════════════
   PUBLIC ACTIONS
   ══════════════════════════════════════════════════════════════════════════ */

/** Send welcome email — called from frontend after onboarding completes */
export const sendWelcomeEmail = action({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const [profile, email] = await Promise.all([
      ctx.runQuery(internal.welcomeEmail._getProfileByUserId, { userId }),
      ctx.runQuery(internal.welcomeEmail._getUserEmail, { userId }),
    ]);

    if (!profile || !email) return { success: false, reason: "no-profile-or-email" };

    const goalLabels: Record<string, string> = {
      aggressive_cut: "Aggressive Cut", moderate_cut: "Moderate Cut",
      light_cut: "Light Cut", maintenance: "Maintenance",
      light_bulk: "Light Bulk", moderate_bulk: "Moderate Bulk",
      aggressive_bulk: "Aggressive Bulk",
    };
    const goalLabel = goalLabels[(profile as any).goal] || (profile as any).goal || "your goals";

    const name = (profile as any).name ?? (profile as any).firstName ?? "there";
    const subject = `Welcome to ${APP_NAME}, ${name}!`;
    const html = welcomeEmailHtml(
      name, goalLabel,
      (profile as any).targetCalories ?? null,
      (profile as any).targetProtein ?? null,
      (profile as any).targetCarbs ?? null,
      (profile as any).targetFat ?? null,
    );
    const text = `Welcome to ${APP_NAME}, ${name}!\n\nYour plan is live. Open the app: ${APP_URL}\n\nPlate Team`;

    await sendEmailViaAPI({ toEmail: email, subject, htmlContent: html, textContent: text, emailType: "welcome" });
    await ctx.runMutation(internal.welcomeEmail._logEmail, {
      recipientUserId: userId, recipientEmail: email, recipientName: name,
      subject, emailType: "welcome", previewHtml: "Your personalized meal plan is ready",
    });

    return { success: true };
  },
});

/** Internal action: send welcome email for a given userId (callable from other actions) */
export const sendWelcomeEmailForUser = internalAction({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const [profile, email] = await Promise.all([
      ctx.runQuery(internal.welcomeEmail._getProfileByUserId, { userId }),
      ctx.runQuery(internal.welcomeEmail._getUserEmail, { userId }),
    ]);

    if (!profile || !email) return { success: false, reason: "no-profile-or-email" };

    const name = (profile as any).name ?? (profile as any).firstName ?? "there";
    const goalLabels: Record<string, string> = {
      aggressive_cut: "Aggressive Cut", moderate_cut: "Moderate Cut",
      light_cut: "Light Cut", maintenance: "Maintenance",
      light_bulk: "Light Bulk", moderate_bulk: "Moderate Bulk",
      aggressive_bulk: "Aggressive Bulk",
    };
    const goalLabel = goalLabels[(profile as any).goal] || (profile as any).goal || "your goals";
    const subject = `Welcome to ${APP_NAME}, ${name}!`;
    const html = welcomeEmailHtml(
      name, goalLabel,
      (profile as any).targetCalories ?? null,
      (profile as any).targetProtein ?? null,
      (profile as any).targetCarbs ?? null,
      (profile as any).targetFat ?? null,
    );
    const text = `Welcome to ${APP_NAME}, ${name}!\n\nYour plan is live. Open the app: ${APP_URL}\n\nPlate Team`;

    await sendEmailViaAPI({ toEmail: email, subject, htmlContent: html, textContent: text, emailType: "welcome" });
    await ctx.runMutation(internal.welcomeEmail._logEmail, {
      recipientUserId: userId, recipientEmail: email, recipientName: name,
      subject, emailType: "welcome", previewHtml: "Your personalized meal plan is ready",
    });

    return { success: true };
  },
});

/** Send admin upgrade notification */
export const sendAdminUpgradeEmail = action({
  args: { targetUserId: v.id("users") },
  handler: async (ctx, { targetUserId }) => {
    const adminUserId = await getAuthUserId(ctx);
    if (!adminUserId) throw new Error("Not authenticated");

    const [profile, email] = await Promise.all([
      ctx.runQuery(internal.welcomeEmail._getProfileByUserId, { userId: targetUserId }),
      ctx.runQuery(internal.welcomeEmail._getUserEmail, { userId: targetUserId }),
    ]);

    if (!profile || !email) return { success: false, reason: "no-profile-or-email" };

    const name = (profile as any).name ?? (profile as any).firstName ?? "there";
    const subject = `You are now an admin on ${APP_NAME}`;
    const html = adminUpgradeEmailHtml(name);
    const text = `Hey ${name},\n\nYou have been granted admin access to ${APP_NAME}. Head to the Admin page from your dashboard.\n\nPlate Team`;

    await sendEmailViaAPI({ toEmail: email, subject, htmlContent: html, textContent: text, emailType: "admin_upgrade" });
    await ctx.runMutation(internal.welcomeEmail._logEmail, {
      recipientUserId: targetUserId, recipientEmail: email, recipientName: name,
      subject, emailType: "admin_upgrade", sentByUserId: adminUserId, previewHtml: "Admin access granted",
    });

    return { success: true };
  },
});

/** Send custom email from admin to any user */
export const sendCustomEmailToUser = action({
  args: { targetUserId: v.id("users"), subject: v.string(), body: v.string() },
  handler: async (ctx, { targetUserId, subject, body }) => {
    const adminUserId = await getAuthUserId(ctx);
    if (!adminUserId) throw new Error("Not authenticated");

    const adminProfile = await ctx.runQuery(internal.welcomeEmail._getProfileByUserId, { userId: adminUserId });
    const adminLevelOk = ["owner", "admin", "moderator"].includes((adminProfile as any)?.adminLevel ?? "");
    if (!(adminProfile as any)?.isAdmin && !adminLevelOk) throw new Error("Not authorized — admin only");

    const [profile, email] = await Promise.all([
      ctx.runQuery(internal.welcomeEmail._getProfileByUserId, { userId: targetUserId }),
      ctx.runQuery(internal.welcomeEmail._getUserEmail, { userId: targetUserId }),
    ]);

    if (!profile || !email) throw new Error("User has no profile or email");

    const name = (profile as any).name ?? (profile as any).firstName ?? "there";
    const fullSubject = `${subject} — ${APP_NAME}`;
    const html = customEmailHtml(name, subject, body);
    const text = `Hey ${name},\n\n${body}\n\nPlate Team`;

    await sendEmailViaAPI({ toEmail: email, subject: fullSubject, htmlContent: html, textContent: text, emailType: "custom" });
    await ctx.runMutation(internal.welcomeEmail._logEmail, {
      recipientUserId: targetUserId, recipientEmail: email, recipientName: name,
      subject: fullSubject, emailType: "custom", sentByUserId: adminUserId, previewHtml: body.slice(0, 120),
    });

    return { success: true };
  },
});

/** Send custom email to an arbitrary email address */
export const sendCustomEmailToAddress = action({
  args: { toEmail: v.string(), toName: v.string(), subject: v.string(), body: v.string() },
  handler: async (ctx, { toEmail, toName, subject, body }) => {
    const adminUserId = await getAuthUserId(ctx);
    if (!adminUserId) throw new Error("Not authenticated");

    const adminProfile = await ctx.runQuery(internal.welcomeEmail._getProfileByUserId, { userId: adminUserId });
    const adminLevelOk2 = ["owner", "admin", "moderator"].includes((adminProfile as any)?.adminLevel ?? "");
    if (!(adminProfile as any)?.isAdmin && !adminLevelOk2) throw new Error("Not authorized — admin only");

    const fullSubject = `${subject} — ${APP_NAME}`;
    const html = customEmailHtml(toName || "there", subject, body);
    const text = `Hey ${toName || "there"},\n\n${body}\n\nPlate Team`;

    await sendEmailViaAPI({ toEmail, subject: fullSubject, htmlContent: html, textContent: text, emailType: "custom" });
    await ctx.runMutation(internal.welcomeEmail._logEmail, {
      recipientEmail: toEmail, recipientName: toName || toEmail,
      subject: fullSubject, emailType: "custom", sentByUserId: adminUserId, previewHtml: body.slice(0, 120),
    });

    return { success: true };
  },
});

/* ══════════════════════════════════════════════════════════════════════════
   SUBSCRIPTION STARTED — fires from Stripe webhook
   ══════════════════════════════════════════════════════════════════════════ */

export const sendSubscriptionStartedEmail = internalAction({
  args: {
    stripeCustomerId: v.string(),
    planType: v.string(),
    trialEndTimestamp: v.optional(v.number()),
  },
  handler: async (ctx, { stripeCustomerId, planType, trialEndTimestamp }) => {
    const profile = await ctx.runQuery(internal.welcomeEmail._getProfileByStripeCustomerId, { stripeCustomerId });
    if (!profile) return { success: false, reason: "no-profile" };

    const email = await ctx.runQuery(internal.welcomeEmail._getUserEmail, { userId: (profile as any).userId });
    if (!email) return { success: false, reason: "no-email" };

    const planLabels: Record<string, string> = {
      premium_monthly: "Plate Premium (Monthly)",
      premium_annual: "Plate Premium (Annual)",
      workout_monthly: "Workout Add-On (Monthly)",
      workout_annual: "Workout Add-On (Annual)",
    };
    const planLabel = planLabels[planType] || planType;
    const name = (profile as any).name ?? (profile as any).firstName ?? "there";
    const trialEnd = trialEndTimestamp
      ? new Date(trialEndTimestamp).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
      : null;

    const subject = trialEnd
      ? `Your Plate free trial has started, ${name}!`
      : `Welcome to Plate Premium, ${name}!`;
    const html = subscriptionStartedHtml(name, planLabel, trialEnd);
    const text = `Welcome to Plate Premium!\n\nYour ${planLabel} plan is now active.${trialEnd ? `\n\nFree trial ends: ${trialEnd}` : ""}\n\nOpen Plate: ${APP_URL}\n\nPlate Team`;

    await sendEmailViaAPI({ toEmail: email, subject, htmlContent: html, textContent: text, emailType: "subscription_started" });
    await ctx.runMutation(internal.welcomeEmail._logEmail, {
      recipientUserId: (profile as any).userId, recipientEmail: email, recipientName: name,
      subject, emailType: "subscription_started",
      previewHtml: trialEnd ? `7-day trial active — ends ${trialEnd}` : `${planLabel} now active`,
    });

    return { success: true };
  },
});

/* ══════════════════════════════════════════════════════════════════════════
   CRON ACTIONS
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * RE-ENGAGEMENT — runs daily at 6am EST.
 * Targets premium users inactive 3+ days. Max once per 7 days per user.
 * Pause logic: if user logged activity in the past 3 days → skip (they came back).
 *   The counter is NOT incremented when skipped. So if they go inactive again,
 *   they pick up right where the sequence left off.
 * Sequence: 4 feature spotlights → loops after 4 (reEngagementCount % 4).
 */
export const sendReEngagementEmails = internalAction({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const threeDaysAgo = now - 3 * 24 * 60 * 60 * 1000;
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    const allStats = await ctx.runQuery(internal.welcomeEmail._getAllUserStatsForReEngagement, {});
    let sent = 0;

    for (const stats of allStats) {
      // PAUSE CHECK: skip if they logged recently (came back)
      if (stats.lastLogDate) {
        const lastLog = new Date(stats.lastLogDate).getTime();
        if (lastLog >= threeDaysAgo) continue; // still active — do not send, do not increment
      }

      // Cooldown: skip if sent within the last 7 days
      if ((stats as any).reEngagementSentAt && (stats as any).reEngagementSentAt >= sevenDaysAgo) continue;

      const profile = await ctx.runQuery(internal.welcomeEmail._getProfileByUserId, { userId: stats.userId });
      if (!profile) continue;

      // Only re-engage premium users
      const isPremium = (profile as any).isPremium === true ||
        ["owner", "admin", "friends_family"].includes((profile as any).adminLevel || "");
      if (!isPremium) continue;

      const email = await ctx.runQuery(internal.welcomeEmail._getUserEmail, { userId: stats.userId });
      if (!email || email.endsWith("@test.local")) continue;

      const name = (profile as any).name ?? (profile as any).firstName ?? "there";

      // Assign or read variant
      const variant: Variant = ((stats as any).emailVariant as Variant) || assignVariant(stats.userId);

      // Pick feature spotlight — resume where left off (never increments while paused)
      const reEngagementCount = (stats as any).reEngagementCount ?? 0;
      const feature = RE_ENGAGEMENT_FEATURES[reEngagementCount % RE_ENGAGEMENT_FEATURES.length];

      const subject = `${name}, have you tried this in Plate? ${feature.emoji}`;
      const html = reEngagementHtml(name, feature, variant);
      const text = `Hey ${name},\n\nSpotlight: ${feature.title}\n\n${feature.tagline}\n\n${feature.bullets.join("\n")}\n\nOpen Plate: ${APP_URL}\n\nPlate Team`;

      try {
        await sendEmailViaAPI({ toEmail: email, subject, htmlContent: html, textContent: text, emailType: "re_engagement" });
        await ctx.runMutation(internal.welcomeEmail._logEmail, {
          recipientUserId: stats.userId, recipientEmail: email, recipientName: name,
          subject, emailType: "re_engagement", previewHtml: `Feature spotlight: ${feature.title}`,
        });
        await ctx.runMutation(internal.welcomeEmail._markReEngagementSent, {
          userStatsId: stats._id, sentAt: now, variant,
        });
        sent++;
      } catch (err) {
        console.error(`Re-engagement email failed for ${email}:`, err);
      }
    }

    console.log(`[re-engagement] Sent ${sent} emails`);
    return { sent };
  },
});

/**
 * PREMIUM UPSELL — runs weekly (Tuesdays 10am EST).
 * Targets free (non-premium) users only.
 * PAUSE: if user upgrades to premium → they are no longer free → sequence stops naturally.
 * RESUME: if user was free, got some emails, then somehow reverted → picks up at upsellCount.
 * Sequence: 4 pitches → loops after 4 (upsellCount % 4).
 */
export const sendPremiumUpsellEmails = internalAction({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    const allStats = await ctx.runQuery(internal.welcomeEmail._getAllUserStatsForReEngagement, {});
    let sent = 0;

    for (const stats of allStats) {
      // Cooldown: skip if sent within 7 days
      if ((stats as any).upsellSentAt && (stats as any).upsellSentAt >= sevenDaysAgo) continue;

      const profile = await ctx.runQuery(internal.welcomeEmail._getProfileByUserId, { userId: stats.userId });
      if (!profile) continue;

      // PAUSE: only target free users — if they upgraded, this condition is false → sequence paused
      const isPremium = (profile as any).isPremium === true ||
        ["owner", "admin", "friends_family"].includes((profile as any).adminLevel || "");
      if (isPremium) continue; // they came back (upgraded) — stop sequence

      const email = await ctx.runQuery(internal.welcomeEmail._getUserEmail, { userId: stats.userId });
      if (!email || email.endsWith("@test.local")) continue;

      const name = (profile as any).name ?? (profile as any).firstName ?? "there";

      // Assign or read variant
      const variant: Variant = ((stats as any).emailVariant as Variant) || assignVariant(stats.userId);

      // Pick pitch — resume where left off
      const pitchIndex = ((stats as any).upsellCount ?? 0) % PREMIUM_PITCHES.length;
      const pitch = PREMIUM_PITCHES[pitchIndex];

      const html = premiumUpsellHtml(name, pitch, variant);
      const text = `${pitch.hookLine}\n\n${pitch.body}\n\n${pitch.bullets.join("\n")}\n\n${pitch.cta}: ${APP_URL}/settings\n\nPlate Team`;

      try {
        await sendEmailViaAPI({ toEmail: email, subject: pitch.subject, htmlContent: html, textContent: text, emailType: "premium_upsell" });
        await ctx.runMutation(internal.welcomeEmail._logEmail, {
          recipientUserId: stats.userId, recipientEmail: email, recipientName: name,
          subject: pitch.subject, emailType: "premium_upsell", previewHtml: pitch.hookLine,
        });
        await ctx.runMutation(internal.welcomeEmail._markUpsellSent, {
          userStatsId: stats._id, sentAt: now, variant,
        });
        sent++;
      } catch (err) {
        console.error(`Premium upsell email failed for ${email}:`, err);
      }
    }

    console.log(`[premium-upsell] Sent ${sent} emails`);
    return { sent };
  },
});

/**
 * ONBOARDING REMINDER — runs every 5 days.
 * Targets users with onboardingComplete !== true.
 * PAUSE/STOP: if onboardingComplete becomes true → condition fails → sequence stops.
 * RESUME: if user somehow left and came back (rare) → upsell picks up at stored count.
 * Hard stop: after 4 emails (MAX_ONBOARDING_REMINDERS), sequence ends permanently.
 */
export const sendOnboardingReminderEmails = internalAction({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const fiveDaysAgo = now - 5 * 24 * 60 * 60 * 1000;

    const profiles = await ctx.runQuery(internal.welcomeEmail._getIncompleteProfiles, {});
    let sent = 0;

    for (const profile of profiles) {
      // STOP: if they completed onboarding, skip
      if ((profile as any).onboardingComplete === true) continue;

      const userId = (profile as any).userId;
      const email = await ctx.runQuery(internal.welcomeEmail._getUserEmail, { userId });
      if (!email || email.endsWith("@test.local")) continue;

      const stats = await ctx.runQuery(internal.welcomeEmail._getUserStatsForUser, { userId });
      if (!stats) continue;

      const reminderCount = (stats as any).onboardingReminderCount ?? 0;
      // Hard stop after 4 emails
      if (reminderCount >= MAX_ONBOARDING_REMINDERS) continue;

      // Cooldown: 5 days between reminders
      const lastSent = (stats as any).onboardingReminderSentAt;
      if (lastSent && lastSent >= fiveDaysAgo) continue;

      const name = (profile as any).name ?? (profile as any).firstName ?? "there";

      // Assign or read variant — RESUME at stored reminderCount index
      const variant: Variant = ((stats as any).emailVariant as Variant) || assignVariant(userId);
      const reminder = ONBOARDING_REMINDERS[reminderCount];

      const html = onboardingReminderHtml(name, reminder, variant);
      const text = `Hey ${name},\n\n${reminder.body}\n\n${reminder.cta}: ${APP_URL}/signup\n\nPlate Team`;

      try {
        await sendEmailViaAPI({ toEmail: email, subject: reminder.subject, htmlContent: html, textContent: text, emailType: "onboarding_reminder" });
        await ctx.runMutation(internal.welcomeEmail._logEmail, {
          recipientUserId: userId, recipientEmail: email, recipientName: name,
          subject: reminder.subject, emailType: "onboarding_reminder", previewHtml: reminder.body.slice(0, 80),
        });
        await ctx.runMutation(internal.welcomeEmail._markOnboardingReminderSent, {
          userStatsId: stats._id, sentAt: now, variant,
        });
        sent++;
      } catch (err) {
        console.error(`Onboarding reminder failed for ${email}:`, err);
      }
    }

    console.log(`[onboarding-reminder] Sent ${sent} emails`);
    return { sent };
  },
});

/**
 * WIN-BACK — runs daily at 11am UTC (7am EST).
 * Targets users whose subscription is "canceled" or whose trial expired without
 * converting, AND who have been inactive for 30+ days.
 * Cooldown: 14 days between emails. Hard stop after 3 emails.
 */
export const sendWinBackEmails = internalAction({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const fourteenDaysAgo = now - 14 * 24 * 60 * 60 * 1000;

    const allStats = await ctx.runQuery(internal.welcomeEmail._getAllUserStatsForReEngagement, {});
    let sent = 0;

    for (const stats of allStats) {
      const profile = await ctx.runQuery(internal.welcomeEmail._getProfileByUserId, { userId: stats.userId });
      if (!profile) continue;

      // Only target users whose subscription is canceled OR trial expired without converting
      const status = (profile as any).subscriptionStatus as string | undefined;
      const trialEnd = (profile as any).trialEnd as number | undefined;
      const isPremiumActive = status === "active" || status === "trialing";
      if (isPremiumActive) continue; // still paying — not a win-back candidate

      const isCanceled = status === "canceled" || status === "past_due" || status === "unpaid";
      const isTrialExpired = status === undefined && trialEnd && trialEnd < now;
      const neverSubscribed = !status && !trialEnd; // signed up but never touched billing

      if (!isCanceled && !isTrialExpired && !neverSubscribed) continue;

      // Check they have been inactive for 30+ days
      if (stats.lastLogDate) {
        const lastLog = new Date(stats.lastLogDate).getTime();
        if (lastLog >= thirtyDaysAgo) continue; // still active enough
      }

      // Hard stop after 3 emails
      const winBackCount = (stats as any).winBackCount ?? 0;
      if (winBackCount >= MAX_WIN_BACK_EMAILS) continue;

      // Cooldown: 14 days between win-back emails
      const lastWinBack = (stats as any).winBackSentAt as number | undefined;
      if (lastWinBack && lastWinBack >= fourteenDaysAgo) continue;

      const email = await ctx.runQuery(internal.welcomeEmail._getUserEmail, { userId: stats.userId });
      if (!email || email.endsWith("@test.local")) continue;

      const name = (profile as any).name ?? (profile as any).firstName ?? "there";

      // Assign or read variant
      const variant: Variant = ((stats as any).emailVariant as Variant) || assignVariant(stats.userId);

      const wb = WIN_BACK_EMAILS[winBackCount];
      const subject = wb.subject.replace("[name]", name);
      const html = winBackHtml(name, wb, variant);
      const text = `Hey ${name},\n\n${wb.body}\n\n${wb.bullets.join("\n")}\n\n${wb.cta}: ${APP_URL}\n\nPlate Team`;

      try {
        await sendEmailViaAPI({ toEmail: email, subject, htmlContent: html, textContent: text, emailType: "win_back" });
        await ctx.runMutation(internal.welcomeEmail._logEmail, {
          recipientUserId: stats.userId, recipientEmail: email, recipientName: name,
          subject, emailType: "win_back", previewHtml: wb.body.slice(0, 100),
        });
        await ctx.runMutation(internal.welcomeEmail._markWinBackSent, {
          userStatsId: stats._id, sentAt: now, variant,
        });
        sent++;
      } catch (err) {
        console.error(`Win-back email failed for ${email}:`, err);
      }
    }

    console.log(`[win-back] Sent ${sent} emails`);
    return { sent };
  },
});

/* ══════════════════════════════════════════════════════════════════════════
   INTERNAL QUERIES & MUTATIONS
   ══════════════════════════════════════════════════════════════════════════ */

export const _getAllUserStatsForReEngagement = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("userStats").collect();
  },
});

export const _getProfileByStripeCustomerId = internalQuery({
  args: { stripeCustomerId: v.string() },
  handler: async (ctx, { stripeCustomerId }) => {
    return await ctx.db
      .query("profiles")
      .filter((q) => q.eq(q.field("stripeCustomerId"), stripeCustomerId))
      .first();
  },
});

export const _getIncompleteProfiles = internalQuery({
  args: {},
  handler: async (ctx) => {
    const profiles = await ctx.db.query("profiles").collect();
    return profiles.filter((p: any) => p.onboardingComplete !== true);
  },
});

export const _getUserStatsForUser = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db.query("userStats").withIndex("by_userId", (q) => q.eq("userId", userId)).unique();
  },
});

/** Mark re-engagement sent — increment count, stamp time, save variant */
export const _markReEngagementSent = internalMutation({
  args: { userStatsId: v.id("userStats"), sentAt: v.number(), variant: v.string() },
  handler: async (ctx, { userStatsId, sentAt, variant }) => {
    const stats = await ctx.db.get(userStatsId);
    if (!stats) return;
    await ctx.db.patch(userStatsId, {
      reEngagementSentAt: sentAt,
      reEngagementCount: ((stats as any).reEngagementCount ?? 0) + 1,
      emailVariant: (stats as any).emailVariant ?? variant, // set once, never override
    } as any);
  },
});

/** Mark upsell sent — increment count, stamp time, save variant */
export const _markUpsellSent = internalMutation({
  args: { userStatsId: v.id("userStats"), sentAt: v.number(), variant: v.string() },
  handler: async (ctx, { userStatsId, sentAt, variant }) => {
    const stats = await ctx.db.get(userStatsId);
    if (!stats) return;
    await ctx.db.patch(userStatsId, {
      upsellSentAt: sentAt,
      upsellCount: ((stats as any).upsellCount ?? 0) + 1,
      emailVariant: (stats as any).emailVariant ?? variant,
    } as any);
  },
});

/** Mark onboarding reminder sent — increment count, stamp time, save variant */
export const _markOnboardingReminderSent = internalMutation({
  args: { userStatsId: v.id("userStats"), sentAt: v.number(), variant: v.string() },
  handler: async (ctx, { userStatsId, sentAt, variant }) => {
    const stats = await ctx.db.get(userStatsId);
    if (!stats) return;
    await ctx.db.patch(userStatsId, {
      onboardingReminderSentAt: sentAt,
      onboardingReminderCount: ((stats as any).onboardingReminderCount ?? 0) + 1,
      emailVariant: (stats as any).emailVariant ?? variant,
    } as any);
  },
});

/** Mark win-back sent — increment count, stamp time, save variant */
export const _markWinBackSent = internalMutation({
  args: { userStatsId: v.id("userStats"), sentAt: v.number(), variant: v.string() },
  handler: async (ctx, { userStatsId, sentAt, variant }) => {
    const stats = await ctx.db.get(userStatsId);
    if (!stats) return;
    await ctx.db.patch(userStatsId, {
      winBackSentAt: sentAt,
      winBackCount: ((stats as any).winBackCount ?? 0) + 1,
      emailVariant: (stats as any).emailVariant ?? variant,
    } as any);
  },
});
