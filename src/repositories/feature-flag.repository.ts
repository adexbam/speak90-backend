import { getDbPool } from "../db/client.js";

export type FeatureFlagRow = {
    key: string;
    enabled: boolean;
};

export async function listFeatureFlags(
    keys: string[]
): Promise<FeatureFlagRow[]> {
    if (keys.length === 0) {
        return [];
    }

    const pool = getDbPool();
    const result = await pool.query<FeatureFlagRow>(
        `
        SELECT key, enabled
        FROM feature_flags
        WHERE key = ANY($1::text[])
        `,
        [keys]
    );
    return result.rows;
}
