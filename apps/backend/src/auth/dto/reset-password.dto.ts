import { IsEmail, IsString, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsEmail()
  readonly email: string;

  @IsString()
  @MinLength(6)
  readonly code: string;

  @IsString()
  @MinLength(8)
  readonly password: string;
}
