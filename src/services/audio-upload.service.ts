import type { FastifyRequest } from "fastify";
import {
    insertRecordingUpload,
    listRecordingUploads,
} from "../repositories/audio-upload.repository.js";
import { readAudioCloudConsent } from "./consent.service.js";
import { readBackupSettings } from "./user-settings.service.js";
import {
    ensureUploadConfig,
    getFileFromRequest,
    performUpload,
} from "./upload.service.js";

const DEFAULT_RETENTION_DAYS = 90;

type UploadAudioInput = {
    subjectId: string;
    dayNumber: number;
    sectionId: string;
    createdAt: string;
    durationMs: number;
    retentionDays?: number;
};

type UploadAudioResponse = {
    uploadId: string;
    uri: string;
    uploadedAt: string;
    retentionDays: number;
};

export async function assertAudioCloudAccess(
    request: FastifyRequest,
    subjectId: string
): Promise<{ retentionDays: number }> {
    const [consent, settings] = await Promise.all([
        readAudioCloudConsent(subjectId),
        readBackupSettings(subjectId),
    ]);

    if (!consent || consent.decision !== "granted") {
        throw request.server.httpErrors.forbidden(
            "Audio cloud consent required before cloud upload/list."
        );
    }

    if (!settings.enabled) {
        throw request.server.httpErrors.forbidden(
            "Cloud backup must be enabled before cloud upload/list."
        );
    }

    return { retentionDays: settings.retentionDays || DEFAULT_RETENTION_DAYS };
}

export async function uploadAudioRecording(
    request: FastifyRequest,
    input: UploadAudioInput
): Promise<UploadAudioResponse> {
    const file = await getFileFromRequest(request);
    if (!file) {
        throw request.server.httpErrors.badRequest("No file uploaded");
    }

    const { bucketName, region } = ensureUploadConfig();
    const upload = await performUpload({
        file,
        bucketName,
        region,
        folder: `audio/${input.subjectId}`,
    });

    const retentionDays = input.retentionDays ?? DEFAULT_RETENTION_DAYS;
    const uploadedAt = new Date();
    const expiresAt = new Date(
        uploadedAt.getTime() + retentionDays * 24 * 60 * 60 * 1000
    );

    const saved = await insertRecordingUpload({
        subjectId: input.subjectId,
        storageKey: upload.s3Key,
        fileUri: upload.url,
        dayNumber: input.dayNumber,
        sectionId: input.sectionId,
        durationMs: input.durationMs,
        createdAtClient: input.createdAt,
        expiresAt,
    });

    return {
        ...saved,
        retentionDays,
    };
}

export async function getAudioRecordingList(subjectId: string) {
    return listRecordingUploads(subjectId);
}
