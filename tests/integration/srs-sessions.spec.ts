import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { getDbPool } from "../../src/db/client.js";
import {
    createIntegrationApp,
    createPremiumSession,
} from "./helpers/test-context.js";

describe("srs and sessions sync", () => {
    let app: FastifyInstance;

    beforeAll(async () => {
        app = await createIntegrationApp();
    });

    afterAll(async () => {
        vi.restoreAllMocks();
        await app?.close();
    });

    it("upserts/lists SRS cards with LWW semantics", async () => {
        const auth = await createPremiumSession(app, {
            platform: "ios",
            appVersion: "1.3.0",
        });
        const older = new Date("2026-02-20T10:00:00.000Z").toISOString();
        const newer = new Date("2026-02-20T10:05:00.000Z").toISOString();

        const first = await app.inject({
            method: "PUT",
            url: "/v1/srs/cards/bulk",
            headers: { authorization: `Bearer ${auth.accessToken}` },
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

        await app.inject({
            method: "PUT",
            url: "/v1/srs/cards/bulk",
            headers: { authorization: `Bearer ${auth.accessToken}` },
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

        const list = await app.inject({
            method: "GET",
            url: "/v1/srs/cards",
            headers: { authorization: `Bearer ${auth.accessToken}` },
        });
        expect(list.statusCode).toBe(200);
        expect(
            list
                .json<{
                    cards: Array<{
                        cardId: string;
                        box: number;
                        reviewCount: number;
                        updatedAt: string;
                    }>;
                }>()
                .cards.find((c) => c.cardId === "card-1")
        ).toMatchObject({
            cardId: "card-1",
            box: 2,
            reviewCount: 4,
            updatedAt: newer,
        });
    });

    it("dedupes duplicate cardId entries in one bulk request", async () => {
        const auth = await createPremiumSession(app, {
            platform: "ios",
            appVersion: "1.3.1",
        });
        const older = new Date("2026-02-20T09:00:00.000Z").toISOString();
        const newer = new Date("2026-02-20T09:05:00.000Z").toISOString();

        const result = await app.inject({
            method: "PUT",
            url: "/v1/srs/cards/bulk",
            headers: { authorization: `Bearer ${auth.accessToken}` },
            payload: {
                cards: [
                    {
                        cardId: "dup-1",
                        box: 1,
                        dueAt: older,
                        reviewCount: 1,
                        updatedAt: older,
                    },
                    {
                        cardId: "dup-1",
                        box: 3,
                        dueAt: newer,
                        reviewCount: 7,
                        updatedAt: newer,
                    },
                ],
            },
        });

        expect(result.statusCode).toBe(200);
        const card = result
            .json<{
                cards: Array<{
                    cardId: string;
                    box: number;
                    reviewCount: number;
                    updatedAt: string;
                }>;
            }>()
            .cards.find((c) => c.cardId === "dup-1");
        expect(card).toMatchObject({
            cardId: "dup-1",
            box: 3,
            reviewCount: 7,
            updatedAt: newer,
        });
    });

    it("appends SRS reviews and records retry-safe session completions", async () => {
        const auth = await createPremiumSession(app, {
            platform: "ios",
            appVersion: "1.3.2",
        });

        const review = await app.inject({
            method: "POST",
            url: "/v1/srs/reviews",
            headers: { authorization: `Bearer ${auth.accessToken}` },
            payload: {
                cardId: "card-7",
                result: "good",
                reviewedAt: new Date().toISOString(),
            },
        });
        expect(review.statusCode).toBe(201);

        const completedAt = new Date("2026-02-20T11:00:00.000Z").toISOString();
        const first = await app.inject({
            method: "POST",
            url: "/v1/sessions/complete",
            headers: { authorization: `Bearer ${auth.accessToken}` },
            payload: {
                dayNumber: 8,
                elapsedSeconds: 2640,
                completedAt,
            },
        });
        expect(first.statusCode).toBe(201);
        const firstBody = first.json<{ sessionId: string }>();

        const retry = await app.inject({
            method: "POST",
            url: "/v1/sessions/complete",
            headers: { authorization: `Bearer ${auth.accessToken}` },
            payload: {
                dayNumber: 8,
                elapsedSeconds: 2640,
                completedAt,
            },
        });
        expect(retry.statusCode).toBe(201);
        expect(retry.json<{ sessionId: string }>().sessionId).toBe(
            firstBody.sessionId
        );
    });

    it("is concurrency-safe for simultaneous session completion retries", async () => {
        const auth = await createPremiumSession(app, {
            platform: "ios",
            appVersion: "1.3.3",
        });
        const completedAt = new Date("2026-02-20T12:00:00.000Z").toISOString();
        const payload = {
            dayNumber: 9,
            elapsedSeconds: 2100,
            completedAt,
        };

        const [a, b] = await Promise.all([
            app.inject({
                method: "POST",
                url: "/v1/sessions/complete",
                headers: { authorization: `Bearer ${auth.accessToken}` },
                payload,
            }),
            app.inject({
                method: "POST",
                url: "/v1/sessions/complete",
                headers: { authorization: `Bearer ${auth.accessToken}` },
                payload,
            }),
        ]);

        expect(a.statusCode).toBe(201);
        expect(b.statusCode).toBe(201);
        const idA = a.json<{ sessionId: string }>().sessionId;
        const idB = b.json<{ sessionId: string }>().sessionId;
        expect(idA).toBe(idB);

        const count = await getDbPool().query<{ total: string }>(
            `
            SELECT COUNT(*)::text AS total
            FROM session_completions
            WHERE subject_id = $1
              AND day_number = $2
              AND completed_at = $3
            `,
            [auth.subjectId, payload.dayNumber, payload.completedAt]
        );
        expect(Number(count.rows[0].total)).toBe(1);
    });
});
