import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly apiKey: string | undefined;
  private readonly senderEmail: string;
  private readonly senderName: string;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('RESEND_API_KEY') ?? this.configService.get<string>('BREVO_API_KEY');
    this.senderEmail = this.configService.get<string>('EMAIL_FROM_ADDRESS') ?? 'onboarding@resend.dev';
    this.senderName = this.configService.get<string>('EMAIL_FROM_NAME') ?? 'SIRAT AN-NOUR';

    if (!this.apiKey) {
      this.logger.warn('RESEND_API_KEY not set – emails will only be logged');
    }
  }

  private async sendEmail(to: string, subject: string, html: string): Promise<boolean> {
    if (!this.apiKey) {
      return false;
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${this.senderName} <${this.senderEmail}>`,
        to: [to],
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Resend ${response.status}: ${body}`);
    }

    const data = await response.json();
    this.logger.log(`Email sent to ${to} (id: ${data.id})`);
    return true;
  }

  async sendVerificationEmail(to: string, firstName: string, code: string): Promise<void> {
    const subject = 'Vérifiez votre adresse email – Sirat An-Nour';
    const html = `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
        <h2 style="color:#1a7f64;">Assalamu Alaikum ${firstName},</h2>
        <p>Merci de vous être inscrit(e) sur <strong>Sirat An-Nour</strong>.</p>
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

  async sendPasswordResetOtp(to: string, firstName: string, code: string): Promise<void> {
    const subject = 'Réinitialisation de mot de passe – Sirat An-Nour';
    const html = `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
        <h2 style="color:#1a7f64;">Assalamu Alaikum ${firstName},</h2>
        <p>Vous avez demandé la réinitialisation de votre mot de passe.</p>
        <p>Votre code de vérification est :</p>
        <div style="text-align:center;margin:24px 0;">
          <span style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#1a7f64;">${code}</span>
        </div>
        <p style="color:#666;font-size:13px;">Ce code expire dans 30 minutes. Si vous n'avez pas fait cette demande, ignorez cet email.</p>
      </div>
    `;

    try {
      const sent = await this.sendEmail(to, subject, html);
      if (!sent) {
        this.logger.warn(`[NO API KEY] Reset code for ${to}: ${code}`);
      }
    } catch (error) {
      this.logger.error(`Failed to send password reset OTP to ${to}`, error);
      this.logger.warn(`[FALLBACK] Reset code for ${to}: ${code}`);
    }
  }
}
