import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
    initRequestContext,
    setRequestContext,
} from "../utils/request-context.js";
import { logEvent } from "../utils/logger.js";

const createRequestId = (): string => {
    return (
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15)
    );
};

// Endpoints that should not be logged (health, favicon, root)
const SKIP_LOGGING_ENDPOINTS = new Set([
    "/healthcheck",
    "/health/db",
    "/favicon.ico",
    "/",
    "/openapi.json",
]);

const SKIP_LOGGING_PREFIXES = ["/reference"];

const shouldSkipLogging = (url: string): boolean => {
    return (
        SKIP_LOGGING_ENDPOINTS.has(url) ||
        SKIP_LOGGING_PREFIXES.some((prefix) => url.startsWith(prefix))
    );
};

const onRequest = async (
    request: FastifyRequest,
    _reply: FastifyReply
): Promise<void> => {
    const requestId = createRequestId();
    const startTime = Date.now();

    // Add request ID to request context for use in other handlers
    request.requestContext = { requestId, startTime };
    initRequestContext({
        requestId,
        http: {
            method: request.method,
            path: request.url,
            user_agent: request.headers["user-agent"],
            client_ip: request.ip,
        },
    });

    // Skip logging for certain endpoints
    if (shouldSkipLogging(request.url)) {
        return;
    }

    logEvent(
        request.log,
        "http.request.started",
        {
            request_id: requestId,
            http: {
                method: request.method,
                path: request.url,
                user_agent: request.headers["user-agent"],
                client_ip: request.ip,
            },
            user: (request as any).user
                ? { id: (request as any).user?.sub }
                : {},
            data: {},
        },
        "Request started"
    );
};

const ensureRequestContext = (request: FastifyRequest): {
    requestId: string;
    startTime: number;
} => {
    if (request.requestContext) {
        return request.requestContext;
    }
    const ctx = { requestId: "unknown", startTime: Date.now() };
    request.requestContext = ctx;
    return ctx;
};

const onResponse = async (
    request: FastifyRequest,
    reply: FastifyReply
): Promise<void> => {
    const ctx = ensureRequestContext(request);
    const durationMs = Date.now() - ctx.startTime;
    setRequestContext({
        durationMs,
        http: {
            route: request.routeOptions?.url,
            status: reply.statusCode,
        },
    });

    // Skip logging for certain endpoints
    if (shouldSkipLogging(request.url)) {
        return;
    }

    const logData = {
        event: "http.request.completed",
        request_id: ctx.requestId,
        duration_ms: durationMs,
        http: {
            method: request.method,
            path: request.url,
            route: request.routeOptions?.url,
            status: reply.statusCode,
            user_agent: request.headers["user-agent"],
            client_ip: request.ip,
        },
        user: (request as any).user ? { id: (request as any).user?.sub } : {},
        data: {},
    };

    const message =
        reply.statusCode >= 400
            ? "Request completed with error status"
            : "Request completed";
    logEvent(request.log, "http.request.completed", logData, message);
};

const onError = async (
    request: FastifyRequest,
    _reply: FastifyReply,
    error: Error
): Promise<void> => {
    const ctx = ensureRequestContext(request);
    const durationMs = Date.now() - ctx.startTime;
    setRequestContext({
        durationMs,
        http: {
            route: request.routeOptions?.url,
            status: _reply.statusCode,
        },
    });

    // Still log errors for health endpoints since they're important
    if (shouldSkipLogging(request.url)) {
        if (request.url === "/healthcheck" || request.url === "/health/db") {
            logEvent(
                request.log,
                "http.request.failed",
                {
                    request_id: ctx.requestId,
                    duration_ms: durationMs,
                    http: {
                        method: request.method,
                        path: request.url,
                    },
                    user: (request as any).user
                        ? { id: (request as any).user?.sub }
                        : {},
                    data: {},
                    error: {
                        type: error.name,
                        message: error.message,
                    },
                },
                "Health endpoint error"
            );
        }
        return;
    }

    logEvent(
        request.log,
        "http.request.failed",
        {
            request_id: ctx.requestId,
            duration_ms: durationMs,
            http: {
                method: request.method,
                path: request.url,
                route: request.routeOptions?.url,
                user_agent: request.headers["user-agent"],
                client_ip: request.ip,
            },
            user: (request as any).user
                ? { id: (request as any).user?.sub }
                : {},
            data: {},
            error: {
                type: error.name,
                message: error.message,
                stack: error.stack,
            },
        },
        "Request failed"
    );
};

export const registerRequestLogger = (app: FastifyInstance): void => {
    app.addHook("onRequest", onRequest);
    app.addHook("onResponse", onResponse);
    app.addHook("onError", onError);
};
