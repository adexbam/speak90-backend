import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { Pool } from "pg";

config({ path: ".env", override: true, quiet: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.resolve(__dirname, "../migrations");

function resolveDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to run migrations");
  }
  return databaseUrl;
}

async function ensureMigrationsTable(pool: Pool): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

async function listMigrationFiles(): Promise<string[]> {
  const entries = await fs.readdir(migrationsDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map((entry) => entry.name)
    .sort();
}

async function loadAppliedVersions(pool: Pool): Promise<Set<string>> {
  const result = await pool.query<{ version: string }>(
    "SELECT version FROM schema_migrations ORDER BY version"
  );
  return new Set(result.rows.map((row) => row.version));
}

async function applyMigration(pool: Pool, fileName: string): Promise<void> {
  const migrationPath = path.join(migrationsDir, fileName);
  const sql = await fs.readFile(migrationPath, "utf8");

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query(
      "INSERT INTO schema_migrations(version) VALUES($1) ON CONFLICT (version) DO NOTHING",
      [fileName]
    );
    await client.query("COMMIT");
    // eslint-disable-next-line no-console
    console.log(`Applied migration: ${fileName}`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function main(): Promise<void> {
  const pool = new Pool({ connectionString: resolveDatabaseUrl() });

  try {
    await ensureMigrationsTable(pool);
    const files = await listMigrationFiles();
    const applied = await loadAppliedVersions(pool);

    for (const file of files) {
      if (applied.has(file)) {
        // eslint-disable-next-line no-console
        console.log(`Skipping migration (already applied): ${file}`);
        continue;
      }
      await applyMigration(pool, file);
    }

    // eslint-disable-next-line no-console
    console.log("Migrations complete.");
  } finally {
    await pool.end();
  }
}

void main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Migration failed:", error);
  process.exit(1);
});
