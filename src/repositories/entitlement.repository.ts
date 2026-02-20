import { getDbPool } from "../db/client.js";

export async function hasActivePremiumEntitlement(
    subjectId: string
): Promise<boolean> {
    const pool = getDbPool();
    const result = await pool.query<{ exists: boolean }>(
        `
        SELECT EXISTS(
            SELECT 1
            FROM entitlements
            WHERE subject_id = $1
              AND entitlement_key IN ('premium_iap', 'premium')
              AND active = TRUE
        ) AS exists
        `,
        [subjectId]
    );

    return Boolean(result.rows[0]?.exists);
}
