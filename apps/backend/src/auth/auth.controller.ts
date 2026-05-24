import { Body, Controller, Delete, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RegisterAuthDto } from './dto/register-auth.dto';
import { LoginAuthDto } from './dto/login-auth.dto';
import { AuthService } from './auth.service';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { UpdatePushTokenDto } from './dto/update-push-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';
import { AuthGuard } from '@nestjs/passport';
import {
  CurrentUser,
  type AuthenticatedUser,
} from '../common/decorators/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() payload: RegisterAuthDto) {
    return this.authService.register(payload);
  }

  @Post('login')
  login(@Body() payload: LoginAuthDto) {
    return this.authService.login(payload);
  }

  @Post('verify-email')
  verifyEmail(@Body() payload: VerifyEmailDto) {
    return this.authService.verifyEmail(payload);
  }

  @Post('resend-verification')
  resendVerification(@Body() payload: ResendVerificationDto) {
    return this.authService.resendVerification(payload);
  }

  @Post('refresh')
  @ApiBearerAuth()
  refresh(@Body() payload: RefreshTokenDto) {
    return this.authService.refresh(payload);
  }

  @Post('forgot-password')
  forgotPassword(@Body() payload: ForgotPasswordDto) {
    return this.authService.forgotPassword(payload);
  }

  @Post('reset-password')
  resetPassword(@Body() payload: ResetPasswordDto) {
    return this.authService.resetPassword(payload);
  }

  @Post('push-token')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  registerPushToken(
    @CurrentUser() user: AuthenticatedUser,
    @Body() payload: UpdatePushTokenDto,
  ) {
    return this.authService.updatePushToken(
      user.userId,
      payload.pushToken,
      payload.platform,
    );
  }

  @Delete('account')
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  deleteAccount(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.deleteAccount(user.userId);
  }
}
