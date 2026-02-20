import { randomUUID } from "node:crypto";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import jwt from "jsonwebtoken";
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

    async function createPremiumSession(params?: {
        platform?: string;
        appVersion?: string;
    }): Promise<{ accessToken: string; subjectId: string }> {
        const created = await app!.inject({
            method: "POST",
            url: "/v1/auth/device-session",
            payload: {
                deviceId: `test-device-${randomUUID()}`,
                platform: params?.platform ?? "ios",
                appVersion: params?.appVersion ?? "1.0.0",
            },
        });

        expect(created.statusCode).toBe(201);
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

    it("refreshes session tokens and invalidates previous tokens", async () => {
        const deviceId = `test-device-${randomUUID()}`;
        const created = await app!.inject({
            method: "POST",
            url: "/v1/auth/device-session",
            payload: {
                deviceId,
                platform: "android",
                appVersion: "1.0.0",
            },
        });

        expect(created.statusCode).toBe(201);
        const first = created.json<{
            accessToken: string;
            refreshToken: string;
            expiresAt: string;
        }>();

        const refreshed = await app!.inject({
            method: "POST",
            url: "/v1/auth/refresh",
            payload: {
                refreshToken: first.refreshToken,
            },
        });

        expect(refreshed.statusCode).toBe(200);
        const second = refreshed.json<{
            accessToken: string;
            refreshToken: string;
            expiresAt: string;
        }>();

        expect(second.accessToken).not.toBe(first.accessToken);
        expect(second.refreshToken).not.toBe(first.refreshToken);

        const oldAccessResult = await app!.inject({
            method: "GET",
            url: "/v1/auth/test",
            headers: { authorization: `Bearer ${first.accessToken}` },
        });
        expect(oldAccessResult.statusCode).toBe(401);

        const newAccessResult = await app!.inject({
            method: "GET",
            url: "/v1/auth/test",
            headers: { authorization: `Bearer ${second.accessToken}` },
        });
        expect(newAccessResult.statusCode).toBe(200);

        const replayRefresh = await app!.inject({
            method: "POST",
            url: "/v1/auth/refresh",
            payload: {
                refreshToken: first.refreshToken,
            },
        });
        expect(replayRefresh.statusCode).toBe(401);
    });

    it("rejects signed device tokens that are not backed by a DB session", async () => {
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

        const response = await app!.inject({
            method: "GET",
            url: "/v1/auth/test",
            headers: { authorization: `Bearer ${accessToken}` },
        });

        expect(response.statusCode).toBe(401);
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
        const auth = await createPremiumSession({
            platform: "android",
            appVersion: "1.0.1",
        });

        const decidedAt = new Date().toISOString();
        const post = await app!.inject({
            method: "POST",
            url: "/v1/consents/audio-cloud",
            headers: {
                authorization: `Bearer ${auth.accessToken}`,
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
        expect(postBody.decidedAt).toBe(decidedAt);

        const get = await app!.inject({
            method: "GET",
            url: "/v1/consents/audio-cloud",
            headers: {
                authorization: `Bearer ${auth.accessToken}`,
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
        expect(getBody?.decidedAt).toBe(decidedAt);
    });

    it("stores denied consent and returns denied as latest decision", async () => {
        const auth = await createPremiumSession({
            platform: "android",
            appVersion: "1.0.1",
        });

        const post = await app!.inject({
            method: "POST",
            url: "/v1/consents/audio-cloud",
            headers: {
                authorization: `Bearer ${auth.accessToken}`,
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
                authorization: `Bearer ${auth.accessToken}`,
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
        const auth = await createPremiumSession({
            platform: "ios",
            appVersion: "1.0.2",
        });

        const initial = await app!.inject({
            method: "GET",
            url: "/v1/user/settings/backup",
            headers: {
                authorization: `Bearer ${auth.accessToken}`,
            },
        });
        expect(initial.statusCode).toBe(200);
        expect(initial.json()).toEqual({ enabled: false, retentionDays: 90 });

        const put = await app!.inject({
            method: "PUT",
            url: "/v1/user/settings/backup",
            headers: {
                authorization: `Bearer ${auth.accessToken}`,
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
                authorization: `Bearer ${auth.accessToken}`,
            },
        });
        expect(get.statusCode).toBe(200);
        expect(get.json()).toEqual({ enabled: true, retentionDays: 120 });

        const toggleOnly = await app!.inject({
            method: "PUT",
            url: "/v1/user/settings/backup",
            headers: {
                authorization: `Bearer ${auth.accessToken}`,
            },
            payload: {
                enabled: false,
            },
        });
        expect(toggleOnly.statusCode).toBe(200);
        expect(toggleOnly.json()).toEqual({ enabled: false, retentionDays: 120 });
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

    it("rejects authenticated non-premium access to premium cloud endpoints", async () => {
        const auth = await app!.inject({
            method: "POST",
            url: "/v1/auth/device-session",
            payload: {
                deviceId: `test-device-${randomUUID()}`,
                platform: "ios",
                appVersion: "1.0.3",
            },
        });
        const accessToken = auth.json<{ accessToken: string }>().accessToken;

        const consentGet = await app!.inject({
            method: "GET",
            url: "/v1/consents/audio-cloud",
            headers: { authorization: `Bearer ${accessToken}` },
        });
        expect(consentGet.statusCode).toBe(403);
        expect(consentGet.json<{ code?: string }>().code).toBe("PREMIUM_REQUIRED");

        const backupGet = await app!.inject({
            method: "GET",
            url: "/v1/user/settings/backup",
            headers: { authorization: `Bearer ${accessToken}` },
        });
        expect(backupGet.statusCode).toBe(403);
        expect(backupGet.json<{ code?: string }>().code).toBe("PREMIUM_REQUIRED");
    });

    it("rejects invalid consent decidedAt and invalid backup retentionDays", async () => {
        const auth = await createPremiumSession({
            platform: "ios",
            appVersion: "1.0.3",
        });
        const accessToken = auth.accessToken;

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
        const auth = await createPremiumSession({
            platform: "ios",
            appVersion: "1.1.0",
        });

        const blocked = await app!.inject({
            method: "GET",
            url: "/v1/audio/uploads",
            headers: {
                authorization: `Bearer ${auth.accessToken}`,
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
        const auth = await createPremiumSession({
            platform: "android",
            appVersion: "1.1.1",
        });

        await app!.inject({
            method: "POST",
            url: "/v1/consents/audio-cloud",
            headers: {
                authorization: `Bearer ${auth.accessToken}`,
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
                authorization: `Bearer ${auth.accessToken}`,
            },
            payload: {
                enabled: true,
            },
        });

        const response = await app!.inject({
            method: "GET",
            url: "/v1/audio/uploads",
            headers: {
                authorization: `Bearer ${auth.accessToken}`,
            },
        });

        expect(response.statusCode).toBe(200);
        expect(Array.isArray(response.json())).toBe(true);
    });

    it("returns 404 for deleting unknown upload and supports no-op purge", async () => {
        const auth = await createPremiumSession({
            platform: "android",
            appVersion: "1.1.2",
        });
        const accessToken = auth.accessToken;

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

    it("upserts and lists SRS cards with updatedAt conflict handling", async () => {
        const deviceId = `test-device-${randomUUID()}`;
        const auth = await app!.inject({
            method: "POST",
            url: "/v1/auth/device-session",
            payload: {
                deviceId,
                platform: "ios",
                appVersion: "1.3.0",
            },
        });
        const accessToken = auth.json<{ accessToken: string }>().accessToken;

        const older = new Date("2026-02-20T10:00:00.000Z").toISOString();
        const newer = new Date("2026-02-20T10:05:00.000Z").toISOString();

        const first = await app!.inject({
            method: "PUT",
            url: "/v1/srs/cards/bulk",
            headers: { authorization: `Bearer ${accessToken}` },
            payload: {
                cards: [
                    {
                        cardId: "card-1",
                        box: 2,
                        dueAt: newer,
                        reviewCount: 4,
                        updatedAt: newer,
                    },
                ],
            },
        });
        expect(first.statusCode).toBe(200);

        const stale = await app!.inject({
            method: "PUT",
            url: "/v1/srs/cards/bulk",
            headers: { authorization: `Bearer ${accessToken}` },
            payload: {
                cards: [
                    {
                        cardId: "card-1",
                        box: 1,
                        dueAt: older,
                        reviewCount: 1,
                        updatedAt: older,
                    },
                ],
            },
        });
        expect(stale.statusCode).toBe(200);

        const list = await app!.inject({
            method: "GET",
            url: "/v1/srs/cards",
            headers: { authorization: `Bearer ${accessToken}` },
        });
        expect(list.statusCode).toBe(200);
        expect(
            list.json<{
                cards: Array<{
                    cardId: string;
                    box: number;
                    reviewCount: number;
                    updatedAt: string;
                }>;
            }>().cards.find((c) => c.cardId === "card-1")
        ).toMatchObject({
            cardId: "card-1",
            box: 2,
            reviewCount: 4,
            updatedAt: newer,
        });
    });

    it("appends SRS review events", async () => {
        const deviceId = `test-device-${randomUUID()}`;
        const auth = await app!.inject({
            method: "POST",
            url: "/v1/auth/device-session",
            payload: {
                deviceId,
                platform: "android",
                appVersion: "1.3.1",
            },
        });
        const accessToken = auth.json<{ accessToken: string }>().accessToken;

        const response = await app!.inject({
            method: "POST",
            url: "/v1/srs/reviews",
            headers: { authorization: `Bearer ${accessToken}` },
            payload: {
                cardId: "card-7",
                result: "good",
                reviewedAt: new Date().toISOString(),
            },
        });

        expect(response.statusCode).toBe(201);
        expect(
            response.json<{
                reviewId: string;
                cardId: string;
                result: string;
            }>()
        ).toMatchObject({
            cardId: "card-7",
            result: "good",
        });
    });

    it("records session completion and is retry-safe for same completion key", async () => {
        const deviceId = `test-device-${randomUUID()}`;
        const auth = await app!.inject({
            method: "POST",
            url: "/v1/auth/device-session",
            payload: {
                deviceId,
                platform: "ios",
                appVersion: "1.3.2",
            },
        });
        const accessToken = auth.json<{ accessToken: string }>().accessToken;
        const completedAt = new Date("2026-02-20T11:00:00.000Z").toISOString();

        const first = await app!.inject({
            method: "POST",
            url: "/v1/sessions/complete",
            headers: { authorization: `Bearer ${accessToken}` },
            payload: {
                dayNumber: 8,
                elapsedSeconds: 2640,
                completedAt,
            },
        });
        expect(first.statusCode).toBe(201);
        const firstBody = first.json<{ sessionId: string }>();

        const retry = await app!.inject({
            method: "POST",
            url: "/v1/sessions/complete",
            headers: { authorization: `Bearer ${accessToken}` },
            payload: {
                dayNumber: 8,
                elapsedSeconds: 2640,
                completedAt,
            },
        });
        expect(retry.statusCode).toBe(201);
        const retryBody = retry.json<{ sessionId: string }>();

        expect(retryBody.sessionId).toBe(firstBody.sessionId);
    });
});
