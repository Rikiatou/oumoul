import { IsEmail, IsString, Length } from 'class-validator';

export class VerifyEmailDto {
  @IsEmail()
  readonly email: string;

  @IsString()
  @Length(6, 6)
  readonly code: string;
}
