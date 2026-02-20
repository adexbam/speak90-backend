import type { FastifyRequest } from "fastify";
import {
    ensureUploadConfig,
    getFileFromRequest,
    performUpload,
} from "../services/upload.service.js";

export async function uploadFile(request: FastifyRequest): Promise<{
    url: string;
    filename: string;
    key: string;
}> {
    const body = request.body as any;
    const file = await getFileFromRequest(request);

    if (!file) {
        const err = request.server.httpErrors.badRequest(
            "No file uploaded"
        ) as Error & { details?: unknown };
        err.details = [
            {
                path: "file",
                message: "No file uploaded",
                content_type: request.headers["content-type"],
                body_keys: body ? Object.keys(body) : [],
            },
        ];
        throw err;
    }

    const { bucketName, region } = ensureUploadConfig();
    try {
        const { s3Key, filename, url } = await performUpload({
            file,
            bucketName,
            region,
            folder: request.uploadFolder,
        });
        return { url, filename, key: s3Key };
    } catch (err) {
        const error = request.server.httpErrors.internalServerError(
            "Upload to S3 failed."
        ) as Error & { details?: unknown };
        error.details = [
            {
                path: "file",
                message: err instanceof Error ? err.message : String(err),
            },
        ];
        throw error;
    }
}
