import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FastifyRequest } from "fastify";

const findUploadByIdMock = vi.fn();
const insertRecordingUploadMock = vi.fn();
const insertRetentionJobMock = vi.fn();
const listPurgeCandidatesMock = vi.fn();
const listRecordingUploadsMock = vi.fn();
const markUploadDeletingMock = vi.fn();
const markUploadDeletedMock = vi.fn();
const markUploadsDeletingMock = vi.fn();
const markUploadsDeletedMock = vi.fn();
const restoreUploadToUploadedMock = vi.fn();
const restoreUploadsToUploadedMock = vi.fn();
const deleteFileFromS3Mock = vi.fn();
const readAudioCloudConsentMock = vi.fn();
const readBackupSettingsMock = vi.fn();
const ensureUploadConfigMock = vi.fn();
const getFileFromRequestMock = vi.fn();
const performUploadMock = vi.fn();

vi.mock("../../../src/repositories/audio-upload.repository.js", () => ({
    findUploadById: findUploadByIdMock,
    insertRecordingUpload: insertRecordingUploadMock,
    insertRetentionJob: insertRetentionJobMock,
    listPurgeCandidates: listPurgeCandidatesMock,
    listRecordingUploads: listRecordingUploadsMock,
    markUploadDeleting: markUploadDeletingMock,
    markUploadDeleted: markUploadDeletedMock,
    markUploadsDeleting: markUploadsDeletingMock,
    markUploadsDeleted: markUploadsDeletedMock,
    restoreUploadToUploaded: restoreUploadToUploadedMock,
    restoreUploadsToUploaded: restoreUploadsToUploadedMock,
}));

vi.mock("../../../src/repositories/upload.repository.js", () => ({
    deleteFileFromS3: deleteFileFromS3Mock,
}));

vi.mock("../../../src/services/consent.service.js", () => ({
    readAudioCloudConsent: readAudioCloudConsentMock,
}));

vi.mock("../../../src/services/user-settings.service.js", () => ({
    readBackupSettings: readBackupSettingsMock,
}));

vi.mock("../../../src/services/upload.service.js", () => ({
    ensureUploadConfig: ensureUploadConfigMock,
    getFileFromRequest: getFileFromRequestMock,
    performUpload: performUploadMock,
}));

function makeRequest(): FastifyRequest {
    return {
        server: {
            httpErrors: {
                notFound: (message: string) => {
                    const e = new Error(message) as Error & { statusCode: number };
                    e.statusCode = 404;
                    return e;
                },
            },
        },
    } as unknown as FastifyRequest;
}

describe("audio-upload.service", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        ensureUploadConfigMock.mockReturnValue({ bucketName: "bucket", region: "eu" });
        markUploadDeletingMock.mockResolvedValue(true);
        markUploadDeletedMock.mockResolvedValue(true);
        restoreUploadToUploadedMock.mockResolvedValue(true);
        markUploadsDeletingMock.mockImplementation(async (ids: string[]) => ids);
        markUploadsDeletedMock.mockResolvedValue(0);
        restoreUploadsToUploadedMock.mockResolvedValue(0);
        insertRetentionJobMock.mockResolvedValue(undefined);
    });

    it("restores DB status when single delete fails on S3", async () => {
        findUploadByIdMock.mockResolvedValue({
            uploadId: "u1",
            subjectId: "dev_1",
            storageKey: "audio/dev_1/u1.m4a",
            status: "uploaded",
            expiresAt: new Date().toISOString(),
        });
        deleteFileFromS3Mock.mockRejectedValue(new Error("s3 down"));

        const { deleteAudioRecording } = await import(
            "../../../src/services/audio-upload.service.js"
        );

        await expect(
            deleteAudioRecording({
                request: makeRequest(),
                subjectId: "dev_1",
                uploadId: "u1",
            })
        ).rejects.toThrow("s3 down");

        expect(markUploadDeletingMock).toHaveBeenCalledWith("dev_1", "u1");
        expect(restoreUploadToUploadedMock).toHaveBeenCalledWith("dev_1", "u1");
        expect(markUploadDeletedMock).not.toHaveBeenCalled();
    });

    it("purge marks failed object deletions back to uploaded", async () => {
        listPurgeCandidatesMock.mockResolvedValue([
            {
                uploadId: "u1",
                subjectId: "dev_1",
                storageKey: "k1",
                status: "uploaded",
                expiresAt: new Date().toISOString(),
            },
            {
                uploadId: "u2",
                subjectId: "dev_1",
                storageKey: "k2",
                status: "uploaded",
                expiresAt: new Date().toISOString(),
            },
        ]);
        deleteFileFromS3Mock
            .mockResolvedValueOnce(undefined)
            .mockRejectedValueOnce(new Error("delete failed"));

        const { purgeAudioRecordings } = await import(
            "../../../src/services/audio-upload.service.js"
        );
        const result = await purgeAudioRecordings({
            request: makeRequest(),
            subjectId: "dev_1",
            retentionDays: 90,
        });

        expect(result.deletedCount).toBe(1);
        expect(markUploadsDeletingMock).toHaveBeenCalledWith(["u1", "u2"]);
        expect(markUploadsDeletedMock).toHaveBeenCalledWith(["u1"]);
        expect(restoreUploadsToUploadedMock).toHaveBeenCalledWith(["u2"]);
        expect(insertRetentionJobMock).toHaveBeenCalled();
    });
});
