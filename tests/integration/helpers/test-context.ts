import { randomUUID } from "node:crypto";
import { vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { App } from "../../../src/app.js";
import { getDbPool } from "../../../src/db/client.js";
import * as uploadRepository from "../../../src/repositories/upload.repository.js";

export async function createIntegrationApp(): Promise<FastifyInstance> {
    vi.spyOn(uploadRepository, "uploadFileToS3").mockResolvedValue();
    vi.spyOn(uploadRepository, "deleteFileFromS3").mockResolvedValue();
    process.env.S3_BUCKET = process.env.S3_BUCKET || "test-bucket";
    process.env.AWS_REGION = process.env.AWS_REGION || "eu-central-1";
    if (!process.env.DATABASE_URL) {
        throw new Error(
            "Integration tests require DATABASE_URL. Configure Postgres before running tests."
        );
    }
    return App({
        deploymentEnv: "test",
        jwtSecret: "test-secret",
    });
}

export async function createPremiumSession(
    app: FastifyInstance,
    params?: { platform?: string; appVersion?: string }
): Promise<{ accessToken: string; subjectId: string }> {
    const created = await app.inject({
        method: "POST",
        url: "/v1/auth/device-session",
        payload: {
            deviceId: `test-device-${randomUUID()}`,
            platform: params?.platform ?? "ios",
            appVersion: params?.appVersion ?? "1.0.0",
        },
    });

    if (created.statusCode !== 201) {
        throw new Error(`Failed to create device session: ${created.body}`);
    }
    const body = created.json<{
        accessToken: string;
        userIdOrDeviceId: string;
    }>();

    await getDbPool().query(
        `
        INSERT INTO entitlements (subject_id, entitlement_key, active, source, granted_at)
        VALUES ($1, 'premium_iap', TRUE, 'test', NOW())
        ON CONFLICT (subject_id, entitlement_key) DO UPDATE
        SET active = TRUE, source = EXCLUDED.source, granted_at = NOW(), updated_at = NOW()
        `,
        [body.userIdOrDeviceId]
    );

    return {
        accessToken: body.accessToken,
        subjectId: body.userIdOrDeviceId,
    };
}
