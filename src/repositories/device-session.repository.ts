import { getDbPool } from "../db/client.js";

export type DeviceSessionInsert = {
    deviceId: string;
    platform: string;
    appVersion: string;
    accessTokenHash: string;
    refreshTokenHash: string;
    expiresAt: Date;
};

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
