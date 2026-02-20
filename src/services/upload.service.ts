import path from "node:path";
import type { FastifyRequest } from "fastify";
import { uploadFileToS3 } from "../repositories/upload.repository.js";

export type UploadFileLike = {
    filename: string;
    mimetype: string;
    buffer?: Buffer;
    toBuffer?: () => Promise<Buffer>;
};

export async function getFileFromRequest(
    request: FastifyRequest
): Promise<UploadFileLike | null> {
    const body = request.body as any;
    const fileFromBody = body?.file;
    if (fileFromBody) {
        return fileFromBody;
    }
    return (await request.file()) || null;
}

export function ensureUploadConfig() {
    const bucketName = process.env.S3_BUCKET;
    const region = process.env.AWS_REGION || "eu-central-1";

    if (!bucketName) {
        throw new Error("Upload service not configured correctly (missing S3_BUCKET)");
    }

    return { bucketName, region };
}

export async function toFileBuffer(file: UploadFileLike): Promise<Buffer> {
    const buffer =
        typeof file.toBuffer === "function" ? await file.toBuffer() : file.buffer;
    if (!buffer) {
        throw new Error("Uploaded file buffer is missing");
    }
    return buffer;
}

export function buildS3Key(filename: string, folder?: string) {
    const timestamp = Date.now();
    const ext = path.extname(filename || "") || "";
    const safeFileName = `${timestamp}${ext}`;
    const normalizedFolder = folder
        ? folder.replace(/^\/+|\/+$/g, "")
        : "speak90";
    const s3Key = `${normalizedFolder}/${safeFileName}`;
    return { s3Key, filename: safeFileName };
}

export async function performUpload(params: {
    file: UploadFileLike;
    bucketName: string;
    region: string;
    folder?: string;
}) {
    const { file, bucketName, region, folder } = params;
    const buffer = await toFileBuffer(file);
    const { s3Key, filename } = buildS3Key(file.filename || "", folder);

    await uploadFileToS3({
        bucket: bucketName,
        key: s3Key,
        body: buffer,
        contentType: file.mimetype,
    });

    const url = `https://${bucketName}.s3.${region}.amazonaws.com/${s3Key}`;
    return { s3Key, filename, url };
}
