import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST') ?? 'smtp.gmail.com';
    const port = Number(this.configService.get('SMTP_PORT') ?? 587);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (!user || !pass) {
      this.logger.warn('SMTP_USER / SMTP_PASS not set – emails will only be logged');
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: user && pass ? { user, pass } : undefined,
    });
  }

  async sendVerificationEmail(to: string, firstName: string, code: string): Promise<void> {
    const from = this.configService.get<string>('SMTP_FROM') ?? this.configService.get<string>('SMTP_USER') ?? 'noreply@oumoul.app';
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
      await this.transporter.sendMail({ from, to, subject, html });
      this.logger.log(`Verification email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${to}`, error);
      // Log the code so it can still be used in dev/testing
      this.logger.warn(`[FALLBACK] Verification code for ${to}: ${code}`);
    }
  }

  async sendPasswordResetEmail(to: string, firstName: string, resetUrl: string): Promise<void> {
    const from = this.configService.get<string>('SMTP_FROM') ?? this.configService.get<string>('SMTP_USER') ?? 'noreply@oumoul.app';
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
      await this.transporter.sendMail({ from, to, subject, html });
      this.logger.log(`Password reset email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${to}`, error);
      this.logger.warn(`[FALLBACK] Reset URL for ${to}: ${resetUrl}`);
    }
  }
}
