import { PrismaClient, TafsirLanguage } from "@prisma/client";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const prisma = new PrismaClient();

interface JsonTafsirEntry {
  surah: number;
  ayahFrom: number;
  ayahTo?: number;
  text: string;
}

interface JsonTafsirSource {
  sourceKey: string;
  sourceName: string;
  author?: string;
  language: "FR" | "EN" | "AR";
  entries: JsonTafsirEntry[];
}

async function main() {
  const dirPath = resolve(__dirname, "../src/assets/tafsir");
  const files = readdirSync(dirPath).filter((file) => file.endsWith(".json"));

  for (const file of files) {
    const filePath = resolve(dirPath, file);
    const raw = readFileSync(filePath, "utf8");
    const sources = JSON.parse(raw) as JsonTafsirSource[];

    for (const src of sources) {
      const language = TafsirLanguage[src.language as keyof typeof TafsirLanguage];

      const source = await prisma.tafsirSource.upsert({
        where: { key: src.sourceKey },
        update: {
          name: src.sourceName,
          author: src.author ?? null,
          language,
        },
        create: {
          key: src.sourceKey,
          name: src.sourceName,
          author: src.author ?? null,
          language,
        },
      });

      for (const entry of src.entries) {
        await prisma.tafsirEntry.create({
          data: {
            sourceId: source.id,
            surah: entry.surah,
            ayahFrom: entry.ayahFrom,
            ayahTo: entry.ayahTo ?? null,
            language,
            text: entry.text,
          },
        });
      }
    }
  }
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error("Error while seeding tafsir:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
