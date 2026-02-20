import { randomUUID } from "node:crypto";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { App } from "../../src/app.js";
import { getDbPool } from "../../src/db/client.js";

const runDbIntegration = process.env.RUN_DB_TESTS === "true";

describe.skipIf(!runDbIntegration)("Ticket 30.1 auth + config endpoints", () => {
    let app: FastifyInstance | undefined;

    beforeAll(async () => {
        app = await App({
            deploymentEnv: "test",
            jwtSecret: "test-secret",
        });
    });

    afterAll(async () => {
        if (app) {
            await app.close();
        }
    });

    it("creates device session and persists token hashes", async () => {
        const deviceId = `test-device-${randomUUID()}`;
        const response = await app!.inject({
            method: "POST",
            url: "/v1/auth/device-session",
            payload: {
                deviceId,
                platform: "ios",
                appVersion: "1.0.0",
            },
        });

        expect(response.statusCode).toBe(201);
        const body = response.json<{
            accessToken: string;
            refreshToken: string;
            expiresAt: string;
            userIdOrDeviceId: string;
        }>();

        expect(body.userIdOrDeviceId).toBe(deviceId);
        expect(typeof body.accessToken).toBe("string");
        expect(typeof body.refreshToken).toBe("string");
        expect(new Date(body.expiresAt).toString()).not.toBe("Invalid Date");

        const pool = getDbPool();
        const dbResult = await pool.query<{
            device_id: string;
            access_token_hash: string;
            refresh_token_hash: string | null;
        }>(
            `
            SELECT device_id, access_token_hash, refresh_token_hash
            FROM device_sessions
            WHERE device_id = $1
            ORDER BY created_at DESC
            LIMIT 1
            `,
            [deviceId]
        );

        expect(dbResult.rowCount).toBe(1);
        expect(dbResult.rows[0].device_id).toBe(deviceId);
        expect(dbResult.rows[0].access_token_hash).not.toContain(
            body.accessToken.slice(0, 10)
        );
        expect(dbResult.rows[0].refresh_token_hash).toBeTruthy();
    });

    it("returns required v3 flags with boolean values", async () => {
        const response = await app!.inject({
            method: "GET",
            url: "/v1/config/flags",
        });

        expect(response.statusCode).toBe(200);
        const body = response.json<{
            v3_stt_on_device: boolean;
            v3_stt_cloud_opt_in: boolean;
            v3_cloud_backup: boolean;
            v3_premium_iap: boolean;
        }>();

        expect(typeof body.v3_stt_on_device).toBe("boolean");
        expect(typeof body.v3_stt_cloud_opt_in).toBe("boolean");
        expect(typeof body.v3_cloud_backup).toBe("boolean");
        expect(typeof body.v3_premium_iap).toBe("boolean");
    });
});
