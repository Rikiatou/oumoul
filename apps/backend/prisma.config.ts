import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    // Use a backend-specific env var so we don't accidentally pick up a global DATABASE_URL (e.g. Supabase)
    url: env("BACKEND_DATABASE_URL"),
  },
});
