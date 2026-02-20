import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

let s3Client: S3Client | undefined;

function getS3Client() {
    if (!s3Client) {
        s3Client = new S3Client({
            region: process.env.AWS_REGION || "eu-central-1",
        });
    }
    return s3Client;
}

export async function uploadFileToS3(params: {
    bucket: string;
    key: string;
    body: Buffer;
    contentType: string;
}) {
    const { bucket, key, body, contentType } = params;
    if (!bucket) {
        throw new Error(
            "[uploadRepository] Missing bucket name (S3_BUCKET not configured)"
        );
    }

    const client = getS3Client();
    const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
    });

    await client.send(command);
}
