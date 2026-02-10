import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterAuthDto {
  @IsString()
  readonly firstName: string;

  @IsString()
  readonly lastName: string;

  @IsEmail()
  readonly email: string;

  @IsString()
  @MinLength(8)
  readonly password: string;

  @IsOptional()
  @IsString()
  readonly locale?: string;
}
