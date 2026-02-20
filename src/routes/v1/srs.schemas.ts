const srsCardSchema = {
    type: "object",
    additionalProperties: false,
    required: ["cardId", "box", "dueAt", "reviewCount", "updatedAt"],
    properties: {
        cardId: { type: "string", minLength: 1 },
        box: { type: "integer", minimum: 1 },
        dueAt: { type: "string", format: "date-time" },
        reviewCount: { type: "integer", minimum: 0 },
        updatedAt: { type: "string", format: "date-time" },
    },
} as const;

const srsCardResponseSchema = {
    type: "object",
    additionalProperties: false,
    required: ["cardId", "box", "dueAt", "reviewCount", "updatedAt"],
    properties: {
        cardId: { type: "string", minLength: 1 },
        box: { type: "integer", minimum: 1 },
        dueAt: { type: ["string", "null"], format: "date-time" },
        reviewCount: { type: "integer", minimum: 0 },
        updatedAt: { type: "string", format: "date-time" },
    },
} as const;

export const putSrsCardsBulkSchema = {
    tags: ["SRS"],
    summary: "Bulk upsert SRS cards with last-write-wins updatedAt conflict handling",
    body: {
        type: "object",
        additionalProperties: false,
        required: ["cards"],
        properties: {
            cards: {
                type: "array",
                items: srsCardSchema,
            },
        },
    },
    response: {
        200: {
            type: "object",
            required: ["cards"],
            properties: {
                cards: { type: "array", items: srsCardResponseSchema },
            },
        },
    },
} as const;

export const getSrsCardsSchema = {
    tags: ["SRS"],
    summary: "Get synced SRS cards",
    response: {
        200: {
            type: "object",
            required: ["cards"],
            properties: {
                cards: { type: "array", items: srsCardResponseSchema },
            },
        },
    },
} as const;

export const postSrsReviewSchema = {
    tags: ["SRS"],
    summary: "Append SRS review event",
    body: {
        type: "object",
        additionalProperties: false,
        required: ["cardId", "result", "reviewedAt"],
        properties: {
            cardId: { type: "string", minLength: 1 },
            result: { type: "string", enum: ["again", "good", "easy"] },
            reviewedAt: { type: "string", format: "date-time" },
        },
    },
    response: {
        201: {
            type: "object",
            required: ["reviewId", "cardId", "result", "reviewedAt", "createdAt"],
            properties: {
                reviewId: { type: "string" },
                cardId: { type: "string" },
                result: { type: "string" },
                reviewedAt: { type: "string", format: "date-time" },
                createdAt: { type: "string", format: "date-time" },
            },
        },
    },
} as const;
