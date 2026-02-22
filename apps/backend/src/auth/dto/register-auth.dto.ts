import { IsEmail, IsOptional, IsString, MinLength, Matches } from 'class-validator';

export class RegisterAuthDto {
  @IsString()
  readonly firstName: string;

  @IsString()
  readonly lastName: string;

  @IsEmail()
  readonly email: string;

  @IsString()
  @MinLength(8, { message: 'Le mot de passe doit contenir au moins 8 caractères' })
  @Matches(/^(?=.*[a-z])/, { message: 'Le mot de passe doit contenir au moins une lettre minuscule' })
  @Matches(/^(?=.*[A-Z])/, { message: 'Le mot de passe doit contenir au moins une lettre majuscule' })
  @Matches(/^(?=.*\d)/, { message: 'Le mot de passe doit contenir au moins un chiffre' })
  readonly password: string;

  @IsOptional()
  @IsString()
  readonly locale?: string;
}
