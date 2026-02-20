import pino from "pino";
import type { FastifyBaseLogger } from "fastify";
import { getLoggerConfig } from "../config/pino.config.js";

const env = process.env.DEPLOYMENT_ENV || "dev";
const loggerConfig = getLoggerConfig(env);

let resolvedLogger;
if (loggerConfig === false) {
    resolvedLogger = pino({ level: "silent" });
} else {
    resolvedLogger = pino(loggerConfig);
}

export const logger = resolvedLogger;

export const ALLOWED_LOG_LEVELS = [
    "fatal",
    "error",
    "warn",
    "info",
    "debug",
    "trace",
] as const;

export type LogLevel = (typeof ALLOWED_LOG_LEVELS)[number];

const EVENT_LEVELS: Record<string, LogLevel> = {
    "http.request.started": "info",
    "http.request.completed": "info",
    "http.request.failed": "error",
    "error.operational": "warn",
    "error.database": "warn",
    "error.validation": "warn",
    "error.authentication": "warn",
    "error.unexpected": "error",
    "auth.user.authenticated": "info",
    "auth.token.verification_failed": "warn",
    "db.connection.testing": "info",
    "db.connection.success": "info",
    "db.connection.failed": "error",
    "db.connection.closed": "info",
    "ssm.fetch.started": "info",
    "ssm.fetch.invalid_params": "warn",
    "ssm.fetch.completed": "info",
    "ssm.fetch.failed": "error",
    "health.db.failed": "warn",
    "security.cors.allowlist.empty": "warn",
    "app.starting": "info",
    "app.started": "info",
    "app.start.failed": "error",
    "app.shutdown.initiated": "info",
    "app.shutdown.completed": "info",
    "prize_campaign.listed": "info",
    "prize_campaign.listed_paginated": "info",
    "prize_campaign.created": "info",
    "prize_campaign.listed_by_year_type": "info",
    "prize_campaign.listed_by_year_type_paginated": "info",
    "prize_campaign.fetched": "info",
    "prize_campaign.updated": "info",
    "prize_campaign.patched": "info",
    "prize_campaign.prizes.replaced": "info",
    "prize_campaign.prize.updated": "info",
    "prize_campaign.deleted": "info",
    "upload.file.failed": "error",
    "upload.file.missing": "warn",
    "upload.file.succeeded": "info",
};

function resolveLevel(event: string, obj?: Record<string, unknown>): LogLevel {
    if (event === "http.request.completed") {
        const status = (obj?.http as { status?: number } | undefined)?.status;
        if (typeof status === "number" && status >= 400) return "warn";
    }
    return EVENT_LEVELS[event] || "info";
}

type LogTarget = Pick<
    FastifyBaseLogger,
    "fatal" | "error" | "warn" | "info" | "debug" | "trace"
>;

export function logEvent(
    target: LogTarget,
    event: string,
    obj: Record<string, unknown>,
    msg: string
): void {
    const level = resolveLevel(event, obj);
    target[level]({ ...obj, event }, msg);
}
