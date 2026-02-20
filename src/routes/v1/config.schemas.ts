export const getConfigFlagsSchema = {
    tags: ["Config"],
    summary: "Fetch backend feature flags",
    response: {
        200: {
            type: "object",
            required: [
                "v3_stt_on_device",
                "v3_stt_cloud_opt_in",
                "v3_cloud_backup",
                "v3_premium_iap",
            ],
            properties: {
                v3_stt_on_device: { type: "boolean" },
                v3_stt_cloud_opt_in: { type: "boolean" },
                v3_cloud_backup: { type: "boolean" },
                v3_premium_iap: { type: "boolean" },
            },
        },
    },
} as const;
