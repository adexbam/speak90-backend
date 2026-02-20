const progressSchema = {
    type: "object",
    additionalProperties: false,
    required: [
        "currentDay",
        "streak",
        "totalMinutes",
        "sessionsCompleted",
        "updatedAt",
    ],
    properties: {
        currentDay: { type: "integer", minimum: 1 },
        streak: { type: "integer", minimum: 0 },
        totalMinutes: { type: "integer", minimum: 0 },
        sessionsCompleted: {
            type: "array",
            items: { type: "integer", minimum: 1 },
        },
        updatedAt: { type: "string", format: "date-time" },
    },
} as const;

export const putProgressSchema = {
    tags: ["Progress"],
    summary: "Upsert user progress with last-write-wins by updatedAt",
    body: progressSchema,
    response: {
        200: progressSchema,
    },
} as const;

export const getProgressSchema = {
    tags: ["Progress"],
    summary: "Read latest synced progress",
    response: {
        200: progressSchema,
    },
} as const;
