import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  port: parseInt(process.env.PORT ?? '3333', 10),
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  apiPrefix: process.env.API_PREFIX ?? 'api',
}));
