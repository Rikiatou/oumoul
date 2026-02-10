import { Injectable, InternalServerErrorException } from '@nestjs/common';

export interface RamadanDay {
  day: number;
  gregorianDate: string; // YYYY-MM-DD
  hijriDate: string; // YYYY-MM-DD (hijri)
}

export interface HijriCalendarDay {
  day: number;
  gregorianDate: string; // YYYY-MM-DD
  hijriDate: string; // YYYY-MM-DD (hijri)
  hijriMonth: {
    number: number;
    en: string;
  };
}

@Injectable()
export class AladhanService {
  private readonly baseUrl = 'https://api.aladhan.com/v1';

  async getRamadanDaysByCity(options: {
    hijriYear: number;
    city: string;
    country: string;
    method?: number;
  }): Promise<RamadanDay[]> {
    const { hijriYear, city, country, method = 2 } = options;

    // Ramadan = 9ème mois du calendrier hijri
    const ramadanMonth = 9;

    const url = new URL(
      `${this.baseUrl}/hijriCalendarByCity/${hijriYear}/${ramadanMonth}`,
    );
    url.searchParams.set('city', city);
    url.searchParams.set('country', country);
    url.searchParams.set('method', String(method));

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new InternalServerErrorException('Erreur lors de la récupération du calendrier de Ramadan.');
    }

    const json = (await response.json()) as {
      code: number;
      status: string;
      data: Array<{
        date: {
          readable: string;
          timestamp: string;
          gregorian: { date: string };
          hijri: { date: string; month: { number: number; en: string } };
        };
      }>;
    };

    if (!json.data || !Array.isArray(json.data)) {
      throw new InternalServerErrorException('Réponse inattendue de AlAdhan pour le calendrier de Ramadan.');
    }

    const days: RamadanDay[] = json.data.map((entry, index) => {
      const gregDate = entry.date.gregorian.date; // ex: 2025-03-01
      const hijriDate = entry.date.hijri.date.replace(/\//g, '-'); // ex: 1446-09-01
      return {
        day: index + 1,
        gregorianDate: gregDate,
        hijriDate,
      };
    });

    return days;
  }

  async getHijriCalendarByCity(options: {
    hijriYear: number;
    hijriMonth: number;
    city: string;
    country: string;
    method?: number;
  }): Promise<HijriCalendarDay[]> {
    const { hijriYear, hijriMonth, city, country, method = 2 } = options;

    const url = new URL(`${this.baseUrl}/hijriCalendarByCity/${hijriYear}/${hijriMonth}`);
    url.searchParams.set('city', city);
    url.searchParams.set('country', country);
    url.searchParams.set('method', String(method));

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new InternalServerErrorException('Erreur lors de la récupération du calendrier Hijri.');
    }

    const json = (await response.json()) as {
      code: number;
      status: string;
      data: Array<{
        date: {
          gregorian: { date: string };
          hijri: { date: string; month: { number: number; en: string } };
        };
      }>;
    };

    if (!json.data || !Array.isArray(json.data)) {
      throw new InternalServerErrorException('Réponse inattendue de AlAdhan pour le calendrier Hijri.');
    }

    return json.data.map((entry, index) => {
      const gregorianDate = entry.date.gregorian.date;
      const hijriDate = entry.date.hijri.date.replace(/\//g, '-');
      return {
        day: index + 1,
        gregorianDate,
        hijriDate,
        hijriMonth: {
          number: entry.date.hijri.month.number,
          en: entry.date.hijri.month.en,
        },
      };
    });
  }

  async getQiblaDirection(latitude: number, longitude: number): Promise<{ direction: number }> {
    const url = new URL(`${this.baseUrl}/qibla/${latitude}/${longitude}`);

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new InternalServerErrorException("Erreur lors de la récupération de la Qibla.");
    }

    const json = (await response.json()) as {
      code: number;
      status: string;
      data: {
        latitude: number;
        longitude: number;
        direction: number;
      };
    };

    if (!json.data) {
      throw new InternalServerErrorException('Réponse inattendue de AlAdhan pour la Qibla.');
    }

    return { direction: json.data.direction };
  }
}
