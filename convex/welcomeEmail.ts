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
   EMAIL TEMPLATES
   ══════════════════════════════════════════════════════════════════════════ */

function emailShell(bodyContent: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f8f8f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:40px 20px;">
    <!-- Logo Header -->
    <div style="text-align:center;margin-bottom:32px;">
      <table align="center" cellpadding="0" cellspacing="0" style="margin:0 auto;">
        <tr>
          <td style="vertical-align:middle;padding-right:10px;">
            <img src="https://plate-71e84f88.viktor.space/plate-logo.png" alt="Plate" width="36" height="36" style="display:block;border-radius:8px;" />
          </td>
          <td style="vertical-align:middle;">
            <span style="font-family:Georgia,'Times New Roman',serif;font-size:26px;color:#1a1a1a;font-style:italic;">Plate</span>
          </td>
        </tr>
      </table>
      <div style="font-size:9px;letter-spacing:2.5px;text-transform:uppercase;color:#999;margin-top:6px;">Nutrition, Perfected.</div>
    </div>

    <!-- Body -->
    ${bodyContent}

    <!-- Footer -->
    <div style="text-align:center;margin-top:28px;padding-top:20px;border-top:1px solid #e8e8e4;">
      <img src="https://plate-71e84f88.viktor.space/plate-logo.png" alt="Plate" width="20" height="20" style="display:inline-block;border-radius:4px;vertical-align:middle;margin-right:6px;opacity:0.5;" />
      <span style="color:#bbb;font-size:11px;vertical-align:middle;">Sent by ${APP_NAME}</span>
    </div>
  </div>
</body>
</html>`;
}

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

    <!-- Logo -->
    <div style="text-align:center;margin-bottom:36px;">
      <div style="display:inline-block;width:60px;height:60px;border-radius:16px;background:#52B788;line-height:60px;text-align:center;margin-bottom:14px;">
        <span style="font-family:Georgia,serif;font-size:30px;color:#0a2018;font-weight:bold;">P</span>
      </div>
      <div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#ffffff;letter-spacing:3px;text-transform:uppercase;">PLATE</div>
      <div style="font-size:10px;letter-spacing:2.5px;text-transform:uppercase;color:#555;margin-top:5px;">Nutrition, Perfected.</div>
    </div>

    <!-- Card -->
    <div style="background:#141414;border-radius:20px;padding:36px 32px;border:1px solid #2a2a2a;margin-bottom:20px;">

      <!-- Greeting -->
      <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:28px;color:#ffffff;margin:0 0 10px 0;font-weight:normal;">
        Your plan is live, ${name}.
      </h1>
      <p style="color:#888;font-size:15px;line-height:1.7;margin:0 0 28px 0;">
        We built everything around your body and your goal. Open the app and your meal plan is already waiting.
      </p>

      <!-- Macro block -->
      <div style="background:#0a0a0a;border-radius:14px;padding:24px;margin-bottom:28px;border:1px solid #222;">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#555;margin-bottom:10px;">Daily Target &middot; ${goalLabel}</div>
        <div style="font-family:Georgia,'Times New Roman',serif;font-size:44px;color:#52B788;margin-bottom:18px;line-height:1;">
          ${cals ?? "—"}<span style="font-size:15px;font-family:sans-serif;color:#555;margin-left:6px;">kcal</span>
        </div>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:12px 0;border-top:1px solid #222;width:33%;">
              <div style="font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:#555;margin-bottom:4px;">Protein</div>
              <div style="font-family:Georgia,serif;font-size:22px;color:#ffffff;">${protein ?? "—"}g</div>
            </td>
            <td style="padding:12px 0;border-top:1px solid #222;width:33%;text-align:center;">
              <div style="font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:#555;margin-bottom:4px;">Carbs</div>
              <div style="font-family:Georgia,serif;font-size:22px;color:#ffffff;">${carbs ?? "—"}g</div>
            </td>
            <td style="padding:12px 0;border-top:1px solid #222;width:33%;text-align:right;">
              <div style="font-size:10px;text-transform:uppercase;letter-spacing:1.5px;color:#555;margin-bottom:4px;">Fat</div>
              <div style="font-family:Georgia,serif;font-size:22px;color:#ffffff;">${fat ?? "—"}g</div>
            </td>
          </tr>
        </table>
      </div>

      <!-- What to do next -->
      <div style="margin-bottom:28px;">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#555;margin-bottom:16px;">What to do next</div>
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:8px 0;vertical-align:top;width:28px;">
              <span style="display:inline-block;width:20px;height:20px;border-radius:50%;background:#52B788;text-align:center;line-height:20px;font-size:11px;color:#0a2018;font-weight:bold;">1</span>
            </td>
            <td style="padding:8px 0;">
              <span style="color:#cccccc;font-size:14px;line-height:1.6;">Open the <strong style="color:#ffffff;">Today tab</strong> and check out your personalized meal plan</span>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 0;vertical-align:top;width:28px;">
              <span style="display:inline-block;width:20px;height:20px;border-radius:50%;background:#52B788;text-align:center;line-height:20px;font-size:11px;color:#0a2018;font-weight:bold;">2</span>
            </td>
            <td style="padding:8px 0;">
              <span style="color:#cccccc;font-size:14px;line-height:1.6;">Head to <strong style="color:#ffffff;">Grocery</strong> and your shopping list is already generated</span>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 0;vertical-align:top;width:28px;">
              <span style="display:inline-block;width:20px;height:20px;border-radius:50%;background:#52B788;text-align:center;line-height:20px;font-size:11px;color:#0a2018;font-weight:bold;">3</span>
            </td>
            <td style="padding:8px 0;">
              <span style="color:#cccccc;font-size:14px;line-height:1.6;">Log meals from the <strong style="color:#ffffff;">Track tab</strong> or scan barcodes to stay on target</span>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 0;vertical-align:top;width:28px;">
              <span style="display:inline-block;width:20px;height:20px;border-radius:50%;background:#52B788;text-align:center;line-height:20px;font-size:11px;color:#0a2018;font-weight:bold;">4</span>
            </td>
            <td style="padding:8px 0;">
              <span style="color:#cccccc;font-size:14px;line-height:1.6;">Add Plate to your <strong style="color:#ffffff;">home screen</strong> for a native app feel</span>
            </td>
          </tr>
        </table>
      </div>

      <!-- CTA -->
      <a href="https://plate-71e84f88.viktor.space/dashboard"
         style="display:block;background:#52B788;color:#0a2018;text-align:center;text-decoration:none;font-size:15px;font-weight:600;padding:16px 24px;border-radius:12px;letter-spacing:0.5px;">
        Open Plate
      </a>
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:0 20px;">
      <p style="color:#444;font-size:12px;line-height:1.7;margin:0;">
        You signed up for Plate &mdash; we're glad you're here.<br>
        Questions? Just reply to this email.
      </p>
      <p style="margin-top:12px;">
        <a href="https://plate-71e84f88.viktor.space/privacy" style="color:#555;font-size:11px;text-decoration:none;">Privacy Policy</a>
      </p>
    </div>

  </div>
</body>
</html>`;
}

function adminUpgradeEmailHtml(name: string): string {
  return emailShell(`
    <div style="background:#ffffff;border-radius:16px;padding:32px;border:1px solid #e8e8e4;">
      <div style="text-align:center;margin-bottom:20px;">
        <div style="display:inline-block;width:56px;height:56px;border-radius:14px;background:#1a1a1a;line-height:56px;text-align:center;">
          <span style="font-size:28px;">🛡️</span>
        </div>
      </div>
      <h2 style="font-family:Georgia,'Times New Roman',serif;font-size:24px;color:#1a1a1a;margin:0 0 8px 0;font-weight:normal;text-align:center;">
        You're an Admin, ${name}
      </h2>
      <p style="color:#666;font-size:15px;line-height:1.6;margin:0 0 24px 0;text-align:center;">
        You've been granted admin access to ${APP_NAME}. You now have access to the admin dashboard.
      </p>

      <div style="background:#f8f8f6;border-radius:12px;padding:20px;margin-bottom:24px;">
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:2px;color:#999;margin-bottom:12px;">What You Can Do</div>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:5px 0;vertical-align:top;width:24px;color:#1a1a1a;font-size:14px;">✦</td><td style="padding:5px 0;color:#555;font-size:14px;line-height:1.5;">View all users, their stats & activity</td></tr>
          <tr><td style="padding:5px 0;vertical-align:top;width:24px;color:#1a1a1a;font-size:14px;">✦</td><td style="padding:5px 0;color:#555;font-size:14px;line-height:1.5;">Reset user progress or data</td></tr>
          <tr><td style="padding:5px 0;vertical-align:top;width:24px;color:#1a1a1a;font-size:14px;">✦</td><td style="padding:5px 0;color:#555;font-size:14px;line-height:1.5;">Manage admin access for the team</td></tr>
          <tr><td style="padding:5px 0;vertical-align:top;width:24px;color:#1a1a1a;font-size:14px;">✦</td><td style="padding:5px 0;color:#555;font-size:14px;line-height:1.5;">Send emails to users</td></tr>
        </table>
      </div>

      <p style="color:#666;font-size:13px;line-height:1.5;margin:0;text-align:center;">
        Head to the Admin page from your dashboard to get started.
      </p>
    </div>
  `);
}

function customEmailHtml(recipientName: string, _subject: string, body: string): string {
  // Convert newlines in the body to <br> tags
  const htmlBody = body
    .split("\n")
    .map((line) => `<p style="color:#555;font-size:15px;line-height:1.7;margin:0 0 8px 0;">${line || "&nbsp;"}</p>`)
    .join("");

  return emailShell(`
    <div style="background:#ffffff;border-radius:16px;padding:32px;border:1px solid #e8e8e4;">
      <h2 style="font-family:Georgia,'Times New Roman',serif;font-size:22px;color:#1a1a1a;margin:0 0 6px 0;font-weight:normal;">
        Hey ${recipientName},
      </h2>
      <div style="width:40px;height:2px;background:#1a1a1a;border-radius:1px;margin:16px 0 20px 0;"></div>
      ${htmlBody}
    </div>
  `);
}

/* ══════════════════════════════════════════════════════════════════════════
   PUBLIC ACTIONS
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Send welcome email — called from frontend after onboarding completes.
 */
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
    const goalLabel = goalLabels[profile.goal] || profile.goal;

    const subject = `Welcome to ${APP_NAME}, ${profile.name}! 🍽️`;
    const html = welcomeEmailHtml(
      profile.name,
      goalLabel,
      profile.targetCalories ?? null,
      profile.targetProtein ?? null,
      profile.targetCarbs ?? null,
      profile.targetFat ?? null,
    );
    const text = `Welcome to ${APP_NAME}, ${profile.name}!\n\nYour daily targets:\n${goalLabel} — ${profile.targetCalories} kcal\nProtein: ${profile.targetProtein}g | Carbs: ${profile.targetCarbs}g | Fat: ${profile.targetFat}g\n\nCheck your Dashboard, log meals, generate grocery lists, and install the app.\n\n— ${APP_NAME}`;

    await sendEmailViaAPI({ toEmail: email, subject, htmlContent: html, textContent: text, emailType: "welcome" });

    await ctx.runMutation(internal.welcomeEmail._logEmail, {
      recipientUserId: userId,
      recipientEmail: email,
      recipientName: profile.name,
      subject,
      emailType: "welcome",
      previewHtml: `Personalized welcome email with ${goalLabel} macro targets`,
    });

    return { success: true };
  },
});

/**
 * Send admin upgrade notification — called from frontend after toggling admin.
 */
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

    const subject = `You're now an admin on ${APP_NAME} 🛡️`;
    const html = adminUpgradeEmailHtml(profile.name);
    const text = `Hey ${profile.name},\n\nYou've been granted admin access to ${APP_NAME}. Head to the Admin page from your dashboard to view users, manage data, and send emails.\n\n— ${APP_NAME}`;

    await sendEmailViaAPI({ toEmail: email, subject, htmlContent: html, textContent: text, emailType: "admin_upgrade" });

    await ctx.runMutation(internal.welcomeEmail._logEmail, {
      recipientUserId: targetUserId,
      recipientEmail: email,
      recipientName: profile.name,
      subject,
      emailType: "admin_upgrade",
      sentByUserId: adminUserId,
      previewHtml: `Admin access granted notification`,
    });

    return { success: true };
  },
});

/**
 * Send custom email from admin to any user.
 */
export const sendCustomEmailToUser = action({
  args: {
    targetUserId: v.id("users"),
    subject: v.string(),
    body: v.string(),
  },
  handler: async (ctx, { targetUserId, subject, body }) => {
    const adminUserId = await getAuthUserId(ctx);
    if (!adminUserId) throw new Error("Not authenticated");

    // Verify sender is admin
    const adminProfile = await ctx.runQuery(internal.welcomeEmail._getProfileByUserId, { userId: adminUserId });
    const adminLevelOk = ["owner", "admin", "moderator"].includes(adminProfile?.adminLevel ?? "");
    if (!adminProfile?.isAdmin && !adminLevelOk) throw new Error("Not authorized — admin only");

    const [profile, email] = await Promise.all([
      ctx.runQuery(internal.welcomeEmail._getProfileByUserId, { userId: targetUserId }),
      ctx.runQuery(internal.welcomeEmail._getUserEmail, { userId: targetUserId }),
    ]);

    if (!profile || !email) throw new Error("User has no profile or email");

    const fullSubject = `${subject} — ${APP_NAME}`;
    const html = customEmailHtml(profile.name, subject, body);
    const text = `Hey ${profile.name},\n\n${body}\n\n— ${APP_NAME}`;

    await sendEmailViaAPI({ toEmail: email, subject: fullSubject, htmlContent: html, textContent: text, emailType: "custom" });

    await ctx.runMutation(internal.welcomeEmail._logEmail, {
      recipientUserId: targetUserId,
      recipientEmail: email,
      recipientName: profile.name,
      subject: fullSubject,
      emailType: "custom",
      sentByUserId: adminUserId,
      previewHtml: body.slice(0, 120),
    });

    return { success: true };
  },
});

/**
 * Send custom email to an arbitrary email address (not necessarily a user).
 */
export const sendCustomEmailToAddress = action({
  args: {
    toEmail: v.string(),
    toName: v.string(),
    subject: v.string(),
    body: v.string(),
  },
  handler: async (ctx, { toEmail, toName, subject, body }) => {
    const adminUserId = await getAuthUserId(ctx);
    if (!adminUserId) throw new Error("Not authenticated");

    const adminProfile = await ctx.runQuery(internal.welcomeEmail._getProfileByUserId, { userId: adminUserId });
    const adminLevelOk2 = ["owner", "admin", "moderator"].includes(adminProfile?.adminLevel ?? "");
    if (!adminProfile?.isAdmin && !adminLevelOk2) throw new Error("Not authorized — admin only");

    const fullSubject = `${subject} — ${APP_NAME}`;
    const html = customEmailHtml(toName || "there", subject, body);
    const text = `Hey ${toName || "there"},\n\n${body}\n\n— ${APP_NAME}`;

    await sendEmailViaAPI({ toEmail, subject: fullSubject, htmlContent: html, textContent: text, emailType: "custom" });

    await ctx.runMutation(internal.welcomeEmail._logEmail, {
      recipientEmail: toEmail,
      recipientName: toName || toEmail,
      subject: fullSubject,
      emailType: "custom",
      sentByUserId: adminUserId,
      previewHtml: body.slice(0, 120),
    });

    return { success: true };
  },
});

/* ══════════════════════════════════════════════════════════════════════════
   SUBSCRIPTION STARTED EMAIL
   ══════════════════════════════════════════════════════════════════════════ */

function subscriptionStartedHtml(name: string, planLabel: string, trialEnd: string | null): string {
  const trialSection = trialEnd
    ? `<tr><td style="padding-bottom:24px;"><p style="margin:0;color:#a3a3a3;font-size:14px;line-height:1.6;">Your 3-day free trial runs until <strong style="color:#ffffff;">${trialEnd}</strong>. You won't be charged until then — cancel anytime in settings.</p></td></tr>`
    : `<tr><td style="padding-bottom:24px;"><p style="margin:0;color:#a3a3a3;font-size:14px;line-height:1.6;">Your subscription is now active. Thank you for supporting PLATE!</p></td></tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>Welcome to PLATE Premium</title></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;">
        <tr><td align="center" style="padding-bottom:32px;">
          <table cellpadding="0" cellspacing="0" border="0"><tr>
            <td align="center" valign="middle"><img src="https://plate-71e84f88.viktor.space/plate-logo.png" alt="Plate" width="40" height="40" style="display:block;border-radius:10px;"/></td>
            <td style="padding-left:10px;vertical-align:middle;"><span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:0.08em;">PLATE</span></td>
          </tr></table>
        </td></tr>
        <tr><td style="background:#1a1a1a;border-radius:16px;padding:32px;border:1px solid #2a2a2a;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr><td style="padding-bottom:8px;"><span style="display:inline-block;background:#52B788;color:#000;font-size:11px;font-weight:700;letter-spacing:0.1em;padding:4px 12px;border-radius:100px;text-transform:uppercase;">Premium Active</span></td></tr>
            <tr><td style="padding-bottom:16px;"><h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;">You're in, ${name}! 🎉</h1></td></tr>
            <tr><td style="padding-bottom:16px;"><p style="margin:0;color:#a3a3a3;font-size:14px;line-height:1.6;">Your <strong style="color:#ffffff;">${planLabel}</strong> plan is now active. Get ready for personalized meal plans, AI nutrition coaching, and everything PLATE has to offer.</p></td></tr>
            ${trialSection}
            <tr><td style="padding-bottom:24px;">
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#111;border-radius:12px;border:1px solid #2a2a2a;overflow:hidden;">
                <tr><td style="padding:16px 20px;border-bottom:1px solid #2a2a2a;"><span style="color:#52B788;font-size:13px;font-weight:600;">✓</span><span style="color:#e5e5e5;font-size:13px;margin-left:10px;">Unlimited meal plan generation</span></td></tr>
                <tr><td style="padding:16px 20px;border-bottom:1px solid #2a2a2a;"><span style="color:#52B788;font-size:13px;font-weight:600;">✓</span><span style="color:#e5e5e5;font-size:13px;margin-left:10px;">AI calorie & macro tracking</span></td></tr>
                <tr><td style="padding:16px 20px;border-bottom:1px solid #2a2a2a;"><span style="color:#52B788;font-size:13px;font-weight:600;">✓</span><span style="color:#e5e5e5;font-size:13px;margin-left:10px;">Smart grocery lists</span></td></tr>
                <tr><td style="padding:16px 20px;"><span style="color:#52B788;font-size:13px;font-weight:600;">✓</span><span style="color:#e5e5e5;font-size:13px;margin-left:10px;">Progress tracking & insights</span></td></tr>
              </table>
            </td></tr>
            <tr><td align="center"><a href="https://plate-71e84f88.viktor.space" style="display:inline-block;background:#52B788;color:#000;font-size:15px;font-weight:700;padding:14px 32px;border-radius:12px;text-decoration:none;letter-spacing:0.01em;">Open PLATE →</a></td></tr>
          </table>
        </td></tr>
        <tr><td align="center" style="padding-top:24px;"><p style="margin:0;color:#555;font-size:12px;">Questions? Reply to this email — we're here.<br/>© 2026 PLATE. All rights reserved.</p></td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/** Send subscription started / trial started email — called from Stripe webhook */
export const sendSubscriptionStartedEmail = internalAction({
  args: {
    stripeCustomerId: v.string(),
    planType: v.string(),
    trialEndTimestamp: v.optional(v.number()),
  },
  handler: async (ctx, { stripeCustomerId, planType, trialEndTimestamp }) => {
    const profile = await ctx.runQuery(internal.welcomeEmail._getProfileByStripeCustomerId, { stripeCustomerId });
    if (!profile) return { success: false, reason: "no-profile" };

    const email = await ctx.runQuery(internal.welcomeEmail._getUserEmail, { userId: profile.userId });
    if (!email) return { success: false, reason: "no-email" };

    const planLabels: Record<string, string> = {
      premium_monthly: "PLATE Premium (Monthly)",
      premium_annual: "PLATE Premium (Annual)",
      workout_monthly: "Workout Add-On (Monthly)",
      workout_annual: "Workout Add-On (Annual)",
    };
    const planLabel = planLabels[planType] || planType;

    const trialEnd = trialEndTimestamp
      ? new Date(trialEndTimestamp).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
      : null;

    const subject = trialEnd
      ? `Your PLATE free trial has started, ${profile.name ?? profile.firstName}!`
      : `Welcome to PLATE Premium, ${profile.name ?? profile.firstName}!`;

    const html = subscriptionStartedHtml(profile.name ?? profile.firstName ?? "there", planLabel, trialEnd);
    const text = `Welcome to PLATE Premium!\n\nYour ${planLabel} plan is now active.${trialEnd ? `\n\nFree trial ends: ${trialEnd}` : ""}\n\nOpen PLATE: https://plate-71e84f88.viktor.space\n\n— PLATE`;

    await sendEmailViaAPI({ toEmail: email, subject, htmlContent: html, textContent: text, emailType: "subscription_started" });

    await ctx.runMutation(internal.welcomeEmail._logEmail, {
      recipientUserId: profile.userId,
      recipientEmail: email,
      recipientName: profile.name ?? profile.firstName ?? email,
      subject,
      emailType: "subscription_started",
      previewHtml: trialEnd ? `3-day trial active — ends ${trialEnd}` : `${planLabel} now active`,
    });

    return { success: true };
  },
});

/* ══════════════════════════════════════════════════════════════════════════
   TRIAL ENDING EMAIL
   ══════════════════════════════════════════════════════════════════════════ */

function trialEndingHtml(name: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>Your PLATE trial ends tomorrow</title></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;">
        <tr><td align="center" style="padding-bottom:32px;">
          <table cellpadding="0" cellspacing="0" border="0"><tr>
            <td align="center" valign="middle"><img src="https://plate-71e84f88.viktor.space/plate-logo.png" alt="Plate" width="40" height="40" style="display:block;border-radius:10px;"/></td>
            <td style="padding-left:10px;vertical-align:middle;"><span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:0.08em;">PLATE</span></td>
          </tr></table>
        </td></tr>
        <tr><td style="background:#1a1a1a;border-radius:16px;padding:32px;border:1px solid #2a2a2a;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr><td style="padding-bottom:8px;"><span style="display:inline-block;background:#f59e0b20;color:#f59e0b;font-size:11px;font-weight:700;letter-spacing:0.1em;padding:4px 12px;border-radius:100px;text-transform:uppercase;">Trial Ending Tomorrow</span></td></tr>
            <tr><td style="padding-bottom:16px;"><h1 style="margin:0;color:#ffffff;font-size:26px;font-weight:700;">Hey ${name}, your trial ends soon ⏰</h1></td></tr>
            <tr><td style="padding-bottom:16px;"><p style="margin:0;color:#a3a3a3;font-size:14px;line-height:1.6;">Your PLATE free trial ends <strong style="color:#ffffff;">tomorrow</strong>. After that, your subscription kicks in automatically — no action needed to keep going.</p></td></tr>
            <tr><td style="padding-bottom:24px;"><p style="margin:0;color:#a3a3a3;font-size:14px;line-height:1.6;">If you want to cancel, you can do so in <strong style="color:#ffffff;">Settings → Subscription</strong> before your trial ends. No charge will apply.</p></td></tr>
            <tr><td align="center" style="padding-bottom:16px;"><a href="https://plate-71e84f88.viktor.space" style="display:inline-block;background:#52B788;color:#000;font-size:15px;font-weight:700;padding:14px 32px;border-radius:12px;text-decoration:none;letter-spacing:0.01em;">Keep Using PLATE →</a></td></tr>
            <tr><td align="center"><a href="https://plate-71e84f88.viktor.space/settings" style="color:#555;font-size:12px;text-decoration:underline;">Manage subscription</a></td></tr>
          </table>
        </td></tr>
        <tr><td align="center" style="padding-top:24px;"><p style="margin:0;color:#555;font-size:12px;">Questions? Reply to this email — we're here.<br/>© 2026 PLATE. All rights reserved.</p></td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/** Send trial-ending reminder — called from Stripe webhook (trial_will_end event) */
export const sendTrialEndingEmail = internalAction({
  args: { stripeCustomerId: v.string() },
  handler: async (ctx, { stripeCustomerId }) => {
    const profile = await ctx.runQuery(internal.welcomeEmail._getProfileByStripeCustomerId, { stripeCustomerId });
    if (!profile) return { success: false, reason: "no-profile" };

    const email = await ctx.runQuery(internal.welcomeEmail._getUserEmail, { userId: profile.userId });
    if (!email) return { success: false, reason: "no-email" };

    const name = profile.name ?? profile.firstName ?? "there";
    const subject = `Your PLATE trial ends tomorrow, ${name}`;
    const html = trialEndingHtml(name);
    const text = `Hey ${name},\n\nYour PLATE free trial ends tomorrow. To keep going, no action needed — your subscription starts automatically.\n\nTo cancel: https://plate-71e84f88.viktor.space/settings\n\n— PLATE`;

    await sendEmailViaAPI({ toEmail: email, subject, htmlContent: html, textContent: text, emailType: "trial_ending" });

    await ctx.runMutation(internal.welcomeEmail._logEmail, {
      recipientUserId: profile.userId,
      recipientEmail: email,
      recipientName: name,
      subject,
      emailType: "trial_ending",
      previewHtml: "Trial ends tomorrow — keep using PLATE or cancel in settings",
    });

    return { success: true };
  },
});

/** Internal query: get profile by Stripe customer ID */
export const _getProfileByStripeCustomerId = internalQuery({
  args: { stripeCustomerId: v.string() },
  handler: async (ctx, { stripeCustomerId }) => {
    return await ctx.db
      .query("profiles")
      .filter((q) => q.eq(q.field("stripeCustomerId"), stripeCustomerId))
      .first();
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
    const subject = `Welcome to ${APP_NAME}, ${name}! 🍽️`;
    const html = welcomeEmailHtml(
      name,
      (profile as any).goal || "your goals",
      (profile as any).targetCalories ?? null,
      (profile as any).targetProtein ?? null,
      (profile as any).targetCarbs ?? null,
      (profile as any).targetFat ?? null,
    );
    const text = `Welcome to ${APP_NAME}, ${name}!\n\nYour personalized meal plan is ready. Open PLATE: https://plate-71e84f88.viktor.space\n\n— ${APP_NAME}`;

    await sendEmailViaAPI({ toEmail: email, subject, htmlContent: html, textContent: text, emailType: "welcome" });

    await ctx.runMutation(internal.welcomeEmail._logEmail, {
      recipientUserId: userId,
      recipientEmail: email,
      recipientName: name,
      subject,
      emailType: "welcome",
      previewHtml: `Personalized welcome — your meal plan is ready`,
    });

    return { success: true };
  },
});
