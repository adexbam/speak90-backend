export const postSessionCompleteSchema = {
    tags: ["Sessions"],
    summary: "Record a completed session",
    body: {
        type: "object",
        additionalProperties: false,
        required: ["dayNumber", "elapsedSeconds", "completedAt"],
        properties: {
            dayNumber: { type: "integer", minimum: 1 },
            elapsedSeconds: { type: "integer", minimum: 1 },
            completedAt: { type: "string", format: "date-time" },
        },
    },
    response: {
        201: {
            type: "object",
            required: ["sessionId", "dayNumber", "elapsedSeconds", "completedAt"],
            properties: {
                sessionId: { type: "string" },
                dayNumber: { type: "integer" },
                elapsedSeconds: { type: "integer" },
                completedAt: { type: "string", format: "date-time" },
            },
        },
    },
} as const;
