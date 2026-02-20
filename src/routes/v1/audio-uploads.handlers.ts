import type { FastifyReply, FastifyRequest } from "fastify";
import {
    assertAudioCloudAccess,
    getAudioRecordingList,
    uploadAudioRecording,
} from "../../services/audio-upload.service.js";

type UploadBody = Record<string, unknown>;

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
    fieldName: string
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
    return parsed;
}

function parseOptionalInteger(
    request: FastifyRequest,
    body: UploadBody,
    fieldName: string
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
    return new Date(value).toISOString();
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
        dayNumber: parseRequiredInteger(request, body, "dayNumber"),
        sectionId: parseRequiredString(request, body, "sectionId"),
        createdAt: parseRequiredDateTime(request, body, "createdAt"),
        durationMs: parseRequiredInteger(request, body, "durationMs"),
        retentionDays:
            parseOptionalInteger(request, body, "retentionDays") ??
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
