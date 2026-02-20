import type { FastifyReply, FastifyRequest } from "fastify";
import {
    readBackupSettings,
    saveBackupSettings,
} from "../../services/user-settings.service.js";
import { requireSubjectId } from "../../services/request-auth.service.js";

type UpsertBackupSettingsBody = {
    enabled: boolean;
    retentionDays?: number;
};

export async function putBackupSettingsHandler(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const body = request.body as UpsertBackupSettingsBody;
    const subjectId = requireSubjectId(request);
    const settings = await saveBackupSettings({
        subjectId,
        enabled: body.enabled,
        retentionDays: body.retentionDays,
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
