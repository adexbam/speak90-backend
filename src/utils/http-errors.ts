import type { FastifyRequest } from "fastify";

export function httpError(
    request: FastifyRequest,
    status: "badRequest" | "unauthorized" | "forbidden" | "notFound",
    message: string,
    code: string,
    details?: unknown[]
) {
    const err = request.server.httpErrors[status](message) as Error & {
        code?: string;
        details?: unknown[];
    };
    err.code = code;
    err.details = details ?? [];
    return err;
}
