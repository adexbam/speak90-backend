import type { FastifyRequest } from "fastify";
import {
    findUploadById,
    insertRecordingUpload,
    insertRetentionJob,
    listPurgeCandidates,
    listRecordingUploads,
    markUploadDeleting,
    markUploadDeleted,
    markUploadsDeleting,
    markUploadsDeleted,
    recoverStuckDeletingUploads,
    restoreUploadToUploaded,
    restoreUploadsToUploaded,
} from "../repositories/audio-upload.repository.js";
import { deleteFileFromS3 } from "../repositories/upload.repository.js";
import { readAudioCloudConsent } from "./consent.service.js";
import { readBackupSettings } from "./user-settings.service.js";
import {
    ensureUploadConfig,
    getFileFromRequest,
    performUpload,
} from "./upload.service.js";

const DEFAULT_RETENTION_DAYS = 90;
const MIN_RETENTION_DAYS = 1;
const MAX_RETENTION_DAYS = 3650;
const DEFAULT_RECONCILE_MINUTES = 30;

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

    const retentionDays = Math.min(
        MAX_RETENTION_DAYS,
        Math.max(MIN_RETENTION_DAYS, input.retentionDays ?? DEFAULT_RETENTION_DAYS)
    );
    const uploadedAt = new Date();
    const expiresAt = new Date(
        uploadedAt.getTime() + retentionDays * 24 * 60 * 60 * 1000
    );

    let saved: { uploadId: string; uri: string; uploadedAt: string };
    try {
        saved = await insertRecordingUpload({
            subjectId: input.subjectId,
            storageKey: upload.s3Key,
            fileUri: upload.url,
            dayNumber: input.dayNumber,
            sectionId: input.sectionId,
            durationMs: input.durationMs,
            createdAtClient: input.createdAt,
            expiresAt,
        });
    } catch (error) {
        await deleteFileFromS3({
            bucket: bucketName,
            key: upload.s3Key,
        }).catch(() => undefined);
        throw error;
    }

    return {
        ...saved,
        retentionDays,
    };
}

export async function getAudioRecordingList(subjectId: string) {
    await reconcileDeletingUploads({ subjectId }).catch(() => undefined);
    return listRecordingUploads(subjectId);
}

export async function reconcileDeletingUploads(params?: {
    subjectId?: string;
    olderThanMinutes?: number;
}): Promise<number> {
    const olderThanMinutes =
        params?.olderThanMinutes ?? DEFAULT_RECONCILE_MINUTES;
    const recovered = await recoverStuckDeletingUploads({
        subjectId: params?.subjectId,
        olderThanMinutes,
    });
    if (recovered > 0) {
        const now = new Date().toISOString();
        await insertRetentionJob({
            jobType: "audio_uploads_reconcile",
            startedAt: now,
            finishedAt: now,
            deletedCount: 0,
            status: "succeeded",
            errorMessage: `Recovered ${recovered} stuck deleting rows`,
        }).catch(() => undefined);
    }
    return recovered;
}

export async function deleteAudioRecording(params: {
    request: FastifyRequest;
    subjectId: string;
    uploadId: string;
}): Promise<{ uploadId: string; deletedAt: string }> {
    const { request, subjectId, uploadId } = params;
    const upload = await findUploadById(subjectId, uploadId);
    if (!upload || upload.status !== "uploaded") {
        throw request.server.httpErrors.notFound("Upload not found");
    }

    const transitioned = await markUploadDeleting(subjectId, uploadId);
    if (!transitioned) {
        throw request.server.httpErrors.notFound("Upload not found");
    }
    const { bucketName } = ensureUploadConfig();
    try {
        await deleteFileFromS3({
            bucket: bucketName,
            key: upload.storageKey,
        });
        const finalized = await markUploadDeleted(subjectId, uploadId);
        if (!finalized) {
            throw new Error("Failed to finalize upload deletion state");
        }
    } catch (error) {
        await restoreUploadToUploaded(subjectId, uploadId).catch(() => undefined);
        throw error;
    }
    return { uploadId, deletedAt: new Date().toISOString() };
}

export async function purgeAudioRecordings(params: {
    request: FastifyRequest;
    subjectId: string;
    retentionDays?: number;
}): Promise<{ deletedCount: number; retentionDays: number; executedAt: string }> {
    const startedAt = new Date().toISOString();
    const retentionDays = Math.min(
        MAX_RETENTION_DAYS,
        Math.max(MIN_RETENTION_DAYS, params.retentionDays ?? DEFAULT_RETENTION_DAYS)
    );
    await reconcileDeletingUploads({ subjectId: params.subjectId }).catch(
        () => undefined
    );

    try {
        const candidates = await listPurgeCandidates({
            subjectId: params.subjectId,
            retentionDays,
        });
        const candidateIds = candidates.map((c) => c.uploadId);
        const deletingIds = new Set(await markUploadsDeleting(candidateIds));

        const deletedIds: string[] = [];
        const failedIds: string[] = [];
        if (candidates.length > 0) {
            const { bucketName } = ensureUploadConfig();
            for (const candidate of candidates) {
                if (!deletingIds.has(candidate.uploadId)) {
                    continue;
                }
                try {
                    await deleteFileFromS3({
                        bucket: bucketName,
                        key: candidate.storageKey,
                    });
                    deletedIds.push(candidate.uploadId);
                } catch {
                    failedIds.push(candidate.uploadId);
                }
            }
        }

        await markUploadsDeleted(deletedIds);
        await restoreUploadsToUploaded(failedIds);
        const executedAt = new Date().toISOString();
        await insertRetentionJob({
            jobType: "audio_uploads_purge",
            startedAt,
            finishedAt: executedAt,
            deletedCount: deletedIds.length,
            status: failedIds.length === 0 ? "succeeded" : "failed",
            errorMessage:
                failedIds.length === 0
                    ? undefined
                    : `${failedIds.length} object deletions failed`,
        });
        return {
            deletedCount: deletedIds.length,
            retentionDays,
            executedAt,
        };
    } catch (error) {
        const executedAt = new Date().toISOString();
        await insertRetentionJob({
            jobType: "audio_uploads_purge",
            startedAt,
            finishedAt: executedAt,
            deletedCount: 0,
            status: "failed",
            errorMessage: error instanceof Error ? error.message : String(error),
        }).catch(() => undefined);
        throw error;
    }
}
