import { describe, expect, it } from "vitest";
import type { FastifyRequest } from "fastify";
import {
    parseAudioUploadRequest,
    parseRetentionDaysFromBody,
} from "../../../src/services/audio-upload-request.service.js";

function makeRequest(body: Record<string, unknown>): FastifyRequest {
    return {
        body,
        server: {
            httpErrors: {
                badRequest: (message: string) => {
                    const error = new Error(message) as Error & { statusCode: number };
                    error.statusCode = 400;
                    return error;
                },
            },
        },
    } as unknown as FastifyRequest;
}

describe("audio-upload-request.service", () => {
    it("parses valid multipart payload", () => {
        const now = new Date().toISOString();
        const req = makeRequest({
            dayNumber: { value: "3" },
            sectionId: { value: "free-output" },
            createdAt: { value: now },
            durationMs: { value: "120000" },
            retentionDays: { value: "180" },
        });

        const parsed = parseAudioUploadRequest(req);
        expect(parsed).toEqual({
            dayNumber: 3,
            sectionId: "free-output",
            createdAt: new Date(now).toISOString(),
            durationMs: 120000,
            retentionDays: 180,
        });
    });

    it("throws on invalid duration", () => {
        const req = makeRequest({
            dayNumber: "1",
            sectionId: "warmup",
            createdAt: new Date().toISOString(),
            durationMs: "0",
        });
        expect(() => parseAudioUploadRequest(req)).toThrow("durationMs must be >= 1");
    });

    it("parses optional retention days helper", () => {
        const req = makeRequest({ retentionDays: "365" });
        expect(parseRetentionDaysFromBody(req)).toBe(365);
    });
});
