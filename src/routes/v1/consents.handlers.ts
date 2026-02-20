import type { FastifyReply, FastifyRequest } from "fastify";
import {
    readAudioCloudConsent,
    saveAudioCloudConsent,
} from "../../services/consent.service.js";

type UpsertAudioCloudConsentBody = {
    decision: "granted" | "denied";
    decidedAt: string;
    policyVersion: string;
};

function requireSubjectId(request: FastifyRequest): string {
    const subjectId = (request.user as { sub?: string } | undefined)?.sub;
    if (!subjectId) {
        throw request.server.httpErrors.unauthorized("Missing token subject");
    }
    return subjectId;
}

export async function postAudioCloudConsentHandler(
    request: FastifyRequest<{ Body: UpsertAudioCloudConsentBody }>,
    reply: FastifyReply
) {
    const subjectId = requireSubjectId(request);
    const consent = await saveAudioCloudConsent({
        subjectId,
        decision: request.body.decision,
        decidedAt: request.body.decidedAt,
        policyVersion: request.body.policyVersion,
    });
    reply.code(200);
    return consent;
}

export async function getAudioCloudConsentHandler(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const subjectId = requireSubjectId(request);
    const consent = await readAudioCloudConsent(subjectId);
    reply.code(200);
    return consent;
}
