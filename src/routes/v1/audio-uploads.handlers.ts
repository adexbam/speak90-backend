import type { FastifyReply, FastifyRequest } from "fastify";
import {
    assertAudioCloudAccess,
    deleteAudioRecording,
    getAudioRecordingList,
    purgeAudioRecordings,
    uploadAudioRecording,
} from "../../services/audio-upload.service.js";

type UploadBody = Record<string, unknown>;
type PurgeBody = { retentionDays?: number };
type DeleteParams = { uploadId: string };

function requireSubjectId(request: FastifyRequest): string {
    const subjectId = (request.user as { sub?: string } | undefined)?.sub;
    if (!subjectId) {
        throw request.server.httpErrors.unauthorized("Missing token subject");
    }
    return subjectId;
}

function getMultipartField(body: UploadBody, name: string): unknown {
    const raw = body?.[name];
    if (raw && typeof raw === "object" && "value" in raw) {
        return (raw as { value: unknown }).value;
    }
    return raw;
}

function parseRequiredString(
    request: FastifyRequest,
    body: UploadBody,
    fieldName: string
): string {
    const value = getMultipartField(body, fieldName);
    if (typeof value !== "string" || value.trim().length === 0) {
        throw request.server.httpErrors.badRequest(
            `${fieldName} is required and must be a non-empty string`
        );
    }
    return value.trim();
}

function parseRequiredInteger(
    request: FastifyRequest,
    body: UploadBody,
    fieldName: string,
    min?: number
): number {
    const raw = getMultipartField(body, fieldName);
    const parsed =
        typeof raw === "number"
            ? raw
            : typeof raw === "string"
              ? Number.parseInt(raw, 10)
              : Number.NaN;
    if (!Number.isInteger(parsed)) {
        throw request.server.httpErrors.badRequest(
            `${fieldName} is required and must be an integer`
        );
    }
    if (typeof min === "number" && parsed < min) {
        throw request.server.httpErrors.badRequest(
            `${fieldName} must be >= ${min}`
        );
    }
    return parsed;
}

function parseOptionalInteger(
    request: FastifyRequest,
    body: UploadBody,
    fieldName: string,
    min?: number,
    max?: number
): number | undefined {
    const raw = getMultipartField(body, fieldName);
    if (raw === undefined || raw === null || raw === "") {
        return undefined;
    }
    const parsed =
        typeof raw === "number"
            ? raw
            : typeof raw === "string"
              ? Number.parseInt(raw, 10)
              : Number.NaN;
    if (!Number.isInteger(parsed)) {
        throw request.server.httpErrors.badRequest(
            `${fieldName} must be an integer`
        );
    }
    if (typeof min === "number" && parsed < min) {
        throw request.server.httpErrors.badRequest(
            `${fieldName} must be >= ${min}`
        );
    }
    if (typeof max === "number" && parsed > max) {
        throw request.server.httpErrors.badRequest(
            `${fieldName} must be <= ${max}`
        );
    }
    return parsed;
}

function parseRequiredDateTime(
    request: FastifyRequest,
    body: UploadBody,
    fieldName: string
): string {
    const value = parseRequiredString(request, body, fieldName);
    if (Number.isNaN(Date.parse(value))) {
        throw request.server.httpErrors.badRequest(
            `${fieldName} must be an ISO date-time string`
        );
    }
    const parsed = new Date(value);
    const now = Date.now();
    if (parsed.getTime() > now + 5 * 60 * 1000) {
        throw request.server.httpErrors.badRequest(
            `${fieldName} must not be in the far future`
        );
    }
    if (parsed.getUTCFullYear() < 2010) {
        throw request.server.httpErrors.badRequest(
            `${fieldName} is outside allowed range`
        );
    }
    return parsed.toISOString();
}

export async function postAudioUploadHandler(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const subjectId = requireSubjectId(request);
    const body = (request.body || {}) as UploadBody;
    const access = await assertAudioCloudAccess(request, subjectId);

    const upload = await uploadAudioRecording(request, {
        subjectId,
        dayNumber: parseRequiredInteger(request, body, "dayNumber", 1),
        sectionId: parseRequiredString(request, body, "sectionId"),
        createdAt: parseRequiredDateTime(request, body, "createdAt"),
        durationMs: parseRequiredInteger(request, body, "durationMs", 1),
        retentionDays:
            parseOptionalInteger(request, body, "retentionDays", 1, 3650) ??
            access.retentionDays,
    });

    reply.code(201);
    return upload;
}

export async function getAudioUploadsHandler(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const subjectId = requireSubjectId(request);
    await assertAudioCloudAccess(request, subjectId);
    const uploads = await getAudioRecordingList(subjectId);
    reply.code(200);
    return uploads;
}

export async function deleteAudioUploadHandler(
    request: FastifyRequest<{ Params: DeleteParams }>,
    reply: FastifyReply
) {
    const subjectId = requireSubjectId(request);
    await assertAudioCloudAccess(request, subjectId);
    const result = await deleteAudioRecording({
        request,
        subjectId,
        uploadId: request.params.uploadId,
    });
    reply.code(200);
    return result;
}

export async function purgeAudioUploadsHandler(
    request: FastifyRequest<{ Body: PurgeBody }>,
    reply: FastifyReply
) {
    const subjectId = requireSubjectId(request);
    await assertAudioCloudAccess(request, subjectId);
    const result = await purgeAudioRecordings({
        request,
        subjectId,
        retentionDays: request.body?.retentionDays,
    });
    reply.code(200);
    return result;
}
