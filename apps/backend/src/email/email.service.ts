import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly apiKey: string | undefined;
  private readonly senderEmail: string;
  private readonly senderName: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('BREVO_API_KEY');
    this.senderEmail = this.configService.get<string>('EMAIL_FROM_ADDRESS') ?? 'kabrakeng@gmail.com';
    this.senderName = this.configService.get<string>('EMAIL_FROM_NAME') ?? 'NISSA IMANE TRACKER';

    if (!this.apiKey) {
      this.logger.warn('BREVO_API_KEY not set – emails will only be logged');
    }
  }

  private async sendEmail(to: string, subject: string, html: string): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': this.apiKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: { name: this.senderName, email: this.senderEmail },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Brevo ${response.status}: ${body}`);
    }

    const data = await response.json();
    this.logger.log(`Email sent to ${to} (messageId: ${data.messageId})`);
    return true;
  }

  async sendVerificationEmail(to: string, firstName: string, code: string): Promise<void> {
    const subject = 'Vérifiez votre adresse email – Nissa Imane Tracker';
    const html = `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
        <h2 style="color:#1a7f64;">Assalamu Alaikum ${firstName},</h2>
        <p>Merci de vous être inscrit(e) sur <strong>Nissa Imane Tracker</strong>.</p>
        <p>Votre code de vérification est :</p>
        <div style="text-align:center;margin:24px 0;">
          <span style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#1a7f64;">${code}</span>
        </div>
        <p style="color:#666;font-size:13px;">Ce code expire dans 30 minutes. Si vous n'avez pas créé de compte, ignorez cet email.</p>
      </div>
    `;

    try {
      const sent = await this.sendEmail(to, subject, html);
      if (!sent) {
        this.logger.warn(`[NO API KEY] Verification code for ${to}: ${code}`);
      }
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${to}`, error);
      this.logger.warn(`[FALLBACK] Verification code for ${to}: ${code}`);
    }
  }

  async sendPasswordResetEmail(to: string, firstName: string, resetUrl: string): Promise<void> {
    const subject = 'Réinitialisation de mot de passe – Nissa Imane Tracker';
    const html = `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
        <h2 style="color:#1a7f64;">Assalamu Alaikum ${firstName},</h2>
        <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
        <p style="text-align:center;margin:24px 0;">
          <a href="${resetUrl}" style="background:#1a7f64;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:bold;">
            Réinitialiser mon mot de passe
          </a>
        </p>
        <p style="color:#666;font-size:13px;">Ce lien expire dans 30 minutes. Si vous n'avez pas fait cette demande, ignorez cet email.</p>
      </div>
    `;

    try {
      const sent = await this.sendEmail(to, subject, html);
      if (!sent) {
        this.logger.warn(`[NO API KEY] Reset URL for ${to}: ${resetUrl}`);
      }
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${to}`, error);
      this.logger.warn(`[FALLBACK] Reset URL for ${to}: ${resetUrl}`);
    }
  }
}
