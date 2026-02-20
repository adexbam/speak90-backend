export const uploadSchema = {
    tags: ["Upload"],
    summary: "Upload file to S3",
    description: "Uploads a single file and returns its S3 URL",
    body: {
        type: "object",
        properties: {
            folder: { type: "string" },
        },
    },
    response: {
        201: {
            type: "object",
            properties: {
                url: { type: "string" },
                filename: { type: "string" },
                key: { type: "string" },
            },
        },
        400: {
            type: "object",
            properties: { error: { type: "string" } },
        },
        500: {
            type: "object",
            properties: { error: { type: "string" } },
        },
    },
} as const;
