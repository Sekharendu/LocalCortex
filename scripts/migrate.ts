// Applies pending SQL migrations from migrations/ in filename order, each in its own
// transaction, and records them in schema_migrations. Safe to re-run: applied files are
// skipped. Usage: pnpm db:migrate
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool, withTransaction, DATABASE_URL } from "../src/db.js";

const MIGRATIONS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "migrations");

async function main(): Promise<void> {
  await pool.query(
    "CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())",
  );
  const applied = new Set(
    (await pool.query<{ name: string }>("SELECT name FROM schema_migrations")).rows.map((r) => r.name),
  );
  const files = (await fs.readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith(".sql")).sort();
  const pending = files.filter((f) => !applied.has(f));

  console.log(`Database: ${DATABASE_URL.replace(/:[^:@/]+@/, ":***@")}`);
  if (pending.length === 0) {
    console.log(`Up to date (${files.length} migration(s) applied).`);
    return;
  }
  for (const file of pending) {
    const sql = await fs.readFile(path.join(MIGRATIONS_DIR, file), "utf8");
    await withTransaction(async (client) => {
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
    });
    console.log(`Applied ${file}`);
  }
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
