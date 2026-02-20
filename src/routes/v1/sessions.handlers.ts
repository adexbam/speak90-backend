import type { FastifyReply, FastifyRequest } from "fastify";
import { recordSessionCompletion } from "../../services/session-completion.service.js";

type PostSessionCompleteBody = {
    dayNumber: number;
    elapsedSeconds: number;
    completedAt: string;
};

function requireSubjectId(request: FastifyRequest): string {
    const subjectId = (request.user as { sub?: string } | undefined)?.sub;
    if (!subjectId) {
        throw request.server.httpErrors.unauthorized("Missing token subject");
    }
    return subjectId;
}

export async function postSessionCompleteHandler(
    request: FastifyRequest<{ Body: PostSessionCompleteBody }>,
    reply: FastifyReply
) {
    const subjectId = requireSubjectId(request);
    const result = await recordSessionCompletion({
        subjectId,
        dayNumber: request.body.dayNumber,
        elapsedSeconds: request.body.elapsedSeconds,
        completedAt: new Date(request.body.completedAt).toISOString(),
    });
    reply.code(201);
    return result;
}
