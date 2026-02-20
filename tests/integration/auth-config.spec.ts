import { randomUUID } from "node:crypto";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { App } from "../../src/app.js";
import { getDbPool } from "../../src/db/client.js";

describe("Ticket 30.1 auth + config endpoints", () => {
    let app: FastifyInstance | undefined;

    beforeAll(async () => {
        if (!process.env.DATABASE_URL) {
            throw new Error(
                "Integration tests require DATABASE_URL. Configure Postgres before running tests."
            );
        }
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

        expect(body.userIdOrDeviceId.startsWith("dev_")).toBe(true);
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

    it("round-trips audio cloud consent for authenticated device", async () => {
        const deviceId = `test-device-${randomUUID()}`;
        const auth = await app!.inject({
            method: "POST",
            url: "/v1/auth/device-session",
            payload: {
                deviceId,
                platform: "android",
                appVersion: "1.0.1",
            },
        });
        const authBody = auth.json<{ accessToken: string }>();

        const decidedAt = new Date().toISOString();
        const post = await app!.inject({
            method: "POST",
            url: "/v1/consents/audio-cloud",
            headers: {
                authorization: `Bearer ${authBody.accessToken}`,
            },
            payload: {
                decision: "granted",
                decidedAt,
                policyVersion: "2026-02-19",
            },
        });

        expect(post.statusCode).toBe(200);
        const postBody = post.json<{
            decision: "granted" | "denied";
            decidedAt: string;
            policyVersion: string;
        }>();
        expect(postBody.decision).toBe("granted");
        expect(postBody.policyVersion).toBe("2026-02-19");

        const get = await app!.inject({
            method: "GET",
            url: "/v1/consents/audio-cloud",
            headers: {
                authorization: `Bearer ${authBody.accessToken}`,
            },
        });

        expect(get.statusCode).toBe(200);
        const getBody = get.json<{
            decision: "granted" | "denied";
            decidedAt: string;
            policyVersion: string;
        } | null>();
        expect(getBody).not.toBeNull();
        expect(getBody?.decision).toBe("granted");
        expect(getBody?.policyVersion).toBe("2026-02-19");
    });

    it("stores denied consent and returns denied as latest decision", async () => {
        const deviceId = `test-device-${randomUUID()}`;
        const auth = await app!.inject({
            method: "POST",
            url: "/v1/auth/device-session",
            payload: {
                deviceId,
                platform: "android",
                appVersion: "1.0.1",
            },
        });
        const authBody = auth.json<{ accessToken: string }>();

        const post = await app!.inject({
            method: "POST",
            url: "/v1/consents/audio-cloud",
            headers: {
                authorization: `Bearer ${authBody.accessToken}`,
            },
            payload: {
                decision: "denied",
                decidedAt: new Date().toISOString(),
                policyVersion: "2026-02-20",
            },
        });

        expect(post.statusCode).toBe(200);
        const get = await app!.inject({
            method: "GET",
            url: "/v1/consents/audio-cloud",
            headers: {
                authorization: `Bearer ${authBody.accessToken}`,
            },
        });
        expect(get.statusCode).toBe(200);
        expect(
            get.json<{ decision: "granted" | "denied"; policyVersion: string } | null>()
        ).toMatchObject({
            decision: "denied",
            policyVersion: "2026-02-20",
        });
    });

    it("returns default backup settings and supports update", async () => {
        const deviceId = `test-device-${randomUUID()}`;
        const auth = await app!.inject({
            method: "POST",
            url: "/v1/auth/device-session",
            payload: {
                deviceId,
                platform: "ios",
                appVersion: "1.0.2",
            },
        });
        const authBody = auth.json<{ accessToken: string }>();

        const initial = await app!.inject({
            method: "GET",
            url: "/v1/user/settings/backup",
            headers: {
                authorization: `Bearer ${authBody.accessToken}`,
            },
        });
        expect(initial.statusCode).toBe(200);
        expect(initial.json()).toEqual({ enabled: false, retentionDays: 90 });

        const put = await app!.inject({
            method: "PUT",
            url: "/v1/user/settings/backup",
            headers: {
                authorization: `Bearer ${authBody.accessToken}`,
            },
            payload: {
                enabled: true,
                retentionDays: 120,
            },
        });
        expect(put.statusCode).toBe(200);
        expect(put.json()).toEqual({ enabled: true, retentionDays: 120 });

        const get = await app!.inject({
            method: "GET",
            url: "/v1/user/settings/backup",
            headers: {
                authorization: `Bearer ${authBody.accessToken}`,
            },
        });
        expect(get.statusCode).toBe(200);
        expect(get.json()).toEqual({ enabled: true, retentionDays: 120 });
    });

    it("rejects unauthenticated consent and backup settings access", async () => {
        const consentGet = await app!.inject({
            method: "GET",
            url: "/v1/consents/audio-cloud",
        });
        expect(consentGet.statusCode).toBe(401);

        const backupGet = await app!.inject({
            method: "GET",
            url: "/v1/user/settings/backup",
        });
        expect(backupGet.statusCode).toBe(401);
    });

    it("rejects invalid consent decidedAt and invalid backup retentionDays", async () => {
        const deviceId = `test-device-${randomUUID()}`;
        const auth = await app!.inject({
            method: "POST",
            url: "/v1/auth/device-session",
            payload: {
                deviceId,
                platform: "ios",
                appVersion: "1.0.3",
            },
        });
        const accessToken = auth.json<{ accessToken: string }>().accessToken;

        const badConsent = await app!.inject({
            method: "POST",
            url: "/v1/consents/audio-cloud",
            headers: { authorization: `Bearer ${accessToken}` },
            payload: {
                decision: "granted",
                decidedAt: "not-a-date",
                policyVersion: "2026-02-20",
            },
        });
        expect(badConsent.statusCode).toBe(400);

        const badBackup = await app!.inject({
            method: "PUT",
            url: "/v1/user/settings/backup",
            headers: { authorization: `Bearer ${accessToken}` },
            payload: {
                enabled: true,
                retentionDays: 0,
            },
        });
        expect(badBackup.statusCode).toBe(400);
    });

    it("rejects audio upload list when consent/backup requirements are not met", async () => {
        const deviceId = `test-device-${randomUUID()}`;
        const auth = await app!.inject({
            method: "POST",
            url: "/v1/auth/device-session",
            payload: {
                deviceId,
                platform: "ios",
                appVersion: "1.1.0",
            },
        });
        const authBody = auth.json<{ accessToken: string }>();

        const blocked = await app!.inject({
            method: "GET",
            url: "/v1/audio/uploads",
            headers: {
                authorization: `Bearer ${authBody.accessToken}`,
            },
        });

        expect(blocked.statusCode).toBe(403);
    });

    it("rejects unauthenticated audio upload delete and purge", async () => {
        const del = await app!.inject({
            method: "DELETE",
            url: `/v1/audio/uploads/${randomUUID()}`,
        });
        expect(del.statusCode).toBe(401);

        const purge = await app!.inject({
            method: "POST",
            url: "/v1/audio/uploads/purge",
            payload: {},
        });
        expect(purge.statusCode).toBe(401);
    });

    it("returns audio upload list when consent is granted and backup is enabled", async () => {
        const deviceId = `test-device-${randomUUID()}`;
        const auth = await app!.inject({
            method: "POST",
            url: "/v1/auth/device-session",
            payload: {
                deviceId,
                platform: "android",
                appVersion: "1.1.1",
            },
        });
        const authBody = auth.json<{ accessToken: string }>();

        await app!.inject({
            method: "POST",
            url: "/v1/consents/audio-cloud",
            headers: {
                authorization: `Bearer ${authBody.accessToken}`,
            },
            payload: {
                decision: "granted",
                decidedAt: new Date().toISOString(),
                policyVersion: "2026-02-19",
            },
        });

        await app!.inject({
            method: "PUT",
            url: "/v1/user/settings/backup",
            headers: {
                authorization: `Bearer ${authBody.accessToken}`,
            },
            payload: {
                enabled: true,
            },
        });

        const response = await app!.inject({
            method: "GET",
            url: "/v1/audio/uploads",
            headers: {
                authorization: `Bearer ${authBody.accessToken}`,
            },
        });

        expect(response.statusCode).toBe(200);
        expect(Array.isArray(response.json())).toBe(true);
    });

    it("returns 404 for deleting unknown upload and supports no-op purge", async () => {
        const deviceId = `test-device-${randomUUID()}`;
        const auth = await app!.inject({
            method: "POST",
            url: "/v1/auth/device-session",
            payload: {
                deviceId,
                platform: "android",
                appVersion: "1.1.2",
            },
        });
        const accessToken = auth.json<{ accessToken: string }>().accessToken;

        await app!.inject({
            method: "POST",
            url: "/v1/consents/audio-cloud",
            headers: { authorization: `Bearer ${accessToken}` },
            payload: {
                decision: "granted",
                decidedAt: new Date().toISOString(),
                policyVersion: "2026-02-20",
            },
        });
        await app!.inject({
            method: "PUT",
            url: "/v1/user/settings/backup",
            headers: { authorization: `Bearer ${accessToken}` },
            payload: { enabled: true, retentionDays: 90 },
        });

        const del = await app!.inject({
            method: "DELETE",
            url: `/v1/audio/uploads/${randomUUID()}`,
            headers: { authorization: `Bearer ${accessToken}` },
        });
        expect(del.statusCode).toBe(404);

        const purge = await app!.inject({
            method: "POST",
            url: "/v1/audio/uploads/purge",
            headers: { authorization: `Bearer ${accessToken}` },
            payload: { retentionDays: 90 },
        });
        expect(purge.statusCode).toBe(200);
        expect(
            purge.json<{ deletedCount: number; retentionDays: number; executedAt: string }>()
        ).toMatchObject({
            deletedCount: 0,
            retentionDays: 90,
        });
    });

    it("returns default progress then upserts and reads synced progress", async () => {
        const deviceId = `test-device-${randomUUID()}`;
        const auth = await app!.inject({
            method: "POST",
            url: "/v1/auth/device-session",
            payload: {
                deviceId,
                platform: "ios",
                appVersion: "1.2.0",
            },
        });
        const accessToken = auth.json<{ accessToken: string }>().accessToken;

        const initial = await app!.inject({
            method: "GET",
            url: "/v1/progress",
            headers: { authorization: `Bearer ${accessToken}` },
        });
        expect(initial.statusCode).toBe(200);
        expect(initial.json()).toEqual({
            currentDay: 1,
            streak: 0,
            totalMinutes: 0,
            sessionsCompleted: [],
            updatedAt: new Date(0).toISOString(),
        });

        const payload = {
            currentDay: 4,
            streak: 3,
            totalMinutes: 128,
            sessionsCompleted: [1, 2, 4],
            updatedAt: new Date().toISOString(),
        };

        const put = await app!.inject({
            method: "PUT",
            url: "/v1/progress",
            headers: { authorization: `Bearer ${accessToken}` },
            payload,
        });
        expect(put.statusCode).toBe(200);
        expect(put.json()).toEqual(payload);

        const get = await app!.inject({
            method: "GET",
            url: "/v1/progress",
            headers: { authorization: `Bearer ${accessToken}` },
        });
        expect(get.statusCode).toBe(200);
        expect(get.json()).toEqual(payload);
    });

    it("applies last-write-wins for progress based on updatedAt", async () => {
        const deviceId = `test-device-${randomUUID()}`;
        const auth = await app!.inject({
            method: "POST",
            url: "/v1/auth/device-session",
            payload: {
                deviceId,
                platform: "android",
                appVersion: "1.2.1",
            },
        });
        const accessToken = auth.json<{ accessToken: string }>().accessToken;

        const older = new Date("2026-02-20T10:00:00.000Z").toISOString();
        const newer = new Date("2026-02-20T10:05:00.000Z").toISOString();

        await app!.inject({
            method: "PUT",
            url: "/v1/progress",
            headers: { authorization: `Bearer ${accessToken}` },
            payload: {
                currentDay: 5,
                streak: 5,
                totalMinutes: 200,
                sessionsCompleted: [1, 2, 3, 4, 5],
                updatedAt: newer,
            },
        });

        const staleWrite = await app!.inject({
            method: "PUT",
            url: "/v1/progress",
            headers: { authorization: `Bearer ${accessToken}` },
            payload: {
                currentDay: 2,
                streak: 1,
                totalMinutes: 40,
                sessionsCompleted: [1, 2],
                updatedAt: older,
            },
        });

        expect(staleWrite.statusCode).toBe(200);
        expect(staleWrite.json()).toEqual({
            currentDay: 5,
            streak: 5,
            totalMinutes: 200,
            sessionsCompleted: [1, 2, 3, 4, 5],
            updatedAt: newer,
        });
    });
});
