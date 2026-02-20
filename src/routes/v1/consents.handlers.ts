import type { FastifyReply, FastifyRequest } from "fastify";
import {
    readAudioCloudConsent,
    saveAudioCloudConsent,
} from "../../services/consent.service.js";
import { requireSubjectId } from "../../services/request-auth.service.js";

type UpsertAudioCloudConsentBody = {
    decision: "granted" | "denied";
    decidedAt: string;
    policyVersion: string;
};

export async function postAudioCloudConsentHandler(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const body = request.body as UpsertAudioCloudConsentBody;
    const subjectId = requireSubjectId(request);
    const consent = await saveAudioCloudConsent({
        subjectId,
        decision: body.decision,
        decidedAt: body.decidedAt,
        policyVersion: body.policyVersion,
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
