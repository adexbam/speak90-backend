import type { FastifyRequest } from "fastify";

export function requireSubjectId(request: FastifyRequest): string {
    const subjectId = (request.user as { sub?: string } | undefined)?.sub;
    if (!subjectId) {
        throw request.server.httpErrors.unauthorized("Missing token subject");
    }
    return subjectId;
}
