const uploadItemSchema = {
    type: "object",
    required: [
        "uploadId",
        "dayNumber",
        "sectionId",
        "durationMs",
        "createdAt",
        "uploadedAt",
        "expiresAt",
    ],
    properties: {
        uploadId: { type: "string" },
        dayNumber: { type: "integer" },
        sectionId: { type: "string" },
        durationMs: { type: "integer" },
        createdAt: { type: "string", format: "date-time" },
        uploadedAt: { type: "string", format: "date-time" },
        expiresAt: { type: "string", format: "date-time" },
    },
} as const;

export const postAudioUploadSchema = {
    tags: ["AudioUploads"],
    summary: "Upload audio recording and persist cloud metadata",
    consumes: ["multipart/form-data"],
    response: {
        201: {
            type: "object",
            required: ["uploadId", "uri", "uploadedAt", "retentionDays"],
            properties: {
                uploadId: { type: "string" },
                uri: { type: "string" },
                uploadedAt: { type: "string", format: "date-time" },
                retentionDays: { type: "integer" },
            },
        },
    },
} as const;

export const getAudioUploadsSchema = {
    tags: ["AudioUploads"],
    summary: "List cloud uploads for restore flow",
    response: {
        200: {
            type: "array",
            items: uploadItemSchema,
        },
    },
} as const;
