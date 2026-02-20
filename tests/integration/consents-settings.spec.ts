import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import {
    createIntegrationApp,
    createPremiumSession,
} from "./helpers/test-context.js";

describe("consents and backup settings", () => {
    let app: FastifyInstance;

    beforeAll(async () => {
        app = await createIntegrationApp();
    });

    afterAll(async () => {
        vi.restoreAllMocks();
        await app?.close();
    });

    it("round-trips consent decidedAt and policyVersion", async () => {
        const auth = await createPremiumSession(app, {
            platform: "android",
            appVersion: "1.0.1",
        });
        const decidedAt = new Date().toISOString();

        const post = await app.inject({
            method: "POST",
            url: "/v1/consents/audio-cloud",
            headers: { authorization: `Bearer ${auth.accessToken}` },
            payload: {
                decision: "granted",
                decidedAt,
                policyVersion: "2026-02-19",
            },
        });
        expect(post.statusCode).toBe(200);
        expect(
            post.json<{
                decision: "granted" | "denied";
                decidedAt: string;
                policyVersion: string;
            }>()
        ).toEqual({
            decision: "granted",
            decidedAt,
            policyVersion: "2026-02-19",
        });
    });

    it("preserves retention when enabling/disabling without retentionDays", async () => {
        const auth = await createPremiumSession(app, {
            platform: "ios",
            appVersion: "1.0.2",
        });

        const put = await app.inject({
            method: "PUT",
            url: "/v1/user/settings/backup",
            headers: { authorization: `Bearer ${auth.accessToken}` },
            payload: { enabled: true, retentionDays: 120 },
        });
        expect(put.statusCode).toBe(200);

        const toggle = await app.inject({
            method: "PUT",
            url: "/v1/user/settings/backup",
            headers: { authorization: `Bearer ${auth.accessToken}` },
            payload: { enabled: false },
        });
        expect(toggle.statusCode).toBe(200);
        expect(toggle.json()).toEqual({ enabled: false, retentionDays: 120 });
    });

    it("returns 403 PREMIUM_REQUIRED for non-premium users", async () => {
        const auth = await app.inject({
            method: "POST",
            url: "/v1/auth/device-session",
            payload: {
                deviceId: `test-device-${randomUUID()}`,
                platform: "ios",
                appVersion: "1.0.3",
            },
        });
        const accessToken = auth.json<{ accessToken: string }>().accessToken;

        const response = await app.inject({
            method: "GET",
            url: "/v1/consents/audio-cloud",
            headers: { authorization: `Bearer ${accessToken}` },
        });
        expect(response.statusCode).toBe(403);
        expect(response.json<{ code?: string }>().code).toBe("PREMIUM_REQUIRED");
    });

    it("rejects unauthenticated requests and invalid payloads", async () => {
        const unauth = await app.inject({
            method: "GET",
            url: "/v1/user/settings/backup",
        });
        expect(unauth.statusCode).toBe(401);

        const auth = await createPremiumSession(app, {
            platform: "ios",
            appVersion: "1.0.3",
        });
        const invalid = await app.inject({
            method: "PUT",
            url: "/v1/user/settings/backup",
            headers: { authorization: `Bearer ${auth.accessToken}` },
            payload: { enabled: true, retentionDays: 0 },
        });
        expect(invalid.statusCode).toBe(400);
    });
});
