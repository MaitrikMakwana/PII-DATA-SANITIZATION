import axios from 'axios';

// ─── Brand assets ────────────────────────────────────────────────────────────
const LOGO = 'https://res.cloudinary.com/duclnunh6/image/upload/v1772745386/logo_dnojrg.png';

// ─── Shared HTML template ────────────────────────────────────────────────────
function buildEmailHtml(body: string): string {
  return /* html */`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { border: 0; outline: none; text-decoration: none; display: block; }

    body {
      margin: 0; padding: 0;
      background-color: #f5f3ff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }

    .wrapper { background-color: #f5f3ff; padding: 40px 16px; }

    .card {
      background-color: #ffffff;
      border-radius: 16px;
      max-width: 520px;
      margin: 0 auto;
      box-shadow: 0 2px 16px rgba(109,40,217,0.07);
      overflow: hidden;
    }

    /* ── Branding row (logo + wordmark) ── */
    .brand {
      padding: 32px 40px 24px;
      text-align: center;
      border-bottom: 1px solid #ede9fe;
    }
    .brand-inner {
      display: inline-block;
    }
    .brand img {
      display: inline-block;
      vertical-align: middle;
      height: 32px;
      width: auto;
    }
    .brand-name {
      display: inline-block;
      vertical-align: middle;
      margin-left: 10px;
      font-size: 18px;
      font-weight: 700;
      color: #6d28d9;
      letter-spacing: -0.3px;
    }

    .content { padding: 32px 40px 28px; }

    h1 { margin: 0 0 12px; font-size: 21px; font-weight: 700; color: #1e1b4b; }
    p  { margin: 0 0 14px; font-size: 15px; line-height: 1.65; color: #374151; }
    p:last-child { margin-bottom: 0; }

    .btn {
      display: inline-block;
      background: linear-gradient(135deg, #7c3aed, #6d28d9);
      color: #ffffff !important;
      text-decoration: none;
      padding: 13px 32px;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
      margin: 20px 0;
      letter-spacing: 0.2px;
    }

    .otp-box {
      background: #f5f3ff;
      border: 2px solid #ddd6fe;
      border-radius: 12px;
      text-align: center;
      padding: 24px 16px;
      margin: 20px 0;
    }
    .otp-code { font-size: 40px; font-weight: 800; letter-spacing: 14px; color: #6d28d9; }
    .otp-hint { font-size: 13px; color: #6b7280; margin: 6px 0 0; }

    .info-row   { font-size: 14px; color: #374151; margin: 8px 0; }
    .info-label { color: #9ca3af; font-weight: 500; }
    .info-value {
      display: inline-block;
      background: #f5f3ff;
      border: 1px solid #ddd6fe;
      border-radius: 6px;
      padding: 3px 10px;
      font-family: 'Courier New', Courier, monospace;
      color: #6d28d9;
      font-size: 14px;
    }

    .tag {
      display: inline-block;
      background: #ede9fe;
      color: #6d28d9;
      border-radius: 9999px;
      padding: 3px 12px;
      font-size: 12px;
      font-weight: 600;
      letter-spacing: 0.4px;
      text-transform: uppercase;
    }

    .divider { height: 1px; background: #ede9fe; margin: 0 40px; }

    .footer { padding: 20px 40px 28px; text-align: center; }
    .footer p { margin: 0; font-size: 12px; color: #9ca3af; line-height: 1.7; }

    /* ── Dark mode ── */
    @media (prefers-color-scheme: dark) {
      body, .wrapper { background-color: #0f0a1e !important; }
      .card    { background-color: #1a1033 !important; box-shadow: 0 2px 16px rgba(0,0,0,0.5) !important; }
      .brand   { border-bottom-color: #2e1f5e !important; }
      .brand-name { color: #a78bfa !important; }
      .divider { background: #2e1f5e !important; }
      h1       { color: #ede9fe !important; }
      p        { color: #c4b5fd !important; }
      .otp-box { background: #1e1257 !important; border-color: #4c1d95 !important; }
      .otp-code { color: #a78bfa !important; }
      .otp-hint { color: #7c3aed !important; }
      .info-value { background: #1e1257 !important; border-color: #4c1d95 !important; color: #a78bfa !important; }
      .footer p { color: #6b7280 !important; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <table class="card" width="100%" cellpadding="0" cellspacing="0" role="presentation">

      <!-- Branding -->
      <tr>
        <td class="brand">
          <span class="brand-inner">
            <img src="${LOGO}" alt="Pii Sanitizer" height="32" style="display:inline-block;vertical-align:middle;height:32px;width:auto;" />
            <span class="brand-name" style="display:inline-block;vertical-align:middle;margin-left:10px;font-size:18px;font-weight:700;color:#6d28d9;letter-spacing:-0.3px;">Pii Sanitizer</span>
          </span>
        </td>
      </tr>

      <!-- Body -->
      <tr>
        <td class="content">
          ${body}
        </td>
      </tr>

      <!-- Divider -->
      <tr><td class="divider"></td></tr>

      <!-- Footer -->
      <tr>
        <td class="footer">
          <p>
            &copy; ${new Date().getFullYear()} Pii Sanitizer &mdash; All rights reserved.<br />
            You received this email because you have an account on our platform.<br />
            If you believe this was sent in error, please ignore it.
          </p>
        </td>
      </tr>

    </table>
  </div>
</body>
</html>`.trim();
}

// ─── Send params ─────────────────────────────────────────────────────────────
interface SendParams {
  to:          string;
  toName:      string;
  subject:     string;
  htmlContent: string;
}

class EmailService {
  private readonly apiKey    = process.env.BREVO_API_KEY!;
  private readonly fromEmail = process.env.BREVO_FROM_EMAIL!;
  private readonly fromName  = process.env.BREVO_FROM_NAME!;

  private async send(params: SendParams): Promise<void> {
    const res = await axios.post(
      'https://api.brevo.com/v3/smtp/email',
      {
        sender:      { email: this.fromEmail, name: this.fromName },
        to:          [{ email: params.to, name: params.toName }],
        subject:     params.subject,
        htmlContent: params.htmlContent,
      },
      {
        headers: {
          'api-key':      this.apiKey,
          'Content-Type': 'application/json',
        },
      },
    );
    console.log(`[EmailService] Sent "${params.subject}" to ${params.to} — messageId: ${res.data?.messageId}`);
  }

  // ─── Welcome email ───────────────────────────────────────────────────────

  async sendWelcome(email: string, name: string, tempPassword: string): Promise<void> {
    await this.send({
      to:      email,
      toName:  name,
      subject: 'Welcome to Pii Sanitize',
      htmlContent: buildEmailHtml(`
        <span class="tag">Account Created</span>
        <h1 style="margin-top:16px;">Welcome, ${name}!</h1>
        <p>Your account on the Pii Sanitize platform is ready. Use the credentials below to log in for the first time.</p>
        <p class="info-row"><span class="info-label">Email &nbsp;&nbsp;&nbsp;</span> <span class="info-value">${email}</span></p>
        <p class="info-row"><span class="info-label">Password </span> <span class="info-value">${tempPassword}</span></p>
        <p style="margin-top:20px;">For your security, please change your password immediately after signing in.</p>
      `),
    });
  }

  // ─── OTP email ───────────────────────────────────────────────────────────

  async sendOtp(email: string, name: string, otp: string): Promise<void> {
    await this.send({
      to:      email,
      toName:  name,
      subject: 'Your Password Reset Code — Pii Sanitize',
      htmlContent: buildEmailHtml(`
        <span class="tag">Password Reset</span>
        <h1 style="margin-top:16px;">Reset your password</h1>
        <p>Hi ${name}, use the code below to reset your password. It expires in <strong style="color:#7c3aed;">10 minutes</strong>.</p>
        <div class="otp-box">
          <div class="otp-code">${otp}</div>
          <p class="otp-hint">Enter this code on the verification screen</p>
        </div>
        <p>If you didn't request a password reset, you can safely ignore this email.</p>
      `),
    });
  }

  // ─── Password reset link email ───────────────────────────────────────────

  async sendPasswordReset(email: string, name: string, resetLink: string): Promise<void> {
    await this.send({
      to:      email,
      toName:  name,
      subject: 'Reset Your Password — Pii Sanitize',
      htmlContent: buildEmailHtml(`
        <span class="tag">Password Reset</span>
        <h1 style="margin-top:16px;">Reset your password</h1>
        <p>Hi ${name},</p>
        <p>We received a request to reset the password for your account. Click the button below to choose a new one. This link expires in <strong style="color:#7c3aed;">1 hour</strong>.</p>
        <p style="text-align:center;">
          <a class="btn" href="${resetLink}">Reset Password</a>
        </p>
        <p>If you didn't request this, you can safely ignore this email — your password will not change.</p>
      `),
    });
  }

  // ─── File ready email ────────────────────────────────────────────────────

  async sendFileReady(email: string, name: string, fileName: string): Promise<void> {
    await this.send({
      to:      email,
      toName:  name,
      subject: `File Ready: ${fileName} — Pii Sanitize`,
      htmlContent: buildEmailHtml(`
        <span class="tag">Sanitization Complete</span>
        <h1 style="margin-top:16px;">Your file is ready</h1>
        <p>Hi ${name},</p>
        <p>The file below has been scanned and sanitized successfully. All detected PII has been redacted.</p>
        <p class="info-row"><span class="info-label">File &nbsp;</span> <span class="info-value">${fileName}</span></p>
        <p style="margin-top:20px;">Log in to the platform to view and download the sanitized version.</p>
      `),
    });
  }
}

export const emailService = new EmailService();
