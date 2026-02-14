import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend;
  private readonly from: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    if (!apiKey) {
      this.logger.warn('RESEND_API_KEY not set – emails will only be logged');
    }
    this.resend = new Resend(apiKey ?? '');
    this.from = this.configService.get<string>('EMAIL_FROM') ?? "Oumoul's App <onboarding@resend.dev>";
  }

  async sendVerificationEmail(to: string, firstName: string, code: string): Promise<void> {
    const subject = "Vérifiez votre adresse email – Oumoul's App";
    const html = `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;">
        <h2 style="color:#1a7f64;">Assalamu Alaikum ${firstName},</h2>
        <p>Merci de vous être inscrit(e) sur <strong>Oumoul's App</strong>.</p>
        <p>Votre code de vérification est :</p>
        <div style="text-align:center;margin:24px 0;">
          <span style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#1a7f64;">${code}</span>
        </div>
        <p style="color:#666;font-size:13px;">Ce code expire dans 30 minutes. Si vous n'avez pas créé de compte, ignorez cet email.</p>
      </div>
    `;

    try {
      const { error } = await this.resend.emails.send({ from: this.from, to, subject, html });
      if (error) throw error;
      this.logger.log(`Verification email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${to}`, error);
      this.logger.warn(`[FALLBACK] Verification code for ${to}: ${code}`);
    }
  }

  async sendPasswordResetEmail(to: string, firstName: string, resetUrl: string): Promise<void> {
    const subject = "Réinitialisation de mot de passe – Oumoul's App";
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
      const { error } = await this.resend.emails.send({ from: this.from, to, subject, html });
      if (error) throw error;
      this.logger.log(`Password reset email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${to}`, error);
      this.logger.warn(`[FALLBACK] Reset URL for ${to}: ${resetUrl}`);
    }
  }
}
