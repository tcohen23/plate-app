import { v } from "convex/values";
import { internalQuery, internalMutation, action } from "./_generated/server";
import { internal } from "./_generated/api";

/** SHA-256 helper using Web Crypto (available in Convex runtime) */
async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Get the rate limit record ID for an email.
 */
export const getRateLimit = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const limit = await ctx.db
      .query("authRateLimits")
      .withIndex("identifier", (q) => q.eq("identifier", email))
      .unique();
    return limit?._id ?? null;
  },
});

/**
 * Delete a rate limit record by ID.
 */
export const deleteRateLimit = internalMutation({
  args: { id: v.id("authRateLimits") },
  handler: async (ctx, { id }) => {
    await ctx.db.delete(id);
  },
});

/**
 * Extend the expiry of an existing OTP verification code for an email.
 * Looks up the authAccount for the email, then finds the code and extends it.
 */
export const extendVerificationCode = internalMutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    // Find the account for this email across all password-based providers
    const account = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) =>
        q.eq("provider", "password").eq("providerAccountId", email)
      )
      .unique();

    if (!account) return false;

    // Find the verification code for this account
    const code = await ctx.db
      .query("authVerificationCodes")
      .withIndex("accountId", (q) => q.eq("accountId", account._id))
      .unique();

    if (!code) return false;

    // Extend expiry to 2 hours from now
    await ctx.db.patch(code._id, {
      expirationTime: Date.now() + 2 * 60 * 60 * 1000,
    });

    return true;
  },
});

/**
 * Store a new OTP code for an account (internal mutation).
 * Deletes any existing code and inserts the new hashed code.
 */
export const storeNewOtpCode = internalMutation({
  args: {
    accountId: v.id("authAccounts"),
    codeHash: v.string(),
    expirationTime: v.number(),
    email: v.string(),
  },
  handler: async (ctx, { accountId, codeHash, expirationTime, email }) => {
    // Delete any existing code for this account
    const existing = await ctx.db
      .query("authVerificationCodes")
      .withIndex("accountId", (q) => q.eq("accountId", accountId))
      .unique();
    if (existing !== null) {
      await ctx.db.delete(existing._id);
    }
    // Insert new code
    await ctx.db.insert("authVerificationCodes", {
      accountId,
      provider: "viktor-spaces-email",
      code: codeHash,
      expirationTime,
      emailVerified: email,
    });
  },
});

/**
 * Find auth account ID for an email (internal query).
 */
export const findAccountIdByEmail = internalQuery({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    const account = await ctx.db
      .query("authAccounts")
      .withIndex("providerAndAccountId", (q) =>
        q.eq("provider", "password").eq("providerAccountId", email)
      )
      .unique();
    return account?._id ?? null;
  },
});

declare const process: { env: Record<string, string | undefined> };

/**
 * Public action: resend OTP email for a given email address.
 * Generates a fresh 6-digit code, stores it, and sends the email.
 * Returns { success: true } or throws an error.
 */
export const resendOtp = action({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    // Find the account
    const accountId = await ctx.runQuery(internal.authHelpers.findAccountIdByEmail, { email });
    if (!accountId) {
      throw new Error("No account found for this email. Please sign up first.");
    }

    // Generate a fresh 6-digit OTP
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    const otp = String(array[0] % 1000000).padStart(6, "0");

    // Hash the code
    const codeHash = await sha256(otp);

    // Store the new code (replaces old one)
    const expirationTime = Date.now() + 60 * 60 * 1000; // 1 hour
    await ctx.runMutation(internal.authHelpers.storeNewOtpCode, {
      accountId,
      codeHash,
      expirationTime,
      email,
    });

    // Send the email
    const apiUrl = process.env.VIKTOR_SPACES_API_URL;
    const projectName = process.env.VIKTOR_SPACES_PROJECT_NAME;
    const projectSecret = process.env.VIKTOR_SPACES_PROJECT_SECRET;

    if (!apiUrl || !projectName || !projectSecret) {
      throw new Error("Email service not configured. Please contact support.");
    }

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verify your email</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;">
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <table cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" valign="middle">
                    <img src="https://plate-71e84f88.viktor.space/plate-logo.png" alt="Plate" width="40" height="40" style="display:block;border-radius:10px;" />
                  </td>
                  <td style="padding-left:10px;vertical-align:middle;">
                    <span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:0.08em;">PLATE</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#141414;border-radius:16px;border:1px solid #222;padding:40px 36px;">
              <p style="margin:0 0 8px 0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">Verify your email</p>
              <p style="margin:0 0 28px 0;font-size:14px;color:#888;line-height:1.6;">You're one step away from your personalized meal plan.</p>
              <p style="margin:0 0 20px 0;font-size:14px;color:#aaa;line-height:1.6;">Enter this code in the Plate app to confirm your email address.</p>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px 0;">
                <tr>
                  <td align="center" style="background:#0a0a0a;border:1px solid #333;border-radius:12px;padding:24px 20px;">
                    <span style="font-size:40px;font-weight:800;letter-spacing:14px;color:#52B788;font-variant-numeric:tabular-nums;">${otp}</span>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 24px 0;font-size:13px;color:#666;text-align:center;">This code expires in 1 hour.</p>
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;">
                <tr><td style="border-top:1px solid #222;height:1px;"></td></tr>
              </table>
              <p style="margin:0;font-size:12px;color:#555;line-height:1.6;">This code was requested for your Plate account. If you didn't sign up, no action is needed.</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top:28px;">
              <p style="margin:0 0 6px 0;font-size:12px;color:#444;">Sent by <strong style="color:#555;">Plate</strong> &middot; <a href="https://plate-71e84f88.viktor.space/privacy" style="color:#52B788;text-decoration:none;">Privacy Policy</a></p>
              <p style="margin:0;font-size:11px;color:#333;">If you didn't request this, you can safely ignore this email.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const response = await fetch(`${apiUrl}/api/viktor-spaces/send-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        project_name: projectName,
        project_secret: projectSecret,
        to_email: email,
        subject: "Verify your email | Plate",
        html_content: htmlContent,
        text_content: `Verify your email\n\nEnter this code in the Plate app to confirm your email address.\n\nYour code: ${otp}\n\nThis code expires in 1 hour.\n\nIf you didn't request this, you can safely ignore this email.\n\nPlate`,
        email_type: "otp",
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to send email: ${error}`);
    }

    const result = (await response.json()) as { success: boolean; error?: string };
    if (!result.success) {
      throw new Error(`Email sending failed: ${result.error}`);
    }

    return { success: true };
  },
});
