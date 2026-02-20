import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";
import type { FastifyInstance } from "fastify";
import { getDbPool } from "../../src/db/client.js";
import { createIntegrationApp } from "./helpers/test-context.js";

describe("auth endpoints", () => {
    let app: FastifyInstance;

    beforeAll(async () => {
        app = await createIntegrationApp();
    });

    afterAll(async () => {
        vi.restoreAllMocks();
        await app?.close();
    });

    it("creates device session and persists token hashes", async () => {
        const deviceId = `test-device-${randomUUID()}`;
        const response = await app.inject({
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
        expect(body.userIdOrDeviceId.startsWith("dev_")).toBe(true);

        const dbResult = await getDbPool().query<{
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
    });

    it("refreshes session tokens and invalidates previous tokens", async () => {
        const created = await app.inject({
            method: "POST",
            url: "/v1/auth/device-session",
            payload: {
                deviceId: `test-device-${randomUUID()}`,
                platform: "android",
                appVersion: "1.0.0",
            },
        });

        expect(created.statusCode).toBe(201);
        const first = created.json<{
            accessToken: string;
            refreshToken: string;
        }>();

        const refreshed = await app.inject({
            method: "POST",
            url: "/v1/auth/refresh",
            payload: { refreshToken: first.refreshToken },
        });

        expect(refreshed.statusCode).toBe(200);
        const second = refreshed.json<{
            accessToken: string;
            refreshToken: string;
        }>();
        expect(second.accessToken).not.toBe(first.accessToken);
        expect(second.refreshToken).not.toBe(first.refreshToken);

        const oldAccess = await app.inject({
            method: "GET",
            url: "/v1/auth/test",
            headers: { authorization: `Bearer ${first.accessToken}` },
        });
        expect(oldAccess.statusCode).toBe(401);
    });

    it("rejects signed device tokens not backed by DB session", async () => {
        const accessToken = jwt.sign(
            {
                sub: "dev_0123456789012345678901234567890123456789",
                deviceId: `test-device-${randomUUID()}`,
                platform: "android",
                appVersion: "1.0.0",
                tokenType: "device",
            },
            "test-secret",
            { expiresIn: 3600 }
        );

        const response = await app.inject({
            method: "GET",
            url: "/v1/auth/test",
            headers: { authorization: `Bearer ${accessToken}` },
        });

        expect(response.statusCode).toBe(401);
    });
});
