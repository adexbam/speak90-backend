import {
    listFeatureFlags,
    type FeatureFlagRow,
} from "../repositories/feature-flag.repository.js";

const requiredFlagKeys = [
    "v3_stt_on_device",
    "v3_stt_cloud_opt_in",
    "v3_cloud_backup",
    "v3_premium_iap",
] as const;

export type AppFeatureFlags = Record<(typeof requiredFlagKeys)[number], boolean>;

function toFlagsResponse(rows: FeatureFlagRow[]): AppFeatureFlags {
    const defaults: AppFeatureFlags = {
        v3_stt_on_device: false,
        v3_stt_cloud_opt_in: false,
        v3_cloud_backup: false,
        v3_premium_iap: false,
    };

    for (const row of rows) {
        if (row.key in defaults) {
            defaults[row.key as keyof AppFeatureFlags] = Boolean(row.enabled);
        }
    }
    return defaults;
}

export async function getAppFeatureFlags(): Promise<AppFeatureFlags> {
    const rows = await listFeatureFlags([...requiredFlagKeys]);
    return toFlagsResponse(rows);
}
