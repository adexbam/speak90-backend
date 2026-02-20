import type { FastifyReply, FastifyRequest } from "fastify";
import {
    assertAudioCloudAccess,
    deleteAudioRecording,
    getAudioRecordingList,
    purgeAudioRecordings,
    uploadAudioRecording,
} from "../../services/audio-upload.service.js";
import {
    parseAudioUploadRequest,
    parseRetentionDaysFromBody,
} from "../../services/audio-upload-request.service.js";
import { requireSubjectId } from "../../services/request-auth.service.js";

type DeleteParams = { uploadId: string };

export async function postAudioUploadHandler(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const subjectId = requireSubjectId(request);
    const parsed = parseAudioUploadRequest(request);
    const access = await assertAudioCloudAccess(request, subjectId);

    const upload = await uploadAudioRecording(request, {
        subjectId,
        dayNumber: parsed.dayNumber,
        sectionId: parsed.sectionId,
        createdAt: parsed.createdAt,
        durationMs: parsed.durationMs,
        retentionDays: parsed.retentionDays ?? access.retentionDays,
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
    request: FastifyRequest,
    reply: FastifyReply
) {
    const params = request.params as DeleteParams;
    const subjectId = requireSubjectId(request);
    await assertAudioCloudAccess(request, subjectId);
    const result = await deleteAudioRecording({
        request,
        subjectId,
        uploadId: params.uploadId,
    });
    reply.code(200);
    return result;
}

export async function purgeAudioUploadsHandler(
    request: FastifyRequest,
    reply: FastifyReply
) {
    const subjectId = requireSubjectId(request);
    await assertAudioCloudAccess(request, subjectId);
    const result = await purgeAudioRecordings({
        request,
        subjectId,
        retentionDays: parseRetentionDaysFromBody(request),
    });
    reply.code(200);
    return result;
}
