import { ConflictException, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { randomBytes, createHash, randomInt } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { RegisterAuthDto } from './dto/register-auth.dto';
import { LoginAuthDto } from './dto/login-auth.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async register(payload: RegisterAuthDto) {
    const normalizedEmail = payload.email.toLowerCase();

    const existing = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await this.hashPassword(payload.password);

    try {
      const user = await this.prisma.user.create({
        data: {
          email: normalizedEmail,
          firstName: payload.firstName,
          lastName: payload.lastName,
          locale: payload.locale,
          passwordHash,
        },
      });

      await this.sendVerificationCode(user);

      return {
        message: 'Account created. Please check your email for the verification code.',
        user: {
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          locale: user.locale,
        },
      };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Email already registered');
      }

      throw error;
    }
  }

  async login(payload: LoginAuthDto) {
    const normalizedEmail = payload.email.toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(payload.password, user.passwordHash);

    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.emailVerifiedAt) {
      throw new ForbiddenException('Email not verified. Please check your inbox for the verification code.');
    }

    return this.buildAuthResponse(user);
  }

  async refresh(payload: RefreshTokenDto) {
    const hash = this.hashToken(payload.refreshToken);
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hash },
      include: { user: true },
    });

    if (!tokenRecord || tokenRecord.expiresAt.getTime() <= Date.now()) {
      if (tokenRecord) {
        await this.prisma.refreshToken.delete({ where: { tokenHash: hash } });
      }
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.prisma.refreshToken.delete({ where: { tokenHash: hash } });

    return this.buildAuthResponse(tokenRecord.user);
  }

  async updatePushToken(userId: string, pushToken: string, platform?: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        pushToken,
        pushPlatform: platform,
      },
    });

    return { success: true };
  }

  async verifyEmail(payload: VerifyEmailDto) {
    const normalizedEmail = payload.email.toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (!user) {
      throw new UnauthorizedException('Invalid email');
    }

    if (user.emailVerifiedAt) {
      return this.buildAuthResponse(user);
    }

    const codeHash = this.hashToken(payload.code);
    const tokenRecord = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash: codeHash },
    });

    if (!tokenRecord || tokenRecord.userId !== user.id || tokenRecord.expiresAt.getTime() <= Date.now()) {
      if (tokenRecord) {
        await this.prisma.emailVerificationToken.delete({ where: { id: tokenRecord.id } });
      }
      throw new UnauthorizedException('Invalid or expired verification code');
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { emailVerifiedAt: new Date() },
      }),
      this.prisma.emailVerificationToken.deleteMany({
        where: { userId: user.id },
      }),
    ]);

    return this.buildAuthResponse(user);
  }

  async resendVerification(payload: ResendVerificationDto) {
    const normalizedEmail = payload.email.toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (!user || user.emailVerifiedAt) {
      return { success: true };
    }

    await this.prisma.emailVerificationToken.deleteMany({ where: { userId: user.id } });
    await this.sendVerificationCode(user);

    return { success: true };
  }

  async forgotPassword(payload: ForgotPasswordDto) {
    const normalizedEmail = payload.email.toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true, firstName: true },
    });

    if (!user) {
      return { success: true };
    }

    const token = randomBytes(48).toString('hex');
    const tokenHash = this.hashToken(token);
    const ttlMinutes = Number(this.configService.get('PASSWORD_RESET_TOKEN_TTL_MINUTES') ?? 30);
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    await this.prisma.passwordResetToken.create({
      data: {
        tokenHash,
        expiresAt,
        userId: user.id,
      },
    });

    const appBaseUrl = this.configService.get<string>('WEB_APP_BASE_URL') ?? 'http://localhost:3000';
    const resetUrl = `${appBaseUrl}/auth/reset-password?token=${encodeURIComponent(token)}`;

    await this.emailService.sendPasswordResetEmail(user.email, user.firstName, resetUrl);

    return { success: true };
  }

  async resetPassword(payload: ResetPasswordDto) {
    const tokenHash = this.hashToken(payload.token);

    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!record || record.usedAt || record.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    const passwordHash = await this.hashPassword(payload.password);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { tokenHash },
        data: { usedAt: new Date() },
      }),
      this.prisma.refreshToken.deleteMany({
        where: { userId: record.userId },
      }),
    ]);

    return { success: true };
  }

  private async sendVerificationCode(user: User) {
    const code = String(randomInt(100000, 999999));
    const codeHash = this.hashToken(code);
    const ttlMinutes = Number(this.configService.get('EMAIL_VERIFICATION_TTL_MINUTES') ?? 30);
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    await this.prisma.emailVerificationToken.deleteMany({ where: { userId: user.id } });
    await this.prisma.emailVerificationToken.create({
      data: {
        tokenHash: codeHash,
        expiresAt,
        userId: user.id,
      },
    });

    await this.emailService.sendVerificationEmail(user.email, user.firstName, code);
  }

  private async hashPassword(plain: string) {
    const saltRounds = Number(this.configService.get('BCRYPT_SALT_ROUNDS') ?? 10);
    return bcrypt.hash(plain, saltRounds);
  }

  private async buildAuthResponse(user: User) {
    const tokens = await this.createSessionTokens(user);

    return {
      user: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        locale: user.locale,
      },
      ...tokens,
    };
  }

  private async createSessionTokens(user: User) {
    await this.prisma.refreshToken.deleteMany({
      where: {
        userId: user.id,
        expiresAt: { lt: new Date() },
      },
    });

    const accessToken = await this.jwtService.signAsync({
      sub: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    });

    const refreshToken = randomBytes(48).toString('hex');
    const refreshTokenHash = this.hashToken(refreshToken);
    const ttlDays = Number(this.configService.get('REFRESH_TOKEN_TTL_DAYS') ?? 30);
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: {
        tokenHash: refreshTokenHash,
        expiresAt,
        userId: user.id,
      },
    });

    return { accessToken, refreshToken };
  }

  private hashToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }
}
