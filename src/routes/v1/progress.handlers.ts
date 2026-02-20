import type { FastifyReply, FastifyRequest } from "fastify";
import { readProgress, saveProgress } from "../../services/progress.service.js";
import { requireSubjectId } from "../../services/request-auth.service.js";

type PutProgressBody = {
    currentDay: number;
    streak: number;
    totalMinutes: number;
    sessionsCompleted: number[];
    updatedAt: string;
};

export async function putProgressHandler(
    request: FastifyRequest<{ Body: PutProgressBody }>,
    reply: FastifyReply
) {
    const subjectId = requireSubjectId(request);
    const progress = await saveProgress({
        subjectId,
        currentDay: request.body.currentDay,
        streak: request.body.streak,
        totalMinutes: request.body.totalMinutes,
        sessionsCompleted: request.body.sessionsCompleted,
        updatedAt: new Date(request.body.updatedAt).toISOString(),
    });
    reply.code(200);
    return progress;
}

export async function getProgressHandler(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const subjectId = requireSubjectId(request);
    const progress = await readProgress(subjectId);
    reply.code(200);
    return progress;
}
