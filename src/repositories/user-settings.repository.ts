import { getDbPool } from "../db/client.js";

export type BackupSettings = {
    enabled: boolean;
    retentionDays: number;
};

export async function upsertBackupSettings(params: {
    subjectId: string;
    enabled: boolean;
    retentionDays: number;
}): Promise<BackupSettings> {
    const pool = getDbPool();
    const result = await pool.query<{
        cloud_backup_enabled: boolean;
        backup_retention_days: number;
    }>(
        `
        INSERT INTO user_settings (
            subject_id,
            cloud_backup_enabled,
            backup_retention_days,
            updated_at
        )
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (subject_id) DO UPDATE
        SET
            cloud_backup_enabled = EXCLUDED.cloud_backup_enabled,
            backup_retention_days = EXCLUDED.backup_retention_days,
            updated_at = NOW()
        RETURNING cloud_backup_enabled, backup_retention_days
        `,
        [params.subjectId, params.enabled, params.retentionDays]
    );

    return {
        enabled: result.rows[0].cloud_backup_enabled,
        retentionDays: result.rows[0].backup_retention_days,
    };
}

export async function getBackupSettings(
    subjectId: string
): Promise<BackupSettings> {
    const pool = getDbPool();
    const result = await pool.query<{
        cloud_backup_enabled: boolean;
        backup_retention_days: number;
    }>(
        `
        SELECT cloud_backup_enabled, backup_retention_days
        FROM user_settings
        WHERE subject_id = $1
        LIMIT 1
        `,
        [subjectId]
    );

    const row = result.rows[0];
    if (!row) {
        return { enabled: false, retentionDays: 90 };
    }

    return {
        enabled: row.cloud_backup_enabled,
        retentionDays: row.backup_retention_days,
    };
}
