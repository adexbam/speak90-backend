import type { FastifyReply, FastifyRequest } from "fastify";
import { checkDbHealth } from "../../../db/client.js";
import { logEvent } from "../../../utils/logger.js";

export async function rootHandler(_request: FastifyRequest, reply: FastifyReply) {
    reply.send({
        message: "Speak90 Backend API",
        version: "1.0.0",
        docs: "/reference",
    });
}

export async function faviconHandler(_request: FastifyRequest, reply: FastifyReply) {
    reply.status(204);
}

export async function healthcheckHandler() {
    return { ok: true, ts: Date.now() };
}

export async function dbHealthHandler(request: FastifyRequest, reply: FastifyReply) {
    const dbHealth = await checkDbHealth();

    if (dbHealth.status === "unhealthy") {
        logEvent(
            request.log,
            "health.db.failed",
            {
                request_id: request.requestContext?.requestId,
                data: { status: dbHealth.status },
                error: {
                    type: "DatabaseHealthCheckError",
                    message: dbHealth.error || "Database health check failed",
                },
            },
            "Database health check failed"
        );
        reply.status(503);
    }

    return {
        status: dbHealth.status,
        timestamp: Date.now(),
        database: dbHealth,
    };
}
