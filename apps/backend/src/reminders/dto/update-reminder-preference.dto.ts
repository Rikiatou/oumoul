import { IsBoolean, IsOptional, Matches } from 'class-validator';

export class UpdateReminderPreferenceDto {
  @IsBoolean()
  isEnabled!: boolean;

  @IsOptional()
  @Matches(/^\d{2}:\d{2}$/)
  sendTime?: string;
}
