import { Injectable, InternalServerErrorException } from '@nestjs/common';

export interface HadithItem {
  collection: string;
  hadithNumber: string;
  text: string;
  reference?: string;
}

@Injectable()
export class HadithService {
  private readonly topics: Record<string, HadithItem[]> = {
    patience: [
      {
        collection: 'Riyad as-Salihin',
        hadithNumber: '36',
        text:
          '« Sache que ce qui t’a atteint ne pouvait te manquer, et que ce qui t’a manqué ne pouvait t’atteindre. »',
        reference: 'Hadith rapporté par At-Tirmidhi',
      },
    ],
    tawakkul: [
      {
        collection: 'Sahih al-Bukhari',
        hadithNumber: '6405',
        text:
          '« Si vous placiez votre confiance en Allah comme il se doit, Il vous accorderait votre subsistance comme Il la donne à l’oiseau : il part le matin le ventre vide et revient le soir rassasié. »',
        reference: 'Sahih al-Bukhari',
      },
    ],
    regles: [
      {
        collection: 'Sahih Muslim',
        hadithNumber: '333',
        text:
          "« Fais tout ce que fait le non-jeûneur sauf le tawaf autour de la Ka'ba. » (conseil du Prophète ﷺ à une femme en période de menstrues.)",
        reference: 'Sahih Muslim',
      },
    ],
    ramadan: [
      {
        collection: 'Sahih al-Bukhari',
        hadithNumber: '1901',
        text:
          '« Celui qui jeûne le mois de Ramadan avec foi et en recherchant la récompense verra ses péchés passés pardonnés. »',
        reference: 'Sahih al-Bukhari',
      },
    ],
    famille: [
      {
        collection: 'Riyad as-Salihin',
        hadithNumber: '295',
        text:
          '« Le meilleur d’entre vous est celui qui est le meilleur envers sa famille, et je suis le meilleur d’entre vous envers ma famille. »',
        reference: 'Hadith authentique',
      },
    ],
  };

  async getRandomHadith(topic?: string): Promise<HadithItem> {
    const chosenTopic = topic && this.topics[topic] ? topic : 'patience';
    const apiKey = process.env.SUNNAH_API_KEY;

    if (apiKey) {
      const fromExternal = await this.fetchFromSunnah(chosenTopic, apiKey);
      if (fromExternal) {
        return fromExternal;
      }
    }

    const list = this.topics[chosenTopic];
    if (!list || list.length === 0) {
      throw new InternalServerErrorException('Aucun hadith disponible pour ce thème.');
    }
    const index = Math.floor(Math.random() * list.length);
    return list[index];
  }

  private async fetchFromSunnah(topic: string, apiKey: string): Promise<HadithItem | null> {
    // Mapping simple : chaque thème est associé à un hadith précis chez Sunnah.com
    // (collection + numéro). Cela pourra être enrichi plus tard.
    const mapping: Record<string, { collection: string; hadithNumber: string }> = {
      patience: { collection: 'riyadussalihin', hadithNumber: '36' },
      tawakkul: { collection: 'bukhari', hadithNumber: '6405' },
      regles: { collection: 'muslim', hadithNumber: '333' },
      ramadan: { collection: 'bukhari', hadithNumber: '1901' },
      famille: { collection: 'riyadussalihin', hadithNumber: '295' },
    };

    const config = mapping[topic];
    if (!config) {
      return null;
    }

    const url = `https://api.sunnah.com/v1/hadiths/${config.collection}/${config.hadithNumber}`;

    const response = await fetch(url, {
      headers: {
        'X-API-Key': apiKey,
      },
    });

    if (!response.ok) {
      return null;
    }

    const json = (await response.json()) as any;

    // La structure exacte dépend de l’API Sunnah.com.
    // On essaie d’en extraire un texte principal de façon défensive.
    const hadithText: string | undefined =
      json?.hadith?.[0]?.body || json?.hadith?.[0]?.text || json?.text || json?.body;

    if (!hadithText) {
      return null;
    }

    return {
      collection: json?.collection || config.collection,
      hadithNumber: config.hadithNumber,
      text: hadithText,
      reference: json?.reference,
    };
  }
}
