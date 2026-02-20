import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { createIntegrationApp } from "./helpers/test-context.js";

describe("config flags", () => {
    let app: FastifyInstance;

    beforeAll(async () => {
        app = await createIntegrationApp();
    });

    afterAll(async () => {
        vi.restoreAllMocks();
        await app?.close();
    });

    it("returns required v3 flags with boolean values", async () => {
        const response = await app.inject({
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
