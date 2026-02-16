import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('debug/email-config')
  getEmailConfig() {
    const brevoKey = this.configService.get<string>('BREVO_API_KEY');
    const fromAddr = this.configService.get<string>('EMAIL_FROM_ADDRESS');
    const fromName = this.configService.get<string>('EMAIL_FROM_NAME');
    return {
      brevoKeySet: !!brevoKey,
      brevoKeyPrefix: brevoKey ? brevoKey.substring(0, 8) + '...' : null,
      fromAddress: fromAddr ?? 'rikiatouhassansale@gmail.com (default)',
      fromName: fromName ?? 'Nissa Imane Tracker (default)',
    };
  }
}
