import { PrismaClient } from "@prisma/client";
import { dhikrSeedCategories } from "./seed-data/dhikr/index";

const prisma = new PrismaClient();

async function seedDhikr() {
  // Clear existing Dhikr data so we can recreate a clean, curated set.
  await prisma.dhikrRecord.deleteMany();
  await prisma.dhikrEntry.deleteMany();
  await prisma.dhikrCategory.deleteMany();

  for (const category of dhikrSeedCategories) {
    await prisma.dhikrCategory.create({
      data: {
        name: category.name.fr,
        description: category.description?.fr ?? null,
        order: category.order,
        entries: {
          create: category.entries.map((entry) => ({
            title: entry.title.fr,
            arabicText: entry.arabicText,
            translit: entry.transliteration,
            translation: entry.translation.fr,
            source: entry.source,
            order: entry.order,
          })),
        },
      },
    });
  }
}

async function main() {
  await seedDhikr();
}

main()
  .catch((error) => {
    console.error("Dhikr seed failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
