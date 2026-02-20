export const createDeviceSessionSchema = {
    tags: ["Auth"],
    summary: "Create device session token",
    body: {
        type: "object",
        additionalProperties: false,
        required: ["deviceId", "platform", "appVersion"],
        properties: {
            deviceId: { type: "string", minLength: 1, maxLength: 255 },
            platform: { type: "string", minLength: 1, maxLength: 32 },
            appVersion: { type: "string", minLength: 1, maxLength: 64 },
        },
    },
    response: {
        201: {
            type: "object",
            required: [
                "accessToken",
                "refreshToken",
                "expiresAt",
                "userIdOrDeviceId",
            ],
            properties: {
                accessToken: { type: "string" },
                refreshToken: { type: "string" },
                expiresAt: { type: "string", format: "date-time" },
                userIdOrDeviceId: { type: "string" },
            },
        },
    },
} as const;

export const refreshDeviceSessionSchema = {
    tags: ["Auth"],
    summary: "Refresh a device session token pair",
    body: {
        type: "object",
        additionalProperties: false,
        required: ["refreshToken"],
        properties: {
            refreshToken: { type: "string", minLength: 1 },
        },
    },
    response: {
        200: {
            type: "object",
            required: [
                "accessToken",
                "refreshToken",
                "expiresAt",
                "userIdOrDeviceId",
            ],
            properties: {
                accessToken: { type: "string" },
                refreshToken: { type: "string" },
                expiresAt: { type: "string", format: "date-time" },
                userIdOrDeviceId: { type: "string" },
            },
        },
    },
} as const;
