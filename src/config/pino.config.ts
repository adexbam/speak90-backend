import pino, { type LoggerOptions } from "pino";
import { getRequestContext } from "../utils/request-context.js";

const SERVICE_NAME = process.env.SERVICE_NAME || "content-delegation-backend";
const VERSION = process.env.APP_VERSION || "1.0.0";

function getBaseConfig(): LoggerOptions {
    return {
        base: {
            service: SERVICE_NAME,
            env: process.env.DEPLOYMENT_ENV || "dev",
            version: VERSION,
            instance_id: process.env.INSTANCE_ID || "unknown",
        },
        hooks: {
            logMethod(args, method) {
                const msg =
                    typeof args[1] === "string"
                        ? args[1]
                        : typeof (args[0] as any)?.msg === "string"
                          ? (args[0] as any).msg
                          : typeof (args[0] as any)?.message === "string"
                            ? (args[0] as any).message
                            : undefined;
                if (msg?.startsWith("Server listening at")) {
                    return;
                }
                method.apply(this, args as Parameters<typeof method>);
            },
        },
        mixin: () => {
            const ctx = getRequestContext();
            return {
                request_id: ctx?.requestId ?? null,
                duration_ms: ctx?.durationMs ?? null,
                http: ctx?.http ?? {},
                user: ctx?.user ?? {},
                data: {},
                error: null,
            };
        },
        timestamp: () => `,"timestamp":"${new Date().toISOString()}"`,
        messageKey: "message",
        formatters: {
            level: (label: string, number: number) => ({
                level: label,
                level_num: number,
            }),
        },
    };
}

// Explicit stdout destination for single-line JSON output
export const pinoDestination = pino.destination(1);

export const envToLogger: Record<string, LoggerOptions | false> = {
    local: {
        ...getBaseConfig(),
        level: "debug",
        transport: {
            target: "pino-pretty",
            options: {
                translateTime: "HH:MM:ss Z",
                ignore: "pid,hostname,reqId",
                colorize: true,
            },
        },
    },
    dev: {
        ...getBaseConfig(),
        level: "info",
        transport: undefined, // Explicitly no transport = single-line JSON
    },
    production: {
        ...getBaseConfig(),
        level: "info",
        transport: undefined, // Explicitly no transport = single-line JSON
    },
    test: false,
};

export function getLoggerConfig(env: string): LoggerOptions | false {
    switch (env) {
        case "production":
        case "prod":
            return envToLogger.production;
        case "dev":
            return envToLogger.dev;
        case "local":
            return envToLogger.local;
        case "test":
            return envToLogger.test;
        default:
            return envToLogger.dev;
    }
}
