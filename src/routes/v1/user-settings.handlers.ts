import type { FastifyReply, FastifyRequest } from "fastify";
import {
    readBackupSettings,
    saveBackupSettings,
} from "../../services/user-settings.service.js";

type UpsertBackupSettingsBody = {
    enabled: boolean;
    retentionDays?: number;
};

function requireSubjectId(request: FastifyRequest): string {
    const subjectId = (request.user as { sub?: string } | undefined)?.sub;
    if (!subjectId) {
        throw request.server.httpErrors.unauthorized("Missing token subject");
    }
    return subjectId;
}

export async function putBackupSettingsHandler(
    request: FastifyRequest<{ Body: UpsertBackupSettingsBody }>,
    reply: FastifyReply
) {
    const subjectId = requireSubjectId(request);
    const settings = await saveBackupSettings({
        subjectId,
        enabled: request.body.enabled,
        retentionDays: request.body.retentionDays,
    });
    reply.code(200);
    return settings;
}

export async function getBackupSettingsHandler(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const subjectId = requireSubjectId(request);
    const settings = await readBackupSettings(subjectId);
    reply.code(200);
    return settings;
}
