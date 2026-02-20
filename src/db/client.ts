import { Pool } from "pg";
import { logEvent, logger } from "../utils/logger.js";

let pool: Pool | null = null;

function resolveDatabaseUrl(): string {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        throw new Error("DATABASE_URL environment variable is not set");
    }
    return databaseUrl;
}

export async function initializeDb(): Promise<void> {
    if (pool) {
        return;
    }

    const connectionString = resolveDatabaseUrl();
    const sslEnabled = process.env.DB_SSL === "true";

    pool = new Pool({
        connectionString,
        max: Number(process.env.DB_POOL_MAX || 10),
        idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT_MS || 30000),
        connectionTimeoutMillis: Number(process.env.DB_CONNECT_TIMEOUT_MS || 5000),
        ssl: sslEnabled ? { rejectUnauthorized: false } : undefined,
    });

    try {
        logEvent(logger, "db.connection.testing", { data: {} }, "Connecting to PostgreSQL");
        await pool.query("SELECT 1");
        logEvent(logger, "db.connection.success", { data: {} }, "PostgreSQL connection successful");
    } catch (error) {
        logEvent(
            logger,
            "db.connection.failed",
            {
                error: {
                    type: error instanceof Error ? error.name : "Error",
                    message: error instanceof Error ? error.message : String(error),
                },
            },
            "PostgreSQL connection failed"
        );
        await pool.end().catch(() => undefined);
        pool = null;
        throw error;
    }
}

export function getDbPool(): Pool {
    if (!pool) {
        throw new Error("Database pool is not initialized");
    }
    return pool;
}

export async function checkDbHealth(): Promise<{
    status: "healthy" | "unhealthy";
    timestamp?: string;
    error?: string;
}> {
    try {
        if (!pool) {
            return {
                status: "unhealthy",
                error: "PostgreSQL pool not initialized",
            };
        }

        await pool.query("SELECT 1");
        return {
            status: "healthy",
            timestamp: new Date().toISOString(),
        };
    } catch (error) {
        return {
            status: "unhealthy",
            error: error instanceof Error ? error.message : "Unknown error",
        };
    }
}

export async function closeDb(): Promise<void> {
    if (!pool) {
        return;
    }
    await pool.end();
    pool = null;
    logEvent(logger, "db.connection.closed", { data: {} }, "PostgreSQL connection closed");
}
