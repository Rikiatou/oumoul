import { Injectable } from '@nestjs/common';
import {
  Coordinates,
  PrayerTimes,
  CalculationMethod,
  Madhab,
  HighLatitudeRule,
  SunnahTimes,
  Prayer,
} from 'adhan';
import tzLookup from 'tz-lookup';
import {
  CalculationMethodOption,
  GetPrayerTimesDto,
  HighLatitudeRuleOption,
  MadhabOption,
} from './dto/get-prayer-times.dto';

@Injectable()
export class PrayerService {
  async getPrayerTimes(dto: GetPrayerTimesDto) {
    const latitude = dto.latitude;
    const longitude = dto.longitude;
    const timeZone = dto.timeZone ?? tzLookup(latitude, longitude);

    const date = dto.date ? new Date(dto.date) : new Date();
    if (Number.isNaN(date.getTime())) {
      throw new Error('Invalid date provided');
    }

    const calculationParameters = this.buildCalculationParameters(dto);

    const coordinates = new Coordinates(latitude, longitude);
    const prayerTimes = new PrayerTimes(coordinates, date, calculationParameters);
    const sunnahTimes = new SunnahTimes(prayerTimes);

    const dailyTimes = {
      fajr: this.formatDate(prayerTimes.fajr, timeZone),
      sunrise: this.formatDate(prayerTimes.sunrise, timeZone),
      dhuhr: this.formatDate(prayerTimes.dhuhr, timeZone),
      asr: this.formatDate(prayerTimes.asr, timeZone),
      maghrib: this.formatDate(prayerTimes.maghrib, timeZone),
      isha: this.formatDate(prayerTimes.isha, timeZone),
    };

    const qiyam = this.formatDate(sunnahTimes.lastThirdOfTheNight, timeZone);
    const middleOfNight = this.formatDate(sunnahTimes.middleOfTheNight, timeZone);

    const currentPrayer = prayerTimes.currentPrayer();
    const nextPrayer = prayerTimes.nextPrayer();

    const currentPrayerTime = currentPrayer
      ? this.formatDate(prayerTimes.timeForPrayer(currentPrayer)!, timeZone)
      : null;
    const nextPrayerTime = nextPrayer
      ? this.formatDate(prayerTimes.timeForPrayer(nextPrayer)!, timeZone)
      : null;

    return {
      location: {
        latitude,
        longitude,
        timeZone,
      },
      date: this.formatDate(date, timeZone),
      method: dto.method ?? CalculationMethodOption.MuslimWorldLeague,
      madhab: dto.madhab ?? MadhabOption.Shafi,
      highLatitudeRule: dto.highLatitudeRule ?? HighLatitudeRuleOption.MiddleOfTheNight,
      adjustments: {
        fajr: calculationParameters.adjustments.fajr,
        sunrise: calculationParameters.adjustments.sunrise,
        dhuhr: calculationParameters.adjustments.dhuhr,
        asr: calculationParameters.adjustments.asr,
        maghrib: calculationParameters.adjustments.maghrib,
        isha: calculationParameters.adjustments.isha,
      },
      times: dailyTimes,
      sunnahTimes: {
        middleOfTheNight: middleOfNight,
        lastThirdOfTheNight: qiyam,
      },
      currentPrayer: currentPrayer ? Prayer[currentPrayer] : null,
      currentPrayerTime,
      nextPrayer: nextPrayer ? Prayer[nextPrayer] : null,
      nextPrayerTime,
    };
  }

  private buildCalculationParameters(dto: GetPrayerTimesDto): ReturnType<typeof CalculationMethod.MuslimWorldLeague> {
    const method = dto.method ?? CalculationMethodOption.MuslimWorldLeague;
    const factory = this.methodMap[method] ?? CalculationMethod.MuslimWorldLeague;
    const params = factory();

    params.madhab = dto.madhab ? this.madhabMap[dto.madhab] : Madhab.Shafi;
    params.highLatitudeRule = dto.highLatitudeRule
      ? this.highLatitudeRuleMap[dto.highLatitudeRule]
      : params.highLatitudeRule;

    if (dto.fajrAdjustment !== undefined) params.adjustments.fajr = dto.fajrAdjustment;
    if (dto.dhuhrAdjustment !== undefined) params.adjustments.dhuhr = dto.dhuhrAdjustment;
    if (dto.asrAdjustment !== undefined) params.adjustments.asr = dto.asrAdjustment;
    if (dto.maghribAdjustment !== undefined) params.adjustments.maghrib = dto.maghribAdjustment;
    if (dto.ishaAdjustment !== undefined) params.adjustments.isha = dto.ishaAdjustment;

    return params;
  }

  private formatDate(date: Date, timeZone: string) {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).formatToParts(date);

    const map = new Map(parts.map((part) => [part.type, part.value]));

    return `${map.get('year')}-${map.get('month')}-${map.get('day')}T${map.get('hour')}:${map.get('minute')}:${map.get('second')}`;
  }

  private readonly methodMap: Record<CalculationMethodOption, () => ReturnType<typeof CalculationMethod.MuslimWorldLeague>> = {
    [CalculationMethodOption.MuslimWorldLeague]: CalculationMethod.MuslimWorldLeague,
    [CalculationMethodOption.Egyptian]: CalculationMethod.Egyptian,
    [CalculationMethodOption.Karachi]: CalculationMethod.Karachi,
    [CalculationMethodOption.UmmAlQura]: CalculationMethod.UmmAlQura,
    [CalculationMethodOption.Dubai]: CalculationMethod.Dubai,
    [CalculationMethodOption.Kuwait]: CalculationMethod.Kuwait,
    [CalculationMethodOption.Qatar]: CalculationMethod.Qatar,
    [CalculationMethodOption.Singapore]: CalculationMethod.Singapore,
    [CalculationMethodOption.Turkey]: CalculationMethod.Turkey,
    [CalculationMethodOption.NorthAmerica]: CalculationMethod.NorthAmerica,
    [CalculationMethodOption.Other]: CalculationMethod.Other,
  };

  private readonly madhabMap: Record<MadhabOption, (typeof Madhab)[keyof typeof Madhab]> = {
    [MadhabOption.Shafi]: Madhab.Shafi,
    [MadhabOption.Hanafi]: Madhab.Hanafi,
  };

  private readonly highLatitudeRuleMap: Record<HighLatitudeRuleOption, (typeof HighLatitudeRule)[keyof typeof HighLatitudeRule]> = {
    [HighLatitudeRuleOption.MiddleOfTheNight]: HighLatitudeRule.MiddleOfTheNight,
    [HighLatitudeRuleOption.SeventhOfTheNight]: HighLatitudeRule.SeventhOfTheNight,
    [HighLatitudeRuleOption.AngleBased]: HighLatitudeRule.TwilightAngle,
  };
}
