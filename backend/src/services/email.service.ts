import axios from 'axios';

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
    try {
      await axios.post(
        'https://api.brevo.com/v3/smtp/email',
        {
          sender:      { email: this.fromEmail, name: this.fromName },
          to:          [{ email: params.to, name: params.toName }],
          subject:     params.subject,
          htmlContent: params.htmlContent,
        },
        {
          headers: {
            'api-key':       this.apiKey,
            'Content-Type':  'application/json',
          },
        },
      );
    } catch (err) {
      console.error('[EmailService] Failed to send email:', err);
    }
  }

  async sendWelcome(email: string, name: string, tempPassword: string): Promise<void> {
    await this.send({
      to:      email,
      toName:  name,
      subject: 'Welcome to PII Platform',
      htmlContent: `
        <h2>Welcome, ${name}!</h2>
        <p>Your account has been created on the PII Sanitization Platform.</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Temporary password:</strong> <code>${tempPassword}</code></p>
        <p>Please log in and change your password immediately.</p>
      `,
    });
  }

  async sendPasswordReset(email: string, name: string, resetLink: string): Promise<void> {
    await this.send({
      to:      email,
      toName:  name,
      subject: 'Password Reset Request',
      htmlContent: `
        <h2>Reset Your Password</h2>
        <p>Hi ${name},</p>
        <p>Click below to reset your password. This link expires in <strong>1 hour</strong>.</p>
        <p><a href="${resetLink}" style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">Reset Password</a></p>
        <p>If you didn't request this, safely ignore this email.</p>
      `,
    });
  }

  async sendFileReady(email: string, name: string, fileName: string): Promise<void> {
    await this.send({
      to:      email,
      toName:  name,
      subject: `File Sanitized: ${fileName}`,
      htmlContent: `
        <h2>Your file is ready</h2>
        <p>Hi ${name},</p>
        <p>The file <strong>${fileName}</strong> has been scanned and sanitized successfully.</p>
        <p>Log in to the platform to download the sanitized version.</p>
      `,
    });
  }
}

export const emailService = new EmailService();
