import type { FastifyReply, FastifyRequest } from "fastify";

export async function rootHandler(
    _request: FastifyRequest,
    reply: FastifyReply
) {
    reply.send({
        message: "Speak90 Backend API",
        version: "1.0.0",
        docs: "/reference",
    });
}

export async function faviconHandler(
    _request: FastifyRequest,
    reply: FastifyReply
) {
    reply.status(204);
}

export async function healthcheckHandler() {
    return { ok: true, ts: Date.now() };
}

