import "dotenv/config";
import { defineConfig } from "drizzle-kit";

// Vite expands ${VAR} references in .env, but the bare dotenv loader used here does
// not — so a composed DATABASE_URL reaches drizzle-kit as a literal "postgresql://
// ${DATABASE_USER}:..." and fails to connect. Expand it ourselves rather than pull
// in dotenv-expand for four lines.
const databaseUrl = (process.env.DATABASE_URL ?? "").replace(
  /\$\{(\w+)\}/g,
  (_, key) => process.env[key] ?? "",
);

export default defineConfig({
  schema: ["./src/db/schema.ts", "./src/db/auth-schema.ts"],
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: databaseUrl },
});