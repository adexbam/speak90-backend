import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { getDbPool } from "../../src/db/client.js";
import {
    createIntegrationApp,
    createPremiumSession,
} from "./helpers/test-context.js";

describe("audio uploads", () => {
    let app: FastifyInstance;

    beforeAll(async () => {
        app = await createIntegrationApp();
    });

    afterAll(async () => {
        vi.restoreAllMocks();
        await app?.close();
    });

    it("rejects list for premium user without consent/backup setup", async () => {
        const auth = await createPremiumSession(app, {
            platform: "ios",
            appVersion: "1.1.0",
        });

        const blocked = await app.inject({
            method: "GET",
            url: "/v1/audio/uploads",
            headers: { authorization: `Bearer ${auth.accessToken}` },
        });
        expect(blocked.statusCode).toBe(403);
    });

    it("uploads multipart audio and persists metadata", async () => {
        const auth = await createPremiumSession(app, {
            platform: "android",
            appVersion: "1.1.5",
        });

        await app.inject({
            method: "POST",
            url: "/v1/consents/audio-cloud",
            headers: { authorization: `Bearer ${auth.accessToken}` },
            payload: {
                decision: "granted",
                decidedAt: new Date().toISOString(),
                policyVersion: "2026-02-20",
            },
        });
        await app.inject({
            method: "PUT",
            url: "/v1/user/settings/backup",
            headers: { authorization: `Bearer ${auth.accessToken}` },
            payload: { enabled: true, retentionDays: 180 },
        });

        const boundary = `----speak90-${randomUUID()}`;
        const multipartBody = [
            `--${boundary}\r\nContent-Disposition: form-data; name=\"dayNumber\"\r\n\r\n3\r\n`,
            `--${boundary}\r\nContent-Disposition: form-data; name=\"sectionId\"\r\n\r\npatterns\r\n`,
            `--${boundary}\r\nContent-Disposition: form-data; name=\"createdAt\"\r\n\r\n${new Date().toISOString()}\r\n`,
            `--${boundary}\r\nContent-Disposition: form-data; name=\"durationMs\"\r\n\r\n90000\r\n`,
            `--${boundary}\r\nContent-Disposition: form-data; name=\"retentionDays\"\r\n\r\n120\r\n`,
            `--${boundary}\r\nContent-Disposition: form-data; name=\"file\"; filename=\"clip.m4a\"\r\nContent-Type: audio/m4a\r\n\r\ntest-audio-bytes\r\n`,
            `--${boundary}--\r\n`,
        ].join("");

        const uploaded = await app.inject({
            method: "POST",
            url: "/v1/audio/uploads",
            headers: {
                authorization: `Bearer ${auth.accessToken}`,
                "content-type": `multipart/form-data; boundary=${boundary}`,
            },
            payload: multipartBody,
        });
        expect(uploaded.statusCode).toBe(201);
        const uploadedBody = uploaded.json<{
            uploadId: string;
            retentionDays: number;
        }>();
        expect(uploadedBody.retentionDays).toBe(120);

        const dbRow = await getDbPool().query<{
            id: string;
            day_number: number;
            section_id: string;
            duration_ms: number;
            status: string;
        }>(
            `
            SELECT id, day_number, section_id, duration_ms, status
            FROM recording_uploads
            WHERE id = $1
            LIMIT 1
            `,
            [uploadedBody.uploadId]
        );
        expect(dbRow.rowCount).toBe(1);
        expect(dbRow.rows[0].status).toBe("uploaded");
    });

    it("returns 404 for unknown delete and supports no-op purge", async () => {
        const auth = await createPremiumSession(app, {
            platform: "android",
            appVersion: "1.1.2",
        });

        await app.inject({
            method: "POST",
            url: "/v1/consents/audio-cloud",
            headers: { authorization: `Bearer ${auth.accessToken}` },
            payload: {
                decision: "granted",
                decidedAt: new Date().toISOString(),
                policyVersion: "2026-02-20",
            },
        });
        await app.inject({
            method: "PUT",
            url: "/v1/user/settings/backup",
            headers: { authorization: `Bearer ${auth.accessToken}` },
            payload: { enabled: true, retentionDays: 90 },
        });

        const del = await app.inject({
            method: "DELETE",
            url: `/v1/audio/uploads/${randomUUID()}`,
            headers: { authorization: `Bearer ${auth.accessToken}` },
        });
        expect(del.statusCode).toBe(404);

        const purge = await app.inject({
            method: "POST",
            url: "/v1/audio/uploads/purge",
            headers: { authorization: `Bearer ${auth.accessToken}` },
            payload: { retentionDays: 90 },
        });
        expect(purge.statusCode).toBe(200);
    });
});
