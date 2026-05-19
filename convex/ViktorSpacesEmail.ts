import { Email } from "@convex-dev/auth/providers/Email";
import { APP_NAME } from "./constants";

declare const process: { env: Record<string, string | undefined> };

function generateOTP() {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String(array[0] % 1000000).padStart(6, "0");
}

function buildEmailHtml({
  heading,
  subheading,
  description,
  token,
  footerNote,
}: {
  heading: string;
  subheading: string;
  description: string;
  token: string;
  footerNote: string;
}) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${heading}</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;">

          <!-- Logo -->
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

          <!-- Card -->
          <tr>
            <td style="background:#141414;border-radius:16px;border:1px solid #222;padding:40px 36px;">

              <!-- Heading -->
              <p style="margin:0 0 8px 0;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">${heading}</p>
              <p style="margin:0 0 28px 0;font-size:14px;color:#888;line-height:1.6;">${subheading}</p>

              <!-- Description -->
              <p style="margin:0 0 20px 0;font-size:14px;color:#aaa;line-height:1.6;">${description}</p>

              <!-- OTP Code -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px 0;">
                <tr>
                  <td align="center" style="background:#0a0a0a;border:1px solid #333;border-radius:12px;padding:24px 20px;">
                    <span style="font-size:40px;font-weight:800;letter-spacing:14px;color:#52B788;font-variant-numeric:tabular-nums;">${token}</span>
                  </td>
                </tr>
              </table>

              <!-- Expiry note -->
              <p style="margin:0 0 24px 0;font-size:13px;color:#666;text-align:center;">This code expires in 15 minutes.</p>

              <!-- Divider -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px 0;">
                <tr>
                  <td style="border-top:1px solid #222;height:1px;"></td>
                </tr>
              </table>

              <!-- Footer note -->
              <p style="margin:0;font-size:12px;color:#555;line-height:1.6;">${footerNote}</p>

            </td>
          </tr>

          <!-- Bottom footer -->
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
}

async function sendEmailRaw({
  email,
  subject,
  html_content,
  text_content,
  email_type = "otp",
}: {
  email: string;
  subject: string;
  html_content: string;
  text_content: string;
  email_type?: string;
}) {
  const apiUrl = process.env.VIKTOR_SPACES_API_URL;
  const projectName = process.env.VIKTOR_SPACES_PROJECT_NAME;
  const projectSecret = process.env.VIKTOR_SPACES_PROJECT_SECRET;

  if (!apiUrl || !projectName || !projectSecret) {
    throw new Error(
      "Viktor Spaces environment variables not configured. " +
        "Required: VIKTOR_SPACES_API_URL, VIKTOR_SPACES_PROJECT_NAME, VIKTOR_SPACES_PROJECT_SECRET",
    );
  }

  const response = await fetch(`${apiUrl}/api/viktor-spaces/send-email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      project_name: projectName,
      project_secret: projectSecret,
      to_email: email,
      subject,
      html_content,
      text_content,
      email_type,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send email: ${error}`);
  }

  const result = (await response.json()) as {
    success: boolean;
    error?: string;
  };
  if (!result.success) {
    throw new Error(`Email sending failed: ${result.error}`);
  }
}

async function sendEmail({
  email,
  token,
  subject,
  heading,
  subheading,
  description,
  footerNote,
}: {
  email: string;
  token: string;
  subject: string;
  heading: string;
  subheading: string;
  description: string;
  footerNote: string;
}) {
  await sendEmailRaw({
    email,
    subject: `${subject} | ${APP_NAME}`,
    html_content: buildEmailHtml({ heading, subheading, description, token, footerNote }),
    text_content: `${heading}\n\n${description}\n\nYour code: ${token}\n\nThis code expires in 15 minutes.\n\nIf you didn't request this, you can safely ignore this email.\n\nPlate`,
    email_type: "otp",
  });
}

/**
 * Email verification provider for sign-up flow.
 */
export const ViktorSpacesEmail = Email({
  id: "viktor-spaces-email",
  maxAge: 60 * 60, // 1 hour

  async generateVerificationToken() {
    return generateOTP();
  },

  async sendVerificationRequest({ identifier: email, token }) {
    await sendEmail({
      email,
      token,
      subject: "Verify your email",
      heading: "Verify your email",
      subheading: "You're one step away from your personalized meal plan.",
      description: "Enter this code in the Plate app to confirm your email address.",
      footerNote: "This code was requested for your Plate account. If you didn't sign up, no action is needed.",
    });
  },
});

/**
 * Password reset email provider.
 */
export const ViktorSpacesPasswordReset = Email({
  id: "viktor-spaces-password-reset",
  maxAge: 60 * 15,

  async generateVerificationToken() {
    return generateOTP();
  },

  async sendVerificationRequest({ identifier: email, token }) {
    await sendEmail({
      email,
      token,
      subject: "Reset your password",
      heading: "Reset your password",
      subheading: "We received a request to reset your Plate password.",
      description: "Enter this code in the app to set a new password. If you didn't request this, your account is safe.",
      footerNote: "This reset code expires in 15 minutes. If you didn't request a password reset, you can ignore this email.",
    });
  },
});
