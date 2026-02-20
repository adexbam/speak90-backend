export const upsertBackupSettingsSchema = {
    tags: ["UserSettings"],
    summary: "Upsert cloud backup settings",
    body: {
        type: "object",
        additionalProperties: false,
        required: ["enabled"],
        properties: {
            enabled: { type: "boolean" },
            retentionDays: { type: "integer", minimum: 1, maximum: 3650 },
        },
    },
    response: {
        200: {
            type: "object",
            required: ["enabled", "retentionDays"],
            properties: {
                enabled: { type: "boolean" },
                retentionDays: { type: "integer" },
            },
        },
    },
} as const;

export const getBackupSettingsSchema = {
    tags: ["UserSettings"],
    summary: "Get cloud backup settings",
    response: {
        200: {
            type: "object",
            required: ["enabled", "retentionDays"],
            properties: {
                enabled: { type: "boolean" },
                retentionDays: { type: "integer" },
            },
        },
    },
} as const;
