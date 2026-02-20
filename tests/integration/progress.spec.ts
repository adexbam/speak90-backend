import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import {
    createIntegrationApp,
    createPremiumSession,
} from "./helpers/test-context.js";

describe("progress sync", () => {
    let app: FastifyInstance;

    beforeAll(async () => {
        app = await createIntegrationApp();
    });

    afterAll(async () => {
        vi.restoreAllMocks();
        await app?.close();
    });

    it("returns default progress then upserts and reads", async () => {
        const auth = await createPremiumSession(app, {
            platform: "ios",
            appVersion: "1.2.0",
        });

        const initial = await app.inject({
            method: "GET",
            url: "/v1/progress",
            headers: { authorization: `Bearer ${auth.accessToken}` },
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
        const put = await app.inject({
            method: "PUT",
            url: "/v1/progress",
            headers: { authorization: `Bearer ${auth.accessToken}` },
            payload,
        });
        expect(put.statusCode).toBe(200);
        expect(put.json()).toEqual(payload);
    });

    it("applies last-write-wins by updatedAt", async () => {
        const auth = await createPremiumSession(app, {
            platform: "android",
            appVersion: "1.2.1",
        });
        const older = new Date("2026-02-20T10:00:00.000Z").toISOString();
        const newer = new Date("2026-02-20T10:05:00.000Z").toISOString();

        await app.inject({
            method: "PUT",
            url: "/v1/progress",
            headers: { authorization: `Bearer ${auth.accessToken}` },
            payload: {
                currentDay: 5,
                streak: 5,
                totalMinutes: 200,
                sessionsCompleted: [1, 2, 3, 4, 5],
                updatedAt: newer,
            },
        });

        const stale = await app.inject({
            method: "PUT",
            url: "/v1/progress",
            headers: { authorization: `Bearer ${auth.accessToken}` },
            payload: {
                currentDay: 2,
                streak: 1,
                totalMinutes: 40,
                sessionsCompleted: [1, 2],
                updatedAt: older,
            },
        });
        expect(stale.statusCode).toBe(200);
        expect(stale.json()).toEqual({
            currentDay: 5,
            streak: 5,
            totalMinutes: 200,
            sessionsCompleted: [1, 2, 3, 4, 5],
            updatedAt: newer,
        });
    });
});
