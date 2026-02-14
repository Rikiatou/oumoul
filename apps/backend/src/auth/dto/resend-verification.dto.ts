import { IsEmail } from 'class-validator';

export class ResendVerificationDto {
  @IsEmail()
  readonly email: string;
}
