export const upsertAudioCloudConsentSchema = {
    tags: ["Consents"],
    summary: "Upsert audio cloud consent",
    body: {
        type: "object",
        additionalProperties: false,
        required: ["decision", "decidedAt", "policyVersion"],
        properties: {
            decision: { type: "string", enum: ["granted", "denied"] },
            decidedAt: { type: "string", format: "date-time" },
            policyVersion: { type: "string", minLength: 1, maxLength: 64 },
        },
    },
    response: {
        200: {
            type: "object",
            required: ["decision", "decidedAt", "policyVersion"],
            properties: {
                decision: { type: "string", enum: ["granted", "denied"] },
                decidedAt: { type: "string", format: "date-time" },
                policyVersion: { type: "string" },
            },
        },
    },
} as const;

export const getAudioCloudConsentSchema = {
    tags: ["Consents"],
    summary: "Get latest audio cloud consent",
    response: {
        200: {
            anyOf: [
                {
                    type: "object",
                    required: ["decision", "decidedAt", "policyVersion"],
                    properties: {
                        decision: { type: "string", enum: ["granted", "denied"] },
                        decidedAt: { type: "string", format: "date-time" },
                        policyVersion: { type: "string" },
                    },
                },
                { type: "null" },
            ],
        },
    },
} as const;
