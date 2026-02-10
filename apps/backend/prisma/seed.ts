import { PrismaClient } from "@prisma/client";
import "./seed-dhikr";
import "./seed-tafsir";

// Entry point used by `prisma db seed`.
// We simply instantiate Prisma so the imported seed scripts can run
// against the configured DATABASE_URL.

const prisma = new PrismaClient();

async function main() {
  // All work is done in the imported seed modules.
  // This function exists so Prisma has a valid `ts-node` entry.
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("Seed failed", error);
  process.exitCode = 1;
});
