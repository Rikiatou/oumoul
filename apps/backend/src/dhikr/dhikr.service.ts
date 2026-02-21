import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDhikrRecordDto } from './dto/create-dhikr-record.dto';
import { UpdateDhikrRecordDto } from './dto/update-dhikr-record.dto';
import { dhikrSeedCategories } from '../../prisma/seed-data/dhikr/index';

@Injectable()
export class DhikrService {
  private readonly logger = new Logger(DhikrService.name);

  constructor(private readonly prisma: PrismaService) {}

  async listCategories() {
    try {
      const existing = await this.prisma.dhikrCategory.count();
      if (existing === 0) {
        await this.bootstrapDefaults();
      }

      return this.prisma.dhikrCategory.findMany({
        orderBy: { order: 'asc' },
        include: { entries: { orderBy: { order: 'asc' } } },
      });
    } catch (error) {
      this.logger.error('Error loading dhikr categories', error);
      return [];
    }
  }

  listRecords(userId: string, entryId?: string) {
    return this.prisma.dhikrRecord.findMany({
      where: {
        userId,
        ...(entryId ? { entryId } : {}),
      },
      include: { entry: { include: { category: true } } },
      orderBy: { notedAt: 'desc' },
    });
  }

  async upsertRecord(userId: string, dto: CreateDhikrRecordDto) {
    await this.ensureEntryExists(dto.entryId);

    return this.prisma.dhikrRecord.upsert({
      where: { userId_entryId: { userId, entryId: dto.entryId } },
      create: {
        userId,
        entryId: dto.entryId,
        count: dto.count,
        notes: dto.notes,
      },
      update: {
        count: dto.count,
        notes: dto.notes ?? null,
        notedAt: new Date(),
      },
      include: { entry: { include: { category: true } } },
    });
  }

  async updateRecord(userId: string, id: string, dto: UpdateDhikrRecordDto) {
    const record = await this.findOwnedRecord(userId, id);

    return this.prisma.dhikrRecord.update({
      where: { id: record.id },
      data: {
        ...(dto.count !== undefined ? { count: dto.count } : {}),
        notes: dto.notes !== undefined ? dto.notes : record.notes,
        notedAt: new Date(),
      },
      include: { entry: { include: { category: true } } },
    });
  }

  async deleteRecord(userId: string, id: string) {
    const record = await this.findOwnedRecord(userId, id);
    await this.prisma.dhikrRecord.delete({ where: { id: record.id } });
    return { deleted: true };
  }

  private async bootstrapDefaults() {
    try {
      await this.prisma.$transaction(async (tx) => {
        const matin = await tx.dhikrCategory.create({
          data: {
            name: 'Dhikr du matin',
            description: 'Formules recommandées après le Fajr et en début de journée.',
            order: 1,
          },
        });

        const soir = await tx.dhikrCategory.create({
          data: {
            name: 'Dhikr du soir',
            description: `Formules recommandées après Al-‘Asr/Maghrib pour clôturer la journée.`,
            order: 2,
          },
        });

        const apresSalat = await tx.dhikrCategory.create({
          data: {
            name: 'Après la salat',
            description: 'Dhikr à répéter après chaque prière obligatoire.',
            order: 3,
          },
        });

        const ramadan = await tx.dhikrCategory.create({
          data: {
            name: 'Duas de Ramadan',
            description: 'Invocations liées au jeûne, à la nuit de Qadr et aux moments forts du mois.',
            order: 4,
          },
        });

        const sensibles = await tx.dhikrCategory.create({
          data: {
            name: 'Périodes sensibles',
            description: `Duas pour les règles, l’anxiété, la peur, les épreuves.`,
            order: 5,
          },
        });

        const quotidien = await tx.dhikrCategory.create({
          data: {
            name: 'Vie quotidienne',
            description: 'Duas pour le sommeil, le réveil, le voyage, la maison, etc.',
            order: 6,
          },
        });

        const hisnCategory = await tx.dhikrCategory.create({
          data: {
            name: 'Hisn al Muslim (arabe)',
            description: 'Invocations de Hisn al Muslim en arabe, avec références.',
            order: 7,
          },
        });

        await tx.dhikrEntry.createMany({
          data: [
            {
              categoryId: matin.id,
              title: 'Dhikr du matin – SubhanAllah, Alhamdoulillah, Allahu Akbar',
              arabicText: 'سُبْحَانَ اللّٰهِ وَالْحَمْدُ لِلّٰهِ وَاللّٰهُ أَكْبَرُ',
              translit: 'Subḥānallāh, al-ḥamdu lillāh, Allāhu akbar',
              translation: 'Gloire à Allah, la louange est à Allah, Allah est le Plus Grand.',
              source: 'Dhikr général, recommandé dans de nombreux hadiths.',
              order: 1,
            },
            {
              categoryId: matin.id,
              title: 'Invocation du matin – Radītu billāhi rabban',
              arabicText: 'رَضِيتُ بِاللّٰهِ رَبًّا وَبِالإِسْلَامِ دِينًا وَبِمُحَمَّدٍ نَبِيًّا',
              translit: 'Raḍītu billāhi rabban, wa bil-islāmi dīnan, wa bi Muḥammadin nabiyyā.',
              translation: `Je suis satisfait d’Allah comme Seigneur, de l’Islam comme religion et de Muhammad comme Prophète.`,
              source: 'Hadith rapporté par Abu Dawud et At-Tirmidhi.',
              order: 2,
            },
            {
              categoryId: soir.id,
              title: 'Dhikr du soir – Ayat al-Kursi',
              arabicText: 'اللّٰهُ لَا إِلٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ...',
              translit: 'Allāhu lā ilāha illā huwa al-ḥayyul-qayyūm…',
              translation: 'Le verset du Trône (Ayat al-Kursi).',
              source: 'Sahih al-Bukhari 2311, protection en soirée.',
              order: 1,
            },
            {
              categoryId: soir.id,
              title: 'Dhikr du soir – Trois fois Qul Huwa Allahu Ahad',
              arabicText: 'قُلْ هُوَ اللّٰهُ أَحَدٌ (3 مرات)',
              translit: 'Qul huwa Allāhu aḥad (3 fois).',
              translation: 'Dire la sourate Al-Ikhlās trois fois.',
              source: 'Recommandé dans les adhkār du matin et du soir.',
              order: 2,
            },
            {
              categoryId: apresSalat.id,
              title: 'Tasbih après salat – 33/33/34',
              arabicText: 'سُبْحَانَ اللّٰهِ، الْحَمْدُ لِلّٰهِ، اللّٰهُ أَكْبَرُ',
              translit: 'Subḥānallāh (33x), al-ḥamdu lillāh (33x), Allāhu akbar (34x)',
              translation: '33 fois SubhanAllah, 33 fois Alhamdoulillah, 34 fois Allahu Akbar.',
              source: 'Sahih Muslim 597.',
              order: 1,
            },
            {
              categoryId: ramadan.id,
              title: `Dua à l’iftar`,
              arabicText: 'ذَهَبَ الظَّمَأُ وَابْتَلَّتِ الْعُرُوقُ وَثَبَتَ الْأَجْرُ إِنْ شَاءَ اللّٰهُ',
              translit: 'Dhahaba adh-dhamaʼ, wabtallati al-ʻurūq, wa thabata al-ajru inshāʼ Allāh.',
              translation: 'La soif est partie, les veines sont humidifiées et la récompense est confirmée, si Allah le veut.',
              source: 'Abu Dawud 2357.',
              order: 1,
            },
            {
              categoryId: ramadan.id,
              title: 'Dua pour la nuit de Qadr',
              arabicText: 'اللّٰهُمَّ إِنَّكَ عَفُوٌّ تُحِبُّ العَفْوَ فَاعْفُ عَنِّي',
              translit: 'Allāhumma innaka ʻafuwwun tuḥibbu al-ʻafwa faʻfu ʻannī.',
              translation: 'Ô Allah, Tu es Pardonneur et Tu aimes le pardon, alors pardonne-moi.',
              source: 'Hadith rapporté par At-Tirmidhi.',
              order: 2,
            },
            {
              categoryId: sensibles.id,
              title: `Dua en cas d’angoisse`,
              arabicText: 'اللّٰهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحُزْنِ، وَأَعُوذُ بِكَ مِنَ الْعَجْزِ وَالْكَسَلِ',
              translit: 'Allāhumma innī aʻūdhu bika mina al-hammi wal-ḥuzn, wa aʻūdhu bika mina al-ʻajzi wal-kasal…',
              translation: `Ô Allah, je cherche refuge auprès de Toi contre l’angoisse et la tristesse, contre l’incapacité et la paresse…`,
              source: 'Sahih al-Bukhari 6369.',
              order: 1,
            },
            {
              categoryId: sensibles.id,
              title: `Dua en période d’épreuve`,
              arabicText: 'حَسْبُنَا اللّٰهُ وَنِعْمَ الوَكِيلُ',
              translit: `Ḥasbunā Allāhu wa ni'ma al-wakīl.`,
              translation: 'Allah nous suffit, Il est le Meilleur des garants.',
              source: `Sourate Al ‘Imrān, verset 173.`,
              order: 2,
            },
            {
              categoryId: quotidien.id,
              title: 'Dua avant de dormir',
              arabicText: 'بِاسْمِكَ اللّٰهُمَّ أَمُوتُ وَأَحْيَا',
              translit: 'Bismika Allāhumma amūtu wa aḥyā.',
              translation: `C’est en Ton nom, ô Allah, que je meurs et que je vis.`,
              source: 'Sahih al-Bukhari 7394.',
              order: 1,
            },
            {
              categoryId: quotidien.id,
              title: 'Dua en entrant dans la maison',
              arabicText: 'بِسْمِ اللّٰهِ وَلَجْنَا وَبِسْمِ اللّٰهِ خَرَجْنَا وَعَلَى اللّٰهِ رَبِّنَا تَوَكَّلْنَا',
              translit: `Bismillāhi walajnā, wa bismillāhi kharajnā, wa ‘alā Allāhi Rabbina tawakkalnā.`,
              translation: `Au nom d’Allah nous entrons, au nom d’Allah nous sortons, et en Allah, notre Seigneur, nous plaçons notre confiance.`,
              source: 'Abu Dawud 5096.',
              order: 2,
            },
            {
              categoryId: sensibles.id,
              title: `Protection des enfants – A‘īdhukumā bi kalimāti-llāh`,
              arabicText: 'أُعِيذُكُمَا بِكَلِمَاتِ اللّٰهِ التَّامَّاتِ، مِنْ كُلِّ شَيْطَانٍ وَهَامَّةٍ، وَمِنْ كُلِّ عَيْنٍ لَامَّةٍ',
              translit: 'U‘īdhukumā bi kalimāti-llāhi t-tāmmati min kulli shayṭānin wa hāmmah, wa min kulli ‘aynin lāmmah.',
              translation: `Je vous mets sous la protection des paroles parfaites d’Allah, contre tout diable et toute bête nuisible, et contre tout œil envieux.`,
              source: 'Hadith de Ibn ‘Abbās sur al-Ḥassan et al-Ḥussein – Bukhari 4/119.',
              order: 3,
            },
            {
              categoryId: sensibles.id,
              title: `Visite au malade – Lā ba‘sa ṭahūr(in) in shā‘ Allāh`,
              arabicText: 'لَا بَأْسَ طَهُورٌ إِنْ شَاءَ اللّٰهُ',
              translit: 'Lā ba‘sa ṭahūrun in shā‘ Allāh.',
              translation: `Pas de mal, c’est une purification si Allah le veut.`,
              source: 'Bukhari avec al-Fatḥ 10/118.',
              order: 4,
            },
            {
              categoryId: sensibles.id,
              title: `Visite au malade – As‘alu-llāh al-‘Aẓīm an yashfiyaka`,
              arabicText: 'أَسْأَلُ اللّٰهَ الْعَظِيمَ رَبَّ الْعَرْشِ الْعَظِيمِ أَنْ يَشْفِيَكَ',
              translit: 'As‘alu-llāha al-‘aẓīma rabba al-‘arshi al-‘aẓīmi an yashfiyaka.',
              translation: 'Je demande à Allah, le Très-Grand, Seigneur du Trône immense, de te guérir.',
              source: 'Hadith rapporté par at-Tirmidhi et Abu Dawud – dire 7 fois.',
              order: 5,
            },
            {
              categoryId: sensibles.id,
              title: 'Dua contre la tristesse et la faiblesse',
              arabicText: 'اللّٰهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ، وَأَعُوذُ بِكَ مِنَ الْعَجْزِ وَالْكَسَلِ، وَأَعُوذُ بِكَ مِنَ الْجُبْنِ وَالْبُخْلِ، وَأَعُوذُ بِكَ مِنْ غَلَبَةِ الدَّيْنِ وَقَهْرِ الرِّجَالِ',
              translit: 'Allāhumma innī a‘ūdhu bika mina al-hammi wal-ḥazan, wa a‘ūdhu bika mina al-‘ajzi wal-kasal, wa a‘ūdhu bika mina al-jubni wal-bukhl, wa a‘ūdhu bika min ghalabati d-dayni wa qahri r-rijāl.',
              translation: `Ô Allah, je cherche refuge auprès de Toi contre l’angoisse et la tristesse, contre l’incapacité et la paresse, contre la lâcheté et l’avarice, et contre le poids de la dette et la domination des hommes.`,
              source: 'Sahih al-Bukhari.',
              order: 6,
            },
            {
              categoryId: sensibles.id,
              title: 'Dua de guérison – Adhhibi l-ba‘sa rabba n-nās',
              arabicText: 'اللّٰهُمَّ رَبَّ النَّاسِ، أَذْهِبِ الْبَأْسَ، اشْفِ أَنْتَ الشَّافِي، لَا شِفَاءَ إِلَّا شِفَاؤُكَ، شِفَاءً لَا يُغَادِرُ سَقَمًا',
              translit: 'Allāhumma rabba n-nāsi, adhhibi l-ba‘sa, ishfi anta sh-shāfī, lā shifā‘a illā shifā‘uka, shifā‘an lā yughādiru saqaman.',
              translation: `Ô Allah, Seigneur des gens, fais disparaître le mal. Guéris, c’est Toi le Guérisseur. Il n’y a de guérison que Ta guérison, une guérison qui ne laisse aucune maladie.`,
              source: 'Sahih al-Bukhari et Muslim.',
              order: 7,
            },
            {
              categoryId: sensibles.id,
              title: "Dua d'apaisement – Lā ilāha illā Anta subḥānaka",
              arabicText: 'لَا إِلٰهَ إِلَّا أَنْتَ، سُبْحَانَكَ، إِنِّي كُنْتُ مِنَ الظَّالِمِينَ',
              translit: 'Lā ilāha illā anta, subḥānaka, innī kuntu mina ẓ-ẓālimīn.',
              translation: `Il n’y a pas de divinité en droit d’être adorée en dehors de Toi. Gloire à Toi, j’ai été vraiment parmi les injustes.`,
              source: `Invocation de Yunus (Jonas) – Qur’an 21:87, recommandée en cas de détresse.`,
              order: 8,
            },
            {
              categoryId: sensibles.id,
              title: 'Dua pour son/sa conjoint(e) – Khayrihā wa sharrihā',
              arabicText: 'اللّٰهُمَّ إِنِّي أَسْأَلُكَ مِنْ خَيْرِهَا وَخَيْرِ مَا جَبَلْتَهَا عَلَيْهِ، وَأَعُوذُ بِكَ مِنْ شَرِّهَا وَشَرِّ مَا جَبَلْتَهَا عَلَيْهِ',
              translit: 'Allāhumma innī as‘aluka min khayrihā wa khayri mā jabalttahā ‘alayh, wa a‘ūdhu bika min sharrihā wa sharri mā jabalttahā ‘alayh.',
              translation: `Ô Allah, je Te demande le bien de mon épouse (ou époux) et le bien de ce pour quoi Tu l’as créée, et je cherche refuge auprès de Toi contre son mal et le mal de ce pour quoi Tu l’as créée.`,
              source: `Hadith sur la dua pour l’épouse ou le serviteur – Abu Dawud, Ibn Mājah.`,
              order: 9,
            },
            {
              categoryId: sensibles.id,
              title: 'Protection générale – Bismillāh alladhī lā yaḍurru',
              arabicText: 'بِسْمِ اللّٰهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ',
              translit: 'Bismillāhi lladhī lā yaḍurru ma‘a ismihī shay‘un fī l-arḍi wa lā fī s-samā‘, wa huwa s-samī‘u l-‘alīm.',
              translation: `Au nom d’Allah, avec le Nom duquel rien ne peut nuire sur la terre ni dans le ciel, et Il est l’Audient, l’Omniscient.`,
              source: 'Qui la dit matin et soir trois fois est protégé de tout mal – hadith authentique.',
              order: 10,
            },
            {
              categoryId: sensibles.id,
              title: `Protection générale – A‘ūdhu bi kalimātillāh at-tāmmāt`,
              arabicText: 'أَعُوذُ بِكَلِمَاتِ اللّٰهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ',
              translit: 'A‘ūdhu bi kalimāti llāhi t-tāmmāti min sharri mā khalaq.',
              translation: `Je cherche refuge auprès des paroles parfaites d’Allah contre le mal de ce qu’Il a créé.`,
              source: 'Dua de protection dite le soir ou en entrant dans un lieu – hadith authentique.',
              order: 11,
            },
            {
              categoryId: sensibles.id,
              title: 'Mawlāy, multiplie mes repentirs',
              arabicText: 'رَبِّ اغْفِرْ لِي وَتُبْ عَلَيَّ، إِنَّكَ أَنْتَ التَّوَّابُ الرَّحِيمُ',
              translit: 'Rabb-ighfir lī wa tub ʿalayya, innaka anta t-tawwābu r-raḥīm.',
              translation: `Seigneur, pardonne-moi et accepte mon repentir. C’est Toi, en vérité, le grand Accueillant au repentir, le Très Miséricordieux.`,
              source: 'Formule de repentir tirée des invocations du Prophète ﷺ.',
              order: 12,
            },
          ],
        });
      });
    } catch (error) {
      this.logger.error('Error bootstrapping dhikr categories', error);
    }
  }

  async seedCategories(): Promise<{ added: number; updated: number }> {
    let added = 0;
    let updated = 0;
    for (const cat of dhikrSeedCategories) {
      const existing = await this.prisma.dhikrCategory.findFirst({ where: { name: cat.name.fr } });
      let categoryId: string;
      if (!existing) {
        const created = await this.prisma.dhikrCategory.create({
          data: { name: cat.name.fr, description: cat.description?.fr ?? null, order: cat.order },
        });
        categoryId = created.id;
        added++;
      } else {
        await this.prisma.dhikrCategory.update({
          where: { id: existing.id },
          data: { description: cat.description?.fr ?? null, order: cat.order },
        });
        categoryId = existing.id;
        updated++;
      }
      for (const entry of cat.entries) {
        const existingEntry = await this.prisma.dhikrEntry.findFirst({
          where: { categoryId, title: entry.title.fr },
        });
        if (!existingEntry) {
          await this.prisma.dhikrEntry.create({
            data: {
              categoryId,
              title: entry.title.fr,
              arabicText: entry.arabicText,
              translit: entry.transliteration,
              translation: entry.translation.fr,
              source: entry.source,
              order: entry.order,
            },
          });
        }
      }
    }
    return { added, updated };
  }

  private async ensureEntryExists(entryId: string) {
    const entry = await this.prisma.dhikrEntry.findUnique({ where: { id: entryId } });
    if (!entry) {
      throw new NotFoundException(`Dhikr entry not found: ${entryId}`);
    }
  }

  private async findOwnedRecord(userId: string, id: string) {
    const record = await this.prisma.dhikrRecord.findUnique({
      where: { id },
      include: { entry: { include: { category: true } } },
    });
    if (!record || record.userId !== userId) {
      throw new NotFoundException(`Dhikr record not found or not owned by user: ${id}`);
    }
    return record;
  }
}
