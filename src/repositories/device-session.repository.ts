import { getDbPool } from "../db/client.js";

export type DeviceSessionInsert = {
    deviceId: string;
    platform: string;
    appVersion: string;
    accessTokenHash: string;
    refreshTokenHash: string;
    expiresAt: Date;
};

export type DeviceSessionRow = {
    id: string;
    deviceId: string;
    platform: string;
    appVersion: string | null;
    expiresAt: string;
};

type DeviceSessionDbRow = {
    id: string;
    device_id: string;
    platform: string;
    app_version: string | null;
    expires_at: string;
};

function mapDeviceSessionRow(row: DeviceSessionDbRow): DeviceSessionRow {
    return {
        id: row.id,
        deviceId: row.device_id,
        platform: row.platform,
        appVersion: row.app_version,
        expiresAt: new Date(row.expires_at).toISOString(),
    };
}

export async function insertDeviceSession(input: DeviceSessionInsert): Promise<void> {
    const pool = getDbPool();
    await pool.query(
        `
        INSERT INTO device_sessions (
            device_id,
            platform,
            app_version,
            access_token_hash,
            refresh_token_hash,
            expires_at
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
            input.deviceId,
            input.platform,
            input.appVersion,
            input.accessTokenHash,
            input.refreshTokenHash,
            input.expiresAt.toISOString(),
        ]
    );
}

export async function findActiveSessionByAccessTokenHash(
    accessTokenHash: string
): Promise<DeviceSessionRow | null> {
    const pool = getDbPool();
    const result = await pool.query<DeviceSessionDbRow>(
        `
        SELECT id, device_id, platform, app_version, expires_at
        FROM device_sessions
        WHERE access_token_hash = $1
          AND expires_at > NOW()
        LIMIT 1
        `,
        [accessTokenHash]
    );

    const row = result.rows[0];
    return row ? mapDeviceSessionRow(row) : null;
}

export async function isActiveSessionForAccessToken(params: {
    accessTokenHash: string;
    deviceId: string;
}): Promise<boolean> {
    const pool = getDbPool();
    const result = await pool.query<{ exists: boolean }>(
        `
        SELECT EXISTS(
            SELECT 1
            FROM device_sessions
            WHERE access_token_hash = $1
              AND device_id = $2
              AND expires_at > NOW()
        ) AS exists
        `,
        [params.accessTokenHash, params.deviceId]
    );

    return Boolean(result.rows[0]?.exists);
}

export async function findActiveSessionByRefreshTokenHash(
    refreshTokenHash: string
): Promise<DeviceSessionRow | null> {
    const pool = getDbPool();
    const result = await pool.query<DeviceSessionDbRow>(
        `
        SELECT id, device_id, platform, app_version, expires_at
        FROM device_sessions
        WHERE refresh_token_hash = $1
          AND expires_at > NOW()
        LIMIT 1
        `,
        [refreshTokenHash]
    );

    const row = result.rows[0];
    return row ? mapDeviceSessionRow(row) : null;
}

export async function rotateSessionTokens(params: {
    sessionId: string;
    accessTokenHash: string;
    refreshTokenHash: string;
    expiresAt: Date;
}): Promise<void> {
    const pool = getDbPool();
    const result = await pool.query(
        `
        UPDATE device_sessions
        SET
            access_token_hash = $2,
            refresh_token_hash = $3,
            expires_at = $4,
            updated_at = NOW()
        WHERE id = $1
        `,
        [
            params.sessionId,
            params.accessTokenHash,
            params.refreshTokenHash,
            params.expiresAt.toISOString(),
        ]
    );

    if (result.rowCount !== 1) {
        throw new Error("Failed to rotate session tokens");
    }
}
