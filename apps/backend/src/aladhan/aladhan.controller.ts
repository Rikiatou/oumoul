import { Controller, Get, Query } from '@nestjs/common';
import { AladhanService, HijriCalendarDay, RamadanDay } from './aladhan.service';

@Controller('hijri')
export class AladhanController {
  constructor(private readonly aladhanService: AladhanService) {}

  @Get('ramadan')
  async getRamadanByCity(
    @Query('hijriYear') hijriYearParam?: string,
    @Query('city') city?: string,
    @Query('country') country?: string,
    @Query('method') methodParam?: string,
  ): Promise<{ year: number; city: string; country: string; days: RamadanDay[] }> {
    const hijriYear = Number(hijriYearParam) || new Date().getFullYear();
    const method = methodParam ? Number(methodParam) : undefined;

    const safeCity = city || 'Douala';
    const safeCountry = country || 'Cameroon';

    const days = await this.aladhanService.getRamadanDaysByCity({
      hijriYear,
      city: safeCity,
      country: safeCountry,
      method,
    });

    return { year: hijriYear, city: safeCity, country: safeCountry, days };
  }

  @Get('calendar')
  async getHijriCalendarByCity(
    @Query('hijriYear') hijriYearParam?: string,
    @Query('hijriMonth') hijriMonthParam?: string,
    @Query('city') city?: string,
    @Query('country') country?: string,
    @Query('method') methodParam?: string,
  ): Promise<{ year: number; month: number; city: string; country: string; days: HijriCalendarDay[] }> {
    const hijriYear = Number(hijriYearParam) || new Date().getFullYear();
    const hijriMonth = Number(hijriMonthParam) || 9;
    const method = methodParam ? Number(methodParam) : undefined;

    const safeCity = city || 'Douala';
    const safeCountry = country || 'Cameroon';

    const days = await this.aladhanService.getHijriCalendarByCity({
      hijriYear,
      hijriMonth,
      city: safeCity,
      country: safeCountry,
      method,
    });

    return { year: hijriYear, month: hijriMonth, city: safeCity, country: safeCountry, days };
  }
}
